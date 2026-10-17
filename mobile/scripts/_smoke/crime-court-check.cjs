const assert = require("node:assert/strict");
const path = require("node:path");
const esbuild = require("esbuild");
const copy = (x) => structuredClone(x);

(async () => {
  const built = await esbuild.build({
    stdin: { contents: 'export * as g from "./lib/game"; export {tFor,renderEvt} from "./lib/i18n";', resolveDir: path.resolve(__dirname, "../.."), loader: "ts" },
    bundle: true, platform: "node", format: "cjs", write: false,
  });
  const box = { exports: {} };
  new Function("module", "exports", "require", built.outputFiles[0].text)(box, box.exports, require);
  const { g, tFor, renderEvt } = box.exports;
  const oldRandom = Math.random;
  let base;
  try { Math.random = () => 0.2718281828; base = g.newGame("Duruşma", "Sınaması", "kadın"); }
  finally { Math.random = oldRandom; }
  Object.assign(base.player, {
    age: 30, base_age: 30, money: 2000, health: 100, hunger: 80, crime_heat: 72,
    crime_wins: 30, fear: 50, faction: "golge", honor: 30, reputation: 20,
    stats: { strength: 5, intelligence: 6, charisma: 7, stamina: 5 },
  });
  const living = Object.values(base.pop.k).filter((k) => k.ol == null && k.id !== base.player.mother_id && k.id !== base.player.father_id);
  assert(living.length >= 5, "Mahkeme sınaması için yaşayan nüfus yetersiz");
  const [victim, prosecutionA, prosecutionB, friend] = living;

  const makeCase = (score = 68) => {
    const s = copy(base);
    s.player.son_kurban = { id: victim.id, turn: s.turn };
    s.relationships[friend.id] = 82;
    s.relationships[prosecutionA.id] = 99; // iddia tanığı yüksek ilişkili olsa bile savunma tanığı seçilemez
    s.pendingScene = { kind: "trial", ctx: { crime: "soygun", approach: "zor", evidence: String(score), witnesses: `${prosecutionA.id},${prosecutionB.id}`, victim: victim.id } };
    return s;
  };

  const c = makeCase();
  const evidence = g.trialEvidence(c, "tr");
  assert.equal(evidence.score, 68);
  assert.equal(evidence.level, "medium");
  assert.equal(evidence.witnessCount, 2);
  assert.equal(evidence.witnessNames.length, 2);
  assert(evidence.victimName, "Gerçek mağdur adı dosyada görünmedi");
  const witness = g.trialWitnessInfo(c, "tr");
  assert.equal(witness.id, friend.id, "Savunma için gerçek yaşayan dost seçilmedi");
  assert.notEqual(witness.id, prosecutionA.id, "İddia tanığı savunma tanığına dönüştü");
  assert(g.trialDefenseOdds(makeCase(30)) > g.trialDefenseOdds(makeCase(90)), "Delil gücü savunma ihtimalini etkilemiyor");
  assert(g.trialWitnessInfo(makeCase(30)).chance > g.trialWitnessInfo(makeCase(90)).chance, "Delil gücü dost tanıklığını etkilemiyor");

  const cost = g.trialSettlementCost(c);
  assert(cost > g.CRIME_TYPES.soygun.fine, "Uzlaşma olağan cezadan ucuz kaldı");
  const poor = makeCase(); poor.player.money = cost - 1;
  const poorOut = g.resolveTrial(poor, "uzlas");
  assert.equal(poorOut.pendingScene?.kind, "trial", "Parası yetmeyen oyuncu dosyayı kapattı");
  const settled = g.resolveTrial(c, "uzlas");
  assert.equal(settled.pendingScene, null);
  assert.equal(settled.player.money, c.player.money - cost);
  assert.equal(settled.player.son_kurban, undefined);
  assert.equal(settled.player.crime_heat, 54);
  assert(settled.relationships[victim.id] <= -12, "Uzlaşmanın mağdur ilişkisine bedeli yazılmadı");
  assert(settled.history.some((e) => e.k === "trial.settle.done"), "Uzlaşma kroniğe yazılmadı");
  const settlementEvent = settled.history.findLast((e) => e.k === "trial.settle.done");
  for (const lang of ["tr", "en", "es", "pt", "ar", "ru"]) {
    const line = renderEvt(settlementEvent.k, settlementEvent.text, settlementEvent.p, lang, (k) => tFor(lang, k), true);
    assert(line && !/undefined|NaN|%\d|trial\./.test(line), `${lang} uzlaşma kaydı bozuk: ${line}`);
  }

  const deadFriend = makeCase(); deadFriend.pop.k[friend.id].ol = g.worldYears(deadFriend);
  assert.equal(g.trialWitnessInfo(deadFriend), null, "Ölü kişi mahkemede savunma tanığı sayıldı");

  let opened = null;
  const interrupted = copy(base);
  interrupted.player.faction = null; interrupted.player.stats = { strength: 1, intelligence: 1, charisma: 1, stamina: 1 };
  interrupted.player.son_kurban = { id: victim.id, turn: interrupted.turn };
  interrupted.pendingScene = { kind: "crime", ctx: { crime: "konak_soygunu", approach: "zor", intel: "2" } };
  for (const escapeSeed of [123456789, 362436069, 521288629, 88675123, 5783321]) {
    const caught = copy(interrupted); caught.rng_state = escapeSeed;
    const result = g.resolveCrimeScene(caught, "saklan");
    if (result.pendingScene?.kind === "trial") { opened = result; break; }
  }
  assert(opened, "Ağır suçtan gerçek mahkeme dosyası açılamadı");
  const openedInfo = g.trialEvidence(opened);
  assert(Number.isFinite(openedInfo.score) && openedInfo.score >= 20, "Mahkeme delil gücü kaydedilmedi");
  assert(openedInfo.witnessCount > 0, "Olayın gerçek görgü tanıkları dosyaya girmedi");
  for (const id of opened.pendingScene.ctx.witnesses.split(",")) assert(opened.pop.k[id]?.ol == null, "Dosyada yaşayan nüfusa bağlı olmayan tanık var");

  console.log(`SUÇ MAHKEMESİ: TEMİZ · gerçek mağdur · ${openedInfo.witnessCount} iddia tanığı · yaşayan savunma tanığı · delil oranları · ağır uzlaşma`);
})().catch((e) => { console.error(e.stack); process.exitCode = 1; });
