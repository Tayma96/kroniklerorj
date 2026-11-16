// Tezgâh modeli Dilim 1 parametreleri (docs/superpowers/specs/2026-11-16-tezgah-modeli-design.md §4–5). Hepsi
// [PARAMETRE] ve tek dosyada; gizli sayı yoktur: her etki istemciye döküm olarak döner (raf, gün sonu, önizleme,
// yolcu payı). Denge sınırları test/tezgah-sim.test.ts ile kilitlidir (§5.4); bir değeri değiştiren o testi koşar.

import type { YerlesimTuru } from "../dunya-veri.ts";
import type { MeslekId } from "../icerik/meslekler.ts";
import { MALLAR, MAL_IDLERI, type MalId } from "../icerik/mallar.ts";

// ── Depo (dükkân ve atölye ortak çekirdeği) ──

/** [PARAMETRE] Depo kapasitesi (adet; raf hariç) seviyeye göre. */
export const DEPO_KAPASITE: Readonly<Record<"dukkan" | "atolye", readonly number[]>> = {
  dukkan: [40, 60, 90, 130, 180],
  atolye: [60, 90, 130, 180, 240],
};
/** [PARAMETRE] Tek taşımada en çok adet. */
export const DEPO_TASIMA_EN_COK = 60;

// ── Raf ──

/** [PARAMETRE] Raf satır sayısı seviyeye göre ve satır başına en çok adet. */
export const RAF_SATIR: readonly number[] = [3, 4, 6, 8, 10];
export const RAF_SATIR_ADET = 24;
/** [PARAMETRE] Raf fiyatı pazarın adil bandında: adil × [alt, üst] (adil = taban × kalite değer çarpanı). */
export const RAF_FIYAT_ALT = 0.5;
export const RAF_FIYAT_UST = 3;

// ── Hane bütçesi (NPC müşteri, §5.2) ──

/** [PARAMETRE] Yerleşimde, malı olan her üretici meslek için aylık NPC bütçesi B (akçe). */
export const HANE_BUTCESI: Readonly<Record<YerlesimTuru, number>> = { koy: 10, kasaba: 24, sehir: 56 };
/** [PARAMETRE] O meslekte yerleşimde hiç (yaşayan) oyuncu yoksa B bu çarpanla artar (kıtlık sinyali). */
export const KITLIK_BUTCE_CARPANI = 1.5;
/**
 * [PARAMETRE] NPC tavanı: NPC, birim fiyatı `tavan × taban × kç`yi aşan satırı almaz. Belge 1,6 önerdi; §5.4 (3)
 * "NPC stoğundan alıp rafta NPC'ye satmak kâr ettirmez" sınırı için stok çarpanına (1,5) oturtuldu: stoktan
 * ⌈1,5 × taban⌉ ile alınan sade mal rafta en çok ⌊1,5 × taban⌋ ile satılır.
 */
export const NPC_TAVAN_CARPANI = 1.5;
/** [PARAMETRE] Fiyat çarpanı F = clamp(adil / fiyat, alt, üst)^üs. */
export const F_ALT = 0.6;
export const F_UST = 1.6;
export const F_US = 2;
/** [PARAMETRE] Kalite çarpanı Q (sade, iyi, üstün, şaheser). */
export const Q_CARPANI: readonly number[] = [1, 1.1, 1.25, 1.5];
/** [PARAMETRE] İtibar çarpanı R = taban + itibar / bölen. */
export const R_TABAN = 0.5;
export const R_BOLEN = 100;
/**
 * [PARAMETRE] H: beceri ve hizmet etkileri, `1 + toplam%` (tavan %30). Dilim 1'de girdi boştur (H = 1); Dilim 3
 * kancaları doldurur. Debdebe teveccühü H'ye GİRMEZ (gerçek para çekiciliği yok).
 */
export const H_TAVAN_YUZDE = 30;
/**
 * [PARAMETRE] Dükkân başına aylık NPC hasılat tavanı (seviyeye göre). §5.4 (1): şehirde en iyi paylı 5. seviye
 * dükkânın net NPC kazancı ≤ ~90 akçe; tavan olmadan tek dükkân bütün meslek bütçelerini (8 × 70) toplayabiliyordu.
 */
export const DUKKAN_NPC_TAVAN: readonly number[] = [30, 60, 100, 160, 240];
/** [PARAMETRE] Pay biçimi: "butce" (belgedeki bütçe payı, varsayılan) ya da "adet" (adet talebi payı; karşılaştırma). */
export type PayYontemi = "butce" | "adet";
export const PAY_YONTEMI: PayYontemi = "butce";

// ── Kepenk ve devralma (§4) ──

/**
 * [PARAMETRE] Bu kadar ay (1 ay = 12 gerçek saat; 60 ay = 30 gün) üst üste satışsız VE sahibinin/vekilinin hiçbir
 * raf-depo-fiyat eylemi olmayan dükkân, bütün yuvalar doluyken devralınabilir.
 */
export const DEVRALMA_KEPENK_AY = 60;
/** [PARAMETRE] Çalışanın (sahip ve vekil değil) depodan envantere günlük alış tavanı (malın adil değeri, akçe). */
export const CALISAN_DEPO_GUNLUK_ADIL = 20;
/** [PARAMETRE] Depo defterinde tutulan en çok satır. */
export const DEPO_DEFTER_EN_COK = 40;
/** [PARAMETRE] Karşılıklı işlem penceresi (ay): bu süre içinde iki yönlü ödeme yapan çift bayraklanır. */
export const KARSILIKLI_PENCERE_AY = 6;
/** Devralınabilen türler: atölye Dilim 2'ye kadar hep kepenkli durduğu için (üretim emri yok) devralınamaz. */
export const DEVRALMA_TURLERI = ["dukkan"] as const;

// ── Han yolcu havuzu (§5.3) ──

/** [PARAMETRE] Yerleşimin aylık yolcu bütçesi Y (akçe). Köyde oyuncu hanı yok; eski köy hanı kaydı için küçük değer. */
export const YOLCU_BUTCESI: Readonly<Record<YerlesimTuru, number>> = { koy: 12, kasaba: 30, sehir: 80 };
/** [PARAMETRE] Han çekiciliği: (100 / fc)^üs × (1 + kalite%) × R × H. */
export const YOLCU_FIYAT_US = 1.5;
/** [PARAMETRE] NPC hanının sabit çekiciliği (fc 100, kalite 0, itibar 10 olan yeni oyuncu hanıyla eş). */
export const NPC_HAN_CEKICILIK = 0.6;
/** [PARAMETRE] Han başına yolcu payı tavanı = bugünkü seviye tavanı (NPC_GELIR_TAVAN) × bu (şehirde büyük han). */
export const YOLCU_TAVAN_CARPANI: Readonly<Record<YerlesimTuru, number>> = { koy: 1, kasaba: 1, sehir: 1.5 };

// ── Teslim ──

/** [PARAMETRE] Ay dönümü kayıtları (raf hasılatı, yolcu payı) için çıkış kutusunda ayrılan ek yer. */
export const TEZGAH_KAYIT_PAYI = 32;
/** [PARAMETRE] Gün sonu dökümünde tutulan en çok satır (raf satırı sınırı kadar). */
export const DOKUM_SATIR_EN_COK = 10;

// ── Türetilenler ──

/** Malı olan üretici meslekler (taban > 0 malı bulunan; belge §5.2: 8 meslek). */
export const URETICI_MESLEKLER: readonly MeslekId[] = [...new Set(MAL_IDLERI.filter((m) => MALLAR[m].taban > 0).map((m) => MALLAR[m].meslek))];

/** Satılabilir mal (tabanı 0 olan mal rafa çıkmaz). */
export function rafMaliMi(m: MalId): boolean {
  return MALLAR[m].taban > 0;
}
