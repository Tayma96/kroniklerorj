// F6b (K7) arayüz: tehlike sayaçları (karakter ekranı, yalnız >0 olanlar) ve kanca kartı (ay sahnesi kalıbı: telafi yayı,
// elçilik, muhbirlik). Kart seçenekleri motorun kancaSecenekleri tanımından okunur; zar varsa şans etiketi dokununca kalemleri açar.
import { useState } from "react";
import { View, Text } from "react-native";
import { PressableScale, Panel } from "./ui";
import { useGame } from "./store";
import { useI18n, applyParams, renderEvt } from "./i18n";
import { pendingMonthScene, chooseMonthKanca } from "./month-scene";
import { kancaSecenekleri, kancaSecilebilir, tehlike, TEHLIKE_TIPLER, TEHLIKE_IKON, TEHLIKE_ESIK, TEHLIKE_GUNDEM, zarOrani, divanErisim, divanHizmetinde, divanDavaId, divanDavaci, divanDavaAcik, divanDavaKarar, dilekceHarci, dilekceAcik, dilekceVer, dilekceZar, dilekceYolHedefleri, DILEKCE_ARA, knParam as knParamUi, type DilekceTur, type GameState, type KancaId } from "./game";
import { DIVAN_YOLLAR } from "./divan";
import type { EvtParam } from "./i18n";
import { MkPanel, MkPanelHeader } from "./home-mockup-ui";
import { SansEtiketi } from "./sans-etiketi";
import { GameIcon } from "./icons";
import { yon } from "./sayfa/karakter/parca";
import { playTap } from "./sound";
import { C, F } from "./theme";

const tonu = (v: number) => (v >= TEHLIKE_ESIK ? C.blood : v >= TEHLIKE_GUNDEM ? C.ember : C.parchmentDim);

export function TehlikeSayaclari() {
  const { state } = useGame(), { t, lang } = useI18n();
  if (!state || state.player.dead) return null;
  const { rtl, row, ta } = yon(lang); const p = state.player;
  const acik = TEHLIKE_TIPLER.map((k) => ({ k, v: tehlike(p, k) })).filter((x) => x.v > 0);
  if (!acik.length) return null;
  return <View style={{ marginTop: 10 }} accessible accessibilityLabel={`${t("teh.baslik")}. ${acik.map((x) => applyParams(t("teh.a11y"), [t("teh." + x.k), x.v])).join(", ")}. ${t("teh.ipucu")}`}>
    <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: 1, color: C.parchmentMuted, textAlign: ta, marginBottom: 6 }}>{t("teh.baslik")}</Text>
    <View style={{ flexDirection: row, flexWrap: "wrap", gap: 6, justifyContent: rtl ? "flex-end" : "flex-start" }}>
      {acik.map((x) => <View key={x.k} style={{ flexDirection: row, alignItems: "center", gap: 6, minHeight: 30, paddingHorizontal: 10, borderRadius: 15, borderWidth: 1, borderColor: tonu(x.v), backgroundColor: C.surface }}>
        <GameIcon name={TEHLIKE_IKON[x.k]} size={13} color={tonu(x.v)} />
        <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchment }}>{t("teh." + x.k)} {x.v}<Text style={{ fontSize: 10, color: C.parchmentMuted }}> / 10</Text></Text>
      </View>)}
    </View>
    <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, lineHeight: 17, color: C.parchmentMuted, textAlign: ta, marginTop: 6 }}>{t("teh.ipucu")}</Text>
  </View>;
}

function govdeParam(s: GameState, id: KancaId, h?: string): EvtParam[] {
  const p = s.player;
  if (id === "borc") return [Math.round(p.debt || 0), tehlike(p, "borc")];
  if (id === "yara") return [Math.round(p.health), tehlike(p, "yara")];
  if (id === "elci") { const hn = (s.rivals || []).find((x) => x.id === h)?.nameIdx; return [hn != null ? { hn } : ""]; }
  if (id === "muhbir") return [];
  return [tehlike(p, id)];
}

export function MkKanca() {
  const { state, apply } = useGame(), { t, lang } = useI18n();
  if (!state || state.player.dead) return null;
  const { rtl, ta } = yon(lang); const female = state.player.gender === "kadın";
  const m = pendingMonthScene(state);
  if (!m?.kan) {
    const sc = state.monthScene?.turn === state.turn ? state.monthScene.secim : undefined;
    if (!sc?.id.startsWith("kan.")) return null;
    const ev = [...state.history].reverse().find((e) => e.day === state.turn && e.k?.startsWith("f6b.k."));
    if (!ev) return null;
    return <MkPanel style={{ marginBottom: 10 }}>
      <MkPanelHeader title={t(`f6b.k.${sc.label}.baslik`)} rtl={rtl} />
      <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchment, paddingHorizontal: 14, paddingBottom: 12, textAlign: ta }}>{renderEvt(ev.k, ev.text, ev.p, lang, t, female)}</Text>
    </MkPanel>;
  }
  const k = m.kan; const baslik = t(`f6b.k.${k.id}.baslik`);
  if (!kancaSecilebilir(state, k)) return <MkPanel style={{ marginBottom: 10 }}>
    <MkPanelHeader title={baslik} rtl={rtl} />
    <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentDim, paddingHorizontal: 14, textAlign: ta }}>{t("f6b.kapandi")}</Text>
    <PressableScale haptic="selection" accessibilityLabel={t("f6b.kapat")} onPress={() => apply((s) => chooseMonthKanca(s, m.id, 0))}
      style={{ minHeight: 44, margin: 10, borderRadius: 4, borderWidth: 1, borderColor: C.borderHi, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{t("f6b.kapat")}</Text>
    </PressableScale>
  </MkPanel>;
  const ops = kancaSecenekleri(state, k);
  return <MkPanel red style={{ marginBottom: 10 }}>
    <MkPanelHeader title={baslik} rtl={rtl} right={<Text style={{ fontFamily: F.display, fontSize: 10.5, letterSpacing: 1, color: C.goldBright, borderWidth: 1, borderColor: C.goldDim, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 }}>{t("flow.secimBekliyor")}</Text>} />
    <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: C.parchment, paddingHorizontal: 14, paddingBottom: 2, textAlign: ta }}>{renderEvt(`f6b.k.${k.id}.x`, "", govdeParam(state, k.id, k.h), lang, t, female)}</Text>
    <View style={{ gap: 7, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10 }}>
      {ops.map((o, i) => {
        const etiket = t(`f6b.k.${k.id}.s.${o.key}`);
        const yol = o.kapali ? t("f6b.kapali") : renderEvt(`f6b.k.${k.id}.s.${o.key}D`, "", o.p ?? (o.bedel != null ? [o.bedel] : []), lang, t, female);
        return <View key={o.key} style={{ gap: 4 }}>
          <PressableScale haptic="selection" disabled={o.kapali} accessibilityLabel={`${etiket}. ${yol}`}
            onPress={() => { playTap(); apply((s) => chooseMonthKanca(s, m.id, i)); }}
            style={{ minHeight: 56, borderRadius: 4, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.surface, opacity: o.kapali ? 0.5 : 1, paddingHorizontal: 12, paddingVertical: 8, alignItems: rtl ? "flex-end" : "flex-start" }}>
            <Text style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 20, color: C.parchment, textAlign: ta }}>{etiket}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: C.parchmentDim, textAlign: ta, marginTop: 2 }}>{yol}</Text>
          </PressableScale>
          {o.zar && !o.kapali ? <SansEtiketi zar={zarOrani(state, o.zar)} baslik="f6b.zar" /> : null}
        </View>;
      })}
    </View>
  </MkPanel>;
}

// Divan ekranı (oyun durumu): hizmetteysen bu ayın davası (ayda en çok bir hüküm), değilsen dilekçe kapısı.
export function DivanOyunPanel() {
  const { state, apply } = useGame(), { t, lang } = useI18n();
  const [yolAc, setYolAc] = useState(false);
  if (!state || state.player.dead || !divanErisim(state.player)) return null;
  const { rtl, row, ta } = yon(lang); const p = state.player; const female = p.gender === "kadın";
  const dugme = (key: string, label: string, alt: string, onPress: () => void, disabled = false) => <PressableScale key={key} haptic="selection" disabled={disabled} accessibilityLabel={`${label}. ${alt}`} onPress={() => { playTap(); onPress(); }}
    style={{ minHeight: 52, borderRadius: 4, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.surface, opacity: disabled ? 0.5 : 1, paddingHorizontal: 12, paddingVertical: 8, alignItems: rtl ? "flex-end" : "flex-start" }}>
    <Text style={{ fontFamily: F.serif, fontSize: 15.5, lineHeight: 20, color: C.parchment, textAlign: ta }}>{label}</Text>
    <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: C.parchmentDim, textAlign: ta, marginTop: 2 }}>{alt}</Text>
  </PressableScale>;
  const metin = (s: string, dim = false) => <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: dim ? C.parchmentDim : C.parchment, textAlign: ta, marginBottom: 8 }}>{s}</Text>;
  const sonOlay = (re: RegExp) => [...state.history].reverse().find((e) => e.day === state.turn && re.test(e.k || ""));
  if (divanHizmetinde(p)) {
    const id = divanDavaId(state); const d = divanDavaci(state); const acik = divanDavaAcik(state); const ev = sonOlay(/^f6b\.dv\.karar\./);
    return <Panel title={t("f6b.dv.baslik")} icon="tarih">
      {metin(t("f6b.dv.x"))}
      <Text style={{ fontFamily: F.display, fontSize: 14, color: C.gold, textAlign: ta, marginBottom: 4 }}>{t("divan." + id + ".t")}</Text>
      {metin(t("divan." + id + ".x"))}
      {d ? metin(renderEvt("f6b.dv.davaci", "", [knParamUi(d)], lang, t, female), true) : null}
      {acik ? <View style={{ gap: 7 }}>
        {DIVAN_YOLLAR.map((y) => dugme("y" + y, t("divan." + id + ".c" + y), `${t("divan.yol." + y)} · ${t("f6b.dv.yolD." + y)}`, () => apply((s) => divanDavaKarar(s, y))))}
        {metin(t("f6b.dv.halkNot"), true)}
      </View> : <View>{ev ? metin(renderEvt(ev.k, ev.text, ev.p, lang, t, female)) : null}{metin(t("f6b.dv.bitti"), true)}</View>}
    </Panel>;
  }
  const harc = dilekceHarci(state); const ev = sonOlay(/^f6b\.dl\./);
  const bekle = state.turn - (p.dilekce_turn ?? -99) < DILEKCE_ARA;
  const turler = (["soz", "borc", "yol"] as DilekceTur[]).filter((x) => dilekceAcik(state, x));
  const zarO = zarOrani(state, dilekceZar(state));
  return <Panel title={t("f6b.dl.baslik")} icon="scroll-open">
    {metin(applyParams(t("f6b.dl.x"), [harc]))}
    {ev ? metin(renderEvt(ev.k, ev.text, ev.p, lang, t, female)) : null}
    {bekle ? metin(t("f6b.dl.bekle"), true) : !turler.length ? metin(t("f6b.dl.yok"), true) : <View style={{ gap: 7 }}>
      {turler.map((x) => x === "yol"
        ? dugme("yol", t("f6b.dl.yol"), t("f6b.dl.yolD"), () => setYolAc(!yolAc), p.money < harc)
        : dugme(x, t("f6b.dl." + x), applyParams(t(`f6b.dl.${x}D`), [tehlike(p, x)]), () => apply((s) => dilekceVer(s, x)), p.money < harc))}
      {yolAc && turler.includes("yol") ? <View style={{ gap: 6 }}>
        {metin(t("f6b.dl.yolSec"), true)}
        <View style={{ flexDirection: row, flexWrap: "wrap", gap: 6 }}>
          {dilekceYolHedefleri(state).map((b) => <PressableScale key={b} haptic="selection" accessibilityLabel={t("beylik." + b)} onPress={() => { playTap(); setYolAc(false); apply((s) => dilekceVer(s, "yol", b)); }}
            style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 4, borderWidth: 1, borderColor: C.goldDim, justifyContent: "center" }}>
            <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{t("beylik." + b)}</Text>
          </PressableScale>)}
        </View>
      </View> : null}
      <SansEtiketi zar={zarO} baslik="f6b.zar" />
    </View>}
  </Panel>;
}
