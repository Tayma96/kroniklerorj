// Google kimlik belirteci (ID token, JWT RS256) doğrulama. WebCrypto ile; Workers ve Node'da aynı API.
// Kimlik = `sub`. `email_verified` gerekmez; e-posta hiç okunmaz.

import { b64urlCoz, b64urlJson, utf8 } from "./b64.ts";

export const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GECERLI_ISS = new Set(["accounts.google.com", "https://accounts.google.com"]);
const SAAT_PAYI_MS = 60_000;
const VARSAYILAN_ONBELLEK_MS = 60 * 60 * 1000;
/** Bilinmeyen `kid` görülünce JWKS'yi en fazla bu sıklıkla yeniden çeker. */
const YENIDEN_CEKME_ARALIGI_MS = 60_000;
const RS256 = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };

export type GoogleHataKodu =
  | "bicim"
  | "alg"
  | "kid"
  | "imza"
  | "iss"
  | "aud"
  | "sure"
  | "iat"
  | "sub"
  | "jwks"
  | "yapilandirma";

export class GoogleHatasi extends Error {
  readonly kod: GoogleHataKodu;
  constructor(kod: GoogleHataKodu) {
    super(`google_${kod}`);
    this.name = "GoogleHatasi";
    this.kod = kod;
  }
}

export interface GoogleKimligi {
  sub: string;
  /** Google `given_name`; ad önerisi içindir, kimlik değildir. */
  ad?: string;
}

export interface DogrulayiciAyari {
  /** Testte sahte JWKS için değiştirilir. */
  fetch?: (url: string) => Promise<Response>;
  simdi?: () => number;
}

/** `GOOGLE_CLIENT_ID` değişkenini (virgülle ayrılmış) listeye çevirir. */
export function istemciKimlikleri(deger: string | undefined): string[] {
  return (deger ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function maxAgeMs(cacheControl: string | null): number {
  const m = /(?:^|[,\s])max-age=(\d+)/i.exec(cacheControl ?? "");
  return m?.[1] ? Number(m[1]) * 1000 : VARSAYILAN_ONBELLEK_MS;
}

export class GoogleDogrulayici {
  readonly #fetch: (url: string) => Promise<Response>;
  readonly #simdi: () => number;
  #anahtarlar = new Map<string, CryptoKey>();
  #gecerlilikSonu = 0;
  #sonCekim = Number.NEGATIVE_INFINITY;

  constructor(ayar: DogrulayiciAyari = {}) {
    this.#fetch = ayar.fetch ?? ((url) => fetch(url));
    this.#simdi = ayar.simdi ?? (() => Date.now());
  }

  /** Geçerliyse kimliği döndürür; değilse `GoogleHatasi` fırlatır. */
  async dogrula(belirtec: string, kimlikler: readonly string[]): Promise<GoogleKimligi> {
    if (kimlikler.length === 0) throw new GoogleHatasi("yapilandirma");
    const parcalar = belirtec.split(".");
    if (parcalar.length !== 3) throw new GoogleHatasi("bicim");
    const [hB, yB, iB] = parcalar as [string, string, string];
    let baslik: unknown;
    let yuk: unknown;
    let imza: Uint8Array<ArrayBuffer>;
    try {
      baslik = b64urlJson(hB);
      yuk = b64urlJson(yB);
      imza = b64urlCoz(iB);
    } catch {
      throw new GoogleHatasi("bicim");
    }
    if (!nesneMi(baslik) || !nesneMi(yuk)) throw new GoogleHatasi("bicim");
    if (baslik.alg !== "RS256") throw new GoogleHatasi("alg");
    if (typeof baslik.kid !== "string") throw new GoogleHatasi("kid");

    const anahtar = await this.#anahtar(baslik.kid);
    const gecerli = await crypto.subtle.verify(RS256, anahtar, imza, utf8(`${hB}.${yB}`));
    if (!gecerli) throw new GoogleHatasi("imza");

    const simdi = this.#simdi();
    if (typeof yuk.iss !== "string" || !GECERLI_ISS.has(yuk.iss)) throw new GoogleHatasi("iss");
    const audlar: unknown[] = Array.isArray(yuk.aud) ? yuk.aud : [yuk.aud];
    if (!audlar.some((a) => typeof a === "string" && kimlikler.includes(a))) throw new GoogleHatasi("aud");
    if (typeof yuk.exp !== "number" || simdi > yuk.exp * 1000 + SAAT_PAYI_MS) throw new GoogleHatasi("sure");
    if (typeof yuk.iat !== "number" || yuk.iat * 1000 > simdi + SAAT_PAYI_MS) throw new GoogleHatasi("iat");
    if (typeof yuk.sub !== "string" || yuk.sub.length === 0 || yuk.sub.length > 255) {
      throw new GoogleHatasi("sub");
    }
    const ad = typeof yuk.given_name === "string" ? yuk.given_name.trim().slice(0, 64) : "";
    return ad ? { sub: yuk.sub, ad } : { sub: yuk.sub };
  }

  async #anahtar(kid: string): Promise<CryptoKey> {
    if (this.#simdi() >= this.#gecerlilikSonu) {
      try {
        await this.#cek();
      } catch (e) {
        // Google'a ulaşılamazsa eski anahtarlarla devam edilir; hiç yoksa hata.
        if (this.#anahtarlar.size === 0) throw e;
      }
    }
    let anahtar = this.#anahtarlar.get(kid);
    if (!anahtar && this.#simdi() - this.#sonCekim >= YENIDEN_CEKME_ARALIGI_MS) {
      await this.#cek();
      anahtar = this.#anahtarlar.get(kid);
    }
    if (!anahtar) throw new GoogleHatasi("kid");
    return anahtar;
  }

  // Bekleyen çekim istekler arasında paylaşılmaz: Workers bir isteğin G/Ç sözünü başka isteğe taşımaz.
  // Yalnız çözülmüş anahtarlar (CryptoKey) önbellekte kalır.
  async #cek(): Promise<void> {
    let yanit: Response;
    let govde: unknown;
    try {
      yanit = await this.#fetch(GOOGLE_JWKS_URL);
      if (!yanit.ok) throw new Error(`jwks ${yanit.status}`);
      govde = await yanit.json();
    } catch {
      throw new GoogleHatasi("jwks");
    }
    const keys = nesneMi(govde) ? govde.keys : undefined;
    if (!Array.isArray(keys)) throw new GoogleHatasi("jwks");
    const yeni = new Map<string, CryptoKey>();
    for (const jwk of keys as unknown[]) {
      if (!nesneMi(jwk) || jwk.kty !== "RSA") continue;
      const { kid, n, e } = jwk;
      if (typeof kid !== "string" || typeof n !== "string" || typeof e !== "string") continue;
      try {
        const anahtar = await crypto.subtle.importKey(
          "jwk",
          { kty: "RSA", n, e, alg: "RS256", ext: true },
          RS256,
          false,
          ["verify"],
        );
        yeni.set(kid, anahtar);
      } catch {
        // Bozuk anahtar atlanır.
      }
    }
    if (yeni.size === 0) throw new GoogleHatasi("jwks");
    const simdi = this.#simdi();
    this.#anahtarlar = yeni;
    this.#sonCekim = simdi;
    this.#gecerlilikSonu = simdi + maxAgeMs(yanit.headers.get("cache-control"));
  }
}
