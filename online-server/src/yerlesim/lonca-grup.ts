// Lonca / ahi zaviyesi (Ek A §3.7, E7): 5–30 kişilik küçük grup. Ortak kasa (emanet), ortak arma (kozmetik), üyeler
// arası usta-çırak (Faz 3 "cirak" teklifi; görünümde listelenir) ve AHİ BAŞI kademesi. Ana belge §8 "lonca temsilcisi"
// rolüne mekanik kazandırır (`ahiBaslari` kancası).
// - Kuruluş bedeli akçedir ve dünyadan çıkar (yeni akçe yaratılmaz). En az üye sayısına ulaşana dek zaviye
//   "kuruluyor"dur: kasa ve arma kapalıdır.
// - Kasa: her üye yatırabilir; yalnız yönetici (ahi başı, yoksa kurucu vekil) kasadan bir üyeye verebilir. Kendine ve
//   aynı hesap kümesine verilemez; alan üyenin kıdemi ve üye başı aylık tavan vardır; bütün hareketler üyelere açık
//   (şeffaf defter). Akçe yalnız oyuncular arasında yer değiştirir: toplam akçe korunur. Son üye ayrılırsa kasa ona
//   döner.
// - Ahi başı: üyelerin oyuyla, dönümde seçilir. Aday şartı teveccüh kademesidir (§6.2 `TEVECCUH_ETKI.ahiKademe`);
//   meşrep gururu şartı bir kademe kaydırır (gururlu −1, mütevazı +1). Oy en az üyelerin yarısı olmalıdır.
// Saf fonksiyonlar.

import { adDogrula } from "../ad.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { engelliMi } from "./engel.ts";
import { olduMu } from "./hanedan.ts";
import { karakterYasi } from "./karakter.ts";
import { mesrepEtkisi } from "./mesrep.ts";
import { oyuncuRef } from "./ortak.ts";
import { ayniKume, TEVECCUH_ETKI, teveccuhKademesi } from "./teveccuh.ts";
import { toplulukAl, type ToplulukKaydi } from "./topluluk-kayit.ts";
import type { Karakter, Kasaba, OlayTaslagi } from "./tipler.ts";

/** [PARAMETRE] Üye sayısı aralığı, kasaba başı zaviye sayısı, kurucu yaşı, kuruluş bedeli (akçe, dünyadan çıkar). */
export const ZAVIYE_EN_AZ = 5;
export const ZAVIYE_EN_COK = 30;
export const ZAVIYE_KASABA_EN_COK = 12;
export const ZAVIYE_YAS = 16;
export const ZAVIYE_KURULUS_BEDELI = 20;
/** [PARAMETRE] Davet süresi (ay), işlem başı yatırım tavanı, kasadan üye başı aylık verme tavanı, alan üye kıdemi (ay). */
export const ZAVIYE_DAVET_SURE = 4;
export const ZAVIYE_YATIR_EN_COK = 200;
export const ZAVIYE_VER_AYLIK = 50;
export const ZAVIYE_VER_KIDEM = 2;
/** [PARAMETRE] Kasa defterinde tutulan hareket sayısı. */
export const ZAVIYE_HAREKET_EN_COK = 40;
export const ARMA_SEKILLERI = ["kalkan", "hilal", "yildiz", "lale", "ok", "cark"] as const;
export const ARMA_RENKLERI = ["al", "lacivert", "yesil", "altin", "siyah", "beyaz"] as const;

export interface ZaviyeUyesi {
  o: string;
  ay: number;
}

export interface Zaviye {
  i: number;
  ad: string;
  /** Arma: [şekil, renk] dizinleri. */
  ar: [number, number];
  /** Kurucu ve ahi başı (yerel kimlik). */
  ku: string;
  ab?: string;
  u: ZaviyeUyesi[];
  /** Kasa (emanet akçe) ve hareketleri: [ay, kim, alan ("" = kasa), tutar]. */
  ks: number;
  kh: [ay: number, kim: string, alan: string, tutar: number][];
  /** Davetler: [davet edilen, ay]. Oylar: üye → aday. */
  dv: [o: string, ay: number][];
  oy: Record<string, string>;
  ac: number;
}

export const zaviyeKimlik = (i: number): string => `z${i}`;
export function zaviyeCoz(ham: unknown): number | undefined {
  if (typeof ham === "number" && Number.isInteger(ham)) return ham;
  if (typeof ham !== "string") return undefined;
  const m = /^z?([1-9][0-9]{0,6})$/.exec(ham);
  return m?.[1] ? Number(m[1]) : undefined;
}

export function zaviyesi(tl: ToplulukKaydi | undefined, o: string): Zaviye | undefined {
  return tl?.zv.find((z) => z.u.some((x) => x.o === o));
}

export const kuruluyor = (z: Zaviye): boolean => z.u.length < ZAVIYE_EN_AZ;

/** Yönetici: ahi başı; yoksa kurucu (üyeyse) vekil; o da yoksa en eski üye. */
export function yonetici(z: Zaviye): string | undefined {
  if (z.ab && z.u.some((x) => x.o === z.ab)) return z.ab;
  if (z.u.some((x) => x.o === z.ku)) return z.ku;
  return z.u[0]?.o;
}

/** Ahi başı adaylığı için gereken teveccüh kademesi (meşrep gururu kaydırır). */
export function ahiSarti(k: Karakter): number {
  return Math.max(1, TEVECCUH_ETKI.ahiKademe + mesrepEtkisi(k, "ahiKademe"));
}

export function ahiAdayiMi(k: Karakter, ay: number): boolean {
  return !olduMu(k) && teveccuhKademesi(k, ay) >= ahiSarti(k);
}

/** Kanca (siyaset, §8 lonca temsilcisi): kasabadaki ahi başları. */
export function ahiBaslari(k: Pick<Kasaba, "tl">): { zaviye: string; ahiBasi: string }[] {
  return (k.tl?.zv ?? []).filter((z) => z.ab && !kuruluyor(z)).map((z) => ({ zaviye: zaviyeKimlik(z.i), ahiBasi: z.ab! }));
}

function hareket(z: Zaviye, ay: number, kim: string, alan: string, tutar: number): void {
  z.kh.push([ay, kim, alan, tutar]);
  if (z.kh.length > ZAVIYE_HAREKET_EN_COK) z.kh.splice(0, z.kh.length - ZAVIYE_HAREKET_EN_COK);
}

function armaCoz(govde: Record<string, unknown>): [number, number] | undefined {
  const s = ARMA_SEKILLERI.indexOf(govde.sekil as (typeof ARMA_SEKILLERI)[number]);
  const r = ARMA_RENKLERI.indexOf(govde.renk as (typeof ARMA_RENKLERI)[number]);
  return s >= 0 && r >= 0 ? [s, r] : undefined;
}

function tutarCoz(ham: unknown, enCok: number): number | undefined {
  return typeof ham === "number" && Number.isInteger(ham) && ham >= 1 && ham <= enCok ? ham : undefined;
}

export interface ZaviyeSonucu {
  yanit: Record<string, unknown>;
  olaylar: OlayTaslagi[];
  digerleri: string[];
}

/**
 * POST /v1/zaviye {islem, ...}: kur {ad, sekil, renk} · davet {hedef} · katil {zaviye} · reddet {zaviye} · ayril ·
 * cikar {hedef} · yatir {tutar} · ver {hedef, tutar} · arma {sekil, renk} · oy {hedef}.
 */
export function zaviyeIslem(k: Kasaba, kar: Karakter, govde: Record<string, unknown>, ay: number): Sonuc<ZaviyeSonucu> {
  const tl = toplulukAl(k);
  const islem = govde.islem;
  const benim = zaviyesi(tl, kar.o);
  const sonuc = (z: Zaviye, olaylar: OlayTaslagi[] = [], digerleri: string[] = []) =>
    basarili({ yanit: { zaviye: zaviyeGorunumu(k, z, kar.o, ay) }, olaylar, digerleri });
  const hedefKar = typeof govde.hedef === "string" ? k.kar.get(govde.hedef) : undefined;
  switch (islem) {
    case "kur": {
      if (benim) return hata("zaviye_var");
      if (karakterYasi(kar, ay) < ZAVIYE_YAS) return hata("yas_kapisi");
      if (tl.zv.length >= ZAVIYE_KASABA_EN_COK) return hata("zaviye_dolu");
      const a = adDogrula(govde.ad);
      if (!a.ok) return hata(a.hata);
      if (tl.zv.some((z) => z.ad.toLocaleLowerCase("tr") === a.ad.toLocaleLowerCase("tr"))) return hata("ad_alinmis");
      const ar = armaCoz(govde);
      if (!ar) return hata("zaviye_gecersiz");
      if (kar.pa < ZAVIYE_KURULUS_BEDELI) return hata("para_yok");
      kar.pa -= ZAVIYE_KURULUS_BEDELI;
      const z: Zaviye = { i: tl.zn++, ad: a.ad, ar, ku: kar.o, u: [{ o: kar.o, ay }], ks: 0, kh: [], dv: [], oy: {}, ac: ay };
      tl.zv.push(z);
      for (const d of tl.zv) d.dv = d.dv.filter(([o]) => o !== kar.o);
      return sonuc(z, [{ t: "zaviye", w: kar.o, h: "", g: "", n: 5, k: "olay.zaviye.kuruldu", p: { kisi: oyuncuRef(kar), zaviye: a.ad } }]);
    }
    case "davet": {
      if (!benim) return hata("zaviye_yok");
      if (yonetici(benim) !== kar.o) return hata("yetki_yok");
      if (!hedefKar || olduMu(hedefKar)) return hata("kisi_yok");
      if (hedefKar.o === kar.o) return hata("kendi_hedef");
      if (engelliMi(k.tp, kar.o, hedefKar.o)) return hata("engelli");
      if (zaviyesi(tl, hedefKar.o)) return hata("zaviye_var");
      if (benim.u.length + benim.dv.length >= ZAVIYE_EN_COK) return hata("zaviye_dolu");
      if (!benim.dv.some(([o]) => o === hedefKar.o)) benim.dv.push([hedefKar.o, ay]);
      return sonuc(benim, [{ t: "zaviye", w: kar.o, h: hedefKar.o, g: hedefKar.o, n: 5, k: "olay.zaviye.davet", p: { kisi: oyuncuRef(kar), zaviye: benim.ad } }]);
    }
    case "katil":
    case "reddet": {
      const zi = zaviyeCoz(govde.zaviye);
      const z = tl.zv.find((x) => x.i === zi);
      if (!z) return hata("zaviye_yok");
      if (!z.dv.some(([o]) => o === kar.o)) return hata("davet_yok");
      z.dv = z.dv.filter(([o]) => o !== kar.o);
      if (islem === "reddet") return basarili({ yanit: { reddedildi: zaviyeKimlik(z.i) }, olaylar: [], digerleri: [] });
      if (benim) return hata("zaviye_var");
      if (z.u.length >= ZAVIYE_EN_COK) return hata("zaviye_dolu");
      const once = kuruluyor(z);
      z.u.push({ o: kar.o, ay });
      for (const d of tl.zv) d.dv = d.dv.filter(([o]) => o !== kar.o);
      const olaylar: OlayTaslagi[] = [{ t: "zaviye", w: kar.o, h: "", g: "", n: 3, k: "olay.zaviye.katildi", p: { kisi: oyuncuRef(kar), zaviye: z.ad } }];
      if (once && !kuruluyor(z)) olaylar.push({ t: "zaviye", w: "", h: "", g: "", n: 6, k: "olay.zaviye.acildi", p: { zaviye: z.ad, uye: z.u.length } });
      return sonuc(z, olaylar);
    }
    case "ayril": {
      if (!benim) return hata("zaviye_yok");
      return basarili({ ...ayril(tl, benim, kar, ay), digerleri: [] });
    }
    case "cikar": {
      if (!benim) return hata("zaviye_yok");
      if (yonetici(benim) !== kar.o) return hata("yetki_yok");
      if (!hedefKar || !benim.u.some((x) => x.o === hedefKar.o)) return hata("kisi_yok");
      if (hedefKar.o === kar.o) return hata("kendi_hedef");
      benim.u = benim.u.filter((x) => x.o !== hedefKar.o);
      delete benim.oy[hedefKar.o];
      if (benim.ab === hedefKar.o) delete benim.ab;
      return sonuc(benim, [{ t: "zaviye", w: kar.o, h: hedefKar.o, g: hedefKar.o, n: 4, k: "olay.zaviye.cikarildi", p: { zaviye: benim.ad } }]);
    }
    case "yatir": {
      if (!benim) return hata("zaviye_yok");
      if (kuruluyor(benim)) return hata("zaviye_kuruluyor");
      const t = tutarCoz(govde.tutar, ZAVIYE_YATIR_EN_COK);
      if (t === undefined) return hata("tutar_gecersiz");
      if (kar.pa < t) return hata("para_yok");
      kar.pa -= t;
      benim.ks += t;
      hareket(benim, ay, kar.o, "", t);
      return sonuc(benim);
    }
    case "ver": {
      if (!benim) return hata("zaviye_yok");
      if (kuruluyor(benim)) return hata("zaviye_kuruluyor");
      if (yonetici(benim) !== kar.o) return hata("yetki_yok");
      const uye = hedefKar ? benim.u.find((x) => x.o === hedefKar.o) : undefined;
      if (!hedefKar || !uye || olduMu(hedefKar)) return hata("kisi_yok");
      if (hedefKar.o === kar.o) return hata("kendi_hedef");
      if (ayniKume(kar, hedefKar)) return hata("ayni_kume");
      if (ay - uye.ay < ZAVIYE_VER_KIDEM) return hata("kidem_yetersiz");
      const t = tutarCoz(govde.tutar, ZAVIYE_VER_AYLIK);
      if (t === undefined) return hata("tutar_gecersiz");
      const buAy = benim.kh.filter((h) => h[0] === ay && h[2] === hedefKar.o).reduce((a, h) => a + h[3], 0);
      if (buAy + t > ZAVIYE_VER_AYLIK) return hata("tavan_doldu");
      if (benim.ks < t) return hata("para_yok");
      benim.ks -= t;
      hedefKar.pa += t;
      hareket(benim, ay, kar.o, hedefKar.o, t);
      return sonuc(
        benim,
        [{ t: "zaviye", w: kar.o, h: hedefKar.o, g: hedefKar.o, n: 4, k: "olay.zaviye.kasadan", p: { zaviye: benim.ad, tutar: t } }],
        [hedefKar.o],
      );
    }
    case "arma": {
      if (!benim) return hata("zaviye_yok");
      if (kuruluyor(benim)) return hata("zaviye_kuruluyor");
      if (yonetici(benim) !== kar.o) return hata("yetki_yok");
      const ar = armaCoz(govde);
      if (!ar) return hata("zaviye_gecersiz");
      benim.ar = ar;
      return sonuc(benim);
    }
    case "oy": {
      if (!benim) return hata("zaviye_yok");
      if (!hedefKar || !benim.u.some((x) => x.o === hedefKar.o)) return hata("kisi_yok");
      if (!ahiAdayiMi(hedefKar, ay)) return hata("aday_uygun_degil");
      benim.oy[kar.o] = hedefKar.o;
      return sonuc(benim);
    }
  }
  return hata("zaviye_gecersiz");
}

function ayril(tl: ToplulukKaydi, z: Zaviye, kar: Karakter, ay: number): { yanit: Record<string, unknown>; olaylar: OlayTaslagi[] } {
  z.u = z.u.filter((x) => x.o !== kar.o);
  delete z.oy[kar.o];
  for (const [o, a] of Object.entries(z.oy)) if (a === kar.o) delete z.oy[o];
  if (z.ab === kar.o) delete z.ab;
  const olaylar: OlayTaslagi[] = [{ t: "zaviye", w: kar.o, h: "", g: "", n: 3, k: "olay.zaviye.ayrildi", p: { kisi: oyuncuRef(kar), zaviye: z.ad } }];
  let iade = 0;
  if (z.u.length === 0) {
    iade = z.ks;
    kar.pa += iade;
    z.ks = 0;
    tl.zv = tl.zv.filter((x) => x !== z);
    olaylar.push({ t: "zaviye", w: "", h: "", g: "", n: 4, k: "olay.zaviye.dagildi", p: { zaviye: z.ad } });
  }
  return { yanit: { ayrildi: zaviyeKimlik(z.i), kasaIadesi: iade }, olaylar };
}

/** Ay dönümü: davetler düşer, ölü üyeler çıkar, ahi başı oyla seçilir (yarı eşiği; şartı taşıyan aday). */
export function zaviyeDonumu(k: Kasaba, ay: number): OlayTaslagi[] {
  const tl = k.tl;
  if (!tl || tl.zv.length === 0) return [];
  const olaylar: OlayTaslagi[] = [];
  for (const z of [...tl.zv]) {
    z.dv = z.dv.filter(([, a]) => ay - a < ZAVIYE_DAVET_SURE);
    for (const u of [...z.u]) {
      const c = k.kar.get(u.o);
      if (c && olduMu(c)) {
        const r = ayril(tl, z, c, ay);
        olaylar.push(...r.olaylar);
      }
    }
    if (!tl.zv.includes(z) || kuruluyor(z)) continue;
    const say = new Map<string, number>();
    for (const [uye, aday] of Object.entries(z.oy)) {
      if (!z.u.some((x) => x.o === uye) || !z.u.some((x) => x.o === aday)) continue;
      say.set(aday, (say.get(aday) ?? 0) + 1);
    }
    const esik = Math.ceil(z.u.length / 2);
    let en: [string, number] | undefined;
    for (const [aday, n] of [...say].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))) {
      const c = k.kar.get(aday);
      if (c && ahiAdayiMi(c, ay) && n >= esik) {
        en = [aday, n];
        break;
      }
    }
    if (en && en[0] !== z.ab) {
      z.ab = en[0];
      olaylar.push({ t: "zaviye", w: en[0], h: "", g: "", n: 6, k: "olay.zaviye.ahiBasi", p: { zaviye: z.ad, oy: en[1] } });
    }
  }
  return olaylar;
}

function ad(k: Kasaba, o: string): string {
  return k.sakin.find((s) => s.o === o)?.ad ?? o;
}

/** Zaviye görünümü: üyeler (rol, kıdem, meslek), kasa ve defter (yalnız üyelere), arma, oy durumu, usta-çırak. */
export function zaviyeGorunumu(k: Kasaba, z: Zaviye, ben: string, ay: number) {
  const uyeMi = z.u.some((x) => x.o === ben);
  const yon = yonetici(z);
  const oySay: Record<string, number> = {};
  for (const [u, a] of Object.entries(z.oy)) if (z.u.some((x) => x.o === u)) oySay[a] = (oySay[a] ?? 0) + 1;
  const uyeler = new Set(z.u.map((x) => x.o));
  const ustaCirak = (k.tp?.tk ?? [])
    .filter((t) => t.t === "cirak" && t.d === "surer" && uyeler.has(t.g) && uyeler.has(t.a))
    .map((t) => ({ usta: t.s.us ?? t.g, cirak: t.s.us === t.g ? t.a : t.g, meslek: t.s.m ?? null }));
  return {
    id: zaviyeKimlik(z.i),
    ad: z.ad,
    arma: { sekil: ARMA_SEKILLERI[z.ar[0]], renk: ARMA_RENKLERI[z.ar[1]] },
    durum: kuruluyor(z) ? "kuruluyor" : "acik",
    kurulus: z.ac,
    uyeSayisi: z.u.length,
    sinir: { enAz: ZAVIYE_EN_AZ, enCok: ZAVIYE_EN_COK },
    ahiBasi: z.ab ? { id: z.ab, ad: ad(k, z.ab) } : null,
    yonetici: yon ? { id: yon, ad: ad(k, yon), vekil: yon !== z.ab } : null,
    uyeler: z.u.map((x) => ({
      id: x.o,
      ad: ad(k, x.o),
      meslek: k.sakin.find((s) => s.o === x.o)?.ms ?? null,
      katilis: x.ay,
      rol: x.o === z.ab ? "ahiBasi" : x.o === z.ku ? "kurucu" : "uye",
      ...(uyeMi ? { oy: oySay[x.o] ?? 0 } : {}),
    })),
    ...(uyeMi
      ? {
          kasa: z.ks,
          kasaDefteri: z.kh.map(([a, kim, alan, tutar]) => ({ ay: a, kim, alan: alan || null, tutar })),
          davetler: z.dv.map(([o, a]) => ({ id: o, ad: ad(k, o), ay: a })),
          oyum: z.oy[ben] ?? null,
          oyEsigi: Math.ceil(z.u.length / 2),
          ustaCirak,
          rolum: ben === yon ? "yonetici" : "uye",
        }
      : {}),
  };
}

export const ZAVIYE_KURALLARI = {
  uye: { enAz: ZAVIYE_EN_AZ, enCok: ZAVIYE_EN_COK },
  kasabaEnCok: ZAVIYE_KASABA_EN_COK,
  yas: ZAVIYE_YAS,
  kurulusBedeli: ZAVIYE_KURULUS_BEDELI,
  davetSure: ZAVIYE_DAVET_SURE,
  yatirEnCok: ZAVIYE_YATIR_EN_COK,
  verAylik: ZAVIYE_VER_AYLIK,
  verKidem: ZAVIYE_VER_KIDEM,
  ahi: { teveccuhKademe: TEVECCUH_ETKI.ahiKademe, mesrep: { gururlu: -1, mutevazi: 1 }, oyEsigi: "yari" },
  arma: { sekiller: ARMA_SEKILLERI, renkler: ARMA_RENKLERI },
} as const;

/** Oyuncunun zaviye görünümü: üyeliği, bekleyen davetleri, kasabadaki zaviyeler (özet), ahi şartı. */
export function zaviyeOzeti(k: Kasaba, kar: Karakter, ay: number) {
  const tl = k.tl;
  const benim = zaviyesi(tl, kar.o);
  return {
    benim: benim ? zaviyeGorunumu(k, benim, kar.o, ay) : null,
    davetler: (tl?.zv ?? []).filter((z) => z.dv.some(([o]) => o === kar.o)).map((z) => ({ id: zaviyeKimlik(z.i), ad: z.ad, uyeSayisi: z.u.length })),
    kasabada: (tl?.zv ?? []).map((z) => ({
      id: zaviyeKimlik(z.i),
      ad: z.ad,
      arma: { sekil: ARMA_SEKILLERI[z.ar[0]], renk: ARMA_RENKLERI[z.ar[1]] },
      uyeSayisi: z.u.length,
      durum: kuruluyor(z) ? "kuruluyor" : "acik",
      ahiBasi: z.ab ? ad(k, z.ab) : null,
    })),
    ahiSarti: { teveccuhKademe: ahiSarti(kar), benimKademem: teveccuhKademesi(kar, ay), adayim: ahiAdayiMi(kar, ay) },
    kurallar: ZAVIYE_KURALLARI,
  };
}
