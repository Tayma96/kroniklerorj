import { useSyncExternalStore } from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGame, oyunKaydi } from "./store";
import { useI18n } from "./i18n";
import { GameIcon } from "./icons";
import { C, F } from "./theme";

export function KayitDurum() {
  const status = useSyncExternalStore(oyunKaydi.subscribe, oyunKaydi.status, oyunKaydi.status);
  const { switchingSave, retryPersist, mpMode, state } = useGame();
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  if (mpMode || (!switchingSave && status !== "error")) return null;
  return (
    <View accessibilityRole={switchingSave ? "text" : "alert"} accessibilityLiveRegion="polite" style={{ paddingTop: insets.top + 8, paddingBottom: 8, paddingHorizontal: 14, backgroundColor: C.card, borderBottomWidth: 1, borderColor: C.borderHi, flexDirection: lang === "ar" ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
      <GameIcon name="scroll" size={18} color={switchingSave ? C.gold : C.blood} />
      <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13, lineHeight: 18, color: C.parchment }}>{t(switchingSave ? "save.busy" : state ? "save.error" : "save.readError")}</Text>
      {!switchingSave && <Pressable accessibilityRole="button" accessibilityLabel={t("save.retry")} onPress={() => { void retryPersist(); }} style={{ minHeight: 44, justifyContent: "center", borderWidth: 1, borderColor: C.gold, borderRadius: 7, paddingHorizontal: 10 }}>
        <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.gold }}>{t("save.retry")}</Text>
      </Pressable>}
    </View>
  );
}

export function KayitGecisi({ children }: { children: React.ReactNode }) {
  const { switchingSave } = useGame();
  return <View pointerEvents={switchingSave ? "none" : "auto"} style={{ flex: 1 }}>{children}</View>;
}
