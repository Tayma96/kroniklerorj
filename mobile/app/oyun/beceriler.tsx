import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { SKILL_META, PERKS, hasPerk, pendingPerkTier, choosePerk, SkillKey, Perk, HunerTur, HunerKilit, kademeKilidi, kademeEsigi, niyetDali, aktifNiyet, hunerUnvanlari, skillProgress, BECERI_TAVAN, USTALIK_SINIRI, type NiyetId } from "../../lib/game";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";
import { useI18n, applyParams } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { BackLabel, PageHeader, ScreenFresk } from "../../lib/ui";
import { Giris, yon } from "../../lib/sayfa/karakter/parca";

// K3: 4 dal × 4 kademe (beceri 4/8/12/16; aktif niyetin dalında bir seviye erken). Bir ömre iki ustalık.
const TIERS = [1, 2, 3, 4];
// Her beceri dalının ilgili özelliği (stat) + tonu.
const LINK: Record<SkillKey, { stat: "strength" | "intelligence" | "charisma" | "stamina"; tone: string }> = {
  combat:   { stat: "strength",     tone: C.emberSoft },
  trade:    { stat: "charisma",     tone: C.gold }, // pazarlık formülü karizma okur
  crafting: { stat: "intelligence", tone: "#7FA66A" }, // zanaat meslekleri ağırlıkla zekâ stat'ı çalıştırır
  social:   { stat: "charisma",     tone: C.frost },
};
const TUR_IKON: Record<HunerTur, string> = { secenek: "compass", zar: "scales", sistem: "cog" };

function kilitMetni(k: HunerKilit, tree: SkillKey, t: (k: string) => string): string {
  if (!k) return "";
  if (k.tur === "beceri") return applyParams(t("huner.kilit.beceri"), [t("skill." + tree), k.esik]);
  if (k.tur === "onceki") return applyParams(t("huner.kilit.onceki"), [k.tier]);
  return t("huner.kilit.ustalik");
}

// ── Genel bakış: dört dal bir arada + hüner ve ustalık ilerlemesi ──
function Overview({ niyet }: { niyet?: NiyetId }) {
  const { state } = useGame();
  const { t, lang } = useI18n();
  const { row, ta } = yon(lang);
  const p = state!.player;
  const chosen = PERKS.filter((pk) => hasPerk(p, pk.id)).length;
  const unvan = hunerUnvanlari(p);
  const pending = SKILL_META.reduce((n, m) => n + (pendingPerkTier(p, m.key, niyet) != null ? 1 : 0), 0);
  return (
    <View style={{ backgroundColor: C.cardHi, borderWidth: 1, borderColor: C.borderHi, borderRadius: 5, padding: 14, marginBottom: 14 }}>
      <View style={{ flexDirection: row, alignItems: "center", justifyContent: "space-between", marginBottom: 11, gap: 8 }}>
        <Text style={{ flexShrink: 1, fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: C.gold, textTransform: "uppercase", textAlign: ta }}>{t("bec.overview")}</Text>
        <View accessible accessibilityLabel={applyParams(t("huner.ozet"), [chosen, unvan.length, USTALIK_SINIRI])} style={{ flexShrink: 1, flexDirection: row, alignItems: "center", gap: 5 }}>
          <GameIcon name="medal" size={12} color={C.gold} />
          <Text numberOfLines={2} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 13, color: C.gold, textAlign: ta }}>{applyParams(t("huner.ozet"), [chosen, unvan.length, USTALIK_SINIRI])}</Text>
        </View>
      </View>
      {SKILL_META.map((m) => {
        const link = LINK[m.key];
        const lvl = p.skills[m.key];
        const pend = pendingPerkTier(p, m.key, niyet) != null;
        return (
          <View key={m.key} accessible accessibilityLabel={`${t("skill." + m.key)} ${lvl}/${BECERI_TAVAN}${unvan.includes(m.key) ? ", " + t("huner.unvan." + m.key) : ""}`} style={{ flexDirection: row, alignItems: "center", gap: 10, marginBottom: 9 }}>
            <View style={{ width: 30, height: 30, borderRadius: 5, backgroundColor: link.tone + "1A", borderWidth: 1, borderColor: link.tone + "55", alignItems: "center", justifyContent: "center" }}>
              <GameIcon name={m.icon} size={15} color={link.tone} />
            </View>
            <Text numberOfLines={1} style={{ width: 64, fontFamily: F.display, fontSize: 13, color: C.parchment, textAlign: ta }}>{t("skill." + m.key)}</Text>
            {/* 20 seviyelik şerit: 10 bölme, her bölme iki seviye (yarım dolu = tek seviye) */}
            <View style={{ flex: 1, flexDirection: row, gap: 2 }}>
              {Array.from({ length: 10 }).map((_, i) => {
                const dolu = Math.max(0, Math.min(2, lvl - i * 2));
                return <View key={i} style={{ flex: 1, height: 7, borderRadius: 2, backgroundColor: dolu === 2 ? link.tone : dolu === 1 ? link.tone + "77" : "rgba(255,255,255,0.07)" }} />;
              })}
            </View>
            <Text style={{ minWidth: 22, textAlign: "center", fontFamily: F.display, fontSize: 13, color: link.tone }}>{lvl}</Text>
            {pend ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.gold }} /> : <View style={{ width: 7 }} />}
          </View>
        );
      })}
      {pending > 0 && (
        <View style={{ flexDirection: row, alignItems: "center", gap: 6, marginTop: 3, paddingTop: 9, borderTopWidth: 1, borderTopColor: C.border }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.gold }} />
          <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, color: C.gold, textAlign: ta }}>{applyParams(t("bec.pendingHint"), [pending])}</Text>
        </View>
      )}
    </View>
  );
}

function HunerKarti({ pk, tone, isChosen, dimmed, choosable, onPick }: { pk: Perk; tone: string; isChosen: boolean; dimmed: boolean; choosable: boolean; onPick: () => void }) {
  const { t, lang } = useI18n();
  const { row, ta } = yon(lang);
  const ad = t("perk." + pk.id + ".l"), etki = t("huner." + pk.id + ".e"), tur = t("huner.tur." + pk.tur);
  const durum = isChosen ? t("huner.durum.secildi") : choosable ? t("huner.durum.secilebilir") : t("huner.durum.kapali");
  return (
    <Pressable disabled={!choosable} onPress={onPick} accessibilityRole="button" accessibilityState={{ disabled: !choosable, selected: isChosen }}
      accessibilityLabel={`${ad}. ${tur}. ${etki} ${durum}`}
      style={{ flexDirection: row, alignItems: "center", gap: 8, minHeight: 44, padding: 10, borderRadius: 5, borderWidth: 1, marginBottom: 6,
        borderColor: isChosen ? tone + "99" : choosable ? tone + "55" : C.border,
        backgroundColor: isChosen ? tone + "1F" : C.bg, opacity: dimmed ? 0.45 : 1 }}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: row, alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Text style={{ flexShrink: 1, fontFamily: F.display, fontSize: 13, color: isChosen ? tone : C.parchment, textAlign: ta }}>{ad}</Text>
          <View style={{ flexDirection: row, alignItems: "center", gap: 3, paddingHorizontal: 6, minHeight: 20, borderRadius: 10, borderWidth: 1, borderColor: tone + "66" }}>
            <GameIcon name={TUR_IKON[pk.tur]} size={10} color={tone} />
            <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 0.5, color: tone }}>{tur}</Text>
          </View>
        </View>
        <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: C.parchmentMuted, marginTop: 2, textAlign: ta }}>{etki}</Text>
      </View>
      {isChosen && <GameIcon name="medal" size={14} color={tone} />}
      {choosable && !isChosen && <Text style={{ fontFamily: F.display, fontSize: 13, color: tone, letterSpacing: 1 }}>{t("bec.pick")}</Text>}
    </Pressable>
  );
}

function Tree({ tree, icon, niyet, i }: { tree: SkillKey; icon: string; niyet?: NiyetId; i: number }) {
  const { state, apply } = useGame();
  const { t, lang } = useI18n();
  const { row, ta } = yon(lang);
  const p = state!.player;
  const lvl = p.skills[tree];
  const inLevel = Math.round(skillProgress(p.skill_xp[tree]) * 100);
  const pending = pendingPerkTier(p, tree, niyet);
  const link = LINK[tree];
  const erken = niyetDali(niyet) === tree;
  const unvan = hunerUnvanlari(p).includes(tree);
  const nextTier = TIERS.find((tn) => lvl < kademeEsigi(tree, tn, niyet));

  return (
    <Giris i={i}>
    <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: pending ? link.tone + "AA" : link.tone + "33", borderRadius: 5, padding: 14, marginBottom: 14, overflow: "hidden" }}>
      {/* Başlık */}
      <View style={{ flexDirection: row, alignItems: "center", gap: 11 }}>
        <View style={{ width: 46, height: 46, borderRadius: 5, backgroundColor: link.tone + "1A", borderWidth: 1.5, borderColor: link.tone + "66", alignItems: "center", justifyContent: "center" }}>
          <GameIcon name={icon} size={24} color={link.tone} />
        </View>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 15, color: C.parchment, textAlign: ta }}>{t("skill." + tree)} · {t("bec.lv")} {lvl}/{BECERI_TAVAN}</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: unvan ? C.goldBright : C.parchmentMuted, textAlign: ta }}>{unvan ? applyParams(t("huner.unvanSatir"), [t("huner.unvan." + tree)]) : t("skill." + tree + ".b")}</Text>
        </View>
        {pending != null && (
          <View style={{ backgroundColor: link.tone, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 9 }}>
            <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 0.5, color: C.inkOnGold }}>{t("bec.pick")}!</Text>
          </View>
        )}
      </View>

      {/* Seviye çubuğu */}
      <View style={{ marginTop: 11 }}>
        <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 0.5, color: C.parchmentMuted, marginBottom: 4, textAlign: ta }}>{t("bec.grows").toUpperCase()}: {t("bec.how." + tree)}</Text>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.07)", overflow: "hidden", flexDirection: row }}>
          <View style={{ width: `${inLevel}%`, height: 6, borderRadius: 3, backgroundColor: link.tone }} />
        </View>
        <View style={{ flexDirection: row, justifyContent: "space-between", marginTop: 4, gap: 8 }}>
          <Text style={{ flexShrink: 1, fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentDim, textAlign: ta }}>{t("bec.stat")}: {t("st." + link.stat)} {p.stats[link.stat]}</Text>
          <Text style={{ flexShrink: 1, fontFamily: F.display, fontSize: 13, color: link.tone }}>{nextTier ? applyParams(t("huner.sonraki"), [kademeEsigi(tree, nextTier, niyet)]) : t("bec.maxed")}</Text>
        </View>
        {erken && (
          <View style={{ flexDirection: row, alignItems: "center", gap: 6, marginTop: 6 }}>
            <GameIcon name="compass" size={13} color={link.tone} />
            <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, color: link.tone, textAlign: ta }}>{t("huner.niyetErken")}</Text>
          </View>
        )}
      </View>

      {/* ── Ağaç: omurga + kademe düğümleri ── */}
      <View style={{ marginTop: 14 }}>
        {TIERS.map((tn, ti) => {
          const tierPerks = PERKS.filter((pk) => pk.tree === tree && pk.tier === tn);
          const chosen = tierPerks.find((pk) => hasPerk(p, pk.id));
          const kilit = chosen ? null : kademeKilidi(p, tree, tn, niyet);
          const esik = kademeEsigi(tree, tn, niyet);
          const unlocked = lvl >= esik;
          const choosable = !chosen && !kilit && pending === tn;
          const nodeFill = chosen || choosable ? link.tone : "rgba(255,255,255,0.06)";
          const nodeBorder = unlocked ? link.tone : "rgba(255,255,255,0.18)";
          const ust = (k: number) => lvl >= kademeEsigi(tree, k, niyet);
          return (
            <View key={tn} style={{ flexDirection: row }}>
              {/* Ray: bağ çizgisi + düğüm */}
              <View style={{ width: 34, alignItems: "center" }}>
                {ti > 0 && <View style={{ position: "absolute", top: 0, height: 22, width: 2, backgroundColor: unlocked ? link.tone + "88" : "rgba(255,255,255,0.12)" }} />}
                <View style={{ marginTop: 14, width: 26, height: 26, borderRadius: 5, borderWidth: 2, borderColor: nodeBorder, backgroundColor: nodeFill, alignItems: "center", justifyContent: "center" }}>
                  {chosen ? <GameIcon name="medal" size={12} color={C.inkOnGold} /> : <Text style={{ fontFamily: F.display, fontSize: 13, color: unlocked ? (choosable ? C.inkOnGold : link.tone) : C.parchmentMuted }}>{tn}</Text>}
                </View>
                {ti < TIERS.length - 1 && <View style={{ flex: 1, marginTop: 2, width: 2, backgroundColor: ust(TIERS[ti + 1]) ? link.tone + "88" : "rgba(255,255,255,0.12)" }} />}
              </View>

              {/* Kademe içeriği */}
              <View style={{ flex: 1, paddingBottom: 14, paddingTop: 12, opacity: unlocked || chosen ? 1 : 0.6 }}>
                <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.2, color: link.tone, marginBottom: 6, textAlign: ta }}>
                  {applyParams(t("huner.kademe"), [tn, esik])} {chosen ? t("bec.chosen") : choosable ? t("bec.choose") : t("bec.locked")}
                </Text>
                {kilit && (
                  <View style={{ flexDirection: row, alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <GameIcon name="prisoner" size={12} color={C.parchmentMuted} />
                    <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, textAlign: ta }}>{kilitMetni(kilit, tree, t)}</Text>
                  </View>
                )}
                {tierPerks.map((pk) => {
                  const isChosen = chosen?.id === pk.id;
                  return <HunerKarti key={pk.id} pk={pk} tone={link.tone} isChosen={isChosen} dimmed={!!chosen && !isChosen} choosable={choosable}
                    onPick={() => { hap("success"); apply((st) => choosePerk(st, pk.id)); }} />;
                })}
              </View>
            </View>
          );
        })}
      </View>
    </View>
    </Giris>
  );
}

export default function Beceriler() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state } = useGame();
  const { t } = useI18n();
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const niyet = aktifNiyet(state);
  return (
    <ScreenFresk style={{ paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t("common.back")} style={{ minHeight: 44, justifyContent: "center" }}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 100 }}>
        <PageHeader kicker={t("scr.beceriler")} title={t("scr.beceriler")} sub={t("huner.intro")} />
        <Overview niyet={niyet} />
        {SKILL_META.map((m, i) => <Tree key={m.key} tree={m.key} icon={m.icon} niyet={niyet} i={i} />)}
      </ScrollView>
    </ScreenFresk>
  );
}
