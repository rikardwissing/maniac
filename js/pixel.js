// pixel.js — palette, sprite decoder and low-level draw helpers.
// Everything is drawn into the internal 320x200 buffer then scaled up.

// Master palette. Single-char keys keep sprite data compact and readable.
// Space and '.' are transparent.
export const PAL = {
  k: "#0b0b12", // near-black / ink
  d: "#22222e", // shadow
  D: "#15151d", // deep shadow
  g: "#6b6b7a", // mid grey
  G: "#9a9aac", // light grey
  w: "#f6f6fb", // white
  W: "#d6d6d0", // off-white
  q: "#b8b8c6", // silver

  s: "#f0bd92", // skin
  S: "#cf9264", // skin shadow
  z: "#a86a3e", // skin deep / brown skin
  Z: "#7a4a28",

  h: "#6a4326", // hair brown
  H: "#3c2615", // hair dark
  f: "#1c1c22", // hair black
  o: "#e8902f", // hair ginger / orange
  y: "#f2d04a", // yellow / blonde
  Y: "#c9a82f", // yellow shadow

  t: "#00a98f", // Teamtailor teal (shirt)
  T: "#00715f", // teal shadow
  c: "#34d0b4", // teal light
  l: "#6db5d8", // light blue
  L: "#3f7fb0", // blue
  j: "#3a5a8a", // jeans
  J: "#27406a", // jeans dark
  b: "#15151b", // shoes / black cloth

  r: "#d23b2b", // red
  R: "#9a2417", // red dark
  e: "#9a6233", // wood
  E: "#5f3c1d", // wood dark
  n: "#46b85c", // green
  N: "#2c8540", // green dark
  m: "#d062b0", // magenta / pink
  u: "#7a3b8f", // purple (Bug)
  U: "#4d2259", // purple dark
  p: "#b06fc7", // purple light
  v: "#2a2f45", // night wall
  V: "#171b2c", // night wall dark
  a: "#8a93a6", // cool grey wall
  A: "#5d6577", // cool grey wall dark
  x: "#e6e2d6", // paper
  i: "#9fe8ff", // glass / screen glow
};

// Resolve a palette key to a CSS colour (allow per-sprite overrides).
function color(key, override) {
  if (override && override[key]) return override[key];
  return PAL[key];
}

// Fill a single logical pixel.
export function px(ctx, x, y, c) {
  ctx.fillStyle = c;
  ctx.fillRect(x | 0, y | 0, 1, 1);
}

// Filled rectangle in logical pixels.
export function rect(ctx, x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}

// 1px outlined rectangle.
export function frame(ctx, x, y, w, h, c) {
  rect(ctx, x, y, w, 1, c);
  rect(ctx, x, y + h - 1, w, 1, c);
  rect(ctx, x, y, 1, h, c);
  rect(ctx, x + w - 1, y, 1, h, c);
}

// Horizontal gradient-ish band built from two colours and a dither.
export function vGradient(ctx, x, y, w, h, top, bot, steps = h) {
  for (let i = 0; i < steps; i++) {
    const t = i / Math.max(1, steps - 1);
    ctx.fillStyle = mix(top, bot, t);
    const yy = y + Math.round((i / steps) * h);
    const hh = Math.max(1, Math.round(((i + 1) / steps) * h) - Math.round((i / steps) * h));
    ctx.fillRect(x | 0, yy | 0, w | 0, hh | 0);
  }
}

// Blend two hex colours.
export function mix(a, b, t) {
  const pa = hex(a), pb = hex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function hex(h) {
  if (h[0] !== "#") {
    const m = h.match(/\d+/g);
    return [ +m[0], +m[1], +m[2] ];
  }
  const n = parseInt(h.slice(1), 16);
  return [ (n >> 16) & 255, (n >> 8) & 255, n & 255 ];
}

// Draw a sprite given as an array of equal-length strings.
// opts: { scale=1, flip=false, override={key:hex}, ax, ay } (ax/ay = anchor offset)
export function sprite(ctx, data, x, y, opts = {}) {
  const scale = opts.scale || 1;
  const flip = !!opts.flip;
  const ov = opts.override;
  const w = data[0].length;
  for (let row = 0; row < data.length; row++) {
    const line = data[row];
    for (let cx = 0; cx < w; cx++) {
      const key = line[cx];
      if (key === " " || key === "." || key === undefined) continue;
      const c = color(key, ov);
      if (!c) continue;
      const sx = flip ? (w - 1 - cx) : cx;
      ctx.fillStyle = c;
      // Seamless nearest-neighbour upscaling for fractional scales: derive each
      // pixel's rect from the floored edges of the next pixel (no gaps/overlap).
      const x0 = Math.floor(x + sx * scale);
      const x1 = Math.floor(x + (sx + 1) * scale);
      const y0 = Math.floor(y + row * scale);
      const y1 = Math.floor(y + (row + 1) * scale);
      ctx.fillRect(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0));
    }
  }
}

export function spriteWidth(data) { return data[0].length; }
export function spriteHeight(data) { return data.length; }

// Speckle / noise dither used for floors, walls, gravel etc. Deterministic.
export function speckle(ctx, x, y, w, h, c, density = 0.08, seed = 1) {
  ctx.fillStyle = c;
  let s = seed * 9301 + 49297;
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      s = (s * 9301 + 49297) % 233280;
      if (s / 233280 < density) ctx.fillRect((x + xx) | 0, (y + yy) | 0, 1, 1);
    }
  }
}
