// F4 (K5) usta kapısı kartı (ay sahnesi): üç usta adayı (hayal · aile · çevre) ve "henüz değil". Her adayda meslek, ustanın adı
// ve huyu, şartın durumu (eksikse "kabul eder ama ilk sınav zor") ve yolun tek cümlelik vaadi. Seçim kesin; ihtimal gösterilmez.
import { View, Text } from "react-native";
import { PressableScale } from "./ui";
import { useGame } from "./store";
import { useI18n, applyParams, renderEvt } from "./i18n";
import { pendingMonthScene, chooseMonthMektep } from "./month-scene";
import { ustaAdayOzeti, meslekSarti, meslekSermaye, USTA_KAPISI_ERTELEME } from "./game";
import { professionNameL, traitL } from "./locale-data";
import { MkPanel, MkPanelHeader } from "./home-mockup-ui";
import { yolEtkiMetni, meslekIkonu } from "./sayfa/meslek/ortak";
import { GameIcon } from "./icons";
import { MK } from "./mk-sus";
import { playTap } from "./sound";
import { C, F } from "./theme";

export function MkUstaKapisi() {
  const { state, apply } = useGame(), { t, lang } = useI18n();
  if (!state || state.player.dead) return null;
  const p = state.player, rtl = lang === "ar", align = rtl ? "right" as const : "left" as const, kadin = p.gender === "kadın";
  const m = pendingMonthScene(state);
  if (m?.mek?.id !== "usta") {
    // Seçimden sonra aynı yerde sonuç satırı (kronikteki kayıttan).
    const sc = state.monthScene?.turn === state.turn ? state.monthScene.secim : undefined;
    if (sc?.id !== "mek.usta") return null;
    const ev = [...state.history].reverse().find((e) => e.day === state.turn && e.k?.startsWith("ms.kapi."));
    if (!ev) return null;
    return <MkPanel style={{ marginBottom: 10 }}>
      <MkPanelHeader title={t("ms.kapi.baslik")} rtl={rtl} />
      <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: MK.ink, paddingHorizontal: 14, paddingBottom: 12, textAlign: align }}>{renderEvt(ev.k, ev.text, ev.p, lang, t, kadin)}</Text>
    </MkPanel>;
  }
  const adaylar = ustaAdayOzeti(state, lang);
  const kalan = USTA_KAPISI_ERTELEME - (p.usta_kapisi?.ert || 0) - 1;
  const sec = (i: number) => { playTap(); apply((s) => chooseMonthMektep(s, m.id, i)); };
  return <MkPanel red style={{ marginBottom: 10 }}>
    <MkPanelHeader title={t("ms.kapi.baslik")} rtl={rtl} right={<Text style={{ fontFamily: F.display, fontSize: 10.5, letterSpacing: 1, color: "#F4C9B8", borderWidth: 1, borderColor: "rgba(244,201,184,0.5)", borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 }}>{t("flow.secimBekliyor")}</Text>} />
    <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: "#FBEBD6", paddingHorizontal: 14, paddingBottom: 2, textAlign: align }}>{t("ms.kapi.x")}</Text>
    <View style={{ gap: 7, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10 }}>
      {adaylar.map((a, i) => {
        const meslek = professionNameL(a.aday.prof, lang, kadin);
        const usta = a.npc ? applyParams(t("ms.kapi.usta"), [a.npc.name, traitL(a.npc.trait, lang)], lang) : "";
        const ms = meslekSarti(a.aday.prof);
        const eksikler = ms ? [a.eksik.stat && ms.statMin > 0 ? `${t("st." + ms.stat)} ${ms.statMin}` : "", a.eksik.xp && ms.xpMin > 0 ? t("skill." + ms.skill) : "", a.eksik.sermaye && meslekSermaye(state, a.aday.prof) > 0 ? t("mes.capital").replace("%1", String(meslekSermaye(state, a.aday.prof))) : ""].filter(Boolean).join(", ") : "";
        const sart = a.tamam ? t("ms.kapi.tamam") : applyParams(t("ms.kapi.eksikNot"), [eksikler], lang);
        const vaat = yolEtkiMetni(t, lang, a.aday.prof, 1);
        return <PressableScale key={a.aday.id} haptic="selection" disabled={!a.npc} accessibilityLabel={`${meslek}. ${t("ms.kapi.kaynak." + a.aday.kaynak)}. ${usta}. ${sart} ${vaat}`} onPress={() => sec(i)}
          style={{ minHeight: 56, borderRadius: 4, borderWidth: 1, borderColor: "rgba(244,201,184,0.45)", backgroundColor: "rgba(18,8,5,0.82)", paddingHorizontal: 12, paddingVertical: 9, opacity: a.npc ? 1 : 0.5 }}>
          <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
            <GameIcon name={meslekIkonu(a.aday.prof)} size={18} color={MK.gold} />
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 16, lineHeight: 20, color: "#F4E8CF", textAlign: align }}>{meslek}</Text>
            <Text numberOfLines={2} style={{ flexShrink: 1, maxWidth: "45%", fontFamily: F.display, fontSize: 11, letterSpacing: 0.5, color: "#E9CBB6" }}>{t("ms.kapi.kaynak." + a.aday.kaynak)}</Text>
          </View>
          {!!usta && <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: "#E9CBB6", textAlign: align, marginTop: 3 }}>{usta}</Text>}
          <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: a.tamam ? C.sage : C.emberSoft, textAlign: align, marginTop: 3 }}>{sart}</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 17, color: MK.muted, textAlign: align, marginTop: 2 }}>{vaat}</Text>
        </PressableScale>;
      })}
      <PressableScale haptic="selection" accessibilityLabel={`${t("ms.kapi.henuz")}. ${applyParams(t("ms.kapi.henuz.d"), [Math.max(0, kalan)], lang)}`} onPress={() => sec(3)}
        style={{ minHeight: 52, borderRadius: 4, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(244,201,184,0.35)", backgroundColor: "rgba(18,8,5,0.6)", paddingHorizontal: 12, paddingVertical: 8, alignItems: rtl ? "flex-end" : "flex-start" }}>
        <Text style={{ fontFamily: F.serif, fontSize: 15.5, lineHeight: 20, color: "#F4E8CF", textAlign: align }}>{t("ms.kapi.henuz")}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: "#E9CBB6", textAlign: align, marginTop: 2 }}>{applyParams(t("ms.kapi.henuz.d"), [Math.max(0, kalan)], lang)}</Text>
      </PressableScale>
    </View>
  </MkPanel>;
}
