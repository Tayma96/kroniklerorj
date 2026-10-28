import { View, Text, Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { useI18n } from "../../lib/i18n";
import { PageHeader, ScreenFresk } from "../../lib/ui";
import { PlaceGrid } from "../../lib/place-grid";
import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { C, F } from "../../lib/theme";

// Defter sekmesi: hayatın kaydı ve anıları; ayarlar ve yardım da burada.
export default function Defter() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { resetGame, mpMode } = useGame();
  const { t } = useI18n();
  const confirmReset = () => {
    Alert.alert(t("settings.newLife"), t("settings.reset"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: "✓", style: "destructive", onPress: async () => { try { await resetGame(); router.replace("/yeni-oyun"); } catch {} } },
    ]);
  };
  return (
    <ScreenFresk>
      <ScrollView contentContainerStyle={{ padding: 14, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 110 }}>
        <PageHeader title={t("tab.book")} sub={t("app.subtitle")} />
        <PlaceGrid title={t("sec.records")} icon="roman" keys={["tarih", "roman", "kronik", "hikayeler", "basarimlar", "divan"]} />
        <PlaceGrid title={t("scr.ayarlar")} icon="ayarlar" keys={["ayarlar", "sss"]} />
        {!mpMode && <Pressable onPress={confirmReset} style={{ marginTop: 4, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: "rgba(200,64,64,0.5)", backgroundColor: "rgba(60,16,12,0.6)", alignItems: "center" }}>
          <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.blood }}>{t("settings.newLife")}</Text>
        </Pressable>}
        <View style={{ height: 8 }} />
      </ScrollView>
    </ScreenFresk>
  );
}
