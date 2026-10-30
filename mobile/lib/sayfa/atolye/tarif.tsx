// Tarifler: kategori sekmeleri ve tarif kartı (çıktı madalyonu, malzeme var/gerek, şart rozetleri, kıvılcımlı Üret).
import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { GameIcon } from "../../icons";
import { GameButton } from "../../ui";
import { DesignPressable } from "../../design-pressable";
import { ParticleBurst } from "../../fx";
import type { Recipe } from "../../game";
import { C, F } from "../../theme";
import { CAT_ICON, CAT_TONE, Frame, InputChip, ItemDisc, Tag, dir, align, type Cat } from "./parcalar";

export function CategoryTabs({ cats, active, onSelect, rtl, label }: { cats: { cat: Cat; name: string; ready: number }[]; active: Cat; onSelect: (c: Cat) => void; rtl: boolean; label: (c: { name: string; ready: number }) => string }) {
  return <View accessibilityRole="tablist" style={{ flexDirection: dir(rtl), gap: 6, marginBottom: 14 }}>
    {cats.map((c) => {
      const on = c.cat === active, tone = CAT_TONE[c.cat];
      return <DesignPressable key={c.cat} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label(c)} onPress={() => onSelect(c.cat)}
        style={({ pressed }) => ({ flex: 1, minHeight: 78, borderRadius: 7, borderWidth: 1, borderColor: on ? tone : "#5A4428", backgroundColor: on ? "rgba(48,34,18,0.96)" : pressed ? "rgba(42,31,19,0.95)" : "rgba(18,13,8,0.86)", alignItems: "center", justifyContent: "flex-start", paddingTop: 9, paddingBottom: 9, paddingHorizontal: 2, overflow: "visible", transform: [{ translateY: pressed ? 1 : 0 }] })}>
        <View>
          <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: on ? tone : C.border, backgroundColor: on ? tone + "26" : "rgba(10,7,4,0.7)", alignItems: "center", justifyContent: "center" }}>
            <GameIcon name={CAT_ICON[c.cat]} size={18} color={on ? tone : C.parchmentMuted} />
          </View>
          {c.ready > 0 ? <View style={{ position: "absolute", top: -5, [rtl ? "left" : "right"]: -9, minWidth: 19, height: 19, paddingHorizontal: 4, borderRadius: 10, backgroundColor: C.sage, borderWidth: 1.5, borderColor: C.bg, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: F.display, fontSize: 11, lineHeight: 14, color: C.bg }}>{c.ready}</Text>
          </View> : null}
        </View>
        <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 15, marginTop: 5, textAlign: "center", color: on ? C.parchment : C.parchmentMuted }}>{c.name}</Text>
        {on ? <View style={{ position: "absolute", bottom: -1, left: 12, right: 12, height: 2.5, borderRadius: 2, backgroundColor: tone }} /> : null}
      </DesignPressable>;
    })}
  </View>;
}

export type CardInfo = {
  r: Recipe; name: string; tone: string; able: boolean; isOrder: boolean; focused: boolean; otherProf: boolean;
  skillText: string; yourSkill?: string; profName?: string; orderTag: string;
  inputs: { id: string; name: string; have: number; need: number }[];
  materialsLabel: string; craftLabel: string; craftA11y: string;
  reason?: { icon: string; text: string };
  result?: { head: string; text: string; tone: string };
};

// Kıvılcım renkleri: köz, altın ve beyaz-sıcak.
const SPARKS = [C.goldBright, C.emberSoft, C.ember, "#FFF1C2", C.gold];

export function RecipeCard({ info, index, rtl, reduced, onCraft }: { info: CardInfo; index: number; rtl: boolean; reduced: boolean; onCraft: (r: Recipe) => void }) {
  const { r, tone } = info;
  const [burst, setBurst] = useState(0);
  const flash = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const press = () => {
    if (!reduced) {
      flash.value = 0.55; // ocak parlaması: anında yanar, yavaşça söner
      flash.value = withTiming(0, { duration: 700 });
      setBurst((b) => b + 1);
    }
    onCraft(r);
  };
  const frameTone = info.focused || info.isOrder ? C.gold : info.able ? tone : C.gold;
  return <Animated.View entering={reduced ? undefined : FadeInDown.delay(Math.min(index, 6) * 55).duration(280)} style={{ marginBottom: 12, opacity: info.otherProf ? 0.82 : 1 }}>
    <Frame tone={frameTone} style={info.focused ? { borderWidth: 1.5, borderColor: C.goldBright } : undefined}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tone }, flashStyle]} />
      <View style={{ padding: 13 }}>
        <View style={{ flexDirection: dir(rtl), alignItems: "center", gap: 12 }}>
          <View>
            <ItemDisc id={r.out} tone={tone} size={54} />
            {r.outQty > 1 ? <View style={{ position: "absolute", bottom: -4, [rtl ? "left" : "right"]: -6, paddingHorizontal: 6, height: 20, borderRadius: 10, backgroundColor: C.cardHi, borderWidth: 1, borderColor: tone, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 12, color: tone }}>×{r.outQty}</Text>
            </View> : null}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: F.display, fontSize: 17, lineHeight: 22, color: C.parchment, textAlign: align(rtl) }}>{info.name}</Text>
            <View style={{ flexDirection: dir(rtl), flexWrap: "wrap", gap: 5, marginTop: 6 }}>
              <Tag icon="graduate-cap" text={info.skillText} tone={info.yourSkill ? C.blood : C.sage} />
              {info.yourSkill ? <Tag text={info.yourSkill} tone={C.blood} /> : null}
              {info.profName ? <Tag icon="meslek" text={info.profName} tone={info.otherProf ? C.parchmentMuted : C.gold} /> : null}
              {info.isOrder ? <Tag icon="scroll" text={info.orderTag} tone={C.goldBright} /> : null}
            </View>
          </View>
        </View>

        {/* Başka mesleğin ustalık tarifi sıkışık: kapı nedeni rozette yazar, ayrı düğme plakası yok. */}
        {info.otherProf ? null : <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1.2, color: C.goldDim, marginTop: 13, marginBottom: 7, textAlign: align(rtl) }}>{info.materialsLabel}</Text>}
        <View style={{ flexDirection: dir(rtl), flexWrap: "wrap", gap: 6, marginTop: info.otherProf ? 11 : 0 }}>
          {info.inputs.map((x) => <InputChip key={x.id} id={x.id} name={x.name} have={x.have} need={x.need} rtl={rtl} />)}
        </View>

        {info.result ? <Animated.View entering={reduced ? undefined : FadeIn.duration(360)} accessibilityLiveRegion="polite" style={{ marginTop: 12, borderRadius: 7, borderWidth: 1, borderColor: info.result.tone + "AA", backgroundColor: info.result.tone + "1A", paddingVertical: 10, paddingHorizontal: 12, flexDirection: dir(rtl), alignItems: "center", gap: 11 }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: info.result.tone, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(10,7,4,0.6)" }}>
            <GameIcon name="star" size={18} color={info.result.tone} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: info.result.tone, textAlign: align(rtl) }}>{info.result.head}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 21, color: C.parchment, marginTop: 2, textAlign: align(rtl) }}>{info.result.text}</Text>
          </View>
        </Animated.View>
          : info.able ? <GameButton rtl={rtl} icon="anvil" accessibilityLabel={info.craftA11y} onPress={press} style={{ marginTop: 13 }}>
            <Text style={{ fontFamily: F.display, fontSize: 16, letterSpacing: 1.5, color: C.inkOnGold, textAlign: "center" }}>{info.craftLabel}</Text>
          </GameButton>
            : info.reason && !info.otherProf ? <View accessible accessibilityLabel={info.reason.text} style={{ marginTop: 13, minHeight: 46, borderRadius: 7, borderWidth: 1, borderColor: "#4A3820", backgroundColor: "rgba(8,5,3,0.65)", flexDirection: dir(rtl), alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 12 }}>
              <GameIcon name={info.reason.icon} size={15} color={C.parchmentMuted} />
              <Text style={{ flexShrink: 1, fontFamily: F.display, fontSize: 13, letterSpacing: 0.5, color: C.parchmentMuted, textAlign: "center" }}>{info.reason.text}</Text>
            </View> : null}
      </View>
    </Frame>
    {/* Kıvılcım çerçevenin dışında: kart kenarında kırpılmadan yukarı saçılır. */}
    {burst > 0 ? <View key={burst} pointerEvents="none" style={{ position: "absolute", top: 40, [rtl ? "right" : "left"]: 40, width: 0, height: 0 }}>
      <ParticleBurst colors={SPARKS} count={22} top={0} />
    </View> : null}
  </Animated.View>;
}
