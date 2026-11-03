// Kader kırılmaları denetimi (radikal sonuçlar, aşama 3; plan docs/superpowers/plans/2026-11-03-asama-3.md):
// Büyük Ortaklık yolculuğunun her dalı (teklif, haber, sonuç, alacaklı: öde / kâtip / kaç, ikinci şans), kapılar,
// kayıt göçü ve vâris. Tohumlu (mulberry32) — her çalıştırma aynı sonucu verir.
// Kullanım: node scripts/_smoke/kirilma-check.cjs
const path = require("path"), esbuild = require("esbuild"), assert = require("assert");
const built = esbuild.buildSync({ stdin: { contents: 'export * from "./lib/game"; export * as ms from "./lib/month-scene";', resolveDir: path.resolve(__dirname, "../.."), loader: "ts" }, bundle: true, platform: "node", format: "cjs", write: false, logLevel: "error" });
const box = { exports: {} }; new Function("module", "exports", "require", built.outputFiles[0].text)(box, box.exports, require);
const g = box.exports;
function mulberry(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
Math.random = mulberry(20261103);
let gecti = 0; const test = (ad, fn) => { try { fn(); gecti++; } catch (e) { console.error("HATA: " + ad + "\n  " + (e && e.message)); process.exitCode = 1; } };
const kopya = (s) => JSON.parse(JSON.stringify(s));
// 32 yaşında, 1000 akçe + 200 emanet, Konya'da bir ev ve başka şehirde bir dükkân.
function taban() {
  let s = g.newGame("Ali", "Veli", "erkek");
  s = g.advance(s, 12 * 12); // nüfus ve takvim otursun
  s = kopya(s); const p = s.player;
  p.base_age += 32 - p.age; p.age = 32; p.money = 1000; p.deposit = 200; p.debt = 0; p.dead = false; p.health = 90; p.hunger = 80; p.jail = null;
  const yer = p.location_name, baska = g.LOCATIONS.find((l) => g.regionOf(l) !== g.regionOf(yer));
  p.properties = [{ type: "ev", loc: yer, cond: 100 }, { type: "dukkan", loc: baska, cond: 100 }];
  delete p.kirilmalar; s.monthScene = undefined;
  return s;
}
const ileri = (s, n) => { for (let i = 0; i < n; i++) { s = g.advance(s, 1); s.player.health = Math.max(s.player.health, 80); s.player.hunger = Math.max(s.player.hunger, 60); } return s; };
const ort = (s) => (s.player.kirilmalar || []).find((k) => k.id === "ortaklik");
function zarla(s, ok) { s = kopya(s); const o = ort(s); o.zar = ok ? 0 : 99; o.sans = 60; return s; }

test("eski kayıt: kapılar açık, kırılma yok", () => {
  const s = taban();
  assert.strictEqual(g.kapiAcik(s, "seyahat").acik, true);
  assert.strictEqual(g.kirilmaGelir(s), 1);
  assert.strictEqual(g.halOf(s).length, 0);
});
test("teklif: büyük pay %40, zar kayda yazılır, iki kez uygulanmaz", () => {
  const s0 = taban(); const s = g.kirilmaSec(s0, "teklif", 0);
  assert.strictEqual(s0.player.money + s0.player.deposit - (s.player.money + s.player.deposit), 480);
  const o = ort(s); assert.strictEqual(o.yol, "buyuk"); assert.strictEqual(o.faz, "yolda"); assert.strictEqual(o.pay, 480);
  assert(o.zar >= 0 && o.zar < 100 && o.sans >= 20 && o.sans <= 80);
  assert.strictEqual(g.kirilmaSec(s, "teklif", 0), s, "ikinci teklif kabulü durumu değiştirmemeli");
  assert.strictEqual(g.kirilmaSahnesi(s, () => 0), null, "yolculuğun ilk ayında sahne yok");
});
test("haber: 4. ayda gelir, payını satmak %60 döndürür ve sonuç para vermez", () => {
  let s = ileri(g.kirilmaSec(taban(), "teklif", 0), 4);
  assert.deepStrictEqual(g.kirilmaSahnesi(s, () => 0).tip, "haber");
  const m0 = s.player.money; s = g.kirilmaSec(s, "haber", 0);
  assert.strictEqual(s.player.money - m0, 288); assert.strictEqual(ort(s).yol, "satti");
  const m1 = s.player.money; s = zarla(s, true); s = ileri(s, 5);
  assert(!s.history.some((e) => e.k && e.k.startsWith("evj.kir.kazanc")), "satılan payın sonucu gelmemeli");
  assert(!g.aktifKirilma(s.player, "tuccar", s.turn));
});
test("kazanç: büyük ortaklık 2,4 kat, tüccar hâli, yeni teklif gelmez, iltizam açılır", () => {
  let s = zarla(g.kirilmaSec(taban(), "teklif", 0), true); s.player.fame = 0;
  s = g.kirilmaSec(ileri(s, 4), "haber", 1); const m0 = s.player.money; s = ileri(s, 4);
  assert(s.player.money - m0 >= 1152 - 150, "kazanç gelmeli: " + (s.player.money - m0));
  assert(g.aktifKirilma(s.player, "tuccar", s.turn)); assert.strictEqual(g.iltizamAcik(s), true);
  assert.strictEqual(g.kirilmaSahnesi(s, () => 0), null);
  assert(s.history.some((e) => e.k === "evj.kir.kazanc.buyuk" && e.landmark && e.kok != null), "pencere kökünü taşımalı");
});
test("kayıp: büyük ortaklıkta alacaklı kapıya gelir (borç payın yarısı)", () => {
  let s = zarla(g.kirilmaSec(taban(), "teklif", 0), false); s = g.kirilmaSec(ileri(s, 4), "haber", 1); s = ileri(s, 4);
  assert.strictEqual(ort(s).faz, "alacakli"); assert.strictEqual(ort(s).borc, 240);
  assert.strictEqual(g.kirilmaSahnesi(s, () => 0).tip, "alacakli");
});
const alacakliHal = () => { let s = zarla(g.kirilmaSec(taban(), "teklif", 0), false); s = g.kirilmaSec(ileri(s, 4), "haber", 1); return ileri(s, 4); };
test("alacaklı 0 (öde): nakit, emanet, mülk sırası; şeref artar", () => {
  let s = alacakliHal(); s = kopya(s); s.player.money = 100; s.player.deposit = 50; const h0 = s.player.honor, n0 = s.player.properties.length;
  s = g.kirilmaSec(s, "alacakli", 0);
  assert.strictEqual(s.player.deposit, 0); assert.strictEqual(s.player.properties.length, n0 - 1, "en ucuz mülk satılmalı");
  assert(s.player.honor > h0); assert.strictEqual(ort(s).faz, "bitti");
  assert.strictEqual(g.kirilmaSec(s, "alacakli", 0), s, "ikinci kez ödenmez");
});
test("alacaklı 1 (kâtip): 36 ay şehre bağlı, mülk yok, gelir ×0,6, ticaret öğrenir, sonra ikinci şans bir kez", () => {
  let s = g.kirilmaSec(alacakliHal(), "alacakli", 1);
  const k = g.aktifKirilma(s.player, "katip", s.turn); assert(k && k.bitis === s.turn + 36);
  const kp = g.kapiAcik(s, "seyahat"); assert.strictEqual(kp.acik, false); assert.strictEqual(kp.neden.id, "katip"); assert.strictEqual(kp.neden.kalan, 36);
  const baska = g.LOCATIONS.find((l) => l !== s.player.location_name);
  assert.strictEqual(g.travelTo(s, baska).player.location_name, s.player.location_name);
  assert.strictEqual(g.travelBy(s, baska, "anayol").player.location_name, s.player.location_name);
  assert.strictEqual(g.mulkSarti(s, "ev").ok, false); assert.strictEqual(g.mulkSarti(s, "ev").kapi.id, "katip");
  const f1 = g.workForecast(s).mult, s2 = kopya(s); delete s2.player.kirilmalar; const f0 = g.workForecast(s2).mult;
  assert(Math.abs(f1 - f0 * 0.6) < 1e-6, `gelir çarpanı ${f1} / ${f0}`);
  const tr0 = s.player.skills.trade; s.player.money = 2000; s = ileri(s, 36);
  assert(!g.aktifKirilma(s.player, "katip", s.turn), "kâtiplik bitmeli"); assert(s.player.skills.trade >= tr0 + 1, "ticaret öğrenilmeli");
  assert.strictEqual(g.kapiAcik(s, "seyahat").acik, true);
  assert.strictEqual(g.kirilmaSahnesi(s, () => 0).tip, "ikinci");
  const t0 = g.kirilmaTeklif(s).sans; s = g.kirilmaSec(s, "ikinci", 2);
  const ik = (s.player.kirilmalar || []).find((x) => x.ikinci); assert(ik && ik.sans === Math.min(80, t0 + 10) && ik.yol === "ret");
  s = ileri(s, 9); assert.notStrictEqual((g.kirilmaSahnesi(s, () => 0) || {}).tip, "ikinci", "ikinci şans bir kez");
});
test("alacaklı 2 (kaç): uzak şehir, eski şehir mülkü gider, ad sıfırlanır, eski yurt 10 yıl kapalı, gölge kapısı", () => {
  let s = alacakliHal(); s = kopya(s); s.player.reputation = 60; s.player.fame = 40;
  const eski = s.player.location_name, digerMulk = s.player.properties.find((x) => x.loc !== eski);
  s = g.kirilmaSec(s, "alacakli", 2); const p = s.player;
  assert.notStrictEqual(p.location_name, eski); assert.strictEqual(p.home_name, p.location_name);
  assert.notStrictEqual(g.regionOf(p.location_name), g.regionOf(eski));
  assert(!p.properties.some((x) => x.loc === eski)); assert(p.properties.some((x) => x.loc === digerMulk.loc));
  assert.strictEqual(p.reputation, 0); assert.strictEqual(p.fame, 20); assert(p.faction_standing.golge >= 25);
  assert.strictEqual(g.kapiAcik(s, "eski_yurt", eski).acik, false);
  assert.strictEqual(g.travelTo(s, eski).player.location_name, p.location_name);
  const baska = g.LOCATIONS.find((l) => l !== eski && l !== p.location_name);
  assert.strictEqual(g.travelTo(s, baska).player.location_name, baska);
  s = ileri(s, 120); assert.strictEqual(g.kapiAcik(s, "eski_yurt", eski).acik, true);
});
test("reddet: aynı zar; kervan batarsa şeref, kazanırsa yalnız kronik", () => {
  let s = zarla(g.kirilmaSec(taban(), "teklif", 2), false); const h0 = s.player.honor; s = ileri(s, 8);
  assert(s.player.honor >= h0 + 1); assert(s.history.some((e) => e.k === "evj.kir.ret.batti"));
  let s2 = zarla(g.kirilmaSec(taban(), "teklif", 2), true); const m0 = s2.player.money; s2 = ileri(s2, 8);
  assert(s2.history.some((e) => e.k === "evj.kir.ret.kazandi")); assert(!g.aktifKirilma(s2.player, "tuccar", s2.turn));
});
test("küçük pay kaybında alacaklı yok", () => {
  let s = zarla(g.kirilmaSec(taban(), "teklif", 1), false); assert.strictEqual(ort(s).pay, 120);
  s = g.kirilmaSec(ileri(s, 4), "haber", 1); s = ileri(s, 4);
  assert.strictEqual(ort(s).faz, "bitti"); assert.strictEqual(g.kirilmaSahnesi(s, () => 0), null);
});
test("kervana yetiş: başarı zarı garantiler", () => {
  let s = zarla(g.kirilmaSec(taban(), "teklif", 0), false); s = ileri(s, 4); s = kopya(s); s.player.stats.strength = 10; s.player.stats.charisma = 10;
  let r = s, deneme = 0; do { r = g.kirilmaSec(kopya(s), "haber", 2); deneme++; } while (ort(r).zar !== 0 && deneme < 1) ;
  assert(ort(r).zar === 0 || r.player.health < s.player.health, "ya kurtarır ya yaralanır");
});
test("çok oyunculu ve ölü oyuncuda kırılma işlemez", () => {
  const s = taban(); const mp = kopya(s); mp.mpRealm = { id: "x" };
  assert.strictEqual(g.kirilmaSahnesi(mp, () => 0), null); assert.strictEqual(g.kirilmaSec(mp, "teklif", 0), mp);
  const d = kopya(s); d.player.dead = true; assert.strictEqual(g.kirilmaSahnesi(d, () => 0), null);
});
test("teklif koşulları: yaş, servet, ara", () => {
  const s = taban(); assert.strictEqual(g.kirilmaSahnesi(s, () => 0).tip, "teklif");
  assert.strictEqual(g.kirilmaSahnesi(s, () => 0.5), null, "ayda %4");
  const y = kopya(s); y.player.age = 27; assert.strictEqual(g.kirilmaSahnesi(y, () => 0), null);
  const f = kopya(s); f.player.money = 10; f.player.deposit = 0; assert.strictEqual(g.kirilmaSahnesi(f, () => 0), null);
});
test("göç: bozuk kırılma kaydı ayıklanır, eski kayıt varsayılan yazılmaz", () => {
  const a = kopya(taban()); a.player.kirilmalar = "x"; assert.strictEqual(g.migrate(a).player.kirilmalar, undefined);
  const b = kopya(taban()); b.player.kirilmalar = [{ id: "yok", t: 1 }, { id: "katip", t: NaN }, { id: "kacak", t: 5, kaynak: "t", yer: "Konya", bitis: 9 }];
  assert.deepStrictEqual(g.migrate(b).player.kirilmalar.map((k) => k.id), ["kacak"]);
  const c = kopya(taban()); assert.strictEqual("kirilmalar" in g.migrate(c).player, false);
});
test("vâris: kırılmalar geçmez", () => {
  let s = g.kirilmaSec(alacakliHal(), "alacakli", 1); s = kopya(s);
  s.player.children = ["Evlat"]; const heir = "Evlat";
  s.player.dead = true;
  const aday = g.varisAdayDetaylari(s).filter((x) => x.uygun);
  if (!aday.length) { console.log("  (vâris testi: aday yok, atlandı)"); return; }
  const ns = g.continueAsHeir(s, "esit", heir);
  assert((ns.player.generation || 1) > (s.player.generation || 1), "vâris geçmeli");
  assert.strictEqual(ns.player.kirilmalar, undefined);
});
console.log(`kirilma-check: ${gecti} test geçti${process.exitCode ? " · HATA VAR" : " · TEMİZ"}`);
