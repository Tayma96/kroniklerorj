// Arka plan nüfusu ve kasaba geneli (GDD §4 katman 2 ve 4, §13: tüm nüfus ayrıntılı taranmaz). Saf fonksiyonlar.
// - Uzak katman: birikimli sayaçlar (doğum, ölüm, evlilik, göç, iş bulan, yeni gündem) bu ayın olaylarından sayılır;
//   NPC'ye tek tek bakılmaz.
// - Kasaba geneli: her dönümde tek, hafif bir geçişle özet istatistik (nüfus, yetişkin, işsiz, bekâr, yaşlı, çocuk,
//   hane, gündem dağılımı); aynı geçişte süresi dolan katmanlı gündemler söner, hane dizini kurulur.
// - Kasaba olayları (kıtlık, haydut haberi): düşük sıklıklı, tohumlu; nedeni olay parametresinde. Etkin oyuncusu
//   olmayan (boş) yerleşimde daha da seyrek ve daha uzun aralıklıdır.

import { takvim } from "../saat.ts";
import { npcKimlik, npcRef, yas } from "./ortak.ts";
import { dizinSec, tohumlu } from "./rastgele.ts";
import { gostergeTetikCarpani } from "./topluluk-kayit.ts";
import { GUNDEM, GUNDEM_ADI, type Kasaba, type Npc, type OlayTaslagi } from "./tipler.ts";
import { ISSIZ } from "./uret.ts";

export const KASABA_TETIKLERI = ["kitlik", "haydut"] as const;
export type KasabaTetigi = (typeof KASABA_TETIKLERI)[number];

/** [PARAMETRE] Kasaba olayının aylık taban olasılığı ve süresi (ay). */
export const TETIK_ORANI: Readonly<Record<KasabaTetigi, number>> = { kitlik: 0.05, haydut: 0.04 };
export const TETIK_SURESI: Readonly<Record<KasabaTetigi, number>> = { kitlik: 3, haydut: 2 };
/** [PARAMETRE] Mevsim ve işsizlik çarpanları (nedeni olayda görünür). */
export const KIS_KITLIK_CARPANI = 1.6;
export const YAZ_HAYDUT_CARPANI = 1.3;
export const ISSIZLIK_ESIGI = 0.25;
export const ISSIZLIK_KITLIK_CARPANI = 1.3;
/** [PARAMETRE] İki kasaba olayı arasındaki en kısa süre (ay): etkin yerleşimde ve boş yerleşimde. */
export const OLAY_ARALIK = 3;
export const BOS_OLAY_ARALIK = 6;
/** [PARAMETRE] Boş (etkin oyuncusuz) yerleşimde kasaba olayı olasılık çarpanı. */
export const BOS_OLAY_CARPANI = 0.35;
/** [PARAMETRE] Katmanlı gündemin ömrü (ay): sonra kendiliğinden söner. */
export const GUNDEM_OMRU = 6;
/** [PARAMETRE] Göç niyeti kaydının uzunluğu (yalnız kayıt; NPC ayrılmaz). */
export const GOC_KAYIT_EN_COK = 20;
export const YASLI_YASI = 60;

/** Kasaba özeti (kısa alanlar; meta'da saklanır). */
export interface KasabaOzeti {
  /** Nüfus, yetişkin (16+), işsiz yetişkin, bekâr (18–40), yaşlı, çocuk (<14), hane sayısı. */
  n: number;
  y: number;
  i: number;
  b: number;
  l: number;
  c: number;
  e: number;
  /** Gündem koduna göre kişi sayısı (GUNDEM_ADI sırasıyla). */
  g: number[];
}

export interface ArkaPlan {
  /** Özetin ayı ve kendisi. */
  oa: number;
  oz: KasabaOzeti;
  /** Birikimli uzak sayaçlar: ad → sayı (anahtarlar sabit kümeden). */
  sy: Record<string, number>;
  /** Süren kasaba tetikleri: tür → son etkili ay (dahil). */
  tt: Partial<Record<KasabaTetigi, number>>;
  /** Son kasaba olayının ayı. */
  so: number;
  /** Göç niyeti kaydı: [NPC, ay] (en yeni sonda). */
  gn: [npc: number, ay: number][];
}

const BOS_OZET = (): KasabaOzeti => ({ n: 0, y: 0, i: 0, b: 0, l: 0, c: 0, e: 0, g: GUNDEM_ADI.map(() => 0) });

export function arkaPlanAl(k: Kasaba): ArkaPlan {
  return (k.ap ??= { oa: -1, oz: BOS_OZET(), sy: {}, tt: {}, so: -1e9, gn: [] });
}

/** Bu ayın olaylarından sayılan uzak sayaçlar (olay anahtarı → sayaç adı). */
const SAYAC: Readonly<Record<string, string>> = {
  "olay.olum": "olum",
  "olay.dogum": "dogum",
  "olay.evlilik": "evlilik",
  "olay.goc": "gocGelen",
  "olay.isBuldu": "isBuldu",
  "olay.dostluk": "dostluk",
};

export function sayacEkle(ap: ArkaPlan, ad: string, d = 1): void {
  ap.sy[ad] = (ap.sy[ad] ?? 0) + d;
}

/** Uzak katman: bu ayın olay taslaklarını sayar (NPC'lere bakmaz). */
export function sayaclariIsle(ap: ArkaPlan, buAy: readonly OlayTaslagi[]): void {
  for (const o of buAy) {
    const ad = SAYAC[o.k];
    if (ad) sayacEkle(ap, ad);
  }
}

export const tetikSurer = (ap: ArkaPlan, t: KasabaTetigi, ay: number): boolean => (ap.tt[t] ?? -1) >= ay;

const katmanli = (g: number) => g >= GUNDEM.ambar;

/**
 * Kasaba geneli: tek hafif geçişle özet, hane dizini ve süresi dolan katmanlı gündemlerin sönmesi. Borç gündemli
 * NPC'nin isteği bir oyuncuca kabul edildiyse (`borcVerenler`: NPC → oyuncu) gündemi çözülür ve olay döner.
 */
export function kasabaGeneli(k: Kasaba, ap: ArkaPlan, ay: number, borcVerenler: ReadonlyMap<number, string>): { hane: Map<number, Npc[]>; olaylar: OlayTaslagi[] } {
  const oz = BOS_OZET();
  const hane = new Map<number, Npc[]>();
  const olaylar: OlayTaslagi[] = [];
  for (const n of k.npc) {
    const y = yas(n.d, ay);
    oz.n++;
    if (y >= 16) oz.y++;
    if (y >= 16 && n.m === ISSIZ) oz.i++;
    if (y >= 18 && y <= 40 && !n.es) oz.b++;
    if (y >= YASLI_YASI) oz.l++;
    if (y < 14) oz.c++;
    const h = hane.get(n.e);
    if (h) h.push(n);
    else hane.set(n.e, [n]);
    if (katmanli(n.g)) {
      const veren = n.g === GUNDEM.borc ? borcVerenler.get(n.i) : undefined;
      if (veren) {
        olaylar.push({ t: "gundem", w: npcKimlik(n.i), h: veren, g: veren, n: 4, k: "olay.gundem.cozuldu", p: { kisi: npcRef(n), gundem: "borc", sebep: "gundem.borcVerildi" } });
        n.g = GUNDEM.yok;
        delete n.ga;
        sayacEkle(ap, "borcCozuldu");
      } else if (ay - (n.ga ?? -1e9) >= GUNDEM_OMRU) {
        n.g = GUNDEM.yok;
        delete n.ga;
      }
    }
    oz.g[n.g] = (oz.g[n.g] ?? 0) + 1;
  }
  oz.e = hane.size;
  ap.oz = oz;
  ap.oa = ay;
  if (ap.gn.length) ap.gn = ap.gn.filter(([i]) => k.dizin.has(i));
  return { hane, olaylar };
}

/** Göç niyetini kaydeder (yalnız kayıt: NPC ayrılmaz). */
export function gocNiyeti(ap: ArkaPlan, npc: number, ay: number): void {
  ap.gn = ap.gn.filter(([i]) => i !== npc);
  ap.gn.push([npc, ay]);
  if (ap.gn.length > GOC_KAYIT_EN_COK) ap.gn.splice(0, ap.gn.length - GOC_KAYIT_EN_COK);
  sayacEkle(ap, "gocNiyeti");
}

/**
 * Kasaba olayı (tohumlu, ayda en çok bir). `bos`: etkin oyuncu yok → daha seyrek ve daha uzun aralıklı.
 * Başlayan tetiği ve olay taslağını döndürür; neden (`sebep`) parametrededir.
 */
export function kasabaOlayi(k: Kasaba, ap: ArkaPlan, ay: number, bos: boolean): { tetik?: KasabaTetigi; olaylar: OlayTaslagi[] } {
  if (ay - ap.so < (bos ? BOS_OLAY_ARALIK : OLAY_ARALIK)) return { olaylar: [] };
  const r = tohumlu("kasabaOlayi", k.y, ay);
  const mevsim = takvim(ay).mevsim;
  const adaylar: { t: KasabaTetigi; p: number; sebep: string }[] = [];
  for (const t of KASABA_TETIKLERI) {
    if (tetikSurer(ap, t, ay)) continue;
    // E6: ortak dert başarısızlığıyla düşen bölge göstergesi (arz/moral) olasılığı tavanlı artırır.
    let p = TETIK_ORANI[t] * (bos ? BOS_OLAY_CARPANI : 1) * gostergeTetikCarpani(k, t);
    let sebep = t === "kitlik" ? "kasaba.kitlik.hasat" : "kasaba.haydut.yol";
    if (t === "kitlik" && mevsim === "kis") {
      p *= KIS_KITLIK_CARPANI;
      sebep = "kasaba.kitlik.kis";
    } else if (t === "kitlik" && ap.oz.y > 0 && ap.oz.i / ap.oz.y >= ISSIZLIK_ESIGI) {
      p *= ISSIZLIK_KITLIK_CARPANI;
      sebep = "kasaba.kitlik.issizlik";
    } else if (t === "haydut" && mevsim === "yaz") {
      p *= YAZ_HAYDUT_CARPANI;
      sebep = "kasaba.haydut.kervan";
    }
    adaylar.push({ t, p, sebep });
  }
  if (adaylar.length === 0) return { olaylar: [] };
  const a = adaylar[dizinSec(adaylar.length, r)]!;
  if (r() >= a.p) return { olaylar: [] };
  ap.tt[a.t] = ay + TETIK_SURESI[a.t] - 1;
  ap.so = ay;
  sayacEkle(ap, a.t);
  return {
    tetik: a.t,
    olaylar: [{ t: "kasaba", w: "", h: "", g: "", n: 6, k: `olay.kasaba.${a.t}`, p: { sebep: a.sebep, sure: TETIK_SURESI[a.t], bos: bos ? 1 : 0 } }],
  };
}

/** Okunur görünüm (uç yanıtı): kasaba nabzı. */
export function arkaPlanGorunumu(ap: ArkaPlan | undefined, ay: number) {
  if (!ap) return null;
  const gundem: Record<string, number> = {};
  ap.oz.g.forEach((s, i) => {
    const ad = GUNDEM_ADI[i];
    if (ad && s) gundem[ad] = s;
  });
  return {
    ay: ap.oa,
    nufus: ap.oz.n,
    yetiskin: ap.oz.y,
    issiz: ap.oz.i,
    bekar: ap.oz.b,
    yasli: ap.oz.l,
    cocuk: ap.oz.c,
    hane: ap.oz.e,
    gundem,
    tetikler: KASABA_TETIKLERI.filter((t) => tetikSurer(ap, t, ay)),
    gocNiyeti: ap.gn.length,
    sayaclar: { ...ap.sy },
  };
}
