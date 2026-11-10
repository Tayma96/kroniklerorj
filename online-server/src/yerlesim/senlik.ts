// Şenlikler (Ek A §3.5, E7; D-36): takvimden ÖNCEDEN İLANLI, birkaç gerçek gün açık pencereli bayram ve şenlikler.
// Çift yıllarda Nevruz (Mart), tek yıllarda Hasat Bayramı (Eylül); ilan penceresi açılıştan önce görünür. Katkı: yemek
// (mal), süs (mal) ya da hayır (akçe; dünyadan çıkar, kimseye geçmez). Katkı hem topluluk anı hem Debdebe yüzeyidir:
// Cömertler Levhası katılanları adıyla, alfabe sırasıyla listeler; TUTAR VE SIRA GÖSTERMEZ. Kaçırmak ceza değildir:
// katılmayan hiçbir şey yitirmez. Kapanışta en az bir katılım varsa kasaba morali biraz artar. Ödül şenlik başına
// tek sefer (gönül + nam; nam meşrep hayır çarpanıyla, aylık nam tavanıyla). Saf fonksiyonlar.

import { malBul, type MalId } from "../icerik/mallar.ts";
import { takvim } from "../saat.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { halDegistir } from "./hal.ts";
import { namEkle, takatHarca } from "./karakter.ts";
import { mesrepNam } from "./mesrep.ts";
import { envanterEkle } from "./npc-taban.ts";
import { KATKI_MALLARI } from "./ortak-dert.ts";
import { gostergeDegistir, toplulukAl } from "./topluluk-kayit.ts";
import type { Karakter, Kasaba, OlayTaslagi } from "./tipler.ts";

/** [PARAMETRE] Şenlik takvimi: takvim ayı ve yıl çiftliği (0 çift, 1 tek). */
export const SENLIKLER = [
  { id: "nevruz", ay: 3, yil: 0 },
  { id: "hasatBayrami", ay: 9, yil: 1 },
] as const;
export type SenlikId = (typeof SENLIKLER)[number]["id"];
/** [PARAMETRE] Açık pencere ve ilan süresi (oyun ayı; 12 gerçek saat = 1 ay → 2 gerçek gün). */
export const SENLIK_SURE_AY = 4;
export const SENLIK_ILAN_AY = 4;
export const SENLIK_KATKI_TURLERI = ["yemek", "sus", "hayir"] as const;
export type SenlikKatkisi = (typeof SENLIK_KATKI_TURLERI)[number];
/** [PARAMETRE] Süs malları; yemek malları ortak dert erzak listesidir. */
export const SUS_MALLARI: readonly MalId[] = ["bez", "kumas", "oyma", "kece", "giysi", "saz", "astar"];
/** [PARAMETRE] Kişi başı katkı sayısı, katkı başına mal adedi, hayır akçesi aralığı, takat bedeli. */
export const SENLIK_KATKI_EN_COK = 3;
export const SENLIK_ADET_EN_COK = 10;
export const SENLIK_HAYIR_EN_AZ = 1;
export const SENLIK_HAYIR_EN_COK = 50;
export const SENLIK_TAKAT = 1;
/** [PARAMETRE] Tek seferlik ödül (gönül, cömertlik namı tabanı) ve kapanışta moral artışı. */
export const SENLIK_GONUL = 4;
export const SENLIK_NAM = 2;
export const SENLIK_MORAL = 5;
export const SENLIK_TUTULAN = 3;
export const LEVHA_EN_COK = 200;

/** Katkı kaydı: şenlik kimliği ("nevruz-1252"), türü, açılış/bitiş, katılanlar (ad + türler; tutar tutulur ama
 * levhada gösterilmez), kapandı mı. */
export interface SenlikKaydi {
  i: string;
  t: SenlikId;
  ac: number;
  bt: number;
  k: { o: string; ad: string; t: SenlikKatkisi[]; n: number }[];
  kp?: 1;
}

export interface SenlikAni {
  id: string;
  tur: SenlikId;
  durum: "ilan" | "acik";
  acilis: number;
  bitis: number;
}

/** `ay` anında ilanda ya da açık olan şenlik (en çok bir). */
export function senlikDurumu(ay: number): SenlikAni | undefined {
  for (let ileri = 0; ileri <= SENLIK_ILAN_AY + SENLIK_SURE_AY; ileri++) {
    // `ay - ileri + SENLIK_ILAN_AY` açılış adayı: [ay - SURE + 1, ay + ILAN] aralığını tarar.
    const ac = ay + SENLIK_ILAN_AY - ileri;
    const t = takvim(ac);
    const s = SENLIKLER.find((x) => x.ay === t.ay && ((t.yil % 2) + 2) % 2 === x.yil);
    if (!s) continue;
    const bt = ac + SENLIK_SURE_AY - 1;
    if (ay > bt) continue;
    if (ay >= ac) return { id: `${s.id}-${t.yil}`, tur: s.id, durum: "acik", acilis: ac, bitis: bt };
    if (ac - ay <= SENLIK_ILAN_AY) return { id: `${s.id}-${t.yil}`, tur: s.id, durum: "ilan", acilis: ac, bitis: bt };
  }
  return undefined;
}

/** Ay dönümü: ilan ve açılış olayları; biten şenlik kapanır (katılım varsa moral artar). Kaçırana etki yok. */
export function senlikDonumu(k: Kasaba, ay: number): OlayTaslagi[] {
  const olaylar: OlayTaslagi[] = [];
  const s = senlikDurumu(ay);
  if (s && s.durum === "ilan" && s.acilis - ay === SENLIK_ILAN_AY) {
    olaylar.push({ t: "senlik", w: "", h: "", g: "", n: 5, k: "olay.senlik.ilan", p: { senlik: s.tur, acilis: s.acilis, bitis: s.bitis } });
  }
  if (s && s.durum === "acik" && s.acilis === ay) {
    olaylar.push({ t: "senlik", w: "", h: "", g: "", n: 6, k: "olay.senlik.acildi", p: { senlik: s.tur, bitis: s.bitis } });
  }
  const tl = k.tl;
  if (!tl) return olaylar;
  for (const r of tl.sn) {
    if (r.kp || ay <= r.bt) continue;
    r.kp = 1;
    const fark = r.k.length > 0 ? gostergeDegistir(tl, "moral", SENLIK_MORAL) : 0;
    olaylar.push({ t: "senlik", w: "", h: "", g: "", n: 5, k: "olay.senlik.bitti", p: { senlik: r.t, katilan: r.k.length, moral: fark } });
  }
  const kapali = tl.sn.filter((r) => r.kp);
  if (kapali.length > SENLIK_TUTULAN) {
    const sil = new Set(kapali.slice(0, kapali.length - SENLIK_TUTULAN));
    tl.sn = tl.sn.filter((r) => !sil.has(r));
  }
  return olaylar;
}

/** POST /v1/senlik {katki: yemek|sus|hayir, mal?, adet?, tutar?}: yalnız açık şenlikte. */
export function senlikKatki(k: Kasaba, kar: Karakter, govde: Record<string, unknown>, ay: number): Sonuc<{ yanit: Record<string, unknown>; olaylar: OlayTaslagi[] }> {
  const s = senlikDurumu(ay);
  if (!s || s.durum !== "acik") return hata("senlik_yok");
  const tur = govde.katki;
  if (typeof tur !== "string" || !(SENLIK_KATKI_TURLERI as readonly string[]).includes(tur)) return hata("katki_gecersiz");
  const katki = tur as SenlikKatkisi;
  const tl = toplulukAl(k);
  let r = tl.sn.find((x) => x.i === s.id);
  const satir = r?.k.find((x) => x.o === kar.o);
  if ((satir?.n ?? 0) >= SENLIK_KATKI_EN_COK) return hata("katki_siniri");
  let mal: MalId | undefined;
  let adet = 0;
  let tutar = 0;
  if (katki === "hayir") {
    tutar = typeof govde.tutar === "number" && Number.isInteger(govde.tutar) ? govde.tutar : 0;
    if (tutar < SENLIK_HAYIR_EN_AZ || tutar > SENLIK_HAYIR_EN_COK) return hata("katki_gecersiz");
    if (kar.pa < tutar) return hata("para_yok");
  } else {
    const liste = katki === "yemek" ? (KATKI_MALLARI.erzak ?? []) : SUS_MALLARI;
    mal = malBul(govde.mal);
    adet = typeof govde.adet === "number" && Number.isInteger(govde.adet) ? govde.adet : 0;
    if (!mal || !liste.includes(mal) || adet < 1 || adet > SENLIK_ADET_EN_COK) return hata("katki_gecersiz");
    if ((kar.ev?.[mal] ?? 0) < adet) return hata("mal_yok");
  }
  if (!takatHarca(kar, ay, SENLIK_TAKAT)) return hata("takat_yok");
  if (mal) envanterEkle(kar, mal, -adet);
  if (tutar) kar.pa -= tutar;
  if (!r) {
    r = { i: s.id, t: s.tur, ac: s.acilis, bt: s.bitis, k: [] };
    tl.sn.push(r);
  }
  const odul: { gonul?: number; nam?: number } = {};
  if (!satir) {
    const g = halDegistir(kar, ay, { gonul: SENLIK_GONUL }, "hal.neden.senlik").gonul;
    if (g) odul.gonul = g;
    const n = namEkle(kar, ay, "comertlik", mesrepNam(kar, "hediye", SENLIK_NAM));
    if (n) odul.nam = n;
    if (r.k.length < LEVHA_EN_COK) r.k.push({ o: kar.o, ad: kar.ad, t: [katki], n: 1 });
  } else {
    satir.n++;
    if (!satir.t.includes(katki)) satir.t.push(katki);
  }
  return basarili({
    yanit: { senlik: senlikGorunumu(k, kar, ay), katki: { tur: katki, ...(mal ? { mal, adet } : {}), ...(tutar ? { tutar } : {}) }, odul },
    olaylar: [{ t: "senlik", w: kar.o, h: "", g: kar.o, n: 3, k: "olay.senlik.katki", p: { senlik: s.tur, katki } }],
  });
}

/** Cömertler Levhası: yalnız adlar ve katkı türleri, ADA GÖRE (tutar ve sıra yok). */
export function comertlerLevhasi(r: SenlikKaydi | undefined) {
  if (!r) return [];
  return [...r.k].sort((a, b) => a.ad.localeCompare(b.ad, "tr")).map((x) => ({ id: x.o, ad: x.ad, katkilar: [...x.t].sort() }));
}

/** Görünüm: ilan/açık şenlik, levha, benim katkı sayım, kurallar; son kapanan şenliğin levhası. */
export function senlikGorunumu(k: Kasaba, kar: Karakter, ay: number) {
  const s = senlikDurumu(ay);
  const r = s ? k.tl?.sn.find((x) => x.i === s.id) : undefined;
  const son = [...(k.tl?.sn ?? [])].reverse().find((x) => x.kp);
  const benim = r?.k.find((x) => x.o === kar.o)?.n ?? 0;
  return {
    simdiki: s ? { ...s, levha: comertlerLevhasi(r), benim: { sayi: benim, kalan: SENLIK_KATKI_EN_COK - benim } } : null,
    sonKapanan: son ? { id: son.i, tur: son.t, levha: comertlerLevhasi(son) } : null,
    kurallar: {
      sure: SENLIK_SURE_AY,
      ilan: SENLIK_ILAN_AY,
      katkiEnCok: SENLIK_KATKI_EN_COK,
      adetEnCok: SENLIK_ADET_EN_COK,
      hayir: { enAz: SENLIK_HAYIR_EN_AZ, enCok: SENLIK_HAYIR_EN_COK },
      takat: SENLIK_TAKAT,
      odul: { gonul: SENLIK_GONUL, nam: SENLIK_NAM },
      moral: SENLIK_MORAL,
      kacirmaCezasi: 0,
      susMallari: SUS_MALLARI,
      takvim: SENLIKLER,
    },
  };
}
