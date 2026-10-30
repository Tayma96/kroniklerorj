// base64url ve UTF-8 yardımcıları (Workers ve Node'da ortak API'lerle).

const kodlayici = new TextEncoder();
const cozucu = new TextDecoder("utf-8", { fatal: true });

export function utf8(metin: string): Uint8Array<ArrayBuffer> {
  return kodlayici.encode(metin);
}

export function b64urlKodla(veri: ArrayBuffer | Uint8Array): string {
  const baytlar = veri instanceof Uint8Array ? veri : new Uint8Array(veri);
  let ikili = "";
  for (let i = 0; i < baytlar.length; i += 0x8000) {
    ikili += String.fromCharCode(...baytlar.subarray(i, i + 0x8000));
  }
  return btoa(ikili).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Geçersiz girdide hata fırlatır. */
export function b64urlCoz(metin: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]*$/.test(metin) || metin.length % 4 === 1) throw new Error("b64url");
  const dolgu = "=".repeat((4 - (metin.length % 4)) % 4);
  const ikili = atob(metin.replace(/-/g, "+").replace(/_/g, "/") + dolgu);
  const sonuc = new Uint8Array(ikili.length);
  for (let i = 0; i < ikili.length; i++) sonuc[i] = ikili.charCodeAt(i);
  return sonuc;
}

export function jsonB64url(deger: unknown): string {
  return b64urlKodla(utf8(JSON.stringify(deger)));
}

/** Geçersiz base64url, UTF-8 ya da JSON'da hata fırlatır. */
export function b64urlJson(metin: string): unknown {
  return JSON.parse(cozucu.decode(b64urlCoz(metin)));
}
