// Kasaba siparişi: tek parşömen ilan. Açık teklifler arasında seçilir; kabul edilen sipariş mühürlü sözleşmeye döner.
import { Fragment, useState, type ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { GameIcon } from "../../icons";
import { GameButton, PressableScale } from "../../ui";
import { DesignPressable } from "../../design-pressable";
import { hap } from "../../haptics";
import { playTap } from "../../sound";
import { RECIPES, type WorkshopOrder, type WorkshopOrderOffer } from "../../game";
import { C, F } from "../../theme";
import { PARS, ItemDisc, InputChip, SectionTitle, Tag, itemIcon, dir, align } from "./parcalar";

export type OrderStatus = "none" | "confined" | "away" | "craftOther" | "craft" | "stock" | "ready";

// Parşömen kâğıdı: sıcak degrade, yanık kenar ve ince iç çizgi.
function Parchment({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[{ borderRadius: 6, borderWidth: 1, borderColor: PARS.edge, overflow: "hidden", backgroundColor: PARS.mid, shadowColor: "#000", shadowOpacity: 0.55, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 5 }, style]}>
    <LinearGradient pointerEvents="none" colors={[PARS.hi, PARS.mid, PARS.lo]} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.35, y: 1 }} style={StyleSheet.absoluteFill} />
    <LinearGradient pointerEvents="none" colors={["rgba(120,80,30,0.22)", "rgba(120,80,30,0)", "rgba(120,80,30,0)", "rgba(120,80,30,0.28)"]} locations={[0, 0.1, 0.88, 1]} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={{ position: "absolute", top: 4, left: 4, right: 4, bottom: 4, borderWidth: 1, borderColor: PARS.edge + "70", borderRadius: 3 }} />
    {children}
  </View>;
}

// Balmumu mühür.
function Seal({ icon, size = 44, tilt = -8 }: { icon: string; size?: number; tilt?: number }) {
  return <View accessible={false} style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", alignItems: "center", justifyContent: "center", transform: [{ rotate: `${tilt}deg` }], shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 3, elevation: 3 }}>
    <LinearGradient colors={[PARS.sealHi, PARS.seal, "#5E1810"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
    <View style={{ position: "absolute", top: 4, left: 4, right: 4, bottom: 4, borderRadius: size / 2, borderWidth: 1, borderColor: "rgba(255,210,180,0.35)" }} />
    <View><GameIcon name={icon} size={Math.round(size * 0.46)} color="#F3D9B8" /></View>
  </View>;
}

// Mürekkep damgası düğme (parşömen üstünde): koyu zemin, açık yazı, basınca yaylanır.
function StampButton({ label, a11y, icon, onPress, rtl }: { label: string; a11y?: string; icon: string; onPress: () => void; rtl: boolean }) {
  return <PressableScale accessibilityLabel={a11y || label} onPress={onPress} style={{ marginTop: 12, minHeight: 48, borderRadius: 6, borderWidth: 1, borderColor: PARS.ink, backgroundColor: "#3A2814", alignItems: "center", justifyContent: "center", paddingHorizontal: 12, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
    <View style={{ flexDirection: dir(rtl), alignItems: "center", gap: 8 }}>
      <View><GameIcon name={icon} size={16} color={PARS.hi} /></View>
      <Text style={{ fontFamily: F.display, fontSize: 14, letterSpacing: 0.6, color: PARS.hi }}>{label}</Text>
    </View>
  </PressableScale>;
}

// Sipariş adımları: Kabul → Üretim → Teslim.
function Steps({ current, labels, rtl, warn }: { current: number; labels: string[]; rtl: boolean; warn: boolean }) {
  return <View style={{ flexDirection: dir(rtl), alignItems: "flex-start", marginTop: 14 }}>
    {labels.map((label, i) => {
      const done = i < current, active = i === current;
      const ring = done ? PARS.green : active ? (warn ? PARS.red : PARS.seal) : PARS.edge;
      return <Fragment key={label}>
        <View accessible accessibilityLabel={`${i + 1}. ${label}`} accessibilityState={{ selected: active }} style={{ alignItems: "center", width: 78 }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: ring, backgroundColor: done ? PARS.green : active ? ring + "22" : "transparent", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: F.display, fontSize: 13, color: done ? PARS.hi : ring }}>{i + 1}</Text>
          </View>
          <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 12, marginTop: 4, color: active ? PARS.ink : PARS.inkSoft }}>{label}</Text>
        </View>
        {i < labels.length - 1 ? <View style={{ flex: 1, height: 2, marginTop: 12, marginHorizontal: -18, backgroundColor: done ? PARS.green : PARS.edge + "66" }} /> : null}
      </Fragment>;
    })}
  </View>;
}

const Rule = () => <LinearGradient pointerEvents="none" start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={[PARS.edge + "00", PARS.edge, PARS.edge + "00"]} style={{ height: 1, marginVertical: 12 }} />;

type Props = {
  rtl: boolean; reduced: boolean; t: (k: string) => string; fmt: (k: string, p: (string | number)[]) => string;
  cityLabel: string; order?: WorkshopOrder; offers: WorkshopOrderOffer[]; status: OrderStatus; benefit: string;
  inventory: Record<string, number>; placeLabel: (city: string) => string;
  onAccept: (offer: WorkshopOrderOffer) => void; onDeliver: () => void; onCancel: () => void; onShowRecipe?: () => void;
};

export function OrderBoard(props: Props) {
  const { rtl, reduced, t, cityLabel, order, offers } = props;
  return <View style={{ marginBottom: 22 }}>
    <SectionTitle rtl={rtl} title={t("cra.order.title")} right={<Tag text={cityLabel} icon="house" />} />
    <Animated.View entering={reduced ? undefined : FadeInDown.delay(60).duration(320)}>
      <Parchment>
        <View style={{ padding: 14 }}>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 20, color: PARS.inkSoft, textAlign: align(rtl) }}>{t("cra.order.hint")}</Text>
          {order ? <Contract {...props} order={order} />
            : offers.length ? <Offers {...props} />
              : <View style={{ flexDirection: dir(rtl), alignItems: "center", gap: 10, marginTop: 12 }}>
                <View><GameIcon name="scroll" size={20} color={PARS.inkSoft} /></View>
                <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 16, lineHeight: 21, color: PARS.ink, textAlign: align(rtl) }}>{t("cra.order.empty")}</Text>
              </View>}
          <Rule />
          <View style={{ flexDirection: dir(rtl), gap: 8, alignItems: "flex-start" }}>
            <View style={{ marginTop: 2 }}><GameIcon name="scales" size={14} color={PARS.inkSoft} /></View>
            <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: PARS.inkSoft, textAlign: align(rtl) }}>{t("cra.order.terms")}</Text>
          </View>
        </View>
      </Parchment>
    </Animated.View>
  </View>;
}

// Açık teklifler: üstte seçim jetonları, altta seçilen ilanın ayrıntısı ve kabul damgası.
function Offers({ rtl, reduced, t, fmt, offers, benefit, inventory, onAccept }: Props) {
  const [sel, setSel] = useState(0);
  const idx = Math.min(sel, offers.length - 1);
  const offer = offers[idx];
  const name = t("it." + offer.good);
  return <View>
    {offers.length > 1 ? <View accessibilityRole="tablist" style={{ flexDirection: dir(rtl), gap: 6, marginTop: 12 }}>
      {offers.map((o, i) => {
        const on = i === idx, nm = t("it." + o.good);
        return <DesignPressable key={o.recipeId} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`${nm}, ${fmt("cra.order.pay", [o.pay])}`}
          onPress={() => { if (on) return; hap("selection"); playTap(); setSel(i); }}
          style={({ pressed }) => ({ flex: 1, minHeight: 66, borderRadius: 6, borderWidth: on ? 1.5 : 1, borderColor: on ? PARS.seal : PARS.edge + "99", backgroundColor: on ? "rgba(142,42,30,0.12)" : pressed ? "rgba(43,29,15,0.12)" : "rgba(255,250,235,0.32)", alignItems: "center", justifyContent: "center", paddingVertical: 7, paddingHorizontal: 3 })}>
          <View><GameIcon name={itemIcon(o.good)} size={20} color={on ? PARS.seal : PARS.inkSoft} /></View>
          <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 13, marginTop: 3, color: PARS.ink }}>{nm}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <View><GameIcon name="coins" size={12} color={PARS.seal} /></View>
            <Text style={{ fontFamily: F.display, fontSize: 12, color: PARS.seal }}>{o.pay}</Text>
          </View>
        </DesignPressable>;
      })}
    </View> : null}
    <Animated.View key={offer.recipeId} entering={reduced ? undefined : FadeIn.duration(240)} style={{ marginTop: 13 }}>
      <View style={{ flexDirection: dir(rtl), alignItems: "center", gap: 12 }}>
        <ItemDisc id={offer.good} tone={PARS.ink} size={52} light />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: F.display, fontSize: 19, lineHeight: 24, color: PARS.ink, textAlign: align(rtl) }}>{name}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 21, color: PARS.seal, textAlign: align(rtl) }}>{fmt("cra.order.pay", [offer.pay])}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: PARS.green, textAlign: align(rtl) }}>{t(benefit)}</Text>
        </View>
        <Seal icon="coins" size={44} tilt={rtl ? 8 : -8} />
      </View>
      <View style={{ flexDirection: dir(rtl), flexWrap: "wrap", gap: 6, marginTop: 11 }}>
        {Object.entries(offer.inputs).map(([id, q]) => <InputChip key={id} id={id} name={t("it." + id)} have={inventory[id] || 0} need={q} rtl={rtl} light />)}
      </View>
      <StampButton rtl={rtl} icon="scroll" label={t("cra.order.accept")} a11y={`${t("cra.order.accept")}: ${name}`} onPress={() => onAccept(offer)} />
    </Animated.View>
  </View>;
}

function Contract({ rtl, t, fmt, order, status, benefit, inventory, placeLabel, onDeliver, onCancel, onShowRecipe }: Props & { order: WorkshopOrder }) {
  const name = t("it." + order.good);
  let statusText = t("cra.order.needCraft");
  if (status === "away") statusText = fmt("cra.order.returnToCity", [placeLabel(order.city)]);
  else if (status === "craftOther") statusText = t("cra.order.usedWorkshop");
  else if (status === "stock") statusText = t("cra.order.needStock");
  else if (status === "confined") statusText = t("cra.order.confined");
  else if (status === "ready") statusText = t("cra.order.ready");
  const warn = status === "away" || status === "confined";
  const statusTone = status === "ready" ? PARS.green : warn ? PARS.red : PARS.ink;
  const inputs = Object.entries(RECIPES.find((r) => r.id === order.recipeId)?.inputs || {}); // sözleşme tarifin girdilerini kaydetmez
  return <View>
    <View style={{ flexDirection: dir(rtl), alignItems: "center", gap: 10, marginTop: 10 }}>
      <Text style={{ flex: 1, fontFamily: F.display, fontSize: 13, letterSpacing: 1.2, color: PARS.seal, textAlign: align(rtl) }}>{t("cra.order.active")}</Text>
      <Seal icon="anvil" size={46} tilt={rtl ? 8 : -8} />
    </View>
    <View style={{ flexDirection: dir(rtl), alignItems: "center", gap: 12, marginTop: 2 }}>
      <ItemDisc id={order.good} tone={PARS.ink} size={58} light />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: F.display, fontSize: 20, lineHeight: 25, color: PARS.ink, textAlign: align(rtl) }}>{name}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: PARS.inkSoft, textAlign: align(rtl) }}>{placeLabel(order.city)}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 21, color: PARS.seal, marginTop: 2, textAlign: align(rtl) }}>{fmt("cra.order.pay", [order.pay])}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: PARS.green, textAlign: align(rtl) }}>{t(benefit)}</Text>
      </View>
    </View>
    {inputs.length && status !== "ready" ? <View style={{ flexDirection: dir(rtl), flexWrap: "wrap", gap: 6, marginTop: 12 }}>
      {inputs.map(([id, q]) => <InputChip key={id} id={id} name={t("it." + id)} have={inventory[id] || 0} need={q} rtl={rtl} light />)}
    </View> : null}
    <Steps rtl={rtl} warn={warn} current={status === "ready" ? 2 : 1} labels={[t("atolye.step.accept"), t("atolye.step.craft"), t("atolye.step.deliver")]} />
    <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.serifItalic, fontSize: 16, lineHeight: 22, color: statusTone, marginTop: 12, textAlign: align(rtl) }}>{statusText}</Text>
    <Text style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: PARS.inkSoft, marginTop: 4, textAlign: align(rtl) }}>{t("cra.order.noDeadline")}</Text>
    {status === "ready" ? <GameButton rtl={rtl} icon="coins" accessibilityLabel={t("cra.order.deliver")} onPress={onDeliver} style={{ marginTop: 12 }}>
      <Text style={{ fontFamily: F.display, fontSize: 15, letterSpacing: 0.6, color: C.inkOnGold, textAlign: "center" }}>{t("cra.order.deliver")}</Text>
    </GameButton> : onShowRecipe ? <StampButton rtl={rtl} icon="anvil" label={t("atolye.showRecipe")} onPress={onShowRecipe} /> : null}
    <PressableScale accessibilityLabel={t("cra.order.cancel")} onPress={onCancel} style={{ marginTop: 6, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 0.5, color: PARS.inkSoft, textDecorationLine: "underline" }}>{t("cra.order.cancel")}</Text>
    </PressableScale>
  </View>;
}
