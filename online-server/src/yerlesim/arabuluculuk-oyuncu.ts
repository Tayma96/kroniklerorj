// Oyuncu–oyuncu arabuluculuğu: üç tarafın açık rızası, tarafsızlık ve çift imzalı mali uzlaşma.
// Emanet, taraflardan biri ölürse terekeye iade edilerek dosya cezasız kapatılır.

import { basarili, hata, type Sonuc } from "../tipler.ts";
import { engelliMi } from "./engel.ts";
import { olduMu } from "./hanedan.ts";
import { oyuncuArabuluculukAl, toplumAl, oyuncuMu, type OyuncuArabuluculuk, type Toplum } from "./toplum.ts";
import type { Karakter, Kasaba } from "./tipler.ts";

export const OYUNCU_ARABULUCU_DAVET_AY = 2;
export const OYUNCU_ARABULUCU_ACIK_TAVAN = 3;
export const OYUNCU_ARABULUCU_UZLASMA_VADE_AY = 3;

type Rol = "s" | "k" | "ar";

function ayniKume(a: Karakter, b: Karakter): boolean {
  return a.h === b.h || (a.e !== 0 && a.e === b.e);
}

function rol(d: OyuncuArabuluculuk, o: string): Rol | undefined {
  if (d.s === o) return "s";
  if (d.k === o) return "k";
  if (d.ar === o) return "ar";
  return undefined;
}

/** Arabulucu, iki taraftan hiçbiriyle dostluk/husumet/engel veya hesap-ocak bağı taşıyamaz. */
export function oyuncuArabulucuTarafsizMi(t: Toplum | undefined, sikayetci: Karakter, karsi: Karakter, arabulucu: Karakter): boolean {
  if (arabulucu.o === sikayetci.o || arabulucu.o === karsi.o || sikayetci.o === karsi.o) return false;
  if (ayniKume(arabulucu, sikayetci) || ayniKume(arabulucu, karsi)) return false;
  if (engelliMi(t, arabulucu.o, sikayetci.o) || engelliMi(t, arabulucu.o, karsi.o)) return false;
  const dost = (a: string, b: string) => (t?.ob ?? []).some(x =>
    x.d === "dost" && ((x.a === a && x.b === b) || (x.a === b && x.b === a))
  );
  const husumet = (a: string, b: string) => (t?.hu ?? []).some(x =>
    x.d === "acik" && ((x.g === a && x.h === b) || (x.g === b && x.h === a))
  );
  return !dost(arabulucu.o, sikayetci.o) && !dost(arabulucu.o, karsi.o)
    && !husumet(arabulucu.o, sikayetci.o) && !husumet(arabulucu.o, karsi.o);
}

function dosyaBul(t: Toplum, id: unknown): OyuncuArabuluculuk | undefined {
  if (typeof id !== "string" || !/^[1-9][0-9]{0,8}$/.test(id)) return undefined;
  return oyuncuArabuluculukAl(t).find(x => x.i === Number(id));
}

/** Emanet alınmadan önce üç katılımcı da hayatta ve yerleşimde yüklü olmalıdır. */
function katilimciEksikVeyaOlmus(k: Kasaba, d: OyuncuArabuluculuk): boolean {
  return [d.s, d.k, d.ar].some((o) => {
    const kisi = k.kar.get(o);
    return !kisi || olduMu(kisi);
  });
}

/** İmza bekleyen taslak vadesi geçince kapanır; henüz emanet alınmadığı için para hareketi yoktur. */
function uzlasmaVadesiDoldu(d: OyuncuArabuluculuk, ay: number): boolean {
  if (d.d !== "imzaBekliyor" || d.sonAy === undefined || ay <= d.sonAy) return false;
  d.d = "dustu";
  d.kp = ay;
  return true;
}

/** Şikâyetçi davet açar. Üç oyuncu da yüklenmiş olmalı; aynı taraf çifti için tek açık dosya vardır. */
export function oyuncuArabuluculukAc(
  k: Kasaba, sikayetci: Karakter, karsi: Karakter, arabulucu: Karakter, ay: number
): Sonuc<OyuncuArabuluculuk> {
  if (![sikayetci.o, karsi.o, arabulucu.o].every(oyuncuMu)) return hata("kisi_yok");
  if (sikayetci.o === karsi.o || sikayetci.o === arabulucu.o || karsi.o === arabulucu.o) return hata("kendine");
  if (ay < k.ay || !Number.isInteger(ay)) return hata("teklif_gecersiz");
  const tp = k.tp;
  if (engelliMi(tp, sikayetci.o, karsi.o) || engelliMi(tp, sikayetci.o, arabulucu.o) || engelliMi(tp, karsi.o, arabulucu.o)) return hata("engelli");
  if (ayniKume(sikayetci, karsi) || ayniKume(sikayetci, arabulucu) || ayniKume(karsi, arabulucu)) return hata("ayni_kume");
  if (!oyuncuArabulucuTarafsizMi(tp, sikayetci, karsi, arabulucu)) return hata("arabulucu_tarafsiz_degil");
  const dosyalar = oyuncuArabuluculukAl(toplumAl(k));
  const [a, b] = [sikayetci.o, karsi.o].sort();
  if (dosyalar.filter(x => ["davet", "taslak", "imzaBekliyor", "emanette"].includes(x.d)).length >= OYUNCU_ARABULUCU_ACIK_TAVAN) return hata("teklif_siniri");
  if (dosyalar.some(x => ["davet", "taslak", "imzaBekliyor", "emanette"].includes(x.d) && [x.s, x.k].sort()[0] === a && [x.s, x.k].sort()[1] === b)) return hata("teklif_siniri");
  const d: OyuncuArabuluculuk = {
    i: k.tp!.tn++,
    s: sikayetci.o, k: karsi.o, ar: arabulucu.o,
    d: "davet", rs: {}, sv: 1, im: {}, ac: ay, sa: ay + OYUNCU_ARABULUCU_DAVET_AY - 1,
  };
  dosyalar.push(d);
  return basarili(d);
}

/** Her oyuncu yalnız kendi rolünün rızasını kaydedebilir. Ret dosyayı kapatır; sessizlik kabul sayılmaz. */
export function oyuncuArabuluculukCevap(
  k: Kasaba, ben: Karakter, id: unknown, cevap: unknown, ay: number
): Sonuc<OyuncuArabuluculuk> {
  const d = dosyaBul(toplumAl(k), id);
  if (!d) return hata("talep_yok");
  const r = rol(d, ben.o);
  if (!r) return hata("taraf_degil");
  if (d.d !== "davet") return hata("teklif_kapandi");
  if (katilimciEksikVeyaOlmus(k, d)) {
    d.d = "dustu";
    d.kp = ay;
    return hata("teklif_kapandi");
  }
  if (ay > d.sa) {
    d.d = "dustu";
    d.kp = ay;
    return hata("teklif_kapandi");
  }
  if (cevap === "ret") {
    d.d = "ret";
    d.kp = ay;
    return basarili(d);
  }
  if (cevap !== "kabul") return hata("gecersiz_istek");
  // Her kabul anında tarafların hâlâ aynı kasabada ve arabulucunun hâlâ tarafsız olduğu doğrulanır.
  const s = k.kar.get(d.s), kk = k.kar.get(d.k), ar = k.kar.get(d.ar);
  if (!s || !kk || !ar) return hata("sakin_yok");
  if (engelliMi(k.tp, d.s, d.k) || engelliMi(k.tp, d.s, d.ar) || engelliMi(k.tp, d.k, d.ar)) return hata("engelli");
  if (!oyuncuArabulucuTarafsizMi(k.tp, s, kk, ar)) return hata("arabulucu_tarafsiz_degil");
  d.rs[r] = ay;
  if (d.rs.s !== undefined && d.rs.k !== undefined && d.rs.ar !== undefined) d.d = "taslak";
  return basarili(d);
}

/** Taraflar taslak başlamadan kendi rızalarını geri alabilir. */
export function oyuncuArabuluculukGeriAl(k: Kasaba, ben: Karakter, id: unknown, ay: number): Sonuc<OyuncuArabuluculuk> {
  const d = dosyaBul(toplumAl(k), id);
  if (!d) return hata("talep_yok");
  const r = rol(d, ben.o);
  if (!r) return hata("taraf_degil");
  const imzaYok = d.im.s === undefined && d.im.k === undefined;
  if (d.d !== "davet" && !((d.d === "taslak" || d.d === "imzaBekliyor") && imzaYok)) return hata("teklif_kapandi");
  d.d = "geri";
  d.kp = ay;
  return basarili(d);
}


/** Arabulucu, para hareketi yapmadan sürümlü uzlaşma teklifini kaydeder. */
export function oyuncuArabuluculukTaslak(
  k: Kasaba, ben: Karakter, id: unknown, sTutari: unknown, kTutari: unknown, notHam: unknown, ay: number
): Sonuc<OyuncuArabuluculuk> {
  const d = dosyaBul(toplumAl(k), id);
  if (!d) return hata("talep_yok");
  if (uzlasmaVadesiDoldu(d, ay)) return hata("teklif_kapandi");
  if (ben.o !== d.ar) return hata("taraf_degil");
  if (d.d !== "taslak" && d.d !== "imzaBekliyor") return hata("teklif_kapandi");
  if (katilimciEksikVeyaOlmus(k, d)) {
    d.d = "dustu";
    d.kp = ay;
    return hata("teklif_kapandi");
  }
  const s = k.kar.get(d.s), kk = k.kar.get(d.k), ar = k.kar.get(d.ar);
  if (!s || !kk || !ar) return hata("sakin_yok");
  if (engelliMi(k.tp, d.s, d.k) || engelliMi(k.tp, d.s, d.ar) || engelliMi(k.tp, d.k, d.ar)) return hata("engelli");
  if (!oyuncuArabulucuTarafsizMi(k.tp, s, kk, ar)) return hata("arabulucu_tarafsiz_degil");
  if (!Number.isSafeInteger(sTutari) || (sTutari as number) < 0 || (sTutari as number) > 100000
    || !Number.isSafeInteger(kTutari) || (kTutari as number) < 0 || (kTutari as number) > 100000
    || ((sTutari as number) === 0 && (kTutari as number) === 0)) return hata("deger_sinir_disi");
  if (notHam !== undefined && (typeof notHam !== "string" || notHam.trim().length > 240)) return hata("gerekce_gecersiz");
  const onceki = d.uz;
  const yeni = { s: sTutari as number, k: kTutari as number, ...(typeof notHam === "string" && notHam.trim() ? { not: notHam.trim() } : {}) };
  if (onceki && onceki.s === yeni.s && onceki.k === yeni.k && onceki.not === yeni.not) return basarili(d);
  d.uz = yeni;
  d.sonAy = ay + OYUNCU_ARABULUCU_UZLASMA_VADE_AY;
  d.sv++;
  d.im = {};
  d.d = "imzaBekliyor";
  d.kp = undefined;
  return basarili(d);
}

/** Şikâyetçi ve karşı taraf yalnız kendi adına, mevcut taslak sürümünü imzalayabilir. */
export function oyuncuArabuluculukImzala(
  k: Kasaba, ben: Karakter, id: unknown, surum: unknown, ay = k.ay
): Sonuc<OyuncuArabuluculuk> {
  const d = dosyaBul(toplumAl(k), id);
  if (!d) return hata("talep_yok");
  const r = rol(d, ben.o);
  if (r !== "s" && r !== "k") return hata("taraf_degil");
  if (uzlasmaVadesiDoldu(d, ay)) return hata("teklif_kapandi");
  if (d.d !== "imzaBekliyor" || !d.uz) return hata("teklif_kapandi");
  const sikayetci = k.kar.get(d.s), karsi = k.kar.get(d.k);
  if (!sikayetci || !karsi || olduMu(sikayetci) || olduMu(karsi)) {
    d.d = "dustu";
    d.kp = ay;
    return hata("teklif_kapandi");
  }
  if (!Number.isSafeInteger(surum) || surum !== d.sv) return hata("teklif_gecersiz");
  const digerRol: "s" | "k" = r === "s" ? "k" : "s";
  if (d.im[digerRol] !== undefined) {
    const s = k.kar.get(d.s), kk = k.kar.get(d.k);
    if (!s || !kk || !d.uz) return hata("sakin_yok");
    if (!Number.isSafeInteger(s.pa - d.uz.s) || !Number.isSafeInteger(kk.pa - d.uz.k)
      || s.pa < d.uz.s || kk.pa < d.uz.k) return hata("para_yok");
    // İkinci imza ve iki tarafın bakiyesinden emanet kesintisi tek yerleşim yazımında birlikte kaydedilir.
    s.pa -= d.uz.s;
    kk.pa -= d.uz.k;
    d.od = { s: d.uz.s, k: d.uz.k, emanet: 1 };
    d.im[r] = d.sv;
    d.d = "emanette";
  } else {
    d.im[r] = d.sv;
  }
  return basarili(d);
}

/** Emanet hem uygulama hem iade yolunda aynı imza/sürüm/tutar bütünlüğünü taşımalıdır. */
function emanetKaydiGecerliMi(d: OyuncuArabuluculuk): boolean {
  const od = d.od, uz = d.uz;
  return !!od && !!uz
    && Number.isSafeInteger(d.sv) && d.sv >= 1
    && d.im.s === d.sv && d.im.k === d.sv
    && Number.isSafeInteger(uz.s) && uz.s >= 0 && uz.s <= 100000
    && Number.isSafeInteger(uz.k) && uz.k >= 0 && uz.k <= 100000
    && Number.isSafeInteger(od.s) && od.s >= 0 && od.s === uz.s
    && Number.isSafeInteger(od.k) && od.k >= 0 && od.k === uz.k;
}

function emanetIadeEt(k: Kasaba, d: OyuncuArabuluculuk, ay: number): boolean {
  if (d.d !== "emanette" || !d.od || d.od.emanet !== 1 || d.od.uygulandi === 1 || d.od.iade === 1
    || !emanetKaydiGecerliMi(d)) return false;
  const s = k.kar.get(d.s), kk = k.kar.get(d.k);
  if (!s || !kk) return false;
  if (!Number.isSafeInteger(s.pa + d.od.s) || !Number.isSafeInteger(kk.pa + d.od.k)) return false;
  s.pa += d.od.s;
  kk.pa += d.od.k;
  d.od.iade = 1;
  d.d = "iptal";
  d.kp = ay;
  return true;
}

export function oyuncuArabuluculukUygula(
  k: Kasaba, ben: Karakter, id: unknown, ay: number
): Sonuc<OyuncuArabuluculuk> {
  const d = dosyaBul(toplumAl(k), id);
  if (!d) return hata("talep_yok");
  // Arabulucu taslağı sunar; imzalı mali uzlaşmanın tarafı değildir ve emaneti uygulayamaz.
  if (ben.o !== d.s && ben.o !== d.k) return hata("taraf_degil");
  if (d.d !== "emanette" || !d.od || d.od.emanet !== 1 || d.od.uygulandi === 1 || d.od.iade === 1) return hata("teklif_kapandi");
  // Kalıcı kayıt elle/eski sürümle bozulmuşsa uygulama veya iade para hareketi yapamaz.
  if (!emanetKaydiGecerliMi(d)) return hata("teklif_gecersiz");
  if (d.sonAy !== undefined && ay > d.sonAy) {
    if (!emanetIadeEt(k, d, ay)) return hata("sakin_yok");
    return basarili(d);
  }
  const s = k.kar.get(d.s), kk = k.kar.get(d.k);
  if (!s || !kk) return hata("sakin_yok");
  // Taraflardan biri imzadan sonra öldüyse ödeme yapılmaz; iki emanet de özgün sahibine döner.
  if (olduMu(s) || olduMu(kk)) {
    if (!emanetIadeEt(k, d, ay)) return hata("sakin_yok");
    return basarili(d);
  }
  if (!Number.isSafeInteger(s.pa + d.od.k) || !Number.isSafeInteger(kk.pa + d.od.s)) return hata("deger_sinir_disi");
  s.pa += d.od.k;
  kk.pa += d.od.s;
  d.od.uygulandi = 1;
  d.d = "tamam";
  d.kp = ay;
  return basarili(d);
}

/** Süresi dolan davetler cezasız düşer. */
export function oyuncuArabuluculukDonumu(k: Kasaba, ay: number): number {
  let sayi = 0;
  for (const d of oyuncuArabuluculukAl(toplumAl(k))) {
    const sikayetci = k.kar.get(d.s), karsi = k.kar.get(d.k);
    const tarafOldu = !!sikayetci && !!karsi && (olduMu(sikayetci) || olduMu(karsi));
    if (d.d === "emanette" && tarafOldu) {
      if (emanetIadeEt(k, d, ay)) sayi++;
      continue;
    }
    if (["davet", "taslak", "imzaBekliyor"].includes(d.d) && katilimciEksikVeyaOlmus(k, d)) {
      d.d = "dustu";
      d.kp = ay;
      sayi++;
      continue;
    }
    if (d.d === "emanette" && d.sonAy !== undefined && ay > d.sonAy && emanetIadeEt(k, d, ay)) {
      sayi++;
      continue;
    }
    if (uzlasmaVadesiDoldu(d, ay)) {
      sayi++;
      continue;
    }
    if (d.d === "davet" && ay > d.sa) {
      d.d = "dustu";
      d.kp = ay;
      sayi++;
    }
  }
  return sayi;
}
