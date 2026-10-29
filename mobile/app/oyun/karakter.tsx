import { useEffect, useState } from "react";
import { View, ScrollView } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { GameSheet } from "../../lib/home-hud";
import { EmekPanel, UgrasPanel } from "../../lib/month-actions-ui";
import { SAHNE_GORSEL } from "../../lib/sahne-tema";
import { useGame } from "../../lib/store";
import { useI18n } from "../../lib/i18n";
import { playTap } from "../../lib/sound";
import { useSadeMod } from "../../lib/use-sade-mod";
import { ScreenFresk } from "../../lib/ui";
import { C } from "../../lib/theme";
import { Sekmeler, yon } from "../../lib/sayfa/karakter/parca";
import { KarakterKimlik, KarakterGostergeler } from "../../lib/sayfa/karakter/baslik";
import { OzelliklerSekmesi } from "../../lib/sayfa/karakter/ozellikler";
import { KusamSekmesi } from "../../lib/sayfa/karakter/kusam";
import { OcakSekmesi } from "../../lib/sayfa/karakter/ocak";
import { SeruvenSekmesi } from "../../lib/sayfa/karakter/seruven";

type Sekme = "ozellikler" | "kusam" | "ocak" | "seruven";

// Karakter defteri: başlık (kimlik, göstergeler, bu ayın eylemleri) sabit; altında yapışkan sekmeler.
export default function Karakter() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state } = useGame();
  const { t, lang } = useI18n();
  const sade = useSadeMod();
  const [tab, setTab] = useState<Sekme>("ozellikler");
  const { ac } = useLocalSearchParams<{ ac?: string }>();
  const [acts, setActs] = useState<"emek" | "ugras" | null>(null);
  useEffect(() => { if (ac === "emek" || ac === "ugras") setActs(ac); }, [ac]); // ana sayfadan "çalışmaya git"
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const { rtl } = yon(lang);
  const ugrasKey = p.age < 13 ? "child.title" : p.age < 18 ? "genc.title" : p.age < 55 ? "adult.title" : "elder.title";
  const ugrasIcon = p.age < 13 ? "party" : p.age < 18 ? "lyre" : p.age < 55 ? "medal" : "prayer-beads";
  const puan = p.stat_points > 0;
  const sekmeler: { id: Sekme; icon: string; label: string; dot?: boolean }[] = [
    { id: "ozellikler", icon: "guc", label: t("karakter.sekme.oz"), dot: puan },
    { id: "kusam", icon: "shield", label: t("karakter.sekme.kusam") },
    { id: "ocak", icon: "iliskiler", label: t("karakter.sekme.ocak") },
    { id: "seruven", icon: "scroll", label: t("karakter.sekme.seruven") },
  ];

  return (
    <ScreenFresk>
      {/* Durum çubuğu payı kaydırılmaz: yapışan sekmeler saatin altına girmez */}
      <View style={{ height: insets.top, backgroundColor: "rgba(8,5,2,0.5)" }} />
      <ScrollView stickyHeaderIndices={[1]} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: insets.bottom + 96 }}>
        <View>
          <KarakterKimlik onSettings={() => router.push("/oyun/ayarlar")} />
          <KarakterGostergeler onEmek={() => setActs("emek")} onUgras={() => setActs("ugras")} />
        </View>
        {/* Yapışkan sekme çubuğu: kaydırınca üstte kalır */}
        <View style={{ paddingTop: 6, paddingBottom: 10, marginHorizontal: -12, paddingHorizontal: 12, backgroundColor: "rgba(12,9,5,0.82)" }}>
          <Sekmeler items={sekmeler} value={tab} rtl={rtl} onChange={(id) => { playTap(); setTab(id); }} />
        </View>
        <Animated.View key={tab} entering={sade ? undefined : FadeIn.duration(200)}>
          {tab === "ozellikler" && <OzelliklerSekmesi />}
          {tab === "kusam" && <KusamSekmesi />}
          {tab === "ocak" && <OcakSekmesi />}
          {tab === "seruven" && <SeruvenSekmesi />}
        </Animated.View>
      </ScrollView>
      <GameSheet visible={acts === "emek"} onClose={() => setActs(null)} title={t("flow.workTitle")} icon="calis" scene={SAHNE_GORSEL.atolye_demirci}><EmekPanel /></GameSheet>
      <GameSheet visible={acts === "ugras"} onClose={() => setActs(null)} title={t(ugrasKey)} icon={ugrasIcon} scene={SAHNE_GORSEL.medrese}><UgrasPanel /></GameSheet>
    </ScreenFresk>
  );
}
