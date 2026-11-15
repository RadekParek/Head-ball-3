/* Head Ball 3 - all game screens: home, modes, league, cup, locker,
 * shop, progression, settings, match, pause and results. */
(function (HB) {
  'use strict';
  var U = HB.U, C = HB.C, Art = HB.Art, UI = HB.UI, Data = HB.Data, Meta = HB.Meta, Save = HB.Save, Audio = HB.Audio;
  var S = UI.screens;
  UI.diff = Save.data.settings.difficulty;

  function V() { return HB.V; }
  function bust(g, c, x, y, size, opts) {
    opts = opts || {};
    g.save();
    Art.circle(g, x, y, size * 0.52, U.alpha(opts.color || c.kit, 0.22));
    g.save(); g.beginPath(); g.arc(x, y, size * 0.5, 0, Math.PI * 2); g.clip();
    var gr = g.createLinearGradient(x, y - size * 0.5, x, y + size * 0.5);
    gr.addColorStop(0, U.alpha(opts.color || c.kit, 0.32)); gr.addColorStop(1, 'rgba(6,14,30,0.5)');
    g.fillStyle = gr; g.fillRect(x - size * 0.5, y - size * 0.5, size, size);
    Art.character(g, c, {
      x: x, y: y + size * 0.43, scale: size / 190, facing: 1, t: HB.clock, pose: opts.pose || 'idle',
      run: HB.clock * 3, look: { x: Math.sin(HB.clock * 0.8) * 0.4, y: 0 },
      gear: opts.gear || Save.data.gear, sizeStat: opts.sizeStat || c.size,
      kit: opts.kit || c.kit, happy: opts.happy
    });
    g.restore();
    g.strokeStyle = U.alpha(opts.color || C.gold, 0.7); g.lineWidth = 3;
    g.beginPath(); g.arc(x, y, size * 0.5, 0, Math.PI * 2); g.stroke();
    g.restore();
  }
  function statBar(g, x, y, w, label, value, color) {
    Art.text(g, label, x, y + 9, 13, U.alpha(C.paper, 0.82), 'left', '800', { shadow: false });
    Art.fillRR(g, x + 74, y + 2, w - 110, 13, 6, 'rgba(255,255,255,0.12)');
    Art.fillRR(g, x + 74, y + 2, (w - 110) * U.clamp(value / 130, 0, 1), 13, 6, color);
    Art.text(g, Math.round(value), x + w - 12, y + 9, 13, C.paper, 'right', '900', { shadow: false });
  }
  function rewardLine(g, x, y, rewards) {
    var items = [
      { icon: 'coin', label: '+' + rewards.coins, color: C.gold },
      { icon: 'users', label: '+' + rewards.fans, color: C.teal },
      { icon: 'star', label: '+' + rewards.xp + ' XP', color: C.cyan }
    ];
    if (rewards.gems) items.push({ icon: 'gem', label: '+' + rewards.gems, color: C.pink });
    for (var i = 0; i < items.length; i++) {
      var it = items[i], xx = x + i * 138;
      Art.icon(g, it.icon, xx + 14, y, 20, it.color);
      Art.text(g, it.label, xx + 30, y, 16, it.color, 'left', '900', { shadow: false });
    }
  }
  function lockedOverlay(g, r, text) {
    g.save(); Art.rr(g, r.x, r.y, r.w, r.h, 14); g.clip();
    g.fillStyle = 'rgba(4,10,22,0.62)'; g.fillRect(r.x, r.y, r.w, r.h);
    Art.icon(g, 'lock', r.x + r.w / 2, r.y + r.h / 2 - 4, 26, C.mist);
    if (text) Art.text(g, text, r.x + r.w / 2, r.y + r.h / 2 + 24, 11, C.mist, 'center', '900', { shadow: false });
    g.restore();
  }

  /* ---------------- Splash ---------------- */
  S.splash = {
    enter: function () { this.t = 0; Audio.music('menu'); },
    update: function (dt) { this.t += dt; if (this.t > 3.1) UI.go('home'); },
    draw: function (g) {
      UI.menuBackground(g);
      var w = HB.V.w, h = HB.V.h, cx = w / 2, t = this.t;
      var sc = U.easeBack(U.clamp(t / 0.7, 0, 1));
      g.save(); g.translate(cx, h * 0.38); g.scale(sc, sc);
      Art.text(g, 'HEAD BALL', 0, -34, 74, C.gold, 'center', '900', { outline: C.ink, outlineW: 14, glow: C.orange, glowSize: 26 });
      Art.text(g, '3', 0, 44, 88, C.paper, 'center', '900', { outline: C.ink, outlineW: 14 });
      g.restore();
      Art.text(g, 'ARCADE FOOTBALL • 1v1 • LOCAL MULTIPLAYER', cx, h * 0.56, 17, C.cyan, 'center', '900');
      bust(g, Data.character(Save.data.character), cx, h * 0.78, 170, { color: C.red });
      var a = 0.5 + Math.sin(t * 3) * 0.35;
      Art.text(g, 'TAP TO START', cx, h * 0.9, 20, U.alpha(C.paper, a), 'center', '900');
      Art.text(g, 'v' + HB.VERSION + '  •  built for Android', cx, h - 24, 12, U.alpha(C.mist, 0.6), 'center', '800', { shadow: false });
      UI.region('splash.tap', { x: 0, y: 0, w: w, h: h }, function () { UI.go('home'); }, 'button');
    }
  };

  /* ---------------- Home ---------------- */
  S.home = {
    enter: function () {
      Meta.refreshDaily();
      Audio.music('menu'); Audio.setCrowd(0.12);
    },
    draw: function (g) {
      UI.menuBackground(g);
      var w = HB.V.w, h = HB.V.h, cx = w / 2;
      UI.profileBar(g);
      Art.text(g, 'HEAD BALL 3', cx, 116, 30, C.gold, 'center', '900', { outline: 'rgba(0,0,0,0.3)', outlineW: 6 });
      var panelW = Math.min(w - 100, 1080), px = (w - panelW) / 2;
      Art.panel(g, px, 146, panelW, h - 246, 24, { fill: 'rgba(9,22,46,0.72)', stroke: 'rgba(255,255,255,0.12)', gradient: true, fill2: 'rgba(8,18,38,0.8)' });
      var leftW = panelW * 0.42;
      /* hero */
      var c = Data.character(Save.data.character);
      Art.panel(g, px + 24, 172, leftW - 40, h - 300, 20, { fill: U.alpha(c.kit, 0.12), stroke: U.alpha(c.kit, 0.4) });
      bust(g, c, px + leftW / 2 - 8, 340, 180, { color: c.kit });
      Art.text(g, c.name, px + leftW / 2 - 8, 462, 22, C.paper, 'center', '900');
      Art.text(g, Data.rarity(c).name.toUpperCase() + '  •  LV ' + Meta.charLevel(c.id), px + leftW / 2 - 8, 486, 13, Data.rarity(c).color, 'center', '900');
      var st = Meta.charStats(c.id), bw = leftW - 90;
      statBar(g, px + 45, 498, bw, 'SPEED', st.speed, C.cyan);
      statBar(g, px + 45, 522, bw, 'JUMP', st.jump, C.teal);
      statBar(g, px + 45, 546, bw, 'SHOT', st.shot, C.gold);
      statBar(g, px + 45, 570, bw, 'SIZE', st.size, C.purple);
      /* right side */
      var rx = px + leftW + 4, rw = panelW - leftW - 36;
      UI.button('home.play', { x: rx, y: 176, w: rw, h: 92 }, 'PLAY NOW', {
        primary: true, color: C.gold, icon: 'play', iconSize: 42, fontSize: 24,
        onClick: function () { UI.go('modes'); }
      });
      var tiles = [
        { id: 'quick', icon: 'ball', label: 'QUICK MATCH', sub: '90s vs a rival', color: C.blue },
        { id: 'league', icon: 'trophy', label: 'LEAGUE', sub: 'Climb 5 divisions', color: C.gold },
        { id: 'local', icon: 'users', label: '1v1 ON ONE PHONE', sub: 'Two players, one screen', color: C.teal },
        { id: 'penalty', icon: 'target', label: 'PENALTY DUEL', sub: 'Nerve and precision', color: C.purple },
        { id: 'tournament', icon: 'cup', label: 'TOURNAMENT', sub: '8-team knockout cup', color: C.orange },
        { id: 'practice', icon: 'jersey', label: 'PRACTICE', sub: 'No pressure, no rewards', color: C.cyan }
      ];
      var cols = 2, tw = (rw - 16) / cols, th = 82;
      for (var i = 0; i < tiles.length; i++) {
        var t = tiles[i], tx = rx + (i % cols) * (tw + 16), ty = 276 + Math.floor(i / cols) * (th + 8);
        var r = { x: tx, y: ty, w: tw, h: th };
        Art.fillRR(g, r.x, r.y, r.w, r.h, 16, U.alpha(t.color, UI.isPressed('home.tile.' + t.id) ? 0.38 : 0.16));
        Art.icon(g, t.icon, r.x + 40, r.y + r.h / 2, 38, t.color);
        Art.text(g, t.label, r.x + 74, r.y + 30, 15, C.paper, 'left', '900');
        Art.text(g, t.sub, r.x + 74, r.y + 54, 12, U.alpha(C.mist, 0.8), 'left', '800', { shadow: false });
        UI.region('home.tile.' + t.id, r, (function (id) { return function () { startMode(id); }; })(t.id), 'button');
      }
      /* daily gift */
      var dr = { x: rx, y: 276 + 3 * (th + 8) + 6, w: rw, h: 56 };
      var claimed = Save.data.daily.claimed === Meta.today();
      Art.fillRR(g, dr.x, dr.y, dr.w, dr.h, 14, U.alpha(C.pink, claimed ? 0.08 : 0.2));
      Art.icon(g, 'gift', dr.x + 34, dr.y + 28, 30, claimed ? C.mist : C.pink);
      Art.text(g, claimed ? 'DAILY REWARD CLAIMED' : 'DAILY REWARD  •  DAY ' + Save.data.daily.streak, dr.x + 60, dr.y + 28, 15, claimed ? C.mist : C.paper, 'left', '900');
      if (!claimed) UI.region('home.daily', dr, function () {
        var r = Meta.claimDaily(); Save.data.daily.claimed = Meta.today(); Save.save(true);
        Audio.play('coin'); UI.reveal('DAILY REWARD', [{ name: 'Coins', amount: r.coins, color: C.gold }, { name: 'Gems', amount: r.gems || 1, color: C.pink }]);
      }, 'button');
      UI.nav(g);
    }
  };

  /* ---------------- Mode selection / match launcher ---------------- */
  function startMode(mode) {
    var s = Save.data, ai = UI.diff;
    var cfg = { mode: mode, ai: ai, stadium: Meta.stadium(), length: s.settings.matchLength, golden: s.settings.goldenGoal };
    if (mode === 'quick') { cfg.opponent = U.pick(Data.characters.filter(function (c) { return c.id !== s.character; })); cfg.tutorial = !s.tutorialDone; }
    else if (mode === 'practice') { cfg.opponent = U.pick(Data.characters); cfg.ai = 0; cfg.rewards = false; cfg.length = 120; }
    else if (mode === 'league') { var lg = Data.leagues[s.league]; cfg.ai = U.clamp(lg.ai + Math.floor(s.bracket / 5), 0, 4); cfg.opponent = Meta.leagueOpponent(); }
    else if (mode === 'local') { cfg.local = true; var pool = s.unlockedChars; cfg.opponent = Data.character(pool.length > 1 ? U.pick(pool.filter(function (i) { return i !== s.character; })) : s.character); }
    else if (mode === 'penalty') { HB.App.startPenalty(cfg); return; }
    else if (mode === 'tournament') {
      var t = s.tournament;
      if (!t || t.finished) { t = Meta.tournamentStart(); UI.go('tournament'); return; }
      var opp = Meta.tournamentNextOpponent();
      if (!opp) { UI.go('tournament'); return; }
      cfg.opponent = Data.character(opp.char); cfg.ai = U.clamp(2 + t.round, 0, 4);
      cfg.round = t.round; cfg.golden = true;
    }
    HB.App.startMatch(cfg);
  }
  UI.startMode = startMode;

  S.modes = {
    enter: function () { Audio.music('menu'); },
    draw: function (g) {
      UI.menuBackground(g); UI.profileBar(g); UI.header(g, 'CHOOSE YOUR MODE', 'Every match is 1v1. Win to earn coins, fans and XP.');
      var w = HB.V.w, h = HB.V.h, cx = w / 2;
      var modes = [
        { id: 'quick', icon: 'ball', name: 'QUICK MATCH', desc: 'Face a rival in a classic 90-second duel.', color: C.blue },
        { id: 'league', icon: 'trophy', name: 'LEAGUE', desc: 'Win points, climb 15 brackets across 5 leagues.', color: C.gold },
        { id: 'tournament', icon: 'cup', name: 'TOURNAMENT', desc: 'Knock out 7 rivals and lift the cup.', color: C.orange },
        { id: 'local', icon: 'users', name: 'LOCAL 1v1', desc: 'Two players, one phone, landscape split controls.', color: C.teal },
        { id: 'penalty', icon: 'target', name: 'PENALTY DUEL', desc: 'Five kicks each. Aim, power and dive!', color: C.purple },
        { id: 'practice', icon: 'jersey', name: 'PRACTICE', desc: 'Learn the physics with no stakes.', color: C.cyan }
      ];
      var pw = Math.min(w - 100, 1120), px = (w - pw) / 2;
      var cw = (pw - 32) / 3, ch = 150, gap = 14;
      for (var i = 0; i < modes.length; i++) {
        var m = modes[i], x = px + (i % 3) * (cw + gap), y = 196 + Math.floor(i / 3) * (ch + gap);
        Art.panel(g, x, y, cw, ch, 20, { fill: U.alpha(m.color, 0.12), stroke: U.alpha(m.color, 0.5), gradient: true, fill2: 'rgba(8,18,38,0.85)' });
        Art.icon(g, m.icon, x + 48, y + 46, 40, m.color);
        Art.text(g, m.name, x + 84, y + 40, 19, C.paper, 'left', '900');
        Art.text(g, m.desc, x + 20, y + 82, 13, U.alpha(C.mist, 0.9), 'left', '800', { maxWidth: cw - 170 });
        UI.button('modes.play.' + m.id, { x: x + cw - 132, y: y + ch - 50, w: 116, h: 40 }, 'PLAY', {
          primary: true, color: m.color, fontSize: 15, onClick: (function (id) { return function () { startMode(id); }; })(m.id)
        });
      }
      /* difficulty */
      var dy = 196 + 2 * (ch + gap) + 8;
      Art.text(g, 'OPPONENT DIFFICULTY', px + 10, dy + 16, 15, C.gold, 'left', '900');
      var dw = Math.min(160, (pw - 20) / 5);
      for (var d = 0; d < 5; d++) {
        var r = { x: px + d * (dw + 8), y: dy + 32, w: dw, h: 44 }, def = Data.DIFFICULTIES[d];
        Art.fillRR(g, r.x, r.y, r.w, r.h, 12, UI.diff === d ? U.alpha(def.color, 0.85) : 'rgba(255,255,255,0.07)');
        Art.text(g, def.name.toUpperCase(), r.x + r.w / 2, r.y + r.h / 2, 13, UI.diff === d ? C.ink : C.paper, 'center', '900', { shadow: false });
        UI.region('modes.diff.' + d, r, (function (v) { return function () { UI.diff = v; Save.data.settings.difficulty = v; Save.save(true); Audio.play('toggle'); }; })(d), 'button');
      }
      UI.nav(g);
    }
  };

  /* ---------------- League ---------------- */
  S.league = {
    draw: function (g) {
      UI.menuBackground(g); UI.profileBar(g); UI.header(g, 'CAREER LEAGUE', 'Win 12 points to clear a bracket. Three brackets promote you to the next league.');
      var w = HB.V.w, h = HB.V.h, pw = Math.min(w - 120, 940), px = (w - pw) / 2, s = Save.data;
      var lg = Data.leagues[s.league];
      Art.panel(g, px, 190, pw, 300, 22, { fill: 'rgba(9,22,46,0.85)', stroke: U.alpha(lg.color, 0.6), gradient: true, fill2: 'rgba(8,18,38,0.9)' });
      Art.icon(g, 'trophy', px + 76, 262, 66, lg.color);
      Art.text(g, lg.name.toUpperCase() + ' LEAGUE', px + 130, 240, 32, lg.color, 'left', '900');
      Art.text(g, 'BRACKET ' + (s.bracket + 1) + ' / 15', px + 130, 278, 18, C.paper, 'left', '900');
      Art.text(g, 'Opponent skill: ' + Data.DIFFICULTIES[U.clamp(lg.ai + Math.floor(s.bracket / 5), 0, 4)].name, px + 130, 306, 14, C.mist, 'left', '800', { shadow: false });
      var prog = U.clamp(s.leaguePoints / 12, 0, 1);
      Art.fillRR(g, px + 40, 352, pw - 80, 26, 13, 'rgba(255,255,255,0.12)');
      Art.fillRR(g, px + 40, 352, (pw - 80) * prog, 26, 13, lg.color);
      Art.text(g, s.leaguePoints + ' / 12 POINTS', px + pw / 2, 365, 15, C.ink, 'center', '900', { shadow: false });
      Art.text(g, 'Wins: ' + s.stats.wins + '   •   Streak: ' + s.stats.streak + '   •   Fans: ' + U.fmtNum(s.fans), px + pw / 2, 410, 16, C.paper, 'center', '800');
      var rungs = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
      for (var i = 0; i < 5; i++) {
        var x = px + 60 + i * (pw - 120) / 4;
        Art.circle(g, x, 460, i <= s.league ? 15 : 10, i <= s.league ? Data.leagues[i].color : 'rgba(255,255,255,0.2)');
        Art.text(g, rungs[i], x, 484, 12, i === s.league ? C.gold : C.mist, 'center', '800', { shadow: false });
      }
      UI.button('league.play', { x: px + pw / 2 - 160, y: 516, w: 320, h: 66 }, 'PLAY LEAGUE MATCH', {
        primary: true, color: lg.color, fontSize: 20, onClick: function () { startMode('league'); }
      });
      UI.nav(g);
    }
  };

  /* ---------------- Tournament ---------------- */
  S.tournament = {
    draw: function (g) {
      UI.menuBackground(g); UI.profileBar(g); UI.header(g, 'KNOCKOUT CUP', 'Eight rivals. Three rounds. One champion.');
      var w = HB.V.w, h = HB.V.h, s = Save.data, t = s.tournament;
      var pw = Math.min(w - 100, 1020), px = (w - pw) / 2;
      if (!t || t.finished) {
        Art.panel(g, px, 200, pw, 260, 22, { fill: 'rgba(9,22,46,0.85)', stroke: U.alpha(C.gold, 0.5) });
        Art.icon(g, 'cup', px + pw / 2, 270, 78, C.gold);
        Art.text(g, t && t.won ? 'YOU ARE THE CHAMPION!' : 'THE CUP AWAITS', px + pw / 2, 340, 28, C.gold, 'center', '900');
        Art.text(g, t && t.won ? 'Trophy, 2 500 coins and 250 XP earned.' : 'Beat 3 rivals in a row for the trophy and a huge reward.', px + pw / 2, 378, 15, C.mist, 'center', '800');
        UI.button('cup.start', { x: px + pw / 2 - 160, y: 492, w: 320, h: 62 }, 'START NEW CUP', {
          primary: true, fontSize: 20, onClick: function () { Meta.tournamentStart(); Audio.play('trophy'); UI.screen = 'tournament'; }
        });
        UI.nav(g); return;
      }
      var colX = [px + 30, px + pw * 0.36, px + pw * 0.67, px + pw - 110];
      var names = ['ROUND OF 8', 'SEMI FINALS', 'FINAL', 'CHAMPION'];
      for (var ci = 0; ci < 4; ci++) Art.text(g, names[ci], colX[ci] + 50, 190, 13, C.gold, 'center', '900');
      for (var i = 0; i < 8; i++) {
        var team = t.bracket[i], x = colX[0], y = 210 + i * 40;
        var alive = !team.out;
        Art.fillRR(g, x, y, 190, 34, 10, team.you ? U.alpha(C.gold, 0.35) : U.alpha(C.blue, alive ? 0.16 : 0.06));
        Art.text(g, (team.you ? '★ ' : '') + team.name, x + 95, y + 17, 13, team.you ? C.gold : alive ? C.paper : C.mist, 'center', '800', { shadow: false, maxWidth: 176 });
      }
      for (var j = 0; j < 3; j++) {
        for (var k = 0; k < 4 / Math.pow(2, j); k++) {
          var y2 = 230 + k * 80 * Math.pow(2, j) + 20 * Math.pow(2, j);
          Art.line(g, colX[j] + 190, y2, colX[j + 1], y2, U.alpha(C.gold, 0.35), 3);
        }
      }
      Art.text(g, 'ROUND ' + (t.round + 1) + ' / 3     PRIZE SO FAR: ' + U.fmtNum(t.prize) + ' COINS', px + pw / 2, 542, 17, C.paper, 'center', '900');
      var opp = Meta.tournamentNextOpponent();
      Art.text(g, opp ? 'NEXT: ' + opp.name : 'Waiting for the draw…', px + pw / 2, 566, 15, C.cyan, 'center', '800');
      UI.button('cup.play', { x: px + pw / 2 - 160, y: 580, w: 320, h: 52 }, 'PLAY NEXT MATCH', {
        primary: true, color: C.orange, fontSize: 18, onClick: function () { startMode('tournament'); }
      });
      UI.nav(g);
    }
  };

  /* ---------------- Locker room ---------------- */
  S.locker = {
    enter: function () { if (this.tab == null) this.tab = 0; },
    draw: function (g) {
      UI.menuBackground(g); UI.profileBar(g); UI.header(g, 'LOCKER ROOM', 'Build your hero: characters, gear, powers and stats.');
      var w = HB.V.w, h = HB.V.h, pw = Math.min(w - 80, 1180), px = (w - pw) / 2;
      UI.tabs('locker.tabs', px, 176, pw, 44, ['CHARACTERS', 'GEAR', 'POWERS', 'STATS'], this.tab, (function (self) { return function (i) { self.tab = i; UI.st('locker.scroll').off = 0; Audio.play('ui'); }; })(this));
      var cy = 232, chh = h - cy - 100;
      if (this.tab === 0) this.drawCharacters(g, px, cy, pw, chh);
      else if (this.tab === 1) this.drawGear(g, px, cy, pw, chh);
      else if (this.tab === 2) this.drawPowers(g, px, cy, pw, chh);
      else this.drawStats(g, px, cy, pw, chh);
      UI.nav(g);
    },
    drawCharacters: function (g, px, cy, pw, chh) {
      var listW = pw * 0.62, detailW = pw - listW - 18;
      var cols = 5, gap = 10, cw = (listW - 24 - (cols - 1) * gap) / cols, cardH = 116;
      var rows = Math.ceil(Data.characters.length / cols), contentH = rows * (cardH + gap) + 20;
      var self = this;
      UI.scroll('locker.scroll', { x: px, y: cy, w: listW, h: chh }, contentH, function (gg, top, bottom) {
        var r0 = Math.max(0, Math.floor(top / (cardH + gap)) - 1), r1 = Math.min(rows, Math.ceil(bottom / (cardH + gap)) + 1);
        for (var r = r0; r < r1; r++) {
          for (var c = 0; c < cols; c++) {
            var idx = r * cols + c; if (idx >= Data.characters.length) break;
            var ch = Data.characters[idx], owned = Save.data.unlockedChars.indexOf(idx) >= 0;
            var x = px + 12 + c * (cw + gap), y = cy + 10 + r * (cardH + gap);
            var sel = (self.selected == null ? Save.data.character : self.selected) === idx;
            var col = Data.rarity(ch).color;
            Art.fillRR(gg, x, y, cw, cardH, 12, sel ? U.alpha(col, 0.35) : 'rgba(255,255,255,0.055)');
            if (sel) { gg.strokeStyle = col; gg.lineWidth = 2; Art.rr(gg, x, y, cw, cardH, 12); gg.stroke(); }
            bust(gg, ch, x + cw / 2, y + 48, 66, { color: col, gear: { hat: -1, glasses: -1, jersey: -1, boots: -1 } });
            Art.text(gg, ch.name.split(' ')[0], x + cw / 2, y + 88, 12, C.paper, 'center', '900', { shadow: false, maxWidth: cw - 6 });
            Art.text(gg, owned ? 'LV ' + Meta.charLevel(idx) : 'LOCKED', x + cw / 2, y + 104, 10, owned ? col : C.mist, 'center', '900', { shadow: false });
            if (!owned) lockedOverlay(gg, { x: x, y: y, w: cw, h: cardH }, null);
            UI.region('locker.ch.' + idx, { x: x, y: y, w: cw, h: cardH }, (function (id) { return function () { self.selected = id; Audio.play('select'); }; })(idx), 'button');
          }
        }
      });
      var dx = px + listW + 18, id = this.selected == null ? Save.data.character : this.selected;
      var ch = Data.character(id), owned = Save.data.unlockedChars.indexOf(id) >= 0;
      var st = Meta.charStats(id);
      Art.panel(g, dx, cy, detailW, chh, 18, { fill: 'rgba(9,22,46,0.85)', stroke: U.alpha(Data.rarity(ch).color, 0.55) });
      bust(g, ch, dx + detailW / 2, cy + 96, 116, { color: Data.rarity(ch).color });
      Art.text(g, ch.name, dx + detailW / 2, cy + 172, 20, C.paper, 'center', '900', { maxWidth: detailW - 20 });
      Art.text(g, Data.rarity(ch).name.toUpperCase() + '  •  ' + ch.nation, dx + detailW / 2, cy + 192, 12, Data.rarity(ch).color, 'center', '900');
      statBar(g, dx + 18, cy + 212, detailW - 36, 'SPEED', st.speed, C.cyan);
      statBar(g, dx + 18, cy + 234, detailW - 36, 'JUMP', st.jump, C.teal);
      statBar(g, dx + 18, cy + 256, detailW - 36, 'SHOT', st.shot, C.gold);
      statBar(g, dx + 18, cy + 278, detailW - 36, 'SIZE', st.size, C.purple);
      var cost = Meta.charUpgradeCost(id);
      Art.text(g, 'LEVEL ' + Meta.charLevel(id) + ' / ' + Meta.charCap(ch) + '   •   CARDS: ' + (Save.data.cards[id] || 0), dx + detailW / 2, cy + 304, 12, C.mist, 'center', '900', { shadow: false });
      var by = cy + 326, halfBtn = (detailW - 42) / 2;
      if (!owned) {
        UI.button('locker.unlock', { x: dx + 14, y: by, w: detailW - 28, h: 46 }, 'UNLOCK  •  ' + U.fmtNum(ch.price) + ' COINS', {
          primary: true, color: C.gold, fontSize: 14, onClick: function () { var r = Meta.unlockChar(id); HB.toast(r.msg, r.ok ? 'info' : 'error'); Audio.play(r.ok ? 'unlock' : 'error'); }
        });
      } else {
        UI.button('locker.equip', { x: dx + 14, y: by, w: halfBtn, h: 46 }, id === Save.data.character ? 'EQUIPPED' : 'EQUIP', {
          color: C.teal, fontSize: 14, disabled: id === Save.data.character, onClick: function () { Save.data.character = id; Save.save(true); HB.toast(ch.name + ' equipped!'); }
        });
        UI.button('locker.upgrade', { x: dx + 28 + halfBtn, y: by, w: halfBtn, h: 46 }, 'UPGRADE ' + U.fmtNum(cost.coins), {
          primary: true, color: C.gold, fontSize: 13, onClick: function () { var r = Meta.upgradeChar(id); HB.toast(r.msg, r.ok ? 'info' : 'error'); Audio.play(r.ok ? 'unlock' : 'error'); }
        });
      }
    },
    drawGear: function (g, px, cy, pw, chh) {
      var self = this;
      var items = Data.gear, rowH = 64, contentH = items.length * (rowH + 8) + 30;
      UI.scroll('locker.scroll', { x: px, y: cy, w: pw, h: chh }, contentH, function (gg, top, bottom) {
        var i0 = Math.max(0, Math.floor(top / (rowH + 8)) - 1), i1 = Math.min(items.length, Math.ceil(bottom / (rowH + 8)) + 1);
        var lastSlot = '';
        for (var i = i0; i < i1; i++) {
          var it = items[i], y = cy + 12 + i * (rowH + 8);
          var owned = Save.data.ownedGear.indexOf(it.id) >= 0, equipped = Save.data.gear[it.slot] === it.id;
          Art.fillRR(gg, px + 8, y, pw - 16, rowH, 14, equipped ? U.alpha(C.gold, 0.22) : 'rgba(255,255,255,0.05)');
          Art.circle(gg, px + 40, y + 32, 22, U.alpha(it.color, 0.18));
          gg.strokeStyle = U.alpha(it.color, 0.5); gg.lineWidth = 1.5;
          gg.beginPath(); gg.arc(px + 40, y + 32, 22, 0, Math.PI * 2); gg.stroke();
          Art.icon(gg, it.slot === 'hat' ? 'hat' : it.slot === 'glasses' ? 'glasses' : it.slot === 'jersey' ? 'jersey' : it.slot === 'boots' ? 'boot' : 'ball', px + 40, y + 32, 28, it.color);
          Art.text(gg, it.name + '  ' + it.slotLabel, px + 72, y + 22, 16, C.paper, 'left', '900');
          var bonus = [];
          for (var k in it.bonus) bonus.push('+' + it.bonus[k] + ' ' + k.toUpperCase());
          Art.text(gg, bonus.join('  '), px + 72, y + 44, 12, C.cyan, 'left', '800', { shadow: false });
          Art.text(gg, equipped ? 'EQUIPPED' : owned ? 'OWNED' : U.fmtNum(it.price) + ' COINS', px + pw - 48, y + 32, 14, equipped ? C.gold : owned ? C.teal : C.paper, 'right', '900');
          UI.region('locker.gear.' + i, { x: px + 8, y: y, w: pw - 32, h: rowH }, (function (id) { return function () {
            var r = Meta.equipGear(id); if (r && r.msg) HB.toast(r.msg, r.ok ? 'info' : 'error'); Audio.play('select'); Save.flush();
          }; })(it.id), 'button');
        }
      });
    },
    drawPowers: function (g, px, cy, pw, chh) {
      var self = this, eq = Meta.equippedPowers();
      Art.text(g, 'EQUIPPED (tap a power to swap into a slot)', px + 12, cy + 8, 14, C.gold, 'left', '900');
      for (var e = 0; e < 3; e++) {
        var def = Data.power(eq[e]), ex = px + 12 + e * 122;
        Art.fillRR(g, ex, cy + 22, 112, 74, 14, U.alpha(def.color, 0.24));
        Art.icon(g, def.icon, ex + 56, cy + 48, 32, def.color);
        Art.text(g, 'SLOT ' + (e + 1), ex + 56, cy + 82, 11, C.paper, 'center', '900', { shadow: false });
      }
      var listY = cy + 104, listH = chh - 104, cols = pw > 900 ? 4 : 3, gap = 10;
      var cw = (pw - 40 - (cols - 1) * gap) / cols, ch = 104;
      var rows = Math.ceil(Data.powers.length / cols), contentH = rows * (ch + gap) + 16;
      UI.scroll('locker.scroll', { x: px, y: listY, w: pw, h: listH }, contentH, function (gg, top, bottom) {
        var r0 = Math.max(0, Math.floor(top / (ch + gap)) - 1), r1 = Math.min(rows, Math.ceil(bottom / (ch + gap)) + 1);
        for (var r = r0; r < r1; r++) for (var c = 0; c < cols; c++) {
          var i = r * cols + c; if (i >= Data.powers.length) break;
          var p = Data.powers[i], unlocked = Meta.powerUnlocked(p.id), lvl = Meta.powerLevel(p.id);
          var x = px + 12 + c * (cw + gap), y = listY + 8 + r * (ch + gap);
          var equippedSlot = eq.indexOf(p.id);
          Art.fillRR(gg, x, y, cw, ch, 14, equippedSlot >= 0 ? U.alpha(p.color, 0.3) : 'rgba(255,255,255,0.05)');
          Art.icon(gg, p.icon, x + 32, y + 34, 32, p.color);
          Art.text(gg, p.name, x + 58, y + 26, 14, C.paper, 'left', '900', { maxWidth: cw - 66 });
          Art.text(gg, p.desc, x + 12, y + 56, 11, U.alpha(C.mist, 0.85), 'left', '800', { maxWidth: cw - 24 });
          if (unlocked) Art.text(gg, 'LV ' + lvl + '  •  ' + p.cost + ' ENERGY', x + 12, y + 88, 11, C.gold, 'left', '900', { shadow: false });
          if (!unlocked) lockedOverlay(gg, { x: x, y: y, w: cw, h: ch }, U.fmtNum(p.fans) + ' FANS');
          UI.region('locker.pow.' + i, { x: x, y: y, w: cw, h: ch }, (function (id) { return function () { self.powerPick = id; Audio.play('select'); }; })(p.id), 'button');
        }
      });
      if (this.powerPick != null) {
        var p2 = Data.power(this.powerPick), unlocked2 = Meta.powerUnlocked(p2.id);
        var mx = px + pw - 300, my = cy + 4;
        Art.panel(g, mx, my, 288, 148, 16, { fill: 'rgba(8,18,38,0.96)', stroke: U.alpha(p2.color, 0.8) });
        Art.text(g, p2.name, mx + 144, my + 20, 17, p2.color, 'center', '900');
        if (!unlocked2) UI.button('locker.pow.unlock', { x: mx + 12, y: my + 40, w: 264, h: 42 }, 'UNLOCK POWER', { primary: true, fontSize: 14, onClick: function () { var r = Meta.unlockPower(p2.id); HB.toast(r.msg, r.ok ? 'info' : 'error'); Audio.play(r.ok ? 'unlock' : 'error'); } });
        else {
          UI.button('locker.pow.up', { x: mx + 12, y: my + 38, w: 264, h: 38 }, 'UPGRADE  •  LV ' + Meta.powerLevel(p2.id), { color: C.gold, fontSize: 13, onClick: function () { var r = Meta.upgradePower(p2.id); HB.toast(r.msg, r.ok ? 'info' : 'error'); } });
          Art.text(g, 'Tap SLOT 1 / 2 / 3 to equip', mx + 144, my + 88, 11, C.mist, 'center', '800', { shadow: false });
        }
        for (var s = 0; s < 3; s++) UI.button('locker.pow.slot.' + s, { x: mx + s * 96, y: my + 100, w: 90, h: 34 }, 'SLOT ' + (s + 1), {
          color: C.blue, fontSize: 12, onClick: (function (slot) { return function () { Meta.equipPower(slot, self.powerPick); HB.toast(p2.name + ' equipped in slot ' + (slot + 1)); }; })(s)
        });
      }
    },
    drawStats: function (g, px, cy, pw, chh) {
      var s = Save.data, st = s.stats, c = Data.character(s.character), cs = Meta.charStats(s.character);
      var half = pw / 2 - 12;
      Art.panel(g, px, cy, half, chh, 18, { fill: 'rgba(9,22,46,0.8)', stroke: 'rgba(255,255,255,0.12)' });
      Art.text(g, 'YOUR HERO', px + half / 2, cy + 26, 19, C.gold, 'center', '900');
      bust(g, c, px + half / 2, cy + 128, 150, { color: c.kit });
      Art.text(g, c.name, px + half / 2, cy + 216, 20, C.paper, 'center', '900');
      statBar(g, px + 20, cy + 244, half - 40, 'SPEED', cs.speed, C.cyan);
      statBar(g, px + 20, cy + 272, half - 40, 'JUMP', cs.jump, C.teal);
      statBar(g, px + 20, cy + 300, half - 40, 'SHOT', cs.shot, C.gold);
      statBar(g, px + 20, cy + 328, half - 40, 'SIZE', cs.size, C.purple);
      var b = Meta.gearBonuses();
      Art.text(g, 'GEAR BONUS  +' + b.speed + ' SPD  +' + b.jump + ' JMP  +' + b.shot + ' SHT  +' + b.size + ' SIZE', px + half / 2, cy + 370, 12, C.cyan, 'center', '900');
      var rows = [
        ['MATCHES', st.played], ['WINS', st.wins], ['DRAWS', st.draws], ['LOSSES', st.losses],
        ['GOALS', st.goals], ['CONCEDED', st.conceded], ['SHOTS', st.shots], ['HEADERS', st.headers],
        ['PERFECT HEADERS', st.perfectHeaders], ['SAVES', st.saves], ['TACKLES', st.tackles],
        ['POWERS USED', st.powers], ['BEST STREAK', st.bestStreak], ['CUPS WON', st.tournaments],
        ['PACKS OPENED', st.packs], ['PLAY TIME', U.fmtTime(st.playTime)]
      ];
      var dx = px + half + 24;
      Art.panel(g, dx, cy, half, chh, 18, { fill: 'rgba(9,22,46,0.8)', stroke: 'rgba(255,255,255,0.12)' });
      Art.text(g, 'CAREER RECORDS', dx + half / 2, cy + 26, 19, C.gold, 'center', '900');
      for (var i = 0; i < rows.length; i++) {
        var y = cy + 54 + i * 27;
        Art.text(g, rows[i][0], dx + 18, y, 13, U.alpha(C.mist, 0.9), 'left', '800', { shadow: false });
        Art.text(g, String(rows[i][1]), dx + half - 18, y, 14, rows[i][0] === 'WINS' ? C.teal : C.paper, 'right', '900', { shadow: false });
      }
    }
  };

  /* ---------------- Shop ---------------- */
  S.shop = {
    enter: function () { if (this.tab == null) this.tab = 0; this.scratch = null; },
    draw: function (g) {
      UI.menuBackground(g); UI.profileBar(g); UI.header(g, 'STORE', 'Packs, scratch cards and the season track. No ads, no paywalls.');
      var w = HB.V.w, h = HB.V.h, pw = Math.min(w - 80, 1080), px = (w - pw) / 2;
      UI.tabs('shop.tabs', px, 176, pw, 44, ['CARD PACKS', 'SCRATCH CARD', 'SEASON TRACK'], this.tab, (function (self) { return function (i) { self.tab = i; Audio.play('ui'); }; })(this));
      var cy = 234, chh = h - cy - 100;
      if (this.tab === 0) {
        var cols = 2, cw = (pw - 30) / cols, ch = 158;
        for (var i = 0; i < Data.packs.length; i++) {
          var pack = Data.packs[i], x = px + 10 + (i % 2) * (cw + 10), y = cy + Math.floor(i / 2) * (ch + 12);
          Art.panel(g, x, y, cw, ch, 20, { fill: U.alpha(pack.color, 0.14), stroke: U.alpha(pack.color, 0.6), gradient: true, fill2: 'rgba(8,18,38,0.85)' });
          Art.icon(g, 'cards', x + 54, y + 52, 52, pack.color);
          Art.text(g, pack.name, x + 100, y + 38, 20, C.paper, 'left', '900');
          Art.text(g, pack.cards + ' CARDS  •  RARE CHANCE ' + Math.round(pack.rare * 100) + '%', x + 100, y + 66, 13, C.mist, 'left', '800', { shadow: false });
          UI.button('shop.pack.' + i, { x: x + 20, y: y + ch - 58, w: cw - 40, h: 44 }, 'OPEN  •  ' + U.fmtNum(pack.price) + ' COINS', {
            primary: true, color: pack.color, fontSize: 15, onClick: (function (pk) { return function () {
              var r = Meta.openPack(pk);
              if (!r.ok) { HB.toast(r.msg, 'error'); Audio.play('error'); return; }
              Audio.play('pack'); UI.reveal(pk.name.toUpperCase(), r.cards);
            }; })(pack)
          });
        }
        Art.text(g, 'Cards unlock characters and power up their levels. Duplicate cards become upgrade fuel.', px + pw / 2, cy + chh - 20, 13, C.mist, 'center', '800');
      } else if (this.tab === 1) {
        if (!this.scratch) this.scratch = { cells: [0, 0, 0, 0, 0, 0, 0, 0, 0], picked: 0, result: null, t: 0 };
        var sc = this.scratch, size = Math.min(78, (pw - 80) / 3), gx = px + pw / 2 - size * 1.5 - 12, gy = cy + 16;
        Art.text(g, 'SCRATCH 3 PANELS TO REVEAL YOUR PRIZE', px + pw / 2, cy + 4, 16, C.gold, 'center', '900');
        for (var j = 0; j < 9; j++) {
          var sx = gx + (j % 3) * (size + 12), sy = gy + Math.floor(j / 3) * (size + 12);
          var revealed = sc.cells[j];
          Art.fillRR(g, sx, sy, size, size, 14, revealed ? U.alpha(C.gold, 0.3) : U.alpha(C.mist, 0.24));
          if (!revealed) {
            for (var q = 0; q < 6; q++) Art.line(g, sx + 8 + q * 12, sy + 10, sx + 18 + q * 12, sy + size - 10, U.alpha('#ffffff', 0.1), 3);
            Art.icon(g, 'coin', sx + size / 2, sy + size / 2, 28, U.alpha('#ffffff', 0.4));
          } else {
            Art.icon(g, sc.result ? 'coin' : 'star', sx + size / 2, sy + size / 2, 34, C.gold);
            if (sc.result && j === sc.winner) Art.text(g, sc.result.name, sx + size / 2, sy + size - 14, 11, C.gold, 'center', '900', { shadow: false });
          }
          UI.region('shop.scratch.' + j, { x: sx, y: sy, w: size, h: size }, (function (idx) { return function () {
            if (sc.result || sc.cells[idx]) return;
            sc.cells[idx] = 1; sc.picked++; Audio.play('scratch');
            if (sc.picked >= 3) { var r = Meta.scratch(); sc.result = r.reward; sc.winner = U.randInt(0, 8); Audio.play(r.reward.coins > 800 ? 'trophy' : 'coin'); }
          }; })(j), 'button');
        }
        var rightX = gx + 3 * (size + 12) + 36, rightW = Math.min(320, px + pw - rightX - 20);
        if (sc.result) {
          Art.panel(g, rightX, gy + 20, rightW, 178, 18, { fill: U.alpha(C.gold, 0.16), stroke: C.gold });
          Art.icon(g, 'trophy', rightX + rightW / 2, gy + 62, 40, C.gold);
          Art.text(g, sc.result.name.toUpperCase() + '!', rightX + rightW / 2, gy + 104, 22, C.gold, 'center', '900');
          Art.text(g, '+' + sc.result.coins + ' COINS  +' + sc.result.gems + ' GEMS', rightX + rightW / 2, gy + 134, 14, C.paper, 'center', '900');
          UI.button('shop.scratch.again', { x: rightX + 20, y: gy + 150, w: rightW - 40, h: 38 }, 'PLAY AGAIN  •  250', { color: C.pink, fontSize: 13, onClick: (function (self) { return function () { self.scratch = null; }; })(this) });
        } else {
          Art.text(g, 'SCRATCH & WIN', rightX + rightW / 2, gy + 54, 20, C.gold, 'center', '900');
          Art.text(g, 'Cost: 250 coins', rightX + rightW / 2, gy + 90, 15, C.paper, 'center', '800');
          Art.text(g, 'Jackpot: 3 000 coins', rightX + rightW / 2, gy + 118, 14, C.mist, 'center', '800');
          Art.text(g, '+ 12 gems', rightX + rightW / 2, gy + 142, 14, C.pink, 'center', '800');
        }
        Art.text(g, 'Pick any 3 panels', gx + 3 * (size + 12) / 2, gy + 3 * (size + 12) + 16, 13, C.mist, 'center', '800');
      } else {
        var sx2 = px + 20, sw = pw - 40, s = Save.data;
        Art.text(g, 'SEASON XP: ' + U.fmtNum(s.seasonXp), sx2 + sw / 2, cy + 8, 16, C.gold, 'center', '900');
        var rowH = 46, contentH = Data.season.length * (rowH + 6) + 20;
        UI.scroll('shop.scroll', { x: px, y: cy + 24, w: pw, h: chh - 24 }, contentH, function (gg, top, bottom) {
          for (var i = 0; i < Data.season.length; i++) {
            var tier = Data.season[i], y = cy + 34 + i * (rowH + 6);
            if (y > bottom || y + rowH < top) continue;
            var claimed = s.seasonClaimed.indexOf(i) >= 0, ready = s.seasonXp >= tier.xp;
            Art.fillRR(gg, sx2, y, sw, rowH, 12, claimed ? U.alpha(C.teal, 0.18) : ready ? U.alpha(C.gold, 0.18) : 'rgba(255,255,255,0.05)');
            Art.icon(gg, i === 9 ? 'crown' : i % 2 ? 'gem' : 'coin', sx2 + 28, y + rowH / 2, 24, claimed ? C.teal : ready ? C.gold : C.mist);
            Art.text(gg, (i + 1) + '.  ' + tier.name, sx2 + 56, y + rowH / 2, 15, C.paper, 'left', '900');
            Art.text(gg, U.fmtNum(tier.xp) + ' XP', sx2 + sw - 220, y + rowH / 2, 13, C.mist, 'center', '800', { shadow: false });
            var label = claimed ? 'CLAIMED' : ready ? 'CLAIM' : 'LOCKED';
            Art.fillRR(gg, sx2 + sw - 150, y + 8, 130, rowH - 16, 10, claimed ? U.alpha(C.teal, 0.3) : ready ? U.alpha(C.gold, 0.85) : 'rgba(255,255,255,0.08)');
            Art.text(gg, label, sx2 + sw - 85, y + rowH / 2, 13, ready && !claimed ? C.ink : C.paper, 'center', '900', { shadow: false });
            if (ready && !claimed) UI.region('shop.season.' + i, { x: sx2 + sw - 150, y: y + 8, w: 130, h: rowH - 16 }, (function (idx) { return function () { var r = Meta.claimSeason(idx); HB.toast(r.msg, 'info'); Audio.play('coin'); }; })(i), 'button');
          }
        });
      }
      UI.nav(g);
    }
  };

  /* ---------------- Progression ---------------- */
  S.progress = {
    enter: function () { if (this.tab == null) this.tab = 0; Meta.refreshDaily(); },
    draw: function (g) {
      UI.menuBackground(g); UI.profileBar(g); UI.header(g, 'PROGRESSION', 'Daily missions, career milestones, achievements and records.');
      var w = HB.V.w, h = HB.V.h, pw = Math.min(w - 80, 1020), px = (w - pw) / 2;
      UI.tabs('progress.tabs', px, 176, pw, 44, ['DAILY MISSIONS', 'CAREER', 'ACHIEVEMENTS', 'RECORDS'], this.tab, (function (self) { return function (i) { self.tab = i; UI.st('progress.scroll').off = 0; }; })(this));
      var cy = 234, chh = h - cy - 100, s = Save.data;
      if (this.tab === 0) {
        Art.text(g, 'Resets every day  •  ' + Meta.today(), px + pw / 2, cy + 4, 14, C.gold, 'center', '900');
        for (var i = 0; i < 3; i++) {
          var m = Meta.mission(i), p = s.missions.progress[i] || 0, done = p >= m.goal, claimed = s.missions.claimed[i];
          var y = cy + 26 + i * 96;
          Art.fillRR(g, px + 10, y, pw - 20, 84, 16, claimed ? 'rgba(255,255,255,0.04)' : U.alpha(C.cyan, 0.12));
          Art.icon(g, 'calendar', px + 48, y + 42, 32, C.cyan);
          Art.text(g, m.text, px + 82, y + 26, 18, C.paper, 'left', '900');
          Art.fillRR(g, px + 82, y + 50, pw - 340, 12, 6, 'rgba(255,255,255,0.12)');
          Art.fillRR(g, px + 82, y + 50, (pw - 340) * U.clamp(p / m.goal, 0, 1), 12, 6, done ? C.teal : C.cyan);
          Art.text(g, Math.min(p, m.goal) + ' / ' + m.goal + '  •  +' + m.coins + ' COINS', px + 82 + (pw - 340) / 2, y + 34, 12, U.alpha(C.mist, 0.9), 'center', '800', { shadow: false });
          var label = claimed ? 'CLAIMED' : done ? 'CLAIM  +' + m.coins : 'IN PROGRESS';
          Art.fillRR(g, px + pw - 236, y + 22, 210, 40, 12, claimed ? 'rgba(255,255,255,0.06)' : done ? U.alpha(C.gold, 0.9) : 'rgba(255,255,255,0.06)');
          Art.text(g, label, px + pw - 131, y + 42, 14, done && !claimed ? C.ink : C.mist, 'center', '900', { shadow: false });
          if (done && !claimed) UI.region('progress.mission.' + i, { x: px + pw - 236, y: y + 22, w: 210, h: 40 }, (function (idx) { return function () { var r = Meta.claimMission(idx); HB.toast(r.msg, 'info'); Audio.play('coin'); }; })(i), 'button');
        }
        Art.text(g, 'Missions progress from what you do in matches: goals, shots, headers, saves, powers and wins.', px + pw / 2, cy + chh - 24, 13, C.mist, 'center', '800');
      } else if (this.tab === 1) {
        var rowH = 62, contentH = Data.career.length * (rowH + 8) + 20;
        UI.scroll('progress.scroll', { x: px, y: cy, w: pw, h: chh }, contentH, function (gg, top, bottom) {
          for (var i = 0; i < Data.career.length; i++) {
            var m = Data.career[i], y = cy + 10 + i * (rowH + 8);
            if (y > bottom || y + rowH < top) continue;
            var val = Meta.careerValue(m), done = val >= m.goal, claimed = s.careerClaimed.indexOf(m.id) >= 0;
            Art.fillRR(gg, px + 8, y, pw - 16, rowH, 14, claimed ? U.alpha(C.teal, 0.12) : 'rgba(255,255,255,0.05)');
            Art.icon(gg, 'flag', px + 40, y + 31, 26, done ? C.gold : C.mist);
            Art.text(gg, m.name, px + 70, y + 20, 16, C.paper, 'left', '900');
            Art.text(gg, m.desc + '   (' + Math.min(val, m.goal) + '/' + m.goal + ')', px + 70, y + 42, 12, C.mist, 'left', '800', { shadow: false });
            Art.text(gg, '+' + m.coins + '  +' + m.xp + ' XP', px + pw - 190, y + 31, 13, C.gold, 'center', '900', { shadow: false });
            var lab = claimed ? 'CLAIMED' : done ? 'CLAIM' : 'LOCKED';
            Art.fillRR(gg, px + pw - 120, y + 14, 100, 34, 10, done && !claimed ? U.alpha(C.gold, 0.9) : 'rgba(255,255,255,0.07)');
            Art.text(gg, lab, px + pw - 70, y + 31, 12, done && !claimed ? C.ink : C.mist, 'center', '900', { shadow: false });
            if (done && !claimed) UI.region('progress.career.' + i, { x: px + pw - 120, y: y + 14, w: 100, h: 34 }, (function (mm) { return function () { var r = Meta.claimCareer(mm); HB.toast(r.msg, 'info'); Audio.play('coin'); }; })(m), 'button');
          }
        });
      } else if (this.tab === 2) {
        var cols = 2, cw = (pw - 30) / 2, ch = 72, contentH = Math.ceil(Data.achievements.length / cols) * (ch + 8) + 20;
        UI.scroll('progress.scroll', { x: px, y: cy, w: pw, h: chh }, contentH, function (gg, top, bottom) {
          var rows = Math.ceil(Data.achievements.length / cols);
          var r0 = Math.max(0, Math.floor(top / (ch + 8)) - 1), r1 = Math.min(rows, Math.ceil(bottom / (ch + 8)) + 1);
          for (var r = r0; r < r1; r++) for (var c = 0; c < cols; c++) {
            var i = r * cols + c; if (i >= Data.achievements.length) break;
            var a = Data.achievements[i], got = !!s.achievements[a.id];
            var x = px + 10 + c * (cw + 10), y = cy + 10 + r * (ch + 8);
            Art.fillRR(gg, x, y, cw, ch, 14, got ? U.alpha(C.gold, 0.2) : 'rgba(255,255,255,0.05)');
            Art.icon(gg, got ? 'medal' : 'lock', x + 34, y + 36, 30, got ? C.gold : C.mist);
            Art.text(gg, a.name, x + 64, y + 24, 15, got ? C.gold : C.paper, 'left', '900');
            Art.text(gg, a.desc, x + 64, y + 46, 11, C.mist, 'left', '800', { shadow: false, maxWidth: cw - 80 });
            if (got) Art.text(gg, '+' + a.coins, x + cw - 16, y + 36, 12, C.teal, 'right', '900', { shadow: false });
          }
        });
      } else {
        var s2 = Save.data, st = s2.stats;
        var blocks = [
          ['MATCHES', st.played, C.blue], ['WINS', st.wins, C.teal], ['GOALS', st.goals, C.gold],
          ['HEADERS', st.headers, C.cyan], ['SAVES', st.saves, C.purple], ['POWERS', st.powers, C.orange]
        ];
        for (var b = 0; b < blocks.length; b++) {
          var x2 = px + 10 + (b % 3) * (pw - 20) / 3, y2 = cy + 20 + Math.floor(b / 3) * 130;
          var bw = (pw - 40) / 3;
          Art.panel(g, x2, y2, bw, 116, 18, { fill: U.alpha(blocks[b][2], 0.14), stroke: U.alpha(blocks[b][2], 0.5) });
          Art.text(g, U.fmtNum(blocks[b][1]), x2 + bw / 2, y2 + 50, 36, blocks[b][2], 'center', '900');
          Art.text(g, blocks[b][0], x2 + bw / 2, y2 + 92, 14, C.paper, 'center', '900');
        }
        Art.text(g, 'Win rate: ' + (st.played ? Math.round(st.wins / st.played * 100) : 0) + '%   •   Goals per match: ' + (st.played ? (st.goals / st.played).toFixed(1) : '0.0'), px + pw / 2, cy + 300, 16, C.mist, 'center', '800');
      }
      UI.nav(g);
    }
  };

  /* ---------------- Settings ---------------- */
  S.settings = {
    draw: function (g) {
      UI.menuBackground(g); UI.profileBar(g); UI.header(g, 'SETTINGS', 'Tune audio, controls, difficulty and visual quality.');
      var w = HB.V.w, h = HB.V.h, pw = Math.min(w - 120, 900), px = (w - pw) / 2, s = Save.data.settings;
      var cy = 190, half = pw / 2 - 14;
      var self = this;
      Art.panel(g, px, cy, half, 350, 18, { fill: 'rgba(9,22,46,0.8)', stroke: 'rgba(255,255,255,0.12)' });
      Art.text(g, 'AUDIO', px + half / 2, cy + 26, 18, C.gold, 'center', '900');
      function sliderRow(y, label, val, key) {
        Art.icon(g, key === 'music' ? 'music' : 'sfx', px + 30, y + 12, 22, C.cyan);
        Art.text(g, label, px + 52, y + 12, 15, C.paper, 'left', '900', { shadow: false });
        Art.text(g, Math.round(val * 100) + '%', px + half - 24, y + 12, 14, C.gold, 'right', '900', { shadow: false });
        UI.slider('set.' + key, { x: px + 24, y: y + 28, w: half - 48, h: 26 }, val, function (v) { s[key] = v; Audio.setVolumes(); Save.save(); }, key === 'music' ? C.purple : C.cyan);
      }
      sliderRow(cy + 50, 'MUSIC', s.music, 'music');
      sliderRow(cy + 124, 'SOUND EFFECTS', s.sfx, 'sfx');
      function toggleRow(y, label, key, sub, ox) {
        ox = ox || px;
        Art.text(g, label, ox + 24, y + 18, 15, C.paper, 'left', '900', { shadow: false });
        if (sub) Art.text(g, sub, ox + 24, y + 38, 11, C.mist, 'left', '800', { shadow: false });
        var r = { x: ox + half - 84, y: y + 4, w: 62, h: 34 };
        Art.fillRR(g, r.x, r.y, r.w, r.h, 17, s[key] ? C.teal : 'rgba(255,255,255,0.16)');
        Art.circle(g, r.x + (s[key] ? 44 : 18), r.y + 17, 13, '#ffffff');
        UI.region('set.toggle.' + key, r, (function (kk) { return function () { s[kk] = !s[kk]; Audio.setVolumes(); Save.save(true); Audio.play('toggle'); }; })(key), 'button');
      }
      toggleRow(cy + 200, 'HAPTICS', 'haptics', 'Vibration on kicks and goals');
      toggleRow(cy + 260, 'GOLDEN GOAL', 'goldenGoal', 'Tied matches go to sudden death');
      Art.panel(g, px + half + 28, cy, half, 350, 18, { fill: 'rgba(9,22,46,0.8)', stroke: 'rgba(255,255,255,0.12)' });
      var rx = px + half + 28;
      Art.text(g, 'GAMEPLAY', rx + half / 2, cy + 26, 18, C.gold, 'center', '900');
      function stepper(y, label, val, labels, onDelta) {
        Art.text(g, label, rx + 20, y + 18, 15, C.paper, 'left', '900', { shadow: false });
        Art.fillRR(g, rx + half - 190, y, 168, 38, 12, 'rgba(255,255,255,0.07)');
        Art.text(g, labels[val], rx + half - 106, y + 19, 14, C.gold, 'center', '900', { shadow: false });
        UI.button('set.step.L.' + label, { x: rx + half - 190, y: y, w: 38, h: 38 }, null, { icon: 'left', color: C.blue, iconSize: 20, onClick: function () { onDelta(-1); } });
        UI.button('set.step.R.' + label, { x: rx + half - 38, y: y, w: 38, h: 38 }, null, { icon: 'right', color: C.blue, iconSize: 20, onClick: function () { onDelta(1); } });
      }
      stepper(cy + 50, 'DIFFICULTY', s.difficulty, Data.DIFFICULTIES.map(function (d) { return d.name; }), function (d) {
        s.difficulty = U.clamp(s.difficulty + d, 0, 4); UI.diff = s.difficulty; Save.save(true); Audio.play('toggle');
      });
      var lengths = [60, 90, 120], li = lengths.indexOf(s.matchLength); if (li < 0) li = 1;
      stepper(cy + 104, 'MATCH LENGTH', li, ['60 SEC', '90 SEC', '120 SEC'], function (d) {
        li = U.clamp(li + d, 0, 2); s.matchLength = lengths[li]; Save.save(true); Audio.play('toggle');
      });
      stepper(cy + 158, 'VISUAL QUALITY', s.quality, ['LOW', 'HIGH'], function (d) {
        s.quality = U.clamp(s.quality + d, 0, 1); Art.invalidateBackground(); Save.save(true); Audio.play('toggle');
      });
      toggleRow(cy + 212, 'FLIP CONTROLS', 'flipControls', 'Mirror the solo control layout', rx);
      toggleRow(cy + 272, 'SHOW FPS', 'showFps', 'Debug overlay', rx);
      /* bottom actions */
      UI.button('set.controls', { x: px, y: cy + 366, w: 220, h: 52 }, 'CONTROLS HELP', { color: C.cyan, icon: 'hand', iconSize: 22, fontSize: 15, onClick: function () {
        UI.confirm('CONTROLS', 'SOLO: A/D move • W jump • S kick • E lob • Q dash • 1/2/3 powers. LOCAL 1v1: P1 A/D/W/S/E/Q • P2 arrows + . / • 7/8/9 powers. Hold KICK to charge a shot!', function () { }, 'GOT IT');
      } });
      UI.button('set.about', { x: px + 236, y: cy + 366, w: 220, h: 52 }, 'ABOUT', { color: C.blue, icon: 'info', iconSize: 22, fontSize: 15, onClick: function () {
        UI.confirm('HEAD BALL 3', 'An original arcade football game. All graphics, music and sound effects are generated in code. v' + HB.VERSION, function () { }, 'NICE');
      } });
      UI.button('set.reset', { x: px + pw - 220, y: cy + 366, w: 220, h: 52 }, 'RESET SAVE', { color: C.red, icon: 'trash', iconSize: 22, fontSize: 15, onClick: function () {
        UI.confirm('RESET EVERYTHING?', 'All characters, coins, fans and progress will be erased. This cannot be undone.', function () { Save.reset(); Art.invalidateBackground(); UI.diff = Save.data.settings.difficulty; HB.toast('Save reset', 'info'); }, 'RESET');
      } });
      UI.nav(g);
    }
  };

  /* ---------------- Match screen ---------------- */
  S.match = {
    enter: function () { this.pauseOpen = false; },
    draw: function (g) {
      var m = HB.App.match;
      if (!m) { UI.go('home'); return; }
      m.render(g);
      var layout = m.layoutControls();
      for (var s = 0; s < 2; s++) {
        var cl = layout[s]; if (!cl) continue;
        for (var i = 0; i < (cl.powers ? cl.powers.length : 0); i++) {
          UI.region('m.power.' + s + '.' + i, cl.powers[i], (function (side, slot) { return function () { m.pressPower(side, slot); }; })(s, i), 'button');
        }
      }
      if (layout[0] && layout[0].pause) UI.region('m.pause', layout[0].pause, function () { m.pause(); Audio.play('ui'); }, 'button');
      if (m.tutorialStep >= 0) {
        UI.button('m.skipTut', { x: HB.V.w - 176, y: 118, w: 150, h: 40 }, 'SKIP TUTORIAL', { color: C.mist, fontSize: 12, onClick: function () { m.skipTutorial(); } });
      }
      if (m.paused) this.drawPause(g, m);
    },
    drawPause: function (g, m) {
      var V = HB.V, w = V.w, h = V.h, cx = w / 2;
      g.fillStyle = 'rgba(3,9,22,0.78)'; g.fillRect(0, 0, w, h);
      var pw = 400, ph = 340, px = cx - pw / 2, py = h / 2 - ph / 2;
      Art.panel(g, px, py, pw, ph, 24, { fill: C.navy2, stroke: U.alpha(C.gold, 0.6), gradient: true, fill2: C.navy });
      Art.text(g, 'PAUSED', cx, py + 48, 32, C.gold, 'center', '900');
      Art.text(g, m.score[0] + '  -  ' + m.score[1] + '     ' + U.fmtTime(m.time || 0), cx, py + 86, 18, C.paper, 'center', '900');
      UI.button('m.resume', { x: px + 50, y: py + 116, w: 300, h: 50 }, 'RESUME', { primary: true, fontSize: 18, onClick: function () { m.resume(); } });
      UI.button('m.restart', { x: px + 50, y: py + 176, w: 300, h: 46 }, 'RESTART MATCH', { color: C.blue, fontSize: 16, onClick: function () { HB.App.restartMatch(); } });
      UI.button('m.quit', { x: px + 50, y: py + 230, w: 300, h: 46 }, 'QUIT MATCH', { color: C.red, fontSize: 16, onClick: function () {
        UI.confirm('QUIT MATCH?', 'This match will not count and no rewards will be earned.', function () { m.quit(); HB.App.home(); }, 'QUIT');
      } });
      Art.text(g, 'Music and SFX sliders are in Settings', cx, py + ph - 24, 12, C.mist, 'center', '800', { shadow: false });
    }
  };

  /* ---------------- Results ---------------- */
  S.results = {
    enter: function (p) {
      this.res = p || (HB.App.match ? HB.App.match.result : null);
      Audio.music(this.res && this.res.win ? 'victory' : 'menu');
      Audio.setCrowd(0.3);
    },
    draw: function (g) {
      UI.menuBackground(g);
      var w = HB.V.w, h = HB.V.h, cx = w / 2, res = this.res;
      if (!res) { UI.go('home'); return; }
      var title = res.win ? 'VICTORY!' : res.draw ? 'DRAW' : 'DEFEAT';
      var col = res.win ? C.gold : res.draw ? C.cyan : C.red;
      var pw = Math.min(w - 80, 780), px = (w - pw) / 2, py = 92, ph = h - 176;
      Art.panel(g, px, py, pw, ph, 24, { fill: 'rgba(9,22,46,0.92)', stroke: U.alpha(col, 0.6), gradient: true, fill2: 'rgba(8,18,38,0.95)' });
      Art.icon(g, res.win ? 'trophy' : res.draw ? 'medal' : 'flag', cx, py + 54, 54, col);
      Art.text(g, title, cx, py + 108, 44, col, 'center', '900', { outline: 'rgba(0,0,0,0.35)', outlineW: 8, glow: col, glowSize: 18 });
      Art.text(g, res.score[0] + '   -   ' + res.score[1], cx, py + 158, 38, C.paper, 'center', '900');
      Art.text(g, 'vs ' + res.opponent, cx, py + 190, 15, C.mist, 'center', '800');
      if (res.rewards && res.rewards.coins) rewardLine(g, px + 90, py + 224, res.rewards);
      else Art.text(g, 'PRACTICE MATCH  •  NO REWARDS', cx, py + 224, 15, C.mist, 'center', '900');
      var stats = [
        ['SHOTS', res.shots], ['HEADERS', res.headers], ['PERFECT', res.perfectHeaders],
        ['SAVES', res.saves], ['POWERS', res.powers], ['TACKLES', res.tackles]
      ];
      var sw = (pw - 100) / 6;
      for (var i = 0; i < stats.length; i++) {
        var sx = px + 50 + i * sw, sy = py + 250;
        Art.fillRR(g, sx, sy, sw - 8, 42, 10, 'rgba(255,255,255,0.06)');
        Art.text(g, stats[i][0], sx + (sw - 8) / 2, sy + 13, 10, U.alpha(C.mist, 0.85), 'center', '900', { shadow: false });
        Art.text(g, String(stats[i][1]), sx + (sw - 8) / 2, sy + 30, 15, C.paper, 'center', '900', { shadow: false });
      }
      var midY = py + 306;
      Art.panel(g, px + 40, midY, pw - 80, 150, 18, { fill: 'rgba(255,255,255,0.045)', stroke: 'rgba(255,255,255,0.1)' });
      var hero = Data.character(Save.data.character);
      bust(g, hero, px + 128, midY + 70, 104, { color: C.gold, happy: res.win });
      Art.text(g, res.win ? 'MATCH MVP' : 'KEEP TRAINING', px + 128, midY + 132, 12, C.gold, 'center', '900');
      var rating = U.clamp(1 + (res.goals || 0) * 0.6 + (res.saves || 0) * 0.4 + (res.perfectHeaders || 0) * 0.3, 1, 5);
      for (var st = 0; st < 5; st++) {
        Art.icon(g, 'star', px + pw / 2 - 64 + st * 32, midY + 42, 26, st < Math.round(rating) ? C.gold : 'rgba(255,255,255,0.16)');
      }
      Art.text(g, 'MATCH RATING  ' + rating.toFixed(1), px + pw / 2, midY + 78, 14, C.paper, 'center', '900');
      var xp = Meta.xpProgress(), lv = Save.data.level;
      Art.text(g, 'LEVEL ' + lv, px + pw - 190, midY + 30, 16, C.cyan, 'center', '900');
      Art.fillRR(g, px + pw - 290, midY + 52, 200, 16, 8, 'rgba(255,255,255,0.14)');
      Art.fillRR(g, px + pw - 290, midY + 52, 200 * xp.t, 16, 8, C.cyan);
      Art.text(g, U.fmtNum(xp.cur) + ' / ' + U.fmtNum(xp.max) + ' XP', px + pw - 190, midY + 88, 12, C.mist, 'center', '800', { shadow: false });
      var extra = [];
      if (res.rewards) {
        (res.rewards.unlocked || []).forEach(function (u) { extra.push('UNLOCKED: ' + u.name); });
        (res.rewards.achieved || []).forEach(function (a) { extra.push('ACHIEVEMENT: ' + a.name); });
      }
      if (res.tournamentWin) extra.push('CUP CHAMPION!');
      for (var e = 0; e < Math.min(2, extra.length); e++) Art.text(g, extra[e], px + pw / 2, midY + 112 + e * 19, 13, C.teal, 'center', '900');
      var by = py + ph - 74;
      UI.button('results.again', { x: px + 40, y: by, w: (pw - 100) / 2, h: 52 }, 'REMATCH', { primary: true, fontSize: 17, onClick: function () { HB.App.restartMatch(); } });
      var nextLabel = res.mode === 'tournament' ? 'CUP BRACKET' : res.mode === 'league' ? 'LEAGUE' : 'HOME';
      UI.button('results.next', { x: px + 60 + (pw - 100) / 2, y: by, w: (pw - 100) / 2, h: 52 }, nextLabel, {
        color: C.blue, fontSize: 17, onClick: function () {
          if (res.mode === 'tournament') {
            var t = Meta.tournamentAdvance(res.win);
            if (t && t.finished && t.won) { HB.toast('CUP CHAMPION! +2500 coins', 'power'); Audio.play('trophy'); }
            UI.go('tournament');
          } else if (res.mode === 'league') UI.go('league');
          else HB.App.home();
        }
      });
    }
  };
})(window.HB = window.HB || {});
