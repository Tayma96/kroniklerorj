// Kendi tezgâhın (satışa kâr) ve kışlık kiler (güz/kış) kartları.
import { View, Text } from "react-native";
import type { GameState } from "../../game";
import { rentStall, stallCost, stallActive, stockWinter, winterStockCost } from "../../game";
import { currentCalendar } from "../../calendar";
import { useI18n, applyParams } from "../../i18n";
import { placeName } from "../../locale-data";
import { hap } from "../../haptics";
import { playCoin } from "../../sound";
import { C, F } from "../../theme";
import { Madalyon, EylemDugmesi } from "./parcalar";

type Apply = (fn: (s: GameState) => GameState) => void;

// Tezgâh kirası: sekmelerin üstünde ince bir şerit; kuruluysa kalan süre.
export function TezgahKirasi({ state, apply, rtl }: { state: GameState; apply: Apply; rtl: boolean }) {
  const { lang, t } = useI18n();
  const p = state.player;
  const row = rtl ? "row-reverse" as const : "row" as const;
  const rented = (p.stall_until ?? 0) > state.turn;
  const here = stallActive(state);
  const sc = stallCost(state);
  const can = p.money >= sc && p.age >= 13 && !p.dead;
  return <View style={{ flexDirection: row, alignItems: "center", gap: 10, marginTop: 10, marginBottom: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: rented && here ? C.sage + "88" : C.borderHi, backgroundColor: "rgba(22,16,9,0.88)" }}>
    <Madalyon icon="house" tone={rented ? (here ? C.sage : C.parchmentMuted) : C.gold} size={38} />
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 14.5, color: C.gold, textAlign: rtl ? "right" : "left" }}>{t("paz.stall")}</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 19, color: rented ? (here ? C.sage : C.parchmentMuted) : C.parchmentMuted, textAlign: rtl ? "right" : "left" }}>
        {rented ? applyParams(t(here ? "paz.stallActive" : "paz.stallAway"), [placeName(p.stall_loc || "", lang), (p.stall_until ?? 0) - state.turn]) : t("pazar.stallShort")}
      </Text>
    </View>
    {!rented && <EylemDugmesi rtl={rtl} disabled={!can} filled label={t("pazar.rent")} sub={`−${sc} ⚜`} a11y={applyParams(t("paz.stallRent"), [sc])} style={{ minWidth: 84 }} onPress={() => { hap("tap"); playCoin(); apply((s) => rentStall(s)); }} />}
  </View>;
}

export function kilerMevsimi(state: GameState): boolean {
  const season = currentCalendar(state.turn).season;
  return season === "Sonbahar" || season === "Kış";
}

// Kışlık kiler — güz/kış aylarında yiyecek sekmesinin başında.
export function KislikKiler({ state, apply, rtl }: { state: GameState; apply: Apply; rtl: boolean }) {
  const { t } = useI18n();
  if (!kilerMevsimi(state)) return null;
  const p = state.player;
  const stocked = (p.winter_stock_until ?? 0) >= state.turn;
  const wc = winterStockCost(state);
  const can = !stocked && p.money >= wc && p.age >= 16 && !p.dead;
  return <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10, marginBottom: 14, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: C.frost + "77", backgroundColor: "rgba(20,24,30,0.88)" }}>
    <Madalyon icon="amphora" tone={stocked ? C.sage : C.frost} size={38} />
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 14.5, color: C.frost, textAlign: rtl ? "right" : "left" }}>{t("paz.winter")}</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 19, color: stocked ? C.sage : C.parchmentDim, textAlign: rtl ? "right" : "left" }}>{t(stocked ? "paz.winterFull" : "paz.winterDesc")}</Text>
    </View>
    {!stocked && <EylemDugmesi rtl={rtl} tone={C.frost} filled disabled={!can} label={t("pazar.fill")} sub={`−${wc} ⚜`} a11y={applyParams(t("paz.winterBuy"), [wc])} style={{ minWidth: 84 }} onPress={() => { hap("tap"); playCoin(); apply((s) => stockWinter(s)); }} />}
  </View>;
}
