// Sultanlık (tek, düşük frekanslı küresel kayıt): Sultan (başta NPC, D-40), Divan, hazine, Moğol tutumu ve Sultan
// meşruiyeti. Bölgeler ayda bir rapor + haraç gönderir (anahtarlı, tekrar güvenli); Sultanlık ay dönümünden
// SULTANLIK_GECIKME_MS sonra Moğol talebini hazineden öder (akçe dünyadan çıkar: sink) ve tutumu günceller.
// Değişmez: giren = hazine + cikan. Saf fonksiyonlar.

import { BEYLIKLER } from "../dunya-veri.ts";
import { AY_MS, DUNYA_BASLANGICI_MS } from "../saat.ts";
import { kayitEkle, npcTutucu } from "./makam.ts";
import { sultanMesruiyeti } from "./mesruiyet.ts";
import { mogolAyi, mogolGorunumu, mogolTalebi } from "./mogol.ts";
import { BASLANGIC, MESRUIYET, MOGOL, SULTANLIK_GECIKME_MS } from "./sabitler.ts";
import type { BolgeRaporu, SultanlikDurumu, SultanlikOzeti, Tutucu } from "./tipler.ts";

/** [PARAMETRE] Sultan'ın atadığı NPC Divan üyesi sayısı (bölge temsilcileri ayrıca). */
export const DIVAN_NPC = 3;
/** Alınan haraç anahtarlarının tutulduğu süre (ay). */
const HARAC_SAKLAMA_AY = 36;

export function sultanlikKur(ay: number): SultanlikDurumu {
  const d: SultanlikDurumu = {
    v: 1,
    ay,
    sultan: npcTutucu("sultan"),
    divan: [...Array.from({ length: DIVAN_NPC }, (_, i) => npcTutucu(`divan:${i}`)), ...BEYLIKLER.map((b) => npcTutucu(`divanTemsilcisi:${b.id}:${ay}`))],
    hazine: 0,
    giren: 0,
    cikan: 0,
    mogol: { tutum: 0, gerilim: 0, gecikme: 0, nedenler: [] },
    mesruiyet: { puan: 50, kademe: "dengeli", nedenler: [] },
    raporlar: {},
    harac: {},
    haksiz: [],
    kayit: [],
    kn: 0,
  };
  d.hazine = BASLANGIC.hazine;
  d.giren = BASLANGIC.hazine;
  kayitEkle(d, ay, "baslangic", "kurum", { k: "kayit.baslangic", p: { tutar: BASLANGIC.hazine } }, { akce: BASLANGIC.hazine, kasa: d.hazine });
  return d;
}

/** Sultanlığın değerlendirdiği son ay (ay dönümünden SULTANLIK_GECIKME_MS sonra). */
export function sultanlikAyiSimdi(simdi: number): number {
  return Math.floor((simdi - DUNYA_BASLANGICI_MS - SULTANLIK_GECIKME_MS) / AY_MS);
}

export function sultanlikTutarli(d: SultanlikDurumu): boolean {
  return Math.abs(d.giren - (d.hazine + d.cikan)) < 1e-6 && d.hazine >= 0;
}

/** Bölge raporu ve haracı. Haraç anahtarı daha önce alındıysa ikinci kez sayılmaz. Dönen: yeni mi. */
export function raporAl(d: SultanlikDurumu, bolge: string, rapor: BolgeRaporu, harac: { anahtar: string; tutar: number } | null, temsilci?: Tutucu): boolean {
  const onceki = d.raporlar[bolge];
  const yeniAy = !onceki || onceki.ay < rapor.ay;
  if (yeniAy) {
    d.raporlar[bolge] = rapor;
    haksizAzilBildir(d, rapor.sultanHaksiz);
  }
  if (temsilci) {
    const i = BEYLIKLER.findIndex((b) => b.id === bolge);
    if (i >= 0) d.divan[DIVAN_NPC + i] = temsilci;
  }
  if (!harac || d.harac[harac.anahtar] !== undefined || !(harac.tutar > 0)) return false;
  d.harac[harac.anahtar] = rapor.ay;
  d.hazine += harac.tutar;
  d.giren += harac.tutar;
  kayitEkle(d, d.ay, "haracAlindi", bolge, { k: "kayit.haracAlindi", p: { bolge, tutar: harac.tutar } }, { akce: harac.tutar, kasa: d.hazine });
  return true;
}

/** Bir ay: Moğol talebi hazineden (sink), tutum adımı (kayıtlı girdiler), Sultan meşruiyeti. */
export function sultanlikAyi(d: SultanlikDurumu, ay: number): void {
  d.ay = ay;
  const talep = mogolTalebi(d.mogol.tutum);
  const odenen = Math.min(talep, d.hazine);
  if (odenen > 0) {
    d.hazine -= odenen;
    d.cikan += odenen;
    kayitEkle(d, ay, "mogolHaraci", "sultan", { k: "kayit.mogolHaraci", p: { tutar: odenen, talep } }, { akce: -odenen, kasa: d.hazine });
  }
  const bolgeler = BEYLIKLER.map((b) => d.raporlar[b.id]);
  const buAy = bolgeler.map((r) => (r && r.ay === ay ? r : undefined));
  const eksik = buAy.filter((r) => !r || r.haracOdenen < r.haracBeklenen).length;
  const zayif = buAy.filter((r) => r?.kademe === "zayif").length;
  const yeniOzerklik = buAy.filter((r) => r?.yeniOzerklik).length;
  const onceki = d.mogol.tutum;
  const t = mogolAyi(d.mogol, { odemeOrani: talep > 0 ? odenen / talep : 1, eksikBolge: eksik, zayifBolge: zayif, yeniOzerklik });
  if (t.degisti) {
    kayitEkle(d, ay, "mogolFermani", "mogol", { k: "kayit.mogolFermani", p: { onceki: MOGOL.tutumlar[onceki] ?? "", yeni: MOGOL.tutumlar[d.mogol.tutum] ?? "" } });
  }
  d.haksiz = d.haksiz.filter((a) => a > ay - MESRUIYET.pencere);
  const puanlar = bolgeler.filter((r): r is BolgeRaporu => r !== undefined).map((r) => r.mesruiyet);
  d.mesruiyet = sultanMesruiyeti({
    valiDestegi: (BEYLIKLER.length - eksik) / BEYLIKLER.length,
    halk: puanlar.length > 0 ? puanlar.reduce((a, b) => a + b, 0) / puanlar.length : 50,
    mogolTutum: d.mogol.tutum,
    haksizAzil: d.haksiz.length,
  });
  for (const [k, a] of Object.entries(d.harac)) if (a < ay - HARAC_SAKLAMA_AY) delete d.harac[k];
}

/** Kaçırılan ayları sırayla işler (alarm kaçsa da tekrar güvenli). */
export function sultanlikYetistir(d: SultanlikDurumu, simdi: number, azami = 24): number {
  const hedef = sultanlikAyiSimdi(simdi);
  let n = 0;
  if (hedef - d.ay > azami) d.ay = hedef - azami;
  while (d.ay < hedef) {
    sultanlikAyi(d, d.ay + 1);
    n++;
  }
  return n;
}

/** Bölgelerin Sultanlık özetini kaydettiği haksız azil bildirimi (Sultan meşruiyeti: adalet). */
export function haksizAzilBildir(d: SultanlikDurumu, adet: number): void {
  for (let i = 0; i < adet; i++) d.haksiz.push(d.ay);
}

export function sultanlikOzeti(d: SultanlikDurumu): SultanlikOzeti {
  return {
    ay: d.ay,
    sultan: { ad: d.sultan.ad, npc: d.sultan.npc },
    hazine: d.hazine,
    mesruiyet: d.mesruiyet,
    mogol: mogolGorunumu(d.mogol),
  };
}

export function sultanlikGorunumu(d: SultanlikDurumu) {
  return {
    ...sultanlikOzeti(d),
    divan: d.divan.map((t) => ({ ad: t.ad, npc: t.npc })),
    defter: { giren: d.giren, cikan: d.cikan, tutarli: sultanlikTutarli(d) },
    kayit: d.kayit.slice(-20),
  };
}
