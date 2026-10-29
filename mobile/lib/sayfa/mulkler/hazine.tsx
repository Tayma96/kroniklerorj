// Mülk hazinesi: yıllık gelir özeti, kâhya, şıra günü ve boş mülk sahnesi.
import { View, Text, Image } from "react-native";
import { applyParams, useI18n } from "../../i18n";
import { OrnatePanel } from "../../ornament-ui";
import { C, F } from "../../theme";
import { Akce, Madalyon, Olculer, Plaka, Rozet, fmt, signed } from "./parca";

export function HazineOzeti({ monthly, netWorth, count, workers, note }: { monthly: number; netWorth: number; count: number; workers: number; note?: string }) {
  const { t, lang } = useI18n(); const rtl = lang === "ar", ta = rtl ? "right" as const : "left" as const;
  const tone = monthly >= 0 ? C.sage : C.blood;
  return <OrnatePanel>
    <View accessible accessibilityLabel={`${t("mulkler.yearly")}: ≈ ${signed(monthly * 12, lang)}. ${applyParams(t("mulkler.monthly"), [signed(monthly, lang)], lang)}`} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
      <Madalyon icon="akce" size={56} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: F.display, fontSize: 12.5, lineHeight: 17, letterSpacing: 1, color: C.parchmentMuted, textAlign: ta }}>{t("mulkler.yearly")}</Text>
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontFamily: F.display, fontSize: 18, color: tone }}>≈</Text>
          <Akce value={monthly * 12} sign lang={lang} size={28} tone={tone} rtl={rtl} />
        </View>
        <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 19, color: C.parchmentDim, textAlign: ta }}>{applyParams(t("mulkler.monthly"), [signed(monthly, lang)], lang)}</Text>
      </View>
    </View>
    <View style={{ height: 1, backgroundColor: C.border, marginVertical: 12 }} />
    <Olculer rtl={rtl} items={[
      { icon: "gems", label: t("mulk.netWorth"), value: fmt(netWorth, lang), tone: C.gold },
      { icon: "mulkler", label: t("mulkler.props"), value: String(count) },
      { icon: "iliskiler", label: t("mulk.workers"), value: String(workers) },
    ]} />
    {note ? <Text style={{ marginTop: 10, fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 19, color: C.parchmentMuted, textAlign: ta }}>{note}</Text> : null}
  </OrnatePanel>;
}

// Kâhya ve şıra günü aynı kalıbı paylaşır: madalyon, başlık (+durum), açıklama, tek düğme.
export function GorevKarti({ icon, tone = C.gold, title, status, body, action, actionIcon, primary, disabled, onPress }: { icon: string; tone?: string; title: string; status?: string; body: string; action?: string; actionIcon?: string; primary?: boolean; disabled?: boolean; onPress?: () => void }) {
  const { lang } = useI18n(); const rtl = lang === "ar", ta = rtl ? "right" as const : "left" as const;
  return <OrnatePanel tone={tone}>
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 12 }}>
      <Madalyon icon={icon} tone={tone} size={44} />
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 17, lineHeight: 22, color: tone, textAlign: ta }}>{title}</Text>
          {status ? <Rozet icon="star" label={status} tone={C.sage} rtl={rtl} /> : null}
        </View>
        <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: ta }}>{body}</Text>
        {action && onPress ? <View style={{ flexDirection: rtl ? "row-reverse" : "row", marginTop: 6 }}>
          <View style={{ minWidth: 170, maxWidth: "100%", flexDirection: "row" }}>
            <Plaka icon={actionIcon || icon} label={action} primary={primary} disabled={disabled} tone={tone} lang={lang} rtl={rtl} onPress={onPress} />
          </View>
        </View> : null}
      </View>
    </View>
  </OrnatePanel>;
}

export function BosMulk({ source, onMarket }: { source: any; onMarket: () => void }) {
  const { t, lang } = useI18n(); const rtl = lang === "ar";
  return <OrnatePanel>
    <View style={{ alignItems: "center", paddingVertical: 4 }}>
      <Image accessible={false} source={source} resizeMode="cover" style={{ width: "100%", height: 132, borderRadius: 7, borderWidth: 1, borderColor: C.borderHi }} />
      <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 17, lineHeight: 23, color: C.parchment, marginTop: 12, textAlign: "center" }}>{t("mulk.noneTitle")}</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 21, color: C.parchmentMuted, textAlign: "center", marginTop: 6, paddingHorizontal: 6 }}>{t("mulk.noneBody")}</Text>
      <View style={{ flexDirection: "row", alignSelf: "stretch", marginTop: 14 }}>
        <Plaka primary icon="map" label={t("mulkler.toMarket")} lang={lang} rtl={rtl} onPress={onMarket} />
      </View>
    </View>
  </OrnatePanel>;
}
