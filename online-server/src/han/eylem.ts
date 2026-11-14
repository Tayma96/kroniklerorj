// Butonlu masa eylemleri (GDD §16): yemin, sözleşme, ittifak, ihbar, meydan okuma (+ sözleşme/ittifak onayı).
// Sunucu doğrular, olay üretir ve o anda koltukta oturanları olayın katılım listesine yazar. Sohbet içeriği yazılmaz.
// Masa para tutmaz: olayda ve masa deposunda akçe alanı yoktur.
//
// Oyun etkisi (H5): olay yazıldıktan sonra HesapDO olayı YerlesimDO'ya `hanOlayi` iletisiyle (anahtar: masa adı + olay
// no, tekrar güvenli; teslim edilemezse HesapDO kuyruğunda bekler) gönderir. Kurallar src/yerlesim/han-olay.ts'dedir:
// katılım listesine tanıklık olayı, han NPC'lerine söylenti tohumu, yemin/kabul/ihbar için küçük ve tavanlı etkiler.
// Kalan kancalar: düello (`meydanOku` sonucu), sözleşmenin yürürlüğü ve dava (Faz 12/13).

import type { Depo } from "../depo.ts";
import { istekNoCoz } from "../mantik.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { hesapIdCoz } from "../yonetim/yaptirim.ts";
import type { EngelSorgusu } from "./engel-kopru.ts";
import { sohbetMaskele } from "./filtre.ts";
import { ATMA_SURE_MS, HAN_MASA_EN_COK, masaNoCoz, SART_EN_UZUN, surer, tekSatir } from "./kurallar.ts";
import { HAN_EYLEMLERI, type EylemGirdisi, type HanEylemi, type MasaAyari, type MasaOlayi } from "./tipler.ts";

/** Hedef zorunlu mu, hedef koltukta olmalı mı, şart metni zorunlu mu. */
export const EYLEM_KURALLARI: Readonly<Record<Exclude<HanEylemi, "kabul">, { hedef: "zorunlu" | "secimli"; oturan: boolean; sart: boolean }>> = {
  yemin: { hedef: "secimli", oturan: true, sart: true },
  sozlesme: { hedef: "zorunlu", oturan: true, sart: true },
  ittifak: { hedef: "zorunlu", oturan: true, sart: false },
  // İhbar edilen çoğu zaman masada değildir; kimliğin varlığı söylenti fazında doğrulanacak.
  ihbar: { hedef: "zorunlu", oturan: false, sart: false },
  meydanOku: { hedef: "zorunlu", oturan: true, sart: false },
};

/** Karşı tarafın onayını bekleyen eylemler (H6: meydan okuma da teklif olur; kabulü düellodur). */
const ONAYLI = new Set<string>(["sozlesme", "ittifak", "meydanOku"]);

// Depo anahtarları (MasaDO)
export const OLAY_SAYAC = "olay#";
export const OLAY = "olay:"; // + 8 haneli numara → MasaOlayi
export const ISTEK = "istek:"; // + hesap + ":" + istekNo → olay numarası
export const ATMA = "atma:"; // + hesap → dönüş yasağının bitişi (ms)

export function olayAnahtari(no: number): string {
  return OLAY + String(no).padStart(8, "0");
}

/** H6: meydan okuma teklifinde iki tarafın oturma anları (teklif, ikisi de o oturuşta oturuyorken kabul edilebilir). */
export function oturusAnahtari(no: number): string {
  return olayAnahtari(no) + ":oturus";
}

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** POST /v1/han/eylem gövdesi. */
export function eylemGirdisiCoz(govde: unknown): Sonuc<EylemGirdisi> {
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  const istekNo = istekNoCoz(govde);
  if (!istekNo.ok) return istekNo;
  const masa = masaNoCoz(govde.masa, HAN_MASA_EN_COK);
  if (masa === undefined) return hata("masa_gecersiz");
  const tur = govde.tur;
  if (typeof tur !== "string" || !(HAN_EYLEMLERI as readonly string[]).includes(tur)) return hata("eylem_gecersiz");
  const girdi: EylemGirdisi = { masa, tur: tur as HanEylemi, istekNo: istekNo.deger };
  if (govde.hedef !== undefined && govde.hedef !== null) {
    const hedef = hesapIdCoz(govde.hedef);
    if (!hedef) return hata("kisi_yok");
    girdi.hedef = hedef;
  }
  if (govde.olay !== undefined && govde.olay !== null) {
    if (typeof govde.olay !== "number" || !Number.isInteger(govde.olay) || govde.olay < 1) return hata("olay_yok");
    girdi.olay = govde.olay;
  }
  if (govde.sart !== undefined && govde.sart !== null) {
    if (typeof govde.sart !== "string" || govde.sart.length > SART_EN_UZUN * 8) return hata("metin_gecersiz");
    const sart = tekSatir(govde.sart);
    const n = [...sart].length;
    if (n > SART_EN_UZUN) return hata("metin_gecersiz");
    // H3: şart metnindeki küfür sözcükleri maskelenir (eylem reddedilmez).
    if (n > 0) girdi.sart = sohbetMaskele(sart);
  }
  return basarili(girdi);
}

export interface EylemBaglami {
  masa: string;
  /** `o`: oturma anı (H6 meydan okuma teklifinin geçerliliği). */
  oturanlar: readonly { hesap: string; koltuk: number; o?: number | null }[];
  /** Eylemi yapanın bağlantısındaki susturma bilgisi. */
  susturma?: { bitis: number | null };
  ayar: MasaAyari;
  simdi: number;
  engelliMi: EngelSorgusu;
}

async function sonrakiNo(depo: Depo): Promise<number> {
  return ((await depo.al<number>(OLAY_SAYAC)) ?? 0) + 1;
}

/**
 * Eylemi doğrular ve olayı yazar. Aynı hesap + istekNo ikinci kez gelirse aynı olay döner (`yeni: false`),
 * yeni olay ve sayaç artışı olmaz.
 */
export async function eylemUygula(
  depo: Depo,
  kim: string,
  girdi: EylemGirdisi,
  b: EylemBaglami,
): Promise<Sonuc<{ olay: MasaOlayi; yeni: boolean }>> {
  const istekAnahtari = `${ISTEK}${kim}:${girdi.istekNo}`;
  const onceki = await depo.al<number>(istekAnahtari);
  if (onceki !== undefined) {
    const olay = await depo.al<MasaOlayi>(olayAnahtari(onceki));
    if (olay) return basarili({ olay, yeni: false });
  }
  const oturan = new Set(b.oturanlar.map((o) => o.hesap));
  if (!oturan.has(kim)) return hata("oturmuyor");
  if (surer(b.susturma, b.simdi)) return { ok: false, hata: "susturuldu", bitis: b.susturma.bitis };
  const katilim = [...b.oturanlar].sort((x, y) => x.koltuk - y.koltuk).map((o) => o.hesap);
  const no = await sonrakiNo(depo);
  const yaz: Record<string, unknown> = { [OLAY_SAYAC]: no, [istekAnahtari]: no };
  let olay: MasaOlayi;

  if (girdi.tur === "kabul") {
    if (girdi.olay === undefined) return hata("olay_yok");
    const teklif = await depo.al<MasaOlayi>(olayAnahtari(girdi.olay));
    if (!teklif || !ONAYLI.has(teklif.tur) || teklif.hedef !== kim) return hata("olay_yok");
    if (teklif.durum !== "teklif") return hata("karar_verildi");
    const teklifTur = teklif.tur as "sozlesme" | "ittifak" | "meydanOku";
    if (teklifTur === "meydanOku") {
      if (b.ayar.kavgaYasak) return hata("kavga_yasak");
      // Teklif, iki taraf da teklif anındaki oturuşunda oturuyorken geçerlidir; kalkan ya da masadan çıkanla düşer.
      const oturus = await depo.al<[number | null, number | null]>(oturusAnahtari(teklif.no));
      const anlik = (h: string) => b.oturanlar.find((x) => x.hesap === h)?.o ?? null;
      if (!oturus || oturus[0] === null || anlik(teklif.kim) !== oturus[0] || anlik(kim) !== oturus[1]) return hata("teklif_dustu");
    }
    olay = { no, masa: b.masa, tur: "kabul", kim, hedef: teklif.kim, olay: teklif.no, teklifTur, zaman: b.simdi, katilim };
    yaz[olayAnahtari(teklif.no)] = { ...teklif, durum: "kabul", kabulOlay: no } satisfies MasaOlayi;
  } else {
    const kural = EYLEM_KURALLARI[girdi.tur];
    const hedef = girdi.hedef;
    if (kural.hedef === "zorunlu" && !hedef) return hata("kisi_yok");
    if (hedef) {
      if (hedef === kim) return hata("kendi_hedef");
      if (kural.oturan && !oturan.has(hedef)) return hata("hedef_masada_degil");
      if (await b.engelliMi(hedef, kim)) return hata("engelli");
    }
    if (girdi.tur === "meydanOku" && b.ayar.kavgaYasak) return hata("kavga_yasak");
    if (kural.sart && !girdi.sart) return hata("metin_gecersiz");
    olay = {
      no,
      masa: b.masa,
      tur: girdi.tur,
      kim,
      ...(hedef ? { hedef } : {}),
      ...(girdi.sart ? { sart: girdi.sart } : {}),
      zaman: b.simdi,
      katilim,
      ...(ONAYLI.has(girdi.tur) ? { durum: "teklif" as const } : {}),
    };
    if (girdi.tur === "meydanOku" && hedef) {
      const anlik = (h: string) => b.oturanlar.find((x) => x.hesap === h)?.o ?? null;
      yaz[oturusAnahtari(no)] = [anlik(kim), anlik(hedef)];
    }
  }
  yaz[olayAnahtari(no)] = olay;
  await depo.koy(yaz);
  return basarili({ olay, yeni: true });
}

/** Masa başının çıkarması: olay (katılım listesiyle) + dönüş yasağı. Y1 bildirimi çağıranındır. */
export async function atmaUygula(
  depo: Depo,
  masa: string,
  kim: string,
  hedef: string,
  katilim: string[],
  simdi: number,
): Promise<MasaOlayi> {
  const no = await sonrakiNo(depo);
  const olay: MasaOlayi = { no, masa, tur: "atma", kim, hedef, zaman: simdi, katilim };
  await depo.koy({ [OLAY_SAYAC]: no, [olayAnahtari(no)]: olay, [ATMA + hedef]: simdi + ATMA_SURE_MS });
  return olay;
}
