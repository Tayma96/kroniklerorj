// Çevrimiçi yerel depo: AsyncStorage üzerinde küçük bir soyutlama; bütün anahtarlar "kronikler_online_" ile başlar
// ve tek oyunculu kayıtla hiçbir anahtarı paylaşmaz.
// Oturum belirteci cihazın güvenli deposunda (Android Keystore / iOS Keychain; expo-secure-store) tutulur. Güvenli depo
// yoksa (web önizleme, modülü içermeyen eski derleme) AsyncStorage'a düşer. Eski sürümün AsyncStorage'daki belirteci
// ilk okumada güvenli depoya taşınır ve eski yerinden silinir.
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Cinsiyet } from "./protokol";

const ONEK = "kronikler_online_";
const OTURUM = ONEK + "oturum";
const TASLAK = ONEK + "taslak";
const SINEMATIK = ONEK + "sinematik";
const IMLEC = ONEK + "imlec";
const MESLEK = ONEK + "meslek";
const TEST_CIHAZ = ONEK + "testCihaz";

// Sunucunun oturum biçimi: base64url(yük).base64url(HMAC-SHA256).
const OTURUM_BICIMI = /^[A-Za-z0-9_-]{1,2048}\.[A-Za-z0-9_-]{43}$/;
const ISTEK_NO_BICIMI = /^[A-Za-z0-9_-]{8,64}$/;

async function oku(anahtar: string): Promise<string | null> {
  try { return await AsyncStorage.getItem(anahtar); } catch { return null; }
}
async function yaz(anahtar: string, deger: string): Promise<void> {
  try { await AsyncStorage.setItem(anahtar, deger); } catch {}
}
async function sil(anahtar: string): Promise<void> {
  try { await AsyncStorage.removeItem(anahtar); } catch {}
}

type GizliDepo = typeof import("expo-secure-store");
let gizliModul: GizliDepo | null | undefined;
let gizliVar: Promise<boolean> | undefined;
/** Güvenli depo modülü; yerel modül derlemede yoksa null (içe aktarma hatası uygulamayı düşürmez). */
function gizli(): GizliDepo | null {
  if (gizliModul === undefined) {
    try { gizliModul = require("expo-secure-store") as GizliDepo; } catch { gizliModul = null; }
  }
  return gizliModul;
}
function gizliKullanilir(): Promise<boolean> {
  return (gizliVar ??= (async () => {
    try { return (await gizli()?.isAvailableAsync()) === true; } catch { return false; }
  })());
}

export async function oturumOku(): Promise<string | null> {
  const g = (await gizliKullanilir()) ? gizli() : null;
  if (g) {
    try {
      const v = await g.getItemAsync(OTURUM);
      if (v && OTURUM_BICIMI.test(v)) return v;
    } catch { /* anahtar deposu okunamadı: eski depoya bakılır, yoksa yeniden giriş istenir */ }
  }
  const eski = await oku(OTURUM);
  if (!eski || !OTURUM_BICIMI.test(eski)) return null;
  if (g) {
    try {
      await g.setItemAsync(OTURUM, eski);
      await sil(OTURUM);
    } catch { /* taşınamadı: belirteç eski yerinde kalır, sonraki açılışta yeniden denenir */ }
  }
  return eski;
}
export async function oturumYaz(belirtec: string): Promise<void> {
  const g = (await gizliKullanilir()) ? gizli() : null;
  if (g) {
    try {
      await g.setItemAsync(OTURUM, belirtec);
      await sil(OTURUM);
      return;
    } catch { /* güvenli depoya yazılamadı: oturum kaybolmasın diye eski depoya yazılır */ }
  }
  await yaz(OTURUM, belirtec);
}
export async function oturumSil(): Promise<void> {
  try { await gizli()?.deleteItemAsync(OTURUM); } catch {}
  await sil(OTURUM);
}

/** Henüz sunucuya kaydedilmemiş profil taslağı; istekNo yeniden denemelerde aynı kalır. */
export interface Taslak {
  ad: string;
  cinsiyet: Cinsiyet | null;
  istekNo: string;
  /** Seçilen yerleşim kimliği (davetsiz yol). */
  yerlesim?: string;
}

export async function taslakOku(): Promise<Taslak | null> {
  const ham = await oku(TASLAK);
  if (!ham) return null;
  try {
    const v: unknown = JSON.parse(ham);
    if (typeof v !== "object" || v === null) return null;
    const { ad, cinsiyet, istekNo, yerlesim } = v as Record<string, unknown>;
    if (typeof ad !== "string" || ad.length > 64 || typeof istekNo !== "string" || !ISTEK_NO_BICIMI.test(istekNo)) return null;
    return {
      ad,
      cinsiyet: cinsiyet === "erkek" || cinsiyet === "kadın" ? cinsiyet : null,
      istekNo,
      ...(typeof yerlesim === "string" && yerlesim.length <= 32 ? { yerlesim } : {}),
    };
  } catch {
    return null;
  }
}
export const taslakYaz = (t: Taslak) => yaz(TASLAK, JSON.stringify(t));
export const taslakSil = () => sil(TASLAK);

/** Açılış sinematiği bu hesapta izlendi mi (hesap kimliği tutulur, başka hesapla girince yeniden oynar). */
export async function sinematikGoruldu(hesapId: string): Promise<boolean> {
  return (await oku(SINEMATIK)) === hesapId;
}
export const sinematikIsaretle = (hesapId: string) => yaz(SINEMATIK, hesapId);

/**
 * Olay defteri imleci: bu hesapta en son okunan olay sırası (GET /v1/olaylar?imlec=). Hesap kimliğiyle saklanır;
 * başka hesapla girilince sıfırdan başlar.
 */
export async function imlecOku(hesapId: string): Promise<number | null> {
  const ham = await oku(IMLEC);
  if (!ham) return null;
  try {
    const v: unknown = JSON.parse(ham);
    if (typeof v !== "object" || v === null) return null;
    const { h, i } = v as Record<string, unknown>;
    return h === hesapId && typeof i === "number" && Number.isSafeInteger(i) && i >= 0 ? i : null;
  } catch {
    return null;
  }
}
export const imlecYaz = (hesapId: string, imlec: number) => yaz(IMLEC, JSON.stringify({ h: hesapId, i: Math.max(0, Math.floor(imlec)) }));

/**
 * Son meslek yanıtının yerel kopyası (meslek kaydı, kademe eşikleri, envanter). Sunucu GET /v1/yerlesim'de meslek
 * göndermediği sürece ekran açılışında bilinen son durumu gösterir; sunucu her yazma yanıtında doğrusunu döndürür.
 * Biçim denetimi çağıranda (protokol.ts meslekKaydiMi) yapılır.
 */
export async function meslekOku(hesapId: string): Promise<{ m: unknown; k: unknown; e: unknown } | null> {
  const ham = await oku(MESLEK);
  if (!ham) return null;
  try {
    const v: unknown = JSON.parse(ham);
    if (typeof v !== "object" || v === null) return null;
    const { h, m, k, e } = v as Record<string, unknown>;
    return h === hesapId ? { m, k, e } : null;
  } catch {
    return null;
  }
}
export const meslekYaz = (hesapId: string, m: unknown, k: unknown, e: unknown) => yaz(MESLEK, JSON.stringify({ h: hesapId, m, k, e }));

/** Test hesabını cihazda sabit tutar; aynı cihaz sonraki girişte aynı test hesabına döner. */
export async function testCihazKimligi(): Promise<string> {
  const onceki = await oku(TEST_CIHAZ);
  if (onceki && /^test-[A-Za-z0-9_-]{16,64}$/.test(onceki)) return onceki;
  const yeni = "test-" + istekNoUret().replace(/[^A-Za-z0-9_-]/g, "");
  await yaz(TEST_CIHAZ, yeni);
  return yeni;
}

/** Yeni bir istek numarası: zaman + 20 rastgele karakter (sunucu biçimi [A-Za-z0-9_-]{8,64}). */
export function istekNoUret(): string {
  const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bayt = new Uint8Array(20);
  const kripto = (globalThis as { crypto?: { getRandomValues?: (b: Uint8Array) => Uint8Array } }).crypto;
  if (kripto?.getRandomValues) kripto.getRandomValues(bayt);
  else for (let i = 0; i < bayt.length; i++) bayt[i] = Math.floor(Math.random() * 256);
  let s = Date.now().toString(36) + "-";
  for (const b of bayt) s += a[b % a.length];
  return s;
}
