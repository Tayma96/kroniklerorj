// Han (Faz 10) ve hanedan (Faz 7) uçları için küçük HTTP yardımcısı. istemci.ts'e dokunmadan aynı kurallarla çalışır:
// Bearer oturumu (kayıtlı belirteç), zaman aşımı, yalnız güvenli isteklerde (GET ve istekNo'lu POST) yeniden deneme.
// Sunucunun bu fazlarda eklediği hata kodları burada tanınır; protokol.ts'teki ortak listeye eklenmez.
import { DENEME_SAYISI, sunucuAdresi, ZAMAN_ASIMI_MS } from "./ayar";
import { oturumOku } from "./depo";
import { yanitOlayi } from "./oturum-olay";
import { hataAnahtari } from "./hata";
import { hataKoduMu, type OnlineHata } from "./protokol";
import { UCGEN_BARINMA_HATALARI } from "./ucgen-barinma-metin";
import { EKO_MULK_HATALARI } from "./eko-hata";

/** online-server/src/tipler.ts HATA_DURUMU'nda olup ortak listede bulunmayan, han ve hanedan ekranlarının kodları. */
export const EK_HATALAR = [
  "engelli", "kendi_hedef", "kendini_sikayet", "uzaklastirildi", "susturuldu", "yetki_yok", "sikayet_gecersiz", "sikayet_siniri",
  "masa_gecersiz", "masa_kapali", "masa_kalabalik", "koltuk_dolu", "zaten_oturuyor", "oturmuyor", "metin_gecersiz",
  "hedef_masada_degil", "kavga_yasak", "olay_yok", "atildi", "eylem_siniri", "ikram_gecersiz", "ikram_kapali", "yukseltme_gerekli",
  "ses_kapali", "ses_hatasi", "masa_sessiz", "masada_degil", "ses_oturumu_yok", "sesi_kesildi", "soz_istegi_yok",
  "stok_yok", "ilan_gecersiz", "ilan_kapandi", "ilan_siniri",
  "olu", "evli", "akraba_evlilik", "gorus_yetersiz", "vasiyet_gecersiz", "varis_gecersiz", "devir_yok", "devir_degisti",
  ...UCGEN_BARINMA_HATALARI, ...EKO_MULK_HATALARI,
] as const;
export type EkHataKodu = (typeof EK_HATALAR)[number];
export type EkHata = OnlineHata | EkHataKodu;
export type EkSonuc<T> = { ok: true; deger: T } | { ok: false; hata: EkHata; bitis?: number | null };

export const ekBasarili = <T,>(deger: T): EkSonuc<T> => ({ ok: true, deger });
export const ekBasarisiz = <T = never,>(hata: EkHata, bitis?: number | null): EkSonuc<T> => (bitis !== undefined ? { ok: false, hata, bitis } : { ok: false, hata });

const EK: ReadonlySet<string> = new Set(EK_HATALAR);
export const ekHataMi = (v: unknown): v is EkHataKodu => typeof v === "string" && EK.has(v);
const bilinenHata = (v: unknown): v is EkHata => hataKoduMu(v) || ekHataMi(v);

/** Ek hata kodu → i18n anahtarı ("onl.hh.<kod>", i18n-sayfa/online6.ts); ortak kodlar hata.ts'ten. */
export function ekHataAnahtari(kod: EkHata): string {
  return ekHataMi(kod) ? "onl.hh." + kod : hataAnahtari(kod);
}

const uyu = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const gecici = (h: string, durum: number) => h === "ag_yok" || h === "zaman_asimi" || durum >= 500;
function durumdanHata(durum: number): EkHata {
  if (durum === 401) return "oturum_gecersiz";
  if (durum === 404) return "bulunamadi";
  if (durum === 429) return "hiz_siniri";
  if (durum >= 500) return "sunucu_hatasi";
  return "gecersiz_istek";
}

export interface EkIstek {
  yontem: "GET" | "POST";
  yol: string;
  govde?: unknown;
  /** Aynı gövdeyle tekrar güvenli mi (GET ya da istekNo'lu POST). */
  tekrar: boolean;
}

/** Tek uç çağrısı: biçim denetiminden geçmeyen yanıt "gecersiz_yanit" olur. */
export async function ekCagir<T>(istek: EkIstek, bicim: (v: unknown) => v is T): Promise<EkSonuc<T>> {
  const taban = sunucuAdresi();
  if (!taban) return ekBasarisiz("sunucu_yok");
  const belirtec = await oturumOku();
  const basliklar: Record<string, string> = { accept: "application/json" };
  if (istek.govde !== undefined) basliklar["content-type"] = "application/json";
  if (belirtec) basliklar.authorization = `Bearer ${belirtec}`;
  const sinir = istek.tekrar ? Math.max(1, DENEME_SAYISI) : 1;
  let son: EkSonuc<unknown> = ekBasarisiz("ag_yok");
  for (let n = 0; n < sinir; n++) {
    if (n > 0) await uyu(400 * 3 ** (n - 1));
    const iptal = new AbortController();
    const zamanlayici = setTimeout(() => iptal.abort(), ZAMAN_ASIMI_MS);
    let durum = 0;
    try {
      const yanit = await fetch(taban + istek.yol, {
        method: istek.yontem,
        headers: basliklar,
        body: istek.govde === undefined ? undefined : JSON.stringify(istek.govde),
        signal: iptal.signal,
      });
      durum = yanit.status;
      let veri: unknown;
      try { veri = await yanit.json(); } catch { veri = undefined; }
      if (yanit.ok) son = veri === undefined ? ekBasarisiz("gecersiz_yanit") : ekBasarili(veri);
      else {
        const g = typeof veri === "object" && veri !== null ? (veri as { hata?: unknown; bitis?: unknown }) : {};
        const bitis = typeof g.bitis === "number" || g.bitis === null ? g.bitis : undefined;
        const kod = bilinenHata(g.hata) ? g.hata : durumdanHata(yanit.status);
        yanitOlayi(kod, yanit.status, !!belirtec);
        son = ekBasarisiz(kod, bitis);
      }
    } catch {
      son = ekBasarisiz(iptal.signal.aborted ? "zaman_asimi" : "ag_yok");
    } finally {
      clearTimeout(zamanlayici);
    }
    if (son.ok || !gecici(son.hata, durum)) break;
  }
  if (!son.ok) return son;
  return bicim(son.deger) ? ekBasarili(son.deger) : ekBasarisiz("gecersiz_yanit");
}

/** WebSocket adresi: https → wss, http → ws (sunucu adresi boşsa undefined). */
export function soketAdresi(yol: string): string | undefined {
  const taban = sunucuAdresi();
  return taban ? taban.replace(/^http/, "ws") + yol : undefined;
}

/** Oyun ayı (sunucunun mutlak ay sayacı) → takvim yılı ve ayı; şimdiki saatle hizalanır. */
export function ayTakvimi(a: number, saat: { oyunAyi: number; yil: number; ay: number }): { yil: number; ay: number } {
  const fark = saat.ay - 1 + (a - saat.oyunAyi);
  return { yil: saat.yil + Math.floor(fark / 12), ay: ((fark % 12) + 12) % 12 + 1 };
}

export const nesneMi = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
export const metinMi = (v: unknown): v is string => typeof v === "string";
export const sayiMi = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
