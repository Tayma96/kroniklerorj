const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), esbuild = require('esbuild');
(async () => {
  const root = path.resolve(__dirname, '..');
  const built = await esbuild.build({ stdin: { contents: 'export * as g from "./lib/game"; export * as w from "./lib/war-world"; export * as a from "./lib/army"; export * as n from "./lib/nufus";', resolveDir: root, loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false,
    alias: { '@react-native-async-storage/async-storage': path.join(root, 'scripts/_smoke/as-stub.cjs') },
    plugins: [{ name: 'war-world-test-only', setup(b) { b.onLoad({ filter: /[/\\]lib[/\\]game\.ts$/ }, ({ path: file }) => ({ contents: fs.readFileSync(file, 'utf8') + '\nexport {warEconomyTick, realmArmyTick, crownCampaignTick};', loader: 'ts' })); } }] });
  const box = { exports: {} }; new Function('module', 'exports', 'require', built.outputFiles[0].text)(box, box.exports, require);
  const { g, w, a, n } = box.exports, copy = structuredClone;
  const peace = g.newGame('Sivil', 'Kontrol', 'erkek');
  Object.assign(peace.player, { age: 30, base_age: 30, health: 100, profession: 'çiftçi', location_name: 'Demirhan', home_name: 'Demirhan', money: 20000 });
  const damaged = copy(peace); damaged.warWorld = w.emptyWarWorld();
  damaged.warWorld.regions.demirhan = { damage: 40, shortage: 45, insecurity: 40, displacement: 25, exhaustion: 40, manpowerLoss: 30 };
  assert(g.cityGoodSupply(damaged, 'Demirhan', 'bugday') < g.cityGoodSupply(peace, 'Demirhan', 'bugday'), 'gerçek arz düşmedi');
  assert(g.cityGoodDemand(damaged, 'Demirhan', 'ekmek') > g.cityGoodDemand(peace, 'Demirhan', 'ekmek'));
  assert(g.goodPriceMult(damaged, 'bugday') > g.goodPriceMult(peace, 'bugday'), 'fiyat çarpanı değişmedi');
  assert(['bugday', 'un', 'ekmek', 'et', 'balik', 'peynir'].some(id => g.buyPrice(damaged, id) > g.buyPrice(peace, id)), 'gerçek gıda alış fiyatları değişmedi');
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
  // Sivil yardım gerçek bedelle çalışır; şehir değiştirerek aynı ay tekrar kazanılamaz.
  const donor = copy(damaged); donor.player.crowned = false; donor.player.inventory.bugday = 20; donor.player.inventory.kereste = 20;
  const cost = g.warAidCost(donor, 'rebuild'), donated = g.giveWarAid(donor, 'rebuild');
  assert.equal(donated.player.money, donor.player.money - cost.money);
  assert.equal(donated.player.inventory.kereste, donor.player.inventory.kereste - 4);
  assert(donated.warWorld.regions.demirhan.damage < donor.warWorld.regions.demirhan.damage);
  assert.deepEqual(g.giveWarAid(donated, 'food'), donated);
  assert.deepEqual(g.giveWarAid(peace, 'food'), peace, 'barışta ihtiyacı olmayan yere itibar çiftçiliği');
  const noGoods = copy(donor); noGoods.player.inventory.kereste = 0; assert(!g.canWarAid(noGoods, 'rebuild'));
  const jailed = copy(donor); jailed.player.jail = { left: 2 }; assert(!g.canWarAid(jailed, 'food'));
  assert(!g.canWarAid(mp, 'food')); assert(!g.warReportAt(mp, 'Demirhan').affected);
  const fighting = copy(peace); fighting.player.crowned = false; fighting.rng_state = 21;
  fighting.realmArmyWar = { id: 'realm:1:test', attacker: 'demirhan', defender: 'aksehir', started: 0, lastTick: 0, month: 0, a: a.makeArmy(800), b: a.makeArmy(900) };
  for (let turn = 1; turn <= 3; turn++) { fighting.turn = turn; g.warEconomyTick(fighting); g.realmArmyTick(fighting); }
  assert(fighting.realmArmyWar.winner); assert(fighting.warWorld.regions.aksehir.damage > 0);
  const snapshot = copy(fighting); g.warEconomyTick(fighting); assert.deepEqual(fighting, snapshot, 'aynı ay iki ekonomi sonucu');
  const restored = g.migrate(JSON.parse(JSON.stringify(fighting))); assert.deepEqual(restored.warWorld, fighting.warWorld);
  fighting.turn++; g.warEconomyTick(fighting); assert(fighting.warWorld.regions.aksehir.damage > 0, 'barış hasarı sildi');
  assert(fighting.warWorld.regions.aksehir.damage < snapshot.warWorld.regions.aksehir.damage);
  // Gerçek bir hane birlikte göçer, eski kayıt/pop paylaşımı ve aile kimlikleri bozulmaz.
  const migration = copy(damaged); migration.seed = 99834421; migration.turn = 0; migration.world.npcYears = 0;
  migration.pop = { v: 1, k: {}, n: 100 }; migration.relationships = {}; migration.player.properties = [];
  const head = n.yeniGelen(migration.pop, 0, 'Demirhan', 'erkek', 35, () => 0.3);
  const spouse = n.yeniGelen(migration.pop, 0, 'Demirhan', 'kadın', 33, () => 0.4);
  const child = n.yeniGelen(migration.pop, 0, 'Demirhan', 'erkek', 8, () => 0.5);
  head.prof = spouse.prof = 'çiftçi'; head.es = spouse.id; spouse.es = head.id;
  head.cocuk = spouse.cocuk = [child.id]; child.baba = head.id; child.anne = spouse.id;
  const moved = g.giveWarAid(migration, 'patrol'); moved.turn = 3;
  const supplyBefore = g.cityGoodSupply(moved, 'Demirhan', 'bugday'); g.warEconomyTick(moved);
  const newHome = moved.pop.k[head.id].loc;
  assert.notEqual(newHome, 'Demirhan'); assert.equal(moved.pop.k[spouse.id].loc, newHome); assert.equal(moved.pop.k[child.id].loc, newHome);
  assert.equal(migration.pop.k[head.id].loc, 'Demirhan', 'paylaşılan eski nüfus değiştirildi');
  assert.equal(moved.pop.k[child.id].baba, head.id); assert.equal(moved.pop.k[head.id].warHome, 'Demirhan');
  assert(g.cityGoodSupply(moved, 'Demirhan', 'bugday') < supplyBefore, 'göçte üretim önbelleği bayat kaldı');
  assert(moved.history.some(e => e.k === 'ww.displaced'));
  const migrated = copy(moved); g.warEconomyTick(moved); assert.deepEqual(moved, migrated, 'aynı ay iki hane taşındı');
  moved.warWorld.regions = {}; moved.turn = 15; delete moved.warWorld.lastTurn; delete moved.warWorld.migrationTurn;
  g.warEconomyTick(moved); assert.equal(moved.pop.k[head.id].loc, 'Demirhan'); assert.equal(moved.pop.k[child.id].loc, 'Demirhan'); assert.equal(moved.pop.k[head.id].warHome, undefined);
  assert(moved.history.some(e => e.k === 'ww.return'));
  assert(g.warTravelRisk(damaged, 'Demirhan', 'Akşehir', 'patika') > g.warTravelRisk(peace, 'Demirhan', 'Akşehir', 'patika'));
  assert(g.warTravelRisk(damaged, 'Demirhan', 'Akşehir', 'kervan') < g.warTravelRisk(damaged, 'Demirhan', 'Akşehir', 'patika'));
  // İkamet değiştirerek yıpranmış hükümdarlık merkezinin asker kaybı aşılamaz.
  const seated = copy(damaged); seated.player.crownSeat = 'demirhan'; seated.player.crownConquests = [];
  const abroad = copy(seated); abroad.player.home_name = 'Akşehir'; abroad.player.location_name = 'Akşehir';
  assert.equal(g.launchCampaign(seated, 'gumushisar').state.crownCampaign.armies.a.initial, g.launchCampaign(abroad, 'gumushisar').state.crownCampaign.armies.a.initial);
  // Başka hükümdarlar oyuncunun toprağını da hedefleyebilir; savunma ücretsiz değildir.
  let attacked;
  for (let seed = 1; seed <= 30 && !attacked; seed++) {
    const king = copy(peace); king.warWorld = w.emptyWarWorld(); delete king.realmArmyWar; king.rng_state = seed;
    g.realmArmyTick(king);
    if (king.realmArmyWar && ['aksehir', 'demirhan'].includes(king.realmArmyWar.defender)) attacked = king;
  }
  assert(attacked, 'hükümdar oyuncunun toprağı hedeflenemiyor');
  assert(g.playerArmyWar(attacked)); assert(!g.canLaunchCampaign(attacked, 'gumushisar'));
  assert(g.canCommandDefense(attacked, 'ikmal'));
  const orderCost = g.defenseOrderCost(attacked, 'ikmal'), supplied = g.commandDefense(attacked, 'ikmal');
  assert.equal(supplied.player.money, attacked.player.money - orderCost); assert.equal(supplied.realmArmyWar.b.supplies, 100);
  assert.deepEqual(g.commandDefense(supplied, 'siper'), supplied);
  const lossState = copy(attacked); lossState.realmArmyWar.a = a.makeArmy(2000); lossState.realmArmyWar.b = a.makeArmy(100); lossState.turn++;
  const cash = lossState.player.money, authority = g.crownAuthorityOf(lossState.player);
  g.realmArmyTick(lossState); assert.equal(lossState.realmArmyWar.winner, 'a'); assert.equal(lossState.player.money, cash - 150); assert.equal(g.crownAuthorityOf(lossState.player), authority - 10);
  assert(lossState.history.some(e => e.k === 'ww.defeated'));
  const lossOnce = copy(lossState); g.realmArmyTick(lossState); assert.deepEqual(lossState, lossOnce);
  assert(w.truceLeft(lossState.warWorld, lossState.realmArmyWar.attacker, lossState.player.crownSeat, lossState.turn) > 0);
  console.log('SAVAŞ ETKİLERİ: sivil fiyat/üretim/hane/ücret, mülk, vergi, ordu kaybı, barış, kayıt ve MP yalıtımı temiz.');
})().catch(e => { console.error(e); process.exitCode = 1; });
