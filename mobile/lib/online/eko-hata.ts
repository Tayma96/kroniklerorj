// Faz 6 ekonomi ve Faz 12–13 mülk/işletme hata kodları (online-server/src/tipler.ts HATA_DURUMU "Ekonomi" ve
// "Mülkiyet ve işletme" bölümleri). ek-istemci.ts EK_HATALAR'a katılır; metinler i18n-sayfa/online10.ts "onl.hh.<kod>".
// Yaprak dosyadır: hiçbir online modülünü içe aktarmaz.
export const EKO_MULK_HATALARI = [
  "ilan_gecersiz", "ilan_yok", "ilan_kapandi", "ilan_siniri", "pompa_siniri", "ayni_kume",
  "ismarlama_gecersiz", "ismarlama_yok", "ismarlama_kapandi", "ismarlama_siniri",
  "isletme_yok", "isletme_kapali", "mulk_tur_gecersiz", "mulk_dolu", "mulk_siniri", "edinim_sarti", "ad_jetonu_yok",
  "tezyin_gecersiz", "tezyin_var", "tezyin_siniri", "tutar_gecersiz", "kasa_yetersiz", "cekim_tavani", "emanet_yetersiz",
  "transfer_bekliyor", "carpan_gecersiz", "rol_gecersiz", "yetki_gecersiz", "maas_gecersiz", "maas_kesinti", "personel_dolu",
  "zaten_calisan", "teklif_var", "vekil_var", "sozlesme_yok", "han_dolu",
] as const;
