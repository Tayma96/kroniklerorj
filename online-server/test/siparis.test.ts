import test from "node:test";
import assert from "node:assert/strict";
import { MALLAR, type MalId } from "../src/icerik/mallar.ts";
import { meslekSec } from "../src/yerlesim/meslek.ts";
import { npcFiyat } from "../src/yerlesim/npc-taban.ts";
import {
  SIPARIS_AGIRLIK,
  SIPARIS_EN_COK,
  SIPARIS_HIZMET,
  SIPARIS_MALLARI,
  SIPARIS_ODUL_CARPANI,
  SIPARIS_SURE,
  siparisDonumu,
  siparisGorunumu,
  siparisTeslim,
} from "../src/yerlesim/siparis.ts";
import { gorusDegeri } from "../src/yerlesim/gorus.ts";
import { KITLIK_PRIM } from "../src/yerlesim/npc-taban.ts";
import type { Kasaba } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

/** Kasabayı `ay` aya kadar yalnız sipariş dönümüyle ilerletir (NPC nüfusu sabit kalır). */
function ilerlet(k: Kasaba, kadar: number) {
  const olaylar = [];
  while (k.ay < kadar) {
    k.ay++;
    olaylar.push(...siparisDonumu(k, k.ay));
  }
  return olaylar;
}

test("üretim deterministik, açık sipariş en çok SIPARIS_EN_COK, aynı mal iki kez açık değil", () => {
  const a = testKasabasi("develi", 0);
  const b = testKasabasi("develi", 0);
  ilerlet(a, 10);
  ilerlet(b, 10);
  assert.deepEqual(a.sp, b.sp);
  const acik = a.sp!.filter((s) => s.durum === "acik");
  assert.ok(acik.length > 0 && acik.length <= SIPARIS_EN_COK);
  assert.equal(new Set(acik.map((s) => s.mal)).size, acik.length);
  for (const s of a.sp!) {
    assert.ok(Object.values(SIPARIS_MALLARI).some((l) => l.some((x) => x.mal === s.mal)));
    assert.equal(s.son, s.acilis + SIPARIS_SURE);
    assert.equal(s.hizmet, SIPARIS_HIZMET);
    assert.ok(s.npc > 0, "isteyen NPC");
  }
});

test("ödül: adet × satış değeri × 1.5 (yukarı); NPC'den alıp teslim etmek kâr getirmez", () => {
  const k = testKasabasi("develi", 0);
  ilerlet(k, 12);
  for (const s of k.sp!) {
    // Kasabada oyuncu yok → kıtlık primi dahil.
    const taban = MALLAR[s.mal].taban;
    const birim = taban + Math.ceil(taban * KITLIK_PRIM);
    assert.equal(s.odul, Math.ceil(s.adet * birim * SIPARIS_ODUL_CARPANI));
  }
  for (const liste of Object.values(SIPARIS_MALLARI)) {
    for (const { mal } of liste) {
      const taban = MALLAR[mal as MalId].taban;
      const enCok = (taban + Math.ceil(taban * KITLIK_PRIM)) * SIPARIS_ODUL_CARPANI;
      assert.ok(enCok <= npcFiyat(mal as MalId).toplam, `${mal}: sipariş birimi NPC fiyatını geçmez`);
    }
  }
});

test("süre dolunca 'dustu' ve olay; dolu meslek de sipariş alır (ağırlık boş 3, az 2, dolu 1)", () => {
  const k = testKasabasi("develi", 0);
  const olaylar = ilerlet(k, 20);
  assert.ok(olaylar.some((o) => o.k === "olay.siparis.acildi" && o.g === ""));
  assert.ok(olaylar.some((o) => o.k === "olay.siparis.dustu"));
  assert.ok(k.sp!.every((s) => s.durum !== "acik" || k.ay < s.son));
  // Her mesleğe 2 oyuncu: hepsi dolu → sipariş yine açılır (denge 9 Kasım; 6–10 oyuncuda teslim 0 olmasın).
  let no = 1;
  for (const m of Object.keys(SIPARIS_MALLARI)) {
    for (let i = 0; i < 2; i++) {
      const c = oyuncuEkle(k, no, k.ay - 16 * 12);
      meslekSec(c, m, k.ay);
      k.sakin.find((s) => s.o === c.o)!.ms = m as never;
      no++;
    }
  }
  const sonraki = ilerlet(k, 40);
  assert.ok(sonraki.filter((o) => o.k === "olay.siparis.acildi").length > 0);
  assert.deepEqual(SIPARIS_AGIRLIK, { bos: 3, az: 2, dolu: 1 });
});

test("teslim: mal düşer, ödül + hizmet, teşekkür izi olayı, görüş artışı; ikinci teslim siparis_kapandi", () => {
  const k = testKasabasi("develi", 0);
  ilerlet(k, 3);
  const s = k.sp!.find((x) => x.durum === "acik")!;
  const meslek = MALLAR[s.mal].meslek;
  const a = oyuncuEkle(k, 1, k.ay - 16 * 12);
  const b = oyuncuEkle(k, 2, k.ay - 16 * 12);
  meslekSec(a, meslek, k.ay);
  a.ev = { [s.mal]: s.adet + 1 };
  b.ev = { [s.mal]: s.adet };
  const npc = k.dizin.get(s.npc)!;
  const once = gorusDegeri(k, npc, a, k.ili.get(a.o), k.ay);
  const pa = a.pa;

  const eksik = oyuncuEkle(k, 3, k.ay - 16 * 12);
  meslekSec(eksik, meslek, k.ay);
  assert.deepEqual(siparisTeslim(k, eksik, k.ili.get(eksik.o)!, s.id, k.ay), { ok: false, hata: "mal_yok" });
  // Malı olsa da mesleği (ana/yan) o malın mesleği olmayan teslim edemez.
  assert.deepEqual(siparisTeslim(k, b, k.ili.get(b.o)!, s.id, k.ay), { ok: false, hata: "meslek_yok" });
  assert.equal(siparisGorunumu(k, b, k.ay, "tr").find((x) => x.id === s.id)!.teslimEdebilir, false);

  const r = siparisTeslim(k, a, k.ili.get(a.o)!, s.id, k.ay);
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(a.pa - pa, s.odul, "akçe yalnız ödül kadar");
  assert.equal(r.deger.sonuc.odulDokum.toplam, s.odul);
  assert.equal(r.deger.sonuc.odulDokum.kalemler.reduce((t, x) => t + x.d, 0), s.odul, "döküm toplamı = ödül");
  assert.equal(a.ev[s.mal], 1);
  assert.equal(r.deger.sonuc.hizmet, SIPARIS_HIZMET);
  assert.equal(s.durum, "teslim");
  assert.equal(s.alan, a.o);
  assert.equal(r.deger.olay.k, "olay.siparis.teslim");
  assert.equal(r.deger.olay.g, "", "herkese görünür");
  assert.deepEqual(r.deger.olay.p.kim, { i: a.o, ad: a.ad });
  assert.ok(gorusDegeri(k, npc, a, k.ili.get(a.o), k.ay) > once, "isteyen NPC'nin görüşü artar");

  const pb = b.pa;
  meslekSec(b, meslek, k.ay);
  assert.deepEqual(siparisTeslim(k, b, k.ili.get(b.o)!, s.id, k.ay), { ok: false, hata: "siparis_kapandi" });
  assert.equal(b.pa, pb);
  assert.equal(b.ev[s.mal], s.adet);
  assert.deepEqual(siparisTeslim(k, b, k.ili.get(b.o)!, "yok", k.ay), { ok: false, hata: "siparis_yok" });
  assert.deepEqual(siparisTeslim(k, b, k.ili.get(b.o)!, 5, k.ay), { ok: false, hata: "siparis_yok" });

  const g = siparisGorunumu(k, b, k.ay, "tr").find((x) => x.id === s.id)!;
  assert.equal(g.durum, "teslim");
  assert.deepEqual(g.alan, { id: a.o, ad: a.ad });
});

test("süresi geçmiş ama dönümü işlenmemiş sipariş teslim alınmaz", () => {
  const k = testKasabasi("develi", 0);
  ilerlet(k, 2);
  const s = k.sp!.find((x) => x.durum === "acik")!;
  const a = oyuncuEkle(k, 1, k.ay - 16 * 12);
  a.ev = { [s.mal]: s.adet };
  assert.deepEqual(siparisTeslim(k, a, k.ili.get(a.o)!, s.id, s.son), { ok: false, hata: "siparis_kapandi" });
});
