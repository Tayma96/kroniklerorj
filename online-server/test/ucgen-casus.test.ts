// Casus (§6.3): özel eylem rapora girmez, gizli görüşmenin yalnız varlığı görünür, düşük güvende çarpık rapor
// oranı yüksektir, ayda tek rapor, izlenene dost bakan casus haber verir; bedel hazineye (akçe korunur).
import test from "node:test";
import assert from "node:assert/strict";
import { HUYLAR } from "../src/icerik/kisilik.ts";
import { ucgenAl, ucgenEmanet } from "../src/yerlesim/bilgi.ts";
import { CASUS_AYLIK_BEDEL, casusDonumu, casusTut } from "../src/yerlesim/casus.ts";
import { iliskiAl } from "../src/yerlesim/eylem.ts";
import type { Kasaba } from "../src/yerlesim/tipler.ts";
import { toplamAkce } from "./hanedan-yardimci.ts";
import { baglam, gorusAyarla, kopya, senaryo } from "./ucgen-yardimci.ts";

const akce = (k: Kasaba) => toplamAkce(k) + ucgenEmanet(k);

function kur(huy: string) {
  const s = senaryo();
  const { k, ahmet, berkay } = s;
  const casus = k.npc.find((n) => n !== s.murat && n.e !== ahmet.e && n.e !== berkay.e && Math.floor((k.ay - n.d) / 12) >= 20)!;
  casus.h = HUYLAR.indexOf(huy);
  gorusAyarla(k, casus, ahmet, 10);
  gorusAyarla(k, casus, berkay, 0);
  const [x, y] = k.npc.filter((n) => n !== casus && n !== s.murat && Math.floor((k.ay - n.d) / 12) >= 16);
  // Berkay bu ay X ile sohbet etti (herkese açık), Y için ayak işi yaptı (özel), Murat'la gizli görüştü (kışkırtma izi).
  const ili = k.ili.get(berkay.o)!;
  (iliskiAl(ili, x!.i).az.sohbet ??= []).push(k.ay);
  (iliskiAl(ili, y!.i).az.ayakIsi ??= []).push(k.ay);
  (iliskiAl(ili, s.murat.i).az.kiskirt ??= []).push(k.ay);
  ahmet.pa = 20;
  return { ...s, casus, x: x!, y: y! };
}

test("casus: rapor yalnız görüşmeleri verir; özel eylem girmez; gizli görüşmenin içeriği görünmez; ayda tek", () => {
  const s = kur("kurnaz");
  const once = akce(s.k);
  const r = casusTut(baglam(s.k, s.ahmet), { npc: s.casus.i, izlenen: s.berkay.o, sure: 2 });
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(s.ahmet.pa, 20 - 2 * CASUS_AYLIK_BEDEL);
  assert.equal(akce(s.k), once, "bedel hazineye");
  assert.deepEqual(casusTut(baglam(s.k, s.ahmet), { npc: s.casus.i, izlenen: s.berkay.o, sure: 1 }), { ok: false, hata: "casus_var" });
  const olaylar = casusDonumu(s.k, s.k.ay + 1);
  const rapor = olaylar.filter((o) => o.k === "olay.ucgen.casusRapor");
  assert.ok(rapor.length >= 1 && rapor.length <= 2);
  assert.ok(rapor.every((o) => o.g === s.ahmet.o));
  const kisiler = rapor.map((o) => (o.p.npc as { i: string }).i);
  assert.ok(!kisiler.includes(`n${s.y.i}`), "ayak işi (özel) rapora girmez");
  const murat = rapor.find((o) => (o.p.npc as { i: string }).i === `n${s.murat.i}`);
  if (murat) assert.equal(murat.p.tur, "gizliGorusme");
  assert.equal(casusDonumu(s.k, s.k.ay + 1).length, 0, "aynı ay ikinci rapor yok");
});

test("casus: düşük güvende çarpık rapor oranı yüksek, yüksek güvende çarpıklık yok", () => {
  const carpik = (huy: string) => {
    let n = 0;
    let toplam = 0;
    for (let i = 0; i < 60; i++) {
      const s = kopya(kur(huy));
      const ug = ucgenAl(s.k);
      ug.n = 1 + i;
      assert.ok(casusTut(baglam(s.k, s.ahmet), { npc: s.casus.i, izlenen: s.berkay.o, sure: 1 }).ok);
      for (const o of casusDonumu(s.k, s.k.ay + 1)) {
        if (o.k !== "olay.ucgen.casusRapor") continue;
        toplam++;
        const id = (o.p.npc as { i: string }).i;
        const dogruKisi = id === `n${s.x.i}` || id === `n${s.murat.i}`;
        if (!dogruKisi) n++;
      }
    }
    return { n, toplam };
  };
  const dusuk = carpik("unutkan");
  const yuksek = carpik("kurnaz");
  assert.ok(dusuk.toplam > 0 && yuksek.toplam > 0);
  assert.ok(dusuk.n > yuksek.n, `düşük ${dusuk.n}/${dusuk.toplam} yüksek ${yuksek.n}/${yuksek.toplam}`);
  assert.equal(yuksek.n, 0);
});

test("casus: izlenene dost bakan casus izlenene haber verir ve casusluk biter", () => {
  const s = kur("kurnaz");
  gorusAyarla(s.k, s.casus, s.berkay, 50);
  assert.ok(casusTut(baglam(s.k, s.ahmet), { npc: s.casus.i, izlenen: s.berkay.o, sure: 3 }).ok);
  const o = casusDonumu(s.k, s.k.ay + 1);
  const ihbar = o.find((x) => x.k === "olay.ucgen.casusIhbar")!;
  assert.equal(ihbar.g, s.berkay.o);
  assert.ok(ihbar.p.guven);
  assert.ok(o.some((x) => x.k === "olay.ucgen.casusBitti" && x.g === s.ahmet.o));
  assert.equal(ucgenAl(s.k).cs.length, 0);
});
