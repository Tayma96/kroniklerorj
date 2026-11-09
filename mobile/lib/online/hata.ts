// Hata kodu → oyuncuya gösterilecek i18n anahtarı (metinler i18n-sayfa/online.ts'te, 6 dil).
import type { OnlineHata } from "./protokol";
import { TOPLUM_HATA_ANAHTARI } from "./toplum-metin";

const ANAHTAR: Partial<Record<OnlineHata, string>> = {
  ...TOPLUM_HATA_ANAHTARI,
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
  sakin_yok: "onl.h.sakinYok",
  kisi_yok: "onl.h.kisiYok",
  yas_kapisi: "onl.h.yasKapisi",
  ogrenme_kapali: "onl.h.ogrenmeKapali",
  hedef_uygun_degil: "onl.h.hedefUygunDegil",
  takat_yok: "onl.h.takatYok",
  para_yok: "onl.h.paraYok",
  zaten_cirak: "onl.h.zatenCirak",
  karar_verildi: "onl.h.kararVerildi",
  puan_yok: "onl.h.puanYok",
  isaret_gecersiz: "onl.h.isaretGecersiz",
  meslek_gecersiz: "onl.h.meslekGecersiz",
  meslek_yok: "onl.h.meslekYok",
  kademe_kapali: "onl.h.kademeKapali",
  dal_kapali: "onl.h.dalKapali",
  dugum_kapali: "onl.h.dugumKapali",
  geri_alma_dolu: "onl.h.geriAlmaDolu",
  mal_gecersiz: "onl.h.malGecersiz",
  kota_doldu: "onl.h.kotaDoldu",
  verim_yok: "onl.h.verimYok",
  tarif_gecersiz: "onl.h.tarifGecersiz",
  girdi_yok: "onl.h.girdiYok",
  mal_yok: "onl.h.malYok",
  siparis_yok: "onl.h.siparisYok",
  siparis_kapandi: "onl.h.siparisKapandi",
  eylem_gecersiz: "onl.h.genel",
  imlec_gecersiz: "onl.h.genel",
};

export function hataAnahtari(kod: OnlineHata): string {
  return ANAHTAR[kod] ?? "onl.h.genel";
}

export const oturumHatasiMi = (kod: OnlineHata | null | undefined) =>
  kod === "oturum_yok" || kod === "oturum_gecersiz" || kod === "oturum_suresi_doldu";
export const adHatasiMi = (kod: OnlineHata | null | undefined) =>
  kod === "ad_uzunluk" || kod === "ad_karakter" || kod === "ad_yasak" || kod === "ad_alinmis";
/** Giriş ekranında gösterilecek genel hatalar (ağ, sunucu, oturum); form hataları kendi ekranında kalır. */
export const genelHataMi = (kod: OnlineHata | null | undefined): kod is OnlineHata =>
  !!kod && !adHatasiMi(kod) && !kod.startsWith("davet") && !kod.startsWith("yerlesim") && kod !== "cinsiyet_gecersiz" && kod !== "profil_yok";
