// Kariyer sekmesi: peştamal merdiveni (çıraktan zirveye), meslek fırsatı ve meslekle yazılan ömür (usta → pir → şaheser).
import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { professionById, careerTier, kariyerXp, sinavDurumu, hasProfAction, canProfAction, professionAction, profActionCooldownLeft, meslekYoluKademesi, meslekYoluIlerleme, MESLEK_YOLU_ESIK, meslekSaheserleri, neslinSaheseri, saheserBedeli, saheserYapabilir, saheserYap } from "../../game";
import { careerTitleL } from "../../locale-data";
import type { SinavKartiVeri } from "../../kart3d";
import { useGame } from "../../store";
import { useI18n, applyParams } from "../../i18n";
import { hap } from "../../haptics";
import { playTap } from "../../sound";
import { GameIcon } from "../../icons";
import { Panel, ProgressBar } from "../../ui";
import { C, F, L } from "../../theme";
import { Madalyon, Etiket, Rozet, EylemDugmesi, meslekIkonu, eserIkonu, yon, hiza } from "./ortak";

type Durum = "gecti" | "simdi" | "sirada" | "uzak";
const DUGUM = 38;

function Dugum({ durum, icon, no }: { durum: Durum; icon: string; no: number }) {
  if (durum === "gecti") return <Madalyon icon="medal" size={DUGUM} dolu />;
  if (durum === "simdi") return <View style={{ width: DUGUM, height: DUGUM, alignItems: "center", justifyContent: "center" }}>
    <View pointerEvents="none" style={{ position: "absolute", width: DUGUM + 10, height: DUGUM + 10, borderRadius: (DUGUM + 10) / 2, borderWidth: 1, borderColor: C.goldBright + "66", backgroundColor: "rgba(243,210,122,0.10)" }} />
    <Madalyon icon={icon} size={DUGUM} tone={C.goldBright} />
  </View>;
  return <View style={{ width: DUGUM, height: DUGUM, borderRadius: DUGUM / 2, borderWidth: 1.5, borderStyle: durum === "sirada" ? "dashed" : "solid", borderColor: durum === "sirada" ? C.goldDim : C.border, backgroundColor: "rgba(16,11,6,0.92)", alignItems: "center", justifyContent: "center" }}>
    <Text style={{ fontFamily: F.display, fontSize: 14, color: durum === "sirada" ? C.gold : C.parchmentMuted }}>{no}</Text>
  </View>;
}

// Peştamal merdiveni: her kademe bir düğüm, aralarındaki elmas bir peştamal sınavı.
export function KariyerMerdiveni({ onSinav }: { onSinav: (v: SinavKartiVeri) => void }) {
  const { state } = useGame();
  const { t, lang } = useI18n();
  const rtl = lang === "ar";
  if (!state) return null;
  const p = state.player, pr = professionById(p.profession);
  if (!pr) return null;
  const kadin = p.gender === "kadın", xp = kariyerXp(p), kademe = careerTier(pr, xp), n = pr.tiers.length;
  const unvanlar = pr.tiers.map((_, i) => careerTitleL(p.profession, i * 30, lang, kadin)); // kadın oyuncuya kademeler de dişil
  const d = p.profession !== "işsiz" ? sinavDurumu(state) : null;
  const yan = (v: number | `${number}%`) => (rtl ? { right: v } : { left: v });
  const durumAd: Record<Durum, string> = { gecti: t("meslek.kazanildi"), simdi: t("meslek.simdi"), sirada: t("meslek.siradaki"), uzak: "" };
  return (
    <Panel title={t("ahi.title")} icon="medal" right={<Rozet text={`${kademe + 1}/${n}`} />}>
      <View style={{ paddingTop: 6 }}>
        <View pointerEvents="none" style={{ position: "absolute", top: 6 + DUGUM / 2 - 1, left: `${50 / n}%`, right: `${50 / n}%`, height: 2, backgroundColor: C.border }}>
          <View style={{ position: "absolute", top: 0, bottom: 0, ...yan(0), width: `${(kademe / Math.max(1, n - 1)) * 100}%`, backgroundColor: C.gold }} />
        </View>
        {unvanlar.slice(1).map((_, i) => (
          <View key={"e" + i} pointerEvents="none" style={{ position: "absolute", top: 6 + DUGUM / 2 - 4, ...yan(`${((i + 1) * 100) / n}%`), width: 8, height: 8, marginLeft: rtl ? 0 : -4, marginRight: rtl ? -4 : 0, transform: [{ rotate: "45deg" }], backgroundColor: i < kademe ? C.goldBright : C.surface, borderWidth: 1, borderColor: i < kademe ? C.goldBright : C.goldDim }} />
        ))}
        <View style={{ flexDirection: yon(rtl) }}>
          {unvanlar.map((u, i) => {
            const durum: Durum = i < kademe ? "gecti" : i === kademe ? "simdi" : i === kademe + 1 ? "sirada" : "uzak";
            const renk = durum === "simdi" ? C.goldBright : durum === "gecti" ? C.gold : durum === "sirada" ? C.parchmentDim : C.parchmentMuted;
            return (
              <View key={i} accessible accessibilityLabel={[u, durumAd[durum]].filter(Boolean).join(", ")} style={{ flex: 1, minWidth: 0, alignItems: "center", paddingHorizontal: 2 }}>
                <Dugum durum={durum} icon={meslekIkonu(p.profession)} no={i + 1} />
                <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={{ marginTop: 8, fontFamily: F.display, fontSize: 11.5, lineHeight: 15, letterSpacing: 0.3, textAlign: "center", color: renk }}>{u}</Text>
              </View>
            );
          })}
        </View>
      </View>
      {d && <SinavKutusu d={d} mevcut={unvanlar[kademe]} hedef={careerTitleL(p.profession, d.hedef * 30, lang, kadin)} rtl={rtl} kayit={(p.sinav_gecme || p.sinav_kalma) ? applyParams(t("ahi.record"), [p.sinav_gecme || 0, p.sinav_kalma || 0], lang) : ""}
        onSinav={(hedefUnvan) => { hap("tap"); onSinav({ prof: p.profession, hedefUnvan, yollar: d.yollar, oranlar: d.oranlar }); }} />}
      <Text style={[{ fontFamily: F.serif, fontSize: 14, lineHeight: 20, color: C.parchmentMuted, marginTop: 10 }, hiza(rtl)]}>{t("ahi.ladder")}</Text>
    </Panel>
  );
}

type SinavD = NonNullable<ReturnType<typeof sinavDurumu>>;
// Sıradaki basamak: hizmet çubuğu, durum ve sınav düğmesi.
function SinavKutusu({ d, mevcut, hedef, kayit, rtl, onSinav }: { d: SinavD; mevcut: string; hedef: string; kayit: string; rtl: boolean; onSinav: (hedefUnvan: string) => void }) {
  const { t, lang } = useI18n();
  const durum = d.zirve ? t("ahi.top") : d.hazir ? t("ahi.ready") : d.bekleAy > 0 ? applyParams(t("ahi.cool"), [d.bekleAy], lang) : applyParams(t("ahi.wait"), [d.hizmetAy], lang);
  const hizmet = Math.max(0, Math.min(30, 30 - d.hizmetAy));
  return (
    <View style={{ marginTop: 14, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: d.hazir ? C.goldBright + "AA" : C.borderHi, backgroundColor: d.hazir ? "rgba(221,180,90,0.12)" : "rgba(12,8,4,0.55)" }}>
      {!d.zirve && <Etiket rtl={rtl}>{t("meslek.sonraki")}</Etiket>}
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, marginTop: d.zirve ? 0 : 3 }}>
        {d.zirve && <GameIcon name="crown" size={20} color={C.goldBright} />}
        <Text style={[{ flex: 1, fontFamily: F.display, fontSize: 15, lineHeight: 21, color: C.gold }, hiza(rtl)]}>{mevcut}{!d.zirve ? `  ${rtl ? "←" : "→"}  ${hedef}` : ""}</Text>
      </View>
      {!d.zirve && <View style={{ marginTop: 9 }}>
        <View style={{ flexDirection: yon(rtl), justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchmentDim }}>{applyParams(t("meslek.hizmet"), [hizmet, 30], lang)}</Text>
          <GameIcon name="hourglass" size={14} color={d.hizmetAy === 0 ? C.goldBright : C.goldDim} />
        </View>
        <ProgressBar value={hizmet} max={30} color={d.hizmetAy === 0 ? C.goldBright : C.gold} h={6} />
      </View>}
      <Text accessibilityLiveRegion="polite" style={[{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 22, color: d.hazir ? C.goldBright : C.parchmentDim, marginTop: 8 }, hiza(rtl)]}>{durum}</Text>
      {!!kayit && <Text style={[{ fontFamily: F.serif, fontSize: 14, lineHeight: 20, color: C.parchmentMuted, marginTop: 3 }, hiza(rtl)]}>{kayit}</Text>}
      {d.hazir && <EylemDugmesi label={t("ahi.btn")} icon="medal" rtl={rtl} onPress={() => onSinav(hedef)} />}
    </View>
  );
}

// Mesleğe özgü fırsat: bekleme ve açlık durumunu düğmenin kendisi söyler.
export function FirsatKarti() {
  const { state, apply } = useGame();
  const { t, lang } = useI18n();
  const rtl = lang === "ar";
  if (!state || !hasProfAction(state.player)) return null;
  const p = state.player, can = canProfAction(state), cd = profActionCooldownLeft(p, state.turn);
  const etiket = cd > 0 ? t("prof.actWait").replace("%1", String(cd)) : (!can && p.hunger < 18) ? t("mek.hungry") : t("prof.act." + p.profession + ".n");
  return (
    <Panel title={t("prof.actTitle")} icon="star">
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 12 }}>
        <Madalyon icon={meslekIkonu(p.profession)} size={50} dim={!can} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[{ fontFamily: F.display, fontSize: 15, lineHeight: 21, color: can ? C.gold : C.parchmentDim }, hiza(rtl)]}>{t("prof.act." + p.profession + ".n")}</Text>
          <Text style={[{ fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: C.parchmentMuted, marginTop: 2 }, hiza(rtl)]}>{t("prof.act." + p.profession + ".d")}</Text>
        </View>
      </View>
      <EylemDugmesi label={etiket} icon={cd > 0 ? "hourglass" : meslekIkonu(p.profession)} disabled={!can} variant="primary" rtl={rtl} onPress={() => { if (!can) return; hap("success"); apply((s) => professionAction(s)); }} />
    </Panel>
  );
}

// Meslekle yazılan ömür: zirveden sonra usta → kök salmış ocak → pir; pirlikte tek bir şaheser.
export function OmurYolu() {
  const { state, apply } = useGame();
  const { t, lang } = useI18n();
  const rtl = lang === "ar";
  const [secim, setSecim] = useState<string | null>(null);
  if (!state || !professionById(state.player.profession)) return null;
  const p = state.player, yolKademe = meslekYoluKademesi(p), ilerleme = meslekYoluIlerleme(p), hedef = MESLEK_YOLU_ESIK[2];
  const yapilan = neslinSaheseri(state), secenekler = meslekSaheserleri(p.profession), bedel = saheserBedeli(state);
  const sec = secenekler.find((x) => x.id === secim), can = !!sec && saheserYapabilir(state, sec.id);
  return (
    <Panel title={t("my.title")} icon="scroll-open">
      <View style={{ flexDirection: yon(rtl), marginBottom: 8 }}><Rozet text={t("my.stage." + yolKademe)} icon={yolKademe >= 3 ? "crown" : "medal"} tone={yolKademe >= 3 ? C.goldBright : C.gold} /></View>
      <Text style={[{ fontFamily: F.display, fontSize: 15, lineHeight: 21, color: C.gold }, hiza(rtl)]}>{t("my." + p.profession + ".n")}</Text>
      <Text style={[{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 22, color: C.parchmentDim, marginTop: 4 }, hiza(rtl)]}>{t("my.intro")}</Text>
      <Text style={[{ fontFamily: F.serif, fontSize: 15, lineHeight: 22, color: C.parchment, marginTop: 8 }, hiza(rtl)]}>{t("my." + p.profession + ".d")}</Text>
      <Etiket rtl={rtl} mt={12}>{applyParams(t("my.progress"), [ilerleme, hedef], lang)}</Etiket>
      <View style={{ marginTop: 5 }}><ProgressBar value={ilerleme} max={hedef} color={yolKademe >= 3 ? C.goldBright : C.gold} h={7} /></View>
      <View style={{ flexDirection: yon(rtl), marginTop: 12 }}>
        {MESLEK_YOLU_ESIK.map((esik, i) => { const ok = yolKademe >= i + 1; return (
          <View key={esik} accessible accessibilityLabel={`${t("my.stage." + (i + 1))} ${esik}${ok ? ", " + t("meslek.kazanildi") : ""}`} style={{ flex: 1, minWidth: 0, alignItems: "center", gap: 5 }}>
            <Madalyon icon={i === 2 ? "crown" : i === 1 ? "house" : "medal"} size={34} dolu={ok} dim={!ok} />
            <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, textAlign: "center", color: ok ? C.gold : C.parchmentMuted }}>{t("my.stage." + (i + 1))}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 12, color: ok ? C.goldBright : C.goldDim }}>{esik}</Text>
          </View>
        ); })}
      </View>
      {yolKademe >= 3 && (
        <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border }}>
          <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
            <GameIcon name="trophy" size={18} color={C.goldBright} />
            <Text accessibilityRole="header" style={[{ flex: 1, fontFamily: F.display, fontSize: 15, color: C.goldBright }, hiza(rtl)]}>{t("se.title")}</Text>
          </View>
          {yapilan ? (
            <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, marginTop: 9, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(127,166,106,0.55)", backgroundColor: "rgba(127,166,106,0.10)" }}>
              <Madalyon icon={eserIkonu(yapilan.alan)} size={40} tone={C.sage} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[{ fontFamily: F.display, fontSize: 14, color: C.sage }, hiza(rtl)]}>{t("se." + yapilan.id + ".n")}</Text>
                <Text style={[{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, marginTop: 2 }, hiza(rtl)]}>{t("se.domain." + yapilan.alan)}</Text>
              </View>
            </View>
          ) : (
            <>
              <Text style={[{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 22, color: C.parchmentMuted, marginTop: 6 }, hiza(rtl)]}>{t("se.intro")}</Text>
              <Etiket rtl={rtl} mt={8}>{t("meslek.eserSec")} · {applyParams(t("se.cost"), [bedel], lang)}</Etiket>
              <View accessibilityRole="radiogroup" style={{ gap: 8, marginTop: 8 }}>
                {secenekler.map((se) => { const on = se.id === secim; return (
                  <Pressable key={se.id} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${t("se." + se.id + ".n")}. ${t("se.domain." + se.alan)}`} onPress={() => { hap("selection"); playTap(); setSecim(on ? null : se.id); }}
                    style={({ pressed }) => ({ flexDirection: yon(rtl), alignItems: "center", gap: 10, minHeight: L.touch + 10, padding: 10, borderRadius: 8, borderWidth: on ? 1.5 : 1, borderColor: on ? C.goldBright : pressed ? C.borderHi : C.border, borderBottomWidth: pressed ? 1 : 3, borderBottomColor: on ? C.goldDim : C.bg, backgroundColor: on ? "rgba(221,180,90,0.14)" : "rgba(42,31,19,0.55)", transform: [{ translateY: pressed ? 2 : 0 }] })}>
                    <Madalyon icon={eserIkonu(se.alan)} size={40} tone={on ? C.goldBright : C.gold} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[{ fontFamily: F.display, fontSize: 14, lineHeight: 19, color: on ? C.goldBright : C.gold }, hiza(rtl)]}>{t("se." + se.id + ".n")}</Text>
                      <Text style={[{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, marginTop: 2 }, hiza(rtl)]}>{t("se.domain." + se.alan)}</Text>
                    </View>
                  </Pressable>
                ); })}
              </View>
              {sec && <EylemDugmesi label={applyParams(t("meslek.eserYap"), [bedel], lang)} icon="trophy" disabled={!can} rtl={rtl} onPress={() => { if (!can) return; hap("success"); apply((s) => saheserYap(s, sec.id)); setSecim(null); }} />}
            </>
          )}
        </View>
      )}
    </Panel>
  );
}
