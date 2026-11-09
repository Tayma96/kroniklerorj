// İkram (Berkay, spec §6.1): masadan NPC hancının sabit menüsünden akçeyle sipariş, masadaki birine gönderilir.
// Ürün handan alınır; akçe dünyadan çıkar (batak). Masa para tutmaz: ödeme YerlesimDO'da (yerlesim-kopru.ts).
// Etki: alanın verene teveccühü küçük artar (YerlesimDO, teveccuhEkle) ve masaya anons düşer (katılım listesi yok,
// saklanmaz). Armağan (envanterden) ve Debdebe armağanı aynı anons biçimini kullanacak; bu fazın dışında.

import { istekNoCoz } from "../mantik.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { hesapIdCoz } from "../yonetim/yaptirim.ts";
import { HAN_MASA_EN_COK, masaNoCoz } from "./kurallar.ts";

/** [PARAMETRE] NPC hancının sabit menüsü (akçe). Bilerek pahalı: başlangıç parası 5 akçe, alet tabanı 14. */
export const IKRAM_MENUSU = {
  ekmek: { fiyat: 2 },
  serbet: { fiyat: 3 },
  yemek: { fiyat: 6 },
  gulSuyu: { fiyat: 10 },
} as const satisfies Record<string, { fiyat: number }>;
export type IkramId = keyof typeof IKRAM_MENUSU;

/** [PARAMETRE] Oyuncu başına günlük (TR günü) ikram tavanı. Teveccüh artışının çift başına tek sefer izi YerlesimDO'dadır. */
export const IKRAM_GUNLUK = 10;

export interface IkramGirdisi {
  masa: number;
  hedef: string;
  ikram: IkramId;
  istekNo: string;
}

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** POST /v1/han/ikram {masa, hedef, ikram, istekNo}. Fiyat istemciden alınmaz. */
export function ikramGirdisiCoz(govde: unknown): Sonuc<IkramGirdisi> {
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  const istekNo = istekNoCoz(govde);
  if (!istekNo.ok) return istekNo;
  const masa = masaNoCoz(govde.masa, HAN_MASA_EN_COK);
  if (masa === undefined) return hata("masa_gecersiz");
  const hedef = hesapIdCoz(govde.hedef);
  if (!hedef) return hata("kisi_yok");
  const ikram = govde.ikram;
  if (typeof ikram !== "string" || !Object.hasOwn(IKRAM_MENUSU, ikram)) return hata("ikram_gecersiz");
  return basarili({ masa, hedef, ikram: ikram as IkramId, istekNo: istekNo.deger });
}

/**
 * YerlesimDO tarafında kullanılacak saf ödeme kuralı: verenin parası fiyatı karşılamalı; akçe dünyadan çıkar.
 * Dönen `batak` toplam akçe değişmezi denetiminde "hancı menüsü" çıkışı olarak sayılır.
 */
export function ikramOdemesi(para: number, ikram: IkramId): Sonuc<{ para: number; batak: number }> {
  const fiyat = IKRAM_MENUSU[ikram].fiyat;
  if (!Number.isFinite(para) || para < fiyat) return hata("para_yok");
  return basarili({ para: para - fiyat, batak: fiyat });
}
