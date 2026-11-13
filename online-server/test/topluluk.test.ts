// E5–E7 saf kurallar: meşrep (seçim, bedel/avantaj, yeniden seçim), hami (akçe yok, aşamada tek sefer nam, hesap
// kümesi), ortak dert (çevrimdışı katkı, defter, eşik, başarısızlık yalnız göstergeye), şenlik (levha tutar/sıra
// göstermez, kaçırmak ceza değil), müdavim (seri yok), zaviye (kasa akçeyi korur, kıdem, kuruluyor).
import test from "node:test";
import assert from "node:assert/strict";
import { arkaPlanAl } from "../src/yerlesim/arka-plan.ts";
import { kapsama } from "../src/yerlesim/barinma.ts";
import { hamiDonumu, hamiIslem, HAMI_NAM } from "../src/yerlesim/hami.ts";
import { ZAVIYE_EN_AZ, ZAVIYE_KURULUS_BEDELI, zaviyeDonumu, zaviyeIslem } from "../src/yerlesim/lonca-grup.ts";
import { MESREP_ETKI, mesrepGorus, mesrepGorunumu, mesrepNam, mesrepSec, mesrepYakalanma } from "../src/yerlesim/mesrep.ts";
import { GUN_MS, MUDAVIM_ESIKLERI, mudavimZiyaret } from "../src/yerlesim/mudavim.ts";
import { DERT_BASARISIZ_DUSUS, ORTAK_DERT_KISI_EN_COK, ortakDertDonumu, ortakDertKatki, uygunKatkilar } from "../src/yerlesim/ortak-dert.ts";
import { comertlerLevhasi, senlikDurumu, senlikKatki, SENLIK_SURE_AY } from "../src/yerlesim/senlik.ts";
import { GOSTERGE_DENGE, gostergeDegistir, gostergeOku, gostergeTetikCarpani, toplulukAl } from "../src/yerlesim/topluluk-kayit.ts";
import { toplulukDonumu } from "../src/yerlesim/topluluk.ts";
import type { Karakter } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const kalfa = (k: Karakter, m: "demirci" | "asker" = "demirci") => {
  k.ms = { a: m, y: "", s: { [m]: { kd: 1, hz: 0, cy: 0 } } };
};

test("meşrep: 13 yaşta seçilir, her uç bedel ve avantaj taşır, yeniden seçim yaşam olayına bağlı", () => {
  const k = testKasabasi("develi", 200);
  const kar = oyuncuEkle(k, 1);
  assert.deepEqual(mesrepSec(kar, { el: "comert", cesaret: "orta", gurur: "orta" }, k.ay), { ok: false, hata: "mesrep_erken" });
  const ay = k.ay + 12;
  assert.deepEqual(mesrepSec(kar, { el: "comert", cesaret: "cok", gurur: "orta" }, ay), { ok: false, hata: "mesrep_gecersiz" });
  assert.ok(mesrepSec(kar, { el: "comert", cesaret: "gozupek", gurur: "mutevazi" }, ay).ok);
  assert.equal(mesrepNam(kar, "hediye", 2), 3);
  assert.equal(mesrepNam(kar, "sohbet", 2), 2);
  assert.equal(mesrepGorus(kar), MESREP_ETKI.mutevazi.gorus);
  assert.equal(mesrepYakalanma(kar), MESREP_ETKI.gozupek.yakalanma);
  const g = mesrepGorunumu(kar, ay);
  for (const e of g.eksenler) for (const u of e.uclar) {
    assert.ok(u.etkiler.some((x) => x.tur === "avantaj"), u.uc);
    assert.ok(u.etkiler.some((x) => x.tur === "bedel"), u.uc);
    for (const x of u.etkiler) assert.equal(typeof x.p.deger, "number");
  }
  assert.deepEqual(mesrepSec(kar, { el: "hesapli", cesaret: "orta", gurur: "orta" }, ay + 1), { ok: false, hata: "mesrep_kilitli" });
  kalfa(kar);
  assert.ok(mesrepSec(kar, { el: "hesapli", cesaret: "orta", gurur: "orta" }, ay + 1).ok);
  assert.equal(mesrepNam(kar, "hediye", 2), 1);
});

test("hami: akçe almaz, aşamada tek sefer nam, aynı küme reddedilir, misafirlik konaklama sayılır", () => {
  const k = testKasabasi("develi", 300);
  const hami = oyuncuEkle(k, 1, k.ay - 20 * 12);
  const cirak = oyuncuEkle(k, 2);
  kalfa(hami);
  const simdi = 1_800_000_000_000;
  const esE = cirak.e;
  cirak.e = hami.e;
  assert.deepEqual(hamiIslem(k, hami, { islem: "teklif", hedef: cirak.o }, k.ay, simdi), { ok: false, hata: "ayni_kume" });
  cirak.e = esE === hami.e ? esE + 9999 : esE;
  const t = hamiIslem(k, hami, { islem: "teklif", hedef: cirak.o }, k.ay, simdi);
  assert.ok(t.ok, JSON.stringify(t));
  const pa = hami.pa;
  const kab = hamiIslem(k, cirak, { islem: "kabul", hedef: hami.o }, k.ay, simdi);
  assert.ok(kab.ok, JSON.stringify(kab));
  assert.equal(kapsama(cirak.br!, k.y, false, simdi + 1000)?.tur, "hami");
  const nam0 = hami.nm[0]!;
  kalfa(cirak, "asker");
  const o1 = hamiDonumu(k, k.ay + 1);
  assert.equal(o1.filter((o) => o.k === "olay.hami.asama").length, 1);
  assert.equal(hami.nm[0], nam0 + HAMI_NAM.kademe);
  assert.equal(hamiDonumu(k, k.ay + 2).length, 0);
  assert.equal(hami.nm[0], nam0 + HAMI_NAM.kademe);
  assert.equal(hami.pa, pa);
  // Bağ bitince aynı çırakla yeniden kurulamaz (nam döngüsü yok).
  assert.ok(hamiIslem(k, hami, { islem: "birak", hedef: cirak.o }, k.ay + 2, simdi).ok);
  assert.deepEqual(hamiIslem(k, hami, { islem: "teklif", hedef: cirak.o }, k.ay + 2, simdi), { ok: false, hata: "hami_uygun_degil" });
});

test("ortak dert: kıtlıkta açılır, katkı defterde adla, kişi tavanı, başarı tetiği söndürür; başarısızlık yalnız göstergeye", () => {
  const k = testKasabasi("develi", 300);
  const a = oyuncuEkle(k, 1, k.ay - 20 * 12);
  const ap = arkaPlanAl(k);
  const ay = k.ay + 1;
  ap.tt.kitlik = ay + 2;
  const ol = ortakDertDonumu(k, ay);
  assert.ok(ol.some((o) => o.k === "olay.ortakDert.acildi"));
  const d = k.tl!.od.find((x) => x.t === "kitlik")!;
  a.tk = 18;
  for (let i = 0; i < ORTAK_DERT_KISI_EN_COK; i++) assert.ok(ortakDertKatki(k, a, { dert: `d${d.i}`, katki: "elEmegi" }, ay).ok);
  assert.deepEqual(ortakDertKatki(k, a, { dert: d.i, katki: "elEmegi" }, ay), { ok: false, hata: "katki_siniri" });
  assert.equal(d.k[0]!.ad, a.ad);
  assert.deepEqual(ortakDertKatki(oyuncuEkleK(k), k.kar.get("o2")!, { dert: d.i, katki: "nobet" }, ay), { ok: false, hata: "katki_gecersiz" });
  // Eşiğe ulaşınca başarılır, kıtlık bu ay söner.
  const b = oyuncuEkle(k, 3, k.ay - 20 * 12);
  b.ev = { zahire: 10 };
  b.tk = 18;
  const r = ortakDertKatki(k, b, { dert: d.i, katki: "erzak", mal: "zahire", adet: 5 }, ay);
  assert.ok(r.ok && r.deger.yanit.basardi, JSON.stringify(r));
  assert.equal(ap.tt.kitlik, ay);
  // Başarısız dert: yalnız arz düşer; oyuncu akçesi ve Hal'i dokunulmaz.
  ap.tt.haydut = ay + 3;
  k.tl!.ss = ay + 8;
  ortakDertDonumu(k, ay + 1);
  const pa = a.pa;
  const hl = JSON.stringify(a.hl);
  const moral0 = gostergeOku(k, "moral");
  for (let m = ay + 2; m <= ay + 8; m++) ortakDertDonumu(k, m);
  const h = k.tl!.od.find((x) => x.t === "haydut")!;
  assert.equal(h.d, "basarisiz");
  assert.equal(gostergeOku(k, "moral"), moral0 - DERT_BASARISIZ_DUSUS);
  assert.equal(a.pa, pa);
  assert.equal(JSON.stringify(a.hl), hl);
  assert.ok(gostergeTetikCarpani(k, "haydut") > 1);
});

test("asker nöbet hizmeti beceriyle açılır ve ana meslek değişse de sunucuda doğrulanır", () => {
  const k = testKasabasi("develi", 300);
  const ay = k.ay + 1;
  arkaPlanAl(k).tt.haydut = ay + 2;
  ortakDertDonumu(k, ay);
  const d = k.tl!.od.find((x) => x.t === "haydut")!;
  const askerBecerili = oyuncuEkle(k, 11, k.ay - 20 * 12);
  askerBecerili.ms = {
    a: "demirci",
    y: "",
    s: {
      demirci: { kd: 0, hz: 0, cy: 0 },
      asker: { kd: 0, hz: 0, cy: 0, sv: { "asker.surNobeti": 1 } },
    },
  };
  assert.ok(uygunKatkilar(askerBecerili).includes("nobet"));
  askerBecerili.tk = 18;
  const sonuc = ortakDertKatki(k, askerBecerili, { dert: d.i, katki: "nobet" }, ay);
  assert.ok(sonuc.ok, JSON.stringify(sonuc));

  const ozanBecerili = oyuncuEkle(k, 13, k.ay - 20 * 12);
  ozanBecerili.ms = {
    a: "demirci",
    y: "",
    s: {
      demirci: { kd: 0, hz: 0, cy: 0 },
      ozan: { kd: 0, hz: 0, cy: 0, sv: { "ozan.turkuMani": 1 } },
    },
  };
  assert.ok(uygunKatkilar(ozanBecerili).includes("moral"));
  ozanBecerili.tk = 18;
  const moralSonuc = ortakDertKatki(k, ozanBecerili, { dert: d.i, katki: "moral" }, ay);
  assert.ok(moralSonuc.ok, JSON.stringify(moralSonuc));

  const becerisiz = oyuncuEkle(k, 12, k.ay - 20 * 12);
  assert.ok(!uygunKatkilar(becerisiz).includes("nobet"));
  assert.deepEqual(ortakDertKatki(k, becerisiz, { dert: d.i, katki: "nobet" }, ay), { ok: false, hata: "katki_gecersiz" });
});

function oyuncuEkleK(k: ReturnType<typeof testKasabasi>): ReturnType<typeof testKasabasi> {
  const c = oyuncuEkle(k, 2, k.ay - 20 * 12);
  c.tk = 18;
  return k;
}

test("şenlik: ilanlı, açıkken katkı; levha tutar ve sıra göstermez; kaçıran ceza almaz", () => {
  const k = testKasabasi("develi", 0);
  let acik = -1;
  for (let ay = 0; ay < 40 && acik < 0; ay++) if (senlikDurumu(ay)?.durum === "acik") acik = ay;
  assert.ok(acik >= 0);
  assert.equal(senlikDurumu(acik - 1)?.durum, "ilan");
  const z = oyuncuEkle(k, 1, acik - 20 * 12);
  const a = oyuncuEkle(k, 2, acik - 20 * 12);
  const bos = oyuncuEkle(k, 3, acik - 20 * 12);
  z.ad = "Zeynep";
  a.ad = "Ali";
  for (const c of [z, a]) {
    c.tk = 18;
    c.pa = 100;
  }
  assert.deepEqual(senlikKatki(k, z, { katki: "hayir", tutar: 5 }, acik - 1), { ok: false, hata: "senlik_yok" });
  assert.ok(senlikKatki(k, z, { katki: "hayir", tutar: 50 }, acik).ok);
  assert.ok(senlikKatki(k, a, { katki: "hayir", tutar: 1 }, acik).ok);
  assert.equal(z.pa, 50);
  const levha = comertlerLevhasi(k.tl!.sn[0]);
  assert.deepEqual(levha.map((x) => x.ad), ["Ali", "Zeynep"]);
  assert.ok(levha.every((x) => !("tutar" in x) && !("sira" in x)));
  const bosOnce = JSON.stringify(bos);
  k.tl!.ss = acik + 100; // salgın açılmasın (moral yalnız şenlikle değişsin)
  const moral0 = gostergeOku(k, "moral");
  for (let m = acik + 1; m <= acik + SENLIK_SURE_AY + 1; m++) toplulukDonumu(k, m);
  assert.equal(JSON.stringify(bos), bosOnce);
  assert.ok(k.tl!.sn[0]!.kp);
  assert.ok(gostergeOku(k, "moral") > moral0 && moral0 === GOSTERGE_DENGE);
});

test("müdavim: seri gerekmez, aynı gün bir kez, ara vermek rozeti sıfırlamaz", () => {
  const k = testKasabasi("develi", 100);
  const kar = oyuncuEkle(k, 1);
  const t0 = 1_800_000_000_000;
  assert.equal(mudavimZiyaret(kar, t0, k.ay).sayildi, true);
  assert.equal(mudavimZiyaret(kar, t0 + 1000, k.ay).sayildi, false);
  let son;
  // Üç günde bir ziyaret (seri yok) ilk eşiğe ulaşır.
  for (let i = 1; i < MUDAVIM_ESIKLERI[0]!; i++) son = mudavimZiyaret(kar, t0 + i * 3 * GUN_MS, k.ay);
  assert.equal(son?.rozet, 1);
  assert.ok(son?.olay);
  // Uzun aradan sonra rozet kalır.
  const sonra = mudavimZiyaret(kar, t0 + 400 * GUN_MS, k.ay);
  assert.equal(sonra.rozet, 1);
  assert.equal(sonra.sayi, 1);
});

test("zaviye: kuruluş bedeli, 5 kişiyle açılır, kasa akçeyi korur, kıdem ve yetki", () => {
  const k = testKasabasi("develi", 400);
  const uyeler = Array.from({ length: ZAVIYE_EN_AZ }, (_, i) => oyuncuEkle(k, i + 1, k.ay - 20 * 12));
  uyeler.forEach((u, i) => {
    u.pa = 100;
    u.e = 90000 + i;
  });
  const [ku, ...digerleri] = uyeler as [Karakter, ...Karakter[]];
  const ay = k.ay;
  assert.ok(zaviyeIslem(k, ku, { islem: "kur", ad: "Demirciler", sekil: "kalkan", renk: "al" }, ay).ok);
  assert.equal(ku.pa, 100 - ZAVIYE_KURULUS_BEDELI);
  assert.deepEqual(zaviyeIslem(k, ku, { islem: "yatir", tutar: 10 }, ay), { ok: false, hata: "zaviye_kuruluyor" });
  for (const u of digerleri) {
    assert.ok(zaviyeIslem(k, ku, { islem: "davet", hedef: u.o }, ay).ok);
    assert.deepEqual(zaviyeIslem(k, u, { islem: "davet", hedef: ku.o }, ay), { ok: false, hata: "zaviye_yok" });
    assert.ok(zaviyeIslem(k, u, { islem: "katil", zaviye: "z1" }, ay).ok);
  }
  const toplam = () => uyeler.reduce((a, u) => a + u.pa, 0) + k.tl!.zv[0]!.ks;
  const t0 = toplam();
  assert.ok(zaviyeIslem(k, digerleri[0]!, { islem: "yatir", tutar: 40 }, ay).ok);
  assert.deepEqual(zaviyeIslem(k, ku, { islem: "ver", hedef: digerleri[1]!.o, tutar: 10 }, ay), { ok: false, hata: "kidem_yetersiz" });
  assert.deepEqual(zaviyeIslem(k, digerleri[1]!, { islem: "ver", hedef: digerleri[2]!.o, tutar: 10 }, ay + 3), { ok: false, hata: "yetki_yok" });
  assert.ok(zaviyeIslem(k, ku, { islem: "ver", hedef: digerleri[1]!.o, tutar: 10 }, ay + 3).ok);
  assert.equal(toplam(), t0);
  // Ahi başı: teveccüh şartı taşımayan aday oy alamaz.
  assert.deepEqual(zaviyeIslem(k, ku, { islem: "oy", hedef: digerleri[0]!.o }, ay), { ok: false, hata: "aday_uygun_degil" });
  digerleri[0]!.tv = { p: 1000, a: ay, v: [] };
  for (const u of uyeler.slice(0, 3)) assert.ok(zaviyeIslem(k, u, { islem: "oy", hedef: digerleri[0]!.o }, ay).ok);
  assert.ok(zaviyeDonumu(k, ay + 1).some((o) => o.k === "olay.zaviye.ahiBasi"));
  assert.equal(k.tl!.zv[0]!.ab, digerleri[0]!.o);
});


test("E4.3-C nöbet asayişi haydut olayını azaltır; moral veya asayiş düşüklüğü riski artırır", () => {
  const k = testKasabasi("develi", 300);
  const tl = toplulukAl(k);
  gostergeDegistir(tl, "asayis", -10);
  assert.equal(gostergeTetikCarpani(k, "haydut"), 1.1);
  gostergeDegistir(tl, "asayis", 10);
  gostergeDegistir(tl, "moral", -15);
  assert.equal(gostergeTetikCarpani(k, "haydut"), 1.15);
  gostergeDegistir(tl, "moral", 15);
  assert.equal(gostergeTetikCarpani(k, "haydut"), 1);
});
