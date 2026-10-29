// Kuşam sekmesi: figürün çevresinde altı cenk yuvası, altta kıyafet ve takı; seçili yuvanın ayrıntısı,
// cenk/sosyal göstergeleri ve heybe. Motor çağrıları eski ekranla aynıdır (equipItem, unequipItem, useItem).
import { useState } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { DesignPressable as Pressable } from "../../design-pressable";
import { useGame } from "../../store";
import { useI18n } from "../../i18n";
import { hap } from "../../haptics";
import { GameIcon } from "../../icons";
import { ITEMS } from "../../world";
import { equipItem, unequipItem, useItem, combatPower, armorDefense, attireScore, socialPresence, martialLoad, isTwoHanded, equippedQualityMult, type QualityTier, type EquipSlot } from "../../game";
import { C, F } from "../../theme";
import { Pano, Giris, Dugme, KR, yon } from "./parca";
import { KusamFigur } from "./figur";

type Yuva = EquipSlot;
type Meta = { slot: Yuva; icon: string; labelKey: string; field?: "power" | "defense" };

// Figürün solunda baş-gövde-el, sağında silah-kalkan-ayak; altta kıyafet ve takı.
const SOL: Meta[] = [
  { slot: "baslik", icon: "hood", labelKey: "char.helmet", field: "defense" },
  { slot: "zirh", icon: "shield", labelKey: "char.armor", field: "defense" },
  { slot: "eldiven", icon: "fist", labelKey: "char.gloves", field: "defense" },
];
const SAG: Meta[] = [
  { slot: "silah", icon: "silah", labelKey: "char.weapon", field: "power" },
  { slot: "kalkan", icon: "kite", labelKey: "char.shield", field: "defense" },
  { slot: "ayakkabi", icon: "boot", labelKey: "char.boots", field: "defense" },
];
const ALT: Meta[] = [
  { slot: "kiyafet", icon: "wool", labelKey: "char.attire" },
  { slot: "taki", icon: "gems", labelKey: "karakter.taki" },
];
const SIRA: Yuva[] = ["silah", "zirh", "baslik", "kalkan", "eldiven", "ayakkabi", "kiyafet", "taki"];

// Nitelik rengi (oyunlardaki nadirlik dili): kusurlu gül kurusu, iyi adaçayı, usta işi parlak altın.
const NITELIK_TON: Record<QualityTier, string> = { kusurlu: C.roseDim, siradan: KR.frame, iyi: C.sage, usta_isi: C.goldBright };

// Heybe eşya ikonu — eşya türüne göre.
function itemIcon(it: any): string {
  if (!it) return "menu";
  if (it.kind === "silah") return "silah";
  if (it.kind === "zirh") return "shield";
  if (it.kind === "kalkan") return "kite";
  if (it.kind === "baslik") return "hood";
  if (it.kind === "eldiven") return "fist";
  if (it.kind === "ayakkabi") return "boot";
  if (it.kind === "kiyafet") return "wool";
  if (it.kind === "taki") return it.icon || "gems";
  if (it.heal) return "saglik";
  if (it.feed) return "ye";
  return "menu";
}

export function KusamSekmesi() {
  const { state, apply } = useGame();
  const { t, lang } = useI18n();
  const { width } = useWindowDimensions();
  const { rtl, row, ta } = yon(lang);
  const p = state!.player;
  const eq = p.equipped || {};
  const ilkDolu = SIRA.find((s) => !!eq[s]) ?? null;
  const [secili, setSecili] = useState<Yuva | null>(ilkDolu);
  const dar = width < 360;
  const yuvaW = dar ? 74 : 90;
  const figH = dar ? 300 : 318;
  const twoHanded = isTwoHanded(eq.silah);
  const q = (s: Yuva) => (p.equipped_q?.[s] ?? "siradan") as QualityTier;
  const qAd = (tier: QualityTier) => t("karakter.q." + tier);
  const bonusOf = (m: Meta) => {
    const id = eq[m.slot]; const it = id ? ITEMS[id] : null;
    if (!it || !m.field) return 0;
    return Math.round((m.field === "power" ? (it.power || 0) : (it.defense || 0)) * equippedQualityMult(p, m.slot));
  };
  const at = attireScore(p);

  const yuva = (m: Meta, wide = false) => {
    const id = eq[m.slot] ?? null;
    const label = t(m.labelKey);
    if (m.slot === "kalkan" && twoHanded) {
      return <View key={m.slot} accessible accessibilityLabel={`${label}: ${t("char.twoHandTag")}`} style={{ width: yuvaW, alignItems: "center", paddingVertical: 4, opacity: 0.6 }}>
        <View style={{ width: 54, height: 54, borderRadius: 9, borderWidth: 1, borderStyle: "dashed", borderColor: C.border, alignItems: "center", justifyContent: "center", backgroundColor: KR.well }}>
          <GameIcon name={m.icon} size={24} color={C.parchmentMuted} />
          <View style={{ position: "absolute", width: 60, height: 1.5, backgroundColor: C.blood, transform: [{ rotate: "-40deg" }] }} />
        </View>
        <Text numberOfLines={1} style={{ marginTop: 5, fontFamily: F.display, fontSize: 10.5, color: C.parchmentMuted }}>{label}</Text>
        <Text numberOfLines={2} style={{ fontFamily: F.serifItalic, fontSize: 12.5, lineHeight: 15, color: C.parchmentMuted, textAlign: "center" }}>{t("char.twoHandTag")}</Text>
      </View>;
    }
    const on = secili === m.slot, tone = id ? NITELIK_TON[q(m.slot)] : C.border, bonus = bonusOf(m);
    const ikon = m.slot === "taki" && id ? (ITEMS[id]?.icon || "gems") : m.icon;
    const kutu = <View style={{ width: wide ? 50 : 54, height: wide ? 50 : 54, borderRadius: 9, borderWidth: on ? 2 : 1.2, borderStyle: id ? "solid" : "dashed", borderColor: on ? C.goldBright : tone, alignItems: "center", justifyContent: "center", backgroundColor: id ? "rgba(201,162,78,0.13)" : KR.well, shadowColor: C.goldBright, shadowOpacity: on ? 0.55 : 0, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } }}>
      <GameIcon name={ikon} size={wide ? 24 : 26} color={id ? C.gold : C.parchmentMuted} />
      {bonus > 0 ? <View style={{ position: "absolute", top: -7, right: -9, minWidth: 24, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#120C06", borderWidth: 1, borderColor: m.field === "power" ? C.ember : C.azure }}>
        <Text style={{ fontFamily: F.display, fontSize: 10.5, lineHeight: 13, color: m.field === "power" ? C.ember : C.frost }}>+{bonus}</Text>
      </View> : null}
    </View>;
    const ad = id ? t("it." + id) : "—";
    return <Pressable key={m.slot} accessibilityRole="button" accessibilityLabel={`${label}: ${id ? ad : t("karakter.bosYuva")}`} accessibilityState={{ selected: on }} onPress={() => { hap("selection"); setSecili(m.slot); }}
      style={({ pressed }) => (wide
        ? { flex: 1, flexDirection: row, alignItems: "center", gap: 9, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: on ? C.gold : C.border, backgroundColor: on ? "rgba(201,162,78,0.08)" : "rgba(8,5,2,0.35)", transform: [{ scale: pressed ? 0.97 : 1 }] }
        : { width: yuvaW, alignItems: "center", justifyContent: "flex-start", paddingVertical: 4, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
      {kutu}
      <View style={wide ? { flex: 1, minWidth: 0 } : { alignItems: "center", maxWidth: "100%" }}>
        <Text numberOfLines={1} style={{ marginTop: wide ? 0 : 5, fontFamily: F.display, fontSize: 10.5, letterSpacing: 0.3, color: C.parchmentMuted, textAlign: wide ? ta : "center" }}>{label}</Text>
        <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 15.5, color: id ? C.parchment : C.parchmentMuted, textAlign: wide ? ta : "center" }}>{ad}</Text>
      </View>
    </Pressable>;
  };

  // Seçili yuvanın ayrıntısı: ad, nitelik, katkı, silah sınıfı ve "çıkar".
  const ayrinti = (() => {
    if (!secili) return <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 20, color: C.parchmentMuted, textAlign: "center" }}>{t("karakter.yuvaIpucu")}</Text>;
    const m = [...SOL, ...SAG, ...ALT].find((x) => x.slot === secili)!;
    const id = eq[secili] ?? null;
    const it = id ? ITEMS[id] : null;
    if (!id) return <View style={{ flexDirection: row, alignItems: "center", gap: 10 }}>
      <GameIcon name={m.icon} size={22} color={C.parchmentMuted} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchmentDim, textAlign: ta }}>{t(m.labelKey)}</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 20, color: C.parchmentMuted, textAlign: ta }}>{secili === "kiyafet" ? t("char.attireNone") : secili === "taki" ? t("char.jewelryNone") : t("karakter.bosYuva")}</Text>
      </View>
    </View>;
    const tier = q(secili), bonus = bonusOf(m);
    const parcalar = [t(m.labelKey)];
    if (bonus > 0) parcalar.push(`+${bonus} ${t(m.field === "power" ? "karakter.cenkGucu" : "karakter.savunma")}`);
    if (tier !== "siradan") parcalar.push(qAd(tier));
    const sinif = secili === "silah" && it?.wclass ? it.wclass : null;
    const aciklama = sinif ? t("wc." + sinif + ".d") : secili === "kiyafet" ? t("char.attireHint") : secili === "taki" ? t("char.jewelryHint") : null;
    return <View style={{ gap: 6 }}>
      <View style={{ flexDirection: row, alignItems: "center", gap: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 8, borderWidth: 1.2, borderColor: NITELIK_TON[tier], alignItems: "center", justifyContent: "center", backgroundColor: "rgba(201,162,78,0.12)" }}>
          <GameIcon name={secili === "taki" ? (it?.icon || "gems") : m.icon} size={21} color={C.gold} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 16.5, lineHeight: 20, color: C.goldBright, textAlign: ta }}>{t("it." + id)}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 11.5, lineHeight: 15, color: C.parchmentMuted, textAlign: ta }}>{parcalar.join(" · ")}</Text>
          {sinif ? <Text style={{ fontFamily: F.display, fontSize: 11.5, lineHeight: 15, color: C.ember, textAlign: ta }}>{t("wc." + sinif)}</Text> : null}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`${t("misc.remove")}: ${t("it." + id)}`} onPress={() => { hap("tap"); apply((s) => unequipItem(s, secili)); }}
          style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 12, borderRadius: 7, borderWidth: 1, borderColor: "rgba(200,64,64,0.55)", backgroundColor: pressed ? "rgba(200,64,64,0.18)" : "rgba(200,64,64,0.08)", alignItems: "center", justifyContent: "center" })}>
          <Text style={{ fontFamily: F.display, fontSize: 12.5, color: "#E8796A" }}>{t("misc.remove")}</Text>
        </Pressable>
      </View>
      {aciklama ? <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: ta }}>{aciklama}</Text> : null}
    </View>;
  })();

  const gosterge = (icon: string, label: string, value: string, tone: string, sep: boolean) => (
    <View key={label} accessible accessibilityLabel={`${label}: ${value}`} style={{ flex: 1, minWidth: 0, alignItems: "center", gap: 2, paddingHorizontal: 2, borderLeftWidth: !rtl && sep ? 1 : 0, borderRightWidth: rtl && sep ? 1 : 0, borderColor: C.border }}>
      <GameIcon name={icon} size={17} color={tone} />
      <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 16, lineHeight: 20, color: C.parchment }}>{value}</Text>
      <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 12, lineHeight: 14, color: C.parchmentMuted, textAlign: "center" }}>{label}</Text>
    </View>
  );

  const inv = Object.keys(p.inventory).filter((k) => p.inventory[k] > 0);

  return <>
    <Giris i={0}>
      <Pano title={t("char.gear")} icon="shield" rtl={rtl}>
        {/* Figür ve yuvalar */}
        <View style={{ flexDirection: row, alignItems: "stretch" }}>
          <View style={{ justifyContent: "space-between", height: figH }}>{SOL.map((m) => yuva(m))}</View>
          <KusamFigur height={figH - 6} label={t("karakter.figur")} />
          <View style={{ justifyContent: "space-between", height: figH }}>{SAG.map((m) => yuva(m))}</View>
        </View>
        <View style={{ flexDirection: row, gap: 8, marginTop: 10 }}>{ALT.map((m) => yuva(m, true))}</View>
        {/* Seçili yuva */}
        <View style={{ marginTop: 10, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: KR.well, minHeight: 60, justifyContent: "center" }}>{ayrinti}</View>
        {/* Cenk ve sosyal göstergeler */}
        <View style={{ flexDirection: row, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border + "AA" }}>
          {gosterge("crossed-swords", t("karakter.cenkGucu"), String(combatPower(p)), C.ember, false)}
          {gosterge("shield", t("karakter.savunma"), String(armorDefense(p)), C.azure, true)}
          {gosterge("karizma", t("char.socialPresence"), String(socialPresence(p)), C.goldBright, true)}
          {gosterge("orgutler", t("karakter.gorunus"), `+${at.charisma} / +${at.prestige}`, C.gold, true)}
        </View>
        {martialLoad(p) > 0 ? <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 20, color: C.emberSoft, marginTop: 10, textAlign: ta }}>{t("char.martialWarn")}</Text> : null}
      </Pano>
    </Giris>

    <Giris i={1}>
      <Pano title={t("char.bag")} icon="backpack" rtl={rtl} right={inv.length ? <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchmentMuted }}>{inv.length}</Text> : undefined}>
        {inv.length === 0 ? (
          <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 21, color: C.parchmentMuted, textAlign: ta }}>{t("char.bagEmpty")}</Text>
        ) : (
          <View style={{ flexDirection: row, flexWrap: "wrap", gap: 8 }}>
            {inv.map((k) => {
              const it = ITEMS[k]; const usable = it && (it.feed || it.heal);
              const equipable = it && ["silah", "kalkan", "zirh", "baslik", "eldiven", "ayakkabi", "kiyafet", "taki"].includes(it.kind);
              const useHelps = !!it && ((!!it.feed && p.hunger < 100) || (!!it.heal && p.health < 100)); // doluyken kullan pasif
              return (
                <View key={k} style={{ width: "48.6%", flexGrow: 1, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: KR.well, padding: 9, gap: 8 }}>
                  <View style={{ flexDirection: row, alignItems: "center", gap: 9 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: KR.frame, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(201,162,78,0.1)" }}>
                      <GameIcon name={itemIcon(it)} size={21} color={C.gold} />
                      <View style={{ position: "absolute", bottom: -6, right: -6, minWidth: 22, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#120C06", borderWidth: 1, borderColor: C.borderHi }}>
                        <Text style={{ fontFamily: F.display, fontSize: 10.5, lineHeight: 13, color: C.parchment }}>×{p.inventory[k]}</Text>
                      </View>
                    </View>
                    <Text numberOfLines={2} style={{ flex: 1, minWidth: 0, fontFamily: F.serif, fontSize: 14.5, lineHeight: 18, color: C.parchment, textAlign: ta }}>{t("it." + k)}</Text>
                  </View>
                  {(equipable || usable) ? <View style={{ flexDirection: row, gap: 6 }}>
                    {equipable ? <View style={{ flex: 1 }}><Dugme full label={t("misc.equip")} a11y={`${t("misc.equip")}: ${t("it." + k)}`} onPress={() => apply((s) => equipItem(s, k))} rtl={rtl} /></View> : null}
                    {usable ? <View style={{ flex: 1 }}><Dugme full label={t("misc.use")} a11y={`${t("misc.use")}: ${t("it." + k)}`} disabled={!useHelps} onPress={() => apply((s) => useItem(s, k))} rtl={rtl} /></View> : null}
                  </View> : null}
                </View>
              );
            })}
          </View>
        )}
      </Pano>
    </Giris>
  </>;
}
