import { DesignPressable as Pressable } from "../../../lib/design-pressable";
import { useState, useMemo, useRef, useEffect } from "react";
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
import { sohbetCevapla, aileProfilEylemi, aileProfilEyleminiYap } from "../../../lib/game";
import type { SohbetYanit } from "../../../lib/npc-sohbet";
import { EvlatMektubu } from "../../../lib/evlat-ui";
import { evladaMektup } from "../../../lib/game";
import { memoryQuote } from "../../../lib/hafiza-sohbet";
import { professionNameL, quirkL, goalL, placeName } from "../../../lib/locale-data";
import { ITEMS, TieKind } from "../../../lib/world";
import { Portre, BackLabel, ScreenFresk } from "../../../lib/ui";
import { GameIcon } from "../../../lib/icons";
import { NpcSceneArt } from "../../../lib/npc-scene-ui";
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: pressed ? C.goldBright : tone + "99",
    borderBottomWidth: pressed ? 1 : 3,
    borderBottomColor: pressed ? tone + "88" : C.bg,
    backgroundColor: pressed ? C.surface : C.cardHi,
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
  return <View style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, borderWidth: 1, borderColor: color + "A8", borderBottomWidth: 3, borderBottomColor: C.bg, backgroundColor: "#21180F", shadowColor: color, shadowOpacity: 0.16, shadowRadius: 4, elevation: 2 }}>
    <View style={{ width: 33, height: 33, alignItems: "center", justifyContent: "center", borderRadius: 11, borderWidth: 1, borderColor: color + "44", backgroundColor: "#302317" }}>
      <GameIcon name={name} size={20} color={color} />
    </View>
    <View pointerEvents="none" style={{ position: "absolute", top: 4, left: 8, right: 8, height: 1, borderRadius: 1, backgroundColor: "rgba(255,239,193,0.32)" }} />
  </View>;
}

function NpcActionChevron({ rtl = false, expanded = false }: { rtl?: boolean; expanded?: boolean }) {
  return <View style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 14, borderWidth: 1, borderColor: C.goldDim + "88", backgroundColor: C.surface }}>
    <Text style={{ fontFamily: F.display, fontSize: 20, lineHeight: 22, color: C.gold }}>{expanded ? "⌄" : rtl ? "‹" : "›"}</Text>
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

// Teklif şansı rozeti (dokununca döküm açılır) — yüzde ve kalemler motorun zar attığı değerle birebir.
function SansRozet({ yuzde, acik, onPress }: { yuzde: number; acik: boolean; onPress: () => void }) {
  const { lang } = useI18n();
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => ({ minWidth: 48, minHeight: 44, alignItems: "center", justifyContent: "center", paddingVertical: 5, paddingHorizontal: 9, borderRadius: 13, borderWidth: 1, borderColor: (acik || pressed ? C.goldBright : C.goldDim) + "AA", borderBottomWidth: pressed ? 1 : 3, borderBottomColor: C.bg, backgroundColor: acik || pressed ? "rgba(201,168,76,0.18)" : C.card, shadowColor: C.gold, shadowOpacity: 0.16, shadowRadius: 4, elevation: 2, transform: [{ translateY: pressed ? 2 : 0 }] })}>
      <Text style={{ fontFamily: F.display, fontSize: 13, color: yuzde >= 60 ? C.sage : yuzde <= 25 ? C.blood : C.gold }}>{yuzdeL(yuzde, lang)}</Text>
    </Pressable>
  );
}
function SansDokum({ kalemler, yuzde, t }: { kalemler: { k: string; v: number }[]; yuzde: number; t: (k: string) => string }) {
  const { lang } = useI18n();
  return (
    <View style={{ paddingHorizontal: 14, paddingBottom: 10, paddingTop: 2 }}>
      <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.goldDim, marginBottom: 4 }}>{t("sans.title")}</Text>
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
  const [giftOpen, setGiftOpen] = useState(false);
  const [moreTopics, setMoreTopics] = useState(false);
  const [tiesOpen, setTiesOpen] = useState(false);
  const scroll = useRef<ScrollView>(null), chatY = useRef(0);
  const [gorusAcik, setGorusAcik] = useState(false); // görüş dökümü (neden böyle bakıyor)
  const [sansAcik, setSansAcik] = useState<string | null>(null); // hangi teklifin şans dökümü açık
  const [apprenticeChoiceOpen, setApprenticeChoiceOpen] = useState(false);
  useEffect(() => { setLine(""); setLineDelta(0); setGiftOpen(false); setMoreTopics(false); setTiesOpen(false); setSansAcik(null); setApprenticeChoiceOpen(false); }, [id, state?.turn]);
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

  return (
    <ScreenFresk><ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }}>
      <Pressable onPress={() => router.back()} style={{ minHeight: L.touch, justifyContent: "center", marginBottom: 12 }}><BackLabel /></Pressable>

      <NpcSceneArt state={state} npc={npc} mood={ns.mood} dead={prof.olu} relation={v} relationLabel={relationLabel} />
      {/* ── Profil kartı ── */}
      <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.goldDim, borderRadius: 15, padding: 4, marginBottom: 12 }}>
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(216,179,90,0.34)", borderRadius: 11, padding: 13 }}>
        {!prof.olu && !prof.burada ? <Text style={{ fontFamily: F.serifItalic, fontSize: T.caption, color: C.goldDim, marginBottom: 6 }}>{t("npc.livesIn").replace("%1", placeName(npc.loc || "", lang))}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={t("gorus.ipucu")} accessibilityState={{ expanded: gorusAcik }} onPress={() => { hap("tap"); setGorusAcik((x) => !x); }} hitSlop={8} style={({ pressed }) => ({ flexDirection: lang === "ar" ? "row-reverse" : "row", minHeight: 44, alignSelf: "flex-start", alignItems: "center", gap: 8, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 9, borderWidth: 1, borderColor: pressed ? C.goldBright : C.borderHi, borderBottomWidth: pressed ? 1 : 3, borderBottomColor: C.bg, backgroundColor: pressed ? C.surface : C.cardHi, transform: [{ translateY: pressed ? 2 : 0 }] })}>
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
      </View>
      </View>

      {/* ── Çevresi (NPC↔NPC ilişki ağı) ── */}
      {ties.length > 0 && (
        <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderHi, borderRadius: 15, padding: 7, marginBottom: 10 }}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: tiesOpen }} onPress={() => setTiesOpen(x => !x)} style={({ pressed }) => gameActionStyle(pressed, C.goldDim, false, lang === "ar")}>
            <NpcActionIcon name="iliskiler" color={C.goldDim} />
            <Text numberOfLines={1} style={{ flex: 1, minWidth: 0, fontFamily: F.display, fontSize: T.label, letterSpacing: 1, color: C.goldDim, textTransform: "uppercase" }}>{t("npc.ties")} · {ties.length}</Text>
            <NpcActionChevron rtl={lang === "ar"} expanded={tiesOpen} />
          </Pressable>
          {tiesOpen && ties.map((tt) => {
            const meta = TIE_META[tt.kind];
            return (
              <Pressable key={tt.kind + tt.otherId} onPress={() => { hap("tap"); router.push(`/oyun/npc/${tt.otherId}`); }} style={({ pressed }) => gameActionStyle(pressed, meta.tone, false, lang === "ar")}>
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

      <EvlatMektubu state={state} id={npc.id} onSend={() => { hap("tap"); apply(s => evladaMektup(s, npc.id)); }} />

      {prof.burada && !state.player.dead && (<>
      {recalled && !state.player.dead && (
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.borderHi, borderRadius: 5, padding: 12, marginBottom: 10 }}>
          <View style={{ flexDirection: lang === "ar" ? "row-reverse" : "row", alignItems: "center", gap: 7, marginBottom: 6 }}>
            <GameIcon name="scroll" size={14} color={recalled.yuk > 0 ? C.sage : C.ember} />
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: T.body, color: C.gold }}>{t("npc.remembers")}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: T.body, color: C.parchmentMuted }}>{state.turn === recalled.hafta ? t("mind.recall.now") : applyParams(t("mind.recall.ago"), [state.turn - recalled.hafta], lang)}</Text>
          </View>
          <Text style={{ fontFamily: F.serifItalic, fontSize: T.body, lineHeight: T.line, color: C.parchmentDim }}>{memoryQuote(recalled, lang, state.player.gender === "kadın")}</Text>
          {(recalled.kanit === "gorgu" || recalled.kanit === "katilim") && <Text style={{ fontFamily: F.serif, fontSize: T.body, color: C.parchmentMuted, marginTop: 5 }}>{t("mind.evidence." + recalled.kanit)}</Text>}
          {witnesses.length > 0 && <View style={{ marginTop: 9 }}>
            <Text style={{ fontFamily: F.serif, fontSize: T.body, color: C.parchmentMuted }}>{t("mind.witness.others")}</Text>
            <View style={{ flexDirection: lang === "ar" ? "row-reverse" : "row", flexWrap: "wrap", gap: 6, marginTop: 5 }}>
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
      {!recalled && !state.player.dead && <NpcIzlenimi def={ns.izlenim} used={usedAct("t:hatira")} onPress={() => { hap("tap"); speak("hatira"); }} />}
      {heard && !state.player.dead && state.player.age >= 13 && (
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 5, padding: 12, marginBottom: 10 }}>
          <Text style={{ fontFamily: F.serifItalic, fontSize: T.body, lineHeight: T.line, color: C.parchmentDim }}>{t("rum.net.topic")}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t("rum.net.action")} accessibilityState={{ disabled: usedAct("t:duyum") }} disabled={usedAct("t:duyum")} onPress={() => { hap("tap"); speak("duyum"); }} style={{ minHeight: 44, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: C.borderHi, borderRadius: 5, marginTop: 8, opacity: usedAct("t:duyum") ? 0.5 : 1 }}>
            <Text style={{ fontFamily: F.serif, fontSize: T.body, color: C.gold }}>{t(usedAct("t:duyum") ? "rum.net.done" : "rum.net.action")}</Text>
          </Pressable>
        </View>
      )}
      {/* Söylenen söz — yanında ilişki etkisi (kişinin mizacına/ruh haline göre artı ya da eksi gelir) */}
      <View onLayout={e => { chatY.current = e.nativeEvent.layout.y; }}>
      {line ? (
        <View style={{ backgroundColor: C.card, borderLeftColor: lineDelta < 0 ? C.blood : C.gold, borderLeftWidth: 2.5, borderWidth: 1, borderColor: C.border, borderRadius: 5, padding: 12, marginBottom: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchment, lineHeight: T.line }}>{line}</Text>
            {lineDelta !== 0 ? (
              <View style={{ paddingVertical: 2, paddingHorizontal: 7, borderRadius: 5, borderWidth: 1, borderColor: (lineDelta > 0 ? C.sage : C.blood) + "66", backgroundColor: (lineDelta > 0 ? C.sage : C.blood) + "1A" }}>
                <Text style={{ fontFamily: F.display, fontSize: 13, color: lineDelta > 0 ? C.sage : C.blood }}>{lineDelta > 0 ? "+" + lineDelta : lineDelta}</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      <SohbetDevami state={state} id={npc.id} onReply={reply} />
      </View>

      {/* ── Etkileşim menüsü ── */}
      <View style={{ marginBottom: 10, padding: 7, borderWidth: 1, borderColor: C.borderHi, borderRadius: 15, backgroundColor: C.surface }}>
        <View style={{ flexDirection: lang === "ar" ? "row-reverse" : "row", alignItems: "center", gap: 10, paddingHorizontal: 5, paddingTop: 2, paddingBottom: 11 }}>
          <NpcActionIcon name="speaker" />
          <Text style={{ flex: 1, fontFamily: F.display, fontSize: T.title, letterSpacing: 0.5, color: C.gold }}>{t("visual.talkTitle")}</Text>
          <View style={{ width: 26, height: 1, backgroundColor: C.goldDim + "88" }} />
        </View>
        {martialLoad(state.player) > 0 && (couldMarry || canFlirt(state.player, npc, v)) ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: "rgba(224,90,48,0.07)" }}>
            <GameIcon name="crossed-swords" size={12} color={C.ember} />
            <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: T.body, color: C.ember, lineHeight: 22 }}>{t("npca.martialWarn")}</Text>
          </View>
        ) : null}
        {/* 14 yaş altı NPC'ye iş/hayal sorma — çocuğun mesleği/hedefi yok (boş tırnak saçmalığı önlenir). */}
        {familyAction && <Pressable testID="npc-family-action" accessibilityRole="button" accessibilityLabel={t(familyAction.key)} accessibilityState={{ disabled: familyAction.used }} disabled={familyAction.used} onPress={() => {
          hap("tap"); const next = aileProfilEyleminiYap(state, npc.id); apply(() => next);
          const e = next.history[next.history.length - 1];
          setLine(e ? renderEvt(e.k || "", e.text, e.p || [], lang, t, state.player.gender === "kadın") : ""); setLineDelta(0); focusChat();
        }} style={({ pressed }) => gameActionStyle(pressed, C.gold, familyAction.used, lang === "ar")}>
          <NpcActionIcon name="family" />
          <View style={{ flex: 1 }}><Text style={{ fontFamily: F.serif, fontSize: 15, color: C.gold }}>{t(familyAction.key)}</Text>
          {familyAction.cost > 0 && <Text style={{ fontFamily: F.serif, fontSize: T.body, color: C.parchmentMuted }}>{applyParams(t("sohbet.cost"), [familyAction.cost], lang)}</Text>}</View>
          {familyAction.used && <Text style={{ maxWidth: 90, flexShrink: 1, fontFamily: F.serif, fontSize: T.body, lineHeight: 22, color: C.parchmentMuted }}>{t(familyAction.key + ".used")}</Text>}
          {!familyAction.used && <NpcActionChevron rtl={lang === "ar"} />}
        </Pressable>}
        {visibleTopics.map((it) => { const done = usedAct("t:" + it.id); return (
          <Pressable key={it.id} accessibilityRole="button" accessibilityLabel={topicLabel(it.id)} accessibilityState={{ disabled: done }} disabled={done} onPress={() => { hap("tap"); speak(it.id); }} style={({ pressed }) => gameActionStyle(pressed, C.gold, done, lang === "ar")}>
            <NpcActionIcon name={it.icon} />
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchment }}>{topicLabel(it.id)}</Text>
            {done ? <Text style={{ fontFamily: F.display, fontSize: T.caption, color: C.goldDim }}>{t("soc.lock.done")}</Text> : <NpcActionChevron rtl={lang === "ar"} />}
          </Pressable>
        ); })}
        {topics.some(it => !primary.includes(it.id)) && <Pressable accessibilityRole="button" accessibilityLabel={t("sohbet.more")} accessibilityState={{ expanded: moreTopics }} onPress={() => setMoreTopics(v => !v)} style={({ pressed }) => gameActionStyle(pressed, C.parchmentMuted, false, lang === "ar")}>
          <NpcActionIcon name="scroll-open" color={C.parchmentMuted} />
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: T.body, color: C.parchmentMuted }}>{t("sohbet.more")}</Text>
          <NpcActionChevron rtl={lang === "ar"} expanded={moreTopics} />
        </Pressable>}
        {/* Hediye — kendi kanalı: sohbetten bağımsız, ayda bir */}
        <Pressable disabled={usedAct("gift")} onPress={() => setGiftOpen((o) => !o)} style={({ pressed }) => gameActionStyle(pressed, C.gold, usedAct("gift"), lang === "ar")}>
          <NpcActionIcon name="gems" />
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchment }}>{t("npc.gift")}</Text>
          <NpcActionChevron rtl={lang === "ar"} expanded={giftOpen} />
        </Pressable>
        {/* Amacına yardım et / istismar et (npc_mind goal_action) */}
        {canGoal && (
          <Pressable onPress={() => { if (state.player.money >= GOAL_HELP_COST && !usedAct("help")) { hap("success"); apply((s) => helpNpcGoal(s, npc)); } }} disabled={state.player.money < GOAL_HELP_COST || usedAct("help")} style={({ pressed }) => gameActionStyle(pressed, C.sage, state.player.money < GOAL_HELP_COST || usedAct("help"), lang === "ar")}>
            <NpcActionIcon name="leaf" color={state.player.money >= GOAL_HELP_COST ? C.sage : C.parchmentMuted} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.serif, fontSize: 15, color: state.player.money >= GOAL_HELP_COST ? C.sage : C.parchmentMuted }}>{t("npc.helpGoal")}</Text>
              <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: T.body, color: C.parchmentMuted, marginTop: 1 }}>{goalL(npc.goal, lang)}</Text>
            </View>
            <Text style={{ fontFamily: F.display, fontSize: T.caption, color: C.gold }}>{GOAL_HELP_COST} ⚜</Text>
          </Pressable>
        )}
        {canGoal && v > -25 && !(state.player.married && state.player.spouse_id === npc.id) && !oyuncuAkrabasi(state.player, npc.id) && (() => { const exploited = state.player.exploit_turn === state.turn; return (
          <Pressable disabled={exploited} onPress={() => { hap("tap"); apply((s) => exploitNpcGoal(s, npc)); }} style={({ pressed }) => gameActionStyle(pressed, C.ember, exploited, lang === "ar")}>
            <NpcActionIcon name="hood" color={C.ember} />
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.ember }}>{t("npc.exploitGoal")}</Text>
            <NpcActionChevron rtl={lang === "ar"} />
          </Pressable>
        ); })()}
        {/* Çırak al (usta çağı: 45+, en iyi beceri ≥6, genç NPC) */}
        {canTakeApprentice(state, npc) && (
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: apprenticeChoiceOpen }} onPress={() => { hap("tap"); setApprenticeChoiceOpen((open) => !open); }} style={({ pressed }) => gameActionStyle(pressed, C.gold, false, lang === "ar")}>
            <NpcActionIcon name="anvil" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.gold }}>{t("npc.aprTake")}</Text>
              <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: T.body, color: C.parchmentMuted, marginTop: 1 }}>{t("npc.aprTakeSub")}</Text>
            </View>
            <NpcActionChevron rtl={lang === "ar"} expanded={apprenticeChoiceOpen} />
          </Pressable>
        )}
        {canTakeApprentice(state, npc) && apprenticeChoiceOpen && (
          <View style={{ marginHorizontal: 14, marginBottom: 8, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface }}>
            {state.player.apprentice && state.player.apprentice.id !== npc.id && <Text style={{ fontFamily: F.serifItalic, fontSize: T.body, color: C.ember, lineHeight: T.line, marginBottom: 7 }}>{t("npc.aprReplaceWarn")}</Text>}
            <Text style={{ fontFamily: F.serifItalic, fontSize: T.body, color: C.parchmentMuted, lineHeight: T.line }}>{t("npc.aprChooseSkill")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 9 }}>
              {APPRENTICE_SKILLS.map((skill) => (
                <Pressable key={skill} accessibilityRole="button" accessibilityLabel={`${t("npc.aprTake")}: ${t("skill." + skill)}`} onPress={() => { hap("success"); apply((s) => takeApprentice(s, npc, skill)); setApprenticeChoiceOpen(false); }} style={({ pressed }) => ({ flexBasis: "47%", flexGrow: 1, minHeight: 74, justifyContent: "center", padding: 9, borderRadius: 9, borderWidth: 1, borderColor: pressed ? C.goldBright : C.goldDim + "99", borderBottomWidth: pressed ? 1 : 3, borderBottomColor: C.bg, backgroundColor: pressed ? C.surface : C.cardHi, transform: [{ translateY: pressed ? 2 : 0 }] })}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold, textAlign: lang === "ar" ? "right" : "left" }}>{t("npc.aprTake")}: {t("skill." + skill)}</Text>
                  <Text style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, marginTop: 4, textAlign: lang === "ar" ? "right" : "left" }}>{t("skill." + skill + ".b")}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        {/* Çırakla çalış (ayda bir ders) */}
        {state.player.apprentice?.id === npc.id && (() => { const apprentice = state.player.apprentice!; const apprenticeSkill = apprentice.skill || bestSkillOf(state.player); const taught = state.player.apprentice_turn === state.turn; return (
          <Pressable disabled={taught} onPress={() => { hap("tap"); apply((s) => mentorApprentice(s)); }} style={({ pressed }) => gameActionStyle(pressed, C.gold, taught, lang === "ar")}>
            <NpcActionIcon name="graduate-cap" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.gold }}>{t("npc.aprMentor")}</Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: T.body, color: C.parchmentMuted, marginTop: 1 }}>{t("skill." + apprenticeSkill)} · {(apprentice.months || 0)}/{APPRENTICE_MONTHS} {t("npc.aprMonths")}</Text>
            </View>
            <NpcActionChevron rtl={lang === "ar"} />
          </Pressable>
        ); })()}
        {/* Söz kesilmiş: bu kişiyle nişanlısın, boşanmasını bekliyorsun */}
        {state.player.betrothed?.id === npc.id ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: "rgba(192,85,107,0.08)" }}>
            <GameIcon name="ring" size={17} color={C.roseDim} />
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.roseDim }}>{t("npc.betrothed")}</Text>
          </View>
        ) : couldMarry && (() => {
          const wed = npcSeededMarried(npc); // evli birine teklif: kabul ederse önce boşanması gerekir
          return (
            <Pressable onPress={() => { if (courtable) { hap("success"); apply((s) => proposeMarriage(s, npc)); } }} disabled={!courtable} style={({ pressed }) => gameActionStyle(pressed, C.gold, !courtable, lang === "ar")}>
              <NpcActionIcon name="evlilik" color={courtable ? C.gold : C.parchmentMuted} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.serif, fontSize: 15, color: courtable ? C.gold : C.parchmentMuted }}>{t("npc.propose")}</Text>
                {!courtable ? <Text style={{ fontFamily: F.serifItalic, fontSize: T.body, color: C.parchmentMuted, marginTop: 1 }}>{t("npc.proposeReq")}</Text>
                  : wed ? <Text style={{ fontFamily: F.serifItalic, fontSize: T.body, color: C.roseDim, marginTop: 1 }}>{t("affair.warnTheirs")}</Text> : null}
              </View>
              {courtable ? <SansRozet yuzde={teklifSansi(state, npc, "kur").yuzde} acik={sansAcik === "kur"} onPress={() => setSansAcik(sansAcik === "kur" ? null : "kur")} /> : null}
            </Pressable>
          );
        })()}
        {sansAcik === "kur" && courtable ? (() => { const x = teklifSansi(state, npc, "kur"); return <SansDokum kalemler={x.kalemler} yuzde={x.yuzde} t={t} />; })() : null}
        {/* Ek etkileşimler (Vercel npc_interactions): para / flört / dedikodu / hakaret */}
        <Pressable onPress={() => { if (state.player.money >= GIVE_MONEY_AMT) { hap("tap"); apply((s) => giveMoneyTo(s, npc)); } }} disabled={state.player.money < GIVE_MONEY_AMT} style={({ pressed }) => gameActionStyle(pressed, C.gold, state.player.money < GIVE_MONEY_AMT, lang === "ar")}>
          <NpcActionIcon name="akce" color={state.player.money >= GIVE_MONEY_AMT ? C.gold : C.parchmentMuted} />
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: state.player.money >= GIVE_MONEY_AMT ? C.parchment : C.parchmentMuted }}>{t("npca.moneyBtn")}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 13, color: C.goldDim }}>{GIVE_MONEY_AMT} ⚜</Text>
        </Pressable>
        {canFlirt(state.player, npc, v) && (() => {
          const forbidden = flirtIsForbidden(state.player, npc);
          const tone = forbidden ? C.ember : C.gold;
          return (
            <Pressable disabled={usedAct("flirt")} onPress={() => { hap("success"); apply((s) => flirtWith(s, npc)); }} style={({ pressed }) => gameActionStyle(pressed, tone, usedAct("flirt"), lang === "ar")}>
              <NpcActionIcon name="lyre" color={tone} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.serif, fontSize: 15, color: tone }}>{forbidden ? t("affair.flirtBtn") : t("npca.flirtBtn")}</Text>
                {forbidden ? <Text style={{ fontFamily: F.serifItalic, fontSize: T.body, color: C.ember, marginTop: 1 }}>{state.player.married ? tg("affair.warnMarried", state.player.gender === "kadın") : t("affair.warnTheirs")}</Text> : null}
              </View>
              <SansRozet yuzde={teklifSansi(state, npc, "flort").yuzde} acik={sansAcik === "flort"} onPress={() => setSansAcik(sansAcik === "flort" ? null : "flort")} />
            </Pressable>
          );
        })()}
        {sansAcik === "flort" && canFlirt(state.player, npc, v) ? (() => { const x = teklifSansi(state, npc, "flort"); return <SansDokum kalemler={x.kalemler} yuzde={x.yuzde} t={t} />; })() : null}
        <Pressable disabled={state.player.dead || state.player.age < 13 || usedAct("gossip")} onPress={() => { hap("tap"); apply((s) => gossipAbout(s, npc)); }} style={({ pressed }) => gameActionStyle(pressed, C.parchmentDim, state.player.dead || state.player.age < 13 || usedAct("gossip"), lang === "ar")}>
          <NpcActionIcon name="speaker" color={C.parchment} />
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchment }}>{t("npca.gossipBtn")}</Text>
          <SansRozet yuzde={teklifSansi(state, npc, "dedikodu").yuzde} acik={sansAcik === "dedikodu"} onPress={() => setSansAcik(sansAcik === "dedikodu" ? null : "dedikodu")} />
        </Pressable>
        {sansAcik === "dedikodu" ? (() => { const x = teklifSansi(state, npc, "dedikodu"); return <SansDokum kalemler={x.kalemler} yuzde={x.yuzde} t={t} />; })() : null}
        {/* Helallik: aranızda kırgınlık varsa — içtenlikle ya da gönlünü alarak (bedelli) */}
        {helalUygun(state, npc.id) && (() => { const cost = helalBedeli(state, npc.id); const kul = usedAct("helal") || state.player.dead || state.player.age < 13; return (<>
          <Pressable disabled={kul} onPress={() => { hap("tap"); apply((s) => helallikIste(s, npc, false)); }} style={({ pressed }) => gameActionStyle(pressed, C.sage, kul, lang === "ar")}>
            <NpcActionIcon name="prayer-beads" color={C.sage} />
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchment }}>{t("npca.helalBtn")}</Text>
            <SansRozet yuzde={helalSansi(state, npc, false).yuzde} acik={sansAcik === "helal"} onPress={() => setSansAcik(sansAcik === "helal" ? null : "helal")} />
          </Pressable>
          {sansAcik === "helal" ? (() => { const x = helalSansi(state, npc, false); return <SansDokum kalemler={x.kalemler} yuzde={x.yuzde} t={t} />; })() : null}
          <Pressable disabled={kul || state.player.money < cost} onPress={() => { hap("tap"); apply((s) => helallikIste(s, npc, true)); }} style={({ pressed }) => gameActionStyle(pressed, C.gold, kul || state.player.money < cost, lang === "ar")}>
            <NpcActionIcon name="akce" />
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchment }}>{t("npca.helalBedelBtn")} <Text style={{ fontFamily: F.display, fontSize: 13, color: C.goldDim }}>· {cost} ⚜</Text></Text>
            <SansRozet yuzde={helalSansi(state, npc, true).yuzde} acik={sansAcik === "helalb"} onPress={() => setSansAcik(sansAcik === "helalb" ? null : "helalb")} />
          </Pressable>
          {sansAcik === "helalb" ? (() => { const x = helalSansi(state, npc, true); return <SansDokum kalemler={x.kalemler} yuzde={x.yuzde} t={t} />; })() : null}
        </>); })()}
        <Pressable disabled={state.player.dead || state.player.age < 13 || usedAct("insult")} onPress={() => { hap("tap"); apply((s) => insultNpc(s, npc)); }} style={({ pressed }) => gameActionStyle(pressed, C.blood, state.player.dead || state.player.age < 13 || usedAct("insult"), lang === "ar")}>
          <NpcActionIcon name="skull" color={C.blood} />
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.blood }}>{t("npca.insultBtn")}</Text>
        </Pressable>
      </View>

      {/* Hediye listesi (açılır) */}
      {giftOpen && (
        <View style={{ marginBottom: 10 }}>
          {giftables.length === 0 ? (
            <Text style={{ fontFamily: F.serifItalic, fontSize: T.body, color: C.parchmentMuted, textAlign: "center", paddingVertical: 8 }}>{t("npc.noGift")}</Text>
          ) : giftables.map((k) => (
            <Pressable key={k} disabled={usedAct("gift")} onPress={() => { hap("tap"); apply((s) => giftTo(s, npc, k)); setGiftOpen(false); }} style={({ pressed }) => gameActionStyle(pressed, C.gold, usedAct("gift"), lang === "ar")}>
              <NpcActionIcon name={giftIcon(ITEMS[k])} />
              <Text style={{ flex: 1, fontFamily: F.serif, fontSize: T.body, color: C.parchment }}>{t("it." + k)}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchmentMuted }}>×{state.player.inventory[k]}</Text>
            </Pressable>
          ))}
        </View>
      )}

      </>)}

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
    </ScrollView></ScreenFresk>
  );
}
