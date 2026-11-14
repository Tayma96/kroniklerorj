// H7 ziyafet (saf): bedel ölçeği ve tavanı, konuk şartı (hesap kümesi), nam mevsimde bir, tanıklık.
import test from "node:test";
import assert from "node:assert/strict";
import { ZIYAFET_KONUK_BASI, ZIYAFET_NAM, ZIYAFET_TABAN, ZIYAFET_TAVAN, ziyafetBedeli, ziyafetGirdisiCoz } from "../src/han/ziyafet.ts";
import { ziyafetEtkisi, ziyafetKonukSayisi } from "../src/yerlesim/han-olay.ts";
import { NAMLAR } from "../src/yerlesim/karakter.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

test("H7 bedel oturan sayısıyla ölçeklenir ve tavanlıdır; girdi doğrulanır (bedel istemciden alınmaz)", () => {
  assert.equal(ziyafetBedeli(2), ZIYAFET_TABAN + 2 * ZIYAFET_KONUK_BASI);
  assert.equal(ziyafetBedeli(5), ZIYAFET_TAVAN);
  assert.ok(ziyafetBedeli(3) < ziyafetBedeli(4) || ziyafetBedeli(4) === ZIYAFET_TAVAN);
  assert.deepEqual(ziyafetGirdisiCoz({ masa: 2, istekNo: "ziyafet-00001", bedel: 1 }), { ok: true, deger: { masa: 2, istekNo: "ziyafet-00001" } });
  const kotu = ziyafetGirdisiCoz({ masa: 99, istekNo: "ziyafet-00001" });
  assert.equal(kotu.ok ? "" : kotu.hata, "masa_gecersiz");
});

test("H7 konuk şartı hane/hesap kümesini saymaz; nam oyuncu başına mevsimde bir; oturanlara tanıklık", () => {
  const k = testKasabasi("develi", 300);
  const [a, b, c, d] = [1, 2, 3, 4].map((n) => oyuncuEkle(k, n, k.ay - 20 * 12));
  const haneler = [...new Set(k.npc.map((n) => n.e).filter((e) => e !== 0))];
  a!.e = haneler[0]!;
  b!.e = haneler[0]!;
  c!.e = haneler[1]!;
  d!.e = haneler[2]!;
  assert.equal(ziyafetKonukSayisi(a!, [b!, c!]), 1, "hane üyesi konuk sayılmaz");
  assert.equal(ziyafetKonukSayisi(a!, [b!, c!, d!]), 2);
  const COM = NAMLAR.indexOf("comertlik");
  const once = a!.nm[COM] ?? 0;
  const ay = k.ay - ((k.ay + 1) % 3);
  const e1 = ziyafetEtkisi(k, a!, [b!, c!, d!], 1, 10, ay);
  assert.equal(e1.nam, ZIYAFET_NAM);
  assert.equal((a!.nm[COM] ?? 0) - once, ZIYAFET_NAM);
  assert.deepEqual(e1.olaylar.map((o) => o.g).sort(), [a!.o, b!.o, c!.o, d!.o].sort());
  assert.deepEqual([e1.olaylar[0]!.k, e1.olaylar[0]!.p.konuk, e1.olaylar[0]!.p.bedel], ["olay.han.ziyafet", 3, 10]);
  const e2 = ziyafetEtkisi(k, a!, [b!, c!, d!], 1, 10, ay + 2);
  assert.deepEqual([e2.nam, e2.engel], [0, "mevsimde_bir"]);
  const e3 = ziyafetEtkisi(k, a!, [b!, c!, d!], 1, 10, ay + 3);
  assert.equal(e3.nam, ZIYAFET_NAM, "yeni mevsimde yeniden");
});
