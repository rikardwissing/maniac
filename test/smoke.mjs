// Headless smoke test: boots the game, captures console/page errors, then
// solves the whole heist by switching crew members and invoking the same
// handlers the engine uses — driving every room (so all painters render).
import { chromium } from "playwright";
import http from "http";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(".");
const PORT = 8099;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".ttf": "font/ttf", ".svg": "image/svg+xml", ".json": "application/json" };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
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
// select a squad of 3 (NOT including the "ideal" specialists, to prove the
// item-based fallbacks work for any trio), then START.
await page.evaluate(() => {
  const G = window.__MM;
  G.selected = ["jonas", "anders", "oskar"]; // no Rikard/Emil/Caroline/Per
});
const rect = await page.evaluate(() => {
  const c = document.getElementById("screen").getBoundingClientRect();
  return { l: c.left, t: c.top, w: c.width, h: c.height };
});
// click the START button (centre, y~179 of 200)
await page.mouse.click(rect.l + rect.w / 2, rect.t + (179 / 200) * rect.h);
await page.waitForTimeout(500);

const ff = async () => {
  await page.evaluate(async () => {
    const G = window.__MM;
    for (let i = 0; i < 80; i++) {
      G.speech.length = 0; G.current = null;
      if (!G.cs && G.fadeDir === 0) break;
      await new Promise((r) => setTimeout(r, 50));
    }
  });
  await page.waitForTimeout(120);
};

const run = (expr) => page.evaluate((e) => {
  const G = window.__MM;
  const O = (id) => G.rooms[G.state.room].objects.find((o) => o.id === id);
  // eslint-disable-next-line no-eval
  return eval(e);
}, expr);

const state = () => page.evaluate(() => ({
  scene: window.__MM.scene, room: window.__MM.state.room,
  active: window.__MM.player && window.__MM.player.id,
  inv: window.__MM.state.inventory.slice(),
  party: window.__MM.party.map((p) => p.id),
}));

const must = (cond, msg) => { if (!cond) throw new Error(msg); };

try {
  await ff();
  let s = await state(); console.log("start:", JSON.stringify(s));
  must(s.room === "office", "expected office, got " + s.room);
  must(s.party.length === 3, "squad should be 3, got " + s.party.length);
  must(JSON.stringify(s.party) === JSON.stringify(["jonas", "anders", "oskar"]), "wrong squad: " + s.party);

  // ---- OFFICE: plant key -> cabinet -> badges -> door ----
  await run("O('plant').pickup(G)");
  await run("O('cabinet').open(G)");
  await run("O('badges').pickup(G)");
  must((await state()).inv.includes("keycard"), "no keycard after cabinet");
  await run("O('door').open(G)"); await ff(); await page.waitForTimeout(200); await ff();
  s = await state(); console.log("after office:", JSON.stringify(s));
  must(s.room === "street", "expected street, got " + s.room);

  // ---- STREET: read code -> buzz in ----
  await run("O('venue').use(G)");                 // blocked: no PIN yet
  must((await state()).room === "street", "venue opened without PIN");
  await run("O('board').look(G)");                // learn PIN
  await run("O('venue').use(G)"); await ff(); await page.waitForTimeout(200); await ff();
  s = await state(); console.log("after street:", JSON.stringify(s));
  must(s.room === "heist", "expected heist, got " + s.room);

  // ---- HEIST: solved by a NON-specialist trio via item fallbacks + co-op ----
  await run("O('drawer').open(G)");  await run("O('uvitem').pickup(G)");
  await run("O('poster').use(G)");   // uses uvlight (no Rikard in squad)
  must(await page.evaluate(() => window.__MM.flag("uvSeen")), "uvSeen not set via item");
  await run("O('wheel').use(G)");
  await run("O('safe').use(G)");
  await run("O('loot').pickup(G)");
  await run("O('toolbox').open(G)"); await run("O('cutitem').pickup(G)");
  await run("O('alarm').use(G)");    // uses wire cutters (no Per in squad)
  // co-op: park a teammate on the plate, then operate the vault as another
  await run("O('vault').open(G)");   // blocked: nobody on plate
  must((await state()).room === "heist", "vault opened with no power");
  await run("G.party[1].x = 521;");  // stand Anders on the plate
  await page.waitForTimeout(150);    // let tick() detect plateHeld
  must(await page.evaluate(() => window.__MM.flag("plateHeld")), "plateHeld not detected");
  const hf = await page.evaluate(() => {
    const f = window.__MM.state.flags;
    return ["uvSeen", "cipherDone", "safeOpen", "gotLoot", "alarmOff"].filter((k) => f[k]);
  });
  must(hf.length === 5, "heist steps incomplete: " + hf.join(","));
  await run("O('vault').open(G)"); await ff(); await page.waitForTimeout(300); await ff();
  s = await state(); console.log("after heist:", JSON.stringify(s));
  must(s.room === "pub", "expected pub, got " + s.room);
  must(s.inv.includes("loot") && s.inv.includes("gold"), "loot/gold missing");

  // ---- ÖLBACKEN: tab -> keg -> band -> food -> home ----
  must((await page.evaluate(() => window.__MM.actors.length)) >= 4, "bench teammates not present at AW");
  await run("O('keg').use(G)");                   // blocked: no tab
  must(!(await page.evaluate(() => window.__MM.flag("kegTapped"))), "keg tapped without tab");
  await run("O('tab').give.card(G)");             // open tab with company card
  await run("O('keg').use(G)");                   // tap keg + get a beer
  await run("O('band').give.beer(G)");            // live music
  await run("O('food').use(G)");
  await run("O('crew').talk(G)");                 // good company (flavour)
  const pf = await page.evaluate(() => {
    const f = window.__MM.state.flags;
    return ["tabOpen", "kegTapped", "musicOn", "ateFood"].filter((k) => f[k]);
  });
  must(pf.length === 4, "pub steps incomplete: " + pf.join(","));
  await run("O('home').open(G)"); await ff(); await page.waitForTimeout(300); await ff();
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
  console.log("\n=== NO ERRORS — boots, all rooms render, switching works, winnable ===");
}
