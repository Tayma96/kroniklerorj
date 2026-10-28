import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { NavigationBar } from "expo-navigation-bar";
import { View, ActivityIndicator, Text, Pressable } from "react-native";
import { useEffect, useState } from "react";
import { GameProvider } from "../lib/store";
import { MpProvider } from "../lib/mp/store";
import { RealmSession } from "../lib/mp/RealmSession";
import { LanguageProvider } from "../lib/i18n";
import { LoadingScreen } from "../lib/fx";
import { initializeAudio } from "../lib/sound";
import { SesYonetmen } from "../lib/ses-yonetmen";
import { KayitDurum, KayitGecisi } from "../lib/kayit-durum";
import { loadHapticsSetting } from "../lib/haptics";
import { loadReduceMotion } from "../lib/perf";
import { C } from "../lib/theme";

// Açılış hiçbir koşulda asılı kalmasın: font yüklemesi hata verirse ya da 6 sn'yi aşarsa sistem fontuyla devam edilir.
// Erişilebilirlik: cihazın "büyük yazı" ayarı oyunda çalışır; %125 tavanı sabit-yükseklikli satırların taşmasını önler.
// (defaultProps RN 0.7x'te Text için hâlâ geçerli; ileride kalkarsa no-op olur, açılışı etkilemez.)
try {
  const T: any = Text;
  T.defaultProps = T.defaultProps || {};
  if (T.defaultProps.maxFontSizeMultiplier == null) T.defaultProps.maxFontSizeMultiplier = 1.25;
} catch {}

export default function RootLayout() {
  // Yazı tipleri ⚜ ✓ ★ gibi sembolleri içerecek biçimde yeniden üretildi (scripts/yazitipi/sembol-gom.py):
  // Android bu sembolleri renkli emoji yazı tipinden çizmesin, metin renginde kalsın.
  const [loaded, fontError] = useFonts({
    Cinzel_400Regular: require("../assets/fonts/Cinzel_400Regular.ttf"),
    Cinzel_700Bold: require("../assets/fonts/Cinzel_700Bold.ttf"),
    Cinzel_400Regular_TR: require("../assets/fonts/Cinzel_400Regular_TR.ttf"),
    Cinzel_700Bold_TR: require("../assets/fonts/Cinzel_700Bold_TR.ttf"),
    CrimsonText_400Regular: require("../assets/fonts/CrimsonText_400Regular.ttf"),
    CrimsonText_400Regular_Italic: require("../assets/fonts/CrimsonText_400Regular_Italic.ttf"),
  });
  const [fontTimeout, setFontTimeout] = useState(false);
  useEffect(() => { const t = setTimeout(() => setFontTimeout(true), 6000); return () => clearTimeout(t); }, []);
  useEffect(() => {
    let gone = false, stop: (() => void) | undefined;
    void loadHapticsSetting();
    void loadReduceMotion().then(() => { if (!gone) stop = initializeAudio(); });
    return () => { gone = true; stop?.(); };
  }, []);
  if (!loaded && !fontError && !fontTimeout) {
    return <LoadingScreen />;
  }
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <GameProvider>
          <MpProvider>
            <StatusBar style="light" />
            {/* Diyar oturumu koordinatörü: MP tick'inde yerel hayatı ilerletir (UI çizmez). */}
            <RealmSession />
            <SesYonetmen />
            {/* Android sistem gezinme çubuğunu gizle (tam ekran / immersive); yukarı kaydırınca geçici görünür */}
            <NavigationBar hidden />
            <View style={{ flex: 1 }}>
              <KayitDurum />
              <KayitGecisi><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: "slide_from_right" }} /></KayitGecisi>
            </View>
          </MpProvider>
        </GameProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

// Beklenmedik bir JS hatasında oyuncu siyah ekranda mahsur kalmasın: hata + yeniden dene.
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#14100C", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Text style={{ color: "#E8DCC0", fontSize: 16, textAlign: "center", marginBottom: 6 }}>Bir aksilik oldu / Something went wrong</Text>
      <Text style={{ color: "#8A7E68", fontSize: 11, textAlign: "center", marginBottom: 18 }} numberOfLines={3}>{String(error?.message || error)}</Text>
      <Pressable onPress={retry} style={{ borderWidth: 1, borderColor: C.gold, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 22 }}>
        <Text style={{ color: C.gold, fontSize: 13, letterSpacing: 1 }}>YENİDEN DENE / RETRY</Text>
      </Pressable>
    </View>
  );
}
