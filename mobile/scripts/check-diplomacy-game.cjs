const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), esbuild = require('esbuild');
(async () => {
  const root = path.resolve(__dirname, '..');
  const built = await esbuild.build({ stdin: { contents: 'export * as g from "./lib/game"; export * as d from "./lib/diplomacy"; export * as w from "./lib/war-world"; export * as a from "./lib/army"; export { renderEvt, tFor } from "./lib/i18n";', resolveDir: root, loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false,
    alias: { '@react-native-async-storage/async-storage': path.join(root, 'scripts/_smoke/as-stub.cjs') },
    plugins: [{ name: 'diplomacy-test-only', setup(b) { b.onLoad({ filter: /[/\\]lib[/\\]game\.ts$/ }, ({ path: file }) => ({ contents: fs.readFileSync(file, 'utf8') + '\nexport {realmDiplomacyTick, realmDiplomacyAi};', loader: 'ts' })); } }] });
  const box = { exports: {} }; new Function('module', 'exports', 'require', built.outputFiles[0].text)(box, box.exports, require);
  const { g, d, w, a, renderEvt, tFor } = box.exports, copy = structuredClone;
  const king = g.newGame('Elçi', 'Kontrol', 'erkek');
  Object.assign(king.player, { age: 40, base_age: 40, crowned: true, crownSeat: 'demirhan', location_name: 'Demirhan', home_name: 'Demirhan', money: 20000, honor: 70, reputation: 40 });
  king.rng_state = 1;
  const target = g.campaignTargets(king)[0].id, other = g.campaignTargets(king)[1].id;
  assert.equal(Object.keys(king.diplomacy.rulers).length, 5);
  for (const r of Object.values(king.diplomacy.rulers)) assert(king.pop.k[r.personId] && king.pop.k[r.personId].ol == null);
  const quote = g.realmDiplomacyView(king, target, 'ticaret'), accepted = g.proposeRealmAccord(king, target, 'ticaret');
  assert.equal(accepted.status, 'accepted'); assert.equal(accepted.state.player.money, king.player.money - quote.payment);
  assert.equal(king.diplomacy.accords.length, 0, 'önceki kayıt değişti');
  assert(!g.canProposeRealmAccord(accepted.state, other, 'ateskes')); assert(!g.canLaunchCampaign(accepted.state, target));
  const successor = copy(accepted.state), old = successor.diplomacy.rulers[target]; successor.pop.k[old.personId].ol = 0;
  const treasury = old.treasury; g.ensureRealmRulers(successor); assert.notEqual(successor.diplomacy.rulers[target].personId, old.personId);
  assert.equal(successor.diplomacy.rulers[target].treasury, treasury); assert.equal(successor.diplomacy.accords.length, 1);
  accepted.state.turn++;
  const breached = g.breakRealmAccords(accepted.state, target);
  assert.equal(breached.player.honor, accepted.state.player.honor - 8); assert.equal(breached.player.reputation, accepted.state.player.reputation - 5);
  assert.equal(breached.diplomacy.accords.length, 0); assert.equal(w.truceLeft(breached.warWorld, 'demirhan', target, breached.turn), 0);
  assert(d.realmBond(breached.diplomacy, 'demirhan', other).trust < d.realmBond(accepted.state.diplomacy, 'demirhan', other).trust);
  let counter, refused;
  for (let seed = 5000; seed < 80000 && (!counter || !refused); seed += 1000) {
    const s = copy(king); s.rng_state = seed; const r = g.proposeRealmAccord(s, target, 'ticaret');
    if (r.status === 'counter') counter = r.state; if (r.status === 'refused') refused = r.state;
  }
  assert(counter && refused); const offer = counter.diplomacy.offers[0];
  assert(!g.canAnswerRealmOffer(counter, offer.id, true)); counter.turn++;
  const answer = g.answerRealmOffer(counter, offer.id, true); assert.equal(answer.player.money, counter.player.money - offer.payment);
  assert.equal(answer.diplomacy.accords[0].a, 'demirhan'); assert.equal(answer.diplomacy.offers.length, 0);
  assert.equal(g.answerRealmOffer(answer, offer.id, true), answer);
  const expired = copy(counter); expired.turn = offer.until; assert(!g.canAnswerRealmOffer(expired, offer.id, true));
  const relief = copy(king); relief.turn = 1; relief.warWorld = w.emptyWarWorld(); relief.warWorld.regions.demirhan = { ...w.peacefulRegion(), shortage: 40 };
  d.signAccord(relief.diplomacy, 'demirhan', target, 'yardim', 0, 'relief');
  const baseline = copy(relief); baseline.diplomacy.accords = []; g.realmDiplomacyTick(baseline); g.realmDiplomacyTick(relief);
  assert.equal(relief.diplomacy.rulers[target].treasury, baseline.diplomacy.rulers[target].treasury - Math.round(30 * g.inflationFactor(relief)));
  assert.equal(relief.warWorld.regions.demirhan.shortage, 37);
  const once = copy(relief); g.realmDiplomacyTick(relief); assert.deepEqual(relief, once);
  const displaced = copy(relief); displaced.turn = 2; displaced.warWorld.regions.demirhan.shortage = 0; displaced.warWorld.regions.demirhan.displacement = 15;
  g.realmDiplomacyTick(displaced); assert.equal(displaced.warWorld.regions.demirhan.displacement, 14); assert.equal(displaced.warWorld.regions.demirhan.shortage, 0);
  const sponsored = copy(king); sponsored.turn = 1; d.signAccord(sponsored.diplomacy, target, 'demirhan', 'yardim', 0, 'foreign-relief');
  const sponsorMoney = sponsored.player.money; g.realmDiplomacyTick(sponsored); assert.equal(sponsored.player.money, sponsorMoney - Math.round(30 * g.inflationFactor(sponsored)));
  sponsored.player.money = 0; sponsored.turn = 2; g.realmDiplomacyTick(sponsored); sponsored.turn = 4; g.realmDiplomacyTick(sponsored); assert.equal(sponsored.diplomacy.accords.length, 0, 'iki temerrüt ahdi bozmadı');
  const defense = copy(king); defense.turn = 1;
  defense.realmArmyWar = { id: 'defense', attacker: other, defender: target, started: 0, lastTick: 0, month: 0, a: a.makeArmy(800), b: a.makeArmy(700) };
  d.signAccord(defense.diplomacy, 'demirhan', target, 'savunma', 0, 'defense'); const beforeDefense = defense.player.money;
  g.realmDiplomacyTick(defense); assert.equal(defense.realmArmyWar.b.troops, 820); assert.equal(defense.player.money, beforeDefense - Math.round(150 * g.inflationFactor(defense)));
  assert.equal(defense.warWorld.regions.demirhan.manpowerLoss, 2); defense.turn = 2; g.realmDiplomacyTick(defense); assert.equal(defense.realmArmyWar.b.troops, 820, 'mükerrer müttefik askeri');
  const peace = copy(king); peace.realmArmyWar = { id: 'peace', goal: 'conquest', attacker: 'demirhan', defender: target, started: 0, lastTick: 0, month: 0, a: a.makeArmy(800), b: a.makeArmy(700) };
  peace.warWorld = w.emptyWarWorld(); peace.warWorld.regions[target] = { ...w.peacefulRegion(), damage: 30, shortage: 30 };
  const treaty = g.proposeRealmAccord(peace, target, 'baris'); assert.equal(treaty.status, 'accepted'); assert(treaty.state.realmArmyWar.peace);
  assert(!treaty.state.player.crownConquests?.includes(target)); assert.equal(treaty.state.warWorld.regions[target].damage, 30);
  assert(!treaty.state.warWorld.regions[target].occupation); assert(w.truceLeft(treaty.state.warWorld, 'demirhan', target, 0) > 0);
  const restored = g.migrate(JSON.parse(JSON.stringify(treaty.state))); assert(restored.realmArmyWar.peace); assert.equal(restored.diplomacy.accords.length, 1);
  // Dış saraylar kendi aralarında yardım/savunma/saldırmazlık kurabilir.
  const ai = copy(king); ai.player.crowned = false; ai.turn = 3; ai.rng_state = 1; ai.warWorld = w.emptyWarWorld();
  for (const id of Object.keys(ai.diplomacy.rulers)) { ai.diplomacy.rulers[id].treasury = 800; ai.diplomacy.rulers[id].aggression = 50; ai.warWorld.regions[id] = { ...w.peacefulRegion(), shortage: 40 }; }
  g.realmDiplomacyAi(ai, []); assert.equal(ai.diplomacy.accords[0].kind, 'yardim');
  const foreignAid = ai.diplomacy.accords[0]; assert.notEqual(foreignAid.a, foreignAid.b); assert(ai.diplomacy.rulers[foreignAid.b].treasury < 800);
  const allied = copy(king); allied.player.crowned = false; allied.turn = 3; allied.rng_state = 1;
  const realms = Object.keys(allied.diplomacy.rulers);
  for (const x of realms) for (const y of realms) if (x !== y) allied.diplomacy.relations[d.realmPair(x, y)] = { trust: 30, grievance: 0 };
  g.realmDiplomacyAi(allied, []); assert.equal(allied.diplomacy.accords[0].kind, 'savunma');
  const cautious = copy(king); cautious.player.crowned = false; cautious.turn = 3; cautious.rng_state = 1;
  for (const ruler of Object.values(cautious.diplomacy.rulers)) ruler.aggression = 25;
  g.realmDiplomacyAi(cautious, []); assert.equal(cautious.diplomacy.accords[0].kind, 'ateskes');
  // Yardım tek başına askerî saldırmazlık değildir; ticaret/savunma/barış öyledir.
  const aidOnly = copy(king); d.signAccord(aidOnly.diplomacy, 'demirhan', target, 'yardim', 0, 'aid-only'); assert.equal(g.crownTreaty(aidOnly, target), null);
  const npcPeace = copy(peace); npcPeace.player.crowned = false; npcPeace.turn = 1; npcPeace.rng_state = 1;
  npcPeace.warWorld.regions.demirhan = { ...w.peacefulRegion(), exhaustion: 80 }; npcPeace.diplomacy.rulers.demirhan.aggression = 25;
  g.realmDiplomacyAi(npcPeace, [npcPeace.realmArmyWar]); assert(npcPeace.realmArmyWar.peace, 'iki bağımsız hükümdar barış yapamadı');
  assert(!npcPeace.player.zafer); assert(!npcPeace.warWorld.regions[target].occupation);
  const incoming = copy(peace); incoming.turn = 1; incoming.rng_state = 1; incoming.warWorld.regions[target].exhaustion = 80; incoming.diplomacy.rulers[target].aggression = 25;
  g.realmDiplomacyAi(incoming, [incoming.realmArmyWar]); assert.equal(incoming.diplomacy.offers[0].kind, 'baris'); assert(!incoming.realmArmyWar.peace, 'oyuncunun barış kararı atlandı');
  const pending = copy(incoming); g.realmDiplomacyAi(incoming, [incoming.realmArmyWar]); assert.deepEqual(incoming, pending, 'barış elçiliği yinelendi');
  const peaceAnswer = g.answerRealmOffer(incoming, incoming.diplomacy.offers[0].id, true); assert(peaceAnswer.realmArmyWar.peace);
  for (const state of [accepted.state, successor, breached, counter, refused, relief, sponsored, defense, treaty.state, ai, allied, cautious, npcPeace, incoming, peaceAnswer]) {
    for (const event of state.history.filter(e => /^(dp|ww)\./.test(e.k || ''))) for (const lang of ['tr', 'en', 'es', 'pt', 'ar', 'ru']) {
      const rendered = renderEvt(event.k, event.text || '', event.p, lang, key => tFor(lang, key));
      assert(!/undefined|NaN|\[object|%[1-9]|^dp\.|^ww\./.test(rendered), `${lang}: ${rendered}`);
    }
  }
  const tribute = copy(king); tribute.diplomacy.rulers[target].treasury = 70;
  const extracted = g.demandTribute(tribute, target); assert(extracted.success); assert.equal(extracted.state.player.money, tribute.player.money + 70);
  assert.equal(extracted.state.diplomacy.rulers[target].treasury, 0); assert.equal(tribute.diplomacy.rulers[target].treasury, 70);
  assert(d.realmBond(extracted.state.diplomacy, 'demirhan', target).grievance >= 8); extracted.state.turn++;
  assert(!g.canDemandTribute(extracted.state, target), 'boş hazineden para üretildi'); assert(!g.canDemandTribute(peace, target), 'savaştaki devletten barış haraç eylemi');
  let refusedTribute;
  for (let seed = 10000; seed < 80000 && !refusedTribute; seed += 5000) {
    const s = copy(king); s.rng_state = seed; const r = g.demandTribute(s, target); if (!r.success) refusedTribute = r.state;
  }
  assert(refusedTribute); assert.equal(refusedTribute.player.money, king.player.money); assert.equal(refusedTribute.diplomacy.rulers[target].treasury, king.diplomacy.rulers[target].treasury);
  assert(d.realmBond(refusedTribute.diplomacy, 'demirhan', target).grievance >= 6);
  const reserveEvent = copy(king); reserveEvent.player.inventory.bugday = 8;
  for (const state of [g.stockWarReserve(reserveEvent), extracted.state, refusedTribute]) for (const event of state.history.filter(e => /^(ww|crown)\./.test(e.k || ''))) for (const lang of ['tr', 'en', 'es', 'pt', 'ar', 'ru']) {
    const rendered = renderEvt(event.k, event.text || '', event.p, lang, key => tFor(lang, key)); assert(!/undefined|NaN|\[object|%[1-9]|^ww\.|^crown\./.test(rendered), `${lang}: ${rendered}`);
  }
  const mp = copy(king); mp.mpRealm = true; assert.equal(g.proposeRealmAccord(mp, target, 'ticaret').state, mp); const snap = copy(mp); g.realmDiplomacyTick(mp); assert.deepEqual(mp, snap);
  console.log('HÜKÜMDAR DİPLOMASİSİ: gerçek kişi/veraset, elçilik/karşı teklif, aylık kilit, yardım bütçesi/temerrüt, savunma askeri, fetihsiz barış, kayıt ve MP temiz.');
})().catch(e => { console.error(e); process.exitCode = 1; });
