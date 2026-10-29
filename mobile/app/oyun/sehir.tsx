// Şehir — claude-paket mockup ekran 3: mevsimlik sahne, Şehrin Durumu, resimli mekânlar, bölge ambarı.
import type { ReactNode } from "react";
import { View, Text, ScrollView, useWindowDimensions } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { placeKind, atHome, regionOf, defaultRealm, factionById, beylikName, citySpecialtyIdx } from "../../lib/game";
import { cityInfo } from "../../lib/world";
import { useI18n } from "../../lib/i18n";
import { placeName } from "../../lib/locale-data";
import { C, F } from "../../lib/theme";
import { townSeasonImage, venueImage } from "../../lib/assets";
import { currentCalendar } from "../../lib/calendar";
import { playTap } from "../../lib/sound";
import { ScreenFresk } from "../../lib/ui";
import { useSadeMod } from "../../lib/use-sade-mod";
import { SehirSahne } from "../../lib/sayfa/sehir/sahne";
import { SPanel, SPanelHeader, Chip, VenueCard, VenueTile, InfoRow, LinkRow, SK } from "../../lib/sayfa/sehir/parcalar";
import { SehirDurumu, HalkPaneli, SehirEserleri, IltizamPaneli } from "../../lib/sayfa/sehir/durum";
import { BolgeAmbari, SavasIzi } from "../../lib/sayfa/sehir/ambar";

const KIND_KEY: Record<string, string> = { "şehir": "sehir", "kale": "kale", "köy": "koy" };
const KIND_ICON: Record<string, string> = { "şehir": "castle", "kale": "shield", "köy": "house" };
const SEASON_KEY: Record<string, string> = { "Kış": "kis", "İlkbahar": "ilkbahar", "Yaz": "yaz", "Sonbahar": "sonbahar" };
const SEASON_ICON: Record<string, string> = { "Kış": "flame", "İlkbahar": "leaf", "Yaz": "sun", "Sonbahar": "wheat" };

// Bu diyarda erişebileceğin yerler: ilk dördü büyük resimli kart, diğerleri madalyonlu döşeme.
const BIG = [
  { to: "/oyun/pazar", key: "scr.pazar" },
  { to: "/oyun/mahalle", key: "scr.mahalle" },
  { to: "/oyun/mulkler", key: "scr.mulkler" },
  { to: "/oyun/hanedan", key: "scr.hanedan" },
];
const SMALL = [
  { to: "/oyun/atolye", icon: "anvil", key: "scr.atolye" },
  { to: "/oyun/mektep", icon: "mektep", key: "scr.mektep" },
  { to: "/oyun/orgutler", icon: "orgutler", key: "scr.orgutler" },
  { to: "/oyun/iliskiler", icon: "iliskiler", key: "rel.headTitle" },
  { to: "/oyun/haberler", icon: "haberler", key: "scr.haberler" },
];
const idOf = (to: string) => to.split("/").pop() || "";

// Bölümler sırayla belirir; sade modda hareket yok.
function Enter({ i, sade, children }: { i: number; sade: boolean; children: ReactNode }) {
  return <Animated.View entering={sade ? undefined : FadeInDown.delay(Math.min(6, i) * 70).duration(320)}>{children}</Animated.View>;
}

export default function Sehir() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const sade = useSadeMod();
  const { state } = useGame();
  const { lang, t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const rtl = lang === "ar";
  const p = state.player;
  const here = p.location_name;
  const kind = placeKind(here);
  const info = cityInfo(here, kind, lang);
  const home = atHome(p);
  const cal = currentCalendar(state.turn);
  const go = (to: string) => { playTap(); router.push(to as any); };
  const cardH = Math.round(Math.min(170, Math.max(128, width * 0.36)));
  const realm = (state.realm ?? defaultRealm()).find((r) => r.id === regionOf(here));
  const holder = realm ? factionById(realm.holder) : null;

  return (
    <ScreenFresk>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
        <SehirSahne source={townSeasonImage(cal.season)} topInset={insets.top} rtl={rtl}
          title={placeName(here, lang)} sub={`${cal.year}  •  ${t("cal.season." + SEASON_KEY[cal.season])}`} seasonIcon={SEASON_ICON[cal.season] || "sun"}
          onBack={() => router.back()} backLabel={t("common.back")} onMap={() => router.push("/oyun/harita")} mapLabel={t("city.allRealm")}
          chips={<>
            <Chip rtl={rtl} icon={KIND_ICON[kind] || "house"} text={t("kind." + KIND_KEY[kind])} />
            <Chip rtl={rtl} icon="family" text={`${info.population.toLocaleString(lang)} ${t("diyar.pop")}`} />
            <Chip rtl={rtl} icon={home ? "sehir" : "firsatlar"} text={home ? t("soc.home") : t("soc.away")} color={home ? "#8FD07A" : C.frost} />
          </>} />
        <View style={{ height: 10 }} />

        <Enter i={0} sade={sade}><SehirDurumu prosperityBase={info.prosperity} /></Enter>

        <Enter i={1} sade={sade}>
          <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 8, marginHorizontal: SK.side, marginBottom: 10 }}>
            {BIG.map((v) => <VenueCard key={v.to} rtl={rtl} height={cardH} source={venueImage(idOf(v.to))} title={t(v.key)} desc={t("city.v." + idOf(v.to))} onPress={() => go(v.to)} />)}
          </View>
        </Enter>

        <Enter i={2} sade={sade}>
          <SPanel>
            <SPanelHeader title={t("city.venues")} rtl={rtl} />
            <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 12, paddingTop: 2, paddingBottom: 12 }}>
              {SMALL.map((v) => <VenueTile key={v.to} rtl={rtl} source={venueImage(idOf(v.to))} icon={v.icon} title={t(v.key)} onPress={() => go(v.to)} />)}
            </View>
          </SPanel>
        </Enter>

        <Enter i={3} sade={sade}><SavasIzi /></Enter>
        <Enter i={4} sade={sade}><BolgeAmbari /></Enter>
        <Enter i={5} sade={sade}><SehirEserleri /></Enter>
        <Enter i={6} sade={sade}><IltizamPaneli /></Enter>
        <Enter i={7} sade={sade}><HalkPaneli /></Enter>

        {/* Diyar künyesi: yerin anlatısı, valisi, geçimi ve sancak hâkimi */}
        <Enter i={8} sade={sade}>
          <SPanel>
            <SPanelHeader title={t("city.localInfo")} icon="scroll-open" rtl={rtl} />
            <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 21, color: SK.ink, paddingHorizontal: 14, paddingBottom: 4, textAlign: rtl ? "right" : "left" }}>{info.blurb}</Text>
            <View style={{ paddingHorizontal: 14, paddingBottom: 6 }}>
              <InfoRow rtl={rtl} icon="crown" label={t("diyar.governor")} value={info.governor} />
              <InfoRow rtl={rtl} icon="scales" label={t("diyar.livelihood")} value={t("spec." + citySpecialtyIdx(state, here))} />
              <InfoRow rtl={rtl} icon="banner" label={t("realm.holder")} value={`${beylikName(regionOf(here))} · ${holder ? t("fac." + holder.id + ".n") : "—"}`} last />
            </View>
          </SPanel>
        </Enter>

        {/* Diyarı gez */}
        <Enter i={9} sade={sade}><LinkRow rtl={rtl} icon="map" title={t("city.allRealm")} sub={t("city.hint")} onPress={() => go("/oyun/harita")} /></Enter>
      </ScrollView>
    </ScreenFresk>
  );
}
