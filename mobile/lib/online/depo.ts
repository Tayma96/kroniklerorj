// Çevrimiçi yerel depo: AsyncStorage üzerinde küçük bir soyutlama; bütün anahtarlar "kronikler_online_" ile başlar
// ve tek oyunculu kayıtla hiçbir anahtarı paylaşmaz.
// NOT (Faz 1d): oturum belirteci, yerel modüller (Google girişi) eklenirken güvenli depoya (expo-secure-store)
// taşınacak; bu dosyanın dışa açtığı işlevler aynı kalır.
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Cinsiyet } from "./protokol";

const ONEK = "kronikler_online_";
const OTURUM = ONEK + "oturum";
const TASLAK = ONEK + "taslak";
const SINEMATIK = ONEK + "sinematik";

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

export async function oturumOku(): Promise<string | null> {
  const v = await oku(OTURUM);
  return v && OTURUM_BICIMI.test(v) ? v : null;
}
export const oturumYaz = (belirtec: string) => yaz(OTURUM, belirtec);
export const oturumSil = () => sil(OTURUM);

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
