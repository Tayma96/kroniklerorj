import { DesignPressable as Pressable } from "../lib/design-pressable";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { View, Text, TextInput, ActivityIndicator, ScrollView, Alert, Image, StyleSheet, Dimensions, BackHandler, Keyboard, Platform, useWindowDimensions, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import Animated, { FadeIn, FadeInUp, FadeOut, useSharedValue, useAnimatedStyle, withTiming, Easing, type EntryExitAnimationFunction } from "react-native-reanimated";
import { useGame } from "../lib/store";
import { useI18n, applyParams } from "../lib/i18n";
import { applyTemperament, TEMPERAMENTS, applyBirthHouse, BIRTH_HOUSES } from "../lib/game";
import { C, F } from "../lib/theme";
import { Ambiance, ParticleBurst, Pulse } from "../lib/fx";
import { Sinematik } from "../lib/sinematik/oynatici";
import { cekimListesi, type Cekim } from "../lib/sinematik/cekimler";
import { isReduceMotion } from "../lib/perf";
import { playTap } from "../lib/sound";
import { GameIcon } from "../lib/icons";
import { Ornament, MK } from "../lib/home-mockup-ui";
import { useSadeMod } from "../lib/use-sade-mod";
import { hap } from "../lib/haptics";

const AnimImage = Animated.createAnimatedComponent(Image);

// ── Karakter yaratımı: Kimlik → Tabiat → Ocak. Tek rota, iç adım durumu; mockup dili (aydınlık sahne, altın çerçeve, madalyon) ──
type Step = 1 | 2 | 3;
const GUT = 16;
const SCENE: Record<string, ImageSourcePropType> = {
  kimlik: require("../assets/yeni_oyun_bg.png"),
  tabiat: require("../assets/hero/cocuk_yaz.jpg"),
  ocak: require("../assets/arka/dogum.jpg"),
  koylu: require("../assets/arka/hasat.jpg"),
  esnaf: require("../assets/arka/atolye_demirci.jpg"),
  hekim: require("../assets/arka/medrese.jpg"),
  sipahi: require("../assets/arka/ev_varlikli.jpg"),
};
const PORTRE = { erkek: require("../assets/portre/e_genc.png"), kadın: require("../assets/portre/k_genc.png") } as const;
const TEMP_ICON: Record<string, string> = { yigit: "crossed-swords", kurnaz: "hood", merhametli: "healing", hirsli: "crown" };
const STEPS = [
  { label: "yo.step.kimlik", title: "yo.s1.title", sub: "yo.s1.sub", icon: "karakter" },
  { label: "yo.step.tabiat", title: "yo.s2.title", sub: "yo.s2.sub", icon: "leaf" },
  { label: "yo.step.ocak", title: "yo.s3.title", sub: "yo.s3.sub", icon: "house" },
] as const;
const GLOW = { shadowColor: C.goldBright, shadowOpacity: 0.55, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } };
const side = (rtl: boolean, v: number) => (rtl ? { left: v } : { right: v });

// Adım geçişi: ileri giderken yandan kayarak ve solarak gelir (sade modda hiç oynamaz).
function slideIn(dx: number): EntryExitAnimationFunction {
  return () => {
    "worklet";
    return {
      initialValues: { opacity: 0, transform: [{ translateX: dx }] },
      animations: {
        opacity: withTiming(1, { duration: 260 }),
        transform: [{ translateX: withTiming(0, { duration: 340, easing: Easing.out(Easing.cubic) }) }],
      },
    };
  };
}

function Check({ size = 14, color = C.inkOnGold }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M4.5 12.5 L9.8 17.6 L19.5 6.8" stroke={color} strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}
function Chevron({ dir, size = 15, color }: { dir: "left" | "right"; size?: number; color: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d={dir === "left" ? "M15 4.5 L7.5 12 L15 19.5" : "M9 4.5 L16.5 12 L9 19.5"} stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}
function CheckBadge({ rtl, size = 26, inset = 8 }: { rtl: boolean; size?: number; inset?: number }) {
  return <View pointerEvents="none" style={[{ position: "absolute", top: inset, width: size, height: size, borderRadius: size / 2, backgroundColor: C.gold, borderWidth: 1.5, borderColor: C.goldBright, alignItems: "center", justifyContent: "center" }, side(rtl, inset), GLOW]}>
    <Check size={Math.round(size * 0.58)} />
  </View>;
}

// Altın çerçeveli kart: koyu yarı saydam zemin, iç ince hat; seçilince parlak kenar + dış hale.
function Frame({ active, radius = 10, children, style }: { active: boolean; radius?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ borderRadius: radius }, active ? GLOW : null, style]}>
    {active ? <View pointerEvents="none" style={{ position: "absolute", top: -4, left: -4, right: -4, bottom: -4, borderRadius: radius + 4, borderWidth: 2, borderColor: "rgba(243,210,122,0.32)" }} /> : null}
    <View style={{ flexGrow: 1, borderRadius: radius, borderWidth: 1.5, borderColor: active ? C.goldBright : "rgba(168,130,63,0.78)", backgroundColor: active ? "rgba(42,31,19,0.95)" : "rgba(22,16,10,0.9)", overflow: "hidden" }}>
      {children}
      <View pointerEvents="none" style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: Math.max(radius - 3, 2), borderWidth: 1, borderColor: active ? "rgba(243,210,122,0.3)" : "rgba(201,162,78,0.16)" }} />
    </View>
  </View>;
}

function Medal({ icon, size, active }: { icon: string; size: number; active: boolean }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: active ? C.goldBright : MK.frame, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
    <LinearGradient pointerEvents="none" colors={active ? [C.goldBright, C.gold, C.goldDim] : [C.cardHi, C.surface]} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: size / 2, borderWidth: 1, borderColor: active ? "rgba(26,18,6,0.35)" : "rgba(201,162,78,0.3)" }} />
    <View><GameIcon name={icon} size={Math.round(size * 0.5)} color={active ? C.inkOnGold : C.gold} /></View>
  </View>;
}

function SectionLabel({ text, rtl, first = false }: { text: string; rtl: boolean; first?: boolean }) {
  return <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 8, marginTop: first ? 2 : 20, marginBottom: 9 }}>
    <Ornament size={13} />
    <Text style={{ fontFamily: F.display, fontSize: 12.5, letterSpacing: 1.5, color: C.goldBright, textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } }}>{text}</Text>
    <View style={{ flex: 1, height: 1, backgroundColor: "rgba(201,162,78,0.3)" }} />
  </View>;
}

// Tam ekran sahne; değişince yenisi eskisinin üstünde yumuşakça belirir.
function Scene({ k, reduced }: { k: string; reduced: boolean }) {
  const prev = useRef(k);
  const under = prev.current;
  useEffect(() => { prev.current = k; }, [k]);
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <Image accessible={false} source={SCENE[under]} resizeMode="cover" style={StyleSheet.absoluteFill} />
    <Animated.View key={k} entering={reduced ? undefined : FadeIn.duration(700)} style={StyleSheet.absoluteFill}>
      <Image accessible={false} source={SCENE[k]} resizeMode="cover" style={StyleSheet.absoluteFill} />
    </Animated.View>
    <LinearGradient pointerEvents="none" colors={["rgba(10,7,4,0.9)", "rgba(10,7,4,0.4)", "rgba(10,7,4,0.1)", "rgba(10,7,4,0.62)", "rgba(10,7,4,0.95)"]} locations={[0, 0.22, 0.4, 0.68, 1]} style={StyleSheet.absoluteFill} />
  </View>;
}

const M = 38; // adım madalyonu çapı
function Stepper({ step, rtl, onJump, t }: { step: Step; rtl: boolean; onJump: (n: Step) => void; t: (k: string) => string }) {
  const edge = rtl ? { right: "16.66%" as const } : { left: "16.66%" as const };
  return <View style={{ flex: 1 }}>
    <View pointerEvents="none" style={[{ position: "absolute", top: M / 2 - 1, width: "66.66%", height: 2, backgroundColor: "rgba(168,130,63,0.42)" }, edge]} />
    <View pointerEvents="none" style={[{ position: "absolute", top: M / 2 - 1, width: step === 1 ? 0 : step === 2 ? "33.33%" : "66.66%", height: 2, backgroundColor: C.gold }, edge]} />
    <View style={{ flexDirection: rtl ? "row-reverse" : "row" }}>
      {STEPS.map((s, i) => {
        const n = (i + 1) as Step, done = n < step, cur = n === step, label = t(s.label);
        return <Pressable key={s.label} disabled={!done} onPress={() => onJump(n)} accessibilityLabel={applyParams(t("yo.stepOf"), [n, label])} accessibilityState={{ selected: cur, disabled: !done }} style={{ flex: 1, alignItems: "center", justifyContent: "flex-start" }}>
          <View style={[{ width: M, height: M, borderRadius: M / 2, alignItems: "center", justifyContent: "center", borderWidth: cur ? 2 : 1.5, borderColor: done || cur ? C.goldBright : "rgba(168,130,63,0.6)", backgroundColor: done ? C.gold : cur ? C.cardHi : "rgba(14,10,6,0.9)" }, cur ? GLOW : null]}>
            {done ? <Check size={17} /> : <GameIcon name={s.icon} size={cur ? 19 : 16} color={cur ? C.goldBright : C.parchmentMuted} />}
          </View>
          <Text numberOfLines={1} style={{ alignSelf: "stretch", marginHorizontal: -12, marginTop: 5, fontFamily: F.display, fontSize: 12, letterSpacing: 0.8, textAlign: "center", color: cur ? C.goldBright : done ? C.gold : C.parchmentMuted }}>{label}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}

function GenderCard({ val, label, active, dim, rtl, tall, onPress }: { val: "erkek" | "kadın"; label: string; active: boolean; dim: boolean; rtl: boolean; tall: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: active, selected: active }} style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
    <Frame active={active} radius={12}>
      <Image accessible={false} source={PORTRE[val]} resizeMode="cover" style={{ width: "100%", aspectRatio: tall ? 0.84 : 0.92 }} />
      {dim ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,7,4,0.5)" }]} /> : null}
      <LinearGradient pointerEvents="none" colors={["rgba(14,10,6,0)", "rgba(14,10,6,0.75)", "rgba(14,10,6,0.96)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "46%" }} />
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 12, alignItems: "center" }}>
        <Text style={{ fontFamily: F.display, fontSize: 18, letterSpacing: 2, color: active ? C.goldBright : C.parchment, textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 6 }}>{label}</Text>
        <View style={{ width: active ? 48 : 26, height: 1.5, marginTop: 5, backgroundColor: active ? C.gold : "rgba(201,162,78,0.45)" }} />
      </View>
      {active ? <CheckBadge rtl={rtl} /> : null}
    </Frame>
  </Pressable>;
}

function TempCard({ id, name, desc, active, rtl, onPress }: { id: string; name: string; desc: string; active: boolean; rtl: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="radio" accessibilityLabel={name + ". " + desc} accessibilityState={{ checked: active, selected: active }} style={({ pressed }) => ({ flex: 1, justifyContent: "flex-start", transform: [{ scale: pressed ? 0.98 : 1 }] })}>
    <Frame active={active} radius={10} style={{ flexGrow: 1 }}>
      <View style={{ alignItems: "center", paddingHorizontal: 10, paddingTop: 16, paddingBottom: 14 }}>
        <Medal icon={TEMP_ICON[id] || "star"} size={54} active={active} />
        <Text numberOfLines={2} style={{ marginTop: 10, fontFamily: F.display, fontSize: 15, letterSpacing: 0.8, textAlign: "center", color: active ? C.goldBright : C.parchment }}>{name}</Text>
        <View style={{ width: 34, height: 1, marginVertical: 7, backgroundColor: active ? C.gold : "rgba(201,162,78,0.45)" }} />
        <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 19, textAlign: "center", color: C.parchmentDim }}>{desc}</Text>
      </View>
      {active ? <CheckBadge rtl={rtl} size={24} inset={7} /> : null}
    </Frame>
  </Pressable>;
}

function HouseCard({ id, name, perks, active, rtl, narrow, onPress }: { id: string; name: string; perks: string; active: boolean; rtl: boolean; narrow: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="radio" accessibilityLabel={name + ". " + perks} accessibilityState={{ checked: active, selected: active }} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>
    <Frame active={active} radius={10}>
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", minHeight: 94 }}>
        <View style={{ width: narrow ? 92 : 116 }}>
          <Image accessible={false} source={SCENE[id]} resizeMode="cover" style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: active ? "rgba(10,7,4,0)" : "rgba(10,7,4,0.22)" }]} />
          {active ? <CheckBadge rtl={!rtl} size={24} inset={6} /> : null}
        </View>
        <View style={{ width: 1.5, backgroundColor: active ? C.gold : "rgba(168,130,63,0.6)" }} />
        <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 11, justifyContent: "center" }}>
          <Text style={{ fontFamily: F.display, fontSize: 15, letterSpacing: 0.6, textAlign: rtl ? "right" : "left", color: active ? C.goldBright : C.parchment }}>{name}</Text>
          <Text style={{ marginTop: 4, fontFamily: F.serif, fontSize: 14.5, lineHeight: 19, textAlign: rtl ? "right" : "left", color: C.parchmentDim }}>{perks}</Text>
        </View>
      </View>
    </Frame>
  </Pressable>;
}

function LineageCard({ icon, title, sub, note, active, rtl, disabled, onPress }: { icon: string; title: string; sub?: string; note?: string; active: boolean; rtl: boolean; disabled: boolean; onPress: () => void }) {
  const align = rtl ? "right" as const : "left" as const;
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="radio" accessibilityLabel={[title, sub, note].filter(Boolean).join(". ")} accessibilityState={{ checked: active, selected: active, disabled }}>
    <Frame active={active} radius={8}>
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 11, paddingHorizontal: 12, paddingVertical: 10, minHeight: 58 }}>
        <Medal icon={icon} size={36} active={active} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 14, letterSpacing: 0.6, textAlign: align, color: active ? C.goldBright : C.parchment }}>{title}</Text>
          {sub ? <Text style={{ marginTop: 2, fontFamily: F.serif, fontSize: 14, lineHeight: 18, textAlign: align, color: C.parchmentDim }}>{sub}</Text> : null}
          {note ? <Text style={{ marginTop: 3, fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 17, textAlign: align, color: C.parchmentMuted }}>{note}</Text> : null}
        </View>
        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: active ? C.goldBright : "rgba(168,130,63,0.7)", alignItems: "center", justifyContent: "center" }}>
          {active ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: C.gold }} /> : null}
        </View>
      </View>
    </Frame>
  </Pressable>;
}

export default function YeniOyun() {
  const router = useRouter();
  const { startGame, apply, state, defter, yeniOcak } = useGame();
  const { t, rtl } = useI18n();
  const reduced = useSadeMod();
  const insets = useSafeAreaInsets();
  const narrow = useWindowDimensions().width < 360;
  // Soyu sürdür: defterde kayıtlı son soy varsa yeni hayat o soyadla, defter ve tek soy yeteneğiyle başlar (para/mülk/itibar geçmez).
  const son = defter.soylar.length ? defter.soylar[defter.soylar.length - 1] : null;
  const [soydan, setSoydan] = useState(false);
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<"erkek" | "kadın" | "">("");
  const [temp, setTemp] = useState<string>("");
  const [house, setHouse] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>(1);
  const [dir, setDir] = useState(1);
  const [showErr, setShowErr] = useState(false);
  const [focus, setFocus] = useState(false);
  const startingRef = useRef(false); // çift dokunuş / çift onay ile iki kez başlatmayı engeller

  const [cinematic, setCinematic] = useState<Cekim[] | null>(null);

  const runStart = async (first: string, surname: string, g: "erkek" | "kadın") => {
    startingRef.current = true;
    setBusy(true);
    try {
      if (soydan && son) await yeniOcak(g, son.secilen, first);
      else await startGame(first, surname, g);
      apply((s) => applyBirthHouse(applyTemperament(s, temp), house));
      setCinematic(cekimListesi(house, temp, gender, first, t));
    } catch {
      startingRef.current = false;
      setError(t("save.readError"));
    } finally { setBusy(false); }
  };

  const start = () => {
    if (startingRef.current) return;
    setError("");
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const first = parts[0] || "";
    const surname = parts.slice(1).join(" ");
    if (first.length < 2) { setError(t("new.errName")); return; }
    // Soydan devamda soyadı defterden gelir; yazılan soyadı yok sayılır.
    if (!gender) { setError(t("new.errGender")); return; }
    if (!temp) { setError(t("new.errTemp")); return; }
    if (!house) { setError(t("new.errHouse")); return; }
    // Mevcut (yaşayan) kayıt varsa üzerine yazmadan önce onayla — kaza ile silinmesin.
    if (state && !state.player.dead) {
      startingRef.current = true;
      Alert.alert(t("new.owTitle"), t("new.owBody"), [
        { text: t("new.owCancel"), style: "cancel", onPress: () => { startingRef.current = false; } },
        { text: t("new.owConfirm"), style: "destructive", onPress: () => runStart(first, surname, gender as "erkek" | "kadın") },
      ]);
      return;
    }
    runStart(first, surname, gender as "erkek" | "kadın");
  };

  // Adım geçerliliği: İleri ancak adım tamamlanınca etkin; basılırsa eksik satır içinde söylenir.
  const firstName = fullName.trim().split(/\s+/).filter(Boolean)[0] || "";
  const stepErr = step === 1 ? (firstName.length < 2 ? t("new.errName") : !gender ? t("new.errGender") : "")
    : step === 2 ? (!temp ? t("new.errTemp") : "")
    : (!house ? t("new.errHouse") : "");
  const valid = !stepErr;
  const errText = (showErr && stepErr) || (step === 3 ? error : "");

  const goStep = (n: Step) => { Keyboard.dismiss(); setFocus(false); setDir(n > step ? 1 : -1); setShowErr(false); setError(""); setStep(n); };
  const back = () => {
    if (busy) return;
    playTap();
    if (step > 1) { goStep((step - 1) as Step); return; }
    if (router.canGoBack?.()) router.back(); else router.replace("/");
  };
  const next = () => {
    if (busy) return;
    if (!valid) { setShowErr(true); hap("warning"); return; }
    playTap();
    if (step < 3) goStep((step + 1) as Step); else start();
  };
  const pick = (fn: () => void) => { hap("selection"); fn(); };

  // Android geri tuşu önce bir önceki adıma döner.
  useEffect(() => {
    if (cinematic || Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (busy) return true;
      if (step > 1) { goStep((step - 1) as Step); return true; }
      return false;
    });
    return () => sub.remove();
  }, [step, busy, cinematic]);

  if (cinematic) {
    return <Sinematik cekimler={cinematic} onDone={() => router.replace("/oyun")} />;
  }

  const meta = STEPS[step - 1];
  const sceneKey = step === 1 ? "kimlik" : step === 2 ? "tabiat" : house || "ocak";
  const enter = reduced ? undefined : slideIn(dir * (rtl ? -28 : 28));
  const primary = step < 3 ? t("yo.next") : busy ? t("yo.creating") : t("yo.create");
  const align = rtl ? "right" as const : "left" as const;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Scene k={sceneKey} reduced={reduced} />

      {/* Üst: geri madalyonu + üç madalyonlu adım göstergesi */}
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 12, flexDirection: rtl ? "row-reverse" : "row", alignItems: "flex-start" }}>
        <Pressable onPress={back} disabled={busy} accessibilityLabel={t("yo.back")} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          {({ pressed }) => <View style={{ width: M, height: M, borderRadius: M / 2, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: MK.frame, backgroundColor: pressed ? C.cardHi : "rgba(18,13,8,0.88)" }}>
            <View pointerEvents="none" style={{ position: "absolute", top: 2, left: 2, right: 2, bottom: 2, borderRadius: M / 2, borderWidth: 1, borderColor: "rgba(201,162,78,0.22)" }} />
            <View><Chevron dir={rtl ? "right" : "left"} size={17} color={C.gold} /></View>
          </View>}
        </Pressable>
        <View style={{ flex: 1, marginTop: 3 }}><Stepper step={step} rtl={rtl} t={t} onJump={(n) => { if (busy) return; playTap(); goStep(n); }} /></View>
        <View style={{ width: 44 }} />
      </View>

      <Animated.View key={step} entering={enter} style={{ flex: 1 }}>
        <View style={{ alignItems: "center", paddingHorizontal: 20, marginTop: 8, marginBottom: 6 }}>
          <Text accessibilityRole="header" numberOfLines={2} style={{ fontFamily: F.display, fontSize: narrow ? 22 : 26, lineHeight: narrow ? 28 : 32, letterSpacing: 0.5, textAlign: "center", color: C.parchment, textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 10, textShadowOffset: { width: 0, height: 1 } }}>{t(meta.title)}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 6 }}>
            <View style={{ width: 38, height: 1, backgroundColor: "rgba(201,162,78,0.55)" }} />
            <Ornament size={12} />
            <View style={{ width: 38, height: 1, backgroundColor: "rgba(201,162,78,0.55)" }} />
          </View>
          <Text numberOfLines={2} style={{ fontFamily: F.serifItalic, fontSize: 16, lineHeight: 21, textAlign: "center", color: C.parchmentDim, textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 6 }}>{t(meta.sub)}</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end", paddingHorizontal: GUT, paddingTop: 10, paddingBottom: 22 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
          {step === 1 ? <>
            <SectionLabel text={t("new.nameLabel")} rtl={rtl} first />
            <Frame active={focus} radius={9}>
              <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10, paddingHorizontal: 14 }}>
                <GameIcon name="scroll-open" size={20} color={C.gold} />
                <TextInput
                  value={fullName} onChangeText={setFullName} placeholder={t("new.namePlaceholder")}
                  placeholderTextColor={C.parchmentMuted} maxLength={32} editable={!busy}
                  autoCapitalize="words" autoCorrect={false} returnKeyType="done" onSubmitEditing={Keyboard.dismiss}
                  onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} accessibilityLabel={t("new.nameLabel")}
                  style={{ flex: 1, minHeight: 54, paddingVertical: 10, color: C.parchment, fontFamily: F.serif, fontSize: 19, textAlign: align }}
                />
              </View>
            </Frame>

            <SectionLabel text={t("new.gender")} rtl={rtl} />
            <View accessibilityRole="radiogroup" style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 12 }}>
              {(["erkek", "kadın"] as const).map((g) => (
                <GenderCard key={g} val={g} label={t(g === "erkek" ? "yo.male" : "yo.female")} active={gender === g} dim={!!gender && gender !== g} rtl={rtl} tall={!narrow} onPress={() => pick(() => setGender(g))} />
              ))}
            </View>

            {son ? <View accessibilityRole="radiogroup" style={{ marginTop: 18, gap: 9 }}>
              <LineageCard icon="banner" title={t("new.soy.title")} sub={applyParams(t("new.soy.sub"), [son.soyad || son.ad, son.nesil + 1, son.ad])} note={t("new.soy.not")} active={soydan} rtl={rtl} disabled={busy} onPress={() => pick(() => setSoydan(true))} />
              <LineageCard icon="leaf" title={t("new.soy.yeni")} active={!soydan} rtl={rtl} disabled={busy} onPress={() => pick(() => setSoydan(false))} />
            </View> : null}
          </> : step === 2 ? <View accessibilityRole="radiogroup" style={{ gap: 12 }}>
            {[0, 2].map((r) => (
              <View key={r} style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 12 }}>
                {TEMPERAMENTS.slice(r, r + 2).map((id) => (
                  <TempCard key={id} id={id} name={t("temp." + id + ".l")} desc={t("temp." + id + ".d")} active={temp === id} rtl={rtl} onPress={() => pick(() => setTemp(id))} />
                ))}
              </View>
            ))}
          </View> : <View accessibilityRole="radiogroup" style={{ gap: 11 }}>
            {/* Doğduğun ocak: başlangıçta farklı eksende avantaj (para · beceri · özellik · itibar) */}
            {BIRTH_HOUSES.map((id) => (
              <HouseCard key={id} id={id} name={t("house." + id + ".l")} perks={t("house." + id + ".d")} active={house === id} rtl={rtl} narrow={narrow} onPress={() => pick(() => setHouse(id))} />
            ))}
          </View>}
        </ScrollView>
      </Animated.View>

      {/* Alt çubuk: satır içi uyarı + Geri / İleri (Dünyayı Yarat) */}
      <View style={{ paddingHorizontal: GUT, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 10) + 8 }}>
        <LinearGradient pointerEvents="none" colors={["rgba(14,10,6,0)", "rgba(14,10,6,0.88)", C.bg]} style={{ position: "absolute", left: 0, right: 0, top: -26, bottom: 0 }} />
        {errText ? <Text accessibilityLiveRegion="polite" style={{ marginBottom: 8, fontFamily: F.serif, fontSize: 15, lineHeight: 19, textAlign: "center", color: C.ember }}>{errText}</Text> : null}
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 10 }}>
          <Pressable onPress={back} disabled={busy} accessibilityLabel={t("yo.back")} style={({ pressed }) => ({ minHeight: 52, paddingHorizontal: narrow ? 14 : 18, borderRadius: 8, borderWidth: 1, borderColor: MK.frame, backgroundColor: pressed ? C.cardHi : "rgba(24,18,11,0.92)", flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", gap: 6 })}>
            <Chevron dir={rtl ? "right" : "left"} color={C.parchmentDim} />
            <Text style={{ fontFamily: F.display, fontSize: 14, letterSpacing: 1, color: C.parchment }}>{t("yo.back")}</Text>
          </Pressable>
          <Pressable onPress={next} disabled={busy} accessibilityLabel={primary} accessibilityHint={valid ? undefined : stepErr} accessibilityState={{ disabled: !valid || busy, busy }} style={({ pressed }) => [{ flex: 1, minHeight: 52, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: valid ? C.goldBright : "rgba(168,130,63,0.5)", transform: [{ scale: pressed && valid ? 0.98 : 1 }] }, valid ? GLOW : null]}>
            <LinearGradient pointerEvents="none" colors={valid ? [C.goldBright, C.gold, C.goldDim] : ["rgba(160,122,58,0.42)", "rgba(96,72,34,0.42)"]} style={StyleSheet.absoluteFill} />
            <View style={{ flex: 1, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 12 }}>
              {busy ? <ActivityIndicator color={C.inkOnGold} size="small" /> : null}
              <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 15, letterSpacing: 1, color: valid ? C.inkOnGold : C.parchmentMuted }}>{primary}</Text>
              {busy ? null : <Chevron dir={rtl ? "left" : "right"} color={valid ? C.inkOnGold : C.parchmentMuted} />}
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
