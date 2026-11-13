// Karakter başına istekNo defteri (tekrar güvenliği). Son IST_EN_COK isteğin yanıtı aynen saklanır (aynı istekNo
// aynı yanıtı alır). Daha eskileri yalnız kimlik + zaman olarak `isk`'te ISTEK_PENCERESI_MS boyunca tutulur: o
// pencerede tekrar gelen istekNo ikinci kez etki üretmez (`istek_tekrar`). Depo şişmesin diye iz ISTEK_IZ_EN_COK ile
// sınırlıdır (aşılırsa en eski atılır). Eski kayıtlar (zamansız [no, yanıt] ikilileri) olduğu gibi okunur.

import type { Karakter } from "./tipler.ts";

/** Yanıtı aynen saklanan son istek sayısı (eski davranış). */
export const IST_EN_COK = 10;
/** [PARAMETRE] Tekrarsızlık penceresi: bu süre içinde aynı istekNo yeniden işlenmez. */
export const ISTEK_PENCERESI_MS = 24 * 60 * 60 * 1000;
/** [PARAMETRE] Pencere içindeki eski istek kimliklerinin üst sınırı (depo boyutu). */
export const ISTEK_IZ_EN_COK = 200;

type Defter = Pick<Karakter, "ist" | "isk">;

export type IstekBulgusu = { tur: "yanit"; yanit: unknown } | { tur: "eski" } | undefined;

export function istekBul(kar: Defter, no: string): IstekBulgusu {
  const o = kar.ist.find((x) => x[0] === no);
  if (o) return { tur: "yanit", yanit: o[1] };
  return kar.isk?.some((x) => x[0] === no) ? { tur: "eski" } : undefined;
}

export function istekYaz(kar: Defter, no: string, yanit: unknown, simdi: number): void {
  // simdi bilinmiyorsa (0) zaman damgası yazılmaz; çıkışta temkinli damga alır.
  kar.ist.push(simdi > 0 ? [no, yanit, simdi] : [no, yanit]);
  const iz = kar.isk ?? [];
  while (kar.ist.length > IST_EN_COK) {
    const cikan = kar.ist.shift();
    // Zamansız (eski biçim) kayıt temkinle şimdiden başlayarak pencerede tutulur.
    if (cikan) iz.push([cikan[0], typeof cikan[2] === "number" ? cikan[2] : simdi]);
  }
  const alt = simdi - ISTEK_PENCERESI_MS;
  const kalan = simdi > 0 ? iz.filter((x) => x[1] > alt) : iz;
  if (kalan.length > ISTEK_IZ_EN_COK) kalan.splice(0, kalan.length - ISTEK_IZ_EN_COK);
  if (kalan.length > 0) kar.isk = kalan;
  else delete kar.isk;
}
