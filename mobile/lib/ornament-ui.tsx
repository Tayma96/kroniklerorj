import type { ReactNode } from "react";
import { View, Text, Image, ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GameIcon } from "./icons";
import { C, F, T } from "./theme";
import { useState } from "react";
export function OrnatePanel({ title, icon, right, children, tone = C.gold, inset = true }: { title?: string; icon?: string; right?: ReactNode; children: ReactNode; tone?: string; inset?: boolean }) {
  return <View style={{ marginBottom: 12, borderWidth: 1, borderColor: tone + "77", borderRadius: 5, backgroundColor: C.surface, padding: 3 }}>
    <View style={{ borderWidth: 1, borderColor: tone + "25", borderRadius: 3, overflow: "hidden" }}>
      {title && <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 11, borderBottomWidth: 1, borderColor: tone + "33", backgroundColor: tone + "08" }}>
        {icon && <GameIcon name={icon} color={tone} size={20} />}
        <Text style={{ flex: 1, fontFamily: F.display, fontSize: T.title, color: tone }}>{title}</Text>{right}
      </View>}
      <View style={inset ? { padding: 12 } : undefined}>{children}</View>
    </View>
  </View>;
}
const PANORAMAS = require("../assets/tasarim/diyar-panoramalari-v1.png");
export function Panorama({ row = 0, height = 190, source }: { row?: 0 | 1; height?: number; source?: ImageSourcePropType }) {
  const [width, setWidth] = useState(390);
  return <View accessible={false} onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ height, width: "100%", overflow: "hidden", backgroundColor: C.bg }}>
    <Image accessible={false} source={source || PANORAMAS} resizeMode={source ? "cover" : "stretch"} style={source ? { width: "100%", height: "100%" } : { position: "absolute", width: height * 4, height: height * 2, left: (width - height * 4) / 2, top: -row * height }} />
  </View>;
}
export function IllustratedHeader({ title, sub, row = 0, source, height = 190, right }: { title: string; sub?: string; row?: 0 | 1; source?: ImageSourcePropType; height?: number; right?: ReactNode }) {
  return <View style={{ height, borderWidth: 1, borderColor: C.goldDim, overflow: "hidden", borderRadius: 4 }}>
    <Panorama row={row} height={height} source={source} />
    <LinearGradient pointerEvents="none" colors={["#F4E7C81A", "#F4E7C800", C.bg + "38"]} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
    <View style={{ position: "absolute", top: 12, left: 14, right: 14, flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
      <View style={{ flex: 1 }}>
        <View style={{ alignSelf: "flex-start", maxWidth: "100%", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "rgba(169,130,54,0.48)", backgroundColor: "rgba(244,231,200,0.84)" }}>
          <Text style={{ fontFamily: F.display, fontSize: 26, color: C.bg, lineHeight: 34 }}>{title}</Text>
          {sub && <Text style={{ fontFamily: F.serif, fontSize: T.body, color: C.bg, lineHeight: T.line }}>{sub}</Text>}
        </View>
      </View>{right}
    </View>
  </View>;
}
