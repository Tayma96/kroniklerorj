// Meşrep (Ek A §2.3, E5): üç eksen — Elcömertliği (cömert ↔ hesaplı), Cesaret (temkinli ↔ gözü pek), Gurur
// (mütevazı ↔ gururlu). Puan harcanmaz, SEÇİLİR; her uç bir avantaj ve bir bedel taşır, ikisi de sayısıyla yazılı döner
// (gizli sayı yok). "orta" seçilen eksende etki yoktur. İlk seçim öğrenme döneminin sonunda (13 yaş) yapılır;
// yeniden seçim (D-32 önerisi) yalnız son seçimden sonra büyük bir yaşam olayı olduysa açılır (onluk yaş dönümü,
// evlilik, ilk çocuk, meslekte kademe atlama). Etkiler tek yerden okunur: eylem şansı (`mesrepSans`), hayır namı
// (`mesrepNam`), NPC görüşü (`mesrepGorus`), riskli üçgen eylemleri (`mesrepRiskSansi`, `mesrepYakalanma`), ortak dert
// nöbeti ve makam/ahi başı (`mesrepEtkisi`). Saf fonksiyonlar.

import { basarili, hata, type Sonuc } from "../tipler.ts";
import { karakterYasi } from "./karakter.ts";
import type { Karakter } from "./tipler.ts";

export const MESREP_EKSENLERI = {
  el: ["comert", "hesapli"],
  cesaret: ["temkinli", "gozupek"],
  gurur: ["mutevazi", "gururlu"],
} as const;
export type MesrepEkseni = keyof typeof MESREP_EKSENLERI;
export const EKSEN_SIRASI: readonly MesrepEkseni[] = ["el", "cesaret", "gurur"];
export type MesrepUcu = (typeof MESREP_EKSENLERI)[MesrepEkseni][number];

/** [PARAMETRE] İlk seçim yaşı (öğrenme dönemi 12 → 13 biter). */
export const MESREP_YASI = 13;
/** [PARAMETRE] Hayır sayılan eylemler (nam çarpanı bunlara uygulanır). */
export const HAYIR_EYLEMLERI: readonly string[] = ["hediye", "yardim"];
/** [PARAMETRE] Uçların etkileri. Avantaj ve bedel ayrı yazılır; görünümde ikisi de döner. */
export const MESREP_ETKI = {
  /** Hayırda nam ×1,5; ayak işinde (pazarlık) şans −5. */
  comert: { hayirNam: 1.5, ayakIsiSans: -5 },
  /** Ayak işinde şans +5; hayırdan nam ×0,5. */
  hesapli: { ayakIsiSans: 5, hayirNam: 0.5 },
  /** Riskli işte (katılım) yakalanma ×0,8; kışkırtma/katılım şansı −5 (fırsatı kaçırır). */
  temkinli: { yakalanma: 0.8, riskSans: -5 },
  /** Kışkırtma/katılım şansı +5 ve ortak dertte nöbet her meslekte açılır; yakalanma ×1,25 (ağır). */
  gozupek: { riskSans: 5, nobet: 1, yakalanma: 1.25 },
  /** NPC görüşü +3 (halkta güven); makam −2, ahi başı şartı +1 kademe. */
  mutevazi: { gorus: 3, makam: -2, ahiKademe: 1 },
  /** Makam +2, ahi başı şartı −1 kademe; NPC görüşü −2 (mağrur bulunur). */
  gururlu: { makam: 2, ahiKademe: -1, gorus: -2 },
} as const satisfies Record<MesrepUcu, Record<string, number>>;

/** Hangi etki hangi uçta avantaj, hangisinde bedeldir (görünüm). */
const AVANTAJ: Readonly<Record<MesrepUcu, readonly string[]>> = {
  comert: ["hayirNam"],
  hesapli: ["ayakIsiSans"],
  temkinli: ["yakalanma"],
  gozupek: ["riskSans", "nobet"],
  mutevazi: ["gorus"],
  gururlu: ["makam", "ahiKademe"],
};

/** Karakterdeki meşrep: her eksende −1 (ilk uç), 0 (orta), 1 (ikinci uç); seçim ayı; o andaki yaşam olayı sayısı. */
export interface MesrepKaydi {
  s: [number, number, number];
  a: number;
  o: number;
}

export function mesrepUclari(k: Pick<Karakter, "mr">): Partial<Record<MesrepEkseni, MesrepUcu>> {
  const s = k.mr?.s;
  const sonuc: Partial<Record<MesrepEkseni, MesrepUcu>> = {};
  if (!s) return sonuc;
  EKSEN_SIRASI.forEach((e, i) => {
    const v = s[i] ?? 0;
    if (v !== 0) sonuc[e] = MESREP_EKSENLERI[e][v < 0 ? 0 : 1];
  });
  return sonuc;
}

function uc(k: Pick<Karakter, "mr">, e: MesrepEkseni): MesrepUcu | undefined {
  return mesrepUclari(k)[e];
}

function deger(u: MesrepUcu | undefined, alan: string): number | undefined {
  if (!u) return undefined;
  return (MESREP_ETKI[u] as Record<string, number>)[alan];
}

/** Eylem şansı kalemi ("sans.mesrep"): yalnız ayak işi (pazarlık). */
export function mesrepSans(k: Pick<Karakter, "mr">, tur: string): number {
  return tur === "ayakIsi" ? (deger(uc(k, "el"), "ayakIsiSans") ?? 0) : 0;
}

/** Hayır eyleminde nam (çarpan uygulanmış, yuvarlanmış). Başka eylemde dokunmaz. */
export function mesrepNam(k: Pick<Karakter, "mr">, tur: string, miktar: number): number {
  if (!HAYIR_EYLEMLERI.includes(tur)) return miktar;
  return Math.round(miktar * (deger(uc(k, "el"), "hayirNam") ?? 1));
}

/** NPC görüş kalemi ("gorus.mesrep"). */
export function mesrepGorus(k: Pick<Karakter, "mr">): number {
  return deger(uc(k, "gurur"), "gorus") ?? 0;
}

/** Riskli üçgen eylemi (kışkırtma, katılım) şans kalemi ("sans.mesrep"). */
export function mesrepRiskSansi(k: Pick<Karakter, "mr">): number {
  return deger(uc(k, "cesaret"), "riskSans") ?? 0;
}

/** Katılımda yakalanma olasılığı çarpanı. */
export function mesrepYakalanma(k: Pick<Karakter, "mr">): number {
  return deger(uc(k, "cesaret"), "yakalanma") ?? 1;
}

/** Kancalar: "makam" (seçim/makam adaylığına puan; siyaset okur), "ahiKademe" (ahi başı teveccüh şartına ek),
 * "nobet" (1: ortak dertte nöbet her meslekte açık). */
export function mesrepEtkisi(k: Pick<Karakter, "mr">, alan: "makam" | "ahiKademe" | "nobet"): number {
  return deger(uc(k, alan === "nobet" ? "cesaret" : "gurur"), alan) ?? 0;
}

/** Büyük yaşam olayları (D-32): onluk yaş dönümleri, evlilik, ilk çocuk, meslek kademeleri toplamı. */
export function yasamOlaylari(k: Karakter, ay: number): { sayi: number; kalemler: { k: string; d: number }[] } {
  const kalemler: { k: string; d: number }[] = [];
  const onluk = Math.floor(karakterYasi(k, ay) / 10);
  if (onluk) kalemler.push({ k: "mesrep.olay.yas", d: onluk });
  if (k.hd?.es || k.hd?.ea !== undefined) kalemler.push({ k: "mesrep.olay.evlilik", d: 1 });
  if ((k.hd?.co?.length ?? 0) > 0) kalemler.push({ k: "mesrep.olay.cocuk", d: 1 });
  let kd = 0;
  for (const i of Object.values(k.ms?.s ?? {})) kd += i?.kd ?? 0;
  if (kd) kalemler.push({ k: "mesrep.olay.kademe", d: kd });
  return { sayi: kalemler.reduce((a, x) => a + x.d, 0), kalemler };
}

/** Seçim açık mı: ilk seçim 13 yaşında; sonrası yalnız yeni bir büyük yaşam olayıyla. */
export function mesrepSecimKapisi(k: Karakter, ay: number): "mesrep_erken" | "mesrep_kilitli" | undefined {
  if (karakterYasi(k, ay) < MESREP_YASI) return "mesrep_erken";
  if (k.mr && yasamOlaylari(k, ay).sayi <= k.mr.o) return "mesrep_kilitli";
  return undefined;
}

/** POST /v1/mesrep {el, cesaret, gurur}: her eksen bir uç ya da "orta". */
export function mesrepSec(k: Karakter, govde: Record<string, unknown>, ay: number): Sonuc<MesrepKaydi> {
  const s: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < EKSEN_SIRASI.length; i++) {
    const e = EKSEN_SIRASI[i]!;
    const v = govde[e];
    if (v === "orta") continue;
    const j = (MESREP_EKSENLERI[e] as readonly string[]).indexOf(typeof v === "string" ? v : "");
    if (j < 0) return hata("mesrep_gecersiz");
    s[i] = j === 0 ? -1 : 1;
  }
  const kapi = mesrepSecimKapisi(k, ay);
  if (kapi) return hata(kapi);
  k.mr = { s, a: ay, o: yasamOlaylari(k, ay).sayi };
  return basarili(k.mr);
}

/** Görünüm: her eksenin iki ucu, avantaj ve bedelleri (i18n anahtarı + değer), seçili uç, yeniden seçim durumu. */
export function mesrepGorunumu(k: Karakter, ay: number) {
  const secili = mesrepUclari(k);
  const olay = yasamOlaylari(k, ay);
  const kapi = mesrepSecimKapisi(k, ay);
  return {
    eksenler: EKSEN_SIRASI.map((e) => ({
      eksen: e,
      secili: secili[e] ?? "orta",
      uclar: MESREP_EKSENLERI[e].map((u) => ({
        uc: u,
        etkiler: Object.entries(MESREP_ETKI[u]).map(([alan, d]) => ({
          k: `mesrep.etki.${alan}`,
          tur: AVANTAJ[u].includes(alan) ? "avantaj" : "bedel",
          p: { deger: d },
        })),
      })),
    })),
    secildi: k.mr !== undefined,
    secimAyi: k.mr?.a ?? null,
    secimAcik: kapi === undefined,
    ...(kapi ? { kapali: kapi } : {}),
    yasamOlaylari: { sayi: olay.sayi, secimdeki: k.mr?.o ?? null, kalemler: olay.kalemler },
    kurallar: { yas: MESREP_YASI, hayirEylemleri: HAYIR_EYLEMLERI },
  };
}
