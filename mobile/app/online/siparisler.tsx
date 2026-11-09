// Lonca siparişleri (ana tasarım §5.5, GET /v1/siparisler, POST /v1/siparis/teslim): kıt meslek için NPC ilanı
// ("Kasabaya 3 nal lazım"), ödül, kalan ay, isteyen kişi, elde/teslim edebilir. Teslim tek seferliktir: ilk getiren
// alır; teşekkür izi herkese görünür, isteyenin ve tanıdıkların görüşü artar. Kapanan ilanlar soluk kalır.
// Sonucu (ödül, tecrübe, gönül, görüş) sunucu belirler; istemci yalnız niyet gönderir.
import { useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { hap } from "../../lib/haptics";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { AltinDugme, Bant, Cerceve, CizgiDugme, GLOW, GeriDugme, Madalyon, geriGit, giris, hiza, yon } from "../../lib/online/ui";
import { kisiYolu } from "../../lib/online/toplum-veri";
import { AltPanel, Baslik2, BosKart, Degisim, Hap, OnlineSayfa, Rozet, SayfaBasi, YerlesimBekle, Yukleniyor, sahneGorseli, useBirKez, useYerlesimEkrani } from "../../lib/online/yasam-ui";
import { hataAnahtari } from "../../lib/online/hata";
import { isaretli, ozetYaz } from "../../lib/online/metin";
import { HAL_IKON, MAL_IKON } from "../../lib/online/meslek-veri";
import type { OnlineHata, SiparisSatiri, SiparisTeslimYaniti } from "../../lib/online/protokol";

type Ceviri = (k: string) => string;
/** Teslim sonrası görüşü artanlardan adıyla gösterilecek en çok kişi. */
const GORUS_EN_COK = 4;

function teslimHatasi(h: OnlineHata, t: Ceviri): string {
  if (h === "mal_yok") return t("onl.sp.h.mal");
  return t(hataAnahtari(h));
}

function SiparisKarti({ s, benId, rtl, t, bekliyor, hata, onTeslim, onKisi }: {
  s: SiparisSatiri; benId: string; rtl: boolean; t: Ceviri; bekliyor: boolean; hata: string | null; onTeslim: () => void; onKisi: (id: string) => void;
}) {
  const acik = s.durum === "acik" && s.kalanAy > 0;
  const mal = t("onl.mal." + s.mal);
  const ilan = applyParams(t("onl.sp.ilan"), [s.adet, mal]);
  const oran = Math.min(1, s.elde / Math.max(1, s.adet));
  const eksik = Math.max(0, s.adet - s.elde);
  return <View style={{ opacity: acik ? 1 : 0.6 }}>
    <Cerceve aktif={acik && s.teslimEdebilir} ic={{ padding: 12, gap: 10 }}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
        <Madalyon icon={MAL_IKON[s.mal]} size={46} aktif={acik} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 16, lineHeight: 21, color: acik ? C.parchment : C.parchmentDim, textAlign: hiza(rtl) }}>{ilan}</Text>
          {s.isteyen ? <Pressable accessibilityRole="link" accessibilityLabel={applyParams(t("onl.sp.isteyen"), [s.isteyen.ad])} onPress={() => { hap("tap"); onKisi(s.isteyen!.id); }}
            style={{ minHeight: 44, justifyContent: "center", alignSelf: rtl ? "flex-end" : "flex-start" }}>
            <Text style={{ fontFamily: F.serif, fontSize: 14.5, color: C.gold, textDecorationLine: "underline", textAlign: hiza(rtl) }}>{applyParams(t("onl.sp.isteyen"), [s.isteyen.ad])}</Text>
          </Pressable> : <Text style={{ fontFamily: F.serifItalic, fontSize: 14, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.sp.isteyenYok")}</Text>}
        </View>
      </View>
      <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
        <Rozet icon="coins" metin={applyParams(t("onl.is.akce"), [s.odul])} renk={C.goldBright} dolu={acik} />
        <Rozet icon="star" metin={`${applyParams(t("onl.is.hizmet"), [s.hizmet])} · ${t("onl.mes." + s.meslek)}`} />
        {acik ? <Rozet icon="hourglass" metin={s.kalanAy <= 1 ? t("onl.sp.sonAy") : applyParams(t("onl.sp.kalanAy"), [s.kalanAy])} renk={s.kalanAy <= 1 ? C.ember : C.gold} />
          : <Rozet metin={t("onl.sp.durum." + s.durum)} renk={s.durum === "teslim" ? C.sage : C.parchmentMuted} dolu={s.durum === "teslim"} />}
      </View>
      {acik ? <>
        <View accessible accessibilityLabel={applyParams(t("onl.sp.elde"), [s.elde, s.adet])} style={{ gap: 5 }}>
          <View style={{ flexDirection: yon(rtl), justifyContent: "space-between", gap: 8 }}>
            <Text style={{ fontFamily: F.display, fontSize: 12.5, color: s.teslimEdebilir ? C.sage : C.parchmentDim }}>{applyParams(t("onl.sp.elde"), [s.elde, s.adet])}</Text>
            {eksik > 0 ? <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: C.emberSoft }}>{applyParams(t("onl.sp.eksik"), [eksik])}</Text> : null}
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(201,162,78,0.15)", overflow: "hidden", flexDirection: yon(rtl) }}>
            <View style={{ width: `${oran * 100}%`, backgroundColor: s.teslimEdebilir ? C.sage : C.gold, borderRadius: 3 }} />
          </View>
        </View>
        {hata ? <Bant metin={hata} rtl={rtl} /> : null}
        <AltinDugme etiket={t("onl.sp.teslimEt")} icon="medal" rtl={rtl} kapali={!s.teslimEdebilir} bekliyor={bekliyor}
          erisim={s.teslimEdebilir ? `${t("onl.sp.teslimEt")}: ${ilan}` : `${t("onl.sp.teslimEt")}: ${applyParams(t("onl.sp.eksik"), [eksik])}`} onPress={onTeslim} />
        {!s.teslimEdebilir ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.sp.nasil")}</Text> : null}
      </> : s.durum === "teslim" && s.alan ? <View accessible style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: "rgba(122,154,92,0.55)", backgroundColor: "rgba(52,72,38,0.35)" }}>
        <GameIcon name="medal" size={16} color={C.sage} />
        <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchment, textAlign: hiza(rtl) }}>
          {s.alan.id === benId ? t("onl.sp.senTeslim") : applyParams(t("onl.sp.teslimEden"), [s.alan.ad])}
        </Text>
      </View> : <Text style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.sp.dustuNot")}</Text>}
    </Cerceve>
  </View>;
}

function SiparislerEkran() {
  const router = useRouter();
  const { t, rtl, lang } = useI18n();
  const o = useYerlesimEkrani();
  const y = o.yerlesim;
  const [sonuc, setSonuc] = useState<SiparisTeslimYaniti | null>(null);
  const [hata, setHata] = useState<{ id: string; metin: string } | null>(null);
  useBirKez(() => { void o.siparisleriYukle(); }, !!y);
  if (!y) return <YerlesimBekle rtl={rtl} t={t} onGiris={() => router.replace("/online")} />;

  const ben = y.ben;
  const liste = o.siparisler;
  const yukHata = o.hataIslem === "siparisler" ? o.hata : null;
  const acik = liste?.filter((s) => s.durum === "acik" && s.kalanAy > 0) ?? [];
  const kapali = liste?.filter((s) => !(s.durum === "acik" && s.kalanAy > 0)) ?? [];
  const kisiyeGit = (id: string) => router.push(kisiYolu(id));

  // Görüşü artanların adları: ilan sahibi, tanıdıklar, hane, önbellekteki kişiler, haritadakiler.
  const adlar = new Map<string, string>();
  for (const k of ben.tanidiklar) adlar.set(k.id, k.ad);
  for (const k of ben.hane) adlar.set(k.id, k.ad);
  for (const m of y.harita) for (const k of m.kisiler) adlar.set(k.id, k.ad);
  for (const [id, k] of Object.entries(o.kisiler)) adlar.set(id, k.ad);
  for (const s of liste ?? []) if (s.isteyen) adlar.set(s.isteyen.id, s.isteyen.ad);

  const teslim = async (id: string) => {
    setHata(null);
    const s = await o.siparisTeslim(id);
    if (s.ok) { hap("success"); setSonuc(s.deger); } else { hap("error"); setHata({ id, metin: teslimHatasi(s.hata, t) }); }
  };

  const gorusler = sonuc ? Object.entries(sonuc.gorus).sort((a, b) => b[1] - a[1]) : [];
  const adli = gorusler.filter(([id]) => adlar.has(id)).slice(0, GORUS_EN_COK);
  const digerSayisi = gorusler.length - adli.length;

  const panel = <AltPanel acik={!!sonuc} onKapat={() => setSonuc(null)} etiket={t("onl.sp.sonuc")} rtl={rtl} t={t}>
    {sonuc ? <>
      <View style={{ alignItems: "center", gap: 8, paddingTop: 6 }}>
        <View style={GLOW}><Madalyon icon="medal" size={68} aktif /></View>
        <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={{ fontFamily: F.display, fontSize: 21, color: C.goldBright, textAlign: "center" }}>{t("onl.sp.sonuc")}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 15.5, lineHeight: 21, color: C.parchmentDim, textAlign: "center" }}>{applyParams(t("onl.sp.ilan"), [sonuc.adet, t("onl.mal." + sonuc.mal)])}</Text>
      </View>
      <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
        <Degisim icon="coins" metin={applyParams(t("onl.sat.kazanc"), [sonuc.odul])} olumlu />
        {sonuc.hizmet > 0 ? <Degisim icon="star" metin={applyParams(t("onl.is.hizmet"), [sonuc.hizmet])} olumlu /> : null}
        {sonuc.gonul ? <Degisim icon={HAL_IKON.gonul} metin={applyParams(t("onl.hal.degisim.gonul"), [isaretli(sonuc.gonul)])} olumlu={sonuc.gonul > 0} /> : null}
      </View>
      {sonuc.olay ? <View accessible style={{ gap: 6, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(226,182,90,0.55)", backgroundColor: "rgba(90,66,22,0.4)" }}>
        <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: rtl ? 0 : 1.2, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.sp.tesekkur")}</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 15.5, lineHeight: 22, color: C.parchment, textAlign: hiza(rtl) }}>{ozetYaz(sonuc.olay.ozet, t, lang)}</Text>
      </View> : null}
      {gorusler.length ? <View style={{ gap: 4 }}>
        <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: rtl ? 0 : 1.2, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.sp.gorus")}</Text>
        {adli.map(([id, d]) => <Pressable key={id} accessibilityLabel={`${adlar.get(id)}: ${applyParams(t("onl.ey.gorusArti"), [isaretli(d)])}`}
          onPress={() => { setSonuc(null); kisiyeGit(id); }}
          style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, minHeight: 44 }}>
          <GameIcon name="family" size={15} color={C.sage} />
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchment, textAlign: hiza(rtl) }}>{adlar.get(id)}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 14, color: C.sage }}>{isaretli(d)}</Text>
        </Pressable>)}
        {digerSayisi > 0 ? <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.sp.gorusDiger"), [digerSayisi])}</Text> : null}
      </View> : null}
      <AltinDugme etiket={t("onl.is.tamam")} rtl={rtl} onPress={() => setSonuc(null)} />
    </> : null}
  </AltPanel>;

  return <OnlineSayfa gorsel={sahneGorseli(y.yerlesim.tur, y.saat.mevsim)} oran={0.3} rtl={rtl} t={t} alt={panel}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 6 }}>
      <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/lonca")} />
      <View style={{ flex: 1 }} />
      <Hap icon="coins" metin={String(ben.para)} erisim={applyParams(t("onl.ya.paraErisim"), [ben.para])} />
    </View>
    <View style={{ marginTop: 8 }}>
      <SayfaBasi ust={y.yerlesim.ad} baslik={t("onl.sp.baslik")} alt={t("onl.sp.alt")} rtl={rtl} />
    </View>

    <Baslik2 metin={t("onl.sp.acikBaslik")} rtl={rtl} sag={liste ? <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>{acik.length}</Text> : undefined} />
    {yukHata && !liste ? <Bant metin={t(hataAnahtari(yukHata))} rtl={rtl} eylem={t("onl.yenidenDene")} onEylem={() => { void o.siparisleriYukle(); }} />
      : !liste ? <Yukleniyor metin={t("onl.sp.yukleniyor")} />
      : acik.length ? <View style={{ gap: 10 }}>
        {acik.map((s, n) => <Animated.View key={s.id} entering={giris(n * 50)}>
          <SiparisKarti s={s} benId={ben.id} rtl={rtl} t={t} bekliyor={o.islem === "siparis"} hata={hata?.id === s.id ? hata.metin : null}
            onTeslim={() => { void teslim(s.id); }} onKisi={kisiyeGit} />
        </Animated.View>)}
      </View> : <BosKart icon="scroll-open" metin={t("onl.sp.bos")} rtl={rtl} />}

    {kapali.length ? <>
      <Baslik2 metin={t("onl.sp.kapaliBaslik")} rtl={rtl} />
      <View style={{ gap: 10 }}>
        {kapali.map((s) => <SiparisKarti key={s.id} s={s} benId={ben.id} rtl={rtl} t={t} bekliyor={false} hata={null} onTeslim={() => {}} onKisi={kisiyeGit} />)}
      </View>
    </> : null}

    <View style={{ marginTop: 14, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,162,78,0.3)", backgroundColor: "rgba(14,10,6,0.82)" }}>
      <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.sp.not")}</Text>
    </View>
    <View style={{ marginTop: 22, gap: 8 }}>
      <CizgiDugme etiket={t("onl.is.baslik")} icon="saw" rtl={rtl} kucuk onPress={() => router.push("/online/isler")} />
      <CizgiDugme etiket={t("onl.lo.baslik")} icon="banner" rtl={rtl} kucuk onPress={() => router.push("/online/lonca")} />
    </View>
  </OnlineSayfa>;
}

export default function OnlineSiparisler() {
  return onlineEkranAcik() ? <OnlineKapisi><SiparislerEkran /></OnlineKapisi> : <OnlineYakinda />;
}
