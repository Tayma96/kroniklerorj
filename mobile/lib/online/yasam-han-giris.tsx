// Yaşam ekranından han ve hanedan girişleri (yasam.tsx'e tek satırla eklenir). Hanedan kartı ben.hanedan'dan
// (nesil, son günler) okur; eski sunucu göndermezse yalnız başlık görünür.
import { View, Text, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useI18n, applyParams } from "../i18n";
import { C, F } from "../theme";
import { hap } from "../haptics";
import { DesignPressable as Pressable } from "../design-pressable";
import { Cerceve, Madalyon, yon } from "./ui";
import { benHanedani } from "./hanedan-veri";
import type { Ben } from "./protokol";

export function YasamHanGirisi({ ben }: { ben: Ben }) {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const dar = useWindowDimensions().width < 360;
  const hd = benHanedani(ben);
  const uyari = !!hd && (hd.sonGunler || hd.olu);
  const kartlar = [
    { id: "han", icon: "flame", baslik: t("onl.han.kisa"), alt: t("onl.han.yaAlt"), yol: "/online/han", vurgu: false },
    { id: "hanedan", icon: "banner", baslik: t("onl.hd.kisa"), alt: hd?.olu ? t("onl.hd.yaOlu") : hd?.sonGunler ? t("onl.hd.yaSonGunler") : hd ? applyParams(t("onl.hd.nesil"), [hd.nesil]) : t("onl.hd.yaAlt"), yol: "/online/hanedan", vurgu: uyari },
  ];
  return <View style={{ marginTop: 8, flexDirection: yon(rtl), gap: 8 }}>
    {kartlar.map((h) => <Pressable key={h.id} accessibilityRole="button" accessibilityLabel={`${h.baslik}: ${h.alt}`} onPress={() => { hap("tap"); router.push(h.yol); }}
      style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <Cerceve aktif={h.vurgu} ic={{ alignItems: "center", gap: 6, paddingVertical: 12, paddingHorizontal: 6, minHeight: 104 }}>
        <Madalyon icon={h.icon} size={38} aktif={h.vurgu} />
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: dar ? 11.5 : 12.5, color: C.parchment, textAlign: "center" }}>{h.baslik}</Text>
        <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: dar ? 12.5 : 13.5, lineHeight: 17, color: h.vurgu ? C.ember : C.parchmentDim, textAlign: "center" }}>{h.alt}</Text>
      </Cerceve>
    </Pressable>)}
  </View>;
}
