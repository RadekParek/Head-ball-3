/* Head Ball 3 - immediate-mode canvas UI framework.
 * One code path for touch, pen and mouse, with multi-touch-safe hit regions,
 * inertial scrolling, sliders, toasts and modal dialogs. */
(function (HB) {
  'use strict';
  var U = HB.U, C = HB.C, Art = HB.Art, Audio = HB.Audio;
  var UI = HB.UI = {
    screen: 'splash', stack: [], params: {}, regions: [], byId: {}, states: {},
    g: null, toasts: [], modal: null, trans: 0, transMax: 0.3,
    _offsetX: 0, _offsetY: 0, _clip: null, screens: {},
    pointer: { x: -1, y: -1 }
  };

  UI.st = function (id) { return UI.states[id] || (UI.states[id] = { off: 0, vel: 0, drag: null, moved: 0, press: false, hover: false, t: 0 }); };
  UI.begin = function (g) { UI.g = g; UI.regions = []; UI.byId = {}; UI._offsetX = 0; UI._offsetY = 0; UI._clip = null; };
  UI.region = function (id, r, onClick, kind, data) {
    var rr = { id: id, x: r.x + UI._offsetX, y: r.y + UI._offsetY, w: r.w, h: r.h, onClick: onClick, kind: kind || 'button', clip: UI._clip, data: data || null };
    UI.regions.push(rr); UI.byId[id] = rr; return rr;
  };
  UI.hit = function (id, r, onClick) { return UI.region(id, r, onClick, 'button'); };

  UI.go = function (name, params) {
    if (UI.screens[UI.screen] && UI.screens[UI.screen].leave) UI.screens[UI.screen].leave();
    UI.stack.push({ name: UI.screen, params: UI.params });
    if (UI.stack.length > 16) UI.stack.shift();
    UI.screen = name; UI.params = params || {}; UI.modal = null;
    UI.trans = UI.transMax;
    if (UI.screens[name] && UI.screens[name].enter) UI.screens[name].enter(UI.params);
    Audio.play('ui');
  };
  UI.replace = function (name, params) {
    if (UI.stack.length) UI.stack.pop();
    UI.go(name, params);
  };
  UI.back = function (fallback) {
    var prev = UI.stack.pop();
    var name = prev ? prev.name : (fallback || 'home');
    UI.screen = name; UI.params = prev ? prev.params : {}; UI.modal = null;
    UI.trans = UI.transMax;
    if (UI.screens[name] && UI.screens[name].enter) UI.screens[name].enter(UI.params);
    Audio.play('back');
  };

  /* ---- input event handling against last frame's regions ---- */
  function topAt(x, y) {
    for (var i = UI.regions.length - 1; i >= 0; i--) {
      var r = UI.regions[i];
      if (!U.hit(x, y, r)) continue;
      if (r.clip && !U.hit(x, y, r.clip)) continue;
      return r;
    }
    return null;
  }
  UI.handle = function (events) {
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      UI.pointer.x = e.x; UI.pointer.y = e.y;
      if (e.type === 'down') {
        Audio.unlock();
        var r = topAt(e.x, e.y);
        UI.press = { id: e.id, region: r ? r.id : null, x: e.x, y: e.y, moved: 0 };
        if (r) {
          var s = UI.st(r.id); s.press = true;
          if (r.kind === 'scroll') { s.drag = e.id; s.lastY = e.y; s.moved = 0; s.vel = 0; }
          if (r.kind === 'slider') { s.drag = e.id; sliderSet(r, e.x); }
        }
      } else if (e.type === 'move') {
        var p = UI.press;
        if (p && p.id === e.id) p.moved += Math.abs(e.dx) + Math.abs(e.dy);
        if (p && p.region) {
          var s2 = UI.st(p.region), r2 = UI.byId[p.region];
          if (r2 && r2.kind === 'scroll' && s2.drag === e.id) {
            s2.off = U.clamp(s2.off - e.dy, 0, Math.max(0, r2.data.max));
            s2.vel = -e.dy * 30; s2.moved += Math.abs(e.dy);
          }
          if (r2 && r2.kind === 'slider' && s2.drag === e.id) sliderSet(r2, e.x);
        }
      } else if (e.type === 'up') {
        var pr = UI.press;
        if (pr) {
          var s3 = UI.st(pr.region); s3.press = false;
          if (s3.drag === e.id) s3.drag = null;
          var r3 = UI.byId[pr.region];
          var still = r3 && U.hit(e.x, e.y, r3) && (!r3.clip || U.hit(e.x, e.y, r3.clip));
          var dragged = (pr.moved > 14) || (s3.moved > 14) || e.moved > 14;
          if (!e.cancel && still && !dragged && r3 && r3.onClick && r3.kind === 'button') {
            Audio.play('select'); HB.Input.vibrate(8);
            r3.onClick();
          }
        }
        UI.press = null;
      }
    }
    /* hover state (mouse / pen) */
    if (UI.pointer.x >= 0) {
      var h = topAt(UI.pointer.x, UI.pointer.y);
      UI.hoverId = h ? h.id : null;
    }
  };
  function sliderSet(r, x) {
    var v = U.clamp((x - r.x) / r.w, 0, 1);
    if (r.data && r.data.onChange) r.data.onChange(v);
  }
  UI.isPressed = function (id) { return !!(UI.states[id] && UI.states[id].press); };
  UI.isHover = function (id) { return UI.hoverId === id; };

  UI.update = function (dt) {
    if (UI.trans > 0) UI.trans = Math.max(0, UI.trans - dt);
    for (var id in UI.states) {
      var s = UI.states[id];
      if (s.vel && !s.drag) {
        s.off = U.clamp(s.off + s.vel * dt, 0, Math.max(0, (s.max || 0)));
        s.vel *= Math.pow(0.02, dt);
        if (Math.abs(s.vel) < 8) s.vel = 0;
      }
      if (s.press) s.t += dt;
    }
    for (var i = UI.toasts.length - 1; i >= 0; i--) {
      UI.toasts[i].life -= dt;
      if (UI.toasts[i].life <= 0) UI.toasts.splice(i, 1);
    }
    if (UI.modal) UI.modal.t = (UI.modal.t || 0) + dt;
  };
  HB.on('toast', function (o) {
    UI.toasts.push({ text: o.text, kind: o.kind, life: 2.6, max: 2.6 });
    if (UI.toasts.length > 4) UI.toasts.shift();
  });

  /* ---- shared widgets ---- */
  UI.button = function (id, r, label, o) {
    o = o || {};
    var g = UI.g, x = r.x + UI._offsetX, y = r.y + UI._offsetY;
    var pressed = UI.isPressed(id), hover = UI.isHover(id);
    var col = o.color || C.gold;
    var lift = pressed ? 3 : hover ? -1 : 0;
    var alpha = o.disabled ? 0.42 : 1;
    g.save(); g.globalAlpha = alpha;
    var fill = o.primary ? col : U.alpha(col, pressed ? 0.85 : 0.28);
    Art.panel(g, x, y + lift, r.w, r.h, o.radius || 16, {
      fill: fill, fill2: o.primary ? U.shade(col, -0.25) : U.alpha(C.ink, 0.72),
      gradient: true, stroke: o.primary ? U.alpha('#ffffff', 0.55) : U.alpha(col, 0.6),
      strokeW: o.primary ? 2 : 1.6, gloss: true, shadowBlur: pressed ? 5 : 12, shadowY: 4
    });
    var tx = x + r.w / 2, ty = y + lift + r.h / 2;
    if (o.icon) {
      Art.icon(g, o.icon, tx, ty - (label ? r.h * 0.14 : 0), o.iconSize || Math.min(r.w, r.h) * 0.5, o.primary ? C.ink : '#ffffff');
      if (label) Art.text(g, label, tx, y + lift + r.h - 15, Math.min(14, r.h * 0.2), o.primary ? C.ink : C.paper, 'center', '900', { shadow: false });
    } else if (label) {
      Art.text(g, label, tx, ty, o.fontSize || Math.min(22, r.h * 0.36), o.primary ? C.ink : C.paper, 'center', '900', { shadow: o.primary, maxWidth: r.w - 12 });
    }
    if (o.badge) { Art.circle(g, x + r.w - 10, y + 10, 13, C.red); Art.text(g, o.badge, x + r.w - 10, y + 10, 12, '#ffffff', 'center', '900', { shadow: false }); }
    g.restore();
    if (!o.disabled) UI.region(id, r, o.onClick || null, 'button');
    else UI.byId[id] = { id: id, x: x, y: y, w: r.w, h: r.h, kind: 'disabled' };
  };
  UI.iconButton = function (id, r, icon, o) { o = o || {}; o.icon = icon; return UI.button(id, r, o.label || null, o); };
  UI.panel = function (x, y, w, h, o) { Art.panel(UI.g, x + UI._offsetX, y + UI._offsetY, w, h, (o && o.radius) || 18, o || {}); };
  UI.text = function (str, x, y, size, color, align, weight, o) { Art.text(UI.g, str, x + UI._offsetX, y + UI._offsetY, size, color, align, weight, o); };
  UI.icon = function (name, x, y, size, color) { Art.icon(UI.g, name, x + UI._offsetX, y + UI._offsetY, size, color); };
  UI.chip = function (x, y, w, h, label, color, icon) {
    var g = UI.g;
    Art.fillRR(g, x + UI._offsetX, y + UI._offsetY, w, h, h / 2, U.alpha(color, 0.2));
    if (icon) Art.icon(g, icon, x + UI._offsetX + h / 2, y + UI._offsetY + h / 2, h * 0.55, color);
    Art.text(g, label, x + UI._offsetX + w / 2 + (icon ? 8 : 0), y + UI._offsetY + h / 2, h * 0.42, color, 'center', '900', { shadow: false });
  };
  UI.tabs = function (id, x, y, w, h, labels, current, onPick) {
    var n = labels.length, tw = w / n;
    for (var i = 0; i < n; i++) {
      var r = { x: x + i * tw + 3, y: y, w: tw - 6, h: h };
      var active = i === current;
      Art.fillRR(UI.g, r.x, r.y, r.w, r.h, 12, active ? U.alpha(C.gold, 0.9) : 'rgba(255,255,255,0.07)');
      Art.text(UI.g, labels[i], r.x + r.w / 2, r.y + r.h / 2, Math.min(16, h * 0.42), active ? C.ink : U.alpha(C.paper, 0.75), 'center', '900', { shadow: false });
      UI.region(id + '.' + i, r, (function (idx) { return function () { onPick(idx); }; })(i), 'button');
    }
  };
  UI.slider = function (id, r, value, onChange, color) {
    var g = UI.g, x = r.x + UI._offsetX, y = r.y + UI._offsetY;
    Art.fillRR(g, x, y + r.h / 2 - 7, r.w, 14, 7, 'rgba(4,12,28,0.8)');
    Art.fillRR(g, x, y + r.h / 2 - 7, r.w * value, 14, 7, color || C.cyan);
    Art.circle(g, x + r.w * value, y + r.h / 2, 14, '#ffffff');
    Art.circle(g, x + r.w * value, y + r.h / 2, 8, color || C.cyan);
    UI.region(id, r, null, 'slider', { onChange: onChange });
  };
  UI.scroll = function (id, r, contentH, drawFn) {
    var g = UI.g, s = UI.st(id);
    var max = Math.max(0, contentH - r.h);
    s.max = max; s.off = U.clamp(s.off, 0, max);
    UI.region(id, { x: r.x, y: r.y, w: r.w, h: r.h }, null, 'scroll', { max: max });
    g.save();
    Art.rr(g, r.x + UI._offsetX, r.y + UI._offsetY, r.w, r.h, 12); g.clip();
    var ox = UI._offsetX, oy = UI._offsetY, clip = UI._clip;
    UI._offsetY = oy - s.off;
    UI._clip = { x: r.x + ox, y: r.y + oy, w: r.w, h: r.h };
    drawFn(g, s.off, s.off + r.h);
    UI._offsetX = ox; UI._offsetY = oy; UI._clip = clip;
    g.restore();
    if (max > 0) {
      var bh = Math.max(28, r.h * r.h / contentH);
      var by = r.y + (r.h - bh) * (s.off / max);
      Art.fillRR(g, r.x + r.w - 6, r.y, 4, r.h, 2, 'rgba(255,255,255,0.07)');
      Art.fillRR(g, r.x + r.w - 6, by, 4, bh, 2, U.alpha(C.gold, 0.7));
    }
  };
  UI.confirm = function (title, text, onYes, yesLabel, onNo) {
    UI.modal = { type: 'confirm', title: title, text: text, onYes: onYes, yesLabel: yesLabel || 'OK', onNo: onNo, t: 0 };
  };
  UI.reveal = function (title, cards) { UI.modal = { type: 'cards', title: title, cards: cards, t: 0 }; };

  /* ---- frame drawing ---- */
  UI.menuBackground = function (g) {
    var V = HB.V, w = V.w, h = V.h, t = HB.clock;
    var bg = g.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#0a1730'); bg.addColorStop(0.55, '#122a56'); bg.addColorStop(1, '#081226');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    var glow = g.createRadialGradient(w * 0.5, h * 0.1, 20, w * 0.5, h * 0.5, w * 0.75);
    glow.addColorStop(0, U.alpha(C.blue, 0.22)); glow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = glow; g.fillRect(0, 0, w, h);
    g.save(); g.globalAlpha = 0.05; g.strokeStyle = '#ffffff'; g.lineWidth = 26;
    for (var i = -2; i < 14; i++) {
      var x = i * 120 + (t * 9) % 120;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 300, h); g.stroke();
    }
    g.restore();
    for (var b = 0; b < 7; b++) {
      var bx = (b * 311 + t * (12 + b * 3)) % (w + 200) - 100;
      var by = 80 + ((b * 173) % Math.max(100, h - 200)) + Math.sin(t * 0.7 + b) * 20;
      g.globalAlpha = 0.08;
      Art.circle(g, bx, by, 26 + (b % 3) * 12, '#ffffff');
    }
    g.globalAlpha = 1;
  };
  UI.profileBar = function (g) {
    var V = HB.V, w = V.w, s = HB.Save.data;
    Art.panel(g, 18, 12, Math.min(470, w * 0.42), 68, 18, { fill: 'rgba(9,20,42,0.8)', stroke: U.alpha(C.gold, 0.3) });
    Art.crest(g, String(s.level), 52, 46, 46, C.gold);
    Art.text(g, s.name, 88, 34, 19, C.paper, 'left', '900', { maxWidth: 220 });
    var xp = HB.Meta.xpProgress();
    Art.fillRR(g, 88, 52, 150, 9, 4, 'rgba(255,255,255,0.16)');
    Art.fillRR(g, 88, 52, 150 * xp.t, 9, 4, C.cyan);
    Art.text(g, 'LV ' + s.level, 246, 56, 12, U.alpha(C.paper, 0.7), 'left', '800', { shadow: false });
    var x0 = 268;
    UI.iconRaw(g, 'coin', x0 + 12, 34, 18, C.gold); Art.text(g, U.fmtNum(s.coins), x0 + 28, 34, 16, C.paper, 'left', '900', { shadow: false });
    UI.iconRaw(g, 'gem', x0 + 12, 60, 18, C.pink); Art.text(g, U.fmtNum(s.gems), x0 + 28, 60, 16, C.paper, 'left', '900', { shadow: false });
    UI.iconRaw(g, 'users', x0 + 145, 34, 18, C.teal); Art.text(g, U.fmtNum(s.fans), x0 + 161, 34, 16, C.paper, 'left', '900', { shadow: false });
  };
  UI.iconRaw = function (g, name, x, y, size, color) { Art.icon(g, name, x, y, size, color); };
  UI.header = function (g, title, sub) {
    var V = HB.V, w = V.w;
    Art.text(g, title, w / 2, 126, 34, C.paper, 'center', '900', { outline: 'rgba(0,0,0,0.3)', outlineW: 6, glow: U.alpha(C.blue, 0.6) });
    if (sub) Art.text(g, sub, w / 2, 158, 15, U.alpha(C.mist, 0.9), 'center', '800', { shadow: false });
    UI.iconButton('ui.back', { x: 18, y: 92, w: 62, h: 54 }, 'back', { color: C.blue, onClick: function () { UI.back('home'); } });
  };
  UI.nav = function (g) {
    var V = HB.V, w = V.w, h = V.h;
    var items = [
      { id: 'home', icon: 'play', label: 'HOME' },
      { id: 'locker', icon: 'jersey', label: 'LOCKER' },
      { id: 'shop', icon: 'shop', label: 'SHOP' },
      { id: 'progress', icon: 'trophy', label: 'PROGRESS' },
      { id: 'settings', icon: 'settings', label: 'SETTINGS' }
    ];
    var bw = Math.min(150, (w - 40) / items.length), total = bw * items.length, x0 = (w - total) / 2;
    Art.panel(g, x0 - 8, h - 82, total + 16, 72, 20, { fill: 'rgba(8,18,38,0.9)', stroke: 'rgba(255,255,255,0.12)' });
    for (var i = 0; i < items.length; i++) {
      var it = items[i], r = { x: x0 + i * bw + 4, y: h - 74, w: bw - 8, h: 56 };
      var active = UI.screen === it.id;
      if (active) Art.fillRR(g, r.x, r.y, r.w, r.h, 14, U.alpha(C.gold, 0.16));
      Art.icon(g, it.icon, r.x + r.w / 2, r.y + 20, 24, active ? C.gold : U.alpha(C.paper, 0.6));
      Art.text(g, it.label, r.x + r.w / 2, r.y + 43, 11, active ? C.gold : U.alpha(C.paper, 0.6), 'center', '900', { shadow: false });
      UI.region('nav.' + it.id, r, (function (name) { return function () { if (UI.screen !== name) { UI.stack.length = 0; UI.replace(name); } }; })(it.id), 'button');
    }
  };
  UI.section = function (x, y, w, h, title) {
    Art.panel(UI.g, x + UI._offsetX, y + UI._offsetY, w, h, 18, { fill: 'rgba(10,24,50,0.78)', stroke: 'rgba(255,255,255,0.1)' });
    if (title) Art.text(UI.g, title, x + UI._offsetX + 18, y + UI._offsetY + 22, 17, C.gold, 'left', '900');
  };
  UI.rowButton = function (id, r, title, sub, right, color, onClick, disabled) {
    var g = UI.g, x = r.x + UI._offsetX, y = r.y + UI._offsetY;
    Art.fillRR(g, x, y, r.w, r.h, 14, disabled ? 'rgba(255,255,255,0.04)' : U.alpha(color || C.blue, UI.isPressed(id) ? 0.34 : 0.14));
    Art.text(g, title, x + 16, y + r.h / 2 - (sub ? 10 : 0), 17, C.paper, 'left', '900');
    if (sub) Art.text(g, sub, x + 16, y + r.h / 2 + 13, 12, U.alpha(C.mist, 0.85), 'left', '800', { shadow: false });
    if (right) Art.text(g, right, x + r.w - 16, y + r.h / 2, 16, color || C.gold, 'right', '900');
    if (!disabled) UI.region(id, r, onClick, 'button');
  };
  UI.render = function (g, dt) {
    UI.begin(g);
    var screen = UI.screens[UI.screen] || UI.screens.home;
    if (screen.draw) screen.draw(g, dt);
    /* toasts */
    for (var i = 0; i < UI.toasts.length; i++) {
      var t = UI.toasts[i], a = U.clamp(t.life / 0.35, 0, 1) * U.clamp((t.max - t.life) / 0.2, 0, 1);
      var col = t.kind === 'error' ? C.red : t.kind === 'power' ? C.purple : t.kind === 'info' ? C.cyan : C.gold;
      var tw = Math.min(520, HB.V.w - 60), tx = (HB.V.w - tw) / 2, ty = 182 + i * 52;
      g.globalAlpha = a;
      Art.panel(g, tx, ty, tw, 44, 14, { fill: 'rgba(8,18,38,0.95)', stroke: U.alpha(col, 0.8) });
      Art.icon(g, t.kind === 'error' ? 'close' : t.kind === 'power' ? 'power' : 'info', tx + 28, ty + 22, 22, col);
      Art.text(g, t.text, tx + tw / 2 + 12, ty + 22, 16, C.paper, 'center', '900', { shadow: false });
      g.globalAlpha = 1;
    }
    if (UI.modal) UI.drawModal(g);
    if (UI.trans > 0) {
      var f = UI.trans / UI.transMax;
      g.globalAlpha = U.smooth(f) * 0.85;
      g.fillStyle = '#061020'; g.fillRect(0, 0, HB.V.w, HB.V.h);
      g.globalAlpha = 1;
    }
  };
  UI.drawModal = function (g) {
    var V = HB.V, w = V.w, h = V.h, m = UI.modal;
    g.fillStyle = 'rgba(3,9,22,0.78)'; g.fillRect(0, 0, w, h);
    var pw = Math.min(620, w - 60), ph = m.type === 'cards' ? 430 : 250;
    var px = (w - pw) / 2, py = (h - ph) / 2;
    Art.panel(g, px, py, pw, ph, 24, { fill: C.navy2, stroke: U.alpha(C.gold, 0.6), gradient: true, fill2: C.navy, shadowBlur: 30 });
    if (m.type === 'confirm') {
      Art.text(g, m.title, px + pw / 2, py + 54, 28, C.gold, 'center', '900');
      Art.text(g, m.text, px + pw / 2, py + 112, 17, C.paper, 'center', '800', { maxWidth: pw - 60 });
      UI.button('modal.yes', { x: px + pw / 2 - 170, y: py + ph - 82, w: 160, h: 54 }, m.yesLabel, {
        primary: true, onClick: function () { var f = m.onYes; UI.modal = null; if (f) f(); }
      });
      UI.button('modal.no', { x: px + pw / 2 + 10, y: py + ph - 82, w: 160, h: 54 }, 'CANCEL', {
        color: C.blue, onClick: function () { var f = m.onNo; UI.modal = null; if (f) f(); }
      });
    } else if (m.type === 'cards') {
      Art.text(g, m.title, px + pw / 2, py + 38, 26, C.gold, 'center', '900');
      var n = Math.min(m.cards.length, 5), cw = Math.min(100, (pw - 60) / n - 10), gap = 12;
      var totalW = n * cw + (n - 1) * gap, sx = px + (pw - totalW) / 2;
      for (var i = 0; i < n; i++) {
        var card = m.cards[i], cx = sx + i * (cw + gap), reveal = U.clamp((m.t - i * 0.22) * 2.2, 0, 1);
        var sc = 0.7 + U.easeBack(reveal) * 0.3;
        g.save(); g.translate(cx + cw / 2, py + 160); g.scale(sc, sc);
        Art.panel(g, -cw / 2, -70, cw, 140, 12, { fill: U.alpha(card.color, 0.3), stroke: card.color, gradient: true, fill2: C.navy });
        if (reveal > 0.5) {
          Art.icon(g, 'star', 0, -36, 30, card.color);
          Art.text(g, card.name.split(' ')[0], 0, 8, 13, C.paper, 'center', '900', { maxWidth: cw - 8 });
          Art.text(g, 'x' + card.amount + ' CARD' + (card.amount > 1 ? 'S' : ''), 0, 40, 11, C.gold, 'center', '900', { shadow: false });
          if (card.unlocked) Art.text(g, 'UNLOCKED!', 0, 58, 10, C.teal, 'center', '900', { shadow: false });
        } else Art.text(g, '?', 0, 0, 44, U.alpha('#ffffff', 0.4), 'center', '900');
        g.restore();
      }
      var extra = m.cards.length - n;
      if (extra > 0) Art.text(g, '+' + extra + ' more cards added to your collection', px + pw / 2, py + 270, 15, C.mist, 'center', '800');
      Art.text(g, 'Cards are used to unlock and level up characters.', px + pw / 2, py + 300, 14, U.alpha(C.mist, 0.8), 'center', '800');
      UI.button('modal.collect', { x: px + pw / 2 - 100, y: py + ph - 74, w: 200, h: 52 }, 'COLLECT', { primary: true, onClick: function () { UI.modal = null; } });
    }
  };
})(window.HB = window.HB || {});
