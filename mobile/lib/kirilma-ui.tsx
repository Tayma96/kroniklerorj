// Kader kırılması arayüzü (radikal sonuçlar, aşama 3): ay sahnesindeki büyük karar ve ana sayfadaki "hâlin" satırı.
// İçerik kayıttan türetilir (motor: kirilmaTeklif, kirilmaHaber, halOf); her seçenek ne kazandırdığını ve neyi kapattığını
// tek cümleyle söyler. Sayı yerine cümle; şans görünür.
import { View, Text } from "react-native";
import { GameIcon } from "./icons";
import { PressableScale } from "./ui";
import { useGame } from "./store";
import { useI18n, applyParams, renderEvt, type EvtParam } from "./i18n";
import { pendingMonthScene, chooseMonthKirilma } from "./month-scene";
import { kirilmaTeklif, kirilmaHaber, halOf, nufusOf, knParam, ORTAK_SURE, type GameState, type KirSahne } from "./game";
import { MkPanel, MkPanelHeader } from "./home-mockup-ui";
import { MK } from "./mk-sus";
import { playTap } from "./sound";
import { F } from "./theme";

const kisiP = (s: GameState, id?: string): EvtParam => { const k = id ? nufusOf(s).k[id] : undefined; return k ? knParam(k) : { sfx: "kir.kervanbasi" }; };
interface Secenek { etiket: string; yol: string; sans?: number }
// Sahnenin metni ve seçenekleri (dil bağımsız anahtar + parametre; çeviri arayüzde).
function sahneIcerik(s: GameState, tip: KirSahne, kisi: string | undefined, r: (k: string, p?: EvtParam[]) => string): { baslik: string; metin: string; secenekler: Secenek[] } | null {
  const kp = kisiP(s, kisi);
  if (tip === "teklif" || tip === "ikinci") {
    const tk = kirilmaTeklif(s, tip === "ikinci");
    return { baslik: r(`kir.${tip}.t`), metin: r(`kir.${tip}.x`, [kp, tk.sans]), secenekler: [
      { etiket: r("kir.teklif.c0", [tk.buyuk]), yol: r("kir.teklif.y0") },
      { etiket: r("kir.teklif.c1", [tk.kucuk]), yol: r("kir.teklif.y1") },
      { etiket: r("kir.teklif.c2"), yol: r("kir.teklif.y2") },
    ] };
  }
  if (tip === "haber") {
    const h = kirilmaHaber(s); if (!h) return null;
    return { baslik: r("kir.haber.t"), metin: r(h.iyi ? "kir.haber.iyi.x" : "kir.haber.kotu.x", [kp]), secenekler: [
      { etiket: r("kir.haber.c0", [h.geri]), yol: r("kir.haber.y0") },
      { etiket: r("kir.haber.c1"), yol: r("kir.haber.y1") },
      { etiket: r("kir.haber.c2"), yol: r("kir.haber.y2"), sans: h.yetis },
    ] };
  }
  const a = (s.player.kirilmalar || []).find((k) => k.id === "ortaklik" && k.faz === "alacakli"); if (!a) return null;
  return { baslik: r("kir.alacakli.t"), metin: r("kir.alacakli.x", [kp, a.borc || 0]), secenekler: [0, 1, 2].map((i) => ({ etiket: r(`kir.alacakli.c${i}`), yol: r(`kir.alacakli.y${i}`) })) };
}

export function MkKirilma() {
  const { state, apply, mpMode } = useGame(), { t, lang } = useI18n();
  if (!state || mpMode || state.player.dead) return null;
  const rtl = lang === "ar", align = rtl ? "right" as const : "left" as const, female = state.player.gender === "kadın";
  const r = (k: string, p?: EvtParam[]) => renderEvt(k, "", p, lang, t, female);
  const m = pendingMonthScene(state);
  if (!m?.kir) {
    // Seçimden sonra aynı yerde sonuç: bu ayın kırılma satırı (büyük anlar ayrıca pencereyle gelir).
    const sc = state.monthScene?.turn === state.turn ? state.monthScene.secim : undefined;
    if (!sc?.id.startsWith("kir.")) return null;
    const ev = [...state.history].reverse().find((e) => e.day === state.turn && e.k?.startsWith("evj.kir."));
    if (!ev) return null;
    return <MkPanel style={{ marginBottom: 10 }}>
      <MkPanelHeader title={t("kir.baslik")} rtl={rtl} />
      <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: MK.ink, paddingHorizontal: 14, paddingBottom: 12, textAlign: align }}>{renderEvt(ev.k, ev.text, ev.p, lang, t, female)}</Text>
    </MkPanel>;
  }
  const ic = sahneIcerik(state, m.kir.tip, m.kir.kisi, r);
  if (!ic) return null;
  return <MkPanel red style={{ marginBottom: 10 }}>
    <MkPanelHeader title={t("kir.baslik")} rtl={rtl} right={<Text style={{ fontFamily: F.display, fontSize: 10.5, letterSpacing: 1, color: "#F4C9B8", borderWidth: 1, borderColor: "rgba(244,201,184,0.5)", borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 }}>{t("flow.secimBekliyor")}</Text>} />
    <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: "#FBEBD6", paddingHorizontal: 14, paddingBottom: 2, textAlign: align }}>
      <Text style={{ color: MK.gold }}>{ic.baslik}. </Text>{ic.metin}
    </Text>
    <View style={{ gap: 7, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10 }}>
      {ic.secenekler.map((c, i) => <PressableScale key={i} haptic="selection" accessibilityLabel={`${c.etiket}. ${c.yol}`} onPress={() => { playTap(); apply((s) => chooseMonthKirilma(s, m.id, i)); }}
        style={{ minHeight: 56, borderRadius: 4, borderWidth: 1, borderColor: "rgba(244,201,184,0.45)", backgroundColor: "rgba(18,8,5,0.82)", paddingHorizontal: 12, paddingVertical: 8, alignItems: rtl ? "flex-end" : "flex-start" }}>
        <Text style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 20, color: "#F4E8CF", textAlign: align }}>{c.etiket}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: "#E9CBB6", textAlign: align, marginTop: 2 }}>{c.yol}</Text>
        {c.sans !== undefined && <Text style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 16, color: MK.muted, textAlign: align, marginTop: 2 }}>{applyParams(t("ahi.odds"), [c.sans])}</Text>}
      </PressableScale>)}
    </View>
  </MkPanel>;
}

// Hayatın hâli: süren kırılmalar tek satırda (kervan yolda, kâtiplik, kaçaklık, tüccar). Yoksa hiç görünmez.
export function MkHal() {
  const { state, mpMode } = useGame(), { t, lang } = useI18n();
  if (!state || mpMode || state.player.dead) return null;
  const hal = halOf(state); if (!hal.length) return null;
  const rtl = lang === "ar", female = state.player.gender === "kadın";
  const r = (k: string, p?: EvtParam[]) => renderEvt(k, "", p, lang, t, female);
  const satir = hal.map((k) => {
    const kalan = k.bitis != null ? k.bitis - state.turn : 0;
    if (k.id === "ortaklik") return { key: "o", icon: "compass", agir: k.faz === "alacakli", txt: k.faz === "alacakli" ? r("kir.hal.alacakli") : r("kir.hal.ortaklik", [Math.max(1, ORTAK_SURE - (state.turn - k.t))]) };
    if (k.id === "katip") return { key: "k", icon: "scroll", agir: true, txt: r("kir.hal.katip", [kalan]) };
    if (k.id === "kacak") return { key: "c", icon: "hood", agir: true, txt: r("kir.hal.kacak", [{ pl: k.yer || "" }, kalan]) };
    return { key: "t", icon: "scales", agir: false, txt: r("kir.hal.tuccar") };
  });
  return <View accessibilityRole="summary" accessibilityLabel={`${t("kir.hal.baslik")}: ${satir.map((x) => x.txt).join(", ")}`} style={{ marginHorizontal: MK.side, marginBottom: 10, flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
    <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: 1.2, color: MK.muted }}>{t("kir.hal.baslik")}</Text>
    {satir.map((x) => <View key={x.key} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 5, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 4, borderWidth: 1, borderColor: x.agir ? "rgba(224,138,122,0.55)" : MK.frame, backgroundColor: "rgba(18,13,8,0.88)" }}>
      <GameIcon name={x.icon} size={13} color={x.agir ? "#E08A7A" : MK.gold} />
      <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: "#F4E8CF" }}>{x.txt}</Text>
    </View>)}
  </View>;
}
