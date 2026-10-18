// Bölgesel savaş sonuçları: tam hayat döngüsü/smoke çalıştırmaz.
const assert = require('node:assert/strict'), esbuild = require('esbuild'), path = require('node:path');
(async () => {
  const bundle = await esbuild.build({ stdin: { contents: 'export * as w from "./lib/war-world"; export * as a from "./lib/army";', resolveDir: path.resolve(__dirname, '..'), loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false });
  const box = { exports: {} }; new Function('module', 'exports', bundle.outputFiles[0].text)(box, box.exports);
  const { w, a } = box.exports, ids = ['a', 'b', 'c', 'd', 'e'];
  const world = w.emptyWarWorld(), war = { id: 'war:1', attacker: 'a', defender: 'b', started: 0, lastTick: 0, month: 0, a: a.makeArmy(800), b: a.makeArmy(900) };
  assert(w.recordWar(world, war)); const once = structuredClone(world); assert(!w.recordWar(world, war)); assert.deepEqual(world, once);
  const rng = { rng_state: 27 };
  for (let turn = 1; turn <= 3 && !war.winner; turn++) { a.clashArmies(war, rng, turn); w.recordWar(world, war); w.tickWarWorld(world, [war], turn, ids); }
  assert(war.winner); assert(world.regions.a.manpowerLoss > 0); assert(world.regions.b.damage > world.regions.a.damage);
  const after = structuredClone(world); assert(!w.recordWar(world, JSON.parse(JSON.stringify(war)))); assert.deepEqual(world, after);
  assert(world.regions.c.shortage > 0, 'savaş dışı ticaret bölgesine baskı ulaşmadı');
  const ruined = w.warEffects(world.regions.b), healthy = w.warEffects(w.peacefulRegion());
  for (const field of ['production', 'revenue', 'recruitment']) assert(ruined[field] < healthy[field], field);
  assert(ruined.foodDemand > 1); assert(ruined.roadRisk > 0); assert(ruined.unrest > 0);
  const peace = structuredClone(world); w.tickWarWorld(peace, [], 4, ids); assert(peace.regions.b.damage > 0, 'barışta hasar silindi');
  assert(peace.regions.b.damage < world.regions.b.damage); assert(peace.regions.b.manpowerLoss > 0);
  assert(!w.tickWarWorld(peace, [], 4, ids));
  const helped = structuredClone(world); assert(w.applyCivilAid(helped, 'b', 'rebuild', 4)); assert(!w.applyCivilAid(helped, 'b', 'food', 4));
  assert(helped.regions.b.damage < world.regions.b.damage); assert(!w.applyCivilAid(w.emptyWarWorld(), 'c', 'food', 1));
  const corrupt = w.repairWarWorld({ regions: { b: { damage: Infinity, shortage: -5, insecurity: 200, displacement: null }, nope: {} }, lastTurn: 900 }, ids, 3);
  assert.equal(corrupt.regions.b.damage, 0); assert.equal(corrupt.regions.b.shortage, 0); assert.equal(corrupt.regions.b.insecurity, 100); assert(!corrupt.regions.nope); assert.equal(corrupt.lastTurn, undefined);
  const restored = w.repairWarWorld(JSON.parse(JSON.stringify(world)), ids, 3); assert.deepEqual(restored, world);
  const reorder = structuredClone(world), normal = structuredClone(world); w.tickWarWorld(reorder, [], 4, [...ids].reverse()); w.tickWarWorld(normal, [], 4, ids); assert.deepEqual(reorder, normal, 'yayılım bölge sırasına bağlı');
  for (let turn = 4; turn <= 100; turn++) w.tickWarWorld(normal, [], turn, ids);
  assert(normal.regions.b.damage < world.regions.b.damage); assert(normal.regions.b.shortage < world.regions.b.shortage);
  console.log('SAVAŞ DÜNYASI: zayiat, tek-sefer sonuç, bölgesel yayılım, barış/toparlanma, yardım kilidi ve bozuk kayıt temiz.');
})().catch(e => { console.error(e); process.exitCode = 1; });
