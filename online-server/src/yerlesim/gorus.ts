// NPC'nin oyuncuya bakışı = kalemlerin toplamı (tek oyunculudaki gorus() dökümünün çevrimiçi karşılığı).
// Gösterilen toplam ile motorun kullandığı değer AYNI fonksiyondan gelir; −100..100'e kırpılırsa fark
// "gorus.sinir" kalemiyle görünür, böylece kalemlerin toplamı her zaman toplama eşittir.

import { HUYLAR } from "../icerik/kisilik.ts";
import { NAMLAR } from "./karakter.ts";
import { yas } from "./ortak.ts";
import type { Ani, Dokum, IliskiHaritasi, Kalem, Karakter, Kasaba, Npc } from "./tipler.ts";

export const GORUS_SINIRI = 100;
/** [PARAMETRE] Anı yarı ömrü (ay): 12 ay = 6 gerçek gün. */
export const ANI_YARI_OMRU = 12;
/** [PARAMETRE] Dostunun dostu: sevdiklerinin sana bakışının %10'u, ±10; yalnız en az 4 mevsimlik bağlar. */
export const DOST_DOSTU_ORANI = 0.1;
export const DOST_DOSTU_TAVANI = 10;
export const BAG_ESKI_AY = 12;
export const AKRABA_DEGERI = { anne: 20, baba: 20, kardes: 10, buyukEbeveyn: 12, hane: 5 } as const;
export type AkrabaRolu = keyof typeof AKRABA_DEGERI;
export const MESLEKTAS_DEGERI = 5;
export const USTA_DEGERI = 8;
const HUY_NAM_TAVANI = 10;

/** Huy → hangi namını sever (nam dizini). Kibirli herkesin şöhretini çekemez (ayrı). */
const HUY_NAM: ReadonlyMap<number, number> = new Map([
  [HUYLAR.indexOf("dindar"), 1],
  [HUYLAR.indexOf("cömert"), 0],
  [HUYLAR.indexOf("misafirperver"), 0],
  [HUYLAR.indexOf("sıcakkanlı"), 0],
  [HUYLAR.indexOf("mert"), 2],
  [HUYLAR.indexOf("hırslı"), 3],
  [HUYLAR.indexOf("sabırlı"), 3],
]);
const KIBIRLI = HUYLAR.indexOf("kibirli");

export function aniYuku(ani: Ani, ay: number): number {
  const gecen = Math.max(0, ay - ani[2]);
  return Math.round(ani[1] * Math.pow(0.5, gecen / ANI_YARI_OMRU));
}

/** NPC oyuncunun nesi olur (ocağın ailesi)? */
export function akrabalik(kasaba: Kasaba, npc: Npc, kar: Karakter): AkrabaRolu | undefined {
  if (npc.i === kar.an && kar.an) return "anne";
  if (npc.i === kar.ba && kar.ba) return "baba";
  if ((kar.an && npc.an === kar.an) || (kar.ba && npc.ba === kar.ba)) return "kardes";
  for (const ebeveyn of [kar.an, kar.ba]) {
    const e = ebeveyn ? kasaba.dizin.get(ebeveyn) : undefined;
    if (e && (npc.i === e.an || npc.i === e.ba)) return "buyukEbeveyn";
  }
  if (kar.e && npc.e === kar.e) return "hane";
  return undefined;
}

const sinirla = (x: number, t: number) => (x > t ? t : x < -t ? -t : x);

/**
 * Dolaysız görüş (dostunun dostu hariç). `kalemler` verilirse döküm oraya yazılır; yalnız toplam gerekiyorsa
 * verilmez (dostunun dostu hesabında hızlı yol). İki yol aynı sayıyı üretir.
 */
function dolaysiz(kasaba: Kasaba, npc: Npc, kar: Karakter, ili: IliskiHaritasi | undefined, ay: number, kalemler?: Kalem[]): number {
  let toplam = 0;
  const ekle = (k: string, d: number, p?: Record<string, string | number>) => {
    if (d === 0) return;
    toplam += d;
    kalemler?.push(p ? { k, d, p } : { k, d });
  };
  const i = ili?.[npc.i];
  if (i) {
    ekle("gorus.gecmis", i.t);
    if (kalemler) {
      const turler = new Map<string, number>();
      for (const a of i.an) turler.set(a[0], (turler.get(a[0]) ?? 0) + aniYuku(a, ay));
      for (const [tur, d] of turler) ekle(`gorus.ani.${tur}`, d);
    } else for (const a of i.an) toplam += aniYuku(a, ay);
  }
  const rol = akrabalik(kasaba, npc, kar);
  if (rol) ekle(`gorus.akraba.${rol}`, AKRABA_DEGERI[rol]);
  if (kar.us) {
    if (npc.i === kar.us) ekle("gorus.usta", USTA_DEGERI);
    else {
      const usta = kasaba.dizin.get(kar.us);
      if (usta && npc.m === usta.m && yas(npc.d, ay) >= 14) ekle("gorus.meslektas", MESLEKTAS_DEGERI);
    }
  }
  const namI = HUY_NAM.get(npc.h);
  if (namI !== undefined) {
    ekle("gorus.huyNam", sinirla(Math.floor((kar.nm[namI] ?? 0) / 10), HUY_NAM_TAVANI), {
      huy: HUYLAR[npc.h] ?? "",
      nam: NAMLAR[namI] ?? "",
    });
  } else if (npc.h === KIBIRLI) {
    const sohret = kar.nm.reduce((a, b) => a + b, 0);
    ekle("gorus.kibir", -sinirla(Math.floor(sohret / 40), HUY_NAM_TAVANI), { huy: HUYLAR[npc.h] ?? "" });
  }
  return toplam;
}

/** Dostunun dostu: en az 4 mevsimlik dostlarının dolaysız görüşünün %10'u, ±10. */
function dostunDostu(kasaba: Kasaba, npc: Npc, kar: Karakter, ili: IliskiHaritasi | undefined, ay: number): number {
  let ham = 0;
  for (const b of npc.b) {
    if (b[1] !== 1 || ay - b[3] < BAG_ESKI_AY) continue;
    const dost = kasaba.dizin.get(b[0]);
    if (dost) ham += dolaysiz(kasaba, dost, kar, ili, ay) * DOST_DOSTU_ORANI;
  }
  return sinirla(Math.round(ham), DOST_DOSTU_TAVANI);
}

function topla(kasaba: Kasaba, npc: Npc, kar: Karakter, ili: IliskiHaritasi | undefined, ay: number, kalemler?: Kalem[]): number {
  let ham = dolaysiz(kasaba, npc, kar, ili, ay, kalemler);
  const dd = dostunDostu(kasaba, npc, kar, ili, ay);
  if (dd !== 0) {
    ham += dd;
    kalemler?.push({ k: "gorus.dostunDostu", d: dd });
  }
  const toplam = ham > GORUS_SINIRI ? GORUS_SINIRI : ham < -GORUS_SINIRI ? -GORUS_SINIRI : ham;
  if (toplam !== ham) kalemler?.push({ k: "gorus.sinir", d: toplam - ham });
  return toplam;
}

/** Görüş dökümü: kalemler ve toplam (toplam = kalemlerin toplamı). */
export function gorus(kasaba: Kasaba, npc: Npc, kar: Karakter, ili: IliskiHaritasi | undefined, ay: number): Dokum {
  const kalemler: Kalem[] = [];
  const toplam = topla(kasaba, npc, kar, ili, ay, kalemler);
  return { toplam, kalemler };
}

/** Motorun kullandığı değer; gorus().toplam ile birebir aynıdır (aynı yol, döküm yazılmaz). */
export function gorusDegeri(kasaba: Kasaba, npc: Npc, kar: Karakter, ili: IliskiHaritasi | undefined, ay: number): number {
  return topla(kasaba, npc, kar, ili, ay);
}

/** NPC'nin başka bir NPC'ye bakışı: aile bağı ya da dostluk/rekabet bağı; bilinmiyorsa undefined. */
export function npcNpcBakisi(a: Npc, b: Npc): { tur: string; deger: number } | undefined {
  if (a.es === b.i) return { tur: "es", deger: 60 };
  if (b.an === a.i || b.ba === a.i) return { tur: "evlat", deger: 50 };
  if (a.an === b.i || a.ba === b.i) return { tur: b.k ? "anne" : "baba", deger: 50 };
  if ((a.an && a.an === b.an) || (a.ba && a.ba === b.ba)) return { tur: "kardes", deger: 30 };
  const bag = a.b.find((x) => x[0] === b.i);
  if (bag) return { tur: bag[1] === 1 ? "dost" : "rakip", deger: bag[2] };
  return undefined;
}

