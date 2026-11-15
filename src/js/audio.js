/* Head Ball 3 - procedural sound engine.
 * Every effect and every note of music is synthesised at runtime with WebAudio.
 * The APK ships zero audio files: ~14 kB of code replaces megabytes of samples. */
(function (HB) {
  'use strict';
  var U = HB.U;
  var A = HB.Audio = {};
  var ctx = null, master, sfxBus, musicBus, wet, comp, crowdGain = null, crowdNode = null;
  var ready = false, failed = false;
  var musicOn = true, volMusic = 0.55, volSfx = 0.85;
  var theme = 'menu', nextStep = 0, stepIndex = 0, intensity = 0, barCount = 0;
  var active = [];

  function freq(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function now() { return ctx ? ctx.currentTime : 0; }

  A.init = function () {
    if (ready || failed) return ready;
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) { failed = true; return false; }
    try { ctx = new Ctor(); } catch (e) { failed = true; return false; }
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 22; comp.ratio.value = 5;
    comp.attack.value = 0.004; comp.release.value = 0.22;
    master = ctx.createGain(); master.gain.value = 0.9;
    sfxBus = ctx.createGain(); musicBus = ctx.createGain();
    sfxBus.connect(master); musicBus.connect(master);
    try {
      var conv = ctx.createConvolver(), len = Math.floor(ctx.sampleRate * 1.15), buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (var ch = 0; ch < 2; ch++) {
        var d = buf.getChannelData(ch);
        for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
      conv.buffer = buf; wet = ctx.createGain(); wet.gain.value = 0.11;
      sfxBus.connect(conv); conv.connect(wet); wet.connect(master);
    } catch (e) { wet = null; }
    master.connect(comp); comp.connect(ctx.destination);
    A.setVolumes();
    startCrowd();
    ready = true;
    return true;
  };
  A.unlock = function () {
    if (!A.init()) return;
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { } }
  };
  A.setVolumes = function () {
    var s = HB.Save.data.settings;
    volMusic = s.music; volSfx = s.sfx; musicOn = volMusic > 0.001;
    if (!ready) return;
    musicBus.gain.setTargetAtTime(musicOn ? volMusic * 0.42 : 0, now(), 0.08);
    sfxBus.gain.setTargetAtTime(volSfx * 0.85, now(), 0.04);
  };
  A.suspend = function () { if (ready && ctx.state === 'running') { try { ctx.suspend(); } catch (e) { } } };
  A.resume = function () { A.unlock(); };

  /* --- primitive voices --- */
  function env(g, t, a, d, peak, bus) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    g.connect(bus || sfxBus);
  }
  function tone(o) {
    if (!ready) return;
    var t = o.t || now(), bus = o.bus || sfxBus;
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + (o.dur || 0.15));
    if (o.detune) osc.detune.value = o.detune;
    env(g, t, o.a || 0.006, o.dur || 0.15, o.v == null ? 0.2 : o.v, bus);
    osc.connect(g); osc.start(t); osc.stop(t + (o.dur || 0.15) + (o.a || 0.006) + 0.02);
    active.push(osc);
    if (active.length > 96) active.splice(0, 48);
  }
  function noise(o) {
    if (!ready) return;
    var t = o.t || now(), dur = o.dur || 0.15;
    var len = Math.max(1, Math.floor(ctx.sampleRate * dur)), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (o.decay === false ? 1 : Math.pow(1 - i / len, o.pow || 1.5));
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1200, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(60, o.f2), t + dur);
    f.Q.value = o.q || 0.8;
    var g = ctx.createGain(); env(g, t, o.a || 0.004, dur, o.v == null ? 0.2 : o.v, o.bus || sfxBus);
    src.connect(f); f.connect(g); src.start(t); src.stop(t + dur + 0.03);
  }
  function chord(notes, t, dur, v, type, bus) {
    for (var i = 0; i < notes.length; i++) tone({ f: freq(notes[i]), t: t, dur: dur, v: v, type: type || 'triangle', bus: bus });
  }
  function startCrowd() {
    crowdGain = ctx.createGain(); crowdGain.gain.value = 0.0;
    var len = Math.floor(ctx.sampleRate * 2), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    crowdNode = ctx.createBufferSource(); crowdNode.buffer = buf; crowdNode.loop = true;
    var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 560; f.Q.value = 0.4;
    var lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.13; lg.gain.value = 140;
    lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    crowdNode.connect(f); f.connect(crowdGain); crowdGain.connect(master); crowdNode.start();
  }
  A.setCrowd = function (v) {
    if (!ready || !crowdGain) return;
    crowdGain.gain.setTargetAtTime(U.clamp(v, 0, 1) * 0.055 * volSfx, now(), 0.25);
  };
  A.cheer = function (power) {
    if (!ready) return;
    power = U.clamp(power || 1, 0.3, 2);
    var t = now();
    noise({ t: t, dur: 0.9 + power * 0.5, f: 500, f2: 1500, v: 0.16 * power, filter: 'bandpass', q: 0.5, decay: false, pow: 0.35 });
    noise({ t: t, dur: 0.5, f: 2400, f2: 900, v: 0.07 * power, filter: 'highpass' });
    for (var i = 0; i < 5; i++) tone({ f: 380 + i * 95 + Math.random() * 40, t: t + i * 0.045, dur: 0.5, v: 0.025 * power, type: 'sawtooth' });
    chord([67, 72, 76, 79], t + 0.03, 0.55, 0.045 * power, 'triangle');
  };

  /* --- sound effect library --- */
  var SFX = {
    ui: function (t) { tone({ f: 620, f2: 900, dur: 0.07, v: 0.16, type: 'triangle', t: t }); },
    select: function (t) { tone({ f: 440, f2: 720, dur: 0.1, v: 0.16, type: 'square', t: t }); tone({ f: 880, dur: 0.07, v: 0.05, t: t + 0.04 }); },
    back: function (t) { tone({ f: 520, f2: 310, dur: 0.11, v: 0.14, type: 'triangle', t: t }); },
    error: function (t) { tone({ f: 220, f2: 140, dur: 0.19, v: 0.16, type: 'sawtooth', t: t }); },
    coin: function (t) { tone({ f: 988, dur: 0.09, v: 0.13, type: 'square', t: t }); tone({ f: 1319, dur: 0.16, v: 0.11, type: 'square', t: t + 0.08 }); },
    unlock: function (t) { chord([72, 76, 79, 84], t, 0.35, 0.09, 'triangle'); chord([74, 79, 83, 86], t + 0.16, 0.45, 0.08, 'triangle'); },
    trophy: function (t) { chord([60, 64, 67, 72], t, 0.5, 0.09, 'sawtooth'); chord([65, 69, 72, 77], t + 0.28, 0.6, 0.09, 'triangle'); chord([67, 72, 76, 79], t + 0.56, 0.9, 0.1, 'triangle'); },
    kick: function (t) { noise({ t: t, dur: 0.09, f: 900, f2: 300, v: 0.36, filter: 'lowpass' }); tone({ f: 165, f2: 72, dur: 0.11, v: 0.32, type: 'sine', t: t }); },
    kickHard: function (t) { noise({ t: t, dur: 0.14, f: 1500, f2: 260, v: 0.46, filter: 'lowpass' }); tone({ f: 190, f2: 58, dur: 0.19, v: 0.42, type: 'sine', t: t }); tone({ f: 740, f2: 300, dur: 0.09, v: 0.1, type: 'square', t: t }); },
    header: function (t) { noise({ t: t, dur: 0.1, f: 700, f2: 240, v: 0.3, filter: 'bandpass' }); tone({ f: 240, f2: 110, dur: 0.12, v: 0.25, type: 'triangle', t: t }); },
    perfect: function (t) { chord([76, 83, 88], t, 0.28, 0.12, 'triangle'); noise({ t: t, dur: 0.16, f: 3200, f2: 800, v: 0.12, filter: 'highpass' }); },
    bounce: function (t) { tone({ f: 210, f2: 95, dur: 0.08, v: 0.15, type: 'sine', t: t }); noise({ t: t, dur: 0.05, f: 480, v: 0.1, filter: 'lowpass' }); },
    post: function (t) { tone({ f: 1180, dur: 0.5, v: 0.18, type: 'sine', t: t }); tone({ f: 1770, dur: 0.35, v: 0.09, type: 'sine', t: t }); tone({ f: 2360, dur: 0.22, v: 0.05, type: 'sine', t: t }); },
    net: function (t) { noise({ t: t, dur: 0.32, f: 2600, f2: 700, v: 0.17, filter: 'bandpass', q: 0.6 }); },
    save: function (t) { noise({ t: t, dur: 0.12, f: 1100, f2: 350, v: 0.24, filter: 'bandpass' }); tone({ f: 320, f2: 520, dur: 0.16, v: 0.12, type: 'triangle', t: t }); },
    tackle: function (t) { noise({ t: t, dur: 0.18, f: 420, f2: 130, v: 0.32, filter: 'lowpass' }); tone({ f: 130, f2: 60, dur: 0.16, v: 0.24, type: 'square', t: t }); },
    jump: function (t) { tone({ f: 280, f2: 560, dur: 0.13, v: 0.12, type: 'triangle', t: t }); },
    land: function (t) { noise({ t: t, dur: 0.08, f: 320, v: 0.13, filter: 'lowpass' }); },
    dash: function (t) { noise({ t: t, dur: 0.2, f: 380, f2: 2100, v: 0.14, filter: 'bandpass' }); },
    whistle: function (t) { tone({ f: 2100, f2: 2450, dur: 0.3, v: 0.14, type: 'sine', t: t }); tone({ f: 2600, f2: 2200, dur: 0.28, v: 0.08, type: 'sine', t: t + 0.02 }); },
    whistleEnd: function (t) { SFX.whistle(t); SFX.whistle(t + 0.36); },
    countdown: function (t) { tone({ f: 660, dur: 0.13, v: 0.14, type: 'square', t: t }); },
    go: function (t) { tone({ f: 880, dur: 0.28, v: 0.17, type: 'square', t: t }); tone({ f: 1320, dur: 0.3, v: 0.1, type: 'triangle', t: t }); },
    tick: function (t) { tone({ f: 1200, dur: 0.06, v: 0.09, type: 'square', t: t }); },
    goal: function (t) { SFX.net(t); A.cheer(1.5); chord([60, 64, 67, 72], t + 0.06, 0.35, 0.1, 'sawtooth'); chord([62, 65, 69, 74], t + 0.24, 0.5, 0.09, 'triangle'); },
    power: function (t) { tone({ f: 180, f2: 880, dur: 0.32, v: 0.16, type: 'sawtooth', t: t }); noise({ t: t, dur: 0.3, f: 400, f2: 3200, v: 0.11, filter: 'bandpass' }); },
    freeze: function (t) { chord([84, 88, 91, 96], t, 0.55, 0.08, 'sine'); noise({ t: t, dur: 0.4, f: 5200, f2: 2000, v: 0.09, filter: 'highpass' }); },
    fire: function (t) { noise({ t: t, dur: 0.55, f: 260, f2: 1500, v: 0.24, filter: 'bandpass', q: 0.4, decay: false, pow: 0.4 }); },
    ice: function (t) { chord([90, 93, 97], t, 0.4, 0.06, 'sine'); noise({ t: t, dur: 0.3, f: 4200, v: 0.07, filter: 'highpass' }); },
    shield: function (t) { tone({ f: 320, f2: 640, dur: 0.4, v: 0.13, type: 'triangle', t: t }); tone({ f: 480, f2: 960, dur: 0.35, v: 0.07, type: 'sine', t: t }); },
    quake: function (t) { tone({ f: 62, f2: 34, dur: 0.7, v: 0.35, type: 'sine', t: t }); noise({ t: t, dur: 0.6, f: 160, v: 0.18, filter: 'lowpass' }); },
    teleport: function (t) { tone({ f: 300, f2: 1800, dur: 0.22, v: 0.12, type: 'sine', t: t }); tone({ f: 1800, f2: 300, dur: 0.22, v: 0.09, type: 'sine', t: t + 0.18 }); },
    charge: function (t) { tone({ f: 240, f2: 480, dur: 0.18, v: 0.07, type: 'triangle', t: t }); },
    win: function (t) { chord([60, 64, 67], t, 0.25, 0.11, 'triangle'); chord([62, 65, 69], t + 0.22, 0.25, 0.11, 'triangle'); chord([64, 67, 72, 76], t + 0.44, 0.8, 0.13, 'triangle'); A.cheer(1.2); },
    lose: function (t) { chord([64, 61, 57, 52], t, 0.6, 0.1, 'sawtooth'); tone({ f: 180, f2: 90, dur: 0.7, v: 0.09, type: 'triangle', t: t + 0.2 }); },
    draw: function (t) { chord([60, 64, 67], t, 0.4, 0.09, 'triangle'); chord([60, 63, 67], t + 0.35, 0.5, 0.08, 'triangle'); },
    card: function (t) { noise({ t: t, dur: 0.12, f: 1800, f2: 700, v: 0.13, filter: 'highpass' }); tone({ f: 520, f2: 780, dur: 0.14, v: 0.08, type: 'triangle', t: t }); },
    scratch: function (t) { noise({ t: t, dur: 0.16, f: 2600, v: 0.14, filter: 'bandpass', q: 1.4 }); },
    pack: function (t) { noise({ t: t, dur: 0.35, f: 700, f2: 2600, v: 0.15, filter: 'bandpass' }); chord([72, 76, 79], t + 0.18, 0.4, 0.09, 'triangle'); },
    toggle: function (t) { tone({ f: 480, f2: 700, dur: 0.06, v: 0.1, type: 'square', t: t }); },
    penaltyScore: function (t) { SFX.net(t); SFX.goal(t); },
    penaltyMiss: function (t) { tone({ f: 300, f2: 150, dur: 0.3, v: 0.14, type: 'sawtooth', t: t }); },
    keeper: function (t) { noise({ t: t, dur: 0.16, f: 600, f2: 180, v: 0.18, filter: 'lowpass' }); }
  };
  A.play = function (name, opts) {
    if (!ready || !volSfx) return;
    var f = SFX[name]; if (!f) return;
    var t = now() + ((opts && opts.delay) || 0);
    try { f(t, opts || {}); } catch (e) { }
  };

  /* --- music sequencer: 16th-note scheduler with lookahead --- */
  var SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
  var THEMES = {
    menu: { bpm: 112, root: 57, wave: 'triangle', prog: [0, 5, 3, 4], bass: [0, -1, 0, -1, 5, -1, 5, -1, 3, -1, 3, -1, 4, -1, 4, -1], lead: [12, -1, 9, -1, 7, -1, 9, -1, 12, -1, 14, -1, 12, -1, 7, -1] },
    match: { bpm: 138, root: 50, wave: 'sawtooth', prog: [0, 3, 5, 4], bass: [0, 0, -1, 0, 7, -1, 0, -1, 5, 5, -1, 5, 3, -1, 4, -1], lead: [-1, 12, -1, 14, 12, -1, 9, -1, -1, 7, 9, -1, 12, -1, 9, -1] },
    tense: { bpm: 126, root: 45, wave: 'square', prog: [0, 1, 0, 6], bass: [0, -1, 0, -1, 0, -1, 0, -1, 1, -1, 1, -1, 0, -1, 6, -1], lead: [0, -1, -1, 3, -1, -1, 7, -1, 0, -1, -1, 6, -1, -1, 3, -1] },
    victory: { bpm: 120, root: 60, wave: 'triangle', prog: [0, 4, 5, 0], bass: [0, -1, 7, -1, 4, -1, 7, -1, 5, -1, 9, -1, 0, -1, 7, -1], lead: [12, 16, 19, 16, 14, 16, 19, -1, 17, 21, 24, 21, 19, 16, 12, -1] },
    penalty: { bpm: 96, root: 48, wave: 'sine', prog: [0, 0, 1, 1], bass: [0, -1, -1, -1, 0, -1, -1, -1, 1, -1, -1, -1, 1, -1, -1, -1], lead: [-1, -1, 7, -1, -1, -1, 6, -1, -1, -1, 8, -1, -1, -1, 3, -1] }
  };
  function kick(t, v) { tone({ f: 130, f2: 42, dur: 0.16, v: v * 0.3, type: 'sine', t: t, bus: musicBus }); noise({ t: t, dur: 0.05, f: 1800, f2: 400, v: v * 0.06, filter: 'highpass', bus: musicBus }); }
  function snare(t, v) { noise({ t: t, dur: 0.13, f: 1500, v: v * 0.11, filter: 'bandpass', q: 0.7, bus: musicBus }); tone({ f: 190, f2: 120, dur: 0.09, v: v * 0.06, type: 'triangle', t: t, bus: musicBus }); }
  function hat(t, v) { noise({ t: t, dur: 0.035, f: 7200, v: v * 0.045, filter: 'highpass', bus: musicBus }); }
  function scheduleStep(i, t) {
    var cfg = THEMES[theme] || THEMES.menu, bar = Math.floor(stepIndex / 16) % 4;
    var chordRoot = cfg.root + cfg.prog[bar], v = 0.75 + intensity * 0.35;
    if (i % 4 === 0) kick(t, v);
    if (i === 4 || i === 12) snare(t, v);
    if (i % 2 === 0 || (intensity > 0.6 && i % 2 === 1)) hat(t, v);
    var b = cfg.bass[i];
    if (b >= 0) tone({ f: freq(chordRoot - 12 + b), t: t, dur: 0.22, v: 0.1 * v, type: 'square', bus: musicBus });
    var l = cfg.lead[i];
    if (l >= 0) {
      tone({ f: freq(chordRoot + 12 + l), t: t, dur: 0.19, v: 0.055 * v, type: cfg.wave, bus: musicBus });
      if (intensity > 0.5) tone({ f: freq(chordRoot + 19 + l), t: t + 0.01, dur: 0.12, v: 0.02, type: 'sine', bus: musicBus });
    }
    if (i === 0) chord([chordRoot, chordRoot + 4, chordRoot + 7], t, 0.5, 0.033 * v, 'triangle', musicBus);
    stepIndex++;
    if (stepIndex % 16 === 0) barCount++;
  }
  A.music = function (name) {
    if (!name || name === theme) return;
    theme = THEMES[name] ? name : 'menu';
    stepIndex = 0; barCount = 0;
    nextStep = now() + 0.06;
  };
  A.setIntensity = function (v) { intensity = U.clamp(v, 0, 1); };
  A.update = function () {
    if (!ready || !musicOn || ctx.state !== 'running') return;
    var cfg = THEMES[theme] || THEMES.menu;
    var bpm = cfg.bpm * (1 + intensity * 0.12);
    var stepDur = 60 / bpm / 4;
    var horizon = now() + 0.18;
    if (nextStep < now() - 0.5) nextStep = now() + 0.02;
    var guard = 0;
    while (nextStep < horizon && guard++ < 16) {
      scheduleStep(stepIndex % 16, nextStep);
      nextStep += stepDur;
    }
  };
  A.state = function () { return { ready: ready, theme: theme }; };
})(window.HB = window.HB || {});
