// H8 ozan sahnesi ve atışma arayüzü: sofranın yerine konan sahne şeridi ve atışma panosu, sohbet akışındaki kıta balonu,
// sırası gelen tarafın kıta kutusu ve oylama düğmeleri. Durum yalnız sunucudan gelir (sahne/atisma çerçeveleri);
// istemci sırayı, oyu ya da sonucu hesaplamaz, yalnız "şu an ne oluyor, ben ne yapabilirim"i gösterir.
import { useState } from "react";
import { View, Text, TextInput } from "react-native";
import Animated from "react-native-reanimated";
import { GameIcon } from "../icons";
import { C, F } from "../theme";
import { applyParams } from "../i18n";
import { hap } from "../haptics";
import { DesignPressable as Pressable } from "../design-pressable";
import { AltinDugme, CizgiDugme, ONL, buyuyerekBelir, hiza, yon } from "./ui";
import { KisiYuzu } from "./yasam-ui";
import { SofraZemini } from "./han-koltuk-ui";
import { KITA_EN_UZUN, KITA_SATIR, harfSayisi, type AtismaGorunumu, type AtismaSonucu, type Plaka, type SahneGorunumu } from "./han-veri";

type Ceviri = (k: string) => string;
const A_RENK = "#E2B65A";
const B_RENK = "#9FC7E8";
const notStil = (rtl: boolean) => ({ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }) as const;

/** Kıta metni: satır sonları korunur; satır başı/sonu boşlukları ve boş satır fazlası sunucuya gitmeden temizlenir. */
export const kitaTemizle = (s: string) => s.replace(/\r/g, "").split("\n").map((x) => x.replace(/\s{2,}/g, " ").trim()).filter((x, i, d) => x || (i > 0 && d[i - 1])).join("\n").trim();
export const kitaSatir = (s: string) => (s ? s.split("\n").length : 0);

/** Sahne şeridi (sofranın yerinde): anlatıcının portresi + "anlatıyor"; anlatıcı ve masa başı için "Sahneyi kapat". */
export function SahneSeridi({ sahne, anlaticiAd, ben, basBen, acik, rtl, t, onKapat }: {
  sahne: SahneGorunumu; anlaticiAd: string; ben: string | null; basBen: boolean; acik: boolean; rtl: boolean; t: Ceviri; onKapat: () => void;
}) {
  const kapatabilir = sahne.anlatici === ben || basBen;
  return <SofraZemini minHeight={kapatabilir ? 112 : 72}>
    <View style={{ alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8, width: "100%" }}>
      <View accessible accessibilityRole="text" accessibilityLabel={`${t("onl.han.sahne.baslik")}. ${applyParams(t("onl.han.sahne.anlatiyor"), [anlaticiAd])}`} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
        <KisiYuzu id={sahne.anlatici} ad={anlaticiAd} boyut={34} ben={sahne.anlatici === ben} />
        <View style={{ flexShrink: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: rtl ? 0 : 1.2, color: C.emberSoft, textAlign: hiza(rtl) }}>{t("onl.han.sahne.baslik")}</Text>
          <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment, textAlign: hiza(rtl) }}>{applyParams(t("onl.han.sahne.anlatiyor"), [sahne.anlatici === ben ? t("onl.han.sen") : anlaticiAd])}</Text>
        </View>
        <GameIcon name="lyre" size={18} color={C.goldBright} />
      </View>
      {kapatabilir ? <View style={{ alignSelf: "stretch", paddingHorizontal: 18 }}><CizgiDugme etiket={t("onl.han.sahne.kapat")} icon="walk" rtl={rtl} kucuk kapali={!acik} onPress={onKapat} /></View> : null}
    </View>
  </SofraZemini>;
}

/** Atışma tarafı: portre, ad, ozan sazı; sırası gelen taraf parlar. */
function Taraf({ p, ad, renk, vurgu, kazanan, rtl, t }: { p: Plaka | undefined; ad: string; renk: string; vurgu: boolean; kazanan?: boolean; rtl: boolean; t: Ceviri }) {
  return <View style={{ flex: 1, alignItems: "center", gap: 4, paddingVertical: 6, borderRadius: 12, borderWidth: vurgu ? 1.5 : 1, borderColor: vurgu ? renk : "rgba(168,130,63,0.3)", backgroundColor: vurgu ? "rgba(70,44,16,0.7)" : "rgba(14,10,6,0.5)" }}>
    <View>
      <KisiYuzu id={p?.hesap ?? ad} ad={ad} boyut={44} />
      {p?.ozan ? <View style={[{ position: "absolute", bottom: -4, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(20,12,4,0.92)", borderWidth: 1, borderColor: C.goldBright }, rtl ? { left: -4 } : { right: -4 }]}>
        <GameIcon name="lyre" size={11} color={C.goldBright} />
      </View> : null}
      {kazanan ? <View style={{ position: "absolute", top: -9, left: 13, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(20,12,4,0.92)", borderWidth: 1, borderColor: C.goldBright }}>
        <GameIcon name="trophy" size={11} color={C.goldBright} />
      </View> : null}
    </View>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ maxWidth: "94%", fontFamily: F.display, fontSize: 12, color: renk, textAlign: "center" }}>{ad}</Text>
    {vurgu ? <Text style={{ fontFamily: F.serif, fontSize: 11.5, color: C.parchmentDim }}>{t("onl.han.atisma.siraBunda")}</Text> : null}
  </View>;
}

const SONUC_ANAHTAR: Record<AtismaSonucu["sonuc"], string> = {
  kazandi: "onl.han.atisma.sonuc.kazandi", berabere: "onl.han.atisma.sonuc.berabere", hukumsuz: "onl.han.atisma.sonuc.hukumsuz", iptal: "onl.han.atisma.sonuc.iptal",
};

/**
 * Atışma panosu (sofranın yerinde): iki taraf karşı karşıya, ortada kıta sayacı ya da oylama; oylamada oy hakkı olanlara
 * iki büyük oy düğmesi. Sonuç geldiğinde kazanan ve oy dökümü kısa süre görünür (büyüyerek belirir; hareket azaltıldıysa yalnız metin).
 */
export function AtismaPanosu({ atisma, son, plaka, ad, ben, basBen, acik, rtl, t, onOy, onBitir }: {
  atisma: AtismaGorunumu | null; son: AtismaSonucu | null; plaka: (h: string) => Plaka | undefined; ad: (h: string) => string;
  ben: string | null; basBen: boolean; acik: boolean; rtl: boolean; t: Ceviri; onOy: (h: string) => void; onBitir: () => void;
}) {
  const [onay, setOnay] = useState(false);
  const g = atisma ?? son;
  if (!g) return null;
  const a = g.a, b = g.b;
  if (!atisma && son) {
    const metin = applyParams(t(SONUC_ANAHTAR[son.sonuc]), [son.kazanan[0] ? ad(son.kazanan[0]) : "", ad(a), ad(b)]);
    return <SofraZemini minHeight={150}>
      <Animated.View entering={buyuyerekBelir()} accessible accessibilityRole="alert" accessibilityLabel={`${metin} ${applyParams(t("onl.han.atisma.oyDokumu"), [ad(a), son.oy[0], ad(b), son.oy[1]])}`}
        style={{ width: "100%", paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}>
        <View style={{ flexDirection: yon(rtl), gap: 8 }}>
          <Taraf p={plaka(a)} ad={ad(a)} renk={A_RENK} vurgu={son.kazanan.includes(a)} kazanan={son.kazanan.includes(a)} rtl={rtl} t={t} />
          <Taraf p={plaka(b)} ad={ad(b)} renk={B_RENK} vurgu={son.kazanan.includes(b)} kazanan={son.kazanan.includes(b)} rtl={rtl} t={t} />
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 14, color: C.goldBright, textAlign: "center" }}>{metin}</Text>
        {son.sonuc !== "iptal" ? <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim, textAlign: "center" }}>{applyParams(t("onl.han.atisma.oyDokumu"), [ad(a), son.oy[0], ad(b), son.oy[1]])}</Text> : null}
      </Animated.View>
    </SofraZemini>;
  }
  const at = atisma!;
  const taraf = ben === a || ben === b;
  const hakVar = !!ben && at.hak.includes(ben);
  const verdim = !!ben && at.oyVeren.includes(ben);
  const durum = at.asama === "kita"
    ? (at.sira === ben ? t("onl.han.atisma.siraSende") : applyParams(t("onl.han.atisma.siraOnda"), [at.sira ? ad(at.sira) : ""]))
    : verdim ? t("onl.han.atisma.oyunVerildi") : hakVar ? t("onl.han.atisma.oyVer") : taraf ? t("onl.han.atisma.tarafOyYok") : t("onl.han.atisma.hakYok");
  const bitirebilir = taraf || basBen;
  return <SofraZemini minHeight={170}>
    <View style={{ width: "100%", paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", justifyContent: "center", gap: 6 }}>
        <GameIcon name="lyre" size={14} color={C.goldBright} />
        <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 1.2, color: C.goldBright }}>{t("onl.han.atisma.baslik")}</Text>
      </View>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
        <Taraf p={plaka(a)} ad={a === ben ? t("onl.han.sen") : ad(a)} renk={A_RENK} vurgu={at.asama === "kita" && at.sira === a} rtl={rtl} t={t} />
        <View accessible accessibilityRole="text" accessibilityLabel={at.asama === "kita" ? applyParams(t("onl.han.atisma.kitaErisim"), [at.kita, at.toplam]) : applyParams(t("onl.han.atisma.oySayaci"), [at.oyVeren.length, at.hak.length])}
          style={{ minWidth: 56, alignItems: "center", gap: 2 }}>
          {at.asama === "kita" ? <>
            <Text style={{ fontFamily: F.display, fontSize: 20, color: C.parchment }}>{`${at.kita}/${at.toplam}`}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 11.5, color: C.parchmentDim }}>{t("onl.han.atisma.kita")}</Text>
          </> : <>
            <GameIcon name="scales" size={18} color={C.goldBright} />
            <Text style={{ fontFamily: F.serif, fontSize: 11.5, color: C.parchmentDim, textAlign: "center" }}>{applyParams(t("onl.han.atisma.oySayaci"), [at.oyVeren.length, at.hak.length])}</Text>
          </>}
        </View>
        <Taraf p={plaka(b)} ad={b === ben ? t("onl.han.sen") : ad(b)} renk={B_RENK} vurgu={at.asama === "kita" && at.sira === b} rtl={rtl} t={t} />
      </View>
      <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.parchment, textAlign: "center" }}>{durum}</Text>
      {at.asama === "oylama" && hakVar && !verdim ? <View style={{ flexDirection: yon(rtl), gap: 8 }}>
        {[a, b].map((h, i) => <Pressable key={h} accessibilityRole="button" accessibilityLabel={applyParams(t("onl.han.atisma.oyErisim"), [ad(h)])} disabled={!acik}
          onPress={() => { hap("advance"); onOy(h); }}
          style={({ pressed }) => ({ flex: 1, minHeight: 64, flexDirection: yon(rtl), alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1.5, borderColor: i === 0 ? A_RENK : B_RENK, backgroundColor: pressed ? "rgba(201,162,78,0.3)" : "rgba(14,10,6,0.7)", opacity: acik ? 1 : 0.5 })}>
          <KisiYuzu id={h} ad={ad(h)} boyut={32} />
          <Text numberOfLines={2} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 12.5, color: C.parchment, textAlign: "center" }}>{ad(h)}</Text>
        </Pressable>)}
      </View> : null}
      {bitirebilir ? (onay
        ? <View style={{ gap: 6 }}>
          <Text accessibilityRole="alert" style={[notStil(rtl), { textAlign: "center", color: C.ember }]}>{t(at.asama === "kita" ? "onl.han.atisma.bitirIptal" : "onl.han.atisma.bitirOylama")}</Text>
          <View style={{ flexDirection: yon(rtl), gap: 8 }}>
            <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.han.vazgec")} rtl={rtl} kucuk onPress={() => setOnay(false)} /></View>
            <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.han.atisma.bitirOnay")} icon="walk" rtl={rtl} kucuk kapali={!acik} onPress={() => { setOnay(false); onBitir(); }} /></View>
          </View>
        </View>
        : <CizgiDugme etiket={t("onl.han.atisma.bitir")} icon="walk" rtl={rtl} kucuk kapali={!acik} onPress={() => setOnay(true)} />) : null}
    </View>
  </SofraZemini>;
}

/** Sohbet akışında kıta balonu: taraf rengine göre hizalı, sıra no, satır sonları korunur. */
export function KitaBalonu({ ad, metin, sira, toplam, a, benim, rtl, t }: { ad: string; metin: string; sira: number; toplam?: number; a: boolean; benim: boolean; rtl: boolean; t: Ceviri }) {
  const renk = a ? A_RENK : B_RENK;
  const sola = a !== rtl;
  return <View accessible accessibilityLabel={`${applyParams(t("onl.han.atisma.kitaNo"), [sira])}, ${ad}: ${metin}`}
    style={{ alignSelf: sola ? "flex-start" : "flex-end", maxWidth: "90%", borderRadius: 12, borderWidth: 1.5, borderColor: renk, backgroundColor: benim ? "rgba(70,50,22,0.95)" : "rgba(28,20,12,0.95)", paddingHorizontal: 12, paddingVertical: 8, gap: 4 }}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
      <GameIcon name="lyre" size={13} color={renk} />
      <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 11.5, color: renk }}>{benim ? t("onl.han.sen") : ad}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 11.5, color: C.parchmentMuted }}>{toplam ? `${sira}/${toplam}` : applyParams(t("onl.han.atisma.kitaNo"), [sira])}</Text>
    </View>
    <Text style={{ fontFamily: F.serifItalic, fontSize: 15.5, lineHeight: 22, color: C.parchment, textAlign: hiza(rtl) }}>{metin}</Text>
  </View>;
}

/** Sırası gelen tarafın çok satırlı kıta kutusu (alt şerit): 4 satır, harf sayacı; sınır aşılınca gönder kapalı + neden. */
export function KitaKutusu({ altBosluk, acik, rtl, t, onGonder }: { altBosluk: number; acik: boolean; rtl: boolean; t: Ceviri; onGonder: (metin: string) => boolean }) {
  const [metin, setMetin] = useState("");
  const temiz = kitaTemizle(metin);
  const satir = kitaSatir(temiz);
  const harf = harfSayisi(temiz);
  const neden = satir > KITA_SATIR ? applyParams(t("onl.han.atisma.satirFazla"), [KITA_SATIR]) : harf > KITA_EN_UZUN ? applyParams(t("onl.han.atisma.harfFazla"), [KITA_EN_UZUN]) : null;
  const kapali = !acik || !temiz || !!neden;
  return <View style={{ paddingBottom: altBosluk + 8, paddingTop: 8, paddingHorizontal: 12, borderTopWidth: 1, borderColor: C.goldBright, backgroundColor: "rgba(30,20,10,0.98)", gap: 6 }}>
    <Text style={{ fontFamily: F.display, fontSize: 12, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.han.atisma.siraSende")}</Text>
    <View style={{ flexDirection: yon(rtl), gap: 8, alignItems: "flex-end" }}>
      <TextInput value={metin} onChangeText={setMetin} multiline maxLength={KITA_EN_UZUN * 2} accessibilityLabel={t("onl.han.atisma.kitaYaz")} placeholder={t("onl.han.atisma.kitaIpucu")} placeholderTextColor={C.parchmentMuted}
        style={{ flex: 1, minHeight: 88, maxHeight: 132, borderRadius: 8, borderWidth: 1, borderColor: neden ? C.ember : ONL.frameHi, backgroundColor: "rgba(14,10,6,0.9)", color: C.parchment, fontFamily: F.serifItalic, fontSize: 16, lineHeight: 22, padding: 10, textAlign: hiza(rtl), textAlignVertical: "top" }} />
      <View style={{ width: 96 }}>
        <AltinDugme etiket={t("onl.han.atisma.gonder")} icon="lyre" rtl={rtl} kapali={kapali} erisim={[t("onl.han.atisma.gonder"), neden].filter(Boolean).join(". ")}
          onPress={() => { if (onGonder(temiz)) setMetin(""); }} />
      </View>
    </View>
    <Text style={{ fontFamily: F.serif, fontSize: 12, color: neden ? C.ember : C.parchmentMuted, textAlign: hiza(rtl) }}>{neden ?? applyParams(t("onl.han.atisma.sayac"), [satir, KITA_SATIR, harf, KITA_EN_UZUN])}</Text>
  </View>;
}

/** Alt şeritte yazı kutusunun yerine durum satırı (sıra başkasında, sahnede söz yok …); isteğe bağlı tek eylem. */
export function DurumSeridi({ altBosluk, metin, eylem, onEylem, icon = "lyre", rtl }: { altBosluk: number; metin: string; eylem?: string; onEylem?: () => void; icon?: string; rtl: boolean }) {
  return <View style={{ paddingBottom: altBosluk + 8, paddingTop: 10, paddingHorizontal: 12, borderTopWidth: 1, borderColor: ONL.frame, backgroundColor: "rgba(17,12,7,0.97)", flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
    <GameIcon name={icon} size={16} color={C.goldBright} />
    <Text accessibilityLiveRegion="polite" style={{ flex: 1, fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{metin}</Text>
    {eylem && onEylem ? <View style={{ maxWidth: "50%" }}><CizgiDugme etiket={eylem} icon="star" rtl={rtl} kucuk onPress={onEylem} /></View> : null}
  </View>;
}
