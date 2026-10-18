import { View, Text, ScrollView, Pressable, ImageBackground } from "react-native";
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
import { IllustratedHeader, OrnatePanel } from "../../lib/ornament-ui";
import { SAHNE_GORSEL } from "../../lib/sahne-tema";
import { GameIcon } from "../../lib/icons";
import { hap } from "../../lib/haptics";
import { BackLabel, PageHeader, ScreenFresk } from "../../lib/ui";

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
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.border }}>
      <Text style={{ fontFamily: F.display, fontSize: 10.5, letterSpacing: 1, color: C.parchmentMuted, textTransform: "uppercase" }}>{label}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchment }}>{value}</Text>
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

  return (
    <ScreenFresk style={{ paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <IllustratedHeader title={placeName(here, lang)} sub={`${t("kind." + KIND_KEY[kind])} · ${info.population.toLocaleString(lang)} ${t("diyar.pop")}`} row={1} />
        <View style={{ flexDirection: "row", gap: 8, paddingVertical: 14 }}>
          {[{icon:"shield",key:"diyar.security",value:`${info.security}/100`},{icon:"coins",key:"diyar.prosperity",value:`${info.prosperity}/100`},{icon:"family",key:"soc.recog",value:yuzdeL(Math.round(pp.recog * 100),lang)}].map(x => <View key={x.key} style={{ flex: 1, alignItems: "center", padding: 8, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.surface, borderRadius: 4 }}><GameIcon name={x.icon} color={C.gold} size={20}/><Text style={{fontFamily:F.display,fontSize:T.body,color:C.parchment,marginVertical:4}}>{x.value}</Text><Text style={{fontFamily:F.serif,fontSize:T.caption,color:C.parchmentMuted,textAlign:"center"}}>{t(x.key)}</Text></View>)}
        </View>

        {/* Memleket / gurbet + halkın algısı (tanınma sistemi) */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: home ? "rgba(127,166,106,0.10)" : "rgba(111,160,192,0.10)", borderWidth: 1, borderColor: home ? "rgba(127,166,106,0.4)" : "rgba(111,160,192,0.4)", borderRadius: 12, padding: 13, marginBottom: 14 }}>
          <GameIcon name={home ? "sehir" : "firsatlar"} size={22} color={home ? C.sage : C.frost} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 0.5, color: home ? C.sage : C.frost }}>{home ? t("soc.home") : t("soc.away")}</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchment, marginTop: 2 }}>{t("percept." + pp.key)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontFamily: F.display, fontSize: 16, color: home ? C.sage : C.frost }}>{yuzdeL(Math.round(pp.recog * 100), lang)}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 8, letterSpacing: 0.5, color: C.parchmentMuted }}>{t("soc.recog").toUpperCase()}</Text>
          </View>
        </View>

        {/* Buralarda — yerel imkânlar */}
        <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase", marginBottom: 9 }}>{t("city.venues")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9, marginBottom: 16 }}>
          {VENUES.map((v) => (
            <Pressable key={v.to} onPress={() => { hap("tap"); router.push(v.to as any); }} style={({ pressed }) => ({ flexBasis: "46%", flexGrow: 1, minHeight: 108, borderRadius: 4, borderWidth: 1, borderColor: C.goldDim, backgroundColor: C.card, overflow: "hidden", opacity: pressed ? 0.7 : 1 })}>
              <ImageBackground source={v.to.endsWith("mahalle") ? SAHNE_GORSEL.ev_yoksul : v.to.endsWith("mulkler") ? SAHNE_GORSEL.hasat : v.to.endsWith("hanedan") ? SAHNE_GORSEL.ev_varlikli : SAHNE_GORSEL.cami_avlu} style={{ flex: 1, minHeight: 108 }} imageStyle={{ opacity: 0.65 }}>
                <LinearGradient colors={["#0D0A0600",C.bg]} style={{ flex: 1, justifyContent: "flex-end", padding: 12, gap: 6 }}><GameIcon name={v.icon} size={24} color={C.gold} /><Text style={{ fontFamily: F.display, fontSize: T.label, color: C.parchment }}>{t(v.key)}</Text></LinearGradient>
              </ImageBackground>
            </Pressable>
          ))}
        </View>

        <WarWorldCard aid />
        <NpcEconomyCard />
        <OrnatePanel title={t("city.localInfo")}><Text style={{fontFamily:F.serif,fontSize:T.body,lineHeight:T.line,color:C.parchmentMuted}}>{info.blurb}</Text></OrnatePanel>

        {/* Diyar künyesi */}
        <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 2, color: C.goldDim, textTransform: "uppercase", marginBottom: 9 }}>{t("city.localInfo")}</Text>
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, marginBottom: 16 }}>
          <InfoRow label={t("diyar.governor")} value={info.governor} />
          <InfoRow label={t("diyar.security")} value={`${info.security}/100`} />
          <InfoRow label={t("diyar.prosperity")} value={`${info.prosperity}/100`} />
          <InfoRow label={t("diyar.livelihood")} value={t("spec." + citySpecialtyIdx(state, here))} />
          {(() => {
            const sn = (state.realm ?? defaultRealm()).find((r) => r.id === regionOf(here));
            const f = sn ? factionById(sn.holder) : null;
            return <InfoRow label={t("realm.holder")} value={`${beylikName(regionOf(here))} · ${f ? t("fac." + f.id + ".n") : "—"}`} last />;
          })()}
        </View>

        {/* Vergi iltizamı — şehrin bir yıllık tahsilatını peşin al (geç oyun para kararı) */}
        {p.age >= 25 && p.fame >= 35 && (
          <View style={{ backgroundColor: "rgba(201,168,76,0.05)", borderWidth: 1, borderColor: "rgba(201,168,76,0.3)", borderRadius: 12, padding: 13, marginBottom: 16 }}>
            <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1.5, color: C.goldDim }}>{t("city.iltizam").toUpperCase()}</Text>
            {(p.iltizam_until ?? 0) > state.turn ? (
              <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.sage, marginTop: 4 }}>{applyParams(t("city.iltizamActive"), [placeName(p.iltizam_loc || "", lang), (p.iltizam_until ?? 0) - state.turn])}</Text>
            ) : (
              <>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted, marginTop: 3 }}>{t("city.iltizamDesc")}</Text>
                {(() => { const ic = iltizamCost(state); const can = p.money >= ic && !p.dead; return (
                  <Pressable disabled={!can} onPress={() => { hap("tap"); apply((s) => buyIltizam(s)); }} style={{ alignSelf: "flex-start", marginTop: 8, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 7, borderWidth: 1, borderColor: can ? "rgba(201,168,76,0.5)" : C.border, backgroundColor: can ? "rgba(201,168,76,0.12)" : "transparent", opacity: can ? 1 : 0.4 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 10.5, color: can ? C.gold : C.parchmentMuted }}>{applyParams(t("city.iltizamBuy"), [ic])}</Text>
                  </Pressable>
                ); })()}
              </>
            )}
          </View>
        )}

        {/* Diyarı gez */}
        <Pressable onPress={() => { hap("tap"); router.push("/oyun/harita"); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(201,168,76,0.07)", borderWidth: 1, borderColor: "rgba(201,168,76,0.35)", borderRadius: 12, padding: 14 }}>
          <View style={{ width: 38, height: 38, borderRadius: 9, backgroundColor: "rgba(201,168,76,0.1)", borderWidth: 1, borderColor: "rgba(201,168,76,0.3)", alignItems: "center", justifyContent: "center" }}>
            <GameIcon name="map" size={19} color={C.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{t("city.allRealm")}</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted }}>{t("city.hint")}</Text>
          </View>
          <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>›</Text>
        </Pressable>
      </ScrollView>
    </ScreenFresk>
  );
}
