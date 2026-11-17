// Ustalar Levhası: kaliteyle teslim edilmiş gerçek oyuncu üretimleri ve ustalık sayacı.
import { useCallback, useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi, useOnline } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { BASMA_OLCEK, Bant, Cerceve, GeriDugme, Madalyon, geriGit, hiza, yon } from "../../lib/online/ui";
import { Baslik2, BosKart, OnlineSayfa, SayfaBasi, Yukleniyor, YerlesimBekle, sahneGorseli } from "../../lib/online/yasam-ui";
import { useEkonomiIstemci, type LevhaYaniti } from "../../lib/online/ekonomi-veri";
import { malAdi } from "../../lib/online/ekonomi-ui";
import { KademeAdetleri, KademeRozeti } from "../../lib/online/kademe-ui";
import { hap } from "../../lib/haptics";
import { DesignPressable as Pressable } from "../../lib/design-pressable";
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
    <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/karakter")} />
    <SayfaBasi ust={t("onl.eko.baslik")} baslik={t("onl.lv.baslik")} alt={t("onl.lv.alt")} rtl={rtl} />
    {hata && !veri ? <Bant metin={t(ekHataAnahtari(hata))} rtl={rtl} /> : null}
    {!veri ? <Yukleniyor metin={t("onl.lv.yukleniyor")} /> : <>
      <Baslik2 metin={t("onl.lv.ustalar")} rtl={rtl} />
      {veri.ustalar.length ? <View style={{ gap: 8 }}>{veri.ustalar.map((x, i) => {
        const ef = x.efsanevi ?? 0;
        const nd = x.nadide ?? 0;
        return <Pressable key={x.id} accessibilityRole="button" accessibilityLabel={[x.ad, ef ? applyParams(t("onl.es.lv.efsanevi"), [ef]) : null, nd ? applyParams(t("onl.es.lv.nadide"), [nd]) : null, applyParams(t("onl.lv.ustaSayim"), [x.saheser, x.ustun])].filter(Boolean).join(". ")}
          accessibilityHint={t("onl.es.lv.ustaIpucu")} onPress={() => { hap("tap"); router.push(`/online/oyuncu/${encodeURIComponent(x.id)}`); }}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? BASMA_OLCEK : 1 }] })}>
          <Cerceve aktif={ef > 0} ic={{ padding: 12, gap: 6, minHeight: 44 }}>
            <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 9 }}>
              <Madalyon icon={ef ? "crown" : "medal"} size={36} aktif={i === 0 || ef > 0} />
              <Text style={{ flex: 1, fontFamily: F.display, color: ef ? C.goldBright : C.parchment, fontSize: 14.5, textAlign: hiza(rtl) }}>{x.ad}</Text>
              <Text style={{ fontFamily: F.display, color: C.goldBright }}>{ef + nd + x.saheser + x.ustun}</Text>
            </View>
            {ef || nd ? <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
              {ef ? <KademeAdetleri adetler={[0, 0, 0, 0, 0, ef]} /> : null}
              {nd ? <KademeAdetleri adetler={[0, 0, 0, 0, nd]} /> : null}
            </View> : null}
            <Text style={{ fontFamily: F.serif, color: C.parchmentDim, fontSize: 12.5, textAlign: hiza(rtl) }}>{applyParams(t("onl.lv.ustaSayim"), [x.saheser, x.ustun])}</Text>
          </Cerceve>
        </Pressable>;
      })}</View> : <BosKart icon="award" metin={t("onl.lv.ustaBos")} rtl={rtl} />}
      <Baslik2 metin={t("onl.lv.kayitlar")} rtl={rtl} />
      {veri.kayitlar.length ? <View style={{ gap: 8 }}>{veri.kayitlar.map((x, i) => <Cerceve key={x.oyuncu.id + x.ay + i} ic={{ padding: 12, gap: 4 }}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
          <Madalyon icon="anvil" size={34} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, color: C.parchment, fontSize: 14, textAlign: hiza(rtl) }}>{x.oyuncu.ad}</Text>
            <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", alignItems: "center", gap: 6 }}>
              <Text style={{ fontFamily: F.serif, color: x.kademe >= 5 ? C.goldBright : C.parchmentDim, fontSize: 13, textAlign: hiza(rtl) }}>{malAdi(t, x.mal)}</Text>
              <KademeRozeti kademe={x.kademe} kucuk />
            </View>
          </View>
        </View>
        <Text style={{ fontFamily: F.serif, color: C.parchmentMuted, fontSize: 12 }}>{applyParams(t("onl.lv.kayitAy"), [x.ay])}</Text>
      </Cerceve>)}</View> : <BosKart icon="scroll" metin={t("onl.lv.kayitBos")} rtl={rtl} />}
    </>}
  </OnlineSayfa>;
}
export default function OnlineLevha() { return onlineEkranAcik() ? <OnlineKapisi><LevhaEkran /></OnlineKapisi> : <OnlineYakinda />; }
