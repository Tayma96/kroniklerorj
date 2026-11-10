// Mülkiyet ve işletmecilik parametreleri (GDD §17, Faz 12–13). Hepsi [PARAMETRE]: yönetim paneline açılabilir,
// gizli sayı yoktur; etkiler istemciye döküm olarak döner. Ortak çekirdek: han, dükkân ve atölye aynı modeli kullanır,
// yalnız taban gelir, bakım ve kapasite tabloları ayrıdır (§17 "Ortak çekirdek").

import type { YerlesimTuru } from "../dunya-veri.ts";
import type { Kademe, MeslekId } from "../icerik/meslekler.ts";

export const MULK_TURLERI = ["han", "dukkan", "atolye"] as const;
export type MulkTuru = (typeof MULK_TURLERI)[number];

/** [PARAMETRE] Yerleşim başına mülk yuvası. Han yuvası yerleşimin tek hanıdır (masaları olan han; NPC ya da oyuncu). */
export const MULK_YUVA: Readonly<Record<YerlesimTuru, Readonly<Record<MulkTuru, number>>>> = {
  sehir: { han: 1, dukkan: 4, atolye: 3 },
  kasaba: { han: 1, dukkan: 2, atolye: 2 },
  koy: { han: 1, dukkan: 1, atolye: 1 },
};

/** [PARAMETRE] Edinim bedeli (akçe; beyliğe ödenir, dünyadan çıkar). Çırağın aylık emeği ~12 akçe. */
export const EDINIM_FIYATI: Readonly<Record<YerlesimTuru, Readonly<Record<MulkTuru, number>>>> = {
  sehir: { han: 400, dukkan: 180, atolye: 220 },
  kasaba: { han: 250, dukkan: 120, atolye: 150 },
  koy: { han: 120, dukkan: 60, atolye: 80 },
};

/**
 * [PARAMETRE, D-17 önerisi] Edinim şartı: akçe + (nam eşiği ya da lonca üyeliği). Tek hamlede (yalnız parayla)
 * alınamaz. Nam: dört eksenin toplamı (0–400). Lonca üyeliği: herhangi bir meslekte en az bu kademe (kalfa).
 */
export const EDINIM_NAM_ESIGI = 60;
export const EDINIM_LONCA_KADEME: Kademe = 1;
/** [PARAMETRE] Edinim yaşı (yetişkinlik). */
export const EDINIM_YASI = 16;
/** [PARAMETRE] Kişi başına mülk sınırı (GDD §17: başlangıç 2). */
export const KISI_MULK_EN_COK = 2;

/** [PARAMETRE] Aylık bakım gideri (kasadan; dünyadan çıkar). Ödenemeyen kısım bakım borcudur. */
export const BAKIM: Readonly<Record<MulkTuru, number>> = { han: 6, dukkan: 3, atolye: 4 };
/** [PARAMETRE] Bu kadar ay üst üste borçlu kalan işletme iflas eder: mülk beyliğe döner, karakter silinmez. */
export const IFLAS_BORC_AY = 3;

/**
 * [PARAMETRE] NPC müşteri geliri (aylık; dünyaya giren akçe). Tavanlı: seviye tavanını aşamaz. Formül (döküm):
 * taban × (1 + itibar/100) × (1 + kalite%/100) × (1 + sahibin teveccüh müşteri etkisi%/100), aşağı yuvarlanır.
 */
export const NPC_GELIR_TABAN: Readonly<Record<MulkTuru, number>> = { han: 6, dukkan: 4, atolye: 5 };
export const NPC_GELIR_TAVAN: readonly number[] = [10, 16, 24, 34, 46];

/** Seviyeler (GDD §17): yükselme yalnız paraya bağlı değil (itibar + faaliyet süresi + gelir). */
export const SEVIYELER = ["mutevazi", "gelisen", "taninmis", "prestijli", "simge"] as const;
export type Seviye = (typeof SEVIYELER)[number];
/** [PARAMETRE] Seviye puanı eşikleri. Puan = itibar + min(faaliyet ayı, 36) + min(⌊toplam gelir / 50⌋, 30). */
export const SEVIYE_ESIKLERI: readonly number[] = [0, 35, 65, 95, 125];
export const SEVIYE_FAALIYET_TAVAN = 36;
export const SEVIYE_GELIR_BOLEN = 50;
export const SEVIYE_GELIR_TAVAN = 30;

/** [PARAMETRE] Kapasite yalnız seviyeden gelir; parayla (akçe ya da gerçek para) artmaz. Han: eşzamanlı oda kiracısı. */
export const KAPASITE: Readonly<Record<MulkTuru, readonly number[]>> = {
  han: [3, 5, 7, 9, 12],
  dukkan: [1, 2, 2, 3, 4],
  atolye: [1, 1, 2, 2, 3],
};
/** [PARAMETRE] Oyuncu hanının sunduğu odalar seviyeye göre (has oda tanınmış seviyede açılır). */
export const HAN_ODA_SEVIYESI = { yatak: 0, oda: 0, hasOda: 2 } as const;

/** [PARAMETRE] İşletme itibarı (karakter itibarından ayrı, 0–100). */
export const ITIBAR_BASLANGIC = 10;
export const ITIBAR_EN_COK = 100;
/** Aylık: kalite kademesi başına +, sayılan müşteri başına + (tavanlı), borçluyken −, maaş ödenmezse sözleşme başına −. */
export const ITIBAR_KALITE = 1;
export const ITIBAR_MUSTERI = 1;
export const ITIBAR_MUSTERI_TAVAN = 4;
export const ITIBAR_BORC = 3;
export const ITIBAR_MAAS_BOZMA = 8;
export const ITIBAR_TEZYIN_TAVAN = 6;

/** [PARAMETRE] Fiyat çarpanı (%): menü ve oda fiyatı. Fiyat yetkisiyle değişir. */
export const FIYAT_CARPANI_EN_AZ = 50;
export const FIYAT_CARPANI_EN_COK = 150;

/** Kişiselleştirme (GDD §17, oyun içi akçeyle; kasadan ödenir, dünyadan çıkar). Kapasiteyi değiştirmez. */
export const TEZYIN = {
  mimari: { selcuklu: { fiyat: 40, itibar: 1 }, ahsap: { fiyat: 20, itibar: 0 }, tas: { fiyat: 60, itibar: 2 } },
  atmosfer: { sakin: { fiyat: 10, itibar: 0 }, hareketli: { fiyat: 15, itibar: 1 }, luks: { fiyat: 50, itibar: 2 }, mutevazi: { fiyat: 5, itibar: 0 } },
  aydinlatma: { kandil: { fiyat: 5, itibar: 0 }, samdan: { fiyat: 15, itibar: 1 }, avize: { fiyat: 45, itibar: 2 } },
  ozelAlan: { yok: { fiyat: 0, itibar: 0 }, misafirOdasi: { fiyat: 35, itibar: 1 }, toplantiOdasi: { fiyat: 35, itibar: 1 } },
} as const satisfies Record<string, Record<string, { fiyat: number; itibar: number }>>;
export type TezyinGrubu = keyof typeof TEZYIN;
/** [PARAMETRE] Toplam tezyin değişikliği tavanı (işletme durum boyutu sınırı; GDD §17 Teknik). */
export const TEZYIN_DEGISIM_EN_COK = 24;

/** [PARAMETRE] İşletme adı: 3–32 harf; ilk değişiklik ücretsiz, sonrası ad jetonuyla (Debdebe; ödeme bağlantısı yok). */
export const ISLETME_AD_EN_KISA = 3;
export const ISLETME_AD_EN_UZUN = 32;
export const AD_UCRETSIZ_DEGISIM = 1;

// ── Faz 13: çalışan, yetki, maaş, emanet ──

export const YETKILER = ["kasa", "musteri", "fiyat", "personel", "vekalet", "masa"] as const;
export type Yetki = (typeof YETKILER)[number];
export const ROLLER = ["hanci", "garson", "asci", "ozan", "yonetici"] as const;
export type Rol = (typeof ROLLER)[number];
/** [PARAMETRE] Rolün önerilen yetkileri (işe alımda başlangıç; sonra tek tek verilir/alınır). */
export const ROL_YETKILERI: Readonly<Record<Rol, readonly Yetki[]>> = {
  hanci: ["musteri", "fiyat"],
  garson: ["musteri"],
  asci: [],
  ozan: ["masa"],
  yonetici: ["kasa", "musteri", "fiyat", "personel", "masa"],
};
/** Meslek–kalite bağı (GDD §17): rolün kalitesini belirleyen meslek. */
export const ROL_MESLEGI: Readonly<Record<Rol, MeslekId | null>> = {
  hanci: "hanci",
  garson: "hanci",
  asci: "asci",
  ozan: "ozan",
  yonetici: "tuccar",
};
/** [PARAMETRE] İşletme türünün kaliteyi taşıyan rolleri (sahip, bu rolde kimse yoksa kendi kademesiyle sayılır). */
export const KALITE_ROLLERI: Readonly<Record<MulkTuru, readonly Rol[]>> = {
  han: ["hanci", "asci", "ozan"],
  dukkan: ["yonetici"],
  atolye: ["yonetici"],
};
/** [PARAMETRE] Kalite kademesi başına NPC müşteri geliri artışı (%) ve NPC çalışanın varsayılan meslek kademesi. */
export const KALITE_GELIR_YUZDE = 5;
export const NPC_CALISAN_KADEMESI: Kademe = 1;

/** [PARAMETRE] Personel sınırı, maaş aralığı (aylık akçe), teklif ve öneri sınırları. */
export const PERSONEL_EN_COK = 8;
export const MAAS_EN_AZ = 1;
export const MAAS_EN_COK = 60;
export const TEKLIF_EN_COK = 6;
export const TEKLIF_SURE_AY = 2;
export const ONERI_EN_COK = 6;
/** [PARAMETRE] İşten çıkarmada çalışana emanetten ödenen tazminat (aylık maaş × bu). */
export const CIKARMA_TAZMINAT_AY = 1;
/** [PARAMETRE] Vekâlet en uzun süresi (ay). */
export const VEKALET_EN_UZUN_AY = 6;

/** [PARAMETRE] Kasa → cüzdan günlük (TR günü) çekim tavanı: sahip ve kasa yetkili çalışan (vekil de çalışan sayılır). */
export const SAHIP_GUNLUK_CEKIM = 200;
export const CALISAN_GUNLUK_CEKIM = 20;
/** [PARAMETRE] Tek yatırma/çekme işleminin üst sınırı. */
export const TRANSFER_EN_COK = 10_000;

/** [PARAMETRE] Durum boyutu: muhasebe defteri, izleme ve sözleşme arşivi. */
export const DEFTER_EN_COK = 40;
export const IZLEME_EN_COK = 40;
export const SOZLESME_ARSIV_EN_COK = 12;

/**
 * [PARAMETRE] Çoklu hesap izleme kancası (GDD §17): sahiple aynı hesap kümesinden (aynı hane) ya da karşılıklı
 * işlemle (aynı ay iki sahibin birbirinin işletmesine ödemesi) gelen ödeme kasaya girer ama itibar/seviye puanına
 * sayılmaz ve izleme kaydına bayrakla yazılır. Bayrak sayısı bu eşiği geçen ay yönetim kancası "inceleme" der.
 */
export const IZLEME_INCELEME_ESIGI = 3;

/** İşletme kimliği: "<yerleşim>.<tür>.<no>". */
export function isletmeKimligi(yerlesim: string, tur: MulkTuru, no: number): string {
  return `${yerlesim}.${tur}.${no}`;
}

const KIMLIK_DESENI = /^([a-z0-9-]{1,40})\.(han|dukkan|atolye)\.([1-9][0-9]?)$/;

export function isletmeCoz(ham: unknown): { id: string; yerlesim: string; tur: MulkTuru; no: number } | undefined {
  if (typeof ham !== "string") return undefined;
  const m = KIMLIK_DESENI.exec(ham);
  if (!m) return undefined;
  return { id: ham, yerlesim: m[1]!, tur: m[2] as MulkTuru, no: Number(m[3]) };
}

export function seviyeSirasi(puan: number): number {
  let s = 0;
  for (let i = 1; i < SEVIYE_ESIKLERI.length; i++) if (puan >= SEVIYE_ESIKLERI[i]!) s = i;
  return s;
}
