// İsteğe bağlı barınma hatırlatması (GDD §12/§18 "uyarılar için opt-in bildirim"). Tamamen cihazda: yerel bildirim
// planlanır, sunucu ya da push servisi yoktur (ücretsiz, anahtarsız). Varsayılan kapalı; oyuncu açarsa konaklama bitişinden
// ve evsizlik eşiğinden önce tek bir hatırlatma kurulur. Her yeni barınma görünümünde eski plan silinip yeniden kurulur.
// Bildirim modülü derlemede yoksa (eski APK, web) sessizce hiçbir şey yapmaz.
import { Platform } from "react-native";
import type { BarinmaGorunumu } from "./barinma-veri";
import { hatirlatmaOku } from "./depo";

type Bildirim = typeof import("expo-notifications");
let modul: Bildirim | null | undefined;
function bildirim(): Bildirim | null {
  if (modul === undefined) {
    if (Platform.OS === "web") modul = null;
    else try { modul = require("expo-notifications") as Bildirim; } catch { modul = null; }
  }
  return modul;
}

const KIMLIK = "kronikler-barinma";
/** [PARAMETRE] Hatırlatmanın konaklama bitişinden ve evsizlik eşiğinden ne kadar önce geleceği. */
export const HATIRLATMA_ONCE_MS = 2 * 60 * 60 * 1000;
/** Çok yakın (bu kadardan az kalmış) anlar için bildirim kurulmaz; oyuncu zaten oyunda. */
const EN_AZ_MS = 5 * 60 * 1000;

export const hatirlatmaVarMi = () => bildirim() !== null;

/** İzin ister (yalnız oyuncu açarken). İzin yoksa false. */
export async function hatirlatmaIzni(): Promise<boolean> {
  const b = bildirim();
  if (!b) return false;
  try {
    const mevcut = await b.getPermissionsAsync();
    if (mevcut.granted) return true;
    return (await b.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export async function hatirlatmaSil(): Promise<void> {
  try { await bildirim()?.cancelScheduledNotificationAsync(KIMLIK); } catch {}
}

/**
 * Barınma görünümüne göre tek hatırlatma kurar. `fark` = sunucu saati − yerel saat (ms); `metin` çevrilmiş başlık/gövde.
 * Hedef: konaklama bitişi ya da zincirin sonraki aşaması (hangisi önceyse) eksi HATIRLATMA_ONCE_MS.
 */
export async function barinmaHatirlat(
  g: BarinmaGorunumu | null,
  fark: number,
  metin: (tur: "konak" | "zincir") => { baslik: string; govde: string },
): Promise<void> {
  const b = bildirim();
  if (!b) return;
  await hatirlatmaSil();
  if (!g?.acik || !(await hatirlatmaOku())) return;
  const adaylar: { an: number; tur: "konak" | "zincir" }[] = [];
  const k = g.konaklama;
  if (k?.bitis && k.tur !== "ocak") adaylar.push({ an: k.bitis, tur: "konak" });
  if (g.zincir?.sonraki) adaylar.push({ an: g.zincir.sonraki.an, tur: "zincir" });
  const yerelSimdi = Date.now();
  const hedef = adaylar
    .map((x) => ({ ...x, yerel: x.an - fark - HATIRLATMA_ONCE_MS }))
    .filter((x) => x.yerel - yerelSimdi > EN_AZ_MS)
    .sort((a, c) => a.yerel - c.yerel)[0];
  if (!hedef) return;
  const m = metin(hedef.tur);
  try {
    await b.scheduleNotificationAsync({
      identifier: KIMLIK,
      content: { title: m.baslik, body: m.govde },
      trigger: { type: b.SchedulableTriggerInputTypes.DATE, date: hedef.yerel },
    });
  } catch { /* izin geri alındıysa ya da sistem reddettiyse oyun etkilenmez */ }
}
