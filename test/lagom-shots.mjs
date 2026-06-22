import { chromium } from "playwright";
import http from "http"; import fs from "fs"; import path from "path";
const ROOT = path.resolve("."); const PORT = 8098;
const MIME = { ".html":"text/html",".js":"text/javascript",".css":"text/css",".ttf":"font/ttf",".svg":"image/svg+xml" };
const server = http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split("?")[0]); let fp=path.join(ROOT,p); if(fs.existsSync(fp)&&fs.statSync(fp).isDirectory())fp=path.join(fp,"index.html"); if(!fs.existsSync(fp)){res.writeHead(404);res.end();return;} res.writeHead(200,{"content-type":MIME[path.extname(fp)]||"application/octet-stream"}); fs.createReadStream(fp).pipe(res);});
await new Promise(r=>server.listen(PORT,r));
fs.mkdirSync("shots/lagom",{recursive:true});
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:1040,height:680}, deviceScaleFactor:2 });
const errs=[]; page.on("console",m=>{if(m.type()==="error")errs.push(m.text());}); page.on("pageerror",e=>errs.push(String(e)));
await page.goto(`http://localhost:${PORT}/lagom/`);
await page.waitForFunction(()=>window.__LAGOM,null,{timeout:8000});
const shot = async (n)=>{ await page.waitForTimeout(250); const el=await page.$("#bezel"); await el.screenshot({path:`shots/lagom/${n}.png`}); console.log("shot",n); };
const set = (x)=>page.evaluate((e)=>eval(e), x);

await page.waitForTimeout(400); await shot("01-title");
await page.click("#startBtn"); await page.waitForTimeout(400); await shot("02-intro");
// advance intro to morning
await set("for(let i=0;i<8;i++){if(window.__LAGOM.card){const c=window.__LAGOM.card;c.idx=c.lines.length-1;}}");
await page.evaluate(()=>{const G=window.__LAGOM;let n=0;while(G.scene==='intro'&&n++<10){if(G.card){G.card.idx=G.card.lines.length-1;}const done=G.card&&G.card.onDone;G.card=null;if(done)done();}});
await page.waitForTimeout(400); await shot("03-morning");
// dismiss morning phone card
await page.evaluate(()=>{const G=window.__LAGOM;G.card=null;});
await page.waitForTimeout(200); await shot("03b-morning");
// go to office
await page.evaluate(()=>{window.__LAGOM.scene='office';window.__LAGOM.fade=0;window.__LAGOM.fadeDir=0;});
await page.waitForTimeout(300); await shot("04-office");
// open watering
await page.evaluate(()=>{window.__LAGOM.closeup={level:30,pouring:false,committed:false};});
await page.waitForTimeout(200); await shot("05-watering-dry");
await page.evaluate(()=>{window.__LAGOM.closeup.level=60;window.__LAGOM.closeup.pouring=true;});
await page.waitForTimeout(200); await shot("05b-watering-lagom");
await page.evaluate(()=>{window.__LAGOM.closeup.level=98;});
await page.waitForTimeout(150); await shot("05c-watering-soggy");
await page.evaluate(()=>{window.__LAGOM.closeup=null;});
// grown Greg
await page.evaluate(()=>{const G=window.__LAGOM;G.greg.stage=4;G.greg.bloom=true;G.greg.hydration=60;});
await page.waitForTimeout(200); await shot("06-office-bloom");
// night
await page.evaluate(()=>{window.__LAGOM.scene='night';});
await page.waitForTimeout(200); await shot("07-night");
// funeral
await page.evaluate(()=>{const G=window.__LAGOM;G.day=8;G.scene='gameover';G.card={funeral:true,survived:7,cause:'Greg ran dry. You meant to water him. You really did.',onDone:()=>{}};});
await page.waitForTimeout(300); await shot("08-funeral");

console.log("ERRORS:", errs.length? errs : "none");
await browser.close(); server.close(); console.log("done");
