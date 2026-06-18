// art.js — all hand-authored pixel art: the 7-person Teamtailor Linköping
// crew (shared rig, recoloured), item icons, and the four wide side-scrolling
// room painters. Nothing here loads from the network.
import { rect, frame, sprite, speckle, vGradient, px, PAL, mix } from "./pixel.js";

export const ROOM_W = 320;   // viewport width
export const ROOM_H = 136;   // scene viewport height (UI panel sits below)

/* ----------------------------------------------------------------------- *
 *  ACTOR RIG — 16 wide. Frames: front, back, sideA (stand), sideB (stride) *
 *  plus a long-hair front variant. Recoloured per character via override.  *
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

const FRONT_L = [   // long hair (shoulder length)
  "    hhhhhhhh    ",
  "   hhhhhhhhhh   ",
  "  hhhhhhhhhhhh  ",
  "  hhsssssssshh  ",
  "  hhsskssksshh  ",
  "  hhsssssssshh  ",
  "  hhsssssssshh  ",
  "  hhsssssssshh  ",
  "  hhsSsssssShh  ",
  "  hh ssssss hh  ",
  "  hh  ssss  hh  ",
  "  h    ss    h  ",
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

export const ACTOR = { FRONT, FRONT_L, BACK, SIDE_A, SIDE_B };
export const ACTOR_W = 16;
export const ACTOR_H = 24;

// The real Teamtailor Linköping product crew that went out yesterday.
export const SKINS = {
  jonas:    { h: "#5a3a1f", H: "#3a2412", t: "#00a98f", T: "#00715f" },
  anders:   { h: "#9a7a3a", H: "#6a5226", t: "#2c8540", T: "#1c5a2a" },
  emil:     { h: "#e8c451", H: "#c9a82f", t: "#3f7fb0", T: "#2c5a82" },
  rikard:   { h: "#4a3020", H: "#2a1a10", t: "#b0468f", T: "#7a2c62" },
  oskar:    { h: "#23232a", H: "#121217", t: "#e8902f", T: "#b56a18" },
  caroline: { h: "#e8c451", H: "#c9a82f", t: "#e87fb0", T: "#b5527f", long: true },
  per:      { h: "#2a2a30", H: "#141418", t: "#33405e", T: "#202a40" },
  // interactive NPCs (old-school adventure-game cast)
  host:     { h: "#3a2a18", H: "#241409", t: "#7a1f2b", T: "#511019" },  // Game Master, red vest
  guard:    { h: "#2a2a30", H: "#141418", t: "#26406a", T: "#172a4a" },  // bank guard, navy
  bartend:  { h: "#3a2a18", H: "#241409", t: "#1f6a5a", T: "#124a3e" },  // bartender, teal
  busker:   { h: "#6a4326", H: "#3c2615", t: "#7a5a8f", T: "#4d2259" },  // street busker
  curator:  { h: "#d8c4b0", H: "#b89a82", s: "#ecd6c2", S: "#c4ac96", t: "#26262f", T: "#141419", j: "#1a1a20", J: "#0c0c10" }, // the villain: pale, balding, black coat
};

// id, name, role, skin key, blurb, long-hair flag.
export const TEAM = [
  { id: "jonas",    name: "Jonas",    role: "Platform dev",      skin: "jonas",    blurb: "Platform team. Keeps the lights on; opens the heavy stuff." },
  { id: "anders",   name: "Anders",   role: "Platform dev",      skin: "anders",   blurb: "Platform team. The other half of the muscle." },
  { id: "emil",     name: "Emil",     role: "Aboard dev",        skin: "emil",     blurb: "Aboard product. Has never lost an escape room. Allegedly." },
  { id: "rikard",   name: "Rikard",   role: "Mobile dev",        skin: "rikard",   blurb: "Mobile team. There's an app — and a UV torch — for that." },
  { id: "oskar",    name: "Oskar",    role: "Co-pilot dev",      skin: "oskar",    blurb: "Co-pilot team. Autocompletes your next move. Press H for a hint." },
  { id: "caroline", name: "Caroline", role: "Payroll / controller", skin: "caroline", long: true, blurb: "Payroll & controller. Numbers are her love language." },
  { id: "per",      name: "Per",      role: "CISO",              skin: "per",      blurb: "Chief Information Security Officer. Reads wiring like prod logs." },
];

/* ----------------------------------------------------------------------- *
 *  ITEM ICONS — 16x16                                                      *
 * ----------------------------------------------------------------------- */
export const ICONS = {
  keycard: [
    "                ","  tttttttttttt  ","  tWWWWWWWWWWt  ","  tWyyWWWWWWWt  ",
    "  tWyyWWkkkWWt  ","  tWWWWWkWkWWt  ","  tWWWWWkkkWWt  ","  tWWWWWWWWWWt  ",
    "  tTTTTTTTTTTt  ","  tWWWWWWWWWWt  ","  tWkkkkkkkkWt  ","  tWWWWWWWWWWt  ",
    "  tttttttttttt  ","                ","                ","                ",
  ],
  phone: [
    "                ","    kkkkkkkk    ","    kiiiiiik    ","    kiuuuuik    ",
    "    kiuppuik    ","    kippppik    ","    kiuppuik    ","    kiiiiiik    ",
    "    kiiiiiik    ","    kiiiiiik    ","    kkkokkkk    ","    kkkkkkkk    ",
    "                ","                ","                ","                ",
  ],
  mug: [
    "                ","                ","   WWWWWWWW     ","  WWWWWWWWWW    ",
    "  WW      WW WW ","  WW      WWW WW","  WW      WW  WW","  WW      WW WW ",
    "  WW      WWWW  ","  WW      WW    ","  WWWWWWWWWW    ","   WWWWWWWW     ",
    "    qqqqqq      ","                ","                ","                ",
  ],
  coffee: [
    "      ggg       ","     g g g      ","   WWWWWWWW g   ","  WWWWWWWWWW    ",
    "  WWeeeeeeWW WW ","  WWEEEEEEWWW WW","  WWeeeeeeWW  WW","  WWEEEEEEWW WW ",
    "  WWeeeeeeWWWW  ","  WW      WW    ","  WWWWWWWWWW    ","   WWWWWWWW     ",
    "    qqqqqq      ","                ","                ","                ",
  ],
  bun: [
    "                ","                ","    EEEEEEEE    ","   EeeeeeeeeE   ",
    "  EeeEEeeEEeeE  ","  EeEwwEewwEeE  ","  EeEwHHEwHHeE  ","  EeeEEeeEEeeE  ",
    "  EeeeeeeeeeeE  ","  EeeEwwEwwEeE  ","   EeeeeeeeeE   ","    EEEEEEEE    ",
    "    EEEEEEEE    ","                ","                ","                ",
  ],
  helmet: [
    "                ","                ","    LLLLLLLL    ","   LLllllllLL   ",
    "  LLllLllLllLL  ","  LlllkllkllLL  ","  LlllllllllLL  ","  LLllllllllLL  ",
    "  bbLLLLLLLLbb  ","    b      b    ","    b      b    ","                ",
    "                ","                ","                ","                ",
  ],
  loot: [   // duffel bag of cash
    "                ","                ","    kk    kk    ","   kEEkkkkEEk   ",
    "  EEEEEEEEEEEE  "," EEnEnEnEnEnEEE "," EnEnEnEnEnEnEE "," EEEEEEEEEEEEEE ",
    " EnyEnEnEnEynEE "," EEnEnEnEnEnEEE ","  EEEEEEEEEEEE  ","   EEEEEEEEEE   ",
    "                ","                ","                ","                ",
  ],
  gold: [   // gold bar
    "                ","                ","                ","     yyyyyy     ",
    "    yYYYYYYy    ","   yYwwwwwwYy   ","  yYYYYYYYYYYy  "," yYwwwwwwwwwwYy ",
    " yYYYYYYYYYYYYy ","  yyyyyyyyyyyy  ","                ","                ",
    "                ","                ","                ","                ",
  ],
  keg: [    // beer keg
    "                ","     qqqqqq     ","    qWWWWWWq    ","   qGGGGGGGGq   ",
    "   GqGGGGGGqG   ","   GGGGGGGGGG   ","   GqGGGGGGqG   ","   GGGGGGGGGG   ",
    "   GqGGGGGGqG   ","   qGGGGGGGGq   ","    qWWWWWWq    ","     qqqqqq     ",
    "       yy       ","      yooy      ","                ","                ",
  ],
  wirecut: [   // wire cutters
    "                ","   r        r   ","   rr      rr   ","    rr    rr    ",
    "     rr  rr     ","      rrrr      ","      kkkk      ","      gkkg      ",
    "      gkkg      ","      gkkg      ","      gggg      ","      gggg      ",
    "                ","                ","                ","                ",
  ],
  ledger: [   // accounting ledger / book
    "                ","   EEEEEEEEEE   ","   ExxxxxxxxE   ","   ExkxkxkxxE   ",
    "   ExxxxxxxxE   ","   ExkxkxkkxE   ","   ExxxxxxxxE   ","   ExkxkxxxxE   ",
    "   ExxxxxxxxE   ","   ExkkxkxkxE   ","   ExxxxxxxxE   ","   EEEEEEEEEE   ",
    "       rr       ","       rr       ","                ","                ",
  ],
  beer: [
    "                ","    y    y      ","   WWWWWWWW     ","   WyyyyyyW WW  ",
    "   WyyyyyyW  W  ","   WoooooyW  W  ","   WooooooW  W  ","   WooooooW WW  ",
    "   WooooooW     ","   WooooooW     ","   WWWWWWWW     ","    qqqqqq      ",
    "                ","                ","                ","                ",
  ],
  cabkey: [   // small brass key (cabinet)
    "                ","     yyyy       ","    yy  yy      ","    yy  yy      ",
    "    yy  yy      ","     yyyy       ","      yy        ","      yy        ",
    "      yy        ","      yyy       ","      yy        ","      yyy       ",
    "      yy        ","                ","                ","                ",
  ],
  card: [    // corporate credit card
    "                ","                ","  LLLLLLLLLLLL  ","  LkkkkkkkkkkL  ",
    "  LkGGGGGGGGkL  ","  Lkyy kkkk kL  ","  Lkyy kkkk kL  ","  LkGGGGGGGGkL  ",
    "  LkWWWWWWWWkL  ","  Lk88 88 88 L  ","  LLLLLLLLLLLL  ","                ",
    "                ","                ","                ","                ",
  ],
  uvlight: [ // UV blacklight torch
    "                ","        kkk     ","       kuuuk    ","      kupppuk   ",
    "      kupppuk   ","       kkkkk    ","        kkk     ","        kkk     ",
    "       kGGGk    ","       kGGGk    ","       kGGGk    ","       kkkkk    ",
    "                ","                ","                ","                ",
  ],
  note: [
    "                ","  yyyyyyyyyyyy  ","  yyyyyyyyyyyy  ","  yykkkkkkkyyy  ",
    "  yyyyyyyyyyyy  ","  yykkkkkkkkyy  ","  yyyyyyyyyyyy  ","  yykkkkkyyyyy  ",
    "  yyyyyyyyyyyy  ","  yykkkkkkkyyo  ","  yyyyyyyyyooo  ","  yyyyyyyyoooo  ",
    "                ","                ","                ","                ",
  ],
  choklad: [   // a bar of Cloetta chocolate (Linköping's finest)
    "                ","   rrrrrrrrrr   ","   rWWWWWWWWr   ","   rWEEEEEEWr   ",
    "   rWEHEHEEWr   ","   rWEEEEHEWr   ","   rWEHEEEEWr   ","   rWEEEHEEWr   ",
    "   rWEEEEEEWr   ","   rWWWWWWWWr   ","   rrrrrrrrrr   ","                ",
    "                ","                ","                ","                ",
  ],
  drive: [     // the prototype / master data drive (glowing USB)
    "                ","                ","      cccc      ","     ciiiic     ",
    "     ciiiic     ","     ciiiic     ","     cccccccc   ","    cGGGGGGc    ",
    "    cGkkkkGc    ","    cGGGGGGc    ","    cccccccc    ","     qqqqqq     ",
    "                ","                ","                ","                ",
  ],
  folder: [    // evidence folder
    "                ","                ","   eeeeee       ","   eeeeeeeeee   ",
    "   exxxxxxxxe   ","   exrrrrrrxe   ","   exxxxxxxxe   ","   exkkkkkkxe   ",
    "   exxxxxxxxe   ","   exkkkkxxxe   ","   exxxxxxxxe   ","   eeeeeeeeee   ",
    "       rr       ","       rr       ","                ","                ",
  ],
  mirror: [    // a hand mirror (laser fallback)
    "                ","     qqqq       ","    qllllq      ","   qlwlllqq     ",
    "   qlllwllq     ","   qllllllq     ","   qllllllq     ","    qllllq      ",
    "     qqqq        ","      qq        ","      qq        ","      qq        ",
    "     qqqq       ","                ","                ","                ",
  ],
};
// inventory icon aliases (same art, distinct item ids)
ICONS.prototype = ICONS.drive;
ICONS.master = ICONS.drive;
ICONS.evidence = ICONS.folder;

export function actorShadow(ctx, cx, cy, w, scale) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  const rw = (w * scale) * 0.42;
  for (let i = -rw; i <= rw; i++) {
    const h = Math.sqrt(Math.max(0, 1 - (i / rw) * (i / rw))) * 2.4 * scale;
    ctx.fillRect((cx + i) | 0, (cy - h / 2) | 0, 1, Math.max(1, h) | 0);
  }
}

// Draw an NPC accessory on top of the shared rig, in sprite-cell space.
// x,y = sprite top-left, sc = scale. Keeps NPCs visually distinct.
export function drawAccessory(ctx, type, x, y, sc) {
  const C = (cx, cy, cw, ch, col) => { ctx.fillStyle = col; ctx.fillRect(Math.floor(x + cx * sc), Math.floor(y + cy * sc), Math.ceil(cw * sc), Math.ceil(ch * sc)); };
  if (type === "cap") {            // guard's peaked cap
    C(3, 1, 10, 3, "#16233f"); C(2, 3, 12, 1, "#0e1830"); C(1, 4, 7, 1, "#0e1830"); C(7, 2, 2, 1, "#c9a82f");
  } else if (type === "beanie") {  // busker's beanie
    C(3, 0, 10, 3, "#2c8540"); C(2, 2, 12, 2, "#2c8540"); C(3, 0, 2, 1, "#46b85c");
  } else if (type === "apron") {   // bartender's apron
    C(4, 12, 8, 9, "#d8d2c0"); C(5, 12, 6, 1, "#b8b2a0"); C(7, 12, 2, 2, "#9a948a");
  } else if (type === "bowtie") {  // host's bow tie
    C(6, 11, 4, 2, "#c9a82f"); C(7, 11, 2, 2, "#7a1f2b");
  } else if (type === "goggles") { // the Curator's red goggles
    C(2, 4, 12, 2, "#16161c"); C(4, 4, 3, 2, "#d23b2b"); C(9, 4, 3, 2, "#d23b2b");
  }
}

// Render a head-and-shoulders portrait of a crew member into a square cell.
export function drawPortrait(ctx, skin, x, y, size, long) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
  const s = size / 11;
  sprite(ctx, long ? FRONT_L : FRONT, x - 2.5 * s, y - 0.5 * s, { scale: s, override: skin });
  ctx.restore();
}

/* ======================================================================= *
 *  ROOM PAINTERS  (draw in world space 0..width; camera translates them)   *
 * ======================================================================= */

// 1 — TEAMTAILOR OFFICE (Linköping). width 480. Exit (door) at the far right.
export const OFFICE_W = 360;
export function paintOffice(ctx, t, st) {
  vGradient(ctx, 0, 0, OFFICE_W, 92, "#0e5e52", "#0a4a40", 12);
  rect(ctx, 0, 90, OFFICE_W, 6, "#073229");
  vGradient(ctx, 0, 96, OFFICE_W, ROOM_H - 96, "#c79a5e", "#9a6f3a", 10);
  rect(ctx, 0, 95, OFFICE_W, 1, "#5f3c1d");
  for (let x = 0; x < OFFICE_W; x += 24) rect(ctx, x, 96, 1, ROOM_H - 96, "#7a5226");

  drawSign(ctx, 12, 14, "teamtailor");
  textTiny(ctx, 12, 34, "PRODUCT . LINKOPING", "#063b33");

  // a window with the Linköping skyline
  const wx = 250;
  rect(ctx, wx - 3, 11, 70, 52, "#063b33");
  vGradient(ctx, wx, 14, 64, 46, "#bfe8ff", "#eaf6ff", 8);
  rect(ctx, wx + 26, 22, 8, 38, "#6a7d92"); for (let i = 0; i < 6; i++) px(ctx, wx + 30, 16 + i, "#5a6c80");
  rect(ctx, wx + 8, 38, 44, 22, "#7c93a8"); rect(ctx, wx + 32, 14, 2, 46, "#063b33"); rect(ctx, wx, 36, 64, 2, "#063b33");

  // supply cabinet (left) — holds the company card
  const cbx = 18, cby = 70;
  rect(ctx, cbx, cby, 36, 50, "#3a4658"); frame(ctx, cbx, cby, 36, 50, "#566075");
  rect(ctx, cbx + 3, cby + 3, 14, 44, "#2a3340"); rect(ctx, cbx + 19, cby + 3, 14, 44, "#2a3340");
  if (st.flags.cabinetOpen) {
    rect(ctx, cbx + 3, cby + 3, 30, 44, "#11161e");
    if (!st.flags.tookCard) sprite(ctx, ICONS.card, cbx + 9, cby + 16, { scale: 0.9 });
  } else {
    rect(ctx, cbx + 16, cby + 22, 4, 6, "#f2d04a");
    rect(ctx, cbx + 10, cby + 24, 4, 2, "#c9a82f"); rect(ctx, cbx + 22, cby + 24, 4, 2, "#c9a82f");
  }

  // pot plant — a key glints in the soil
  rect(ctx, 66, 108, 16, 18, "#9a6233"); rect(ctx, 68, 110, 12, 6, "#3a2410");
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI; rect(ctx, (74 + Math.cos(a) * 6) | 0, 103 - (Math.sin(a) * 9) | 0, 2, 9, "#2c8540"); }
  if (!st.flags.tookCabKey) { px(ctx, 72, 112, "#f2d04a"); px(ctx, 73, 112, "#fff4c0"); px(ctx, 74, 113, "#f2d04a"); }

  // kitchenette counter with the coffee machine
  rect(ctx, 96, 78, 70, 4, "#caa46a"); rect(ctx, 96, 78, 70, 2, "#e6c894"); rect(ctx, 96, 96, 70, 2, "#7a5226");
  const cmx = 108, cmy = 56;
  rect(ctx, cmx, cmy, 22, 22, "#22222e"); rect(ctx, cmx + 2, cmy + 2, 18, 8, "#3a3a4a");
  rect(ctx, cmx + 4, cmy + 4, 6, 4, st.flags.coffeeOn ? "#46b85c" : "#d23b2b"); px(ctx, cmx + 13, cmy + 6, "#9fe8ff");
  rect(ctx, cmx + 7, cmy + 12, 8, 6, "#15151d"); rect(ctx, cmx + 9, cmy + 18, 4, 3, "#0b0b12");
  // a clean mug on the counter
  if (!st.flags.tookMug) sprite(ctx, ICONS.mug, 146, 64, { scale: 0.8 });

  // fika table with a kanelbulle
  rect(ctx, 176, 92, 40, 4, "#5f3c1d"); rect(ctx, 180, 96, 4, 20, "#5f3c1d"); rect(ctx, 208, 96, 4, 20, "#5f3c1d");
  rect(ctx, 174, 86, 44, 7, "#7a4d24"); rect(ctx, 176, 84, 40, 4, "#9a6233");
  if (!st.flags.tookBun) { rect(ctx, 186, 82, 16, 4, "#d6d6d0"); sprite(ctx, ICONS.bun, 186, 70, { scale: 1 }); }

  // a desk + monitor (the tip glows on screen)
  rect(ctx, 226, 80, 60, 6, "#5a3a1a"); rect(ctx, 232, 86, 6, 16, "#3a2410"); rect(ctx, 278, 86, 6, 16, "#3a2410");
  rect(ctx, 238, 54, 40, 26, "#15151d"); vGradient(ctx, 241, 57, 34, 20, "#0a4a40", "#0e5e52", 6);
  rect(ctx, 244, 60, 18, 3, "#34d0b4"); rect(ctx, 244, 65, 26, 2, "#9fe8ff"); rect(ctx, 244, 69, 20, 2, "#9fe8ff");

  // exit door (far right)
  const dx = OFFICE_W - 40;
  rect(ctx, dx, 34, 36, 62, "#063b33"); vGradient(ctx, dx + 4, 38, 28, 56, "#7a4d24", "#5f3c1d", 6);
  rect(ctx, dx + 7, 42, 20, 18, "#9fe8ff"); rect(ctx, dx + 26, 70, 4, 10, "#f2d04a");
  rect(ctx, dx - 8, 64, 7, 12, "#22222e"); rect(ctx, dx - 6, 67, 3, 3, st.flags.officeUnlocked ? "#46b85c" : "#d23b2b");
  textTiny(ctx, dx - 2, 30, "EXIT", "#9fe8ff");
}

// 2 — THE STREET: the connected hub. width 760. Doors to everywhere.
export const STREET_W = 760;
export function paintStreet(ctx, t, st) {
  vGradient(ctx, 0, 0, STREET_W, 64, "#f0b27a", "#f6d9a8", 10);
  rect(ctx, 60, 10, 9, 9, "#fff0c0"); cloud(ctx, 150, 14); cloud(ctx, 380, 8); cloud(ctx, 600, 18);
  // distant cathedral spire over the square
  rect(ctx, 372, 22, 22, 38, "#caa98f"); rect(ctx, 380, 6, 6, 54, "#b9967c"); for (let i = 0; i < 8; i++) px(ctx, 382, -2 + i, "#a8836a");
  // continuous facade
  vGradient(ctx, 0, 34, STREET_W, 46, "#3a4150", "#2a313e", 8); rect(ctx, 0, 32, STREET_W, 3, "#222833");
  drawSign(ctx, 14, 16, "teamtailor");
  // doors / places along the street
  doorway(ctx, 36, "OFFICE", "#00a98f");
  kiosk(ctx, 176);
  doorway(ctx, 360, "CATHEDRAL", "#c9a82f");
  doorway(ctx, 500, "OLBACKEN", "#e8902f");
  board(ctx, 590, st);
  vaultFront(ctx, 660, st);
  // pavement + road
  vGradient(ctx, 0, 80, STREET_W, 16, "#9aa0a8", "#7c828a", 6); rect(ctx, 0, 80, STREET_W, 2, "#b6bcc4");
  vGradient(ctx, 0, 96, STREET_W, ROOM_H - 96, "#5c6068", "#43464d", 8);
  speckle(ctx, 0, 96, STREET_W, ROOM_H - 96, "#33363c", 0.05, 7);
  for (let y = 100; y < ROOM_H; y += 8) for (let x = (y % 16); x < STREET_W; x += 16) rect(ctx, x, y, 7, 6, "#4d5158");
  for (let i = 0; i < 3; i++) bike(ctx, 286 + i * 24, 96, i === 1);
  // a helmet on a hook by the bikes
  if (!st.flags.tookHelmet) { rect(ctx, 268, 80, 2, 12, "#5a5a64"); rect(ctx, 264, 80, 8, 2, "#5a5a64"); sprite(ctx, ICONS.helmet, 260, 80, { scale: 0.8 }); }
}

// scrolling background for the bike MINI-GAME (parametric by scroll distance)
export function paintBikeRide(ctx, scroll, night) {
  vGradient(ctx, 0, 0, ROOM_W, 96, night ? "#0c1430" : "#f3b87e", night ? "#202a4a" : "#f8dcae", 10);
  rect(ctx, night ? 30 : 40, 12, 9, 9, night ? "#e8e8d0" : "#fff0c0");
  if (night) for (let i = 0; i < 36; i++) px(ctx, (i * 71 + 13) % ROOM_W, (i * 53) % 56, "#2a3550");
  // far skyline (slow parallax)
  const s1 = (scroll * 0.4) | 0;
  for (let i = 0; i < 12; i++) { let x = ((i * 80 - s1) % 960 + 960) % 960 - 80; const h = 16 + (i % 4) * 9; rect(ctx, x, 70 - h, 60, h, night ? "#0e1830" : "#6a5a82"); }
  // cathedral sweeping past (mid parallax)
  let cx = ((420 - (scroll * 0.7)) % 1100 + 1100) % 1100 - 90;
  rect(ctx, cx, 44, 18, 26, night ? "#1a2440" : "#b9967c"); rect(ctx, cx + 6, 24, 6, 46, night ? "#101a30" : "#a8836a");
  // road (fills the whole screen height — the mini-game has no UI panel)
  vGradient(ctx, 0, 96, ROOM_W, 104, night ? "#1a1f2c" : "#5c6068", night ? "#10131c" : "#3a3d44", 8);
  rect(ctx, 0, 96, ROOM_W, 2, night ? "#2a3550" : "#b6bcc4");
  const d = (scroll * 4) | 0;
  for (let x = -(d % 44); x < ROOM_W; x += 44) { rect(ctx, x, 118, 22, 2, night ? "#3a4560" : "#9aa0a8"); rect(ctx, x + 10, 150, 26, 3, night ? "#2f3850" : "#888d96"); }
}
function doorway(ctx, x, label, color) {
  rect(ctx, x, 44, 32, 36, "#1a1f28"); frame(ctx, x, 44, 32, 36, "#11151c");
  rect(ctx, x + 4, 48, 24, 32, "#0c0f16");
  rect(ctx, x - 1, 37, 34, 7, color); textTiny(ctx, x + 2, 38, label, "#0a0a12");
  rect(ctx, x + 23, 62, 3, 8, "#c9a06a");
}
function kiosk(ctx, x) {
  for (let i = 0; i < 6; i++) rect(ctx, x + i * 8, 44, 8, 7, i % 2 ? "#d23b2b" : "#f6f6fb");
  rect(ctx, x, 51, 46, 29, "#7a4d24"); frame(ctx, x, 51, 46, 29, "#9a6233");
  rect(ctx, x + 4, 66, 38, 14, "#3a2410");
  rect(ctx, x + 5, 57, 36, 7, "#15151d"); textTiny(ctx, x + 8, 59, "CLOETTA", "#f2d04a");
  sprite(ctx, ICONS.choklad, x + 15, 64, { scale: 0.7 });
}
function vaultFront(ctx, x, st) {
  rect(ctx, x, 34, 90, 46, "#2a2f3a"); rect(ctx, x, 32, 90, 3, "#1a1f28");
  rect(ctx, x + 28, 42, 34, 34, "#3a4150");
  ctx.strokeStyle = "#6a7180"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 45, 59, 11, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1;
  rect(ctx, x + 12, 62, 66, 18, "#15151d"); textTiny(ctx, x + 16, 68, "THE VAULT . ESCAPE", "#f2d04a");
  rect(ctx, x + 40, 80, 16, 16, "#0a0c12");
}
function board(ctx, x, st) {
  rect(ctx, x, 50, 46, 30, "#5f3c1d"); frame(ctx, x, 50, 46, 30, "#9a6233");
  rect(ctx, x + 4, 54, 38, 22, "#e8e2d0");
  for (let i = 0; i < 4; i++) rect(ctx, x + 7, 57 + i * 5, 26 - (i % 2) * 6, 1, "#2a2a30");
  rect(ctx, x + 18, 44, 2, 8, "#6a6a72");
}

// 2b — CATHEDRAL SQUARE (branch). width 360. Optional clue + flavour.
export const CATH_W = 360;
export function paintCathedral(ctx, t, st) {
  vGradient(ctx, 0, 0, CATH_W, 70, "#f0b27a", "#f6d9a8", 10);
  cloud(ctx, 60, 12); cloud(ctx, 250, 8);
  // cathedral facade
  rect(ctx, 70, 8, 220, 72, "#caa98f"); rect(ctx, 70, 6, 220, 4, "#b9967c");
  rect(ctx, 172, -2, 18, 82, "#b9967c"); for (let i = 0; i < 12; i++) px(ctx, 180, -14 + i, "#a8836a");
  // rose window
  ctx.fillStyle = "#7a3b8f"; ctx.beginPath(); ctx.arc(181, 30, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#c9a82f"; ctx.beginPath(); ctx.arc(181, 30, 4, 0, Math.PI * 2); ctx.fill();
  // arched doors
  for (const dx of [120, 220]) { rect(ctx, dx, 50, 22, 30, "#3a2a18"); rect(ctx, dx + 2, 46, 18, 8, "#5f3c1d"); }
  // ground / square
  vGradient(ctx, 0, 80, CATH_W, ROOM_H - 80, "#8a8f98", "#6a6f78", 6); rect(ctx, 0, 80, CATH_W, 2, "#a6acb4");
  for (let x = 0; x < CATH_W; x += 18) rect(ctx, x, 96, 1, ROOM_H - 96, "#5a5f68");
  // a coin telescope (clue/easter egg)
  rect(ctx, 300, 86, 4, 18, "#3a4150"); rect(ctx, 292, 78, 22, 8, st.flags.usedScope ? "#46b85c" : "#2a3550"); rect(ctx, 312, 80, 6, 4, "#15151d");
  rect(ctx, 296, 74, 4, 4, "#c9a82f");
  // a bench
  rect(ctx, 40, 100, 34, 3, "#5f3c1d"); rect(ctx, 44, 103, 3, 8, "#3a2410"); rect(ctx, 68, 103, 3, 8, "#3a2410");
}

// 3 — THE BANK-HEIST ESCAPE ROOM. width 640. Stations spread L->R, exit far right.
export const HEIST_W = 640;
export function paintHeist(ctx, t, st) {
  // marble-ish bank interior, dim
  vGradient(ctx, 0, 0, HEIST_W, 100, "#26303f", "#171d28", 12);
  for (let x = 0; x < HEIST_W; x += 40) rect(ctx, x, 0, 2, 100, "#2e3a4c"); // pilasters
  rect(ctx, 0, 96, HEIST_W, 6, "#0c0f16");
  // polished floor
  vGradient(ctx, 0, 102, HEIST_W, ROOM_H - 102, "#3a4150", "#222833", 8);
  for (let x = 0; x < HEIST_W; x += 30) rect(ctx, x, 102, 1, ROOM_H - 102, "#161b24");
  rect(ctx, 0, 102, HEIST_W, 1, "#566075");

  // hanging "BANK" sign
  rect(ctx, 40, 8, 70, 18, "#0c0f16"); frame(ctx, 40, 8, 70, 18, "#c9a82f");
  textTiny(ctx, 48, 14, "FIRST VAULT BANK", "#f2d04a");

  // --- Station 1: UV poster (x ~ 40) ---
  rect(ctx, 36, 34, 40, 40, "#1a2230"); frame(ctx, 36, 34, 40, 40, "#3a4658");
  if (st.flags.uvSeen) {
    // glyphs glowing
    ctx.fillStyle = "#b06fc7";
    textTiny(ctx, 44, 50, "DIAMOND TRI DOT", "#c89fff");
    rect(ctx, 44, 44, 6, 4, "#7a3b8f"); rect(ctx, 54, 44, 6, 4, "#7a3b8f"); rect(ctx, 64, 44, 6, 4, "#7a3b8f");
  } else {
    rect(ctx, 42, 40, 28, 28, "#222d3c");
    textTiny(ctx, 46, 52, "?????", "#3a4658");
  }
  textTiny(ctx, 40, 76, "POSTER", "#5a6678");

  // --- Station 2: cipher wheel (x ~ 120) ---
  const cwx = 132, cwy = 56;
  ctx.fillStyle = st.flags.cipherDone ? "#46b85c" : "#5a4a2a";
  ctx.beginPath(); ctx.arc(cwx, cwy, 18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#0c0f16"; ctx.beginPath(); ctx.arc(cwx, cwy, 12, 0, Math.PI * 2); ctx.fill();
  for (let a = 0; a < 8; a++) { const an = a / 8 * Math.PI * 2 + (st.flags.cipherDone ? 0 : t); px(ctx, (cwx + Math.cos(an) * 15) | 0, (cwy + Math.sin(an) * 15) | 0, "#c9a82f"); }
  if (st.flags.cipherDone) textTiny(ctx, cwx - 14, cwy - 2, "4 8 7 3", "#9fffb0");
  textTiny(ctx, cwx - 14, 78, "CIPHER", "#5a6678");

  // --- Station 3: manager desk + ledger + drawer (UV light) ---
  rect(ctx, 196, 84, 60, 8, "#5a3a1a"); rect(ctx, 200, 92, 6, 14, "#3a2410"); rect(ctx, 246, 92, 6, 14, "#3a2410");
  rect(ctx, 210, 92, 32, 12, "#4a3018"); frame(ctx, 210, 92, 32, 12, "#6a4a28");
  if (st.flags.drawerOpen) { rect(ctx, 212, 94, 28, 8, "#11141a"); if (!st.flags.tookUV) sprite(ctx, ICONS.uvlight, 216, 89, { scale: 0.7 }); }
  else rect(ctx, 224, 96, 4, 2, "#c9a82f");
  sprite(ctx, ICONS.ledger, 214, 70, { scale: 0.9 });

  // way back out to the street (you can leave and return mid-game)
  rect(ctx, 4, 40, 24, 56, "#0c1018"); frame(ctx, 4, 40, 24, 56, "#2a3550");
  rect(ctx, 8, 44, 16, 48, "#1a2230"); textTiny(ctx, 6, 34, "OUT", "#9fe8ff");

  // --- Station 4: the SAFE / vault (x ~ 320) ---
  const sx = 300;
  rect(ctx, sx, 30, 70, 64, "#2a2f3a"); frame(ctx, sx, 30, 70, 64, "#566075");
  rect(ctx, sx + 6, 36, 58, 52, st.flags.safeOpen ? "#0a0c12" : "#1c2230");
  if (st.flags.safeOpen) {
    if (!st.flags.gotLoot) { sprite(ctx, ICONS.loot, sx + 14, 48, {}); sprite(ctx, ICONS.gold, sx + 36, 56, { scale: 0.8 }); }
    else textTiny(ctx, sx + 20, 58, "EMPTY", "#566075");
  } else {
    ctx.strokeStyle = "#8a93a6"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sx + 35, 62, 13, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1;
    for (let a = 0; a < 8; a++) { const an = a / 8 * Math.PI * 2; px(ctx, (sx + 35 + Math.cos(an) * 17) | 0, (62 + Math.sin(an) * 17) | 0, "#6a7180"); }
    // keypad
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) rect(ctx, sx + 8 + c * 5, 38 + r * 5, 3, 3, "#46b85c");
  }
  textTiny(ctx, sx + 22, 30 - 0, "", "#000");

  // toolbox between safe and alarm (holds wire cutters)
  rect(ctx, 398, 82, 28, 16, "#9a2417"); frame(ctx, 398, 82, 28, 16, "#d23b2b");
  rect(ctx, 408, 79, 8, 3, "#6a6a72");
  if (st.flags.toolboxOpen) { rect(ctx, 400, 84, 24, 12, "#2a0f0c"); if (!st.flags.tookCutters) sprite(ctx, ICONS.wirecut, 402, 83, { scale: 0.7 }); }

  // --- Station 5: alarm panel (x ~ 430) ---
  const ax = 440;
  rect(ctx, ax, 40, 30, 34, "#1a1f28"); frame(ctx, ax, 40, 30, 34, st.flags.alarmOff ? "#46b85c" : "#d23b2b");
  for (let i = 0; i < 5; i++) rect(ctx, ax + 6 + i * 4, 48, 2, 14, ["#d23b2b", "#e8902f", "#f2d04a", "#3f7fb0", "#46b85c"][i]);
  rect(ctx, ax + 10, 44, 10, 3, st.flags.alarmOff ? "#46b85c" : "#d23b2b");
  textTiny(ctx, ax - 2, 76, "ALARM", "#5a6678");

  // --- co-op pressure plate: someone must STAND here to power the vault ---
  const plx = 496, plw = 50, held = st.flags.plateHeld;
  rect(ctx, plx, 126, plw, 6, held ? "#2c8540" : "#2a3340");
  frame(ctx, plx, 126, plw, 6, held ? "#9fffb0" : "#566075");
  rect(ctx, plx + plw / 2 - 9, 122, 18, 4, held ? "#46b85c" : "#1c2330");
  textTiny(ctx, plx + 6, 116, held ? "PWR ON" : "STAND HERE", held ? "#9fffb0" : "#5a6678");

  // --- the heavy EXIT vault door (far right) ---
  const ex = HEIST_W - 70;
  rect(ctx, ex, 22, 66, 80, "#222833"); frame(ctx, ex, 22, 66, 80, "#4a5160");
  if (st.flags.escaped) {
    vGradient(ctx, ex + 6, 28, 54, 68, "#f6d9a8", "#e8902f", 8);
    textTiny(ctx, ex + 16, 60, "OUT->", "#5f3c1d");
  } else {
    rect(ctx, ex + 6, 28, 54, 68, "#161b24");
    ctx.strokeStyle = "#6a7180"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(ex + 33, 64, 15, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1;
    for (let a = 0; a < 8; a++) { const an = a / 8 * Math.PI * 2; px(ctx, (ex + 33 + Math.cos(an) * 20) | 0, (64 + Math.sin(an) * 20) | 0, "#8a93a6"); }
    // status leds: power (plate held) + alarm
    rect(ctx, ex + 8, 30, 4, 4, st.flags.plateHeld ? "#46b85c" : "#d23b2b");
    rect(ctx, ex + 54, 30, 4, 4, st.flags.alarmOff ? "#46b85c" : "#d23b2b");
  }
  textTiny(ctx, ex + 20, 14, "VAULT", "#c9a82f");
}

// 4 — ÖLBACKEN. width 560. The big one: bar + keg, stage/live music, food, company.
export const PUB_W = 560;
export function paintPub(ctx, t, st) {
  vGradient(ctx, 0, 0, PUB_W, 100, st.flags.musicOn ? "#46243d" : "#3a2233", "#1c1018", 12);
  // string lights
  for (let i = 0; i < 26; i++) {
    const x = 10 + i * 22, y = 10 + Math.sin(i * 0.9) * 4;
    rect(ctx, x, y | 0, 1, 6, "#5a4a2a");
    const cols = ["#f2d04a", "#46b85c", "#d23b2b", "#6db5d8"];
    const on = st.flags.musicOn ? (Math.sin(t * 6 + i) * 0.5 + 0.5) > 0.25 : (Math.sin(t * 2 + i) * 0.5 + 0.5) > 0.3;
    px(ctx, x, (y + 6) | 0, on ? cols[i % 4] : "#3a3020");
  }
  // sign
  rect(ctx, 36, 20, 120, 18, "#0c0f16"); frame(ctx, 36, 20, 120, 18, "#e8902f");
  textTiny(ctx, 46, 26, "OLBACKEN . AW", "#f2d04a");

  // bottle shelves behind the bar (left)
  rect(ctx, 12, 56, 150, 3, "#3a2a18"); rect(ctx, 12, 72, 150, 3, "#3a2a18");
  for (let x = 16; x < 158; x += 9) { bottle(ctx, x, 44 + (x % 3) * 2, x); bottle(ctx, x, 60 + (x % 2) * 2, x + 5); }

  // window to a Linköping night (mid-back)
  rect(ctx, 282, 16, 70, 34, "#0a0c16");
  for (let i = 0; i < 28; i++) px(ctx, 286 + (i * 53 % 62), 20 + (i * 37 % 26), "#ffe9a0");

  // --- STAGE + live band (right) ---
  const sgx = 392;
  rect(ctx, sgx, 72, 160, 28, "#241018"); rect(ctx, sgx, 70, 160, 3, "#3a1c28");
  if (st.flags.musicOn) { ctx.fillStyle = "rgba(255,210,120,0.13)"; ctx.beginPath(); ctx.moveTo(sgx + 80, 0); ctx.lineTo(sgx + 24, 100); ctx.lineTo(sgx + 136, 100); ctx.closePath(); ctx.fill(); }
  rect(ctx, sgx + 8, 54, 18, 18, st.flags.musicOn ? "#2a2a30" : "#1a1a20"); rect(ctx, sgx + 11, 57, 12, 8, "#3a3a44"); px(ctx, sgx + 13, 59, st.flags.musicOn ? "#46b85c" : "#d23b2b");
  // three musicians
  const inst = ["#7a3b8f", "#3f7fb0", "#9a2417"];
  for (let i = 0; i < 3; i++) { const bx = sgx + 44 + i * 36, bob = st.flags.musicOn ? Math.round(Math.sin(t * 6 + i) * 1.5) : 0; rect(ctx, bx, 50 + bob, 12, 22, inst[i]); rect(ctx, bx + 2, 43 + bob, 8, 7, "#e8b890"); rect(ctx, bx + 3, 40 + bob, 6, 4, "#3a2414"); }
  if (st.flags.musicOn) for (let i = 0; i < 7; i++) { const nx = sgx + 24 + ((i * 47 + t * 46) % 130), ny = 42 - ((t * 32 + i * 18) % 38); px(ctx, nx | 0, ny | 0, "#f2d04a"); px(ctx, (nx + 1) | 0, (ny - 2) | 0, "#fff4c0"); }
  textTiny(ctx, sgx + 64, 102, "LIVE", st.flags.musicOn ? "#f2d04a" : "#5a6678");

  // --- tables for good company (centre) ---
  for (const tx of [176, 250]) { rect(ctx, tx, 104, 42, 5, "#5a3a1a"); rect(ctx, tx + 4, 109, 4, 16, "#3a2410"); rect(ctx, tx + 34, 109, 4, 16, "#3a2410"); }
  // food on the first table
  rect(ctx, 182, 100, 18, 5, st.flags.ateFood ? "#5a3a1a" : "#d6d6d0");
  if (!st.flags.ateFood) { rect(ctx, 184, 98, 10, 4, "#e8902f"); rect(ctx, 204, 100, 8, 4, "#46b85c"); }

  // --- bar counter (foreground) + keg ---
  vGradient(ctx, 0, 110, PUB_W, ROOM_H - 110, "#7a4d24", "#4a2c12", 8);
  rect(ctx, 0, 110, PUB_W, 4, "#9a6233"); rect(ctx, 0, 114, PUB_W, 1, "#c9a06a");
  if (!st.flags.kegTapped) sprite(ctx, ICONS.keg, 44, 78, { scale: 1.3 });
  else { sprite(ctx, ICONS.keg, 44, 82, { scale: 1.0 }); for (let i = 0; i < 5; i++) glassMini(ctx, 78 + i * 18, 118); }
  // tab board behind the bar
  rect(ctx, 168, 54, 28, 18, "#0c0f16"); frame(ctx, 168, 54, 28, 18, st.flags.tabOpen ? "#46b85c" : "#5a3a1a");
  textTiny(ctx, 172, 60, st.flags.tabOpen ? "TAB OK" : "PAY", st.flags.tabOpen ? "#9fffb0" : "#d23b2b");

  ctx.fillStyle = "rgba(255,210,120,0.08)";
  ctx.beginPath(); ctx.moveTo(110, 0); ctx.lineTo(30, 120); ctx.lineTo(210, 120); ctx.closePath(); ctx.fill();

  // the way home (far right)
  rect(ctx, 516, 40, 38, 70, "#241018"); frame(ctx, 516, 40, 38, 70, "#3a1c28");
  rect(ctx, 520, 44, 30, 60, "#3a2a1a");
  rect(ctx, 526, 48, 18, 22, "#0a0c16"); // night through the doorway window
  for (let i = 0; i < 8; i++) px(ctx, 528 + (i * 31 % 14), 50 + (i * 17 % 18), "#ffe9a0");
  rect(ctx, 522, 76, 4, 8, "#c9a06a");
  textTiny(ctx, 522, 32, "HOME", "#e8902f");
}

// 5 — THE CONTROL ROOM (the Curator's lair behind the vault). width 600.
export const CONTROL_W = 600;
export function paintControl(ctx, t, st) {
  vGradient(ctx, 0, 0, CONTROL_W, 100, "#10131c", "#070910", 12);
  rect(ctx, 0, 96, CONTROL_W, 6, "#05070c");
  vGradient(ctx, 0, 102, CONTROL_W, ROOM_H - 102, "#1a1f2a", "#10131b", 8);
  for (let x = 0; x < CONTROL_W; x += 28) rect(ctx, x, 102, 1, ROOM_H - 102, "#0a0d14");
  rect(ctx, 0, 102, CONTROL_W, 1, "#2a3550");

  // wall of monitors — harvested companies
  const cols = ["#2c8540", "#3f7fb0", "#d23b2b", "#c9a82f", "#7a3b8f", "#1f6a5a"];
  for (let i = 0; i < 8; i++) {
    const mx = 18 + i * 62, my = 10 + (i % 2) * 6;
    rect(ctx, mx, my, 46, 26, "#0c0f16"); frame(ctx, mx, my, 46, 26, "#2a3550");
    const fl = (Math.sin(t * 3 + i) * 0.5 + 0.5) > 0.5;
    vGradient(ctx, mx + 2, my + 2, 42, 22, cols[i % cols.length], "#0c1018", 5);
    for (let r = 0; r < 3; r++) rect(ctx, mx + 5, my + 5 + r * 5, 10 + (i * 7 + r * 5) % 26, 2, fl ? "#9fe8ff" : "#3a4658");
  }
  textTiny(ctx, 18, 40, "HARVESTED . CONFIDENTIAL", "#d23b2b");

  // mirror on a shelf (laser fallback), far left
  if (!st.flags.tookMirror) { rect(ctx, 36, 70, 18, 3, "#3a2f24"); sprite(ctx, ICONS.mirror, 36, 56, { scale: 0.7 }); }

  // the Curator's desk + terminals + evidence folder
  rect(ctx, 150, 80, 92, 6, "#2a2f3a"); rect(ctx, 158, 86, 6, 16, "#1a1f28"); rect(ctx, 228, 86, 6, 16, "#1a1f28");
  rect(ctx, 160, 60, 28, 20, "#0c0f16"); vGradient(ctx, 162, 62, 24, 16, "#0e5e52", "#0a4a40", 5); rect(ctx, 165, 65, 14, 2, "#34d0b4");
  rect(ctx, 198, 62, 30, 18, "#0c0f16"); vGradient(ctx, 200, 64, 26, 14, "#7a1f2b", "#4d1019", 5);
  if (!st.flags.tookEvidence) sprite(ctx, ICONS.folder, 206, 64, { scale: 0.7 });

  // laser tripwire guarding the lever + server
  const lx = 300, lw = 116;
  const beam = st.flags.lasersOff ? "#143a18" : "#3a1014", led = st.flags.lasersOff ? "#46b85c" : "#d23b2b";
  rect(ctx, lx - 4, 34, 4, 56, beam); rect(ctx, lx + lw, 34, 4, 56, beam);
  for (let i = 0; i < 3; i++) { rect(ctx, lx - 4, 40 + i * 18, 4, 3, led); rect(ctx, lx + lw, 40 + i * 18, 4, 3, led); }
  if (!st.flags.lasersOff) for (let i = 0; i < 3; i++) { ctx.fillStyle = "rgba(210,59,43,0.8)"; ctx.fillRect(lx, 41 + i * 18, lw, 1); }

  // power lever
  rect(ctx, 424, 58, 10, 32, "#2a2f3a"); rect(ctx, 421, st.flags.powerCut ? 78 : 56, 16, 8, st.flags.powerCut ? "#46b85c" : "#d23b2b");
  textTiny(ctx, 420, 92, "PWR", "#5a6678");

  // server rack with the docked prototype
  const sx = 446;
  rect(ctx, sx, 28, 70, 74, "#15191f"); frame(ctx, sx, 28, 70, 74, "#2a3550");
  for (let r = 0; r < 9; r++) { rect(ctx, sx + 4, 32 + r * 7, 62, 5, "#0c0f16"); const on = (Math.sin(t * 5 + r) * 0.5 + 0.5) > (st.flags.powerCut ? 1.1 : 0.4); rect(ctx, sx + 60, 33 + r * 7, 3, 3, on ? "#46b85c" : (st.flags.powerCut ? "#222831" : "#d23b2b")); }
  if (!st.flags.tookPrototype) { rect(ctx, sx + 20, 84, 16, 10, st.flags.powerCut ? "#0c0f16" : "#0e5e52"); sprite(ctx, ICONS.drive, sx + 18, 80, { scale: 0.7 }); }
  textTiny(ctx, sx + 8, 22, "PROJECT AURORA", "#34d0b4");

  // way back down to the vault room (far left)
  rect(ctx, 4, 44, 22, 52, "#0a0d14"); frame(ctx, 4, 44, 22, 52, "#2a3550"); textTiny(ctx, 4, 38, "VAULT", "#5a6678");

  // stairs up to the roof (far right)
  const ux = CONTROL_W - 44;
  for (let i = 0; i < 5; i++) rect(ctx, ux + i * 7, 94 - i * 11, 42 - i * 7, 9, "#2a2f3a");
  textTiny(ctx, ux + 4, 26, "ROOF", st.flags.curatorFled ? "#f2d04a" : "#3a4658");
}

// 6 — THE ROOFTOP (the getaway). width 480.
export const ROOF_W = 380;
export function paintRoof(ctx, t, st) {
  vGradient(ctx, 0, 0, ROOF_W, 96, "#0a0e20", "#141a34", 12);
  for (let i = 0; i < 48; i++) px(ctx, (i * 89) % ROOF_W, (i * 53) % 70, i % 4 ? "#2a3550" : "#6a7aa0");
  rect(ctx, 60, 14, 8, 8, "#e8e8d0"); // moon
  for (let i = 0; i < 7; i++) { const x = i * 58, h = 20 + (i % 3) * 12; rect(ctx, x, 70 - h, 48, h, "#0c1428"); for (let w = 4; w < 44; w += 8) if ((i * 7 + w) % 3) rect(ctx, x + w, 70 - h + 4, 4, 4, "#caa84a"); }
  rect(ctx, 226, 28, 16, 42, "#10182c"); rect(ctx, 231, 12, 6, 58, "#0c1426"); for (let i = 0; i < 5; i++) px(ctx, 234, 6 + i, "#caa84a"); // cathedral
  // deck
  vGradient(ctx, 0, 96, ROOF_W, ROOM_H - 96, "#3a3f4a", "#22262e", 8); rect(ctx, 0, 96, ROOF_W, 2, "#566075");
  rect(ctx, 44, 80, 38, 18, "#4a5160"); frame(ctx, 44, 80, 38, 18, "#2a3550"); for (let i = 0; i < 3; i++) rect(ctx, 50 + i * 11, 84, 7, 10, "#2a3550");
  rect(ctx, 118, 86, 18, 12, "#3a4150");
  ctx.fillStyle = "#c9a82f"; ctx.fillRect(150, 118, 3, 12); ctx.fillRect(166, 118, 3, 12); ctx.fillRect(153, 123, 13, 3); // helipad H
  // door back down (left)
  rect(ctx, 8, 70, 26, 28, "#1a1f28"); frame(ctx, 8, 70, 26, 28, "#2a3550"); textTiny(ctx, 8, 64, "DOWN", "#5a6678");
  // the escape drone (right) + dangling case
  const dx = 300, dy = 40 + Math.sin(t * 3) * 3;
  if (!st.flags.droneDown) {
    rect(ctx, dx - 22, dy, 44, 4, "#2a2f3a");
    for (const wx of [dx - 22, dx + 14]) { ctx.strokeStyle = "#6a7180"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(wx + 4, dy - 2, 9, 2, 0, 0, Math.PI * 2); ctx.stroke(); }
    const blade = (Math.sin(t * 40) > 0); if (blade) { for (const wx of [dx - 22, dx + 14]) rect(ctx, wx - 4, dy - 3, 16, 1, "#9aa3b4"); }
    rect(ctx, dx - 7, dy + 2, 14, 9, "#d23b2b"); px(ctx, dx, dy + 5, "#9fe8ff");
    rect(ctx, dx - 1, dy + 11, 2, 24, st.flags.tetherCut ? "#3a4150" : "#8a93a6");
    if (!st.flags.tetherCut) { rect(ctx, dx - 6, dy + 35, 12, 10, "#5f3c1d"); if (!st.flags.tookMaster) sprite(ctx, ICONS.drive, dx - 7, dy + 34, { scale: 0.6 }); }
  }
  if (st.flags.tetherCut && !st.flags.tookMaster) { rect(ctx, dx - 6, 116, 12, 10, "#5f3c1d"); sprite(ctx, ICONS.drive, dx - 7, 114, { scale: 0.7 }); }
}

/* ---------------------------- prop helpers ----------------------------- */

// Full-screen cutscene card: the crew biking across Linköping (day or night).
export function paintBikeCard(ctx, t, night) {
  vGradient(ctx, 0, 0, ROOM_W, 96, night ? "#0c1430" : "#f3b87e", night ? "#202a4a" : "#f8dcae", 10);
  rect(ctx, night ? 44 : 64, 16, 10, 10, night ? "#e8e8d0" : "#fff0c0"); // moon / sun
  if (night) for (let i = 0; i < 40; i++) px(ctx, (i * 97) % ROOM_W, (i * 53) % 60, "#2a3550");
  // scrolling skyline
  const sc = (t * 60) | 0;
  for (let i = 0; i < 10; i++) {
    let x = ((i * 70 - sc) % 700 + 700) % 700 - 60; const h = 18 + (i % 3) * 10;
    rect(ctx, x, 96 - h, 52, h, night ? "#0e1830" : "#6a5a82");
    for (let w = 4; w < 48; w += 10) rect(ctx, x + w, 96 - h + 4, 5, 5, night ? "#1a2a44" : "#caa6c0");
  }
  // cathedral spire sweeping past
  let cx = ((360 - sc * 1.2) % 760 + 760) % 760 - 80;
  rect(ctx, cx, 50, 18, 46, night ? "#1a2440" : "#b9967c"); rect(ctx, cx + 6, 30, 6, 66, night ? "#101a30" : "#a8836a");
  for (let i = 0; i < 6; i++) px(ctx, cx + 8, 24 + i, night ? "#0c1426" : "#94735e");
  // road + speed dashes
  vGradient(ctx, 0, 116, ROOM_W, ROOM_H - 116, night ? "#1a1f2c" : "#5c6068", night ? "#0c1018" : "#43464d", 6);
  rect(ctx, 0, 116, ROOM_W, 2, night ? "#2a3550" : "#b6bcc4");
  const dof = (t * 220) | 0;
  for (let x = -(dof % 44); x < ROOM_W; x += 44) rect(ctx, x, 130, 22, 2, night ? "#3a4560" : "#9aa0a8");
  // three cyclists, pedalling
  const cols = ["#00a98f", "#e87fb0", "#33405e"];
  for (let i = 0; i < 3; i++) cyclist(ctx, 96 + i * 64, 120, cols[i], t + i * 0.6, night);
}
function cyclist(ctx, x, y, col, t, night) {
  const spoke = night ? "#cfd6e0" : "#15151b";
  for (const wx of [x - 7, x + 7]) {
    ctx.strokeStyle = spoke; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(wx, y, 5, 0, Math.PI * 2); ctx.stroke();
    const a = t * 12; ctx.beginPath(); ctx.moveTo(wx + Math.cos(a) * 5, y + Math.sin(a) * 5); ctx.lineTo(wx - Math.cos(a) * 5, y - Math.sin(a) * 5); ctx.stroke();
  }
  ctx.strokeStyle = col; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x, y); ctx.lineTo(x + 7, y); ctx.moveTo(x, y); ctx.lineTo(x + 2, y - 8); ctx.stroke();
  rect(ctx, x - 10, y - 9, 6, 2, "#3a3a44");
  const bob = Math.round(Math.sin(t * 12));
  rect(ctx, x - 2, y - 16 + bob, 6, 9, col);
  rect(ctx, x - 1, y - 22 + bob, 5, 6, "#e8b890");
  rect(ctx, x - 1, y - 24 + bob, 5, 3, night ? "#222831" : "#3a2414");
}

// Opening title card: a vault under a spotlight.
export function paintTitleCard(ctx, t) {
  vGradient(ctx, 0, 0, ROOM_W, ROOM_H, "#161020", "#06060c", 12);
  // spotlight cone
  ctx.fillStyle = "rgba(242,208,74,0.10)";
  ctx.beginPath(); ctx.moveTo(160, 0); ctx.lineTo(96, 120); ctx.lineTo(224, 120); ctx.closePath(); ctx.fill();
  // a big vault door
  rect(ctx, 128, 36, 64, 64, "#222833"); frame(ctx, 128, 36, 64, 64, "#4a5160");
  rect(ctx, 134, 42, 52, 52, "#161b24");
  ctx.strokeStyle = "#8a93a6"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(160, 68, 16, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1;
  for (let a = 0; a < 8; a++) { const an = a / 8 * Math.PI * 2 + t; px(ctx, (160 + Math.cos(an) * 22) | 0, (68 + Math.sin(an) * 22) | 0, "#c9a82f"); }
  // glint
  if (Math.sin(t * 4) > 0.6) px(ctx, 150, 54, "#fff4c0");
}

/* ---------------------------- prop helpers ----------------------------- */
function drawSign(ctx, x, y, txt) {
  const w = txt.length * 7 + 10;
  ctx.fillStyle = "#00a98f"; roundRect(ctx, x, y, w, 14, 7); ctx.fill();
  textWord(ctx, x + 6, y + 4, txt, "#f6f6fb");
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
const MICRO = {
  t:["  X  "," XXX ","  X  ","  X  ","  X  ","  XX "], e:[" XXX ","X   X","XXXXX","X    "," XXX "," XXX "],
  a:[" XXX ","    X"," XXXX","X   X"," XXXX"," XXXX"], m:["X   X","XX XX","X X X","X   X","X   X","X   X"],
  i:["  X  ","     ","  X  ","  X  ","  X  ","  X  "], l:[" X   "," X   "," X   "," X   "," X   "," XXX "],
  o:[" XXX ","X   X","X   X","X   X"," XXX "," XXX "], r:["XXXX ","X   X","XXXX ","X X  ","X  X ","X  X "],
};
function textWord(ctx, x, y, txt, col) {
  ctx.fillStyle = col; let cx = x;
  for (const ch of txt) { const g = MICRO[ch]; if (g) for (let r = 0; r < g.length; r++) for (let c = 0; c < 5; c++) if (g[r][c] === "X") ctx.fillRect(cx + c, y + r, 1, 1); cx += 6; }
}
function textTiny(ctx, x, y, txt, col) {
  ctx.fillStyle = col; let cx = x;
  for (const ch of txt) {
    if (ch === " ") { cx += 4; continue; }
    ctx.fillRect(cx, y, 1, 3); ctx.fillRect(cx + 1, y, 1, 1); ctx.fillRect(cx + 1, y + 2, 1, 1); cx += 4;
  }
}
function cloud(ctx, x, y) { rect(ctx, x, y + 4, 26, 6, "#fff6e8"); rect(ctx, x + 6, y, 14, 8, "#fff6e8"); }
function bike(ctx, x, y, accent) {
  const col = accent ? "#00a98f" : "#22222e"; ctx.strokeStyle = col; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x + 4, y + 14, 5, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + 18, y + 14, 5, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 4, y + 14); ctx.lineTo(x + 11, y + 14); ctx.lineTo(x + 13, y + 6); ctx.lineTo(x + 18, y + 14); ctx.stroke();
  rect(ctx, x + 4, y + 4, 6, 2, col); rect(ctx, x + 12, y + 4, 4, 2, col);
}
function bottle(ctx, x, y, seed) {
  const cols = ["#2c8540", "#9a2417", "#3f7fb0", "#c9a82f", "#7a3b8f"]; const c = cols[seed % cols.length];
  rect(ctx, x + 1, y, 2, 3, c); rect(ctx, x, y + 3, 4, 9, c); px(ctx, x, y + 4, mix(c, "#ffffff", 0.4));
}
function glassMini(ctx, x, y) {
  rect(ctx, x, y, 8, 2, "#d6d6d0"); rect(ctx, x + 1, y + 2, 6, 8, "#e8902f");
  rect(ctx, x + 1, y + 2, 6, 2, "#f2d04a"); rect(ctx, x, y + 10, 8, 2, "#9a9aac"); px(ctx, x + 1, y + 3, "#fff4c0");
}

// kept for compatibility (unused in the heist storyline)
export const BUG = FRONT;
export const BUG_W = 16;
