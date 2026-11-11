// Yerleşim tarafı mülk defteri (YerlesimDO; depo anahtarı "mk"): tapu (yuva → sahip), edinim şartı, cüzdan → kasa
// çıkış kutusu, kasa → cüzdan giriş defteri, işletme yansıları (oda kataloğu, fiyat, kapasite, personel), oyuncu
// hanının kiracıları, karşılıklı işlem izleme ve devir. Saf fonksiyonlar; karakter ve kasabayı yerinde değiştirir.
// Cüzdan (karakterin akçesi) ve tapu aynı DO'da olduğu için edinim ve devir ödemesi tek yazımda atomiktir.

import { karakterYasi } from "../yerlesim/karakter.ts";
import { hizmetAcik } from "../yerlesim/beceri-etki.ts";
import { kiraTut } from "../yerlesim/barinma.ts";
import { ayniKume } from "../yerlesim/teveccuh.ts";
import { olduMu } from "../yerlesim/hanedan.ts";
import { npcAdi } from "../yerlesim/ortak.ts";
import { IKRAM_MENUSU, type IkramId } from "../han/ikram.ts";
import type { Karakter, Kasaba, Sakin } from "../yerlesim/tipler.ts";
import type { Kademe, MeslekId } from "../icerik/meslekler.ts";
import { basarili, hata, type HataKodu, type Sonuc } from "../tipler.ts";
import {
  EDINIM_FIYATI,
  EDINIM_LONCA_KADEME,
  EDINIM_NAM_ESIGI,
  EDINIM_YASI,
  KISI_MULK_EN_COK,
  MULK_TURLERI,
  MULK_YUVA,
  ROL_MESLEGI,
  TRANSFER_EN_COK,
  isletmeKimligi,
  type MulkTuru,
} from "./kurallar.ts";
import type { AyarYuku, Baglam, GirisNedeni, Kisi } from "./isletme.ts";
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
  /** Oyuncu hanı kiracıları: işletme → [yerel kimlik, bitiş ms][]. */
  od: Record<string, [string, number][]>;
  /** Denetim: edinim bedeli olarak dünyadan çıkan akçe. */
  batak: number;
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

function bosYuva(k: Kasaba, md: MulkDefteri, tur: MulkTuru): number | undefined {
  for (let no = 1; no <= MULK_YUVA[k.tur][tur]; no++) if (!md.t[isletmeKimligi(k.y, tur, no)]) return no;
  return undefined;
}

/** POST /v1/mulk/edin {tur}: şart + boş yuva + kişi sınırı; bedel beyliğe (dünyadan çıkar); işletme kurulumu çıkış kutusuna. */
export function edin(k: Kasaba, kar: Karakter, govde: unknown, an: number, istekNo: string): Sonuc<Record<string, unknown>> {
  if (!nesneMi(govde) || typeof govde.tur !== "string" || !(MULK_TURLERI as readonly string[]).includes(govde.tur)) return hata("mulk_tur_gecersiz");
  const tur = govde.tur as MulkTuru;
  const md = mulkDefteri(k);
  if (sahipMulkleri(md, kar.o).length >= KISI_MULK_EN_COK) return hata("mulk_siniri");
  const no = bosYuva(k, md, tur);
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
  md.t[id] = { s: kar.o, h: kar.h, ts, a: k.ay, f: sart.fiyat };
  return basarili({ edinim: { isletme: id, tur, no, fiyat: sart.fiyat, batak: sart.fiyat, sart, islem } });
}

// ── Cüzdan → kasa ──

/** Karşılıklı işlem: bu ay sahip, ödeyenin işletmesine ödeme yaptı mı. */
function karsilikliMi(md: MulkDefteri, ay: number, oden: string, sahip: string): boolean {
  if (md.mh[0] !== ay) return false;
  const odeyenin = new Set(sahipMulkleri(md, oden));
  return odeyenin.size > 0 && md.mh[1].some(([a, b]) => a === sahip && b === oden);
}

/**
 * Cüzdandan kasaya çıkış (bakiye çağıranca düşülmüş olmalı ya da `dus`). Aynı hesap kümesi ve karşılıklı işlem
 * bayrakları burada (sakin dizininden) hesaplanır: IsletmeDO'nun çoklu hesap izleme kancası bunları yazar.
 */
export function kasayaCikis(k: Kasaba, kar: Karakter, isletme: string, tutar: number, neden: GirisNedeni, an: number, islem: string, dus: boolean): Sonuc<{ islem: string; kume: boolean; karsilikli: boolean }> {
  const md = mulkDefteri(k);
  const tapu = md.t[isletme];
  if (!tapu) return hata("isletme_yok");
  if (dus && kar.pa < tutar) return hata("para_yok");
  const ben = sakin(k, kar.o);
  const sahip = sakin(k, tapu.s);
  const kume = neden !== "yatir" && !!ben && !!sahip && ayniKume(ben, sahip);
  const karsilikli = neden !== "yatir" && karsilikliMi(md, k.ay, kar.o, tapu.s);
  if (!cikisAc(md.cik, { i: islem, t: "kasaya", h: isletme, a: tutar, y: { isletme, o: kar.o, tutar, neden, kume, karsilikli } }, an)) return hata("transfer_bekliyor");
  if (dus) kar.pa -= tutar;
  if (neden !== "yatir") {
    if (md.mh[0] !== k.ay) md.mh = [k.ay, []];
    md.mh[1].push([kar.o, tapu.s]);
    if (md.mh[1].length > MUSTERI_IZ_EN_COK) md.mh[1].splice(0, md.mh[1].length - MUSTERI_IZ_EN_COK);
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

export interface OyuncuHani {
  isletme: string;
  sahip: string;
  fc: number;
  seviye: number;
  kapasite: number;
}

/** Yerleşimin hanı oyuncu işletmesi ve açık mı (yansıya göre; yansı gelmeden NPC han sayılmaz, han kapalıdır). */
export function oyuncuHani(k: Kasaba): OyuncuHani | undefined {
  const id = isletmeKimligi(k.y, "han", 1);
  const t = k.mk?.t[id];
  if (!t) return undefined;
  const y = t.y;
  return { isletme: id, sahip: t.s, fc: y?.fc ?? 100, seviye: y?.seviye ?? 0, kapasite: y && y.durum === "acik" && y.kapi ? y.kapasite : 0 };
}

function bosOda(md: MulkDefteri, isletme: string, kapasite: number, an: number): number {
  const l = (md.od[isletme] ?? []).filter(([, s]) => s > an);
  md.od[isletme] = l;
  return kapasite - l.length;
}

/** Kira: yerleşimin hanı oyuncununsa kira kasaya gider (çıkış kutusu), değilse Faz 14 NPC hancı (batak). */
export function mulkluKira(k: Kasaba, kar: Karakter, govde: unknown, an: number): Sonuc<Record<string, unknown>> {
  const oh = oyuncuHani(k);
  if (!oh) return kiraTut(k, kar, govde, an);
  const md = mulkDefteri(k);
  if (oh.sahip === kar.o) return hata("kendine");
  if (md.cik.k.length >= CIKIS_EN_COK) return hata("transfer_bekliyor");
  const istekNo = nesneMi(govde) ? String(govde.istekNo) : "";
  const r = kiraTut(k, kar, govde, an, { isletme: oh.isletme, fc: oh.fc, seviye: oh.seviye, bos: bosOda(md, oh.isletme, oh.kapasite, an) });
  if (!r.ok) return r;
  const kira = r.deger.kira as { kasaya: number; bitis: number };
  const c = kasayaCikis(k, kar, oh.isletme, kira.kasaya, "kira", an, `y:${k.y}:${kar.o}:kira:${istekNo}`, false);
  if (!c.ok) return c;
  const l = md.od[oh.isletme]!.filter(([o]) => o !== kar.o);
  l.push([kar.o, kira.bitis]);
  md.od[oh.isletme] = l;
  return basarili({ ...r.deger, transfer: { islem: c.deger.islem } });
}

/** İkram ödemesi: oyuncu hanında akçe kasaya (çarpanlı menü), NPC handa dünyadan çıkar (Faz 10 kuralı). */
export function mulkluIkram(k: Kasaba, kar: Karakter, ikram: IkramId, an: number, istekNo: string): Sonuc<{ fiyat: number; batak: number; kasaya: number; islem?: string }> {
  const oh = oyuncuHani(k);
  const taban = IKRAM_MENUSU[ikram].fiyat;
  if (!oh) {
    // Hancı "ikram" hizmeti yalnız NPC menüsünde %10 meslek indirimi sağlar; oyuncu hanının fiyatını sahibi belirler.
    const fiyat = hizmetAcik(kar, "ikram") ? Math.max(1, Math.round(taban * 0.9)) : taban;
    if (kar.pa < fiyat) return hata("para_yok");
    kar.pa -= fiyat;
    return basarili({ fiyat, batak: fiyat, kasaya: 0 });
  }
  if (oh.kapasite === 0) return hata("han_kapali");
  const fiyat = Math.max(1, Math.ceil((taban * oh.fc) / 100 - 1e-9));
  const c = kasayaCikis(k, kar, oh.isletme, fiyat, "ikram", an, `y:${k.y}:${kar.o}:ikram:${istekNo}`, true);
  if (!c.ok) return c;
  return basarili({ fiyat, batak: 0, kasaya: fiyat, islem: c.deger.islem });
}

// ── Gelen kayıtlar (IsletmeDO çıkış kutusundan) ──

export function karGerekenler(kayitlar: CikisKaydi[]): string[] {
  return kayitlar.flatMap((x) => (x.t === "cuzdana" && typeof x.y.o === "string" ? [x.y.o] : []));
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
      if (!kar || olduMu(kar)) return { durum: "red", neden: "kisi_yok" };
      if (!Number.isInteger(tutar) || (tutar as number) <= 0 || tutar !== x.a) return { durum: "red", neden: "tutar_gecersiz" };
      kar.pa += tutar as number;
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
    const kar = typeof x.y.o === "string" ? k.kar.get(x.y.o) : undefined;
    if (kar) kar.pa += x.a;
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
  if (x.t === "kasaya" && typeof x.y.o === "string") return [x.y.o];
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
  md.t[isletme] = { s: alici.o, h: alici.h, ts, a: k.ay, f, ...(tapu.y ? { y: { ...tapu.y, ts } } : {}) };
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
    sinir: { enCok: KISI_MULK_EN_COK, sahip: sahipMulkleri(md, kar.o).length },
    edinimSarti: Object.fromEntries(MULK_TURLERI.map((t) => [t, edinimSarti(k, kar, t)])),
    bekleyen: bekleyenGorunumu(md, kar.o),
  };
}

/** Değişmez denetimi: yerleşim tarafında uçuştaki akçe (cüzdandan düşülmüş, kasaya henüz yazılmamış). */
export function yerlesimUcustaki(k: Kasaba): number {
  return k.mk ? bekleyenToplam(k.mk.cik) : 0;
}

export type MulkHata = HataKodu;
