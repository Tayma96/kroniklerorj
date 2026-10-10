// Gerçek takvimin yumuşak ritmi: ana ekranda tek satır, "dışarıda" ne mevsim/bayram olduğunu kasabaya yansıtır.
// Yalnızca söz: ödül, bonus, süre, seri, kaçırılacak bir şey YOK (TASARIM_PUSULASI — FOMO yok). Oyun durumunu
// okumaz/yazmaz; tarih dışarıdan verilir (ekran kendi saatini okur, oyun mantığı saat okumaz).
export const RITIM_GUNLER: { k: string; ay: number; gun: number }[] = [
  { k: "yilbasi", ay: 1, gun: 1 }, { k: "nevruz", ay: 3, gun: 21 }, { k: "hidrellez", ay: 5, gun: 6 },
  { k: "gundonumu", ay: 6, gun: 21 }, { k: "esitlik", ay: 9, gun: 22 }, { k: "yalda", ay: 12, gun: 21 },
];
// Ramazan/Kurban bayramları ay takvimine bağlı; yaklaşık tarihler (±1 gün) — pencere 3 gün olduğundan sapma zarar vermez.
export const RITIM_BAYRAM: [number, number, number][] = [
  [2026, 3, 20], [2026, 5, 27], [2027, 3, 10], [2027, 5, 17], [2028, 2, 27], [2028, 5, 5],
  [2029, 2, 15], [2029, 4, 24], [2030, 2, 5], [2030, 4, 13], [2031, 1, 25], [2031, 4, 2],
];
export const RITIM_PENCERE = 1; // günün kendisi ± 1 gün
const MEVSIM = ["kis", "kis", "ilkbahar", "ilkbahar", "ilkbahar", "yaz", "yaz", "yaz", "sonbahar", "sonbahar", "sonbahar", "kis"];
const gunNo = (y: number, a: number, g: number) => Math.floor(Date.UTC(y, a - 1, g) / 86400000);

// Verilen yerel tarihin satır anahtarı: önce özel gün, yoksa mevsim (iki çeşitleme, günün tekliğine göre).
export function gercekRitim(d: Date): string {
  const y = d.getFullYear(), a = d.getMonth() + 1, g = d.getDate(); const n = gunNo(y, a, g);
  for (const [by, ba, bg] of RITIM_BAYRAM) if (Math.abs(n - gunNo(by, ba, bg)) <= RITIM_PENCERE) return "ritim.bayram";
  for (const r of RITIM_GUNLER) for (const yy of [y - 1, y, y + 1]) if (Math.abs(n - gunNo(yy, r.ay, r.gun)) <= RITIM_PENCERE) return "ritim." + r.k;
  return "ritim." + MEVSIM[a - 1] + "." + (g % 2);
}
