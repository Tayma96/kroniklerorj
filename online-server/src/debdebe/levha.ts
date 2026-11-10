// Cömertler Levhası (GDD §19, araştırma §7.1): her şehirde (beylik başına) haftalık ve sezonluk levha, sezon sonunda
// kalıcı levha. Baskıcı olmayan biçim: tutar, puan ve sıra numarası gösterilmez; kademe içinde adlar alfabetiktir;
// görünmek isteğe bağlıdır (varsayılan kapalı); haftalık kişi başı tavan vardır (tavanı aşan harcama levhayı
// değiştirmez); bildirim yok. Oyun içi cömertlik (akçeyle ikram) da sayılır. Levha hiçbir oyun etkisi vermez.
// DunyaDO'da tutulur (tek örnek; yazma yalnız satın alma, armağan ve ikramda olur).

import type { Depo } from "../depo.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { trGunu } from "../yonetim/sikayet.ts";
import { DEBDEBE_SEVIYELERI, type SeviyeAdi } from "./katalog.ts";
import { sezonBitisi, sezonNo } from "./sezon.ts";

/** [PARAMETRE] Haftalık kişi başı levha puanı tavanı; "bu hafta anılanlar" eşiği; sezon "şehrin cömertleri" eşiği
 * (sezon puanı) ve bu kademeye kendiliğinden giren Debdebe seviyeleri; kalıcı levhada tutulan sezon; akçe → puan. */
export const LEVHA_HAFTA_TAVAN = 1500;
export const LEVHA_ANILMA_ESIGI = 1;
export const LEVHA_SEZON_ESIGI = 2000;
export const LEVHA_COMERT_SEVIYELER: readonly SeviyeAdi[] = ["lacivert", "zumrut"];
export const LEVHA_KALICI_SEZON = 24;
export const AKCE_LEVHA_ORANI = 5;
/** [PARAMETRE] Bir tabloda tutulan en çok kişi. */
export const LEVHA_KISI_EN_COK = 500;

interface LevhaSatiri {
  ad: string;
  p: number;
  sv: SeviyeAdi | null;
}
type Tablo = Record<string, LevhaSatiri>;

export interface LevhaYazimi {
  beylik: string;
  hesap: string;
  ad: string;
  puan: number;
  seviye: SeviyeAdi | null;
  gorunur: boolean;
}

const haftaNo = (simdi: number): number => Math.floor((trGunu(simdi) + 3) / 7);
const HAFTA = (b: string, h: number) => `levha:${b}:h${h}`;
const SEZON = (b: string, s: number) => `levha:${b}:s${s}`;
const KALICI = (b: string) => `levha:${b}:kalici`;
const SON_SEZON = (b: string) => `levha:${b}:son`;

function beylikGecerli(b: unknown): b is string {
  return typeof b === "string" && /^[a-z0-9_-]{1,32}$/.test(b);
}

function alfabetik(adlar: string[]): string[] {
  return [...adlar].sort((a, b) => a.localeCompare(b, "tr"));
}

function comertMi(s: LevhaSatiri): boolean {
  return s.p >= LEVHA_SEZON_ESIGI || (s.sv !== null && LEVHA_COMERT_SEVIYELER.includes(s.sv));
}

/** Sezon döndüyse eski sezonun cömertlerini kalıcı levhaya yazar (sıra numarası olmadan). */
async function sezonDevri(depo: Depo, beylik: string, simdi: number): Promise<Record<string, unknown>> {
  const simdiki = sezonNo(simdi);
  const son = await depo.al<number>(SON_SEZON(beylik));
  if (son === undefined) return { [SON_SEZON(beylik)]: simdiki };
  if (son >= simdiki) return {};
  const tablo = (await depo.al<Tablo>(SEZON(beylik, son))) ?? {};
  const adlar = alfabetik(Object.values(tablo).filter(comertMi).map((s) => s.ad));
  const kalici = (await depo.al<{ sezon: number; adlar: string[] }[]>(KALICI(beylik))) ?? [];
  if (adlar.length) kalici.push({ sezon: son, adlar });
  return { [SON_SEZON(beylik)]: simdiki, [KALICI(beylik)]: kalici.slice(-LEVHA_KALICI_SEZON) };
}

function tabloYaz(t: Tablo, y: LevhaYazimi, eklenen: number): void {
  const s = t[y.hesap];
  t[y.hesap] = { ad: y.ad, p: (s?.p ?? 0) + eklenen, sv: y.seviye };
  const anahtarlar = Object.keys(t);
  if (anahtarlar.length > LEVHA_KISI_EN_COK) {
    // En düşük puanlı satır düşer (yalnız depolama sınırı; levhada sıra görünmez).
    const en = anahtarlar.reduce((a, b) => (t[a]!.p <= t[b]!.p ? a : b));
    delete t[en];
  }
}

/** Levhaya yazar: görünmek istemeyen tablolardan silinir; haftalık tavan aşılırsa fazlası sayılmaz. */
export async function levhaYaz(depo: Depo, y: LevhaYazimi, simdi: number): Promise<Sonuc<{ eklenen: number }>> {
  if (!beylikGecerli(y.beylik) || typeof y.hesap !== "string" || typeof y.ad !== "string") return hata("gecersiz_istek");
  if (!Number.isFinite(y.puan) || y.puan < 0) return hata("gecersiz_istek");
  const devir = await sezonDevri(depo, y.beylik, simdi);
  const hk = HAFTA(y.beylik, haftaNo(simdi));
  const sk = SEZON(y.beylik, sezonNo(simdi));
  const hafta = (await depo.al<Tablo>(hk)) ?? {};
  const sezon = (await depo.al<Tablo>(sk)) ?? {};
  if (!y.gorunur) {
    delete hafta[y.hesap];
    delete sezon[y.hesap];
    await depo.koy({ ...devir, [hk]: hafta, [sk]: sezon });
    return basarili({ eklenen: 0 });
  }
  const eklenen = Math.max(0, Math.min(Math.floor(y.puan), LEVHA_HAFTA_TAVAN - (hafta[y.hesap]?.p ?? 0)));
  tabloYaz(hafta, y, eklenen);
  tabloYaz(sezon, y, eklenen);
  await depo.koy({ ...devir, [hk]: hafta, [sk]: sezon });
  return basarili({ eklenen });
}

/** Levha görünümü: yalnız adlar, kademe kademe, alfabetik; tutar ve sıra yok. */
export async function levhaOku(depo: Depo, beylik: unknown, simdi: number): Promise<Sonuc<unknown>> {
  if (!beylikGecerli(beylik)) return hata("gecersiz_istek");
  const devir = await sezonDevri(depo, beylik, simdi);
  if (Object.keys(devir).length) await depo.koy(devir);
  const hafta = (await depo.al<Tablo>(HAFTA(beylik, haftaNo(simdi)))) ?? {};
  const s = sezonNo(simdi);
  const sezon = (await depo.al<Tablo>(SEZON(beylik, s))) ?? {};
  const kalici = (await depo.al<{ sezon: number; adlar: string[] }[]>(KALICI(beylik))) ?? [];
  return basarili({
    beylik,
    sehrinComertleri: alfabetik(Object.values(sezon).filter(comertMi).map((x) => x.ad)),
    buHaftaAnilanlar: alfabetik(Object.values(hafta).filter((x) => x.p >= LEVHA_ANILMA_ESIGI).map((x) => x.ad)),
    kalici: [...kalici].reverse(),
    sezon: s,
    sezonBitis: sezonBitisi(s),
    kademeler: { comert: LEVHA_COMERT_SEVIYELER, seviyeler: DEBDEBE_SEVIYELERI.map((x) => x.ad) },
  });
}
