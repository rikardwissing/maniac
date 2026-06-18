# THE HEIST AFTER WORK 🏦🍻
### a Maniac-Mansion-style adventure for Teamtailor Linköping

A retro **SCUMM-style point-and-click** retelling of the Teamtailor Linköping
**product team's** night out: leave the office, pull off the **bank-heist
escape room** downtown, then celebrate at **Ölbacken** — a keg, food, and the
ride home.

Just like *Maniac Mansion (1987)*, you control a **whole crew** and **switch
between them** — and each teammate's real job is the key to a puzzle.

Rendered into a single **320×200 pixel canvas** with a CRT bezel, **side-
scrolling** rooms, a synthesized chiptune score, and a hand-authored pixel
cast. No engine, no bundler — plain ES modules.

## The crew (switch with **1–7** or click a face up top)

| # | Who | Role | Heist job |
|---|-----|------|-----------|
| 1 | **Jonas** | Platform dev | turns the **left** power valve |
| 2 | **Anders** | Platform dev | turns the **right** power valve |
| 3 | **Emil** | Aboard dev | solves the **cipher wheel** |
| 4 | **Rikard** | Mobile dev | lights the **UV poster** with his phone |
| 5 | **Oskar** | Co-pilot dev | gives **hints** (press **H**) |
| 6 | **Caroline** | Payroll / controller | cracks the **safe** code |
| 7 | **Per** | CISO | kills the **alarm** |

## Play

Open `index.html` in any modern browser, or play the deployed build.

- **Click a verb, then a thing** — or just click; a bare click does the
  sensible default. **Click a teammate** (or press their number) to take
  control of them; the camera follows.
- **H** = Oskar's hint · **F** = fullscreen · **M** = mute.

### How to win (spoilers)
1. **Office** — pick up the keycard, open the EXIT door (far right).
2. **Street** — walk right into *The Vault* escape rooms.
3. **Heist** — *Rikard* UV-lights the poster → *Emil* reads the cipher
   (code `4 8 7 3`) → *Caroline* opens the safe → grab the **loot** → *Per*
   kills the alarm → *Jonas* & *Anders* turn both power valves → open the
   vault and walk out.
4. **Ölbacken** — tap the keg, eat, then head home. *Skål!* 🍻

## Everything is hand-made

- **Art** — every crew sprite (shared rig, recoloured per person, long-hair
  variant) and item icon is hand-authored pixel data; the four wide rooms are
  drawn procedurally (`js/art.js`, `js/pixel.js`).
- **Audio** — all SFX and per-room chiptune themes are synthesized live with
  Web Audio; no audio files (`js/audio.js`).
- **Engine** — a small custom SCUMM-style engine: verbs, shared inventory,
  depth-scaled walking, a **side-scroll camera**, a **switchable party**,
  speech, dialogue, cutscenes (`js/engine.js`).
- **Content** — rooms, the heist puzzle chain, and dialogue (`js/script.js`).

## Tests

A headless browser test boots the game, captures any console/runtime errors,
and solves the entire heist — switching to the right teammate at every gated
station and driving all four rooms:

```bash
npm install        # installs playwright
npm test           # node test/smoke.mjs
npm run shots      # regenerate screenshots into shots/
```

## Deploy

See [`DEPLOY.md`](DEPLOY.md). In short: `sh build.sh` assembles `./site`,
then deploy to **tailor.zone** (`tailor deploy ./site`) or **GitHub Pages**
(the workflow in `.github/workflows/deploy.yml`).

## Credits

Font: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) by
CodeMan38 (SIL Open Font License 1.1, see `fonts/LICENSE.txt`).

A tribute to *Maniac Mansion* by Ron Gilbert & Gary Winnick (Lucasfilm Games,
1987). Made for the Teamtailor Linköping product team. 🟢
