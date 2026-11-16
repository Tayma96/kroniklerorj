// Tezgâh modeli §5.4 denge simi: iki pay biçimi (a: bütçe payı, b: adet talebi payı) aynı senaryolarda; denge
// sınırları (a) için kilitli. Tablo test çıktısına yazılır (yönetici seçer). Kâr = hasılat − malın adil değeri
// (taban × kç: aynı malı NPC'ye tabandan satmanın fırsat maliyeti) − bakım; brüt = hasılat − bakım. Vergi 0 alındı.
import test from "node:test";
import assert from "node:assert/strict";
import type { YerlesimTuru } from "../src/dunya-veri.ts";
import { MALLAR, MAL_IDLERI, type MalId } from "../src/icerik/mallar.ts";
import { adil, talepCoz, yolcuCoz, type Dukkan, type TalepSatiri } from "../src/mulk/hane-butcesi.ts";
import { BAKIM, MULK_YUVA, NPC_GELIR_TAVAN } from "../src/mulk/kurallar.ts";
import { fiyatBandi } from "../src/mulk/raf.ts";
import { DUKKAN_NPC_TAVAN, HANE_BUTCESI, KITLIK_BUTCE_CARPANI, RAF_SATIR, URETICI_MESLEKLER, YOLCU_BUTCESI, type PayYontemi } from "../src/mulk/tezgah-kurallar.ts";
import { npcTavani } from "../src/mulk/hane-butcesi.ts";
import { stokFiyat } from "../src/yerlesim/npc-taban.ts";
import type { Kalite } from "../src/yerlesim/kalite.ts";

const STRATEJI = { ucuzcu: 0.8, taban: 1, pahali: 1.5 } as const;
type Strateji = keyof typeof STRATEJI;
const MALLAR_SIM: MalId[] = ["ekmek", "civi", "kumas", "kereste", "dograma", "sifaliOt", "bugday", "kagit", "bicak", "corba"];
const BAKIM_D = BAKIM.dukkan;

function fiyat(mal: MalId, q: Kalite, carpan: number): number {
  const b = fiyatBandi(mal, q);
  return Math.max(b.alt, Math.min(b.ust, Math.round(adil(mal, q) * carpan)));
}

interface Senaryo {
  tur: YerlesimTuru;
  n: number;
  stok: number;
  yontem: PayYontemi;
  seviye: number;
  satir: number;
  kitlik?: boolean;
  strateji?: (i: number) => Strateji;
  kalite?: (i: number) => Kalite;
}

function calistir(s: Senaryo) {
  const satirlar: TalepSatiri[] = [];
  const dukkanlar = new Map<string, Dukkan>();
  const strat = s.strateji ?? ((i: number) => (["ucuzcu", "taban", "pahali"] as const)[i % 3]!);
  const kal = s.kalite ?? ((i: number) => (i % 2) as Kalite);
  for (let i = 0; i < s.n; i++) {
    const id = `d${String(i).padStart(2, "0")}`;
    dukkanlar.set(id, { id, itibar: 30, tavan: DUKKAN_NPC_TAVAN[s.seviye]! });
    for (let r = 0; r < s.satir; r++) {
      const mal = MALLAR_SIM[r]!;
      const q = kal(i);
      satirlar.push({ id: `${id}#${r}`, dukkan: id, mal, q, adet: s.stok, fiyat: fiyat(mal, q, STRATEJI[strat(i)]) });
    }
  }
  const r = talepCoz(s.tur, satirlar, dukkanlar, () => (s.kitlik ? 0 : 1), s.yontem);
  const dukkan = [...dukkanlar.keys()].map((id, i) => {
    const l = r.satirlar.filter((x) => x.dukkan === id);
    const hasilat = l.reduce((t, x) => t + x.hasilat, 0);
    const deger = l.reduce((t, x) => t + x.adet * adil(x.mal, x.q), 0);
    return { id, strateji: strat(i), hasilat, brut: hasilat - BAKIM_D, kar: hasilat - deger - BAKIM_D };
  });
  return { r, dukkan };
}

const ort = (l: number[]) => (l.length ? Math.round((l.reduce((a, b) => a + b, 0) / l.length) * 10) / 10 : 0);

test("sim: iki pay biçimi — dükkân başı hasılat/brüt/kâr, toplam NPC harcaması, strateji karşılaştırması", () => {
  const satirlar: string[] = ["tur    n  stok yöntem | hasılat/dk brüt/dk kâr/dk | NPC toplam ≤ ΣB | kâr: ucuzcu taban pahalı | en iyi"];
  const enIyiSay: Record<string, Record<Strateji, number>> = { butce: { ucuzcu: 0, taban: 0, pahali: 0 }, adet: { ucuzcu: 0, taban: 0, pahali: 0 } };
  for (const tur of ["sehir", "kasaba", "koy"] as const) {
    for (const n of [1, 3, 6, 12].filter((x) => x <= MULK_YUVA[tur].dukkan)) {
      for (const stok of [24, 4]) {
        for (const yontem of ["butce", "adet"] as const) {
          const { r, dukkan } = calistir({ tur, n, stok, yontem, seviye: 2, satir: RAF_SATIR[2]! });
          assert.ok(r.harcanan <= r.butce, "değişmez: NPC harcaması ≤ ΣB");
          for (const m of r.meslekler) assert.ok(m.harcanan <= m.B);
          const st = (["ucuzcu", "taban", "pahali"] as const).map((x) => ort(dukkan.filter((d) => d.strateji === x).map((d) => d.kar)));
          const varOlan = (["ucuzcu", "taban", "pahali"] as const).filter((x) => dukkan.some((d) => d.strateji === x));
          const enIyi = varOlan.reduce((a, b) => (st[["ucuzcu", "taban", "pahali"].indexOf(b)]! > st[["ucuzcu", "taban", "pahali"].indexOf(a)]! ? b : a));
          if (n >= 3) enIyiSay[yontem]![enIyi]++;
          satirlar.push(
            `${tur.padEnd(6)} ${String(n).padStart(2)} ${String(stok).padStart(4)} ${yontem.padEnd(6)} | ${String(ort(dukkan.map((d) => d.hasilat))).padStart(10)} ${String(ort(dukkan.map((d) => d.brut))).padStart(7)} ${String(ort(dukkan.map((d) => d.kar))).padStart(6)} | ${String(r.harcanan).padStart(4)} ≤ ${String(r.butce).padStart(4)} | ${st.map((x, i) => (dukkan.some((d) => d.strateji === (["ucuzcu", "taban", "pahali"] as const)[i]) ? String(x) : "-").padStart(6)).join(" ")} | ${enIyi}`,
          );
        }
      }
    }
  }
  satirlar.push(`en iyi strateji sayımı (n ≥ 3): butce ${JSON.stringify(enIyiSay.butce)} adet ${JSON.stringify(enIyiSay.adet)}`);
  console.log(satirlar.join("\n"));
  // Baskın strateji yok (a): hiçbir strateji bütün senaryolarda en iyi değil.
  const a = Object.values(enIyiSay.butce!);
  assert.ok(a.filter((x) => x > 0).length >= 2, `bütçe payında baskın strateji: ${JSON.stringify(enIyiSay.butce)}`);
});

test("§5.4 (1): şehirde en iyi paylı, tam stoklu 5. seviye dükkânın aylık net NPC kazancı ≤ 90", () => {
  let enCok = { kar: -Infinity, brut: 0, carpan: 0, yontem: "" };
  let enCokB = -Infinity;
  for (const yontem of ["butce", "adet"] as const) {
    for (const c of [1, 1.1, 1.2, 1.3, 1.4, 1.5]) {
      for (const q of [0, 1, 2, 3] as const) {
        const d = calistirCarpan("sehir", 4, c, q, yontem);
        if (yontem === "butce" && d.kar > enCok.kar) enCok = { kar: d.kar, brut: d.brut, carpan: c, yontem };
        if (yontem === "butce") assert.ok(d.kar <= 90, `kâr ${d.kar} (c=${c}, q=${q})`);
        else enCokB = Math.max(enCokB, d.kar);
      }
    }
  }
  console.log(`(1) en iyi 5. seviye şehir dükkânı (a): kâr ${enCok.kar}, brüt ${enCok.brut}, fiyat ×${enCok.carpan}; (b) en iyi kâr ${enCokB}`);
});

function calistirCarpan(tur: YerlesimTuru, seviye: number, c: number, q: Kalite, yontem: PayYontemi) {
  const satirlar: TalepSatiri[] = MALLAR_SIM.slice(0, RAF_SATIR[seviye]).map((mal, r) => ({ id: `d#${r}`, dukkan: "d", mal, q, adet: 24, fiyat: fiyat(mal, q, c) }));
  const r = talepCoz(tur, satirlar, new Map([["d", { id: "d", itibar: 100, tavan: DUKKAN_NPC_TAVAN[seviye]! }]]), () => 0, yontem);
  const hasilat = r.harcanan;
  const deger = r.satirlar.reduce((t, x) => t + x.adet * adil(x.mal, x.q), 0);
  return { hasilat, brut: hasilat - BAKIM_D, kar: hasilat - deger - BAKIM_D };
}

test("§5.4 (2): 1. seviye, ortalama paylı, stoklu dükkân bakımını çıkarır; stoksuz sıfırda kalır", () => {
  const sonuc: string[] = [];
  for (const tur of ["sehir", "kasaba", "koy"] as const) {
    const n = MULK_YUVA[tur].dukkan;
    for (const yontem of ["butce", "adet"] as const) {
      const { dukkan } = calistir({ tur, n, stok: 24, yontem, seviye: 0, satir: RAF_SATIR[0]!, strateji: () => "taban", kalite: () => 0 });
      const enAz = Math.min(...dukkan.map((d) => d.brut));
      sonuc.push(`${tur}/${yontem} n=${n}: en düşük brüt ${enAz}`);
      if (yontem === "butce") assert.ok(enAz >= 0, `${tur}: ${enAz}`);
    }
  }
  console.log(`(2) ${sonuc.join("; ")}`);
  // Stoksuz dükkân: kepenk (kayıt yok, bakım yok) → 0; tezgah.test.ts kepenk testinde doğrulanır.
});

test("§5.4 (3): NPC stoğundan alıp rafta NPC'ye satmak kâr ettirmez (NPC tavanı ≤ stok fiyatı)", () => {
  for (const m of MAL_IDLERI) {
    if (MALLAR[m].taban <= 0) continue;
    assert.ok(npcTavani(m, 0) <= stokFiyat(m).toplam, `${m}: tavan ${npcTavani(m, 0)} > stok ${stokFiyat(m).toplam}`);
  }
});

test("§5.4 (5): yerleşim başına NPC→oyuncu toplam girişi ≤ 3 × bugünkü pasif gelir toplamı", () => {
  // Bugünkü (eski) pasif gelir tavanı: eski yuvalar (şehir 5/4/3, kasaba 2/2/2, köy 0/1/1) × en yüksek seviye tavanı.
  const eskiYuva = { sehir: 12, kasaba: 6, koy: 2 } as const;
  const sonuc: string[] = [];
  for (const tur of ["sehir", "kasaba", "koy"] as const) {
    const eski = eskiYuva[tur] * NPC_GELIR_TAVAN[4]!;
    const butceTavani = URETICI_MESLEKLER.length * Math.floor(HANE_BUTCESI[tur] * KITLIK_BUTCE_CARPANI) + YOLCU_BUTCESI[tur];
    // Ölçülen: bütün yuvalar dolu, kıtlık, 5. seviye, tam stok, çeşitli fiyatlar + bütün hanlar.
    const { r } = calistir({ tur, n: MULK_YUVA[tur].dukkan, stok: 24, yontem: "butce", seviye: 4, satir: RAF_SATIR[4]!, kitlik: true });
    const hanlar = Array.from({ length: Math.max(1, MULK_YUVA[tur].han) }, (_, i) => ({ no: i + 1, isletme: `h${i}`, fc: 50, kalite: 6, itibar: 100, seviye: 4 }));
    const y = yolcuCoz(tur, hanlar).dagitilan;
    const olculen = r.harcanan + y;
    sonuc.push(`${tur}: ölçülen ${olculen}, tavan ${butceTavani}, sınır 3×${eski}=${3 * eski}`);
    assert.ok(olculen <= butceTavani && butceTavani <= 3 * eski);
  }
  console.log(`(5) ${sonuc.join("; ")}`);
});
