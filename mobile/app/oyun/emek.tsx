// Emeği Geçenler: üçüncü taraf parçaların atfı ve lisansları (CC BY 3.0 simgeler, OFL yazı tipleri,
// yapay zekâ görselleri, MIT yazılımlar). Ayrıntılı döküm: mobile/UCUNCU-TARAF.md. Özel adlar ve lisans
// adları çevrilmez (her dilde aynı yazılır); açıklamalar 6 dilde i18n'den gelir.
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { useI18n } from "../../lib/i18n";
import { BackLabel, PageHeader, ScreenFresk } from "../../lib/ui";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";

import { SES_ATIF } from "../../lib/ses-atif";

type Bolum = { icon: string; baslik: string; not?: string; satirlar: string[] };

export default function Emek() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { t } = useI18n();
  const bolumler: Bolum[] = [
    { icon: "scroll", baslik: t("emek.yapim"), satirlar: ["Berkay (Tayma96)"] },
    { icon: "book", baslik: t("emek.font"), satirlar: [
      "Cinzel — © 2020 The Cinzel Project Authors",
      "Crimson Text — © 2010 The Crimson Text Project Authors",
      "SIL Open Font License 1.1 · openfontlicense.org",
    ] },
    { icon: "star", baslik: t("emek.simge"), not: t("emek.simgeNot"), satirlar: [
      "game-icons.net — Lorc, Delapouite, Carl Olsen, Skoll, Sbed & contributors",
      "CC BY 3.0 · creativecommons.org/licenses/by/3.0",
    ] },
    { icon: "crown", baslik: t("emek.gorsel"), not: t("emek.gorselNot"), satirlar: [
      "Powered by Stability AI — SD-Turbo (Stability AI Community License)",
      "FLUX.1 [schnell] — Black Forest Labs (Apache 2.0)",
    ] },
    { icon: "lyre", baslik: t("emek.ses"), not: t("emek.sesNot"), satirlar: SES_ATIF },
    { icon: "cog", baslik: t("emek.yazilim"), satirlar: [
      "Expo · React Native · React · Expo Router — MIT",
      "Reanimated · Worklets · Gesture Handler · Screens · Safe Area Context — MIT",
      "React Native Skia · React Native SVG · Async Storage — MIT",
    ] },
  ];
  return (
    <ScreenFresk style={{ paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={t("settings.title")} title={t("scr.emek")} sub={t("emek.intro")} />
        {bolumler.map((b) => (
          <View key={b.icon} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 11, padding: 14, marginBottom: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <GameIcon name={b.icon} size={15} color={C.gold} />
              <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1.5, color: C.gold, textTransform: "uppercase" }}>{b.baslik}</Text>
            </View>
            {b.satirlar.map((s) => (
              <Text key={s} style={{ fontFamily: F.serif, fontSize: 13, color: C.parchment, lineHeight: 20 }}>{s}</Text>
            ))}
            {b.not ? <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentDim, lineHeight: 18, marginTop: b.satirlar.length ? 6 : 0 }}>{b.not}</Text> : null}
          </View>
        ))}
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentDim, lineHeight: 18, textAlign: "center", marginTop: 8 }}>{t("emek.hak")}</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, textAlign: "center", marginTop: 12 }}>Kronikler: Küllerin Mirası · v{Constants.expoConfig?.version || "1.0.0"} · © 2026</Text>
      </ScrollView>
    </ScreenFresk>
  );
}
