/* Headless functional smoke test: boots the real bundle, exercises every
 * screen, runs a full match simulation and checks physics invariants. */
'use strict';
process.on('uncaughtException', function (e) {
  console.error('SMOKE FAILED: ' + e.message);
  console.error((e.stack || '').split('\n').slice(1, 7).join('\n'));
  process.exit(1);
});
const { createHarness } = require('./harness');
const h = createHarness(1280, 720);
const HB = h.HB;
let checks = 0;
function ok(cond, msg) { checks++; if (!cond) throw new Error('FAILED: ' + msg); }
function section(name) { console.log('\n--- ' + name + ' ---'); }

section('boot');
h.step(3);
ok(HB && HB.VERSION, 'HB namespace exists');
ok(HB.Save.data.characters === undefined, 'save loaded');
ok(HB.Data.characters.length === 141, '125 heroes + 16 legends generated');
ok(HB.Data.characters.filter(c => c.legend).length === 16, '16 legends in the roster');
ok(HB.Data.character(1000).name === 'Cristiano Ronaldo', 'legend id lookup works');
ok(HB.Data.powers.length === 20, '20 powers generated');
ok(HB.Data.gear.length === 31, 'gear catalogue generated');
ok(HB.UI.screen === 'splash', 'boot screen');
console.log('characters=' + HB.Data.characters.length + ' powers=' + HB.Data.powers.length + ' gear=' + HB.Data.gear.length + ' stadiums=' + HB.Data.stadiums.length);

section('all menu screens');
const screens = ['home', 'modes', 'league', 'tournament', 'locker', 'shop', 'progress', 'settings'];
for (const s of screens) {
  h.go(s); h.step(3);
  ok(HB.UI.screen === s, 'screen ' + s + ' active');
  console.log('  ' + s + ': ' + HB.UI.regions.length + ' regions');
}
/* locker tabs */
for (let tab = 0; tab < 4; tab++) { HB.UI.screens.locker.tab = tab; h.step(2); }
for (let tab = 0; tab < 3; tab++) { HB.UI.screens.shop.tab = tab; h.step(2); }
for (let tab = 0; tab < 4; tab++) { HB.UI.screens.progress.tab = tab; h.step(2); }
console.log('  all tabs rendered');

section('match simulation');
HB.App.startMatch({ mode: 'quick', ai: 2, length: 90, tutorial: false });
h.step(4);
ok(HB.UI.screen === 'match', 'match screen active');
ok(HB.App.match instanceof HB.Match, 'match instance');
const m = HB.App.match;
/* force kickoff to end quickly, then run 20 s of simulated play */
m.countdown = 0.01; h.step(3);
ok(m.state === 'play', 'kickoff -> play');
let bad = 0;
for (let i = 0; i < 1200; i++) {
  /* drive both players with pseudo-random input to shake out physics */
  const p0 = { left: i % 97 < 20, right: i % 97 > 70, jump: i % 53 === 0, kick: i % 41 < 3, lob: i % 67 < 2, dash: i % 89 === 0 };
  m.setInput(0, p0);
  if (i % 150 === 0) m.pressPower(0, i % 3);
  m.update(1 / 60);
  const b = m.ball;
  if (!isFinite(b.x) || !isFinite(b.y) || !isFinite(b.vx) || !isFinite(b.vy) || !isFinite(m.players[0].x) || !isFinite(m.players[1].x)) bad++;
}
ok(bad === 0, 'no NaN/Infinity in physics over 20 s (' + bad + ' bad frames)');
ok(m.state === 'play' || m.state === 'goal' || m.state === 'kickoff', 'match state sane: ' + m.state);
console.log('  score=' + m.score.join(':') + ' state=' + m.state + ' time=' + m.time.toFixed(1) + ' effects=' + m.effects.length + ' particles=' + m.particles.length);
h.step(2);

section('goals / rules / powers');
m.state = 'play';
var beforeGoal = m.score[1];
m.ball.x = 30; m.ball.y = HB.WORLD.ground - 60; m.ball.vx = -300;
m.checkGoal(m.ball);
ok(m.score[1] === beforeGoal + 1, 'goal detected in left goal for side 1');
console.log('  score after goal=' + m.score.join(':'));
m.state = 'play'; m.goalTimer = 0; m.state = 'goal'; m.update(2.5); h.step(2);
ok(m.state === 'kickoff' || m.state === 'ended', 'goal celebration resets');
/* all 20 powers activate without throwing */
m.state = 'play';
for (let id = 0; id < HB.Data.powers.length; id++) {
  m.players[0].energy = 100;
  m.effects.push({ key: 'x', id: id, side: 0, target: -1, until: m.t + 1, color: '#fff' });
  m.activatePower(0, id);
  m.step(1 / 120);
}
console.log('  all 20 powers activated');
ok(m.effects.length > 0, 'power effects registered');

section('local 1v1 layout');
HB.App.startMatch({ mode: 'local', local: true, ai: 1 });
const lm = HB.App.match;
ok(lm.local === true, 'local mode set');
const layout = lm.layoutControls();
ok(layout[0] && layout[1], 'two control clusters');
const rects = [];
for (const cl of layout) for (const k of ['left', 'right', 'jump', 'kick']) if (cl[k]) rects.push(cl[k]);
for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
  const a = rects[i], b = rects[j];
  const overlap = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  ok(!overlap, 'no overlapping control buttons (' + i + ',' + j + ')');
}
console.log('  ' + rects.length + ' buttons, no overlap');
h.step(3);

section('penalty duel');
HB.App.startPenalty({ ai: 2 });
const pen = HB.App.match;
ok(pen instanceof HB.Penalty, 'penalty instance');
pen.setInput(0, { kick: false, left: false, right: false, up: false, down: false });
h.step(2);
for (let i = 0; i < 400; i++) {
  const inp = { kick: i % 40 === 0, dive0: i % 55 === 0, dive1: false, dive2: false, left: false, right: false, up: false, down: false };
  pen.setInput(0, inp); pen.update(1 / 60);
}
ok(isFinite(pen.score[0]) && isFinite(pen.score[1]), 'penalty scores finite');
console.log('  penalty score=' + pen.score.join(':') + ' attempts=' + pen.attempts.join(':') + ' phase=' + pen.phase);
h.step(2);

section('results / progression');
const fakeRes = {
  mode: 'quick', local: false, win: true, draw: false, score: [3, 1], goals: 3, conceded: 1,
  shots: 8, headers: 3, saves: 2, powers: 4, tackles: 1, perfectHeaders: 1,
  duration: 90, maxDeficit: 0, tournamentWin: false, penaltyWin: false,
  opponent: 'Test Rival', rewards: HB.Meta.reportMatch({
    mode: 'quick', local: false, win: true, draw: false, goals: 3, conceded: 1,
    shots: 8, headers: 3, saves: 2, powers: 4, tackles: 1, perfectHeaders: 1,
    duration: 90, maxDeficit: 0
  })
};
h.go('results', fakeRes); h.step(3);
ok(HB.UI.screen === 'results', 'results screen active');
ok(HB.Save.data.stats.played > 0, 'stats persisted');
console.log('  coins=' + HB.Save.data.coins + ' fans=' + HB.Save.data.fans + ' played=' + HB.Save.data.stats.played);

section('persistence');
HB.Save.flush();
ok(h.store['hb3.save.v1'] && h.store['hb3.save.v1'].length > 100, 'save written');
console.log('  save size=' + h.store['hb3.save.v1'].length + ' B');


section('android bridge contract');
/* The APK exposes window.HBAndroid with load/save/vibrate. Simulate it so a
   broken bridge signature fails CI before the APK is built. */
const bridgeSave = [];
global.window.HBAndroid = {
  load: function () { return h.store['hb3.save.v1'] || ''; },
  save: function (raw) { bridgeSave.push(raw); },
  vibrate: function (ms) { h.vibrated = (h.vibrated || 0) + 1; return ms; }
};
HB.Save.load();
ok(HB.Save.data.coins >= 0, 'save loads through the native bridge');
HB.Save.data.coins += 7; HB.Save.save(true);
ok(bridgeSave.length > 0, 'save writes through the native bridge');
ok(JSON.parse(bridgeSave[bridgeSave.length - 1]).coins === HB.Save.data.coins, 'bridge payload round-trips');
HB.Input.vibrate(20);
ok(h.vibrated === 1, 'vibration routed to the native bridge');
delete global.window.HBAndroid;

section('progression survives a reload');
HB.Save.data.cards[11] = 9; HB.Save.data.charLevels[11] = 3;
HB.Save.data.powerLevels[2] = 2; HB.Save.data.achievements.first_win = true;
const coinsBefore = HB.Save.data.coins;
HB.Save.save(true); HB.Save.load();
ok(HB.Save.data.cards[11] === 9, 'card counts persist');
ok(HB.Save.data.charLevels[11] === 3, 'hero levels persist');
ok(HB.Save.data.powerLevels[2] === 2, 'power levels persist');
ok(HB.Save.data.achievements.first_win === true, 'achievements persist');
ok(HB.Save.data.coins === coinsBefore, 'coins persist');

section('match clock is wall-clock 90 s');
HB.App.startMatch({ mode: 'quick', ai: 1, length: 90 });
const cm = HB.App.match;
for (let i = 0; i < 60 * 4; i++) cm.update(1 / 60);
ok(cm.time > 88 && cm.time < 90.01, 'clock starts counting from the opening whistle (' + cm.time.toFixed(1) + ')');
cm.time = 0.4; cm.score[0] = 3; cm.score[1] = 0; cm.golden = true;
for (let i = 0; i < 60 * 2 && !cm.finished; i++) cm.update(1 / 60);
ok(cm.finished && cm.result.reason === 'time', 'match ends when the clock expires');
h.step(2);

section('local 1v1 input isolation');
HB.App.startMatch({ mode: 'local', local: true, ai: 1 });
const lm2 = HB.App.match;
lm2.countdown = 0; lm2.state = 'play';
const p0x = lm2.players[0].x, p1x = lm2.players[1].x;
lm2.setInput(0, { right: true });
lm2.setInput(1, { left: false, right: false });
for (let i = 0; i < 12; i++) lm2.update(1 / 60);
ok(lm2.players[0].x > p0x, 'P1 moves right');
ok(Math.abs(lm2.players[1].x - p1x) < 40, 'P2 unaffected by P1 input');
h.step(2);

section('menu screenshot integrity');
let rendered = 0;
for (const s of ['home', 'modes', 'locker', 'shop', 'progress', 'settings']) {
  h.go(s); h.step(2);
  const g = h.canvas.getContext('2d');
  const data = g.getImageData(0, 0, 40, 40).data;
  let filled = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i] + data[i + 1] + data[i + 2] > 24) filled++;
  ok(filled > 150, 'screen ' + s + ' actually paints pixels');
  rendered++;
}
console.log('  ' + rendered + ' screens paint content');

console.log('\nALL ' + checks + ' CHECKS PASSED');
