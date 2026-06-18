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
const ff = async ()=>{ await page.evaluate(async()=>{const G=window.__MM;for(let i=0;i<80;i++){G.speech.length=0;G.current=null;if(!G.cs&&G.fadeDir===0)break;await new Promise(r=>setTimeout(r,50));}}); await page.waitForTimeout(150); };
// place active char + snap camera, for showcasing the side-scroll
const place = (x)=>run(`G.player.x=${x}; G.player.target=null; G.camX=Math.max(0,Math.min((G.rooms[G.state.room].width||320)-320, ${x}-160));`);

await page.waitForTimeout(400); await shot("01-title");
const rect = await page.evaluate(()=>{const c=document.getElementById("screen").getBoundingClientRect();return{l:c.left,t:c.top,w:c.width,h:c.height};});
await page.click("#startBtn"); await page.waitForTimeout(300); await shot("02-roster");
await page.mouse.click(rect.l+rect.w/2, rect.t+rect.h/2); await ff();
await shot("03-office");

await run("O('card').pickup(G)"); await run("O('door').open(G)"); await ff(); await page.waitForTimeout(200); await ff();
await place(120); await shot("04-street");
await run("O('venue').open(G)"); await ff(); await page.waitForTimeout(200); await ff();

// heist — show the left stations + a "wrong character" hint
await run("G.switchTo('jonas')"); await place(90);
await run("G.hintMsg={text:'Oskar: switch to Rikard (mobile) and Use his phone on the UV poster.',until:G.t+9}");
await shot("05-heist-left");
await run("G.switchTo('rikard')"); await run("O('poster').use(G)"); await page.waitForTimeout(250); await shot("06-rikard-uv");
await run("G.switchTo('emil')"); await run("O('wheel').use(G)"); await ff();
// mid — safe, switch to Caroline
await run("G.switchTo('caroline')"); await place(330); await run("O('safe').use(G)"); await page.waitForTimeout(250); await shot("07-caroline-safe");
await run("O('loot').pickup(G)"); await ff();
await run("G.switchTo('per')"); await place(452); await run("O('alarm').use(G)"); await page.waitForTimeout(200);
await run("G.switchTo('jonas')"); await run("O('valveL').use(G)");
await run("G.switchTo('anders')"); await run("O('valveR').use(G)");
await place(600); await shot("08-heist-vault");
await run("O('vault').open(G)"); await ff(); await page.waitForTimeout(300); await ff();
await shot("09-pub");
await run("O('keg').use(G)"); await page.waitForTimeout(200); await run("O('food').use(G)"); await page.waitForTimeout(200);
await run("O('home').open(G)"); await ff(); await page.waitForTimeout(500); await ff(); await page.waitForTimeout(600);
await shot("10-ending");

await browser.close(); server.close(); console.log("done");
