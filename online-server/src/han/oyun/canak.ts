// Çanak Zarı (han masa oyunu, 2–4 kişi; özgün kural). Saf kural motoru.
//
// Her elde herkesin çanağına sunucu üç zar atar; zarını yalnız kendisi görür. Sırayla (eli açan her elde bir sonraki
// oyuncuya geçer) herkes bir kez karar verir: çanağı "tut" ya da seçtiği 1–3 zarı "yenile" (yeniden atılır; kaç zar
// yenilediği herkesçe görülür, değerler görülmez). Herkes karar verince çanaklar açılır: en iyi el o eli alır; en iyi
// eller eşitse el kimseye yazılmaz. Önce ÇANAK_HEDEF el alan kazanır; ÇANAK_EL_EN_COK el oynanınca en çok el alan
// kazanır (eşitlikte berabere).
// El sırası (büyükten küçüğe): üçlü (üç zar aynı) > sıralı (ardışık üç zar) > çift > tek; aynı türde büyük zar üstündür.

import { basarili, hata, type Sonuc } from "../../tipler.ts";
import { aralik, type Zar } from "../../yerlesim/rastgele.ts";
import type { OyunModulu, OyunSonucu } from "./tur.ts";

/** [PARAMETRE] Çanaktaki zar sayısı. */
export const CANAK_ZAR = 3;
/** [PARAMETRE] Oyunu kazanmak için alınacak el sayısı. */
export const CANAK_HEDEF = 3;
/** [PARAMETRE] En çok el (oyunun sonsuz sürmemesi için; zamanlayıcı değildir). */
export const CANAK_EL_EN_COK = 9;

export type ElTuru = "uclu" | "sirali" | "cift" | "tek";

export interface ElKaydi {
  el: number;
  /** Açılan zarlar (çekilen oyuncu için null). */
  zarlar: (number[] | null)[];
  /** Her oyuncunun el türü (çekilen için null). */
  turler: (ElTuru | null)[];
  /** Eli alan dizin; eşitlikte null. */
  alan: number | null;
}

export interface CanakDurumu {
  el: number;
  /** Bu eli açan oyuncu. */
  acan: number;
  sira: number | null;
  /** GİZLİ: her oyuncunun çanağı. Yalnız `ozel` ile sahibine gider; el sonunda `gecmis` ile açılır. */
  zarlar: number[][];
  /** Bu elde kararını verenlerin yenilediği zar sayısı (0 = tuttu; null = henüz karar vermedi). */
  yeniledi: (number | null)[];
  cikti: boolean[];
  kazanc: number[];
  gecmis: ElKaydi[];
  bitti?: OyunSonucu;
}

function at(zar: Zar): number[] {
  return Array.from({ length: CANAK_ZAR }, () => aralik(zar, 1, 6));
}

/** Elin sıralama anahtarı (sözlük sırasıyla karşılaştırılır) ve türü. */
export function elDegeri(z: readonly number[]): { tur: ElTuru; anahtar: number[] } {
  const s = [...z].sort((a, b) => b - a);
  const [a, b, c] = [s[0]!, s[1]!, s[2]!];
  if (a === b && b === c) return { tur: "uclu", anahtar: [3, a] };
  if (a - b === 1 && b - c === 1) return { tur: "sirali", anahtar: [2, a] };
  if (a === b || b === c) return { tur: "cift", anahtar: [1, b, a === b ? c : a] };
  return { tur: "tek", anahtar: [0, a, b, c] };
}

function karsilastir(x: readonly number[], y: readonly number[]): number {
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const f = (x[i] ?? 0) - (y[i] ?? 0);
    if (f !== 0) return f;
  }
  return 0;
}

function aktifler(d: CanakDurumu): number[] {
  return d.cikti.flatMap((c, i) => (c ? [] : [i]));
}

/** `bas`tan başlayarak (dahil) bu elde karar vermemiş ilk aktif oyuncu. */
function siradaki(d: CanakDurumu, bas: number): number | null {
  const n = d.cikti.length;
  for (let k = 0; k < n; k++) {
    const i = (bas + k) % n;
    if (!d.cikti[i] && d.yeniledi[i] === null) return i;
  }
  return null;
}

function sonrakiAktif(d: CanakDurumu, i: number): number {
  const n = d.cikti.length;
  for (let k = 1; k <= n; k++) {
    const j = (i + k) % n;
    if (!d.cikti[j]) return j;
  }
  return i;
}

/** Herkes karar verdiyse çanakları açar, eli yazar, bitişi denetler ya da yeni ele geçer. */
function ilerle(d: CanakDurumu, zar: Zar, sonKarar: number): CanakDurumu {
  const s = siradaki(d, sonrakiAktif(d, sonKarar));
  if (s !== null) return { ...d, sira: s };
  const turler: (ElTuru | null)[] = d.zarlar.map((z, i) => (d.cikti[i] ? null : elDegeri(z).tur));
  let alan: number | null = null;
  let enIyi: number[] | null = null;
  let esit = false;
  for (const i of aktifler(d)) {
    const k = elDegeri(d.zarlar[i]!).anahtar;
    const f = enIyi ? karsilastir(k, enIyi) : 1;
    if (f > 0) {
      enIyi = k;
      alan = i;
      esit = false;
    } else if (f === 0) esit = true;
  }
  if (esit) alan = null;
  const kayit: ElKaydi = { el: d.el, zarlar: d.zarlar.map((z, i) => (d.cikti[i] ? null : [...z])), turler, alan };
  const kazanc = d.kazanc.map((k, i) => (i === alan ? k + 1 : k));
  const gecmis = [...d.gecmis, kayit].slice(-CANAK_EL_EN_COK);
  const yeni: CanakDurumu = { ...d, kazanc, gecmis, sira: null };
  const hedefe = aktifler(d).find((i) => kazanc[i]! >= CANAK_HEDEF);
  if (hedefe !== undefined) return { ...yeni, bitti: { kazanan: [hedefe], berabere: false } };
  if (d.el >= CANAK_EL_EN_COK) return { ...yeni, bitti: puanSonucu(yeni) };
  const acan = sonrakiAktif(d, d.acan);
  return {
    ...yeni,
    el: d.el + 1,
    acan,
    sira: acan,
    zarlar: d.zarlar.map((z, i) => (d.cikti[i] ? z : at(zar))),
    yeniledi: d.cikti.map(() => null),
  };
}

function puanSonucu(d: CanakDurumu): OyunSonucu {
  const a = aktifler(d);
  const enCok = Math.max(...a.map((i) => d.kazanc[i]!));
  const ust = a.filter((i) => d.kazanc[i] === enCok);
  return ust.length === 1 ? { kazanan: ust, berabere: false } : { kazanan: ust, berabere: true };
}

/** Hamle: `{tut: true}` ya da `{yenile: [zar dizinleri]}` (1–3 farklı dizin, 0..2). */
function hamleCoz(ham: unknown): { yenile: number[] } | undefined {
  if (typeof ham !== "object" || ham === null || Array.isArray(ham)) return undefined;
  const h = ham as Record<string, unknown>;
  if (h.tut === true && h.yenile === undefined) return { yenile: [] };
  if (h.tut !== undefined || !Array.isArray(h.yenile)) return undefined;
  const l = h.yenile;
  if (l.length < 1 || l.length > CANAK_ZAR) return undefined;
  if (!l.every((x) => Number.isInteger(x) && (x as number) >= 0 && (x as number) < CANAK_ZAR)) return undefined;
  if (new Set(l).size !== l.length) return undefined;
  return { yenile: [...(l as number[])].sort((a, b) => a - b) };
}

function karar(d: CanakDurumu, i: number, yenile: readonly number[], zar: Zar): CanakDurumu {
  const z = [...d.zarlar[i]!];
  for (const k of yenile) z[k] = aralik(zar, 1, 6);
  const zarlar = d.zarlar.map((x, j) => (j === i ? z : x));
  const yeniledi = d.yeniledi.map((x, j) => (j === i ? yenile.length : x));
  return ilerle({ ...d, zarlar, yeniledi }, zar, i);
}

const ZAR_DEGERI = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 6;
const CANAK_DIZI = (v: unknown): v is number[] => Array.isArray(v) && v.length === CANAK_ZAR && v.every(ZAR_DEGERI);
const EL_TURU = new Set<unknown>(["uclu", "sirali", "cift", "tek"]);

export const CANAK: OyunModulu<CanakDurumu> = {
  tur: "canak",
  enAz: 2,
  enCok: 4,
  kur(n, zar) {
    return {
      el: 1,
      acan: 0,
      sira: 0,
      zarlar: Array.from({ length: n }, () => at(zar)),
      yeniledi: Array.from({ length: n }, () => null),
      cikti: Array.from({ length: n }, () => false),
      kazanc: Array.from({ length: n }, () => 0),
      gecmis: [],
    };
  },
  sira: (d) => (d.bitti ? null : d.sira),
  hamle(d, i, ham, zar) {
    if (d.bitti || d.sira !== i) return hata("sira_degil");
    const h = hamleCoz(ham);
    if (!h) return hata("hamle_gecersiz");
    return basarili(karar(d, i, h.yenile, zar));
  },
  pasGec(d, i, zar) {
    if (d.bitti || d.sira !== i) return undefined;
    return karar(d, i, [], zar);
  },
  cekil(d, i, zar) {
    if (d.bitti || d.cikti[i]) return undefined;
    const cikti = d.cikti.map((c, j) => c || j === i);
    if (cikti.filter((c) => !c).length < CANAK.enAz) return undefined;
    const y: CanakDurumu = { ...d, cikti, yeniledi: d.yeniledi.map((x, j) => (j === i ? null : x)) };
    const acan = d.acan === i ? sonrakiAktif(y, i) : d.acan;
    if (d.sira !== i) return { ...y, acan };
    return ilerle({ ...y, acan }, zar, i);
  },
  sonuc: (d) => d.bitti,
  acik(d) {
    return {
      el: d.el,
      elEnCok: CANAK_EL_EN_COK,
      hedef: CANAK_HEDEF,
      acan: d.acan,
      kazanc: [...d.kazanc],
      cikti: [...d.cikti],
      yeniledi: [...d.yeniledi],
      gecmis: d.gecmis.map((g) => ({ el: g.el, zarlar: g.zarlar.map((z) => (z ? [...z] : null)), turler: [...g.turler], alan: g.alan })),
    };
  },
  ozel(d, i) {
    if (d.bitti || d.cikti[i] || !d.zarlar[i]) return {};
    const z = d.zarlar[i];
    return { zarlarim: [...z], elim: elDegeri(z).tur };
  },
  coz(ham, n) {
    if (typeof ham !== "object" || ham === null) return undefined;
    const d = ham as Record<string, unknown>;
    const dizi = (v: unknown, f: (x: unknown) => boolean): boolean => Array.isArray(v) && v.length === n && v.every(f);
    const dizin = (v: unknown) => Number.isInteger(v) && (v as number) >= 0 && (v as number) < n;
    if (!Number.isInteger(d.el) || (d.el as number) < 1 || (d.el as number) > CANAK_EL_EN_COK || !dizin(d.acan)) return undefined;
    if (d.sira !== null && !dizin(d.sira)) return undefined;
    if (!dizi(d.zarlar, CANAK_DIZI) || !dizi(d.cikti, (x) => typeof x === "boolean")) return undefined;
    if (!dizi(d.yeniledi, (x) => x === null || (Number.isInteger(x) && (x as number) >= 0 && (x as number) <= CANAK_ZAR))) return undefined;
    if (!dizi(d.kazanc, (x) => Number.isInteger(x) && (x as number) >= 0 && (x as number) <= CANAK_EL_EN_COK)) return undefined;
    if (!Array.isArray(d.gecmis) || d.gecmis.length > CANAK_EL_EN_COK) return undefined;
    const gecmis: ElKaydi[] = [];
    for (const g of d.gecmis as Record<string, unknown>[]) {
      if (typeof g !== "object" || g === null || !Number.isInteger(g.el) || (g.alan !== null && !dizin(g.alan))) return undefined;
      if (!dizi(g.zarlar, (x) => x === null || CANAK_DIZI(x)) || !dizi(g.turler, (x) => x === null || EL_TURU.has(x))) return undefined;
      gecmis.push({ el: g.el as number, zarlar: (g.zarlar as (number[] | null)[]).map((z) => (z ? [...z] : null)), turler: [...(g.turler as (ElTuru | null)[])], alan: g.alan as number | null });
    }
    const durum: CanakDurumu = {
      el: d.el as number,
      acan: d.acan as number,
      sira: d.sira as number | null,
      zarlar: (d.zarlar as number[][]).map((z) => [...z]),
      yeniledi: [...(d.yeniledi as (number | null)[])],
      cikti: [...(d.cikti as boolean[])],
      kazanc: [...(d.kazanc as number[])],
      gecmis,
    };
    if (d.bitti !== undefined) {
      const b = d.bitti as Record<string, unknown> | null;
      if (!b || !Array.isArray(b.kazanan) || !b.kazanan.every(dizin) || typeof b.berabere !== "boolean") return undefined;
      durum.bitti = { kazanan: [...(b.kazanan as number[])], berabere: b.berabere };
    }
    return durum;
  },
};
