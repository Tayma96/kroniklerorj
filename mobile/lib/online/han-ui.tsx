// Han ekranlarının görsel parçaları: sıcak ışıklı han sayfası, isim plakası (Debdebe çerçevesi için yer), anons şeridi
// (ikram, armağan, Debdebe türlerine ayrı süs), ikram ikonları. Görsel dil yasam-ui.tsx ile aynıdır.
import { type ReactNode } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { GameIcon } from "../icons";
import { C, F } from "../theme";
import { applyParams } from "../i18n";
import { hap } from "../haptics";
import { DesignPressable as Pressable } from "../design-pressable";
import { ONL, Sahne, hiza, yon } from "./ui";
import { ekHataAnahtari, type EkHata } from "./ek-istemci";
import type { AnonsTuru, IkramId, MasaAnonsu } from "./han-veri";

type Ceviri = (k: string) => string;

export const HAN_GORSEL = require("../../assets/mulk/han.jpg");
export const IKRAM_IKON: Record<IkramId, string> = { ekmek: "bread", serbet: "amphora", yemek: "herbs", gulSuyu: "potion" };
export const EYLEM_IKON: Record<string, string> = { yemin: "prayer-beads", sozlesme: "scales", ittifak: "family", ihbar: "hood", meydanOku: "crossed-swords", kabul: "ring", atma: "walk", atisma: "lyre", atismaSonuc: "lyre" };
/** Debdebe armağanlarının ikonları (tek harita; "armagan_" öneki atılır, bilinmeyen kimlik "gems"). */
const DEBDEBE_IKON: Record<string, string> = { gulsuyu: "potion", gulyagmuru: "leaf", sini: "bread", sancak: "banner", hilat: "wool" };
export const debdebeIkon = (id: string) => DEBDEBE_IKON[id.replace(/^armagan_/, "").toLowerCase()] ?? "gems";
/** Han ekranlarının hata anahtarı: han bağlamında anlamı başka olan ortak kodlar burada özelleşir. */
export function hanHataAnahtari(kod: EkHata): string {
  if (kod === "taraf_degil") return "onl.han.atisma.tarafDegil";
  if (kod === "stok_yok") return "onl.han.ag.stokYok";
  return ekHataAnahtari(kod);
}
const GOLGE = { textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } };

/** Han sayfası: han avlusu resmi, kandil ışığı gibi sıcak bir örtü; `alt` kaydırılmayan alt şerit (yazı kutusu). */
export function HanSayfa({ children, alt, altYukseklik = 0 }: { children: ReactNode; alt?: ReactNode; altYukseklik?: number }) {
  const ins = useSafeAreaInsets();
  return <Sahne gorsel={HAN_GORSEL} oran={0.46} koyu={0.3}>
    <LinearGradient pointerEvents="none" colors={["rgba(255,170,70,0.16)", "rgba(255,140,40,0.05)", "rgba(0,0,0,0)"]} locations={[0, 0.35, 0.7]} style={StyleSheet.absoluteFill} />
    <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0)", "rgba(120,60,20,0.18)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 240 }} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: ins.top + 8, paddingHorizontal: 16, paddingBottom: altYukseklik + ins.bottom + 28 }}>
      {children}
    </ScrollView>
    {alt}
  </Sahne>;
}

/** Bilgi notu (parşömen kutusu). */
export function Not({ metin, rtl, icon = "scroll" }: { metin: string; rtl: boolean; icon?: string }) {
  return <View style={{ flexDirection: yon(rtl), gap: 10, alignItems: "flex-start", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,162,78,0.3)", backgroundColor: "rgba(14,10,6,0.82)" }}>
    <GameIcon name={icon} size={16} color={C.gold} />
    <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{metin}</Text>
  </View>;
}

/** Plakadaki ses durumu (Faz 16): konuşuyor (ışık halkası), mikrofon açık, masa başı sesini kesti. */
export type PlakaSesi = "konusuyor" | "acik" | "kesik";

const ANONS_SUS: Record<AnonsTuru, { icon: string; renk: string; zemin: [string, string]; etiket: string }> = {
  ikram: { icon: "amphora", renk: C.goldBright, zemin: ["rgba(92,56,18,0.96)", "rgba(40,24,8,0.96)"], etiket: "onl.han.anons.tur.ikram" },
  armagan: { icon: "gems", renk: C.sage, zemin: ["rgba(34,58,36,0.96)", "rgba(16,28,18,0.96)"], etiket: "onl.han.anons.tur.armagan" },
  debdebe: { icon: "party", renk: "#F3D27A", zemin: ["rgba(96,24,32,0.96)", "rgba(44,10,16,0.96)"], etiket: "onl.han.anons.tur.debdebe" },
  ziyafet: { icon: "bread", renk: C.goldBright, zemin: ["rgba(88,48,14,0.96)", "rgba(36,20,6,0.96)"], etiket: "onl.han.anons.tur.ziyafet" },
};

/** Anons öğesinin adı: ikram menüsü, bilinen armağan/Debdebe öğesi ya da genel ad. */
export function ogeAdi(a: MasaAnonsu, t: Ceviri): string {
  const anahtar = a.tur === "ikram" ? "onl.han.ikram." + a.oge : "onl.han.oge." + a.oge;
  const v = t(anahtar);
  return v === anahtar ? t("onl.han.oge.genel") : v;
}

/** Anons şeridi (sohbet akışında ve masanın üstünde): türüne göre süs, Debdebe'de "yalnız görünüş" notu. */
export function AnonsSeridi({ anons, ad, rtl, t, buyuk = false }: { anons: MasaAnonsu; ad: (hesap: string) => string; rtl: boolean; t: Ceviri; buyuk?: boolean }) {
  const s = ANONS_SUS[anons.tur];
  const metin = applyParams(t("onl.han.anons." + anons.tur), [ad(anons.kim), anons.hedef ? ad(anons.hedef) : "", ogeAdi(anons, t)]);
  return <View accessible accessibilityRole="text" accessibilityLabel={`${t(s.etiket)}. ${metin}`}
    style={[{ borderRadius: 10, borderWidth: anons.tur === "debdebe" ? 2 : 1, borderColor: s.renk, overflow: "hidden" }, buyuk ? { shadowColor: s.renk, shadowOpacity: 0.55, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } } : null]}>
    <LinearGradient pointerEvents="none" colors={s.zemin} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    {anons.tur === "debdebe" ? <View pointerEvents="none" style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: 7, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(243,210,122,0.6)" }} /> : null}
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: buyuk ? 11 : 8 }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: s.renk, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)" }}>
        <GameIcon name={anons.tur === "ikram" ? IKRAM_IKON[anons.oge as IkramId] ?? s.icon : anons.tur === "debdebe" ? debdebeIkon(anons.oge) : s.icon} size={16} color={s.renk} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[{ fontFamily: F.display, fontSize: 10.5, letterSpacing: rtl ? 0 : 1.2, color: s.renk, textAlign: hiza(rtl) }, GOLGE]}>{t(s.etiket)}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 19, color: C.parchment, textAlign: hiza(rtl) }}>{metin}</Text>
        {anons.tur === "debdebe" ? <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.han.anons.yalnizGorunus")}</Text> : null}
      </View>
    </View>
  </View>;
}

/**
 * Ortak seçim öğesi (radyo): "satir" biçimi liste satırı (şikâyet nedeni), "hucre" biçimi ikon + ad + fiyat ızgara hücresi
 * (armağan). Kapalı öğe seçilemez; nedeni `erisim` etiketinde söylenir.
 */
export function SecimOgesi({ bicim, metin, secili, kapali = false, erisim, icon, fiyat, ek, rtl, onPress }: {
  bicim: "satir" | "hucre"; metin: string; secili: boolean; kapali?: boolean; erisim?: string; icon?: string; fiyat?: string; ek?: string; rtl: boolean; onPress: () => void;
}) {
  const kenar = secili ? C.goldBright : bicim === "hucre" ? "rgba(168,130,63,0.5)" : "rgba(168,130,63,0.4)";
  const zemin = secili ? "rgba(90,64,24,0.55)" : "rgba(14,10,6,0.58)";
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected: secili, disabled: kapali }} accessibilityLabel={erisim ?? metin} disabled={kapali}
    onPress={() => { hap("tap"); onPress(); }}
    style={({ pressed }) => (bicim === "hucre"
      ? { width: "48%", flexGrow: 1, minHeight: 96, alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: kenar, backgroundColor: zemin, opacity: kapali ? 0.55 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }
      : { flexDirection: yon(rtl), alignItems: "center", gap: 10, minHeight: 44, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: kenar, backgroundColor: zemin, opacity: kapali ? 0.55 : 1 })}>
    {bicim === "hucre" ? <>
      <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: secili ? C.goldBright : ONL.frame, backgroundColor: "rgba(0,0,0,0.3)" }}>
        <GameIcon name={icon ?? "gems"} size={20} color={secili ? C.goldBright : C.gold} />
      </View>
      <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: 12.5, lineHeight: 15, color: C.parchment, textAlign: "center" }}>{metin}</Text>
      {fiyat ? <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 12, lineHeight: 15, color: C.goldBright, textAlign: "center" }}>{fiyat}</Text> : null}
      {ek ? <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 11.5, lineHeight: 14, color: C.parchmentDim, textAlign: "center" }}>{ek}</Text> : null}
    </> : <>
      <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: secili ? C.goldBright : C.goldDim, alignItems: "center", justifyContent: "center" }}>
        {secili ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.goldBright }} /> : null}
      </View>
      <Text numberOfLines={2} style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchment, textAlign: hiza(rtl) }}>{metin}</Text>
    </>}
  </Pressable>;
}
