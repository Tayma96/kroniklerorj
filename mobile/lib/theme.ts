// Kül & Köz tasarım tokenları (web index.css'ten birebir).
export const C = {
  bg: "#0D0A06",
  surface: "#1B150D",
  card: "#241B11",
  cardHi: "#302419",
  border: "#493823",
  borderHi: "#705633",
  gold: "#D8B35A",
  goldBright: "#FFD36C",
  goldDim: "#A98236",
  parchment: "#F2E2C4",
  parchmentDim: "#D2BC91",
  parchmentMuted: "#B9A47D",  // okunur soluk metin: kart zemininde AA kontrastı
  blood: "#C84040",
  sage: "#4A9A5A",
  ember: "#E05A30",
  ink: "#7B4FAF",
  azure: "#5E86A8",
  rose: "#D4528A",
  roseDim: "#C0556B",     // gül kurusu — olumsuz/duygu vurgusu (denetimle jetonlaştı)
  frost: "#6FA0C0",       // buz mavisi — kış/su vurgusu (denetimle jetonlaştı)
  emberSoft: "#E0922E",   // yumuşak köz — turuncu ara ton (denetimle jetonlaştı)
  goldSoft: "#E0BC5A",    // yumuşak altın — pencere ışığı/rozet (denetimle jetonlaştı)
  inkOnGold: "#1a1206",   // altın zemin üstü mürekkep — altın butonların yazı/ikon rengi (denetimle jetonlaştı)
};

// Yazı tipi aileleri (expo-font ile yüklenecek: Cinzel = display, Crimson = serif)
export const F = {
  display: "Cinzel_700Bold",
  displayReg: "Cinzel_400Regular",
  serif: "CrimsonText_400Regular",
  serifItalic: "CrimsonText_400Regular_Italic",
};

// Okunabilir ekran ailesi; taslak: docs/tasarim/EKRANLAR.md. Sistem font ölçeği korunur.
export const T = { caption: 12, label: 13, body: 15, bodyLg: 16, title: 18, display: 22, line: 22, lineLg: 24 } as const;
export const L = { page: 16, gap: 12, radius: 12, touch: 44, hero: 196 } as const;
