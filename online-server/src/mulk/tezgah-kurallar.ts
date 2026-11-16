// Tezgâh modeli Dilim 1 parametreleri (docs/superpowers/specs/2026-11-16-tezgah-modeli-design.md §4–5). Hepsi
// [PARAMETRE] ve tek dosyada; gizli sayı yoktur: her etki istemciye döküm olarak döner (raf, gün sonu, önizleme,
// yolcu payı). Denge sınırları test/tezgah-sim.test.ts ile kilitlidir (§5.4); bir değeri değiştiren o testi koşar.

import type { YerlesimTuru } from "../dunya-veri.ts";
import type { MeslekId } from "../icerik/meslekler.ts";
import { MALLAR, MAL_IDLERI, type MalId } from "../icerik/mallar.ts";
import { TARIFLER } from "../icerik/tarifler.ts";

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
/** Devralınabilen türler (Dilim 2: atölye de; etkinlik ölçütü üretim ya da toplu sipariş teslimi). */
export const DEVRALMA_TURLERI = ["dukkan", "atolye"] as const;

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

// ── Dilim 2: atölye (§6) ──

/** [PARAMETRE] Atölyenin tezgâh sayısı seviyeye göre: aynı anda açık üretim emri sınırı. */
export const TEZGAH_SAYISI: readonly number[] = [1, 2, 3, 4, 5];
/** [PARAMETRE] Atölyede üretimde kalite puanına seviye başına eklenen puan (adet artmaz). */
export const ATOLYE_KALITE_SEVIYE_PUANI = 5;
/** [PARAMETRE] Zanaat değişikliği: ilk bu kadar değişiklik ücretsiz, sonrası akçe (beyliğe; dünyadan çıkar). */
export const ZANAAT_UCRETSIZ_DEGISIM = 1;
export const ZANAAT_DEGISIM_BEDELI = 30;
/** [PARAMETRE] Emek havuzu tavanı = tezgâh sayısı × bu (oyuncu mesaisi; takat → emek 1:1). */
export const EMEK_HAVUZU_TEZGAH_BASI = 6;
/** [PARAMETRE] Tek mesai isteğinde en çok bağlanan emek (takat zaten sınırlar). */
export const MESAI_TEK_EN_COK = 18;
/**
 * [PARAMETRE] NPC çalışanın aylık emeği. Biriktirilmez: yalnız o ayın dönümünde kullanılır, kullanılmayan yanar
 * (kepenkli ayda maaş da işlemez; biriktirip tek maaşla üretmek kapalı).
 */
export const NPC_EMEK_AY = 2;
/** [PARAMETRE] NPC emeği kalite cezası: yapımdaki NPC emek payı × bu (tam NPC yapımı ≈ bir kademe düşük). */
export const NPC_EMEK_KALITE_CEZA = 30;
/** [PARAMETRE] Bir üretim emrinde en çok yapım (tarifin kaç kez yapılacağı). */
export const EMIR_KEZ_EN_COK = 24;
/** [PARAMETRE] Ay dönümü üretim dökümünde tutulan en çok emir satırı. */
export const URETIM_DOKUM_EN_COK = 8;

/** Tarifin taban fiyatla emek başına marjı: (çıktı + yan − girdi − araç aşınma payı) / takat (emirle üretim: beceri verimi yok). */
export function emekMarji(t: { girdi: Partial<Record<MalId, number>>; cikti: readonly [MalId, number]; takat: number; arac?: { mal: MalId; adet: number; zorunlu?: true }; yan?: Partial<Record<MalId, number>> }): number {
  const deger = (l: Partial<Record<MalId, number>>) => Object.entries(l).reduce((a, [m, n]) => a + MALLAR[m as MalId].taban * (n ?? 0), 0);
  const girdi = deger(t.girdi);
  const yan = deger(t.yan ?? {});
  const taban = MALLAR[t.cikti[0]].taban;
  const aracsiz = t.arac?.zorunlu ? -Infinity : taban * t.cikti[1] + yan - girdi;
  const aracli = t.arac ? taban * t.arac.adet + yan - girdi - MALLAR[t.arac.mal].taban / (MALLAR[t.arac.mal].omur ?? 4) : -Infinity;
  return Math.max(aracsiz, aracli) / t.takat;
}

/**
 * [PARAMETRE, türetilmiş] Atölyede NPC çalışanın en düşük aylık maaşı: NPC_EMEK_AY × en kârlı tarifin emek marjı
 * (yukarı). §8 (a): NPC emeğiyle üretip NPC'ye taban fiyattan satmak kâr ettirmez (maaş + girdi ≥ çıktı tabanı).
 */
export const NPC_ATOLYE_MAAS_EN_AZ = Math.ceil(NPC_EMEK_AY * Math.max(...Object.values(TARIFLER).map((t) => emekMarji(t as never))));

/** Zanaat olabilecek meslekler: tarifi olanlar (oduncu, çiftçi, demirci, marangoz, dokumacı, aşçı, kâtip). */
export const ZANAAT_MESLEKLERI: readonly MeslekId[] = [...new Set(Object.values(TARIFLER).map((t) => t.meslek as MeslekId))].sort();

// ── Dilim 2: toplu sipariş ──

/** [PARAMETRE] Toplu siparişin taban değeri (adet × taban) en çok bu; ödül ⌈değer × çarpan⌉ (≤ 84). */
export const TOPLU_DEGER_EN_COK = 60;
export const TOPLU_ODUL_CARPANI = 1.4;
/** [PARAMETRE] Açık kalma süresi (ay) ve kapananların listede kalma süresi. Yerleşimde aynı anda en çok bir açık sipariş. */
export const TOPLU_SURE = 2;
export const TOPLU_TUTMA_AY = 4;

// ── Dilim 2: genişletme (seviye atlayınca kapasite malzemeyle açılır) ──

/**
 * [PARAMETRE] Seviye s'nin kapasitesini (raf satırı, tezgâh, depo) açmak için depodan düşen malzeme (indis s − 1).
 * Hepsi NPC'den alınabilir (taban > 0): yerleşimde üreticisi olmasa da kilitlenme yok (test).
 */
export const GENISLETME_MALZEME: Readonly<Record<"dukkan" | "atolye", readonly Readonly<Partial<Record<MalId, number>>>[]>> = {
  dukkan: [
    { kereste: 6, civi: 6 },
    { kereste: 8, civi: 8, dograma: 1 },
    { kereste: 10, civi: 10, dograma: 2, kesmeTas: 4 },
    { kiris: 2, civi: 12, dograma: 3, kesmeTas: 6 },
  ],
  atolye: [
    { kereste: 8, civi: 6 },
    { kereste: 10, civi: 8, kesmeTas: 3 },
    { kiris: 1, civi: 10, dograma: 2, kesmeTas: 5 },
    { kiris: 2, civi: 14, dograma: 3, kesmeTas: 8 },
  ],
};
