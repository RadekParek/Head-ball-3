/* Head Ball 3 - all artwork is drawn with Canvas2D vector primitives.
 * Nothing is loaded from disk: no sprite sheets, no fonts, no photos.
 * Static stadium layers are cached once per resize into an offscreen canvas. */
(function (HB) {
  'use strict';
  var U = HB.U, C = HB.C, W = HB.WORLD;
  var Art = HB.Art = {};

  function makeCanvas(w, h) {
    var cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(w)); cv.height = Math.max(1, Math.ceil(h));
    return cv;
  }
  Art.makeCanvas = makeCanvas;

  Art.rr = function (g, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
  };
  Art.fillRR = function (g, x, y, w, h, r, fill) { Art.rr(g, x, y, w, h, r); g.fillStyle = fill; g.fill(); };
  Art.ellipse = function (g, x, y, rx, ry, fill) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } };
  Art.circle = function (g, x, y, r, fill) { Art.ellipse(g, x, y, r, r, fill); };
  Art.line = function (g, x1, y1, x2, y2, color, width) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokeStyle = color; g.lineWidth = width || 2; g.stroke(); };

  Art.text = function (g, str, x, y, size, color, align, weight, o) {
    o = o || {};
    g.save();
    g.font = (weight || '800') + ' ' + size + 'px ' + HB.FONT;
    g.textAlign = align || 'center'; g.textBaseline = 'middle';
    if (o.alpha != null) g.globalAlpha *= o.alpha;
    if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = o.glowSize || 14; }
    else if (o.shadow !== false) { g.shadowColor = 'rgba(4,10,24,0.45)'; g.shadowBlur = o.shadowSize || 4; g.shadowOffsetY = o.shadowY || 2; }
    if (o.outline) {
      g.lineJoin = 'round'; g.lineWidth = o.outlineW || Math.max(2, size * 0.13);
      g.strokeStyle = o.outline; g.strokeText(String(str), x, y, o.maxWidth);
      g.shadowColor = 'transparent';
    }
    g.fillStyle = color || C.paper;
    g.fillText(String(str), x, y, o.maxWidth);
    g.restore();
  };
  Art.panel = function (g, x, y, w, h, r, o) {
    o = o || {};
    g.save();
    if (o.shadow !== false) { g.shadowColor = o.shadowColor || 'rgba(4,10,24,0.45)'; g.shadowBlur = o.shadowBlur || 16; g.shadowOffsetY = o.shadowY || 5; }
    Art.rr(g, x, y, w, h, r == null ? 18 : r);
    if (o.gradient) {
      var gr = g.createLinearGradient(x, y, x, y + h);
      gr.addColorStop(0, o.fill || C.navy2); gr.addColorStop(1, o.fill2 || C.navy);
      g.fillStyle = gr;
    } else { g.fillStyle = o.fill || C.navy2; }
    g.fill();
    g.shadowColor = 'transparent';
    if (o.stroke) { g.lineWidth = o.strokeW || 2; g.strokeStyle = o.stroke; g.stroke(); }
    if (o.gloss) {
      g.save(); Art.rr(g, x, y, w, h, r == null ? 18 : r); g.clip();
      var gl = g.createLinearGradient(x, y, x, y + h * 0.5);
      gl.addColorStop(0, 'rgba(255,255,255,0.12)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gl; g.fillRect(x, y, w, h * 0.5); g.restore();
    }
    g.restore();
  };
  Art.shadow = function (g, x, y, rx, ry, a) {
    g.save(); g.globalAlpha *= (a == null ? 0.25 : a);
    Art.ellipse(g, x, y, rx, ry, '#061025'); g.restore();
  };

  /* ---------------- Icon library (24x24 design space) ---------------- */
  Art.icon = function (g, name, x, y, size, color) {
    var s = size / 24;
    g.save(); g.translate(x, y); g.scale(s, s);
    g.strokeStyle = color || C.paper; g.fillStyle = color || C.paper;
    g.lineWidth = 2.2; g.lineCap = 'round'; g.lineJoin = 'round';
    function p(pts, close, fill) {
      g.beginPath(); g.moveTo(pts[0][0] - 12, pts[0][1] - 12);
      for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0] - 12, pts[i][1] - 12);
      if (close) g.closePath();
      if (fill) g.fill(); else g.stroke();
    }
    function c(cx, cy, r, fill) { g.beginPath(); g.arc(cx - 12, cy - 12, r, 0, Math.PI * 2); fill ? g.fill() : g.stroke(); }
    function l(a, b, d, e) { g.beginPath(); g.moveTo(a - 12, b - 12); g.lineTo(d - 12, e - 12); g.stroke(); }
    function rr(a, b, w, h, r, fill) { Art.rr(g, a - 12, b - 12, w, h, r); fill ? g.fill() : g.stroke(); }
    switch (name) {
      case 'play': p([[9, 6], [9, 18], [19, 12]], true, true); break;
      case 'pause': rr(7, 6, 3.5, 12, 1, true); rr(13.5, 6, 3.5, 12, 1, true); break;
      case 'back': p([[15, 5], [7, 12], [15, 19]], false, false); break;
      case 'arrowLeft': case 'left': p([[15, 5], [7, 12], [15, 19]], false, false); break;
      case 'arrowRight': case 'right': p([[9, 5], [17, 12], [9, 19]], false, false); break;
      case 'up': p([[5, 15], [12, 7], [19, 15]], false, false); break;
      case 'down': p([[5, 9], [12, 17], [19, 9]], false, false); break;
      case 'arrows': p([[6, 12], [3, 12], [3, 8]], false, false); p([[18, 12], [21, 12], [21, 8]], false, false); l(3, 12, 9, 12); l(15, 12, 21, 12); break;
      case 'close': l(7, 7, 17, 17); l(17, 7, 7, 17); break;
      case 'plus': l(12, 6, 12, 18); l(6, 12, 18, 12); break;
      case 'minus': l(6, 12, 18, 12); break;
      case 'check': p([[5, 13], [10, 17], [19, 7]], false, false); break;
      case 'lock': rr(6, 11, 12, 9, 2, false); p([[8, 11], [8, 8], [12, 5], [16, 8], [16, 11]], false, false); c(12, 15, 1.2, true); break;
      case 'star': p([[12, 3], [14.6, 9.2], [21, 9.7], [16, 14], [17.6, 20.5], [12, 17], [6.4, 20.5], [8, 14], [3, 9.7], [9.4, 9.2]], true, true); break;
      case 'sparkle': p([[12, 3], [13.7, 10.3], [21, 12], [13.7, 13.7], [12, 21], [10.3, 13.7], [3, 12], [10.3, 10.3]], true, true); break;
      case 'coin': c(12, 12, 8.5, true); g.globalAlpha = 0.4; c(12, 12, 5.5, false); g.globalAlpha = 1; l(12, 8, 12, 16); break;
      case 'gem': p([[7, 8], [12, 4], [17, 8], [12, 20]], true, true); l(7, 8, 17, 8); break;
      case 'crown': p([[4, 16], [4, 8], [9, 12], [12, 6], [15, 12], [20, 8], [20, 16]], true, true); break;
      case 'trophy': p([[8, 5], [16, 5], [15, 12], [12, 14], [9, 12]], true, true); l(12, 14, 12, 18); l(8, 19, 16, 19); p([[8, 6], [4, 7], [5, 10], [8, 10]], false, false); p([[16, 6], [20, 7], [19, 10], [16, 10]], false, false); break;
      case 'medal': c(12, 15, 5, true); p([[8, 3], [8, 11], [12, 13]], false, false); p([[16, 3], [16, 11], [12, 13]], false, false); break;
      case 'ball': c(12, 12, 8.5, false); p([[12, 7], [16, 10], [14.5, 15], [9.5, 15], [8, 10]], true, true); l(12, 7, 9.5, 3.5); l(16, 10, 19, 8); l(14.5, 15, 16, 20); l(9.5, 15, 8, 20); l(8, 10, 5, 8); break;
      case 'goal': rr(4, 7, 16, 12, 1, false); for (var i = 7; i < 20; i += 3) l(4, i, 20, i); for (var j = 6; j < 21; j += 3) l(j, 7, j, 19); break;
      case 'boot': p([[4, 8], [9, 8], [9, 14], [16, 16], [19, 19], [4, 19]], true, true); break;
      case 'jersey': p([[8, 5], [4, 8], [6, 11], [7, 9], [7, 19], [17, 19], [17, 9], [18, 11], [20, 8], [16, 5], [12, 7]], true, true); break;
      case 'hat': p([[6, 12], [8, 6], [16, 6], [18, 12]], true, true); rr(4, 12, 16, 3, 1.5, true); break;
      case 'glasses': c(8.5, 12, 3.5, false); c(15.5, 12, 3.5, false); l(12, 12, 12, 12); l(5, 11, 3, 9); l(19, 11, 21, 9); break;
      case 'shop': p([[4, 9], [6, 5], [18, 5], [20, 9]], true, true); rr(5, 9, 14, 11, 1, false); l(9, 20, 9, 14); l(15, 20, 15, 14); break;
      case 'cards': rr(5, 6, 10, 14, 1.5, false); rr(9, 4, 10, 14, 1.5, true); break;
      case 'settings': c(12, 12, 3.2, false); for (var k = 0; k < 8; k++) { var a = k * Math.PI / 4; l(12 + Math.cos(a) * 5.5, 12 + Math.sin(a) * 5.5, 12 + Math.cos(a) * 9, 12 + Math.sin(a) * 9); } c(12, 12, 8, false); break;
      case 'chart': rr(5, 13, 3, 6, 1, true); rr(10.5, 9, 3, 10, 1, true); rr(16, 5, 3, 14, 1, true); break;
      case 'users': c(9, 9, 3.2, true); c(16, 9, 3.2, true); p([[3, 19], [3, 16], [9, 13], [15, 16], [15, 19]], true, true); break;
      case 'calendar': rr(4, 6, 16, 14, 2, false); l(4, 10, 20, 10); l(8, 4, 8, 8); l(16, 4, 16, 8); break;
      case 'gift': rr(4, 9, 16, 11, 1.5, true); rr(3, 7, 18, 4, 1, true); l(12, 7, 12, 20); p([[12, 7], [8, 3], [6, 6], [12, 7]], true, true); p([[12, 7], [16, 3], [18, 6], [12, 7]], true, true); break;
      case 'flag': l(6, 4, 6, 20); p([[6, 5], [18, 5], [15, 10], [18, 15], [6, 15]], true, true); break;
      case 'bolt': p([[13, 3], [6, 13], [11, 13], [9, 21], [18, 10], [13, 10]], true, true); break;
      case 'rocket': p([[12, 3], [16, 9], [16, 16], [12, 20], [8, 16], [8, 9]], true, true); c(12, 10, 1.8, true); p([[8, 16], [4, 19], [7, 13]], true, true); p([[16, 16], [20, 19], [17, 13]], true, true); break;
      case 'snow': for (var m = 0; m < 3; m++) { var ang = m * Math.PI / 3; l(12 - Math.cos(ang) * 8, 12 - Math.sin(ang) * 8, 12 + Math.cos(ang) * 8, 12 + Math.sin(ang) * 8); } break;
      case 'shield': p([[12, 4], [19, 7], [18, 14], [12, 20], [6, 14], [5, 7]], true, false); p([[12, 4], [19, 7], [18, 14], [12, 20], [6, 14], [5, 7]], true, true); break;
      case 'eye': p([[3, 12], [12, 6], [21, 12], [12, 18]], true, false); c(12, 12, 2.6, true); break;
      case 'ghost': p([[5, 19], [5, 11], [12, 5], [19, 11], [19, 19]], true, true); c(9.5, 12, 1.4, false); c(14.5, 12, 1.4, false); break;
      case 'magnet': p([[5, 5], [5, 15], [10, 15], [10, 10], [7, 10], [7, 5]], false, false); p([[19, 5], [19, 15], [14, 15], [14, 10], [17, 10], [17, 5]], false, false); break;
      case 'clock': c(12, 12, 8.5, false); l(12, 7, 12, 12); l(12, 12, 16, 14); break;
      case 'flame': p([[12, 3], [16, 9], [17, 14], [15, 19], [9, 19], [7, 14], [9, 11], [12, 13], [11, 8]], true, true); break;
      case 'target': c(12, 12, 8.5, false); c(12, 12, 4.5, false); c(12, 12, 1.3, true); break;
      case 'refresh': p([[18, 8], [19, 13], [14, 15]], false, false); p([[6, 16], [5, 11], [10, 9]], false, false); l(18, 8, 19, 13); l(6, 16, 5, 11); break;
      case 'swap': l(4, 9, 20, 9); l(16, 5, 20, 9); l(16, 13, 20, 9); l(20, 16, 4, 16); l(8, 12, 4, 16); l(8, 20, 4, 16); break;
      case 'loop': p([[7, 12], [7, 8], [12, 6], [17, 8], [17, 14], [12, 18], [8, 16]], false, false); l(4, 9, 7, 12); l(10, 9, 7, 12); break;
      case 'quake': l(3, 9, 7, 12); l(7, 12, 11, 8); l(11, 8, 15, 15); l(15, 15, 21, 10); l(3, 18, 9, 18); l(13, 18, 21, 18); break;
      case 'whistle': p([[5, 10], [14, 10], [14, 16], [10, 19], [5, 16]], true, true); c(15, 12, 4, false); l(11, 8, 14, 5); break;
      case 'crosshair': c(12, 12, 6.5, false); l(12, 2, 12, 7); l(12, 17, 12, 22); l(2, 12, 7, 12); l(17, 12, 22, 12); break;
      case 'music': p([[9, 17], [9, 7], [18, 5], [18, 15]], false, false); c(7, 17, 2.5, true); c(16, 15, 2.5, true); break;
      case 'sfx': p([[4, 10], [8, 10], [12, 5], [12, 19], [8, 14], [4, 14]], true, true); l(16, 8, 20, 5); l(16, 12, 21, 12); l(16, 16, 20, 19); break;
      case 'info': c(12, 12, 9, false); l(12, 11, 12, 16); c(12, 8, 1.1, true); break;
      case 'heart': p([[12, 19], [5, 13], [5, 9], [9, 7], [12, 10], [15, 7], [19, 9], [19, 13]], true, true); break;
      case 'trash': rr(6, 7, 12, 3, 1, true); l(8, 10, 9, 19); l(16, 10, 15, 19); l(7, 19, 17, 19); l(10, 4, 14, 4); break;
      case 'ticket': p([[4, 8], [20, 8], [20, 11], [17, 12], [20, 13], [20, 16], [4, 16], [4, 13], [7, 12], [4, 11]], true, true); break;
      case 'cup': p([[7, 5], [17, 5], [16, 14], [12, 17], [8, 14]], true, true); l(12, 17, 12, 20); l(8, 20, 16, 20); break;
      case 'diamond': p([[12, 3], [20, 10], [12, 20], [4, 10]], true, true); l(4, 10, 20, 10); l(12, 3, 12, 20); break;
      case 'hand': p([[7, 13], [7, 7], [9, 6], [9, 11], [10, 5], [12, 5], [12, 11], [13, 6], [15, 7], [15, 11], [16, 9], [18, 11], [18, 16], [14, 20], [9, 19]], true, true); break;
      case 'power': p([[12, 3], [15, 10], [20, 12], [15, 14], [12, 21], [9, 14], [4, 12], [9, 10]], true, true); break;
      case 'jump':
        p([[4, 13], [12, 4], [20, 13]], false, false);      /* chevron up */
        l(12, 10, 12, 20);                                   /* stem */
        l(6, 20, 18, 20);                                    /* ground line */
        break;
      case 'kick':                                           /* boot meets ball */
        p([[4, 6], [9, 6], [9, 12], [15, 13], [17, 16], [4, 16]], true, true);
        c(18.5, 20, 3.2, false);
        l(15, 5, 20, 3); l(17, 9, 22, 8);
        break;
      default: c(12, 12, 7, false);
    }
    g.restore();
  };

  /* ---------------- Stadium background ---------------- */
  var bgCache = null, bgKey = '';
  Art.buildBackground = function (st, V, quality) {
    var key = st.name + '|' + Math.round(V.w) + '|' + Math.round(V.h) + '|' + V.dpr + '|' + V.scale + '|' + quality;
    if (bgCache && bgKey === key) return bgCache;
    var k = V.scale * V.dpr;
    var cv = makeCanvas(V.w * k, V.h * k), g = cv.getContext('2d');
    g.scale(k, k);
    var w = V.w, h = V.h, horizon = 500, grassTop = 498;
    var r = HB.RNG('stad-' + st.name);

    var sky = g.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, st.sky[0]); sky.addColorStop(1, st.sky[1]);
    g.fillStyle = sky; g.fillRect(0, 0, w, horizon + 4);
    if (st.weather === 'night' || st.weather === 'embers') {
      for (var s = 0; s < 46; s++) {
        var sx = r.range(0, w), sy = r.range(0, 250), sr = r.range(0.5, 1.5);
        g.globalAlpha = r.range(0.25, 0.9); Art.circle(g, sx, sy, sr, '#ffffff');
      }
      g.globalAlpha = 1;
      Art.circle(g, w * 0.82, 82, 34, 'rgba(255,250,220,0.9)');
      Art.circle(g, w * 0.82, 82, 44, U.alpha('#fff6c8', 0.12));
    } else {
      var sunX = w * 0.17, sunY = 92;
      var glow = g.createRadialGradient(sunX, sunY, 8, sunX, sunY, 130);
      glow.addColorStop(0, 'rgba(255,248,196,0.85)'); glow.addColorStop(1, 'rgba(255,248,196,0)');
      g.fillStyle = glow; g.fillRect(sunX - 140, sunY - 140, 280, 280);
      Art.circle(g, sunX, sunY, 30, st.weather === 'sunset' ? '#ffd07a' : '#fff4c0');
      for (var cl = 0; cl < 7; cl++) {
        var cx = r.range(0, w), cy = r.range(30, 190), cw = r.range(60, 150);
        g.globalAlpha = 0.22;
        Art.ellipse(g, cx, cy, cw * 0.5, 12, '#ffffff');
        Art.ellipse(g, cx + cw * 0.2, cy - 8, cw * 0.32, 15, '#ffffff');
        Art.ellipse(g, cx - cw * 0.22, cy - 5, cw * 0.28, 11, '#ffffff');
      }
      g.globalAlpha = 1;
    }
    /* distant skyline */
    g.fillStyle = U.mix(st.sky[0], '#0b1830', 0.55);
    var bx = 0;
    while (bx < w) {
      var bw = r.range(24, 68), bh = r.range(28, 96);
      g.fillRect(bx, 285 - bh, bw, bh + 30);
      bx += bw + r.range(2, 10);
    }
    /* floodlight towers */
    for (var fl = 0; fl < 2; fl++) {
      var fx = fl ? w - 92 : 92;
      g.fillStyle = '#1c2b45'; g.fillRect(fx - 5, 120, 10, 210);
      g.fillStyle = '#263a5b'; g.fillRect(fx - 34, 108, 68, 22);
      for (var q = 0; q < 5; q++) { g.fillStyle = 'rgba(255,247,209,0.9)'; g.fillRect(fx - 30 + q * 13, 112, 9, 14); }
    }
    g.globalAlpha = 0.09; g.fillStyle = '#fff8d8';
    g.beginPath(); g.moveTo(92, 130); g.lineTo(w * 0.5, 500); g.lineTo(0, 500); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(w - 92, 130); g.lineTo(w * 0.5, 500); g.lineTo(w, 500); g.closePath(); g.fill();
    g.globalAlpha = 1;

    /* stands: three tiers of seating + crowd */
    var tiers = [
      { y: 300, hh: 62, base: U.shade(st.stand, -0.28), rows: 4 },
      { y: 362, hh: 66, base: U.shade(st.stand, -0.14), rows: 5 },
      { y: 428, hh: 62, base: st.stand, rows: 5 }
    ];
    tiers.forEach(function (t, ti) {
      var gr = g.createLinearGradient(0, t.y, 0, t.y + t.hh);
      gr.addColorStop(0, U.shade(t.base, 0.08)); gr.addColorStop(1, t.base);
      g.fillStyle = gr; g.fillRect(0, t.y, w, t.hh);
      g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(0, t.y + t.hh - 6, w, 6);
      var crowdN = Math.floor(w * t.rows * st.crowd * (quality === 0 ? 0.4 : 0.9) / 9);
      for (var i = 0; i < crowdN; i++) {
        var px = r.range(0, w), py = t.y + 8 + r.range(0, t.hh - 16);
        var col = r.next() < 0.18 ? st.accent : r.next() < 0.5 ? U.shade(st.stand, 0.4) : r.pick(['#f2e7d5', '#d85a5a', '#4f79c8', '#e8b94a', '#3f9e77', '#e5e9f0', '#2b2138']);
        g.globalAlpha = r.range(0.55, 1);
        g.fillStyle = col;
        g.beginPath(); g.arc(px, py, r.range(1.6, 3.1), 0, Math.PI * 2); g.fill();
        g.fillRect(px - 1.4, py + 1.5, 2.8, 4);
      }
      g.globalAlpha = 1;
      /* aisle stripes */
      for (var a = 0; a < 9; a++) {
        g.fillStyle = 'rgba(0,0,0,0.13)';
        g.fillRect((a + 0.5) * w / 9 - 3, t.y, 6, t.hh);
      }
    });
    /* tifo banners along the front of the upper tier */
    var BANNER_WORDS = ['ULTRAS', 'NORTH END', 'FOREVER', 'FORZA', 'ALLEZ', 'HEROES', 'WE ARE ONE', 'NO SURRENDER', 'HOME'];
    for (var b = 0; b < 9; b++) {
      var bxx = (b + 0.5) * w / 9 - 54;
      var bcol = b % 3 === 0 ? st.accent : b % 3 === 1 ? U.shade(st.stand, 0.45) : '#e9eef8';
      g.save(); g.globalAlpha = 0.92;
      Art.fillRR(g, bxx, 306, 108, 24, 5, bcol);
      g.globalAlpha = 1;
      /* fold shading so the cloth is not a flat rectangle */
      var fold = g.createLinearGradient(bxx, 306, bxx, 330);
      fold.addColorStop(0, 'rgba(255,255,255,0.16)'); fold.addColorStop(1, 'rgba(0,0,0,0.22)');
      Art.rr(g, bxx, 306, 108, 24, 5); g.fillStyle = fold; g.fill();
      g.restore();
      Art.text(g, BANNER_WORDS[b % BANNER_WORDS.length], bxx + 54, 319, 11,
        b % 3 === 2 ? C.ink : '#ffffff', 'center', '900', { shadow: false, maxWidth: 100 });
    }
    /* cantilever roof: deep underside, bright leading edge, support struts */
    var roofG = g.createLinearGradient(0, 268, 0, 306);
    roofG.addColorStop(0, U.shade(st.stand, -0.62)); roofG.addColorStop(1, U.shade(st.stand, -0.3));
    g.fillStyle = roofG; g.fillRect(0, 268, w, 34);
    g.fillStyle = 'rgba(0,0,0,0.34)'; g.fillRect(0, 298, w, 8);
    g.fillStyle = U.alpha('#dfe9f7', 0.5); g.fillRect(0, 268, w, 3);
    for (var rs = 0; rs < 12; rs++) {
      g.fillStyle = U.shade(st.stand, -0.5);
      g.fillRect((rs + 0.5) * w / 12 - 4, 300, 8, 22);
    }
    /* thin light wash from the roof onto the upper deck */
    var wash = g.createLinearGradient(0, 302, 0, 372);
    wash.addColorStop(0, 'rgba(255,248,220,0.13)'); wash.addColorStop(1, 'rgba(255,248,220,0)');
    g.fillStyle = wash; g.fillRect(0, 302, w, 70);
    /* advertising board base */
    g.fillStyle = '#101d38'; g.fillRect(0, 470, w, 30);
    g.fillStyle = U.alpha(st.accent, 0.7); g.fillRect(0, 470, w, 3);

    /* pitch */
    var grass = g.createLinearGradient(0, grassTop, 0, h);
    grass.addColorStop(0, U.shade(st.grass[1], -0.12));
    grass.addColorStop(0.28, st.grass[0]); grass.addColorStop(1, U.shade(st.grass[1], 0.12));
    g.fillStyle = grass; g.fillRect(0, grassTop, w, h - grassTop);
    for (var st2 = 0; st2 < 18; st2++) {
      g.globalAlpha = st2 % 2 ? 0.055 : 0.0;
      g.fillStyle = '#ffffff'; g.fillRect(st2 * w / 18, grassTop, w / 18, h - grassTop);
    }
    g.globalAlpha = 1;
    /* subtle grass texture */
    var n = quality === 0 ? 300 : 900;
    for (var gi = 0; gi < n; gi++) {
      var gx = r.range(0, w), gy = r.range(grassTop + 4, h);
      g.globalAlpha = r.range(0.03, 0.12);
      g.fillStyle = r.next() < 0.5 ? '#ffffff' : '#06240f';
      g.fillRect(gx, gy, r.range(2, 8), 1.4);
    }
    g.globalAlpha = 1;
    /* vignette */
    var vg = g.createRadialGradient(w / 2, h * 0.55, h * 0.25, w / 2, h * 0.55, w * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(3,10,24,0.42)');
    g.fillStyle = vg; g.fillRect(0, 0, w, h);
    bgCache = { canvas: cv, w: w, h: h, stadium: st }; bgKey = key;
    return bgCache;
  };
  Art.invalidateBackground = function () { bgCache = null; bgKey = ''; };

  Art.drawBackground = function (g, bg, t, st) {
    var w = bg.w, h = bg.h;
    g.drawImage(bg.canvas, 0, 0, w, h);
    /* animated LED ribbon */
    g.save();
    Art.rr(g, 0, 472, w, 26, 0); g.clip();
    g.fillStyle = U.alpha(st.accent, 0.18); g.fillRect(0, 472, w, 26);
    var msg = '  ★  ' + st.ad + '  ★  HEAD BALL 3  ★  1v1 ARCADE FOOTBALL  ★  ';
    g.font = '800 15px ' + HB.FONT; g.textBaseline = 'middle';
    g.fillStyle = U.alpha(st.accent, 0.95);
    var tw = 520, off = (t * 62) % tw;
    for (var i = -1; i < Math.ceil(w / tw) + 2; i++) g.fillText(msg, i * tw - off, 485);
    g.restore();
    /* crowd wave */
    var q = Math.floor((w / 9) * 0.7);
    for (var f = 0; f < q; f++) {
      var fx = (f + 0.5) * 9 + Math.sin(t * 1.3 + f * 0.5) * 2;
      var fy = 306 + Math.floor(f / 20) * 62 + Math.sin(t * 3 + f) * 2.5;
      g.globalAlpha = 0.5;
      g.fillStyle = f % 3 === 0 ? st.accent : '#ffffff';
      g.fillRect(fx, fy, 3, 4);
    }
    g.globalAlpha = 1;
    /* flags on the stand */
    for (var k = 0; k < 6; k++) {
      var xx = (k + 0.5) * w / 6, yy = 292 + Math.sin(t * 2 + k) * 3;
      g.fillStyle = '#e9edf5'; g.fillRect(xx, yy, 2, 20);
      g.fillStyle = k % 2 ? st.accent : C.blue;
      g.beginPath(); g.moveTo(xx + 2, yy); g.lineTo(xx + 20 + Math.sin(t * 5 + k) * 4, yy + 4); g.lineTo(xx + 2, yy + 11); g.closePath(); g.fill();
    }
  };
  Art.drawWeather = function (g, st, t, V) {
    if (st.weather === 'rain') {
      g.strokeStyle = 'rgba(210,235,255,0.28)'; g.lineWidth = 1.4;
      for (var i = 0; i < 70; i++) {
        var x = (i * 137.5 + t * 620) % V.w, y = (i * 71 + t * 900) % V.h;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x - 5, y + 18); g.stroke();
      }
    } else if (st.weather === 'snow' || st.weather === 'dust' || st.weather === 'embers') {
      var col = st.weather === 'snow' ? 'rgba(255,255,255,0.8)' : st.weather === 'embers' ? 'rgba(255,150,70,0.75)' : 'rgba(240,210,150,0.5)';
      for (var j = 0; j < 55; j++) {
        var x2 = (j * 191 + t * (st.weather === 'embers' ? -30 : 45) + Math.sin(t + j) * 24 + V.w * 2) % V.w;
        var y2 = (j * 83 + t * (st.weather === 'embers' ? -55 : 32)) % V.h;
        if (y2 < 0) y2 += V.h;
        g.globalAlpha = 0.55;
        Art.circle(g, x2, y2, st.weather === 'embers' ? 2.4 : 1.9, col);
      }
      g.globalAlpha = 1;
    }
  };

  /* Pitch markings - cheap vector strokes drawn in world space. */
  Art.pitch = function (g, m) {
    var gy = W.ground, w = W.w, bottom = 712;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(0, gy); g.lineTo(w, gy); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(w / 2, gy); g.lineTo(w / 2, bottom); g.stroke();
    g.beginPath(); g.ellipse(w / 2, gy + 48, 92, 26, 0, 0, Math.PI * 2); g.stroke();
    Art.circle(g, w / 2, gy + 48, 4, 'rgba(255,255,255,0.4)');
    function area(near, far, alpha) {
      g.strokeStyle = 'rgba(255,255,255,' + alpha + ')'; g.lineWidth = 2.5;
      g.beginPath();
      if (near === 0) { g.moveTo(0, gy + 5); g.lineTo(far, gy + 5); g.lineTo(far * 1.28, bottom); g.lineTo(0, bottom); }
      else { g.moveTo(w, gy + 5); g.lineTo(w - far, gy + 5); g.lineTo(w - far * 1.28, bottom); g.lineTo(w, bottom); }
      g.closePath(); g.stroke();
    }
    area(0, 172, 0.26); area(1, 172, 0.26);
    area(0, 72, 0.18); area(1, 72, 0.18);
    g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = 2;
    g.beginPath(); g.arc(172, gy + 40, 40, -Math.PI / 2, Math.PI / 2); g.stroke();
    g.beginPath(); g.arc(w - 172, gy + 40, 40, Math.PI / 2, Math.PI * 1.5); g.stroke();
    g.restore();
  };

  /* Goal: side 0 = left, 1 = right. gw = net depth, gh = height. */
  Art.goal = function (g, side, gw, gh, accent, t, opts) {
    opts = opts || {};
    var gy = W.ground, w = W.w;
    var x0 = side === 0 ? 0 : w - gw;
    var top = gy - gh, i;
    /* the direction the net leans: -1 for the left goal, +1 for the right */
    var lean = side === 0 ? 1 : -1;
    var netHit = opts.hit, ripples = opts.ripples || [];
    /* How hard the mesh is pushed out right now, 0..1, from the last strike. */
    var bulge = 0, bx = x0 + gw * 0.5, by = top + gh * 0.55;
    if (netHit) {
      var age = t - netHit.t;
      if (age >= 0 && age < 2.2) {
        bulge = Math.max(0, 1 - age / 0.55) * (0.55 + netHit.power * 0.45);
        bx = netHit.x; by = netHit.y;
      }
    }
    g.save();
    /* --- empty net interior: dark depth, then the mesh --- */
    var ng = g.createLinearGradient(x0, top, x0 + gw * lean, gy);
    ng.addColorStop(0, 'rgba(6,16,34,0.88)'); ng.addColorStop(0.65, 'rgba(12,30,56,0.72)'); ng.addColorStop(1, 'rgba(120,170,215,0.18)');
    g.fillStyle = ng; g.fillRect(x0, top, gw, gh);
    g.save(); Art.rr(g, x0, top, gw, gh, 4); g.clip();
    /* mesh: vertical cords bow towards the strike point, horizontals sag under it */
    g.lineWidth = 1;
    for (i = x0 + 7; i < x0 + gw - 2; i += 8) {
      var vx = i - bx, vy = top + gh * 0.5 - by;
      var push = bulge * Math.max(0, 1 - Math.abs(vx) / (gw * 0.85)) * (22 + Math.abs(vy) * 0.04);
      g.strokeStyle = 'rgba(226,242,255,' + (0.2 + bulge * 0.1) + ')';
      g.beginPath();
      g.moveTo(i, top);
      g.quadraticCurveTo(i + lean * push * 0.5, top + gh * 0.55, i + lean * push, gy);
      g.stroke();
    }
    for (i = top + 8; i < gy; i += 9) {
      var sag = bulge * Math.max(0, 1 - Math.abs(i - by) / (gh * 0.7)) * 10;
      g.strokeStyle = 'rgba(226,242,255,' + (0.13 + bulge * 0.08) + ')';
      g.beginPath(); g.moveTo(x0, i + sag); g.quadraticCurveTo(x0 + gw * 0.5, i + sag * 1.6, x0 + gw, i + sag); g.stroke();
    }
    /* diagonal weave, barely there, sells "this is a net" */
    g.strokeStyle = 'rgba(226,242,255,0.055)';
    for (i = -gh; i < gw + gh; i += 20) { g.beginPath(); g.moveTo(x0 + i, top); g.lineTo(x0 + i - gh, gy); g.stroke(); }
    /* ripple rings where the ball struck */
    for (i = 0; i < ripples.length; i++) {
      var rp = ripples[i], ra = t - rp.t;
      if (ra > 0.9 || ra < 0) continue;
      var rf = U.clamp(ra / 0.9, 0, 1);
      g.globalAlpha = (1 - rf) * 0.55;
      g.strokeStyle = '#bfe4ff'; g.lineWidth = 3 * (1 - rf) + 0.5;
      g.beginPath(); g.arc(rp.x, rp.y, Math.max(1, 12 + rf * 90), 0, Math.PI * 2); g.stroke();
      g.globalAlpha = 1;
    }
    g.restore();
    /* --- back stanchion --- */
    Art.fillRR(g, side === 0 ? x0 + gw - 7 : x0, top, 7, gh, 3, 'rgba(206,228,250,0.7)');
    /* net floor shadow so the ball sits in the goal, not on it */
    var fl = g.createLinearGradient(x0, gy - 26, x0, gy);
    fl.addColorStop(0, 'rgba(4,12,26,0)'); fl.addColorStop(1, 'rgba(4,12,26,0.45)');
    g.fillStyle = fl; g.fillRect(x0, gy - 26, gw, 26);
    /* goal line */
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x0, gy + 2); g.lineTo(x0 + gw, gy + 2); g.stroke();
    /* crossbar + front post, thick and glossy like the arcade original */
    var bar = g.createLinearGradient(0, top - 14, 0, top + 5);
    bar.addColorStop(0, '#ffffff'); bar.addColorStop(0.45, '#eef5ff'); bar.addColorStop(0.75, '#c3d4e8'); bar.addColorStop(1, '#94aac6');
    g.save(); g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 8; g.shadowOffsetY = 3;
    Art.fillRR(g, x0, top - 12, gw, 16, 6, bar);
    g.restore();
    var postX = side === 0 ? x0 + gw - 13 : x0;
    var metal = g.createLinearGradient(postX, 0, postX + 13, 0);
    metal.addColorStop(0, '#ffffff'); metal.addColorStop(0.4, '#e6effa'); metal.addColorStop(1, '#7f97b8');
    g.save(); g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 7; g.shadowOffsetY = 2;
    Art.fillRR(g, postX, top - 10, 13, gh + 12, 5, metal);
    g.restore();
    /* a thin highlight down the post */
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(postX + 4, top); g.lineTo(postX + 4, gy - 6); g.stroke();
    /* corner flag */
    g.strokeStyle = 'rgba(230,240,255,0.85)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(postX + (side === 0 ? 13 : 0), top - 14); g.lineTo(postX + (side === 0 ? 13 : 0), top - 44); g.stroke();
    g.fillStyle = accent;
    g.beginPath(); g.moveTo(postX + (side === 0 ? 13 : 0), top - 44);
    g.lineTo(postX + (side === 0 ? 42 : -28), top - 37);
    g.lineTo(postX + (side === 0 ? 13 : 0), top - 28); g.closePath(); g.fill();
    if (opts.glow) {
      g.globalAlpha = 0.3 + Math.sin(t * 5) * 0.12;
      g.strokeStyle = opts.glow; g.lineWidth = 8;
      Art.rr(g, x0, top, gw, gh, 5); g.stroke();
      g.globalAlpha = 1;
    }
    g.restore();
  };

  function torsoPath(g, R) {
    g.beginPath();
    g.moveTo(-24, -70); g.quadraticCurveTo(0, -76, 24, -70);
    g.lineTo(21, -22); g.quadraticCurveTo(0, -17, -21, -22); g.closePath();
  }
  function drawHair(g, c, R, style, color, hy) {
    hy = hy == null ? hy : hy;
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    /* keep hair on the top of the head - faces must stay readable */
    g.beginPath(); g.rect(-R * 1.9, hy - R * 2.4, R * 3.8, R * 2.05); g.clip();
    var hc = U.shade(color, -0.08);
    if (style === 5) {
      g.globalAlpha = 0.7; Art.ellipse(g, 0, hy - R * 0.75, R * 0.92, R * 0.32, U.shade(c.skin, -0.2)); g.globalAlpha = 1;
    } else if (style === 1) {
      for (var i = 0; i < 9; i++) { var a = Math.PI + i * Math.PI / 8; Art.circle(g, Math.cos(a) * R * 0.82, hy - R * 0.45 + Math.sin(a) * R * 0.5, R * 0.27, hc); }
    } else if (style === 2) {
      for (var j = 0; j < 6; j++) { var xx = -R * 0.8 + j * R * 0.32; g.fillStyle = hc; g.beginPath(); g.moveTo(xx - 7, hy - R * 0.7); g.lineTo(xx, hy - R * 1.25 - (j % 2) * 10); g.lineTo(xx + 8, hy - R * 0.68); g.closePath(); g.fill(); }
    } else if (style === 3) {
      g.fillStyle = hc; g.beginPath(); g.moveTo(-12, hy - R * 0.85); g.lineTo(0, hy - R * 1.55); g.lineTo(12, hy - R * 0.85); g.closePath(); g.fill();
      Art.fillRR(g, -R * 0.9, hy - R * 0.95, R * 1.8, R * 0.3, 5, hc);
    } else if (style === 4) {
      Art.ellipse(g, -R * 0.85, hy + 16, R * 0.3, R * 0.65, hc);
      Art.ellipse(g, R * 0.85, hy + 16, R * 0.3, R * 0.65, hc);
      Art.ellipse(g, 0, hy - R * 0.72, R * 0.98, R * 0.44, hc);
    } else if (style === 6) {
      Art.circle(g, 0, hy - R * 0.75, R * 0.84, hc);
      for (var k = 0; k < 10; k++) { var aa = k * Math.PI * 2 / 10; Art.circle(g, Math.cos(aa) * R * 0.78, hy - R * 0.75 + Math.sin(aa) * R * 0.78, R * 0.24, hc); }
    } else if (style === 7) {
      g.fillStyle = hc; g.beginPath(); g.ellipse(0, hy - R * 0.73, R * 1.02, R * 0.5, 0, Math.PI, Math.PI * 2); g.closePath(); g.fill();
      g.fillRect(-R * 0.95, hy - R * 0.75, R * 0.55, R * 0.42);
    } else if (style === 8) {
      Art.ellipse(g, 0, hy - R * 0.78, R * 0.98, R * 0.42, hc);
      Art.circle(g, R * 0.95, hy - R * 0.35, R * 0.3, hc);
      Art.ellipse(g, R * 1.12, hy + 13 + R * 0.1, R * 0.2, R * 0.42, hc);
    } else if (style === 9) {
      Art.ellipse(g, 0, hy - R * 0.72, R * 1.0, R * 0.48, hc);
      g.fillStyle = U.shade(hc, 0.2); g.fillRect(-R * 0.9, hy - R * 0.82, R * 1.8, 5);
    } else {
      g.fillStyle = hc; g.beginPath(); g.ellipse(0, hy - R * 0.72, R * 0.97, R * 0.46, 0, Math.PI, Math.PI * 2); g.closePath(); g.fill();
    }
    /* ---- signature cuts, keyed off the character's hairNote ---- */
    var sig = c.hairNote;
    if (sig === 'quiff' || sig === 'spiky') {
      /* Ronaldo / Neymar: a swept crest that leans into a hard side part */
      g.fillStyle = hc;
      g.beginPath();
      g.moveTo(-R * 0.92, hy - R * 0.42);
      g.quadraticCurveTo(-R * 0.8, hy - R * 1.18, -R * 0.06, hy - R * 1.22);
      g.quadraticCurveTo(R * 0.62, hy - R * 1.26, R * 0.98, hy - R * 0.5);
      g.quadraticCurveTo(R * 0.4, hy - R * 0.86, -R * 0.2, hy - R * 0.72);
      g.quadraticCurveTo(-R * 0.62, hy - R * 0.66, -R * 0.92, hy - R * 0.42);
      g.closePath(); g.fill();
      if (sig === 'spiky') {
        for (var sp = 0; sp < 5; sp++) {
          var sx2 = -R * 0.7 + sp * R * 0.36;
          g.beginPath();
          g.moveTo(sx2, hy - R * 1.02);
          g.lineTo(sx2 + R * 0.1, hy - R * 1.38 - (sp % 2) * R * 0.1);
          g.lineTo(sx2 + R * 0.24, hy - R * 1.0);
          g.closePath(); g.fill();
        }
      }
      /* faded sides */
      g.globalAlpha = 0.45;
      Art.fillRR(g, -R * 0.99, hy - R * 0.62, R * 0.2, R * 0.42, 6, hc);
      Art.fillRR(g, R * 0.79, hy - R * 0.62, R * 0.2, R * 0.42, 6, hc);
      g.globalAlpha = 1;
    } else if (sig === 'shaved-fringe') {
      /* R9: a shaved scalp stubble wash plus the little front tuft */
      g.globalAlpha = 0.26;
      Art.ellipse(g, 0, hy - R * 0.5, R * 1.0, R * 0.62, hc);
      g.globalAlpha = 1;
      g.fillStyle = hc;
      g.beginPath();
      g.ellipse(0, hy - R * 0.8, R * 0.34, R * 0.16, 0, Math.PI, Math.PI * 2);
      g.fill();
    } else if (sig === 'curly') {
      /* Salah: a dense, rounded mop of curls */
      for (var cu = 0; cu < 14; cu++) {
        var ca = Math.PI + cu * Math.PI / 13;
        Art.circle(g, Math.cos(ca) * R * 0.88, hy - R * 0.2 + Math.sin(ca) * R * 0.7, R * 0.26, hc);
      }
      Art.ellipse(g, 0, hy - R * 0.72, R * 0.95, R * 0.5, hc);
    } else if (sig === 'side-part') {
      /* De Bruyne: a hard parting with a swept fringe */
      g.fillStyle = hc;
      g.beginPath();
      g.moveTo(-R * 0.95, hy - R * 0.55);
      g.quadraticCurveTo(-R * 0.7, hy - R * 1.16, R * 0.1, hy - R * 1.14);
      g.quadraticCurveTo(R * 0.8, hy - R * 1.1, R * 0.96, hy - R * 0.62);
      g.lineTo(R * 0.6, hy - R * 0.66);
      g.quadraticCurveTo(R * 0.1, hy - R * 0.9, -R * 0.45, hy - R * 0.78);
      g.quadraticCurveTo(-R * 0.76, hy - R * 0.72, -R * 0.95, hy - R * 0.55);
      g.closePath(); g.fill();
      g.strokeStyle = U.shade(hc, -0.35); g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(-R * 0.1, hy - R * 1.1); g.lineTo(R * 0.42, hy - R * 0.7); g.stroke();
    } else if (sig === 'buzz') {
      /* Mbappe: very short, tight hairline */
      g.globalAlpha = 0.92;
      Art.ellipse(g, 0, hy - R * 0.74, R * 0.95, R * 0.42, hc);
      g.globalAlpha = 1;
      g.strokeStyle = U.shade(hc, 0.2); g.lineWidth = 2;
      for (var bz = -4; bz <= 4; bz++) {
        g.beginPath();
        g.moveTo(bz * R * 0.2, hy - R * 0.92);
        g.lineTo(bz * R * 0.2 + 3, hy - R * 0.62);
        g.stroke();
      }
    } else if (sig === 'ponytail') {
      /* Haaland: long hair pulled back, but a wild top */
      Art.ellipse(g, 0, hy - R * 0.7, R * 1.0, R * 0.5, hc);
      Art.circle(g, -R * 0.98, hy - R * 0.72, R * 0.34, hc);
      g.fillStyle = hc;
      g.beginPath();
      g.moveTo(-R * 0.98, hy - R * 0.5);
      g.quadraticCurveTo(-R * 1.16, hy + R * 0.2, -R * 0.88, hy + R * 0.7);
      g.quadraticCurveTo(-R * 0.8, hy + R * 0.1, -R * 0.82, hy - R * 0.3);
      g.closePath(); g.fill();
      Art.fillRR(g, -R * 0.5, hy - R * 1.02, R * 1.0, R * 0.14, 6, U.shade(hc, -0.2));
    } else if (sig === 'straw-top') {
      /* Haaland: a blond tuft, short at the sides and messy on top */
      g.fillStyle = hc;
      Art.ellipse(g, 0, hy - R * 0.66, R * 0.92, R * 0.44, hc);
      for (var sw = 0; sw < 7; sw++) {
        var sx3 = -R * 0.62 + sw * R * 0.21;
        g.beginPath();
        g.moveTo(sx3 - R * 0.1, hy - R * 0.82);
        g.lineTo(sx3 + R * 0.02, hy - R * 1.12 - (sw % 3) * R * 0.08);
        g.lineTo(sx3 + R * 0.12, hy - R * 0.8);
        g.closePath(); g.fill();
      }
    } else if (sig === 'long') {
      /* Ronaldinho / Marta: hair falling past the ears */
      Art.ellipse(g, 0, hy - R * 0.62, R * 1.02, R * 0.56, hc);
      g.fillStyle = hc;
      g.beginPath();
      g.moveTo(-R * 0.98, hy - R * 0.5);
      g.quadraticCurveTo(-R * 1.1, hy + R * 0.5, -R * 0.6, hy + R * 0.86);
      g.lineTo(R * 0.6, hy + R * 0.86);
      g.quadraticCurveTo(R * 1.1, hy + R * 0.5, R * 0.98, hy - R * 0.5);
      g.quadraticCurveTo(R * 0.7, hy - R * 0.95, 0, hy - R * 0.95);
      g.quadraticCurveTo(-R * 0.7, hy - R * 0.95, -R * 0.98, hy - R * 0.5);
      g.closePath(); g.fill();
      /* cut the face back out so the mouth and beard stay visible */
      g.save();
      g.globalCompositeOperation = 'destination-out';
      Art.ellipse(g, 0, hy + R * 0.26, R * 0.72, R * 0.66, '#000');
      g.restore();
    }
    g.restore();
  }
  function drawGearHead(g, item, R, c, hy) {
    hy = hy == null ? hy : hy;
    if (!item) return;
    var s = item.style, col = item.color;
    if (s === 'cap') { Art.ellipse(g, 0, hy - R * 0.72, R * 1.02, R * 0.5, col); Art.fillRR(g, 0, hy - R * 0.42, R * 1.35, 9, 4, U.shade(col, -0.15)); }
    else if (s === 'beanie') { Art.ellipse(g, 0, hy - R * 0.68, R * 1.02, R * 0.62, col); Art.fillRR(g, -R, hy - R * 0.2, R * 2, 14, 5, U.shade(col, -0.12)); Art.circle(g, 0, hy - R * 1.34, 10, '#ffffff'); }
    else if (s === 'crown') { g.fillStyle = '#ffce4b'; g.beginPath(); g.moveTo(-R * 0.8, hy - R * 0.95); g.lineTo(-R * 0.8, hy - R * 1.5); g.lineTo(-R * 0.35, hy - R * 1.15); g.lineTo(0, hy - R * 1.65); g.lineTo(R * 0.35, hy - R * 1.15); g.lineTo(R * 0.8, hy - R * 1.5); g.lineTo(R * 0.8, hy - R * 0.95); g.closePath(); g.fill(); }
    else if (s === 'headband') { Art.fillRR(g, -R, hy - R * 0.55, R * 2, 13, 5, col); }
    else if (s === 'visor') { Art.fillRR(g, -R * 0.95, hy - R * 0.45, R * 1.9, 12, 6, U.alpha(col, 0.85)); Art.fillRR(g, R * 0.4, hy - R * 0.72, R * 1.1, 8, 4, col); }
    else if (s === 'chef') { Art.fillRR(g, -R * 0.9, hy - R * 1.65, R * 1.8, R * 0.9, 12, '#ffffff'); Art.ellipse(g, -R * 0.45, hy - R * 1.6, R * 0.45, R * 0.35, '#ffffff'); Art.ellipse(g, R * 0.45, hy - R * 1.6, R * 0.45, R * 0.35, '#ffffff'); }
    else if (s === 'halo') { g.strokeStyle = '#ffe680'; g.lineWidth = 6; g.beginPath(); g.ellipse(0, hy - R * 1.5, R * 0.75, R * 0.24, 0, 0, Math.PI * 2); g.stroke(); }
    else if (s === 'straw') { Art.ellipse(g, 0, hy - R * 0.88, R * 1.5, 9, '#e9c878'); Art.ellipse(g, 0, hy - R * 0.95, R * 0.75, R * 0.5, '#e9c878'); Art.fillRR(g, -R * 0.75, hy - R * 0.5, R * 1.5, 9, 3, C.red); }
    else if (s === 'shades') { Art.fillRR(g, -R * 0.82, hy - 10, R * 0.72, 15, 5, '#16203a'); Art.fillRR(g, R * 0.1, hy - 10, R * 0.72, 15, 5, '#16203a'); Art.line(g, -R * 0.1, hy - 4, R * 0.1, hy - 4, '#16203a', 4); }
    else if (s === 'round') { g.strokeStyle = '#2b2b3a'; g.lineWidth = 3; Art.circle(g, -18, hy - 4, 13, null); g.stroke(); Art.circle(g, 18, hy - 4, 13, null); g.stroke(); Art.line(g, -5, hy - 4, 5, hy - 4, '#2b2b3a', 3); }
    else if (s === 'monocle') { g.strokeStyle = '#e8c34a'; g.lineWidth = 3; Art.circle(g, 18, hy - 4, 14, null); g.stroke(); Art.line(g, 30, hy + 8, 36, -78, '#e8c34a', 2); }
    else if (s === 'sports') { Art.fillRR(g, -R * 0.85, hy - 12, R * 1.7, 16, 6, U.alpha(col, 0.9)); Art.fillRR(g, -R * 0.85, hy - 12, R * 1.7, 5, 2, '#ffffff'); }
    else if (s === 'threeD') { Art.fillRR(g, -R * 0.85, hy - 11, R * 1.7, 15, 3, '#f0455c'); Art.fillRR(g, -R * 0.85, hy - 11, R * 1.7, 5, 2, '#3ad9e8'); }
    else if (s === 'star') { g.fillStyle = '#ffce4b'; for (var e = 0; e < 2; e++) { var ex = e ? 18 : -18; g.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 7 : 15; g[i === 0 ? 'moveTo' : 'lineTo'](ex + Math.cos(a) * rr, hy - 4 + Math.sin(a) * rr); } g.closePath(); g.fill(); } }
  }
  /* opts: x,y,scale,facing,t,pose,run,look,kit,gear,alpha,frozen,giant,ghost,glasses,celebrate,sizeStat */
  /* Head Ball style avatar: an oversized cartoon head sitting on a tiny
     torso, with chunky boots planted on the ground line. `hy` is the head
     centre, `o.y` stays the ground contact point so collisions never shift. */
  Art.character = function (g, c, o) {
    o = o || {};
    var sc = (o.scale || 1) * (o.giant ? 1.34 : 1) * (o.shrink ? 0.66 : 1);
    var t = o.t || 0, face = o.facing || 1;
    var sizeF = U.clamp(0.88 + ((o.sizeStat || c.size) - 50) / 380, 0.86, 1.16);
    var R = 54 * sizeF, hy = -124;
    var gear = o.gear || {};
    var kit = o.kit || c.kit;
    var run = o.run || 0, pose = o.pose || 'idle';
    var ink = '#101a2e';
    var legA = pose === 'run' ? Math.sin(run) * 0.62 : pose === 'jump' ? -0.55 : 0;
    var legB = pose === 'run' ? -Math.sin(run) * 0.62 : pose === 'jump' ? 0.7 : 0;
    if (pose === 'kick') { legB = -1.25; legA = 0.3; }
    if (pose === 'slide') { legA = -1.35; legB = -1.0; }
    if (pose === 'celebrate') { legA = -0.45; legB = 0.45; }
    var bob = pose === 'idle' ? Math.sin(t * 2.4) * 1.6 : pose === 'run' ? Math.abs(Math.sin(run)) * 3.2 : 0;
    var boot = HB.Data.gearItem(gear.boots);

    /* ---- ground shadow: always under the boots, shrinks with height ---- */
    var air = Math.max(0, -0);
    g.save();
    g.globalAlpha = (o.alpha == null ? 1 : o.alpha) * 0.34;
    Art.ellipse(g, 0, (o.y || 0) - (o.y || 0) + 2, 46 * sc, 11 * sc, 'rgba(4,10,24,0.85)');
    g.restore();
    void air;

    g.save();
    g.translate(o.x || 0, (o.y || 0) + bob);
    g.scale(face * sc, sc);
    if (o.alpha != null) g.globalAlpha *= o.alpha;
    if (o.ghost) g.globalAlpha *= 0.34;

    /* ---- legs: short, thick, with a boot that reads at a glance ---- */
    function leg(rot, back) {
      g.save(); g.translate(back ? -8 : 8, -30); g.rotate(rot);
      g.fillStyle = back ? U.shade(kit, -0.34) : U.shade(kit, -0.16);
      Art.fillRR(g, -8, -4, 16, 22, 7, g.fillStyle);
      /* sock */
      Art.fillRR(g, -7.5, 10, 15, 11, 4, back ? '#dfe6f2' : '#f4f8ff');
      /* boot */
      var bc = boot ? boot.color : U.shade(kit, -0.52);
      g.fillStyle = bc;
      g.beginPath();
      g.moveTo(-10, 15); g.lineTo(9, 15); g.lineTo(13, 22);
      g.quadraticCurveTo(14, 26, 20, 26); g.lineTo(24, 26); g.quadraticCurveTo(27, 27, 26, 30);
      g.lineTo(-10, 30); g.quadraticCurveTo(-12, 22, -10, 15); g.closePath(); g.fill();
      g.strokeStyle = ink; g.lineWidth = 2.6; g.stroke();
      /* sole */
      Art.fillRR(g, -10, 27, 36, 4, 2, U.shade(bc, -0.55));
      if (boot && boot.style === 'neon') { g.strokeStyle = '#3ad9e8'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-6, 22); g.lineTo(20, 22); g.stroke(); }
      if (boot && boot.style === 'rocket') { g.fillStyle = '#ff7a3d'; g.beginPath(); g.moveTo(-4, 20); g.lineTo(-11, 31); g.lineTo(-1, 29); g.closePath(); g.fill(); }
      g.restore();
    }
    leg(legA, true); leg(legB, false);

    /* ---- torso: a small jersey wedge under the head ---- */
    g.save();
    g.beginPath();
    g.moveTo(-25, -74); g.quadraticCurveTo(0, -81, 25, -74);
    g.lineTo(20, -24); g.quadraticCurveTo(0, -18, -20, -24); g.closePath();
    g.fillStyle = kit; g.fill();
    g.lineWidth = 3.2; g.strokeStyle = ink; g.stroke();
    g.clip();
    var jersey = HB.Data.gearItem(gear.jersey), js = jersey ? jersey.style : 'stripes';
    if (js === 'stripes' || js === 'retro') {
      g.fillStyle = 'rgba(255,255,255,0.26)';
      for (var v = -34; v < 34; v += 13) g.fillRect(v, -84, 6, 68);
    } else if (js === 'hoops') {
      g.fillStyle = 'rgba(255,255,255,0.28)';
      for (var h2 = -74; h2 < -20; h2 += 13) g.fillRect(-34, h2, 68, 6);
    } else if (js === 'sash') {
      g.fillStyle = 'rgba(255,255,255,0.4)';
      g.beginPath(); g.moveTo(-32, -24); g.lineTo(-10, -24); g.lineTo(26, -78); g.lineTo(8, -78); g.closePath(); g.fill();
    }
    var grd = g.createLinearGradient(-26, -80, 26, -20);
    grd.addColorStop(0, 'rgba(255,255,255,0.3)'); grd.addColorStop(0.45, 'rgba(255,255,255,0)'); grd.addColorStop(1, 'rgba(0,0,0,0.3)');
    g.fillStyle = grd; g.fillRect(-34, -84, 68, 68);
    g.restore();
    /* collar */
    g.fillStyle = U.shade(kit, -0.35);
    g.beginPath(); g.moveTo(-12, -78); g.lineTo(0, -68); g.lineTo(12, -78); g.closePath(); g.fill();

    /* ---- arms ---- */
    g.save(); g.translate(-23, -66); g.rotate(pose === 'celebrate' ? -1.15 : 0.3 + Math.sin(t * 2.2) * 0.07);
    Art.fillRR(g, -6, -4, 12, 28, 6, U.shade(c.skin, -0.16)); g.restore();
    g.save(); g.translate(23, -66); g.rotate(pose === 'celebrate' ? -2.3 : -0.26 - Math.sin(t * 2.2) * 0.09);
    Art.fillRR(g, -6, -4, 12, 28, 6, c.skin);
    Art.circle(g, 0, 24, 7.5, c.skin); g.restore();

    /* ---- head ---- */
    g.save();
    var skinG = g.createRadialGradient(-R * 0.32, hy - R * 0.4, R * 0.14, 0, hy, R * 1.12);
    skinG.addColorStop(0, U.shade(c.skin, 0.2)); skinG.addColorStop(0.7, c.skin); skinG.addColorStop(1, U.shade(c.skin, -0.2));
    g.beginPath(); g.arc(0, hy, R, 0, Math.PI * 2); g.fillStyle = skinG; g.fill();
    g.lineWidth = 4; g.strokeStyle = ink; g.stroke();
    /* rim light along the lit edge */
    g.save(); g.beginPath(); g.arc(0, hy, R, 0, Math.PI * 2); g.clip();
    var rim = g.createLinearGradient(-R, hy - R, R * 0.4, hy + R * 0.4);
    rim.addColorStop(0, 'rgba(255,255,255,0.22)'); rim.addColorStop(0.35, 'rgba(255,255,255,0)');
    g.fillStyle = rim; g.fillRect(-R, hy - R, R * 2, R * 2);
    g.restore();
    /* ears */
    Art.ellipse(g, -R - 3, hy + 6, 8.5, 13, c.skin);
    Art.ellipse(g, R + 3, hy + 6, 8.5, 13, c.skin);
    g.lineWidth = 2.6; g.strokeStyle = ink;
    Art.ellipse(g, -R - 3, hy + 6, 8.5, 13, null); Art.ellipse(g, R + 3, hy + 6, 8.5, 13, null);
    /* cheeks */
    g.globalAlpha *= 0.32;
    Art.ellipse(g, -R * 0.56, hy + R * 0.34, 11, 6.5, '#ef6c7c');
    Art.ellipse(g, R * 0.56, hy + R * 0.34, 11, 6.5, '#ef6c7c');
    g.globalAlpha /= 0.32;
    /* eyes: big, glossy, tracking the ball */
    var lookX = (o.look && o.look.x ? o.look.x : 0) * 4.5, lookY = (o.look && o.look.y ? o.look.y : 0) * 3.4;
    var blink = (Math.sin(t * 1.6 + (c.id || 0) * 1.3) > 0.994) || o.blink;
    [-1, 1].forEach(function (sgn) {
      var ex = sgn * R * 0.34, ey = hy - R * 0.1;
      var er = R * 0.23, eir = er * 0.5;
      if (blink) { g.strokeStyle = ink; g.lineWidth = 3.6; Art.line(g, ex - er, ey, ex + er, ey, ink, 3.6); }
      else {
        Art.ellipse(g, ex, ey, er, er * 1.16, '#fdfdff');
        g.lineWidth = 2.4; g.strokeStyle = '#2a3550'; Art.ellipse(g, ex, ey, er, er * 1.16, null);
        var ix = ex + lookX * 0.9, iy = ey + lookY * 0.9;
        Art.circle(g, ix, iy, eir, c.eye || '#3d2b1f');       /* iris */
        Art.circle(g, ix, iy, eir * 0.52, '#10161f');          /* pupil */
        Art.circle(g, ix - eir * 0.36, iy - eir * 0.42, eir * 0.3, '#ffffff');
        Art.circle(g, ix + eir * 0.4, iy + eir * 0.44, eir * 0.16, 'rgba(255,255,255,0.7)');
      }
      /* eyebrows: angled for focus while running, raised when celebrating */
      g.strokeStyle = U.shade(c.hairColor, -0.3); g.lineWidth = 4; g.lineCap = 'round';
      var browY = ey - R * 0.42 - (pose === 'celebrate' ? 4 : 0);
      var tilt = pose === 'run' ? 3 * sgn : pose === 'hurt' ? -3 * sgn : 0;
      g.beginPath(); g.moveTo(ex - R * 0.24, browY + tilt); g.lineTo(ex + R * 0.24, browY - tilt); g.stroke();
    });
    /* nose: a small round button */
    g.fillStyle = U.shade(c.skin, -0.14);
    g.beginPath(); g.ellipse(0, hy + R * 0.22, 6.4, 7.6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath(); g.ellipse(-3, hy + R * 0.16, 3, 3.6, 0, 0, Math.PI * 2); g.fill();
    /* mouth */
    var happy = pose === 'celebrate' || o.happy, sad = pose === 'hurt' || o.sad;
    g.strokeStyle = '#6f3131'; g.lineWidth = 3.6; g.lineCap = 'round';
    g.beginPath();
    if (happy) g.arc(0, hy + R * 0.36, 15, 0.12, Math.PI - 0.12);
    else if (sad) g.arc(0, hy + R * 0.62, 13, Math.PI + 0.22, Math.PI * 2 - 0.22);
    else { g.moveTo(-11, hy + R * 0.45); g.quadraticCurveTo(0, hy + R * 0.52 + Math.sin(t * 2) * 1.4, 11, hy + R * 0.45); }
    g.stroke();
    if (happy) { g.fillStyle = '#f0455c'; g.beginPath(); g.arc(0, hy + R * 0.42, 10, 0, Math.PI); g.fill(); }
    /* beards */
    if (c.beard === 2) Art.fillRR(g, -14, hy + R * 0.42, 28, 6, 3, U.shade(c.hairColor, -0.08));
    else if (c.beard === 3) Art.ellipse(g, 0, hy + R * 0.6, 13, 9, U.shade(c.hairColor, -0.08));
    else if (c.beard === 4) {
      g.fillStyle = U.shade(c.hairColor, -0.06);
      g.beginPath(); g.arc(0, hy + R * 0.16, R * 0.9, 0.14, Math.PI - 0.14);
      g.lineTo(R * 0.72, hy + R * 0.2);
      g.quadraticCurveTo(0, hy + R * 0.98, -R * 0.72, hy + R * 0.2);
      g.closePath(); g.fill();
      g.strokeStyle = '#6f3131'; g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(-10, hy + R * 0.48); g.lineTo(10, hy + R * 0.48); g.stroke();
    }
    drawHair(g, c, R, c.hair, c.hairColor, hy);
    drawGearHead(g, HB.Data.gearItem(gear.hat), R, c, hy);
    if (gear.glasses >= 0) drawGearHead(g, HB.Data.gearItem(gear.glasses), R, c, hy);
    g.restore();

    /* effects */
    if (o.frozen) {
      g.globalAlpha = 0.42; g.fillStyle = '#bdeeff';
      g.beginPath(); g.arc(0, hy - 16, R * 1.34, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 0.9; g.strokeStyle = '#e8faff'; g.lineWidth = 3;
      for (var q = 0; q < 6; q++) {
        var aa = q * 1.05;
        Art.line(g, Math.cos(aa) * R * 0.9, hy - 16 + Math.sin(aa) * R * 0.9, Math.cos(aa) * R * 1.6, hy - 16 + Math.sin(aa) * R * 1.6, '#e8faff', 3);
      }
    }
    if (o.shielded) {
      g.globalAlpha = 0.55; g.strokeStyle = '#7fe8ff'; g.lineWidth = 5;
      Art.rr(g, -40, hy - R * 1.2, 80, R * 2.4 + 46, 40); g.stroke();
    }
    g.restore();
  };

  /* ---------------- Ball ---------------- */
  Art.ball = function (g, b, t) {
    var r = b.r || 22;
    g.save(); g.translate(b.x, b.y);
    if (b.alpha != null) g.globalAlpha *= b.alpha;
    if (b.glow) {
      g.globalAlpha *= 0.45;
      var gg = g.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 2.1);
      gg.addColorStop(0, b.glow); gg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gg; g.beginPath(); g.arc(0, 0, r * 2.1, 0, Math.PI * 2); g.fill();
      g.globalAlpha /= 0.45;
    }
    g.rotate(b.rot || 0);
    var style = b.style || 'classicball';
    var base = style === 'fireball' ? '#ffb347' : style === 'planet' ? '#6c7ce0' : style === 'crystalball' ? '#bfe9ff' : style === 'hexball' ? '#f0f4ff' : '#ffffff';
    var dark = style === 'fireball' ? '#c92f22' : style === 'planet' ? '#26316f' : style === 'crystalball' ? '#3d8fc9' : '#1b2a44';
    var bg = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.15);
    bg.addColorStop(0, U.shade(base, 0.25)); bg.addColorStop(0.75, base); bg.addColorStop(1, U.shade(base, -0.3));
    Art.circle(g, 0, 0, r, bg);
    g.strokeStyle = dark; g.lineWidth = Math.max(2, r * 0.11);
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
    /* five rotated patches */
    g.fillStyle = dark;
    for (var i = 0; i < 5; i++) {
      var a = i * Math.PI * 2 / 5;
      g.save(); g.rotate(a); g.translate(0, -r * 0.55);
      g.beginPath();
      for (var k = 0; k < 5; k++) {
        var ang = -Math.PI / 2 + k * Math.PI * 2 / 5, rr = r * 0.24;
        g[k ? 'lineTo' : 'moveTo'](Math.cos(ang) * rr, Math.sin(ang) * rr);
      }
      g.closePath(); g.fill(); g.restore();
    }
    g.strokeStyle = U.alpha(dark, 0.5); g.lineWidth = 1.6;
    for (var j = 0; j < 5; j++) {
      var a2 = j * Math.PI * 2 / 5 + Math.PI / 5;
      g.beginPath(); g.moveTo(Math.cos(a2) * r * 0.35, Math.sin(a2) * r * 0.35); g.lineTo(Math.cos(a2) * r * 0.92, Math.sin(a2) * r * 0.92); g.stroke();
    }
    g.globalAlpha *= 0.5; Art.ellipse(g, -r * 0.34, -r * 0.42, r * 0.3, r * 0.18, '#ffffff');
    g.restore();
  };

  Art.crest = function (g, label, x, y, s, color) {
    g.save(); g.translate(x, y);
    g.fillStyle = color;
    g.beginPath(); g.moveTo(-s / 2, -s / 2); g.lineTo(s / 2, -s / 2); g.lineTo(s / 2, s * 0.16);
    g.quadraticCurveTo(s * 0.3, s * 0.62, 0, s * 0.72);
    g.quadraticCurveTo(-s * 0.3, s * 0.62, -s / 2, s * 0.16); g.closePath(); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 2.5; g.stroke();
    Art.text(g, label, 0, -2, s * 0.52, '#ffffff', 'center', '900', { shadow: false });
    g.restore();
  };
})(window.HB = window.HB || {});
