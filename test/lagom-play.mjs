// Functional playthrough of LAGOM driven entirely by keyboard, asserting the
// day-loop advances, Greg grows, and neglect leads to a funeral + restart.
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
const S = () => page.evaluate(()=>({scene:window.__LAGOM.scene,day:window.__LAGOM.day,hyd:Math.round(window.__LAGOM.greg.hydration),stage:window.__LAGOM.greg.stage,closeup:!!window.__LAGOM.closeup,card:!!window.__LAGOM.card}));
const key = async (k)=>{ await page.keyboard.press(k); await page.waitForTimeout(120); };
const settle = async ()=>{ await page.waitForTimeout(450); }; // let fades/commutes finish
const waitScene = async (name)=>{ await page.waitForFunction((n)=>window.__LAGOM.scene===n,name,{timeout:6000}); await page.waitForTimeout(150); };

let fail=null;
try {
  await page.click("#startBtn"); await page.waitForTimeout(400);
  // advance the intro dialogue
  for (let i=0;i<8;i++){ const s=await S(); if(s.scene!=="intro")break; await key("Space"); }
  await settle();
  if ((await S()).card) await key("Space");   // dismiss the day-1 phone notification
  await waitScene("morning");
  let s=await S(); if(s.scene!=="morning") throw new Error("expected morning, got "+JSON.stringify(s));

  // play several days, watering Greg into the lagom band each office visit
  for (let day=1; day<=4; day++){
    // dismiss morning phone card
    if ((await S()).card) await key("Space");
    await key("3"); await waitScene("office");          // Go to work
    s=await S(); if(s.scene!=="office") throw new Error("day "+day+": expected office, got "+JSON.stringify(s));
    await key("1");          // Tend Greg -> watering close-up
    s=await S(); if(!s.closeup) throw new Error("day "+day+": watering close-up did not open");
    // pour toward the lagom band (~60): hold space until hydration is in range
    await page.keyboard.down("Space");
    await page.waitForFunction(()=>{const c=window.__LAGOM.closeup;return c&&c.level>=58;},null,{timeout:4000});
    await page.keyboard.up("Space");
    await key("Enter");      // commit
    s=await S(); if(s.closeup) throw new Error("day "+day+": watering did not commit");
    if (s.hyd<50||s.hyd>78) throw new Error("day "+day+": watered out of band: "+s.hyd);
    await key("3"); await waitScene("night");          // Head home
    s=await S(); if(s.scene!=="night") throw new Error("day "+day+": expected night, got "+JSON.stringify(s));
    await key("1");          // Sleep -> rollover
    await page.waitForTimeout(1800); // sleep anim + rollover
    // a milestone card may appear; clear it
    if ((await S()).card && (await S()).scene==="card") await key("Space");
    await settle();
    s=await S();
    if (s.scene!=="morning" && s.scene!=="card") throw new Error("day "+day+": did not roll into next morning, got "+JSON.stringify(s));
    if (s.day!==day+1) throw new Error("day "+day+": day counter did not advance, got "+s.day);
    console.log(`day ${day} OK -> next day ${s.day}, Greg stage ${s.stage}`);
  }
  if ((await S()).stage < 2) throw new Error("Greg never grew despite good care");

  // ---- now neglect Greg until he dies, to verify the funeral + restart ----
  let guard=0;
  while ((await S()).scene!=="gameover" && guard++<24){
    s=await S();
    if (s.card) { await key("Space"); continue; }
    if (s.scene==="morning"){ await key("3"); await page.waitForTimeout(1900); } // skip watering
    else if (s.scene==="office"){ await key("3"); await page.waitForTimeout(1900); }
    else if (s.scene==="night"){ await key("1"); await page.waitForTimeout(2000); }
    else await settle();
  }
  s=await S(); if(s.scene!=="gameover") throw new Error("Greg never died from neglect, got "+JSON.stringify(s));
  console.log("funeral reached after neglect, Greg survived to day "+s.day);
  // restart
  await key("Enter");
  await settle();
  s=await S(); if(!(s.scene==="intro"||s.scene==="morning")) throw new Error("restart failed, got "+JSON.stringify(s));
  console.log("restart OK -> "+s.scene);
} catch(e){ fail=e; }

if (errs.length) console.log("PAGE ERRORS:", errs);
await browser.close(); server.close();
if (fail){ console.log("FAIL:", fail.message); process.exit(1); }
console.log("PLAYTHROUGH PASSED");
