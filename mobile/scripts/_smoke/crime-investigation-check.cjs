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
  const original = Math.random;
  let base;
  try { Math.random = () => 0.1618033988; base = g.newGame("İz", "Sürücü", "erkek"); }
  finally { Math.random = original; }
  Object.assign(base.player, {
    age: 30, base_age: 30, money: 1200, health: 100, hunger: 90, crime_heat: 80,
    crime_wins: 30, fear: 45, faction: null, stats: { strength: 1, intelligence: 1, charisma: 1, stamina: 1 },
    skills: { combat: 0, trade: 0, crafting: 0, social: 0 },
  });
  const living = Object.values(base.pop.k).filter((k) => k.ol == null && k.loc === base.player.location_name && g.worldYears(base) - k.dy >= 20);
  assert(living.length >= 5, "Soruşturma sınaması için yaşayan şehir nüfusu yetersiz");
  const [investigator, victim, witnessA, witnessB] = living;
  const makeCase = (evidence = 65, left = 4) => {
    const s = copy(base);
    s.player.crime_case = { kind: "konak_soygunu", investigator_id: investigator.id, victim_id: victim.id, witnesses: [witnessA.id, witnessB.id], evidence, left };
    return s;
  };

  const info = g.crimeInvestigationInfo(makeCase(), "tr");
  assert.equal(info.investigatorName.length > 3, true);
  assert.equal(info.victimName.length > 3, true);
  assert.equal(info.witnessCount, 2);
  assert.equal(info.level, "medium");
  assert(g.crimeInvestigationMisdirectOdds(makeCase(25)) > g.crimeInvestigationMisdirectOdds(makeCase(90)), "Delil sahte iz ihtimalini etkilemiyor");

  const win = makeCase(60); win.rng_state = 1;
  const winOut = g.misdirectInvestigation(win);
  assert(winOut.player.crime_case.evidence < 60, "Başarılı sahte iz delili azaltmadı");
  assert.equal(winOut.player.last_crime_turn, winOut.turn, "Sahte iz aylık suç hakkını harcamadı");
  const lose = makeCase(90); lose.rng_state = 123456789;
  const loseOut = g.misdirectInvestigation(lose);
  assert(loseOut.player.crime_case.evidence > 90, "Başarısız sahte iz dosyayı güçlendirmedi");
  assert(loseOut.relationships[investigator.id] < 0, "Soruşturmacı başarısız aldatmayı hatırlamadı");

  const hidden = makeCase(25); delete hidden.player.last_crime_turn;
  const hiddenOut = g.layLow(hidden);
  assert.equal(hiddenOut.player.crime_case, undefined, "Zayıf dosya iz kaybettirmeyle kapanmadı");
  assert(hiddenOut.history.some((e) => e.k === "crime.layLow.done.case"), "İz kaybettirme dosya etkisini anlatmadı");

  const interrupted = copy(base);
  interrupted.rng_state = 1;
  interrupted.player.son_kurban = { id: victim.id, turn: interrupted.turn };
  interrupted.pendingScene = { kind: "crime", ctx: { crime: "konak_soygunu", approach: "zor", intel: "0" } };
  const escaped = g.resolveCrimeScene(interrupted, "saklan");
  assert.equal(escaped.pendingScene, null);
  assert(escaped.player.crime_case, "Kaçılan ağır işte soruşturma açılmadı");
  assert.equal(escaped.player.son_kurban, undefined, "Kaçıştan sonra geçici mağdur işareti temizlenmedi");
  const opened = g.crimeInvestigationInfo(escaped);
  assert(opened.witnessCount > 0 && opened.left >= 3 && opened.left <= 6, "Soruşturma yaşayan tanık ve 3–6 aylık süreyle açılmadı");
  assert(escaped.pop.k[escaped.player.crime_case.investigator_id]?.ol == null, "Soruşturmacı gerçek yaşayan NPC değil");

  const due = makeCase(94, 1); due.rng_state = 1;
  let court;
  try { Math.random = () => 0.99; court = g.advance(due); }
  finally { Math.random = original; }
  assert.equal(court.pendingScene?.kind, "trial", "Olgun güçlü dosya mahkemeye taşınmadı");
  assert.equal(court.player.crime_case, undefined);
  assert.equal(court.pendingScene.ctx.investigator, investigator.id);
  assert(court.history.some((e) => e.k === "crime.investigation.court"));
  const multiDue = makeCase(94, 1); multiDue.rng_state = 1;
  let multi;
  try { Math.random = () => 0.99; multi = g.advance(multiDue, 6); }
  finally { Math.random = original; }
  assert.equal(multi.turn, multiDue.turn + 1, "Çoklu ay ilerletme yeni açılan mahkemeyi atladı");
  assert.equal(multi.pendingScene?.kind, "trial");

  const weak = makeCase(15, 1); weak.rng_state = 123456789;
  let dropped;
  try { Math.random = () => 0.99; dropped = g.advance(weak); }
  finally { Math.random = original; }
  assert.equal(dropped.player.crime_case, undefined, "Zayıf olgun dosya kapanmadı");
  assert.notEqual(dropped.pendingScene?.kind, "trial");
  assert(dropped.history.some((e) => e.k === "crime.investigation.failed"));

  const damaged = makeCase(); damaged.player.crime_case = { kind: "yanlış", investigator_id: 4, witnesses: "x", evidence: "çok", left: -2 };
  assert.equal(g.migrate(damaged).player.crime_case, undefined, "Bozuk soruşturma kaydı temizlenmedi");
  const saved = g.migrate(copy(court)); assert.deepEqual(g.migrate(copy(saved)), saved, "Soruşturma/mahkeme kaydı göçte idempotent değil");

  const event = escaped.history.findLast((e) => e.k === "crime.investigation.opened");
  for (const lang of ["tr", "en", "es", "pt", "ar", "ru"]) {
    const line = renderEvt(event.k, event.text, event.p, lang, (k) => tFor(lang, k), false);
    assert(line && !/undefined|NaN|%\d|crime\.investigation\./.test(line), `${lang} soruşturma kaydı bozuk: ${line}`);
  }
  console.log("SUÇ SORUŞTURMASI: TEMİZ · gerçek NPC · 3–6 ay · delil · sahte iz · iz kaybettirme · mahkeme · kayıt · 6 dil");
})().catch((e) => { console.error(e.stack); process.exitCode = 1; });
