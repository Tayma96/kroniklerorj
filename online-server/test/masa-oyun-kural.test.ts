// Han masa oyunları, saf kurallar: Çanak Zarı ve Dokuz Taş motorları (geçerli/geçersiz hamle, bitiş, beraberlik),
// çatı durum makinesi (bekleme → oyun → bitti), tekrar güvenliği, kopma/pas/dağıtma, tohum taahhüdü ve denetim
// (yeniden oynatma), depo kaydı çözümü, görünüm izin listesi.
import test from "node:test";
import assert from "node:assert/strict";
import { CANAK, CANAK_EL_EN_COK, CANAK_HEDEF, elDegeri, type CanakDurumu } from "../src/han/oyun/canak.ts";
import { DOKUZ_SESSIZ_EN_COK, DOKUZ_TAS, DOKUZ_TAS_OYUNU as DT, KOMSU, NOKTA, UCLEMELER, alinabilir, type DokuzDurumu } from "../src/han/oyun/dokuztas.ts";
import {
  adimZari,
  masaOyunuCoz,
  OYUN_KOPMA_SABRI_MS,
  oyunAc,
  oyunBaslat,
  oyunDagit,
  oyunDenetle,
  oyundanCekil,
  oyunGorunumu,
  oyunHamle,
  oyunKatil,
  oyunPas,
  oyunuYenidenOyna,
  taahhutHesapla,
  type MasaOyunu,
} from "../src/han/oyun/cati.ts";
import type { Zar } from "../src/yerlesim/rastgele.ts";

/** Verilen zar değerlerini sırayla (döngüyle) veren üreteç. */
function sirali(...degerler: number[]): Zar {
  let i = 0;
  return () => (degerler[i++ % degerler.length]! - 1) / 6 + 0.01;
}
const Z = sirali(3);
const ok = <T>(r: { ok: true; deger: T } | { ok: false; hata: string }): T => {
  assert.equal(r.ok, true, JSON.stringify(r));
  return (r as { ok: true; deger: T }).deger;
};
const hataOf = (r: { ok: boolean; hata?: string }) => (r.ok ? "ok" : r.hata);

// ---------------------------------------------------------------- Çanak

test("Çanak: el sırası üçlü > sıralı > çift > tek; aynı türde büyük zar üstün", () => {
  const k = (z: number[]) => elDegeri(z).anahtar.join(",");
  assert.equal(elDegeri([2, 2, 2]).tur, "uclu");
  assert.equal(elDegeri([3, 1, 2]).tur, "sirali");
  assert.equal(elDegeri([5, 1, 5]).tur, "cift");
  assert.equal(elDegeri([6, 1, 3]).tur, "tek");
  const sira = [[1, 1, 1], [6, 5, 4], [1, 2, 3], [6, 6, 1], [2, 2, 6], [6, 5, 3], [4, 2, 1]];
  for (let i = 1; i < sira.length; i++) assert.ok(k(sira[i - 1]!) > k(sira[i]!) || elDegeri(sira[i - 1]!).anahtar[0]! > elDegeri(sira[i]!).anahtar[0]!, `${sira[i - 1]} > ${sira[i]}`);
  assert.ok(elDegeri([2, 2, 6]).anahtar[1]! < elDegeri([6, 6, 1]).anahtar[1]!);
});

test("Çanak: sıra, geçersiz hamle biçimleri, yenilenen sayısı açık, el sonunda açılır ve el yazılır", () => {
  // p0: 6,6,6 (üçlü), p1: 1,2,4 (tek)
  let d = CANAK.kur(2, sirali(6, 6, 6, 1, 2, 4));
  assert.equal(CANAK.sira(d), 0);
  assert.equal(hataOf(CANAK.hamle(d, 1, { tut: true }, Z)), "sira_degil");
  for (const kotu of [null, [], {}, { tut: false }, { yenile: [] }, { yenile: [0, 0] }, { yenile: [3] }, { yenile: [0, 1, 2, 0] }, { tut: true, yenile: [1] }, { yenile: "0" }]) {
    assert.equal(hataOf(CANAK.hamle(d, 0, kotu, Z)), "hamle_gecersiz", JSON.stringify(kotu));
  }
  d = ok(CANAK.hamle(d, 0, { tut: true }, Z));
  assert.equal(CANAK.sira(d), 1);
  assert.deepEqual(CANAK.acik(d).yeniledi, [0, null]);
  // p1 iki zarını yeniler: 3,5 → 3,5,4 sıralı ama üçlü kazanır. Yeni elin zarları: 1,1,1 / 2,2,2.
  d = ok(CANAK.hamle(d, 1, { yenile: [0, 1] }, sirali(3, 5, 1, 1, 1, 2, 2, 2)));
  const g = d.gecmis[0]!;
  assert.deepEqual(g.zarlar, [[6, 6, 6], [3, 5, 4]]);
  assert.deepEqual(g.turler, ["uclu", "sirali"]);
  assert.equal(g.alan, 0);
  assert.deepEqual(d.kazanc, [1, 0]);
  assert.equal(d.el, 2);
  assert.equal(d.acan, 1, "eli açan döner");
  assert.equal(CANAK.sira(d), 1);
  assert.deepEqual(d.zarlar, [[1, 1, 1], [2, 2, 2]]);
});

test("Çanak: eşit en iyi el kimseye yazılmaz; hedefe ulaşan kazanır", () => {
  let d: CanakDurumu = CANAK.kur(2, sirali(4, 4, 1, 4, 1, 4));
  d = ok(CANAK.hamle(d, 0, { tut: true }, Z));
  d = ok(CANAK.hamle(d, 1, { tut: true }, sirali(6, 6, 6, 1, 2, 4)));
  assert.equal(d.gecmis[0]!.alan, null);
  assert.deepEqual(d.kazanc, [0, 0]);
  // p0 her elde 6,6,6, p1 1,2,4 → p0 CANAK_HEDEF el alır.
  for (let e = 0; e < CANAK_HEDEF; e++) {
    const s = CANAK.sira(d)!;
    d = ok(CANAK.hamle(d, s, { tut: true }, Z));
    d = ok(CANAK.hamle(d, CANAK.sira(d)!, { tut: true }, sirali(6, 6, 6, 1, 2, 4)));
  }
  assert.deepEqual(CANAK.sonuc(d), { kazanan: [0], berabere: false });
  assert.equal(CANAK.sira(d), null);
  assert.equal(hataOf(CANAK.hamle(d, 0, { tut: true }, Z)), "sira_degil");
  assert.deepEqual(CANAK.ozel(d, 0), {}, "bitince gizli ek yok");
});

test("Çanak: el sınırında en çok el alan kazanır, eşitlikte berabere", () => {
  let d: CanakDurumu = { ...CANAK.kur(2, Z), el: CANAK_EL_EN_COK, kazanc: [2, 2], zarlar: [[1, 1, 1], [1, 1, 1]] };
  d = ok(CANAK.hamle(d, 0, { tut: true }, Z));
  d = ok(CANAK.hamle(d, 1, { tut: true }, Z));
  assert.deepEqual(CANAK.sonuc(d), { kazanan: [0, 1], berabere: true });
  let e: CanakDurumu = { ...CANAK.kur(2, Z), el: CANAK_EL_EN_COK, kazanc: [2, 1], zarlar: [[1, 1, 1], [2, 2, 2]] };
  e = ok(CANAK.hamle(e, 0, { tut: true }, Z));
  e = ok(CANAK.hamle(e, 1, { tut: true }, Z));
  assert.deepEqual(CANAK.sonuc(e), { kazanan: [0, 1], berabere: true }, "son eli alan 1, 2-2");
});

test("Çanak: çekilen sıradan düşer, iki kişi kalınca oyun süremez; pas yalnız sıradakine 'tut'", () => {
  let d = CANAK.kur(3, sirali(1, 2, 4, 6, 6, 6, 2, 2, 5));
  assert.equal(CANAK.pasGec(d, 1, Z), undefined, "sırası değilse pas yok");
  d = CANAK.pasGec(d, 0, Z)!;
  assert.deepEqual(d.yeniledi, [0, null, null]);
  d = CANAK.cekil(d, 1, sirali(3, 3, 3, 4, 4, 4, 5, 5, 5))!;
  assert.deepEqual(d.cikti, [false, true, false]);
  // 1 çekildi → sıra 2'de; 2 tutunca el açılır, 1'in zarı açılmaz.
  assert.equal(CANAK.sira(d), 2);
  d = ok(CANAK.hamle(d, 2, { tut: true }, Z));
  assert.equal(d.gecmis[0]!.zarlar[1], null);
  assert.equal(d.gecmis[0]!.alan, 2);
  assert.equal(CANAK.cekil(d, 0, Z), undefined, "bir kişi kalacaksa oyun dağılır");
});

// ---------------------------------------------------------------- Dokuz Taş

test("Dokuz Taş: tahta 24 nokta, komşuluk simetrik, 16 üçleme; her nokta iki üçlemede", () => {
  assert.equal(KOMSU.length, NOKTA);
  for (let p = 0; p < NOKTA; p++) for (const q of KOMSU[p]!) assert.ok(KOMSU[q]!.includes(p), `${p}-${q}`);
  assert.equal(UCLEMELER.length, 16);
  for (let p = 0; p < NOKTA; p++) assert.equal(UCLEMELER.filter((u) => u.includes(p)).length, 2, `nokta ${p}`);
  assert.deepEqual(KOMSU[1], [0, 2, 9]);
  assert.deepEqual(KOMSU[9], [1, 8, 10, 17]);
});

function tahta(ak: number[], kara: number[]): number[] {
  const t = Array.from({ length: NOKTA }, () => -1);
  for (const p of ak) t[p] = 0;
  for (const p of kara) t[p] = 1;
  return t;
}

test("Dokuz Taş: koyma, dolu noktaya koyamaz, sırası değilse oynayamaz, yanlış aşama biçimi reddedilir", () => {
  let d = DT.kur(2, Z);
  assert.deepEqual(d.el, [DOKUZ_TAS, DOKUZ_TAS]);
  assert.equal(hataOf(DT.hamle(d, 1, { koy: 0 }, Z)), "sira_degil");
  d = ok(DT.hamle(d, 0, { koy: 0 }, Z));
  assert.equal(hataOf(DT.hamle(d, 1, { koy: 0 }, Z)), "hamle_gecersiz");
  assert.equal(hataOf(DT.hamle(d, 1, { kaynak: 0, hedef: 1 }, Z)), "hamle_gecersiz");
  assert.equal(hataOf(DT.hamle(d, 1, { koy: 24 }, Z)), "hamle_gecersiz");
  assert.equal(hataOf(DT.hamle(d, 1, { koy: 5, al: 0 }, Z)), "hamle_gecersiz", "üçleme yokken alma");
  d = ok(DT.hamle(d, 1, { koy: 5 }, Z));
  assert.deepEqual([d.el, d.sira, d.son], [[8, 8], 0, { kim: 1, hedef: 5 }]);
});

test("Dokuz Taş: üçleme kuran taş almak zorunda; üçlemedeki taş yalnız hepsi üçlemedeyse alınır", () => {
  const d: DokuzDurumu = { tahta: tahta([0, 1], [8, 9, 10, 20]), el: [7, 5], sira: 0, sessiz: 0 };
  assert.equal(hataOf(DT.hamle(d, 0, { koy: 2 }, Z)), "hamle_gecersiz", "alma eksik");
  assert.equal(hataOf(DT.hamle(d, 0, { koy: 2, al: 9 }, Z)), "hamle_gecersiz", "üçlemedeki taş");
  const y = ok(DT.hamle(d, 0, { koy: 2, al: 20 }, Z));
  assert.equal(y.tahta[20], -1);
  assert.deepEqual(alinabilir(tahta([0, 1, 2], [8, 9, 10]), 0), [8, 9, 10], "hepsi üçlemedeyse hepsi alınabilir");
  const h = ok(DT.hamle({ ...d, tahta: tahta([0, 1], [8, 9, 10]) }, 0, { koy: 2, al: 9 }, Z));
  assert.equal(h.tahta[9], -1);
});

test("Dokuz Taş: sürme komşuya; üç taş kalınca uçar; rakip ikiye düşünce ya da kıpırdayamayınca kazanılır", () => {
  const surme: DokuzDurumu = { tahta: tahta([0, 2, 4, 6, 9], [1, 3, 5, 7, 12]), el: [0, 0], sira: 0, sessiz: 0 };
  assert.equal(hataOf(DT.hamle(surme, 0, { kaynak: 9, hedef: 20 }, Z)), "hamle_gecersiz", "komşu değil");
  assert.equal(hataOf(DT.hamle(surme, 0, { koy: 20 }, Z)), "hamle_gecersiz", "elde taş yok");
  const y = ok(DT.hamle(surme, 0, { kaynak: 9, hedef: 8 }, Z));
  assert.equal(y.sessiz, 1);
  // Uçma: ak'ın 3 taşı var.
  const uc: DokuzDurumu = { tahta: tahta([0, 1, 20], [10, 11, 12, 13]), el: [0, 0], sira: 0, sessiz: 3 };
  assert.equal((DT.acik(uc).ucma as boolean[])[0], true);
  // 20'den 2'ye uçar, 0-1-2 üçlemesi: kara 3 taşa düşer (oyun sürer), sessiz sıfırlanır.
  const u2 = ok(DT.hamle(uc, 0, { kaynak: 20, hedef: 2, al: 13 }, Z));
  assert.equal(u2.sessiz, 0);
  assert.equal(u2.bitti, undefined);
  // Kara ikiye düşer → ak kazanır.
  const bit = ok(DT.hamle({ tahta: tahta([0, 1, 20], [10, 11, 12]), el: [0, 0], sira: 0, sessiz: 0 }, 0, { kaynak: 20, hedef: 2, al: 10 }, Z));
  assert.deepEqual(bit.bitti, { kazanan: [0], berabere: false });
  // Kıpırdayamayan kaybeder: kara 0,2'de dört taşla kuşatılmış.
  const kus: DokuzDurumu = { tahta: tahta([1, 3, 7, 9, 11, 15, 23], [0, 2, 8, 10]), el: [0, 0], sira: 0, sessiz: 0 };
  const k2 = ok(DT.hamle(kus, 0, { kaynak: 23, hedef: 16 }, Z));
  assert.deepEqual(k2.bitti, { kazanan: [0], berabere: false });
  assert.equal(DT.pasGec(kus, 0, Z), undefined, "dokuz taşta pas yok");
  assert.equal(DT.cekil(kus, 0, Z), undefined, "çekilince oyun dağılır");
});

test("Dokuz Taş: sürme aşamasında taş alınmadan sınır dolunca berabere", () => {
  const d: DokuzDurumu = { tahta: tahta([0, 2, 4, 6, 9], [1, 3, 5, 7, 12]), el: [0, 0], sira: 0, sessiz: DOKUZ_SESSIZ_EN_COK - 1 };
  const y = ok(DT.hamle(d, 0, { kaynak: 9, hedef: 8 }, Z));
  assert.deepEqual(y.bitti, { kazanan: [], berabere: true });
});

// ---------------------------------------------------------------- çatı

const T0 = 1_800_000_000_000;
function bekleme(tur = "canak", kisiler = ["a", "b"]): MasaOyunu {
  let o = ok(oyunAc(undefined, tur, kisiler[0]!, kisiler[0]!.toUpperCase(), T0));
  for (const h of kisiler.slice(1)) o = ok(oyunKatil(o, h, h.toUpperCase())).oyun;
  return o;
}
async function baslamis(tur = "canak", kisiler = ["a", "b"], tohum = "t".repeat(32)): Promise<MasaOyunu> {
  const o = bekleme(tur, kisiler);
  return ok(oyunBaslat(o, kisiler[0]!, tohum, await taahhutHesapla(tohum), await adimZari(tohum, o.id, 0)));
}

test("Çatı: açma/katılma/başlatma kapıları; kurucu giderse sıradaki kurucu olur", async () => {
  assert.equal(hataOf(oyunAc(undefined, "satranc", "a", "A", T0)), "oyun_turu_gecersiz");
  assert.equal(hataOf(oyunAc(undefined, "__proto__", "a", "A", T0)), "oyun_turu_gecersiz");
  const o = bekleme("dokuztas", ["a"]);
  assert.equal(hataOf(oyunAc(o, "canak", "b", "B", T0)), "oyun_var");
  assert.equal(hataOf(oyunBaslat(o, "a", "x", "y", Z)), "oyuncu_az");
  const o2 = ok(oyunKatil(o, "b", "B")).oyun;
  assert.equal(ok(oyunKatil(o2, "b", "B")).degisti, false, "tekrar katılma etkisiz");
  assert.equal(hataOf(oyunKatil(o2, "c", "C")), "oyun_dolu");
  assert.equal(hataOf(oyunBaslat(o2, "b", "x", "y", Z)), "yetki_yok");
  const d = oyunDenetle(o2, new Set(["a", "b"]), new Set(["b"]), T0);
  assert.deepEqual([d.oyun?.kurucu, d.oyun?.oyuncular], ["b", ["b"]], "kalkan bekleme listesinden düşer");
  assert.equal(oyunDenetle(d.oyun, new Set(), new Set(), T0).oyun, undefined, "kimse kalmazsa kalkar");
  assert.equal(ok(oyunDagit(o2, "a", T0)).oyun, undefined, "kurucu beklemeyi dağıtır");
  assert.equal(hataOf(oyunDagit(o2, "b", T0)), "yetki_yok");
  const b = await baslamis();
  assert.deepEqual([b.asama, b.n, b.taahhut, b.kayit], ["oyun", 0, await taahhutHesapla("t".repeat(32)), []]);
  assert.equal(hataOf(oyunKatil(b, "c", "C")), "oyun_basladi");
});

test("Çatı: hamle numarası tekrar güvenli (eski n etkisiz), ileri n reddedilir; oyuncu olmayan oynayamaz", async () => {
  const o = await baslamis();
  assert.equal(hataOf(oyunHamle(o, "c", 0, { tut: true }, Z)), "oyuncu_degil");
  assert.equal(hataOf(oyunHamle(o, "a", 1, { tut: true }, Z)), "hamle_no");
  assert.equal(hataOf(oyunHamle(o, "a", "0", { tut: true }, Z)), "gecersiz_istek");
  assert.equal(hataOf(oyunHamle(o, "b", 0, { tut: true }, Z)), "sira_degil");
  const r1 = ok(oyunHamle(o, "a", 0, { tut: true, fazla: "x".repeat(100) }, Z));
  assert.deepEqual([r1.tekrar, r1.oyun.n, r1.oyun.kayit], [false, 1, [[0, { tut: true }]]], "kayda yalnız bilinen alanlar");
  const r2 = ok(oyunHamle(r1.oyun, "a", 0, { tut: true }, Z));
  assert.equal(r2.tekrar, true);
  assert.equal(r2.oyun, r1.oyun, "durum değişmez");
});

test("Çatı: kopan oyuncu sabırdan önce beklenir; sonra sırası geçilir ve dağıtmada oyu aranmaz; dönünce yok silinir", async () => {
  let o = await baslamis("canak", ["a", "b", "c"]);
  // a (sıradaki) kopar
  o = oyunDenetle(o, new Set(["b", "c"]), new Set(["b", "c"]), T0).oyun!;
  assert.deepEqual(o.yok, { a: T0 });
  assert.equal(hataOf(oyunPas(o, "b", 0, T0 + 1000, Z)), "pas_yok", "sabır dolmadan pas yok");
  assert.equal(oyunGorunumu(o, "b", T0 + 1000).pasAcik, false);
  const sonra = T0 + OYUN_KOPMA_SABRI_MS;
  assert.equal(oyunGorunumu(o, "b", sonra).pasAcik, true);
  assert.equal(hataOf(oyunPas(o, "a", 0, sonra, Z)), "pas_yok", "kendi sırasını pas geçemez");
  const p = ok(oyunPas(o, "b", 0, sonra, Z)).oyun;
  assert.deepEqual([p.n, p.kayit?.at(-1)], [1, [0, "pas"]]);
  // Dağıtma: sabır dolmadan a'nın oyu aranır; dolunca b ve c yeter. Kimse kazanmaz.
  const d1 = ok(oyunDagit(o, "b", T0 + 1000)).oyun!;
  const d2 = ok(oyunDagit(d1, "c", T0 + 1000)).oyun!;
  assert.equal(d2.asama, "oyun");
  const d3 = ok(oyunDagit(ok(oyunDagit(o, "b", sonra)).oyun, "c", sonra)).oyun!;
  assert.deepEqual([d3.asama, d3.sonuc], ["bitti", { tur: "dagildi", kazanan: [] }]);
  // Hamle oyları sıfırlar.
  assert.deepEqual(ok(oyunHamle(ok(oyunDagit(o, "b", T0)).oyun, "a", 0, { tut: true }, Z)).oyun.dagit, []);
  // Dönüş
  assert.deepEqual(oyunDenetle(o, new Set(["a", "b", "c"]), new Set(), T0 + 5).oyun!.yok, {});
  // Bütün oyuncular sabırdan uzun yoksa masada yeni oyun açılabilir (masa kilitlenmez).
  const terk = oyunDenetle(o, new Set(), new Set(), T0).oyun!;
  assert.equal(hataOf(oyunAc(terk, "dokuztas", "x", "X", T0 + 1000)), "oyun_var");
  assert.equal(ok(oyunAc(terk, "dokuztas", "x", "X", sonra)).tur, "dokuztas");
});

test("Çatı: çekilme cezasız; iki kişilik oyunda çekilme oyunu sonuçsuz dağıtır (kimse kazanmaz)", async () => {
  const o = await baslamis("dokuztas");
  const r = ok(oyundanCekil(o, "b", Z));
  assert.deepEqual([r.oyun?.asama, r.oyun?.sonuc], ["bitti", { tur: "dagildi", kazanan: [] }]);
  const u = await baslamis("canak", ["a", "b", "c"]);
  const r2 = ok(oyundanCekil(u, "c", Z)).oyun!;
  assert.deepEqual([r2.asama, r2.cekilen], ["oyun", ["c"]]);
  assert.equal(ok(oyundanCekil(r2, "c", Z)).degisti, false, "tekrar çekilme etkisiz");
  assert.equal(hataOf(oyunHamle(r2, "c", r2.n, { tut: true }, Z)), "oyuncu_degil");
  assert.deepEqual(ok(oyundanCekil(bekleme(), "b", Z)).oyun?.oyuncular, ["a"], "beklemede listeden düşer");
});

test("Çatı: görünüm izin listesi — gizli zar yalnız sahibine; seyirci açık bilgi; tohum ve kayıt yalnız bitince", async () => {
  const o = await baslamis("canak", ["a", "b"], "gizli-tohum-0123456789abcdef");
  const ga = oyunGorunumu(o, "a", T0);
  const gb = oyunGorunumu(o, "b", T0);
  const gs = oyunGorunumu(o, null, T0);
  const d = o.d as CanakDurumu;
  assert.deepEqual(ga.ben?.zarlarim, d.zarlar[0]);
  assert.deepEqual(gb.ben?.zarlarim, d.zarlar[1]);
  assert.equal(gs.ben, undefined);
  const IZIN = ["id", "tur", "asama", "kurucu", "enAz", "enCok", "oyuncular", "n", "sira", "taahhut", "durum", "ben", "dagit", "pasAcik", "sabir"];
  for (const g of [ga, gb, gs]) {
    for (const k of Object.keys(g)) assert.ok(IZIN.includes(k), `beklenmeyen alan ${k}`);
    assert.deepEqual(Object.keys(g.durum!).sort(), ["acan", "cikti", "el", "elEnCok", "gecmis", "hedef", "kazanc", "yeniledi"]);
    assert.ok(!JSON.stringify(g).includes("gizli-tohum"), "tohum sızmaz");
  }
  assert.ok(!JSON.stringify(gb).includes(`"zarlarim":${JSON.stringify(d.zarlar[0])}`));
  const b = ok(oyunDagit(ok(oyunDagit(o, "a", T0)).oyun, "b", T0)).oyun!;
  const gbit = oyunGorunumu(b, null, T0);
  assert.equal(gbit.tohum, "gizli-tohum-0123456789abcdef");
  assert.deepEqual(gbit.kayit, []);
});

test("Çatı: denetim — açıklanan tohum taahhüde uyar ve hamle kaydı aynı sonucu yeniden üretir", async () => {
  const tohum = "denetim-tohumu-42";
  let o = await baslamis("canak", ["a", "b", "c"], tohum);
  let adim = 0;
  while (o.asama === "oyun" && adim++ < 200) {
    const g = oyunGorunumu(o, null, T0);
    const kim = g.sira!;
    const zar = await adimZari(tohum, o.id, o.n + 1);
    const hamle = adim % 3 === 0 ? { yenile: [0, 2] } : { tut: true };
    o = ok(oyunHamle(o, kim, o.n, hamle, zar)).oyun;
  }
  assert.equal(o.asama, "bitti");
  const g = oyunGorunumu(o, null, T0);
  assert.equal(await taahhutHesapla(g.tohum!), g.taahhut);
  const yeniden = (await oyunuYenidenOyna("canak", 3, g.tohum!, g.id, g.kayit!)) as CanakDurumu;
  assert.deepEqual(yeniden, o.d);
  assert.deepEqual(o.sonuc?.kazanan.length ? o.sonuc.kazanan : [], (CANAK.sonuc(yeniden)!.kazanan).map((i) => ["a", "b", "c"][i]));
  // Farklı tohum farklı zar üretir (zar istemciden gelmez, tohumdan türer).
  const z1 = await adimZari("x", 1, 1);
  const z2 = await adimZari("y", 1, 1);
  assert.notDeepEqual([z1(), z1(), z1()], [z2(), z2(), z2()]);
});

test("Çatı: depo kaydı çözümü — geçerli kayıt aynen döner, bozuk kayıt düşer", async () => {
  const o = await baslamis("dokuztas");
  assert.deepEqual(masaOyunuCoz(structuredClone(o)), o);
  const b = bekleme();
  assert.deepEqual(masaOyunuCoz(structuredClone(b)), b);
  for (const bozuk of [null, { ...o, tur: "satranc" }, { ...o, oyuncular: ["a", "b", "c"] }, { ...o, d: { tahta: [] } }, { ...o, tohum: undefined }, { ...o, asama: "x" }, { ...o, dagit: ["z"] }]) {
    assert.equal(masaOyunuCoz(bozuk), undefined, JSON.stringify(bozuk).slice(0, 60));
  }
});
