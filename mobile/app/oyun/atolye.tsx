import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { View, Text, ScrollView} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { RECIPES, canCraft, craft, Recipe, workshopOrderOffers, acceptWorkshopOrder, deliverWorkshopOrder, cancelWorkshopOrder, workshopOrderStatus, npcLonca } from "../../lib/game";
import { ITEMS } from "../../lib/world";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { useI18n, applyParams } from "../../lib/i18n";
import { professionNameL, placeName } from "../../lib/locale-data";
import { hap } from "../../lib/haptics";
import { playTap } from "../../lib/sound";
import { BackLabel, PageHeader, Pill, ScreenFresk } from "../../lib/ui";

// Tarifleri kategoriye ayır (görsel düzen için).
const CAT: Record<string, "food" | "arms" | "heal" | "wear"> = {
  un: "food", ekmek: "food", corba: "food", turfanda: "food", tuzlu_balik: "food", balli_corek: "food", yun_kaftan: "wear",
  bicak: "arms", kilic: "arms", celik_kilic: "arms", kalkan: "arms", deri_zirh: "arms",
  yay: "arms", savas_balta: "arms", zincir_zirh: "arms",
  iksir: "heal",
};
const CAT_ORDER: ("food" | "arms" | "heal" | "wear")[] = ["food", "arms", "heal", "wear"];
const CAT_TONE = { food: "#7FA66A", arms: C.emberSoft, heal: C.frost, wear: "#B08FBE" };
const CAT_ICON = { food: "ye", arms: "silah", heal: "saglik", wear: "wool" };
// Eşya ikonu — türüne göre (emoji yerine GameIcon).
function itmIcon(it: any): string {
  if (!it) return "menu";
  if (it.kind === "silah") return "silah";
  if (it.kind === "kalkan") return "kite";
  if (it.kind === "zirh") return "shield";
  if (it.kind === "baslik") return "hood";
  if (it.kind === "eldiven") return "fist";
  if (it.kind === "ayakkabi") return "boot";
  if (it.kind === "kiyafet") return "wool";
  if (it.heal) return "saglik";
  if (it.feed || it.kind === "yiyecek") return "ye";
  return "menu";
}

export default function Atolye() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { t, lang } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const skill = p.skills.crafting;
  const order = state.workshopOrder;
  const orderOffers = workshopOrderOffers(state);
  const orderStatus = workshopOrderStatus(state);
  const guild = npcLonca(p.profession);
  const orderBenefit = guild && p.faction === guild ? "cra.order.guildBenefit" : "cra.order.publicBenefit";

  const RecipeCard = ({ r }: { r: Recipe }) => {
    const tone = CAT_TONE[CAT[r.id]];
    const locked = skill < r.minSkill;
    const profLocked = !!r.prof && p.profession !== r.prof; // ustalık tarifi: kapının nedeni butonda yazsın
    const crafted = p.craft_turn === state.turn; // bu ay üretildi → tur dolana dek kapalı
    const able = canCraft(p, r) && !crafted;
    const inputs = Object.entries(r.inputs);
    return (
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: able ? tone + "55" : C.border, borderRadius: 5, padding: 13, marginBottom: 10 }}>
        {/* Üst: çıktı + zanaat şartı */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
          <View style={{ width: 44, height: 44, borderRadius: 5, backgroundColor: tone + "18", borderWidth: 1, borderColor: tone + "55", alignItems: "center", justifyContent: "center" }}>
            <GameIcon name={itmIcon(ITEMS[r.out])} size={22} color={tone} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 14, color: C.parchment }}>{t("it." + r.out)}{r.outQty > 1 ? ` ×${r.outQty}` : ""}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 }}>
              <GameIcon name={locked ? "hood" : "anvil"} size={10} color={locked ? C.blood : C.parchmentMuted} />
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 0.5, color: locked ? C.blood : C.parchmentMuted }}>
                {t("wsp.needSkill")}: {t("wsp.skillAbbr")}{r.minSkill} · {t("wsp.your")} {t("wsp.skillAbbr")}{skill}
              </Text>
            </View>
          </View>
        </View>

        {/* Malzemeler: var/gerek */}
        <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.goldDim, marginTop: 11, marginBottom: 6 }}>{t("wsp.materials").toUpperCase()}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {inputs.map(([id, q]) => {
            const have = p.inventory[id] || 0;
            const ok = have >= q;
            return (
              <View key={id} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: ok ? "rgba(127,166,106,0.12)" : "rgba(201,168,76,0.06)", borderWidth: 1, borderColor: ok ? "rgba(127,166,106,0.5)" : C.border, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 9 }}>
                <GameIcon name={itmIcon(ITEMS[id])} size={12} color={C.parchment} />
                <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchment }}>{t("it." + id)}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 13, color: ok ? C.sage : C.blood }}>{have}/{q}</Text>
              </View>
            );
          })}
        </View>

        {/* Üret butonu + durum */}
        <Pressable disabled={!able} onPress={() => { hap("success"); playTap(); apply((s) => craft(s, r.id)); }}
          style={{ marginTop: 12, paddingVertical: 11, borderRadius: 5, borderWidth: 1, alignItems: "center",
            borderColor: able ? tone + "88" : C.border, backgroundColor: able ? tone + "1F" : C.bg }}>
          <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: able ? tone : C.parchmentMuted }}>
            {able ? t("misc.craft") : profLocked ? applyParams(t("wsp.profOnly"), [professionNameL(r.prof!, lang)]) : crafted ? t("wsp.craftedTurn") : locked ? applyParams(t("wsp.locked"), [r.minSkill]) : t("wsp.noMat")}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <ScreenFresk style={{ paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <Pill text={`${t("skill.crafting")} ${skill}`} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 100 }}>
        <PageHeader kicker={t("scr.atolye")} title={t("scr.atolye")} sub={t("wsp.hint")} />

        {/* Bilgi: üretim zanaatı geliştirir */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(201,168,76,0.07)", borderWidth: 1, borderColor: C.border, borderRadius: 5, padding: 11, marginBottom: 14 }}>
          <GameIcon name="anvil" size={13} color={C.goldDim} />
          <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted }}>{t("wsp.gain")}.</Text>
        </View>

        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(201,168,76,0.38)", borderRadius: 6, padding: 13, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            <GameIcon name="scroll" size={17} color={C.gold} />
            <Text style={{ flex: 1, fontFamily: F.display, fontSize: 15, color: C.gold }}>{t("cra.order.title")}</Text>
            <Pill text={placeName(p.location_name, lang)} />
          </View>
          <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchmentMuted, lineHeight: 20, marginTop: 8 }}>{t("cra.order.hint")}</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 14, color: C.parchmentMuted, lineHeight: 19, marginTop: 6 }}>{t("cra.order.terms")}</Text>

          {order ? (() => {
            const recipe = RECIPES.find((r) => r.id === order.recipeId);
            let statusText = t("cra.order.needCraft");
            if (orderStatus === "away") statusText = applyParams(t("cra.order.returnToCity"), [placeName(order.city, lang)]);
            else if (orderStatus === "craftOther") statusText = t("cra.order.usedWorkshop");
            else if (orderStatus === "stock") statusText = t("cra.order.needStock");
            else if (orderStatus === "confined") statusText = t("cra.order.confined");
            else if (orderStatus === "ready") statusText = t("cra.order.ready");
            return <View style={{ backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 5, padding: 11, marginTop: 11 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 0.6, color: C.goldDim }}>{t("cra.order.active")}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchment, marginTop: 5 }}>{t("it." + order.good)} · {placeName(order.city, lang)}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.gold, marginTop: 4 }}>{applyParams(t("cra.order.pay"), [order.pay])}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.sage, marginTop: 3 }}>{t(orderBenefit)}</Text>
              {recipe ? <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchmentMuted, lineHeight: 20, marginTop: 7 }}>{Object.entries(recipe.inputs).map(([id, qty]) => `${qty} ${t("it." + id)}`).join(" · ")}</Text> : null}
              <Text style={{ fontFamily: F.serifItalic, fontSize: 14, color: C.parchmentMuted, lineHeight: 19, marginTop: 6 }}>{statusText}</Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, lineHeight: 18, marginTop: 4 }}>{t("cra.order.noDeadline")}</Text>
              {orderStatus === "ready" ? <Pressable accessibilityRole="button" accessibilityLabel={t("cra.order.deliver")} onPress={() => { hap("success"); playTap(); apply((s) => deliverWorkshopOrder(s)); }} style={{ marginTop: 10, paddingVertical: 14, borderRadius: 5, borderWidth: 1, borderColor: "rgba(201,168,76,0.7)", alignItems: "center", backgroundColor: "rgba(201,168,76,0.16)" }}>
                <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 0.7, color: C.gold }}>{t("cra.order.deliver")}</Text>
              </Pressable> : null}
              <Pressable accessibilityRole="button" accessibilityLabel={t("cra.order.cancel")} onPress={() => { hap("tap"); apply((s) => cancelWorkshopOrder(s)); }} style={{ marginTop: 8, paddingVertical: 14, alignItems: "center" }}>
                <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 0.5, color: C.parchmentMuted }}>{t("cra.order.cancel")}</Text>
              </Pressable>
            </View>;
          })() : orderOffers.length ? orderOffers.map((offer) => <View key={offer.recipeId} style={{ backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 5, padding: 11, marginTop: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <GameIcon name={itmIcon(ITEMS[offer.good])} size={16} color={C.goldDim} />
              <Text style={{ flex: 1, fontFamily: F.display, fontSize: 14, color: C.parchment }}>{t("it." + offer.good)}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{applyParams(t("cra.order.pay"), [offer.pay])}</Text>
            </View>
            <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchmentMuted, lineHeight: 20, marginTop: 6 }}>{Object.entries(offer.inputs).map(([id, qty]) => `${qty} ${t("it." + id)}`).join(" · ")}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.sage, marginTop: 4 }}>{t(orderBenefit)}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`${t("cra.order.accept")}: ${t("it." + offer.good)}`} onPress={() => { hap("tap"); playTap(); apply((s) => acceptWorkshopOrder(s, offer.recipeId)); }} style={{ marginTop: 9, paddingVertical: 14, borderRadius: 5, borderWidth: 1, borderColor: "rgba(201,168,76,0.55)", alignItems: "center", backgroundColor: "rgba(201,168,76,0.10)" }}>
              <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 0.6, color: C.gold }}>{t("cra.order.accept")}</Text>
            </Pressable>
          </View>) : <Text style={{ fontFamily: F.serifItalic, fontSize: 14, color: C.parchmentMuted, marginTop: 10 }}>{t("cra.order.empty")}</Text>}
        </View>

        {CAT_ORDER.map((cat) => {
          const list = RECIPES.filter((r) => CAT[r.id] === cat);
          if (list.length === 0) return null;
          return (
            <View key={cat} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <GameIcon name={CAT_ICON[cat]} size={14} color={CAT_TONE[cat]} />
                <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: CAT_TONE[cat] }}>{t("wsp.cat." + cat).toUpperCase()}</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: CAT_TONE[cat] + "33" }} />
              </View>
              {list.map((r) => <RecipeCard key={r.id} r={r} />)}
            </View>
          );
        })}
      </ScrollView>
    </ScreenFresk>
  );
}
