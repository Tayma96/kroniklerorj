import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useGame } from "./store";
import { playerArmyWar, warReportAt, regionOf } from "./game";
import { useI18n } from "./i18n";
import { DesignPressable } from "./design-pressable";
import { GameIcon } from "./icons";
import { C, F } from "./theme";

export function RealmNotices() {
  const { state } = useGame(), { t } = useI18n(), router = useRouter();
  if (!state || state.mpRealm || state.player.dead) return null;
  const p = state.player, war = playerArmyWar(state), report = warReportAt(state, p.location_name);
  const own = p.crownSeat || regionOf(p.home_name || p.location_name);
  const offers = p.crowned ? state.diplomacy?.offers.filter(o => o.to === own && o.until > state.turn).length || 0 : 0;
  const rows = [
    ...(report.active || war && !war.winner ? [{ route: "/oyun/savas", icon: "crossed-swords", title: t("army.title"), sub: t(report.active ? "ww.active" : "army.scale"), color: C.blood }] : []),
    ...(offers ? [{ route: "/oyun/diplomasi", icon: "scroll-open", title: `${t("dp.inbox")} · ${offers}`, sub: t("dp.title"), color: C.gold }] : []),
  ];
  return <View>{rows.map(row => <DesignPressable key={row.route} onPress={() => router.push(row.route as any)} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: row.color + "88", borderRadius: 4, backgroundColor: row.color + "12", padding: 12, marginBottom: 12 }}>
    <GameIcon name={row.icon} color={row.color} size={24} /><View style={{ flex: 1 }}><Text style={{ fontFamily: F.display, fontSize: 14, color: row.color }}>{row.title}</Text><Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 22, color: C.parchment }}>{row.sub}</Text></View><Text style={{ color: row.color }}>›</Text>
  </DesignPressable>)}</View>;
}
