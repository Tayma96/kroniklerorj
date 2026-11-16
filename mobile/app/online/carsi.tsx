// Çarşı (tezgâh modeli Dilim 1; GET /v1/dukkanlar): yerleşimdeki dükkânlar kart olarak — ad, sahibi, seviye, itibar,
// kepenk, sattığı mallar; "senin" işareti; uzun süre sessiz kalmış dükkânda devralma (koşul ve iade açık, iki adımlı onay).
// Üstte yuva doluluğu ve "Dükkân aç" kısayolu; mal adına göre süzgeç ("şunu kim satıyor?") istemcide, `mallar[]` üzerinden.
// Pazar oyuncu ilanlarıdır; çarşı dükkânların rafıdır.
import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { hap } from "../../lib/haptics";
import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { BASMA_OLCEK, Bant, Cerceve, CizgiDugme, Doluluk, GeriDugme, Madalyon, ONL, belir, geriGit, giris, hiza, yon } from "../../lib/online/ui";
import { BosKart, Hap, OnlineSayfa, Rozet, SayfaBasi, YerlesimBekle, useYerlesimEkrani } from "../../lib/online/yasam-ui";
import { malAdi, malIkonu } from "../../lib/online/ekonomi-ui";
import { isletmeYolu, useMulkIstemci } from "../../lib/online/mulk-veri";
import { hatirlananMulkListesi, mulkListesiniHatirla } from "../../lib/online/simdi-rehber";
import { dukkanlariHatirla, hatirlananDukkanlar, seviyeAnahtari, tezgahHataMetni, useTezgahIstemci, type DukkanKarti, type DukkanListesi } from "../../lib/online/tezgah-veri";
import { DUKKAN_GORSEL, DevralCekmecesi } from "../../lib/online/tezgah-ui";

type Ceviri = (k: string) => string;

function DukkanKartiGorunumu({ d, t, rtl, vurgu, onPress }: { d: DukkanKarti; t: Ceviri; rtl: boolean; vurgu: string | null; onPress: () => void }) {
  const ad = d.ad || applyParams(t("onl.tz.adsiz"), [d.no]);
  const erisim = [
    ad, d.benim ? t("onl.tz.senin") : applyParams(t("onl.isl.sahibi"), [d.sahip.ad || t("onl.hs.sahipBilinmez")]),
    t(seviyeAnahtari(d.seviye)), applyParams(t("onl.isl.itibarN"), [d.itibar]),
    t(d.kepenk ? "onl.tz.kepenk.kapali" : "onl.tz.kepenk.acik"),
    d.mallar.length ? applyParams(t("onl.tz.satiyor"), [d.mallar.map((m) => malAdi(t, m)).join(", ")]) : t("onl.tz.rafBosKisa"),
  ].join(". ");
  return <Pressable accessibilityRole="button" accessibilityLabel={erisim} accessibilityHint={t(d.benim ? "onl.tz.ipucu.dukkanim" : "onl.tz.ipucu.gir")} onPress={() => { hap("tap"); onPress(); }}
    style={({ pressed }) => ({ transform: [{ scale: pressed ? BASMA_OLCEK : 1 }], opacity: d.kepenk ? 0.62 : 1 })}>
    <Cerceve aktif={d.benim} ic={{ padding: 12, gap: 8 }}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
        <Madalyon icon="scales" size={42} aktif={!d.kepenk} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: 15.5, lineHeight: 20, color: C.parchment, textAlign: hiza(rtl) }}>{ad}</Text>
          <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchmentDim, textAlign: hiza(rtl) }}>
            {d.benim ? t("onl.tz.senin") : applyParams(t("onl.isl.sahibi"), [d.sahip.ad || t("onl.hs.sahipBilinmez")])}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
        {d.benim ? <Rozet icon="crown" metin={t("onl.tz.senin")} renk={C.goldBright} dolu /> : null}
        <Rozet icon="trophy" metin={t(seviyeAnahtari(d.seviye))} />
        <Rozet icon="star" metin={applyParams(t("onl.isl.itibarN"), [d.itibar])} />
        <Rozet icon={d.kepenk ? "shield" : "sun"} metin={t(d.kepenk ? "onl.tz.kepenk.kapali" : "onl.tz.kepenk.acik")} renk={d.kepenk ? C.parchmentMuted : C.sage} />
      </View>
      {d.mallar.length ? <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
        {d.mallar.slice(0, 10).map((m) => <View key={m} accessible={false} style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 1,
          borderColor: vurgu === m ? C.goldBright : ONL.frame, backgroundColor: vurgu === m ? "rgba(201,162,78,0.25)" : "rgba(0,0,0,0.3)" }}>
          <GameIcon name={malIkonu(m)} size={15} color={vurgu === m ? C.goldBright : C.gold} />
        </View>)}
      </View> : <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.tz.rafBosKisa")}</Text>}
    </Cerceve>
  </Pressable>;
}

function Iskelet({ rtl, etiket }: { rtl: boolean; etiket: string }) {
  return <View accessibilityRole="progressbar" accessibilityLabel={etiket} style={{ gap: 10 }}>
    {[0, 1, 2].map((i) => <Animated.View key={i} entering={belir()}>
      <Cerceve ic={{ padding: 12, gap: 10, minHeight: 120 }}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(201,162,78,0.14)" }} />
          <View style={{ flex: 1, gap: 8, alignItems: rtl ? "flex-end" : "flex-start" }}>
            <View style={{ width: "50%", height: 12, borderRadius: 6, backgroundColor: "rgba(201,162,78,0.18)" }} />
            <View style={{ width: "34%", height: 10, borderRadius: 5, backgroundColor: "rgba(201,162,78,0.1)" }} />
          </View>
        </View>
        <View style={{ width: "70%", height: 18, borderRadius: 9, backgroundColor: "rgba(201,162,78,0.1)" }} />
      </Cerceve>
    </Animated.View>)}
  </View>;
}

function CarsiEkran() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const o = useYerlesimEkrani();
  const ist = useTezgahIstemci();
  const mist = useMulkIstemci();
  const y = o.yerlesim;
  const hesap = o.profil?.hesapId ?? "";
  const [l, setL] = useState<DukkanListesi | null>(() => hatirlananDukkanlar(hesap));
  const [hata, setHata] = useState<string | null>(null);
  const [suzgec, setSuzgec] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [edinim, setEdinim] = useState<{ fiyat: number; uygun: boolean } | null>(() => { const m = hatirlananMulkListesi(hesap); return m?.edinimSarti.dukkan ? { fiyat: m.edinimSarti.dukkan.fiyat, uygun: m.edinimSarti.dukkan.uygun } : null; });
  const acilis = useRef(0);
  const [devral, setDevral] = useState<{ d: DukkanKarti; oturum: number } | null>(null);

  const yukle = useCallback(async () => {
    setHata(null);
    const [r, m] = await Promise.all([ist.dukkanlar(), mist.liste()]);
    if (r.ok) { setL(r.deger); dukkanlariHatirla(hesap, r.deger); } else setHata(tezgahHataMetni(t, r));
    if (m.ok) { mulkListesiniHatirla(hesap, m.deger); const e = m.deger.edinimSarti.dukkan; if (e) setEdinim({ fiyat: e.fiyat, uygun: e.uygun }); }
  }, [ist, mist, hesap]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (y) void yukle(); }, [!!y, yukle]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!y) return <YerlesimBekle sekme="sokak" rtl={rtl} t={t} onGiris={() => router.replace("/online")} />;

  const tumMallar = [...new Set((l?.dukkanlar ?? []).flatMap((d) => d.mallar))].sort((a, b) => malAdi(t, a).localeCompare(malAdi(t, b)));
  const liste = (l?.dukkanlar ?? []).filter((d) => !suzgec || d.mallar.includes(suzgec))
    .sort((a, b) => Number(b.benim) - Number(a.benim) || Number(a.kepenk) - Number(b.kepenk) || a.no - b.no);
  const yuva = l?.yuva.dukkan;
  const bosYuva = !!yuva && yuva.dolu < yuva.toplam;
  const cip = (m: string | null) => {
    const secili = suzgec === m;
    const etiket = m ? malAdi(t, m) : t("onl.tz.hepsi");
    return <Pressable key={m ?? "_"} accessibilityRole="radio" accessibilityState={{ selected: secili }} accessibilityLabel={etiket} onPress={() => { if (!secili) { hap("selection"); setSuzgec(m); } }}
      style={({ pressed }) => ({ minHeight: 44, flexDirection: yon(rtl), alignItems: "center", gap: 6, paddingHorizontal: 12, borderRadius: 22, borderWidth: secili ? 1.5 : 1,
        borderColor: secili ? C.goldBright : "rgba(201,162,78,0.35)", backgroundColor: pressed ? "rgba(201,162,78,0.2)" : secili ? "rgba(201,162,78,0.18)" : "rgba(14,10,6,0.65)" })}>
      {m ? <GameIcon name={malIkonu(m)} size={14} color={secili ? C.goldBright : C.gold} /> : null}
      <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 12.5, color: secili ? C.parchment : C.parchmentDim }}>{etiket}</Text>
    </Pressable>;
  };

  return <OnlineSayfa gorsel={DUKKAN_GORSEL} oran={0.32} rtl={rtl} t={t}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 6 }}>
      <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/sokak")} />
      <View style={{ flex: 1 }} />
      <Hap icon="coins" metin={String(y.ben.para)} erisim={applyParams(t("onl.ya.paraErisim"), [y.ben.para])} />
    </View>
    <View style={{ marginTop: 8, marginBottom: 14 }}>
      <SayfaBasi ust={y.yerlesim.ad} baslik={t("onl.tz.carsi")} alt={t("onl.tz.carsiAlt")} rtl={rtl} />
    </View>

    {yuva ? <Animated.View entering={giris(30)}>
      <Cerceve ic={{ padding: 12, gap: 10 }}>
        <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: C.parchment, textAlign: hiza(rtl) }}>{applyParams(t("onl.tz.yuva"), [yuva.toplam, yuva.dolu])}</Text>
        <Doluluk nufus={yuva.dolu} kapasite={Math.max(1, yuva.toplam)} rtl={rtl} />
        {bosYuva ? <CizgiDugme etiket={t("onl.tz.dukkanAc")} icon="house" rtl={rtl} kucuk onPress={() => router.push("/online/mulk")} />
          : <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>
            {applyParams(t("onl.tz.yuvaDolu"), [l?.devralmaKepenkAy ?? "—"])}
          </Text>}
      </Cerceve>
    </Animated.View> : null}

    {bilgi ? <View style={{ marginTop: 10 }}><Bant metin={bilgi} rtl={rtl} tur="bilgi" /></View> : null}

    {tumMallar.length > 1 ? <View style={{ marginTop: 14, gap: 6 }}>
      <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 1.2, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.tz.kimSatiyor")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="radiogroup" style={{ marginHorizontal: -16 }}
        contentContainerStyle={{ flexDirection: yon(rtl), gap: 6, paddingHorizontal: 16, paddingVertical: 2 }}>
        {cip(null)}
        {tumMallar.map((m) => cip(m))}
      </ScrollView>
    </View> : null}

    <View style={{ marginTop: 14, gap: 10 }}>
      {hata && !l ? <Bant metin={hata} rtl={rtl} eylem={t("onl.yenidenDene")} onEylem={() => { void yukle(); }} />
        : !l ? <Iskelet rtl={rtl} etiket={t("onl.tz.yukleniyor")} />
        : !l.dukkanlar.length ? <BosKart icon="scales" metin={t("onl.tz.carsiBos")} rtl={rtl} />
        : !liste.length ? <BosKart icon="scales" metin={applyParams(t("onl.tz.suzgecBos"), [malAdi(t, suzgec ?? "")])} rtl={rtl} />
        : liste.map((d, i) => <Animated.View key={d.isletme} entering={giris(40 + i * 30)} style={{ gap: 6 }}>
          <DukkanKartiGorunumu d={d} t={t} rtl={rtl} vurgu={suzgec} onPress={() => router.push(isletmeYolu(d.isletme))} />
          {d.devralinabilir ? <CizgiDugme etiket={t("onl.tz.dv.incele")} icon="crown" rtl={rtl} kucuk onPress={() => setDevral({ d, oturum: ++acilis.current })} /> : null}
        </Animated.View>)}
      {hata && l ? <Bant metin={hata} rtl={rtl} eylem={t("onl.yenidenDene")} onEylem={() => { void yukle(); }} /> : null}
    </View>

    <View style={{ marginTop: 18, flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
      <GameIcon name="scroll" size={14} color={C.parchmentMuted} />
      <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.tz.carsiKural")}</Text>
    </View>

    {devral ? <DevralCekmecesi acik oturum={devral.oturum} isletme={devral.d.isletme} ad={devral.d.ad} kepenkAy={null} devralmaAy={l?.devralmaKepenkAy ?? null}
      edinimFiyat={edinim?.fiyat ?? null} ist={ist} onKapat={() => setDevral(null)} rtl={rtl} t={t}
      onBitti={async (bedel) => { setDevral(null); setBilgi(bedel ? applyParams(t("onl.tz.dv.tamam"), [bedel]) : t("onl.tz.dv.tamamKisa")); await yukle(); if (o.oturum?.tur !== "gelistirici") void o.yerlesimYukle(true); }} /> : null}
  </OnlineSayfa>;
}

export default function OnlineCarsi() {
  return onlineEkranAcik() ? <OnlineKapisi><CarsiEkran /></OnlineKapisi> : <OnlineYakinda />;
}
