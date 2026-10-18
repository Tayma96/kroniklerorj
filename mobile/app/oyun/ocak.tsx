import { DesignPressable as Pressable } from "../../lib/design-pressable";
// Küllerden yeni ocak: vârissiz ölümün ardından aynı soyadla yeni bir hayat. Hanedan Defteri ve tek soy yeteneği taşınır;
// atanın en çok anılan kararları yeni hayatta yankılanır (Yankı ata izi). Para, mülk, itibar geçmez (pusula: güç değil kimlik).
import { View, Text, ScrollView} from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { yetenekAdaylari, SOY_YETENEKLERI } from "../../lib/game";
import { sonSoy } from "../../lib/defter";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";
import { useI18n, applyParams } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { BackLabel, PageHeader, ScreenFresk } from "../../lib/ui";
import { YetenekSecici } from "../../lib/soy-ui";

export default function Ocak() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, defter, yeniOcak } = useGame();
  const { t } = useI18n();
  const [yet, setYet] = useState<string | null>(null);
  const [cins, setCins] = useState<"erkek" | "kadın">(state?.player.gender === "kadın" ? "erkek" : "kadın");
  const son = sonSoy(defter);
  const adaylar = state && state.player.dead ? yetenekAdaylari(state) : SOY_YETENEKLERI.slice(0, 3).map((x) => x.id);
  const ata = state && state.player.dead ? state.player.name : son?.ad;
  const nesil = state && state.player.dead ? state.player.generation : son?.nesil;
  return (
    <ScreenFresk style={{ paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        <PageHeader kicker={t("scr.kronik")} title={t("scr.ocak")} />
        <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchment, marginBottom: 10, lineHeight: 22 }}>{t("ocak.alt")}</Text>
        {ata ? <Text style={{ fontFamily: F.display, fontSize: 13, color: C.goldDim, marginBottom: 6 }}>{applyParams(t("ocak.ata"), [ata, nesil || 1])}</Text> : null}
        <YetenekSecici adaylar={adaylar} secili={yet} onSec={setYet} />
        <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: C.goldDim, marginTop: 12, marginBottom: 8 }}>{t("ocak.cins")}</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {(["kadın", "erkek"] as const).map((g) => (
            <Pressable key={g} onPress={() => setCins(g)} style={{ flex: 1, alignItems: "center", padding: 12, borderRadius: 5, borderWidth: 1, borderColor: cins === g ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: cins === g ? "rgba(201,168,76,0.12)" : C.card }}>
              <Text style={{ fontFamily: F.display, fontSize: 16, color: cins === g ? C.gold : C.parchmentDim }}>{g === "kadın" ? "♀" : "♂"}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={async () => { hap("heavy"); await yeniOcak(cins, yet || undefined); router.replace("/oyun"); }} style={{ marginTop: 16, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7, paddingVertical: 15, borderRadius: 5, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.55)", backgroundColor: C.gold }}>
          <GameIcon name="hanedan" size={14} color={C.inkOnGold} />
          <Text style={{ fontFamily: F.display, fontSize: 13, color: C.inkOnGold, letterSpacing: 1.5 }}>{t("ocak.basla")}</Text>
        </Pressable>
      </ScrollView>
    </ScreenFresk>
  );
}
