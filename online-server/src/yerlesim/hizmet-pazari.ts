// E4.3: öğrenilmiş hizmeti süreli stoğa hazırlar; ilan, satın alma, teslim ve bozulma akışını yönetir.
import type { MalId } from "../icerik/mallar.ts";
import { acikEtkiler, aracArtisi, hakAcik, hizmetAcik, sinerjilerAcik } from "./beceri-etki.ts";
import { esyaAilesi } from "./esya.ts";
import { aracAsindir, type Asinma } from "./tarif.ts";
import { esyaKilidi } from "./kalite.ts";
import { envanterEkle } from "./npc-taban.ts";
import { halAl, halDegistir, type Hal } from "./hal.ts";
import { hizmetEkle } from "./meslek.ts";
import { ayniKume } from "./teveccuh.ts";
import { takatHarca } from "./karakter.ts";
import { hizmetTarifiBul, type HizmetTarifi } from "./hizmet-tarif.ts";
import { ekonomiAl, type EkonomiKaydi, type HizmetIlan, type HizmetStogu, type HizmetNpcTalebi } from "./pazar-tahta.ts";
import { hanedanKasabasi, olduMu } from "./hanedan.ts";
import { npcKimlik, npcRef, oyuncuRef } from "./ortak.ts";
import type { Karakter, Kasaba, Npc, OlayTaslagi } from "./tipler.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";

/** [PARAMETRE] Tek hazırlamada en çok 5, oyuncu/hizmet başına süresi geçmemiş stokta en çok 20 adet. */
export const HIZMET_HAZIR_ADET_EN_COK = 5;
export const HIZMET_STOK_EN_COK = 20;

/** Hizmet düğümü ve varsa tarifte tanımlı çapraz meslek sinerjisi birlikte aranır. */
export function hizmetYetkiliMi(kar: Karakter, tarif: HizmetTarifi): boolean {
  const acarlar = [...(tarif.acar ? [tarif.acar] : []), ...(tarif.acars ?? [])];
  return hizmetAcik(kar, tarif.id) && sinerjilerAcik(kar, acarlar);
}

/** [PARAMETRE] Hizmet kalitesi (kalite etkileri toplamı, yüzde) üst sınırı. */
export const HIZMET_KALITE_TAVAN = 60;
/** [PARAMETRE] `kirginTaban`: dertleşmede alıcının gönlü bu değerin altındaysa en az buraya çıkar. */
export const KIRGIN_GONUL_TABANI = 35;

export interface HizmetKalitesi {
  /** Tavanlı yüzde ve kalemler (kanca, yüzde; gizli sayı yok). */
  yuzde: number;
  tavan: number;
  kalemler: { kanca: string; d: number }[];
}

/**
 * Kanca partisi 2: hizmetin kalitesi = hedefi hizmet kimliği ya da grubu olan öğrenilmiş `kalite` etkilerinin toplamı,
 * HIZMET_KALITE_TAVAN ile kırpılır. Hal etkisine yüzde olarak eklenir (yukarı yuvarlanır: her kalite hissedilir).
 */
export function hizmetKalitesi(kar: Karakter, tarif: HizmetTarifi): HizmetKalitesi {
  const hedefler = new Set([tarif.id, ...(tarif.grup ?? [])]);
  const kalemler: { kanca: string; d: number }[] = [];
  let toplam = 0;
  for (const e of acikEtkiler(kar)) {
    if (e.tur !== "kalite" || !hedefler.has(e.hedef)) continue;
    toplam += e.yuzde;
    const x = kalemler.find((y) => y.kanca === `kalite:${e.hedef}`);
    if (x) x.d += e.yuzde;
    else kalemler.push({ kanca: `kalite:${e.hedef}`, d: e.yuzde });
  }
  return { yuzde: Math.min(HIZMET_KALITE_TAVAN, toplam), tavan: HIZMET_KALITE_TAVAN, kalemler };
}

/** Hizmetin araç eki: tarifin araç hedefine bağlı `arac` etkisi açıksa ve araç envanterdeyse adet başına ek. */
export function hizmetAracEki(kar: Karakter, tarif: HizmetTarifi): { mal: MalId; ek: number } | null {
  if (!tarif.arac) return null;
  const e = aracArtisi(kar, tarif.arac.hedef);
  if (!e || (kar.ev?.[e.mal] ?? 0) < 1) return null;
  return { mal: e.mal as MalId, ek: e.arti * tarif.arac.birim };
}

/** Kalite ve araç ekiyle bir hal etkisinin adet başına değeri (ilk hal etkisi araç ekini alır). */
export function hizmetEtkiDegeri(deger: number, q: number, a: number): number {
  const ham = deger + a;
  return q > 0 ? ham + Math.ceil((ham * q) / 100) : ham;
}

export interface HizmetHazirlamaSonucu {
  stok: HizmetStogu;
  harcanan: { girdiler: Partial<Record<string, number>>; takat: number };
  /** Kanca partisi 2: hizmet kalitesi dökümü ve kullanılan araç (yoksa null). */
  kalite: HizmetKalitesi;
  arac: (Asinma & { ek: number }) | null;
}

/** Hazırlanmış hizmet üretir. Bütün kontroller harcamadan önce yapılır. */
export function hizmetHazirla(
  ek: EkonomiKaydi,
  kar: Karakter,
  hizmetHam: unknown,
  adetHam: unknown,
  ay: number,
): Sonuc<HizmetHazirlamaSonucu> {
  const tarif: HizmetTarifi | undefined = hizmetTarifiBul(hizmetHam);
  if (!tarif) return hata("tarif_gecersiz");
  if (!Number.isInteger(adetHam) || (adetHam as number) < 1 || (adetHam as number) > HIZMET_HAZIR_ADET_EN_COK)
    return hata("gecersiz_istek");
  const adet = adetHam as number;
  if (!hizmetYetkiliMi(kar, tarif)) return hata("dugum_kapali");

  const stoklar = (ek.hs ??= []);
  const eldeki = stoklar
    .filter((x) => x.o === kar.o && x.h === tarif.id && x.sa >= ay)
    .reduce((toplam, x) => toplam + x.n, 0);
  const buAyHazirlanan = stoklar
    .filter((x) => x.o === kar.o && x.h === tarif.id && x.ac === ay)
    .reduce((toplam, x) => toplam + (x.n0 ?? x.n), 0);
  if (buAyHazirlanan + adet > tarif.aylikTavan) return hata("kota_doldu");
  if (eldeki + adet > HIZMET_STOK_EN_COK) return hata("kota_doldu");

  const girdiler: Record<string, number> = {};
  for (const [mal, birim] of Object.entries(tarif.girdi)) {
    const gereken = (birim ?? 0) * adet;
    if ((kar.ev?.[mal] ?? 0) < gereken) return hata("girdi_yok");
    if (gereken > 0) girdiler[mal] = gereken;
  }
  const kilit = esyaKilidi(kar, girdiler);
  if (kilit) return hata(kilit);
  const takat = tarif.takat * adet;
  // Takat denetimi girdiler tüketilmeden yapılır; takatHarca başarısızsa mal kaybı olmaz.
  if (!takatHarca(kar, ay, takat)) return hata("takat_yok");
  for (const [mal, miktar] of Object.entries(girdiler)) envanterEkle(kar, mal as MalId, -miktar);

  const kalite = hizmetKalitesi(kar, tarif);
  const ae = hizmetAracEki(kar, tarif);
  // Araç hazırlama başına bir kullanım aşınır (tarifteki gibi: bir yapım, bir aşınma).
  const arac = ae ? { ...aracAsindir(kar, ae.mal), ek: ae.ek } : null;
  const stok: HizmetStogu = {
    i: ek.n++, o: kar.o, oa: kar.ad, h: tarif.id, n: adet, n0: adet, ac: ay, sa: ay + tarif.hazir.gecerlilikAy,
    ...(kalite.yuzde > 0 ? { q: kalite.yuzde } : {}),
    ...(ae ? { a: ae.ek } : {}),
  };
  stoklar.push(stok);
  return basarili({ stok, harcanan: { girdiler, takat }, kalite, arac });
}

/** Süresi dolan stok ekranda/işlemde kullanılamaz; ay dönümünde tecrübesi verilip budanır (hizmetKayitBuda). */
export function hizmetStoguGecerli(stok: HizmetStogu, ay: number): boolean {
  return stok.n > 0 && stok.sa >= ay;
}

/** [PARAMETRE] Kapanmış (satıldı, geri çekildi, düştü) ilan kayıtları son kullanma ayından sonra bu kadar ay saklanır. */
export const HIZMET_KAPALI_ILAN_SAKLAMA_AY = 6;

/**
 * Ekonomi kaydı yerleşim DO'sunda tek değer olarak durduğu için bitmiş hizmet kayıtları silinir.
 * Süresi dolmuş stok (adedi sıfırlanmış, tecrübesi verilmiş) ve eski kapalı ilanlar budanır;
 * açık ilanlara, geçerli stoğa ve aylık hazırlama kotası için içinde bulunulan ayın kayıtlarına dokunulmaz.
 */
export function hizmetKayitBuda(ek: EkonomiKaydi, ay: number): void {
  if (ek.hs) ek.hs = ek.hs.filter((x) => x.sa >= ay);
  if (ek.hi) ek.hi = ek.hi.filter((x) => x.d === "acik" || x.sa >= ay - HIZMET_KAPALI_ILAN_SAKLAMA_AY);
}

/**
 * Ay dönümünde süresi dolan hizmet stoğunu bozar. Hazır stok veya açık ilandaki
 * satılmamış adet başına yarım hizmet tecrübesi verilir; kayıt sıfırlanarak
 * sonraki dönümlerde aynı stoktan tekrar ödül alınması engellenir.
 *
 * Motor ay dönümünden önce bütün sakin karakterlerini yüklediği için satıcı
 * çevrimdışı olsa da kalıcı karakter kaydı üzerinden tecrübe yazılır.
 */
export function hizmetStokDonumu(kasaba: Kasaba, ay: number): void {
  const ek = kasaba.ek;
  if (!ek) return;

  for (const stok of ek.hs ?? []) {
    if (stok.n <= 0 || stok.sa >= ay) continue;
    const tarif = hizmetTarifiBul(stok.h);
    const satici = kasaba.kar.get(stok.o);
    if (tarif && satici) hizmetEkle(satici, tarif.meslek, stok.n / 2);
    stok.n = 0;
  }

  for (const ilan of ek.hi ?? []) {
    if (ilan.d !== "acik" || ilan.n <= 0 || ilan.sa >= ay) continue;
    const tarif = hizmetTarifiBul(ilan.h);
    const satici = kasaba.kar.get(ilan.o);
    if (tarif && satici) hizmetEkle(satici, tarif.meslek, ilan.n / 2);
    ilan.n = 0;
    ilan.d = "dustu";
  }

  // NPC talebi süresi dolduysa veya hedef NPC artık yaşamıyorsa rezerve hazine ödülü iade edilir.
  for (const talep of ek.hn ?? []) {
    if (talep.d !== "acik") continue;
    const eslesme = /^n([1-9][0-9]{0,8})$/.exec(talep.hedef);
    const hedefVar = !!eslesme && kasaba.dizin.has(Number(eslesme[1]));
    if (talep.sa >= ay && hedefVar) continue;
    talep.d = "dustu";
    hanedanKasabasi(kasaba).hz += talep.odul;
  }

  hizmetKayitBuda(ek, ay);
}

export function hizmetStoguGorunumu(stok: HizmetStogu, ay: number) {
  const tarif = hizmetTarifiBul(stok.h);
  return {
    id: `h${stok.i}`,
    hizmet: stok.h,
    ad: stok.oa,
    adet: stok.n,
    hazirlandigiAy: stok.ac,
    sonAy: stok.sa,
    kalanAy: Math.max(0, stok.sa - ay),
    fiyatTaban: tarif?.fiyatTaban ?? null,
    kalite: stok.q ?? 0,
    aracEki: stok.a ?? 0,
    etki: tarif ? etkiOnizleme(tarif, stok.q ?? 0, stok.a ?? 0) : [],
  };
}

/** Alıcıya uygulanacak gerçek etki (adet başına; kalite ve araç eki dahil). Gizli sayı yok. */
export function etkiOnizleme(tarif: HizmetTarifi, q: number, a: number) {
  let ilkHal = true;
  return tarif.etki.map((e) => {
    if (e.tur !== "hal") return { ...e };
    const deger = hizmetEtkiDegeri(e.deger, q, ilkHal ? a : 0);
    ilkHal = false;
    return { tur: e.tur, alan: e.alan, deger, taban: e.deger };
  });
}


/** [PARAMETRE] Oyuncu başına en çok 5 açık hizmet ilanı; alımda tek istekte en çok 5 adet. */
export const HIZMET_ILAN_EN_COK = 5;
export const HIZMET_ALIM_ADET_EN_COK = 5;

export function hizmetIlanKimlik(i: number): string {
  return `hi${i}`;
}

export function hizmetIlanBul(ek: EkonomiKaydi | undefined, id: unknown): HizmetIlan | undefined {
  if (typeof id !== "string") return undefined;
  const eslesme = /^hi(\d+)$/.exec(id);
  if (!eslesme) return undefined;
  return ek?.hi?.find((x) => x.i === Number(eslesme[1]));
}

export function hizmetIlanlar(ek: EkonomiKaydi | undefined, ay: number): HizmetIlan[] {
  return (ek?.hi ?? []).filter((x) => x.d === "acik" && x.sa >= ay && x.n > 0);
}

export function hizmetIlanGorunumu(ilan: HizmetIlan, benim: string, ay: number) {
  const tarif = hizmetTarifiBul(ilan.h);
  return {
    id: hizmetIlanKimlik(ilan.i),
    hizmet: ilan.h,
    ad: ilan.oa,
    adet: ilan.n,
    birimFiyat: ilan.f,
    toplamFiyat: ilan.f * ilan.n,
    acilisAy: ilan.ac,
    sonAy: ilan.sa,
    kalanAy: Math.max(0, ilan.sa - ay),
    benim: ilan.o === benim,
    fiyatTaban: tarif?.fiyatTaban ?? null,
    kalite: ilan.q ?? 0,
    aracEki: ilan.a ?? 0,
    etki: tarif ? etkiOnizleme(tarif, ilan.q ?? 0, ilan.a ?? 0) : [],
  };
}

/** Hazır stoğun bir kısmını süresi dolmadan hizmet ilanına taşır. */
export function hizmetIlanAc(
  ek: EkonomiKaydi,
  satici: Karakter,
  stokHam: unknown,
  adetHam: unknown,
  fiyatHam: unknown,
  ay: number,
): Sonuc<HizmetIlan> {
  if (typeof stokHam !== "string") return hata("ilan_gecersiz");
  const eslesme = /^h(\d+)$/.exec(stokHam);
  if (!eslesme) return hata("ilan_gecersiz");
  const stok = ek.hs?.find((x) => x.i === Number(eslesme[1]) && x.o === satici.o);
  if (!stok || !hizmetStoguGecerli(stok, ay)) return hata("stok_yok");
  if (!Number.isInteger(adetHam) || (adetHam as number) < 1 || (adetHam as number) > stok.n)
    return hata("ilan_gecersiz");
  const tarif = hizmetTarifiBul(stok.h);
  if (!tarif) return hata("tarif_gecersiz");
  const alt = Math.max(1, Math.floor(tarif.fiyatTaban * 0.5));
  const ust = Math.max(alt, Math.ceil(tarif.fiyatTaban * 3));
  if (!Number.isInteger(fiyatHam) || (fiyatHam as number) < alt || (fiyatHam as number) > ust)
    return hata("ilan_gecersiz");
  const acik = (ek.hi ??= []).filter((x) => x.o === satici.o && x.d === "acik" && x.sa >= ay);
  if (acik.length >= HIZMET_ILAN_EN_COK) return hata("ilan_siniri");

  const adet = adetHam as number;
  stok.n -= adet;
  const ilan: HizmetIlan = {
    i: ek.n++, o: satici.o, oa: satici.ad, h: stok.h, s: stok.i,
    n: adet, n0: adet, f: fiyatHam as number, ac: ay, sa: stok.sa, d: "acik",
    ...(stok.q ? { q: stok.q } : {}),
    ...(stok.a ? { a: stok.a } : {}),
  };
  ek.hi.push(ilan);
  return basarili(ilan);
}

/** İlanı kapatır; yalnız süresi dolmamış kalan stoğu sahibine geri verir. */
export function hizmetIlanGeri(
  ek: EkonomiKaydi,
  satici: Karakter,
  id: unknown,
  ay: number,
): Sonuc<{ ilan: HizmetIlan; iade: number }> {
  const ilan = hizmetIlanBul(ek, id);
  if (!ilan) return hata("ilan_yok");
  if (ilan.o !== satici.o) return hata("ilan_gecersiz");
  if (ilan.d !== "acik" || ilan.sa < ay) return hata("ilan_kapandi");
  const iade = ilan.n;
  const stok = ek.hs?.find((x) => x.i === ilan.s && x.o === satici.o);
  if (stok && stok.sa >= ay) stok.n += iade;
  ilan.n = 0;
  ilan.d = "geri";
  return basarili({ ilan, iade: stok && stok.sa >= ay ? iade : 0 });
}

/** Satın alma: alıcı ödemesi, satıcı geliri, hizmet etkisi ve satıcı tecrübesi tek ekonomi yazımında gerçekleşir. */
export function hizmetIlanIsle(
  ek: EkonomiKaydi,
  alici: Karakter,
  satici: Karakter | undefined,
  id: unknown,
  adetHam: unknown,
  ay: number,
): Sonuc<{ ilan: HizmetIlan; adet: number; tutar: number; etki: Partial<Hal>; hizmetPuani: number; odul: number; onarim: Record<string, number> | null; isleme: Record<string, number> | null }> {
  const ilan = hizmetIlanBul(ek, id);
  if (!ilan) return hata("ilan_yok");
  if (ilan.d !== "acik" || ilan.sa < ay || ilan.n < 1) return hata("ilan_kapandi");
  if (!satici || satici.o !== ilan.o) return hata("ilan_kapandi");
  if (satici.o === alici.o) return hata("ilan_gecersiz");
  if (!Number.isInteger(adetHam) || (adetHam as number) < 1 || (adetHam as number) > HIZMET_ALIM_ADET_EN_COK || (adetHam as number) > ilan.n)
    return hata("ilan_gecersiz");
  const tarif = hizmetTarifiBul(ilan.h);
  if (!tarif) return hata("tarif_gecersiz");
  if (tarif.hedef !== "kisi") return hata("hedef_uygun_degil");

  const adet = adetHam as number;
  const fark: Partial<Hal> = {};
  const q = ilan.q ?? 0;
  const a = ilan.a ?? 0;
  let ilkHal = true;
  const onarim: { aile: string; deger: number }[] = [];
  const isleme: { girdi: MalId; girdiAdet: number; cikti: MalId; adet: number }[] = [];
  for (const etki of tarif.etki) {
    if (etki.tur === "onarim") {
      onarim.push({ aile: etki.alan, deger: etki.deger * adet });
      continue;
    }
    if (etki.tur === "isleme") {
      if ((alici.ev?.[etki.girdi] ?? 0) < etki.girdiAdet * adet) return hata("girdi_yok");
      isleme.push({ girdi: etki.girdi, girdiAdet: etki.girdiAdet * adet, cikti: etki.alan, adet: etki.deger * adet });
      continue;
    }
    if (etki.tur !== "hal" || !["can", "kondisyon", "gonul"].includes(etki.alan))
      return hata("hedef_uygun_degil");
    const alan = etki.alan as keyof Hal;
    fark[alan] = (fark[alan] ?? 0) + hizmetEtkiDegeri(etki.deger, q, ilkHal ? a : 0) * adet;
    ilkHal = false;
  }
  // Onarım: alıcının o ailedeki aşınmış araçları (yoksa hizmet boşa gitmesin diye satış reddedilir).
  const asinmis = onarim.length
    ? Object.entries(alici.as ?? {}).filter(([m, n]) => (n ?? 0) > 0 && onarim.some((o) => o.aile === esyaAilesi(m)))
    : [];
  if (onarim.length && asinmis.length === 0) return hata("hedef_uygun_degil");
  if (isleme.length) {
    const kilit = esyaKilidi(alici, Object.fromEntries(isleme.map((x) => [x.girdi, x.girdiAdet])));
    if (kilit) return hata(kilit);
  }
  // Kırgın gönle taban (dertleşme, hizmetçinin `kirginTaban` hakkı): gönül tabanın altındaysa en az tabana çıkar.
  if (tarif.id === "dertlesme" && hakAcik(satici, "kirginTaban")) {
    const simdi = halAl(alici, ay).gonul;
    if (simdi + (fark.gonul ?? 0) < KIRGIN_GONUL_TABANI) fark.gonul = KIRGIN_GONUL_TABANI - simdi;
  }
  const tutar = ilan.f * adet;
  if (alici.pa < tutar) return hata("para_yok");

  alici.pa -= tutar;
  satici.pa += tutar;
  const etki = halDegistir(alici, ay, fark, `hizmet.${tarif.id}`);
  let onarimSonucu: Record<string, number> | null = null;
  let islemeSonucu: Record<string, number> | null = null;
  if (onarim.length) {
    const geri: Record<string, number> = {};
    for (const [m, n] of asinmis) {
      const o = onarim.find((x) => x.aile === esyaAilesi(m))!;
      const d = Math.min(n ?? 0, o.deger);
      alici.as![m] = (n ?? 0) - d;
      if (alici.as![m] === 0) delete alici.as![m];
      geri[m] = d;
    }
    onarimSonucu = geri;
  }
  if (isleme.length) {
    const cikan: Record<string, number> = {};
    for (const x of isleme) {
      envanterEkle(alici, x.girdi, -x.girdiAdet);
      envanterEkle(alici, x.cikti, x.adet);
      cikan[x.cikti] = (cikan[x.cikti] ?? 0) + x.adet;
    }
    islemeSonucu = cikan;
  }
  // Aynı hizmetçi → aynı alıcı için ayda en çok iki ödüllü teslim; hesap/hane kümesinde ödül yok.
  const teslimler = (ek.ht ??= []).filter((x) => x.ay >= ay - 2);
  const oncekiOdul = teslimler
    .filter((x) => x.o === satici.o && x.alici === alici.o && x.ay === ay)
    .reduce((toplam, x) => toplam + x.odul, 0);
  const odul = ayniKume(alici, satici) ? 0 : Math.min(adet, Math.max(0, 2 - oncekiOdul));
  const hizmetPuani = odul > 0 ? hizmetEkle(satici, tarif.meslek, odul) : 0;
  teslimler.push({
    i: ek.n++, o: satici.o, h: tarif.id, alici: alici.o, aliciHane: alici.e,
    ay, adet, odul, tutar,
  });
  ek.ht = teslimler;
  ilan.n -= adet;
  ilan.is ??= [];
  ilan.is.push([ay, alici.o, adet, tutar]);
  if (ilan.is.length > 10) ilan.is.splice(0, ilan.is.length - 10);
  if (ilan.n === 0) ilan.d = "bitti";
  return basarili({ ilan, adet, tutar, etki, hizmetPuani, odul, onarim: onarimSonucu, isleme: islemeSonucu });
}


/** [PARAMETRE] NPC talebinde açılış ayı önceliği veren hak (hizmet → hak). */
export const NPC_TALEP_ONCELIK: Readonly<Record<string, string>> = { lohusa: "dogumTalebi", teselli: "yasliHane" };

/** Olaydan doğan NPC talepleri: doğum → lohusa bakımı, ölüm → yaşayan eşe teselli. */
export function hizmetNpcTalebiAc(kasaba: Kasaba, ay: number, olaylar: OlayTaslagi[]): OlayTaslagi[] {
  const acilan: OlayTaslagi[] = [];
  for (const olay of olaylar) {
    const hizmet = olay.t === "dogum" ? "lohusa" : olay.t === "olum" ? "teselli" : undefined;
    const hedefId = olay.t === "dogum"
      ? olay.h
      : (typeof olay.p.yakini === "object" && olay.p.yakini !== null ? olay.p.yakini.i : undefined);
    if (!hizmet || !olay.w || typeof hedefId !== "string") continue;
    const tarif = hizmetTarifiBul(hizmet);
    if (!tarif?.npcOdul || !/^n([1-9][0-9]{0,8})$/.test(hedefId)) continue;
    const hedefNo = Number(hedefId.slice(1));
    const hedef = kasaba.dizin.get(hedefNo);
    if (!hedef) continue;
    // Aynı hane için aynı ayda birden fazla açık talep ve aynı kaynak olayın tekrarı yok.
    const ek = ekonomiAl(kasaba);
    const talepler = (ek.hn ??= []);
    if (talepler.some((x) => x.olay === olay.w || (x.d === "acik" && x.hane === hedef.e))) continue;
    const hazine = hanedanKasabasi(kasaba);
    if (hazine.hz < tarif.npcOdul) continue;
    hazine.hz -= tarif.npcOdul;
    const talep: HizmetNpcTalebi = {
      i: ek.n++, olay: olay.w, h: hizmet, hedef: hedefId, hane: hedef.e,
      ac: ay, sa: ay + 1, odul: tarif.npcOdul, d: "acik",
    };
    // Kanca partisi 2: "talepler bu kapıya gelir" (lohusa → `dogumTalebi`, teselli → `yasliHane`). Hakkı olan, yaşayan,
    // hedefle aynı hanede olmayan bir oyuncu varsa açılış ayında öncelik onundur (sırayla dönüşümlü); sonra herkes.
    // Ödül aynıdır (hazineden rezerve); akçe yoktan doğmaz.
    // Kanca partisi 2 `haneEbeligi` ("ebe bağı"): bu hanenin önceki lohusa bakımını yapmış, hakkı açık, yaşayan ve
    // hanenin dışından şifacı (en yenisi) ilk çağrılır; genel `dogumTalebi` dönüşümünden önce gelir. Ödül aynıdır.
    if (hizmet === "lohusa") {
      const ebe = talepler
        .filter((x) => x.h === "lohusa" && x.d === "tamam" && x.hane === hedef.e && x.teslim)
        .sort((a, b) => b.i - a.i)
        .map((x) => kasaba.kar.get(x.teslim!.o))
        .find((c) => c && !olduMu(c) && c.e !== hedef.e && hakAcik(c, "haneEbeligi"));
      if (ebe) talep.on = ebe.o;
    }
    const hak = NPC_TALEP_ONCELIK[hizmet];
    if (hak && !talep.on) {
      const sahipler = [...kasaba.kar.values()]
        .filter((c) => !olduMu(c) && c.e !== hedef.e && hakAcik(c, hak))
        .map((c) => c.o)
        .sort();
      if (sahipler.length) talep.on = sahipler[talep.i % sahipler.length];
    }
    talepler.push(talep);
    acilan.push({
      t: "hizmetTalep", w: npcKimlik(hedef.i), h: "", g: "", n: 2,
      k: "olay.hizmetTalep",
      p: { kisi: npcRef(hedef), hizmet, odul: tarif.npcOdul },
    });
  }
  return acilan;
}

/** Açık, tek teslimlik NPC taleplerini istemciye okunur biçimde sunar. */
export function hizmetNpcTalepleri(ek: EkonomiKaydi | undefined, ay: number) {
  return (ek?.hn ?? [])
    .filter((x) => x.d === "acik" && x.sa >= ay)
    .map((x) => ({
      id: `hn${x.i}`, hizmet: x.h, hedef: x.hedef,
      acilisAy: x.ac, sonAy: x.sa, odul: x.odul,
      /** Açılış ayında öncelikli bir hizmetçiye ayrılmış mı (kimliği verilmez). */
      oncelik: !!x.on && x.ac === ay,
    }));
}

/** Hazır hizmet stoğunu yaşayan NPC talebine teslim eder; hazine ödülü açılışta rezerve edilmiştir. */
export function hizmetNpcTalepTeslim(
  ek: EkonomiKaydi, kasaba: Kasaba, satici: Karakter, id: unknown, ay: number,
): Sonuc<{ talep: HizmetNpcTalebi; odul: number; olay: OlayTaslagi }> {
  if (typeof id !== "string") return hata("hedef_uygun_degil");
  const eslesme = /^hn([1-9][0-9]{0,8})$/.exec(id);
  if (!eslesme) return hata("hedef_uygun_degil");
  const talep = ek.hn?.find((x) => x.i === Number(eslesme[1]));
  if (!talep || talep.d !== "acik" || talep.sa < ay) return hata("siparis_kapandi");
  if (satici.e !== 0 && satici.e === talep.hane) return hata("hedef_uygun_degil");
  if (talep.on && talep.ac === ay && talep.on !== satici.o) return hata("hedef_uygun_degil");
  const hedefNo = /^n([1-9][0-9]{0,8})$/.exec(talep.hedef);
  const hedef: Npc | undefined = hedefNo ? kasaba.dizin.get(Number(hedefNo[1])) : undefined;
  if (!hedef) return hata("hedef_uygun_degil");
  const tarif = hizmetTarifiBul(talep.h);
  if (!tarif || !tarif.npcOdul) return hata("tarif_gecersiz");
  const stok = (ek.hs ?? []).find((x) => x.o === satici.o && x.h === talep.h && hizmetStoguGecerli(x, ay));
  if (!stok) return hata("stok_yok");

  stok.n -= 1;
  satici.pa += talep.odul;
  const hizmetPuani = hizmetEkle(satici, tarif.meslek, 1);
  talep.d = "tamam";
  talep.teslim = { o: satici.o, ad: satici.ad, ay };
  const olay: OlayTaslagi = {
    t: "hizmetTalep", w: npcKimlik(hedef.i), h: satici.o, g: satici.o, n: 3,
    k: "olay.hizmetTalepTeslim",
    p: { oyuncu: oyuncuRef(satici), kisi: npcRef(hedef), hizmet: talep.h, odul: talep.odul, hizmetPuani },
  };
  return basarili({ talep, odul: talep.odul, olay });
}
