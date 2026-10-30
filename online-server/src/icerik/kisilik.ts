// NPC kişilik verisi: huy, tuhaflık, hayal ve meslek. Saf veri.
// Kaynak: mobile/lib/world.ts → TRAITS, QUIRKS, GOALS, NPC_PROFS (tek oyunculu). Kopyadır; mobil kod içe aktarılmaz.
// Değerler Türkçe kanonik biçimdir; istemci tek oyunculudaki çeviri tablolarıyla (traitL, quirkL, goalL,
// professionNameL) yerelleştirir. Sıra değişmez: NPC kaydı dizin tutar.

/** TRAITS */
export const HUYLAR: readonly string[] = [
  "neşeli",
  "ciddi",
  "kibirli",
  "cömert",
  "dertli",
  "yalnız",
  "kurnaz",
  "mert",
  "dindar",
  "hırslı",
  "utangaç",
  "sıcakkanlı",
  "misafirperver",
  "unutkan",
  "sabırlı",
  "aceleci",
];

/** QUIRKS */
export const TUHAFLIKLAR: readonly string[] = [
  "sürekli hava durumundan dert yanar",
  "eski günleri anlatmayı sever",
  "herkese lakap takar",
  "az konuşur çok dinler",
  "yüksek sesle güler",
  "pazarlığa bayılır",
  "komşularını çekiştirir",
  "bir türküyü mırıldanır",
  "sözüne hep bir atasözü katar",
  "cebinde kuru üzüm taşır, çocuklara dağıtır",
  "gölgeye bakıp vakti şaşmaz bilir",
  "selamı herkese adıyla verir",
  "gördüğü her kuşa ekmek ufalar",
  "eşiğini günde iki kez süpürür",
];

/** GOALS (hayaller) */
export const HAYALLER: readonly string[] = [
  "bir dükkân açmanın hayalini kuruyor",
  "kızını/oğlunu evermek istiyor",
  "borçlarından kurtulmaya çalışıyor",
  "hacca gitmeyi diliyor",
  "toprak satın almak için biriktiriyor",
  "ustabaşı olmak istiyor",
  "küs olduğu kardeşiyle barışmak istiyor",
  "bir ev yaptırmanın derdinde",
  "kervan ticaretine atılmak istiyor",
  "adını duyurmak istiyor",
  "yıllardır görmediği memleketini görmek istiyor",
  "çırağını kendi dükkânına kavuşturmak istiyor",
  "babasından kalma bağı yeniden yeşertmek istiyor",
  "bir yetimi yanına çırak almak istiyor",
];

/** NPC_PROFS (yetişkin meslekleri; "işsiz" dahil) */
export const MESLEKLER: readonly string[] = [
  "çiftçi",
  "demirci",
  "tüccar",
  "balıkçı",
  "avcı",
  "çoban",
  "fırıncı",
  "müzisyen",
  "şifacı",
  "asker",
  "işsiz",
];
