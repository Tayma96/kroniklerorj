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

// Uğraş bloğu: takat elmasları, isteğe bağlı hayal satırı, iki sütun madalyonlu eylem taşları (≥ 52 pt) ve "takat bitti" notu.
type UgrasEylem = { k: string; icon: string; label: string; not?: string; cost?: number; kapali?: boolean };
function UgrasBlok({ tone, en, max, can, acts, onAct, dream, spent }: { tone: string; en: number; max: number; can: boolean; acts: UgrasEylem[]; onAct: (k: string) => void; dream?: React.ReactNode; spent?: string }) {
  const { t, lang } = useI18n();
  const rtl = lang === "ar", row = rtl ? "row-reverse" as const : "row" as const;
  const p = useGame().state!.player;
  return (
    <View style={{ marginBottom: 12, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: C.borderHi, borderTopColor: tone + "88", borderTopWidth: 2, backgroundColor: "rgba(29,22,13,0.92)" }}>
      <View accessible accessibilityLabel={`${t("karakter.takat")}: ${en} / ${max}`} style={{ flexDirection: row, alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Text style={{ flex: 1, fontFamily: F.display, fontSize: 12.5, letterSpacing: 0.6, color: C.parchmentDim, textAlign: rtl ? "right" : "left" }}>{t("karakter.takat")}</Text>
        <View style={{ flexDirection: row, gap: 5 }}>
          {Array.from({ length: max }).map((_, i) => (
            <View key={i} style={{ width: 11, height: 11, borderRadius: 2, transform: [{ rotate: "45deg" }], backgroundColor: i < en ? tone : "transparent", borderWidth: 1, borderColor: i < en ? tone : C.border }} />
          ))}
        </View>
      </View>
      {dream}
      <View style={{ flexDirection: row, flexWrap: "wrap", gap: 8 }}>
        {acts.map((a, i) => {
          const dis = !can || !!a.kapali || (a.cost != null && p.money < a.cost);
          const wide = acts.length % 2 === 1 && i === acts.length - 1;
          return (
            <Pressable key={a.k} accessibilityRole="button" accessibilityLabel={a.label + (a.cost != null ? ` · ${a.cost}⚜` : "") + (a.not ? `, ${a.not}` : "")} accessibilityState={{ disabled: dis }} disabled={dis} onPress={() => { if (!dis) onAct(a.k); }}
              style={({ pressed }) => ({ width: wide ? "100%" : "48.5%", flexGrow: 1, minHeight: 54, flexDirection: row, alignItems: "center", gap: 9, paddingVertical: 7, paddingHorizontal: 9, borderRadius: 8, borderWidth: 1, borderBottomWidth: pressed || dis ? 1 : 2.5, borderColor: dis ? C.border : tone + "88", borderBottomColor: dis ? C.border : "#080503", backgroundColor: dis ? "rgba(10,7,4,0.5)" : pressed ? C.surface : "#241B11", opacity: dis ? 0.5 : 1, transform: [{ translateY: pressed ? 1.5 : 0 }] })}>
              <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#120C06", borderWidth: 1.5, borderColor: dis ? C.border : tone }}>
                <GameIcon name={a.icon} size={17} color={dis ? C.parchmentMuted : tone} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: 12.5, lineHeight: 16, color: dis ? C.parchmentMuted : C.parchment, textAlign: rtl ? "right" : "left" }}>{a.label}{a.cost != null ? ` · ${a.cost}⚜` : ""}</Text>
                {a.not ? <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 17, color: C.parchmentMuted, textAlign: rtl ? "right" : "left" }}>{a.not}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      {!can && spent ? <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 21, color: C.parchmentMuted, marginTop: 9, textAlign: rtl ? "right" : "left" }}>{spent}</Text> : null}
    </View>
  );
}

export function UgrasPanel() {
  const { state, apply } = useGame();
  const { t, tg } = useI18n();
  if (!state) return null;
  const p = state.player;
  if (p.dead || inJail(p) || p.age < 7) return null;
  const kadin = p.gender === "kadın";

  // Çocukluk uğraşları (7-12) — çocuğa hareket alanı; oyun takatinden harcar
  if (p.age < 13) {
    const en = playEnergy(state), can = en >= PLAY_COST;
    const acts: UgrasEylem[] = [
      { k: "oyun", icon: "party", label: t("child.act.oyun") },
      { k: "yardim", icon: "iliskiler", label: t("child.act.yardim") },
      { k: "yaramazlik", icon: "hood", label: t("child.act.yaramazlik") },
      { k: "kesif", icon: "firsatlar", label: t("child.act.kesif") },
    ];
    const onChild = (k: string) => { if (!can) return; hap("tap"); const r = childAction(state, k as ChildAct); if (!r.blocked) apply(() => r.state); };
    // Çocukluk yoldaşı ("can dostu") İlişkiler ekranında gösteriliyor.
    const dream = p.child_dream ? (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <GameIcon name="star" size={13} color={C.gold} />
        <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted }}>{t("child.dream.label")}: <Text style={{ fontFamily: F.serif, color: C.gold }}>{t("dream." + p.child_dream)}</Text></Text>
      </View>
    ) : null;
    return <UgrasBlok tone={C.gold} en={en} max={maxPlayEnergy(p.age)} can={can} acts={acts} onAct={onChild} dream={dream} spent={tg("child.spent", kadin)} />;
  }

  // Gençlik uğraşları (13-17) — usta, akranlar, gönül, meydan (gerçek kişilerle)
  if (p.age < 18) {
    const en = playEnergy(state), can = en >= PLAY_COST;
    const gonulAcik = p.age >= 15 && !!gonulAdayi(state);
    const acts: UgrasEylem[] = [
      { k: "usta", icon: "anvil", label: t("genc.act.usta") },
      { k: "akran", icon: "iliskiler", label: t("genc.act.akran") },
      { k: "gonul", icon: "ring", label: t("genc.act.gonul"), kapali: !gonulAcik, not: p.age < 15 ? t("genc.gonulYas") : undefined },
      { k: "huner", icon: "banner", label: t("genc.act.huner") },
    ];
    const onYouth = (k: string) => { if (!can) return; hap("tap"); const r = youthAction(state, k as GencAct); if (!r.blocked) apply(() => r.state); };
    return <UgrasBlok tone={C.sage} en={en} max={maxPlayEnergy(p.age)} can={can} acts={acts} onAct={onYouth} spent={t("genc.spent")} />;
  }

  // Olgunluk uğraşları (18-54) — dört uğraş dört statı besler
  if (p.age < 55) {
    const en = studyEnergy(state), can = en >= STUDY_COST;
    const acts: UgrasEylem[] = [
      { k: "talim", icon: "crossed-swords", label: t("adult.act.talim"), cost: ADULT_TRAINER_COST },
      { k: "meclis", icon: "iliskiler", label: t("adult.act.meclis") },
      { k: "tefekkur", icon: "scroll", label: t("adult.act.tefekkur") },
      { k: "yuruyus", icon: "firsatlar", label: t("adult.act.yuruyus") },
      { k: "ibadet", icon: "prayer-beads", label: t("adult.act.ibadet") },
    ];
    const onAdult = (k: string) => { if (!can) return; hap("tap"); const r = adultAction(state, k as AdultAct); if (!r.blocked) { if (k === "ibadet") playNey(); apply(() => r.state); } };
    return <UgrasBlok tone={C.frost} en={en} max={maxStudyEnergy(p.age)} can={can} acts={acts} onAct={onAdult} spent={tg("child.spent", kadin)} />;
  }

  // İhtiyarlık uğraşları (55+) — hayatın akşamına anlam
  const en = studyEnergy(state), can = en >= STUDY_COST;
  const acts: UgrasEylem[] = [
    { k: "nasihat", icon: "speaker", label: t("elder.act.nasihat") },
    { k: "hayir", icon: "akce", label: t("elder.act.hayir") },
    { k: "dinlen", icon: "saglik", label: t("elder.act.dinlen") },
    { k: "ani", icon: "roman", label: t("elder.act.ani") },
    { k: "tekke", icon: "prayer-beads", label: t("elder.act.tekke") },
  ];
  const onElder = (k: string) => { if (!can) return; hap("tap"); const r = elderAction(state, k as ElderAct); if (!r.blocked) { if (k === "tekke") playNey(); apply(() => r.state); } };
  return <UgrasBlok tone={C.ink} en={en} max={maxStudyEnergy(p.age)} can={can} acts={acts} onAct={onElder} spent={tg("child.spent", kadin)} />;
}
