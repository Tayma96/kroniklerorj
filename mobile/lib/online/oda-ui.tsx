// Oda getirileri (H12): sandık ve han emaneti, ikamet, özel görüşme. Sunucu kapasiteyi, süreyi ve izinleri denetler;
// kart yalnız sunucunun barınma görünümünü gösterir ve niyeti yollar. Görüşmede söz hazır kalıplardandır (metin saklanmaz).
import { useState } from "react";
import { View, Text } from "react-native";
import { useI18n, applyParams } from "../i18n";
import { C, F } from "../theme";
import { GameIcon } from "../icons";
import { hap } from "../haptics";
import { useOnline } from "./durum";
import { istekNoUret } from "./depo";
import { ekHataAnahtari, type EkHata } from "./ek-istemci";
import { istekTekrarMi } from "./hata";
import { malAdi } from "./ekonomi-ui";
import { useBarinmaIstemci, type BarinmaGorunumu, type GorusmeOzeti } from "./barinma-veri";
import { Bant, Cerceve, CizgiDugme, hiza, yon } from "./ui";
import { Baslik2, Rozet } from "./yasam-ui";

const kisiAd = (k: { i: string; ad: string } | string) => (typeof k === "string" ? k : k.ad);

export function OdaKarti({ g, onYenile }: { g: BarinmaGorunumu; onYenile: () => void }) {
  const { t, rtl } = useI18n();
  const o = useOnline();
  const ist = useBarinmaIstemci();
  const [hata, setHata] = useState<EkHata | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const sd = g.sandik;
  const gr = g.gorusme;
  if (!sd && !gr && !g.ikamet) return null;

  const calis = async (is: () => Promise<{ ok: boolean; hata?: EkHata }>, not?: string) => {
    setBekliyor(true); setHata(null); setBilgi(null);
    const r = await is();
    setBekliyor(false);
    if (r.ok || istekTekrarMi(r.hata)) { hap("success"); if (not) setBilgi(not); onYenile(); void o.yerlesimYukle(true); }
    else { hap("error"); setHata(r.hata ?? "sunucu_hatasi"); }
  };
  const envanter = Object.entries(o.envanter ?? {}).filter((e): e is [string, number] => (e[1] ?? 0) > 0);
  const oyuncular = (o.yerlesim?.ben.tanidiklar ?? []).filter((x) => x.oyuncu);
  const benim: GorusmeOzeti | null = gr?.benim ?? null;

  return <>
    <Baslik2 metin={t("onl.oda.baslik")} rtl={rtl} sag={g.ikamet ? <Rozet icon="house" metin={t("onl.oda.ikamet")} renk={C.sage} /> : undefined} />
    <Cerceve ic={{ padding: 12, gap: 10 }}>
      {g.ikamet ? <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.oda.ikametAlt")}</Text> : null}

      {sd && sd.durum !== "yok" ? <View style={{ gap: 6 }}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
          <GameIcon name="backpack" size={15} color={C.gold} />
          <Text style={{ flex: 1, fontFamily: F.display, fontSize: 13.5, color: C.parchment, textAlign: hiza(rtl) }}>
            {sd.durum === "sandik" ? applyParams(t("onl.oda.sandik"), [sd.adet, sd.kapasite]) : t("onl.oda.emanet")}
          </Text>
        </View>
        {Object.entries(sd.mallar).map(([mal, n]) => <View key={mal} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, minHeight: 44 }}>
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, color: C.parchmentDim, textAlign: hiza(rtl) }}>{malAdi(t, mal)} ×{n}</Text>
          {sd.durum === "sandik" ? <CizgiDugme etiket={t("onl.oda.al")} rtl={rtl} kucuk kapali={bekliyor}
            onPress={() => { void calis(() => ist.sandik({ islem: "al", mal, adet: 1, istekNo: istekNoUret() })); }} /> : null}
        </View>)}
        {sd.durum === "emanet" && sd.adet > 0 ? <CizgiDugme etiket={t("onl.oda.emanetAl")} icon="camel" rtl={rtl} kucuk kapali={bekliyor}
          onPress={() => { void calis(() => ist.emanet({ istekNo: istekNoUret() }), t("onl.oda.emanetGeldi")); }} /> : null}
        {sd.durum === "sandik" && sd.acik && sd.adet < sd.kapasite && envanter.length ? <>
          <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.oda.koyBaslik")}</Text>
          <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
            {envanter.slice(0, 12).map(([mal, n]) => <CizgiDugme key={mal} etiket={`${malAdi(t, mal)} (${n})`} rtl={rtl} kucuk kapali={bekliyor}
              onPress={() => { void calis(() => ist.sandik({ islem: "koy", mal, adet: 1, istekNo: istekNoUret() })); }} />)}
          </View>
        </> : null}
      </View> : null}

      {gr ? <View style={{ gap: 6 }}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
          <GameIcon name="ring" size={15} color={C.gold} />
          <Text style={{ flex: 1, fontFamily: F.display, fontSize: 13.5, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.oda.gorusme")}</Text>
        </View>
        {gr.davetler.map((d) => <View key={d.ev.i} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, minHeight: 44 }}>
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.oda.davetGeldi"), [d.ev.ad])}</Text>
          <CizgiDugme etiket={t("onl.oda.kabul")} rtl={rtl} kucuk kapali={bekliyor}
            onPress={() => { void calis(() => ist.gorusme({ islem: "kabul", hedef: d.ev.i, istekNo: istekNoUret() })); }} />
        </View>)}
        {benim ? <>
          <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>
            {applyParams(t("onl.oda.gorusmeDurum"), [benim.davetliler.map((x) => kisiAd(x.kisi) + (x.kabul ? "" : " …")).join(", ") || "—", benim.soz, benim.sozEnCok])}
          </Text>
          {benim.benim || benim.davetliler.some((x) => x.kabul) ? <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
            {gr.sartlar.map((s) => <CizgiDugme key={s} etiket={t("onl.oda.sart." + s)} rtl={rtl} kucuk kapali={bekliyor || benim.soz >= benim.sozEnCok}
              onPress={() => { void calis(() => ist.gorusme({ islem: "soz", sart: s, istekNo: istekNoUret() }), t("onl.oda.sozVerildi")); }} />)}
          </View> : null}
          <CizgiDugme etiket={t(benim.benim ? "onl.oda.bitir" : "onl.oda.ayril")} rtl={rtl} kucuk kapali={bekliyor}
            onPress={() => { void calis(() => ist.gorusme({ islem: "bitir", ...(benim.benim ? {} : { hedef: benim.ev.i }), istekNo: istekNoUret() })); }} />
        </> : gr.acabilir ? <>
          <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{applyParams(t("onl.oda.gorusmeAc"), [gr.davetliEnCok])}</Text>
          {oyuncular.length ? <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
            {oyuncular.slice(0, 8).map((x) => <CizgiDugme key={x.id} etiket={x.ad} icon="ring" rtl={rtl} kucuk kapali={bekliyor}
              onPress={() => { void calis(() => ist.gorusme({ islem: "davet", hedef: x.id, istekNo: istekNoUret() }), applyParams(t("onl.oda.davetEdildi"), [x.ad])); }} />)}
          </View> : <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.oda.oyuncuYok")}</Text>}
        </> : <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.oda.ozelOdaGerek")}</Text>}
      </View> : null}

      {bilgi ? <Bant tur="bilgi" metin={bilgi} rtl={rtl} /> : null}
      {hata ? <Bant metin={t(ekHataAnahtari(hata))} rtl={rtl} /> : null}
    </Cerceve>
  </>;
}
