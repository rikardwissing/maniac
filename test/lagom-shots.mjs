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
await page.evaluate(()=>{const G=window.__LAGOM;G.banner={text:"— DAY 1 —",until:G.t+2.6};});
await page.waitForTimeout(120); await shot("04-morning-banner");
await page.waitForTimeout(700); await hover(303,94); await shot("04b-morning-walk"); // sentence: Go to work
// office (real entry so coworkers populate)
await page.evaluate(()=>{window.__LAGOM.__office();window.__LAGOM.fade=0;window.__LAGOM.fadeDir=0;});
await page.evaluate(()=>{window.__LAGOM.gregSay={text:"Lagom. The only philosophy a plant needs.",until:window.__LAGOM.t+9};});
await page.waitForTimeout(200); await hover(197,104); await shot("05-office"); // Greg + coworkers + bracket + bubble
await page.evaluate(()=>{const n=window.__LAGOM.npcs.find(x=>x.id==='bittan');window.__LAGOM.npcSay={id:'bittan',text:"Don't worry, I topped Greg up for you! ...Was that too much?",until:window.__LAGOM.t+9};});
await hover(120,110); await shot("05b-coworkers");
// depth: walk behind vs in front of the desk
await page.evaluate(()=>{const p=window.__LAGOM.player;p.x=152;p.y=137;p.tx=152;p.ty=137;p.walking=false;window.__LAGOM.gregSay=null;window.__LAGOM.npcSay=null;});
await page.waitForTimeout(120); await shot("05g-behind-desk");
await page.evaluate(()=>{const p=window.__LAGOM.player;p.x=120;p.y=166;p.tx=120;p.ty=166;});
await page.waitForTimeout(120); await shot("05h-in-front");
// dialogue trees
await page.evaluate(()=>{window.__LAGOM.gregSay=null;window.__LAGOM.__talkGreg();});
await page.waitForTimeout(150); await shot("05e-greg-convo-menu");
await page.evaluate(()=>{const c=window.__LAGOM.convo;const t=c.topics.find(x=>/story/.test(x.q));window.__LAGOM.__pick(t);});
await page.waitForTimeout(150); await shot("05f-greg-convo-line");
await page.evaluate(()=>{const n=window.__LAGOM.npcs.find(x=>x.id==='bittan');window.__LAGOM.__talk(n);const c=window.__LAGOM.convo;window.__LAGOM.__pick(c.topics[0]);});
await page.waitForTimeout(150); await shot("05i-bittan-line");
await page.evaluate(()=>window.__LAGOM.__closeConvo());
// affliction minigames
await page.evaluate(()=>{window.__LAGOM.greg.pests=6;window.__LAGOM.__pest();});
await page.waitForTimeout(150); await shot("05j-aphids");
await page.evaluate(()=>{window.__LAGOM.closeup=null;window.__LAGOM.greg.dust=1;window.__LAGOM.__dust();});
await page.waitForTimeout(150); await shot("05k-dusting");
await page.evaluate(()=>{window.__LAGOM.closeup=null;window.__LAGOM.greg.pests=0;window.__LAGOM.greg.dust=0;});
// 20-day victory ending + credits
await page.evaluate(()=>{const G=window.__LAGOM;G.day=20;G.greg.bloom=true;G.__win();});
await page.waitForTimeout(150); await shot("06c-promotion");
await page.evaluate(()=>{const G=window.__LAGOM;for(let i=0;i<24&&G.scene!=='credits';i++){if(G.card){const d=G.card.onDone;G.card.idx=G.card.lines.length-1;G.card=null;if(d)d();}}});
await page.evaluate(()=>{window.__LAGOM.credits.start=window.__LAGOM.t-32;}); // show a verse + scrolled crew
await page.waitForTimeout(150); await shot("06d-credits");
// commute (day + dusk)
await page.evaluate(()=>{const G=window.__LAGOM;G.scene='commute';G.commuteDusk=false;G.commuteLabel='Cycling to the office...';G.fade=0;G.fadeDir=0;});
await page.waitForTimeout(200); await shot("05c-commute-day");
await page.evaluate(()=>{const G=window.__LAGOM;G.scene='commute';G.commuteDusk=true;G.commuteLabel='Heading home for the evening...';G.modifier={id:'rainy',icon:'/',name:'Rainy commute',note:''};});
await page.waitForTimeout(200); await shot("05d-commute-dusk-rain");
await page.evaluate(()=>{window.__LAGOM.modifier=null;});
await page.evaluate(()=>{const G=window.__LAGOM;G.scene='office';G.gregSay=null;});
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
