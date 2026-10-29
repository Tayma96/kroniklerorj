// Kuşam ekranının ortasındaki figür yeri. Şimdilik kaftanlı bir siluet ve kaide çizer.
// Gerçek 3D figür ayrı projede gelecek: bu bileşen aynı imzayla (genişlik/yükseklik + oyuncu) değiştirilir;
// çevresindeki yuvalar ve seçim mantığı figüre bağlı değildir.
import { View } from "react-native";
import Svg, { Path, Circle, Ellipse, Defs, LinearGradient as SvgGradient, RadialGradient, Stop } from "react-native-svg";
import { C } from "../../theme";

export function KusamFigur({ height, label }: { height: number; label: string }) {
  const w = Math.round(height * 0.5);
  return <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
    <Svg width={w} height={height} viewBox="0 0 120 240">
      <Defs>
        <RadialGradient id="kfIsik" cx="50%" cy="46%" r="55%">
          <Stop offset="0" stopColor={C.goldBright} stopOpacity="0.22" />
          <Stop offset="1" stopColor={C.goldBright} stopOpacity="0" />
        </RadialGradient>
        <SvgGradient id="kfGovde" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3A2A17" stopOpacity="0.95" />
          <Stop offset="1" stopColor="#140E07" stopOpacity="0.95" />
        </SvgGradient>
      </Defs>
      <Circle cx="60" cy="112" r="66" fill="url(#kfIsik)" />
      <Ellipse cx="60" cy="229" rx="47" ry="8" fill="rgba(201,162,78,0.16)" stroke={C.goldDim} strokeWidth="1" />
      <Ellipse cx="60" cy="229" rx="34" ry="5" fill="none" stroke={C.goldDim} strokeOpacity="0.5" strokeWidth="0.8" />
      {/* Başlık (börk) ve baş */}
      <Path d="M47 25 Q48 9 60 8 Q72 9 73 25 Z" fill="url(#kfGovde)" stroke={C.gold} strokeWidth="1.3" />
      <Circle cx="60" cy="32" r="12.5" fill="url(#kfGovde)" stroke={C.gold} strokeWidth="1.3" />
      {/* Kaftan: omuzlar, yanlarda kollar, eteğe doğru açılan gövde */}
      <Path d="M60 47 C48 47 39 50 34 56 L25 112 Q23 124 29 126 L34 126 L38 84 L35 224 Q60 230 85 224 L82 84 L86 126 L91 126 Q97 124 95 112 L86 56 C81 50 72 47 60 47 Z" fill="url(#kfGovde)" stroke={C.gold} strokeWidth="1.4" strokeLinejoin="round" />
      {/* Kuşak ve önden açılan kaftan çizgisi */}
      <Path d="M39 100 Q60 106 81 100" fill="none" stroke={C.goldDim} strokeWidth="2.4" />
      <Path d="M60 49 L60 222" fill="none" stroke={C.goldDim} strokeOpacity="0.6" strokeWidth="1" />
    </Svg>
  </View>;
}
