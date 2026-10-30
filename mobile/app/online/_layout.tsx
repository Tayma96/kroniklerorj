// Çevrimiçi Faz 1 akışı: giriş → profil → yerleşim (ya da davet) → varış. Ortak durum sağlayıcısı burada;
// kapı kapalıyken (ONLINE_GELISTIRME = false) sağlayıcı kurulmaz, ekranlar "Yakında" gösterir.
import { Stack } from "expo-router";
import { OnlineDurumSaglayici } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { C } from "../../lib/theme";

export default function OnlineDuzen() {
  const yigin = <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: "slide_from_right" }} />;
  return onlineEkranAcik() ? <OnlineDurumSaglayici>{yigin}</OnlineDurumSaglayici> : yigin;
}
