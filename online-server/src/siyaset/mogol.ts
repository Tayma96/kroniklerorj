// Moğol tutum durum makinesi (Ek B §6.2, P2). Moğol oyuncu değildir (D-41). Tutum yalnız kayıtlı olay girdilerinden
// gelir (söylentiyle çarpıtılamaz), ayda en çok bir kademe değişir (kademeli) ve nedenleriyle görünür. Etki YALNIZ
// bölge göstergelerine düşer (D-35/D-46); oyuncu karakteri cezalandırılmaz. Saf fonksiyonlar.

import { MESRUIYET_KADEMELERI, MOGOL } from "./sabitler.ts";
import type { MogolGorunumu, Neden } from "./tipler.ts";

export interface MogolDurumu {
  tutum: number;
  gerilim: number;
  /** Sultanın ardışık eksik ödediği ay. */
  gecikme: number;
  nedenler: Neden[];
}

export interface MogolGirdisi {
  /** Bu ay talebin ödenen oranı (0–1). */
  odemeOrani: number;
  /** Haracını eksik ödeyen bölge sayısı. */
  eksikBolge: number;
  /** Meşruiyeti zayıf bölge sayısı (isyan riski). */
  zayifBolge: number;
  /** Bu ay verilen özerklik sayısı. */
  yeniOzerklik: number;
  /** P5/P6 kancası: darbe ya da bağımsızlık (bu fazda hep 0). */
  darbe?: number;
}

export function mogolBaslangic(): MogolDurumu {
  return { tutum: 0, gerilim: 0, gecikme: 0, nedenler: [] };
}

/** Gerilimin hedeflediği tutum (seferde ancak ağır ihlal ya da darbe kancasıyla). */
export function hedefTutum(gerilim: number, agirIhlal: boolean): number {
  let t = 0;
  for (const e of MOGOL.esikler) if (gerilim >= e) t++;
  return agirIhlal ? t : Math.min(t, 2);
}

/** Bir aylık tutum adımı: girdiler → gerilim → hedef tutum; tutum hedefe en çok 1 kademe yaklaşır. */
export function mogolAyi(d: MogolDurumu, g: MogolGirdisi): { degisti: boolean; onceki: number } {
  const nedenler: Neden[] = [];
  if (g.odemeOrani >= 1) nedenler.push({ k: "mogol.odendi", d: -MOGOL.odemeRahatlama });
  else nedenler.push({ k: "mogol.gecikme", d: Math.round(MOGOL.gecikmeGerilim * (1 - g.odemeOrani)) });
  if (g.eksikBolge > 0) nedenler.push({ k: "mogol.eksikBolge", d: MOGOL.bolgeEksik * g.eksikBolge });
  if (g.zayifBolge > 0) nedenler.push({ k: "mogol.zayifBolge", d: MOGOL.bolgeZayif * g.zayifBolge });
  if (g.yeniOzerklik > 0) nedenler.push({ k: "mogol.ozerklik", d: MOGOL.ozerklik * g.yeniOzerklik });
  if (g.darbe) nedenler.push({ k: "mogol.darbe", d: g.darbe });
  d.gecikme = g.odemeOrani >= 1 ? 0 : d.gecikme + 1;
  d.gerilim = Math.max(0, Math.min(100, d.gerilim + nedenler.reduce((t, n) => t + n.d, 0)));
  d.nedenler = nedenler;
  const hedef = hedefTutum(d.gerilim, d.gecikme >= MOGOL.agirIhlalAy || (g.darbe ?? 0) > 0);
  const onceki = d.tutum;
  if (hedef > d.tutum) d.tutum++;
  else if (hedef < d.tutum) d.tutum--;
  return { degisti: d.tutum !== onceki, onceki };
}

export function mogolTalebi(tutum: number): number {
  return Math.round(MOGOL.talep * (MOGOL.talepCarpan[tutum] ?? 1));
}

/** Bölge göstergelerine aylık etki (tek kaynak). */
export function mogolEtkisi(tutum: number): { arz: number; moral: number; guvenlik: number } {
  const e = MOGOL.etki[tutum] ?? MOGOL.etki[0];
  return { arz: e.arz, moral: e.moral, guvenlik: e.guvenlik };
}

export function mogolGorunumu(d: MogolDurumu): MogolGorunumu {
  return {
    tutum: MOGOL.tutumlar[d.tutum] ?? "memnun",
    kademe: d.tutum,
    gosterge: d.tutum === 0 ? MESRUIYET_KADEMELERI[2] : d.tutum === 1 ? MESRUIYET_KADEMELERI[1] : MESRUIYET_KADEMELERI[0],
    gerilim: d.gerilim,
    sonrakiEsik: MOGOL.esikler.find((e) => e > d.gerilim) ?? null,
    nedenler: d.nedenler,
    etki: mogolEtkisi(d.tutum),
    talep: mogolTalebi(d.tutum),
  };
}
