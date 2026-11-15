/* Head Ball 3 - application shell: canvas sizing, frame loop, input routing,
 * Android bridge hooks and match lifecycle. */
(function (HB) {
  'use strict';
  var U = HB.U, C = HB.C, Art = HB.Art, UI = HB.UI, Audio = HB.Audio, Input = HB.Input, W = HB.WORLD;
  var App = HB.App = {
    canvas: null, ctx: null, fps: 60, match: null, lastCfg: null,
    resultPending: null, resultTimer: 0, cssW: 0, cssH: 0, last: 0
  };

  App.boot = function () {
    App.canvas = document.getElementById('game');
    App.ctx = App.canvas.getContext('2d', { alpha: false });
    HB.Save.load();
    HB.Meta.refreshDaily();
    HB.Meta.refreshUnlocks();
    Input.init(App.canvas);
    App.resize();
    window.addEventListener('resize', App.resize);
    window.addEventListener('orientationchange', function () { setTimeout(App.resize, 120); });
    window.addEventListener('pagehide', function () { HB.Save.flush(); });
    /* WebAudio needs a real user gesture on Android. Unlock on the first tap,
       including the splash screen, so music starts before the first match. */
    function unlock() { Audio.unlock(); }
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('mousedown', unlock, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { Audio.suspend(); HB.Save.flush(); } else Audio.resume();
    });
    HB.on('matchEnd', function (res) {
      App.resultPending = res; App.resultTimer = 1.7;
      HB.Save.flush();
    });
    HB.on('matchQuit', function () { App.match = null; App.home(); });
    if (UI.screens.splash.enter) UI.screens.splash.enter();
    UI.screen = 'splash';
    App.last = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    requestAnimationFrame(App.frame);
  };

  App.resize = function () {
    var cv = App.canvas, V = HB.V;
    var w = window.innerWidth || 1280, h = window.innerHeight || 720;
    /* App.qualityDpr is lowered by watchPerformance on slow devices */
    if (App.qualityDpr == null) App.qualityDpr = Math.min(window.devicePixelRatio || 1, 2);
    var dpr = Math.min(App.qualityDpr, Math.min(window.devicePixelRatio || 1, 2));
    App.cssW = w; App.cssH = h;
    cv.width = Math.max(1, Math.round(w * dpr));
    cv.height = Math.max(1, Math.round(h * dpr));
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    var aspect = U.clamp(w / h, 1.333, 2.4);
    V.dpr = dpr; V.aspect = aspect; V.h = 720; V.w = 720 * aspect;
    V.scale = h / 720;
    V.ox = (w - V.w * V.scale) / 2; V.oy = 0;
    V.worldScale = Math.min(V.w / W.w, V.h / W.h);
    V.worldX = (V.w - W.w * V.worldScale) / 2;
    V.worldY = (V.h - W.h * V.worldScale) / 2;
    Art.invalidateBackground();
  };

  App.startMatch = function (cfg) {
    App.lastCfg = cfg; App.resultPending = null; App.resultTimer = 0;
    Audio.unlock();
    App.match = new HB.Match(cfg);
    UI.go('match');
  };
  App.startPenalty = function (cfg) {
    App.lastCfg = cfg; App.resultPending = null; App.resultTimer = 0;
    Audio.unlock();
    App.match = new HB.Penalty(cfg);
    UI.go('match');
  };
  App.restartMatch = function () {
    if (!App.lastCfg) { App.home(); return; }
    var cfg = {};
    for (var k in App.lastCfg) cfg[k] = App.lastCfg[k];
    if (App.match instanceof HB.Penalty) App.startPenalty(cfg); else App.startMatch(cfg);
  };
  App.home = function () {
    App.match = null; App.resultPending = null; App.resultTimer = 0;
    UI.stack.length = 0; UI.screen = 'home'; UI.params = {}; UI.modal = null;
    UI.trans = UI.transMax;
    if (UI.screens.home.enter) UI.screens.home.enter();
    Audio.music('menu'); Audio.setCrowd(0.1);
  };
  HB.onBack = App.onBack = function () {
    if (UI.modal) { UI.modal = null; return true; }
    if (UI.screen === 'match') {
      var m = App.match;
      if (m && !m.finished) { if (m.paused) m.resume(); else m.pause(); Audio.play('ui'); }
      return true;
    }
    if (UI.screen === 'home' || UI.screen === 'splash') return false;
    UI.back('home');
    return true;
  };

  App.handleKeys = function (events) {
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (e.type !== 'keydown') continue;
      Audio.unlock();
      if (e.key === 'escape' || e.key === 'backspace') { HB.onBack(); }
      else if (e.key === 'p' && UI.screen === 'match' && App.match) {
        if (App.match.paused) App.match.resume(); else App.match.pause();
      } else if (e.key === 'm') {
        var s = HB.Save.data.settings;
        s.music = s.music > 0 ? 0 : 0.55; Audio.setVolumes(); HB.Save.save(true);
        HB.toast(s.music ? 'Music on' : 'Music off');
      }
    }
  };

  App.frame = function (ts) {
    var dt = (ts - App.last) / 1000;
    App.last = ts;
    if (!isFinite(dt) || dt < 0) dt = 1 / 60;
    dt = Math.min(dt, 0.05);
    HB.clock += dt;
    App.fps = U.lerp(App.fps, 1 / Math.max(0.0001, dt), 0.08);
    App.watchPerformance(dt);
    UI.handle(Input.drain());
    App.handleKeys(Input.drainKeys());
    UI.update(dt);
    var scr = UI.screens[UI.screen];
    if (scr && scr.update) scr.update(dt);
    var m = App.match;
    if (m && UI.screen === 'match') {
      var inputs = m.inputFromPointers ? m.inputFromPointers() : [{}, {}];
      for (var s = 0; s < 2; s++) {
        if (m.players && m.players[s] && m.players[s].ai) continue;
        m.setInput(s, inputs[s] || {});
      }
      if (m.releaseKeyPowers) m.releaseKeyPowers();
      m.update(dt);
    }
    Audio.update();
    if (App.resultTimer > 0) {
      App.resultTimer -= dt;
      if (App.resultTimer <= 0 && App.match && App.match.finished) {
        var res = App.resultPending;
        App.resultPending = null;
        UI.go('results', res);
      }
    }
    App.render(dt);
    requestAnimationFrame(App.frame);
  };

  /* Mobile GPUs are unpredictable: if the frame time stays above ~22 ms for a
     second, step the backing store down one notch (2 -> 1.5 -> 1). It never
     steps back up, so a weak device cannot oscillate. */
  App.watchPerformance = function (dt) {
    if (!HB.Save.data.settings.autoQuality) return;
    App._perfT = (App._perfT || 0) + dt;
    App._perfSum = (App._perfSum || 0) + dt;
    if (App._perfT < 1.2) return;
    var avg = App._perfSum / App._perfT;
    App._perfT = 0; App._perfSum = 0;
    if (avg > 0.022 && App.qualityDpr > 1) {
      App.qualityDpr = Math.max(1, App.qualityDpr - 0.5);
      App.resize();
      HB._qualityStepped = (HB._qualityStepped || 0) + 1;
    }
  };

  App.render = function (dt) {
    var g = App.ctx, V = HB.V;
    if (!g) return;
    g.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
    g.fillStyle = C.navy;
    g.fillRect(0, 0, App.cssW, App.cssH);
    g.save();
    g.translate(V.ox, V.oy);
    g.scale(V.scale, V.scale);
    g.lineJoin = 'round'; g.lineCap = 'round';
    UI.render(g, dt);
    g.restore();
  };

  /* Native WebView hooks. */
  HB.onPause = function () { Audio.suspend(); HB.Save.flush(); };
  HB.onResume = function () { Audio.resume(); HB.Save.flush(); };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', App.boot);
    else App.boot();
  }
})(window.HB = window.HB || {});
