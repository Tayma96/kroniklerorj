// Hal göstergeleri (ana tasarım §5.6, Ek A §2.1): can, kondisyon, gönül. Gizli sayı yok: her göstergenin değeri,
// durumu ve etkisi (sunucunun {k, p} metni) yazılır; kondisyon kademesi aylık takatı belirler; son nedenler listelenir.
// Değerleri sunucu hesaplar (GET /v1/yerlesim ben.hal); burada yalnız gösterilir.
import { View, Text } from "react-native";
import { applyParams } from "../i18n";
import { C, F } from "../theme";
import { GameIcon } from "../icons";
import type { Lang } from "../locale-data";
import { Cerceve, Madalyon, hiza, yon } from "./ui";
import { Rozet } from "./yasam-ui";
import { etkiYaz, isaretli } from "./metin";
import { HAL_IKON, HAL_TAVAN, KONDISYON_KADEMELERI } from "./meslek-veri";
import type { Gosterge, HalGorunumu } from "./protokol";

type Ceviri = (k: string) => string;

/** Durum rengi: iyi yeşil, orta altın, kötü kor. */
const DURUM_RENK: Record<string, string> = {
  saglam: C.sage, yarali: C.ember, iyi: C.sage, yorgun: C.gold, bitkin: C.ember, sen: C.sage, olagan: C.gold, kirgin: C.ember,
};

function Cubuk({ deger, renk, esik, rtl }: { deger: number; renk: string; esik?: number; rtl: boolean }) {
  const oran = Math.max(0, Math.min(1, deger / HAL_TAVAN));
  return <View style={{ height: 8, borderRadius: 4, backgroundColor: "rgba(201,162,78,0.14)", overflow: "hidden", flexDirection: yon(rtl) }}>
    <View style={{ width: `${oran * 100}%`, backgroundColor: renk, borderRadius: 4 }} />
    {esik !== undefined ? <View style={{ position: "absolute", top: 0, bottom: 0, width: 2, backgroundColor: C.parchmentMuted, [rtl ? "right" : "left"]: `${(esik / HAL_TAVAN) * 100}%` }} /> : null}
  </View>;
}

/** Bir neden satırının ay etiketi: bu ay ya da N ay önce. */
const ayYaz = (ay: number, simdi: number, t: Ceviri) => (simdi - ay <= 0 ? t("onl.hal.buAy") : applyParams(t("onl.hal.ayOnce"), [simdi - ay]));

export function HalKarti({ hal, ay, rtl, t, lang }: { hal: HalGorunumu; ay: number; rtl: boolean; t: Ceviri; lang: Lang }) {
  const satirlar: { g: Gosterge; deger: number; durum: string; etki: string; esik?: number }[] = [
    { g: "can", deger: hal.can.deger, durum: hal.can.durum, etki: etkiYaz(hal.can.etki, t, lang), esik: hal.can.etki.p.esik },
    { g: "kondisyon", deger: hal.kondisyon.deger, durum: hal.kondisyon.kademe, etki: etkiYaz(hal.kondisyon.etki, t, lang) },
    { g: "gonul", deger: hal.gonul.deger, durum: hal.gonul.durum, etki: etkiYaz(hal.gonul.etki, t, lang) },
  ];
  const kademe = hal.kondisyon.kademe;
  return <Cerceve ic={{ padding: 14, gap: 14 }}>
    <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.hal.alt")}</Text>
    {satirlar.map((s) => {
      const renk = DURUM_RENK[s.durum] ?? C.gold;
      const durumAdi = t("onl.hal.durum." + s.durum);
      return <View key={s.g} accessible accessibilityLabel={`${applyParams(t("onl.hal.erisim"), [t("onl.hal." + s.g), s.deger, HAL_TAVAN, durumAdi])}. ${s.etki}`} style={{ gap: 7 }}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
          <Madalyon icon={HAL_IKON[s.g]} size={36} renk={renk} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
              <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 14, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.hal." + s.g)}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchmentDim }}>{`${s.deger}/${HAL_TAVAN}`}</Text>
              <View style={{ flex: 1 }} />
              <Rozet metin={durumAdi} renk={renk} dolu={s.durum !== "olagan"} />
            </View>
            <Cubuk deger={s.deger} renk={renk} esik={s.esik} rtl={rtl} />
          </View>
        </View>
        <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{s.etki}</Text>
        {s.g === "kondisyon" ? <View accessible accessibilityLabel={t("onl.hal.kademeler")} style={{ gap: 6 }}>
          <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: rtl ? 0 : 1, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.hal.kademeler")}</Text>
          <View style={{ flexDirection: yon(rtl), gap: 6 }}>
            {KONDISYON_KADEMELERI.map((k) => {
              const bu = k.kademe === kademe;
              return <View key={k.kademe} style={{ flex: 1, minWidth: 0, alignItems: "center", gap: 2, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 8, borderWidth: 1, borderColor: bu ? DURUM_RENK[k.kademe] : "rgba(201,162,78,0.25)", backgroundColor: bu ? "rgba(90,64,24,0.55)" : "rgba(0,0,0,0.2)" }}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontFamily: F.display, fontSize: 12, color: bu ? C.parchment : C.parchmentDim }}>{t("onl.hal.durum." + k.kademe)}</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontFamily: F.serif, fontSize: 12.5, color: C.parchmentMuted }}>{applyParams(t("onl.hal.kademeAlt"), [k.alt])}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <GameIcon name="flame" size={11} color={bu ? C.emberSoft : C.parchmentMuted} />
                  <Text style={{ fontFamily: F.display, fontSize: 12, color: bu ? C.goldBright : C.parchmentDim }}>{k.takat}</Text>
                </View>
              </View>;
            })}
          </View>
        </View> : null}
      </View>;
    })}
    <View style={{ gap: 6, paddingTop: 10, borderTopWidth: 1, borderColor: "rgba(201,162,78,0.15)" }}>
      <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: rtl ? 0 : 1, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.hal.nedenler")}</Text>
      {hal.nedenler.length ? hal.nedenler.map((n, i) => <View key={`${n.gosterge}-${n.neden}-${n.ay}-${i}`} accessible
        accessibilityLabel={`${t("onl.hal." + n.gosterge)} ${isaretli(n.fark)}, ${t("onl." + n.neden)}, ${ayYaz(n.ay, ay, t)}`}
        style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, minHeight: 28 }}>
        <GameIcon name={HAL_IKON[n.gosterge]} size={14} color={n.fark >= 0 ? C.sage : C.ember} />
        <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchment, textAlign: hiza(rtl) }}>
          {`${t("onl.hal." + n.gosterge)} ${isaretli(n.fark)} · ${t("onl." + n.neden)}`}
        </Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted }}>{ayYaz(n.ay, ay, t)}</Text>
      </View>) : <Text style={{ fontFamily: F.serifItalic, fontSize: 14, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.hal.nedenYok")}</Text>}
    </View>
  </Cerceve>;
}
