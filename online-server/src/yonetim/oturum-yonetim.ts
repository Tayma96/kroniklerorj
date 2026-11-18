// Yönetici oturumu: oturum sürümü ("her yerden çık") ve kurucu anahtarıyla giriş (Google girişi kurulana dek).
// - Oturum sürümü yönetici (e-posta) başınadır; belirteç sürümü taşır, YonetimDO her istekte karşılaştırır.
// - Kurucu anahtarı: IP başına ve genel başarısız deneme sınırı (yonetim-do.ts, bellekte), sabit sürede karşılaştırma
//   (kimlik.ts `anahtarEsit`), her deneme işlem kaydına girer (başarısızlar ayrıca günlük yetkisiz giriş sayacına).

import { istekNoCoz } from "../mantik.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { anahtarEsit, KURUCU_ANAHTAR_KIMLIGI } from "./kimlik.ts";
import { anahtarAcik, kayitHazirla, reddet, tekrar, yaz, YETKISIZ_GIRIS, type Oturum, type YonetimBaglami } from "./islem.ts";
import { trGunu } from "./sikayet.ts";

const SURUM = "ySurum:"; // + e-posta → oturum sürümü (yoksa 0)

export async function oturumSurumuOku(b: YonetimBaglami, eposta: string): Promise<number> {
  const d = await b.depo.al<number>(SURUM + eposta);
  return typeof d === "number" && Number.isSafeInteger(d) && d >= 0 ? d : 0;
}

/** POST /yonetim/oturumlari-kapat {istekNo}: çağıranın bütün yönetici oturumları (bu dahil) düşer. */
export async function oturumlariKapat(o: Oturum, govde: unknown): Promise<Sonuc<unknown>> {
  const g = typeof govde === "object" && govde !== null ? (govde as Record<string, unknown>) : {};
  const no = istekNoCoz(g);
  if (!no.ok) return reddet(o, "oturumKapat", no.hata);
  const onceki = await tekrar(o, no.deger);
  if (onceki) return onceki;
  const yeni = (await oturumSurumuOku(o.b, o.y.eposta)) + 1;
  const sonuc = basarili({ kapatildi: true, oturumSurumu: yeni });
  await yaz(o, no.deger, "oturumKapat", { ayrinti: { oturumSurumu: yeni } }, { [SURUM + o.y.eposta]: yeni }, sonuc);
  return sonuc;
}

/**
 * Worker → YonetimDO: kurucu anahtarıyla giriş. Anahtar tanımsızsa yol kapalıdır (`bulunamadi`). Sınır doluysa
 * `hiz_siniri` (karşılaştırma hiç yapılmaz). Yanlış anahtar `yetki_yok`. Doğruysa kurucu rolü ve oturum sürümü döner;
 * Worker belirteci KURUCU_ANAHTAR_KIMLIGI ile üretir.
 */
export async function anahtarGiris(b: YonetimBaglami, ipHam: unknown, verilen: unknown): Promise<Sonuc<{ rol: "kurucu"; oturumSurumu: number }>> {
  if (!anahtarAcik(b)) return hata("bulunamadi");
  const ip = typeof ipHam === "string" && ipHam.length > 0 ? ipHam.slice(0, 64) : "bilinmiyor";
  const kimlik = { ...KURUCU_ANAHTAR_KIMLIGI, hesap: "" };
  const o: Oturum = { b, y: kimlik, rol: undefined, uc: "anahtarGiris", ozet: "" };
  if (b.anahtarSiniri && !b.anahtarSiniri.izin(ip)) return hata("hiz_siniri");
  const dogru = typeof verilen === "string" && verilen.length > 0 && verilen.length <= 512 && (await anahtarEsit(verilen, b.kurucuAnahtari!));
  if (!dogru) {
    b.anahtarSiniri?.hata(ip);
    const gun = YETKISIZ_GIRIS + trGunu(b.simdi);
    await b.depo.koy({ [gun]: ((await b.depo.al<number>(gun)) ?? 0) + 1, ...(await kayitHazirla(o, "anahtarGiris", "yetki_yok", { ayrinti: { ip } })) });
    return hata("yetki_yok");
  }
  const kurucu: Oturum = { ...o, rol: "kurucu" };
  await b.depo.koy(await kayitHazirla(kurucu, "anahtarGiris", "tamam", { ayrinti: { ip } }));
  return basarili({ rol: "kurucu", oturumSurumu: await oturumSurumuOku(b, kimlik.eposta) });
}
