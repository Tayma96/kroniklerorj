// Sahip olunan mülkün resimli kartı: sahne, kademe, bakım, gelir, durum rozetleri, büyüt/onar ve açılır yönetim.
import { View, Text, Image, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { DesignPressable as Pressable } from "../../design-pressable";
import { PROP_MAX_LEVEL, propAylikTahmin, propUpgradeCost, propWorkerSlots, repairCost, repairProperty, upgradeProperty, setTenant, setGuard, setFallow, townNpcsOf, workerProductivity, hireWorker, fireWorker, inflationFactor, type GameState, type Property } from "../../game";
import { placeName, professionNameL } from "../../locale-data";
import { mulkImage } from "../../assets";
import { useI18n, applyParams, yuzdeL } from "../../i18n";
import { hap } from "../../haptics";
import { playCoin, playTap } from "../../sound";
import { useSadeMod } from "../../use-sade-mod";
import { GameIcon } from "../../icons";
import { Portre } from "../../ui";
import { C, F } from "../../theme";
import { Kademe, Madalyon, Olculer, Plaka, Rozet, Spark, condTone, fmt, signed } from "./parca";

type Apply = (fn: (s: GameState) => GameState) => void;

// Açılır yönetimdeki aç/kapa satırı: madalyon, eylem adı, etkisi, sağda güncel durum.
function Anahtar({ icon, title, sub, state, on, disabled, onPress, rtl }: { icon: string; title: string; sub: string; state?: string; on: boolean; disabled?: boolean; onPress: () => void; rtl: boolean }) {
  const sade = useSadeMod(); const tone = on ? C.gold : C.parchmentMuted;
  return <Pressable accessibilityLabel={title} accessibilityHint={sub} accessibilityState={{ disabled: !!disabled, checked: on }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10, minHeight: 58, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 7, borderWidth: 1, borderColor: pressed ? C.goldBright : C.borderHi, borderBottomWidth: pressed && !sade ? 1 : 2, borderBottomColor: C.bg, backgroundColor: pressed ? C.surface : "rgba(36,27,17,0.9)", opacity: disabled ? 0.7 : 1, transform: [{ translateY: pressed && !sade ? 1 : 0 }] })}>
    <Madalyon icon={icon} tone={tone} size={36} />
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={{ fontFamily: F.display, fontSize: 14, lineHeight: 19, color: disabled ? C.parchmentDim : C.parchment, textAlign: rtl ? "right" : "left" }}>{title}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: rtl ? "right" : "left" }}>{sub}</Text>
    </View>
    {state ? <Rozet icon={icon} label={state} tone={on ? C.gold : C.parchmentMuted} rtl={rtl} /> : null}
  </Pressable>;
}

export function MulkKarti({ state, pr, i, open, hireOpen, onManage, onHire, apply, delay }: { state: GameState; pr: Property; i: number; open: boolean; hireOpen: boolean; onManage: () => void; onHire: (open: boolean) => void; apply: Apply; delay: number }) {
  const { t, lang } = useI18n(); const rtl = lang === "ar"; const sade = useSadeMod();
  const row = rtl ? "row-reverse" as const : "row" as const, ta = rtl ? "right" as const : "left" as const;
  const p = state.player, lvl = pr.level || 1, maxed = lvl >= PROP_MAX_LEVEL;
  const inc = propAylikTahmin(state, pr), slots = propWorkerSlots(pr), cc = condTone(pr.cond);
  const gain = maxed ? 0 : propAylikTahmin(state, { ...pr, level: lvl + 1 }) - inc; // büyütmenin gerçek formülle aylık katkısı
  const ledger = (pr.ledger || []).filter((e) => e.months === 12);
  const trend = (ledger.slice(-1)[0]?.net ?? 0) >= 0 ? C.sage : C.blood;
  const rc = repairCost(pr), uc = propUpgradeCost(pr);
  const resting = pr.fallow_until !== undefined, fertile = (pr.fertile_until ?? 0) > state.turn;
  const name = t("pt." + pr.type), incTone = inc >= 0 ? C.sage : C.blood;
  const act = (fn: (s: GameState) => GameState, coin = false) => { hap(coin ? "success" : "tap"); if (coin) playCoin(); else playTap(); apply(fn); };

  return <Animated.View entering={sade ? undefined : FadeInDown.delay(delay).duration(380)} style={{ marginBottom: 14, borderRadius: 9, borderWidth: 1, borderColor: open ? C.gold : C.borderHi, overflow: "hidden", backgroundColor: "rgba(22,16,9,0.94)" }}>
    {/* Sahne: mülk resmi, bakım ve kademe üstte, ad ve yer altta, bakım şeridi kenarda */}
    <View style={{ height: 124 }}>
      <Image accessible={false} source={mulkImage(pr.type)} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
      <LinearGradient pointerEvents="none" colors={["rgba(8,5,2,0.5)", "rgba(8,5,2,0)", "rgba(8,5,2,0.9)"]} locations={[0, 0.34, 1]} style={StyleSheet.absoluteFill} />
      <View style={{ position: "absolute", top: 8, left: 8, right: 8, flexDirection: row, justifyContent: "space-between", alignItems: "center" }}>
        <Rozet dark icon="healing" label={`${t("mulk.cond")} ${yuzdeL(pr.cond, lang)}`} tone={cc} rtl={rtl} />
        <Kademe level={lvl} max={PROP_MAX_LEVEL} label={t("mulk.level")} rtl={rtl} />
      </View>
      <View style={{ position: "absolute", left: 12, right: 12, bottom: 10, flexDirection: row, alignItems: "flex-end", gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text accessibilityRole="header" numberOfLines={1} style={{ fontFamily: F.display, fontSize: 21, lineHeight: 27, color: C.parchment, textAlign: ta, textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 8 }}>{name}</Text>
          <View style={{ flexDirection: row, alignItems: "center", gap: 5 }}>
            <GameIcon name="map" size={13} color={C.parchmentDim} />
            <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.serif, fontSize: 14, lineHeight: 18, color: C.parchmentDim }}>{placeName(pr.loc, lang)}</Text>
          </View>
        </View>
        <Spark ledger={ledger} color={trend} />
      </View>
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, alignItems: rtl ? "flex-end" : "flex-start", backgroundColor: "rgba(255,255,255,0.1)" }}>
        <View style={{ width: `${pr.cond}%`, height: 4, backgroundColor: cc }} />
      </View>
    </View>

    <View style={{ padding: 12, gap: 10 }}>
      <Olculer rtl={rtl} items={[
        { icon: "akce", label: t("mulk.income"), value: signed(inc, lang), tone: incTone },
        { icon: "scroll", label: t("mulkler.yearly"), value: signed(inc * 12, lang), tone: incTone },
        { icon: "iliskiler", label: t("mulk.workers"), value: `${pr.workers?.length || 0}/${slots}` },
      ]} />
      <View style={{ flexDirection: row, flexWrap: "wrap", gap: 6 }}>
        <Rozet icon="shield" label={pr.guard ? t("mulkler.guarded") : t("mulkler.unguarded")} tone={pr.guard ? C.gold : C.parchmentMuted} rtl={rtl} />
        {pr.type === "ev" && <Rozet icon="house" label={pr.tenant ? t("mulkler.rented") : t("mulkler.vacant")} tone={pr.tenant ? C.gold : C.parchmentMuted} rtl={rtl} />}
        {resting && <Rozet icon="leaf" label={applyParams(t("mulk.fallowLeft"), [Math.max(0, (pr.fallow_until ?? 0) - state.turn)], lang)} tone={C.parchmentDim} rtl={rtl} />}
        {fertile && <Rozet icon="wheat" label={applyParams(t("mulk.fertileLeft"), [(pr.fertile_until ?? 0) - state.turn], lang)} tone={C.sage} rtl={rtl} />}
      </View>

      <View style={{ flexDirection: row, gap: 8 }}>
        {maxed
          ? <View accessible accessibilityLabel={t("mulkler.maxLevel")} style={{ flex: 1, minHeight: 52, alignItems: "center", justifyContent: "center", gap: 2, borderRadius: 7, borderWidth: 1, borderColor: C.goldDim, backgroundColor: "rgba(221,180,90,0.08)" }}>
              <GameIcon name="star" size={16} color={C.gold} />
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontFamily: F.display, fontSize: 12.5, color: C.gold }}>{t("mulkler.maxLevel")}</Text>
            </View>
          : <Plaka primary icon="star" label={t("mulk.upgrade")} cost={uc} costTone={p.money < uc ? C.blood : undefined} lang={lang} rtl={rtl} disabled={p.money < uc}
              a11y={`${t("mulk.upgrade")} ${name}: ${fmt(uc, lang)}`} hint={applyParams(t("mulkler.gain"), [signed(gain, lang)], lang)} onPress={() => act((s) => upgradeProperty(s, i), true)} />}
        {pr.cond < 100 && <Plaka icon="saw" label={t("mulk.repair")} cost={rc} costTone={p.money < rc ? C.blood : undefined} tone={pr.cond < 45 ? C.ember : C.gold} lang={lang} rtl={rtl} disabled={p.money < rc}
          a11y={`${t("mulk.repair")} ${name}: ${fmt(rc, lang)}`} onPress={() => act((s) => repairProperty(s, i), true)} />}
        <Plaka icon="cog" label={open ? t("mulkler.close") : t("mulk.manage")} lang={lang} rtl={rtl} expanded={open} a11y={`${t("mulk.manage")}: ${name}`} onPress={() => { hap("tap"); playTap(); onManage(); }} />
      </View>
      {!maxed && <View style={{ flexDirection: row, alignItems: "center", gap: 6 }}>
        <GameIcon name="star" size={12} color={C.goldDim} />
        <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: ta }}>{applyParams(t("mulkler.gain"), [signed(gain, lang)], lang)}</Text>
      </View>}

      {open && <Yonetim state={state} pr={pr} i={i} hireOpen={hireOpen} onHire={onHire} act={act} rtl={rtl} />}
    </View>
  </Animated.View>;
}

// Açılır yönetim: değirmen kuralı, bekçi / kiracı / nadas ve işçiler.
function Yonetim({ state, pr, i, hireOpen, onHire, act, rtl }: { state: GameState; pr: Property; i: number; hireOpen: boolean; onHire: (open: boolean) => void; act: (fn: (s: GameState) => GameState, coin?: boolean) => void; rtl: boolean }) {
  const { t, lang } = useI18n(); const sade = useSadeMod();
  const row = rtl ? "row-reverse" as const : "row" as const, ta = rtl ? "right" as const : "left" as const;
  const p = state.player, slots = propWorkerSlots(pr);
  const town = townNpcsOf(state, pr.loc, lang);
  const hired = (pr.workers || []).map((id) => town.find((nn) => nn.id === id)).filter(Boolean) as NonNullable<ReturnType<typeof town.find>>[];
  const avail = town.filter((nn) => nn.age >= 14 && !(pr.workers || []).includes(nn.id)); // çocuk işçi listelenmez
  const resting = pr.fallow_until !== undefined, fertile = (pr.fertile_until ?? 0) > state.turn;
  const fallowLbl = resting ? applyParams(t("mulk.fallowLeft"), [Math.max(0, (pr.fallow_until ?? 0) - state.turn)], lang)
    : fertile ? applyParams(t("mulk.fertileLeft"), [(pr.fertile_until ?? 0) - state.turn], lang) : t("mulk.fallow");
  const guardWage = Math.round(4 * inflationFactor(state)); // propAylikTahmin'deki bekçi gideriyle aynı

  return <Animated.View entering={sade ? undefined : FadeIn.duration(220)} style={{ gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border }}>
    {pr.type === "degirmen" && <View style={{ flexDirection: row, gap: 8, padding: 10, borderRadius: 7, borderWidth: 1, borderColor: C.goldDim, backgroundColor: "rgba(221,180,90,0.06)" }}>
      <GameIcon name="wheat" size={18} color={C.gold} />
      <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, lineHeight: 20, color: C.parchmentDim, textAlign: ta }}>{applyParams(t("mulk.millRule"), [p.inventory.bugday || 0], lang)}</Text>
    </View>}
    <Anahtar icon="shield" on={!!pr.guard} rtl={rtl} title={pr.guard ? t("mulk.guardOff") : t("mulk.guardOn")} sub={applyParams(t("mulkler.guardSub"), [fmt(guardWage, lang)], lang)}
      state={pr.guard ? t("mulkler.guarded") : t("mulkler.unguarded")} onPress={() => act((s) => setGuard(s, i, !pr.guard))} />
    {pr.type === "ev" && <Anahtar icon="house" on={!!pr.tenant} rtl={rtl} title={pr.tenant ? t("mulk.rentEnd") : t("mulk.rentOut")} sub={t("mulkler.rentSub")}
      state={pr.tenant ? t("mulkler.rented") : t("mulkler.vacant")} onPress={() => act((s) => setTenant(s, i, !pr.tenant))} />}
    {pr.type === "tarla" && <Anahtar icon="leaf" on={resting || fertile} disabled={resting || fertile} rtl={rtl} title={fallowLbl} sub={t("mulkler.fallowSub")} onPress={() => act((s) => setFallow(s, i))} />}

    {/* İşçiler: çıkarmak için ada dokun; boş yer varsa işe al listesi açılır */}
    <View style={{ flexDirection: row, alignItems: "center", gap: 8, marginTop: 4 }}>
      <GameIcon name="iliskiler" size={18} color={C.gold} />
      <Text accessibilityRole="header" style={{ flex: 1, fontFamily: F.display, fontSize: 14, lineHeight: 19, color: C.gold, textAlign: ta }}>{t("mulk.workers")} {hired.length}/{slots}</Text>
      {hired.length < slots && <Pressable accessibilityLabel={t("mulk.hire")} accessibilityState={{ expanded: hireOpen }} onPress={() => { hap("tap"); playTap(); onHire(!hireOpen); }}
        style={({ pressed }) => ({ flexDirection: row, alignItems: "center", gap: 6, paddingHorizontal: 12, borderRadius: 7, borderWidth: 1, borderColor: C.sage, borderBottomWidth: pressed && !sade ? 1 : 2, borderBottomColor: C.bg, backgroundColor: pressed ? C.surface : "rgba(74,154,90,0.16)" })}>
        <GameIcon name="iliskiler" size={14} color={C.sage} />
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.sage }}>{hireOpen ? t("mulkler.close") : t("mulk.hire")}</Text>
      </Pressable>}
    </View>
    {hired.length > 0 && <View style={{ flexDirection: row, flexWrap: "wrap", gap: 6 }}>
      {hired.map((nn) => <Pressable key={nn.id} accessibilityLabel={applyParams(t("mulkler.fire"), [nn.name], lang)} onPress={() => act((s) => fireWorker(s, i, nn.id))}
        style={({ pressed }) => ({ flexDirection: row, alignItems: "center", gap: 6, paddingHorizontal: 8, borderRadius: 7, borderWidth: 1, borderColor: pressed ? C.blood : C.border, backgroundColor: pressed ? "rgba(200,64,64,0.14)" : C.bg })}>
        <Portre age={nn.age} gender={nn.gender} size={24} ring={false} seed={nn.id} />
        <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchment }}>{nn.name.split(" ")[0]}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.blood }}>×</Text>
      </Pressable>)}
    </View>}
    {hireOpen && <View style={{ padding: 8, borderRadius: 7, borderWidth: 1, borderColor: C.border, backgroundColor: "rgba(14,10,6,0.7)" }}>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, marginBottom: 4, textAlign: ta }}>{t("mulk.wageNote")}</Text>
      {avail.slice(0, 8).map((nn, k) => {
        const prof = professionNameL(nn.profession, lang, nn.gender === "kadın"), prod = workerProductivity(nn, pr.type).toFixed(1);
        return <Pressable key={nn.id} accessibilityLabel={`${t("mulk.hire")}: ${nn.name}, ${prof}, ${t("mulk.prod")} ×${prod}`} onPress={() => { hap("success"); playTap(); act((s) => hireWorker(s, i, nn.id)); onHire(false); }}
          style={({ pressed }) => ({ flexDirection: row, alignItems: "center", gap: 9, paddingVertical: 4, paddingHorizontal: 4, borderRadius: 6, borderTopWidth: k ? 1 : 0, borderTopColor: C.border, backgroundColor: pressed ? C.surface : "transparent" })}>
          <Portre age={nn.age} gender={nn.gender} size={30} ring={false} seed={nn.id} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 19, color: C.parchment, textAlign: ta }}>{nn.name}</Text>
            <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: ta }}>{prof} · {nn.age}</Text>
          </View>
          <Rozet icon="star" label={`${t("mulk.prod")} ×${prod}`} tone={C.sage} rtl={rtl} />
        </Pressable>;
      })}
    </View>}
  </Animated.View>;
}
