"""repo-worker: kagent BYO agent.

Clones a GitHub repo named in the message, edits it with a Claude tool loop,
runs the repo's own checks, and publishes a branch + PR only after a human
replies `approve` (A2A input-required). Never pushes the default branch.
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
import shutil
import subprocess
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import anthropic
import uvicorn
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.apps import A2AStarletteApplication
from a2a.server.events import EventQueue
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore, TaskUpdater
from a2a.types import AgentCapabilities, AgentCard, AgentSkill, TaskState as A2ATaskState
from a2a.utils import new_agent_text_message

log = logging.getLogger("repo-worker")

WORK_ROOT = Path(os.environ.get("WORK_ROOT", "/work"))
HOME = os.environ.get("HOME", "/home/agent")
MODEL = os.environ.get("MODEL", "claude-haiku-5-5")
BASE_URL = os.environ.get("ANTHROPIC_BASE_URL", "https://opencode.ai/inference/go/anthropic")
MAX_STEPS = 40
MAX_OUTPUT = 20_000
SHELL_TIMEOUT = 900
SLUG_RE = re.compile(r"\s*(?:repo:\s*)?([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)")
BRANCH_RE = re.compile(r"agent/[a-z0-9][a-z0-9._-]{0,60}(?:/[a-z0-9][a-z0-9._-]{0,60}){0,3}")
# gh and remote git ops are reserved for publish_branch, which holds the token.
DENY_SHELL_RE = re.compile(r"\bgh\b|\bgit\s+(push|remote|fetch|pull|clone)\b")
GIT_TOKEN_HELPER = [
    "-c", "credential.helper=",
    "-c", "credential.helper=!f() { echo username=x-access-token; echo password=$GH_TOKEN; }; f",
]

SYSTEM = """You are repo-worker, an agent that changes one GitHub repository per task.

Rules:
- The repo is checked out at the shell's working directory. Edit with write_file or run_shell.
- Read the repo's own checks first (.pre-commit-config.yaml, .github/workflows/*) and run them with run_shell. Report what passed and failed. Do not disable hooks or checks to get a pass.
- Keep changes minimal and on-topic. Do not touch secrets or unrelated files.
- Publish only with publish_branch. Its branch must be agent/<topic>. A human approves each publish; if they reject it, stop and say so.
- Finish with a short Markdown summary: what changed, checks run and their result, and the PR URL if published."""

TOOLS: list[dict[str, Any]] = [
    {
        "name": "run_shell",
        "description": "Run a bash command with cwd = repo root. Runs without credentials: gh and git push/fetch/pull/clone are refused. Use it for edits, tests, pre-commit, git status/diff/log/commit.",
        "input_schema": {"type": "object", "properties": {"command": {"type": "string"}}, "required": ["command"]},
    },
    {
        "name": "read_file",
        "description": "Read a UTF-8 file inside the repo (path relative to repo root).",
        "input_schema": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]},
    },
    {
        "name": "write_file",
        "description": "Create or overwrite a file inside the repo (path relative to repo root).",
        "input_schema": {
            "type": "object",
            "properties": {"path": {"type": "string"}, "content": {"type": "string"}},
            "required": ["path", "content"],
        },
    },
    {
        "name": "publish_branch",
        "description": "Commit all current changes to a new agent/<topic> branch, push it, and open a PR against the default branch. Pauses until a human approves.",
        "input_schema": {
            "type": "object",
            "properties": {
                "branch": {"type": "string", "description": "agent/<topic>, lowercase"},
                "commit_message": {"type": "string"},
                "pr_title": {"type": "string"},
                "pr_body": {"type": "string"},
            },
            "required": ["branch", "commit_message", "pr_title", "pr_body"],
        },
    },
]


@dataclass
class Pending:
    tool_use_id: str
    branch: str
    commit_message: str
    pr_title: str
    pr_body: str


@dataclass
class TaskState:
    repo: str
    repo_dir: Path
    default_branch: str
    session_id: str
    messages: list[dict[str, Any]] = field(default_factory=list)
    partial_results: list[dict[str, Any]] = field(default_factory=list)
    pending: Pending | None = None


TASKS: dict[str, TaskState] = {}
_client: anthropic.AsyncAnthropic | None = None


def get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"], base_url=BASE_URL)
    return _client


def clip(text: str) -> str:
    if len(text) <= MAX_OUTPUT:
        return text
    return text[:MAX_OUTPUT] + f"\n...[truncated {len(text) - MAX_OUTPUT} chars]"


def tool_result(tool_use_id: str, text: str, is_error: bool = False) -> dict[str, Any]:
    return {"type": "tool_result", "tool_use_id": tool_use_id, "content": clip(text), "is_error": is_error}


def shell_env() -> dict[str, str]:
    env = {k: os.environ[k] for k in ("PATH", "LANG", "LC_ALL") if k in os.environ}
    env |= {
        "HOME": HOME,
        "GIT_TERMINAL_PROMPT": "0",
        "PRE_COMMIT_HOME": f"{HOME}/.cache/pre-commit",
        "GIT_AUTHOR_NAME": "repo-worker",
        "GIT_AUTHOR_EMAIL": "repo-worker@users.noreply.github.com",
        "GIT_COMMITTER_NAME": "repo-worker",
        "GIT_COMMITTER_EMAIL": "repo-worker@users.noreply.github.com",
    }
    return env


def git_env() -> dict[str, str]:
    """Shell env plus the token. Only used for clone, push, and PR creation."""
    token = os.environ.get("GH_TOKEN")
    if not token:
        raise RuntimeError("GH_TOKEN is not set")
    return shell_env() | {"GH_TOKEN": token}


async def run_proc(argv: list[str], cwd: Path | None, env: dict[str, str], timeout: float) -> tuple[int, str]:
    def go() -> tuple[int, str]:
        p = subprocess.run(argv, cwd=cwd, env=env, capture_output=True, text=True, timeout=timeout, check=False)
        return p.returncode, p.stdout + p.stderr

    return await asyncio.to_thread(go)


async def git(repo: Path, *args: str, auth: bool = False) -> str:
    argv = ["git", *(GIT_TOKEN_HELPER if auth else []), "-C", str(repo), *args]
    rc, out = await run_proc(argv, None, git_env() if auth else shell_env(), 300)
    if rc != 0:
        raise RuntimeError(f"git {args[0]} failed: {out.strip()}")
    return out


async def clone(repo: str, dest: Path) -> None:
    argv = ["git", *GIT_TOKEN_HELPER, "clone", f"https://github.com/{repo}.git", str(dest)]
    rc, out = await run_proc(argv, None, git_env(), 900)
    if rc != 0:
        raise RuntimeError(f"clone failed: {out.strip()}")


async def default_branch(repo_dir: Path) -> str:
    out = await git(repo_dir, "symbolic-ref", "--short", "refs/remotes/origin/HEAD")
    return out.strip().removeprefix("origin/")


async def new_task(task_id: str, text: str) -> TaskState:
    m = SLUG_RE.match(text)
    if not m:
        raise ValueError("start the message with the repo, e.g. `owner/repo: your task`")
    repo = m.group(1)
    workdir = WORK_ROOT / task_id
    repo_dir = workdir / "repo"
    workdir.mkdir(parents=True, exist_ok=True)
    try:
        await clone(repo, repo_dir)
        branch = await default_branch(repo_dir)
    except Exception:
        shutil.rmtree(workdir, ignore_errors=True)
        raise
    state = TaskState(repo=repo, repo_dir=repo_dir, default_branch=branch, session_id=str(uuid.uuid4()))
    TASKS[task_id] = state
    return state


def finish(task_id: str) -> None:
    state = TASKS.pop(task_id, None)
    if state is not None:
        shutil.rmtree(state.repo_dir.parent, ignore_errors=True)


def inside_repo(state: TaskState, rel: str) -> Path:
    root = state.repo_dir.resolve()
    p = (root / rel).resolve()
    if not p.is_relative_to(root) or ".git" in p.relative_to(root).parts:
        raise ValueError(f"path outside repo or inside .git: {rel}")
    return p


async def run_shell(state: TaskState, command: str) -> str:
    if DENY_SHELL_RE.search(command):
        return "refused: gh and git push/fetch/pull/clone are not available in the shell. Use publish_branch."
    try:
        rc, out = await run_proc(["bash", "-c", command], state.repo_dir, shell_env(), SHELL_TIMEOUT)
    except subprocess.TimeoutExpired:
        return f"timed out after {SHELL_TIMEOUT}s"
    return f"exit {rc}\n{clip(out)}"


async def run_tool(state: TaskState, block: Any) -> dict[str, Any]:
    inp = block.input
    try:
        if block.name == "run_shell":
            out = await run_shell(state, inp["command"])
        elif block.name == "read_file":
            out = inside_repo(state, inp["path"]).read_text()
        elif block.name == "write_file":
            p = inside_repo(state, inp["path"])
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(inp["content"])
            out = f"wrote {inp['path']}"
        else:
            raise ValueError(f"unknown tool {block.name}")
        return tool_result(block.id, out)
    except Exception as e:  # tool errors go back to the model, not the task
        return tool_result(block.id, f"error: {e}", is_error=True)


async def prepare_publish(state: TaskState, block: Any) -> str:
    """Validate publish_branch and record it as pending. Returns the approval prompt."""
    inp = block.input
    branch = inp["branch"]
    if branch == state.default_branch or not BRANCH_RE.fullmatch(branch):
        raise ValueError(f"branch {branch!r} must match agent/<topic> and must not be the default branch")
    status = await git(state.repo_dir, "status", "--short")
    if not status.strip():
        raise ValueError("no changes to publish")
    state.pending = Pending(block.id, branch, inp["commit_message"], inp["pr_title"], inp["pr_body"])
    return (
        f"Approve publishing `{branch}` to {state.repo} and opening a PR?\n\n"
        f"PR title: {inp['pr_title']}\n\nChanges:\n```\n{status.strip()}\n```\n\n"
        "Reply `approve` to publish, or anything else to cancel."
    )


async def publish(state: TaskState, p: Pending) -> str:
    repo = state.repo_dir
    await git(repo, "switch", "-C", p.branch)
    await git(repo, "add", "-A")
    await git(repo, "commit", "-m", p.commit_message)
    await git(repo, "push", "-u", "origin", f"HEAD:refs/heads/{p.branch}", auth=True)
    rc, out = await run_proc(
        ["gh", "pr", "create", "--repo", state.repo, "--base", state.default_branch,
         "--head", p.branch, "--title", p.pr_title, "--body", p.pr_body],
        repo, git_env(), 120,
    )
    if rc != 0:
        raise RuntimeError(f"gh pr create failed: {out.strip()}")
    return out.strip()


def approved(text: str) -> bool:
    return text.strip().lower() in {"approve", "approved", "yes", "y"}


async def resume(state: TaskState, user_text: str) -> None:
    p = state.pending
    assert p is not None
    if approved(user_text):
        try:
            res = tool_result(p.tool_use_id, f"published: {await publish(state, p)}")
        except Exception as e:
            res = tool_result(p.tool_use_id, f"publish failed: {e}", is_error=True)
    else:
        res = tool_result(p.tool_use_id, f"rejected by user (reply: {user_text!r}); nothing was pushed")
    state.pending = None
    state.messages.append({"role": "user", "content": [*state.partial_results, res]})
    state.partial_results = []


async def drive(state: TaskState) -> tuple[bool, str]:
    """Run the model loop. Returns (waiting_for_approval, text)."""
    client = get_client()
    for _ in range(MAX_STEPS):
        resp = await client.messages.create(
            model=MODEL,
            max_tokens=8192,
            system=SYSTEM,
            tools=TOOLS,
            messages=state.messages,
            extra_headers={"x-opencode-session": state.session_id},
        )
        state.messages.append(
            {"role": "assistant", "content": [b.model_dump(mode="json", exclude_none=True) for b in resp.content]}
        )
        if resp.stop_reason != "tool_use":
            return False, "".join(b.text for b in resp.content if b.type == "text").strip() or "(no text)"

        results: list[dict[str, Any]] = []
        prompt: str | None = None
        for block in resp.content:
            if block.type != "tool_use":
                continue
            if prompt is not None:
                results.append(tool_result(block.id, "deferred: publish approval is pending; call again after the user responds", True))
            elif block.name == "publish_branch":
                try:
                    prompt = await prepare_publish(state, block)
                except Exception as e:
                    results.append(tool_result(block.id, f"error: {e}", is_error=True))
            else:
                results.append(await run_tool(state, block))

        if prompt is not None:
            state.partial_results = results
            return True, prompt
        state.messages.append({"role": "user", "content": results})
    raise RuntimeError(f"step limit ({MAX_STEPS}) reached without a final answer")


class RepoWorker(AgentExecutor):
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        updater = TaskUpdater(event_queue, context.task_id, context.context_id)
        ids = {"context_id": context.context_id, "task_id": context.task_id}
        text = context.get_user_input()
        await updater.start_work()
        try:
            state = TASKS.get(context.task_id)
            if state is not None and state.pending is not None:
                await resume(state, text)
            else:
                state = await new_task(context.task_id, text)
                state.messages.append({"role": "user", "content": text})

            waiting, reply = await drive(state)
            if waiting:
                await updater.update_status(
                    A2ATaskState.input_required, message=new_agent_text_message(reply, **ids)
                )
            else:
                finish(context.task_id)
                await updater.complete(new_agent_text_message(reply, **ids))
        except Exception as e:
            log.exception("task %s failed", context.task_id)
            finish(context.task_id)
            await updater.failed(new_agent_text_message(f"repo-worker error: {e}", **ids))

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        finish(context.task_id)
        updater = TaskUpdater(event_queue, context.task_id, context.context_id)
        await updater.update_status(A2ATaskState.canceled)


def build_app() -> Any:
    card = AgentCard(
        name="repo_worker",
        description="Clones a GitHub repo named in the message, edits it, runs its checks, and opens a PR after your approval.",
        url=os.environ.get("PUBLIC_URL", "http://localhost:8080/"),
        version="0.1.0",
        capabilities=AgentCapabilities(streaming=False, push_notifications=False),
        default_input_modes=["text"],
        default_output_modes=["text"],
        skills=[
            AgentSkill(
                id="repo_change",
                name="Repo change",
                description="Make a change to a GitHub repo and open a PR. Start the message with owner/repo.",
                tags=["github", "pull-request"],
            )
        ],
    )
    handler = DefaultRequestHandler(agent_executor=RepoWorker(), task_store=InMemoryTaskStore())
    return A2AStarletteApplication(agent_card=card, http_handler=handler).build()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    uvicorn.run(build_app(), host="0.0.0.0", port=8080)
