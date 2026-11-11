// Sunucunun {k, p} metinlerini çevirir: anahtar "onl." + k (i18n-sayfa/online2.ts), parametreler sırayla %1, %2 …
// Kişi parametresi {id, ad} adıyla, kimlik değerleri (gündem, meslek, özellik …) kendi tablosuyla yazılır.
// Meslek, huy, tuhaflık ve hayal kanonik Türkçe gelir; tek oyunculudaki locale-data tablolarıyla çevrilir.
import { applyParams } from "../i18n";
import { goalL, professionNameL, quirkL, traitL, type Lang } from "../locale-data";
import type { Kalem, Olay, Ozet } from "./protokol";
import { TOPLUM_PARAM } from "./toplum-metin";
import { HANEDAN_PARAM } from "./hanedan-metin";
import { UCGEN_BARINMA_PARAM, ucgenBarinmaAnahtar, ucgenBarinmaDeger, ucgenBarinmaIkon } from "./ucgen-barinma-metin";

type Ceviri = (k: string) => string;

/** Her anahtarın parametre sırası (şablondaki %1, %2 …). */
const PARAM: Record<string, string[]> = {
  ...TOPLUM_PARAM,
  ...UCGEN_BARINMA_PARAM,
  "olay.olum": ["kisi", "yas"],
  "olay.ustaOldu": ["kisi"],
  "olay.yakinOldu": ["kisi"],
  "olay.gundem": ["kisi", "gundem"],
  "olay.isBuldu": ["kisi", "meslek"],
  "olay.evlilik": ["a", "b"],
  "olay.dostluk": ["a", "b"],
  "olay.dogum": ["anne", "baba", "cocuk"],
  "olay.goc": ["kisi", "sayi"],
  "olay.kulYemini": ["kisi"],
  "olay.ogrenme.gun": ["gun"],
  "olay.hamle.corba": ["kisi", "sebep"],
  "olay.hamle.laf": ["kisi", "sebep"],
  "olay.yeniSakin": ["kisi"],
  "olay.eylem.mektep": ["kisi"],
  "olay.ciraklik": ["kisi", "usta", "meslek"],
  "olay.karar": ["kisi", "secim"],
  "sonuc.puan": ["ozellik"],
  "sonuc.karar": ["secim"],
  "gorus.huyNam": ["huy", "nam"],
  "gorus.kibir": ["huy"],
  "sans.bakis": ["gorus"],
  "sans.huy": ["huy"],
  "sans.ozellik": ["ozellik"],
  "sans.beceri": ["beceri"],
  "sans.tekrar": ["tekrar"],
  "sans.gonul": ["gonul"],
  // Dikey dilim: lonca siparişi olayları (isteyen ölmüşse "…Kimsesiz" biçimi) ve Hal etkileri.
  "olay.siparis.acildi": ["isteyen", "adet", "mal", "odul"],
  "olay.siparis.dustu": ["isteyen", "adet", "mal"],
  "olay.siparis.dustuKimsesiz": ["adet", "mal"],
  "olay.siparis.teslim": ["kim", "adet", "mal", "isteyen"],
  "olay.siparis.teslimKimsesiz": ["kim", "adet", "mal"],
  "olay.yonetim.telafiAkce": ["tutar", "gerekce"],
  "olay.yonetim.telafiEsya": ["adet", "mal", "gerekce"],
  "hal.can.saglam": ["toparlama", "esik", "taban"],
  "hal.can.yarali": ["kondisyonToparlama", "toparlama", "esik"],
  "hal.kondisyon.iyi": ["takatAylik", "isBasina"],
  "hal.kondisyon.yorgun": ["takatAylik", "isBasina"],
  "hal.kondisyon.bitkin": ["takatAylik", "isBasina"],
  "hal.gonul.sen": ["sans", "denge"],
  "hal.gonul.olagan": ["denge"],
  "hal.gonul.kirgin": ["sans", "denge"],
};
/** İşaretli yazılan sayılar (görüş, şans puanı, emek başına kondisyon). */
const ISARETLI = new Set(["gorus", "sans", "isBasina"]);
function paramSirasi(k: string): string[] {
  const p = PARAM[k] ?? HANEDAN_PARAM[k];
  if (p) return p;
  if (k.startsWith("olay.eylem.")) return ["kisi", "hedef"];
  if (k.startsWith("sonuc.")) return ["hedef", "meslek"];
  if (k.startsWith("ogrenme.hedef.")) return ["sayi"];
  return [];
}

/** İşaretli sayı: +5 · −3 · 0 (eksi için tipografik işaret). */
export const isaretli = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");

function degerYaz(ad: string, v: unknown, t: Ceviri, lang: Lang, k = ""): string {
  const ozel = ucgenBarinmaDeger(k, ad, v, t);
  if (ozel !== undefined) return ozel;
  if (v && typeof v === "object") return String((v as { ad?: unknown }).ad ?? "?");
  if (typeof v === "number") return ISARETLI.has(ad) ? isaretli(v) : String(v);
  if (typeof v !== "string") return "";
  switch (ad) {
    case "gundem": return t("onl.gundem." + v);
    case "meslek": return professionNameL(v, lang);
    case "secim": return t("onl.karar." + v);
    case "sebep": return t("onl." + v);
    case "ozellik": return t("onl.ozellik." + v);
    case "beceri": return t("onl.beceri." + v);
    case "nam": return t("onl.nam." + v);
    case "huy": return traitL(v, lang);
    case "mal": return t("onl.mal." + v);
    case "tur": return t("onl.tp.tur." + v);
    default: return v;
  }
}

/** İsteyeni olmayan (ölmüş NPC) sipariş olayı kendi biçimiyle yazılır. */
const KIMSESIZ: ReadonlySet<string> = new Set(["olay.siparis.dustu", "olay.siparis.teslim"]);
function sablonYaz(kHam: string, p: Record<string, unknown>, t: Ceviri, lang: Lang): string {
  const k = KIMSESIZ.has(kHam) && !p.isteyen ? kHam + "Kimsesiz" : ucgenBarinmaAnahtar(kHam, p);
  const anahtar = "onl." + k;
  const sablon = t(anahtar);
  if (sablon === anahtar) return t("onl.olay.bilinmeyen");
  return applyParams(sablon, paramSirasi(k).map((ad) => degerYaz(ad, p[ad], t, lang, k)), lang);
}

/** Olay özeti ya da eylem sonucu; `ek` sunucunun koymadığı parametreleri (ör. hedefin adı) ekler. */
export function ozetYaz(o: Ozet, t: Ceviri, lang: Lang, ek?: Record<string, unknown>): string {
  return sablonYaz(o.k, { ...o.p, ...ek }, t, lang);
}
/** Hal etkisi (sunucu {k, p}): sayılar açıkça yazılır. */
export function etkiYaz(e: { k: string; p: Record<string, number> }, t: Ceviri, lang: Lang): string {
  return sablonYaz(e.k, e.p, t, lang);
}
/** Görüş ya da şans dökümünde bir kalem. */
export function kalemYaz(k: Kalem, t: Ceviri, lang: Lang): string {
  return sablonYaz(k.k, k.p ?? {}, t, lang);
}

export const meslekYaz = (m: string, lang: Lang, kadin = false) => professionNameL(m, lang, kadin);
export const huyYaz = (h: string, lang: Lang) => traitL(h, lang);
export const tuhaflikYaz = (q: string, lang: Lang) => quirkL(q, lang);
export const hayalYaz = (r: string, lang: Lang) => goalL(r, lang);

/** Görüş değerinin kaba adı (§13.9'daki "kızgın görünüyor" dili): 1 düşmanca … 7 can yoldaşı. */
export function ruhDerecesi(d: number): number {
  if (d <= -50) return 1;
  if (d <= -25) return 2;
  if (d <= -8) return 3;
  if (d < 8) return 4;
  if (d < 25) return 5;
  if (d < 50) return 6;
  return 7;
}
export const ruhAnahtari = (d: number) => `onl.ruh.${ruhDerecesi(d)}`;

/** Olay türünün simgesi (GameIcon adı). */
export function olayIkonu(o: Pick<Olay, "ozet" | "tur">): string {
  const k = o.ozet.k;
  if (k.startsWith("olay.eylem.")) return eylemIkonu(k.slice(11));
  const ub = ucgenBarinmaIkon(k);
  if (ub) return ub;
  const tablo: Record<string, string> = {
    "olay.olum": "tombstone", "olay.ustaOldu": "tombstone", "olay.yakinOldu": "tombstone", "olay.gundem": "scroll",
    "olay.isBuldu": "anvil", "olay.evlilik": "ring", "olay.dostluk": "family", "olay.dogum": "baby", "olay.goc": "camel",
    "olay.kulYemini": "flame", "olay.ogrenme.gun": "graduate-cap", "olay.hamle.corba": "bread", "olay.hamle.laf": "speaker",
    "olay.yeniSakin": "house", "olay.ciraklik": "anvil", "olay.karar": "compass",
    "olay.siparis.acildi": "scroll-open", "olay.siparis.dustu": "hourglass", "olay.siparis.teslim": "medal",
    "olay.yonetim.telafiAkce": "gift", "olay.yonetim.telafiEsya": "gift",
  };
  return tablo[k] ?? "scroll-open";
}
const EYLEM_IKON: Record<string, string> = {
  sohbet: "amphora", yardim: "bucket", hediye: "gems", ayakIsi: "walk", cirak: "anvil", cirakRed: "anvil", mektep: "graduate-cap", puan: "star", karar: "compass",
};
export const eylemIkonu = (tur: string) => EYLEM_IKON[tur] ?? "scroll";
export const MEKAN_IKON: Record<string, string> = {
  carsi: "scales", cami: "prayer-beads", kahvehane: "amphora", meydan: "banner", han: "camel", degirmen: "wheat", mektep: "graduate-cap",
};
export const OZELLIK_IKON: Record<string, string> = { guc: "fist", ceviklik: "bow", dayaniklilik: "shield", zeka: "book", karizma: "lyre", sezgi: "star" };
export const BECERI_IKON: Record<string, string> = { dovus: "crossed-swords", soz: "scroll", ticaret: "scales", zanaat: "anvil", ilim: "book", gizlilik: "hood" };
export const NAM_IKON: Record<string, string> = { comertlik: "bread", dindarlik: "prayer-beads", mertlik: "shield", caliskanlik: "wheat" };
export const KARAR_IKON: Record<string, string> = { zanaat: "anvil", ilim: "book", ticaret: "scales", yol: "crossed-swords" };
export const SISTEM_IKON: Record<string, string> = { mahalle: "map", ciraklik: "anvil", mektep: "graduate-cap", ayakIsi: "walk", dostluk: "family", karar: "compass" };
export const ISARET_IKON: Record<string, string> = { tanidik: "walk", dost: "family", dusman: "crossed-swords" };
