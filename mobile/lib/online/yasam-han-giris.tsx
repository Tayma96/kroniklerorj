// Çevrem sekmesinin hanedan girişi (eskiden Yaşam'daki han + hanedan ikilisi; han artık Sokak'ta). Hanedan kartı
// ben.hanedan'dan (nesil, son günler) okur; eski sunucu göndermezse yalnız başlık ve genel alt satır görünür.
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useI18n, applyParams } from "../i18n";
import { C, F } from "../theme";
import { DesignPressable as Pressable } from "../design-pressable";
import { BASMA_OLCEK, Cerceve, Madalyon, hiza, yon } from "./ui";
import { SatirOku } from "./yasam-ui";
import { benHanedani } from "./hanedan-veri";
import type { Ben } from "./protokol";

export function HanedanGirisi({ ben }: { ben: Ben }) {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const hd = benHanedani(ben);
  const uyari = !!hd && (hd.sonGunler || hd.olu);
  const alt = hd?.olu ? t("onl.hd.yaOlu") : hd?.sonGunler ? t("onl.hd.yaSonGunler") : hd ? applyParams(t("onl.hd.nesil"), [hd.nesil]) : t("onl.hd.yaAlt");
  return <Pressable accessibilityRole="button" accessibilityLabel={`${t("onl.hd.kisa")}: ${alt}`} onPress={() => router.push("/online/hanedan")}
    style={({ pressed }) => ({ marginTop: 8, transform: [{ scale: pressed ? BASMA_OLCEK : 1 }] })}>
    <Cerceve aktif={uyari} ic={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12, minHeight: 64 }}>
      <Madalyon icon="banner" size={38} aktif={uyari} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 13.5, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.hd.kisa")}</Text>
        <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: uyari ? C.ember : C.parchmentDim, textAlign: hiza(rtl) }}>{alt}</Text>
      </View>
      <SatirOku rtl={rtl} />
    </Cerceve>
  </Pressable>;
}
