// Şehrin Durumu, yerel haneler, eserler, iltizam ve künye panelleri.
import { View, Text, useWindowDimensions } from "react-native";
import { useGame } from "../../store";
import { useI18n, applyParams, yuzdeL } from "../../i18n";
import { placeName } from "../../locale-data";
import { GameButton } from "../../ui";
import { GameIcon } from "../../icons";
import { hap } from "../../haptics";
import { playTap } from "../../sound";
import { asayisOf, cityFx, cityEconomy, publicPerception, locEventsAt, LOC_EVENT_TYPES, worksOf, iltizamCost, buyIltizam } from "../../game";
import { C, F } from "../../theme";
import { SPanel, SPanelHeader, Gauge, Bar, Medallion, SK } from "./parcalar";

const WORK_ICON: Record<string, string> = { cesme: "bucket", kopru: "walk", imarethane: "bread", burc: "castle" };

export function SehirDurumu({ prosperityBase }: { prosperityBase: number }) {
  const { state } = useGame(), { t, lang } = useI18n(), { width } = useWindowDimensions();
  if (!state) return null;
  const rtl = lang === "ar", here = state.player.location_name;
  const security = Math.round(asayisOf(state, here));
  const prosperity = Math.round(Math.max(0, Math.min(100, prosperityBase + cityFx(state, here).prosp)));
  const pp = publicPerception(state), recog = Math.round(pp.recog * 100);
  const events = locEventsAt(state, here).filter((x, i, a) => a.indexOf(x) === i && LOC_EVENT_TYPES[x]);
  const align = rtl ? "right" as const : "left" as const;
  const labels = [t("diyar.security"), t("diyar.prosperity"), t("soc.recog")];
  // Üç sütundan en uzun ad ikonla yan yana sığmıyorsa hepsi aynı biçimde istiflenir (≈6 pt/harf).
  const stacked = Math.max(...labels.map(l => l.length)) * 6.1 + 47 > (width - 2 * SK.side - 8) / 3;
  return <SPanel>
    <SPanelHeader title={t("city.status")} rtl={rtl} />
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", paddingHorizontal: 4, paddingTop: 4, paddingBottom: 12 }}>
      <Gauge rtl={rtl} stacked={stacked} sep={false} icon="shield" label={labels[0]} pct={security} value={String(security)} unit=" / 100" low={security < 35} />
      <Gauge rtl={rtl} stacked={stacked} sep icon="coins" label={labels[1]} pct={prosperity} value={String(prosperity)} unit=" / 100" low={prosperity < 35} />
      <Gauge rtl={rtl} stacked={stacked} sep icon="family" label={labels[2]} pct={recog} value={yuzdeL(recog, lang)} />
    </View>
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10, marginHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderColor: SK.hair }}>
      <GameIcon name="prayer-beads" size={18} color={SK.gold} />
      <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 19, color: SK.ink, textAlign: align }}>{t("percept." + pp.key)}</Text>
    </View>
    {events.length > 0 && <View style={{ marginHorizontal: 12, marginBottom: 12, borderRadius: 4, borderWidth: 1, borderColor: SK.hair, backgroundColor: SK.well }}>
      <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1.2, color: SK.muted, paddingHorizontal: 10, paddingTop: 8, textAlign: align }}>{t("lev.head")}</Text>
      {events.map((type, i) => {
        const ev = LOC_EVENT_TYPES[type], bad = ev.prosp + ev.sec < 0;
        return <View key={type} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 9, paddingHorizontal: 10, paddingVertical: 7, borderTopWidth: i ? 1 : 0, borderColor: "rgba(140,107,55,0.3)" }}>
          <GameIcon name={ev.icon} size={17} color={bad ? "#E8796A" : "#8FD07A"} />
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: SK.ink, textAlign: align }}>{applyParams(t("lev." + type), [placeName(here, lang)])}</Text>
        </View>;
      })}
    </View>}
  </SPanel>;
}

// Yerel haneler ve işgücü: sayılar döşemede, hizmetler küçük göstergede.
export function HalkPaneli() {
  const { state } = useGame(), { t, lang } = useI18n();
  if (!state || state.mpRealm) return null;
  const rtl = lang === "ar", e = cityEconomy(state, state.player.location_name);
  const num = (n: number) => n.toLocaleString(lang, { maximumFractionDigits: 1 });
  const tiles = [
    { icon: "family", label: t("sehir.residents"), value: num(e.residents) },
    { icon: "bread", label: t("sehir.mouths"), value: num(Math.round(e.mouths * 10) / 10) },
    { icon: "anvil", label: t("sehir.labor"), value: num(Math.round(e.productive * 10) / 10) },
  ];
  const services = [
    { id: "trade", label: t("sehir.svc.trade"), v: e.services.trade },
    { id: "care", label: t("sehir.svc.care"), v: e.services.care },
    { id: "security", label: t("diyar.security"), v: e.services.security },
    { id: "culture", label: t("sehir.svc.culture"), v: e.services.culture },
  ];
  const align = rtl ? "right" as const : "left" as const;
  return <SPanel>
    <SPanelHeader title={t("dp.npc.title")} icon="family" rtl={rtl} />
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 6, paddingHorizontal: 12, paddingTop: 4 }}>
      {tiles.map(x => <View key={x.label} accessible accessibilityLabel={`${x.label}: ${x.value}`} style={{ flex: 1, minWidth: 0, alignItems: "center", paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: SK.hair, backgroundColor: SK.well }}>
        <GameIcon name={x.icon} size={17} color={SK.gold} />
        <Text style={{ fontFamily: F.display, fontSize: 18, lineHeight: 23, color: "#F4E8CF" }}>{x.value}</Text>
        <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 12, lineHeight: 15, color: SK.muted }}>{x.label}</Text>
      </View>)}
    </View>
    <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1.2, color: SK.muted, paddingHorizontal: 14, marginTop: 12, textAlign: align }}>{t("sehir.services")}</Text>
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", columnGap: 14, rowGap: 8, paddingHorizontal: 14, paddingTop: 6 }}>
      {services.map(s => { const pct = Math.round(s.v * 100); return <View key={s.id} accessible accessibilityLabel={`${s.label}: ${yuzdeL(pct, lang)}`} style={{ flexBasis: "44%", flexGrow: 1 }}>
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", justifyContent: "space-between", marginBottom: 3 }}>
          <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 16, color: SK.ink }}>{s.label}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 16, color: SK.muted }}>{yuzdeL(pct, lang)}</Text>
        </View>
        <Bar pct={pct} low={pct < 20} rtl={rtl} />
      </View>; })}
    </View>
    <Text style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: SK.muted, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, textAlign: align }}>{t("dp.npc.hint")}</Text>
  </SPanel>;
}

// Hanedanın bu şehre yaptırdığı kalıcı bayındırlık eserleri (varsa).
export function SehirEserleri() {
  const { state } = useGame(), { t, lang } = useI18n();
  if (!state) return null;
  const rtl = lang === "ar", here = state.player.location_name;
  const works = [...new Set([...(state.eserler?.[here] || []), ...worksOf(state.player, here)])];
  if (!works.length) return null;
  return <SPanel>
    <SPanelHeader title={t("sehir.works")} rtl={rtl} />
    <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: SK.muted, paddingHorizontal: 14, textAlign: rtl ? "right" : "left" }}>{t("sehir.worksSub")}</Text>
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 8, padding: 12 }}>
      {works.map(id => <View key={id} style={{ flexBasis: "46%", flexGrow: 1, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 9, minHeight: 50, paddingHorizontal: 8, borderRadius: 4, borderWidth: 1, borderColor: SK.hair, backgroundColor: SK.well }}>
        <Medallion icon={WORK_ICON[id] || "house"} size={34} />
        <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, lineHeight: 18, color: "#F4E8CF", textAlign: rtl ? "right" : "left" }}>{t("gov.wkn." + id)}</Text>
      </View>)}
    </View>
  </SPanel>;
}

// Vergi iltizamı: bir yıllık tahsilatı peşin al (geç oyun para kararı).
export function IltizamPaneli() {
  const { state, apply } = useGame(), { t, lang } = useI18n();
  if (!state) return null;
  const p = state.player, rtl = lang === "ar";
  if (!(p.age >= 25 && p.fame >= 35)) return null;
  const active = (p.iltizam_until ?? 0) > state.turn;
  const ic = iltizamCost(state), can = p.money >= ic && !p.dead;
  const align = rtl ? "right" as const : "left" as const;
  return <SPanel>
    <SPanelHeader title={t("city.iltizam")} icon="coins" rtl={rtl} />
    {active
      ? <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 20, color: "#8FD07A", paddingHorizontal: 14, paddingBottom: 14, textAlign: align }}>{applyParams(t("city.iltizamActive"), [placeName(p.iltizam_loc || "", lang), (p.iltizam_until ?? 0) - state.turn])}</Text>
      : <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
        <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: SK.ink, paddingHorizontal: 2, textAlign: align }}>{t("city.iltizamDesc")}</Text>
        <GameButton variant="secondary" icon="coins" rtl={rtl} disabled={!can} accessibilityLabel={applyParams(t("city.iltizamBuy"), [ic])} onPress={() => { hap("success"); playTap(); apply((s) => buyIltizam(s)); }} style={{ marginTop: 10 }}>
          <Text style={{ fontFamily: F.display, fontSize: 13.5, color: can ? C.goldBright : C.parchmentMuted, textAlign: rtl ? "right" : "left" }}>{applyParams(t("city.iltizamBuy"), [ic])}</Text>
        </GameButton>
      </View>}
  </SPanel>;
}
