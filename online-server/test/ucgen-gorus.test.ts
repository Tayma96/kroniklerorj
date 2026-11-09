// Faz 4 görüş kalemleri (§4.1): düşmanının dostu, oyuncu dostları, duyulan (kaynak güveniyle, söner, yalanlanınca 0),
// bağ kalemleri toplam ±10; eksenler görüşün izdüşümü; hafıza budaması; kaynak güveni gerekçeli.
import test from "node:test";
import assert from "node:assert/strict";
import { DUYUM_TAVANI, duyumEkle, duyumYalanla, ucgenAl } from "../src/yerlesim/bilgi.ts";
import { iliskiAl } from "../src/yerlesim/eylem.ts";
import { gorus, gorusDegeri } from "../src/yerlesim/gorus.ts";
import { kaynakGuveni, tanikAgirligi } from "../src/yerlesim/haber.ts";
import { eksenler, hafizaBudama } from "../src/yerlesim/hafiza.ts";
import { ucgenDonumu } from "../src/yerlesim/ucgen.ts";
import { bagKur } from "../src/yerlesim/uret.ts";
import type { Dokum } from "../src/yerlesim/tipler.ts";
import { dostYap, gorusAyarla, senaryo } from "./ucgen-yardimci.ts";

const tutar = (d: Dokum) => d.kalemler.reduce((a, k) => a + k.d, 0) === d.toplam;

test("duyulan: Σ yük × güven, söner, yalanlanınca 0; ±15; duyumsuz eski ilişki aynı sonucu verir", () => {
  const { k, murat, berkay } = senaryo();
  const ili = k.ili.get(berkay.o)!;
  const once = gorusDegeri(k, murat, berkay, ili, k.ay);
  const i = iliskiAl(ili, murat.i);
  duyumEkle(i, "n5", "laf", -10, 50, k.ay);
  let d = gorus(k, murat, berkay, ili, k.ay);
  assert.ok(tutar(d));
  assert.equal(d.kalemler.find((x) => x.k === "gorus.duyulan")?.d, -5);
  assert.equal(gorusDegeri(k, murat, berkay, ili, k.ay), once - 5);
  assert.ok(Math.abs(gorus(k, murat, berkay, ili, k.ay + 24).kalemler.find((x) => x.k === "gorus.duyulan")?.d ?? 0) < 5, "söner");
  for (let n = 0; n < 6; n++) duyumEkle(i, `n${10 + n}`, "laf", -20, 100, k.ay);
  assert.equal(gorus(k, murat, berkay, ili, k.ay).kalemler.find((x) => x.k === "gorus.duyulan")?.d, -DUYUM_TAVANI);
  for (const du of i.du!) duyumYalanla(i, du[0]);
  d = gorus(k, murat, berkay, ili, k.ay);
  assert.equal(d.kalemler.find((x) => x.k === "gorus.duyulan"), undefined, "yalanlanan duyum 0");
  delete i.du;
  assert.equal(gorusDegeri(k, murat, berkay, ili, k.ay), once);
});

test("düşmanının dostu ve oyuncu dostları: bağ kalemleri toplamda ±10, döküm = toplam", () => {
  const { k, murat, berkay, hasan } = senaryo();
  // Murat'ın eski rakibi Berkay'ı seviyor → Murat'a eksi.
  const rakip = k.npc.find((n) => n !== murat && !murat.b.some((b) => b[0] === n.i) && Math.floor((k.ay - n.d) / 12) >= 20)!;
  bagKur(murat, rakip, 2, -40, k.ay - 30);
  gorusAyarla(k, rakip, berkay, 60);
  let d = gorus(k, murat, berkay, k.ili.get(berkay.o), k.ay);
  assert.ok(tutar(d));
  assert.equal(d.kalemler.find((x) => x.k === "gorus.dusmaninDostu")?.d, -6);
  // Oyuncu dostları: Murat Hasan'a dost bakıyor (anlık görüntü) ve Hasan Berkay'ın dostu → +5.
  gorusAyarla(k, murat, hasan, 40);
  dostYap(k, berkay.o, hasan.o);
  ucgenDonumu(k, k.ay);
  assert.deepEqual(ucgenAl(k).yk[murat.i]?.map((x) => x[0]), [hasan.o]);
  d = gorus(k, murat, berkay, k.ili.get(berkay.o), k.ay);
  assert.equal(d.kalemler.find((x) => x.k === "gorus.oyuncuDostu")?.d, 5);
  assert.ok(tutar(d));
  const bag = d.kalemler.filter((x) => ["gorus.dostunDostu", "gorus.dusmaninDostu", "gorus.oyuncuDostu", "gorus.bagSinir"].includes(x.k)).reduce((a, x) => a + x.d, 0);
  assert.ok(Math.abs(bag) <= 10);
  // Tanık ağırlığı: Murat'ın dostu Berkay'ı seviyorsa lehte.
  const dost = k.npc.find((n) => n !== murat && n !== rakip && !murat.b.some((b) => b[0] === n.i) && Math.floor((k.ay - n.d) / 12) >= 20)!;
  bagKur(murat, dost, 1, 50, k.ay - 30);
  gorusAyarla(k, dost, berkay, 40);
  assert.ok(tanikAgirligi(k, murat, berkay.o, k.ay).some((x) => x.k === "sans.tanikLehte" && x.d > 0));
});

test("eksenler: görüş kalemlerinin izdüşümü, toplamı görüşe eşit; boş eksen dönmez", () => {
  const { k, murat, berkay } = senaryo();
  const ili = k.ili.get(berkay.o)!;
  const i = iliskiAl(ili, murat.i);
  i.an.push(["borc", 6, k.ay], ["ihanet", -10, k.ay]);
  duyumEkle(i, "n3", "laf", -10, 100, k.ay);
  const d = gorus(k, murat, berkay, ili, k.ay);
  const e = eksenler(d);
  const sinir = d.kalemler.find((x) => x.k === "gorus.sinir")?.d ?? 0;
  assert.equal(Object.values(e).reduce((a, b) => a + (b ?? 0), 0), d.toplam - sinir);
  assert.equal(e.borc, 6);
  assert.ok((e.guven ?? 0) <= -20);
  assert.ok(Object.values(e).every((v) => v !== 0));
  assert.equal(e.korku, undefined);
});

test("hafıza budaması: sönen duyum, süresi geçen şart/ateşkes/boykot düşer; barış değeri kalır; ilişki silinmez", () => {
  const { k, murat, berkay } = senaryo();
  const ili = k.ili.get(berkay.o)!;
  const i = iliskiAl(ili, murat.i);
  duyumEkle(i, "n3", "laf", -2, 40, k.ay);
  i.ab = { v: 7, a: k.ay, ar: "o3", s: [10, 3, k.ay + 1], ak: k.ay + 2 };
  i.bk = k.ay + 1;
  hafizaBudama(i, k.ay + 3);
  assert.equal(i.du, undefined);
  assert.deepEqual(i.ab, { v: 7, a: k.ay, ar: "o3" });
  assert.equal(i.bk, undefined);
});

test("kaynak güveni gerekçeli: dost bağı artırır, rakip ve leke düşürür", () => {
  const { k, murat } = senaryo();
  const [a, b] = k.npc.filter((n) => n !== murat && !murat.b.some((x) => x[0] === n.i) && n.e !== murat.e && Math.floor((k.ay - n.d) / 12) >= 20 && n.es !== murat.i);
  const taban = kaynakGuveni(k, a!, murat, k.ay);
  bagKur(a!, murat, 1, 60, k.ay - 20);
  const dost = kaynakGuveni(k, a!, murat, k.ay);
  assert.ok(dost.toplam > taban.toplam);
  assert.ok(dost.kalemler.some((x) => x.k === "guven.dost"));
  bagKur(b!, murat, 2, -60, k.ay - 20);
  ucgenAl(k).lk[murat.i] = k.ay + 5;
  const r = kaynakGuveni(k, b!, murat, k.ay);
  assert.ok(r.kalemler.some((x) => x.k === "guven.rakip") && r.kalemler.some((x) => x.k === "guven.leke"));
  assert.ok(r.toplam < taban.toplam);
});
