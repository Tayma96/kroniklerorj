import { Tabs, useRouter, usePathname } from "expo-router";
import { View, Pressable, Text, useWindowDimensions } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Rect, Polygon, Circle } from "react-native-svg";
import { useEffect, useState } from "react";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing, cancelAnimation } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { useI18n } from "../../lib/i18n";
import { useGame } from "../../lib/store";
import { useMp } from "../../lib/mp/store";
import { mePublic } from "../../lib/mp/world";
import { CountdownSecs } from "../../lib/mp/countdown";
import { pendingMonthScene, advanceWithMonthScene } from "../../lib/month-scene";
import { oturumEkran } from "../../lib/oturum";
import { openHomeSheet } from "../../lib/home-hud";

const pf = (s: string, ...a: (string | number)[]) => a.reduce<string>((acc, v, i) => acc.replace("%" + (i + 1), String(v)), s);
import { StatDeltaOverlay } from "../../lib/feel";
import { Ambiance } from "../../lib/fx";
import { hap } from "../../lib/haptics";
import { useSadeMod } from "../../lib/use-sade-mod";
import { playAdvance } from "../../lib/sound";

// Sekme simgesi: küçük madalyon. Seçili sekmede altın halka ve parlak ikon; diğerlerinde soluk bronz.
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: focused ? 2 : 1.5, borderColor: focused ? C.goldBright : "#6B5130", backgroundColor: focused ? "#2E2112" : "#16100A", shadowColor: C.gold, shadowOpacity: focused ? 0.55 : 0, shadowRadius: 8, elevation: focused ? 6 : 0 }}>
    <GameIcon name={name} size={20} color={focused ? C.goldBright : "#B39B72"} />
  </View>;
}

// Menü zemini: koyu ahşap üstünde bronz kenar; düz web çubuğu yerine işlenmiş bir tezgâh hissi.
function TabBackground() {
  return <View style={{ flex: 1 }}>
    <LinearGradient colors={["#3A2916", "#21170C", "#130D07"]} locations={[0, 0.45, 1]} style={{ flex: 1 }} />
    <LinearGradient pointerEvents="none" start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={["#6B4F2A", "#F3D27A", "#6B4F2A"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2 }} />
    <View pointerEvents="none" style={{ position: "absolute", top: 4, left: 8, right: 8, height: 1, backgroundColor: "rgba(243,210,122,0.18)" }} />
  </View>;
}

// Pusula yıldızı: dört uzun, dört kısa uç; açık/koyu yüzlerle kabartma hissi.
function CompassStar({ size }: { size: number }) {
  const pt = (deg: number, r: number) => { const a = (deg - 90) * Math.PI / 180; return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`; };
  const half = (deg: number, r: number, side: 1 | -1) => [pt(deg, r), pt(deg + side * 45, 8), "50,50"].join(" ");
  return <Svg width={size} height={size} viewBox="0 0 100 100">
    <Circle cx="50" cy="50" r="30" fill="none" stroke="#5A3A10" strokeWidth="1.5" opacity={0.55} />
    {[45, 135, 225, 315].map((d) => <Polygon key={"s" + d} points={half(d, 30, 1)} fill="#6B4613" />)}
    {[45, 135, 225, 315].map((d) => <Polygon key={"t" + d} points={half(d, 30, -1)} fill="#9A6A22" />)}
    {[0, 90, 180, 270].map((d) => <Polygon key={"l" + d} points={half(d, 46, 1)} fill="#3B2507" />)}
    {[0, 90, 180, 270].map((d) => <Polygon key={"r" + d} points={half(d, 46, -1)} fill="#FFF0BE" />)}
    <Circle cx="50" cy="50" r="5" fill="#FFE9A8" stroke="#3B2507" strokeWidth="1.5" />
  </Svg>;
}

// Nav ortasında yükseltilmiş yuvarlak "Ayı İlerle" düğmesi (Karakter ↔ İlişkiler arası).
function AdvanceFab({ bottom }: { bottom: number }) {
  const { state, doAdvance, mpMode, apply } = useGame();
  const router = useRouter();
  const { snapshot, guestId, setReady, syncPlayer } = useMp();
  const { t } = useI18n();
  const reduced = useSadeMod();
  const narrow = useWindowDimensions().width < 360;
  const [readyOpt, setReadyOpt] = useState<boolean | null>(null);
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = 1;
    if (reduced) return;
    pulse.value = withRepeat(withSequence(
      withTiming(1.06, { duration: 1050, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 1050, easing: Easing.inOut(Easing.quad) }),
    ), -1, false);
    return () => cancelAnimation(pulse);
  }, [reduced]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  // ── ÇOK OYUNCU: "Ayı İlerlet" tek başına değil çoğunluk-hazır oyu; sunucu tick'i herkesi birlikte ilerletir ──
  if (mpMode) {
    if (!state || !snapshot) return null;
    const players = snapshot.players;
    const liveCount = players.filter((x) => x.online && !x.dead).length;
    const readyCount = players.filter((x) => x.online && !x.dead && x.ready).length;
    const meReady = !!players.find((x) => x.id === guestId)?.ready;
    const ready = readyOpt !== null ? readyOpt : meReady;
    const ticking = snapshot.phase === "ticking";
    const dead = state.player.dead;
    const doReady = () => {
      if (dead) return; hap("advance"); playAdvance();
      const v = !ready; setReadyOpt(v); setReady(v);
      if (guestId) syncPlayer(mePublic(guestId, state, v));
    };
    return (
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: bottom + 16, alignItems: "center" }}>
        <Pressable disabled={dead} accessibilityRole="button" accessibilityLabel={t("mp.ready")} onPress={doReady} style={{
          minWidth: 100, paddingVertical: 13, paddingHorizontal: 22, borderRadius: 26, alignItems: "center",
          borderWidth: 3, borderColor: "rgba(13,10,6,0.98)",
          backgroundColor: ready ? "rgba(127,166,106,0.92)" : C.gold, opacity: dead ? 0.4 : 1,
          shadowColor: "#000", shadowOpacity: 0.45, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 9,
        }}>
          <Text style={{ fontFamily: F.display, fontSize: 12.5, letterSpacing: 1, color: ready ? "#0d0a06" : C.inkOnGold }}>
            {ticking ? t("mp.ticking") : ready ? `✓ ${readyCount}/${liveCount}` : `${t("mp.ready")} ${readyCount}/${liveCount}`}
          </Text>
        </Pressable>
        {!ticking && !!snapshot.tickDeadline && (
          <CountdownSecs deadline={snapshot.tickDeadline} fmt={(sc) => pf(t("mp.tickIn"), sc)} style={{ fontFamily: F.display, fontSize: 8, letterSpacing: 1, color: C.goldDim, marginTop: 3 }} />
        )}
      </View>
    );
  }
  if (!state || state.player.dead) return null;
  const waiting = !!pendingMonthScene(state);
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: bottom + 16, alignItems: "center" }}>
      <View style={{ width: 100, minHeight: 104, alignItems: "center", justifyContent: "flex-end" }}>
        {/* Hero'dan taşınan altın toz — düğmeden yükselir */}
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
          <Ambiance width={100} height={92} flakes={false} count={6} />
        </View>
        <Animated.View style={style}>
          <Pressable
            accessibilityRole="button" accessibilityLabel={t("a11y.advance")} accessibilityHint={t(waiting ? "flow.pendingHint" : "adv.ffHint")}
            onPress={() => { if (waiting) { hap("tap"); router.push("/oyun"); openHomeSheet("karar"); return; } hap("advance"); playAdvance(); doAdvance(1); }}
            onLongPress={() => { if (waiting) { hap("tap"); router.push("/oyun"); openHomeSheet("karar"); return; } hap("success"); playAdvance(); apply((s) => advanceWithMonthScene(s, 6, true)); }}
            delayLongPress={420}
            style={{
              width: 70, height: 70, borderRadius: 35, backgroundColor: "#0E0A06",
              alignItems: "center", justifyContent: "center", padding: 3,
              borderWidth: 1.5, borderColor: C.goldDim,
              shadowColor: C.gold, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 10,
            }}
          >
            <View style={{ width: 61, height: 61, borderRadius: 31, overflow: "hidden", borderWidth: 2, borderColor: "#F3D27A", alignItems: "center", justifyContent: "center" }}>
              <Svg width={61} height={61} style={{ position: "absolute" }}>
                <Defs>
                  <RadialGradient id="fabGold" cx="42%" cy="36%" r="70%">
                    <Stop offset="0" stopColor="#FCE7A6" />
                    <Stop offset="0.55" stopColor="#D9A944" />
                    <Stop offset="1" stopColor="#8E6220" />
                  </RadialGradient>
                </Defs>
                <Rect x="0" y="0" width="61" height="61" fill="url(#fabGold)" />
              </Svg>
              <View><CompassStar size={50} /></View>
            </View>
          </Pressable>
        </Animated.View>
        {/* Çekirdek eylem ikon-only kalmasın: mikro etiket (a11y metniyle aynı anahtar) */}
        {/* Uzun dillerde (AVANZAR EL MES) etiket yandaki sekme simgelerine taşmasın: düğme sütununa sığdırılır */}
        <Text numberOfLines={2} style={{ width: narrow ? 80 : 100, textAlign: "center", fontFamily: F.display, fontSize: narrow ? 10 : 12, lineHeight: narrow ? 13 : 16, color: C.gold, marginTop: 3 }}>{t(waiting ? "flow.pending" : "adv.kisa")}</Text>

      </View>
    </View>
  );
}

// Pusula yuvası: menünün ortasında, düğmenin oturduğu bronz çerçeveli çukur.
function NavOrnament({ bottom }: { bottom: number }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: bottom - 34, height: 46, alignItems: "center" }}>
      <View style={{ width: 92, height: 92, borderRadius: 46, overflow: "hidden", borderWidth: 2, borderColor: "#8A6A3A" }}>
        <LinearGradient colors={["#3A2916", "#21170C"]} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

// Tüm ekranların üstüne biner: tepede sıcak ışık huzmesi + kenarlarda vinyet.
// Siyah zemine derinlik katar; dokunuşları geçirir (pointerEvents none).
function GlobalBackdrop({ bottom }: { bottom: number }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom }}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="bgGlow" cx="50%" cy="13%" rx="78%" ry="55%">
            <Stop offset="0" stopColor={C.emberSoft} stopOpacity={0.10} />
            <Stop offset="0.5" stopColor={C.gold} stopOpacity={0.03} />
            <Stop offset="1" stopColor={C.bg} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="bgVignette" cx="50%" cy="40%" rx="76%" ry="64%">
            <Stop offset="0.55" stopColor="#000000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0.34} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bgGlow)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bgVignette)" />
      </Svg>
    </View>
  );
}

export default function OyunLayout() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { mpMode, exitMp, state } = useGame();
  const { leave } = useMp();
  const router = useRouter();
  const yol = usePathname();
  const { width } = useWindowDimensions();
  const tabWidth = Math.max(44, (width - 84) / 4);
  useEffect(() => { const ad = yol.replace(/^\/oyun\/?/, "").split("/")[0] || "index"; oturumEkran(ad); }, [yol]); // cihazda kalan oturum kaydı
  return (
    <View style={{ flex: 1 }}>
      <Tabs screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#1B130A", borderTopWidth: 0, height: 80 + insets.bottom, paddingBottom: insets.bottom + 6, paddingTop: 8, shadowColor: "#000", shadowOpacity: 0.6, shadowRadius: 10, shadowOffset: { width: 0, height: -4 }, elevation: 16 },
        tabBarBackground: () => <TabBackground />,
        tabBarActiveTintColor: C.goldBright,
        tabBarInactiveTintColor: "#B39B72",
        tabBarItemStyle: { flexGrow: 0, flexShrink: 0, width: tabWidth },
        tabBarLabel: ({ color, children }) => <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: width < 360 ? 9.5 : 12, lineHeight: width < 360 ? 12 : 16, color, textAlign: "center", paddingHorizontal: 1 }}>{children}</Text>,
      }}>
        <Tabs.Screen name="index" options={{ title: t("tab.home"), tabBarIcon: ({ focused }) => <TabIcon name="ana" focused={focused} /> }} />
        <Tabs.Screen name="karakter" options={{ title: t("tab.character"), tabBarItemStyle: { flexGrow: 0, flexShrink: 0, width: tabWidth, marginRight: 84 }, tabBarIcon: ({ focused }) => <TabIcon name="karakter" focused={focused} /> }} />
        <Tabs.Screen name="iliskiler" options={{ title: t("tab.relations"), tabBarIcon: ({ focused }) => <TabIcon name="iliskiler" focused={focused} /> }} />
        <Tabs.Screen name="menu" options={{ title: t("tab.menu"), tabBarIcon: ({ focused }) => <TabIcon name="menu" focused={focused} /> }} />
        {/* Gizli (sekmede görünmez ama navigasyonla açılır) */}
        <Tabs.Screen name="pazar" options={{ href: null }} />
        <Tabs.Screen name="sss" options={{ href: null }} />
        <Tabs.Screen name="emek" options={{ href: null }} />
        <Tabs.Screen name="sehir" options={{ href: null }} />
        <Tabs.Screen name="meslek" options={{ href: null }} />
        <Tabs.Screen name="suc" options={{ href: null }} />
        <Tabs.Screen name="mektep" options={{ href: null }} />
        <Tabs.Screen name="mulkler" options={{ href: null }} />
        <Tabs.Screen name="orgutler" options={{ href: null }} />
        <Tabs.Screen name="sosyal" options={{ href: null }} />
        <Tabs.Screen name="savas" options={{ href: null }} />
        <Tabs.Screen name="haberler" options={{ href: null }} />
        <Tabs.Screen name="hanedan" options={{ href: null }} />
        <Tabs.Screen name="diplomasi" options={{ href: null }} />
        <Tabs.Screen name="basarimlar" options={{ href: null }} />
        <Tabs.Screen name="beceriler" options={{ href: null }} />
        <Tabs.Screen name="hikayeler" options={{ href: null }} />
        <Tabs.Screen name="nesil" options={{ href: null }} />
        <Tabs.Screen name="atolye" options={{ href: null }} />
        <Tabs.Screen name="diyar/[name]" options={{ href: null }} />
        <Tabs.Screen name="harita" options={{ href: null }} />
        <Tabs.Screen name="gorevler" options={{ href: null }} />
        <Tabs.Screen name="tarih" options={{ href: null }} />
        <Tabs.Screen name="ayarlar" options={{ href: null }} />
        <Tabs.Screen name="roman" options={{ href: null }} />
        <Tabs.Screen name="kronik" options={{ href: null }} />
        <Tabs.Screen name="divan" options={{ href: null }} />
        <Tabs.Screen name="ocak" options={{ href: null }} />
        <Tabs.Screen name="npc/[id]" options={{ href: null }} />
        <Tabs.Screen name="copcatan" options={{ href: null }} />
        <Tabs.Screen name="mahalle" options={{ href: null }} />
      </Tabs>
      <GlobalBackdrop bottom={80 + insets.bottom} />
      {(mpMode || (state && !state.player.dead)) && <NavOrnament bottom={80 + insets.bottom} />}
      <AdvanceFab bottom={insets.bottom} />
      <StatDeltaOverlay />
      {/* MP'deyken kişisel ekranlar SP kabuğunda açılır — oyuncu diyardan koptuğunu sanmasın: dönüş şeridi hep üstte (test bulgusu) */}
      {mpMode && (
        <Pressable onPress={() => { hap("tap"); leave(); exitMp(); router.replace("/cok-oyunculu"); }} style={{ position: "absolute", top: insets.top + 4, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 5, paddingHorizontal: 13, borderRadius: 14, borderWidth: 1, borderColor: "rgba(111,160,192,0.65)", backgroundColor: "rgba(8,14,20,0.92)" }}>
          <GameIcon name="banner" size={11} color={C.frost} />
          <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 1.2, color: C.frost }}>{t("mp.leaveRealm").toUpperCase()}</Text>
        </Pressable>
      )}
    </View>
  );
}
