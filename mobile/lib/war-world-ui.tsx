import { View, Text, Pressable } from "react-native";
import { useGame } from "./store";
import { useI18n, applyParams, yuzdeL } from "./i18n";
import { warReportAt, warAidCost, canWarAid, giveWarAid } from "./game";
import type { CivilAid } from "./war-world";
import { C, F } from "./theme";

export function WarWorldCard({ loc, aid = false }: { loc?: string; aid?: boolean }) {
  const { state, apply } = useGame();
  const { t, lang } = useI18n();
  if (!state || state.mpRealm) return null;
  const place = loc || state.player.location_name, report = warReportAt(state, place);
  if (!report.active && !report.affected) return null;
  const e = report.effects, r = report.region;
  const text = (key: string, params: (string | number)[]) => applyParams(t(key), params);
  const body = { fontFamily: F.serif, fontSize: 12, lineHeight: 19, color: C.parchmentMuted, marginTop: 6 };
  return <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, padding: 13, borderRadius: 10, marginVertical: 10 }}>
    <Text style={{ fontFamily: F.display, fontSize: 14, color: C.ember }}>{t("ww.title")}</Text>
    <Text style={body}>{t(report.active ? "ww.active" : "ww.peace")}</Text>
    <Text style={body}>{text("ww.effects", [yuzdeL(Math.round((1 - e.production) * 100), lang), yuzdeL(Math.round((e.foodDemand - 1) * 100), lang), yuzdeL(Math.round((1 - e.revenue) * 100), lang)])}</Text>
    <Text style={body}>{text("ww.causes", [Math.round(r.damage), Math.round(r.shortage), Math.round(r.exhaustion)])}</Text>
    {aid && place === state.player.location_name && <>
      <Text style={body}>{t("ww.aid.rule")}</Text>
      {(["food", "rebuild", "patrol"] as CivilAid[]).map(kind => {
        const cost = warAidCost(state, kind), enabled = canWarAid(state, kind);
        return <Pressable key={kind} disabled={!enabled} onPress={() => apply(s => giveWarAid(s, kind))} style={{ minHeight: 52, borderWidth: 1, borderColor: C.border, borderRadius: 7, padding: 10, marginTop: 8, opacity: enabled ? 1 : 0.45, justifyContent: "center" }}>
          <Text style={{ fontFamily: F.display, color: C.parchment, fontSize: 12 }}>{t("ww.aid." + kind)}</Text>
          <Text style={{ ...body, fontSize: 11, marginTop: 2 }}>{text("ww.cost." + kind, [cost.money])}</Text>
        </Pressable>;
      })}
    </>}
  </View>;
}
