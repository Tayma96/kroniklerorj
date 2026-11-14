// Göç (D1, ONLINE_DURUM §4.5): karakterin yerleşimini kalıcı değiştirmesi. Saf kurallar: kapılar (aynı sırayla hem
// önizleme hem gerçek iş), göç paketi (taşınan / emanete kalan) ve yeni yerleşimde karakterin kurulması.
//
// Üç adım (HesapDO yürütür; her biri işlem kimliğiyle tekrar güvenli):
//   (1) eski yerleşim `gocCikis`: kapılar doğrulanır, karakter mühürlenir (`gc.d = "muhur"`; eylem kabul etmez),
//       yol bedeli dünyadan çıkar, kalan akçe ve taşınabilir envanter karakterden düşülüp pakete girer.
//   (2) yeni yerleşim `gocGiris`: paketle yeni yerel kimlikte sakin kurulur (aynı işlem ikinci karakter açmaz).
//   (3) eski yerleşim `gocTamam`: sakin kaydı kapanır (karakter arşivde kalır; envanter fazlası onun üstünde emanettir).
//   (2) kalıcı reddedilirse `gocIptal`: mühür açılır, paket aynen (yol bedeli dahil) geri yazılır.
// Akçe ve mal hiçbir anda iki yerde değildir: (1)'den sonra yalnız pakette, (2)'den sonra yalnız yeni karakterde.

import { MALLAR, type MalId } from "../icerik/mallar.ts";
import type { HataKodu } from "../tipler.ts";
import { olduMu } from "./hanedan.ts";
import type { HanedanKaydi } from "./hanedan.ts";
import type { KaliteParti } from "./kalite.ts";
import { yas } from "./ortak.ts";
import { borcTaraflari } from "./teklif.ts";
import type { Karakter, Kasaba } from "./tipler.ts";
import { sahipMulkleri } from "../mulk/tapu.ts";

/** [PARAMETRE] Göç edebilmek için en az yaş (yıl). */
export const GOC_YAS_EN_AZ = 16;
/** [PARAMETRE] Göçten sonra yeniden göç için beklenen oyun ayı (12 ay = 6 gerçek gün). */
export const GOC_SOGUMA_AY = 12;
/** [PARAMETRE] Yol bedeli (akçe; sabit ve küçük, dünyadan çıkar). */
export const GOC_YOL_BEDELI = 3;
/** [PARAMETRE] Yanında taşınabilen en çok mal (adet, bütün mallar toplamı); fazlası eski yerleşimde emanete kalır. */
export const GOC_TASIMA_EN_COK = 30;
/** [PARAMETRE] Varışta misafirhane hakkı (saat; barinma.ts SEHIR_KORUMA_MS ile aynı, yalnız döküm için). */
export const GOC_MISAFIRHANE_SAAT = 12;

/** Kapılar, denetim sırasıyla (önizleme ve gerçek iş ilk tutmayanı aynı sırayla bulur). */
export const GOC_KAPI_SIRASI = ["olu", "yas", "soguma", "aile", "mulk", "makam", "darbe", "borc", "sozlesme", "acikIs", "dolu", "para"] as const;
export type GocKapisi = (typeof GOC_KAPI_SIRASI)[number];
/** Yerleşimin kendisinin denetlediği kapılar (makam, darbe ve doluluk HesapDO'da: siyaset ve dünya kaydı). */
export type YerelGocKapisi = Exclude<GocKapisi, "makam" | "darbe" | "dolu">;
export const GOC_KAPI_HATASI: Readonly<Record<GocKapisi, HataKodu>> = {
  olu: "olu",
  yas: "goc_yas",
  soguma: "goc_soguma",
  aile: "goc_aile",
  mulk: "goc_mulk",
  makam: "goc_makam",
  darbe: "goc_darbe",
  borc: "goc_borc",
  sozlesme: "goc_sozlesme",
  acikIs: "goc_acik_is",
  dolu: "yerlesim_dolu",
  para: "para_yok",
};

/** Yeni yerleşime taşınmayan (yerleşime bağlı) karakter alanları. Eski karakterde arşiv olarak kalırlar. */
export const KALAN_ALANLAR = ["o", "e", "an", "ba", "us", "tn", "im", "kt", "mk", "ma", "hg", "gc", "gk"] as const;
type KalanAlan = (typeof KALAN_ALANLAR)[number];
export type TasinanKarakter = Omit<Karakter, KalanAlan>;

/** Göç paketi: eski yerleşimin (1) adımında verdiği ve yeni yerleşimin (2) adımında kurduğu. */
export interface GocPaketi {
  v: 1;
  islem: string;
  kaynak: string;
  hedef: string;
  hesap: string;
  /** Çıkış ayı (eski yerleşimin ayı). */
  ay: number;
  yolBedeli: number;
  /** Taşınan karakter (akçe `kar.pa`, envanter `kar.ev`/`kar.kq` yalnız taşınan kısımdır). */
  kar: TasinanKarakter;
  /** Eski yerleşimde emanete kalan mallar (adet). */
  emanet: Record<string, number>;
}

/** Karakterdeki göç izi: (1)'de mühür, (3)'te kapanış; (iptalde silinir). */
export interface GocIzi {
  i: string;
  h: string;
  a: number;
  d: "muhur" | "kapandi";
  p: GocPaketi;
}

/** Hedef çözülür (geçerli ve farklı yerleşim). */
export function gocHedefi(kaynak: string, ham: unknown, yerlesimVar: (id: string) => boolean): { ok: true; hedef: string } | { ok: false; hata: HataKodu } {
  if (typeof ham !== "string" || ham.length === 0 || ham.length > 32 || !yerlesimVar(ham)) return { ok: false, hata: "yerlesim_gecersiz" };
  if (ham === kaynak) return { ok: false, hata: "goc_ayni_yer" };
  return { ok: true, hedef: ham };
}

/** İşlem kimliği biçimi (HesapDO üretir: "goc:" + istekNo). */
export function gocIslemiMi(v: unknown): v is string {
  return typeof v === "string" && /^goc:[A-Za-z0-9_-]{8,64}$/.test(v);
}

/** Yerleşimin denetlediği kapılar: true = geçti. Akçe kapısı yol bedeline bakar. */
export function yerelKapilar(k: Kasaba, kar: Karakter, ay: number): Record<YerelGocKapisi, boolean> {
  const o = kar.o;
  const tk = k.tp?.tk ?? [];
  const acikTeklif = tk.filter((t) => (t.d === "acik" || t.d === "surer") && (t.g === o || t.a === o));
  const borc = acikTeklif.some((t) => (t.t === "borc" || t.t === "npcBorc") && (borcTaraflari(t).borclu === o || borcTaraflari(t).alacakli === o));
  const sozlesme = acikTeklif.some((t) => t.t !== "borc" && t.t !== "npcBorc")
    || (k.tl?.hb ?? []).some((b) => (b.d === "acik" || b.d === "surer") && (b.h === o || b.c === o))
    || (k.tl?.zv ?? []).some((z) => z.ku === o || z.ab === o || z.u.some((x) => x.o === o) || z.dv.some((x) => x[0] === o));
  const ek = k.ek;
  const acikIs = (ek?.il ?? []).some((x) => x.o === o && x.d === "acik")
    || (ek?.is ?? []).some((x) => (x.m === o || x.u === o) && (x.d === "acik" || x.d === "surer" || x.d === "gecikti"))
    || (ek?.hi ?? []).some((x) => x.o === o && x.d === "acik")
    // Kervan (D2): yoldaki kervanın hasılatı ve dönen malı bu yerleşimdeki karaktere yazılır.
    || (k.kv?.c.k ?? []).some((x) => x.t === "kervan" && (x.y as { o?: unknown }).o === o);
  const md = k.mk;
  const mulk = !!md && (sahipMulkleri(md, o).length > 0
    || md.cik.k.some((x) => x.y.o === o || (x.y.sahip as { o?: string } | undefined)?.o === o)
    || Object.values(md.t).some((t) => t.dv?.o === o));
  const hd = kar.hd;
  return {
    olu: !olduMu(kar),
    yas: yas(kar.d, ay) >= GOC_YAS_EN_AZ,
    soguma: kar.gg === undefined || ay - kar.gg >= GOC_SOGUMA_AY,
    aile: !hd?.es && !hd?.dv,
    mulk: !mulk,
    borc: !borc,
    sozlesme: !sozlesme,
    acikIs: !acikIs,
    para: kar.pa >= GOC_YOL_BEDELI,
  };
}

/** Sıradaki ilk tutmayan kapının hatası (yoksa undefined). `ek` HesapDO'nun kapılarıdır. */
export function ilkEngel(yerel: Partial<Record<GocKapisi, boolean>>, ek: Partial<Record<GocKapisi, boolean>> = {}): HataKodu | undefined {
  for (const kapi of GOC_KAPI_SIRASI) {
    const g = ek[kapi] ?? yerel[kapi];
    if (g === false) return GOC_KAPI_HATASI[kapi];
  }
  return undefined;
}

/** Taşıma sırası: birim taban değeri yüksek mal önce, eşitte kimlik sırası (deterministik; önizleme ile aynı). */
function tasimaSirasi(ev: Record<string, number>): string[] {
  const taban = (m: string) => MALLAR[m as MalId]?.taban ?? 0;
  return Object.keys(ev).filter((m) => (ev[m] ?? 0) > 0).sort((a, b) => taban(b) - taban(a) || (a < b ? -1 : a > b ? 1 : 0));
}

/** Envanter bölüşümü: taşınan ve emanete kalan adetler (toplamları envantere eşittir). */
export function envanterBol(ev: Record<string, number> | undefined, enCok = GOC_TASIMA_EN_COK): { tasinan: Record<string, number>; emanet: Record<string, number> } {
  const tasinan: Record<string, number> = {};
  const emanet: Record<string, number> = {};
  let kalan = enCok;
  for (const m of tasimaSirasi(ev ?? {})) {
    const n = ev![m]!;
    const t = Math.min(n, kalan);
    kalan -= t;
    if (t > 0) tasinan[m] = t;
    if (n - t > 0) emanet[m] = n - t;
  }
  return { tasinan, emanet };
}

/** İzli partileri öndekinden (yüksek kalite) başlayarak `n` adede kadar ayırır; kalan partiler ayrı döner. */
export function partiBol(liste: readonly KaliteParti[], n: number): [KaliteParti[], KaliteParti[]] {
  const ilk: KaliteParti[] = [];
  const son: KaliteParti[] = [];
  let kalan = n;
  for (const p of liste) {
    const al = Math.min(kalan, p[1]);
    kalan -= al;
    if (al > 0) ilk.push(p[2] === undefined ? [p[0], al] : [p[0], al, p[2]]);
    if (p[1] - al > 0) son.push(p[2] === undefined ? [p[0], p[1] - al] : [p[0], p[1] - al, p[2]]);
  }
  return [ilk, son];
}

/** Paketin akçe ve envanter dökümü (karakteri değiştirmez; önizleme aynısını gösterir). */
export function gocDokumu(kar: Karakter) {
  const { tasinan, emanet } = envanterBol(kar.ev);
  const say = (r: Record<string, number>) => Object.values(r).reduce((a, x) => a + x, 0);
  return {
    akce: { mevcut: kar.pa, yolBedeli: GOC_YOL_BEDELI, tasinan: Math.max(0, kar.pa - GOC_YOL_BEDELI) },
    envanter: { sinir: GOC_TASIMA_EN_COK, tasinan, emanet, tasinanAdet: say(tasinan), emanetAdet: say(emanet) },
  };
}

function kqBol(kq: Karakter["kq"], tasinan: Record<string, number>): [Karakter["kq"], Karakter["kq"]] {
  if (!kq) return [undefined, undefined];
  const a: NonNullable<Karakter["kq"]> = {};
  const b: NonNullable<Karakter["kq"]> = {};
  for (const [m, liste] of Object.entries(kq)) {
    const [ilk, son] = partiBol(liste, tasinan[m] ?? 0);
    if (ilk.length) a[m] = ilk;
    if (son.length) b[m] = son;
  }
  return [Object.keys(a).length ? a : undefined, Object.keys(b).length ? b : undefined];
}

/**
 * (1) Paket çıkarılır ve karakterden düşülür: akçe sıfırlanır (yol bedeli dünyadan çıkar, kalanı pakete), taşınan
 * mallar ve partileri pakete geçer, emanet karakterde kalır. Çağıran kapıları önceden denetler.
 */
export function paketCikar(kar: Karakter, k: Pick<Kasaba, "y">, hedef: string, islem: string, ay: number): GocPaketi {
  const { tasinan, emanet } = envanterBol(kar.ev);
  const [kqTasinan, kqEmanet] = kqBol(kar.kq, tasinan);
  const akce = kar.pa - GOC_YOL_BEDELI;
  const kopya = structuredClone(kar) as Karakter & Partial<Record<KalanAlan, unknown>>;
  for (const a of KALAN_ALANLAR) delete kopya[a];
  kopya.pa = akce;
  if (Object.keys(tasinan).length) kopya.ev = tasinan;
  else delete kopya.ev;
  if (kqTasinan) kopya.kq = kqTasinan;
  else delete kopya.kq;
  // Eski karakter: akçe pakete ve yola gitti; yalnız emanet mallar kalır.
  kar.pa = 0;
  if (Object.keys(emanet).length) kar.ev = emanet;
  else delete kar.ev;
  if (kqEmanet) kar.kq = kqEmanet;
  else delete kar.kq;
  const paket: GocPaketi = { v: 1, islem, kaynak: k.y, hedef, hesap: kar.h, ay, yolBedeli: GOC_YOL_BEDELI, kar: kopya as TasinanKarakter, emanet };
  kar.gc = { i: islem, h: hedef, a: ay, d: "muhur", p: paket };
  return paket;
}

/** İptal: paket aynen (yol bedeli dahil) geri yazılır, mühür kalkar. */
export function paketGeriYaz(kar: Karakter): number {
  const gc = kar.gc;
  if (!gc || gc.d !== "muhur") return 0;
  const p = gc.p;
  const geri = p.kar.pa + p.yolBedeli;
  kar.pa += geri;
  const ev = (kar.ev ??= {});
  for (const [m, n] of Object.entries(p.kar.ev ?? {})) ev[m] = (ev[m] ?? 0) + n;
  if (Object.keys(ev).length === 0) delete kar.ev;
  if (p.kar.kq) {
    const kq = (kar.kq ??= {});
    for (const [m, liste] of Object.entries(p.kar.kq)) kq[m] = [...liste, ...(kq[m] ?? [])].sort((a, b) => b[0] - a[0]);
  }
  delete kar.gc;
  return geri;
}

/** (2) Yeni yerleşimde karakter: taşınan alanlar + yeni yerel kimlik; hane, usta, tanıdıklar ve anılar sıfırdan. */
export function gocKarakteri(paket: GocPaketi, o: string, ay: number, imlec: number): Karakter {
  const t = structuredClone(paket.kar) as TasinanKarakter;
  const kar: Karakter = {
    ...t,
    o,
    h: paket.hesap,
    e: 0,
    an: 0,
    ba: 0,
    us: 0,
    tn: {},
    im: imlec,
    kt: [],
    mk: "",
    ma: -1e9,
    gg: ay,
    gk: paket.islem,
  };
  if (t.hd) {
    // Eş, çocuk ve akraba NPC'ler eski yerleşimin NPC'leridir: akrabalık kaydı eski karakterde kalır.
    const hd: HanedanKaydi = { h: t.hd.h, n: t.hd.n, s: t.hd.s };
    if (t.hd.am) hd.am = t.hd.am;
    if (t.hd.at) hd.at = t.hd.at;
    if (t.hd.oa !== undefined) hd.oa = t.hd.oa;
    kar.hd = hd;
  }
  return kar;
}

/** Paket biçimi (iç ileti; yine de alan alan denetlenir). */
export function paketGecerli(p: unknown, hesapId: string, hedef: string, islem: string): p is GocPaketi {
  if (typeof p !== "object" || p === null) return false;
  const x = p as Partial<GocPaketi>;
  const kar = x.kar as Partial<Karakter> | undefined;
  return x.v === 1 && x.islem === islem && x.hesap === hesapId && x.hedef === hedef && typeof x.kaynak === "string"
    && typeof kar === "object" && kar !== null && kar.h === hesapId && typeof kar.ad === "string"
    && Number.isInteger(kar.pa) && (kar.pa as number) >= 0 && Number.isInteger(kar.d)
    && Array.isArray(kar.oz) && Array.isArray(kar.be) && Array.isArray(kar.nm);
}
