// script.js — a retelling of yesterday's Teamtailor Linköping product-team
// outing as a Maniac-Mansion-style adventure. Pick a squad of 3 and switch
// between them. Every scene is a puzzle. Office -> street -> bank-heist
// escape room -> Ölbacken (the big one) -> home.
import {
  paintOffice, paintStreet, paintHeist, paintPub, paintBikeCard, paintTitleCard,
  OFFICE_W, STREET_W, HEIST_W, PUB_W,
} from "./art.js";
import { sfx } from "./audio.js";

const is = (G, id) => G.player && G.player.id === id;   // is the active member X?

/* ------------------------------------------------------------- items ---- */
export const items = {
  cabkey:  { name: "Cabinet key", look: () => "A little brass key, still gritty with potting soil." },
  keycard: { name: "Keycard", look: () => "My Teamtailor access badge. Opens the office door." },
  card:    { name: "Company AW card", look: () => "The company card. Tonight's tab is officially Not My Problem." },
  uvlight: { name: "UV blacklight", look: () => "A little blacklight torch. Makes hidden ink glow." },
  wirecut: { name: "Wire cutters", look: () => "Red-handled wire cutters. Snip responsibly." },
  loot:    { name: "Bag of loot", look: () => "A duffel of (prop) cash. The whole point of a heist." },
  gold:    { name: "Gold bar", look: () => "Heavy, shiny, gloriously fake. Caroline already valued it." },
  beer:    { name: "Beer", look: () => "A cold one from the keg. Condensation and everything." },
  choklad: { name: "Cloetta choklad", look: () => "A bar of Cloetta chocolate — made right here in Linköping." },
};

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
          { card: { draw: (ctx, t) => paintTitleCard(ctx, t), lines: ["THE HEIST AFTER WORK", "Teamtailor Linköping · yesterday"], wait: 3600 } },
          { say: ["player", "Yesterday. We split the product crew into escape-room teams. This is ours."] },
          { say: ["player", "Plan: crack the room, then AW at Ölbacken. First — badges, and the company card."] },
          { do: (g) => { g.hintMsg = { text: "Oskar: switch teammate with 1-3 or click a face. Press H any time for a hint.", until: g.t + 7 }; g.setFlag("introDone"); } },
        ]);
      }
    },
    barks: ["Friday at last.", "Did anyone actually book the room?", "Leave the laptops — it's AW.", ["oskar", "Press H if you ever get stuck. That's me."]],
    hint: (G) => {
      if (!G.has("cabkey") && !G.flag("cabinetOpen")) return "Search the plant pot (right) — something glints in the soil.";
      if (!G.flag("cabinetOpen")) return "Use the cabinet key on the locked supply cabinet (left).";
      if (!G.has("keycard")) return "Take the keycard and company card from the open cabinet.";
      return "Use the keycard on the EXIT door (far right).";
    },
    objects: [
      {
        id: "plant", name: "office plant", x: 116, y: 104, w: 24, h: 26,
        walkTo: { x: 128, y: 124 }, defaultVerb: "pickup",
        look: (G) => G.flag("tookCabKey") ? "Just a hardy office ficus now." : "An office ficus. Something glints in the soil.",
        pickup: (G) => { if (G.flag("tookCabKey")) return "Nothing left but dirt."; G.addItem("cabkey"); G.setFlag("tookCabKey"); return "A little brass key, buried in the pot. Sneaky."; },
      },
      {
        id: "cabinet", name: "supply cabinet", x: 36, y: 70, w: 40, h: 50,
        walkTo: { x: 84, y: 122 }, defaultVerb: "open",
        look: (G) => G.flag("cabinetOpen") ? "Open — our badges and the company card." : "A locked supply cabinet. Small keyhole.",
        open: (G) => {
          if (G.flag("cabinetOpen")) return "Already open.";
          if (G.has("cabkey")) { G.setFlag("cabinetOpen"); sfx("unlock"); return "The key fits. Cabinet open — keycard and company card inside!"; }
          sfx("error"); return "Locked. It needs a small key.";
        },
        useWith: { cabkey: (G) => { if (!G.flag("cabinetOpen")) { G.setFlag("cabinetOpen"); sfx("unlock"); return "Click — the cabinet opens."; } return "Already open."; } },
      },
      {
        id: "badges", name: "the badges", x: 38, y: 73, w: 38, h: 42,
        walkTo: { x: 84, y: 122 }, defaultVerb: "pickup",
        visible: (G) => G.flag("cabinetOpen") && !G.flag("tookCard"),
        look: () => "A keycard and the company AW card.",
        pickup: (G) => { G.addItem("keycard"); G.addItem("card"); G.setFlag("tookCard"); return "Keycard and company card. Tonight's tab is on Teamtailor."; },
      },
      {
        id: "door", name: "exit door", x: 428, y: 34, w: 52, h: 64,
        walkTo: { x: 418, y: 122 }, defaultVerb: "open",
        look: (G) => G.flag("officeUnlocked") ? "Open — out we go." : "The exit. Badge reader glows red.",
        open: (G) => {
          if (G.flag("officeUnlocked")) return leaveOffice(G);
          if (G.has("keycard")) return leaveOffice(G);
          sfx("error"); return "Red light. I need a keycard first.";
        },
        useWith: { keycard: (G) => leaveOffice(G) },
      },
      { id: "desks", name: "the desks", x: 150, y: 54, w: 280, h: 30, look: () => "Standing desks, mechanical keyboards, a forest of monitors." },
      { id: "window", name: "window", x: 150, y: 11, w: 280, h: 40, look: () => "Linköping rooftops and the cathedral spire, gold in the afternoon sun." },
    ],
  },

  /* ---------------------------------------------------------- STREET --- */
  street: {
    name: "Downtown Linköping",
    width: STREET_W, paint: paintStreet, music: "street",
    start: { x: 40, y: 120, dir: "right" },
    walk: { minX: 16, maxX: 620, minY: 104, maxY: 132, scaleMin: 1.2, scaleMax: 1.8 },
    onEnter: (G) => {
      if (!G.flag("streetIntro")) { G.setFlag("streetIntro"); G.cutscene([{ say: ["player", "Downtown. 'The Vault' escape rooms are at the far end — but the door's on a code."] }]); }
    },
    hint: (G) => !G.flag("knowPin") ? "Read the noticeboard for the booking, then talk to the host at The Vault's door." : "Talk to the host at The Vault's door (far right) and give your team name.",
    barks: ["Smells like Friday.", "Race you to the door.", "Sun's still up — good omen."],
    actors: [
      { id: "host", skin: "host", accessory: "bowtie", x: 588, y: 120, dir: "left", speechColor: "#e88aa0" },
      { id: "busker", skin: "busker", accessory: "beanie", x: 126, y: 118, dir: "front", speechColor: "#c89fff" },
    ],
    objects: [
      {
        id: "host", name: "the host", x: 572, y: 92, w: 34, h: 42,
        walkTo: { x: 574, y: 122 }, defaultVerb: "talk",
        look: () => "The escape-room Game Master, bow tie and clipboard, buzzing with patter.",
        talk: (G) => {
          if (G.flag("venueOpen")) { G.say("host", "Have fun in there — and mind the clock!"); return; }
          if (!G.flag("knowPin")) { G.say("host", "Evening! Which team are you? If you've forgotten, tonight's board is right there."); return; }
          G.say("host", "Evening! And which team do we have here?");
          G.choose("Tell the host:", [
            { text: "Teamtailor", fn: (g) => { g.setFlag("venueOpen"); g.say("host", "There you are — 17:00 slot. Ninety minutes, starts NOW. Go go go!"); enterVenue(g); } },
            { text: "Spotify", fn: (g) => { sfx("error"); g.say("host", "Ha! Wrong building, friend."); } },
            { text: "...the bank robbers?", fn: (g) => { g.say("host", "Aren't we all, tonight. The booking name?"); } },
          ]);
        },
      },
      {
        id: "busker", name: "the busker", x: 112, y: 92, w: 32, h: 42,
        walkTo: { x: 126, y: 122 }, defaultVerb: "talk",
        look: () => "A street busker in a green beanie, strumming for coins.",
        talk: (G) => G.say("busker", G.flag("knowPin") ? "Door code's on the board, ja — I busk to it nightly." : "Lost? Tonight's door codes are on that board over there."),
      },
      {
        id: "board", name: "noticeboard", x: 356, y: 48, w: 50, h: 34,
        walkTo: { x: 378, y: 122 }, defaultVerb: "look",
        look: (G) => { G.setFlag("knowPin"); return ["Tonight's bookings:", "'Teamtailor — 17:00 — door code 2013.'", "(The year we were founded. Cute.)"]; },
      },
      {
        id: "venue", name: "The Vault escape rooms", x: 556, y: 38, w: 76, h: 82,
        walkTo: { x: 600, y: 122 }, defaultVerb: "use",
        look: () => "A converted bank. Tonight's scenario: bank robbers. Fitting for a product team.",
        use: (G) => {
          if (G.flag("venueOpen")) return enterVenue(G);
          return "The Game Master's right at the door — I should talk to him.";
        },
      },
      { id: "cathedral", name: "the cathedral", x: 248, y: 6, w: 30, h: 56, look: () => "Linköping Cathedral. Older than banking, older than our backlog." },
      { id: "bikes", name: "the bikes", x: 150, y: 92, w: 80, h: 24, look: () => "Our rides home for later. AW first." },
    ],
  },

  /* ----------------------------------------------- THE BANK-HEIST ROOM -- */
  heist: {
    name: "The Vault — Heist Scenario",
    width: HEIST_W, paint: paintHeist, music: "escape",
    start: { x: 40, y: 124, dir: "right" },
    walk: { minX: 16, maxX: 620, minY: 106, maxY: 132, scaleMin: 1.15, scaleMax: 1.7 },
    // co-op: the vault is powered only while someone stands on the plate (x 496..546)
    tick: (G) => G.setFlag("plateHeld", G.partyOnArea(496, 546)),
    barks: ["Colder than our staging env in here.", "Anyone else hear ticking?", "Ninety minutes. We've got this.", ["oskar", "Stuck? Press H — that's literally my job."]],
    actors: [
      { id: "guard", skin: "guard", accessory: "cap", x: 462, y: 122, dir: "left", speechColor: "#9fb4e0" },
    ],
    onEnter: (G) => {
      if (G.heistStart == null) G.heistStart = G.t;   // start the 90-min escape clock
      if (!G.flag("heistIntro")) {
        G.cutscene([
          { say: ["player", "Scenario: bank robbers. Find the loot, kill the alarm, power the vault — get out."] },
          { say: ["player", "Everyone's got a knack. Switch between the three of us to use them."] },
          { do: (g) => { g.setFlag("heistIntro"); g.hintMsg = { text: "Oskar: stuck? Press H and I'll point at the next move.", until: g.t + 6 }; } },
        ]);
      }
    },
    hint: (G) => {
      if (!G.flag("uvSeen")) return (G.has("uvlight") || G.inParty("rikard")) ? "Use the UV light on the poster (far left) — Rikard can use his phone." : "Open the manager's desk drawer for a UV light.";
      if (!G.flag("cipherDone")) return "Use the cipher wheel now you have the three symbols.";
      if (!G.flag("safeOpen")) return "Enter the code on the safe (centre).";
      if (!G.flag("gotLoot")) return "Grab the loot from the open safe.";
      if (!G.flag("alarmOff")) return (G.has("wirecut") || G.inParty("per")) ? "Cut the alarm panel — Per can do it bare-handed." : "Open the red toolbox for wire cutters.";
      if (!G.flag("plateHeld")) return "Co-op: walk one teammate onto the PWR plate, then switch (1-3) to another.";
      return "Power's held — open the vault door (far right) and run!";
    },
    objects: [
      {
        id: "drawer", name: "desk drawer", x: 210, y: 92, w: 32, h: 14,
        walkTo: { x: 224, y: 124 }, defaultVerb: "open",
        look: (G) => G.flag("drawerOpen") ? (G.flag("tookUV") ? "Empty." : "A UV blacklight inside.") : "The manager's desk drawer.",
        open: (G) => { if (G.flag("drawerOpen")) return G.flag("tookUV") ? "Empty." : "There's a UV blacklight in here — take it."; G.setFlag("drawerOpen"); return "The drawer slides open — a UV blacklight!"; },
      },
      {
        id: "uvitem", name: "UV blacklight", x: 212, y: 88, w: 24, h: 14,
        walkTo: { x: 224, y: 124 }, defaultVerb: "pickup",
        visible: (G) => G.flag("drawerOpen") && !G.flag("tookUV"),
        pickup: (G) => { G.addItem("uvlight"); G.setFlag("tookUV"); return "A UV blacklight. (Rikard would just use his phone.)"; },
      },
      {
        id: "poster", name: "UV poster", x: 36, y: 34, w: 40, h: 44,
        walkTo: { x: 58, y: 124 }, defaultVerb: "use",
        look: () => "A bank poster. Faint marks — only visible under UV light.",
        use: (G) => {
          if (G.flag("uvSeen")) return "Under UV: a diamond, a triangle, a dot.";
          if (is(G, "rikard")) { G.setFlag("uvSeen"); G.flash(); return "Rikard's phone has a UV torch — three glyphs glow: ◆ ▲ ●."; }
          if (G.has("uvlight")) { G.setFlag("uvSeen"); sfx("coin"); return "I shine the blacklight — three glyphs glow: ◆ ▲ ●."; }
          sfx("error"); return "Faint marks. I need a UV light — or Rikard's phone.";
        },
        useWith: { uvlight: (G) => { if (!G.flag("uvSeen")) { G.setFlag("uvSeen"); sfx("coin"); return "Under the blacklight, three glyphs glow: ◆ ▲ ●."; } return "Already read it."; } },
      },
      {
        id: "wheel", name: "cipher wheel", x: 114, y: 38, w: 40, h: 40,
        walkTo: { x: 132, y: 124 }, defaultVerb: "use",
        look: () => "A brass cipher wheel mapping symbols to digits.",
        use: (G) => {
          if (G.flag("cipherDone")) return "Cracked already: 4 8 7 3.";
          if (!G.flag("uvSeen")) { sfx("error"); return "It needs three symbols aligned — find them first."; }
          G.setFlag("cipherDone");
          if (is(G, "emil")) { G.flash(); return "Emil aligns ◆▲● in seconds — out pops 4-8-7-3!"; }
          sfx("unlock"); return "We line up ◆▲●... it clacks out a code: 4-8-7-3!";
        },
      },
      { id: "ledger", name: "the ledger", x: 206, y: 66, w: 30, h: 24, walkTo: { x: 220, y: 124 }, look: () => "The manager's ledger: 'never trust a wheel you can't read in the dark.'" },
      {
        id: "vending", name: "vending machine", x: 264, y: 52, w: 28, h: 48,
        walkTo: { x: 278, y: 124 }, defaultVerb: "use",
        look: (G) => G.flag("tookChoklad") ? "A Cloetta machine, one bar lighter." : "A Cloetta vending machine — hometown chocolate.",
        use: (G) => { if (G.flag("tookChoklad")) return "Fresh out of my favourite. Tragic."; G.addItem("choklad"); G.setFlag("tookChoklad"); sfx("coin"); return "A bar of Cloetta choklad clunks into the tray. Linköping's finest."; },
      },
      {
        id: "guard", name: "the guard", x: 446, y: 92, w: 34, h: 42,
        walkTo: { x: 432, y: 124 }, defaultVerb: "talk",
        visible: (G) => !G.flag("guardDistracted"),
        look: () => "A bank guard, arms crossed, planted in front of the alarm panel.",
        talk: (G) => G.say("guard", "Nothing gets past me. Especially not that alarm."),
        give: { choklad: (G) => {
          G.removeItem("choklad"); G.setFlag("guardDistracted"); sfx("coin");
          const g = G.actors.find((a) => a.id === "guard"); if (g) g.target = { x: 330, y: 124 };
          G.say("guard", "...is that Cloetta? Don't mind if I do.");
          return "The guard pockets the chocolate and ambles off — the alarm's clear!";
        } },
        useWith: { choklad: (G) => rooms.heist.objects.find((o) => o.id === "guard").give.choklad(G) },
      },
      {
        id: "safe", name: "the safe", x: 300, y: 30, w: 70, h: 64,
        walkTo: { x: 332, y: 124 }, defaultVerb: "use",
        look: () => "A four-digit vault safe.",
        use: (G) => {
          if (G.flag("safeOpen")) return G.flag("gotLoot") ? "Empty now." : "It's open — grab the loot!";
          if (!G.flag("cipherDone")) { sfx("error"); return "Four digits. I don't have the code yet."; }
          G.setFlag("safeOpen");
          if (is(G, "caroline")) { G.flash(); return "Caroline keys in 4-8-7-3 like she's closing the month. CLUNK!"; }
          sfx("unlock"); return "I punch in 4-8-7-3... CLUNK — open!";
        },
      },
      {
        id: "loot", name: "the loot", x: 312, y: 44, w: 44, h: 34,
        walkTo: { x: 332, y: 124 }, defaultVerb: "pickup",
        visible: (G) => G.flag("safeOpen") && !G.flag("gotLoot"),
        pickup: (G) => { G.addItem("loot"); G.addItem("gold"); G.setFlag("gotLoot"); return "Loot bagged — a duffel of cash and a gold bar."; },
      },
      {
        id: "toolbox", name: "red toolbox", x: 398, y: 82, w: 28, h: 16,
        walkTo: { x: 412, y: 124 }, defaultVerb: "open",
        look: (G) => G.flag("toolboxOpen") ? (G.flag("tookCutters") ? "Empty." : "Wire cutters inside.") : "A red toolbox.",
        open: (G) => { if (G.flag("toolboxOpen")) return G.flag("tookCutters") ? "Empty." : "Wire cutters in here — take them."; G.setFlag("toolboxOpen"); return "Toolbox open — wire cutters!"; },
      },
      {
        id: "cutitem", name: "wire cutters", x: 400, y: 82, w: 26, h: 14,
        walkTo: { x: 412, y: 124 }, defaultVerb: "pickup",
        visible: (G) => G.flag("toolboxOpen") && !G.flag("tookCutters"),
        pickup: (G) => { G.addItem("wirecut"); G.setFlag("tookCutters"); return "Wire cutters. (Per won't even need these.)"; },
      },
      {
        id: "alarm", name: "alarm panel", x: 438, y: 40, w: 34, h: 36,
        walkTo: { x: 452, y: 124 }, defaultVerb: "use",
        look: () => "A blinking alarm panel by the exit. Five wires.",
        use: (G) => {
          if (G.flag("alarmOff")) return "Alarm's dead.";
          if (!G.flag("guardDistracted")) { sfx("error"); return "The guard's planted right in front of it. I'll have to distract him first."; }
          if (is(G, "per")) { G.flash(); G.setFlag("alarmOff"); return "Per reads the wiring like prod logs and kills it bare-handed."; }
          if (G.has("wirecut")) { G.setFlag("alarmOff"); sfx("unlock"); return "Snip — the right wire. The alarm dies with a sad beep."; }
          sfx("error"); return "Five wires. I'd want wire cutters — or Per.";
        },
        useWith: { wirecut: (G) => { if (G.flag("alarmOff")) return "Already dead."; if (!G.flag("guardDistracted")) { sfx("error"); return "Not with the guard watching."; } G.setFlag("alarmOff"); sfx("unlock"); return "Snip. Alarm down."; } },
      },
      {
        id: "plate", name: "pressure plate", x: 496, y: 116, w: 50, h: 16,
        walkTo: { x: 521, y: 128 }, defaultVerb: "use",
        look: (G) => G.flag("plateHeld") ? "Held down — power's flowing to the vault." : "A pressure plate. Power flows only while someone stands on it.",
        use: () => "I stand on the plate. Now switch to another teammate (1-3) and work the vault.",
      },
      {
        id: "vault", name: "the vault door", x: 570, y: 22, w: 66, h: 80,
        walkTo: { x: 600, y: 124 }, defaultVerb: "open",
        look: () => "The way out. Needs the loot, a dead alarm, and power held on the plate.",
        open: (G) => {
          if (!G.flag("gotLoot")) { sfx("error"); return "Not without the loot."; }
          if (!G.flag("alarmOff")) { sfx("error"); return "The alarm's still armed — this would scream."; }
          if (!G.flag("plateHeld")) { sfx("error"); return "No power. Someone has to stand on the plate — move a teammate there, then switch back."; }
          return escapeHeist(G);
        },
      },
    ],
  },

  /* --------------------------------------------------- ÖLBACKEN (AW) --- */
  pub: {
    name: "Ölbacken",
    width: PUB_W, paint: paintPub, music: "bar",
    start: { x: 60, y: 120, dir: "right" },
    walk: { minX: 30, maxX: 540, minY: 112, maxY: 128, scaleMin: 1.25, scaleMax: 1.55 },
    actors: [
      { id: "bartend", skin: "bartend", accessory: "apron", x: 120, y: 118, dir: "front", speechColor: "#7fe0c0" },
    ],
    onEnter: (G) => {
      // the teammates who weren't on the squad are already here — good company
      (G.bench || []).forEach((m, i) => G.spawnActor({ id: m.id, skin: m.skin, x: 214 + i * 44, y: 122, dir: "front" }));
      if (!G.flag("pubIntro")) {
        G.setFlag("pubIntro");
        G.cutscene([
          { say: ["player", "Out of the bank, loot and all — and the rest of the crew's already at Ölbacken!"] },
          { say: ["player", "Let's open a tab, tap that keg, and get the band going."] },
        ]);
      }
    },
    hint: (G) => {
      if (!G.flag("tabOpen")) return "Use the company card on the tab board behind the bar.";
      if (!G.flag("kegTapped")) return "Tap the keg on the bar.";
      if (!G.flag("musicOn")) return "Get a beer from the keg, then give it to the band to start the live music.";
      if (!G.flag("ateFood")) return "Grab the food off the table.";
      return "Talk to the crew, then head out the door (far right) to bike home.";
    },
    barks: [
      ["per", "That laser grid never stood a chance."],
      ["caroline", "I'm expensing this round. Tell the books, not me."],
      ["emil", "New personal best in there. Just saying."],
      ["jonas", "Platform carried the vault door. You're welcome."],
      ["anders", "'Cranked valiantly.' Going in my review."],
      ["rikard", "Filmed the whole heist. Mostly the ceiling."],
      ["oskar", "Need a hint for the menu? ...kidding. Mostly."],
      "Skål! To the Linköping crew!",
      "Best AW this quarter, easily.",
    ],
    objects: [
      {
        id: "tab", name: "the tab board", x: 168, y: 54, w: 28, h: 18,
        walkTo: { x: 150, y: 120 }, defaultVerb: "use",
        look: (G) => G.flag("tabOpen") ? "Tab's open. The company says hej." : "The bar tab board. Cash or card.",
        use: (G) => G.flag("tabOpen") ? "Tab's already running." : "I should put the company card on the tab.",
        useWith: { card: (G) => openTab(G) },
        give: { card: (G) => openTab(G) },
      },
      {
        id: "bartend", name: "the bartender", x: 104, y: 92, w: 34, h: 40,
        walkTo: { x: 132, y: 120 }, defaultVerb: "talk",
        look: () => "The bartender, apron on, towel over the shoulder, ready to pour.",
        talk: (G) => G.say("bartend", G.flag("tabOpen") ? "Tab's running — keg, kitchen and the band are all yours. Skål!" : "Welcome to Ölbacken! Open a tab — hand me a card and the night's yours."),
        give: { card: (G) => openTab(G) },
      },
      {
        id: "keg", name: "the keg", x: 40, y: 78, w: 48, h: 44,
        walkTo: { x: 72, y: 120 }, defaultVerb: "use",
        look: (G) => G.flag("kegTapped") ? "A gloriously dented keg." : "A full keg. We actually got a whole keg.",
        use: (G) => {
          if (!G.flag("tabOpen")) { sfx("error"); return "Bartender shakes his head: 'Open a tab first.'"; }
          if (!G.flag("kegTapped")) { G.setFlag("kegTapped"); sfx("coin"); G.addItem("beer"); return "We tap the whole keg — foam everywhere. Grabbed a beer."; }
          if (!G.has("beer")) { G.addItem("beer"); return "Poured another cold one."; }
          return "I've already got a beer in hand.";
        },
      },
      {
        id: "band", name: "the band", x: 436, y: 40, w: 116, h: 30,
        walkTo: { x: 474, y: 120 }, defaultVerb: "talk",
        look: (G) => G.flag("musicOn") ? "The band's tearing through a set. The room's alive." : "A live band, set up but idle. They eye the bar.",
        talk: (G) => G.flag("musicOn") ? G.say("band", "Tack Linköping! This one's for the bank robbers!") : G.say("band", "Buy us a beer and we'll play all night."),
        give: { beer: (G) => { if (G.flag("musicOn")) return "They've already got drinks."; G.setFlag("musicOn"); G.removeItem("beer"); sfx("band"); G.say("band", "TACK! Linköping, are you ready?!"); return "I hand a beer to the guitarist — the set kicks off!"; } },
        useWith: { beer: (G) => { if (G.flag("musicOn")) return "They're sorted."; G.setFlag("musicOn"); G.removeItem("beer"); sfx("win"); return "Beer delivered — the band launches into it!"; } },
      },
      {
        id: "food", name: "the food", x: 178, y: 90, w: 44, h: 18,
        walkTo: { x: 200, y: 120 }, defaultVerb: "use",
        look: (G) => G.flag("ateFood") ? "Empty plates. We were hungry." : "Burgers and fries, fresh from the kitchen.",
        use: (G) => {
          if (!G.flag("tabOpen")) { sfx("error"); return "It's on the tab — open one first."; }
          if (!G.flag("ateFood")) { G.setFlag("ateFood"); sfx("pickup"); return "We feast between heist war-stories. Glorious."; }
          return "Stuffed. Couldn't manage another fry.";
        },
      },
      {
        id: "crew", name: "the crew", x: 196, y: 100, w: 170, h: 32,
        walkTo: { x: 250, y: 122 }, defaultVerb: "talk",
        look: () => "The rest of the Linköping crew, mid-story and grinning.",
        talk: (G) => crewTalk(G),
      },
      {
        id: "home", name: "the way home", x: 516, y: 36, w: 40, h: 84,
        walkTo: { x: 520, y: 120 }, defaultVerb: "open",
        look: () => "The door out. Bikes home, or a slow walk through the night.",
        open: (G) => {
          const need = ["tabOpen", "kegTapped", "musicOn", "ateFood"].filter((f) => !G.flag(f));
          if (need.length) { sfx("error"); return "Not yet — a proper AW first: open a tab, tap the keg, start the music, and eat."; }
          return goHome(G);
        },
      },
      { id: "bar", name: "the bar", x: 12, y: 56, w: 150, h: 30, look: () => "Bottles, taps, warm light. Ölbacken on a Friday: peak Linköping." },
    ],
  },
};

/* ----------------------------------------------------- shared actions -- */
function openTab(G) {
  if (G.flag("tabOpen")) return "Tab's already open.";
  G.setFlag("tabOpen"); sfx("coin");
  return "Company card on the tab. Keg, kitchen and stage: unlocked.";
}

const CREW_LINES = [
  ["per", "Our room had a laser grid. I may have... audited it."],
  ["caroline", "I counted the loot twice. The books balance. Obviously."],
  ["emil", "Beat our room with eight minutes to spare. New record."],
  ["jonas", "Platform team carried the heavy door. You're welcome."],
  ["anders", "I'm told I 'cranked valiantly'. I'll take it."],
  ["rikard", "Got the whole thing on my phone. Mostly the ceiling."],
  ["oskar", "If you're ever stuck, you know who to ping."],
];
function crewTalk(G) {
  const n = (G.state.flags.crewLine || 0) % CREW_LINES.length;
  G.setFlag("crewLine", n + 1);
  const [who, line] = CREW_LINES[n];
  // speak as that teammate if they're present, else as the active player
  const present = G.actors.some((a) => a.id === who) || G.party.some((p) => p.id === who);
  G.say(present ? who : "player", line);
}

function leaveOffice(G) {
  G.cutscene([
    { flag: ["officeUnlocked"] }, { sfx: "door" },
    { say: ["player", "Badge beeps green. Team — move out!"] },
    { wait: 400 }, { room: "street" },
  ]);
}
function enterVenue(G) {
  G.cutscene([
    { say: ["player", "Code works. We grabbed the bikes and rolled downtown."] },
    { card: { draw: (ctx, t) => paintBikeCard(ctx, t, false), lines: ["Through town to The Vault —", "ninety minutes on the clock."], wait: 3200 } },
    { wait: 200 }, { room: "heist" },
  ]);
}
function escapeHeist(G) {
  G.vaultClock = Math.round(G.escapeLeft());   // freeze the escape clock for the ending
  G.setFlag("escaped");
  G.cutscene([
    { sfx: "rumble" },
    { say: ["player", "Loot bagged, alarm dead, power held — the vault grinds open. Out with time to spare!"] },
    { wait: 500 }, { room: "pub" },
  ]);
}
function goHome(G) {
  G.cutscene([
    { say: ["player", "Keg defeated, band still playing, everyone happy. Skål — and good natt!"] },
    { card: { draw: (ctx, t) => paintBikeCard(ctx, t, true), lines: ["We biked home through the", "Linköping night."], wait: 3200 } },
    { wait: 200 },
    { do: (g) => g.win({
      title: "GOD NATT, LINKÖPING",
      lines: [
        "Vault cracked. Loot bagged.",
        "Keg, live band, food, good company",
        "at Ölbacken till closing.",
        "Then we biked home.",
      ],
      replay: true,
    }) },
  ]);
}

export const onWin = null;
