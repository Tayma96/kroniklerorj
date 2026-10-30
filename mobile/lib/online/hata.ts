// Hata kodu → oyuncuya gösterilecek i18n anahtarı (metinler i18n-sayfa/online.ts'te, 6 dil).
import type { OnlineHata } from "./protokol";

const ANAHTAR: Partial<Record<OnlineHata, string>> = {
  sunucu_yok: "onl.h.sunucuYok",
  ag_yok: "onl.h.ag",
  zaman_asimi: "onl.h.ag",
  google_erisilemiyor: "onl.h.ag",
  oturum_yok: "onl.h.oturum",
  oturum_gecersiz: "onl.h.oturum",
  oturum_suresi_doldu: "onl.h.oturum",
  google_gecersiz: "onl.h.google",
  hiz_siniri: "onl.h.hiz",
  ad_uzunluk: "onl.h.adUzunluk",
  ad_karakter: "onl.h.adKarakter",
  ad_yasak: "onl.h.adYasak",
  ad_alinmis: "onl.h.adAlinmis",
  yerlesim_dolu: "onl.h.dolu",
  yerlesim_gecersiz: "onl.h.yerlesim",
  davet_gecersiz: "onl.h.davetGecersiz",
  davet_yok: "onl.h.davetYok",
  profil_yok: "onl.h.profilYok",
};

export function hataAnahtari(kod: OnlineHata): string {
  return ANAHTAR[kod] ?? "onl.h.genel";
}

export const oturumHatasiMi = (kod: OnlineHata | null | undefined) =>
  kod === "oturum_yok" || kod === "oturum_gecersiz" || kod === "oturum_suresi_doldu";
export const adHatasiMi = (kod: OnlineHata | null | undefined) =>
  kod === "ad_uzunluk" || kod === "ad_karakter" || kod === "ad_yasak" || kod === "ad_alinmis";
