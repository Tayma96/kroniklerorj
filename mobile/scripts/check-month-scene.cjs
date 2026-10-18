// Yalnız aylık kart kaydı ve 1–6 aylık hedefli geçişler; hayat/smoke taraması yok.
const assert = require('node:assert/strict'), path = require('node:path'), esbuild = require('esbuild');
(async () => {
  const built = await esbuild.build({ stdin: { contents: 'export * as g from "./lib/game"; export * as m from "./lib/month-scene"; export * as r from "./lib/month-scene-state"; export * as e from "./lib/events";', resolveDir: path.resolve(__dirname, '..'), loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false });
  const box = { exports: {} }; new Function('module', 'exports', 'require', built.outputFiles[0].text)(box, box.exports, require);
  const { g, m, r, e } = box.exports, copy = structuredClone;
  const fresh = () => { const s = g.newGame('Karar', 'Kayıt', 'erkek'); s.turn = 1; Object.assign(s.player, { age: 25, base_age: 25, health: 100, hunger: 100, money: 500 }); s.rng_state = 44; return s; };
  const seed = fresh(); let dilemma, opportunity;
  for (let rng = 1000; rng <= 12000 && (!dilemma || !opportunity); rng += 100) {
    const s = copy(seed); s.rng_state = rng; const prepared = m.prepareMonthScene(s, 0);
    if (prepared.monthScene?.dilemma) dilemma = prepared; if (prepared.monthScene?.opp) opportunity = prepared;
  }
  assert(dilemma && opportunity, 'hedefli tohum aralığında iki kart türü bulunamadı');
  const before = copy(dilemma), loaded = g.migrate(JSON.parse(JSON.stringify(dilemma)));
  assert.deepEqual(loaded.monthScene, dilemma.monthScene); assert.equal(m.prepareMonthScene(loaded), loaded, 'yeniden açılışta kart zarı atıldı');
  assert.equal(g.advance(loaded), loaded); assert.equal(m.advanceWithMonthScene(loaded, 6, true), loaded);
  assert.equal(m.chooseMonthDilemma(loaded, 'bayat-id', 0), loaded); assert.equal(m.chooseMonthDilemma(loaded, loaded.monthScene.id, 99), loaded);
  const chosen = m.chooseMonthDilemma(loaded, loaded.monthScene.id, 0); assert(chosen.monthScene.done); assert(!m.pendingMonthScene(chosen));
  assert.equal(m.chooseMonthDilemma(chosen, loaded.monthScene.id, 0), chosen); assert.deepEqual(dilemma, before, 'eski durum değişti');
  const next = m.advanceWithMonthScene(chosen, 1); assert.equal(next.turn, chosen.turn + 1); assert.equal(next.monthScene.turn, next.turn);
  const risk = e.DILEMMAS.find(d => d.choices.some(c => c.risk)); assert(risk);
  const riskState = fresh(), resolvedRisk = e.riskiCoz(riskState.player, risk, () => 0.9999);
  riskState.monthScene = { id: 'month:1:1', turn: 1, generation: 1, kind: 'ikilem', done: false, dilemma: JSON.parse(JSON.stringify(resolvedRisk)) };
  const riskLoad = g.migrate(JSON.parse(JSON.stringify(riskState))), ci = risk.choices.findIndex(c => c.risk);
  assert.deepEqual(riskLoad.monthScene.dilemma.choices[ci].gercek, risk.choices[ci].risk.kayip); assert.equal(m.prepareMonthScene(riskLoad), riskLoad);
  const id = opportunity.monthScene.id;
  assert.equal(m.resolveMonthOpportunity(opportunity, id), opportunity, 'mini oyun oynanmadan ödül');
  assert.equal(m.progressMonthOpportunity(opportunity, id, 'result', true), opportunity, 'başlamadan sonuç');
  const playing = m.progressMonthOpportunity(opportunity, id, 'play'); assert.equal(playing.monthScene.stage, 'play');
  for (const success of [true, false]) {
    const result = m.progressMonthOpportunity(playing, id, 'result', success), restored = g.migrate(JSON.parse(JSON.stringify(result)));
    assert.equal(restored.monthScene.stage, 'result'); assert.equal(restored.monthScene.success, success);
    assert.equal(m.progressMonthOpportunity(restored, id, 'play'), restored, 'sonuçtan yeni deneme');
    const settled = m.resolveMonthOpportunity(restored, id, true); assert(settled.monthScene.done); assert.equal(settled.player.opp_turn, restored.turn);
    assert.equal(m.resolveMonthOpportunity(settled, id), settled); if (success) assert(settled.player.money > restored.player.money); else assert.equal(settled.player.money, restored.player.money);
  }
  const passed = m.resolveMonthOpportunity(opportunity, id, true); assert(passed.monthScene.done); assert.equal(passed.player.money, opportunity.player.money); assert.equal(m.prepareMonthScene(passed), passed);
  const festival = fresh(); festival.turn = 2; festival.monthScene = undefined; const fest = m.prepareMonthScene(festival, 0);
  if (fest.monthScene?.kind === 'senlik') { const s = m.chooseMonthDilemma(fest, fest.monthScene.id, 0); assert.equal(s.player.festival_turn, s.turn); assert(s.monthScene.done); }
  const invalid = copy(dilemma.monthScene); invalid.dilemma.choices[0].delta = { money: Infinity }; assert.equal(r.repairMonthScene(invalid, dilemma), undefined);
  assert.equal(r.repairMonthScene({ ...dilemma.monthScene, turn: 999 }, dilemma), undefined);
  assert.equal(r.repairMonthScene({ ...dilemma.monthScene, generation: 9 }, dilemma), undefined);
  const dead = copy(dilemma); dead.player.dead = true; assert(!m.pendingMonthScene(dead)); assert.equal(r.repairMonthScene(dead.monthScene, dead), undefined);
  const jailed = copy(dilemma); jailed.player.jail = { left: 2 }; assert(!m.pendingMonthScene(jailed)); assert(g.advance(jailed).turn > jailed.turn, 'hapis tahliyesi kararda kilitlendi');
  const mp = copy(dilemma); mp.mpRealm = true; assert(!m.pendingMonthScene(mp)); assert.equal(m.prepareMonthScene(mp), mp); assert.equal(m.advanceWithMonthScene(mp, 6), mp);
  const unrecorded = fresh(); const mpBefore = copy(unrecorded); m.prepareMonthScene(unrecorded); assert.deepEqual(unrecorded, mpBefore, 'hazırlama girdi durumunu değiştirdi');
  const fast = fresh(); fast.turn = 0; const skipped = m.advanceWithMonthScene(fast, 6, true); assert(skipped.turn >= 1 && skipped.turn <= 6); if (m.pendingMonthScene(skipped)) assert.equal(m.advanceWithMonthScene(skipped, 6), skipped);
  console.log('AYLIK KARAR: kart/risk kaydı, yeniden açılış, sonuç/ret/çift tık, fırsat ara sonucu, hızlı ilerleme, bozuk kayıt, ölüm/hapis ve MP temiz.');
})().catch(e => { console.error(e); process.exitCode = 1; });
