// script.js — a retelling of yesterday's Teamtailor Linköping product-team
// outing as a Maniac-Mansion-style adventure. Pick a squad of 3 and switch
// between them. Every scene is a puzzle. Office -> street -> bank-heist
// escape room -> Ölbacken (the big one) -> home.
import {
  paintOffice, paintStreet, paintHeist, paintPub, paintBikeCard, paintTitleCard,
  paintControl, paintRoof, paintCathedral,
  OFFICE_W, STREET_W, HEIST_W, PUB_W, CONTROL_W, ROOF_W, CATH_W,
  TEAM,
} from "./art.js";
const nameOf = (id) => (TEAM.find((m) => m.id === id) || {}).name || id;
import { sfx } from "./audio.js";

const is = (G, id) => G.player && G.player.id === id;   // is the active member X?

/* ------------------------------------------------------------- items ---- */
export const items = {
  mug:     { name: "Coffee mug", look: () => "An empty mug: 'World's Okayest Recruiter'." },
  coffee:  { name: "Mug of coffee", look: () => "Hot, black, dangerous. Robin-fuel." },
  bun:     { name: "Kanelbulle", look: () => "A Swedish cinnamon bun. Smells heavenly." },
  helmet:  { name: "Bike helmet", look: () => "A sturdy helmet. Safety first, always." },
  cabkey:  { name: "Cabinet key", look: () => "A little brass key, still gritty with potting soil." },
  keycard: { name: "Keycard", look: () => "My Teamtailor access badge. Opens the office door." },
  card:    { name: "Company AW card", look: () => "The company card. Tonight's tab is officially Not My Problem." },
  uvlight: { name: "UV blacklight", look: () => "A little blacklight torch. Makes hidden ink glow." },
  wirecut: { name: "Wire cutters", look: () => "Red-handled wire cutters. Snip responsibly." },
  loot:    { name: "Bag of loot", look: () => "A duffel of (prop) cash. The whole point of a heist." },
  gold:    { name: "Gold bar", look: () => "Heavy, shiny, gloriously fake. Caroline already valued it." },
  beer:    { name: "Beer", look: () => "A cold one from the keg. Condensation and everything." },
  choklad: { name: "Cloetta choklad", look: () => "A bar of Cloetta chocolate — made right here in Linköping." },
  mirror:    { name: "Hand mirror", look: () => "A little mirror. Bounces a laser beam a treat." },
  prototype: { name: "Project Aurora drive", look: () => "Teamtailor's prototype. The Curator wanted this badly." },
  evidence:  { name: "Evidence folder", look: () => "Every company the Curator skimmed, names and dates. Damning." },
  master:    { name: "Master data drive", look: () => "His master drive — every stolen secret, recovered." },
};

/* ============================================================= ROOMS ==== */
export const rooms = {

  /* ---------------------------------------------------------- OFFICE --- */
  office: {
    name: "Teamtailor Linköping — Product",
    width: OFFICE_W, paint: paintOffice, music: "office",
    start: { x: 60, y: 122, dir: "right" },
    walk: { minX: 14, maxX: 344, minY: 104, maxY: 132, scaleMin: 1.2, scaleMax: 1.8 },
    objective: "Brew Robin a fika for the keycard, grab the company card, and head out.",
    onEnter: (G) => {
      if (!G.flag("introDone")) {
        G.cutscene([
          { card: { draw: (ctx, t) => paintTitleCard(ctx, t), lines: ["THE HEIST AFTER WORK", "Teamtailor Linköping · yesterday"], wait: 3600 } },
          { say: ["player", "AW night — but a tip just landed: our escape room is a trap."] },
          { say: ["player", "The owner, 'The Curator', skims every team's secrets. Tonight he's after our prototype, Aurora."] },
          { say: ["player", "Play his rigged room, break into his control room, expose him, get our data back — and STILL make AW."] },
          { do: (g) => { g.hintMsg = { text: "Oskar: switch teammate with 1-3 or click a face. H = hint, J = objective.", until: g.t + 7 }; g.setFlag("introDone"); } },
        ]);
      }
    },
    barks: ["Friday at last.", "Robin hasn't blinked since lunch.", "Leave the laptops — it's AW.", ["oskar", "Press H if you ever get stuck. That's me."]],
    actors: [
      { id: "robin", skin: "host", x: 286, y: 122, dir: "left", speechColor: "#f2d04a", name: "Robin" },
    ],
    hint: (G) => {
      if (!G.has("keycard") && !G.flag("gaveFika")) {
        if (!G.has("coffee") && !G.flag("gaveCoffee")) return !G.has("mug") ? "Grab the mug by the coffee machine." : "Use the mug on the coffee machine to brew a coffee.";
        if (!G.has("bun") && !G.flag("gaveBun")) return "Grab the kanelbulle off the fika table.";
        return "Give Robin the coffee AND the bun — a proper fika — for the keycard.";
      }
      if (!G.has("card") && !G.flag("tookCard")) return "Dig the key out of the plant, open the cabinet, grab the company card.";
      return "Use the keycard on the EXIT door (right) to head out.";
    },
    objects: [
      { id: "mug", name: "coffee mug", x: 144, y: 60, w: 22, h: 20, walkTo: { x: 150, y: 122 }, defaultVerb: "pickup",
        visible: (G) => !G.flag("tookMug"),
        look: () => "A clean mug: 'World's Okayest Recruiter'.",
        pickup: (G) => { G.addItem("mug"); G.setFlag("tookMug"); return "Got the mug. Step one of any rescue mission."; } },
      { id: "machine", name: "coffee machine", x: 104, y: 54, w: 28, h: 44, walkTo: { x: 120, y: 122 }, defaultVerb: "use",
        look: () => "The office espresso machine. Temperamental. Vital.",
        use: (G) => "I should put a mug under it first.",
        useWith: { mug: (G) => { if (!G.has("mug")) return "Need the mug first."; G.removeItem("mug"); G.addItem("coffee"); G.setFlag("coffeeOn"); sfx("coin"); return "Grind, hiss, drip — one emergency espresso."; } } },
      { id: "bun", name: "kanelbulle", x: 184, y: 70, w: 22, h: 20, walkTo: { x: 196, y: 122 }, defaultVerb: "pickup",
        visible: (G) => !G.flag("tookBun"),
        look: () => "A fresh kanelbulle on the fika table. Sacred.",
        pickup: (G) => { G.addItem("bun"); G.setFlag("tookBun"); return "A cinnamon bun. Never adventure without one."; } },
      { id: "robin", name: "Robin", x: 270, y: 92, w: 32, h: 42, walkTo: { x: 268, y: 122 }, defaultVerb: "talk",
        look: () => "Robin, night-shift dev, guarding the keycard and running on fumes.",
        talk: (G) => G.converse(robinTree(G)),
        give: {
          coffee: (G) => { G.removeItem("coffee"); G.setFlag("gaveCoffee"); return finishFika(G, "robin", "Coffee! Halfway to a proper fika..."); },
          bun: (G) => { G.removeItem("bun"); G.setFlag("gaveBun"); return finishFika(G, "robin", "A kanelbulle! Now if only there were coffee..."); },
        } },
      { id: "plant", name: "office plant", x: 62, y: 106, w: 22, h: 22, walkTo: { x: 80, y: 122 }, defaultVerb: "pickup",
        look: (G) => G.flag("tookCabKey") ? "Just a hardy ficus now." : "An office ficus. Something glints in the soil.",
        pickup: (G) => { if (G.flag("tookCabKey")) return "Nothing left but dirt."; G.addItem("cabkey"); G.setFlag("tookCabKey"); return "A little brass key, buried in the pot. Sneaky."; } },
      { id: "cabinet", name: "supply cabinet", x: 18, y: 70, w: 36, h: 50, walkTo: { x: 44, y: 122 }, defaultVerb: "open",
        look: (G) => G.flag("cabinetOpen") ? "Open — the company AW card's inside." : "A locked supply cabinet. Small keyhole.",
        open: (G) => {
          if (G.flag("cabinetOpen")) return "Already open.";
          if (G.has("cabkey")) { G.setFlag("cabinetOpen"); G.removeItem("cabkey"); sfx("unlock"); return "The key fits. Cabinet open — the company card's inside!"; }
          sfx("error"); return "Locked. It needs a small key.";
        },
        useWith: { cabkey: (G) => { if (!G.flag("cabinetOpen")) { G.setFlag("cabinetOpen"); G.removeItem("cabkey"); sfx("unlock"); return "Click — the cabinet opens."; } return "Already open."; } } },
      { id: "card", name: "company card", x: 22, y: 84, w: 30, h: 34, walkTo: { x: 44, y: 122 }, defaultVerb: "pickup",
        visible: (G) => G.flag("cabinetOpen") && !G.flag("tookCard"),
        look: () => "The company AW card. Tonight's tab is on Teamtailor.",
        pickup: (G) => { G.addItem("card"); G.setFlag("tookCard"); return "Company card — the night's on the house."; } },
      { id: "door", name: "exit door", x: 320, y: 34, w: 40, h: 62, walkTo: { x: 308, y: 122 }, defaultVerb: "open",
        look: (G) => G.flag("officeUnlocked") ? "Open — out to the street." : "The exit. Badge reader glows red.",
        open: (G) => {
          if (G.flag("officeUnlocked")) return leaveOffice(G);
          if (G.has("keycard")) return leaveOffice(G);
          sfx("error"); return "Red light. I need the keycard — Robin's holding it.";
        },
        useWith: { keycard: (G) => leaveOffice(G) } },
      { id: "monitor", name: "a monitor", x: 238, y: 54, w: 40, h: 26, walkTo: { x: 256, y: 122 },
        look: () => ["An anonymous tip glows on screen:", "'Your escape room is a data-heist front.", "The Curator's after Aurora. — A friend.'"] },
      { id: "window", name: "window", x: 247, y: 11, w: 70, h: 50, look: () => "Linköping rooftops and the cathedral spire, gold in the afternoon sun." },
    ],
  },

  /* ---------------------------------------------------------- STREET --- */
  street: {
    name: "Downtown Linköping",
    width: STREET_W, paint: paintStreet, music: "street",
    objective: "Downtown — all walkable. Read the board, get cleared by the host, then bike across town to The Vault.",
    start: { x: 70, y: 122, dir: "right" },
    walk: { minX: 16, maxX: 744, minY: 104, maxY: 132, scaleMin: 1.2, scaleMax: 1.8 },
    onEnter: (G) => {
      if (!G.flag("streetIntro")) { G.setFlag("streetIntro"); G.cutscene([{ say: ["player", "Downtown — the hub of the night. The Vault's at the east end; the kiosk, cathedral and Ölbacken line the street."] }]); }
    },
    hint: (G) => {
      if (!G.flag("venueOpen")) return !G.flag("knowPin") ? "Read the noticeboard, then tell the host (east) you're Teamtailor." : "Tell the host (east end) your team name: Teamtailor.";
      if (!G.flag("bikedToVault")) return G.has("helmet") ? "Hop on the bikes to ride across to The Vault." : "Grab the helmet by the bikes, then ride to The Vault.";
      if (G.flag("needChoklad") && !G.has("choklad") && !G.flag("guardDistracted")) return "Grab a Cloetta bar at the kiosk, then bike back to The Vault.";
      return "Bikes → The Vault (east). Kiosk, cathedral and Ölbacken line the street too.";
    },
    barks: ["Smells like Friday.", "Race you to the door.", ["busker", "Spare a krona for a tune?"]],
    actors: [
      { id: "host", skin: "host", accessory: "bowtie", x: 706, y: 120, dir: "left", speechColor: "#e88aa0", name: "the host" },
      { id: "busker", skin: "busker", accessory: "beanie", x: 250, y: 118, dir: "front", speechColor: "#c89fff", name: "the busker" },
      { id: "vendor", skin: "bartend", accessory: "apron", x: 150, y: 118, dir: "right", speechColor: "#ffd27f", name: "the kiosk vendor" },
    ],
    objects: [
      { id: "office", name: "office door", x: 36, y: 44, w: 32, h: 38, walkTo: { x: 56, y: 122 }, defaultVerb: "use",
        look: () => "Back up to the Teamtailor office.",
        use: (G) => G.gotoRoom("office", { at: { x: 300, y: 122, dir: "left" } }) },
      { id: "kiosk", name: "the Cloetta kiosk", x: 172, y: 44, w: 52, h: 40, walkTo: { x: 198, y: 122 }, defaultVerb: "use",
        look: () => "A Cloetta kiosk — chocolate made right here in Linköping.",
        use: (G) => { if (G.has("choklad")) return "Got a bar already."; G.addItem("choklad"); sfx("coin"); return "The vendor tosses me a Cloetta bar. 'On the house — go rob that bank!'"; },
        talk: (G) => G.converse(vendorTree(G)) },
      { id: "busker", name: "the busker", x: 236, y: 92, w: 32, h: 42, walkTo: { x: 250, y: 122 }, defaultVerb: "talk",
        look: () => "A street busker in a green beanie, strumming for coins.",
        talk: (G) => G.converse(buskerTree(G)) },
      { id: "helmet", name: "bike helmet", x: 258, y: 78, w: 22, h: 18, walkTo: { x: 266, y: 122 }, defaultVerb: "pickup",
        visible: (G) => !G.flag("tookHelmet"),
        look: () => "A helmet on the rack by the bikes.",
        pickup: (G) => { G.addItem("helmet"); G.setFlag("tookHelmet"); return "Helmet on. Safety first — Teamtailor would approve."; } },
      { id: "bikes", name: "the bikes", x: 282, y: 90, w: 70, h: 28, walkTo: { x: 300, y: 122 }, defaultVerb: "use",
        look: (G) => G.flag("venueOpen") ? "Our rides to The Vault, across town." : "City bikes. We'll need them once we're cleared.",
        use: (G) => rideToVault(G) },
      { id: "cathedral", name: "cathedral square", x: 360, y: 44, w: 32, h: 38, walkTo: { x: 380, y: 122 }, defaultVerb: "use",
        look: () => "The path to the cathedral square. Worth a look.",
        use: (G) => G.gotoRoom("cathedral", { at: { x: 70, y: 122, dir: "right" } }) },
      { id: "olbacken", name: "Ölbacken", x: 500, y: 44, w: 32, h: 38, walkTo: { x: 520, y: 122 }, defaultVerb: "use",
        look: () => "Ölbacken — our AW spot. The crew's gathering already.",
        use: (G) => G.gotoRoom("pub", { at: { x: 60, y: 120, dir: "right" } }) },
      { id: "board", name: "noticeboard", x: 590, y: 50, w: 46, h: 30, walkTo: { x: 600, y: 122 }, defaultVerb: "look",
        look: (G) => { G.setFlag("knowPin"); return ["Tonight's bookings:", "'Teamtailor — 17:00 — door code 2013.'", "(The year we were founded. Cute.)"]; } },
      { id: "venue", name: "the booking booth", x: 660, y: 34, w: 90, h: 62, walkTo: { x: 700, y: 122 }, defaultVerb: "look",
        look: () => "The host's booking booth. The Vault itself is across town — we bike there.",
        use: (G) => G.flag("venueOpen") ? "We're cleared — grab the bikes and ride across town." : "I should talk to the host to get our booking first." },
      { id: "host", name: "the host", x: 690, y: 92, w: 36, h: 42, walkTo: { x: 686, y: 122 }, defaultVerb: "talk",
        look: () => "The escape-room Game Master, bow tie and clipboard.",
        talk: (G) => G.converse(hostTree(G)) },
    ],
  },

  /* ----------------------------------------------- CATHEDRAL SQUARE --- */
  cathedral: {
    name: "Cathedral Square",
    width: CATH_W, paint: paintCathedral, music: "street",
    objective: "A quiet branch — peek through the telescope, then back to the street.",
    start: { x: 70, y: 122, dir: "right" },
    walk: { minX: 20, maxX: CATH_W - 20, minY: 110, maxY: 130, scaleMin: 1.2, scaleMax: 1.6 },
    barks: ["Pretty, the old cathedral.", ["caroline", "Imagine the upkeep budget."], "Good acoustics out here."],
    hint: () => "Use the coin telescope, then head back to the street (left edge).",
    objects: [
      { id: "scope", name: "coin telescope", x: 288, y: 74, w: 32, h: 30, walkTo: { x: 300, y: 124 }, defaultVerb: "use",
        look: () => "A coin-op tourist telescope, aimed over the rooftops.",
        use: (G) => { if (G.flag("usedScope")) return "Same view: a tarp-covered drone on The Vault's roof. Shady."; G.setFlag("usedScope"); sfx("coin"); return ["Through the scope: The Vault's rooftop —", "a drone, tarped and waiting. The tip was right.", "Good to know what's coming."]; } },
      { id: "doors", name: "cathedral doors", x: 120, y: 46, w: 122, h: 34, look: () => "Vast oak doors, closed for the evening. And we've a heist to run." },
      { id: "bench", name: "a bench", x: 40, y: 96, w: 36, h: 14, walkTo: { x: 58, y: 124 }, look: () => "A worn bench. The pigeons hold the lease." },
      { id: "back", name: "back to the street", x: 0, y: 98, w: 18, h: 38, walkTo: { x: 26, y: 124 }, defaultVerb: "use",
        look: () => "Back down to the street.",
        use: (G) => G.gotoRoom("street", { at: { x: 380, y: 122, dir: "left" } }) },
    ],
  },

  /* ----------------------------------------------- THE BANK-HEIST ROOM -- */
  heist: {
    name: "The Vault — Heist Scenario",
    width: HEIST_W, paint: paintHeist, music: "escape",
    objective: "Beat the rigged room: get the loot, kill the alarm, open the vault.",
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
        id: "wayout", name: "way out to the street", x: 4, y: 40, w: 24, h: 56,
        walkTo: { x: 30, y: 124 }, defaultVerb: "use",
        look: () => "The door back out to the street — handy if I'm missing something.",
        use: (G) => G.gotoRoom("street", { at: { x: 700, y: 122, dir: "left" } }),
      },
      {
        id: "guard", name: "the guard", x: 446, y: 92, w: 34, h: 42,
        walkTo: { x: 432, y: 124 }, defaultVerb: "talk",
        visible: (G) => !G.flag("guardDistracted"),
        look: () => "A bank guard, arms crossed, planted in front of the alarm panel.",
        talk: (G) => { G.setFlag("needChoklad"); G.converse(guardTree(G)); },
        give: { choklad: (G) => { distractGuard(G); } },
        useWith: { choklad: (G) => { distractGuard(G); } },
      },
      {
        id: "safe", name: "the safe", x: 300, y: 30, w: 70, h: 64,
        walkTo: { x: 332, y: 124 }, defaultVerb: "use",
        look: () => "A four-digit vault safe.",
        use: (G) => {
          if (G.flag("safeOpen")) return G.flag("gotLoot") ? "Empty now." : "It's open — grab the loot!";
          if (!G.flag("cipherDone")) { sfx("error"); return "Four digits. I don't have the code yet."; }
          if (is(G, "caroline")) { G.setFlag("safeOpen"); G.flash(); return "Caroline keys in 4-8-7-3 like she's closing the month. CLUNK!"; }
          G.openKeypad("4873", () => { G.setFlag("safeOpen"); G.say("player", "CLUNK — the safe swings open!"); });
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
          if (!G.flag("guardDistracted")) { sfx("error"); G.setFlag("needChoklad"); return "The guard's planted right in front of it. He's got a sweet tooth — maybe the Cloetta kiosk on the street?"; }
          if (is(G, "per")) { G.flash(); G.setFlag("alarmOff"); return "Per reads the wiring like prod logs and kills it bare-handed."; }
          if (G.has("wirecut")) { G.openWires(3, "Faded sticker: 'on a Friday, snip BLUE'", () => { G.setFlag("alarmOff"); G.say("player", "Snip — the alarm dies with a sad beep."); }); return; }
          sfx("error"); return "Five wires. I'd want wire cutters — or Per.";
        },
        useWith: { wirecut: (G) => { if (G.flag("alarmOff")) return "Already dead."; if (!G.flag("guardDistracted")) { sfx("error"); return "Not with the guard watching."; } G.openWires(3, "Faded sticker: 'on a Friday, snip BLUE'", () => { G.setFlag("alarmOff"); G.say("player", "Snip. Alarm down."); }); } },
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

  /* ------------------------------------------- THE CONTROL ROOM (lair) -- */
  control: {
    name: "The Curator's Control Room",
    width: CONTROL_W, paint: paintControl, music: "escape",
    objective: "Cut the power, grab the evidence + Aurora drive, then confront The Curator.",
    start: { x: 30, y: 124, dir: "right" },
    walk: { minX: 14, maxX: CONTROL_W - 16, minY: 108, maxY: 132, scaleMin: 1.15, scaleMax: 1.6 },
    barks: [["per", "His whole rig is one unpatched box."], "Those are OUR dashboards on his wall.", "This guy bills it as 'team-building'."],
    actors: [
      { id: "curator", skin: "curator", accessory: "goggles", x: 198, y: 122, dir: "front", speechColor: "#ff6a6a", when: (G) => !G.flag("curatorFled") },
    ],
    hint: (G) => {
      if (!G.flag("lasersOff")) return (G.inParty("per") || G.has("mirror")) ? "Disable the laser grid — Per can spoof it, or use the mirror." : "Grab the mirror (far-left shelf) to beat the laser grid.";
      if (!G.flag("powerCut")) return "Throw the power lever to kill his upload.";
      if (!G.flag("tookPrototype")) return "Eject our Aurora drive from the dark server.";
      if (!G.flag("tookEvidence")) return "Grab the evidence folder off his desk.";
      if (!G.flag("curatorFled")) return "Confront The Curator now you've got the goods.";
      return "Chase him up the stairs to the roof (far right).";
    },
    objects: [
      { id: "mirror", name: "hand mirror", x: 34, y: 54, w: 24, h: 20, walkTo: { x: 50, y: 124 }, defaultVerb: "pickup",
        visible: (G) => !G.flag("tookMirror"),
        look: () => "A little mirror on a shelf. Reflective. Hmm.",
        pickup: (G) => { G.addItem("mirror"); G.setFlag("tookMirror"); return "Pocketed the mirror."; } },
      { id: "backvault", name: "back to the vault", x: 4, y: 44, w: 22, h: 52, walkTo: { x: 28, y: 124 }, defaultVerb: "use",
        look: () => "The stairwell back down to the vault room.",
        use: (G) => G.gotoRoom("heist", { at: { x: 600, y: 124, dir: "left" } }) },
      { id: "lasers", name: "laser grid", x: 296, y: 34, w: 128, h: 58, walkTo: { x: 296, y: 124 }, defaultVerb: "use",
        look: (G) => G.flag("lasersOff") ? "The sensors are dark." : "A red laser grid across the server bay.",
        use: (G) => {
          if (G.flag("lasersOff")) return "Already down.";
          if (is(G, "per")) { G.setFlag("lasersOff"); G.flash(); return "Per spoofs the sensor in seconds. Grid down."; }
          if (G.has("mirror")) { G.setFlag("lasersOff"); sfx("unlock"); return "I angle the mirror — the beam loops back into its own sensor. Off!"; }
          sfx("error"); return "Red lasers. I'd need Per — or something reflective.";
        },
        useWith: { mirror: (G) => { if (!G.flag("lasersOff")) { G.setFlag("lasersOff"); sfx("unlock"); return "The beam bounces back on itself — grid down!"; } return "Already down."; } } },
      { id: "lever", name: "power lever", x: 416, y: 54, w: 22, h: 40, walkTo: { x: 430, y: 124 }, defaultVerb: "use",
        look: (G) => G.flag("powerCut") ? "Thrown. The racks are dark." : "The main breaker for his server wall.",
        use: (G) => {
          if (G.flag("powerCut")) return "Already cut.";
          if (!G.flag("lasersOff")) { sfx("error"); return "Can't reach it through the lasers."; }
          G.setFlag("powerCut"); sfx("rumble"); return "I throw the breaker — the upload dies and the racks go black.";
        } },
      { id: "prototype", name: "Aurora drive", x: 462, y: 78, w: 26, h: 18, walkTo: { x: 474, y: 124 }, defaultVerb: "pickup",
        visible: (G) => !G.flag("tookPrototype"),
        look: () => "Our prototype, docked in his server.",
        pickup: (G) => { if (!G.flag("powerCut")) { sfx("error"); return "It's locked in while the rack's powered."; } G.addItem("prototype"); G.setFlag("tookPrototype"); return "Project Aurora — recovered."; } },
      { id: "evidence", name: "evidence folder", x: 200, y: 60, w: 30, h: 20, walkTo: { x: 208, y: 124 }, defaultVerb: "pickup",
        visible: (G) => !G.flag("tookEvidence"),
        look: () => "A folder on his desk, fat with other companies' secrets.",
        pickup: (G) => { G.addItem("evidence"); G.setFlag("tookEvidence"); return "Evidence — every company he's skimmed. He's finished."; } },
      { id: "curator", name: "The Curator", x: 182, y: 92, w: 36, h: 42, walkTo: { x: 170, y: 124 }, defaultVerb: "talk",
        visible: (G) => !G.flag("curatorFled"),
        look: () => "The Curator: red goggles, black coat, infinite smugness.",
        talk: (G) => G.converse(curatorTree(G)) },
      { id: "stairs", name: "stairs up", x: CONTROL_W - 46, y: 30, w: 46, h: 70, walkTo: { x: CONTROL_W - 30, y: 124 }, defaultVerb: "use",
        look: () => "A spiral stair up to the roof.",
        use: (G) => { if (!G.flag("curatorFled")) { sfx("error"); return "He'll only run up here once he's cornered — cut his operation first."; } return goRoof(G); } },
    ],
  },

  /* ----------------------------------------------------- THE ROOFTOP --- */
  roof: {
    name: "The Rooftop",
    width: ROOF_W, paint: paintRoof, music: "escape",
    objective: "Stop The Curator's drone and recover the master drive.",
    start: { x: 40, y: 122, dir: "right" },
    walk: { minX: 20, maxX: ROOF_W - 20, minY: 112, maxY: 128, scaleMin: 1.2, scaleMax: 1.5 },
    barks: ["Don't look down.", ["rikard", "Getting this on video — evidence!"], "Cold up here."],
    actors: [
      { id: "curator", skin: "curator", accessory: "goggles", x: 330, y: 122, dir: "left", speechColor: "#ff6a6a", when: (G) => !G.flag("curatorCaught") },
    ],
    hint: (G) => {
      if (!G.flag("tetherCut")) return (G.has("wirecut") || G.inParty("rikard") || G.inParty("per")) ? "Cut the drone's tether (wire cutters) — Rikard or Per can jam it instead." : "Reach the drone's tether — wire cutters would do it.";
      if (!G.flag("tookMaster")) return "Grab the master drive case that dropped onto the deck.";
      return "You've got it all — talk to The Curator.";
    },
    objects: [
      { id: "drone", name: "the getaway drone", x: 360, y: 38, w: 64, h: 62, walkTo: { x: 372, y: 124 }, defaultVerb: "use",
        look: (G) => G.flag("tetherCut") ? "The drone whined off empty — its cargo's on the deck." : "A heavy drone, a case of stolen drives on a tether.",
        use: (G) => {
          if (G.flag("tetherCut")) return "Nothing left to cut.";
          if (G.has("wirecut")) { G.setFlag("tetherCut"); G.setFlag("droneDown"); sfx("door"); return "I snip the tether — the case thuds onto the deck; the drone whines off empty."; }
          if (is(G, "rikard")) { G.setFlag("tetherCut"); G.setFlag("droneDown"); G.flash(); return "Rikard jams the drone's link — it lurches and drops the case!"; }
          if (is(G, "per")) { G.setFlag("tetherCut"); G.setFlag("droneDown"); G.flash(); return "Per hijacks the drone's channel and makes it let go."; }
          sfx("error"); return "Too high to grab. Wire cutters on the tether — or jam its signal.";
        },
        useWith: { wirecut: (G) => { if (!G.flag("tetherCut")) { G.setFlag("tetherCut"); G.setFlag("droneDown"); sfx("door"); return "Snip — the case drops!"; } return "Already cut."; } } },
      { id: "master", name: "master drive case", x: 380, y: 112, w: 26, h: 18, walkTo: { x: 388, y: 124 }, defaultVerb: "pickup",
        visible: (G) => G.flag("tetherCut") && !G.flag("tookMaster"),
        look: () => "The case the drone was hauling — his master drive.",
        pickup: (G) => { G.addItem("master"); G.setFlag("tookMaster"); catchCurator(G); } },
      { id: "curator", name: "The Curator", x: 326, y: 92, w: 36, h: 42, walkTo: { x: 314, y: 124 }, defaultVerb: "talk",
        visible: (G) => !G.flag("curatorCaught"),
        look: () => "The Curator, eyeing his drone and the long drop.",
        talk: (G) => G.converse({
          speaker: "curator",
          greeting: [["curator", G.flag("tetherCut") ? "No! That drive was my retirement!" : "Stay back! That drone's my ticket out!"]],
          nodes: { root: { options: [
            { text: "Nowhere left to run.", say: [["curator", "There is always a contingency. ...usually."]] },
            { text: "We've got your evidence.", say: [["curator", "That folder was insured. Probably. Possibly. ...drat."]] },
          ], leaveText: "(keep him cornered)", leaveSay: [["player", "Easy. The police are already on their way up."]] } },
        }) },
      { id: "door", name: "the way down", x: 8, y: 70, w: 26, h: 28, walkTo: { x: 30, y: 124 }, defaultVerb: "use",
        look: () => "The stairwell back down — and on to AW, if we ever finish up here.",
        use: (G) => G.flag("tookMaster") ? toPub(G) : "Not without that master drive." },
    ],
  },

  /* --------------------------------------------------- ÖLBACKEN (AW) --- */
  pub: {
    name: "Ölbacken",
    width: PUB_W, paint: paintPub, music: "bar",
    objective: (G) => G.flag("curatorCaught") ? "You earned it: open a tab, tap the keg, start the music, eat — then home." : "Just an early peek — the job's not done. Back to The Vault when you're ready.",
    start: { x: 60, y: 120, dir: "right" },
    walk: { minX: 30, maxX: 540, minY: 112, maxY: 128, scaleMin: 1.25, scaleMax: 1.55 },
    actors: [
      { id: "bartend", skin: "bartend", accessory: "apron", x: 120, y: 118, dir: "front", speechColor: "#7fe0c0" },
    ],
    onEnter: (G) => {
      // the teammates who weren't on the squad are already here — good company
      (G.bench || []).forEach((m, i) => G.spawnActor({ id: m.id, skin: m.skin, x: 214 + i * 44, y: 122, dir: "front" }));
      if (G.flag("curatorCaught")) {
        if (!G.flag("pubWin")) {
          G.setFlag("pubWin");
          G.cutscene([
            { say: ["player", "Curator in cuffs, Aurora safe, the crew already here — we made AW after all!"] },
            { say: ["player", "Open a tab, tap that keg, and get the band going."] },
          ]);
        }
      } else if (!G.flag("pubPeek")) {
        G.setFlag("pubPeek");
        G.cutscene([{ say: ["bartend", "The Linköping lot? Seats are saved. Come back when the job's done — first round's waiting."] }]);
      }
    },
    hint: (G) => {
      if (!G.flag("curatorCaught")) return "The job's not done — take the door (far right) back to the street and The Vault.";
      if (!G.flag("tabOpen")) return "Use the company card on the tab board (or hand it to the bartender).";
      if (!G.flag("kegTapped")) return "Tap the keg on the bar.";
      if (!G.flag("musicOn")) return "Get a beer from the keg, then give it to the band for the live music.";
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
        talk: (G) => G.converse(bartenderTree(G)),
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
        talk: (G) => G.converse(bandTree(G)),
        give: { beer: (G) => { if (G.flag("musicOn")) return "They've already got drinks."; bandGive(G); } },
        useWith: { beer: (G) => { if (G.flag("musicOn")) return "They're sorted."; bandGive(G); } },
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
        talk: (G) => G.converse(crewTree(G)),
      },
      {
        id: "chug", name: "the chug contest", x: 374, y: 96, w: 42, h: 26,
        walkTo: { x: 392, y: 120 }, defaultVerb: "use",
        look: (G) => G.flag("chugged") ? "An empty glass — a champion's trophy." : "A teammate slides over a full glass: 'Chug contest?'",
        use: (G) => {
          if (!G.flag("tabOpen")) { sfx("error"); return "Open the tab first — let's keep it civilised."; }
          if (G.flag("chugged")) return "I've defended my title enough for one night.";
          G.openChug(() => { G.setFlag("chugged"); G.say("player", (G.chugTime < 2.4 ? "DEMOLISHED it — new record!" : "Down it goes!") + " Skål!"); });
        },
      },
      {
        id: "home", name: "the door out", x: 516, y: 36, w: 40, h: 84,
        walkTo: { x: 520, y: 120 }, defaultVerb: "use",
        look: (G) => G.flag("curatorCaught") ? "The way home — bikes through the night." : "Back out to the street (the job's not finished).",
        use: (G) => {
          if (!G.flag("curatorCaught")) return G.gotoRoom("street", { at: { x: 520, y: 122, dir: "left" } });
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
  G.setFlag("tabOpen"); G.removeItem("card"); sfx("coin");
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

/* ======================================================= dialogue trees == */
// Branching, looping conversations (see G.converse in the engine).

function robinTree(G) {
  const done = G.has("keycard") || G.flag("gaveFika");
  return {
    speaker: "robin",
    greeting: done
      ? [["robin", "You're a lifesaver. Go get 'em — bring me something stronger than coffee later."]]
      : [["robin", "No fika, no keycard. That's the deal. Coffee AND a bun, tack."]],
    nodes: { root: { options: [
      { when: () => !done, text: "What exactly do you want?", say: [["robin", "A proper fika. Brew a coffee at the machine, grab the kanelbulle off the table, hand me both."]] },
      { text: "Any news before we head out?", say: [["robin", "That monitor pinged an anonymous tip: our escape room's a data-heist front. 'The Curator' is after Aurora. Watch yourselves."]] },
      { text: "You look wrecked.", say: [["robin", "Third night shift this week. The bug won't fix itself... the coffee helps, mind."]] },
      { when: () => done, text: "We're off — skål later?", end: true, say: [["robin", "Save me a seat at Ölbacken. Go!"]] },
    ], leaveText: "Back in a bit.", leaveSay: [["robin", "Mm. Coffee."]] } },
  };
}

function hostTree(G) {
  const open = G.flag("venueOpen");
  return {
    speaker: "host",
    greeting: open ? [["host", "Back already? Your room's across town and waiting — mind the clock!"]]
      : !G.flag("knowPin") ? [["host", "Evening! Which team are you? Tonight's bookings are on the board down the street."]]
        : [["host", "Evening! And which team do we have here?"]],
    nodes: { root: { options: [
      { when: () => !open && G.flag("knowPin"), text: "We're Teamtailor.", end: true,
        do: (g) => { g.setFlag("venueOpen"); },
        say: [["host", "You're in — 17:00 slot! The Vault's across town: grab a bike from the rack, helmet on. Safety first!"]] },
      { when: () => !open && G.flag("knowPin"), text: "...the bank robbers?", say: [["host", "Aren't we all tonight. The booking name, please."]] },
      { when: () => !open && !G.flag("knowPin"), text: "Where are the bookings again?", say: [["host", "The noticeboard, just down the street. Have a read and pop back."]] },
      { text: "Tell me about the room.", say: [["host", "'The Vault' — our flagship. Ninety real minutes, real locks. Most teams donate more than they bargained for..."]] },
      { text: "Who owns this place?", say: [["host", "The Curator. Keeps to himself, pays cash, runs it from some back room. I just take bookings."]] },
      { when: () => open, text: "We're heading over.", end: true, say: [["host", "Bikes are by the rack. Skål when you're out — IF you get out!"]] },
    ], leaveText: "Later.", leaveSay: [["host", "Mind the clock!"]] } },
  };
}

function buskerTree(G) {
  return {
    speaker: "busker",
    greeting: [["busker", "Spare a krona for a tune?"]],
    nodes: { root: { options: [
      { text: "Heard anything useful?", say: () => [["busker", G.flag("knowPin") ? "Tonight's codes? On the board, ja. I busk to 'em nightly." : "Door codes are posted on the board down the street. Always are."]] },
      { text: "Play us something.", say: [["busker", "After your heist, friend. I only jam for winners. There's a proper band at Ölbacken tonight, mind."]] },
      { text: "Nice beanie.", say: [["busker", "Hand-knitted. Keeps the riffs warm."]] },
    ], leaveText: "Keep strumming.", leaveSay: [["busker", "Skål!"]] } },
  };
}

function vendorTree(G) {
  return {
    speaker: "vendor",
    greeting: [["vendor", "Cloetta? Made right here in Linköping. Best in Sweden, no debate."]],
    nodes: { root: { options: [
      { when: () => !G.has("choklad"), text: "Can I grab a bar?", do: (g) => { g.addItem("choklad"); sfx("coin"); }, say: [["vendor", "On the house — go rob that bank!"]] },
      { when: () => G.has("choklad"), text: "Thanks for the bar.", say: [["vendor", "Save a square for the guard — sweet tooth, that one. Works every time."]] },
      { text: "What's good?", say: [["vendor", "The dark chocolate solves most problems. Bribery very much included."]] },
    ], leaveText: "See you.", leaveSay: [["vendor", "Hej då!"]] } },
  };
}

function guardTree(G) {
  const distracted = G.flag("guardDistracted");
  return {
    speaker: "guard",
    greeting: distracted ? [["guard", "...mmf. Good chocolate. Carry on."]]
      : [["guard", "Nothing gets past me. Especially not that alarm."]],
    nodes: { root: { options: [
      { when: () => G.has("choklad") && !distracted, text: "(offer the Cloetta bar)", do: (g) => { g.endConverse(); distractGuard(g); } },
      { when: () => !distracted, text: "What are you guarding?", say: [["guard", "That alarm panel. Touch it and the whole block lights up. So don't."]] },
      { when: () => !distracted, text: "Long shift?", say: [["guard", "Endless. ...is that chocolate I smell? No? Pity. A man gets peckish guarding a vault."]] },
      { when: () => distracted, text: "Enjoying that?", say: [["guard", "Don't tell the manager. Mmf."]] },
    ], leaveText: "Carry on.", leaveSay: [["guard", "Move along."]] } },
  };
}

function curatorTree(G) {
  const ready = () => G.flag("powerCut") && G.flag("tookEvidence") && G.flag("tookPrototype");
  return {
    speaker: "curator",
    greeting: [["curator", "Welcome to my collection. Every 'team-building' booking donates its secrets — willingly!"]],
    nodes: { root: { options: [
      { when: ready, text: "It's over, Curator. Hands up.", do: (g) => { g.endConverse(); triggerCuratorFlee(g); } },
      { text: "Why steal data?", say: [["curator", "Information is the only currency that matters. Yours was simply... unguarded."]] },
      { text: "Those are OUR dashboards.", say: [["curator", "And your roadmap. And your prototype. Aurora uploads as we speak. Do enjoy the room."]] },
      { when: () => !ready(), text: "Give it up.", say: [["curator", "Cut my power and lift my ledger first — then we'll talk. You won't."]] },
      { when: () => !ready(), text: "(get back to work)", end: true, say: [["player", "Keep him talking — I'll dismantle his operation first."]] },
    ], leaveText: "(step away)", leaveSay: [["curator", "Run along."]] } },
  };
}

function bartenderTree(G) {
  const open = G.flag("tabOpen");
  return {
    speaker: "bartend",
    greeting: open ? [["bartend", "Tab's running — keg, kitchen and the band are all yours. Skål!"]]
      : [["bartend", "Welcome to Ölbacken! Open a tab — hand me a card and the night's yours."]],
    nodes: { root: { options: [
      { when: () => G.has("card") && !open, text: "Open a tab. (company card)", do: (g) => { g.endConverse(); openTab(g); g.say("bartend", "On the company? Lovely. Keg, kitchen and stage — all yours."); } },
      { text: "What's on tap?", say: [["bartend", "Your very own keg, plus the usual taps. That keg won't pour itself, mind."]] },
      { text: "Recommendations?", say: [["bartend", "Burgers from the kitchen, and tip the band a beer — they'll play all night."]] },
    ], leaveText: "Cheers.", leaveSay: [["bartend", "Skål!"]] } },
  };
}

function bandTree(G) {
  const on = G.flag("musicOn");
  return {
    speaker: "band",
    greeting: on ? [["band", "Tack Linköping! This one's for the bank robbers!"]]
      : [["band", "Buy us a beer and we'll play all night."]],
    nodes: { root: { options: [
      { when: () => G.has("beer") && !on, text: "Here — a round for the band.", do: (g) => { g.endConverse(); bandGive(g); } },
      { text: "What do you play?", say: [["band", "Loud, fast and a little bit Swedish. You'll like it."]] },
      { when: () => on, text: "Sounds great!", say: [["band", "Stick around — we take requests after the chug contest!"]] },
    ], leaveText: "Rock on.", leaveSay: [["band", "Skål!"]] } },
  };
}

function crewTree(G) {
  const present = (id) => G.actors.some((a) => a.id === id) || G.party.some((p) => p.id === id);
  const options = CREW_LINES.filter(([id]) => present(id)).map(([id, line]) => ({
    text: nameOf(id) + " — how'd it go in there?",
    say: [[id, line]],
  }));
  options.push({ text: "Skål, everyone!", do: () => sfx("band"), say: [["player", "Skål! To the Linköping crew — and to never trusting an escape room again!"]] });
  return { speaker: "player", greeting: [["player", "So — war stories?"]], nodes: { root: { options, leaveText: "Back to it.", leaveSay: [["player", "Haha — another round!"]] } } };
}

/* talk-to-teammate: banter + a contextual hint + the objective, MM-style.
   Picked up by the engine via content.mateDialog (Talk-to verb on a squadmate). */
const MATE_BANTER = {
  jonas: ["Platform's got your back — point me at the heavy stuff.", "If it's locked and big, that's my department."],
  anders: ["I'll crank whatever needs cranking.", "Two platform devs, one heist. We're golden."],
  emil: ["Never lost an escape room. Not starting tonight.", "Hand me a cipher and watch me grin."],
  rikard: ["Phone's charged — torch, camera, the works.", "Filming this for the retro. Smile."],
  oskar: ["Stuck? Literally my job. Press H any time.", "I autocomplete your next move."],
  caroline: ["Show me a safe and I'll close the month on it.", "The loot's already balanced, by the way."],
  per: ["Any alarm in here is just one unpatched box.", "Lasers, wires — all of it is bad security."],
};
const MATE_GREETING = {
  jonas: "What's the plan, chef?", anders: "Need the muscle?", emil: "Talk to me.",
  rikard: "You rang?", oskar: "Need a nudge?", caroline: "Yes? The books are fine.", per: "Sup. Threat model?",
};
export function mateDialog(G, mate) {
  const room = G.rooms[G.state.room];
  const hint = () => (room && room.hint ? room.hint(G) : "We're in good shape — onward to AW.");
  const objective = () => { const o = room && (typeof room.objective === "function" ? room.objective(G) : room.objective); return o || "Stick together and have a good night."; };
  const banter = MATE_BANTER[mate.id] || ["Right behind you."];
  return {
    speaker: mate.id,
    greeting: [[mate.id, MATE_GREETING[mate.id] || "What's up?"]],
    nodes: { root: { prompt: "Ask " + mate.name + ":", options: [
      { text: "What should we do now?", say: () => [[mate.id, hint()]] },
      { text: "Remind me of the objective.", say: () => [[mate.id, objective()]] },
      { text: "How are you holding up?", say: () => [[mate.id, banter[(Math.random() * banter.length) | 0]]] },
      { text: "Take over — you lead.", end: true, do: (g) => g.switchTo(mate.id), say: [[mate.id, "On it. Follow me."]] },
    ], leaveText: "Never mind.", leaveSay: [[mate.id, "Shout if you need me."]] } },
  };
}

// guard: chocolate bribe clears the alarm (shared by talk/give/use)
function distractGuard(G) {
  if (G.flag("guardDistracted")) return;
  G.removeItem("choklad"); G.setFlag("guardDistracted"); sfx("coin");
  const g = G.actors.find((a) => a.id === "guard"); if (g) g.target = { x: 330, y: 124 };
  G.say("guard", "...is that Cloetta? Don't mind if I do.");
  G.say("player", "The guard pockets the chocolate and ambles off — the alarm's clear!");
}

// band: a beer starts the live music (shared by talk/give/use)
function bandGive(G) {
  if (G.flag("musicOn")) return;
  G.setFlag("musicOn"); G.removeItem("beer"); sfx("band");
  G.say("band", "TACK! Linköping, are you ready?!");
  G.say("player", "I hand a beer to the guitarist — the set kicks off!");
}

// control room: confront The Curator once his operation's dismantled
function triggerCuratorFlee(G) {
  G.setFlag("curatorFled");
  G.cutscene([
    { say: ["curator", "NO! My beautiful data — years of harvesting!"] },
    { say: ["curator", "Stopped by a PRODUCT team? I'll be gone before the police— the ROOF!"] },
    { do: (g) => { g.actors = g.actors.filter((a) => a.id !== "curator"); } },
    { say: ["player", "He's bolting for the roof. After him!"] },
  ]);
}

// fika puzzle: hand over coffee + bun, then Robin gives the keycard
function finishFika(G, who, partial) {
  if (G.flag("gaveCoffee") && G.flag("gaveBun")) {
    G.setFlag("gaveFika"); G.addItem("keycard");
    G.say(who, "Now THAT'S a fika. Here — the keycard. Go!");
    return "I hand over a proper fika.";
  }
  G.say(who, partial);
  return null;
}
function leaveOffice(G) {
  if (!G.flag("officeUnlocked")) { G.setFlag("officeUnlocked"); sfx("door"); }
  G.gotoRoom("street", { at: { x: 70, y: 122, dir: "right" } });
}
// the cross-town leg is the BIKE MINI-GAME (helmet required); later trips are instant
function rideToVault(G) {
  if (!G.flag("venueOpen")) return "Let's get cleared by the host first.";
  if (G.flag("bikedToVault")) return G.gotoRoom("heist", { at: { x: 40, y: 124, dir: "right" } });
  if (!G.has("helmet")) { sfx("error"); return "Not without a helmet — grab one off the rack. Safety first."; }
  G.startBike({ night: false, then: () => { G.setFlag("bikedToVault"); G.gotoRoom("heist", { at: { x: 40, y: 124, dir: "right" } }); } });
}
function escapeHeist(G) {
  G.vaultClock = Math.round(G.escapeLeft());   // freeze the escape clock for the ending
  G.setFlag("escaped");
  G.cutscene([
    { sfx: "rumble" },
    { say: ["player", "The vault grinds open — but it's no exit. It's a stairwell down into a control room..."] },
    { say: ["player", "Screens everywhere, our data scrolling past. So the tip was real. Let's bust this."] },
    { wait: 500 }, { room: "control" },
  ]);
}
function goRoof(G) {
  G.cutscene([{ say: ["player", "Up the stairs — don't let him reach that drone!"] }, { wait: 300 }, { room: "roof" }]);
}
function catchCurator(G) {
  G.setFlag("curatorCaught");
  G.cutscene([
    { say: ["curator", "This isn't over — unhand me! I have a LOYALTY programme!"] },
    { do: (g) => { g.actors = g.actors.filter((a) => a.id !== "curator"); } },
    { say: ["player", "Rikard's footage already pinged the police. They'll take it from here."] },
    { say: ["player", "Scheme foiled, data recovered. Now — we have EARNED that AW."] },
    { card: { draw: (ctx, t) => paintBikeCard(ctx, t, true), lines: ["Curator caught, secrets safe —", "off to Ölbacken at last."], wait: 3200 } },
    { wait: 200 }, { room: "pub" },
  ]);
}
function toPub(G) {
  G.cutscene([{ card: { draw: (ctx, t) => paintBikeCard(ctx, t, true), lines: ["Off to Ölbacken at last."], wait: 2400 } }, { wait: 200 }, { room: "pub" }]);
}
function goHome(G) {
  // the closing leg is the night BIKE MINI-GAME, then the ending
  G.startBike({ night: true, then: () => g_win(G) });
}
function g_win(G) {
  G.win({
    title: "GOD NATT, LINKÖPING",
    lines: [
      "We foiled The Curator, got Aurora back,",
      "tapped a keg and caught the live band —",
      "good company at Ölbacken till closing.",
      "Then we biked home.",
    ],
    replay: true,
  });
}

export const onWin = null;
