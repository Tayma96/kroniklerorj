// Öngörü gerçek maaş/riskle uyuşmalı; ekran zar tüketemez, tur kilidi dinlenmeyi de korur.
const assert = require('node:assert/strict'), path = require('node:path'), esbuild = require('esbuild');
const root = path.resolve(__dirname, '../..'), copy = s => JSON.parse(JSON.stringify(s));
(async () => {
  const build = await esbuild.build({ entryPoints: [path.join(root, 'lib/game.ts')], bundle: true, platform: 'node', format: 'cjs', write: false });
  const module = { exports: {} }; new Function('module', 'exports', 'require', build.outputFiles[0].text)(module, module.exports, require); const g = module.exports;
  const base = g.newGame('Emek', 'Ocak', 'kadın'); let cases = 0;
  const rolled = (s, style, roll, failed = false) => {
    const original = Math.random; let n = 0; Math.random = () => n++ === 0 ? (roll + .1) / 6 : failed && n === 2 ? .01 : .99;
    try { return g.work(s, style); } finally { Math.random = original; }
  };
  for (const pr of g.PROFESSIONS) for (const variant of [0,1,2]) for (const ws of g.WORK_STYLES) for (let roll = 0; roll < 6; roll++) {
    const s = copy(base), p = s.player; p.age = p.base_age = 30; p.profession = pr.id; p.tezgah_turn = s.turn;
    p.health = 60; p.hunger = 80; p.money = 500; p.kademe = variant; p.career_xp = variant * 30;
    p.perks = variant === 2 ? ['tefeci','becerikli','usta_eli','basyapit'] : []; p.honor = variant === 1 ? 70 : 0; p.reputation = variant === 2 ? -50 : 0;
    p.faction = variant === 2 ? 'demirci' : null; s.world.inflation = variant === 2 ? 1.63 : 1;
    const raw = JSON.stringify(s), original = Math.random; Math.random = () => { throw Error('Önizleme zar attı'); }; let f;
    try { f = g.workForecast(s, ws.id); } finally { Math.random = original; }
    assert.equal(JSON.stringify(s), raw); assert.equal(f.fail, ws.fail);
    const result = rolled(s, ws.id, roll), earned = result.player.money - p.money;
    assert(earned >= f.min && earned <= f.max, pr.id); assert.equal(result.player.hunger, p.hunger - f.hunger);
    assert.equal(result.player.health, p.health + f.health); assert.equal(result.player.work_turn, s.turn);
    assert.deepEqual(g.work(result, ws.id), result, 'Tek ayda tekrar kazanç/dinlenme olmaz'); cases++;
    if (ws.fail) { const loss = rolled(s, ws.id, roll, true), wage = loss.player.money - p.money;
      assert(wage >= f.lossMin && wage <= f.lossMax); assert.equal(loss.player.health, ws.id === 'hirsli' ? 51 : 60);
      assert.equal(loss.player.reputation, ws.id === 'kaytarici' ? p.reputation - 2 : p.reputation); cases++; }
  }
  for (const health of [99,100]) for (const hunger of [0,2]) {
    const s = copy(base); s.player.age = s.player.base_age = 30; s.player.profession = 'demirci'; s.player.health = health; s.player.hunger = hunger; s.player.tezgah_turn = s.turn;
    const next = rolled(s, 'garantici', 0); assert.equal(next.player.health, 100); assert.equal(next.player.hunger, 0); cases++;
  }
  for (const gate of ['dead','young','jobless','worked']) {
    const s = copy(base); s.player.age = s.player.base_age = 30; s.player.profession = 'demirci';
    if (gate === 'dead') s.player.dead = true; if (gate === 'young') s.player.age = s.player.base_age = 12;
    if (gate === 'jobless') s.player.profession = 'işsiz'; if (gate === 'worked') s.player.work_turn = s.turn;
    assert.deepEqual(g.work(s, 'garantici'), s); cases++;
  }
  console.log('EMEK: TEMİZ · ' + cases + ' senaryo · ' + g.PROFESSIONS.length + ' meslek · dört tarz · iki risk dalı · zar/yazım yok · ay kilidi');
})().catch(e => { console.error(e); process.exitCode = 1; });
