// Oyuncudan oyuncuya ısmarlama (Faz 6; GDD §9 sipariş: ürün, miktar, kalite, ödeme/emanet, teslim koşulu).
// Müşteri usta oyuncuya mal + en az kalite + süre + ücret ısmarlar; ücret açılışta müşteriden emanete kilitlenir
// (avans). Usta kabul eder ya da reddeder; kabul edilmiş ısmarlamayı süresi içinde teslim edince ücret ustaya
// geçer, mal yapan iziyle müşteriye gider ve usta mesleğinde tecrübe (hizmet) kazanır. Gecikmede varsayılan
// uygulanır: emanet müşteriye iade edilir, ustanın sicilinde gecikme yazılır (para cezası yok). Cevapsız ısmarlama
// cezasız düşer. Kendine ve aynı hesap kümesine (aynı hane) ısmarlama verilemez; ücretin adil banttan sapan kısmı
// teslimde pazarla aynı pompa sınırına yazılır. Tecrübe aynı müşteriden azalan getiriyle gelir (alt hesapla
// tecrübe kasılmasın). Saf fonksiyonlar; tarafların karakterleri yüklü olmalıdır.

import { MALLAR, malBul, type MalId } from "../icerik/mallar.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { basariSay } from "./beceri-etki.ts";
import { defterYaz } from "./defter.ts";
import { engelliMi } from "./engel.ts";
import { hanedanKasabasi } from "./hanedan.ts";
import { AZALAN_PENCERE, getiriCarpani } from "./eylem.ts";
import { KALITE_ADLARI, kaliteAdedi, kaliteliCikar, kaliteliEkle, kaliteMi, type Kalite } from "./kalite.ts";
import { karakterYasi } from "./karakter.ts";
import { hizmetEkle } from "./meslek.ts";
import { malMeslegindeMi } from "./npc-taban.ts";
import { oyuncuRef } from "./ortak.ts";
import { ekonomiAl, pompaDenetle, pompaYaz, type PompaDokumu } from "./pazar-tahta.ts";
import { TEKLIF_YASI } from "./teklif.ts";
import { ayniKume } from "./teveccuh.ts";
import type { Karakter, Kasaba, OlayTaslagi } from "./tipler.ts";

export type IsmarlamaDurumu = "acik" | "surer" | "teslim" | "ret" | "geri" | "dustu" | "gecikti";

export interface Ismarlama {
  i: number;
  /** Müşteri ve usta (yerel kimlik) ve adları. */
  m: string;
  ma: string;
  u: string;
  ua: string;
  ml: MalId;
  n: number;
  /** En az kalite. */
  q: Kalite;
  /** Ücret (toplam) ve emanetteki akçe. */
  uc: number;
  e: number;
  /** Açılış ayı ve son teslim ayı (bu ay dahil). */
  ac: number;
  sa: number;
  d: IsmarlamaDurumu;
  ka?: number;
  kp?: number;
  /** Teslim edilen kalite, başlıca yapan, ustanın kazandığı hizmet. */
  tq?: Kalite;
  hz?: number;
}

/** [PARAMETRE] Adet, en uzun süre (ay), müşteri başına açık/süren ve ustaya gelen açık sınırı, ücret doğrulama sınırı. */
export const ISMARLAMA_ADET_EN_COK = 20;
export const ISMARLAMA_SURE_EN_COK = 6;
export const ISMARLAMA_MUSTERI_EN_COK = 5;
export const ISMARLAMA_USTA_EN_COK = 8;
export const ISMARLAMA_UCRET_EN_COK = 100_000;
/** [PARAMETRE] Ustanın teslimde kazandığı hizmet: taban + kalite kademesi başına (aynı müşteriden azalan getiri). */
export const ISMARLAMA_HIZMET = 3;
export const ISMARLAMA_KALITE_HIZMET = 1;
/** [PARAMETRE] Kapanan ısmarlamanın listede kaldığı ay. */
export const ISMARLAMA_TUTMA_AY = 6;

const tamsayi = (v: unknown, alt: number, ust: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= alt && v <= ust;
const SUREN: readonly IsmarlamaDurumu[] = ["acik", "surer"];

export const ismarlamaKimlik = (i: number): string => `i${i}`;
export function ismarlamaBul(k: Kasaba, ham: unknown): Ismarlama | undefined {
  if (typeof ham !== "string" || ham.length > 12) return undefined;
  const m = /^i?([1-9][0-9]{0,8})$/.exec(ham);
  const i = m?.[1] ? Number(m[1]) : undefined;
  return i === undefined ? undefined : k.ek?.is.find((x) => x.i === i);
}

function olay(k: string, n: number, p: OlayTaslagi["p"], w: string, h: string, g: string): OlayTaslagi {
  return { t: "ismarlama", w, h, g, n, k, p };
}

/** POST /v1/ismarlama {hedef (usta), mal, adet, kalite?, sure, ucret}: ücret emanete kilitlenir. */
export function ismarla(k: Kasaba, musteri: Karakter, usta: Karakter, g: Record<string, unknown>, ay: number): Sonuc<{ ismarlama: Ismarlama; olaylar: OlayTaslagi[]; pompa: PompaDokumu }> {
  if (musteri.o === usta.o) return hata("kendine");
  if (ayniKume(musteri, usta)) return hata("ayni_kume");
  if (engelliMi(k.tp, musteri.o, usta.o)) return hata("engelli");
  if (karakterYasi(musteri, ay) < TEKLIF_YASI || karakterYasi(usta, ay) < TEKLIF_YASI) return hata("yas_kapisi");
  const mal = malBul(g.mal);
  if (!mal || MALLAR[mal].taban <= 0) return hata("mal_gecersiz");
  if (!tamsayi(g.adet, 1, ISMARLAMA_ADET_EN_COK) || !tamsayi(g.sure, 1, ISMARLAMA_SURE_EN_COK) || !tamsayi(g.ucret, 1, ISMARLAMA_UCRET_EN_COK))
    return hata("ismarlama_gecersiz");
  const q = g.kalite === undefined ? 0 : g.kalite;
  if (!kaliteMi(q)) return hata("ismarlama_gecersiz");
  if (!malMeslegindeMi(usta, mal)) return hata("meslek_yok");
  const ek = ekonomiAl(k);
  if (ek.is.filter((x) => x.m === musteri.o && SUREN.includes(x.d)).length >= ISMARLAMA_MUSTERI_EN_COK) return hata("ismarlama_siniri");
  if (ek.is.filter((x) => x.u === usta.o && x.d === "acik").length >= ISMARLAMA_USTA_EN_COK) return hata("ismarlama_siniri");
  // Pompa ön denetimi (gerçek sayım teslimde): ücret adil bandın çok üstündeyse hemen söylenir.
  const pompa = pompaDenetle(usta, musteri, mal, q, g.adet, g.ucret, ay);
  if (!pompa.ok) return pompa;
  if (musteri.pa < g.ucret) return hata("para_yok");
  musteri.pa -= g.ucret;
  const ism: Ismarlama = {
    i: ek.n++, m: musteri.o, ma: musteri.ad, u: usta.o, ua: usta.ad, ml: mal, n: g.adet, q, uc: g.ucret, e: g.ucret, ac: ay, sa: ay + g.sure - 1, d: "acik",
  };
  ek.is.push(ism);
  const p = { kim: oyuncuRef(musteri), mal, adet: g.adet, kalite: KALITE_ADLARI[q], ucret: g.ucret };
  return basarili({ ismarlama: ism, olaylar: [olay("olay.ismarlama.geldi", 4, p, musteri.o, usta.o, usta.o)], pompa: pompa.deger });
}

export interface TeslimDokumu {
  kalite: Kalite;
  ucret: number;
  hizmet: number;
  /** Aynı müşteriden pencere içindeki önceki teslim sayısı ve tecrübe çarpanı. */
  tekrar: number;
  carpan: number;
  pompa: PompaDokumu;
}

/**
 * POST /v1/ismarlama/cevap {ismarlama, cevap: kabul|ret|geri|teslim, kalite?}. `ben` cevaplayan, `diger` karşı
 * taraf (yüklü; yoksa iade hazineye gitmez, işlem reddedilir).
 */
export function ismarlamaCevap(
  k: Kasaba,
  ben: Karakter,
  diger: Karakter | undefined,
  idHam: unknown,
  cevap: unknown,
  kaliteHam: unknown,
  ay: number,
): Sonuc<{ ismarlama: Ismarlama; olaylar: OlayTaslagi[]; teslim?: TeslimDokumu }> {
  const ism = ismarlamaBul(k, idHam);
  if (!ism) return hata("ismarlama_yok");
  if (ism.m !== ben.o && ism.u !== ben.o) return hata("taraf_degil");
  if (!diger) return hata("kisi_yok");
  const usta = ism.u === ben.o;
  const p = { kim: oyuncuRef(ben), mal: ism.ml, adet: ism.n };
  const karsi = usta ? ism.m : ism.u;
  switch (cevap) {
    case "kabul":
    case "ret": {
      if (!usta) return hata("taraf_degil");
      if (ism.d !== "acik" || ay > ism.sa) return hata("ismarlama_kapandi");
      if (cevap === "kabul") {
        ism.d = "surer";
        ism.ka = ay;
      } else {
        diger.pa += ism.e;
        ism.e = 0;
        ism.d = "ret";
        ism.kp = ay;
      }
      return basarili({ ismarlama: ism, olaylar: [olay(`olay.ismarlama.${cevap}`, 3, p, ben.o, karsi, karsi)] });
    }
    case "geri": {
      if (usta) return hata("taraf_degil");
      if (ism.d !== "acik") return hata("ismarlama_kapandi");
      ben.pa += ism.e;
      ism.e = 0;
      ism.d = "geri";
      ism.kp = ay;
      return basarili({ ismarlama: ism, olaylar: [olay("olay.ismarlama.geri", 2, p, ben.o, karsi, karsi)] });
    }
    case "teslim": {
      if (!usta) return hata("taraf_degil");
      if (ism.d !== "surer" || ay > ism.sa) return hata("ismarlama_kapandi");
      let q: Kalite | null = null;
      if (kaliteHam !== undefined) q = kaliteMi(kaliteHam) && kaliteHam >= ism.q && kaliteAdedi(ben, ism.ml, kaliteHam) >= ism.n ? kaliteHam : null;
      else for (let x = ism.q; x <= 3 && q === null; x++) if (kaliteAdedi(ben, ism.ml, x as Kalite) >= ism.n) q = x as Kalite;
      if (q === null) return hata("mal_yok");
      const pompa = pompaDenetle(ben, diger, ism.ml, q, ism.n, ism.e, ay);
      if (!pompa.ok) return pompa;
      pompaYaz(ben, diger, pompa.deger, ay);
      kaliteliEkle(diger, ism.ml, kaliteliCikar(ben, ism.ml, ism.n, q)!);
      const ucret = ism.e;
      ben.pa += ucret;
      ism.e = 0;
      ism.d = "teslim";
      ism.kp = ay;
      ism.tq = q;
      const tekrar = (k.ek?.is ?? []).filter((x) => x !== ism && x.d === "teslim" && x.u === ben.o && x.m === diger.o && ay - (x.kp ?? 0) < AZALAN_PENCERE).length;
      const carpan = getiriCarpani(tekrar);
      const hizmet = hizmetEkle(ben, MALLAR[ism.ml].meslek, Math.floor((ISMARLAMA_HIZMET + q * ISMARLAMA_KALITE_HIZMET) * carpan));
      ism.hz = hizmet;
      if (tekrar === 0) basariSay(ben, `teslim:${ism.ml}`, ism.n);
      const ig = (ben.ig ??= [0, 0]);
      ig[0] += 1;
      return basarili({
        ismarlama: ism,
        teslim: { kalite: q, ucret, hizmet, tekrar, carpan, pompa: pompa.deger },
        // Teşekkür izi (§5.5): herkese görünür, ustanın adıyla.
        olaylar: [olay("olay.ismarlama.teslim", 5, { ...p, musteri: oyuncuRef(diger), kalite: KALITE_ADLARI[q] }, ben.o, karsi, "")],
      });
    }
    default:
      return hata("gecersiz_istek");
  }
}

/** Ay dönümü: cevapsız düşer, kabul edilmiş ama teslim edilmemiş geç kalır (varsayılan: iade + sicil). */
export function ismarlamaDonumu(k: Kasaba, ay: number): OlayTaslagi[] {
  const ek = k.ek;
  if (!ek) return [];
  const olaylar: OlayTaslagi[] = [];
  for (const ism of ek.is) {
    if (!SUREN.includes(ism.d) || ay <= ism.sa) continue;
    const musteri = k.kar.get(ism.m);
    // Müşteri kaydı yoksa emanet ustaya geçmez, kasaba hazinesine yazılır (toplam akçe korunur).
    if (musteri) {
      musteri.pa += ism.e;
      defterYaz(musteri, ay, "ismarlamaIade", ism.e);
    } else if (ism.e > 0) hanedanKasabasi(k).hz += ism.e;
    ism.e = 0;
    const gecikti = ism.d === "surer";
    ism.d = gecikti ? "gecikti" : "dustu";
    ism.kp = ay;
    if (gecikti) {
      const u = k.kar.get(ism.u);
      if (u) (u.ig ??= [0, 0])[1] += 1;
    }
    const p = { mal: ism.ml, adet: ism.n };
    olaylar.push(olay(`olay.ismarlama.${ism.d}`, 3, p, ism.u, ism.m, ism.m));
    if (gecikti) olaylar.push(olay("olay.ismarlama.gecikti", 3, p, ism.u, ism.m, ism.u));
  }
  ek.is = ek.is.filter((x) => SUREN.includes(x.d) || ay - (x.kp ?? ay) < ISMARLAMA_TUTMA_AY);
  return olaylar;
}

/** Emanetteki toplam akçe. */
export function ismarlamaEmaneti(ek: { is: Ismarlama[] } | undefined, o?: string): number {
  return (ek?.is ?? []).filter((x) => SUREN.includes(x.d) && (o === undefined || x.m === o)).reduce((a, x) => a + x.e, 0);
}

/** Ustalık sicili: teslim ve gecikme sayısı, güven yüzdesi. */
export function ismarlamaSicili(kar: Karakter) {
  const [teslim, gecikme] = kar.ig ?? [0, 0];
  const toplam = teslim + gecikme;
  return { teslim, gecikme, guven: toplam === 0 ? null : Math.round((teslim / toplam) * 100) };
}

export function ismarlamaGorunumu(ism: Ismarlama, ben: string, ay: number) {
  return {
    id: ismarlamaKimlik(ism.i),
    rol: ism.m === ben ? "musteri" : ism.u === ben ? "usta" : null,
    musteri: { id: ism.m, ad: ism.ma },
    usta: { id: ism.u, ad: ism.ua },
    mal: ism.ml,
    adet: ism.n,
    kalite: KALITE_ADLARI[ism.q],
    kademe: ism.q,
    ucret: ism.uc,
    emanet: ism.e,
    acilis: ism.ac,
    son: ism.sa,
    kalanAy: Math.max(0, ism.sa - ay + 1),
    durum: ism.d,
    teslimKalitesi: ism.tq === undefined ? null : KALITE_ADLARI[ism.tq],
    hizmet: ism.hz ?? null,
  };
}
