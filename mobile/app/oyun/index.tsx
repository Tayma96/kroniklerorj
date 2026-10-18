import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { RealmNotices } from "../../lib/realm-notices-ui";
import { View, Text, ScrollView, ImageBackground, StyleSheet, Dimensions, Modal } from "react-native";
import { Ambiance, LoadingScreen, KenBurns } from "../../lib/fx";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useState, useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { useMp } from "../../lib/mp/store";
import { realmYearMonth } from "../../lib/mp/world";
import { applyDilemma, rakipYarisi, tezgahKart, tezgahHuner, tezgahHunerStat, tezgahSans, tezgahBasari, resolveTezgah, TEZGAH_HUNER, careerTitle, achievementsOf, GameEvent, resolveOpportunity, resolveMicro, resolveSaga, resolveBloodline, BL_CHOICES, BL_COST, SAGA_CHOICES, SAGA_COST, resolveDivan, inJail, jailBribeCost, bribeJailer, Opportunity, publicPerception, atHome, eulogy, WorkStyle, familyQuestsOf, playerWar, beylikName, childAction, ChildAct, elderAction, ElderAct, adultAction, AdultAct, ADULT_TRAINER_COST, studyEnergy, maxStudyEnergy, STUDY_COST, playEnergy, maxPlayEnergy, PLAY_COST, canWork, kariyerXp, kisiProfil, gorus, gorusSebebi, echoWorkBlock, npcTeklifYanit, youthAction, GencAct, gonulAdayi, donumAni, acikHesaplar, ayNotu, onemliMi, kapiMetni, hakemIpucu, araciSansi, hayatOzeti, kisiOf, knParam, esnafAhlaki } from "../../lib/game";
import { pendingMonthScene, chooseMonthDilemma, progressMonthOpportunity, resolveMonthOpportunity } from "../../lib/month-scene";
import { ayinSahnesi, Dilemma, Choice } from "../../lib/events";
import { SinavKartiModal, SinavKartiVeri } from "../../lib/kart3d";
import { rakipKartVerisi } from "../../lib/rakip-ui";
import { HesapModal } from "../../lib/hesap-ui";
import { careerTitleL, placeName } from "../../lib/locale-data";
import { currentCalendar } from "../../lib/calendar";
import { gercekRitim } from "../../lib/ritim";
import { IllustratedHeader, OrnatePanel } from "../../lib/ornament-ui";
import { MonthDecisionCard } from "../../lib/month-decision-ui";
import { townSeasonImage } from "../../lib/assets";
import { MilestoneModal, DilemmaModal, OpportunityModal, AchievementToast, EulogyModal, PressableScale, Portre } from "../../lib/ui";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GameIcon } from "../../lib/icons";
import { useI18n, yuzdeL, applyParams, renderEvt, lakapliAd, lakapAdi } from "../../lib/i18n";
import { playTap, playChime, playSaz, playNey } from "../../lib/sound";
import { hap } from "../../lib/haptics";
import { C, F, T, L } from "../../lib/theme";
import { LinearGradient } from "expo-linear-gradient";
import { EmekOngoru } from "../../lib/emek-ui";
import { SoylentiIzi } from "../../lib/rumor-ui";
import { AileHaberi } from "../../lib/evlat-ui";
import { aileHaberiniOku, varisAdaylari } from "../../lib/game";

const SEASON_KEY: Record<string, string> = { "Kış": "kis", "İlkbahar": "ilkbahar", "Yaz": "yaz", "Sonbahar": "sonbahar" };

// Meslek → ikon (mevcut game-icons setinden).
const PROF_GI: Record<string, string> = {
  çiftçi: "wheat", demirci: "anvil", tüccar: "scales", balıkçı: "fishing", avcı: "bow",
  çoban: "sheep", fırıncı: "bread", müzisyen: "lyre", şifacı: "herbs", asker: "crossed-swords", işsiz: "leaf",
};

// Olay tipi → { kategori anahtarı (evc.*), renk, ikon }. Bulunmazsa DEFAULT.
const EVT: Record<string, { c: string; col: string; gi: string }> = {
  çalışma: { c: "ticaret", col: C.sage, gi: "coins" }, ticaret: { c: "ticaret", col: C.sage, gi: "coins" },
  pazar: { c: "ticaret", col: C.sage, gi: "scales" }, kariyer: { c: "kariyer", col: C.gold, gi: "crown" },
  kariyer_terfi: { c: "kariyer", col: C.gold, gi: "crown" }, meslek: { c: "egitim", col: C.azure, gi: "book" },
  meslek_değişimi: { c: "egitim", col: C.azure, gi: "book" }, mektep: { c: "egitim", col: C.azure, gi: "graduate-cap" },
  cocukluk: { c: "egitim", col: C.azure, gi: "kite" }, yolculuk: { c: "seyahat", col: C.azure, gi: "walk" },
  savaş: { c: "savas", col: C.ember, gi: "crossed-swords" }, savas: { c: "savas", col: C.ember, gi: "crossed-swords" },
  savaş_zaferi: { c: "savas", col: C.ember, gi: "crossed-swords" }, savaş_kaybı: { c: "savas", col: C.blood, gi: "shield" },
  evlilik: { c: "aile", col: C.rose, gi: "ring" }, doğum: { c: "aile", col: C.ink, gi: "baby" }, dogum: { c: "aile", col: C.ink, gi: "baby" },
  aile_krizi: { c: "aile", col: C.rose, gi: "family" }, suç: { c: "golge", col: C.ink, gi: "hood" }, suc: { c: "golge", col: C.ink, gi: "hood" },
  ceza: { c: "ceza", col: C.blood, gi: "prisoner" }, hapis: { c: "ceza", col: C.blood, gi: "prisoner" },
  görev: { c: "gorev", col: C.sage, gi: "scroll-open" }, gorev: { c: "gorev", col: C.sage, gi: "scroll-open" },
  beceri: { c: "beceri", col: C.gold, gi: "medal" }, başarım: { c: "basarim", col: C.gold, gi: "trophy" }, basarim: { c: "basarim", col: C.gold, gi: "trophy" },
  mülk: { c: "mulk", col: C.gold, gi: "house" }, mulkler: { c: "mulk", col: C.gold, gi: "house" },
  hikâye: { c: "hikaye", col: C.ink, gi: "book" }, hikaye: { c: "hikaye", col: C.ink, gi: "book" },
  yanki: { c: "olay", col: C.gold, gi: "scroll" }, kan_hafiza: { c: "olay", col: C.rose, gi: "family" },
  iyileşme: { c: "saglik", col: C.sage, gi: "healing" }, sağlık: { c: "saglik", col: C.sage, gi: "healing" },
  nesil_devri: { c: "nesil", col: C.ink, gi: "hourglass" }, sohbet: { c: "sohbet", col: C.parchmentMuted, gi: "family" },
  hediye: { c: "sohbet", col: C.rose, gi: "ring" }, ölüm: { c: "dunya", col: C.parchmentMuted, gi: "tombstone" }, olum: { c: "dunya", col: C.parchmentMuted, gi: "tombstone" },
  kıtlık: { c: "dunya", col: "#D4820A", gi: "bucket" }, festival: { c: "dunya", col: C.gold, gi: "party" }, şenlik: { c: "dunya", col: C.gold, gi: "party" },
  isyan: { c: "dunya", col: "#D4820A", gi: "fist" }, gunluk: { c: "olay", col: C.gold, gi: "star" },
  // Sonradan eklenen sistemlerin olay türleri (önceden varsayılan yıldıza düşüyordu)
  aile_gorevi: { c: "aile", col: C.rose, gi: "family" }, hanedan_haber: { c: "dunya", col: C.gold, gi: "banner" },
  ocak_savasi: { c: "savas", col: C.ember, gi: "crossed-swords" }, kervan: { c: "ticaret", col: C.sage, gi: "scales" },
  görev_tamamlandı: { c: "gorev", col: C.sage, gi: "scroll-open" }, görev_başarısız: { c: "gorev", col: C.blood, gi: "scroll-open" },
  hikaye_basladi: { c: "hikaye", col: C.ink, gi: "book" }, hikaye_bitti: { c: "hikaye", col: C.gold, gi: "book" },
  kusanma: { c: "beceri", col: C.gold, gi: "shield" }, meslek_edinme: { c: "kariyer", col: C.gold, gi: "crown" },
  mülk_alım: { c: "mulk", col: C.gold, gi: "house" }, mülk_hasat: { c: "mulk", col: C.sage, gi: "coins" }, mülk_yagma: { c: "mulk", col: C.blood, gi: "house" },
  nesil_yatirim: { c: "nesil", col: C.rose, gi: "family" }, piyasa: { c: "ticaret", col: C.gold, gi: "scales" },
  savaş_zafer: { c: "savas", col: C.ember, gi: "crossed-swords" }, savaş_yenilgi: { c: "savas", col: C.blood, gi: "shield" },
  suç_yakalandı: { c: "ceza", col: C.blood, gi: "prisoner" }, taht: { c: "kariyer", col: C.gold, gi: "crown" }, taht_basarisiz: { c: "kariyer", col: C.blood, gi: "crown" },
  terfi: { c: "kariyer", col: C.gold, gi: "crown" }, yerlesim: { c: "mulk", col: C.gold, gi: "castle" }, yonetim: { c: "kariyer", col: C.gold, gi: "crown" },
  fisilti: { c: "sohbet", col: C.parchmentMuted, gi: "family" }, hastalik: { c: "saglik", col: C.blood, gi: "healing" }, yaralanma: { c: "saglik", col: C.blood, gi: "healing" },
  kader: { c: "dunya", col: C.gold, gi: "star" }, nemesis: { c: "savas", col: C.ink, gi: "skull" }, hüner: { c: "beceri", col: C.gold, gi: "medal" },
  örgüt_katılım: { c: "kariyer", col: C.gold, gi: "crown" }, örgüt_ayrılma: { c: "kariyer", col: C.parchmentMuted, gi: "crown" }, örgüt_görev: { c: "gorev", col: C.sage, gi: "scroll-open" },
  söylenti: { c: "dunya", col: C.rose, gi: "speaker" }, tohum: { c: "olay", col: C.gold, gi: "star" },
  doruk: { c: "olay", col: C.goldBright, gi: "crossed-swords" }, huzur: { c: "dunya", col: C.sage, gi: "prayer-beads" },
  cag: { c: "dunya", col: C.goldBright, gi: "crown" },
};
const DEFAULT_EVT = { c: "olay", col: C.gold, gi: "star" };
// Panoda gösterilecek en yeni olay sayısı (tam geçmiş Tarih ekranında). Geç-oyun render kasması önlenir.
const DASH_EVENTS = 3;

function fameRepKey(fame: number) {
  if (fame >= 80) return "rep.legendary"; if (fame >= 60) return "rep.renowned";
  if (fame >= 40) return "rep.heard"; if (fame >= 20) return "rep.known"; return "rep.unknown";
}

// Etiket ve değer birlikte okunur; sınırı olmayan akçe için doluluk çubuğu gösterilmez.
function MiniStat({ icon, label, value, max, color, lang }: { icon: string; label: string; value: number; max?: number; color: string; lang: string }) {
  const pct = max == null ? null : Math.max(0, Math.min(100, (value / max) * 100));
  const number = new Intl.NumberFormat(lang, { notation: value >= 100000 ? "compact" : "standard", maximumFractionDigits: 0 }).format(value);
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={`${label}: ${value}${max == null ? "" : ` / ${max}`}`} style={{ flex: 1, minWidth: 0, paddingHorizontal: 7, paddingVertical: 8, backgroundColor: C.surface + "C0", borderWidth: 1, borderColor: C.borderHi, borderRadius: 5 }}>
      <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 22, color: C.parchmentDim, textAlign: "center" }}>{label}</Text>
      <View style={{ flexDirection: lang === "ar" ? "row-reverse" : "row", justifyContent: "center", alignItems: "center", gap: 5, marginTop: 2 }}>
        <GameIcon name={icon} size={13} color={color} />
        <Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchment, flexShrink: 1 }}>{number}</Text>
      </View>
      {pct != null && <View style={{ height: 3, marginTop: 6, backgroundColor: C.borderHi, borderRadius: 2, overflow: "hidden" }}>
        <View style={{ width: `${pct}%`, height: 3, backgroundColor: color, borderRadius: 2 }} />
      </View>}
    </View>
  );
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, doWork, doEat, resetGame, apply, mpMode } = useGame();
  const { snapshot: mpSnapshot } = useMp();
  const { t, tg, lang } = useI18n();
  const [milestone, setMilestone] = useState<GameEvent | null>(null);
  const [freshMark, setFreshMark] = useState<null | { from: number; n: number }>(null); // "bu ay" özeti: son ilerlemede düşen olay sayısı + olay sırası eşiği (q > from)
  const [yearReport, setYearReport] = useState<GameEvent | null>(null); // yıl dönümü karnesi (yaş günü ritüeli)
  const [mpDilemma, setDilemma] = useState<Dilemma | null>(null);
  const [mpOpp, setOpp] = useState<Opportunity | null>(null);
  const savedMonth = state ? pendingMonthScene(state) : undefined;
  const dilemma = mpMode ? mpDilemma : savedMonth?.dilemma || null;
  const opp = mpMode ? mpOpp : savedMonth?.opp || null;
  // Lonca bayrağı yarışı vakti gelince kart bir kez kendiliğinden açılır ("şimdi değil" denebilir; meslek ekranından da girilir).
  const [yarisK, setYarisK] = useState<SinavKartiVeri | null>(null);
  const yarisAcilan = useRef<number | null>(null);
  const [ach, setAch] = useState<{ name: string; icon: string } | null>(null);
  const tab = "onemli" as "onemli" | "gunluk" | "dunya"; // önemli: kendi hayatın + sana değen dünya olayları (renk satırları "günlük"te)
  const [guideHidden, setGuideHidden] = useState(false);
  useEffect(() => { AsyncStorage.getItem("kronikler_fs_hidden").then((v) => { if (v === "1") setGuideHidden(true); }).catch(() => {}); }, []);
  const hideGuide = () => { setGuideHidden(true); AsyncStorage.setItem("kronikler_fs_hidden", "1").catch(() => {}); };
  const [showTut, setShowTut] = useState(false);
  const seenSeq = useRef<number | null>(state ? state.hseq ?? 0 : null); // görülen son olay sırası (null: kayıt henüz yüklenmedi)
  const [showEulogy, setShowEulogy] = useState(false);
  const [workStyle, setWorkStyle] = useState<WorkStyle>("normal");
  const [echoParked, setEchoParked] = useState<string | null>(null);
  const echoDialogKey = state?.npcTeklif?.sebep === "sahit_sadaka" ? `${state.player.generation}:${state.npcTeklif.id}:${state.npcTeklif.turn}` : null;
  const echoDeferred = !!echoDialogKey && echoParked === echoDialogKey;
  const wasDead = useRef<boolean>(state?.player.dead ?? false);

  // Ölüm anı → sinematik mersiye (yalnızca yeni ölümde).
  useEffect(() => {
    if (!state) return;
    const d = state.player.dead;
    if (d && !wasDead.current) setShowEulogy(true);
    if (!d) setShowEulogy(false);
    wasDead.current = d;
  }, [state?.player.dead]);

  const seenAch = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!state) return;
    const done = achievementsOf(state).filter((x) => x.done);
    if (seenAch.current === null) { seenAch.current = new Set(done.map((x) => x.a.id)); return; }
    for (const x of done) {
      if (!seenAch.current.has(x.a.id)) { seenAch.current.add(x.a.id); setAch({ name: t("ach." + x.a.id + ".l"), icon: x.a.icon }); hap("success"); }
    }
  }, [state]);

  // İlk oyunda bir kez bilgilendirici tutorial (kalıcı bayrak ile tekrar açılmaz).
  useEffect(() => {
    let on = true;
    AsyncStorage.getItem("kronikler_sp_tut").then((v) => { if (on && v !== "1") setShowTut(true); }).catch(() => {});
    return () => { on = false; };
  }, []);
  const closeTut = () => { setShowTut(false); AsyncStorage.setItem("kronikler_sp_tut", "1").catch(() => {}); };

  useEffect(() => {
    const r = state?.player.rakip; const y = r && !r.bitti && r.prof === state?.player.profession ? r.yaris : undefined;
    // Meydan okumayla başlayan yarışın kartını meslek ekranı açar; burada yalnız yıllık yarış vakti kendiliğinden açılır (çift kart olmasın).
    if (state && y != null && yarisAcilan.current !== y && r?.meydan !== y) { yarisAcilan.current = y; setYarisK(rakipKartVerisi(state, t, lang, true)); }
  }, [state?.player.rakip?.yaris]);
  const playedMonth = useRef(savedMonth?.id);
  useEffect(() => {
    if (!mpMode && savedMonth && playedMonth.current !== savedMonth.id) {
      playedMonth.current = savedMonth.id;
      if (savedMonth.dilemma) { if (savedMonth.kind === "senlik") playChime(); else playSaz(); }
    }
  }, [savedMonth?.id, mpMode]);
  const lastRolledTurn = useRef<number>(state?.turn ?? 0);
  const rollSeq = useRef<number>(state?.hseq ?? 0); // son kart zarından bu yana düşen olaylar: bu ay büyük bir an yaşandıysa kart çıkmaz
  const onChoose = (c: Choice, i: number) => { if (!mpMode) { if (savedMonth) { hap("selection"); apply(s => chooseMonthDilemma(s, savedMonth.id, i)); } return; } hap("selection"); let res = c.result; const sk = dilemma ? dilemma.id + ":" + i : undefined; const isFest = !!dilemma && dilemma.id.startsWith("fest_"); const rk = dilemma ? c.rk || "dil." + dilemma.id + ".r" + i : undefined; if (rk) { const v = t(rk); res = v === rk ? c.result : v; } apply((s) => applyDilemma(s, c.gercek || c.delta, res, sk, isFest, rk)); setDilemma(null); };
  const onResolveOpp = (success: boolean) => { if (!mpMode) { if (savedMonth) apply(s => resolveMonthOpportunity(s, savedMonth.id)); return; } if (!opp) return; hap("advance"); apply((s) => resolveOpportunity(s, opp, success)); setOpp(null); };

  useEffect(() => {
    if (!state || !mpMode) return;
    if (state.turn > lastRolledTurn.current) {
      lastRolledTurn.current = state.turn;
      // Ayda tek büyük karar (TASARIM_PUSULASI ilke 2): bu ay bir insanın teklifi ya da hesap anı varsa kart açılmaz;
      // kişisel bir dönüm noktası yaşandıysa rastgele ikilem/fırsat da açılmaz (o ayın sahnesi zaten var). Şenlik yılda tek
      // aydır; yalnız aynı ay gerçek bir karar bekliyorsa o yıl kaçar.
      const rs = rollSeq.current; rollSeq.current = state.hseq ?? 0;
      // Ayın sahnesini motor seçer (Yönetmen 2.0: evre eğrisi, açık ipler, son 12 ayın türleri, nöbetçi); arayüz yalnız gösterir.
      if (!dilemma && !opp) {
        const sahne = ayinSahnesi(state, rs);
        if (sahne.s !== state) { const once = state; apply((cur) => (cur === once ? sahne.s : cur)); } // sahne izi / kapıdaki insan kayda geçer
        if (sahne.dilemma) { setDilemma(sahne.dilemma); if (sahne.tur === "senlik") playChime(); else playSaz(); }
        else if (sahne.opp) setOpp(sahne.opp);
      }
    } else if (state.turn < lastRolledTurn.current) {
      lastRolledTurn.current = state.turn;
    }
  }, [state?.turn]);

  useEffect(() => {
    if (!state) return;
    const h = state.history; const q = state.hseq ?? 0; const seen = seenSeq.current;
    if (seen === null || q < seen) { seenSeq.current = q; return; } // kayıt yeni yüklendi ya da yeni oyun: eski olaylar yeniden açılmaz
    if (q > seen) {
      const fresh = h.filter((e) => (e.q ?? 0) > seen);
      const land = [...fresh].reverse().find(donumAni); // yalnız oyuncuya değen büyük an pencere açar (dünya haberleri ay özetinde)
      const yr = [...fresh].reverse().find((e) => e.type === "yıl_dönümü");
      if (land) setMilestone(land);
      if (yr) setYearReport(yr); // bağımsız: aynı ayda büyük an varsa karne onun kapanışını bekler (render guard'ı !milestone)
      // 2+ gelişme varsa "bu ay" şeridi: çok olaylı aylarda hiçbir şey sessizce kaybolmasın.
      setFreshMark(fresh.length >= 2 ? { from: seen, n: fresh.length } : null);
    }
    seenSeq.current = q;
  }, [state?.hseq]);

  if (!state) return <LoadingScreen />;
  const p = state.player;
  // Tezgâh: work() mesleğe özgü bir karar bıraktıysa 3D kartta sorulur. Hüner yolu kilitliyse gizlenir, gereği kartın altında yazar;
  // riskli yolun şansı görünür ve sonucu (kartta önceden atılmış zarla) arka yüzde motorla aynı çıkar.
  const tzK = !p.dead ? tezgahKart(p) : undefined;
  const tzHuner = tzK ? tezgahHuner(p, tzK) : false;
  const tzDilemma: Dilemma | null = tzK ? {
    id: tzK.id, title: "", text: "", icon: tzK.icon,
    not: tzHuner ? undefined : applyParams(t("tz.lock"), [t("st." + tezgahHunerStat(p, tzK)), TEZGAH_HUNER]),
    choices: tzK.s.filter((_, i) => i < 2 || tzHuner).map((sc, i) => ({
      label: "", result: "", delta: sc.d,
      sans: sc.risk ? tezgahSans(p, tzK) : undefined,
      rk: sc.risk && !tezgahBasari(p, tzK, i) ? "dil." + tzK.id + ".r" + i + "x" : undefined,
    })),
  } : null;
  const onTezgah = (_c: Choice, i: number) => { hap("selection"); apply((s) => resolveTezgah(s, i)); };
  const cal = currentCalendar(state.turn);
  const turn = state.turn;
  const fame = Math.round(p.fame || 0);
  const profGi = PROF_GI[p.profession];

  // Zaman etiketi (1 tur = 1 ay).
  const timeAgo = (day: number) => {
    const diff = turn - (day || 0);
    if (diff <= 0) return t("ago.this");
    if (diff === 1) return t("ago.last");
    if (diff < 12) return applyParams(t("ago.months"), [diff]);
    return applyParams(t("ago.years"), [Math.floor(diff / 12)]);
  };

  // Günlük: makro olmayanlar; Dünya: makro olanlar.
  // Pano bir "bakış" görünümü: yalnız en yeni DASH_EVENTS olay çizilir (geç-oyunda
  // geçmiş 250'ye dayanırken her aksiyonda 250 kartı yeniden çizip pano kasmasını önler;
  // tam geçmiş "Tümünü gör" → Tarih ekranında). Render maliyeti geçmiş büyüse de sabit kalır.
  const reversed = state.history.map((e, hIdx) => ({ e, hIdx })).reverse();
  const events = reversed.filter(({ e }) => (tab === "onemli" ? onemliMi(e) : tab === "dunya" ? e.scope === "makro" : e.scope !== "makro")).slice(0, DASH_EVENTS);

  const EventCard = ({ e, hIdx, last }: { e: GameEvent; hIdx: number; last: boolean }) => {
    const cfg = EVT[e.type] || DEFAULT_EVT;
    const land = !!e.landmark;
    const col = land ? C.goldBright : cfg.col;
    const txt = renderEvt(e.k, e.text, e.p, lang, t, state?.player.gender === "kadın");
    return (
      <View style={{ flexDirection: "row", paddingBottom: last ? 0 : 8 }}>
        {/* İkon sütunu + zaman çizgisi */}
        <View style={{ width: 42, alignItems: "center", paddingTop: 8 }}>
          {!last && <View style={{ position: "absolute", top: 40, bottom: -8, width: 2, backgroundColor: "rgba(184,148,64,0.30)" }} />}
          <View style={{
            width: 32, height: 32, borderRadius: 5, alignItems: "center", justifyContent: "center", zIndex: 1,
            backgroundColor: land ? "rgba(46,32,10,0.95)" : C.card,
            borderWidth: 1.5, borderColor: land ? "rgba(224,188,90,0.8)" : "rgba(184,148,64,0.35)",
          }}>
            <GameIcon name={cfg.gi} size={14} color={col} />
          </View>
        </View>
        {/* Kart */}
        <View style={{
          flex: 1, borderRadius: 5, paddingHorizontal: 11, paddingVertical: 9,
          backgroundColor: land ? "rgba(224,188,90,0.08)" : C.card,
          borderWidth: 1, borderColor: land ? "rgba(224,188,90,0.45)" : C.border,
          borderLeftWidth: 2.5, borderLeftColor: land ? "rgba(224,188,90,0.9)" : col,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: cfg.col }} />
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.4, color: land ? C.goldBright : cfg.col }}>
                {t("evc." + cfg.c).toUpperCase()}
              </Text>
              {land && <GameIcon name="castle" size={9} color={C.goldBright} />}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              {freshMark && (e.q ?? 0) > freshMark.from && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.goldBright }} />}
              <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted }}>{timeAgo(e.day)}</Text>
            </View>
          </View>
          <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchment, lineHeight: 22 }}>{txt}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingBottom: 52 }}>
      {yarisK ? (
        <SinavKartiModal v={yarisK} onSec={(yol) => { const r = rakipYarisi(state, yol); if (r.basari != null) apply(() => r.state); return r.basari; }} onKapat={() => setYarisK(null)} />
      ) : milestone ? (
        <MilestoneModal visible={true} type={milestone.type} text={renderEvt(milestone.k, milestone.text, milestone.p, lang, t, p.gender === "kadın")} onClose={() => setMilestone(null)} />
      ) : mpMode && dilemma ? (
        <DilemmaModal dilemma={dilemma} onChoose={onChoose} female={p.gender === "kadın"} />
      ) : opp ? (
        <OpportunityModal opp={opp} statVal={opp ? state.player.stats[opp.stat] : 5} onResolve={onResolveOpp} progress={mpMode ? undefined : savedMonth} onProgress={mpMode || !savedMonth ? undefined : (stage, success) => apply(s => progressMonthOpportunity(s, savedMonth.id, stage, success))} onPass={() => { hap("tap"); if (mpMode) setOpp(null); else if (savedMonth) apply(s => resolveMonthOpportunity(s, savedMonth.id, true)); }} />
      ) : tzDilemma ? (
        <DilemmaModal dilemma={tzDilemma} onChoose={onTezgah} female={p.gender === "kadın"} />
      ) : state.hesap && !p.dead && !yearReport ? ( // yıl karnesi kapanınca hesap anı gelir (iki pencere üst üste açılmaz)
        <HesapModal />
      ) : state.npcTeklif && !p.dead && !echoDeferred ? (() => {
        // NPC'nin kendi kararıyla gelen teklifi: kim, ne istiyor, sana bakışı ve en büyük sebebi (döküm motorla aynı)
        const tk = state.npcTeklif!; const pr = kisiProfil(state, tk.id, lang);
        if (!pr) return null;
        const g = gorus(state, tk.id).toplam;
        const echo = tk.sebep === "sahit_sadaka"; const echoBlock = echo ? echoWorkBlock(state) : null;
        const kardesTur = tk.tur === "kardes" || tk.tur === "miras"; // kardeşin isteği: anahtar kardeşin cinsine göre, adı ilk adıyla
        const km = kapiMetni(state); // kapıdaki insan kartı (düğün, cenaze, kefalet, hakemlik)
        const metin = km ? renderEvt(km.k, "", km.p, lang, t, p.gender === "kadın") : kardesTur ? renderEvt("npct." + tk.tur + (pr.npc.gender === "kadın" ? ".k" : ""), "", [pr.npc.name.split(" ")[0], tk.tutar || 0], lang, t, p.gender === "kadın")
          : renderEvt(tk.tur === "dunur" ? "npct.dunur" : "npct.borc" + (tk.sebep ? "." + tk.sebep : ""), "", tk.tur === "dunur" ? [pr.npc.name] : [pr.npc.name, tk.tutar || 0, tk.ay || 12], lang, t, p.gender === "kadın");
        const yetmez = !!echoBlock || tk.tur !== "dunur" && tk.tur !== "kefil" && tk.tur !== "hakem" && tk.tur !== "imece" && tk.tur !== "canborcu" && tk.tur !== "tanidik" && tk.tur !== "mahkeme" && p.money < (tk.tutar || 0); // kesede yoksa verilemez (ret her zaman açık)
        const ipucu = hakemIpucu(state); const bAdi = tk.tur === "hakem" && tk.ek ? kisiProfil(state, tk.ek, lang)?.npc.name || "" : "";
        const redEt = echo ? t("echo.decline") : tk.tur === "tanidik" && tk.alt === "haber" ? t("npct.bosver") : tk.tur === "dugun" || tk.tur === "cenaze" || tk.tur === "imece" || (tk.tur === "helal" && tk.alt === "olum") ? t("npct.gitme") : tk.tur === "hakem" ? t("npct.karisma") : tk.tur === "canborcu" ? t("npct.canborcuHelalBtn") : tk.tur === "araci" ? t("npct.araciRedBtn") : tk.tur === "mahkeme" ? t("npct.mahkemeRedBtn") : t("npct.red");
        const kabulEt = echo ? t("echo.accept") : tk.tur === "dugun" ? applyParams(t("npct.dugunBtn"), [tk.tutar || 0]) : tk.tur === "cenaze" ? applyParams(t("npct.cenazeBtn"), [tk.tutar || 0]) : tk.tur === "kefil" ? t("npct.kefilBtn") : tk.tur === "imece" ? t("npct.imeceBtn") : tk.tur === "tanidik" ? t(tk.alt === "haber" ? "npct.tanidikHaberBtn" : tk.alt === "tanistir" ? "npct.tanistirBtn" : "npct.tanidikBtn") : tk.tur === "canborcu" ? t("npct.canborcuAlBtn") : tk.tur === "helal" ? t("npct.helalBtn") : tk.tur === "araci" ? applyParams(t("cb.diyet"), [tk.tutar || 0]) : tk.tur === "mahkeme" ? t("npct.mahkemeBtn") : t("npct.kabul");
        const araciYuzde = tk.tur === "araci" ? araciSansi(state) : null; // aracının hatırıyla diyet şansı (savaş ekranındaki dökümün üstüne +20)
        const neden = renderEvt("npct.why", "", [(g > 0 ? "+" : "") + g, gorusSebebi(state, tk.id, g >= 0 ? 1 : -1)], lang, t, p.gender === "kadın");
        const yanit = (kabul: boolean, secim?: 0 | 1) => { hap("selection"); playTap(); apply((s) => npcTeklifYanit(s, kabul, secim)); };
        return (
          <Modal visible transparent animationType="fade" onRequestClose={() => echo ? setEchoParked(echoDialogKey) : yanit(false)}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.72)", alignItems: "center", justifyContent: "center", padding: 22 }}>
              <ScrollView style={{ width: "100%", maxWidth: 380, maxHeight: "92%", flexGrow: 0 }} contentContainerStyle={{ padding: 1 }}>
              <View style={{ width: "100%", maxWidth: 380, backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(201,168,76,0.45)", borderRadius: 5, padding: 18, alignItems: "center" }}>
                <GameIcon name={tk.tur === "dunur" || tk.tur === "dugun" ? "ring" : tk.tur === "cenaze" ? "tombstone" : tk.tur === "helal" ? "sosyal" : tk.tur === "araci" || tk.tur === "mahkeme" ? "scales" : tk.tur === "imece" ? "iliskiler" : tk.tur === "tanidik" ? "meslek" : tk.tur === "kardes" ? "iliskiler" : tk.tur === "miras" || tk.tur === "kefil" || tk.tur === "hakem" ? "scales" : "coins"} size={18} color={C.gold} />
                {echo && <Pressable accessibilityRole="button" accessibilityLabel={t("echo.later")} onPress={() => setEchoParked(echoDialogKey)} style={{ minHeight: 44, alignSelf: "flex-end", justifyContent: "center", paddingHorizontal: 10 }}><Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchmentMuted }}>{t("echo.later")}</Text></Pressable>}
                <View style={{ marginTop: 10 }}><Portre age={pr.npc.age} gender={pr.npc.gender} size={64} ring={false} seed={pr.npc.id} /></View>
                <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, marginTop: 8, textAlign: "center" }}>{pr.npc.name}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentDim, lineHeight: 22, marginTop: 10, textAlign: "center" }}>{metin}</Text>
                {echo && <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentMuted, lineHeight: 22, marginTop: 8, textAlign: "center" }}>{t("echo.cost")}</Text>}
                {echoBlock && <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.ember, lineHeight: 22, marginTop: 6, textAlign: "center" }}>{t("echo.block." + echoBlock)}</Text>}
                {tk.tur !== "hakem" && !echo ? <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.goldDim, lineHeight: 22, marginTop: 8, textAlign: "center" }}>{neden}</Text> : null}
                {araciYuzde != null ? <Text style={{ fontFamily: F.display, fontSize: 13, color: araciYuzde >= 60 ? C.sage : araciYuzde <= 25 ? C.blood : C.gold, marginTop: 8, textAlign: "center" }}>{t("npct.araciSans")}: {yuzdeL(araciYuzde, lang)}</Text> : null}
                {ipucu ? <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.sage, lineHeight: 22, marginTop: 8, textAlign: "center" }}>{renderEvt("npct.hakemIpucu", "", [ipucu], lang, t, p.gender === "kadın")}</Text> : null}
                {tk.tur === "hakem" ? (
                  <View style={{ gap: 8, marginTop: 16, alignSelf: "stretch" }}>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      {([[0, pr.npc.name], [1, bAdi]] as const).map(([i, ad]) => (
                        <Pressable key={i} onPress={() => yanit(true, i)} style={{ flex: 1, paddingVertical: 11, paddingHorizontal: 6, borderRadius: 5, borderWidth: 1, borderColor: "rgba(201,168,76,0.55)", backgroundColor: "rgba(201,168,76,0.12)", alignItems: "center" }}>
                          <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold, letterSpacing: 0.3, textAlign: "center" }}>{applyParams(t("npct.hakemYan"), [ad.split(" ")[0]])}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Pressable onPress={() => yanit(false)} style={{ paddingVertical: 10, borderRadius: 5, borderWidth: 1, borderColor: C.border, alignItems: "center" }}>
                      <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchmentMuted, letterSpacing: 0.5 }}>{redEt}</Text>
                    </Pressable>
                  </View>
                ) : (
                <View style={{ flexDirection: "row", gap: 10, marginTop: 16, alignSelf: "stretch" }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={redEt} onPress={() => yanit(false)} style={{ flex: 1, minHeight: 44, justifyContent: "center", paddingVertical: 11, borderRadius: 5, borderWidth: 1, borderColor: C.border, alignItems: "center" }}>
                    <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchmentMuted, letterSpacing: 0.5 }}>{redEt}</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={kabulEt} accessibilityState={{ disabled: yetmez }} disabled={yetmez} onPress={() => yanit(true)} style={{ flex: 1, minHeight: 44, justifyContent: "center", paddingVertical: 11, paddingHorizontal: 6, borderRadius: 5, borderWidth: 1, borderColor: "rgba(201,168,76,0.55)", backgroundColor: "rgba(201,168,76,0.12)", alignItems: "center", opacity: yetmez ? 0.4 : 1 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold, letterSpacing: 0.5, textAlign: "center" }}>{kabulEt}</Text>
                  </Pressable>
                </View>
                )}
              </View>
              </ScrollView>
            </View>
          </Modal>
        );
      })() : ach ? (
        <AchievementToast name={ach.name} icon={ach.icon} onClose={() => setAch(null)} />
      ) : null}
      {/* Yıl karnesi: yaş günü ritüeli — yılın izleri + mevcut durum */}
      {yearReport && !milestone && !yarisK && (() => {
        const yrEvents = state.history.filter((ev) => ev.day > turn - 12 && ev.day <= turn && ev.landmark && ev.type !== "yıl_dönümü").slice(-3);
        return (
          <Modal visible transparent animationType="fade" onRequestClose={() => setYearReport(null)}>
            <View style={{ flex: 1, backgroundColor: "rgba(4,3,2,0.94)", alignItems: "center", justifyContent: "center", padding: 26 }}>
              <Animated.View entering={FadeInDown.duration(400)} style={{ width: "100%", maxWidth: 400, backgroundColor: C.card, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.5)", borderRadius: 5, padding: 20 }}>
                <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: C.goldDim, textAlign: "center" }}>{t("yr.title").toUpperCase()}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 22, color: C.gold, textAlign: "center", marginTop: 6 }}>{applyParams(t("yr.age"), [p.age])}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchment, textAlign: "center", lineHeight: 22, marginTop: 10 }}>{renderEvt(yearReport.k, yearReport.text, yearReport.p, lang, t, p.gender === "kadın")}</Text>
                <View style={{ flexDirection: "row", justifyContent: "center", gap: 14, marginTop: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><GameIcon name="akce" size={12} color={C.gold} /><Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{p.money}</Text></View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><GameIcon name="karakter" size={12} color={C.sage} /><Text style={{ fontFamily: F.display, fontSize: 13, color: C.sage }}>{Math.round(p.reputation)}</Text></View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><GameIcon name="crown" size={12} color={C.goldDim} /><Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{fame}</Text></View>
                </View>
                <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: C.goldDim, marginTop: 14, marginBottom: 6 }}>{t("yr.highlights").toUpperCase()}</Text>
                {yrEvents.length === 0 ? (
                  <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted }}>{t("yr.none")}</Text>
                ) : yrEvents.map((ev, i) => (
                  <Text key={i} style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentDim, lineHeight: 22, marginBottom: 4 }}>· {renderEvt(ev.k, ev.text, ev.p, lang, t, p.gender === "kadın")}</Text>
                ))}
                <Pressable onPress={() => { hap("tap"); setYearReport(null); }} style={{ marginTop: 16, paddingVertical: 12, borderRadius: 5, backgroundColor: C.gold, alignItems: "center" }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: C.inkOnGold, letterSpacing: 1 }}>{t("yr.close")}</Text>
                </Pressable>
              </Animated.View>
            </View>
          </Modal>
        );
      })()}

      {/* Mersiye — hayatın duygusal kapanışı */}
      {p.dead && (() => {
        const eul = eulogy(state);
        const diedYear = cal.year;
        const profLine = p.profession !== "işsiz" ? applyParams(t("eul.lived"), [careerTitleL(p.profession, kariyerXp(p), lang, p.gender === "kadın")]) : "";
        // Lakap: ep.<id>, kadınsa dişil varyant (ep.<id>.f) varsa onu kullan.
        const epLabel = eul.epithet ? (() => { const fk = "ep." + eul.epithet + ".f"; const fv = t(fk); return p.gender === "kadın" && fv !== fk ? fv : t("ep." + eul.epithet); })() : "";
        // Hayatın özeti: en büyük üç an (kendi cümleleriyle) ve ardında kalan insanlar (ilke 9: doruk ve son)
        const oz = hayatOzeti(state); const kad = p.gender === "kadın";
        const kp = (id: string) => { const k = kisiOf(state, id); return k ? knParam(k) : ""; };
        const hayatAnlari = oz.anlar.map((e) => renderEvt(e.k, e.text, e.p, lang, t, kad));
        const hayatInsanlari = [
          ...(oz.ananlar.length === 2 ? [renderEvt("eul.ananlar", "", [kp(oz.ananlar[0]), kp(oz.ananlar[1])], lang, t, kad)] : oz.ananlar.length === 1 ? [renderEvt("eul.anan", "", [kp(oz.ananlar[0])], lang, t, kad)] : []),
          ...(oz.hasim ? [renderEvt("eul.unutmayan", "", [kp(oz.hasim)], lang, t, kad)] : []),
        ];
        return (
          <EulogyModal visible={showEulogy} name={p.name} epithet={epLabel} bornYear={diedYear - p.age} diedYear={diedYear} age={p.age}
            professionLine={profLine} lines={eul.lines.map((l) => renderEvt(l.k, "", l.p, lang, t, p.gender === "kadın"))} ozet={{ baslik: t("eul.anlar").replace(/:\s*$/, ""), anlar: hayatAnlari, insanlar: hayatInsanlari }} close={t("dynnote." + eul.close)} hasHeir={varisAdaylari(state).length > 0}
            onReel={() => { setShowEulogy(false); router.push("/oyun/tarih?cine=1"); }}
            onChronicle={() => { setShowEulogy(false); router.push("/oyun/roman"); }}
            onContinue={() => { setShowEulogy(false); if (varisAdaylari(state).length > 0) router.push("/oyun/nesil"); else if (mpMode) { resetGame(); router.replace("/yeni-oyun"); } else router.push("/oyun/ocak"); }} />
        );
      })()}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 12, paddingBottom: 100 }}>
        <IllustratedHeader title={t("flow.anotherMonth")} sub={`${cal.year} · ${t("cal.season." + SEASON_KEY[cal.season])}`} source={townSeasonImage(cal.season)} right={<Pressable accessibilityRole="button" accessibilityLabel={t("scr.ayarlar")} onPress={() => router.push("/oyun/ayarlar")} style={{ minHeight: L.touch, minWidth: L.touch, alignItems: "center", justifyContent: "center", borderRadius: L.touch / 2, borderWidth: 1, borderColor: "rgba(169,130,54,0.55)", backgroundColor: "rgba(244,231,200,0.84)" }}><GameIcon name="ayarlar" size={24} color={C.bg} /></Pressable>} />
        <View style={{ marginTop: -20, marginBottom: 12, paddingHorizontal: 10 }}>
          <View style={{ flexDirection: lang === "ar" ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
            <Portre age={p.age} gender={p.gender} size={80} />
            <View style={{ flex: 1, minWidth: 0, paddingTop: 18 }}>
              <Text style={{ fontFamily: F.display, fontSize: T.title, color: C.parchment }}>{lakapliAd(p.name, p.lakap, p.gender === "kadın", t)}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: T.body, lineHeight: T.line, color: C.parchmentMuted }}>{p.profession === "işsiz" ? t("misc.jobless") : careerTitleL(p.profession, kariyerXp(p), lang, p.gender === "kadın")} · {p.age} {t("misc.age")}</Text>
            </View>
          </View>
          <View style={{ flexDirection: lang === "ar" ? "row-reverse" : "row", gap: 4, marginTop: 8 }}>
            <MiniStat icon="saglik" label={t("char.health")} value={Math.round(p.health)} max={100} color={C.gold} lang={lang} />
            <MiniStat icon="tokluk" label={t("char.hunger")} value={Math.round(p.hunger)} max={100} color={C.gold} lang={lang} />
            <MiniStat icon="akce" label={t("char.money")} value={Math.round(p.money)} color={C.gold} lang={lang} />
            <MiniStat icon="orgutler" label={t("soc.nam.h")} value={fame} max={100} color={C.gold} lang={lang} />
          </View>
        </View>
      {p.dead && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 8, gap: 10 }}>
          {varisAdaylari(state).length > 0 && (
            <Pressable onPress={() => router.push("/oyun/nesil")} style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7, paddingVertical: 14, borderRadius: 5, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.55)", backgroundColor: C.gold }}>
              <GameIcon name="hanedan" size={14} color={C.inkOnGold} />
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.inkOnGold, letterSpacing: 1 }}>{t("dash.continueHeir")} ({varisAdaylari(state).length} {t("dash.heirs")})</Text>
            </Pressable>
          )}
          {varisAdaylari(state).length === 0 && !mpMode && (
            <Pressable onPress={() => router.push("/oyun/ocak")} style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7, paddingVertical: 14, borderRadius: 5, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.55)", backgroundColor: C.gold }}>
              <GameIcon name="hanedan" size={14} color={C.inkOnGold} />
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.inkOnGold, letterSpacing: 1 }}>{t("dash.kulOcak")}</Text>
            </Pressable>
          )}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable onPress={() => router.push("/oyun/roman")} style={{ flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: 14, borderRadius: 5, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card }}>
              <GameIcon name="roman" size={13} color={C.gold} />
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold, letterSpacing: 1 }}>{t("dash.readLife")}</Text>
            </Pressable>
            <Pressable onPress={async () => { try { await resetGame(); router.replace("/yeni-oyun"); } catch {} }} style={{ flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: 14, borderRadius: 5, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card }}>
              <GameIcon name="leaf" size={13} color={C.parchmentDim} />
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchmentDim, letterSpacing: 1 }}>{t("dash.newLife")}</Text>
            </Pressable>
          </View>
        </View>
      )}
      <MonthDecisionCard />
      <RealmNotices />
      {/* Halk seni nasıl görüyor — kimlik her an görünür */}
      {!p.dead && (() => {
        const pp = publicPerception(state);
        const home = atHome(p);
        return (
          <Pressable onPress={() => router.push("/oyun/karakter")} style={{ marginHorizontal: 12, marginTop: 8, paddingVertical: 7, paddingHorizontal: 11, borderRadius: 5, borderWidth: 1, borderColor: home ? "rgba(127,166,106,0.3)" : "rgba(111,160,192,0.3)", backgroundColor: "rgba(8,5,2,0.4)", flexDirection: "row", alignItems: "center", gap: 8 }}>
            <GameIcon name={home ? "sehir" : "firsatlar"} size={13} color={home ? C.sage : C.frost} />
            <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentDim }} numberOfLines={1}>{t("percept." + pp.key)}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 13, color: home ? C.sage : C.frost }}>{yuzdeL(Math.round(pp.recog * 100), lang)}</Text>
          </Pressable>
        );
      })()}

      {/* Diyar presence (çok oyuncu): paylaşımlı diyarda olduğunu her an hisset — saat, taht, kaç kişi ayakta (İlişkiler'e köprü) */}
      {mpMode && mpSnapshot && (() => {
        const ym = realmYearMonth(mpSnapshot.turn);
        const live = mpSnapshot.players.filter((x) => x.online && !x.dead).length;
        return (
          <Pressable onPress={() => { hap("tap"); router.push("/cok-oyunculu/oyun"); }} style={{ marginHorizontal: 12, marginTop: 8, padding: 11, borderRadius: 5, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", backgroundColor: "rgba(201,168,76,0.07)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <GameIcon name="crown" size={13} color={C.gold} />
              <Text style={{ flex: 1, fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.gold, textTransform: "uppercase" }}>{t("mp.realm")}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 0.5, color: C.parchmentMuted }}>{t("mp.year")} {ym.year} · {t("mp.month")} {ym.month}</Text>
            </View>
            <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentDim, marginTop: 4 }}>
              {mpSnapshot.throne.holderName ? applyParams(t("mp.throneHolder"), [mpSnapshot.throne.holderName]) : t("mp.throneEmpty")} · {applyParams(t("mp.pulse.here"), [live])}
            </Text>
          </Pressable>
        );
      })()}
      {/* İLK ADIMLAR yol haritası kartı kullanıcı isteğiyle kaldırıldı (ana sayfada yer kaplamasın). */}

      {/* İlk açılış: metin duvarı yerine tek cümlelik, akışı kesmeyen şerit — oyuncu hemen ilk kararını verir (TASARIM_PUSULASI 2.5) */}
      {showTut && !p.dead && (
        <View style={{ marginHorizontal: 12, marginTop: 8, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 5, borderWidth: 1, borderColor: "rgba(201,168,76,0.45)", backgroundColor: "rgba(201,168,76,0.08)" }}>
          <GameIcon name="scroll" size={16} color={C.gold} />
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchment, lineHeight: 22 }}>{t(p.age < 13 ? "sp.tut.kisa" : "sp.tut.b1")}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t("cine.close")} onPress={() => { hap("tap"); closeTut(); }} hitSlop={10} style={{ paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontFamily: F.display, fontSize: 14, color: C.goldDim }}>×</Text>
          </Pressable>
        </View>
      )}

      {echoDeferred && !p.dead && state.npcTeklif && (() => {
        const name = kisiProfil(state, state.npcTeklif.id, lang)?.npc.name;
        if (!name) return null;
        const label = applyParams(t("echo.pending"), [name]);
        return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => setEchoParked(null)} style={{ marginHorizontal: 12, marginTop: 8, minHeight: 44, padding: 10, borderRadius: 5, borderWidth: 1, borderColor: C.border, flexDirection: lang === "ar" ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
          <GameIcon name="meslek" size={16} color={C.gold} /><Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchment }}>{label}</Text>
        </Pressable>;
      })()}

      <AileHaberi state={state} onOpen={(id, q) => { apply(s => aileHaberiniOku(s, q)); router.push(`/oyun/npc/${id}`); }} />

      <SoylentiIzi state={state} onOpen={(id) => router.push(("/oyun/sosyal?soz=" + encodeURIComponent(id)) as any)} />

      {/* Açık hesaplar: aklında tutman gereken süren hesaplar (en çok 5; kim, ne istiyor, ne zaman) — TASARIM_PUSULASI ilke 4 */}
      {!p.dead && (() => {
        const ah = acikHesaplar(state); if (!ah.length) return null;
        return (
          <View style={{ marginHorizontal: 12, marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 5, borderWidth: 1, borderColor: C.border, backgroundColor: "rgba(255,255,255,0.02)" }}>
            <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.goldDim, textTransform: "uppercase", marginBottom: 4 }}>{t("ah.baslik")}</Text>
            {ah.map((x, i) => (
              <Pressable key={i} disabled={!x.git} onPress={() => { if (x.git) { hap("tap"); router.push(x.git as never); } }} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5, borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
                <GameIcon name={x.ikon} size={13} color={x.agirlik >= 70 ? C.blood : C.parchmentDim} />
                <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchment, lineHeight: 22 }}>{renderEvt(x.k, "", x.p, lang, t, p.gender === "kadın")}</Text>
                {x.git ? <Text style={{ color: C.goldDim, fontSize: 12 }}>›</Text> : null}
              </Pressable>
            ))}
          </View>
        );
      })()}

      {/* Ay sonu notu (pusula 2.4, çığır Sütun 1): oturumu kapatan tek satır — yaklaşan gerçek bir şey; kaçırılan bir şey yok */}
      {!p.dead && (() => {
        const not = ayNotu(state); if (!not) return null;
        return (
          <View style={{ marginHorizontal: 14, marginTop: 6, flexDirection: "row", alignItems: "center", gap: 7 }}>
            <GameIcon name="hourglass" size={11} color={C.goldDim} />
            <Text numberOfLines={2} style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentDim, lineHeight: 22 }}>{renderEvt(not.k, "", not.p, lang, t, p.gender === "kadın")}</Text>
          </View>
        );
      })()}

      {/* Zindan: ağır suçun bedeli — süre dolana ya da gardiyan sussuzlanana dek çoğu kapı kilitli */}
      {!p.dead && inJail(p) && (() => {
        const cost = jailBribeCost(state);
        const able = p.money >= cost;
        return (
          <View style={{ marginHorizontal: 12, marginTop: 8, padding: 12, borderRadius: 5, borderWidth: 1, borderColor: "rgba(168,52,52,0.5)", backgroundColor: "rgba(168,52,52,0.10)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <GameIcon name="hood" size={15} color={C.blood} />
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.blood, textTransform: "uppercase" }}>{t("jail.title")}</Text>
              <Text style={{ marginLeft: "auto", fontFamily: F.serif, fontSize: 15, color: C.parchmentDim }}>{applyParams(t("jail.left"), [p.jail!.left])}</Text>
            </View>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, marginTop: 6, lineHeight: 22 }}>{t("jail.hint")}</Text>
            <Pressable disabled={!able} onPress={() => { hap("heavy"); apply((s) => bribeJailer(s)); }} style={{ alignSelf: "flex-start", marginTop: 8, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 5, borderWidth: 1, borderColor: able ? "rgba(201,168,76,0.5)" : C.border, opacity: able ? 1 : 0.45 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: able ? C.gold : C.parchmentMuted }}>{applyParams(t("jail.bribeBtn"), [cost])}</Text>
            </Pressable>
          </View>
        );
      })()}

      {/* Ay-içi mikro an — atlanabilir küçük seçim (yok sayılırsa ertesi ay kaybolur) */}
      {!p.dead && state.micro && (() => {
        const m = state.micro!;
        return (
          <View style={{ marginHorizontal: 12, marginTop: 8, padding: 10, borderRadius: 5, borderWidth: 1, borderColor: "rgba(126,138,106,0.45)", backgroundColor: "rgba(126,138,106,0.08)" }}>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchment }}>{t("micro." + m.id + ".x")}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              {([0, 1] as const).map((c) => {
                const dis = m.id === "cirak_tabla" && c === 1 && p.money < 2;
                return (
                <Pressable key={c} disabled={dis} onPress={() => { hap("tap"); apply((s) => resolveMicro(s, c)); }} style={{ flex: 1, paddingVertical: 7, paddingHorizontal: 8, borderRadius: 5, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", backgroundColor: "rgba(201,168,76,0.08)", opacity: dis ? 0.4 : 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold, letterSpacing: 0.5, textAlign: "center" }}>{t("micro." + m.id + ".c" + c)}</Text>
                </Pressable>
                );
              })}
            </View>
          </View>
        );
      })()}

      {/* Kan Defteri — nesiller aşan dava destanı sahnesi (panoda bekler) */}
      {!p.dead && state.bloodline?.scene && !state.saga?.scene && (() => { // iki destan paneli aynı anda değil: kan defteri sahnesi Kül Yemini'nin ardından gelir (sahne bekler)
        const sc = state.bloodline!.scene!;
        const n = BL_CHOICES[sc] || 2;
        return (
          <View style={{ marginHorizontal: 12, marginTop: 8, padding: 12, borderRadius: 5, borderWidth: 1.5, borderColor: "rgba(168,52,52,0.6)", backgroundColor: "rgba(168,52,52,0.08)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <GameIcon name="skull" size={13} color={C.blood} />
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.blood, textTransform: "uppercase" }}>{t("bl.title")}</Text>
            </View>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchment, lineHeight: 22 }}>{t("bl." + sc + ".x")}</Text>
            <View style={{ gap: 7, marginTop: 10 }}>
              {Array.from({ length: n }, (_, c) => {
                const need = BL_COST[sc]?.[c] || 0;
                const dis = need > 0 && p.money < need;
                return (
                  <Pressable key={c} disabled={dis} onPress={() => { hap("tap"); apply((s) => resolveBloodline(s, c as 0 | 1 | 2)); }} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 5, borderWidth: 1, borderColor: "rgba(168,52,52,0.4)", backgroundColor: "rgba(168,52,52,0.06)", opacity: dis ? 0.4 : 1 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 13, color: C.blood, letterSpacing: 0.5 }}>{t("bl." + sc + ".c" + c)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })()}

      {/* Kül Yemini — nesiller aşan destan sahnesi (panoda bekler; acele ettirmez) */}
      {!p.dead && state.saga?.scene && (() => {
        const sc = state.saga!.scene!;
        const n = SAGA_CHOICES[sc] || 3;
        return (
          <View style={{ marginHorizontal: 12, marginTop: 8, padding: 12, borderRadius: 5, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.65)", backgroundColor: "rgba(201,168,76,0.10)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <GameIcon name="scroll" size={13} color={C.gold} />
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.gold, textTransform: "uppercase" }}>{t("saga.title")}</Text>
            </View>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchment, lineHeight: 22 }}>{t("saga." + sc + ".x")}</Text>
            <View style={{ gap: 7, marginTop: 10 }}>
              {Array.from({ length: n }, (_, c) => {
                const need = SAGA_COST[sc]?.[c] || 0;
                const dis = need > 0 && p.money < need;
                return (
                  <Pressable key={c} disabled={dis} onPress={() => { hap("tap"); apply((s) => resolveSaga(s, c as 0 | 1 | 2)); }} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 5, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", backgroundColor: "rgba(201,168,76,0.07)", opacity: dis ? 0.4 : 1 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold, letterSpacing: 0.5 }}>{t("saga." + sc + ".c" + c)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })()}

      {/* Sefer şeridi — ordu yoldayken her ay göz önünde (hanedan ekranına köprü) */}
      {!p.dead && state.crownCampaign && (() => {
        const cc = state.crownCampaign!;
        return (
          <Pressable onPress={() => { hap("tap"); router.push("/oyun/hanedan"); }} style={{ marginHorizontal: 12, marginTop: 8, padding: 11, borderRadius: 5, borderWidth: 1, borderColor: "rgba(200,64,64,0.55)", borderLeftWidth: 3, borderLeftColor: C.ember, backgroundColor: "rgba(200,64,64,0.08)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <GameIcon name="crossed-swords" size={13} color={C.ember} />
              <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, color: C.parchment, lineHeight: 22 }}>
                {applyParams(t("crown.cmp.band"), [t("beylik." + cc.beylikId), t(cc.month < 2 ? "crown.cmp.stage1" : "crown.cmp.stage2"), cc.edge])}
              </Text>
            </View>
          </Pressable>
        );
      })()}

      {/* Divan arzuhali — taç sahibine huzura çıkan dilekçeci (yok sayılırsa ertesi ay düşer) */}
      {!p.dead && p.crowned && state.divan && (() => {
        const d = state.divan!;
        const NEED: Record<string, number> = { su_kavgasi: 100, sinir_haraci: 120, genc_mucit: 150, iki_imam: 200, kayip_kervan: 130, sel_bendi: 140, sahte_tanik: 110, kuru_kuyu: 120, mukerrer_bac: 100, yanik_koy: 160, hekim_ucreti: 120, degirmen_kavgasi: 90, veba_soylenti: 130, koprucu_borcu: 110, gece_bekcisi: 100 };
        return (
          <View style={{ marginHorizontal: 12, marginTop: 8, padding: 11, borderRadius: 5, borderWidth: 1, borderColor: "rgba(201,168,76,0.55)", backgroundColor: "rgba(201,168,76,0.10)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <GameIcon name="crown" size={13} color={C.gold} />
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.gold, textTransform: "uppercase" }}>{t("divan.title")}</Text>
            </View>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchment }}>{t("divan." + d.id + ".x")}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              {([0, 1] as const).map((c) => {
                const dis = c === 0 && NEED[d.id] != null && p.money < NEED[d.id];
                return (
                <Pressable key={c} disabled={dis} onPress={() => { hap(c === 0 ? "success" : "tap"); if (c === 0) playChime(); apply((s) => resolveDivan(s, c)); }} style={{ flex: 1, paddingVertical: 7, paddingHorizontal: 8, borderRadius: 5, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: "rgba(201,168,76,0.12)", opacity: dis ? 0.4 : 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold, letterSpacing: 0.5, textAlign: "center" }}>{t("divan." + d.id + ".c" + c)}</Text>
                </Pressable>
                );
              })}
            </View>
          </View>
        );
      })()}

      {/* Diyar durumu (bağlam) — loncan savaşı / sancak için savaş */}
      {!p.dead && (() => {
        const war = playerWar(state);
        const prizeWar = (state.wars || []).find((w) => w.prize);
        if (!war && !prizeWar) return null;
        const text = war ? t("dash.warMine") : `${beylikName(prizeWar!.prize!)} ${t("dash.warFor")}`;
        return (
          <Pressable onPress={() => { hap("tap"); router.push("/oyun/orgutler"); }} style={{ marginHorizontal: 12, marginTop: 8, padding: 10, borderRadius: 5, borderWidth: 1, borderColor: "rgba(168,52,52,0.4)", backgroundColor: "rgba(168,52,52,0.08)", flexDirection: "row", alignItems: "center", gap: 9 }}>
            <GameIcon name="crossed-swords" size={15} color={C.blood} />
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, color: C.parchment }}>{text}</Text>
            <Text style={{ color: C.blood, fontFamily: F.display, fontSize: 13 }}>›</Text>
          </Pressable>
        );
      })()}

      {/* Aktif işler şeridi — süreli sistemlerin kalan ayları (tezgâh, iltizam, kiler, rehin, nadas) */}
      {!p.dead && (() => {
        const chips: { icon: string; label: string }[] = [];
        if ((p.stall_until ?? 0) > state.turn) chips.push({ icon: "banner", label: applyParams(t("dash.fx.stall"), [(p.stall_until ?? 0) - state.turn]) });
        if ((p.iltizam_until ?? 0) > state.turn) chips.push({ icon: "scales", label: applyParams(t("dash.fx.iltizam"), [(p.iltizam_until ?? 0) - state.turn]) });
        if ((p.winter_stock_until ?? 0) > state.turn) chips.push({ icon: "wheat", label: applyParams(t("dash.fx.kiler"), [(p.winter_stock_until ?? 0) - state.turn]) }); // "0 ay" kalan kiler gösterilmez
        if (p.horse_pawn) chips.push({ icon: "hourglass", label: applyParams(t("dash.fx.rehin"), [Math.max(0, p.horse_pawn.until - state.turn)]) });
        const fal = (p.properties || []).find((pr) => pr.fallow_until !== undefined);
        if (fal) chips.push({ icon: "leaf", label: applyParams(t("dash.fx.nadas"), [Math.max(0, (fal.fallow_until ?? 0) - state.turn)]) });
        // Yoldaşların akşamı: yaşlanan kedi/köpek sessizce hatırlatılır — veda sürpriz olmasın
        if (p.pet?.old) chips.push({ icon: "wool", label: applyParams(t("dash.fx.petOld"), [p.pet.n]) });
        if (p.dog?.old) chips.push({ icon: "sheep", label: applyParams(t("dash.fx.dogOld"), [p.dog.n]) });
        // Ufukta: yaklaşan güzel şeyler — beklenti oyuncuyu yarınki aya çağırır
        if ((p.dowry_chest || 0) > 0 && p.child_meta?.length) {
          const yakin = p.child_meta.map((cm) => 216 - (state.turn - cm.born)).filter((k) => k > 0).sort((a, b) => a - b)[0];
          if (yakin !== undefined) chips.push({ icon: "gems", label: yakin >= 12 ? applyParams(t("dash.fx.ceyizYil"), [Math.ceil(yakin / 12)]) : applyParams(t("dash.fx.ceyizAy"), [yakin]) });
        }
        if ((p.properties || []).some((pr) => pr.type === "bag") && (p.sira_gunu_year ?? -1) !== Math.floor(state.turn / 12)) {
          const kalanBag = cal.month_no <= 8 ? 9 - cal.month_no : cal.month_no === 12 ? 9 : 0;
          if (kalanBag > 0) chips.push({ icon: "amphora", label: applyParams(t("dash.fx.bagbozumu"), [kalanBag]) });
        }
        if (cal.season === "Sonbahar" && (p.winter_stock_until ?? 0) < state.turn) chips.push({ icon: "wheat", label: t("dash.fx.kisBos") });
        if (!chips.length) return null;
        return (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginHorizontal: 12, marginTop: 8 }}>
            {chips.map((c, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 5, borderWidth: 1, borderColor: "rgba(201,168,76,0.3)", backgroundColor: "rgba(201,168,76,0.06)" }}>
                <GameIcon name={c.icon} size={11} color={C.goldDim} />
                <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchmentMuted }}>{c.label}</Text>
              </View>
            ))}
          </View>
        );
      })()}

      {/* Kervan yolculuğu (bağlam) — çok-adımlı rota ilerlemesi */}
      {!p.dead && state.caravan?.route && (
        <Pressable onPress={() => { hap("tap"); router.push("/oyun/pazar"); }} style={{ marginHorizontal: 12, marginTop: 8, padding: 10, borderRadius: 5, borderWidth: 1, borderColor: "rgba(224,90,48,0.4)", backgroundColor: "rgba(224,90,48,0.08)" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <GameIcon name="camel" size={14} color={C.ember} />
            <Text style={{ flex: 1, fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.ember, textTransform: "uppercase" }}>{t("dash.caravan")}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentMuted }}>{(state.caravan.step ?? 0)}/{state.caravan.route.length - 1}</Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 2, marginTop: 5 }}>
            {state.caravan.route.map((stop, i) => {
              const cur = i === (state.caravan!.step ?? 0); const done = i < (state.caravan!.step ?? 0);
              return (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                  {i > 0 && <Text style={{ color: done ? C.ember : C.border, fontSize: 10, marginHorizontal: 1 }}>→</Text>}
                  {cur && <GameIcon name="camel" size={10} color={C.ember} />}
                  <Text style={{ fontFamily: cur ? F.display : F.serif, fontSize: cur ? 10.5 : 9.5, color: cur ? C.ember : done ? C.parchmentMuted : C.parchmentDim }}>{placeName(stop, lang)}</Text>
                </View>
              );
            })}
          </View>
        </Pressable>
      )}

      <OrnatePanel title={t("flow.recent")} icon="scroll-open" right={<Pressable accessibilityRole="button" accessibilityLabel={t("dash.seeAll")} onPress={() => router.push("/oyun/tarih")} style={{ minHeight: L.touch, justifyContent: "center" }}><Text style={{ fontFamily: F.serif, fontSize: T.caption, color: C.gold }}>{t("dash.seeAll")} ›</Text></Pressable>}>
        {events.length ? events.map(({ e, hIdx }, index) => <View key={e.q ?? hIdx}>{EventCard({ e, hIdx, last: index === events.length - 1 })}</View>) : <Text style={{ fontFamily: F.serif, fontSize: T.body, lineHeight: T.line, color: C.parchmentMuted }}>{t("dash.empty")}</Text>}
      </OrnatePanel>
      <Pressable accessibilityRole="button" onPress={() => router.push("/oyun/tarih")} style={{ minHeight: 58, marginBottom: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: C.goldDim, borderRadius: 4, backgroundColor: C.surface }}>
        <GameIcon name="roman" size={28} color={C.gold} /><Text style={{ flex: 1, fontFamily: F.display, fontSize: T.title, color: C.parchment }}>{t("flow.lifeBook")}</Text><Text style={{ color: C.gold, fontSize: 22 }}>›</Text>
      </Pressable>
      {!p.dead && (p.age >= 13 && p.profession !== "işsiz") ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
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
          <PressableScale accessibilityLabel={worked ? t("act.workedThisTurn") : t("act.work")} onPress={() => { if (worked) return; hap("tap"); playTap(); doWork(workStyle); }} disabled={worked} style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingVertical: 14, borderRadius: 5, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card, opacity: worked ? 0.45 : 1 }}>
            <GameIcon name="calis" size={15} color={C.gold} />
            <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold, letterSpacing: 1.5 }}>{worked ? t("act.workedThisTurn") : t("act.work")}</Text>
          </PressableScale>); })()}
        </View>
      ) : null}

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
          <View style={{ marginHorizontal: 12, marginTop: 8, padding: 12, borderRadius: 5, borderWidth: 1, borderColor: "rgba(201,168,76,0.3)", backgroundColor: "rgba(201,168,76,0.06)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.gold, textTransform: "uppercase" }}>{t("child.title")}</Text>
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
          <View style={{ marginHorizontal: 12, marginTop: 8, padding: 12, borderRadius: 5, borderWidth: 1, borderColor: "rgba(127,166,106,0.32)", backgroundColor: "rgba(127,166,106,0.06)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.sage, textTransform: "uppercase" }}>{t("genc.title")}</Text>
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
          <View style={{ marginHorizontal: 12, marginTop: 8, padding: 12, borderRadius: 5, borderWidth: 1, borderColor: "rgba(111,160,192,0.3)", backgroundColor: "rgba(111,160,192,0.05)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.frost, textTransform: "uppercase" }}>{t("adult.title")}</Text>
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
          <View style={{ marginHorizontal: 12, marginTop: 8, padding: 12, borderRadius: 5, borderWidth: 1, borderColor: "rgba(123,79,175,0.3)", backgroundColor: "rgba(123,79,175,0.06)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.ink, textTransform: "uppercase" }}>{t("elder.title")}</Text>
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

      {/* Aktif hikâye çağrısı */}
      {!p.dead && state.story?.active && (
        <Pressable onPress={() => router.push("/oyun/hikayeler")} style={{ marginHorizontal: 12, marginTop: 8, padding: 10, borderRadius: 5, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", backgroundColor: "rgba(201,168,76,0.08)", flexDirection: "row", alignItems: "center", gap: 8 }}>
          <GameIcon name="roman" size={16} color={C.gold} />
          <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, color: C.parchment }}>{t("dash.storyCta")}</Text>
          <Text style={{ color: C.gold, fontFamily: F.display, fontSize: 13 }}>›</Text>
        </Pressable>
      )}

      {/* ── AKSİYONLAR ── */}
      </ScrollView>
    </View>
  );
}
