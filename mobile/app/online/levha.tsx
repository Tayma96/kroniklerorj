// Ustalar Levhası: kaliteyle teslim edilmiş gerçek oyuncu üretimleri ve ustalık sayacı.
import { useCallback, useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi, useOnline } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { Bant, Cerceve, GeriDugme, Madalyon, geriGit, hiza, yon } from "../../lib/online/ui";
import { Baslik2, BosKart, OnlineSayfa, SayfaBasi, Yukleniyor, YerlesimBekle, sahneGorseli } from "../../lib/online/yasam-ui";
import { useEkonomiIstemci, type LevhaYaniti } from "../../lib/online/ekonomi-veri";
import { malAdi, kaliteAdi } from "../../lib/online/ekonomi-ui";
import { ekHataAnahtari, type EkHata } from "../../lib/online/ek-istemci";

function LevhaEkran() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const ist = useEkonomiIstemci();
  const y = useOnline().yerlesim;
  const [veri, setVeri] = useState<LevhaYaniti | null>(null);
  const [hata, setHata] = useState<EkHata | null>(null);
  const yukle = useCallback(async () => {
    const r = await ist.levha();
    if (r.ok) { setVeri(r.deger); setHata(null); } else setHata(r.hata);
  }, [ist]);
  useEffect(() => { void yukle(); }, [yukle]);
  if (!y) return <YerlesimBekle rtl={rtl} t={t} onGiris={() => router.replace("/online")} />;
  return <OnlineSayfa gorsel={sahneGorseli(y.yerlesim.tur, y.saat.mevsim)} oran={0.3} rtl={rtl} t={t}>
    <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/yasam")} />
    <SayfaBasi ust={t("onl.eko.baslik")} baslik={t("onl.lv.baslik")} alt={t("onl.lv.alt")} rtl={rtl} />
    {hata && !veri ? <Bant metin={t(ekHataAnahtari(hata))} rtl={rtl} /> : null}
    {!veri ? <Yukleniyor metin={t("onl.lv.yukleniyor")} /> : <>
      <Baslik2 metin={t("onl.lv.ustalar")} rtl={rtl} />
      {veri.ustalar.length ? <View style={{ gap: 8 }}>{veri.ustalar.map((x, i) => <Cerceve key={x.id} ic={{ padding: 12, gap: 4 }}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 9 }}>
          <Madalyon icon="award" size={36} aktif={i === 0} />
          <Text style={{ flex: 1, fontFamily: F.display, color: C.parchment, fontSize: 14.5, textAlign: hiza(rtl) }}>{x.ad}</Text>
          <Text style={{ fontFamily: F.display, color: C.goldBright }}>{x.saheser + x.ustun}</Text>
        </View>
        <Text style={{ fontFamily: F.serif, color: C.parchmentDim, fontSize: 12.5, textAlign: hiza(rtl) }}>{applyParams(t("onl.lv.ustaSayim"), [x.saheser, x.ustun])}</Text>
      </Cerceve>)}</View> : <BosKart icon="award" metin={t("onl.lv.ustaBos")} rtl={rtl} />}
      <Baslik2 metin={t("onl.lv.kayitlar")} rtl={rtl} />
      {veri.kayitlar.length ? <View style={{ gap: 8 }}>{veri.kayitlar.map((x, i) => <Cerceve key={x.oyuncu.id + x.ay + i} ic={{ padding: 12, gap: 4 }}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
          <Madalyon icon="anvil" size={34} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, color: C.parchment, fontSize: 14, textAlign: hiza(rtl) }}>{x.oyuncu.ad}</Text>
            <Text style={{ fontFamily: F.serif, color: C.parchmentDim, fontSize: 13, textAlign: hiza(rtl) }}>{malAdi(t, x.mal)} · {kaliteAdi(t, x.kademe)}</Text>
          </View>
        </View>
        <Text style={{ fontFamily: F.serif, color: C.parchmentMuted, fontSize: 12 }}>{applyParams(t("onl.lv.kayitAy"), [x.ay])}</Text>
      </Cerceve>)}</View> : <BosKart icon="scroll" metin={t("onl.lv.kayitBos")} rtl={rtl} />}
    </>}
  </OnlineSayfa>;
}
export default function OnlineLevha() { return onlineEkranAcik() ? <OnlineKapisi><LevhaEkran /></OnlineKapisi> : <OnlineYakinda />; }
