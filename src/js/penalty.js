/* Head Ball 3 - Penalty Duel mini-game.
 * Five kicks per side, aim + oscillating power bar, keeper dives, sudden death. */
(function (HB) {
  'use strict';
  var U = HB.U, C = HB.C, W = HB.WORLD, Art = HB.Art, Audio = HB.Audio, Meta = HB.Meta;

  function Penalty(cfg) {
    this.cfg = cfg || {};
    this.stadium = cfg.stadium || Meta.stadium();
    this.ai = U.clamp(cfg.ai == null ? HB.Save.data.settings.difficulty : cfg.ai, 0, 4);
    this.score = [0, 0];
    this.attempts = [0, 0];
    this.round = 0;
    this.shooter = 0;
    this.phase = 'aim';
    this.phaseT = 0;
    this.ax = 0.5; this.ay = 0.55;
    this.power = 0.5; this.powerDir = 1;
    this.dive = -1;
    this.flyT = 0; this.flyDur = 0.62;
    this.target = { x: 0.5, y: 0.5 };
    this.outcome = '';
    this.ball = { x: 0, y: 0, r: 26, rot: 0, spin: 0, style: 'classicball', alpha: 1, glow: null };
    this.keeper = { x: 0, y: 0, diveX: 0.5, t: 0 };
    this.particles = [];
    this.t = 0; this.finished = false; this.paused = false; this.result = null;
    this.message = 'YOUR KICK'; this.messageT = 2;
    this.input = {};
    this.prev = {};
    Audio.music('penalty'); Audio.setCrowd(0.4);
  }
  HB.Penalty = Penalty;

  Penalty.prototype.goalRect = function () {
    var V = HB.V, w = Math.min(560, V.w * 0.52), h = w * 0.52;
    return { x: V.w / 2 - w / 2, y: 210, w: w, h: h };
  };
  Penalty.prototype.layoutControls = function () {
    var V = HB.V, w = V.w, B = 78, gap = 8, y1 = 486, y2 = 578;
    var c = {
      up: { x: 26 + B + gap, y: y1 - B - gap, w: B, h: B },
      left: { x: 26, y: y1, w: B, h: B },
      right: { x: 26 + (B + gap) * 2, y: y1, w: B, h: B },
      down: { x: 26 + B + gap, y: y1, w: B, h: B },
      kick: { x: w - 190, y: 552, w: 150, h: 118 },
      pause: { x: w - 92, y: 26, w: 64, h: 56 }
    };
    var dw = 120, dx = w / 2 - dw * 1.5 - 16;
    c.dive0 = { x: dx, y: 588, w: dw, h: 76 };
    c.dive1 = { x: dx + dw + 16, y: 588, w: dw, h: 76 };
    c.dive2 = { x: dx + (dw + 16) * 2, y: 588, w: dw, h: 76 };
    c.powers = [];
    return [c, null];
  };
  Penalty.prototype.inputFromPointers = function () {
    var c = this.layoutControls()[0], Input = HB.Input, out = {};
    var keys = ['left', 'right', 'up', 'down', 'kick', 'dive0', 'dive1', 'dive2'];
    for (var i = 0; i < keys.length; i++) out[keys[i]] = Input.pointersIn(c[keys[i]]).length > 0;
    var K = Input.key;
    if (K('a') || K('left')) out.left = true;
    if (K('d') || K('right')) out.right = true;
    if (K('w') || K('up')) out.up = true;
    if (K('s') || K('down')) out.down = true;
    if (K(' ') || K('enter') || K('e')) out.kick = true;
    if (K('1')) out.dive0 = true; if (K('2')) out.dive1 = true; if (K('3')) out.dive2 = true;
    return [out, {}];
  };
  Penalty.prototype.setInput = function (side, input) {
    if (side !== 0) return;
    var prev = this.prev, edges = {};
    for (var k in input) if (Object.prototype.hasOwnProperty.call(input, k)) {
      edges[k + 'Down'] = !!input[k] && !prev[k];
      edges[k] = !!input[k];
      prev[k] = !!input[k];
    }
    this.input = input; this.edges = edges;
  };
  Penalty.prototype.pressPower = function () { };
  Penalty.prototype.releaseKeyPowers = function () { };
  Penalty.prototype.pause = function () { this.paused = true; };
  Penalty.prototype.resume = function () { this.paused = false; HB.Audio.unlock(); };
  Penalty.prototype.quit = function () { this.finished = true; HB.emit('matchQuit'); };

  Penalty.prototype.burst = function (x, y, n, color) {
    for (var i = 0; i < n; i++) {
      var a = U.rnd(0, Math.PI * 2), s = U.rnd(60, 280);
      this.particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: U.rnd(0.4, 1), max: 1, size: U.rnd(2, 6), color: color });
    }
    if (this.particles.length > 160) this.particles.splice(0, this.particles.length - 160);
  };
  Penalty.prototype.shoot = function (byPlayer) {
    if (this.phase !== 'aim' && this.phase !== 'keeper') return;
    var p = this.power;
    if (byPlayer) {
      this.target = { x: this.ax, y: this.ay };
      var skill = 0.25 + this.ai * 0.16;
      var guess = Math.random() < skill ? Math.round(this.ax * 2) / 2 : U.pick([0.15, 0.5, 0.85]);
      this.keeper.diveX = U.clamp(guess + U.rnd(-0.08, 0.08), 0.1, 0.9);
      this.keeper.diveY = U.rnd(0.35, 0.7);
    } else {
      var acc = 0.55 + this.ai * 0.09;
      this.target = { x: U.clamp(U.rnd(0.1, 0.9) * (Math.random() < acc ? 1 : 1.3), 0.02, 0.98), y: U.rnd(0.25, 0.8) };
      p = U.rnd(0.5, 1);
    }
    this.keeper.t = 0;
    this.phase = 'fly'; this.flyT = 0; this.flyDur = 0.45 + (1 - p) * 0.22;
    this.ball.x = HB.V.w / 2; this.ball.y = 650; this.ball.r = 26;
    Audio.play(p > 0.75 ? 'kickHard' : 'kick');
    HB.Input.vibrate(20);
    /* resolve */
    var gr = this.goalRect();
    var miss = this.target.x < 0.04 || this.target.x > 0.96 || this.target.y < 0.06 || this.target.y > 0.98 || (p > 0.94 && Math.random() < 0.28);
    var saved = false;
    if (!miss) {
      if (byPlayer) {
        saved = Math.abs(this.target.x - this.keeper.diveX) < 0.2 && Math.abs(this.target.y - this.keeper.diveY) < 0.34;
      } else {
        var zones = [0.16, 0.5, 0.84];
        saved = this.dive >= 0 && Math.abs(this.target.x - zones[this.dive]) < 0.27 && Math.random() < 0.55 + p * 0.2;
      }
    }
    this.pending = { byPlayer: byPlayer, miss: miss, saved: saved, p: p };
  };
  Penalty.prototype.resolve = function () {
    var r = this.pending, side = r.byPlayer ? 0 : 1;
    if (!r.miss && !r.saved) {
      this.score[side]++; this.outcome = 'GOAL!'; Audio.play('penaltyScore'); Audio.cheer(1.2);
      var gr = this.goalRect(); this.burst(gr.x + gr.w * this.target.x, gr.y + gr.h * this.target.y, 30, C.gold);
    } else if (r.saved) {
      this.outcome = 'SAVED!'; Audio.play('keeper'); Audio.play('save');
      var gr2 = this.goalRect(); this.burst(gr2.x + gr2.w * this.keeper.diveX, gr2.y + gr2.h * 0.55, 22, C.cyan);
    } else {
      this.outcome = 'MISSED!'; Audio.play('penaltyMiss');
    }
    this.attempts[side]++;
    this.phase = 'result'; this.phaseT = 0; this.message = this.outcome; this.messageT = 1.8;
  };
  Penalty.prototype.next = function () {
    var a = this.attempts, s = this.score;
    if (this.round >= 4 && a[0] === a[1]) {
      if (a[0] >= 5 && a[1] >= 5) {
        if (s[0] !== s[1]) { this.end(); return; }
      } else {
        var remaining = 5 - Math.max(a[0], a[1]);
        if (s[0] - s[1] > remaining || s[1] - s[0] > remaining) { this.end(); return; }
      }
    }
    this.shooter = 1 - this.shooter;
    if (this.shooter === 0) this.round++;
    this.phase = this.shooter === 0 ? 'aim' : 'keeper';
    this.phaseT = 0; this.ax = 0.5; this.ay = 0.55; this.power = 0.5; this.powerDir = 1;
    this.dive = -1; this.outcome = '';
    this.message = this.shooter === 0 ? 'YOUR KICK' : 'YOUR SAVE'; this.messageT = 2;
  };
  Penalty.prototype.end = function () {
    this.finished = true; this.phase = 'end';
    var win = this.score[0] > this.score[1], draw = this.score[0] === this.score[1];
    var res = {
      mode: 'penalty', local: false, win: win, draw: draw, score: this.score.slice(),
      goals: this.score[0], conceded: this.score[1], shots: this.attempts[0], headers: 0,
      saves: 0, powers: 0, tackles: 0, perfectHeaders: 0, duration: 60,
      maxDeficit: 0, tournamentWin: false, penaltyWin: win, opponent: 'Penalty Rival', rewards: null
    };
    res.rewards = Meta.reportMatch(res);
    Audio.play(win ? 'win' : draw ? 'draw' : 'lose', { delay: 0.3 });
    Audio.music(win ? 'victory' : 'menu');
    this.result = res;
    HB.emit('matchEnd', res);
  };
  Penalty.prototype.update = function (dt) {
    if (this.paused || this.finished) return;
    dt = Math.min(dt, 0.05);
    this.t += dt; this.phaseT += dt;
    var e = this.edges || {}, gr = this.goalRect();
    for (var i = this.particles.length - 1; i >= 0; i--) {
      var p = this.particles[i]; p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.vy += 520 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    }
    if (this.phase === 'aim') {
      this.power += this.powerDir * dt * 1.25;
      if (this.power > 1) { this.power = 1; this.powerDir = -1; }
      if (this.power < 0.18) { this.power = 0.18; this.powerDir = 1; }
      var sp = dt * 0.85;
      if (this.input.left) this.ax -= sp;
      if (this.input.right) this.ax += sp;
      if (this.input.up) this.ay -= sp * 0.7;
      if (this.input.down) this.ay += sp * 0.7;
      this.ax = U.clamp(this.ax, 0, 1); this.ay = U.clamp(this.ay, 0, 1);
      if (e.kickDown) this.shoot(true);
    } else if (this.phase === 'keeper') {
      if (e.dive0Down) this.dive = 0;
      if (e.dive1Down) this.dive = 1;
      if (e.dive2Down) this.dive = 2;
      if (e.kickDown && this.dive < 0) this.dive = U.randInt(0, 2);
      if (this.dive >= 0 || this.phaseT > 4) {
        if (this.dive < 0) this.dive = U.randInt(0, 2);
        this.shoot(false);
      }
    } else if (this.phase === 'fly') {
      this.flyT += dt;
      var f = U.clamp(this.flyT / this.flyDur, 0, 1), fe = U.easeIn(f);
      var tx = gr.x + gr.w * this.target.x, ty = gr.y + gr.h * this.target.y;
      this.ball.x = U.lerp(HB.V.w / 2, tx, fe);
      this.ball.y = U.lerp(650, ty, fe) - Math.sin(f * Math.PI) * 70;
      this.ball.r = U.lerp(26, 15, fe);
      this.ball.rot += dt * 12;
      this.keeper.t = U.clamp(this.keeper.t + dt * 2.2, 0, 1);
      if (f >= 1) this.resolve();
    } else if (this.phase === 'result') {
      if (this.phaseT > 1.7) this.next();
    }
    this.messageT -= dt;
    /* pointer drag aiming */
    var Input = HB.Input;
    Input.state.forEach(function (s) {
      if (s.down && s.moved > 0) {
        if (this.phase === 'aim' && s.y < 600) {
          this.ax = U.clamp((s.x - gr.x) / gr.w, 0, 1);
          this.ay = U.clamp((s.y - gr.y) / gr.h, 0, 1);
        }
      }
    }, this);
  };

  Penalty.prototype.render = function (g) {
    var V = HB.V, st = this.stadium, gr = this.goalRect();
    var bg = Art.buildBackground(st, V, HB.Save.data.settings.quality);
    Art.drawBackground(g, bg, HB.clock, st);
    /* penalty spot */
    Art.ellipse(g, V.w / 2, 660, 8, 3, 'rgba(255,255,255,0.8)');
    /* goal front view */
    g.save();
    Art.fillRR(g, gr.x - 16, gr.y - 18, gr.w + 32, gr.h + 22, 10, 'rgba(10,24,45,0.5)');
    Art.fillRR(g, gr.x, gr.y, gr.w, gr.h, 4, 'rgba(220,238,255,0.08)');
    g.save(); Art.rr(g, gr.x, gr.y, gr.w, gr.h, 4); g.clip();
    g.strokeStyle = 'rgba(240,250,255,0.38)'; g.lineWidth = 1.1;
    for (var i = -gr.h; i < gr.w + gr.h; i += 14) {
      Art.line(g, gr.x + i, gr.y, gr.x + i - gr.h, gr.y + gr.h, 'rgba(240,250,255,0.32)', 1.1);
      Art.line(g, gr.x + i, gr.y + gr.h, gr.x + i + gr.h, gr.y, 'rgba(240,250,255,0.32)', 1.1);
    }
    g.restore();
    var metal = g.createLinearGradient(0, gr.y - 12, 0, gr.y + 6);
    metal.addColorStop(0, '#ffffff'); metal.addColorStop(1, '#8ba2c2');
    Art.fillRR(g, gr.x - 12, gr.y - 12, gr.w + 24, 14, 6, metal);
    Art.fillRR(g, gr.x - 12, gr.y - 12, 12, gr.h + 24, 6, metal);
    Art.fillRR(g, gr.x + gr.w, gr.y - 12, 12, gr.h + 24, 6, metal);
    g.restore();
    /* keeper */
    var kd = this.phase === 'fly' ? this.keeper.t : 0;
    var kzone = this.shooter === 0 ? this.keeper.diveX : [0.16, 0.5, 0.84][this.dive < 0 ? 1 : this.dive];
    var kx = U.lerp(V.w / 2, gr.x + gr.w * kzone, U.easeOut(kd) * 0.85);
    var ky = 500 - Math.sin(kd * Math.PI) * 70;
    var keeperChar = HB.Data.characters[(HB.Save.data.character + 17) % HB.Data.characters.length];
    Art.shadow(g, kx, 520, 60, 12, 0.25);
    Art.character(g, keeperChar, {
      x: kx, y: ky, scale: 1.15, facing: 1, t: HB.clock, pose: kd > 0.1 ? 'jump' : 'idle',
      run: 0, look: { x: 0, y: 0 }, kit: C.blue, sizeStat: 60,
      gear: { hat: -1, glasses: -1, jersey: -1, boots: -1 }
    });
    /* ball */
    if (this.phase !== 'fly') { this.ball.x = V.w / 2; this.ball.y = 640; this.ball.r = 26; }
    Art.ball(g, this.ball, HB.clock);
    /* aim reticle */
    if (this.phase === 'aim') {
      var ax = gr.x + gr.w * this.ax, ay = gr.y + gr.h * this.ay;
      g.save(); g.globalAlpha = 0.9;
      g.strokeStyle = C.gold; g.lineWidth = 4;
      g.beginPath(); g.arc(ax, ay, 22, 0, Math.PI * 2); g.stroke();
      Art.line(g, ax - 32, ay, ax - 12, ay, C.gold, 4); Art.line(g, ax + 12, ay, ax + 32, ay, C.gold, 4);
      Art.line(g, ax, ay - 32, ax, ay - 12, C.gold, 4); Art.line(g, ax, ay + 12, ax, ay + 32, C.gold, 4);
      g.restore();
      Art.text(g, 'AIM', ax, ay - 42, 14, C.gold, 'center', '900');
    }
    /* particles */
    for (var j = 0; j < this.particles.length; j++) {
      var p = this.particles[j]; g.globalAlpha = U.clamp(p.life, 0, 1);
      Art.circle(g, p.x, p.y, p.size, p.color);
    }
    g.globalAlpha = 1;
    Art.drawWeather(g, st, HB.clock, V);
    this.renderHUD(g);
    this.renderControls(g);
  };
  Penalty.prototype.renderHUD = function (g) {
    var V = HB.V, w = V.w, cx = w / 2;
    Art.panel(g, cx - 260, 14, 520, 86, 18, { fill: 'rgba(9,20,42,0.85)', stroke: U.alpha(C.gold, 0.5) });
    Art.text(g, 'PENALTY DUEL', cx, 34, 20, C.gold, 'center', '900');
    Art.text(g, this.score[0] + '  -  ' + this.score[1], cx, 68, 34, C.paper, 'center', '900');
    for (var s = 0; s < 2; s++) {
      for (var i = 0; i < 5; i++) {
        var x = (s === 0 ? cx - 230 + i * 24 : cx + 230 - i * 24);
        Art.circle(g, x, 68, 8, i < this.attempts[s] ? (s === 0 ? C.red : C.blue) : 'rgba(255,255,255,0.16)');
      }
    }
    Art.text(g, 'ROUND ' + Math.min(5, this.round + 1) + (this.round >= 5 ? '  •  SUDDEN DEATH' : ''), cx, 112, 14, U.alpha(C.paper, 0.8), 'center', '800', { shadow: false });
    if (this.messageT > 0) Art.text(g, this.message, cx, 160, 30, this.outcome === 'GOAL!' ? C.gold : C.paper, 'center', '900', { outline: C.ink, outlineW: 6 });
    if (this.phase === 'aim' || this.phase === 'keeper') {
      var label = this.phase === 'aim' ? 'Move the crosshair, then press KICK at the right power' : 'Pick a dive direction before the rival shoots!';
      Art.text(g, label, cx, 192, 16, U.alpha(C.paper, 0.85), 'center', '800');
    }
  };
  Penalty.prototype.renderControls = function (g) {
    if (this.paused || this.finished) return;
    var c = this.layoutControls()[0], Input = HB.Input;
    function d(r) { return Input.pointersIn(r).length > 0; }
    var ctrls = [
      ['up', 'up', C.cyan], ['left', 'left', C.cyan], ['right', 'right', C.cyan], ['down', 'down', C.cyan]
    ];
    for (var i = 0; i < ctrls.length; i++) {
      var k = ctrls[i][0];
      if (this.phase === 'keeper') continue;
      Art.panel(g, c[k].x, d(c[k]) ? c[k].y + 3 : c[k].y, c[k].w, c[k].h, 18, { fill: U.alpha(ctrls[i][2], d(c[k]) ? 0.8 : 0.3), stroke: 'rgba(255,255,255,0.4)' });
      Art.icon(g, ctrls[i][1], c[k].x + c[k].w / 2, c[k].y + c[k].h / 2, 34, '#ffffff');
    }
    /* power bar */
    if (this.phase === 'aim') {
      var bx = 250, bw = Math.min(300, HB.V.w - 520), by = 548;
      Art.text(g, 'POWER', bx + bw / 2, by - 14, 14, C.paper, 'center', '900', { shadow: false });
      Art.fillRR(g, bx, by, bw, 24, 12, 'rgba(6,16,34,0.85)');
      var pg = g.createLinearGradient(bx, 0, bx + bw, 0);
      pg.addColorStop(0, C.teal); pg.addColorStop(0.7, C.gold); pg.addColorStop(1, C.red);
      Art.fillRR(g, bx + 2, by + 2, (bw - 4) * this.power, 20, 10, pg);
      Art.line(g, bx + bw * 0.82, by - 4, bx + bw * 0.82, by + 28, C.paper, 3);
    }
    var kr = c.kick;
    if (this.phase === 'aim') {
      Art.panel(g, kr.x, d(kr) ? kr.y + 3 : kr.y, kr.w, kr.h, 22, { fill: U.alpha(C.gold, d(kr) ? 0.9 : 0.38), stroke: C.gold, gradient: true, fill2: U.alpha(C.ink, 0.8), gloss: true });
      Art.icon(g, 'kick', kr.x + kr.w / 2, kr.y + kr.h / 2 - 10, 46, '#ffffff');
      Art.text(g, 'KICK', kr.x + kr.w / 2, kr.y + kr.h - 20, 16, '#ffffff', 'center', '900', { shadow: false });
    }
    if (this.phase === 'keeper') {
      var labels = ['DIVE LEFT', 'STAY', 'DIVE RIGHT'];
      for (var j = 0; j < 3; j++) {
        var r = c['dive' + j];
        Art.panel(g, r.x, d(r) ? r.y + 3 : r.y, r.w, r.h, 16, { fill: U.alpha(C.cyan, d(r) ? 0.8 : 0.28), stroke: 'rgba(255,255,255,0.4)' });
        Art.icon(g, j === 0 ? 'left' : j === 2 ? 'right' : 'shield', r.x + r.w / 2, r.y + 26, 26, '#ffffff');
        Art.text(g, labels[j], r.x + r.w / 2, r.y + 56, 13, '#ffffff', 'center', '900', { shadow: false });
      }
      Art.text(g, 'TIME ' + Math.max(0, 4 - this.phaseT).toFixed(1), HB.V.w / 2, 540, 18, C.gold, 'center', '900');
    }
    var pr = c.pause;
    Art.panel(g, pr.x, pr.y, pr.w, pr.h, 14, { fill: 'rgba(9,20,42,0.75)', stroke: 'rgba(255,255,255,0.3)' });
    Art.icon(g, 'pause', pr.x + pr.w / 2, pr.y + pr.h / 2, 26, C.paper);
  };
})(window.HB = window.HB || {});
