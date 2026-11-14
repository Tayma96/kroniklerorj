// Düello (H6, ONLINE_DURUM §4.1): han masasında "meydan oku" teklifi hedefin "kabul"üyle düelloya döner. Sunucu çözer,
// istemci sonuç gönderemez. Saf fonksiyonlar; uygulama ve tanıklık src/yerlesim/han-olay.ts'dedir.
//
// Güç = dövüş becerisi + güç·3 + çeviklik·3 + dayanıklılık·2 + ⌊kondisyon/5⌋ + zar(1..20). Zar tohumu olay
// anahtarıdır (deterministik; aynı olay her teslimde aynı sonucu verir). Eşitlikte meydan okunan (savunan) kazanır.
// Döküm kalem kalem tanıklık olayına yazılır (gizli sayı yok; ağırlıklar aşağıda dışa aktarılmıştır).
// Sonuç: kazanana mertlik (aylık nam tavanı içinde, aynı çifte mevsimde bir kez); kaybeden hiçbir şey kaybetmez;
// iki taraf birer takat harcar. Bahis ve akçe yoktur.

import { BASLANGIC_YASI } from "../mantik.ts";
import { halOngor } from "./hal.ts";
import { olduMu } from "./hanedan.ts";
import { BECERILER, karakterYasi, OZELLIKLER, takatTazele } from "./karakter.ts";
import { aralik, tohumlu } from "./rastgele.ts";
import { ayniKume } from "./teveccuh.ts";
import type { Karakter, Sakin } from "./tipler.ts";

/** [PARAMETRE] Yaş kapısı (iki taraf). */
export const DUELLO_YAS_EN_AZ = 16;
export const DUELLO_YAS_EN_COK = 65;
/** [PARAMETRE] Yerleşimde en az bu kadar oyun ayı (7 gerçek gün × günde 2 ay dönümü). */
export const DUELLO_YERLESIM_AY_EN_AZ = 14;
/** [PARAMETRE] Her tarafın harcadığı takat; takatı yetmeyen düello edemez (kapı). */
export const DUELLO_TAKAT = 1;
/** [PARAMETRE] Kazananın mertlik namı (NAM_AYLIK_TAVAN ayrıca uygulanır). */
export const DUELLO_NAM = 2;
/** [PARAMETRE] Zarın üst sınırı (1..DUELLO_ZAR). */
export const DUELLO_ZAR = 20;
/** [PARAMETRE] Güç kalemlerinin ağırlıkları (özellik 1–10, beceri 0–100, kondisyon 0–100). */
export const DUELLO_AGIRLIK = { dovus: 1, guc: 3, ceviklik: 3, dayaniklilik: 2, kondisyonBolen: 5 } as const;

export type DuelloKapisi = "yas" | "sure" | "olu" | "ayni_kume" | "takat";

/** Döküm kalemleri (sıra istemci gösterimi içindir). */
export const DUELLO_KALEMLERI = ["dovus", "guc", "ceviklik", "dayaniklilik", "kondisyon", "zar"] as const;
export type DuelloKalemi = (typeof DUELLO_KALEMLERI)[number];
export type DuelloDokumu = Record<DuelloKalemi, number> & { toplam: number };

/** Sakinin yerleşime giriş ayı; eski kayıtta yoksa hesabın oluşturulduğu ay (doğum ayı + başlangıç yaşı). */
export function girisAyi(s: Pick<Sakin, "d" | "gi">): number {
  return s.gi ?? s.d + BASLANGIC_YASI * 12;
}

/** Mevsim numarası (takvimle hizalı: Aralık–Şubat aynı kış). Farm penceresi: aynı çift mevsimde bir kez nam. */
export function mevsimNo(ay: number): number {
  return Math.floor((ay + 1) / 3);
}

/** Kapılar (iki taraf için; ilk tutmayan döner). Takat önce tembel tazelenir. */
export function duelloKapisi(
  a: Karakter,
  b: Karakter,
  sa: Pick<Sakin, "d" | "gi">,
  sb: Pick<Sakin, "d" | "gi">,
  ay: number,
): DuelloKapisi | undefined {
  if (olduMu(a) || olduMu(b)) return "olu";
  if (ayniKume(a, b)) return "ayni_kume";
  for (const k of [a, b]) {
    const y = karakterYasi(k, ay);
    if (y < DUELLO_YAS_EN_AZ || y > DUELLO_YAS_EN_COK) return "yas";
  }
  for (const s of [sa, sb]) if (ay - girisAyi(s) < DUELLO_YERLESIM_AY_EN_AZ) return "sure";
  for (const k of [a, b]) {
    takatTazele(k, ay);
    if (k.tk < DUELLO_TAKAT) return "takat";
  }
  return undefined;
}

function dokum(k: Karakter, ay: number, zar: number): DuelloDokumu {
  const oz = (n: (typeof OZELLIKLER)[number]) => k.oz[OZELLIKLER.indexOf(n)] ?? 0;
  const d: Record<DuelloKalemi, number> = {
    dovus: (k.be[BECERILER.indexOf("dovus")] ?? 0) * DUELLO_AGIRLIK.dovus,
    guc: oz("guc") * DUELLO_AGIRLIK.guc,
    ceviklik: oz("ceviklik") * DUELLO_AGIRLIK.ceviklik,
    dayaniklilik: oz("dayaniklilik") * DUELLO_AGIRLIK.dayaniklilik,
    kondisyon: Math.floor(halOngor(k, ay).kondisyon / DUELLO_AGIRLIK.kondisyonBolen),
    zar,
  };
  return { ...d, toplam: DUELLO_KALEMLERI.reduce((t, x) => t + d[x], 0) };
}

export interface DuelloSonucu {
  /** Meydan okuyan ve meydan okunan (savunan) dökümleri. */
  kisi: DuelloDokumu;
  hedef: DuelloDokumu;
  /** Kazanan: "kisi" ya da "hedef" (eşitlikte savunan). */
  kazanan: "kisi" | "hedef";
}

/** Deterministik çözüm (saf; karakterleri değiştirmez). `tohum`: olay anahtarı. */
export function duelloCoz(kisi: Karakter, hedef: Karakter, ay: number, tohum: string): DuelloSonucu {
  const r = tohumlu("duello", tohum);
  const dk = dokum(kisi, ay, aralik(r, 1, DUELLO_ZAR));
  const dh = dokum(hedef, ay, aralik(r, 1, DUELLO_ZAR));
  return { kisi: dk, hedef: dh, kazanan: dk.toplam > dh.toplam ? "kisi" : "hedef" };
}
