// Hanedan (Faz 7) olay ve kronik anahtarlarının parametre sırası (şablondaki %1, %2 …). metin.ts bu tabloyu kendi
// tablosundan sonra okur; metinler i18n-sayfa/online6.ts'te ("onl." + anahtar).
export const HANEDAN_PARAM: Readonly<Record<string, string[]>> = {
  "olay.devir": ["olu", "varis", "nesil"],
  "olay.oyuncuOldu": ["kisi", "yas"],
  "olay.esOldu": ["kisi"],
  "olay.oyuncuEvlendi": ["a", "b"],
  "olay.oyuncuDogum": ["anne", "baba", "cocuk"],
  "olay.sonGunler": ["kisi", "ay", "aday"],
  "olay.yaslilik.basladi": ["takat"],
  "olay.yaslilik.beden": ["guc", "dayaniklilik"],
  "kronik.olum": ["kisi", "yas", "nesil"],
  "kronik.devir": ["olu", "varis", "nesil"],
  "kronik.evlilik": ["a", "b"],
  "kronik.dogum": ["anne", "baba", "cocuk"],
};
