/* Head Ball 3 - opponent AI.
 * Predictive positioning, timed headers, charged shots and tactical powers,
 * with five difficulty tiers that change reaction time and decision quality. */
(function (HB) {
  'use strict';
  var U = HB.U, W = HB.WORLD, Data = HB.Data;
  var LEVELS = [
    { react: 0.34, accuracy: 0.42, power: 0.12, aggro: 0.55, charge: 0.25 },
    { react: 0.25, accuracy: 0.60, power: 0.32, aggro: 0.68, charge: 0.42 },
    { react: 0.18, accuracy: 0.76, power: 0.55, aggro: 0.78, charge: 0.60 },
    { react: 0.12, accuracy: 0.88, power: 0.80, aggro: 0.88, charge: 0.76 },
    { react: 0.075, accuracy: 0.97, power: 1.00, aggro: 0.96, charge: 0.90 }
  ];

  function AI(player, level) {
    this.p = player;
    this.level = U.clamp(level | 0, 0, 4);
    this.cfg = LEVELS[this.level];
    this.timer = 0; this.decision = 0; this.target = W.w - 320;
    this.kickCd = 0; this.jumpCd = 0; this.dashCd = 0; this.powerCd = 1.5;
    this.jitter = 0; this.intent = 'defend';
  }
  HB.AI = AI;

  AI.prototype.predict = function (m, horizon) {
    var b = m.ball, t = horizon;
    var x = b.x + b.vx * t, y = b.y + b.vy * t + 0.5 * 1520 * t * t;
    x = U.clamp(x, 40, W.w - 40);
    if (y > W.ground - b.r) y = W.ground - b.r;
    return { x: x, y: y };
  };
  AI.prototype.think = function (m, dt) {
    var p = this.p, c = this.cfg, b = m.ball;
    this.timer -= dt; this.kickCd -= dt; this.jumpCd -= dt; this.dashCd -= dt; this.powerCd -= dt;
    if (m.state !== 'play') { p.input.left = p.input.right = p.input.jump = false; return; }
    if (this.timer <= 0) {
      this.timer = c.react * U.rnd(0.75, 1.3);
      this.decide(m);
    }
    /* continuous steering toward the decision target */
    var dx = this.target - p.x;
    var dead = 16 + (1 - c.accuracy) * 34;
    p.input.left = dx < -dead;
    p.input.right = dx > dead;
    if (p.flags.scramble) { var t = p.input.left; p.input.left = p.input.right; p.input.right = t; }
    /* freeze / stun override */
    if (p.flags.frozen || p.stun > 0) { p.input.left = p.input.right = false; return; }
    /* shoot when the ball is in range */
    var d = U.dist(b.x, b.y, p.x + p.facing * 26, p.y - 30);
    var reach = 92 + b.r;
    if (this.kickCd <= 0 && d < reach && b.y > p.y - 200) {
      var chance = c.accuracy * (p.flags.frozen ? 0 : 1);
      if (Math.random() < chance) {
        var charge = Math.random() < c.charge ? U.rnd(0.55, 1) : U.rnd(0.05, 0.4);
        var high = b.y < p.y - 110 || Math.random() < 0.3;
        m.fireShot(p, high ? 'lob' : 'low', charge);
        this.kickCd = U.rnd(0.28, 0.55) * (1.2 - c.accuracy * 0.5);
      } else this.kickCd = 0.22;
    }
    /* header timing */
    var nearX = Math.abs(b.x - p.x) < 130;
    if (this.jumpCd <= 0 && nearX && b.y < p.y - 120 && b.y > p.y - 320 && b.vx * (p.side === 0 ? -1 : 1) > -60) {
      if (Math.random() < c.accuracy * 1.1) { m.jump(p); this.jumpCd = 0.7; }
      else this.jumpCd = 0.3;
    }
    /* tactical dash to steal the ball */
    if (this.dashCd <= 0 && c.aggro > 0.6 && Math.abs(b.x - p.x) > 180 && Math.abs(b.x - p.x) < 360 && Math.abs(b.vx) > 260) {
      if (Math.random() < c.aggro * 0.25) { m.dash(p); this.dashCd = 1.5; }
    }
    /* powers */
    if (this.powerCd <= 0 && Math.random() < c.power * dt * 2.2) this.usePower(m);
  };
  AI.prototype.decide = function (m) {
    var p = this.p, c = this.cfg, b = m.ball;
    var horizon = 0.16 + c.accuracy * 0.22;
    var pr = this.predict(m, horizon);
    var ownGoalX = p.side === 0 ? 0 : W.w;
    var attackDir = p.side === 0 ? 1 : -1;
    var danger = p.side === 1 ? b.x > W.w * 0.52 : b.x < W.w * 0.48;
    var ballComing = (b.vx * (p.side === 1 ? 1 : -1)) > 60;
    this.jitter = U.rnd(-1, 1) * (1 - c.accuracy) * 130;
    if (danger && ballComing) {
      /* stand between the ball and the goal, bias toward the predicted point */
      var defensive = ownGoalX + attackDir * (p.side === 1 ? -150 : 150);
      this.target = U.lerp(defensive, pr.x, c.aggro * 0.75) + this.jitter;
      this.intent = 'defend';
    } else if (Math.abs(pr.x - p.x) < 260 / c.aggro) {
      this.target = pr.x - attackDir * 26 + this.jitter;
      this.intent = 'attack';
    } else {
      var home = p.side === 1 ? W.w * 0.66 : W.w * 0.34;
      this.target = U.lerp(home, pr.x, c.aggro * 0.6) + this.jitter;
      this.intent = 'support';
    }
    if (b.y < W.ground - 250) this.target = U.lerp(this.target, pr.x, 0.6);
    this.target = U.clamp(this.target, 70, W.w - 70);
  };
  AI.prototype.usePower = function (m) {
    var p = this.p, b = m.ball, s = p.side;
    var choices = [];
    for (var i = 0; i < p.powers.length; i++) {
      var id = p.powers[i], def = Data.power(id);
      if (!HB.Meta.powerUnlocked(id) || p.energy < def.cost) continue;
      var score = 1;
      var attacking = (b.vx * (s === 0 ? 1 : -1)) > 0;
      if (def.cat === 'offense' && attacking) score += 2;
      if (def.cat === 'defense' && !attacking && (s === 1 ? b.x > W.w * 0.6 : b.x < W.w * 0.4)) score += 2;
      if (def.key === 'freeze' && Math.abs(b.x - m.players[1 - s].x) < 260) score += 1.5;
      if (def.key === 'shield' && (s === 1 ? b.x > W.w * 0.7 : b.x < W.w * 0.3)) score += 2;
      if (def.key === 'mega_goal' && attacking) score += 2.5;
      if (def.key === 'rocket' && Math.abs(b.x - p.x) < 160) score += 1.5;
      choices.push({ slot: i, score: score + Math.random() });
    }
    if (!choices.length) { this.powerCd = 0.8; return; }
    choices.sort(function (a, b2) { return b2.score - a.score; });
    if (Math.random() < this.cfg.power) m.pressPower(s, choices[0].slot);
    this.powerCd = U.rnd(2.2, 4.5);
  };
})(window.HB = window.HB || {});
