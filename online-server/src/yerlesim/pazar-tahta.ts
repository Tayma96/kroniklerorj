// Oyuncudan oyuncuya pazar tahtası (Faz 6; GDD §9): satış ilanı (mal, adet, birim fiyat, süre) ve alım ilanı.
// Emanetli: satış ilanında mal, alım ilanında akçe ilan süresince sahibinden kilitlenir; iptal ya da süre
// dolumunda iade edilir. Karşı taraf ilanı kısmen ya da tamamen doldurur; ilan sahibinin çevrimiçi olması gerekmez.
// Fiyat tavanı/tabanı yoktur; her ilanda NPC taban fiyatıyla görünür karşılaştırma dökümü vardır.
// Servet pompalama sınırı (Faz 3 armağan deseni): fiyatın adil bandın (taban × kalite çarpanı × [ALT, UST]) dışında
// kalan kısmı hediye sayılır ve vereni/alanı Faz 3'ün aylık armağan tavanlarına (hv/ha) yazar; aynı hesap
// kümesinde (aynı hane) bant sıfırdır ve fark iki kat sayılır. Tavan aşılırsa işlem `pompa_siniri` döner.
// Pazar bacı satıcının gelirinden kesilir ve kasaba hazinesine gider: bütün akçe hareketi aktarımdır (toplam akçe
// değişmez). Saf fonksiyonlar; tarafların karakterleri yüklü olmalıdır (motor yükler). Hata olursa hiçbir şey değişmez.

import { MALLAR, malBul, type MalId } from "../icerik/mallar.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { defterYaz } from "./defter.ts";
import { engelliMi } from "./engel.ts";
import { hanedanKasabasi } from "./hanedan.ts";
import { KALITE_ADLARI, KALITE_DEGER_CARPANI, kaliteAdedi, kaliteliCikar, kaliteliEkle, kaliteMi, type Kalite, type KaliteParti } from "./kalite.ts";
import { karakterYasi } from "./karakter.ts";
import { npcFiyat, stogaEkle, stokFiyat, type KasabaStogu } from "./npc-taban.ts";
import { oyuncuRef } from "./ortak.ts";
import { HEDIYE_ALMA_AYLIK, HEDIYE_VERME_AYLIK, TEKLIF_YASI } from "./teklif.ts";
import { ayniKume } from "./teveccuh.ts";
import type { Ismarlama } from "./ismarlama.ts";
import type { LevhaKaydi } from "./levha.ts";
import type { Dokum, Karakter, Kasaba, OlayTaslagi } from "./tipler.ts";

/** Hazırlanmış hizmet stoğu (E4.3): süreli, sahibine bağlı ve ilan açılana dek kullanılamaz. */
export interface HizmetStogu {
  i: number;
  o: string;
  oa: string;
  /** Hizmet kataloğu kimliği. */
  h: string;
  n: number;
  ac: number;
  sa: number;
}

/** Yerleşimin ekonomi kaydı (depo anahtarı "ek"): sonraki kimlik, ilanlar, ısmarlamalar, levha ve hizmet stoğu. */
export interface EkonomiKaydi {
  n: number;
  il: Ilan[];
  is: Ismarlama[];
  lv: LevhaKaydi[];
  hs?: HizmetStogu[];
}

export function ekonomiAl(k: Kasaba): EkonomiKaydi {
  k.ek ??= { n: 1, il: [], is: [], lv: [], hs: [] };
  k.ek.hs ??= [];
  return k.ek;
}

export type IlanTuru = "sat" | "al";
export type IlanDurumu = "acik" | "bitti" | "geri" | "dustu";

export interface Ilan {
  i: number;
  t: IlanTuru;
  /** Sahibi (yerel oyuncu kimliği) ve adı. */
  o: string;
  oa: string;
  ml: MalId;
  /** Satışta ilandaki malın kalitesi; alımda istenen en az kalite. */
  q: Kalite;
  /** Kalan ve ilk adet; birim fiyat (akçe). */
  n: number;
  n0: number;
  f: number;
  /** Açılış ve son ay (bu ay dahil; sonraki dönümde düşer). */
  ac: number;
  sa: number;
  /** Satış ilanında emanetteki mal partileri; alım ilanında emanetteki akçe. */
  p?: KaliteParti[];
  e: number;
  d: IlanDurumu;
  kp?: number;
  /** Son işlemler: [ay, karşı taraf, adet, tutar]. */
  h?: [ay: number, kim: string, adet: number, tutar: number][];
}

/** [PARAMETRE] Oyuncu başına açık ilan, en uzun ve varsayılan süre (ay), ilan başına adet, fiyat doğrulama sınırı. */
export const PAZAR_ILAN_EN_COK = 5;
export const PAZAR_SURE_EN_COK = 3;
export const PAZAR_SURE_VARSAYILAN = 2;
export const PAZAR_ADET_EN_COK = 50;
/** Yalnız girdi doğrulaması (taşma koruması); fiyat politikası değildir. */
export const PAZAR_FIYAT_EN_COK = 100_000;
/** [PARAMETRE] Pazar bacı: satıcının gelirinden (aşağı yuvarlanır) kasaba hazinesine. */
export const PAZAR_BAC_ORANI = 0.05;
/** [PARAMETRE] Adil bant (taban × kalite çarpanı × adet üzerinden): dışında kalan fark hediye sayılır. */
export const PAZAR_ADIL_ALT = 0.5;
export const PAZAR_ADIL_UST = 3;
/** [PARAMETRE] Aynı hesap kümesinde bant sıfırdır ve fark bu çarpanla sayılır (Faz 3 AYNI_OCAK_CARPANI ile aynı). */
export const PAZAR_KUME_CARPANI = 2;
/** [PARAMETRE] İlanda tutulan son işlem ve kapanan ilanın listede kaldığı ay. */
export const PAZAR_ISLEM_TUTULAN = 10;
export const PAZAR_KAPALI_TUTMA_AY = 3;

const tamsayi = (v: unknown, alt: number, ust: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= alt && v <= ust;
const aylik = (s: [number, number] | undefined, ay: number) => (s && s[0] === ay ? s[1] : 0);

export const ilanKimlik = (i: number): string => `p${i}`;
export function ilanCoz(ham: unknown): number | undefined {
  if (typeof ham === "number" && Number.isInteger(ham) && ham > 0) return ham;
  if (typeof ham !== "string" || ham.length > 12) return undefined;
  const m = /^p?([1-9][0-9]{0,8})$/.exec(ham);
  return m?.[1] ? Number(m[1]) : undefined;
}

/** Bir birimin adil değeri (taban × kalite çarpanı; tabanı 0 olan mal pazara çıkmaz). */
export function adilBirim(mal: MalId, q: Kalite): number {
  return MALLAR[mal].taban * (KALITE_DEGER_CARPANI[q] ?? 1);
}

/** Görünür karşılaştırma dökümü: birim fiyat, NPC tabanı, NPC'den alış ve kasaba stoğu fiyatı, adil bant. */
export function karsilastirma(mal: MalId, q: Kalite, birimFiyat: number) {
  const taban = MALLAR[mal].taban;
  const adil = adilBirim(mal, q);
  return {
    birimFiyat,
    npcTaban: taban,
    npcdenAlis: npcFiyat(mal).toplam,
    stokFiyati: stokFiyat(mal).toplam,
    adil,
    bant: { alt: Math.floor(adil * PAZAR_ADIL_ALT), ust: Math.ceil(adil * PAZAR_ADIL_UST) },
    /** Fiyatın NPC tabanına oranı (yüzde). */
    tabanOrani: taban > 0 ? Math.round((birimFiyat / taban) * 100) : null,
  };
}

export interface PompaDokumu {
  /** Hediye sayılan akçe değeri (kümede çarpanlı) ve yönü. */
  hediye: number;
  yon: "alicidan" | "saticidan" | null;
  ayniKume: boolean;
  bant: { alt: number; ust: number };
  /** Verenin ve alanın bu ayki kalan armağan tavanı (işlemden önce). */
  verenKalan: number;
  alanKalan: number;
}

/** Bu işlemin hediye sayılan kısmı ve tavan denetimi (değiştirmez). */
export function pompaDenetle(satici: Karakter, alici: Karakter, mal: MalId, q: Kalite, adet: number, tutar: number, ay: number): Sonuc<PompaDokumu> {
  const kume = ayniKume(satici, alici);
  const adil = adilBirim(mal, q) * adet;
  const bant = kume ? { alt: Math.floor(adil), ust: Math.ceil(adil) } : { alt: Math.floor(adil * PAZAR_ADIL_ALT), ust: Math.ceil(adil * PAZAR_ADIL_UST) };
  const carpan = kume ? PAZAR_KUME_CARPANI : 1;
  let hediye = 0;
  let yon: PompaDokumu["yon"] = null;
  if (tutar > bant.ust) {
    hediye = (tutar - bant.ust) * carpan;
    yon = "alicidan";
  } else if (tutar < bant.alt) {
    hediye = (bant.alt - tutar) * carpan;
    yon = "saticidan";
  }
  const veren = yon === "saticidan" ? satici : alici;
  const alan = yon === "saticidan" ? alici : satici;
  const d: PompaDokumu = {
    hediye,
    yon,
    ayniKume: kume,
    bant,
    verenKalan: HEDIYE_VERME_AYLIK - aylik(veren.hv, ay),
    alanKalan: HEDIYE_ALMA_AYLIK - aylik(alan.ha, ay),
  };
  if (hediye > 0 && (hediye > d.verenKalan || hediye > d.alanKalan)) return hata("pompa_siniri");
  return basarili(d);
}

/** Denetimden geçen hediye payını armağan tavanlarına yazar. */
export function pompaYaz(satici: Karakter, alici: Karakter, d: PompaDokumu, ay: number): void {
  if (d.hediye <= 0 || !d.yon) return;
  const veren = d.yon === "saticidan" ? satici : alici;
  const alan = d.yon === "saticidan" ? alici : satici;
  veren.hv = [ay, aylik(veren.hv, ay) + d.hediye];
  alan.ha = [ay, aylik(alan.ha, ay) + d.hediye];
}

/** Bacı ve satıcıya kalanı hesaplar. */
export function bacHesapla(tutar: number): { bac: number; net: number } {
  const bac = Math.floor(tutar * PAZAR_BAC_ORANI);
  return { bac, net: tutar - bac };
}

function olay(t: string, k: string, n: number, p: OlayTaslagi["p"], w: string, h = "", g = ""): OlayTaslagi {
  return { t, w, h, g, n, k, p };
}

export function acikIlanlar(ek: EkonomiKaydi | undefined, o?: string): Ilan[] {
  return (ek?.il ?? []).filter((x) => x.d === "acik" && (o === undefined || x.o === o));
}

/** POST /v1/pazar/ilan {tur, mal, adet, fiyat, sure?, kalite?}: emanet hemen kilitlenir. */
export function ilanAc(k: Kasaba, kar: Karakter, g: Record<string, unknown>, ay: number): Sonuc<{ ilan: Ilan; olay: OlayTaslagi }> {
  const tur = g.tur;
  if (tur !== "sat" && tur !== "al") return hata("ilan_gecersiz");
  const mal = malBul(g.mal);
  if (!mal || MALLAR[mal].taban <= 0) return hata("mal_gecersiz");
  if (!tamsayi(g.adet, 1, PAZAR_ADET_EN_COK) || !tamsayi(g.fiyat, 1, PAZAR_FIYAT_EN_COK)) return hata("ilan_gecersiz");
  const sure = g.sure === undefined ? PAZAR_SURE_VARSAYILAN : g.sure;
  if (!tamsayi(sure, 1, PAZAR_SURE_EN_COK)) return hata("ilan_gecersiz");
  const q = g.kalite === undefined ? 0 : g.kalite;
  if (!kaliteMi(q)) return hata("ilan_gecersiz");
  if (karakterYasi(kar, ay) < TEKLIF_YASI) return hata("yas_kapisi");
  const ek = ekonomiAl(k);
  if (acikIlanlar(ek, kar.o).length >= PAZAR_ILAN_EN_COK) return hata("ilan_siniri");
  const adet = g.adet;
  const fiyat = g.fiyat;
  let p: KaliteParti[] | undefined;
  let e = 0;
  if (tur === "sat") {
    if (kaliteAdedi(kar, mal, q) < adet) return hata("mal_yok");
    p = kaliteliCikar(kar, mal, adet, q)!;
  } else {
    e = adet * fiyat;
    if (kar.pa < e) return hata("para_yok");
    kar.pa -= e;
  }
  const ilan: Ilan = { i: ek.n++, t: tur, o: kar.o, oa: kar.ad, ml: mal, q, n: adet, n0: adet, f: fiyat, ac: ay, sa: ay + sure - 1, e, d: "acik", ...(p ? { p } : {}) };
  ek.il.push(ilan);
  return basarili({
    ilan,
    olay: olay("pazar", `olay.pazar.ilan.${tur}`, 2, { kim: oyuncuRef(kar), mal, adet, fiyat, kalite: KALITE_ADLARI[q] }, kar.o),
  });
}

export function ilanBul(k: Kasaba, idHam: unknown): Ilan | undefined {
  const i = ilanCoz(idHam);
  return i === undefined ? undefined : k.ek?.il.find((x) => x.i === i);
}

export interface IlanIslemSonucu {
  ilan: Ilan;
  adet: number;
  kalite: Kalite;
  tutar: number;
  /** Satıcının bacı ve eline geçen. */
  bac: number;
  net: number;
  karsilastirma: ReturnType<typeof karsilastirma>;
  pompa: PompaDokumu;
}

/** Partilerin baştan `adet` kadarını ayırır (ilan emanetinden). */
function partiAyir(p: KaliteParti[], adet: number): KaliteParti[] {
  const cikan: KaliteParti[] = [];
  let kalan = adet;
  for (const x of p) {
    if (kalan <= 0) break;
    const d = Math.min(kalan, x[1]);
    x[1] -= d;
    kalan -= d;
    cikan.push(x[2] === undefined ? [x[0], d] : [x[0], d, x[2]]);
  }
  for (let i = p.length - 1; i >= 0; i--) if (p[i]![1] <= 0) p.splice(i, 1);
  return cikan;
}

/** En az `q` kalitede elde olan en düşük kalite (yoksa null). */
function teslimKalitesi(kar: Karakter, mal: MalId, q: Kalite, adet: number, istenen: unknown): Kalite | null {
  if (istenen !== undefined) return kaliteMi(istenen) && istenen >= q && kaliteAdedi(kar, mal, istenen) >= adet ? istenen : null;
  for (let x = q; x <= 3; x++) if (kaliteAdedi(kar, mal, x as Kalite) >= adet) return x as Kalite;
  return null;
}

/**
 * POST /v1/pazar/islem {ilan, adet, kalite?}: satış ilanından alır ya da alım ilanına satar. `ben` karşı taraf,
 * `sahip` ilan sahibi (yüklü). Bacı hazineye; hediye payı armağan tavanlarına yazılır.
 */
export function ilanIsle(
  k: Kasaba,
  ben: Karakter,
  sahip: Karakter | undefined,
  idHam: unknown,
  adetHam: unknown,
  kaliteHam: unknown,
  ay: number,
): Sonuc<{ sonuc: IlanIslemSonucu; olaylar: OlayTaslagi[] }> {
  const ilan = ilanBul(k, idHam);
  if (!ilan) return hata("ilan_yok");
  if (ilan.d !== "acik" || ay > ilan.sa) return hata("ilan_kapandi");
  if (ilan.o === ben.o) return hata("kendine");
  if (!sahip) return hata("kisi_yok");
  if (engelliMi(k.tp, ben.o, sahip.o)) return hata("engelli");
  if (karakterYasi(ben, ay) < TEKLIF_YASI) return hata("yas_kapisi");
  if (!tamsayi(adetHam, 1, ilan.n)) return hata("ilan_gecersiz");
  const adet = adetHam;
  const tutar = adet * ilan.f;
  const satis = ilan.t === "sat";
  const satici = satis ? sahip : ben;
  const alici = satis ? ben : sahip;
  let q: Kalite = ilan.q;
  if (!satis) {
    const tq = teslimKalitesi(ben, ilan.ml, ilan.q, adet, kaliteHam);
    if (tq === null) return hata("mal_yok");
    q = tq;
  }
  // Pompa sınırı paradan önce denetlenir (kural akçeden bağımsızdır).
  const pompa = pompaDenetle(satici, alici, ilan.ml, q, adet, tutar, ay);
  if (!pompa.ok) return pompa;
  if (satis && ben.pa < tutar) return hata("para_yok");
  // --- değişiklikler (bütün denetimlerden sonra) ---
  pompaYaz(satici, alici, pompa.deger, ay);
  const { bac, net } = bacHesapla(tutar);
  if (satis) {
    ben.pa -= tutar;
    kaliteliEkle(ben, ilan.ml, partiAyir(ilan.p ?? [], adet));
  } else {
    ilan.e -= tutar;
    kaliteliEkle(sahip, ilan.ml, kaliteliCikar(ben, ilan.ml, adet, q)!);
  }
  satici.pa += net;
  if (bac > 0) hanedanKasabasi(k).hz += bac;
  ilan.n -= adet;
  (ilan.h ??= []).push([ay, ben.o, adet, tutar]);
  if (ilan.h.length > PAZAR_ISLEM_TUTULAN) ilan.h.splice(0, ilan.h.length - PAZAR_ISLEM_TUTULAN);
  if (ilan.n === 0) {
    ilan.d = "bitti";
    ilan.kp = ay;
    if (!satis && ilan.e > 0) {
      sahip.pa += ilan.e; // yuvarlama artığı olmaz (e = n × f), yine de emanet boşalır
      ilan.e = 0;
    }
  }
  const p = { kim: oyuncuRef(ben), mal: ilan.ml, adet, tutar, kalite: KALITE_ADLARI[q] };
  return basarili({
    sonuc: { ilan, adet, kalite: q, tutar, bac, net, karsilastirma: karsilastirma(ilan.ml, q, ilan.f), pompa: pompa.deger },
    olaylar: [olay("pazar", `olay.pazar.islem.${ilan.t}`, 3, p, ben.o, sahip.o, sahip.o)],
  });
}

/** Emaneti sahibine iade eder (sahip yoksa akçe hazineye, mal kasaba stoğuna: toplam korunur). */
function iadeEt(k: Kasaba, ilan: Ilan, sahip: Karakter | undefined): void {
  if (sahip) {
    if (ilan.e > 0) sahip.pa += ilan.e;
    if (ilan.p && ilan.p.length > 0) kaliteliEkle(sahip, ilan.ml, ilan.p);
  } else {
    if (ilan.e > 0) hanedanKasabasi(k).hz += ilan.e;
    const n = (ilan.p ?? []).reduce((a, x) => a + x[1], 0);
    if (n > 0) stogaEkle((k.st ??= {}) as KasabaStogu, ilan.ml, n);
  }
  ilan.e = 0;
  ilan.p = [];
}

/** POST /v1/pazar/geri {ilan}: sahibi ilanı kapatır, kalan emanet iade edilir. */
export function ilanGeri(k: Kasaba, kar: Karakter, idHam: unknown, ay: number): Sonuc<{ ilan: Ilan; iade: { akce: number; adet: number } }> {
  const ilan = ilanBul(k, idHam);
  if (!ilan) return hata("ilan_yok");
  if (ilan.o !== kar.o) return hata("taraf_degil");
  if (ilan.d !== "acik") return hata("ilan_kapandi");
  const iade = { akce: ilan.e, adet: (ilan.p ?? []).reduce((a, x) => a + x[1], 0) };
  iadeEt(k, ilan, kar);
  ilan.d = "geri";
  ilan.kp = ay;
  return basarili({ ilan, iade });
}

/** Ay dönümü: süresi dolan ilanlar düşer, emanet iade edilir; eski kapalılar temizlenir. */
export function ilanDonumu(k: Kasaba, ay: number): OlayTaslagi[] {
  const ek = k.ek;
  if (!ek) return [];
  const olaylar: OlayTaslagi[] = [];
  for (const ilan of ek.il) {
    if (ilan.d !== "acik" || ay <= ilan.sa) continue;
    const sahip = k.kar.get(ilan.o);
    const iade = { akce: ilan.e, adet: (ilan.p ?? []).reduce((a, x) => a + x[1], 0) };
    iadeEt(k, ilan, sahip);
    if (sahip) defterYaz(sahip, ay, "pazarIade", iade.akce);
    ilan.d = "dustu";
    ilan.kp = ay;
    olaylar.push(olay("pazar", "olay.pazar.dustu", 2, { mal: ilan.ml, adet: iade.adet, akce: iade.akce }, ilan.o, "", ilan.o));
  }
  ek.il = ek.il.filter((x) => x.d === "acik" || ay - (x.kp ?? ay) < PAZAR_KAPALI_TUTMA_AY);
  return olaylar;
}

/** Emanetteki toplam akçe (değişmez denetimi ve defter görünümü için). */
export function pazarEmaneti(ek: EkonomiKaydi | undefined, o?: string): number {
  return (ek?.il ?? []).filter((x) => x.d === "acik" && (o === undefined || x.o === o)).reduce((a, x) => a + x.e, 0);
}

/** İlan görünümü (karşılaştırma dökümüyle). */
export function ilanGorunumu(ilan: Ilan, ben: string, ay: number) {
  const n = ilan.p?.reduce((a, x) => a + x[1], 0) ?? 0;
  const yapanlar = [...new Set((ilan.p ?? []).map((x) => x[2]).filter((x): x is string => x !== undefined))];
  return {
    id: ilanKimlik(ilan.i),
    tur: ilan.t,
    sahip: { id: ilan.o, ad: ilan.oa },
    benim: ilan.o === ben,
    mal: ilan.ml,
    kalite: KALITE_ADLARI[ilan.q],
    kademe: ilan.q,
    kalan: ilan.n,
    ilk: ilan.n0,
    birimFiyat: ilan.f,
    toplam: ilan.n * ilan.f,
    emanet: ilan.t === "sat" ? { adet: n, akce: 0 } : { adet: 0, akce: ilan.e },
    yapanlar,
    acilis: ilan.ac,
    son: ilan.sa,
    kalanAy: Math.max(0, ilan.sa - ay + 1),
    durum: ilan.d,
    karsilastirma: karsilastirma(ilan.ml, ilan.q, ilan.f),
    islemler: (ilan.h ?? []).map(([a, kim, adet, tutar]) => ({ ay: a, kim, adet, tutar })),
  };
}
