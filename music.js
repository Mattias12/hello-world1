/* Festive background music: a music-box "Jingle Bells" (public domain) with soft bass and sleigh bells,
   synthesised live with the Web Audio API, so there are no audio files and nothing to license.
   Browsers only allow sound after the visitor touches the page, so it starts on the first tap
   (unless they turned it off before) and the 🎵 button toggles it. */
(function () {
"use strict";
const KEY = "ss-music";
const pref = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
const setPref = v => { try { localStorage.setItem(KEY, v); } catch (e) {} };
const AC = window.AudioContext || window.webkitAudioContext;
if (!AC) return;

const N = { C3:130.81, D3:146.83, F3:174.61, G3:196.00, A3:220.00, C4:261.63, D4:293.66,
            C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99 };
const L1 = [["E5",1],["E5",1],["E5",2],["E5",1],["E5",1],["E5",2],["E5",1],["G5",1],["C5",1.5],["D5",.5],["E5",4]];
const L2 = [["F5",1],["F5",1],["F5",1.5],["F5",.5],["F5",1],["E5",1],["E5",1],["E5",.5],["E5",.5],["E5",1],["D5",1],["D5",1],["E5",1],["D5",2],["G5",2]];
const L4 = [["F5",1],["F5",1],["F5",1],["F5",1],["F5",1],["E5",1],["E5",1],["E5",.5],["E5",.5],["G5",1],["G5",1],["F5",1],["D5",1],["C5",4]];
const MELODY = [].concat(L1, L2, L1, L4);                       // 64 beats
const BARS = ["C","C","C","C","F","C","D","G","C","C","C","C","F","C","G","C"];
const BASS = { C:["C3","G3"], F:["F3","C4"], D:["D3","A3"], G:["G3","D4"] };
const BEAT = 60 / 116, LOOP_BEATS = 68;                         // 64 beats of tune + a short breath

let ctx = null, bus = null, noise = null, nextLoop = 0, timer = null, playing = false;

function setup() {
  if (ctx) return;
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {} // iOS: play even with the silent switch on
  ctx = new AC();
  const len = Math.floor(ctx.sampleRate * 0.25), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  noise = buf;
  document.addEventListener("visibilitychange", () => {
    if (!playing) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });
}

function bell(t, f, dur, vol) {
  const g = ctx.createGain(), end = t + Math.max(0.6, dur * 1.6);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  g.connect(bus);
  [[1, 1], [2, 0.28], [3, 0.08]].forEach(([m, v]) => {
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = "sine"; o.frequency.value = f * m; og.gain.value = v;
    o.connect(og).connect(g); o.start(t); o.stop(end + 0.05);
  });
}
function bass(t, f, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain(), end = t + BEAT * 1.8;
  o.type = "triangle"; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  o.connect(g).connect(bus); o.start(t); o.stop(end + 0.05);
}
function jingle(t, vol) {
  const s = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noise; hp.type = "highpass"; hp.frequency.value = 7000;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  s.connect(hp).connect(g).connect(bus); s.start(t); s.stop(t + 0.15);
}

function scheduleLoop(t0) {
  let t = t0;
  MELODY.forEach(([n, b]) => { bell(t, N[n], b * BEAT, 0.16); t += b * BEAT; });
  BARS.forEach((ch, i) => {
    const bt = t0 + i * 4 * BEAT;
    bass(bt, N[BASS[ch][0]], 0.22); bass(bt + 2 * BEAT, N[BASS[ch][1]], 0.16);
    for (let k = 0; k < 8; k++) jingle(bt + k * BEAT / 2, k % 2 ? 0.035 : 0.07);
  });
}

function tick() {
  if (ctx.currentTime > nextLoop - 3) { scheduleLoop(nextLoop); nextLoop += LOOP_BEATS * BEAT; }
}

function start() {
  setup();
  if (playing) return;
  playing = true;
  ctx.resume();
  bus = ctx.createGain();
  bus.gain.setValueAtTime(0.0001, ctx.currentTime);
  bus.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 1.2);
  bus.connect(ctx.destination);
  nextLoop = ctx.currentTime + 0.15;
  tick(); timer = setInterval(tick, 500);
  paint();
}
function stop() {
  if (!playing) return;
  playing = false;
  clearInterval(timer);
  const old = bus, t = ctx.currentTime;
  old.gain.cancelScheduledValues(t); old.gain.setValueAtTime(old.gain.value, t); old.gain.linearRampToValueAtTime(0, t + 0.3);
  setTimeout(() => { try { old.disconnect(); } catch (e) {} }, 400);
  paint();
}

/* ---- the 🎵 button ---- */
const btn = document.createElement("button");
btn.type = "button"; btn.id = "musicBtn";
function paint() {
  btn.setAttribute("aria-pressed", playing ? "true" : "false");
  btn.setAttribute("aria-label", playing ? "Turn music off / Stäng av musiken" : "Turn music on / Sätt på musiken");
  btn.title = playing ? "Music off · Musik av" : "Music on · Musik på";
  btn.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M9 18.5a3 3 0 1 1-2-2.83V5.5l12-2.5v12.5a3 3 0 1 1-2-2.83V7.1l-8 1.67z"/>${playing ? "" : '<path d="M3 3l18 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'}</svg>`;
}
/* Start on the first tap anywhere, unless the visitor switched it off before. */
const GESTURES = ["click", "touchend", "keydown"];
const unkick = () => GESTURES.forEach(e => document.removeEventListener(e, kick, true));
function kick(ev) {
  if (ev.target && ev.target.closest && ev.target.closest("#musicBtn")) return;  // the button handles itself
  unkick(); start();
}
if (pref() !== "off") GESTURES.forEach(e => document.addEventListener(e, kick, true));

btn.addEventListener("click", () => { unkick(); if (playing) { stop(); setPref("off"); } else { start(); setPref("on"); } });
paint();
document.body.appendChild(btn);
})();
