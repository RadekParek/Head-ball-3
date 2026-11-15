/* Render the real game to PNGs for visual QA (dev-only, not shipped). */
'use strict';
const fs = require('fs');
const path = require('path');
const { createHarness } = require('./harness');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'screenshots');

function shoot(w, h, tag) {
  const harn = createHarness(w, h);
  const HB = harn.HB;
  harn.step(4);
  const jobs = [
    ['home', () => harn.go('home')],
    ['modes', () => harn.go('modes')],
    ['league', () => harn.go('league')],
    ['tournament', () => { HB.Meta.tournamentStart(); harn.go('tournament'); }],
    ['locker', () => { HB.UI.screens.locker.tab = 0; harn.go('locker'); }],
    ['gear', () => { HB.UI.screens.locker.tab = 1; harn.go('locker'); }],
    ['powers', () => { HB.UI.screens.locker.tab = 2; harn.go('locker'); }],
    ['shop', () => { HB.UI.screens.shop.tab = 0; harn.go('shop'); }],
    ['progress', () => { HB.UI.screens.progress.tab = 0; harn.go('progress'); }],
    ['settings', () => harn.go('settings')],
    ['results', () => harn.go('results', {
      mode: 'quick', win: true, draw: false, score: [4, 2], goals: 4, conceded: 2,
      shots: 9, headers: 4, perfectHeaders: 2, saves: 3, powers: 5, tackles: 2,
      opponent: 'Bongo Nutmeg', rewards: { coins: 320, fans: 48, xp: 92, gems: 2, unlocked: [], achieved: [] }
    })],
    ['match', () => {
      HB.App.startMatch({ mode: 'quick', ai: 2, tutorial: false });
      const m = HB.App.match;
      m.countdown = 0; m.state = 'play'; m.time = 63;
      m.ball.x = 700; m.ball.y = 360; m.ball.vx = 420; m.ball.vy = -260;
      m.players[0].x = 470; m.players[1].x = 900; m.players[0].energy = 82;
      m.score = [2, 1]; harn.step(1);
    }],
    ['local', () => {
      HB.App.startMatch({ mode: 'local', local: true, ai: 1 });
      const m = HB.App.match;
      m.countdown = 0; m.state = 'play'; m.time = 48; m.score = [1, 1];
      m.ball.x = 640; m.ball.y = 300; m.ball.vx = 200;
      m.players[0].x = 420; m.players[1].x = 860; harn.step(1);
    }],
    ['goal', () => {
      HB.App.startMatch({ mode: 'quick', ai: 2, tutorial: false });
      const m = HB.App.match;
      m.state = 'goal'; m.goalSide = 0; m.score = [3, 2]; m.goalTimer = 1.4;
      m.confetti(); harn.step(1);
    }],
    ['penalty', () => { HB.App.startPenalty({ ai: 2 }); harn.step(1); }]
  ];
  for (const [name, fn] of jobs) {
    fn();
    HB.UI.trans = 0;
    harn.step(3);
    const file = path.join(OUT, tag + '-' + name + '.png');
    harn.savePng(file);
    console.log('wrote ' + path.relative(ROOT, file));
  }
}
fs.mkdirSync(OUT, { recursive: true });
shoot(1280, 720, '16x9');
shoot(1560, 720, 'phone');
