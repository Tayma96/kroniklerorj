// Mevcut davranışın donmuş örnekleri: test tohumu üretim kaydındaki RNG'nin yerine geçmez.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const crypto = require('node:crypto'), { performance } = require('node:perf_hooks');
const esbuild = require('esbuild');
const mobile = path.resolve(__dirname, '../..'), root = path.resolve(mobile, '..');
const out = path.join(root, 'docs/denetim/gdd-baseline.json');
const copy = x => JSON.parse(JSON.stringify(x));
const hash = x => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
function rng(a) { return () => { a |= 0; a = a + 0x6d2b79f5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
(async () => {
  const b = await esbuild.build({ stdin: { contents: "export * from './lib/game'; export { marketGoods, locSeed } from './lib/world';", resolveDir: mobile, loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false });
  const box = { exports: {} }; new Function('module', 'exports', 'require', b.outputFiles[0].text)(box, box.exports, require); const g = box.exports;
  const original = Math.random;
  function seeded(seed, fn) { Math.random = rng(seed); try { return fn(); } finally { Math.random = original; } }
  function state(age) { return seeded(age * 703, () => { const s = g.newGame('Denetim', 'Ocak', age % 2 ? 'kadın' : 'erkek'); s.player.age = s.player.base_age = age; s.player.money = 500; s.player.hunger = 80; return s; }); }
  const samples = Object.fromEntries([7, 30, 60].map(a => [a, state(a)]));
  const adult = () => copy(samples[30]), child = () => copy(samples[7]);
  const flows = {
    yeni: () => g.newGame('Denetim', 'Ocak', 'kadın'),
    ay: () => g.advance(adult()),
    yemek: () => { const s = adult(); s.player.hunger = 20; return g.eat(s); },
    is: () => { const s = adult(); s.player.profession = 'demirci'; const n = g.work(s, 'hirsli'); assert.equal(n.player.work_turn, s.turn); assert.equal(g.work(n).player.money, n.player.money); return n; },
    ticaret: () => { const s = adult(), goods = g.marketGoods(g.locSeed(s.player.location_name)); const n = g.negotiatedBuy(s, goods[0].id, 10); assert.equal(n.player.inventory[goods[0].id], (s.player.inventory[goods[0].id] || 0) + 1); return n; },
    sohbet: () => { const s = adult(), npc = g.npcsOf(s)[0]; assert(npc); const n = g.talkWith(s, npc, 'hosbes'); assert(n.line); return n; },
    ders: () => { const n = g.studySubject(child(), 'matematik'); assert(!n.blocked); assert.equal(n.state.player.lesson_count, 1); return n; },
    suc: () => { const s = adult(), n = g.doCrime(s, 'yankesicilik'); assert.equal(n.player.last_crime_turn, s.turn); assert.equal(g.doCrime(n, 'yankesicilik').player.money, n.player.money); return n; },
    yol: () => { const s = adult(), dest = g.LOCATIONS.find(x => x !== s.player.location_name); assert(dest); const n = g.travelBy(s, dest, 'anayol'); assert.equal(n.player.location_name, dest); return n; },
    varis: () => { const s = adult(); s.player.dead = true; s.player.children = ['Vâris']; const n = g.continueAsHeir(s, 'esit', 'Vâris'); assert(!n.player.dead); assert.equal(n.player.generation, s.player.generation + 1); return n; },
  };
  const hashes = {};
  for (const [key, fn] of Object.entries(flows)) { const a = seeded(8711, fn), b = seeded(8711, fn); assert.deepEqual(a, b, key); hashes[key] = hash(a); }
  const timings = [], simulations = {};
  for (const [age, fixture] of Object.entries(samples)) {
    const run = () => { let s = g.migrate(copy(fixture)); const before = copy(s); assert.deepEqual(g.migrate(copy(s)), before, 'göç idempotent'); for (let i = 0; i < 30 && !s.player.dead; i++) { if (s.player.hunger < 35) s = g.eat(s); const start = performance.now(); s = g.advance(s); timings.push(performance.now() - start); } return s; };
    const s = seeded(7700 + Number(age), run), repeat = seeded(7700 + Number(age), run); assert.deepEqual(s, repeat);
    simulations[age] = { months: s.turn - fixture.turn, dead: s.player.dead, hash: hash(s), saveBytes: Buffer.byteLength(JSON.stringify(s)) };
  }
  timings.sort((a,b) => a-b);
  const measured = { p50: +timings[Math.floor(timings.length * .5)].toFixed(2), p95: +timings[Math.floor(timings.length * .95)].toFixed(2), max: +timings.at(-1).toFixed(2) };
  if (process.argv.includes('--kaydet')) fs.writeFileSync(out, JSON.stringify({ kind: 'sentetik-karakterizasyon-gercek-oyuncu-kaydi-degil', engineSha256: hash(fs.readFileSync(path.join(mobile, 'lib/game.ts'), 'utf8')), flows: hashes, simulations, measuredTickMs: measured }, null, 2) + '\n');
  else { const baseline = JSON.parse(fs.readFileSync(out, 'utf8')); assert.deepEqual(hashes, baseline.flows, 'Davranış değişti; neden ayrı kaydedilmeli'); for (const age of Object.keys(simulations)) assert.equal(simulations[age].hash, baseline.simulations[age].hash, age); }
  process.stdout.write(`GDD TABANI: TEMİZ · ${Object.keys(hashes).length} akış · 3 sentetik kayıt × 30 ay · tick ms ${JSON.stringify(measured)}\n`);
})().catch(e => { console.error(e); process.exitCode = 1; });
