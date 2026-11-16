// Tezgâh modeli §5.4 denge simi: iki pay biçimi (a: bütçe payı, b: adet talebi payı) aynı senaryolarda; denge
// sınırları (a) için kilitli. Tablo test çıktısına yazılır (yönetici seçer). Kâr = hasılat − malın adil değeri
// (taban × kç: aynı malı NPC'ye tabandan satmanın fırsat maliyeti) − bakım; brüt = hasılat − bakım. Vergi 0 alındı.
import test from "node:test";
import assert from "node:assert/strict";
import type { YerlesimTuru } from "../src/dunya-veri.ts";
import { MALLAR, MAL_IDLERI, type MalId } from "../src/icerik/mallar.ts";
import { adil, talepCoz, yolcuCoz, type Dukkan, type TalepSatiri } from "../src/mulk/hane-butcesi.ts";
import { BAKIM, MULK_YUVA, NPC_GELIR_TAVAN } from "../src/mulk/kurallar.ts";
import { fiyatBandi, rafaKoy } from "../src/mulk/raf.ts";
import type { Tezgah } from "../src/mulk/depo.ts";
import { kaliteliEkle } from "../src/yerlesim/kalite.ts";
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

test("§5.4 (3): NPC stoğundan alıp rafta NPC'ye satmak kâr ettirmez — her kalite", () => {
  for (const m of MAL_IDLERI) {
    if (MALLAR[m].taban <= 0) continue;
    // Sade: NPC'nin sattığı tek kalite; raf NPC tavanı stok fiyatını aşmaz.
    assert.ok(npcTavani(m, 0) <= stokFiyat(m).toplam, `${m}: tavan ${npcTavani(m, 0)} > stok ${stokFiyat(m).toplam}`);
    // İyi/üstün/şaheser: NPC'den (stok ya da NPC) yalnız sade alınır; sade mal rafa üst kaliteyle konamaz.
    for (const q of [1, 2, 3] as const) {
      const t: Tezgah = { r: [], n: 0, kk: 0 };
      kaliteliEkle(t, m, [[0, 5]]);
      assert.deepEqual(rafaKoy(t, m, q, 1, Math.max(1, Math.floor(npcTavani(m, q))), 4), { ok: false, hata: "mal_yok" }, `${m}/${q}`);
    }
  }
});

test("§5.4 (5): yerleşim başına NPC→oyuncu girişi: bütçe tavanı ≤ 3 × eski pasif tavan; gerçekçi doluluk karşılaştırması", () => {
  // (a) Tavan tabanı: eski yuvalar (şehir 5/4/3, kasaba 2/2/2, köy 0/1/1) × en yüksek seviye tavanı (46). Yeni en kötü
  // durum: bütün meslekler kıtlıkta (×1,5) ΣB + Y. (b) Gerçekçi taban: aynı doluluk (eski yuva sayısı kadar işletme),
  // 2. seviye, itibar 30, kalite 1 kademe — eski formül taban × 1,3 × 1,05 (tavanlı); yeni: aynı sayıda dükkân (4 satır,
  // taban fiyat, tam stok, oyuncu meslekleri var) + aynı sayıda han (fc 100). Yorum: ölçülen oran tabloda; sınır (a)
  // kilitli, (b) yönetici bilgisi için yazılır (yeni sistemde gelir satılan mala bağlı, eskisi bedavaydı).
  const eskiYuva = { sehir: { han: 5, dukkan: 4, atolye: 3 }, kasaba: { han: 2, dukkan: 2, atolye: 2 }, koy: { han: 0, dukkan: 1, atolye: 1 } } as const;
  const eskiGelir = { han: 6, dukkan: 4, atolye: 5 } as const;
  const sonuc: string[] = [];
  for (const tur of ["sehir", "kasaba", "koy"] as const) {
    const e = eskiYuva[tur];
    const eskiTavan = (e.han + e.dukkan + e.atolye) * NPC_GELIR_TAVAN[4]!;
    const butceTavani = URETICI_MESLEKLER.length * Math.floor(HANE_BUTCESI[tur] * KITLIK_BUTCE_CARPANI) + YOLCU_BUTCESI[tur];
    assert.ok(butceTavani <= 3 * eskiTavan, `${tur}: ${butceTavani} > 3 × ${eskiTavan}`);
    const { r } = calistir({ tur, n: MULK_YUVA[tur].dukkan, stok: 24, yontem: "butce", seviye: 4, satir: RAF_SATIR[4]!, kitlik: true });
    const enKotu = r.harcanan + yolcuCoz(tur, Array.from({ length: Math.max(1, MULK_YUVA[tur].han) }, (_, i) => ({ no: i + 1, isletme: `h${i}`, fc: 50, kalite: 6, itibar: 100, seviye: 4 }))).dagitilan;
    assert.ok(enKotu <= butceTavani);
    const eskiGercek = (Object.keys(e) as (keyof typeof e)[]).reduce((t, x) => t + e[x] * Math.min(NPC_GELIR_TAVAN[1]!, Math.floor(eskiGelir[x] * 1.3 * 1.05)), 0);
    const yeniD = calistir({ tur, n: e.dukkan, stok: 24, yontem: "butce", seviye: 1, satir: 4, strateji: () => "taban", kalite: () => 0 }).r.harcanan;
    const yeniH = e.han ? yolcuCoz(tur, Array.from({ length: e.han }, (_, i) => ({ no: i + 1, isletme: `h${i}`, fc: 100, kalite: 1, itibar: 30, seviye: 1 }))).dagitilan : 0;
    sonuc.push(`${tur}: en kötü ${enKotu} ≤ tavan ${butceTavani} ≤ 3×${eskiTavan}; gerçekçi eski ${eskiGercek} → yeni ${yeniD + yeniH} (×${((yeniD + yeniH) / Math.max(1, eskiGercek)).toFixed(1)})`);
  }
  console.log(`(5) ${sonuc.join("; ")}`);
});

test("ucuz fiyat pay ve adedi artırır (fazla stok erir) ama kârı düşürür: ucuzcu hiçbir senaryoda en iyi değil", () => {
  const d = new Map([["d1", { id: "d1", itibar: 30, tavan: 999 }], ["d2", { id: "d2", itibar: 30, tavan: 999 }]]);
  const sonuc = (fiyat: number) => {
    const r = talepCoz("sehir", [{ id: "d1#1", dukkan: "d1", mal: "kumas", q: 0, adet: 24, fiyat }, { id: "d2#1", dukkan: "d2", mal: "kumas", q: 0, adet: 24, fiyat: 15 }], d, () => 1);
    const x = r.satirlar.find((y) => y.dukkan === "d1")!;
    return { pay: x.pay, adet: x.adet, kar: x.hasilat - x.adet * 15 };
  };
  const ucuz = sonuc(12);
  const taban = sonuc(15);
  assert.ok(ucuz.pay > taban.pay && ucuz.adet > taban.adet, "ucuz: daha çok pay ve adet");
  assert.ok(ucuz.kar < taban.kar, "ucuz: kâr düşer (adil altı satış zarar)");
});
