// Han sohbet filtresi (H3): 6 dilde (tr, en, es, pt, ar, ru) küfür/hakaret maskesi. İleti reddedilmez; eşleşen
// SÖZCÜK "•••" olur. Eşleşme sözcük sınırıyla yapılır (sözcük içinde arama yok: "kasap", "class", "sıkı", "sikke",
// "Scunthorpe" maskelenmez). Normalleştirme src/ad.ts ile aynı Türkçe küçük harf kuralıdır (`trKucuk`: İ→i, I→ı);
// ad.ts'deki gibi ç/ğ/ı/ö/ş/ü katlanmaz, çünkü sohbette katlama masum sözcükleri yakar ("sık" → "sik", "göt" ≠ "got").
// Ek olarak: NFKC, harf tekrarlarının daraltılması ("fuuuck"), rakam-harf kaçamağı ("s1k"), Arapça hareke/tatvil
// ve elif/ye biçimleri, Rusça ё→е. Liste kısa ve geneldir; bağlam çözümlemesi yoktur.

import { trKucuk } from "../ad.ts";

/** Maskelenen sözcüğün yerine konan metin. */
export const MASKE = "•••";

/** Rakam-harf kaçamakları (yalnız içinde harf de olan sözcükte uygulanır). */
const RAKAM: Readonly<Record<string, string>> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t" };

/** Sözcük normalleştirme (saf): liste ve ileti aynı fonksiyondan geçer. */
export function sozcukNormal(ham: string): string {
  let s = trKucuk(ham.normalize("NFKC"))
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ё/g, "е");
  if (/\p{L}/u.test(s) && /\d/.test(s)) s = s.replace(/\d/g, (d) => RAKAM[d] ?? d);
  return s.replace(/(.)\1{2,}/gu, "$1");
}

/** Tam sözcük eşleşmesi (sözcüğün kendisi). */
const SOZCUKLER: readonly string[] = [
  // tr
  "amk", "aq", "amq", "sik", "sikik", "sikim", "sikiş", "sikis", "siktir", "sikerim", "sikeyim", "sikiyim", "siktiğim",
  "göt", "götveren", "götlek", "ibne", "piç", "oç", "orospu", "yarrak", "pezevenk", "kahpe", "amcık",
  "amına", "amını", "aminakoyim", "aminakoyayim", "gavat", "puşt", "şerefsiz", "yavşak",
  // en
  "fuck", "fucks", "fucking", "fucker", "fuckers", "fucked", "shit", "shits", "shitty", "bullshit", "bitch", "bitches",
  "cunt", "cunts", "dick", "dicks", "dickhead", "ass", "asshole", "assholes", "bastard", "bastards", "whore", "whores",
  "slut", "sluts", "fag", "fags", "faggot", "faggots", "nigger", "niggers", "nigga", "niggas", "motherfucker",
  "motherfuckers", "retard", "retards", "wanker", "twat",
  // es
  "puta", "putas", "puto", "putos", "mierda", "coño", "cabrón", "cabron", "cabrones", "gilipollas", "pendejo", "pendeja",
  "pendejos", "maricón", "maricon", "maricones", "joder", "jodido", "jodida", "hijueputa", "hdp", "culero", "verga",
  "chingada", "chingado", "chingar",
  // pt
  "caralho", "porra", "merda", "foda", "foder", "fodido", "fodida", "fdp", "buceta", "viado", "cuzão", "cuzao",
  "arrombado", "arrombada",
  // ar
  "شرموطة", "شرموط", "منيوك", "متناك", "كس", "كسمك", "زب", "عرص", "خول", "قحبة", "يلعن",
  // ru
  "хуй", "хуя", "хуе", "хер", "пизда", "пиздец", "блядь", "бля", "блять", "сука", "суки", "сучка", "мудак", "мудила",
  "пидор", "пидар", "пидорас", "залупа", "ебать", "ебал", "ебаный", "уебок", "долбоеб", "гандон", "шлюха",
];

/**
 * Kök eşleşmesi (sözcük bu kökle BAŞLARSA): yalnız uzun ve masum sözcükle çakışmayan kökler. Kısa kökler ("sik",
 * "ass", "shit", "nigg") bilerek burada yoktur: "sikke", "assassin", "shiitake", "niggle" yanmasın.
 */
const KOKLER: readonly string[] = [
  "orospu", "yarrak", "pezevenk", "siktir", "amcık", "yavşak", "kahpe", "götveren",
  "fuck", "motherfuck", "cunt", "bitch", "faggot", "asshole",
  "hijueputa", "gilipollas", "pendej", "chingad",
  "caralh", "arrombad", "fodid",
  "شرموط", "منيوك", "متناك",
  "хуй", "хуе", "хуя", "пизд", "бляд", "ебан", "ебат", "ебал", "уеб", "долбоеб", "пидор", "пидар", "мудак", "залуп",
];

const YASAK = new Set(SOZCUKLER.map(sozcukNormal));
const YASAK_KOK = KOKLER.map(sozcukNormal);

/** Sözcük (harf, birleşik işaret ve rakam dizisi); sınırlar boşluk ve noktalamadır. */
const SOZCUK = /[\p{L}\p{M}\p{N}]+/gu;

export function yasakSozcukMu(sozcuk: string): boolean {
  const n = sozcukNormal(sozcuk);
  return YASAK.has(n) || YASAK_KOK.some((k) => n.startsWith(k));
}

/** Metindeki yasak sözcükleri MASKE ile değiştirir (saf). Yalnız eşleşen sözcükler değişir, geri kalan aynen kalır. */
export function sohbetMaskele(metin: string): string {
  return metin.replace(SOZCUK, (s) => (yasakSozcukMu(s) ? MASKE : s));
}
