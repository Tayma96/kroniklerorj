// Çevrimiçi Faz 1 ekranlarının kapısı. Uygulamada /online rotaları yalnız ONLINE_GELISTIRME açıkken çalışır;
// kapalıyken "Yakında" ekranı görünür (ONLINE_ACIK ve Yakında ekranı değişmez).
//
// Tasarım önizlemesi istisnası: scripts/design-preview.cjs ekranları react-native-web ile tarayıcıda çizer ve
// çizimden önce window.__GAME / window.__PATH koyar. onizlemeMi() yalnız Platform.OS === "web" iken ve bu iki
// küresel varken doğrudur; telefondaki uygulamada Platform.OS hiçbir zaman "web" olmadığından açılamaz.
// Önizleme kapıyı açar ve sahte verili geliştirici oturumuyla başlar (lib/online/onizleme.ts).
import { Platform } from "react-native";
import { ONLINE_GELISTIRME } from "../mp/config";

export function onizlemeMi(): boolean {
  if (Platform.OS !== "web") return false;
  const g = globalThis as { __GAME?: unknown; __PATH?: unknown };
  return typeof g.__GAME === "object" && g.__GAME !== null && typeof g.__PATH === "string";
}

/** /online ekranları açık mı (geliştirici bayrağı ya da tasarım önizlemesi). Çizim anında çağrılır. */
export function onlineEkranAcik(): boolean {
  return ONLINE_GELISTIRME || onizlemeMi();
}
