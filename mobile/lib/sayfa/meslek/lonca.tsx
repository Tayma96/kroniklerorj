// Lonca sekmesi: çarşıdaki rakip usta (bayrak yarışı) ve yetiştirilen çırak.
import type { ReactNode } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { kariyerXp, professionById, rakipAktif, rakipPuan, rakipYollari, rakipMeydan, rakipMeydanHazir, rakipMeydanKalan, rakipOrtaklik, rakipOrtaklikHazir, RAKIP_HEDEF, RAKIP_MEYDAN_BEDEL, cirakAlabilir, cirakAdaylari, cirakAl, cirakDers, cirakDersHazir, cirakDersKalan, cirakBekleAy, CIRAK_BEDEL, CIRAK_KOST, kademeOf, kisiOf, worldYears, type GameState } from "../../game";
import { kisiNpc } from "../../nufus";
import { localFirstName } from "../../world";
import { careerTitleL } from "../../locale-data";
import { rakipAdi, rakipKartVerisi } from "../../rakip-ui";
import type { SinavKartiVeri } from "../../kart3d";
import { useGame } from "../../store";
import { useI18n, applyParams } from "../../i18n";
import { hap } from "../../haptics";
import { playTap } from "../../sound";
import { GameIcon } from "../../icons";
import { Panel, Portre, ProgressBar } from "../../ui";
import { C, F, L } from "../../theme";
import { Madalyon, Etiket, EylemDugmesi, yon, hiza } from "./ortak";

const HUY_IKON: Record<string, string> = { hevesli: "flame", yetenekli: "star", sadik: "shield" };

// Nüfusta yaşayan kişinin yaşı (portre için); kayıt yoksa yedek yaş.
function kisiYasi(s: GameState, id: string | undefined, yedek: number, lang: Parameters<typeof kisiNpc>[2]): { yas: number; var: boolean } {
  const k = id ? kisiOf(s, id) : undefined;
  return k ? { yas: kisiNpc(k, worldYears(s), lang).age, var: true } : { yas: yedek, var: false };
}

function Bilgi({ children, rtl, tone = C.parchmentMuted, italic = false, mt = 8 }: { children: ReactNode; rtl: boolean; tone?: string; italic?: boolean; mt?: number }) {
  return <Text style={[{ fontFamily: italic ? F.serifItalic : F.serif, fontSize: 15, lineHeight: 22, color: tone, marginTop: mt }, hiza(rtl)]}>{children}</Text>;
}

// Kilitli bölüm: soluk madalyon ve ne zaman açılacağı.
function Kilitli({ icon, metin, rtl, children }: { icon: string; metin: string; rtl: boolean; children?: ReactNode }) {
  return <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 12 }}>
    <Madalyon icon={icon} size={46} dim />
    <View style={{ flex: 1, minWidth: 0 }}><Bilgi rtl={rtl} italic tone={C.parchmentDim} mt={0}>{metin}</Bilgi>{children}</View>
  </View>;
}

// Bir tarafın portresi, adı ve bayrakları; rakip tarafı dokununca kişi kartını açar.
function Taraf({ ad, alt, yas, cins, seed, tone, bayrak, bayrakTon, onPress, ipucu, rtl }: { ad: string; alt: string; yas: number; cins: "erkek" | "kadın"; seed?: string; tone: string; bayrak: number; bayrakTon: string; onPress?: () => void; ipucu?: string; rtl: boolean }) {
  const ic = <>
    <View style={{ padding: 2, borderRadius: 32, borderWidth: 1.5, borderColor: tone }}><Portre age={yas} gender={cins} size={56} ring={false} seed={seed} /></View>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: 14, lineHeight: 19, color: tone, marginTop: 6, textAlign: "center" }}>{ad}</Text>
    <Text numberOfLines={2} style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 17, color: C.parchmentMuted, textAlign: "center" }}>{alt}</Text>
    <View accessible={false} style={{ flexDirection: yon(rtl), gap: 3, marginTop: 5 }}>
      {Array.from({ length: RAKIP_HEDEF }, (_, i) => <GameIcon key={i} name="banner" size={15} color={i < bayrak ? bayrakTon : C.border} />)}
    </View>
  </>;
  const stil = { flex: 1, minWidth: 0, alignItems: "center" as const, paddingVertical: 4, borderRadius: 8 };
  return onPress
    ? <Pressable accessibilityRole="button" accessibilityLabel={`${ad}, ${alt}`} accessibilityHint={ipucu} onPress={onPress} style={({ pressed }) => [stil, { minHeight: L.touch, backgroundColor: pressed ? C.cardHi : "transparent" }]}>{ic}</Pressable>
    : <View accessible accessibilityLabel={`${ad}, ${alt}`} style={stil}>{ic}</View>;
}

export function RakipPaneli({ onYaris }: { onYaris: (v: SinavKartiVeri | null) => void }) {
  const { state, apply } = useGame();
  const { t, lang } = useI18n();
  const router = useRouter();
  const rtl = lang === "ar";
  if (!state || state.player.profession === "işsiz") return null;
  const p = state.player;
  const r = p.rakip && p.rakip.prof === p.profession ? p.rakip : undefined;
  if (!r) return <Panel title={t("rk.title")} icon="banner"><Kilitli icon="banner" metin={t("rk.hint")} rtl={rtl} /></Panel>;
  const aktif = rakipAktif(p), ad = rakipAdi(p, lang);
  const ben = rakipPuan(p, rakipYollari(p)[0]), o = Math.round(r.huner), olcek = Math.max(100, ben, o); // çubuklar ortak ölçekte
  const kalan = r.yaris != null ? Math.max(1, 3 - (state.turn - r.yaris)) : 0;
  const meydanOk = rakipMeydanHazir(state), meydanKalan = rakipMeydanKalan(state);
  const rk = kisiYasi(state, r.id, p.age, lang), pr = professionById(p.profession);
  const benUnvan = pr ? careerTitleL(p.profession, kariyerXp(p), lang, p.gender === "kadın") : "";
  const bar = (etiket: string, v: number, renk: string) => (
    <View style={{ marginTop: 7 }}>
      <View style={{ flexDirection: yon(rtl), justifyContent: "space-between" }}>
        <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchment }}>{etiket}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: renk }}>{v}</Text>
      </View>
      <View style={{ marginTop: 3, transform: [{ scaleX: rtl ? -1 : 1 }] }}><ProgressBar value={v} max={olcek} color={renk} h={6} /></View>
    </View>
  );
  const sayi = (v: number, tone: string) => <Text style={{ fontFamily: F.display, fontSize: 24, lineHeight: 30, color: tone }}>{v}</Text>;
  return (
    <Panel title={t("rk.title")} icon="banner">
      <View style={{ flexDirection: yon(rtl), alignItems: "flex-start", gap: 6 }}>
        <Taraf ad={t("rk.you")} alt={benUnvan} yas={p.age} cins={p.gender} tone={C.gold} bayrak={r.galip} bayrakTon={C.goldBright} rtl={rtl} />
        <View accessible accessibilityLabel={applyParams(t("rk.flags"), [r.galip, r.maglup, RAKIP_HEDEF], lang)} style={{ width: 62, alignItems: "center", paddingTop: 14 }}>
          <GameIcon name="crossed-swords" size={20} color={C.goldDim} />
          <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 5, marginTop: 4 }}>
            {sayi(r.galip, C.goldBright)}<Text style={{ fontFamily: F.display, fontSize: 18, color: C.goldDim }}>:</Text>{sayi(r.maglup, C.blood)}
          </View>
        </View>
        <Taraf ad={ad} alt={applyParams(t("rk.huy"), [r.bilinen ? t("rk.m." + r.mizac) : t("rk.m.unknown")], lang)} yas={rk.yas} cins={r.g} seed={r.id} tone={C.blood} bayrak={r.maglup} bayrakTon={C.blood} rtl={rtl}
          ipucu={rk.var ? t("meslek.profil") : undefined} onPress={rk.var && r.id ? () => { hap("tap"); playTap(); router.push(`/oyun/npc/${r.id}`); } : undefined} />
      </View>
      <Etiket rtl={rtl} mt={12}>{t("rk.skill")}</Etiket>
      {bar(t("rk.you"), ben, ben >= o ? C.sage : C.ember)}
      {bar(ad, o, C.blood)}
      <Bilgi rtl={rtl} tone={C.parchment} mt={10}>{applyParams(t("rk.flags"), [r.galip, r.maglup, RAKIP_HEDEF], lang)}</Bilgi>
      {r.bitti ? (
        <Bilgi rtl={rtl} italic tone={r.bitti === "yenik" ? C.ember : C.goldBright} mt={6}>{t("rk.end." + r.bitti)}</Bilgi>
      ) : aktif && r.yaris != null ? (
        <View style={{ marginTop: 10, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: C.goldBright + "AA", backgroundColor: "rgba(221,180,90,0.12)" }}>
          <Bilgi rtl={rtl} italic tone={C.goldBright} mt={0}>{applyParams(t("rk.pending"), [kalan], lang)}</Bilgi>
          <EylemDugmesi label={t("rk.btnRace")} icon="banner" rtl={rtl} mt={10} onPress={() => { hap("tap"); onYaris(rakipKartVerisi(state, t, lang)); }} />
        </View>
      ) : aktif ? (
        <>
          <Bilgi rtl={rtl} tone={C.parchmentDim} mt={6}>{applyParams(t("rk.next"), [Math.max(1, r.next - state.turn)], lang)}</Bilgi>
          <EylemDugmesi label={applyParams(t("rk.btnChallenge"), [RAKIP_MEYDAN_BEDEL], lang)} icon="crossed-swords" variant="secondary" disabled={!meydanOk} rtl={rtl}
            onPress={() => { hap("tap"); const ns = rakipMeydan(state); apply(() => ns); onYaris(rakipKartVerisi(ns, t, lang)); }} />
          {meydanKalan > 0 && <Text style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 20, color: C.parchmentMuted, marginTop: 5, textAlign: "center" }}>{applyParams(t("rk.wait"), [meydanKalan], lang)}</Text>}
          {rakipOrtaklikHazir(p) ? <EylemDugmesi label={t("rk.btnPartner")} icon="scales" variant="secondary" rtl={rtl} mt={8} onPress={() => { hap("success"); apply((s) => rakipOrtaklik(s)); }} />
            : r.bilinen && r.mizac === "durust" ? <Bilgi rtl={rtl} italic>{t("rk.partnerHint")}</Bilgi> : null}
        </>
      ) : null}
    </Panel>
  );
}

// Çırak: ustalık yetiştirmektir — ders ver, kostunu öde, peştamalını kuşat.
export function CirakPaneli() {
  const { state, apply } = useGame();
  const { t, lang } = useI18n();
  const router = useRouter();
  const rtl = lang === "ar";
  if (!state || state.player.profession === "işsiz") return null;
  const p = state.player;
  const c = p.cirak && p.cirak.prof === p.profession ? p.cirak : undefined;
  const sayac = (p.cirak_yetisen || p.cirak_kacan) ? <Bilgi rtl={rtl}>{applyParams(t("ck.raised"), [p.cirak_yetisen || 0, p.cirak_kacan || 0], lang)}</Bilgi> : null;
  const kost = <Bilgi rtl={rtl}>{applyParams(t("ck.cost"), [CIRAK_KOST], lang)}</Bilgi>;
  if (!c && kademeOf(p) < 2) return <Panel title={t("ck.title")} icon="graduate-cap"><Kilitli icon="graduate-cap" metin={t("ck.hint")} rtl={rtl}>{sayac}</Kilitli></Panel>;
  if (!c) {
    const adaylar = cirakAdaylari(state), alabilir = cirakAlabilir(p, state.turn) && p.money >= CIRAK_BEDEL, bekle = cirakBekleAy(state);
    const al = applyParams(t("ck.btnTake"), [CIRAK_BEDEL], lang);
    return (
      <Panel title={t("ck.title")} icon="graduate-cap">
        <Etiket rtl={rtl}>{t("ck.pick")}</Etiket>
        {bekle > 0 && <Bilgi rtl={rtl} italic tone={C.ember} mt={5}>{applyParams(t("ck.wait"), [bekle], lang)}</Bilgi>}
        {adaylar.map((a, i) => (
          <View key={i} style={{ marginTop: 10, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: C.borderHi, backgroundColor: "rgba(42,31,19,0.55)" }}>
            <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
              <Madalyon icon={HUY_IKON[a.huy] || "star"} size={42} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: yon(rtl), alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 15, color: C.parchment }}>{localFirstName(a.seed, a.g, lang)}</Text>
                  <Text style={{ fontFamily: F.display, fontSize: 12.5, letterSpacing: 0.5, color: C.gold }}>{t("ck.h." + a.huy)}</Text>
                </View>
                <Bilgi rtl={rtl} italic tone={C.parchmentDim} mt={2}>{t("ck.hd." + a.huy)}</Bilgi>
              </View>
            </View>
            <EylemDugmesi label={al} icon="family" variant="secondary" disabled={!alabilir} rtl={rtl} mt={9} onPress={() => { hap("success"); apply((st) => cirakAl(st, i)); }} />
          </View>
        ))}
        {kost}{sayac}
      </Panel>
    );
  }
  const hazir = cirakDersHazir(state), dersKalan = cirakDersKalan(state);
  const ck = kisiYasi(state, c.id, 12, lang), ad = localFirstName(c.seed, c.g, lang);
  const ders = hazir ? t("ck.btnLesson") : dersKalan > 0 ? applyParams(t("ck.lessonWait"), [dersKalan], lang) : t("ck.lessonDone");
  const portre = <View style={{ padding: 2, borderRadius: 32, borderWidth: 1.5, borderColor: C.gold }}><Portre age={ck.yas} gender={c.g} size={56} ring={false} seed={c.id} /></View>;
  return (
    <Panel title={t("ck.title")} icon="graduate-cap">
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 12 }}>
        {ck.var && c.id ? <Pressable accessibilityRole="button" accessibilityLabel={ad} accessibilityHint={t("meslek.profil")} hitSlop={6} onPress={() => { hap("tap"); playTap(); router.push(`/oyun/npc/${c.id}`); }} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>{portre}</Pressable> : portre}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: yon(rtl), alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 16, color: C.gold }}>{ad}</Text>
            <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 4 }}>
              <GameIcon name={HUY_IKON[c.huy] || "star"} size={13} color={C.parchmentDim} />
              <Text style={{ fontFamily: F.display, fontSize: 12.5, color: C.parchmentDim }}>{t("ck.h." + c.huy)}</Text>
            </View>
          </View>
          <Bilgi rtl={rtl} italic tone={C.parchmentMuted} mt={2}>{t("ck.hd." + c.huy)}</Bilgi>
        </View>
      </View>
      <Etiket rtl={rtl} mt={12}>{applyParams(t("ck.progress"), [Math.floor(c.ilerleme)], lang)}</Etiket>
      <View style={{ marginTop: 4, transform: [{ scaleX: rtl ? -1 : 1 }] }}><ProgressBar value={Math.min(100, c.ilerleme)} max={100} color={C.gold} h={7} /></View>
      {c.ihmal >= 2 && <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, marginTop: 9, padding: 9, borderRadius: 8, borderWidth: 1, borderColor: C.ember + "66", backgroundColor: C.ember + "14" }}>
        <GameIcon name="hourglass" size={16} color={C.ember} />
        <Text style={[{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, lineHeight: 21, color: C.ember }, hiza(rtl)]}>{t("ck.neglect")}</Text>
      </View>}
      <EylemDugmesi label={ders} icon="graduate-cap" variant={hazir ? "primary" : "secondary"} disabled={!hazir} rtl={rtl} onPress={() => { hap("tap"); apply((st) => cirakDers(st)); }} />
      {kost}{sayac}
    </Panel>
  );
}
