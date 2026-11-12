// E4.3: öğrenilmiş hizmeti süreli stoğa hazırlar; ilan, satın alma, teslim ve bozulma akışını yönetir.
import type { MalId } from "../icerik/mallar.ts";
import { hizmetAcik, sinerjiAcik } from "./beceri-etki.ts";
import { envanterEkle } from "./npc-taban.ts";
import { halDegistir, type Hal } from "./hal.ts";
import { hizmetEkle } from "./meslek.ts";
import { ayniKume } from "./teveccuh.ts";
import { takatHarca } from "./karakter.ts";
import { hizmetTarifiBul, type HizmetTarifi } from "./hizmet-tarif.ts";
import { ekonomiAl, type EkonomiKaydi, type HizmetIlan, type HizmetStogu, type HizmetNpcTalebi } from "./pazar-tahta.ts";
import { hanedanKasabasi } from "./hanedan.ts";
import { npcKimlik, npcRef, oyuncuRef } from "./ortak.ts";
import type { Karakter, Kasaba, Npc, OlayTaslagi } from "./tipler.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";

/** [PARAMETRE] Tek hazırlamada en çok 5, oyuncu/hizmet başına süresi geçmemiş stokta en çok 20 adet. */
export const HIZMET_HAZIR_ADET_EN_COK = 5;
export const HIZMET_STOK_EN_COK = 20;

/** Hizmet düğümü ve varsa tarifte tanımlı çapraz meslek sinerjisi birlikte aranır. */
export function hizmetYetkiliMi(kar: Karakter, tarif: HizmetTarifi): boolean {
  return hizmetAcik(kar, tarif.id) && (!tarif.acar || sinerjiAcik(kar, tarif.acar));
}

export interface HizmetHazirlamaSonucu {
  stok: HizmetStogu;
  harcanan: { girdiler: Partial<Record<string, number>>; takat: number };
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
  const takat = tarif.takat * adet;
  // Takat denetimi girdiler tüketilmeden yapılır; takatHarca başarısızsa mal kaybı olmaz.
  if (!takatHarca(kar, ay, takat)) return hata("takat_yok");
  for (const [mal, miktar] of Object.entries(girdiler)) envanterEkle(kar, mal as MalId, -miktar);

  const stok: HizmetStogu = {
    i: ek.n++, o: kar.o, oa: kar.ad, h: tarif.id, n: adet, n0: adet, ac: ay, sa: ay + tarif.hazir.gecerlilikAy,
  };
  stoklar.push(stok);
  return basarili({ stok, harcanan: { girdiler, takat } });
}

/** Süresi dolan stok ekranda/işlemde kullanılamaz; eski kayıtlar silinmeden geçmişte kalır. */
export function hizmetStoguGecerli(stok: HizmetStogu, ay: number): boolean {
  return stok.n > 0 && stok.sa >= ay;
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
  };
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
): Sonuc<{ ilan: HizmetIlan; adet: number; tutar: number; etki: Partial<Hal>; hizmetPuani: number; odul: number }> {
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
  for (const etki of tarif.etki) {
    if (etki.tur !== "hal" || !["can", "kondisyon", "gonul"].includes(etki.alan))
      return hata("hedef_uygun_degil");
    const alan = etki.alan as keyof Hal;
    fark[alan] = (fark[alan] ?? 0) + etki.deger * adet;
  }
  const tutar = ilan.f * adet;
  if (alici.pa < tutar) return hata("para_yok");

  alici.pa -= tutar;
  satici.pa += tutar;
  const etki = halDegistir(alici, ay, fark, `hizmet.${tarif.id}`);
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
  return basarili({ ilan, adet, tutar, etki, hizmetPuani, odul });
}


/** Olaydan doğan NPC talepleri: doğum → lohusa bakımı, ölüm → yaşayan eşe teselli. */
export function hizmetNpcTalebiAc(kasaba: Kasaba, ay: number, olaylar: OlayTaslagi[]): OlayTaslagi[] {
  const acilan: OlayTaslagi[] = [];
  for (const olay of olaylar) {
    const hizmet = olay.t === "dogum" ? "lohusa" : olay.t === "olum" ? "teselli" : undefined;
    if (!hizmet || !olay.w || !olay.h) continue;
    const tarif = hizmetTarifiBul(hizmet);
    if (!tarif?.npcOdul || !/^n([1-9][0-9]{0,8})$/.test(olay.h)) continue;
    const hedefNo = Number(olay.h.slice(1));
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
      i: ek.n++, olay: olay.w, h: hizmet, hedef: olay.h, hane: hedef.e,
      ac: ay, sa: ay + 1, odul: tarif.npcOdul, d: "acik",
    };
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
    t: "hizmetTalep", w: satici.o, h: npcKimlik(hedef.i), g: satici.o, n: 3,
    k: "olay.hizmetTalepTeslim",
    p: { oyuncu: oyuncuRef(satici), kisi: npcRef(hedef), hizmet: talep.h, odul: talep.odul },
  };
  return basarili({ talep, odul: talep.odul, olay: { ...olay, p: { ...olay.p, hizmetPuani } } });
}
