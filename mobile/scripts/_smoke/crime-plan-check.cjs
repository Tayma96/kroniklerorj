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
  try { Math.random = () => 0.3141592653; base = g.newGame("İz", "Sürücü", "kadın"); }
  finally { Math.random = original; }
  Object.assign(base.player, {
    age: 30, base_age: 30, money: 2000, health: 100, hunger: 90, crime_wins: 30,
    fear: 25, faction: "golge", crime_heat: 0,
    stats: { strength: 5, intelligence: 5, charisma: 5, stamina: 5 },
  });
  const noAmbient = (fn) => {
    const old = Math.random; Math.random = () => { throw new Error("Suç planı ortam Math.random kullandı"); };
    try { return fn(); } finally { Math.random = old; }
  };
  let cases = 0;

  for (const kind of ["yankesicilik", "dukkan_soyma", "soygun", "konak_soygunu"]) {
    const quiet = g.crimePlanPreview(base, kind, "sessiz");
    const trick = g.crimePlanPreview(base, kind, "hile");
    const force = g.crimePlanPreview(base, kind, "zor");
    for (const plan of [quiet, trick, force]) {
      assert(plan.success >= 0.08 && plan.success <= 0.92, kind + " başarı sınırı");
      assert(plan.attention >= 0.08 && plan.attention <= 0.92, kind + " yakalanma sınırı");
      assert(Math.abs(plan.success + plan.attention - 1) < 1e-9, kind + " görünür olasılıklar bütünü kaplamıyor");
    }
    assert(quiet.attention < trick.attention && trick.attention < force.attention, kind + " yaklaşım riski sıralı değil");
    assert(quiet.loot < trick.loot && trick.loot < force.loot, kind + " ganimet sıralı değil");
    assert(quiet.heatGain < trick.heatGain && trick.heatGain < force.heatGain, kind + " iz sıralı değil");
    const hot = copy(base); hot.player.crime_heat = 80;
    assert(g.crimePlanPreview(hot, kind, "hile").attention > trick.attention, kind + " kalıcı iz riski artırmadı");
    cases++;
  }

  let pending = 0;
  for (const approach of g.CRIME_APPROACHES) {
    for (const seed of [1, 7, 29, 113, 997, 65537]) {
      const s = copy(base); s.rng_state = seed; delete s.player.last_crime_turn;
      const before = g.crimePlanPreview(s, "konak_soygunu", approach);
      const a = noAmbient(() => g.doCrime(copy(s), "konak_soygunu", approach));
      const b = noAmbient(() => g.doCrime(copy(s), "konak_soygunu", approach));
      assert.deepEqual(a, b, approach + "/" + seed + " aynı kayıtta değişti");
      assert.equal(a.player.crime_heat, before.heatGain, approach + " iz artışı yanlış");
      assert.equal(a.player.last_crime_turn, a.turn, approach + " aylık kapıyı işlemedi");
      if (a.pendingScene?.kind === "crime") { assert.equal(a.pendingScene.ctx.approach, approach); pending++; }
      cases++;
    }
  }
  assert(pending > 0, "Yakalanma sahnesine yaklaşım aktarılmadı");

  const scene = (approach, seed) => {
    const s = copy(base); s.rng_state = seed; s.pendingScene = { kind: "crime", ctx: { crime: "konak_soygunu", approach } };
    return s;
  };
  let quietHide = false, forceRun = false, trickBribe = false;
  for (let seed = 1; seed <= 400 && !(quietHide && forceRun && trickBribe); seed++) {
    const spreadSeed = Math.imul(seed, 0x9e3779b1) >>> 0;
    const qh = noAmbient(() => g.resolveCrimeScene(scene("sessiz", spreadSeed), "saklan"));
    const fh = noAmbient(() => g.resolveCrimeScene(scene("zor", spreadSeed), "saklan"));
    if (qh.history.some((e) => e.k === "crimesc.hideWin") && !fh.history.some((e) => e.k === "crimesc.hideWin")) quietHide = true;
    const fr = noAmbient(() => g.resolveCrimeScene(scene("zor", spreadSeed), "kac"));
    const qr = noAmbient(() => g.resolveCrimeScene(scene("sessiz", spreadSeed), "kac"));
    if (fr.history.some((e) => e.k === "crimesc.runWin") && !qr.history.some((e) => e.k === "crimesc.runWin")) forceRun = true;
    const tb = noAmbient(() => g.resolveCrimeScene(scene("hile", spreadSeed), "rusvet"));
    const fb = noAmbient(() => g.resolveCrimeScene(scene("zor", spreadSeed), "rusvet"));
    if (tb.history.some((e) => e.k === "crimesc.bribeWin") && fb.history.some((e) => e.k === "crimesc.bribeLeak")) trickBribe = true;
  }
  assert(quietHide && forceRun && trickBribe, "Yaklaşımın kesinti sahnesindeki uzmanlığı çalışmadı: " + JSON.stringify({ quietHide, forceRun, trickBribe }));
  cases += 3;

  const scoutBase = copy(base); scoutBase.rng_state = 0x9e3779b1; delete scoutBase.player.last_crime_turn;
  const scouted = noAmbient(() => g.scoutCrime(copy(scoutBase), "yankesicilik"));
  assert.deepEqual(scouted, noAmbient(() => g.scoutCrime(copy(scoutBase), "yankesicilik")), "Keşif aynı kayıtta değişti");
  assert.equal(scouted.player.last_crime_turn, scouted.turn, "Keşif aylık suç hakkını tüketmedi");
  assert.equal(scouted.player.crime_intel.kind, "yankesicilik");
  assert.equal(scouted.player.crime_intel.quality, 2, "Gölge Kardeşliği nitelikli keşif vermedi");
  assert.equal(scouted.player.crime_intel.expires, scouted.turn + 4);
  assert(g.crimeIntelTargetName(scouted, "yankesicilik", "tr"), "Keşif gerçek NPC hedef seçmedi");
  const rawPlan = g.crimePlanPreview(scoutBase, "yankesicilik", "hile");
  const preparedPlan = g.crimePlanPreview(scouted, "yankesicilik", "hile");
  assert(preparedPlan.success > rawPlan.success && preparedPlan.attention < rawPlan.attention, "Keşif görünen ve gerçek oranı iyileştirmedi");
  const scoutEvent = scouted.history.at(-1); assert.equal(scoutEvent.k, "crime.scout.done.2");
  for (const lang of ["tr", "en", "es", "pt", "ar", "ru"]) {
    for (const key of ["crime.scout", "crime.scout.d", "crime.scout.replace", "crime.scout.ready.1", "crime.scout.ready.2", "crime.scout.target", "crime.scout.target.generic"]) assert.notEqual(tFor(lang, key), key, lang + " keşif çevirisi eksik: " + key);
    const line = renderEvt(scoutEvent.k, scoutEvent.text, scoutEvent.p, lang, (key) => tFor(lang, key), true);
    assert(line && !/undefined|NaN|%[a-zA-Z0-9]|crime\./.test(line), lang + " keşif olayı bozuk: " + line);
  }
  cases += 2;

  const oldTarget = scouted.player.crime_intel.victim_id;
  let usedIntel = false;
  for (let seed = 1; seed <= 400 && !usedIntel; seed++) {
    const ready = copy(scouted); ready.turn += 1; ready.rng_state = Math.imul(seed, 0x9e3779b1) >>> 0; delete ready.player.last_crime_turn;
    const out = noAmbient(() => g.doCrime(ready, "yankesicilik", "hile"));
    if (out.pendingScene?.kind === "crime") {
      assert.equal(out.player.son_kurban?.id, oldTarget, "Hazırlanan gerçek hedef suçta kullanılmadı");
      assert.equal(out.player.crime_intel, undefined, "Kullanılan keşif tüketilmedi");
      usedIntel = true;
    }
  }
  assert(usedIntel, "Hazırlanmış suçun kesinti yolu kapsanmadı"); cases++;

  const expiring = copy(scouted); expiring.player.crime_intel.expires = expiring.turn;
  try { Math.random = () => 0.5; assert.equal(g.advance(expiring).player.crime_intel, undefined, "Süresi dolan keşif temizlenmedi"); }
  finally { Math.random = original; }
  const badIntel = copy(base); badIntel.player.crime_intel = { kind: "uydurma", loc: 4, expires: "sonra", quality: 9 };
  assert.equal(g.migrate(badIntel).player.crime_intel, undefined, "Bozuk keşif kaydı onarılmadı"); cases += 2;

  const hiding = copy(base); hiding.player.crime_heat = 52; delete hiding.player.last_crime_turn;
  const laid = g.layLow(hiding);
  assert(laid.player.crime_heat < hiding.player.crime_heat, "İz kaybettirme izi azaltmadı");
  assert.equal(laid.player.last_crime_turn, laid.turn, "İz kaybettirme aylık suç hakkını tüketmedi");
  assert.equal(laid.player.money, hiding.player.money, "İz kaybettirme para üretti");
  assert.deepEqual(g.layLow(laid), laid, "Aynı ay ikinci kez iz kaybettirildi");
  const event = laid.history.at(-1); assert.equal(event.k, "crime.layLow.done");
  for (const lang of ["tr", "en", "es", "pt", "ar", "ru"]) {
    for (const key of ["crime.plan.sessiz", "crime.plan.hile", "crime.plan.zor", "crime.heat.title", "crime.layLow"]) assert.notEqual(tFor(lang, key), key, lang + " çeviri eksik: " + key);
    const line = renderEvt(event.k, event.text, event.p, lang, (key) => tFor(lang, key), true);
    assert(line && !/undefined|NaN|%[a-zA-Z0-9]|crime\./.test(line), lang + " olay metni bozuk: " + line);
  }
  cases++;

  const cooling = copy(base); cooling.player.crime_heat = 40; cooling.player.faction = "golge";
  try { Math.random = () => 0.5; assert.equal(g.advance(cooling).player.crime_heat, 37, "Aylık iz soğuması yanlış"); }
  finally { Math.random = original; }
  const damaged = copy(base); damaged.player.crime_heat = 180; assert.equal(g.migrate(damaged).player.crime_heat, 100);
  const broken = copy(base); broken.player.crime_heat = "yoğun"; assert.equal(g.migrate(broken).player.crime_heat, undefined);
  cases += 2;

  console.log(`SUÇ PLANI: TEMİZ · ${cases} senaryo · 4 suç × 3 yaklaşım · gerçek hedefli keşif · görünür oran · kalıcı iz · aylık soğuma · iz kaybettirme · kayıtlı zar · eski kayıt · 6 dil`);
})().catch((e) => { console.error(e.stack); process.exitCode = 1; });
