// Gelen kutusu (Faz 3a): cevap bekleyen teklifler (oyuncu ve NPC) ve dostluk istekleri; gönderdiklerin; süren
// anlaşmalar, dostlar ve husumetler; hakkındaki söylentiler (bir kez yalanla, 1 takat); kapananlar ve engellediklerin.
// Her teklifte şartlar, emanet, son cevap ayı ve "cevapsız kalırsa ne olur" yazılı; kabul/ret/geri/bitir/öde.
// Bekleme ekranı kilitlemez: veri gelene dek sekmeler ve geri düğmesi çalışır.
import { useEffect, useState, type ReactNode } from "react";
import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { hap } from "../../lib/haptics";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { Bant, Cerceve, CizgiDugme, GeriDugme, geriGit, hiza, yon } from "../../lib/online/ui";
import { Baslik2, BosKart, KisiYuzu, OnlineSayfa, Rozet, SatirOku, TakatHapi, YerlesimBekle, Yukleniyor, sahneGorseli, useYerlesimEkrani } from "../../lib/online/yasam-ui";
import { hataAnahtari } from "../../lib/online/hata";
import type { KisiAdi, OnlineHata } from "../../lib/online/protokol";
import { useToplum } from "../../lib/online/toplum-durum";
import { OlaganDuzenKarti, TeklifKarti, ayFarki } from "../../lib/online/toplum-ui";
import { TOPLUM_SINIR, kisiYolu, type SoylentiGorunumu } from "../../lib/online/toplum-veri";

type Sekme = "gelen" | "giden" | "suren" | "soylenti" | "gecmis";
const SEKMELER: readonly Sekme[] = ["gelen", "giden", "suren", "soylenti", "gecmis"];
const SEKME_IKON: Record<Sekme, string> = { gelen: "scroll", giden: "walk", suren: "hourglass", soylenti: "speaker", gecmis: "book" };

function KisiSatiri({ k, alt, rtl, onPress, sag }: { k: KisiAdi; alt: string; rtl: boolean; onPress: () => void; sag?: ReactNode }) {
  return <View style={{ gap: 6, paddingHorizontal: 12, paddingVertical: 8 }}>
    <Pressable accessibilityRole="link" accessibilityLabel={`${k.ad}. ${alt}`} onPress={onPress} style={{ minHeight: 44, flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
      <KisiYuzu id={k.id} ad={k.ad} boyut={38} oyuncu={k.id.startsWith("o")} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 15.5, color: C.parchment, textAlign: hiza(rtl) }}>{k.ad}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{alt}</Text>
      </View>
      <SatirOku rtl={rtl} />
    </Pressable>
    {sag}
  </View>;
}

function SoylentiKarti({ s, ay, rtl, t, bekliyor, hata, onYalanla }: { s: SoylentiGorunumu; ay: number; rtl: boolean; t: (k: string) => string; bekliyor: boolean; hata: OnlineHata | null; onYalanla: () => void }) {
  const iyi = s.etki > 0;
  return <Cerceve ic={{ padding: 12, gap: 8 }}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
      <GameIcon name="speaker" size={18} color={iyi ? C.sage : C.ember} />
      <Text style={{ flex: 1, fontFamily: F.display, fontSize: 14, color: C.parchment, textAlign: hiza(rtl) }}>{applyParams(t("onl.tp.sy.t." + s.tur), [s.hedef?.ad ?? "?"])}</Text>
      <Rozet metin={t(s.yalanlandi ? "onl.tp.sy.yalanlandi" : s.yayiliyor ? "onl.tp.sy.yayiliyor" : "onl.tp.sy.durdu")} renk={s.yalanlandi ? C.parchmentMuted : iyi ? C.sage : C.ember} />
    </View>
    <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.tp.sy.bilen"), [s.bilen, s.guven, ayFarki(t, s.ay, ay)])}</Text>
    <Text style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: iyi ? C.sage : C.emberSoft, textAlign: hiza(rtl) }}>{t(iyi ? "onl.tp.sy.iyi" : "onl.tp.sy.kotu")}</Text>
    {!s.yalanlandi && !iyi ? <CizgiDugme etiket={applyParams(t("onl.tp.sy.yalanla"), [TOPLUM_SINIR.yalanlamaTakat])} icon="scales" rtl={rtl} kucuk kapali={bekliyor} onPress={onYalanla} /> : null}
    {hata ? <Bant metin={t(hataAnahtari(hata))} rtl={rtl} /> : null}
  </Cerceve>;
}

function GelenEkran() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const o = useYerlesimEkrani();
  const toplum = useToplum();
  const y = o.yerlesim;
  const [sekme, setSekme] = useState<Sekme>("gelen");
  useEffect(() => { if (y) void toplum.gelenYukle(); }, [!!y]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!y) return <YerlesimBekle rtl={rtl} t={t} onGiris={() => router.replace("/online")} />;
  const g = toplum.gelen;
  const ay = g?.ay ?? y.saat.oyunAyi;
  const benId = y.ben.id;
  const git = (id: string) => { hap("tap"); router.push(kisiYolu(id)); };
  const sayi: Record<Sekme, number> = {
    gelen: (g?.gelen.length ?? 0) + (g?.dostluk.gelen.length ?? 0),
    giden: (g?.giden.length ?? 0) + (g?.dostluk.giden.length ?? 0),
    suren: g?.suren.length ?? 0,
    soylenti: g?.soylentiler.filter((s) => s.yayiliyor && !s.yalanlandi).length ?? 0,
    gecmis: g?.kapanan.length ?? 0,
  };
  const yukHata = toplum.hataOf("gelen");

  const icerik = () => {
    if (!g) return yukHata ? <Bant metin={t(hataAnahtari(yukHata))} rtl={rtl} eylem={t("onl.yenidenDene")} onEylem={() => { void toplum.gelenYukle(); }} /> : <Yukleniyor metin={t("onl.yukleniyor")} />;
    const teklifler = (liste: typeof g.gelen) => <View style={{ gap: 10 }}>{liste.map((x) => <TeklifKarti key={x.id} x={x} ay={ay} benId={benId} toplum={toplum} onKisi={git} />)}</View>;
    switch (sekme) {
      case "gelen": return <>
        {g.dostluk.gelen.length ? <>
          <Baslik2 metin={t("onl.tp.gk.dostlukIstek")} rtl={rtl} ust={14} />
          <Cerceve ic={{ paddingVertical: 2 }}>
            {g.dostluk.gelen.map((k, i) => <View key={k.id} style={{ borderTopWidth: i ? 1 : 0, borderColor: "rgba(201,162,78,0.12)" }}>
              <KisiSatiri k={k} alt={applyParams(t("onl.tp.gk.istedi"), [ayFarki(t, k.ay, ay)])} rtl={rtl} onPress={() => git(k.id)}
                sag={<View style={{ flexDirection: yon(rtl), gap: 8 }}>
                  <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.tp.c.kabul")} icon="family" rtl={rtl} kucuk kapali={toplum.bekliyor(`dostluk:${k.id}:kabul`)} onPress={() => { void toplum.dostluk(k.id, "kabul"); }} /></View>
                  <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.tp.c.ret")} rtl={rtl} kucuk kapali={toplum.bekliyor(`dostluk:${k.id}:ret`)} onPress={() => { void toplum.dostluk(k.id, "ret"); }} /></View>
                </View>} />
            </View>)}
          </Cerceve>
        </> : null}
        <Baslik2 metin={t("onl.tp.gk.teklifler")} rtl={rtl} ust={14} />
        {g.gelen.length ? teklifler(g.gelen) : <BosKart icon="scroll" metin={t("onl.tp.gk.gelenBos")} rtl={rtl} />}
      </>;
      case "giden": return <>
        <Baslik2 metin={t("onl.tp.gk.teklifler")} rtl={rtl} ust={14} />
        {g.giden.length ? teklifler(g.giden) : <BosKart icon="walk" metin={t("onl.tp.gk.gidenBos")} rtl={rtl} />}
        {g.dostluk.giden.length ? <>
          <Baslik2 metin={t("onl.tp.gk.dostlukGiden")} rtl={rtl} />
          <Cerceve ic={{ paddingVertical: 2 }}>
            {g.dostluk.giden.map((k, i) => <View key={k.id} style={{ borderTopWidth: i ? 1 : 0, borderColor: "rgba(201,162,78,0.12)" }}>
              <KisiSatiri k={k} alt={applyParams(t("onl.tp.gk.gonderdin"), [ayFarki(t, k.ay, ay)])} rtl={rtl} onPress={() => git(k.id)}
                sag={<CizgiDugme etiket={t("onl.tp.c.geri")} rtl={rtl} kucuk kapali={toplum.bekliyor(`dostluk:${k.id}:ret`)} onPress={() => { void toplum.dostluk(k.id, "ret"); }} />} />
            </View>)}
          </Cerceve>
        </> : null}
      </>;
      case "suren": return <>
        <Baslik2 metin={t("onl.tp.gk.anlasmalar")} rtl={rtl} ust={14} />
        {g.suren.length ? teklifler(g.suren) : <BosKart icon="hourglass" metin={t("onl.tp.gk.surenBos")} rtl={rtl} />}
        <Baslik2 metin={applyParams(t("onl.tp.gk.dostlar"), [g.dostluk.dostlar.length])} rtl={rtl} />
        {g.dostluk.dostlar.length ? <Cerceve ic={{ paddingVertical: 2 }}>
          {g.dostluk.dostlar.map((k, i) => <View key={k.id} style={{ borderTopWidth: i ? 1 : 0, borderColor: "rgba(201,162,78,0.12)" }}>
            <KisiSatiri k={k} alt={applyParams(t("onl.tp.gk.dostOldu"), [ayFarki(t, k.ay, ay)])} rtl={rtl} onPress={() => git(k.id)} />
          </View>)}
        </Cerceve> : <BosKart icon="family" metin={t("onl.tp.gk.dostYok")} rtl={rtl} />}
        {g.husumetler.length ? <>
          <Baslik2 metin={t("onl.tp.hu.baslik")} rtl={rtl} />
          <Cerceve ic={{ paddingVertical: 2 }}>
            {g.husumetler.map((h, i) => <View key={h.id + h.yon} style={{ borderTopWidth: i ? 1 : 0, borderColor: "rgba(201,162,78,0.12)" }}>
              <KisiSatiri k={h} alt={`${t("onl.tp.gk.hu." + h.yon)} · ${ayFarki(t, h.ay, ay)}`} rtl={rtl} onPress={() => git(h.id)} />
            </View>)}
          </Cerceve>
        </> : null}
      </>;
      case "soylenti": return <>
        <Text style={{ marginTop: 14, fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.tp.sy.not")}</Text>
        <View style={{ gap: 10, marginTop: 10 }}>
          {g.soylentiler.length ? g.soylentiler.map((s) => <SoylentiKarti key={s.id} s={s} ay={ay} rtl={rtl} t={t} bekliyor={toplum.bekliyor(`yalanla:${s.id}`)} hata={toplum.hataOf(`yalanla:${s.id}`)} onYalanla={() => { void toplum.yalanla(s.id); }} />)
            : <BosKart icon="speaker" metin={t("onl.tp.sy.bos")} rtl={rtl} />}
        </View>
      </>;
      case "gecmis": return <>
        <Baslik2 metin={t("onl.tp.gk.kapanan")} rtl={rtl} ust={14} />
        {g.kapanan.length ? teklifler(g.kapanan) : <BosKart icon="book" metin={t("onl.tp.gk.kapananBos")} rtl={rtl} />}
        <Baslik2 metin={t("onl.tp.gk.engellenen")} rtl={rtl} />
        {g.engellenenler.length ? <Cerceve ic={{ paddingVertical: 2 }}>
          {g.engellenenler.map((k, i) => <View key={k.id} style={{ borderTopWidth: i ? 1 : 0, borderColor: "rgba(201,162,78,0.12)" }}>
            <KisiSatiri k={k} alt={t("onl.tp.gk.engelAlt")} rtl={rtl} onPress={() => git(k.id)}
              sag={<CizgiDugme etiket={t("onl.tp.engel.kaldirKisa")} rtl={rtl} kucuk kapali={toplum.bekliyor(`engelle:${k.id}:kaldir`)} onPress={() => { void toplum.engelle(k.id, "kaldir"); }} />} />
          </View>)}
        </Cerceve> : <BosKart icon="shield" metin={t("onl.tp.gk.engelBos")} rtl={rtl} />}
      </>;
    }
  };

  return <OnlineSayfa gorsel={sahneGorseli(y.yerlesim.tur, y.saat.mevsim)} oran={0.3} rtl={rtl} t={t}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
      <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/yasam")} />
      <Text style={{ flex: 1, fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 2, color: C.goldBright, textAlign: hiza(rtl), textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 6 }}>{t("onl.tp.gk.ust")}</Text>
      <TakatHapi kalan={y.ben.takat.kalan} tavan={y.ben.takat.tavan} t={t} />
    </View>
    <Text accessibilityRole="header" style={{ marginTop: 12, fontFamily: F.display, fontSize: 24, lineHeight: 30, color: C.parchment, textAlign: hiza(rtl), textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 6 }}>{t("onl.tp.gk.baslik")}</Text>
    <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl), textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 6 }}>{t("onl.tp.gk.aciklama")}</Text>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 6, flexDirection: yon(rtl) }}>
      {(rtl ? [...SEKMELER].reverse() : SEKMELER).map((s) => {
        const sec = s === sekme;
        return <Pressable key={s} accessibilityRole="tab" accessibilityState={{ selected: sec }} accessibilityLabel={`${t("onl.tp.gk.s." + s)}${sayi[s] ? ` (${sayi[s]})` : ""}`} onPress={() => { hap("selection"); setSekme(s); }}
          style={({ pressed }) => ({ minHeight: 44, flexDirection: yon(rtl), alignItems: "center", gap: 6, paddingHorizontal: 12, borderRadius: 22, borderWidth: sec ? 2 : 1, borderColor: sec ? C.goldBright : "rgba(201,162,78,0.4)", backgroundColor: sec ? "rgba(201,162,78,0.2)" : pressed ? "rgba(201,162,78,0.1)" : "rgba(14,10,6,0.78)" })}>
          <GameIcon name={SEKME_IKON[s]} size={14} color={sec ? C.goldBright : C.parchmentMuted} />
          <Text style={{ fontFamily: F.display, fontSize: 12.5, color: sec ? C.parchment : C.parchmentDim }}>{t("onl.tp.gk.s." + s)}</Text>
          {sayi[s] ? <View style={{ minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: "center", justifyContent: "center", backgroundColor: s === "gelen" ? C.goldBright : "rgba(201,162,78,0.3)" }}>
            <Text style={{ fontFamily: F.display, fontSize: 11, color: s === "gelen" ? C.inkOnGold : C.parchment }}>{sayi[s]}</Text>
          </View> : null}
        </Pressable>;
      })}
    </ScrollView>

    {icerik()}

    {sekme === "gelen" ? <>
      <Baslik2 metin={t("onl.tp.dz.baslik")} rtl={rtl} />
      <OlaganDuzenKarti />
    </> : null}
  </OnlineSayfa>;
}

export default function OnlineGelen() {
  return onlineEkranAcik() ? <OnlineKapisi><GelenEkran /></OnlineKapisi> : <OnlineYakinda />;
}
