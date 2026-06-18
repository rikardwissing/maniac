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
  sensible default.
- **Switch teammate:** press **1–3**, **Tab**, click a face up top, or click
  a teammate in the scene. The camera follows whoever you control.
- **H** = Oskar's hint · **F** = fullscreen · **M** = mute.

There's a small cast of **NPCs to talk to** (old-school adventure style): a
Game-Master **host**, a street **busker**, a bank **guard**, and a **bartender** —
two of them gate puzzles.

### How to win (spoilers)
1. **Office** — dig the cabinet key out of the plant → open the supply
   cabinet → take the keycard + company card → badge out.
2. **Street** — read the noticeboard for the booking, then **talk to the
   host** and give your team name (*Teamtailor*) to get in.
3. **Heist** — UV the poster (blacklight from the drawer, *or* Rikard's
   phone) → cipher wheel → safe code `4 8 7 3` → grab the loot → buy a
   **Cloetta bar** from the vending machine and **give it to the guard** to
   clear the alarm → cut the alarm (wire cutters, *or* Per) → **co-op:** stand
   one teammate on the pressure plate to power the vault, switch to another
   and open it.
4. **Ölbacken** — company card to the **bartender** to open a tab → tap the
   keg → give a beer to the band for live music → eat → chat with the crew →
   head home. *Skål!* 🍻

The whole run is timed (with a nod to the 90-minute **escape clock**), and the
ending grades your speed — Bronze → **Platinum**.

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

## Credits

Font: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) by
CodeMan38 (SIL Open Font License 1.1, see `fonts/LICENSE.txt`).

A tribute to *Maniac Mansion* by Ron Gilbert & Gary Winnick (Lucasfilm Games,
1987). Made for the Teamtailor Linköping product team. 🟢
