/* Headless DOM/Canvas harness for smoke tests and screenshots.
 * Uses @napi-rs/canvas (dev-only) to run the real renderer under Node. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function createHarness(width, height, opts) {
  opts = opts || {};
  const { createCanvas } = require('@napi-rs/canvas');
  let dpr = opts.dpr || 1;
  const main = createCanvas(Math.round(width * dpr), Math.round(height * dpr));
  main.style = {};
  main.getBoundingClientRect = () => ({ left: 0, top: 0, width: width, height: height, right: width, bottom: height });
  main.addEventListener = () => { };
  main.setPointerCapture = () => { };

  const store = {};
  const raf = [];
  const g = global;
  g.window = g;
  g.document = {
    readyState: 'complete',
    hidden: false,
    getElementById: (id) => id === 'game' ? main : null,
    createElement: (tag) => {
      if (tag !== 'canvas') return { style: {}, addEventListener() { } };
      const c = createCanvas(1, 1); c.style = {}; c.addEventListener = () => { };
      return c;
    },
    addEventListener: () => { }
  };
  if (!g.navigator) g.navigator = { vibrate: () => { } };
  g.devicePixelRatio = dpr;
  g.innerWidth = width; g.innerHeight = height;
  g.requestAnimationFrame = (cb) => { raf.push(cb); return raf.length; };
  g.addEventListener = () => { };
  g.setTimeout = setTimeout;
  g.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  g.AudioContext = undefined;
  g.webkitAudioContext = undefined;

  const bundle = fs.readFileSync(path.join(ROOT, 'dist', 'assets', 'game.js'), 'utf8');
  vm.runInThisContext(bundle, { filename: 'game.js' });

  let clock = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const HB = g.HB;
  const errors = [];
  function step(count, dt) {
    dt = dt || 1 / 60;
    for (let i = 0; i < (count || 1); i++) {
      const cb = raf.shift();
      if (!cb) throw new Error('No scheduled frame');
      clock += dt * 1000;
      try { cb(clock); } catch (e) { errors.push(e); throw e; }
    }
  }
  function go(name, params) { HB.UI.go(name, params); }
  function click(x, y) {
    HB.Input.events.push({ type: 'down', id: 1, x: x, y: y, dx: 0, dy: 0 });
    step(1);
    HB.Input.events.push({ type: 'up', id: 1, x: x, y: y, dx: 0, dy: 0, held: 0.05, moved: 0 });
    step(2);
  }
  function savePng(file) {
    const out = path.resolve(ROOT, file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, main.toBuffer('image/png'));
    return out;
  }
  return { HB: HB, step: step, go: go, click: click, canvas: main, savePng: savePng, errors: errors, store: store };
}
module.exports = { createHarness: createHarness };
