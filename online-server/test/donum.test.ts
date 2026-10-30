import test from "node:test";
import assert from "node:assert/strict";
import { bellekDepo } from "../src/depo.ts";
import { AY_MS, DUNYA_BASLANGICI_MS } from "../src/saat.ts";
import { ayDonumu } from "../src/yerlesim/donum.ts";
import { iliskiAl } from "../src/yerlesim/eylem.ts";
import { YerlesimMotoru } from "../src/yerlesim/motor.ts";
import { yas } from "../src/yerlesim/ortak.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const an = (ay: number) => DUNYA_BASLANGICI_MS + ay * AY_MS + 60_000;

test("ay dönümü: yaşlanma doğum ayından, deterministik ve sıralı olaylar", () => {
  const a = testKasabasi("develi", 0);
  const b = testKasabasi("develi", 0);
  const yaslar = new Map(a.npc.map((n) => [n.i, yas(n.d, 0)]));
  const olaylarA = [];
  const olaylarB = [];
  for (let ay = 1; ay <= 24; ay++) {
    olaylarA.push(...ayDonumu(a, ay).map((o) => ({ ay, ...o })));
    olaylarB.push(...ayDonumu(b, ay).map((o) => ({ ay, ...o })));
  }
  assert.deepEqual(olaylarA, olaylarB, "aynı tohum aynı olaylar");
  assert.deepEqual(a.npc, b.npc);
  assert.equal(a.ay, 24);
  for (const n of a.npc) {
    const once = yaslar.get(n.i);
    if (once !== undefined) assert.equal(yas(n.d, 24), once + 2, "iki yılda iki yaş");
  }
  const turler = new Set(olaylarA.map((o) => o.k));
  for (const k of ["olay.olum", "olay.dogum", "olay.evlilik", "olay.gundem"]) assert.ok(turler.has(k), k);
  // Ölenler nüfustan düşer; yeni doğanlar nüfusa katılır ve 0 yaşındadır.
  const dogan = olaylarA.filter((o) => o.k === "olay.dogum");
  for (const o of dogan) {
    const c = o.p.cocuk as { i: string };
    const n = a.dizin.get(Number(c.i.slice(1)));
    if (n) assert.equal(n.d, o.ay);
  }
  for (const o of olaylarA.filter((x) => x.k === "olay.olum")) assert.equal(a.dizin.has(Number(o.w.slice(1))), false);
});

test("oyuncu olayları: öğrenme günü her 2 ayda, 13 yaşında Kül Yemini kancası", () => {
  const k = testKasabasi("kizilca", 0);
  const kar = oyuncuEkle(k);
  const gunler: number[] = [];
  let kul = 0;
  for (let ay = 1; ay <= 14; ay++) {
    for (const o of ayDonumu(k, ay)) {
      if (o.k === "olay.ogrenme.gun") {
        assert.equal(o.g, kar.o, "özel olay");
        gunler.push(o.p.gun as number);
      }
      if (o.k === "olay.kulYemini") {
        kul = ay;
        assert.equal(o.g, kar.o);
      }
    }
  }
  assert.deepEqual(gunler, [2, 3, 4, 5, 6]);
  assert.equal(kul, 12);
  assert.equal(kar.ky, 1);
});

test("NPC'nin kendiliğinden hamlesi: dost çorba getirir, hasım laf eder ve dostlarına anı bırakır", () => {
  const k = testKasabasi("develi", 0);
  const kar = oyuncuEkle(k);
  const ili = k.ili.get(kar.o)!;
  const adaylar = k.npc.filter((n) => n.e !== kar.e && yas(n.d, 0) >= 25 && yas(n.d, 0) <= 50);
  const dostlar = adaylar.slice(0, 6);
  const hasimlar = adaylar.filter((n) => n.b.some((b) => b[1] === 1)).slice(-6);
  const para = kar.pa;
  let corba = 0;
  let laf = 0;
  for (let ay = 1; ay <= 36; ay++) {
    for (const n of dostlar) iliskiAl(ili, n.i).t = 60;
    for (const n of hasimlar) iliskiAl(ili, n.i).t = -60;
    for (const o of ayDonumu(k, ay)) {
      if (o.k === "olay.hamle.corba") corba++;
      if (o.k === "olay.hamle.laf") {
        laf++;
        assert.equal(o.p.sebep, "gorus.gecmis", "en ağır sebep yazılır");
        assert.equal(o.g, kar.o);
      }
    }
  }
  assert.ok(corba > 0 && laf > 0, `${corba} ${laf}`);
  assert.ok(corba <= 36 && laf <= 36, "oyuncu başına ayda en çok bir hamle");
  assert.ok(kar.pa >= para + corba);
  const lafDuyan = Object.values(ili).filter((i) => i.an.some((a) => a[0] === "laf"));
  assert.ok(lafDuyan.length > 0, "hasımın dostları aleyhte söz duydu");
});

test("kaçan dönümler sırayla yetiştirilir: çağrı başına en çok 12 ay, sonra kalır", async () => {
  const depo = bellekDepo();
  const m = await YerlesimMotoru.ac(depo, "kizilca", an(0));
  assert.ok(m);
  assert.equal(m.kasaba.ay, 0);
  assert.equal(depo.veri.has("m"), true);
  const r1 = await m.yetistir(an(30));
  assert.deepEqual(r1, { islenen: 12, kalan: 18 });
  const r2 = await m.yetistir(an(30));
  assert.deepEqual(r2, { islenen: 12, kalan: 6 });
  const r3 = await m.yetistir(an(30));
  assert.deepEqual(r3, { islenen: 6, kalan: 0 });
  assert.deepEqual(await m.yetistir(an(30)), { islenen: 0, kalan: 0 });

  // Depodan yeniden açılan kasaba bellekteki ile aynıdır; aynı tohum, kesintisiz işlenmişle aynı sonuç.
  const yeniden = await YerlesimMotoru.ac(depo, "kizilca", an(30));
  assert.deepEqual(yeniden?.kasaba.npc, m.kasaba.npc);
  assert.equal(yeniden?.kasaba.ay, 30);
  const tek = testKasabasi("kizilca", 0);
  for (let ay = 1; ay <= 30; ay++) ayDonumu(tek, ay);
  assert.deepEqual(tek.npc, m.kasaba.npc);
  assert.equal(await YerlesimMotoru.ac(depo, "develi", an(30)), undefined, "başka yerleşimin deposu açılmaz");
});
