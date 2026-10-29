// Pazarlık perdesi: pazarcı karşında; sözü balonda, fiyat ibresi ilk sözden tabana/tavana, sabır boncukları.
import { Modal, View, Text, ScrollView } from "react-native";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { DesignPressable as Pressable } from "../../design-pressable";
import { Portre } from "../../ui";
import { GameIcon } from "../../icons";
import { useI18n } from "../../i18n";
import { useSadeMod } from "../../use-sade-mod";
import { C, F } from "../../theme";
import { Madalyon, dugmeStil } from "./parcalar";

export type Pazarlik = { key: string; id: string; icon: string; name: string; base: number; price: number; patience: number; messageKey: string; msg: string; done: boolean; sell?: boolean; round: number };

function Secim({ icon, label, sub, tone, onPress, rtl }: { icon: string; label: string; sub: string; tone: string; onPress: () => void; rtl: boolean }) {
  return <Pressable accessibilityLabel={`${label}. ${sub}`} onPress={onPress} style={({ pressed }) => [dugmeStil(pressed, tone, false), { flex: 1, minHeight: 64, flexDirection: "column", gap: 2, paddingVertical: 8 }]}>
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 6 }}>
      <GameIcon name={icon} size={18} color={tone} />
      <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 14, color: tone === C.gold ? C.goldBright : C.parchment }}>{label}</Text>
    </View>
    <Text numberOfLines={2} style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 16, color: C.parchmentDim, textAlign: "center" }}>{sub}</Text>
  </Pressable>;
}

export function PazarlikPerdesi({ barg, money, persona, favor, sellerSeed, onHaggle, onBluff, onClose, onSettle }: {
  barg: Pazarlik | null; money: number; persona: string; favor: number; sellerSeed: string;
  onHaggle: () => void; onBluff: () => void; onClose: () => void; onSettle: () => void;
}) {
  const { lang, t } = useI18n();
  const sade = useSadeMod();
  const rtl = lang === "ar";
  const row = rtl ? "row-reverse" as const : "row" as const;
  return <Modal visible={!!barg} transparent animationType="fade" onRequestClose={onClose}>
    <View style={{ flex: 1, backgroundColor: "rgba(8,5,2,0.86)", justifyContent: "center", paddingHorizontal: 14 }}>
      {barg && (() => {
        const sell = !!barg.sell;
        const goal = sell ? Math.round(barg.base * 1.4) : Math.max(1, Math.round(barg.base * 0.6));
        const saved = sell ? barg.price - barg.base : barg.base - barg.price;
        const span = Math.abs(goal - barg.base) || 1;
        const progress = Math.max(0, Math.min(100, (saved / span) * 100));
        const pips = Math.ceil(Math.max(0, Math.min(100, barg.patience)) / 10);
        const patCol = barg.patience > 55 ? C.sage : barg.patience > 25 ? C.gold : C.blood;
        const canAfford = sell || money >= barg.price;
        return <Animated.View entering={sade ? undefined : FadeInDown.duration(260)} style={{ maxWidth: 460, width: "100%", alignSelf: "center", maxHeight: "94%", borderRadius: 14, borderWidth: 1, borderColor: C.gold + "88", backgroundColor: C.card, overflow: "hidden" }}>
          <ScrollView bounces={false} contentContainerStyle={{ padding: 16 }}>
            <View pointerEvents="none" style={{ position: "absolute", top: 4, left: 4, right: 4, bottom: 4, borderRadius: 11, borderWidth: 1, borderColor: C.gold + "22" }} />
            {/* Pazarcı */}
            <View style={{ flexDirection: row, alignItems: "center", gap: 12 }}>
              <Portre age={44} gender="erkek" size={64} seed={sellerSeed} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: F.display, fontSize: 12.5, letterSpacing: 1.4, color: C.goldDim, textAlign: rtl ? "right" : "left" }}>{t(sell ? "paz.sellHaggle" : "paz.bargainWith").toUpperCase()}</Text>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 20, color: C.parchmentDim, textAlign: rtl ? "right" : "left" }}>{persona}</Text>
                {favor !== 0 ? <Text style={{ fontFamily: F.serifItalic, fontSize: 14, color: favor > 0 ? C.sage : C.blood, textAlign: rtl ? "right" : "left" }}>{t(favor > 0 ? "fac.terrFriend" : "fac.terrFoe")}</Text> : null}
              </View>
            </View>

            {/* Pazarcının sözü */}
            <View style={{ marginTop: 14 }}>
              <Animated.View key={barg.round} entering={sade ? undefined : FadeIn.duration(280)} style={{ paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: barg.done ? C.ember + "AA" : C.goldDim, backgroundColor: "rgba(33,24,16,0.96)" }}>
                <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 23, color: C.parchment, textAlign: rtl ? "right" : "left" }}>“{barg.msg}”</Text>
              </Animated.View>
              <View pointerEvents="none" style={{ position: "absolute", top: -7, left: rtl ? undefined : 26, right: rtl ? 26 : undefined, width: 14, height: 14, transform: [{ rotate: "45deg" }], borderLeftWidth: 1, borderTopWidth: 1, borderColor: barg.done ? C.ember + "AA" : C.goldDim, backgroundColor: "rgb(33,24,16)" }} />
            </View>

            {/* Mal ve fiyat */}
            <View style={{ flexDirection: row, alignItems: "center", gap: 12, marginTop: 14 }}>
              <Madalyon icon={barg.icon} size={48} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: F.display, fontSize: 16, lineHeight: 21, color: C.parchment, textAlign: rtl ? "right" : "left" }}>{barg.name}</Text>
                {saved > 0 ? <Animated.Text key={"s" + barg.price} entering={sade ? undefined : FadeIn.duration(300)} style={{ fontFamily: F.display, fontSize: 14, color: C.sage, textAlign: rtl ? "right" : "left" }}>{sell ? "+" : "−"}{saved} ⚜ · {Math.round((saved / barg.base) * 100)}%</Animated.Text> : null}
              </View>
              <View style={{ alignItems: "center" }}>
                {saved > 0 ? <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentMuted, textDecorationLine: "line-through" }}>{barg.base} ⚜</Text> : null}
                <Animated.Text key={"p" + barg.price} entering={sade ? undefined : FadeInDown.duration(260)} style={{ fontFamily: F.display, fontSize: 30, lineHeight: 36, color: canAfford ? C.goldBright : C.blood }}>{barg.price} ⚜</Animated.Text>
              </View>
            </View>

            {/* Fiyat ibresi: ilk sözden tabana (alış) / tavana (satış) */}
            <View accessible accessibilityLabel={`${t("pazar.asked")} ${barg.base} ⚜, ${t(sell ? "pazar.ceiling" : "pazar.floor")} ${goal} ⚜`} style={{ marginTop: 12 }}>
              <View style={{ height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: C.border, overflow: "hidden", flexDirection: row }}>
                <View style={{ width: `${progress}%`, backgroundColor: C.sage }} />
              </View>
              <View style={{ flexDirection: row, justifyContent: "space-between", marginTop: 4 }}>
                <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchmentMuted }}>{t("pazar.asked")} {barg.base} ⚜</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchmentMuted }}>{t(sell ? "pazar.ceiling" : "pazar.floor")} {goal} ⚜</Text>
              </View>
            </View>

            {/* Pazarcının sabrı: on boncuk */}
            <View accessible accessibilityLabel={`${t("paz.patience")}: ${Math.round(barg.patience)}%`} style={{ flexDirection: row, alignItems: "center", gap: 10, marginTop: 12 }}>
              <Text style={{ fontFamily: F.display, fontSize: 12.5, letterSpacing: 1, color: C.parchmentMuted }}>{t("paz.patience").toUpperCase()}</Text>
              <View style={{ flex: 1, flexDirection: row, gap: 4 }}>
                {Array.from({ length: 10 }, (_, i) => <View key={i} style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: i < pips ? patCol : "transparent", borderWidth: 1, borderColor: i < pips ? patCol : C.border }} />)}
              </View>
            </View>

            {/* Hamleler */}
            {!barg.done && <View style={{ flexDirection: row, gap: 8, marginTop: 14 }}>
              <Secim rtl={rtl} icon="scales" label={t("paz.haggle")} sub={t("pazar.haggleSub")} tone={C.gold} onPress={onHaggle} />
              <Secim rtl={rtl} icon="hood" label={t("paz.bluff")} sub={t("pazar.bluffSub")} tone={C.rose} onPress={onBluff} />
            </View>}
            <View style={{ flexDirection: row, gap: 8, marginTop: 10 }}>
              <Pressable accessibilityLabel={t("paz.give")} onPress={onClose} style={({ pressed }) => [dugmeStil(pressed, C.parchmentMuted, false), { flex: 1, minHeight: 54 }]}>
                <Text style={{ fontFamily: F.display, fontSize: 13.5, color: C.parchmentDim }}>{t("paz.give")}</Text>
              </Pressable>
              <Pressable accessibilityLabel={`${sell ? t("paz.sellAt") : t("paz.buyAt")} ${barg.price} ⚜`} accessibilityState={{ disabled: !canAfford }} disabled={!canAfford} onPress={onSettle}
                style={({ pressed }) => [dugmeStil(pressed, C.gold, !canAfford), { flex: 2, minHeight: 54, backgroundColor: canAfford ? (pressed ? C.goldDim : C.gold) : "rgba(23,17,10,0.55)" }]}>
                <GameIcon name="coins" size={20} color={canAfford ? C.inkOnGold : C.parchmentMuted} />
                <View style={{ flexShrink: 1, alignItems: "center" }}>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: 12.5, lineHeight: 16, color: canAfford ? C.inkOnGold : C.parchmentMuted }}>{sell ? t("paz.sellAt") : t("paz.buyAt")}</Text>
                  <Text style={{ fontFamily: F.display, fontSize: 18, lineHeight: 22, color: canAfford ? C.inkOnGold : C.parchmentMuted }}>{barg.price} ⚜</Text>
                </View>
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>;
      })()}
    </View>
  </Modal>;
}
