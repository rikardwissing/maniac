# MANIAC MANSION: AfterWork 🟣🍻

A retro **SCUMM-style point-and-click adventure** about the **Teamtailor
Linköping** crew on a Friday: escape the office, crack the escape room
(guarded by a hungry purple **Bug**), and make it to **AfterWork**.

Built as a love letter to LucasArts' *Maniac Mansion* (1987) — verb grid,
inventory, walkable rooms with depth, dialogue trees, the works — rendered
into a single **320×200 pixel canvas** with a CRT bezel.

## Play

Open `index.html` in any modern browser, or play the deployed build (see
below). No build step, no bundler — plain ES modules.

- **Click a verb, then a thing.** Or just click around — clicking a thing
  with no verb does the sensible default.
- **Two-object actions:** `Use` the *keycard* with the *door*; `Give` the
  *coffee* to *Kim*.
- **F** = fullscreen · **M** = mute · click a character to start.

### How to win (spoilers)
1. **Office** — pick up the mug, brew coffee, grab the kanelbulle + sticky
   note, give Kim the coffee for the keycard, use the keycard on the door.
2. **Street** — grab the helmet (safety first!), use the bikes.
3. **Escape Room** — pull the creepy painting to reveal a safe, enter the
   code from the note (`1987`), take the golden key, give the Bug the
   kanelbulle so it'll move, then open the vault.
4. **AfterWork** — *Skål!* 🍻

## Everything is hand-made

- **Art** — all sprites (characters, the Bug, item icons) are hand-authored
  pixel data; all room backgrounds are drawn procedurally. See `js/art.js`.
- **Audio** — every sound and the per-room chiptune themes are synthesized at
  runtime with the Web Audio API. No audio files. See `js/audio.js`.
- **Engine** — a small custom SCUMM-style engine (verbs, inventory, walking
  with depth, speech, dialogue, cutscenes). See `js/engine.js`.

## Project layout

```
index.html        # shell: canvas + CRT bezel + title splash
css/style.css     # page frame, scaling, scanlines
js/pixel.js       # palette + sprite decoder + draw primitives
js/art.js         # all pixel art + room painters
js/audio.js       # WebAudio chiptune engine
js/engine.js      # the adventure engine + UI + render loop
js/script.js      # the actual game: rooms, items, puzzles, dialogue
js/main.js        # bootstrap (font load, title, fullscreen, mute)
fonts/            # Press Start 2P (OFL) — see fonts/LICENSE.txt
test/             # headless Playwright smoke test + screenshot tool
```

## Tests

A headless browser test boots the game, captures any console/runtime errors,
and solves the entire adventure end-to-end (driving every room):

```bash
npm install        # installs playwright
npm test           # node test/smoke.mjs
npm run shots      # regenerate screenshots into shots/
```

## Deploy

Pushing to the deploy branch (or `main`) runs `.github/workflows/deploy.yml`,
which publishes the static site to **GitHub Pages**
(`https://rikardwissing.github.io/maniac/`).

To serve it from a custom domain (e.g. `tailor.zone`), point that domain's
DNS at GitHub Pages (a `CNAME` to `rikardwissing.github.io`, or the four
Pages `A` records) and add the domain under the repo's **Settings → Pages →
Custom domain**.

## Credits

Font: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) by
CodeMan38, licensed under the SIL Open Font License 1.1.

A tribute to *Maniac Mansion* by Ron Gilbert & Gary Winnick (Lucasfilm Games,
1987). Made for Teamtailor Linköping. 🟢
