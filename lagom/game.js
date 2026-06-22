// game.js — LAGOM's cozy day-loop engine. A small state machine (intro →
// morning → office → night → rollover) wrapped around the Greg model.
// Reuses the shared pixel renderer and chiptune audio; no SCUMM engine here.
import { rect, frame, sprite, px, speckle, mix } from "../js/pixel.js";
import { sfx, playMusic } from "../js/audio.js";
import { drawGreg, drawMonitor, drawPerson, drawDoor, drawCoffeeMachine, CAN, MUG, CLOCK } from "./art.js";

export const SCREEN_W = 320, SCREEN_H = 200;

/* ----------------------------------------------------- Greg tuning ---- */
const LAGOM_LO = 50, LAGOM_HI = 72;   // the thriving band ("just right")
const ROT_KILL = 100;                  // root-rot death threshold
const WILT_KILL_DAYS = 3;              // consecutive parched days = death
// accumulated "good days" -> growth stage (0..5)
const STAGE_AT = [0, 2, 5, 9, 14, 20];

function stageFor(growth) {
  let s = 0;
  for (let i = 0; i < STAGE_AT.length; i++) if (growth >= STAGE_AT[i]) s = i;
  return s;
}

/* ------------------------------------------------- daily modifiers ---- */
const MODIFIERS = [
  { id: "normal",   icon: "·",  name: "An ordinary Tuesday", note: "Nothing unusual. Greg approves of routine." },
  { id: "heatwave", icon: "*",  name: "Heatwave",            note: "It's roasting. Greg will drink twice as fast tonight." },
  { id: "fika",     icon: "o",  name: "Free fika",           note: "Kanelbullar in the kitchen. Morale is high." },
  { id: "rainy",    icon: "/",  name: "Rainy commute",       note: "Grey skies. Cosy desk weather, though." },
  { id: "bittan",   icon: "!",  name: "Bittan helped out",   note: "\"I watered Greg for you!\" ...uh oh. He may be soggy." },
];

/* ------------------------------------------------------- the state ---- */
export const G = {
  ctx: null, canvas: null, fontReady: true,
  scene: "title",            // title | intro | morning | commute | office | night | gameover
  t: 0, last: 0,
  mouse: { x: 160, y: 100, down: false },
  hotspots: [],              // [{x,y,w,h,fn,label}] rebuilt each render
  hover: null,
  card: null,                // {lines:[{who,text}], idx, onDone, bg}
  closeup: null,             // watering mini-game state
  toast: null,               // {text, until, color}
  fade: 1, fadeDir: -1, fadeCb: null,
  day: 1,
  best: 0,
  greg: null,
  modifier: null,
  flags: {},                 // per-day action flags (coffee, tickets, watered)
};

function freshGreg() {
  // Greg arrives as an established desk plant (he's outlived three PMs), so he
  // starts mid-growth; good care grows him toward bloom and mascot status.
  return { hydration: 60, growth: STAGE_AT[2], stage: 2, rot: 0, wiltDays: 0, alive: true };
}

/* ------------------------------------------------------------ boot --- */
export function boot(canvas) {
  G.canvas = canvas;
  G.ctx = canvas.getContext("2d");
  G.ctx.imageSmoothingEnabled = false;
  try { G.best = +localStorage.getItem("lagom_best") || 0; } catch (e) {}
  bindInput();
  requestAnimationFrame(loop);
}

export function setFontReady() { G.fontReady = true; }

// Called by main.js once the player presses START.
G.begin = function () {
  G.day = 1;
  G.greg = freshGreg();
  G.flags = {};
  G.player = { x: 244, y: 152, tx: 244, walking: false, facing: -1, anim: 0, pending: null, say: null, scale: 1.6 };
  startIntro();
};

/* -------------------------------------------------------- helpers ---- */
function fontPx(size) { return `${size}px PressStart2P, monospace`; }

function text(ctx, str, x, y, color, opts = {}) {
  ctx.font = fontPx(opts.size || 8);
  ctx.textBaseline = "top";
  ctx.textAlign = opts.align || "left";
  if (opts.shadow !== false) { ctx.fillStyle = "#000"; ctx.fillText(str, x + 1, y + 1); }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.textAlign = "left";
}
function measure(ctx, str, size = 8) { ctx.font = fontPx(size); return ctx.measureText(str).width; }
function wrap(ctx, str, maxW, size = 8) {
  ctx.font = fontPx(size);
  const words = str.split(" ");
  const lines = []; let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

let hintTimer = null;
export function flashHint(msg) {
  const h = document.getElementById("hint");
  if (!h) return;
  const orig = h.dataset.orig || h.textContent;
  h.dataset.orig = orig;
  h.textContent = msg.toUpperCase();
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => { h.textContent = orig; }, 1200);
}

function toast(textStr, color = "#e0c98f") {
  G.toast = { text: textStr, until: G.t + 2.4, color };
}

function fadeTo(cb) { G.fade = 0; G.fadeDir = 1; G.fadeCb = cb; }

// Show a dialogue/notification overlay. Uses the "card" scene so it actually
// renders (drawCard) and is dismissable by click / SPACE / ENTER.
function presentCard(card) { card.idx = card.idx || 0; G.card = card; G.scene = "card"; }

/* ---------------------------------------------- the walkable player -- */
// Floor geometry per room: the band the avatar can walk along.
const FLOOR = {
  morning: { footY: 152, minX: 30, maxX: 302 },
  night:   { footY: 152, minX: 30, maxX: 302 },
  office:  { footY: 150, minX: 30, maxX: 286 },
};
const WALK_SPEED = 92; // px/sec
const PLAYER = { skin: "#f0bd92", hair: "#5a3a1a", shirt: "#00a98f", pants: "#384a66" };

function spawnPlayer(x, facing) {
  const f = FLOOR[G.scene] || FLOOR.morning;
  G.player.x = Math.max(f.minX, Math.min(f.maxX, x));
  G.player.tx = G.player.x;
  G.player.y = f.footY;
  G.player.facing = facing || -1;
  G.player.walking = false;
  G.player.pending = null;
}

// A speech line over the avatar's head — the point-and-click voice.
function say(textStr, color = "#eafff0") { G.player.say = { text: textStr, until: G.t + 2.8, color }; }

function walkTo(x, pending) {
  const f = FLOOR[G.scene] || FLOOR.morning;
  G.player.tx = Math.max(f.minX, Math.min(f.maxX, x));
  G.player.pending = pending || null;
  G.player.walking = Math.abs(G.player.tx - G.player.x) > 1;
  if (!G.player.walking && pending) { const a = pending.act; G.player.pending = null; if (a) a(); }
  if (G.player.walking) G.player.facing = G.player.tx < G.player.x ? -1 : 1;
}

function goWork() { fadeTo(() => commute("Cycling to the office...", goOffice)); }
function goHome() { fadeTo(() => commute("Heading home for the evening...", goNight)); }
function clearTickets() {
  sfx("page"); G.flags.tickets = (G.flags.tickets || 0) + 1;
  say(["Ticket closed. Nice.", "Another one down.", "Inbox zero is a myth, but still."][Math.min(2, G.flags.tickets - 1)]);
}

// Interactable objects per scene: { id,x,y,w,h (hotspot), walkX, name, verb, act }
function objectsFor() {
  const g = G.greg;
  switch (G.scene) {
    case "morning": return [
      { id: "window", x: 22, y: 16, w: 86, h: 46, walkX: 70, name: "window", verb: "Look out of", act: () => say(weatherLine()) },
      { id: "herb", x: 28, y: 82, w: 34, h: 30, walkX: 70, name: "windowsill sprout", verb: "Look at", act: () => say("My own little sprout. Greg calls it 'the intern'.") },
      { id: "coffee", x: 124, y: 82, w: 64, h: 50, walkX: 152, name: "coffee machine", verb: "Make coffee", act: () => { sfx("sip"); G.flags.coffee = true; say("Mmm. Monday fuel."); } },
      { id: "bed", x: 200, y: 90, w: 92, h: 40, walkX: 244, name: "bed", verb: "Look at", act: () => say("Already made. I'm a functioning adult. Mostly.") },
      { id: "door", x: 288, y: 56, w: 30, h: 76, walkX: 278, name: "front door", verb: "Go to work", act: goWork },
    ];
    case "night": return [
      { id: "window", x: 22, y: 16, w: 86, h: 46, walkX: 70, name: "window", verb: "Look out of", act: () => say("Quiet street. A fox, maybe. Stockholm can keep its noise.") },
      { id: "herb", x: 28, y: 82, w: 34, h: 30, walkX: 70, name: "windowsill sprout", verb: "Look at", act: () => say("Night-night, little intern.") },
      { id: "coffee", x: 124, y: 82, w: 64, h: 50, walkX: 152, name: "coffee machine", verb: "Make tea", act: () => { sfx("sip"); say("Decaf. I'm not an animal."); } },
      { id: "bed", x: 200, y: 90, w: 92, h: 40, walkX: 244, name: "bed", verb: "Sleep", act: startSleep },
      { id: "door", x: 288, y: 56, w: 30, h: 76, walkX: 278, name: "front door", verb: "Look at", act: () => say("It's late. Bed's calling, not the office.") },
    ];
    case "office": return [
      { id: "door", x: 8, y: 56, w: 34, h: 74, walkX: 52, name: "office door", verb: "Head home", act: goHome },
      { id: "monitor", x: 78, y: 88, w: 62, h: 40, walkX: 110, name: "your computer", verb: "Clear tickets", act: clearTickets },
      { id: "mug", x: 148, y: 98, w: 16, h: 18, walkX: 150, name: "coffee mug", verb: "Look at", act: () => say("Cold. The eternal developer beverage.") },
      { id: "greg", x: 174, y: 78, w: 46, h: 52, walkX: 166, name: "Greg", verb: "Tend", act: openWatering, look: gregLook },
      { id: "window", x: 150, y: 14, w: 150, h: 50, walkX: 250, name: "window", verb: "Look out of", act: () => say("Linkoping rooftops. Someone's pigeon is judging me.") },
    ];
    default: return [];
  }
}
function gregLook() { say(moodLine(G.greg), "#8fe39b"); }
function weatherLine() {
  if (!G.modifier) return "Another grey-gold Linkoping morning.";
  return ({ heatwave: "Sun's blazing. Greg's going to be thirsty today.", rainy: "Rain on the glass. Cosy.", fika: "I can almost smell the kanelbullar from here.", bittan: "Bittan's bike is already at the office. Oh no.", normal: "A perfectly ordinary, perfectly nice morning." })[G.modifier.id] || "Morning.";
}

/* ------------------------------------------------- Greg appearance --- */
function gregMood(g, sleeping) {
  if (!g.alive) return "dead";
  if (sleeping) return "sleep";
  if (g.hydration < 12) return "wilt";
  if (g.hydration > ROT_KILL - 8 || g.rot > 55) return "rot";
  if (g.hydration < 30) return "thirsty";
  if (g.hydration > 88) return "thirsty"; // soggy still reads uneasy
  if (g.hydration >= LAGOM_LO && g.hydration <= LAGOM_HI) return "thriving";
  return "content";
}
function gregDroop(g) {
  if (!g.alive) return 1;
  const dry = Math.max(0, (30 - g.hydration) / 30);
  const wet = Math.max(0, (g.hydration - 88) / 12) * 0.6;
  return Math.min(1, dry + wet);
}
function moodLine(g) {
  const m = gregMood(g, false);
  return ({
    thriving: ["Aaah. This is lagom.", "Couldn't be better. Don't change a thing.", "I feel positively photosynthetic."],
    content:  ["I'm fine. Could be more lagom, but fine.", "Adequate. Lagom-adjacent.", "We're getting there."],
    thirsty:  ["...a little parched, between us.", "Is it me, or is it the Sahara in here?", "I'd kill for a drink. Figuratively."],
    wilt:     ["I don't feel so good...", "Tell my succulents I love them.", "*dramatic droop*"],
    rot:      ["Bleurgh. I'm waterlogged.", "My roots are doing a backstroke.", "Too much. TOO MUCH."],
    dead:     ["", "", ""],
  }[m])[Math.floor(G.t) % 3];
}

/* ---------------------------------------------------------- intro ---- */
function startIntro() {
  playMusic("home");
  G.scene = "intro";
  G.card = {
    bg: drawApartment,
    bgOpts: { night: false, light: 0.9 },
    lines: [
      { who: "", text: "TEAMTAILOR LINKOPING — your first week." },
      { who: "A departing colleague", text: "Right, I'm off. One last thing — this is Greg." },
      { who: "A departing colleague", text: "Greg has outlived two reorgs, a rebrand, and three product managers." },
      { who: "A departing colleague", text: "He is the soul of this office. Water him LAGOM — not too much, not too little." },
      { who: "A departing colleague", text: "Whatever you do... don't be the one who kills Greg." },
      { who: "Greg", text: "Oh good. A new one. Try to last longer than the last guy." },
    ],
    idx: 0,
    onDone: () => goMorning(true),
  };
}

/* ------------------------------------------------ scene transitions -- */
function goMorning(first) {
  // pick today's modifier (first day is always 'normal')
  G.modifier = first ? MODIFIERS[0] : MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)];
  G.flags = {};
  // Bittan's "help" lands before you arrive.
  if (G.modifier.id === "bittan") {
    G.greg.hydration = Math.min(105, G.greg.hydration + 28);
  }
  playMusic("home");
  // fade to black, then reveal the day's modifier as a phone notification;
  // dismissing it drops you into the playable morning.
  fadeTo(() => presentCard({
    bg: drawApartment, bgOpts: { night: false },
    lines: [{ who: "[ Your phone — Day " + G.day + " ]", text: G.modifier.icon + "  " + G.modifier.name + ". " + G.modifier.note }],
    onDone: () => { G.scene = "morning"; spawnPlayer(244, -1); },
  }));
}

function goOffice() {
  G.scene = "office";
  playMusic("lagom_office");
  spawnPlayer(56, 1);   // arriving through the office door
}

function goNight() {
  G.scene = "night";
  playMusic("home");
  spawnPlayer(278, -1); // home through the front door
}

// The heart of the loop: sleep, drain, grow, and the death checks.
function sleepAndRollover() {
  const g = G.greg;
  let drain = 14 + Math.min(G.day, 22) * 1.1;
  if (G.modifier && G.modifier.id === "heatwave") drain *= 1.7;

  // growth: a day spent in the lagom band makes Greg grow
  if (g.hydration >= LAGOM_LO && g.hydration <= LAGOM_HI) g.growth += 1;

  // rot accumulates while soggy, heals while comfortable
  if (g.hydration > 88) g.rot += 22 + (g.hydration - 88);
  else if (g.hydration <= LAGOM_HI) g.rot = Math.max(0, g.rot - 30);

  // overnight drink
  g.hydration = Math.max(0, g.hydration - drain);

  // parched-days counter
  if (g.hydration < 12) g.wiltDays += 1; else g.wiltDays = 0;

  // ---- death checks ----
  let cause = null;
  if (g.hydration <= 0) cause = "thirst";
  else if (g.wiltDays >= WILT_KILL_DAYS) cause = "wilt";
  else if (g.rot >= ROT_KILL) cause = "rot";

  if (cause) { g.alive = false; return die(cause); }

  // survived the night — bank the day, maybe grow a stage
  const before = g.stage;
  g.stage = stageFor(g.growth);
  G.day += 1;
  if (G.day - 1 > G.best) { G.best = G.day - 1; try { localStorage.setItem("lagom_best", G.best); } catch (e) {} }

  if (g.stage > before) return milestone(g.stage, () => goMorning(false));
  goMorning(false);
}

function milestone(stage, done) {
  sfx(stage >= 4 ? "bloom" : "grow");
  if (stage >= 4) G.greg.bloom = true;
  const beats = {
    1: { who: "Greg", text: "A new leaf. I'm basically thriving. Don't let it go to your head." },
    2: { who: "Greg", text: "Look at me — positively bushy. The office is starting to notice." },
    3: { who: "Bittan", text: "Greg looks AMAZING. You're a natural! (I won't touch him, promise.)" },
    4: { who: "Greg", text: "I... I bloomed. THE BOSS TOOK A PHOTO. This is the best day of my stem." },
    5: { who: "The team", text: "Greg is officially the office mascot. There's a tiny plaque. You did this." },
  };
  G.card = {
    bg: (ctx) => { drawOffice(ctx); }, bgOpts: {},
    lines: [{ who: "* Greg grew! *", text: "" }, beats[stage] || beats[5]],
    idx: 0, onDone: done, celebrate: true,
  };
  G.scene = "card";
}

function die(cause) {
  sfx("wilt");
  playMusic("funeral");
  const survived = G.day - 1;
  const lines = {
    thirst: "Greg ran dry. You meant to water him. You really did.",
    wilt:   "Greg wilted, day after day, waiting for a drink that came too late.",
    rot:    "Greg drowned. Loved a little too much, a little too often.",
  };
  G.scene = "gameover";
  G.card = {
    funeral: true,
    survived,
    cause: lines[cause] || "Greg is gone.",
    onDone: () => { G.greg = freshGreg(); G.day = 1; startIntro(); },
  };
}

/* --------------------------------------------- watering close-up ----- */
function openWatering() {
  G.closeup = {
    level: G.greg.hydration,    // moisture rises as you pour; can't go back down
    pouring: false,
    committed: false,
  };
  sfx("page");
}

function commitWatering() {
  const c = G.closeup;
  G.greg.hydration = Math.min(105, Math.round(c.level));
  G.flags.watered = true;
  const h = G.greg.hydration;
  if (h >= LAGOM_LO && h <= LAGOM_HI) { sfx("grow"); toast("Aaah. Lagom.", "#8fe39b"); }
  else if (h > 88) { sfx("drip"); toast("*glug* ...that's a lot of water.", "#9fe0ff"); }
  else if (h < 30) { toast("Barely a sip. Still parched.", "#e0c98f"); }
  else toast("Hmm. Could be more lagom.", "#e0c98f");
  G.closeup = null;
}

function updateWatering(dt) {
  const c = G.closeup;
  if (!c) return;
  if (c.pouring && c.level < 110) {
    c.level += 34 * dt;
    if (Math.floor(G.t * 12) % 2 === 0) sfx("drip");
  }
}

function drawWatering(ctx) {
  // dim the office behind
  ctx.fillStyle = "rgba(6,10,8,0.78)";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  const c = G.closeup;

  // big Greg, centre-left
  const droop = Math.min(1, Math.max(0, (30 - c.level) / 30) + Math.max(0, (c.level - 88) / 12) * 0.6);
  let mood = "content";
  if (c.level < 30) mood = "thirsty"; else if (c.level > 88) mood = "rot";
  else if (c.level >= LAGOM_LO && c.level <= LAGOM_HI) mood = "thriving";
  drawGreg(ctx, 108, 168, { scale: 3.4, stage: G.greg.stage, droop, mood, t: G.t, bloom: G.greg.bloom });

  // watering can above, tilts while pouring
  const canX = 150, canY = c.pouring ? 36 : 44;
  sprite(ctx, CAN, canX, canY, { scale: 2.4, flip: true });
  if (c.pouring) {
    for (let i = 0; i < 10; i++) {
      const yy = canY + 30 + i * 8 + (G.t * 120 % 8);
      if (yy < 150) px(ctx, canX + 8 + Math.sin((yy + G.t * 40) * 0.3) * 1.5, yy, "#9fe0ff");
    }
  }

  // moisture gauge, right side
  const gx = 244, gy = 40, gw = 22, gh = 120;
  frame(ctx, gx - 2, gy - 2, gw + 4, gh + 4, "#0a120a");
  rect(ctx, gx, gy, gw, gh, "#14201a");
  const yFor = (v) => gy + gh - (Math.min(100, v) / 100) * gh;
  // current water fill (drawn first, behind the band markers)
  const lv = Math.min(105, c.level);
  rect(ctx, gx, yFor(lv), gw, gy + gh - yFor(lv), "#3fa0d8");
  rect(ctx, gx, yFor(lv), gw, 1, "#9fe0ff");
  // soggy danger zone (hatched red edges, always visible)
  for (let y = yFor(100); y < yFor(88); y += 2) rect(ctx, gx, y | 0, gw, 1, "rgba(200,70,70,0.45)");
  rect(ctx, gx, yFor(88), gw, 1, "#e06f6f");
  // lagom band — bright edges on top so the target is always readable
  for (let y = yFor(LAGOM_HI); y < yFor(LAGOM_LO); y += 2) rect(ctx, gx, y | 0, gw, 1, "rgba(60,160,80,0.40)");
  rect(ctx, gx, yFor(LAGOM_HI), gw, 1, "#8fe39b");
  rect(ctx, gx, yFor(LAGOM_LO), gw, 1, "#8fe39b");
  text(ctx, "SOIL", gx - 1, gy - 12, "#9aa89a", { size: 6 });
  text(ctx, "LAGOM", gx + gw + 4, yFor((LAGOM_LO + LAGOM_HI) / 2) - 3, "#8fe39b", { size: 6 });

  // live read-out
  let read = "Bone dry.";
  if (lv >= LAGOM_LO && lv <= LAGOM_HI) read = "Just right. Lagom.";
  else if (lv > LAGOM_HI && lv <= 88) read = "A touch much...";
  else if (lv > 88) read = "Too much! Stop!";
  else if (lv >= 30) read = "Getting there...";
  text(ctx, read, 160, 168, lv > 88 ? "#ff9a9a" : (lv >= LAGOM_LO && lv <= LAGOM_HI ? "#8fe39b" : "#e0c98f"),
       { size: 7, align: "center" });

  // instructions / done button
  text(ctx, "HOLD to pour  (you can't pour it back out)", 160, 14, "#9aa89a", { size: 7, align: "center" });
  const bw = 70, bh = 18, bx = 160 - bw / 2, by = 178;
  const hot = hit(bx, by, bw, bh);
  rect(ctx, bx, by, bw, bh, hot ? "#8fe39b" : "#2c8540");
  frame(ctx, bx, by, bw, bh, "#0a120a");
  text(ctx, "DONE", 160, by + 5, hot ? "#0a120a" : "#eafff0", { size: 8, align: "center" });
  G.hotspots.push({ x: bx, y: by, w: bw, h: bh, fn: commitWatering, btn: true });
}

/* -------------------------------------------------- scene painters --- */
function drawSky(ctx, x, y, w, h, night) {
  if (night) {
    for (let i = 0; i < h; i++) rect(ctx, x, y + i, w, 1, mix("#1a2240", "#0a0e1c", i / h));
    // stars
    let s = 7;
    for (let i = 0; i < 22; i++) { s = (s * 9301 + 49297) % 233280; const sx = x + (s % w); s = (s * 9301 + 49297) % 233280; const sy = y + (s % (h * 0.7)); px(ctx, sx | 0, sy | 0, "#cfd8ff"); }
    rect(ctx, x + w - 22, y + 8, 9, 9, "#e8e8d0"); // moon
    rect(ctx, x + w - 24, y + 10, 9, 9, "#1a2240");
  } else {
    for (let i = 0; i < h; i++) rect(ctx, x, y + i, w, 1, mix("#bfe6f2", "#eaf4dd", i / h));
    rect(ctx, x + w - 24, y + 6, 12, 12, "#f7e08a"); // sun
    rect(ctx, x + w - 26, y + 8, 12, 12, "#ffe9a0");
  }
}

function drawApartment(ctx, o = {}) {
  const night = !!o.night;
  // walls
  rect(ctx, 0, 0, SCREEN_W, 132, night ? "#2a2740" : "#d8c9a8");
  rect(ctx, 0, 0, SCREEN_W, 132, night ? "#26233a" : "#d8c9a8");
  speckle(ctx, 0, 0, SCREEN_W, 132, night ? "#201d30" : "#cdbf9c", 0.05, 4);
  // floor
  rect(ctx, 0, 132, SCREEN_W, 36, night ? "#2a2418" : "#8a6a44");
  for (let x = -10; x < SCREEN_W; x += 18) rect(ctx, x, 132, 1, 36, night ? "#221d12" : "#6f5436");
  // window with sky
  frame(ctx, 22, 16, 86, 64, "#5a4a30");
  drawSky(ctx, 24, 18, 82, 60, night);
  rect(ctx, 64, 16, 4, 64, "#5a4a30");
  rect(ctx, 22, 46, 86, 4, "#5a4a30");
  // windowsill herb (your own little plant — flavour)
  drawGreg(ctx, 44, 96, { scale: 0.75, stage: 0, mood: "content", t: G.t * 0.7 });
  // kitchen counter + coffee machine (centre)
  rect(ctx, 124, 104, 64, 28, "#6a5238");
  rect(ctx, 124, 104, 64, 4, "#7a6244");
  drawCoffeeMachine(ctx, 134, 84, 1.0);
  // bed (right)
  rect(ctx, 200, 98, 92, 30, "#6a4326");
  rect(ctx, 200, 92, 28, 12, night ? "#3a4a6a" : "#9fb8d8"); // pillow
  rect(ctx, 214, 102, 78, 22, night ? "#3a4a6a" : "#c98aa8"); // duvet
  // door (far right wall — to the outside world)
  drawDoor(ctx, 290, 58, 26, 74);
  if (!night) { // morning sun shaft
    ctx.fillStyle = "rgba(255,240,180,0.10)";
    ctx.fillRect(24, 18, 82, 114);
  }
}

function drawOffice(ctx, o = {}) {
  // wall
  rect(ctx, 0, 0, SCREEN_W, 128, "#cfd6cf");
  speckle(ctx, 0, 0, SCREEN_W, 128, "#c2cac2", 0.05, 9);
  // big window with daylight + Linköping rooftops
  frame(ctx, 150, 14, 150, 64, "#9aa39a");
  drawSky(ctx, 152, 16, 146, 60, false);
  for (let x = 152; x < 298; x += 22) rect(ctx, x, 58, 18, 18, "#7a8a9a");
  rect(ctx, 150, 44, 150, 3, "#9aa39a");
  // Teamtailor teal accent stripe
  rect(ctx, 0, 0, SCREEN_W, 6, "#00a98f");
  text(ctx, "TEAMTAILOR", 60, 11, "#1f8f7e", { size: 7 });
  // floor
  rect(ctx, 0, 128, SCREEN_W, 40, "#9a8a6a");
  speckle(ctx, 0, 128, SCREEN_W, 40, "#8a7a5a", 0.06, 3);
  // exit door (left wall — home)
  drawDoor(ctx, 8, 56, 34, 74, { color: "#6a7280" });
  // your desk
  rect(ctx, 60, 118, 168, 10, "#7a5a36");
  rect(ctx, 66, 128, 8, 30, "#5f3c1d");
  rect(ctx, 214, 128, 8, 30, "#5f3c1d");
  // monitor + keyboard
  drawMonitor(ctx, 78, 90, 1.6, true);
  rect(ctx, 96, 116, 40, 6, "#c8c8d0");
  // coffee mug
  sprite(ctx, MUG, 150, 106, { scale: 1.6 });
  // Greg, proud on the desk
  drawGreg(ctx, 196, 118, { scale: 1.5, stage: G.greg.stage, droop: gregDroop(G.greg), mood: gregMood(G.greg, false), t: G.t, bloom: G.greg.bloom });
}

function drawNightSleep(ctx, k) {
  drawApartment(ctx, { night: true });
  // a little "Zzz" rising
  if (k > 0.2) {
    text(ctx, "z", 248, 84 - k * 14, "#cfd8ff", { size: 8 });
    text(ctx, "Z", 256, 78 - k * 22, "#cfd8ff", { size: 10 });
  }
  ctx.fillStyle = `rgba(4,6,12,${0.55 * k})`;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
}

/* ------------------------------------------------------- HUD + UI ---- */
function drawHUD(ctx) {
  rect(ctx, 0, 0, SCREEN_W, 0, "#000"); // (top stripe drawn per-scene)
  // bottom status bar
  rect(ctx, 0, SCREEN_H - 14, SCREEN_W, 14, "#0c140d");
  rect(ctx, 0, SCREEN_H - 15, SCREEN_W, 1, "#2c8540");
  text(ctx, "DAY " + G.day, 6, SCREEN_H - 11, "#eafff0", { size: 7 });
  text(ctx, "BEST " + G.best, 70, SCREEN_H - 11, "#9aa89a", { size: 7 });
  // Greg status
  const m = gregMood(G.greg, false);
  const col = ({ thriving: "#8fe39b", content: "#cfe0cf", thirsty: "#e0c98f", wilt: "#e0a04a", rot: "#c98aa8", dead: "#9a6a6a" })[m];
  text(ctx, "GREG: " + m.toUpperCase(), 150, SCREEN_H - 11, col, { size: 7 });
  // hydration pips
  const pips = Math.round(G.greg.hydration / 10);
  for (let i = 0; i < 10; i++) rect(ctx, 268 + i * 5, SCREEN_H - 10, 4, 7, i < pips ? (i >= 5 && i <= 7 ? "#8fe39b" : (i > 8 ? "#c98aa8" : "#3fa0d8")) : "#22302a");
}

function drawCard(ctx, card) {
  if (card.bg) card.bg(ctx, card.bgOpts || {});
  if (card.funeral) return drawFuneral(ctx, card);

  // dim + panel
  ctx.fillStyle = "rgba(6,10,8,0.45)";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  const line = card.lines[card.idx];
  const px0 = 18, pw = SCREEN_W - 36, py = 134, ph = 52;
  rect(ctx, px0, py, pw, ph, "#0e1a12");
  frame(ctx, px0, py, pw, ph, card.celebrate ? "#8fe39b" : "#2c8540");
  let ty = py + 7;
  if (line.who) { text(ctx, line.who, px0 + 8, ty, line.who === "Greg" ? "#8fe39b" : "#e0c98f", { size: 7 }); ty += 11; }
  const lines = wrap(ctx, line.text, pw - 18, 8);
  lines.forEach((l, i) => text(ctx, l, px0 + 8, ty + i * 11, "#eafff0", { size: 8 }));
  // continue cue
  if (Math.floor(G.t * 1.5) % 2 === 0)
    text(ctx, card.idx < card.lines.length - 1 ? "click / SPACE >" : "click / SPACE", SCREEN_W - 24, py + ph - 11, "#6a7a6a", { size: 6, align: "right" });
}

function drawFuneral(ctx, card) {
  // somber wash
  ctx.fillStyle = "rgba(6,8,12,0.72)";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  // headstone
  const hx = 160, hy = 70;
  rect(ctx, hx - 40, hy, 80, 84, "#5a6068");
  rect(ctx, hx - 40, hy, 80, 6, "#6a727a");
  ctx.beginPath();
  // rounded top approximated
  rect(ctx, hx - 34, hy - 10, 68, 12, "#5a6068");
  rect(ctx, hx - 28, hy - 16, 56, 8, "#5a6068");
  text(ctx, "R.I.P.", hx, hy + 12, "#cfd8d0", { size: 9, align: "center" });
  text(ctx, "GREG", hx, hy + 28, "#eafff0", { size: 10, align: "center" });
  text(ctx, "the office plant", hx, hy + 44, "#9aa89a", { size: 6, align: "center" });
  text(ctx, "survived " + card.survived + " day" + (card.survived === 1 ? "" : "s"), hx, hy + 58, "#e0c98f", { size: 7, align: "center" });
  // dirt mound
  rect(ctx, 0, 154, SCREEN_W, 46, "#3a2a18");
  speckle(ctx, 0, 154, SCREEN_W, 46, "#2a1d10", 0.1, 6);
  // epitaph + restart
  const lines = wrap(ctx, card.cause, 240, 7);
  lines.forEach((l, i) => text(ctx, l, hx, 158 + i * 10, "#bfb0a0", { size: 7, align: "center" }));
  if (card.survived >= G.best && card.survived > 0)
    text(ctx, "* a new personal best *", hx, 182, "#8fe39b", { size: 7, align: "center" });
  // try again button
  const bw = 96, bh = 16, bx = hx - bw / 2, by = 180;
  if (card.survived < G.best || card.survived === 0) {
    const hot = hit(bx, by, bw, bh);
    rect(ctx, bx, by, bw, bh, hot ? "#8fe39b" : "#2c8540");
    frame(ctx, bx, by, bw, bh, "#0c140d");
    text(ctx, "TRY AGAIN", hx, by + 4, hot ? "#0a120a" : "#eafff0", { size: 8, align: "center" });
    G.hotspots.push({ x: bx, y: by, w: bw, h: bh, fn: card.onDone, btn: true });
  } else {
    if (Math.floor(G.t * 1.5) % 2 === 0) text(ctx, "click to try again", hx, 192, "#6a7a6a", { size: 6, align: "center" });
    G.hotspots.push({ x: 0, y: 0, w: SCREEN_W, h: SCREEN_H, fn: card.onDone });
  }
}

function drawCursor(ctx) {
  const { x, y } = G.mouse;
  const c = (G.hover || G.hoverObj) ? "#8fe39b" : "#eafff0";
  rect(ctx, x - 4, y, 9, 1, c); rect(ctx, x, y - 4, 1, 9, c);
  rect(ctx, x, y, 1, 1, "#000");
}

/* --------------------------------------------------- player & verbs -- */
function updatePlayer(dt) {
  const p = G.player;
  if (!p) return;
  if (p.say && G.t > p.say.until) p.say = null;
  if (!p.walking) { p.anim = 0; return; }
  const dir = Math.sign(p.tx - p.x);
  p.x += dir * WALK_SPEED * dt;
  p.anim += dt * 6;
  if (Math.floor(p.anim) !== Math.floor(p.anim - dt * 6) && Math.floor(p.anim) % 1 === 0) sfx("walk");
  if (Math.abs(p.tx - p.x) <= WALK_SPEED * dt) {
    p.x = p.tx; p.walking = false; p.anim = 0;
    const pending = p.pending; p.pending = null;
    if (pending && pending.act) { if (pending.id === "greg" || pending.verb === "Tend") sfx("page"); pending.act(); }
  }
}

function drawPlayer(ctx) {
  const p = G.player;
  if (!p) return;
  const s = p.scale;
  const x = p.x - 8 * s, y = p.y - 29 * s;
  // soft shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect((p.x - 9 * s) | 0, (p.y - 1) | 0, 18 * s, 3);
  drawPerson(ctx, x, y, s, { facing: p.facing, step: p.walking ? (p.anim % 1) : null, ...PLAYER });
  // speech bubble over the head
  if (p.say) {
    const lines = wrap(ctx, p.say.text, 150, 8);
    const w = Math.min(160, Math.max(...lines.map(l => measure(ctx, l, 8))) + 10);
    const bx = Math.max(4, Math.min(SCREEN_W - 4 - w, p.x - w / 2));
    const by = y - lines.length * 10 - 8;
    rect(ctx, bx, by, w, lines.length * 10 + 6, "#0e1a12");
    frame(ctx, bx, by, w, lines.length * 10 + 6, "#2c8540");
    lines.forEach((l, i) => text(ctx, l, bx + w / 2, by + 4 + i * 10, p.say.color, { size: 8, align: "center" }));
  }
}

// SCUMM-style sentence line: "Verb the thing" for whatever's under the cursor.
function drawSentence(ctx) {
  const y = SCREEN_H - 26;
  rect(ctx, 0, y, SCREEN_W, 12, "#0c140d");
  let s = G.hoverObj ? `${G.hoverObj.verb} ${G.hoverObj.name}` : (G.player && G.player.walking ? "Walking..." : "Walk");
  text(ctx, s, 160, y + 2, G.hoverObj ? "#8fe39b" : "#7a8a7a", { size: 7, align: "center" });
}

let sleepK = 0, sleeping = false;
function startSleep() {
  sleeping = true; sleepK = 0; sfx("snooze"); playMusic("home");
}

function commute(label, then) {
  G.scene = "commute";
  G.commuteEnd = G.t + 1.6;
  G.commuteLabel = label;
  G.commuteThen = then;
  G.fade = 1; G.fadeDir = 0;
}

/* --------------------------------------------------------- loop ------ */
function update(dt) {
  G.t += dt;
  // fades — direction gates the end checks so the opening fade-in (which
  // starts at fade==1) isn't mistaken for "reached black".
  if (G.fadeDir !== 0) {
    G.fade += G.fadeDir * dt * 2.6;
    if (G.fadeDir > 0 && G.fade >= 1) {        // reached black: run callback, then fade back in
      G.fade = 1;
      const cb = G.fadeCb; G.fadeCb = null;
      if (cb) cb();
      G.fadeDir = -1;
    } else if (G.fadeDir < 0 && G.fade <= 0) { // fully visible: stop
      G.fade = 0; G.fadeDir = 0;
    }
  }
  if (G.closeup) updateWatering(dt);

  if (G.scene === "commute" && G.t >= G.commuteEnd) {
    const then = G.commuteThen; G.commuteThen = null; if (then) then();
  }

  if (G.scene === "night" && sleeping) {
    sleepK = Math.min(1, sleepK + dt * 0.8);
    if (sleepK >= 1) { sleeping = false; sleepK = 0; sleepAndRollover(); }
  }

  // walk the avatar (not while a close-up / sleep animation is running)
  if (["morning", "office", "night"].includes(G.scene) && !G.closeup && !sleeping) updatePlayer(dt);

  if (G.toast && G.t > G.toast.until) G.toast = null;
}

function render() {
  const ctx = G.ctx;
  ctx.clearRect(0, 0, SCREEN_W, SCREEN_H);
  G.hotspots = [];
  G.sceneObjects = [];

  // scene background
  switch (G.scene) {
    case "morning": drawApartment(ctx, { night: false }); break;
    case "office":  drawOffice(ctx); break;
    case "night":   sleeping ? drawNightSleep(ctx, sleepK) : drawApartment(ctx, { night: true }); break;
    case "commute": drawCommute(ctx); break;
    case "intro":
    case "card":    if (G.card && G.card.bg) G.card.bg(ctx, G.card.bgOpts || {}); break;
    case "gameover": break;
  }

  // playable scenes: object hotspots, the avatar, the sentence line + HUD
  if (["morning", "office", "night"].includes(G.scene) && !G.closeup && !sleeping) {
    G.sceneObjects = objectsFor();
    drawPlayer(ctx);
    drawSentence(ctx);
    drawHUD(ctx);
  } else if (["morning", "office", "night"].includes(G.scene) && !G.closeup) {
    drawPlayer(ctx);
    drawHUD(ctx);
  }

  if (G.closeup) drawWatering(ctx);
  if ((G.scene === "intro" || G.scene === "card" || G.scene === "gameover") && G.card) drawCard(ctx, G.card);

  // toast
  if (G.toast) {
    const w = measure(ctx, G.toast.text, 7) + 16;
    rect(ctx, 160 - w / 2, 40, w, 14, "#0e1a12");
    frame(ctx, 160 - w / 2, 40, w, 14, "#2c8540");
    text(ctx, G.toast.text, 160, 44, G.toast.color, { size: 7, align: "center" });
  }

  // fade overlay
  if (G.fade > 0) { ctx.fillStyle = `rgba(4,8,6,${G.fade})`; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }

  drawCursor(ctx);
}

function drawCommute(ctx) {
  // simple parallax street
  for (let i = 0; i < 132; i++) rect(ctx, 0, i, SCREEN_W, 1, mix("#bfe6f2", "#eaf4dd", i / 132));
  const off = (G.t * 60) % 40;
  for (let x = -40; x < SCREEN_W + 40; x += 40) {
    rect(ctx, x - off, 70, 24, 50, "#9aa6b2"); // buildings scrolling
    rect(ctx, x - off + 4, 76, 4, 4, "#3fa0d8");
  }
  rect(ctx, 0, 132, SCREEN_W, 68, "#6a6a72"); // road
  for (let x = -off * 2 % 60; x < SCREEN_W; x += 60) rect(ctx, x, 165, 30, 4, "#e0e0d0"); // road markings
  // a little cyclist
  drawPerson(ctx, 150, 120, 1.6, { shirt: "#00a98f" });
  rect(ctx, 150, 168, 30, 3, "#222"); // (suggestion of a bike)
  text(ctx, G.commuteLabel || "", 160, 30, "#0c140d", { size: 8, align: "center", shadow: false });
  text(ctx, G.commuteLabel || "", 160, 29, "#1f3a2a", { size: 8, align: "center" });
}

function loop(ts) {
  const now = ts / 1000;
  let dt = G.last ? now - G.last : 0;
  G.last = now;
  if (dt > 0.1) dt = 0.1;
  update(dt);
  // hover detection — UI hotspots (buttons) and scene objects
  G.hover = null;
  for (let i = G.hotspots.length - 1; i >= 0; i--) {
    const z = G.hotspots[i];
    if (G.mouse.x >= z.x && G.mouse.x <= z.x + z.w && G.mouse.y >= z.y && G.mouse.y <= z.y + z.h) { G.hover = z; break; }
  }
  G.hoverObj = null;
  for (const o of (G.sceneObjects || [])) {
    if (G.mouse.x >= o.x && G.mouse.x <= o.x + o.w && G.mouse.y >= o.y && G.mouse.y <= o.y + o.h) { G.hoverObj = o; break; }
  }
  render();
  requestAnimationFrame(loop);
}

/* --------------------------------------------------------- input ----- */
function hit(x, y, w, h) { return G.mouse.x >= x && G.mouse.x <= x + w && G.mouse.y >= y && G.mouse.y <= y + h; }

function toLocal(e) {
  const r = G.canvas.getBoundingClientRect();
  const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
  const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
  G.mouse.x = Math.max(0, Math.min(SCREEN_W - 1, (cx / r.width) * SCREEN_W));
  G.mouse.y = Math.max(0, Math.min(SCREEN_H - 1, (cy / r.height) * SCREEN_H));
}

// Hit-test the current scene's objects (kept fresh; doesn't wait for a frame).
function objectAt(x, y) {
  const objs = (G.scene && ["morning", "office", "night"].includes(G.scene) && !G.closeup && !sleeping) ? objectsFor() : [];
  for (const o of objs) if (x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h) return o;
  return null;
}

function advanceCard() {
  const c = G.card; if (!c) return;
  if (c.idx < c.lines.length - 1) { c.idx++; sfx("page"); }
  else { const done = c.onDone; G.card = null; if (done) done(); }
}

function onDown(e) {
  toLocal(e);
  G.mouse.down = true;

  // watering close-up: press = pour, unless on the DONE button
  if (G.closeup) {
    const overBtn = G.hotspots.find(z => z.btn && hit(z.x, z.y, z.w, z.h));
    if (overBtn) { overBtn.fn(); return; }
    G.closeup.pouring = true;
    return;
  }
  // cards / intro / gameover
  if ((G.scene === "intro" || G.scene === "card") && G.card && !G.card.funeral) {
    // a button hotspot (none usually) else advance
    const z = G.hover; if (z && z.fn) { z.fn(); return; }
    advanceCard(); return;
  }
  if (G.scene === "gameover" && G.card) {
    const z = G.hover; if (z && z.fn) z.fn(); else if (G.card.onDone) G.card.onDone();
    return;
  }
  // playable scenes: click an object to walk over and interact, else walk.
  if (["morning", "office", "night"].includes(G.scene) && !sleeping) {
    const obj = objectAt(G.mouse.x, G.mouse.y);   // compute fresh (avoid stale hover)
    if (obj) { sfx("verb"); walkTo(obj.walkX, obj); }
    else walkTo(G.mouse.x, null);
    return;
  }
  // any other UI buttons
  const z = G.hover;
  if (z && z.fn) { sfx("verb"); z.fn(); }
}

function onUp() { G.mouse.down = false; if (G.closeup) G.closeup.pouring = false; }
function onMove(e) { toLocal(e); }

let spaceDown = false;
function bindInput() {
  const c = G.canvas;
  c.addEventListener("mousedown", onDown);
  c.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  c.addEventListener("touchstart", (e) => { onDown(e); e.preventDefault(); }, { passive: false });
  c.addEventListener("touchmove", (e) => { onMove(e); e.preventDefault(); }, { passive: false });
  window.addEventListener("touchend", (e) => { onUp(e); });

  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === " ") {
      e.preventDefault();
      if (G.closeup) { if (!spaceDown) { G.closeup.pouring = true; spaceDown = true; } return; }
      if ((G.scene === "intro" || G.scene === "card") && G.card && !G.card.funeral) advanceCard();
      else if (G.scene === "gameover" && G.card && G.card.onDone) G.card.onDone();
    }
    if (k === "enter") {
      if (G.closeup) { commitWatering(); return; }
      if ((G.scene === "intro" || G.scene === "card") && G.card && !G.card.funeral) advanceCard();
      else if (G.scene === "gameover" && G.card && G.card.onDone) G.card.onDone();
    }
    if (k === "h") flashHint("click to walk · click a thing to use it · hold to pour water LAGOM");
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === " ") { spaceDown = false; if (G.closeup) G.closeup.pouring = false; }
  });
}
