// Headless smoke test: boots the game, captures console/page errors, then
// solves the whole adventure by invoking the same handlers the engine uses,
// driving every room (so all painters + the win path actually render).
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

// start + pick a character
await page.click("#startBtn");
await page.waitForTimeout(300);
await page.evaluate(() => { window.__MM.scene; });
// pick character via the engine's own select handler path (click coords)
const rect = await page.evaluate(() => {
  const c = document.getElementById("screen").getBoundingClientRect();
  return { l: c.left, t: c.top, w: c.width, h: c.height };
});
const clickI = async (ix, iy) =>
  page.mouse.click(rect.l + (ix / 320) * rect.w, rect.t + (iy / 200) * rect.h);
await clickI(32, 100);                       // first character
await page.waitForTimeout(600);

// helper run in-page: fast-forward any cutscene/speech/fade
const ff = async () => {
  await page.evaluate(async () => {
    const G = window.__MM;
    for (let i = 0; i < 60; i++) {
      G.speech.length = 0; G.current = null;
      if (!G.cs && G.fadeDir === 0) break;
      await new Promise((r) => setTimeout(r, 50));
    }
  });
  await page.waitForTimeout(120);
};

// invoke a handler object on the current room / item
const call = (expr) => page.evaluate((e) => {
  const G = window.__MM;
  const O = (id) => G.rooms[G.state.room].objects.find((o) => o.id === id);
  // eslint-disable-next-line no-eval
  return eval(e);
}, expr);

const sceneRoom = () => page.evaluate(() => ({ scene: window.__MM.scene, room: window.__MM.state.room, inv: window.__MM.state.inventory.slice() }));

try {
  await ff();
  let s = await sceneRoom(); console.log("after intro:", JSON.stringify(s));
  if (s.room !== "office") throw new Error("expected office, got " + s.room);

  // ---- OFFICE ----
  await call("O('mug').pickup(G)");
  await call("O('machine').useWith.mug(G)");
  await call("O('note').pickup(G)");
  await call("O('bun').pickup(G)");
  await call("G.items.note.look(G)");
  await call("O('colleague').give.coffee(G)"); await ff();
  s = await sceneRoom(); console.log("office solved inv:", JSON.stringify(s.inv));
  if (!s.inv.includes("keycard")) throw new Error("no keycard after coffee");
  await call("O('door').useWith.keycard(G)");
  console.log("dbg after door call:", JSON.stringify(await page.evaluate(() => ({ unlocked: window.__MM.flag("officeUnlocked"), cs: !!window.__MM.cs, csi: window.__MM.cs && window.__MM.cs.i, mode: window.__MM.cs && window.__MM.cs.mode, ptarget: window.__MM.player.target }))));
  await ff(); await page.waitForTimeout(400); await ff();
  console.log("dbg post-ff:", JSON.stringify(await page.evaluate(() => ({ cs: !!window.__MM.cs, csi: window.__MM.cs && window.__MM.cs.i, mode: window.__MM.cs && window.__MM.cs.mode, fade: window.__MM.fadeDir, px: Math.round(window.__MM.player.x), pt: window.__MM.player.target }))));
  s = await sceneRoom(); console.log("after door:", JSON.stringify(s));
  if (s.room !== "street") throw new Error("expected street, got " + s.room);

  // ---- STREET ----
  await call("O('helmet').pickup(G)");
  await call("O('bikes').use(G)"); await ff(); await page.waitForTimeout(400); await ff();
  s = await sceneRoom(); console.log("after bike:", JSON.stringify(s));
  if (s.room !== "escape") throw new Error("expected escape, got " + s.room);

  // ---- ESCAPE ----
  await call("O('painting').pull(G)"); await ff();
  await call("O('safe').use(G)");                 // opens choices
  await call("G.choices.list[0].fn(G)"); await ff(); // pick 1987
  await call("O('key').pickup(G)");
  s = await sceneRoom(); console.log("escape inv:", JSON.stringify(s.inv));
  if (!s.inv.includes("key")) throw new Error("no key after safe");
  await call("O('bug').give.bun(G)"); await ff();
  await call("O('vault').open(G)"); await ff(); await page.waitForTimeout(500); await ff();
  s = await sceneRoom(); console.log("after vault:", JSON.stringify(s));

  // ---- BAR / WIN ----
  await page.waitForTimeout(700); await ff();
  await page.waitForFunction(() => window.__MM.scene === "end", null, { timeout: 6000 });
  s = await sceneRoom(); console.log("FINAL:", JSON.stringify(s));
  if (s.scene !== "end") throw new Error("did not reach ending");

  // let it render the ending a moment to catch ending-render errors
  await page.waitForTimeout(800);

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
  console.log("\n=== NO ERRORS — game boots, renders all rooms, and is winnable ===");
}
