// audio.js — tiny WebAudio chiptune engine. All sound is synthesized, so there
// are no audio assets to ship. One looping theme per room + one-shot SFX.

let ctx = null;
let master = null;
let muted = false;
let musicTimer = null;
let curTheme = null;
let step = 0;
let seq = null;

// note name -> frequency (A4 = 440)
const A4 = 440;
const NOTE = {};
(function build() {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  for (let oct = 1; oct <= 6; oct++) {
    names.forEach((n, i) => {
      const midi = (oct + 1) * 12 + i;
      NOTE[n + oct] = A4 * Math.pow(2, (midi - 69) / 12);
    });
  }
})();

export function initAudio() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  } catch (e) {
    ctx = null;
  }
}

export function resumeAudio() {
  if (ctx && ctx.state === "suspended") ctx.resume();
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.5;
  return muted;
}
export function toggleMute() { return setMuted(!muted); }
export function isMuted() { return muted; }

// low-level voice
function tone(freq, t0, dur, type = "square", vol = 0.2, glideTo = null) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

function noise(t0, dur, vol = 0.15) {
  if (!ctx) return;
  const n = ctx.createBufferSource();
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  n.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = vol;
  const f = ctx.createBiquadFilter();
  f.type = "highpass"; f.frequency.value = 800;
  n.connect(f); f.connect(g); g.connect(master);
  n.start(t0); n.stop(t0 + dur);
}

/* --------------------------- one-shot SFX --------------------------- */
export function sfx(name) {
  if (!ctx) return;
  resumeAudio();
  const t = ctx.currentTime;
  switch (name) {
    case "select": tone(NOTE["E5"], t, 0.06, "square", 0.18); break;
    case "verb":   tone(NOTE["A4"], t, 0.05, "square", 0.14); break;
    case "walk":   tone(NOTE["C3"], t, 0.04, "triangle", 0.10); break;
    case "pickup": tone(NOTE["C5"], t, 0.07, "square", 0.2); tone(NOTE["G5"], t + 0.07, 0.1, "square", 0.2); break;
    case "error":  tone(NOTE["A3"], t, 0.12, "sawtooth", 0.16, NOTE["E3"]); break;
    case "door":   noise(t, 0.18, 0.12); tone(NOTE["C3"], t, 0.2, "triangle", 0.12, NOTE["C2"]); break;
    case "unlock": tone(NOTE["G4"], t, 0.08, "square", 0.18); tone(NOTE["C5"], t + 0.08, 0.08, "square", 0.18); tone(NOTE["E5"], t + 0.16, 0.14, "square", 0.18); break;
    case "talk":   tone(NOTE["D4"], t, 0.04, "square", 0.10); break;
    case "win":    ["C5","E5","G5","C6","E6"].forEach((n,i)=>tone(NOTE[n], t+i*0.11, 0.18, "square", 0.2)); break;
    case "bug":    tone(NOTE["C2"], t, 0.3, "sawtooth", 0.2, NOTE["G2"]); noise(t, 0.3, 0.08); break;
    case "ride":   tone(NOTE["C4"], t, 0.5, "triangle", 0.16, NOTE["C5"]); break;
    case "coin":   tone(NOTE["B5"], t, 0.05, "square", 0.2); tone(NOTE["E6"], t + 0.05, 0.18, "square", 0.2); break;
    case "tada":   ["C5","E5","G5","C6"].forEach((n,i)=>tone(NOTE[n], t+i*0.07, 0.22, "square", 0.2)); tone(NOTE["G5"], t, 0.4, "triangle", 0.1); break;
    case "rumble": { for (let i=0;i<3;i++) noise(t+i*0.12, 0.4, 0.14); tone(NOTE["C2"], t, 0.7, "sawtooth", 0.18, NOTE["C1"]); break; }
    case "band":   ["C3","G3","C4","E4","G4","E4","C4","G3"].forEach((n,i)=>tone(NOTE[n], t+i*0.09, 0.12, "triangle", 0.16)); ["C5","E5","G5"].forEach((n,i)=>tone(NOTE[n], t+0.2+i*0.12, 0.2, "square", 0.12)); break;
  }
}

/* ----------------------------- music -------------------------------- */
// Each theme: { bpm, bass:[...], lead:[...] }  notes as name or "-" (rest).
const THEMES = {
  office: {
    bpm: 132,
    lead: ["E5","-","G5","E5","A5","-","G5","E5","D5","-","E5","G5","C5","-","-","-",
           "E5","-","G5","E5","B5","-","A5","G5","A5","-","G5","E5","D5","-","-","-"],
    bass: ["A2","-","E2","-","A2","-","E2","-","F2","-","C2","-","G2","-","G2","-",
           "A2","-","E2","-","A2","-","E2","-","F2","-","G2","-","A2","-","E2","-"],
  },
  street: {
    bpm: 150,
    lead: ["C5","E5","G5","C6","B5","G5","E5","C5","D5","F5","A5","D6","C6","A5","F5","D5"],
    bass: ["C3","-","G2","-","A2","-","E2","-","F2","-","C3","-","G2","-","G2","-"],
  },
  escape: {
    bpm: 96,
    lead: ["A4","-","-","C5","-","B4","-","A4","E4","-","-","A4","-","G4","-","-",
           "F4","-","-","A4","-","G4","-","F4","E4","-","D4","-","E4","-","-","-"],
    bass: ["A1","-","A1","-","F1","-","F1","-","E1","-","E1","-","A1","-","E1","-"],
  },
  bar: {
    bpm: 116,
    lead: ["G4","B4","D5","G5","-","D5","B4","G4","C5","E5","G5","C6","-","G5","E5","C5",
           "A4","C5","E5","A5","-","E5","C5","A4","D5","-","B4","-","G4","-","-","-"],
    bass: ["G2","-","D2","-","G2","-","D2","-","C2","-","G2","-","A2","-","E2","-"],
  },
  title: {
    bpm: 108,
    lead: ["E5","-","E5","-","F5","G5","-","G5","F5","E5","D5","-","C5","-","-","-",
           "C5","-","E5","-","G5","-","C6","-","B5","-","-","-","G5","-","-","-"],
    bass: ["C2","-","-","-","G2","-","-","-","A2","-","-","-","F2","-","G2","-"],
  },
};

export function playMusic(theme) {
  if (!ctx) return;
  if (curTheme === theme && musicTimer) return;
  stopMusic();
  curTheme = theme;
  seq = THEMES[theme];
  if (!seq) return;
  step = 0;
  const stepDur = 60 / seq.bpm / 2; // eighth notes
  musicTimer = setInterval(() => {
    if (!ctx || muted) return;
    resumeAudio();
    const t = ctx.currentTime + 0.02;
    const li = step % seq.lead.length;
    const bi = step % seq.bass.length;
    const ln = seq.lead[li];
    const bn = seq.bass[bi];
    if (ln && ln !== "-" && NOTE[ln]) tone(NOTE[ln], t, stepDur * 0.9, "square", 0.07);
    if (bn && bn !== "-" && NOTE[bn]) tone(NOTE[bn], t, stepDur * 1.4, "triangle", 0.10);
    // soft hat on offbeats
    if (step % 2 === 1) noise(t, 0.02, 0.015);
    step++;
  }, stepDur * 1000);
}

export function stopMusic() {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  curTheme = null;
}
