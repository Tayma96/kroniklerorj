import { View, Image, ImageBackground, Modal, Text, Pressable, TextInput, ViewStyle, StyleProp, TextStyle, Share, ScrollView } from "react-native";
import { useEffect, useState, useRef } from "react";
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedProps, useDerivedValue, withTiming, withSpring, withRepeat, withSequence, cancelAnimation, ZoomIn, FadeIn, FadeInUp, FadeInDown } from "react-native-reanimated";
import { portreImage } from "./assets";
import { npcPortreFrame } from "./npc-portre";
import { GameIcon } from "./icons";
import { useI18n } from "./i18n";
import { hap, Hap } from "./haptics";
import { DUR, EASE } from "./motion";
import { useSadeMod } from "./use-sade-mod";
import type { Dilemma, Choice } from "./events";
import type { Opportunity } from "./game";
import { ParticleBurst } from "./fx";
import { GlowPulse } from "./skia";
import { C, F } from "./theme";
import { KaderKartiModal, FirsatKartiModal } from "./kart3d";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname } from "expo-router";
import { screenArt, screenDesign } from "./screen-design";
import { OrnatePanel } from "./ornament-ui";

// Değişince yumuşakça sayan (count-up/down) sayı — UI thread'de, re-render yok.
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
export function AnimatedNumber({ value, style }: { value: number; style?: StyleProp<TextStyle> }) {
  const sv = useSharedValue(value);
  useEffect(() => { sv.value = withTiming(value, { duration: 450, easing: EASE.decel }); }, [value]);
  const rounded = useDerivedValue(() => String(Math.round(sv.value)));
  const props = useAnimatedProps(() => ({ text: rounded.value, defaultValue: String(Math.round(value)) } as any));
  return (
    <AnimatedTextInput
      editable={false}
      underlineColorAndroid="transparent"
      animatedProps={props}
      style={[{ padding: 0, margin: 0 }, style]}
    />
  );
}

// Lokalize geri-butonu etiketi (tüm ekranlarda ortak).
export function BackLabel() {
  const { t } = useI18n();
  return <Text style={{ color: C.gold, fontFamily: F.display, fontSize: 13, lineHeight: 22 }}>{t("common.back")}</Text>;
}

// Basınca hafifçe küçülen, yaylanarak dönen buton — ortak "his" bileşeni.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function PressableScale({ children, onPress, style, disabled, haptic, accessibilityLabel, accessibilityHint }: {
  children: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; disabled?: boolean; haptic?: Hap;
  accessibilityLabel?: string; accessibilityHint?: string;
}) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPressIn={() => { s.value = withTiming(0.96, { duration: DUR.fast, easing: EASE.standard }); }}
      onPressOut={() => { s.value = withSpring(1, { damping: 14, stiffness: 220 }); }}
      onPress={() => { if (disabled) return; if (haptic) hap(haptic); onPress?.(); }}
      style={[style, anim]}
    >
      {children}
    </AnimatedPressable>
  );
}

export function Portre({ age, gender, size = 44, ring = true, seed }: { age: number; gender: "erkek" | "kadın"; size?: number; ring?: boolean; seed?: string | number }) {
  const reduced = useSadeMod();
  const breathe = size >= 56 && !reduced;
  const sc = useSharedValue(1);
  useEffect(() => {
    sc.value = 1;
    if (!breathe) return;
    sc.value = withRepeat(withSequence(
      withTiming(1.04, { duration: 2200, easing: EASE.standard }),
      withTiming(1, { duration: 2200, easing: EASE.standard }),
    ), -1, false);
    return () => cancelAnimation(sc);
  }, [breathe]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: breathe ? sc.value : 1 }] }));
  const frame = npcPortreFrame(age, gender, seed);
  const borderWidth = ring ? 2 : 1;
  const contentSize = Math.max(1, size - borderWidth * 2);
  const atlas = frame != null && frame.columns > 1;
  return (
    <View accessible={false} style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", borderWidth, borderColor: ring ? C.gold : C.borderHi, backgroundColor: C.cardHi }}>
      {/* Önce tek hücre kesilir; nefes hareketi komşu yüzü kadraja sokamaz. */}
      <Animated.View style={[{ width: contentSize, height: contentSize, overflow: "hidden" }, st]}>
        <Image accessible={false} source={frame?.source ?? portreImage(age, gender)}
          style={atlas ? { position: "absolute", width: contentSize * frame.columns, height: contentSize * frame.rows, left: -contentSize * frame.column, top: -contentSize * frame.row } : { width: "100%", height: "100%" }}
          resizeMode={atlas ? "stretch" : "cover"} />
      </Animated.View>
    </View>
  );
}

// Dönüm noktası anı — sahne perdesi (kül & köz dokusu).
const MILESTONE_LABEL: Record<string, { tag: string; icon: string }> = {
  meslek_edinme: { tag: "Reşit Oldun", icon: "anvil" },
  evlilik: { tag: "Yeni Bir Ocak", icon: "ring" },
  doğum: { tag: "Soyun Sürüyor", icon: "baby" },
  mülk_alım: { tag: "Adına Bir Tapu", icon: "castle" },
  örgüt_katılım: { tag: "Saflara Katıldın", icon: "crown" },
  savaş_zafer: { tag: "Zafer", icon: "crossed-swords" },
  görev_tamamlandı: { tag: "Görev Tamam", icon: "medal" },
  meslek_değişimi: { tag: "Yeni Bir Yol", icon: "compass" },
  ölüm: { tag: "Hayatın Sonu", icon: "tombstone" },
  nesil_devri: { tag: "Yeni Nesil", icon: "banner" },
  lakap: { tag: "Yeni Bir Lakap", icon: "crown" },
  sinav: { tag: "Lonca Çağırıyor", icon: "scroll-open" },
  pestamal: { tag: "Peştamal Kuşandın", icon: "medal" },
  terfi: { tag: "Mesleğin Zirvesi", icon: "crown" },
  rakip: { tag: "Çarşıda Rakip", icon: "banner" },
  cirak: { tag: "Peştamal Töreni", icon: "graduate-cap" },
  pabuc: { tag: "Pabucun Dama Atıldı", icon: "boot" },
};

const MS_ACCENT: Record<string, string> = {
  doğum: C.ink, dogum: C.ink, evlilik: C.rose, kariyer_terfi: C.gold, başarım: C.gold,
  tahta_çıkış: C.gold, şehir_kuruluşu: C.gold, savaş_zaferi: C.ember, komutan_savaşı: C.ember,
  ölüm: C.parchmentMuted, nesil_devri: C.ink, lakap: C.goldBright, sinav: C.gold, pestamal: C.goldBright, terfi: C.goldBright, rakip: C.ember, cirak: C.goldBright, pabuc: C.blood,
};
// Yayılan parlama halkası (kutlama hissi).
function Burst({ color }: { color: string }) {
  const s = useSharedValue(0.4); const o = useSharedValue(0);
  useEffect(() => {
    s.value = withRepeat(withTiming(2.0, { duration: 1500, easing: EASE.decel }), 2, false);
    o.value = withRepeat(withSequence(withTiming(0.55, { duration: 140 }), withTiming(0, { duration: 1360 })), 2, false);
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: o.value }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: color }, st]} />;
}

// İkonun nazikçe nabız atması.
function IconPulse({ icon, color }: { icon: string; color: string }) {
  const s = useSharedValue(0.4);
  useEffect(() => { s.value = withSequence(withSpring(1.15, { damping: 6, stiffness: 140 }), withSpring(1, { damping: 10 })); }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return <Animated.View style={st}><GameIcon name={icon} size={42} color={color} /></Animated.View>;
}

export function MilestoneModal({ visible, type, text, onClose }: { visible: boolean; type: string; text: string; onClose: () => void }) {
  const meta = MILESTONE_LABEL[type] || { tag: "Dönüm Noktası", icon: "star" };
  const { t } = useI18n();
  const msTag = (() => { const k = "ms." + type; const v = t(k); return v !== k ? v : t("ms.genel"); })(); // her tip 6 dilde; bilinmeyen tip genel "dönüm noktası"na düşer (Türkçe etiket sızmaz)
  const accent = MS_ACCENT[type] || C.gold;
  const celebratory = type !== "ölüm" && type !== "pabuc"; // utanç anı kutlanmaz
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(6,4,2,0.9)", alignItems: "center", justifyContent: "center", padding: 28 }}>
        <Animated.View entering={ZoomIn.springify().damping(15).stiffness(180)} style={{ width: "100%", maxWidth: 360, backgroundColor: C.card, borderWidth: 1, borderColor: accent + "88", borderRadius: 14, padding: 24, alignItems: "center", overflow: "hidden" }}>
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, backgroundColor: accent }} />
          {celebratory && <ParticleBurst count={18} top={40} />}
          <View style={{ width: 80, height: 80, alignItems: "center", justifyContent: "center", marginTop: 6 }}>
            {celebratory && <GlowPulse size={80} color={accent} />}
            {celebratory && <Burst color={accent} />}
            <IconPulse icon={meta.icon} color={accent} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
            <View style={{ height: 1, width: 24, backgroundColor: accent + "88" }} />
            <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 3, color: accent, textTransform: "uppercase" }}>{msTag}</Text>
            <View style={{ height: 1, width: 24, backgroundColor: accent + "88" }} />
          </View>
          <Text style={{ fontFamily: F.serif, fontSize: 16, color: C.parchment, textAlign: "center", lineHeight: 24, marginTop: 14 }}>{text}</Text>
          <Pressable onPress={onClose} style={{ marginTop: 22, paddingVertical: 11, paddingHorizontal: 28, borderRadius: 9, borderWidth: 1.5, borderColor: accent + "99", backgroundColor: accent }}>
            <Text style={{ fontFamily: F.display, fontSize: 12, color: C.inkOnGold, letterSpacing: 1.5 }}>{t("common.continue")}</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// Başarım açılış bildirimi (küçük, üstten).
export function AchievementToast({ name, icon, onClose }: { name: string | null; icon: string; onClose: () => void }) {
  return (
    <Modal visible={!!name} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, justifyContent: "flex-start", paddingTop: 90, alignItems: "center" }}>
        <Animated.View entering={FadeInDown.springify().damping(16)} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(201,168,76,0.6)", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18, maxWidth: 340 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(201,168,76,0.14)", borderWidth: 1, borderColor: "rgba(201,168,76,0.5)" }}>
            <GameIcon name={icon} size={20} color={C.gold} />
          </View>
          <View>
            <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 2, color: C.goldDim }}>BAŞARIM AÇILDI</Text>
            <Text style={{ fontFamily: F.display, fontSize: 14, color: C.gold, marginTop: 2 }}>{name}</Text>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// İkilem perdesi — anlatısal seçim. onChoose(choice) çağrılır.
// İkilem: 3D Kader Kartı (lib/kart3d) — kaydırarak ya da dokunarak seçilir, kart dönüp sonucu gösterir.
export function DilemmaModal({ dilemma, onChoose, female }: { dilemma: Dilemma | null; onChoose: (c: Choice, i: number) => void; female?: boolean }) {
  return <KaderKartiModal dilemma={dilemma} onChoose={onChoose} female={female} />;
}

// Sinematik mersiye / vefat ekranı — bir hayatın duygusal kapanışı.
export function EulogyModal({ visible, name, epithet, bornYear, diedYear, age, professionLine, lines, close, hasHeir, onChronicle, onContinue, onReel, ozet }: {
  visible: boolean; name: string; epithet: string; bornYear: number; diedYear: number; age: number;
  professionLine: string; lines: string[]; close: string; hasHeir: boolean; onChronicle: () => void; onContinue: () => void; onReel?: () => void;
  ozet?: { baslik: string; anlar: string[]; insanlar: string[] }; // hayatın özeti: en büyük anlar (kendi cümleleriyle) + ardında kalan insanlar
}) {
  const { t } = useI18n();
  const body = [professionLine, ...lines].filter(Boolean);
  // Paylaşılabilir final kartı (RN yerleşik Share — ekstra paket yok).
  const shareCard = () => {
    const card = `⚜ ${name} ⚜\n${epithet ? `"${epithet}"\n` : ""}${bornYear} – ${diedYear} · ${age} ${t("eul.years")}\n\n${body.join(" ")}\n${close}\n\n— Kronikler`;
    Share.share({ message: card }).catch(() => {});
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: "rgba(4,3,2,0.975)" }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, paddingVertical: 40 }}>
        <Animated.View entering={FadeIn.duration(700)} style={{ alignItems: "center", width: "100%", maxWidth: 400 }}>
          <Animated.View entering={FadeInDown.duration(600).delay(150)}><GameIcon name="tombstone" size={32} color={C.parchmentMuted} /></Animated.View>
          <Animated.Text entering={FadeInDown.duration(600).delay(300)} style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 5, color: C.goldDim, marginTop: 12 }}>{t("eul.eyebrow")}</Animated.Text>
          {!!epithet && <Animated.Text entering={FadeInDown.duration(600).delay(450)} style={{ fontFamily: F.serifItalic, fontSize: 14, color: C.gold, marginTop: 10 }}>“{epithet}”</Animated.Text>}
          <Animated.Text entering={FadeInDown.duration(700).delay(600)} style={{ fontFamily: F.display, fontSize: 26, letterSpacing: 1, color: C.parchment, textAlign: "center", marginTop: 4 }}>{name}</Animated.Text>
          <Animated.Text entering={FadeInDown.duration(600).delay(800)} style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1.5, color: C.parchmentMuted, marginTop: 8 }}>{bornYear} – {diedYear} · {age} {t("eul.years")}</Animated.Text>

          <Animated.Text entering={FadeIn.duration(800).delay(1000)} style={{ color: C.gold, marginVertical: 16 }}>❧ ⚜ ❧</Animated.Text>

          <Animated.Text entering={FadeIn.duration(900).delay(1150)} style={{ fontFamily: F.serif, fontSize: 14.5, color: C.parchmentDim, textAlign: "center", lineHeight: 23 }}>{body.join(" ")}</Animated.Text>
          {ozet && (ozet.anlar.length > 0 || ozet.insanlar.length > 0) && (
            <Animated.View entering={FadeIn.duration(900).delay(1300)} style={{ alignSelf: "stretch", marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border }}>
              {ozet.anlar.length > 0 && <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 2, color: C.goldDim, textAlign: "center", marginBottom: 6 }}>{ozet.baslik.toUpperCase()}</Text>}
              {ozet.anlar.map((x, i) => (
                <Text key={i} style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchment, textAlign: "center", lineHeight: 19, marginBottom: 8 }}>❧ {x}</Text>
              ))}
              {ozet.insanlar.map((x, i) => (
                <Text key={"i" + i} style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim, textAlign: "center", lineHeight: 20, marginTop: i ? 2 : 4 }}>{x}</Text>
              ))}
            </Animated.View>
          )}
          <Animated.Text entering={FadeIn.duration(900).delay(1500)} style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.gold, textAlign: "center", lineHeight: 23, marginTop: 14 }}>{close}</Animated.Text>

          <Animated.View entering={FadeIn.duration(700).delay(1800)} style={{ marginTop: 18 }}>
            <Pressable onPress={shareCard} style={{ paddingVertical: 8, paddingHorizontal: 18, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,168,76,0.45)", alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 10.5, letterSpacing: 1, color: C.gold }}>↗ {t("eul.share")}</Text>
            </Pressable>
          </Animated.View>
          {onReel && (
            <Animated.View entering={FadeIn.duration(700).delay(1850)} style={{ marginTop: 10 }}>
              <Pressable onPress={onReel} style={{ paddingVertical: 8, paddingHorizontal: 18, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,168,76,0.45)", alignItems: "center" }}>
                <Text style={{ fontFamily: F.display, fontSize: 10.5, letterSpacing: 1, color: C.gold }}>❧ {t("eul.reel")}</Text>
              </Pressable>
            </Animated.View>
          )}
          <Animated.View entering={FadeInUp.duration(700).delay(1900)} style={{ flexDirection: "row", gap: 10, marginTop: 14, alignSelf: "stretch" }}>
            <Pressable onPress={onChronicle} style={{ flex: 1, paddingVertical: 13, borderRadius: 9, borderWidth: 1, borderColor: C.borderHi, alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.parchment }}>{t("eul.chronicle")}</Text>
            </Pressable>
            <Pressable onPress={onContinue} style={{ flex: 1.3, paddingVertical: 13, borderRadius: 9, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.6)", backgroundColor: C.gold, alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1, color: C.inkOnGold }}>{hasHeir ? t("eul.continue") : t("eul.newLife")}</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// Anlık fırsat pop-up'ı + hüner sınavı mini-oyunu + sonuç ekranı.
// onResolve(success): mini-oyunun sonucunu üst bileşene verir (resolveOpportunity'ye iletilir).
// statVal: ilgili özelliğin değeri (1–10) — başarı bölgesini büyütür (hüner işe yarar).
// Fırsat: aynı 3D kart; beceri sınavı (durdur) korunur — şans değil hüner (lib/kart3d).
export function OpportunityModal({ opp, statVal = 5, onResolve, onPass, progress, onProgress }: { opp: Opportunity | null; statVal?: number; onResolve: (success: boolean) => void; onPass: () => void; progress?: { stage?: "intro" | "play" | "result"; success?: boolean }; onProgress?: (stage: "play" | "result", success?: boolean) => void }) {
  return <FirsatKartiModal opp={opp} statVal={statVal} onResolve={onResolve} onPass={onPass} progress={progress} onProgress={onProgress} />;
}

// Bilgilendirici tutorial — ilk oyunda bir kez (madde madde temel oynanış). Genel; SP ve başka yerde de kullanılabilir.
export function TutorialModal({ visible, title, bullets, gotLabel, onClose }: { visible: boolean; title: string; bullets: string[]; gotLabel: string; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(6,4,2,0.92)", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Animated.View entering={FadeInUp.springify().damping(16)} style={{ width: "100%", maxWidth: 400, backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", borderRadius: 16, padding: 22 }}>
          <View style={{ alignItems: "center", marginBottom: 6 }}><GameIcon name="scroll" size={28} color={C.gold} /></View>
          <Text style={{ fontFamily: F.display, fontSize: 16, letterSpacing: 0.5, color: C.gold, textAlign: "center", marginBottom: 14 }}>{title}</Text>
          {bullets.map((b, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 9, marginBottom: 10, alignItems: "flex-start" }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold, marginTop: 6 }} />
              <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13.5, color: C.parchment, lineHeight: 19 }}>{b}</Text>
            </View>
          ))}
          <Pressable onPress={onClose} style={{ marginTop: 8, paddingVertical: 13, borderRadius: 9, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.6)", backgroundColor: C.gold, alignItems: "center" }}>
            <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: C.inkOnGold }}>{gotLabel}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Ortak tasarım bileşenleri (Vercel hizası) ──
// Altın çizgi + elmas ayraç.
export function GoldDivider({ mt = 16, mb = 12 }: { mt?: number; mb?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginTop: mt, marginBottom: mb }}>
      <View style={{ flex: 1, height: 1, backgroundColor: C.goldDim, opacity: 0.6 }} />
      <View style={{ width: 6, height: 6, backgroundColor: C.gold, transform: [{ rotate: "45deg" }], marginHorizontal: 8 }} />
      <View style={{ flex: 1, height: 1, backgroundColor: C.goldDim, opacity: 0.6 }} />
    </View>
  );
}

// Bölüm başlığı — altın, harf aralıklı, opsiyonel ikon + sağ çizgi.
export function SectionHead({ title, icon, center }: { title: string; icon?: string; center?: boolean }) {
  if (center) return <Text style={{ fontFamily: F.display, fontSize: 15, color: C.gold, textAlign: "center", marginBottom: 12 }}>{title}</Text>;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 9 }}>
      {icon ? <GameIcon name={icon} size={14} color={C.gold} /> : null}
      <Text style={{ flexShrink: 1, fontFamily: F.display, fontSize: 15, color: C.gold }}>{title}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
    </View>
  );
}

// Ekran başlığı (ortalı): başlık + opsiyonel alt başlık + elmas ayraç.
export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View>
      <Text style={{ fontFamily: F.display, fontSize: 21, color: C.parchment, letterSpacing: 1.5, textAlign: "center" }}>{title}</Text>
      {subtitle ? <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchmentMuted, textAlign: "center", marginTop: 2 }}>{subtitle}</Text> : null}
      <GoldDivider mt={12} mb={8} />
    </View>
  );
}

// İlerleme çubuğu — değer değişince akıcı dolar (UI thread).
export function ProgressBar({ value, max, color, h = 5 }: { value: number; max: number; color: string; h?: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const w = useSharedValue(pct);
  useEffect(() => { w.value = withTiming(pct, { duration: 600, easing: EASE.decel }); }, [pct]);
  const style = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={{ height: h, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: h, overflow: "hidden" }}>
      <Animated.View style={[{ height: h, backgroundColor: color, borderRadius: h }, style]} />
    </View>
  );
}

// ── Vercel Kit bileşenleri (PageHeader / Panel / Pill) ──
export function PageHeader({ kicker, icon, title, sub }: { kicker?: string; icon?: string; title: string; sub?: string }) {
  const path = usePathname(), design = screenDesign(path);
  return (
    <Animated.View entering={FadeInDown.duration(320).easing(EASE.decel)} style={{ marginBottom: 14, borderWidth: 1, borderColor: C.goldDim, borderRadius: 4, overflow: "hidden", backgroundColor: C.surface }}>
      <Image accessible={false} source={screenArt(path)} resizeMode="cover" style={{ position: "absolute", width: "100%", height: "100%", opacity: 0.75 }} />
      <LinearGradient pointerEvents="none" colors={[C.bg + "00", C.bg + "DD", C.bg]} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      <View style={{ padding: 16, paddingTop: design.family === "system" ? 32 : 72 }}>
        <GameIcon name={design.icon} size={24} color={C.gold} />
        {!!kicker && kicker !== title && <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim, marginTop: 8 }}>{kicker}</Text>}
        <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 23, lineHeight: 31, color: C.parchment, marginTop: 6 }}>{title}</Text>
        {!!sub && <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 22, color: C.parchmentDim, marginTop: 5 }}>{sub}</Text>}
        <View style={{ height: 1, backgroundColor: C.goldDim, marginTop: 12, width: 44 }} />
      </View>
    </Animated.View>
  );
}
export function Pill({ text, tone = C.gold }: { text: string; tone?: string }) {
  return (
    <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: tone + "66", backgroundColor: tone + "1A" }}>
      <Text style={{ fontFamily: F.display, fontSize: 9, letterSpacing: 0.5, color: tone }}>{text}</Text>
    </View>
  );
}
export function Panel({ title, icon, tone = C.gold, right, children, noPad, delay = 0 }: { title?: string; icon?: string; tone?: string; right?: React.ReactNode; children: React.ReactNode; noPad?: boolean; delay?: number }) {
  return <OrnatePanel title={title} tone={tone} right={right} inset={!noPad}>{children}</OrnatePanel>;
}

// Ekran freski: ana menü freski kısık ışıkla (opasite 0.1) arkadan bakar — düz zeminlere derinlik, okunurluğa dokunmadan.
export function ScreenFresk({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useSadeMod();
  if (reduced) return <View style={[{ flex: 1, backgroundColor: C.bg }, style]}>{children}</View>; // sade mod: doku belleği harcanmaz
  return (
    <ImageBackground source={require("../assets/yeni_oyun_bg.png")} resizeMode="cover" imageStyle={{ opacity: 0.1 }} style={[{ flex: 1, backgroundColor: C.bg }, style]}>
      {children}
    </ImageBackground>
  );
}
