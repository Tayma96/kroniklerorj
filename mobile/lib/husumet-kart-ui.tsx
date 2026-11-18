// F6a husumet kartı (ay sahnesi): yakın çevrendeki iki kişi arasına husumet girdi — A'nın yanında dur, B'nin yanında dur
// ya da arabulucu ol (karizma + sosyal + pazarlık hünerleri zarı; şans etiketi dokununca kalemleri açar).
// Seçimden sonra aynı yerde sonuç satırı kalır.
import { View, Text } from "react-native";
import { PressableScale } from "./ui";
import { useGame } from "./store";
import { useI18n, applyParams, renderEvt } from "./i18n";
import { pendingMonthScene, chooseMonthHusumet } from "./month-scene";
import { husumetZar, zarOrani, nufusOf } from "./game";
import { kisiIlkAd } from "./nufus";
import { MkPanel, MkPanelHeader } from "./home-mockup-ui";
import { SansEtiketi } from "./sans-etiketi";
import { yon } from "./sayfa/karakter/parca";
import { playTap } from "./sound";
import type { Lang } from "./locale-data";
import { C, F } from "./theme";

export function MkHusumet() {
  const { state, apply } = useGame(), { t, lang } = useI18n();
  if (!state || state.player.dead) return null;
  const { rtl, ta } = yon(lang); const female = state.player.gender === "kadın";
  const m = pendingMonthScene(state);
  if (!m?.hus) {
    const sc = state.monthScene?.turn === state.turn ? state.monthScene.secim : undefined;
    if (sc?.id !== "hus") return null;
    const ev = [...state.history].reverse().find((e) => e.day === state.turn && e.k?.startsWith("f6.hus."));
    if (!ev) return null;
    return <MkPanel style={{ marginBottom: 10 }}>
      <MkPanelHeader title={t("f6.hus.baslik")} rtl={rtl} />
      <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchment, paddingHorizontal: 14, paddingBottom: 12, textAlign: ta }}>{renderEvt(ev.k, ev.text, ev.p, lang, t, female)}</Text>
    </MkPanel>;
  }
  const { a, b } = m.hus; const pop = nufusOf(state);
  const ad = (id: string) => { const k = pop.k[id]; return k ? kisiIlkAd(k, lang as Lang) : "?"; };
  const zar = zarOrani(state, husumetZar(state, a, b));
  const secenekler = [
    { etiket: applyParams(t("f6.hus.yan"), [ad(a)]), yol: t("f6.hus.yanD") },
    { etiket: applyParams(t("f6.hus.yan"), [ad(b)]), yol: t("f6.hus.yanD") },
    { etiket: t("f6.hus.arabulucu"), yol: t("f6.hus.arabulucuD") },
  ];
  return <MkPanel red style={{ marginBottom: 10 }}>
    <MkPanelHeader title={t("f6.hus.baslik")} rtl={rtl} right={<Text style={{ fontFamily: F.display, fontSize: 10.5, letterSpacing: 1, color: C.goldBright, borderWidth: 1, borderColor: C.goldDim, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 }}>{t("flow.secimBekliyor")}</Text>} />
    <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: C.parchment, paddingHorizontal: 14, paddingBottom: 2, textAlign: ta }}>{applyParams(t("f6.hus.x"), [ad(a), ad(b)])}</Text>
    <View style={{ gap: 7, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10 }}>
      {secenekler.map((c, i) => <View key={i} style={{ gap: 4 }}>
        <PressableScale haptic="selection" accessibilityLabel={`${c.etiket}. ${c.yol}`} onPress={() => { playTap(); apply((s) => chooseMonthHusumet(s, m.id, i)); }}
          style={{ minHeight: 56, borderRadius: 4, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.surface, paddingHorizontal: 12, paddingVertical: 8, alignItems: rtl ? "flex-end" : "flex-start" }}>
          <Text style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 20, color: C.parchment, textAlign: ta }}>{c.etiket}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: C.parchmentDim, textAlign: ta, marginTop: 2 }}>{c.yol}</Text>
        </PressableScale>
        {i === 2 ? <SansEtiketi zar={zar} baslik="f6.hus.zar" /> : null}
      </View>)}
    </View>
  </MkPanel>;
}
