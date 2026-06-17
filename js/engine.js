// engine.js — the SCUMM-style adventure engine: input, walking with depth,
// the verb/inventory UI, speech, dialogue choices, cutscenes and rendering.
import { rect, frame, sprite, mix } from "./pixel.js";
import {
  ROOM_W, ROOM_H, ACTOR, ACTOR_W, ACTOR_H, SKINS, BUG, ICONS, actorShadow,
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
  player: null,
  actors: [],
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

G.win = (payload) => { G.ending = payload; G.scene = "end"; sfx("win"); playMusic("bar"); };

function findActor(id) { return G.actors.find((a) => a.id === id) || (G.player && G.player.id === id ? G.player : null); }

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
  // place player
  const start = (opts.at) || room.start || { x: 60, y: 124 };
  if (G.player) { G.player.x = start.x; G.player.y = start.y; G.player.target = null; G.player.dir = start.dir || "front"; }
  G.verb = "walkto"; G.primary = null;
  if (room.music) playMusic(room.music);
  if (room.onEnter) room.onEnter(G, opts);
}

function makeActor(def) {
  const skin = SKINS[def.skin] || {};
  return {
    id: def.id, kind: def.kind || "human", skin,
    x: def.x, y: def.y, dir: def.dir || "front",
    frame: 0, anim: 0, target: null, onArrive: null,
    scale: def.scale || null,
    speechColor: def.speechColor || (skin.t ? skin.t : "#f6f6fb"),
    bob: 0,
  };
}

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
  if (e.key === "Escape" && G.choices) { G.choices = null; }
}

function onClick() {
  const { x, y } = G.mouse;

  if (G.scene === "select") { clickSelect(x, y); return; }
  if (G.scene === "end") { if (G.ending && G.ending.replay) location.reload(); return; }

  // skip speech first
  if (G.current) { G.current.until = 0; return; }
  if (G.speech.length) return;
  if (G.cs) return;                          // locked during cutscenes

  // dialogue choices take priority
  if (G.choices) { clickChoice(x, y); return; }

  if (y < ROOM_H) { clickRoom(x, y); return; }
  // panel
  clickVerb(x, y);
  clickInventory(x, y);
}

/* --------------------------------------------------- character select --- */
import { TEAM } from "./art.js";
function clickSelect(x, y) {
  const n = TEAM.length;
  const cw = SCREEN_W / n;
  if (y > 60 && y < 150) {
    const i = Math.floor(x / cw);
    if (i >= 0 && i < n) chooseCharacter(TEAM[i]);
  }
}
function chooseCharacter(member) {
  sfx("coin");
  G.player = {
    id: "player", kind: "human", skin: SKINS[member.skin],
    name: member.name, x: 60, y: 122, dir: "front",
    frame: 0, anim: 0, target: null, onArrive: null,
    scale: null, speechColor: SKINS[member.skin].t || "#34d0b4", bob: 0,
  };
  fadeTo(() => {
    enterRoom("office", {});
    G.scene = "play";
  });
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

function targetFromObject(obj) { return { id: obj.id, name: obj.name, obj }; }

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
      if ((a.id === "player") && Math.random() < dt * 6) sfx("walk");
    }
  } else {
    a.anim = 0;
  }
  a.bob += dt;
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
    if (G.player) updateActor(G.player, dt);
    updateSpeech(now);
    updateCS(now);
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
    const o = objectAt(x, y);
    G.hover = o ? { name: o.name } : null;
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
  // room background
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, ROOM_W, ROOM_H); ctx.clip();
  if (room && room.paint) room.paint(ctx, G.t, G.state);
  // actors sorted by feet y
  const all = [...G.actors];
  if (G.player) all.push(G.player);
  all.sort((a, b) => a.y - b.y);
  all.forEach((a) => drawActor(ctx, a));
  ctx.restore();

  drawSpeech(ctx);
  drawPanel(ctx);
  if (G.choices) drawChoices(ctx);
  if (G.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${G.fade})`; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
  renderCursor(ctx);
}

function drawActor(ctx, a) {
  const sc = a.scale || roomScale(a.y);
  const w = (a.kind === "bug" ? 16 : ACTOR_W);
  const h = (a.kind === "bug" ? BUG.length : ACTOR_H);
  const drawW = w * sc, drawH = h * sc;
  const x = a.x - drawW / 2;
  const y = a.y - drawH;
  actorShadow(ctx, a.x, a.y, w, sc);

  if (a.kind === "bug") {
    const wob = Math.sin(a.bob * 2) * 1.5;
    sprite(ctx, BUG, x, y + wob, { scale: sc });
    return;
  }
  let frames, flip = false;
  const stepping = a.target != null;
  if (a.dir === "left" || a.dir === "right") {
    const f = stepping ? (Math.floor(a.anim) % 2 === 0 ? ACTOR.SIDE_A : ACTOR.SIDE_B) : ACTOR.SIDE_A;
    frames = f; flip = a.dir === "left";
  } else if (a.dir === "back") {
    frames = ACTOR.BACK;
  } else {
    frames = ACTOR.FRONT;
  }
  const bob = stepping ? Math.round(Math.sin(a.anim * Math.PI)) : 0;
  sprite(ctx, frames, x, y + bob, { scale: sc, flip, override: a.skin });
}

function drawSpeech(ctx) {
  if (!G.current) return;
  const a = G.current.actorId === "player" ? G.player : findActor(G.current.actorId);
  const cx = a ? a.x : SCREEN_W / 2;
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
  // starfield
  for (let i = 0; i < 60; i++) {
    const sx = (i * 73) % SCREEN_W, sy = (i * 137) % 60;
    ctx.fillStyle = i % 5 ? "#2a2a44" : "#4a4a6a"; ctx.fillRect(sx, sy, 1, 1);
  }
  text(ctx, "CHOOSE YOUR TAILOR", SCREEN_W / 2, 14, "#f2d04a", { align: "center", size: 8 });
  text(ctx, "Teamtailor Linköping · AfterWork Quest", SCREEN_W / 2, 28, "#34d0b4", { align: "center", size: 8 });

  const n = TEAM.length, cw = SCREEN_W / n;
  for (let i = 0; i < n; i++) {
    const m = TEAM[i];
    const cx = cw * i + cw / 2;
    const hover = G.mouse.x > cw * i && G.mouse.x < cw * (i + 1) && G.mouse.y > 60 && G.mouse.y < 150;
    if (hover) { ctx.fillStyle = "rgba(0,169,143,0.12)"; ctx.fillRect(cw * i + 2, 56, cw - 4, 96); }
    sprite(ctx, ACTOR.FRONT, cx - ACTOR_W * 1.6 / 2, 64, { scale: 1.6, override: SKINS[m.skin] });
    text(ctx, m.name, cx, 116, hover ? "#f2d04a" : "#d6d6d0", { align: "center" });
  }
  // blurb of hovered
  const i = Math.floor(G.mouse.x / cw);
  if (G.mouse.y > 60 && G.mouse.y < 150 && TEAM[i]) {
    const lines = wrap(ctx, TEAM[i].blurb, 280);
    lines.forEach((l, k) => text(ctx, l, SCREEN_W / 2, 160 + k * 10, "#9fe0d6", { align: "center" }));
  } else {
    text(ctx, "Click a character to begin", SCREEN_W / 2, 165, "#6a6a82", { align: "center" });
  }
}

function renderEnding(ctx) {
  const e = G.ending || {};
  ctx.fillStyle = "#0a0814"; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  // soft glow
  const grd = ctx.createRadialGradient(160, 70, 10, 160, 70, 160);
  grd.addColorStop(0, "rgba(242,208,74,0.18)"); grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grd; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

  text(ctx, e.title || "THE END", SCREEN_W / 2, 18, "#f2d04a", { align: "center" });
  const lines = e.lines || [];
  lines.forEach((l, i) => text(ctx, l, SCREEN_W / 2, 44 + i * 11, "#34d0b4", { align: "center" }));

  // little toast scene
  if (G.player) {
    sprite(ctx, ACTOR.FRONT, 120, 110, { scale: 1.6, override: G.player.skin });
    sprite(ctx, ACTOR.FRONT, 168, 110, { scale: 1.6, override: SKINS.tove });
  }
  text(ctx, "Skal! / Cheers!", SCREEN_W / 2, 156, "#f2d04a", { align: "center" });
  const blink = Math.sin(G.t * 3) > 0;
  if (blink) text(ctx, "click to play again", SCREEN_W / 2, 180, "#9fe0d6", { align: "center" });
  renderCursor(ctx);
}
