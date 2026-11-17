// E-posta + şifre ile kayıt ve giriş: saf yardımcılar ve DunyaDO dizini.
// Düz e-posta hiçbir yerde saklanmaz: dizin anahtarı normalize e-postanın SHA-256'sıdır. Hesabın `sub`'ı rastgeledir
// (`eposta:<rastgele>`), böylece HesapDO kimliği ve künye e-postayı göstermez. Şifre PBKDF2-SHA256 ile saklanır.
// E-posta doğrulama ve şifre sıfırlama yok (e-posta gönderme altyapısı yok; docs/online/ONLINE_DURUM.md).

import { b64urlCoz, b64urlKodla, utf8 } from "./b64.ts";
import type { Depo } from "./depo.ts";
import { sabitSurecliEsit } from "./oturum.ts";
import { basarili, hata, type Sonuc } from "./tipler.ts";

/** [PARAMETRE] E-posta en çok bu kadar karakter (RFC 5321). */
export const EPOSTA_EN_UZUN = 254;
/** [PARAMETRE] Şifre uzunluk sınırları (karakter). */
export const SIFRE_EN_KISA = 8;
export const SIFRE_EN_UZUN = 128;
/** [PARAMETRE] PBKDF2 yinelemesi: Workers WebCrypto'nun izin verdiği en yüksek değer. */
export const SIFRE_YINELEME = 100_000;
/** [PARAMETRE] Tuz uzunluğu (bayt). */
export const SIFRE_TUZ_BAYT = 16;
/** [PARAMETRE] Türetilen anahtar uzunluğu (bayt). */
export const SIFRE_HASH_BAYT = 32;
/** [PARAMETRE] Başarısız giriş: e-posta başına ve IP başına pencere içinde en çok deneme. */
export const GIRIS_HATA_PENCERE_MS = 10 * 60_000;
export const GIRIS_HATA_EPOSTA_SINIRI = 10;
export const GIRIS_HATA_IP_SINIRI = 20;
/** [PARAMETRE] Kayıt: IP başına günde en çok kayıt denemesi. */
export const KAYIT_PENCERE_MS = 24 * 3_600_000;
export const KAYIT_IP_GUNLUK = 5;

/** Kesilmiş + küçük harf; biçim uymazsa undefined. */
export function epostaNormalize(ham: unknown): string | undefined {
  if (typeof ham !== "string" || ham.length > EPOSTA_EN_UZUN * 2) return undefined;
  const e = ham.trim().toLowerCase();
  if (e.length === 0 || e.length > EPOSTA_EN_UZUN) return undefined;
  // Makul biçim: tek @, yerel kısım ≤64, alan adında en az bir nokta, boşluk/denetim karakteri yok.
  const m = /^([a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64})@([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+)$/.exec(e);
  if (!m) return undefined;
  const yerel = m[1]!;
  if (yerel.startsWith(".") || yerel.endsWith(".") || yerel.includes("..")) return undefined;
  return e;
}

/** Şifre uzunluk denetimi (Unicode kod noktası sayısıyla). */
export function sifreUygun(sifre: unknown): sifre is string {
  if (typeof sifre !== "string") return false;
  const n = [...sifre].length;
  return n >= SIFRE_EN_KISA && n <= SIFRE_EN_UZUN;
}

/** Dizin anahtarı: normalize e-postanın SHA-256'sı (hex). */
export async function epostaAnahtari(eposta: string): Promise<string> {
  const ozet = new Uint8Array(await crypto.subtle.digest("SHA-256", utf8(eposta)));
  return [...ozet].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function turet(sifre: string, tuz: Uint8Array<ArrayBuffer>, yineleme: number): Promise<Uint8Array> {
  const anahtar = await crypto.subtle.importKey("raw", utf8(sifre), "PBKDF2", false, ["deriveBits"]);
  const bitler = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: tuz, iterations: yineleme },
    anahtar,
    SIFRE_HASH_BAYT * 8,
  );
  return new Uint8Array(bitler);
}

/** Saklanan biçim: `v1$<yineleme>$<tuz b64url>$<hash b64url>`. */
export async function sifreHashle(sifre: string, tuz?: Uint8Array<ArrayBuffer>, yineleme = SIFRE_YINELEME): Promise<string> {
  const t = tuz ?? crypto.getRandomValues(new Uint8Array(SIFRE_TUZ_BAYT));
  return `v1$${yineleme}$${b64urlKodla(t)}$${b64urlKodla(await turet(sifre, t, yineleme))}`;
}

/** Kayıt yokken de aynı işi yapmak için sabit sahte kayıt (zamanlama farkıyla e-posta varlığı sızmasın). */
const SAHTE_KAYIT = `v1$${SIFRE_YINELEME}$${b64urlKodla(new Uint8Array(SIFRE_TUZ_BAYT))}$${b64urlKodla(new Uint8Array(SIFRE_HASH_BAYT))}`;

/** Şifreyi saklanan kayda karşı sabit sürede doğrular. `kayit` yoksa sahte kayıtla aynı iş yapılır ve false döner. */
export async function sifreDogrula(sifre: string, kayit: string | undefined): Promise<boolean> {
  const parca = (kayit ?? SAHTE_KAYIT).split("$");
  if (parca.length !== 4 || parca[0] !== "v1") return false;
  const yineleme = Number(parca[1]);
  if (!Number.isInteger(yineleme) || yineleme < 1 || yineleme > SIFRE_YINELEME) return false;
  let tuz: Uint8Array<ArrayBuffer>;
  let beklenen: Uint8Array;
  try {
    tuz = b64urlCoz(parca[2]!);
    beklenen = b64urlCoz(parca[3]!);
  } catch {
    return false;
  }
  const esit = sabitSurecliEsit(await turet(sifre, tuz, yineleme), beklenen);
  return kayit !== undefined && esit;
}

/** DunyaDO'da saklanan dizin kaydı. */
export interface EpostaKaydi {
  sub: string;
  sifre: string;
  acilis: number;
}

const ANAHTAR_ONEKI = "eposta:";

/** Yeni kayıt: anahtar boşsa yazar, doluysa eposta_kayitli. Çağıran (DunyaDO) bunu sıraya koyar; atomiktir. */
export async function epostaKayit(depo: Depo, anahtar: string, sub: string, sifre: string, simdi: number): Promise<Sonuc<{ sub: string }>> {
  if (!/^[0-9a-f]{64}$/.test(anahtar) || !/^eposta:[A-Za-z0-9_-]{16,64}$/.test(sub) || !sifre.startsWith("v1$")) {
    return hata("gecersiz_istek");
  }
  const k = ANAHTAR_ONEKI + anahtar;
  if (await depo.al<EpostaKaydi>(k)) return hata("eposta_kayitli");
  const kayit: EpostaKaydi = { sub, sifre, acilis: simdi };
  await depo.koy({ [k]: kayit });
  return basarili({ sub });
}

/** Giriş için kaydı döndürür (yalnız Worker'a; istemciye asla). Yoksa bulunamadi. */
export async function epostaBul(depo: Depo, anahtar: string): Promise<Sonuc<{ sub: string; sifre: string }>> {
  if (!/^[0-9a-f]{64}$/.test(anahtar)) return hata("gecersiz_istek");
  const k = await depo.al<EpostaKaydi>(ANAHTAR_ONEKI + anahtar);
  return k ? basarili({ sub: k.sub, sifre: k.sifre }) : hata("bulunamadi");
}
