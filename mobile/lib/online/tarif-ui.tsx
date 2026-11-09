// Usta iş tarifleri (ana tasarım §5.4–5.5, POST /v1/tarif): açık/kapalı, girdiler (eldeki/gereken), araç ve
// aşınması, çıktı, takat bedeli; kapalıysa açan düğüm. Liste sunucunun tarifListesi'dir (ben.tarifler); istemci
// yalnız niyet gönderir, sonucu (çıktı, aşınma, Hal) sunucu döndürür.
import { View, Text, useWindowDimensions } from "react-native";
import Animated from "react-native-reanimated";
import { applyParams } from "../i18n";
import { C, F } from "../theme";
import { GameIcon } from "../icons";
import { DesignPressable as Pressable } from "../design-pressable";
import { hap } from "../haptics";
import { AltinDugme, Bant, Cerceve, Madalyon, giris, hiza, yon } from "./ui";
import { Degisim, Rozet } from "./yasam-ui";
import { etkiYaz } from "./metin";
import { HAL_IKON, MAL_IKON, TARIF_IKON } from "./meslek-veri";
import type { Lang } from "../locale-data";
import type { Envanter, MalId, TarifSatiri, TarifYaniti } from "./protokol";

type Ceviri = (k: string) => string;
const malAdi = (t: Ceviri, m: string) => t("onl.mal." + m);

/** Girdi çipi: eldeki/gereken, yetmiyorsa kor rengi. */
function GirdiCipi({ mal, gereken, elde, t }: { mal: string; gereken: number; elde: number; t: Ceviri }) {
  const yeter = elde >= gereken;
  return <View accessible accessibilityLabel={applyParams(t("onl.tf.girdiErisim"), [malAdi(t, mal), elde, gereken])}
    style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: yeter ? "rgba(122,154,92,0.7)" : "rgba(200,90,64,0.7)", backgroundColor: "rgba(0,0,0,0.25)" }}>
    <GameIcon name={MAL_IKON[mal as MalId] ?? "scroll"} size={13} color={yeter ? C.sage : C.ember} />
    <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchment }}>{malAdi(t, mal)}</Text>
    <Text style={{ fontFamily: F.display, fontSize: 13, color: yeter ? C.sage : C.ember }}>{`${elde}/${gereken}`}</Text>
  </View>;
}

export function TarifKarti({ tf, ev, rtl, t, bekliyor, hata, onYap }: {
  tf: TarifSatiri; ev: Envanter; rtl: boolean; t: Ceviri; bekliyor: boolean; hata: string | null; onYap: () => void;
}) {
  const dar = useWindowDimensions().width < 360;
  const girdiler = Object.entries(tf.girdi).filter(([, n]) => (n ?? 0) > 0);
  const ad = t("onl.tarif." + tf.id);
  const kapali = !tf.yapilabilir;
  return <Cerceve aktif={tf.yapilabilir} ic={{ padding: 12, gap: 10 }}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
      <Madalyon icon={TARIF_IKON[tf.id] ?? "scroll-open"} size={44} aktif={tf.acik} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: 15.5, color: tf.acik ? C.parchment : C.parchmentDim, textAlign: hiza(rtl) }}>{ad}</Text>
        <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
          <Rozet icon={tf.acik ? "star" : "hourglass"} metin={t(tf.acik ? "onl.tf.acik" : "onl.tf.kapali")} renk={tf.acik ? C.sage : C.parchmentMuted} dolu={tf.acik} />
          <Rozet icon="star" metin={applyParams(t("onl.is.hizmet"), [tf.hizmet])} renk={C.gold} />
        </View>
      </View>
      <View style={{ width: dar ? 84 : 96 }}>
        <Pressable accessibilityLabel={`${ad}. ${applyParams(t("onl.is.takatBedel"), [tf.takat])}`} accessibilityState={{ disabled: kapali, busy: bekliyor }}
          disabled={kapali || bekliyor} onPress={() => { hap("tap"); onYap(); }}
          style={({ pressed }) => ({ minHeight: 48, borderRadius: 8, borderWidth: 1.5, borderColor: kapali ? "rgba(168,130,63,0.4)" : C.goldBright, backgroundColor: pressed ? "rgba(201,162,78,0.3)" : "rgba(201,162,78,0.14)", alignItems: "center", justifyContent: "center", paddingHorizontal: 6, opacity: kapali ? 0.55 : 1 })}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: 13.5, color: C.goldBright }}>{t("onl.tf.yap")}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <GameIcon name="flame" size={11} color={C.emberSoft} />
            <Text style={{ fontFamily: F.display, fontSize: 11, color: C.parchmentDim }}>{tf.takat}</Text>
          </View>
        </Pressable>
      </View>
    </View>
    {/* Girdi → çıktı */}
    <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", alignItems: "center", gap: 6 }}>
      <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: rtl ? 0 : 1, color: C.gold }}>{t("onl.tf.girdi")}</Text>
      {girdiler.length ? girdiler.map(([m, n]) => <GirdiCipi key={m} mal={m} gereken={n ?? 0} elde={ev[m] ?? 0} t={t} />)
        : <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, color: C.parchmentMuted }}>{t("onl.tf.girdiYok")}</Text>}
    </View>
    <View accessible accessibilityLabel={`${t("onl.tf.cikti")}: ${applyParams(t("onl.is.cikti"), [tf.cikti.adet, malAdi(t, tf.cikti.mal)])}`}
      style={{ flexDirection: yon(rtl), flexWrap: "wrap", alignItems: "center", gap: 6 }}>
      <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: rtl ? 0 : 1, color: C.gold }}>{t("onl.tf.cikti")}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "rgba(226,182,90,0.6)", backgroundColor: "rgba(90,64,24,0.45)" }}>
        <GameIcon name={MAL_IKON[tf.cikti.mal]} size={13} color={C.goldBright} />
        <Text style={{ fontFamily: F.display, fontSize: 13.5, color: C.goldBright }}>{applyParams(t("onl.is.cikti"), [tf.cikti.adet, malAdi(t, tf.cikti.mal)])}</Text>
      </View>
    </View>
    {tf.arac ? <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
      <GameIcon name={MAL_IKON[tf.arac.mal]} size={15} color={tf.arac.var ? C.sage : C.parchmentMuted} />
      <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: tf.arac.var ? C.parchment : C.parchmentDim, textAlign: hiza(rtl) }}>
        {tf.arac.var ? applyParams(t("onl.tf.aracVar"), [malAdi(t, tf.arac.mal), tf.arac.adet, tf.arac.kullanim, tf.arac.omur])
          : applyParams(t("onl.tf.aracYok"), [malAdi(t, tf.arac.mal), tf.arac.adet])}
      </Text>
    </View> : null}
    {tf.arac?.var ? <View accessibilityLabel={applyParams(t("onl.tf.asinma"), [tf.arac.kullanim, tf.arac.omur])} style={{ flexDirection: yon(rtl), gap: 3 }}>
      {Array.from({ length: tf.arac.omur }, (_, i) => <View key={i} style={{ flex: 1, height: 5, borderRadius: 2, backgroundColor: i < (tf.arac?.kullanim ?? 0) ? C.ember : "rgba(201,162,78,0.25)" }} />)}
    </View> : null}
    {!tf.acik ? <Bant tur="bilgi" metin={applyParams(t("onl.tf.acanDugum"), [t("onl.mes." + tf.dugum), t("onl.mes." + tf.meslek)])} rtl={rtl} /> : null}
    {hata ? <Bant metin={hata} rtl={rtl} /> : null}
  </Cerceve>;
}

/** Meslek ekranındaki tarif bölümü: bu mesleğin tarifleri, açıklar önce. */
export function TarifListesi({ tarifler, ev, rtl, t, bekliyor, hata, onYap }: {
  tarifler: TarifSatiri[]; ev: Envanter; rtl: boolean; t: Ceviri; bekliyor: boolean; hata: { id: string; metin: string } | null; onYap: (id: string) => void;
}) {
  const sirali = [...tarifler].sort((a, b) => Number(b.acik) - Number(a.acik));
  return <View style={{ gap: 10 }}>
    {sirali.map((tf, n) => <Animated.View key={tf.id} entering={giris(n * 40)}>
      <TarifKarti tf={tf} ev={ev} rtl={rtl} t={t} bekliyor={bekliyor} hata={hata?.id === tf.id ? hata.metin : null} onYap={() => onYap(tf.id)} />
    </Animated.View>)}
  </View>;
}

/** Tarif sonucu (alt panel): çıktı, harcanan girdi, araç aşınması, hizmet ve güncel kondisyon. */
export function TarifSonucu({ y, rtl, t, lang, onTamam }: { y: TarifYaniti; rtl: boolean; t: Ceviri; lang: Lang; onTamam: () => void }) {
  const girdi = Object.entries(y.girdi).filter(([, n]) => (n ?? 0) > 0);
  const tf = y.tarifler.find((x) => x.id === y.tarif);
  return <>
    <View style={{ alignItems: "center", gap: 8, paddingTop: 6 }}>
      <Madalyon icon={MAL_IKON[y.cikti.mal]} size={64} aktif />
      <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 1.6, color: C.gold }}>{t("onl.tarif." + y.tarif)}</Text>
      <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={{ fontFamily: F.display, fontSize: 21, color: C.goldBright, textAlign: "center" }}>{applyParams(t("onl.is.cikti"), [y.cikti.adet, malAdi(t, y.cikti.mal)])}</Text>
      {girdi.length ? <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: "center" }}>
        {applyParams(t("onl.tf.harcanan"), [girdi.map(([m, n]) => `${n} ${malAdi(t, m)}`).join(", ")])}
      </Text> : null}
    </View>
    <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
      <Degisim icon="flame" metin={applyParams(t("onl.is.takatHarcandi"), [tf?.takat ?? 1])} olumlu={false} />
      {y.hizmet > 0 ? <Degisim icon="star" metin={applyParams(t("onl.is.hizmet"), [y.hizmet])} olumlu /> : null}
    </View>
    {y.arac ? <Bant tur={y.arac.asindi ? "hata" : "bilgi"} rtl={rtl}
      metin={y.arac.asindi ? applyParams(t("onl.tf.asindi"), [malAdi(t, y.arac.mal), y.arac.omur]) : applyParams(t("onl.tf.asinmaSonuc"), [malAdi(t, y.arac.mal), y.arac.kullanim, y.arac.omur])} /> : null}
    <View accessible style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,162,78,0.3)", backgroundColor: "rgba(0,0,0,0.25)" }}>
      <GameIcon name={HAL_IKON.kondisyon} size={18} color={C.gold} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment, textAlign: hiza(rtl) }}>{`${t("onl.hal.kondisyon")} ${y.hal.kondisyon.deger}/100 · ${t("onl.hal.durum." + y.hal.kondisyon.kademe)}`}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>{etkiYaz(y.hal.kondisyon.etki, t, lang)}</Text>
      </View>
    </View>
    <Text style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.tf.not")}</Text>
    <AltinDugme etiket={t("onl.is.tamam")} rtl={rtl} onPress={onTamam} />
  </>;
}
