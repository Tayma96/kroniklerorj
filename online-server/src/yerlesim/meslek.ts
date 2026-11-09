// Meslek ve beceri ağacı (ana tasarım §5.3). Saf fonksiyonlar; karakteri yerinde değiştirir.
// Kademe: çırak → kalfa → usta → pir. Düğüm imkân açar, sayı artırmaz. Meslek değiştirmek ustalığı silmez; açılan
// düğüm her yerde kullanılır (Tam Özgürlük, beceri ağacı v2 §1). Tecrübe faaliyetin mesleğine gider.
// Tecrübe (Berkay, 9 Kasım): o meslekte çalıştıkça tecrübe (hz) birikir; her PUAN_TECRUBE tecrübede o mesleğe
// özel 1 beceri puanı kazanılır ve yalnız o mesleğin ağacında düğüm açmaya harcanır. Kademe toplam tecrübeyle açılır.

import { MESLEKLER_ONLINE, dugumBul, meslekBul, type Kademe, type Meslek, type MeslekId } from "../icerik/meslekler.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { aileMeslegiCarpani } from "./hanedan.ts";
import { karakterYasi } from "./karakter.ts";
import type { Karakter } from "./tipler.ts";

export interface MeslekIlerleme {
  kd: Kademe;
  /** Açık dallar. */
  dl: string[];
  /** Açık düğümler. */
  dg: string[];
  /** Hizmet puanı (gerçek iş ve teslimat). */
  hz: number;
  /** Kalfa yaptığı çırak sayısı (pir şartı). Usta-çırak sistemiyle (E3) artar; o gelene dek pir kapalıdır. */
  cy: number;
}

export interface MeslekKaydi {
  a: MeslekId | "";
  y: MeslekId | "";
  s: Partial<Record<MeslekId, MeslekIlerleme>>;
  /** Son düğüm geri alma ayı (bütün meslekler için tek pişmanlık hakkı). */
  ga?: number;
}

/** [PARAMETRE] Meslek seçimi yaşı (öğrenme dönemi 12→13) ve ağır mesleklerde kalfalık yaşı (Ç7). */
export const MESLEK_YASI = 13;
export const AGIR_KALFA_YASI = 16;
/** [PARAMETRE] Kademeye çıkmak için gereken toplam hizmet: kalfa, usta, pir (D-30). Pir yeni hizmet istemez;
 * usta hizmetinin üstüne PIR_CIRAK çırak yetiştirmeyi ister. */
export const KADEME_HIZMET: readonly number[] = [0, 24, 72, 72];
/** [PARAMETRE] Pir olmak için kalfa yapılmış çırak sayısı. */
export const PIR_CIRAK = 2;
/** [PARAMETRE] Pişmanlık hakkı: iki düğüm geri alma arasında en az bu kadar ay. */
export const GERI_ALMA_ARALIK = 12;
/** [PARAMETRE] Eski kural (yan meslek yarı hız). Beceri ağacı v2 ile tecrübe faaliyetin mesleğine tam yazılır;
 * sabit geriye uyum için durur, kullanılmaz. */
export const YAN_CARPAN = 0.5;
/** [PARAMETRE] Bir beceri puanı için gereken tecrübe ve düğüm bedeli (kademeye göre: çırak, kalfa, usta, pir). */
export const PUAN_TECRUBE = 6;
export const DUGUM_BEDEL: readonly number[] = [1, 2, 3, 4];
/** [PARAMETRE] Mesleğe çırak girince verilen puan: ilk düğüm (çoğu zaman ilk tarif) tecrübesiz açılabilsin. */
export const BASLANGIC_PUANI = 1;

export interface BeceriPuani {
  tecrube: number;
  kazanilan: number;
  harcanan: number;
  kalan: number;
  /** Bir sonraki puana kalan tecrübe (bar). */
  sonrakiPuan: number;
  /** Bir sonraki kademeye gereken toplam tecrübe; pir ise null. */
  sonrakiKademe: number | null;
}

export function beceriPuani(i: MeslekIlerleme): BeceriPuani {
  const tecrube = i.hz;
  const kazanilan = BASLANGIC_PUANI + Math.floor(tecrube / PUAN_TECRUBE);
  const harcanan = i.dg.reduce((a, id) => a + DUGUM_BEDEL[Number(id.split(".")[2])]!, 0);
  return {
    tecrube,
    kazanilan,
    harcanan,
    kalan: kazanilan - harcanan,
    sonrakiPuan: PUAN_TECRUBE - (tecrube % PUAN_TECRUBE),
    sonrakiKademe: i.kd >= 3 ? null : KADEME_HIZMET[i.kd + 1]!,
  };
}

/** Bütün meslek ilerlemeleri için tecrübe ve beceri puanı görünümü (istemci barı ve ağaç için). */
export function beceriGorunumu(k: Karakter): Partial<Record<MeslekId, BeceriPuani>> {
  const s = k.ms?.s ?? {};
  return Object.fromEntries(Object.entries(s).map(([m, i]) => [m, beceriPuani(i!)])) as Partial<Record<MeslekId, BeceriPuani>>;
}

export function meslekKaydi(k: Karakter): MeslekKaydi {
  k.ms ??= { a: "", y: "", s: {} };
  return k.ms;
}

function ilerleme(kayit: MeslekKaydi, id: MeslekId): MeslekIlerleme {
  return (kayit.s[id] ??= { kd: 0, dl: [], dg: [], hz: 0, cy: 0 });
}

/** Ana ya da yan meslekse ilerlemesini, değilse hatayı döndürür. */
function secili(k: Karakter, id: unknown): Sonuc<{ m: Meslek; i: MeslekIlerleme }> {
  const m = meslekBul(id);
  if (!m) return hata("meslek_gecersiz");
  const kayit = meslekKaydi(k);
  if (kayit.a !== m.id && kayit.y !== m.id) return hata("meslek_yok");
  return basarili({ m, i: ilerleme(kayit, m.id) });
}

export function meslekSec(k: Karakter, id: unknown, ay: number): Sonuc<MeslekKaydi> {
  const m = meslekBul(id);
  if (!m) return hata("meslek_gecersiz");
  if (karakterYasi(k, ay) < MESLEK_YASI) return hata("yas_kapisi");
  const kayit = meslekKaydi(k);
  kayit.a = m.id;
  if (kayit.y === m.id) kayit.y = "";
  ilerleme(kayit, m.id);
  return basarili(kayit);
}

export function yanSec(k: Karakter, id: unknown, ay: number): Sonuc<MeslekKaydi> {
  const m = meslekBul(id);
  if (!m) return hata("meslek_gecersiz");
  const kayit = meslekKaydi(k);
  if (!kayit.a) return hata("meslek_yok");
  if (kayit.a === m.id) return hata("meslek_gecersiz");
  if (karakterYasi(k, ay) < MESLEK_YASI) return hata("yas_kapisi");
  kayit.y = m.id;
  ilerleme(kayit, m.id);
  return basarili(kayit);
}

/**
 * Tecrübe (hizmet) ekler: faaliyetin mesleğine TAM yazılır; ana/yan ayrımı yoktur (beceri ağacı v2, Tam Özgürlük:
 * silah döven demircilik tecrübesi kazanır, aktif mesleği çiftçi olsa bile). Farm sınırı faaliyetin kendisindedir
 * (takat, azalan getiri, kota). Hanedanın aile mesleği çarpanı uygulanır. Eklenen miktarı döndürür.
 */
export function hizmetEkle(k: Karakter, id: MeslekId, puan: number): number {
  if (!(puan > 0) || !Object.hasOwn(MESLEKLER_ONLINE, id)) return 0;
  const eklenen = puan * aileMeslegiCarpani(k, id);
  ilerleme(meslekKaydi(k), id).hz += eklenen;
  return eklenen;
}

export function kademeAtla(k: Karakter, id: unknown, ay: number): Sonuc<Kademe> {
  const r = secili(k, id);
  if (!r.ok) return r;
  const { m, i } = r.deger;
  if (i.kd >= 3) return hata("kademe_kapali");
  const hedef = (i.kd + 1) as Kademe;
  if (i.hz < KADEME_HIZMET[hedef]!) return hata("kademe_kapali");
  if (hedef === 1 && m.agir && karakterYasi(k, ay) < AGIR_KALFA_YASI) return hata("kademe_kapali");
  if (hedef === 3 && i.cy < PIR_CIRAK) return hata("kademe_kapali");
  i.kd = hedef;
  return basarili(hedef);
}

export function dalAc(k: Karakter, id: unknown, dal: unknown): Sonuc<string[]> {
  const r = secili(k, id);
  if (!r.ok) return r;
  const { m, i } = r.deger;
  if (typeof dal !== "string" || !m.dallar.includes(dal)) return hata("meslek_gecersiz");
  if (i.dl.includes(dal)) return basarili(i.dl);
  if (i.dl.length >= Math.min(i.kd + 1, 3)) return hata("dal_kapali");
  i.dl.push(dal);
  return basarili(i.dl);
}

export function dugumAc(k: Karakter, id: unknown, dugumId: unknown): Sonuc<string[]> {
  const r = secili(k, id);
  if (!r.ok) return r;
  const { m, i } = r.deger;
  const d = dugumBul(m, dugumId);
  if (!d) return hata("meslek_gecersiz");
  if (i.dg.includes(d.id)) return basarili(i.dg);
  if (!i.dl.includes(d.dal)) return hata("dal_kapali");
  if (d.kd > i.kd) return hata("dugum_kapali");
  if (d.kd > 0 && !i.dg.includes(`${m.id}.${d.dal}.${d.kd - 1}`)) return hata("dugum_kapali");
  // Uzmanlaşma: pir ucu yalnız bir dalda.
  if (d.kd === 3 && i.dg.some((x) => x.endsWith(".3"))) return hata("dugum_kapali");
  if (beceriPuani(i).kalan < DUGUM_BEDEL[d.kd]!) return hata("puan_yok");
  i.dg.push(d.id);
  return basarili(i.dg);
}

export function dugumGeriAl(k: Karakter, id: unknown, dugumId: unknown, ay: number): Sonuc<string[]> {
  const r = secili(k, id);
  if (!r.ok) return r;
  const { m, i } = r.deger;
  const d = dugumBul(m, dugumId);
  if (!d) return hata("meslek_gecersiz");
  if (!i.dg.includes(d.id)) return hata("dugum_kapali");
  if (i.dg.includes(`${m.id}.${d.dal}.${d.kd + 1}`)) return hata("dugum_kapali");
  const kayit = meslekKaydi(k);
  if (ay - (kayit.ga ?? -1e9) < GERI_ALMA_ARALIK) return hata("geri_alma_dolu");
  i.dg = i.dg.filter((x) => x !== d.id);
  kayit.ga = ay;
  return basarili(i.dg);
}

/** Düğüm, karakterin herhangi bir meslek ilerlemesinde açık mı (meslek değiştirse de açık kalır). */
export function dugumAcikMi(k: Karakter, dugumId: string): boolean {
  const meslek = dugumId.split(".")[0] as MeslekId;
  if (!Object.hasOwn(MESLEKLER_ONLINE, meslek)) return false;
  return k.ms?.s[meslek]?.dg.includes(dugumId) ?? false;
}
