// YonetimDO tarafı: canlı etkinlik listesi, başlatma, durdurma ve yerleşimlere dağıtım.
// - GET  /yonetim/etkinlikler        → katalog, etkin olanlar (ne zamandır açık), geçmiş, beylik/yerleşim seçenekleri
// - POST /yonetim/etkinlik-baslat    {tur, kapsam, hedef?, saat, gerekce?, istekNo} → etkinlik
// - POST /yonetim/etkinlik-durdur    {id, istekNo} → durdurulan etkinlik
// Başlatma/durdurma: kurucu ve yetki verilmiş moderatör (yetki: etkinlikYonet); süre sınırı yalnız moderatöre, her biri işlem kaydına girer ve istekNo ile tekrar güvenlidir.
// Yerleşim her istekte `parametrelerCalisma {yerlesim}` ile etkin listeyi alır: durdurma bir sonraki istekte söner.

import type { Depo } from "../depo.ts";
import { BEYLIKLER } from "../dunya-veri.ts";
import { istekNoCoz } from "../mantik.ts";
import { basarili, type Sonuc } from "../tipler.ts";
import { kurucuMu, reddet, tekrar, yaz, yetkiIste, type Oturum } from "../yonetim/islem.ts";
import { gerekceCoz } from "../yonetim/yaptirim.ts";
import {
  ETKINLIK_ETKIN_EN_COK,
  ETKINLIK_GECMIS_EN_COK,
  ETKINLIK_SAAT_EN_COK,
  ETKINLIK_TURLERI,
  ETKINLIKLER,
  hedefGecerli,
  kapsamBoyu,
  kapsamMi,
  kapsiyor,
  kesisir,
  KAPSAMLAR,
  ozetle,
  suruyor,
  turMu,
  type Etkinlik,
  type EtkinlikOzeti,
  type Kapsam,
} from "./katalog.ts";

const AKTIF = "etk:aktif";
const GECMIS = "etk:gecmis";
const SAYAC = "etk:sayac";
const SAAT_MS = 3_600_000;
/** [PARAMETRE] Kurucunun açabileceği en uzun süre (saat; yalnız sayı güvenliği, ≈10 yıl). 0 = süresiz her zaman açık. */
export const ETKINLIK_SAAT_TEKNIK = 24 * 365 * 10;

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Etkin listesi ile süresi dolanları ayırır (süresi dolan geçmişe kendiliğinden bitti olarak geçer). */
async function oku(depo: Depo, simdi: number): Promise<{ aktif: Etkinlik[]; biten: Etkinlik[]; gecmis: Etkinlik[] }> {
  const hepsi = (await depo.al<Etkinlik[]>(AKTIF)) ?? [];
  const gecmis = (await depo.al<Etkinlik[]>(GECMIS)) ?? [];
  return { aktif: hepsi.filter((e) => suruyor(e, simdi)), biten: hepsi.filter((e) => !suruyor(e, simdi)), gecmis };
}

function gecmiseEkle(gecmis: Etkinlik[], eklenen: Etkinlik[]): Etkinlik[] {
  return [...eklenen, ...gecmis].slice(0, ETKINLIK_GECMIS_EN_COK);
}

/** Bitmiş ya da durdurulmuş etkinliğin gerçek bitiş anı. */
const bitisAni = (e: Etkinlik): number => e.dur ?? e.bit ?? e.bas;

function panelSatiri(e: Etkinlik, simdi: number) {
  const t = ETKINLIKLER[e.tur];
  const etkin = suruyor(e, simdi);
  return {
    ...e,
    ad: t.ad,
    ikon: t.ikon,
    etkin,
    /** Kaç yerleşimi kapsıyor. */
    yerSayisi: kapsamBoyu(e),
    /** Ne zamandır açık (ms) ya da ne kadar açık kaldı. */
    sure: (etkin ? simdi : bitisAni(e)) - e.bas,
    kalan: etkin && e.bit !== null ? e.bit - simdi : null,
  };
}

/** Yerleşimlere giden çalışma görünümü: bu yerleşimi kapsayan etkin etkinlikler. Okur, yazmaz. */
export async function etkinlikCalisma(depo: Depo, yerlesim: string, simdi: number): Promise<EtkinlikOzeti[]> {
  const hepsi = (await depo.al<Etkinlik[]>(AKTIF)) ?? [];
  return hepsi.filter((e) => suruyor(e, simdi) && kapsiyor(e, yerlesim)).map(ozetle);
}

export async function etkinlikListesi(o: Oturum): Promise<Sonuc<unknown>> {
  const red = await yetkiIste(o, "etkinlikGor");
  if (red) return red;
  const simdi = o.b.simdi;
  const { aktif, biten, gecmis } = await oku(o.b.depo, simdi);
  return basarili({
    simdi,
    katalog: ETKINLIK_TURLERI.map((tur) => {
      const t = ETKINLIKLER[tur];
      return {
        tur, ad: t.ad, ozet: t.ozet, ikon: t.ikon, saat: t.saat,
        dert: t.dert ?? null,
        katilim: { nam: t.katilim.nam, namN: t.katilim.namN, gonul: t.katilim.gonul, mal: t.katilim.mal ?? null, meslek: t.katilim.meslek },
      };
    }),
    etkin: aktif.map((e) => panelSatiri(e, simdi)),
    gecmis: gecmiseEkle(gecmis, biten).map((e) => panelSatiri(e, simdi)),
    kapsamlar: KAPSAMLAR,
    beylikler: BEYLIKLER.map((b) => ({ id: b.id, ad: b.ad, yerlesimler: b.yerlesimler.map((y) => ({ id: y.id, ad: y.ad, tur: y.tur })) })),
    enCok: { etkin: ETKINLIK_ETKIN_EN_COK, saat: ETKINLIK_SAAT_EN_COK },
  });
}

export async function etkinlikBaslat(o: Oturum, govde: unknown): Promise<Sonuc<unknown>> {
  const g = nesneMi(govde) ? govde : {};
  const red = await yetkiIste(o, "etkinlikYonet");
  if (red) return red;
  const no = istekNoCoz(g);
  if (!no.ok) return reddet(o, "etkinlikBaslat", no.hata);
  if (!turMu(g.tur) || !kapsamMi(g.kapsam) || !hedefGecerli(g.kapsam, g.hedef)) return reddet(o, "etkinlikBaslat", "etkinlik_gecersiz");
  const saat = g.saat === undefined ? ETKINLIKLER[g.tur].saat : g.saat;
  // Süre sınırı yalnız moderatöre: kurucu istediği kadar açık tutar (teknik sınır ETKINLIK_SAAT_TEKNIK).
  const saatSiniri = kurucuMu(o) ? ETKINLIK_SAAT_TEKNIK : ETKINLIK_SAAT_EN_COK;
  if (typeof saat !== "number" || !Number.isInteger(saat) || saat < 0 || saat > saatSiniri) {
    return reddet(o, "etkinlikBaslat", "etkinlik_gecersiz");
  }
  const gerekceHam = g.gerekce === undefined || g.gerekce === "" ? `Canlı etkinlik: ${ETKINLIKLER[g.tur].ad}` : g.gerekce;
  const gerekce = gerekceCoz(gerekceHam);
  if (!gerekce.ok) return reddet(o, "etkinlikBaslat", gerekce.hata);
  const onceki = await tekrar(o, no.deger);
  if (onceki) return onceki;

  const simdi = o.b.simdi;
  const { aktif, biten, gecmis } = await oku(o.b.depo, simdi);
  const hedef = g.kapsam === "dunya" ? undefined : (g.hedef as string);
  // Aynı tür aynı yerde iki kez açılmaz (etkileri üst üste binmesin).
  const cakisan = aktif.find((e) => e.tur === g.tur && kesisir(e, { kapsam: g.kapsam as Kapsam, hedef }));
  if (cakisan) return reddet(o, "etkinlikBaslat", "etkinlik_suruyor", { ayrinti: { tur: g.tur, id: cakisan.id } });
  if (aktif.length >= ETKINLIK_ETKIN_EN_COK) return reddet(o, "etkinlikBaslat", "etkinlik_siniri");

  const sayac = ((await o.b.depo.al<number>(SAYAC)) ?? 0) + 1;
  const e: Etkinlik = {
    id: `e${sayac}`,
    tur: g.tur,
    kapsam: g.kapsam,
    ...(hedef ? { hedef } : {}),
    bas: simdi,
    bit: saat === 0 ? null : simdi + saat * SAAT_MS,
    kim: o.y.eposta,
  };
  const sonuc = basarili(panelSatiri(e, simdi));
  await yaz(
    o, no.deger, "etkinlikBaslat",
    { gerekce: gerekce.deger, ayrinti: { id: e.id, tur: e.tur, kapsam: e.kapsam, hedef: hedef ?? null, saat } },
    { [SAYAC]: sayac, [AKTIF]: [...aktif, e], [GECMIS]: gecmiseEkle(gecmis, biten) },
    sonuc,
  );
  return sonuc;
}

export async function etkinlikDurdur(o: Oturum, govde: unknown): Promise<Sonuc<unknown>> {
  const g = nesneMi(govde) ? govde : {};
  const red = await yetkiIste(o, "etkinlikYonet");
  if (red) return red;
  const no = istekNoCoz(g);
  if (!no.ok) return reddet(o, "etkinlikDurdur", no.hata);
  if (typeof g.id !== "string" || !/^e[0-9]{1,9}$/.test(g.id)) return reddet(o, "etkinlikDurdur", "etkinlik_gecersiz");
  const onceki = await tekrar(o, no.deger);
  if (onceki) return onceki;

  const simdi = o.b.simdi;
  const { aktif, biten, gecmis } = await oku(o.b.depo, simdi);
  const e = aktif.find((x) => x.id === g.id);
  if (!e) return reddet(o, "etkinlikDurdur", "etkinlik_yok", { ayrinti: { id: g.id } });
  const duran: Etkinlik = { ...e, dur: simdi, durKim: o.y.eposta };
  const sonuc = basarili(panelSatiri(duran, simdi));
  await yaz(
    o, no.deger, "etkinlikDurdur",
    { gerekce: `Etkinlik durduruldu: ${ETKINLIKLER[e.tur].ad}`, ayrinti: { id: e.id, tur: e.tur, acikKaldiMs: simdi - e.bas } },
    { [AKTIF]: aktif.filter((x) => x.id !== e.id), [GECMIS]: gecmiseEkle(gecmis, [...biten, duran]) },
    sonuc,
  );
  return sonuc;
}
