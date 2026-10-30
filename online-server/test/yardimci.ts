// Test yardımcıları: RSA anahtarı + JWT imzalama, sahte JWKS, sahte DO depolaması ve ad alanı.

import { b64urlKodla, jsonB64url, utf8 } from "../src/b64.ts";

export interface TestAnahtari {
  kid: string;
  ozel: CryptoKey;
  jwk: JsonWebKey;
}

export async function rsaAnahtari(kid: string): Promise<TestAnahtari> {
  const cift = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const jwk = await crypto.subtle.exportKey("jwk", cift.publicKey);
  return { kid, ozel: cift.privateKey, jwk: { ...jwk, kid, use: "sig", alg: "RS256" } };
}

export async function jwtImzala(
  anahtar: TestAnahtari,
  yuk: Record<string, unknown>,
  baslik: Record<string, unknown> = {},
): Promise<string> {
  const h = jsonB64url({ alg: "RS256", typ: "JWT", kid: anahtar.kid, ...baslik });
  const p = jsonB64url(yuk);
  const imza = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", anahtar.ozel, utf8(`${h}.${p}`));
  return `${h}.${p}.${b64urlKodla(imza)}`;
}

export const ISTEMCI = "istemci-a.apps.googleusercontent.com";

export function googleYuku(simdi: number, ek: Record<string, unknown> = {}): Record<string, unknown> {
  const sn = Math.floor(simdi / 1000);
  return {
    iss: "https://accounts.google.com",
    aud: ISTEMCI,
    sub: "110000000000000000001",
    iat: sn,
    exp: sn + 3600,
    given_name: "Ayşe",
    ...ek,
  };
}

/** Google sertifika ucunun yerine geçer; çağrıları sayar. */
export function sahteJwks(anahtarlar: TestAnahtari[], maxAge = 3600) {
  const cagrilar: string[] = [];
  let bozuk = false;
  const getir = async (girdi: string | Request): Promise<Response> => {
    cagrilar.push(typeof girdi === "string" ? girdi : girdi.url);
    if (bozuk) return new Response("hata", { status: 500 });
    return new Response(JSON.stringify({ keys: anahtarlar.map((a) => a.jwk) }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": `public, max-age=${maxAge}, must-revalidate, no-transform`,
      },
    });
  };
  return {
    getir,
    cagrilar,
    boz() {
      bozuk = true;
    },
  };
}

function sahteDepolama(): DurableObjectStorage {
  const veri = new Map<string, unknown>();
  const depolama = {
    async get(k: string | string[]) {
      if (!Array.isArray(k)) return structuredClone(veri.get(k));
      const sonuc = new Map<string, unknown>();
      for (const a of k) if (veri.has(a)) sonuc.set(a, structuredClone(veri.get(a)));
      return sonuc;
    },
    async put(k: string | Record<string, unknown>, d?: unknown) {
      if (typeof k === "string") veri.set(k, structuredClone(d));
      else for (const [a, v] of Object.entries(k)) veri.set(a, structuredClone(v));
    },
    async delete(k: string) {
      return veri.delete(k);
    },
  };
  return depolama as DurableObjectStorage;
}

/** Gerçek DO sınıflarını bellekte çalıştıran ad alanı. Kimlikler "do-" önekiyle opaktır. */
export function sahteAdAlani(
  yap: (ctx: DurableObjectState) => { fetch(istek: Request): Promise<Response> },
): DurableObjectNamespace {
  const ornekler = new Map<string, { fetch(istek: Request): Promise<Response> }>();
  const kimlik = (s: string): DurableObjectId => ({ toString: () => s, equals: (o) => o.toString() === s });
  return {
    idFromName: (ad) => kimlik(`do-${b64urlKodla(utf8(ad))}`),
    idFromString: (s) => {
      if (!s.startsWith("do-")) throw new TypeError("Invalid Durable Object ID");
      return kimlik(s);
    },
    get: (id) => {
      const anahtar = id.toString();
      let ornek = ornekler.get(anahtar);
      if (!ornek) {
        ornek = yap({ id, storage: sahteDepolama() });
        ornekler.set(anahtar, ornek);
      }
      const o = ornek;
      return { id, fetch: (girdi, init) => o.fetch(typeof girdi === "string" ? new Request(girdi, init) : girdi) };
    },
  };
}
