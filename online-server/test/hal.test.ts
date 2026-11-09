import test from "node:test";
import assert from "node:assert/strict";
import {
  CAN_AYLIK_TOPARLAMA,
  GONUL_DENGE,
  HAL_NEDEN_EN_COK,
  HAL_TABAN_CAN,
  IS_KONDISYON,
  KONDISYON_AYLIK_TOPARLAMA,
  gonulKademesi,
  halAl,
  halDegistir,
  halGorunumu,
  kondisyonKademesi,
} from "../src/yerlesim/hal.ts";
import { TAKAT_TAVAN, takatTazele } from "../src/yerlesim/karakter.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

test("eski karakter (hl yok) tam Hal ile başlar, çökmez", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k);
  delete c.hl;
  const h = halAl(c, k.ay);
  assert.deepEqual(h, { can: 100, kondisyon: 100, gonul: GONUL_DENGE });
  const g = halGorunumu(c, k.ay);
  assert.equal(g.kondisyon.kademe, "iyi");
  assert.equal(g.kondisyon.etki.p.takatAylik, 6);
  assert.deepEqual(g.nedenler, []);
});

test("tembel toparlama: kondisyon ve can aylık artar, gönül dengeye yaklaşır; tavan 100", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k);
  c.hl = [60, 20, 80, k.ay];
  assert.deepEqual(halAl(c, k.ay + 2), {
    can: 60 + 2 * CAN_AYLIK_TOPARLAMA,
    kondisyon: 20 + 2 * KONDISYON_AYLIK_TOPARLAMA,
    gonul: 70,
  });
  assert.deepEqual(halAl(c, k.ay + 40), { can: 100, kondisyon: 100, gonul: GONUL_DENGE });
  c.hl = [100, 100, 40, k.ay];
  assert.equal(halAl(c, k.ay + 1).gonul, 45);
  assert.equal(halAl(c, k.ay + 5).gonul, GONUL_DENGE, "dengeyi aşmaz");
});

test("yaralıyken kondisyon yarı hızda toparlanır (görünür etki)", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k);
  c.hl = [20, 10, 50, k.ay];
  const g = halGorunumu(c, k.ay);
  assert.equal(g.can.durum, "yarali");
  const hiz = g.can.etki.p.kondisyonToparlama!;
  assert.ok(hiz < KONDISYON_AYLIK_TOPARLAMA);
  assert.equal(halAl(c, k.ay + 1).kondisyon, 10 + hiz);
});

test("can tabanı: can 10'un altına inmez; diğerleri 0..100", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k);
  const f = halDegistir(c, k.ay, { can: -500, kondisyon: -500, gonul: 500 }, "hal.neden.deneme");
  assert.deepEqual(halAl(c, k.ay), { can: HAL_TABAN_CAN, kondisyon: 0, gonul: 100 });
  assert.deepEqual(f, { can: HAL_TABAN_CAN - 100, kondisyon: -100, gonul: 50 });
});

test("nedenler: son 3, aynı ay ve aynı nedende birikir", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k);
  halDegistir(c, k.ay, { kondisyon: -IS_KONDISYON }, "hal.neden.temelIs");
  halDegistir(c, k.ay, { kondisyon: -IS_KONDISYON }, "hal.neden.temelIs");
  let g = halGorunumu(c, k.ay);
  assert.equal(g.nedenler.length, 1);
  assert.deepEqual(g.nedenler[0], { gosterge: "kondisyon", fark: -2 * IS_KONDISYON, neden: "hal.neden.temelIs", ay: k.ay });
  halDegistir(c, k.ay, { gonul: 3 }, "hal.neden.sohbet");
  halDegistir(c, k.ay, { kondisyon: -1 }, "hal.neden.tarif");
  halDegistir(c, k.ay, { kondisyon: -1 }, "hal.neden.temelIs");
  g = halGorunumu(c, k.ay);
  assert.equal(g.nedenler.length, HAL_NEDEN_EN_COK);
  assert.equal(g.nedenler[0]!.neden, "hal.neden.temelIs", "en yeni önce");
});

test("kondisyon kademesi takat yenilenmesini belirler: iyi 6, yorgun 5, bitkin 4", () => {
  assert.equal(kondisyonKademesi(100).takat, 6);
  assert.equal(kondisyonKademesi(60).kademe, "iyi");
  assert.equal(kondisyonKademesi(59).takat, 5);
  assert.equal(kondisyonKademesi(30).kademe, "yorgun");
  assert.equal(kondisyonKademesi(29).takat, 4);
  assert.equal(gonulKademesi(70).durum, "sen");
  assert.equal(gonulKademesi(50).durum, "olagan");
  assert.equal(gonulKademesi(29).durum, "kirgin");

  const k = testKasabasi();
  const c = oyuncuEkle(k);
  c.tk = 0;
  c.hl = [100, 20, 50, k.ay];
  takatTazele(c, k.ay + 1);
  assert.equal(c.tk, 4, "ay sonunda bitkin → gelecek ay 4 takat");
  // Toparlanınca (20 → 35 → 50 → 65) sırayla 5, 5, 6.
  c.tk = 0;
  takatTazele(c, k.ay + 4);
  assert.equal(c.tk, 5 + 5 + 6);
  takatTazele(c, k.ay + 400);
  assert.equal(c.tk, TAKAT_TAVAN);
});

test("başarılı sohbet gönülü artırır; gönül yüksekken şans dökümünde görünür kalem", async () => {
  const { eylemSansi, eylemYap } = await import("../src/yerlesim/eylem.ts");
  const { hepBasari, npcBul } = await import("./kasaba-yardimci.ts");
  const k = testKasabasi();
  const kar = oyuncuEkle(k, 1, k.ay - 13 * 12 - 1);
  kar.tk = 18;
  const npc = npcBul(k, kar, 20, 60);
  const ili = k.ili.get(kar.o)!;
  const r = eylemYap(k, kar, ili, { tur: "sohbet", hedef: `n${npc.i}` }, k.ay, hepBasari);
  assert.ok(r.ok && r.deger.sonuc.basari);
  assert.equal(r.deger.sonuc.degisim.gonul, 3);
  assert.equal(halAl(kar, k.ay).gonul, GONUL_DENGE + 3);
  assert.equal(eylemSansi(k, "sohbet", npc, kar, ili, k.ay).kalemler.some((x) => x.k === "sans.gonul"), false);
  kar.hl = [100, 100, 80, k.ay];
  const s = eylemSansi(k, "sohbet", npc, kar, ili, k.ay);
  assert.deepEqual(s.kalemler.find((x) => x.k === "sans.gonul"), { k: "sans.gonul", d: 5, p: { gonul: 80 } });
  assert.equal(s.kalemler.reduce((a, x) => a + x.d, 0), s.toplam);
  assert.equal(eylemSansi(k, "cirak", npc, kar, ili, k.ay).kalemler.some((x) => x.k === "sans.gonul"), false);
});
