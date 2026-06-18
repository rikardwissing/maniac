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
};

export function actorShadow(ctx, cx, cy, w, scale) {
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  const rw = (w * scale) * 0.42;
  for (let i = -rw; i <= rw; i++) {
    const h = Math.sqrt(Math.max(0, 1 - (i / rw) * (i / rw))) * 2.4 * scale;
    ctx.fillRect((cx + i) | 0, (cy - h / 2) | 0, 1, Math.max(1, h) | 0);
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
export const OFFICE_W = 480;
export function paintOffice(ctx, t, st) {
  vGradient(ctx, 0, 0, OFFICE_W, 92, "#0e5e52", "#0a4a40", 12);
  rect(ctx, 0, 90, OFFICE_W, 6, "#073229");
  vGradient(ctx, 0, 96, OFFICE_W, ROOM_H - 96, "#c79a5e", "#9a6f3a", 10);
  rect(ctx, 0, 95, OFFICE_W, 1, "#5f3c1d");
  for (let x = 0; x < OFFICE_W; x += 24) rect(ctx, x, 96, 1, ROOM_H - 96, "#7a5226");

  // wordmark sign
  drawSign(ctx, 16, 16, "teamtailor");
  textTiny(ctx, 16, 36, "PRODUCT . LINKOPING", "#063b33");

  // windows with Linköping skyline
  for (let wx = 150; wx < 430; wx += 130) {
    rect(ctx, wx - 3, 11, 80, 56, "#063b33");
    vGradient(ctx, wx, 14, 74, 50, "#bfe8ff", "#eaf6ff", 8);
    rect(ctx, wx + 30, 22, 8, 42, "#6a7d92"); // cathedral
    for (let i = 0; i < 6; i++) px(ctx, wx + 34, 16 + i, "#5a6c80");
    rect(ctx, wx + 10, 40, 50, 24, "#7c93a8");
    rect(ctx, wx + 37, 14, 2, 50, "#063b33");
    rect(ctx, wx, 38, 74, 2, "#063b33");
  }

  // a row of standing desks with monitors (the product team's battlestations)
  for (let i = 0; i < 4; i++) {
    const dx = 60 + i * 95;
    rect(ctx, dx, 80, 70, 6, "#5a3a1a");
    rect(ctx, dx + 8, 86, 6, 16, "#3a2410");
    rect(ctx, dx + 56, 86, 6, 16, "#3a2410");
    rect(ctx, dx + 18, 54, 40, 26, "#15151d");
    vGradient(ctx, dx + 21, 57, 34, 20, "#0a4a40", "#0e5e52", 6);
    rect(ctx, dx + 24, 60, 18, 3, "#34d0b4");
    rect(ctx, dx + 24, 65, 26, 2, "#9fe8ff");
    rect(ctx, dx + 24, 69, 20, 2, "#9fe8ff");
  }

  // keycard lying on the first desk
  if (!st.flags.tookCard) sprite(ctx, ICONS.keycard, 70, 66, { scale: 0.8 });

  // exit door at far right (to the street)
  const dx = OFFICE_W - 44;
  rect(ctx, dx, 34, 38, 62, "#063b33");
  vGradient(ctx, dx + 4, 38, 30, 56, "#7a4d24", "#5f3c1d", 6);
  rect(ctx, dx + 8, 42, 22, 20, "#9fe8ff");
  rect(ctx, dx + 28, 70, 4, 10, "#f2d04a");
  rect(ctx, dx - 8, 64, 7, 12, "#22222e"); // badge reader
  rect(ctx, dx - 6, 67, 3, 3, st.flags.officeUnlocked ? "#46b85c" : "#d23b2b");
  textTiny(ctx, dx - 2, 30, "EXIT", "#9fe8ff");

  // pot plant
  rect(ctx, 120, 110, 14, 16, "#9a6233");
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI; rect(ctx, (127 + Math.cos(a) * 6) | 0, (104 - Math.sin(a) * 9) | 0, 2, 9, "#2c8540"); }
}

// 2 — STREET to the venue. width 640. Bank/escape-room entrance at far right.
export const STREET_W = 640;
export function paintStreet(ctx, t, st) {
  vGradient(ctx, 0, 0, STREET_W, 64, "#f0b27a", "#f6d9a8", 10); // late-afternoon sky
  rect(ctx, 70, 10, 9, 9, "#fff0c0"); // low sun
  cloud(ctx, 160, 14); cloud(ctx, 360, 8); cloud(ctx, 520, 20);
  // distant cathedral
  rect(ctx, 250, 28, 22, 32, "#caa98f"); rect(ctx, 258, 12, 6, 48, "#b9967c");
  for (let i = 0; i < 8; i++) px(ctx, 260, 4 + i, "#a8836a");
  // building facades
  const cols = ["#3a6f64", "#7a5a8f", "#8f5a3a", "#5a6f8f"];
  for (let i = 0; i < 5; i++) {
    const bx = i * 110, c = cols[i % cols.length];
    rect(ctx, bx, 36, 108, 44, c);
    rect(ctx, bx, 34, 108, 4, mix(c, "#000", 0.3));
    for (let w = 8; w < 100; w += 24) { rect(ctx, bx + w, 44, 16, 14, "#cfe8f4"); rect(ctx, bx + w, 44, 16, 4, "#a9c8d8"); }
  }
  drawSign(ctx, 18, 22, "teamtailor");

  // pavement + cobbled road
  vGradient(ctx, 0, 80, STREET_W, 16, "#9aa0a8", "#7c828a", 6);
  rect(ctx, 0, 80, STREET_W, 2, "#b6bcc4");
  vGradient(ctx, 0, 96, STREET_W, ROOM_H - 96, "#5c6068", "#43464d", 8);
  speckle(ctx, 0, 96, STREET_W, ROOM_H - 96, "#33363c", 0.05, 7);
  for (let y = 100; y < ROOM_H; y += 8) for (let x = (y % 16); x < STREET_W; x += 16) rect(ctx, x, y, 7, 6, "#4d5158");

  // the ESCAPE ROOM venue at the far right — a vault-door logo
  const vx = STREET_W - 92;
  rect(ctx, vx, 30, 92, 50, "#2a2f3a");
  rect(ctx, vx, 28, 92, 4, "#1a1f28");
  rect(ctx, vx + 30, 40, 34, 34, "#3a4150");
  ctx.strokeStyle = "#6a7180"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(vx + 47, 57, 11, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1;
  rect(ctx, vx + 18, 60, 56, 20, "#15151d");
  textTiny(ctx, vx + 22, 66, "THE VAULT . ESCAPE", "#f2d04a");
  rect(ctx, vx + 40, 80, 16, 16, "#0a0c12"); // doorway

  // a parked tram/bus + bike rack for flavour
  for (let i = 0; i < 3; i++) bike(ctx, 150 + i * 26, 96, i === 1);
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

  // --- Station 3: manager desk + ledger (x ~ 210) ---
  rect(ctx, 196, 84, 60, 8, "#5a3a1a"); rect(ctx, 200, 92, 6, 14, "#3a2410"); rect(ctx, 246, 92, 6, 14, "#3a2410");
  sprite(ctx, ICONS.ledger, 214, 70, { scale: 0.9 });

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

  // --- Station 5: alarm panel (x ~ 430) ---
  const ax = 440;
  rect(ctx, ax, 40, 30, 34, "#1a1f28"); frame(ctx, ax, 40, 30, 34, st.flags.alarmOff ? "#46b85c" : "#d23b2b");
  for (let i = 0; i < 5; i++) rect(ctx, ax + 6 + i * 4, 48, 2, 14, ["#d23b2b", "#e8902f", "#f2d04a", "#3f7fb0", "#46b85c"][i]);
  rect(ctx, ax + 10, 44, 10, 3, st.flags.alarmOff ? "#46b85c" : "#d23b2b");
  textTiny(ctx, ax - 2, 76, "ALARM", "#5a6678");

  // --- Station 6/7: two power valves (x ~ 500, 540) ---
  for (const [vx, on, who] of [[500, st.flags.leftValve, "L"], [540, st.flags.rightValve, "R"]]) {
    ctx.strokeStyle = on ? "#46b85c" : "#8a93a6"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(vx, 66, 10, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1;
    rect(ctx, vx - 1, 56, 2, 20, on ? "#46b85c" : "#6a7180");
    rect(ctx, vx - 12, 78, 24, 4, "#2a2f3a");
  }
  textTiny(ctx, 502, 84, "PWR", "#5a6678");

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
    // status leds: power + alarm
    rect(ctx, ex + 8, 30, 4, 4, (st.flags.leftValve && st.flags.rightValve) ? "#46b85c" : "#d23b2b");
    rect(ctx, ex + 54, 30, 4, 4, st.flags.alarmOff ? "#46b85c" : "#d23b2b");
  }
  textTiny(ctx, ex + 20, 14, "VAULT", "#c9a82f");
}

// 4 — ÖLBACKEN pub. width 480.
export const PUB_W = 480;
export function paintPub(ctx, t, st) {
  vGradient(ctx, 0, 0, PUB_W, 96, "#3a2233", "#1c1018", 12);
  // string lights
  for (let i = 0; i < 22; i++) {
    const x = 10 + i * 22, y = 10 + Math.sin(i * 0.9) * 4;
    rect(ctx, x, y | 0, 1, 6, "#5a4a2a");
    const cols = ["#f2d04a", "#46b85c", "#d23b2b", "#6db5d8"];
    px(ctx, x, (y + 6) | 0, (Math.sin(t * 2 + i) * 0.5 + 0.5) > 0.3 ? cols[i % 4] : "#3a3020");
  }
  // sign: ÖLBACKEN
  rect(ctx, 150, 22, 110, 18, "#0c0f16"); frame(ctx, 150, 22, 110, 18, "#e8902f");
  textTiny(ctx, 160, 28, "OLBACKEN . AW", "#f2d04a");
  // shelves with bottles
  rect(ctx, 16, 56, 150, 3, "#3a2a18"); rect(ctx, 16, 72, 150, 3, "#3a2a18");
  for (let x = 20; x < 162; x += 9) { bottle(ctx, x, 44 + (x % 3) * 2, x); bottle(ctx, x, 60 + (x % 2) * 2, x + 5); }
  // window to a Linköping night
  rect(ctx, 300, 18, 80, 40, "#0a0c16");
  for (let i = 0; i < 36; i++) px(ctx, 304 + (i * 53 % 72), 22 + (i * 37 % 32), "#ffe9a0");

  // bar counter (foreground)
  vGradient(ctx, 0, 96, PUB_W, ROOM_H - 96, "#7a4d24", "#4a2c12", 8);
  rect(ctx, 0, 96, PUB_W, 5, "#9a6233"); rect(ctx, 0, 101, PUB_W, 1, "#c9a06a");

  // the KEG on the bar
  if (!st.flags.kegTapped) sprite(ctx, ICONS.keg, 56, 70, { scale: 1.2 });
  else { sprite(ctx, ICONS.keg, 56, 72, { scale: 1.0 }); for (let i = 0; i < 5; i++) glassMini(ctx, 90 + i * 22, 104); }

  // food on a table to the right
  rect(ctx, 250, 100, 60, 6, "#5a3a1a");
  rect(ctx, 262, 96, 14, 5, st.flags.ateFood ? "#7a4d24" : "#d6d6d0");
  if (!st.flags.ateFood) { rect(ctx, 264, 94, 10, 4, "#e8902f"); rect(ctx, 286, 96, 10, 4, "#46b85c"); }

  // pendant lamp glow
  ctx.fillStyle = "rgba(255,210,120,0.10)";
  ctx.beginPath(); ctx.moveTo(240, 0); ctx.lineTo(140, 120); ctx.lineTo(340, 120); ctx.closePath(); ctx.fill();
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
