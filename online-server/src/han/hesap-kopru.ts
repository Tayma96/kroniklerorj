// HesapDO tarafı han işlemleri: han listesi, masa bileti (WebSocket yükseltmesi öncesi), butonlu eylem, ikram,
// yaptırım değişikliğinin masaya bildirilmesi. Profil ve yaptırım HesapDO'dadır; masa durumu MasaDO'dadır.
// HesapDO bunları yalnız çağırır; hız sınırı ve uzaklaştırma engeli HesapDO'da bu çağrılardan önce uygulanır.

import type { Depo } from "../depo.ts";
import { yerlesimBul } from "../dunya-veri.ts";
import { profilGetir } from "../mantik.ts";
import { basarili, hata, type HesapYaptirimi, type Sonuc } from "../tipler.ts";
import { dilCoz } from "../yerlesim/ortak.ts";
import { gunlukSay, type GunlukSayac } from "../yonetim/sikayet.ts";
import { eylemGirdisiCoz } from "./eylem.ts";
import { IKRAM_GUNLUK, IKRAM_MENUSU, ikramGirdisiCoz } from "./ikram.ts";
import { ZIYAFET_GUNLUK, ziyafetGirdisiCoz } from "./ziyafet.ts";
import { PANO_GUNLUK, panoGirdisiCoz } from "./pano.ts";
import { HAN_DUZENI, HAN_EYLEM_GUNLUK, HAN_TURU_ADLARI, KOLTUK_SAYISI, hanMasaAdi, masaNoCoz, masaSayisi, masaSirala } from "./kurallar.ts";
import { hanNoCoz } from "../mulk/tapu.ts";
import { isletmeKimligi } from "../mulk/kurallar.ts";
import type { HanKarti, HanOzeti, HanTuru, MasaAnonsu, SesAlt, MasaBileti, MasaIcOzeti, MasaIleti, MasaOlayi, MasaOzeti } from "./tipler.ts";
import type { IkramOdeyici } from "./yerlesim-kopru.ts";

// HesapDO depo anahtarları (yalnız "han:" önekli; başka anahtara dokunulmaz)
export const SON_MASA = "han:sonMasa";
export const EYLEM_SAYAC = "han:eylemSayac";
export const IKRAM_SAYAC = "han:ikramSayac";
export const EYLEM_ISTEK = "han:eylem:"; // + istekNo → Sonuc
export const IKRAM_ISTEK = "han:ikram:"; // + istekNo → Sonuc
export const ZIYAFET_SAYAC = "han:ziyafetSayac";
export const PANO_SAYAC = "han:panoSayac";
export const PANO_ISTEK = "han:pano:"; // + istekNo → Sonuc
export const ZIYAFET_ISTEK = "han:ziyafet:"; // + istekNo → Sonuc
/** H5: yerleşime henüz teslim edilemeyen masa olayları (giden kutusu; sonraki eylemde yeniden denenir). */
export const OLAY_KUYRUK = "han:olayKuyruk";
/** [PARAMETRE] Giden kutusunda en çok bekleyen olay (dolarsa en eskisi düşer; etki kaybolur, eylem bozulmaz). */
export const OLAY_KUYRUK_EN_COK = 20;

export type MasaCagir = (ad: string, ileti: MasaIleti) => Promise<Sonuc<unknown>>;

export interface HanHesapBaglami {
  depo: Depo;
  hesapId: string;
  simdi: number;
  yaptirim: HesapYaptirimi | undefined;
  masaCagir: MasaCagir;
  ikramOde: IkramOdeyici;
  /** Yerleşimdeki iki yönlü engel listesi (hesap kimlikleri). Yoksa liste boş sayılır (birim testleri). */
  engelSor?: EngelListeleyici;
  /** Debdebe çerçevesi (oyun etkisi yok); yoksa sade plaka. */
  plakaCerçevesi?: () => Promise<string | undefined>;
  /** H11: Debdebe masa yüzeyleri (çerçeve, balon, masa süsü); verilirse çerçeve de buradan gelir. */
  plakaSusleri?: () => Promise<{ cerceve?: string; balon?: string; masaSusu?: string }>;
  /** H1: yerleşimdeki dostlar ve hane üyeleri (hesap kimlikleri; tek iç çağrı). Yoksa tanıdık sayısı 0. */
  tanidikSor?: TanidikListeleyici;
  /** H3: hesabın oluşturulma anı (HesapDO kaydından; istemci veremez). */
  hesapOlusturma?: () => Promise<number | undefined>;
  /** H7: ziyafet ödemesi ve etkisi (YerlesimDO `hanZiyafet`). Yoksa ziyafet `gecersiz_istek`. */
  ziyafetOde?: ZiyafetOdeyici;
  /** H5: masa olayını yerleşime iletir (tekrar güvenli; anahtar masa adı + olay no). Yoksa etki yok. */
  hanOlayiGonder?: HanOlayiGonderici;
  /** 4.9: yerleşimin açık hanları (YerlesimDO `hanlar`). Yoksa yalnız 1. han vardır (2.+ han `han_yok`). */
  hanlarSor?: HanListeleyici;
}

/** HesapDO → YerlesimDO "engeller" çağrısı (H4: müdavim rozeti de döner; 4.9: rozet seçili hanın). */
export type EngelListeleyici = (yerlesim: string, han?: number) => Promise<Sonuc<{ engeller: string[]; mudavim?: boolean; ozan?: boolean; kisi?: string; nam?: number }>>;
/** HesapDO → YerlesimDO "hanlar" çağrısı (4.9). */
export type HanListeleyici = (yerlesim: string) => Promise<Sonuc<{ hanlar: HanKarti[] }>>;
/** HesapDO → YerlesimDO "hanTanidiklar" çağrısı. */
export type TanidikListeleyici = (yerlesim: string) => Promise<Sonuc<{ hesaplar: string[] }>>;

/** HesapDO → YerlesimDO "hanOlayi" iletisinin gövdesi. */
export interface HanOlayiGovdesi {
  /** Tekrar anahtarı: masa adı + "#" + olay no. */
  anahtar: string;
  olay: MasaOlayi;
}
export interface HanOlayiBekleyen extends HanOlayiGovdesi {
  yerlesim: string;
}
export type ZiyafetOdeyici = (yerlesim: string, govde: { masa: string; masaNo: number; oturanlar: string[]; istekNo: string; han?: number }) => Promise<Sonuc<{ bedel: number; para: number; nam: number }>>;
export type HanOlayiGonderici = (yerlesim: string, govde: HanOlayiGovdesi) => Promise<Sonuc<unknown>>;

interface HanYeri {
  yerlesim: string;
  yerlesimAdi: string;
  tur: HanTuru;
  masa: number;
  /** 4.9: seçili han numarası (1 = bugünkü han). */
  han: number;
  /** Yerleşimden gelen han kartları (yalnız sorulduysa). */
  kartlar?: HanKarti[];
}

/**
 * Oyuncunun yerleşimi ve seçili han (4.9). Han verilmezse 1. han (eski istemci; ek iç çağrı yok). 2. ve sonraki
 * hanlar yalnız yerleşimde açıksa (sahipli) geçerlidir: sahipsiz arsanın masası yoktur. `kartlar`: listeyi de iste.
 */
async function hanYeri(b: Pick<HanHesapBaglami, "depo" | "hanlarSor">, hamHan?: unknown, kartlar = false): Promise<Sonuc<HanYeri>> {
  const han = hanNoCoz(hamHan);
  if (han === undefined) return hata("han_gecersiz");
  const profil = await profilGetir(b.depo);
  if (!profil.ok) return profil;
  const y = yerlesimBul(profil.deger.yerlesim);
  if (!y) return hata("yerlesim_gecersiz");
  const yer: HanYeri = { yerlesim: y.id, yerlesimAdi: y.ad, tur: HAN_DUZENI[y.tur].tur, masa: masaSayisi(y.tur), han };
  if (han === 1 && !kartlar) return basarili(yer);
  if (!b.hanlarSor) return han === 1 ? basarili(yer) : hata("han_yok");
  let r: Sonuc<{ hanlar: HanKarti[] }>;
  try {
    r = await b.hanlarSor(y.id);
  } catch (e) {
    // 1. han liste olmadan da çalışır; diğer hanın varlığı doğrulanamazsa reddedilir.
    if (han === 1) return basarili(yer);
    throw e;
  }
  if (!r.ok) return han === 1 ? basarili(yer) : r;
  const l = Array.isArray(r.deger.hanlar) ? r.deger.hanlar : [];
  if (!l.some((x) => x.no === han)) return hata("han_yok");
  return basarili({ ...yer, kartlar: l });
}

/** Seçili hanın masa adı. */
function masaAdiYer(yer: HanYeri, no: number): string {
  return hanMasaAdi(yer.yerlesim, yer.tur, yer.han, no);
}

/**
 * GET /v1/han?dil=&han= : oyuncunun yerleşimindeki seçili han (yoksa 1. han), masaların doluluğu ve yerleşimin bütün
 * açık hanlarının kartları (4.9: sahip, seviye, fiyat çarpanı, oda doluluğu, masa/oturan sayısı, müdavim rozetim).
 */
export async function hanListesi(b: HanHesapBaglami, dil: unknown, hamHan?: unknown): Promise<Sonuc<HanOzeti>> {
  const yer = await hanYeri(b, hamHan, true);
  if (!yer.ok) return yer;
  const { yerlesim, tur, han } = yer.deger;
  const nolar = Array.from({ length: yer.deger.masa }, (_, i) => i + 1);
  const kartlar = yer.deger.kartlar ?? [{ no: 1, isletme: isletmeKimligi(yerlesim, "han", 1), sahip: "npc", ad: "", seviye: 0, fc: 100, acik: true, oda: null, mudavim: null } satisfies HanKarti];
  // Masa özetleri: her açık hanın her masası (seçili hanınkiler ayrıntılı listeye de girer).
  const ozetSor = (h: number) => Promise.all(nolar.map((no) => { const ad = hanMasaAdi(yerlesim, tur, h, no); return b.masaCagir(ad, { islem: "ozet", masa: ad, no }); }));
  const [hanOzetleri, tanidiklar] = await Promise.all([
    Promise.all(kartlar.map((k) => ozetSor(k.no))),
    tanidikKumesi(b, yerlesim),
  ]);
  const masalar: MasaOzeti[] = [];
  const hanlar: HanKarti[] = [];
  for (let i = 0; i < kartlar.length; i++) {
    const kart = kartlar[i]!;
    let acik = 0;
    let oturan = 0;
    for (const o of hanOzetleri[i]!) {
      if (!o.ok) return o;
      // Oturan kimlikleri yalnız sayıma girer; istemciye giden özette yoktur.
      const { oturanlar, ...ozet } = o.deger as MasaIcOzeti;
      oturan += ozet.oturan;
      if (ozet.ayar?.acik !== false) acik++;
      if (kart.no === han) {
        const tanidik = (oturanlar ?? []).filter((h) => h !== b.hesapId && tanidiklar.has(h)).length;
        masalar.push({ ...ozet, tanidik });
      }
    }
    hanlar.push({ ...kart, masa: { sayi: nolar.length, acik, oturan } });
  }
  return basarili({
    yerlesim: { id: yerlesim, ad: yer.deger.yerlesimAdi },
    han: { tur, ad: HAN_TURU_ADLARI[tur][dilCoz(dil)], no: han, isletme: isletmeKimligi(yerlesim, "han", han) },
    koltuk: KOLTUK_SAYISI,
    masalar: masaSirala(masalar),
    menu: Object.entries(IKRAM_MENUSU).map(([id, m]) => ({ id, fiyat: m.fiyat })),
    hanlar,
  });
}

/** Dost ve hane üyeleri (en iyi çaba: yerleşim yanıt vermezse boş; han listesi bozulmaz). */
async function tanidikKumesi(b: HanHesapBaglami, yerlesim: string): Promise<Set<string>> {
  if (!b.tanidikSor) return new Set();
  try {
    const r = await b.tanidikSor(yerlesim);
    return new Set(r.ok && Array.isArray(r.deger.hesaplar) ? r.deger.hesaplar : []);
  } catch {
    return new Set();
  }
}

/**
 * GET /v1/han/masa/:no/baglan öncesi: masa numarası doğrulanır, bilet üretilir (plaka + yaptırım anlık görüntüsü).
 * Oyuncu aynı anda tek masadadır: önceki masa farklıysa oradaki bağlantı kapatılır.
 */
export async function masaBileti(b: HanHesapBaglami, hamNo: unknown, hamHan?: unknown): Promise<Sonuc<MasaBileti>> {
  const profil = await profilGetir(b.depo);
  if (!profil.ok) return profil;
  const yer = await hanYeri(b, hamHan);
  if (!yer.ok) return yer;
  const no = masaNoCoz(hamNo, yer.deger.masa);
  if (no === undefined) return hata("masa_gecersiz");
  const ad = masaAdiYer(yer.deger, no);
  const onceki = await b.depo.al<string>(SON_MASA);
  if (onceki && onceki !== ad) {
    try {
      await b.masaCagir(onceki, { islem: "cikar", masa: onceki, hesap: b.hesapId });
    } catch {
      // en iyi çaba: önceki masa yanıt vermezse bağlantı kendiliğinden düşer
    }
  }
  let eg: string[] = [];
  let mudavim = false;
  let ozan = false;
  let kisi: string | undefined;
  let nam: number | undefined;
  if (b.engelSor) {
    const r = await b.engelSor(yer.deger.yerlesim, yer.deger.han);
    if (!r.ok) return r;
    eg = r.deger.engeller;
    mudavim = r.deger.mudavim === true;
    ozan = r.deger.ozan === true;
    if (typeof r.deger.kisi === "string") kisi = r.deger.kisi;
    if (typeof r.deger.nam === "number") nam = r.deger.nam;
  }
  let ho: number | undefined;
  try { ho = await b.hesapOlusturma?.(); } catch { /* bilinmezse yeni hesap sınırı uygulanmaz */ }
  if (onceki !== ad) await b.depo.koy({ [SON_MASA]: ad });
  let susler: { cerceve?: string; balon?: string; masaSusu?: string } = {};
  try {
    susler = b.plakaSusleri ? await b.plakaSusleri() : { cerceve: await b.plakaCerçevesi?.() };
  } catch { /* kozmetik hatası han bağlantısını engellemez */ }
  const cerceve = susler.cerceve;
  const yt: HesapYaptirimi = {
    ...(b.yaptirim?.uzaklastirma ? { uzaklastirma: b.yaptirim.uzaklastirma } : {}),
    ...(b.yaptirim?.susturma ? { susturma: b.yaptirim.susturma } : {}),
  };
  const plaka = {
    hesap: b.hesapId,
    ad: profil.deger.ad,
    ...(cerceve ? { cerceve } : {}),
    ...(susler.balon ? { balon: susler.balon } : {}),
    ...(susler.masaSusu ? { masaSusu: susler.masaSusu } : {}),
    ...(mudavim ? { mudavim: true as const } : {}),
    ...(ozan ? { ozan: true as const } : {}),
    ...(kisi ? { kisi } : {}),
    ...(nam !== undefined ? { nam } : {}),
  };
  return basarili({ masa: ad, no, plaka, yt, eg, ...(typeof ho === "number" ? { ho } : {}) });
}

/** Gövdedeki `han` alanı (4.9; yoksa 1. han). */
function hanAlani(govde: unknown): unknown {
  return typeof govde === "object" && govde !== null && !Array.isArray(govde) ? (govde as Record<string, unknown>).han : undefined;
}

// Hesap başına han yazma sırası: eylem/ikram, sayaç ve istekNo kaydını başka DO'ya await'ten önce okuyup sonra
// yazar. DO aradaki await'te başka isteği içeri aldığından bu bölümler hesap (depo) başına sıraya konur; aksi
// hâlde eşzamanlı isteklerle günlük tavan aşılır ve aynı istekNo iki kez ödenir/anons edilir.
const hanSirasi = new WeakMap<Depo, Promise<unknown>>();

function sirayla<T>(depo: Depo, is: () => Promise<T>): Promise<T> {
  const onceki = hanSirasi.get(depo) ?? Promise.resolve();
  const sonraki = onceki.then(is, is);
  hanSirasi.set(depo, sonraki.catch(() => undefined));
  return sonraki;
}

/** POST /v1/han/eylem: istekNo ile tekrar güvenli; günlük tavan yalnız başarılı eylemi sayar. */
export function hanEylemi(b: HanHesapBaglami, govde: unknown): Promise<Sonuc<{ olay: MasaOlayi }>> {
  return sirayla(b.depo, () => hanEylemiSirada(b, govde));
}

async function hanEylemiSirada(b: HanHesapBaglami, govde: unknown): Promise<Sonuc<{ olay: MasaOlayi }>> {
  const girdi = eylemGirdisiCoz(govde);
  if (!girdi.ok) return girdi;
  const anahtar = EYLEM_ISTEK + girdi.deger.istekNo;
  const kayitli = await b.depo.al<Sonuc<{ olay: MasaOlayi }>>(anahtar);
  if (kayitli) {
    await olayKuyruguBosalt(b);
    return kayitli;
  }
  const yer = await hanYeri(b, hanAlani(govde));
  if (!yer.ok) return yer;
  if (masaNoCoz(girdi.deger.masa, yer.deger.masa) === undefined) return hata("masa_gecersiz");
  // Günlük tavan hesap başınadır: bütün hanlar aynı sayacı paylaşır (4.9).
  const sayac = gunlukSay(await b.depo.al<GunlukSayac>(EYLEM_SAYAC), b.simdi, HAN_EYLEM_GUNLUK);
  if (!sayac.izin) return hata("eylem_siniri");
  const ad = masaAdiYer(yer.deger, girdi.deger.masa);
  const sonuc = (await b.masaCagir(ad, { islem: "eylem", masa: ad, hesap: b.hesapId, girdi: girdi.deger })) as Sonuc<{ olay: MasaOlayi }>;
  if (!sonuc.ok) return sonuc;
  const yaz: Record<string, unknown> = { [anahtar]: sonuc, [EYLEM_SAYAC]: sayac.durum };
  if (b.hanOlayiGonder) {
    // H5: olay önce giden kutusuna yazılır (eylem kaydıyla birlikte), sonra teslim denenir; teslim edilemezse
    // sonraki eylemde yeniden denenir. Yerleşim anahtarla tekrar güvenlidir: ikinci teslim ikinci etki üretmez.
    const kuyruk = (await b.depo.al<HanOlayiBekleyen[]>(OLAY_KUYRUK)) ?? [];
    const olay = sonuc.deger.olay;
    const ogeAnahtari = `${olay.masa}#${olay.no}`;
    if (!kuyruk.some((k) => k.anahtar === ogeAnahtari)) kuyruk.push({ yerlesim: yer.deger.yerlesim, anahtar: ogeAnahtari, olay });
    yaz[OLAY_KUYRUK] = kuyruk.slice(-OLAY_KUYRUK_EN_COK);
  }
  await b.depo.koy(yaz);
  await olayKuyruguBosalt(b);
  return sonuc;
}

/**
 * H5 giden kutusu: bekleyen olayları sırayla yerleşime teslim eder. Ağ hatası (istisna) kuyruğu korur ve durur;
 * yerleşimin mantıksal reddi (`ok: false`) yeniden denemeyle düzelmeyeceği için öğeyi düşürür. Eylemi asla bozmaz.
 */
export async function olayKuyruguBosalt(b: Pick<HanHesapBaglami, "depo" | "hanOlayiGonder">): Promise<void> {
  if (!b.hanOlayiGonder) return;
  const kuyruk = (await b.depo.al<HanOlayiBekleyen[]>(OLAY_KUYRUK)) ?? [];
  if (kuyruk.length === 0) return;
  const teslim = new Set<string>();
  for (const k of kuyruk) {
    try {
      await b.hanOlayiGonder(k.yerlesim, { anahtar: k.anahtar, olay: k.olay });
      teslim.add(k.anahtar);
    } catch {
      break;
    }
  }
  if (teslim.size === 0) return;
  // Teslim sırasında yeni öğe eklenmiş olabilir: güncel kuyruk yeniden okunur.
  const kalan = ((await b.depo.al<HanOlayiBekleyen[]>(OLAY_KUYRUK)) ?? []).filter((k) => !teslim.has(k.anahtar));
  if (kalan.length) await b.depo.koy({ [OLAY_KUYRUK]: kalan });
  else await b.depo.sil([OLAY_KUYRUK]);
}

export interface IkramSonucu {
  ikram: string;
  fiyat: number;
  /** Verenin ödemeden sonraki parası (YerlesimDO'dan). */
  para: number;
  anons: MasaAnonsu;
}

/**
 * POST /v1/han/ikram: (1) masa kontrolü (veren oturuyor, alan masada, engel yok), (2) ödeme YerlesimDO'da,
 * (3) masaya anons. Fiyat yalnız sunucu menüsünden. istekNo ile tekrar güvenli (ödeme de istekNo'yu taşır).
 */
export function hanIkrami(b: HanHesapBaglami, govde: unknown): Promise<Sonuc<IkramSonucu>> {
  return sirayla(b.depo, () => hanIkramiSirada(b, govde));
}

async function hanIkramiSirada(b: HanHesapBaglami, govde: unknown): Promise<Sonuc<IkramSonucu>> {
  const girdi = ikramGirdisiCoz(govde);
  if (!girdi.ok) return girdi;
  const { hedef, ikram, istekNo } = girdi.deger;
  const anahtar = IKRAM_ISTEK + istekNo;
  const kayitli = await b.depo.al<Sonuc<IkramSonucu>>(anahtar);
  if (kayitli) return kayitli;
  if (hedef === b.hesapId) return hata("kendi_hedef");
  const yer = await hanYeri(b, hanAlani(govde));
  if (!yer.ok) return yer;
  if (masaNoCoz(girdi.deger.masa, yer.deger.masa) === undefined) return hata("masa_gecersiz");
  const sayac = gunlukSay(await b.depo.al<GunlukSayac>(IKRAM_SAYAC), b.simdi, IKRAM_GUNLUK);
  if (!sayac.izin) return hata("eylem_siniri");
  const ad = masaAdiYer(yer.deger, girdi.deger.masa);
  const kontrol = await b.masaCagir(ad, { islem: "ikramKontrol", masa: ad, hesap: b.hesapId, hedef });
  if (!kontrol.ok) return kontrol;
  const fiyat = IKRAM_MENUSU[ikram].fiyat;
  const odeme = await b.ikramOde({ islem: "hanIkram", yerlesim: yer.deger.yerlesim, hesapId: b.hesapId, govde: { hedef, ikram, fiyat, istekNo, han: yer.deger.han } });
  if (!odeme.ok) return odeme;
  const anons: MasaAnonsu = { tur: "ikram", kim: b.hesapId, hedef, oge: ikram, zaman: b.simdi };
  // Anons en iyi çabadır: ödeme yapıldıktan sonra masa yanıt vermese de sonuç kaydedilir (tekrar ikinci kez ödetmez).
  try {
    await b.masaCagir(ad, { islem: "anons", masa: ad, anons });
  } catch {
    // yut
  }
  const sonuc = basarili({ ikram, fiyat: odeme.deger.fiyat ?? fiyat, para: odeme.deger.para, anons });
  await b.depo.koy({ [anahtar]: sonuc, [IKRAM_SAYAC]: sayac.durum });
  return sonuc;
}

export interface ZiyafetSonucu {
  bedel: number;
  /** Verenin ödemeden sonraki parası (YerlesimDO'dan). */
  para: number;
  /** Yazılan cömertlik namı (mevsimde bir; aylık tavanlı; 0 olabilir). */
  nam: number;
  anons: MasaAnonsu;
}

/**
 * POST /v1/han/ziyafet (H7): (1) masa kontrolü (veren oturuyor, susturulmamış; oturanlar), (2) ödeme ve etki
 * YerlesimDO'da (konuk şartı, bedel, nam, tanıklık), (3) masaya anons. istekNo ile tekrar güvenli.
 */
export function hanZiyafeti(b: HanHesapBaglami, govde: unknown): Promise<Sonuc<ZiyafetSonucu>> {
  return sirayla(b.depo, () => hanZiyafetiSirada(b, govde));
}

async function hanZiyafetiSirada(b: HanHesapBaglami, govde: unknown): Promise<Sonuc<ZiyafetSonucu>> {
  const girdi = ziyafetGirdisiCoz(govde);
  if (!girdi.ok) return girdi;
  if (!b.ziyafetOde) return hata("gecersiz_istek");
  const anahtar = ZIYAFET_ISTEK + girdi.deger.istekNo;
  const kayitli = await b.depo.al<Sonuc<ZiyafetSonucu>>(anahtar);
  if (kayitli) return kayitli;
  const yer = await hanYeri(b, hanAlani(govde));
  if (!yer.ok) return yer;
  if (masaNoCoz(girdi.deger.masa, yer.deger.masa) === undefined) return hata("masa_gecersiz");
  const sayac = gunlukSay(await b.depo.al<GunlukSayac>(ZIYAFET_SAYAC), b.simdi, ZIYAFET_GUNLUK);
  if (!sayac.izin) return hata("eylem_siniri");
  const ad = masaAdiYer(yer.deger, girdi.deger.masa);
  const kontrol = await b.masaCagir(ad, { islem: "ziyafetKontrol", masa: ad, hesap: b.hesapId });
  if (!kontrol.ok) return kontrol;
  const oturanlar = (kontrol.deger as { oturanlar?: string[] }).oturanlar ?? [];
  const odeme = await b.ziyafetOde(yer.deger.yerlesim, { masa: ad, masaNo: girdi.deger.masa, oturanlar, istekNo: girdi.deger.istekNo, han: yer.deger.han });
  if (!odeme.ok) return odeme;
  const anons: MasaAnonsu = { tur: "ziyafet", kim: b.hesapId, oge: "ziyafet", zaman: b.simdi };
  try {
    await b.masaCagir(ad, { islem: "anons", masa: ad, anons });
  } catch {
    // anons en iyi çabadır: ödeme yapıldı, sonuç yine kaydedilir
  }
  const sonuc = basarili({ bedel: odeme.deger.bedel, para: odeme.deger.para, nam: odeme.deger.nam, anons });
  await b.depo.koy({ [anahtar]: sonuc, [ZIYAFET_SAYAC]: sayac.durum });
  return sonuc;
}

/**
 * POST /v1/han/pano (H10): günlük ilan sınırı hesap başına burada (silip yeniden asmak sınırı aşmaz); yazma
 * YerlesimDO'da istekNo ile tekrar güvenlidir. `yaz`: yerleşime iletir.
 */
export function hanPanoYaz(b: Pick<HanHesapBaglami, "depo" | "simdi">, govde: unknown, yaz: (govde: unknown) => Promise<Sonuc<unknown>>): Promise<Sonuc<unknown>> {
  return sirayla(b.depo, async () => {
    const g = panoGirdisiCoz(govde);
    if (!g.ok) return g;
    const anahtar = PANO_ISTEK + g.deger.istekNo;
    const kayitli = await b.depo.al<Sonuc<unknown>>(anahtar);
    if (kayitli) return kayitli;
    const sayac = gunlukSay(await b.depo.al<GunlukSayac>(PANO_SAYAC), b.simdi, PANO_GUNLUK);
    if (!sayac.izin) return hata("eylem_siniri");
    const r = await yaz(govde);
    if (r.ok) await b.depo.koy({ [anahtar]: r, [PANO_SAYAC]: sayac.durum });
    return r;
  });
}

/**
 * POST /v1/han/masa/:no/ses/<alt> (Faz 16): masa adı oyuncunun yerleşiminden çözülür, iş MasaDO'dadır
 * (yetki kapısı ve Realtime vekilliği). Hız sınırı ve uzaklaştırma engeli HesapDO'da bu çağrıdan önce uygulanır.
 */
export async function hanSesi(b: HanHesapBaglami, hamNo: unknown, alt: SesAlt, govde: unknown, hamHan?: unknown): Promise<Sonuc<unknown>> {
  const yer = await hanYeri(b, hamHan);
  if (!yer.ok) return yer;
  const no = masaNoCoz(hamNo, yer.deger.masa);
  if (no === undefined) return hata("masa_gecersiz");
  const ad = masaAdiYer(yer.deger, no);
  return b.masaCagir(ad, { islem: "ses", masa: ad, hesap: b.hesapId, alt, govde });
}

/** Y1 yaptırımı değişince: oyuncunun son masasına bildirir (susturma hemen etkili, uzaklaştırma bağlantıyı keser). */
export async function yaptirimiMasayaBildir(b: Pick<HanHesapBaglami, "depo" | "hesapId" | "masaCagir">, durum: HesapYaptirimi): Promise<void> {
  const masa = await b.depo.al<string>(SON_MASA);
  if (!masa) return;
  try {
    await b.masaCagir(masa, { islem: "yaptirim", masa, hesap: b.hesapId, durum });
  } catch {
    // en iyi çaba: bağlantı yeniden kurulurken bilet zaten güncel yaptırımı taşır
  }
}

/** Oyuncu engelleyince/kaldırınca: güncel iki yönlü listeyi son masasına bildirir (en iyi çaba). */
export async function engeliMasayaBildir(b: Pick<HanHesapBaglami, "depo" | "hesapId" | "masaCagir">, liste: string[]): Promise<void> {
  const masa = await b.depo.al<string>(SON_MASA);
  if (!masa) return;
  try {
    await b.masaCagir(masa, { islem: "engel", masa, hesap: b.hesapId, liste });
  } catch {
    // en iyi çaba: bir sonraki bağlanışta bilet güncel listeyi taşır
  }
}
