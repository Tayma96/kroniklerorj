// Meşruiyet (Ek B §7.2, P3): Sultan ve bölge meşruiyeti, 3 kademe (Zayıf / Dengeli / Güçlü), her zaman nedenleriyle.
// Gizli puan yoktur: puan, kalemler ve eşikler istemciye gider. Saf fonksiyonlar.

import { MESRUIYET, MESRUIYET_KADEMELERI, VERGI, type MesruiyetKademesi } from "./sabitler.ts";
import type { Mesruiyet, Neden } from "./tipler.ts";

export function mesruiyetKademesi(puan: number): MesruiyetKademesi {
  if (puan < MESRUIYET.zayif) return MESRUIYET_KADEMELERI[0];
  if (puan < MESRUIYET.guclu) return MESRUIYET_KADEMELERI[1];
  return MESRUIYET_KADEMELERI[2];
}

function topla(nedenler: Neden[]): Mesruiyet {
  const kalemler = nedenler.filter((n) => n.d !== 0).map((n) => ({ k: n.k, d: Math.round(n.d * 10) / 10 }));
  const puan = Math.round(MESRUIYET.taban + kalemler.reduce((t, n) => t + n.d, 0));
  return { puan, kademe: mesruiyetKademesi(puan), nedenler: kalemler };
}

export interface BolgeMesruiyetGirdisi {
  vergiOrani: number;
  gostergeOrt: number;
  /** Penceredeki haksız azil sayısı (Divan'ın geri aldığı, bölgedeki makamların yaptığı). */
  haksizAzil: number;
  /** Vali ileri gelenlerin onayıyla mı geldi (geçici/NPC naib değil). */
  onayliVali: boolean;
  mogolTutum: number;
  ozerklik: boolean;
  /** Valinin teveccüh kademesi (sınırlı destek, §6.2). */
  valiTeveccuh: number;
}

/** Bölge meşruiyeti: valinin adaleti, vergi yükü, bölge göstergeleri, Moğol baskısı, özerklik. */
export function bolgeMesruiyeti(g: BolgeMesruiyetGirdisi): Mesruiyet {
  return topla([
    { k: "mesruiyet.vergiYuku", d: VERGI.mesruiyet[g.vergiOrani] ?? 0 },
    { k: "mesruiyet.gostergeler", d: (g.gostergeOrt - 50) / 2 },
    { k: "mesruiyet.haksizAzil", d: MESRUIYET.haksizAzil * g.haksizAzil },
    { k: "mesruiyet.onayliVali", d: g.onayliVali ? MESRUIYET.onayliVali : 0 },
    { k: "mesruiyet.mogol", d: MESRUIYET.mogol[g.mogolTutum] ?? 0 },
    { k: "mesruiyet.ozerklik", d: g.ozerklik ? MESRUIYET.ozerklik : 0 },
    { k: "mesruiyet.teveccuh", d: Math.min(MESRUIYET.teveccuhTavan, g.valiTeveccuh) },
  ]);
}

export interface SultanMesruiyetGirdisi {
  /** Haracını tam ödeyen bölge oranı (0–1); rapor vermeyen ödememiş sayılır. */
  valiDestegi: number;
  /** Bölge meşruiyet puanlarının ortalaması. */
  halk: number;
  mogolTutum: number;
  haksizAzil: number;
}

/** Sultan meşruiyetinin üç ayağı (vali desteği, halk, Moğol onayı) + adalet. */
export function sultanMesruiyeti(g: SultanMesruiyetGirdisi): Mesruiyet {
  return topla([
    { k: "mesruiyet.valiDestegi", d: (g.valiDestegi - 0.5) * MESRUIYET.valiDestegi },
    { k: "mesruiyet.halk", d: (g.halk - 50) / 2 },
    { k: "mesruiyet.mogolOnayi", d: MESRUIYET.mogolOnayi[g.mogolTutum] ?? 0 },
    { k: "mesruiyet.adalet", d: MESRUIYET.sultanHaksizAzil * g.haksizAzil },
  ]);
}

/** Görünüm: puan, kademe, nedenler ve eşikler (sonraki kademeye ne kadar kaldığı görünür). */
export function mesruiyetGorunumu(m: Mesruiyet) {
  return { ...m, esikler: { zayif: MESRUIYET.zayif, guclu: MESRUIYET.guclu } };
}

/** P5 kancası: darbe/isyan eşiği çarpanı (Sultan zayıfsa eşik düşer). Bu fazda yalnız okunur. */
export function darbeEsigiCarpani(sultan: Mesruiyet): number {
  return sultan.kademe === "zayif" ? 0.8 : sultan.kademe === "guclu" ? 1.2 : 1;
}
