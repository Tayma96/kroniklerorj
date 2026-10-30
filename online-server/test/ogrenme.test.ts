import test from "node:test";
import assert from "node:assert/strict";
import { eylemYap } from "../src/yerlesim/eylem.ts";
import { acikMi, ogrenmeDurumu, ogrenmeGunu, ogrenmeIlerle, ogrenmeSuruyor, sayacArtir } from "../src/yerlesim/ogrenme.ts";
import { MESLEKLER } from "../src/icerik/kisilik.ts";
import { hepBasari, npcBul, oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

test("öğrenme dönemi: 6 gerçek gün (12 ay), her gün (2 ay) bir sistem açılır", () => {
  const k = testKasabasi("kizilca", 0);
  const kar = oyuncuEkle(k);
  const M = k.ay;
  assert.deepEqual(
    [0, 1, 2, 3, 4, 6, 8, 10, 11, 12, 40].map((d) => ogrenmeGunu(kar, M + d)),
    [1, 1, 2, 2, 3, 4, 5, 6, 6, 6, 6],
  );
  assert.equal(ogrenmeSuruyor(kar, M + 11), true);
  assert.equal(ogrenmeSuruyor(kar, M + 12), false);
  const kapilar: [string, number][] = [["sohbet", 1], ["tanidik", 1], ["cirak", 2], ["mektep", 3], ["puan", 3], ["ayakIsi", 4], ["hediye", 5], ["dost", 5], ["karar", 6]];
  for (const [sistem, gun] of kapilar) {
    const ay = M + (gun - 1) * 2;
    assert.equal(acikMi(kar, ay, sistem), true, `${sistem} ${gun}. gün açık`);
    if (gun > 1) assert.equal(acikMi(kar, ay - 1, sistem), false, `${sistem} önceki gün kapalı`);
  }
});

test("günlük hedefin ödülü bir kez verilir; kaçırılan gün sonra tamamlanır", () => {
  const k = testKasabasi("kizilca", 0);
  const kar = oyuncuEkle(k);
  const ili = k.ili.get(kar.o)!;
  const M = k.ay;
  const usta = npcBul(k, kar, 25, 60, (n) => n.m !== MESLEKLER.indexOf("işsiz") && n.m !== MESLEKLER.indexOf("asker"));
  const sohbet = (ay: number) => {
    kar.tk = 18;
    const r = eylemYap(k, kar, ili, { tur: "sohbet", hedef: `n${usta.i}` }, ay, hepBasari);
    assert.ok(r.ok);
    return r.deger.sonuc;
  };
  const para = kar.pa;
  assert.deepEqual(sohbet(M).ogrenme, []);
  assert.deepEqual(sohbet(M).ogrenme, [{ gun: 1, odul: { para: 3 } }]);
  assert.equal(kar.pa, para + 3);
  assert.deepEqual(sohbet(M).ogrenme, [], "ödül bir kez");

  // 2-4. günleri kaçırdı; 5. gün (ay M+8) geri döndü ve hepsini yaptı.
  const ay = M + 8;
  kar.tk = 18;
  const c = eylemYap(k, kar, ili, { tur: "cirak", hedef: `n${usta.i}` }, ay, hepBasari);
  assert.ok(c.ok);
  assert.deepEqual(c.deger.sonuc.ogrenme, [{ gun: 2, odul: { beceri: ["zanaat", 2] } }]);
  const mk = eylemYap(k, kar, ili, { tur: "mektep" }, ay, hepBasari);
  assert.ok(mk.ok);
  assert.deepEqual(mk.deger.sonuc.ogrenme, [{ gun: 3, odul: { ozellikPuani: 1 } }]);
  assert.equal(kar.op, 1);
  sayacArtir(kar, "ayakIsi", 2);
  assert.deepEqual(ogrenmeIlerle(kar, ay), [{ gun: 4, odul: { para: 3 } }]);
  assert.deepEqual(ogrenmeIlerle(kar, ay), []);
  // 6. günün hedefi henüz açılmadı: sayaç dolsa da ödül 6. güne kadar bekler.
  sayacArtir(kar, "karar");
  assert.deepEqual(ogrenmeIlerle(kar, ay), []);
  assert.deepEqual(ogrenmeIlerle(kar, M + 10), [{ gun: 6, odul: { ozellikPuani: 1 } }]);
  const d = ogrenmeDurumu(kar, M + 10);
  assert.deepEqual(d.gunler.map((g) => g.tamam), [true, true, true, true, false, true]);
  assert.equal(d.gun, 6);
  assert.equal(d.gunler[4]?.hedef.k, "ogrenme.hedef.dostluk");
});
