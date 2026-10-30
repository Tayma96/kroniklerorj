// Mahalle haritası: mevsimin kasaba resmi harita olur; beş mekân altın madalyonla resmin uygun yerine iğnelenir.
// Madalyona dokunmak yalnız seçer; uğrama kararı alttaki ayrıntı kartında verilir.
import { useEffect } from "react";
import { View, Text, Image, StyleSheet, useWindowDimensions, type ImageSourcePropType } from "react-native";
import Animated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, cancelAnimation, Easing } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { DesignPressable as Pressable } from "../../design-pressable";
import { GameIcon } from "../../icons";
import { Ornament } from "../../mk-sus";
import { C, F } from "../../theme";
import type { Mekan } from "../../game";

export const MEKAN_ICON: Record<Mekan, string> = { carsi: "pazar", cami: "prayer-beads", kahve: "amphora", meydan: "banner", han: "camel" };

// Resim 3:2 (768×512); harita 5:4 kadrajla gösterilir: yanlardan %8 kırpılır, madalyonlara dikey yer açılır.
const ART = 1.5, FRAME = 1.25, MAX_W = 560;
// Madalyon merkezleri resmin kesirleriyle: çarşı tezgâhları, kasaba içindeki meydan, çardaklı kahve, minare, köprü başındaki han.
// Zikzak dizilim 320 pt'de bile ayrık kalır: komşu iğneler ya ≥ 84 pt yatay ya ≥ 70 pt dikey uzaktadır.
export const PIN_YERI: Record<Mekan, { x: number; y: number }> = {
  carsi: { x: 0.2, y: 0.72 },
  meydan: { x: 0.33, y: 0.44 },
  kahve: { x: 0.45, y: 0.73 },
  cami: { x: 0.635, y: 0.25 },
  han: { x: 0.79, y: 0.56 },
};
const MED = 46, PIN_W = 84;

// Seçili iğnenin ekran genişliğine göre yatay merkezi (ayrıntı kartının dili buraya bakar).
export function igneX(m: Mekan, screenW: number): number {
  const W = Math.min(screenW, MAX_W), H = Math.round(W / FRAME), imgW = H * ART;
  return (screenW - W) / 2 + (W - imgW) / 2 + PIN_YERI[m].x * imgW;
}

export type HaritaIgnesi ={ m: Mekan; ad: string; sayi: number; kilitli: boolean; etiket: string };

export function MahalleHaritasi({ source, pins, secili, onSec, label, hint, reduced }: { source: ImageSourcePropType; pins: HaritaIgnesi[]; secili: Mekan; onSec: (m: Mekan) => void; label: string; hint: string; reduced: boolean }) {
  const { width } = useWindowDimensions();
  const W = Math.min(width, MAX_W), H = Math.round(W / FRAME);
  const imgW = H * ART, off = (W - imgW) / 2;
  return <View accessibilityLabel={label} style={{ width: W, height: H, alignSelf: "center", overflow: "hidden", borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.goldDim, backgroundColor: C.surface }}>
    <Animated.View entering={reduced ? undefined : FadeIn.duration(420)} style={StyleSheet.absoluteFill}>
      <Image accessible={false} source={source} resizeMode="cover" style={{ position: "absolute", top: 0, left: off, width: imgW, height: H }} />
    </Animated.View>
    {/* Kenarlar koyu sayfaya yumuşakça bağlanır; resmin ortası aydınlık kalır. */}
    <LinearGradient pointerEvents="none" colors={["rgba(12,9,5,0.62)", "rgba(12,9,5,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: H * 0.16 }} />
    <LinearGradient pointerEvents="none" colors={["rgba(12,9,5,0)", "rgba(12,9,5,0.55)"]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: H * 0.2 }} />
    <View pointerEvents="none" style={{ position: "absolute", top: 4, left: 4, right: 4, bottom: 4, borderWidth: 1, borderColor: "rgba(221,180,90,0.22)", borderRadius: 3 }} />
    <View pointerEvents="none" style={{ position: "absolute", right: 10, bottom: 10, width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(12,9,5,0.55)", borderWidth: 1, borderColor: "rgba(221,180,90,0.45)" }}>
      <Ornament size={22} color={C.gold} />
    </View>
    {pins.map((pin, i) => {
      const at = PIN_YERI[pin.m];
      const left = Math.max(0, Math.min(W - PIN_W, off + at.x * imgW - PIN_W / 2));
      return <Animated.View key={pin.m} entering={reduced ? undefined : FadeInDown.delay(160 + i * 70).duration(340)} style={{ position: "absolute", left, top: at.y * H - MED / 2, width: PIN_W }}>
        <Igne pin={pin} active={pin.m === secili} hint={hint} reduced={reduced} onPress={() => onSec(pin.m)} />
      </Animated.View>;
    })}
  </View>;
}

function Igne({ pin, active, hint, reduced, onPress }: { pin: HaritaIgnesi; active: boolean; hint: string; reduced: boolean; onPress: () => void }) {
  const tone = pin.kilitli ? C.goldDim : C.gold;
  const ring = active ? C.goldBright : tone;
  return <Pressable accessibilityLabel={pin.etiket} accessibilityHint={hint} accessibilityState={{ selected: active }} hitSlop={2} onPress={onPress}
    style={({ pressed }) => ({ width: PIN_W, alignItems: "center", transform: [{ scale: pressed ? 0.93 : active ? 1.04 : 1 }] })}>
    <View style={{ width: MED, height: MED }}>
      {active ? <Hale reduced={reduced} /> : null}
      <View style={{ width: MED, height: MED, borderRadius: MED / 2, alignItems: "center", justifyContent: "center", backgroundColor: active ? "#2C1F0F" : "rgba(18,12,6,0.92)", borderWidth: 2, borderColor: ring, shadowColor: "#000", shadowOpacity: 0.6, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 5 }}>
        <View pointerEvents="none" style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: MED / 2 - 3, borderWidth: 1, borderColor: ring + "55" }} />
        <GameIcon name={MEKAN_ICON[pin.m]} size={22} color={pin.kilitli ? C.parchmentMuted : active ? C.goldBright : C.gold} />
      </View>
      <View pointerEvents="none" style={{ position: "absolute", top: -5, right: -9, minWidth: 21, height: 19, paddingHorizontal: 5, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: pin.sayi ? C.gold : "#2A1F13", borderWidth: 1, borderColor: pin.sayi ? C.goldBright : C.borderHi }}>
        <Text style={{ fontFamily: F.display, fontSize: 11, lineHeight: 14, color: pin.sayi ? C.inkOnGold : C.parchmentMuted }}>{pin.sayi}</Text>
      </View>
      {pin.kilitli ? <View pointerEvents="none" style={{ position: "absolute", bottom: -3, left: -8, width: 21, height: 21, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#140D06", borderWidth: 1, borderColor: C.goldDim }}>
        <GameIcon name="hourglass" size={12} color={C.parchmentDim} />
      </View> : null}
    </View>
    <View pointerEvents="none" style={{ marginTop: 4, maxWidth: PIN_W, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: active ? C.gold : "rgba(16,11,6,0.88)", borderWidth: 1, borderColor: active ? C.goldBright : "rgba(221,180,90,0.5)" }}>
      <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: 10.5, lineHeight: 13, textAlign: "center", color: active ? C.inkOnGold : pin.kilitli ? C.parchmentDim : C.parchment }}>{pin.ad}</Text>
    </View>
  </Pressable>;
}

// Seçili madalyonun çevresinde yayılıp sönen ışık halkası; sade modda durağan halka.
function Hale({ reduced }: { reduced: boolean }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = 0;
    if (reduced) return;
    v.value = withRepeat(withTiming(1, { duration: 1700, easing: Easing.out(Easing.quad) }), -1, false);
    return () => cancelAnimation(v);
  }, [reduced]);
  const st = useAnimatedStyle(() => ({ opacity: reduced ? 0.55 : 0.75 * (1 - v.value), transform: [{ scale: reduced ? 1.14 : 1 + 0.42 * v.value }] }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", top: -4, left: -4, width: MED + 8, height: MED + 8, borderRadius: (MED + 8) / 2, borderWidth: 2, borderColor: C.goldBright }, st]} />;
}
