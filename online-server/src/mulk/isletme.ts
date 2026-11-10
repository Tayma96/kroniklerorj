// İşletme çekirdeği (GDD §17, Faz 12–13): sahip, ad, tezyin, kasa, emanet kasası, işletme itibarı, seviye,
// kapasite, personel (oyuncu ya da NPC), yetki matrisi, maaş sözleşmesi, ay dönümü (NPC müşteri geliri, bakım, maaş,
// iflas), devir önizlemesi ve çoklu hesap izleme kancası. Saf fonksiyonlar; IsletmeDO tek yazıcıdır (kasa ve
// muhasebe aynı yazımda). Kasa → cüzdan akçesi yalnız çıkış kutusundan (transfer.ts) yerleşime gider.

import type { Kademe, MeslekId } from "../icerik/meslekler.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { adDuzenle, trKucuk } from "../ad.ts";
import { adDogrula } from "../ad.ts";
import { trGunu } from "../yonetim/sikayet.ts";
import { teveccuhEtkisi } from "../yerlesim/teveccuh.ts";
import {
  AD_UCRETSIZ_DEGISIM,
  BAKIM,
  CALISAN_GUNLUK_CEKIM,
  CIKARMA_TAZMINAT_AY,
  DEFTER_EN_COK,
  FIYAT_CARPANI_EN_AZ,
  FIYAT_CARPANI_EN_COK,
  IFLAS_BORC_AY,
  ISLETME_AD_EN_KISA,
  ISLETME_AD_EN_UZUN,
  ITIBAR_BASLANGIC,
  ITIBAR_BORC,
  ITIBAR_EN_COK,
  ITIBAR_KALITE,
  ITIBAR_MAAS_BOZMA,
  ITIBAR_MUSTERI,
  ITIBAR_MUSTERI_TAVAN,
  ITIBAR_TEZYIN_TAVAN,
  IZLEME_EN_COK,
  IZLEME_INCELEME_ESIGI,
  KALITE_GELIR_YUZDE,
  KALITE_ROLLERI,
  KAPASITE,
  MAAS_EN_AZ,
  MAAS_EN_COK,
  NPC_CALISAN_KADEMESI,
  NPC_GELIR_TABAN,
  NPC_GELIR_TAVAN,
  ONERI_EN_COK,
  PERSONEL_EN_COK,
  ROLLER,
  ROL_MESLEGI,
  ROL_YETKILERI,
  SAHIP_GUNLUK_CEKIM,
  SEVIYELER,
  SEVIYE_ESIKLERI,
  SEVIYE_FAALIYET_TAVAN,
  SEVIYE_GELIR_BOLEN,
  SEVIYE_GELIR_TAVAN,
  SOZLESME_ARSIV_EN_COK,
  TEKLIF_EN_COK,
  TEKLIF_SURE_AY,
  TEZYIN,
  TEZYIN_DEGISIM_EN_COK,
  TRANSFER_EN_COK,
  VEKALET_EN_UZUN_AY,
  YETKILER,
  seviyeSirasi,
  type MulkTuru,
  type Rol,
  type TezyinGrubu,
  type Yetki,
} from "./kurallar.ts";
import { bekleyenToplam, bosDefter, bosKutu, cikisAc, type CikisKutusu, type GirisDefteri } from "./transfer.ts";

export interface Kisi {
  h: string;
  o: string;
  ad: string;
}

/** YerlesimDO'nun her komutla verdiği güvenilir bağlam: isteyen karakter, meslek kademeleri, teveccüh kademesi. */
export interface Baglam extends Kisi {
  mk: Partial<Record<MeslekId, Kademe>>;
  tv: number;
}

export type Calisan = ({ t: "oyuncu" } & Kisi) | { t: "npc"; n: string; ad: string };
export type SozlesmeDurumu = "etkin" | "bitti" | "bozuldu" | "cikarildi" | "istifa";

export interface Sozlesme {
  n: number;
  k: Calisan;
  r: Rol;
  y: Yetki[];
  m: number;
  /** Başlangıç ayı, kapanış ayı, ödenen maaş ayı sayısı. */
  b: number;
  e?: number;
  od: number;
  /** Meslek kademesi (kalite bağı; işe alımda ve çalışanın her komutunda tazelenir). */
  kd: Kademe;
  d: SozlesmeDurumu;
  /** Vekâlet bitiş ayı (dahil). */
  vk?: number;
}

export interface IseTeklif {
  n: number;
  hedef: Kisi;
  r: Rol;
  y: Yetki[];
  m: number;
  ay: number;
}

export interface Oneri {
  n: number;
  oneren: string;
  hedef: Kisi | { n: string; ad: string };
  r: Rol;
  m: number;
  ay: number;
}

/** Muhasebe satırı: [ay, kalem, tutar (+ giriş / − çıkış), ayrıntı]. */
export type DefterSatiri = [ay: number, kalem: string, tutar: number, ayrinti?: string];

export interface IzlemeKaydi {
  ay: number;
  /** Bu ayın ödemeleri: [ödeyen yerel kimlik, tutar, bayrak ("" | "kume" | "karsilikli")]. */
  m: [o: string, a: number, b: string][];
  /** Bu ay bayraklı ödeme sayısı ve sayılan (bayraksız) farklı müşteri sayısı. */
  b: number;
  s: string[];
  /** Eşik aşılınca işaretlenen aylar (yönetim kancası okur). */
  in: number[];
}

export interface Isletme {
  v: 1;
  id: string;
  yerlesim: string;
  tur: MulkTuru;
  no: number;
  durum: "acik" | "iflas";
  /** Tapu sürümü (YerlesimDO tapu defterinin; sahip değişiminde artar). */
  ts: number;
  sahip: Kisi;
  /** Sahibin kalite meslek kademeleri ve teveccüh kademesi (son komutundan). */
  sm: Partial<Record<MeslekId, Kademe>>;
  stv: number;
  ad: string;
  adSay: number;
  kasa: number;
  emanet: number;
  borc: number;
  borcAy: number;
  it: number;
  /** Açılış ayı ve son işlenen ay. */
  bas: number;
  ay: number;
  /** Toplam gelir (seviye puanı) ve aylık özet sayaçları. */
  gelir: number;
  tz: Partial<Record<TezyinGrubu, string>>;
  tzSay: number;
  fc: number;
  kapi: boolean;
  pr: Sozlesme[];
  sn: number;
  tk: IseTeklif[];
  on: Oneri[];
  /** İşverenin bozduğu sözleşme sayısı (devirde ve teklifte görünür). */
  sicil: number;
  /** Günlük çekim: [TR günü, yerel kimlik → toplam]. */
  cek: [gun: number, Record<string, number>];
  df: DefterSatiri[];
  iz: IzlemeKaydi;
  cik: CikisKutusu;
  gir: GirisDefteri;
  /** Komut tekrar güvenliği: ["<o>:<istekNo>", yanıt]. */
  ist: [string, unknown][];
  /** Yerleşime son gönderilen ayar yansısı (karşılaştırma için JSON) ve sürümü. */
  sa: string;
  as: number;
  /** Bu fazdaki dünyaya giren (NPC müşteri) ve dünyadan çıkan (bakım, tezyin, NPC maaşı) toplamları: denetim. */
  kaynak: number;
  batak: number;
}

/** [PARAMETRE] Komut tekrar kaydı. */
export const IST_EN_COK = 30;
/** [PARAMETRE] Bir çağrıda işlenen en çok ay (kalan sonraki çağrıda). */
export const AY_YETISTIR_EN_COK = 24;

export function isletmeKur(id: string, yerlesim: string, tur: MulkTuru, no: number, sahip: Kisi, ts: number, ay: number): Isletme {
  return {
    v: 1,
    id,
    yerlesim,
    tur,
    no,
    durum: "acik",
    ts,
    sahip,
    sm: {},
    stv: 0,
    ad: "",
    adSay: 0,
    kasa: 0,
    emanet: 0,
    borc: 0,
    borcAy: 0,
    it: ITIBAR_BASLANGIC,
    bas: ay,
    ay,
    gelir: 0,
    tz: {},
    tzSay: 0,
    fc: 100,
    kapi: true,
    pr: [],
    sn: 0,
    tk: [],
    on: [],
    sicil: 0,
    cek: [0, {}],
    df: [],
    iz: { ay, m: [], b: 0, s: [], in: [] },
    cik: bosKutu(),
    gir: bosDefter(),
    ist: [],
    sa: "",
    as: 0,
    kaynak: 0,
    batak: 0,
  };
}

function defterYaz(is: Isletme, ay: number, kalem: string, tutar: number, ayrinti?: string): void {
  is.df.push(ayrinti === undefined ? [ay, kalem, tutar] : [ay, kalem, tutar, ayrinti]);
  if (is.df.length > DEFTER_EN_COK) is.df.splice(0, is.df.length - DEFTER_EN_COK);
}

function sozlesmeArsivKirp(is: Isletme): void {
  const kapali = is.pr.filter((s) => s.d !== "etkin");
  if (kapali.length <= SOZLESME_ARSIV_EN_COK) return;
  const at = new Set(kapali.slice(0, kapali.length - SOZLESME_ARSIV_EN_COK));
  is.pr = is.pr.filter((s) => !at.has(s));
}

export function etkinler(is: Isletme): Sozlesme[] {
  return is.pr.filter((s) => s.d === "etkin");
}

/** Aylık maaş yükü: bir sonraki dönümde emanetten ödenecek toplam. */
export function maasYuku(is: Isletme): number {
  return etkinler(is).reduce((t, s) => t + s.m, 0);
}

// ── Seviye, kapasite, kalite ──

export function seviyePuani(is: Isletme): { puan: number; dokum: { itibar: number; faaliyet: number; gelir: number } } {
  const faaliyet = Math.min(SEVIYE_FAALIYET_TAVAN, Math.max(0, is.ay - is.bas));
  const gelir = Math.min(SEVIYE_GELIR_TAVAN, Math.floor(is.gelir / SEVIYE_GELIR_BOLEN));
  const itibar = Math.round(is.it);
  return { puan: itibar + faaliyet + gelir, dokum: { itibar, faaliyet, gelir } };
}

export function seviye(is: Isletme): number {
  return seviyeSirasi(seviyePuani(is).puan);
}

/** Kapasite yalnız seviyeden (parayla artmaz). */
export function kapasite(is: Isletme): number {
  return KAPASITE[is.tur][seviye(is)]!;
}

/** Kalite: türün kalite rollerinde en yüksek meslek kademesi; rolde kimse yoksa sahibin kendi kademesi (döküm). */
export function kalite(is: Isletme): { toplam: number; dokum: { rol: Rol; kademe: number; kaynak: "personel" | "sahip" }[] } {
  const dokum: { rol: Rol; kademe: number; kaynak: "personel" | "sahip" }[] = [];
  for (const rol of KALITE_ROLLERI[is.tur]) {
    const kd = etkinler(is)
      .filter((s) => s.r === rol)
      .reduce((m, s) => Math.max(m, s.kd), -1);
    const meslek = ROL_MESLEGI[rol];
    if (kd >= 0) dokum.push({ rol, kademe: kd, kaynak: "personel" });
    else dokum.push({ rol, kademe: meslek ? (is.sm[meslek] ?? 0) : 0, kaynak: "sahip" });
  }
  return { toplam: dokum.reduce((t, d) => t + d.kademe, 0), dokum };
}

/** NPC müşteri geliri önizlemesi (döküm; gizli sayı yok). */
export function npcGeliri(is: Isletme): { tutar: number; taban: number; itibarYuzde: number; kaliteYuzde: number; teveccuhYuzde: number; tavan: number } {
  const taban = NPC_GELIR_TABAN[is.tur];
  const itibarYuzde = Math.round(is.it);
  const kaliteYuzde = kalite(is).toplam * KALITE_GELIR_YUZDE;
  const teveccuhYuzde = teveccuhEtkisi(is.stv, "musteri");
  const tavan = NPC_GELIR_TAVAN[seviye(is)]!;
  const ham = Math.floor(taban * (1 + itibarYuzde / 100) * (1 + kaliteYuzde / 100) * (1 + teveccuhYuzde / 100));
  const tutar = is.durum === "acik" && is.kapi ? Math.min(tavan, ham) : 0;
  return { tutar, taban, itibarYuzde, kaliteYuzde, teveccuhYuzde, tavan };
}

function tezyinItibari(is: Isletme): number {
  let t = 0;
  for (const [g, s] of Object.entries(is.tz)) {
    const grup = TEZYIN[g as TezyinGrubu] as Record<string, { itibar: number }>;
    t += grup[s!]?.itibar ?? 0;
  }
  return Math.min(ITIBAR_TEZYIN_TAVAN, t);
}

// ── Yetki matrisi ──

export type Konum = "sahip" | "vekil" | Rol | null;

export interface YetkiDurumu {
  konum: Konum;
  yetkiler: Yetki[];
  sozlesme?: Sozlesme;
}

/** İsteyenin konumu ve yetkileri. Sahip her yetkiye sahiptir; vekil (süren vekâlet) sahibin yerine yönetir. */
export function yetkiDurumu(is: Isletme, o: string, ay: number): YetkiDurumu {
  if (is.sahip.o === o) return { konum: "sahip", yetkiler: [...YETKILER] };
  const s = etkinler(is).find((x) => x.k.t === "oyuncu" && x.k.o === o);
  if (!s) return { konum: null, yetkiler: [] };
  if (s.y.includes("vekalet") && (s.vk ?? -1) >= ay) return { konum: "vekil", yetkiler: [...YETKILER], sozlesme: s };
  return { konum: s.r, yetkiler: s.y.filter((y) => y !== "vekalet"), sozlesme: s };
}

/** Yönetici (sahip ya da vekil) mi. */
function yonetir(d: YetkiDurumu): boolean {
  return d.konum === "sahip" || d.konum === "vekil";
}

function yetkiVar(d: YetkiDurumu, y: Yetki): boolean {
  return d.yetkiler.includes(y);
}

// ── Girdi yardımcıları ──

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function tutarCoz(v: unknown): number | undefined {
  return Number.isInteger(v) && (v as number) > 0 && (v as number) <= TRANSFER_EN_COK ? (v as number) : undefined;
}

function maasCoz(v: unknown): number | undefined {
  return Number.isInteger(v) && (v as number) >= MAAS_EN_AZ && (v as number) <= MAAS_EN_COK ? (v as number) : undefined;
}

function rolCoz(v: unknown): Rol | undefined {
  return typeof v === "string" && (ROLLER as readonly string[]).includes(v) ? (v as Rol) : undefined;
}

function yetkiCoz(v: unknown): Yetki | undefined {
  return typeof v === "string" && (YETKILER as readonly string[]).includes(v) ? (v as Yetki) : undefined;
}

/** Ad: oyuncu adı kuralları (karakter kümesi, yasak sözcük) + 3–32 harf. */
export function isletmeAdiCoz(ham: unknown): Sonuc<string> {
  if (typeof ham !== "string") return hata("ad_karakter");
  const ad = adDuzenle(ham);
  const n = [...ad].length;
  if (n < ISLETME_AD_EN_KISA || n > ISLETME_AD_EN_UZUN) return hata("ad_uzunluk");
  // Sözcük sözcük oyuncu adı denetimi (yasak sözcük ve karakter kümesi; 24 harften uzun tek sözcük yok sayılır).
  for (const sozcuk of ad.split(" ")) {
    if (sozcuk.length === 0) continue;
    const r = adDogrula(sozcuk.length >= 2 ? sozcuk : sozcuk + sozcuk);
    if (!r.ok) return hata(r.hata);
  }
  const k = trKucuk(ad);
  if (k.includes("resmi") || k.includes("beylik") || k.includes("divan")) return hata("ad_yasak");
  return basarili(ad);
}

// ── Kasa girişi (cüzdandan; transfer hedefi) ──

export type GirisNedeni = "yatir" | "kira" | "ikram";

export interface KasaGirisi {
  tutar: number;
  neden: GirisNedeni;
  /** Ödeyen yerel kimlik; aynı hesap kümesi (sahiple aynı hane) ve karşılıklı işlem bayrakları YerlesimDO'dan. */
  o: string;
  kume: boolean;
  karsilikli: boolean;
}

/** Kasaya giriş. Kapalı (iflas) işletme reddeder: kaynak telafi eder. Müşteri ödemesi izleme kancasına yazılır. */
export function kasayaGir(is: Isletme, g: KasaGirisi, ay: number): { durum: "kabul" | "red"; neden?: string } {
  if (is.durum !== "acik") return { durum: "red", neden: "isletme_kapali" };
  if (!Number.isInteger(g.tutar) || g.tutar <= 0) return { durum: "red", neden: "tutar_gecersiz" };
  is.kasa += g.tutar;
  if (g.neden !== "yatir") {
    is.gelir += g.kume || g.karsilikli ? 0 : g.tutar;
    izle(is, g, ay);
  }
  defterYaz(is, ay, g.neden, g.tutar, g.o);
  return { durum: "kabul" };
}

/** Çoklu hesap izleme kancası: bayraklı ödeme itibar/seviye puanına sayılmaz; eşik aşılırsa ay işaretlenir. */
export function izle(is: Isletme, g: Pick<KasaGirisi, "o" | "tutar" | "kume" | "karsilikli">, ay: number): string {
  const iz = is.iz;
  if (iz.ay !== ay) {
    iz.ay = ay;
    iz.m = [];
    iz.b = 0;
    iz.s = [];
  }
  const bayrak = g.kume ? "kume" : g.karsilikli ? "karsilikli" : "";
  iz.m.push([g.o, g.tutar, bayrak]);
  if (iz.m.length > IZLEME_EN_COK) iz.m.splice(0, iz.m.length - IZLEME_EN_COK);
  if (bayrak) {
    iz.b++;
    if (iz.b > IZLEME_INCELEME_ESIGI && !iz.in.includes(ay)) {
      iz.in.push(ay);
      if (iz.in.length > 12) iz.in.splice(0, iz.in.length - 12);
    }
  } else if (!iz.s.includes(g.o)) iz.s.push(g.o);
  return bayrak;
}

// ── Kasa → cüzdan (transfer kaynağı) ──

/** Çıkış kaydı açar; kutu doluysa `transfer_bekliyor`. Bakiyeden düşmek çağıranın işidir (aynı yazımda). */
function cuzdanaGonder(is: Isletme, i: string, alici: Kisi, tutar: number, neden: string, an: number): boolean {
  return cikisAc(is.cik, { i, t: "cuzdana", h: is.yerlesim, a: tutar, y: { isletme: is.id, o: alici.o, h: alici.h, tutar, neden } }, an);
}

function gunlukCekim(is: Isletme, o: string, an: number): number {
  const gun = trGunu(an);
  if (is.cek[0] !== gun) is.cek = [gun, {}];
  return is.cek[1][o] ?? 0;
}

/** POST .../cek {tutar}: kasa yetkisi; günlük tavan (sahip ve çalışan ayrı); kayıtlı (defter). */
export function cek(is: Isletme, b: Baglam, govde: unknown, ay: number, an: number, islemNo: string): Sonuc<Record<string, unknown>> {
  if (is.durum !== "acik") return hata("isletme_kapali");
  const d = yetkiDurumu(is, b.o, ay);
  if (!yetkiVar(d, "kasa")) return hata("yetki_yok");
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  const tutar = tutarCoz(govde.tutar);
  if (tutar === undefined) return hata("tutar_gecersiz");
  if (is.kasa < tutar) return hata("kasa_yetersiz");
  const tavan = d.konum === "sahip" ? SAHIP_GUNLUK_CEKIM : CALISAN_GUNLUK_CEKIM;
  const bugun = gunlukCekim(is, b.o, an);
  if (bugun + tutar > tavan) return hata("cekim_tavani");
  if (!cuzdanaGonder(is, islemNo, b, tutar, "cek", an)) return hata("transfer_bekliyor");
  is.kasa -= tutar;
  is.cek[1][b.o] = bugun + tutar;
  defterYaz(is, ay, "cek", -tutar, b.o);
  return basarili({ cekim: { tutar, islem: islemNo, bugun: bugun + tutar, tavan }, kasa: is.kasa });
}

// ── Emanet kasası ──

/** POST .../emanet {yon: koy|al, tutar}: kasa ↔ emanet (işletme içinde, atomik). Al: yalnız maaş yükünü aşan kısım. */
export function emanetIslem(is: Isletme, b: Baglam, govde: unknown, ay: number): Sonuc<Record<string, unknown>> {
  if (is.durum !== "acik") return hata("isletme_kapali");
  const d = yetkiDurumu(is, b.o, ay);
  if (!yonetir(d)) return hata("yetki_yok");
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  const tutar = tutarCoz(govde.tutar);
  if (tutar === undefined) return hata("tutar_gecersiz");
  if (govde.yon === "koy") {
    if (is.kasa < tutar) return hata("kasa_yetersiz");
    is.kasa -= tutar;
    is.emanet += tutar;
  } else if (govde.yon === "al") {
    const serbest = is.emanet - maasYuku(is);
    if (serbest < tutar) return hata("emanet_yetersiz");
    is.emanet -= tutar;
    is.kasa += tutar;
  } else return hata("gecersiz_istek");
  defterYaz(is, ay, govde.yon === "koy" ? "emanetKoy" : "emanetAl", govde.yon === "koy" ? -tutar : tutar);
  return basarili({ kasa: is.kasa, emanet: is.emanet, maasYuku: maasYuku(is) });
}

// ── Ad, tezyin, fiyat, kapı ──

/** POST .../ad {ad}: yalnız sahip; ilk değişiklik ücretsiz, sonrası ad jetonu (Debdebe; bağlı değil). */
export function adDegis(is: Isletme, b: Baglam, govde: unknown, ay: number): Sonuc<Record<string, unknown>> {
  if (is.durum !== "acik") return hata("isletme_kapali");
  if (is.sahip.o !== b.o) return hata("yetki_yok");
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  const ad = isletmeAdiCoz(govde.ad);
  if (!ad.ok) return ad;
  if (is.adSay >= AD_UCRETSIZ_DEGISIM) return hata("ad_jetonu_yok");
  is.ad = ad.deger;
  is.adSay++;
  defterYaz(is, ay, "ad", 0, ad.deger);
  return basarili({ ad: is.ad, ucretsizKalan: Math.max(0, AD_UCRETSIZ_DEGISIM - is.adSay) });
}

/** POST .../tezyin {grup, secim}: sahip ya da vekil; kasadan ödenir (dünyadan çıkar); itibara küçük katkı, kapasite değişmez. */
export function tezyinAl(is: Isletme, b: Baglam, govde: unknown, ay: number): Sonuc<Record<string, unknown>> {
  if (is.durum !== "acik") return hata("isletme_kapali");
  if (!yonetir(yetkiDurumu(is, b.o, ay))) return hata("yetki_yok");
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  const grup = govde.grup;
  if (typeof grup !== "string" || !Object.hasOwn(TEZYIN, grup)) return hata("tezyin_gecersiz");
  const katalog = TEZYIN[grup as TezyinGrubu] as Record<string, { fiyat: number; itibar: number }>;
  const secim = govde.secim;
  if (typeof secim !== "string" || !Object.hasOwn(katalog, secim)) return hata("tezyin_gecersiz");
  if (is.tz[grup as TezyinGrubu] === secim) return hata("tezyin_var");
  if (is.tzSay >= TEZYIN_DEGISIM_EN_COK) return hata("tezyin_siniri");
  const fiyat = katalog[secim]!.fiyat;
  if (is.kasa < fiyat) return hata("kasa_yetersiz");
  const onceki = tezyinItibari(is);
  is.kasa -= fiyat;
  is.batak += fiyat;
  is.tz[grup as TezyinGrubu] = secim;
  is.tzSay++;
  const fark = tezyinItibari(is) - onceki;
  is.it = Math.max(0, Math.min(ITIBAR_EN_COK, is.it + fark));
  defterYaz(is, ay, "tezyin", -fiyat, `${grup}:${secim}`);
  return basarili({ tezyin: { grup, secim, fiyat, batak: fiyat, itibar: fark }, kasa: is.kasa, kapasite: kapasite(is) });
}

/** POST .../fiyat {carpan}: fiyat yetkisi; menü ve oda fiyatı çarpanı (%). */
export function fiyatAyarla(is: Isletme, b: Baglam, govde: unknown, ay: number): Sonuc<Record<string, unknown>> {
  if (is.durum !== "acik") return hata("isletme_kapali");
  if (!yetkiVar(yetkiDurumu(is, b.o, ay), "fiyat")) return hata("yetki_yok");
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  const c = govde.carpan;
  if (!Number.isInteger(c) || (c as number) < FIYAT_CARPANI_EN_AZ || (c as number) > FIYAT_CARPANI_EN_COK) return hata("carpan_gecersiz");
  is.fc = c as number;
  defterYaz(is, ay, "fiyat", 0, String(c));
  return basarili({ fiyatCarpani: is.fc });
}

/** POST .../kapi {acik}: müşteri yetkisi; müşteri kabulü (kapalıyken oda ve ikram satılmaz, NPC geliri yok). */
export function kapiAyarla(is: Isletme, b: Baglam, govde: unknown, ay: number): Sonuc<Record<string, unknown>> {
  if (is.durum !== "acik") return hata("isletme_kapali");
  if (!yetkiVar(yetkiDurumu(is, b.o, ay), "musteri")) return hata("yetki_yok");
  if (!nesneMi(govde) || typeof govde.acik !== "boolean") return hata("gecersiz_istek");
  is.kapi = govde.acik;
  return basarili({ kapi: is.kapi });
}

// ── Personel (Faz 13) ──

function calisiyorMu(is: Isletme, o: string): boolean {
  return etkinler(is).some((s) => s.k.t === "oyuncu" && s.k.o === o);
}

function npcCalisiyorMu(is: Isletme, n: string): boolean {
  return etkinler(is).some((s) => s.k.t === "npc" && s.k.n === n);
}

function teklifTemizle(is: Isletme, ay: number): void {
  is.tk = is.tk.filter((t) => ay - t.ay < TEKLIF_SURE_AY && !calisiyorMu(is, t.hedef.o));
  is.on = is.on.filter((t) => ay - t.ay < TEKLIF_SURE_AY);
}

export interface PersonelHedefi {
  /** Oyuncu (YerlesimDO çözdü: yerel kimlik, hesap, ad, meslek kademeleri) ya da NPC (kimlik, ad). */
  oyuncu?: Kisi & { mk: Partial<Record<MeslekId, Kademe>> };
  npc?: { n: string; ad: string };
}

function yeniSozlesme(is: Isletme, k: Calisan, r: Rol, y: Yetki[], m: number, kd: Kademe, ay: number): Sozlesme {
  const s: Sozlesme = { n: ++is.sn, k, r, y: [...y], m, b: ay, od: 0, kd, d: "etkin" };
  is.pr.push(s);
  return s;
}

/**
 * POST .../personel {islem, ...} — işe alım, öneri, kabul/red, çıkarma, istifa, yetki, maaş, vekâlet.
 * Yetki matrisi: teklif/npc/onayla/cikar/maas yönetici (sahip ya da vekil); oner personel yetkisi; yetki ve vekâlet
 * yalnız sahip; kabul/red teklif hedefi; istifa çalışan.
 */
export function personel(is: Isletme, b: Baglam, govde: unknown, hedef: PersonelHedefi, ay: number, an: number, islemNo: string): Sonuc<Record<string, unknown>> {
  if (is.durum !== "acik") return hata("isletme_kapali");
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  teklifTemizle(is, ay);
  const d = yetkiDurumu(is, b.o, ay);
  // Çalışanın meslek kademesi her komutunda tazelenir (kalite bağı).
  if (d.sozlesme) d.sozlesme.kd = (ROL_MESLEGI[d.sozlesme.r] ? (b.mk[ROL_MESLEGI[d.sozlesme.r]!] ?? 0) : 0) as Kademe;
  const islem = govde.islem;
  switch (islem) {
    case "teklif":
    case "npc": {
      if (!yonetir(d)) return hata("yetki_yok");
      return iseAl(is, islem, govde, hedef, ay);
    }
    case "oner": {
      if (!yetkiVar(d, "personel") || yonetir(d)) return hata(yonetir(d) ? "gecersiz_istek" : "yetki_yok");
      const r = rolCoz(govde.rol);
      const m = maasCoz(govde.maas);
      if (!r) return hata("rol_gecersiz");
      if (m === undefined) return hata("maas_gecersiz");
      const h = hedef.oyuncu ? { h: hedef.oyuncu.h, o: hedef.oyuncu.o, ad: hedef.oyuncu.ad } : hedef.npc;
      if (!h) return hata("kisi_yok");
      if (is.on.length >= ONERI_EN_COK) return hata("teklif_siniri");
      const o: Oneri = { n: ++is.sn, oneren: b.o, hedef: h, r, m, ay };
      is.on.push(o);
      return basarili({ oneri: o });
    }
    case "onayla": {
      if (!yonetir(d)) return hata("yetki_yok");
      const n = govde.oneri;
      const on = is.on.find((x) => x.n === n);
      if (!on) return hata("teklif_yok");
      const h: PersonelHedefi = "o" in on.hedef ? { oyuncu: { ...on.hedef, mk: hedef.oyuncu?.o === on.hedef.o ? hedef.oyuncu.mk : {} } } : { npc: on.hedef };
      const r = iseAl(is, "o" in on.hedef ? "teklif" : "npc", { rol: on.r, maas: on.m }, h, ay);
      if (r.ok) is.on = is.on.filter((x) => x !== on);
      return r;
    }
    case "kabul":
    case "red": {
      const t = is.tk.find((x) => x.hedef.o === b.o);
      if (!t) return hata("teklif_yok");
      is.tk = is.tk.filter((x) => x !== t);
      if (islem === "red") return basarili({ teklif: t.n, kabul: false });
      if (calisiyorMu(is, b.o)) return hata("zaten_calisan");
      if (etkinler(is).length >= PERSONEL_EN_COK) return hata("personel_dolu");
      const meslek = ROL_MESLEGI[t.r];
      const s = yeniSozlesme(is, { t: "oyuncu", h: b.h, o: b.o, ad: b.ad }, t.r, t.y, t.m, (meslek ? (b.mk[meslek] ?? 0) : 0) as Kademe, ay);
      defterYaz(is, ay, "iseGiris", 0, `${s.n}:${b.o}:${t.r}:${t.m}`);
      return basarili({ sozlesme: sozlesmeGorunumu(s), kabul: true });
    }
    case "cikar": {
      if (!yonetir(d)) return hata("yetki_yok");
      const s = etkinler(is).find((x) => x.n === govde.sozlesme);
      if (!s) return hata("sozlesme_yok");
      if (d.sozlesme === s) return hata("kendine");
      const tazminat = s.m * CIKARMA_TAZMINAT_AY;
      if (is.emanet < tazminat) return hata("emanet_yetersiz");
      if (s.k.t === "oyuncu") {
        if (!cuzdanaGonder(is, islemNo, s.k, tazminat, "tazminat", an)) return hata("transfer_bekliyor");
      } else is.batak += tazminat;
      is.emanet -= tazminat;
      s.d = "cikarildi";
      s.e = ay;
      defterYaz(is, ay, "tazminat", -tazminat, `${s.n}`);
      sozlesmeArsivKirp(is);
      return basarili({ sozlesme: sozlesmeGorunumu(s), tazminat });
    }
    case "istifa": {
      const s = d.sozlesme;
      if (!s) return hata("sozlesme_yok");
      s.d = "istifa";
      s.e = ay;
      delete s.vk;
      defterYaz(is, ay, "istifa", 0, `${s.n}`);
      sozlesmeArsivKirp(is);
      return basarili({ sozlesme: sozlesmeGorunumu(s) });
    }
    case "yetki": {
      if (d.konum !== "sahip") return hata("yetki_yok");
      const s = etkinler(is).find((x) => x.n === govde.sozlesme);
      if (!s) return hata("sozlesme_yok");
      const y = yetkiCoz(govde.yetki);
      if (!y) return hata("yetki_gecersiz");
      if (typeof govde.ver !== "boolean") return hata("gecersiz_istek");
      if (y === "vekalet" && govde.ver) {
        if (s.k.t !== "oyuncu") return hata("yetki_gecersiz");
        const sure = govde.sure;
        if (!Number.isInteger(sure) || (sure as number) < 1 || (sure as number) > VEKALET_EN_UZUN_AY) return hata("sure_gecersiz");
        for (const x of etkinler(is)) if (x !== s && x.y.includes("vekalet")) return hata("vekil_var");
        s.vk = ay + (sure as number) - 1;
      }
      if (govde.ver) {
        if (!s.y.includes(y)) s.y.push(y);
      } else {
        s.y = s.y.filter((x) => x !== y);
        if (y === "vekalet") delete s.vk;
      }
      defterYaz(is, ay, "yetki", 0, `${s.n}:${y}:${govde.ver ? 1 : 0}`);
      return basarili({ sozlesme: sozlesmeGorunumu(s) });
    }
    case "maas": {
      if (!yonetir(d)) return hata("yetki_yok");
      const s = etkinler(is).find((x) => x.n === govde.sozlesme);
      if (!s) return hata("sozlesme_yok");
      const m = maasCoz(govde.maas);
      if (m === undefined) return hata("maas_gecersiz");
      // Sahip çalışanı tek taraflı mağdur edemez: oyuncu çalışanın maaşı yalnız artırılabilir (kesinti sözleşmeye bağlı).
      if (s.k.t === "oyuncu" && m < s.m) return hata("maas_kesinti");
      s.m = m;
      defterYaz(is, ay, "maas", 0, `${s.n}:${m}`);
      return basarili({ sozlesme: sozlesmeGorunumu(s), maasYuku: maasYuku(is) });
    }
    default:
      return hata("gecersiz_istek");
  }
}

function iseAl(is: Isletme, tur: "teklif" | "npc", govde: Record<string, unknown>, hedef: PersonelHedefi, ay: number): Sonuc<Record<string, unknown>> {
  const r = rolCoz(govde.rol);
  const m = maasCoz(govde.maas);
  if (!r) return hata("rol_gecersiz");
  if (m === undefined) return hata("maas_gecersiz");
  if (etkinler(is).length >= PERSONEL_EN_COK) return hata("personel_dolu");
  if (tur === "npc") {
    const npc = hedef.npc;
    if (!npc) return hata("kisi_yok");
    if (npcCalisiyorMu(is, npc.n)) return hata("zaten_calisan");
    // NPC kendi kademesini taşır; yetkisi yoktur (NPC kasa, fiyat, personel yönetmez).
    const s = yeniSozlesme(is, { t: "npc", n: npc.n, ad: npc.ad }, r, [], m, NPC_CALISAN_KADEMESI, ay);
    defterYaz(is, ay, "iseGiris", 0, `${s.n}:${npc.n}:${r}:${m}`);
    return basarili({ sozlesme: sozlesmeGorunumu(s) });
  }
  const o = hedef.oyuncu;
  if (!o) return hata("kisi_yok");
  if (o.o === is.sahip.o) return hata("kendine");
  if (calisiyorMu(is, o.o)) return hata("zaten_calisan");
  if (is.tk.some((t) => t.hedef.o === o.o)) return hata("teklif_var");
  if (is.tk.length >= TEKLIF_EN_COK) return hata("teklif_siniri");
  const t: IseTeklif = { n: ++is.sn, hedef: { h: o.h, o: o.o, ad: o.ad }, r, y: [...ROL_YETKILERI[r]], m, ay };
  is.tk.push(t);
  return basarili({ teklif: t, sicil: is.sicil });
}

export function sozlesmeGorunumu(s: Sozlesme) {
  return {
    no: s.n,
    calisan: s.k.t === "oyuncu" ? { tur: "oyuncu" as const, id: s.k.o, ad: s.k.ad } : { tur: "npc" as const, id: s.k.n, ad: s.k.ad },
    rol: s.r,
    yetkiler: s.y,
    maas: s.m,
    baslangic: s.b,
    bitis: s.e ?? null,
    odenenAy: s.od,
    kademe: s.kd,
    durum: s.d,
    vekaletBitis: s.vk ?? null,
  };
}

// ── Ay dönümü ──

/** Tek ay: NPC müşteri geliri, bakım (ödenemeyen borç), maaş (emanetten; ödenmezse işveren sözleşmeyi bozmuş sayılır), itibar. */
function birAy(is: Isletme, ay: number, an: number): void {
  if (is.durum !== "acik") return;
  // Önceki ayın (bitirilen) müşteri sayımı itibara.
  const musteri = is.iz.ay === ay - 1 ? Math.min(ITIBAR_MUSTERI_TAVAN, is.iz.s.length * ITIBAR_MUSTERI) : 0;
  const g = npcGeliri(is);
  if (g.tutar > 0) {
    is.kasa += g.tutar;
    is.kaynak += g.tutar;
    is.gelir += g.tutar;
    defterYaz(is, ay, "npcMusteri", g.tutar);
  }
  // Bakım ve borç.
  const bakim = BAKIM[is.tur] + is.borc;
  const odenen = Math.min(is.kasa, bakim);
  is.kasa -= odenen;
  is.batak += odenen;
  is.borc = bakim - odenen;
  if (odenen > 0) defterYaz(is, ay, "bakim", -odenen);
  is.borcAy = is.borc > 0 ? is.borcAy + 1 : 0;
  // Maaş (emanet kasasından). Ödenemeyen sözleşme işverence bozulmuş sayılır.
  let bozulan = 0;
  for (const s of etkinler(is)) {
    if (is.emanet >= s.m) {
      if (s.k.t === "oyuncu") {
        if (!cuzdanaGonder(is, `${is.id}:maas:${s.n}:${ay}`, s.k, s.m, "maas", an)) {
          bozulan++;
          sozlesmeBoz(is, s, ay);
          continue;
        }
      } else is.batak += s.m;
      is.emanet -= s.m;
      s.od++;
      defterYaz(is, ay, "maas", -s.m, `${s.n}`);
    } else {
      bozulan++;
      sozlesmeBoz(is, s, ay);
    }
    if (s.vk !== undefined && s.vk < ay) {
      delete s.vk;
      s.y = s.y.filter((y) => y !== "vekalet");
    }
  }
  const k = kalite(is).toplam;
  const fark = k * ITIBAR_KALITE + musteri - (is.borc > 0 ? ITIBAR_BORC : 0) - bozulan * ITIBAR_MAAS_BOZMA;
  is.it = Math.max(0, Math.min(ITIBAR_EN_COK, is.it + fark));
  teklifTemizle(is, ay);
  sozlesmeArsivKirp(is);
  if (is.borcAy >= IFLAS_BORC_AY) iflasEt(is, ay, an);
}

function sozlesmeBoz(is: Isletme, s: Sozlesme, ay: number): void {
  s.d = "bozuldu";
  s.e = ay;
  delete s.vk;
  is.sicil++;
  defterYaz(is, ay, "sozlesmeBozuldu", 0, `${s.n}:isveren`);
}

/**
 * İflas (GDD §17): mülk beyliğe döner (yerleşime "iflas" kaydı tapuyu boşaltır); sözleşmeler biter; kalan kasa ve
 * emanet sahibin cüzdanına aktarılır (kişisel varlık silinmez). Karakter, nam ve kişisel varlıklar yerinde kalır.
 */
export function iflasEt(is: Isletme, ay: number, an: number): void {
  if (is.durum !== "acik") return;
  is.durum = "iflas";
  for (const s of etkinler(is)) {
    s.d = "bitti";
    s.e = ay;
    delete s.vk;
  }
  is.tk = [];
  is.on = [];
  const kalan = is.kasa + is.emanet;
  if (kalan > 0 && cuzdanaGonder(is, `${is.id}:iflas:${is.ts}`, is.sahip, kalan, "iflas", an)) {
    is.kasa = 0;
    is.emanet = 0;
  }
  defterYaz(is, ay, "iflas", 0, `borc:${is.borc}`);
  cikisAc(is.cik, { i: `${is.id}:tapu:${is.ts}`, t: "iflas", h: is.yerlesim, a: 0, y: { isletme: is.id, ts: is.ts } }, an);
}

/** Kaçan ayları sırayla işler (çağrı başına sınırlı). */
export function ayIlerlet(is: Isletme, hedefAy: number, an: number): number {
  let n = 0;
  while (is.ay < hedefAy && n < AY_YETISTIR_EN_COK) {
    is.ay++;
    birAy(is, is.ay, an);
    n++;
  }
  return n;
}

// ── Sahip değişimi (devir) ve yerleşim yansısı ──

/** Tapu sürümü yeniyse sahip değişir; sözleşmeler ve borç işletmeyle birlikte devredilir (önizlemede gösterildi). */
export function sahipDegis(is: Isletme, sahip: Kisi, ts: number, ay: number): boolean {
  if (ts <= is.ts) return false;
  is.ts = ts;
  is.sahip = sahip;
  is.sm = {};
  is.stv = 0;
  is.tk = is.tk.filter((t) => t.hedef.o !== sahip.o);
  // Yeni sahip kendi çalışanıysa o sözleşme biter (sahip çalışan olamaz).
  for (const s of etkinler(is)) {
    if (s.k.t === "oyuncu" && s.k.o === sahip.o) {
      s.d = "bitti";
      s.e = ay;
    }
    delete s.vk;
    s.y = s.y.filter((y) => y !== "vekalet");
  }
  is.cek = [0, {}];
  defterYaz(is, ay, "devir", 0, sahip.o);
  return true;
}

/** Yerleşimin tapu defterine yansıyan özet (oda kataloğu, fiyat, kapasite, personel, teklifler). */
export function ayarYuku(is: Isletme) {
  return {
    isletme: is.id,
    ts: is.ts,
    durum: is.durum,
    ad: is.ad,
    seviye: seviye(is),
    kapasite: kapasite(is),
    fc: is.fc,
    kapi: is.kapi,
    po: etkinler(is).flatMap((s) => (s.k.t === "oyuncu" ? [s.k.o] : [])),
    pn: etkinler(is).flatMap((s) => (s.k.t === "npc" ? [s.k.n] : [])),
    to: is.tk.map((t) => t.hedef.o),
  };
}
export type AyarYuku = ReturnType<typeof ayarYuku>;

/** Yansı değiştiyse yeni sürümle çıkış kutusuna koyar (bekleyen eski yansı düşer: yalnız sonuncusu anlamlıdır). */
export function ayarGonder(is: Isletme, an: number): void {
  const yuk = ayarYuku(is);
  const metin = JSON.stringify(yuk);
  if (metin === is.sa) return;
  is.sa = metin;
  is.as++;
  is.cik.k = is.cik.k.filter((k) => k.t !== "ayar");
  cikisAc(is.cik, { i: `${is.id}:ayar:${is.as}`, t: "ayar", h: is.yerlesim, a: 0, y: { ...yuk, as: is.as } }, an);
}

/** Uçuştaki (yerleşime gönderilmiş, onaylanmamış) akçe: değişmez denetimi. */
export function ucustaki(is: Isletme): number {
  return bekleyenToplam(is.cik);
}

// ── Görünümler ──

export function devirOnizleme(is: Isletme) {
  return {
    surum: is.ts,
    isletme: is.id,
    sahip: { id: is.sahip.o, ad: is.sahip.ad },
    kasa: is.kasa,
    emanet: is.emanet,
    borc: is.borc,
    borcAy: is.borcAy,
    iflasEsigi: IFLAS_BORC_AY,
    maasYuku: maasYuku(is),
    sozlesmeler: etkinler(is).map(sozlesmeGorunumu),
    sicil: is.sicil,
    itibar: Math.round(is.it),
    seviye: SEVIYELER[seviye(is)],
    bekleyenTransfer: ucustaki(is),
  };
}

export function seviyeGorunumu(is: Isletme) {
  const p = seviyePuani(is);
  const s = seviyeSirasi(p.puan);
  return { ad: SEVIYELER[s], sira: s, puan: p.puan, dokum: p.dokum, sonrakiEsik: SEVIYE_ESIKLERI[s + 1] ?? null };
}

/** Panel (GDD §17 Yönetim paneli): yetkiye göre. Dışarıdan bakan yalnız vitrin görür. */
export function panel(is: Isletme, o: string, ay: number, an: number) {
  const d = yetkiDurumu(is, o, ay);
  const vitrin = {
    id: is.id,
    tur: is.tur,
    ad: is.ad,
    durum: is.durum,
    sahip: { id: is.sahip.o, ad: is.sahip.ad },
    seviye: seviyeGorunumu(is),
    itibar: Math.round(is.it),
    kapasite: kapasite(is),
    tezyin: is.tz,
    fiyatCarpani: is.fc,
    kapi: is.kapi,
  };
  if (!d.konum) return { isletme: vitrin, konum: null, yetkiler: [] };
  const yonetici = yonetir(d);
  const kasaGorur = yonetici || d.yetkiler.includes("kasa");
  const bugun = gunlukCekim(is, o, an);
  return {
    isletme: {
      ...vitrin,
      ...(kasaGorur ? { kasa: is.kasa, emanet: is.emanet, borc: is.borc, borcAy: is.borcAy, defter: is.df } : {}),
      maasYuku: maasYuku(is),
      kalite: kalite(is),
      npcGeliri: npcGeliri(is),
      bakim: BAKIM[is.tur],
      personel: etkinler(is).map(sozlesmeGorunumu),
      ...(yonetici ? { teklifler: is.tk, oneriler: is.on, sicil: is.sicil, izleme: { ay: is.iz.ay, bayrakli: is.iz.b, musteri: is.iz.s.length, inceleme: is.iz.in } } : {}),
      cekim: { bugun, tavan: d.konum === "sahip" ? SAHIP_GUNLUK_CEKIM : CALISAN_GUNLUK_CEKIM },
      tezyinKalan: Math.max(0, TEZYIN_DEGISIM_EN_COK - is.tzSay),
      adUcretsizKalan: Math.max(0, AD_UCRETSIZ_DEGISIM - is.adSay),
    },
    konum: d.konum,
    yetkiler: d.yetkiler,
  };
}
