// Beceri ağacı v2 (spec 2026-11-09 §2–5): tek öğrenme sırası, öğrenme süresi (gerçek zaman, tembel tamamlama),
// iptal (puan iadesi), süre kısaltma (usta eğitimi şimdi; Debdebe sözleşmesi Faz 11'de), yeniden düzenleme (çırak
// kalır, kalfa+ bedelle sıfırlanır), ağaç görünümü ve mesleki geçmiş. Saf fonksiyonlar; zaman `simdi` (ms) ile gelir.

import { AGACLAR, UNVANLAR, beceriDugumu, type BeceriDugumu, type Etki } from "../icerik/agaclar/index.ts";
import { MALLAR } from "../icerik/mallar.ts";
import { MESLEK_IDLERI, meslekBul, type Kademe, type MeslekId } from "../icerik/meslekler.ts";
import { TARIFLER } from "../icerik/tarifler.ts";
import { basarili, hata, type HataKodu, type Sonuc } from "../tipler.ts";
import { gizliGorunur } from "./beceri-etki.ts";
import { kaliteHedefiMi } from "./kalite.ts";
import {
  KADEME_HIZMET,
  beceriPuani,
  bekleyenPuan,
  dugumSeviyesi,
  ilerleme,
  meslekKaydi,
  seviyeBedeli,
  type BeceriPuani,
} from "./meslek.ts";
import { TEMEL_ISLER } from "./temel-is.ts";
import type { BeceriOgrenme, Karakter } from "./tipler.ts";

/** [PARAMETRE] Usta eğitimi kısaltma oranı (kalan sürenin payı), ustanın o meslekteki kademesine göre
 * (çırak, kalfa, usta, pir). Öğrenme başına bir kez; puan ve ön koşul hiçbir yolla atlanmaz. */
export const EGITIM_KISALTMA: readonly number[] = [0, 0.25, 0.35, 0.5];
/** [PARAMETRE] Yeniden düzenleme: akçe bedeli (taban + iade edilen puan başına) ve bekleme süresi (dk; bu sürede
 * yeni öğrenme başlamaz). Akçe kasaba hazinesine gider (toplam akçe korunur). */
export const YENIDEN_AKCE_TABAN = 20;
export const YENIDEN_AKCE_PUAN = 2;
export const YENIDEN_SURE_DK = 24 * 60;
export const HIZLANDIRMA_KAYNAKLARI = ["egitim", "debdebe"] as const;
/** [PARAMETRE] Debdebe (gerçek para) kısaltması: öğrenme başına en çok kullanım, sabit dakikanın ve payın üst sınırı. */
export const DEBDEBE_KISALTMA_EN_COK = 3;
export const DEBDEBE_KISALTMA_DK_EN_COK = 12 * 60;
export const DEBDEBE_KISALTMA_ORAN_EN_COK = 0.5;
/** Debdebe kısaltması: miktar HesapDO'daki katalogdan gelir (oyun modülü Debdebe verisini okumaz). */
export type DebdebeKisaltma = { dk?: number; oran?: number };
const DK = 60_000;

// ---------------------------------------------------------------- etki bağları

/** Etki bir sisteme bağlı mı; değilse kancadır (veri olarak durur, sistemi gelince okunur). */
export function kancaMi(e: Etki): boolean {
  switch (e.tur) {
    case "tarif":
      return !Object.hasOwn(TARIFLER, e.tarif);
    case "is":
      return !Object.hasOwn(TEMEL_ISLER, e.is);
    case "verim":
      return !Object.hasOwn(TARIFLER, e.hedef) && !Object.hasOwn(TEMEL_ISLER, e.hedef);
    case "arac":
      return (!Object.hasOwn(TEMEL_ISLER, e.hedef) && !Object.hasOwn(TARIFLER, e.hedef)) || !Object.hasOwn(MALLAR, e.mal);
    case "omur":
      return !Object.values(TARIFLER).some((t) => "arac" in t && t.arac.mal === e.mal);
    case "kalite":
      // Faz 6: ürün kalitesi (kalite.ts); hedef tarif kimliği ya da tarif grubu olmalı.
      return !kaliteHedefiMi(e.hedef);
    case "tasarruf":
      return (!kaliteHedefiMi(e.hedef) && !Object.hasOwn(TEMEL_ISLER, e.hedef)) || !Object.hasOwn(MALLAR, e.mal);
    case "hizmet":
      return e.hizmet !== "ikram";
    default:
      return true;
  }
}

// ---------------------------------------------------------------- sıra

export interface Tamamlanan {
  tur: "ogrenme" | "yeniden";
  meslek: MeslekId;
  dugum: string;
  seviye: number;
}

/** Süresi dolan öğrenmeyi tamamlar (tembel): seviye yazılır, sıra boşalır. */
export function ogrenmeTamamla(k: Karakter, simdi: number): Tamamlanan | null {
  const bo = k.bo;
  if (!bo || simdi < bo.e) return null;
  delete k.bo;
  if (bo.t === "y") return { tur: "yeniden", meslek: bo.m, dugum: "", seviye: 0 };
  const sv = (ilerleme(k, bo.m).sv ??= {});
  sv[bo.d] = Math.max(sv[bo.d] ?? 0, bo.s);
  return { tur: "ogrenme", meslek: bo.m, dugum: bo.d, seviye: bo.s };
}

export interface OgrenmeGorunumu {
  tur: "ogrenme" | "yeniden";
  meslek: MeslekId;
  dugum: string | null;
  seviye: number | null;
  baslangic: number;
  bitis: number;
  kalanMs: number;
  puan: number;
  egitimleKisaldi: boolean;
}

export function beceriOgrenmeDurumu(k: Karakter, simdi: number): OgrenmeGorunumu | null {
  const bo = k.bo;
  if (!bo) return null;
  return {
    tur: bo.t === "o" ? "ogrenme" : "yeniden",
    meslek: bo.m,
    dugum: bo.t === "o" ? bo.d : null,
    seviye: bo.t === "o" ? bo.s : null,
    baslangic: bo.b,
    bitis: bo.e,
    kalanMs: Math.max(0, bo.e - simdi),
    puan: bo.p,
    egitimleKisaldi: bo.k === 1,
  };
}

/** Düğümün ön koşulları sağlanıyor mu (Pir: herhangi biri). */
function onKosulTamam(k: Karakter, d: BeceriDugumu): boolean {
  if (d.onKosul.length === 0) return true;
  const tamam = (o: { dugum: string; seviye: number }) => dugumSeviyesi(k, o.dugum) >= o.seviye;
  return d.onKosulBiri ? d.onKosul.some(tamam) : d.onKosul.every(tamam);
}

/** Bir sonraki seviyeyi öğrenmenin önündeki engeller (sıralı, ilk hata koduyla eşleşir). */
function engeller(k: Karakter, d: BeceriDugumu): { kod: string; hata: HataKodu }[] {
  const liste: { kod: string; hata: HataKodu }[] = [];
  const mevcut = dugumSeviyesi(k, d.id);
  if (!gizliGorunur(k, d)) liste.push({ kod: "gizli", hata: "dugum_gizli" });
  if (mevcut >= d.seviye) liste.push({ kod: "seviye_tavan", hata: "seviye_tavan" });
  if (k.bo) liste.push({ kod: "ogrenme_suruyor", hata: "ogrenme_suruyor" });
  const i = k.ms?.s[d.meslek];
  if ((i?.kd ?? 0) < d.kademeSarti) liste.push({ kod: "kademe", hata: "kademe_kapali" });
  if (!onKosulTamam(k, d)) liste.push({ kod: "on_kosul", hata: "on_kosul_eksik" });
  const bedel = d.seviyeler[mevcut]?.bedel;
  if (bedel !== undefined && (i ? beceriPuani(i, bekleyenPuan(k, d.meslek)).kalan : 0) < bedel) liste.push({ kod: "puan", hata: "puan_yok" });
  return liste;
}

function dugumCoz(meslekHam: unknown, dugumHam: unknown): Sonuc<BeceriDugumu> {
  const m = meslekBul(meslekHam);
  if (!m) return hata("meslek_gecersiz");
  const d = beceriDugumu(dugumHam);
  if (!d || d.meslek !== m.id) return hata("dugum_gecersiz");
  return basarili(d);
}

/** Öğrenmeyi başlatır: puan ayrılır, süre işler; düğüm bitişte açılır. Hata olursa hiçbir şey değişmez. */
export function beceriOgren(k: Karakter, meslekHam: unknown, dugumHam: unknown, simdi: number): Sonuc<{ ogrenme: OgrenmeGorunumu }> {
  ogrenmeTamamla(k, simdi);
  const r = dugumCoz(meslekHam, dugumHam);
  if (!r.ok) return r;
  const d = r.deger;
  const engel = engeller(k, d)[0];
  if (engel) return hata(engel.hata);
  ilerleme(k, d.meslek);
  const s = d.seviyeler[dugumSeviyesi(k, d.id)]!;
  const bo: BeceriOgrenme = { t: "o", m: d.meslek, d: d.id, s: dugumSeviyesi(k, d.id) + 1, b: simdi, e: simdi + s.sureDk * DK, p: s.bedel };
  k.bo = bo;
  return basarili({ ogrenme: beceriOgrenmeDurumu(k, simdi)! });
}

/** Süren öğrenmeyi iptal eder: ayrılan puan iade edilir, geçen süre kaybolur. Yeniden düzenleme beklemesi iptal olmaz. */
export function beceriIptal(k: Karakter, simdi: number): Sonuc<{ iptal: { meslek: MeslekId; dugum: string; seviye: number }; iadePuan: number }> {
  ogrenmeTamamla(k, simdi);
  const bo = k.bo;
  if (!bo || bo.t !== "o") return hata("ogrenme_yok");
  delete k.bo;
  return basarili({ iptal: { meslek: bo.m, dugum: bo.d, seviye: bo.s }, iadePuan: bo.p });
}

/** Usta eğitimi: süren öğrenmenin mesleğinde karakterin ustası (usta-çırak teklifi) ve ustanın kademesi. */
export type EgitimUstasi = (m: MeslekId) => { o: string; kademe: Kademe } | undefined;

export type HizlandirmaSonucu = {
  kaynak: "egitim" | "debdebe";
  usta: string | null;
  oran: number;
  kisaltmaMs: number;
  ogrenme: OgrenmeGorunumu | null;
  tamamlanan: Tamamlanan | null;
};

/**
 * Süre kısaltma. "egitim": ustası varsa kalan süre ustanın kademesine göre kısalır (öğrenme başına bir kez).
 * "debdebe" (gerçek para): sunucu sözleşmesi hazırdır, ödeme entegrasyonu Faz 11'e dek `hizlandirma_kapali`.
 */
export function beceriHizlandir(k: Karakter, kaynak: unknown, simdi: number, ustaBul: EgitimUstasi, debdebe?: DebdebeKisaltma): Sonuc<HizlandirmaSonucu> {
  if (typeof kaynak !== "string" || !(HIZLANDIRMA_KAYNAKLARI as readonly string[]).includes(kaynak)) return hata("kaynak_gecersiz");
  ogrenmeTamamla(k, simdi);
  const bo = k.bo;
  if (!bo || bo.t !== "o") return hata("ogrenme_yok");
  if (kaynak === "debdebe") {
    // Yalnız süre kısalır: puan ayrılmıştır, ön koşul öğrenme başlarken denetlenmiştir; ikisi de atlanmaz.
    const dk = debdebe?.dk;
    const oranHam = debdebe?.oran;
    const sabit = typeof dk === "number" && Number.isFinite(dk) && dk > 0 ? Math.min(dk, DEBDEBE_KISALTMA_DK_EN_COK) * DK : 0;
    const pay = typeof oranHam === "number" && Number.isFinite(oranHam) && oranHam > 0 ? Math.min(oranHam, DEBDEBE_KISALTMA_ORAN_EN_COK) : 0;
    if (sabit === 0 && pay === 0) return hata("hizlandirma_kapali");
    if ((bo.dk ?? 0) >= DEBDEBE_KISALTMA_EN_COK) return hata("hizlandirma_yok");
    const kalan = bo.e - simdi;
    const kisaltmaMs = Math.min(kalan, Math.floor(sabit + kalan * pay));
    bo.e -= kisaltmaMs;
    bo.dk = (bo.dk ?? 0) + 1;
    const tamamlanan = ogrenmeTamamla(k, simdi);
    return basarili({ kaynak: "debdebe", usta: null, oran: pay, kisaltmaMs, ogrenme: beceriOgrenmeDurumu(k, simdi), tamamlanan });
  }
  if (bo.k === 1) return hata("hizlandirma_yok");
  const u = ustaBul(bo.m);
  const oran = u ? EGITIM_KISALTMA[u.kademe] ?? 0 : 0;
  if (!u || oran <= 0) return hata("hizlandirma_yok");
  const kisaltmaMs = Math.floor((bo.e - simdi) * oran);
  bo.e -= kisaltmaMs;
  bo.k = 1;
  const tamamlanan = ogrenmeTamamla(k, simdi);
  return basarili({ kaynak: "egitim", usta: u.o, oran, kisaltmaMs, ogrenme: beceriOgrenmeDurumu(k, simdi), tamamlanan });
}

export type YenidenSonucu = {
  meslek: MeslekId;
  sifirlanan: { dugum: string; seviye: number }[];
  iadePuan: number;
  bedel: { toplam: number; kalemler: { k: string; d: number }[] };
  ogrenme: OgrenmeGorunumu;
};

/**
 * Yeniden düzenleme: çırak düğümleri silinmez; kalfa, usta, pir ve gizli düğümler sıfırlanır, puanları iade edilir.
 * Bedel akçe (hazineye) + bekleme süresi (bu sürede yeni öğrenme başlamaz). Hata olursa hiçbir şey değişmez.
 */
export function beceriYeniden(k: Karakter, meslekHam: unknown, simdi: number, hazine: { hz: number }): Sonuc<YenidenSonucu> {
  ogrenmeTamamla(k, simdi);
  const m = meslekBul(meslekHam);
  if (!m) return hata("meslek_gecersiz");
  if (k.bo) return hata("ogrenme_suruyor");
  const i = meslekKaydi(k).s[m.id];
  const sifirlanan = Object.entries(i?.sv ?? {})
    .filter(([id, s]) => s > 0 && (beceriDugumu(id)?.kademe ?? 0) >= 1)
    .map(([dugum, seviye]) => ({ dugum, seviye }));
  if (!i || sifirlanan.length === 0) return hata("yeniden_bos");
  const iadePuan = sifirlanan.reduce((a, x) => a + seviyeBedeli(x.dugum, x.seviye), 0);
  const kalemler = [
    { k: "yeniden.taban", d: YENIDEN_AKCE_TABAN },
    { k: "yeniden.puan", d: YENIDEN_AKCE_PUAN * iadePuan },
  ];
  const toplam = kalemler.reduce((a, x) => a + x.d, 0);
  if (k.pa < toplam) return hata("para_yok");
  k.pa -= toplam;
  hazine.hz += toplam;
  for (const x of sifirlanan) delete i.sv![x.dugum];
  k.bo = { t: "y", m: m.id, d: "", s: 0, b: simdi, e: simdi + YENIDEN_SURE_DK * DK, p: 0 };
  return basarili({ meslek: m.id, sifirlanan, iadePuan, bedel: { toplam, kalemler }, ogrenme: beceriOgrenmeDurumu(k, simdi)! });
}

/** Doğrudan seviye yazar (göç, yönetim ve test kurulumu; puan ve sıra denetimi yapmaz, bedeli göç puanı sayar). */
export function seviyeVer(k: Karakter, dugumId: string, seviye: number): void {
  const d = beceriDugumu(dugumId);
  if (!d) return;
  const i = ilerleme(k, d.meslek);
  const sv = (i.sv ??= {});
  const once = sv[d.id] ?? 0;
  const yeni = Math.min(d.seviye, Math.max(once, seviye));
  i.gp = (i.gp ?? 0) + seviyeBedeli(d.id, yeni) - seviyeBedeli(d.id, once);
  sv[d.id] = yeni;
}

// ---------------------------------------------------------------- görünümler

const BOLUMLER = ["cirak", "kalfa", "kalfa2", "usta", "pir", "gizli"] as const;

/** GET /v1/beceri?meslek=: ağaç + oyuncu durumu (seviyeler, puan, öğrenme, kilit nedenleri). */
export function agacGorunumu(k: Karakter, meslekHam: unknown, simdi: number) {
  const kayit = meslekKaydi(k);
  const m = meslekHam === undefined || meslekHam === null || meslekHam === "" ? meslekBul(kayit.a || "demirci") : meslekBul(meslekHam);
  if (!m) return hata("meslek_gecersiz");
  const i = kayit.s[m.id];
  const kd = i?.kd ?? 0;
  const puan: BeceriPuani = beceriPuani(i ?? { kd: 0, hz: 0, cy: 0 }, bekleyenPuan(k, m.id));
  const dugumler = AGACLAR[m.id].dugumler.map((d) => {
    const mevcut = dugumSeviyesi(k, d.id);
    const gorunur = gizliGorunur(k, d);
    const yer = { id: d.id, bolum: d.bolum, kademe: d.kademe, sutun: d.sutun, sira: d.sira, gizli: d.gizli !== undefined, gorunur };
    if (!gorunur) return { ...yer, ikon: "gizli", seviye: 0, azami: d.seviye, durum: "gizli", kilit: ["gizli"] };
    const kilit = engeller(k, d).map((x) => x.kod);
    const ogreniliyor = k.bo?.t === "o" && k.bo.d === d.id;
    const durum = ogreniliyor ? "ogreniliyor" : mevcut >= d.seviye ? "ogrenildi" : kilit.length === 0 ? "acilabilir" : "kilitli";
    const sonraki = d.seviyeler[mevcut];
    return {
      ...yer,
      ad: d.ad,
      ikon: d.ikon,
      seviye: mevcut,
      azami: d.seviye,
      onKosul: d.onKosul.map((o) => ({ ...o, tamam: dugumSeviyesi(k, o.dugum) >= o.seviye })),
      onKosulBiri: d.onKosulBiri,
      kademeSarti: d.kademeSarti,
      seviyeler: d.seviyeler.map((s, n) => ({
        seviye: n + 1,
        bedel: s.bedel,
        sureDk: s.sureDk,
        metin: s.metin,
        etkiler: s.etkiler.map((e) => ({ ...e, kanca: kancaMi(e) })),
      })),
      sonraki: sonraki ? { seviye: mevcut + 1, bedel: sonraki.bedel, sureMs: sonraki.sureDk * DK, metin: sonraki.metin } : null,
      ...(d.gizli ? { gorunme: d.gizli } : {}),
      durum,
      kilit: mevcut >= d.seviye ? [] : kilit,
    };
  });
  return basarili({
    meslek: m.id,
    aktif: kayit.a === m.id,
    kademe: kd,
    kademeHizmet: KADEME_HIZMET,
    puan,
    bolumler: BOLUMLER.map((b) => ({ bolum: b, baslik: `onl.ba.bolum.${b}`, altYazi: `onl.ba.bolum.${b}.alt` })),
    dugumler,
    ogrenme: beceriOgrenmeDurumu(k, simdi),
  });
}

/** `ben` için kısa özet: süren öğrenme ve meslek başına kademe/puan. */
export function beceriOzeti(k: Karakter, simdi: number) {
  const s = meslekKaydi(k).s;
  return {
    ogrenme: beceriOgrenmeDurumu(k, simdi),
    meslekler: Object.fromEntries(
      Object.entries(s).map(([m, i]) => {
        const p = beceriPuani(i!, bekleyenPuan(k, m as MeslekId));
        return [m, { kademe: i!.kd, kalan: p.kalan, kazanilan: p.kazanilan, tavan: p.tavan, ogrenilen: Object.keys(i!.sv ?? {}).length }];
      }),
    ),
    unvanlar: k.un ?? [],
  };
}

/** Profil "Mesleki Geçmişim": meslek başına kademe ve öğrenilmiş beceriler, toplam beceri, unvanlar. Bitmiş ama
 * henüz tamamlanmamış öğrenme de sayılır (öğrenme sırasına dokunmaz). */
export function mesleki(k: Karakter, simdi: number) {
  meslekKaydi(k); // v1 göçü (tekrar güvenli)
  const bitmis = k.bo && k.bo.t === "o" && simdi >= k.bo.e ? k.bo : undefined;
  const meslekler = MESLEK_IDLERI.flatMap((m) => {
    const i = k.ms?.s[m];
    if (!i) return [];
    const sv = { ...(i.sv ?? {}) };
    if (bitmis && bitmis.m === m) sv[bitmis.d] = Math.max(sv[bitmis.d] ?? 0, bitmis.s);
    const ogrenilen = Object.entries(sv)
      .filter(([, s]) => s > 0)
      .map(([dugum, seviye]) => ({ dugum, seviye }));
    if (ogrenilen.length === 0 && i.hz <= 0 && i.kd === 0) return [];
    return [{ meslek: m, kademe: i.kd, ogrenilen }];
  });
  return {
    meslekler,
    toplamBeceri: meslekler.reduce((a, x) => a + x.ogrenilen.length, 0),
    unvanlar: (k.un ?? []).map((id) => ({ id, meslek: UNVANLAR.find((u) => u.id === id)?.meslek ?? null })),
  };
}
