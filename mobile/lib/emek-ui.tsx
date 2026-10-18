import { DesignPressable as Pressable } from "./design-pressable";
import { useState } from "react";
import { Modal, View, Text, ScrollView} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GameState, WorkStyle, workForecast } from "./game";
import { useI18n, applyParams, yuzdeL } from "./i18n";
import { GameIcon } from "./icons";
import { C, F } from "./theme";

export function EmekOngoru({ state, styleId }: { state: GameState; styleId: WorkStyle }) {
  const [open, setOpen] = useState(false);
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const f = workForecast(state, styleId);
  const text = (key: string, values: (string | number)[]) => applyParams(t(key), values, lang);
  const range = text("work.forecast.pay", [f.min, f.max]);
  const cost = text("work.forecast.cost", [f.hunger]);
  const restGain = Math.min(f.health, Math.max(0, 100 - state.player.health));
  const rest = restGain ? text("work.forecast.rest", [restGain]) : "";
  const risk = text("work.forecast.risk", [yuzdeL(Math.round(f.fail * 100), lang)]);
  const number = (n: number) => Math.round(n * 100) / 100;
  const lines: [string, string][] = [
    [t("work.forecast.base"), String(f.base)],
    [text("work.forecast.stat", [t("st." + f.statKey)]), "+" + number(f.stat * 2)],
    [t("work.forecast.daily"), "+0–5"],
    [t("work.forecast.bonus"), "×" + number(f.mult)],
    [t("work.forecast.title"), "×" + number(f.titleMult)],
    [t("work.forecast.style"), "×" + number(f.styleMult)],
    [t("work.forecast.prices"), "×" + number(f.inflation)],
  ];
  return <>
    <View style={{ flexDirection: lang === "ar" ? "row-reverse" : "row", alignItems: "center", gap: 8, marginBottom: 7 }}>
      <View accessible accessibilityRole="text" accessibilityLabel={[range, cost, rest, risk].filter(Boolean).join("; ")} style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.gold, textAlign: lang === "ar" ? "right" : "left" }}>{range}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 22, color: C.parchmentDim }}>{[cost, rest].filter(Boolean).join(" · ")}</Text>
        {f.fail > 0 && <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.ember }}>{risk}</Text>}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={t("work.forecast.details")} onPress={() => setOpen(true)} style={{ minHeight: 44, maxWidth: "45%", borderWidth: 1, borderColor: C.borderHi, borderRadius: 5, paddingHorizontal: 10, justifyContent: "center" }}>
        <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchment, textAlign: "center" }}>{t("work.forecast.details")}</Text>
      </Pressable>
    </View>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, backgroundColor: C.bg + "F2", justifyContent: "center", paddingHorizontal: 16, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}>
        <View accessibilityViewIsModal style={{ maxHeight: "100%", width: "100%", maxWidth: 440, alignSelf: "center", backgroundColor: C.card, borderWidth: 1, borderColor: C.borderHi, borderRadius: 5 }}>
          <View style={{ flexDirection: lang === "ar" ? "row-reverse" : "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
            <GameIcon name="calis" size={19} color={C.gold} />
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 20, color: C.gold }}>{t("work.forecast.details")}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t("cine.close")} onPress={() => setOpen(false)} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}><Text style={{ fontFamily: F.serif, fontSize: 25, color: C.parchment }}>×</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 14 }}>
            <Text style={{ fontFamily: F.serif, fontSize: 22, color: C.parchment, marginBottom: 4 }}>{range}</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentDim, lineHeight: 22, marginBottom: 10 }}>{t("work.hint." + styleId)}</Text>
            {lines.map(([label, value]) => <View key={label} style={{ flexDirection: lang === "ar" ? "row-reverse" : "row", gap: 10, paddingVertical: 5, borderBottomWidth: 1, borderColor: C.border }}>
              <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchmentDim }}>{label}</Text><Text style={{ fontFamily: F.serif, fontSize: 15, color: C.gold }}>{value}</Text>
            </View>)}
            <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.sage, marginTop: 12 }}>{[cost, rest].filter(Boolean).join(" · ")}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 15, color: f.fail ? C.ember : C.parchmentDim, marginTop: 4 }}>{risk}</Text>
            {!!f.fail && <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.ember, lineHeight: 22, marginTop: 4 }}>{text("work.forecast.loss", [f.lossMin, f.lossMax])} {t(styleId === "hirsli" ? "work.forecast.hurt" : "work.forecast.shame")}</Text>}
            <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 22, color: C.parchmentMuted, marginTop: 12 }}>{t("work.forecast.extra")}</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}
