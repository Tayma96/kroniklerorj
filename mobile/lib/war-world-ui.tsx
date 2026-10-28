import { LinearGradient } from "expo-linear-gradient";
import { OrnatePanel } from "./ornament-ui";
import { GameButton } from "./ui";
import { GameIcon } from "./icons";
import { View, Text} from "react-native";
import { useGame } from "./store";
import { useI18n, applyParams, yuzdeL } from "./i18n";
import { warReportAt, warAidCost, canWarAid, giveWarAid, warReserveAt, canStockWarReserve, stockWarReserve } from "./game";
import type { CivilAid } from "./war-world";
import { C, F } from "./theme";

export function WarWorldCard({ loc, aid = false }: { loc?: string; aid?: boolean }) {
  const { state, apply } = useGame();
  const { t, lang } = useI18n();
  if (!state || state.mpRealm) return null;
  const place = loc || state.player.location_name, report = warReportAt(state, place);
  if (!report.active && !report.affected && !aid) return null;
  const affected = report.active || report.affected;
  const e = report.effects, r = report.region;
  const text = (key: string, params: (string | number)[]) => applyParams(t(key), params);
  const body = { fontFamily: F.serif, fontSize: 15, lineHeight: 22, color: C.parchmentDim, marginTop: 6 };
  const stock = warReserveAt(state, place), canStock = canStockWarReserve(state);
  return <OrnatePanel title={t(affected ? "ww.title" : "ww.reserve.title")} icon={affected ? "crossed-swords" : "wheat"} tone={affected ? C.ember : C.gold}>
    {affected && <>
    <Text style={body}>{t(report.active ? "ww.active" : "ww.peace")}</Text>
    <Text style={body}>{text("ww.effects", [yuzdeL(Math.round((1 - e.production) * 100), lang), yuzdeL(Math.round((e.foodDemand - 1) * 100), lang), yuzdeL(Math.round((1 - e.revenue) * 100), lang)])}</Text>
    <Text style={body}>{text("ww.causes", [Math.round(r.damage), Math.round(r.shortage), Math.round(r.exhaustion)])}</Text>
    {!!r.occupation && <Text style={body}>{text("ww.occupation", [Math.round(r.occupation)])}</Text>}
    </>}
    {aid && place === state.player.location_name && <>
      {/* Bölge ambarı: doluluk bir bakışta, kural ayrıntısı altında */}
      <View style={{ flexDirection: lang === "ar" ? "row-reverse" : "row", alignItems: "center", gap: 10, marginTop: affected ? 12 : 0 }}>
        <GameIcon name="wheat" size={26} color={C.gold} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchment }}>{text("ww.reserve.stock", [stock])}</Text>
          <View style={{ height: 7, marginTop: 6, borderRadius: 4, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.bg, overflow: "hidden" }}>
            <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={[C.goldDim, C.goldBright]} style={{ width: `${Math.min(100, (stock / 40) * 100)}%`, height: "100%" }} />
          </View>
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 22, color: C.goldBright }}>{stock}<Text style={{ fontSize: 14, color: C.parchmentMuted }}> / 40</Text></Text>
      </View>
      <Text style={{ ...body, fontSize: 14, lineHeight: 20 }}>{t("ww.reserve.rule")}</Text>
      <GameButton icon="wheat" disabled={!canStock} rtl={lang === "ar"} accessibilityLabel={t("ww.reserve.add")} onPress={() => apply(s => stockWarReserve(s))} style={{ marginTop: 10 }}>
        <Text style={{ fontFamily: F.display, fontSize: 14, color: C.inkOnGold, textAlign: "center" }}>{t("ww.reserve.add")}</Text>
      </GameButton>
      <Text style={{ ...body, fontSize: 14, lineHeight: 20 }}>{t("ww.aid.rule")}</Text>
      {affected && (["food", "rebuild", "patrol"] as CivilAid[]).map(kind => {
        const cost = warAidCost(state, kind), enabled = canWarAid(state, kind);
        return <GameButton key={kind} variant="secondary" disabled={!enabled} rtl={lang === "ar"} icon={kind === "food" ? "bread" : kind === "rebuild" ? "house" : "shield"} accessibilityLabel={t("ww.aid." + kind)} onPress={() => apply(s => giveWarAid(s, kind))} style={{ marginTop: 8 }}>
          <Text style={{ fontFamily: F.display, color: C.parchment, fontSize: 13 }}>{t("ww.aid." + kind)}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentMuted }}>{text("ww.cost." + kind, [cost.money])}</Text>
        </GameButton>;
      })}
    </>}
  </OrnatePanel>;
}
