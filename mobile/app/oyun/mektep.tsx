// Mektep (F3/K4): yaşa göre üç görünüm — sıbyan (7–12) / medrese (13–16) / ders halkası (18+); arada yol özeti ve icazet.
// İlk ekranda en çok üç blok (hoca, odak + çalış, yıl sonu sınavı); kulüp ve akranlar "daha fazla" altında.
import { PageHeader, BackLabel, ScreenFresk } from "../../lib/ui";
import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { View, Text, ScrollView } from "react-native";
import { useState, type ReactNode } from "react";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import {
  CLUBS, joinClub, clubPractice, studyEnergy, STUDY_COST, studySubject, calisabilir, mektepEvresi, mektepDersleri, mektepOdak, mektepOdakSec,
  mektepSinavGirdi, zarOrani, egitimYolu, kisiProfil, relWith, dersHalkasi, dersHalkasiAcik, dersHalkasiBedeli, icazetTekrar, icazetTekrarAcik,
  icazetTekrarGirdi, muderrisMi, dersVer, dersVerAcik, muderrisGeliri, MUDERRIS_ZEKA, oyunYili, type Stats,
} from "../../lib/game";
import { GameIcon } from "../../lib/icons";
import { SansEtiketi } from "../../lib/sans-etiketi";
import { C, F } from "../../lib/theme";
import { useI18n, applyParams } from "../../lib/i18n";
import { yon } from "../../lib/sayfa/karakter/parca";
import { hap } from "../../lib/haptics";
import { playTap } from "../../lib/sound";

type Sonuc = { key: string; chips: { label: string; col: string; k?: string; p?: (string | number)[] }[]; tick: number };
const STATLAR: (keyof Stats)[] = ["intelligence", "charisma", "strength", "stamina"];

function Blok({ title, icon, children, rtl }: { title: string; icon: string; children: ReactNode; rtl: boolean }) {
  return <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: "rgba(201,168,76,0.28)", borderRadius: 5, padding: 12, marginBottom: 12, gap: 8 }}>
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
      <GameIcon name={icon} size={16} color={C.gold} />
      <Text accessibilityRole="header" style={{ flex: 1, fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: C.gold, textAlign: rtl ? "right" : "left" }}>{title}</Text>
    </View>
    {children}
  </View>;
}
function Dugme({ label, onPress, disabled, on, a11y }: { label: string; onPress: () => void; disabled?: boolean; on?: boolean; a11y?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={a11y || label} accessibilityState={{ disabled: !!disabled, selected: !!on }} onPress={onPress} disabled={disabled}
    style={{ minHeight: 44, flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 5, borderWidth: 1.5, borderColor: on ? C.gold : disabled ? C.border : "rgba(212,180,90,0.6)", backgroundColor: on ? "rgba(212,180,90,0.18)" : disabled ? C.bg : "rgba(212,180,90,0.08)" }}>
    <Text style={{ fontFamily: F.display, fontSize: 13, color: disabled ? C.parchmentMuted : on ? C.goldBright : C.gold, textAlign: "center" }}>{label}</Text>
  </Pressable>;
}

export default function Mektep() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state, apply } = useGame();
  const { t, lang } = useI18n();
  const { rtl, ta } = yon(lang);
  const [last, setLast] = useState<Sonuc | null>(null);
  const [fazla, setFazla] = useState(false);
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const ev = mektepEvresi(p);
  const okul = ev === "sibyan" || ev === "medrese";
  const yol = egitimYolu(p);
  const txt = (s: string) => <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: C.parchmentDim, textAlign: ta }}>{s}</Text>;

  const calis = () => {
    const res = studySubject(state); if (res.blocked) return;
    hap("success"); playTap(); apply(() => res.state); setLast({ key: res.key, chips: res.chips, tick: Date.now() });
  };
  const clubDone = studyEnergy(state) < STUDY_COST;
  const mesk = () => {
    if (!p.club || clubDone) return; const res = clubPractice(state); if (res.blocked) return;
    hap("success"); playTap(); apply(() => res.state); setLast({ key: res.key, chips: res.chips, tick: Date.now() });
  };

  // Hoca kartı: gerçek NPC, npc sayfasına bağlantı.
  const hoca = p.hoca_id ? kisiProfil(state, p.hoca_id, lang) : null;
  const hocaRel = p.hoca_id ? relWith(state, p.hoca_id) : 0;
  const hocaBlok = <Blok title={t("mek.hoca.baslik")} icon="prayer-beads" rtl={rtl}>
    {hoca && !hoca.olu ? <Pressable accessibilityRole="button" accessibilityLabel={`${hoca.npc.name}. ${t("mek.hoca.ac")}`} onPress={() => router.push({ pathname: "/oyun/npc/[id]", params: { id: p.hoca_id! } })}
      style={{ minHeight: 44, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.display, fontSize: 14, color: C.parchment, textAlign: ta }}>{hoca.npc.name}</Text>
        {txt(applyParams(t("mek.hoca.bag"), [Math.round(hocaRel), hocaRel >= 60 ? 2 : hocaRel >= 25 ? 1 : 0]))}
      </View>
      <GameIcon name="scroll-open" size={18} color={C.goldDim} />
    </Pressable> : txt(t("mek.hoca.yok"))}
  </Blok>;

  // Odak dersi + çalış.
  const odak = mektepOdak(state);
  const yilN = p.mektep_yil?.y === oyunYili(state.turn) ? p.mektep_yil.n : 0;
  const odakBlok = <Blok title={t("mek.odak.baslik")} icon="book" rtl={rtl}>
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 8 }}>
      {mektepDersleri(p).map((d) => <Dugme key={d.id} label={t("mek.ders." + d.id)} on={odak === d.id} a11y={applyParams(t("mek.odak.sec"), [t("mek.ders." + d.id)])}
        onPress={() => { hap("tap"); apply((s) => mektepOdakSec(s, d.id)); }} />)}
    </View>
    {txt(t("mek.odak.ipucu"))}
    <Dugme label={!calisabilir(state) ? t("mek.calis.yapildi") : t("mek.calis")} disabled={!calisabilir(state) || !odak} onPress={calis} />
    {txt(odak ? applyParams(t("mek.calis.d"), [yilN]) : t("mek.calis.odaksiz"))}
  </Blok>;

  // Yıl sonu sınavı (takvim + şans önizlemesi) ve yol özeti.
  const icazetYili = ev === "medrese" && p.age === 16;
  const son = p.mektep_sinav;
  const sinavBlok = <Blok title={t(icazetYili ? "mek.sinav.icazetBaslik" : "mek.sinav.baslik")} icon="graduate-cap" rtl={rtl}>
    {txt(t("mek.sinav.d"))}
    <SansEtiketi zar={zarOrani(state, mektepSinavGirdi(state))} />
    {son && !son.icazet ? txt(applyParams(t("mek.sinav.son." + son.sonuc), [t("mek.ders." + son.ders)])) : null}
    {txt(ev === "sibyan" ? (p.egitim_yolu ? t("mek.yol.ozet." + p.egitim_yolu) : t("mek.yol.bekliyor")) : t("mek.yol.ozet.medrese"))}
  </Blok>;

  const icazetBlok = <Blok title={t("mek.icazet.baslik")} icon="scroll" rtl={rtl}>
    {p.icazet ? <>
      <Text style={{ fontFamily: F.display, fontSize: 14, color: C.goldBright, textAlign: ta }}>{applyParams(t("mek.icazet.rozet"), [t("mek.ders." + p.icazet.tur)])} · {t("mek.derece." + p.icazet.derece)}</Text>
      {txt(t("mek.icazet.etki." + p.icazet.tur))}
      {txt(t("mek.icazet.etki.ortak"))}
    </> : txt(p.icazet_kaldi ? t("mek.icazet.kaldiNot") : t("mek.icazet.yok"))}
  </Blok>;

  const halkaBlok = <Blok title={t("mek.halka.baslik")} icon="book" rtl={rtl}>
    {txt(applyParams(t("mek.halka.d"), [dersHalkasiBedeli(state)]))}
    {dersHalkasiAcik(state) ? <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 8 }}>
      {STATLAR.map((k) => <Dugme key={k} label={applyParams(t("mek.halka.al"), [t("st." + k)])} disabled={p.money < dersHalkasiBedeli(state)} onPress={() => { hap("success"); playTap(); apply((s) => dersHalkasi(s, k)); }} />)}
    </View> : txt(t("mek.halka.alindi"))}
    {icazetTekrarAcik(state) ? <>
      <SansEtiketi zar={zarOrani(state, icazetTekrarGirdi(state))} baslik="mek.halka.tekrar" />
      <Dugme label={t("mek.halka.tekrar")} onPress={() => { hap("success"); playTap(); apply((s) => icazetTekrar(s)); }} />
    </> : null}
  </Blok>;

  const muderrisBlok = <Blok title={t("mek.muderris.baslik")} icon="scroll-open" rtl={rtl}>
    {muderrisMi(p) ? <>
      {txt(applyParams(t("mek.muderris.d"), [muderrisGeliri(state)]))}
      <Dugme label={dersVerAcik(state) ? t("mek.muderris.ver") : t("mek.muderris.verildi")} disabled={!dersVerAcik(state)} onPress={() => { hap("success"); playTap(); apply((s) => dersVer(s)); }} />
    </> : txt(applyParams(t("mek.muderris.sart"), [MUDERRIS_ZEKA]))}
  </Blok>;

  const kulupVeAkran = <>
    {p.age < 18 && p.age >= 7 ? <Blok title={t("club.head")} icon="lyre" rtl={rtl}>
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 8 }}>
        {CLUBS.map((cl) => <Dugme key={cl.id} label={t("club." + cl.id)} on={p.club === cl.id} onPress={() => { hap("tap"); apply((s) => joinClub(s, p.club === cl.id ? null : cl.id)); }} />)}
      </View>
      {p.club ? <Dugme label={clubDone ? t("club.practiced") : t("club.practice")} disabled={clubDone} onPress={mesk} /> : null}
      {txt(t("club.hint"))}
    </Blok> : null}
    {(p.akran_ids || []).length ? <Blok title={t("mek.akran.baslik")} icon="family" rtl={rtl}>
      {(p.akran_ids || []).map((id) => { const k = kisiProfil(state, id, lang); return k && !k.olu ? <Pressable key={id} accessibilityRole="button" accessibilityLabel={k.npc.name} onPress={() => router.push({ pathname: "/oyun/npc/[id]", params: { id } })} style={{ minHeight: 44, justifyContent: "center" }}>
        <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchment, textAlign: ta }}>{k.npc.name}</Text>
      </Pressable> : null; })}
    </Blok> : null}
  </>;

  const sub = ev === "yok" ? t("mek.evre.yok") : t("mek.evre." + ev);
  return (
    <ScreenFresk style={{ paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ minHeight: 44, justifyContent: "center" }}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 100 }}>
        <PageHeader title={t("scr.mektep")} sub={sub} />

        {last && last.key !== "" && (
          <Animated.View key={last.tick} entering={FadeInDown.duration(260)} style={{ backgroundColor: "rgba(212,180,90,0.10)", borderWidth: 1, borderColor: "rgba(212,180,90,0.4)", borderLeftWidth: rtl ? 1 : 3, borderRightWidth: rtl ? 3 : 1, borderRadius: 5, padding: 12, marginBottom: 12 }}>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchment, lineHeight: 22, textAlign: ta }}>{t(last.key)}</Text>
            {last.chips.length > 0 && <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {last.chips.map((c, i) => <View key={i} style={{ backgroundColor: c.col + "22", borderWidth: 1, borderColor: c.col + "66", borderRadius: 20, paddingVertical: 3, paddingHorizontal: 9 }}>
                <Text style={{ fontFamily: F.display, fontSize: 13, color: c.col }}>{c.k ? applyParams(t(c.k), c.p || []) : c.label}</Text>
              </View>)}
            </View>}
          </Animated.View>
        )}

        {p.stat_points > 0 && (
          <Pressable accessibilityRole="button" accessibilityLabel={t("mek.pointsCta")} onPress={() => { hap("tap"); router.push("/oyun/karakter"); }} style={{ minHeight: 44, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10, backgroundColor: "rgba(212,180,90,0.12)", borderWidth: 1.5, borderColor: "rgba(212,180,90,0.55)", borderRadius: 5, padding: 12, marginBottom: 12 }}>
            <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{p.stat_points}</Text>
            <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, color: C.parchment, textAlign: ta }}>{t("mek.pointsCta")}</Text>
          </Pressable>
        )}

        {okul ? <>{hocaBlok}{odakBlok}{sinavBlok}</> : null}
        {ev === "ara" ? <>
          <Blok title={t("mek.evre.ara")} icon="walk" rtl={rtl}>{txt(t("mek.yol.ozet." + (yol || "cirak")))}</Blok>
          {icazetBlok}
        </> : null}
        {ev === "halka" ? <>{halkaBlok}{icazetBlok}{muderrisBlok}</> : null}

        {(ev !== "yok" && ev !== "halka") ? <>
          <Dugme label={t("club.head") + " · " + t("mek.akran.baslik")} on={fazla} onPress={() => setFazla(!fazla)} />
          {fazla ? <View style={{ marginTop: 12 }}>{kulupVeAkran}{okul ? txt(t("mek.kartNot")) : null}</View> : null}
        </> : null}
      </ScrollView>
    </ScreenFresk>
  );
}
