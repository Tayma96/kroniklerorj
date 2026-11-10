// Hami (Ek A §3.2, E6; D-34): deneyimli bir oyuncu yeni gelen bir oyuncuyu ağırlar. Bağ iki tarafın rızasıyla kurulur
// (hami teklif eder ya da yeni gelen ister; karşı taraf kabul eder). Kabulde yeni gelen hamisinin evinde misafir olur:
// barınmada "hami" konaklaması sayılır (§18 misafir daveti; evsizlik zincirine girmez).
// - Hami AKÇE ALMAZ, para aktarımı yoktur; yalnız nam kazanır ve yalnız çırağın TANIMLI AŞAMALARINDA: ilk barınma
//   (kendi konaklamasını tutması), ilk sanat kademesi (kalfa), ilk sözleşme (hami dışında biriyle kabul edilmiş
//   teklif ya da teslim edilmiş ısmarlama/sipariş). Her aşama bağ başına tek sefer; bağ kurulmadan önce geçilmiş
//   aşamalar sayılmaz.
// - Sömürü önlemi: hami ile çırak aynı hesap kümesi (aynı hesap ya da aynı ocak) olamaz; hami aynı anda en çok N
//   çırağa bakar; hamiye aylık (oyun ayı = 12 gerçek saat) nam tavanı ve genel aylık nam tavanı uygulanır.
// - Usta-çırak meslek öğretmenidir ve Faz 3 teklifiyle (`teklif.ts`, tür "cirak") sürer; hami sosyal sponsordur,
//   ikisi aynı kişi olabilir.
// Saf fonksiyonlar.

import type { MeslekId } from "../icerik/meslekler.ts";
import { AY_MS } from "../saat.ts";
import { basarili, hata, type HataKodu, type Sonuc } from "../tipler.ts";
import { barinmaKaydi, ocakVar } from "./barinma.ts";
import { engelliMi } from "./engel.ts";
import { olduMu } from "./hanedan.ts";
import { karakterYasi, namEkle, type Nam } from "./karakter.ts";
import { oyuncuRef } from "./ortak.ts";
import { ayniKume } from "./teveccuh.ts";
import { toplulukAl, type ToplulukKaydi } from "./topluluk-kayit.ts";
import type { Karakter, Kasaba, OlayTaslagi } from "./tipler.ts";

export const HAMI_ASAMALARI = ["barinma", "kademe", "sozlesme"] as const;
export type HamiAsamasi = (typeof HAMI_ASAMALARI)[number];
/** [PARAMETRE] Aşama başına hamiye nam (D-34) ve nam türü. */
export const HAMI_NAM: Readonly<Record<HamiAsamasi, number>> = { barinma: 1, kademe: 2, sozlesme: 1 };
export const HAMI_NAM_TURU: Nam = "comertlik";
/** [PARAMETRE] Hamiye hami namı aylık tavanı (oyun ayı; genel NAM_AYLIK_TAVAN ayrıca uygulanır). */
export const HAMI_AYLIK_NAM_TAVANI = 3;
/** [PARAMETRE] Eşzamanlı çırak, açık teklif, teklif süresi (ay) ve bağ süresi (ay). */
export const HAMI_CIRAK_EN_COK = 3;
export const HAMI_ACIK_TEKLIF_EN_COK = 5;
export const HAMI_TEKLIF_SURE = 2;
export const HAMI_BAG_SURE = 24;
/** [PARAMETRE] Hami: en az bu yaş ve bir meslekte en az bu kademe. Yeni gelen: bu yaşın altı ve kalfa değil. */
export const HAMI_YAS = 16;
export const HAMI_KADEME = 1;
export const YENI_GELEN_YAS = 15;
/** [PARAMETRE] Kabulde yeni gelenin hamisinin evinde misafirliği (gerçek ms). */
export const HAMI_MISAFIR_MS = 6 * AY_MS;
/** [PARAMETRE] Tutulan kapanmış bağ sayısı. */
export const HAMI_KAPALI_TUTULAN = 40;

export interface HamiBagi {
  /** Hami ve çırak (yerel kimlik), gönderen. */
  h: string;
  c: string;
  g: string;
  d: "acik" | "surer" | "bitti" | "ret" | "dustu";
  /** Açılış ayı; kabul ayı; bitiş ayı (süre). */
  ay: number;
  ka?: number;
  bt?: number;
  /** Aşama bitleri: ödüllenen ve kabulde zaten geçilmiş (ödülsüz) aşamalar. */
  as: number;
  ib?: number;
  /** Kapanış nedeni (i18n son eki). */
  sn?: string;
}

const bit = (a: HamiAsamasi) => 1 << HAMI_ASAMALARI.indexOf(a);

function enYuksekKademe(k: Karakter): number {
  let kd = 0;
  for (const i of Object.values(k.ms?.s ?? {})) kd = Math.max(kd, i?.kd ?? 0);
  return kd;
}

export function hamiOlabilir(k: Karakter, ay: number): boolean {
  return !olduMu(k) && karakterYasi(k, ay) >= HAMI_YAS && enYuksekKademe(k) >= HAMI_KADEME;
}

export function yeniGelenMi(k: Karakter, ay: number): boolean {
  return !olduMu(k) && karakterYasi(k, ay) < YENI_GELEN_YAS && enYuksekKademe(k) < HAMI_KADEME;
}

/** Çırağın geçtiği aşamalar (bit maskesi). Hami ile yapılan sözleşme sayılmaz. */
export function asamaBitleri(k: Kasaba, c: Karakter, hami: string): number {
  let b = 0;
  if ((c.br?.od.length ?? 0) > 0 || (c.br?.ts.length ?? 0) > 0) b |= bit("barinma");
  if (enYuksekKademe(c) >= 1) b |= bit("kademe");
  const teklif = (k.tp?.tk ?? []).some(
    (t) =>
      (t.t === "cirak" || t.t === "ortak" || t.t === "borc" || t.t === "npcIs") &&
      t.ka !== undefined &&
      (t.d === "surer" || t.d === "bitti") &&
      ((t.g === c.o && t.a !== hami) || (t.a === c.o && t.g !== hami)),
  );
  const teslim = (c.ig?.[0] ?? 0) > 0 || Object.keys(c.bs ?? {}).some((x) => x.startsWith("teslim:"));
  if (teklif || teslim) b |= bit("sozlesme");
  return b;
}

const suren = (tl: ToplulukKaydi, o: string) => tl.hb.filter((b) => b.d === "surer" && (b.h === o || b.c === o));

/** Hamiye ait aylık nam sayacı: [ay, verilen]. */
function hamiNamVer(hami: Karakter, ay: number, miktar: number): number {
  const s = hami.hk && hami.hk[0] === ay ? hami.hk[1] : 0;
  const izin = Math.max(0, Math.min(miktar, HAMI_AYLIK_NAM_TAVANI - s));
  const e = izin ? namEkle(hami, ay, HAMI_NAM_TURU, izin) : 0;
  hami.hk = [ay, s + e];
  return e;
}

export interface HamiSonucu {
  yanit: Record<string, unknown>;
  olaylar: OlayTaslagi[];
  digerleri: string[];
}

/**
 * POST /v1/hami {islem: teklif|iste|kabul|ret|birak, hedef}. teklif: ben hamiyim, hedef yeni gelen; iste: ben yeni
 * gelenim, hedef hami. kabul/ret: hedef açık bağın göndereni. birak: süren bağı iki taraftan biri bitirir.
 */
export function hamiIslem(k: Kasaba, kar: Karakter, govde: Record<string, unknown>, ay: number, simdi: number): Sonuc<HamiSonucu> {
  const islem = govde.islem;
  const hedefId = typeof govde.hedef === "string" ? govde.hedef : "";
  const diger = k.kar.get(hedefId);
  if (!diger || olduMu(diger)) return hata("kisi_yok");
  if (diger.o === kar.o) return hata("kendi_hedef");
  const tl = toplulukAl(k);
  if (islem === "teklif" || islem === "iste") {
    const hami = islem === "teklif" ? kar : diger;
    const cirak = islem === "teklif" ? diger : kar;
    const r = baglanabilir(k, tl, hami, cirak, ay);
    if (r) return hata(r);
    if (tl.hb.some((b) => b.d === "acik" && b.h === hami.o && b.c === cirak.o)) return hata("hami_var");
    if (tl.hb.filter((b) => b.d === "acik" && b.g === kar.o).length >= HAMI_ACIK_TEKLIF_EN_COK) return hata("teklif_siniri");
    const b: HamiBagi = { h: hami.o, c: cirak.o, g: kar.o, d: "acik", ay, as: 0 };
    tl.hb.push(b);
    return basarili({
      yanit: { bag: bagGorunumu(k, b, kar.o) },
      olaylar: [{ t: "hami", w: kar.o, h: diger.o, g: diger.o, n: 5, k: `olay.hami.${islem}`, p: { kisi: oyuncuRef(kar) } }],
      digerleri: [],
    });
  }
  if (islem === "kabul" || islem === "ret") {
    const b = tl.hb.find((x) => x.d === "acik" && x.g === diger.o && (x.h === kar.o || x.c === kar.o));
    if (!b) return hata("bag_yok");
    if (islem === "ret") {
      b.d = "ret";
      return basarili({
        yanit: { bag: bagGorunumu(k, b, kar.o) },
        olaylar: [{ t: "hami", w: kar.o, h: diger.o, g: diger.o, n: 3, k: "olay.hami.ret", p: { kisi: oyuncuRef(kar) } }],
        digerleri: [],
      });
    }
    const hami = b.h === kar.o ? kar : diger;
    const cirak = b.c === kar.o ? kar : diger;
    const r = baglanabilir(k, tl, hami, cirak, ay);
    if (r) return hata(r);
    b.d = "surer";
    b.ka = ay;
    b.bt = ay + HAMI_BAG_SURE;
    b.ib = asamaBitleri(k, cirak, hami.o);
    // Hamisinin evinde misafirlik (barınma: "hami" konaklaması).
    const br = barinmaKaydi(cirak, k.y, simdi, ocakVar(k, cirak));
    br.hm = [k.y, simdi, simdi + HAMI_MISAFIR_MS, hami.o];
    // Öteki açık teklifleri (bu çırak için) kapanır.
    for (const x of tl.hb) if (x !== b && x.d === "acik" && x.c === cirak.o) x.d = "dustu";
    return basarili({
      yanit: { bag: bagGorunumu(k, b, kar.o), misafirlikBitis: simdi + HAMI_MISAFIR_MS },
      olaylar: [{ t: "hami", w: kar.o, h: diger.o, g: diger.o, n: 6, k: "olay.hami.kabul", p: { kisi: oyuncuRef(kar) } }],
      digerleri: [diger.o],
    });
  }
  if (islem === "birak") {
    const b = tl.hb.find((x) => x.d === "surer" && ((x.h === kar.o && x.c === diger.o) || (x.c === kar.o && x.h === diger.o)));
    if (!b) return hata("bag_yok");
    b.d = "bitti";
    b.sn = "birakti";
    if (diger.o === b.c && diger.br?.hm?.[3] === kar.o) diger.br.hm[2] = Math.min(diger.br.hm[2], simdi);
    if (kar.o === b.c && kar.br?.hm?.[3] === diger.o) kar.br.hm[2] = Math.min(kar.br.hm[2], simdi);
    return basarili({
      yanit: { bag: bagGorunumu(k, b, kar.o) },
      olaylar: [{ t: "hami", w: kar.o, h: diger.o, g: diger.o, n: 4, k: "olay.hami.birakti", p: { kisi: oyuncuRef(kar) } }],
      digerleri: [diger.o],
    });
  }
  return hata("hami_gecersiz");
}

function baglanabilir(k: Kasaba, tl: ToplulukKaydi, hami: Karakter, cirak: Karakter, ay: number): HataKodu | undefined {
  if (!hamiOlabilir(hami, ay) || !yeniGelenMi(cirak, ay)) return "hami_uygun_degil";
  if (ayniKume(hami, cirak)) return "ayni_kume";
  if (engelliMi(k.tp, hami.o, cirak.o)) return "engelli";
  if (suren(tl, cirak.o).some((b) => b.c === cirak.o)) return "hami_var";
  // Bir yeni gelen ömründe tek bağ kurar (bitmiş bağ yeniden açılmaz: döngüyle nam üretilmesin).
  if (tl.hb.some((b) => b.c === cirak.o && b.d === "bitti")) return "hami_var";
  if (suren(tl, hami.o).filter((b) => b.h === hami.o).length >= HAMI_CIRAK_EN_COK) return "hami_dolu";
  return undefined;
}

/** Ay dönümü: düşen teklifler, ölen/süresi dolan bağlar, yeni geçilen aşamalar için hamiye nam (tek sefer). */
export function hamiDonumu(k: Kasaba, ay: number): OlayTaslagi[] {
  const tl = k.tl;
  if (!tl || tl.hb.length === 0) return [];
  const olaylar: OlayTaslagi[] = [];
  for (const b of tl.hb) {
    if (b.d === "acik") {
      if (ay - b.ay >= HAMI_TEKLIF_SURE) b.d = "dustu";
      continue;
    }
    if (b.d !== "surer") continue;
    const hami = k.kar.get(b.h);
    const cirak = k.kar.get(b.c);
    if (!hami || !cirak || olduMu(hami) || olduMu(cirak)) {
      b.d = "bitti";
      b.sn = "oldu";
      continue;
    }
    const gecilen = asamaBitleri(k, cirak, b.h) & ~(b.ib ?? 0) & ~b.as;
    for (const a of HAMI_ASAMALARI) {
      if (!(gecilen & bit(a))) continue;
      b.as |= bit(a);
      const nam = hamiNamVer(hami, ay, HAMI_NAM[a]);
      olaylar.push({ t: "hami", w: cirak.o, h: hami.o, g: hami.o, n: 5, k: "olay.hami.asama", p: { kisi: oyuncuRef(cirak), asama: a, nam } });
    }
    const hepsi = HAMI_ASAMALARI.every((a) => ((b.as | (b.ib ?? 0)) & bit(a)) !== 0);
    if (hepsi || ay >= (b.bt ?? ay)) {
      b.d = "bitti";
      b.sn = hepsi ? "tamam" : "sure";
    }
  }
  const kapali = tl.hb.filter((b) => b.d !== "acik" && b.d !== "surer");
  if (kapali.length > HAMI_KAPALI_TUTULAN) {
    // Bitmiş bağların izi (tek bağ kuralı) korunur; yalnız ret/düşen eskiler budanır.
    const budanir = kapali.filter((b) => b.d !== "bitti");
    const sil = new Set(budanir.slice(0, Math.max(0, kapali.length - HAMI_KAPALI_TUTULAN)));
    tl.hb = tl.hb.filter((b) => !sil.has(b));
  }
  return olaylar;
}

function ad(k: Kasaba, o: string): string {
  return k.sakin.find((s) => s.o === o)?.ad ?? o;
}

function meslekAdi(k: Kasaba, o: string): MeslekId | null {
  return k.sakin.find((s) => s.o === o)?.ms ?? null;
}

export function bagGorunumu(k: Kasaba, b: HamiBagi, ben: string) {
  const asamalar = HAMI_ASAMALARI.map((a) => ({
    asama: a,
    durum: (b.as & bit(a)) !== 0 ? "odullendi" : ((b.ib ?? 0) & bit(a)) !== 0 ? "onceden" : "bekliyor",
    nam: HAMI_NAM[a],
  }));
  return {
    hami: { id: b.h, ad: ad(k, b.h), meslek: meslekAdi(k, b.h) },
    cirak: { id: b.c, ad: ad(k, b.c), meslek: meslekAdi(k, b.c) },
    gonderen: b.g,
    rolum: b.h === ben ? "hami" : b.c === ben ? "cirak" : null,
    durum: b.d,
    acilis: b.ay,
    ...(b.ka !== undefined ? { kabul: b.ka, bitis: b.bt } : {}),
    ...(b.sn ? { neden: b.sn } : {}),
    asamalar,
  };
}

export const HAMI_KURALLARI = {
  akce: 0,
  nam: HAMI_NAM,
  namTuru: HAMI_NAM_TURU,
  aylikNamTavani: HAMI_AYLIK_NAM_TAVANI,
  cirakEnCok: HAMI_CIRAK_EN_COK,
  teklifSure: HAMI_TEKLIF_SURE,
  bagSure: HAMI_BAG_SURE,
  hami: { yas: HAMI_YAS, kademe: HAMI_KADEME },
  yeniGelen: { yasAlti: YENI_GELEN_YAS },
  misafirlikMs: HAMI_MISAFIR_MS,
  ayniKume: "red",
} as const;

/** Oyuncunun hami görünümü: uygunluk, bağları (süren, açık gelen/giden, son bitenler) ve kurallar. */
export function hamiGorunumu(k: Kasaba, kar: Karakter, ay: number) {
  const tl = k.tl;
  const benim = (tl?.hb ?? []).filter((b) => b.h === kar.o || b.c === kar.o);
  return {
    hamiOlabilir: hamiOlabilir(kar, ay),
    yeniGelen: yeniGelenMi(kar, ay),
    suren: benim.filter((b) => b.d === "surer").map((b) => bagGorunumu(k, b, kar.o)),
    gelen: benim.filter((b) => b.d === "acik" && b.g !== kar.o).map((b) => bagGorunumu(k, b, kar.o)),
    giden: benim.filter((b) => b.d === "acik" && b.g === kar.o).map((b) => bagGorunumu(k, b, kar.o)),
    biten: benim.filter((b) => b.d === "bitti").slice(-5).map((b) => bagGorunumu(k, b, kar.o)),
    buAyHamiNami: kar.hk && kar.hk[0] === ay ? kar.hk[1] : 0,
    kurallar: HAMI_KURALLARI,
  };
}
