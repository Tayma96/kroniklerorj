// Giriş ekranı — mevsime göre aydınlık kasaba resmi, ortada logo, altta altın çerçeveli menü (claude-paket mockup dili).
import { useEffect, useRef, useState } from "react";
import { View, Text, Image, Modal, Switch, StyleSheet, Pressable as RNPressable, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, cancelAnimation } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Defs, LinearGradient as SvgGradient, RadialGradient, Stop, Rect, Ellipse } from "react-native-svg";
import Constants from "expo-constants";
import { useRouter, useIsFocused } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DesignPressable as Pressable } from "../lib/design-pressable";
import { PressableScale } from "../lib/ui";
import { useGame } from "../lib/store";
import { useI18n, applyParams } from "../lib/i18n";
import { LANGS } from "../lib/locale-data";
import { isSoundEnabled, setSoundEnabled, playTap } from "../lib/sound";
import { isHapticsEnabled, setHapticsEnabled, hap } from "../lib/haptics";
import { GameIcon } from "../lib/icons";
import { LoadingScreen, Ambiance } from "../lib/fx";
import { townSeasonImage } from "../lib/assets";
import { currentCalendar } from "../lib/calendar";
import { useSadeMod } from "../lib/use-sade-mod";
import { ONLINE_ACIK } from "../lib/mp/config";
import { MK, Ornament } from "../lib/home-mockup-ui";
import { C, F, T, L } from "../lib/theme";

const ART_RATIO = 1.5;   // town-*.jpg 768×512
const ART_FOCUS = 0.66;  // minare + kale yatayda bu noktada
const SHADE = "14,10,6"; // C.bg rgb — geçişlerde saydamlık için

// Kayıt yoksa gerçek takvimin mevsimi; kayıt varsa oyundaki ay.
function seasonNow(): string {
  const m = new Date().getMonth() + 1;
  return m === 12 || m <= 2 ? "Kış" : m <= 5 ? "İlkbahar" : m <= 8 ? "Yaz" : "Sonbahar";
}

// Sahne: resim kale/minare odaklı yerleşir, yavaşça yakınlaşır (sade modda durağan).
function TitleScene({ season, width, height, top, paused = false }: { season: string; width: number; height: number; top: number; paused?: boolean }) {
  const sade = useSadeMod();
  const reduced = sade || paused; // başka ekran öndeyken (router.push) yineleyen yakınlaşma durur
  const z = useSharedValue(1);
  useEffect(() => {
    z.value = 1;
    if (reduced) return;
    z.value = withRepeat(withTiming(1.08, { duration: 26000, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(z);
  }, [reduced, season]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: z.value }] }));
  const imgH = Math.max(height - top + 24, width / ART_RATIO);
  const imgW = imgH * ART_RATIO;
  const left = Math.min(0, Math.max(width - imgW, width / 2 - imgW * ART_FOCUS));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, st]}>
    <Image accessible={false} source={townSeasonImage(season)} resizeMode="cover" style={{ position: "absolute", top, left, width: imgW, height: imgH }} />
  </Animated.View>;
}

// Yatay ince altın hat: içten dışa söner (ayraç ve göz başlığı yanları).
function FadeLine({ width, flip = false, id }: { width: number; flip?: boolean; id: string }) {
  return <Svg width={width} height={2}>
    <Defs><SvgGradient id={id} x1={flip ? "1" : "0"} y1="0" x2={flip ? "0" : "1"} y2="0">
      <Stop offset="0" stopColor={C.gold} stopOpacity="0.95" /><Stop offset="1" stopColor={C.gold} stopOpacity="0" />
    </SvgGradient></Defs>
    <Rect x="0" y="0" width={width} height={1.2} fill={`url(#${id})`} />
  </Svg>;
}

function Chevron({ color, rtl, size = 16 }: { color: string; rtl: boolean; size?: number }) {
  return <Svg width={size * 0.62} height={size} viewBox="0 0 10 16">
    <Path d={rtl ? "M8 2 L2 8 L8 14" : "M2 2 L8 8 L2 14"} stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}

// Panel köşelerinde pirinç gönye (ornament-ui ile aynı dil).
function Corners() {
  const arm = { position: "absolute" as const, backgroundColor: MK.frameHi, opacity: 0.8 };
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {([["top", "left"], ["top", "right"], ["bottom", "left"], ["bottom", "right"]] as const).map(([v, h]) => <View key={v + h}>
      <View style={[arm, { [v]: 4, [h]: 4, width: 14, height: 1.5 }]} />
      <View style={[arm, { [v]: 4, [h]: 4, width: 1.5, height: 14 }]} />
    </View>)}
  </View>;
}

// Altın çerçeveli koyu cam panel.
function FramedPanel({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[{ borderRadius: 6, borderWidth: 1, borderColor: MK.frame, backgroundColor: `rgba(${SHADE},0.78)`, overflow: "hidden" }, style]}>
    <LinearGradient pointerEvents="none" colors={["rgba(40,29,17,0.82)", "rgba(24,18,11,0.84)", "rgba(17,12,7,0.9)"]} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: 4, borderWidth: 1, borderColor: "rgba(201,162,78,0.18)" }} />
    <Corners />
    {children}
  </View>;
}

const GOLD_FILL = ["#F6DD92", "#E2B65A", "#B97E30"] as const;
const DARK_FILL = ["rgba(42,31,19,0.95)", "rgba(26,19,11,0.95)", "rgba(16,11,6,0.96)"] as const;

function MenuButton({ icon, label, sub, primary = false, tag, rtl, narrow, onPress }: { icon: string; label: string; sub?: string; primary?: boolean; tag?: string; rtl: boolean; narrow: boolean; onPress: () => void }) {
  const ink = primary ? C.inkOnGold : C.parchment;
  const lock = useRef(false); // hızlı çift dokunuşta iki kez router.push olmasın
  return <PressableScale haptic="tap" accessibilityLabel={[label, tag, sub].filter(Boolean).join(". ")} onPress={() => { if (lock.current) return; lock.current = true; setTimeout(() => { lock.current = false; }, 600); playTap(); onPress(); }}
    style={{ minHeight: 62, borderRadius: 6, borderWidth: 1, borderColor: primary ? C.goldBright : MK.frame, overflow: "hidden", backgroundColor: primary ? C.gold : C.card,
      shadowColor: primary ? C.gold : "#000", shadowOpacity: primary ? 0.35 : 0.5, shadowRadius: primary ? 10 : 6, shadowOffset: { width: 0, height: 2 }, elevation: primary ? 6 : 3 }}>
    <LinearGradient pointerEvents="none" colors={primary ? GOLD_FILL : DARK_FILL} style={StyleSheet.absoluteFill} />
    {primary && <LinearGradient pointerEvents="none" colors={["rgba(255,250,230,0.45)", "rgba(255,250,230,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 22 }} />}
    <View pointerEvents="none" style={{ position: "absolute", top: 2, left: 2, right: 2, bottom: 2, borderRadius: 4, borderWidth: 1, borderColor: primary ? "rgba(122,78,24,0.45)" : "rgba(201,162,78,0.16)" }} />
    <View style={{ flex: 1, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 12, paddingHorizontal: 10, paddingVertical: 8 }}>
      <View style={{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 1.5,
        borderColor: primary ? "rgba(94,53,18,0.55)" : MK.frameHi, backgroundColor: primary ? "rgba(255,244,214,0.28)" : "#120D08" }}>
        {!primary && <View pointerEvents="none" style={{ position: "absolute", top: 2, left: 2, right: 2, bottom: 2, borderRadius: 18, borderWidth: 1, borderColor: "rgba(201,162,78,0.22)" }} />}
        <GameIcon name={icon} size={22} color={primary ? C.inkOnGold : C.goldBright} />
        {/* Etiket madalyonun altına plaka olarak oturur; dar ekranda başlığı kırpmaz. */}
        {tag && <View style={{ position: "absolute", bottom: -7, minWidth: 40, alignItems: "center", borderWidth: 1, borderColor: C.gold, backgroundColor: C.surface, borderRadius: 3, paddingHorizontal: 4 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 10, lineHeight: 13, letterSpacing: 1.2, color: C.goldBright }}>{tag}</Text>
        </View>}
      </View>
      <View style={{ flex: 1, minWidth: 0, alignItems: rtl ? "flex-end" : "flex-start" }}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ maxWidth: "100%", fontFamily: F.display, fontSize: narrow ? 16 : 17, lineHeight: 22, letterSpacing: 0.6, color: ink }}>{label}</Text>
        {!!sub && <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 18, color: primary ? "rgba(26,18,6,0.78)" : MK.muted, textAlign: rtl ? "right" : "left" }}>{sub}</Text>}
      </View>
      <Chevron color={primary ? C.inkOnGold : C.gold} rtl={rtl} />
    </View>
  </PressableScale>;
}

function CloseMark({ color }: { color: string }) {
  return <Svg width={16} height={16} viewBox="0 0 16 16"><Path d="M3 3 L13 13 M13 3 L3 13" stroke={color} strokeWidth={1.8} strokeLinecap="round" /></Svg>;
}

export default function MainMenu() {
  const { state, loading } = useGame();
  const { lang, setLang, t, rtl } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const reduced = useSadeMod();
  const focused = useIsFocused(); // /oyun üstteyken index bağlı kalır; arka plan animasyonları dursun

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sound, setSound] = useState(isSoundEnabled());
  const [haptics, setHaptics] = useState(isHapticsEnabled());
  const toggleSound = async (v: boolean) => { setSound(v); await setSoundEnabled(v); if (v) playTap(); };
  const toggleHaptics = async (v: boolean) => { setHaptics(v); await setHapticsEnabled(v); if (v) hap("selection"); };

  if (loading) {
    return <LoadingScreen />;
  }

  const hasSave = !!state;
  const season = state ? currentCalendar(state.turn).season : seasonNow();
  const narrow = W < 360;
  const titleSize = narrow ? 38 : 46;
  const artTop = insets.top + Math.round(H * 0.06);
  const version = Constants.expoConfig?.version;
  const enter = (delay: number, dur = 520) => (reduced ? undefined : FadeInUp.delay(delay).duration(dur));

  const items: { key: string; icon: string; label: string; sub?: string; primary?: boolean; tag?: string; go: () => void }[] = [];
  if (state) items.push({ key: "devam", icon: "book", label: t("menu.continue"), sub: applyParams(t("gir.devamAlt"), [state.player.name, state.player.age]), primary: true, go: () => router.push("/oyun") });
  items.push({ key: "yeni", icon: "flame", label: t("menu.newGame"), sub: t("gir.yeniAlt"), primary: !hasSave, go: () => router.push("/yeni-oyun") });
  items.push({ key: "cok", icon: "banner", label: t("menu.multi"), sub: t("menu.multiHint"), tag: t(ONLINE_ACIK ? "gir.beta" : "gir.yakinda"), go: () => router.push("/cok-oyunculu") });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, overflow: "hidden" }}>
      <TitleScene season={season} width={W} height={H} top={artTop} paused={!focused} />
      {/* Okunurluk: üst koyu bant resmin kenarını örter, alt geçiş menüyü taşır. */}
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: artTop + 2, backgroundColor: C.bg }} />
      <LinearGradient pointerEvents="none" colors={[C.bg, `rgba(${SHADE},0.78)`, `rgba(${SHADE},0.5)`, `rgba(${SHADE},0.2)`, `rgba(${SHADE},0)`]} style={{ position: "absolute", top: artTop, left: 0, right: 0, height: Math.round(H * 0.3) }} />
      <LinearGradient pointerEvents="none" colors={[`rgba(${SHADE},0)`, `rgba(${SHADE},0.3)`, `rgba(${SHADE},0.72)`, `rgba(${SHADE},0.92)`, C.bg]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: Math.round(H * 0.52) }} />
      {focused && <Ambiance season={season} width={W} height={H} count={10} />}

      {/* Ayarlar madalyonu */}
      <View style={{ position: "absolute", top: insets.top + 8, [rtl ? "left" : "right"]: 12, zIndex: 2 }}>
        <Pressable accessibilityLabel={t("settings.title")} onPress={() => { hap("tap"); playTap(); setSettingsOpen(true); }}
          style={{ width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: MK.frameHi, backgroundColor: `rgba(${SHADE},0.72)` }}>
          <View pointerEvents="none" style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: 18, borderWidth: 1, borderColor: "rgba(201,162,78,0.25)" }} />
          <GameIcon name="ayarlar" size={22} color={C.goldBright} />
        </Pressable>
      </View>

      <View style={{ flex: 1, paddingTop: insets.top + 22, paddingBottom: insets.bottom + 10, paddingHorizontal: 14 }}>
        {/* Logo */}
        <Animated.View entering={reduced ? undefined : FadeInUp.duration(900)} style={{ alignItems: "center" }}>
          <Svg pointerEvents="none" width={W} height={titleSize * 5.4} style={{ position: "absolute", top: -titleSize * 0.9, left: -14 }}>
            <Defs><RadialGradient id="girHalo" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor={C.bg} stopOpacity="0.55" /><Stop offset="0.6" stopColor={C.bg} stopOpacity="0.22" /><Stop offset="1" stopColor={C.bg} stopOpacity="0" />
            </RadialGradient></Defs>
            <Ellipse cx={W / 2} cy={titleSize * 2.7} rx={W * 0.52} ry={titleSize * 2.7} fill="url(#girHalo)" />
          </Svg>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <FadeLine id="girEyeL" width={34} flip />
            <Text style={{ fontFamily: F.display, fontSize: T.label, letterSpacing: 5, color: C.parchmentDim, textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 6 }}>KRONİKLER</Text>
            <FadeLine id="girEyeR" width={34} />
          </View>
          <Text accessibilityRole="header" numberOfLines={2} adjustsFontSizeToFit
            style={{ marginTop: 6, fontFamily: F.display, fontSize: titleSize, lineHeight: Math.round(titleSize * 1.1), letterSpacing: 1.5, color: C.goldBright, textAlign: "center",
              textShadowColor: "rgba(0,0,0,0.95)", textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 14 }}>{"KÜLLERİN\nMİRASI"}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
            <FadeLine id="girDivL" width={70} flip />
            <Ornament size={18} color={C.gold} />
            <FadeLine id="girDivR" width={70} />
          </View>
          <Text style={{ marginTop: 10, fontFamily: F.serifItalic, fontSize: 18, lineHeight: 24, color: C.parchment, textAlign: "center", textShadowColor: "rgba(0,0,0,0.95)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 }}>{t("gir.slogan")}</Text>
        </Animated.View>

        <View style={{ flex: 1 }} />

        {/* Menü */}
        <Animated.View entering={reduced ? undefined : FadeIn.delay(250).duration(600)} style={{ width: "100%", maxWidth: 440, alignSelf: "center", paddingTop: 12 }}>
          <FramedPanel style={{ padding: 14, paddingTop: 20 }}>
            <View style={{ gap: 10 }}>
              {items.map((b, i) => <Animated.View key={b.key} entering={enter(380 + i * 120)}>
                <MenuButton icon={b.icon} label={b.label} sub={b.sub} primary={b.primary} tag={b.tag} rtl={rtl} narrow={narrow} onPress={b.go} />
              </Animated.View>)}
            </View>
          </FramedPanel>
          {/* Panelin üst kenarına oturan süs madalyonu */}
          <View pointerEvents="none" style={{ position: "absolute", top: 0, alignSelf: "center", width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: MK.frameHi, backgroundColor: MK.panel }}>
            <Ornament size={16} color={C.gold} />
          </View>
        </Animated.View>
        {!!version && <Text style={{ marginTop: 10, textAlign: "center", fontFamily: F.serif, fontSize: T.caption, color: C.parchmentMuted, opacity: 0.75 }}>v{version}</Text>}
      </View>

      {/* Ayarlar penceresi */}
      <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={() => setSettingsOpen(false)}>
        <RNPressable accessible={false} onPress={() => setSettingsOpen(false)} style={{ flex: 1, backgroundColor: "rgba(4,3,1,0.78)", justifyContent: "center", paddingHorizontal: 16 }}>
          <RNPressable accessible={false} onPress={() => {}} style={{ width: "100%", maxWidth: 420, alignSelf: "center" }}>
            <FramedPanel style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16 }}>
              <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
                <Ornament size={18} color={MK.gold} />
                <Text accessibilityRole="header" style={{ flex: 1, fontFamily: F.display, fontSize: T.title, letterSpacing: 0.8, color: MK.gold, textAlign: rtl ? "right" : "left" }}>{t("settings.title")}</Text>
                <Pressable accessibilityLabel={t("cine.close")} onPress={() => setSettingsOpen(false)} style={{ width: L.touch, height: L.touch, alignItems: "center", justifyContent: "center" }}>
                  <CloseMark color={C.gold} />
                </Pressable>
              </View>
              <View style={{ height: 1, backgroundColor: "rgba(201,162,78,0.35)", marginTop: 4, marginBottom: 14 }} />

              {/* Dil — 6 dil tek dokunuşla; bayrak yerine dil kodu */}
              <Text style={{ fontFamily: F.display, fontSize: T.caption, letterSpacing: 1.4, color: C.goldDim, marginBottom: 8, textAlign: rtl ? "right" : "left" }}>{t("menu.language").toLocaleUpperCase(lang)}</Text>
              <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 8 }}>
                {LANGS.map((l) => {
                  const active = l.code === lang;
                  return <Pressable key={l.code} accessibilityLabel={l.label} accessibilityState={{ selected: active }} onPress={() => { hap("selection"); setLang(l.code); }}
                    style={{ flexGrow: 1, flexBasis: "30%", minHeight: 54, borderRadius: 5, borderWidth: 1, borderColor: active ? C.gold : C.border, backgroundColor: active ? "rgba(221,180,90,0.16)" : "rgba(14,10,6,0.6)", alignItems: "center", justifyContent: "center", paddingVertical: 6, paddingHorizontal: 4 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 11, lineHeight: 14, letterSpacing: 1.4, color: active ? C.goldBright : C.goldDim }}>{l.code.toUpperCase()}</Text>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.serif, fontSize: T.body, lineHeight: 19, color: active ? C.goldBright : C.parchment }}>{l.label}</Text>
                  </Pressable>;
                })}
              </View>

              {/* Ses ve titreşim */}
              {[
                { k: "sound", label: t("settings.sound"), desc: t("settings.soundDesc"), on: sound, toggle: toggleSound },
                { k: "haptics", label: t("settings.haptics"), desc: t("settings.hapticsDesc"), on: haptics, toggle: toggleHaptics },
              ].map(({ k, label, desc, on, toggle }) => (
                <View key={k} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 12, marginTop: 12, minHeight: 64, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 5, borderWidth: 1, borderColor: C.border, backgroundColor: "rgba(14,10,6,0.6)" }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: F.display, fontSize: T.label, letterSpacing: 1, color: C.parchment, textAlign: rtl ? "right" : "left" }}>{label}</Text>
                    <Text style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 18, color: C.parchmentMuted, marginTop: 2, textAlign: rtl ? "right" : "left" }}>{desc}</Text>
                  </View>
                  <Switch accessibilityLabel={label} value={on} onValueChange={toggle} trackColor={{ false: C.cardHi, true: "rgba(221,180,90,0.6)" }} thumbColor={on ? C.goldBright : C.parchmentMuted} />
                </View>
              ))}
            </FramedPanel>
          </RNPressable>
        </RNPressable>
      </Modal>
    </View>
  );
}
