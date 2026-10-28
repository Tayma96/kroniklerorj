import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useGame } from "./store";
import { playerArmyWar, warReportAt, regionOf, type GameState } from "./game";
import { useI18n } from "./i18n";
import { AlertBanner } from "./ornament-ui";
import { C } from "./theme";

// Ana ekran uyarı rozeti için aynı satırların sayısı (savaş cephesi, gelen elçilik).
export function noticeRows(state: GameState, t: (k: string) => string) {
  if (state.mpRealm || state.player.dead) return [];
  const p = state.player, war = playerArmyWar(state), report = warReportAt(state, p.location_name);
  const own = p.crownSeat || regionOf(p.home_name || p.location_name);
  const offers = p.crowned ? state.diplomacy?.offers.filter(o => o.to === own && o.until > state.turn).length || 0 : 0;
  return [
    ...(report.active || war && !war.winner ? [{ route: "/oyun/savas", icon: "crossed-swords", title: t("army.title"), sub: t(report.active ? "ww.active" : "army.scale"), color: C.blood }] : []),
    ...(offers ? [{ route: "/oyun/diplomasi", icon: "scroll-open", title: `${t("dp.inbox")} · ${offers}`, sub: t("dp.title"), color: C.gold }] : []),
  ];
}
export function realmNoticeCount(state: GameState): number { return noticeRows(state, (k) => k).length; }

export function RealmNotices() {
  const { state } = useGame(), { t, lang } = useI18n(), router = useRouter();
  if (!state) return null;
  const rows = noticeRows(state, t);
  return <View>{rows.map(row => <AlertBanner key={row.route} icon={row.icon} title={row.title} sub={row.sub} tone={row.color} rtl={lang === "ar"} onPress={() => router.push(row.route as any)} />)}</View>;
}
