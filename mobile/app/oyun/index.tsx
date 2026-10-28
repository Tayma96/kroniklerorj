import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { RealmNotices, realmNoticeCount, noticeRows } from "../../lib/realm-notices-ui";
import { HudButton, GameSheet, useHomeSheet, type HomeSheetId } from "../../lib/home-hud";
import { SAHNE_GORSEL, ikilemTema } from "../../lib/sahne-tema";
import { View, Text, ScrollView, ImageBackground, Image, StyleSheet, Dimensions, Modal, useWindowDimensions } from "react-native";
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
import { IllustratedHeader, OrnatePanel, HeaderIconButton, StatStrip, ListRow, AlertBanner } from "../../lib/ornament-ui";
import { MonthDecisionCard } from "../../lib/month-decision-ui";
import { MK, MkHero, MkIdentity, MkDecision, MkAlert, MkRecent, MkBookRow } from "../../lib/home-mockup-ui";
import { townSeasonImage, heroImage } from "../../lib/assets";
import { MilestoneModal, DilemmaModal, OpportunityModal, AchievementToast, EulogyModal, GameButton, Portre } from "../../lib/ui";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GameIcon } from "../../lib/icons";
import { useI18n, yuzdeL, applyParams, renderEvt, lakapliAd, lakapAdi } from "../../lib/i18n";
import { playTap, playChime, playSaz, playNey } from "../../lib/sound";
import { hap } from "../../lib/haptics";
import { C, F, T, L } from "../../lib/theme";
import { LinearGradient } from "expo-linear-gradient";
import { EmekOngoru } from "../../lib/emek-ui";
import { SoylentiIzi, soylentiLead } from "../../lib/rumor-ui";
import { AileHaberi } from "../../lib/evlat-ui";
import { aileHaberiniOku, varisAdaylari, aileHaberi, effStat } from "../../lib/game";
import { ITEMS } from "../../lib/world";

const SEASON_KEY: Record<string, string> = { "Kış": "kis", "İlkbahar": "ilkbahar", "Yaz": "yaz", "Sonbahar": "sonbahar" };
const SEASON_ICON: Record<string, string> = { "Kış": "flame", "İlkbahar": "leaf", "Yaz": "sun", "Sonbahar": "wheat" };

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

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, doWork, doEat, resetGame, apply, mpMode } = useGame();
  const { snapshot: mpSnapshot } = useMp();
  const { t, tg, lang } = useI18n();
  const [milestone, setMilestone] = useState<GameEvent | null>(null);
  const [sheet, setSheet] = useHomeSheet();
  const [viewH, setViewH] = useState(0); // kaydırma alanı yüksekliği: madalyonlar ekranın altına otursun
  const { width: winW, height: winH } = useWindowDimensions();
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

  // Son gelişmeler: mockup'taki gibi ikon · cümle · zaman satırları; büyük anlar altınla vurgulanır.
  const EventCard = ({ e, last }: { e: GameEvent; hIdx: number; last: boolean }) => {
    const cfg = EVT[e.type] || DEFAULT_EVT;
    const land = !!e.landmark;
    const txt = renderEvt(e.k, e.text, e.p, lang, t, state?.player.gender === "kadın");
    const fresh = !!freshMark && (e.q ?? 0) > freshMark.from;
    return (
      <View style={{ flexDirection: lang === "ar" ? "row-reverse" : "row", alignItems: "flex-start", gap: 10, paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: last ? 0 : 1, borderColor: C.border + "AA" }}>
        <View style={{ width: 30, alignItems: "center", paddingTop: 1 }}><GameIcon name={cfg.gi} size={20} color={land ? C.goldBright : C.gold} /></View>
        <Text style={{ flex: 1, fontFamily: F.serif, fontSize: T.body, lineHeight: T.line, color: land ? C.goldBright : C.parchment }}>{txt}</Text>
        <View style={{ alignItems: "flex-end", gap: 4, paddingTop: 2 }}>
          <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentMuted }}>{timeAgo(e.day)}</Text>
          {fresh && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.goldBright }} />}
        </View>
      </View>
    );
  };

  // Ana ekran gündemi: her düğme yalnız gerçekten bekleyen bir şey varsa (ya da sürekli bir eylem alanıysa) görünür.
  const pendingDil = !mpMode && !!savedMonth?.dilemma;
  const kararTema = savedMonth?.dilemma ? ikilemTema(savedMonth.dilemma.id, savedMonth.dilemma.icon) : null;
  const kararSahne = kararTema ? SAHNE_GORSEL[kararTema] : SAHNE_GORSEL.cami_avlu;
  const uyariN = p.dead ? 0 : realmNoticeCount(state) + (inJail(p) ? 1 : 0) + (state.crownCampaign ? 1 : 0) + (playerWar(state) || (state.wars || []).some((w) => w.prize) ? 1 : 0);
  const hungry = !mpMode && p.age >= 13 && p.hunger < 40;
  const canEmek = p.age >= 13 && p.profession !== "işsiz";
  const canUgras = !inJail(p) && p.age >= 7;
  const ugrasKey = p.age < 13 ? "child.title" : p.age < 18 ? "genc.title" : p.age < 55 ? "adult.title" : "elder.title";
  const ugrasIcon = p.age < 13 ? "party" : p.age < 18 ? "lyre" : p.age < 55 ? "medal" : "prayer-beads";
  const gundemN = p.dead ? 0 : [echoDeferred && state.npcTeklif, aileHaberi(state), soylentiLead(state), acikHesaplar(state).length, state.micro, state.bloodline?.scene && !state.saga?.scene, state.saga?.scene, p.crowned && state.divan, state.caravan?.route, state.story?.active].filter(Boolean).length;
  const rtl = lang === "ar";
  // Ana sayfada yalnız bir uyarı afişi: en acil olan; diğerleri aynı panelde ya da gündemde.
  const alerts: { id: HomeSheetId; icon: string; title: string; sub: string; tone: string }[] = [
    ...(uyariN ? [(() => { const r = noticeRows(state, t)[0]; return r ? { id: "uyari" as const, icon: r.icon, title: r.title, sub: r.sub, tone: r.color } : inJail(p) ? { id: "uyari" as const, icon: "prisoner", title: t("jail.title"), sub: applyParams(t("home.alertsSub"), [uyariN]), tone: C.blood } : { id: "uyari" as const, icon: "crossed-swords", title: t("home.uyari"), sub: applyParams(t("home.alertsSub"), [uyariN]), tone: C.blood }; })()] : []),
    ...(hungry ? [{ id: "sofra" as const, icon: "ye", title: t(p.hunger < 20 ? "dash.starving" : "dash.eatTitle"), sub: applyParams(t("home.hungerSub"), [Math.round(p.hunger)]), tone: p.hunger < 20 ? C.blood : C.ember }] : []),
    ...(gundemN ? [{ id: "gundem" as const, icon: "scroll", title: t("home.gundem"), sub: applyParams(t("home.alertsSub"), [gundemN]), tone: C.gold }] : []),
  ];
  const alert = alerts[0] ? { ...alerts[0], sub: alerts.length > 1 ? `${alerts[0].sub} · +${alerts.length - 1}` : alerts[0].sub } : null;

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

      <ScrollView style={{ flex: 1, backgroundColor: "#15100A" }} contentContainerStyle={{ paddingBottom: 100 }}>
        <MkHero source={heroImage(p.age, cal.season)} topInset={insets.top} seasonIcon={SEASON_ICON[cal.season] || "sun"} title={t("flow.anotherMonth")} sub={`${cal.year}  •  ${t("cal.season." + SEASON_KEY[cal.season])}`} rtl={rtl}
          onBook={() => router.push("/oyun/tarih")} onSettings={() => router.push("/oyun/ayarlar")} bookLabel={t("flow.lifeBook")} settingsLabel={t("scr.ayarlar")} />
        <MkIdentity age={p.age} gender={p.gender} rtl={rtl} portraitLabel={t("tab.character")} onPortrait={() => router.push("/oyun/karakter")}
          name={lakapliAd(p.name, p.lakap, p.gender === "kadın", t)}
          role={p.profession === "işsiz" ? t("misc.jobless") : careerTitleL(p.profession, kariyerXp(p), lang, p.gender === "kadın")}
          stats={[
            { icon: "saglik", label: t("char.health"), value: String(Math.round(p.health)), tone: p.health < 30 ? C.blood : undefined },
            { icon: "fist", label: t("st.strength"), value: String(Math.round(effStat(p, "strength"))) },
            { icon: "graduate-cap", label: t("st.intelligence"), value: String(Math.round(effStat(p, "intelligence"))) },
            { icon: "akce", label: t("char.money"), value: new Intl.NumberFormat(lang, { notation: p.money >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(Math.round(p.money)).replace(/[\s\u00A0]/g, "") },
          ]} />
        <View style={{ paddingHorizontal: MK.side }}>
      {p.dead && (
        <View style={{ paddingBottom: 8, gap: 10 }}>
          {varisAdaylari(state).length > 0 && (
            <GameButton accessibilityLabel={t("dash.continueHeir")} icon="hanedan" rtl={lang === "ar"} onPress={() => router.push("/oyun/nesil")}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.inkOnGold, letterSpacing: 1, textAlign: "center" }}>{t("dash.continueHeir")} ({varisAdaylari(state).length} {t("dash.heirs")})</Text>
            </GameButton>
          )}
          {varisAdaylari(state).length === 0 && !mpMode && (
            <GameButton accessibilityLabel={t("dash.kulOcak")} icon="hanedan" rtl={lang === "ar"} onPress={() => router.push("/oyun/ocak")}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.inkOnGold, letterSpacing: 1, textAlign: "center" }}>{t("dash.kulOcak")}</Text>
            </GameButton>
          )}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <GameButton variant="secondary" accessibilityLabel={t("dash.readLife")} icon="roman" rtl={lang === "ar"} onPress={() => router.push("/oyun/roman")} style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.goldBright, letterSpacing: 1, textAlign: "center" }}>{t("dash.readLife")}</Text>
            </GameButton>
            <GameButton variant="secondary" accessibilityLabel={t("dash.newLife")} icon="leaf" rtl={lang === "ar"} onPress={async () => { try { await resetGame(); router.replace("/yeni-oyun"); } catch {} }} style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchmentDim, letterSpacing: 1, textAlign: "center" }}>{t("dash.newLife")}</Text>
            </GameButton>
          </View>
        </View>
      )}
      {/* Diyar presence (çok oyuncu): paylaşımlı diyarda olduğunu her an hisset — saat, taht, kaç kişi ayakta (İlişkiler'e köprü) */}
      {mpMode && mpSnapshot && (() => {
        const ym = realmYearMonth(mpSnapshot.turn);
        const live = mpSnapshot.players.filter((x) => x.online && !x.dead).length;
        return (
          <Pressable onPress={() => { hap("tap"); router.push("/cok-oyunculu/oyun"); }} style={{ marginBottom: 10, padding: 11, borderRadius: 5, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", backgroundColor: "rgba(201,168,76,0.07)" }}>
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
      {/* İlk açılış: metin duvarı yerine tek cümlelik, akışı kesmeyen şerit — oyuncu hemen ilk kararını verir (TASARIM_PUSULASI 2.5) */}
      {showTut && !p.dead && (
        <View style={{ marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 5, borderWidth: 1, borderColor: "rgba(201,168,76,0.45)", backgroundColor: "rgba(201,168,76,0.08)" }}>
          <GameIcon name="scroll" size={16} color={C.gold} />
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchment, lineHeight: 22 }}>{t(p.age < 13 ? "sp.tut.kisa" : "sp.tut.b1")}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t("cine.close")} onPress={() => { hap("tap"); closeTut(); }} hitSlop={10} style={{ paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontFamily: F.display, fontSize: 14, color: C.goldDim }}>×</Text>
          </Pressable>
        </View>
      )}

        </View>
        <MkDecision />
        {!p.dead && alert && <View style={{ marginHorizontal: 0 }}><MkAlert icon={alert.icon} title={alert.title} sub={alert.sub} red={alert.tone !== C.gold} rtl={rtl} onPress={() => setSheet(alert.id)} /></View>}
        <MkRecent title={t("flow.recent")} seeAll={t("dash.seeAllShort")} empty={t("dash.empty")} rtl={rtl} onSeeAll={() => router.push("/oyun/tarih")}
          rows={events.map(({ e }) => { const cfg = EVT[e.type] || DEFAULT_EVT; return { key: String(e.q ?? e.day + e.text), icon: cfg.gi, when: timeAgo(e.day), text: renderEvt(e.k, e.text, e.p, lang, t, p.gender === "kadın"), fresh: !!freshMark && (e.q ?? 0) > freshMark.from, landmark: !!e.landmark }; })} />
        <MkBookRow title={t("flow.lifeBook")} sub={t("flow.lifeBookSub")} rtl={rtl} onPress={() => router.push("/oyun/tarih")} />
      </ScrollView>

      <GameSheet visible={sheet === "uyari"} onClose={() => setSheet(null)} title={t("home.uyari")} icon="crossed-swords" scene={SAHNE_GORSEL.mogol_baskin}>
      <RealmNotices />
      {/* Zindan: ağır suçun bedeli — süre dolana ya da gardiyan sussuzlanana dek çoğu kapı kilitli */}
      {!p.dead && inJail(p) && (() => {
        const cost = jailBribeCost(state);
        const able = p.money >= cost;
        return (
          <View style={{ marginBottom: 10, padding: 12, borderRadius: 5, borderWidth: 1, borderColor: "rgba(168,52,52,0.5)", backgroundColor: "rgba(168,52,52,0.10)" }}>
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

      {/* Sefer şeridi — ordu yoldayken her ay göz önünde (hanedan ekranına köprü) */}
      {!p.dead && state.crownCampaign && (() => {
        const cc = state.crownCampaign!;
        return (
          <Pressable onPress={() => { hap("tap"); router.push("/oyun/hanedan"); }} style={{ marginBottom: 10, padding: 11, borderRadius: 5, borderWidth: 1, borderColor: "rgba(200,64,64,0.55)", borderLeftWidth: 3, borderLeftColor: C.ember, backgroundColor: "rgba(200,64,64,0.08)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <GameIcon name="crossed-swords" size={13} color={C.ember} />
              <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, color: C.parchment, lineHeight: 22 }}>
                {applyParams(t("crown.cmp.band"), [t("beylik." + cc.beylikId), t(cc.month < 2 ? "crown.cmp.stage1" : "crown.cmp.stage2"), cc.edge])}
              </Text>
            </View>
          </Pressable>
        );
      })()}

      {/* Diyar durumu (bağlam) — loncan savaşı / sancak için savaş */}
      {!p.dead && (() => {
        const war = playerWar(state);
        const prizeWar = (state.wars || []).find((w) => w.prize);
        if (!war && !prizeWar) return null;
        const text = war ? t("dash.warMine") : `${beylikName(prizeWar!.prize!)} ${t("dash.warFor")}`;
        return (
          <Pressable onPress={() => { hap("tap"); router.push("/oyun/orgutler"); }} style={{ marginBottom: 10, padding: 10, borderRadius: 5, borderWidth: 1, borderColor: "rgba(168,52,52,0.4)", backgroundColor: "rgba(168,52,52,0.08)", flexDirection: "row", alignItems: "center", gap: 9 }}>
            <GameIcon name="crossed-swords" size={15} color={C.blood} />
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, color: C.parchment }}>{text}</Text>
            <Text style={{ color: C.blood, fontFamily: F.display, fontSize: 13 }}>›</Text>
          </Pressable>
        );
      })()}

      </GameSheet>
      <GameSheet visible={sheet === "sofra"} onClose={() => setSheet(null)} title={t("dash.eatTitle")} icon="ye" scene={SAHNE_GORSEL.ev_yoksul}>
      {/* Sofra: 13 yaşından sonra açlık her ay düşer; yemeğin bedeli ve sonucu ana akışta görünür (eskiden yalnız pazar+envanterden yenebiliyordu) */}
      {!p.dead && !mpMode && p.age >= 13 && p.hunger < 40 && (() => {
        const foodId = Object.keys(p.inventory).find((id) => p.inventory[id] > 0 && ITEMS[id]?.feed);
        const can = !!foodId || p.money >= 2;
        const starving = p.hunger < 20;
        return (
          <View style={{ marginBottom: 12, padding: 12, borderRadius: 6, borderWidth: 1, borderColor: starving ? "#B4483A" : C.borderHi, backgroundColor: starving ? "rgba(126,34,25,0.35)" : C.card }}>
            <View style={{ flexDirection: lang === "ar" ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
              <GameIcon name="tokluk" size={26} color={starving ? "#F2D3B8" : C.ember} />
              <Text style={{ flex: 1, fontFamily: starving ? F.display : F.serif, fontSize: starving ? 15 : T.body, lineHeight: T.line, color: starving ? "#FBE9D2" : C.parchment }}>{starving ? t("dash.starving") : applyParams(t("dash.hungry"), [Math.round(p.hunger)])}</Text>
            </View>
            {can ? (
              <GameButton icon="ye" rtl={lang === "ar"} accessibilityLabel={t("act.eat")} haptic="tap" onPress={() => doEat()} style={{ marginTop: 10 }}>
                <Text style={{ fontFamily: F.display, fontSize: 14, color: C.inkOnGold, textAlign: "center" }}>{foodId ? applyParams(t("dash.eatFood"), [t("it." + foodId)]) : t("dash.eatStreet")}</Text>
              </GameButton>
            ) : <>
              <Text style={{ fontFamily: F.serifItalic, fontSize: T.body, lineHeight: T.line, color: C.parchmentDim, marginTop: 8 }}>{t("dash.noCoin")}</Text>
              {canEmek && <GameButton variant="secondary" icon="calis" rtl={lang === "ar"} accessibilityLabel={t("flow.workTitle")} onPress={() => { setSheet(null); router.push("/oyun/karakter?ac=emek" as any); }} style={{ marginTop: 10 }}>
                <Text style={{ fontFamily: F.display, fontSize: 14, color: C.goldBright, textAlign: "center" }}>{t("flow.workTitle")}</Text>
              </GameButton>}
            </>}
          </View>
        );
      })()}
      </GameSheet>
      <GameSheet visible={sheet === "gundem"} onClose={() => setSheet(null)} title={t("home.gundem")} icon="scroll" scene={SAHNE_GORSEL.cami_avlu}>
        {gundemN === 0 && <Text style={{ fontFamily: F.serifItalic, fontSize: T.body, lineHeight: T.line, color: C.parchmentDim, marginBottom: 10 }}>{t("home.calm")}</Text>}
      {echoDeferred && !p.dead && state.npcTeklif && (() => {
        const name = kisiProfil(state, state.npcTeklif.id, lang)?.npc.name;
        if (!name) return null;
        const label = applyParams(t("echo.pending"), [name]);
        return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => setEchoParked(null)} style={{ marginBottom: 10, minHeight: 44, padding: 10, borderRadius: 5, borderWidth: 1, borderColor: C.border, flexDirection: lang === "ar" ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
          <GameIcon name="meslek" size={16} color={C.gold} /><Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchment }}>{label}</Text>
        </Pressable>;
      })()}

      <AileHaberi state={state} onOpen={(id, q) => { apply(s => aileHaberiniOku(s, q)); router.push(`/oyun/npc/${id}`); }} />

      <SoylentiIzi state={state} onOpen={(id) => router.push(("/oyun/sosyal?soz=" + encodeURIComponent(id)) as any)} />

      {/* Açık hesaplar: aklında tutman gereken süren hesaplar (en çok 5; kim, ne istiyor, ne zaman) — TASARIM_PUSULASI ilke 4 */}
      {!p.dead && (() => {
        const ah = acikHesaplar(state); if (!ah.length) return null;
        return (
          <View style={{ marginBottom: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 5, borderWidth: 1, borderColor: C.border, backgroundColor: "rgba(255,255,255,0.02)" }}>
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

      {/* Ay-içi mikro an — atlanabilir küçük seçim (yok sayılırsa ertesi ay kaybolur) */}
      {!p.dead && state.micro && (() => {
        const m = state.micro!;
        return (
          <View style={{ marginBottom: 10, padding: 10, borderRadius: 5, borderWidth: 1, borderColor: "rgba(126,138,106,0.45)", backgroundColor: "rgba(126,138,106,0.08)" }}>
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
          <View style={{ marginBottom: 10, padding: 12, borderRadius: 5, borderWidth: 1.5, borderColor: "rgba(168,52,52,0.6)", backgroundColor: "rgba(168,52,52,0.08)" }}>
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
          <View style={{ marginBottom: 10, padding: 12, borderRadius: 5, borderWidth: 1.5, borderColor: "rgba(201,168,76,0.65)", backgroundColor: "rgba(201,168,76,0.10)" }}>
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

      {/* Divan arzuhali — taç sahibine huzura çıkan dilekçeci (yok sayılırsa ertesi ay düşer) */}
      {!p.dead && p.crowned && state.divan && (() => {
        const d = state.divan!;
        const NEED: Record<string, number> = { su_kavgasi: 100, sinir_haraci: 120, genc_mucit: 150, iki_imam: 200, kayip_kervan: 130, sel_bendi: 140, sahte_tanik: 110, kuru_kuyu: 120, mukerrer_bac: 100, yanik_koy: 160, hekim_ucreti: 120, degirmen_kavgasi: 90, veba_soylenti: 130, koprucu_borcu: 110, gece_bekcisi: 100 };
        return (
          <View style={{ marginBottom: 10, padding: 11, borderRadius: 5, borderWidth: 1, borderColor: "rgba(201,168,76,0.55)", backgroundColor: "rgba(201,168,76,0.10)" }}>
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
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
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
        <Pressable onPress={() => { hap("tap"); router.push("/oyun/pazar"); }} style={{ marginBottom: 10, padding: 10, borderRadius: 5, borderWidth: 1, borderColor: "rgba(224,90,48,0.4)", backgroundColor: "rgba(224,90,48,0.08)" }}>
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

      {/* Aktif hikâye çağrısı */}
      {!p.dead && state.story?.active && (
        <Pressable onPress={() => router.push("/oyun/hikayeler")} style={{ marginBottom: 10, padding: 10, borderRadius: 5, borderWidth: 1, borderColor: "rgba(201,168,76,0.4)", backgroundColor: "rgba(201,168,76,0.08)", flexDirection: "row", alignItems: "center", gap: 8 }}>
          <GameIcon name="roman" size={16} color={C.gold} />
          <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, color: C.parchment }}>{t("dash.storyCta")}</Text>
          <Text style={{ color: C.gold, fontFamily: F.display, fontSize: 13 }}>›</Text>
        </Pressable>
      )}

      </GameSheet>
    </View>
  );
}
