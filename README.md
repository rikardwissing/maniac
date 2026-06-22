# THE HEIST AFTER WORK 🏦🍻
### a Maniac-Mansion-style adventure for Teamtailor Linköping

A retro **SCUMM-style point-and-click** retelling of the Teamtailor Linköping
**product team's** night out: leave the office, pull off the **bank-heist
escape room** downtown, then a proper AW at **Ölbacken** — a tab, a keg, a
**live band**, food, and good company.

Just like *Maniac Mansion (1987)*, you **pick a squad of 3** and **switch
between them**. **Every scene is a puzzle**, and they're all solvable by *any*
trio — bring whoever you like.

Rendered into a single **320×200 pixel canvas** with a CRT bezel, **side-
scrolling** rooms, a synthesized chiptune score, and a hand-authored pixel
cast. Plain ES modules — no engine, no bundler.

## The crew — pick 3 (the other 4 turn up at AW)

| Who | Role | Signature move |
|-----|------|----------------|
| **Jonas** | Platform dev | heavy lifting / power |
| **Anders** | Platform dev | heavy lifting / power |
| **Emil** | Aboard dev | reads the cipher instantly |
| **Rikard** | Mobile dev | phone UV torch (skips the blacklight) |
| **Oskar** | Co-pilot dev | hints (press **H**) |
| **Caroline** | Payroll / controller | cracks the safe like month-end |
| **Per** | CISO | kills the alarm bare-handed |

Specialists give shortcuts, but every puzzle has an item-based fallback, so
no squad ever gets stuck.

## Play

Open `index.html` in any modern browser, or play the deployed build.

- **Click a verb, then a thing** — or just click; a bare click does the
  sensible default. The sentence line previews the action ("Use the keg",
  "Talk to the host") before you commit.
- **Combine things:** click an **inventory item** to take it "in hand" (the
  sentence line shows "Use mug with …"), then click its target — a thing in
  the room, a person, or another item. A plain **Use** on a single object
  just works; no second click required.
- **Switch teammate:** press **1–3**, **Tab**, click a face up top, or click
  a teammate in the scene. The camera follows whoever you control.
- **Talk to anyone.** Every NPC has a proper **branching dialogue tree** —
  pick a topic (click it or press its number), they answer, the menu loops
  until you bow out. Use the **Talk to** verb on one of *your own* squadmates
  to chat with them too: they'll give you a **contextual hint**, recap the
  objective, banter — or hand you the controls ("Take over — you lead").
- **H** = Oskar's quick hint · **F** = fullscreen · **M** = mute.

## The scheme & the objective

"The Vault" escape rooms are a front: the owner, **The Curator**, skims every
visiting company's secrets and tonight is after Teamtailor's prototype,
**Aurora**. Your objective (always on **J**): beat his rigged room, break into
his **Control Room**, expose him, recover the data, stop him on the
**Rooftop** — and *still* make AW.

## A connected world (not a corridor)

**Walk anywhere inside an area; bike between areas.** Downtown is one walkable
street — stroll between the **Office**, the **Cloetta kiosk**, the **Cathedral
square**, **Ölbacken** and the host's **booking booth**. **The Vault** is
across town, so you **bike** there (and home again at the end) — the only
travel that needs the saddle. Inside the Vault, stairs connect the heist room,
the Control Room and the Rooftop on foot.

You'll **backtrack**: when the bank **guard** blocks the alarm, you ride back
to the street, grab a **Cloetta bar** at the kiosk, and return. Old-school
**NPCs** to talk to — a Game-Master **host**, a **busker**, the **kiosk
vendor**, the **guard**, a **bartender**, the **band**, the reunited **crew**
and **The Curator** — each with a branching conversation, several gating
puzzles.

### How to win (spoilers)
1. **Office** — cabinet key from the plant → open the cabinet → keycard +
   company card → out to the street.
2. **Street (hub)** — read the board, tell the **host** you're *Teamtailor*,
   enter The Vault. (Grab a **Cloetta bar** at the kiosk while you're here.)
3. **Heist** — UV poster (drawer blacklight *or* Rikard's phone) → cipher
   wheel → safe `4 8 7 3` → loot → **give the guard the Cloetta** (backtrack
   to the kiosk if you skipped it) → cut the alarm (wire cutters *or* Per) →
   **co-op** pressure plate powers the vault → open it.
4. **Control Room** — kill the laser grid (Per *or* the mirror) → throw the
   power lever → grab the **Aurora drive** + the **evidence** → confront **The
   Curator**; he bolts upstairs.
5. **Rooftop** — cut the drone's tether (wire cutters; Rikard/Per can jam it)
   → grab the **master drive** → he's nicked.
6. **Ölbacken** — card to the **bartender** for a tab → tap the keg → beer to
   the band for live music → eat → toast the crew → home. *Skål!* 🍻

The run is timed (with the 90-minute **escape clock**), and the ending grades
your speed — Bronze → **Platinum**.

## Mini-games

- **Bike ride** — pedal across town to The Vault (helmet required) and home
  again: hop the potholes (space / click). A short, forgiving side-scroller.
- **Keypad** — punch the safe code in on a close-up keypad.
- **Wire-cut** — snip the right alarm wire in close-up.
- **Beer chug** — mash to empty the glass at Ölbacken for bragging rights.

(Specialists skip the close-ups — Caroline just *knows* the code, Per kills the
alarm bare-handed — so they're optional flair, not friction.)

## Everything is hand-made

- **Art** — every crew sprite (shared rig, recoloured; long-hair variant) and
  item icon is hand-authored pixel data; the four wide rooms are drawn
  procedurally (`js/art.js`, `js/pixel.js`).
- **Audio** — all SFX and per-room chiptune themes are synthesized live with
  Web Audio; no audio files (`js/audio.js`).
- **Engine** — a small custom SCUMM-style engine: verbs, shared inventory,
  depth-scaled walking, a **side-scroll camera**, a **switchable squad**,
  a **co-op** pressure-plate hook, speech, dialogue, cutscenes
  (`js/engine.js`).
- **Content** — rooms, the per-scene puzzles, and dialogue (`js/script.js`).

## Tests

A headless browser test boots the game, captures any console/runtime errors,
and solves the whole night with a deliberately *non-specialist* trio
(Jonas/Anders/Oskar) — proving every puzzle's fallback path and the co-op
plate work, across all four rooms:

```bash
npm install        # installs playwright
npm test           # node test/smoke.mjs
npm run shots      # regenerate screenshots into shots/
```

## Deploy

See [`DEPLOY.md`](DEPLOY.md). `sh build.sh` assembles `./site`, then deploy to
**tailor.zone** (`tailor deploy ./site`) or **GitHub Pages**
(`.github/workflows/deploy.yml`).

## Sibling game — LAGOM 🪴 (`/lagom`)

A second, cozier game lives in this repo. **LAGOM** is a *nine-to-five
survival story* — a **point-and-click adventure** where you **walk a character**
around your flat and the office (click to walk, click a thing to use it; a
SCUMM-style sentence line reads "Tend Greg", "Make coffee", "Go to work"). A
departing colleague leaves you **Greg**, the beloved office plant, with one
rule — *water him **lagom**, not too much, not too little.* It's a relaxed,
**endless** day-loop (morning → office → night → repeat) where the whole tension
is reading Greg's needs as his thirst escalates day after day. The watering
mini-game **is** lagom: hold to pour, land the soil-moisture gauge in the green
band — overshoot and he rots, undershoot and he wilts. Keep him thriving and he
**grows, blooms, and becomes the office mascot**; let him go and there's a
tasteful **funeral** with your streak on the headstone.

The humour and story come through **branching dialogue trees**: talk to the
coworkers — **Per** (CISO), **Caroline** (payroll), and **Bittan**, who paces
about over-watering Greg "to help" — and **right-click Greg** to chat with the
plant himself (he's outlived three product managers and has opinions). Choices
can matter: ask Bittan to go easy and she'll actually tame her watering can.

**More than watering.** Greg gets **afflictions** with their own minigames —
**aphids** to squash (they suck sap and breed if you ignore them) and **dusty
leaves** to wipe (too dusty and he can't grow). There's a **point-and-click
inventory**: your plant-care kit (leaf cloth, plant food) plus things you find
or earn — use the held item on a target (feed a healthy Greg, give Bittan a
kanelbulle so she stops over-watering). And the days have an **arc** of scripted
events — aphid season, a bug-spray delivery, Greg's anniversary, a heatwave
week, the new hire who turns up to shadow you.

**A real ending.** Keep Greg alive for **20 days** and you're **promoted** — to
a glass-box floor where no plants are allowed. You hand Greg to the new hire
(full circle from the intro) and the **credits** roll over a blooming Greg to a
bittersweet song, the way a certain GLaDOS ballad once sent players off.

It **shares the engine plumbing** — the `js/pixel.js` renderer and the
`js/audio.js` chiptune synth — but has its own lightweight day-loop engine
(`lagom/game.js`) and parametric pixel art (`lagom/art.js`, including a Greg who
droops, emotes and flowers). Open `lagom/index.html`, or play the deployed
build at `/lagom/`.

```bash
node test/lagom-play.mjs    # full playthrough: loop, dialogue, minigames, inventory, ending
node test/lagom-shots.mjs   # regenerate screenshots into shots/lagom/
```

## Credits

Font: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) by
CodeMan38 (SIL Open Font License 1.1, see `fonts/LICENSE.txt`).

A tribute to *Maniac Mansion* by Ron Gilbert & Gary Winnick (Lucasfilm Games,
1987). Made for the Teamtailor Linköping product team. 🟢
