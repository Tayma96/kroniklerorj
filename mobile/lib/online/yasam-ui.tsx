// Faz 2 (yaşayan yerleşim) ekranlarının ortak parçaları: sayfa iskeleti ve alt menü, kişi yüzü (portre ya da
// monogram sikke), oyuncu mührü, takat göstergesi, öğrenme şeridi, görüş ölçeği, şans halkası, rozet, alt panel.
// Görsel dil Faz 1 (lib/online/ui.tsx) ve oyunun alt menüsüyle aynıdır; tek oyunculu motor ya da kayıt içe aktarılmaz.
import { useEffect, useRef, type ReactNode } from "react";
import { View, Text, Image, Modal, ScrollView, ActivityIndicator, StyleSheet, useWindowDimensions, type ImageSourcePropType } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { DesignPressable as Pressable } from "../design-pressable";
import { GameIcon } from "../icons";
import { C, F } from "../theme";
import { hap } from "../haptics";
import { isReduceMotion } from "../perf";
import { portreImage } from "../assets";
import { npcPortreFrame } from "../npc-portre";
import { applyParams } from "../i18n";
import { Bant, GLOW, ONL, Ornament, Check, Ok, Sahne, hiza, yon } from "./ui";
import { SISTEM_IKON, isaretli } from "./metin";
import { hataAnahtari } from "./hata";
import { useOnline } from "./durum";
import type { Cinsiyet, Isaret, Mevsim, OgrenmeDurumu, Odul, YerlesimTuru } from "./protokol";

type Ceviri = (k: string) => string;

const KASABA: Record<Mevsim, ImageSourcePropType> = {
  kis: require("../../assets/tasarim/v4/town-kis.jpg"),
  ilkbahar: require("../../assets/tasarim/v4/town-ilkbahar.jpg"),
  yaz: require("../../assets/tasarim/v4/town-yaz.jpg"),
  sonbahar: require("../../assets/tasarim/v4/town-sonbahar.jpg"),
};
const KOY: Record<Mevsim, ImageSourcePropType> = {
  kis: require("../../assets/hero/cocuk_kis.jpg"),
  ilkbahar: require("../../assets/hero/cocuk_ilkbahar.jpg"),
  yaz: require("../../assets/hero/cocuk_yaz.jpg"),
  sonbahar: require("../../assets/hero/cocuk_sonbahar.jpg"),
};
/** Sayfa zemini: kasaba/şehirde mevsimin kasaba resmi, köyde köy resmi. */
export const sahneGorseli = (tur: YerlesimTuru | undefined, mevsim: Mevsim | undefined) => (tur === "koy" ? KOY : KASABA)[mevsim ?? "yaz"] ?? KASABA.yaz;
/** Mahalle haritası her yerleşimde kasaba resmidir (iğne yerleri bu resme göre ayarlı). */
export const haritaGorseli = (mevsim: Mevsim | undefined) => KASABA[mevsim ?? "yaz"] ?? KASABA.yaz;
const GOLGE = { textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } };

// ---------------------------------------------------------------- sayfa iskeleti ve alt menü

export type Sekme = "yasam" | "mahalle" | "tanidiklar" | "karakter";
const SEKMELER: readonly { id: Sekme; yol: string; icon: string; etiket: string }[] = [
  { id: "yasam", yol: "/online/yasam", icon: "house", etiket: "onl.nav.yasam" },
  { id: "mahalle", yol: "/online/mahalle", icon: "map", etiket: "onl.nav.mahalle" },
  { id: "tanidiklar", yol: "/online/tanidiklar", icon: "family", etiket: "onl.nav.tanidiklar" },
  { id: "karakter", yol: "/online/karakter", icon: "hood", etiket: "onl.nav.karakter" },
];
export const MENU_YUKSEKLIK = 62;

/** Çevrimiçi alt menü: oyunun koyu ahşap menüsüyle aynı dil, dört sekme (Yaşam · Mahalle · Tanıdıklar · Karakter). */
export function AltMenu({ aktif, rtl, t, rozet }: { aktif: Sekme; rtl: boolean; t: Ceviri; rozet?: Partial<Record<Sekme, boolean>> }) {
  const router = useRouter();
  const ins = useSafeAreaInsets();
  const dar = useWindowDimensions().width < 360;
  return <View accessibilityRole="tablist" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: MENU_YUKSEKLIK + ins.bottom, paddingBottom: ins.bottom, shadowColor: "#000", shadowOpacity: 0.6, shadowRadius: 10, shadowOffset: { width: 0, height: -4 }, elevation: 16 }}>
    <LinearGradient pointerEvents="none" colors={["#2B1F12", "#1B140B", "#110C07"]} style={StyleSheet.absoluteFill} />
    <LinearGradient pointerEvents="none" start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={["#6B4F2A", "#E8C46A", "#6B4F2A"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1.5 }} />
    <View style={{ flex: 1, flexDirection: yon(rtl) }}>
      {SEKMELER.map((s, i) => {
        const secili = s.id === aktif;
        return <Pressable key={s.id} accessibilityRole="tab" accessibilityLabel={t(s.etiket)} accessibilityState={{ selected: secili }}
          onPress={() => { if (secili) return; hap("tap"); router.replace(s.yol); }}
          style={({ pressed }) => ({ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 6, opacity: pressed ? 0.75 : 1 })}>
          {i > 0 ? <View pointerEvents="none" style={[{ position: "absolute", top: 14, bottom: 14, width: 1, backgroundColor: "rgba(205,185,143,0.16)" }, rtl ? { right: 0 } : { left: 0 }]} /> : null}
          {secili ? <View pointerEvents="none" style={{ position: "absolute", top: 0, width: 34, height: 2.5, borderRadius: 2, backgroundColor: C.goldBright }} /> : null}
          <View style={{ shadowColor: C.goldBright, shadowOpacity: secili ? 0.85 : 0, shadowRadius: 9 }}>
            <GameIcon name={s.icon} size={secili ? 24 : 22} color={secili ? C.goldBright : "#E6D6B4"} />
            {rozet?.[s.id] ? <View pointerEvents="none" style={{ position: "absolute", top: -2, right: -6, width: 10, height: 10, borderRadius: 5, backgroundColor: "#B5331F", borderWidth: 1.5, borderColor: "#1B130A" }} /> : null}
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ marginTop: 3, fontFamily: F.serif, fontSize: dar ? 11 : 12.5, lineHeight: 16, color: secili ? C.goldBright : "#E6D6B4", textAlign: "center", paddingHorizontal: 2 }}>{t(s.etiket)}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}

/** Sahne zeminli kaydırılabilir sayfa; sekme verilirse alt menü de çizilir. */
export function OnlineSayfa({ gorsel, oran = 0.42, sekme, rtl, t, rozet, children, alt }: { gorsel: ImageSourcePropType; oran?: number; sekme?: Sekme; rtl: boolean; t: Ceviri; rozet?: Partial<Record<Sekme, boolean>>; children: ReactNode; alt?: ReactNode }) {
  const ins = useSafeAreaInsets();
  return <Sahne gorsel={gorsel} oran={oran} koyu={0.22}>
    <ScrollView contentContainerStyle={{ paddingTop: ins.top + 8, paddingHorizontal: 16, paddingBottom: (sekme ? MENU_YUKSEKLIK : 0) + ins.bottom + 28 }}>
      {children}
    </ScrollView>
    {alt}
    {sekme ? <AltMenu aktif={sekme} rtl={rtl} t={t} rozet={rozet} /> : null}
  </Sahne>;
}

/** Sayfa başı: küçük üst yazı, başlık, alt satır; yanında isteğe bağlı sağ parça (takat rozeti). */
export function SayfaBasi({ ust, baslik, alt, sag, rtl, sol }: { ust: string; baslik: string; alt?: string; sag?: ReactNode; sol?: ReactNode; rtl: boolean }) {
  return <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
    {sol}
    <View style={{ flex: 1 }}>
      <Text style={[{ fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 2, color: C.goldBright, textAlign: hiza(rtl) }, GOLGE]}>{ust}</Text>
      <Text accessibilityRole="header" numberOfLines={2} style={[{ fontFamily: F.display, fontSize: 25, lineHeight: 32, color: C.parchment, textAlign: hiza(rtl) }, GOLGE]}>{baslik}</Text>
      {alt ? <Text style={[{ fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }, GOLGE]}>{alt}</Text> : null}
    </View>
    {sag}
  </View>;
}

/** Bölüm başlığı: süs, başlık, çizgi; isteğe bağlı sağda sayı ya da bağlantı. */
export function Baslik2({ metin, rtl, sag, ust = 22 }: { metin: string; rtl: boolean; sag?: ReactNode; ust?: number }) {
  return <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, marginTop: ust, marginBottom: 10 }}>
    <Ornament size={13} />
    <Text accessibilityRole="header" style={[{ flexShrink: 1, fontFamily: F.display, fontSize: 13, letterSpacing: rtl ? 0 : 1.6, color: C.goldBright }, GOLGE]}>{metin}</Text>
    <View style={{ flex: 1, minWidth: 12, height: 1, backgroundColor: "rgba(201,162,78,0.3)" }} />
    {sag}
  </View>;
}

// ---------------------------------------------------------------- kişi yüzü ve mühür

const MONOGRAM = [["#5A3A1E", "#2A1A0E"], ["#2F4330", "#162016"], ["#4A2A3E", "#21141D"], ["#26404A", "#122026"], ["#4E4224", "#241D0F"]] as const;
function karistir(s: string): number {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}
function basHarfler(ad: string): string {
  const p = ad.trim().split(/\s+/).filter(Boolean);
  const h = (x?: string) => (x ? [...x][0] : "");
  return (h(p[0]) + (p.length > 1 ? h(p[p.length - 1]) : "")).toLocaleUpperCase();
}

/** Oyuncu mührü: kırmızı balmumu üstünde altın yıldız (listelerde gerçek oyuncuyu ayırır). */
export function Muhur({ boyut = 18 }: { boyut?: number }) {
  return <View pointerEvents="none" style={{ width: boyut, height: boyut, borderRadius: boyut / 2, borderWidth: 1.5, borderColor: "#E9C46A", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
    <LinearGradient colors={["#C2432F", "#7A1E14"]} style={StyleSheet.absoluteFill} />
    <GameIcon name="star" size={Math.round(boyut * 0.58)} color="#FCE7A6" />
  </View>;
}

/** Önbellekteki profilden portre bilgisi (GET /v1/kisi); yoksa boş: yüz monogram çizilir. */
export function yuzBilgisi(kisiler: Record<string, { yas: number; cinsiyet: Cinsiyet }>, id: string): { yas?: number; cinsiyet?: Cinsiyet } {
  const k = kisiler[id];
  return k ? { yas: k.yas, cinsiyet: k.cinsiyet } : {};
}

export const ISARET_RENK: Record<Isaret, string> = { tanidik: C.gold, dost: C.sage, dusman: C.blood };

/**
 * Kişi yüzü: yaşı ve cinsiyeti biliniyorsa (profil önbelleği) kalıcı NPC portresi, yoksa ada göre monogram sikke.
 * Oyuncuya mühür, işaretliye renkli kenar.
 */
export function KisiYuzu({ id, ad, boyut = 52, yas, cinsiyet, oyuncu, ben, isaret }: { id: string; ad: string; boyut?: number; yas?: number; cinsiyet?: Cinsiyet; oyuncu?: boolean; ben?: boolean; isaret?: Isaret | null }) {
  const bilinen = yas !== undefined && !!cinsiyet;
  const cerceve = bilinen && !ben ? npcPortreFrame(yas, cinsiyet, id) : null;
  const kaynak = bilinen ? cerceve?.source ?? portreImage(yas, cinsiyet) : null;
  const atlas = cerceve != null && cerceve.columns > 1;
  const halka = isaret ? ISARET_RENK[isaret] : ben ? C.goldBright : oyuncu ? "#E9C46A" : ONL.frame;
  const ic = boyut - 4;
  const renk = MONOGRAM[karistir(id) % MONOGRAM.length];
  return <View accessible={false} style={{ width: boyut, height: boyut }}>
    <View style={[{ width: boyut, height: boyut, borderRadius: boyut / 2, borderWidth: 2, borderColor: halka, overflow: "hidden", backgroundColor: C.cardHi }, ben ? GLOW : null]}>
      {kaynak ? <View style={{ width: ic, height: ic, overflow: "hidden" }}>
        <Image accessible={false} source={kaynak} resizeMode={atlas ? "stretch" : "cover"}
          style={atlas && cerceve ? { position: "absolute", width: ic * cerceve.columns, height: ic * cerceve.rows, left: -ic * cerceve.column, top: -ic * cerceve.row } : { width: "100%", height: "100%" }} />
      </View> : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <LinearGradient colors={[renk[0], renk[1]]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: boyut / 2, borderWidth: 1, borderColor: "rgba(226,182,90,0.28)" }} />
        <Text style={{ fontFamily: F.display, fontSize: Math.round(boyut * 0.34), color: "#F0D490", letterSpacing: 0.5 }}>{basHarfler(ad)}</Text>
      </View>}
    </View>
    {oyuncu ? <View pointerEvents="none" style={{ position: "absolute", bottom: -2, right: -2 }}><Muhur boyut={Math.max(16, Math.round(boyut * 0.36))} /></View> : null}
  </View>;
}

// ---------------------------------------------------------------- takat, para, rozetler

/** Küçük sayaç hapı (takat, akçe …). */
export function Hap({ icon, metin, erisim, renk = C.goldBright, vurgulu = false }: { icon: string; metin: string; erisim: string; renk?: string; vurgulu?: boolean }) {
  return <View accessible accessibilityLabel={erisim} style={[{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 32, paddingHorizontal: 11, borderRadius: 16, borderWidth: 1, borderColor: vurgulu ? C.goldBright : "rgba(201,162,78,0.55)", backgroundColor: "rgba(14,10,6,0.82)" }, vurgulu ? GLOW : null]}>
    <GameIcon name={icon} size={15} color={renk} />
    <Text style={{ fontFamily: F.display, fontSize: 13.5, color: C.parchment }}>{metin}</Text>
  </View>;
}

export function TakatHapi({ kalan, tavan, t }: { kalan: number; tavan: number; t: Ceviri }) {
  return <Hap icon="flame" metin={`${kalan}/${tavan}`} erisim={applyParams(t("onl.ya.takatErisim"), [kalan, tavan])} renk={kalan > 0 ? C.emberSoft : C.parchmentMuted} />;
}

/** Takat: büyük madalyon + ayda gelen 6'lık üç küme (bu ay ve taşınabilen iki ay); tavanın üstü birikmez. */
export function TakatGostergesi({ kalan, tavan, aylik, rtl, t }: { kalan: number; tavan: number; aylik: number; rtl: boolean; t: Ceviri }) {
  const kume = Math.max(1, Math.round(tavan / Math.max(1, aylik)));
  return <View accessible accessibilityLabel={`${applyParams(t("onl.ya.takatErisim"), [kalan, tavan])}. ${applyParams(t("onl.ya.takatNot"), [aylik, kume - 1, tavan])}`}
    style={{ flexDirection: yon(rtl), alignItems: "center", gap: 14 }}>
    <View style={[{ width: 66, height: 66, borderRadius: 33, borderWidth: 2, borderColor: kalan > 0 ? C.goldBright : ONL.frame, alignItems: "center", justifyContent: "center", overflow: "hidden" }, kalan > 0 ? GLOW : null]}>
      <LinearGradient colors={kalan > 0 ? ["#5A3214", "#2A160A"] : [C.cardHi, C.surface]} style={StyleSheet.absoluteFill} />
      <View style={{ position: "absolute", top: 6 }}><GameIcon name="flame" size={20} color={kalan > 0 ? C.emberSoft : C.parchmentMuted} /></View>
      <Text style={{ marginTop: 16, fontFamily: F.display, fontSize: 24, color: C.parchment }}>{kalan}</Text>
    </View>
    <View style={{ flex: 1, gap: 7 }}>
      <View style={{ flexDirection: yon(rtl), alignItems: "baseline", gap: 8 }}>
        <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: rtl ? 0 : 1.6, color: C.goldBright }}>{t("onl.ya.takat")}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentDim }}>{`${kalan} / ${tavan}`}</Text>
      </View>
      <View style={{ flexDirection: yon(rtl), gap: 8 }}>
        {Array.from({ length: kume }, (_, k) => <View key={k} style={{ flex: 1, flexDirection: yon(rtl), justifyContent: "space-between", paddingVertical: 4, paddingHorizontal: 4, borderRadius: 5, backgroundColor: k === 0 ? "rgba(201,162,78,0.1)" : "rgba(0,0,0,0.25)" }}>
          {Array.from({ length: aylik }, (_, i) => {
            const dolu = k * aylik + i < kalan;
            return <View key={i} style={{ width: 7, height: 7, transform: [{ rotate: "45deg" }], backgroundColor: dolu ? C.goldBright : "transparent", borderWidth: 1, borderColor: dolu ? C.goldBright : "rgba(201,162,78,0.45)" }} />;
          })}
        </View>)}
      </View>
      <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{applyParams(t("onl.ya.takatNot"), [aylik, kume - 1, tavan])}</Text>
    </View>
  </View>;
}

/** Küçük metin rozeti (huy, gündem, mekân …). */
export function Rozet({ metin, icon, renk = C.gold, dolu = false }: { metin: string; icon?: string; renk?: string; dolu?: boolean }) {
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: renk, backgroundColor: dolu ? renk : "rgba(14,10,6,0.6)" }}>
    {icon ? <GameIcon name={icon} size={12} color={dolu ? C.inkOnGold : renk} /> : null}
    <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 11, letterSpacing: 0.4, color: dolu ? C.inkOnGold : C.parchment }}>{metin}</Text>
  </View>;
}

export function IsaretRozeti({ isaret, t }: { isaret: Isaret; t: Ceviri }) {
  return <Rozet metin={t("onl.isaret." + isaret)} renk={ISARET_RENK[isaret]} dolu={isaret !== "tanidik"} />;
}

// ---------------------------------------------------------------- görüş ölçeği ve şans halkası

export const gorusRengi = (d: number) => (d >= 25 ? C.sage : d >= 8 ? "#B9C27A" : d > -8 ? C.parchmentMuted : d > -25 ? C.ember : C.blood);

/** −100 … +100 ölçeği: ortadan dolar (olumlu okuma yönünde). */
export function GorusOlcegi({ deger, rtl, yukseklik = 6 }: { deger: number; rtl: boolean; yukseklik?: number }) {
  const oran = Math.min(1, Math.abs(deger) / 100);
  const renk = gorusRengi(deger);
  const yarim = (olumlu: boolean) => <View style={{ flex: 1, flexDirection: olumlu === !rtl ? "row" : "row-reverse" }}>
    {(deger > 0) === olumlu && deger !== 0 ? <View style={{ width: `${Math.max(oran * 100, 4)}%`, backgroundColor: renk, borderRadius: 3 }} /> : null}
  </View>;
  return <View style={{ height: yukseklik, borderRadius: 3, backgroundColor: "rgba(201,162,78,0.14)", flexDirection: "row", overflow: "hidden" }}>
    {yarim(rtl)}
    <View style={{ width: 2, backgroundColor: "rgba(243,210,122,0.55)" }} />
    {yarim(!rtl)}
  </View>;
}

export const sansRengi = (y: number) => (y >= 70 ? C.sage : y >= 40 ? C.gold : C.ember);

/** Yüzde halkası (kabul şansı). */
export function SansHalkasi({ yuzde, boyut = 52, kilitli = false }: { yuzde: number; boyut?: number; kilitli?: boolean }) {
  const r = boyut / 2 - 4;
  const cevre = 2 * Math.PI * r;
  const renk = kilitli ? C.parchmentMuted : sansRengi(yuzde);
  return <View style={{ width: boyut, height: boyut, alignItems: "center", justifyContent: "center" }}>
    <Svg width={boyut} height={boyut} style={StyleSheet.absoluteFill}>
      <Circle cx={boyut / 2} cy={boyut / 2} r={r} stroke="rgba(201,162,78,0.2)" strokeWidth={4} fill="rgba(14,10,6,0.7)" />
      <Circle cx={boyut / 2} cy={boyut / 2} r={r} stroke={renk} strokeWidth={4} fill="none" strokeLinecap="round"
        strokeDasharray={`${(cevre * Math.max(0, Math.min(100, yuzde))) / 100} ${cevre}`} transform={`rotate(-90 ${boyut / 2} ${boyut / 2})`} />
    </Svg>
    <Text style={{ fontFamily: F.display, fontSize: Math.round(boyut * 0.27), color: kilitli ? C.parchmentMuted : C.parchment }}>{`${yuzde}%`}</Text>
  </View>;
}

// ---------------------------------------------------------------- öğrenme dönemi

export type GunDurumu = "tamam" | "kacti" | "bugun" | "kapali";
export function gunDurumu(g: { gun: number; tamam: boolean; acik: boolean }, bugun: number): GunDurumu {
  if (g.tamam) return "tamam";
  if (!g.acik) return "kapali";
  return g.gun < bugun ? "kacti" : "bugun";
}

/** 6 günlük şerit: tamam (altın onay), kaçan (köz kenar), bugün (parlayan), kapalı (soluk). */
export function OgrenmeSeridi({ ogrenme, rtl, t, onSec, secili }: { ogrenme: OgrenmeDurumu; rtl: boolean; t: Ceviri; onSec?: (gun: number) => void; secili?: number }) {
  const P = 38;
  return <View>
    <View pointerEvents="none" style={{ position: "absolute", top: P / 2 + 3, left: 24, right: 24, height: 2, backgroundColor: "rgba(168,130,63,0.35)" }} />
    <View style={{ flexDirection: yon(rtl), justifyContent: "space-between" }}>
      {ogrenme.gunler.map((g) => {
        const d = gunDurumu(g, ogrenme.gun);
        const vurgu = secili === g.gun;
        const kenar = d === "tamam" || d === "bugun" ? C.goldBright : d === "kacti" ? C.ember : "rgba(168,130,63,0.5)";
        const zemin = d === "tamam" ? C.gold : d === "bugun" ? C.cardHi : "rgba(14,10,6,0.95)";
        return <Pressable key={g.gun} disabled={!onSec} accessibilityLabel={`${applyParams(t("onl.ya.gunN"), [g.gun])}: ${t("onl.ogrenme.sistem." + g.sistem)} · ${t("onl.ya.durum." + d)}`}
          accessibilityState={{ selected: vurgu, disabled: !onSec }} onPress={() => { hap("selection"); onSec?.(g.gun); }}
          style={{ width: 46, alignItems: "center", paddingTop: 3 }}>
          <View style={[{ width: P, height: P, borderRadius: P / 2, alignItems: "center", justifyContent: "center", borderWidth: d === "bugun" || vurgu ? 2 : 1.5, borderColor: vurgu ? C.parchment : kenar, backgroundColor: zemin }, d === "bugun" ? GLOW : null]}>
            {d === "tamam" ? <Check size={16} /> : <GameIcon name={SISTEM_IKON[g.sistem] ?? "scroll"} size={17} color={d === "bugun" ? C.goldBright : d === "kacti" ? C.emberSoft : C.parchmentMuted} />}
            {d === "kacti" ? <View pointerEvents="none" style={{ position: "absolute", top: -3, right: -3, width: 13, height: 13, borderRadius: 7, backgroundColor: C.ember, borderWidth: 1.5, borderColor: "#1B130A", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 8.5, lineHeight: 10, color: "#1B130A" }}>!</Text>
            </View> : null}
          </View>
          <Text style={{ marginTop: 4, fontFamily: F.display, fontSize: 10.5, color: d === "bugun" ? C.goldBright : d === "kacti" ? C.emberSoft : d === "tamam" ? C.gold : C.parchmentMuted }}>{applyParams(t("onl.ya.gunKisa"), [g.gun])}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}

/** Öğrenme ödülü metni: "+3 akçe", "+2 Zanaat", "+1 özellik puanı". */
export function odulYaz(o: Odul, t: Ceviri): string {
  const p: string[] = [];
  if (o.para) p.push(applyParams(t("onl.odul.para"), [o.para]));
  if (o.beceri) p.push(`+${o.beceri[1]} ${t("onl.beceri." + o.beceri[0])}`);
  if (o.ozellikPuani) p.push(applyParams(t("onl.odul.puan"), [o.ozellikPuani]));
  return p.join(" · ");
}

// ---------------------------------------------------------------- alt panel, boş durum, yükleniyor

/** Alttan açılan panel (eylem dökümü ve sonuç). Sade modda kayarak değil, birden açılır. */
export function AltPanel({ acik, onKapat, etiket, children, rtl, t }: { acik: boolean; onKapat: () => void; etiket: string; children: ReactNode; rtl: boolean; t: Ceviri }) {
  const ins = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return <Modal visible={acik} transparent animationType={isReduceMotion() ? "none" : "fade"} onRequestClose={onKapat} statusBarTranslucent>
    <View style={{ flex: 1, justifyContent: "flex-end" }}>
      <Pressable accessibilityLabel={t("onl.kapat")} onPress={onKapat} style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(6,4,2,0.72)" }]} />
      <View accessibilityViewIsModal accessibilityLabel={etiket} style={{ maxHeight: height * 0.9, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 1.5, borderBottomWidth: 0, borderColor: ONL.frameHi, overflow: "hidden" }}>
        <LinearGradient colors={["#2A1F13", "#17110A"]} style={StyleSheet.absoluteFill} />
        <View style={{ alignItems: "center", paddingTop: 8 }}><View style={{ width: 44, height: 4, borderRadius: 2, backgroundColor: "rgba(201,162,78,0.5)" }} /></View>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: ins.bottom + 20, gap: 14 }}>
          {children}
        </ScrollView>
        <Pressable accessibilityLabel={t("onl.kapat")} onPress={onKapat} style={[{ position: "absolute", top: 6 }, rtl ? { left: 8 } : { right: 8 }]}>
          <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: ONL.frame, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(14,10,6,0.8)" }}>
            <Text style={{ fontFamily: F.display, fontSize: 15, lineHeight: 18, color: C.goldBright }}>×</Text>
          </View>
        </Pressable>
      </View>
    </View>
  </Modal>;
}

export function BosKart({ icon, metin, rtl }: { icon: string; metin: string; rtl: boolean }) {
  return <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 12, padding: 14, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(201,162,78,0.35)", backgroundColor: "rgba(14,10,6,0.55)" }}>
    <GameIcon name={icon} size={20} color={C.parchmentMuted} />
    <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, lineHeight: 21, color: C.parchmentDim, textAlign: hiza(rtl) }}>{metin}</Text>
  </View>;
}

export function Yukleniyor({ metin }: { metin: string }) {
  return <View accessibilityRole="progressbar" accessibilityLabel={metin} style={{ alignItems: "center", gap: 10, paddingVertical: 40 }}>
    <ActivityIndicator color={C.goldBright} />
    <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentDim }}>{metin}</Text>
  </View>;
}

/** Satır sonu oku (dokunulabilir satırlar için). */
export function SatirOku({ rtl }: { rtl: boolean }) {
  return <Ok ileri rtl={rtl} size={14} color={C.goldDim} />;
}

/** Değişim satırı: +4 görüş, +1 Söz, −2 akçe … */
export function Degisim({ icon, metin, olumlu }: { icon: string; metin: string; olumlu: boolean }) {
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: olumlu ? "rgba(122,154,92,0.7)" : "rgba(200,90,64,0.7)", backgroundColor: olumlu ? "rgba(52,72,38,0.45)" : "rgba(72,28,18,0.45)" }}>
    <GameIcon name={icon} size={14} color={olumlu ? C.sage : C.ember} />
    <Text style={{ fontFamily: F.display, fontSize: 12.5, color: C.parchment }}>{metin}</Text>
  </View>;
}

/** Bir kez yükle: ekran açılınca (ve gerekirse) veriyi çağırır. */
export function useBirKez(is: () => void, kosul: boolean) {
  const yapildi = useRef(false);
  useEffect(() => {
    if (yapildi.current || !kosul) return;
    yapildi.current = true;
    is();
  }, [kosul]); // eslint-disable-line react-hooks/exhaustive-deps
}

export { isaretli };

/** Faz 2 ekranlarının ortak açılışı: profil varsa yerleşim durumunu bir kez yükler. */
export function useYerlesimEkrani() {
  const o = useOnline();
  useEffect(() => {
    if (o.profil && !o.yerlesim) void o.yerlesimYukle();
  }, [o.profil?.hesapId]); // eslint-disable-line react-hooks/exhaustive-deps
  return o;
}

/** Yerleşim henüz yokken: profil yok (girişe dön), yükleniyor ya da hata (yeniden dene). */
export function YerlesimBekle({ sekme, rtl, t, onGiris }: { sekme?: Sekme; rtl: boolean; t: Ceviri; onGiris: () => void }) {
  const o = useOnline();
  const hata = o.hataIslem === "yerlesim" ? o.hata : null;
  return <OnlineSayfa gorsel={KASABA.yaz} oran={0.4} sekme={o.profil ? sekme : undefined} rtl={rtl} t={t}>
    <View style={{ minHeight: 220 }} />
    {!o.profil && o.hazir ? <Bant tur="bilgi" metin={t("onl.v.profilYok")} rtl={rtl} eylem={t("onl.p.giriseDon")} onEylem={onGiris} />
      : hata ? <Bant metin={t(hataAnahtari(hata))} rtl={rtl} eylem={t("onl.yenidenDene")} onEylem={() => { void o.yerlesimYukle(); }} />
      : <Yukleniyor metin={t("onl.ya.yukleniyor")} />}
  </OnlineSayfa>;
}
