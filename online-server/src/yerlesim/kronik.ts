// Yerleşim kroniği (Faz 7): ölüm, devir, oyuncu evliliği ve oyuncu hanesindeki doğum kalıcı satır olarak
// yazılır. Olay defteri sayfaları dönse de kronik kalır (ayrı depo anahtarı `kronik:<sayfa>`, budanmaz).
// Saf kurallar satırı kuyruğa (kasaba.kq) koyar; motor kaydederken sıra verip sayfalara yazar.

import type { Dil } from "../icerik/adlar.ts";
import { takvim } from "../saat.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { hakAcik } from "./beceri-etki.ts";
import { olduMu } from "./hanedan.ts";
import { NAMLAR, namEkle, takatHarca, type Nam } from "./karakter.ts";
import { oyuncuRef, paramYaz } from "./ortak.ts";
import { toplulukAl } from "./topluluk-kayit.ts";
import type { Karakter, Kasaba, Olay, OlayParam } from "./tipler.ts";

/** [PARAMETRE] Sayfa başına satır, yanıt başına en çok satır. */
export const KRONIK_SAYFA = 64;
export const KRONIK_YANIT_EN_COK = 50;

export type KronikTuru = "olum" | "devir" | "evlilik" | "dogum" | "goc" | "esya" | "kalem";

export interface KronikSatiri {
  /** Sıra (motor verir; 1'den artar). */
  s?: number;
  /** Oyun ayı. */
  a: number;
  t: KronikTuru;
  /** i18n anahtarı ve parametreleri. */
  k: string;
  p: Record<string, OlayParam>;
}

export function kronikEkle(kasaba: Kasaba, satir: KronikSatiri): void {
  (kasaba.kq ??= []).push(satir);
}

export function kronikYaz(s: KronikSatiri, dil: Dil) {
  return { sira: s.s ?? 0, ay: s.a, tur: s.t, ozet: { k: s.k, p: paramYaz(s.p, dil) } };
}

// ── Kanca partisi 2: ozanın kronik kalemi (`kasabaKronigi`, `kronikNami`) ──

/**
 * [PARAMETRE] Kronik kalemi: ozan bir oyun yılında en çok KRONIK_KALEM_YILLIK herkese açık olayı kroniğe yazar (kalıcı,
 * herkese görünür); olay en çok KRONIK_KALEM_GERI_AY eski olabilir; her olay bir kez yazılır; bedeli takat.
 * `kronikNami`: kroniğe yazılan olayın öznesi oyuncuysa (yazan, aynı hesap ve aynı hane değil) en yüksek namına
 * KRONIK_NAM eklenir; kişi başı yılda bir kez (aylık nam tavanı da geçerli). Akçe yok.
 */
export const KRONIK_KALEM_YILLIK = 3;
export const KRONIK_KALEM_GERI_AY = 12;
export const KRONIK_KALEM_TAKAT = 1;
export const KRONIK_NAM = 1;
/** [PARAMETRE] Yazılmış olay izi (tekrar yazılmasın; en yeniler). */
export const KRONIK_KALEM_IZ = 120;

/** Topluluk kaydındaki kalem izi: ozan → [yıl, sayı], yazılmış olay sıraları, nam alan → yıl. */
export interface KronikKalemIzi {
  y: Record<string, [yil: number, n: number]>;
  s: number[];
  n: Record<string, number>;
}

export const KRONIK_KALEM_KURALLARI = { yillik: KRONIK_KALEM_YILLIK, geriAy: KRONIK_KALEM_GERI_AY, takat: KRONIK_KALEM_TAKAT, nam: KRONIK_NAM } as const;

/** Öznenin en çok namı (eşitlikte NAMLAR sırası). */
function enYuksekNam(c: Karakter): Nam {
  let en = 0;
  for (let i = 1; i < NAMLAR.length; i++) if ((c.nm[i] ?? 0) > (c.nm[en] ?? 0)) en = i;
  return NAMLAR[en]!;
}

/** POST /v1/kronik/yaz {olay, istekNo}: olay motor tarafından sırasıyla okunup verilir (yoksa undefined). Saf. */
export function kronikKalemi(k: Kasaba, kar: Karakter, olay: Olay | undefined, ay: number): Sonuc<{ yanit: Record<string, unknown>; digerleri: string[] }> {
  if (!hakAcik(kar, "kasabaKronigi")) return hata("dugum_kapali");
  if (!olay || olay.g !== "" || olay.a > ay || ay - olay.a > KRONIK_KALEM_GERI_AY) return hata("hedef_uygun_degil");
  const tl = toplulukAl(k);
  const iz = (tl.kl ??= { y: {}, s: [], n: {} });
  if (iz.s.includes(olay.s)) return hata("istek_tekrar");
  const yil = takvim(ay).yil;
  const [y0, n0] = iz.y[kar.o] ?? [yil, 0];
  const sayi = y0 === yil ? n0 : 0;
  if (sayi >= KRONIK_KALEM_YILLIK) return hata("aralik_dolu");
  if (!takatHarca(kar, ay, KRONIK_KALEM_TAKAT)) return hata("takat_yok");
  iz.y[kar.o] = [yil, sayi + 1];
  iz.s.push(olay.s);
  if (iz.s.length > KRONIK_KALEM_IZ) iz.s.splice(0, iz.s.length - KRONIK_KALEM_IZ);
  kronikEkle(k, { a: ay, t: "kalem", k: olay.k, p: { ...olay.p, kalem: oyuncuRef(kar), olayAyi: olay.a } });
  const digerleri: string[] = [];
  let nam: { kisi: string; nam: Nam; d: number } | undefined;
  const ozne = olay.w ? k.kar.get(olay.w) : undefined;
  if (hakAcik(kar, "kronikNami") && ozne && !olduMu(ozne) && ozne.o !== kar.o && ozne.h !== kar.h && (kar.e === 0 || ozne.e !== kar.e) && iz.n[ozne.o] !== yil) {
    const tur = enYuksekNam(ozne);
    const d = namEkle(ozne, ay, tur, KRONIK_NAM);
    iz.n[ozne.o] = yil;
    if (d) {
      nam = { kisi: ozne.ad, nam: tur, d };
      digerleri.push(ozne.o);
    }
  }
  return basarili({
    yanit: { kalem: { olay: olay.s, yil, yazilan: sayi + 1, kalan: KRONIK_KALEM_YILLIK - sayi - 1, ...(nam ? { nam } : {}) }, kurallar: KRONIK_KALEM_KURALLARI },
    digerleri,
  });
}
