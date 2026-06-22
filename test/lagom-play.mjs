// Functional playthrough of LAGOM as a point-and-click: clicks objects to walk
// the avatar over and interact, asserting the day-loop advances, Greg grows,
// and neglect leads to a funeral + restart.
import { chromium } from "playwright";
import http from "http"; import fs from "fs"; import path from "path";
const ROOT = path.resolve("."); const PORT = 8100;
const MIME = { ".html":"text/html",".js":"text/javascript",".css":"text/css",".ttf":"font/ttf",".svg":"image/svg+xml" };
const server = http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split("?")[0]); let fp=path.join(ROOT,p); if(fs.existsSync(fp)&&fs.statSync(fp).isDirectory())fp=path.join(fp,"index.html"); if(!fs.existsSync(fp)){res.writeHead(404);res.end();return;} res.writeHead(200,{"content-type":MIME[path.extname(fp)]||"application/octet-stream"}); fs.createReadStream(fp).pipe(res);});
await new Promise(r=>server.listen(PORT,r));
const browser = await chromium.launch();
const page = await browser.newPage();
const errs=[]; page.on("pageerror",e=>errs.push(String(e)));
await page.goto(`http://localhost:${PORT}/lagom/`);
await page.waitForFunction(()=>window.__LAGOM,null,{timeout:8000});
await page.waitForTimeout(300);

const S = () => page.evaluate(()=>({scene:window.__LAGOM.scene,day:window.__LAGOM.day,hyd:Math.round(window.__LAGOM.greg.hydration),stage:window.__LAGOM.greg.stage,closeup:!!window.__LAGOM.closeup,card:!!window.__LAGOM.card,walking:window.__LAGOM.player&&window.__LAGOM.player.walking}));
const rectOf = () => page.evaluate(()=>{const c=document.getElementById("screen").getBoundingClientRect();return{l:c.left,t:c.top,w:c.width,h:c.height};});
let R=null;
const clickAt = async (lx,ly)=>{ R=R||await rectOf(); await page.mouse.click(R.l+(lx/320)*R.w, R.t+(ly/200)*R.h); await page.waitForTimeout(120); };
const key = async (k)=>{ await page.keyboard.press(k); await page.waitForTimeout(120); };
const waitScene = async (n)=>{ await page.waitForFunction((s)=>window.__LAGOM.scene===s,n,{timeout:8000}); await page.waitForTimeout(150); };
const waitArrive = async ()=>{ await page.waitForFunction(()=>!window.__LAGOM.player.walking,null,{timeout:6000}); };
// object hotspot centres (logical 320x200)
const OBJ = {
  morningDoor:[303,94], officeDoor:[25,93], greg:[197,104], monitor:[109,108], bed:[246,110],
};

let fail=null;
try {
  await page.click("#startBtn"); await page.waitForTimeout(400);
  for (let i=0;i<10;i++){ if((await S()).scene!=="intro")break; await key("Space"); }   // intro dialogue
  await page.waitForTimeout(400);
  if ((await S()).card) await key("Space");      // dismiss day-1 phone notification
  await waitScene("morning");

  for (let day=1; day<=4; day++){
    if ((await S()).card) await key("Space");
    await clickAt(...OBJ.morningDoor);             // walk to door -> go to work
    await waitScene("office");
    await page.evaluate(()=>{window.__LAGOM.greg.pests=0;window.__LAGOM.greg.dust=0;}); // deterministic watering path
    await clickAt(...OBJ.greg);                     // walk to Greg -> watering close-up
    await page.waitForFunction(()=>!!window.__LAGOM.closeup,null,{timeout:6000});
    // prove holding to pour raises the soil level
    const before = await page.evaluate(()=>window.__LAGOM.closeup.level);
    await page.keyboard.down("Space"); await page.waitForTimeout(250); await page.keyboard.up("Space");
    const after = await page.evaluate(()=>window.__LAGOM.closeup.level);
    if (!(after>before)) throw new Error("day "+day+": pouring did not raise soil level ("+before+"->"+after+")");
    // settle to a precise lagom value, then commit (deterministic, no timing flake)
    await page.evaluate(()=>{ window.__LAGOM.closeup.level=62; });
    await key("Enter");                            // commit
    let s=await S(); if(s.closeup) throw new Error("day "+day+": watering did not commit");
    if (s.hyd<50||s.hyd>78) throw new Error("day "+day+": watered out of band: "+s.hyd);
    await clickAt(...OBJ.officeDoor);              // walk to door -> head home
    await waitScene("night");
    await clickAt(...OBJ.bed);                      // walk to bed -> sleep
    await page.waitForTimeout(2200);               // sleep anim + rollover
    // clear any stacked cards (milestone + next-day phone notification)
    for (let i=0;i<6;i++){ if((await S()).scene==="morning")break; if((await S()).card)await key("Space"); else await page.waitForTimeout(200); }
    await waitScene("morning");
    s=await S();
    if (s.day!==day+1) throw new Error("day "+day+": day counter did not advance, got "+s.day);
    console.log(`day ${day} OK -> next day ${s.day}, Greg stage ${s.stage}`);
  }
  if ((await S()).stage < 3) throw new Error("Greg never grew despite good care, stage "+(await S()).stage);

  // ---- dialogue trees: talk to Greg, and warn Bittan (a real side-effect) ----
  if ((await S()).card) await key("Space");
  await clickAt(...OBJ.morningDoor); await waitScene("office");
  // right-click Greg opens his conversation tree
  R=R||await rectOf();
  await page.mouse.click(R.l+(197/320)*R.w, R.t+(104/200)*R.h, {button:"right"});
  await page.waitForFunction(()=>!!window.__LAGOM.convo,null,{timeout:3000});
  if ((await page.evaluate(()=>window.__LAGOM.convo.id))!=="greg") throw new Error("Greg convo did not open");
  // pick the first topic, advance through its lines, then leave
  await page.evaluate(()=>{const c=window.__LAGOM.convo;const t=c.topics.find(x=>(!x.once||!c.seen[x.q])&&(!x.cond||x.cond()));window.__LAGOM.__pick(t);});
  for (let i=0;i<8;i++){ const m=await page.evaluate(()=>window.__LAGOM.convo?window.__LAGOM.convo.mode:null); if(m!=="play")break; await key("Space"); }
  await page.evaluate(()=>window.__LAGOM.__closeConvo());
  if (await page.evaluate(()=>!!window.__LAGOM.convo)) throw new Error("Greg convo did not close");
  // talk to Bittan and trigger the "warn" topic -> sets bittanWarned
  await page.evaluate(()=>{const n=window.__LAGOM.npcs.find(x=>x.id==="bittan");window.__LAGOM.__talk(n);});
  await page.evaluate(()=>{const c=window.__LAGOM.convo;const t=c.topics.find(x=>/lagom, or leave it to me/.test(x.q));window.__LAGOM.__pick(t);});
  for (let i=0;i<8;i++){ if((await page.evaluate(()=>window.__LAGOM.convo.mode))!=="play")break; await key("Space"); }
  if (!(await page.evaluate(()=>window.__LAGOM.bittanWarned))) throw new Error("warning Bittan did not set bittanWarned");
  await page.evaluate(()=>window.__LAGOM.__closeConvo());
  console.log("dialogue trees OK (Greg chat + Bittan warned)");

  // ---- affliction minigames: aphids + dusting ----
  // aphids: give Greg pests, the Greg verb becomes De-bug, clear them
  await page.evaluate(()=>{window.__LAGOM.greg.pests=5;window.__LAGOM.greg.dust=0;});
  await clickAt(...OBJ.greg);
  await page.waitForFunction(()=>window.__LAGOM.closeup&&window.__LAGOM.closeup.type==="pest",null,{timeout:5000});
  await page.evaluate(()=>window.__LAGOM.closeup.bugs.forEach(b=>b.dead=true)); // squash all
  await page.waitForFunction(()=>!window.__LAGOM.closeup&&window.__LAGOM.greg.pests===0,null,{timeout:3000});
  // dust: make him dusty, verb becomes Dust, wipe it clean (growth +1)
  const gBefore = await page.evaluate(()=>window.__LAGOM.greg.growth);
  await page.evaluate(()=>{window.__LAGOM.greg.dust=1;});
  await clickAt(...OBJ.greg);
  await page.waitForFunction(()=>window.__LAGOM.closeup&&window.__LAGOM.closeup.type==="dust",null,{timeout:5000});
  await page.evaluate(()=>window.__LAGOM.closeup.patches.forEach(p=>p.dust=0)); // wipe all
  await page.waitForFunction(()=>!window.__LAGOM.closeup&&window.__LAGOM.greg.dust===0,null,{timeout:3000});
  const gAfter = await page.evaluate(()=>window.__LAGOM.greg.growth);
  if (!(gAfter>gBefore)) throw new Error("dusting did not boost growth ("+gBefore+"->"+gAfter+")");
  console.log("minigames OK (aphids squashed + leaves dusted)");

  // ---- neglect Greg until he dies ----
  let guard=0;
  while ((await S()).scene!=="gameover" && guard++<40){
    const s=await S();
    if (s.card){ await key("Space"); continue; }
    if (s.scene==="morning"){ await clickAt(...OBJ.morningDoor); await waitScene("office"); }
    else if (s.scene==="office"){ await clickAt(...OBJ.officeDoor); await waitScene("night"); }   // skip watering
    else if (s.scene==="night"){ await clickAt(...OBJ.bed); await page.waitForTimeout(2200); }
    else await page.waitForTimeout(300);
  }
  let s=await S(); if(s.scene!=="gameover") throw new Error("Greg never died from neglect, got "+JSON.stringify(s));
  console.log("funeral reached after neglect, Greg survived to day "+s.day);
  await key("Enter");                             // try again
  await page.waitForTimeout(400);
  s=await S(); if(!(s.scene==="intro"||s.scene==="card"||s.scene==="morning")) throw new Error("restart failed, got "+JSON.stringify(s));
  console.log("restart OK -> "+s.scene);
} catch(e){ fail=e; }

if (errs.length) console.log("PAGE ERRORS:", errs);
await browser.close(); server.close();
if (fail){ console.log("FAIL:", fail.message); process.exit(1); }
console.log("PLAYTHROUGH PASSED");
