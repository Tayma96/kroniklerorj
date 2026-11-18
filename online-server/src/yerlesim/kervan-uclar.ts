// Kervan (D2) uçları ve DO'lar arası akış: önizleme, kalkış, fiyat haberi (kaynak yerleşim); varış ve fiyat özeti
// (hedef yerleşim); uzlaştırma (kaynak: varış ayı gelen kervanları hedefe teslim eder, cevabı bir kez uygular).
// Kurallar src/yerlesim/kervan.ts'dedir. YerlesimDO → YerlesimDO çağrısı `KervanCagir` ile enjekte edilir.

import { BEYLIKLER, yerlesimBul } from "../dunya-veri.ts";
import { MALLAR, type MalId } from "../icerik/mallar.ts";
import { istekNoCoz } from "../mantik.ts";
import { cikisKapat, denemeErtele, sonrakiDeneme } from "../mulk/transfer.ts";
import { basarili, hata, type Sonuc, type YerlesimIleti } from "../tipler.ts";
import { hakAcik, hizmetAcik } from "./beceri-etki.ts";
import { defterYaz } from "./defter.ts";
import { olduMu } from "./hanedan.ts";
import { istekBul } from "./istek-defteri.ts";
import { takatHarca, takatTazele } from "./karakter.ts";
import {
  bosKervanDefteri,
  fiyatDongusu,
  fiyatOzeti,
  gecerliHaber,
  HABER_GECERLILIK_AY,
  HABER_HIZMETI,
  HABER_TAKAT,
  haberYerlesimleri,
  ilkKervanEngeli,
  KERVAN_AYLIK,
  KERVAN_KOSUM,
  KERVAN_NAL,
  haberKalitesi,
  kervanCizmesi,
  kervanTakati,
  KERVAN_YOL_AY,
  kervanCikar,
  kervanHedefi,
  kervanKapilari,
  type FiyatOzeti,
  type KervanDefteri,
  type KervanYuku,
  sayacBuda,
  varisIsle,
  varisSonucuGecerli,
  varisTahmini,
  varisUygula,
  type VarisSonucu,
  yoldakiler,
  yukCoz,
  yukSorguCoz,
  yukTavani,
  type Yuk,
  uzakKotaEki,
  uzakMi,
  kervanAylikTavan,
} from "./kervan.ts";
import type { Karakter, Kasaba, OlayTaslagi } from "./tipler.ts";

export interface KervanMotoru {
  readonly kasaba: Kasaba;
  mulkOyuncu(hesapId: string): Promise<Sonuc<{ kar: Karakter }>>;
  kervanYaz(hesapId: string, govde: unknown, isle: (kar: Karakter, ay: number, simdi: number) => Sonuc<Record<string, unknown>>): Promise<Sonuc<unknown>>;
  kervanIslem<T>(yukle: string[], isle: () => { sonuc: T; olaylar: OlayTaslagi[] }): Promise<T>;
}

/** YerlesimDO → YerlesimDO iç çağrısı (yalnız kervanVaris ve fiyatOzeti). */
export type KervanCagir = (ileti: Extract<YerlesimIleti, { islem: "kervanVaris" | "fiyatOzeti" }>) => Promise<Sonuc<unknown>>;

/** Hedefin bu hatalarla reddi kalıcıdır (yük geri döner); diğerleri ve zaman aşımı yeniden denenir. */
export const KALICI_RED: ReadonlySet<string> = new Set(["yerlesim_gecersiz", "gecersiz_istek"]);

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const adet = (y: Yuk): number => Object.values(y).reduce((a: number, n) => a + (n ?? 0), 0);

/** Envanterdeki satılabilir mallar (yüksüz önizlemede hedefteki tahmin bunlar için verilir). */
function satilabilir(kar: Karakter): Yuk {
  const y: Yuk = {};
  for (const [m, n] of Object.entries(kar.ev ?? {}) as [MalId, number][]) if (n > 0 && MALLAR[m] && MALLAR[m].taban > 0) y[m] = n;
  return y;
}

interface OzetYaniti {
  ozet: FiyatOzeti;
  tahmin?: Omit<VarisSonucu, "durum" | "an">;
}

async function ozetIste(cagir: KervanCagir, yerlesim: string, hesap?: string, yuk?: Yuk, va?: number, ke = 0, dongu?: boolean): Promise<OzetYaniti | undefined> {
  try {
    const r = await cagir({ islem: "fiyatOzeti", yerlesim, ...(hesap ? { hesap } : {}), ...(yuk ? { yuk } : {}), ...(va !== undefined ? { va } : {}), ...(ke > 0 ? { ke } : {}), ...(dongu ? { dongu } : {}) });
    return r.ok && nesneMi(r.deger) && nesneMi(r.deger.ozet) ? (r.deger as unknown as OzetYaniti) : undefined;
  } catch {
    return undefined;
  }
}

// ── Kaynak yerleşim: istemci uçları ──

/** GET /v1/kervan?hedef=&mallar=: kapılar, bedel, yük tavanı, aylık sayaç, hedefteki tahmin, varış ayı, yoldakiler, haber. */
export async function kervanOnizle(motor: KervanMotoru, hesapId: string, hedefHam: unknown, mallarHam: unknown, cagir: KervanCagir): Promise<Sonuc<unknown>> {
  const r = await motor.mulkOyuncu(hesapId);
  if (!r.ok) return r;
  const { kar } = r.deger;
  const k = motor.kasaba;
  const ay = k.ay;
  const d = k.kv;
  const temel = { kaynak: k.y, ay, yolda: yoldakiler(d, kar.o), haber: gecerliHaber(d, kar.o, ay) ?? null };
  if (hedefHam === null || hedefHam === undefined || hedefHam === "") return basarili(temel);
  const h = kervanHedefi(k.y, hedefHam);
  if (!h.ok) return h;
  const yukS = yukSorguCoz(mallarHam);
  if (yukS && !yukS.ok) return yukS;
  const yuk = yukS?.deger;
  const kapilar = kervanKapilari(d, kar, ay, h.deger, yuk, kervanAylikTavan(k), k.y);
  const engel = ilkKervanEngeli(kapilar);
  const s = d?.s[kar.o];
  const va = ay + KERVAN_YOL_AY;
  const tahminYuku = yuk ?? satilabilir(kar);
  const ke = uzakKotaEki(kar, k.y, h.deger);
  const uzak = await ozetIste(cagir, h.deger, kar.h, adet(tahminYuku) > 0 ? tahminYuku : undefined, va, ke);
  return basarili({
    ...temel,
    hedef: h.deger,
    hedefAd: yerlesimBul(h.deger)?.ad ?? h.deger,
    varisAyi: va,
    kapilar,
    engel: engel ?? null,
    uygun: engel === undefined && yuk !== undefined,
    bedel: { nal: KERVAN_NAL, kosum: KERVAN_KOSUM, takat: kervanTakati(kar, yuk) },
    // Kanca partisi 2: yolda giyilecek çizme (takat indirimi; yoksa null).
    cizme: kervanCizmesi(kar, yuk),
    yuk: { ...yukTavani(kar, yuk, uzakMi(k.y, h.deger)), adet: yuk ? adet(yuk) : null },
    // Kanca partisi 2 (eklemeli): başka beyliğe mi ve uzak anlaşmanın varış kotası eki.
    uzak: { baskaBeylik: uzakMi(k.y, h.deger), kotaEk: ke },
    aylik: { kullanilan: s && s[0] === ay ? s[1] : 0, tavan: kervanAylikTavan(k), malHedef: s && s[0] === ay ? s[2] : [] },
    takat: kar.tk,
    // Tahmin: yük verildiyse o yük, verilmediyse envanterdeki satılabilir malların tamamı (birim fiyat + varış kotası).
    tahmin: uzak?.tahmin ?? null,
    fiyat: uzak?.ozet ?? null,
  });
}

/** POST /v1/kervan {hedef, mallar, istekNo}: kalkış (istekNo ile tekrar güvenli). */
export function kervanGonder(motor: KervanMotoru, hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
  if (!nesneMi(govde)) return Promise.resolve(hata("gecersiz_istek"));
  const k = motor.kasaba;
  return motor.kervanYaz(hesapId, govde, (kar, ay, simdi) => {
    const h = kervanHedefi(k.y, govde.hedef);
    if (!h.ok) return h;
    const yuk = yukCoz(govde.mallar);
    if (!yuk.ok) return yuk;
    const d = (k.kv ??= bosKervanDefteri());
    sayacBuda(d, ay);
    const islem = `kervan:${k.y}:${kar.o}:${String(govde.istekNo)}`;
    const takat = kervanTakati(kar, yuk.deger);
    const r = kervanCikar(d, kar, h.deger, yuk.deger, ay, islem, simdi, kervanAylikTavan(k), k.y);
    if (!r.ok) return r;
    return basarili({
      kervan: { id: islem, hedef: h.deger, hedefAd: yerlesimBul(h.deger)?.ad ?? h.deger, mallar: yuk.deger, kalkisAyi: ay, varisAyi: ay + KERVAN_YOL_AY },
      bedel: { nal: KERVAN_NAL, kosum: KERVAN_KOSUM, takat },
      aylik: { kullanilan: d.s[kar.o]![1], tavan: kervanAylikTavan(k) },
      asinma: r.deger.asinma,
    });
  });
}

/** POST /v1/kervan/haber {istekNo}: 1 takat → aynı beylikten 3 yerleşimin lonca tablosu ve en pahalı 3 malı (1 ay geçerli). */
export async function kervanHaber(motor: KervanMotoru, hesapId: string, govde: unknown, cagir: KervanCagir): Promise<Sonuc<unknown>> {
  const no = istekNoCoz(govde);
  if (!no.ok) return no;
  const r = await motor.mulkOyuncu(hesapId);
  if (!r.ok) return r;
  const { kar } = r.deger;
  const k = motor.kasaba;
  const ay = k.ay;
  // Uzak okumadan önce ucuz kapılar (tekrar ve geçerli haber kabukta yanıtlanır, uzak okuma yapılmaz).
  let yerlesimler: FiyatOzeti[] = [];
  if (!istekBul(kar, no.deger) && !gecerliHaber(k.kv, kar.o, ay)) {
    if (olduMu(kar)) return hata("olu");
    if (!hizmetAcik(kar, HABER_HIZMETI)) return hata("dugum_kapali");
    takatTazele(kar, ay);
    if (kar.tk < HABER_TAKAT) return hata("takat_yok");
    const beylik = BEYLIKLER.find((b) => b.yerlesimler.some((y) => y.id === k.y));
    const hedefler = haberYerlesimleri(k.y, beylik?.yerlesimler.map((y) => y.id) ?? []);
    // Kanca partisi 2 `fiyatDongusu`: hakkı olanın haberinde her yerleşimin fiyat döngüsü (kıtlık süresi, Erzak) de gelir.
    const dongu = hakAcik(kar, "fiyatDongusu");
    const ozetler = await Promise.all(hedefler.map((y) => ozetIste(cagir, y, undefined, undefined, undefined, 0, dongu)));
    yerlesimler = ozetler.filter((x): x is OzetYaniti => x !== undefined).map((x) => x.ozet);
    if (yerlesimler.length === 0) return hata("kervan_ulasilamadi");
  }
  return motor.kervanYaz(hesapId, govde, (kar2, ay2) => {
    const d = (k.kv ??= bosKervanDefteri());
    const var_ = gecerliHaber(d, kar2.o, ay2);
    if (var_) return basarili({ haber: var_, yeni: false, bedel: { takat: 0 } });
    if (olduMu(kar2)) return hata("olu");
    if (!hizmetAcik(kar2, HABER_HIZMETI)) return hata("dugum_kapali");
    if (yerlesimler.length === 0) return hata("kervan_ulasilamadi");
    if (!takatHarca(kar2, ay2, HABER_TAKAT)) return hata("takat_yok");
    // Kanca partisi 2: haber kalitesi eşiği aşınca haber bir ay daha geçerli (bilgi; döküm `kalite`).
    const kalite = haberKalitesi(kar2);
    const haber = { ay: ay2, gecerli: ay2 + HABER_GECERLILIK_AY + kalite.ekAy, yerlesimler };
    d.h[kar2.o] = haber;
    for (const [o, x] of Object.entries(d.h)) if (x.gecerli < ay2) delete d.h[o];
    return basarili({ haber, yeni: true, bedel: { takat: HABER_TAKAT }, kalite });
  });
}

// ── Hedef yerleşim: iç iletiler ──

/** kervanVaris: işlem kimliğiyle bir kez satış; aynı işlem yazılı sonucu alır. */
export function kervanVarisUc(motor: KervanMotoru, islemNo: unknown, kaynak: unknown, yuk: unknown, an: number): Promise<Sonuc<VarisSonucu>> {
  if (typeof islemNo !== "string" || typeof kaynak !== "string") return Promise.resolve(hata("gecersiz_istek"));
  const k = motor.kasaba;
  return motor.kervanIslem([], () => {
    const d = (k.kv ??= bosKervanDefteri());
    return { sonuc: basarili(varisIsle(k, d, islemNo, kaynak, yuk, an).sonuc), olaylar: [] };
  });
}

/** fiyatOzeti: salt okuma (lonca, en pahalı mallar; yük verildiyse varış tahmini). */
export function fiyatOzetiUc(motor: KervanMotoru, hesap: unknown, yukHam: unknown, va: unknown, ke?: unknown, dongu?: unknown): Sonuc<OzetYaniti> {
  const k = motor.kasaba;
  const ozet = fiyatOzeti(k);
  if (dongu === true) ozet.dongu = fiyatDongusu(k);
  if (typeof hesap !== "string" || yukHam === undefined || !Number.isInteger(va)) return basarili({ ozet });
  const yuk = yukCoz(yukHam);
  if (!yuk.ok) return basarili({ ozet });
  return basarili({ ozet, tahmin: varisTahmini(k, k.kv, hesap, yuk.deger, va as number, typeof ke === "number" ? ke : 0) });
}

// ── Kaynak yerleşim: uzlaştırma ──

let uzlastiriyor = new WeakSet<Kasaba>();

/** Testler için: süreç içi kilit tablosunu sıfırlar. */
export function kervanUzlastirmaSifirla(): void {
  uzlastiriyor = new WeakSet<Kasaba>();
}

/** Hasılatın ve dönen malın yazılacağı karakter: gönderen; ölmüşse aynı hesabın bu yerleşimdeki sakini (vâris). */
function alici(k: Kasaba, y: KervanYuku): Karakter | undefined {
  const kar = k.kar.get(y.o);
  if (kar && !olduMu(kar)) return kar;
  const s = k.sakin.find((x) => x.h === y.hs && x.o !== y.o);
  const varis = s ? k.kar.get(s.o) : undefined;
  return varis && !olduMu(varis) ? varis : kar;
}

/** Kaydı kapatır ve tüccara yazar (bir kez: kayıt zaten kapanmışsa hiçbir şey yapılmaz). */
async function kapat(motor: KervanMotoru, d: KervanDefteri, i: string, s: VarisSonucu, an: number): Promise<void> {
  const k = motor.kasaba;
  const kayit = d.c.k.find((x) => x.i === i);
  if (!kayit) return;
  const y = kayit.y as unknown as KervanYuku;
  const varis = k.sakin.find((x) => x.h === y.hs && x.o !== y.o);
  await motor.kervanIslem([y.o, ...(varis ? [varis.o] : [])], () => {
    const kp = cikisKapat(d.c, i, s.durum === "kabul" ? "kabul" : "red", an);
    const kar = kp ? alici(k, y) : undefined;
    if (!kp || !kar) return { sonuc: undefined, olaylar: [] };
    const { akce, geri } = varisUygula(kar, y, s);
    defterYaz(kar, k.ay, "kervan", akce);
    const hedefAd = yerlesimBul(kayit.h)?.ad ?? kayit.h;
    const olay: OlayTaslagi = s.durum === "kabul"
      ? { t: "kervan", w: kar.o, h: kar.o, g: kar.o, n: 4, k: "olay.kervan.vardi", p: { hedef: kayit.h, hedefAd, hasilat: akce, satilan: adet(s.satilan), kalan: adet(geri) } }
      : { t: "kervan", w: kar.o, h: kar.o, g: kar.o, n: 4, k: "olay.kervan.dondu", p: { hedef: kayit.h, hedefAd, kalan: adet(geri) } };
    return { sonuc: undefined, olaylar: [olay] };
  });
}

/**
 * Varış ayı gelen kervanları hedefe teslim eder. `hepsi`: yeniden deneme beklemesine bakmadan (istek sonrası).
 * Bekleyen yeniden deneme varsa en yakın anı döner (YerlesimDO alarmı); varış ayını ay dönümü alarmı zaten yakalar.
 */
export async function kervanUzlastir(motor: KervanMotoru, an: number, cagir: KervanCagir, hepsi = false, kota: () => number = () => Infinity): Promise<number | null> {
  const k = motor.kasaba;
  const d = k.kv;
  if (!d || d.c.k.length === 0) return null;
  const varmis = () => d.c.k.filter((x) => x.t === "kervan" && (x.y as unknown as KervanYuku).va <= k.ay);
  if (uzlastiriyor.has(k)) return sonrakiDeneme({ k: varmis(), z: [] });
  uzlastiriyor.add(k);
  try {
    for (const x of varmis().filter((x) => hepsi || x.s <= an).slice(0, 8)) {
      // Alt istek bütçesi bittiyse kalan kervanlar bekler (alarm sürdürür; kayıt kaybolmaz).
      if (kota() <= 0) break;
      const y = x.y as unknown as KervanYuku;
      let r: Sonuc<unknown> | undefined;
      try {
        r = await cagir({ islem: "kervanVaris", yerlesim: x.h, islemNo: x.i, kaynak: k.y, yuk: y });
      } catch {
        r = undefined;
      }
      if (r?.ok && varisSonucuGecerli(r.deger, y)) await kapat(motor, d, x.i, r.deger, an);
      else if (r && !r.ok && KALICI_RED.has(r.hata)) {
        await kapat(motor, d, x.i, { durum: "red", neden: r.hata, an, hasilat: 0, satilan: {}, kalan: { ...y.ev }, satirlar: [] }, an);
      } else await motor.kervanIslem([], () => ({ sonuc: denemeErtele(d.c, x.i, an), olaylar: [] }));
    }
    return sonrakiDeneme({ k: varmis(), z: [] });
  } finally {
    uzlastiriyor.delete(k);
  }
}
