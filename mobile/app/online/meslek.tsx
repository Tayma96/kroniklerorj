// Çevrimiçi meslek (ana tasarım §5): mesleğin yoksa 14 meslek kartı (aile, eşsiz cazibe, kim ister, lonca rozeti,
// boş meslekte kıtlık fırsatı); varsa kademe kartı (hizmet ilerlemesi, kademe atla), beceri ağacına geçiş ve yan sanat.
// Seçim, yan sanat ve kademe sunucuya niyet olarak gider (POST /v1/meslek: sec|yan|kademe); beceriler beceri ağacı
// ekranındadır (GET /v1/beceri, app/online/beceri-agaci.tsx). Tarifler (ben.tarifler): usta iş girdiyi çıktıya çevirir.
import { useState } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { hap } from "../../lib/haptics";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi, type MeslekGirdisi } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { AltinDugme, Bant, Cerceve, Check, CizgiDugme, GLOW, GeriDugme, Madalyon, ONL, geriGit, giris, hiza, yon } from "../../lib/online/ui";
import { AltPanel, Baslik2, BosKart, Hap, OnlineSayfa, Rozet, SayfaBasi, TakatHapi, YerlesimBekle, sahneGorseli, useBirKez, useYerlesimEkrani } from "../../lib/online/yasam-ui";
import { hataAnahtari } from "../../lib/online/hata";
import {
  AGIR_KALFA_YASI, AILE_IKON, KADEME_HIZMET_VARSAYILAN, MESLEKLER, MESLEK_IKON, MESLEK_YASI, PIR_CIRAK, PUAN_TECRUBE,
  beceriPuaniYerel, type MeslekTanimi,
} from "../../lib/online/meslek-veri";
import { KADEMELER, MESLEK_IDLERI, type BeceriPuani, type Kademe, type LoncaSatiri, type MeslekId, type MeslekIlerleme, type MeslekKaydi, type OnlineHata, type TarifYaniti } from "../../lib/online/protokol";
import { TarifListesi, TarifSonucu } from "../../lib/online/tarif-ui";
import type { Lang } from "../../lib/locale-data";

type Ceviri = (k: string) => string;
type Panel = { tur: "sec"; meslek: MeslekId; mod: "ana" | "yan" } | null;

/** Kesirli hizmet (yan sanatta yarım) tek ondalıkla. */
const hzYaz = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const kademeAdi = (t: Ceviri, kd: number) => t("onl.kd." + KADEMELER[Math.max(0, Math.min(3, kd))]);
const meslekAdi = (t: Ceviri, m: MeslekId) => t("onl.mes." + m);

function LoncaRozeti({ satir, t }: { satir?: LoncaSatiri; t: Ceviri }) {
  if (!satir) return null;
  if (satir.durum === "bos") return <Rozet icon="flame" metin={t("onl.lo.bos")} renk={C.ember} dolu />;
  return <Rozet icon="family" metin={applyParams(t("onl.lo.oyuncuN"), [satir.oyuncu])} renk={satir.durum === "dolu" ? C.sage : C.gold} />;
}

function MeslekKarti({ m, satir, tur, rtl, t, lang, onSec }: { m: MeslekTanimi; satir?: LoncaSatiri; tur: string; rtl: boolean; t: Ceviri; lang: string; onSec: () => void }) {
  const bos = satir?.durum === "bos";
  const ad = meslekAdi(t, m.id);
  return <Pressable accessibilityLabel={`${ad}. ${t("onl.aile." + m.aile)}. ${t("onl.mes." + m.id + ".d")}`} onPress={() => { hap("tap"); onSec(); }}
    style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>
    <Cerceve aktif={bos} ic={{ padding: 12, gap: 8 }}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
        <Madalyon icon={MESLEK_IKON[m.id]} size={44} aktif={bos} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, textAlign: hiza(rtl) }}>{ad}</Text>
          <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
            <Rozet icon={AILE_IKON[m.aile]} metin={t("onl.aile." + m.aile)} />
            <LoncaRozeti satir={satir} t={t} />
          </View>
        </View>
      </View>
      <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.mes." + m.id + ".d")}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>
        {`${t("onl.ms.kimIster")}: ${m.musteri.map((x) => meslekAdi(t, x)).join(", ")}`}
      </Text>
      {bos ? <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, padding: 8, borderRadius: 8, backgroundColor: "rgba(72,28,18,0.5)", borderWidth: 1, borderColor: "rgba(200,90,64,0.6)" }}>
        <GameIcon name="coins" size={15} color={C.emberSoft} />
        <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchment, textAlign: hiza(rtl) }}>
          {applyParams(t("onl.ms.kitlik." + tur), [ad.toLocaleLowerCase(lang)])}
        </Text>
      </View> : null}
    </Cerceve>
  </Pressable>;
}

/** Dört kademe izi + hizmet çubuğu + kademe atla. */
function KademeKarti({ m, i, b, kademeHizmet, yas, yan, rtl, t, bekliyor, onAtla }: {
  m: MeslekTanimi; i: MeslekIlerleme; b: BeceriPuani; kademeHizmet: number[]; yas: number; yan: boolean; rtl: boolean; t: Ceviri; bekliyor: boolean; onAtla: () => void;
}) {
  const dar = useWindowDimensions().width < 360;
  const hedef = (i.kd + 1) as Kademe;
  const gerek = i.kd < 3 ? b.sonrakiKademe ?? kademeHizmet[hedef] ?? KADEME_HIZMET_VARSAYILAN[hedef] : 0;
  const puanOran = Math.max(0, Math.min(1, (PUAN_TECRUBE - b.sonrakiPuan) / PUAN_TECRUBE));
  const sartlar: { metin: string; tamam: boolean }[] = [];
  if (i.kd < 3) {
    sartlar.push({ metin: applyParams(t("onl.ms.sart.hizmet"), [hzYaz(i.hz), gerek]), tamam: i.hz >= gerek });
    if (hedef === 1 && m.agir) sartlar.push({ metin: applyParams(t("onl.ms.sart.agir"), [AGIR_KALFA_YASI]), tamam: yas >= AGIR_KALFA_YASI });
    if (hedef === 3) sartlar.push({ metin: applyParams(t("onl.ms.sart.cirak"), [i.cy, PIR_CIRAK]), tamam: i.cy >= PIR_CIRAK });
  }
  const hazir = i.kd < 3 && sartlar.every((s) => s.tamam);
  const oran = i.kd >= 3 ? 1 : gerek > 0 ? Math.min(1, i.hz / gerek) : 1;
  return <Cerceve aktif={hazir} ic={{ padding: 14, gap: 12 }}>
    <View accessible accessibilityLabel={`${t("onl.ms.kademe")}: ${kademeAdi(t, i.kd)}`} style={{ flexDirection: yon(rtl), alignItems: "flex-start" }}>
      {KADEMELER.map((k, n) => {
        const gecti = n <= i.kd;
        return <View key={k} style={{ flex: 1, alignItems: "center", gap: 5 }}>
          <View style={{ flexDirection: yon(rtl), alignItems: "center", alignSelf: "stretch" }}>
            <View style={{ flex: 1, height: 2, backgroundColor: n === 0 ? "transparent" : n <= i.kd ? C.gold : "rgba(201,162,78,0.25)" }} />
            <View style={[{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: gecti ? C.goldBright : ONL.frame, backgroundColor: gecti ? C.gold : "rgba(14,10,6,0.85)" }, n === i.kd ? GLOW : null]}>
              {n < i.kd ? <Check size={13} /> : <Text style={{ fontFamily: F.display, fontSize: 13, color: gecti ? C.inkOnGold : C.parchmentMuted }}>{n + 1}</Text>}
            </View>
            <View style={{ flex: 1, height: 2, backgroundColor: n === 3 ? "transparent" : n < i.kd ? C.gold : "rgba(201,162,78,0.25)" }} />
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontFamily: F.display, fontSize: dar ? 10.5 : 11.5, color: n === i.kd ? C.goldBright : gecti ? C.parchment : C.parchmentMuted }}>{t("onl.kd." + k)}</Text>
        </View>;
      })}
    </View>
    {/* Tecrübe → beceri puanı */}
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
        <Text style={{ flexShrink: 1, fontFamily: F.display, fontSize: 12.5, letterSpacing: rtl ? 0 : 1, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.ms.puanBaslik")}</Text>
        <View style={{ flex: 1 }} />
        <Rozet icon="star" metin={applyParams(t("onl.ms.puanKalan"), [b.kalan])} renk={b.kalan > 0 ? C.goldBright : C.parchmentMuted} dolu={b.kalan > 0} />
      </View>
      <View accessible accessibilityLabel={`${applyParams(t("onl.ms.puanKalan"), [b.kalan])}. ${applyParams(t("onl.ms.sonrakiPuan"), [hzYaz(b.sonrakiPuan)])}`}
        style={{ height: 8, borderRadius: 4, backgroundColor: "rgba(201,162,78,0.15)", overflow: "hidden", flexDirection: yon(rtl) }}>
        <View style={{ width: `${Math.max(puanOran * 100, puanOran > 0 ? 3 : 0)}%`, backgroundColor: C.sage, borderRadius: 4 }} />
      </View>
      <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", justifyContent: "space-between", columnGap: 10, rowGap: 2 }}>
        <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.ms.sonrakiPuan"), [hzYaz(b.sonrakiPuan)])}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{applyParams(t("onl.ms.puanOzet"), [b.kazanilan, b.harcanan])}</Text>
      </View>
    </View>
    {/* Kademe ilerlemesi: toplam tecrübe / sonraki kademe */}
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: yon(rtl), justifyContent: "space-between", gap: 8 }}>
        <Text style={{ flexShrink: 1, fontFamily: F.display, fontSize: 12.5, letterSpacing: rtl ? 0 : 1, color: C.goldBright }}>{t("onl.ms.hizmet")}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 14.5, color: C.parchmentDim }}>{i.kd >= 3 ? hzYaz(i.hz) : `${hzYaz(i.hz)} / ${gerek}`}</Text>
      </View>
      <View accessible accessibilityLabel={`${t("onl.ms.hizmet")}: ${hzYaz(i.hz)}${i.kd < 3 ? " / " + gerek : ""}`} style={{ height: 8, borderRadius: 4, backgroundColor: "rgba(201,162,78,0.15)", overflow: "hidden", flexDirection: yon(rtl) }}>
        <View style={{ width: `${Math.max(oran * 100, oran > 0 ? 3 : 0)}%`, backgroundColor: hazir ? C.goldBright : C.gold, borderRadius: 4 }} />
      </View>
      <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t(yan ? "onl.ms.hizmetNotYan" : "onl.ms.hizmetNot")}</Text>
    </View>
    {i.kd < 3 ? <>
      <View style={{ gap: 5 }}>
        <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 1, color: C.gold, textAlign: hiza(rtl) }}>{applyParams(t("onl.ms.sonraki"), [kademeAdi(t, hedef)])}</Text>
        {sartlar.map((s) => <View key={s.metin} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
          <View style={{ width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: s.tamam ? C.sage : ONL.frame, backgroundColor: s.tamam ? C.sage : "transparent" }}>
            {s.tamam ? <Check size={10} /> : null}
          </View>
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: s.tamam ? C.parchment : C.parchmentDim, textAlign: hiza(rtl) }}>{s.metin}</Text>
        </View>)}
        {hedef === 3 ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.ms.pirNot")}</Text> : null}
      </View>
      <AltinDugme etiket={applyParams(t("onl.ms.atla"), [kademeAdi(t, hedef)])} icon="star" rtl={rtl} kapali={!hazir} bekliyor={bekliyor} onPress={onAtla} />
    </> : <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.ms.enUst")}</Text>}
  </Cerceve>;
}

function MeslekEkran() {
  const router = useRouter();
  const { t, rtl, lang } = useI18n();
  const o = useYerlesimEkrani();
  const y = o.yerlesim;
  const [panel, setPanel] = useState<Panel>(null);
  const [secimModu, setSecimModu] = useState<"ana" | "yan" | null>(null);
  const [gorunen, setGorunen] = useState<"a" | "y">("a");
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [tarifSonuc, setTarifSonuc] = useState<TarifYaniti | null>(null);
  const [tarifHata, setTarifHata] = useState<{ id: string; metin: string } | null>(null);
  useBirKez(() => { void o.loncaYukle(true); }, !!y);
  if (!y) return <YerlesimBekle rtl={rtl} t={t} onGiris={() => router.replace("/online")} />;

  const ben = y.ben;
  const md = o.meslekDurumu;
  const kayit: MeslekKaydi = md?.kayit ?? { a: "", y: "", s: {} };
  const kademeHizmet = md?.kademeHizmet?.length ? md.kademeHizmet : [...KADEME_HIZMET_VARSAYILAN];
  const genc = ben.yas < MESLEK_YASI;
  const loncaSatiri = (m: MeslekId) => o.lonca?.find((x) => x.meslek === m);
  const mod = secimModu ?? (kayit.a ? null : "ana");
  const aktifId = (gorunen === "y" && kayit.y ? kayit.y : kayit.a) || null;
  const aktif = aktifId ? MESLEKLER[aktifId] : null;
  const ilerleme = aktifId ? kayit.s[aktifId] : undefined;
  // Tecrübe ve beceri puanı sunucudan (ben.beceri); eski sunucuda kayıttan gösterim kopyası.
  const beceriAl = (id: MeslekId | null): BeceriPuani | undefined => {
    if (!id || !kayit.s[id]) return undefined;
    return md?.beceri?.[id] ?? beceriPuaniYerel(kayit.s[id]!, kademeHizmet);
  };
  const beceri = beceriAl(aktifId);
  const bekliyor = o.islem === "meslek";
  const ev = o.envanter ?? ben.envanter ?? {};
  const tarifler = aktifId && o.tarifler ? o.tarifler.filter((x) => x.meslek === aktifId) : null;
  const tarifYap = async (id: string) => {
    setTarifHata(null);
    const s = await o.tarifYap(id);
    if (s.ok) { hap("success"); setTarifSonuc(s.deger); } else { hap("error"); setTarifHata({ id, metin: tarifHatasi(s.hata, t) }); }
  };
  const geri = () => geriGit(router, "/online/yasam");

  const gonder = async (g: MeslekGirdisi, basari?: string) => {
    setHata(null);
    setBilgi(null);
    const s = await o.meslekIslem(g);
    if (s.ok) { hap("success"); setPanel(null); if (basari) setBilgi(basari); return true; }
    hap("error");
    setHata(t(hataAnahtari(s.hata)));
    return false;
  };

  // --- paneller
  const secilenPanel = panel?.tur === "sec" ? panel : null;


  const paneller = <>
    <AltPanel acik={!!secilenPanel} onKapat={() => { setPanel(null); setHata(null); }} etiket={t("onl.ms.secPanel")} rtl={rtl} t={t}>
      {secilenPanel ? (() => {
        const m = MESLEKLER[secilenPanel.meslek];
        const eski = secilenPanel.mod === "ana" && kayit.a && kayit.a !== m.id;
        const donus = (kayit.s[m.id]?.kd ?? 0) > 0 || (kayit.s[m.id]?.dg.length ?? 0) > 0;
        return <>
          <View style={{ alignItems: "center", gap: 8, paddingTop: 6 }}>
            <Madalyon icon={MESLEK_IKON[m.id]} size={64} aktif />
            <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 21, color: C.parchment, textAlign: "center" }}>{meslekAdi(t, m.id)}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6 }}>
              <Rozet icon={AILE_IKON[m.aile]} metin={t("onl.aile." + m.aile)} />
              <LoncaRozeti satir={loncaSatiri(m.id)} t={t} />
            </View>
            <Text style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 22, color: C.parchmentDim, textAlign: "center" }}>{t("onl.mes." + m.id + ".d")}</Text>
          </View>
          <Cerceve ic={{ padding: 12, gap: 6 }}>
            <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 1, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.ms.dallar")}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: C.parchment, textAlign: hiza(rtl) }}>{m.dallar.map((d) => t(`onl.mes.${m.id}.${d}`)).join(" · ")}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{`${t("onl.ms.kimIster")}: ${m.musteri.map((x) => meslekAdi(t, x)).join(", ")}`}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{`${t("onl.ms.tedarik")}: ${m.tedarik.map((x) => meslekAdi(t, x)).join(", ")}`}</Text>
            {m.agir ? <Text style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.emberSoft, textAlign: hiza(rtl) }}>{applyParams(t("onl.ms.agirNot"), [AGIR_KALFA_YASI])}</Text> : null}
          </Cerceve>
          {secilenPanel.mod === "yan" ? <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: "center" }}>{t("onl.ms.yanNot")}</Text> : null}
          {eski ? <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 20, color: C.emberSoft, textAlign: "center" }}>{applyParams(t("onl.ms.degistirNot"), [meslekAdi(t, kayit.a as MeslekId)])}</Text> : null}
          {donus ? <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 20, color: C.sage, textAlign: "center" }}>{applyParams(t("onl.ms.donusNot"), [kademeAdi(t, kayit.s[m.id]?.kd ?? 0)])}</Text> : null}
          {genc ? <Bant tur="bilgi" metin={applyParams(t("onl.ms.gencKilit"), [MESLEK_YASI, ben.yas])} rtl={rtl} /> : null}
          {hata ? <Bant metin={hata} rtl={rtl} /> : null}
          <AltinDugme etiket={t(secilenPanel.mod === "yan" ? "onl.ms.yanYap" : "onl.ms.sec")} icon={MESLEK_IKON[m.id]} rtl={rtl} kapali={genc} bekliyor={bekliyor}
            onPress={() => { void gonder({ islem: secilenPanel.mod === "yan" ? "yan" : "sec", meslek: m.id }).then((ok) => { if (ok) { setSecimModu(null); setGorunen(secilenPanel.mod === "yan" ? "y" : "a"); } }); }} />
        </>;
      })() : null}
    </AltPanel>
    <AltPanel acik={!!tarifSonuc} onKapat={() => setTarifSonuc(null)} etiket={t("onl.tf.sonuc")} rtl={rtl} t={t}>
      {tarifSonuc ? <TarifSonucu y={tarifSonuc} rtl={rtl} t={t} lang={lang as Lang} onTamam={() => setTarifSonuc(null)} /> : null}
    </AltPanel>
  </>;

  const ust = <>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 6 }}>
      <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={geri} />
      <View style={{ flex: 1 }} />
      <Hap icon="coins" metin={String(ben.para)} erisim={applyParams(t("onl.ya.paraErisim"), [ben.para])} />
      <TakatHapi kalan={ben.takat.kalan} tavan={ben.takat.tavan} t={t} />
    </View>
    <View style={{ marginTop: 8 }}>
      <SayfaBasi ust={t("onl.ms.ust")} rtl={rtl}
        baslik={mod ? t(mod === "yan" ? "onl.ms.yanSecBaslik" : kayit.a ? "onl.ms.degistirBaslik" : "onl.ms.secBaslik") : aktif ? meslekAdi(t, aktif.id) : t("onl.ms.secBaslik")}
        alt={mod ? t("onl.ms.secAlt") : ilerleme ? `${kademeAdi(t, ilerleme.kd)} · ${t(gorunen === "y" ? "onl.ms.yanSanat" : "onl.ms.anaSanat")}` : undefined}
        sol={aktif && !mod ? <Madalyon icon={MESLEK_IKON[aktif.id]} size={56} aktif /> : undefined} />
    </View>
    {genc ? <View style={{ marginTop: 12 }}><Bant tur="bilgi" metin={applyParams(t("onl.ms.gencKilit"), [MESLEK_YASI, ben.yas])} rtl={rtl} /></View> : null}
    {bilgi ? <View style={{ marginTop: 12 }}><Bant tur="bilgi" metin={bilgi} rtl={rtl} /></View> : null}
  </>;

  const altBag = <View style={{ marginTop: 22, gap: 8 }}>
    <CizgiDugme etiket={t("onl.is.baslik")} icon="saw" rtl={rtl} kucuk onPress={() => router.push("/online/isler")} />
    <CizgiDugme etiket={t("onl.lo.baslik")} icon="banner" rtl={rtl} kucuk onPress={() => router.push("/online/lonca")} />
    <CizgiDugme etiket={t("onl.ba.git")} icon="anvil" rtl={rtl} kucuk onPress={() => router.push(aktif ? { pathname: "/online/beceri-agaci", params: { meslek: aktif.id } } : "/online/beceri-agaci")} />
  </View>;

  // --- seçim listesi (mesleğim yok, değiştiriyorum ya da yan sanat seçiyorum)
  if (mod) {
    const liste = MESLEK_IDLERI.filter((m) => (mod === "yan" ? m !== kayit.a : true));
    return <OnlineSayfa gorsel={sahneGorseli(y.yerlesim.tur, y.saat.mevsim)} oran={0.3} rtl={rtl} t={t} alt={paneller}>
      {ust}
      {md === null && o.oturum?.tur === "sunucu" ? <View style={{ marginTop: 12 }}><Bant tur="bilgi" metin={t("onl.ms.bilinmiyor")} rtl={rtl} /></View> : null}
      {secimModu ? <View style={{ marginTop: 12 }}><CizgiDugme etiket={t("onl.ms.vazgec")} rtl={rtl} kucuk onPress={() => setSecimModu(null)} /></View> : null}
      <Baslik2 metin={t("onl.ms.meslekler")} rtl={rtl} sag={<Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>{liste.length}</Text>} />
      <View style={{ gap: 10 }}>
        {liste.map((m, n) => <Animated.View key={m} entering={giris(Math.min(n, 6) * 40)}>
          <MeslekKarti m={MESLEKLER[m]} satir={loncaSatiri(m)} tur={y.yerlesim.tur} rtl={rtl} t={t} lang={lang} onSec={() => { setHata(null); setPanel({ tur: "sec", meslek: m, mod }); }} />
        </Animated.View>)}
      </View>
      {altBag}
    </OnlineSayfa>;
  }

  // --- beceri ağacı
  return <OnlineSayfa gorsel={sahneGorseli(y.yerlesim.tur, y.saat.mevsim)} oran={0.3} rtl={rtl} t={t} alt={paneller}>
    {ust}
    {kayit.y ? <View accessibilityRole="tablist" style={{ marginTop: 14, flexDirection: yon(rtl), gap: 8 }}>
      {(["a", "y"] as const).map((g) => {
        const id = g === "a" ? kayit.a : kayit.y;
        if (!id) return null;
        const secili = gorunen === g;
        return <Pressable key={g} accessibilityRole="tab" accessibilityState={{ selected: secili }} accessibilityLabel={`${t(g === "a" ? "onl.ms.anaSanat" : "onl.ms.yanSanat")}: ${meslekAdi(t, id)}`}
          onPress={() => { hap("tap"); setGorunen(g); }}
          style={{ flex: 1, minHeight: 48, borderRadius: 8, borderWidth: 1.5, borderColor: secili ? C.goldBright : ONL.frame, backgroundColor: secili ? "rgba(90,64,24,0.8)" : "rgba(14,10,6,0.7)", flexDirection: yon(rtl), alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 8 }}>
          <GameIcon name={MESLEK_IKON[id]} size={16} color={secili ? C.goldBright : C.gold} />
          <View style={{ flexShrink: 1 }}>
            <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 9.5, letterSpacing: 0.6, color: C.gold }}>{t(g === "a" ? "onl.ms.anaSanat" : "onl.ms.yanSanat")}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{meslekAdi(t, id)}</Text>
          </View>
        </Pressable>;
      })}
    </View> : null}
    {aktif && ilerleme ? <>
      <Animated.View entering={giris(40)} style={{ marginTop: 14 }}>
        <KademeKarti m={aktif} i={ilerleme} b={beceri ?? beceriPuaniYerel(ilerleme, kademeHizmet)} kademeHizmet={kademeHizmet} yas={ben.yas} yan={gorunen === "y"} rtl={rtl} t={t} bekliyor={bekliyor}
          onAtla={() => { void gonder({ islem: "kademe", meslek: aktif.id }, applyParams(t("onl.ms.kademeOldu"), [kademeAdi(t, ilerleme.kd + 1)])); }} />
      </Animated.View>
      {hata && !panel ? <View style={{ marginTop: 10 }}><Bant metin={hata} rtl={rtl} /></View> : null}
      <Baslik2 metin={t("onl.ms.agac")} rtl={rtl} />
      <Cerceve ic={{ padding: 12, gap: 10 }}>
        <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.ba.agacGecis")}</Text>
        <AltinDugme etiket={t("onl.ba.agaciGor")} icon="scroll-open" rtl={rtl} onPress={() => router.push({ pathname: "/online/beceri-agaci", params: { meslek: aktif.id } })} />
      </Cerceve>

      {/* Tarifler (usta iş) */}
      <Baslik2 metin={t("onl.tf.baslik")} rtl={rtl} sag={tarifler?.length ? <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>{`${tarifler.filter((x) => x.acik).length}/${tarifler.length}`}</Text> : undefined} />
      <Text style={{ marginBottom: 10, fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.tf.alt")}</Text>
      {tarifler === null ? <BosKart icon="scroll-open" metin={t("onl.tf.bilinmiyor")} rtl={rtl} />
        : tarifler.length ? <TarifListesi tarifler={tarifler} ev={ev} rtl={rtl} t={t} bekliyor={o.islem === "tarif"} hata={tarifHata} onYap={(id) => { void tarifYap(id); }} />
        : <BosKart icon="scroll-open" metin={t("onl.tf.yok")} rtl={rtl} />}
    </> : <View style={{ marginTop: 14 }}><Bant tur="bilgi" metin={t("onl.ms.bilinmiyor")} rtl={rtl} /></View>}

    <Baslik2 metin={t("onl.ms.sanatlar")} rtl={rtl} />
    <Cerceve ic={{ padding: 12, gap: 10 }}>
      <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>
        {kayit.y ? applyParams(t("onl.ms.yanVar"), [meslekAdi(t, kayit.y)]) : t("onl.ms.yanYok")}
      </Text>
      <View style={{ gap: 8 }}>
        <CizgiDugme etiket={t(kayit.y ? "onl.ms.yanDegistir" : "onl.ms.yanSec")} icon="compass" rtl={rtl} kucuk kapali={genc} onPress={() => { setBilgi(null); setSecimModu("yan"); }} />
        <CizgiDugme etiket={t("onl.ms.degistir")} icon="scales" rtl={rtl} kucuk kapali={genc} onPress={() => { setBilgi(null); setSecimModu("ana"); }} />
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.ms.ustalikSilinmez")}</Text>
    </Cerceve>
    {altBag}
  </OnlineSayfa>;
}

/** Tarif hatası: takat ve girdi anlaşılır cümleyle; gerisi genel hata metniyle. */
function tarifHatasi(h: OnlineHata, t: Ceviri): string {
  if (h === "takat_yok") return t("onl.is.h.takat");
  return t(hataAnahtari(h));
}

export default function OnlineMeslek() {
  return onlineEkranAcik() ? <OnlineKapisi><MeslekEkran /></OnlineKapisi> : <OnlineYakinda />;
}
