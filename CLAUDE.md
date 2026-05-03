# Gru-Ops

**What is this?** A personal homelab Kubernetes cluster running on TalOS OS with ArgoCD GitOps, hosted on 3 HP EliteDesk Mini PCs.

**Why?** Self-hosted applications, media management, development tools, and experimentation with modern K8s infrastructure.

**Current state**: Production homelab with ~20 applications running on TalOS v1.12.6, Kubernetes v1.35.3.

---

## Quick Start

When asked to work with this repo:

1. **Always read existing patterns** before modifying - the codebase follows strict conventions
2. **Never manually apply resources** - ArgoCD handles all deployments via GitOps
3. **Never commit secrets** - use the `./aux/seal-secret.sh` script for all sensitive data
4. **Follow the deployment order**: infra (sync-wave: 10) → apps (sync-wave: 20)
5. **Run pre-commit** after making changes: `pre-commit run --all-files`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      ArgoCD (GitOps)                       │
│                    github.com/JanBenisek/gru-ops          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                      │
│  Kevin (Control Plane) + Stuart/Bob (Workers)              │
│  TalOS v1.12.6 • K8s v1.35.3                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
        ┌─────────────────────┴─────────────────────┐
        ↓                                           ↓
┌───────────────┐                           ┌───────────────┐
│   Storage     │                           │    Network    │
│ Synology NAS  │                           │  Cloudflare   │
│   (NFS/iSCSI) │                           │   + Tunnels   │
└───────────────┘                           └───────────────┘
```

### Cluster Nodes
- **Kevin** (Control): 192.168.178.39 - TalOS master, i5-7500, 40GB RAM
- **Stuart** (Worker): 192.168.178.38 - TalOS worker, i5-7500, 40GB RAM
- **Bob** (Worker): 192.168.178.108 - Proxmox VM, i5-7600T, 16GB RAM

### Key Infrastructure
- **Storage**: Synology DS920+ (NFS/iSCSI), Hetzner S3 (backups)
- **Networking**: MetalLB (LoadBalancer), Traefik (Ingress), Cloudflare Tunnels (external access)
- **GitOps**: ArgoCD manages all deployments from this repo
- **Secrets**: Sealed Secrets (kubeseal) - public key at `aux/sealed-secrets-public.crt`

---

## Directory Structure

```
gru-ops/
├── argocd/                    # GitOps manifests
│   ├── bootstrap/             # ⚠️ DO NOT MODIFY (initial setup only)
│   ├── manifests/prod/        # Production manifests
│   │   ├── infra/             # Infrastructure services (sync-wave: 10)
│   │   └── apps/              # Applications (sync-wave: 20)
│   ├── prod/                  # ArgoCD Application definitions
│   │   ├── infra/             # Infra app definitions
│   │   └── apps/              # App definitions
│   ├── project.yaml           # ArgoCD project config
│   └── root-app.yaml          # Root ArgoCD app
├── terraform/                # Infrastructure as Code
│   ├── modules/              # Terraform modules
│   ├── patches/              # TalOS patches
│   ├── cluster.tf            # TalOS cluster config
│   └── variables.tf           # Terraform variables
├── aux/                      # Scripts and public keys
│   ├── seal-secret.sh        # Create sealed secrets
│   └── sealed-secrets-public.crt
└── CLAUDE.md                 # This file
```

---

## Patterns & Conventions

### ArgoCD Application Pattern

See `argocd/README.md` for the full template. Key points:
- Infrastructure uses `sync-wave: "10"`, apps use `sync-wave: "20"`
- Always include `automated.prune: true` and `automated.selfHeal: true`
- Always use `CreateNamespace=true`
- Values are referenced via `$values` from git

### Secrets Management

**NEVER commit plain secrets.** Always use sealed secrets:

```bash
# Basic usage
./aux/seal-secret.sh <secret-name> <namespace> <key=value> <relative-path>

# Examples
./aux/seal-secret.sh cloudflare-api-token external-dns apiKey=YOUR_TOKEN prod/infra/external-dns
./aux/seal-secret.sh hetzner-credentials k8up 'password=secret-key' prod/infra/k8up/controller 'user=access-key'

# Creates: argocd/manifests/<relative-path>/<secret-name>.yaml
```

### Namespace Convention
- Infrastructure namespaces match service name: `traefik`, `cert-manager`, `cloudflare`
- Application namespaces match app name: `immich`, `homepage`, `jupyter`

### Storage Convention
- **NFS**: Primary storage via CSI-NFS driver (most apps)
- **PostgreSQL**: Managed by CNPG (CloudNativePG) for databases
- **Backups**: K8up → Hetzner S3

---

## What I Want You To Do

### Adding a New Application

1. Create `argocd/prod/apps/<app-name>.yaml` following the pattern in `argocd/README.md`
2. Create directory: `argocd/manifests/prod/apps/<app-name>/`
3. Add `values.yaml` with your configuration
4. Add any sealed secrets in the same directory
5. Run `pre-commit run --all-files` to validate
6. Commit and push - ArgoCD will deploy automatically

### Adding Infrastructure Service

Same as above but:
1. Place in `argocd/prod/infra/<service-name>.yaml`
2. Use `sync-wave: "10"` in annotations (except External-DNS which uses `20` - see gotchas)
3. Place manifests in `argocd/manifests/prod/infra/<service-name>/`

### Updating an Application

1. Modify the relevant files in `argocd/manifests/prod/<type>/<app>/`
2. If changing chart version, update `argocd/prod/<type>/<app>.yaml`
3. Run `pre-commit run --all-files` to validate
4. Commit and push - ArgoCD will sync automatically

---

## Critical Gotchas (Don't Miss These!)

⚠️ **csi-driver-nfs chart is disabled in Renovate** - This is the primary storage driver. It must be updated manually. Don't enable auto-updates or you could break all NFS storage.

⚠️ **Private registry images won't auto-update** - Images from `docker-registry.pengiuns.com` are disabled in Renovate. Update these manually.

⚠️ **External-DNS has sync-wave: "20"** - Despite being in the `infra/` directory, it depends on sealed-secrets and reflector, so it deploys with apps, not infra. Don't change this without understanding the dependencies.

⚠️ **TalOS upgrade requires specific order** - You must upgrade each node individually via `t upgrade --image`, THEN upgrade Kubernetes with `t upgrade-k8s`. See `terraform/README.md` for exact commands. Don't skip nodes or upgrade K8s first.

⚠️ **Filebrowser uses Recreate strategy** - The filebrowser deployment uses `type: Recreate` because it's not scalable and doesn't support auto roll upgrades. Don't change this to RollingUpdate.

⚠️ **Monitoring uses pinned chart versions** - The monitoring app in `argocd/prod/infra/monitoring.yaml` uses `{{chartVersion}}` variables for Prometheus, Grafana, and Loki. When updating, verify compatibility across the stack.

⚠️ **Sealed secrets public key is in .gitignore but IS tracked in git** - The public key at `aux/sealed-secrets-public.crt` is gitignored but currently tracked in the repository. This is intentional - it allows anyone to verify secrets but not create new ones. The private key (`aux/sealed-secrets-private.key`) is not tracked and must never be committed.

⚠️ **K8up backup definitions must be in the same namespace** - Backup schedules need to live in the namespace they're backing up so they have access to PVCs and secrets.

---

## Deployment Order (Critical!)

Infrastructure MUST deploy before applications:

1. **Infrastructure** (sync-wave: 10)
   - ArgoCD, Cert-Manager, Cloudflare, CNPG, CSI-NFS, Docker Registry, K8up, MetalLB, Monitoring, Pocket-ID, Reflector, Sealed-Secrets, Synology, TinyAuth, Traefik

2. **Infrastructure** (sync-wave: 20)
   - External-DNS (depends on sealed-secrets and reflector)

3. **Applications** (sync-wave: 20)
   - Homepage, Immich, IT-Tools, JupyterHub, LibreTranslate, Media-arr (Radarr, Sonarr, Prowlarr, Bazarr, SabNZBd), Metabase, Ollama, Open-WebUI, OtterWiki, Podinfo, Stirling

---

## What NOT To Do

❌ **Never** manually apply resources with `kubectl apply` (let ArgoCD handle it)
❌ **Never** commit plain secrets - always use `./aux/seal-secret.sh`
❌ **Never** modify files in `argocd/bootstrap/` - initial setup only
❌ **Never** skip pre-commit hooks - run `pre-commit run --all-files` before committing
❌ **Never** expose services directly - use Cloudflare tunnels
❌ **Never** use default passwords - generate strong credentials
❌ **Never** change sync-wave values without understanding dependencies
❌ **Never** enable Renovate for csi-driver-nfs chart
❌ **Never** upgrade TalOS without following the documented order

---

## Validation & Pre-commit

Run pre-commit hooks to validate your changes:

```bash
# Run on all files
pre-commit run --all-files

# Install pre-commit (run once after cloning)
pre-commit install

# Auto-fix issues where possible
pre-commit run --all-files --fix
```

Pre-commit hooks include:
- `check-yaml` - Validates YAML syntax
- `yamllint` - Lints YAML (max 120 char lines)
- `terraform_fmt` - Formats Terraform files
- `terraform_validate` - Validates Terraform config
- `gitleaks` - Detects secrets and credentials

---

## Renovate Bot

Renovate automatically creates PRs for dependency updates. Config: `renovate.json`

**What Renovate updates:**
- Helm chart versions
- Docker image tags
- ArgoCD target revisions

**What Renovate does NOT update:**
- csi-driver-nfs chart (disabled - critical storage driver)
- Images from `docker-registry.pengiuns.com` (private registry)

**Limits:** 5 concurrent PRs, 2 per hour

---

## Key Files Reference

| Purpose | Path |
|---------|------|
| ArgoCD project config | `argocd/project.yaml` |
| Root ArgoCD app | `argocd/root-app.yaml` |
| Full app template | `argocd/README.md` |
| Infrastructure apps | `argocd/prod/infra/*.yaml` |
| Application apps | `argocd/prod/apps/*.yaml` |
| Terraform cluster config | `terraform/cluster.tf` |
| TalOS upgrade procedures | `terraform/README.md` |
| Seal secret script | `aux/seal-secret.sh` |
| Renovate config | `renovate.json` |

---

## Common Commands

```bash
# ArgoCD
argocd app list                      # List all apps
argocd app sync <app-name>           # Sync manually
argocd app diff <app-name>           # See what will change

# Terraform (for TalOS upgrades - see terraform/README.md)
cd terraform && terraform plan && terraform apply
```

---

## Documentation References

- `README.md` - Project overview and hardware specs
- `argocd/README.md` - Comprehensive service documentation and app template
- `terraform/README.md` - Terraform setup and TalOS upgrade procedures
- `renovate.json` - Dependency update configuration

---

## External Docs

- **ArgoCD**: https://argoproj.github.io/argo-cd/
- **TalOS**: https://www.talos.dev/v1.12/
- **Sealed Secrets**: https://github.com/bitnami-labs/sealed-secrets
- **Cloudflare Tunnels**: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/

---

**Tech Stack**: K8s v1.35.3 • TalOS v1.12.6 • ArgoCD • Helm • Terraform • Cloudflare • Hetzner S3

**Last Updated**: 2026-05-03
