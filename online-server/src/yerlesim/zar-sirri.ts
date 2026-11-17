// Sırlı zar tohumu (denge denetimi 17 Kasım): kalite ve efsanevi zarı yalnız oyuncu + ay + tarif gibi bilinen
// parçalardan tohumlanırsa istemci sonucu önceden hesaplayıp en iyi ayı/malı seçebilir. Tohum, Worker ortamındaki
// `ZAR_SIRRI` sırrıyla HMAC-SHA256'lanır; sonuç yine deterministiktir (aynı sır + aynı parçalar = aynı zar), testler
// tekrarlanabilir kalır. Sır yoksa (yerel geliştirme, testler) sabit bir yedek kullanılır ve bir kez uyarı yazılır;
// sırrın değeri hiçbir yere yazılmaz. Web Crypto eşzamansız olduğundan küçük, eşzamanlı bir SHA-256 buradadır.

import { mulberry32, type Zar } from "./rastgele.ts";

/** Sır yokken kullanılan yedek (gizli değildir; yalnız yerel ve test içindir). */
const YEDEK = "kronikler-yerel-zar-yedegi";
/** [PARAMETRE] Sırrın en az uzunluğu (daha kısası yok sayılır, yedek kullanılır). */
export const ZAR_SIRRI_EN_AZ = 16;

let anahtar: Uint8Array = new TextEncoder().encode(YEDEK);
let uyarildi = false;

/** Ortamdan gelen sırrı kurar (YerlesimDO kurucusu). Sır yoksa yedek kalır ve bir kez uyarılır. */
export function zarSirriAyarla(sir: string | undefined): void {
  if (typeof sir === "string" && sir.length >= ZAR_SIRRI_EN_AZ) {
    anahtar = new TextEncoder().encode(sir);
    return;
  }
  anahtar = new TextEncoder().encode(YEDEK);
  if (!uyarildi) {
    uyarildi = true;
    console.warn("ZAR_SIRRI tanımlı değil: zar tohumu yerel yedekle üretiliyor (yalnız yerel/test için uygundur).");
  }
}

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
  0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
  0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** SHA-256 (eşzamanlı, küçük girdiler için). */
export function sha256(veri: Uint8Array): Uint8Array {
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const uzunluk = veri.length;
  const blokSayisi = Math.ceil((uzunluk + 9) / 64);
  const m = new Uint8Array(blokSayisi * 64);
  m.set(veri);
  m[uzunluk] = 0x80;
  const bit = uzunluk * 8;
  const dv = new DataView(m.buffer);
  dv.setUint32(m.length - 8, Math.floor(bit / 2 ** 32));
  dv.setUint32(m.length - 4, bit >>> 0);
  const w = new Uint32Array(64);
  for (let b = 0; b < blokSayisi; b++) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(b * 64 + i * 4);
    for (let i = 16; i < 64; i++) {
      const x = w[i - 15]!;
      const y = w[i - 2]!;
      const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
      const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }
    let [a, bb, c, d, e, f, g, hh] = [h[0]!, h[1]!, h[2]!, h[3]!, h[4]!, h[5]!, h[6]!, h[7]!];
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i]! + w[i]!) >>> 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & bb) ^ (a & c) ^ (bb & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = bb;
      bb = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0]! + a) >>> 0;
    h[1] = (h[1]! + bb) >>> 0;
    h[2] = (h[2]! + c) >>> 0;
    h[3] = (h[3]! + d) >>> 0;
    h[4] = (h[4]! + e) >>> 0;
    h[5] = (h[5]! + f) >>> 0;
    h[6] = (h[6]! + g) >>> 0;
    h[7] = (h[7]! + hh) >>> 0;
  }
  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) ov.setUint32(i * 4, h[i]!);
  return out;
}

/** HMAC-SHA256 (RFC 2104). */
export function hmacSha256(anahtarBaytlari: Uint8Array, ileti: Uint8Array): Uint8Array {
  let k = anahtarBaytlari.length > 64 ? sha256(anahtarBaytlari) : anahtarBaytlari;
  const kk = new Uint8Array(64);
  kk.set(k);
  k = kk;
  const ic = new Uint8Array(64 + ileti.length);
  const dis = new Uint8Array(64 + 32);
  for (let i = 0; i < 64; i++) {
    ic[i] = k[i]! ^ 0x36;
    dis[i] = k[i]! ^ 0x5c;
  }
  ic.set(ileti, 64);
  dis.set(sha256(ic), 64);
  return sha256(dis);
}

/** Sırlı tohum: parçalar ":" ile birleşir, sırla HMAC'lenir, ilk 4 bayt mulberry32 tohumudur. */
export function sirliTohum(...parcalar: (string | number)[]): number {
  const d = hmacSha256(anahtar, new TextEncoder().encode(parcalar.join(":")));
  return ((d[0]! << 24) | (d[1]! << 16) | (d[2]! << 8) | d[3]!) >>> 0;
}

/** Sırlı, deterministik zar. */
export function sirliZar(...parcalar: (string | number)[]): Zar {
  return mulberry32(sirliTohum(...parcalar));
}
