// Yönetici oturum belirteci: oyuncu oturumundan ayrıdır. Aynı biçim (oturum.ts) ama başka bir anahtarla imzalanır:
// yönetim anahtarı = base64url(HMAC-SHA256(OTURUM_ANAHTARI, "kronikler-yonetim-oturumu-v1")). Böylece oyuncu
// belirteci /yonetim/*'de, yönetici belirteci /v1/*'de imzadan geçmez. Yük ayrıca "y1:" önekiyle işaretlidir.
// Rol belirtece yazılmaz; her istekte YonetimDO'da yeniden çözülür (rol alınırsa belirteç hemen işe yaramaz).
// Belirteç yöneticinin oturum sürümünü (`v`) taşır; "her yerden çık" YonetimDO'da sürümü artırır, eski belirteçler düşer.
// Kurucu anahtarıyla açılan oturumun kimliği sabittir (KURUCU_ANAHTAR_KIMLIGI); Google `sub`'ı hiçbir zaman bu değer
// olamaz (Google sub'ları rakamdır, ayrıca girişte reddedilir).

import { b64urlKodla, utf8 } from "../b64.ts";
import { oturumDogrula, oturumOlustur, type OturumHatasi } from "../oturum.ts";

/** [PARAMETRE] Yönetici oturumunun süresi. */
export const YONETICI_OTURUM_SURESI_MS = 12 * 60 * 60 * 1000;
const BAGLAM = "kronikler-yonetim-oturumu-v1";
const ONEK = "y1:";
const SUB = /^[A-Za-z0-9_-]{1,255}$/;

let onbellek: { gizli: string; turetilmis: string } | undefined;

/** Oyuncu oturum anahtarından yönetici anahtarını türetir (anahtar hiçbir yere yazılmaz). */
export async function yonetimAnahtari(gizli: string): Promise<string> {
  if (onbellek?.gizli === gizli) return onbellek.turetilmis;
  const hmac = { name: "HMAC", hash: "SHA-256" };
  const anahtar = await crypto.subtle.importKey("raw", utf8(gizli), hmac, false, ["sign"]);
  const turetilmis = b64urlKodla(await crypto.subtle.sign("HMAC", anahtar, utf8(BAGLAM)));
  onbellek = { gizli, turetilmis };
  return turetilmis;
}

/** Kurucu anahtarıyla açılan oturumun kimliği (e-posta biçimli ama gerçek bir adres değildir). */
export const KURUCU_ANAHTAR_KIMLIGI = { sub: "kurucu-anahtari", eposta: "kurucu@anahtar.yerel" } as const;
/** [PARAMETRE] Kurucu anahtarının en kısa uzunluğu; daha kısaysa anahtarla giriş kapalıdır. */
export const KURUCU_ANAHTARI_EN_KISA = 32;

export function kurucuAnahtariAcik(anahtar: string | undefined): anahtar is string {
  return typeof anahtar === "string" && anahtar.length >= KURUCU_ANAHTARI_EN_KISA;
}

/** Sabit sürede karşılaştırma: iki metnin SHA-256 özeti karşılaştırılır (uzunluk da sızmaz). */
export async function anahtarEsit(verilen: string, gercek: string): Promise<boolean> {
  const [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", utf8(verilen)), crypto.subtle.digest("SHA-256", utf8(gercek))]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let fark = 0;
  for (let i = 0; i < x.length; i++) fark |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return fark === 0;
}

export async function yoneticiOturumuOlustur(
  kimlik: { sub: string; eposta: string },
  gizli: string,
  simdi: number,
  surum = 0,
): Promise<string> {
  return oturumOlustur(`${ONEK}${kimlik.sub}:${kimlik.eposta}`, await yonetimAnahtari(gizli), simdi, YONETICI_OTURUM_SURESI_MS, surum);
}

export type YoneticiOturumu = { ok: true; sub: string; eposta: string; surum: number } | { ok: false; hata: OturumHatasi };

export async function yoneticiOturumuDogrula(belirtec: string, gizli: string, simdi: number): Promise<YoneticiOturumu> {
  const sonuc = await oturumDogrula(belirtec, await yonetimAnahtari(gizli), simdi);
  if (!sonuc.ok) return sonuc;
  const h = sonuc.hesapId;
  if (!h.startsWith(ONEK)) return { ok: false, hata: "oturum_gecersiz" };
  const govde = h.slice(ONEK.length);
  const ayrac = govde.indexOf(":");
  const sub = govde.slice(0, ayrac);
  const eposta = govde.slice(ayrac + 1);
  if (ayrac <= 0 || !SUB.test(sub) || !eposta.includes("@")) return { ok: false, hata: "oturum_gecersiz" };
  return { ok: true, sub, eposta, surum: sonuc.surum };
}
