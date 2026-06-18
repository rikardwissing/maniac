import { chromium } from "playwright";
import http from "http"; import fs from "fs"; import path from "path";
const ROOT = path.resolve("."); const PORT = 8097;
const MIME = { ".html":"text/html",".js":"text/javascript",".css":"text/css",".ttf":"font/ttf",".svg":"image/svg+xml" };
const server = http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split("?")[0]); if(p==="/")p="/index.html"; const fp=path.join(ROOT,p); if(!fs.existsSync(fp)){res.writeHead(404);res.end();return;} res.writeHead(200,{"content-type":MIME[path.extname(fp)]||"application/octet-stream"}); fs.createReadStream(fp).pipe(res);});
await new Promise(r=>server.listen(PORT,r));
fs.mkdirSync("shots",{recursive:true});
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:1040,height:680}, deviceScaleFactor:2 });
await page.goto(`http://localhost:${PORT}/`);
await page.waitForFunction(()=>window.__MM&&window.__MM.fontReady,null,{timeout:8000});
const shot = async (name)=>{ await page.waitForTimeout(250); const el=await page.$("#bezel"); await el.screenshot({path:`shots/${name}.png`}); console.log("shot",name); };
const run = (e)=>page.evaluate((x)=>{const G=window.__MM;const O=(id)=>G.rooms[G.state.room].objects.find(o=>o.id===id);return eval(x);},e);
const ff = async ()=>{ await page.evaluate(async()=>{const G=window.__MM;for(let i=0;i<80;i++){G.speech.length=0;G.current=null;if(G.card)G.card.until=0;if(!G.cs&&G.fadeDir===0&&!G.card)break;await new Promise(r=>setTimeout(r,50));}}); await page.waitForTimeout(150); };
const card = async (name)=>{ await page.evaluate(async()=>{const G=window.__MM;for(let i=0;i<50;i++){if(G.card)break;G.speech.length=0;G.current=null;await new Promise(r=>setTimeout(r,40));}}); await page.waitForTimeout(350); await shot(name); };
const place = (x)=>run(`G.player.x=${x}; G.player.target=null; G.camX=Math.max(0,Math.min((G.rooms[G.state.room].width||320)-320, ${x}-160));`);

await page.waitForTimeout(400); await shot("01-title");
await page.click("#startBtn"); await page.waitForTimeout(300);
await run("G.selected=['rikard','caroline']"); await page.waitForTimeout(60); await shot("02-roster");
await run("G.selected=['rikard','caroline','per']"); await page.waitForTimeout(60);
const rect = await page.evaluate(()=>{const c=document.getElementById("screen").getBoundingClientRect();return{l:c.left,t:c.top,w:c.width,h:c.height};});
await page.mouse.click(rect.l+rect.w/2, rect.t+(179/200)*rect.h);
await card("02b-titlecard"); await ff(); await shot("03-office");

// OFFICE
await run("O('plant').pickup(G)"); await run("O('cabinet').open(G)"); await run("O('badges').pickup(G)");
await run("O('door').open(G)"); await card("03b-bikecard"); await ff(); await page.waitForTimeout(150); await ff();

// STREET HUB
await place(160); await shot("04-street");
await run("O('kiosk').use(G)");                 // grab Cloetta for the guard later
// CATHEDRAL branch
await run("O('cathedral').use(G)"); await ff();
await run("O('scope').use(G)"); await page.waitForTimeout(250); await shot("04b-cathedral");
await run("O('back').use(G)"); await ff();
// into the Vault via the host
await run("O('board').look(G)"); await page.waitForTimeout(150);
await run("O('host').talk(G)"); await place(686); await page.waitForTimeout(200); await shot("05-host");
await run("G.choices.list[0].fn(G)"); await ff(); await page.waitForTimeout(150); await ff();

// HEIST
await run("G.switchTo('rikard')"); await place(70); await page.waitForTimeout(150);
await run("O('poster').use(G)"); await page.waitForTimeout(250); await shot("06-heist-uv");
await run("O('wheel').use(G)"); await ff();
await run("G.switchTo('caroline')"); await place(330); await run("O('safe').use(G)"); await page.waitForTimeout(250); await shot("07-safe");
await run("O('loot').pickup(G)");
await run("G.switchTo('per'); G.player.x=540; G.player.target=null; G.camX=300;"); await page.waitForTimeout(200); await shot("07b-guard");
await run("O('guard').give.choklad(G)"); await ff();
await run("G.switchTo('per')"); await page.waitForTimeout(150); await run("O('alarm').use(G)"); await page.waitForTimeout(150);
await run("G.party[1].x=521; G.party[1].target=null;"); await page.waitForTimeout(200);
await place(600); await shot("08-heist-vault");
await run("O('vault').open(G)"); await ff(); await page.waitForTimeout(300); await ff();

// CONTROL ROOM
await place(300); await shot("08b-control");
await run("G.switchTo('per')"); await run("O('lasers').use(G)"); await page.waitForTimeout(150);
await run("O('lever').use(G)"); await run("O('prototype').pickup(G)"); await run("O('evidence').pickup(G)");
await run("O('curator').talk(G)"); await ff();
await run("O('stairs').use(G)"); await ff(); await page.waitForTimeout(200); await ff();

// ROOFTOP
await shot("09-roof");
await run("O('drone').use(G)"); await page.waitForTimeout(200);
await run("O('master').pickup(G)"); await ff(); await page.waitForTimeout(400); await ff();

// ÖLBACKEN
await shot("10-pub");
await run("O('tab').give.card(G)"); await run("O('keg').use(G)"); await run("O('band').give.beer(G)"); await run("O('food').use(G)");
await page.waitForTimeout(250); await place(300); await run("O('crew').talk(G)"); await page.waitForTimeout(250); await shot("10b-pub-live");
await run("O('home').use(G)"); await ff(); await page.waitForTimeout(500); await ff(); await page.waitForTimeout(600);
await shot("11-ending");

await browser.close(); server.close(); console.log("done");
