/* Miss Coco's Kitchen Chaos: rules, state, rendering, and input. Requires audio.js (Sound). */

// ---- Tuning -----------------------------------------------------------------
const ZONE_START = 0.8;          // target zone spans this fraction of the belt
const ZONE_END = 0.97;
const BASE_SPEED = 0.12;         // belt lengths per second at 1.0x
const SPAWN_GUARD = 0.2;         // no new item until the last one is this far along
const SHIFT_SECONDS = 30;
const INTRO_SECONDS = 2.2;
const POOP_TIMER = 3;            // seconds to finish scooping before the fog
const SCOOP_CLICKS = 5;
const POOP_ANIM = 1.4;           // seconds the cat holds the 🙀 pose
const ANXIETY_DECAY = 2;         // per second
const PENALTY = { miss: 10, wrong: 15, idle: 6, screech: 15 };
const SCREECH_FIRST_MIN = 8; // first pop-up of each round lands in this window (must stay under SHIFT_SECONDS)
const SCREECH_FIRST_MAX = 20;
const SCREECH_MIN = 25; // seconds of play between later pop-ups
const SCREECH_MAX = 40;
const SCREECH_WINDOW = 8; // seconds to pet before she counts it as ignored
const SCREECH_PRESSES = 10; // Space presses to finish petting (10% each)

const SHIFTS = [
  { title: "The 10s", belt: 1.0, bpm: 128, spawn: [1.5, 2.2], feedsPerPoop: 3, sub: "Belt 1.0× · 128 BPM" },
  { title: "The 20s", belt: 1.5, bpm: 142, spawn: [1.1, 1.6], feedsPerPoop: 3, sub: "Belt 1.5× · 142 BPM" },
  { title: "The 30s", belt: 2.0, bpm: 160, spawn: [0.9, 1.3], feedsPerPoop: 2, sub: "Belt 2.0× · 160 BPM · Poop every 2 feeds" },
  { title: "The 40s", belt: 2.5, bpm: 176, spawn: [0.7, 1.0], feedsPerPoop: 2, sub: "Belt 2.5× · 176 BPM · Poop every 2 feeds" },
];

const ITEMS = {
  tuna: { icon: "tuna", label: "Tuna", tool: "feed", weight: 25 },
  salmon: { icon: "salmon", label: "Salmon", tool: "feed", weight: 20 },
  brush: { icon: "groom", label: "Brush", tool: "groom", weight: 25 },
  sock: { icon: "sock", label: "Sock", tool: "decline", weight: 10 },
  duck: { icon: "duck", label: "Duck", tool: "decline", weight: 10 },
  lego: { icon: "lego", label: "Lego", tool: "decline", weight: 10 },
};
const SAY = {
  food: ["Papa Belt", "omnomnom", "gib", "smakota"], // fed
  unwanted: ["WTF", "eugh", "do you even love me"], // food declined or missed
  groom: ["good servant", "continue you peasant"], // groomed
  stop: ["why did you stop"], // brush missed
};
const SPEECH_MS = 2400;
const CAKE = { icon: "cake", label: "Cake" };

// ---- DOM --------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const el = {
  shiftLabel: $("shift-label"),
  shiftTime: $("shift-time"),
  treats: $("stat-treats"),
  poops: $("stat-poops"),
  anxBar: $("anxiety-bar"),
  anxText: $("anxiety-text"),
  musicBtn: $("btn-music"),
  stage: $("stage"),
  belt: $("belt"),
  zone: $("zone"),
  items: $("items"),
  cat: $("cat-wrap"),
  speech: $("speech"),
  litter: $("litter"),
  litterAlert: $("litter-alert"),
  litterTimer: $("litter-timer"),
  poopPile: $("poop-pile"),
  scoopBar: $("scoop-bar"),
  scoopText: $("scoop-text"),
  banner: $("shift-banner"),
  bannerTitle: $("shift-banner-title"),
  bannerSub: $("shift-banner-sub"),
  finale: $("finale"),
  recap: $("finale-recap"),
  fog: $("fog"),
  overStart: $("overlay-start"),
  overOver: $("overlay-over"),
  overScreech: $("overlay-screech"),
  screechFill: $("screech-fill"),
  screechTime: $("screech-time"),
  overTitle: $("over-title"),
  overReason: $("over-reason"),
  overStats: $("over-stats"),
  confetti: $("confetti"),
  btn: { feed: $("btn-feed"), groom: $("btn-groom"), decline: $("btn-decline"), scoop: $("btn-scoop") },
};

el.zone.style.left = `${ZONE_START * 100}%`;
el.zone.style.width = `${(ZONE_END - ZONE_START) * 100}%`;

// ---- State ------------------------------------------------------------------
function newGame() {
  return {
    phase: "idle", // idle | intro | playing | finale | over
    shift: 0,
    shiftTime: SHIFT_SECONDS,
    introTime: 0,
    items: [],
    nextId: 1,
    spawnTimer: 0,
    anxiety: 0,
    feedsSincePoop: 0,
    treats: 0,
    scooped: 0,
    pendingPoops: 0,
    poopTimer: 0,
    scoopClicks: 0,
    poopAnim: 0,
    screech: null, // { left, presses } while the pop-up is open
    screechTimer: 0, // seconds of play until the next pop-up
    lastTs: 0,
  };
}

const game = newGame();

// ---- Helpers ----------------------------------------------------------------
const rand = (a, b) => a + Math.random() * (b - a);
const inZoneP = (p) => p >= ZONE_START && p <= ZONE_END;
const isFood = (kind) => kind === "tuna" || kind === "salmon";

function pickKind() {
  const keys = Object.keys(ITEMS);
  const total = keys.reduce((sum, k) => sum + ITEMS[k].weight, 0);
  let r = Math.random() * total;
  for (const k of keys) {
    r -= ITEMS[k].weight;
    if (r < 0) return k;
  }
  return keys[keys.length - 1];
}

function pulse(btn, ok) {
  const cls = ok ? "btn-ok" : "btn-bad";
  btn.classList.add(cls);
  setTimeout(() => btn.classList.remove(cls), 160);
}

function shake() {
  el.stage.classList.remove("shake");
  void el.stage.offsetWidth; // restart animation
  el.stage.classList.add("shake");
}

function setKind(item, kind) {
  item.kind = kind;
  const def = kind === "cake" ? CAKE : ITEMS[kind];
  item.node.querySelector(".item-bubble").innerHTML = ICON_SVG[def.icon];
  item.node.querySelector(".item-label").textContent = def.label;
  if (kind === "cake") item.node.classList.add("cake-item");
}

function spawnItem() {
  const node = document.createElement("div");
  node.className = "item";
  node.innerHTML = '<div class="item-bubble"></div><div class="item-label"></div>';
  el.items.appendChild(node);
  const item = { id: game.nextId++, kind: null, p: 0, node };
  setKind(item, pickKind());
  game.items.push(item);
}

// Removes from logic immediately; DOM node lingers for the exit animation.
function removeItem(item, outClass) {
  game.items = game.items.filter((i) => i !== item);
  if (!outClass) {
    item.node.remove();
    return;
  }
  item.node.classList.add(outClass);
  setTimeout(() => item.node.remove(), 300);
}

function clearBelt() {
  for (const it of game.items) it.node.remove();
  game.items = [];
}

function penalize(amount) {
  game.anxiety = Math.min(100, game.anxiety + amount);
  shake();
}

// Cat speech: one random line from a pool, hidden again after SPEECH_MS.
let speechTimer = 0;
function say(line) {
  el.speech.textContent = line;
  el.speech.classList.remove("hidden");
  clearTimeout(speechTimer);
  speechTimer = setTimeout(() => el.speech.classList.add("hidden"), SPEECH_MS);
}
function sayRandom(lines) { say(lines[Math.floor(Math.random() * lines.length)]); }

// ---- Phases -----------------------------------------------------------------
function startGame() {
  clearBelt();
  Object.assign(game, newGame());
  el.overStart.classList.add("hidden");
  el.overOver.classList.add("hidden");
  el.finale.classList.add("hidden");
  el.fog.classList.remove("on");
  el.cat.dataset.party = "off";
  stopConfetti();
  Sound.start(SHIFTS[0].bpm); // user gesture (button click) unlocks audio
  enterShift();
}

function enterShift() {
  clearBelt();
  const cfg = SHIFTS[game.shift];
  game.phase = "intro";
  game.introTime = INTRO_SECONDS;
  game.shiftTime = SHIFT_SECONDS;
  game.spawnTimer = 0.8;
  el.shiftLabel.textContent = `Shift ${game.shift + 1} · ${cfg.title}`;
  el.bannerTitle.textContent = `SHIFT ${game.shift + 1} · ${cfg.title.toUpperCase()}`;
  el.bannerSub.textContent = cfg.sub;
  el.banner.classList.remove("hidden");
  el.banner.classList.add("flex");
  el.belt.style.setProperty("--belt-dur", `${(0.8 / cfg.belt).toFixed(2)}s`);
  Sound.setBpm(cfg.bpm);
}

function endShift() {
  if (game.shift < SHIFTS.length - 1) {
    game.shift++;
    enterShift();
  } else {
    startFinale();
  }
}

function startFinale() {
  game.phase = "finale";
  game.pendingPoops = 0;
  game.poopTimer = 0;
  game.scoopClicks = 0;
  for (const it of game.items) setKind(it, "cake");
  el.shiftLabel.textContent = `Shift ${SHIFTS.length} · Survived 🎉`;
  el.banner.classList.add("hidden");
  el.banner.classList.remove("flex");
  el.cat.dataset.party = "on";
  el.recap.textContent =
    `Total Treats Fed: ${game.treats} | Total Poops Scooped: ${game.scooped}. ` +
    "You successfully survived the chaotic roar of your 40s—welcome to the cozy 50s!";
  el.finale.classList.remove("hidden");
  el.finale.classList.add("flex");
  Sound.morphToBirthday();
  startConfetti();
}

function gameOver(reason) {
  if (game.phase === "over") return;
  game.phase = "over";
  Sound.stop();
  Sound.recordScratch();
  el.fog.classList.toggle("on", reason === "fog");
  el.overTitle.textContent = reason === "fog" ? "LITTER BOX OVERFLOW" : "GAME OVER";
  el.overReason.textContent =
    reason === "fog"
      ? "You let the poop sit. The kitchen now smells like a gym sock that lost a fight. Miss Coco is not impressed."
      : "Anxiety hit 100%. Miss Coco has filed a formal complaint.";
  el.overStats.textContent = `Treats fed: ${game.treats} · Poops scooped: ${game.scooped} · Reached Shift ${game.shift + 1}`;
  el.overOver.classList.remove("hidden");
}

// ---- Screech pop-up ---------------------------------------------------------
function openScreech() {
  game.screech = { left: SCREECH_WINDOW, presses: 0 };
  el.stage.classList.add("screech-open");
  el.overScreech.classList.remove("hidden");
  renderScreech();
}

function renderScreech() {
  el.screechTime.textContent = `${game.screech.left.toFixed(1)}s`;
  el.screechFill.style.width = `${(game.screech.presses / SCREECH_PRESSES) * 100}%`;
}

function closeScreech() {
  game.screech = null;
  game.screechTimer = rand(SCREECH_MIN, SCREECH_MAX);
  el.stage.classList.remove("screech-open");
  el.overScreech.classList.add("hidden");
}

function updateScreech(dt) {
  game.screech.left -= dt;
  if (game.screech.left <= 0) {
    closeScreech();
    sayRandom(SAY.unwanted);
    penalize(PENALTY.screech);
    return;
  }
  renderScreech();
}

function pressScreech() {
  game.screech.presses++;
  if (game.screech.presses >= SCREECH_PRESSES) {
    game.anxiety = 0; // finishing the pet resets anxiety
    closeScreech();
    sayRandom(SAY.groom);
    return;
  }
  renderScreech();
}

// ---- Actions ----------------------------------------------------------------
function dropPoop() {
  game.pendingPoops++;
  if (game.pendingPoops === 1) game.poopTimer = POOP_TIMER;
  game.poopAnim = POOP_ANIM;
  Sound.sfx.poop();
}

function act(tool) {
  if (game.phase !== "playing" || game.screech) return;
  const btn = el.btn[tool];
  const target = game.items.find((i) => inZoneP(i.p));

  if (!target) {
    penalize(PENALTY.idle);
    pulse(btn, false);
    return;
  }

  if (ITEMS[target.kind].tool !== tool) {
    removeItem(target, "bad-out");
    if (tool === "feed") sayRandom(SAY.unwanted);
    penalize(PENALTY.wrong);
    pulse(btn, false);
    return;
  }

  removeItem(target, "pop-out");
  pulse(btn, true);
  if (tool === "feed") sayRandom(SAY.food);
  if (tool === "groom") sayRandom(SAY.groom);

  if (tool === "feed") {
    game.treats++;
    game.feedsSincePoop++;
    if (game.feedsSincePoop >= SHIFTS[game.shift].feedsPerPoop) {
      game.feedsSincePoop = 0;
      dropPoop();
    }
  }
}

function scoop() {
  if (game.phase !== "playing" || game.screech || game.pendingPoops === 0) return;
  game.scoopClicks++;
  Sound.sfx.scoop();
  pulse(el.btn.scoop, true);
  if (game.scoopClicks >= SCOOP_CLICKS) {
    game.scoopClicks = 0;
    game.pendingPoops--;
    game.scooped++;
    game.poopTimer = game.pendingPoops > 0 ? POOP_TIMER : 0;
  }
}

// ---- Simulation -------------------------------------------------------------
function update(dt) {
  game.poopAnim = Math.max(0, game.poopAnim - dt);

  if (game.phase === "intro") {
    game.introTime -= dt;
    if (game.introTime <= 0) {
      game.phase = "playing";
      game.screechTimer = rand(SCREECH_FIRST_MIN, SCREECH_FIRST_MAX);
      el.banner.classList.add("hidden");
      el.banner.classList.remove("flex");
    }
    return;
  }

  if (game.phase === "finale") {
    // Cakes drift off the belt; nothing else happens.
    const speed = BASE_SPEED * SHIFTS[SHIFTS.length - 1].belt;
    for (const it of game.items) it.p += speed * dt;
    for (const it of game.items.slice()) {
      if (it.p > 1.08) removeItem(it, null);
    }
    return;
  }

  if (game.phase !== "playing") return;
  if (game.screech) {
    updateScreech(dt);
    return;
  }
  game.screechTimer -= dt;
  if (game.screechTimer <= 0) {
    openScreech();
    return;
  }

  const cfg = SHIFTS[game.shift];
  game.shiftTime -= dt;

  const speed = BASE_SPEED * cfg.belt;
  for (const it of game.items) it.p += speed * dt;

  for (const it of game.items.slice()) {
    if (it.p > ZONE_END) {
      removeItem(it, "bad-out");
      penalize(PENALTY.miss);
      Sound.sfx.miss();
      if (it.kind === "brush") sayRandom(SAY.stop);
    }
  }

  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0 && game.items.every((i) => i.p >= SPAWN_GUARD)) {
    spawnItem();
    game.spawnTimer = rand(cfg.spawn[0], cfg.spawn[1]);
  }

  if (game.anxiety >= 100) {
    gameOver("anxiety");
    return;
  }
  game.anxiety = Math.max(0, game.anxiety - ANXIETY_DECAY * dt);

  if (game.pendingPoops > 0) {
    game.poopTimer -= dt;
    if (game.poopTimer <= 0) {
      gameOver("fog");
      return;
    }
  }

  if (game.shiftTime <= 0) endShift();
}

// ---- Rendering --------------------------------------------------------------
function render() {
  for (const it of game.items) it.node.style.left = `${it.p * 100}%`;

  const zoneItem = game.items.find((i) => inZoneP(i.p));
  el.zone.classList.toggle("active", !!zoneItem && game.phase === "playing");

  let mood = "normal";
  if (game.poopAnim > 0) mood = "pooping";
  else if (game.phase === "playing" && zoneItem && isFood(zoneItem.kind)) mood = "hungry";
  el.cat.dataset.mood = mood;

  el.shiftTime.textContent = Math.max(0, Math.ceil(game.shiftTime));
  el.treats.textContent = game.treats;
  el.poops.textContent = game.scooped;

  const a = game.anxiety;
  el.anxBar.style.width = `${a}%`;
  el.anxBar.style.backgroundColor = a < 50 ? "var(--green)" : a < 80 ? "var(--yellow)" : "var(--red)";
  el.anxText.textContent = `${Math.round(a)}%`;

  const alert = game.pendingPoops > 0;
  el.litter.classList.toggle("alert-flash", alert);
  el.litterAlert.classList.toggle("hidden", !alert);
  el.litterTimer.textContent = `${Math.max(0, game.poopTimer).toFixed(1)}s`;
  el.poopPile.textContent = "💩".repeat(Math.min(game.pendingPoops, 4));
  el.scoopBar.style.width = `${(game.scoopClicks / SCOOP_CLICKS) * 100}%`;
  el.scoopText.textContent = `${game.scoopClicks}/${SCOOP_CLICKS}`;
}

// ---- Confetti (digital squares) ---------------------------------------------
let confettiRaf = 0;

function sizeCanvas() {
  el.confetti.width = window.innerWidth;
  el.confetti.height = window.innerHeight;
}

function startConfetti() {
  sizeCanvas();
  el.confetti.classList.remove("hidden");
  const c = el.confetti.getContext("2d");
  const colors = ["#ff4fa3", "#29f0ff", "#ffe14d", "#63ff7a", "#7b3ff2", "#ff3860", "#fff4e0"];
  const pieces = Array.from({ length: 220 }, () => ({
    x: rand(0, el.confetti.width),
    y: rand(-el.confetti.height, 0),
    vy: rand(90, 220),
    drift: rand(20, 60),
    phase: rand(0, 6.28),
    wob: rand(2, 5),
    rot: rand(0, 6.28),
    vr: rand(-4, 4),
    flip: rand(0, 6.28),
    vf: rand(4, 9),
    w: rand(6, 11),
    h: rand(8, 14),
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const W = el.confetti.width;
    const H = el.confetti.height;
    c.clearRect(0, 0, W, H);
    for (const p of pieces) {
      p.phase += p.wob * dt;
      p.y += p.vy * dt;
      p.x += Math.sin(p.phase) * p.drift * dt;
      p.rot += p.vr * dt;
      p.flip += p.vf * dt;
      if (p.y > H + 20) {
        p.y = -20;
        p.x = rand(0, W);
      }
      const f = Math.abs(Math.cos(p.flip));
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.fillStyle = p.color;
      c.fillRect(-p.w / 2, (-p.h * f) / 2, p.w, p.h * f);
      c.restore();
    }
    confettiRaf = requestAnimationFrame(loop);
  };
  confettiRaf = requestAnimationFrame(loop);
}

function stopConfetti() {
  cancelAnimationFrame(confettiRaf);
  confettiRaf = 0;
  el.confetti.getContext("2d").clearRect(0, 0, el.confetti.width, el.confetti.height);
  el.confetti.classList.add("hidden");
}

// ---- Loop & input -----------------------------------------------------------
function frame(ts) {
  const dt = game.lastTs ? Math.min(0.05, (ts - game.lastTs) / 1000) : 0;
  game.lastTs = ts;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

const KEYMAP = {
  f: () => act("feed"),
  g: () => act("groom"),
  d: () => act("decline"),
  s: () => scoop(),
};

window.addEventListener("keydown", (e) => {
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  if (game.screech && e.key === " ") {
    e.preventDefault();
    if (document.activeElement) document.activeElement.blur(); // stop Space re-clicking a focused button
    pressScreech();
    return;
  }
  const fn = KEYMAP[e.key.toLowerCase()];
  if (fn) {
    e.preventDefault();
    fn();
  }
});

el.btn.feed.addEventListener("click", () => act("feed"));
el.btn.groom.addEventListener("click", () => act("groom"));
el.btn.decline.addEventListener("click", () => act("decline"));
el.btn.scoop.addEventListener("click", scoop);
el.musicBtn.addEventListener("click", () => {
  const on = el.musicBtn.getAttribute("aria-pressed") !== "true";
  el.musicBtn.setAttribute("aria-pressed", String(on));
  el.musicBtn.textContent = on ? "ON" : "OFF";
  Sound.setMusicOn(on);
});
$("btn-start").addEventListener("click", startGame);
$("btn-restart").addEventListener("click", startGame);
$("btn-restart-finale").addEventListener("click", startGame);
window.addEventListener("resize", sizeCanvas);

sizeCanvas();

// ---- Miss Coco sprite -------------------------------------------------------
// Procedural pixel art: shapes are sampled at cell centres on a 40x36 grid
// (6 hat rows above the head), outlined automatically, and emitted as
// run-length <rect>s into #cat-svg. Mood faces are separate <g> layers.
const CAT_SPRITE = { cell: 8, cols: 40, rows: 30, hat: 6 };
const CAT_COLORS = {
  outline: "#14062e",
  furDark: "#9aa0af",
  fur: "#d9dce3",
  pink: "#ff8fb8",
  eye: "#00e5ff",
  pupil: "#14062e",
  shine: "#ffffff",
  nose: "#ff4f8b",
  mouth: "#ff3860",
  whisker: "#e6f7ff",
  tear: "#7ef9ff",
  hatPink: "#ff4fa3",
  hatCyan: "#29f0ff",
  hatYellow: "#ffe14d",
};

const inEllipse = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const inCircle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
const inBox = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
function inTriangle(x, y, a, b, c) {
  const side = (p, q) => (x - q[0]) * (p[1] - q[1]) - (p[0] - q[0]) * (y - q[1]);
  const d1 = side(a, b), d2 = side(b, c), d3 = side(c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

const newGrid = () =>
  Array.from({ length: CAT_SPRITE.rows + CAT_SPRITE.hat }, () => new Array(CAT_SPRITE.cols).fill(null));

// Fill every cell whose centre passes test(x, y); y runs -hat..rows-1 in sprite units.
function paint(grid, test, color) {
  grid.forEach((row, gy) => {
    for (let x = 0; x < CAT_SPRITE.cols; x++) {
      if (test(x + 0.5, gy - CAT_SPRITE.hat + 0.5)) row[x] = color;
    }
  });
}

// Set single cells given as [x, y] in sprite units (cell index, not centre).
function dots(grid, cells, color) {
  for (const [x, y] of cells) grid[y + CAT_SPRITE.hat][x] = color;
}

// Empty cells touching `shape` and not claimed by `blockers`: the dark outline.
function outlineOf(shape, blockers) {
  const out = newGrid();
  const H = shape.length, W = CAT_SPRITE.cols;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (shape[y][x] || blockers.some((b) => b[y][x])) continue;
      let touches = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy, nx = x + dx;
          if (ny >= 0 && ny < H && nx >= 0 && nx < W && shape[ny][nx]) touches = true;
        }
      }
      if (touches) out[y][x] = CAT_COLORS.outline;
    }
  }
  return out;
}

// Overlay grids left to right; later grids win on overlap.
function merge(...grids) {
  const out = newGrid();
  for (const g of grids) g.forEach((row, y) => row.forEach((v, x) => { if (v) out[y][x] = v; }));
  return out;
}

// Run-length encode each row so same-colour neighbours become one <rect>.
function toRects(grid) {
  const { cell } = CAT_SPRITE;
  let svg = "";
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const color = row[x];
      let w = 1;
      if (color) {
        while (x + w < row.length && row[x + w] === color) w++;
        svg += `<rect x="${x * cell}" y="${y * cell}" width="${w * cell}" height="${cell}" fill="${color}"/>`;
      }
      x += w;
    }
  });
  return svg;
}

function buildCat() {
  const C = CAT_COLORS;
  const body = newGrid(), tail = newGrid(), hat = newGrid();

  // Body: torso, legs, head, ears, muzzle. Faces left toward the belt.
  paint(body, (x, y) => inEllipse(x, y, 25, 20.5, 12, 8.5), C.fur);
  paint(body, (x, y) => inBox(x, y, 13, 22, 17, 27), C.furDark);
  paint(body, (x, y) => inEllipse(x, y, 32, 25.5, 4, 3), C.furDark);
  paint(body, (x, y) => inEllipse(x, y, 12, 13, 9.5, 8.5), C.furDark);
  paint(body, (x, y) => inTriangle(x, y, [3.5, 10], [5.5, 1.5], [12.5, 7]), C.furDark);
  paint(body, (x, y) => inTriangle(x, y, [11.5, 7], [18.5, 1.5], [20.5, 10]), C.furDark);
  paint(body, (x, y) => inTriangle(x, y, [5, 9.5], [6.5, 4.5], [10.5, 7.5]), C.pink);
  paint(body, (x, y) => inTriangle(x, y, [13.5, 7.5], [17.5, 4.5], [19.5, 9.5]), C.pink);
  paint(body, (x, y) => inEllipse(x, y, 7.5, 15.5, 3.5, 2.6), C.fur);

  // Tail: darker grey plume. Its group is rotated from the base in CSS.
  paint(tail, (x, y) =>
    inCircle(x, y, 35, 22, 2.2) || inCircle(x, y, 37.5, 17.5, 2) ||
    inCircle(x, y, 37, 12.5, 1.9) || inCircle(x, y, 35.5, 8.5, 1.8), C.furDark);

  // Party hat: sits on the crown, shown only when data-party="on".
  const hatTri = (x, y) => inTriangle(x, y, [8, 5.5], [16, 5.5], [12, -3.5]);
  paint(hat, hatTri, C.hatPink);
  paint(hat, (x, y) => hatTri(x, y) && y > 0 && y < 3, C.hatCyan);
  paint(hat, (x, y) => inCircle(x, y, 12, -4, 1.1), C.hatYellow);

  const bodyOutline = outlineOf(body, [tail]);
  const tailOutline = outlineOf(tail, [body]);
  const hatOutline = outlineOf(hat, [body]);

  const whiskers = newGrid();
  dots(whiskers, [[0, 14], [1, 14], [2, 14], [0, 16], [1, 16], [2, 16]], C.whisker);

  // Faces: one <g> per mood; CSS shows the one matching data-mood.
  const eyes = [[8, 11], [15, 11]];
  const oval = (ex, ey, rx, ry) => (x, y) => inEllipse(x, y, ex, ey, rx, ry);

  const normal = newGrid();
  for (const [ex, ey] of eyes) {
    paint(normal, oval(ex, ey, 1.9, 2.3), C.eye);
    paint(normal, oval(ex + 0.3, ey + 0.4, 0.9, 1.5), C.pupil);
    dots(normal, [[ex - 1, ey - 2]], C.shine);
  }
  dots(normal, [[6, 14], [7, 14]], C.nose);
  dots(normal, [[6, 16], [8, 16], [7, 17]], C.outline);

  const hungry = newGrid();
  for (const [ex, ey] of eyes) {
    paint(hungry, oval(ex, ey, 1.9, 2.3), C.eye);
    paint(hungry, oval(ex + 0.3, ey + 0.6, 0.9, 1.2), C.pupil);
    paint(hungry, (x, y) => oval(ex, ey, 1.9, 2.3)(x, y) && y < ey, C.furDark); // heavy lids
  }
  paint(hungry, (x, y) => inEllipse(x, y, 7.5, 17.5, 1.2, 1.2), C.mouth);

  const pooping = newGrid();
  for (const [ex, ey] of eyes) {
    paint(pooping, oval(ex, ey, 2.4, 2.8), C.eye);
    paint(pooping, oval(ex, ey + 0.2, 0.8, 0.8), C.pupil);
    dots(pooping, [[ex - 1, ey - 2]], C.shine);
  }
  paint(pooping, (x, y) => inEllipse(x, y, 7.5, 17.5, 1.5, 1.5), C.mouth);
  paint(pooping, (x, y) => inCircle(x, y, 18.5, 9, 0.9), C.tear);

  $("cat-svg").innerHTML =
    `<g class="cat-tail">${toRects(merge(tailOutline, tail))}</g>` +
    `<g class="cat-base">${toRects(merge(bodyOutline, body, whiskers))}</g>` +
    `<g class="face-normal">${toRects(normal)}</g>` +
    `<g class="face-hungry">${toRects(hungry)}</g>` +
    `<g class="face-pooping">${toRects(pooping)}</g>` +
    `<g class="party-hat">${toRects(merge(hatOutline, hat))}</g>`;
}
buildCat();

// ---- Footer tool icons ------------------------------------------------------
// Same pixel look as the cat: shapes sampled on a 16x16 grid, outlined, emitted as crisp rects.
const ICON_N = 16;
const ICON_COLORS = { outline: "#14062e", fill: "#fffbea", accent: "#ffe14d", blue: "#5ec8ff", salmon: "#ff8a5c", paleSalmon: "#ffd1b8", pink: "#ff8fb8", red: "#ff4d6d", amber: "#e0a85a", orange: "#ff9b5e", brown: "#a85a2b", steel: "#b7bfd0", glass: "#bfe8ff" };
const newIconGrid = () => Array.from({ length: ICON_N }, () => new Array(ICON_N).fill(null));

function iconPaint(grid, test, color) {
  grid.forEach((row, y) => row.forEach((_, x) => { if (test(x + 0.5, y + 0.5)) row[x] = color; }));
}

// Empty cells touching the shape get the dark outline.
function iconOutline(grid) {
  const out = grid.map((row) => row.slice());
  grid.forEach((row, y) => row.forEach((c, x) => {
    if (c) return;
    const touches = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => grid[y + dy]?.[x + dx]);
    if (touches) out[y][x] = ICON_COLORS.outline;
  }));
  return out;
}

function iconSvg(grid) {
  let rects = "";
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const color = row[x];
      if (!color) { x++; continue; }
      let w = 1;
      while (x + w < row.length && row[x + w] === color) w++;
      rects += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${color}"/>`;
      x += w;
    }
  });
  return `<svg viewBox="0 0 ${ICON_N} ${ICON_N}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}

const ICON_DRAW = {
  feed(g) { // fish
    iconPaint(g, (x, y) => inEllipse(x, y, 7, 8, 5, 3.5), ICON_COLORS.fill);
    iconPaint(g, (x, y) => inTriangle(x, y, [11, 8], [15, 4], [15, 12]), ICON_COLORS.accent);
    iconPaint(g, (x, y) => inCircle(x, y, 4.5, 7.5, 0.6), ICON_COLORS.outline);
  },
  groom(g) { // brush
    iconPaint(g, (x, y) => inBox(x, y, 2, 2, 13, 7), ICON_COLORS.fill);
    iconPaint(g, (x, y) => y > 5 && y < 7 && Math.floor(x) % 2 === 1 && inBox(x, y, 2, 2, 13, 7), ICON_COLORS.outline);
    iconPaint(g, (x, y) => inBox(x, y, 6, 8, 9, 14), ICON_COLORS.accent);
  },
  decline(g) { // trash can
    iconPaint(g, (x, y) => inBox(x, y, 2, 2, 13, 3.9), ICON_COLORS.fill);
    iconPaint(g, (x, y) => inBox(x, y, 6, 0, 9, 1.9), ICON_COLORS.fill);
    iconPaint(g, (x, y) => inBox(x, y, 4, 4.5, 11, 13.9), ICON_COLORS.fill);
    iconPaint(g, (x, y) => (x === 6.5 || x === 8.5) && y > 6 && y < 12, ICON_COLORS.outline);
  },
  scoop(g) { // broom
    iconPaint(g, (x, y) => inBox(x, y, 7, 0, 9, 8), ICON_COLORS.fill);
    iconPaint(g, (x, y) => inTriangle(x, y, [3, 8], [13, 8], [11, 14]) || inTriangle(x, y, [3, 8], [11, 14], [5, 14]), ICON_COLORS.accent);
    iconPaint(g, (x, y) => (x === 6.5 || x === 9.5) && y > 9 && y < 14, ICON_COLORS.outline);
  },
  tuna(g) { // blue fish
    iconPaint(g, (x, y) => inEllipse(x, y, 7, 8, 5, 3.5), ICON_COLORS.blue);
    iconPaint(g, (x, y) => inTriangle(x, y, [11, 8], [15, 4], [15, 12]), ICON_COLORS.blue);
    iconPaint(g, (x, y) => inEllipse(x, y, 6, 9.5, 3.5, 1.2), ICON_COLORS.fill);
    iconPaint(g, (x, y) => inCircle(x, y, 4.5, 7.5, 0.6), ICON_COLORS.outline);
  },
  salmon(g) { // nigiri: rice block under a salmon slab
    iconPaint(g, (x, y) => inBox(x, y, 2, 8, 14, 13), ICON_COLORS.fill);
    iconPaint(g, (x, y) => inBox(x, y, 1, 4, 15, 8), ICON_COLORS.salmon);
    iconPaint(g, (x, y) => (x === 6.5 || x === 10.5) && y > 4 && y < 8, ICON_COLORS.paleSalmon);
  },
  cake(g) { // birthday cake with candle
    iconPaint(g, (x, y) => inBox(x, y, 2, 6, 14, 13), ICON_COLORS.pink);
    iconPaint(g, (x, y) => inBox(x, y, 2, 4, 14, 6), ICON_COLORS.fill);
    iconPaint(g, (x, y) => inCircle(x, y, 5, 9, 0.8) || inCircle(x, y, 9, 11, 0.8) || inCircle(x, y, 12, 9, 0.8), ICON_COLORS.accent);
    iconPaint(g, (x, y) => inBox(x, y, 7, 2, 9, 4), ICON_COLORS.accent);
    iconPaint(g, (x, y) => inCircle(x, y, 8, 0.5, 1), ICON_COLORS.red);
  },
  jar(g) { // jam jar
    iconPaint(g, (x, y) => inBox(x, y, 4, 4, 12, 14), ICON_COLORS.glass);
    iconPaint(g, (x, y) => inBox(x, y, 5, 8, 11, 13), ICON_COLORS.orange);
    iconPaint(g, (x, y) => inBox(x, y, 4, 2, 12, 4), ICON_COLORS.brown);
  },
  tin(g) { // tin can
    iconPaint(g, (x, y) => inBox(x, y, 4, 3, 12, 14), ICON_COLORS.red);
    iconPaint(g, (x, y) => inBox(x, y, 4, 3, 12, 5), ICON_COLORS.steel);
    iconPaint(g, (x, y) => inBox(x, y, 4, 8, 12, 10), ICON_COLORS.fill);
  },
  salt(g) { // salt shaker
    iconPaint(g, (x, y) => inBox(x, y, 5, 6, 11, 15), ICON_COLORS.fill);
    iconPaint(g, (x, y) => inBox(x, y, 6, 3, 10, 6), ICON_COLORS.steel);
    iconPaint(g, (x, y) => inCircle(x, y, 8, 9, 0.8) || inCircle(x, y, 8, 12, 0.8), ICON_COLORS.outline);
  },
  honey(g) { // honey pot
    iconPaint(g, (x, y) => inBox(x, y, 3, 6, 13, 15), ICON_COLORS.amber);
    iconPaint(g, (x, y) => inBox(x, y, 2, 4, 14, 6), ICON_COLORS.brown);
    iconPaint(g, (x, y) => inBox(x, y, 5, 9, 11, 12), ICON_COLORS.fill);
  },
  sock(g) { // striped sock
    iconPaint(g, (x, y) => inBox(x, y, 4, 1, 9, 11), ICON_COLORS.blue);
    iconPaint(g, (x, y) => inBox(x, y, 4, 9, 13, 13), ICON_COLORS.blue);
    iconPaint(g, (x, y) => inBox(x, y, 4, 4, 9, 5), ICON_COLORS.accent);
  },
  duck(g) { // rubber duck
    iconPaint(g, (x, y) => inEllipse(x, y, 8, 10, 5, 3.5), ICON_COLORS.accent);
    iconPaint(g, (x, y) => inCircle(x, y, 5, 5.5, 2.8), ICON_COLORS.accent);
    iconPaint(g, (x, y) => inTriangle(x, y, [1, 5], [1, 7], [3.5, 6]), ICON_COLORS.orange);
    iconPaint(g, (x, y) => inCircle(x, y, 4.5, 4.5, 0.6), ICON_COLORS.outline);
  },
  lego(g) { // brick with two studs
    iconPaint(g, (x, y) => inBox(x, y, 3, 3, 5, 5), ICON_COLORS.red);
    iconPaint(g, (x, y) => inBox(x, y, 8, 3, 10, 5), ICON_COLORS.red);
    iconPaint(g, (x, y) => inBox(x, y, 2, 5, 13, 12), ICON_COLORS.red);
    iconPaint(g, (x, y) => inBox(x, y, 3, 6, 4, 7), ICON_COLORS.fill);
  },
};

const ICON_SVG = Object.fromEntries(Object.entries(ICON_DRAW).map(([name, draw]) => {
  const g = newIconGrid();
  draw(g);
  return [name, iconSvg(iconOutline(g))];
}));
document.querySelectorAll("[data-icon]").forEach((node) => { node.innerHTML = ICON_SVG[node.dataset.icon]; });
requestAnimationFrame(frame);
