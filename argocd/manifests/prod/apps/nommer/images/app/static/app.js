"use strict";

let state = { allergens: [], dates: [], eaten: {}, symptoms: {} };

const grid = document.getElementById("grid");
const wrap = document.querySelector(".table-wrap");
const status = document.getElementById("status");
const empty = document.getElementById("empty");
const symptomDialog = document.getElementById("symptom-dialog");
const symptomTitle = document.getElementById("symptom-title");
const symptomText = document.getElementById("symptom-text");
let symptomDay = null;

async function call(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      if (typeof err.detail === "string") message = err.detail;
    } catch {
      // non-JSON error body: keep the generic message
    }
    throw new Error(message);
  }
  return res.json();
}

// Runs an API call, applies the returned state, and reports errors in the status line.
async function run(promise) {
  try {
    state = await promise;
    showStatus("");
    render();
    return true;
  } catch (err) {
    showStatus(err.message, true);
    return false;
  }
}

function showStatus(message, isError = false) {
  status.textContent = message;
  status.className = isError ? "status error" : "status";
  status.hidden = !message;
}

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key.includes("-")) node.setAttribute(key, value);
    else node[key] = value;
  }
  node.append(...children);
  return node;
}

function formatDay(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function todayIso() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

function render() {
  empty.hidden = state.dates.length > 0;
  grid.replaceChildren();

  const headRow = el("tr", {}, el("th", { className: "corner", textContent: "Food" }));
  for (const day of state.dates) {
    headRow.append(
      el(
        "th",
        { className: "day" },
        el("span", { className: "day-label", textContent: formatDay(day), title: day }),
        el("button", {
          className: "icon-btn",
          textContent: "×",
          title: `Remove ${day}`,
          "aria-label": `Remove ${day}`,
          onclick: () => removeDay(day),
        }),
      ),
    );
  }
  headRow.append(el("th", { className: "total", textContent: "Total" }));
  grid.append(el("thead", {}, headRow));

  const body = el("tbody");
  for (const allergen of state.allergens) {
    let count = 0;
    const row = el(
      "tr",
      {},
      el(
        "th",
        { className: "food" },
        el("span", { textContent: allergen }),
        el("button", {
          className: "icon-btn",
          textContent: "×",
          title: `Remove ${allergen}`,
          "aria-label": `Remove ${allergen}`,
          onclick: () => removeAllergen(allergen),
        }),
      ),
    );
    for (const day of state.dates) {
      const eaten = (state.eaten[day] || []).includes(allergen);
      if (eaten) count += 1;
      row.append(
        el(
          "td",
          {},
          el("button", {
            className: eaten ? "cell eaten" : "cell",
            textContent: eaten ? "✓" : "",
            "aria-pressed": String(eaten),
            "aria-label": `${allergen} on ${formatDay(day)}: ${eaten ? "eaten" : "not eaten"}`,
            onclick: () => toggle(day, allergen, !eaten),
          }),
        ),
      );
    }
    row.append(el("td", { className: "total", textContent: String(count) }));
    body.append(row);
  }

  const symptomRow = el("tr", {}, el("th", { className: "food", textContent: "Symptoms" }));
  let noted = 0;
  for (const day of state.dates) {
    const text = state.symptoms[day] || "";
    if (text) noted += 1;
    symptomRow.append(
      el(
        "td",
        {},
        el("button", {
          className: text ? "symptom-cell noted" : "symptom-cell",
          textContent: text ? "!" : "+",
          title: text || "Add symptoms",
          "aria-label": `Symptoms on ${formatDay(day)}: ${text || "none"}`,
          onclick: () => openSymptoms(day),
        }),
      ),
    );
  }
  symptomRow.append(el("td", { className: "total", textContent: String(noted) }));
  body.append(symptomRow);
  grid.append(body);

  wrap.scrollLeft = wrap.scrollWidth;
}

function toggle(day, allergen, eaten) {
  run(call("PUT", "/api/eaten", { date: day, allergen, eaten }));
}

function removeAllergen(allergen) {
  if (!confirm(`Remove "${allergen}" and all its entries?`)) return;
  run(call("DELETE", `/api/allergens?name=${encodeURIComponent(allergen)}`));
}

function removeDay(day) {
  if (!confirm(`Remove ${formatDay(day)} and everything eaten that day?`)) return;
  run(call("DELETE", `/api/dates?day=${encodeURIComponent(day)}`));
}

function openSymptoms(day) {
  symptomDay = day;
  symptomTitle.textContent = `Symptoms, ${formatDay(day)}`;
  symptomText.value = state.symptoms[day] || "";
  symptomDialog.showModal();
  symptomText.focus();
}

async function saveSymptoms(text) {
  if (await run(call("PUT", "/api/symptoms", { date: symptomDay, text }))) {
    symptomDialog.close();
  }
}

document.getElementById("add-allergen").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.getElementById("allergen-name");
  const name = input.value.trim();
  if (!name) return;
  if (await run(call("POST", "/api/allergens", { name }))) {
    input.value = "";
    input.focus();
  }
});

document.getElementById("add-date").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.getElementById("day");
  if (!input.value) return;
  await run(call("POST", "/api/dates", { date: input.value }));
});

document.getElementById("symptom-form").addEventListener("submit", (event) => {
  event.preventDefault();
  saveSymptoms(symptomText.value.trim());
});

document.getElementById("symptom-clear").addEventListener("click", () => saveSymptoms(""));
document.getElementById("symptom-cancel").addEventListener("click", () => symptomDialog.close());

document.getElementById("day").value = todayIso();
run(call("GET", "/api/state"));
