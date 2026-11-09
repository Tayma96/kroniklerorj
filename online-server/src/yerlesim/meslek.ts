// Meslek kaydı ve beceri puanı (ana tasarım §5, beceri ağacı v2 spec 2026-11-09). Saf fonksiyonlar; karakteri
// yerinde değiştirir. Kademe: çırak → kalfa → usta → pir (her meslekte ayrı). Tam Özgürlük: öğrenilmiş beceri
// karaktere aittir, meslek değiştirmek hiçbir beceriyi silmez; `dugumSeviyesi` her meslekte bakar. Tecrübe faaliyetin
// mesleğine yazılır; her bar dolduğunda o mesleğe özel 1 beceri puanı, bar her puanda uzar, meslek başına tavan var.
// Öğrenme sırası, iptal, kısaltma ve yeniden düzenleme `beceri.ts`'dedir.

import { beceriDugumu, gocKarsiligi } from "../icerik/agaclar/index.ts";
import { MESLEKLER_ONLINE, meslekBul, type Kademe, type MeslekId } from "../icerik/meslekler.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { aileMeslegiCarpani } from "./hanedan.ts";
import { karakterYasi } from "./karakter.ts";
import type { Karakter } from "./tipler.ts";

export interface MeslekIlerleme {
  kd: Kademe;
  /** Tecrübe (hizmet puanı: gerçek iş ve teslimat). */
  hz: number;
  /** Kalfa yaptığı çırak sayısı (pir şartı; usta-çırak teklifiyle artar). */
  cy: number;
  /** v2: düğüm kimliği → öğrenilmiş seviye. */
  sv?: Record<string, number>;
  /** Göçle verilen puan: v1 düğümlerinin yeni karşılıklarının bedeli (oyuncu puan kaybetmez). */
  gp?: number;
  /** v1 (eski kayıt): açık dallar ve düğümler; ilk okumada `sv`'ye göçer ve silinir. */
  dl?: string[];
  dg?: string[];
}

export interface MeslekKaydi {
  a: MeslekId | "";
  /** Eski yan meslek (v2'de anlamı yok; geriye uyum için tutulur). */
  y: MeslekId | "";
  s: Partial<Record<MeslekId, MeslekIlerleme>>;
  /** Ana mesleğin son değiştiği ay (yılda bir değişir). */
  at?: number;
  /** v1 geri alma ayı (kullanılmaz). */
  ga?: number;
}

/** [PARAMETRE] Meslek seçimi yaşı (öğrenme dönemi 12→13) ve ağır mesleklerde kalfalık yaşı (Ç7). */
export const MESLEK_YASI = 13;
export const AGIR_KALFA_YASI = 16;
/** [PARAMETRE] Ana meslek en çok bu kadar ayda bir değişir (spec: yılda bir). */
export const MESLEK_DEGISIM_ARALIK = 12;
/** [PARAMETRE] Kademeye çıkmak için gereken toplam tecrübe: kalfa, usta, pir (D-30). Pir yeni tecrübe istemez;
 * usta tecrübesinin üstüne PIR_CIRAK çırak yetiştirmeyi ister. */
export const KADEME_HIZMET: readonly number[] = [0, 24, 72, 72];
/** [PARAMETRE] Pir olmak için kalfa yapılmış çırak sayısı. */
export const PIR_CIRAK = 2;
/** [PARAMETRE] İlk beceri puanı için gereken tecrübe; her puandan sonra bar bu kadar uzar; meslek başına puan
 * tavanı (Demirci ağacının tamamı ~82 puan: tavan ağacın yarısını açar, oyuncu dal seçer). Başlangıç puanı yok. */
export const PUAN_TECRUBE = 6;
export const PUAN_ARTIS = 1;
export const PUAN_TAVANI = 40;

export interface BeceriPuani {
  tecrube: number;
  /** Tecrübeden ve göçten kazanılan (tavanla kırpılı). */
  kazanilan: number;
  /** Öğrenilmiş seviyelerin ve süren öğrenmenin bedeli. */
  harcanan: number;
  kalan: number;
  tavan: number;
  /** Şu anki barın uzunluğu ve doluluğu; tavandaysa null. */
  bar: number | null;
  barDolu: number;
  /** Bir sonraki puana kalan tecrübe; tavandaysa null. */
  sonrakiPuan: number | null;
  /** Bir sonraki kademeye gereken toplam tecrübe; pir ise null. */
  sonrakiKademe: number | null;
}

/** Tecrübeden kazanılan puan ve şu anki bar. */
export function tecrubePuani(hz: number): { puan: number; bar: number; dolu: number } {
  let puan = 0;
  let bar = PUAN_TECRUBE;
  let kalan = Math.max(0, hz);
  while (puan < PUAN_TAVANI && kalan >= bar) {
    kalan -= bar;
    puan++;
    bar += PUAN_ARTIS;
  }
  return { puan, bar, dolu: kalan };
}

/** Bir düğümün ilk `seviye` seviyesinin toplam bedeli. */
export function seviyeBedeli(dugumId: string, seviye: number): number {
  const d = beceriDugumu(dugumId);
  if (!d) return 0;
  return d.seviyeler.slice(0, Math.max(0, seviye)).reduce((a, s) => a + s.bedel, 0);
}

/** v1 kaydını v2'ye çevirir (tekrar güvenli): her eski düğüm yeni karşılığının seviyesine; bedeli göç puanı olur. */
export function ilerlemeGoc(i: MeslekIlerleme, m: MeslekId): void {
  if (i.dg === undefined && i.dl === undefined) return;
  const sv = (i.sv ??= {});
  let gp = i.gp ?? 0;
  for (const eski of i.dg ?? []) {
    const y = gocKarsiligi(eski);
    if (!y || !y.dugum.startsWith(`${m}.`)) continue;
    const once = sv[y.dugum] ?? 0;
    if (y.seviye <= once) continue;
    gp += seviyeBedeli(y.dugum, y.seviye) - seviyeBedeli(y.dugum, once);
    sv[y.dugum] = y.seviye;
  }
  if (gp > 0) i.gp = gp;
  delete i.dg;
  delete i.dl;
}

/** Puan görünümü; `bekleyen`: bu meslekte süren öğrenmenin ayrılmış bedeli. */
export function beceriPuani(i: MeslekIlerleme, bekleyen = 0): BeceriPuani {
  const tp = tecrubePuani(i.hz);
  const kazanilan = Math.min(PUAN_TAVANI, tp.puan + (i.gp ?? 0));
  const harcanan = Object.entries(i.sv ?? {}).reduce((a, [id, s]) => a + seviyeBedeli(id, s), 0) + bekleyen;
  const tavanda = tp.puan >= PUAN_TAVANI || kazanilan >= PUAN_TAVANI;
  return {
    tecrube: i.hz,
    kazanilan,
    harcanan,
    kalan: kazanilan - harcanan,
    tavan: PUAN_TAVANI,
    bar: tavanda ? null : tp.bar,
    barDolu: tavanda ? 0 : tp.dolu,
    sonrakiPuan: tavanda ? null : tp.bar - tp.dolu,
    sonrakiKademe: i.kd >= 3 ? null : KADEME_HIZMET[i.kd + 1]!,
  };
}

export function meslekKaydi(k: Karakter): MeslekKaydi {
  k.ms ??= { a: "", y: "", s: {} };
  for (const [m, i] of Object.entries(k.ms.s)) if (i) ilerlemeGoc(i, m as MeslekId);
  return k.ms;
}

/** Mesleğin ilerlemesi (yoksa açılır). */
export function ilerleme(k: Karakter, id: MeslekId): MeslekIlerleme {
  const kayit = meslekKaydi(k);
  return (kayit.s[id] ??= { kd: 0, hz: 0, cy: 0, sv: {} });
}

/** Süren öğrenmenin bu meslekteki ayrılmış bedeli. */
export function bekleyenPuan(k: Karakter, m: MeslekId): number {
  return k.bo && k.bo.t === "o" && k.bo.m === m ? k.bo.p : 0;
}

/** Bütün meslek ilerlemeleri için tecrübe ve beceri puanı görünümü. */
export function beceriGorunumu(k: Karakter): Partial<Record<MeslekId, BeceriPuani>> {
  const s = meslekKaydi(k).s;
  return Object.fromEntries(Object.entries(s).map(([m, i]) => [m, beceriPuani(i!, bekleyenPuan(k, m as MeslekId))])) as Partial<
    Record<MeslekId, BeceriPuani>
  >;
}

/** Ana meslek seçimi: 13 yaş; seçildikten sonra yılda bir değişir. Beceriler hiçbir zaman silinmez. */
export function meslekSec(k: Karakter, id: unknown, ay: number): Sonuc<MeslekKaydi> {
  const m = meslekBul(id);
  if (!m) return hata("meslek_gecersiz");
  if (karakterYasi(k, ay) < MESLEK_YASI) return hata("yas_kapisi");
  const kayit = meslekKaydi(k);
  if (kayit.a === m.id) return basarili(kayit);
  if (kayit.a && kayit.at !== undefined && ay - kayit.at < MESLEK_DEGISIM_ARALIK) return hata("meslek_degisim_dolu");
  kayit.a = m.id;
  kayit.at = ay;
  if (kayit.y === m.id) kayit.y = "";
  ilerleme(k, m.id);
  return basarili(kayit);
}

/** Eski yan meslek seçimi (v2'de etkisiz etiket; geriye uyum). */
export function yanSec(k: Karakter, id: unknown, ay: number): Sonuc<MeslekKaydi> {
  const m = meslekBul(id);
  if (!m) return hata("meslek_gecersiz");
  const kayit = meslekKaydi(k);
  if (!kayit.a) return hata("meslek_yok");
  if (kayit.a === m.id) return hata("meslek_gecersiz");
  if (karakterYasi(k, ay) < MESLEK_YASI) return hata("yas_kapisi");
  kayit.y = m.id;
  ilerleme(k, m.id);
  return basarili(kayit);
}

/**
 * Tecrübe ekler: faaliyetin mesleğine TAM yazılır (Tam Özgürlük: silah döven demircilik tecrübesi kazanır, aktif
 * mesleği çiftçi olsa bile). Farm sınırı faaliyetin kendisindedir (takat, azalan getiri, kota) ve puan tavanı.
 * Hanedanın aile mesleği çarpanı uygulanır. Eklenen miktarı döndürür.
 */
export function hizmetEkle(k: Karakter, id: MeslekId, puan: number): number {
  if (!(puan > 0) || !Object.hasOwn(MESLEKLER_ONLINE, id)) return 0;
  const eklenen = puan * aileMeslegiCarpani(k, id);
  ilerleme(k, id).hz += eklenen;
  return eklenen;
}

/** Kademe atlama: her meslekte ayrı (aktif meslek olması gerekmez). */
export function kademeAtla(k: Karakter, id: unknown, ay: number): Sonuc<Kademe> {
  const m = meslekBul(id);
  if (!m) return hata("meslek_gecersiz");
  const i = ilerleme(k, m.id);
  if (i.kd >= 3) return hata("kademe_kapali");
  const hedef = (i.kd + 1) as Kademe;
  if (i.hz < KADEME_HIZMET[hedef]!) return hata("kademe_kapali");
  if (hedef === 1 && m.agir && karakterYasi(k, ay) < AGIR_KALFA_YASI) return hata("kademe_kapali");
  if (hedef === 3 && i.cy < PIR_CIRAK) return hata("kademe_kapali");
  i.kd = hedef;
  return basarili(hedef);
}

/** Düğümün öğrenilmiş seviyesi (karakterin o meslekteki ilerlemesinden; meslek değiştirse de kalır). */
export function dugumSeviyesi(k: Karakter, dugumId: string): number {
  const meslek = dugumId.split(".")[0] as MeslekId;
  if (!Object.hasOwn(MESLEKLER_ONLINE, meslek)) return 0;
  const i = k.ms?.s[meslek];
  if (!i) return 0;
  ilerlemeGoc(i, meslek);
  return i.sv?.[dugumId] ?? 0;
}

/** Düğüm en az bu seviyede öğrenilmiş mi (her meslekte; Tam Özgürlük). */
export function dugumAcikMi(k: Karakter, dugumId: string, seviye = 1): boolean {
  return dugumSeviyesi(k, dugumId) >= seviye;
}
