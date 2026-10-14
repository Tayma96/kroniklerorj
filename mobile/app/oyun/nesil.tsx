import { View, Text, ScrollView, Pressable } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { INVESTMENTS, WILL_STYLES, LAST_WORDS, investInChild, heirPreview, yetenekAdaylari, asabiyeBandi, EDU_TRACKS, eduLevel, setChildEducation, childNature, evlatKadinMi, favorChild, addDowry, propAylikTahmin } from "../../lib/game";
import { GameIcon } from "../../lib/icons";
import { C, F } from "../../lib/theme";
import { useI18n, applyParams } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { BackLabel, PageHeader, ScreenFresk } from "../../lib/ui";
import { YetenekSecici } from "../../lib/soy-ui";
import { varisAdaylari } from "../../lib/game";

export default function Nesil() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply, varisleDevam } = useGame();
  const { t } = useI18n();
  const [heir, setHeir] = useState<string | null>(null);
  const [will, setWill] = useState<string>(state?.player.will_pref || "esit"); // hanedanda önceden seçilen vasiyet burada varsayılan olur
  const [lw, setLw] = useState<string>("helalles"); // son söz — devir anında bir kez seçilir, vârise temalı iz bırakır
  const [yet, setYet] = useState<string | null>(null); // Hanedan Defteri: ölümde seçilen tek soy yeteneği
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const eligible = varisAdaylari(state), chosenHeir = heir && eligible.includes(heir) ? heir : eligible[0];

  return (
    <ScreenFresk style={{ paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
        <View style={{ width: 40 }} />
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{p.money} ⚜</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }}>
        <PageHeader kicker={t("scr.nesil")} title={t("scr.nesil")} />
        {p.dead && !eligible.length || p.children.length === 0 ? (
          <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, textAlign: "center", marginTop: 30 }}>
            {t(p.children.length ? "evlat.heir.none" : "nes.noChildren")}
          </Text>
        ) : p.dead ? (
          <>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchment, marginBottom: 12 }}>
              {t("nes.deadPrompt")}
            </Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.goldDim, marginBottom: 12, lineHeight: 19 }}>{t("asabiye." + asabiyeBandi(state))}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginBottom: 8 }}>{t("nes.chooseHeir")}</Text>
            {p.children.map((c) => { const pv = heirPreview(state, c, will, yet || undefined); return (
              <Pressable key={c} testID={"heir-" + c} accessibilityRole="button" accessibilityState={{ disabled: !pv.available, selected: chosenHeir === c }} disabled={!pv.available} onPress={() => setHeir(c)} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 9, borderWidth: 1, marginBottom: 7, borderColor: chosenHeir === c ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: chosenHeir === c ? "rgba(201,168,76,0.12)" : C.card }}>
                <GameIcon name={pv.age >= 13 ? "meslek" : pv.age >= 7 ? "mektep" : "baby"} size={16} color={pv.available ? C.gold : C.parchmentMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{c}</Text>
                  <Text style={{ fontFamily: F.serifItalic, fontSize: 10, color: C.sage, marginTop: 1 }}>{(() => { const nk = "nat." + childNature(c, p.generation); const kv = t(nk + ".k"); return evlatKadinMi(c) && kv !== nk + ".k" ? kv : t(nk); })()}{p.child_bond?.[c] != null ? ` · ${t("char.bond")} ${p.child_bond[c]}` : ""}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 10, color: C.goldDim, marginTop: 2 }}>{t("nes.preview").replace("%1", String(pv.points)).replace("%2", String(pv.money)).replace("%3", String(pv.rep))}</Text>
                </View>
                <Text style={{ fontFamily: F.serif, fontSize: 11, lineHeight: 16, color: C.parchmentMuted, maxWidth: 105 }}>{!pv.available ? t("npc.late") : !pv.ageKnown ? t("evlat.heir.unknown") : pv.children > 0 ? t("torun.heir").replace("%1", String(pv.age)).replace("%2", String(pv.children)) : t("evlat.heir.age").replace("%1", String(pv.age))}</Text>
                {(p.child_invests?.[c]?.length || 0) > 0 && <Text style={{ fontFamily: F.serif, fontSize: 10, color: C.goldDim }}>{p.child_invests[c].length} {t("nes.invests")}</Text>}
                {p.child_edu?.[c] && eduLevel(p.child_edu[c].weeks) > 0 && <Text style={{ fontFamily: F.serif, fontSize: 10, color: C.gold }}>{t("edu.track." + p.child_edu[c].track)} {eduLevel(p.child_edu[c].weeks)}</Text>}
                {chosenHeir === c && <Text style={{ color: C.gold }}>✓</Text>}
              </Pressable>
            ); })}
            <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginTop: 12, marginBottom: 8 }}>{t("nes.will")}</Text>
            {p.properties.length > 0 && (() => { const wf = (WILL_STYLES.find((w) => w.id === will) || WILL_STYLES[0]).frac; const gecen = p.properties.slice(0, Math.max(1, Math.ceil(p.properties.length * wf))); const net = gecen.reduce((a, pr) => a + propAylikTahmin(state, pr), 0); return (
              <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted, marginBottom: 8 }}>{applyParams(t("nes.tapu"), [gecen.length, p.properties.length, (net >= 0 ? "+" : "") + net])}</Text>
            ); })()}
            {WILL_STYLES.map((w) => (
              <Pressable key={w.id} onPress={() => setWill(w.id)} style={{ padding: 12, borderRadius: 9, borderWidth: 1, marginBottom: 7, borderColor: will === w.id ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: will === w.id ? "rgba(201,168,76,0.12)" : C.card }}>
                <Text style={{ fontFamily: F.display, fontSize: 12, color: will === w.id ? C.gold : C.parchment }}>{t("will." + w.id + ".l")}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 2 }}>{t("will." + w.id + ".d")}</Text>
              </Pressable>
            ))}
            <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginTop: 12, marginBottom: 8 }}>{t("nes.lastWords")}</Text>
            {LAST_WORDS.map((w) => (
              <Pressable key={w.id} onPress={() => setLw(w.id)} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 9, borderWidth: 1, marginBottom: 7, borderColor: lw === w.id ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: lw === w.id ? "rgba(201,168,76,0.12)" : C.card }}>
                <GameIcon name={w.icon} size={16} color={lw === w.id ? C.gold : C.parchmentDim} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 12, color: lw === w.id ? C.gold : C.parchment }}>{t("lw." + w.id + ".l")}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 11, color: C.parchmentMuted, marginTop: 2 }}>{t("lw." + w.id + ".d")}</Text>
                </View>
              </Pressable>
            ))}
            <YetenekSecici adaylar={yetenekAdaylari(state)} secili={yet} onSec={setYet} />
            <Pressable onPress={() => { hap("heavy"); varisleDevam(will, chosenHeir, lw, yet || undefined); router.replace("/oyun"); }} style={{ marginTop: 12, paddingVertical: 15, borderRadius: 9, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.55)", backgroundColor: C.gold, alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.inkOnGold, letterSpacing: 1.5 }}>{t("dash.continueHeir")}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, marginBottom: 12 }}>
              {t("nes.investPrompt")}
            </Text>
            <View style={{ backgroundColor: "rgba(201,168,76,0.05)", borderWidth: 1, borderColor: "rgba(201,168,76,0.3)", borderRadius: 10, padding: 13, marginBottom: 12 }}>
              <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1.5, color: C.goldDim }}>{t("nes.dowryTitle").toUpperCase()}</Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted, marginTop: 3 }}>{t("nes.dowryDesc")}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold, marginTop: 7 }}>{t("nes.dowryAmt").replace("%1", String(p.dowry_chest || 0))}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                {[25, 100].map((amt) => {
                  const can = p.money >= amt && !p.dead;
                  return (
                    <Pressable key={amt} disabled={!can} onPress={() => { hap("tap"); apply((s) => addDowry(s, amt)); }} style={{ paddingVertical: 7, paddingHorizontal: 14, borderRadius: 7, borderWidth: 1, borderColor: can ? "rgba(201,168,76,0.5)" : C.border, backgroundColor: can ? "rgba(201,168,76,0.1)" : "transparent", opacity: can ? 1 : 0.4 }}>
                      <Text style={{ fontFamily: F.display, fontSize: 11, color: can ? C.gold : C.parchmentMuted }}>+{amt} ⚜</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            {p.children.map((c) => {
              const invs = p.child_invests?.[c] || [];
              return (
                <View key={c} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Text style={{ flex: 1, fontFamily: F.display, fontSize: 14, color: C.gold }}>{c}{state.succession?.favored === c ? " ❧" : ""}</Text>
                    {p.age >= 35 && p.children.length >= 2 && state.succession?.favored !== c && (
                      <Pressable onPress={() => { hap("tap"); apply((s) => favorChild(s, c)); }} style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)" }}>
                        <Text style={{ fontFamily: F.display, fontSize: 9.5, color: C.gold }}>{t("succ.favorBtn")}</Text>
                      </Pressable>
                    )}
                  </View>
                  {state.succession?.favored === c && <Text style={{ fontFamily: F.serifItalic, fontSize: 10, color: C.goldDim, marginTop: -4, marginBottom: 8 }}>{t("succ.favoredLine")}</Text>}
                  {INVESTMENTS.map((inv) => {
                    const done = invs.includes(inv.id);
                    const afford = p.money >= inv.cost;
                    return (
                      <Pressable key={inv.id} disabled={done || !afford} onPress={() => { hap("tap"); apply((s) => investInChild(s, c, inv.id)); }} style={{ flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border, opacity: done ? 0.6 : afford ? 1 : 0.5 }}>
                        <GameIcon name={inv.icon} size={15} color={done ? C.gold : C.goldDim} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchment }}>{t("inv." + inv.id + ".l")}</Text>
                          <Text style={{ fontFamily: F.serif, fontSize: 10, color: C.parchmentMuted }}>{t("inv." + inv.id + ".d")}</Text>
                        </View>
                        <Text style={{ fontFamily: F.display, fontSize: 11, color: done ? C.gold : C.parchmentMuted }}>{done ? "✓" : `${inv.cost}⚜`}</Text>
                      </Pressable>
                    );
                  })}
                  {/* Süregelen eğitim yolu — haftalık emek/akçe biriktirir, vâris olunca ölçekli bonus verir */}
                  <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 1.5, color: C.goldDim, marginTop: 12, marginBottom: 3 }}>{t("edu.head")}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 10, color: C.parchmentMuted, marginBottom: 7 }}>{t("edu.hint")}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {EDU_TRACKS.map((tr) => {
                      const on = p.child_edu?.[c]?.track === tr.id;
                      const afford = p.money >= tr.weekly;
                      return (
                        <Pressable key={tr.id} disabled={!on && !afford} onPress={() => { hap("tap"); apply((s) => setChildEducation(s, c, on ? null : tr.id)); }} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: on ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: on ? "rgba(201,168,76,0.12)" : C.card, opacity: !on && !afford ? 0.5 : 1 }}>
                          <GameIcon name={tr.icon} size={13} color={on ? C.gold : C.goldDim} />
                          <Text style={{ fontFamily: F.display, fontSize: 11, color: on ? C.gold : C.parchment }}>{t("edu.track." + tr.id)}</Text>
                          <Text style={{ fontFamily: F.serif, fontSize: 9, color: C.parchmentMuted }}>{t("edu.cost").replace("%1", String(tr.weekly))}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {p.child_edu?.[c] && (
                    <Text style={{ fontFamily: F.serif, fontSize: 10, color: C.goldDim, marginTop: 6 }}>
                      {t("edu.months").replace("%1", String(p.child_edu[c].weeks))} · {eduLevel(p.child_edu[c].weeks) > 0 ? t("edu.proj").replace("%1", String(eduLevel(p.child_edu[c].weeks))) : t("edu.notyet")}
                    </Text>
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
