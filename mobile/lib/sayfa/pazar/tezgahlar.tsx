// Mal tezgâhları: sekmeye göre dükkânlar, her malda fiyat etiketi, elindeki adet, AL / SAT ve terazi (pazarlık).
import { View, Text } from "react-native";
import type { GameState } from "../../game";
import { buyItem, buyPrice, sellItem, marketPrice, goodPriceMult, bestQualityTier, QUALITY_LABEL, goodMarketTag, goodTrend } from "../../game";
import { marketGoods, locSeed } from "../../world";
import { useI18n, applyParams } from "../../i18n";
import { hap } from "../../haptics";
import { playCoin } from "../../sound";
import { C, F } from "../../theme";
import { Madalyon, TicaretDugmesi, FiyatYonu, Cip, Tezgah } from "./parcalar";

export type Mal = ReturnType<typeof marketGoods>[number];

// Pazar malı ikonu — malın kendi ikonu; yoksa türüne göre (emoji yerine GameIcon).
export function malIkonu(g: { kind?: string; heal?: number; feed?: number; icon?: string }): string {
  if (g.icon) return g.icon;
  switch (g.kind) {
    case "taki": return "gems";
    case "silah": return "silah";
    case "kalkan": return "kite";
    case "zirh": return "shield";
    case "baslik": return "hood";
    case "eldiven": return "fist";
    case "ayakkabi": return "boot";
    case "kiyafet": return "wool";
  }
  if (g.heal) return "saglik";
  if (g.feed || g.kind === "yiyecek") return "ye";
  return "amphora";
}

// Tezgâhlar — mallar türüne göre dükkânlara ayrılır; sekme başına bir ya da iki dükkân.
export const DUKKANLAR = {
  food: [{ kinds: ["yiyecek"], icon: "bread", key: "paz.stall.food", tone: C.sage }],
  goods: [
    { kinds: ["esya"], icon: "amphora", key: "paz.stall.goods", tone: C.gold },
    { kinds: ["kiyafet", "taki"], icon: "wool", key: "paz.stall.attire", tone: C.rose },
  ],
  arms: [
    { kinds: ["silah"], icon: "crossed-swords", key: "paz.stall.arms", tone: C.ember },
    { kinds: ["zirh", "kalkan", "baslik", "eldiven", "ayakkabi"], icon: "shield", key: "paz.stall.armor", tone: C.azure },
  ],
} as const;

export function pazarMallari(state: GameState) {
  const econ = state.econ || 1;
  // buy = GERÇEK alış fiyatı (tüccar/pazarlıkçı indirimi dahil) → gösterim + "yeterli akçe" kontrolü buyItem ile aynı.
  return marketGoods(locSeed(state.player.location_name)).map((g) => {
    const m = goodPriceMult(state, g.id);
    return { ...g, buy: buyPrice(state, g.id), sell: Math.max(1, Math.round(marketPrice(g.sell, econ) * m)) };
  });
}

function MalSatiri({ g, tone, first, state, apply, onHaggle, rtl }: {
  g: Mal & { buy: number; sell: number }; tone: string; first: boolean; state: GameState; apply: (fn: (s: GameState) => GameState) => void; onHaggle: (g: Mal, sell: boolean) => void; rtl: boolean;
}) {
  const { t } = useI18n();
  const p = state.player;
  const have = p.inventory[g.id] || 0;
  const name = t("it." + g.id);
  const cantBuy = p.money < g.buy;
  const young = p.age < 13;
  // Pazarlık daha DÜŞÜK fiyata inebilir → tam fiyatı karşılayamasan da aç (perde kendi 'yeterli akçe'sini kontrol eder).
  const buyHaggleOff = young || p.bargain_buy_turn === state.turn || p.money < Math.round(g.buy * 0.6);
  const sellHaggleOff = young || p.bargain_sell_turn === state.turn;
  const tag = goodMarketTag(state, p.location_name, g.id);
  const trend = goodTrend(state, p.location_name, g.id);
  const prev = p.priceMem?.[p.location_name + "|" + g.id];
  const bq = have > 0 ? bestQualityTier(p, g.id) : "siradan";
  const tagTone = tag === "bol" ? C.sage : tag === "kit" ? C.ember : C.parchmentDim;
  const row = rtl ? "row-reverse" as const : "row" as const;
  return <View style={{ paddingVertical: 11, borderTopWidth: first ? 0 : 1, borderTopColor: C.border + "AA" }}>
    <View style={{ flexDirection: row, alignItems: "center", gap: 10 }}>
      <Madalyon icon={malIkonu(g)} tone={tone} size={42} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: F.serif, fontSize: 17, lineHeight: 21, color: C.parchment, textAlign: rtl ? "right" : "left" }}>{name}</Text>
        {(g.power || g.defense || g.charisma || g.prestige || g.wclass) ? (
          <View style={{ flexDirection: row, flexWrap: "wrap", alignItems: "center", gap: 5, marginTop: 3 }}>
            {g.power ? <Cip icon="silah" text={"+" + g.power} tone={C.ember} /> : null}
            {g.defense ? <Cip icon="shield" text={"+" + g.defense} tone={C.azure} /> : null}
            {g.charisma ? <Cip icon="karizma" text={"+" + g.charisma} tone={C.ember} /> : null}
            {g.prestige ? <Cip icon="orgutler" text={"+" + g.prestige} tone={C.gold} /> : null}
            {g.wclass ? <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 0.5, color: C.parchmentDim, textTransform: "uppercase" }}>{t("wc." + g.wclass)}{g.twoHanded ? " · 2E" : ""}</Text> : null}
          </View>
        ) : null}
        <View style={{ flexDirection: row, flexWrap: "wrap", alignItems: "center", gap: 5, marginTop: 4 }}>
          <Cip icon="backpack" text={`${t("paz.have")} ${have}`} tone={have > 0 ? C.goldBright : C.parchmentMuted} filled={have > 0} />
          {bq !== "siradan" ? <Cip icon="star" text={QUALITY_LABEL[bq]} tone={bq === "kusurlu" ? C.blood : C.gold} /> : null}
          {tag ? <Cip text={t("paz." + tag)} tone={tagTone} /> : null}
          {prev != null && prev !== g.buy ? <Text style={{ fontFamily: F.serifItalic, fontSize: 14, color: g.buy > prev ? C.blood : C.sage }}>{t("paz.prev")} {prev}⚜</Text> : null}
        </View>
      </View>
      {/* Fiyat etiketi: alış fiyatı + yönü */}
      <View style={{ alignItems: "center", minWidth: 54, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 7, borderWidth: 1, borderColor: cantBuy ? C.blood + "66" : C.goldDim + "AA", backgroundColor: "rgba(238,223,194,0.06)" }}>
        <View style={{ position: "absolute", top: 3, width: 5, height: 5, borderRadius: 3, backgroundColor: C.bg, borderWidth: 1, borderColor: C.goldDim }} />
        <Text style={{ marginTop: 5, fontFamily: F.display, fontSize: 18, lineHeight: 23, color: cantBuy ? C.blood : C.goldBright }}>{g.buy}<Text style={{ fontSize: 13 }}> ⚜</Text></Text>
        <FiyatYonu dir={trend} label={t(trend > 0 ? "pazar.trendUp" : "pazar.trendDown")} />
      </View>
    </View>
    <View style={{ flexDirection: row, gap: 8, marginTop: 10 }}>
      <TicaretDugmesi rtl={rtl} verb={t("misc.buy")} tone={C.gold} disabled={cantBuy} haggleDisabled={buyHaggleOff}
        a11y={`${t("misc.buy")} ${name}, ${g.buy} ⚜`} haggleA11y={applyParams(t("pazar.haggleOn"), [name])}
        onPress={() => { hap("tap"); playCoin(); apply((s) => buyItem(s, g.id)); }} onHaggle={() => onHaggle(g, false)} />
      {have > 0 ? (
        <TicaretDugmesi rtl={rtl} verb={t("misc.sell")} price={g.sell} tone={C.sage} disabled={false} haggleDisabled={sellHaggleOff}
          a11y={`${t("misc.sell")} ${name}, ${g.sell} ⚜`} haggleA11y={applyParams(t("pazar.sellHaggleOn"), [name])}
          onPress={() => { hap("tap"); playCoin(); apply((s) => sellItem(s, g.id)); }} onHaggle={() => onHaggle(g, true)} />
      ) : <View style={{ flex: 1 }} />}
    </View>
  </View>;
}

export function Tezgahlar({ tab, state, apply, onHaggle, rtl }: {
  tab: keyof typeof DUKKANLAR; state: GameState; apply: (fn: (s: GameState) => GameState) => void; onHaggle: (g: Mal, sell: boolean) => void; rtl: boolean;
}) {
  const { t } = useI18n();
  const goods = pazarMallari(state);
  return <>
    {DUKKANLAR[tab].map((d) => {
      const items = goods.filter((g) => (d.kinds as readonly string[]).includes(g.kind || "esya"));
      if (!items.length) return null;
      return <Tezgah key={d.key} title={t(d.key)} icon={d.icon} tone={d.tone} count={items.length} rtl={rtl}>
        {items.map((g, i) => <MalSatiri key={g.id} g={g} tone={d.tone} first={i === 0} state={state} apply={apply} onHaggle={onHaggle} rtl={rtl} />)}
      </Tezgah>;
    })}
  </>;
}
