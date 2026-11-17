// Han masa oyunları çatısı (saf). Bir masada aynı anda en çok bir oyun olur; MasaDO onu depoda tek anahtarda tutar.
//
// Durum makinesi: bekleme → oyun → bitti.
//  - bekleme: oturan biri oyunu açar (kurucu olur, ilk oyuncu). Oturanlar katılır/ayrılır; kurucu en az `enAz` kişiyle
//    başlatır. Kalkan ya da masadan çıkan bekleme listesinden düşer (kurucu giderse sıradaki kurucu olur).
//  - oyun: sırası gelen hamle yapar. Zamanlayıcı yoktur. Her durum değişimi hamle sayacını (`n`) bir artırır; istemci
//    hamlede gördüğü `n`yi gönderir: eski `n` tekrar sayılır (durum değişmez, güncel görünüm döner).
//  - bitti: sonuç (kazandı/berabere/dağıldı) masada görünür; yeni oyun açılınca yerine geçer.
// Kopma: oyuncu masadan çıkarsa "yok" sayılır (geri dönünce silinir). OYUN_KOPMA_SABRI geçince, sırası gelen yoksa
// oradakiler sırasını cezasız geçebilir (oyun destekliyorsa) ve dağıtma oyunda onun oyu aranmaz. Çekilen oyuncu bir şey
// kaybetmez; oyun onsuz süremiyorsa sonuçsuz dağılır (kimse kazanmaz). Akçe bahsi, ödül, nam yoktur.
//
// Rastgelelik: başlarken sunucu gizli bir tohum üretir ve SHA-256 taahhüdünü herkese gösterir. Her adımın zarı
// SHA-256(tohum:oyun:adım)'dan türetilir. Oyun bitince tohum ve hamle kaydı açıklanır: herkes `oyunuYenidenOyna` ile
// aynı sonucu bulabilir.

import { basarili, hata, type Sonuc } from "../../tipler.ts";
import { mulberry32, type Zar } from "../../yerlesim/rastgele.ts";
import { CANAK } from "./canak.ts";
import { DOKUZ_TAS_OYUNU } from "./dokuztas.ts";
import type { OyunModulu, OyunSonucu } from "./tur.ts";

/** Oyun kayıt tablosu (tek tablo): kimlik → kural modülü (oyuncu sayısı modülde). */
export const OYUNLAR = {
  canak: CANAK as OyunModulu<unknown>,
  dokuztas: DOKUZ_TAS_OYUNU as OyunModulu<unknown>,
} as const;
export type OyunTuru = keyof typeof OYUNLAR;

/** [PARAMETRE] Kopan oyuncu için bekleme (ms): bu süreden sonra sırası geçilebilir ve dağıtmada oyu aranmaz. */
export const OYUN_KOPMA_SABRI_MS = 3 * 60_000;
/** [PARAMETRE] Saklanan hamle kaydının en çok uzunluğu (denetim için; aşılırsa kayıt `kesik` olur). */
export const OYUN_KAYIT_EN_COK = 800;

export type OyunAsamasi = "bekleme" | "oyun" | "bitti";
export type OyunSonucTuru = "kazandi" | "berabere" | "dagildi";

/** Kayıttaki adım: [oyuncu dizini, hamle] ya da [dizin, "pas"] / [dizin, "cekil"]. */
export type OyunAdimi = [number, Record<string, unknown> | "pas" | "cekil"];

export interface MasaOyunu {
  id: number;
  tur: OyunTuru;
  asama: OyunAsamasi;
  kurucu: string;
  oyuncular: string[];
  adlar: string[];
  /** Uygulanan adım sayısı (sonraki hamle bu numarayla gelir). */
  n: number;
  /** GİZLİ: oyun bitene dek yalnız depoda. */
  tohum?: string;
  taahhut?: string;
  /** Kural modülünün durumu (gizli alanlar içerebilir; görünüm yalnız modülün izin listesinden kurulur). */
  d?: unknown;
  /** GİZLİ: hamle kaydı (bitince açıklanır). */
  kayit?: OyunAdimi[];
  kesik?: true;
  /** Yok olan oyuncular: hesap → ayrılış anı. */
  yok: Record<string, number>;
  cekilen: string[];
  dagit: string[];
  sonuc?: { tur: OyunSonucTuru; kazanan: string[] };
  z: number;
}

/** İstemciye giden görünüm (izin listesi). `ben` yalnız izleyen oyuncuysa ve oyun gizli bilgi taşıyorsa. */
export interface OyunGorunumu {
  id: number;
  tur: OyunTuru;
  asama: OyunAsamasi;
  kurucu: string;
  enAz: number;
  enCok: number;
  oyuncular: { hesap: string; ad: string; yok?: number; cekildi?: true }[];
  n: number;
  sira: string | null;
  taahhut?: string;
  durum?: Record<string, unknown>;
  ben?: Record<string, unknown>;
  dagit: string[];
  /** Sırası gelen oyuncu sabır süresinden uzun süredir yoksa ve oyun destekliyorsa true. */
  pasAcik: boolean;
  /** Beklemede: sabırdan uzun süredir başlatılmadı; bekleyen herhangi bir oturan başlatabilir (kurucu olur) ya da dağıtabilir. */
  devralAcik: boolean;
  sabir: number;
  sonuc?: { tur: OyunSonucTuru; kazanan: string[] };
  /** Yalnız bitince: denetim için tohum ve hamle kaydı. */
  tohum?: string;
  kayit?: OyunAdimi[];
  kesik?: true;
}

/** Vitrin özeti (herkese açık; gizli bilgi yok). */
export interface OyunVitrinOzeti {
  tur: OyunTuru;
  asama: "bekleme" | "oyun";
  oyuncu: number;
  enCok: number;
  seyirci: number;
}

export function oyunTuruCoz(ham: unknown): OyunTuru | undefined {
  return typeof ham === "string" && Object.hasOwn(OYUNLAR, ham) ? (ham as OyunTuru) : undefined;
}

export function modul(t: OyunTuru): OyunModulu<unknown> {
  return OYUNLAR[t];
}

/** Bekleme ya da oyun sürüyor mu. */
export function oyunSuruyor(o: MasaOyunu | undefined): boolean {
  return o !== undefined && o.asama !== "bitti";
}

/**
 * Masa meşgul mü (sahne/atışma açılamaz): oyun sürüyor ve terk edilmemiş, ya da bekleme sabırdan kısa. Bütün
 * oyuncuları sabırdan uzun süredir masada olmayan oyun ve sabırdan uzun süredir başlatılmayan bekleme masayı
 * kilitlemez (sahne açılabilir; açılınca bayat oyun masadan kalkar).
 */
export function oyunMesgul(o: MasaOyunu | undefined, simdi: number): boolean {
  return oyunSuruyor(o) && !terkEdilmis(o!, simdi) && !beklemeBayat(o!, simdi);
}

/**
 * Bekleme sabırdan uzun süredir başlatılmadı (kurucu oturuyor ama ilgilenmiyor): bekleyen herhangi bir oturan
 * kuruculuğu devralıp başlatabilir ya da beklemeyi dağıtabilir. Süre beklemenin açılışından (`z`) sayılır.
 */
export function beklemeBayat(o: MasaOyunu, simdi: number): boolean {
  return o.asama === "bekleme" && simdi - o.z >= OYUN_KOPMA_SABRI_MS;
}

/** Beklemede kurucunun yerine geçebilir mi: bekleme bayat ve kendisi bekleme listesinde (liste yalnız oturanlardır). */
function devralabilir(o: MasaOyunu, kim: string, simdi: number): boolean {
  return beklemeBayat(o, simdi) && o.oyuncular.includes(kim);
}

// ---------------------------------------------------------------- rastgelelik

function hex(b: ArrayBuffer): string {
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** Tohumun SHA-256 taahhüdü (onaltılık). */
export async function taahhutHesapla(tohum: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(tohum)));
}

/** Adımın zarı: SHA-256(tohum:oyun:adım)'ın ilk 4 baytı tohumlu mulberry32'ye girer (tohum geri çözülemez). */
export async function adimZari(tohum: string, id: number, adim: number): Promise<Zar> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${tohum}:${id}:${adim}`)));
  return mulberry32(((h[0]! << 24) | (h[1]! << 16) | (h[2]! << 8) | h[3]!) >>> 0);
}

// ---------------------------------------------------------------- bekleme

/** Oturan biri oyun açar. Eski oyun bittiyse ya da bütün oyuncuları sabırdan uzun süredir yoksa yerine geçer. */
export function oyunAc(eski: MasaOyunu | undefined, ham: unknown, kim: string, ad: string, simdi: number): Sonuc<MasaOyunu> {
  const tur = oyunTuruCoz(ham);
  if (!tur) return hata("oyun_turu_gecersiz");
  if (eski && oyunMesgul(eski, simdi)) return hata("oyun_var");
  return basarili({ id: Math.max(simdi, (eski?.id ?? 0) + 1), tur, asama: "bekleme", kurucu: kim, oyuncular: [kim], adlar: [ad], n: 0, yok: {}, cekilen: [], dagit: [], z: simdi });
}

/** Oyun sürüyor ama hiçbir oyuncu sabır süresi içinde masada değil (masa kilitlenmez). */
export function terkEdilmis(o: MasaOyunu, simdi: number): boolean {
  if (o.asama !== "oyun") return false;
  return etkinOyuncular(o).every((h) => o.yok[h] !== undefined && simdi - o.yok[h]! >= OYUN_KOPMA_SABRI_MS);
}

export function oyunKatil(o: MasaOyunu | undefined, kim: string, ad: string): Sonuc<{ oyun: MasaOyunu; degisti: boolean }> {
  if (!o || o.asama === "bitti") return hata("oyun_yok");
  if (o.oyuncular.includes(kim)) return basarili({ oyun: o, degisti: false });
  if (o.asama !== "bekleme") return hata("oyun_basladi");
  if (o.oyuncular.length >= modul(o.tur).enCok) return hata("oyun_dolu");
  return basarili({ oyun: { ...o, oyuncular: [...o.oyuncular, kim], adlar: [...o.adlar, ad] }, degisti: true });
}

/** Bekleme listesinden ayrılır; kurucu ayrılırsa sıradaki kurucu olur; kimse kalmazsa oyun kalkar (undefined). */
export function beklemedenCikar(o: MasaOyunu, kimler: readonly string[]): MasaOyunu | undefined {
  const kalan = o.oyuncular.map((h, i) => [h, o.adlar[i] ?? ""] as const).filter(([h]) => !kimler.includes(h));
  if (kalan.length === 0) return undefined;
  const kurucu = kalan.some(([h]) => h === o.kurucu) ? o.kurucu : kalan[0]![0];
  return { ...o, kurucu, oyuncular: kalan.map(([h]) => h), adlar: kalan.map(([, a]) => a) };
}

/**
 * Kurucu başlatır. `tohum`/`taahhut`: sunucu üretir; `zar`: adım 0'ın zarı. Bekleme sabırdan uzun süredir
 * başlatılmadıysa (beklemeBayat) bekleyen herhangi bir oturan başlatır ve kurucu olur.
 */
export function oyunBaslat(o: MasaOyunu | undefined, kim: string, tohum: string, taahhut: string, zar: Zar, simdi = 0): Sonuc<MasaOyunu> {
  if (!o || o.asama === "bitti") return hata("oyun_yok");
  if (o.asama !== "bekleme") return hata("oyun_basladi");
  if (kim !== o.kurucu && !devralabilir(o, kim, simdi)) return hata("yetki_yok");
  const m = modul(o.tur);
  if (o.oyuncular.length < m.enAz) return hata("oyuncu_az");
  return basarili({ ...o, kurucu: kim, asama: "oyun", n: 0, tohum, taahhut, d: m.kur(o.oyuncular.length, zar), kayit: [], yok: {}, cekilen: [], dagit: [] });
}

// ---------------------------------------------------------------- oyun

function etkinOyuncular(o: MasaOyunu): string[] {
  return o.oyuncular.filter((h) => !o.cekilen.includes(h));
}

function siradaki(o: MasaOyunu): string | null {
  if (o.asama !== "oyun" || o.d === undefined) return null;
  const i = modul(o.tur).sira(o.d);
  return i === null ? null : (o.oyuncular[i] ?? null);
}

function kaydet(o: MasaOyunu, adim: OyunAdimi): Pick<MasaOyunu, "kayit" | "kesik"> {
  const k = [...(o.kayit ?? []), adim];
  if (k.length <= OYUN_KAYIT_EN_COK) return { kayit: k, ...(o.kesik ? { kesik: true as const } : {}) };
  return { kayit: k.slice(-OYUN_KAYIT_EN_COK), kesik: true };
}

/** Hamlenin kayda geçen hali: yalnız bilinen alanlar (istemcinin fazladan alanları saklanmaz). */
const KAYIT_ALANLARI = ["tut", "yenile", "koy", "kaynak", "hedef", "al"] as const;
function hamleOzu(ham: unknown): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  if (typeof ham !== "object" || ham === null) return r;
  for (const a of KAYIT_ALANLARI) {
    const v = (ham as Record<string, unknown>)[a];
    if (v !== undefined) r[a] = Array.isArray(v) ? [...v] : v;
  }
  return r;
}

/** Modül durumu değişti: adım sayacı artar; bittiyse sonuç yazılır, tohum açıklanmak üzere işaretlenir. */
function ilerlet(o: MasaOyunu, d: unknown, adim: OyunAdimi): MasaOyunu {
  const y: MasaOyunu = { ...o, d, n: o.n + 1, dagit: [], ...kaydet(o, adim) };
  const s = modul(o.tur).sonuc(d);
  return s ? bitir(y, s) : y;
}

function bitir(o: MasaOyunu, s: OyunSonucu | undefined): MasaOyunu {
  const kazanan = (s?.kazanan ?? []).map((i) => o.oyuncular[i]).filter((h): h is string => typeof h === "string");
  const tur: OyunSonucTuru = !s ? "dagildi" : s.berabere ? "berabere" : "kazandi";
  return { ...o, asama: "bitti", sonuc: { tur, kazanan }, dagit: [] };
}

/**
 * Hamle. `n`: istemcinin gördüğü adım numarası. Eski numara tekrar sayılır (`tekrar: true`, durum değişmez); ileri
 * numara reddedilir. Doğrulama modüldedir; istemci sonucu ya da zarı veremez.
 */
export function oyunHamle(o: MasaOyunu | undefined, kim: string, hamNo: unknown, ham: unknown, zar: Zar): Sonuc<{ oyun: MasaOyunu; tekrar: boolean }> {
  if (!o || o.asama === "bekleme") return hata("oyun_yok");
  const i = o.oyuncular.indexOf(kim);
  if (i < 0 || o.cekilen.includes(kim)) return hata("oyuncu_degil");
  if (!Number.isInteger(hamNo) || (hamNo as number) < 0) return hata("gecersiz_istek");
  if ((hamNo as number) < o.n) return basarili({ oyun: o, tekrar: true });
  if (o.asama === "bitti") return hata("oyun_yok");
  if (hamNo !== o.n) return hata("hamle_no");
  const m = modul(o.tur);
  const r = m.hamle(o.d, i, ham, zar);
  if (!r.ok) return r;
  return basarili({ oyun: ilerlet(o, r.deger, [i, hamleOzu(ham)]), tekrar: false });
}

/** Sırası gelen oyuncu sabırdan uzun süredir yoksa oradaki bir oyuncu sırasını cezasız geçer. */
export function oyunPas(o: MasaOyunu | undefined, kim: string, hamNo: unknown, simdi: number, zar: Zar): Sonuc<{ oyun: MasaOyunu; tekrar: boolean }> {
  if (!o || o.asama === "bekleme") return hata("oyun_yok");
  if (!etkinOyuncular(o).includes(kim)) return hata("oyuncu_degil");
  if (!Number.isInteger(hamNo) || (hamNo as number) < 0) return hata("gecersiz_istek");
  if ((hamNo as number) < o.n) return basarili({ oyun: o, tekrar: true });
  if (o.asama === "bitti") return hata("oyun_yok");
  if (hamNo !== o.n) return hata("hamle_no");
  const s = siradaki(o);
  if (!s || s === kim || !pasAcik(o, simdi)) return hata("pas_yok");
  const i = o.oyuncular.indexOf(s);
  const d = modul(o.tur).pasGec(o.d, i, zar);
  if (d === undefined) return hata("pas_yok");
  return basarili({ oyun: ilerlet(o, d, [i, "pas"]), tekrar: false });
}

export function pasAcik(o: MasaOyunu, simdi: number): boolean {
  const s = siradaki(o);
  if (!s || o.yok[s] === undefined || simdi - o.yok[s]! < OYUN_KOPMA_SABRI_MS) return false;
  return modul(o.tur).pasGec(o.d, o.oyuncular.indexOf(s), () => 0.5) !== undefined;
}

/**
 * Oyuncu ayrılır: beklemede listeden düşer; oyunda çekilir (oyun onsuz süremiyorsa sonuçsuz dağılır). Tekrar
 * isteğinde (zaten ayrılmış) değişiklik yok.
 */
export function oyundanCekil(o: MasaOyunu | undefined, kim: string, zar: Zar): Sonuc<{ oyun: MasaOyunu | undefined; degisti: boolean }> {
  if (!o || o.asama === "bitti") return hata("oyun_yok");
  if (o.asama === "bekleme") {
    if (!o.oyuncular.includes(kim)) return basarili({ oyun: o, degisti: false });
    return basarili({ oyun: beklemedenCikar(o, [kim]), degisti: true });
  }
  const i = o.oyuncular.indexOf(kim);
  if (i < 0) return hata("oyuncu_degil");
  if (o.cekilen.includes(kim)) return basarili({ oyun: o, degisti: false });
  const d = modul(o.tur).cekil(o.d, i, zar);
  const y: MasaOyunu = { ...o, cekilen: [...o.cekilen, kim] };
  if (d === undefined) return basarili({ oyun: bitir({ ...y, n: o.n + 1, ...kaydet(o, [i, "cekil"]) }, undefined), degisti: true });
  return basarili({ oyun: ilerlet(y, d, [i, "cekil"]), degisti: true });
}

/** Dağıtma oyunda oyu aranan oyuncular: çekilmemiş ve (masada ya da sabır süresi dolmamış). */
export function dagitHakki(o: MasaOyunu, simdi: number): string[] {
  return etkinOyuncular(o).filter((h) => o.yok[h] === undefined || simdi - o.yok[h]! < OYUN_KOPMA_SABRI_MS);
}

/**
 * Dağıtma oyu (oyunda). Hakkı olan herkes oy verince oyun sonuçsuz biter (kimse kazanmaz, kimse kaybetmez). Hamle
 * yapılınca oylar sıfırlanır (oyun sürüyor demektir). Kurucu beklemede dağıtırsa oyun hemen kalkar; bekleme
 * sabırdan uzun süredir başlatılmadıysa bekleyen herhangi bir oturan da dağıtabilir.
 */
export function oyunDagit(o: MasaOyunu | undefined, kim: string, simdi: number): Sonuc<{ oyun: MasaOyunu | undefined; degisti: boolean }> {
  if (!o || o.asama === "bitti") return hata("oyun_yok");
  if (o.asama === "bekleme") {
    if (kim !== o.kurucu && !devralabilir(o, kim, simdi)) return hata("yetki_yok");
    return basarili({ oyun: undefined, degisti: true });
  }
  if (!etkinOyuncular(o).includes(kim)) return hata("oyuncu_degil");
  if (o.dagit.includes(kim)) return basarili({ oyun: o, degisti: false });
  const dagit = [...o.dagit, kim];
  const y: MasaOyunu = { ...o, dagit };
  if (dagitHakki(y, simdi).every((h) => dagit.includes(h))) return basarili({ oyun: bitir(y, undefined), degisti: true });
  return basarili({ oyun: y, degisti: true });
}

/**
 * Masadaki bağlantılar/oturuş değişince: beklemede oturmayan listeden düşer; oyunda masada olmayan "yok" olur, dönen
 * silinir. Değişti mi döner.
 */
export function oyunDenetle(o: MasaOyunu | undefined, bagli: ReadonlySet<string>, oturan: ReadonlySet<string>, simdi: number): { oyun: MasaOyunu | undefined; degisti: boolean } {
  if (!o || o.asama === "bitti") return { oyun: o, degisti: false };
  if (o.asama === "bekleme") {
    const giden = o.oyuncular.filter((h) => !oturan.has(h));
    return giden.length ? { oyun: beklemedenCikar(o, giden), degisti: true } : { oyun: o, degisti: false };
  }
  const yok: Record<string, number> = {};
  let degisti = false;
  for (const h of etkinOyuncular(o)) {
    if (bagli.has(h)) {
      if (o.yok[h] !== undefined) degisti = true;
    } else {
      yok[h] = o.yok[h] ?? simdi;
      if (o.yok[h] === undefined) degisti = true;
    }
  }
  if (!degisti) return { oyun: o, degisti: false };
  // Dönen oyuncunun eski dağıtma oyu yoktur (kendisi verir); gidenin verdiği oy kalır.
  return { oyun: { ...o, yok }, degisti: true };
}

// ---------------------------------------------------------------- görünüm

/** İzleyene özel görünüm: oyuncuya kendi gizli bilgisi, başkasına (seyirci dahil) yalnız açık bilgi. */
export function oyunGorunumu(o: MasaOyunu, izleyen: string | null, simdi: number): OyunGorunumu {
  const m = modul(o.tur);
  const g: OyunGorunumu = {
    id: o.id,
    tur: o.tur,
    asama: o.asama,
    kurucu: o.kurucu,
    enAz: m.enAz,
    enCok: m.enCok,
    oyuncular: o.oyuncular.map((h, i) => ({
      hesap: h,
      ad: o.adlar[i] ?? "",
      ...(o.yok[h] !== undefined ? { yok: o.yok[h] } : {}),
      ...(o.cekilen.includes(h) ? { cekildi: true as const } : {}),
    })),
    n: o.n,
    sira: siradaki(o),
    dagit: [...o.dagit],
    pasAcik: o.asama === "oyun" && pasAcik(o, simdi),
    devralAcik: beklemeBayat(o, simdi),
    sabir: OYUN_KOPMA_SABRI_MS,
  };
  if (o.taahhut) g.taahhut = o.taahhut;
  if (o.d !== undefined) {
    g.durum = m.acik(o.d);
    const i = izleyen === null ? -1 : o.oyuncular.indexOf(izleyen);
    if (i >= 0 && o.asama === "oyun" && !o.cekilen.includes(izleyen!)) {
      const ben = m.ozel(o.d, i);
      if (Object.keys(ben).length) g.ben = ben;
    }
  }
  if (o.sonuc) g.sonuc = { tur: o.sonuc.tur, kazanan: [...o.sonuc.kazanan] };
  if (o.asama === "bitti" && o.tohum) {
    g.tohum = o.tohum;
    g.kayit = structuredClone(o.kayit ?? []);
    if (o.kesik) g.kesik = true;
  }
  return g;
}

export function vitrinOzeti(o: MasaOyunu | undefined, bagliHesaplar: readonly string[]): OyunVitrinOzeti | undefined {
  if (!o || o.asama === "bitti") return undefined;
  const oyuncu = new Set(etkinOyuncular(o));
  return {
    tur: o.tur,
    asama: o.asama,
    oyuncu: oyuncu.size,
    enCok: modul(o.tur).enCok,
    seyirci: new Set(bagliHesaplar.filter((h) => !oyuncu.has(h))).size,
  };
}

// ---------------------------------------------------------------- denetim ve depo

/**
 * Denetim: açıklanan tohum ve hamle kaydından oyunu baştan oynatır; modül durumunu döner (kayıt geçersizse undefined).
 * Sunucu da istemci de aynı sonucu bulur (tohum taahhüdü `taahhutHesapla` ile doğrulanır).
 */
export async function oyunuYenidenOyna(tur: OyunTuru, oyuncuSayisi: number, tohum: string, id: number, kayit: readonly OyunAdimi[]): Promise<unknown> {
  const m = modul(tur);
  let d = m.kur(oyuncuSayisi, await adimZari(tohum, id, 0));
  for (let k = 0; k < kayit.length; k++) {
    const [i, h] = kayit[k]!;
    const zar = await adimZari(tohum, id, k + 1);
    if (h === "pas") {
      const y = m.pasGec(d, i, zar);
      if (y === undefined) return undefined;
      d = y;
    } else if (h === "cekil") {
      const y = m.cekil(d, i, zar);
      if (y === undefined) return d;
      d = y;
    } else {
      const r = m.hamle(d, i, h, zar);
      if (!r.ok) return undefined;
      d = r.deger;
    }
  }
  return d;
}

const KIMLIK = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 64;

/** Depodaki kaydı doğrular (bozuksa undefined: masa kilitli kalmaz). */
export function masaOyunuCoz(ham: unknown): MasaOyunu | undefined {
  if (typeof ham !== "object" || ham === null) return undefined;
  const o = ham as Record<string, unknown>;
  const tur = oyunTuruCoz(o.tur);
  if (!tur || typeof o.id !== "number" || typeof o.z !== "number" || !KIMLIK(o.kurucu)) return undefined;
  if (o.asama !== "bekleme" && o.asama !== "oyun" && o.asama !== "bitti") return undefined;
  const m = modul(tur);
  if (!Array.isArray(o.oyuncular) || o.oyuncular.length < 1 || o.oyuncular.length > m.enCok || !o.oyuncular.every(KIMLIK)) return undefined;
  if (!Array.isArray(o.adlar) || o.adlar.length !== o.oyuncular.length || !o.adlar.every((a) => typeof a === "string" && a.length <= 64)) return undefined;
  if (!Number.isInteger(o.n) || (o.n as number) < 0) return undefined;
  const liste = (v: unknown) => Array.isArray(v) && v.every((h) => (o.oyuncular as string[]).includes(h as string));
  if (!liste(o.cekilen) || !liste(o.dagit)) return undefined;
  const yok: Record<string, number> = {};
  if (typeof o.yok !== "object" || o.yok === null) return undefined;
  for (const [h, z] of Object.entries(o.yok as Record<string, unknown>)) if ((o.oyuncular as string[]).includes(h) && typeof z === "number") yok[h] = z;
  const r: MasaOyunu = {
    id: o.id,
    tur,
    asama: o.asama,
    kurucu: o.kurucu,
    oyuncular: [...(o.oyuncular as string[])],
    adlar: [...(o.adlar as string[])],
    n: o.n as number,
    yok,
    cekilen: [...(o.cekilen as string[])],
    dagit: [...(o.dagit as string[])],
    z: o.z,
  };
  if (o.asama !== "bekleme") {
    if (typeof o.tohum !== "string" || typeof o.taahhut !== "string" || !Array.isArray(o.kayit)) return undefined;
    const d = m.coz(o.d, r.oyuncular.length);
    if (d === undefined) return undefined;
    r.tohum = o.tohum;
    r.taahhut = o.taahhut;
    r.d = d;
    r.kayit = structuredClone(o.kayit as OyunAdimi[]);
    if (o.kesik === true) r.kesik = true;
  }
  if (o.asama === "bitti") {
    const s = o.sonuc as Record<string, unknown> | undefined;
    if (!s || (s.tur !== "kazandi" && s.tur !== "berabere" && s.tur !== "dagildi") || !liste(s.kazanan)) return undefined;
    r.sonuc = { tur: s.tur, kazanan: [...(s.kazanan as string[])] };
  }
  return r;
}
