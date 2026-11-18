// Eşya kademeleri ve özellikleri (tezgâh tasarımı §9, Dilim 4). Kademe kalite.ts'tedir (7 kademe); bu dosya
// kademenin anlamını verir: eşya ailesi ve özelliği (kademe arttıkça artan, tavanlı etki çarpanı), hüner (nadide ve
// üstünde tek özel etki), efsanevi denemesi (yalnız pir, yalnız atölyede kendi emeğiyle, ayda sınırlı) ve yadigâr
// (adlı eşyanın el değiştirdikçe yazılan, sınırlı geçmişi; mirasla varise geçer).
//
// Denge: deneme sayısı parayla, takatla ya da tekrar üretimle artmaz (ay başına EFSANEVI_DENEME_AY; deneme ancak ürün
// nadide çıkınca harcanır ve her deneme bir gerçek üretimin girdisini ve takatini ister). Zar sunucuda tohumludur
// ve ortam sırrıyla HMAC'lidir (oyuncu + ay + mal; zar-sirri.ts): istemci önceden hesaplayamaz, aynı ay ikinci kez
// atılamaz. Emirle (NPC emeği / toplu) üretim şaheseri aşamaz (kalite.ts). Olasılık oyuncuya yüzde ve kalemleriyle
// döner (efsaneviSansDokumu); bant yalnız etikettir. Saf fonksiyonlar.

import type { MalId } from "../icerik/mallar.ts";
import {
  ALET_KALITE_OMUR,
  ALET_KALITE_VERIM,
  KALITE_ADLARI,
  KALITE_DEGER_CARPANI,
  KALITE_EFSANEVI,
  KALITE_ESIK,
  KALITE_NADIDE,
  KALITE_TILSIMLI,
  enIyiKalite,
  kaliteKirp,
  kaliteliEkle,
  type Envanterli,
  type EsyaKaydi,
  type Kalite,
  type KaliteParti,
} from "./kalite.ts";
import { HIZMET_TARIFLERI } from "./hizmet-tarif.ts";
import { karma, type Zar } from "./rastgele.ts";
import { sirliZar } from "./zar-sirri.ts";
import type { Karakter } from "./tipler.ts";

/**
 * [PARAMETRE] Etki çarpanı önerisi (§9.1): sade ×1 · iyi ×1,5 · üstün ×2 · şaheser ×3 · nadide ×4 · efsanevi ×5 ·
 * tılsımlı ×7. Bugün hiçbir oyun mantığı bunu okumaz; dökümde gösterilmez (gösterilen etki = gerçek etki). Bağlı
 * etkiler (alet verimi, ömrü) kendi tablolarındaki gerçek değerle döner (kalite.ts ALET_KALITE_*).
 */
export const ETKI_CARPANI: readonly number[] = [1, 1.5, 2, 3, 4, 5, 7];
/** [PARAMETRE] Efsanevi denemesine yetkili meslek kademesi (3 = pir). */
export const EFSANEVI_PIR_KADEMESI = 3;
/** [PARAMETRE] Kişi başına aylık efsanevi denemesi. */
export const EFSANEVI_DENEME_AY = 1;
/**
 * [PARAMETRE] Efsanevi şansı (yüzde): taban + nadide eşiğinin üstündeki her puan için artış (aşağı yuvarlanır),
 * tavanlı. Denge (§9.2, "1000 pirde ayda birkaç tılsımlı"): denemenin ancak nadide çıkan işte harcandığıyla
 * birlikte aylık efsanevi oranı pirlerin yaklaşık %10–20'si; tılsımlı bunun binde 15'i.
 */
export const EFSANEVI_SANS_TABAN = 10;
export const EFSANEVI_SANS_PUAN = 0.5;
export const EFSANEVI_SANS_TAVAN = 20;
/** [PARAMETRE] Başarılı efsanevi denemesinde ayrıca tılsımlı olma şansı (binde). */
export const TILSIM_SANS_BINDE = 15;
/** [PARAMETRE] Kaba bant eşikleri (yüzde): altı zayıf, arası makul, üstü güçlü. Bant yalnız etikettir; sayı dökümdedir. */
export const SANS_BANDI_MAKUL = 12;
export const SANS_BANDI_GUCLU = 17;
/** [PARAMETRE] "bereketli" hünerli aletin fazladan çıktısı (adet; kalite verimine eklenir). */
export const ALET_BEREKET_VERIM = 1;
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
  /** Ailenin en az bir etkisi oyunda bağlı mı (hangi mal ve kademede: `aileEtkisi`). */
  bagli: boolean;
  /** Oyunda karşılığı olan etkiler (bilgi; gerçek değer ve mal süzgeci `aileEtkisi`te). */
  bagliEtkiler?: readonly string[];
  /** Oyunda karşılığı olan hünerler. Efsanevi/tılsımlı bu ailede yalnız bağlı hünerlerden alır (sırayla: efsanevi
   * ilkini, tılsımlı ilk ikisini). */
  bagliHunerler?: readonly string[];
}

/** [PARAMETRE] Aile tanımları (§9: silah güç, zırh dayanım, alet verim/ömür, giysi görünüş ve yol, yiyecek takat…). */
export const AILELER: Readonly<Record<EsyaAilesi, AileTanimi>> = {
  silah: { etkiler: [["guc", 0], ["isabet", 3], ["heybet", 4]], kusur: "korAgiz", hunerler: ["ikinciHamle", "keskinAgiz", "dengeliSap"], bagli: true },
  zirh: { etkiler: [["dayanim", 0], ["hafiflik", 3], ["sarsilmazlik", 4]], kusur: "inceSac", hunerler: ["sarsilmaz", "hafifDokuma", "yaraKapatan"], bagli: true },
  alet: { etkiler: [["verim", 0], ["omur", 1], ["incelik", 4]], kusur: "kabaIs", hunerler: ["yipranmaz", "bereketli", "cabukEl"], bagli: true, bagliEtkiler: ["verim", "omur"], bagliHunerler: ["yipranmaz", "bereketli"] },
  giysi: { etkiler: [["gorunus", 0], ["yol", 2], ["mevsim", 4]], kusur: "kabaDikis", hunerler: ["gozAlici", "yolYorulmaz", "dortMevsim"], bagli: true },
  yiyecek: { etkiler: [["tokluk", 0], ["keyif", 3], ["saglik", 4]], kusur: "bayat", hunerler: ["uzunTokluk", "bereketliSofra", "sifali"], bagli: true },
  arac: { etkiler: [["yuk", 0], ["dayanim", 1], ["hiz", 4]], kusur: "gicirti", hunerler: ["yukHafifletir", "yolKisaltir", "saglamDingil"], bagli: true },
  yapi: { etkiler: [["saglamlik", 0], ["guzellik", 3], ["asirlik", 4]], kusur: "egriIs", hunerler: ["asirlik", "depremeDayanikli", "ustaIsi"], bagli: false },
  belge: { etkiler: [["itibar", 0], ["gecerlilik", 3], ["muhur", 4]], kusur: "silikYazi", hunerler: ["inkarEdilmez", "muhurlu", "divanaGecer"], bagli: false },
  sanat: { etkiler: [["keyif", 0], ["nam", 3], ["hatira", 4]], kusur: "akortsuz", hunerler: ["gonulAlan", "dildenDile", "hasretGideren"], bagli: true },
  mal: { etkiler: [["deger", 0]], kusur: "kaba", hunerler: ["gozDolduran", "uzunOmur", "bereket"], bagli: true },
};

// ── Aile etkileri (kanca partisi 2; gösterilen = gerçek) ──
// Her tablo kademe (0–6) dizinlidir; sade çoğu ailede 0'dır (kusur: eksik etki, ceza yok). Tüketiciler bu tablolar
// ve `aileEtkisi` üzerinden okur; dökümdeki `deger` aynı sayıdır.

/** [PARAMETRE] Silahın düello gücüne katkısı (duello.ts kalemi "silah"; zar 1–20 yanında sınırlı). */
export const SILAH_GUC: readonly number[] = [0, 1, 2, 3, 5, 6, 8];
/** [PARAMETRE] Zırh/kalkanın düello dayanımına katkısı (duello.ts kalemi "zirh"). */
export const ZIRH_DAYANIM: readonly number[] = [0, 1, 2, 3, 5, 6, 8];
/** [PARAMETRE] Taşıtın (araba, kağnı) kalitesinin toplu kervan yüküne kademe başına eki (adet; kervan.ts). */
export const ARAC_KALITE_YUK: readonly number[] = [0, 1, 2, 3, 4, 5, 6];
/** [PARAMETRE] Çizmenin kervanda takat indirimi (üstünden; kervan.ts). Kervan takatı 1'in altına inmez. */
export const CIZME_YOL_TAKAT: readonly number[] = [0, 0, 1, 1, 1, 1, 1];
/** [PARAMETRE] Hizmet girdisi yiyeceğin hizmet etkisine yüzde eki (sofra hizmetleri; hizmet kalite tavanı içinde). */
export const YIYECEK_TOKLUK: readonly number[] = [0, 5, 10, 15, 20, 25, 30];
/** [PARAMETRE] Hizmet aracı sazın (ozan sahnesi) hizmetin ilk hal etkisine adet başına eki (gönül puanı). */
export const SANAT_KEYIF: readonly number[] = [0, 1, 1, 2, 3, 4, 5];

/** Çizme olarak yolda giyilen mal (kervan). */
export const YOL_GIYSISI = "cizme" as const satisfies MalId;
/** Kervanda taşıt olan araçlar (yük eki) ve aşınan araçlar (ömür = kalite ömrü). */
const TASITLAR: readonly string[] = ["araba", "kagni"];
const KERVAN_ARACLARI: readonly string[] = ["araba", "kagni", "kosum"];
/** Hizmet tariflerinin girdisi olan yiyecekler (tokluk bunlarda işler). */
const SOFRA_GIRDILERI: ReadonlySet<string> = new Set(HIZMET_TARIFLERI.flatMap((t) => Object.keys(t.girdi)).filter((m) => ESYA_AILESI[m as MalId] === "yiyecek"));
/** Hizmet aracı olan sanat malları (ozan sahnesi: saz). */
export const HIZMET_SANAT_ARACLARI: readonly string[] = ["saz"];

export type AileEtkiDegeri = { deger: number; birim: "adet" | "kullanim" | "duello" | "yuk" | "takat" | "yuzde" | "gonul" | "carpan" } | { yipranmaz: true };

/**
 * Bir etkinin bu mal ve kademede oyundaki gerçek değeri; oyunda karşılığı yoksa null (döküm `bagli:false`).
 * Alet: verim (+adet), ömür (+kullanım ya da yıpranmaz). Silah: düello gücü. Zırh: düello dayanımı. Araç: kervan yükü
 * (taşıt), dayanım (kervan aracının ömrü). Giysi: çizmenin yol etkisi (kervan takatı). Yiyecek: hizmet girdisi olarak
 * tokluk (hizmet etkisine yüzde). Sanat: hizmet aracı sazın keyfi. Mal: pazar değeri çarpanı.
 */
export function aileEtkisi(mal: string, q: Kalite, id: string, hunerler: readonly string[] = []): AileEtkiDegeri | null {
  const aile = esyaAilesi(mal);
  const v = (t: readonly number[]) => t[q] ?? 0;
  switch (`${aile}:${id}`) {
    case "alet:verim":
      return { deger: aletEtkisi(mal, q, hunerler).verim, birim: "adet" };
    case "alet:omur": {
      const a = aletEtkisi(mal, q, hunerler);
      return a.yipranmaz ? { yipranmaz: true } : { deger: a.omur, birim: "kullanim" };
    }
    case "silah:guc":
      return { deger: v(SILAH_GUC), birim: "duello" };
    case "zirh:dayanim":
      return { deger: v(ZIRH_DAYANIM), birim: "duello" };
    case "arac:yuk":
      return TASITLAR.includes(mal) ? { deger: v(ARAC_KALITE_YUK), birim: "yuk" } : null;
    case "arac:dayanim":
      return KERVAN_ARACLARI.includes(mal) ? { deger: v(ALET_KALITE_OMUR), birim: "kullanim" } : null;
    case "giysi:yol":
      return mal === YOL_GIYSISI ? { deger: v(CIZME_YOL_TAKAT), birim: "takat" } : null;
    case "yiyecek:tokluk":
      return SOFRA_GIRDILERI.has(mal) ? { deger: v(YIYECEK_TOKLUK), birim: "yuzde" } : null;
    case "sanat:keyif":
      return HIZMET_SANAT_ARACLARI.includes(mal) ? { deger: v(SANAT_KEYIF), birim: "gonul" } : null;
    case "mal:deger":
      return { deger: KALITE_DEGER_CARPANI[q] ?? 1, birim: "carpan" };
    default:
      return null;
  }
}

/** Eldeki bu aileden mallar arasında en yüksek etki değeri (düello: en iyi silah/zırh). Adlı eşya sayılır (harcanmaz). */
export function eldekiEnIyiEtki(k: Envanterli, aile: EsyaAilesi, id: string): { mal: string | null; q: Kalite; deger: number } {
  let en: { mal: string | null; q: Kalite; deger: number } = { mal: null, q: 0, deger: 0 };
  for (const [mal, n] of Object.entries(k.ev ?? {})) {
    if (!((n ?? 0) > 0) || esyaAilesi(mal) !== aile) continue;
    const b = enIyiBirim(k, mal);
    const e = aileEtkisi(mal, b.q, id, b.hunerler);
    const d = e && "deger" in e ? e.deger : 0;
    if (d > en.deger || (d === en.deger && en.mal !== null && d > 0 && mal < en.mal)) en = { mal, q: b.q, deger: d };
  }
  return en;
}

export function esyaAilesi(mal: string): EsyaAilesi {
  return ESYA_AILESI[mal as MalId] ?? "mal";
}

/** Nadidenin hüneri: ailenin ilk hüneri (aynı maldaki nadideler birleşebilsin diye sabit). */
export function nadideHuneri(mal: string): string {
  return AILELER[esyaAilesi(mal)].hunerler[0]!;
}

/** Kademenin ve eşyanın hünerleri (nadide: ailenin ilk hüneri; adlı eşya: kaydındakiler). */
export function hunerleri(mal: string, q: Kalite, esya?: EsyaKaydi): string[] {
  return esya ? [...esya.h] : q === KALITE_NADIDE ? [nadideHuneri(mal)] : [];
}

/** Hünerin bu ailede oyunda karşılığı var mı. */
export function hunerBagliMi(mal: string, huner: string): boolean {
  return AILELER[esyaAilesi(mal)].bagliHunerler?.includes(huner) === true;
}

/** Aletin (araç olarak kullanılan malın) bu kademe ve hünerlerle gerçek etkisi: fazladan çıktı, ömür, yıpranmazlık. */
export function aletEtkisi(mal: string, q: Kalite, hunerler: readonly string[]): { verim: number; omur: number; yipranmaz: boolean } {
  const bereket = hunerler.includes("bereketli") && hunerBagliMi(mal, "bereketli") ? ALET_BEREKET_VERIM : 0;
  return {
    verim: (ALET_KALITE_VERIM[q] ?? 0) + bereket,
    omur: ALET_KALITE_OMUR[q] ?? 0,
    yipranmaz: hunerler.includes("yipranmaz") && hunerBagliMi(mal, "yipranmaz"),
  };
}

/** Eldeki en iyi (kullanılacak) birimin kademesi ve hünerleri: adlı eşyada en iyi partinin kaydı. */
export function enIyiBirim(k: Envanterli, mal: string): { q: Kalite; hunerler: string[] } {
  const q = enIyiKalite(k as Karakter, mal);
  const ilk = k.kq?.[mal]?.find((p) => p[0] === q && p[1] > 0);
  return { q, hunerler: hunerleri(mal, q, ilk?.[4]) };
}

/** Eldeki en iyi aletin gerçek etkisi (tarif, temel iş ve atölye aynı kaynağı kullanır). */
export function eldekiAletEtkisi(k: Envanterli, mal: string): { q: Kalite; verim: number; omur: number; yipranmaz: boolean } {
  const b = enIyiBirim(k, mal);
  return { q: b.q, ...aletEtkisi(mal, b.q, b.hunerler) };
}

/**
 * Kademenin özellik dökümü: aile, etkiler, sadede kusur, hüner(ler). Gizli sayı yok ve gösterilen = gerçek: bağlı
 * etki (`bagli:true`) oyundaki gerçek değeriyle ve birimiyle döner (`aileEtkisi`: alet verim/ömür, silah ve zırh
 * düello, taşıt yükü, çizme yolu, sofra yiyeceği, saz, mal değeri); bağlı olmayan etki ve hüner `bagli:false`tır
 * (istemci "yakında" der). Etki çarpanı (ETKI_CARPANI) yazılmaz (hiçbir mantık okumaz).
 */
export function ozellikDokumu(mal: string, q: Kalite, esya?: EsyaKaydi) {
  const aile = esyaAilesi(mal);
  const a = AILELER[aile];
  const hunerler = hunerleri(mal, q, esya);
  const etkiler = a.etkiler
    .filter(([, en]) => q >= en)
    .map(([id]) => {
      const e = aileEtkisi(mal, q, id, hunerler);
      return e ? { id, bagli: true, ...e } : { id, bagli: false };
    });
  return {
    aile,
    kademe: q,
    kalite: KALITE_ADLARI[q],
    etkiler,
    eksik: a.etkiler.filter(([, en]) => q < en).map(([id, en]) => ({ id, kademe: en })),
    kusur: q === 0 ? a.kusur : null,
    hunerler,
    /** Hünerlerin bağlılığı (aynı sırayla). */
    hunerDokumu: hunerler.map((id) => ({ id, bagli: hunerBagliMi(mal, id) })),
    /** Bu dökümde oyunda karşılığı olan en az bir etki ya da hüner var mı. */
    bagli: etkiler.some((e) => e.bagli) || hunerler.some((h) => hunerBagliMi(mal, h)),
  };
}

// ── Efsanevi denemesi ──

/**
 * Bu ay kalan efsanevi denemesi. Hak sayacının ayı yerleşimin ayından ilerideyse (göçle yerleşimler arası ay farkı)
 * o ay da harcanmış sayılır: göç ikinci hak açmaz.
 */
export function efsaneviHakki(k: Pick<Karakter, "ef">, ay: number): number {
  const kullanilan = k.ef && ay <= k.ef[0] ? k.ef[1] : 0;
  return Math.max(0, EFSANEVI_DENEME_AY - kullanilan);
}

/** Efsanevi şansı (yüzde) ürünün kalite puanından; puan nadide eşiğinin altındaysa 0. */
export function efsaneviSansi(puan: number): number {
  return efsaneviSansDokumu(puan).yuzde;
}

/** Oyuncuya söylenen kaba bant (sayının yanında etiket). */
export function sansBandi(yuzde: number): "yok" | "zayif" | "makul" | "guclu" {
  if (yuzde <= 0) return "yok";
  if (yuzde < SANS_BANDI_MAKUL) return "zayif";
  if (yuzde < SANS_BANDI_GUCLU) return "makul";
  return "guclu";
}

/** Efsanevi şansının açık dökümü (gizli sayı yok): taban, puan fazlası, tavan kesintisi; tılsım binde ayrıca. */
export function efsaneviSansDokumu(puan: number) {
  const esik = KALITE_ESIK[KALITE_NADIDE]!;
  const kalemler: { k: string; d: number }[] = [];
  if (puan >= esik) {
    kalemler.push({ k: "efsanevi.taban", d: EFSANEVI_SANS_TABAN });
    const fazla = Math.floor(Math.floor(puan - esik) * EFSANEVI_SANS_PUAN);
    if (fazla > 0) kalemler.push({ k: "efsanevi.puan", d: fazla });
    const ham = EFSANEVI_SANS_TABAN + fazla;
    if (ham > EFSANEVI_SANS_TAVAN) kalemler.push({ k: "efsanevi.tavan", d: EFSANEVI_SANS_TAVAN - ham });
  }
  const yuzde = kalemler.reduce((a, x) => a + x.d, 0);
  return {
    yuzde,
    bant: sansBandi(yuzde),
    kalemler,
    /** Nadide eşiği (puan) ve puan başına artış; tavan. */
    esik,
    puanBasina: EFSANEVI_SANS_PUAN,
    tavan: EFSANEVI_SANS_TAVAN,
    /** Başarılı denemede ayrıca tılsımlı olma şansı (binde). */
    tilsimBinde: TILSIM_SANS_BINDE,
  };
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
  /** Kaba şans bandı (etiket; sayı `sansDokumu`nda). */
  sans: ReturnType<typeof sansBandi>;
  /** Şansın açık dökümü: yüzde, kalemler (taban, puan fazlası, tavan), tılsım binde. */
  sansDokumu: ReturnType<typeof efsaneviSansDokumu>;
  /** Çıkan kademe (efsanevi ya da tılsımlı) ve eşya; başarısızsa null. */
  kademe: Kalite | null;
  esya: EsyaKaydi | null;
  kalanHak: number;
}

/**
 * Aylık zar: oyuncu + ay + mal, ortam sırrıyla HMAC'li (zar-sirri.ts; istemci sonucu önceden hesaplayamaz). Aynı ay
 * ikinci zar yok: hak sayacı ayda bir.
 */
export function efsaneviZari(k: Pick<Karakter, "o" | "h">, ay: number, mal = ""): Zar {
  return sirliZar("efsanevi", k.h, k.o, ay, mal);
}

/**
 * Denemeyi uygular: ürün nadide değilse denenmez (hak kalır). Nadideyse hak harcanır, zar atılır; başarılıysa adlı
 * eşya kaydı döner (binde TILSIM_SANS_BINDE tılsımlı). Karakterde yalnız `ef` (deneme sayacı) değişir.
 */
export function efsaneviDene(k: Karakter, mal: MalId, kademe: Kalite, puan: number, ay: number, atolyeAd: string, zar?: Zar): EfsaneviSonucu {
  const sansDokumu = efsaneviSansDokumu(puan);
  const yuzde = sansDokumu.yuzde;
  const sans = sansDokumu.bant;
  if (kademe !== KALITE_NADIDE) return { denendi: false, neden: "nadide_degil", sans, sansDokumu, kademe: null, esya: null, kalanHak: efsaneviHakki(k, ay) };
  const r = zar ?? efsaneviZari(k, ay, mal);
  // Sayaç ayı geri gitmez (göçle daha geride bir yerleşime geçilse de harcanan hak sayılır).
  const sayacAyi = k.ef && k.ef[0] > ay ? k.ef[0] : ay;
  k.ef = [sayacAyi, (k.ef && ay <= k.ef[0] ? k.ef[1] : 0) + 1];
  const tut = r() * 100 < yuzde;
  const tilsim = r() * 1000 < TILSIM_SANS_BINDE;
  if (!tut) return { denendi: true, neden: null, sans, sansDokumu, kademe: null, esya: null, kalanHak: efsaneviHakki(k, ay) };
  const q: Kalite = tilsim ? KALITE_TILSIMLI : KALITE_EFSANEVI;
  return { denendi: true, neden: null, sans, sansDokumu, kademe: q, esya: esyaYap(k, mal, q, ay, atolyeAd, r), kalanHak: efsaneviHakki(k, ay) };
}

/**
 * Adlı eşya kaydı (kimlik deterministik: hesap + kişi + ay + mal; hesap kimliği açığa çıkmaz, karması alınır).
 * Ailenin bağlı hünerleri varsa (alet) yalnız onlardan alır: efsanevi ilkini (alet: yıpranmaz), tılsımlı ilk ikisini;
 * böylece adlı alet hiçbir zaman etkisiz hünerle çıkmaz ve yıpranıp yok olmaz.
 */
export function esyaYap(k: Pick<Karakter, "o" | "h" | "ad">, mal: MalId, q: Kalite, ay: number, atolyeAd: string, r: Zar): EsyaKaydi {
  const a = AILELER[esyaAilesi(mal)];
  const liste = a.hunerler;
  const ilk = Math.floor(r() * liste.length);
  let h = [liste[ilk]!];
  if (q >= KALITE_TILSIMLI && liste.length > 1) h.push(liste[(ilk + 1 + Math.floor(r() * (liste.length - 1))) % liste.length]!);
  if (a.bagliHunerler?.length) h = a.bagliHunerler.slice(0, q >= KALITE_TILSIMLI ? 2 : 1);
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

/**
 * Herkese açık görünüm (pazar ilanı ve raf satırı; alıcı satın almadan görür): lakap, kademe, usta, atölye,
 * hünerler, yapım ayı ve özellik dökümü. Yadigâr geçmişi (kimlerin elinden geçtiği) yalnız sahibine gösterilir.
 */
export function esyaKamuGorunumu(mal: string, q: Kalite, e: EsyaKaydi) {
  return {
    id: e.i,
    lakap: e.l,
    kademe: q,
    kalite: KALITE_ADLARI[q],
    usta: e.u,
    atolye: e.a,
    hunerler: [...e.h],
    yapim: e.y,
    ozellik: ozellikDokumu(mal, q, e),
  };
}

/** İstemci görünümü (yalnız sahibine): ad, usta, atölye, hünerler, yadigâr geçmişi. */
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
