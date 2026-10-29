import { useRef, useState } from "react";
import { View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { RECIPES, canCraft, craft, inJail, Recipe, workshopOrderOffers, acceptWorkshopOrder, deliverWorkshopOrder, cancelWorkshopOrder, workshopOrderStatus, npcLonca, type GameState, type WorkshopOrderOffer } from "../../lib/game";
import { C } from "../../lib/theme";
import { useI18n, applyParams, renderEvt } from "../../lib/i18n";
import { professionNameL, placeName, type Lang } from "../../lib/locale-data";
import { hap } from "../../lib/haptics";
import { playTap, playClash, playChime, playCoin, playEffect } from "../../lib/sound";
import { useSadeMod } from "../../lib/use-sade-mod";
import { ScreenFresk } from "../../lib/ui";
import { BLEED, CAT_ORDER, CAT_TONE, ForgeHero, ForgeStatus, SectionTitle, catOf, type Cat, type ForgeMode } from "../../lib/sayfa/atolye/parcalar";
import { OrderBoard } from "../../lib/sayfa/atolye/siparis";
import { CategoryTabs, RecipeCard, type CardInfo } from "../../lib/sayfa/atolye/tarif";

// Meslek tarifi yoksa açılışta mesleğe yakın sekme seçilsin.
const PROF_CAT: Record<string, Cat> = { demirci: "arms", asker: "arms", "avcı": "arms", "şifacı": "heal", "dokumacı": "wear" };
const CRAFT_KEYS = new Set(["evj.craft", "evj.craftN", "evj.craftQ", "evj.craftNQ"]);
const QUALITY_TONE: Record<string, string> = { usta_isi: C.goldBright, iyi: C.sage, kusurlu: C.blood };

// Bu ay üretilen malın kronik satırı (kalite kademesiyle); kart üzerindeki sonuç şeridi için.
function craftResult(s: GameState, lang: Lang, t: (k: string) => string): { good: string; text: string; tier?: string } | null {
  const p = s.player, lc = p.last_craft;
  if (!lc || lc.turn !== s.turn || p.craft_turn !== s.turn) return null;
  const h = s.history || [];
  for (let i = h.length - 1; i >= 0 && i >= h.length - 40; i--) {
    const e = h[i];
    if (!e.k || !CRAFT_KEYS.has(e.k) || (e.p?.[0] as any)?.i !== lc.good) continue;
    const tier = (e.p || []).find((x: any) => x && typeof x === "object" && "q" in x) as any;
    return { good: lc.good, text: renderEvt(e.k, e.text, e.p, lang, t, p.gender === "kadın"), tier: tier?.q };
  }
  return { good: lc.good, text: t("it." + lc.good) };
}

export default function Atolye() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { t, lang, rtl } = useI18n();
  const reduced = useSadeMod();
  const scroll = useRef<ScrollView>(null);
  const recipesY = useRef(0);
  const [tab, setTab] = useState<Cat | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const skill = p.skills.crafting;
  const order = state.workshopOrder;
  const orderOffers = workshopOrderOffers(state);
  const orderStatus = workshopOrderStatus(state);
  const guild = npcLonca(p.profession);
  const orderBenefit = guild && p.faction === guild ? "cra.order.guildBenefit" : "cra.order.publicBenefit";
  const crafted = p.craft_turn === state.turn; // bu ay üretildi → tur dolana dek kapalı
  const jailed = inJail(p);
  const mode: ForgeMode = jailed ? "closed" : crafted ? "rest" : "ready";
  const fmt = (k: string, ps: (string | number)[]) => applyParams(t(k), ps);
  const orderRecipe = order ? RECIPES.find((r) => r.id === order.recipeId) : undefined;
  const result = craftResult(state, lang, t);

  const defaultTab = (): Cat => {
    if (orderRecipe) return catOf(orderRecipe);
    const able = RECIPES.find((r) => canCraft(p, r)); if (able) return catOf(able);
    const own = RECIPES.find((r) => r.prof === p.profession); if (own) return catOf(own);
    return PROF_CAT[p.profession] || "food";
  };
  const active = tab || defaultTab();
  const cats = CAT_ORDER.map((cat) => {
    const list = RECIPES.filter((r) => catOf(r) === cat);
    return { cat, list, name: t("wsp.cat." + cat), ready: crafted ? 0 : list.filter((r) => canCraft(p, r)).length };
  }).filter((c) => c.list.length > 0);
  // Sabit sıra (üretince kart yerinden kaymasın); başka mesleğin ustalık tarifleri sona.
  const list = (cats.find((c) => c.cat === active)?.list || []).slice().sort((a, b) => Number(!!a.prof && a.prof !== p.profession) - Number(!!b.prof && b.prof !== p.profession));

  const onCraft = (r: Recipe) => {
    hap("success");
    if (catOf(r) === "arms") playClash(); else playChime();
    setFocus(null);
    apply((s) => craft(s, r.id));
  };
  const onAccept = (offer: WorkshopOrderOffer) => { hap("tap"); playEffect("kalem"); apply((s) => acceptWorkshopOrder(s, offer.recipeId)); };
  const onDeliver = () => { hap("success"); playCoin(); apply((s) => deliverWorkshopOrder(s)); };
  const onCancel = () => { hap("tap"); playTap(); apply((s) => cancelWorkshopOrder(s)); };
  const showRecipe = orderRecipe && (orderStatus === "craft" || orderStatus === "stock" || orderStatus === "craftOther") ? () => {
    hap("selection"); playTap();
    setTab(catOf(orderRecipe)); setFocus(orderRecipe.id);
    scroll.current?.scrollTo({ y: Math.max(0, recipesY.current - 8), animated: !reduced });
  } : undefined;

  const cardInfo = (r: Recipe): CardInfo => {
    const tone = CAT_TONE[catOf(r)];
    const locked = skill < r.minSkill;
    const otherProf = !!r.prof && p.profession !== r.prof; // ustalık tarifi: kapının nedeni butonda yazsın
    const able = canCraft(p, r) && !crafted;
    const name = t("it." + r.out);
    const abbr = t("wsp.skillAbbr");
    const mine = !!result && result.good === r.out;
    let reason: CardInfo["reason"];
    if (!able) {
      if (otherProf) reason = { icon: "meslek", text: applyParams(t("wsp.profOnly"), [professionNameL(r.prof!, lang)]) };
      else if (jailed) reason = { icon: "prisoner", text: t("atolye.jailed") };
      else if (crafted) reason = { icon: "hourglass", text: t("atolye.busy") };
      else if (locked) reason = { icon: "graduate-cap", text: applyParams(t("wsp.locked"), [r.minSkill]) };
      else reason = { icon: "backpack", text: t("wsp.noMat") };
    }
    return {
      r, name, tone, able, otherProf, isOrder: orderRecipe?.id === r.id, focused: focus === r.id,
      skillText: `${t("wsp.needSkill")} ${abbr}${r.minSkill}`,
      yourSkill: locked ? `${t("wsp.your")} ${abbr}${skill}` : undefined,
      profName: r.prof ? (otherProf ? applyParams(t("wsp.profOnly"), [professionNameL(r.prof, lang)]) : professionNameL(r.prof, lang)) : undefined,
      orderTag: t("atolye.orderTag"),
      inputs: Object.entries(r.inputs).map(([id, q]) => ({ id, name: t("it." + id), have: p.inventory[id] || 0, need: q })),
      materialsLabel: t("wsp.materials"), craftLabel: t("misc.craft"), craftA11y: `${t("misc.craft")}: ${name}`,
      reason,
      result: mine && result ? { head: t("wsp.craftedTurn"), text: result.text, tone: QUALITY_TONE[result.tier || ""] || C.gold } : undefined,
    };
  };

  return (
    <ScreenFresk>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: BLEED, paddingBottom: insets.bottom + 100 }}>
        <ForgeHero topInset={insets.top} rtl={rtl} title={t("scr.atolye")} kicker={placeName(p.location_name, lang)} backLabel={t("common.back")} onBack={() => router.back()} />
        <ForgeStatus level={skill} xp={p.skill_xp?.crafting ?? skill * 100} mode={mode} rtl={rtl} labels={{
          skill: `${t("skill.crafting")} · ${t("wsp.skillAbbr")} ${skill}`,
          medal: applyParams(t("atolye.skillLabel"), [skill]),
          badge: mode === "ready" ? t("atolye.forge.ready") : mode === "rest" ? t("atolye.forge.rest") : t("atolye.forge.closed"),
          progress: skill >= 10 ? t("atolye.maxLevel") : applyParams(t("atolye.xpNext"), [Math.max(1, (skill + 1) * 100 - (p.skill_xp?.crafting ?? skill * 100))]),
          line: mode === "ready" ? t("atolye.forgeLine.ready") : mode === "rest" ? t("atolye.forgeLine.rest") : t("atolye.forgeLine.closed"),
          rule: `${t("wsp.hint")} ${t("wsp.gain")}.`,
        }} />

        <OrderBoard rtl={rtl} reduced={reduced} t={t} fmt={fmt} cityLabel={placeName(p.location_name, lang)} order={order} offers={orderOffers} status={orderStatus}
          benefit={orderBenefit} inventory={p.inventory} placeLabel={(c) => placeName(c, lang)}
          onAccept={onAccept} onDeliver={onDeliver} onCancel={onCancel} onShowRecipe={showRecipe} />

        <View onLayout={(e) => { recipesY.current = e.nativeEvent.layout.y; }}>
          <SectionTitle rtl={rtl} title={t("atolye.recipes")} />
          <CategoryTabs rtl={rtl} cats={cats} active={active} label={(c) => `${c.name}, ${applyParams(t("atolye.readyCount"), [c.ready])}`}
            onSelect={(c) => { hap("selection"); playTap(); setTab(c); setFocus(null); }} />
          <View key={active}>
            {list.map((r, i) => <RecipeCard key={r.id} info={cardInfo(r)} index={i} rtl={rtl} reduced={reduced} onCraft={onCraft} />)}
          </View>
        </View>
      </ScrollView>
    </ScreenFresk>
  );
}
