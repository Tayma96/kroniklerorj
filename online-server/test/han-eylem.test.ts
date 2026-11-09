// Butonlu eylemler, katılım listesi, istekNo tekrarı, masa para tutmaz; ikram girdisi ve ödeme kuralı (saf).
import test from "node:test";
import assert from "node:assert/strict";
import { bellekDepo } from "../src/depo.ts";
import { atmaUygula, eylemGirdisiCoz, eylemUygula, OLAY_SAYAC, type EylemBaglami } from "../src/han/eylem.ts";
import { hanIkrami, type HanHesapBaglami } from "../src/han/hesap-kopru.ts";
import { IKRAM_MENUSU, ikramGirdisiCoz, ikramOdemesi } from "../src/han/ikram.ts";
import { basarili, hata } from "../src/tipler.ts";
import { SART_EN_UZUN, VARSAYILAN_AYAR } from "../src/han/kurallar.ts";
import type { EylemGirdisi } from "../src/han/tipler.ts";
import { MASA } from "./han-yardimci.ts";

const SIMDI = 1_800_000_000_000;

function baglam(ek: Partial<EylemBaglami> = {}): EylemBaglami {
  return {
    masa: MASA,
    // koltuk sırası bilerek karışık: katılım koltuk sırasıyla yazılmalı
    oturanlar: [
      { hesap: "veli", koltuk: 3 },
      { hesap: "ali", koltuk: 0 },
      { hesap: "can", koltuk: 5 },
    ],
    ayar: { ...VARSAYILAN_AYAR },
    simdi: SIMDI,
    engelliMi: async () => false,
    ...ek,
  };
}

function girdi(ek: Partial<EylemGirdisi> & Pick<EylemGirdisi, "tur">): EylemGirdisi {
  return { masa: 1, istekNo: "istek-00000001", ...ek };
}

test("eylem olayına o anda oturanların katılım listesi koltuk sırasıyla yazılır; ayaktakiler girmez", async () => {
  const depo = bellekDepo();
  const s = await eylemUygula(depo, "ali", girdi({ tur: "yemin", sart: "Hanı yakanı bulacağım" }), baglam());
  assert.ok(s.ok);
  assert.deepEqual(s.deger.olay.katilim, ["ali", "veli", "can"]);
  assert.equal(s.deger.olay.tur, "yemin");
  assert.equal(s.deger.olay.sart, "Hanı yakanı bulacağım");
  assert.equal(s.deger.yeni, true);
  // Yalnız kimlikler: katılım listesinde ad ya da sohbet yok.
  assert.ok(s.deger.olay.katilim.every((k) => typeof k === "string"));
});

test("istekNo tekrarı aynı olayı döndürür, sayaç artmaz, yeni olay yazılmaz", async () => {
  const depo = bellekDepo();
  const g = girdi({ tur: "meydanOku", hedef: "veli" });
  const a = await eylemUygula(depo, "ali", g, baglam());
  const b = await eylemUygula(depo, "ali", g, baglam({ oturanlar: [] }));
  assert.ok(a.ok && b.ok);
  assert.deepEqual(b.deger.olay, a.deger.olay);
  assert.equal(b.deger.yeni, false);
  assert.equal(await depo.al(OLAY_SAYAC), 1);
  // Aynı istekNo başka hesaptan gelirse ayrı eylemdir.
  const c = await eylemUygula(depo, "veli", girdi({ tur: "meydanOku", hedef: "ali" }), baglam());
  assert.ok(c.ok);
  assert.equal(c.deger.olay.no, 2);
});

test("eylem kuralları: oturmayan, hedefsiz, kendine, masada olmayana, kavga yasağı, engel, susturma", async () => {
  const depo = bellekDepo();
  const hata = async (kim: string, g: EylemGirdisi, b = baglam()) => {
    const s = await eylemUygula(depo, kim, g, b);
    return s.ok ? "ok" : s.hata;
  };
  assert.equal(await hata("dursun", girdi({ tur: "yemin", sart: "söz" })), "oturmuyor");
  assert.equal(await hata("ali", girdi({ tur: "sozlesme", sart: "un" })), "kisi_yok");
  assert.equal(await hata("ali", girdi({ tur: "ittifak", hedef: "ali" })), "kendi_hedef");
  assert.equal(await hata("ali", girdi({ tur: "ittifak", hedef: "dursun" })), "hedef_masada_degil");
  assert.equal(await hata("ali", girdi({ tur: "sozlesme", hedef: "veli" })), "metin_gecersiz");
  assert.equal(await hata("ali", girdi({ tur: "meydanOku", hedef: "veli" }), baglam({ ayar: { ...VARSAYILAN_AYAR, kavgaYasak: true } })), "kavga_yasak");
  assert.equal(await hata("ali", girdi({ tur: "ittifak", hedef: "veli" }), baglam({ engelliMi: async (a, b) => a === "veli" && b === "ali" })), "engelli");
  assert.equal(await hata("ali", girdi({ tur: "yemin", sart: "söz" }), baglam({ susturma: { bitis: SIMDI + 1 } })), "susturuldu");
  // İhbar edilen masada olmayabilir.
  assert.equal(await hata("ali", girdi({ tur: "ihbar", hedef: "dursun" })), "ok");
});

test("sözleşme teklif olarak doğar; yalnız hedef onaylar, ikinci onay reddedilir", async () => {
  const depo = bellekDepo();
  const t = await eylemUygula(depo, "ali", girdi({ tur: "sozlesme", hedef: "veli", sart: "Güzde 10 kile buğday" }), baglam());
  assert.ok(t.ok);
  assert.equal(t.deger.olay.durum, "teklif");
  const yanlis = await eylemUygula(depo, "can", girdi({ tur: "kabul", olay: t.deger.olay.no, istekNo: "istek-00000002" }), baglam());
  assert.equal(yanlis.ok ? "" : yanlis.hata, "olay_yok");
  const k = await eylemUygula(depo, "veli", girdi({ tur: "kabul", olay: t.deger.olay.no, istekNo: "istek-00000003" }), baglam());
  assert.ok(k.ok);
  assert.equal(k.deger.olay.hedef, "ali");
  assert.deepEqual(k.deger.olay.katilim, ["ali", "veli", "can"]);
  const ikinci = await eylemUygula(depo, "veli", girdi({ tur: "kabul", olay: t.deger.olay.no, istekNo: "istek-00000004" }), baglam());
  assert.equal(ikinci.ok ? "" : ikinci.hata, "karar_verildi");
  const teklif = [...depo.veri.values()].find((v) => (v as { no?: number }).no === t.deger.olay.no) as { durum: string; kabulOlay: number };
  assert.deepEqual([teklif.durum, teklif.kabulOlay], ["kabul", k.deger.olay.no]);
});

test("masa para tutmaz: masa deposunda ve olaylarda akçe/para/kasa/fiyat alanı yoktur", async () => {
  const depo = bellekDepo();
  await eylemUygula(depo, "ali", girdi({ tur: "yemin", sart: "söz" }), baglam());
  await eylemUygula(depo, "ali", girdi({ tur: "ittifak", hedef: "veli", istekNo: "istek-00000002" }), baglam());
  await atmaUygula(depo, MASA, "ali", "can", ["ali", "veli", "can"], SIMDI);
  const anahtarlar: string[] = [];
  const topla = (v: unknown): void => {
    if (Array.isArray(v)) v.forEach(topla);
    else if (typeof v === "object" && v !== null) for (const [k, d] of Object.entries(v)) (anahtarlar.push(k), topla(d));
  };
  for (const [k, v] of depo.veri) (anahtarlar.push(k), topla(v));
  assert.ok(anahtarlar.length > 0);
  for (const k of anahtarlar) assert.equal(/akce|akçe|para|kasa|fiyat|bakiye/i.test(k), false, k);
});

test("eylem gövdesi doğrulanır", () => {
  const tamam = eylemGirdisiCoz({ masa: 2, tur: "yemin", sart: " söz‮ veriyorum ", istekNo: "istek-00000001" });
  assert.ok(tamam.ok);
  assert.equal(tamam.deger.sart, "söz veriyorum");
  const kod = (g: unknown) => {
    const s = eylemGirdisiCoz(g);
    return s.ok ? "ok" : s.hata;
  };
  assert.equal(kod({ masa: 1, tur: "ziyafet", istekNo: "istek-00000001" }), "eylem_gecersiz");
  assert.equal(kod({ masa: 0, tur: "yemin", istekNo: "istek-00000001" }), "masa_gecersiz");
  assert.equal(kod({ masa: 1, tur: "yemin" }), "istekno_gecersiz");
  assert.equal(kod({ masa: 1, tur: "ittifak", hedef: "a b", istekNo: "istek-00000001" }), "kisi_yok");
  assert.equal(kod({ masa: 1, tur: "yemin", sart: "x".repeat(SART_EN_UZUN + 1), istekNo: "istek-00000001" }), "metin_gecersiz");
});

test("ikram: fiyat yalnız sunucu menüsünden; ödeme parası yetmezse para_yok, akçe dünyadan çıkar", () => {
  const g = ikramGirdisiCoz({ masa: 1, hedef: "veli", ikram: "serbet", fiyat: 0, istekNo: "istek-00000001" });
  assert.ok(g.ok);
  assert.equal("fiyat" in g.deger, false, "istemcinin fiyatı alınmaz");
  const kod = (v: unknown) => {
    const s = ikramGirdisiCoz(v);
    return s.ok ? "ok" : s.hata;
  };
  assert.equal(kod({ masa: 1, hedef: "veli", ikram: "altin", istekNo: "istek-00000001" }), "ikram_gecersiz");
  assert.equal(kod({ masa: 1, hedef: "veli", ikram: "toString", istekNo: "istek-00000001" }), "ikram_gecersiz");
  assert.equal(kod({ masa: 1, ikram: "serbet", istekNo: "istek-00000001" }), "kisi_yok");
  const o = ikramOdemesi(10, "serbet");
  assert.ok(o.ok);
  assert.deepEqual(o.deger, { para: 10 - IKRAM_MENUSU.serbet.fiyat, batak: IKRAM_MENUSU.serbet.fiyat });
  assert.equal(o.deger.para + o.deger.batak, 10, "toplam akçe: kalan + batak = önceki");
  const yok = ikramOdemesi(1, "gulSuyu");
  assert.equal(yok.ok ? "" : yok.hata, "para_yok");
});

test("hanIkrami: kontrol → ödeme → anons; istekNo tekrarı ikinci kez ödetmez; ödeme reddi anons üretmez", async () => {
  const depo = bellekDepo();
  await depo.koy({ profil: { hesapId: "ali", ad: "Ali", cinsiyet: "erkek", beylik: "demirhan", yerlesim: "kizilca", dogumAyi: 0, olusturma: 0 } });
  const masaCagrilari: string[] = [];
  let odemeSayisi = 0;
  let para = 10;
  const b: HanHesapBaglami = {
    depo,
    hesapId: "ali",
    simdi: SIMDI,
    yaptirim: undefined,
    masaCagir: async (ad, i) => (masaCagrilari.push(`${ad}|${i.islem}`), basarili({})),
    ikramOde: async (i) => {
      odemeSayisi++;
      if (para < i.govde.fiyat) return hata("para_yok");
      para -= i.govde.fiyat;
      return basarili({ para });
    },
  };
  const govde = { masa: 1, hedef: "veli", ikram: "yemek", istekNo: "ikram-00000001" };
  const s1 = await hanIkrami(b, govde);
  assert.ok(s1.ok);
  assert.deepEqual([s1.deger.fiyat, s1.deger.para, s1.deger.anons.tur, s1.deger.anons.oge], [IKRAM_MENUSU.yemek.fiyat, 4, "ikram", "yemek"]);
  assert.deepEqual(masaCagrilari, ["masa:kizilca:menzil:1|ikramKontrol", "masa:kizilca:menzil:1|anons"]);
  assert.deepEqual(await hanIkrami(b, govde), s1);
  assert.equal(odemeSayisi, 1, "tekrar ikinci kez ödetmez");
  const s3 = await hanIkrami(b, { ...govde, istekNo: "ikram-00000002" });
  assert.equal(s3.ok ? "" : s3.hata, "para_yok");
  assert.equal(masaCagrilari.filter((c) => c.endsWith("anons")).length, 1, "ödenmeyen ikram anons edilmez");
  const s4 = await hanIkrami(b, { ...govde, hedef: "ali", istekNo: "ikram-00000003" });
  assert.equal(s4.ok ? "" : s4.hata, "kendi_hedef");
  const s5 = await hanIkrami(b, { ...govde, masa: 3, istekNo: "ikram-00000004" });
  assert.equal(s5.ok ? "" : s5.hata, "masa_gecersiz", "köyde 2 masa var");
});
