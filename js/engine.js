// engine.js — the SCUMM-style adventure engine: input, walking with depth,
// the verb/inventory UI, speech, dialogue choices, cutscenes and rendering.
import { rect, frame, sprite, mix } from "./pixel.js";
import {
  ROOM_W, ROOM_H, ACTOR, ACTOR_W, ACTOR_H, SKINS, ICONS, actorShadow,
  drawPortrait, TEAM,
} from "./art.js";
import { sfx, playMusic } from "./audio.js";

export const SCREEN_W = 320, SCREEN_H = 200;
const PANEL_Y = ROOM_H + 1;              // 137
const SENT_Y = ROOM_H + 2;               // sentence line baseline area

// Verb grid: id -> handler property + label, laid out 3 columns x 3 rows.
export const VERBS = [
  { id: "open",   prop: "open",   label: "Open" },
  { id: "look",   prop: "look",   label: "Look at" },
  { id: "push",   prop: "push",   label: "Push" },
  { id: "close",  prop: "close",  label: "Close" },
  { id: "pickup", prop: "pickup", label: "Pick up" },
  { id: "pull",   prop: "pull",   label: "Pull" },
  { id: "give",   prop: "give",   label: "Give" },
  { id: "use",    prop: "use",    label: "Use" },
  { id: "talk",   prop: "talk",   label: "Talk to" },
];
const TWO_OBJECT = { use: "with", give: "to" };

const DEFAULTS = {
  look: "Looks perfectly ordinary.",
  open: "I can't open that.",
  close: "It's not something I can close.",
  push: "It won't budge.",
  pull: "Nothing happens.",
  pickup: "I can't pick that up.",
  talk: "It's not much of a conversationalist.",
  use: "That doesn't seem to work.",
  give: "I'd rather hold on to that.",
};

export const G = {
  ctx: null, canvas: null, fontReady: false,
  scene: "select",                 // select | play | end
  rooms: {}, items: {},
  state: null,
  player: null,                    // the currently-controlled crew member
  party: [],                       // the selected squad of 3 (switchable, MM-style)
  bench: [],                       // teammates not picked — they show up at AW
  selected: [],                    // ids chosen on the select screen
  activeIndex: 0,
  actors: [],                      // room NPCs (non-party)
  camX: 0,                         // side-scroll camera offset (world->screen)
  verb: "walkto",
  primary: null,                   // first selected target for two-object verbs
  hover: null,
  mouse: { x: 160, y: 80, down: false },
  speech: [],                      // queue of {actorId,text,until,color}
  current: null,
  choices: null,                   // {prompt, list:[{text,fn}]}
  cs: null,                        // cutscene runner
  fade: 0, fadeDir: 0, fadeCb: null,
  t: 0, last: 0,
  flash: null,
  ending: null,
  onWin: null,
  card: null,                      // full-screen cutscene card {draw, lines, until}
  nextBark: 0,                     // ambient one-liner scheduler
  runStart: null, runTime: null,   // overall speedrun timer
  heistStart: null, vaultClock: null, // the 90-minute escape clock
};

/* ---------------------------------------------------------------- boot -- */
export function boot(canvas, content) {
  G.canvas = canvas;
  G.ctx = canvas.getContext("2d");
  G.ctx.imageSmoothingEnabled = false;
  G.rooms = content.rooms;
  G.items = content.items;
  G.onWin = content.onWin;
  G.state = {
    room: null,
    inventory: [],
    flags: {},
  };
  bindInput();
  requestAnimationFrame(loop);
}

export function setFontReady() { G.fontReady = true; }

/* ------------------------------------------------------------- helpers -- */
function fontPx(size) { return `${size}px PressStart2P, monospace`; }

function text(ctx, str, x, y, color, opts = {}) {
  ctx.font = fontPx(opts.size || 8);
  ctx.textBaseline = "top";
  ctx.textAlign = opts.align || "left";
  if (opts.shadow !== false) {
    ctx.fillStyle = "#000";
    ctx.fillText(str, x + 1, y + 1);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}
function measure(ctx, str, size = 8) { ctx.font = fontPx(size); return ctx.measureText(str).width; }

function wrap(ctx, str, maxW, size = 8) {
  ctx.font = fontPx(size);
  const words = str.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/* --------------------------------------------------------- public API --- */
G.setFlag = (k, v = true) => { G.state.flags[k] = v; };
G.flag = (k) => !!G.state.flags[k];
G.has = (id) => G.state.inventory.includes(id);

G.addItem = (id) => {
  if (!G.has(id)) { G.state.inventory.push(id); sfx("pickup"); }
};
G.removeItem = (id) => {
  G.state.inventory = G.state.inventory.filter((x) => x !== id);
};

G.say = (actorId, str) => {
  const a = actorId === "player" ? G.player : findActor(actorId);
  const color = a ? a.speechColor : "#f6f6fb";
  const dur = Math.min(5200, Math.max(1300, str.length * 55));
  G.speech.push({ actorId, text: str, dur, color, until: 0 });
};
G.sayLines = (actorId, lines) => lines.forEach((l) => G.say(actorId, l));

G.gotoRoom = (id, opts = {}) => {
  fadeTo(() => enterRoom(id, opts));
};

G.win = (payload) => {
  if (G.runStart != null && G.runTime == null) G.runTime = G.t - G.runStart;
  G.ending = payload; G.scene = "end"; sfx("win"); playMusic("bar");
};

// Spawn an NPC into the current room (used by content for dynamic colleagues).
G.spawnActor = (def) => { const a = makeActor(def); G.actors.push(a); return a; };

// Object display names may be strings or G-aware functions.
function objName(o) { return typeof o.name === "function" ? o.name(G) : o.name; }

/* ------------------------------------------------------------- rooms ---- */
function enterRoom(id, opts) {
  const room = G.rooms[id];
  if (!room) return;
  G.state.room = id;
  G.actors = [];
  // build NPC actors
  (room.actors || []).forEach((def) => {
    if (def.when && !def.when(G)) return;
    G.actors.push(makeActor(def));
  });
  // place the whole crew, spread out a little; active stays near the start
  const start = (opts.at) || room.start || { x: 60, y: 124 };
  const dir = start.dir || "right";
  const w = room.width || ROOM_W;
  G.party.forEach((p, i) => {
    p.x = Math.max(12, Math.min(w - 12, start.x + (i - G.activeIndex) * 15));
    p.y = start.y; p.target = null; p.onArrive = null; p.dir = dir;
  });
  if (G.player) { G.player.x = start.x; }
  // snap camera to the active member
  G.camX = Math.max(0, Math.min(w - ROOM_W, (G.player ? G.player.x : 160) - ROOM_W / 2));
  G.verb = "walkto"; G.primary = null;
  if (room.music) playMusic(room.music);
  if (room.onEnter) room.onEnter(G, opts);
}

function makeActor(def) {
  const skin = SKINS[def.skin] || {};
  const meta = TEAM.find((m) => m.id === def.id) || {};
  return {
    id: def.id, kind: def.kind || "human", skin,
    name: def.name || meta.name || def.id,
    role: def.role || meta.role || "",
    long: def.long !== undefined ? def.long : !!meta.long,
    x: def.x, y: def.y, dir: def.dir || "front",
    frame: 0, anim: 0, target: null, onArrive: null,
    scale: def.scale || null,
    speechColor: def.speechColor || (skin.t ? skin.t : "#f6f6fb"),
    bob: 0,
  };
}

function findActor(id) {
  if (id === "player") return G.player;
  return G.party.find((a) => a.id === id) || G.actors.find((a) => a.id === id) || null;
}

// Switch which crew member you control (Maniac-Mansion "New Kid").
G.switchTo = (i) => {
  if (typeof i === "string") i = G.party.findIndex((p) => p.id === i);
  if (i < 0 || i >= G.party.length || i === G.activeIndex) return;
  G.activeIndex = i;
  G.player = G.party[i];
  G.player.target = null;
  G.primary = null;
  sfx("select");
};
G.activeId = () => (G.player ? G.player.id : null);
G.activeName = () => (G.player ? G.player.name : "");

// Build the chosen squad of 3 and start the night.
function beginAdventure(ids) {
  sfx("coin");
  G.party = ids.map((id) => {
    const m = TEAM.find((t) => t.id === id);
    return makeActor({ id, skin: m.skin, x: 40, y: 124, dir: "right" });
  });
  G.bench = TEAM.filter((t) => !ids.includes(t.id)).map((m) => ({ id: m.id, name: m.name, skin: m.skin, long: m.long, role: m.role }));
  G.activeIndex = 0;
  G.player = G.party[0];
  fadeTo(() => { enterRoom("office", {}); G.scene = "play"; G.runStart = G.t; G.nextBark = G.t + 8; });
}

// The 90-minute escape clock, ticked at 6× so it visibly counts down.
const ESCAPE_BUDGET = 90 * 60;   // displayed seconds (90:00)
G.escapeLeft = () => {
  if (G.heistStart == null) return ESCAPE_BUDGET;
  if (G.vaultClock != null) return G.vaultClock;
  return Math.max(0, ESCAPE_BUDGET - (G.t - G.heistStart) * 6);
};

// any party member standing within a world-x band (for co-op puzzles)
G.partyOnArea = (x1, x2) => G.party.some((p) => p.x >= x1 && p.x <= x2);
G.inParty = (id) => G.party.some((p) => p.id === id);

function roomScale(y) {
  const room = G.rooms[G.state.room];
  if (!room) return 1.5;
  const wb = room.walk;
  if (!wb) return 1.6;
  const t = Math.max(0, Math.min(1, (y - wb.minY) / (wb.maxY - wb.minY)));
  return wb.scaleMin + (wb.scaleMax - wb.scaleMin) * t;
}

/* ------------------------------------------------------------- input ---- */
function bindInput() {
  const c = G.canvas;
  const toLocal = (e) => {
    const r = c.getBoundingClientRect();
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const py = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    G.mouse.x = Math.max(0, Math.min(SCREEN_W - 1, (px / r.width) * SCREEN_W));
    G.mouse.y = Math.max(0, Math.min(SCREEN_H - 1, (py / r.height) * SCREEN_H));
  };
  c.addEventListener("mousemove", toLocal);
  c.addEventListener("mousedown", (e) => { toLocal(e); onClick(); });
  c.addEventListener("touchstart", (e) => { toLocal(e); onClick(); e.preventDefault(); }, { passive: false });
  c.addEventListener("touchmove", (e) => { toLocal(e); e.preventDefault(); }, { passive: false });
  window.addEventListener("keydown", onKey);
}

function onKey(e) {
  if (e.key === "Escape" && G.choices) { G.choices = null; return; }
  if (G.scene !== "play" || G.cs) return;
  if (e.key >= "1" && e.key <= "9") { const i = +e.key - 1; if (i < G.party.length) G.switchTo(i); }
  else if (e.key === "Tab") { e.preventDefault(); G.switchTo((G.activeIndex + 1) % G.party.length); }
  else if (e.key.toLowerCase() === "h") askHint();
}

// portrait bar geometry (screen space, top-left)
const PORT_X = 3, PORT_Y = 2, PORT_S = 16, PORT_GAP = 18;
function portraitAt(x, y) {
  if (y < PORT_Y || y > PORT_Y + PORT_S) return -1;
  for (let i = 0; i < G.party.length; i++) {
    const px0 = PORT_X + i * PORT_GAP;
    if (x >= px0 && x < px0 + PORT_S) return i;
  }
  return -1;
}
function partyAt(wx, wy) {
  for (let i = 0; i < G.party.length; i++) {
    const a = G.party[i];
    const sc = a.scale || roomScale(a.y);
    const w = ACTOR_W * sc, h = ACTOR_H * sc;
    if (wx >= a.x - w / 2 && wx <= a.x + w / 2 && wy >= a.y - h && wy <= a.y) return i;
  }
  return -1;
}

/* ----- squad-of-3 selection ----- */
const SEL_Y0 = 44, SEL_Y1 = 116, START_Y = 168, START_H = 22, START_HW = 84;
function clickSelect(x, y) {
  const n = TEAM.length, cw = SCREEN_W / n;
  if (y > SEL_Y0 && y < SEL_Y1) {
    const i = Math.floor(x / cw);
    if (i >= 0 && i < n) toggleSelect(TEAM[i].id);
    return;
  }
  if (G.selected.length === 3 && y >= START_Y && y <= START_Y + START_H &&
      x >= SCREEN_W / 2 - START_HW && x <= SCREEN_W / 2 + START_HW) {
    beginAdventure(G.selected.slice());
  }
}
function toggleSelect(id) {
  const k = G.selected.indexOf(id);
  if (k >= 0) { G.selected.splice(k, 1); sfx("verb"); }
  else if (G.selected.length < 3) { G.selected.push(id); sfx("select"); }
  else { sfx("error"); }
}

// Oskar (co-pilot) offers a contextual hint.
function askHint() {
  const room = G.rooms[G.state.room];
  const h = room && room.hint ? room.hint(G) : null;
  G.hintMsg = { text: "Oskar: " + (h || "Looking good. Onward to AW!"), until: G.t + 4.5 };
  sfx("talk");
}

function onClick() {
  const { x, y } = G.mouse;

  if (G.scene === "select") { clickSelect(x, y); return; }
  if (G.scene === "end") { if (G.ending && G.ending.replay) location.reload(); return; }

  // a cutscene card: click to skip it
  if (G.card) { G.card.until = 0; return; }
  // skip speech first
  if (G.current) { G.current.until = 0; return; }
  if (G.speech.length) return;
  if (G.cs) return;                          // locked during cutscenes

  // dialogue choices take priority
  if (G.choices) { clickChoice(x, y); return; }

  // portrait bar = switch character
  const pi = portraitAt(x, y);
  if (pi >= 0) { G.switchTo(pi); return; }

  if (y < ROOM_H) {
    const wx = x + G.camX, wy = y;
    // click another crew member to take control of them
    const who = partyAt(wx, wy);
    if (who >= 0 && who !== G.activeIndex) { G.switchTo(who); return; }
    clickRoom(wx, wy);
    return;
  }
  // panel
  clickVerb(x, y);
  clickInventory(x, y);
}

/* --------------------------------------------------------- room click --- */
function clickRoom(x, y) {
  const obj = objectAt(x, y);
  if (G.choices) return;

  if (obj) {
    // determine verb to apply
    let verb = G.verb === "walkto" ? (obj.defaultVerb || "look") : G.verb;
    const target = targetFromObject(obj);

    if (TWO_OBJECT[verb] && !G.primary) {
      // first object of a two-object command
      G.primary = target;
      sfx("verb");
      return;
    }
    // walk to the object then act
    const wt = obj.walkTo || { x: clampX(obj.x + obj.w / 2), y: G.player.y };
    walkPlayer(wt.x, wt.y, () => {
      faceToward(G.player, obj.x + obj.w / 2);
      if (TWO_OBJECT[verb] && G.primary) {
        const a = G.primary; const b = target; G.primary = null;
        execTwo(verb, a, b);
        G.verb = "walkto";
      } else {
        exec(verb, target, null);
        G.verb = "walkto";
      }
    });
    return;
  }

  // empty floor -> walk
  if (G.primary) { G.primary = null; G.verb = "walkto"; }
  walkPlayer(x, y, null);
}

function targetFromObject(obj) { return { id: obj.id, name: objName(obj), obj }; }

/* ---------------------------------------------------------- inventory --- */
function clickInventory(x, y) {
  const item = invAt(x, y);
  if (!item) return;
  const target = { id: item, name: G.items[item].name, obj: G.items[item] };
  let verb = G.verb === "walkto" ? (G.items[item].defaultVerb || "look") : G.verb;

  if (TWO_OBJECT[verb] && !G.primary) { G.primary = target; sfx("verb"); return; }
  if (TWO_OBJECT[verb] && G.primary) {
    const a = G.primary; G.primary = null; execTwo(verb, a, target); G.verb = "walkto"; return;
  }
  exec(verb, target, null); G.verb = "walkto";
}

function invAt(x, y) {
  const inv = G.state.inventory;
  for (let i = 0; i < inv.length; i++) {
    const ix = INV_X + (i % INV_COLS) * 20;
    const iy = INV_Y + Math.floor(i / INV_COLS) * 18;
    if (x >= ix && x < ix + 18 && y >= iy && y < iy + 16) return inv[i];
  }
  return null;
}

/* -------------------------------------------------------------- verbs --- */
const VERB_X = 4, VERB_Y = PANEL_Y + 12, VERB_CW = 67, VERB_CH = 16;
const INV_X = 214, INV_Y = PANEL_Y + 12, INV_COLS = 5;

function verbAt(x, y) {
  if (x < VERB_X || x > VERB_X + VERB_CW * 3) return null;
  if (y < VERB_Y || y > VERB_Y + VERB_CH * 3) return null;
  const col = Math.floor((x - VERB_X) / VERB_CW);
  const row = Math.floor((y - VERB_Y) / VERB_CH);
  const idx = row * 3 + col;
  return VERBS[idx] || null;
}
function clickVerb(x, y) {
  const v = verbAt(x, y);
  if (!v) return;
  G.verb = v.id; G.primary = null; sfx("verb");
}

/* ----------------------------------------------------------- execute ---- */
function exec(verbId, target, second) {
  const prop = (VERBS.find((v) => v.id === verbId) || {}).prop || verbId;
  const handler = target.obj[prop];
  if (typeof handler === "function") {
    const r = handler(G, second);
    if (typeof r === "string") G.say("player", r);
    else if (Array.isArray(r)) G.sayLines("player", r);
  } else {
    G.say("player", DEFAULTS[verbId] || "Hm.");
  }
}

function execTwo(verbId, a, b) {
  // a = item/object held, b = target
  let handler = null, arg = null;
  if (verbId === "use") {
    if (b.obj.useWith && b.obj.useWith[a.id]) { handler = b.obj.useWith[a.id]; }
    else if (a.obj.useWith && a.obj.useWith[b.id]) { handler = a.obj.useWith[b.id]; }
  } else if (verbId === "give") {
    if (b.obj.give && typeof b.obj.give === "object" && b.obj.give[a.id]) handler = b.obj.give[a.id];
  }
  if (handler) {
    const r = handler(G);
    if (typeof r === "string") G.say("player", r);
    else if (Array.isArray(r)) G.sayLines("player", r);
  } else {
    sfx("error");
    if (verbId === "use") G.say("player", `I can't use ${a.name} on ${b.name}.`);
    else G.say("player", `${b.name} doesn't want my ${a.name}.`);
  }
}

/* ----------------------------------------------------------- objects ---- */
function objectAt(x, y) {
  const room = G.rooms[G.state.room];
  if (!room) return null;
  const list = room.objects || [];
  // iterate top-most last; pick the smallest matching for precision
  let best = null, bestArea = Infinity;
  for (const o of list) {
    if (o.visible && !o.visible(G)) continue;
    if (x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h) {
      const area = o.w * o.h;
      if (area < bestArea) { best = o; bestArea = area; }
    }
  }
  return best;
}

/* ----------------------------------------------------------- walking ---- */
function clampX(x) {
  const wb = G.rooms[G.state.room].walk;
  if (!wb) return x;
  return Math.max(wb.minX, Math.min(wb.maxX, x));
}
function walkPlayer(x, y, onArrive) {
  const wb = G.rooms[G.state.room].walk;
  let tx = x, ty = y;
  if (wb) {
    tx = Math.max(wb.minX, Math.min(wb.maxX, x));
    ty = Math.max(wb.minY, Math.min(wb.maxY, Math.min(y, ROOM_H - 2)));
  }
  G.player.target = { x: tx, y: ty };
  G.player.onArrive = onArrive;
}
function faceToward(a, x) { a.dir = x < a.x ? "left" : "right"; }

function updateActor(a, dt) {
  if (a.target) {
    const dx = a.target.x - a.x, dy = a.target.y - a.y;
    const dist = Math.hypot(dx, dy);
    const sc = roomScale(a.y);
    const speed = 46 * sc * dt;
    if (dist <= speed || dist < 1.2) {
      a.x = a.target.x; a.y = a.target.y;
      a.target = null; a.anim = 0;
      const cb = a.onArrive; a.onArrive = null;
      if (cb) cb();
    } else {
      a.x += (dx / dist) * speed;
      a.y += (dy / dist) * speed;
      if (Math.abs(dx) > Math.abs(dy) * 0.7) a.dir = dx < 0 ? "left" : "right";
      else a.dir = dy < 0 ? "back" : "front";
      a.anim += dt * 8;
      if (a === G.player && Math.random() < dt * 6) sfx("walk");
    }
  } else {
    a.anim = 0;
  }
  a.bob += dt;
}

/* ----------------------------------------------- ambient idle barks ---- */
// Occasionally a present teammate says a room-appropriate one-liner — only
// when nothing else is going on, so it never interrupts play.
function maybeBark(now, room) {
  if (!room || !room.barks || G.cs || G.choices || G.current || G.speech.length) return;
  if (now < G.nextBark) return;
  G.nextBark = now + 9 + Math.random() * 8;
  const here = [...G.party, ...G.actors];
  const barks = room.barks;
  // prefer a bark whose speaker is present; else attribute to a random teammate
  for (let tries = 0; tries < 6; tries++) {
    const b = barks[(Math.random() * barks.length) | 0];
    const id = Array.isArray(b) ? b[0] : null;
    const line = Array.isArray(b) ? b[1] : b;
    if (id) { if (here.some((a) => a.id === id)) { G.say(id, line); return; } continue; }
    const who = here[(Math.random() * here.length) | 0];
    if (who) { G.say(who.id, line); return; }
  }
}

/* -------------------------------------------------------------- speech -- */
function updateSpeech(now) {
  if (G.current) {
    if (now >= G.current.until) G.current = null;
  }
  if (!G.current && G.speech.length) {
    const s = G.speech.shift();
    s.until = now + s.dur;
    G.current = s;
    sfx("talk");
  }
}

/* ----------------------------------------------------------- choices ---- */
G.choose = (prompt, list) => { G.choices = { prompt, list }; };
function clickChoice(x, y) {
  const list = G.choices.list;
  const baseY = SCREEN_H - list.length * 11 - 4;
  for (let i = 0; i < list.length; i++) {
    const yy = baseY + i * 11;
    if (y >= yy && y < yy + 11) {
      const c = list[i];
      G.choices = null;
      sfx("select");
      if (c.fn) c.fn(G);
      return;
    }
  }
}

/* --------------------------------------------------------- cutscenes ---- */
G.cutscene = (steps) => {
  G.cs = { steps: steps.slice(), i: -1, until: 0, waiting: false };
  G.choices = null; G.primary = null;
  advanceCS();
};
function advanceCS() {
  if (!G.cs) return;
  G.cs.i++;
  if (G.cs.i >= G.cs.steps.length) { const done = G.cs.done; G.cs = null; if (done) done(); return; }
  const step = G.cs.steps[G.cs.i];
  G.cs.waiting = false;
  if (step.say) {
    G.say(step.say[0], step.say[1]);
    G.cs.mode = "speech";
  } else if (step.walk) {
    const a = step.walk[0] === "player" ? G.player : findActor(step.walk[0]);
    if (!a) { advanceCS(); return; }
    const wb = G.rooms[G.state.room].walk;
    let tx = step.walk[1], ty = step.walk[2];
    a.target = { x: tx, y: ty };
    a.onArrive = () => advanceCS();
    G.cs.mode = "walk";
  } else if (step.wait) {
    G.cs.mode = "wait"; G.cs.until = G.t + step.wait / 1000;
  } else if (step.card) {
    G.card = { draw: step.card.draw, lines: step.card.lines || [], until: G.t + (step.card.wait || 3000) / 1000 };
    G.cs.mode = "card";
  } else {
    if (step.do) step.do(G);
    if (step.flag) G.setFlag(step.flag[0], step.flag[1] === undefined ? true : step.flag[1]);
    if (step.sfx) sfx(step.sfx);
    if (step.music) playMusic(step.music);
    if (step.face) { const a = step.face[0] === "player" ? G.player : findActor(step.face[0]); if (a) a.dir = step.face[1]; }
    if (step.room) { fadeTo(() => { enterRoom(step.room, step.opts || {}); }); G.cs.mode = "wait"; G.cs.until = G.t + 0.7; return; }
    advanceCS(); return;
  }
}
function updateCS(now) {
  if (!G.cs) return;
  if (G.cs.mode === "speech") {
    if (!G.current && G.speech.length === 0) advanceCS();
  } else if (G.cs.mode === "wait") {
    if (now >= G.cs.until) advanceCS();
  } else if (G.cs.mode === "card") {
    if (now >= G.card.until) { G.card = null; advanceCS(); }
  }
  // walk handled by onArrive
}

/* ----------------------------------------------------------- fades ------ */
function fadeTo(cb) {
  G.fadeDir = 1; G.fadeCb = cb;
}
function updateFade(dt) {
  if (G.fadeDir === 1) {
    G.fade += dt * 3.2;
    if (G.fade >= 1) { G.fade = 1; G.fadeDir = -1; if (G.fadeCb) { G.fadeCb(); G.fadeCb = null; } }
  } else if (G.fadeDir === -1) {
    G.fade -= dt * 3.2;
    if (G.fade <= 0) { G.fade = 0; G.fadeDir = 0; }
  }
}

/* ============================================================== LOOP ==== */
function loop(ts) {
  const dt = Math.min(0.05, (ts - G.last) / 1000 || 0);
  G.last = ts; G.t = ts / 1000;
  const now = G.t;

  if (G.scene === "play" && G.state.room) {
    G.actors.forEach((a) => updateActor(a, dt));
    G.party.forEach((a) => updateActor(a, dt));
    updateSpeech(now);
    updateCS(now);
    const tickRoom = G.rooms[G.state.room];
    if (tickRoom && tickRoom.tick) tickRoom.tick(G);
    maybeBark(now, tickRoom);
    // smooth side-scroll camera follows the active crew member
    const room = G.rooms[G.state.room];
    const w = (room && room.width) || ROOM_W;
    const target = Math.max(0, Math.min(w - ROOM_W, (G.player ? G.player.x : 160) - ROOM_W / 2));
    G.camX += (target - G.camX) * Math.min(1, dt * 6);
    if (Math.abs(target - G.camX) < 0.5) G.camX = target;
  }
  updateFade(dt);
  updateHover();

  render();
  requestAnimationFrame(loop);
}

function updateHover() {
  if (G.scene !== "play") { G.hover = null; return; }
  const { x, y } = G.mouse;
  if (y < ROOM_H) {
    const o = objectAt(x + G.camX, y);
    G.hover = o ? { name: objName(o) } : null;
  } else {
    const v = verbAt(x, y);
    if (v) { G.hover = { name: v.label }; return; }
    const it = invAt(x, y);
    G.hover = it ? { name: G.items[it].name } : null;
  }
}

/* ============================================================ RENDER ==== */
function render() {
  const ctx = G.ctx;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, SCREEN_W, SCREEN_H);

  if (G.scene === "select") { renderSelect(ctx); renderCursor(ctx); return; }
  if (G.scene === "end") { renderEnding(ctx); return; }

  const room = G.rooms[G.state.room];
  const camX = Math.round(G.camX);
  // room background + actors, translated by the side-scroll camera
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, ROOM_W, ROOM_H); ctx.clip();
  ctx.translate(-camX, 0);
  if (room && room.paint) room.paint(ctx, G.t, G.state);
  const all = [...G.actors, ...G.party];
  all.sort((a, b) => a.y - b.y);
  all.forEach((a) => drawActor(ctx, a));
  // active-character marker (little bouncing chevron)
  if (G.player) {
    const sc = G.player.scale || roomScale(G.player.y);
    const mx = G.player.x, my = G.player.y - ACTOR_H * sc - 4 + Math.sin(G.t * 4) * 1.5;
    ctx.fillStyle = "#f2d04a";
    ctx.fillRect(mx - 2, my - 2, 5, 1); ctx.fillRect(mx - 1, my - 1, 3, 1); ctx.fillRect(mx, my, 1, 1);
  }
  ctx.restore();

  drawSpeech(ctx, camX);
  drawPortraits(ctx);
  drawHUD(ctx);
  drawHint(ctx);
  drawPanel(ctx);
  if (G.choices) drawChoices(ctx);
  if (G.card) drawCard(ctx);
  if (G.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${G.fade})`; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
  renderCursor(ctx);
}

function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return m + ":" + (s < 10 ? "0" + s : s);
}

// top-right run timer + (in the heist) the 90-minute escape clock
function drawHUD(ctx) {
  if (G.runStart != null) {
    const t = G.runTime != null ? G.runTime : G.t - G.runStart;
    text(ctx, "TIME " + fmtTime(t), SCREEN_W - 2, 2, "#8a93a6", { align: "right", size: 8 });
  }
  if (G.state.room === "heist" && !G.flag("escaped")) {
    const left = G.escapeLeft();
    const low = left < 15 * 60;
    const blink = low && (Math.sin(G.t * 6) > 0);
    text(ctx, "ESCAPE " + fmtTime(left), SCREEN_W / 2, 2, blink ? "#d23b2b" : low ? "#e8902f" : "#f2d04a", { align: "center", size: 8 });
  }
}

function drawCard(ctx) {
  ctx.fillStyle = "#06060c"; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  if (G.card.draw) G.card.draw(ctx, G.t);
  const lines = G.card.lines || [];
  const baseY = SCREEN_H - lines.length * 11 - 10;
  ctx.fillStyle = "rgba(6,6,12,0.7)"; ctx.fillRect(0, baseY - 4, SCREEN_W, lines.length * 11 + 8);
  lines.forEach((l, i) => text(ctx, l, SCREEN_W / 2, baseY + i * 11, "#f2d04a", { align: "center" }));
  if (Math.sin(G.t * 3) > 0) text(ctx, "click ▸", SCREEN_W - 4, SCREEN_H - 10, "#5a6678", { align: "right", size: 8 });
}

// portrait bar across the top — click (or 1-7) to switch crew member
function drawPortraits(ctx) {
  for (let i = 0; i < G.party.length; i++) {
    const m = G.party[i];
    const x = PORT_X + i * PORT_GAP;
    const active = i === G.activeIndex;
    ctx.fillStyle = active ? "#10343a" : "rgba(8,14,20,0.78)";
    ctx.fillRect(x - 1, PORT_Y - 1, PORT_S + 2, PORT_S + 2);
    drawPortrait(ctx, m.skin, x, PORT_Y, PORT_S, m.long);
    frame(ctx, x - 1, PORT_Y - 1, PORT_S + 2, PORT_S + 2, active ? "#f2d04a" : "#16323c");
    text(ctx, String(i + 1), x + 1, PORT_Y + PORT_S - 2, active ? "#f2d04a" : "#5a6678", { size: 8, shadow: true });
  }
  // active name + role
  if (G.player) {
    const nx = PORT_X + G.party.length * PORT_GAP + 4;
    text(ctx, G.player.name, nx, PORT_Y, "#f2d04a", { size: 8 });
    text(ctx, G.player.role, nx, PORT_Y + 9, "#34d0b4", { size: 8 });
  }
}

function drawHint(ctx) {
  if (!G.hintMsg || G.t > G.hintMsg.until) return;
  const lines = wrap(ctx, G.hintMsg.text, 300);
  const h = lines.length * 9 + 6;
  ctx.fillStyle = "rgba(8,14,20,0.85)";
  ctx.fillRect(8, ROOM_H - h - 4, SCREEN_W - 16, h);
  frame(ctx, 8, ROOM_H - h - 4, SCREEN_W - 16, h, "#e8902f");
  lines.forEach((l, i) => text(ctx, l, 14, ROOM_H - h + i * 9, "#f2d04a"));
}

function drawActor(ctx, a) {
  const sc = a.scale || roomScale(a.y);
  const w = ACTOR_W, h = ACTOR_H;
  const drawW = w * sc, drawH = h * sc;
  const x = a.x - drawW / 2;
  const y = a.y - drawH;
  actorShadow(ctx, a.x, a.y, w, sc);

  let frames, flip = false;
  const stepping = a.target != null;
  if (a.dir === "left" || a.dir === "right") {
    const f = stepping ? (Math.floor(a.anim) % 2 === 0 ? ACTOR.SIDE_A : ACTOR.SIDE_B) : ACTOR.SIDE_A;
    frames = f; flip = a.dir === "left";
  } else if (a.dir === "back") {
    frames = ACTOR.BACK;
  } else {
    frames = a.long ? ACTOR.FRONT_L : ACTOR.FRONT;
  }
  const bob = stepping ? Math.round(Math.sin(a.anim * Math.PI)) : 0;
  sprite(ctx, frames, x, y + bob, { scale: sc, flip, override: a.skin });
}

function drawSpeech(ctx, camX) {
  if (!G.current) return;
  const a = G.current.actorId === "player" ? G.player : findActor(G.current.actorId);
  const cx = a ? a.x - camX : SCREEN_W / 2;
  const topY = a ? (a.y - ACTOR_H * (a.scale || roomScale(a.y)) - 6) : 30;
  const maxW = 150;
  const lines = wrap(ctx, G.current.text, maxW);
  let ty = Math.max(2, topY - lines.length * 9);
  lines.forEach((ln) => {
    const w = measure(ctx, ln);
    let lx = cx - w / 2;
    lx = Math.max(2, Math.min(SCREEN_W - w - 2, lx));
    text(ctx, ln, Math.round(lx), Math.round(ty), G.current.color);
    ty += 9;
  });
}

function drawPanel(ctx) {
  // panel background
  ctx.fillStyle = "#0a0c12";
  ctx.fillRect(0, PANEL_Y - 1, SCREEN_W, SCREEN_H - PANEL_Y + 1);
  ctx.fillStyle = "#06212c";
  ctx.fillRect(0, PANEL_Y - 1, SCREEN_W, 1);

  // sentence line
  let sentence = verbLabel(G.verb);
  if (G.primary) {
    const conn = TWO_OBJECT[G.verb] || "";
    sentence += " " + G.primary.name + (conn ? " " + conn : "");
    if (G.hover) sentence += " " + G.hover.name;
  } else if (G.hover) {
    sentence += " " + G.hover.name;
  }
  text(ctx, sentence, 6, PANEL_Y + 1, "#34d0b4");

  // verbs grid
  for (let i = 0; i < VERBS.length; i++) {
    const col = i % 3, row = Math.floor(i / 3);
    const vx = VERB_X + col * VERB_CW, vy = VERB_Y + row * VERB_CH;
    const active = G.verb === VERBS[i].id;
    const hover = pointIn(G.mouse, vx, vy, VERB_CW, VERB_CH);
    text(ctx, VERBS[i].label, vx + 2, vy + 3, active ? "#f2d04a" : hover ? "#d6d6d0" : "#8a93a6");
  }
  // divider
  ctx.fillStyle = "#16323c"; ctx.fillRect(INV_X - 6, PANEL_Y + 10, 1, 44);

  // inventory
  const inv = G.state.inventory;
  for (let i = 0; i < inv.length; i++) {
    const ix = INV_X + (i % INV_COLS) * 20;
    const iy = INV_Y + Math.floor(i / INV_COLS) * 18;
    const sel = G.primary && G.primary.id === inv[i];
    ctx.fillStyle = sel ? "#1b4a40" : "#10202a";
    ctx.fillRect(ix - 1, iy - 1, 18, 17);
    if (ICONS[inv[i]]) sprite(ctx, ICONS[inv[i]], ix - 1, iy - 2, { scale: 1 });
  }
}

function verbLabel(id) {
  if (id === "walkto") return "Walk to";
  return (VERBS.find((v) => v.id === id) || { label: "Walk to" }).label;
}
function pointIn(p, x, y, w, h) { return p.x >= x && p.x < x + w && p.y >= y && p.y < y + h; }

function drawChoices(ctx) {
  const list = G.choices.list;
  const baseY = SCREEN_H - list.length * 11 - 4;
  ctx.fillStyle = "rgba(4,8,14,0.92)";
  ctx.fillRect(0, baseY - 2, SCREEN_W, SCREEN_H - baseY + 2);
  ctx.fillStyle = "#06212c"; ctx.fillRect(0, baseY - 3, SCREEN_W, 1);
  for (let i = 0; i < list.length; i++) {
    const yy = baseY + i * 11;
    const hover = G.mouse.y >= yy && G.mouse.y < yy + 11;
    text(ctx, (i + 1) + ". " + list[i].text, 6, yy + 1, hover ? "#f2d04a" : "#9fe0d6");
  }
}

function renderCursor(ctx) {
  const { x, y } = G.mouse;
  const c = G.hover ? "#f2d04a" : "#34d0b4";
  ctx.fillStyle = c;
  ctx.fillRect(x - 4, y, 3, 1); ctx.fillRect(x + 2, y, 3, 1);
  ctx.fillRect(x, y - 4, 1, 3); ctx.fillRect(x, y + 2, 1, 3);
  ctx.fillStyle = "#000"; ctx.fillRect(x, y, 1, 1);
}

/* ---------------------------------------------------- select / ending -- */
function renderSelect(ctx) {
  ctx.fillStyle = "#0a0816"; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  for (let i = 0; i < 70; i++) {
    const sx = (i * 73) % SCREEN_W, sy = (i * 137) % SCREEN_H;
    ctx.fillStyle = i % 5 ? "#1c1c30" : "#33335a"; ctx.fillRect(sx, sy, 1, 1);
  }
  text(ctx, "THE HEIST AFTER WORK", SCREEN_W / 2, 8, "#f2d04a", { align: "center" });
  text(ctx, "Pick your squad of 3", SCREEN_W / 2, 24, "#34d0b4", { align: "center" });

  const n = TEAM.length, cw = SCREEN_W / n;
  let hi = -1;
  for (let i = 0; i < n; i++) {
    const m = TEAM[i];
    const cx = cw * i + cw / 2;
    const sel = G.selected.includes(m.id);
    const hover = G.mouse.x > cw * i && G.mouse.x < cw * (i + 1) && G.mouse.y > SEL_Y0 && G.mouse.y < SEL_Y1;
    if (sel) { ctx.fillStyle = "rgba(242,208,74,0.16)"; ctx.fillRect(cw * i + 1, SEL_Y0, cw - 2, SEL_Y1 - SEL_Y0); }
    else if (hover) { ctx.fillStyle = "rgba(0,169,143,0.12)"; ctx.fillRect(cw * i + 1, SEL_Y0, cw - 2, SEL_Y1 - SEL_Y0); }
    if (hover) hi = i;
    sprite(ctx, m.long ? ACTOR.FRONT_L : ACTOR.FRONT, cx - ACTOR_W * 1.25 / 2, 50, { scale: 1.25, override: SKINS[m.skin] });
    text(ctx, m.name, cx, 98, sel ? "#f2d04a" : hover ? "#f6f6fb" : "#d6d6d0", { align: "center", size: 8 });
    if (sel) { // hand-drawn check mark (no font glyph needed)
      ctx.fillStyle = "#f2d04a";
      ctx.fillRect(cx - 4, SEL_Y0 + 5, 2, 2); ctx.fillRect(cx - 2, SEL_Y0 + 7, 2, 2);
      ctx.fillRect(cx, SEL_Y0 + 4, 2, 2); ctx.fillRect(cx + 2, SEL_Y0 + 2, 2, 2); ctx.fillRect(cx + 4, SEL_Y0, 2, 2);
    }
  }
  if (hi >= 0) {
    text(ctx, TEAM[hi].role, SCREEN_W / 2, 120, "#9fe0d6", { align: "center" });
    wrap(ctx, TEAM[hi].blurb, 300).forEach((l, k) => text(ctx, l, SCREEN_W / 2, 132 + k * 10, "#8a93a6", { align: "center" }));
  } else {
    text(ctx, `Selected ${G.selected.length}/3 · switch with 1-3 in-game · H for hints`, SCREEN_W / 2, 124, "#8a93a6", { align: "center" });
    wrap(ctx, "Each scene is a puzzle; bring a balanced crew. Everyone reunites at Ölbacken.", 300)
      .forEach((l, k) => text(ctx, l, SCREEN_W / 2, 138 + k * 10, "#8a93a6", { align: "center" }));
  }
  // START button (only when 3 chosen)
  if (G.selected.length === 3) {
    const bx = SCREEN_W / 2 - START_HW, hover = G.mouse.y >= START_Y && G.mouse.y <= START_Y + START_H && Math.abs(G.mouse.x - SCREEN_W / 2) <= START_HW;
    ctx.fillStyle = hover ? "#f2d04a" : "#c9a82f"; ctx.fillRect(bx, START_Y, START_HW * 2, START_H);
    text(ctx, "START THE NIGHT ▶", SCREEN_W / 2, START_Y + 7, "#0a0816", { align: "center", shadow: false });
  } else {
    text(ctx, "PICK 3 TEAMMATES", SCREEN_W / 2, START_Y + 7, "#6a6a82", { align: "center" });
  }
  renderCursor(ctx);
}

function renderEnding(ctx) {
  const e = G.ending || {};
  ctx.fillStyle = "#0a0814"; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  const grd = ctx.createRadialGradient(160, 64, 10, 160, 64, 170);
  grd.addColorStop(0, "rgba(242,208,74,0.18)"); grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grd; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

  text(ctx, e.title || "THE END", SCREEN_W / 2, 14, "#f2d04a", { align: "center" });
  (e.lines || []).forEach((l, i) => text(ctx, l, SCREEN_W / 2, 36 + i * 11, "#34d0b4", { align: "center" }));
  const extra = [];
  if (G.runTime != null) extra.push("Run " + fmtTime(G.runTime));
  if (G.vaultClock != null) extra.push("Vault clock " + fmtTime(G.vaultClock));
  if (extra.length) text(ctx, extra.join("  ·  "), SCREEN_W / 2, 146, "#f2d04a", { align: "center" });

  // the whole crew lined up, raising a glass
  const n = G.party.length || TEAM.length;
  const list = G.party.length ? G.party : TEAM.map((m) => ({ skin: SKINS[m.skin], long: m.long }));
  const cw = (SCREEN_W - 20) / n;
  for (let i = 0; i < n; i++) {
    const m = list[i];
    const cx = 10 + cw * i + cw / 2;
    sprite(ctx, m.long ? ACTOR.FRONT_L : ACTOR.FRONT, cx - ACTOR_W * 1.2 / 2, 104, { scale: 1.2, override: m.skin });
  }
  text(ctx, "Skål! / Cheers!", SCREEN_W / 2, 158, "#f2d04a", { align: "center" });
  const blink = Math.sin(G.t * 3) > 0;
  if (blink) text(ctx, "click to play again", SCREEN_W / 2, 182, "#9fe0d6", { align: "center" });
  renderCursor(ctx);
}
