// NPC'nin bireysel kararı (GDD §5 "NPC gündemleri", OYNANIS §5): beş ihtiyaç (geçim, aile, itibar, güvenlik, merak)
// kalem kalem puanlanır; en güçlüsü eşiği aşarsa bir hedefe (gündem) dönüşür. Tetikler: kasaba olayı (kıtlık,
// haydut haberi), NPC'nin bu ayki mekânı (konum), hane durumu, huy ve hayal. Rastgelelik yoktur: aynı durum aynı
// kararı verir; gerekçe (en ağır kalem) olay parametresine yazılır. Gizli sayı yok: döküm toplamı = değer.

import { HAYALLER, HUYLAR, MESLEKLER } from "../icerik/kisilik.ts";
import type { Mevsim } from "../saat.ts";
import { yas } from "./ortak.ts";
import { GUNDEM, type Dokum, type Kalem, type Kasaba, type Npc } from "./tipler.ts";
import { ISSIZ } from "./uret.ts";

export const IHTIYACLAR = ["gecim", "aile", "itibar", "guvenlik", "merak"] as const;
export type Ihtiyac = (typeof IHTIYACLAR)[number];

/** [PARAMETRE] İhtiyaç kalemleri (0..100 ölçeğinde katkı). */
export const IHTIYAC_PUANI = {
  issiz: 60,
  kitlik: 30,
  cocuk: 10,
  cocukTavan: 30,
  hayalBorc: 20,
  bekar: 45,
  hayalEvermek: 15,
  rakip: 15,
  rakipTavan: 30,
  hirs: 25,
  hayalNam: 25,
  dostsuz: 10,
  olgunluk: 5,
  haydut: 55,
  mertlik: 15,
  kucukCocuk: 10,
  kis: 5,
  genc: 25,
  merakHuy: 15,
  hayalGezi: 30,
  konum: 10,
} as const;
/** [PARAMETRE] Karar eşikleri: gündem, borç sıkışması, göç niyeti (geçimden ya da meraktan). */
export const IHTIYAC_ESIGI = 40;
export const BORC_ESIGI = 60;
export const GOC_GECIM_ESIGI = 90;
export const GOC_MERAK_ESIGI = 60;
export const KARAR_YASI = 14;

export interface KararBaglami {
  /** Hane → üyeler (kasaba geneli geçişinde kurulur). */
  hane: ReadonlyMap<number, readonly Npc[]>;
  kitlik: boolean;
  haydut: boolean;
  mevsim: Mevsim;
  /** NPC'nin bu ayki mekânı (yalnız yakın çevrede hesaplanır; yoksa konum kalemi yok). */
  mekan?: string;
}

export interface Karar {
  gundem: number;
  ihtiyac: Ihtiyac;
  deger: number;
  /** En ağır kalem (gerekçe). */
  sebep: string;
  kalemler: Kalem[];
}

const H = (ad: string) => HUYLAR.indexOf(ad);
const R = (ad: string) => HAYALLER.indexOf(ad);
const HIRS = new Set([H("kibirli"), H("hırslı")]);
const MERT = new Set([H("mert")]);
const MERAK_HUY = new Set([H("neşeli"), H("aceleci"), H("kurnaz")]);
const NOBETCI_MESLEK = new Set([MESLEKLER.indexOf("asker"), MESLEKLER.indexOf("avcı")]);
const HAYAL_BORC = R("borçlarından kurtulmaya çalışıyor");
const HAYAL_EVERMEK = R("kızını/oğlunu evermek istiyor");
const HAYAL_NAM = new Set([R("adını duyurmak istiyor"), R("ustabaşı olmak istiyor")]);
const HAYAL_GEZI = new Set([R("yıllardır görmediği memleketini görmek istiyor"), R("kervan ticaretine atılmak istiyor")]);

/** İhtiyaç → (konum tetiği) mekân: NPC orada bu ay o ihtiyacı daha çok duyar. */
const KONUM: Readonly<Record<Ihtiyac, readonly string[]>> = {
  gecim: ["carsi", "degirmen"],
  aile: ["cami"],
  itibar: ["meydan"],
  guvenlik: ["meydan", "han"],
  merak: ["kahvehane", "han"],
};

/** Beş ihtiyacın dökümü (her biri: toplam = kalemlerin toplamı, 0..100'e kırpılmaz; eşikler buna göredir). */
export function ihtiyaclar(k: Kasaba, n: Npc, ay: number, b: KararBaglami): Record<Ihtiyac, Dokum> {
  const y = yas(n.d, ay);
  const sonuc = {} as Record<Ihtiyac, Dokum>;
  const hane = b.hane.get(n.e) ?? [];
  let cocuk = 0;
  let kucuk = 0;
  for (const u of hane) {
    if (u === n) continue;
    const uy = yas(u.d, ay);
    if (uy < 14 && (u.an === n.i || u.ba === n.i)) cocuk++;
    if (uy < 7) kucuk++;
  }
  for (const ih of IHTIYACLAR) {
    const kalemler: Kalem[] = [];
    let toplam = 0;
    const ekle = (neden: string, d: number) => {
      if (d === 0) return;
      toplam += d;
      kalemler.push({ k: `ihtiyac.${ih}.${neden}`, d });
    };
    if (ih === "gecim") {
      if (y >= 16 && n.m === ISSIZ) ekle("issiz", IHTIYAC_PUANI.issiz);
      if (b.kitlik) ekle("kitlik", IHTIYAC_PUANI.kitlik);
      ekle("cocuk", Math.min(IHTIYAC_PUANI.cocukTavan, cocuk * IHTIYAC_PUANI.cocuk));
      if (n.r === HAYAL_BORC) ekle("hayal", IHTIYAC_PUANI.hayalBorc);
    } else if (ih === "aile") {
      if (y >= 18 && y <= 40 && !n.es) ekle("bekar", IHTIYAC_PUANI.bekar);
      if (n.r === HAYAL_EVERMEK && y >= 35) ekle("hayal", IHTIYAC_PUANI.hayalEvermek);
    } else if (ih === "itibar") {
      let rakip = 0;
      let dost = false;
      for (const bg of n.b) {
        if (bg[1] === 2) rakip++;
        else dost = true;
      }
      ekle("rakip", Math.min(IHTIYAC_PUANI.rakipTavan, rakip * IHTIYAC_PUANI.rakip));
      if (HIRS.has(n.h)) ekle("huy", IHTIYAC_PUANI.hirs);
      if (HAYAL_NAM.has(n.r)) ekle("hayal", IHTIYAC_PUANI.hayalNam);
      if (!dost && y >= 16) ekle("dostsuz", IHTIYAC_PUANI.dostsuz);
      if (y >= 25 && y < 60) ekle("olgunluk", IHTIYAC_PUANI.olgunluk);
    } else if (ih === "guvenlik") {
      if (b.haydut) ekle("haydut", IHTIYAC_PUANI.haydut);
      if (y >= 16 && (MERT.has(n.h) || NOBETCI_MESLEK.has(n.m))) ekle("mertlik", IHTIYAC_PUANI.mertlik);
      if (b.haydut && kucuk > 0) ekle("kucukCocuk", IHTIYAC_PUANI.kucukCocuk);
      if (b.mevsim === "kis") ekle("kis", IHTIYAC_PUANI.kis);
    } else {
      if (y >= 14 && y <= 25) ekle("genc", IHTIYAC_PUANI.genc);
      if (MERAK_HUY.has(n.h)) ekle("huy", IHTIYAC_PUANI.merakHuy);
      if (HAYAL_GEZI.has(n.r)) ekle("hayal", IHTIYAC_PUANI.hayalGezi);
    }
    if (b.mekan && toplam > 0 && KONUM[ih].includes(b.mekan)) ekle(`konum.${b.mekan}`, IHTIYAC_PUANI.konum);
    sonuc[ih] = { toplam, kalemler };
  }
  return sonuc;
}

/** İhtiyaçtan hedefe: geçim (iş arama / borç / ambar / göç), aile → evlilik, itibar, güvenlik → nöbet, merak (göç). */
export function hedef(n: Npc, ih: Ihtiyac, deger: number, ay: number): number {
  const y = yas(n.d, ay);
  if (ih === "gecim") {
    if (y >= 16 && n.m === ISSIZ) return deger >= GOC_GECIM_ESIGI && !n.es ? GUNDEM.goc : GUNDEM.gecim;
    return deger >= BORC_ESIGI && y >= 18 ? GUNDEM.borc : GUNDEM.ambar;
  }
  if (ih === "aile") return y >= 18 ? GUNDEM.evlilik : GUNDEM.dostluk;
  if (ih === "itibar") return GUNDEM.itibar;
  if (ih === "guvenlik") return y >= 16 ? GUNDEM.nobet : GUNDEM.merak;
  return deger >= GOC_MERAK_ESIGI && !n.es && y >= 16 && y <= 30 ? GUNDEM.goc : GUNDEM.merak;
}

function enAgir(kalemler: readonly Kalem[], ih: Ihtiyac): string {
  let en: Kalem | undefined;
  for (const x of kalemler) if (!en || x.d > en.d) en = x;
  return en?.k ?? `ihtiyac.${ih}.genel`;
}

/**
 * Bireysel karar. Eşiği aşan en güçlü ihtiyacın hedefi; `zorla` verilirse eşik aranmaz ve `haric` gündemden farklı
 * ilk hedef seçilir (etkin oturum güvencesi). Yaşı tutmayan için `undefined`. Eşitlikte IHTIYACLAR sırası.
 */
export function npcKarar(k: Kasaba, n: Npc, ay: number, b: KararBaglami, secenek: { zorla?: boolean; haric?: number } = {}): Karar | undefined {
  if (yas(n.d, ay) < KARAR_YASI) return undefined;
  const d = ihtiyaclar(k, n, ay, b);
  const sirali = [...IHTIYACLAR].sort((a, c) => d[c].toplam - d[a].toplam || IHTIYACLAR.indexOf(a) - IHTIYACLAR.indexOf(c));
  for (const ih of sirali) {
    const deger = d[ih].toplam;
    if (!secenek.zorla && deger < IHTIYAC_ESIGI) return undefined;
    const g = hedef(n, ih, deger, ay);
    if (secenek.haric !== undefined && g === secenek.haric) {
      if (secenek.zorla) continue;
      return undefined;
    }
    return { gundem: g, ihtiyac: ih, deger, sebep: enAgir(d[ih].kalemler, ih), kalemler: d[ih].kalemler };
  }
  return undefined;
}
