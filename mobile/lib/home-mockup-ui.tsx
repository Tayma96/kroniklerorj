// Ana sayfa — claude-paket mockup (ekran 1) ölçüleriyle.
// Ölçüler mockup'ın 476 px genişliğindeki ekranından 390 pt'ye (×0.82) çevrilmiştir; tek ekrana sığar.
// Paneller yarı saydamdır: ardındaki sahne zemini (lib/sayfa/ana/zemin.tsx) hafifçe sezilir.
// Saf görünüm panelleri lib/sayfa/ana/paneller.tsx'tedir (çevrimiçi Yaşam da kullanır); burada kayda bağlı Karar paneli kalır.
import { View, Text, Image, StyleSheet, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GameIcon } from "./icons";
import { PressableScale } from "./ui";
import { useGame } from "./store";
import { useI18n, applyParams, renderEvt } from "./i18n";
import { pendingMonthScene, chooseMonthDilemma } from "./month-scene";
import { ikilemTema, SAHNE_GORSEL } from "./sahne-tema";
import { etkiler, ETKI, yonOku } from "./kart3d";
import { playTap } from "./sound";
import { F } from "./theme";
import { DanisanSesler } from "./danisan-ui";

export { MK, Ornament } from "./mk-sus";
import { MK, Ornament } from "./mk-sus";
export { CAM, MkPanel, MkPanelHeader, MkHero, MkIdentity, MkAlert, MkAlertChips, MkRecent, MkBookRow } from "./sayfa/ana/paneller";
import { MkPanel, MkPanelHeader } from "./sayfa/ana/paneller";

const ETKI_LABEL: Record<string, string> = { money: "char.money", reputation: "soc.reputation.l", honor: "soc.honor.l", fear: "soc.fear.l", fame: "soc.fame.l", health: "char.health", stat_points: "char.attrs" };

// Bu Ayın Kararı: metin solda, sahne sağda soluklaşır; altta iki seçenek kutusu (dar ekranda alt alta).
export function MkDecision() {
  const { state, apply } = useGame(), { t, tg, lang } = useI18n(), { width } = useWindowDimensions();
  if (!state || state.player.dead) return null;
  const rtl = lang === "ar";
  const m = pendingMonthScene(state), d = m?.dilemma;
  const text = (key: string, fallback: string) => { const v = tg(key, state.player.gender === "kadın"); return v === key ? fallback : v; };
  if (!d || !m) {
    const event = [...state.history].reverse().find(e => e.day === state.turn && e.k?.startsWith("dil."));
    if (!event) return null;
    // Sonuç kartı (radikal sonuçlar planı, aşama 2): seçilen yol ve gerçekleşen etki, kararın verildiği yerde.
    const sc = state.monthScene?.turn === state.turn ? state.monthScene.secim : undefined;
    const cipler = sc ? Object.entries(sc.etki).filter(([k]) => ETKI[k]) : [];
    return <MkPanel style={{ marginBottom: 10 }}>
      <MkPanelHeader title={t("flow.monthDecision")} rtl={rtl} />
      {sc && <Text style={{ fontFamily: F.display, fontSize: 13, lineHeight: 18, color: MK.gold, paddingHorizontal: 14, paddingBottom: 4, textAlign: rtl ? "right" : "left" }}>{rtl ? "" : "↳ "}{text(`dil.${sc.id}.c${sc.i}`, sc.label)}</Text>}
      <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: MK.ink, paddingHorizontal: 14, paddingBottom: cipler.length ? 8 : 12, textAlign: rtl ? "right" : "left" }}>{renderEvt(event.k, event.text, event.p, lang, t, state.player.gender === "kadın")}</Text>
      {cipler.length > 0 && <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 12, paddingBottom: 12 }}>
        {cipler.map(([k, v]) => <View key={k} accessible accessibilityLabel={`${t(ETKI_LABEL[k] || k)} ${v > 0 ? "+" : "−"}${Math.abs(v)}`} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4, borderWidth: 1, borderColor: MK.frame, backgroundColor: "rgba(18,13,8,0.88)" }}>
          <GameIcon name={ETKI[k].icon} size={12} color={v > 0 ? ETKI[k].color : MK.muted} />
          <Text style={{ fontFamily: F.display, fontSize: 12.5, color: v > 0 ? "#F4E8CF" : "#E08A7A" }}>{v > 0 ? "+" : "−"}{Math.abs(v)} {t(ETKI_LABEL[k] || k)}</Text>
        </View>)}
      </View>}
    </MkPanel>;
  }
  const tema = ikilemTema(d.id, d.icon);
  const two = width >= 340 && d.choices.length === 2;
  return <MkPanel style={{ marginBottom: 10 }}>
    {tema && <View pointerEvents="none" style={{ position: "absolute", top: 0, [rtl ? "left" : "right"]: 0, width: "46%", height: 118, overflow: "hidden" }}>
      <Image accessible={false} source={SAHNE_GORSEL[tema]} resizeMode="cover" style={{ width: "100%", height: "100%", opacity: 0.85 }} />
      <LinearGradient start={{ x: rtl ? 1 : 0, y: 0 }} end={{ x: rtl ? 0 : 1, y: 0 }} colors={["rgba(22,16,10,0.95)", "rgba(22,16,10,0.4)", "rgba(22,16,10,0)"]} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={["rgba(22,16,10,0)", "rgba(22,16,10,0.95)"]} locations={[0.5, 1]} style={StyleSheet.absoluteFill} />
    </View>}
    <MkPanelHeader title={t("flow.monthDecision")} rtl={rtl} right={<Text style={{ fontFamily: F.display, fontSize: 10.5, letterSpacing: 1, color: "#E08A7A", borderWidth: 1, borderColor: "rgba(224,138,122,0.5)", borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 }}>{t("flow.secimBekliyor")}</Text>} />
    <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: MK.ink, paddingHorizontal: 14, paddingRight: rtl ? 14 : tema ? "30%" : 14, paddingLeft: rtl && tema ? "30%" : 14, minHeight: 56, textAlign: rtl ? "right" : "left", textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 3 }}>
      <Text style={{ color: MK.gold }}>{text(`dil.${d.id}.t`, d.title)}. </Text>{text(`dil.${d.id}.x`, d.text)}
    </Text>
    <DanisanSesler m={m} secenekAdi={(i) => text(`dil.${d.id}.c${i}`, d.choices[i].label)} />
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 7, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10 }}>
      {d.choices.map((choice, index) => {
        const label = text(`dil.${d.id}.c${index}`, choice.label);
        const list = etkiler(choice);
        const lead = [...list].sort((a, b) => Number(b.big) - Number(a.big))[0];
        return <PressableScale key={index} accessibilityLabel={label} haptic="selection" onPress={() => { playTap(); apply(s => chooseMonthDilemma(s, m.id, index)); }}
          style={{ flexGrow: 1, flexBasis: two ? "45%" : "100%", minHeight: 58, borderRadius: 4, borderWidth: 1, borderColor: MK.frame, backgroundColor: "rgba(18,13,8,0.88)", flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 8, paddingHorizontal: 9, paddingVertical: 7 }}>
          <View style={{ width: 34, alignItems: "center" }}>{lead ? <GameIcon name={ETKI[lead.k].icon} size={30} color={MK.gold} /> : <Ornament size={22} />}</View>
          <View style={{ flex: 1, minWidth: 0, alignItems: rtl ? "flex-end" : "flex-start" }}>
            <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 18, color: "#F4E8CF", textAlign: rtl ? "right" : "left" }}>{label}</Text>
            {list.length > 0 && <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 16, color: MK.muted }}>{list.map((x) => `${t(ETKI_LABEL[x.k] || x.k)} ${yonOku(x)}`).join(" · ")}</Text>}
            {choice.sans !== undefined && <Text style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 16, color: MK.muted }}>{applyParams(t("ahi.odds"), [choice.sans])}</Text>}
          </View>
        </PressableScale>;
      })}
    </View>
  </MkPanel>;
}
