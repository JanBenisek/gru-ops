/*
 * Miss Coco's Kitchen Chaos: procedural techno soundtrack and SFX (Web Audio API).
 * A 16th-note lookahead scheduler drives kick, sub-bass, claps and hats.
 * Finale morphs the loop into a techno "Happy Birthday" lead.
 */
const Sound = (() => {
  const TICK_MS = 25;
  const LOOKAHEAD_S = 0.12;
  const STEPS_PER_BAR = 16;

  // 4-bar loop Am - F - G - Em (bass roots in Hz)
  const TECHNO_ROOTS = [55.0, 43.65, 49.0, 41.2];
  // Birthday loop C - F - G - C
  const BIRTHDAY_ROOTS = [65.41, 87.31, 98.0, 65.41];
  const BASS_STEPS = [2, 6, 10, 14];
  const MUSIC_LEVEL = 0.9;

  // "Happy Birthday" as [MIDI note, length in beats]
  const BIRTHDAY = [
    [60, 1], [60, 1], [62, 2], [60, 2], [65, 2], [64, 4],
    [60, 1], [60, 1], [62, 2], [60, 2], [67, 2], [65, 4],
    [60, 1], [60, 1], [72, 2], [69, 2], [65, 2], [64, 2], [62, 4],
    [70, 1], [70, 1], [69, 2], [65, 2], [67, 2], [65, 4],
  ];

  let ctx = null;
  let master = null;
  let sfxBus = null;
  let noiseBuf = null;
  let musicBus = null;
  let musicOn = true;
  let musicGate = null; // persistent gain between music buses and master; toggled by setMusicOn
  let leadBus = null;

  let timerId = null;
  let running = false;
  let bpm = 128;
  let step = 0;
  let nextNoteTime = 0;
  let mode = "techno"; // "techno" | "birthday"
  let birthdayStart = 0;

  const leadEvents = new Map(); // start step -> { midi, steps }
  let leadLength = 0;

  function buildLead() {
    let s = 0;
    for (const [midi, beats] of BIRTHDAY) {
      leadEvents.set(s, { midi, steps: beats * 4 });
      s += beats * 4;
    }
    leadLength = s;
  }

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 4;
    comp.attack.value = 0.005;
    comp.release.value = 0.15;

    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(comp);
    comp.connect(ctx.destination);

    musicGate = ctx.createGain();
    musicGate.gain.value = musicOn ? 1 : 0;
    musicGate.connect(master);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.7;
    sfxBus.connect(master);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    buildLead();
  }

  // Fresh music bus per run: stop() unplugs it, so already-scheduled notes go silent instantly.
  function newMusicBus() {
    musicBus = ctx.createGain();
    musicBus.gain.value = MUSIC_LEVEL;
    musicBus.connect(musicGate);

    leadBus = ctx.createGain();
    leadBus.gain.value = 0;
    leadBus.connect(musicBus);
  }

  function scheduler() {
    const stepDur = 60 / bpm / 4;
    while (nextNoteTime < ctx.currentTime + LOOKAHEAD_S) {
      scheduleStep(step, nextNoteTime, stepDur);
      nextNoteTime += stepDur;
      step++;
    }
  }

  function scheduleStep(s, t, stepDur) {
    const within = s % STEPS_PER_BAR;
    const bar = Math.floor(s / STEPS_PER_BAR) % 4;
    const birthday = mode === "birthday";

    if (within % 4 === 0) kick(t);                       // four-on-the-floor
    if (within === 4 || within === 12) clap(t);          // backbeat
    if (within % 2 === 1) hat(t, 0.05);                  // 16th ghost ticks
    if (within % 4 === 2) hat(t, 0.16);                  // off-beat hats
    if (BASS_STEPS.includes(within)) {
      bass(t, (birthday ? BIRTHDAY_ROOTS : TECHNO_ROOTS)[bar], stepDur * 3);
    }

    if (birthday) {
      const ev = leadEvents.get((s - birthdayStart) % leadLength);
      if (ev) lead(t, ev.midi, ev.steps * stepDur);
    }
  }

  // ---------- Music voices ----------

  function kick(t) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(155, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.11);
    g.gain.setValueAtTime(0.95, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    o.connect(g);
    g.connect(musicBus);
    o.start(t);
    o.stop(t + 0.45);
  }

  function bass(t, freq, dur) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(musicBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // Filtered noise burst: hats, claps, scoop click.
  function noise(t, { type, freq, q = 1, dur, vol, dest }) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.02);
  }

  function hat(t, vol) {
    noise(t, { type: "highpass", freq: 8000, q: 0.7, dur: 0.045, vol, dest: musicBus });
  }

  function clap(t) {
    noise(t, { type: "bandpass", freq: 1400, q: 1.2, dur: 0.16, vol: 0.5, dest: musicBus });
  }

  // Dip the music bus briefly so a meow reads over the kick and bass.
  function duckMusic() {
    if (!musicBus) return;
    const g = musicBus.gain;
    const now = ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setTargetAtTime(MUSIC_LEVEL * 0.35, now, 0.02);
    g.setTargetAtTime(MUSIC_LEVEL, now + 0.25, 0.25);
  }

  // Birthday lead: detuned square pair through a lowpass.
  function lead(t, midi, dur) {
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2600;
    lp.Q.value = 1.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
    g.gain.setValueAtTime(0.5, t + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    lp.connect(g);
    g.connect(leadBus);
    for (const detune of [-7, 7]) {
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = f;
      o.detune.value = detune;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.02);
    }
  }

  // ---------- SFX (one-shots, not tied to the music bus) ----------

  function tone(f0, f1, dur, type, vol, delay = 0) {
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // Cat voice: real recordings (CC0, Joseph Sardin via BigSoundBank), loaded as HTML audio.
  // A clip that has not finished loading stays silent: there is no synth fallback.
  function loadClip(src) {
    const el = new Audio(src);
    el.preload = "auto";
    const clip = { el, ready: false };
    el.addEventListener("canplaythrough", () => { clip.ready = true; }, { once: true });
    el.addEventListener("error", () => { clip.ready = false; });
    return clip;
  }
  const PURR_CLIP = loadClip("sounds/purr.wav");
  const MEOW_CLIP = loadClip("sounds/meow.wav");

  function playClip(clip, volume) {
    if (!clip.ready) return;
    clip.el.currentTime = 0;
    clip.el.volume = volume;
    clip.el.play().catch(() => {});
  }

  const sfx = {
    success() {
      playClip(PURR_CLIP, 0.8);
    },
    miss() {
      tone(190, 60, 0.25, "square", 0.16);
    },
    wrong() {
      duckMusic();
      playClip(MEOW_CLIP, 1);
    },
    scoop() {
      noise(ctx.currentTime, { type: "bandpass", freq: 900, q: 1, dur: 0.05, vol: 0.35, dest: sfxBus });
    },
    poop() {
      tone(420, 110, 0.3, "sine", 0.35);
    },
  };

  // ---------- Public API ----------

  // Start the loop. Must be called from a user gesture (Start button) for autoplay rules.
  function start(startBpm) {
    init();
    if (ctx.state === "suspended") ctx.resume();
    stop();
    newMusicBus();
    bpm = startBpm;
    mode = "techno";
    step = 0;
    nextNoteTime = ctx.currentTime + 0.08;
    running = true;
    scheduler();
    timerId = setInterval(scheduler, TICK_MS);
  }

  // Abrupt cut: stop scheduling and unplug the music bus immediately.
  function stop() {
    running = false;
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    if (musicBus) {
      musicBus.disconnect();
      musicBus = null;
    }
  }

  function setBpm(v) {
    bpm = v;
  }

  // Finale: switch the loop to the birthday lead, bringing it up gradually.
  function morphToBirthday() {
    if (!running) return;
    mode = "birthday";
    birthdayStart = step;
    leadBus.gain.setTargetAtTime(0.4, ctx.currentTime, 0.35);
  }

  // Record-scratch: platter slam (swept bandpass noise) plus a falling sawtooth wow.
  function recordScratch() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(4000, t);
    bp.frequency.exponentialRampToValueAtTime(180, t + 0.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
    src.connect(bp);
    bp.connect(g);
    g.connect(sfxBus);
    src.start(t);
    src.stop(t + 0.8);
    tone(900, 35, 0.7, "sawtooth", 0.22);
  }

  // Music on/off: gates only the music bus, so SFX and the scheduler are unaffected.
  function setMusicOn(on) {
    musicOn = on;
    if (musicGate) musicGate.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.02);
  }

  return { start, stop, setBpm, morphToBirthday, recordScratch, sfx, setMusicOn };
})();
