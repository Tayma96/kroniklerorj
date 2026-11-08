// Parametre kayıt defteri ve sürümleme (ana tasarım §7.2). Değerler kod sabitlerinin üstüne yazılan sunucu
// ayarıdır; ayar yoksa koddaki varsayılan geçerlidir. Her değişiklik sürümlüdür; geri al bir önceki sürüme döner.
//
// Y1 KAPSAMI: Parametreler YonetimDO'da saklanır, okunur ve geri alınır. `uygulama: "Y1"` olanları (yönetimin
// kendi sınırları) YonetimDO çalışma anında okur. `uygulama: "Y2"` olanları oyun modülleri (YerlesimDO, HesapDO)
// HENÜZ OKUMAZ; o modüller koddaki varsayılanla çalışmaya devam eder. Okuma Y2'de bağlanacaktır.

import { HIZ_SINIRI } from "../mantik.ts";
import { KITLIK_PRIM, NPC_AYLIK_KOTA, NPC_CARPAN } from "../yerlesim/npc-taban.ts";
import { AZALAN_PENCERE_IS, TEMEL_CIKTI } from "../yerlesim/temel-is.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { SIKAYET_GUNLUK } from "./sikayet.ts";
import { GECICI_UZAKLASTIRMA_EN_COK_GUN } from "./yaptirim.ts";

export interface ParametreTanimi {
  varsayilan: number;
  alt: number;
  ust: number;
  /** Tam sayı mı. */
  tam: boolean;
  aciklama: string;
  /** Sabitin koddaki yeri. */
  kaynak: string;
  /** Y1: çalışma anında okunur. Y2: yalnız saklanır; oyun modülü henüz okumaz. */
  uygulama: "Y1" | "Y2";
}

/** İzinli adlar. Sınırlar ekonomiyi bozmayacak aralıktır (ör. NPC çarpanı 1,5'in altına inmez: taban üstü kalır). */
export const PARAMETRELER = {
  NPC_AYLIK_KOTA: {
    varsayilan: NPC_AYLIK_KOTA, alt: 0, ust: 20, tam: true, uygulama: "Y2",
    aciklama: "Oyuncu başına mal başına aylık NPC taban alım kotası", kaynak: "src/yerlesim/npc-taban.ts",
  },
  NPC_CARPAN: {
    varsayilan: NPC_CARPAN, alt: 1.5, ust: 5, tam: false, uygulama: "Y2",
    aciklama: "NPC satış fiyatı çarpanı (taban fiyat × çarpan)", kaynak: "src/yerlesim/npc-taban.ts",
  },
  KITLIK_PRIM: {
    varsayilan: KITLIK_PRIM, alt: 0, ust: 1, tam: false, uygulama: "Y2",
    aciklama: "Meslekte oyuncu yokken kıtlık primi oranı", kaynak: "src/yerlesim/npc-taban.ts",
  },
  TEMEL_CIKTI: {
    varsayilan: TEMEL_CIKTI, alt: 1, ust: 6, tam: true, uygulama: "Y2",
    aciklama: "Temel işin çıktı adedi (azalan getiriden önce)", kaynak: "src/yerlesim/temel-is.ts",
  },
  AZALAN_PENCERE_IS: {
    varsayilan: AZALAN_PENCERE_IS, alt: 1, ust: 24, tam: true, uygulama: "Y2",
    aciklama: "Temel işte azalan getiri penceresi (oyun ayı)", kaynak: "src/yerlesim/temel-is.ts",
  },
  HIZ_SINIRI: {
    varsayilan: HIZ_SINIRI, alt: 10, ust: 120, tam: true, uygulama: "Y2",
    aciklama: "Hesap başına dakikadaki istek sınırı", kaynak: "src/mantik.ts",
  },
  SIKAYET_GUNLUK: {
    varsayilan: SIKAYET_GUNLUK, alt: 1, ust: 50, tam: true, uygulama: "Y1",
    aciklama: "Oyuncu başına günlük şikayet sınırı", kaynak: "src/yonetim/sikayet.ts",
  },
  GECICI_UZAKLASTIRMA_EN_COK_GUN: {
    varsayilan: GECICI_UZAKLASTIRMA_EN_COK_GUN, alt: 1, ust: 30, tam: true, uygulama: "Y1",
    aciklama: "Geçici uzaklaştırmanın en uzun süresi (gün)", kaynak: "src/yonetim/yaptirim.ts",
  },
} as const satisfies Record<string, ParametreTanimi>;
export type ParametreAdi = keyof typeof PARAMETRELER;

/** [PARAMETRE] Parametre kaydında tutulan geçmiş uzunluğu (tam geçmiş işlem kaydındadır). */
export const PARAMETRE_GECMIS_EN_COK = 100;

export interface ParametreSurumu {
  surum: number;
  islem: "degistir" | "geri";
  /** Bu işlemden sonraki etkin değer. */
  deger: number;
  onceki: number;
  kim: string;
  zaman: number;
  gerekce: string;
}

export interface ParametreKaydi {
  /** Değiştirme yığını: üstteki etkin değerdir; boşsa varsayılan. Geri al üsttekini atar. */
  yigin: number[];
  surum: number;
  gecmis: ParametreSurumu[];
}

export interface Iz {
  kim: string;
  zaman: number;
  gerekce: string;
}

export function parametreAdiCoz(ham: unknown): ParametreAdi | undefined {
  return typeof ham === "string" && Object.hasOwn(PARAMETRELER, ham) ? (ham as ParametreAdi) : undefined;
}

export function tanim(ad: ParametreAdi): ParametreTanimi {
  return PARAMETRELER[ad];
}

export function degerDogrula(t: ParametreTanimi, ham: unknown): Sonuc<number> {
  if (typeof ham !== "number" || !Number.isFinite(ham)) return hata("deger_sinir_disi");
  if (t.tam && !Number.isInteger(ham)) return hata("deger_sinir_disi");
  if (ham < t.alt || ham > t.ust) return hata("deger_sinir_disi");
  return basarili(ham);
}

export function etkinDeger(t: ParametreTanimi, kayit: ParametreKaydi | undefined): number {
  return kayit?.yigin.at(-1) ?? t.varsayilan;
}

function surumEkle(kayit: ParametreKaydi, s: Omit<ParametreSurumu, "surum">): ParametreKaydi {
  const surum = kayit.surum + 1;
  return { ...kayit, surum, gecmis: [...kayit.gecmis, { surum, ...s }].slice(-PARAMETRE_GECMIS_EN_COK) };
}

const BOS: ParametreKaydi = { yigin: [], surum: 0, gecmis: [] };

/** Saf: yeni değeri yığına iter; eski değer saklanır. */
export function parametreDegistir(t: ParametreTanimi, kayit: ParametreKaydi | undefined, deger: number, iz: Iz): ParametreKaydi {
  const k = kayit ?? BOS;
  const onceki = etkinDeger(t, k);
  return surumEkle({ ...k, yigin: [...k.yigin, deger] }, { islem: "degistir", deger, onceki, ...iz });
}

/** Saf: üstteki değişikliği atar, bir önceki sürüme (en sonunda varsayılana) döner. */
export function parametreGeriAl(t: ParametreTanimi, kayit: ParametreKaydi | undefined, iz: Iz): Sonuc<ParametreKaydi> {
  if (!kayit || kayit.yigin.length === 0) return hata("geri_yok");
  const onceki = etkinDeger(t, kayit);
  const yigin = kayit.yigin.slice(0, -1);
  const deger = yigin.at(-1) ?? t.varsayilan;
  return basarili(surumEkle({ ...kayit, yigin }, { islem: "geri", deger, onceki, ...iz }));
}

export interface ParametreOzeti extends ParametreTanimi {
  ad: ParametreAdi;
  deger: number;
  surum: number;
  gecmis: ParametreSurumu[];
}

export function parametreOzeti(ad: ParametreAdi, kayit: ParametreKaydi | undefined, gecmisSiniri = 20): ParametreOzeti {
  const t = PARAMETRELER[ad];
  return {
    ad,
    ...t,
    deger: etkinDeger(t, kayit),
    surum: kayit?.surum ?? 0,
    gecmis: (kayit?.gecmis ?? []).slice(-gecmisSiniri).reverse(),
  };
}
