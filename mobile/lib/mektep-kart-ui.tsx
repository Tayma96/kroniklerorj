// F3 mektep kartı (ay sahnesi): sıbyan olayı, 12 yaş yol kararı ya da 17 yaş talimhane. A seçeneği zar ise şans etiketi
// görünür (dokununca kalemler); B güvenli ama başka bir değer verir. Seçimden sonra aynı yerde sonuç satırı.
import { View, Text } from "react-native";
import { PressableScale } from "./ui";
import { useGame } from "./store";
import { useI18n, applyParams, renderEvt } from "./i18n";
import { pendingMonthScene, chooseMonthMektep } from "./month-scene";
import { mektepKartZar, zarOrani, kilicBedeli } from "./game";
import { MkPanel, MkPanelHeader } from "./home-mockup-ui";
import { SansEtiketi } from "./sans-etiketi";
import { MK } from "./mk-sus";
import { playTap } from "./sound";
import { F } from "./theme";

export function MkMektep() {
  const { state, apply } = useGame(), { t, lang } = useI18n();
  if (!state || state.player.dead) return null;
  const rtl = lang === "ar", align = rtl ? "right" as const : "left" as const, female = state.player.gender === "kadın";
  const m = pendingMonthScene(state);
  if (!m?.mek) {
    const sc = state.monthScene?.turn === state.turn ? state.monthScene.secim : undefined;
    if (!sc?.id.startsWith("mek.")) return null;
    const ev = [...state.history].reverse().find((e) => e.day === state.turn && (e.k?.startsWith("sch.") || e.k?.startsWith("mek.kart.") || e.k?.startsWith("mek.yol.") || e.k?.startsWith("mek.icazet.")));
    if (!ev) return null;
    return <MkPanel style={{ marginBottom: 10 }}>
      <MkPanelHeader title={t("mek.kart.baslik")} rtl={rtl} />
      <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: MK.ink, paddingHorizontal: 14, paddingBottom: 12, textAlign: align }}>{renderEvt(ev.k, ev.text, ev.p, lang, t, female)}</Text>
    </MkPanel>;
  }
  const id = m.mek.id;
  const yol = id === "yol";
  const baslik = yol ? t("mek.yol.t") : t(`mek.kart.${id}.t`);
  const metin = yol ? t("mek.yol.x") : t(`mek.kart.${id}.x`);
  const zg = yol ? null : mektepKartZar(state, id);
  const zar = zg ? zarOrani(state, zg) : null;
  const secenekler = yol
    ? [{ etiket: t("mek.yol.cirak"), yol: t("mek.yol.cirak.d") }, { etiket: t("mek.yol.medrese"), yol: t("mek.yol.medrese.d") }]
    : [{ etiket: id === "kilic" ? applyParams(t("mek.kart.kilic.a"), [kilicBedeli(state)]) : t(`mek.kart.${id}.a`), yol: t(`mek.kart.${id}.ad`) }, { etiket: t(`mek.kart.${id}.b`), yol: t(`mek.kart.${id}.bd`) }];
  return <MkPanel red style={{ marginBottom: 10 }}>
    <MkPanelHeader title={t("mek.kart.baslik")} rtl={rtl} right={<Text style={{ fontFamily: F.display, fontSize: 10.5, letterSpacing: 1, color: "#F4C9B8", borderWidth: 1, borderColor: "rgba(244,201,184,0.5)", borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 }}>{t("flow.secimBekliyor")}</Text>} />
    <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: "#FBEBD6", paddingHorizontal: 14, paddingBottom: 2, textAlign: align }}>
      <Text style={{ color: MK.gold }}>{baslik}. </Text>{metin}
    </Text>
    <View style={{ gap: 7, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10 }}>
      {secenekler.map((c, i) => <View key={i} style={{ gap: 4 }}>
        <PressableScale haptic="selection" accessibilityRole="button" accessibilityLabel={`${c.etiket}. ${c.yol}`} onPress={() => { playTap(); apply((s) => chooseMonthMektep(s, m.id, i)); }}
          style={{ minHeight: 56, borderRadius: 4, borderWidth: 1, borderColor: "rgba(244,201,184,0.45)", backgroundColor: "rgba(18,8,5,0.82)", paddingHorizontal: 12, paddingVertical: 8, alignItems: rtl ? "flex-end" : "flex-start" }}>
          <Text style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 20, color: "#F4E8CF", textAlign: align }}>{c.etiket}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: "#E9CBB6", textAlign: align, marginTop: 2 }}>{c.yol}</Text>
          {!yol && i === 1 ? <Text style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 16, color: MK.muted, textAlign: align, marginTop: 2 }}>{t("mek.kart.guvenli")}</Text> : null}
        </PressableScale>
        {zar && i === 0 ? <SansEtiketi zar={zar} baslik="mek.kart.zar" /> : null}
      </View>)}
    </View>
  </MkPanel>;
}
