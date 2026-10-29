import { View, ScrollView } from "react-native";
import { useRef, useState } from "react";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { WarWorldCard } from "../../lib/war-world-ui";
import { beginBargain, advanceBargain, settleBargain, econKey, MARKET_EVENTS, sellerPersonaOf, factionLocalFavor, citySpecialtyIdx, zekatAvailable, type GameState } from "../../lib/game";
import { useI18n } from "../../lib/i18n";
import { placeName } from "../../lib/locale-data";
import { hap } from "../../lib/haptics";
import { playCoin, playTap } from "../../lib/sound";
import { useSadeMod } from "../../lib/use-sade-mod";
import { C } from "../../lib/theme";
import { ScreenFresk } from "../../lib/ui";
import { PazarSahnesi, TellalSeridi, KeseCubugu, KENAR, type SekmeId } from "../../lib/sayfa/pazar/sahne";
import { Tezgahlar, malIkonu, type Mal } from "../../lib/sayfa/pazar/tezgahlar";
import { TezgahKirasi, KislikKiler, kilerMevsimi } from "../../lib/sayfa/pazar/hizmetler";
import { KervanSekmesi } from "../../lib/sayfa/pazar/kervan";
import { SarrafSekmesi } from "../../lib/sayfa/pazar/sarraf";
import { PazarlikPerdesi, type Pazarlik } from "../../lib/sayfa/pazar/pazarlik";

type Oturum = NonNullable<GameState["player"]["bargain_sessions"]>[string];
let sonSekme: SekmeId = "food"; // sayfaya dönünce son bakılan tezgâh açık kalsın

export default function Pazar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, apply } = useGame();
  const { lang, t, tg } = useI18n();
  const sade = useSadeMod();
  const [tab, setTab] = useState<SekmeId>(sonSekme);
  const [barg, setBarg] = useState<Pazarlik | null>(null);
  const scroll = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const barY = useRef(0);
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const rtl = lang === "ar";
  const econ = state.econ || 1;
  const mev = state.marketEvent && state.marketEvent.until > state.turn ? MARKET_EVENTS.find((e) => e.key === state.marketEvent!.key) : null;
  const econColor = econ >= 1.06 ? C.blood : econ <= 0.94 ? C.sage : C.parchment;

  const sekmeSec = (id: SekmeId) => {
    if (id === tab) return;
    hap("tap"); playTap();
    sonSekme = id; setTab(id);
    // Aşağıdaysan yeni tezgâhın başına dön; çubuk yerinde kalır.
    if (scrollY.current > barY.current) scroll.current?.scrollTo({ y: barY.current, animated: false });
  };

  // ── Pazarlık müzakeresi (anlık alım/satım yok; sabır ibresiyle tur tur) ──
  // sell=false: fiyatı tabana indir (alım). sell=true: fiyatı tavana çıkar (satım).
  const bargainUi = (session: Oturum, key: string, g: { id: string; kind?: string; heal?: number; feed?: number; icon?: string }, round: number): Pazarlik => ({
    key, id: g.id, icon: malIkonu(g), name: t("it." + g.id), base: session.base, price: session.price,
    patience: session.patience, messageKey: session.messageKey, msg: session.messageKey === "bluffWin" ? tg("paz.bluffWin", p.gender === "kadın") : t("paz." + session.messageKey),
    done: session.done, sell: session.sell, round,
  });
  const openBarg = (g: Mal, sell: boolean) => {
    hap("tap");
    const opened: { value?: ReturnType<typeof beginBargain> } = {};
    apply((s) => { opened.value = beginBargain(s, g.id, sell); return opened.value.state; });
    const value = opened.value;
    if (!value?.key) return;
    const session = value.state.player.bargain_sessions?.[value.key];
    if (session) setBarg(bargainUi(session, value.key, g, 0));
  };
  const hamle = (bluff: boolean) => {
    if (!barg || barg.done) return;
    playTap();
    const updated: { session?: Oturum } = {};
    apply((s) => {
      const result = advanceBargain(s, barg.key, bluff);
      updated.session = result.state.player.bargain_sessions?.[barg.key];
      return result.state;
    });
    if (!updated.session) return;
    const next = bargainUi(updated.session, barg.key, { id: barg.id, icon: barg.icon }, barg.round + 1);
    const good = bluff ? ["bluffWin", "floor", "limit"] : ["softened", "floor", "limit"];
    hap(good.includes(next.messageKey) ? "success" : "warning");
    setBarg(next);
  };
  const confirmBuy = () => {
    if (!barg) return;
    hap("advance"); playCoin();
    apply((s) => settleBargain(s, barg.key));
    setBarg(null);
  };

  const dots: Partial<Record<SekmeId, string>> = {};
  if (kilerMevsimi(state) && (p.winter_stock_until ?? 0) < state.turn && p.age >= 16) dots.food = C.frost;
  if (state.caravan) dots.caravan = C.ember;
  if (p.age >= 16 && zekatAvailable(state)) dots.sarraf = C.gold;

  return (
    <ScreenFresk style={{ paddingTop: insets.top }}>
      <ScrollView ref={scroll} stickyHeaderIndices={[1]} scrollEventThrottle={32} onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }}
        contentContainerStyle={{ paddingHorizontal: KENAR, paddingBottom: insets.bottom + 110 }}>
        <View>
          <PazarSahnesi rtl={rtl} title={placeName(p.location_name, lang)} econ={t("econ." + econKey(econ))} econTone={econColor}
            spec={`${t("paz.spec")}: ${t("spec." + citySpecialtyIdx(state, p.location_name))}`} onBack={() => router.back()} />
          <WarWorldCard />
          {mev && <TellalSeridi rtl={rtl} text={mev.text} up={mev.mult > 1} />}
          <TezgahKirasi state={state} apply={apply} rtl={rtl} />
        </View>

        <View onLayout={(e) => { barY.current = e.nativeEvent.layout.y; }}>
          <KeseCubugu rtl={rtl} money={p.money} buyReady={p.bargain_buy_turn !== state.turn && p.age >= 13} sellReady={p.bargain_sell_turn !== state.turn && p.age >= 13} tab={tab} onTab={sekmeSec} dots={dots} />
        </View>

        <Animated.View key={tab} entering={sade ? undefined : FadeIn.duration(220)} style={{ paddingTop: 14 }}>
          {tab === "food" && <KislikKiler state={state} apply={apply} rtl={rtl} />}
          {(tab === "food" || tab === "goods" || tab === "arms") && <Tezgahlar tab={tab} state={state} apply={apply} onHaggle={openBarg} rtl={rtl} />}
          {tab === "caravan" && <KervanSekmesi state={state} apply={apply} rtl={rtl} />}
          {tab === "sarraf" && <SarrafSekmesi state={state} apply={apply} rtl={rtl} />}
        </Animated.View>
      </ScrollView>

      {/* ── PAZARLIK PERDESİ ── */}
      <PazarlikPerdesi barg={barg} money={p.money} persona={t("paz.seller." + sellerPersonaOf(state).id)} favor={factionLocalFavor(state)}
        sellerSeed={"pazar:" + p.location_name + ":" + sellerPersonaOf(state).id}
        onHaggle={() => hamle(false)} onBluff={() => hamle(true)} onClose={() => { hap("tap"); setBarg(null); }} onSettle={confirmBuy} />
    </ScreenFresk>
  );
}
