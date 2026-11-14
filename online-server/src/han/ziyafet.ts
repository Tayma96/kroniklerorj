// H7 akçeyle ziyafet (araştırma §5.3, ONLINE_DURUM §3 H7): masada oturan oyuncu NPC hancıdan bütün masaya ziyafet
// ısmarlar. Bedel sunucuda hesaplanır (oturan sayısıyla ölçeklenir, tavanlı); masa para tutmaz, ödeme YerlesimDO'da
// ikramla aynı yoldan yapılır (NPC hanında akçe dünyadan çıkar, oyuncu hanında işletme kasasına gider). Etki: cömertlik
// namı (aylık nam tavanı içinde, oyuncu başına mevsimde bir), masadakilere tanıklık olayı, masaya anons.
// Farm süzgeci: ziyafet veren dışında, hesap kümesi dışından en az ZIYAFET_EN_AZ_KONUK oturan şarttır (boş masada ya
// da kendi hanesine ziyafet verip nam kasılmaz). Debdebe "ziyafet afişi" ayrı bir görünüştür ve nam vermez.

import { istekNoCoz } from "../mantik.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { HAN_MASA_EN_COK, masaNoCoz } from "./kurallar.ts";

/** [PARAMETRE] Bedel = taban + konuk başına × konuk sayısı (ziyafet veren hariç oturanlar), en çok tavan (akçe). */
export const ZIYAFET_TABAN = 4;
export const ZIYAFET_KONUK_BASI = 2;
export const ZIYAFET_TAVAN = 14;
/** [PARAMETRE] Ziyafet veren dışında hesap kümesi dışından en az oturan. */
export const ZIYAFET_EN_AZ_KONUK = 2;
/** [PARAMETRE] Cömertlik namı (NAM_AYLIK_TAVAN ayrıca uygulanır; oyuncu başına mevsimde bir). */
export const ZIYAFET_NAM = 1;
/** [PARAMETRE] Oyuncu başına günlük (TR günü) ziyafet tavanı. */
export const ZIYAFET_GUNLUK = 3;

export function ziyafetBedeli(konuk: number): number {
  return Math.min(ZIYAFET_TAVAN, ZIYAFET_TABAN + ZIYAFET_KONUK_BASI * Math.max(0, konuk));
}

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** POST /v1/han/ziyafet {masa, istekNo}. Bedel istemciden alınmaz. */
export function ziyafetGirdisiCoz(govde: unknown): Sonuc<{ masa: number; istekNo: string }> {
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  const istekNo = istekNoCoz(govde);
  if (!istekNo.ok) return istekNo;
  const masa = masaNoCoz(govde.masa, HAN_MASA_EN_COK);
  if (masa === undefined) return hata("masa_gecersiz");
  return basarili({ masa, istekNo: istekNo.deger });
}
