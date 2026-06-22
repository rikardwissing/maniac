import { chromium } from "playwright";
import http from "http"; import fs from "fs"; import path from "path";
const ROOT = path.resolve("."); const PORT = 8098;
const MIME = { ".html":"text/html",".js":"text/javascript",".css":"text/css",".ttf":"font/ttf",".svg":"image/svg+xml" };
const server = http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split("?")[0]); let fp=path.join(ROOT,p); if(fs.existsSync(fp)&&fs.statSync(fp).isDirectory())fp=path.join(fp,"index.html"); if(!fs.existsSync(fp)){res.writeHead(404);res.end();return;} res.writeHead(200,{"content-type":MIME[path.extname(fp)]||"application/octet-stream"}); fs.createReadStream(fp).pipe(res);});
await new Promise(r=>server.listen(PORT,r));
fs.mkdirSync("shots/lagom",{recursive:true});
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:1040,height:680}, deviceScaleFactor:2 });
const errs=[]; page.on("pageerror",e=>errs.push(String(e)));
await page.goto(`http://localhost:${PORT}/lagom/`);
await page.waitForFunction(()=>window.__LAGOM,null,{timeout:8000});
const shot = async (n)=>{ await page.waitForTimeout(250); const el=await page.$("#bezel"); await el.screenshot({path:`shots/lagom/${n}.png`}); console.log("shot",n); };
// move the in-canvas cursor to a logical point (so the sentence line shows)
const hover = async (lx,ly)=>{ const r=await page.evaluate(()=>{const c=document.getElementById("screen").getBoundingClientRect();return{l:c.left,t:c.top,w:c.width,h:c.height};}); await page.mouse.move(r.l+(lx/320)*r.w, r.t+(ly/200)*r.h); await page.waitForTimeout(60); };

await page.waitForTimeout(400); await shot("01-title");
await page.click("#startBtn"); await page.waitForTimeout(400); await shot("02-intro");
await page.evaluate(()=>{const G=window.__LAGOM;let n=0;while(G.scene==='intro'&&n++<12){if(G.card){G.card.idx=G.card.lines.length-1;}const done=G.card&&G.card.onDone;G.card=null;if(done)done();}});
await page.waitForTimeout(500); await shot("03-morning-phone");
await page.evaluate(()=>{const G=window.__LAGOM;const d=G.card&&G.card.onDone;G.card=null;if(d)d();});
await page.waitForTimeout(400); await hover(303,94); await shot("04-morning-walk"); // sentence: Go to work
// office
await page.evaluate(()=>{window.__LAGOM.scene='office';window.__LAGOM.fade=0;window.__LAGOM.fadeDir=0;window.__LAGOM.player={x:56,y:150,tx:56,walking:false,facing:1,anim:0,pending:null,say:null,scale:1.6};});
await page.waitForTimeout(200); await hover(197,104); await shot("05-office"); // sentence: Tend Greg
// watering close-up
await page.evaluate(()=>{window.__LAGOM.closeup={level:60,pouring:true,committed:false};});
await page.waitForTimeout(150); await shot("06-watering");
await page.evaluate(()=>{window.__LAGOM.closeup.level=98;});
await page.waitForTimeout(150); await shot("06b-watering-soggy");
await page.evaluate(()=>{window.__LAGOM.closeup=null;});
// grown Greg + a speech bubble
await page.evaluate(()=>{const G=window.__LAGOM;G.greg.stage=4;G.greg.bloom=true;G.greg.hydration=60;G.player.say={text:"Aaah. This is lagom.",until:G.t+5,color:"#8fe39b"};});
await page.waitForTimeout(200); await shot("07-office-bloom");
// night
await page.evaluate(()=>{const G=window.__LAGOM;G.scene='night';G.player={x:278,y:152,tx:278,walking:false,facing:-1,anim:0,pending:null,say:null,scale:1.6};});
await page.waitForTimeout(200); await hover(246,110); await shot("08-night"); // sentence: Sleep
// funeral
await page.evaluate(()=>{const G=window.__LAGOM;G.day=8;G.scene='gameover';G.card={funeral:true,survived:7,cause:'Greg ran dry. You meant to water him. You really did.',onDone:()=>{}};});
await page.waitForTimeout(300); await shot("09-funeral");

console.log("ERRORS:", errs.length? errs : "none");
await browser.close(); server.close(); console.log("done");
