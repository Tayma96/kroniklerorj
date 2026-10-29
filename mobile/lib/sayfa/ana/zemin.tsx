// Ana sayfa zemini: sahne resmi yalnız başlıkta kalmasın; aynı resim yumuşatılıp koyulaştırılarak
// panellerin ardında sürer (mockup'taki "resimli sahne üstünde yarı saydam panel" hissi). Sabittir, kaymaz.
import { View, Image, StyleSheet, type ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";

export const ZEMIN = "#15100A";

export function AnaZemin({ source }: { source: ImageSourcePropType }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: ZEMIN, overflow: "hidden" }]}>
    <Image accessible={false} source={source} blurRadius={8} resizeMode="cover" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", opacity: 0.9 }} />
    {/* Sıcak ton: soğuk kış resimleri bile kandil ışığında okunur. */}
    <LinearGradient colors={["rgba(34,22,10,0.36)", "rgba(30,20,10,0.44)", "rgba(18,12,7,0.70)"]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="anaIsik" cx="50%" cy="46%" rx="70%" ry="45%">
          <Stop offset="0" stopColor="#C98A3A" stopOpacity="0.16" />
          <Stop offset="1" stopColor="#C98A3A" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#anaIsik)" />
    </Svg>
    {/* Kenar gölgesi: göz ortadaki panellere toplanır. */}
    <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={["rgba(8,5,2,0.5)", "rgba(8,5,2,0)", "rgba(8,5,2,0)", "rgba(8,5,2,0.5)"]} locations={[0, 0.14, 0.86, 1]} style={StyleSheet.absoluteFill} />
  </View>;
}
