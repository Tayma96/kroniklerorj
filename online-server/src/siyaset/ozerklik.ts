// Müzakereli özerklik (Ek B §8.1, P4): vali Divan'a başvurur (haraç indirimi + süre karşılığı sadakat ve asker
// kotası). Divan kararı kabul / şartlı / ret; skor dökümü görünür. Verilen özerklik süreli ve geri alınabilirdir
// (şart ihlali, Moğol seferi ya da valinin bırakması). Moğol tutumu ve Sultan meşruiyeti kararı etkiler. Darbe (P5)
// ve bağımsız devlet (P6) bu fazda yoktur; `ozerklikDarbeKancasi` yalnız okunur. Saf fonksiyonlar.

import type { HataKodu } from "../tipler.ts";
import { OZERKLIK } from "./sabitler.ts";
import type { BolgeDurumu, Neden, Ozerklik, SultanlikOzeti } from "./tipler.ts";

export interface OzerklikTalebi {
  indirim: number;
  sure: number;
  asker: number;
}

export function talepCoz(g: Record<string, unknown>): OzerklikTalebi | null {
  const { indirim, sure, asker } = g;
  if (typeof indirim !== "number" || typeof sure !== "number" || !Number.isInteger(sure)) return null;
  const a = asker === undefined ? 0 : asker;
  if (typeof a !== "number" || !Number.isInteger(a)) return null;
  if (indirim < OZERKLIK.indirimEnAz || indirim > OZERKLIK.indirimEnCok) return null;
  if (sure < OZERKLIK.sureEnAz || sure > OZERKLIK.sureEnCok || a < 0 || a > OZERKLIK.askerEnCok) return null;
  return { indirim: Math.round(indirim * 100) / 100, sure, asker: a };
}

/** Başvuru açılabilir mi: açık süreç yok, ret/geri alma sonrası soğuma bitti. */
export function basvuruEngeli(d: BolgeDurumu, ay: number): HataKodu | null {
  const o = d.ozerklik;
  if (!o) return null;
  if (o.durum === "basvuru" || o.durum === "sartli" || o.durum === "etkin") return "ozerklik_var";
  const son = o.karar?.ay ?? o.basvuruAy;
  if ((o.durum === "ret" || o.durum === "geriAlindi") && ay < son + OZERKLIK.sogumaAy) return "soguma";
  return null;
}

export function basvur(d: BolgeDurumu, t: OzerklikTalebi, ay: number, n: number): Ozerklik {
  d.ozerklik = { durum: "basvuru", indirim: t.indirim, sure: t.sure, asker: t.asker, basvuruAy: ay, n };
  return d.ozerklik;
}

/** Divan kararı skoru (döküm görünür). */
export function divanSkoru(d: BolgeDurumu, o: Ozerklik, ozet: SultanlikOzeti | undefined): { skor: number; dokum: Neden[] } {
  const sultan = ozet?.mesruiyet.kademe ?? "dengeli";
  const dokum: Neden[] = [
    { k: "ozerklik.bolgeMesruiyeti", d: d.mesruiyet.puan - 50 },
    { k: "ozerklik.sultan", d: sultan === "zayif" ? OZERKLIK.sultanZayif : sultan === "guclu" ? OZERKLIK.sultanGuclu : 0 },
    { k: "ozerklik.harac", d: d.gecikme === 0 ? OZERKLIK.haracDuzenli : OZERKLIK.haracGecikme * d.gecikme },
    { k: "ozerklik.mogol", d: OZERKLIK.mogolKademe * (ozet?.mogol.kademe ?? 0) },
    { k: "ozerklik.indirim", d: Math.round(OZERKLIK.indirimAgirlik * o.indirim) },
    { k: "ozerklik.asker", d: OZERKLIK.askerKatki * o.asker },
  ].filter((x) => x.d !== 0);
  return { skor: dokum.reduce((t, x) => t + x.d, 0), dokum };
}

/** Bekleyen başvuruya Divan kararı (başvurunun ertesi ay dönümünde). Kabul hemen yürürlüğe girer. */
export function divanKarari(d: BolgeDurumu, ay: number, ozet: SultanlikOzeti | undefined): Ozerklik | null {
  const o = d.ozerklik;
  if (!o || o.durum !== "basvuru" || ay <= o.basvuruAy) return null;
  const { skor, dokum } = divanSkoru(d, o, ozet);
  const tur = skor >= OZERKLIK.kabul ? "kabul" : skor >= OZERKLIK.sartli ? "sartli" : "ret";
  o.karar = { tur, skor, dokum, ay };
  if (tur === "kabul") {
    o.durum = "etkin";
    o.bitis = ay + o.sure;
    o.sart = "haracDuzeni";
  } else if (tur === "sartli") {
    o.durum = "sartli";
    o.indirim = Math.round((o.indirim / 2) * 100) / 100;
    o.sure = Math.min(o.sure, OZERKLIK.sartliSureEnCok);
    o.cevapSon = ay + OZERKLIK.cevapAy;
    o.sart = "haracDuzeni";
  } else o.durum = "ret";
  return o;
}

/** Şartlı teklife valinin cevabı. */
export function sartliCevap(d: BolgeDurumu, kabul: boolean, ay: number): HataKodu | null {
  const o = d.ozerklik;
  if (!o || o.durum !== "sartli") return "ozerklik_yok";
  if (kabul) {
    o.durum = "etkin";
    o.bitis = ay + o.sure;
  } else {
    o.durum = "ret";
    o.neden = "valiReddetti";
  }
  delete o.cevapSon;
  return null;
}

/** Aylık bakım: süre bitişi, cevapsız şartlı teklif, şart ihlali ve Moğol seferi geri alır. Dönen: geri alma nedeni. */
export function ozerklikAyi(d: BolgeDurumu, ay: number, mogolKademe: number): string | null {
  const o = d.ozerklik;
  if (!o) return null;
  if (o.durum === "sartli" && o.cevapSon !== undefined && ay >= o.cevapSon) {
    o.durum = "ret";
    o.neden = "cevapsiz";
    delete o.cevapSon;
    return "cevapsiz";
  }
  if (o.durum !== "etkin") return null;
  if (o.bitis !== undefined && ay >= o.bitis) {
    o.durum = "bitti";
    return "sure";
  }
  const neden = d.gecikme > 0 ? "sartIhlali" : mogolKademe >= 3 ? "mogolSeferi" : null;
  if (neden) geriAl(d, ay, neden);
  return neden;
}

export function geriAl(d: BolgeDurumu, ay: number, neden: string): void {
  const o = d.ozerklik;
  if (!o) return;
  o.durum = "geriAlindi";
  o.neden = neden;
  o.karar = o.karar ? { ...o.karar, ay } : { tur: "ret", skor: 0, dokum: [], ay };
}

export const ozerklikEtkin = (d: BolgeDurumu): boolean => d.ozerklik?.durum === "etkin";
export const haracIndirimi = (d: BolgeDurumu): number => (ozerklikEtkin(d) ? (d.ozerklik?.indirim ?? 0) : 0);

/** P5/P6 kancası: özerklik reddi ya da geri alınması darbe hazırlığının gerekçesi olabilir (bu fazda okunmaz). */
export function ozerklikDarbeKancasi(d: BolgeDurumu): boolean {
  return d.ozerklik?.durum === "ret" || d.ozerklik?.durum === "geriAlindi";
}
