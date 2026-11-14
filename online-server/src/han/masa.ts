// Masa çekirdeği: koltuk, sıra, sohbet yayını, yerel sessize alma, masa başı yetkileri, rapor.
// Workers'a bağlı değildir: soketler `MasaSoketi` arayüzüyle gelir (DO'da hibernation WebSocket'i, testte sahte).
// Durum soket eklerindedir (bağlı olanlar gerçeğin kaynağıdır); sohbet metni hiçbir eke ya da depoya yazılmaz.
// Faz 16 ses: yayın kimlikleri de soket ekindedir; masadan çıkan, kalkan, susturulan ya da sesi kesilenin yayını
// `sesKapat` ile SFU'da hemen kapatılır (ses verisi buradan geçmez, kaydedilmez).

import { hata, type Basarisiz, type HataKodu, type Sonuc } from "../tipler.ts";
import { ACIKLAMA_EN_UZUN } from "../yonetim/sikayet.ts";
import { hesapIdCoz } from "../yonetim/yaptirim.ts";
import type { EngelSorgusu } from "./engel-kopru.ts";
import {
  AYAKTA_EN_COK,
  CERCEVE_EN_BUYUK,
  ILETI_PENCERESI_MS,
  ILETI_SINIRI,
  iletiMetniCoz,
  iletiSiniri,
  KAPANIS,
  KOLTUK_SAYISI,
  KOMUT_SINIRI,
  pencereSay,
  SESSIZ_EN_COK,
  surer,
  VARSAYILAN_AYAR,
} from "./kurallar.ts";
import { MASA_BASI_AYARLARI } from "./tipler.ts";
import type {
  IstemciIletisi,
  MasaAyari,
  MasaBileti,
  MasaGorunumu,
  MasaIcOzeti,
  MasaOlayi,
  Plaka,
  SesDurumu,
  SoketEki,
  SunucuIletisi,
} from "./tipler.ts";
import type { HesapYaptirimi } from "../tipler.ts";

export interface MasaSoketi {
  ek(): SoketEki | null;
  ekYaz(e: SoketEki): void;
  gonder(v: SunucuIletisi): void;
  kapat(kod: number, neden: string): void;
}

export interface MasaBaglami {
  masa: string;
  no: number;
  /** Bu anda bağlı soketler. */
  soketler: readonly MasaSoketi[];
  ayar: MasaAyari;
  /** H2: masa ayarını kalıcı yazar (DO bellekte hemen günceller, depoya yazımı işlem sonunda bekler). */
  ayarYaz(ayar: MasaAyari): void;
  simdi: number;
  engelliMi: EngelSorgusu;
  /** Y1 şikâyet kuyruğuna (HesapDO "sikayet" yolu, /v1/sikayet ile aynı kurallar). */
  rapor(kim: string, govde: Record<string, unknown>): Promise<Sonuc<unknown>>;
  /** Masa başının çıkarması: olay ve dönüş yasağı yazılır, Y1 kaydına düşer. */
  atma(kim: string, hedef: string, katilim: string[]): Promise<MasaOlayi>;
  /** Faz 16: sunucuda Realtime yapılandırılmış mı (yoksa ses kapalı). */
  sesYapilandi?: boolean;
  /** Faz 16: yayın izini SFU'da zorla kapatır (en iyi çaba; DO işlem sonunda bekler). */
  sesKapat?(oturum: string, mid: string): void;
}

export interface Kayit {
  soket: MasaSoketi;
  ek: SoketEki;
}

export function kayitlar(soketler: readonly MasaSoketi[]): Kayit[] {
  const r: Kayit[] = [];
  for (const soket of soketler) {
    const ek = soket.ek();
    if (ek && !ek.x) r.push({ soket, ek });
  }
  return r;
}

function plaka(ek: SoketEki): Plaka {
  return { hesap: ek.h, ad: ek.a, ...(ek.cf ? { cerceve: ek.cf } : {}), ...(ek.md ? { mudavim: true as const } : {}) };
}

/** Oturanlar koltuk sırasıyla. */
export function oturanlar(tum: readonly Kayit[]): { hesap: string; koltuk: number }[] {
  return tum
    .filter((r) => r.ek.k !== null)
    .map((r) => ({ hesap: r.ek.h, koltuk: r.ek.k as number }))
    .sort((a, b) => a.koltuk - b.koltuk);
}

/** Masa başı: en eski oturan (eşitlikte küçük koltuk). */
export function masaBasi(tum: readonly Kayit[]): string | null {
  let enIyi: SoketEki | undefined;
  for (const { ek } of tum) {
    if (ek.k === null) continue;
    if (!enIyi || (ek.o ?? 0) < (enIyi.o ?? 0) || ((ek.o ?? 0) === (enIyi.o ?? 0) && ek.k < (enIyi.k ?? 0))) enIyi = ek;
  }
  return enIyi?.h ?? null;
}

function siradakiler(tum: readonly Kayit[]): Kayit[] {
  return tum
    .filter((r) => r.ek.k === null && r.ek.s !== null)
    .sort((a, b) => (a.ek.s as number) - (b.ek.s as number) || (a.ek.h < b.ek.h ? -1 : 1));
}

export function gorunum(no: number, tum: readonly Kayit[], ayar: MasaAyari): MasaGorunumu {
  const koltuklar: (Plaka | null)[] = Array.from({ length: KOLTUK_SAYISI }, () => null);
  for (const { ek } of tum) if (ek.k !== null && ek.k < KOLTUK_SAYISI) koltuklar[ek.k] = plaka(ek);
  return {
    no,
    koltuklar,
    masaBasi: masaBasi(tum),
    sira: siradakiler(tum).map((r) => plaka(r.ek)),
    ayakta: tum.filter((r) => r.ek.k === null).length,
    ayar: { ...ayar },
  };
}

/** İç özet: `oturanlar` yalnız HesapDO'nun tanıdık sayımı içindir (istemciye yalnız sayı gider). */
export function ozet(no: number, tum: readonly Kayit[], ayar: MasaAyari): MasaIcOzeti {
  const oturanHesaplar = oturanlar(tum).map((o) => o.hesap);
  const oturan = oturanHesaplar.length;
  return { no, oturan, ayakta: tum.length - oturan, sira: siradakiler(tum).length, ayar: { ...ayar }, oturanlar: oturanHesaplar };
}

function yayinla(tum: readonly Kayit[], ileti: SunucuIletisi): void {
  for (const r of tum) r.soket.gonder(ileti);
}

function durumYayinla(b: MasaBaglami, tum: readonly Kayit[]): void {
  yayinla(tum, { t: "durum", masa: gorunum(b.no, tum, b.ayar) });
}

// ---------------------------------------------------------------- ses (Faz 16)

/** Masanın ses durumu: yayındakiler (yalnız oturanlar), konuşanlar, sesi kesilenler, söz isteyenler. */
export function sesDurumu(b: Pick<MasaBaglami, "ayar" | "sesYapilandi">, tum: readonly Kayit[]): SesDurumu {
  const acik = b.sesYapilandi === true && b.ayar.sesli;
  const yayinda = tum
    .filter((r) => r.ek.k !== null && r.ek.ses?.i)
    .sort((a, c) => (a.ek.k as number) - (c.ek.k as number));
  return {
    acik,
    ...(acik ? {} : { neden: b.sesYapilandi === true ? ("masa_sessiz" as const) : ("yapilandirilmadi" as const) }),
    yayin: yayinda.map((r) => ({ hesap: r.ek.h, iz: r.ek.ses?.i as string })),
    konusan: yayinda.filter((r) => r.ek.ses?.k).map((r) => r.ek.h),
    kapali: tum.filter((r) => r.ek.sm).map((r) => r.ek.h),
    soz: tum
      .filter((r) => r.ek.k === null && r.ek.si !== undefined)
      .sort((a, c) => (a.ek.si as number) - (c.ek.si as number))
      .map((r) => plaka(r.ek)),
  };
}

export function sesYayinla(b: MasaBaglami, tum: readonly Kayit[]): void {
  yayinla(tum, { t: "sesDurum", ses: sesDurumu(b, tum) });
}

/** Eki değiştirir (yazmaz): yayın varsa SFU'da kapatılır. Yayın vardıysa true. */
export function yayiniKes(b: Pick<MasaBaglami, "sesKapat">, ek: SoketEki): boolean {
  const s = ek.ses;
  if (!s?.i) return false;
  if (s.d) b.sesKapat?.(s.o, s.d);
  delete s.i;
  delete s.d;
  delete s.k;
  return true;
}

/** Ekte ses ile ilgili bir şey var mı (çıkınca sesDurum yayını gerekir). */
function sesliEk(ek: SoketEki): boolean {
  return Boolean(ek.ses?.i || ek.sm || ek.si !== undefined);
}

function hataGonder(soket: MasaSoketi, kod: HataKodu, istek?: string, bitis?: number | null): void {
  soket.gonder({ t: "hata", hata: kod, ...(istek ? { istek } : {}), ...(bitis !== undefined ? { bitis } : {}) });
}

/** Boşalan koltuğa sıranın başındakini oturtur (kilitli masada sıra ilerlemez). */
function siradanOturt(b: Pick<MasaBaglami, "ayar">, kalan: readonly Kayit[], koltuk: number, simdi: number): void {
  if (b.ayar.kilitli || kalan.some((r) => r.ek.k === koltuk)) return;
  const bas = siradakiler(kalan)[0];
  if (!bas) return;
  bas.ek.k = koltuk;
  bas.ek.o = simdi;
  bas.ek.s = null;
  bas.soket.ekYaz(bas.ek);
}

/** Verilen kayıtları masadan çıkarır (soketi kapatır), koltuklarını sıraya devreder, durumu yayınlar. */
function cikar(b: MasaBaglami, cikanlar: readonly Kayit[], kalan: readonly Kayit[], kod: number, neden: string): void {
  let ses = false;
  for (const r of cikanlar) {
    const koltuk = r.ek.k;
    if (sesliEk(r.ek)) ses = true;
    yayiniKes(b, r.ek);
    delete r.ek.ses;
    r.ek.x = 1;
    r.ek.k = null;
    r.ek.s = null;
    r.soket.ekYaz(r.ek);
    r.soket.kapat(kod, neden);
    if (koltuk !== null) siradanOturt(b, kalan, koltuk, b.simdi);
  }
  if (ayarSifirla(b, kalan)) ses = true;
  durumYayinla(b, kalan);
  if (ses) sesYayinla(b, kalan);
}

/** Kilit açıkken bütün boş koltuklara sıradakileri oturtur. */
function bosKoltuklariDoldur(b: Pick<MasaBaglami, "ayar" | "simdi">, tum: readonly Kayit[]): void {
  for (let i = 0; i < KOLTUK_SAYISI; i++) siradanOturt(b, tum, i, b.simdi);
}

/**
 * H2: son oturan da kalktıysa masa başı ayarları (kavga yasağı, kilit, sessizlik) varsayılana döner (boş masa kilitli
 * ya da sessiz kalamaz); hancının alanları (tür, açık) korunur. Ses durumu değiştiyse true.
 */
function ayarSifirla(b: Pick<MasaBaglami, "ayar" | "ayarYaz" | "simdi">, kalan: readonly Kayit[]): boolean {
  if (oturanlar(kalan).length > 0) return false;
  if (MASA_BASI_AYARLARI.every((a) => b.ayar[a] === VARSAYILAN_AYAR[a])) return false;
  const sesDegisti = b.ayar.sesli !== VARSAYILAN_AYAR.sesli;
  b.ayar = { ...b.ayar, kavgaYasak: VARSAYILAN_AYAR.kavgaYasak, kilitli: VARSAYILAN_AYAR.kilitli, sesli: VARSAYILAN_AYAR.sesli };
  b.ayarYaz(b.ayar);
  bosKoltuklariDoldur(b, kalan);
  return sesDegisti;
}

// ---------------------------------------------------------------- bağlantı

/** Bağlanmadan önce: uzaklaştırma, masa başının çıkarması, kapalı masa, kalabalık. */
export function baglanmaEngeli(
  b: Pick<MasaBaglami, "soketler" | "ayar" | "simdi">,
  bilet: MasaBileti,
  atmaBitis: number | undefined,
): Basarisiz | undefined {
  if (surer(bilet.yt.uzaklastirma, b.simdi)) return { ok: false, hata: "uzaklastirildi", bitis: bilet.yt.uzaklastirma.bitis };
  if (atmaBitis !== undefined && atmaBitis > b.simdi) return { ok: false, hata: "atildi", bitis: atmaBitis };
  if (!b.ayar.acik) return hata("masa_kapali");
  const digerleri = kayitlar(b.soketler).filter((r) => r.ek.h !== bilet.plaka.hesap);
  if (digerleri.length >= KOLTUK_SAYISI + AYAKTA_EN_COK) return hata("masa_kalabalik");
  return undefined;
}

/** Yeni bağlantı: aynı hesabın eski bağlantısı varsa koltuğu ve sessize alma listesi devralınır, eskisi kapanır. */
export function baglan(b: MasaBaglami, yeni: MasaSoketi, bilet: MasaBileti): void {
  const tum = kayitlar(b.soketler).filter((r) => r.soket !== yeni);
  const eski = tum.filter((r) => r.ek.h === bilet.plaka.hesap);
  const ek: SoketEki = { m: bilet.masa, no: bilet.no, h: bilet.plaka.hesap, a: bilet.plaka.ad, ...(bilet.plaka.cerceve ? { cf: bilet.plaka.cerceve } : {}), ...(bilet.plaka.mudavim ? { md: 1 as const } : {}), ...(bilet.ho !== undefined ? { ho: bilet.ho } : {}), k: null, o: null, s: null, sus: [], yt: bilet.yt };
  const once = eski[0];
  if (once) {
    ek.k = once.ek.k;
    ek.o = once.ek.o;
    ek.s = once.ek.s;
    ek.sus = once.ek.sus;
    if (once.ek.sm) ek.sm = 1;
    if (once.ek.si !== undefined) ek.si = once.ek.si;
  }
  let sesDegisti = false;
  for (const r of eski) {
    // Eski bağlantının yayını yeni bağlantıya geçmez (yeni WebRTC bağlantısı kurulur): SFU'da kapatılır.
    if (yayiniKes(b, r.ek)) sesDegisti = true;
    delete r.ek.ses;
    r.ek.x = 1;
    r.soket.ekYaz(r.ek);
    r.soket.kapat(KAPANIS.baskaBaglanti, "baska_baglanti");
  }
  yeni.ekYaz(ek);
  const digerleri = tum.filter((r) => r.ek.h !== ek.h);
  const hepsi = [...digerleri, { soket: yeni, ek }];
  const sus = surer(ek.yt.susturma, b.simdi) ? { bitis: ek.yt.susturma.bitis } : null;
  const masa = gorunum(b.no, hepsi, b.ayar);
  yeni.gonder({ t: "hosgeldin", ben: plaka(ek), susturma: sus, masa, ses: sesDurumu(b, hepsi) });
  yayinla(digerleri, { t: "durum", masa });
  if (sesDegisti) sesYayinla(b, digerleri);
}

/** Bağlantı kapandı (ya da hata verdi). */
export function ayril(b: MasaBaglami, giden: MasaSoketi): void {
  const ek = giden.ek();
  if (!ek || ek.x) return;
  const kalan = kayitlar(b.soketler).filter((r) => r.soket !== giden && r.ek.h !== ek.h);
  cikar(b, [{ soket: giden, ek }], kalan, 1000, "ayrildi");
}

/** Hesabın bu masadaki bağlantılarını kapatır (başka masaya geçti, uzaklaştırıldı). Bulunduysa true. */
export function hesabiCikar(b: MasaBaglami, hesap: string, kod: number, neden: string): boolean {
  const tum = kayitlar(b.soketler);
  const cikanlar = tum.filter((r) => r.ek.h === hesap);
  if (cikanlar.length === 0) return false;
  cikar(b, cikanlar, tum.filter((r) => r.ek.h !== hesap), kod, neden);
  return true;
}

/** Y1 yaptırımı bağlantı sürerken değişti: eke yazılır; uzaklaştırma bağlantıyı keser. */
export function yaptirimGuncelle(b: MasaBaglami, hesap: string, durum: HesapYaptirimi): void {
  const bulunan = kayitlar(b.soketler).filter((r) => r.ek.h === hesap);
  let ses = false;
  for (const r of bulunan) {
    r.ek.yt = durum;
    // Y1 susturması sesi de keser: yayın hemen kapanır.
    if (surer(durum.susturma, b.simdi) && yayiniKes(b, r.ek)) ses = true;
    r.soket.ekYaz(r.ek);
  }
  if (ses) sesYayinla(b, kayitlar(b.soketler));
  if (bulunan.length > 0 && surer(durum.uzaklastirma, b.simdi)) {
    hesabiCikar(b, hesap, KAPANIS.uzaklastirildi, "uzaklastirildi");
  }
}

// ---------------------------------------------------------------- istemci iletileri

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Kaynağın taze ekiyle birlikte bütün bağlı kayıtlar. */
function tumu(b: MasaBaglami, kaynak: MasaSoketi, ek: SoketEki): Kayit[] {
  return [...kayitlar(b.soketler).filter((r) => r.soket !== kaynak && r.ek.h !== ek.h), { soket: kaynak, ek }];
}

export async function iletiIsle(b: MasaBaglami, kaynak: MasaSoketi, ham: string | ArrayBuffer): Promise<void> {
  const ek = kaynak.ek();
  if (!ek || ek.x) return;
  if (typeof ham !== "string") return hataGonder(kaynak, "gecersiz_istek");
  if (ham.length > CERCEVE_EN_BUYUK) return hataGonder(kaynak, "govde_buyuk");
  const komut = pencereSay(ek.kz, b.simdi, KOMUT_SINIRI, ILETI_PENCERESI_MS);
  ek.kz = komut.durum;
  kaynak.ekYaz(ek);
  if (!komut.izin) return hataGonder(kaynak, "hiz_siniri");
  let v: unknown;
  try {
    v = JSON.parse(ham);
  } catch {
    return hataGonder(kaynak, "gecersiz_istek");
  }
  if (!nesneMi(v) || typeof v.t !== "string") return hataGonder(kaynak, "gecersiz_istek");
  const ileti = v as IstemciIletisi & Record<string, unknown>;
  const sonuc = await komutIsle(b, kaynak, ek, ileti);
  if (sonuc) hataGonder(kaynak, sonuc.hata, ileti.t, sonuc.bitis);
}

async function komutIsle(
  b: MasaBaglami,
  kaynak: MasaSoketi,
  ek: SoketEki,
  ileti: IstemciIletisi & Record<string, unknown>,
): Promise<Basarisiz | undefined> {
  switch (ileti.t) {
    case "otur":
      return otur(b, kaynak, ek, ileti.koltuk);
    case "kalk":
      return kalk(b, kaynak, ek);
    case "yaz":
      return yaz(b, kaynak, ek, ileti.metin);
    case "sustur":
    case "susturKaldir":
      return sessiz(kaynak, ek, ileti.hedef, ileti.t === "sustur");
    case "at":
      return at(b, kaynak, ek, ileti.hedef);
    case "oneAl":
      return oneAl(b, kaynak, ek, ileti.hedef);
    case "rapor":
      return rapor(b, kaynak, ek, ileti);
    case "konus":
      return konus(b, kaynak, ek, ileti.acik);
    case "sesKapat":
    case "sesAc":
      return sesKes(b, kaynak, ek, ileti.hedef, ileti.t === "sesKapat");
    case "sozIste":
    case "sozGeri":
      return sozIste(b, kaynak, ek, ileti.t === "sozIste");
    case "sozVer":
      return sozVer(b, kaynak, ek, ileti.hedef, ileti.kabul !== false);
    case "ayar":
      return ayarDegistir(b, kaynak, ek, ileti);
    default:
      return hata("gecersiz_istek");
  }
}

function otur(b: MasaBaglami, kaynak: MasaSoketi, ek: SoketEki, koltuk: unknown): Basarisiz | undefined {
  if (ek.k !== null) return hata("zaten_oturuyor");
  // H2: kilitli masada yeni kimse oturamaz ve sıraya giremez (ayakta dinleme sürer).
  if (b.ayar.kilitli) return hata("masa_kilitli");
  const tum = tumu(b, kaynak, ek);
  const dolu = new Set(oturanlar(tum).map((o) => o.koltuk));
  let secilen: number | undefined;
  if (koltuk !== undefined && koltuk !== null) {
    if (typeof koltuk !== "number" || !Number.isInteger(koltuk) || koltuk < 0 || koltuk >= KOLTUK_SAYISI) {
      return hata("gecersiz_istek");
    }
    if (dolu.has(koltuk)) return hata("koltuk_dolu");
    secilen = koltuk;
  } else {
    for (let i = 0; i < KOLTUK_SAYISI; i++) {
      if (!dolu.has(i)) {
        secilen = i;
        break;
      }
    }
  }
  if (secilen === undefined) {
    // Masa dolu: sıraya girer (ilk gelen ilk oturur; masa başı yalnız sırayı öne alabilir).
    if (ek.s === null) ek.s = b.simdi;
  } else {
    ek.k = secilen;
    ek.o = b.simdi;
    ek.s = null;
  }
  const soz = ek.k !== null && ek.si !== undefined;
  if (soz) delete ek.si;
  kaynak.ekYaz(ek);
  durumYayinla(b, tum);
  if (soz) sesYayinla(b, tum);
  return undefined;
}

function kalk(b: MasaBaglami, kaynak: MasaSoketi, ek: SoketEki): Basarisiz | undefined {
  const tum = tumu(b, kaynak, ek);
  if (ek.k !== null) {
    const koltuk = ek.k;
    ek.k = null;
    ek.o = null;
    // Ayakta yayın yok: kalkanın mikrofonu kapanır (dinlemeye devam eder).
    const ses = yayiniKes(b, ek);
    kaynak.ekYaz(ek);
    if (ses) sesYayinla(b, tum);
    siradanOturt(
      b,
      tum.filter((r) => r.soket !== kaynak),
      koltuk,
      b.simdi,
    );
  } else if (ek.s !== null) {
    ek.s = null;
    kaynak.ekYaz(ek);
  } else {
    return hata("oturmuyor");
  }
  const ses = ayarSifirla(b, tum);
  durumYayinla(b, tum);
  if (ses) sesYayinla(b, tum);
  return undefined;
}

async function yaz(b: MasaBaglami, kaynak: MasaSoketi, ek: SoketEki, ham: unknown): Promise<Basarisiz | undefined> {
  if (ek.k === null) return hata("oturmuyor");
  if (surer(ek.yt.susturma, b.simdi)) return { ok: false, hata: "susturuldu", bitis: ek.yt.susturma.bitis };
  const metin = iletiMetniCoz(ham, iletiSiniri(ek.ho, b.simdi));
  if (!metin.ok) return metin;
  const hiz = pencereSay(ek.hz, b.simdi, ILETI_SINIRI, ILETI_PENCERESI_MS);
  ek.hz = hiz.durum;
  kaynak.ekYaz(ek);
  if (!hiz.izin) return hata("hiz_siniri");
  const mesaj: SunucuIletisi = { t: "ileti", hesap: ek.h, ad: ek.a, koltuk: ek.k, metin: metin.deger, zaman: b.simdi };
  for (const r of tumu(b, kaynak, ek)) {
    if (r.ek.h !== ek.h) {
      if (r.ek.sus.includes(ek.h)) continue;
      if ((await b.engelliMi(r.ek.h, ek.h)) || (await b.engelliMi(ek.h, r.ek.h))) continue;
    }
    r.soket.gonder(mesaj);
  }
  return undefined;
}

function sessiz(kaynak: MasaSoketi, ek: SoketEki, ham: unknown, ekle: boolean): Basarisiz | undefined {
  const hedef = hesapIdCoz(ham);
  if (!hedef) return hata("gecersiz_istek");
  if (hedef === ek.h) return hata("kendi_hedef");
  const liste = ek.sus.filter((h) => h !== hedef);
  if (ekle) liste.push(hedef);
  ek.sus = liste.slice(-SESSIZ_EN_COK);
  kaynak.ekYaz(ek);
  kaynak.gonder({ t: "sessiz", liste: [...ek.sus] });
  return undefined;
}

async function at(b: MasaBaglami, kaynak: MasaSoketi, ek: SoketEki, ham: unknown): Promise<Basarisiz | undefined> {
  const tum = tumu(b, kaynak, ek);
  if (masaBasi(tum) !== ek.h) return hata("yetki_yok");
  const hedef = hesapIdCoz(ham);
  if (!hedef) return hata("gecersiz_istek");
  if (hedef === ek.h) return hata("kendi_hedef");
  if (!tum.some((r) => r.ek.h === hedef)) return hata("hedef_masada_degil");
  const olay = await b.atma(
    ek.h,
    hedef,
    oturanlar(tum).map((o) => o.hesap),
  );
  // Bekleme sırasında durum değişmiş olabilir: ekler yeniden okunur.
  const taze = kayitlar(b.soketler);
  const kalan = taze.filter((r) => r.ek.h !== hedef);
  yayinla(kalan, { t: "olay", olay });
  cikar(
    b,
    taze.filter((r) => r.ek.h === hedef),
    kalan,
    KAPANIS.atildi,
    "atildi",
  );
  return undefined;
}

function oneAl(b: MasaBaglami, kaynak: MasaSoketi, ek: SoketEki, ham: unknown): Basarisiz | undefined {
  const tum = tumu(b, kaynak, ek);
  if (masaBasi(tum) !== ek.h) return hata("yetki_yok");
  const hedef = hesapIdCoz(ham);
  const sira = siradakiler(tum);
  const kayit = sira.find((r) => r.ek.h === hedef);
  if (!kayit) return hata("hedef_masada_degil");
  kayit.ek.s = Math.min(...sira.map((r) => r.ek.s as number)) - 1;
  kayit.soket.ekYaz(kayit.ek);
  durumYayinla(b, tum);
  return undefined;
}

async function rapor(
  b: MasaBaglami,
  kaynak: MasaSoketi,
  ek: SoketEki,
  ileti: Record<string, unknown>,
): Promise<Basarisiz | undefined> {
  const hedef = hesapIdCoz(ileti.hedef);
  if (!hedef) return hata("kisi_yok");
  if (hedef === ek.h) return hata("kendini_sikayet");
  if (!tumu(b, kaynak, ek).some((r) => r.ek.h === hedef)) return hata("hedef_masada_degil");
  const ekMetin = typeof ileti.aciklama === "string" ? ileti.aciklama : "";
  const aciklama = [...`[${b.masa}] ${ekMetin}`].slice(0, ACIKLAMA_EN_UZUN).join("");
  const sonuc = await b.rapor(ek.h, { hedef, neden: ileti.neden, aciklama, istekNo: ileti.istekNo });
  if (!sonuc.ok) return sonuc;
  kaynak.gonder({ t: "rapor", sonuc: sonuc.deger });
  return undefined;
}

// ---------------------------------------------------------------- ses komutları (Faz 16)

/** Konuşma göstergesi: yalnız yayındaki kendi durumunu bildirir; değişince yayınlanır. */
function konus(b: MasaBaglami, kaynak: MasaSoketi, ek: SoketEki, acik: unknown): Basarisiz | undefined {
  if (typeof acik !== "boolean") return hata("gecersiz_istek");
  if (!ek.ses?.i) return hata("ses_oturumu_yok");
  if (Boolean(ek.ses.k) === acik) return undefined;
  if (acik) ek.ses.k = 1;
  else delete ek.ses.k;
  kaynak.ekYaz(ek);
  sesYayinla(b, tumu(b, kaynak, ek));
  return undefined;
}

/** Masa başı birinin sesini keser (yayını hemen kapanır) ya da geri açar. Metin sohbetine dokunmaz. */
function sesKes(b: MasaBaglami, kaynak: MasaSoketi, ek: SoketEki, ham: unknown, kes: boolean): Basarisiz | undefined {
  const tum = tumu(b, kaynak, ek);
  if (masaBasi(tum) !== ek.h) return hata("yetki_yok");
  const hedef = hesapIdCoz(ham);
  if (!hedef) return hata("gecersiz_istek");
  if (hedef === ek.h) return hata("kendi_hedef");
  const kayit = tum.find((r) => r.ek.h === hedef);
  if (!kayit) return hata("hedef_masada_degil");
  if (kes) {
    kayit.ek.sm = 1;
    yayiniKes(b, kayit.ek);
  } else {
    delete kayit.ek.sm;
  }
  kayit.soket.ekYaz(kayit.ek);
  sesYayinla(b, tum);
  return undefined;
}

/** Ayaktaki dinleyen söz ister (ya da isteğini geri alır); masa başı `sozVer` ile koltuğa alır. */
function sozIste(b: MasaBaglami, kaynak: MasaSoketi, ek: SoketEki, iste: boolean): Basarisiz | undefined {
  if (iste) {
    if (ek.k !== null) return hata("zaten_oturuyor");
    if (ek.si !== undefined) return undefined;
    ek.si = b.simdi;
  } else {
    if (ek.si === undefined) return hata("soz_istegi_yok");
    delete ek.si;
  }
  kaynak.ekYaz(ek);
  sesYayinla(b, tumu(b, kaynak, ek));
  return undefined;
}

/** Masa başı söz isteğini kabul eder (boş koltuğa oturtur) ya da reddeder. */
function sozVer(b: MasaBaglami, kaynak: MasaSoketi, ek: SoketEki, ham: unknown, kabul: boolean): Basarisiz | undefined {
  const tum = tumu(b, kaynak, ek);
  if (masaBasi(tum) !== ek.h) return hata("yetki_yok");
  const hedef = hesapIdCoz(ham);
  const kayit = tum.find((r) => r.ek.h === hedef);
  if (!kayit) return hata("hedef_masada_degil");
  if (kayit.ek.si === undefined || kayit.ek.k !== null) return hata("soz_istegi_yok");
  if (kabul) {
    const dolu = new Set(oturanlar(tum).map((o) => o.koltuk));
    let bos: number | undefined;
    for (let i = 0; i < KOLTUK_SAYISI && bos === undefined; i++) if (!dolu.has(i)) bos = i;
    if (bos === undefined) return hata("koltuk_dolu");
    kayit.ek.k = bos;
    kayit.ek.o = b.simdi;
    kayit.ek.s = null;
  }
  delete kayit.ek.si;
  kayit.soket.ekYaz(kayit.ek);
  if (kabul) durumYayinla(b, tum);
  sesYayinla(b, tum);
  return undefined;
}

// ---------------------------------------------------------------- masa ayarı (H2)

/**
 * Masa başı ayarı: kavga yasağı, kilit, sessiz masa. Başkası `yetki_yok` alır. Sessiz yapılınca açık yayınlar SFU'da
 * kapanır; kilit açılınca boş koltuklara sıradakiler oturur. Değişiklik herkese `durum` (ses değiştiyse `sesDurum`)
 * olarak yayınlanır. Genel komut hız sınırı `iletiIsle`'de uygulanmıştır.
 */
function ayarDegistir(b: MasaBaglami, kaynak: MasaSoketi, ek: SoketEki, ileti: Record<string, unknown>): Basarisiz | undefined {
  const tum = tumu(b, kaynak, ek);
  if (masaBasi(tum) !== ek.h) return hata("yetki_yok");
  const degisen: Partial<Pick<MasaAyari, (typeof MASA_BASI_AYARLARI)[number]>> = {};
  for (const a of MASA_BASI_AYARLARI) {
    const v = ileti[a];
    if (v === undefined) continue;
    if (typeof v !== "boolean") return hata("gecersiz_istek");
    degisen[a] = v;
  }
  if (Object.keys(degisen).length === 0) return hata("gecersiz_istek");
  const eski = b.ayar;
  const yeni: MasaAyari = { ...eski, ...degisen };
  if (MASA_BASI_AYARLARI.every((a) => eski[a] === yeni[a])) return undefined;
  b.ayar = yeni;
  b.ayarYaz(yeni);
  const sesDegisti = eski.sesli !== yeni.sesli;
  if (!yeni.sesli) {
    for (const r of tum) if (yayiniKes(b, r.ek)) r.soket.ekYaz(r.ek);
  }
  if (eski.kilitli && !yeni.kilitli) bosKoltuklariDoldur(b, tum);
  durumYayinla(b, tum);
  if (sesDegisti) sesYayinla(b, tum);
  return undefined;
}
