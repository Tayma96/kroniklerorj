// Test için sahte mağaza doğrulayıcısı (üretimde kullanılamaz: yalnız HesapDO kurucusuna testte verilir).
// Makbuz biçimi: "sahte|<islemKimligi>|<magazaUrunKimligi>|<durum>[|test]".

import { basarili, hata } from "../src/tipler.ts";
import type { MakbuzBilgisi, MakbuzDogrulayici, MakbuzDurumu } from "../src/debdebe/makbuz.ts";

export function sahteDogrulayici(): MakbuzDogrulayici & { cagri: number; onaylanan: string[] } {
  const d = {
    cagri: 0,
    onaylanan: [] as string[],
    async dogrula(magaza: "google" | "apple", makbuz: string, _beklenen: string) {
      d.cagri++;
      const p = makbuz.split("|");
      if (p[0] !== "sahte" || p.length < 4) return hata("makbuz_gecersiz");
      const b: MakbuzBilgisi = { magaza, islemKimligi: p[1]!, urunKimligi: p[2]!, durum: p[3] as MakbuzDurumu, zaman: 0, ...(p[4] === "test" ? { test: true } : {}) };
      return basarili(b);
    },
    async onayla(_m: "google" | "apple", makbuz: string) {
      d.onaylanan.push(makbuz);
    },
  };
  return d;
}

export const makbuz = (islem: string, urun: string, durum = "odendi") => `sahte|${islem}|debdebe_${urun}|${durum}`;
