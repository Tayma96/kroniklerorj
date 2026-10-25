import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { View, Text, ScrollView} from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { INVESTMENTS, WILL_STYLES, LAST_WORDS, investInChild, heirPreview, yetenekAdaylari, asabiyeBandi, EDU_TRACKS, eduLevel, evlatYasi, childCareerChance, setChildEducation, childNature, evlatKadinMi, favorChild, addDowry, propAylikTahmin, varisAdayDetaylari, yasayanEvlatAdlari } from "../../lib/game";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";
import { useI18n, applyParams, yuzdeL } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { BackLabel, GameButton, PageHeader, ScreenFresk } from "../../lib/ui";
import { YetenekSecici } from "../../lib/soy-ui";

const HEIR_ATTRIBUTE_KEYS = ["strength", "intelligence", "charisma", "stamina"] as const;
const HEIR_SKILL_KEYS = ["combat", "trade", "crafting", "social"] as const;
const BASE_HEIR_STATS = { strength: 1, intelligence: 1, charisma: 1, stamina: 2 };

export default function Nesil() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply, varisleDevam } = useGame();
  const { t, lang } = useI18n();
  const [heir, setHeir] = useState<string | null>(null);
  const [will, setWill] = useState<string>(state?.player.will_pref || "esit"); // hanedanda önceden seçilen vasiyet burada varsayılan olur
  const [lw, setLw] = useState<string>("helalles"); // son söz — devir anında bir kez seçilir, vârise temalı iz bırakır
  const [yet, setYet] = useState<string | null>(null); // Hanedan Defteri: ölümde seçilen tek soy yeteneği
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const livingChildren = yasayanEvlatAdlari(state), heirRows = varisAdayDetaylari(state), eligible = heirRows.filter((x) => x.uygun), chosenHeir = (heir && eligible.find((x) => x.key === heir)) || eligible[0];

  return (
    <ScreenFresk style={{ paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <View style={{ width: 40 }} />
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{p.money} ⚜</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        <PageHeader kicker={t("scr.nesil")} title={t("scr.nesil")} />
        {(p.dead && !eligible.length) || (!p.dead && !livingChildren.length) ? (
          <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, textAlign: "center", marginTop: 30 }}>
            {t(p.dead ? "evlat.heir.noneAll" : "nes.noChildren")}
          </Text>
        ) : p.dead ? (
          <>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchment, marginBottom: 12 }}>
              {t("nes.deadPrompt")}
            </Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.goldDim, marginBottom: 12, lineHeight: 22 }}>{t("asabiye." + asabiyeBandi(state))}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: C.goldDim, marginBottom: 8 }}>{t("nes.chooseHeir")}</Text>
            {heirRows.map((a) => {
              const pv = heirPreview(state, a.key, will, yet || undefined, lw), selected = chosenHeir?.key === a.key;
              const attributes = HEIR_ATTRIBUTE_KEYS.filter((key) => pv.stats[key] !== BASE_HEIR_STATS[key]).map((key) => `${t("st." + key)} ${pv.stats[key] - BASE_HEIR_STATS[key] > 0 ? "+" : ""}${pv.stats[key] - BASE_HEIR_STATS[key]}`);
              const skills = HEIR_SKILL_KEYS.filter((key) => pv.skills[key] > 0).map((key) => `${t("skill." + key)} +${pv.skills[key]}`);
              const preview = t("nes.preview").replace("%1", String(pv.points)).replace("%2", String(pv.money)).replace("%3", String(pv.rep));
              const accessibilityLabel = [a.ad, t("varis.role." + a.tur), preview, attributes.length ? `${t("char.attrs")}: ${attributes.join(", ")}` : "", skills.length ? `${t("char.skills")}: ${skills.join(", ")}` : ""].filter(Boolean).join(". ");
              return (
              <Pressable key={a.key} testID={"heir-" + a.key} accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled: !pv.available, selected }} disabled={!pv.available} onPress={() => setHeir(a.key)} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 58, padding: 12, borderRadius: 5, borderWidth: 1, marginBottom: 7, borderColor: selected ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: selected ? "rgba(201,168,76,0.12)" : C.card, opacity: pv.available ? 1 : .58 }}>
                <GameIcon name={pv.age >= 13 ? "meslek" : pv.age >= 7 ? "mektep" : "baby"} size={16} color={pv.available ? C.gold : C.parchmentMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{a.ad}</Text>
                  <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.sage, marginTop: 1 }}>{a.tur === "evlat" ? <>{(() => { const nk = "nat." + childNature(a.ad, p.generation); const kv = t(nk + ".k"); return evlatKadinMi(a.ad) && kv !== nk + ".k" ? kv : t(nk); })()}{p.child_bond?.[a.ad] != null ? ` · ${t("char.bond")} ${p.child_bond[a.ad]}` : ""}</> : t("varis.role." + a.tur)}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.goldDim, marginTop: 2 }}>{preview}</Text>
                  {attributes.length > 0 && <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: C.parchmentMuted, marginTop: 3 }}>{t("char.attrs")}: {attributes.join(" · ")}</Text>}
                  {skills.length > 0 && <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: C.parchmentMuted, marginTop: 2 }}>{t("char.skills")}: {skills.join(" · ")}</Text>}
                </View>
                <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 22, color: C.parchmentMuted, maxWidth: 105 }}>{!pv.available ? t("npc.late") : !pv.ageKnown ? t("evlat.heir.unknown") : pv.children > 0 ? t("torun.heir").replace("%1", String(pv.age)).replace("%2", String(pv.children)) : t("evlat.heir.age").replace("%1", String(pv.age))}</Text>
                {a.tur === "evlat" && (p.child_invests?.[a.ad]?.length || 0) > 0 && <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.goldDim }}>{p.child_invests[a.ad].length} {t("nes.invests")}</Text>}
                {a.tur === "evlat" && p.child_edu?.[a.ad] && eduLevel(p.child_edu[a.ad].weeks) > 0 && <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.gold }}>{t("edu.track." + p.child_edu[a.ad].track)} {eduLevel(p.child_edu[a.ad].weeks)}</Text>}
                {selected && <Text style={{ color: C.gold }}>✓</Text>}
              </Pressable>
            ); })}
            <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: C.goldDim, marginTop: 12, marginBottom: 8 }}>{t("nes.will")}</Text>
            {p.properties.length > 0 && (() => { const wf = (WILL_STYLES.find((w) => w.id === will) || WILL_STYLES[0]).frac; const gecen = p.properties.slice(0, Math.max(1, Math.ceil(p.properties.length * wf))); const net = gecen.reduce((a, pr) => a + propAylikTahmin(state, pr), 0); return (
              <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, marginBottom: 8 }}>{applyParams(t("nes.tapu"), [gecen.length, p.properties.length, (net >= 0 ? "+" : "") + net])}</Text>
            ); })()}
            {WILL_STYLES.map((w) => (
              <Pressable key={w.id} onPress={() => setWill(w.id)} style={{ padding: 12, borderRadius: 5, borderWidth: 1, marginBottom: 7, borderColor: will === w.id ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: will === w.id ? "rgba(201,168,76,0.12)" : C.card }}>
                <Text style={{ fontFamily: F.display, fontSize: 13, color: will === w.id ? C.gold : C.parchment }}>{t("will." + w.id + ".l")}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentMuted, marginTop: 2 }}>{t("will." + w.id + ".d")}</Text>
              </Pressable>
            ))}
            <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: C.goldDim, marginTop: 12, marginBottom: 8 }}>{t("nes.lastWords")}</Text>
            {LAST_WORDS.map((w) => (
              <Pressable key={w.id} onPress={() => setLw(w.id)} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 5, borderWidth: 1, marginBottom: 7, borderColor: lw === w.id ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: lw === w.id ? "rgba(201,168,76,0.12)" : C.card }}>
                <GameIcon name={w.icon} size={16} color={lw === w.id ? C.gold : C.parchmentDim} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: lw === w.id ? C.gold : C.parchment }}>{t("lw." + w.id + ".l")}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentMuted, marginTop: 2 }}>{t("lw." + w.id + ".d")}</Text>
                </View>
              </Pressable>
            ))}
            <YetenekSecici adaylar={yetenekAdaylari(state)} secili={yet} onSec={setYet} />
            <GameButton accessibilityLabel={t("dash.continueHeir")} icon="hanedan" haptic="heavy" onPress={() => { varisleDevam(will, chosenHeir?.key, lw, yet || undefined); router.replace("/oyun"); }} style={{ marginTop: 12 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.inkOnGold, letterSpacing: 1.5, textAlign: "center" }}>{t("dash.continueHeir")}</Text>
            </GameButton>
          </>
        ) : (
          <>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, marginBottom: 12 }}>
              {t("nes.investPrompt")}
            </Text>
            <View style={{ backgroundColor: "rgba(201,168,76,0.05)", borderWidth: 1, borderColor: "rgba(201,168,76,0.3)", borderRadius: 5, padding: 13, marginBottom: 12 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.goldDim }}>{t("nes.dowryTitle").toUpperCase()}</Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, marginTop: 3 }}>{t("nes.dowryDesc")}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold, marginTop: 7 }}>{t("nes.dowryAmt").replace("%1", String(p.dowry_chest || 0))}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                {[25, 100].map((amt) => {
                  const can = p.money >= amt && !p.dead && livingChildren.length > 0;
                  return (
                    <Pressable key={amt} disabled={!can} onPress={() => { hap("tap"); apply((s) => addDowry(s, amt)); }} style={{ paddingVertical: 7, paddingHorizontal: 14, borderRadius: 5, borderWidth: 1, borderColor: can ? "rgba(201,168,76,0.5)" : C.border, backgroundColor: can ? "rgba(201,168,76,0.1)" : "transparent", opacity: can ? 1 : 0.4 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 13, color: can ? C.gold : C.parchmentMuted }}>+{amt} ⚜</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            {livingChildren.map((c) => {
              const invs = p.child_invests?.[c] || [];
              const age = evlatYasi(state, c);
              const educationOpen = age >= 7 && age < 18;
              return (
                <View key={c} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 5, padding: 14, marginBottom: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Text style={{ flex: 1, fontFamily: F.display, fontSize: 14, color: C.gold }}>{c}{state.succession?.favored === c ? " ❧" : ""}</Text>
                    {p.age >= 35 && livingChildren.length >= 2 && state.succession?.favored !== c && (
                      <Pressable onPress={() => { hap("tap"); apply((s) => favorChild(s, c)); }} style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 5, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)" }}>
                        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{t("succ.favorBtn")}</Text>
                      </Pressable>
                    )}
                  </View>
                  {state.succession?.favored === c && <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.goldDim, marginTop: -4, marginBottom: 8 }}>{t("succ.favoredLine")}</Text>}
                  {INVESTMENTS.map((inv) => {
                    const done = invs.includes(inv.id);
                    const afford = p.money >= inv.cost;
                    return (
                      <Pressable key={inv.id} disabled={done || !afford} onPress={() => { hap("tap"); apply((s) => investInChild(s, c, inv.id)); }} style={{ flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border, opacity: done ? 0.6 : afford ? 1 : 0.5 }}>
                        <GameIcon name={inv.icon} size={15} color={done ? C.gold : C.goldDim} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{t("inv." + inv.id + ".l")}</Text>
                          <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentMuted }}>{t("inv." + inv.id + ".d")}</Text>
                        </View>
                        <Text style={{ fontFamily: F.display, fontSize: 13, color: done ? C.gold : C.parchmentMuted }}>{done ? "✓" : `${inv.cost}⚜`}</Text>
                      </Pressable>
                    );
                  })}
                  {/* Süregelen eğitim yolu — haftalık emek/akçe biriktirir, vâris olunca ölçekli bonus verir */}
                  <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.goldDim, marginTop: 12, marginBottom: 3 }}>{t("edu.head")}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentMuted, marginBottom: 7 }}>{t(age < 13 ? "edu.hint" : age >= 18 ? "edu.hint.closed" : p.child_edu?.[c] ? "edu.hint.after" : "edu.hint.after.none")}</Text>
                  <Text style={{ fontFamily: F.serifItalic, fontSize: 14, color: C.goldDim, marginBottom: 7 }}>{t("edu.ageNote")}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {EDU_TRACKS.map((tr) => {
                      const on = p.child_edu?.[c]?.track === tr.id;
                      const afford = p.money >= tr.monthly;
                      return (
                        <Pressable key={tr.id} disabled={!on && (!afford || !educationOpen)} onPress={() => { hap("tap"); apply((s) => setChildEducation(s, c, on ? null : tr.id)); }} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 5, borderWidth: 1, borderColor: on ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: on ? "rgba(201,168,76,0.12)" : C.card, opacity: !on && (!afford || !educationOpen) ? 0.5 : 1 }}>
                          <GameIcon name={tr.icon} size={13} color={on ? C.gold : C.goldDim} />
                          <Text style={{ fontFamily: F.display, fontSize: 13, color: on ? C.gold : C.parchment }}>{t("edu.track." + tr.id)}</Text>
                          <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentMuted }}>{t("edu.cost").replace("%1", String(tr.monthly))}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {p.child_edu?.[c] && (
                    <View style={{ marginTop: 6, gap: 3 }}>
                      <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.goldDim }}>
                        {t("edu.months").replace("%1", String(p.child_edu[c].weeks))} · {eduLevel(p.child_edu[c].weeks) > 0 ? t("edu.proj").replace("%1", String(eduLevel(p.child_edu[c].weeks))) : t("edu.notyet")}
                      </Text>
                      {age < 13 && <Text style={{ fontFamily: F.serifItalic, fontSize: 14, color: C.goldDim }}>{t("edu.careerHint").replace("%1", yuzdeL(Math.round(childCareerChance(state, c) * 100), lang))}</Text>}
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </ScreenFresk>
  );
}
