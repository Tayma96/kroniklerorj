// Sinematik oynatıcı: çekim başına kamera (dolly/pan), çapraz geçiş, ateş/sis/kar/köz katmanları, film greni,
// sinema bantları, daktilo yer-yıl satırı ve altyazı. Kendiliğinden akar; dokunuş sonraki çekime geçer; Atla her an çalışır.
import { useEffect, useMemo, useState } from "react";
import { View, Text, Image, StyleSheet, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInUp, FadeOut, useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, Easing } from "react-native-reanimated";
import { DesignPressable as Pressable } from "../design-pressable";
import { useI18n } from "../i18n";
import { C, F } from "../theme";
import { Ambiance, Pulse } from "../fx";
import { isReduceMotion } from "../perf";
import { playEffect, playTap, pushSoundscape } from "../sound";
import { hap } from "../haptics";
import type { Cekim } from "./cekimler";

const AnimImage = Animated.createAnimatedComponent(Image);
const GREN = require("../../assets/sinematik/gren.png");
const ABS = StyleSheet.absoluteFill;

// Anlatı uzunluğuna göre çekim süresi (okuma hızı ~16 harf/sn, en az 6,2 sn).
const sureOf = (c: Cekim) => (c.baslik ? 0 : Math.max(6200, 2200 + c.metin.length * 62));

function Kamera({ c, sure, W, H, reduced }: { c: Cekim; sure: number; W: number; H: number; reduced: boolean }) {
  let w = H * c.oran, h = H;
  if (w < W) { w = W; h = W / c.oran; }
  const left = Math.min(0, Math.max(W - w, W / 2 - c.odak * w));
  const p = useSharedValue(0);
  const { s, x, y } = c.kamera;
  useEffect(() => {
    if (!reduced) p.value = withTiming(1, { duration: (sure || 9000) + 1500, easing: Easing.inOut(Easing.sin) });
  }, [p, reduced, sure]);
  const st = useAnimatedStyle(() => {
    const k = p.value;
    return { transform: [{ translateX: x[0] + (x[1] - x[0]) * k }, { translateY: y[0] + (y[1] - y[0]) * k }, { scale: s[0] + (s[1] - s[0]) * k }] };
  });
  return <AnimImage source={c.gorsel} resizeMode="cover" style={[{ position: "absolute", left, top: (H - h) / 2, width: w, height: h }, reduced ? { transform: [{ scale: s[0] }] } : st]} />;
}

// Ocak/yangın ışığı: alttan turuncu, düzensiz titrer.
function AtesIsigi() {
  const o = useSharedValue(0.8);
  useEffect(() => {
    o.value = withRepeat(withSequence(
      withTiming(0.55, { duration: 170 }), withTiming(1, { duration: 260 }), withTiming(0.72, { duration: 130 }), withTiming(0.92, { duration: 320 }),
    ), -1, true);
  }, [o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View pointerEvents="none" style={[ABS, st]}>
      <LinearGradient colors={["rgba(255,120,30,0)", "rgba(255,105,25,0.10)", "rgba(255,90,20,0.30)"]} locations={[0.25, 0.6, 1]} style={ABS} />
    </Animated.View>
  );
}

// Sis/toz: iki yatay bant farklı hız ve yönde süzülür (sahte derinlik).
function Sis({ W, H, renk }: { W: number; H: number; renk: string }) {
  const a = useSharedValue(0), b = useSharedValue(0);
  useEffect(() => {
    a.value = withRepeat(withTiming(1, { duration: 16000, easing: Easing.inOut(Easing.sin) }), -1, true);
    b.value = withRepeat(withTiming(1, { duration: 23000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [a, b]);
  const sa = useAnimatedStyle(() => ({ transform: [{ translateX: -W * 0.35 + a.value * W * 0.5 }] }));
  const sb = useAnimatedStyle(() => ({ transform: [{ translateX: W * 0.1 - b.value * W * 0.45 }] }));
  const bant = (top: number, hh: number) => ({ position: "absolute" as const, top, left: -W * 0.3, width: W * 1.6, height: hh });
  return (
    <View pointerEvents="none" style={ABS}>
      <Animated.View style={[bant(H * 0.52, H * 0.26), sa]}>
        <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} colors={["transparent", renk, "transparent"]} style={ABS} />
      </Animated.View>
      <Animated.View style={[bant(H * 0.66, H * 0.22), { opacity: 0.8 }, sb]}>
        <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} colors={["transparent", renk, "transparent"]} style={ABS} />
      </Animated.View>
    </View>
  );
}

// Geçiş örtüsü: "kara" siyahtan açılır, "parla" köz rengi bir parlamayla söner.
function GecisOrtusu({ tur }: { tur: "kara" | "parla" }) {
  const sure = tur === "kara" ? 1700 : 900;
  const o = useSharedValue(tur === "kara" ? 1 : 0.85);
  const [acik, setAcik] = useState(true);
  useEffect(() => {
    o.value = withTiming(0, { duration: sure, easing: Easing.out(Easing.quad) });
    const id = setTimeout(() => setAcik(false), sure + 80); // sönünce ağaçtan çık
    return () => clearTimeout(id);
  }, [o, sure]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  if (!acik) return null;
  return <Animated.View pointerEvents="none" style={[ABS, { backgroundColor: tur === "kara" ? "#000" : "#FFD9A0" }, st]} />;
}

// Yer · yıl satırı daktilo gibi yazılır.
function Daktilo({ metin, top, rtl }: { metin: string; top: number; rtl: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const id = setInterval(() => setN((k) => (k >= metin.length ? k : k + 1)), 70);
    return () => clearInterval(id);
  }, [metin]);
  return (
    <View accessible accessibilityLabel={metin} style={{ position: "absolute", top, left: 22, right: 22, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
      <View style={{ width: 18, height: 1, backgroundColor: C.gold }} />
      <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 3, color: C.goldBright, textShadowColor: "#000", textShadowRadius: 6 }}>{metin.slice(0, n).toUpperCase()}</Text>
    </View>
  );
}

export function Sinematik({ cekimler, onDone }: { cekimler: Cekim[]; onDone: () => void }) {
  const { t, lang } = useI18n();
  const reduced = isReduceMotion();
  const rtl = lang === "ar";
  const { width: W, height: H } = useWindowDimensions();
  const ins = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const c = cekimler[i];
  const son = i === cekimler.length - 1;
  const sure = useMemo(() => sureOf(c), [c]);
  const bant = Math.round(H * 0.075);

  // Kendiliğinden akış; son kart dokunuş bekler.
  useEffect(() => {
    if (son) return;
    const id = setTimeout(() => setI((n) => Math.min(n + 1, cekimler.length - 1)), sure);
    return () => clearTimeout(id);
  }, [i, son, sure, cekimler.length]);
  // Perde müziği ve ortamı: aynı perdede yeniden başlamaz.
  useEffect(() => pushSoundscape(c.ses), [c.ses]);
  useEffect(() => {
    if (!c.efekt) return;
    const id = setTimeout(() => playEffect(c.efekt!), c.efektMs ?? 300);
    return () => clearTimeout(id);
  }, [c]);

  const ileri = () => { if (son) return; playTap(); setI(i + 1); };
  const bitir = () => { hap("success"); onDone(); };
  const kat = (k: string) => !reduced && !!c.katman?.includes(k as never);

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Animated.View key={c.id} entering={FadeIn.duration(reduced ? 400 : 1300)} exiting={FadeOut.duration(reduced ? 300 : 1300)} style={ABS}>
        <Kamera c={c} sure={sure} W={W} H={H} reduced={reduced} />
        {c.ton ? <View pointerEvents="none" style={[ABS, { backgroundColor: c.ton }]} /> : null}
        {kat("ates") ? <AtesIsigi /> : null}
        {kat("sis") ? <Sis W={W} H={H} renk="rgba(190,196,204,0.16)" /> : null}
        {kat("toz") ? <Sis W={W} H={H} renk="rgba(214,170,110,0.13)" /> : null}
      </Animated.View>
      {kat("kar") ? <Ambiance season="Kış" width={W} height={H} embers={false} count={12} /> : null}
      {kat("koz") ? <Ambiance width={W} height={H} flakes={false} count={10} /> : null}

      {/* Okunurluk: üst ve alt koyulaşma, vinyet hissi */}
      <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0.55)", "transparent"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: H * 0.28 }} />
      <LinearGradient pointerEvents="none" colors={["transparent", "rgba(0,0,0,0.82)"]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: H * 0.42 }} />
      <View pointerEvents="none" style={[ABS, { opacity: 0.07 }]}><Image source={GREN} resizeMode="repeat" style={ABS} /></View>
      {c.gecis === "kara" || c.gecis === "parla" ? <GecisOrtusu key={"g" + i} tur={c.gecis} /> : null}

      {/* Sinema bantları */}
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: bant + ins.top, backgroundColor: "#000" }} />
      <View pointerEvents="none" style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: bant + ins.bottom, backgroundColor: "#000" }} />

      {/* Dokunma yüzeyi: sonraki çekim */}
      <Pressable accessibilityRole="button" accessibilityLabel={t("new.tapNext")} onPress={ileri} style={ABS} />

      {c.ust ? <Daktilo key={"u" + i} metin={c.ust} top={bant + ins.top + 18} rtl={rtl} /> : null}

      {c.baslik ? (
        <View pointerEvents="box-none" style={{ position: "absolute", left: 24, right: 24, top: H * 0.3, alignItems: "center" }}>
          <Animated.Text entering={FadeIn.delay(400).duration(1600)} style={{ fontFamily: F.display, fontSize: 15, letterSpacing: 6, color: C.parchmentDim }}>KRONİKLER</Animated.Text>
          <Animated.View entering={FadeIn.delay(900).duration(1400)} style={{ width: 150, height: 1, backgroundColor: "rgba(201,168,76,0.6)", marginVertical: 14 }} />
          <Animated.Text entering={reduced ? FadeIn.delay(1200).duration(600) : FadeInUp.delay(1200).duration(1600)} style={{ fontFamily: F.display, fontSize: W < 360 ? 30 : 36, lineHeight: W < 360 ? 38 : 44, letterSpacing: 1.5, color: C.goldBright, textAlign: "center", textShadowColor: "rgba(255,150,40,0.45)", textShadowRadius: 18 }}>{t("sin.baslik").toLocaleUpperCase(lang === "tr" ? "tr-TR" : undefined)}</Animated.Text>
          <Animated.View entering={FadeIn.delay(2600).duration(900)} style={{ marginTop: H * 0.16 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={t("new.beginLife")} onPress={bitir} style={{ minHeight: 52, minWidth: 220, paddingHorizontal: 26, borderRadius: 6, borderWidth: 1, borderColor: C.gold, backgroundColor: "rgba(201,168,76,0.16)", alignItems: "center", justifyContent: "center" }}>
              <Pulse min={0.55} max={1} dur={1100}>
                <Text style={{ fontFamily: F.display, fontSize: 15, letterSpacing: 2, color: C.goldBright }}>{t("new.beginLife").toLocaleUpperCase(lang === "tr" ? "tr-TR" : undefined)}</Text>
              </Pulse>
            </Pressable>
          </Animated.View>
        </View>
      ) : (
        <Animated.Text key={"m" + i} pointerEvents="none" entering={reduced ? FadeIn.delay(300).duration(500) : FadeInUp.delay(700).duration(1100)} exiting={FadeOut.duration(400)}
          style={{ position: "absolute", left: 26, right: 26, bottom: bant + ins.bottom + 34, fontFamily: F.serif, fontSize: W < 360 ? 17 : 19, lineHeight: W < 360 ? 26 : 29, color: C.parchment, textAlign: "center", writingDirection: rtl ? "rtl" : "ltr", textShadowColor: "#000", textShadowRadius: 8 }}>
          {c.metin}
        </Animated.Text>
      )}

      {/* İlerleme: çekim bölmeleri, alt bandın içinde */}
      <View pointerEvents="none" style={{ position: "absolute", left: 22, right: 22, bottom: ins.bottom + bant / 2 - 1, flexDirection: rtl ? "row-reverse" : "row", gap: 4 }}>
        {cekimler.map((k, n) => (
          <View key={k.id} style={{ flex: 1, height: 2, borderRadius: 1, backgroundColor: n < i ? C.goldDim : n === i ? C.goldBright : "rgba(201,168,76,0.22)" }} />
        ))}
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel={t("new.skip")} onPress={onDone} hitSlop={8}
        style={{ position: "absolute", top: ins.top + Math.max(6, bant / 2 - 18), [rtl ? "left" : "right"]: 16, minHeight: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: "rgba(201,168,76,0.35)", backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1.5, color: C.parchmentDim }}>{t("new.skip").toLocaleUpperCase(lang === "tr" ? "tr-TR" : undefined)}</Text>
      </Pressable>
    </View>
  );
}
