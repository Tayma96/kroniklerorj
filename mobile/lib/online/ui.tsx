// Çevrimiçi akışın ortak görsel parçaları: sahne zemini, altın çerçeveli panel, madalyon, adım izi, düğmeler,
// doluluk çubuğu, hata bandı. Dil yeni oyun ekranıyla aynıdır; lib/home-mockup-ui içe aktarılmaz (o modül tek
// oyunculu motoru çeker), gereken birkaç ton burada kopyalanır.
import { type ReactNode } from "react";
import { View, Text, Image, ActivityIndicator, StyleSheet, useWindowDimensions, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle } from "react-native-svg";
import { DesignPressable as Pressable } from "../design-pressable";
import { GameIcon } from "../icons";
import { C, F } from "../theme";
import { hap } from "../haptics";
import { isReduceMotion } from "../perf";
import { FadeInUp } from "react-native-reanimated";

export const ONL = {
  frame: "#A8823F",
  frameHi: "#C9A24E",
  gold: "#E2B65A",
  cam: "rgba(22,16,10,0.86)",
  camKoyu: "rgba(14,10,6,0.62)",
};
export const GLOW = { shadowColor: C.goldBright, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } };
const GOLGE = { textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } };

export const yon = (rtl: boolean) => (rtl ? "row-reverse" : "row") as "row" | "row-reverse";
export const hiza = (rtl: boolean) => (rtl ? "right" : "left") as "right" | "left";
/** Giriş animasyonu; sade modda yok. */
export const giris = (ms: number) => (isReduceMotion() ? undefined : FadeInUp.delay(ms).duration(520));

export function Ornament({ size = 14, color = ONL.gold }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 1 L13.6 10.4 L23 12 L13.6 13.6 L12 23 L10.4 13.6 L1 12 L10.4 10.4 Z" fill={color} />
    <Circle cx="12" cy="12" r="5.2" fill="none" stroke={color} strokeWidth="1.3" />
  </Svg>;
}
export function Check({ size = 14, color = C.inkOnGold }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4.5 12.5 L9.8 17.6 L19.5 6.8" stroke={color} strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}
export function Carpi({ size = 12, color = C.blood }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M6 6 L18 18 M18 6 L6 18" stroke={color} strokeWidth={3} strokeLinecap="round" /></Svg>;
}
/** Okuma yönüne göre "ileri" ya da "geri" ok. */
export function Ok({ ileri, rtl, size = 15, color }: { ileri: boolean; rtl: boolean; size?: number; color: string }) {
  const sag = ileri !== rtl;
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d={sag ? "M9 4.5 L16.5 12 L9 19.5" : "M15 4.5 L7.5 12 L15 19.5"} stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

/** Örtünün y (0..1, görsel yüksekliğine göre) noktasındaki koyuluğu: üstte hafif, ortada açık, altta zemine erir. */
function ortuAlfa(y: number, koyu: number): number {
  if (y <= 0.14) return koyu + 0.3 - (0.3 * y) / 0.14;
  if (y <= 0.5) return koyu + ((0.62 - koyu) * (y - 0.14)) / 0.36;
  return Math.min(1, 0.62 + (0.38 * (y - 0.5)) / 0.5);
}
// Eşit aralıklı duraklar: `locations` desteklemeyen çiziciler (tasarım önizlemesi) de aynı örtüyü çizer.
const ORTU_DURAK = 11;

/** Tam ekran sahne: üstte görsel, aşağı doğru koyulaşan örtü. `oran` görselin kapladığı ekran yüksekliği. */
export function Sahne({ gorsel, oran = 0.6, koyu = 0.35, children }: { gorsel: ImageSourcePropType; oran?: number; koyu?: number; children: ReactNode }) {
  const { height: H } = useWindowDimensions();
  const renkler = Array.from({ length: ORTU_DURAK }, (_, i) => `rgba(14,10,6,${ortuAlfa(i / (ORTU_DURAK - 1), koyu).toFixed(3)})`) as [string, string, ...string[]];
  return <View style={{ flex: 1, backgroundColor: C.bg }}>
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: H * oran }}>
      <Image accessible={false} source={gorsel} resizeMode="cover" style={StyleSheet.absoluteFill} />
      <LinearGradient pointerEvents="none" colors={renkler} style={StyleSheet.absoluteFill} />
    </View>
    {children}
  </View>;
}

/** Altın çerçeveli kart; seçilince parlak kenar ve dış hale. */
export function Cerceve({ aktif = false, radius = 10, children, style, ic }: { aktif?: boolean; radius?: number; children: ReactNode; style?: StyleProp<ViewStyle>; ic?: StyleProp<ViewStyle> }) {
  return <View style={[{ borderRadius: radius }, aktif ? GLOW : null, style]}>
    {aktif ? <View pointerEvents="none" style={{ position: "absolute", top: -4, left: -4, right: -4, bottom: -4, borderRadius: radius + 4, borderWidth: 2, borderColor: "rgba(243,210,122,0.3)" }} /> : null}
    <View style={[{ flexGrow: 1, borderRadius: radius, borderWidth: 1.5, borderColor: aktif ? C.goldBright : "rgba(168,130,63,0.78)", backgroundColor: aktif ? "rgba(42,31,19,0.95)" : ONL.cam, overflow: "hidden" }, ic]}>
      <LinearGradient pointerEvents="none" colors={["rgba(243,210,122,0.07)", "rgba(243,210,122,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 40 }} />
      {children}
      <View pointerEvents="none" style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: Math.max(radius - 3, 2), borderWidth: 1, borderColor: aktif ? "rgba(243,210,122,0.3)" : "rgba(201,162,78,0.16)" }} />
    </View>
  </View>;
}

export function Madalyon({ icon, size = 40, aktif = false, renk }: { icon: string; size?: number; aktif?: boolean; renk?: string }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: aktif ? C.goldBright : ONL.frame, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
    <LinearGradient pointerEvents="none" colors={aktif ? [C.goldBright, C.gold, C.goldDim] : [C.cardHi, C.surface]} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: size / 2, borderWidth: 1, borderColor: aktif ? "rgba(26,18,6,0.35)" : "rgba(201,162,78,0.3)" }} />
    <View><GameIcon name={icon} size={Math.round(size * 0.5)} color={aktif ? C.inkOnGold : renk ?? C.gold} /></View>
  </View>;
}

export function Bolum({ metin, rtl, ust = 20, sag }: { metin: string; rtl: boolean; ust?: number; sag?: ReactNode }) {
  return <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, marginTop: ust, marginBottom: 10 }}>
    <Ornament size={13} />
    <Text style={[{ fontFamily: F.display, fontSize: 12.5, letterSpacing: rtl ? 0 : 1.5, color: C.goldBright }, GOLGE]}>{metin}</Text>
    <View style={{ flex: 1, height: 1, backgroundColor: "rgba(201,162,78,0.3)" }} />
    {sag}
  </View>;
}

/** Sayfa başı: kısa üst yazı, başlık, süs ve alt metin. */
export function Baslik({ ust, baslik, alt, rtl, ortala = false }: { ust?: string; baslik: string; alt?: string; rtl: boolean; ortala?: boolean }) {
  const h = ortala ? "center" : hiza(rtl);
  return <View style={{ alignItems: ortala ? "center" : rtl ? "flex-end" : "flex-start" }}>
    {ust ? <Text style={[{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 2, color: C.goldBright, marginBottom: 4, textAlign: h }, GOLGE]}>{ust}</Text> : null}
    <Text accessibilityRole="header" style={[{ fontFamily: F.display, fontSize: 24, lineHeight: 31, color: C.parchment, textAlign: h }, GOLGE]}>{baslik}</Text>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 8 }}>
      <View style={{ width: 34, height: 1, backgroundColor: "rgba(201,162,78,0.55)" }} />
      <Ornament size={12} />
      <View style={{ width: 34, height: 1, backgroundColor: "rgba(201,162,78,0.55)" }} />
    </View>
    {alt ? <Text style={[{ fontFamily: F.serif, fontSize: 16, lineHeight: 23, color: C.parchmentDim, textAlign: h }, GOLGE]}>{alt}</Text> : null}
  </View>;
}

const ADIMLAR = [
  { icon: "karakter", etiket: "onl.adim.kimlik" },
  { icon: "map", etiket: "onl.adim.yerlesim" },
  { icon: "house", etiket: "onl.adim.varis" },
] as const;
const AM = 30; // adım madalyonu

/** Yuvarlak geri madalyonu (44 pt dokunma alanı). */
export function GeriDugme({ rtl, etiket, onPress }: { rtl: boolean; etiket: string; onPress: () => void }) {
  return <Pressable accessibilityLabel={etiket} onPress={() => { hap("tap"); onPress(); }} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
    <View style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: ONL.frame, backgroundColor: "rgba(14,10,6,0.8)", alignItems: "center", justifyContent: "center" }}>
      <Ok ileri={false} rtl={rtl} size={17} color={C.goldBright} />
    </View>
  </Pressable>;
}

/** Üst çubuk: geri madalyonu + Kimlik → Yerleşim → Varış izi. */
export function UstBar({ adim, rtl, t, onGeri }: { adim: 1 | 2 | 3; rtl: boolean; t: (k: string) => string; onGeri?: () => void }) {
  const dar = useWindowDimensions().width < 360;
  return <View style={{ flexDirection: yon(rtl), alignItems: "flex-start", gap: 6 }}>
    {onGeri ? <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={onGeri} /> : <View style={{ width: 44 }} />}
    <View style={{ flex: 1 }}>
      <View pointerEvents="none" style={{ position: "absolute", top: 7 + AM / 2 - 1, left: "16.66%", right: "16.66%", height: 2, backgroundColor: "rgba(168,130,63,0.42)" }} />
      <View pointerEvents="none" style={[{ position: "absolute", top: 7 + AM / 2 - 1, height: 2, backgroundColor: C.gold, width: adim === 1 ? 0 : adim === 2 ? "33.33%" : "66.66%" }, rtl ? { right: "16.66%" } : { left: "16.66%" }]} />
      <View style={{ flexDirection: yon(rtl), paddingTop: 7 }} accessibilityRole="progressbar" accessibilityLabel={`${adim}/3 · ${t(ADIMLAR[adim - 1].etiket)}`}>
        {ADIMLAR.map((a, i) => {
          const n = i + 1, bitti = n < adim, simdi = n === adim;
          return <View key={a.etiket} style={{ flex: 1, alignItems: "center" }}>
            <View style={[{ width: AM, height: AM, borderRadius: AM / 2, alignItems: "center", justifyContent: "center", borderWidth: simdi ? 2 : 1.5, borderColor: bitti || simdi ? C.goldBright : "rgba(168,130,63,0.6)", backgroundColor: bitti ? C.gold : simdi ? C.cardHi : "rgba(14,10,6,0.9)" }, simdi ? GLOW : null]}>
              {bitti ? <Check size={14} /> : <GameIcon name={a.icon} size={simdi ? 15 : 13} color={simdi ? C.goldBright : C.parchmentMuted} />}
            </View>
            <Text numberOfLines={1} style={[{ alignSelf: "stretch", marginHorizontal: dar ? -6 : -10, marginTop: 4, fontFamily: F.display, fontSize: dar ? 10 : 11, letterSpacing: rtl || dar ? 0 : 0.6, textAlign: "center", color: simdi ? C.goldBright : bitti ? C.gold : C.parchmentMuted }, GOLGE]}>{t(a.etiket)}</Text>
          </View>;
        })}
      </View>
    </View>
    <View style={{ width: dar ? 10 : 44 }} />
  </View>;
}

/** Birincil altın düğme. */
export function AltinDugme({ etiket, onPress, kapali = false, bekliyor = false, icon, rtl, erisim }: { etiket: string; onPress: () => void; kapali?: boolean; bekliyor?: boolean; icon?: string; rtl: boolean; erisim?: string }) {
  const pasif = kapali || bekliyor;
  const dar = useWindowDimensions().width < 360;
  return <Pressable accessibilityLabel={erisim ?? etiket} accessibilityState={{ disabled: pasif, busy: bekliyor }} disabled={pasif}
    onPress={() => { hap("advance"); onPress(); }}
    style={({ pressed }) => [{ minHeight: 54, borderRadius: 8, overflow: "hidden", borderWidth: 1.5, borderColor: pasif ? "rgba(168,130,63,0.55)" : C.goldBright, transform: [{ scale: pressed ? 0.985 : 1 }] }, pasif ? null : GLOW]}>
    <LinearGradient pointerEvents="none" colors={pasif ? ["rgba(60,46,28,0.95)", "rgba(36,27,16,0.95)"] : [C.goldBright, C.gold, C.goldDim]} style={StyleSheet.absoluteFill} />
    <View style={{ flexDirection: yon(rtl), alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 18, paddingVertical: 12 }}>
      {bekliyor ? <ActivityIndicator color={C.goldBright} /> : icon ? <GameIcon name={icon} size={19} color={pasif ? C.parchmentMuted : C.inkOnGold} /> : null}
      <Text numberOfLines={2} style={{ flexShrink: 1, fontFamily: F.display, fontSize: dar ? 14 : 15, lineHeight: 20, letterSpacing: rtl ? 0 : dar ? 0.4 : 1.2, textAlign: "center", color: pasif ? C.parchmentMuted : C.inkOnGold }}>{etiket}</Text>
    </View>
  </Pressable>;
}

/** İkincil, çerçeveli düğme. */
export function CizgiDugme({ etiket, onPress, icon, rtl, kapali = false, kucuk = false }: { etiket: string; onPress: () => void; icon?: string; rtl: boolean; kapali?: boolean; kucuk?: boolean }) {
  return <Pressable accessibilityLabel={etiket} accessibilityState={{ disabled: kapali }} disabled={kapali} onPress={() => { hap("tap"); onPress(); }}
    style={({ pressed }) => ({ minHeight: kucuk ? 44 : 50, borderRadius: 8, borderWidth: 1, borderColor: kapali ? "rgba(168,130,63,0.4)" : ONL.frameHi, backgroundColor: pressed ? "rgba(201,162,78,0.24)" : "rgba(201,162,78,0.12)", flexDirection: yon(rtl), alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 14, opacity: kapali ? 0.55 : 1 })}>
    {icon ? <GameIcon name={icon} size={17} color={C.goldBright} /> : null}
    <Text numberOfLines={2} style={{ flexShrink: 1, fontFamily: F.display, fontSize: kucuk ? 13 : 14, letterSpacing: rtl ? 0 : 1, textAlign: "center", color: C.goldBright }}>{etiket}</Text>
  </Pressable>;
}

/** Doluluk çubuğu: ev kapasitesine göre renk (boş → yeşil, dolu → kan kırmızısı). */
export function Doluluk({ nufus, kapasite, rtl, ince = false }: { nufus: number; kapasite: number; rtl: boolean; ince?: boolean }) {
  const oran = kapasite > 0 ? Math.min(1, nufus / kapasite) : 1;
  const renk = oran >= 1 ? C.blood : oran >= 0.8 ? C.ember : oran >= 0.5 ? C.gold : C.sage;
  return <View style={{ height: ince ? 4 : 6, borderRadius: 3, backgroundColor: "rgba(201,162,78,0.16)", overflow: "hidden", flexDirection: yon(rtl) }}>
    <View style={{ width: `${Math.max(oran * 100, oran > 0 ? 4 : 0)}%`, backgroundColor: renk, borderRadius: 3 }} />
  </View>;
}

/** Hata ya da bilgi bandı; isteğe bağlı eylem düğmesiyle. */
export function Bant({ metin, rtl, tur = "hata", eylem, onEylem }: { metin: string; rtl: boolean; tur?: "hata" | "bilgi"; eylem?: string; onEylem?: () => void }) {
  const hata = tur === "hata";
  return <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ borderRadius: 8, borderWidth: 1, borderColor: hata ? "rgba(200,64,64,0.7)" : "rgba(201,162,78,0.5)", backgroundColor: hata ? "rgba(60,16,12,0.88)" : "rgba(22,16,10,0.88)", padding: 12, gap: 10 }}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
      <View style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: hata ? C.blood : ONL.frame, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)" }}>
        <GameIcon name={hata ? "shield" : "hourglass"} size={15} color={hata ? C.roseDim : C.gold} />
      </View>
      <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: C.parchment, textAlign: hiza(rtl) }}>{metin}</Text>
    </View>
    {eylem && onEylem ? <CizgiDugme etiket={eylem} onPress={onEylem} rtl={rtl} kucuk /> : null}
  </View>;
}

/** Yerleşim türü simgesi. */
export const TUR_IKON: Record<string, string> = { sehir: "castle", kasaba: "house", koy: "wheat" };

/** Geri: yığında önceki ekran varsa ona, yoksa yedek rotaya. */
export function geriGit(router: { canGoBack?: () => boolean; back: () => void; replace: (yol: string) => void }, yedek: string) {
  try {
    if (router.canGoBack?.()) { router.back(); return; }
  } catch {}
  router.replace(yedek);
}
