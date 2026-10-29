// Mahalle sayfasının kartları: seçili mekân, uğrak sonucu, akşam sofrası ve kasabanın gözü.
import type { ReactNode } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { DesignPressable as Pressable } from "../../design-pressable";
import { GameIcon } from "../../icons";
import { Portre } from "../../ui";
import { C, F } from "../../theme";

// Altın çerçeveli koyu panel: ince iç hat ve köşe gönyeleri (mockup paneli).
export function Cerceve({ children, tone = C.borderHi, style }: { children: ReactNode; tone?: string; style?: object }) {
  return <View style={[{ marginBottom: 14, borderRadius: 8, borderWidth: 1, borderColor: tone, overflow: "hidden", backgroundColor: "rgba(20,14,8,0.9)" }, style]}>
    <LinearGradient pointerEvents="none" colors={["rgba(44,32,18,0.92)", "rgba(24,18,11,0.9)", "rgba(18,13,8,0.94)"]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: 5, borderWidth: 1, borderColor: "rgba(221,180,90,0.13)" }} />
    {children}
  </View>;
}

// Yuvarlak altın madalyon (başlık ikonları).
export function Madalyon({ icon, size = 48, tone = C.gold, dim = false }: { icon: string; size?: number; tone?: string; dim?: boolean }) {
  const ring = dim ? C.goldDim : tone;
  return <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", backgroundColor: "#140D06", borderWidth: 2, borderColor: ring }}>
    <View pointerEvents="none" style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: size / 2 - 3, borderWidth: 1, borderColor: ring + "44" }} />
    <GameIcon name={icon} size={Math.round(size * 0.48)} color={dim ? C.parchmentMuted : tone} />
  </View>;
}

function Rozet({ icon, text, tone = C.goldDim, fg = C.parchmentDim }: { icon?: string; text: string; tone?: string; fg?: string }) {
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 2, minHeight: 22, borderRadius: 11, borderWidth: 1, borderColor: tone + "88", backgroundColor: tone + "1F" }}>
    {icon ? <GameIcon name={icon} size={12} color={fg} /> : null}
    <Text style={{ fontFamily: F.display, fontSize: 11.5, lineHeight: 15, color: fg }}>{text}</Text>
  </View>;
}

// Ana eylem düğmesi: altın kenarlı, basınca çöken taş düğme.
export function AltinDugme({ icon, label, a11y, onPress, disabled = false }: { icon: string; label: string; a11y?: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityLabel={a11y || label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 50, paddingHorizontal: 16, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: C.goldBright, borderBottomWidth: pressed ? 1 : 4, borderBottomColor: "#6B4A1C", opacity: disabled ? 0.45 : 1, transform: [{ translateY: pressed ? 2 : 0 }] })}>
    <LinearGradient pointerEvents="none" colors={["#F3D27A", "#DDB45A", "#B8893A"]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={{ position: "absolute", top: 2, left: 2, right: 2, bottom: 2, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,244,214,0.45)" }} />
    <View><GameIcon name={icon} size={20} color={C.inkOnGold} /></View>
    <Text style={{ fontFamily: F.display, fontSize: 16, letterSpacing: 0.8, color: C.inkOnGold }}>{label}</Text>
  </Pressable>;
}

// Kapalı eylem: neden açık değil, düğme kılığına girmeden söylenir.
function KapaliSerit({ icon, text, rtl }: { icon: string; text: string; rtl: boolean }) {
  return <View accessible accessibilityRole="text" style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10, minHeight: 46, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: "rgba(14,10,6,0.55)" }}>
    <GameIcon name={icon} size={17} color={C.goldDim} />
    <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, lineHeight: 20, color: C.parchmentMuted, textAlign: rtl ? "right" : "left" }}>{text}</Text>
  </View>;
}

export type Kisi = { id: string; ad: string; tamAd: string; age: number; gender: "erkek" | "kadın"; tanidik: boolean };

function KisiSirasi({ kisiler, onKisi, size = 48 }: { kisiler: Kisi[]; onKisi: (id: string) => void; size?: number }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
    {kisiler.map((k) => <Pressable key={k.id} accessibilityLabel={k.tamAd} onPress={() => onKisi(k.id)}
      style={({ pressed }) => ({ alignItems: "center", width: size + 16, paddingVertical: 2, opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
      <Portre age={k.age} gender={k.gender} size={size} ring={k.tanidik} seed={k.id} />
      <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 18, marginTop: 3, color: k.tanidik ? C.parchment : C.parchmentMuted }}>{k.ad}</Text>
    </Pressable>)}
  </ScrollView>;
}

// Seçili mekânın ayrıntısı: kimler orada, ne kazandırır, uğranabilir mi.
export function MekanKarti({ icon, ad, aciklama, sayiMetni, tanidikMetni, yasSiniri, kisiler, bosMetni, kapali, dugme, onKisi, onGit, rtl, reduced, anahtar, okX }: {
  icon: string; ad: string; aciklama: string; sayiMetni: string; tanidikMetni: string | null; yasSiniri: number | null; kisiler: Kisi[]; bosMetni: string;
  kapali: { icon: string; text: string } | null; dugme: { label: string; a11y: string } | null; onKisi: (id: string) => void; onGit: () => void; rtl: boolean; reduced: boolean; anahtar: string; okX: number;
}) {
  const row = rtl ? "row-reverse" : "row";
  return <Animated.View key={anahtar} entering={reduced ? undefined : FadeInDown.duration(260)} style={{ paddingTop: 7 }}>
    {/* Kartın üstündeki dil, haritadaki seçili madalyonu gösterir. */}
    <View pointerEvents="none" style={{ position: "absolute", zIndex: 2, top: 1, left: okX - 7, width: 14, height: 14, transform: [{ rotate: "45deg" }], borderLeftWidth: 1, borderTopWidth: 1, borderColor: C.borderHi, backgroundColor: "#2B1F11" }} />
    <Cerceve tone={C.borderHi}>
      <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 14 }}>
        <View style={{ flexDirection: row, alignItems: "center", gap: 12 }}>
          <Madalyon icon={icon} size={52} dim={yasSiniri != null} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: 20, lineHeight: 26, color: C.gold, textAlign: rtl ? "right" : "left" }}>{ad}</Text>
            <View style={{ flexDirection: row, flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              <Rozet icon="family" text={sayiMetni} tone={C.gold} fg={C.parchment} />
              {tanidikMetni ? <Rozet text={tanidikMetni} tone={C.sage} fg="#9FD1A9" /> : null}
              {yasSiniri != null ? <Rozet icon="hourglass" text={yasSiniri + "+"} tone={C.ember} fg="#F0B08A" /> : null}
            </View>
          </View>
        </View>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 15.5, lineHeight: 22, color: C.parchmentDim, marginTop: 10, textAlign: rtl ? "right" : "left" }}>{aciklama}</Text>
        <LinearGradient pointerEvents="none" start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={["rgba(221,180,90,0)", "rgba(221,180,90,0.45)", "rgba(221,180,90,0)"]} style={{ height: 1, marginVertical: 10 }} />
        {kisiler.length ? <KisiSirasi kisiler={kisiler} onKisi={onKisi} /> :
          <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, textAlign: "center", paddingVertical: 8 }}>{bosMetni}</Text>}
        {kapali || dugme ? <View style={{ marginTop: 12 }}>
          {kapali ? <KapaliSerit icon={kapali.icon} text={kapali.text} rtl={rtl} /> : dugme ? <AltinDugme icon="walk" label={dugme.label} a11y={dugme.a11y} onPress={onGit} /> : null}
        </View> : null}
      </View>
    </Cerceve>
  </Animated.View>;
}

// Eylemin sonucu: motorun yazdığı olay, mekânın madalyonuyla bir kayıt kartı olarak.
export function SonucKarti({ icon, baslik, metin, rtl, reduced }: { icon: string; baslik: string; metin: string; rtl: boolean; reduced: boolean }) {
  return <Animated.View entering={reduced ? undefined : FadeInDown.duration(320)} accessibilityLiveRegion="polite"
    style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 12, marginBottom: 14, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: C.gold + "99", backgroundColor: "rgba(46,33,18,0.92)", [rtl ? "borderRightWidth" : "borderLeftWidth"]: 4, [rtl ? "borderRightColor" : "borderLeftColor"]: C.gold }}>
    <Madalyon icon={icon} size={40} tone={C.goldBright} />
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: C.goldSoft, textAlign: rtl ? "right" : "left" }}>{baslik}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 23, color: C.parchment, marginTop: 3, textAlign: rtl ? "right" : "left" }}>{metin}</Text>
    </View>
  </Animated.View>;
}

function PanelBasi({ icon, title, sub, alt, rtl }: { icon: string; title: string; sub?: string; alt?: ReactNode; rtl: boolean }) {
  return <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 11 }}>
    <Madalyon icon={icon} size={40} />
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 16.5, lineHeight: 22, color: C.gold, textAlign: rtl ? "right" : "left" }}>{title}</Text>
      {sub ? <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 20, color: C.parchmentMuted, textAlign: rtl ? "right" : "left" }}>{sub}</Text> : null}
      {alt ? <View style={{ flexDirection: rtl ? "row-reverse" : "row", marginTop: 4 }}>{alt}</View> : null}
    </View>
  </View>;
}

// Akşam sofrası: ocaktakiler, bedeli ve ayda bir kurulan sofra.
export function SofraPaneli({ title, sub, kisiler, bedel, bedelYetmez, kapali, dugme, sonuc, onKisi, onKur, rtl }: {
  title: string; sub: string; kisiler: Kisi[]; bedel: string; bedelYetmez: boolean; kapali: { icon: string; text: string } | null; dugme: string | null; sonuc: ReactNode; onKisi: (id: string) => void; onKur: () => void; rtl: boolean;
}) {
  return <Cerceve>
    <View style={{ padding: 14 }}>
      <PanelBasi icon="bread" title={title} sub={sub} rtl={rtl} />
      {kisiler.length ? <View style={{ marginTop: 12 }}><KisiSirasi kisiler={kisiler} onKisi={onKisi} size={44} /></View> : null}
      {kisiler.length ? <>
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 7, marginTop: 10 }}>
          <GameIcon name="coins" size={14} color={bedelYetmez ? C.ember : C.goldDim} />
          <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 19, color: bedelYetmez ? C.emberSoft : C.parchmentMuted, textAlign: rtl ? "right" : "left" }}>{bedel}</Text>
        </View>
        <View style={{ marginTop: 10 }}>
          {kapali ? <KapaliSerit icon={kapali.icon} text={kapali.text} rtl={rtl} /> : dugme ? <AltinDugme icon="bread" label={dugme} disabled={bedelYetmez} onPress={onKur} /> : null}
        </View>
      </> : null}
      {sonuc ? <View style={{ marginTop: 12, marginBottom: -14 }}>{sonuc}</View> : null}
    </View>
  </Cerceve>;
}

// Kasabanın gözünde: huy grubu başına ortalama bakış (−100…+100), merkezden iki yana çubuk.
function Terazi({ v }: { v: number }) {
  const w = 64, half = w / 2, len = Math.min(half, (Math.abs(v) / 50) * half);
  const tone = v >= 20 ? C.sage : v <= -20 ? C.blood : C.goldDim;
  return <View style={{ width: w, height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.45)", borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
    <View style={{ position: "absolute", top: 0, bottom: 0, left: v >= 0 ? half : half - len, width: Math.max(len, v ? 2 : 0), backgroundColor: tone }} />
    <View style={{ position: "absolute", top: -1, bottom: -1, left: half - 0.5, width: 1, backgroundColor: C.parchmentMuted }} />
  </View>;
}

export type GozSatiri = { key: string; ad: string; n: number; ort: number; sebep: string | null };

export function GozPaneli({ title, ozet, satirlar, soylenti, sebepEtiketi, rtl }: { title: string; ozet: string; satirlar: GozSatiri[]; soylenti: string | null; sebepEtiketi: string; rtl: boolean }) {
  return <Cerceve>
    <View style={{ padding: 14 }}>
      <PanelBasi icon="iliskiler" title={title} rtl={rtl} alt={<Rozet text={ozet} tone={C.gold} fg={C.goldSoft} />} />
      <View style={{ marginTop: 10 }}>
        {satirlar.map((g) => <View key={g.key} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "rgba(74,56,32,0.8)" }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 15.5, lineHeight: 20, color: C.parchment, textAlign: rtl ? "right" : "left" }}>{g.ad} <Text style={{ fontFamily: F.serifItalic, color: C.parchmentMuted }}>· {g.n}</Text></Text>
            {g.sebep ? <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 19, color: C.parchmentMuted, textAlign: rtl ? "right" : "left" }}>{sebepEtiketi}: {g.sebep}</Text> : null}
          </View>
          <Terazi v={g.ort} />
          <Text style={{ fontFamily: F.display, fontSize: 14, width: 40, textAlign: rtl ? "left" : "right", color: g.ort >= 20 ? C.sage : g.ort <= -20 ? C.blood : C.parchmentDim }}>{g.ort > 0 ? "+" + g.ort : g.ort}</Text>
        </View>)}
      </View>
      {soylenti ? <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 8, marginTop: 6, paddingTop: 9, borderTopWidth: 1, borderTopColor: "rgba(74,56,32,0.8)" }}>
        <GameIcon name="scroll" size={15} color={C.goldDim} />
        <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, lineHeight: 20, color: C.goldSoft, textAlign: rtl ? "right" : "left" }}>{soylenti}</Text>
      </View> : null}
    </View>
  </Cerceve>;
}
