/* Long-run soak test: plays complete matches across every AI tier, resolves
 * penalty duels to sudden death, visits every results screen and checks that a
 * save survives a reload. Slower than `npm run smoke`; run before releases.
 *
 *   npm run soak
 */
'use strict';
const { createHarness } = require('./harness');

const h = createHarness(1280, 720);
const HB = h.HB;
h.step(2);

let matches = 0, goals = 0, maxParticles = 0;
const started = Date.now();

console.log('--- full matches, one per AI tier ---');
for (let tier = 0; tier < 5; tier++) {
  HB.App.startMatch({ mode: 'quick', ai: tier, length: 90 });
  const m = HB.App.match;
  m.countdown = 0;
  let frames = 0;
  while (!m.finished && frames < 60 * 150) {
    m.setInput(0, {
      left: Math.sin(frames / 40) > 0.6,
      right: Math.sin(frames / 40) < -0.6,
      jump: frames % 53 === 0,
      kick: frames % 31 < 3,
      lob: frames % 71 < 2,
      dash: frames % 97 === 0
    });
    if (frames % 240 === 0) m.pressPower(0, frames % 3);
    m.update(1 / 60);
    maxParticles = Math.max(maxParticles, m.particles.length);
    frames++;
    if (!isFinite(m.ball.x) || !isFinite(m.players[0].y) || !isFinite(m.players[1].x))
      throw new Error('NaN in physics at frame ' + frames + ' (ai ' + tier + ')');
  }
  if (!m.finished) throw new Error('match ' + tier + ' never finished (' + m.state + ', t=' + m.time + ')');
  const wall = frames / 60;
  if (wall < 88 || wall > 104)
    throw new Error('90 s match took ' + wall.toFixed(1) + ' s of simulated time (ai ' + tier + ')');
  goals += m.score[0] + m.score[1];
  matches++;
  console.log('  ai=' + tier + '  ' + m.score.join(':') + '  ended at ' + wall.toFixed(1) + ' s  (' + m.result.reason + ')');
}

console.log('--- penalty duels to sudden death ---');
for (let run = 0; run < 6; run++) {
  HB.App.startPenalty({ ai: run % 5 });
  const p = HB.App.match;
  let f = 0;
  while (p.phase !== 'end' && f < 60 * 400) {
    p.setInput(0, { kick: f % 37 === 0, left: f % 61 < 6, right: f % 71 < 5, up: f % 83 < 4, down: false });
    p.update(1 / 60);
    f++;
  }
  if (p.phase !== 'end') throw new Error('penalty never resolved: ' + p.phase + ' ' + p.attempts.join(':'));
  if (p.attempts[0] !== p.attempts[1]) throw new Error('penalty attempts out of sync: ' + p.attempts.join(':'));
  console.log('  ' + p.score.join(':') + '  attempts ' + p.attempts.join(':') + '  ' + (f / 60).toFixed(0) + ' s');
}

console.log('--- results screen in every mode ---');
for (const mode of ['quick', 'league', 'tournament', 'penalty', 'practice', 'online', 'local']) {
  const rewards = HB.Meta.reportMatch({
    mode, local: false, win: true, draw: false, goals: 2, conceded: 0,
    shots: 4, headers: 1, saves: 0, powers: 2, tackles: 0, perfectHeaders: 0,
    duration: 90, maxDeficit: 0
  });
  h.go('results', {
    mode, local: mode === 'local', win: true, draw: false, score: [2, 0], goals: 2, conceded: 0,
    shots: 4, headers: 1, saves: 0, powers: 2, tackles: 0, perfectHeaders: 0,
    duration: 90, maxDeficit: 0, opponent: 'Rival ' + mode, rewards
  });
  h.step(2);
  if (HB.UI.screen !== 'results') throw new Error('results screen failed for ' + mode);
}

console.log('--- save round-trip ---');
HB.Save.data.cards[3] = 7;
HB.Save.data.charLevels[3] = 2;
HB.Save.data.achievements.soak = true;
HB.Save.save(true);
const before = JSON.stringify(HB.Save.data);
HB.Save.load();
if (JSON.stringify(HB.Save.data) !== before) throw new Error('save round-trip mismatch');
if (h.errors.length) throw new Error('runtime errors during soak: ' + h.errors[0]);

console.log('\nSOAK OK  matches=' + matches + '  goals=' + goals +
  '  maxParticles=' + maxParticles +
  '  coins=' + HB.Save.data.coins + '  level=' + HB.Save.data.level +
  '  wall=' + ((Date.now() - started) / 1000).toFixed(1) + ' s');
