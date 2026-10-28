import { DesignPressable as Pressable } from "./design-pressable";
import { RealmNotices, realmNoticeCount } from "./realm-notices-ui";
import { HudButton, GameSheet, useHomeSheet, type HomeSheetId } from "./home-hud";
import { SAHNE_GORSEL, ikilemTema } from "./sahne-tema";
import { View, Text, ScrollView, ImageBackground, StyleSheet, Dimensions, Modal, useWindowDimensions } from "react-native";
import { Ambiance, LoadingScreen, KenBurns } from "./fx";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useState, useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "./store";
import { useMp } from "./mp/store";
import { realmYearMonth } from "./mp/world";
import { applyDilemma, rakipYarisi, tezgahKart, tezgahHuner, tezgahHunerStat, tezgahSans, tezgahBasari, resolveTezgah, TEZGAH_HUNER, careerTitle, achievementsOf, GameEvent, resolveOpportunity, resolveMicro, resolveSaga, resolveBloodline, BL_CHOICES, BL_COST, SAGA_CHOICES, SAGA_COST, resolveDivan, inJail, jailBribeCost, bribeJailer, Opportunity, publicPerception, atHome, eulogy, WorkStyle, familyQuestsOf, playerWar, beylikName, childAction, ChildAct, elderAction, ElderAct, adultAction, AdultAct, ADULT_TRAINER_COST, studyEnergy, maxStudyEnergy, STUDY_COST, playEnergy, maxPlayEnergy, PLAY_COST, canWork, kariyerXp, kisiProfil, gorus, gorusSebebi, echoWorkBlock, npcTeklifYanit, youthAction, GencAct, gonulAdayi, donumAni, acikHesaplar, ayNotu, onemliMi, kapiMetni, hakemIpucu, araciSansi, hayatOzeti, kisiOf, knParam, esnafAhlaki } from "./game";
import { pendingMonthScene, chooseMonthDilemma, progressMonthOpportunity, resolveMonthOpportunity } from "./month-scene";
import { ayinSahnesi, Dilemma, Choice } from "./events";
import { SinavKartiModal, SinavKartiVeri } from "./kart3d";
import { rakipKartVerisi } from "./rakip-ui";
import { HesapModal } from "./hesap-ui";
import { careerTitleL, placeName } from "./locale-data";
import { currentCalendar } from "./calendar";
import { gercekRitim } from "./ritim";
import { IllustratedHeader, OrnatePanel, HeaderIconButton, StatStrip, ListRow } from "./ornament-ui";
import { MonthDecisionCard } from "./month-decision-ui";
import { townSeasonImage } from "./assets";
import { MilestoneModal, DilemmaModal, OpportunityModal, AchievementToast, EulogyModal, GameButton, Portre } from "./ui";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GameIcon } from "./icons";
import { useI18n, yuzdeL, applyParams, renderEvt, lakapliAd, lakapAdi } from "./i18n";
import { playTap, playChime, playSaz, playNey } from "./sound";
import { hap } from "./haptics";
import { C, F, T, L } from "./theme";
import { LinearGradient } from "expo-linear-gradient";
import { EmekOngoru } from "./emek-ui";
import { SoylentiIzi, soylentiLead } from "./rumor-ui";
import { AileHaberi } from "./evlat-ui";
import { aileHaberiniOku, varisAdaylari, aileHaberi } from "./game";
import { ITEMS } from "./world";

// Ayın eylemleri: çalışma (emek) ve yaşa göre uğraşlar. Ana ekrandan Karakter ekranına taşındı;
// motor çağrıları ve kilitler aynıdır.
export function EmekPanel() {
  const { state, doWork, apply } = useGame();
  const { t, lang } = useI18n();
  const router = useRouter();
  const [workStyle, setWorkStyle] = useState<WorkStyle>("normal");
  if (!state) return null;
  const p = state.player;
  return (
    <>
      {!p.dead && (p.age >= 13 && p.profession !== "işsiz") ? (
        <OrnatePanel>
          {/* Çalışma stili seçici (Vercel work_rework.py) */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 7 }}>
            {(["garantici", "normal", "hirsli", "kaytarici"] as const).map((ws) => {
              const on = workStyle === ws;
              return (
                <Pressable key={ws} accessibilityRole="button" accessibilityLabel={t("work.style." + ws)} accessibilityState={{ selected: on }} onPress={() => { hap("tap"); setWorkStyle(ws); }} style={{ flexBasis: "45%", flexGrow: 1, minHeight: 44, justifyContent: "center", alignItems: "center", paddingVertical: 8, borderRadius: 5, borderWidth: 1, borderColor: on ? C.gold : C.border, backgroundColor: on ? C.cardHi : "transparent" }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 0.3, color: on ? C.gold : C.parchmentMuted }}>{t("work.style." + ws)}</Text>
                </Pressable>
              );
            })}
          </View>
          <EmekOngoru state={state} styleId={workStyle} />
          {(() => { const worked = !canWork(state); return (
          <GameButton variant="secondary" accessibilityLabel={worked ? t("act.workedThisTurn") : t("act.work")} icon="calis" rtl={lang === "ar"} onPress={() => { if (worked) return; hap("tap"); playTap(); doWork(workStyle); }} disabled={worked}>
            <Text style={{ fontFamily: F.display, fontSize: 13, color: C.goldBright, letterSpacing: 1.5, textAlign: "center" }}>{worked ? t("act.workedThisTurn") : t("act.work")}</Text>
          </GameButton>); })()}
        </OrnatePanel>
      ) : null}

    </>
  );
}

export function UgrasPanel() {
  const { state, apply } = useGame();
  const { t, lang, tg } = useI18n();
  const router = useRouter();
  if (!state) return null;
  const p = state.player;
  return (
    <>
      {/* Çocukluk uğraşları (7-12) — çocuğa hareket alanı; çalışma gücünden harcar */}
      {!p.dead && !inJail(p) && p.age >= 7 && p.age < 13 && (() => {
        const en = playEnergy(state); const can = en >= PLAY_COST;
        const acts: { k: ChildAct; icon: string; label: string }[] = [
          { k: "oyun", icon: "party", label: t("child.act.oyun") },
          { k: "yardim", icon: "iliskiler", label: t("child.act.yardim") },
          { k: "yaramazlik", icon: "hood", label: t("child.act.yaramazlik") },
          { k: "kesif", icon: "firsatlar", label: t("child.act.kesif") },
        ];
        const onChild = (k: ChildAct) => { if (!can) return; hap("tap"); const r = childAction(state, k); if (!r.blocked) apply(() => r.state); };
        return (
          <View style={{ marginBottom: 12, padding: 14, borderRadius: 6, borderWidth: 1, borderColor: C.borderHi, borderTopColor: "rgba(201,168,76,0.3)", borderTopWidth: 2, backgroundColor: C.card }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
              <Text style={{ flexShrink: 1, fontFamily: F.display, fontSize: 17, color: C.gold }}>{t("child.title")}</Text>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {Array.from({ length: maxPlayEnergy(p.age) }).map((_, i) => (
                  <View key={i} style={{ width: 9, height: 9, borderRadius: 2, transform: [{ rotate: "45deg" }], backgroundColor: i < en ? C.gold : "transparent", borderWidth: 1, borderColor: i < en ? C.gold : C.border }} />
                ))}
              </View>
            </View>
            {/* Çocukluk yoldaşı ("can dostu") artık İlişkiler ekranında gösteriliyor (pano kalabalığı azaldı). */}
            {p.child_dream ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 9 }}>
                <GameIcon name="star" size={11} color={C.gold} />
                <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted }}>{t("child.dream.label")}: <Text style={{ fontFamily: F.serif, color: C.gold }}>{t("dream." + p.child_dream)}</Text></Text>
              </View>
            ) : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {acts.map((a) => (
                <Pressable key={a.k} onPress={() => onChild(a.k)} disabled={!can} style={{ width: "48%", flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 5, borderWidth: 1, borderColor: can ? "rgba(201,168,76,0.4)" : C.border, backgroundColor: can ? C.card : C.bg, opacity: can ? 1 : 0.5 }}>
                  <GameIcon name={a.icon} size={16} color={can ? C.gold : C.parchmentMuted} />
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: can ? C.parchment : C.parchmentMuted }}>{a.label}</Text>
                </Pressable>
              ))}
            </View>
            {!can && <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, marginTop: 8 }}>{tg("child.spent", p.gender === "kadın")}</Text>}
          </View>
        );
      })()}

      {/* Gençlik uğraşları (13-17) — çocukluk oyunu bitti, olgunluk talimi başlamadı: usta, akranlar, gönül, meydan (gerçek kişilerle) */}
      {!p.dead && !inJail(p) && p.age >= 13 && p.age < 18 && (() => {
        const en = playEnergy(state); const can = en >= PLAY_COST;
        const gonulAcik = p.age >= 15 && !!gonulAdayi(state);
        const acts: { k: GencAct; icon: string; label: string; kapali?: boolean; not?: string }[] = [
          { k: "usta", icon: "anvil", label: t("genc.act.usta") },
          { k: "akran", icon: "iliskiler", label: t("genc.act.akran") },
          { k: "gonul", icon: "ring", label: t("genc.act.gonul"), kapali: !gonulAcik, not: p.age < 15 ? t("genc.gonulYas") : undefined },
          { k: "huner", icon: "banner", label: t("genc.act.huner") },
        ];
        const onYouth = (k: GencAct) => { if (!can) return; hap("tap"); const r = youthAction(state, k); if (!r.blocked) apply(() => r.state); };
        return (
          <View style={{ marginBottom: 12, padding: 14, borderRadius: 6, borderWidth: 1, borderColor: C.borderHi, borderTopColor: "rgba(127,166,106,0.32)", borderTopWidth: 2, backgroundColor: C.card }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
              <Text style={{ flexShrink: 1, fontFamily: F.display, fontSize: 17, color: C.sage }}>{t("genc.title")}</Text>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {Array.from({ length: maxPlayEnergy(p.age) }).map((_, i) => (
                  <View key={i} style={{ width: 9, height: 9, borderRadius: 2, transform: [{ rotate: "45deg" }], backgroundColor: i < en ? C.sage : "transparent", borderWidth: 1, borderColor: i < en ? C.sage : C.border }} />
                ))}
              </View>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {acts.map((a) => { const dis = !can || !!a.kapali; return (
                <Pressable key={a.k} onPress={() => { if (!dis) onYouth(a.k); }} disabled={dis} style={{ width: "48%", flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 5, borderWidth: 1, borderColor: dis ? C.border : "rgba(127,166,106,0.45)", backgroundColor: dis ? "transparent" : "rgba(127,166,106,0.08)" }}>
                  <GameIcon name={a.icon} size={16} color={dis ? C.parchmentMuted : C.sage} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 13, color: dis ? C.parchmentMuted : C.parchment }}>{a.label}</Text>
                    {a.not ? <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted }}>{a.not}</Text> : null}
                  </View>
                </Pressable>
              ); })}
            </View>
            {!can && <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, marginTop: 8 }}>{t("genc.spent")}</Text>}
          </View>
        );
      })()}

      {/* Olgunluk uğraşları (18-54) — atıl aylık çalışma gücü işlesin: dört uğraş dört statı besler */}
      {!p.dead && !inJail(p) && p.age >= 18 && p.age < 55 && (() => {
        const en = studyEnergy(state); const can = en >= STUDY_COST;
        const acts: { k: AdultAct; icon: string; label: string; cost?: number }[] = [
          { k: "talim", icon: "crossed-swords", label: t("adult.act.talim"), cost: ADULT_TRAINER_COST },
          { k: "meclis", icon: "iliskiler", label: t("adult.act.meclis") },
          { k: "tefekkur", icon: "scroll", label: t("adult.act.tefekkur") },
          { k: "yuruyus", icon: "firsatlar", label: t("adult.act.yuruyus") },
          { k: "ibadet", icon: "prayer-beads", label: t("adult.act.ibadet") },
        ];
        const onAdult = (k: AdultAct) => { if (!can) return; hap("tap"); const r = adultAction(state, k); if (!r.blocked) { if (k === "ibadet") playNey(); apply(() => r.state); } };
        return (
          <View style={{ marginBottom: 12, padding: 14, borderRadius: 6, borderWidth: 1, borderColor: C.borderHi, borderTopColor: "rgba(111,160,192,0.3)", borderTopWidth: 2, backgroundColor: C.card }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
              <Text style={{ flexShrink: 1, fontFamily: F.display, fontSize: 17, color: C.frost }}>{t("adult.title")}</Text>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {Array.from({ length: maxStudyEnergy(p.age) }).map((_, i) => (
                  <View key={i} style={{ width: 9, height: 9, borderRadius: 2, transform: [{ rotate: "45deg" }], backgroundColor: i < en ? C.frost : "transparent", borderWidth: 1, borderColor: i < en ? C.frost : C.border }} />
                ))}
              </View>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {acts.map((a) => {
                const dis = !can || (a.cost != null && p.money < a.cost);
                return (
                  <Pressable key={a.k} onPress={() => { if (!dis) onAdult(a.k); }} disabled={dis} style={{ width: acts.length % 2 === 1 && a.k === acts[acts.length - 1].k ? "100%" : "48%", flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 5, borderWidth: 1, borderColor: dis ? C.border : "rgba(111,160,192,0.4)", backgroundColor: dis ? C.bg : C.card, opacity: dis ? 0.5 : 1 }}>
                    <GameIcon name={a.icon} size={16} color={dis ? C.parchmentMuted : C.frost} />
                    <Text style={{ flex: 1, fontFamily: F.display, fontSize: 13, color: dis ? C.parchmentMuted : C.parchment }} numberOfLines={1}>{a.label}{a.cost != null ? ` · ${a.cost}⚜` : ""}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })()}

      {/* İhtiyarlık uğraşları (55+) — hayatın akşamına anlam; çalışma gücünden harcar */}
      {!p.dead && !inJail(p) && p.age >= 55 && (() => {
        const en = studyEnergy(state); const can = en >= STUDY_COST;
        const acts: { k: ElderAct; icon: string; label: string }[] = [
          { k: "nasihat", icon: "speaker", label: t("elder.act.nasihat") },
          { k: "hayir", icon: "akce", label: t("elder.act.hayir") },
          { k: "dinlen", icon: "saglik", label: t("elder.act.dinlen") },
          { k: "ani", icon: "roman", label: t("elder.act.ani") },
          { k: "tekke", icon: "prayer-beads", label: t("elder.act.tekke") },
        ];
        const onElder = (k: ElderAct) => { if (!can) return; hap("tap"); const r = elderAction(state, k); if (!r.blocked) { if (k === "tekke") playNey(); apply(() => r.state); } };
        return (
          <View style={{ marginBottom: 12, padding: 14, borderRadius: 6, borderWidth: 1, borderColor: C.borderHi, borderTopColor: "rgba(123,79,175,0.3)", borderTopWidth: 2, backgroundColor: C.card }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
              <Text style={{ flexShrink: 1, fontFamily: F.display, fontSize: 17, color: C.ink }}>{t("elder.title")}</Text>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {Array.from({ length: maxStudyEnergy(p.age) }).map((_, i) => (
                  <View key={i} style={{ width: 9, height: 9, borderRadius: 2, transform: [{ rotate: "45deg" }], backgroundColor: i < en ? C.ink : "transparent", borderWidth: 1, borderColor: i < en ? C.ink : C.border }} />
                ))}
              </View>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {acts.map((a) => (
                <Pressable key={a.k} onPress={() => onElder(a.k)} disabled={!can} style={{ width: acts.length % 2 === 1 && a.k === acts[acts.length - 1].k ? "100%" : "48%", flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 5, borderWidth: 1, borderColor: can ? "rgba(123,79,175,0.4)" : C.border, backgroundColor: can ? C.card : C.bg, opacity: can ? 1 : 0.5 }}>
                  <GameIcon name={a.icon} size={16} color={can ? C.ink : C.parchmentMuted} />
                  <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.display, fontSize: 13, color: can ? C.parchment : C.parchmentMuted }}>{a.label}</Text>
                </Pressable>
              ))}
            </View>
            {!can && <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, marginTop: 8 }}>{tg("child.spent", p.gender === "kadın")}</Text>}
          </View>
        );
      })()}

    </>
  );
}
