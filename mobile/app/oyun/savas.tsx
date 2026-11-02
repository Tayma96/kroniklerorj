import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { useState, useRef } from "react";
import { View, Text, ScrollView, useWindowDimensions } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { ArmyFront } from "../../lib/army-ui";
import { ENCOUNTERS, combatPower, armorDefense, weaponClass, hasShield, shieldBlockChance, applyBattleOutcome, nemesisEncounter, applyNemesisOutcome, reconcileNemesis, reconcileCost, diyetBedeli, diyetSansi, diyetOde, kisiProfil, trainCombat, trainCost, startBattleAttempt, inflationFactor, hireGuard, dismissGuards, retinueHireCost, retinueWage, RETINUE_MAX, inJail, Encounter, applyYuzlesme, yuzlesmeHarac, yuzlesmeKese, YUZLESME_YARA } from "../../lib/game";
import { YZ_SECIMLER, YzCozum, YzSecim, yzTuru, yzSans, yzOran, yzCoz, yzUygula } from "../../lib/yuzlesme";
import { startBattle, stepBattle, battleMoveCost, MOVES, STANCES, BattleState, Move, Stance, CbLogEntry } from "../../lib/combat";
import { DuelArena } from "../../lib/duel-arena";
import { playVictory, playWarDrum, playClash, playDefeat } from "../../lib/sound";
import { anlat } from "../../lib/anlar";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";
import { useI18n, yuzdeL, applyParams, kucukHarf } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { FloatingNumber, Slash } from "../../lib/fx";
import { BackLabel, PageHeader, ProgressBar, ScreenFresk } from "../../lib/ui";


export default function Savas() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { width: winW } = useWindowDimensions();
  const { state, apply } = useGame();
  const { t, tg, lang } = useI18n();
  const [diyetAcik, setDiyetAcik] = useState(false);
  // i18n anahtarı yoksa encounter'ın kendi (TR) verisini kullan.
  const gt = (key: string, fb: string) => { const v = t(key); return v === key ? fb : v; };
  // Savaş log'u (combat.ts'ten dile bağımsız {k,p}) render anında çevrilir: { mv } → hamle adı, { lk } → alt-anahtar.
  const renderCb = (e: CbLogEntry): string =>
    applyParams(t(e.k), (e.p || []).map((x): string | number => {
      if (x && typeof x === "object") return "mv" in x ? t("cb." + x.mv) : t(x.lk);
      return x;
    }));
  const [bs, setBs] = useState<BattleState | null>(null);
  const [stance, setStance] = useState<Stance>("dengeli");
  const [encId, setEncId] = useState<string>("");
  const [applied, setApplied] = useState(false);
  const [floats, setFloats] = useState<{ id: number; value: string; color: string; left: number; top: number }[]>([]);
  const [slashKey, setSlashKey] = useState(0);
  // Yüzleşme: dövüşten önce 4 seçenek (ay hakkı girişte yandı; sonuç kavga ya da kavgasız kapanış)
  const [yz, setYz] = useState<{ e: Encounter; rng: number } | null>(null);
  const [yzC, setYzC] = useState<YzCozum | null>(null);
  const fid = useRef(0);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const pw = combatPower(p);
  const tooWeak = p.health < 15; // ağır yaralıyken dövüşe girilemez (1 canla 20 canlıymış gibi savaşma tutarsızlığı)
  const foughtThisMonth = p.battle_turn === state.turn; // bu ay bir kez dövüşüldü — para/beceri/itibar farmı önlenir (work/war ile aynı kapı)
  const canFight = p.age >= 13 && !p.dead && !tooWeak && !foughtThisMonth;

  const nemEnc = nemesisEncounter(state);
  // Hasım gerçek bir kişiyse adı her dilde kendi adıyla; kanlı hasımsa kimin kanı için geldiği
  const nem = state.story?.nemesis;
  const nemAdi = nem ? (nem.id ? kisiProfil(state, nem.id, lang)?.npc.name : undefined) || nem.name : "";
  const nemTitle = applyParams(t("cb.nemTitle"), [nemAdi]);
  const yakAdi = (yak: string | undefined, olenG?: string) => kucukHarf(t("kan.yak." + (yak || "kardes") + (yak === "baba" || yak === "anne" ? "" : olenG === "kadın" ? ".k" : ".e")), lang);
  const nemOlen = nem?.olen ? kisiProfil(state, nem.olen, lang) : null;
  // Ay hakkı girişte yanar (çekirdek kilidi): kaybederken ekrandan kaçıp bedelsiz tekrar denenemez.
  const begin = (id: string) => {
    const e = id === "nemesis" ? nemEnc : ENCOUNTERS.find((x) => x.id === id);
    if (!e) return;
    apply((s) => {
      if (s.player.dead || inJail(s.player) || s.player.age < 13 || s.player.health < 15 || s.player.battle_turn === s.turn) return s;
      const next = startBattleAttempt(s);
      const enc = { ...e, title: id === "nemesis" ? nemTitle : gt("enc." + e.id + ".t", e.title) };
      const rng = s.rng_state ?? s.seed;
      setEncId(id); playWarDrum(); anlat("savas"); // hayat başına bir kez anlatıcı
      if (id !== "nemesis" && yzTuru(id)) { setYz({ e: enc, rng }); setYzC(null); } // önce yüzleşme
      else setBs(startBattle(s.player, enc, rng));
      setApplied(false); setFloats([]);
      return next;
    });
  };
  const beginNemesis = () => begin("nemesis");
  // Seçim bir kez çözülür (zar yüzleşmenin kendi dalından); sonuç ekranda okunur, sonra kavgaya ya da yola.
  const yzSec = (secim: YzSecim) => {
    if (!yz || yzC) return;
    const c = yzCoz(state, yz.e, secim, yz.rng);
    hap(c.sonuc === "basarisiz" ? "advance" : "tap");
    if (secim === "saldir" || secim === "gard" || (c.kavga && c.sonuc === "basarisiz")) playClash();
    setYzC(c);
  };
  const yzBitir = () => {
    if (!yz || !yzC) return;
    if (yzC.kavga) setBs(yzUygula(startBattle(p, yz.e, yz.rng), yzC));
    else if (yzC.kapanis) { const k = yzC.kapanis; const id = encId; apply((s) => applyYuzlesme(s, id, k)); setApplied(true); }
    setYz(null); setYzC(null);
  };
  const play = (mv: Move) => {
    if (!bs || bs.over) return;
    const next = stepBattle(bs, p, mv, stance);
    const dE = Math.round(bs.enemyHp - next.enemyHp);
    const dY = Math.round(bs.playerHp - next.playerHp);
    const adds: { id: number; value: string; color: string; left: number; top: number }[] = [];
    if (dE > 0) adds.push({ id: fid.current++, value: `-${dE}`, color: C.ember, left: Math.min(winW - 24, 460) * 0.72, top: 112 });
    if (dY > 0) adds.push({ id: fid.current++, value: `-${dY}`, color: C.blood, left: Math.min(winW - 24, 460) * 0.18, top: 112 });
    if (dE > 0) setSlashKey((k) => k + 1);
    if (dE > 0 || dY > 0) playClash(); // çelik konuştu — kim vurduysa çınlama aynı
    if (adds.length) {
      setFloats((f) => [...f.slice(-3), ...adds]);
      hap(dY > 0 ? "advance" : "tap");
      shake.value = withSequence(withTiming(-7, { duration: 45 }), withTiming(7, { duration: 45 }), withTiming(-4, { duration: 40 }), withTiming(0, { duration: 40 }));
    }
    setBs(next);
  };
  const finish = () => {
    if (bs && !applied) {
      if (bs.won) playVictory(); else playDefeat();
      if (encId === "nemesis") apply((s) => applyNemesisOutcome(s, bs.won, bs.playerHp));
      else apply((s) => applyBattleOutcome(s, encId, bs.won, bs.playerHp));
      setApplied(true);
    }
    setBs(null);
  };

  // Yüzleşme ekranı: durum + 4 seçenek → sonuç anlatısı ve etkisi
  if (yz && !bs) {
    const tur = yzTuru(yz.e.id) || "eskiya";
    const ORAN_RENK = { iyi: C.sage, orta: C.gold, zor: C.ember, cokzor: C.blood } as const;
    const etkiler: { icon: string; metin: string; renk: string }[] = [];
    if (yzC) {
      const k = yzC.etki || {};
      if (k.dusmanPay) etkiler.push({ icon: "skull", metin: `${t("yz.rakip")} −${Math.round((30 + yz.e.power * 4) * -k.dusmanPay)}`, renk: C.ember });
      if (k.can) etkiler.push({ icon: "healing", metin: `${t("cb.you")} −${Math.abs(k.can)}`, renk: C.blood });
      if (k.nefes) etkiler.push({ icon: "hourglass", metin: `${t("war.breath")} ${k.nefes > 0 ? "+" : "−"}${Math.abs(k.nefes)}`, renk: k.nefes > 0 ? C.sage : C.ember });
      if (k.ustunluk) etkiler.push({ icon: "star", metin: t("yz.ustunluk"), renk: C.gold });
      if (yzC.kapanis === "harac") etkiler.push({ icon: "coins", metin: applyParams(t("yz.etki.harac"), [yuzlesmeHarac(state, yz.e.id)]), renk: C.ember });
      if (yzC.kapanis === "kac_bedel" && tur === "eskiya") etkiler.push({ icon: "coins", metin: applyParams(t("yz.etki.kese"), [yuzlesmeKese(state, yz.e.id)]), renk: C.ember });
      if (yzC.kapanis === "kac_bedel" && tur === "hayvan") etkiler.push({ icon: "healing", metin: applyParams(t("yz.etki.yara"), [YUZLESME_YARA]), renk: C.blood });
      if ((yzC.kapanis === "kac" || yzC.kapanis === "kac_bedel") && tur === "duello") etkiler.push({ icon: "banner", metin: t("yz.etki.seref"), renk: C.blood });
    }
    return (
      <ScreenFresk style={{ paddingTop: insets.top }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: insets.bottom + 100 }}>
          <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 2, color: C.blood, textAlign: "center", textTransform: "uppercase" }}>{t("yz.baslik")}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 22, color: C.parchment, textAlign: "center", marginTop: 6 }}>{yz.e.title}</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 17, color: C.parchment, lineHeight: 26, marginTop: 14, marginBottom: 18, textAlign: "center" }}>{t("yz.dur." + yz.e.id)}</Text>
          {!yzC ? (
            <>
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.parchmentMuted, marginBottom: 8, textTransform: "uppercase" }}>{t("yz.soru")}</Text>
              {YZ_SECIMLER.map((o) => {
                const oran = yzOran(yzSans(state, yz.e, o.id));
                return (
                  <Pressable key={o.id} onPress={() => yzSec(o.id)} accessibilityRole="button" accessibilityLabel={`${o.harf}. ${t(`yz.${tur}.${o.id}`)}. ${t("yz.oran." + oran)}`} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, paddingVertical: 12, paddingHorizontal: 12, marginBottom: 8, borderRadius: 6, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: "rgba(201,168,76,0.6)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontFamily: F.display, fontSize: 15, color: C.gold }}>{o.harf}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <GameIcon name={o.icon} size={13} color={C.gold} />
                        <Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchment, flex: 1 }}>{t(`yz.${tur}.${o.id}`)}</Text>
                        <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 0.5, color: ORAN_RENK[oran] }}>{t("yz.oran." + oran)}</Text>
                      </View>
                      <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentMuted, lineHeight: 21, marginTop: 3 }}>{t(`yz.${tur}.${o.id}.d`)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </>
          ) : (
            <View style={{ borderRadius: 6, borderWidth: 1, borderColor: yzC.sonuc === "basarisiz" ? "rgba(168,52,52,0.6)" : yzC.sonuc === "basari" ? "rgba(201,168,76,0.6)" : C.borderHi, backgroundColor: C.card, padding: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <GameIcon name={YZ_SECIMLER.find((o) => o.id === yzC.secim)?.icon || "crossed-swords"} size={13} color={C.gold} />
                <Text style={{ fontFamily: F.display, fontSize: 14, color: C.gold }}>{t(`yz.${tur}.${yzC.secim}`)}</Text>
              </View>
              <Text style={{ fontFamily: F.serif, fontSize: 17, color: C.parchment, lineHeight: 26 }}>{t(yzC.metin)}</Text>
              {etkiler.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  {etkiler.map((x, i) => (
                    <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 5, paddingHorizontal: 9, borderRadius: 4, borderWidth: 1, borderColor: C.border }}>
                      <GameIcon name={x.icon} size={11} color={x.renk} />
                      <Text style={{ fontFamily: F.display, fontSize: 13, color: x.renk }}>{x.metin}</Text>
                    </View>
                  ))}
                </View>
              )}
              <Pressable onPress={yzBitir} style={{ marginTop: 16, minHeight: 48, justifyContent: "center", borderRadius: 5, borderWidth: 1.5, borderColor: yzC.kavga ? "rgba(168,52,52,0.7)" : "rgba(201,168,76,0.55)", backgroundColor: yzC.kavga ? "rgba(168,52,52,0.2)" : C.gold, alignItems: "center" }}>
                <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: yzC.kavga ? C.blood : C.inkOnGold }}>{yzC.kavga ? t("yz.kavgaya") : t("yz.devam")}</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </ScreenFresk>
    );
  }

  // Savaş ekranı
  if (bs) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
        {slashKey > 0 && <Slash key={slashKey} />}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
          <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, letterSpacing: 1, textAlign: "center" }}>{bs.enemyName}</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.blood, textAlign: "center", marginTop: 3 }}>
            <Text style={{ fontFamily: F.display, letterSpacing: 0.5, textTransform: "uppercase" }}>{t("cb.arch." + bs.arch)}</Text> · {t("cb.archd." + bs.arch)}
          </Text>
        </View>
        {/* Kuşam şeridi — silah arketipi · güç · zırh · kalkan bloğu */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingBottom: 8 }}>
          {weaponClass(p) ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <GameIcon name="silah" size={11} color={C.ember} />
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 0.5, color: C.ember, textTransform: "uppercase" }}>{t("wc." + weaponClass(p))}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><GameIcon name="crossed-swords" size={11} color={C.parchmentDim} /><Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchmentDim }}>{pw}</Text></View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><GameIcon name="shield" size={11} color={C.azure} /><Text style={{ fontFamily: F.display, fontSize: 13, color: C.azure }}>{armorDefense(p)}</Text></View>
          {hasShield(p) ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><GameIcon name="kite" size={11} color={C.sage} /><Text style={{ fontFamily: F.display, fontSize: 13, color: C.sage }}>{t("cb.block")} {yuzdeL(Math.round(shieldBlockChance(p, stance === "savunmaci") * 100), lang)}</Text></View>
          ) : null}
        </View>
        {/* Arena: Karagöz perdesi — iki tasvir, rakibin niyeti, can/nefes/üstünlük; tur sonucu canlanır */}
        <Animated.View style={[{ paddingHorizontal: 12, position: "relative" }, shakeStyle]}>
          <DuelArena bs={bs} youLabel={t("cb.you")} intentLabel={t("cb.intent")} breathLabel={`${t("war.breath")} · ${applyParams(t("war.momentum"), [bs.momentum || 0])}`} moveLabel={(m) => t("cb." + m)} desperateLabel={t("cb.desperate")} />
          {(bs.repetition || 0) >= 2 && <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.ember, textAlign: "center", marginTop: 4 }}>{t("war.predictable")}</Text>}
          {floats.map((f) => <FloatingNumber key={f.id} value={f.value} color={f.color} left={f.left} top={f.top} />)}
        </Animated.View>
        <ScrollView style={{ flex: 1, marginTop: 8 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {[...bs.log].reverse().map((l, i) => (
            <Text key={i} style={{ fontFamily: F.serif, fontSize: 15, color: i === 0 ? C.parchment : C.parchmentMuted, lineHeight: 22, marginBottom: 5 }}>{renderCb(l)}</Text>
          ))}
        </ScrollView>
        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: C.border, paddingBottom: 34 }}>
          {bs.over ? (
            <Pressable onPress={finish} style={{ paddingVertical: 15, borderRadius: 5, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.55)", backgroundColor: C.gold, alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.inkOnGold, letterSpacing: 1.5 }}>{bs.won ? t("cb.claim") : t("cb.retreat")}</Text>
            </Pressable>
          ) : (
            <>
              {/* Duruş seçimi (Vercel portu): saldırı/savunma dengesi */}
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.parchmentMuted, marginBottom: 5 }}>{t("cb.stanceLabel")}</Text>
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>
                {STANCES.map((s) => {
                  const on = stance === s.id;
                  return (
                    <Pressable key={s.id} onPress={() => { hap("tap"); setStance(s.id); }} style={{ flex: 1, minHeight: 44, justifyContent: "center", alignItems: "center", paddingVertical: 7, borderRadius: 5, borderWidth: 1, borderColor: on ? "rgba(201,168,76,0.7)" : C.border, backgroundColor: on ? "rgba(201,168,76,0.15)" : C.bg }}>
                      <Text style={{ fontFamily: F.display, fontSize: 13, color: on ? C.gold : C.parchmentMuted }}>{t("cb.stance." + s.id)}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                        <GameIcon name="crossed-swords" size={8} color={C.parchmentDim} />
                        <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentDim }}>{Math.round(s.atk * 100)}%</Text>
                        <GameIcon name="shield" size={8} color={C.parchmentDim} />
                        <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentDim }}>{Math.round(s.def * 100)}%</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {MOVES.map((m) => (
                  <Pressable key={m.id} disabled={m.id === "toparlan" && (bs.breath ?? 100) >= (bs.breathMax ?? 100)} onPress={() => play(m.id)} style={{ opacity: m.id === "toparlan" && (bs.breath ?? 100) >= (bs.breathMax ?? 100) ? 0.45 : 1, flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 5, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card }}>
                    <GameIcon name={m.icon} size={20} color={C.gold} />
                    <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment, marginTop: 5 }}>{t("cb." + m.id)}</Text>
                    <Text style={{ fontFamily: F.serif, fontSize: 15, color: (bs.breath ?? 100) < battleMoveCost(m.id, stance) ? C.ember : C.parchmentMuted, marginTop: 4 }}>{m.id === "toparlan" ? `+${Math.min((bs.breathMax ?? 100) - (bs.breath ?? 100), 26 + (p.skills?.combat || 0))}` : applyParams(t("war.cost"), [battleMoveCost(m.id, stance)])}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </View>
      </View>
    );
  }

  // Seçim ekranı
  return (
    <ScreenFresk style={{ paddingTop: insets.top }}>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <View style={{ width: 40 }} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          {weaponClass(p) ? <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 0.5, color: C.ember, textTransform: "uppercase" }}>{t("wc." + weaponClass(p))}</Text> : null}
          <GameIcon name="crossed-swords" size={12} color={C.blood} />
          <Text style={{ fontFamily: F.display, fontSize: 13, color: C.blood }}>{pw}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        <PageHeader kicker={t("scr.savas")} title={t("scr.savas")} />
        <ArmyFront />
      <Pressable onPress={() => router.push("/oyun/meslek")} style={{ paddingHorizontal: 16, paddingVertical: 12, minHeight: 44 }}>
        <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentMuted, lineHeight: 22 }}>{t("war.soldier")}</Text>
      </Pressable>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, paddingHorizontal: 16, marginBottom: 10 }}>
        {t("cb.subtitle")} {(p.inventory["bicak"] || 0) > 0 ? t("cb.knifeYes") : t("cb.knifeNo")}
      </Text>
        {tooWeak && !p.dead && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(168,52,52,0.1)", borderWidth: 1, borderColor: "rgba(168,52,52,0.45)", borderRadius: 5, padding: 12, marginBottom: 12 }}>
            <GameIcon name="saglik" size={15} color={C.blood} />
            <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, color: C.parchment, lineHeight: 22 }}>{tg("cb.tooWeak", state.player.gender === "kadın")}</Text>
          </View>
        )}
        {p.age < 13 && !p.dead && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(168,52,52,0.1)", borderWidth: 1, borderColor: "rgba(168,52,52,0.45)", borderRadius: 5, padding: 12, marginBottom: 12 }}>
            <GameIcon name="savas" size={15} color={C.blood} />
            <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, color: C.parchment, lineHeight: 22 }}>{t("cb.tooYoung")}</Text>
          </View>
        )}
        {foughtThisMonth && !tooWeak && !p.dead && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(168,52,52,0.1)", borderWidth: 1, borderColor: "rgba(168,52,52,0.45)", borderRadius: 5, padding: 12, marginBottom: 12 }}>
            <GameIcon name="savas" size={15} color={C.blood} />
            <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, color: C.parchment, lineHeight: 22 }}>{t("cb.foughtMonth")}</Text>
          </View>
        )}
        {nemEnc && (
          <View style={{ backgroundColor: "rgba(120,20,20,0.15)", borderWidth: 1, borderColor: "rgba(200,60,60,0.6)", borderRadius: 5, padding: 14, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6, marginRight: 10 }}><GameIcon name="suc" size={13} color={C.blood} /><Text style={{ flexShrink: 1, fontFamily: F.display, fontSize: 14, color: C.blood }}>{nemTitle}</Text></View>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.blood }}>{t("cb.enemyPower")} {nemEnc.power}</Text>
            </View>
            {nemOlen ? <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchment, marginTop: 5 }}>{applyParams(t("cb.kanFor"), [yakAdi(nem?.yak, nemOlen.npc.gender), nemOlen.npc.name])}</Text> : null}
            <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, marginTop: 5 }}>{applyParams(t("cb.nemDesc"), [nemAdi])} {t("cb.settleTime")}</Text>
            {(() => {
              const kanli = !!nem?.olen; // kanlı hasım hediyeyle değil diyetle konuşur
              const pcost = kanli ? diyetBedeli(state) : reconcileCost(state);
              const canPeace = p.money >= pcost && p.reconcile_turn !== state.turn && !p.dead;
              const ds = kanli ? diyetSansi(state) : null;
              if (kanli) return (
                <View style={{ marginTop: 10 }}>
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    <Pressable disabled={!canFight} onPress={beginNemesis} style={{ paddingVertical: 8, paddingHorizontal: 18, borderRadius: 5, borderWidth: 1, borderColor: "rgba(200,60,60,0.7)", backgroundColor: "rgba(200,60,60,0.2)", opacity: canFight ? 1 : 0.4 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 13, color: C.blood, letterSpacing: 1 }}>{t("cb.settle")}</Text>
                    </Pressable>
                    <Pressable disabled={!canPeace} onPress={() => { hap("tap"); apply((s) => diyetOde(s)); }} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 5, borderWidth: 1, borderColor: canPeace ? "rgba(127,166,106,0.6)" : C.border, backgroundColor: canPeace ? "rgba(127,166,106,0.12)" : "transparent", opacity: canPeace ? 1 : 0.4 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 13, color: canPeace ? C.sage : C.parchmentMuted, letterSpacing: 1 }}>{applyParams(t("cb.diyet"), [pcost])}</Text>
                    </Pressable>
                    <Pressable onPress={() => setDiyetAcik(!diyetAcik)} hitSlop={8} style={{ alignSelf: "center", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 5, borderWidth: 1, borderColor: (diyetAcik ? C.gold : C.goldDim) + "88", backgroundColor: diyetAcik ? "rgba(201,168,76,0.14)" : "transparent" }}>
                      <Text style={{ fontFamily: F.display, fontSize: 13, color: ds!.yuzde >= 60 ? C.sage : ds!.yuzde <= 25 ? C.blood : C.gold }}>{yuzdeL(ds!.yuzde, lang)}</Text>
                    </Pressable>
                  </View>
                  {diyetAcik ? (
                    <View style={{ paddingTop: 8 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.goldDim, marginBottom: 4 }}>{t("sans.title")}</Text>
                      {ds!.kalemler.map((x, i) => (
                        <View key={i} style={{ flexDirection: "row", paddingVertical: 2 }}>
                          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchmentDim }}>{t(x.k)}</Text>
                          <Text style={{ fontFamily: F.display, fontSize: 13, color: x.v > 0 ? C.sage : C.blood }}>{x.v > 0 ? "+" + x.v : x.v}</Text>
                        </View>
                      ))}
                      <View style={{ flexDirection: "row", paddingTop: 4, marginTop: 3, borderTopWidth: 1, borderTopColor: C.border }}>
                        <Text style={{ flex: 1, fontFamily: F.display, fontSize: 13, color: C.parchment }}>{t("sans.toplam")}</Text>
                        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{yuzdeL(ds!.yuzde, lang)}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              );
              return (
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  <Pressable disabled={!canFight} onPress={beginNemesis} style={{ paddingVertical: 8, paddingHorizontal: 18, borderRadius: 5, borderWidth: 1, borderColor: "rgba(200,60,60,0.7)", backgroundColor: "rgba(200,60,60,0.2)", opacity: canFight ? 1 : 0.4 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 13, color: C.blood, letterSpacing: 1 }}>{t("cb.settle")}</Text>
                  </Pressable>
                  <Pressable disabled={!canPeace} onPress={() => { hap("tap"); apply((s) => reconcileNemesis(s)); }} style={{ paddingVertical: 8, paddingHorizontal: 18, borderRadius: 5, borderWidth: 1, borderColor: canPeace ? "rgba(127,166,106,0.6)" : C.border, backgroundColor: canPeace ? "rgba(127,166,106,0.12)" : "transparent", opacity: canPeace ? 1 : 0.4 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 13, color: canPeace ? C.sage : C.parchmentMuted, letterSpacing: 1 }}>{applyParams(t("cb.peaceOffer"), [pcost])}</Text>
                  </Pressable>
                </View>
              );
            })()}
          </View>
        )}
        {(() => {
          const kd = (state.kanDefteri || []).filter((x) => x.tur !== "canborcu");
          if (!kd.length || p.dead) return null;
          return (
            <View style={{ backgroundColor: "rgba(120,20,20,0.08)", borderWidth: 1, borderColor: "rgba(200,60,60,0.35)", borderRadius: 5, padding: 13, marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}><GameIcon name="tombstone" size={13} color={C.blood} /><Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.blood }}>{t("kd.baslik").toUpperCase()}</Text></View>
              {kd.map((x) => {
                const k = kisiProfil(state, x.id, lang); if (!k) return null;
                const o = x.olen ? kisiProfil(state, x.olen, lang) : null;
                const neden = x.tur === "yuzkarasi" ? t("kd.donus") : o ? applyParams(t("kd.satir"), ["", yakAdi(x.yak, o.npc.gender), o.npc.name]).trim() : "";
                const durum = k.npc.age < 16 ? t("kd.cocuk") : state.turn >= x.vade ? t("kd.yakin") : t("kd.bekliyor");
                return (
                  <View key={x.id} style={{ paddingVertical: 4 }}>
                    <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchment }}>{k.npc.name}<Text style={{ color: C.parchmentDim }}>{neden ? " · " + neden : ""}</Text></Text>
                    <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted }}>{durum}</Text>
                  </View>
                );
              })}
            </View>
          );
        })()}
        {p.age >= 14 && (() => {
          const tcost = trainCost(state);
          const canTrain = p.money >= tcost && p.train_turn !== state.turn && !p.dead;
          return (
            <View style={{ backgroundColor: "rgba(224,188,90,0.05)", borderWidth: 1, borderColor: "rgba(224,188,90,0.3)", borderRadius: 5, padding: 13, marginBottom: 12 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.goldDim }}>{t("cb.trainTitle").toUpperCase()}</Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, marginTop: 3 }}>{t("cb.trainDesc")}</Text>
              <Pressable disabled={!canTrain} onPress={() => { hap("tap"); apply((s) => trainCombat(s)); }} style={{ alignSelf: "flex-start", marginTop: 9, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 5, borderWidth: 1, borderColor: canTrain ? "rgba(224,188,90,0.5)" : C.border, backgroundColor: canTrain ? "rgba(224,188,90,0.12)" : "transparent", opacity: canTrain ? 1 : 0.4 }}>
                <Text style={{ fontFamily: F.display, fontSize: 13, color: canTrain ? C.gold : C.parchmentMuted }}>{applyParams(t("cb.train"), [tcost])}</Text>
              </Pressable>
            </View>
          );
        })()}
        {p.age >= 16 && (() => {
          const n = p.retinue || 0;
          const hcost = retinueHireCost(state);
          const wage = retinueWage(state);
          const canHire = n < RETINUE_MAX && p.money >= hcost && !inJail(p);
          return (
            <View style={{ backgroundColor: "rgba(127,166,106,0.06)", borderWidth: 1, borderColor: "rgba(127,166,106,0.35)", borderRadius: 5, padding: 13, marginBottom: 12 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.goldDim }}>{t("ret.title").toUpperCase()}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchment, marginTop: 4 }}>{applyParams(t("ret.status"), [n, RETINUE_MAX])}{n > 0 ? " · " + applyParams(t("ret.wage"), [wage]) : ""}</Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, marginTop: 2 }}>{t("ret.desc")}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 9 }}>
                <Pressable disabled={!canHire} onPress={() => { hap("tap"); apply((s) => hireGuard(s)); }} style={{ flex: 1, paddingVertical: 9, borderRadius: 5, borderWidth: 1, borderColor: canHire ? "rgba(127,166,106,0.5)" : C.border, alignItems: "center", opacity: canHire ? 1 : 0.4 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: canHire ? C.sage : C.parchmentMuted }}>{applyParams(t("ret.hire"), [hcost])}</Text>
                </Pressable>
                {n > 0 && (
                  <Pressable onPress={() => { hap("tap"); apply((s) => dismissGuards(s)); }} style={{ flex: 1, paddingVertical: 9, borderRadius: 5, borderWidth: 1, borderColor: C.border, alignItems: "center" }}>
                    <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchmentMuted }}>{t("ret.dismiss")}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })()}
        {(() => {
          const won = Object.keys(p.enc_won || {});
          if (!won.length) return null;
          return (
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.goldDim }}>{t("cb.legendBook")}</Text>
              {won.map((id) => (
                <Text key={id} style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.goldBright }}>❧ {gt("enc." + id + ".t", id)}</Text>
              ))}
            </View>
          );
        })()}
        {ENCOUNTERS.filter((e) => !e.minFame || p.fame >= e.minFame).map((e) => {
          const tooStrong = e.power > pw + 8;
          return (
            <View key={e.id} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 5, padding: 14, marginBottom: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontFamily: F.display, fontSize: 14, color: C.parchment }}>{gt("enc." + e.id + ".t", e.title)}{p.enc_won && p.enc_won[e.id] ? " ❧" : ""}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 13, color: tooStrong ? C.blood : C.goldDim }}>{t("cb.enemyPower")} {e.power}</Text>
              </View>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, marginTop: 5, lineHeight: 22 }}>{gt("enc." + e.id + ".d", e.desc)}</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.goldDim }}>{t("cb.reward")} +{Math.round(e.reward * inflationFactor(state))}⚜ · {t("cb.fame")} +{e.fame}</Text>
                <Pressable disabled={!canFight} onPress={() => begin(e.id)} style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 5, borderWidth: 1, borderColor: "rgba(168,52,52,0.55)", backgroundColor: canFight ? "rgba(168,52,52,0.14)" : C.card }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: canFight ? C.blood : C.parchmentMuted, letterSpacing: 1 }}>{t("cb.fight")}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
        {(() => {
          const locked = ENCOUNTERS.filter((e) => e.minFame && p.fame < e.minFame).sort((x, y) => (x.minFame || 0) - (y.minFame || 0))[0];
          if (!locked) return null;
          return (
            <View style={{ borderWidth: 1, borderColor: C.border, borderStyle: "dashed" as const, borderRadius: 5, padding: 12, marginBottom: 10, opacity: 0.85 }}>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, lineHeight: 22 }}>
                {applyParams(t("cb.legendTeaser"), [locked.minFame || 0])}
              </Text>
            </View>
          );
        })()}
      </ScrollView>
    </ScreenFresk>
  );
}
