import { DesignPressable as Pressable } from "./design-pressable";
import { View, Text} from "react-native";
import { GameState, Rumor, rumorReplyOptions, kisiProfil, kisiOf, acikHesaplar, inJail } from "./game";
import { useI18n, renderEvt, applyParams, yuzdeL } from "./i18n";
import { C, F } from "./theme";
import { GameIcon } from "./icons";

type Action = "yuzles" | "yay" | "sustur" | "sahit";
export function SoylentiKarti({ state, rumor: r, onAction, onSource }: { state: GameState; rumor: Rumor; onAction: (action: Action) => void; onSource: (id: string) => void }) {
  const { t, lang } = useI18n(), p = state.player, o = rumorReplyOptions(state, r);
  const source = o.sourceId ? kisiProfil(state, o.sourceId, lang)?.npc : undefined;
  const witness = o.witnessId ? kisiProfil(state, o.witnessId, lang)?.npc : undefined;
  const locked = r.islemTurn === state.turn;
  const sourceBlocked = !!r.duyanlar && (!o.sourceHere || o.quiet);
  const disabled = !o.available || locked;
  const corrected = r.duyanlar?.filter(h => h.chain.length > 1 && h.aciklama).length || 0;
  const quote = renderEvt("rumor." + r.tur + "." + r.vi, "", [p.name, source?.name || r.kaynak], lang, t, p.gender === "kadın");
  const button = (action: Action, label: string, blocked: boolean) => <Pressable key={action} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: blocked }} disabled={blocked} onPress={() => onAction(action)} style={{ flex: 1, minHeight: 44, justifyContent: "center", alignItems: "center", padding: 8, borderRadius: 5, borderWidth: 1, borderColor: C.borderHi, opacity: blocked ? .45 : 1 }}><Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment, textAlign: "center" }}>{label}</Text></Pressable>;
  return <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, borderLeftColor: r.yon > 0 ? C.sage : C.blood, borderRadius: 5, padding: 12, marginBottom: 8 }}>
    <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentDim, lineHeight: 22 }}>{quote}</Text>
    <Text style={{ fontFamily: F.display, fontSize: 13, color: C.goldDim, marginTop: 5 }}>{t("rum.intensity")}: {"●".repeat(Math.max(1, Math.round(r.siddet)))}</Text>
    {r.duyanlar && <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentMuted, marginTop: 5 }}>{applyParams(t("rum.net.count"), [r.duyanlar.length], lang)}</Text>}
    {corrected > 0 && <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.sage, marginTop: 5 }}>{applyParams(t("rum.reply.count"), [corrected], lang)}</Text>}
    {source && o.sourceId && <Pressable accessibilityRole="button" accessibilityLabel={t("rum.reply.source") + ": " + source.name} onPress={() => onSource(o.sourceId!)} style={{ minHeight: 44, flexDirection: lang === "ar" ? "row-reverse" : "row", alignItems: "center", gap: 6 }}><GameIcon name="sosyal" size={13} color={C.gold} /><Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.gold }}>{t("rum.reply.source")}: {source.name}</Text></Pressable>}
    {locked && <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, marginTop: 5 }}>{t("rum.net.lock")}</Text>}
    {sourceBlocked && <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, marginTop: 5 }}>{t(o.quiet ? "rum.reply.quiet" : "rum.reply.away")}</Text>}
    {!sourceBlocked && <>
      <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentMuted, lineHeight: 22, marginTop: 6 }}>{applyParams(t("rum.reply.confrontHint"), [yuzdeL(Math.round(o.chance * 100), lang)])}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentMuted, lineHeight: 22, marginTop: 4 }}>{applyParams(t("rum.reply.silenceHint"), [yuzdeL(70, lang)])}</Text>
    </>}
    <View style={{ flexDirection: lang === "ar" ? "row-reverse" : "row", gap: 8, marginTop: 8 }}>
      {button("yuzles", t("rum.confront"), disabled || sourceBlocked)}
      {r.yon > 0 && button("yay", t("rum.spread"), disabled || !!r.yayildi)}
      {button("sustur", t("rum.silence") + " " + o.cost + "⚜", disabled || sourceBlocked || p.money < o.cost)}
    </View>
    {r.yon < 0 && r.duyanlar && <View style={{ marginTop: 10 }}>
      <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentMuted, lineHeight: 22 }}>{witness ? applyParams(t("rum.reply.offer"), [witness.name, o.listeners.length], lang) : t(o.listeners.length ? "rum.reply.none" : "rum.reply.clean")}</Text>
      {witness && <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentMuted, marginTop: 4 }}>{t("rum.reply.cost")}</Text>}
      <View style={{ marginTop: 8 }}>{button("sahit", t("rum.reply.action"), disabled || !witness)}</View>
    </View>}
  </View>;
}

// Tek görünür iz: menüyü büyütmeden yaşayan kişilerin bildiği kötü söze yönlendirir.
export function SoylentiIzi({ state, onOpen }: { state: GameState; onOpen: (id: string) => void }) {
  const { t } = useI18n(), p = state.player;
  if (p.dead || p.age < 13 || inJail(p) || state.npcTeklif || state.hesap || acikHesaplar(state).length >= 5) return null;
  const lead = (state.player_rumors || []).filter(r => r.yon < 0 && r.siddet >= 1 && r.islemTurn !== state.turn && r.duyanlar?.some(h => {
    const k = kisiOf(state, h.id); return h.chain.length > 1 && !h.aciklama && !h.sessiz && k && k.ol == null && k.loc === p.location_name;
  })).sort((a, b) => b.siddet - a.siddet)[0];
  if (!lead) return null;
  return <Pressable accessibilityRole="button" accessibilityLabel={t("rum.reply.lead")} onPress={() => onOpen(lead.id)} style={{ marginHorizontal: 12, marginTop: 8, padding: 10, minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: C.border, borderRadius: 5 }}><GameIcon name="speaker" size={16} color={C.gold} /><Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchment, lineHeight: 22 }}>{t("rum.reply.lead")}</Text></Pressable>;
}
