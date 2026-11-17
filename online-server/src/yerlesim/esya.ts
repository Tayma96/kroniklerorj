// Eşya kademeleri ve özellikleri (tezgâh tasarımı §9, Dilim 4). Kademe kalite.ts'tedir (7 kademe); bu dosya
// kademenin anlamını verir: eşya ailesi ve özelliği (kademe arttıkça artan, tavanlı etki çarpanı), hüner (nadide ve
// üstünde tek özel etki), efsanevi denemesi (yalnız pir, yalnız atölyede kendi emeğiyle, ayda sınırlı) ve yadigâr
// (adlı eşyanın el değiştirdikçe yazılan, sınırlı geçmişi; mirasla varise geçer).
//
// Denge: deneme sayısı parayla, takatla ya da tekrar üretimle artmaz (ay başına EFSANEVI_DENEME_AY; deneme ancak ürün
// nadide çıkınca harcanır ve her deneme bir gerçek üretimin girdisini ve takatini ister). Zar sunucuda tohumludur
// (oyuncu + ay: aynı ay ikinci kez zar atılamaz). Emirle (NPC emeği / toplu) üretim şaheseri aşamaz (kalite.ts).
// Olasılık oyuncuya kaba bantla söylenir; sayılar burada [PARAMETRE] olarak açıktır. Saf fonksiyonlar.

import type { MalId } from "../icerik/mallar.ts";
import {
  KALITE_ADLARI,
  KALITE_EFSANEVI,
  KALITE_ESIK,
  KALITE_NADIDE,
  KALITE_TILSIMLI,
  kaliteKirp,
  kaliteliEkle,
  type EsyaKaydi,
  type Kalite,
  type KaliteParti,
} from "./kalite.ts";
import { karma, tohumlu, type Zar } from "./rastgele.ts";
import type { Karakter } from "./tipler.ts";

/** [PARAMETRE] Etki çarpanı (§9.1): sade ×1 · iyi ×1,5 · üstün ×2 · şaheser ×3 · nadide ×4 · efsanevi ×5 · tılsımlı ×7. */
export const ETKI_CARPANI: readonly number[] = [1, 1.5, 2, 3, 4, 5, 7];
/** [PARAMETRE] Efsanevi denemesine yetkili meslek kademesi (3 = pir). */
export const EFSANEVI_PIR_KADEMESI = 3;
/** [PARAMETRE] Kişi başına aylık efsanevi denemesi. */
export const EFSANEVI_DENEME_AY = 1;
/** [PARAMETRE] Efsanevi şansı (yüzde): taban + nadide eşiğinin üstündeki her puan için artış, tavanlı. */
export const EFSANEVI_SANS_TABAN = 10;
export const EFSANEVI_SANS_PUAN = 1;
export const EFSANEVI_SANS_TAVAN = 40;
/** [PARAMETRE] Başarılı efsanevi denemesinde ayrıca tılsımlı olma şansı (binde). */
export const TILSIM_SANS_BINDE = 1;
/** [PARAMETRE] Lakap sayısı (istemci `esya.lakap.0..N-1`). */
export const ESYA_LAKAP_SAYISI = 24;
/** [PARAMETRE] Yadigâr geçmişinde tutulan en çok satır (ilk satır, yapım, hep kalır). */
export const YADIGAR_GECMIS_EN_COK = 8;

export type EsyaAilesi = "silah" | "zirh" | "alet" | "giysi" | "yiyecek" | "arac" | "yapi" | "belge" | "sanat" | "mal";

/** [PARAMETRE] Malın eşya ailesi (listede yoksa "mal": hammadde ve ara mal). */
export const ESYA_AILESI: Partial<Record<MalId, EsyaAilesi>> = {
  bicak: "silah",
  mizrak: "silah",
  kilic: "silah",
  arbalet: "silah",
  kalkan: "zirh",
  pulZirh: "zirh",
  zincir: "zirh",
  alet: "alet",
  degirmenTasi: "alet",
  giysi: "giysi",
  cizme: "giysi",
  kece: "giysi",
  astar: "giysi",
  cadir: "giysi",
  kumas: "giysi",
  bez: "giysi",
  ekmek: "yiyecek",
  un: "yiyecek",
  corba: "yiyecek",
  kuruEt: "yiyecek",
  peksimet: "yiyecek",
  pastirma: "yiyecek",
  erzakSandigi: "yiyecek",
  zahire: "yiyecek",
  kagni: "arac",
  araba: "arac",
  kosum: "arac",
  nal: "arac",
  kiris: "yapi",
  blok: "yapi",
  kesmeTas: "yapi",
  dograma: "yapi",
  kundekari: "yapi",
  oyma: "yapi",
  kereste: "yapi",
  civi: "yapi",
  senet: "belge",
  sozlesme: "belge",
  murekkep: "belge",
  saz: "sanat",
};

export interface AileTanimi {
  /** Etkiler: [kimlik, açıldığı en düşük kademe]. İlk etki her kademede vardır; üst kademe ikinci, üçüncü etkiyi ekler. */
  etkiler: readonly (readonly [string, Kalite])[];
  /** Sade kademenin kusuru (eksik etki; ceza değil). */
  kusur: string;
  /** Hünerler: ilki nadidenin hüneri; efsanevi biri, tılsımlı ikisi zarla seçilir. */
  hunerler: readonly string[];
  /** Etki bugün oyunda bağlı mı (alet: verim ve ömür). Bağlı değilse dökümde bilgi olarak görünür. */
  bagli: boolean;
}

/** [PARAMETRE] Aile tanımları (§9: silah güç, zırh dayanım, alet verim/ömür, giysi görünüş ve yol, yiyecek takat…). */
export const AILELER: Readonly<Record<EsyaAilesi, AileTanimi>> = {
  silah: { etkiler: [["guc", 0], ["isabet", 3], ["heybet", 4]], kusur: "korAgiz", hunerler: ["ikinciHamle", "keskinAgiz", "dengeliSap"], bagli: false },
  zirh: { etkiler: [["dayanim", 0], ["hafiflik", 3], ["sarsilmazlik", 4]], kusur: "inceSac", hunerler: ["sarsilmaz", "hafifDokuma", "yaraKapatan"], bagli: false },
  alet: { etkiler: [["verim", 0], ["omur", 1], ["incelik", 4]], kusur: "kabaIs", hunerler: ["yipranmaz", "bereketli", "cabukEl"], bagli: true },
  giysi: { etkiler: [["gorunus", 0], ["yol", 3], ["mevsim", 4]], kusur: "kabaDikis", hunerler: ["gozAlici", "yolYorulmaz", "dortMevsim"], bagli: false },
  yiyecek: { etkiler: [["tokluk", 0], ["keyif", 3], ["saglik", 4]], kusur: "bayat", hunerler: ["uzunTokluk", "bereketliSofra", "sifali"], bagli: false },
  arac: { etkiler: [["yuk", 0], ["hiz", 3], ["dayanim", 4]], kusur: "gicirti", hunerler: ["yukHafifletir", "yolKisaltir", "saglamDingil"], bagli: false },
  yapi: { etkiler: [["saglamlik", 0], ["guzellik", 3], ["asirlik", 4]], kusur: "egriIs", hunerler: ["asirlik", "depremeDayanikli", "ustaIsi"], bagli: false },
  belge: { etkiler: [["itibar", 0], ["gecerlilik", 3], ["muhur", 4]], kusur: "silikYazi", hunerler: ["inkarEdilmez", "muhurlu", "divanaGecer"], bagli: false },
  sanat: { etkiler: [["keyif", 0], ["nam", 3], ["hatira", 4]], kusur: "akortsuz", hunerler: ["gonulAlan", "dildenDile", "hasretGideren"], bagli: false },
  mal: { etkiler: [["deger", 0]], kusur: "kaba", hunerler: ["gozDolduran", "uzunOmur", "bereket"], bagli: false },
};

export function esyaAilesi(mal: string): EsyaAilesi {
  return ESYA_AILESI[mal as MalId] ?? "mal";
}

/** Nadidenin hüneri: ailenin ilk hüneri (aynı maldaki nadideler birleşebilsin diye sabit). */
export function nadideHuneri(mal: string): string {
  return AILELER[esyaAilesi(mal)].hunerler[0]!;
}

/** Kademenin özellik dökümü: aile, etkiler (çarpanla), sadede kusur, hüner(ler). Gizli sayı yok. */
export function ozellikDokumu(mal: string, q: Kalite, esya?: EsyaKaydi) {
  const aile = esyaAilesi(mal);
  const a = AILELER[aile];
  const carpan = ETKI_CARPANI[q] ?? 1;
  const hunerler = esya ? [...esya.h] : q === KALITE_NADIDE ? [nadideHuneri(mal)] : [];
  return {
    aile,
    kademe: q,
    kalite: KALITE_ADLARI[q],
    carpan,
    etkiler: a.etkiler.filter(([, en]) => q >= en).map(([id]) => ({ id, carpan })),
    eksik: a.etkiler.filter(([, en]) => q < en).map(([id, en]) => ({ id, kademe: en })),
    kusur: q === 0 ? a.kusur : null,
    hunerler,
    bagli: a.bagli,
  };
}

// ── Efsanevi denemesi ──

/** Bu ay kalan efsanevi denemesi. */
export function efsaneviHakki(k: Pick<Karakter, "ef">, ay: number): number {
  const kullanilan = k.ef && k.ef[0] === ay ? k.ef[1] : 0;
  return Math.max(0, EFSANEVI_DENEME_AY - kullanilan);
}

/** Efsanevi şansı (yüzde) ürünün kalite puanından; puan nadide eşiğinin altındaysa 0. */
export function efsaneviSansi(puan: number): number {
  const esik = KALITE_ESIK[KALITE_NADIDE]!;
  if (puan < esik) return 0;
  return Math.min(EFSANEVI_SANS_TAVAN, EFSANEVI_SANS_TABAN + Math.floor(puan - esik) * EFSANEVI_SANS_PUAN);
}

/** Oyuncuya söylenen kaba bant (gizli sayı yerine dil). */
export function sansBandi(yuzde: number): "yok" | "zayif" | "makul" | "guclu" {
  if (yuzde <= 0) return "yok";
  if (yuzde < 20) return "zayif";
  if (yuzde < 32) return "makul";
  return "guclu";
}

/** Efsanevi denemesinin ön koşulu (zar atılmadan, hiçbir şey değişmeden). */
export function efsaneviOnKosul(k: Karakter, meslek: string, ay: number): "efsanevi_pir_degil" | "efsanevi_hak_yok" | null {
  if ((k.ms?.s[meslek as keyof NonNullable<Karakter["ms"]>["s"]]?.kd ?? 0) < EFSANEVI_PIR_KADEMESI) return "efsanevi_pir_degil";
  if (efsaneviHakki(k, ay) <= 0) return "efsanevi_hak_yok";
  return null;
}

export interface EfsaneviSonucu {
  denendi: boolean;
  /** Denenmediyse nedeni (hak harcanmaz). */
  neden: "nadide_degil" | null;
  /** Kaba şans bandı. */
  sans: ReturnType<typeof sansBandi>;
  /** Çıkan kademe (efsanevi ya da tılsımlı) ve eşya; başarısızsa null. */
  kademe: Kalite | null;
  esya: EsyaKaydi | null;
  kalanHak: number;
}

/** Aylık zar: oyuncu + ay (tarif ya da sayaç değil; aynı ay ikinci zar yok). */
export function efsaneviZari(k: Pick<Karakter, "o" | "h">, ay: number): Zar {
  return tohumlu("efsanevi", k.h, k.o, ay);
}

/**
 * Denemeyi uygular: ürün nadide değilse denenmez (hak kalır). Nadideyse hak harcanır, zar atılır; başarılıysa adlı
 * eşya kaydı döner (binde TILSIM_SANS_BINDE tılsımlı). Karakterde yalnız `ef` (deneme sayacı) değişir.
 */
export function efsaneviDene(k: Karakter, mal: MalId, kademe: Kalite, puan: number, ay: number, atolyeAd: string, zar?: Zar): EfsaneviSonucu {
  const yuzde = efsaneviSansi(puan);
  if (kademe !== KALITE_NADIDE) return { denendi: false, neden: "nadide_degil", sans: sansBandi(yuzde), kademe: null, esya: null, kalanHak: efsaneviHakki(k, ay) };
  const r = zar ?? efsaneviZari(k, ay);
  k.ef = [ay, (k.ef && k.ef[0] === ay ? k.ef[1] : 0) + 1];
  const tut = r() * 100 < yuzde;
  const tilsim = r() * 1000 < TILSIM_SANS_BINDE;
  if (!tut) return { denendi: true, neden: null, sans: sansBandi(yuzde), kademe: null, esya: null, kalanHak: efsaneviHakki(k, ay) };
  const q: Kalite = tilsim ? KALITE_TILSIMLI : KALITE_EFSANEVI;
  return { denendi: true, neden: null, sans: sansBandi(yuzde), kademe: q, esya: esyaYap(k, mal, q, ay, atolyeAd, r), kalanHak: efsaneviHakki(k, ay) };
}

/** Adlı eşya kaydı (kimlik deterministik: hesap + kişi + ay + mal; hesap kimliği açığa çıkmaz, karması alınır). */
export function esyaYap(k: Pick<Karakter, "o" | "h" | "ad">, mal: MalId, q: Kalite, ay: number, atolyeAd: string, r: Zar): EsyaKaydi {
  const liste = AILELER[esyaAilesi(mal)].hunerler;
  const ilk = Math.floor(r() * liste.length);
  const h = [liste[ilk]!];
  if (q >= KALITE_TILSIMLI && liste.length > 1) h.push(liste[(ilk + 1 + Math.floor(r() * (liste.length - 1))) % liste.length]!);
  return { i: `e${karma("esya", k.h, k.o, ay, mal).toString(36)}`, l: Math.floor(r() * ESYA_LAKAP_SAYISI), u: k.ad, a: atolyeAd, h, y: ay, g: [[ay, "yapim", k.ad]] };
}

// ── Yadigâr ──

export type ElDegisimi = "satis" | "ismarlama" | "miras" | "devir";

/** Geçmişe satır ekler; sınır aşılırsa ilk satır (yapım) kalır, en eskiler düşer. */
export function gecmisEkle(g: EsyaKaydi["g"], satir: EsyaKaydi["g"][number]): EsyaKaydi["g"] {
  const l = [...g, satir];
  return l.length <= YADIGAR_GECMIS_EN_COK ? l : [l[0]!, ...l.slice(l.length - (YADIGAR_GECMIS_EN_COK - 1))];
}

/** El değiştiren partilerin eşyalarına geçmiş satırı yazar (yeni nesne; eşyasız parti olduğu gibi). */
export function elDegistir(partiler: readonly KaliteParti[], ay: number, tur: ElDegisimi, kimAd: string): KaliteParti[] {
  return partiler.map((p) => (p[4] ? ([p[0], p[1], p[2] ?? "", p[3] ?? "", { ...p[4], g: gecmisEkle(p[4].g, [ay, tur, kimAd]) }] as KaliteParti) : p));
}

/**
 * Mirasta izli partilerin varise geçişi: ölünün envanteri ve sandığının partileri birleşir, adlı eşyalar "miras"
 * satırıyla yadigâr olur. `ev` varisin (mallar zaten birleşmiş) adetleridir; partiler adedi aşamaz.
 */
export function mirasPartileri(kaynaklar: readonly (Record<string, KaliteParti[]> | undefined)[], ev: Record<string, number>, ay: number, varisAd: string): Record<string, KaliteParti[]> | undefined {
  const gecici: { ev: Record<string, number>; kq?: Record<string, KaliteParti[]> } = { ev: {} };
  for (const kq of kaynaklar) for (const [mal, liste] of Object.entries(kq ?? {})) kaliteliEkle(gecici, mal as MalId, elDegistir(liste, ay, "miras", varisAd));
  const hedef = { ev: { ...ev }, ...(gecici.kq ? { kq: gecici.kq } : {}) } as Karakter;
  for (const mal of Object.keys(gecici.kq ?? {})) kaliteKirp(hedef, mal);
  return hedef.kq;
}

/** İstemci görünümü (yalnız sahibine ve satış ilanında): ad, usta, atölye, hünerler, yadigâr geçmişi. */
export function esyaGorunumu(mal: string, q: Kalite, e: EsyaKaydi) {
  return {
    id: e.i,
    lakap: e.l,
    kademe: q,
    kalite: KALITE_ADLARI[q],
    usta: e.u,
    atolye: e.a,
    hunerler: [...e.h],
    yapim: e.y,
    gecmis: e.g.map(([ay, tur, kim]) => ({ ay, tur, kim })),
    ozellik: ozellikDokumu(mal, q, e),
  };
}
