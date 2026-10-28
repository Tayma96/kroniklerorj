import { asayisOf, cityFx } from "../../lib/game";
import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { View, Text, ScrollView, ImageBackground } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { WarWorldCard } from "../../lib/war-world-ui";
import { NpcEconomyCard } from "../../lib/npc-economy-ui";
import { placeKind, recognition, publicPerception, atHome, regionOf, defaultRealm, factionById, beylikName, citySpecialtyIdx, buyIltizam, iltizamCost } from "../../lib/game";
import { cityInfo } from "../../lib/world";
import { useI18n, yuzdeL, applyParams } from "../../lib/i18n";
import { placeName } from "../../lib/locale-data";
import { C, F, T } from "../../lib/theme";
import { IllustratedHeader, OrnatePanel, HeaderIconButton, StatStrip, ListRow } from "../../lib/ornament-ui";
import { townSeasonImage, venueImage } from "../../lib/assets";
import { currentCalendar } from "../../lib/calendar";
import { GameIcon } from "../../lib/icons";
import { hap } from "../../lib/haptics";
import { ScreenFresk } from "../../lib/ui";

const KIND_KEY: Record<string, string> = { "şehir": "sehir", "kale": "kale", "köy": "koy" };
const KIND_ICON: Record<string, string> = { "şehir": "castle", "kale": "shield", "köy": "house" };

// Bu diyarda erişebileceğin yerler.
const VENUES = [
  { to: "/oyun/pazar", icon: "pazar", key: "scr.pazar" },
  { to: "/oyun/mahalle", icon: "house", key: "scr.mahalle" },
  { to: "/oyun/mulkler", icon: "castle", key: "scr.mulkler" },
  { to: "/oyun/hanedan", icon: "crown", key: "scr.hanedan" },
  { to: "/oyun/atolye", icon: "anvil", key: "scr.atolye" },
  { to: "/oyun/mektep", icon: "mektep", key: "scr.mektep" },
  { to: "/oyun/orgutler", icon: "orgutler", key: "scr.orgutler" },
  { to: "/oyun/iliskiler", icon: "iliskiler", key: "rel.headTitle" },
  { to: "/oyun/haberler", icon: "haberler", key: "scr.haberler" },
];

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, paddingVertical: 9, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.border + "AA" }}>
      <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchmentMuted }}>{label}</Text>
      <Text style={{ flexShrink: 1, textAlign: "right", fontFamily: F.serif, fontSize: 15, color: C.parchment }}>{value}</Text>
    </View>
  );
}

export default function Sehir() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, apply } = useGame();
  const { lang, t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const here = p.location_name;
  const kind = placeKind(here);
  const info = cityInfo(here, kind, lang);
  const home = atHome(p);
  const pp = publicPerception(state);
  const security = Math.round(asayisOf(state, here));
  const prosperity = Math.round(Math.max(0, Math.min(100, info.prosperity + cityFx(state, here).prosp)));

  return (
    <ScreenFresk>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 12, paddingBottom: insets.bottom + 110 }}>
        <IllustratedHeader topInset={insets.top} title={placeName(here, lang)} sub={`${t("kind." + KIND_KEY[kind])} · ${info.population.toLocaleString(lang)} ${t("diyar.pop")}`} source={townSeasonImage(currentCalendar(state.turn).season)}
          leading={<Pressable onPress={() => router.back()} style={{ alignSelf: "flex-start", minHeight: 36, justifyContent: "center", marginBottom: 2 }}><Text style={{ color: C.goldBright, fontFamily: F.display, fontSize: 13, textShadowColor: "#000", textShadowRadius: 6 }}>{t("common.back")}</Text></Pressable>}
          right={<HeaderIconButton icon="map" label={t("city.allRealm")} onPress={() => router.push("/oyun/harita")} />} />
        <View style={{ height: 12 }} />
        <OrnatePanel title={t("city.status")} icon="sun">
          <StatStrip rtl={lang === "ar"} items={[
            { icon: "shield", label: t("diyar.security"), value: `${security} / 100`, pct: security, tone: security < 35 ? C.blood : undefined },
            { icon: "coins", label: t("diyar.prosperity"), value: `${prosperity} / 100`, pct: prosperity, tone: prosperity < 35 ? C.ember : undefined },
            { icon: "family", label: t("soc.recog"), value: yuzdeL(Math.round(pp.recog * 100), lang), pct: pp.recog * 100 },
          ]} />
          {/* Memleket / gurbet + halkın algısı (tanınma sistemi) */}
          <View style={{ flexDirection: lang === "ar" ? "row-reverse" : "row", alignItems: "center", gap: 10, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderColor: C.border + "AA" }}>
            <GameIcon name={home ? "sehir" : "firsatlar"} size={20} color={home ? C.sage : C.frost} />
            <Text style={{ fontFamily: F.display, fontSize: 13, color: home ? C.sage : C.frost }}>{home ? t("soc.home") : t("soc.away")}</Text>
            <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, lineHeight: 21, color: C.parchmentDim }}>{t("percept." + pp.key)}</Text>
          </View>
        </OrnatePanel>

        {/* Buralarda — yerel imkânlar: ilk dördü büyük resimli kart, diğerleri küçük */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9, marginBottom: 12 }}>
          {VENUES.map((v, i) => {
            const id = v.to.split("/").pop() || "", big = i < 4, h = big ? 158 : 100;
            return <Pressable key={v.to} accessibilityLabel={t(v.key)} onPress={() => { hap("tap"); router.push(v.to as any); }} style={({ pressed }) => ({ flexBasis: "46%", flexGrow: 1, minHeight: h, borderRadius: 6, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card, overflow: "hidden", opacity: pressed ? 0.88 : 1 })}>
              <ImageBackground source={venueImage(id)} style={{ flex: 1, minHeight: h }}>
                <LinearGradient colors={["#0E0A0600", "#0E0A0699", "#0E0A06F2"]} locations={[0, 0.5, 1]} style={{ flex: 1, flexDirection: lang === "ar" ? "row-reverse" : "row", alignItems: "flex-end", padding: 10, gap: 6 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: lang === "ar" ? "row-reverse" : "row", alignItems: "center", gap: 6 }}>
                      {!big && <GameIcon name={v.icon} size={16} color={C.goldBright} />}
                      <Text style={{ fontFamily: F.display, fontSize: big ? 17 : 14, lineHeight: big ? 23 : 19, color: C.parchment, textShadowColor: "#000", textShadowRadius: 5 }}>{t(v.key)}</Text>
                    </View>
                    {big && <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: C.parchmentDim, textShadowColor: "#000", textShadowRadius: 4 }}>{t("city.v." + id)}</Text>}
                  </View>
                  <Text style={{ fontFamily: F.display, fontSize: 20, color: C.goldBright }}>{lang === "ar" ? "‹" : "›"}</Text>
                </LinearGradient>
              </ImageBackground>
            </Pressable>;
          })}
        </View>

        <WarWorldCard aid />
        <NpcEconomyCard />
        <OrnatePanel title={t("city.localInfo")} icon="scroll-open">
          <Text style={{ fontFamily: F.serif, fontSize: T.body, lineHeight: T.line, color: C.parchmentDim, marginBottom: 4 }}>{info.blurb}</Text>
          <InfoRow label={t("diyar.governor")} value={info.governor} />
          <InfoRow label={t("diyar.livelihood")} value={t("spec." + citySpecialtyIdx(state, here))} />
          {(() => {
            const sn = (state.realm ?? defaultRealm()).find((r) => r.id === regionOf(here));
            const f = sn ? factionById(sn.holder) : null;
            return <InfoRow label={t("realm.holder")} value={`${beylikName(regionOf(here))} · ${f ? t("fac." + f.id + ".n") : "—"}`} last />;
          })()}
        </OrnatePanel>

        {/* Vergi iltizamı — şehrin bir yıllık tahsilatını peşin al (geç oyun para kararı) */}
        {p.age >= 25 && p.fame >= 35 && (
          <View style={{ backgroundColor: "rgba(201,168,76,0.05)", borderWidth: 1, borderColor: "rgba(201,168,76,0.3)", borderRadius: 5, padding: 13, marginBottom: 16 }}>
            <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.goldDim }}>{t("city.iltizam").toUpperCase()}</Text>
            {(p.iltizam_until ?? 0) > state.turn ? (
              <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.sage, marginTop: 4 }}>{applyParams(t("city.iltizamActive"), [placeName(p.iltizam_loc || "", lang), (p.iltizam_until ?? 0) - state.turn])}</Text>
            ) : (
              <>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, marginTop: 3 }}>{t("city.iltizamDesc")}</Text>
                {(() => { const ic = iltizamCost(state); const can = p.money >= ic && !p.dead; return (
                  <Pressable disabled={!can} onPress={() => { hap("tap"); apply((s) => buyIltizam(s)); }} style={{ alignSelf: "flex-start", marginTop: 8, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 5, borderWidth: 1, borderColor: can ? "rgba(201,168,76,0.5)" : C.border, backgroundColor: can ? "rgba(201,168,76,0.12)" : "transparent", opacity: can ? 1 : 0.4 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 13, color: can ? C.gold : C.parchmentMuted }}>{applyParams(t("city.iltizamBuy"), [ic])}</Text>
                  </Pressable>
                ); })()}
              </>
            )}
          </View>
        )}

        {/* Diyarı gez */}
        <ListRow boxed first icon="map" title={t("city.allRealm")} sub={t("city.hint")} rtl={lang === "ar"} onPress={() => { hap("tap"); router.push("/oyun/harita"); }} />
      </ScrollView>
    </ScreenFresk>
  );
}
