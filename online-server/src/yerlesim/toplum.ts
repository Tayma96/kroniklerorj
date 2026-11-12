// Oyuncular arası durum (Faz 3a): teklifler, oyuncu–oyuncu bağları, açık husumetler, engeller ve söylentiler.
// Yerleşim başına tek kayıt (depo anahtarı "tp"; eski kayıtta yok → ilk yazımda kurulur). Yalnız veri biçimleri ve
// küçük yardımcılar; kurallar teklif.ts, iliski.ts, engel.ts, npc-teklif.ts, duzen.ts ve soylenti.ts'dedir.

import type { MeslekId } from "../icerik/meslekler.ts";
import type { Kasaba } from "./tipler.ts";

export const OYUNCU_TEKLIF_TURLERI = ["cirak", "ortak", "borc", "hediye", "gorucu", "is"] as const;
export const IKI_TARAF_ISLERI = ["arabuluculuk", "muhafiz", "mektup"] as const;
export type IkiTarafIsi = (typeof IKI_TARAF_ISLERI)[number];
export const NPC_TEKLIF_TURLERI = ["npcIs", "npcBorc", "npcDunur"] as const;
export type OyuncuTeklifTuru = (typeof OYUNCU_TEKLIF_TURLERI)[number];
export type NpcTeklifTuru = (typeof NPC_TEKLIF_TURLERI)[number];
export type TeklifTuru = OyuncuTeklifTuru | NpcTeklifTuru;

/** acik: cevap bekler · surer: kabul edilmiş süregelen anlaşma (çıraklık, ortaklık, borç) · bitti: tamamlandı ·
 * ret · dustu: cevapsız düştü (cezasız) · geri: gönderen geri çekti · iptal: engelleme ya da taraf yok. */
export type TeklifDurumu = "acik" | "surer" | "bitti" | "ret" | "dustu" | "geri" | "iptal";
export type VarsayilanSonuc = "kabul" | "ret" | "dustu";

export interface Sartlar {
  /** Meslek (çıraklık, ortaklık). */
  m?: MeslekId;
  /** Usta oyuncu (çıraklık). */
  us?: string;
  /** Tutar (borç, hediye, NPC işi, iki taraflı iş ücreti, NPC borcu). */
  tu?: number;
  /** Faiz yüzdesi ve vade (ay sayısı) — borç. */
  fz?: number;
  va?: number;
  /** Borç yönü: ver = gönderen borç verir, iste = gönderen borç ister. */
  yn?: "ver" | "iste";
  /** Gelir payı yüzdesi ve süre (ay) — ortaklık. */
  py?: number;
  sr?: number;
  /** Görücü/dünürcü: aday NPC (yalnız kayıt). */
  dn?: number;
  /** İki taraflı oyuncu işi: arabuluculuk, muhafızlık veya mektup taşıma. */
  it?: IkiTarafIsi;
  /** Mektup işinin üçüncü alıcısı ve özel mesajı (yalnız iş sözleşmesinde). */
  he?: string;
  ms?: string;
  /** Ücretli arabuluculuk işi: NPC hedefi, uzlaşma bedeli, tazminat tutarı ve kabulde açılan talep kimliği. */
  an?: number;
  ab?: import("./bilgi.ts").AraciBedeli;
  am?: number;
  ta?: number;
  /** Armağan (envanterden, Berkay §6.1): mal, adet ve biliniyorsa malı üreten oyuncu. */
  ml?: string;
  mn?: number;
  yp?: string;
}

export interface Teklif {
  i: number;
  t: TeklifTuru;
  /** Gönderen (oyuncu "o.." ya da NPC "n..") ve alıcı (oyuncu). */
  g: string;
  a: string;
  s: Sartlar;
  /** Emanet: gönderenden kilitlenen akçe; iş sözleşmesinde teslimde çalışana ödenir; ret, düşme, geri çekme ya da iptalde iade edilir. Armağan malı da
   * (s.ml × s.mn) gönderenin envanterinden emanete alınır ve aynı yolla iade edilir. İş ücreti teslimde çalışana aktarılır. */
  e: number;
  /** Açılış ayı ve son cevap ayı (bu ay dahil; sonraki dönümde varsayılan uygulanır). */
  ac: number;
  sa: number;
  /** Cevapsız kalınca uygulanacak sonuç (oluşturulurken alıcının olağan düzeninden yazılır). */
  v: VarsayilanSonuc;
  d: TeklifDurumu;
  /** Kabul ve kapanış ayı. */
  ka?: number;
  kp?: number;
  /** Borç: kalan, vade ayı (mutlak), ödenmedi izi (tek sefer söylenti). */
  kl?: number;
  vd?: number;
  od?: 1;
  /** Ortaklık/çıraklık bitiş ayı; ortaklık aylık aktarım sayacı [ay, akçe]. */
  bt?: number;
  pa?: [ay: number, akce: number];
  /** Kapanış nedeni (i18n son eki: "kalfa", "sure", "odendi", "oldu", "kayit", "engel", ...). */
  sn?: string;
}

/** Alınan armağan (vitrin): teklif kimliği, veren ve adı, ay, akçe ve/veya mal, biliniyorsa malı yapan. */
export interface Armagan {
  i: number;
  v: string;
  va: string;
  ay: number;
  tu?: number;
  ml?: string;
  mn?: number;
  yp?: string;
  ypa?: string;
}

/** Oyuncu–oyuncu bağı: a < b (sıralı çift). İstekte `g` isteyendir. */
export interface OyuncuBagi {
  a: string;
  b: string;
  d: "istek" | "dost";
  g?: string;
  ay: number;
}

/** Açık husumet (meydanda ilan edilir; iki taraf ve yerleşim görür). */
export interface Husumet {
  g: string;
  h: string;
  ay: number;
  d: "acik" | "kalkti";
  ka?: number;
}

export const SOYLENTI_TURLERI = ["hediye", "yardim", "hediyeOyuncu", "husumet", "borcOdenmedi", "kalfaYetistirdi"] as const;
export type SoylentiTuru = (typeof SOYLENTI_TURLERI)[number];

export interface Soylenti {
  i: number;
  t: SoylentiTuru;
  /** Konu (söylentinin anlattığı oyuncu) ve hedef (eylemin muhatabı). */
  k: string;
  h: string;
  a: number;
  /** Bilen NPC kimliği → güven (0..100). */
  b: Record<string, number>;
  /** Yalanlandı (tek sefer). */
  y?: 1;
}

/** Oyuncu–oyuncu arabuluculuk dosyası. NPC arabuluculuk taleplerinden ayrı tutulur. */
export type OyuncuArabuluculukDurumu =
  | "davet" | "taslak" | "imzaBekliyor" | "emanette"
  | "tamam" | "onaylandi" | "ret" | "geri" | "dustu" | "iptal";

export interface OyuncuArabuluculuk {
  /** Toplum.tn ile ortak, tekrar etmeyen kayıt kimliği. */
  i: number;
  /** Şikâyetçi, karşı taraf ve tarafsız arabulucu oyuncu kimlikleri. */
  s: string;
  k: string;
  ar: string;
  d: OyuncuArabuluculukDurumu;
  /** Üç tarafın ayrı katılım rızası; sessizlik hiçbir zaman kabul değildir. */
  rs: { s?: number; k?: number; ar?: number };
  /** Uzlaşma taslağı sürümü ve iki tarafın imzaladığı sürüm. */
  sv: number;
  im: { s?: number; k?: number };
  /** Uzlaşma teklifi: s, şikâyetçinin karsi tarafa; k, karşı tarafın şikâyetçiye ödeyeceği akçe. */
  uz?: { s: number; k: number; not?: string };
  /** Ödeme tutarları ve para emanetine alındığı bilgisi. */
  od?: { s: number; k: number; emanet?: 1; uygulandi?: 1 };
  /** Açılış, cevap ve kapanış ayları. */
  ac: number;
  sa: number;
  kp?: number;
  /** Özel müzakere metni halka açık olaylara kopyalanmaz. */
  not?: string;
}

export interface Toplum {
  /** Sonraki teklif ve söylenti kimliği. */
  tn: number;
  sn: number;
  tk: Teklif[];
  ob: OyuncuBagi[];
  hu: Husumet[];
  /** Engelleyen → engellenenler. */
  eg: Record<string, string[]>;
  sy: Soylenti[];
  /** Reddedilen dostluk istekleri (sıralı çift, isteyen, ay): aynı kişiye hemen yeniden istek atılamaz. */
  rd?: { a: string; b: string; g: string; ay: number }[];
  /** Oyuncu–oyuncu arabuluculuk dosyaları; eski kayıtlarda yoktur ve ilk yazımda oluşturulur. */
  oa?: OyuncuArabuluculuk[];
}

/** Kasabanın toplum kaydı; yoksa kurar (yazım gerektiği yerde çağrılır). */
export function toplumAl(k: Kasaba): Toplum {
  k.tp ??= { tn: 1, sn: 1, tk: [], ob: [], hu: [], eg: {}, sy: [] };
  return k.tp;
}

/** Eski toplum kayıtları için geriye uyumlu, tembel arabuluculuk defteri. */
export function oyuncuArabuluculukAl(t: Toplum): OyuncuArabuluculuk[] {
  return (t.oa ??= []);
}

export const teklifKimlik = (i: number): string => `t${i}`;

export function teklifCoz(ham: unknown): number | undefined {
  if (typeof ham !== "string" || ham.length > 12) return undefined;
  const m = /^t?([1-9][0-9]{0,8})$/.exec(ham);
  return m?.[1] ? Number(m[1]) : undefined;
}

export const oyuncuMu = (id: string): boolean => /^o[1-9][0-9]{0,8}$/.test(id);

export function ciftSirala(x: string, y: string): [string, string] {
  return x < y ? [x, y] : [y, x];
}
