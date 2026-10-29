import { useState } from "react";
import { View, ScrollView } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { PROPERTY_TYPES, propAylikTahmin, hireKahya, fireKahya, kahyaWage, siraGunu } from "../../lib/game";
import { MULK_BOS, MULK_HERO } from "../../lib/assets";
import { C } from "../../lib/theme";
import { useI18n, applyParams } from "../../lib/i18n";
import { currentCalendar } from "../../lib/calendar";
import { hap } from "../../lib/haptics";
import { playTap } from "../../lib/sound";
import { useSadeMod } from "../../lib/use-sade-mod";
import { ScreenFresk } from "../../lib/ui";
import { MulkSahnesi, Sekmeler, fmt } from "../../lib/sayfa/mulkler/parca";
import { HazineOzeti, GorevKarti, BosMulk } from "../../lib/sayfa/mulkler/hazine";
import { MulkKarti } from "../../lib/sayfa/mulkler/mulk-karti";
import { TapuPazari } from "../../lib/sayfa/mulkler/tapu-pazari";

// Mülkler: sahne başlığı → yıllık gelir özeti → sekmeler (Mülklerin / Tapu Pazarı).
export default function Mulkler() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { lang, t } = useI18n(); const rtl = lang === "ar";
  const sade = useSadeMod();
  const [tab, setTab] = useState<"mulk" | "pazar" | null>(null);
  const [manageIdx, setManageIdx] = useState<number | null>(null);
  const [hireOpen, setHireOpen] = useState<number | null>(null);
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const props = p.properties;
  const active = tab ?? (props.length ? "mulk" : "pazar"); // mülksüz oyuncu doğrudan pazarda açar

  const estIncome = props.reduce((a, pr) => a + propAylikTahmin(state, pr), 0); // gerçek formülden net tahmin (şehir, bakım, kiracı, işçi, bekçi, enflasyon)
  const netWorth = p.money + props.reduce((a, pr) => a + Math.round((PROPERTY_TYPES[pr.type]?.cost || 0) * (pr.level || 1) * (pr.cond / 100) * 0.7), 0);
  const totalWorkers = props.reduce((a, pr) => a + (pr.workers?.length || 0), 0);
  const bags = props.filter((pr) => pr.type === "bag");
  const siraVakti = bags.length > 0 && currentCalendar(state.turn).season === "Sonbahar";
  const siraDone = p.sira_gunu_year === Math.floor(state.turn / 12);
  const wage = kahyaWage(state);
  const pick = (k: "mulk" | "pazar") => { hap("selection"); playTap(); setTab(k); };

  return (
    <ScreenFresk>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>
        <MulkSahnesi source={MULK_HERO} title={t("scr.mulkler")} hint={t("mulk.hint")} purse={fmt(p.money, lang)} purseLabel={applyParams(t("mulkler.purse"), [fmt(p.money, lang)], lang)}
          onBack={() => router.back()} topInset={insets.top} rtl={rtl} />

        <View style={{ paddingHorizontal: 14, marginTop: -26 }}>
          <Animated.View entering={sade ? undefined : FadeIn.duration(420)}>
            <HazineOzeti monthly={estIncome} netWorth={netWorth} count={props.length} workers={totalWorkers} note={props.length ? t("mulk.tahminNot") : undefined} />
          </Animated.View>

          <Sekmeler rtl={rtl} value={active} onChange={pick} items={[
            { key: "mulk", label: t("mulk.owned"), icon: "mulkler", badge: props.length },
            { key: "pazar", label: t("mulkler.market"), icon: "map" },
          ]} />

          <Animated.View key={active} entering={sade ? undefined : FadeIn.duration(260)}>
            {active === "mulk" ? <>
              {siraVakti && <GorevKarti icon="amphora" tone={C.sage} title={t("mulk.sira")} body={siraDone ? t("mulk.siraDone") : t("mulk.siraDesc")}
                action={siraDone ? undefined : t("mulk.siraBtn")} primary onPress={siraDone ? undefined : () => { hap("success"); playTap(); apply((s) => siraGunu(s)); }} />}
              {props.length === 0
                ? <BosMulk source={MULK_BOS} onMarket={() => pick("pazar")} />
                : props.map((pr, i) => PROPERTY_TYPES[pr.type] ? <MulkKarti key={i} state={state} pr={pr} i={i} apply={apply} delay={Math.min(i, 5) * 70}
                    open={manageIdx === i} hireOpen={hireOpen === i}
                    onManage={() => { setManageIdx(manageIdx === i ? null : i); setHireOpen(null); }}
                    onHire={(o) => setHireOpen(o ? i : null)} /> : null)}
              {props.length >= 2 && <GorevKarti icon="book" title={t("mulk.kahya")} status={p.kahya ? t("mulkler.onDuty") : undefined} body={applyParams(t("mulk.kahyaDesc"), [wage], lang)}
                action={p.kahya ? t("mulk.kahyaFire") : t("mulk.kahyaHire")} disabled={!p.kahya && p.money < wage}
                onPress={() => { hap("tap"); playTap(); apply((s) => (s.player.kahya ? fireKahya(s) : hireKahya(s))); }} />}
            </> : <TapuPazari state={state} apply={apply} />}
          </Animated.View>
        </View>
      </ScrollView>
    </ScreenFresk>
  );
}
