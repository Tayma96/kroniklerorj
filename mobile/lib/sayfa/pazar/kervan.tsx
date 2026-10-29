// Kervan sekmesi: yoldaki kervanın güzergâhı ya da yeni sefer (yük + varış, kefalet, sermaye).
import { useState } from "react";
import { View, Text } from "react-native";
import type { GameState } from "../../game";
import { launchCaravan, caravanRouteOptions, caravanPremium } from "../../game";
import { ITEMS } from "../../world";
import { caravanRouteText } from "../../caravan-route-locales";
import { useI18n, yuzdeL } from "../../i18n";
import { placeName } from "../../locale-data";
import { hap } from "../../haptics";
import { DesignPressable as Pressable } from "../../design-pressable";
import { GameIcon } from "../../icons";
import { C, F } from "../../theme";
import { Bolum, Not, Madalyon, dugmeStil } from "./parcalar";
import { malIkonu } from "./tezgahlar";

const CARAVAN_AMOUNTS = [100, 300, 1000, 3000]; // doygunluk çekirdekte: büyük yük güvenle açıldı — yüzde düşer, mutlak kazanç ölçeklenir (gerçek karar)

// Yoldaki kervan: durak durak güzergâh, deve şu anki durakta.
function Guzergah({ route, step, rtl }: { route: string[]; step: number; rtl: boolean }) {
  const { lang } = useI18n();
  return <View style={{ marginTop: 4 }}>
    {route.map((stop, i) => {
      const cur = i === step, done = i < step, last = i === route.length - 1;
      return <View key={i} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "stretch", gap: 10 }}>
        <View style={{ width: 28, alignItems: "center" }}>
          <View style={{ width: 2, height: 8, backgroundColor: i === 0 ? "transparent" : done || cur ? C.ember : C.border }} />
          {cur
            ? <Madalyon icon="camel" tone={C.ember} size={28} />
            : <View style={{ width: 12, height: 12, borderRadius: 6, marginVertical: 8, backgroundColor: done ? C.ember : "transparent", borderWidth: 2, borderColor: done ? C.ember : C.borderHi }} />}
          <View style={{ flex: 1, width: 2, minHeight: 8, backgroundColor: last ? "transparent" : done ? C.ember : C.border }} />
        </View>
        <Text style={{ flex: 1, alignSelf: "center", fontFamily: cur ? F.display : F.serif, fontSize: cur ? 15 : 15, color: cur ? C.ember : done ? C.parchmentMuted : C.parchmentDim, textAlign: rtl ? "right" : "left" }}>{placeName(stop, lang)}</Text>
      </View>;
    })}
  </View>;
}

export function KervanSekmesi({ state, apply, rtl }: { state: GameState; apply: (fn: (s: GameState) => GameState) => void; rtl: boolean }) {
  const { lang, t } = useI18n();
  const [sigorta, setSigorta] = useState(false);
  const [routeId, setRouteId] = useState<string | null>(null);
  const p = state.player;
  const cv = state.caravan;
  const row = rtl ? "row-reverse" as const : "row" as const;

  if (cv) {
    return <Bolum title={t("pazar.onRoad")} icon="camel" tone={C.ember} rtl={rtl}>
      <Not rtl={rtl}>{t("paz.caravanActive").replace("%d", placeName(cv.dest, lang)).replace("%c", String(cv.invested))}</Not>
      {!!cv.good && <View style={{ flexDirection: row, alignItems: "center", gap: 8, marginBottom: 6 }}>
        <GameIcon name={malIkonu(ITEMS[cv.good] || {})} size={18} color={C.goldDim} />
        <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchmentDim, textAlign: rtl ? "right" : "left" }}>{caravanRouteText(lang, "cargo")}: {t("it." + cv.good)}{cv.spread != null ? ` · ${caravanRouteText(lang, "gap").toLowerCase()} ${yuzdeL(Math.round((cv.spread - 1) * 100), lang)}` : ""}</Text>
      </View>}
      {cv.route && <Guzergah route={cv.route} step={cv.step ?? 0} rtl={rtl} />}
      {!!cv.lost && cv.lost > 0 && <View style={{ flexDirection: row, alignItems: "center", gap: 8, marginTop: 8 }}>
        <GameIcon name="crossed-swords" size={16} color={C.blood} />
        <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, color: C.blood, textAlign: rtl ? "right" : "left" }}>{t("paz.caravanLost").replace("%c", String(cv.lost))}</Text>
      </View>}
    </Bolum>;
  }

  const routes = caravanRouteOptions(state).slice(0, 3);
  const selected = routes.find((r) => `${r.dest}|${r.good}` === routeId) || routes[0];
  const young = p.age < 13;
  return <>
    <Bolum title={t("paz.caravanTitle")} icon="camel" tone={C.ember} rtl={rtl}>
      <Not rtl={rtl}>{t("paz.caravanHint")}</Not>
      {!!(p.retinue || 0) && <Not rtl={rtl} tone={C.sage}>{t("paz.caravanGuard").replace("%c", String(p.retinue || 0))}</Not>}
      {young && <Not rtl={rtl} tone={C.ember}>{t("pazar.young13")}</Not>}
    </Bolum>

    {!!routes.length && <Bolum title={caravanRouteText(lang, "title")} icon="map" rtl={rtl}>
      <Not rtl={rtl}>{caravanRouteText(lang, "hint")}</Not>
      <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
        {routes.map((route) => {
          const key = `${route.dest}|${route.good}`;
          const on = selected?.dest === route.dest && selected?.good === route.good;
          const gap = Math.round((route.spread - 1) * 100);
          return <Pressable key={key} accessibilityRole="radio" accessibilityState={{ selected: on, checked: on }} accessibilityLabel={`${t("it." + route.good)}, ${placeName(route.dest, lang)}, ${caravanRouteText(lang, "gap")} ${yuzdeL(gap, lang)}`}
            onPress={() => { hap("tap"); setRouteId(key); }}
            style={({ pressed }) => ({ flexDirection: row, alignItems: "center", gap: 10, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 9, borderWidth: on ? 1.5 : 1, borderColor: on ? C.ember : pressed ? C.borderHi : C.border, backgroundColor: on ? "rgba(224,90,48,0.12)" : "rgba(14,10,6,0.6)" })}>
            <Madalyon icon={malIkonu(ITEMS[route.good] || {})} tone={on ? C.ember : C.parchmentMuted} size={40} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: F.display, fontSize: 14, color: C.parchment, textAlign: rtl ? "right" : "left" }}>{t("it." + route.good)}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentMuted, textAlign: rtl ? "right" : "left" }}>{placeName(p.location_name, lang)} {rtl ? "←" : "→"} {placeName(route.dest, lang)}</Text>
            </View>
            <View style={{ alignItems: "center", gap: 3 }}>
              <Text style={{ fontFamily: F.display, fontSize: 16, color: gap >= 0 ? C.sage : C.blood }}>{gap > 0 ? "+" : ""}{yuzdeL(gap, lang)}</Text>
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: on ? C.ember : C.borderHi, alignItems: "center", justifyContent: "center" }}>
                {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.ember }} /> : null}
              </View>
            </View>
          </Pressable>;
        })}
      </View>
    </Bolum>}

    <Bolum title={t("pazar.invest")} icon="coins" rtl={rtl}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: sigorta }} accessibilityLabel={t("paz.caravanInsure")} onPress={() => { hap("tap"); setSigorta(!sigorta); }}
        style={({ pressed }) => ({ flexDirection: row, alignItems: "center", gap: 10, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 10, borderRadius: 9, borderWidth: 1, borderColor: sigorta ? C.sage + "AA" : pressed ? C.borderHi : C.border, backgroundColor: sigorta ? "rgba(74,154,90,0.12)" : "transparent" })}>
        <View style={{ width: 26, height: 26, borderRadius: 6, borderWidth: 1.5, borderColor: sigorta ? C.sage : C.borderHi, backgroundColor: sigorta ? "rgba(74,154,90,0.3)" : "transparent", alignItems: "center", justifyContent: "center" }}>
          {sigorta && <GameIcon name="shield" size={15} color={C.sage} />}
        </View>
        <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: sigorta ? C.parchment : C.parchmentDim, textAlign: rtl ? "right" : "left" }}>{t("paz.caravanInsure")}</Text>
      </Pressable>
      <View style={{ flexDirection: row, flexWrap: "wrap", gap: 8 }}>
        {CARAVAN_AMOUNTS.map((amt) => {
          const prem = sigorta ? caravanPremium(amt) : 0;
          const dis = p.money < amt + prem || young;
          return <Pressable key={amt} disabled={dis} accessibilityState={{ disabled: dis }} accessibilityLabel={`${amt} ⚜${prem ? ` + ${prem} ${t("pazar.bond")}` : ""}`}
            onPress={() => { hap("advance"); apply((s) => launchCaravan(s, amt, sigorta, selected)); }}
            style={({ pressed }) => [dugmeStil(pressed, C.ember, dis, true), { flexBasis: "46%", flexGrow: 1, minHeight: 58, flexDirection: "column", gap: 0 }]}>
            <Text style={{ fontFamily: F.display, fontSize: 18, lineHeight: 23, color: dis ? C.parchmentMuted : C.ember }}>{amt} ⚜</Text>
            {prem ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 17, color: dis ? C.parchmentMuted : C.sage }}>+{prem} {t("pazar.bond")}</Text> : null}
          </Pressable>;
        })}
      </View>
    </Bolum>
  </>;
}
