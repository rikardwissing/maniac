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
// click the canvas to begin the adventure (select scene -> beginAdventure)
const rect = await page.evaluate(() => {
  const c = document.getElementById("screen").getBoundingClientRect();
  return { l: c.left, t: c.top, w: c.width, h: c.height };
});
await page.mouse.click(rect.l + rect.w / 2, rect.t + rect.h / 2);
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
  must(s.party.length === 7, "party should be 7, got " + s.party.length);

  // ---- OFFICE ----
  await run("O('card').pickup(G)");
  await run("O('door').open(G)"); await ff(); await page.waitForTimeout(200); await ff();
  s = await state(); console.log("after office:", JSON.stringify(s));
  must(s.inv.includes("keycard"), "no keycard");
  must(s.room === "street", "expected street, got " + s.room);

  // ---- STREET ----
  await run("O('venue').open(G)"); await ff(); await page.waitForTimeout(200); await ff();
  s = await state(); console.log("after street:", JSON.stringify(s));
  must(s.room === "heist", "expected heist, got " + s.room);

  // ---- HEIST (character-gated stations) ----
  // wrong character first -> should be blocked (loot not obtainable yet)
  await run("G.switchTo('jonas')"); await run("O('poster').use(G)");
  s = await page.evaluate(() => window.__MM.flag("uvSeen"));
  must(s === false, "uvSeen should be false for wrong character");

  await run("G.switchTo('rikard')"); await run("O('poster').use(G)");
  await run("G.switchTo('emil')");   await run("O('wheel').use(G)");
  await run("G.switchTo('caroline')"); await run("O('safe').use(G)");
  await run("O('loot').pickup(G)");
  await run("G.switchTo('per')");    await run("O('alarm').use(G)");
  await run("G.switchTo('jonas')");  await run("O('valveL').use(G)");
  await run("G.switchTo('anders')"); await run("O('valveR').use(G)");
  const flags = await page.evaluate(() => {
    const f = window.__MM.state.flags;
    return ["uvSeen", "cipherDone", "safeOpen", "gotLoot", "alarmOff", "leftValve", "rightValve"].filter((k) => f[k]);
  });
  console.log("heist flags set:", JSON.stringify(flags));
  must(flags.length === 7, "not all heist steps completed: " + flags.join(","));

  await run("O('vault').open(G)"); await ff(); await page.waitForTimeout(300); await ff();
  s = await state(); console.log("after heist:", JSON.stringify(s));
  must(s.room === "pub", "expected pub, got " + s.room);
  must(s.inv.includes("loot") && s.inv.includes("gold"), "loot/gold missing");

  // ---- ÖLBACKEN ----
  await run("O('keg').use(G)");
  await run("O('food').use(G)");
  await run("O('home').open(G)"); await ff(); await page.waitForTimeout(300); await ff();
  await page.waitForFunction(() => window.__MM.scene === "end", null, { timeout: 6000 });
  s = await state(); console.log("FINAL:", JSON.stringify(s));
  must(s.scene === "end", "did not reach ending");
  await page.waitForTimeout(700); // render ending to catch render errors

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
