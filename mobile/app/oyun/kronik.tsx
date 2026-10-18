import { DesignPressable as Pressable } from "../../lib/design-pressable";
// Kronik: Hanedan Defteri'nin okuma ekranı. Ölümden sağ çıkan tek kayıt — soy, lakaplar, ölüm sıfatları, anılan kararlar,
// tamamlanan yaylar, görülen ikilemler ve soy yetenekleri. Yalnız kimlik; güç yok.
import { View, Text, ScrollView} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { ARCS } from "../../lib/arcs";
import { DefterSoy } from "../../lib/defter";
import { DostHaneler } from "../../lib/dost-ui";
import { useI18n, applyParams, lakapAdi } from "../../lib/i18n";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";
import { BackLabel, PageHeader, Panel, ScreenFresk } from "../../lib/ui";

export default function Kronik() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { defter } = useGame();
  const { t } = useI18n();
  const izAdi = (k: string) => { const p = k.split(":"); const key = p[0] === "dil" ? "dil." + p[1] + ".t" : p[0] === "arc" ? "arc." + p[1] + ".t" : ""; const v = key ? t(key) : ""; return v && v !== key ? v : ""; };
  const soyKart = (x: DefterSoy, i: number) => {
    const kadin = x.cins === "kadın";
    const sifat = x.sifat ? (() => { const k = "ep." + x.sifat; const f = kadin ? t(k + ".f") : k + ".f"; return f !== k + ".f" ? f : t(k); })() : "";
    const izler = x.izler.map((z) => izAdi(z.k)).filter(Boolean);
    return (
      <Panel key={x.anahtar} title={x.ad + (sifat && sifat !== "ep." + x.sifat ? " · " + sifat : "")} icon="hanedan" delay={i * 40}>
        <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentMuted }}>{applyParams(t("kronik.soy"), [x.nesil, x.olumYasi])}</Text>
        {x.lakaplar.length ? <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchment, marginTop: 4 }}>{x.lakaplar.map((l) => lakapAdi(l, kadin, t)).join(" · ")}</Text> : null}
        {x.egilim ? <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.goldDim, marginTop: 4 }}>{applyParams(t("kronik.egilim"), [t("yanki.et." + x.egilim)])}</Text> : null}
        {izler.length ? <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchment, marginTop: 4 }}>{t("kronik.izler")}: {izler.map((z) => "«" + z + "»").join(", ")}</Text> : null}
        {x.kin || x.minnet ? <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentMuted, marginTop: 4 }}>{applyParams(t("kronik.hatir"), [x.kin || 0, x.minnet || 0])}</Text> : null}
        {x.secilen ? <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.sage, marginTop: 4 }}>{applyParams(t("kronik.yetenek"), [t("soy." + x.secilen + ".ad")])}</Text> : null}
      </Panel>
    );
  };
  return (
    <ScreenFresk style={{ paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={t("scr.kronik")} title={t("scr.kronik")} sub={t("kronik.alt")} />
        <View style={{ flexDirection: "row", gap: 14, marginBottom: 10, paddingHorizontal: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><GameIcon name="roman" size={12} color={C.goldDim} /><Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentMuted }}>{applyParams(t("kronik.yaylar"), [defter.yaylar.length, ARCS.length])}</Text></View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><GameIcon name="scroll" size={12} color={C.goldDim} /><Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentMuted }}>{applyParams(t("kronik.ikilem"), [defter.ikilemler.length])}</Text></View>
        </View>
        {/* Dost Haneler: sunucusuz, yalnız bu cihaz; yalnız kimlik */}
        <DostHaneler defter={defter} />
        {defter.soylar.length === 0 ? (
          <Panel><Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, textAlign: "center", paddingVertical: 10 }}>{t("kronik.bos")}</Text></Panel>
        ) : [...defter.soylar].reverse().map(soyKart)}
      </ScrollView>
    </ScreenFresk>
  );
}
