import { DesignPressable as Pressable } from "../../../lib/design-pressable";
import { useState, useMemo, useRef, useEffect, type ReactNode } from "react";
import { View, Text, ScrollView, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGame } from "../../../lib/store";
import { kisiProfil, kisiCevresi, heardRumor, gorus, teklifSansi, helalUygun, helalBedeli, helalSansi, helallikIste, talkWith, giftTo, proposeMarriage, canCourt, helpNpcGoal, exploitNpcGoal, oyuncuAkrabasi, GOAL_HELP_COST, relWith, insultNpc, flirtWith, gossipAbout, giveMoneyTo, canFlirt, flirtIsForbidden, npcSeededMarried, GIVE_MONEY_AMT, martialLoad, canTakeApprentice, takeApprentice, mentorApprentice, bestSkillOf, APPRENTICE_MONTHS } from "../../../lib/game";
import { useI18n, yuzdeL, kucukHarf, applyParams, renderEvt } from "../../../lib/i18n";
import { hap } from "../../../lib/haptics";
import { INTENTS } from "../../../lib/dialogue";
import { topMemories, salientMemory, representativeMemory } from "../../../lib/npc-mind";
import { NpcTavri } from "../../../lib/npc-bakis-ui";
import { NpcIzlenimi } from "../../../lib/npc-izlenim-ui";
import { SohbetDevami } from "../../../lib/npc-sohbet-ui";
import { sohbetCevapla, aileProfilEylemi, aileProfilEyleminiYap, npcBakisi, type GameState } from "../../../lib/game";
import { bakisTavri } from "../../../lib/npc-bakis";
import { GameSheet } from "../../../lib/home-hud";
import type { SohbetYanit } from "../../../lib/npc-sohbet";
import { EvlatMektubu } from "../../../lib/evlat-ui";
import { evladaMektup } from "../../../lib/game";
import { memoryQuote } from "../../../lib/hafiza-sohbet";
import { professionNameL, quirkL, goalL, placeName } from "../../../lib/locale-data";
import { ITEMS, TieKind } from "../../../lib/world";
import { Portre, BackLabel, ScreenFresk } from "../../../lib/ui";
import { GameIcon } from "../../../lib/icons";
import { NpcSceneArt } from "../../../lib/npc-scene-ui";
import { OrnatePanel } from "../../../lib/ornament-ui";
import { C, F, T, L } from "../../../lib/theme";

const BANDS = [
  { id: "dost", min: 50, tone: C.sage },
  { id: "arkadas", min: 20, tone: C.sage },
  { id: "tanis", min: -19, tone: C.parchmentDim },
  { id: "rakip", min: -49, tone: C.ember },
  { id: "dusman", min: -100, tone: C.blood },
];
function bandOf(score: number) { return BANDS.find((b) => score >= b.min) || BANDS[BANDS.length - 1]; }

function gameActionStyle(pressed: boolean, tone: string, disabled: boolean, rtl: boolean): ViewStyle {
  return {
    flexDirection: rtl ? "row-reverse" : "row",
    minHeight: 62,
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: pressed ? C.goldBright : tone === C.gold ? C.borderHi : tone + "99",
    borderBottomWidth: pressed ? 1 : 2,
    borderBottomColor: pressed ? tone + "88" : "#080503",
    backgroundColor: pressed ? C.surface : "#241B11",
    shadowColor: "#000",
    shadowOpacity: pressed ? 0.08 : 0.28,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: pressed ? 1 : 3 },
    elevation: pressed ? 0 : 3,
    transform: [{ translateY: pressed ? 2 : 0 }],
    opacity: disabled ? 0.42 : 1,
  };
}

function NpcActionIcon({ name, color = C.gold }: { name: string; color?: string }) {
  return <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
    <GameIcon name={name} size={26} color={color} />
  </View>;
}

function NpcActionChevron({ rtl = false, expanded = false }: { rtl?: boolean; expanded?: boolean }) {
  return <View style={{ width: 24, height: 28, alignItems: "center", justifyContent: "center" }}>
    <Text style={{ fontFamily: F.display, fontSize: 24, lineHeight: 26, color: C.gold }}>{expanded ? "⌄" : rtl ? "‹" : "›"}</Text>
  </View>;
}

// Bağ türü → ikon + ton (aile altın, dost adaçayı, rakip kan).
const TIE_META: Record<TieKind, { icon: string; tone: string }> = {
  es: { icon: "ring", tone: C.gold },
  ebeveyn: { icon: "family", tone: C.gold },
  evlat: { icon: "baby", tone: C.gold },
  kardes: { icon: "family", tone: C.gold },
  dost: { icon: "prayer-beads", tone: C.sage },
  rakip: { icon: "crossed-swords", tone: C.blood },
};
const TIE_ORDER: TieKind[] = ["es", "ebeveyn", "evlat", "kardes", "dost", "rakip"];
const APPRENTICE_SKILLS = ["combat", "trade", "crafting", "social"] as const;

function SansDokum({ kalemler, yuzde, t, baslik = "sans.title" }: { kalemler: { k: string; v: number }[]; yuzde: number; t: (k: string) => string; baslik?: string }) {
  const { lang } = useI18n();
  return (
    <View style={{ paddingHorizontal: 4, paddingBottom: 10, paddingTop: 2 }}>
      <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.goldDim, marginBottom: 4 }}>{t(baslik)}</Text>
      {kalemler.map((x, i) => (
        <View key={i} style={{ flexDirection: "row", paddingVertical: 2 }}>
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: T.body, color: C.parchmentDim }}>{t(x.k)}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 13, color: x.v > 0 ? C.sage : C.blood }}>{x.v > 0 ? "+" + x.v : x.v}</Text>
        </View>
      ))}
      <View style={{ flexDirection: "row", paddingTop: 4, marginTop: 3, borderTopWidth: 1, borderTopColor: C.border }}>
        <Text style={{ flex: 1, fontFamily: F.display, fontSize: 13, color: C.parchment }}>{t("sans.toplam")}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{yuzdeL(yuzde, lang)}</Text>
      </View>
    </View>
  );
}

// Hediye eşya ikonu — türüne göre (emoji yerine GameIcon).
function giftIcon(it: any): string {
  if (!it) return "menu";
  switch (it.kind) {
    case "silah": return "silah";
    case "kalkan": return "kite";
    case "zirh": return "shield";
    case "baslik": return "hood";
    case "eldiven": return "fist";
    case "ayakkabi": return "boot";
    case "kiyafet": return "wool";
  }
  if (it.heal) return "saglik";
  if (it.feed || it.kind === "yiyecek") return "ye";
  return "menu";
}

export default function NpcDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, apply } = useGame();
  const { lang, t, tg } = useI18n();
  const [line, setLine] = useState<string>("");
  const [lineDelta, setLineDelta] = useState<number>(0);
  const [act, setAct] = useState<string | null>(null); // açık eylem paneli
  const [moreTopics, setMoreTopics] = useState(false);
  const [tiesOpen, setTiesOpen] = useState(false);
  const scroll = useRef<ScrollView>(null), chatY = useRef(0);
  const [gorusAcik, setGorusAcik] = useState(false); // görüş dökümü (neden böyle bakıyor)
  useEffect(() => { setLine(""); setLineDelta(0); setAct(null); setMoreTopics(false); setTiesOpen(false); }, [id, state?.turn]);
  // Kişi nüfus kaydından okunur (her yerden; yaşayan ya da rahmetli) — nüfus her eylemde yenilendiği için pop'a bağlı.
  const prof = useMemo(() => (state ? kisiProfil(state, id, lang) : null), [state?.pop, state?.seed, state?.turn, state?.player.location_name, lang, id]);
  const cevre = useMemo(() => (state ? kisiCevresi(state, id, lang) : []), [state?.pop, state?.seed, state?.turn, state?.player.location_name, lang, id]);
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const npc = prof?.npc;
  if (!prof || !npc) return <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 40 }}><Text style={{ color: C.parchmentMuted, textAlign: "center" }}>{t("npc.notFound")}</Text></View>;
  const v = relWith(state, npc.id);
  const band = bandOf(v);
  const ns = state.npc_state?.[npc.id] || { mood: 0, memories: [] };
  const relationLabel = prof.aileRolu
    ? t({ anne: "char.mother", baba: "char.father", es: "char.spouse", evlat: "tie.evlat", kardes: "tie.kardes", torun: "torun.role", akraba: "torun.kin" }[prof.aileRolu])
    : t("relb." + band.id);
  const giftables = Object.keys(state.player.inventory).filter((k) => state.player.inventory[k] > 0);
  const courtable = canCourt(state.player, npc, v);
  const ties = cevre
    .map((tt) => ({ kind: tt.tur as TieKind, otherId: tt.npc.id, who: tt.npc, olu: tt.olu, uzak: tt.uzak }))
    .sort((a, z) => TIE_ORDER.indexOf(a.kind) - TIE_ORDER.indexOf(z.kind) || Number(a.olu) - Number(z.olu));
  const couldMarry = prof.burada && !state.player.dead && !state.player.married && state.player.age >= 18 && npc.age >= 18 && npc.gender !== state.player.gender && !prof.aileRolu && !oyuncuAkrabasi(state.player, npc.id);
  const canGoal = prof.burada && !state.player.dead && state.player.age >= 13 && !!npc.goal; // muradına ermiş NPC'nin hedefi kalmaz — yardım/istismar kapanır
  // Kanal-bazlı kilit: her etkileşim (her sohbet niyeti + hediye/flört/dedikodu/hakaret/sadaka) ayrı ayrı ayda bir.
  // "dert dinle" deyince "iltifat" kapanmaz — hepsi bağımsız, hepsi bir kez okunur; farm motor tarafında kapalı.
  const acts = state.npc_state?.[npc.id]?.act_turns;
  const usedAct = (key: string) => acts?.[key] === state.turn;
  const familyAction = aileProfilEylemi(state, npc.id);
  const isFamily = !!prof.aileRolu;
  const topics = INTENTS.filter(it => npc.age >= 7 ? (npc.age >= 14 || it.id !== "is") && (it.id !== "hedef" || !!npc.goal) : npc.age >= 3 && ["hosbes", "saka"].includes(it.id));
  const primary = npc.age < 7 ? ["hosbes", "saka"] : isFamily ? ["hosbes", "dert", "aile", "hedef"] : ["hosbes", "dert", "is", "hedef"];
  const visibleTopics = moreTopics ? topics : topics.filter(it => primary.includes(it.id));
  const topicLabel = (id: string) => t(id === "aile" && isFamily ? "sohbet.topic.aile" : "dlg.intent." + id);
  const focusChat = () => requestAnimationFrame(() => scroll.current?.scrollTo({ y: Math.max(0, chatY.current - 12), animated: false }));
  const reply = (answer: SohbetYanit) => {
    const out = sohbetCevapla(state, npc.id, answer, lang);
    if (!out.line) return;
    apply(() => out.state); setLine(""); setLineDelta(out.delta); focusChat();
  };
  const recalled = salientMemory(ns.anilar, state.turn, true);
  const heard = heardRumor(state, npc.id);
  const witnesses = [...new Set(recalled?.taniklar || [])].filter(id => id !== npc.id).slice(0, 3);

  const speak = (intent: string) => {
    if (usedAct("t:" + intent)) return;
    const r = talkWith(state, npc, intent, lang); // saf motor: söz burada okunur, durum tek seferde uygulanır
    apply(() => r.state); setLine(r.line); setLineDelta(r.delta); focusChat();
  };

  // Eylem sonucu: motorun bu eylemde yazdığı en yeni olay, kişinin sözü gibi perdede görünür; ilişki farkı yanında.
  const doAct = (fn: (s: GameState) => GameState) => {
    const before = state.hseq || 0, r0 = v, next = fn(state);
    apply(() => next); setAct(null);
    const e = [...next.history].reverse().find((x) => (x.q || 0) > before);
    setLine(e ? renderEvt(e.k || "", e.text, e.p || [], lang, t, state.player.gender === "kadın") : ""); setLineDelta(relWith(next, npc.id) - r0); focusChat();
  };
  const stance = bakisTavri(npcBakisi(state, npc.id));
  const rtl = lang === "ar", done = t("soc.lock.done"), young = state.player.age < 13, money = state.player.money;
  const pct = (y: number) => yuzdeL(y, lang);
  const eylemler: Eylem[] = [];
  if (prof.burada && !state.player.dead) {
    eylemler.push({ id: "gift", icon: "gems", tile: t("npcx.t.gift"), title: t("npcx.t.gift"), desc: t("npcx.gift.d"),
      blocked: usedAct("gift") ? done : giftables.length === 0 ? t("npc.noGift") : undefined,
      custom: <View style={{ gap: 8 }}>{giftables.map((k) => <SheetChoice key={k} icon={giftIcon(ITEMS[k])} label={t("it." + k)} tag={"×" + state.player.inventory[k]} onPress={() => doAct((s) => giftTo(s, npc, k))} />)}</View> });
    eylemler.push({ id: "money", icon: "akce", tile: t("npcx.t.money"), title: t("npca.moneyBtn"), tag: GIVE_MONEY_AMT + " ⚜", desc: applyParams(t("npcx.money.d"), [GIVE_MONEY_AMT], lang),
      blocked: usedAct("money") ? done : money < GIVE_MONEY_AMT ? t("sohbet.lowMoney") : undefined, run: () => doAct((s) => giveMoneyTo(s, npc)) });
    if (canGoal) eylemler.push({ id: "help", icon: "leaf", tone: C.sage, tile: t("npcx.t.help"), title: t("npc.helpGoal"), tag: GOAL_HELP_COST + " ⚜", desc: applyParams(t("npcx.help.d"), [GOAL_HELP_COST], lang), note: goalL(npc.goal, lang),
      blocked: usedAct("help") ? done : money < GOAL_HELP_COST ? t("sohbet.lowMoney") : undefined, run: () => doAct((s) => helpNpcGoal(s, npc)) });
    if (canGoal && v > -25 && !(state.player.married && state.player.spouse_id === npc.id) && !oyuncuAkrabasi(state.player, npc.id)) eylemler.push({ id: "exploit", icon: "hood", tone: C.ember, tile: t("npcx.t.exploit"), title: t("npc.exploitGoal"), desc: t("npcx.exploit.d"), note: goalL(npc.goal, lang),
      blocked: state.player.exploit_turn === state.turn ? done : undefined, run: () => doAct((s) => exploitNpcGoal(s, npc)) });
    if (canTakeApprentice(state, npc)) eylemler.push({ id: "apprentice", icon: "anvil", tile: t("npcx.t.apprentice"), title: t("npc.aprTake"), desc: t("npcx.apprentice.d"),
      warn: state.player.apprentice && state.player.apprentice.id !== npc.id ? [t("npc.aprReplaceWarn")] : undefined,
      custom: <View>
        <Text style={{ fontFamily: F.serifItalic, fontSize: T.body, color: C.parchmentMuted, lineHeight: T.line, marginBottom: 8 }}>{t("npc.aprChooseSkill")}</Text>
        <View style={{ gap: 8 }}>{APPRENTICE_SKILLS.map((skill) => <SheetChoice key={skill} icon="graduate-cap" label={t("skill." + skill)} sub={t("skill." + skill + ".b")} onPress={() => doAct((s) => takeApprentice(s, npc, skill))} />)}</View>
      </View> });
    if (state.player.apprentice?.id === npc.id) { const ap = state.player.apprentice; eylemler.push({ id: "lesson", icon: "graduate-cap", tile: t("npcx.t.lesson"), title: t("npc.aprMentor"), desc: t("npcx.lesson.d"),
      note: t("skill." + (ap.skill || bestSkillOf(state.player))) + " · " + (ap.months || 0) + "/" + APPRENTICE_MONTHS + " " + t("npc.aprMonths"),
      blocked: state.player.apprentice_turn === state.turn ? done : undefined, run: () => doAct((s) => mentorApprentice(s)) }); }
    if (state.player.betrothed?.id !== npc.id && couldMarry) { const x = teklifSansi(state, npc, "kur"); eylemler.push({ id: "propose", icon: "evlilik", tile: t("npcx.t.propose"), title: t("npc.propose"), desc: t("npcx.propose.d"),
      tag: courtable ? pct(x.yuzde) : undefined, sans: courtable ? x : undefined,
      warn: [...(martialLoad(state.player) > 0 ? [t("npca.martialWarn")] : []), ...(npcSeededMarried(npc) ? [t("affair.warnTheirs")] : [])],
      blocked: courtable ? undefined : t("npc.proposeReq"), run: () => doAct((s) => proposeMarriage(s, npc)) }); }
    if (canFlirt(state.player, npc, v)) { const forbidden = flirtIsForbidden(state.player, npc), x = teklifSansi(state, npc, "flort"); eylemler.push({ id: "flirt", icon: "lyre", tone: forbidden ? C.ember : C.gold, tile: t("npcx.t.flirt"), title: forbidden ? t("affair.flirtBtn") : t("npca.flirtBtn"), desc: t("npcx.flirt.d"),
      tag: pct(x.yuzde), sans: x, warn: [...(forbidden ? [state.player.married ? tg("affair.warnMarried", state.player.gender === "kadın") : t("affair.warnTheirs")] : []), ...(martialLoad(state.player) > 0 ? [t("npca.martialWarn")] : [])],
      blocked: usedAct("flirt") ? done : undefined, run: () => doAct((s) => flirtWith(s, npc)) }); }
    { const x = teklifSansi(state, npc, "dedikodu"); eylemler.push({ id: "gossip", icon: "speaker", tone: C.parchmentDim, tile: t("npcx.t.gossip"), title: t("npca.gossipBtn"), desc: t("npcx.gossip.d"), tag: pct(x.yuzde), sans: x,
      blocked: young ? t("npcx.young") : usedAct("gossip") ? done : undefined, run: () => doAct((s) => gossipAbout(s, npc)) }); }
    if (helalUygun(state, npc.id)) { const cost = helalBedeli(state, npc.id), a = helalSansi(state, npc, false), b = helalSansi(state, npc, true); eylemler.push({ id: "helal", icon: "prayer-beads", tone: C.sage, tile: t("npcx.t.helal"), title: t("npcx.t.helal"), desc: t("npcx.helal.d"), tag: pct(a.yuzde),
      blocked: young ? t("npcx.young") : usedAct("helal") ? done : undefined,
      custom: <View style={{ gap: 10 }}>
        <SheetChoice icon="prayer-beads" label={t("npca.helalBtn")} tag={pct(a.yuzde)} onPress={() => doAct((s) => helallikIste(s, npc, false))} />
        <SansDokum kalemler={a.kalemler} yuzde={a.yuzde} t={t} baslik="npcx.chance" />
        <SheetChoice icon="akce" label={t("npca.helalBedelBtn")} sub={applyParams(t("sohbet.cost"), [cost], lang)} tag={pct(b.yuzde)} disabled={money < cost} onPress={() => doAct((s) => helallikIste(s, npc, true))} />
        <SansDokum kalemler={b.kalemler} yuzde={b.yuzde} t={t} baslik="npcx.chance" />
      </View> }); }
    eylemler.push({ id: "insult", icon: "skull", tone: C.blood, tile: t("npcx.t.insult"), title: t("npca.insultBtn"), desc: t("npcx.insult.d"),
      blocked: young ? t("npcx.young") : usedAct("insult") ? done : undefined, run: () => doAct((s) => insultNpc(s, npc)) });
  }
  const acik = eylemler.find((e) => e.id === act);

  return (
    <ScreenFresk><ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingTop: 0, paddingBottom: insets.bottom + 110 }}>
      <View style={{ height: insets.top, marginHorizontal: -14, backgroundColor: C.bg }} />

      <View>
        <NpcSceneArt state={state} npc={npc} mood={ns.mood} dead={prof.olu} relation={v} relationLabel={relationLabel} />
        <Pressable onPress={() => router.back()} style={{ position: "absolute", top: 6, left: rtl ? undefined : -4, right: rtl ? -4 : undefined, minHeight: L.touch, justifyContent: "center", paddingHorizontal: 10, borderRadius: 6, backgroundColor: "rgba(14,10,6,0.55)" }}><BackLabel /></Pressable>
      </View>

      {prof.burada && !state.player.dead && (<>
      {/* ── Söz perdesi: kişinin son sözü (ya da tavrı), yarım kalan sohbet ── */}
      <View onLayout={e => { chatY.current = e.nativeEvent.layout.y; }}>
        <View style={{ marginTop: 6, marginBottom: 10 }}>
          <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: line ? (lineDelta < 0 ? C.blood : C.goldDim) : C.borderHi, backgroundColor: "rgba(33,24,16,0.94)" }}>
            <Text accessibilityLiveRegion="polite" style={{ flex: 1, fontFamily: line ? F.serif : F.serifItalic, fontSize: 16, lineHeight: 23, color: line ? C.parchment : C.parchmentDim, textAlign: rtl ? "right" : "left" }}>{line || (stance !== "notr" ? t("bakis.t." + stance) : t("npcx.idle"))}</Text>
            {line && lineDelta !== 0 ? (
              <View style={{ paddingVertical: 2, paddingHorizontal: 7, borderRadius: 5, borderWidth: 1, borderColor: (lineDelta > 0 ? C.sage : C.blood) + "66", backgroundColor: (lineDelta > 0 ? C.sage : C.blood) + "1A" }}>
                <Text style={{ fontFamily: F.display, fontSize: 13, color: lineDelta > 0 ? C.sage : C.blood }}>{lineDelta > 0 ? "+" + lineDelta : lineDelta}</Text>
              </View>
            ) : null}
          </View>
          <View pointerEvents="none" style={{ position: "absolute", top: -7, left: rtl ? undefined : 34, right: rtl ? 34 : undefined, width: 14, height: 14, transform: [{ rotate: "45deg" }], borderLeftWidth: 1, borderTopWidth: 1, borderColor: line ? (lineDelta < 0 ? C.blood : C.goldDim) : C.borderHi, backgroundColor: "rgb(33,24,16)" }} />
        </View>
        <SohbetDevami state={state} id={npc.id} onReply={reply} />
      </View>

      {recalled && (
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.borderHi, borderRadius: 5, padding: 12, marginBottom: 10 }}>
          <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 7, marginBottom: 6 }}>
            <GameIcon name="scroll" size={14} color={recalled.yuk > 0 ? C.sage : C.ember} />
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: T.body, color: C.gold }}>{t("npc.remembers")}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: T.body, color: C.parchmentMuted }}>{state.turn === recalled.hafta ? t("mind.recall.now") : applyParams(t("mind.recall.ago"), [state.turn - recalled.hafta], lang)}</Text>
          </View>
          <Text style={{ fontFamily: F.serifItalic, fontSize: T.body, lineHeight: T.line, color: C.parchmentDim }}>{memoryQuote(recalled, lang, state.player.gender === "kadın")}</Text>
          {(recalled.kanit === "gorgu" || recalled.kanit === "katilim") && <Text style={{ fontFamily: F.serif, fontSize: T.body, color: C.parchmentMuted, marginTop: 5 }}>{t("mind.evidence." + recalled.kanit)}</Text>}
          {witnesses.length > 0 && <View style={{ marginTop: 9 }}>
            <Text style={{ fontFamily: F.serif, fontSize: T.body, color: C.parchmentMuted }}>{t("mind.witness.others")}</Text>
            <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 6, marginTop: 5 }}>
              {witnesses.map(id => { const witness = kisiProfil(state, id, lang); return witness ? <Pressable key={id} accessibilityRole="button" accessibilityLabel={witness.npc.name} onPress={() => router.push({ pathname: "/oyun/npc/[id]", params: { id } })} style={{ minHeight: 44, maxWidth: "100%", justifyContent: "center", paddingHorizontal: 9, borderWidth: 1, borderColor: C.border, borderRadius: 5 }}>
                <Text style={{ fontFamily: F.serif, fontSize: T.body, color: C.gold }}>{witness.npc.name}{witness.olu ? " · " + t("npc.late") : ""}</Text>
              </Pressable> : null; })}
            </View>
          </View>}
          <Pressable accessibilityRole="button" accessibilityLabel={t("mind.recall.action")} accessibilityState={{ disabled: usedAct("t:hatira") }} disabled={usedAct("t:hatira")} onPress={() => { hap("tap"); speak("hatira"); }} style={{ minHeight: 44, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: C.borderHi, borderRadius: 5, marginTop: 8, opacity: usedAct("t:hatira") ? 0.5 : 1 }}>
            <Text style={{ fontFamily: F.serif, fontSize: T.body, color: C.gold }}>{t(usedAct("t:hatira") ? "mind.recall.done" : "mind.recall.action")}</Text>
          </Pressable>
        </View>
      )}
      {!recalled && <NpcIzlenimi def={ns.izlenim} used={usedAct("t:hatira")} onPress={() => { hap("tap"); speak("hatira"); }} />}
      {heard && state.player.age >= 13 && (
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 5, padding: 12, marginBottom: 10 }}>
          <Text style={{ fontFamily: F.serifItalic, fontSize: T.body, lineHeight: T.line, color: C.parchmentDim }}>{t("rum.net.topic")}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t("rum.net.action")} accessibilityState={{ disabled: usedAct("t:duyum") }} disabled={usedAct("t:duyum")} onPress={() => { hap("tap"); speak("duyum"); }} style={{ minHeight: 44, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: C.borderHi, borderRadius: 5, marginTop: 8, opacity: usedAct("t:duyum") ? 0.5 : 1 }}>
            <Text style={{ fontFamily: F.serif, fontSize: T.body, color: C.gold }}>{t(usedAct("t:duyum") ? "rum.net.done" : "rum.net.action")}</Text>
          </Pressable>
        </View>
      )}

      {/* ── Söyleyeceklerin: konular iki sütun ── */}
      <View style={PANEL}>
        <PanelBaslik icon="speaker" title={t("visual.talkTitle")} rtl={rtl} />
        {familyAction && <Pressable testID="npc-family-action" accessibilityRole="button" accessibilityLabel={t(familyAction.key)} accessibilityState={{ disabled: familyAction.used }} disabled={familyAction.used} onPress={() => {
          hap("tap"); const next = aileProfilEyleminiYap(state, npc.id); apply(() => next);
          const e = next.history[next.history.length - 1];
          setLine(e ? renderEvt(e.k || "", e.text, e.p || [], lang, t, state.player.gender === "kadın") : ""); setLineDelta(0); focusChat();
        }} style={({ pressed }) => gameActionStyle(pressed, C.gold, familyAction.used, rtl)}>
          <NpcActionIcon name="family" />
          <View style={{ flex: 1 }}><Text style={{ fontFamily: F.serif, fontSize: 15, color: C.gold }}>{t(familyAction.key)}</Text>
          {familyAction.cost > 0 && <Text style={{ fontFamily: F.serif, fontSize: T.body, color: C.parchmentMuted }}>{applyParams(t("sohbet.cost"), [familyAction.cost], lang)}</Text>}</View>
          {familyAction.used && <Text style={{ maxWidth: 90, flexShrink: 1, fontFamily: F.serif, fontSize: T.body, lineHeight: 22, color: C.parchmentMuted }}>{t(familyAction.key + ".used")}</Text>}
          {!familyAction.used && <NpcActionChevron rtl={rtl} />}
        </Pressable>}
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 8 }}>
          {visibleTopics.map((it) => { const used = usedAct("t:" + it.id); return (
            <Pressable key={it.id} accessibilityRole="button" accessibilityLabel={topicLabel(it.id)} accessibilityState={{ disabled: used }} disabled={used} onPress={() => { hap("tap"); speak(it.id); }} style={({ pressed }) => konuStil(pressed, used, rtl)}>
              <GameIcon name={it.icon} size={18} color={used ? C.parchmentMuted : C.gold} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 19, color: used ? C.parchmentMuted : C.parchment, textAlign: rtl ? "right" : "left" }}>{topicLabel(it.id)}</Text>
                {used ? <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.goldDim, textAlign: rtl ? "right" : "left" }}>{done}</Text> : null}
              </View>
            </Pressable>
          ); })}
          {topics.some(it => !primary.includes(it.id)) && <Pressable accessibilityRole="button" accessibilityLabel={t("sohbet.more")} accessibilityState={{ expanded: moreTopics }} onPress={() => setMoreTopics(x => !x)} style={({ pressed }) => konuStil(pressed, false, rtl, true)}>
            <GameIcon name="scroll-open" size={18} color={C.parchmentMuted} />
            <Text numberOfLines={2} style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, lineHeight: 19, color: C.parchmentMuted, textAlign: rtl ? "right" : "left" }}>{t("sohbet.more")}</Text>
            <NpcActionChevron rtl={rtl} expanded={moreTopics} />
          </Pressable>}
        </View>
      </View>

      {/* ── Eylemler: madalyonlar; ayrıntı, bedel ve şans alttan açılan panelde ── */}
      <View style={PANEL}>
        <PanelBaslik icon="gems" title={t("npcx.deeds")} rtl={rtl} />
        {state.player.betrothed?.id === npc.id ? (
          <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10, paddingHorizontal: 10, paddingVertical: 10, marginBottom: 6, borderRadius: 8, backgroundColor: "rgba(192,85,107,0.10)" }}>
            <GameIcon name="ring" size={17} color={C.roseDim} />
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.roseDim }}>{t("npc.betrothed")}</Text>
          </View>
        ) : null}
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap" }}>
          {eylemler.map((e) => <EylemTasi key={e.id} icon={e.icon} label={e.tile} tag={e.tag} tone={e.tone} dim={!!e.blocked} onPress={() => setAct(e.id)} />)}
        </View>
      </View>
      </>)}

      <EvlatMektubu state={state} id={npc.id} onSend={() => { hap("tap"); apply(s => evladaMektup(s, npc.id)); }} />

      {/* ── Onu tanı: tavır, görüş dökümü, huy, hayal ── */}
      <OrnatePanel title={t("npc.knowTitle")} icon="sun">
        {!prof.olu && !prof.burada ? <Text style={{ fontFamily: F.serifItalic, fontSize: T.caption, color: C.goldDim, marginBottom: 6 }}>{t("npc.livesIn").replace("%1", placeName(npc.loc || "", lang))}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={t("gorus.ipucu")} accessibilityState={{ expanded: gorusAcik }} onPress={() => { hap("tap"); setGorusAcik((x) => !x); }} hitSlop={8} style={({ pressed }) => ({ flexDirection: rtl ? "row-reverse" : "row", minHeight: 44, alignSelf: "flex-start", alignItems: "center", gap: 8, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 9, borderWidth: 1, borderColor: pressed ? C.goldBright : C.borderHi, borderBottomWidth: pressed ? 1 : 3, borderBottomColor: C.bg, backgroundColor: pressed ? C.surface : C.cardHi, transform: [{ translateY: pressed ? 2 : 0 }] })}>
          <GameIcon name="compass" size={16} color={C.gold} />
          <Text style={{ fontFamily: F.serif, fontSize: T.body, color: C.gold }}>{t("gorus.ipucu")}</Text>
        </Pressable>
        {!prof.olu && <NpcTavri state={state} id={npc.id} />}
        {/* Görüş dökümü: motorun kullandığı değerle birebir aynı kalemler (relWith = gorus().toplam) */}
        {gorusAcik ? (() => {
          const g = gorus(state, npc.id);
          return (
            <View style={{ marginTop: 10, paddingTop: 9, borderTopWidth: 1, borderTopColor: C.border }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.goldDim, marginBottom: 6 }}>{t("gorus.title")}</Text>
              {g.kalemler.map((it, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 3 }}>
                  <Text style={{ flex: 1, fontFamily: it.k === "gorus.ani" ? F.serifItalic : F.serif, fontSize: 15, color: C.parchmentDim, lineHeight: T.line }}>{it.k === "gorus.ani" ? "«" + memoryQuote(representativeMemory(ns.anilar, it.tur || "") || { tur: it.tur || "" }, lang, state.player.gender === "kadın") + "»" : t(it.k)}</Text>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: it.v > 0 ? C.sage : C.blood, minWidth: 34, textAlign: "right" }}>{it.v > 0 ? "+" + it.v : it.v}</Text>
                </View>
              ))}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 6, marginTop: 4, borderTopWidth: 1, borderTopColor: C.border }}>
                <Text style={{ flex: 1, fontFamily: F.display, fontSize: 13, color: C.parchment }}>{t("gorus.toplam")}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 13, color: g.toplam >= 20 ? C.sage : g.toplam <= -20 ? C.blood : C.parchment, minWidth: 34, textAlign: "right" }}>{g.toplam > 0 ? "+" + g.toplam : g.toplam}</Text>
              </View>
              <NpcTavri state={state} id={npc.id} detailed />
            </View>
          );
        })() : null}
        <Text style={{ fontFamily: F.serif, fontSize: T.body, color: C.parchmentMuted, marginTop: 6, lineHeight: T.line }}>{(() => { const q = quirkL(npc.quirk, lang); return q[0].toUpperCase() + q.slice(1); })()}.</Text>
        {prof.karar ? <Text style={{ fontFamily: F.serifItalic, fontSize: T.body, color: C.parchmentMuted, marginTop: 2 }}>{(() => { const k = prof.karar!; const mal = kucukHarf(t("it." + k.mal), lang); const eski = kucukHarf(professionNameL(k.eski, lang), lang); return k.eski === "işsiz" ? (k.yilOnce === 0 ? t("npc.jobFoundNow").replace("%1", mal) : t("npc.jobFoundAgo").replace("%1", String(k.yilOnce)).replace("%2", mal)) : k.yilOnce === 0 ? t("npc.jobSwitchNow").replace("%1", eski).replace("%2", mal) : t("npc.jobSwitchAgo").replace("%1", String(k.yilOnce)).replace("%2", eski).replace("%3", mal); })()}</Text> : null}
        {npc.goal && !prof.olu ? <Text style={{ fontFamily: F.serifItalic, fontSize: T.body, color: C.goldDim, marginTop: 2 }}>{t("npc.dream")} {goalL(npc.goal, lang)}.</Text> : null}
        {/* Gizli ilişki: bu kişi aktif yasak sevgilinse ateş çubuğuyla göster */}
        {state.player.affair?.id === npc.id ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 5, borderWidth: 1, borderColor: C.ember + "55", backgroundColor: C.ember + "14" }}>
            <GameIcon name="lyre" size={11} color={C.ember} />
            <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 0.5, color: C.ember }}>{t("affair.badge").toUpperCase()}</Text>
            <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: C.ember + "22", overflow: "hidden" }}>
              <View style={{ width: `${Math.max(0, Math.min(100, state.player.affair.heat))}%`, height: "100%", backgroundColor: C.ember }} />
            </View>
          </View>
        ) : null}
      </OrnatePanel>

      {/* ── Çevresi (NPC↔NPC ilişki ağı) ── */}
      {ties.length > 0 && (
        <View style={{ marginBottom: 4 }}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: tiesOpen }} onPress={() => setTiesOpen(x => !x)} style={({ pressed }) => gameActionStyle(pressed, C.goldDim, false, rtl)}>
            <NpcActionIcon name="iliskiler" color={C.goldDim} />
            <Text numberOfLines={1} style={{ flex: 1, minWidth: 0, fontFamily: F.display, fontSize: T.label, letterSpacing: 1, color: C.goldDim, textTransform: "uppercase" }}>{t("npc.ties")} · {ties.length}</Text>
            <NpcActionChevron rtl={rtl} expanded={tiesOpen} />
          </Pressable>
          {tiesOpen && ties.map((tt) => {
            const meta = TIE_META[tt.kind];
            return (
              <Pressable key={tt.kind + tt.otherId} onPress={() => { hap("tap"); router.push(`/oyun/npc/${tt.otherId}`); }} style={({ pressed }) => gameActionStyle(pressed, meta.tone, false, rtl)}>
                <View style={{ opacity: tt.olu ? 0.45 : 1 }}><Portre age={tt.who!.age} gender={tt.who!.gender} size={32} ring={false} seed={tt.who!.id} /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: T.body, color: tt.olu ? C.parchmentMuted : C.parchment }}>{tt.who!.name}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: T.body, color: C.parchmentMuted }}>{tt.olu ? t("npc.late") : professionNameL(tt.who!.profession, lang, tt.who!.gender === "kadın")} · {tt.who!.age}{!tt.olu && tt.uzak ? " · " + placeName(tt.who!.loc || "", lang) : ""}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 8, borderWidth: 1, borderColor: meta.tone + "55", backgroundColor: meta.tone + "14" }}>
                  <GameIcon name={meta.icon} size={11} color={meta.tone} />
                  <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 0.5, color: meta.tone }}>{t("tie." + tt.kind).toUpperCase()}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* ── Seni hatırlıyor (yapısal anılar, en ağır) ── */}
      {(() => {
        const tops = topMemories(ns.anilar, 3);
        if (!tops.length) return null;
        return (
          <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(201,168,76,0.3)", borderRadius: 5, padding: 14, marginBottom: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <GameIcon name="scroll" size={13} color={C.goldDim} />
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: C.goldDim, textTransform: "uppercase" }}>{t("npc.remembers")}</Text>
            </View>
            {tops.map((m, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 7, marginBottom: 5, alignItems: "flex-start" }}>
                <GameIcon name={m.travma ? "skull" : m.yon > 0 ? "prayer-beads" : "crossed-swords"} size={11} color={m.travma ? C.blood : m.yon > 0 ? C.sage : C.blood} />
                <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: T.body, color: m.travma ? C.blood : C.parchmentDim, lineHeight: T.line }}>{memoryQuote(representativeMemory(ns.anilar, m.tur) || { tur: m.tur }, lang, state.player.gender === "kadın")}{m.travma ? ` — ${t("npc.trauma")}` : ""}</Text>
              </View>
            ))}
          </View>
        );
      })()}

      {/* ── Onun Zihninde (anılar) ── */}
      {ns.memories.length > 0 && (
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(201,168,76,0.22)", borderRadius: 5, padding: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <GameIcon name="book" size={13} color={C.goldDim} />
            <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: C.goldDim, textTransform: "uppercase" }}>{t("npc.mind")}</Text>
          </View>
          {[...ns.memories].reverse().map((m, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 7, marginBottom: 5 }}>
              <GameIcon name="prayer-beads" size={11} color={C.gold} />
              <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: T.body, color: C.parchmentDim, lineHeight: T.line }}>{m}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
    <GameSheet visible={!!acik} onClose={() => setAct(null)} title={acik?.title || ""} icon={acik?.icon || "gems"}>
      {acik ? <View>
        <Text style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 23, color: C.parchment, marginBottom: 8 }}>{acik.desc}</Text>
        {acik.note ? <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 22, color: C.goldDim, marginBottom: 8 }}>{acik.note}</Text> : null}
        {(acik.warn || []).map((w, i) => <View key={i} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "flex-start", gap: 8, padding: 10, marginBottom: 8, borderRadius: 8, borderWidth: 1, borderColor: C.ember + "55", backgroundColor: C.ember + "12" }}>
          <GameIcon name="crossed-swords" size={14} color={C.ember} />
          <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, lineHeight: 21, color: C.ember }}>{w}</Text>
        </View>)}
        {acik.sans ? <SansDokum kalemler={acik.sans.kalemler} yuzde={acik.sans.yuzde} t={t} baslik={acik.id === "propose" ? "sans.title" : "npcx.chance"} /> : null}
        {acik.blocked ? <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 22, color: C.parchmentMuted, textAlign: "center", marginVertical: 10 }}>{acik.blocked}</Text>
          : acik.custom ? <View style={{ marginTop: 4 }}>{acik.custom}</View>
          : acik.run ? <SheetChoice icon={acik.icon} label={acik.title} tag={acik.tag} tone={acik.tone} primary onPress={acik.run} /> : null}
      </View> : null}
    </GameSheet>
    </ScreenFresk>
  );
}

// Eylem: madalyonda kısa ad; panelde açıklama, uyarı, şans dökümü ve onay.
type Eylem = { id: string; icon: string; tile: string; title: string; desc: string; tone?: string; tag?: string; note?: string; warn?: string[]; sans?: { kalemler: { k: string; v: number }[]; yuzde: number }; blocked?: string; run?: () => void; custom?: ReactNode };

const PANEL: ViewStyle = { marginBottom: 12, padding: 10, borderWidth: 1, borderColor: C.borderHi, borderRadius: 8, backgroundColor: "rgba(24,18,11,0.9)" };

function PanelBaslik({ icon, title, rtl }: { icon: string; title: string; rtl: boolean }) {
  return <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10, paddingHorizontal: 4, paddingTop: 2, paddingBottom: 10 }}>
    <GameIcon name={icon} size={20} color={C.gold} />
    <Text accessibilityRole="header" style={{ flex: 1, fontFamily: F.display, fontSize: 18, color: C.gold, textAlign: rtl ? "right" : "left" }}>{title}</Text>
  </View>;
}

function konuStil(pressed: boolean, used: boolean, rtl: boolean, wide = false): ViewStyle {
  return { flexBasis: wide ? "100%" : "46%", flexGrow: 1, minHeight: 52, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 9, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: used ? C.border : pressed ? C.goldBright : C.borderHi, borderBottomWidth: pressed || used ? 1 : 3, borderBottomColor: used ? C.border : C.bg, backgroundColor: pressed ? C.surface : used ? "rgba(23,17,10,0.6)" : C.cardHi, transform: [{ translateY: pressed ? 2 : 0 }] };
}

function EylemTasi({ icon, label, tag, tone = C.gold, dim, onPress }: { icon: string; label: string; tag?: string; tone?: string; dim: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => { hap("tap"); onPress(); }} style={({ pressed }) => ({ width: "25%", minHeight: 84, alignItems: "center", paddingTop: 4, paddingBottom: 6, opacity: dim ? 0.5 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] })}>
    <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: "#120C06", borderWidth: 2, borderColor: tone }}>
      <View style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: 23, borderWidth: 1, borderColor: tone + "44" }} />
      <GameIcon name={icon} size={24} color={tone} />
    </View>
    {tag ? <View style={{ position: "absolute", top: 0, right: 2, minWidth: 24, height: 19, paddingHorizontal: 5, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#120C06", borderWidth: 1, borderColor: tone }}>
      <Text style={{ fontFamily: F.display, fontSize: 11, lineHeight: 14, color: tone }}>{tag}</Text>
    </View> : null}
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ marginTop: 5, maxWidth: "100%", paddingHorizontal: 2, fontFamily: F.display, fontSize: 12.5, color: C.parchment, textAlign: "center" }}>{label}</Text>
  </Pressable>;
}

function SheetChoice({ icon, label, sub, tag, tone = C.gold, primary = false, disabled = false, onPress }: { icon: string; label: string; sub?: string; tag?: string; tone?: string; primary?: boolean; disabled?: boolean; onPress: () => void }) {
  const { lang } = useI18n(), rtl = lang === "ar";
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={() => { hap("success"); onPress(); }} style={({ pressed }) => ({ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10, minHeight: 54, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: pressed ? C.goldBright : tone, borderBottomWidth: pressed ? 1.5 : 4, borderBottomColor: C.bg, backgroundColor: primary ? (pressed ? "#3A2A14" : "#2E2112") : pressed ? C.surface : C.cardHi, opacity: disabled ? 0.45 : 1, transform: [{ translateY: pressed ? 2 : 0 }] })}>
    <GameIcon name={icon} size={20} color={tone} />
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={{ fontFamily: primary ? F.display : F.serif, fontSize: primary ? 16 : 15.5, color: primary ? C.goldBright : C.parchment, textAlign: rtl ? "right" : "left" }}>{label}</Text>
      {sub ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, marginTop: 2, textAlign: rtl ? "right" : "left" }}>{sub}</Text> : null}
    </View>
    {tag ? <Text style={{ fontFamily: F.display, fontSize: 13, color: tone }}>{tag}</Text> : null}
  </Pressable>;
}
