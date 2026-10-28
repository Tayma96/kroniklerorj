// Kül & Köz tasarım tokenları; koyu kahve zemin, keskin pirinç-altın vurgu (claude-paket mockup).
export const C = {
  bg: "#0E0A06",
  surface: "#17110A",
  card: "#1D160D",
  cardHi: "#2A1F13",
  border: "#4A3820",
  borderHi: "#7A5C33",
  gold: "#DDB45A",
  goldBright: "#F3D27A",
  goldDim: "#A07A3A",
  parchment: "#EEDFC2",
  parchmentDim: "#CDB98F",
  parchmentMuted: "#A8946E",  // okunur soluk metin: kart zemininde AA kontrastı (≈5.6:1)
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
