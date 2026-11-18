// Kervan (D2) saf kuralları: hedef, yük, kapılar (her biri), kalkış, aylık sınır, aynı mal-hedef, varış kotası,
// tekrar güvenliği, mal korunumu, fiyat özeti.
import test from "node:test";
import assert from "node:assert/strict";
import { seviyeVer } from "../src/yerlesim/beceri.ts";
import {
  bosKervanDefteri,
  fiyatOzeti,
  gecerliHaber,
  haberYerlesimleri,
  ilkKervanEngeli,
  KERVAN_AYLIK,
  KERVAN_KOSUM,
  KERVAN_NAL,
  KERVAN_TAKAT,
  KERVAN_TOPLU_YUK_EN_COK,
  KERVAN_YUK_EN_COK,
  kervanCikar,
  kervanHedefi,
  kervanKapilari,
  type KervanYuku,
  varisIsle,
  varisSonucuGecerli,
  varisTahmini,
  varisUygula,
  yoldakiler,
  yukCoz,
  yukSorguCoz,
  yukTavani,
} from "../src/yerlesim/kervan.ts";
import { KITLIK_KOTASI, NPC_ODUNCU_SATIS_KOTASI } from "../src/yerlesim/pazar.ts";
import type { Karakter } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

function tuccar(no = 1): { k: ReturnType<typeof testKasabasi>; kar: Karakter } {
  const k = testKasabasi("develi", 40);
  const kar = oyuncuEkle(k, no, k.ay - 20 * 12);
  seviyeVer(kar, "tuccar.yukHayvani", 1);
  kar.ev = { nal: 6, kosum: 3, kereste: 20, odun: 10 };
  kar.tk = 10;
  kar.ta = k.ay;
  return { k, kar };
}

const islem = (n: number) => `kervan:develi:o1:istek-${String(n).padStart(4, "0")}`;

test("kervan hedefi: bilinmeyen yerleşim, kendi yerleşimi ve başka beylik", () => {
  assert.deepEqual(kervanHedefi("develi", "yok"), { ok: false, hata: "yerlesim_gecersiz" });
  assert.deepEqual(kervanHedefi("develi", 5), { ok: false, hata: "yerlesim_gecersiz" });
  assert.deepEqual(kervanHedefi("develi", "develi"), { ok: false, hata: "kervan_ayni_yer" });
  assert.deepEqual(kervanHedefi("develi", "karapinar"), { ok: true, deger: "karapinar" });
  assert.deepEqual(kervanHedefi("develi", "konuralp"), { ok: true, deger: "konuralp" }, "ilk sürüm: herhangi bir beylik");
});

test("kervan yükü: biçim, satılmaz mal ve sorgu dizgesi", () => {
  assert.equal(yukCoz(null).ok, false);
  assert.equal(yukCoz({}).ok, false);
  assert.equal(yukCoz([1]).ok, false);
  assert.equal(yukCoz({ su: 2 }).ok, false, "su satılmaz");
  assert.equal(yukCoz({ odun: 0 }).ok, false);
  assert.equal(yukCoz({ odun: 1.5 }).ok, false);
  assert.equal(yukCoz({ yokmal: 1 }).ok, false);
  assert.deepEqual(yukCoz({ odun: 3, kereste: 2 }), { ok: true, deger: { odun: 3, kereste: 2 } });
  assert.deepEqual(yukSorguCoz("odun:3,kereste:2"), { ok: true, deger: { odun: 3, kereste: 2 } });
  assert.equal(yukSorguCoz(""), undefined);
  assert.equal(yukSorguCoz("odun:x")?.ok, false);
});

test("kervan kapıları: her biri ayrı ayrı ve sırayla", () => {
  const { k, kar } = tuccar();
  const d = bosKervanDefteri();
  const tam = kervanKapilari(d, kar, k.ay, "karapinar", { kereste: 5 });
  assert.equal(ilkKervanEngeli(tam), undefined, JSON.stringify(tam));
  assert.equal(kervanKapilari(d, kar, k.ay, "karapinar", undefined).yuk, null, "yüksüz önizleme yük kapısını boş bırakır");

  // düğüm
  const { kar: acemi } = tuccar(2);
  acemi.ms!.s.tuccar!.sv = {};
  assert.equal(ilkKervanEngeli(kervanKapilari(d, acemi, k.ay, "karapinar", { kereste: 5 })), "dugum_kapali");
  // yük tavanı
  kar.ev!.kereste = 40;
  assert.equal(ilkKervanEngeli(kervanKapilari(d, kar, k.ay, "karapinar", { kereste: KERVAN_YUK_EN_COK + 1 })), "kervan_yuk_siniri");
  // mal
  assert.equal(ilkKervanEngeli(kervanKapilari(d, kar, k.ay, "karapinar", { odun: 11 })), "mal_yok");
  // bedel: gönderilen nal bedelden sayılmaz
  assert.equal(ilkKervanEngeli(kervanKapilari(d, kar, k.ay, "karapinar", { nal: 5 })), "kervan_bedel_yok");
  kar.ev!.kosum = 0;
  assert.equal(ilkKervanEngeli(kervanKapilari(d, kar, k.ay, "karapinar", { odun: 1 })), "kervan_bedel_yok");
  kar.ev!.kosum = 3;
  // takat
  kar.tk = KERVAN_TAKAT - 1;
  assert.equal(ilkKervanEngeli(kervanKapilari(d, kar, k.ay, "karapinar", { odun: 1 })), "takat_yok");
  kar.tk = 10;
  // ölü
  kar.hd = { ...(kar.hd ?? {}), ol: k.ay } as Karakter["hd"];
  assert.equal(ilkKervanEngeli(kervanKapilari(d, kar, k.ay, "karapinar", { odun: 1 })), "olu");
});

test("toplu yük: düğüm + araba 30; araba yoksa ya da gönderiliyorsa 12", () => {
  const { kar } = tuccar();
  assert.equal(yukTavani(kar).tavan, KERVAN_YUK_EN_COK);
  seviyeVer(kar, "tuccar.topluYuk", 1);
  assert.deepEqual(
    (({ tavan, topluYuk, araba }) => ({ tavan, topluYuk, araba }))(yukTavani(kar)),
    { tavan: KERVAN_YUK_EN_COK, topluYuk: true, araba: false },
  );
  kar.ev!.araba = 1;
  assert.equal(yukTavani(kar).tavan, KERVAN_TOPLU_YUK_EN_COK);
  assert.equal(yukTavani(kar, { araba: 1 }).tavan, KERVAN_YUK_EN_COK, "tek araba yük olarak gidiyorsa toplu yük yok");
});

test("kalkış: mallar, bedel ve takat düşer; ayda 2 kervan; aynı mal aynı hedefe ayda bir; yeni ay sıfırlar", () => {
  const { k, kar } = tuccar();
  const d = bosKervanDefteri();
  const r1 = kervanCikar(d, kar, "karapinar", { kereste: 10 }, k.ay, islem(1), 1000);
  assert.equal(r1.ok, true, JSON.stringify(r1));
  assert.deepEqual(kar.ev, { nal: 6 - KERVAN_NAL, kosum: 3 - KERVAN_KOSUM, kereste: 10, odun: 10 });
  assert.equal(kar.tk, 10 - KERVAN_TAKAT);
  assert.equal(d.c.k.length, 1);
  const y = d.c.k[0]!.y as unknown as KervanYuku;
  assert.deepEqual([y.o, y.hs, y.ka, y.va, y.ev], [kar.o, kar.h, k.ay, k.ay + 1, { kereste: 10 }]);
  assert.deepEqual(yoldakiler(d, kar.o).map((x) => x.hedef), ["karapinar"]);

  const ayni = kervanCikar(d, kar, "karapinar", { kereste: 1 }, k.ay, islem(2), 1000);
  assert.deepEqual(ayni, { ok: false, hata: "kervan_mal_hedef" });
  assert.deepEqual(kar.ev!.kereste, 10, "ret yan etkisizdir");
  assert.equal(kervanCikar(d, kar, "karapinar", { odun: 2 }, k.ay, islem(3), 1000).ok, true, "başka mal aynı hedefe olur");
  assert.equal(KERVAN_AYLIK, 2);
  assert.deepEqual(kervanCikar(d, kar, "demirhan", { odun: 1 }, k.ay, islem(4), 1000), { ok: false, hata: "kervan_aylik_siniri" });
  kar.tk = 10;
  assert.equal(kervanCikar(d, kar, "karapinar", { kereste: 1 }, k.ay + 1, islem(5), 1000).ok, true, "yeni ayda sayaç sıfır");
});

test("varış: kota ve kıtlık primi kotası; satılmayan döner; aynı işlem ikinci kez satmaz; geçersiz yük kalıcı ret", () => {
  const hedef = testKasabasi("karapinar", 41);
  const d = bosKervanDefteri();
  const yuk: KervanYuku = { o: "o1", hs: "hesap-1", ev: { kereste: 10 }, ka: 40, va: 41 };
  const tahmin = varisTahmini(hedef, d, "hesap-1", yuk.ev, 41);
  const r = varisIsle(hedef, d, islem(1), "develi", yuk, 5000);
  assert.equal(r.yeni, true);
  assert.equal(r.sonuc.durum, "kabul");
  // Hedefte oduncu yok: kıtlık primi (taban 3 → +2) ilk KITLIK_KOTASI birime; kota NPC_ODUNCU_SATIS_KOTASI.
  assert.deepEqual(r.sonuc.satilan, { kereste: NPC_ODUNCU_SATIS_KOTASI });
  assert.deepEqual(r.sonuc.kalan, { kereste: 10 - NPC_ODUNCU_SATIS_KOTASI });
  assert.equal(r.sonuc.hasilat, 3 * NPC_ODUNCU_SATIS_KOTASI + 2 * KITLIK_KOTASI);
  assert.deepEqual(tahmin.satirlar, r.sonuc.satirlar, "önizleme = gerçek");
  assert.equal(hedef.st?.kereste, NPC_ODUNCU_SATIS_KOTASI, "satılan hedefin kasaba stoğuna girer");
  const stok = hedef.st!.kereste;

  const tekrar = varisIsle(hedef, d, islem(1), "develi", yuk, 9000);
  assert.equal(tekrar.yeni, false);
  assert.deepEqual(tekrar.sonuc, r.sonuc);
  assert.equal(hedef.st!.kereste, stok, "tekrar teslim stok/kota yazmaz");

  // Aynı varış ayında aynı hesabın kotası dolu (ör. göçle başka yerden gelen kervan): hiçbir şey satılmaz.
  const ikinci = varisIsle(hedef, d, islem(2), "konuralp", { ...yuk, ev: { kereste: 3 } }, 5000);
  assert.deepEqual([ikinci.sonuc.hasilat, ikinci.sonuc.kalan], [0, { kereste: 3 }]);
  // Başka varış ayı taze kotadır.
  const sonraki = varisIsle(hedef, d, islem(3), "develi", { ...yuk, ka: 41, va: 42 }, 5000);
  assert.deepEqual(sonraki.sonuc.satilan, { kereste: NPC_ODUNCU_SATIS_KOTASI });

  const bozuk = varisIsle(hedef, d, islem(4), "develi", { ...yuk, va: 99 }, 5000);
  assert.deepEqual([bozuk.sonuc.durum, bozuk.sonuc.hasilat], ["red", 0]);
  assert.equal(varisIsle(hedef, d, islem(5), "karapinar", yuk, 5000).sonuc.durum, "red", "kendi yerleşiminden gelen kervan reddedilir");
});

test("dönüş: kabulde hasılat + kalan, redde bütün yük; mal ve akçe korunur; bozuk yanıt kabul edilmez", () => {
  const { k, kar } = tuccar();
  const d = bosKervanDefteri();
  const once = { kereste: kar.ev!.kereste!, pa: kar.pa };
  kervanCikar(d, kar, "karapinar", { kereste: 10 }, k.ay, islem(1), 1000);
  const y = d.c.k[0]!.y as unknown as KervanYuku;
  // Mal hiçbir anda iki yerde değil: envanter + yoldaki = önceki.
  assert.equal(kar.ev!.kereste! + y.ev.kereste!, once.kereste);

  const hedef = testKasabasi("karapinar", 41);
  const { sonuc } = varisIsle(hedef, bosKervanDefteri(), islem(1), "develi", y, 5000);
  assert.equal(varisSonucuGecerli(sonuc, y), true);
  assert.equal(varisSonucuGecerli({ ...sonuc, kalan: { kereste: 9 } }, y), false, "mal çoğalamaz");
  assert.equal(varisSonucuGecerli({ ...sonuc, durum: "red" }, y), false, "redde hasılat olamaz");
  assert.equal(varisSonucuGecerli({ durum: "red", an: 1, hasilat: 0, satilan: {}, kalan: {}, satirlar: [] }, y), true, "ret yüksüz döner");
  const u = varisUygula(kar, y, sonuc);
  assert.equal(kar.pa, once.pa + sonuc.hasilat);
  assert.equal(kar.ev!.kereste! + sonuc.satilan.kereste!, once.kereste, "satılan + envanter = önceki");
  assert.deepEqual(u.geri, sonuc.kalan);

  const red = { durum: "red" as const, neden: "gecersiz", an: 1, hasilat: 0, satilan: {}, kalan: {}, satirlar: [] };
  const pa = kar.pa;
  const ker = kar.ev!.kereste!;
  assert.deepEqual(varisUygula(kar, y, red), { akce: 0, geri: { kereste: 10 } });
  assert.deepEqual([kar.pa, kar.ev!.kereste], [pa, ker + 10]);
});

test("fiyat özeti ve haber: kıtlık primli mallar önce, en çok 3; aynı beylikten 3 yerleşim; geçerlilik", () => {
  const k = testKasabasi("karapinar", 41);
  const o = fiyatOzeti(k);
  assert.equal(o.pahali.length, 3);
  assert.ok(o.pahali.every((x) => x.alis.kalemler.some((y) => y.k === "kitlik")), "oyuncusuz kasabada hepsi kıt");
  assert.ok(o.pahali[0]!.alis.toplam >= o.pahali[2]!.alis.toplam);
  assert.ok(o.lonca.length > 0);
  assert.deepEqual(haberYerlesimleri("develi", ["demirhan", "develi", "karapinar", "yassioren", "kizilca"]), ["demirhan", "karapinar", "yassioren"]);
  const d = bosKervanDefteri();
  d.h.o1 = { ay: 40, gecerli: 41, yerlesimler: [o] };
  assert.ok(gecerliHaber(d, "o1", 41));
  assert.equal(gecerliHaber(d, "o1", 42), undefined);
});
