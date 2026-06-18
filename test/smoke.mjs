// Headless smoke test: boots the game and plays the entire non-linear night —
// fika puzzle, bike mini-game, keypad + wire-cut + chug close-ups, the kiosk
// backtrack, all six rooms — with a deliberately non-specialist trio.
import { chromium } from "playwright";
import http from "http";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(".");
const PORT = 8099;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".ttf": "font/ttf", ".svg": "image/svg+xml", ".json": "application/json" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp)) { res.writeHead(404); res.end("nf"); return; }
  res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
  fs.createReadStream(fp).pipe(res);
});
const errors = [];
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 700 } });
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
await page.goto(`http://localhost:${PORT}/`);
await page.waitForFunction(() => window.__MM && window.__MM.fontReady, null, { timeout: 8000 });

await page.click("#startBtn");
await page.waitForTimeout(250);
await page.evaluate(() => { window.__MM.selected = ["jonas", "anders", "oskar"]; });
const rect = await page.evaluate(() => { const c = document.getElementById("screen").getBoundingClientRect(); return { l: c.left, t: c.top, w: c.width, h: c.height }; });
await page.mouse.click(rect.l + rect.w / 2, rect.t + (179 / 200) * rect.h);
await page.waitForTimeout(500);

const ff = async () => {
  await page.evaluate(async () => {
    const G = window.__MM;
    for (let i = 0; i < 80; i++) { G.speech.length = 0; G.current = null; if (G.card) G.card.until = 0; if (!G.cs && G.fadeDir === 0 && !G.card) break; await new Promise((r) => setTimeout(r, 50)); }
  });
  await page.waitForTimeout(120);
};
const finishBike = async () => {
  await page.evaluate(() => { if (window.__MM.bike) window.__MM.bike.dist = window.__MM.bike.total + 5; });
  await page.waitForTimeout(200); await ff();
};
const run = (expr) => page.evaluate((e) => {
  const G = window.__MM; const O = (id) => G.rooms[G.state.room].objects.find((o) => o.id === id);
  return eval(e); // eslint-disable-line no-eval
}, expr);
const state = () => page.evaluate(() => ({ scene: window.__MM.scene, room: window.__MM.state.room, inv: window.__MM.state.inventory.slice() }));
const flag = (f) => page.evaluate((x) => window.__MM.flag(x), f);
const must = (c, m) => { if (!c) throw new Error(m); };
// pick an option from a branching conversation by matching its label
const dialogPick = async (re) => {
  await ff();                        // clear the NPC's line so the menu appears
  await page.waitForTimeout(150);    // let updateDialog show the option menu
  await page.evaluate((r) => {
    const G = window.__MM;
    if (!G.choices) throw new Error("no dialogue menu open for /" + r + "/");
    const o = G.choices.list.find((x) => new RegExp(r, "i").test(x.text));
    if (!o) throw new Error("no choice /" + r + "/ in " + JSON.stringify(G.choices.list.map((x) => x.text)));
    o.fn(G);
  }, re);
};

try {
  await ff();
  let s = await state(); console.log("start:", JSON.stringify(s));
  must(s.room === "office", "expected office, got " + s.room);

  // ---- OFFICE: brew a fika for Robin -> keycard; plant->cabinet->card ----
  await run("O('mug').pickup(G)");
  await run("O('machine').useWith.mug(G)");        // -> coffee
  await run("O('bun').pickup(G)");
  await run("O('robin').give.coffee(G)");
  await run("O('robin').give.bun(G)");             // both -> keycard
  must((await state()).inv.includes("keycard"), "no keycard from fika");
  await run("O('plant').pickup(G)"); await run("O('cabinet').open(G)"); await run("O('card').pickup(G)");
  await run("O('door').open(G)"); await ff(); await page.waitForTimeout(150); await ff();
  s = await state(); console.log("after office:", JSON.stringify(s));
  must(s.room === "street", "expected street, got " + s.room);

  // ---- STREET: helmet, host, then the BIKE MINI-GAME to The Vault ----
  await run("O('helmet').pickup(G)");
  // talk to a squadmate: branching menu with a contextual hint (MM-style)
  await run("G.converse(G.mateDialog(G, G.party[1]))");
  await dialogPick("What should we do");
  await ff();
  await run("if (G.dialog) G.endConverse();");
  must(!(await page.evaluate(() => !!window.__MM.dialog)), "teammate dialogue didn't close");
  await run("O('board').look(G)");
  // branching dialogue: tell the host we're Teamtailor to get cleared
  await run("O('host').talk(G)");
  await dialogPick("Teamtailor");
  await ff();
  must(await flag("venueOpen"), "venueOpen not set after host dialogue");
  await run("O('bikes').use(G)");                  // enters bike mini-game
  must((await page.evaluate(() => window.__MM.scene)) === "bike", "bike mini-game didn't start");
  await finishBike();
  s = await state(); console.log("after ride:", JSON.stringify(s));
  must(s.room === "heist", "expected heist, got " + s.room);

  // ---- HEIST: UV, cipher, KEYPAD safe, loot, guard backtrack, WIRES alarm ----
  await run("O('drawer').open(G)"); await run("O('uvitem').pickup(G)"); await run("O('poster').use(G)");
  await run("O('wheel').use(G)");
  await run("O('safe').use(G)");                   // opens keypad close-up
  must((await page.evaluate(() => window.__MM.modal && window.__MM.modal.type)) === "keypad", "keypad didn't open");
  await run("G.modalSolve()");
  must(await flag("safeOpen"), "safe not open after keypad");
  await run("O('loot').pickup(G)");
  await run("O('toolbox').open(G)"); await run("O('cutitem').pickup(G)");
  await run("O('alarm').use(G)");                  // blocked: guard present
  must(!(await flag("alarmOff")), "alarm cut with guard present");
  // BACKTRACK to the street kiosk for chocolate, then bike back (instant now)
  await run("O('wayout').use(G)"); await ff(); await page.waitForTimeout(120); await ff();
  must((await state()).room === "street", "wayout didn't reach street");
  await run("O('kiosk').use(G)");
  must(await page.evaluate(() => window.__MM.has("choklad")), "no choklad from kiosk");
  await run("O('bikes').use(G)"); await ff(); await page.waitForTimeout(120); await ff();
  must((await state()).room === "heist", "didn't return to heist");
  await run("O('guard').give.choklad(G)");
  await run("O('alarm').use(G)");                  // opens wire-cut close-up
  must((await page.evaluate(() => window.__MM.modal && window.__MM.modal.type)) === "wires", "wires didn't open");
  await run("G.modalSolve()");
  must(await flag("alarmOff"), "alarm not off after wires");
  await run("G.party[1].x = 521;"); await page.waitForTimeout(150);
  must(await flag("plateHeld"), "plate not held");
  await run("O('vault').open(G)"); await ff(); await page.waitForTimeout(300); await ff();
  s = await state(); console.log("after heist:", JSON.stringify(s));
  must(s.room === "control", "expected control, got " + s.room);

  // ---- CONTROL ROOM ----
  await run("O('mirror').pickup(G)"); await run("O('lasers').use(G)");
  await run("O('lever').use(G)"); await run("O('prototype').pickup(G)"); await run("O('evidence').pickup(G)");
  await run("O('curator').talk(G)");
  await dialogPick("over");                         // "It's over, Curator. Hands up."
  await ff();
  must(await flag("curatorFled"), "curator didn't flee");
  await run("O('stairs').use(G)"); await ff(); await page.waitForTimeout(200); await ff();
  must((await state()).room === "roof", "expected roof");

  // ---- ROOFTOP ----
  await run("O('drone').use(G)");
  must(await flag("tetherCut"), "tether not cut");
  await run("O('master').pickup(G)"); await ff(); await page.waitForTimeout(300); await ff();
  s = await state(); console.log("after roof:", JSON.stringify(s));
  must(s.room === "pub", "expected pub, got " + s.room);

  // ---- ÖLBACKEN: tab, keg, band, food, CHUG, then ride home ----
  await run("O('tab').give.card(G)"); await run("O('keg').use(G)"); await run("O('band').give.beer(G)"); await run("O('food').use(G)");
  await run("O('chug').use(G)");                   // chug close-up
  must((await page.evaluate(() => window.__MM.modal && window.__MM.modal.type)) === "chug", "chug didn't open");
  await run("G.modalSolve()");
  await run("O('home').use(G)");                   // night bike mini-game
  must((await page.evaluate(() => window.__MM.scene)) === "bike", "home ride didn't start");
  await finishBike();
  await page.waitForFunction(() => window.__MM.scene === "end", null, { timeout: 6000 });
  s = await state(); console.log("FINAL:", JSON.stringify(s));
  must(s.scene === "end", "did not reach ending");
  await page.waitForTimeout(700);
  console.log("\nSOLVE PATH: OK");
} catch (e) {
  errors.push("FLOW: " + e.message);
}

await browser.close();
server.close();
if (errors.length) {
  console.error("\n=== ERRORS (" + errors.length + ") ===");
  errors.forEach((e) => console.error(" - " + e));
  process.exit(1);
} else {
  console.log("\n=== NO ERRORS — full non-linear playthrough + mini-games, winnable ===");
}
