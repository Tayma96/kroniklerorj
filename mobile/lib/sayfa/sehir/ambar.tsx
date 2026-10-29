// Bölge ambarı (mockup'taki altın çağrı düğmeli panel) ve savaşın şehirdeki izi + sivil yardım.
// Kurallar ve bedeller motordan gelir; bu dosya yalnız görünüm.
import { useState } from "react";
import { View, Text } from "react-native";
import { DesignPressable as Pressable } from "../../design-pressable";
import { GameButton } from "../../ui";
import { GameIcon } from "../../icons";
import { useGame } from "../../store";
import { useI18n, applyParams, yuzdeL } from "../../i18n";
import { placeName } from "../../locale-data";
import { warReportAt, warAidCost, canWarAid, giveWarAid, warReserveAt, canStockWarReserve, stockWarReserve } from "../../game";
import type { CivilAid } from "../../war-world";
import { playTap, playChime } from "../../sound";
import { hap } from "../../haptics";
import { C, F } from "../../theme";
import { SPanel, SPanelHeader, Bar, Medallion, SK } from "./parcalar";

const CAP = 40;
const AID_ICON: Record<CivilAid, string> = { food: "bread", rebuild: "house", patrol: "shield" };

// Savaş bölgeyi vurduysa: etkiler, nedenler ve ayda bir sivil yardım.
export function SavasIzi() {
  const { state, apply } = useGame(), { t, lang } = useI18n();
  if (!state || state.mpRealm) return null;
  const rtl = lang === "ar", place = state.player.location_name, report = warReportAt(state, place);
  if (!report.active && !report.affected) return null;
  const e = report.effects, r = report.region;
  const body = { fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: "#EBD3C2", paddingHorizontal: 14, marginTop: 4, textAlign: rtl ? "right" as const : "left" as const };
  return <SPanel tone="war">
    <SPanelHeader title={t("ww.title")} icon="crossed-swords" color="#F4C9B4" rtl={rtl} />
    <Text style={body}>{t(report.active ? "ww.active" : "ww.peace")}</Text>
    <View style={{ marginHorizontal: 12, marginTop: 8, padding: 10, borderRadius: 4, borderWidth: 1, borderColor: "rgba(255,190,160,0.22)", backgroundColor: "rgba(20,8,5,0.55)", gap: 4 }}>
      <Text style={{ ...body, paddingHorizontal: 0, marginTop: 0, color: "#FBEBD6" }}>{applyParams(t("ww.effects"), [yuzdeL(Math.round((1 - e.production) * 100), lang), yuzdeL(Math.round((e.foodDemand - 1) * 100), lang), yuzdeL(Math.round((1 - e.revenue) * 100), lang)])}</Text>
      <Text style={{ ...body, paddingHorizontal: 0, marginTop: 0, fontSize: 13.5 }}>{applyParams(t("ww.causes"), [Math.round(r.damage), Math.round(r.shortage), Math.round(r.exhaustion)])}</Text>
      {!!r.occupation && <Text style={{ ...body, paddingHorizontal: 0, marginTop: 0, fontSize: 13.5 }}>{applyParams(t("ww.occupation"), [Math.round(r.occupation)])}</Text>}
    </View>
    <Text style={{ ...body, fontSize: 13, lineHeight: 18, color: "#D9BBA8", marginTop: 8 }}>{t("ww.aid.rule")}</Text>
    <View style={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 12, gap: 8 }}>
      {(["food", "rebuild", "patrol"] as CivilAid[]).map(kind => {
        const cost = warAidCost(state, kind), enabled = canWarAid(state, kind);
        return <GameButton key={kind} variant="secondary" disabled={!enabled} rtl={rtl} icon={AID_ICON[kind]} accessibilityLabel={t("ww.aid." + kind)} onPress={() => { hap("success"); playTap(); apply(s => giveWarAid(s, kind)); }}>
          <Text style={{ fontFamily: F.display, color: C.parchment, fontSize: 13, textAlign: rtl ? "right" : "left" }}>{t("ww.aid." + kind)}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentMuted, textAlign: rtl ? "right" : "left" }}>{applyParams(t("ww.cost." + kind), [cost.money])}</Text>
        </GameButton>;
      })}
    </View>
  </SPanel>;
}

// Bölge ambarı: doluluk, altın çağrı düğmesi, düğme kapalıysa nedeni; kurallar açılır.
export function BolgeAmbari() {
  const { state, apply } = useGame(), { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  if (!state || state.mpRealm) return null;
  const rtl = lang === "ar", p = state.player, here = p.location_name;
  const stock = warReserveAt(state, here), can = canStockWarReserve(state);
  const wheat = Math.floor(p.inventory.bugday || 0);
  const why = can || p.dead ? "" : p.age < 13 ? t("suc.tooYoung")
    : state.warWorld?.aidTurn === state.turn ? t("sehir.why.month")
    : stock > CAP - 8 ? t("sehir.why.full")
    : wheat < 8 ? applyParams(t("sehir.why.wheat"), [wheat]) : "";
  const align = rtl ? "right" as const : "left" as const;
  const war = warReportAt(state, here), warOn = war.active || war.affected; // savaş panelinde yardım kuralı zaten yazılı
  return <SPanel tone="gold">
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 11, paddingHorizontal: 12, paddingTop: 12 }}>
      <Medallion icon="house" size={40} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.serif, fontSize: 18, lineHeight: 22, color: "#F4E8CF", textAlign: align }}>{t("sehir.granary")}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 16, color: SK.muted, textAlign: align }}>{applyParams(t("sehir.granarySub"), [placeName(here, lang)])}</Text>
      </View>
      <View accessible accessibilityLabel={applyParams(t("ww.reserve.stock"), [stock])} style={{ alignItems: "center", paddingHorizontal: 4 }}>
        <Text style={{ fontFamily: F.display, fontSize: 24, lineHeight: 28, color: C.goldBright }}>{stock}<Text style={{ fontFamily: F.serif, fontSize: 16, color: SK.ink }}> / {CAP}</Text></Text>
        <Text style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 15, color: SK.muted }}>{t("it.bugday")}</Text>
      </View>
    </View>
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 8, paddingHorizontal: 14, marginTop: 8 }}>
      <GameIcon name="wheat" size={18} color={SK.gold} />
      <View style={{ flex: 1 }}><Bar pct={(stock / CAP) * 100} height={9} rtl={rtl} /></View>
    </View>
    <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
      <GameButton icon="wheat" disabled={!can} rtl={rtl} accessibilityLabel={t("ww.reserve.add")} accessibilityHint={why || undefined} onPress={() => { hap("success"); playChime(); apply(s => stockWarReserve(s)); }}>
        <Text style={{ fontFamily: F.display, fontSize: 14.5, color: C.inkOnGold, textAlign: "center" }}>{t("ww.reserve.add")}</Text>
      </GameButton>
      {!!why && <Text style={{ marginTop: 6, fontFamily: F.serifItalic, fontSize: 13, lineHeight: 17, color: SK.muted, textAlign: "center" }}>{why}</Text>}
    </View>
    <Pressable accessibilityLabel={t("sehir.how")} accessibilityState={{ expanded: open }} onPress={() => { hap("selection"); setOpen(o => !o); }}
      style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44, marginTop: 2 }}>
      <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: SK.gold }}>{t("sehir.how")}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 15, color: SK.gold, transform: [{ rotate: open ? "-90deg" : "90deg" }] }}>›</Text>
    </Pressable>
    {open && <View style={{ marginHorizontal: 12, marginBottom: 12, padding: 10, gap: 8, borderRadius: 4, borderWidth: 1, borderColor: SK.hair, backgroundColor: SK.well }}>
      <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 19, color: SK.ink, textAlign: align }}>{t("ww.reserve.rule")}</Text>
      {!warOn && <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 19, color: SK.muted, textAlign: align }}>{t("ww.aid.rule")}</Text>}
    </View>}
  </SPanel>;
}
