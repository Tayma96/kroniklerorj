// 17 Kasım denetimi (arkadaş denemesi öncesi): ekonomi (E1–E10) ve güvenlik/dayanıklılık (S1–S13) bulguları.
// Her bulgu önce kırmızı test olarak yazıldı.
import test from "node:test";
import assert from "node:assert/strict";
import { DEVIR_ADIL_UST, DEVIR_SOGUMA_AY, devirKabul, devirTeklif, edin, mulkDefteri } from "../src/mulk/tapu.ts";
import { HEDIYE_VERME_AYLIK } from "../src/yerlesim/teklif.ts";
import { AY_MS, DUNYA_BASLANGICI_MS } from "../src/saat.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const AN = DUNYA_BASLANGICI_MS + 10 * AY_MS + 1000;
const ID = "develi.dukkan.1";

function yetiskin(k: Kasaba, no: number, pa = 2000): Karakter {
  const kar = oyuncuEkle(k, no, k.ay - 12 * 20);
  kar.pa = pa;
  kar.nm = [30, 30, 0, 0];
  kar.e = 900 + no;
  k.sakin.find((s) => s.o === kar.o)!.e = 900 + no;
  return kar;
}

test("E1: devir fiyatı adil bant dışına çıkınca armağan tavanına sayılır; 1500'lük devir reddedilir", () => {
  const k = testKasabasi("develi", 10);
  const a = yetiskin(k, 1);
  const b = yetiskin(k, 2, 3000);
  assert.ok(edin(k, a, { tur: "dukkan" }, AN, "e-0000001").ok);
  assert.ok(devirTeklif(k, a, ID, { islem: "teklif", alici: "o2", fiyat: 1500 }).ok);
  assert.deepEqual(devirKabul(k, b, ID, AN, "dv-0000001"), { ok: false, hata: "pompa_siniri" });
  // Bandı 50 aşan fiyat: kabul, 50 armağan tavanına yazılır.
  const ust = Math.ceil(120 * DEVIR_ADIL_UST);
  assert.ok(devirTeklif(k, a, ID, { islem: "teklif", alici: "o2", fiyat: ust + 50 }).ok);
  const r = devirKabul(k, b, ID, AN, "dv-0000002");
  assert.ok(r.ok, JSON.stringify(r));
  assert.deepEqual(b.hv, [k.ay, 50]);
  assert.deepEqual(a.ha, [k.ay, 50]);
  // Soğuma: yeni sahip 12 ay devredemez.
  assert.deepEqual(devirTeklif(k, b, ID, { islem: "teklif", alici: "o1", fiyat: 0 }), { ok: false, hata: "aralik_dolu" });
});

test("E1: aynı kümede devir fiyatsızdır", () => {
  const k = testKasabasi("develi", 10);
  const a = yetiskin(k, 1);
  const b = yetiskin(k, 2);
  b.e = a.e;
  k.sakin.find((s) => s.o === b.o)!.e = a.e;
  assert.ok(edin(k, a, { tur: "dukkan" }, AN, "e-0000001").ok);
  assert.deepEqual(devirTeklif(k, a, ID, { islem: "teklif", alici: "o2", fiyat: 100 }), { ok: false, hata: "ayni_kume" });
  assert.ok(devirTeklif(k, a, ID, { islem: "teklif", alici: "o2", fiyat: 0 }).ok);
  assert.ok(devirKabul(k, b, ID, AN, "dv-0000001").ok);
});

test("E1 sim: devir döngüsüyle aktarım armağan tavanını aşamaz", () => {
  const k = testKasabasi("develi", 10);
  const a = yetiskin(k, 1, 100_000);
  const b = yetiskin(k, 2, 100_000);
  assert.ok(edin(k, a, { tur: "dukkan" }, AN, "e-0000001").ok);
  const bas = b.pa;
  const AYLAR = 48;
  let no = 0;
  for (let i = 0; i < AYLAR; i++) {
    k.ay++;
    const t = mulkDefteri(k).t[ID]!;
    const sahip = t.s === "o1" ? a : b;
    const diger = sahip === a ? b : a;
    // Ana hesap (a) alt hesaba (b) aktarmak ister: b satarken fiyatı şişirir, a satarken sıfıra çeker.
    for (const fiyat of sahip === b ? [10_000, 5000, 1500, 600, 300, 240] : [0, 30, 60]) {
      const tk = devirTeklif(k, sahip, ID, { islem: "teklif", alici: diger.o, fiyat });
      if (!tk.ok) continue;
      if (devirKabul(k, diger, ID, AN, `dv-${String(++no).padStart(7, "0")}`).ok) break;
    }
  }
  const aktarim = b.pa - bas;
  assert.ok(aktarim <= HEDIYE_VERME_AYLIK * AYLAR, `aktarım ${aktarim}`);
  assert.ok(aktarim <= 120 * DEVIR_ADIL_UST * Math.ceil(AYLAR / DEVIR_SOGUMA_AY), `aktarım ${aktarim}`);
});
