// Han eylem/ikram: eşzamanlı isteklerde günlük tavan aşılmaz, aynı istekNo iki kez ödetmez ya da anons etmez.
import test from "node:test";
import assert from "node:assert/strict";
import { bellekDepo } from "../src/depo.ts";
import { hanEylemi, hanIkrami, type HanHesapBaglami } from "../src/han/hesap-kopru.ts";
import { IKRAM_GUNLUK } from "../src/han/ikram.ts";
import { HAN_EYLEM_GUNLUK } from "../src/han/kurallar.ts";
import { basarili, hata } from "../src/tipler.ts";

const SIMDI = 1_800_000_000_000;

/** Bütün masa çağrıları bir sonraki mikro görev turunda biter: eşzamanlı istekler await'te iç içe geçer. */
async function baglam(ek: Partial<HanHesapBaglami> = {}) {
  const depo = bellekDepo();
  await depo.koy({ profil: { hesapId: "ali", ad: "Ali", cinsiyet: "erkek", beylik: "demirhan", yerlesim: "kizilca", dogumAyi: 0, olusturma: 0 } });
  const cagri: string[] = [];
  let odeme = 0;
  const b: HanHesapBaglami = {
    depo,
    hesapId: "ali",
    simdi: SIMDI,
    yaptirim: undefined,
    masaCagir: async (_ad, i) => {
      for (let t = 0; t < 5; t++) await Promise.resolve();
      cagri.push(i.islem);
      return basarili({ olay: { tur: "x" } });
    },
    ikramOde: async () => {
      for (let t = 0; t < 5; t++) await Promise.resolve();
      odeme++;
      return basarili({ para: 100 });
    },
    ...ek,
  };
  return { b, cagri, odeme: () => odeme };
}

test("eşzamanlı han eylemleri günlük tavanı aşamaz", async () => {
  const { b } = await baglam();
  const n = HAN_EYLEM_GUNLUK + 10;
  const sonuclar = await Promise.all(
    Array.from({ length: n }, (_, i) => hanEylemi(b, { masa: 1, tur: "yemin", istekNo: `eylem-${String(i).padStart(8, "0")}` })),
  );
  assert.equal(sonuclar.filter((s) => s.ok).length, HAN_EYLEM_GUNLUK);
  assert.equal(sonuclar.filter((s) => !s.ok && s.hata === "eylem_siniri").length, 10);
});

test("başarısız masa çağrısı sayacı tüketmez", async () => {
  let red = true;
  const { b } = await baglam({ masaCagir: async () => (red ? hata("masa_gecersiz") : basarili({ olay: {} })) });
  const r = await hanEylemi(b, { masa: 1, tur: "yemin", istekNo: "eylem-red-0001" });
  assert.equal(r.ok, false);
  red = false;
  const sonuclar = await Promise.all(
    Array.from({ length: HAN_EYLEM_GUNLUK }, (_, i) => hanEylemi(b, { masa: 1, tur: "yemin", istekNo: `eylem-${String(i).padStart(8, "0")}` })),
  );
  assert.equal(sonuclar.filter((s) => s.ok).length, HAN_EYLEM_GUNLUK);
});

test("eşzamanlı ikramlar günlük tavanı aşamaz; aynı istekNo bir kez ödenir ve anons edilir", async () => {
  const { b, cagri, odeme } = await baglam();
  const govde = { masa: 1, hedef: "veli", ikram: "yemek", istekNo: "ikram-ayni-0001" };
  const [a, c] = await Promise.all([hanIkrami(b, govde), hanIkrami(b, govde)]);
  assert.ok(a.ok && c.ok);
  assert.deepEqual(a, c);
  assert.equal(odeme(), 1);
  assert.equal(cagri.filter((x) => x === "anons").length, 1);

  const sonuclar = await Promise.all(
    Array.from({ length: IKRAM_GUNLUK + 5 }, (_, i) => hanIkrami(b, { ...govde, istekNo: `ikram-${String(i).padStart(8, "0")}` })),
  );
  assert.equal(sonuclar.filter((s) => s.ok).length, IKRAM_GUNLUK - 1);
  assert.equal(odeme(), IKRAM_GUNLUK);
});
