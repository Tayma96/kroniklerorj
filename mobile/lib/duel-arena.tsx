// Dövüş arenası: Karagöz perdesi. Arkadan aydınlatılmış perde önünde iki renkli tasvir (oyuncu solda, rakip sağda).
// Motor (lib/combat.ts) değişmez; arena yalnız son turun sonucunu (log) canlandırır.
import { useEffect, useRef } from "react";
import { View, Text, Image, StyleSheet, useWindowDimensions } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay, withRepeat, cancelAnimation, Easing } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle, Ellipse, G } from "react-native-svg";
import type { BattleState, Move } from "./combat";
import { MOVES } from "./combat";
import { GameIcon } from "./icons";
import { useSadeMod } from "./use-sade-mod";
import { SAHNE_GORSEL } from "./sahne-tema";
import { C, F } from "./theme";

const FIG_W = 96, FIG_H = 150, ARM = 92;

// Tasvirin gövdesi (sağa bakar): sivri miğfer, kaftan, pelerin, bacaklar. Deri tasvir gibi renkli, koyu konturlu.
function Body({ fill, trim }: { fill: string; trim: string }) {
  const ink = "#1A0F08";
  return <Svg width={FIG_W} height={FIG_H} viewBox="0 0 100 160">
    <Path d="M44 62 Q26 92 28 132 L40 130 Q40 94 51 64 Z" fill={trim} stroke={ink} strokeWidth="1.4" opacity={0.92} />
    <Path d="M39 150 L45 104 L53 104 L48 150 Z" fill={fill} stroke={ink} strokeWidth="1.4" />
    <Path d="M57 150 L55 104 L63 104 L69 150 Z" fill={fill} stroke={ink} strokeWidth="1.4" />
    <Path d="M35 150 L50 150 L49 154 L33 154 Z M55 150 L71 150 L73 154 L56 154 Z" fill={ink} />
    <Path d="M36 108 Q33 72 44 58 L61 58 Q71 72 68 108 Z" fill={fill} stroke={ink} strokeWidth="1.6" />
    <Path d="M37 92 L67 92 L67 97 L37 97 Z" fill={trim} stroke={ink} strokeWidth="1" />
    <Circle cx="44" cy="76" r="1.6" fill={trim} /><Circle cx="52" cy="80" r="1.6" fill={trim} /><Circle cx="60" cy="76" r="1.6" fill={trim} />
    <Circle cx="53" cy="45" r="10" fill={fill} stroke={ink} strokeWidth="1.5" />
    <Path d="M41 44 Q53 16 65 44 Z" fill={trim} stroke={ink} strokeWidth="1.5" />
    <Path d="M53 19 L53 10" stroke={ink} strokeWidth="2" />
    <Circle cx="58" cy="45" r="1.4" fill={ink} />
  </Svg>;
}

// Kol + kılıç (omuz, kutunun ortasında; dönme omuz çevresinde olur). Savuştururken kalkan görünür.
function Arm({ fill, trim, shield }: { fill: string; trim: string; shield: boolean }) {
  const ink = "#1A0F08";
  return <Svg width={ARM} height={ARM} viewBox="0 0 100 100">
    <G>
      <Path d="M50 47 L72 54 L70 61 L49 55 Z" fill={fill} stroke={ink} strokeWidth="1.4" />
      <Path d="M70 52 L74 50 L76 66 L72 67 Z" fill={trim} stroke={ink} strokeWidth="1" />
      <Path d="M74 57 L99 30 L100 33 L77 60 Z" fill="#E9E2D0" stroke={ink} strokeWidth="1.2" />
    </G>
    {shield && <G>
      <Circle cx="66" cy="62" r="15" fill={trim} stroke={ink} strokeWidth="1.8" />
      <Circle cx="66" cy="62" r="5" fill={fill} stroke={ink} strokeWidth="1.2" />
    </G>}
  </Svg>;
}

type Exchange = { kind: "pHit" | "eHit" | "tie" | "recover"; block: boolean } | null;
function lastExchange(bs: BattleState): Exchange {
  for (let i = bs.log.length - 1; i >= 0; i--) {
    const k = bs.log[i].k;
    if (k === "cb.log.win") return { kind: "pHit", block: false };
    if (k === "cb.log.loseOpen") return { kind: "eHit", block: false };
    if (k === "cb.log.loseBlock") return { kind: "eHit", block: true };
    if (k === "cb.log.tie") return { kind: "tie", block: false };
    if (k === "war.log.recover") return { kind: "recover", block: false };
    if (k === "cb.log.start" || k === "cb.log.volley") return null;
  }
  return null;
}

function Bar({ value, max, color, height = 6 }: { value: number; max: number; color: string; height?: number }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return <View style={{ height, borderRadius: height / 2, backgroundColor: "rgba(26,15,8,0.55)", overflow: "hidden", borderWidth: 1, borderColor: "rgba(26,15,8,0.8)" }}>
    <View style={{ width: `${pct}%`, height: "100%", backgroundColor: color }} />
  </View>;
}

export function DuelArena({ bs, youLabel, intentLabel, breathLabel, moveLabel, desperateLabel }: { bs: BattleState; youLabel: string; intentLabel: string; breathLabel: string; moveLabel: (m: Move) => string; desperateLabel: string }) {
  const reduced = useSadeMod();
  const { width } = useWindowDimensions();
  const W = Math.min(width - 24, 460), H = 236;
  const gap = W * 0.16; // figürlerin kenara uzaklığı
  const pX = useSharedValue(0), eX = useSharedValue(0), pArm = useSharedValue(-25), eArm = useSharedValue(-25);
  const pFlash = useSharedValue(0), eFlash = useSharedValue(0), spark = useSharedValue(0), bob = useSharedValue(0);
  const pFall = useSharedValue(0), eFall = useSharedValue(0);
  const lastRound = useRef(bs.round);
  const block = useRef(false);

  useEffect(() => {
    if (reduced) return;
    bob.value = withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) })), -1, false);
    return () => cancelAnimation(bob);
  }, [reduced]);

  useEffect(() => {
    if (bs.round === lastRound.current) return;
    lastRound.current = bs.round;
    const ex = lastExchange(bs);
    if (!ex || reduced) return;
    block.current = ex.block;
    const lunge = gap * 0.9;
    const strike = (x: typeof pX, arm: typeof pArm, dir: 1 | -1) => {
      x.value = withSequence(withTiming(dir * lunge, { duration: 170, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 280 }));
      arm.value = withSequence(withTiming(70, { duration: 170 }), withTiming(-25, { duration: 300 }));
    };
    const reel = (x: typeof pX, flash: typeof pFlash, dir: 1 | -1) => {
      x.value = withSequence(withDelay(150, withTiming(dir * 16, { duration: 80 })), withTiming(0, { duration: 220 }));
      flash.value = withSequence(withDelay(150, withTiming(1, { duration: 60 })), withTiming(0, { duration: 280 }));
    };
    if (ex.kind === "pHit") { strike(pX, pArm, 1); reel(eX, eFlash, 1); }
    else if (ex.kind === "eHit") { strike(eX, eArm, -1); if (!ex.block) reel(pX, pFlash, -1); else pArm.value = withSequence(withTiming(-60, { duration: 150 }), withTiming(-25, { duration: 320 })); }
    else if (ex.kind === "tie") { strike(pX, pArm, 1); strike(eX, eArm, -1); }
    else { pX.value = withSequence(withTiming(-18, { duration: 200 }), withTiming(0, { duration: 400 })); strike(eX, eArm, -1); reel(pX, pFlash, -1); }
    spark.value = withSequence(withDelay(140, withTiming(1, { duration: 70 })), withTiming(0, { duration: 300 }));
  }, [bs.round]);

  useEffect(() => {
    if (!bs.over) { pFall.value = 0; eFall.value = 0; return; }
    const fall = (v: typeof pFall) => { v.value = reduced ? 1 : withDelay(380, withTiming(1, { duration: 520, easing: Easing.in(Easing.quad) })); };
    fall(bs.won ? eFall : pFall);
  }, [bs.over, bs.won]);

  const pStyle = useAnimatedStyle(() => ({ transform: [{ translateX: pX.value }, { translateY: bob.value * -2 + pFall.value * 30 }, { rotate: `${-pFall.value * 78}deg` }], opacity: 1 - pFall.value * 0.35 }));
  const eStyle = useAnimatedStyle(() => ({ transform: [{ translateX: eX.value }, { translateY: (1 - bob.value) * -2 + eFall.value * 30 }, { rotate: `${eFall.value * 78}deg` }], opacity: 1 - eFall.value * 0.35 }));
  const pArmStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${pArm.value}deg` }] }));
  const eArmStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${eArm.value}deg` }] }));
  const pFlashStyle = useAnimatedStyle(() => ({ opacity: pFlash.value * 0.55 }));
  const eFlashStyle = useAnimatedStyle(() => ({ opacity: eFlash.value * 0.55 }));
  const sparkStyle = useAnimatedStyle(() => ({ opacity: spark.value, transform: [{ scale: 0.5 + spark.value * 0.9 }] }));

  const PL = { fill: "#2F6A63", trim: "#D9A441" }, EN = { fill: "#8A2E24", trim: "#E2B65A" };
  const intent = MOVES.find((m) => m.id === bs.enemyIntent);
  const showShield = bs.lastMove === "savustur";
  const figTop = H - FIG_H - 18;
  const Figure = ({ side }: { side: "p" | "e" }) => {
    const c = side === "p" ? PL : EN;
    return <View style={{ width: FIG_W, height: FIG_H }}>
      <Body fill={c.fill} trim={c.trim} />
      <Animated.View style={[{ position: "absolute", left: 56 - ARM / 2, top: 58 - ARM / 2 }, side === "p" ? pArmStyle : eArmStyle]}>
        <Arm fill={c.fill} trim={c.trim} shield={side === "p" ? showShield : false} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#FF4A2A", borderRadius: 30 }, side === "p" ? pFlashStyle : eFlashStyle]} />
    </View>;
  };

  return <View style={{ width: W, height: H, alignSelf: "center", borderRadius: 10, overflow: "hidden", borderWidth: 3, borderColor: "#5A3A1C" }}>
    {/* Perde: arkadan vuran kandil ışığı, uzakta soluk sahne */}
    <LinearGradient colors={["#F6DFA8", "#E9C47E", "#B9853F"]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
    <Image accessible={false} source={SAHNE_GORSEL.gurbet_yol} resizeMode="cover" style={[StyleSheet.absoluteFill, { opacity: 0.16 }]} />
    <LinearGradient pointerEvents="none" start={{ x: 0.5, y: 0.35 }} end={{ x: 0.5, y: 1 }} colors={["rgba(90,50,20,0)", "rgba(90,50,20,0.45)"]} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderWidth: 6, borderColor: "rgba(60,35,15,0.25)", borderRadius: 6 }]} />
    {/* Zemin gölgeleri */}
    <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
      <Ellipse cx={gap + FIG_W / 2} cy={H - 16} rx={34} ry={6} fill="rgba(40,22,8,0.35)" />
      <Ellipse cx={W - gap - FIG_W / 2} cy={H - 16} rx={34} ry={6} fill="rgba(40,22,8,0.35)" />
    </Svg>

    {/* Üst bilgiler: sende can+nefes+üstünlük, rakipte can+niyet */}
    <View style={{ position: "absolute", top: 8, left: 10, width: W * 0.42 }}>
      <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 12, color: "#2A170A" }}>{youLabel} · {Math.max(0, Math.round(bs.playerHp))}</Text>
      <Bar value={bs.playerHp} max={bs.playerMax} color="#3F8E58" />
      <View style={{ height: 4 }} />
      <Bar value={bs.breath ?? 100} max={bs.breathMax ?? 100} color="#4E7FA6" height={4} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
        <Text style={{ fontFamily: F.serif, fontSize: 11, color: "#3B230E" }}>{breathLabel}</Text>
        {[0, 1, 2].map((i) => <View key={i} style={{ width: 8, height: 8, transform: [{ rotate: "45deg" }], borderWidth: 1, borderColor: "#3B230E", backgroundColor: i < (bs.momentum || 0) ? "#B8341F" : "transparent" }} />)}
      </View>
    </View>
    <View style={{ position: "absolute", top: 8, right: 10, width: W * 0.42, alignItems: "flex-end" }}>
      <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 12, color: "#2A170A" }}>{bs.enemyName} · {Math.max(0, Math.round(bs.enemyHp))}</Text>
      <View style={{ alignSelf: "stretch" }}><Bar value={bs.enemyHp} max={bs.enemyMax} color="#B8341F" /></View>
    </View>

    {/* Rakibin niyeti: başının üstünde */}
    {!bs.over && intent && <View style={{ position: "absolute", top: figTop - 30, right: gap - 6, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: "rgba(26,15,8,0.82)", borderWidth: 1, borderColor: bs.desperate ? "#E05A30" : "#C9A24E" }}>
      <GameIcon name={bs.desperate ? "flame" : intent.icon} size={14} color={bs.desperate ? "#FF9C6A" : "#F3D27A"} />
      <Text style={{ fontFamily: F.serif, fontSize: 12, color: "#F6EAD0" }}>{bs.desperate ? desperateLabel : `${intentLabel} ${moveLabel(intent.id)}`}</Text>
    </View>}

    {/* Figürler */}
    <Animated.View style={[{ position: "absolute", left: gap, top: figTop }, pStyle]}><Figure side="p" /></Animated.View>
    <Animated.View style={[{ position: "absolute", right: gap, top: figTop }, eStyle]}>
      <View style={{ transform: [{ scaleX: -1 }] }}><Figure side="e" /></View>
    </Animated.View>

    {/* Kıvılcım: çarpışma noktası */}
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: W / 2 - 22, top: figTop + 30, width: 44, height: 44 }, sparkStyle]}>
      <Svg width={44} height={44} viewBox="0 0 44 44">
        <Path d="M22 0 L25 17 L44 22 L25 27 L22 44 L19 27 L0 22 L19 17 Z" fill="#FFF3B0" stroke="#E07A1F" strokeWidth="1.2" />
      </Svg>
    </Animated.View>
  </View>;
}
