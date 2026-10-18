// Yalnız ordu/asker bağlantısı: uzun hayat simülasyonu çalıştırmaz.
const assert = require('node:assert/strict');
const path = require('node:path'), fs = require('node:fs'), esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
(async () => {
  const built = await esbuild.build({ stdin: { contents: 'export * as g from "./lib/game"; export * as a from "./lib/army"; export {ARMY_METIN} from "./lib/i18n-army";', resolveDir: root, loader: 'ts' },
    bundle: true, platform: 'node', format: 'cjs', write: false,
    alias: { '@react-native-async-storage/async-storage': path.join(root, 'scripts/_smoke/as-stub.cjs') },
    plugins: [{ name: 'army-check-only', setup(b) { b.onLoad({ filter: /[/\\]lib[/\\]game\.ts$/ }, ({ path: file }) => ({ contents: fs.readFileSync(file, 'utf8') + '\nexport {realmArmyTick, crownCampaignTick, caravanAttackChance};', loader: 'ts' })); } }] });
  const box = { exports: {} }; new Function('module', 'exports', 'require', built.outputFiles[0].text)(box, box.exports, require);
  const { g, a, ARMY_METIN } = box.exports, copy = structuredClone;
  const fresh = () => {
    const s = g.newGame('Ordu', 'Kontrol', 'erkek'); s.rng_state = 1;
    Object.assign(s.player, { age: 25, base_age: 25, profession: 'asker', health: 100, home_name: 'Demirhan', location_name: 'Demirhan' });
    s.realmArmyWar = { id: 'test-front', attacker: 'demirhan', defender: 'aksehir', started: 0, lastTick: 0, month: 0, a: a.makeArmy(700), b: a.makeArmy(1300) };
    return s;
  };
  const initial = fresh(), joined = g.joinArmy(initial);
  assert(!initial.realmArmyWar.service, 'katılım önceki kaydı değiştirdi');
  assert(joined.realmArmyWar.service, 'asker çağrıya katılamadı');
  assert.equal(joined.player.faction, initial.player.faction, 'ordu için loncaya zorlandı');
  assert.deepEqual(g.joinArmy(joined), joined, 'çift katılım');
  for (const patch of [{ age: 15 }, { profession: 'çiftçi' }, { dead: true }, { health: 24 }, { location_name: 'Akşehir' }, { crowned: true }, { battle_turn: 0 }, { war_support_turn: 0 }, { jail: { left: 2 } }]) {
    const s = fresh(); Object.assign(s.player, patch); assert(!g.canJoinArmy(s), JSON.stringify(patch));
  }
  const mp = fresh(); mp.mpRealm = true; assert.equal(g.playerArmyWar(mp), null); assert.deepEqual(g.joinArmy(mp), mp);
  let duty = joined;
  for (const move of ['hold', 'advance', 'rescue']) {
    const saved = JSON.parse(JSON.stringify(duty));
    assert.deepEqual(JSON.parse(JSON.stringify(g.serveArmy(duty, move))), JSON.parse(JSON.stringify(g.serveArmy(saved, move))), 'kayıt tekrarı farklı zar verdi');
    const next = g.serveArmy(duty, move); assert(next.player.health < duty.player.health); duty = next;
  }
  assert.equal(duty.realmArmyWar.service.rounds, 3);
  assert(duty.realmArmyWar.a.evacuated > 0);
  assert(duty.realmArmyWar.a.troops < duty.realmArmyWar.a.initial);
  assert.equal(duty.player.career_xp, joined.player.career_xp + 1);
  assert.deepEqual(g.serveArmy(duty, 'advance'), duty, 'dördüncü temastan ödül');
  assert.deepEqual(g.startBattleAttempt(duty), duty, 'ordu görevi sonrası ikinci dövüş');
  const nextMonth = copy(duty); nextMonth.turn++;
  assert(g.canServeArmy(nextMonth), 'sonraki ay görev açılmadı');
  const oldHealth = nextMonth.player.health;
  assert(g.serveArmy(nextMonth, 'hold').player.health < oldHealth);
  const invalid = copy(joined); invalid.realmArmyWar.service.generation = 99; assert(!g.canServeArmy(invalid));
  const injured = copy(joined); injured.player.health = 15; injured.realmArmyWar.service.enemy = 'charge';
  const wound = g.serveArmy(injured, 'advance'); assert(!g.canServeArmy(wound), 'ağır yaralı yeniden savaştı');
  assert.equal(wound.realmArmyWar.service.rounds, 3);
  // Bir manganın şahsi başarısı iki kat büyük orduyu otomatik yenemez.
  const tested = copy(duty), baseline = fresh();
  for (let turn = 1; turn <= 3; turn++) { tested.turn = baseline.turn = turn; g.realmArmyTick(tested); g.realmArmyTick(baseline); }
  assert.equal(tested.realmArmyWar.winner, 'b'); assert.equal(baseline.realmArmyWar.winner, 'b');
  assert(tested.realmArmyWar.a.troops < tested.realmArmyWar.a.initial);
  assert(tested.realmArmyWar.b.supplies < 80);
  const ended = copy(tested); g.realmArmyTick(tested); assert.deepEqual(tested, ended, 'aynı ay ikinci savaş sonucu/ödülü');
  for (const supplies of [0, 80]) {
    const army = a.makeArmy(1000, supplies); assert(a.armyStrength(army) >= 0);
  }
  assert(a.armyStrength(a.makeArmy(1000, 80)) > a.armyStrength(a.makeArmy(1000, 0)), 'ikmal etkisiz');
  const low = a.makeArmy(1000); low.morale = 20; assert(a.armyStrength(low) < a.armyStrength(a.makeArmy(1000)), 'moral etkisiz');
  // Hükümdar seferi de gerçek iki orduyla çözülsün, eski sefer kaydı onarılsın.
  const crown = fresh(); Object.assign(crown.player, { crowned: true, crownSeat: 'demirhan', money: 20000, crownAuthority: 75 });
  const launched = g.launchCampaign(crown, 'aksehir').state; assert(launched.crownCampaign.armies);
  for (let month = 1; month <= 3; month++) { launched.turn = month; g.crownCampaignTick(launched); }
  assert.equal(launched.crownCampaign, null); assert(launched.history.some(e => e.k === 'army.clash'));
  const legacy = fresh(); delete legacy.realmArmyWar; assert.doesNotThrow(() => g.migrate(legacy));
  for (const bad of [{}, { a: { troops: NaN } }, { ...fresh().realmArmyWar, attacker: 'yok' }, { ...fresh().realmArmyWar, lastTick: Infinity }]) {
    const s = fresh(); s.realmArmyWar = bad; assert.equal(g.migrate(s).realmArmyWar, null);
  }
  const repaired = g.migrate(JSON.parse(JSON.stringify(duty))); assert.equal(repaired.realmArmyWar.service.rounds, 3); assert(!g.canServeArmy(repaired));
  // Cephe, oradan geçen gerçek kervanın riskini yükseltir; sonuçlanınca düşer.
  const road = fresh(); road.caravan = { invested: 500, dest: 'Akşehir', step: 0, route: ['Akşehir'] };
  const dangerous = g.caravanAttackChance(road); road.realmArmyWar.winner = 'b'; assert(dangerous > g.caravanAttackChance(road));
  // İlk devlet savaşı oyuncu emri olmadan da oluşur; aynı kayıtta aynı dünyayı verir.
  const npc = fresh(); delete npc.realmArmyWar; const npc2 = copy(npc); g.realmArmyTick(npc); g.realmArmyTick(npc2);
  assert(npc.realmArmyWar); assert.deepEqual(npc.realmArmyWar, npc2.realmArmyWar);
  for (const lang of ['tr', 'en', 'es', 'pt', 'ar', 'ru']) for (const [key, value] of Object.entries(ARMY_METIN.tr)) {
    assert(ARMY_METIN[lang][key], `${lang}: ${key}`);
    assert.deepEqual(ARMY_METIN[lang][key].match(/%\d/g), value.match(/%\d/g), `${lang}: ${key} parametre`);
  }
  console.log('ORDU: asker çağrısı, üç temas, kayıt/RNG, aylık kilit, sağlık, bağımsız ordu sonucu, hükümdar seferi, kervan riski, göç ve altı dil temiz.');
})().catch(e => { console.error(e); process.exitCode = 1; });
