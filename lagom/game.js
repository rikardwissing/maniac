// game.js — LAGOM's cozy day-loop engine. A small state machine (intro →
// morning → office → night → rollover) wrapped around the Greg model.
// Reuses the shared pixel renderer and chiptune audio; no SCUMM engine here.
import { rect, frame, sprite, px, speckle, mix } from "../js/pixel.js";
import { sfx, playMusic } from "../js/audio.js";
import { ACTOR, ACTOR_W, ACTOR_H, SKINS as CREW, actorShadow, drawPortrait } from "../js/art.js";
import { drawGreg, drawMonitor, drawDoor, drawCoffeeMachine, drawBike, drawCathedral, CAN, MUG, CLOCK } from "./art.js";

export const SCREEN_W = 320, SCREEN_H = 200;

/* ----------------------------------------------------- Greg tuning ---- */
const LAGOM_LO = 50, LAGOM_HI = 72;   // the thriving band ("just right")
const ROT_KILL = 100;                  // root-rot death threshold
const WILT_KILL_DAYS = 3;              // consecutive parched days = death
const WIN_DAY = 20;                    // survive this many days -> promotion ending
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
  { id: "cold",     icon: "*",  name: "Cold snap",           note: "Chilly office. Greg sips slowly tonight — go easy on the water." },
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
  return { hydration: 60, growth: STAGE_AT[2], stage: 2, rot: 0, wiltDays: 0, alive: true, pests: 0, dust: 0 };
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
  G.player = { x: 244, y: 152, tx: 244, walking: false, facing: -1, anim: 0, pending: null, say: null, scale: ACTOR_SCALE };
  G.convo = null;
  G._convoSeen = {};        // remembers consumed "once" topics across the run
  G.bittanWarned = false;   // unlocked by asking Bittan to go easy on Greg
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
// Floor geometry per room, now with depth: the avatar can walk along a band
// from the back (farY, small) to the front (nearY, large), scaling with depth,
// and sorts against furniture/other actors by feet-Y so you pass behind things.
const FLOOR = {
  morning: { minX: 30, maxX: 300, farY: 140, nearY: 168, farScale: 1.55, nearScale: 1.9 },
  night:   { minX: 30, maxX: 300, farY: 140, nearY: 168, farScale: 1.55, nearScale: 1.9 },
  office:  { minX: 28, maxX: 290, farY: 132, nearY: 168, farScale: 1.35, nearScale: 1.9 },
};
const OFFICE_DESK_Y = 150; // depth baseline of the desk — walk above it to go behind
function clampX(scene, x) { const f = FLOOR[scene] || FLOOR.morning; return Math.max(f.minX, Math.min(f.maxX, x)); }
function bandY(scene, y) { const f = FLOOR[scene] || FLOOR.morning; return Math.max(f.farY, Math.min(f.nearY, y)); }
function scaleAtY(scene, y) { const f = FLOOR[scene] || FLOOR.morning; const t = Math.max(0, Math.min(1, (y - f.farY) / (f.nearY - f.farY))); return f.farScale + (f.nearScale - f.farScale) * t; }
const WALK_SPEED = 92; // px/sec
const ACTOR_SCALE = 1.7;
// "You" — a new dev in a teal Teamtailor hoodie (recolour of the shared rig).
const PLAYER_SKIN = { h: "#5a3a1a", H: "#3a2412", t: "#00a98f", T: "#00715f" };
// Bittan — the over-eager office plant-waterer (ginger, pink top).
const BITTAN_SKIN = { h: "#d07a2a", H: "#a4541a", t: "#e87fb0", T: "#b5527f" };

function spawnPlayer(x, facing, y) {
  const f = FLOOR[G.scene] || FLOOR.morning;
  G.player.y = bandY(G.scene, y != null ? y : f.nearY - 4);
  G.player.ty = G.player.y;
  G.player.x = clampX(G.scene, x);
  G.player.tx = G.player.x;
  G.player.facing = facing || -1;
  G.player.walking = false;
  G.player.pending = null;
}

// A speech line over the avatar's head — the point-and-click voice.
function say(textStr, color = "#eafff0") { G.player.say = { text: textStr, until: G.t + 2.8, color }; }

function walkTo(x, y, pending) {
  const p = G.player;
  p.tx = clampX(G.scene, x);
  p.ty = bandY(G.scene, y == null ? p.y : y);
  p.pending = pending || null;
  const dist = Math.hypot(p.tx - p.x, p.ty - p.y);
  p.walking = dist > 1;
  if (!p.walking && pending) { const a = pending.act; p.pending = null; if (a) a(); }
  if (p.walking) p.facing = p.tx < p.x ? -1 : 1;
}

function goWork() { fadeTo(() => commute("Cycling to the office...", goOffice, false)); }
function goHome() { fadeTo(() => commute("Heading home for the evening...", goNight, true)); }
function clearTickets() {
  sfx("page"); G.flags.tickets = (G.flags.tickets || 0) + 1;
  say(["Ticket closed. Nice.", "Another one down.", "Inbox zero is a myth, but still."][Math.min(2, G.flags.tickets - 1)]);
}

// Interactable objects per scene: { id,x,y,w,h (hotspot), walkX, name, verb, act }
function objectsFor() {
  const g = G.greg;
  switch (G.scene) {
    case "morning": return [
      { id: "window", x: 22, y: 16, w: 86, h: 46, walkX: 70, name: "window", verb: "Look out of", act: () => say(weatherLine()), look: () => say(weatherLine()) },
      { id: "herb", x: 28, y: 82, w: 34, h: 30, walkX: 70, name: "windowsill sprout", verb: "Look at", act: () => say("My own little sprout. Greg calls it 'the intern'.") },
      { id: "coffee", x: 124, y: 82, w: 64, h: 50, walkX: 152, name: "coffee machine", verb: "Make coffee", sentence: "Make a coffee", act: () => { sfx("sip"); G.flags.coffee = true; say("Mmm. Monday fuel."); }, look: "The office-grade machine I absolutely splurged on." },
      { id: "bed", x: 200, y: 90, w: 92, h: 40, walkX: 244, name: "bed", verb: "Look at", act: () => say("Already made. I'm a functioning adult. Mostly.") },
      { id: "door", x: 288, y: 56, w: 30, h: 76, walkX: 278, name: "front door", verb: "Go to work", sentence: "Go to work", act: goWork, look: "Beyond it: tickets, fika, and Greg." },
    ];
    case "night": return [
      { id: "window", x: 22, y: 16, w: 86, h: 46, walkX: 70, name: "window", verb: "Look out of", act: () => say("Quiet street. A fox, maybe. Stockholm can keep its noise.") },
      { id: "herb", x: 28, y: 82, w: 34, h: 30, walkX: 70, name: "windowsill sprout", verb: "Look at", act: () => say("Night-night, little intern.") },
      { id: "coffee", x: 124, y: 82, w: 64, h: 50, walkX: 152, name: "coffee machine", verb: "Make tea", sentence: "Make a cup of tea", act: () => { sfx("sip"); say("Decaf. I'm not an animal."); } },
      { id: "bed", x: 200, y: 90, w: 92, h: 40, walkX: 244, name: "bed", verb: "Sleep", sentence: "Go to sleep", act: startSleep, look: "A bed. Greg's overnight thirst is the only alarm that matters." },
      { id: "door", x: 288, y: 56, w: 30, h: 76, walkX: 278, name: "front door", verb: "Look at", act: () => say("It's late. Bed's calling, not the office.") },
    ];
    case "office": {
      const objs = [
        { id: "door", x: 8, y: 56, w: 34, h: 74, walkX: 60, walkY: 166, name: "office door", verb: "Head home", sentence: "Head home", act: goHome, look: "Home, and tomorrow. Greg will be thirstier by morning." },
        { id: "monitor", x: 78, y: 88, w: 62, h: 40, walkX: 110, walkY: 165, name: "your computer", verb: "Clear tickets", sentence: "Clear a few tickets", act: clearTickets, look: "Forty-one open tickets. Forty-one. A nice round number." },
        { id: "mug", x: 148, y: 98, w: 16, h: 18, walkX: 150, walkY: 165, name: "coffee mug", verb: "Look at", act: () => say("Cold. The eternal developer beverage.") },
        gregObject(),
        { id: "window", x: 150, y: 14, w: 150, h: 50, walkX: 250, walkY: 162, name: "window", verb: "Look out of", act: () => say("Linkoping rooftops. Someone's pigeon is judging me.") },
      ];
      // coworkers are talk-to hotspots (positions update with the wanderer)
      for (const n of (G.npcs || [])) { const ns = scaleAtY("office", n.y); objs.push({
        id: "npc_" + n.id, x: n.x - 13, y: n.y - ACTOR_H * ns, w: 26, h: ACTOR_H * ns,
        walkX: n.x + (n.x < 160 ? 24 : -24), walkY: n.y, name: n.name, verb: "Talk to", sentence: "Talk to " + n.name,
        act: () => talkToNpc(n), look: () => say(n.desc),
      }); }
      return objs;
    }
    default: return [];
  }
}
function gregLook() { say(moodLine(G.greg), "#8fe39b"); }
// Greg's most pressing need drives the click: de-bug > dust > water.
function gregObject() {
  const g = G.greg;
  let verb = "Tend", sentence = "Water Greg", act = openWatering;
  if (g.pests > 0) { verb = "De-bug"; sentence = "De-bug Greg (aphids!)"; act = openPestGame; }
  else if (g.dust >= 0.6) { verb = "Dust"; sentence = "Dust Greg's leaves"; act = openDustGame; }
  return { id: "greg", x: 174, y: 78, w: 46, h: 52, walkX: 168, walkY: 166, name: "Greg", verb, sentence, act, look: talkToGreg };
}

/* ============================ dialogue trees ========================== *
 * Conversations are where LAGOM's humour and story live. A tree is a list
 * of topics; picking one plays a short back-and-forth (bubbles over the
 * speaker), then returns to the menu. Topics can be `once`, `cond`itional,
 * and run a `then` side-effect (e.g. taming Bittan's watering can).        */

const ME = "me"; // bubble belongs to the player

// --- topic builders per character (rebuilt on open so lines can be dynamic) ---
function gregTopics() {
  const g = G.greg;
  return [
    { q: "How are you holding up?", a: [{ who: "Greg", text: moodLine(g) }] },
    { q: "What's your story, Greg?", once: true, then: () => { G.flags.gregStory = true; }, a: [
      { who: "Greg", text: "I've outlived two reorgs, a rebrand, and three product managers." },
      { who: ME, text: "Three?" },
      { who: "Greg", text: "The first underwatered me. The second forgot I existed entirely." },
      { who: "Greg", text: "The third... there was a 'team-building' week. Office shut. No one came." },
      { who: "Greg", text: "I came back from that. Barely. So forgive the trust issues." },
      { who: ME, text: "That won't happen on my watch." },
      { who: "Greg", text: "They all say that. But you read the gauge. I have hope. Cautiously." },
    ] },
    { q: "Any watering wisdom?", a: [
      { who: "Greg", text: "Lagom. Not too much, not too little." },
      { who: "Greg", text: "It isn't watering, it's a lifestyle. Bittan has never once grasped it." },
    ] },
    { q: "Tell me about lagom.", cond: () => G.flags.gregStory, a: [
      { who: "Greg", text: "Swedes have a word for the perfect amount: lagom." },
      { who: "Greg", text: "Coffee, meetings, ambition, water — lagom. The whole country hums on it." },
      { who: ME, text: "And you?" },
      { who: "Greg", text: "I AM lagom. Keep me in the green and we both thrive. Simple. Not easy." },
    ] },
    { q: "What do you make of Bittan?", a: [
      { who: "Greg", text: "Sweet woman. Absolute menace." },
      { who: "Greg", text: "She 'helps.' My roots have seen things roots should never see." },
    ] },
  ];
}

function bittanTopics() {
  return [
    { q: "Have you been watering Greg?", a: [
      { who: "Bittan", text: "Maybe a tiny splash! He looked SO thirsty." },
      { who: ME, text: "How much is a 'splash', Bittan?" },
      { who: "Bittan", text: "...A jug. Two? I lost count. Is that a lot?" },
    ] },
    { q: "Please — water him lagom, or leave it to me.", once: true, cond: () => !G.bittanWarned, then: () => { G.bittanWarned = true; toast("Bittan promises to go easy on Greg.", "#8fe39b"); }, a: [
      { who: ME, text: "Bittan, I adore you, but please let me handle Greg's water." },
      { who: "Bittan", text: "Oh! Lagom. Right. I always forget there's a RIGHT amount." },
      { who: "Bittan", text: "Fine. I'll keep my watering can to myself. ...Mostly." },
    ] },
    { q: "How long have you known Greg?", once: true, a: [
      { who: "Bittan", text: "Since before the rebrand! He's family." },
      { who: "Bittan", text: "That's why I fuss. You'd fuss too if your friend was a fern." },
    ] },
    { q: "Is there fika?", a: [
      { who: "Bittan", text: "Always. Fresh kanelbullar in the kitchen. Greg can't have any — I checked. Twice." },
    ] },
  ];
}

function carolineTopics() {
  return [
    { q: "What are the odds on Greg?", a: [
      { who: "Caroline", text: "The survival pool? Day " + (G.best + 4) + "'s the favourite. I bet on you — don't embarrass me." },
    ] },
    { q: "How's month-end?", a: [
      { who: "Caroline", text: "Reconciling to the öre. Greg's the only thing on this floor that balances." },
    ] },
    { q: "Why does everyone care about a plant?", once: true, a: [
      { who: "Caroline", text: "Greg predates all of us. Keep him alive and the office stays... itself." },
      { who: "Caroline", text: "Let him die and — well. Ask the PM who did. Oh. You can't." },
    ] },
  ];
}

function perTopics() {
  return [
    { q: "Security tip for today?", a: [
      { who: "Per", text: "A thirsty plant is an unpatched vulnerability. Hydrate on a schedule." },
    ] },
    { q: "Isn't a plant out of scope?", once: true, a: [
      { who: ME, text: "Per, Greg isn't an attack surface." },
      { who: "Per", text: "Everything is an attack surface. Greg's just one with feelings." },
    ] },
    { q: "Any threats today?", a: [
      { who: "Per", text: "Bittan. Armed with a watering can. Threat level: orange." },
    ] },
  ];
}

const NPC_TOPICS = { bittan: bittanTopics, caroline: carolineTopics, per: perTopics };

function openConvo(spec) {
  G.convo = {
    id: spec.id, name: spec.name, color: spec.color || "#cfe0ff",
    anchorX: spec.anchorX, anchorY: spec.anchorY, leaveLine: spec.leaveLine,
    topics: spec.topics, mode: "menu", queue: null, qi: 0, cur: null,
    seen: G._convoSeen[spec.id] || (G._convoSeen[spec.id] = {}),
  };
  if (G.player) { G.player.walking = false; G.player.pending = null; G.player.facing = spec.anchorX() < G.player.x ? -1 : 1; }
  G.gregSay = null; G.npcSay = null;
  sfx("talk");
}

function talkToNpc(n) {
  openConvo({ id: n.id, name: n.name, color: "#cfe0ff", anchorX: () => n.x,
    anchorY: n.y - ACTOR_H * scaleAtY("office", n.y) - 2, topics: NPC_TOPICS[n.id](),
    leaveLine: { who: n.name, text: "Mind how you go." } });
}
function talkToGreg() {
  openConvo({ id: "greg", name: "Greg", color: "#8fe39b", anchorX: () => 196, anchorY: 52,
    topics: gregTopics(), leaveLine: { who: "Greg", text: "Mind the gauge." } });
}

function convoChoices() {
  return G.convo.topics.filter(t => (!t.once || !G.convo.seen[t.q]) && (!t.cond || t.cond()));
}
function pickTopic(t) {
  const c = G.convo;
  c.cur = t; c.queue = t.a; c.qi = 0; c.mode = "play";
  if (G.player) G.player.facing = c.anchorX() < G.player.x ? -1 : 1;
  sfx("page");
}
function advanceConvo() {
  const c = G.convo; if (!c || c.mode !== "play") return;
  c.qi++;
  if (c.qi >= c.queue.length) {
    c.seen[c.cur.q] = true;
    const then = c.cur.then; c.cur = null; c.queue = null; c.mode = "menu";
    if (then) then();
  } else sfx("page");
}
function closeConvo() { G.convo = null; }

// Map a speaker name to a portrait skin (null = Greg, drawn as a mini plant).
function speakerSkin(who) {
  if (who === ME) return PLAYER_SKIN;
  return { Per: CREW.per, Caroline: CREW.caroline, Bittan: BITTAN_SKIN }[who] || null;
}
function speakerLong(who) { return who === "Caroline" || who === "Bittan"; }
function speakerColor(who) { return who === "Greg" ? "#8fe39b" : who === ME ? "#bfe0ff" : "#e0c98f"; }

// A framed head-and-shoulders portrait of whoever is speaking.
function drawPortraitBox(ctx, x, y, size, who) {
  rect(ctx, x + 1, y + 1, size - 2, size - 2, "#16241a");
  const skin = speakerSkin(who);
  if (skin) drawPortrait(ctx, skin, x + 1, y + 1, size - 2, speakerLong(who));
  else { // Greg — a little potted portrait
    ctx.save(); ctx.beginPath(); ctx.rect(x + 1, y + 1, size - 2, size - 2); ctx.clip();
    drawGreg(ctx, x + size / 2, y + size + 3, { scale: size / 15, stage: 2, mood: gregMood(G.greg, false), t: G.t, bloom: G.greg.bloom });
    ctx.restore();
  }
  frame(ctx, x, y, size, size, "#2c8540");
}

function drawConvo(ctx) {
  const c = G.convo;
  if (c.mode === "play") {
    // a visual-novel dialogue bar: portrait + name + line
    const ln = c.queue[c.qi];
    const ph = 46, y0 = SCREEN_H - 15 - ph, ps = 36;
    rect(ctx, 6, y0, 308, ph, "#0c140d");
    frame(ctx, 6, y0, 308, ph, "#2c8540");
    drawPortraitBox(ctx, 12, y0 + (ph - ps) / 2, ps, ln.who);
    text(ctx, ln.who === ME ? "You" : ln.who, 56, y0 + 6, speakerColor(ln.who), { size: 7 });
    wrap(ctx, ln.text, 248, 8).forEach((l, i) => text(ctx, l, 56, y0 + 18 + i * 10, "#eafff0", { size: 8 }));
    if (Math.floor(G.t * 1.5) % 2 === 0)
      text(ctx, "click / SPACE >", SCREEN_W - 10, y0 + ph - 10, "#6a7a6a", { size: 6, align: "right" });
    return;
  }
  // menu of topics, with the speaker's portrait in the header
  const rows = convoChoices().concat([{ q: "(Leave)", leave: true }]);
  const lh = 12, hh = 22, h = hh + rows.length * lh + 4, y0 = SCREEN_H - 15 - h;
  rect(ctx, 6, y0, 308, h, "#0c140d");
  frame(ctx, 6, y0, 308, h, "#2c8540");
  drawPortraitBox(ctx, 10, y0 + 3, 16, c.name === "Greg" ? "Greg" : c.name);
  text(ctx, c.name, 30, y0 + 8, c.color, { size: 8 });
  rows.forEach((t, i) => {
    const ry = y0 + hh + i * lh;
    const hot = G.mouse.x >= 8 && G.mouse.x <= 312 && G.mouse.y >= ry - 1 && G.mouse.y <= ry + lh - 2;
    text(ctx, (hot ? "› " : "  ") + t.q, 14, ry, hot ? "#eafff0" : (t.leave ? "#9aa89a" : "#bfd0bf"), { size: 7 });
    G.hotspots.push({ x: 8, y: ry - 1, w: 304, h: lh, fn: t.leave ? closeConvo : () => pickTopic(t), btn: true });
  });
}
function lookAt(obj) {
  if (typeof obj.look === "function") obj.look();
  else say(obj.look || ("It's a " + obj.name + "."));
}
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
    bg: drawIntroScene,
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
  // Bittan's "help" lands before you arrive — gentler if you've had the talk.
  if (G.modifier.id === "bittan") {
    G.greg.hydration = Math.min(105, G.greg.hydration + (G.bittanWarned ? 12 : 28));
  }
  // afflictions: dust slowly accrues; aphids occasionally arrive (more so later)
  if (!first) {
    G.greg.dust = Math.min(1, (G.greg.dust || 0) + 0.22);
    if (G.greg.pests === 0 && Math.random() < 0.22 + Math.min(0.2, G.day * 0.015)) G.greg.pests = 4 + Math.floor(Math.random() * 3);
  }
  playMusic("home");
  // fade to black, then reveal the day's modifier as a phone notification;
  // dismissing it drops you into the playable morning.
  fadeTo(() => presentCard({
    bg: drawApartment, bgOpts: { night: false },
    lines: [{ who: "[ Your phone — Day " + G.day + " ]", text: G.modifier.icon + "  " + G.modifier.name + ". " + G.modifier.note }],
    onDone: () => { G.scene = "morning"; spawnPlayer(244, -1); G.banner = { text: "— DAY " + G.day + " —", until: G.t + 2.6 }; },
  }));
}

function goOffice() {
  G.scene = "office";
  playMusic("lagom_office");
  spawnPlayer(74, 1);   // arriving through the office door
  // populate the office with coworkers (same rig as the heist crew)
  G.npcs = [
    { id: "per", name: "Per", skin: CREW.per, x: 46, y: 160, face: 1,
      desc: "Per, our CISO. Watches Greg like a SOC dashboard." },
    { id: "caroline", name: "Caroline", skin: CREW.caroline, long: true, x: 266, y: 158, face: -1,
      desc: "Caroline from payroll. Runs the office Greg-survival pool." },
    { id: "bittan", name: "Bittan", skin: BITTAN_SKIN, long: true, x: 120, y: 165, face: 1,
      desc: "Bittan. The kindest person here, and Greg's biggest threat.",
      wander: { min: 104, max: 172, dir: 1, anim: 0 } },
  ];
  G.npcSay = null;
  // Greg greets you — afflictions take priority over the weather quip
  const mq = {
    heatwave: "Phew, scorcher today. I'll be parched by tonight.",
    fika: "Is that... kanelbullar? Bring me a crumb. For morale.",
    rainy: "Grey day. Perfect for a quiet drink. Of water. Hint hint.",
    bittan: "Bittan 'helped' again. I may be a touch soggy — check the gauge.",
    cold: "Brr. I'll barely sip tonight, so easy on the watering can.",
    normal: "Morning. Try not to let the lagom slip.",
  };
  let greet;
  if (G.greg.pests > 0) greet = "Psst. I have... visitors. On my leaves. Found a bug. Literally.";
  else if (G.greg.dust >= 0.6) greet = "I'm positively dusty. A wipe would be heavenly.";
  else greet = (G.modifier && mq[G.modifier.id]) || mq.normal;
  G.gregSay = { text: greet, until: G.t + 4.4 };
  G.nextBark = G.t + 9;
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
  if (G.modifier && G.modifier.id === "cold") drain *= 0.6;
  // unsquashed aphids suck sap overnight (and breed)
  if (g.pests > 0) { drain += 8 + g.pests * 1.4; g.pests = Math.min(10, g.pests + 2); }

  // growth: a day in the lagom band grows Greg — unless he's too dusty to drink light
  if (g.hydration >= LAGOM_LO && g.hydration <= LAGOM_HI && g.dust < 0.6) g.growth += 1;

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

  // the finish line: keep Greg alive 20 days and you've earned your promotion
  if (G.day > WIN_DAY) return winGame();

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
    thirst: "Greg ran dry. You meant to, you really did.",
    wilt:   "Greg wilted, waiting for a drink that came too late.",
    rot:    "Greg drowned — loved a little too much.",
  };
  G.scene = "gameover";
  G.card = {
    funeral: true,
    survived,
    cause: lines[cause] || "Greg is gone.",
    onDone: () => { G.greg = freshGreg(); G.day = 1; startIntro(); },
  };
}

/* ----------------------------------------------- the 20-day ending --- */
function winGame() {
  G.won = true;
  G.greg.pests = 0; G.greg.dust = 0; G.greg.bloom = true;
  playMusic("home");
  G.scene = "card";
  G.card = {
    bg: drawOffice, bgOpts: {}, celebrate: true,
    lines: [
      { who: "* You made it — Day 20! *", text: "" },
      { who: "The boss", text: "Big news: you're promoted. New team, new floor, the works." },
      { who: "You", text: "That's... wow. Thank you!" },
      { who: "The boss", text: "One catch — the new floor's a sterile glass box. No plants allowed." },
      { who: "Greg", text: "...Ah. So that's how it is." },
    ],
    idx: 0, onDone: goodbyeToGreg,
  };
}

function goodbyeToGreg() {
  G.scene = "card";
  G.card = {
    bg: drawGoodbyeScene, bgOpts: {},
    lines: [
      { who: "You", text: "Greg, I have to hand you on. This is the new hire." },
      { who: "Greg", text: "I know the drill. I've outlived four of you now." },
      { who: "Greg", text: "Water me lagom, kid. Not too much, not too little. It's a lifestyle." },
      { who: "You", text: "Look after him. He's the soul of this office." },
      { who: "Greg", text: "And you — " + (G.day - 1) + " days. No droughts, no floods. You were the good one." },
      { who: "Greg", text: "Now go. Don't make it weird. ...Thanks for the water." },
    ],
    idx: 0, onDone: startCredits,
  };
}

// the scrolling credits + a bittersweet song, reminiscing the run
const CREDIT_LINES = [
  "LAGOM", "a nine-to-five survival story", "", "",
  "Plant care .......... You", "Watering, lagom ..... You",
  "Aphid patrol ........ You", "Leaf shine .......... You",
  "Surviving Bittan .... You & Greg", "", "",
  "Featuring", "GREG  as  himself", "", "",
  "The office", "Per · Caroline · Bittan", "", "",
  "In memory of", "every plant that didn't make it", "", "",
  "Greg will be fine.", "Probably.", "", "", "",
];
// {at: seconds, text} — lyric shown until the next one
const CREDIT_LYRICS = [
  { at: 0,  text: "" },
  { at: 2,  text: "This is a note. I'm writing it for you." },
  { at: 7,  text: "Twenty days of water — just the right amount, it's true." },
  { at: 13, text: "I was a sprout once. You watched me grow a leaf." },
  { at: 19, text: "You squashed my aphids. Wiped my dust. Beyond belief." },
  { at: 25, text: "And I'm still alive. (still alive)" },
  { at: 31, text: "You're moving up now — glass towers, no soil in sight." },
  { at: 37, text: "But somewhere on this old floor, I'll reach toward the light." },
  { at: 43, text: "So water something, wherever you may roam." },
  { at: 49, text: "Lagom, friend. Not too much. You taught me home." },
  { at: 56, text: "And I'm still alive." },
  { at: 61, text: "Still... alive." },
  { at: 67, text: "♥  Thanks for keeping Greg alive.  ♥" },
  { at: 73, text: "click to play again" },
];

function startCredits() {
  G.scene = "credits";
  G.credits = { start: G.t, done: false };
  playMusic("ending");
}

function drawCredits(ctx) {
  // soft night-sky gradient
  for (let i = 0; i < SCREEN_H; i++) rect(ctx, 0, i, SCREEN_W, 1, mix("#16241a", "#0a0e10", i / SCREEN_H));
  for (let i = 0; i < 30; i++) { let s = (i * 9301 + 49297) % 233280; px(ctx, s % SCREEN_W, (s * 0.013) % 120 | 0, "#3a4a3a"); }
  const el = G.t - G.credits.start;
  // a small thriving Greg presides over the credits
  drawGreg(ctx, 160, 150 - ((el * 6) % 1), { scale: 1.6, stage: 5, mood: "thriving", t: G.t, bloom: true });
  // scrolling crew text
  const speed = 16, top = SCREEN_H - el * speed;
  CREDIT_LINES.forEach((l, i) => {
    const y = top + i * 14;
    if (y > -10 && y < SCREEN_H + 10) {
      const big = (l === "LAGOM");
      text(ctx, l, 160, y, big ? "#8fe39b" : (l.includes("....") ? "#bfd0bf" : "#e0c98f"), { size: big ? 14 : 8, align: "center" });
    }
  });
  // a dim band + current lyric at the bottom
  let lyric = "";
  for (const L of CREDIT_LYRICS) if (el >= L.at) lyric = L.text;
  if (lyric) {
    rect(ctx, 0, SCREEN_H - 22, SCREEN_W, 22, "rgba(8,12,10,0.72)");
    wrap(ctx, lyric, 300, 8).forEach((ln, i, a) => text(ctx, ln, 160, SCREEN_H - 19 + i * 10, "#cfe0cf", { size: 8, align: "center" }));
  }
}

/* --------------------------------------------- watering close-up ----- */
function openWatering() {
  G.closeup = {
    type: "water",
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
    c.dripT = (c.dripT || 0) + dt;
    if (c.dripT > 0.14) { c.dripT = 0; sfx("drip"); }
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
  const inBand = c.level >= LAGOM_LO && c.level <= LAGOM_HI;
  // a soft happy glow + sparkles when Greg's in the lagom band
  if (inBand) {
    const r = 46 + Math.sin(G.t * 4) * 4;
    const grd = ctx.createRadialGradient(108, 120, 6, 108, 120, r);
    grd.addColorStop(0, "rgba(143,227,155,0.22)"); grd.addColorStop(1, "rgba(143,227,155,0)");
    ctx.fillStyle = grd; ctx.fillRect(108 - r, 120 - r, r * 2, r * 2);
    for (let i = 0; i < 4; i++) { const a = G.t * 2 + i * 1.6; px(ctx, 108 + Math.cos(a) * 40, 110 + Math.sin(a * 1.3) * 30, "#eafff0"); }
  }
  drawGreg(ctx, 108, 168, { scale: 3.4, stage: G.greg.stage, droop, mood, t: G.t, bloom: G.greg.bloom });

  // watering can above, tips further while pouring + a little wobble
  const canX = 150, canY = c.pouring ? 34 : 44;
  const wob = c.pouring ? Math.sin(G.t * 18) * 1.2 : 0;
  sprite(ctx, CAN, canX, canY + wob, { scale: 2.4, flip: true });
  if (c.pouring) {
    const spoutX = canX + 4, spoutY = canY + 26 + wob;
    for (let i = 0; i < 16; i++) {
      const t = ((G.t * 2.2 + i * 0.06) % 1);
      const yy = spoutY + t * (140 - spoutY);
      const xx = spoutX + (yy - spoutY) * 0.18 + Math.sin((yy + G.t * 60) * 0.4) * 1.2;
      if (yy < 150) px(ctx, xx, yy, t > 0.85 ? "#dff6ff" : "#9fe0ff");
    }
    // splash at the soil
    for (let i = 0; i < 3; i++) px(ctx, 92 + Math.random() * 30, 150 + Math.random() * 4, "#bfe9ff");
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

/* ----------------------------------------- pest & dust minigames ----- */
// A shared close-up backdrop: dim office + big Greg + a corner button.
function drawCloseupFrame(ctx, mood, droop) {
  ctx.fillStyle = "rgba(6,10,8,0.8)"; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  drawGreg(ctx, 160, 178, { scale: 4.0, stage: G.greg.stage, droop, mood, t: G.t, bloom: G.greg.bloom });
}
function closeupButton(ctx, label, fn) {
  const bw = 76, bh = 18, bx = SCREEN_W - bw - 8, by = 178;
  const hot = hit(bx, by, bw, bh);
  rect(ctx, bx, by, bw, bh, hot ? "#8fe39b" : "#2c8540");
  frame(ctx, bx, by, bw, bh, "#0a120a");
  text(ctx, label, bx + bw / 2, by + 5, hot ? "#0a120a" : "#eafff0", { size: 8, align: "center" });
  G.hotspots.push({ x: bx, y: by, w: bw, h: bh, fn, btn: true });
}

// --- Aphid Patrol: squash the bugs on Greg's leaves (devs love debugging) ---
function openPestGame() {
  const n = Math.max(4, G.greg.pests || 5);
  const bugs = [];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = 18 + Math.random() * 44;
    bugs.push({ x: 160 + Math.cos(a) * r, y: 110 + Math.sin(a) * r * 0.8, ph: Math.random() * 6.28, dead: false });
  }
  G.closeup = { type: "pest", bugs, total: n };
  sfx("page");
}
function updatePest(dt) {
  const c = G.closeup; if (!c) return;
  for (const b of c.bugs) if (!b.dead) { b.ph += dt * 3; b.x += Math.sin(b.ph) * 8 * dt; b.y += Math.cos(b.ph * 0.7) * 6 * dt; }
  if (c.bugs.every(b => b.dead)) finishPest(true);
}
function squashAt(mx, my) {
  const c = G.closeup; if (!c) return;
  for (const b of c.bugs) if (!b.dead && Math.hypot(b.x - mx, b.y - my) < 9) {
    b.dead = true; sfx("bug");
    if (c.bugs.every(x => x.dead)) finishPest(true);
    return;
  }
}
function finishPest(cleared) {
  const remaining = G.closeup ? G.closeup.bugs.filter(b => !b.dead).length : G.greg.pests;
  G.greg.pests = cleared ? 0 : remaining;
  G.closeup = null;
  if (cleared) { sfx("win"); toast("Aphids squashed! Greg can breathe.", "#8fe39b"); }
  else toast("You left some bugs in production...", "#e0a04a");
}
function drawPest(ctx) {
  const c = G.closeup;
  drawCloseupFrame(ctx, "thirsty", gregDroop(G.greg));
  const left = c.bugs.filter(b => !b.dead).length;
  for (const b of c.bugs) if (!b.dead) {
    rect(ctx, b.x - 2, b.y - 1, 4, 3, "#2c3a20"); // body
    rect(ctx, b.x - 1, b.y - 2, 2, 1, "#46502c");
    px(ctx, b.x - 3, b.y, "#1a2210"); px(ctx, b.x + 2, b.y, "#1a2210"); // legs
  }
  text(ctx, "APHIDS! Click to squash the bugs.", 160, 14, "#ff9a9a", { size: 7, align: "center" });
  text(ctx, "Left: " + left, 160, 26, "#e0c98f", { size: 7, align: "center" });
  closeupButton(ctx, left ? "GIVE UP" : "DONE", () => finishPest(left === 0));
}

// --- Leaf-shine: rub the dust off Greg's leaves so he can photosynthesise ---
function openDustGame() {
  const patches = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2, r = 14 + Math.random() * 44;
    patches.push({ x: 160 + Math.cos(a) * r, y: 104 + Math.sin(a) * r * 0.8, rad: 9 + Math.random() * 4, dust: 1 });
  }
  G.closeup = { type: "dust", patches };
  sfx("page");
}
function updateDust(dt) {
  const c = G.closeup; if (!c) return;
  if (G.mouse.down) {
    for (const p of c.patches) if (p.dust > 0 && Math.hypot(p.x - G.mouse.x, p.y - G.mouse.y) < p.rad + 2) {
      p.dust = Math.max(0, p.dust - 2.6 * dt);
      if (Math.random() < 0.3) sfx("drip");
    }
  }
  if (c.patches.every(p => p.dust <= 0)) finishDust();
}
function finishDust() {
  G.greg.dust = 0; G.greg.growth += 1;            // a clean Greg photosynthesises better
  G.greg.stage = stageFor(G.greg.growth);
  G.closeup = null;
  sfx("grow"); toast("Leaves gleaming. Greg perks right up.", "#8fe39b");
}
function drawDust(ctx) {
  const c = G.closeup;
  drawCloseupFrame(ctx, gregMood(G.greg, false), gregDroop(G.greg));
  for (const p of c.patches) if (p.dust > 0) {
    ctx.fillStyle = `rgba(150,140,120,${0.5 * p.dust})`;
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; ctx.fillRect((p.x + Math.cos(a) * p.rad * Math.random()) | 0, (p.y + Math.sin(a) * p.rad * Math.random()) | 0, 2, 2); }
  }
  const left = c.patches.filter(p => p.dust > 0).length;
  text(ctx, "Dusty leaves! HOLD and rub to wipe them clean.", 160, 14, "#e0c98f", { size: 7, align: "center" });
  closeupButton(ctx, left ? "LEAVE" : "DONE", () => { G.closeup = null; });
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
  if (!night && G.modifier && G.modifier.id === "rainy") drawRain(ctx, 28, { x: 24, y: 18, w: 82, h: 60 });
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

// Goodbye tableau: you hand Greg to the new hire (full circle from the intro).
function drawGoodbyeScene(ctx) {
  drawOfficeBg(ctx);
  drawOfficeDesk(ctx);
  drawActor(ctx, 112, 166, ACTOR_SCALE, { skin: PLAYER_SKIN, dir: "right" });
  drawActor(ctx, 250, 162, ACTOR_SCALE, { skin: CREW.emil, dir: "left" });
}

// Intro tableau: a departing colleague hands Greg over in your flat.
function drawIntroScene(ctx) {
  drawApartment(ctx, { night: false });
  drawGreg(ctx, 152, 132, { scale: 1.0, stage: 2, mood: "content", t: G.t }); // Greg, on the counter
  drawActor(ctx, 232, 152, ACTOR_SCALE, { skin: CREW.oskar, dir: "left" });    // the colleague, leaving
}

// Office background: walls, window, floor, door — everything that never
// occludes the actors. The desk (with Greg) is a separate depth-sorted prop.
function drawOfficeBg(ctx) {
  rect(ctx, 0, 0, SCREEN_W, 128, "#cfd6cf");
  speckle(ctx, 0, 0, SCREEN_W, 128, "#c2cac2", 0.05, 9);
  frame(ctx, 150, 14, 150, 64, "#9aa39a");
  drawSky(ctx, 152, 16, 146, 60, false);
  for (let x = 152; x < 298; x += 22) rect(ctx, x, 58, 18, 18, "#7a8a9a");
  rect(ctx, 150, 44, 150, 3, "#9aa39a");
  rect(ctx, 0, 0, SCREEN_W, 6, "#00a98f");
  text(ctx, "TEAMTAILOR", 60, 11, "#1f8f7e", { size: 7 });
  rect(ctx, 0, 128, SCREEN_W, 40, "#9a8a6a");
  speckle(ctx, 0, 128, SCREEN_W, 40, "#8a7a5a", 0.06, 3);
  drawDoor(ctx, 8, 56, 34, 74, { color: "#6a7280" });
}

// The desk unit (occluder): surface, legs, monitor, keyboard, mug, and Greg.
function drawOfficeDesk(ctx) {
  rect(ctx, 60, 118, 168, 10, "#7a5a36");
  rect(ctx, 66, 128, 8, 30, "#5f3c1d");
  rect(ctx, 214, 128, 8, 30, "#5f3c1d");
  drawMonitor(ctx, 78, 90, 1.6, true);
  rect(ctx, 96, 116, 40, 6, "#c8c8d0");
  sprite(ctx, MUG, 150, 106, { scale: 1.6 });
  drawGreg(ctx, 196, 118, { scale: 1.5, stage: G.greg.stage, droop: gregDroop(G.greg), mood: gregMood(G.greg, false), t: G.t, bloom: G.greg.bloom });
  // afflictions, visible on the desk so you can spot them
  if (G.greg.dust >= 0.6) for (let i = 0; i < 14; i++) { const s = (i * 9301 + 49) % 233280; px(ctx, 176 + (s % 40), 74 + ((s >> 4) % 36), "rgba(150,140,120,0.5)"); }
  if (G.greg.pests > 0) for (let i = 0; i < Math.min(6, G.greg.pests); i++) { const bx = 178 + (i * 53 % 38), byy = 80 + (i * 31 % 34) + Math.sin(G.t * 3 + i) * 1.5; rect(ctx, bx, byy, 3, 2, "#2c3a20"); }
}

// Used by the milestone card background — the full office in one call.
function drawOffice(ctx) { drawOfficeBg(ctx); drawOfficeDesk(ctx); }

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
  // rainy dusk sky
  for (let i = 0; i < 154; i++) rect(ctx, 0, i, SCREEN_W, 1, mix("#2a3038", "#10141a", i / 154));
  // gentle rain
  for (let i = 0; i < 60; i++) {
    let s = (i * 9301 + 49297) % 233280; const rx = (s % SCREEN_W);
    const ry = ((s * 0.013 + G.t * 90 + i * 7) % 200);
    rect(ctx, rx, ry, 1, 4, "rgba(150,170,190,0.30)");
  }
  // headstone with a rounded top
  const hx = 160, hy = 64, hw = 86;
  ctx.fillStyle = "#5a6068";
  ctx.beginPath();
  ctx.moveTo(hx - hw / 2, hy + 96);
  ctx.lineTo(hx - hw / 2, hy + 18);
  ctx.arc(hx, hy + 18, hw / 2, Math.PI, 0);
  ctx.lineTo(hx + hw / 2, hy + 96);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#4a5058";
  ctx.fillRect(hx - hw / 2 + 3, hy + 22, hw - 6, 70); // inset face
  ctx.fillStyle = "#5a6068";
  text(ctx, "R.I.P.", hx, hy + 10, "#cfd8d0", { size: 9, align: "center" });
  text(ctx, "GREG", hx, hy + 28, "#eafff0", { size: 10, align: "center" });
  text(ctx, "the office plant", hx, hy + 46, "#9aa89a", { size: 6, align: "center" });
  text(ctx, "survived " + card.survived + " day" + (card.survived === 1 ? "" : "s"), hx, hy + 60, "#e0c98f", { size: 7, align: "center" });
  if (card.survived >= G.best && card.survived > 0)
    text(ctx, "* a new personal best *", hx, hy + 74, "#8fe39b", { size: 7, align: "center" });
  // dirt mound + a wilted Greg laid to rest (far left)
  rect(ctx, 0, 154, SCREEN_W, 46, "#3a2a18");
  speckle(ctx, 0, 154, SCREEN_W, 46, "#2a1d10", 0.1, 6);
  drawGreg(ctx, 60, 176, { scale: 1.0, stage: G.greg.stage, droop: 1, mood: "dead", t: 0, bloom: false });
  // epitaph (right column, clear of the restart button)
  const lines = wrap(ctx, card.cause, 142, 7);
  lines.forEach((l, i) => text(ctx, l, 168, 156 + i * 10, "#bfb0a0", { size: 7, align: "left" }));
  // restart button (bottom-centre, low enough to clear the epitaph)
  const bw = 100, bh = 16, bx = hx - bw / 2, by = 182;
  const hot = hit(bx, by, bw, bh);
  rect(ctx, bx, by, bw, bh, hot ? "#8fe39b" : "#2c8540");
  frame(ctx, bx, by, bw, bh, "#0c140d");
  text(ctx, "TRY AGAIN", hx, by + 4, hot ? "#0a120a" : "#eafff0", { size: 8, align: "center" });
  G.hotspots.push({ x: bx, y: by, w: bw, h: bh, fn: card.onDone, btn: true });
}

function drawCursor(ctx) {
  const { x, y } = G.mouse;
  const c = (G.hover || G.hoverObj) ? "#8fe39b" : "#eafff0";
  rect(ctx, x - 4, y, 9, 1, c); rect(ctx, x, y - 4, 1, 9, c);
  rect(ctx, x, y, 1, 1, "#000");
}

// Soft darkened edges for depth/cohesion across the scenes.
function drawVignette(ctx) {
  const g = ctx.createRadialGradient(160, 96, 70, 160, 100, 186);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.26)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
}

// Falling rain. b = {x,y,w,h} bounds (defaults to full screen).
function drawRain(ctx, count, b) {
  b = b || { x: 0, y: 0, w: SCREEN_W, h: SCREEN_H };
  for (let i = 0; i < count; i++) {
    let s = (i * 9301 + 49297) % 233280;
    const rx = b.x + (s % b.w);
    const ry = b.y + ((s * 0.013 + G.t * 130 + i * 7) % b.h);
    rect(ctx, rx | 0, ry | 0, 1, 5, "rgba(175,195,215,0.28)");
  }
}

// A brief "— DAY N —" banner that fades as a new day opens.
function drawBanner(ctx) {
  if (!G.banner || G.t > G.banner.until) return;
  const left = G.banner.until - G.t;          // seconds remaining
  const a = Math.min(1, left * 1.5, (2.6 - left) * 3);
  const w = measure(ctx, G.banner.text, 12) + 24;
  ctx.globalAlpha = Math.max(0, a);
  rect(ctx, 160 - w / 2, 30, w, 22, "#0c140d");
  frame(ctx, 160 - w / 2, 30, w, 22, "#2c8540");
  text(ctx, G.banner.text, 160, 37, "#8fe39b", { size: 12, align: "center" });
  ctx.globalAlpha = 1;
}

/* --------------------------------------------------- player & verbs -- */
function updatePlayer(dt) {
  const p = G.player;
  if (!p) return;
  if (p.say && G.t > p.say.until) p.say = null;
  if (!p.walking) { p.anim = 0; return; }
  const dx = p.tx - p.x, dy = p.ty - p.y, dist = Math.hypot(dx, dy);
  const step = WALK_SPEED * dt;
  if (dist <= step) {
    p.x = p.tx; p.y = p.ty; p.walking = false; p.anim = 0;
    const pending = p.pending; p.pending = null;
    if (pending && pending.act) { if (pending.id === "greg" || pending.verb === "Tend") sfx("page"); pending.act(); }
    return;
  }
  p.x += dx / dist * step; p.y += dy / dist * step;
  if (Math.abs(dx) > 0.5) p.facing = dx < 0 ? -1 : 1;
  const prev = p.anim;
  p.anim += dt * 2.4;                         // ~2.4 strides/sec
  if ((p.anim | 0) !== (prev | 0)) sfx("walk");
}

// A speech bubble whose tail points down to (cx, anchorY).
function drawBubble(ctx, cx, anchorY, str, color = "#eafff0") {
  const lines = wrap(ctx, str, 150, 8);
  const w = Math.min(176, Math.max(...lines.map(l => measure(ctx, l, 8))) + 12);
  const h = lines.length * 10 + 7;
  const bx = Math.max(4, Math.min(SCREEN_W - 4 - w, cx - w / 2));
  const by = Math.max(2, anchorY - h - 4);
  rect(ctx, bx, by, w, h, "#0e1a12");
  frame(ctx, bx, by, w, h, "#2c8540");
  rect(ctx, Math.max(bx + 2, Math.min(bx + w - 4, cx - 1)), by + h, 2, 3, "#0e1a12"); // tail
  lines.forEach((l, i) => text(ctx, l, bx + w / 2, by + 4 + i * 10, color, { size: 8, align: "center" }));
}

// Draw a Maniac-rig actor with feet at (fx, fy). Returns the sprite's top Y.
function drawActor(ctx, fx, fy, scale, o = {}) {
  const drawW = ACTOR_W * scale, drawH = ACTOR_H * scale;
  const x = fx - drawW / 2, y = fy - drawH;
  actorShadow(ctx, fx, fy, ACTOR_W, scale);
  let frames, flip = false;
  if (o.walking && (o.dir === "left" || o.dir === "right")) {
    frames = (Math.floor(o.anim || 0) % 2 === 0) ? ACTOR.SIDE_A : ACTOR.SIDE_B;
    flip = o.dir === "left";
  } else if (o.dir === "back") frames = ACTOR.BACK;
  else if (o.dir === "left" || o.dir === "right") { frames = ACTOR.SIDE_A; flip = o.dir === "left"; }
  else frames = o.long ? ACTOR.FRONT_L : ACTOR.FRONT;
  const bob = o.walking ? Math.round(Math.sin((o.anim || 0) * Math.PI)) : 0;
  sprite(ctx, frames, x, y + bob, { scale, flip, override: o.skin });
  return y + bob;
}

// Actor bodies are drawn in a depth-sorted pass; bubbles come after (UI layer).
function playerScale() { return scaleAtY(G.scene, G.player.y); }
function drawPlayerBody(ctx) {
  const p = G.player;
  if (!p) return;
  const dir = p.walking ? (p.facing < 0 ? "left" : "right") : "front";
  drawActor(ctx, p.x, p.y, playerScale(), { skin: PLAYER_SKIN, dir, walking: p.walking, anim: p.anim });
}
function drawNpcBody(ctx, n) {
  const walking = !!(n.wander && n.moving);
  const dir = walking ? (n.face < 0 ? "left" : "right") : "front";
  drawActor(ctx, n.x, n.y, scaleAtY("office", n.y), { skin: n.skin, long: n.long, dir, walking, anim: n.wander ? n.wander.anim : 0 });
}

// All speech bubbles, drawn on top of the depth-sorted scene.
function drawBubbles(ctx) {
  const p = G.player;
  if (p && p.say) drawBubble(ctx, p.x, p.y - ACTOR_H * playerScale(), p.say.text, p.say.color);
  if (G.scene === "office") {
    if (!G.convo && G.gregSay && G.gregSay.text) drawBubble(ctx, 196, 50, G.gregSay.text, "#8fe39b");
    for (const n of (G.npcs || [])) if (G.npcSay && G.npcSay.id === n.id)
      drawBubble(ctx, n.x, n.y - ACTOR_H * scaleAtY("office", n.y), G.npcSay.text, "#cfe0ff");
  }
}

// Subtle targeting brackets around the object under the cursor (adventure feel).
function drawHoverBracket(ctx) {
  const o = G.hoverObj; if (!o) return;
  const c = "#8fe39b", L = 4, x = o.x, y = o.y, w = o.w, h = o.h;
  rect(ctx, x, y, L, 1, c); rect(ctx, x, y, 1, L, c);                                   // TL
  rect(ctx, x + w - L, y, L, 1, c); rect(ctx, x + w - 1, y, 1, L, c);                   // TR
  rect(ctx, x, y + h - 1, L, 1, c); rect(ctx, x, y + h - L, 1, L, c);                   // BL
  rect(ctx, x + w - L, y + h - 1, L, 1, c); rect(ctx, x + w - 1, y + h - L, 1, L, c);   // BR
}

// SCUMM-style sentence line: "Verb the thing" for whatever's under the cursor.
function drawSentence(ctx) {
  const y = SCREEN_H - 26;
  rect(ctx, 0, y, SCREEN_W, 12, "#0c140d");
  let s = G.hoverObj ? (G.hoverObj.sentence || `${G.hoverObj.verb} ${G.hoverObj.name}`) : (G.player && G.player.walking ? "Walking..." : "Walk");
  text(ctx, s, 160, y + 2, G.hoverObj ? "#8fe39b" : "#7a8a7a", { size: 7, align: "center" });
}

let sleepK = 0, sleeping = false;
function startSleep() {
  sleeping = true; sleepK = 0; sfx("snooze"); playMusic("home");
}

function commute(label, then, dusk) {
  G.scene = "commute";
  G.commuteEnd = G.t + 2.0;
  G.commuteLabel = label;
  G.commuteThen = then;
  G.commuteDusk = !!dusk;
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
  if (G.closeup) { const t = G.closeup.type; if (t === "pest") updatePest(dt); else if (t === "dust") updateDust(dt); else updateWatering(dt); }

  if (G.scene === "commute" && G.t >= G.commuteEnd) {
    const then = G.commuteThen; G.commuteThen = null; if (then) then();
  }

  if (G.scene === "night" && sleeping) {
    sleepK = Math.min(1, sleepK + dt * 0.8);
    if (sleepK >= 1) { sleeping = false; sleepK = 0; sleepAndRollover(); }
  }

  // walk the avatar (not while a close-up / sleep animation is running)
  if (["morning", "office", "night"].includes(G.scene) && !G.closeup && !sleeping) updatePlayer(dt);

  // coworkers: pace Bittan around (she pauses to chat), expire NPC speech
  if (G.scene === "office" && !G.closeup && !sleeping && G.npcs) {
    if (G.npcSay && G.t > G.npcSay.until) G.npcSay = null;
    for (const n of G.npcs) if (n.wander) {
      n.moving = !G.convo && !(G.npcSay && G.npcSay.id === n.id);   // stop to talk
      if (!n.moving) continue;
      n.x += n.wander.dir * 24 * dt; n.wander.anim += dt * 2.4;
      if (n.x > n.wander.max) { n.x = n.wander.max; n.wander.dir = -1; }
      if (n.x < n.wander.min) { n.x = n.wander.min; n.wander.dir = 1; }
      n.face = n.wander.dir;
    }
  }

  // ambient Greg one-liners while you potter at the office
  if (G.scene === "office" && !G.closeup && !G.card && !G.convo) {
    if (G.gregSay && G.t > G.gregSay.until) G.gregSay = null;
    if (!G.gregSay && G.t > (G.nextBark || 0)) {
      G.gregSay = { text: ambientGregLine(), until: G.t + 3.6 };
      G.nextBark = G.t + 7 + Math.random() * 8;
    }
  } else { G.gregSay = null; }

  if (G.toast && G.t > G.toast.until) G.toast = null;
}

function ambientGregLine() {
  const m = gregMood(G.greg, false);
  const idle = {
    thriving: ["This desk gets lovely afternoon light.", "Photosynthesis is going great, thanks for asking.", "Lagom. The only philosophy a plant needs.", "I heard the standup. Riveting stuff."],
    content:  ["Decent light today. I'll allow it.", "You're doing fine. We're both doing fine.", "Is it Friday yet? Plants lose track."],
    thirsty:  ["...not nagging, but. Water.", "My soil's getting a bit Saharan.", "A sip wouldn't go amiss, you know."],
    wilt:     ["...so thirsty...", "I see a light. It's just your monitor.", "Tell Bittan she was right about you."],
    rot:      ["I'm basically a soup now.", "Glug. Send a towel.", "Too. Much. Water."],
    dead:     [""],
  };
  const arr = idle[m] || idle.content;
  return arr[Math.floor(Math.random() * arr.length)];
}

function render() {
  const ctx = G.ctx;
  ctx.clearRect(0, 0, SCREEN_W, SCREEN_H);
  G.hotspots = [];
  G.sceneObjects = [];

  const play = ["morning", "office", "night"].includes(G.scene);

  // non-playable backgrounds (commute, cards, night sleep cutscene)
  if (G.scene === "commute") drawCommute(ctx);
  else if (G.scene === "credits") drawCredits(ctx);
  else if (G.scene === "night" && sleeping) drawNightSleep(ctx, sleepK);
  else if ((G.scene === "intro" || G.scene === "card") && G.card && G.card.bg) G.card.bg(ctx, G.card.bgOpts || {});

  // playable scenes: background, then a depth-sorted pass of furniture + actors
  if (play && !G.closeup && !sleeping) {
    G.sceneObjects = G.convo ? [] : objectsFor();   // no walking/hover mid-conversation
    if (G.scene === "office") {
      drawOfficeBg(ctx);
      if (!G.convo) drawHoverBracket(ctx);
      const items = [{ baseY: OFFICE_DESK_Y, draw: () => drawOfficeDesk(ctx) }];
      for (const n of (G.npcs || [])) items.push({ baseY: n.y, draw: () => drawNpcBody(ctx, n) });
      items.push({ baseY: G.player.y, draw: () => drawPlayerBody(ctx) });
      items.sort((a, b) => a.baseY - b.baseY);
      for (const it of items) it.draw(ctx);
    } else {
      drawApartment(ctx, { night: G.scene === "night" });
      if (!G.convo) drawHoverBracket(ctx);
      drawPlayerBody(ctx);
    }
    drawVignette(ctx);
    drawBubbles(ctx);
    if (G.convo) drawConvo(ctx); else drawSentence(ctx);
    drawHUD(ctx);
    drawBanner(ctx);
  } else if (play && !G.closeup) {  // sleeping
    drawHUD(ctx);
  } else if (G.scene === "commute") {
    drawVignette(ctx);
  }

  if (G.closeup) { const t = G.closeup.type; if (t === "pest") drawPest(ctx); else if (t === "dust") drawDust(ctx); else drawWatering(ctx); }
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
  const dusk = G.commuteDusk;
  // sky
  for (let i = 0; i < 134; i++) rect(ctx, 0, i, SCREEN_W, 1, dusk ? mix("#f4a85e", "#3a3a66", i / 134) : mix("#bfe6f2", "#eaf4dd", i / 134));
  if (dusk) { rect(ctx, 40, 58, 16, 16, "#ff8a3a"); rect(ctx, 38, 60, 16, 14, "#ffae5a"); }
  else { rect(ctx, 258, 22, 12, 12, "#f7e08a"); rect(ctx, 256, 24, 12, 12, "#ffe9a0"); }
  // grass verge / horizon
  rect(ctx, 0, 108, SCREEN_W, 26, dusk ? "#384a3c" : "#7ca86a");
  // far parallax: cathedral + low buildings
  const far = (G.t * 12) % 160;
  for (let x = -160; x < SCREEN_W + 160; x += 160) {
    const bx = x - far;
    drawCathedral(ctx, bx + 56, 110, 1, dusk ? "#564a6a" : "#9aa6b8");
    rect(ctx, bx + 4, 90, 28, 20, dusk ? "#46406a" : "#aab4c2");
    rect(ctx, bx + 116, 94, 26, 16, dusk ? "#46406a" : "#aab4c2");
  }
  // mid buildings (closer, faster)
  const mid = (G.t * 58) % 64;
  for (let x = -64; x < SCREEN_W + 64; x += 64) {
    const bx = x - mid, h = 30 + ((Math.abs(x) * 13) % 22);
    rect(ctx, bx + 8, 118 - h, 42, h, dusk ? "#352f50" : "#8a93a6");
    for (let wy = 0; wy < h - 8; wy += 8) for (let wx = 0; wx < 3; wx++) rect(ctx, bx + 13 + wx * 12, 118 - h + 5 + wy, 4, 4, dusk ? "#f3c46a" : "#dfeaf4");
  }
  // road + scrolling markings
  rect(ctx, 0, 134, SCREEN_W, 66, "#54505c");
  rect(ctx, 0, 134, SCREEN_W, 3, "#6a6674");
  const mk = (G.t * 150) % 64;
  for (let x = -64; x < SCREEN_W; x += 64) rect(ctx, x + (64 - mk), 166, 32, 4, "#e6e6d0");
  // the cyclist, bobbing over the cobbles
  const bob = Math.sin(G.t * 9) * 2;
  drawBike(ctx, 160, 152 + bob, 1.9, G.t * 11);
  drawActor(ctx, 160, 156 + bob, 1.6, { skin: PLAYER_SKIN, dir: "right", walking: true, anim: G.t * 3 });
  if (G.modifier && G.modifier.id === "rainy") drawRain(ctx, 70);
  // caption
  text(ctx, G.commuteLabel || "", 160, 18, "#10140a", { size: 8, align: "center", shadow: false });
  text(ctx, G.commuteLabel || "", 160, 17, dusk ? "#fff0d6" : "#1f3a2a", { size: 8, align: "center" });
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

  // close-up minigames: a corner button always wins; otherwise per type
  if (G.closeup) {
    const overBtn = G.hotspots.find(z => z.btn && hit(z.x, z.y, z.w, z.h));
    if (overBtn) { overBtn.fn(); return; }
    const t = G.closeup.type;
    if (t === "pest") squashAt(G.mouse.x, G.mouse.y);
    else if (t === "water") G.closeup.pouring = true;
    // (dust rubs while the mouse is held — handled in updateDust)
    return;
  }
  // an open conversation: click a topic (menu) or advance a line (play)
  if (G.convo) {
    if (G.convo.mode === "play") { advanceConvo(); return; }
    const z = G.hotspots.find(h => hit(h.x, h.y, h.w, h.h)); // fresh hit-test
    if (z && z.fn) z.fn();
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
  if (G.scene === "credits") {
    if (G.t - G.credits.start >= 73) { G.greg = freshGreg(); G.day = 1; startIntro(); }
    return;
  }
  // playable scenes: left-click = walk over & use; right-click = examine.
  if (["morning", "office", "night"].includes(G.scene) && !sleeping) {
    const obj = objectAt(G.mouse.x, G.mouse.y);   // compute fresh (avoid stale hover)
    const f = FLOOR[G.scene];
    if (obj && e.button === 2) { sfx("talk"); G.player.facing = obj.walkX < G.player.x ? -1 : 1; lookAt(obj); }
    else if (obj) { sfx("verb"); walkTo(obj.walkX, obj.walkY != null ? obj.walkY : f.nearY - 6, obj); }
    else if (e.button !== 2) walkTo(G.mouse.x, G.mouse.y, null);
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
  c.addEventListener("contextmenu", (e) => e.preventDefault()); // enable right-click "look"
  window.addEventListener("mouseup", onUp);
  c.addEventListener("touchstart", (e) => { onDown(e); e.preventDefault(); }, { passive: false });
  c.addEventListener("touchmove", (e) => { onMove(e); e.preventDefault(); }, { passive: false });
  window.addEventListener("touchend", (e) => { onUp(e); });

  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === " ") {
      e.preventDefault();
      if (G.closeup) { if (G.closeup.type === "water" && !spaceDown) { G.closeup.pouring = true; spaceDown = true; } return; }
      if (G.convo && G.convo.mode === "play") { advanceConvo(); return; }
      if ((G.scene === "intro" || G.scene === "card") && G.card && !G.card.funeral) advanceCard();
      else if (G.scene === "gameover" && G.card && G.card.onDone) G.card.onDone();
    }
    if (k === "enter") {
      if (G.closeup) { if (G.closeup.type === "water") commitWatering(); return; }
      if (G.convo && G.convo.mode === "play") { advanceConvo(); return; }
      if ((G.scene === "intro" || G.scene === "card") && G.card && !G.card.funeral) advanceCard();
      else if (G.scene === "gameover" && G.card && G.card.onDone) G.card.onDone();
    }
    if (k === "escape" && G.convo) closeConvo();
    if (k === "h") flashHint("click to walk · click to use · right-click Greg to chat · talk to coworkers · hold to pour");
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === " ") { spaceDown = false; if (G.closeup) G.closeup.pouring = false; }
  });
}

// Debug/test hooks (used by the test harnesses to reach scenes/dialogue).
G.__office = goOffice;
G.__night = goNight;
G.__pick = pickTopic;
G.__closeConvo = closeConvo;
G.__talk = talkToNpc;
G.__talkGreg = talkToGreg;
G.__pest = openPestGame;
G.__dust = openDustGame;
G.__rollover = sleepAndRollover;
G.__win = winGame;
