// main.js — bootstrap: load the pixel font, wire the title screen, audio,
// fullscreen and mute, then start the engine.
import { boot, setFontReady, G } from "./engine.js";
import * as content from "./script.js";
import { initAudio, resumeAudio, playMusic, toggleMute, setMuted } from "./audio.js";

const canvas = document.getElementById("screen");

async function loadFont() {
  try {
    const f = new FontFace("PressStart2P", "url(fonts/PressStart2P.ttf)");
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
  playMusic("title");
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
  boot(canvas, content);

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

let hintTimer = null;
function flashHint(msg) {
  const h = document.getElementById("hint");
  if (!h) return;
  const orig = h.dataset.orig || h.textContent;
  h.dataset.orig = orig;
  h.textContent = msg.toUpperCase();
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => { h.textContent = orig; }, 1200);
}

loadFont().then(init);

// expose for debugging in the console
window.__MM = G;
