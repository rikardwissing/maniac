// art.js — all hand-authored pixel art: actors, the villain, item icons,
// and the four room background painters. Nothing here loads from the network.
import { rect, frame, sprite, speckle, vGradient, px, PAL, mix } from "./pixel.js";

export const ROOM_W = 320;
export const ROOM_H = 136; // scene viewport; UI panel lives below this

/* ----------------------------------------------------------------------- *
 *  ACTORS (player + NPCs share one rig, recoloured via `override`)         *
 *  16 wide. Direction frames: front, back, sideA (stand), sideB (stride). *
 * ----------------------------------------------------------------------- */

const FRONT = [
  "    hhhhhhhh    ",
  "   hhhhhhhhhh   ",
  "  hhhhhhhhhhhh  ",
  "  hhsssssssshh  ",
  "  hhsskssksshh  ",
  "  hhsssssssshh  ",
  "  hhsssssssshh  ",
  "   ssssssssss   ",
  "   sSsssssSss   ",
  "    ssssssss    ",
  "     ssssss     ",
  "      ssss      ",
  "    tttttttt    ",
  "   tttttttttt   ",
  "   stttttttts   ",
  "   stttttttts   ",
  "    tttttttt    ",
  "    jjjjjjjj    ",
  "    jjjjjjjj    ",
  "    jjj  jjj    ",
  "    jjj  jjj    ",
  "    jJj  jJj    ",
  "    bbb  bbb    ",
  "   bbbb  bbbb   ",
];

const BACK = [
  "    hhhhhhhh    ",
  "   hhhhhhhhhh   ",
  "  hhhhhhhhhhhh  ",
  "  hhhhhhhhhhhh  ",
  "  hhhhhhhhhhhh  ",
  "  hhhhhhhhhhhh  ",
  "  hhhhhhhhhhhh  ",
  "   hhhhhhhhhh   ",
  "   hHhhhhhhHh   ",
  "    hhhhhhhh    ",
  "     ssssss     ",
  "      ssss      ",
  "    tttttttt    ",
  "   tttttttttt   ",
  "   tttttttttt   ",
  "   tttttttttt   ",
  "    tttttttt    ",
  "    jjjjjjjj    ",
  "    jjjjjjjj    ",
  "    jjj  jjj    ",
  "    jjj  jjj    ",
  "    jJj  jJj    ",
  "    bbb  bbb    ",
  "   bbbb  bbbb   ",
];

const SIDE_A = [
  "    hhhhhh      ",
  "   hhhhhhhh     ",
  "  hhhhhhhhhh    ",
  "  hhhsssssss    ",
  "  hhhsssssss    ",
  "  hhhssksssS    ",
  "  hhhsssssss    ",
  "   hhssssssS    ",
  "    hsssssss    ",
  "     sssss      ",
  "      sss       ",
  "    tttttttt    ",
  "   ttttttttt    ",
  "   tttttttts    ",
  "    ttttttt     ",
  "    jjjjjjj     ",
  "    jjjjjjj     ",
  "    jjjjjjj     ",
  "    jjj jjj     ",
  "    jjj jjj     ",
  "    JJj jJJ     ",
  "    bbb bbb     ",
  "   bbbb bbbb    ",
];

const SIDE_B = [
  "    hhhhhh      ",
  "   hhhhhhhh     ",
  "  hhhhhhhhhh    ",
  "  hhhsssssss    ",
  "  hhhsssssss    ",
  "  hhhssksssS    ",
  "  hhhsssssss    ",
  "   hhssssssS    ",
  "    hsssssss    ",
  "     sssss      ",
  "      sss       ",
  "    tttttttt    ",
  "   ttttttttt    ",
  "   tttttttts    ",
  "    ttttttt     ",
  "    jjjjjjj     ",
  "    jjjjjjj     ",
  "    jjjjjj      ",
  "   jjjj jjj     ",
  "  jjj    jjj    ",
  "  JJ      JJ    ",
  " bbb      bbb   ",
  " bbbb    bbbb   ",
];

export const ACTOR = { FRONT, BACK, SIDE_A, SIDE_B };
export const ACTOR_W = 16;
export const ACTOR_H = 24;

// Recolour overrides per character. Keys map palette letters to new hex.
export const SKINS = {
  // The Teamtailor Linköping crew (player-selectable)
  jonas: { h: "#5a3a1f", H: "#3a2412", t: "#00a98f", T: "#00715f" },           // brown hair, teal
  emil:  { h: "#e8c451", H: "#c9a82f", t: "#3f7fb0", T: "#2c5a82" },           // blonde, blue
  oskar: { h: "#23232a", H: "#121217", t: "#e8902f", T: "#b56a18" },           // dark hair, orange
  // NPCs
  bartender: { h: "#1c1c22", H: "#000", t: "#222", T: "#111", j: "#444", J: "#222" },
};

export const TEAM = [
  { id: "jonas", name: "Jonas", skin: "jonas", blurb: "Ships features and strong opinions about fika." },
  { id: "emil",  name: "Emil",  skin: "emil",  blurb: "Has never lost an escape room. Allegedly." },
  { id: "oskar", name: "Oskar", skin: "oskar", blurb: "Already has the AW bar tab open in a browser tab." },
];

/* ----------------------------------------------------------------------- *
 *  THE BUG — a purple tentacle creature guarding the escape-room vault.    *
 * ----------------------------------------------------------------------- */
export const BUG = [
  "       uu       ",
  "      uuuu      ",
  "     uupuuu     ",
  "    uupppuuu    ",
  "    upppppuu    ",
  "   uppppppuu    ",
  "  uwkuuuuwkuu   ",
  "  uwkuuuuwkuu   ",
  "  uupppppppuu   ",
  "  uppppppppppu  ",
  "  uppkkkkkpppu  ",
  "  uppkwwwkkppu  ",
  "  uppkkkkkpppu  ",
  "  upppppppppppu ",
  " pUppppppppppUp ",
  " pUUpppppppUUpp ",
  "  UUppppppppUU  ",
  "  UUUpppppUUUu  ",
  "  uUUUpppUUUuu  ",
  "   uUUUUUUUuu   ",
  "   uuUUUUUuu    ",
  "    uuUUUuu     ",
  "    uuuuuuu     ",
  "   uuuuuuuuu    ",
  "  uuuuuuuuuuu   ",
];
export const BUG_W = 16;

/* ----------------------------------------------------------------------- *
 *  ITEM ICONS — 16x16, used in inventory and when "examined".             *
 * ----------------------------------------------------------------------- */
export const ICONS = {
  keycard: [
    "                ",
    "  tttttttttttt  ",
    "  tWWWWWWWWWWt  ",
    "  tWyyWWWWWWWt  ",
    "  tWyyWWkkkWWt  ",
    "  tWWWWWkWkWWt  ",
    "  tWWWWWkkkWWt  ",
    "  tWWWWWWWWWWt  ",
    "  tTTTTTTTTTTt  ",
    "  tWWWWWWWWWWt  ",
    "  tWkkkkkkkkWt  ",
    "  tWWWWWWWWWWt  ",
    "  tttttttttttt  ",
    "                ",
    "                ",
    "                ",
  ],
  mug: [
    "                ",
    "                ",
    "   WWWWWWWW     ",
    "  WWWWWWWWWW    ",
    "  WW      WW WW ",
    "  WW      WWW WW",
    "  WW      WW  WW",
    "  WW      WW WW ",
    "  WW      WWWW  ",
    "  WW      WW    ",
    "  WWWWWWWWWW    ",
    "   WWWWWWWW     ",
    "    qqqqqq      ",
    "                ",
    "                ",
    "                ",
  ],
  coffee: [
    "      ggg       ",
    "     g g g      ",
    "   WWWWWWWW g   ",
    "  WWWWWWWWWW    ",
    "  WWeeeeeeWW WW ",
    "  WWEEEEEEWWW WW",
    "  WWeeeeeeWW  WW",
    "  WWEEEEEEWW WW ",
    "  WWeeeeeeWWWW  ",
    "  WW      WW    ",
    "  WWWWWWWWWW    ",
    "   WWWWWWWW     ",
    "    qqqqqq      ",
    "                ",
    "                ",
    "                ",
  ],
  note: [
    "                ",
    "  yyyyyyyyyyyy  ",
    "  yyyyyyyyyyyy  ",
    "  yykkkkkkkyyy  ",
    "  yyyyyyyyyyyy  ",
    "  yykkkkkkkkyy  ",
    "  yyyyyyyyyyyy  ",
    "  yykkkkkyyyyy  ",
    "  yyyyyyyyyyyy  ",
    "  yykkkkkkkyyy  ",
    "  yyyyyyyyyyyo  ",
    "  yyyyyyyyyooo  ",
    "  yyyyyyyyoooo  ",
    "                ",
    "                ",
    "                ",
  ],
  bun: [
    "                ",
    "                ",
    "    EEEEEEEE    ",
    "   EeeeeeeeeE   ",
    "  EeeEEeeEEeeE  ",
    "  EeEwwEewwEeE  ",
    "  EeEwHHEwHHeE  ",
    "  EeeEEeeEEeeE  ",
    "  EeeeeeeeeeeE  ",
    "  EeeEwwEwwEeE  ",
    "   EeeeeeeeeE   ",
    "    EEEEEEEE    ",
    "    EEEEEEEE    ",
    "                ",
    "                ",
    "                ",
  ],
  helmet: [
    "                ",
    "                ",
    "    LLLLLLLL    ",
    "   LLllllllLL   ",
    "  LLllLllLllLL  ",
    "  LlllkllkllLL  ",
    "  LlllllllllLL  ",
    "  LLllllllllLL  ",
    "  bbLLLLLLLLbb  ",
    "    b      b    ",
    "    b      b    ",
    "                ",
    "                ",
    "                ",
    "                ",
    "                ",
  ],
  key: [
    "                ",
    "    yyyy        ",
    "   yyyyyy       ",
    "   yykkyy       ",
    "   yykkyy       ",
    "   yyyyyy       ",
    "    yyyy        ",
    "     yy         ",
    "     yy         ",
    "     yy         ",
    "     yyy        ",
    "     yyy        ",
    "     yyyy       ",
    "     yy         ",
    "                ",
    "                ",
  ],
  phone: [
    "                ",
    "    kkkkkkkk    ",
    "    kiiiiiik    ",
    "    kiiiiiik    ",
    "    kiiiiiik    ",
    "    kiiiiiik    ",
    "    kiiiiiik    ",
    "    kiiiiiik    ",
    "    kiiiiiik    ",
    "    kiiiiiik    ",
    "    kkkkkkkk    ",
    "    kkkokkkk    ",
    "    kkkkkkkk    ",
    "                ",
    "                ",
    "                ",
  ],
  beer: [
    "                ",
    "    y    y      ",
    "   WWWWWWWW     ",
    "   WyyyyyyW     ",
    "   WyyyyyyW WW  ",
    "   WyyyyyyW  W  ",
    "   WoooooyW  W  ",
    "   WooooooW  W  ",
    "   WooooooW WW  ",
    "   WooooooW     ",
    "   WooooooW     ",
    "   WWWWWWWW     ",
    "    qqqqqq      ",
    "                ",
    "                ",
    "                ",
  ],
};

/* helper: cheap dithered shadow ellipse under an actor */
export function actorShadow(ctx, cx, cy, w, scale) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  const rw = (w * scale) * 0.42;
  for (let i = -rw; i <= rw; i++) {
    const h = Math.sqrt(Math.max(0, 1 - (i / rw) * (i / rw))) * 2.4 * scale;
    ctx.fillRect((cx + i) | 0, (cy - h / 2) | 0, 1, Math.max(1, h) | 0);
  }
}

/* ======================================================================= *
 *  ROOM PAINTERS                                                          *
 * ======================================================================= */

// 1 — TEAMTAILOR OFFICE (Linköping), bright morning
export function paintOffice(ctx, t, st) {
  // walls
  vGradient(ctx, 0, 0, ROOM_W, 92, "#0e5e52", "#0a4a40", 12);
  rect(ctx, 0, 90, ROOM_W, 6, "#073229");           // skirting trim
  // floor — light wood planks with perspective
  vGradient(ctx, 0, 96, ROOM_W, ROOM_H - 96, "#c79a5e", "#9a6f3a", 10);
  for (let x = -40; x < ROOM_W + 40; x += 18) {
    ctx.strokeStyle = "rgba(60,40,20,0.35)";
    ctx.beginPath();
    ctx.moveTo(x, 96);
    ctx.lineTo(160 + (x - 160) * 1.7, ROOM_H);
    ctx.stroke();
  }
  rect(ctx, 0, 95, ROOM_W, 1, "#5f3c1d");

  // window with Linköping skyline (right)
  const wx = 232, wy = 14, ww = 74, wh = 50;
  rect(ctx, wx - 3, wy - 3, ww + 6, wh + 6, "#063b33");
  vGradient(ctx, wx, wy, ww, wh, "#bfe8ff", "#eaf6ff", 8);
  // cathedral spire + rooftops
  rect(ctx, wx + 8, wy + 26, 50, 24, "#7c93a8");
  rect(ctx, wx + 30, wy + 8, 8, 42, "#6a7d92");
  for (let i = 0; i < 6; i++) px(ctx, wx + 34, wy + 2 + i, "#5a6c80"); // spire
  rect(ctx, wx + 33, wy, 2, 4, "#4a5a6e");
  rect(ctx, wx + 14, wy + 32, 6, 8, "#9fb4c6");
  rect(ctx, wx + 46, wy + 30, 8, 10, "#9fb4c6");
  // muntins
  rect(ctx, wx + ww / 2 - 1, wy, 2, wh, "#063b33");
  rect(ctx, wx, wy + wh / 2 - 1, ww, 2, "#063b33");

  // big TEAMTAILOR sign on the wall (left of window)
  drawSign(ctx, 18, 20, "teamtailor");
  // little tagline
  textTiny(ctx, 18, 42, "RECRUIT . AW . REPEAT", "#063b33");

  // kitchenette counter (right, below window)
  rect(ctx, 226, 70, 94, 26, "#caa46a");
  rect(ctx, 226, 70, 94, 3, "#e6c894");
  rect(ctx, 226, 94, 94, 2, "#7a5226");
  // coffee machine on the counter
  const cmx = 244, cmy = 50;
  rect(ctx, cmx, cmy, 22, 22, "#22222e");
  rect(ctx, cmx + 2, cmy + 2, 18, 8, "#3a3a4a");
  rect(ctx, cmx + 4, cmy + 4, 6, 4, st.flags.coffeeOn ? "#46b85c" : "#d23b2b");
  px(ctx, cmx + 13, cmy + 6, "#9fe8ff");
  rect(ctx, cmx + 7, cmy + 12, 8, 6, "#15151d"); // nozzle bay
  rect(ctx, cmx + 9, cmy + 18, 4, 3, "#0b0b12");

  // fika table (left-centre) with the kanelbulle
  rect(ctx, 70, 92, 46, 4, "#5f3c1d");
  rect(ctx, 74, 96, 4, 22, "#5f3c1d");
  rect(ctx, 108, 96, 4, 22, "#5f3c1d");
  rect(ctx, 68, 86, 50, 8, "#7a4d24");
  rect(ctx, 70, 84, 46, 4, "#9a6233");
  if (!st.flags.tookBun) {
    // a plate + bun on the table
    rect(ctx, 84, 82, 16, 4, "#d6d6d0");
    sprite(ctx, ICONS.bun, 84, 70, { scale: 1 });
  }

  // a desk with monitor running the ATS (centre-left)
  rect(ctx, 120, 78, 70, 6, "#5a3a1a");
  rect(ctx, 128, 84, 6, 18, "#3a2410");
  rect(ctx, 176, 84, 6, 18, "#3a2410");
  // monitor
  rect(ctx, 138, 52, 40, 26, "#15151d");
  vGradient(ctx, 141, 55, 34, 20, "#0a4a40", "#0e5e52", 6);
  rect(ctx, 144, 58, 18, 3, "#34d0b4");
  rect(ctx, 144, 63, 26, 2, "#9fe8ff");
  rect(ctx, 144, 67, 22, 2, "#9fe8ff");
  rect(ctx, 154, 78, 8, 6, "#22222e");
  rect(ctx, 150, 84, 16, 2, "#0b0b12");
  // sticky note stuck to the monitor frame
  if (!st.flags.tookNote) {
    rect(ctx, 150, 50, 11, 10, "#f2d04a");
    rect(ctx, 152, 52, 7, 1, "#7a6010");
    rect(ctx, 152, 55, 5, 1, "#7a6010");
    rect(ctx, 150, 58, 11, 2, "#caa42a");
  }

  // a clean mug waiting on the counter (pick it up for coffee)
  if (!st.flags.tookMug) sprite(ctx, ICONS.mug, 296, 64, { scale: 1 });

  // badge door (exit, left wall) with status light
  rect(ctx, 6, 40, 34, 56, "#063b33");
  rect(ctx, 9, 43, 28, 53, st.flags.officeUnlocked ? "#1a6f2e" : "#5a3a1a");
  vGradient(ctx, 11, 45, 24, 49, "#7a4d24", "#5f3c1d", 6);
  rect(ctx, 14, 46, 18, 18, "#9fe8ff");           // door window
  rect(ctx, 30, 70, 4, 8, "#f2d04a");             // handle
  // badge reader
  rect(ctx, 41, 64, 7, 12, "#22222e");
  rect(ctx, 43, 67, 3, 3, st.flags.officeUnlocked ? "#46b85c" : "#d23b2b");

  // pot plant (decor) on the floor, far right
  rect(ctx, 300, 112, 14, 14, "#9a6233");
  rect(ctx, 302, 114, 10, 10, "#7a4d24");
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI;
    rect(ctx, (307 + Math.cos(a) * 6) | 0, (106 - Math.sin(a) * 9) | 0, 2, 9, "#2c8540");
  }
}

// 2 — STREET outside the office (morning, Linköping)
export function paintStreet(ctx, t, st) {
  // sky
  vGradient(ctx, 0, 0, ROOM_W, 64, "#9fd0f0", "#dff0fb", 10);
  // sun + clouds
  rect(ctx, 40, 12, 10, 10, "#fff4c0");
  cloud(ctx, 120, 16); cloud(ctx, 220, 10); cloud(ctx, 270, 22);
  // distant cathedral
  rect(ctx, 150, 30, 22, 30, "#b9c6d4");
  rect(ctx, 158, 14, 6, 46, "#a6b6c6");
  for (let i = 0; i < 8; i++) px(ctx, 160, 6 + i, "#94a6b8");
  // building facade (the office)
  rect(ctx, 0, 40, 150, 36, "#3a6f64");
  rect(ctx, 0, 38, 150, 4, "#2c564d");
  for (let x = 10; x < 140; x += 26) { rect(ctx, x, 48, 16, 14, "#bfe8ff"); rect(ctx, x, 48, 16, 4, "#9fc8e0"); }
  drawSign(ctx, 16, 24, "teamtailor");
  // entrance with green badge light (player just left)
  rect(ctx, 60, 56, 20, 20, "#1c2c28");
  rect(ctx, 63, 58, 14, 18, "#0e5e52");
  // pavement
  vGradient(ctx, 0, 76, ROOM_W, 20, "#9aa0a8", "#7c828a", 6);
  rect(ctx, 0, 76, ROOM_W, 2, "#b6bcc4");
  // cobbled road
  vGradient(ctx, 0, 96, ROOM_W, ROOM_H - 96, "#5c6068", "#43464d", 8);
  speckle(ctx, 0, 96, ROOM_W, ROOM_H - 96, "#33363c", 0.06, 7);
  for (let y = 100; y < ROOM_H; y += 8)
    for (let x = (y % 16); x < ROOM_W; x += 16) rect(ctx, x, y, 7, 6, "#4d5158");

  // bike rack with bikes (right)
  rect(ctx, 210, 92, 96, 2, "#3a3a44");
  for (let i = 0; i < 3; i++) bike(ctx, 216 + i * 30, 70, i === 1);
  // helmet on a hook (left of bikes)
  if (!st.flags.tookHelmet) {
    rect(ctx, 196, 60, 2, 14, "#5a5a64"); // hook post
    rect(ctx, 192, 60, 8, 2, "#5a5a64");
    sprite(ctx, ICONS.helmet, 188, 60, { scale: 1 });
  }
  // a small bus stop sign (decor + flavour)
  rect(ctx, 290, 60, 2, 36, "#888");
  rect(ctx, 284, 56, 14, 8, "#d23b2b");
  textTiny(ctx, 286, 58, "BUS", "#fff");
}

// 3 — THE ESCAPE ROOM ("the mansion"), gloomy
export function paintEscape(ctx, t, st) {
  // walls — dark green/teal mansion wallpaper
  vGradient(ctx, 0, 0, ROOM_W, 100, "#1c2230", "#10131c", 12);
  for (let x = 6; x < ROOM_W; x += 20)
    for (let y = 6; y < 96; y += 16) px(ctx, x, y, "#2a3346");
  rect(ctx, 0, 96, ROOM_W, 6, "#0a0c12");
  // creaky floorboards
  vGradient(ctx, 0, 100, ROOM_W, ROOM_H - 100, "#3a2c1c", "#241a10", 8);
  for (let x = 0; x < ROOM_W; x += 22) rect(ctx, x, 100, 1, ROOM_H - 100, "#160f08");

  // cobwebs in corners
  cobweb(ctx, 0, 0, false); cobweb(ctx, ROOM_W, 0, true);

  // bookshelf (left)
  rect(ctx, 8, 18, 60, 80, "#3a2410");
  rect(ctx, 8, 18, 60, 80, "#3a2410");
  frame(ctx, 8, 18, 60, 80, "#5f3c1d");
  for (let s = 0; s < 4; s++) {
    const sy = 24 + s * 18;
    rect(ctx, 12, sy + 14, 52, 3, "#5f3c1d");
    let bx = 14;
    const cols = ["#7a3b8f", "#2c8540", "#9a2417", "#c9a82f", "#3f7fb0", "#5f3c1d"];
    while (bx < 62) {
      const bw = 3 + (bx * 7 % 3);
      rect(ctx, bx, sy + 2, bw, 12, cols[(bx + s) % cols.length]);
      bx += bw + 1;
    }
  }

  // painting (centre) — slides aside to reveal the safe
  const px0 = 130;
  if (!st.flags.paintingMoved) {
    rect(ctx, px0, 22, 44, 40, "#5f3c1d");
    frame(ctx, px0, 22, 44, 40, "#c9a82f");
    vGradient(ctx, px0 + 3, 25, 38, 34, "#2a1f3a", "#4d2259", 6);
    // a little purple tentacle painted in it (foreshadowing)
    sprite(ctx, BUG, px0 + 13, 30, { scale: 0.0 }); // (skip; just hint)
    rect(ctx, px0 + 18, 38, 8, 16, "#7a3b8f");
    rect(ctx, px0 + 16, 36, 12, 4, "#7a3b8f");
  } else {
    // painting pushed to the side
    rect(ctx, px0 + 30, 22, 22, 40, "#5f3c1d");
    frame(ctx, px0 + 30, 22, 22, 40, "#c9a82f");
  }
  // the safe (revealed)
  if (st.flags.paintingMoved) {
    rect(ctx, px0, 26, 32, 32, "#3a3a44");
    frame(ctx, px0, 26, 32, 32, "#5a5a64");
    rect(ctx, px0 + 4, 30, 24, 24, st.flags.safeOpen ? "#0a0c12" : "#22222e");
    if (st.flags.safeOpen) {
      if (!st.flags.tookKey) sprite(ctx, ICONS.key, px0 + 8, 32, {});
    } else {
      // keypad
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++)
          rect(ctx, px0 + 8 + c * 6, 33 + r * 6, 4, 4, "#46b85c");
      rect(ctx, px0 + 22, 30, 6, 6, "#f2d04a"); // dial
    }
  }

  // candles for mood
  candle(ctx, 80, 70, t); candle(ctx, 250, 64, t + 1.3);

  // the VAULT exit door (right) — heavy, with a wheel
  const vx = 252;
  rect(ctx, vx, 24, 60, 78, "#2a2f3a");
  frame(ctx, vx, 24, 60, 78, "#4a5160");
  rect(ctx, vx + 6, 30, 48, 66, st.flags.vaultOpen ? "#f2d04a" : "#1a1f28");
  if (st.flags.vaultOpen) {
    // warm light spilling out (the way to AW!)
    vGradient(ctx, vx + 6, 30, 48, 66, "#ffd86a", "#e89020", 8);
    textTiny(ctx, vx + 16, 60, "AW->", "#5f3c1d");
  } else {
    // wheel + bolts
    ctx.strokeStyle = "#6a7180"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(vx + 30, 62, 14, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
    for (let a = 0; a < 8; a++) {
      const an = a / 8 * Math.PI * 2;
      px(ctx, vx + 30 + Math.cos(an) * 18 | 0, 62 + Math.sin(an) * 18 | 0, "#8a93a6");
    }
    rect(ctx, vx + 28, 60, 4, 4, "#22222e");
  }

  // little brass plaque "EXIT — if you dare"
  rect(ctx, vx + 12, 26, 36, 4, "#c9a82f");
}

// 4 — THE AW BAR (afterwork), warm & cosy
export function paintBar(ctx, t, st) {
  // back wall
  vGradient(ctx, 0, 0, ROOM_W, 96, "#3a2233", "#1c1018", 12);
  // string lights
  for (let i = 0; i < 14; i++) {
    const x = 10 + i * 22;
    const y = 10 + Math.sin(i * 0.9) * 4;
    rect(ctx, x, y | 0, 1, 6, "#5a4a2a");
    const cols = ["#f2d04a", "#46b85c", "#d23b2b", "#6db5d8"];
    const glow = (Math.sin(t * 2 + i) * 0.5 + 0.5) > 0.3;
    px(ctx, x, (y + 6) | 0, glow ? cols[i % 4] : "#3a3020");
  }
  // neon AW sign
  neonAW(ctx, 130, 26, t);
  // shelves with bottles
  rect(ctx, 16, 56, 130, 3, "#3a2a18");
  rect(ctx, 16, 72, 130, 3, "#3a2a18");
  for (let x = 20; x < 142; x += 9) {
    bottle(ctx, x, 44 + (x % 3) * 2, x);
    bottle(ctx, x, 60 + (x % 2) * 2, x + 5);
  }
  // window to a Linköping night (right)
  rect(ctx, 232, 18, 70, 40, "#0a0c16");
  for (let i = 0; i < 30; i++) px(ctx, 236 + (i * 53 % 62), 22 + (i * 37 % 32), "#ffe9a0");
  rect(ctx, 248, 30, 10, 26, "#1a2230"); rect(ctx, 252, 22, 2, 8, "#101620"); // spire silhouette

  // bar counter (foreground)
  vGradient(ctx, 0, 96, ROOM_W, ROOM_H - 96, "#7a4d24", "#4a2c12", 8);
  rect(ctx, 0, 96, ROOM_W, 5, "#9a6233");
  rect(ctx, 0, 101, ROOM_W, 1, "#c9a06a");
  // a few full glasses on the bar
  for (let i = 0; i < 4; i++) glassMini(ctx, 40 + i * 26, 104);
  // pendant lamp glow over counter
  ctx.fillStyle = "rgba(255,210,120,0.10)";
  ctx.beginPath(); ctx.moveTo(160, 0); ctx.lineTo(80, 120); ctx.lineTo(240, 120); ctx.closePath(); ctx.fill();
}

/* ---------------------------- small prop helpers ----------------------- */

function drawSign(ctx, x, y, txt) {
  // teal pill with white lowercase wordmark
  const w = txt.length * 7 + 10;
  ctx.fillStyle = "#00a98f";
  roundRect(ctx, x, y, w, 14, 7);
  ctx.fill();
  textWord(ctx, x + 6, y + 4, txt, "#f6f6fb");
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// tiny built-in 5x7-ish word renderer for the wordmark / signs only
const MICRO = {
  t:["  X  "," XXX ","  X  ","  X  ","  X  ","  XX "],
  e:[" XXX ","X   X","XXXXX","X    "," XXX "," XXX "],
  a:[" XXX ","    X"," XXXX","X   X"," XXXX"," XXXX"],
  m:["X   X","XX XX","X X X","X   X","X   X","X   X"],
  i:["  X  ","     ","  X  ","  X  ","  X  ","  X  "],
  l:[" X   "," X   "," X   "," X   "," X   "," XXX "],
  o:[" XXX ","X   X","X   X","X   X"," XXX "," XXX "],
  r:["XXXX ","X   X","XXXX ","X X  ","X  X ","X  X "],
};
function textWord(ctx, x, y, txt, col) {
  ctx.fillStyle = col;
  let cx = x;
  for (const ch of txt) {
    const g = MICRO[ch];
    if (g) for (let r = 0; r < g.length; r++) for (let c = 0; c < 5; c++) if (g[r][c] === "X") ctx.fillRect(cx + c, y + r, 1, 1);
    cx += 6;
  }
}
function textTiny(ctx, x, y, txt, col) {
  ctx.fillStyle = col;
  let cx = x;
  for (const ch of txt) { ctx.fillRect(cx, y, 1, 3); ctx.fillRect(cx + 1, y, 1, 1); ctx.fillRect(cx + 1, y + 2, 1, 1); cx += 4; }
}

function cloud(ctx, x, y) {
  ctx.fillStyle = "#ffffff";
  rect(ctx, x, y + 4, 26, 6, "#ffffff");
  rect(ctx, x + 6, y, 14, 8, "#ffffff");
  rect(ctx, x + 2, y + 2, 8, 6, "#eef4fa");
}

function bike(ctx, x, y, accent) {
  const col = accent ? "#00a98f" : "#22222e";
  ctx.strokeStyle = col; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x + 4, y + 18, 6, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + 20, y + 18, 6, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 18); ctx.lineTo(x + 12, y + 18); ctx.lineTo(x + 14, y + 8);
  ctx.lineTo(x + 20, y + 18); ctx.moveTo(x + 12, y + 18); ctx.lineTo(x + 16, y + 8);
  ctx.lineTo(x + 14, y + 8); ctx.stroke();
  rect(ctx, x + 4, y + 6, 6, 2, col); // handlebar
  rect(ctx, x + 14, y + 6, 4, 2, col); // seat
}

function cobweb(ctx, x, y, flip) {
  ctx.strokeStyle = "rgba(220,220,230,0.25)"; ctx.lineWidth = 1;
  const s = flip ? -1 : 1;
  for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s * i * 9, y + 28); ctx.stroke(); }
  for (let r = 8; r <= 26; r += 9) { ctx.beginPath(); ctx.moveTo(x + s * r, y); ctx.lineTo(x, y + r); ctx.stroke(); }
}

function candle(ctx, x, y, t) {
  rect(ctx, x, y, 4, 12, "#e6e2d6");
  rect(ctx, x, y, 4, 2, "#c9c5b8");
  const f = Math.sin(t * 8) * 0.5 + 0.5;
  px(ctx, x + 2, y - 2, "#f2d04a");
  rect(ctx, x + 1, y - 4 - (f * 2 | 0), 2, 4 + (f * 2 | 0), "#f7a23a");
  px(ctx, x + 2, y - 6 - (f * 2 | 0), "#fff4c0");
  // glow
  ctx.fillStyle = "rgba(247,162,58,0.08)";
  ctx.beginPath(); ctx.arc(x + 2, y - 4, 16, 0, Math.PI * 2); ctx.fill();
}

function neonAW(ctx, x, y, t) {
  const on = (Math.sin(t * 3) > -0.6);
  const c = on ? "#ff5ea8" : "#5a2a44";
  const c2 = on ? "#6df0ff" : "#244a52";
  ctx.fillStyle = c;
  // A
  for (const [dx,dy,w,h] of [[0,0,2,16],[10,0,2,16],[2,0,8,2],[2,7,8,2]]) ctx.fillRect(x+dx,y+dy,w,h);
  // W
  ctx.fillStyle = c2;
  for (const [dx,dy,w,h] of [[18,0,2,16],[24,4,2,12],[30,0,2,16],[20,14,5,2],[26,14,5,2]]) ctx.fillRect(x+dx,y+dy,w,h);
  if (on) { ctx.fillStyle="rgba(255,94,168,0.12)"; ctx.fillRect(x-6,y-6,46,28); }
}

function bottle(ctx, x, y, seed) {
  const cols = ["#2c8540", "#9a2417", "#3f7fb0", "#c9a82f", "#7a3b8f"];
  const c = cols[seed % cols.length];
  rect(ctx, x + 1, y, 2, 3, c);
  rect(ctx, x, y + 3, 4, 9, c);
  px(ctx, x, y + 4, mix(c, "#ffffff", 0.4));
}

function glassMini(ctx, x, y) {
  rect(ctx, x, y, 8, 2, "#d6d6d0");
  rect(ctx, x + 1, y + 2, 6, 8, "#e8902f");
  rect(ctx, x + 1, y + 2, 6, 2, "#f2d04a");
  rect(ctx, x, y + 10, 8, 2, "#9a9aac");
  px(ctx, x + 1, y + 3, "#fff4c0");
}
