// Sunucu oturum belirteci: "base64url(yük).base64url(HMAC-SHA256)". Yük {h: hesapId, s: son geçerlilik ms}.
// Anahtar Worker sırrı OTURUM_ANAHTARI'dır; koda ya da depoya yazılmaz.

import { b64urlCoz, b64urlJson, b64urlKodla, jsonB64url, utf8 } from "./b64.ts";

export const OTURUM_SURESI_MS = 30 * 24 * 60 * 60 * 1000;
const HMAC = { name: "HMAC", hash: "SHA-256" };
const BICIM = /^[A-Za-z0-9_-]{1,2048}\.[A-Za-z0-9_-]{43}$/;

export type OturumHatasi = "oturum_gecersiz" | "oturum_suresi_doldu";
export type OturumSonucu = { ok: true; hesapId: string; son: number } | { ok: false; hata: OturumHatasi };

// Çözülmüş anahtar önbellekte tutulur (bekleyen söz istekler arasında paylaşılmaz).
let onbellek: { gizli: string; anahtar: CryptoKey } | undefined;

async function anahtarAl(gizli: string): Promise<CryptoKey> {
  if (onbellek?.gizli === gizli) return onbellek.anahtar;
  const anahtar = await crypto.subtle.importKey("raw", utf8(gizli), HMAC, false, ["sign"]);
  onbellek = { gizli, anahtar };
  return anahtar;
}

async function imzala(metin: string, gizli: string): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await crypto.subtle.sign("HMAC", await anahtarAl(gizli), utf8(metin)));
}

/** Uzunluk eşitse içerikten bağımsız sürede karşılaştırır. */
export function sabitSurecliEsit(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let fark = 0;
  for (let i = 0; i < a.length; i++) fark |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return fark === 0;
}

export async function oturumOlustur(
  hesapId: string,
  gizli: string,
  simdi: number,
  sure: number = OTURUM_SURESI_MS,
): Promise<string> {
  const yuk = jsonB64url({ h: hesapId, s: simdi + sure });
  return `${yuk}.${b64urlKodla(await imzala(yuk, gizli))}`;
}

export async function oturumDogrula(belirtec: string, gizli: string, simdi: number): Promise<OturumSonucu> {
  const gecersiz: OturumSonucu = { ok: false, hata: "oturum_gecersiz" };
  if (!BICIM.test(belirtec)) return gecersiz;
  const nokta = belirtec.indexOf(".");
  const yukB = belirtec.slice(0, nokta);
  let verilen: Uint8Array;
  try {
    verilen = b64urlCoz(belirtec.slice(nokta + 1));
  } catch {
    return gecersiz;
  }
  if (!sabitSurecliEsit(verilen, await imzala(yukB, gizli))) return gecersiz;
  let yuk: unknown;
  try {
    yuk = b64urlJson(yukB);
  } catch {
    return gecersiz;
  }
  if (typeof yuk !== "object" || yuk === null) return gecersiz;
  const { h, s } = yuk as Record<string, unknown>;
  if (typeof h !== "string" || h.length === 0 || typeof s !== "number" || !Number.isFinite(s)) return gecersiz;
  if (s <= simdi) return { ok: false, hata: "oturum_suresi_doldu" };
  return { ok: true, hesapId: h, son: s };
}
