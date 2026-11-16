// Beş sekmeli gezinmenin ortak parçaları: giriş satırı (madalyon ya da küçük görsel + başlık + tek satır açıklama) ve
// büyük görselli mekân karosu (Sokak). Görsel yoksa tema degradesi ve büyük madalyon aynı karo dilinde çizilir.
import { View, Text, Image, StyleSheet, type ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { C, F } from "../theme";
import { GameIcon } from "../icons";
import { DesignPressable as Pressable } from "../design-pressable";
import { BASMA_OLCEK, Cerceve, Madalyon, ONL, hiza, yon } from "./ui";
import { Rozet, SatirOku } from "./yasam-ui";

const GOLGE = { textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } };

/** Tek dokunuşla bir ekrana götüren satır. `kapali`: soluk ve dokunulamaz; neden `alt`ta yazılır. */
export function GirisSatiri({ icon, baslik, alt, onPress, vurgu = false, rozet, kapali = false, rtl, gorsel }: {
  icon: string; baslik: string; alt?: string; onPress: () => void; vurgu?: boolean; rozet?: string; kapali?: boolean; rtl: boolean; gorsel?: ImageSourcePropType;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={alt ? `${baslik}: ${alt}` : baslik} accessibilityState={{ disabled: kapali }} disabled={kapali} onPress={onPress}
    style={({ pressed }) => ({ opacity: kapali ? 0.55 : 1, transform: [{ scale: pressed ? BASMA_OLCEK : 1 }] })}>
    <Cerceve aktif={vurgu} ic={{ flexDirection: yon(rtl), alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 12, minHeight: 64 }}>
      {gorsel ? <View style={{ width: 52, height: 52, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: vurgu ? C.goldBright : ONL.frame }}>
        <Image source={gorsel} resizeMode="cover" style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors />
      </View> : <Madalyon icon={icon} size={40} aktif={vurgu} />}
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: 14, lineHeight: 19, color: C.parchment, textAlign: hiza(rtl) }}>{baslik}</Text>
        {alt ? <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: vurgu ? C.goldBright : C.parchmentDim, textAlign: hiza(rtl) }}>{alt}</Text> : null}
      </View>
      {rozet ? <Rozet metin={rozet} renk={C.goldBright} dolu={vurgu} /> : null}
      {kapali ? null : <SatirOku rtl={rtl} />}
    </Cerceve>
  </Pressable>;
}

/** Sokak'ın mekân karosu: üstte görsel (ya da degrade + madalyon), ad, ne yapılır, varsa canlı durum ya da kilit nedeni. */
export function MekanKarosu({ ad, ne, durum, kilit, icon, gorsel, onPress, rtl, kilitEtiket }: {
  ad: string; ne: string; durum?: string | null; kilit?: string | null; icon: string; gorsel?: ImageSourcePropType; onPress: () => void; rtl: boolean; kilitEtiket: string;
}) {
  const kapali = !!kilit;
  const alt = kilit ?? durum;
  const etiket = [ad, ne, kapali ? `${kilitEtiket}: ${kilit}` : durum].filter(Boolean).join(". ");
  // Metin tarafı koyu, görsel tarafı açık: RTL'de degrade yönü döner.
  const bas = rtl ? { x: 1, y: 0 } : { x: 0, y: 0 };
  const son = rtl ? { x: 0, y: 0 } : { x: 1, y: 0 };
  return <Pressable accessibilityRole="button" accessibilityLabel={etiket} accessibilityState={{ disabled: kapali }} disabled={kapali} onPress={onPress}
    style={({ pressed }) => ({ borderRadius: 12, transform: [{ scale: pressed ? BASMA_OLCEK : 1 }] })}>
    <View style={{ minHeight: 124, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: kapali ? "rgba(201,162,78,0.25)" : ONL.frameHi, backgroundColor: "#140E08" }}>
      {gorsel ? <Image source={gorsel} resizeMode="cover" accessibilityIgnoresInvertColors style={[StyleSheet.absoluteFill, { opacity: kapali ? 0.32 : 0.92 }]} />
        : <>
          <LinearGradient pointerEvents="none" colors={["#3A2A16", "#20170D", "#120D07"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={[{ position: "absolute", top: 12, opacity: kapali ? 0.1 : 0.22 }, rtl ? { left: 14 } : { right: 14 }]}>
            <GameIcon name={icon} size={100} color={C.goldBright} />
          </View>
        </>}
      <LinearGradient pointerEvents="none" start={bas} end={son} colors={["rgba(10,7,4,0.94)", "rgba(10,7,4,0.7)", "rgba(10,7,4,0.08)"]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <View style={{ flex: 1, flexDirection: yon(rtl), alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, opacity: kapali ? 0.7 : 1 }}>
        <Madalyon icon={icon} size={44} aktif={!kapali && !!durum} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[{ fontFamily: F.display, fontSize: 19, lineHeight: 25, color: kapali ? C.parchmentMuted : C.goldBright, textAlign: hiza(rtl) }, GOLGE]}>{ad}</Text>
          <Text numberOfLines={2} style={[{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 19, color: C.parchment, textAlign: hiza(rtl) }, GOLGE]}>{ne}</Text>
          {alt ? <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 6, marginTop: 2 }}>
            <GameIcon name={kapali ? "hourglass" : "compass"} size={13} color={kapali ? C.parchmentMuted : C.goldBright} />
            <Text numberOfLines={2} style={[{ flexShrink: 1, fontFamily: F.display, fontSize: 12, lineHeight: 16, letterSpacing: rtl ? 0 : 0.5, color: kapali ? C.parchmentMuted : C.goldBright, textAlign: hiza(rtl) }, GOLGE]}>{alt}</Text>
          </View> : null}
        </View>
        {kapali ? null : <SatirOku rtl={rtl} />}
      </View>
    </View>
  </Pressable>;
}
