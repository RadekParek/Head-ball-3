/* Head Ball 3 - core runtime: math, events, persistence, input.
 * No third-party runtime code. Every subsystem hangs off the single HB namespace. */
(function (HB) {
  'use strict';

  HB.VERSION = '1.0.0';
  HB.WORLD = { w: 1280, h: 720, ground: 596, goalW: 156, goalH: 258 };
  HB.clock = 0;                 // seconds since boot (animation time)
  HB.V = { w: 1280, h: 720, dpr: 1, aspect: 16 / 9, scale: 1, ox: 0, oy: 0, worldScale: 1, worldX: 0, worldY: 0 };

  HB.C = {
    ink: '#101d38', ink2: '#1b2f55', navy: '#0c1830', navy2: '#12244a',
    paper: '#f6f9ff', mist: '#c9d8ef', line: '#2b477a',
    gold: '#ffce4b', gold2: '#ff9f2e', orange: '#ff7a3d', red: '#f0455c',
    blue: '#3989ff', cyan: '#3ad9e8', teal: '#22c9a6', green: '#46d36b',
    purple: '#9167f6', pink: '#ff6fae', white: '#ffffff', black: '#08101f'
  };
  HB.FONT = '"Trebuchet MS","Segoe UI",Roboto,system-ui,sans-serif';
  HB.FONT_HEAVY = '900 1em "Trebuchet MS","Segoe UI",Roboto,system-ui,sans-serif';

  var U = HB.U = {
    clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    damp: function (a, b, rate, dt) { return U.lerp(a, b, 1 - Math.exp(-rate * dt)); },
    approach: function (v, target, step) { return v < target ? Math.min(v + step, target) : Math.max(v - step, target); },
    sign: function (v) { return v < 0 ? -1 : v > 0 ? 1 : 0; },
    hypot: function (x, y) { return Math.sqrt(x * x + y * y); },
    dist: function (ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); },
    rnd: function (a, b) { return a + Math.random() * (b - a); },
    randInt: function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
    chance: function (p) { return Math.random() < p; },
    pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    shuffle: function (arr) { for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; },
    smooth: function (t) { return t * t * (3 - 2 * t); },
    easeOut: function (t) { return 1 - Math.pow(1 - t, 3); },
    easeIn: function (t) { return t * t * t; },
    easeBack: function (t) { var c = 1.70158 + 1; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    easeElastic: function (t) { return t === 0 || t === 1 ? t : Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1; },
    hit: function (x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; },
    fmtTime: function (s) { s = Math.max(0, Math.ceil(s)); var m = Math.floor(s / 60); return m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); },
    fmtNum: function (n) { n = Math.round(n); return n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 10000 ? (n / 1000).toFixed(1) + 'k' : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); },
    hash: function (str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; },
    alpha: function (hex, a) {
      if (hex.charAt(0) !== '#') return hex;
      var n = parseInt(hex.slice(1), 16);
      if (hex.length === 4) { n = ((n & 0xf00) << 12) | ((n & 0xf0) << 8) | ((n & 0xf) << 4) | ((n & 0xf00) >> 8) | ((n & 0xf0) >> 4) | (n & 0xf); }
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    },
    mix: function (a, b, t) {
      function rgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
      var x = rgb(a), y = rgb(b), o = '#';
      for (var i = 0; i < 3; i++) { var v = Math.round(U.lerp(x[i], y[i], t)).toString(16); o += v.length < 2 ? '0' + v : v; }
      return o;
    },
    shade: function (hex, amt) { return U.mix(hex, amt < 0 ? '#000000' : '#ffffff', Math.abs(amt)); }
  };

  /* Deterministic PRNG - used for generated content and daily missions. */
  HB.RNG = function (seed) {
    var s = (typeof seed === 'string' ? U.hash(seed) : seed >>> 0) || 1;
    var self = {
      next: function () { s += 0x6D2B79F5; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; },
      range: function (a, b) { return a + self.next() * (b - a); },
      int: function (a, b) { return Math.floor(self.range(a, b + 1)); },
      pick: function (arr) { return arr[self.int(0, arr.length - 1)]; },
      shuffle: function (arr) { var c = arr.slice(); for (var i = c.length - 1; i > 0; i--) { var j = self.int(0, i); var t = c[i]; c[i] = c[j]; c[j] = t; } return c; }
    };
    return self;
  };

  /* Tiny event bus. */
  var handlers = {};
  HB.on = function (name, fn) { (handlers[name] || (handlers[name] = [])).push(fn); };
  HB.emit = function (name, data) { var a = handlers[name]; if (a) for (var i = 0; i < a.length; i++) a[i](data); };

  /* ---------------- Persistence ----------------
   * Android WebView persists through the native bridge (SharedPreferences).
   * Browsers fall back to localStorage. Both paths are optional: the game is
   * fully playable even when storage is unavailable. */
  var KEY = 'hb3.save.v1';
  function bridge() { return (typeof window !== 'undefined' && window.HBAndroid && window.HBAndroid.load) ? window.HBAndroid : null; }

  function defaults() {
    return {
      v: 1, name: '', coins: 1500, gems: 20, fans: 0, xp: 0, level: 1,
      character: 0, unlockedChars: [0], cards: {}, charLevels: {},
      gear: { hat: -1, glasses: -1, jersey: -1, boots: -1, ball: -1 }, ownedGear: [0, 1, 2],
      powersEquipped: [0, 1, 2], powerLevels: {}, unlockedPowers: [0, 1, 2],
      stadium: 0, unlockedStadiums: [0], league: 0, bracket: 0, leaguePoints: 0,
      achievements: {}, careerClaimed: [], seasonClaimed: [], seasonXp: 0,
      missions: { date: '', ids: [], progress: [], claimed: [] },
      tournament: null, daily: { date: '', streak: 0, claimed: '' },
      stats: {
        played: 0, wins: 0, draws: 0, losses: 0, goals: 0, conceded: 0, shots: 0,
        headers: 0, saves: 0, powers: 0, tackles: 0, streak: 0, bestStreak: 0,
        tournaments: 0, penaltyWins: 0, playTime: 0, packs: 0, perfectHeaders: 0
      },
      firstRun: true, tutorialDone: false,
      settings: {
        music: 0.55, sfx: 0.85, haptics: true, difficulty: 2, matchLength: 90,
        goldenGoal: true, quality: 1, flipControls: false, showFps: false, autoQuality: true
      }
    };
  }
  /* Schema-driven merge. Known fields are validated against their default
   * type; dictionary-style containers (achievements, cards, charLevels,
   * powerLevels, missions.progress...) keep every saved key, because their
   * defaults are empty objects and dropping them would erase progression. */
  function merge(base, loaded) {
    if (!loaded || typeof loaded !== 'object') return base;
    for (var k in base) if (Object.prototype.hasOwnProperty.call(base, k)) {
      var b = base[k], l = loaded[k];
      if (l === undefined || l === null) continue;
      if (Array.isArray(b)) { if (Array.isArray(l)) base[k] = l.slice(); }
      else if (typeof b === 'object') { base[k] = merge(b, l); }
      else if (typeof l === typeof b) base[k] = l;
    }
    for (var k2 in loaded) if (Object.prototype.hasOwnProperty.call(loaded, k2) &&
        !Object.prototype.hasOwnProperty.call(base, k2)) {
      var v = loaded[k2];
      base[k2] = (v && typeof v === 'object') ? JSON.parse(JSON.stringify(v)) : v;
    }
    return base;
  }

  var Save = HB.Save = {
    data: defaults(),
    _dirty: false, _lastWrite: 0,
    defaults: defaults,
    load: function () {
      var raw = '';
      try { var b = bridge(); raw = b ? b.load() : (window.localStorage ? window.localStorage.getItem(KEY) : '') || ''; } catch (e) { raw = ''; }
      try { Save.data = merge(defaults(), raw ? JSON.parse(raw) : null); } catch (e) { Save.data = defaults(); }
      if (!Save.data.name) Save.data.name = HB.Data ? HB.Data.randomName() : 'Rookie';
      return Save.data;
    },
    save: function (force) {
      Save._dirty = true;
      var t = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      if (!force && t - Save._lastWrite < 400) return;
      Save.flush();
    },
    flush: function () {
      if (!Save._dirty) return;
      var raw;
      try { raw = JSON.stringify(Save.data); } catch (e) { return; }
      try {
        var b = bridge();
        if (b) b.save(raw); else if (window.localStorage) window.localStorage.setItem(KEY, raw);
      } catch (e) { /* storage denied - keep playing in memory */ }
      Save._dirty = false;
      Save._lastWrite = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    },
    reset: function () {
      Save.data = defaults();
      Save.data.name = HB.Data.randomName();
      Save._dirty = true; Save.flush();
    }
  };

  /* ---------------- Input ----------------
   * Multi-touch is essential: local 1v1 has two players on one screen.
   * Events are queued and drained once per frame so UI hit-testing works on a
   * stable snapshot while the match reads live pointer state. */
  var Input = HB.Input = {
    state: new Map(), events: [], keys: new Set(), keyEvents: [], canvas: null,
    init: function (canvas) {
      Input.canvas = canvas;
      function pos(e) {
        var r = canvas.getBoundingClientRect(), V = HB.V;
        return {
          x: (e.clientX - r.left - V.ox) / V.scale,
          y: (e.clientY - r.top - V.oy) / V.scale
        };
      }
      function down(e) {
        e.preventDefault();
        var p = pos(e), id = e.pointerId;
        Input.state.set(id, { x: p.x, y: p.y, sx: p.x, sy: p.y, down: true, t: HB.clock, moved: 0 });
        Input.events.push({ type: 'down', id: id, x: p.x, y: p.y, dx: 0, dy: 0 });
        if (canvas.setPointerCapture) { try { canvas.setPointerCapture(id); } catch (err) { } }
      }
      function move(e) {
        var p = pos(e), id = e.pointerId, s = Input.state.get(id);
        if (!s) return;
        var dx = p.x - s.x, dy = p.y - s.y;
        s.x = p.x; s.y = p.y; s.moved += Math.abs(dx) + Math.abs(dy);
        Input.events.push({ type: 'move', id: id, x: p.x, y: p.y, dx: dx, dy: dy });
      }
      function up(e, cancel) {
        var id = e.pointerId, s = Input.state.get(id);
        if (!s) return;
        var p = pos(e);
        s.down = false; s.x = p.x; s.y = p.y;
        Input.events.push({ type: 'up', id: id, x: p.x, y: p.y, dx: p.x - s.sx, dy: p.y - s.sy, cancel: !!cancel, held: HB.clock - s.t, moved: s.moved });
        Input.state.delete(id);
      }
      canvas.addEventListener('pointerdown', down, { passive: false });
      canvas.addEventListener('pointermove', move, { passive: false });
      canvas.addEventListener('pointerup', function (e) { up(e, false); }, { passive: false });
      canvas.addEventListener('pointercancel', function (e) { up(e, true); }, { passive: false });
      canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      function key(e, isDown) {
        var k = e.key.toLowerCase();
        if (k === 'arrowleft') k = 'left'; else if (k === 'arrowright') k = 'right';
        else if (k === 'arrowup') k = 'up'; else if (k === 'arrowdown') k = 'down';
        else if (k === ' ') k = 'space';
        if (isDown) { if (!Input.keys.has(k)) { Input.keys.add(k); Input.keyEvents.push({ type: 'keydown', key: k }); } }
        else { Input.keys.delete(k); Input.keyEvents.push({ type: 'keyup', key: k }); }
        if (['left', 'right', 'up', 'down', 'space', 'tab'].indexOf(k) >= 0) e.preventDefault();
      }
      window.addEventListener('keydown', function (e) { key(e, true); }, { passive: false });
      window.addEventListener('keyup', function (e) { key(e, false); }, { passive: false });
      window.addEventListener('blur', function () { Input.keys.clear(); Input.state.clear(); });
    },
    drain: function () { var e = Input.events; Input.events = []; return e; },
    drainKeys: function () { var e = Input.keyEvents; Input.keyEvents = []; return e; },
    key: function (k) { return Input.keys.has(k); },
    /* Returns active pointers whose current position is inside a rect. */
    pointersIn: function (r) {
      var out = [];
      Input.state.forEach(function (s, id) { if (s.down && U.hit(s.x, s.y, r)) out.push({ id: id, x: s.x, y: s.y }); });
      return out;
    },
    anyPointerDown: function () { var v = false; Input.state.forEach(function (s) { if (s.down) v = true; }); return v; },
    vibrate: function (ms) {
      if (!Save.data.settings.haptics) return;
      try { if (window.HBAndroid && window.HBAndroid.vibrate) window.HBAndroid.vibrate(ms | 0); else if (navigator.vibrate) navigator.vibrate(ms | 0); } catch (e) { }
    }
  };

  HB.toast = function (text, kind) { HB.emit('toast', { text: text, kind: kind || 'info' }); };
})(window.HB = window.HB || {});
