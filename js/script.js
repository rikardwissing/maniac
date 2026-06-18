// script.js — the adventure: a retelling of yesterday's Teamtailor Linköping
// product-team outing. Office -> bank-heist escape room -> Ölbacken -> home.
// Maniac-Mansion style: switch between the 7 real teammates; each has a job.
import {
  paintOffice, paintStreet, paintHeist, paintPub,
  OFFICE_W, STREET_W, HEIST_W, PUB_W,
} from "./art.js";
import { sfx } from "./audio.js";

/* ------------------------------------------------------------- items ---- */
export const items = {
  keycard: { name: "Keycard", look: () => "A Teamtailor access badge. Opens the office door." },
  loot:    { name: "Bag of loot", look: () => "A duffel stuffed with (prop) cash. The whole point of a heist." },
  gold:    { name: "Gold bar", look: () => "Heavy, shiny, gloriously fake. Caroline already valued it." },
};

/* who-is-active helpers */
const is = (G, id) => G.player && G.player.id === id;

/* ============================================================= ROOMS ==== */
export const rooms = {

  /* ---------------------------------------------------------- OFFICE --- */
  office: {
    name: "Teamtailor Linköping — Product",
    width: OFFICE_W, paint: paintOffice, music: "office",
    start: { x: 70, y: 122, dir: "right" },
    walk: { minX: 14, maxX: 466, minY: 104, maxY: 132, scaleMin: 1.2, scaleMax: 1.8 },
    onEnter: (G) => {
      if (!G.flag("introDone")) {
        G.cutscene([
          { say: ["player", "Yesterday. The whole Linköping product crew, wrapping up for the week."] },
          { say: ["player", "Plan: escape room downtown, then AW. First — grab a badge and get everyone out."] },
          { do: (g) => {
            g.hintMsg = { text: "Oskar: that's the crew up top. Click a face or press 1-7 to switch. Press H for a hint.", until: g.t + 7 };
            g.setFlag("introDone");
          } },
        ]);
      }
    },
    hint: (G) => !G.has("keycard")
      ? "Walk to the first desk (left) and pick up the keycard."
      : "Use the keycard on the EXIT door at the far right.",
    objects: [
      {
        id: "card", name: "keycard", x: 66, y: 60, w: 24, h: 22,
        walkTo: { x: 84, y: 122 }, defaultVerb: "pickup",
        visible: (G) => !G.flag("tookCard"),
        look: () => "A keycard someone left on the desk. Finders keepers.",
        pickup: (G) => { G.addItem("keycard"); G.setFlag("tookCard"); return "Got a badge. Now to herd everyone out."; },
      },
      {
        id: "door", name: "exit door", x: 428, y: 34, w: 52, h: 64,
        walkTo: { x: 420, y: 122 }, defaultVerb: "open",
        look: (G) => G.flag("officeUnlocked") ? "The door's open. Out we go." : "The exit. Badge reader glows red.",
        open: (G) => {
          if (G.flag("officeUnlocked")) return leaveOffice(G);
          if (!G.has("keycard")) { sfx("error"); return "Red light. I need a keycard first."; }
          return leaveOffice(G);
        },
        useWith: { keycard: (G) => leaveOffice(G) },
      },
      { id: "desks", name: "the desks", x: 150, y: 54, w: 280, h: 30,
        look: () => "Standing desks, mechanical keyboards, a forest of monitors. Home of the product team." },
      { id: "window", name: "window", x: 150, y: 11, w: 280, h: 50,
        look: () => "Linköping rooftops and the cathedral spire, gold in the afternoon sun." },
      { id: "plant", name: "office plant", x: 118, y: 104, w: 18, h: 22,
        look: () => "A hardy office ficus. It has survived every reorg." },
    ],
  },

  /* ---------------------------------------------------------- STREET --- */
  street: {
    name: "Downtown Linköping",
    width: STREET_W, paint: paintStreet, music: "street",
    start: { x: 40, y: 120, dir: "right" },
    walk: { minX: 16, maxX: 620, minY: 104, maxY: 132, scaleMin: 1.2, scaleMax: 1.8 },
    onEnter: (G) => {
      if (!G.flag("streetIntro")) {
        G.setFlag("streetIntro");
        G.cutscene([{ say: ["player", "Out into town. The escape room — 'The Vault' — is down at the far end of the street."] }]);
      }
    },
    hint: () => "Walk right to the end of the street and go into The Vault escape rooms.",
    objects: [
      {
        id: "venue", name: "The Vault escape rooms", x: 560, y: 38, w: 72, h: 82,
        walkTo: { x: 600, y: 122 }, defaultVerb: "open",
        look: () => "A converted bank. Tonight's scenario: bank robbers. Fitting for a product team.",
        open: (G) => enterVenue(G), use: (G) => enterVenue(G),
      },
      { id: "cathedral", name: "the cathedral", x: 248, y: 6, w: 30, h: 56,
        look: () => "Linköping Cathedral. Older than banking. Definitely older than our sprint board." },
      { id: "bikes", name: "the bikes", x: 150, y: 92, w: 80, h: 24,
        look: () => "Our trusty steeds for later. AW first, though." },
    ],
  },

  /* ----------------------------------------------- THE BANK-HEIST ROOM -- */
  heist: {
    name: "The Vault — Heist Scenario",
    width: HEIST_W, paint: paintHeist, music: "escape",
    start: { x: 40, y: 124, dir: "right" },
    walk: { minX: 16, maxX: 620, minY: 106, maxY: 132, scaleMin: 1.15, scaleMax: 1.7 },
    onEnter: (G) => {
      if (!G.flag("heistIntro")) {
        G.cutscene([
          { say: ["player", "The scenario: we're bank robbers. Find the loot, kill the alarm, crack the vault — get out."] },
          { say: ["player", "We split into teams. In our room, everyone's got a job. Switch to whoever fits the task."] },
          { do: (g) => { g.setFlag("heistIntro"); g.hintMsg = { text: "Oskar: stuck? Press H and I'll point at the next move.", until: g.t + 6 }; } },
        ]);
      }
    },
    hint: (G) => {
      if (!G.flag("uvSeen")) return "Switch to Rikard (mobile) and Use his phone on the UV poster (far left).";
      if (!G.flag("cipherDone")) return "Switch to Emil (Aboard) and Use the cipher wheel.";
      if (!G.flag("safeOpen")) return "Switch to Caroline (controller) and Use the safe to enter the code.";
      if (!G.flag("gotLoot")) return "Pick up the loot from the open safe.";
      if (!G.flag("alarmOff")) return "Switch to Per (CISO) and Use the alarm panel.";
      if (!G.flag("leftValve")) return "Switch to Jonas (platform) and Use the left power valve.";
      if (!G.flag("rightValve")) return "Switch to Anders (platform) and Use the right power valve.";
      return "Open the vault door at the far right and get out!";
    },
    objects: [
      {
        id: "poster", name: "UV poster", x: 36, y: 34, w: 40, h: 44,
        walkTo: { x: 58, y: 124 }, defaultVerb: "use",
        look: () => "A bank poster. Faint marks on it — only visible under UV light.",
        use: (G) => {
          if (G.flag("uvSeen")) return "Under UV: a diamond, a triangle, a dot.";
          if (is(G, "rikard")) { G.setFlag("uvSeen"); sfx("coin"); return "Rikard flips on his phone's UV torch — three glyphs glow: ◆ ▲ ●."; }
          sfx("error"); return "Needs a UV light. Rikard's phone has one — switch to Rikard (mobile).";
        },
      },
      {
        id: "wheel", name: "cipher wheel", x: 114, y: 38, w: 40, h: 40,
        walkTo: { x: 132, y: 124 }, defaultVerb: "use",
        look: () => "A brass cipher wheel that maps symbols to digits.",
        use: (G) => {
          if (G.flag("cipherDone")) return "Already cracked. The code is 4 8 7 3.";
          if (!G.flag("uvSeen")) { sfx("error"); return "It needs three symbols to align. I should find them first."; }
          if (is(G, "emil")) { G.setFlag("cipherDone"); sfx("unlock"); return "Emil aligns ◆▲● in seconds. The wheel clacks out a code: 4-8-7-3!"; }
          sfx("error"); return "Emil's never lost an escape room — switch to Emil (Aboard) for this.";
        },
      },
      {
        id: "ledger", name: "the ledger", x: 206, y: 66, w: 30, h: 26,
        walkTo: { x: 220, y: 124 }, defaultVerb: "look",
        look: () => "The manager's ledger. A coffee ring and a note: 'never trust a wheel you can't read in the dark.'",
      },
      {
        id: "safe", name: "the safe", x: 300, y: 30, w: 70, h: 64,
        walkTo: { x: 332, y: 124 }, defaultVerb: "use",
        look: () => "A four-digit vault safe. Heavy door, smug little keypad.",
        use: (G) => {
          if (G.flag("safeOpen")) return G.flag("gotLoot") ? "Empty now." : "It's open — grab the loot!";
          if (!G.flag("cipherDone")) { sfx("error"); return "Four digits. I don't have the code yet."; }
          if (is(G, "caroline")) { G.setFlag("safeOpen"); sfx("unlock"); return "Caroline taps 4-8-7-3 like she's reconciling payroll. CLUNK — open!"; }
          sfx("error"); return "Numbers are Caroline's love language — switch to Caroline (controller).";
        },
      },
      {
        id: "loot", name: "the loot", x: 312, y: 44, w: 44, h: 34,
        walkTo: { x: 332, y: 124 }, defaultVerb: "pickup",
        visible: (G) => G.flag("safeOpen") && !G.flag("gotLoot"),
        look: () => "A duffel of cash and a gold bar, just sitting there.",
        pickup: (G) => { G.addItem("loot"); G.addItem("gold"); G.setFlag("gotLoot"); return "The loot's ours — a bag of cash and a gold bar. Rich for the next 90 minutes."; },
      },
      {
        id: "alarm", name: "alarm panel", x: 438, y: 40, w: 34, h: 36,
        walkTo: { x: 452, y: 124 }, defaultVerb: "use",
        look: () => "A blinking alarm panel by the exit. Five coloured wires.",
        use: (G) => {
          if (G.flag("alarmOff")) return "Alarm's already dead.";
          if (is(G, "per")) { G.setFlag("alarmOff"); sfx("unlock"); return "Per reads the wiring like prod logs, snips the right one. The alarm dies with a sad beep."; }
          sfx("error"); return "Cut the wrong wire and it's sirens. Per (CISO) should handle this.";
        },
      },
      {
        id: "valveL", name: "left power valve", x: 488, y: 54, w: 24, h: 30,
        walkTo: { x: 500, y: 124 }, defaultVerb: "use",
        look: () => "A stiff hydraulic valve. Left of two.",
        use: (G) => {
          if (G.flag("leftValve")) return "Left valve: on.";
          if (is(G, "jonas")) { G.setFlag("leftValve"); sfx("door"); return "Jonas cranks the left valve. Hydraulics hiss awake."; }
          sfx("error"); return "Stiff. Platform-team muscle: switch to Jonas.";
        },
      },
      {
        id: "valveR", name: "right power valve", x: 528, y: 54, w: 24, h: 30,
        walkTo: { x: 540, y: 124 }, defaultVerb: "use",
        look: () => "The right hydraulic valve.",
        use: (G) => {
          if (G.flag("rightValve")) return "Right valve: on.";
          if (is(G, "anders")) { G.setFlag("rightValve"); sfx("door"); return "Anders throws the right valve. Both pumps online."; }
          sfx("error"); return "The other platform half: switch to Anders.";
        },
      },
      {
        id: "vault", name: "the vault door", x: 570, y: 22, w: 66, h: 80,
        walkTo: { x: 602, y: 124 }, defaultVerb: "open",
        look: () => "The way out. Wants power, a silent alarm, and — obviously — the loot.",
        open: (G) => {
          if (!G.flag("gotLoot")) { sfx("error"); return "We're not leaving empty-handed. Grab the loot first."; }
          if (!G.flag("alarmOff")) { sfx("error"); return "The alarm's still armed — opening this would scream."; }
          if (!(G.flag("leftValve") && G.flag("rightValve"))) { sfx("error"); return "No power to the door. Both valves need turning."; }
          return escapeHeist(G);
        },
      },
    ],
  },

  /* ------------------------------------------------------- ÖLBACKEN ---- */
  pub: {
    name: "Ölbacken",
    width: PUB_W, paint: paintPub, music: "bar",
    start: { x: 60, y: 120, dir: "right" },
    walk: { minX: 30, maxX: 450, minY: 110, maxY: 126, scaleMin: 1.25, scaleMax: 1.55 },
    onEnter: (G) => {
      if (!G.flag("pubIntro")) {
        G.setFlag("pubIntro");
        G.cutscene([{ say: ["player", "Out of the bank, loot and all — straight to Ölbacken for AW. We earned it."] }]);
      }
    },
    hint: (G) => {
      if (!G.flag("kegTapped")) return "Tap the keg on the bar.";
      if (!G.flag("ateFood")) return "Grab the food on the table to the right.";
      return "Head out the door (far right) to bike home.";
    },
    objects: [
      {
        id: "keg", name: "the keg", x: 54, y: 70, w: 40, h: 42,
        walkTo: { x: 86, y: 120 }, defaultVerb: "use",
        look: (G) => G.flag("kegTapped") ? "A gloriously dented keg. Half gone already." : "A full keg. We actually got a whole keg.",
        use: (G) => {
          if (G.flag("kegTapped")) return "Beers all round. Skål!";
          G.setFlag("kegTapped"); sfx("coin"); return "We tap the keg. Foam everywhere. Glasses for the whole crew!";
        },
      },
      {
        id: "food", name: "the food", x: 250, y: 90, w: 64, h: 18,
        walkTo: { x: 282, y: 120 }, defaultVerb: "use",
        look: (G) => G.flag("ateFood") ? "Empty plates. We were hungry." : "Burgers and fries, fresh from the kitchen.",
        use: (G) => {
          if (G.flag("ateFood")) return "Stuffed. Couldn't eat another fry.";
          G.setFlag("ateFood"); sfx("pickup"); return "Food lands. We demolish it between war stories about the vault.";
        },
      },
      {
        id: "home", name: "the door home", x: 440, y: 40, w: 40, h: 80,
        walkTo: { x: 430, y: 120 }, defaultVerb: "open",
        look: () => "The way home. The night bus, or a bike, or just a good walk.",
        open: (G) => {
          if (!(G.flag("kegTapped") && G.flag("ateFood"))) { sfx("error"); return "One more round first — there's a keg and food to finish."; }
          goHome(G);
        },
      },
      { id: "bar", name: "the bar", x: 16, y: 56, w: 150, h: 30,
        look: () => "Bottles, taps, warm light. Ölbacken on a Friday: peak Linköping." },
    ],
  },
};

/* ----------------------------------------------------- shared actions -- */
function leaveOffice(G) {
  G.cutscene([
    { flag: ["officeUnlocked"] }, { sfx: "door" },
    { say: ["player", "Badge beeps green. Everyone out!"] },
    { wait: 400 }, { room: "street" },
  ]);
}
function enterVenue(G) {
  G.cutscene([
    { say: ["player", "Booking's under 'Teamtailor'. Ninety minutes on the clock — let's rob a bank."] },
    { wait: 400 }, { room: "heist" },
  ]);
}
function escapeHeist(G) {
  G.setFlag("escaped");
  G.cutscene([
    { sfx: "unlock" },
    { say: ["player", "Power's up, alarm's dead, loot's bagged. The vault swings open — we're out with time to spare!"] },
    { wait: 500 }, { room: "pub" },
  ]);
}
function goHome(G) {
  G.cutscene([
    { say: ["player", "Tab paid, keg defeated. Time to roll home."] },
    { wait: 400 },
    { do: (g) => g.win({
      title: "GOD NATT, LINKÖPING",
      lines: [
        "We cracked the vault, bagged the loot,",
        "tapped a keg at Ölbacken and ate well.",
        "Then we biked home through the night.",
        "",
        "Same time next AW?",
      ],
      replay: true,
    }) },
  ]);
}

export const onWin = null;
