// Han ilan panosu (H10): etkinlik, iş ve ozan gecesi ilanları. Sunucu metni süzer, günlük sınırı ve 7 günlük ömrü uygular;
// istemci listeler, yeni ilanı yollar, sahibi siler, başkası şikâyet eder.
import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TextInput } from "react-native";
import { useI18n, applyParams } from "../i18n";
import { C, F } from "../theme";
import { GameIcon } from "../icons";
import { hap } from "../haptics";
import { DesignPressable as Pressable } from "../design-pressable";
import { istekNoUret } from "./depo";
import { ekHataAnahtari, type EkHata } from "./ek-istemci";
import { PANO_METIN_EN_UZUN, PANO_TURLERI, harfSayisi, type HanIstemci, type PanoIlani, type PanoTuru } from "./han-veri";
import { Bant, Cerceve, CizgiDugme, ONL, hiza, yon } from "./ui";
import { Baslik2, BosKart, Rozet } from "./yasam-ui";

const IKON: Record<PanoTuru, string> = { etkinlik: "party", is: "anvil", ozan: "lyre" };

export function HanPanosu({ istemci }: { istemci: HanIstemci }) {
  const { t, rtl, lang } = useI18n();
  const [ilanlar, setIlanlar] = useState<PanoIlani[] | null>(null);
  const [tur, setTur] = useState<PanoTuru>("etkinlik");
  const [metin, setMetin] = useState("");
  const [hata, setHata] = useState<EkHata | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const istekNo = useRef(istekNoUret());

  const yukle = useCallback(async () => {
    const r = await istemci.pano();
    if (r.ok) setIlanlar(r.deger.ilanlar); else setHata(r.hata);
  }, [istemci]);
  useEffect(() => { void yukle(); }, [yukle]);

  const as = async () => {
    const m = metin.trim();
    if (!m || harfSayisi(m) > PANO_METIN_EN_UZUN) return;
    setBekliyor(true); setHata(null); setBilgi(null);
    const r = await istemci.panoAs({ metin: m, tur, istekNo: istekNo.current });
    setBekliyor(false);
    if (r.ok) { hap("success"); setIlanlar(r.deger.ilanlar); setMetin(""); setBilgi(t("onl.pano.asildi")); istekNo.current = istekNoUret(); }
    else { hap("error"); setHata(r.hata); }
  };
  const sil = async (id: string) => {
    const r = await istemci.panoSil({ ilan: id, istekNo: istekNoUret() });
    if (r.ok) setIlanlar(r.deger.ilanlar); else setHata(r.hata);
  };
  const sikayet = async (id: string) => {
    const r = await istemci.ilanSikayet({ ilan: id, neden: "uygunsuzAd", istekNo: istekNoUret() });
    if (r.ok) setBilgi(t("onl.pano.sikayetEdildi")); else setHata(r.hata);
  };

  return <>
    <Baslik2 metin={t("onl.pano.baslik")} rtl={rtl} />
    <Cerceve ic={{ padding: 12, gap: 10 }}>
      <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
        {PANO_TURLERI.map((x) => <Pressable key={x} accessibilityRole="radio" accessibilityState={{ selected: tur === x }} accessibilityLabel={t("onl.pano.tur." + x)}
          onPress={() => { hap("tap"); setTur(x); }}
          style={{ flexDirection: yon(rtl), alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 12, borderRadius: 22, borderWidth: 1.5, borderColor: tur === x ? C.goldBright : ONL.frame }}>
          <GameIcon name={IKON[x]} size={14} color={tur === x ? C.goldBright : C.gold} />
          <Text style={{ fontFamily: F.display, fontSize: 12.5, color: C.parchment }}>{t("onl.pano.tur." + x)}</Text>
        </Pressable>)}
      </View>
      <TextInput value={metin} onChangeText={setMetin} placeholder={t("onl.pano.yer")} placeholderTextColor={C.parchmentMuted} multiline maxLength={PANO_METIN_EN_UZUN * 2}
        accessibilityLabel={t("onl.pano.yer")}
        style={{ minHeight: 64, borderRadius: 8, borderWidth: 1, borderColor: ONL.frame, padding: 10, fontFamily: F.serif, fontSize: 15, color: C.parchment, textAlign: hiza(rtl), textAlignVertical: "top" }} />
      <Text style={{ fontFamily: F.display, fontSize: 11, color: harfSayisi(metin) > PANO_METIN_EN_UZUN ? C.ember : C.goldDim, textAlign: hiza(rtl) }}>{harfSayisi(metin)}/{PANO_METIN_EN_UZUN}</Text>
      <CizgiDugme etiket={t("onl.pano.as")} icon="scroll" rtl={rtl} kucuk kapali={bekliyor || !metin.trim() || harfSayisi(metin.trim()) > PANO_METIN_EN_UZUN} onPress={() => { void as(); }} />
      <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, lineHeight: 17, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.pano.not")}</Text>
      {bilgi ? <Bant tur="bilgi" metin={bilgi} rtl={rtl} /> : null}
      {hata ? <Bant metin={t(ekHataAnahtari(hata))} rtl={rtl} /> : null}
    </Cerceve>
    {ilanlar === null ? null : ilanlar.length === 0 ? <BosKart icon="scroll" metin={t("onl.pano.bos")} rtl={rtl} />
      : <View style={{ gap: 8, marginTop: 8 }}>{ilanlar.map((x) => <Cerceve key={x.id} ic={{ padding: 12, gap: 6 }}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Rozet icon={IKON[x.tur] ?? "scroll"} metin={t("onl.pano.tur." + x.tur)} />
          <Text style={{ flex: 1, fontFamily: F.display, fontSize: 13, color: C.parchment, textAlign: hiza(rtl) }}>{x.kisi.ad}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 11, color: C.goldDim }}>{new Date(x.zaman).toLocaleDateString(lang)}</Text>
        </View>
        <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{x.metin}</Text>
        <View style={{ flexDirection: yon(rtl), gap: 8 }}>
          {x.benim ? <CizgiDugme etiket={t("onl.pano.sil")} icon="scroll-open" rtl={rtl} kucuk onPress={() => { void sil(x.id); }} />
            : <CizgiDugme etiket={t("onl.pano.sikayet")} icon="hood" rtl={rtl} kucuk onPress={() => { void sikayet(x.id); }} />}
        </View>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{applyParams(t("onl.pano.bitis"), [new Date(x.bitis).toLocaleDateString(lang)])}</Text>
      </Cerceve>)}</View>}
  </>;
}
