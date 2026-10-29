// Şehir kahraman sahnesi: mevsimlik kasaba resmi, gökyüzünde koyu başlık (mockup ekran 3),
// altta yer rozetleri. Resmin sol kenarındaki çardak kırpılır; başlık açık göğe oturur.
import type { ReactNode } from "react";
import { View, Text, Image, StyleSheet, useWindowDimensions, type ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { DesignPressable as Pressable } from "../../design-pressable";
import { GameIcon } from "../../icons";
import { hap } from "../../haptics";
import { F } from "../../theme";

const INK = "#1C130A", HALO = "rgba(255,246,228,0.95)";
const CROP = 0.24; // kasaba resimlerinin sol çeyreğindeki çardak

function RoundButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return <Pressable accessibilityLabel={label} onPress={() => { hap("tap"); onPress(); }} style={({ pressed }) => ({ width: 44, height: 44, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.75 : 1 })}>
    <View style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: "rgba(28,19,10,0.45)", backgroundColor: "rgba(255,246,228,0.55)", alignItems: "center", justifyContent: "center" }}>{children}</View>
  </Pressable>;
}

export function SehirSahne({ source, topInset, title, sub, seasonIcon, chips, rtl, onBack, onMap, backLabel, mapLabel }: {
  source: ImageSourcePropType; topInset: number; title: string; sub: string; seasonIcon: string; chips: ReactNode; rtl: boolean;
  onBack: () => void; onMap: () => void; backLabel: string; mapLabel: string;
}) {
  const { width } = useWindowDimensions();
  const narrow = width < 360;
  const h = (narrow ? 214 : 244) + topInset;
  const imgW = Math.max(width / (1 - CROP), h * 1.5); // çardak kırpılır, gök ve kale kalır
  return <View style={{ height: h, overflow: "hidden" }}>
    <Image accessible={false} source={source} resizeMode="cover" style={{ position: "absolute", top: 0, [rtl ? "left" : "right"]: 0, width: imgW, height: imgW / 1.5, transform: rtl ? [{ scaleX: -1 }] : undefined }} />
    <LinearGradient pointerEvents="none" colors={["rgba(255,248,232,0.34)", "rgba(255,248,232,0)", "rgba(18,13,8,0)", "rgba(18,13,8,0.86)"]} locations={[0, 0.34, 0.66, 1]} style={StyleSheet.absoluteFill} />
    <View style={{ position: "absolute", top: topInset + 8, left: 0, right: 0, flexDirection: rtl ? "row-reverse" : "row", alignItems: "flex-start", paddingHorizontal: 6 }}>
      <RoundButton label={backLabel} onPress={onBack}><Text style={{ fontFamily: F.serif, fontSize: 26, lineHeight: 28, color: INK, marginTop: -3 }}>{rtl ? "›" : "‹"}</Text></RoundButton>
      <View style={{ flex: 1, minWidth: 0, paddingHorizontal: 6, alignItems: rtl ? "flex-end" : "flex-start" }}>
        <Text accessibilityRole="header" numberOfLines={1} style={{ fontFamily: F.display, fontSize: narrow ? 27 : 34, lineHeight: narrow ? 34 : 42, color: INK, textShadowColor: HALO, textShadowRadius: 10 }}>{title}</Text>
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 6, marginTop: -2 }}>
          <GameIcon name={seasonIcon} size={15} color={INK} />
          <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 19, color: "#24180C", textShadowColor: HALO, textShadowRadius: 6 }}>{sub}</Text>
        </View>
      </View>
      <RoundButton label={mapLabel} onPress={onMap}><GameIcon name="map" size={19} color={INK} /></RoundButton>
    </View>
    <View style={{ position: "absolute", left: 10, right: 10, bottom: 10, flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 6 }}>{chips}</View>
  </View>;
}
