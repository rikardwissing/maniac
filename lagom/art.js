// art.js — LAGOM sprite art. Greg is drawn parametrically so he can grow,
// droop and emote; small props are pixel sprites. Reuses the shared renderer.
import { rect, sprite, px } from "../js/pixel.js";

/* ----------------------------------------------------------- colours -- */
const TERRA = "#c4683b", TERRA_D = "#9a4a28", TERRA_L = "#d98a5c";
const SOIL = "#3a2a1c", SOIL_L = "#503a26";

// Leaf palette per mood: [fill, rib/edge]
const LEAF = {
  thriving: ["#4fc862", "#2c8540"],
  content:  ["#46b85c", "#2c8540"],
  thirsty:  ["#7fae57", "#577f37"],
  wilt:     ["#b6a64a", "#857832"],
  rot:      ["#6f7a4d", "#46502c"],
  dead:     ["#8a6a44", "#5f3c1d"],
  sleep:    ["#46b85c", "#2c8540"],
};

const FLOWER = ["#f2a0c4", "#e06fa0", "#f7d24a"]; // petal, petal-dark, centre

/* --------------------------------------------------------- one leaf --- */
// Filled leaf shape: narrow at base, fat in the middle, pointed tip, with a
// darker midrib. (x0,y0)=attach point, ang in radians (0=right, -PI/2=up).
function leaf(ctx, x0, y0, len, wid, ang, fill, rib) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const step = 0.6;
  for (let u = 0; u <= len; u += step) {
    const t = u / len;
    const hw = wid * Math.sin(Math.PI * t);
    for (let v = -hw; v <= hw; v += 0.7) {
      const xx = x0 + ca * u - sa * v;
      const yy = y0 + sa * u + ca * v;
      ctx.fillStyle = Math.abs(v) < 0.8 ? rib : fill;
      ctx.fillRect(xx | 0, yy | 0, 1, 1);
    }
  }
}

/* ------------------------------------------------- Greg, the plant ---- */
// drawGreg(ctx, baseX, baseY, opts)
//   baseX = horizontal centre, baseY = bottom of the pot (sits on a surface)
//   opts: { scale, stage(0..5), droop(0..1), mood, t(time), bloom(bool) }
export function drawGreg(ctx, baseX, baseY, o = {}) {
  const s = o.scale || 1;
  const stage = Math.max(0, Math.min(5, o.stage ?? 1));
  const droop = Math.max(0, Math.min(1, o.droop ?? 0));
  const mood = o.mood || "content";
  const t = o.t || 0;
  const dead = mood === "dead";
  const lc = LEAF[mood] || LEAF.content;

  // gentle sway (frozen when dead)
  const sway = dead ? 0 : Math.sin(t * 1.4) * 1.1 * s * (1 - droop * 0.6);

  // ---- pot ----
  const ph = 13 * s, wt = 24 * s, wb = 18 * s, rim = 3 * s, ov = 2 * s;
  const topY = baseY - ph;
  for (let yy = 0; yy < ph; yy++) {
    const f = yy / ph;
    const w = wt + (wb - wt) * f;
    const shade = f < 0.18 ? TERRA_L : f > 0.7 ? TERRA_D : TERRA;
    rect(ctx, baseX - w / 2, topY + yy, w, 1, shade);
  }
  // rim
  rect(ctx, baseX - (wt / 2 + ov), topY - rim, wt + ov * 2, rim, TERRA_L);
  rect(ctx, baseX - (wt / 2 + ov), topY - 1, wt + ov * 2, 1 * s, TERRA_D);
  // soil
  const soilW = wt - 2 * s;
  rect(ctx, baseX - soilW / 2, topY - rim - 1.5 * s, soilW, 2 * s, SOIL);
  for (let i = 0; i < soilW; i += 3) px(ctx, baseX - soilW / 2 + i, topY - rim - 1.5 * s, SOIL_L);

  const soilY = topY - rim - 1.5 * s; // where stems sprout

  // ---- stem & leaves ----
  if (!dead || true) {
    const stemH = (12 + stage * 7) * s;
    const tipX = baseX + sway;
    const tipY = soilY - stemH + droop * stemH * 0.45;
    // main stem (slight bend toward sway / droop)
    const segs = 14;
    let px0 = baseX, py0 = soilY;
    for (let i = 1; i <= segs; i++) {
      const f = i / segs;
      const x = baseX + sway * f + Math.sin(f * Math.PI) * droop * 3 * s;
      const y = soilY - stemH * f + droop * stemH * 0.45 * f * f;
      ctx.fillStyle = lc[1];
      const sw = Math.max(1, (2.4 - f) * s);
      rect(ctx, x - sw / 2, y, sw, (py0 - y) + 1, lc[1]);
      px0 = x; py0 = y;
    }

    // leaf attachment points along the stem
    const pairs = Math.min(2 + stage, 6);
    for (let i = 0; i < pairs; i++) {
      const f = pairs === 1 ? 1 : i / (pairs - 1); // 0 bottom .. 1 top
      const ax = baseX + sway * f + Math.sin(f * Math.PI) * droop * 3 * s;
      const ay = soilY - stemH * f + droop * stemH * 0.45 * f * f;
      const len = (9 + (1 - f) * 7 + stage) * s;
      const wid = (2.2 + (1 - f) * 1.4) * s;
      // base upward angle, opening more horizontal lower down; droop bends down
      const up = -Math.PI / 2;
      const spread = (0.55 + f * 0.5);
      const droopBend = droop * (1.4 + (1 - f) * 0.6);
      leaf(ctx, ax, ay, len, wid, up - spread + droopBend, lc[0], lc[1]);   // left
      leaf(ctx, ax, ay, len, wid, up + spread + droopBend, lc[0], lc[1]);   // right
    }

    // crown leaf / bloom at the very top
    if (o.bloom) {
      drawFlower(ctx, tipX, tipY - 1 * s, s, t);
    } else {
      leaf(ctx, tipX, tipY + 1 * s, (8 + stage) * s, (2 + stage * 0.2) * s,
           -Math.PI / 2 + Math.sin(t) * 0.05 + droop * 0.8, lc[0], lc[1]);
    }
  }

  // ---- face on the pot ----
  drawFace(ctx, baseX, topY + ph * 0.42, s, mood, t);
}

function drawFlower(ctx, cx, cy, s, t) {
  const r = 4 * s;
  const petals = 6;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2 + t * 0.3;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    ctx.fillStyle = i % 2 ? FLOWER[1] : FLOWER[0];
    ctx.beginPath();
    rect(ctx, x - 1.6 * s, y - 1.6 * s, 3.2 * s, 3.2 * s, i % 2 ? FLOWER[1] : FLOWER[0]);
  }
  rect(ctx, cx - 1.6 * s, cy - 1.6 * s, 3.2 * s, 3.2 * s, FLOWER[2]);
}

// Greg's expressive face, drawn on the front of the pot.
function drawFace(ctx, cx, cy, s, mood, t) {
  const ink = "#2a1a10";
  const ex = 5 * s; // eye spacing from centre
  const ey = cy;
  const blink = (Math.floor(t * 0.7) % 6 === 0) && mood !== "dead";
  const dot = (x, y, w = 2, h = 2) => rect(ctx, x - (w * s) / 2, y - (h * s) / 2, w * s, h * s, ink);

  // eyes
  if (mood === "dead") {
    // X X
    drawX(ctx, cx - ex, ey, s, ink); drawX(ctx, cx + ex, ey, s, ink);
  } else if (mood === "sleep") {
    rect(ctx, cx - ex - 2 * s, ey, 4 * s, 1 * s, ink);
    rect(ctx, cx + ex - 2 * s, ey, 4 * s, 1 * s, ink);
  } else if (blink) {
    rect(ctx, cx - ex - 1.5 * s, ey + 0.5 * s, 3 * s, 1 * s, ink);
    rect(ctx, cx + ex - 1.5 * s, ey + 0.5 * s, 3 * s, 1 * s, ink);
  } else {
    dot(cx - ex, ey, 2.2, 2.6); dot(cx + ex, ey, 2.2, 2.6);
    if (mood === "thriving" || mood === "content") { // little shine
      px(ctx, cx - ex - 0.4 * s, ey - 0.4 * s, "#fff");
      px(ctx, cx + ex - 0.4 * s, ey - 0.4 * s, "#fff");
    }
  }

  // mouth
  const my = cy + 5 * s;
  if (mood === "thriving") {
    // open happy smile
    rect(ctx, cx - 3 * s, my, 6 * s, 1 * s, ink);
    px(ctx, cx - 4 * s, my - 1 * s, ink); px(ctx, cx + 3 * s, my - 1 * s, ink);
    rect(ctx, cx - 2 * s, my + 1 * s, 4 * s, 1 * s, "#c4683b");
  } else if (mood === "content") {
    rect(ctx, cx - 2.5 * s, my, 5 * s, 1 * s, ink);
    px(ctx, cx - 3.5 * s, my - 1 * s, ink); px(ctx, cx + 2.5 * s, my - 1 * s, ink);
  } else if (mood === "sleep") {
    rect(ctx, cx - 1 * s, my, 2 * s, 1 * s, ink); // tiny o
  } else if (mood === "thirsty") {
    rect(ctx, cx - 2 * s, my, 4 * s, 1 * s, ink); // flat
    // sweat drop
    rect(ctx, cx + ex + 1 * s, ey - 1 * s, 1.4 * s, 2 * s, "#9fe0ff");
  } else if (mood === "wilt") {
    // frown
    rect(ctx, cx - 2.5 * s, my + 1 * s, 5 * s, 1 * s, ink);
    px(ctx, cx - 3.5 * s, my, ink); px(ctx, cx + 2.5 * s, my, ink);
  } else if (mood === "rot") {
    // wavy queasy mouth + green tinge
    for (let i = -3; i <= 3; i++) px(ctx, cx + i * s, my + (i % 2 ? 0 : 1) * s, ink);
    px(ctx, cx + ex + 1 * s, ey + 2 * s, "#6f7a4d");
  } else if (mood === "dead") {
    rect(ctx, cx - 2 * s, my, 4 * s, 1 * s, ink);
  }
}

function drawX(ctx, cx, cy, s, c) {
  for (let i = -1.5; i <= 1.5; i += 0.7) {
    px(ctx, cx + i * s, cy + i * s, c);
    px(ctx, cx + i * s, cy - i * s, c);
  }
}

/* ------------------------------------------------------ small props --- */
// Watering can (side view, spout to the left).
export const CAN = [
  "....bbbb....",
  "...b....b...",
  "..b......bb.",
  "bbb......b.b",
  "b.bbbbbbbb.b",
  "b.LLLLLLLL.b",
  "b.LlllllLL.b",
  "b.LLLLLLLL.b",
  ".bLLLLLLLLb.",
  "..bbbbbbbb..",
];

// Coffee mug.
export const MUG = [
  "wwwwww..",
  "w.... wbb",
  "w....wb.b",
  "w....wb.b",
  "w....wbb.",
  "wwwwww...",
];

// Alarm clock.
export const CLOCK = [
  ".b....b.",
  "bRbbbbRb",
  "bRwwwwRb",
  "Rw.kk.wR",
  "Rw.kk.wR",
  "bRwwwwRb",
  ".bbbbbb.",
  "..b..b..",
];

// Desk monitor with a teal screen.
export function drawMonitor(ctx, x, y, s = 1, on = true) {
  rect(ctx, x, y, 34 * s, 22 * s, "#1c1c22");
  rect(ctx, x + 2 * s, y + 2 * s, 30 * s, 16 * s, on ? "#0e3c3a" : "#0a0a10");
  if (on) {
    rect(ctx, x + 4 * s, y + 4 * s, 18 * s, 1 * s, "#34d0b4");
    rect(ctx, x + 4 * s, y + 7 * s, 24 * s, 1 * s, "#1f8f7e");
    rect(ctx, x + 4 * s, y + 10 * s, 14 * s, 1 * s, "#1f8f7e");
    rect(ctx, x + 4 * s, y + 13 * s, 20 * s, 1 * s, "#1f8f7e");
  }
  rect(ctx, x + 14 * s, y + 22 * s, 6 * s, 3 * s, "#15151b");
  rect(ctx, x + 9 * s, y + 25 * s, 16 * s, 2 * s, "#22222e");
}

/* --------------------------------------------------- a tiny person ---- */
// Walkable person sprite (~16x29). opts: { facing:1|-1, step:0..1 (walk
// phase; null = idle), shirt, hair, skin, pants }.
export function drawPerson(ctx, x, y, s = 1, opts = {}) {
  const skin = opts.skin || "#f0bd92";
  const hair = opts.hair || "#3c2615";
  const shirt = opts.shirt || "#00a98f";
  const pants = opts.pants || "#3a5a8a";
  const flip = opts.facing === -1;
  const step = opts.step; // walk phase or undefined for idle
  const fx = (px_) => flip ? (16 - px_) : px_; // mirror about width 16
  const P = (px_, py, w, h, c) => { const xx = flip ? (16 - px_ - w) : px_; rect(ctx, x + xx * s, y + py * s, w * s, h * s, c); };
  // legs (swing when walking)
  let lA = 18, lB = 18, fA = 27, fB = 27;
  if (step != null) {
    const sw = Math.sin(step * Math.PI * 2);
    lA = 18 - Math.max(0, sw) * 1.5; lB = 18 - Math.max(0, -sw) * 1.5;
    fA = 27 - Math.max(0, sw) * 2;   fB = 27 - Math.max(0, -sw) * 2;
  }
  P(4, lA, 3, 27 - lA + 2, pants); P(9, lB, 3, 27 - lB + 2, pants);
  P(3, fA, 5, 2, "#15151b"); P(8, fB, 5, 2, "#15151b"); // shoes
  // body
  P(3, 7, 10, 11, shirt);
  P(2, 8, 2, 8, shirt); P(12, 8, 2, 8, shirt);     // arms
  P(2, 15, 2, 2, skin); P(12, 15, 2, 2, skin);     // hands
  // head
  P(4, 0, 8, 7, skin);
  P(3, 0, 10, 2, hair);
  P(3, 1, 1, 4, hair); P(12, 1, 1, 4, hair);
  // face (only the forward-facing eye set; mirrored by flip)
  P(5, 3, 2, 2, "#2a1a10"); P(9, 3, 2, 2, "#2a1a10");
  P(6, 5, 4, 1, "#b56a4a");
}

// A simple interior door (frame + panel + handle).
export function drawDoor(ctx, x, y, w, h, opts = {}) {
  rect(ctx, x, y, w, h, "#3a2a18");
  rect(ctx, x + 2, y + 2, w - 4, h - 3, opts.color || "#7a5a36");
  rect(ctx, x + 4, y + 5, w - 8, (h - 10) / 2 - 2, "#6a4a2a");
  rect(ctx, x + 4, y + 5 + (h - 10) / 2 + 1, w - 8, (h - 10) / 2 - 2, "#6a4a2a");
  rect(ctx, x + w - 6, y + h / 2 - 1, 2, 4, "#e8c84a"); // handle
}

// Counter-top coffee machine.
export function drawCoffeeMachine(ctx, x, y, s = 1) {
  rect(ctx, x, y, 18 * s, 22 * s, "#2a2a32");          // body
  rect(ctx, x + 2 * s, y + 2 * s, 14 * s, 6 * s, "#3a3a44");
  rect(ctx, x + 5 * s, y + 9 * s, 8 * s, 2 * s, "#15151b"); // spout bar
  rect(ctx, x + 6 * s, y + 12 * s, 6 * s, 6 * s, "#f6f6fb"); // mug below
  rect(ctx, x + 4 * s, y + 1 * s, 3 * s, 2 * s, "#34d0b4"); // light
}

