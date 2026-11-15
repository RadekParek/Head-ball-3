/* Head Ball 3 - static content and progression logic.
 * All characters, gear, powers and stadiums are generated from compact tables,
 * so the whole content catalogue costs a few kilobytes instead of sprite sheets. */
(function (HB) {
  'use strict';
  var U = HB.U, RNG = HB.RNG;
  var Data = HB.Data = {};
  var Save = HB.Save;

  var FIRST = ['Rico', 'Bongo', 'Milo', 'Zara', 'Kiko', 'Nuno', 'Tito', 'Vika', 'Pip', 'Baz',
    'Ludo', 'Momo', 'Fifi', 'Gus', 'Yara', 'Otto', 'Bibi', 'Dax', 'Nia', 'Rolf',
    'Coco', 'Jinx', 'Sami', 'Tula', 'Zeke', 'Nala', 'Ozzy', 'Pia', 'Hugo', 'Kira',
    'Bo', 'Dodo', 'Eko', 'Foxy', 'Gigi', 'Ivo', 'Juno', 'Lux', 'Mox', 'Nix'];
  var LAST = ['Volley', 'Nutmeg', 'Boomer', 'Header', 'Rocket', 'Blitz', 'Flick', 'Curl',
    'Striker', 'Bounce', 'Whistle', 'Chip', 'Crunch', 'Dribble', 'Spinner', 'Thunder',
    'Wobble', 'Swift', 'Pogo', 'Cannon', 'Dash', 'Moustache', 'Noodle', 'Comet', 'Tornado'];
  var NATIONS = ['Sun Isles', 'Nordvik', 'Copa Verde', 'Kobalt', 'Saffronia', 'Gull Bay',
    'Tundra FC', 'Amber Coast', 'Pine Republic', 'Lagoon', 'Marmor', 'Zephyr'];
  var SKIN = ['#f6c9a4', '#e8ac80', '#c98861', '#a56545', '#7a4632', '#f7d9bb', '#dba174', '#955a3d'];
  var HAIR = ['#2b1d18', '#5a341f', '#c07a2c', '#e8c34a', '#a83a35', '#303a52', '#d8d8e0', '#2e8f77', '#8e4fa8', '#e56a9c'];
  var KITS = ['#f0455c', '#3989ff', '#ffce4b', '#22c9a6', '#9167f6', '#ff7a3d', '#46d36b', '#ff6fae', '#3ad9e8', '#1b2f55'];
  var RARITY = [
    { name: 'Common', color: '#8fa6c4', cards: 4, price: 900 },
    { name: 'Rare', color: '#3ad9e8', cards: 8, price: 2200 },
    { name: 'Epic', color: '#9167f6', cards: 16, price: 4800 },
    { name: 'Heroic', color: '#ffce4b', cards: 30, price: 9000 },
    { name: 'Hero', color: '#ff7a3d', cards: 50, price: 16000 }
  ];
  Data.RARITY = RARITY;


  /* ---------------- Football legends ----------------
   * Sixteen real names with hand-drawn cartoon likenesses: haircut, beard,
   * accessory and kit colours, never a photo. Each one has a signature
   * personality in stats and an unlock price that matches their tier.
   * `hair` indexes the style library in art.js, `beard` the facial-hair set,
   * `accent` is a per-character trim colour used by the portrait renderer. */
  var LEGENDS = [
    { name: 'Cristiano Ronaldo', short: 'Ronaldo', nation: 'Portugal', tier: 4, price: 26000,
      skin: '#e8b98d', hair: 9, hairColor: '#241a16', face: 1, beard: 0, kit: '#9c1b34',
      eye: '#6b4a2a',
      hairNote: 'quiff', speed: 95, jump: 99, shot: 98, size: 82 },
    { name: 'Lionel Messi', short: 'Messi', nation: 'Argentina', tier: 4, price: 26000,
      skin: '#e0a97f', hair: 1, hairColor: '#3a2418', face: 2, beard: 2, kit: '#6cb7e8',
      eye: '#4a3524',
      hairNote: 'short', speed: 94, jump: 82, shot: 99, size: 62 },
    { name: 'Neymar Jr', short: 'Neymar', nation: 'Brazil', tier: 4, price: 24000,
      skin: '#c98a5e', hair: 2, hairColor: '#c9973f', face: 1, beard: 1, kit: '#f2c521',
      eye: '#4a3a24',
      hairNote: 'spiky', speed: 96, jump: 88, shot: 92, size: 63 },
    { name: 'Ronaldo Nazario', short: 'R9', nation: 'Brazil', tier: 4, price: 24000,
      skin: '#b3764f', hair: 3, hairColor: '#1f1712', face: 3, beard: 0, kit: '#1f7a4c',
      eye: '#3a2618',
      hairNote: 'shaved-fringe', speed: 93, jump: 86, shot: 99, size: 88 },
    { name: 'Zinedine Zidane', short: 'Zidane', nation: 'France', tier: 4, price: 22000,
      skin: '#e6b78e', hair: 5, hairColor: '#59606b', face: 2, beard: 1, kit: '#1d3f8f',
      eye: '#5a6b4a',
      hairNote: 'bald', speed: 84, jump: 84, shot: 93, size: 92 },
    { name: 'Ronaldinho', short: 'Ronaldinho', nation: 'Brazil', tier: 4, price: 22000,
      skin: '#a8703f', hair: 4, hairColor: '#1b140f', face: 3, beard: 2, kit: '#152c6b',
      eye: '#2a1c14',
      hairNote: 'long', speed: 88, jump: 80, shot: 95, size: 80 },
    { name: 'Kylian Mbappe', short: 'Mbappe', nation: 'France', tier: 3, price: 15000,
      skin: '#8a5535', hair: 6, hairColor: '#141110', face: 0, beard: 0, kit: '#0b2b6b',
      eye: '#241a14',
      hairNote: 'buzz', speed: 99, jump: 92, shot: 91, size: 70 },
    { name: 'Erling Haaland', short: 'Haaland', nation: 'Norway', tier: 3, price: 15000,
      skin: '#f3d0ac', hair: 8, hairColor: '#d8b25c', face: 0, beard: 1, kit: '#6cabdd',
      eye: '#3a5a8a',
      hairNote: 'ponytail', speed: 88, jump: 97, shot: 97, size: 99 },
    { name: 'Kevin De Bruyne', short: 'De Bruyne', nation: 'Belgium', tier: 3, price: 14000,
      skin: '#f1cba4', hair: 7, hairColor: '#b8722a', face: 2, beard: 2, kit: '#c8102e',
      eye: '#3f6b96',
      hairNote: 'side-part', speed: 82, jump: 78, shot: 96, size: 76 },
    { name: 'Mohamed Salah', short: 'Salah', nation: 'Egypt', tier: 3, price: 14000,
      skin: '#c08a5c', hair: 1, hairColor: '#1a1210', face: 1, beard: 4, kit: '#e03131',
      eye: '#2e2015',
      hairNote: 'curly', speed: 94, jump: 84, shot: 90, size: 68 },
    { name: 'Luka Modric', short: 'Modric', nation: 'Croatia', tier: 3, price: 13000,
      skin: '#e3b18b', hair: 8, hairColor: '#c8a05c', face: 2, beard: 0, kit: '#f2f4f8',
      eye: '#4a6b8a',
      hairNote: 'long', speed: 83, jump: 76, shot: 88, size: 58 },
    { name: 'Robert Lewandowski', short: 'Lewandowski', nation: 'Poland', tier: 2, price: 9000,
      skin: '#eec5a0', hair: 7, hairColor: '#5b4128', face: 0, beard: 2, kit: '#e6e9f0',
      eye: '#3f6b8a',
      hairNote: 'short', speed: 84, jump: 90, shot: 94, size: 84 },
    { name: 'Sergio Ramos', short: 'Ramos', nation: 'Spain', tier: 2, price: 9000,
      skin: '#dda87e', hair: 8, hairColor: '#2a1d16', face: 3, beard: 3, kit: '#f4f6fb',
      eye: '#3a2b1d',
      hairNote: 'long', speed: 80, jump: 88, shot: 82, size: 86 },
    { name: 'Manuel Neuer', short: 'Neuer', nation: 'Germany', tier: 2, price: 8000,
      skin: '#f0c9a4', hair: 6, hairColor: '#4a3524', face: 1, beard: 1, kit: '#1f9c56',
      eye: '#3f6b96',
      hairNote: 'buzz', speed: 76, jump: 94, shot: 74, size: 90 },
    { name: 'Alexia Putellas', short: 'Putellas', nation: 'Spain', tier: 2, price: 8000,
      skin: '#e7b691', hair: 8, hairColor: '#3a231a', face: 2, beard: 0, kit: '#8f2242',
      eye: '#3a2a1c',
      hairNote: 'ponytail', speed: 86, jump: 82, shot: 89, size: 62 },
    { name: 'Marta Vieira', short: 'Marta', nation: 'Brazil', tier: 2, price: 8000,
      skin: '#a8703f', hair: 4, hairColor: '#1c1512', face: 2, beard: 0, kit: '#f2c521',
      eye: '#2e2015',
      hairNote: 'long', speed: 90, jump: 84, shot: 93, size: 60 }
  ];
  Data.legends = LEGENDS;
  Data.legend = function (id) { return LEGENDS[id - 1000] || null; };

  /* 125 original characters, deterministic so unlock order never shifts. */
  (function buildCharacters() {
    var r = RNG('hb3-characters-v1'), list = [], used = {};
    for (var i = 0; i < 125; i++) {
      var name;
      do { name = r.pick(FIRST) + ' ' + r.pick(LAST); } while (used[name]);
      used[name] = 1;
      var tier = i < 6 ? 4 : i < 18 ? 3 : i < 42 ? 2 : i < 76 ? 1 : 0;
      var base = 38 + tier * 9;
      list.push({
        id: i, name: name, tier: tier, nation: r.pick(NATIONS),
        skin: r.pick(SKIN), hair: r.int(0, 9), hairColor: r.pick(HAIR),
        kit: r.pick(KITS), face: r.int(0, 3), beard: r.int(0, 4),
        speed: U.clamp(base + r.int(-7, 15), 25, 99),
        jump: U.clamp(base + r.int(-7, 15), 25, 99),
        shot: U.clamp(base + r.int(-7, 15), 25, 99),
        size: U.clamp(base + r.int(-7, 15), 25, 99),
        fans: tier === 4 ? 12000 + (5 - i) * 1500 : tier * 2200,
        price: RARITY[tier].price
      });
    }
    /* legends go on the end with fixed ids so saved unlocks stay valid */
    LEGENDS.forEach(function (L, k) {
      list.push({
        id: 1000 + k, name: L.name, shortName: L.short, tier: L.tier, nation: L.nation,
        skin: L.skin, hair: L.hair, hairColor: L.hairColor, kit: L.kit,
        face: L.face, beard: L.beard, legend: true, hairNote: L.hairNote,
        speed: L.speed, jump: L.jump, shot: L.shot, size: L.size,
        fans: 40000 + (5 - k) * 6500, price: L.price
      });
    });
    Data.characters = list;
  })();

  Data.randomName = function () { return U.pick(FIRST) + ' ' + U.pick(LAST); };
  Data.character = function (id) {
    if (id >= 1000) return Data.characters[id - 1000 + 125] || Data.characters[0];
    return Data.characters[id] || Data.characters[0];
  };
  Data.rarity = function (c) { return RARITY[c.tier]; };

  /* ---------------- Gear ---------------- */
  /* Gear icons are drawn on dark panels, so the darkest kit is excluded and a
     bright tier accent is used instead - an icon must never vanish. */
  var GEAR_KITS = ['#ff6f6f', '#5aa2ff', '#ffd75e', '#2fe0b6', '#a97cff', '#ff8f52',
    '#5ee07f', '#ff86c2', '#4ce8f2', '#7fd0ff'];
  var GEAR_STYLES = ['cap', 'beanie', 'crown', 'headband', 'visor', 'chef', 'halo', 'straw',
    'shades', 'round', 'monocle', 'sports', 'threeD', 'star',
    'stripes', 'plain', 'hoops', 'sash', 'retro', 'galaxy',
    'classic', 'neon', 'cleats', 'golden', 'rocket', 'rainbow',
    'classicball', 'hexball', 'fireball', 'planet', 'crystalball'];
  (function buildGear() {
    var slots = [
      { key: 'hat', label: 'Headwear', styles: 8, names: ['Cap', 'Beanie', 'Crown', 'Headband', 'Visor', 'Chef Hat', 'Halo', 'Straw Hat'] },
      { key: 'glasses', label: 'Eyewear', styles: 6, names: ['Shades', 'Round Specs', 'Monocle', 'Sport Visor', '3D Glasses', 'Star Specs'] },
      { key: 'jersey', label: 'Jersey', styles: 6, names: ['Stripes', 'Plain', 'Hoops', 'Sash', 'Retro', 'Galaxy'] },
      { key: 'boots', label: 'Boots', styles: 6, names: ['Classic', 'Neon', 'Cleats', 'Golden', 'Rocket', 'Rainbow'] },
      { key: 'ball', label: 'Ball', styles: 5, names: ['Classic', 'Hex', 'Fire', 'Planet', 'Crystal'] }
    ];
    var r = RNG('hb3-gear-v1'), list = [], id = 0;
    slots.forEach(function (slot, si) {
      for (var j = 0; j < slot.styles; j++) {
        var tier = j >= slot.styles - 2 ? 2 : j >= 3 ? 1 : 0;
        var bonus = {};
        var key = ['speed', 'jump', 'shot', 'size'][(si + j) % 4];
        bonus[key] = 2 + tier * 2 + r.int(0, 2);
        if (tier === 2) { var k2 = ['speed', 'jump', 'shot', 'size'][(si + j + 2) % 4]; bonus[k2] = 2 + r.int(0, 2); }
        list.push({
          id: id++, slot: slot.key, slotLabel: slot.label, name: slot.names[j], style: GEAR_STYLES[id - 1],
          tier: tier, color: r.pick(GEAR_KITS), bonus: bonus,
          price: 350 + tier * 900 + r.int(0, 300), fans: tier * 1800
        });
      }
    });
    Data.gear = list;
    Data.gearSlots = slots.map(function (s) { return { key: s.key, label: s.label }; });
  })();
  Data.gearItem = function (id) { return id >= 0 && id < Data.gear.length ? Data.gear[id] : null; };

  /* ---------------- Powers ---------------- */
  var POWERS = [
    ['mega_goal', 'Mega Goal', 'The rival goal grows huge.', 'offense', 'goal', 42, 9, '#ffce4b', 0],
    ['rocket', 'Rocket Shot', 'Every strike gets a rocket boost.', 'offense', 'rocket', 38, 10, '#ff7a3d', 0],
    ['freeze', 'Deep Freeze', 'Your rival turns into an ice statue.', 'control', 'snow', 48, 3.2, '#3ad9e8', 0],
    ['giant_ball', 'Giant Ball', 'The ball becomes enormous.', 'chaos', 'ball', 40, 9, '#46d36b', 300],
    ['tiny_ball', 'Tiny Ball', 'The ball shrinks to a pea.', 'chaos', 'target', 40, 9, '#9167f6', 600],
    ['ghost_ball', 'Phantom Ball', 'The ball fades in and out.', 'control', 'eye', 44, 7, '#c9d8ef', 1000],
    ['ghost_player', 'Invisible Hero', 'You vanish from sight.', 'defense', 'ghost', 44, 8, '#8fa6c4', 1500],
    ['shrink', 'Shrink Ray', 'Your rival shrinks down.', 'control', 'arrows', 46, 8, '#ff6fae', 2100],
    ['giant_player', 'Titan', 'Grow into an unstoppable giant.', 'offense', 'up', 50, 9, '#ffce4b', 2800],
    ['turbo', 'Turbo Boots', 'Blistering speed and higher jumps.', 'offense', 'bolt', 42, 9, '#3ad9e8', 3600],
    ['shield', 'Force Field', 'An impenetrable wall guards your goal.', 'defense', 'shield', 52, 7, '#3989ff', 4500],
    ['double_goal', 'Double Points', 'Your next goal counts twice.', 'offense', 'star', 56, 12, '#ffce4b', 5500],
    ['magnet', 'Ball Magnet', 'The ball bends toward your head.', 'control', 'magnet', 44, 8, '#ff6fae', 6800],
    ['ice', 'Ice Rink', 'Your rival loses all traction.', 'control', 'snow', 44, 8, '#3ad9e8', 8200],
    ['scramble', 'Scramble', 'Your rival\'s controls are inverted.', 'control', 'refresh', 50, 7, '#9167f6', 9800],
    ['meteor', 'Meteor Ball', 'A blazing comet that flattens rivals.', 'offense', 'flame', 54, 8, '#ff7a3d', 11600],
    ['slowmo', 'Time Warp', 'The world slows down. You do not.', 'control', 'clock', 58, 6, '#c9d8ef', 13800],
    ['quake', 'Earthquake', 'The pitch shakes and rivals tumble.', 'control', 'quake', 48, 6, '#ff9f2e', 16200],
    ['teleport', 'Teleport', 'Swap places with your rival instantly.', 'chaos', 'swap', 36, 0, '#9167f6', 19000],
    ['boomerang', 'Boomerang', 'The ball curves back to their net.', 'offense', 'loop', 50, 9, '#22c9a6', 22000]
  ];
  Data.powers = POWERS.map(function (p, i) {
    return { id: i, key: p[0], name: p[1], desc: p[2], cat: p[3], icon: p[4], cost: p[5], dur: p[6], color: p[7], fans: p[8] };
  });
  Data.power = function (id) { return Data.powers[id] || Data.powers[0]; };

  /* ---------------- Stadiums ---------------- */
  Data.stadiums = [
    { name: 'Rookie Park', sky: ['#4fb8f0', '#bdeaff'], grass: ['#3fa64f', '#2c8441'], stand: '#2b477a', accent: '#ffce4b', weather: 'clear', crowd: 0.55, fans: 0, ad: 'PLAY BALL' },
    { name: 'Sunset Arena', sky: ['#ff8a5c', '#ffd49b'], grass: ['#48a957', '#2f8742'], stand: '#6b3f6e', accent: '#ffce4b', weather: 'sunset', crowd: 0.7, fans: 400, ad: 'GO FOR GOLD' },
    { name: 'Harbour Ground', sky: ['#3f8fd6', '#a9dcf5'], grass: ['#3da353', '#26803c'], stand: '#17496b', accent: '#3ad9e8', weather: 'wind', crowd: 0.8, fans: 1200, ad: 'SAIL TO VICTORY' },
    { name: 'Neon Stadium', sky: ['#161c48', '#3b2a78'], grass: ['#2c7c5c', '#185d48'], stand: '#221a52', accent: '#ff6fae', weather: 'night', crowd: 0.9, fans: 2600, ad: 'LIGHT IT UP' },
    { name: 'Frost Field', sky: ['#9cc9e8', '#e2f4ff'], grass: ['#67a9a0', '#3e8a86'], stand: '#294a63', accent: '#ffffff', weather: 'snow', crowd: 0.85, fans: 4600, ad: 'STAY COOL' },
    { name: 'Desert Dome', sky: ['#f6a45b', '#ffe3a8'], grass: ['#c2a855', '#9d8740'], stand: '#8a4b2f', accent: '#ff7a3d', weather: 'dust', crowd: 0.9, fans: 7200, ad: 'HEAT OF THE GAME' },
    { name: 'Rainforest Cup', sky: ['#2f9e8f', '#8ed9b6'], grass: ['#3f9b4d', '#237237'], stand: '#1d5a4b', accent: '#46d36b', weather: 'rain', crowd: 0.95, fans: 10200, ad: 'NATURE STRIKES' },
    { name: 'Volcano Yard', sky: ['#4a2140', '#c04a3e'], grass: ['#4a5b46', '#2e3a2e'], stand: '#3a1e2d', accent: '#ff5b3d', weather: 'embers', crowd: 1, fans: 14000, ad: 'ERUPTION' },
    { name: 'Cloud Nine', sky: ['#8ab6f7', '#e8f2ff'], grass: ['#5fb98e', '#3a9170'], stand: '#3f5f9e', accent: '#ffffff', weather: 'clear', crowd: 1, fans: 18500, ad: 'ABOVE THE REST' },
    { name: 'Galactic Final', sky: ['#100d33', '#4a2a86'], grass: ['#3a3f8c', '#222663'], stand: '#16143d', accent: '#ffce4b', weather: 'night', crowd: 1, fans: 24000, ad: 'CHAMPIONS' }
  ];

  Data.leagues = [
    { name: 'Bronze', color: '#c98a55', ai: 0 },
    { name: 'Silver', color: '#b9c6d6', ai: 1 },
    { name: 'Gold', color: '#ffce4b', ai: 2 },
    { name: 'Platinum', color: '#3ad9e8', ai: 3 },
    { name: 'Diamond', color: '#9167f6', ai: 4 }
  ];
  Data.DIFFICULTIES = [
    { name: 'Rookie', ai: 0, color: '#46d36b' },
    { name: 'Amateur', ai: 1, color: '#3ad9e8' },
    { name: 'Pro', ai: 2, color: '#ffce4b' },
    { name: 'Veteran', ai: 3, color: '#ff7a3d' },
    { name: 'Legend', ai: 4, color: '#f0455c' }
  ];

  /* ---------------- Missions / achievements / career ---------------- */
  Data.missionTemplates = [
    { id: 'win', text: 'Win 2 matches', metric: 'wins', goal: 2, coins: 320, xp: 60 },
    { id: 'goals', text: 'Score 5 goals', metric: 'goals', goal: 5, coins: 300, xp: 55 },
    { id: 'shots', text: 'Take 12 shots', metric: 'shots', goal: 12, coins: 260, xp: 45 },
    { id: 'headers', text: 'Land 4 headers', metric: 'headers', goal: 4, coins: 280, xp: 50 },
    { id: 'powers', text: 'Use 4 superpowers', metric: 'powers', goal: 4, coins: 300, xp: 55 },
    { id: 'saves', text: 'Make 5 saves', metric: 'saves', goal: 5, coins: 260, xp: 45 },
    { id: 'tackles', text: 'Win 4 tackles', metric: 'tackles', goal: 4, coins: 240, xp: 40 },
    { id: 'play', text: 'Play 3 matches', metric: 'played', goal: 3, coins: 340, xp: 60 },
    { id: 'perfect', text: 'Hit 2 perfect headers', metric: 'perfectHeaders', goal: 2, coins: 400, xp: 70 }
  ];
  Data.achievements = [
    { id: 'first_win', name: 'First Blood', desc: 'Win your first match', coins: 200, gems: 3, check: function (s) { return s.stats.wins >= 1; } },
    { id: 'hat_trick', name: 'Hat Trick', desc: 'Score 3 goals in one match', coins: 500, gems: 5, check: function (s) { return s.stats.bestMatchGoals >= 3; } },
    { id: 'ten_goals', name: 'Sniper', desc: 'Score 10 career goals', coins: 350, gems: 4, check: function (s) { return s.stats.goals >= 10; } },
    { id: 'fifty_goals', name: 'Goal Machine', desc: 'Score 50 career goals', coins: 900, gems: 10, check: function (s) { return s.stats.goals >= 50; } },
    { id: 'streak5', name: 'On Fire', desc: 'Win 5 matches in a row', coins: 700, gems: 8, check: function (s) { return s.stats.bestStreak >= 5; } },
    { id: 'powers25', name: 'Show Off', desc: 'Use 25 superpowers', coins: 500, gems: 5, check: function (s) { return s.stats.powers >= 25; } },
    { id: 'headers20', name: 'Air Traffic', desc: 'Land 20 headers', coins: 450, gems: 5, check: function (s) { return s.stats.headers >= 20; } },
    { id: 'perfect10', name: 'Sweet Spot', desc: 'Hit 10 perfect headers', coins: 650, gems: 7, check: function (s) { return s.stats.perfectHeaders >= 10; } },
    { id: 'fans5000', name: 'Fan Favourite', desc: 'Reach 5 000 fans', coins: 800, gems: 8, check: function (s) { return s.fans >= 5000; } },
    { id: 'level10', name: 'Veteran', desc: 'Reach level 10', coins: 700, gems: 8, check: function (s) { return s.level >= 10; } },
    { id: 'tournament', name: 'Cup Winner', desc: 'Win a tournament', coins: 1200, gems: 15, check: function (s) { return s.stats.tournaments >= 1; } },
    { id: 'penalty', name: 'Nerve of Steel', desc: 'Win a penalty duel', coins: 700, gems: 8, check: function (s) { return s.stats.penaltyWins >= 1; } },
    { id: 'chars10', name: 'Collector', desc: 'Unlock 10 characters', coins: 600, gems: 6, check: function (s) { return s.unlockedChars.length >= 10; } },
    { id: 'gear10', name: 'Fashionista', desc: 'Own 10 gear items', coins: 600, gems: 6, check: function (s) { return s.ownedGear.length >= 10; } },
    { id: 'stadium5', name: 'World Tour', desc: 'Unlock 5 stadiums', coins: 900, gems: 9, check: function (s) { return s.unlockedStadiums.length >= 5; } },
    { id: 'local', name: 'Couch Derby', desc: 'Play a local 1v1 match', coins: 300, gems: 3, check: function (s) { return s.stats.localMatches >= 1; } },
    { id: 'clean_sheet', name: 'Clean Sheet', desc: 'Win without conceding', coins: 550, gems: 6, check: function (s) { return s.stats.cleanSheets >= 1; } },
    { id: 'comeback', name: 'Comeback Kid', desc: 'Win after trailing by 2', coins: 900, gems: 10, check: function (s) { return s.stats.comebacks >= 1; } },
    { id: 'hundred', name: 'Centurion', desc: 'Play 100 matches', coins: 1500, gems: 20, check: function (s) { return s.stats.played >= 100; } },
    { id: 'diamond', name: 'Diamond Hands', desc: 'Reach the Diamond league', coins: 2000, gems: 25, check: function (s) { return s.league >= 4; } }
  ];
  Data.career = [
    { id: 'c1', name: 'First Steps', desc: 'Play 3 matches', metric: 'played', goal: 3, coins: 200, xp: 40 },
    { id: 'c2', name: 'Getting Sharp', desc: 'Score 10 goals', metric: 'goals', goal: 10, coins: 350, xp: 70 },
    { id: 'c3', name: 'Crowd Pleaser', desc: 'Reach 1 000 fans', metric: 'fans', goal: 1000, coins: 500, xp: 100 },
    { id: 'c4', name: 'Aerial Threat', desc: 'Land 15 headers', metric: 'headers', goal: 15, coins: 500, xp: 100 },
    { id: 'c5', name: 'Power User', desc: 'Use 20 superpowers', metric: 'powers', goal: 20, coins: 600, xp: 120 },
    { id: 'c6', name: 'Wall', desc: 'Make 20 saves', metric: 'saves', goal: 20, coins: 600, xp: 120 },
    { id: 'c7', name: 'Serial Winner', desc: 'Win 20 matches', metric: 'wins', goal: 20, coins: 900, xp: 180 },
    { id: 'c8', name: 'Stadium Builder', desc: 'Reach 8 000 fans', metric: 'fans', goal: 8000, coins: 1200, xp: 240 },
    { id: 'c9', name: 'Collector', desc: 'Unlock 25 characters', metric: 'chars', goal: 25, coins: 1400, xp: 260 },
    { id: 'c10', name: 'League Legend', desc: 'Reach the Platinum league', metric: 'league', goal: 3, coins: 1800, xp: 320 },
    { id: 'c11', name: 'Marathon', desc: 'Play 60 matches', metric: 'played', goal: 60, coins: 2200, xp: 400 },
    { id: 'c12', name: 'Hall of Fame', desc: 'Reach 25 000 fans', metric: 'fans', goal: 25000, coins: 4000, xp: 700 }
  ];
  Data.season = [
    { xp: 100, name: 'Coin Pouch', coins: 250, gems: 0 },
    { xp: 300, name: 'Card Pack', coins: 0, gems: 3 },
    { xp: 600, name: 'Coin Stack', coins: 600, gems: 0 },
    { xp: 1000, name: 'Power Shard', coins: 0, gems: 6 },
    { xp: 1500, name: 'Golden Boots', coins: 1200, gems: 0 },
    { xp: 2200, name: 'Gem Vault', coins: 0, gems: 12 },
    { xp: 3000, name: 'Legendary Pack', coins: 2000, gems: 0 },
    { xp: 4200, name: 'Star Trophy', coins: 3000, gems: 10 },
    { xp: 5800, name: 'Hero Card', coins: 4000, gems: 15 },
    { xp: 8000, name: 'Champion Chest', coins: 8000, gems: 30 }
  ];
  Data.packs = [
    { id: 'basic', name: 'Rookie Pack', price: 300, cards: 3, rare: 0.08, color: '#3989ff' },
    { id: 'silver', name: 'Silver Pack', price: 900, cards: 5, rare: 0.22, color: '#b9c6d6' },
    { id: 'gold', name: 'Gold Pack', price: 2000, cards: 7, rare: 0.42, color: '#ffce4b' },
    { id: 'legend', name: 'Legend Pack', price: 4200, cards: 10, rare: 0.7, color: '#9167f6' }
  ];

  /* ---------------- Effective stats ---------------- */
  var Meta = HB.Meta = {};
  Meta.charLevel = function (id) { return Save.data.charLevels[id] || 1; };
  Meta.charCap = function (c) { return c.tier >= 4 ? 50 : c.tier >= 3 ? 40 : 30; };
  Meta.gearBonuses = function () {
    var out = { speed: 0, jump: 0, shot: 0, size: 0 };
    var g = Save.data.gear;
    for (var k in g) if (Object.prototype.hasOwnProperty.call(g, k)) {
      var it = Data.gearItem(g[k]);
      if (it) for (var b in it.bonus) if (Object.prototype.hasOwnProperty.call(it.bonus, b)) out[b] += it.bonus[b];
    }
    return out;
  };
  Meta.charStats = function (id) {
    var c = Data.character(id), lvl = Meta.charLevel(id), g = Meta.gearBonuses();
    var bonus = (lvl - 1) * 0.85;
    return {
      speed: U.clamp(c.speed + bonus + g.speed, 20, 130),
      jump: U.clamp(c.jump + bonus + g.jump, 20, 130),
      shot: U.clamp(c.shot + bonus + g.shot, 20, 130),
      size: U.clamp(c.size + bonus + g.size, 20, 130),
      raw: c
    };
  };
  Meta.charUpgradeCost = function (id) {
    var c = Data.character(id), l = Meta.charLevel(id);
    return { coins: Math.round(160 + l * 95 + c.tier * 90), cards: 2 + Math.floor(l / 3) + c.tier };
  };
  Meta.upgradeChar = function (id) {
    var l = Meta.charLevel(id), c = Data.character(id);
    if (l >= Meta.charCap(c)) return { ok: false, msg: 'Max level reached' };
    var cost = Meta.charUpgradeCost(id);
    if (Save.data.coins < cost.coins) return { ok: false, msg: 'Not enough coins' };
    var need = cost.cards, have = Save.data.cards[id] || 0;
    if (have < need) return { ok: false, msg: 'Need ' + (need - have) + ' more cards' };
    Save.data.coins -= cost.coins;
    Save.data.cards[id] = have - need;
    Save.data.charLevels[id] = l + 1;
    Save.save(true);
    return { ok: true, msg: c.name + ' is now level ' + (l + 1) };
  };
  Meta.unlockChar = function (id) {
    var c = Data.character(id), s = Save.data;
    if (s.unlockedChars.indexOf(id) >= 0) return { ok: false, msg: 'Already unlocked' };
    var cards = s.cards[id] || 0, need = Data.rarity(c).cards;
    if (cards >= need) { s.cards[id] = cards - need; }
    else if (s.coins >= c.price) { s.coins -= c.price; }
    else return { ok: false, msg: 'Need ' + c.price + ' coins or ' + need + ' cards' };
    s.unlockedChars.push(id);
    Save.save(true);
    return { ok: true, msg: c.name + ' joined your squad!' };
  };
  Meta.powerLevel = function (id) { return Save.data.powerLevels[id] || 1; };
  Meta.powerCap = 5;
  Meta.powerCost = function (id) { var l = Meta.powerLevel(id); return Math.round(320 + l * 260 + Data.power(id).fans / 40); };
  Meta.powerDuration = function (id) { var p = Data.power(id); return p.dur * (1 + (Meta.powerLevel(id) - 1) * 0.18); };
  Meta.powerUnlocked = function (id) { return Save.data.unlockedPowers.indexOf(id) >= 0; };
  Meta.unlockPower = function (id) {
    var p = Data.power(id), s = Save.data;
    if (Meta.powerUnlocked(id)) return { ok: false, msg: 'Already unlocked' };
    if (s.fans >= p.fans) { s.unlockedPowers.push(id); Save.save(true); return { ok: true, msg: p.name + ' unlocked!' }; }
    var cost = Math.round(600 + p.fans / 3);
    if (s.coins < cost) return { ok: false, msg: 'Reach ' + U.fmtNum(p.fans) + ' fans or pay ' + U.fmtNum(cost) + ' coins' };
    s.coins -= cost; s.unlockedPowers.push(id); Save.save(true);
    return { ok: true, msg: p.name + ' unlocked!' };
  };
  Meta.upgradePower = function (id) {
    var l = Meta.powerLevel(id);
    if (l >= Meta.powerCap) return { ok: false, msg: 'Max level reached' };
    if (!Meta.powerUnlocked(id)) return { ok: false, msg: 'Unlock it first' };
    var cost = Meta.powerCost(id);
    if (Save.data.coins < cost) return { ok: false, msg: 'Not enough coins' };
    Save.data.coins -= cost; Save.data.powerLevels[id] = l + 1; Save.save(true);
    return { ok: true, msg: Data.power(id).name + ' level ' + (l + 1) };
  };
  Meta.equipPower = function (slot, id) {
    var eq = Save.data.powersEquipped, other = eq.indexOf(id);
    if (other >= 0) { var tmp = eq[slot]; eq[slot] = id; eq[other] = tmp; }
    else eq[slot] = id;
    Save.save(true);
  };
  Meta.equippedPowers = function () { return Save.data.powersEquipped.slice(); };
  Meta.stadium = function () { return Data.stadiums[Save.data.stadium] || Data.stadiums[0]; };
  Meta.unlockStadium = function (i) {
    var s = Data.stadiums[i];
    if (Save.data.unlockedStadiums.indexOf(i) >= 0) { Save.data.stadium = i; Save.save(true); return { ok: true, msg: 'Playing at ' + s.name }; }
    if (Save.data.fans < s.fans) return { ok: false, msg: 'Need ' + U.fmtNum(s.fans) + ' fans' };
    Save.data.unlockedStadiums.push(i); Save.data.stadium = i; Save.save(true);
    return { ok: true, msg: s.name + ' unlocked!' };
  };
  Meta.buyGear = function (id) {
    var it = Data.gearItem(id), s = Save.data;
    if (!it) return { ok: false, msg: 'Unknown item' };
    if (s.ownedGear.indexOf(id) >= 0) return { ok: false, msg: 'Already owned' };
    if (s.coins < it.price) return { ok: false, msg: 'Not enough coins' };
    s.coins -= it.price; s.ownedGear.push(id); s.gear[it.slot] = id; Save.save(true);
    return { ok: true, msg: it.name + ' equipped!' };
  };
  Meta.equipGear = function (id) {
    var it = Data.gearItem(id), s = Save.data;
    if (!it) return;
    if (s.ownedGear.indexOf(id) < 0) return Meta.buyGear(id);
    s.gear[it.slot] = s.gear[it.slot] === id ? -1 : id;
    Save.save(true);
  };
  Meta.spend = function (n) {
    if (Save.data.coins < n) return false;
    Save.data.coins -= n; Save.save(true); return true;
  };

  /* ---------------- Daily missions, rewards, season ---------------- */
  Meta.today = function () {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  };
  Meta.refreshDaily = function () {
    var s = Save.data, today = Meta.today();
    if (s.missions.date !== today) {
      var r = RNG('missions-' + today);
      var ids = r.shuffle(Data.missionTemplates.map(function (m) { return m.id; })).slice(0, 3);
      s.missions = { date: today, ids: ids, progress: [0, 0, 0], claimed: [false, false, false] };
    }
    if (s.daily.date !== today) {
      var prev = new Date(); prev.setDate(prev.getDate() - 1);
      var y = prev.getFullYear() + '-' + (prev.getMonth() + 1) + '-' + prev.getDate();
      s.daily.streak = s.daily.date === y ? Math.min(s.daily.streak + 1, 7) : 1;
      s.daily.date = today;
    }
    Save.save();
  };
  Meta.mission = function (i) {
    var id = Save.data.missions.ids[i];
    return Data.missionTemplates.filter(function (m) { return m.id === id; })[0] || Data.missionTemplates[0];
  };
  Meta.claimMission = function (i) {
    var s = Save.data, m = Meta.mission(i);
    if (s.missions.claimed[i]) return { ok: false, msg: 'Already claimed' };
    if (s.missions.progress[i] < m.goal) return { ok: false, msg: 'Mission not finished' };
    s.missions.claimed[i] = true;
    s.coins += m.coins; Meta.addXp(m.xp); Save.save(true);
    return { ok: true, msg: '+' + m.coins + ' coins, +' + m.xp + ' XP' };
  };
  Meta.claimDaily = function () {
    var s = Save.data, day = s.daily.streak || 1;
    var coins = 100 + day * 60, gems = day >= 7 ? 5 : day >= 3 ? 2 : 0;
    s.coins += coins; s.gems += gems; Save.save(true);
    return { ok: true, coins: coins, gems: gems, day: day };
  };
  Meta.addXp = function (n) {
    var s = Save.data;
    s.xp += n; s.seasonXp += n;
    while (s.xp >= Meta.xpForLevel(s.level + 1)) s.level++;
    Save.save();
  };
  Meta.xpForLevel = function (l) { return Math.round(120 * Math.pow(l - 1, 1.55)); };
  Meta.xpProgress = function () {
    var s = Save.data, a = Meta.xpForLevel(s.level), b = Meta.xpForLevel(s.level + 1);
    return { cur: s.xp - a, max: Math.max(1, b - a), t: U.clamp((s.xp - a) / Math.max(1, b - a), 0, 1) };
  };
  Meta.careerValue = function (m) {
    var s = Save.data;
    if (m.metric === 'fans') return s.fans;
    if (m.metric === 'chars') return s.unlockedChars.length;
    if (m.metric === 'league') return s.league;
    return s.stats[m.metric] || 0;
  };
  Meta.claimCareer = function (m) {
    var s = Save.data;
    if (s.careerClaimed.indexOf(m.id) >= 0) return { ok: false, msg: 'Already claimed' };
    if (Meta.careerValue(m) < m.goal) return { ok: false, msg: 'Not there yet' };
    s.careerClaimed.push(m.id); s.coins += m.coins; Meta.addXp(m.xp); Save.save(true);
    return { ok: true, msg: '+' + m.coins + ' coins, +' + m.xp + ' XP' };
  };
  Meta.claimSeason = function (i) {
    var t = Data.season[i], s = Save.data;
    if (s.seasonClaimed.indexOf(i) >= 0) return { ok: false, msg: 'Already claimed' };
    if (s.seasonXp < t.xp) return { ok: false, msg: 'Keep playing' };
    s.seasonClaimed.push(i); s.coins += t.coins; s.gems += t.gems; Save.save(true);
    return { ok: true, msg: t.name + ' claimed!' };
  };
  Meta.refreshAchievements = function () {
    var s = Save.data, out = [];
    Data.achievements.forEach(function (a) {
      if (!s.achievements[a.id] && a.check(s)) {
        s.achievements[a.id] = true; s.coins += a.coins; s.gems += a.gems;
        out.push(a);
      }
    });
    if (out.length) Save.save(true);
    return out;
  };
  Meta.refreshUnlocks = function () {
    var s = Save.data, out = [];
    Data.powers.forEach(function (p) {
      if (p.fans > 0 && s.fans >= p.fans && s.unlockedPowers.indexOf(p.id) < 0) { s.unlockedPowers.push(p.id); out.push({ type: 'power', name: p.name }); }
    });
    Data.stadiums.forEach(function (st, i) {
      if (st.fans > 0 && s.fans >= st.fans && s.unlockedStadiums.indexOf(i) < 0) { s.unlockedStadiums.push(i); out.push({ type: 'stadium', name: st.name }); }
    });
    Data.characters.forEach(function (c) {
      if (c.fans > 0 && s.fans >= c.fans && s.unlockedChars.indexOf(c.id) < 0) { s.unlockedChars.push(c.id); out.push({ type: 'character', name: c.name }); }
    });
    if (out.length) Save.save(true);
    return out;
  };

  /* ---------------- Packs / scratch ---------------- */
  Meta.randomCard = function (luck) {
    var s = Save.data, pool = Data.characters.filter(function (c) { return c.tier > 0; });
    var tier = Math.random() < luck ? (Math.random() < 0.25 ? 4 : Math.random() < 0.5 ? 3 : 2) : (Math.random() < 0.35 ? 1 : 0);
    var choices = pool.filter(function (c) { return c.tier === tier; });
    if (!choices.length) choices = pool;
    var c = U.pick(choices), amount = tier >= 3 ? 1 : U.randInt(1, 3);
    s.cards[c.id] = (s.cards[c.id] || 0) + amount;
    var owned = s.unlockedChars.indexOf(c.id) >= 0;
    if (!owned && (s.cards[c.id] || 0) >= Data.rarity(c).cards) { s.unlockedChars.push(c.id); }
    return { name: c.name, tier: c.tier, amount: amount, color: Data.rarity(c).color, unlocked: s.unlockedChars.indexOf(c.id) >= 0 && !owned };
  };
  Meta.openPack = function (pack) {
    var s = Save.data;
    if (s.coins < pack.price) return { ok: false, msg: 'Not enough coins' };
    s.coins -= pack.price; s.stats.packs++;
    var cards = [];
    for (var i = 0; i < pack.cards; i++) cards.push(Meta.randomCard(pack.rare));
    if (U.chance(0.25)) s.gems += 2;
    Meta.addXp(20); Meta.refreshAchievements(); Save.save(true);
    return { ok: true, cards: cards, pack: pack };
  };
  Meta.scratch = function () {
    var s = Save.data, price = 250;
    if (s.coins < price) return { ok: false, msg: 'Not enough coins' };
    s.coins -= price;
    var r = Math.random(), reward;
    if (r < 0.06) { reward = { name: 'JACKPOT', coins: 3000, gems: 12 }; }
    else if (r < 0.2) { reward = { name: 'Big Win', coins: 900, gems: 3 }; }
    else if (r < 0.5) { reward = { name: 'Nice!', coins: 400, gems: 0 }; }
    else { reward = { name: 'Small Win', coins: 180, gems: 0 }; }
    s.coins += reward.coins; s.gems += reward.gems; Save.save(true);
    return { ok: true, reward: reward };
  };

  /* ---------------- Match reporting ---------------- */
  Meta.reportMatch = function (res) {
    var s = Save.data, st = s.stats;
    var win = res.win, draw = res.draw, goals = res.goals;
    var coins = Math.round(55 + goals * 14 + (win ? 95 : draw ? 45 : 18) + Math.min(60, s.league * 12));
    var fans = win ? 30 + goals * 6 + s.league * 4 : draw ? 8 : 4;
    var xp = 22 + goals * 7 + (win ? 42 : draw ? 20 : 8);
    var gems = win && U.chance(0.12) ? 2 : 0;
    st.played++; st.goals += goals; st.conceded += res.conceded;
    st.shots += res.shots; st.headers += res.headers; st.saves += res.saves;
    st.powers += res.powers; st.tackles += res.tackles;
    st.perfectHeaders += res.perfectHeaders;
    st.playTime += res.duration;
    st.bestMatchGoals = Math.max(st.bestMatchGoals || 0, goals);
    if (win) { st.wins++; st.streak++; st.bestStreak = Math.max(st.bestStreak, st.streak); }
    else if (draw) { st.draws++; st.streak = 0; }
    else { st.losses++; st.streak = 0; }
    if (res.local) st.localMatches = (st.localMatches || 0) + 1;
    if (win && res.conceded === 0) st.cleanSheets = (st.cleanSheets || 0) + 1;
    if (win && res.maxDeficit >= 2) st.comebacks = (st.comebacks || 0) + 1;
    if (res.tournamentWin) st.tournaments++;
    if (res.penaltyWin) st.penaltyWins++;
    s.coins += coins; s.fans += fans; s.gems += gems;
    Meta.addXp(xp);
    var points = win ? 3 : draw ? 1 : 0;
    if (res.mode === 'league') {
      s.leaguePoints += points;
      while (s.leaguePoints >= 12 && s.league < 4) { s.leaguePoints -= 12; s.bracket++; if (s.bracket >= 15) { s.bracket = 0; s.league++; } }
    } else if (win) s.leaguePoints = Math.min(11, s.leaguePoints + 1);
    /* daily mission progress */
    var metric = {
      wins: win ? 1 : 0, played: 1, goals: goals, shots: res.shots,
      headers: res.headers, saves: res.saves, powers: res.powers,
      tackles: res.tackles, perfectHeaders: res.perfectHeaders
    };
    Meta.refreshDaily();
    for (var i = 0; i < s.missions.ids.length; i++) {
      var m = Meta.mission(i);
      s.missions.progress[i] = Math.min(m.goal, (s.missions.progress[i] || 0) + (metric[m.metric] || 0));
    }
    var unlocked = Meta.refreshUnlocks();
    var achieved = Meta.refreshAchievements();
    Save.save(true);
    return { coins: coins, fans: fans, xp: xp, gems: gems, points: points, unlocked: unlocked, achieved: achieved, win: win, draw: draw };
  };

  /* ---------------- Tournament ---------------- */
  Meta.tournamentStart = function () {
    var s = Save.data, teams = Data.characters.filter(function (c) { return c.id !== s.character; });
    var r = RNG('cup-' + Date.now());
    var bracket = r.shuffle(teams).slice(0, 7).map(function (c) { return { name: c.name, char: c.id, out: false }; });
    bracket.splice(r.int(0, 7), 0, { name: s.name, char: s.character, out: false, you: true });
    s.tournament = { round: 0, bracket: bracket, prize: 0 };
    Save.save(true);
    return s.tournament;
  };
  Meta.tournamentNextOpponent = function () {
    var t = Save.data.tournament;
    if (!t) return null;
    var half = [2, 4, 8][t.round];
    var start = Math.floor(t.bracket.findIndex(function (b) { return b.you; }) / half) * half;
    var you = t.bracket.findIndex(function (b) { return b.you; });
    var candidates = [];
    for (var i = start; i < start + half; i++) if (i !== you && !t.bracket[i].out) candidates.push(t.bracket[i]);
    return candidates[0] || null;
  };
  Meta.tournamentAdvance = function (won) {
    var s = Save.data, t = s.tournament;
    if (!t) return null;
    var half = [2, 4, 8][t.round];
    var you = t.bracket.findIndex(function (b) { return b.you; });
    var start = Math.floor(you / half) * half;
    for (var i = start; i < start + half; i++) if (i !== you) t.bracket[i].out = true;
    if (!won) { t.bracket[you].out = true; t.finished = true; t.won = false; Save.save(true); return t; }
    t.prize += [300, 600, 1400][t.round];
    t.round++;
    if (t.round >= 3) { t.finished = true; t.won = true; s.coins += t.prize + 2500; Meta.addXp(250); }
    else {
      /* simulate the other quarter of the bracket */
      for (var j = 0; j < t.bracket.length; j++) {
        if (j < start || j >= start + half) continue;
      }
      var otherStart = start === 0 ? half : 0;
      for (var k = otherStart; k < otherStart + half; k += 2) if (t.bracket[k + 1]) t.bracket[k + 1].out = true;
    }
    Save.save(true);
    return t;
  };
  Meta.leagueOpponent = function () {
    var s = Save.data, pool = Data.characters.filter(function (c) { return c.id !== s.character; });
    var r = RNG('league-' + s.league + '-' + s.bracket + '-' + s.stats.played);
    return r.pick(pool);
  };
})(window.HB = window.HB || {});
