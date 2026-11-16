// 4.9 Çoklu han (HesapDO köprüsü, sahte bağlam): han parametresi masa adını ve ödeme hanını seçer; eski istek 1. hana
// gider; sahipsiz arsa reddedilir (masa çağrısı yok); günlük ikram/ziyafet/eylem/pano tavanları hanlar arasında
// paylaşılır (kişi başı); han listesi kartlarla döner; plaka kişi kartı alanları (kisi, nam) bilette taşınır.
import test from "node:test";
import assert from "node:assert/strict";
import { bellekDepo } from "../src/depo.ts";
import { hanEylemi, hanIkrami, hanListesi, hanPanoYaz, hanZiyafeti, masaBileti, menuFiyatlari, type HanHesapBaglami } from "../src/han/hesap-kopru.ts";
import { IKRAM_GUNLUK, IKRAM_MENUSU } from "../src/han/ikram.ts";
import { ZIYAFET_GUNLUK } from "../src/han/ziyafet.ts";
import { PANO_GUNLUK } from "../src/han/pano.ts";
import { HAN_EYLEM_GUNLUK, masaSayisi } from "../src/han/kurallar.ts";
import type { HanKarti, MasaIleti } from "../src/han/tipler.ts";
import { basarili } from "../src/tipler.ts";

const SIMDI = 1_800_000_000_000;

function kart(no: number, sahip: "npc" | "oyuncu"): HanKarti {
  return { no, isletme: `demirhan.han.${no}`, sahip, ad: "", seviye: 0, fc: 100, acik: true, oda: sahip === "npc" ? null : { dolu: 0, kapasite: 5 }, mudavim: null };
}

async function baglam(yerlesim = "demirhan", hanlar: HanKarti[] = [kart(1, "npc"), kart(2, "oyuncu"), kart(3, "oyuncu")]) {
  const depo = bellekDepo();
  await depo.koy({ profil: { hesapId: "ali", ad: "Ali", cinsiyet: "erkek", beylik: "demirhan", yerlesim, dogumAyi: 0, olusturma: 0 } });
  const masalar: string[] = [];
  const odemeler: { han?: number }[] = [];
  const engelHan: (number | undefined)[] = [];
  let hanlarSorulan = 0;
  const b: HanHesapBaglami = {
    depo,
    hesapId: "ali",
    simdi: SIMDI,
    yaptirim: undefined,
    masaCagir: async (ad: string, i: MasaIleti) => {
      masalar.push(`${i.islem}@${ad}`);
      if (i.islem === "ozet") return basarili({ no: i.no, oturan: 1, ayakta: 0, sira: 0, ayar: { tur: "acik", acik: true, sesli: false, kavgaYasak: false, kilitli: false }, oturanlar: ["veli"] });
      if (i.islem === "ziyafetKontrol") return basarili({ oturanlar: ["ali", "veli", "can"] });
      return basarili({ olay: { no: 1, masa: ad, tur: "yemin", kim: "ali", zaman: SIMDI, katilim: [] } });
    },
    ikramOde: async (ileti) => {
      odemeler.push({ han: ileti.govde.han });
      return basarili({ para: 100 });
    },
    ziyafetOde: async (_y, govde) => {
      odemeler.push({ han: govde.han });
      return basarili({ bedel: 8, para: 90, nam: 0 });
    },
    engelSor: async (_y, han) => {
      engelHan.push(han);
      return basarili({ engeller: [], mudavim: han === 2, kisi: "o7", nam: 42 });
    },
    hanlarSor: async () => {
      hanlarSorulan++;
      return basarili({ hanlar });
    },
  };
  return { b, masalar, odemeler, engelHan, hanlarSorulan: () => hanlarSorulan };
}

test("4.9 han parametresi masayı ve ödeme hanını seçer; eski istek 1. hana; arsa reddedilir", async () => {
  const { b, masalar, odemeler, hanlarSorulan } = await baglam();
  const eski = await hanIkrami(b, { masa: 1, hedef: "veli", ikram: "ekmek", istekNo: "ikram-eski-0001" });
  assert.ok(eski.ok, JSON.stringify(eski));
  assert.equal(hanlarSorulan(), 0, "1. han için ek iç çağrı yok");
  const yeni = await hanIkrami(b, { masa: 2, hedef: "veli", ikram: "ekmek", istekNo: "ikram-yeni-0001", han: 2 });
  assert.ok(yeni.ok);
  assert.deepEqual(odemeler, [{ han: 1 }, { han: 2 }]);
  assert.ok(masalar.includes("ikramKontrol@masa:demirhan:han:1"));
  assert.ok(masalar.includes("ikramKontrol@masa:demirhan:han2:2"));
  const once = masalar.length;
  assert.deepEqual(await hanIkrami(b, { masa: 1, hedef: "veli", ikram: "ekmek", istekNo: "ikram-arsa-0001", han: 4 }), { ok: false, hata: "han_yok" });
  assert.deepEqual(await hanEylemi(b, { masa: 1, tur: "yemin", istekNo: "eylem-arsa-0001", han: 5 }), { ok: false, hata: "han_yok" });
  assert.deepEqual(await hanIkrami(b, { masa: 1, hedef: "veli", ikram: "ekmek", istekNo: "ikram-gecersiz-01", han: "x" }), { ok: false, hata: "han_gecersiz" });
  assert.equal(masalar.length, once, "sahipsiz arsada masa yoktur (masa DO'suna gidilmez)");
  assert.equal(odemeler.length, 2);
  const z = await hanZiyafeti(b, { masa: 3, istekNo: "ziyafet-h3-0001", han: 3 });
  assert.ok(z.ok);
  assert.deepEqual(odemeler.at(-1), { han: 3 });
  assert.ok(masalar.includes("ziyafetKontrol@masa:demirhan:han3:3"));
});

test("4.9 kişi başı tavanlar hanlar arasında paylaşılır (ikram, ziyafet, eylem, pano)", async () => {
  const { b } = await baglam();
  let n = 0;
  const ikramlar = [];
  for (let i = 0; i < IKRAM_GUNLUK + 3; i++) ikramlar.push(await hanIkrami(b, { masa: 1, hedef: "veli", ikram: "ekmek", istekNo: `ikram-tav-${String(++n).padStart(6, "0")}`, han: (i % 3) + 1 }));
  assert.equal(ikramlar.filter((r) => r.ok).length, IKRAM_GUNLUK, "üç han tavanı üçe katlamaz");
  const ziyafetler = [];
  for (let i = 0; i < ZIYAFET_GUNLUK + 2; i++) ziyafetler.push(await hanZiyafeti(b, { masa: 1, istekNo: `ziyafet-tav-${String(++n).padStart(6, "0")}`, han: (i % 3) + 1 }));
  assert.equal(ziyafetler.filter((r) => r.ok).length, ZIYAFET_GUNLUK);
  const eylemler = [];
  for (let i = 0; i < HAN_EYLEM_GUNLUK + 2; i++) eylemler.push(await hanEylemi(b, { masa: 1, tur: "yemin", istekNo: `eylem-tav-${String(++n).padStart(6, "0")}`, han: (i % 3) + 1 }));
  assert.equal(eylemler.filter((r) => r.ok).length, HAN_EYLEM_GUNLUK);
  const ilanlar = [];
  for (let i = 0; i < PANO_GUNLUK + 2; i++) ilanlar.push(await hanPanoYaz(b, { metin: "iş var", tur: "is", istekNo: `pano-tav-${String(++n).padStart(6, "0")}`, han: (i % 3) + 1 }, async () => basarili({})));
  assert.equal(ilanlar.filter((r) => r.ok).length, PANO_GUNLUK);
});

test("4.9 han listesi: açık hanların kartları, seçili hanın masaları; masa bileti hanı ve plaka kişi kartı", async () => {
  const { b, masalar } = await baglam();
  const l = await hanListesi(b, "tr");
  assert.ok(l.ok, JSON.stringify(l));
  assert.equal(l.deger.han.no, 1, "han verilmezse 1. han");
  assert.deepEqual(l.deger.hanlar.map((h) => [h.no, h.sahip]), [[1, "npc"], [2, "oyuncu"], [3, "oyuncu"]]);
  const m = masaSayisi("sehir");
  assert.deepEqual(l.deger.hanlar[0]!.masa, { sayi: m, acik: m, oturan: m }, "seçili han canlı");
  assert.deepEqual(l.deger.hanlar[1]!.masa, { sayi: m, acik: m, oturan: 0 }, "diğer han kayıttan (kayıt yoksa boş)");
  assert.equal(l.deger.masalar.length, m);
  const l2 = await hanListesi(b, "tr", "2");
  assert.ok(l2.ok);
  assert.deepEqual(l.deger.menu, menuFiyatlari(undefined), "NPC hanında taban menü");
  assert.ok(l.deger.menu.every((x) => x.fiyat === IKRAM_MENUSU[x.id as keyof typeof IKRAM_MENUSU].fiyat));
  // Oyuncu hanında menü fiyat çarpanıyla (ödeme formülü ⌈taban × fc / 100⌉, en az 1).
  const pahali = menuFiyatlari({ sahip: "oyuncu", fc: 150 });
  for (const x of pahali) assert.equal(x.fiyat, Math.max(1, Math.ceil((IKRAM_MENUSU[x.id as keyof typeof IKRAM_MENUSU].fiyat * 150) / 100)));
  assert.ok(menuFiyatlari({ sahip: "oyuncu", fc: 50 }).every((x) => x.fiyat >= 1));
  assert.deepEqual(l2.deger.menu, menuFiyatlari(l2.deger.hanlar.find((h) => h.no === 2)), "seçili oyuncu hanının menüsü");
  assert.deepEqual([l2.deger.han.no, l2.deger.han.isletme], [2, "demirhan.han.2"]);
  assert.deepEqual(await hanListesi(b, "tr", "4"), { ok: false, hata: "han_yok" });
  assert.ok(masalar.includes("ozet@masa:demirhan:han2:8"));
  assert.ok(!masalar.some((x) => x.startsWith("ozet@masa:demirhan:han3:")), "seçili olmayan hanın masası canlı sorulmaz");

  const eski = await masaBileti(b, "1");
  assert.ok(eski.ok);
  assert.equal(eski.deger.masa, "masa:demirhan:han:1");
  assert.deepEqual([eski.deger.plaka.kisi, eski.deger.plaka.nam, eski.deger.plaka.mudavim], ["o7", 42, undefined]);
  const bilet = await masaBileti(b, "2", "2");
  assert.ok(bilet.ok);
  assert.equal(bilet.deger.masa, "masa:demirhan:han2:2");
  assert.equal(bilet.deger.plaka.mudavim, true, "müdavim rozeti seçili hanın");
  assert.deepEqual(await masaBileti(b, "1", "5"), { ok: false, hata: "han_yok" });
});

test("4.9 köy: yalnız 1. (NPC) han; liste yerleşim yanıt vermese de çalışır", async () => {
  const { b } = await baglam("kizilca", [kart(1, "npc")]);
  delete b.hanlarSor;
  const l = await hanListesi(b, "tr");
  assert.ok(l.ok);
  assert.deepEqual(l.deger.hanlar.map((h) => h.no), [1]);
  assert.equal(l.deger.masalar.length, masaSayisi("koy"));
  assert.deepEqual(await hanListesi(b, "tr", "2"), { ok: false, hata: "han_yok" });
});

test("4.9 GET /v1/han alt istek bütçesi: her yerleşim türünde ≤ 12 (şehirde 5 han açıkken); canlı değer kayda yazılır", async () => {
  const SINIR = 12;
  for (const [yerlesim, sayi] of [["demirhan", 5], ["develi", 2], ["kizilca", 1]] as const) {
    const kartlar = Array.from({ length: sayi }, (_, i) => ({ ...kart(i + 1, i === 0 ? "npc" : "oyuncu"), masa: { sayi: 8, acik: 7, oturan: 3 } }));
    for (const secili of [undefined, String(sayi)]) {
      const { b } = await baglam(yerlesim, kartlar);
      let altIstek = 0;
      const yazilan: unknown[] = [];
      const say = <A extends unknown[], R>(f: (...a: A) => Promise<R>) => (...a: A) => (altIstek++, f(...a));
      b.masaCagir = say(b.masaCagir);
      b.hanlarSor = say(b.hanlarSor!);
      b.tanidikSor = say(async () => basarili({ hesaplar: [] as string[] }));
      b.dolulukYaz = say(async (_y: string, k: unknown[]) => (yazilan.push(...k), basarili({})));
      const l = await hanListesi(b, "tr", secili);
      assert.ok(l.ok, JSON.stringify(l));
      assert.ok(altIstek <= SINIR, `${yerlesim} han=${secili ?? 1}: ${altIstek} alt istek`);
      assert.equal(l.deger.hanlar.length, sayi);
      assert.equal(yazilan.length, masaSayisi(yerlesim === "demirhan" ? "sehir" : yerlesim === "develi" ? "kasaba" : "koy"));
      const digeri = l.deger.hanlar.find((h) => h.no !== l.deger.han.no);
      if (digeri) assert.deepEqual(digeri.masa, { sayi: 8, acik: 7, oturan: 3 }, "diğer hanlar kayıttan");
    }
  }
});
