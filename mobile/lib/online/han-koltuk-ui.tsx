// Han masası koltuk düzeni: ortada uzun bir han sofrası, üstünde ve altında koltuklar (masa kapasitesi kadar).
// Dolu koltukta portre + ad + işaretler (masa başı, ozan, müdavim, sessize alınmış, söz istiyor, ses, anlatıcı);
// boş koltukta "otur". Konuşanın çevresindeki halka yalnız sunucunun ses durumundan gelir. Armağan kutlaması (≤1,2 sn)
// sofranın üstünde çizilir; sahne ya da atışma varsa sofranın yerine `orta` içerik konur. Animasyonlar Reanimated'dır.
import { useEffect, type ReactNode } from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { GameIcon } from "../icons";
import { C, F } from "../theme";
import { applyParams } from "../i18n";
import { hap } from "../haptics";
import { isReduceMotion } from "../perf";
import { DesignPressable as Pressable } from "../design-pressable";
import { GLOW, HAREKET, buyuyerekBelir, kaybol, yon } from "./ui";
import { KisiYuzu } from "./yasam-ui";
import type { Plaka } from "./han-veri";
import type { PlakaSesi } from "./han-ui";

type Ceviri = (k: string) => string;
export const KONUSMA_RENK = "#7FD89A";
const ARALIK = 6;

/** Koltuktaki kişinin görünür işaretleri (ekranda ve kişi kartında aynı liste). */
export interface KoltukIsaretleri { bas: boolean; ozan: boolean; mudavim: boolean; sessiz: boolean; soz: boolean; anlatici: boolean; ses?: PlakaSesi }
export function isaretler(p: Plaka, o: { bas: string | null; sessiz: string[]; sesi: (h: string) => PlakaSesi | undefined; soz: (h: string) => boolean; anlatici: string | null }): KoltukIsaretleri {
  return { bas: p.hesap === o.bas, ozan: !!p.ozan, mudavim: !!p.mudavim, sessiz: o.sessiz.includes(p.hesap), soz: o.soz(p.hesap), anlatici: p.hesap === o.anlatici, ses: o.sesi(p.hesap) };
}
/** Ekran okuyucu için işaretlerin sözlü dökümü. */
export function isaretMetni(i: KoltukIsaretleri, t: Ceviri): string {
  return [i.bas ? t("onl.han.masaBasi") : "", i.anlatici ? t("onl.han.sahne.anlatici") : "", i.ozan ? t("onl.han.isaret.ozan") : "", i.mudavim ? t("onl.han.isaret.mudavim") : "",
    i.sessiz ? t("onl.han.isaret.sessiz") : "", i.soz ? t("onl.han.isaret.soz") : "", i.ses ? t("onl.ses.plaka." + i.ses) : ""].filter(Boolean).join(", ");
}

/** Konuşanın portresi çevresinde nabız gibi atan halka (UI iş parçacığında); hareket azaltıldıysa durağan halka. */
function KonusmaHalkasi({ boyut }: { boyut: number }) {
  const a = useSharedValue(0);
  const sabit = isReduceMotion();
  useEffect(() => {
    if (sabit) return;
    a.value = withRepeat(withTiming(1, { duration: HAREKET.nabiz, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(a);
  }, [a, sabit]);
  const stil = useAnimatedStyle(() => (sabit ? { opacity: 0.9 } : { opacity: 0.35 + 0.65 * a.value, transform: [{ scale: 1 + 0.07 * a.value }] }));
  const k = boyut + 8;
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", top: -4, left: -4, width: k, height: k, borderRadius: k / 2, borderWidth: 2, borderColor: KONUSMA_RENK }, stil]} />;
}

/** Ad altındaki küçük işaret sırası. */
export function IsaretSirasi({ i, boyut = 12 }: { i: KoltukIsaretleri; boyut?: number }) {
  if (!i.ozan && !i.mudavim && !i.sessiz && !i.soz && !i.ses) return null;
  return <View pointerEvents="none" style={{ flexDirection: "row", gap: 3, alignItems: "center", justifyContent: "center", minHeight: boyut }}>
    {i.ozan ? <GameIcon name="lyre" size={boyut} color={C.goldBright} /> : null}
    {i.mudavim ? <GameIcon name="amphora" size={boyut} color={C.sage} /> : null}
    {i.soz ? <GameIcon name="star" size={boyut} color={C.goldBright} /> : null}
    {i.sessiz ? <GameIcon name="speaker" size={boyut} color={C.parchmentMuted} /> : i.ses && i.ses !== "konusuyor" ? <GameIcon name="speaker" size={boyut} color={i.ses === "kesik" ? C.ember : KONUSMA_RENK} /> : null}
  </View>;
}

/** Portre: Debdebe çerçevesi çift yaldız halka, masa başına taç, konuşana ışık halkası, anlatıcıya kor halkası. */
export function KoltukPortresi({ p, boyut, ben, i }: { p: Plaka; boyut: number; ben: boolean; i: KoltukIsaretleri }) {
  return <View style={{ width: boyut, height: boyut }}>
    {i.ses === "konusuyor" ? <KonusmaHalkasi boyut={boyut} /> : null}
    {i.anlatici ? <View pointerEvents="none" style={{ position: "absolute", top: -5, left: -5, width: boyut + 10, height: boyut + 10, borderRadius: (boyut + 10) / 2, borderWidth: 2, borderColor: C.emberSoft }} /> : null}
    {p.cerceve ? <View pointerEvents="none" style={{ position: "absolute", top: -3, left: -3, width: boyut + 6, height: boyut + 6, borderRadius: (boyut + 6) / 2, borderWidth: 1.5, borderColor: "#F3D27A" }} /> : null}
    <View style={{ opacity: i.sessiz ? 0.6 : 1 }}><KisiYuzu id={p.hesap} ad={p.ad} boyut={boyut} ben={ben} /></View>
    {i.bas ? <View pointerEvents="none" style={{ position: "absolute", top: -8, left: boyut / 2 - 9, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(20,12,4,0.92)", borderWidth: 1, borderColor: C.goldBright }}>
      <GameIcon name="crown" size={11} color={C.goldBright} />
    </View> : null}
  </View>;
}

/** Boş koltuğun "buraya otur" işareti: minder üstünde ince artı (ikon setinde koltuk yok). */
function Arti({ boyut, renk }: { boyut: number; renk: string }) {
  const k = Math.round(boyut * 0.38);
  return <View pointerEvents="none" style={{ width: k, height: k, alignItems: "center", justifyContent: "center" }}>
    <View style={{ position: "absolute", width: k, height: 2, borderRadius: 1, backgroundColor: renk }} />
    <View style={{ position: "absolute", width: 2, height: k, borderRadius: 1, backgroundColor: renk }} />
  </View>;
}

function Koltuk({ p, no, genislik, ben, benOturuyor, isaret, t, onPress }: {
  p: Plaka | null; no: number; genislik: number; ben: boolean; benOturuyor: boolean; isaret?: KoltukIsaretleri; t: Ceviri; onPress: () => void;
}) {
  const boyut = Math.max(36, Math.min(52, genislik - 20));
  const koltuk = applyParams(t("onl.han.koltuk"), [no]);
  // Oturan biri boş koltuğa dokununca yapılacak bir şey yok: kapalı ve haptiksiz.
  const bosKapali = !p && benOturuyor;
  const etiket = p && isaret
    ? [`${koltuk}: ${ben ? t("onl.han.sen") : p.ad}`, isaretMetni(isaret, t)].filter(Boolean).join(", ")
    : `${koltuk}: ${t(benOturuyor ? "onl.han.bosKoltuk" : "onl.han.oturErisim")}`;
  const adStil = { maxWidth: genislik - 4, fontFamily: F.display, fontSize: 12, lineHeight: 15, textAlign: "center" as const };
  return <Pressable accessibilityRole="button" accessibilityLabel={etiket} accessibilityState={{ disabled: bosKapali }} accessibilityHint={p ? t("onl.han.kartIpucu") : undefined}
    disabled={bosKapali} onPress={() => { hap("tap"); onPress(); }}
    style={({ pressed }) => ({ width: genislik, minHeight: 88, alignItems: "center", gap: 4, paddingTop: 8, paddingBottom: 6, borderRadius: 12, transform: [{ scale: pressed ? 0.95 : 1 }],
      backgroundColor: ben ? "rgba(90,64,24,0.35)" : isaret?.anlatici ? "rgba(110,50,16,0.4)" : "rgba(14,10,6,0.35)" })}>
    {/* koltuk minderi: portrenin ardındaki yuvarlak keçe */}
    <View pointerEvents="none" style={{ position: "absolute", top: 4, width: boyut + 12, height: boyut + 12, borderRadius: (boyut + 12) / 2, backgroundColor: p?.masaSusu ? "rgba(122,40,48,0.55)" : "rgba(58,38,18,0.55)", borderWidth: 1, borderColor: p?.masaSusu ? "rgba(243,210,122,0.6)" : "rgba(168,130,63,0.35)" }} />
    {p && isaret ? <>
      <View style={ben ? GLOW : null}><KoltukPortresi p={p} boyut={boyut} ben={ben} i={isaret} /></View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[adStil, { color: isaret.sessiz ? C.parchmentMuted : ben ? C.goldBright : C.parchment }]}>{ben ? t("onl.han.sen") : p.ad}</Text>
      <IsaretSirasi i={isaret} />
    </> : <>
      <View style={{ width: boyut, height: boyut, borderRadius: boyut / 2, borderWidth: 1.5, borderStyle: "dashed", borderColor: bosKapali ? "rgba(168,130,63,0.45)" : C.gold, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(14,10,6,0.6)" }}>
        <Arti boyut={boyut} renk={bosKapali ? C.goldDim : C.goldBright} />
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[adStil, { color: bosKapali ? C.parchmentMuted : C.goldBright }]}>{t(benOturuyor ? "onl.han.bosKoltuk" : "onl.han.otur")}</Text>
    </>}
  </Pressable>;
}

export interface Kutlama { id: string; icon: string; metin: string }

/** Kutlama madalyonu: giriş 300 ms + bekleme + çıkış 220 ms (toplam ≤1,2 sn); hareket azaltıldıysa çağıran göstermez. */
export function KutlamaRozeti({ k }: { k: Kutlama }) {
  return <Animated.View entering={buyuyerekBelir()} exiting={kaybol()} pointerEvents="none"
    style={{ flexDirection: "row", alignItems: "center", gap: 8, maxWidth: "92%", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, borderWidth: 1.5, borderColor: "#F3D27A", backgroundColor: "rgba(60,30,10,0.96)", shadowColor: "#FFB347", shadowOpacity: 0.7, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } }}>
    <GameIcon name={k.icon} size={20} color="#F3D27A" />
    <Text numberOfLines={2} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 12.5, color: C.parchment, textAlign: "center" }}>{k.metin}</Text>
  </Animated.View>;
}

/** Sofra zemini (ahşap, kor ışığı). */
export function SofraZemini({ children, minHeight = 66 }: { children: ReactNode; minHeight?: number }) {
  return <View style={{ minHeight, marginVertical: 4, alignItems: "center", justifyContent: "center" }}>
    <View pointerEvents="none" style={{ position: "absolute", left: 6, right: 6, top: 0, bottom: 0, borderRadius: 33, borderWidth: 2, borderColor: "#6B4F2A", overflow: "hidden", shadowColor: "#FFAA44", shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } }}>
      <LinearGradient colors={["#6A4524", "#3E2714", "#2A190C"]} style={StyleSheet.absoluteFill} />
      <View style={{ position: "absolute", top: 5, left: 5, right: 5, bottom: 5, borderRadius: 28, borderWidth: 1, borderColor: "rgba(232,196,106,0.25)" }} />
    </View>
    {children}
  </View>;
}

/** Sofra: masa no, ayaktakiler ve masanın türü; kutlama madalyonu sofranın üstüne konar. */
function Sofra({ no, ayakta, alt, kutlama, t }: { no: number; ayakta: number; alt?: string; kutlama: Kutlama | null; t: Ceviri }) {
  return <SofraZemini>
    {kutlama ? <KutlamaRozeti key={kutlama.id} k={kutlama} /> : <View accessible accessibilityRole="text" style={{ alignItems: "center", gap: 1, paddingHorizontal: 16, paddingVertical: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <GameIcon name="flame" size={15} color={C.emberSoft} />
        <Text style={{ fontFamily: F.display, fontSize: 12.5, color: C.goldBright }}>{applyParams(t("onl.han.masaNo"), [no])}</Text>
      </View>
      <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentDim, textAlign: "center" }}>{[applyParams(t("onl.han.ayakta"), [ayakta]), alt].filter(Boolean).join(" · ")}</Text>
    </View>}
  </SofraZemini>;
}

/**
 * Koltuk düzeni: koltuklar sofranın iki yanına bölünür (üstte yarısı, altta kalanı; satırda en çok 4 koltuk).
 * 320 px'te koltuk ~67–92 px, en az 88 px yükseklik (büyük yazıda uzar). RTL'de satır sırası aynalanır.
 */
export function KoltukDuzeni({ koltuklar, ben, isaretBul, rtl, t, no, ayakta, alt, kutlama, orta, onKoltuk }: {
  koltuklar: (Plaka | null)[]; ben: string | null; isaretBul: (p: Plaka) => KoltukIsaretleri; rtl: boolean; t: Ceviri;
  no: number; ayakta: number; alt?: string; kutlama: Kutlama | null; orta?: ReactNode; onKoltuk: (i: number, p: Plaka | null) => void;
}) {
  const { width } = useWindowDimensions();
  const W = Math.min(width - 32, 460);
  const n = koltuklar.length;
  const ust = Math.ceil(n / 2);
  const satirda = Math.max(1, Math.min(4, ust));
  const genislik = Math.floor((W - (satirda - 1) * ARALIK) / satirda);
  const benOturuyor = !!ben && koltuklar.some((p) => p?.hesap === ben);
  const satirlar = (bas: number, son: number) => {
    const s: number[][] = [];
    for (let i = bas; i < son; i += satirda) s.push(Array.from({ length: Math.min(satirda, son - i) }, (_, k) => i + k));
    return s;
  };
  const ciz = (dizi: number[], k: number) => <View key={k} style={{ flexDirection: yon(rtl), justifyContent: "center", gap: ARALIK }}>
    {dizi.map((i) => {
      const p = koltuklar[i] ?? null;
      return <Koltuk key={i} p={p} no={i + 1} genislik={genislik} ben={!!p && p.hesap === ben} benOturuyor={benOturuyor} isaret={p ? isaretBul(p) : undefined} t={t} onPress={() => onKoltuk(i, p)} />;
    })}
  </View>;
  return <View style={{ width: W, alignSelf: "center", gap: ARALIK }}>
    {satirlar(0, ust).map(ciz)}
    {orta ?? <Sofra no={no} ayakta={ayakta} alt={alt} kutlama={kutlama} t={t} />}
    {satirlar(ust, n).map((d, k) => ciz(d, 100 + k))}
  </View>;
}
