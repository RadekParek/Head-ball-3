/* Head Ball 3 - match simulation.
 * Fixed 120 Hz physics with substeps, composite character collision, spin,
 * charged shots, headers, dashes, tackles, 20 superpowers and full rules. */
(function (HB) {
  'use strict';
  var U = HB.U, C = HB.C, W = HB.WORLD, Art = HB.Art, Audio = HB.Audio, Data = HB.Data, Meta = HB.Meta;
  var STEP = 1 / 120, GRAV = 1520, PGRAV = 1980, BASE_R = 21;

  /* Ground contact uses a small tolerance. Landing exactly on p.y === W.ground
     used to leave onGround false for ever, which silently disabled jumping. */
  function clampPlayer(p) {
    p.x = U.clamp(p.x, 56, W.w - 56);
    if (p.y >= W.ground - 0.5) {
      if (!p.onGround && p.vy > 220) Audio.play('land');
      if (p.y > W.ground) p.y = W.ground;
      if (p.vy > 0) p.vy = 0;
      p.onGround = true;
    } else p.onGround = false;
  }

  function makePlayer(side, cfg, charId, kit) {
    var c = Data.character(charId), st = Meta.charStats(charId);
    return {
      side: side, char: c, stats: st, kit: kit || c.kit,
      x: side ? W.w - 300 : 300, y: W.ground, vx: 0, vy: 0, onGround: true,
      facing: side ? -1 : 1, scale: 1, runPhase: 0, pose: 'idle',
      energy: 35, shotCharge: 0, charging: null, kickAnim: 0, dashCd: 0, slide: 0,
      airJump: false, stun: 0, ballCd: 0, combo: 0, lastTouch: -1,
      powers: Meta.equippedPowers(),
      input: { left: false, right: false, jump: false, kick: false, lob: false, dash: false },
      prev: { left: false, right: false, jump: false, kick: false, lob: false, dash: false },
      ai: null, flags: {}
    };
  }

  function Match(cfg) { this.init(cfg); }
  HB.Match = Match;
  Match.prototype.init = function (cfg) {
    cfg = cfg || {};
    this.cfg = cfg;
    this.mode = cfg.mode || 'quick';
    this.local = !!cfg.local;
    this.tutorial = !!cfg.tutorial && !HB.Save.data.tutorialDone;
    this.stadium = cfg.stadium || Meta.stadium();
    this.length = cfg.length || HB.Save.data.settings.matchLength || 90;
    this.golden = cfg.golden != null ? cfg.golden : HB.Save.data.settings.goldenGoal;
    this.aiLevel = cfg.ai == null ? HB.Save.data.settings.difficulty : cfg.ai;
    this.players = [
      makePlayer(0, cfg, HB.Save.data.character),
      makePlayer(1, cfg, cfg.opponent ? cfg.opponent.id : Meta.leagueOpponent().id, cfg.opponentKit)
    ];
    this.players[0].kit = C.red;
    this.players[1].kit = cfg.opponentKit || C.blue;
    if (!this.local) this.players[1].ai = new HB.AI(this.players[1], this.aiLevel);
    else this.players[1].powers = Meta.equippedPowers().slice();
    this.ball = this.newBall();
    this.trail = [];
    this.score = [0, 0];
    this.time = this.length;
    this.state = 'kickoff';
    this.started = false;
    this.countdown = 3.2;
    this.goalTimer = 0;
    this.goalSide = -1;
    this.goldenActive = false;
    this.effects = [];
    this.particles = [];
    this.particlePool = [];
    this.shake = 0; this.flash = 0; this.slow = 1;
    this.acc = 0; this.t = 0;
    this.finished = false; this.paused = false; this.result = null;
    this.maxDeficit = 0;
    this.stats = [
      { shots: 0, headers: 0, saves: 0, powers: 0, tackles: 0, perfectHeaders: 0 },
      { shots: 0, headers: 0, saves: 0, powers: 0, tackles: 0, perfectHeaders: 0 }
    ];
    this.tutorialStep = this.tutorial ? 0 : -1;
    this.tutorialHint = 0;
    this.kickoffSide = 1;
    this.message = ''; this.messageUntil = 0;
    Audio.music(this.mode === 'tournament' ? 'tense' : 'match');
    Audio.setCrowd(0.55);
    Audio.setIntensity(0);
    this.resetPositions();
  };
  Match.prototype.newBall = function () {
    var bid = HB.Save.data.gear.ball, item = Data.gearItem(bid);
    return {
      x: W.w / 2, y: W.ground - 190, vx: 0, vy: 0, r: BASE_R, rot: 0, spin: 0,
      style: item ? item.style : 'classicball', alpha: 1, glow: null,
      lastTouch: -1, lastTeam: -1, touchCd: 0
    };
  };
  Match.prototype.resetPositions = function () {
    var p = this.players;
    p[0].x = 320; p[1].x = W.w - 320;
    p[0].y = p[1].y = W.ground;
    p[0].vx = p[1].vx = 0; p[0].vy = p[1].vy = 0;
    p[0].facing = 1; p[1].facing = -1;
    p[0].onGround = p[1].onGround = true;
    var b = this.ball;
    b.x = W.w / 2; b.y = W.ground - 210; b.vx = 0; b.vy = 0; b.spin = 0; b.rot = 0; b.lastTouch = -1;
    this.trail.length = 0;
  };
  Match.prototype.setInput = function (side, input) {
    var p = this.players[side], prev = p.prev;
    for (var k in p.input) if (Object.prototype.hasOwnProperty.call(p.input, k)) {
      prev[k] = p.input[k];
      p.input[k] = !!input[k];
    }
    p.edges = {
      jump: p.input.jump && !prev.jump,
      dash: p.input.dash && !prev.dash,
      kick: !p.input.kick && prev.kick,
      lob: !p.input.lob && prev.lob,
      kickDown: p.input.kick && !prev.kick,
      lobDown: p.input.lob && !prev.lob
    };
  };
  Match.prototype.pressPower = function (side, slot) {
    if (this.state !== 'play' || this.paused || this.finished) return;
    var p = this.players[side], id = p.powers[slot];
    var def = Data.power(id);
    if (!def) return;
    if (!Meta.powerUnlocked(id)) { Audio.play('error'); HB.toast('Power is locked', 'error'); return; }
    if (p.energy < def.cost) { Audio.play('error'); HB.toast('Power charging… ' + Math.floor(p.energy) + '%', 'info'); return; }
    p.energy -= def.cost;
    this.stats[side].powers++;
    this.activatePower(side, id);
  };
  Match.prototype.activatePower = function (side, id) {
    var def = Data.power(id), other = 1 - side, dur = Meta.powerDuration(id);
    var e = { key: def.key, id: id, side: side, target: -1, until: this.t + dur, color: def.color };
    var opponentPowers = { freeze: 1, shrink: 1, ice: 1, scramble: 1 };
    var selfPowers = { rocket: 1, ghost_player: 1, giant_player: 1, turbo: 1, double_goal: 1, magnet: 1 };
    if (opponentPowers[def.key]) e.target = other;
    else if (selfPowers[def.key]) e.target = side;
    this.effects.push(e);
    /* instant effects */
    if (def.key === 'teleport') {
      var a = this.players[side], b = this.players[other], tx = a.x;
      a.x = b.x; b.x = tx; Audio.play('teleport');
      this.burst(a.x, a.y - 90, 22, def.color, 260); this.burst(b.x, b.y - 90, 22, def.color, 260);
    } else if (def.key === 'quake') {
      var foe = this.players[other]; foe.stun = 0.85; foe.vy = -320; foe.vx += (other ? 1 : -1) * 260;
      this.shake = 16; Audio.play('quake');
    } else if (def.key === 'meteor') {
      this.ball.glow = '#ff7a3d';
      this.ball.vx *= 1.25; this.ball.vy -= 120;
      Audio.play('fire');
    } else if (def.key === 'freeze') { Audio.play('freeze'); }
    else if (def.key === 'shield') { Audio.play('shield'); }
    else if (def.key === 'ice') { Audio.play('ice'); }
    else { Audio.play('power'); }
    var s = def.name.toUpperCase();
    HB.toast(s + ' activated!', 'power');
    this.burst(this.players[side].x, this.players[side].y - 100, 26, def.color, 300);
    HB.Input.vibrate(35);
  };
  Match.prototype.playerEffect = function (key, side) {
    for (var i = this.effects.length - 1; i >= 0; i--) {
      var e = this.effects[i];
      if (e.key === key && e.target === side && e.until > this.t) return e;
    }
    return null;
  };
  Match.prototype.ownerEffect = function (key, side) {
    for (var i = this.effects.length - 1; i >= 0; i--) {
      var e = this.effects[i];
      if (e.key === key && e.side === side && e.until > this.t) return e;
    }
    return null;
  };
  Match.prototype.worldEffect = function (key) {
    for (var i = this.effects.length - 1; i >= 0; i--) {
      var e = this.effects[i];
      if (e.key === key && e.until > this.t) return e;
    }
    return null;
  };
  Match.prototype.goalBoost = function (side) {
    var best = 1;
    for (var i = 0; i < this.effects.length; i++) {
      var e = this.effects[i];
      if (e.key === 'mega_goal' && e.until > this.t && (1 - e.side) === side) best = Math.max(best, 1.45);
    }
    return best;
  };
  Match.prototype.shielded = function (side) {
    for (var i = 0; i < this.effects.length; i++) {
      var e = this.effects[i];
      if (e.key === 'shield' && e.until > this.t && e.side === side) return true;
    }
    return false;
  };

  Match.prototype.part = function () {
    var p = this.particlePool.pop();
    if (!p) p = {};
    p.life = 0; p.max = 1; p.x = 0; p.y = 0; p.vx = 0; p.vy = 0; p.size = 3; p.color = '#fff'; p.type = 0; p.rot = 0; p.vr = 0;
    this.particles.push(p);
    return p;
  };
  Match.prototype.burst = function (x, y, n, color, speed, type) {
    var max = HB.Save.data.settings.quality === 0 ? 90 : 220;
    n = Math.min(n, max - this.particles.length);
    for (var i = 0; i < n; i++) {
      var p = this.part(), a = U.rnd(0, Math.PI * 2), s = U.rnd(speed * 0.25, speed);
      p.x = x; p.y = y; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s - 60;
      p.max = p.life = U.rnd(0.35, 0.9); p.size = U.rnd(2, 6); p.color = color;
      p.type = type || 0; p.rot = U.rnd(0, 6); p.vr = U.rnd(-9, 9);
    }
  };
  Match.prototype.confetti = function () {
    var colors = [C.gold, C.red, C.blue, C.teal, C.pink, '#ffffff'];
    for (var i = 0; i < 90; i++) {
      var p = this.part();
      p.x = U.rnd(0, W.w); p.y = U.rnd(-180, 320);
      p.vx = U.rnd(-70, 70); p.vy = U.rnd(90, 260);
      p.max = p.life = U.rnd(1.5, 3); p.size = U.rnd(4, 9);
      p.color = U.pick(colors); p.type = 1; p.rot = U.rnd(0, 6); p.vr = U.rnd(-8, 8);
    }
  };
  Match.prototype.updateParticles = function (dt) {
    var a = this.particles;
    for (var i = a.length - 1; i >= 0; i--) {
      var p = a[i];
      p.life -= dt;
      if (p.life <= 0) { a.splice(i, 1); if (this.particlePool.length < 260) this.particlePool.push(p); continue; }
      p.vy += 620 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
  };

  /* ---------------- Frame update ---------------- */
  Match.prototype.update = function (dt) {
    if (this.paused || this.finished) { Audio.setIntensity(0); return; }
    dt = Math.min(dt, 0.05);
    this.t += dt;
    this.shake = U.damp(this.shake, 0, 9, dt);
    this.flash = U.damp(this.flash, 0, 7, dt);
    this.slow = U.damp(this.slow, 1, 3, dt);
    this.updateParticles(dt);
    if (this.ripples) { for (var ri = this.ripples.length - 1; ri >= 0; ri--) if (this.t - this.ripples[ri].t > 1.1) this.ripples.splice(ri, 1); }
    for (var i = this.effects.length - 1; i >= 0; i--) if (this.effects[i].until <= this.t) this.effects.splice(i, 1);
    /* One continuous clock from the opening whistle to the final whistle.
       Celebrations and kick-off resets burn match time just like the original
       arcade game, so 90 seconds of match really last 90 seconds. */
    if (this.started && !this.goldenActive) {
      this.time = Math.max(0, this.time - dt);
      if (this.time <= 0) {
        if (this.score[0] === this.score[1] && this.golden) {
          this.goldenActive = true; this.message = 'GOLDEN GOAL!'; this.messageUntil = this.t + 2;
          Audio.play('whistle'); HB.toast('Golden goal - next goal wins!', 'info');
        } else { this.end('time'); return; }
      }
    }
    if (this.state === 'kickoff') {
      this.countdown -= dt;
      var n = Math.ceil(this.countdown - 0.2);
      if (n !== this._lastCount && n > 0 && n <= 3) { this._lastCount = n; Audio.play('countdown'); }
      if (this.countdown <= 0) {
        this.state = 'play'; this.started = true; Audio.play('go'); Audio.play('whistle');
        this.message = this.goldenActive ? 'GOLDEN GOAL!' : 'KICK OFF!'; this.messageUntil = this.t + 1.1;
      }
    } else if (this.state === 'goal') {
      this.celebrateBall(dt);
      this.goalTimer -= dt;
      if (this.goalTimer <= 0) {
        if (this.goldenActive) { this.end('golden'); return; }
        this.state = 'kickoff'; this.countdown = 2.6; this._lastCount = 0;
        this.resetPositions(); this.kickoffSide = this.goalSide;
      }
    } else if (this.state === 'play') {
      this.processInputs();
      this.acc += dt * this.slow;
      var steps = 0;
      while (this.acc >= STEP && steps < 10) { this.step(STEP); this.acc -= STEP; steps++; }
      if (steps === 10) this.acc = 0;
      var urgency = this.time < 20 && !this.goldenActive ? U.clamp((20 - this.time) / 20, 0, 1) : Math.abs(this.score[0] - this.score[1]) > 2 ? 0.35 : 0.1;
      Audio.setIntensity(urgency);
    }
    if (this.tutorialStep >= 0) this.updateTutorial(dt);
    if (this.t % 1 < dt) HB.Save.flush();
  };
  Match.prototype.processInputs = function () {
    for (var s = 0; s < 2; s++) {
      var p = this.players[s], e = p.edges;
      if (!e) continue;
      if (p.flags.frozen || p.stun > 0) continue;
      if (e.jump) this.jump(p);
      if (e.dash) this.dash(p);
      /* Head Ball 2 style: KICK charges while held. Quick tap drives the ball
         along the ground, a held shot lifts it high. LOB is a separate button
         when the extra control row is enabled. */
      if (e.kickDown) { p.charging = 'kick'; p.shotCharge = 0; Audio.play('charge'); }
      if (e.lobDown && !p.charging) { p.charging = 'lob'; p.shotCharge = 0; Audio.play('charge'); }
      if (e.kick && p.charging === 'kick') {
        var c = p.shotCharge;
        this.fireShot(p, c > 0.42 ? 'high' : 'low', c); p.charging = null; p.shotCharge = 0;
      }
      if (e.lob && p.charging === 'lob') { this.fireShot(p, 'lob', p.shotCharge); p.charging = null; p.shotCharge = 0; }
    }
  };
  Match.prototype.jump = function (p) {
    if (p.onGround) {
      p.vy = -(660 + p.stats.jump * 2.9) * (p.flags.turbo ? 1.12 : 1);
      p.onGround = false; p.airJump = true;
      Audio.play('jump'); this.burst(p.x, p.y - 4, 8, '#ffffff', 120);
    } else if (p.airJump) {
      p.vy = -(520 + p.stats.jump * 1.8); p.airJump = false;
      Audio.play('dash'); this.burst(p.x, p.y - 60, 14, C.cyan, 190);
    }
  };
  Match.prototype.dash = function (p) {
    if (p.dashCd > 0) return;
    p.dashCd = 1.1; p.slide = 0.26;
    p.vx = p.facing * (680 + p.stats.speed * 2.6);
    if (p.onGround) p.vy = -110;
    Audio.play('dash'); this.burst(p.x, p.y - 12, 10, p.kit, 180);
    HB.Input.vibrate(12);
  };
  Match.prototype.fireShot = function (p, type, charge) {
    var b = this.ball, reach = 78 * p.scale + b.r;
    var bx = p.x + p.facing * 26 * p.scale, by = p.y - 26 * p.scale;
    var d = U.dist(b.x, b.y, bx, by);
    if (d > reach && U.dist(b.x, b.y, p.x, p.y - 60 * p.scale) > 96 * p.scale + b.r) {
      p.kickAnim = 0.18; return;
    }
    var dir = p.side === 0 ? 1 : -1;
    var rocket = this.ownerEffect('rocket', p.side) ? 1.55 : 1;
    var combo = p.combo >= 3 ? 1.12 : 1;
    var power = (520 + p.stats.shot * 5.4) * (0.58 + charge * 0.82) * rocket * combo;
    if (p.flags.shrink) power *= 0.82;
    var low = type === 'low';
    b.vx = dir * power * (low ? 1 : 0.86) + p.vx * 0.22;
    b.vy = low ? -(150 + charge * 110) : -(600 + charge * 300);
    b.spin = (low ? 1 : -1.6) * U.rnd(0.4, 1.2) * (p.facing > 0 ? 1 : -1);
    b.lastTouch = p.side; b.touchCd = 0.08;
    p.kickAnim = 0.26; p.energy = Math.min(100, p.energy + 3);
    this.stats[p.side].shots++;
    this.burst(b.x, b.y, 12, charge > 0.7 ? C.gold : '#ffffff', 200);
    Audio.play(charge > 0.65 ? 'kickHard' : 'kick');
    HB.Input.vibrate(charge > 0.65 ? 30 : 14);
    if (charge > 0.8) { this.shake = 4; }
  };

  /* ---------------- One physics substep ---------------- */
  Match.prototype.step = function (dt) {
    var i, p, b = this.ball;
    /* effect-driven per-frame state */
    for (i = 0; i < 2; i++) {
      p = this.players[i];
      p.flags = {
        frozen: !!this.playerEffect('freeze', i),
        ghost: !!this.playerEffect('ghost_player', i),
        shrink: !!this.playerEffect('shrink', i),
        giant: !!this.playerEffect('giant_player', i),
        turbo: !!this.playerEffect('turbo', i),
        ice: !!this.playerEffect('ice', i),
        scramble: !!this.playerEffect('scramble', i),
        rocket: !!this.ownerEffect('rocket', i),
        magnet: !!this.ownerEffect('magnet', i),
        double: !!this.ownerEffect('double_goal', i),
        shielded: this.shielded(i)
      };
      p.scale = (p.flags.giant ? 1.34 : 1) * (p.flags.shrink ? 0.66 : 1);
    }
    var giant = this.worldEffect('giant_ball'), tiny = this.worldEffect('tiny_ball'), ghost = this.worldEffect('ghost_ball'), meteor = this.worldEffect('meteor');
    b.r = BASE_R * (giant ? 1.85 : 1) * (tiny ? 0.55 : 1);
    b.alpha = ghost ? 0.24 + Math.abs(Math.sin(this.t * 7)) * 0.3 : 1;
    b.glow = meteor ? '#ff7a3d' : this.ownerEffect('rocket', 0) || this.ownerEffect('rocket', 1) ? '#ffd166' : null;

    /* players */
    for (i = 0; i < 2; i++) {
      p = this.players[i];
      if (p.ai) p.ai.think(this, dt);
      this.movePlayer(p, dt);
    }
    /* player vs player */
    var a = this.players[0], c = this.players[1];
    var gap = Math.abs(a.x - c.x);
    if (gap < 58 && Math.abs(a.y - c.y) < 130) {
      var push = (58 - gap) * 0.5 * (a.x < c.x ? -1 : 1);
      a.x += push; c.x -= push;
      if (a.slide > 0 && c.stun <= 0) { c.stun = 0.45; c.vy = -230; c.vx = a.facing * 320; this.stats[0].tackles++; Audio.play('tackle'); }
      if (c.slide > 0 && a.stun <= 0) { a.stun = 0.45; a.vy = -230; a.vx = c.facing * 320; this.stats[1].tackles++; Audio.play('tackle'); }
    }
    /* ball forces */
    var mag = null, magSide = -1;
    for (i = 0; i < 2; i++) if (this.players[i].flags.magnet) { mag = this.players[i]; magSide = i; }
    if (mag) {
      var dx = mag.x - b.x, dy = (mag.y - 110) - b.y, dd = Math.max(60, U.hypot(dx, dy));
      b.vx += dx / dd * 900 * dt; b.vy += dy / dd * 620 * dt;
    }
    var boom = this.worldEffect('boomerang');
    if (boom) {
      var target = boom.side === 0 ? W.w : 0;
      b.vx += U.sign(target - b.x) * 240 * dt;
    }
    var slow = this.worldEffect('slowmo');
    var ballDt = dt * (slow ? 0.55 : 1) * (meteor ? 1.08 : 1);
    /* ball integration */
    b.vy += GRAV * ballDt;
    b.vy += -b.spin * b.vx * 0.05 * ballDt;
    b.vx *= 1 - 0.16 * ballDt;
    b.vy *= 1 - 0.05 * ballDt;
    b.spin *= 1 - 0.35 * ballDt;
    b.x += b.vx * ballDt; b.y += b.vy * ballDt;
    b.rot += (b.vx / Math.max(8, b.r)) * ballDt * 0.55 + b.spin * ballDt;
    b.touchCd = Math.max(0, b.touchCd - dt);
    if (meteor && Math.abs(b.vx) > 100) this.burst(b.x, b.y, 1, U.pick(['#ffce4b', '#ff7a3d', '#f0455c']), 40);
    /* trail */
    this.trail.push({ x: b.x, y: b.y, r: b.r });
    if (this.trail.length > 9) this.trail.shift();

    this.ballWalls(b, ballDt);
    for (i = 0; i < 2; i++) if (b.touchCd <= 0) this.collidePlayerBall(this.players[i], b);
    this.checkGoal(b);
  };
  Match.prototype.movePlayer = function (p, dt) {
    var slow = this.worldEffect('slowmo'), d = dt * (slow && slow.side !== p.side ? 0.55 : 1);
    if (p.stun > 0) p.stun -= dt;
    if (p.dashCd > 0) p.dashCd -= dt;
    if (p.slide > 0) p.slide -= dt;
    if (p.kickAnim > 0) p.kickAnim -= dt;
    if (p.ballCd > 0) p.ballCd -= dt;
    if (p.charging) p.shotCharge = U.clamp(p.shotCharge + dt / 1.15, 0, 1);
    p.energy = Math.min(100, p.energy + d * 7.5);
    var dir = 0;
    if (p.input.left) dir -= 1;
    if (p.input.right) dir += 1;
    if (p.flags.scramble) dir *= -1;
    var speed = (330 + p.stats.speed * 3.1) * (p.flags.turbo ? 1.45 : 1) * (p.flags.shrink ? 0.86 : 1);
    if (p.flags.frozen || p.stun > 0) { p.vx = U.damp(p.vx, 0, 12, d); dir = 0; }
    else if (dir) {
      /* Arcade feel: you are at full speed within ~4 frames, and a reversal
         bites instantly instead of coasting through a slow turn. */
      var target = dir * speed;
      var dv = target - p.vx;
      var accel = (p.vx * dir < 0 ? 13000 : 7800) * d;
      p.vx += U.clamp(dv, -accel, accel);
      p.facing = dir;
    } else {
      var fr = p.flags.ice ? 0.985 : p.onGround ? 0.80 : 0.985;
      p.vx *= Math.pow(fr, d * 60);
      if (Math.abs(p.vx) < 6) p.vx = 0;
    }
    if (p.slide > 0 && p.onGround) p.vx *= 0.995;
    p.vy += PGRAV * d;
    p.x += p.vx * d; p.y += p.vy * d;
    if (p.y >= W.ground) {
      if (!p.onGround && p.vy > 220) { Audio.play('land'); this.burst(p.x, W.ground, 6, '#d7e8c0', 90); }
      p.y = W.ground; p.vy = 0; p.onGround = true; p.airJump = false;
    } else p.onGround = false;
    clampPlayer(p);
    p.runPhase += Math.abs(p.vx) * d * 0.035;
    p.pose = p.stun > 0 ? 'hurt' : p.kickAnim > 0 ? 'kick' : p.slide > 0 ? 'slide' : !p.onGround ? 'jump' : Math.abs(p.vx) > 40 ? 'run' : 'idle';
  };
  Match.prototype.ballWalls = function (b, dt) {
    var gy = W.ground;
    if (b.y + b.r > gy) {
      b.y = gy - b.r;
      if (b.vy > 55) { Audio.play('bounce'); this.burst(b.x, gy, 4, '#dbecc8', 70); }
      b.vy = -b.vy * 0.71;
      b.vx *= 0.992;
      if (Math.abs(b.vy) < 38) b.vy = 0;
      b.spin *= 0.94;
    }
    if (b.y - b.r < 96) { b.y = 96 + b.r; b.vy = Math.abs(b.vy) * 0.7; }
    for (var side = 0; side < 2; side++) {
      var boost = this.goalBoost(side), gh = W.goalH * boost, gw = W.goalW * (boost > 1 ? 1.25 : 1);
      var top = gy - gh, line = side === 0 ? gw : W.w - gw;
      var near = side === 0 ? b.x - b.r < line : b.x + b.r > line;
      if (!near) continue;
      var inMouth = b.y > top + b.r * 0.35 && b.y < gy - b.r * 0.25;
      if (inMouth) {
        if (this.shielded(side)) {
          if (side === 0 && b.vx < 0) { b.x = line + b.r; b.vx = Math.abs(b.vx) * 0.9; Audio.play('save'); this.burst(b.x, b.y, 12, C.cyan, 180); }
          if (side === 1 && b.vx > 0) { b.x = line - b.r; b.vx = -Math.abs(b.vx) * 0.9; Audio.play('save'); this.burst(b.x, b.y, 12, C.cyan, 180); }
        }
        continue;
      }
      /* post / crossbar */
      if (b.y <= top + b.r * 0.35 && b.y > top - b.r * 1.2) {
        if (side === 0 && b.vx < 0) { b.x = line + b.r; b.vx = Math.abs(b.vx) * 0.86; b.vy -= 90; Audio.play('post'); }
        if (side === 1 && b.vx > 0) { b.x = line - b.r; b.vx = -Math.abs(b.vx) * 0.86; b.vy -= 90; Audio.play('post'); }
      }
      if (side === 0 && b.x - b.r < 2) { b.x = 2 + b.r; b.vx = Math.abs(b.vx) * 0.8; Audio.play('bounce'); }
      if (side === 1 && b.x + b.r > W.w - 2) { b.x = W.w - 2 - b.r; b.vx = -Math.abs(b.vx) * 0.8; Audio.play('bounce'); }
    }
  };
  Match.prototype.collidePlayerBall = function (p, b) {
    var s = p.scale, headY = p.y - 108 * s, headR = 50 * s * U.clamp(0.88 + (p.stats.size - 50) / 380, 0.86, 1.14);
    var bodyY = p.y - 44 * s, bodyR = 27 * s;
    var parts = [{ x: p.x, y: headY, r: headR, head: true }, { x: p.x, y: bodyY, r: bodyR, head: false }];
    for (var i = 0; i < parts.length; i++) {
      var q = parts[i], dx = b.x - q.x, dy = b.y - q.y, d = U.hypot(dx, dy), minD = q.r + b.r;
      if (d >= minD || d < 0.001) continue;
      var nx = dx / d, ny = dy / d, overlap = minD - d;
      b.x += nx * (overlap + 0.4); b.y += ny * (overlap + 0.4);
      var rvx = b.vx - p.vx * 0.55, rvy = b.vy - p.vy * 0.35, vn = rvx * nx + rvy * ny;
      if (vn < 0) { b.vx -= 1.7 * vn * nx; b.vy -= 1.7 * vn * ny; }
      var dir = p.side === 0 ? 1 : -1;
      var towards = (b.vx * dir) > 0;
      if (q.head) {
        var perfect = !p.onGround && Math.abs(p.vy) < 190 && b.y < headY - headR * 0.25;
        var boost = perfect ? 1.55 : !p.onGround ? 1.2 : 1;
        b.vx += dir * (170 + p.stats.shot * 1.6) * boost + nx * 60;
        b.vy -= (perfect ? 430 : 250) * boost;
        b.spin += U.rnd(-1.6, 1.6);
        this.stats[p.side].headers++;
        if (perfect) { this.stats[p.side].perfectHeaders++; Audio.play('perfect'); this.burst(b.x, b.y, 20, C.gold, 260); this.shake = 5; }
        else Audio.play('header');
        if (this.tutorialStep === 2) this.tutorialStep = 3;
      } else {
        b.vx += nx * 110 + p.vx * 0.3;
        b.vy += ny * 80 - 50;
        if (p.slide > 0) { b.vx += dir * 260; Audio.play('tackle'); }
      }
      if (b.lastTouch === p.side) p.combo++; else { p.combo = 1; this.players[1 - p.side].combo = 0; }
      b.lastTouch = p.side;
      b.touchCd = 0.075;
      p.ballCd = 0.09;
      p.energy = Math.min(100, p.energy + 5);
      /* Saves are graded by how close the ball was to going in. A touch while
         the ball is inside the six-yard box and heading goalwards is a save;
         within a post's width of the line it is a highlight-reel stop. */
      var ownGoalX = p.side === 0 ? 0 : W.w;
      var toGoal = Math.abs(b.x - ownGoalX);
      var incoming = p.side === 0 ? (b.vx + p.vx * 0) < -60 : b.vx > 60;
      var goalward = incoming || towards === false;
      if (goalward && toGoal < 300 && Math.abs(b.vx) > 180) {
        this.stats[p.side].saves = (this.stats[p.side].saves || 0) + 1; p.energy = Math.min(100, p.energy + 8);
        var wasNear = b.x - nx * 18;           /* roughly where contact happened */
        if (toGoal < 86) {
          /* miracle stop: inside the width of the goal mouth itself */
          this.stats[p.side].greatSaves = (this.stats[p.side].greatSaves || 0) + 1;
          this.callout('WHAT A SAVE!', p.side, { big: true, color: p.side === 0 ? C.cyan : C.gold });
          this.shake = 7; this.flash = 0.22; this.slow = 0.5;
          this.burst(wasNear, b.y, 26, C.cyan, 340);
          Audio.play('save'); Audio.cheer(1.1);
          HB.Input.vibrate(35);
        } else {
          this.callout('SAVE!', p.side, { color: p.side === 0 ? C.cyan : C.gold });
          Audio.play('save');
        }
      }
      this.burst(b.x, b.y, 5, '#ffffff', 120);
      return;
    }
  };
  Match.prototype.checkGoal = function (b) {
    if (this.state !== 'play') return;
    var gy = W.ground;
    for (var side = 0; side < 2; side++) {
      var boost = this.goalBoost(side), gh = W.goalH * boost, gw = W.goalW * (boost > 1 ? 1.25 : 1);
      var top = gy - gh;
      var crossed = side === 0 ? b.x < gw + b.r * 0.2 : b.x > W.w - gw - b.r * 0.2;
      if (crossed && b.y > top + b.r * 0.3 && b.y < gy - b.r * 0.15 && !this.shielded(side)) {
        this.goal(1 - side);
        return;
      }
    }
  };
  /* Ball flight during the goal celebration: gravity, net drag and net
     collision so the ball drops to the floor inside the goal. */
  Match.prototype.celebrateBall = function (dt) {
    var b = this.ball, gy = W.ground, side = this.netHit ? this.netHit.side : 1;
    var gw = W.goalW, gh = W.goalH, top = gy - gh;
    var backX = side === 0 ? gw : W.w - gw;      /* the goal line */
    var deepX = side === 0 ? 0 : W.w;            /* back of the net */
    b.vy += GRAV * dt;
    b.vx *= 1 - 1.9 * dt; b.vy *= 1 - 0.35 * dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.rot += (b.vx / Math.max(8, b.r)) * dt * 0.5;
    /* net walls: the mesh catches the ball and lets it sag */
    var inside = side === 0 ? b.x - b.r < backX : b.x + b.r > backX;
    if (inside) {
      var wallX = side === 0 ? 10 + b.r : W.w - 10 - b.r;
      if (side === 0 ? b.x < wallX : b.x > wallX) {
        b.x = wallX;
        if (Math.abs(b.vx) > 120) { this.netPuff(side, b.x, b.y); Audio.play('net'); }
        b.vx = -b.vx * 0.28;
      }
      if (b.y - b.r < top + 8) { b.y = top + 8 + b.r; b.vy = Math.abs(b.vy) * 0.3; }
    }
    if (b.y + b.r > gy) {
      b.y = gy - b.r;
      if (Math.abs(b.vy) > 130) { Audio.play('bounce'); this.burst(b.x, gy, 4, '#e8f4d8', 70); }
      b.vy = -b.vy * 0.42; b.vx *= 0.86;
      if (Math.abs(b.vy) < 40) b.vy = 0;
    }
    this.trail.push({ x: b.x, y: b.y, r: b.r });
    if (this.trail.length > 9) this.trail.shift();
  };
  /* Big in-world shout, the way the arcade original barks at you. */
  Match.prototype.callout = function (text, side, o) {
    o = o || {};
    this.calls = this.calls || [];
    this.calls.push({
      text: text, side: side, t: this.t, life: o.big ? 1.9 : 1.2,
      color: o.color || C.gold, big: !!o.big
    });
    if (this.calls.length > 3) this.calls.shift();
  };

  Match.prototype.netPuff = function (side, x, y) {
    this.ripples = this.ripples || [];
    this.ripples.push({ side: side, x: x, y: y, t: this.t });
    if (this.ripples.length > 6) this.ripples.shift();
  };

  Match.prototype.goal = function (scorer) {
    var b = this.ball;
    this.state = 'goal'; this.goalTimer = 2.35; this.goalSide = scorer;
    var mult = this.ownerEffect('double_goal', scorer) ? 2 : 1;
    this.score[scorer] += mult;
    if (mult > 1) {
      for (var i = this.effects.length - 1; i >= 0; i--) if (this.effects[i].key === 'double_goal' && this.effects[i].side === scorer) this.effects.splice(i, 1);
      HB.toast('DOUBLE GOAL! +2', 'power');
    }
    this.maxDeficit = Math.max(this.maxDeficit, Math.max(0, this.score[1] - this.score[0]));
    /* The ball must visibly rattle around inside the net, not stop dead.
       Record the entry point so the mesh can bulge and ripple from there. */
    this.netHit = { side: 1 - scorer, x: b.x, y: b.y, t: this.t, power: U.clamp(Math.abs(b.vx) / 900, 0.35, 1.6) };
    this.ripples = this.ripples || [];
    Audio.play('goal'); Audio.cheer(1.6); Audio.setIntensity(1);
    this.confetti(); this.shake = 12; this.flash = 0.75; this.slow = 0.35;
    this.burst(b.x, b.y, 34, scorer === 0 ? C.red : C.blue, 420);
    this.players[scorer].pose = 'celebrate';
    if (this.tutorialStep === 3) this.finishTutorial();
    if (this.goldenActive) { this.goalTimer = 2.1; }
    HB.Input.vibrate(60);
  };
  Match.prototype.end = function (reason) {
    if (this.finished) return;
    this.finished = true; this.state = 'ended';
    Audio.play('whistleEnd'); Audio.setCrowd(0.35); Audio.setIntensity(0);
    var s0 = this.score[0], s1 = this.score[1];
    var win = s0 > s1, draw = s0 === s1;
    var st = this.stats[0];
    var res = {
      mode: this.mode, local: this.local, win: win, draw: draw,
      score: [s0, s1], goals: s0, conceded: s1, shots: st.shots, headers: st.headers,
      saves: st.saves, powers: st.powers, tackles: st.tackles, perfectHeaders: st.perfectHeaders,
      duration: this.length - Math.max(0, this.time), maxDeficit: this.maxDeficit,
      tournamentWin: false, penaltyWin: false, opponent: this.players[1].char.name,
      rewards: null, reason: reason
    };
    if (this.mode === 'tournament' && win && this.cfg.round === 2) res.tournamentWin = true;
    if (this.cfg.rewards !== false) res.rewards = Meta.reportMatch(res);
    else res.rewards = { coins: 0, fans: 0, xp: 0, gems: 0, unlocked: [], achieved: [] };
    if (win) Audio.play('win', { delay: 0.45 }); else if (draw) Audio.play('draw', { delay: 0.45 }); else Audio.play('lose', { delay: 0.45 });
    Audio.music(win ? 'victory' : 'menu');
    this.result = res;
    HB.emit('matchEnd', res);
  };
  Match.prototype.pause = function () { if (!this.finished) { this.paused = true; Audio.setCrowd(0.12); } };
  Match.prototype.resume = function () { this.paused = false; Audio.setCrowd(0.55); HB.Audio.unlock(); };
  Match.prototype.quit = function () { this.finished = true; HB.emit('matchQuit'); };

  /* ---------------- Tutorial ---------------- */
  var TUT = [
    'Use LEFT / RIGHT to move. Run to the ball!',
    'Tap JUMP. Tap again in the air for a double jump!',
    'Hold KICK to charge, release to smash the ball.',
    'Now score a goal to finish the tutorial!',
    'Nice work! You are ready.'
  ];
  Match.prototype.updateTutorial = function (dt) {
    this.tutorialHint += dt;
    if (this.tutorialStep === 0 && Math.abs(this.players[0].x - 320) > 90) this.tutorialStep = 1;
    if (this.tutorialStep === 1 && !this.players[0].onGround) this.tutorialStep = 2;
    if (this.tutorialStep === 4 && this.tutorialHint > 2.3) this.finishTutorial();
  };
  Match.prototype.finishTutorial = function () {
    this.tutorialStep = -1; this.tutorial = false;
    HB.Save.data.tutorialDone = true; HB.Save.save(true);
    HB.toast('Tutorial complete! +250 coins', 'info');
    HB.Save.data.coins += 250; HB.Save.save(true);
  };
  Match.prototype.skipTutorial = function () { this.finishTutorial(); };

  /* ---------------- Control layout (V coordinates) ---------------- */
  Match.prototype.layoutControls = function () {
    var V = HB.V, w = V.w, h = V.h;
    var flip = HB.Save.data.settings.flipControls;

    /* One thumb cluster: LEFT / RIGHT on the ground row, JUMP / KICK above.
       `dir` mirrors the pair for the right-hand side of a shared screen. */
    function cluster(anchorX, dir, pad, topY, bottomY, gap) {
      var split = Math.round(gap * 0.55);
      var nearX = dir > 0 ? anchorX : anchorX - pad;
      var farX = dir > 0 ? anchorX + pad + split : anchorX - pad * 2 - split;
      var c = {
        left: { x: nearX, y: bottomY, w: pad, h: pad },
        right: { x: farX, y: bottomY, w: pad, h: pad }
      };
      /* JUMP stays bottom-right, KICK sits above the LEFT button:
         a diagonal pair, so the two thumbs never fight for one spot. */
      /* KICK sits high and inboard, so stretching a thumb towards it never
         brushes the direction pad underneath. */
      c.kick = { x: nearX, y: topY, w: pad, h: pad };
      c.jump = { x: farX, y: topY, w: pad, h: pad };
      if (flip) { var t = c.left; c.left = c.right; c.right = t; t = c.jump; c.jump = c.kick; c.kick = t; }
      return c;
    }

    if (!this.local) {
      var pad = U.clamp(w * 0.083, 74, 104);
      var gap = Math.round(pad * 0.16);
      var bottomY = h - pad - 20, topY = bottomY - pad - gap - 12;
      var c1 = cluster(24, 1, pad, topY, bottomY, gap);
      var pw = U.clamp(w * 0.05, 52, 64), pg = 10;
      var px = w / 2 - (pw * 3 + pg * 2) / 2, py = h - pw - 16;
      c1.powers = [
        { x: px, y: py, w: pw, h: pw },
        { x: px + pw + pg, y: py, w: pw, h: pw },
        { x: px + (pw + pg) * 2, y: py, w: pw, h: pw }
      ];
      c1.pause = { x: w - 74, y: 20, w: 56, h: 56 };
      out_init(c1);
      return [c1, null];
    }

    /* shared screen: two mirrored clusters, powers tucked in the middle */
    var padL = U.clamp((w / 2 - 120) / 2.2, 56, 80);
    var gapL = Math.round(padL * 0.14);
    var by = h - padL - 12, ty = by - padL - gapL - 10;
    var left = cluster(16, 1, padL, ty, by, gapL);
    var right = cluster(w - 16, -1, padL, ty, by, gapL);
    var pwL = 42, pyL = h - pwL - 10;
    var midL = w / 2 - pwL / 2;
    left.powers = [{ x: midL - pwL - 8, y: pyL, w: pwL, h: pwL }, { x: midL + pwL + 8, y: pyL, w: pwL, h: pwL }];
    right.powers = [];
    left.pause = { x: w - 70, y: 16, w: 52, h: 52 };
    out_init(left); out_init(right);
    return [left, right];
  };
  function out_init(c) { if (!c.powers) c.powers = []; }
  Match.prototype.inputFromPointers = function () {
    var layout = this.layoutControls(), Input = HB.Input, out = [{}, {}];
    for (var s = 0; s < 2; s++) {
      var cl = layout[s]; if (!cl) continue;
      var keys = ['left', 'right', 'jump', 'kick', 'lob', 'dash'];
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (!cl[k]) continue;
        out[s][k] = Input.pointersIn(cl[k]).length > 0;
      }
    }
    /* keyboard fallback - four-button scheme, E / X still lob on desktop */
    var K = Input.key, solo = !this.local;
    var map1 = solo ? { left: ['a', 'left'], right: ['d', 'right'], jump: ['w', 'up', 'space'], kick: ['s', 'down'], lob: ['e', 'x'], dash: ['q', 'shift'] } :
      { left: ['a'], right: ['d'], jump: ['w'], kick: ['s'], dash: ['q'] };
    var map2 = { left: ['left'], right: ['right'], jump: ['up'], kick: ['down'], dash: ['/'] };
    function apply(map, o) { for (var k in map) { var arr = map[k]; for (var j = 0; j < arr.length; j++) if (K(arr[j])) { o[k] = true; break; } } }
    apply(map1, out[0]);
    if (this.local) apply(map2, out[1]);
    if (K('1')) this._keyPower(0, 0); if (K('2')) this._keyPower(0, 1); if (K('3')) this._keyPower(0, 2);
    if (this.local) { if (K('7')) this._keyPower(1, 0); if (K('8')) this._keyPower(1, 1); if (K('9')) this._keyPower(1, 2); }
    return out;
  };
  Match.prototype._keyPower = function (s, slot) {
    if (!this._kp) this._kp = {};
    var key = s + ':' + slot;
    if (!this._kp[key]) { this._kp[key] = true; this.pressPower(s, slot); }
  };
  Match.prototype.releaseKeyPowers = function () {
    var K = HB.Input.key;
    if (!this._kp) return;
    for (var key in this._kp) {
      var parts = key.split(':'), s = +parts[0], slot = +parts[1];
      var code = s === 0 ? ['1', '2', '3'][slot] : ['7', '8', '9'][slot];
      if (!K(code)) delete this._kp[key];
    }
  };

  Match.prototype.render = function (g) {
    var V = HB.V, st = this.stadium, q = HB.Save.data.settings.quality;
    var bg = Art.buildBackground(st, V, q);
    Art.drawBackground(g, bg, HB.clock, st);
    g.save();
    var sx = this.shake ? U.rnd(-this.shake, this.shake) : 0, sy = this.shake ? U.rnd(-this.shake * 0.6, this.shake * 0.6) : 0;
    g.translate(V.worldX + sx, V.worldY + sy); g.scale(V.worldScale, V.worldScale);
    Art.pitch(g, this);
    /* goal side 0 is on the LEFT and is defended by player 0 */
    Art.goal(g, 0, W.goalW * (this.goalBoost(0) > 1 ? 1.25 : 1), W.goalH * this.goalBoost(0), C.red, HB.clock,
      { glow: this.shielded(0) ? C.cyan : null, hit: this.netHit && this.netHit.side === 0 ? this.netHit : null, ripples: this.ripples });
    Art.goal(g, 1, W.goalW * (this.goalBoost(1) > 1 ? 1.25 : 1), W.goalH * this.goalBoost(1), C.blue, HB.clock,
      { glow: this.shielded(1) ? C.cyan : null, hit: this.netHit && this.netHit.side === 1 ? this.netHit : null, ripples: this.ripples });
    /* shadows */
    for (var i = 0; i < 2; i++) {
      var p = this.players[i], a = U.clamp(1 - (W.ground - p.y) / 380, 0.15, 1);
      Art.shadow(g, p.x, W.ground + 8, 44 * p.scale * a, 11 * a, 0.32 * a);
    }
    Art.shadow(g, this.ball.x, W.ground + 6, this.ball.r * 1.5 * U.clamp(1 - (W.ground - this.ball.y) / 500, 0.2, 1), 6, 0.22);
    /* ball trail */
    if (q !== 0) {
      for (var ti = 0; ti < this.trail.length; ti++) {
        var tr = this.trail[ti], f = (ti + 1) / this.trail.length;
        g.globalAlpha = f * 0.24 * (this.ball.glow ? 1 : 0.55);
        Art.circle(g, tr.x, tr.y, tr.r * f * 0.9, this.ball.glow || '#ffffff');
      }
      g.globalAlpha = 1;
    }
    /* players behind / in front of ball */
    for (i = 0; i < 2; i++) this.drawPlayer(g, this.players[i]);
    /* A scored ball sits behind the front post, so it is drawn slightly
       darkened and clipped by the goal mouth for a real depth cue. */
    var inNet = this.state === 'goal' && this.netHit;
    if (inNet) {
      g.save();
      var nside = this.netHit.side, nx0 = nside === 0 ? 0 : W.w - W.goalW;
      Art.rr(g, nx0, W.ground - W.goalH, W.goalW, W.goalH, 4); g.clip();
      g.globalAlpha = 0.92;
      Art.ball(g, this.ball, HB.clock);
      g.restore();
    } else {
      Art.ball(g, this.ball, HB.clock);
    }
    /* particles */
    for (i = 0; i < this.particles.length; i++) {
      var pt = this.particles[i], al = U.clamp(pt.life / pt.max, 0, 1);
      g.save(); g.globalAlpha = al; g.translate(pt.x, pt.y); g.rotate(pt.rot);
      if (pt.type === 1) { g.fillStyle = pt.color; g.fillRect(-pt.size / 2, -pt.size / 4, pt.size, pt.size * 0.55); }
      else Art.circle(g, 0, 0, pt.size * al, pt.color);
      g.restore();
    }
    /* power auras */
    for (i = 0; i < 2; i++) {
      var pp = this.players[i];
      if (pp.flags.turbo || pp.flags.magnet) {
        g.globalAlpha = 0.25 + Math.sin(HB.clock * 8 + i) * 0.1;
        g.strokeStyle = pp.flags.turbo ? C.cyan : C.pink; g.lineWidth = 5;
        g.beginPath(); g.ellipse(pp.x, pp.y - 64 * pp.scale, 62 * pp.scale, 112 * pp.scale, 0, 0, Math.PI * 2); g.stroke();
        g.globalAlpha = 1;
      }
    }
    g.restore();
    Art.drawWeather(g, st, HB.clock, V);
    if (this.flash > 0.01) { g.globalAlpha = this.flash * 0.45; g.fillStyle = '#ffffff'; g.fillRect(0, 0, V.w, V.h); g.globalAlpha = 1; }
    this.renderHUD(g);
    this.renderControls(g);
    this.renderOverlays(g);
  };
  Match.prototype.drawPlayer = function (g, p) {
    var b = this.ball, lx = U.clamp((b.x - p.x) / 240, -1, 1), ly = U.clamp((b.y - (p.y - 110)) / 240, -1, 1);
    var gear = HB.Save.data.gear;
    Art.character(g, p.char, {
      x: p.x, y: p.y, scale: p.scale, facing: p.facing, t: HB.clock, pose: p.pose,
      run: p.runPhase, look: { x: lx, y: ly }, kit: p.kit,
      gear: p.side === 0 ? gear : { hat: -1, glasses: -1, jersey: -1, boots: -1 },
      sizeStat: p.stats.size, frozen: p.flags.frozen, ghost: p.flags.ghost,
      shielded: p.flags.shielded, happy: this.state === 'goal' && this.goalSide === p.side,
      sad: this.state === 'goal' && this.goalSide !== p.side,
      alpha: p.flags.frozen ? 0.85 : 1
    });
    /* shot charge arc */
    if (p.charging) {
      var cr = 58 * p.scale, cx = p.x, cy = p.y - 110 * p.scale;
      g.save(); g.lineWidth = 7; g.lineCap = 'round';
      g.strokeStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.arc(cx, cy, cr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2); g.stroke();
      g.strokeStyle = p.shotCharge > 0.8 ? C.gold : C.cyan;
      g.beginPath(); g.arc(cx, cy, cr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p.shotCharge); g.stroke();
      g.restore();
    }
    /* name tag in local mode */
    if (this.local) {
      Art.text(g, p.side === 0 ? 'P1' : 'P2', p.x, p.y - 205 * p.scale, 18, p.side === 0 ? C.red : C.blue, 'center', '900', { outline: C.ink, outlineW: 4 });
    }
  };
  Match.prototype.renderHUD = function (g) {
    var V = HB.V, w = V.w, cx = w / 2;
    /* scoreboard */
    Art.panel(g, cx - 190, 14, 380, 78, 18, { fill: 'rgba(9,20,42,0.82)', stroke: U.alpha(C.gold, 0.5), gradient: true, fill2: 'rgba(12,26,54,0.9)', shadowBlur: 18 });
    Art.crest(g, 'P1', cx - 152, 53, 42, C.red);
    Art.crest(g, this.local ? 'P2' : 'CPU', cx + 152, 53, 42, C.blue);
    Art.text(g, this.score[0] + ' : ' + this.score[1], cx, 42, 38, C.paper, 'center', '900', { outline: 'rgba(0,0,0,0.35)', outlineW: 4 });
    var timeStr = this.goldenActive ? 'GOLDEN' : U.fmtTime(this.time);
    Art.text(g, timeStr, cx, 76, 18, this.time < 15 && !this.goldenActive ? C.red : C.gold, 'center', '800', { glow: this.time < 15 ? C.red : null, glowSize: 8 });
    /* energy bars */
    for (var s = 0; s < 2; s++) {
      if (s === 1 && !this.local) continue;
      var p = this.players[s], bw = 190, bx = s === 0 ? 26 : w - 26 - bw, by = 128;
      Art.fillRR(g, bx - 10, by - 25, bw + 20, 50, 12, 'rgba(7,17,36,0.62)');
      Art.text(g, (s === 0 ? 'P1' : 'P2') + ' POWER', bx + bw / 2, by - 12, 14, U.alpha(C.paper, 0.85), 'center', '800', { shadow: false });
      Art.fillRR(g, bx, by, bw, 15, 7, 'rgba(6,16,34,0.8)');
      var eg = g.createLinearGradient(bx, 0, bx + bw, 0);
      eg.addColorStop(0, C.cyan); eg.addColorStop(1, C.gold);
      Art.fillRR(g, bx + 2, by + 2, (bw - 4) * p.energy / 100, 11, 5, eg);
      if (p.energy >= 40) { g.globalAlpha = 0.35 + Math.sin(HB.clock * 6) * 0.2; Art.fillRR(g, bx, by, bw, 15, 7, C.gold); g.globalAlpha = 1; }
      Art.text(g, Math.floor(p.energy) + '%', bx + bw / 2, by + 7.5, 11, C.ink, 'center', '900', { shadow: false });
    }
    /* active effects */
    var ey = 164;
    for (var i = 0; i < this.effects.length; i++) {
      var e = this.effects[i], def = Data.power(e.id), rem = Math.max(0, e.until - this.t);
      if (rem <= 0) continue;
      var ex = e.side === 0 ? 26 : w - 26 - 158;
      Art.fillRR(g, ex, ey, 158, 26, 8, U.alpha(def.color, 0.22));
      Art.icon(g, def.icon, ex + 17, ey + 13, 17, def.color);
      Art.text(g, def.name + ' ' + rem.toFixed(1) + 's', ex + 88, ey + 13, 12, C.paper, 'center', '800', { shadow: false });
      ey += 30;
      if (ey > 300) break;
    }
    /* combo */
    for (s = 0; s < 2; s++) {
      var p2 = this.players[s];
      if (p2.combo >= 3 && (!this.local || s === 0)) {
        Art.text(g, 'x' + p2.combo + ' COMBO', s === 0 ? 30 : w - 30, 340, 20, C.gold, s === 0 ? 'left' : 'right', '900', { glow: C.gold });
      }
    }
    /* match info */
    Art.text(g, this.mode === 'league' ? Data.leagues[HB.Save.data.league].name + ' LEAGUE' : this.mode.toUpperCase(), cx, 108, 13, U.alpha(C.paper, 0.65), 'center', '800', { shadow: false });
  };
  Match.prototype.renderControls = function (g) {
    if (this.paused || this.finished) return;
    var V = HB.V, shade = g.createLinearGradient(0, 386, 0, 720);
    shade.addColorStop(0, 'rgba(4,12,28,0)'); shade.addColorStop(0.45, 'rgba(4,12,28,0.34)'); shade.addColorStop(1, 'rgba(4,12,28,0.62)');
    g.fillStyle = shade; g.fillRect(0, 386, V.w, 334);
    var layout = this.layoutControls(), Input = HB.Input;
    function down(r) { return Input.pointersIn(r).length > 0; }
    for (var s = 0; s < 2; s++) {
      var cl = layout[s]; if (!cl) continue;
      var col = s === 0 ? C.red : C.blue;
      var p = this.players[s];
      /* LEFT / RIGHT are ground rockets: wide, low, high contrast */
      this.dirButton(g, cl.left, 'left', col, down(cl.left), p);
      this.dirButton(g, cl.right, 'right', col, down(cl.right), p);
      /* KICK charges - show the charge ring on the button itself */
      this.controlButton(g, cl.jump, 'JUMP', 'jump', C.teal, down(cl.jump));
      this.controlButton(g, cl.kick, p.charging === 'kick' ? 'SHOOT!' : 'KICK', 'kick', C.gold, down(cl.kick), p.charging === 'kick' ? p.shotCharge : 0);
      for (var i = 0; i < 3; i++) {
        var r = cl.powers[i]; if (!r) continue;
        var def = Data.power(p.powers[i]);
        var ready = p.energy >= def.cost && Meta.powerUnlocked(def.id);
        var costRatio = U.clamp(p.energy / def.cost, 0, 1);
        Art.panel(g, r.x, r.y, r.w, r.h, 16, { fill: ready ? U.alpha(def.color, 0.32) : 'rgba(8,18,38,0.7)', stroke: ready ? U.alpha(def.color, 0.95) : 'rgba(255,255,255,0.16)', gradient: true, fill2: 'rgba(8,18,38,0.85)', gloss: ready });
        if (!ready) {
          g.save(); Art.rr(g, r.x + 2, r.y + 2, r.w - 4, r.h - 4, 14); g.clip();
          g.fillStyle = U.alpha(def.color, 0.22); g.fillRect(r.x, r.y + r.h * (1 - costRatio), r.w, r.h * costRatio); g.restore();
        }
        Art.icon(g, def.icon, r.x + r.w / 2, r.y + r.h / 2, r.w * 0.5, ready ? def.color : U.alpha('#ffffff', 0.42));
        if (!Meta.powerUnlocked(def.id)) Art.icon(g, 'lock', r.x + r.w - 11, r.y + 11, 15, C.mist);
      }
    }
    if (layout[0].pause) {
      var pr = layout[0].pause;
      Art.panel(g, pr.x, pr.y, pr.w, pr.h, 14, { fill: 'rgba(9,20,42,0.7)', stroke: 'rgba(255,255,255,0.26)' });
      Art.icon(g, 'pause', pr.x + pr.w / 2, pr.y + pr.h / 2, 24, C.paper);
    }
  };
  /* Round action button. `charge` (0..1) draws a filling ring while KICK is held. */
  Match.prototype.controlButton = function (g, r, label, icon, color, pressed, charge) {
    if (!r) return;
    var a = pressed ? 1 : 0.92;
    var yy = pressed ? r.y + 3 : r.y;
    g.save(); g.globalAlpha = a;
    /* soft coloured halo so the button reads at a glance while your thumb is on it */
    var halo = g.createRadialGradient(r.x + r.w / 2, yy + r.h / 2, r.w * 0.18, r.x + r.w / 2, yy + r.h / 2, r.w * 0.85);
    halo.addColorStop(0, U.alpha(color, pressed ? 0.5 : 0.26)); halo.addColorStop(1, U.alpha(color, 0));
    g.fillStyle = halo; g.fillRect(r.x - r.w * 0.3, yy - r.h * 0.3, r.w * 1.6, r.h * 1.6);
    Art.circle(g, r.x + r.w / 2, yy + r.h / 2, r.w * 0.47, U.alpha(color, pressed ? 0.95 : 0.4));
    g.lineWidth = 3; g.strokeStyle = U.alpha('#ffffff', 0.55);
    g.beginPath(); g.arc(r.x + r.w / 2, yy + r.h / 2, r.w * 0.47, 0, Math.PI * 2); g.stroke();
    g.save();
    g.beginPath(); g.arc(r.x + r.w / 2, yy + r.h / 2, r.w * 0.4, 0, Math.PI * 2);
    var sh = g.createLinearGradient(0, yy, 0, yy + r.h);
    sh.addColorStop(0, 'rgba(255,255,255,0.26)'); sh.addColorStop(0.55, 'rgba(255,255,255,0.02)'); sh.addColorStop(1, 'rgba(0,0,0,0.22)');
    g.fillStyle = sh; g.fill();
    g.restore();
    Art.icon(g, icon, r.x + r.w / 2, yy + r.h / 2 - (label ? 7 : 0), r.w * 0.5, '#ffffff');
    if (label) Art.text(g, label, r.x + r.w / 2, yy + r.h - 16, Math.max(10, r.w * 0.13), U.alpha('#ffffff', 0.95), 'center', '900', { shadow: false });
    if (charge) {
      g.lineWidth = 6; g.lineCap = 'round';
      g.strokeStyle = 'rgba(255,255,255,0.22)';
      g.beginPath(); g.arc(r.x + r.w / 2, yy + r.h / 2, r.w * 0.53, -Math.PI / 2, Math.PI * 1.5); g.stroke();
      g.strokeStyle = charge > 0.42 ? C.gold : C.cyan;
      g.beginPath(); g.arc(r.x + r.w / 2, yy + r.h / 2, r.w * 0.53, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * charge); g.stroke();
    }
    g.restore();
  };
  /* Big translucent direction pad with a bold chevron. */
  Match.prototype.dirButton = function (g, r, dir, col, pressed, p) {
    if (!r) return;
    var cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    g.save();
    g.globalAlpha = pressed ? 0.96 : 0.78;
    var gr = g.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
    gr.addColorStop(0, U.alpha('#ffffff', pressed ? 0.3 : 0.16)); gr.addColorStop(1, U.alpha(col, pressed ? 0.5 : 0.24));
    Art.rr(g, r.x, r.y, r.w, r.h, Math.min(r.h * 0.34, 26)); g.fillStyle = gr; g.fill();
    g.lineWidth = 2.5; g.strokeStyle = U.alpha('#ffffff', pressed ? 0.75 : 0.34); g.stroke();
    g.globalAlpha = 1;
    var s = dir === 'left' ? -1 : 1, w2 = r.w * 0.2, h2 = r.h * 0.19;
    g.beginPath();
    g.moveTo(cx + s * w2, cy - h2); g.lineTo(cx - s * w2 * 0.5, cy); g.lineTo(cx + s * w2, cy + h2);
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.lineWidth = Math.max(5, r.w * 0.075); g.strokeStyle = U.alpha('#ffffff', pressed ? 1 : 0.85); g.stroke();
    g.restore();
  };
  Match.prototype.renderOverlays = function (g) {
    var V = HB.V, w = V.w, h = V.h, cx = w / 2;
    if (this.state === 'kickoff') {
      var n = Math.ceil(this.countdown - 0.2);
      if (n > 0 && n <= 3) {
        var f = 1 - (this.countdown - 0.2 - Math.floor(this.countdown - 0.2));
        g.save(); g.globalAlpha = 0.35; g.fillStyle = C.ink; g.fillRect(0, 0, w, h); g.restore();
        Art.text(g, String(n), cx, h * 0.42, 150 + U.easeOut(1 - f) * 40, C.gold, 'center', '900', { outline: C.ink, outlineW: 12, glow: C.gold, glowSize: 30 });
        Art.text(g, 'GET READY', cx, h * 0.58, 26, C.paper, 'center', '900');
      }
    }
    if (this.state === 'goal') {
      var t = 2.35 - this.goalTimer, sc = U.easeBack(U.clamp(t * 2.2, 0, 1));
      g.save(); g.translate(cx, h * 0.36); g.scale(sc, sc);
      Art.text(g, 'GOAL!', 0, 0, 92, C.gold, 'center', '900', { outline: C.ink, outlineW: 12, glow: C.orange, glowSize: 26 });
      g.restore();
      Art.text(g, this.goalSide === 0 ? (this.local ? 'PLAYER 1' : HB.Save.data.name) + ' SCORES!' : (this.local ? 'PLAYER 2' : this.players[1].char.name) + ' SCORES!', cx, h * 0.5, 24, C.paper, 'center', '900');
    }
    /* reaction callouts: SAVE! / WHAT A SAVE! with a punch-in scale */
    if (this.calls) {
      for (var ci = this.calls.length - 1; ci >= 0; ci--) {
        var call = this.calls[ci], ca = this.t - call.t;
        if (ca > call.life) { this.calls.splice(ci, 1); continue; }
        var cf = U.clamp(ca / 0.22, 0, 1);
        var out = ca > call.life - 0.3 ? (call.life - ca) / 0.3 : 1;
        var sc2 = call.big ? (1 + U.easeOut(cf) * 0.12) * (0.6 + U.easeBack(cf) * 0.4) : (0.7 + U.easeBack(cf) * 0.3);
        var cxx = call.side === 0 ? w * 0.28 : w * 0.72;
        g.save(); g.globalAlpha = out; g.translate(cxx, h * 0.3 - (call.big ? 0 : 40) + (1 - cf) * 18);
        g.scale(sc2, sc2);
        Art.text(g, call.text, 0, 0, call.big ? 54 : 34, call.color, 'center', '900',
          { outline: C.ink, outlineW: call.big ? 10 : 7, glow: call.color, glowSize: call.big ? 24 : 12 });
        g.restore();
      }
      g.globalAlpha = 1;
    }
    if (this.message && this.t < this.messageUntil) {
      var a = U.clamp((this.messageUntil - this.t) / 0.5, 0, 1);
      Art.text(g, this.message, cx, h * 0.3, 40, U.alpha(C.gold, a), 'center', '900', { outline: C.ink, outlineW: 8 });
    }
    if (this.tutorialStep >= 0) {
      var ty = 150;
      Art.panel(g, cx - 290, ty, 580, 74, 18, { fill: 'rgba(9,20,42,0.9)', stroke: U.alpha(C.gold, 0.7), gradient: true, fill2: 'rgba(14,30,60,0.94)' });
      Art.icon(g, 'info', cx - 258, ty + 37, 28, C.gold);
      Art.text(g, TUT[Math.min(this.tutorialStep, TUT.length - 1)], cx + 10, ty + 30, 19, C.paper, 'center', '800', { maxWidth: 500 });
      Art.text(g, 'TUTORIAL  ' + (this.tutorialStep + 1) + '/5', cx + 10, ty + 56, 12, U.alpha(C.gold, 0.9), 'center', '800', { shadow: false });
    }
    if (HB.Save.data.settings.showFps) {
      Art.text(g, Math.round(HB.App.fps) + ' FPS', 12, 16, 14, C.gold, 'left', '800', { shadow: false });
    }
  };
})(window.HB = window.HB || {});
