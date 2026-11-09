// Hal (ana tasarım §5.6, Ek A §2.1, Ç5): can, kondisyon, gönül. Büyümez, dalgalanır; her göstergenin görünür
// etkisi ve son değişim nedenleri döküm olarak döner (gizli sayı yok). Tembel güncellenir: karakterde son işlenen
// ay damgası tutulur, ay dönümü karakteri yüklemez. Saf fonksiyonlar; karakteri yerinde değiştirir.
//
// Etkiler: kondisyon aylık takat yenilenmesini belirler (iyi 6, yorgun 5, bitkin 4); can 50'nin altındaysa
// kondisyon yarı hızda toparlanır, can tabanı 10'dur (bu fazda ölüm yok); gönül sosyal eylemlerin şansını değiştirir.

import type { Karakter } from "./tipler.ts";

/** [PARAMETRE] Gösterge tavanı ve can tabanı (evsizlik dahil can bunun altına inmez; Ç9). */
export const HAL_TAVAN = 100;
export const HAL_TABAN_CAN = 10;
/** [PARAMETRE] Aylık toparlama: kondisyon, yaralıyken kondisyon, can. */
export const KONDISYON_AYLIK_TOPARLAMA = 15;
export const KONDISYON_YARALI_TOPARLAMA = 7;
export const CAN_AYLIK_TOPARLAMA = 5;
/** [PARAMETRE] Can bu değerin altındaysa "yaralı". */
export const CAN_YARALI_ESIGI = 50;
/** [PARAMETRE] Gönül dengesi ve aylık dengeye yaklaşma miktarı. */
export const GONUL_DENGE = 50;
export const GONUL_AYLIK_DENGE = 5;
/** [PARAMETRE] Emek (temel iş, tarif) harcanan takat başına kondisyon kaybı. */
export const IS_KONDISYON = 3;
/** [PARAMETRE] Başarılı sohbet/yardımın gönüle katkısı; siparişi teslim etmenin katkısı. */
export const GONUL_SOHBET = 3;
export const GONUL_SIPARIS = 3;
/** [PARAMETRE] Kondisyon kademeleri (alt sınır → aylık takat). */
export const KONDISYON_KADEMELERI = [
  { kademe: "iyi", alt: 60, takat: 6 },
  { kademe: "yorgun", alt: 30, takat: 5 },
  { kademe: "bitkin", alt: 0, takat: 4 },
] as const;
/** [PARAMETRE] Gönül durumları (alt sınır → sosyal eylem şansı, yüzde puanı). */
export const GONUL_KADEMELERI = [
  { durum: "sen", alt: 70, sans: 5 },
  { durum: "olagan", alt: 30, sans: 0 },
  { durum: "kirgin", alt: 0, sans: -10 },
] as const;
/** Gönül etkisinin uygulandığı sosyal eylemler. */
export const GONUL_EYLEMLERI: readonly string[] = ["sohbet", "yardim", "hediye"];
/** [PARAMETRE] Gösterilen son neden sayısı. */
export const HAL_NEDEN_EN_COK = 3;
/** Tembel toparlamada en çok bu kadar ay işlenir (en kötü durumdan tam toparlanma bundan kısadır). */
const TOPARLAMA_EN_COK_AY = 24;

export type Gosterge = "can" | "kondisyon" | "gonul";
export type KondisyonKademesi = (typeof KONDISYON_KADEMELERI)[number]["kademe"];
export type GonulDurumu = (typeof GONUL_KADEMELERI)[number]["durum"];
/** Kayıtlı Hal: [can, kondisyon, gönül, son işlenen ay]. */
export type HalKaydi = [can: number, kondisyon: number, gonul: number, ay: number];
/** Son değişim nedeni: [gösterge, fark, neden anahtarı, ay]. */
export type HalNedeni = [gosterge: Gosterge, fark: number, neden: string, ay: number];

export interface Hal {
  can: number;
  kondisyon: number;
  gonul: number;
}

const kirp = (x: number, alt: number, ust: number) => (x < alt ? alt : x > ust ? ust : x);

/** Bir aylık toparlama (saf). Kondisyonun hızı ayın başındaki cana bağlıdır. */
function birAy(h: Hal): Hal {
  const kondisyonHizi = h.can < CAN_YARALI_ESIGI ? KONDISYON_YARALI_TOPARLAMA : KONDISYON_AYLIK_TOPARLAMA;
  const fark = GONUL_DENGE - h.gonul;
  return {
    can: Math.min(HAL_TAVAN, h.can + CAN_AYLIK_TOPARLAMA),
    kondisyon: Math.min(HAL_TAVAN, h.kondisyon + kondisyonHizi),
    gonul: h.gonul + kirp(fark, -GONUL_AYLIK_DENGE, GONUL_AYLIK_DENGE),
  };
}

function ilerlet(h: Hal, aySayisi: number): Hal {
  let x = h;
  for (let i = 0; i < Math.min(aySayisi, TOPARLAMA_EN_COK_AY); i++) x = birAy(x);
  return x;
}

/** Karakteri değiştirmeden `ay` sonundaki Hal'i öngörür (takat yenilenmesi için). Eski kayıtta tam Hal. */
export function halOngor(k: Karakter, ay: number): Hal {
  if (!k.hl) return { can: HAL_TAVAN, kondisyon: HAL_TAVAN, gonul: GONUL_DENGE };
  const h = { can: k.hl[0], kondisyon: k.hl[1], gonul: k.hl[2] };
  return ay > k.hl[3] ? ilerlet(h, ay - k.hl[3]) : h;
}

/** Hal'i bu aya getirir (tembel toparlama) ve döndürür. */
export function halAl(k: Karakter, ay: number): Hal {
  const h = halOngor(k, ay);
  k.hl = [h.can, h.kondisyon, h.gonul, Math.max(ay, k.hl?.[3] ?? ay)];
  return h;
}

/** Göstergeleri değiştirir (sınırlar içinde) ve nedeni kaydeder. Gerçekte uygulanan farkları döndürür. */
export function halDegistir(k: Karakter, ay: number, fark: Partial<Hal>, neden: string): Partial<Hal> {
  const h = halAl(k, ay);
  const uygulanan: Partial<Hal> = {};
  const alt: Record<Gosterge, number> = { can: HAL_TABAN_CAN, kondisyon: 0, gonul: 0 };
  for (const g of ["can", "kondisyon", "gonul"] as const) {
    const d = fark[g];
    if (!d) continue;
    const yeni = kirp(h[g] + d, alt[g], HAL_TAVAN);
    const gercek = yeni - h[g];
    if (gercek === 0) continue;
    uygulanan[g] = gercek;
    h[g] = yeni;
    nedenEkle(k, [g, gercek, neden, ay]);
  }
  k.hl = [h.can, h.kondisyon, h.gonul, k.hl![3]];
  return uygulanan;
}

function nedenEkle(k: Karakter, n: HalNedeni): void {
  const liste = (k.hn ??= []);
  const i = liste.findIndex((x) => x[0] === n[0] && x[2] === n[2] && x[3] === n[3]);
  if (i >= 0) {
    const [eski] = liste.splice(i, 1);
    n = [n[0], eski![1] + n[1], n[2], n[3]];
  }
  liste.unshift(n);
  if (liste.length > HAL_NEDEN_EN_COK) liste.length = HAL_NEDEN_EN_COK;
}

export function kondisyonKademesi(kondisyon: number): (typeof KONDISYON_KADEMELERI)[number] {
  return KONDISYON_KADEMELERI.find((x) => kondisyon >= x.alt) ?? KONDISYON_KADEMELERI[2];
}

export function gonulKademesi(gonul: number): (typeof GONUL_KADEMELERI)[number] {
  return GONUL_KADEMELERI.find((x) => gonul >= x.alt) ?? GONUL_KADEMELERI[2];
}

/** Bir sonraki ay yenilenecek takat (bu ayın sonundaki kondisyona göre). */
export function aylikTakat(k: Karakter, ay: number): number {
  return kondisyonKademesi(halOngor(k, ay).kondisyon).takat;
}

/** Sosyal eylemin şansına gönül etkisi (yüzde puanı; döküm kalemi olarak gösterilir). */
export function gonulSansi(k: Karakter, ay: number, tur: string): number {
  return GONUL_EYLEMLERI.includes(tur) ? gonulKademesi(halOngor(k, ay).gonul).sans : 0;
}

export interface Etki {
  k: string;
  p: Record<string, number>;
}

/** Görünüm: değerler, kademe/durum, her göstergenin etkisi (i18n anahtarı + sayılar) ve son nedenler. */
export function halGorunumu(k: Karakter, ay: number) {
  const h = halAl(k, ay);
  const yarali = h.can < CAN_YARALI_ESIGI;
  const kk = kondisyonKademesi(h.kondisyon);
  const gk = gonulKademesi(h.gonul);
  const canEtki: Etki = {
    k: `hal.can.${yarali ? "yarali" : "saglam"}`,
    p: {
      taban: HAL_TABAN_CAN,
      toparlama: CAN_AYLIK_TOPARLAMA,
      kondisyonToparlama: yarali ? KONDISYON_YARALI_TOPARLAMA : KONDISYON_AYLIK_TOPARLAMA,
      esik: CAN_YARALI_ESIGI,
    },
  };
  return {
    can: { deger: h.can, durum: yarali ? ("yarali" as const) : ("saglam" as const), etki: canEtki },
    kondisyon: {
      deger: h.kondisyon,
      kademe: kk.kademe,
      etki: { k: `hal.kondisyon.${kk.kademe}`, p: { takatAylik: kk.takat, isBasina: -IS_KONDISYON } } as Etki,
    },
    gonul: {
      deger: h.gonul,
      durum: gk.durum,
      etki: { k: `hal.gonul.${gk.durum}`, p: { sans: gk.sans, denge: GONUL_DENGE } } as Etki,
    },
    nedenler: (k.hn ?? []).map(([gosterge, fark, neden, a]) => ({ gosterge, fark, neden, ay: a })),
  };
}
export type HalGorunumu = ReturnType<typeof halGorunumu>;
