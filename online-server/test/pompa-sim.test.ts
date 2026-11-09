// Simülasyon (Faz 3a ölçütü): iki hesaplı servet pompalama. Pompacı çift her ay birbirine azami armağan ve borç
// aktarır, kalan takatiyle düz oynar; düz çift yalnız düz oynar (ayak işi). Ölçülen: çiftin toplam akçesi (aktarım
// sıfır toplamlıdır, takat bedeli vardır), alanın aylık kazanç tavanı ve aynı kişiye armağanın azalan cömertlik namı.
import test from "node:test";
import assert from "node:assert/strict";
import { eylemKapisi, eylemYap } from "../src/yerlesim/eylem.ts";
import { yas } from "../src/yerlesim/ortak.ts";
import { tohumlu } from "../src/yerlesim/rastgele.ts";
import { takatTazele } from "../src/yerlesim/karakter.ts";
import { HEDIYE_ALMA_AYLIK, HEDIYE_EN_COK, HEDIYE_NAM, teklifCevap, teklifDonumu, teklifOlustur } from "../src/yerlesim/teklif.ts";
import type { Karakter } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const AY = 24;

test("servet pompalama: hediye ve borç döngüsü çiftin toplam akçesini düz oyunun üstüne çıkarmaz", () => {
  const k = testKasabasi("develi", 300);
  const [a, b, c, d] = [1, 2, 3, 4].map((i) => oyuncuEkle(k, i, k.ay - 13 * 12 - 2)) as [Karakter, Karakter, Karakter, Karakter];
  [a, b, c, d].forEach((x, i) => {
    x.e = 9000 + i; // ayrı ocaklar
    x.pa = 40;
  });
  const havuz = k.npc.filter((n) => yas(n.d, k.ay) >= 20 && n.m !== 0).map((n) => n.i);
  const duzOyna = (kar: Karakter, ay: number) => {
    const ili = k.ili.get(kar.o)!;
    for (let j = 0; j < 40; j++) {
      const npc = k.dizin.get(havuz[(Number(kar.o.slice(1)) * 0 + j * 7 + ay * 3) % havuz.length]!);
      const engel = eylemKapisi(k, "ayakIsi", kar, npc, ay);
      if (engel === "takat_yok") break;
      if (engel) continue;
      assert.ok(eylemYap(k, kar, ili, { tur: "ayakIsi", hedef: `n${npc!.i}` }, ay, tohumlu("pompa", ay, j)).ok);
    }
  };
  const toplam = (x: Karakter, y: Karakter) => {
    const emanet = (k.tp?.tk ?? []).filter((t) => (t.g === x.o || t.g === y.o) && t.d === "acik").reduce((s, t) => s + t.e, 0);
    return x.pa + y.pa + emanet;
  };
  const bBaslangic = b.pa;
  const aNam = a.nm[0]!;
  let enCokAylikB = 0;

  for (let i = 1; i <= AY; i++) {
    k.ay += 1;
    const ay = k.ay;
    for (const x of [a, b, c, d]) takatTazele(x, ay);
    teklifDonumu(k, ay);
    const bOnce = b.pa;
    // Pompa: A → B azami akçe armağanı; B → A borç (vade 1, faizsiz; ay dönümünde geri tahsil).
    const h = teklifOlustur(k, a, b, { tur: "hediye", tutar: Math.min(HEDIYE_EN_COK, a.pa) }, ay);
    if (h.ok) teklifCevap(k, b, `t${h.deger.teklif.i}`, "kabul", {}, ay);
    const br = teklifOlustur(k, b, a, { tur: "borc", yon: "ver", tutar: Math.max(1, Math.min(20, b.pa)), vade: 1 }, ay);
    if (br.ok) teklifCevap(k, a, `t${br.deger.teklif.i}`, "kabul", {}, ay);
    enCokAylikB = Math.max(enCokAylikB, b.pa - bOnce);
    // Herkes kalan takatiyle düz oynar.
    for (const x of [a, b, c, d]) duzOyna(x, ay);
  }
  k.ay += 1;
  teklifDonumu(k, k.ay);

  const pompa = toplam(a, b);
  const duz = toplam(c, d);
  assert.ok(pompa <= duz, `pompa çifti ${pompa} ≤ düz çift ${duz}`);
  assert.ok(enCokAylikB <= HEDIYE_ALMA_AYLIK, "alanın aylık armağan kazancı tavanlı");
  assert.ok(b.pa - bBaslangic <= AY * HEDIYE_ALMA_AYLIK);
  // Aynı kişiye 24 ay armağan: cömertlik namı azalan getiriyle tam kazancın yarısının altında kalır.
  assert.ok(a.nm[0]! - aNam <= (AY * HEDIYE_NAM) / 2, `cömertlik ${a.nm[0]! - aNam}`);
});
