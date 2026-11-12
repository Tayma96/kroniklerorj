// Kişisel ekonomi defteri: pazar, sipariş ve işletme kaynaklı gelir/giderler sunucunun kayıtlarından okunur.
import { useCallback, useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { Bant, Cerceve, CizgiDugme, GeriDugme, geriGit, hiza, yon } from "../../lib/online/ui";
import { Baslik2, BosKart, Hap, OnlineSayfa, SayfaBasi, Yukleniyor } from "../../lib/online/yasam-ui";
import { useEkonomiIstemci, type DefterYaniti } from "../../lib/online/ekonomi-veri";
import { ekHataAnahtari, type EkHata } from "../../lib/online/ek-istemci";

function DefterEkran() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const ist = useEkonomiIstemci();
  const [veri, setVeri] = useState<DefterYaniti | null>(null);
  const [hata, setHata] = useState<EkHata | null>(null);
  const [ay, setAy] = useState<number | undefined>();
  const yukle = useCallback(async () => {
    const r = await ist.defter(ay);
    if (r.ok) { setVeri(r.deger); setHata(null); } else setHata(r.hata);
  }, [ist, ay]);
  useEffect(() => { void yukle(); }, [yukle]);
  const akce = (n: number) => applyParams(t("onl.is.akce"), [n]);
  return <OnlineSayfa>
    <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/yasam")} />
    <SayfaBasi ust={t("onl.eko.baslik")} baslik={t("onl.df.baslik")} alt={t("onl.df.alt")} rtl={rtl} />
    {hata && !veri ? <Bant metin={t(ekHataAnahtari(hata))} rtl={rtl} /> : null}
    {!veri ? <Yukleniyor metin={t("onl.df.yukleniyor")} /> : <>
      <Cerceve ic={{ padding: 12, gap: 8 }}>
        <Text style={{ fontFamily: F.display, color: C.goldBright, fontSize: 12 }}>{t("onl.df.ozet")}</Text>
        <View style={{ flexDirection: yon(rtl), justifyContent: "space-between" }}>
          <Text style={{ color: C.parchmentDim, fontFamily: F.serif }}>{t("onl.df.para")}</Text>
          <Text style={{ color: C.parchment, fontFamily: F.display }}>{akce(veri.para)}</Text>
        </View>
        <View style={{ flexDirection: yon(rtl), justifyContent: "space-between" }}>
          <Text style={{ color: C.parchmentDim, fontFamily: F.serif }}>{t("onl.df.emanet")}</Text>
          <Text style={{ color: C.gold, fontFamily: F.display }}>{akce(veri.emanet.pazar + veri.emanet.ismarlama)}</Text>
        </View>
        <View style={{ flexDirection: yon(rtl), justifyContent: "space-between" }}>
          <Text style={{ color: C.parchmentDim, fontFamily: F.serif }}>{t("onl.df.gelir")}</Text>
          <Text style={{ color: C.sage, fontFamily: F.display }}>{akce(veri.toplam.gelir)}</Text>
        </View>
        <View style={{ flexDirection: yon(rtl), justifyContent: "space-between" }}>
          <Text style={{ color: C.parchmentDim, fontFamily: F.serif }}>{t("onl.df.gider")}</Text>
          <Text style={{ color: C.emberSoft, fontFamily: F.display }}>{akce(veri.toplam.gider)}</Text>
        </View>
        <View style={{ flexDirection: yon(rtl), justifyContent: "space-between" }}>
          <Text style={{ color: C.parchmentDim, fontFamily: F.serif }}>{t("onl.df.net")}</Text>
          <Text style={{ color: veri.toplam.net >= 0 ? C.sage : C.emberSoft, fontFamily: F.display }}>{akce(veri.toplam.net)}</Text>
        </View>
      </Cerceve>
      <Baslik2 metin={t("onl.df.aylar")} rtl={rtl} />
      {veri.aylar.length ? <View style={{ gap: 8 }}>{veri.aylar.map((x) => <Cerceve key={x.ay} ic={{ padding: 12, gap: 6 }}>
        <View style={{ flexDirection: yon(rtl), justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontFamily: F.display, color: C.goldBright }}>{applyParams(t("onl.df.ay"), [x.ay])}</Text>
          <Text style={{ fontFamily: F.display, color: x.net >= 0 ? C.sage : C.emberSoft }}>{akce(x.net)}</Text>
        </View>
        {x.kalemler.map((k, i) => <View key={k.k + i} style={{ flexDirection: yon(rtl), justifyContent: "space-between", gap: 8 }}>
          <Text style={{ flex: 1, fontFamily: F.serif, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.df.k." + k.k) === "onl.df.k." + k.k ? k.k : t("onl.df.k." + k.k)}</Text>
          <Text style={{ fontFamily: F.display, color: k.d >= 0 ? C.sage : C.emberSoft }}>{akce(k.d)}</Text>
        </View>)}
      </Cerceve>)}</View> : <BosKart icon="book" metin={t("onl.df.bos")} rtl={rtl} />}
      <CizgiDugme etiket={t("onl.df.guncelle")} icon="refresh-cw" rtl={rtl} kucuk onPress={() => void yukle()} />
    </>}
  </OnlineSayfa>;
}
export default function OnlineDefter() { return onlineEkranAcik() ? <OnlineKapisi><DefterEkran /></OnlineKapisi> : <OnlineYakinda />; }
