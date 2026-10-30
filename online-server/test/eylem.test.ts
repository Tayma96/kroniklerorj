import test from "node:test";
import assert from "node:assert/strict";
import { MESLEKLER } from "../src/icerik/kisilik.ts";
import {
  AYLIK_GORUS_TAVANI,
  eylemGirdisiCoz,
  eylemSansi,
  eylemYap,
  type EylemGirdisi,
} from "../src/yerlesim/eylem.ts";
import { iliskiAl } from "../src/yerlesim/eylem.ts";
import { tohumlu } from "../src/yerlesim/rastgele.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { hepBasari, hepBasarisiz, npcBul, oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

function yap(k: Kasaba, kar: Karakter, girdi: EylemGirdisi, ay = k.ay, zar = hepBasari) {
  return eylemYap(k, kar, k.ili.get(kar.o)!, girdi, ay, zar);
}

/** Öğrenme dönemi bitmiş (13 yaş), bol takatlı oyuncu. */
function yetkin(k: Kasaba, no = 1): Karakter {
  const kar = oyuncuEkle(k, no, k.ay - 13 * 12 - 1);
  kar.tk = 18;
  kar.pa = 50;
  return kar;
}

test("şans dökümü: toplam = kalemler, 5..95'e kırpılır ve kırpma görünür", () => {
  const k = testKasabasi();
  const kar = yetkin(k);
  const ili = k.ili.get(kar.o)!;
  for (const n of k.npc.slice(0, 60)) {
    for (const tur of ["sohbet", "yardim", "hediye", "ayakIsi", "cirak"] as const) {
      const s = eylemSansi(k, tur, n, kar, ili, k.ay);
      assert.equal(s.kalemler.reduce((a, x) => a + x.d, 0), s.toplam);
      assert.ok(s.toplam >= 5 && s.toplam <= 95);
    }
  }
  const npc = npcBul(k, kar, 20, 60);
  iliskiAl(ili, npc.i).t = 100;
  kar.oz[4] = 10;
  const s = eylemSansi(k, "hediye", npc, kar, ili, k.ay);
  assert.equal(s.toplam, 95);
  assert.ok((s.kalemler.find((x) => x.k === "sans.sinir")?.d ?? 0) < 0);
  assert.ok(s.kalemler.some((x) => x.k === "sans.bakis" && x.p?.gorus === 100));
});

test("zar gösterilen şansla atılır: başarı ⇔ zar ≤ şans", () => {
  const k = testKasabasi();
  const kar = yetkin(k);
  let basari = 0;
  let beklenen = 0;
  const N = 600;
  for (let i = 0; i < N; i++) {
    const npc = k.npc[(i * 7) % k.npc.length]!;
    if (npc.d > k.ay - 6 * 12) continue;
    kar.tk = 18;
    const r = yap(k, kar, { tur: "sohbet", hedef: `n${npc.i}` }, k.ay, tohumlu("t", i));
    assert.ok(r.ok);
    const s = r.deger.sonuc;
    assert.equal(s.basari, (s.zar ?? 0) <= (s.sans?.toplam ?? 0));
    if (s.basari) basari++;
    beklenen += (s.sans?.toplam ?? 0) / 100;
  }
  assert.ok(Math.abs(basari - beklenen) < 40, `${basari} ~ ${beklenen}`);
});

test("azalan getiri: aynı (oyuncu, NPC, eylem türü) tekrarında çarpan 1/(1+n); başka NPC ya da tür etkilenmez", () => {
  const k = testKasabasi();
  const kar = yetkin(k);
  const a = npcBul(k, kar, 20, 60);
  const b = npcBul(k, kar, 20, 60, (n) => n !== a);
  const sohbet = (n: typeof a, ay = k.ay) => {
    kar.tk = 18;
    const r = yap(k, kar, { tur: "sohbet", hedef: `n${n.i}` }, ay);
    assert.ok(r.ok);
    return r.deger.sonuc;
  };
  const s1 = sohbet(a);
  const s2 = sohbet(a);
  const s3 = sohbet(a);
  assert.deepEqual([s1.getiri?.carpan, s2.getiri?.carpan, s3.getiri?.carpan], [1, 0.5, 0.33]);
  assert.deepEqual([s1.degisim.gorus, s2.degisim.gorus, s3.degisim.gorus], [4, 2, 1]);
  assert.equal(sohbet(b).getiri?.carpan, 1, "başka NPC");
  kar.tk = 18;
  const y = yap(k, kar, { tur: "yardim", hedef: `n${a.i}` });
  assert.ok(y.ok);
  assert.equal(y.deger.sonuc.getiri?.carpan, 1, "başka tür");
  assert.equal(sohbet(a, k.ay + 6).getiri?.carpan, 1, "6 aylık pencereden sonra tazelenir");
});

test("NPC başına aylık görüş kazancı tavanlı; para, beceri ve nam değişimleri", () => {
  const k = testKasabasi();
  const kar = yetkin(k);
  const a = npcBul(k, kar, 20, 60, (n) => n.m !== MESLEKLER.indexOf("işsiz"));
  const y = yap(k, kar, { tur: "yardim", hedef: `n${a.i}` });
  assert.ok(y.ok);
  assert.equal(y.deger.sonuc.degisim.gorus, 8);
  assert.deepEqual(y.deger.sonuc.degisim.nam, { mertlik: 2 });
  const h = yap(k, kar, { tur: "hediye", hedef: `n${a.i}` });
  assert.ok(h.ok);
  assert.equal(h.deger.sonuc.degisim.gorus, AYLIK_GORUS_TAVANI - 8);
  assert.equal(h.deger.sonuc.degisim.para, -2);
  const ai = yap(k, kar, { tur: "ayakIsi", hedef: `n${a.i}` });
  assert.ok(ai.ok);
  assert.equal(ai.deger.sonuc.degisim.gorus, undefined, "tavan doldu");
  assert.equal(ai.deger.sonuc.degisim.para, 3);
  const i = k.ili.get(kar.o)![a.i]!;
  assert.equal(i.t + i.an.reduce((t, x) => t + x[1], 0), AYLIK_GORUS_TAVANI);
  // Başarısız eylem görüşü değiştirmez, takatı yer.
  const once = kar.tk;
  const f = yap(k, kar, { tur: "sohbet", hedef: `n${npcBul(k, kar, 20, 60, (n) => n !== a).i}` }, k.ay, hepBasarisiz);
  assert.ok(f.ok);
  assert.equal(f.deger.sonuc.basari, false);
  assert.equal(f.deger.sonuc.degisim.gorus, undefined);
  assert.equal(kar.tk, once - 1);
});

test("yaş kapısı (12+), öğrenme günü kapısı, hedef ve kaynak kapıları", () => {
  const k = testKasabasi();
  const cocuk = oyuncuEkle(k, 1, k.ay - 11 * 12 - 5);
  const npc = npcBul(k, cocuk, 25, 60, (n) => n.m !== MESLEKLER.indexOf("işsiz") && n.m !== MESLEKLER.indexOf("asker"));
  for (const tur of ["sohbet", "yardim", "hediye", "ayakIsi", "cirak"] as const) {
    const r = yap(k, cocuk, { tur, hedef: `n${npc.i}` });
    assert.deepEqual(r, { ok: false, hata: "yas_kapisi" }, tur);
  }
  assert.deepEqual(yap(k, cocuk, { tur: "mektep" }), { ok: false, hata: "yas_kapisi" });

  const yeni = oyuncuEkle(k, 2); // öğrenme döneminin 1. günü
  assert.ok(yap(k, yeni, { tur: "sohbet", hedef: `n${npc.i}` }).ok);
  assert.deepEqual(yap(k, yeni, { tur: "cirak", hedef: `n${npc.i}` }), { ok: false, hata: "ogrenme_kapali" });
  assert.deepEqual(yap(k, yeni, { tur: "hediye", hedef: `n${npc.i}` }), { ok: false, hata: "ogrenme_kapali" });
  assert.ok(yap(k, yeni, { tur: "cirak", hedef: `n${npc.i}` }, k.ay + 2).ok, "2. gün çıraklık açılır");
  assert.deepEqual(yap(k, yeni, { tur: "cirak", hedef: `n${npc.i}` }, k.ay + 2), { ok: false, hata: "zaten_cirak" });

  const kar = yetkin(k, 3);
  const kucuk = k.npc.find((n) => n.d > k.ay - 10 * 12 && n.d <= k.ay - 6 * 12)!;
  assert.deepEqual(yap(k, kar, { tur: "ayakIsi", hedef: `n${kucuk.i}` }), { ok: false, hata: "hedef_uygun_degil" });
  const issiz = k.npc.find((n) => n.m === MESLEKLER.indexOf("işsiz") && n.d < k.ay - 25 * 12);
  if (issiz) assert.deepEqual(yap(k, kar, { tur: "cirak", hedef: `n${issiz.i}` }), { ok: false, hata: "hedef_uygun_degil" });
  assert.deepEqual(yap(k, kar, { tur: "sohbet", hedef: "n999999" }), { ok: false, hata: "kisi_yok" });
  kar.pa = 1;
  assert.deepEqual(yap(k, kar, { tur: "hediye", hedef: `n${npc.i}` }), { ok: false, hata: "para_yok" });
  kar.tk = 0;
  assert.deepEqual(yap(k, kar, { tur: "sohbet", hedef: `n${npc.i}` }), { ok: false, hata: "takat_yok" });
  assert.deepEqual(yap(k, kar, { tur: "puan", ozellik: "guc" }), { ok: false, hata: "puan_yok" });
});

test("gövde çözümü: tür, hedef, karar ve özellik doğrulanır", () => {
  assert.deepEqual(eylemGirdisiCoz({ tur: "uc" }), { ok: false, hata: "eylem_gecersiz" });
  assert.deepEqual(eylemGirdisiCoz({ tur: "sohbet" }), { ok: false, hata: "kisi_yok" });
  assert.deepEqual(eylemGirdisiCoz({ tur: "sohbet", hedef: "o3" }), { ok: false, hata: "hedef_uygun_degil" });
  assert.deepEqual(eylemGirdisiCoz({ tur: "sohbet", hedef: "n12" }), { ok: true, deger: { tur: "sohbet", hedef: "n12" } });
  assert.deepEqual(eylemGirdisiCoz({ tur: "karar", secim: "baska" }), { ok: false, hata: "gecersiz_istek" });
  assert.deepEqual(eylemGirdisiCoz({ tur: "puan", ozellik: "sezgi" }), { ok: true, deger: { tur: "puan", ozellik: "sezgi" } });
  assert.deepEqual(eylemGirdisiCoz([]), { ok: false, hata: "gecersiz_istek" });
});
