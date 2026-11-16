// Yerleşim tarafı mülk defteri (YerlesimDO; depo anahtarı "mk"): tapu (yuva → sahip), edinim şartı, cüzdan → kasa
// çıkış kutusu, kasa → cüzdan giriş defteri, işletme yansıları (oda kataloğu, fiyat, kapasite, personel), oyuncu
// hanının kiracıları, karşılıklı işlem izleme ve devir. Saf fonksiyonlar; karakter ve kasabayı yerinde değiştirir.
// Cüzdan (karakterin akçesi) ve tapu aynı DO'da olduğu için edinim ve devir ödemesi tek yazımda atomiktir.

import { karakterYasi } from "../yerlesim/karakter.ts";
import { hizmetAcik } from "../yerlesim/beceri-etki.ts";
import { barinmaGorunumu, kiraTut, oyuncuHanOdaAcik } from "../yerlesim/barinma.ts";
import { odaCoz } from "../yerlesim/oda.ts";
import { ayniKume } from "../yerlesim/teveccuh.ts";
import { olduMu } from "../yerlesim/hanedan.ts";
import { npcAdi } from "../yerlesim/ortak.ts";
import { IKRAM_MENUSU, type IkramId } from "../han/ikram.ts";
import type { Karakter, Kasaba, OlayTaslagi, Sakin } from "../yerlesim/tipler.ts";
import type { Kademe, MeslekId } from "../icerik/meslekler.ts";
import { basarili, hata, type HataKodu, type Sonuc } from "../tipler.ts";
import {
  EDINIM_FIYATI,
  EDINIM_LONCA_KADEME,
  EDINIM_NAM_ESIGI,
  EDINIM_YASI,
  HAN_KISI_YERLESIM_EN_COK,
  KISI_MULK_EN_COK,
  MULK_TURLERI,
  MULK_YUVA,
  ROL_MESLEGI,
  NPC_HAN_NO,
  TRANSFER_EN_COK,
  hanYuvaSayisi,
  isletmeCoz,
  isletmeKimligi,
  type MulkTuru,
} from "./kurallar.ts";
import type { AyarYuku, Baglam, GirisNedeni, Kisi } from "./isletme.ts";
import { tezgahBosalt, type Tezgah } from "./depo.ts";
import { KARSILIKLI_PENCERE_AY } from "./tezgah-kurallar.ts";
import { akceIade, malIade, type IadeKaydi } from "./iade.ts";
import {
  CIKIS_EN_COK,
  bekleyenToplam,
  bosDefter,
  bosKutu,
  cikisAc,
  defterBuda,
  girisUygula,
  transferDurumu,
  type CevapDurumu,
  type CikisKaydi,
  type CikisKutusu,
  type GirisDefteri,
} from "./transfer.ts";

export interface TapuKaydi {
  /** Sahip yerel kimlik ve hesap; tapu sürümü; edinim ayı ve bedeli. */
  s: string;
  h: string;
  ts: number;
  a: number;
  f: number;
  /** İşletmenin son yansısı (IsletmeDO'dan; `as` sürümüyle). */
  y?: AyarYuku & { as: number };
  /** Devir teklifi: alıcı yerel kimlik, fiyat, ay. */
  dv?: { o: string; f: number; ay: number };
  /**
   * Beyliğe gerçekten ödenen edinim bedeli (devralma iadesi bundan; devirde ve mirasta aynen taşınır, asla oyuncular
   * arası devir fiyatı olmaz). Eski kayıtta yok: `iadeBedeli` türün bugünkü bedelini ve `f`yi aşmayanı alır.
   */
  eb?: number;
}

/** Devralmada eski sahibe iade edilecek tutar: beyliğe ödenen edinim bedeli. */
export function iadeBedeli(k: Kasaba, isletme: string): number {
  const t = k.mk?.t[isletme];
  const c = isletmeCoz(isletme);
  if (!t || !c) return 0;
  return t.eb ?? Math.min(t.f, EDINIM_FIYATI[k.tur][c.tur]);
}

/** Sahip değişiminde (devir, miras) devralma sayacı sıfırlanır: yeni sahip etkinlikle başlar. */
export function devralmaSayaciSifirla(md: MulkDefteri, isletme: string): void {
  const tz = md.tz?.[isletme];
  if (tz) tz.kk = 0;
}

export interface MulkDefteri {
  v: 1;
  /** Tapu sürüm sayacı (her edinim ve devirde artar). */
  ts: number;
  t: Record<string, TapuKaydi>;
  cik: CikisKutusu;
  gir: GirisDefteri;
  /** Bu ayın müşteri ödemeleri (karşılıklı işlem izleme): [ay, [ödeyen, sahip][]]. */
  mh: [ay: number, [string, string][]];
  /** Karşılıklı işlem penceresi: [ay, ödeyen, sahip] (son KARSILIKLI_PENCERE_AY ay). */
  mp?: [ay: number, odeyen: string, sahip: string][];
  /** Oyuncu hanı kiracıları: işletme → [yerel kimlik, bitiş ms][]. */
  od: Record<string, [string, number][]>;
  /** Denetim: edinim bedeli olarak dünyadan çıkan akçe. */
  batak: number;
  /** Bölge DO'suna aktarılmayı bekleyen oyuncu işletmesi vergileri (kalıcı outbox). */
  vergiGiden?: { anahtar: string; tutar: number; yerlesim: string }[];
  /** İşletme bazında kuruş altı vergi birikimi (yüzde payı; 0–99). */
  vergiKesir?: Record<string, number>;
  /** Tezgâh (Dilim 1): işletme → depo + raf (dükkân ve atölye). Karakter envanteriyle aynı DO'da (tek yazım). */
  tz?: Record<string, Tezgah>;
  /** Ay dönümünde toplanan, henüz çıkış kutusuna yazılmamış işletme ay girdileri: işletme → [ay, net akçe, satış yapan satır]. */
  tzb?: Record<string, [ay: number, net: number, satir: number][]>;
  /** Son bilinen bölge vergi oranı (NPC raf satışında kullanılır; oyuncu satın alması ve raf işlemi tazeler). */
  vo?: number;
  /** Denetim: NPC'den işletme kasalarına (raf satışı, yolcu payı) ve vergiye giren akçe. */
  kaynak?: number;
  /** Son ay dönümünün hane bütçesi özeti ve han yolcu dökümü (görünüm). */
  tzo?: unknown;
  hy?: unknown;
  /** Sahibi o an yüklenemeyen iade malları (iflas/devralma): yerel kimlik → envanter; sahibin ilk tezgâh adımında teslim. */
  ia?: Record<string, IadeKaydi>;
  /** Mülk olayları kuyruğu (devralma bildirimleri): motor bir sonraki yazımda olay akışına boşaltır. */
  ob?: OlayTaslagi[];
}

/** [PARAMETRE] Karşılıklı işlem izleme penceresi için tutulan en çok ödeme çifti. */
export const MUSTERI_IZ_EN_COK = 200;

export function mulkDefteri(k: Kasaba): MulkDefteri {
  if (!k.mk) k.mk = { v: 1, ts: 0, t: {}, cik: bosKutu(), gir: bosDefter(), mh: [k.ay, []], od: {}, batak: 0 };
  return k.mk;
}

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function sakin(k: Kasaba, o: string): Sakin | undefined {
  return k.sakin.find((x) => x.o === o);
}

/** Karakterin meslek kademeleri (kalite bağı için yalnız rol meslekleri). */
export function meslekKademeleri(kar: Karakter): Partial<Record<MeslekId, Kademe>> {
  const mk: Partial<Record<MeslekId, Kademe>> = {};
  const s = kar.ms?.s ?? {};
  for (const m of Object.values(ROL_MESLEGI)) if (m && s[m]) mk[m] = s[m]!.kd;
  return mk;
}

export function sahipMulkleri(md: MulkDefteri, o: string): string[] {
  return Object.entries(md.t)
    .filter(([, t]) => t.s === o)
    .map(([id]) => id);
}

// ── Edinim (D-17 önerisi) ──

export function edinimSarti(k: Kasaba, kar: Karakter, tur: MulkTuru) {
  const fiyat = EDINIM_FIYATI[k.tur][tur];
  const nam = kar.nm.reduce((a, b) => a + b, 0);
  const lonca = Object.values(kar.ms?.s ?? {}).reduce((m, i) => Math.max(m, i?.kd ?? 0), 0);
  const yas = karakterYasi(kar, k.ay);
  const eksik: string[] = [];
  if (kar.pa < fiyat) eksik.push("akce");
  if (nam < EDINIM_NAM_ESIGI && lonca < EDINIM_LONCA_KADEME) eksik.push("namYaDaLonca");
  if (yas < EDINIM_YASI) eksik.push("yas");
  return { fiyat, akce: kar.pa, nam, namEsigi: EDINIM_NAM_ESIGI, loncaKademe: lonca, loncaEsigi: EDINIM_LONCA_KADEME, yas, yasEsigi: EDINIM_YASI, uygun: eksik.length === 0, eksik };
}

export function bosYuva(k: Kasaba, md: MulkDefteri, tur: MulkTuru): number | undefined {
  for (let no = 1; no <= MULK_YUVA[k.tur][tur]; no++) if (!md.t[isletmeKimligi(k.y, tur, no)]) return no;
  return undefined;
}

/** Kişinin bu yerleşimde sahip olduğu han sayısı (4.9 tekel önlemi). */
export function sahipHanSayisi(k: Kasaba, md: MulkDefteri, o: string): number {
  return sahipMulkleri(md, o).filter((id) => {
    const c = isletmeCoz(id);
    return c?.tur === "han" && c.yerlesim === k.y;
  }).length;
}

/**
 * POST /v1/mulk/edin {tur, no?}: şart + boş yuva + kişi sınırı; bedel beyliğe (dünyadan çıkar); işletme kurulumu çıkış
 * kutusuna. `no` verilirse o yuva (boş olmalı), yoksa ilk boş yuva. Han: köyde yuva yok (`mulk_dolu`), kişi başı aynı
 * yerleşimde en çok HAN_KISI_YERLESIM_EN_COK han (`han_siniri`).
 */
export function edin(k: Kasaba, kar: Karakter, govde: unknown, an: number, istekNo: string): Sonuc<Record<string, unknown>> {
  if (!nesneMi(govde) || typeof govde.tur !== "string" || !(MULK_TURLERI as readonly string[]).includes(govde.tur)) return hata("mulk_tur_gecersiz");
  const tur = govde.tur as MulkTuru;
  const md = mulkDefteri(k);
  if (sahipMulkleri(md, kar.o).length >= KISI_MULK_EN_COK) return hata("mulk_siniri");
  if (tur === "han" && sahipHanSayisi(k, md, kar.o) >= HAN_KISI_YERLESIM_EN_COK) return hata("han_siniri");
  let no: number | undefined;
  if (govde.no !== undefined) {
    const n = govde.no;
    if (!Number.isInteger(n) || (n as number) < 1 || (n as number) > MULK_YUVA[k.tur][tur]) return hata("mulk_dolu");
    no = md.t[isletmeKimligi(k.y, tur, n as number)] ? undefined : (n as number);
  } else no = bosYuva(k, md, tur);
  if (no === undefined) return hata("mulk_dolu");
  const sart = edinimSarti(k, kar, tur);
  if (sart.eksik.includes("yas")) return hata("yas_kapisi");
  if (sart.eksik.includes("namYaDaLonca")) return hata("edinim_sarti");
  if (sart.eksik.includes("akce")) return hata("para_yok");
  if (md.cik.k.length >= CIKIS_EN_COK) return hata("transfer_bekliyor");
  const id = isletmeKimligi(k.y, tur, no);
  const ts = ++md.ts;
  const islem = `y:${k.y}:${kar.o}:edin:${istekNo}`;
  cikisAc(md.cik, { i: islem, t: "kur", h: id, a: 0, y: { isletme: id, tur, no, ts, sahip: { h: kar.h, o: kar.o, ad: kar.ad } } }, an);
  kar.pa -= sart.fiyat;
  md.batak += sart.fiyat;
  md.t[id] = { s: kar.o, h: kar.h, ts, a: k.ay, f: sart.fiyat, eb: sart.fiyat };
  return basarili({ edinim: { isletme: id, tur, no, fiyat: sart.fiyat, batak: sart.fiyat, sart, islem } });
}

// ── Cüzdan → kasa ──

/**
 * Karşılıklı işlem: son KARSILIKLI_PENCERE_AY ay içinde sahip, ödeyenin işletmesine ödeme yaptı mı (iki yönlü çift:
 * A→B ve B→A dönüşümlü aylarda da yakalanır). `mp`: [ay, ödeyen, sahip] penceresi.
 */
function karsilikliMi(md: MulkDefteri, ay: number, oden: string, sahip: string): boolean {
  const odeyenin = new Set(sahipMulkleri(md, oden));
  if (odeyenin.size === 0) return false;
  if (md.mh[0] === ay && md.mh[1].some(([a, b]) => a === sahip && b === oden)) return true;
  return (md.mp ?? []).some(([a, x, y]) => ay - a < KARSILIKLI_PENCERE_AY && x === sahip && y === oden);
}

/**
 * Cüzdandan kasaya çıkış (bakiye çağıranca düşülmüş olmalı ya da `dus`). Aynı hesap kümesi ve karşılıklı işlem
 * bayrakları burada (sakin dizininden) hesaplanır: IsletmeDO'nun çoklu hesap izleme kancası bunları yazar.
 */
export function kasayaCikis(k: Kasaba, kar: Karakter, isletme: string, tutar: number, neden: GirisNedeni, an: number, islem: string, dus: boolean, ek: Record<string, unknown> = {}): Sonuc<{ islem: string; kume: boolean; karsilikli: boolean }> {
  const md = mulkDefteri(k);
  const tapu = md.t[isletme];
  if (!tapu) return hata("isletme_yok");
  if (dus && kar.pa < tutar) return hata("para_yok");
  const ben = sakin(k, kar.o);
  const sahip = sakin(k, tapu.s);
  const kume = neden !== "yatir" && !!ben && !!sahip && ayniKume(ben, sahip);
  const karsilikli = neden !== "yatir" && karsilikliMi(md, k.ay, kar.o, tapu.s);
  if (!cikisAc(md.cik, { i: islem, t: "kasaya", h: isletme, a: tutar, y: { ...ek, isletme, o: kar.o, tutar, neden, kume, karsilikli } }, an)) return hata("transfer_bekliyor");
  if (dus) kar.pa -= tutar;
  if (neden !== "yatir") {
    if (md.mh[0] !== k.ay) md.mh = [k.ay, []];
    md.mh[1].push([kar.o, tapu.s]);
    if (md.mh[1].length > MUSTERI_IZ_EN_COK) md.mh[1].splice(0, md.mh[1].length - MUSTERI_IZ_EN_COK);
    const mp = (md.mp ??= []).filter(([a]) => k.ay - a < KARSILIKLI_PENCERE_AY);
    if (!mp.some(([a, x, y]) => a === k.ay && x === kar.o && y === tapu.s)) mp.push([k.ay, kar.o, tapu.s]);
    if (mp.length > MUSTERI_IZ_EN_COK) mp.splice(0, mp.length - MUSTERI_IZ_EN_COK);
    md.mp = mp;
  }
  return basarili({ islem, kume, karsilikli });
}

/** POST /v1/isletme/:id/yatir {tutar}: yalnız sahip; cüzdan → kasa. */
export function yatir(k: Kasaba, kar: Karakter, isletme: string, govde: unknown, an: number, istekNo: string): Sonuc<Record<string, unknown>> {
  const md = mulkDefteri(k);
  const tapu = md.t[isletme];
  if (!tapu) return hata("isletme_yok");
  if (tapu.s !== kar.o) return hata("yetki_yok");
  const tutar = nesneMi(govde) ? govde.tutar : undefined;
  if (!Number.isInteger(tutar) || (tutar as number) <= 0 || (tutar as number) > TRANSFER_EN_COK) return hata("tutar_gecersiz");
  const r = kasayaCikis(k, kar, isletme, tutar as number, "yatir", an, `y:${k.y}:${kar.o}:yatir:${istekNo}`, true);
  if (!r.ok) return r;
  return basarili({ yatirma: { isletme, tutar, islem: r.deger.islem } });
}

// ── Oyuncu hanı (Faz 14 kira ve Faz 10 ikram köprüsü) ──

/** [4.9] Han numarası: verilmezse 1 (eski istemci); 1..HAN_YUVA_EN_COK tamsayı ya da rakam dizisi. */
export const HAN_NO_EN_COK = 9;
export function hanNoCoz(ham: unknown): number | undefined {
  if (ham === undefined || ham === null || ham === "") return NPC_HAN_NO;
  const n = typeof ham === "number" ? ham : typeof ham === "string" && /^[1-9]$/.test(ham) ? Number(ham) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= HAN_NO_EN_COK ? n : undefined;
}

/**
 * Bu yerleşimde `han` numaralı han var mı: 1. han her zaman (NPC ya da oyuncu); diğerleri yalnız sahipliyse
 * (sahipsiz arsa han değildir). Eski kayıtta yuva tablosu dışında kalan sahipli han da okunur.
 */
export function hanVar(k: Kasaba, han: number): boolean {
  if (han === NPC_HAN_NO) return true;
  return !!k.mk?.t[isletmeKimligi(k.y, "han", han)];
}

/** Yerleşimin açık hanları (1. han ve sahipli diğer yuvalar), numara sırasıyla. */
export function hanNolari(k: Kasaba): number[] {
  const l: number[] = [];
  for (let n = 1; n <= Math.max(hanYuvaSayisi(k.tur), HAN_NO_EN_COK); n++) if (hanVar(k, n)) l.push(n);
  return l;
}

export interface OyuncuHani {
  isletme: string;
  sahip: string;
  fc: number;
  seviye: number;
  kapasite: number;
}

/**
 * Yerleşimin `han`. hanı oyuncu işletmesi ve açık mı (yansıya göre; yansı gelmeden NPC han sayılmaz, han kapalıdır).
 * Yoksa: 1. han NPC hanıdır; diğerleri boş arsadır (hanDurumu `yok`).
 */
export function oyuncuHani(k: Kasaba, han = NPC_HAN_NO): OyuncuHani | undefined {
  const id = isletmeKimligi(k.y, "han", han);
  const t = k.mk?.t[id];
  if (!t) return undefined;
  const y = t.y;
  return { isletme: id, sahip: t.s, fc: y?.fc ?? 100, seviye: y?.seviye ?? 0, kapasite: y && y.durum === "acik" && y.kapi ? y.kapasite : 0 };
}

export function vergiAyir(md: MulkDefteri, isletme: string, tutar: number, oran: number): { vergi: number; net: number; kalan: number } {
  const eski = md.vergiKesir?.[isletme] ?? 0;
  const toplam = eski + tutar * oran;
  const vergi = Math.floor(toplam / 100);
  return { vergi, net: tutar - vergi, kalan: toplam % 100 };
}

function bosOda(md: MulkDefteri, isletme: string, kapasite: number, an: number): number {
  const l = (md.od[isletme] ?? []).filter(([, s]) => s > an);
  md.od[isletme] = l;
  return kapasite - l.length;
}

/** Kira: oyuncu hanında gelir vergisi net kasaya gider; NPC hancı ödemesi dünyadan çıkar. */
export function mulkluKira(k: Kasaba, kar: Karakter, govde: unknown, an: number, vergiOrani = 0): Sonuc<Record<string, unknown>> {
  const han = hanNoCoz(nesneMi(govde) ? govde.han : undefined);
  if (han === undefined) return hata("han_gecersiz");
  if (!hanVar(k, han)) return hata("han_yok");
  const oh = oyuncuHani(k, han);
  if (!oh) {
    // Yanıttaki barınma görünümü GET /v1/barinma?han=N ile aynı biçim (kiralanan hanın numarası ve kataloğu).
    const r = kiraTut(k, kar, govde, an);
    return r.ok ? basarili({ ...r.deger, barinma: { ...barinmaGorunumu(k, kar, an), hanNo: han } }) : r;
  }
  const md = mulkDefteri(k);
  if (oh.sahip === kar.o) return hata("kendine");
  const sahip = k.kar.get(oh.sahip);
  const oda = nesneMi(govde) ? odaCoz(govde.oda) : undefined;
  if (!oda) return hata("oda_gecersiz");
  if (!sahip || !oyuncuHanOdaAcik(sahip, oda)) return hata("dugum_kapali");
  if (md.cik.k.length >= CIKIS_EN_COK) return hata("transfer_bekliyor");
  const istekNo = nesneMi(govde) ? String(govde.istekNo) : "";
  const r = kiraTut(k, kar, govde, an, { isletme: oh.isletme, fc: oh.fc, seviye: oh.seviye, bos: bosOda(md, oh.isletme, oh.kapasite, an) });
  if (!r.ok) return r;
  const kira = r.deger.kira as { kasaya: number; bitis: number };
  const oran = Number.isInteger(vergiOrani) && vergiOrani >= 0 && vergiOrani <= 4 ? vergiOrani : 0;
  const vergiPay = vergiAyir(md, oh.isletme, kira.kasaya, oran);
  const { vergi, net } = vergiPay;
  const c = kasayaCikis(k, kar, oh.isletme, net, "kira", an, `y:${k.y}:${kar.o}:kira:${istekNo}`, false);
  if (!c.ok) return c;
  (md.vergiKesir ??= {})[oh.isletme] = vergiPay.kalan;
  if (vergi > 0) (md.vergiGiden ??= []).push({ anahtar: `y:${k.y}:${kar.o}:kira:${istekNo}:vergi`, tutar: vergi, yerlesim: k.y });
  const l = md.od[oh.isletme]!.filter(([o]) => o !== kar.o);
  l.push([kar.o, kira.bitis]);
  md.od[oh.isletme] = l;
  const gorunum = { ...barinmaGorunumu(k, kar, an, { ...oh, sahip }), hanNo: han };
  return basarili({ ...r.deger, barinma: gorunum, kira: { ...kira, kasaya: net }, vergi: { oran, tutar: vergi }, transfer: { islem: c.deger.islem } });
}

/** İkram ödemesi: oyuncu hanında gelir vergisi sonrası net kasaya, NPC handa dünyadan çıkar. */
export function mulkluIkram(k: Kasaba, kar: Karakter, ikram: IkramId, an: number, istekNo: string, vergiOrani = 0, han = NPC_HAN_NO): Sonuc<{ fiyat: number; batak: number; kasaya: number; vergi: number; islem?: string }> {
  // Hancı "ikram" hizmeti yalnız NPC menüsünde %10 meslek indirimi sağlar; oyuncu hanının fiyatını sahibi belirler.
  return mulkluHanOdemesi(k, kar, IKRAM_MENUSU[ikram].fiyat, an, `y:${k.y}:${kar.o}:ikram:${istekNo}`, vergiOrani, hizmetAcik(kar, "ikram"), han);
}

/**
 * Han ödemesi (ikram, H7 ziyafet): NPC hanında akçe dünyadan çıkar (batak); oyuncu hanında fiyat çarpanlı, vergi
 * ayrılır ve net tutar işletme kasasına çıkış kutusuyla gider. `islem`: tekrar güvenli çıkış kimliği.
 */
export function mulkluHanOdemesi(k: Kasaba, kar: Karakter, taban: number, an: number, islem: string, vergiOrani = 0, npcIndirim = false, han = NPC_HAN_NO): Sonuc<{ fiyat: number; batak: number; kasaya: number; vergi: number; islem?: string }> {
  // 4.9: ödeme masanın bulunduğu hanın kasasına gider; sahipsiz arsada masa yoktur.
  if (!hanVar(k, han)) return hata("han_yok");
  const oh = oyuncuHani(k, han);
  if (!oh) {
    const fiyat = npcIndirim ? Math.max(1, Math.round(taban * 0.9)) : taban;
    if (kar.pa < fiyat) return hata("para_yok");
    kar.pa -= fiyat;
    return basarili({ fiyat, batak: fiyat, kasaya: 0, vergi: 0 });
  }
  if (oh.kapasite === 0) return hata("han_kapali");
  const fiyat = Math.max(1, Math.ceil((taban * oh.fc) / 100 - 1e-9));
  const oran = Number.isInteger(vergiOrani) && vergiOrani >= 0 && vergiOrani <= 4 ? vergiOrani : 0;
  const md = mulkDefteri(k);
  const vergiPay = vergiAyir(md, oh.isletme, fiyat, oran);
  const { vergi, net } = vergiPay;
  const c = kasayaCikis(k, kar, oh.isletme, net, "ikram", an, islem, true);
  if (!c.ok) return c;
  (md.vergiKesir ??= {})[oh.isletme] = vergiPay.kalan;
  if (vergi > 0) (md.vergiGiden ??= []).push({ anahtar: `${islem}:vergi`, tutar: vergi, yerlesim: k.y });
  return basarili({ fiyat, batak: 0, kasaya: net, vergi, islem: c.deger.islem });
}

// ── Gelen kayıtlar (IsletmeDO çıkış kutusundan) ──

export function karGerekenler(kayitlar: CikisKaydi[], md?: MulkDefteri): string[] {
  return kayitlar.flatMap((x) => {
    if (x.t === "cuzdana" && typeof x.y.o === "string") return [x.y.o];
    // İflas: depo ve raf eski sahibin envanterine döner.
    const t = x.t === "iflas" && typeof x.y.isletme === "string" ? md?.t[x.y.isletme] : undefined;
    return t ? [t.s] : [];
  });
}

/** Depo + rafı sahibin envanterine boşaltır; sahip yüklenemiyorsa iade bekleyenine yazar (kayıp yok). */
export function tezgahIade(k: Kasaba, isletme: string, o: string): void {
  const md = mulkDefteri(k);
  const tz = md.tz?.[isletme];
  if (!tz) return;
  malIade(k, o, (h) => tezgahBosalt(tz, h));
  delete md.tz![isletme];
}

/** Tek gelen kaydı işlem kimliğiyle bir kez uygular: cüzdana akçe, işletme yansısı, iflas (tapu boşalır). */
export function girisIsle(k: Kasaba, x: CikisKaydi, an: number): { durum: CevapDurumu; neden?: string } {
  const md = mulkDefteri(k);
  defterBuda(md.gir, an);
  return girisUygula(md.gir, x.i, an, () => {
    const isletme = typeof x.y.isletme === "string" ? x.y.isletme : "";
    if (x.t === "cuzdana") {
      const kar = typeof x.y.o === "string" ? k.kar.get(x.y.o) : undefined;
      const tutar = x.y.tutar;
      if (!Number.isInteger(tutar) || (tutar as number) <= 0 || tutar !== x.a) return { durum: "red", neden: "tutar_gecersiz" };
      // Devralma ve iflas iadesi yanmaz: sahibe yazılamıyorsa iade bekleyenine (vâris / hazine yolu, iade.ts).
      if ((x.y.neden === "devral" || x.y.neden === "iflas") && typeof x.y.o === "string" && (!kar || olduMu(kar) || kar.gc)) {
        akceIade(k, x.y.o, tutar as number);
        if (x.y.neden === "devral") (md.ob ??= []).push(devralmaKasaOlayi(x.y.o, isletme, tutar as number));
        return { durum: "kabul" };
      }
      // Göçle kapanan (ya da mühürlü) karakterin cüzdanına yazılmaz: akçe arşivdeki kayda düşmez.
      if (!kar || olduMu(kar) || kar.gc) return { durum: "red", neden: "kisi_yok" };
      kar.pa += tutar as number;
      if (x.y.neden === "devral") (md.ob ??= []).push(devralmaKasaOlayi(kar.o, isletme, tutar as number));
      return { durum: "kabul" };
    }
    const tapu = md.t[isletme];
    if (x.t === "ayar") {
      const y = x.y as AyarYuku & { as: number };
      if (tapu && y.ts === tapu.ts && (tapu.y?.as ?? 0) < y.as) tapu.y = y;
      return { durum: "kabul" };
    }
    if (x.t === "iflas") {
      if (tapu && tapu.ts === x.y.ts) {
        tezgahIade(k, isletme, tapu.s);
        delete md.t[isletme];
        delete md.od[isletme];
      }
      return { durum: "kabul" };
    }
    return { durum: "red", neden: "gecersiz_istek" };
  });
}

/** Kendi çıkış kaydımızın reddi: telafi (cüzdana iade; kurulum reddinde tapu ve bedel geri). */
export function telafi(k: Kasaba, x: CikisKaydi): void {
  const md = mulkDefteri(k);
  if (x.t === "kasaya") {
    // Raf satışında mal alıcıya verildi: akçe malın sahibine (satıcıya) döner; yoksa ödeyene.
    const satici = x.y.neden === "satis" && typeof x.y.satici === "string" ? k.kar.get(x.y.satici) : undefined;
    const kar = satici ?? (typeof x.y.o === "string" ? k.kar.get(x.y.o) : undefined);
    if (kar) kar.pa += x.a;
  } else if (x.t === "tezgah") {
    // NPC parası işletmeye hiç girmedi: denetim kaydından düşer (akçe basılmadı).
    md.kaynak = (md.kaynak ?? 0) - x.a;
  } else if (x.t === "devral") {
    // İşletme yeni sahibi kuramadı (beklenmez): kayıt yalnız tapu sürümünü taşır, para taşımaz.
  } else if (x.t === "kur") {
    const isletme = String(x.y.isletme);
    const tapu = md.t[isletme];
    const sahip = (x.y.sahip as Kisi | undefined)?.o;
    const kar = sahip ? k.kar.get(sahip) : undefined;
    if (tapu && tapu.ts === x.y.ts) {
      if (kar) kar.pa += tapu.f;
      md.batak -= tapu.f;
      delete md.t[isletme];
    }
  }
}

export function telafiGerekenler(x: CikisKaydi): string[] {
  if (x.t === "kasaya" && typeof x.y.o === "string") return typeof x.y.satici === "string" ? [x.y.o, x.y.satici] : [x.y.o];
  if (x.t === "kur") return [String((x.y.sahip as Kisi | undefined)?.o ?? "")].filter(Boolean);
  return [];
}

// ── Devir (satış) ──

/** POST .../devir {islem: teklif, alici, fiyat} | {islem: geri}: sahip; alıcı aynı yerleşimin oyuncusu. */
export function devirTeklif(k: Kasaba, kar: Karakter, isletme: string, govde: unknown): Sonuc<Record<string, unknown>> {
  const md = mulkDefteri(k);
  const tapu = md.t[isletme];
  if (!tapu) return hata("isletme_yok");
  if (tapu.s !== kar.o) return hata("yetki_yok");
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  if (govde.islem === "geri") {
    delete tapu.dv;
    return basarili({ devir: null });
  }
  const alici = typeof govde.alici === "string" ? sakin(k, govde.alici) : undefined;
  if (!alici) return hata("kisi_yok");
  if (alici.o === kar.o) return hata("kendine");
  const f = govde.fiyat;
  if (!Number.isInteger(f) || (f as number) < 0 || (f as number) > TRANSFER_EN_COK) return hata("tutar_gecersiz");
  tapu.dv = { o: alici.o, f: f as number, ay: k.ay };
  return basarili({ devir: { isletme, alici: alici.o, fiyat: f } });
}

/**
 * Devir kabulü (alıcı; önizleme sürümü IsletmeDO'dan taze alınıp karşılaştırılmış olmalı): fiyat alıcıdan satıcıya
 * aynı yazımda, tapu alıcıya, işletmeye sahip değişimi çıkış kutusundan. Borç ve sözleşmeler işletmeyle gider.
 */
export function devirKabul(k: Kasaba, alici: Karakter, isletme: string, an: number, istekNo: string): Sonuc<Record<string, unknown>> {
  const md = mulkDefteri(k);
  const tapu = md.t[isletme];
  if (!tapu?.dv || tapu.dv.o !== alici.o) return hata("teklif_yok");
  if (sahipMulkleri(md, alici.o).length >= KISI_MULK_EN_COK) return hata("mulk_siniri");
  if (isletmeCoz(isletme)?.tur === "han" && sahipHanSayisi(k, md, alici.o) >= HAN_KISI_YERLESIM_EN_COK) return hata("han_siniri");
  const satici = k.kar.get(tapu.s);
  if (!satici) return hata("kisi_yok");
  const f = tapu.dv.f;
  if (alici.pa < f) return hata("para_yok");
  if (md.cik.k.length >= CIKIS_EN_COK) return hata("transfer_bekliyor");
  const ts = ++md.ts;
  cikisAc(md.cik, { i: `y:${k.y}:${alici.o}:devir:${istekNo}`, t: "sahip", h: isletme, a: 0, y: { isletme, ts, sahip: { h: alici.h, o: alici.o, ad: alici.ad } } }, an);
  alici.pa -= f;
  satici.pa += f;
  const eski = tapu.s;
  const eb = iadeBedeli(k, isletme);
  md.t[isletme] = { s: alici.o, h: alici.h, ts, a: k.ay, f, eb, ...(tapu.y ? { y: { ...tapu.y, ts } } : {}) };
  devralmaSayaciSifirla(md, isletme);
  return basarili({ devir: { isletme, fiyat: f, satici: eski, ts } });
}

// ── Bağlam ve görünüm ──

export function baglamYap(k: Kasaba, kar: Karakter, tv: number): Baglam {
  return { h: kar.h, o: kar.o, ad: kar.ad, mk: meslekKademeleri(kar), tv };
}

/** Personel hedefi: oyuncu (yerel kimlik "o12") ya da NPC ("n34"; yetişkin, başka işletmede çalışmıyor). */
export function personelHedefi(k: Kasaba, ham: unknown): Sonuc<{ oyuncu?: Kisi & { mk: Partial<Record<MeslekId, Kademe>> }; npc?: { n: string; ad: string } }> {
  if (ham === undefined) return basarili({});
  if (typeof ham !== "string") return hata("kisi_yok");
  if (/^o[1-9][0-9]{0,8}$/.test(ham)) {
    const kar = k.kar.get(ham);
    if (!kar || olduMu(kar)) return hata("kisi_yok");
    return basarili({ oyuncu: { h: kar.h, o: kar.o, ad: kar.ad, mk: meslekKademeleri(kar) } });
  }
  if (/^n[1-9][0-9]{0,8}$/.test(ham)) {
    const npc = k.dizin.get(Number(ham.slice(1)));
    if (!npc || karakterYasi(npc, k.ay) < EDINIM_YASI) return hata("kisi_yok");
    for (const t of Object.values(k.mk?.t ?? {})) if (t.y?.pn.includes(ham)) return hata("zaten_calisan");
    return basarili({ npc: { n: ham, ad: npcAdi(npc, "tr") } });
  }
  return hata("kisi_yok");
}

export function bekleyenGorunumu(md: MulkDefteri, o: string) {
  return md.cik.k.filter((x) => x.y.o === o || (x.y.sahip as Kisi | undefined)?.o === o).map((x) => ({ islem: x.i, tur: x.t, tutar: x.a, durum: transferDurumu(md.cik, x.i) }));
}

export function mulkListesi(k: Kasaba, kar: Karakter) {
  const md = mulkDefteri(k);
  const yuvalar = MULK_TURLERI.flatMap((tur) =>
    Array.from({ length: MULK_YUVA[k.tur][tur] }, (_, i) => {
      const id = isletmeKimligi(k.y, tur, i + 1);
      const t = md.t[id];
      const sahip = t ? sakin(k, t.s) : undefined;
      return {
        isletme: id,
        tur,
        no: i + 1,
        durum: t ? ("sahipli" as const) : ("bos" as const),
        ...(t ? { sahip: { id: t.s, ad: sahip?.ad ?? "" }, ad: t.y?.ad ?? "", seviye: t.y?.seviye ?? 0 } : { fiyat: EDINIM_FIYATI[k.tur][tur] }),
        // 4.9: sahipsiz 1. han NPC işletir; sahipsiz diğer han yuvaları boş arsadır.
        ...(tur === "han" && !t ? { npc: i + 1 === NPC_HAN_NO, arsa: i + 1 !== NPC_HAN_NO } : {}),
        ...(t?.dv?.o === kar.o ? { devirTeklifi: { fiyat: t.dv.f } } : {}),
      };
    }),
  );
  const calistigim = Object.entries(md.t)
    .filter(([, t]) => t.y?.po.includes(kar.o))
    .map(([id]) => id);
  const teklifler = Object.entries(md.t)
    .filter(([, t]) => t.y?.to.includes(kar.o))
    .map(([id]) => id);
  return {
    yuvalar,
    benim: sahipMulkleri(md, kar.o),
    calistigim,
    teklifler,
    sinir: { enCok: KISI_MULK_EN_COK, sahip: sahipMulkleri(md, kar.o).length, hanEnCok: HAN_KISI_YERLESIM_EN_COK, han: sahipHanSayisi(k, md, kar.o) },
    edinimSarti: Object.fromEntries(MULK_TURLERI.map((t) => [t, edinimSarti(k, kar, t)])),
    bekleyen: bekleyenGorunumu(md, kar.o),
  };
}

/** Değişmez denetimi: yerleşim tarafında uçuştaki akçe (cüzdandan düşülmüş, kasaya henüz yazılmamış). */
export function yerlesimUcustaki(k: Kasaba): number {
  return k.mk ? bekleyenToplam(k.mk.cik) : 0;
}

export type MulkHata = HataKodu;

/** Devralınan işletmenin kasa + emaneti eski sahibe ulaştı (bilgi). */
export function devralmaKasaOlayi(o: string, isletme: string, tutar: number): OlayTaslagi {
  return { t: "tezgah", w: o, h: "", g: o, n: 3, k: "olay.tezgah.devralmaKasasi", p: { isletme, tutar } };
}
