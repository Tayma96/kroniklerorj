// Eylem panelleri: yapmadan önce şans dökümü (kalem kalem, toplam = gösterilen şans) ve sonuç (zar, metin, değişimler,
// öğrenme ödülleri, kalan takat). Kişi, yaşam, mahalle ve karakter ekranları aynı parçaları kullanır.
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { applyParams } from "../i18n";
import type { Lang } from "../locale-data";
import { GameIcon } from "../icons";
import { C, F } from "../theme";
import { AltinDugme, Bant, GLOW, ONL, hiza, yon } from "./ui";
import { Degisim, Rozet, SansHalkasi, odulYaz, sansRengi } from "./yasam-ui";
import { BECERI_IKON, NAM_IKON, OZELLIK_IKON, eylemIkonu, isaretli, kalemYaz, ozetYaz } from "./metin";
import type { Dokum, EylemKarti, EylemYaniti, HataKodu, OnlineHata } from "./protokol";
import { ACILIS_GUNU } from "./protokol";

type Ceviri = (k: string) => string;

/** Kilitli eylemin sebebi (yaş kapısı, öğrenme günü, hedefin yaşı …). */
export function engelMetni(tur: string, engel: HataKodu | OnlineHata, t: Ceviri): string {
  switch (engel) {
    case "ogrenme_kapali": return applyParams(t("onl.ey.engel.ogrenme"), [ACILIS_GUNU[tur] ?? 1]);
    case "yas_kapisi": return applyParams(t("onl.ey.engel.yas"), [12]);
    case "hedef_uygun_degil": return t(tur === "ayakIsi" ? "onl.ey.engel.ayakIsi" : tur === "cirak" ? "onl.ey.engel.cirak" : "onl.ey.engel.hedef");
    case "zaten_cirak": return t("onl.h.zatenCirak");
    case "para_yok": return t("onl.ey.engel.para");
    case "takat_yok": return t("onl.h.takatYok");
    default: return t("onl.h.genel");
  }
}

/** Şans dökümü: her kalem ve en altta toplam (sunucunun kullandığı değerin aynısı). */
export function SansDokumu({ dokum, rtl, t, lang }: { dokum: Dokum; rtl: boolean; t: Ceviri; lang: Lang }) {
  return <View style={{ borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,162,78,0.28)", backgroundColor: "rgba(0,0,0,0.25)", paddingHorizontal: 12, paddingVertical: 6 }}>
    {dokum.kalemler.map((k, i) => <View key={k.k + i} accessible accessibilityLabel={`${kalemYaz(k, t, lang)}: ${isaretli(k.d)}`}
      style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderColor: "rgba(201,162,78,0.12)" }}>
      <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{kalemYaz(k, t, lang)}</Text>
      <Text style={{ minWidth: 44, fontFamily: F.display, fontSize: 14, color: k.d > 0 ? C.sage : k.d < 0 ? C.ember : C.parchmentMuted, textAlign: rtl ? "left" : "right" }}>{isaretli(k.d)}</Text>
    </View>)}
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingTop: 9, paddingBottom: 4 }}>
      <Text style={{ flex: 1, fontFamily: F.display, fontSize: 12.5, letterSpacing: rtl ? 0 : 1.2, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.ey.toplamSans")}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 17, color: sansRengi(dokum.toplam) }}>{`${dokum.toplam}%`}</Text>
    </View>
  </View>;
}

/** Eylemi yapmadan önceki panel içeriği (kişi ekranı). */
export function EylemOnizleme({ kart, hedefAd, rtl, t, lang, bekliyor, hata, onDene }: { kart: EylemKarti; hedefAd: string; rtl: boolean; t: Ceviri; lang: Lang; bekliyor: boolean; hata: OnlineHata | null; onDene: () => void }) {
  const tekrar = kart.getiri.tekrar > 0;
  return <>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 14, paddingTop: 6 }}>
      <View style={[{ width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: kart.acik ? C.goldBright : ONL.frame, alignItems: "center", justifyContent: "center", overflow: "hidden" }, kart.acik ? GLOW : null]}>
        <LinearGradient colors={[C.cardHi, C.surface]} style={StyleSheet.absoluteFill} />
        <GameIcon name={eylemIkonu(kart.tur)} size={28} color={kart.acik ? C.goldBright : C.parchmentMuted} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 20, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.ey." + kart.tur)}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.ey." + kart.tur + ".d"), [hedefAd], lang)}</Text>
      </View>
      {kart.sans ? <SansHalkasi yuzde={kart.sans.toplam} boyut={62} kilitli={!kart.acik} /> : null}
    </View>
    <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 8 }}>
      <Rozet icon="flame" metin={applyParams(t("onl.ey.bedel"), [kart.takat])} renk={C.emberSoft} />
      {kart.tur === "hediye" ? <Rozet icon="coins" metin={applyParams(t("onl.odul.paraEksi"), [2])} renk={C.gold} /> : null}
      {tekrar ? <Rozet icon="hourglass" metin={applyParams(t("onl.ey.getiri"), [kart.getiri.carpan])} renk={C.ember} /> : null}
    </View>
    {kart.sans ? <>
      <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 1.4, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.ey.neden")}</Text>
      <SansDokumu dokum={kart.sans} rtl={rtl} t={t} lang={lang} />
    </> : null}
    {tekrar ? <Text style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{applyParams(t("onl.ey.getiriNot"), [kart.getiri.tekrar])}</Text> : null}
    {kart.engel ? <Bant tur="bilgi" metin={engelMetni(kart.tur, kart.engel, t)} rtl={rtl} /> : null}
    {hata ? <Bant metin={engelMetni(kart.tur, hata, t)} rtl={rtl} /> : null}
    <AltinDugme etiket={kart.acik ? applyParams(t("onl.ey.dene"), [kart.takat]) : t("onl.ey.kilitli")} icon={eylemIkonu(kart.tur)} rtl={rtl} kapali={!kart.acik} bekliyor={bekliyor} onPress={onDene} />
  </>;
}

/** Zar şeridi: 1-100; şansa kadar olan bölüm başarı, işaret zarın düştüğü yer. */
function ZarSeridi({ zar, sans, rtl, t }: { zar: number; sans: number; rtl: boolean; t: Ceviri }) {
  const basari = zar <= sans;
  return <View accessible accessibilityLabel={applyParams(t("onl.ey.zarErisim"), [zar, sans])} style={{ gap: 6 }}>
    <View style={{ height: 14, borderRadius: 7, overflow: "hidden", flexDirection: yon(rtl), backgroundColor: "rgba(200,90,64,0.25)", borderWidth: 1, borderColor: "rgba(201,162,78,0.35)" }}>
      <View style={{ width: `${sans}%`, backgroundColor: "rgba(122,154,92,0.65)" }} />
    </View>
    <View pointerEvents="none" style={[{ position: "absolute", top: -4, width: 4, height: 22, borderRadius: 2, backgroundColor: basari ? C.goldBright : C.parchment, borderWidth: 1, borderColor: "#1B130A" }, rtl ? { right: `${Math.min(98, zar)}%` } : { left: `${Math.min(98, zar)}%` }]} />
    <View style={{ flexDirection: yon(rtl), justifyContent: "space-between" }}>
      <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchmentDim }}>{applyParams(t("onl.ey.zar"), [zar])}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchmentDim }}>{applyParams(t("onl.ey.sans"), [sans])}</Text>
    </View>
  </View>;
}

/** Eylemin sonucu: anında gelir (§4.4). */
export function EylemSonucu({ y, rtl, t, lang, onTamam }: { y: EylemYaniti; rtl: boolean; t: Ceviri; lang: Lang; onTamam: () => void }) {
  const d = y.degisim;
  const parcalar: { icon: string; metin: string; olumlu: boolean }[] = [];
  if (d.gorus) parcalar.push({ icon: "family", metin: applyParams(t("onl.ey.gorusArti"), [isaretli(d.gorus)]), olumlu: d.gorus > 0 });
  if (d.para) parcalar.push({ icon: "coins", metin: applyParams(t("onl.ey.para"), [isaretli(d.para)]), olumlu: d.para > 0 });
  if (d.gonul) parcalar.push({ icon: "sun", metin: applyParams(t("onl.hal.degisim.gonul"), [isaretli(d.gonul)]), olumlu: d.gonul > 0 });
  for (const [b, n] of Object.entries(d.beceri ?? {})) parcalar.push({ icon: BECERI_IKON[b] ?? "star", metin: `${isaretli(n)} ${t("onl.beceri." + b)}`, olumlu: n > 0 });
  for (const [b, n] of Object.entries(d.nam ?? {})) parcalar.push({ icon: NAM_IKON[b] ?? "star", metin: `${isaretli(n)} ${t("onl.nam." + b)}`, olumlu: n > 0 });
  for (const [b, n] of Object.entries(d.ozellik ?? {})) parcalar.push({ icon: OZELLIK_IKON[b] ?? "star", metin: `${isaretli(n)} ${t("onl.ozellik." + b)}`, olumlu: n > 0 });
  const renk = y.basari ? C.goldBright : C.ember;
  return <>
    <View style={{ alignItems: "center", gap: 8, paddingTop: 6 }}>
      <View style={[{ width: 74, height: 74, borderRadius: 37, borderWidth: 2.5, borderColor: renk, alignItems: "center", justifyContent: "center", overflow: "hidden" }, y.basari ? GLOW : null]}>
        <LinearGradient colors={y.basari ? ["#5A4216", "#2A1D0A"] : ["#4A1E14", "#24100A"]} style={StyleSheet.absoluteFill} />
        <GameIcon name={eylemIkonu(y.tur)} size={34} color={renk} />
      </View>
      <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 2, color: C.gold }}>{t("onl.ey." + y.tur)}</Text>
      <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={{ fontFamily: F.display, fontSize: 24, color: renk, textAlign: "center" }}>{t(y.basari ? "onl.ey.basari" : "onl.ey.basarisiz")}</Text>
    </View>
    {y.zar !== undefined && y.sans ? <ZarSeridi zar={y.zar} sans={y.sans.toplam} rtl={rtl} t={t} /> : null}
    <Text style={{ fontFamily: F.serif, fontSize: 17, lineHeight: 24, color: C.parchment, textAlign: "center" }}>{ozetYaz(y.sonuc, t, lang, { hedef: { ad: y.hedefAd ?? "" } })}</Text>
    {parcalar.length ? <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
      {parcalar.map((p) => <Degisim key={p.icon + p.metin} {...p} />)}
    </View> : null}
    {y.ogrenme.map((o) => <View key={o.gun} accessible style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: C.goldBright, backgroundColor: "rgba(90,66,22,0.45)" }}>
      <GameIcon name="graduate-cap" size={20} color={C.goldBright} />
      <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15.5, lineHeight: 21, color: C.parchment, textAlign: hiza(rtl) }}>{applyParams(t("onl.ey.odulAlindi"), [o.gun, odulYaz(o.odul, t)])}</Text>
    </View>)}
    {y.getiri && y.getiri.tekrar > 0 ? <Text style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: "center" }}>{applyParams(t("onl.ey.getiriNot"), [y.getiri.tekrar])}</Text> : null}
    <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 1, color: C.parchmentDim, textAlign: "center" }}>{applyParams(t("onl.ey.kalanTakat"), [y.takat.kalan, y.takat.tavan])}</Text>
    <AltinDugme etiket={t("onl.ey.tamam")} rtl={rtl} onPress={onTamam} />
  </>;
}
