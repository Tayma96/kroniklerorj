// Oyuncu adı: her kelimenin ilk harfi büyük ("berkay cinkılıç" → "Berkay Cinkılıç"). Türkçede i → İ, ı → I.
// Yazılanın geri kalanına dokunmaz (ör. "McAdam", "al-Rashid" korunur).
export function adBicim(ad: string, lang = "tr"): string {
  const yerel = lang === "tr" ? "tr-TR" : undefined;
  return ad.split(/(\s+)/).map((k) => (k.trim() ? k.charAt(0).toLocaleUpperCase(yerel) + k.slice(1) : k)).join("");
}
