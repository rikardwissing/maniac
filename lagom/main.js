// main.js — bootstrap: load the pixel font, wire the title screen, audio,
// fullscreen and mute, then start the LAGOM day-loop engine.
import { boot, setFontReady, G, flashHint } from "./game.js";
import { initAudio, resumeAudio, playMusic, toggleMute } from "../js/audio.js";

const canvas = document.getElementById("screen");

async function loadFont() {
  try {
    const f = new FontFace("PressStart2P", "url(../fonts/PressStart2P.ttf)");
    await f.load();
    document.fonts.add(f);
    await document.fonts.ready;
  } catch (e) { /* fall back to monospace */ }
  setFontReady();
}

function startGame() {
  const overlay = document.getElementById("boot");
  if (overlay.classList.contains("hidden")) return;
  overlay.classList.add("hidden");
  initAudio();
  resumeAudio();
  playMusic("lagom_title");
  G.begin();
}

function toggleFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement) {
    (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen || (() => {})).call(document);
  }
}

function init() {
  boot(canvas);

  document.getElementById("startBtn").addEventListener("click", startGame);
  document.getElementById("fsBtn").addEventListener("click", toggleFullscreen);

  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "f") toggleFullscreen();
    if (k === "m") {
      const muted = toggleMute();
      flashHint(muted ? "muted" : "sound on");
    }
    if (k === " " && !document.getElementById("boot").classList.contains("hidden")) {
      e.preventDefault(); startGame();
    }
  });
}

loadFont().then(init);

// expose for debugging in the console
window.__LAGOM = G;
