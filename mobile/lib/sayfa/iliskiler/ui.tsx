// İlişkiler ekranının parçaları: grup çipleri, portre kartı, kısa satır, ilişki ölçeği, bölüm paneli ve boş durum.
import { useRef, type ReactNode } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { DesignPressable as Pressable } from "../../design-pressable";
import { GameIcon } from "../../icons";
import { GameButton, Portre } from "../../ui";
import { useSadeMod } from "../../use-sade-mod";
import { hap } from "../../haptics";
import { playTap } from "../../sound";
import { useI18n, applyParams } from "../../i18n";
import { professionNameL } from "../../locale-data";
import { EASE } from "../../motion";
import { C, F } from "../../theme";
import { bantOf, GRUP_IKON, GRUP_TON, type Grup } from "./model";

export type Filtre = "hepsi" | Grup;
const KART_ZEMIN = "rgba(42,31,19,0.62)";
const KOYU = "#120C06";

// Kısa bant etiketi (tekil ilişki hâli): Dostluk, Tanışıklık, Düşmanlık…
export function useBantEtiketi() {
  const { t } = useI18n();
  const ad: Record<string, string> = { dost: t("iliskiler.bant.dost"), arkadas: t("iliskiler.bant.arkadas"), tanis: t("iliskiler.bant.tanis"), rakip: t("iliskiler.bant.rakip"), dusman: t("iliskiler.bant.dusman") };
  return (v: number) => ad[bantOf(v).id];
}

// Bölüm başlıkları, notları ve boş durum yönlendirmeleri (anahtarlar düz yazılır ki denetleyici görsün).
export function useGrupMetni() {
  const { t } = useI18n();
  return {
    aile: { cip: t("iliskiler.f.aile"), baslik: t("iliskiler.s.aile"), not: t("iliskiler.n.aile"), bos: t("iliskiler.bos.aile") },
    yakin: { cip: t("iliskiler.f.yakin"), baslik: t("iliskiler.s.yakin"), not: t("iliskiler.n.yakin"), bos: t("iliskiler.bos.yakin") },
    hasim: { cip: t("iliskiler.f.hasim"), baslik: t("iliskiler.s.hasim"), not: t("iliskiler.n.hasim"), bos: t("iliskiler.bos.hasim") },
    tanis: { cip: t("iliskiler.f.tanis"), baslik: t("iliskiler.s.tanis"), not: t("iliskiler.n.tanis"), bos: t("iliskiler.bos.tanis") },
  } satisfies Record<Grup, { cip: string; baslik: string; not: string; bos: string }>;
}

function Sayac({ n, tone, on = false }: { n: number; tone: string; on?: boolean }) {
  return <View style={{ minWidth: 26, height: 22, paddingHorizontal: 7, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: on ? "rgba(26,18,6,0.4)" : tone + "77", backgroundColor: on ? "rgba(26,18,6,0.18)" : tone + "1F" }}>
    <Text style={{ fontFamily: F.display, fontSize: 12, lineHeight: 15, color: on ? C.inkOnGold : tone }}>{n}</Text>
  </View>;
}

// Grup çipleri: Hepsi · Aile · Yakınlar · Hasımlar · Tanışlar — sayılarıyla. Dar ekranda yatay kayar.
export function FiltreCipleri({ secili, sayi, toplam, onSec }: { secili: Filtre; sayi: Record<Grup, number>; toplam: number; onSec: (f: Filtre) => void }) {
  const { t, rtl } = useI18n(); const reduced = useSadeMod(); const metin = useGrupMetni();
  const ref = useRef<ScrollView>(null);
  const items: { id: Filtre; icon: string; label: string; n: number; tone: string }[] = [
    { id: "hepsi", icon: "iliskiler", label: t("iliskiler.f.hepsi"), n: toplam, tone: C.gold },
    ...(["aile", "yakin", "hasim", "tanis"] as const).map((g) => ({ id: g, icon: GRUP_IKON[g], label: metin[g].cip, n: sayi[g], tone: GRUP_TON[g] })),
  ];
  return <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist"
    onContentSizeChange={() => { if (rtl) ref.current?.scrollToEnd({ animated: false }); }}
    style={{ marginHorizontal: -14, marginBottom: 14, flexGrow: 0 }}
    contentContainerStyle={{ flexGrow: 1, flexDirection: rtl ? "row-reverse" : "row", gap: 8, paddingHorizontal: 14, paddingVertical: 2 }}>
    {items.map((it) => {
      const on = it.id === secili;
      return <Pressable key={it.id} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={applyParams(t("iliskiler.a11y.filtre"), [it.label, it.n])}
        onPress={() => { if (on) return; hap("selection"); playTap(); onSec(it.id); }}
        style={({ pressed }) => ({ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 7, minHeight: 44, paddingLeft: rtl ? 8 : 12, paddingRight: rtl ? 12 : 8, borderRadius: 22, borderWidth: 1, borderColor: on ? C.goldBright : pressed ? C.gold : C.borderHi, backgroundColor: on ? C.gold : pressed ? "rgba(42,31,19,0.95)" : "rgba(20,14,8,0.84)", overflow: "hidden", transform: [{ scale: pressed && !reduced ? 0.96 : 1 }] })}>
        {on && <LinearGradient pointerEvents="none" colors={["#F4D889", "#DDAE4D", "#B77C2F"]} style={StyleSheet.absoluteFill} />}
        <View><GameIcon name={it.icon} size={17} color={on ? C.inkOnGold : it.tone} /></View>
        <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 13, lineHeight: 17, color: on ? C.inkOnGold : C.parchment }}>{it.label}</Text>
        <Sayac n={it.n} tone={it.tone} on={on} />
      </Pressable>;
    })}
  </ScrollView>;
}

// İlişki ölçeği: ortadan iki yana dolar — sağa dostluk, sola husumet (RTL'de ayna).
export function IliskiOlcer({ v, h = 6 }: { v: number; h?: number }) {
  const { rtl } = useI18n();
  const pct = `${Math.min(100, Math.abs(v))}%` as const; const tone = bantOf(v).tone;
  return <View accessible={false} style={{ flexDirection: rtl ? "row-reverse" : "row", height: h, borderRadius: h / 2, backgroundColor: "rgba(255,240,210,0.09)", overflow: "hidden" }}>
    <View style={{ flex: 1, flexDirection: rtl ? "row" : "row-reverse" }}>{v < 0 && <View style={{ width: pct, backgroundColor: tone }} />}</View>
    <View style={{ width: 2, backgroundColor: C.goldDim }} />
    <View style={{ flex: 1, flexDirection: rtl ? "row-reverse" : "row" }}>{v > 0 && <View style={{ width: pct, backgroundColor: tone }} />}</View>
  </View>;
}

// Yoldaş bağı (0–100): baştan sona dolan tek yönlü çubuk.
export function BagCubugu({ pct, tone }: { pct: number; tone: string }) {
  const { rtl } = useI18n();
  return <View accessible={false} style={{ flexDirection: rtl ? "row-reverse" : "row", height: 6, borderRadius: 3, backgroundColor: tone + "26", overflow: "hidden" }}>
    <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: tone }} />
  </View>;
}

// Ölçeğin üstünde hâl adı ve puan.
export function IliskiOlcumu({ etiket, deger, tone, children }: { etiket: string; deger: string; tone: string; children: ReactNode }) {
  const { rtl } = useI18n();
  return <View>
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
      <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.serif, fontSize: 13.5, lineHeight: 17, color: C.parchmentMuted, textAlign: rtl ? "right" : "left" }}>{etiket}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 13, lineHeight: 17, color: tone }}>{deger}</Text>
    </View>
    {children}
  </View>;
}
export const puanYazi = (v: number) => (v > 0 ? "+" + v : String(v));

function RolEtiketi({ text, tone }: { text: string; tone: string }) {
  return <View style={{ maxWidth: "100%", marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: tone + "88", backgroundColor: tone + "1C" }}>
    <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 11.5, lineHeight: 15, letterSpacing: 0.4, color: tone }}>{text}</Text>
  </View>;
}

// Portre halkası: ton çerçeve; uzaktaysa köşede harita madalyonu.
function PortreHalka({ seed, age, gender, size, tone, uzak = false }: { seed: string; age: number; gender: "erkek" | "kadın"; size: number; tone: string; uzak?: boolean }) {
  return <View style={{ width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, borderWidth: 2, borderColor: tone, alignItems: "center", justifyContent: "center", backgroundColor: KOYU }}>
    <Portre age={age} gender={gender} size={size} ring={false} seed={seed} />
    {uzak && <View style={{ position: "absolute", bottom: -3, right: -3, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: KOYU, borderWidth: 1, borderColor: C.borderHi }}>
      <GameIcon name="map" size={12} color={C.parchmentDim} />
    </View>}
  </View>;
}

const giris = (reduced: boolean, i: number) => (reduced ? undefined : FadeInDown.delay(Math.min(i, 8) * 40).duration(280).easing(EASE.decel));

// Portre kartı: aile, yakın çevre ve hasımlar için iki sütunlu ızgarada.
export type KartVerisi = { key: string; seed: string; age: number; gender: "erkek" | "kadın"; name: string; sub: string; place?: string; rol?: { text: string; tone: string }; tone: string; olcum: ReactNode; a11y: string; onPress?: () => void };
export function KisiKarti({ k, index }: { k: KartVerisi; index: number }) {
  const { t, rtl } = useI18n(); const reduced = useSadeMod();
  return <Animated.View entering={giris(reduced, index)} style={{ width: "48.5%" }}>
    <Pressable disabled={!k.onPress} accessibilityLabel={k.a11y} accessibilityHint={k.onPress ? t("iliskiler.a11y.ac") : undefined} accessibilityState={{ disabled: !k.onPress }}
      onPress={() => { hap("tap"); k.onPress?.(); }}
      style={({ pressed }) => ({ flex: 1, justifyContent: "flex-start", alignItems: "center", paddingTop: 12, paddingBottom: 10, paddingHorizontal: 9, borderRadius: 8, borderWidth: 1, borderColor: pressed ? C.goldBright : k.tone + "70", backgroundColor: pressed ? "rgba(18,12,6,0.92)" : KART_ZEMIN, transform: [{ scale: pressed && !reduced ? 0.97 : 1 }] })}>
      <View pointerEvents="none" style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: 5, borderWidth: 1, borderColor: k.tone + "22" }} />
      <PortreHalka seed={k.seed} age={k.age} gender={k.gender} size={58} tone={k.tone} uzak={!!k.place} />
      <Text numberOfLines={2} style={{ marginTop: 8, maxWidth: "100%", fontFamily: F.serif, fontSize: 16.5, lineHeight: 21, color: "#F6EAD0", textAlign: "center" }}>{k.name}</Text>
      {k.rol && <RolEtiketi text={k.rol.text} tone={k.rol.tone} />}
      <Text numberOfLines={1} style={{ marginTop: 4, maxWidth: "100%", fontFamily: F.serifItalic, fontSize: 14, lineHeight: 18, color: C.parchmentMuted, textAlign: "center" }}>{k.sub}</Text>
      {k.place ? <View style={{ maxWidth: "100%", flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 4 }}>
        <GameIcon name="map" size={11} color={C.parchmentDim} />
        <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.parchmentDim }}>{k.place}</Text>
      </View> : null}
      <View style={{ marginTop: "auto", paddingTop: 9, alignSelf: "stretch" }}>{k.olcum}</View>
    </Pressable>
  </Animated.View>;
}

export function KartIzgarasi({ children }: { children: ReactNode }) {
  const { rtl } = useI18n();
  return <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 9 }}>{children}</View>;
}

// Kısa satır: kalabalık tanışlar listesi için (portre, ad, meslek · yaş, ölçek).
export function KisiSatiri({ name, seed, age, gender, profession, v, first, index, onPress }: { name: string; seed: string; age: number; gender: "erkek" | "kadın"; profession: string; v: number; first: boolean; index: number; onPress: () => void }) {
  const { t, lang, rtl } = useI18n(); const reduced = useSadeMod(); const bant = useBantEtiketi();
  const tone = bantOf(v).tone; const sub = `${professionNameL(profession, lang, gender === "kadın")} · ${age}`;
  return <Animated.View entering={giris(reduced, index)}>
    <Pressable accessibilityLabel={`${name}, ${sub}, ${bant(v)} ${puanYazi(v)}`} accessibilityHint={t("iliskiler.a11y.ac")} onPress={() => { hap("tap"); onPress(); }}
      style={({ pressed }) => ({ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 11, minHeight: 60, paddingVertical: 7, paddingHorizontal: 4, borderTopWidth: first ? 0 : 1, borderColor: C.border + "AA", borderRadius: pressed ? 6 : 0, backgroundColor: pressed ? "rgba(221,180,90,0.08)" : "transparent", transform: [{ scale: pressed && !reduced ? 0.985 : 1 }] })}>
      <PortreHalka seed={seed} age={age} gender={gender} size={40} tone={tone + "AA"} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 20, color: C.parchment, textAlign: rtl ? "right" : "left" }}>{name}</Text>
        <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 18, color: C.parchmentMuted, textAlign: rtl ? "right" : "left" }}>{sub}</Text>
      </View>
      <View style={{ width: 60, gap: 5 }}>
        <Text style={{ fontFamily: F.display, fontSize: 14, lineHeight: 18, color: v >= 20 ? C.sage : v <= -20 ? C.blood : C.parchmentDim, textAlign: rtl ? "left" : "right" }}>{puanYazi(v)}</Text>
        <IliskiOlcer v={v} h={5} />
      </View>
      <Text style={{ fontFamily: F.display, fontSize: 20, lineHeight: 24, color: C.goldDim }}>{rtl ? "‹" : "›"}</Text>
    </Pressable>
  </Animated.View>;
}

// Bölüm paneli: madalyon ikon, başlık, kişi sayısı ve kısa not; altın çerçeve köşeleriyle.
export function BolumPaneli({ grup, sayi, children, notsuz = false }: { grup: Grup; sayi: number; children: ReactNode; notsuz?: boolean }) {
  const { t, rtl } = useI18n(); const reduced = useSadeMod(); const metin = useGrupMetni()[grup]; const tone = GRUP_TON[grup];
  const kol = { position: "absolute" as const, backgroundColor: tone, opacity: 0.75 };
  return <Animated.View entering={reduced ? undefined : FadeInDown.duration(300).easing(EASE.decel)} style={{ marginBottom: 14, borderWidth: 1, borderColor: tone === C.gold ? C.borderHi : tone + "99", borderRadius: 8, overflow: "hidden", backgroundColor: "rgba(20,14,8,0.55)" }}>
    <LinearGradient pointerEvents="none" colors={["rgba(40,29,17,0.9)", "rgba(24,18,11,0.88)", "rgba(19,14,8,0.92)"]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderWidth: 1, borderColor: tone + "1F", borderRadius: 5 }} />
    {([["top", "left"], ["top", "right"], ["bottom", "left"], ["bottom", "right"]] as const).map(([y, x]) => <View key={y + x} pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[kol, { [y]: 3, [x]: 3, width: 12, height: 1.5 }]} /><View style={[kol, { [y]: 3, [x]: 3, width: 1.5, height: 12 }]} />
    </View>)}
    <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: KOYU, borderWidth: 1.5, borderColor: tone }}>
          <GameIcon name={GRUP_IKON[grup]} size={19} color={tone} />
        </View>
        <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, fontFamily: F.display, fontSize: 17, lineHeight: 22, color: tone, textAlign: rtl ? "right" : "left" }}>{metin.baslik}</Text>
        <Sayac n={sayi} tone={tone} />
      </View>
      {!notsuz && <Text style={{ marginTop: 6, fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 20, color: C.parchmentMuted, textAlign: rtl ? "right" : "left" }}>{metin.not}</Text>}
      <LinearGradient pointerEvents="none" start={{ x: rtl ? 1 : 0, y: 0 }} end={{ x: rtl ? 0 : 1, y: 0 }} colors={[tone + "99", tone + "33", tone + "00"]} style={{ height: 1, marginTop: 9 }} />
    </View>
    <View style={{ padding: 10 }}>{children}</View>
  </Animated.View>;
}

// Boş durum: grubun ikonu, yönlendirme metni ve varsa tek eylem. Kısa hâli "Hepsi" görünümünde kullanılır.
export function BosDurum({ grup, metin, eylem, kisa = false }: { grup: Grup; metin: string; eylem?: { icon: string; label: string; onPress: () => void }; kisa?: boolean }) {
  const { rtl } = useI18n(); const tone = GRUP_TON[grup];
  if (kisa) return <View style={{ gap: 10, paddingHorizontal: 2, paddingVertical: 2 }}>
    <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 21, color: C.parchmentDim, textAlign: rtl ? "right" : "left" }}>{metin}</Text>
    {eylem && <GameButton variant="secondary" icon={eylem.icon} rtl={rtl} haptic="tap" accessibilityLabel={eylem.label} onPress={eylem.onPress}>
      <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 14, color: C.goldBright, textAlign: rtl ? "right" : "left" }}>{eylem.label}</Text>
    </GameButton>}
  </View>;
  return <View style={{ alignItems: "center", paddingVertical: 14, paddingHorizontal: 8, gap: 12 }}>
    <View style={{ width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: KOYU, borderWidth: 2, borderColor: tone + "AA" }}>
      <View style={{ position: "absolute", top: 4, left: 4, right: 4, bottom: 4, borderRadius: 28, borderWidth: 1, borderColor: tone + "33" }} />
      <GameIcon name={GRUP_IKON[grup]} size={28} color={tone} />
    </View>
    <Text style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 23, color: C.parchmentDim, textAlign: "center" }}>{metin}</Text>
    {eylem && <GameButton variant="secondary" icon={eylem.icon} rtl={rtl} haptic="tap" accessibilityLabel={eylem.label} onPress={eylem.onPress} style={{ alignSelf: "stretch" }}>
      <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 14, color: C.goldBright, textAlign: rtl ? "right" : "left" }}>{eylem.label}</Text>
    </GameButton>}
  </View>;
}

// "Tümünü gör": Hepsi görünümünde kısaltılan grubu kendi çipinde açar.
export function TumunuGor({ grup, sayi, onPress }: { grup: Grup; sayi: number; onPress: () => void }) {
  const { t, rtl } = useI18n(); const reduced = useSadeMod(); const label = applyParams(t("iliskiler.tumu"), [sayi]); const tone = GRUP_TON[grup];
  return <Pressable accessibilityLabel={label} onPress={() => { hap("selection"); playTap(); onPress(); }}
    style={({ pressed }) => ({ marginTop: 10, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: pressed ? C.goldBright : tone + "66", backgroundColor: pressed ? "rgba(221,180,90,0.12)" : "rgba(221,180,90,0.05)", transform: [{ scale: pressed && !reduced ? 0.98 : 1 }] })}>
    <Text style={{ fontFamily: F.display, fontSize: 13.5, color: C.goldBright }}>{label}</Text>
    <Text style={{ fontFamily: F.display, fontSize: 18, lineHeight: 20, color: C.goldBright }}>{rtl ? "‹" : "›"}</Text>
  </Pressable>;
}

// Çöpçatan: bekâr yetişkine talip önerisi — aile bölümünün eylemi.
export function CopcatanSatiri({ onPress }: { onPress: () => void }) {
  const { t, rtl } = useI18n(); const reduced = useSadeMod(); const tone = C.roseDim;
  return <Pressable accessibilityLabel={t("cc.title")} accessibilityHint={t("cc.entryHint")} onPress={() => { hap("tap"); onPress(); }}
    style={({ pressed }) => ({ marginTop: 10, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 12, minHeight: 64, paddingVertical: 9, paddingHorizontal: 11, borderRadius: 8, borderWidth: 1, borderColor: pressed ? "#E7A0AE" : tone + "AA", overflow: "hidden", transform: [{ scale: pressed && !reduced ? 0.98 : 1 }] })}>
    <LinearGradient pointerEvents="none" start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={["rgba(120,40,58,0.55)", "rgba(80,26,38,0.45)", "rgba(40,16,20,0.5)"]} style={StyleSheet.absoluteFill} />
    <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: KOYU, borderWidth: 1.5, borderColor: "#E7A0AE" }}>
      <GameIcon name="ring" size={22} color="#F0B8C2" />
    </View>
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={{ fontFamily: F.display, fontSize: 15, lineHeight: 19, color: "#F6D6DC", textAlign: rtl ? "right" : "left" }}>{t("cc.title")}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 19, color: "#E6C6B8", textAlign: rtl ? "right" : "left" }}>{t("cc.entryHint")}</Text>
    </View>
    <Text style={{ fontFamily: F.display, fontSize: 22, color: "#F6D6DC" }}>{rtl ? "‹" : "›"}</Text>
  </Pressable>;
}

// Diyar hanedanları: çok oyunculuda aynı diyardaki gerçek oyuncular.
type MpOyuncu = { id: string; name: string; age: number; gender: "erkek" | "kadın"; profession: string; crowned?: boolean; online?: boolean; dead?: boolean };
export function DiyarOyunculari({ players, guestId }: { players: MpOyuncu[]; guestId?: string | null }) {
  const { t, lang, rtl } = useI18n();
  const cevrimici = players.filter((x) => x.online && !x.dead).length;
  return <View style={{ marginBottom: 14, borderWidth: 1, borderColor: C.borderHi, borderRadius: 8, overflow: "hidden", backgroundColor: "rgba(24,18,11,0.9)" }}>
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: "rgba(201,168,76,0.08)" }}>
      <GameIcon name="hanedan" size={18} color={C.gold} />
      <Text accessibilityRole="header" style={{ flex: 1, fontFamily: F.display, fontSize: 16, color: C.gold, textAlign: rtl ? "right" : "left" }}>{t("mp.players")}</Text>
      <Sayac n={cevrimici} tone={C.sage} />
    </View>
    <View style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
      {players.map((pl) => <View key={pl.id} accessible accessibilityLabel={`${pl.name}, ${professionNameL(pl.profession, lang, pl.gender === "kadın")} · ${pl.age}`} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10, minHeight: 52, paddingVertical: 5 }}>
        <Portre age={Math.max(7, pl.age)} gender={pl.gender} size={40} ring={false} seed={pl.id} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 6 }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.serif, fontSize: 16, color: pl.id === guestId ? C.gold : C.parchment }}>{pl.name}{pl.id === guestId ? ` ${t("mp.you")}` : ""}</Text>
            {pl.crowned ? <GameIcon name="crown" size={14} color={C.goldBright} /> : null}
          </View>
          <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 14, color: C.parchmentMuted, textAlign: rtl ? "right" : "left" }}>{professionNameL(pl.profession, lang, pl.gender === "kadın")} · {pl.age}</Text>
        </View>
        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: pl.online ? C.sage : C.parchmentDim }} />
      </View>)}
    </View>
  </View>;
}
