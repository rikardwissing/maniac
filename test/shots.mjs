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

await page.waitForTimeout(400);
await shot("01-title");
await page.click("#startBtn"); await page.waitForTimeout(400);
await shot("02-select");

const call = (e)=>page.evaluate((x)=>{const G=window.__MM;const O=(id)=>G.rooms[G.state.room].objects.find(o=>o.id===id);return eval(x);},e);
const ff = async ()=>{ await page.evaluate(async()=>{const G=window.__MM;for(let i=0;i<60;i++){G.speech.length=0;G.current=null;if(!G.cs&&G.fadeDir===0)break;await new Promise(r=>setTimeout(r,50));}}); await page.waitForTimeout(120); };

// pick character via real click
const rect = await page.evaluate(()=>{const c=document.getElementById("screen").getBoundingClientRect();return{l:c.left,t:c.top,w:c.width,h:c.height};});
await page.mouse.click(rect.l+(96/320)*rect.w, rect.t+(100/200)*rect.h); // 2nd char (Kim, ginger)
await ff(); await shot("03-office");

await call("O('mug').pickup(G)"); await call("O('machine').useWith.mug(G)");
await call("O('bun').pickup(G)"); await call("O('note').pickup(G)");
// show a speech line for flavour
await call("O('kim').talk(G)"); await page.waitForTimeout(300); await shot("04-office-talk");
await call("G.choices && G.choices.list[3].fn(G)"); await ff();
await call("O('kim').give.coffee(G)"); await page.waitForTimeout(300); await shot("05-office-coffee");
await ff();
await call("O('door').useWith.keycard(G)"); await ff(); await page.waitForTimeout(300); await ff();
await shot("06-street");
await call("O('helmet').pickup(G)"); await call("O('bikes').use(G)"); await ff(); await page.waitForTimeout(300); await ff();
await shot("07-escape");
await call("O('bug').talk(G)"); await page.waitForTimeout(300); await shot("08-escape-bug");
await call("G.choices && G.choices.list[3].fn(G)"); await ff();
await call("O('painting').pull(G)"); await ff();
await call("O('safe').use(G)"); await page.waitForTimeout(300); await shot("09-safe-code");
await call("G.choices && G.choices.list[0].fn(G)"); await ff();
await call("O('key').pickup(G)");
await call("O('bug').give.bun(G)"); await ff(); await page.waitForTimeout(300);
await call("O('vault').open(G)"); await ff(); await page.waitForTimeout(600); await ff();
await page.waitForTimeout(800);
await shot("10-ending");

await browser.close(); server.close();
console.log("done");
