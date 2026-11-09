// Masa başının çıkarmaları Y1'de yalnız eklenen ayrı bir kayda düşer (kötüye kullanım denetimi için).
// Yönetici paneline gösterimi sonraki iştir; kayıt şimdiden tutulur. İçerik: kimlikler, masa, olay numarası, zaman.

import type { Depo } from "../depo.ts";
import { basarili, type Sonuc } from "../tipler.ts";

export const MASA_ATMA_SAYAC = "masaatma#";
export const MASA_ATMA = "masaatma:"; // + 10 haneli sıra → MasaAtmaKaydi

export interface MasaAtmaKaydi {
  masa: string;
  kim: string;
  hedef: string;
  olay: number;
  zaman: number;
}

export async function masaAtmaKaydet(depo: Depo, k: MasaAtmaKaydi): Promise<Sonuc<{ no: number }>> {
  const no = ((await depo.al<number>(MASA_ATMA_SAYAC)) ?? 0) + 1;
  const kayit: MasaAtmaKaydi = { masa: String(k.masa).slice(0, 128), kim: k.kim, hedef: k.hedef, olay: k.olay, zaman: k.zaman };
  await depo.koy({ [MASA_ATMA_SAYAC]: no, [MASA_ATMA + String(no).padStart(10, "0")]: kayit });
  return basarili({ no });
}
