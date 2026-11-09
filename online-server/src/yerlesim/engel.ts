// Engelleme (Faz 3a, §13.5 taciz sınırı): engellenen, engelleyene teklif ve dostluk isteği gönderemez; aralarındaki
// açık teklifler ve dostluk isteği düşer, dostluk biter. Engel tek yönlü kaydedilir, iki yönlü uygulanır.
// `engelliMi` han masası (sohbet) gibi sonraki sistemlerin de tek kapısıdır.

import { basarili, hata, type Sonuc } from "../tipler.ts";
import { ciftSirala, type Toplum } from "./toplum.ts";

/** [PARAMETRE] Bir oyuncunun engel listesi en çok bu kadar kişi tutar. */
export const ENGEL_EN_COK = 100;

/** a ile b arasında (hangi yönde olursa olsun) engel var mı. Toplum yoksa engel yoktur. */
export function engelliMi(t: Toplum | undefined, a: string, b: string): boolean {
  if (!t) return false;
  return (t.eg[a]?.includes(b) ?? false) || (t.eg[b]?.includes(a) ?? false);
}

/** `kim`in engellediği kişiler. */
export function engelListesi(t: Toplum | undefined, kim: string): readonly string[] {
  return t?.eg[kim] ?? [];
}

/** Engeller (tekrar güvenli: zaten engelliyse değişmez). Dostluk bağı ve istek silinir. */
export function engelle(t: Toplum, kim: string, hedef: string): Sonuc<string[]> {
  if (kim === hedef) return hata("kendine");
  const liste = (t.eg[kim] ??= []);
  if (!liste.includes(hedef)) {
    if (liste.length >= ENGEL_EN_COK) return hata("tavan_doldu");
    liste.push(hedef);
  }
  const [a, b] = ciftSirala(kim, hedef);
  t.ob = t.ob.filter((x) => !(x.a === a && x.b === b));
  return basarili(liste);
}

export function engelKaldir(t: Toplum, kim: string, hedef: string): string[] {
  const liste = t.eg[kim];
  if (!liste) return [];
  const kalan = liste.filter((x) => x !== hedef);
  if (kalan.length) t.eg[kim] = kalan;
  else delete t.eg[kim];
  return kalan;
}
