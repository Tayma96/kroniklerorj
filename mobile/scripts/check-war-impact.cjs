const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), esbuild = require('esbuild');
(async () => {
  const root = path.resolve(__dirname, '..');
  const built = await esbuild.build({ stdin: { contents: 'export * as g from "./lib/game"; export * as w from "./lib/war-world"; export * as a from "./lib/army";', resolveDir: root, loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false,
    alias: { '@react-native-async-storage/async-storage': path.join(root, 'scripts/_smoke/as-stub.cjs') },
    plugins: [{ name: 'war-world-test-only', setup(b) { b.onLoad({ filter: /[/\\]lib[/\\]game\.ts$/ }, ({ path: file }) => ({ contents: fs.readFileSync(file, 'utf8') + '\nexport {warEconomyTick, realmArmyTick, crownCampaignTick};', loader: 'ts' })); } }] });
  const box = { exports: {} }; new Function('module', 'exports', 'require', built.outputFiles[0].text)(box, box.exports, require);
  const { g, w, a } = box.exports, copy = structuredClone;
  const peace = g.newGame('Sivil', 'Kontrol', 'erkek');
  Object.assign(peace.player, { age: 30, base_age: 30, health: 100, profession: 'çiftçi', location_name: 'Demirhan', home_name: 'Demirhan', money: 20000 });
  const damaged = copy(peace); damaged.warWorld = w.emptyWarWorld();
  damaged.warWorld.regions.demirhan = { damage: 40, shortage: 45, insecurity: 40, displacement: 25, exhaustion: 40, manpowerLoss: 30 };
  assert(g.cityGoodSupply(damaged, 'Demirhan', 'bugday') < g.cityGoodSupply(peace, 'Demirhan', 'bugday'), 'gerçek arz düşmedi');
  assert(g.cityGoodDemand(damaged, 'Demirhan', 'ekmek') > g.cityGoodDemand(peace, 'Demirhan', 'ekmek'));
  assert(g.goodPriceMult(damaged, 'bugday') > g.goodPriceMult(peace, 'bugday'), 'fiyat çarpanı değişmedi');
  assert(g.buyPrice(damaged, 'bugday') > g.buyPrice(peace, 'bugday'), 'gerçek alış fiyatı değişmedi');
  assert(g.lifestyleUpkeep(damaged) > g.lifestyleUpkeep(peace), 'sivil hane gideri etkisiz');
  assert(g.workForecast(damaged).max < g.workForecast(peace).max, 'çiftçi ücreti etkisiz');
  assert(g.cityFx(damaged, 'Demirhan').prosp < g.cityFx(peace, 'Demirhan').prosp);
  assert(g.cityFx(damaged, 'Demirhan').sec < g.cityFx(peace, 'Demirhan').sec);
  const workers = g.rosterAt(peace, 'Demirhan').filter(n => n.age >= 18 && n.age < 60).slice(0, 6).map(n => n.id);
  const prop = { type: 'tarla', loc: 'Demirhan', cond: 100, level: 1, workers };
  assert((g.propYield(damaged, prop)?.qty || 0) < (g.propYield(peace, prop)?.qty || 0), 'işçili mülkün gerçek ürünü düşmedi');
  for (const s of [peace, damaged]) { s.player.governorships = ['Demirhan']; s.player.govTax = { Demirhan: 15 }; s.player.govLeg = { Demirhan: 60 }; s.player.crowned = true; s.player.crownSeat = 'aksehir'; s.player.crownConquests = ['demirhan']; }
  assert(g.governorIncome(damaged) < g.governorIncome(peace)); assert(g.crownTribute(damaged) < g.crownTribute(peace));
  const mp = copy(damaged); mp.mpRealm = true;
  assert.equal(g.buyPrice(mp, 'ekmek'), g.buyPrice(peace, 'ekmek')); assert.equal(g.crownTribute(mp), g.crownTribute(peace));
  assert.equal(g.cityGoodSupply(mp, 'Demirhan', 'bugday'), g.cityGoodSupply(peace, 'Demirhan', 'bugday'));
  const fighting = copy(peace); fighting.player.crowned = false; fighting.rng_state = 21;
  fighting.realmArmyWar = { id: 'realm:1:test', attacker: 'demirhan', defender: 'aksehir', started: 0, lastTick: 0, month: 0, a: a.makeArmy(800), b: a.makeArmy(900) };
  for (let turn = 1; turn <= 3; turn++) { fighting.turn = turn; g.warEconomyTick(fighting); g.realmArmyTick(fighting); }
  assert(fighting.realmArmyWar.winner); assert(fighting.warWorld.regions.aksehir.damage > 0);
  const snapshot = copy(fighting); g.warEconomyTick(fighting); assert.deepEqual(fighting, snapshot, 'aynı ay iki ekonomi sonucu');
  const restored = g.migrate(JSON.parse(JSON.stringify(fighting))); assert.deepEqual(restored.warWorld, fighting.warWorld);
  fighting.turn++; g.warEconomyTick(fighting); assert(fighting.warWorld.regions.aksehir.damage > 0, 'barış hasarı sildi');
  assert(fighting.warWorld.regions.aksehir.damage < snapshot.warWorld.regions.aksehir.damage);
  console.log('SAVAŞ ETKİLERİ: sivil fiyat/üretim/hane/ücret, mülk, vergi, ordu kaybı, barış, kayıt ve MP yalıtımı temiz.');
})().catch(e => { console.error(e); process.exitCode = 1; });
