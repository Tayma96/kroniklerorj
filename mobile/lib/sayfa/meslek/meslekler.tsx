// Zanaatlar sekmesi: tezgâhın, sana açık meslekler ve henüz kapalı olanlar. Satır açılır, şartlar ve geçiş düğmesi görünür.
import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { changeProfession, PROFESSIONS, meslekSarti, meslekEksik, meslekSermaye, meslegeUygun, effStat, type Profession } from "../../game";
import { professionNameL } from "../../locale-data";
import { useGame } from "../../store";
import { useI18n, applyParams } from "../../i18n";
import { hap } from "../../haptics";
import { playTap } from "../../sound";
import { GameIcon } from "../../icons";
import { Panel } from "../../ui";
import { C, F } from "../../theme";
import { Madalyon, Etiket, Rozet, EylemDugmesi, meslekIkonu, yon, hiza } from "./ortak";

export function MeslekListesi({ onGecti }: { onGecti: () => void }) {
  const { state, apply } = useGame();
  const { t, lang } = useI18n();
  const rtl = lang === "ar";
  const [acik, setAcik] = useState<string | null>(null);
  if (!state) return null;
  const p = state.player, kadin = p.gender === "kadın";
  const kilitli = (id: string) => id !== p.profession && !meslegeUygun(state, id);
  const mevcut = PROFESSIONS.filter((pr) => pr.id === p.profession);
  const uygun = PROFESSIONS.filter((pr) => pr.id !== p.profession && !kilitli(pr.id));
  const kapali = PROFESSIONS.filter((pr) => kilitli(pr.id));

  const satir = (pr: Profession, i: number) => {
    const cur = pr.id === p.profession, kilit = kilitli(pr.id), on = acik === pr.id;
    // Meslek hak edilir: yetenek (özellik) + emek (beceri tecrübesi) + gerekirse sermaye. Eksik şart kırmızı, yanında sendeki değer.
    const m = meslekSarti(pr.id), ek = meslekEksik(state, pr.id), ser = meslekSermaye(state, pr.id);
    const herkese = !!m && m.statMin === 0 && m.xpMin === 0 && !m.sermaye;
    const eksikSay = m ? [m.statMin > 0 && ek.stat, m.xpMin > 0 && ek.xp, ser > 0 && ek.sermaye].filter(Boolean).length : 0;
    const ad = professionNameL(pr.id, lang, kadin);
    const sart = (txt: string, eksik: boolean, sende: string) => (
      <View key={txt} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 7, marginTop: 3 }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: eksik ? C.blood : C.sage }} />
        <Text style={[{ flex: 1, fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: eksik ? C.blood : C.sage }, hiza(rtl)]}>{txt}{eksik ? `  ·  ${t("mes.youHave").replace("%1", sende)}` : ""}</Text>
      </View>
    );
    return (
      <View key={pr.id} style={{ borderTopWidth: i === 0 ? 0 : 1, borderColor: C.border + "AA" }}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: on }} accessibilityLabel={`${ad}. ${t("st." + pr.stat)} · ${pr.tiers.length} ${t("mes.tier")}`}
          onPress={() => { hap("selection"); playTap(); setAcik(on ? null : pr.id); }}
          style={({ pressed }) => ({ flexDirection: yon(rtl), alignItems: "center", gap: 11, minHeight: 60, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 6, backgroundColor: pressed ? C.cardHi : on ? "rgba(221,180,90,0.07)" : "transparent" })}>
          <Madalyon icon={meslekIkonu(pr.id)} size={40} dim={kilit} tone={cur ? C.goldBright : C.gold} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={[{ fontFamily: F.display, fontSize: 15, lineHeight: 20, color: cur ? C.goldBright : kilit ? C.parchmentDim : C.parchment }, hiza(rtl)]}>{ad}</Text>
            <Text numberOfLines={1} style={[{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentMuted }, hiza(rtl)]}>{t("st." + pr.stat)} · {pr.tiers.length} {t("mes.tier")}</Text>
          </View>
          {cur ? <Rozet text={t("mes.current")} tone={C.goldBright} />
            : kilit ? <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 4 }}><GameIcon name="hourglass" size={15} color={C.parchmentMuted} /><Text style={{ fontFamily: F.display, fontSize: 12.5, color: C.blood }}>{eksikSay}</Text></View>
            : <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: C.sage }} />}
          <Text accessible={false} style={{ fontFamily: F.display, fontSize: 18, color: C.goldDim, width: 14, textAlign: "center" }}>{on ? "⌄" : rtl ? "‹" : "›"}</Text>
        </Pressable>
        {on && (
          <View style={{ paddingBottom: 12, paddingHorizontal: 4 }}>
            <Text style={[{ fontFamily: F.display, fontSize: 13.5, lineHeight: 19, color: C.goldDim }, hiza(rtl)]}>{t("my." + pr.id + ".n")}</Text>
            <Text style={[{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 22, color: C.parchmentDim, marginTop: 2 }, hiza(rtl)]}>{t("my." + pr.id + ".d")}</Text>
            {!cur && m && (herkese ? (
              <Text style={[{ fontFamily: F.serifItalic, fontSize: 15, color: C.sage, marginTop: 6 }, hiza(rtl)]}>{t("mes.open")}</Text>
            ) : (
              <View style={{ marginTop: 8 }}>
                <Etiket rtl={rtl} tone={C.parchmentMuted}>{t("mes.need")}</Etiket>
                {m.statMin > 0 && sart(`${t("st." + m.stat)} ${m.statMin}`, ek.stat, String(Math.floor(effStat(p, m.stat))))}
                {m.xpMin > 0 && sart(applyParams(t("mes.xp"), [t("skill." + m.skill), m.xpMin], lang), ek.xp, String(p.skill_xp?.[m.skill] || 0))}
                {ser > 0 && sart(t("mes.capital").replace("%1", String(ser)), ek.sermaye, String(Math.floor(p.money)))}
              </View>
            ))}
            {!cur && <EylemDugmesi label={kilit ? t("meslek.kilit") : t("meslek.gec")} icon={kilit ? "hourglass" : meslekIkonu(pr.id)} variant="secondary" disabled={kilit || p.dead} rtl={rtl}
              onPress={() => { if (p.dead || kilit) return; hap("tap"); apply((s) => changeProfession(s, pr.id)); setAcik(null); onGecti(); }} />}
          </View>
        )}
      </View>
    );
  };
  const grup = (baslik: string, icon: string, liste: Profession[]) => liste.length === 0 ? null : (
    <Panel title={`${baslik} · ${liste.length}`} icon={icon}>{liste.map(satir)}</Panel>
  );
  return (
    <View>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, marginBottom: 12, padding: 11, borderRadius: 8, borderWidth: 1, borderColor: C.ember + "66", backgroundColor: "rgba(40,16,8,0.78)" }}>
        <GameIcon name="scales" size={18} color={C.emberSoft} />
        <Text style={[{ flex: 1, fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: C.parchment }, hiza(rtl)]}>{p.profession === "işsiz" ? t("meslek.issizNot") : t("mes.switchWarn")}</Text>
      </View>
      {mevcut.length > 0 && <Panel title={t("scr.meslek")} icon="anvil">{mevcut.map(satir)}</Panel>}
      {grup(t("meslek.grup.acik"), "compass", uygun)}
      {grup(t("meslek.grup.kapali"), "hourglass", kapali)}
    </View>
  );
}
