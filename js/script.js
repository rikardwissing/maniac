// script.js — the actual adventure: items, rooms, hotspots, puzzle logic,
// dialogue and cutscenes. This is the "content"; engine.js is the "framework".
import { paintOffice, paintStreet, paintEscape, paintBar } from "./art.js";
import { sfx } from "./audio.js";

/* ------------------------------------------------------------- items ---- */
export const items = {
  mug:     { name: "Coffee mug", look: () => "An empty mug: 'World's Okayest Recruiter'." },
  coffee:  { name: "Mug of coffee", look: () => "Hot, black, and dangerous. Pure Kim-fuel." },
  keycard: { name: "Keycard", look: () => "My Teamtailor access card. Opens the front door." },
  note:    {
    name: "Sticky note", defaultVerb: "look",
    look: (G) => { G.setFlag("readNote"); return [
      "It reads:",
      "'AW @ 17:00. Vault code is the",
      "year it all began. - S'",
      "...1987. The year of the Mansion.",
    ]; },
  },
  bun:     { name: "Kanelbulle", look: () => "A Swedish cinnamon bun. Smells heavenly." },
  helmet:  { name: "Bike helmet", look: () => "A sturdy helmet. Safety first, always." },
  key:     { name: "Golden key", look: () => "A heavy golden key. The vault, surely." },
};

/* ============================================================= ROOMS ==== */
export const rooms = {

  /* ---------------------------------------------------------- OFFICE --- */
  office: {
    name: "Teamtailor Linköping — HQ",
    paint: paintOffice,
    music: "office",
    start: { x: 78, y: 124, dir: "right" },
    walk: { minX: 14, maxX: 300, minY: 104, maxY: 132, scaleMin: 1.25, scaleMax: 1.9 },
    onEnter: (G) => {
      if (!G.flag("introDone")) {
        G.cutscene([
          { say: ["player", "Friday in Linköping. The crew booked an escape room — and AW after."] },
          { say: ["player", "First problem: escaping the office. Kim guards the door... and the keycard."] },
          { do: (g) => g.setFlag("introDone") },
        ]);
      }
    },
    actors: [
      { id: "kim", skin: "kim", x: 216, y: 126, dir: "left" },
    ],
    objects: [
      {
        id: "door", name: "front door", x: 4, y: 38, w: 46, h: 60,
        walkTo: { x: 58, y: 120 }, defaultVerb: "open",
        look: (G) => G.flag("officeUnlocked")
          ? "The exit. Light's green — freedom awaits."
          : "The exit. A badge reader guards it, glowing an angry red.",
        open: (G) => {
          if (G.flag("officeUnlocked")) return leaveOffice(G);
          sfx("error");
          return "It's badge-locked. I need to swipe a keycard.";
        },
        useWith: {
          keycard: (G) => {
            if (G.flag("officeUnlocked")) return "Already unlocked.";
            G.setFlag("officeUnlocked"); sfx("unlock");
            return leaveOffice(G);
          },
        },
      },
      {
        id: "mug", name: "coffee mug", x: 294, y: 62, w: 20, h: 20,
        walkTo: { x: 280, y: 118 }, defaultVerb: "pickup",
        visible: (G) => !G.flag("tookMug"),
        look: () => "An empty mug on the counter.",
        pickup: (G) => { G.addItem("mug"); G.setFlag("tookMug"); return "An empty mug. Step one of any rescue mission."; },
      },
      {
        id: "machine", name: "coffee machine", x: 240, y: 48, w: 30, h: 48,
        walkTo: { x: 250, y: 118 }, defaultVerb: "look",
        look: () => "A temperamental espresso machine. The lifeblood of HQ.",
        use: (G) => "I should put a mug under it first.",
        useWith: {
          mug: (G) => {
            if (!G.has("mug")) return "I need the mug first.";
            G.removeItem("mug"); G.addItem("coffee");
            G.setFlag("coffeeOn"); sfx("coin");
            return "Grind, hiss, drip... one emergency espresso, brewed.";
          },
        },
      },
      {
        id: "bun", name: "kanelbulle", x: 82, y: 66, w: 24, h: 22,
        walkTo: { x: 92, y: 120 }, defaultVerb: "pickup",
        visible: (G) => !G.flag("tookBun"),
        look: () => "A fresh kanelbulle. Fika is sacred — and pocketable.",
        pickup: (G) => { G.addItem("bun"); G.setFlag("tookBun"); return "Never go adventuring without a cinnamon bun."; },
      },
      {
        id: "note", name: "sticky note", x: 148, y: 48, w: 16, h: 13,
        walkTo: { x: 150, y: 118 }, defaultVerb: "pickup",
        visible: (G) => !G.flag("tookNote"),
        look: () => "Tiny handwriting on a sticky note. I should grab it and read it.",
        pickup: (G) => { G.addItem("note"); G.setFlag("tookNote"); return "A sticky note. Looks important — I'll read it."; },
      },
      {
        id: "monitor", name: "the ATS", x: 136, y: 50, w: 44, h: 30,
        walkTo: { x: 150, y: 120 },
        look: () => "The Teamtailor ATS. 47 candidates overnight. The pipeline never sleeps.",
        use: () => "Inbox zero can wait. AfterWork cannot.",
      },
      {
        id: "window", name: "window", x: 232, y: 12, w: 76, h: 54,
        look: () => "Linköping rooftops and the cathedral spire. Somewhere out there: our escape room.",
      },
      {
        id: "plant", name: "office plant", x: 296, y: 108, w: 22, h: 22,
        look: () => "A resilient office plant. It has survived three reorgs.",
        talk: () => "It's the best listener on the team, honestly.",
      },
      {
        id: "kim", name: "Kim", x: 200, y: 96, w: 32, h: 42,
        walkTo: { x: 188, y: 124 }, defaultVerb: "talk",
        look: () => "Kim. Powered entirely by espresso. Currently running on empty.",
        talk: (G) => {
          if (G.has("keycard") || G.flag("gaveCoffee")) {
            G.say("kim", "Go! Have fun. Bring me something stronger than coffee.");
            return;
          }
          G.say("kim", "No coffee, no keycard. House rules.");
          G.choose("Say to Kim:", [
            { text: "Where's the keycard?", fn: (g) => g.say("kim", "Right here in my pocket. Trade you — for caffeine.") },
            { text: "Rough morning?", fn: (g) => g.say("kim", "I dreamed in spreadsheets. Pivot tables. Help me.") },
            { text: "There's a coffee machine right there...", fn: (g) => { g.say("kim", "Then prove it. Black. No sugar. Chop chop."); } },
            { text: "(step away)", fn: () => {} },
          ]);
        },
        give: {
          coffee: (G) => {
            G.removeItem("coffee"); G.addItem("keycard"); G.setFlag("gaveCoffee");
            G.say("kim", "Aaah. Bless you. Here — the keycard. Now GO, before I assign you a ticket.");
            return "I hand over the espresso.";
          },
          bun: (G) => { G.say("kim", "A bun? Adorable. But I run on COFFEE. Black. Now."); return "Kim eyes the bun, then the coffee machine."; },
        },
      },
    ],
  },

  /* ---------------------------------------------------------- STREET --- */
  street: {
    name: "Outside HQ — Linköping",
    paint: paintStreet,
    music: "street",
    start: { x: 70, y: 120, dir: "right" },
    walk: { minX: 16, maxX: 300, minY: 104, maxY: 132, scaleMin: 1.25, scaleMax: 1.9 },
    onEnter: (G) => {
      if (!G.flag("streetIntro")) {
        G.setFlag("streetIntro");
        G.cutscene([
          { say: ["player", "Sunshine, cobblestones, the cathedral. Now — to the escape room."] },
          { say: ["player", "We bike everywhere here. But not without a helmet."] },
        ]);
      }
    },
    objects: [
      {
        id: "helmet", name: "bike helmet", x: 186, y: 56, w: 22, h: 22,
        walkTo: { x: 190, y: 120 }, defaultVerb: "pickup",
        visible: (G) => !G.flag("tookHelmet"),
        look: () => "A helmet hanging on a hook.",
        pickup: (G) => { G.addItem("helmet"); G.setFlag("tookHelmet"); return "Safety first. Teamtailor would approve."; },
      },
      {
        id: "bikes", name: "the bikes", x: 210, y: 66, w: 98, h: 34,
        walkTo: { x: 250, y: 122 }, defaultVerb: "use",
        look: () => "A rack of trusty city bikes. One has a jaunty teal frame.",
        use: (G) => {
          if (!G.has("helmet")) { sfx("error"); return "Not without a helmet. It's basically a company value."; }
          rideToEscape(G);
        },
        useWith: { helmet: (G) => { rideToEscape(G); } },
      },
      {
        id: "facade", name: "the HQ entrance", x: 40, y: 48, w: 60, h: 28,
        look: () => "Teamtailor HQ. The badge light's green now — we really did escape.",
      },
      {
        id: "cathedral", name: "the cathedral", x: 148, y: 8, w: 30, h: 54,
        look: () => "Linköping Cathedral. Older than recruiting. Possibly older than coffee.",
      },
      {
        id: "busstop", name: "the bus stop", x: 282, y: 54, w: 18, h: 44,
        look: () => "The bus to town. We're cycling, though — faster, and the sun's out.",
        use: () => "We've got bikes. Pedal power.",
      },
    ],
  },

  /* ------------------------------------------------------ ESCAPE ROOM -- */
  escape: {
    name: "The Escape Room",
    paint: paintEscape,
    music: "escape",
    start: { x: 56, y: 124, dir: "right" },
    walk: { minX: 18, maxX: 244, minY: 108, maxY: 132, scaleMin: 1.2, scaleMax: 1.8 },
    onEnter: (G) => {
      if (!G.flag("escapeIntro")) {
        G.setFlag("escapeIntro");
        G.cutscene([
          { say: ["player", "Cozy. A locked vault over there — our way to AW."] },
          { say: ["player", "...guarded by a giant purple Bug. Of course."] },
          { face: ["bug", "left"] },
          { say: ["bug", "FRESH RECRUITS! I mean — welcome. FEED ME FIKA."] },
        ]);
      }
    },
    actors: [
      { id: "bug", kind: "bug", x: 236, y: 120, dir: "front", speechColor: "#d062b0",
        when: (G) => !G.flag("bugGone") },
    ],
    objects: [
      {
        id: "painting", name: "creepy painting", x: 130, y: 22, w: 44, h: 40,
        walkTo: { x: 150, y: 122 }, defaultVerb: "look",
        visible: (G) => !G.flag("paintingMoved"),
        look: () => "A portrait of... a purple tentacle. It seems to follow me. Is it loose at the edge?",
        pull: (G) => movePainting(G),
        push: (G) => movePainting(G),
        use: (G) => movePainting(G),
      },
      {
        id: "safe", name: "wall safe", x: 130, y: 26, w: 32, h: 32,
        walkTo: { x: 150, y: 122 }, defaultVerb: "use",
        visible: (G) => G.flag("paintingMoved"),
        look: (G) => G.flag("safeOpen") ? "The safe stands open." : "A keypad safe. Four digits.",
        use: (G) => {
          if (G.flag("safeOpen")) return "It's already open.";
          G.choose(G.flag("readNote") ? "Enter the code (S's note said 'the year it all began'):"
                                      : "Enter a four-digit code:", [
            { text: "1 9 8 7", fn: (g) => { g.setFlag("safeOpen"); sfx("unlock"); g.say("player", "Clunk! The note was right. 1987 it is."); } },
            { text: "2 0 1 3", fn: (g) => { sfx("error"); g.say("player", "Buzz. Nope. (That's when Teamtailor began, but not what the note meant.)"); } },
            { text: "0 0 0 0", fn: (g) => { sfx("error"); g.say("player", "Buzz. Worth a try."); } },
            { text: "(step away)", fn: () => {} },
          ]);
        },
      },
      {
        id: "key", name: "golden key", x: 138, y: 32, w: 18, h: 18,
        walkTo: { x: 150, y: 122 }, defaultVerb: "pickup",
        visible: (G) => G.flag("safeOpen") && !G.flag("tookKey"),
        look: () => "A golden key, gleaming in the safe.",
        pickup: (G) => { G.addItem("key"); G.setFlag("tookKey"); return "A heavy golden key. Now, that vault..."; },
      },
      {
        id: "bookshelf", name: "bookshelf", x: 8, y: 18, w: 60, h: 80,
        walkTo: { x: 40, y: 124 },
        look: () => "Dusty tomes. One cracked spine reads '1987 — A Maniac Year'. Noted.",
        pull: () => "I tug a book, expecting a secret passage. Just dust. Worth a shot.",
      },
      {
        id: "terminal", name: "old terminal", x: 70, y: 96, w: 26, h: 16,
        look: () => "A beige terminal humming in the corner. It boots to a 'MANIAC MANSION' title. 1987. Naturally.",
        use: () => "It only plays one game, and we're already in it.",
      },
      {
        id: "bug", name: "the Bug", x: 218, y: 92, w: 38, h: 44,
        walkTo: { x: 210, y: 124 }, defaultVerb: "talk",
        visible: (G) => !G.flag("bugGone"),
        look: () => "A purple tentacle the size of a fridge. Two eyes on stalks. Classic.",
        talk: (G) => {
          G.say("bug", "FEED ME. I crave... FIKA.");
          G.choose("Say to the Bug:", [
            { text: "What ARE you?", fn: (g) => g.say("bug", "I am The Bug. I live in your backlog. Also, I am STARVING.") },
            { text: "Could you move, please?", fn: (g) => g.say("bug", "Not until I've had my fika. House rules. Everyone has house rules.") },
            { text: "Want a cinnamon bun?", fn: (g) => g.say("bug", "...is that a KANELBULLE I smell? GIVE. IT. TO. ME.") },
            { text: "(back away slowly)", fn: () => {} },
          ]);
        },
        give: {
          bun: (G) => {
            G.removeItem("bun");
            G.cutscene([
              { say: ["bug", "KANELBULLE! At LAST. You may pass, kind recruiter."] },
              { do: (g) => { g.setFlag("bugGone"); g.actors = g.actors.filter((a) => a.id !== "bug"); } },
              { sfx: "bug" },
              { say: ["player", "It waddles off into the dark, chewing happily. The vault's clear!"] },
            ]);
            return "I offer the bun.";
          },
          key: () => "The Bug has no use for keys. It has tentacles.",
        },
      },
      {
        id: "vault", name: "the vault door", x: 252, y: 24, w: 60, h: 78,
        walkTo: { x: 238, y: 124 }, defaultVerb: "open",
        look: (G) => G.flag("bugGone") ? "The exit vault. A big brass wheel and a keyhole." : "The exit vault — with a purple Bug parked in front of it.",
        open: (G) => openVault(G),
        use: (G) => openVault(G),
        useWith: { key: (G) => openVault(G) },
      },
    ],
  },

  /* ------------------------------------------------------------- BAR --- */
  bar: {
    name: "AfterWork",
    paint: paintBar,
    music: "bar",
    start: { x: 150, y: 120, dir: "front" },
    walk: { minX: 40, maxX: 280, minY: 110, maxY: 124, scaleMin: 1.3, scaleMax: 1.6 },
    onEnter: (G) => {
      G.cutscene([
        { say: ["player", "Daylight, a bar sign, and the whole crew already inside."] },
        { say: ["player", "We escaped the office, beat the room, and fed the Bug. AfterWork — earned."] },
        { wait: 400 },
        { do: (g) => g.win({
            title: "YOU MADE IT TO AW!",
            lines: [
              "The Teamtailor Linköping crew",
              "escaped, solved, and toasted.",
              "",
              "Thanks for playing.",
            ],
            replay: true,
          }) },
      ]);
    },
    objects: [],
  },
};

/* ----------------------------------------------------- shared actions -- */
function leaveOffice(G) {
  G.cutscene([
    { sfx: "door" },
    { say: ["player", "Beep — green light. We're out!"] },
    { walk: ["player", 56, 122] },
    { wait: 300 },
    { room: "street" },
  ]);
}

function rideToEscape(G) {
  G.cutscene([
    { walk: ["player", 250, 122] },
    { face: ["player", "right"] },
    { say: ["player", "To the escape room! Last one there buys the first round."] },
    { sfx: "ride" },
    { wait: 700 },
    { room: "escape" },
  ]);
}

function movePainting(G) {
  if (G.flag("paintingMoved")) return "Already moved it.";
  G.setFlag("paintingMoved"); sfx("door");
  return "I slide the painting aside. Behind it — a wall safe!";
}

function openVault(G) {
  if (!G.flag("bugGone")) { sfx("error"); return "Can't — the Bug's in the way. And it looks hungry."; }
  if (!G.has("key")) { sfx("error"); return "Locked tight. I need a key."; }
  if (G.flag("vaultOpen")) return "It's open — through here!";
  G.setFlag("vaultOpen"); sfx("unlock");
  G.cutscene([
    { say: ["player", "The key turns... the great wheel spins... the vault groans open!"] },
    { walk: ["player", 280, 124] },
    { wait: 400 },
    { room: "bar" },
  ]);
}

export const onWin = null;
