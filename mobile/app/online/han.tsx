// Han (Faz 10, GET /v1/han): yerleşimin hanı (şehirde han, kasabada küçük han, köyde menzil), atmosferi ve masalar:
// doluluk, ayakta dinleyici, sıra. Sıralama sunucunun masa numarasıdır; harcama sırayı ya da koltuğu etkilemez.
import { useCallback, useEffect, useState } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { hap } from "../../lib/haptics";
import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi, useOnline } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { Bant, Cerceve, CizgiDugme, GeriDugme, Madalyon, geriGit, giris, hiza, yon } from "../../lib/online/ui";
import { Baslik2, Rozet, SatirOku, SayfaBasi, Yukleniyor } from "../../lib/online/yasam-ui";
import { ekHataAnahtari, type EkHata } from "../../lib/online/ek-istemci";
import { useHanIstemci, IKRAMLAR, type HanOzeti, type MasaOzeti } from "../../lib/online/han-veri";
import { HanSayfa, IKRAM_IKON, Not } from "../../lib/online/han-ui";
import type { Dil } from "../../lib/online/protokol";

function MasaKarti({ m, koltuk, rtl, t, sira, onAc }: { m: MasaOzeti; koltuk: number; rtl: boolean; t: (k: string) => string; sira: number; onAc: () => void }) {
  const dolu = m.oturan >= koltuk;
  const kapali = !m.ayar.acik;
  const durum = kapali ? t("onl.han.masaKapali") : dolu ? t("onl.han.masaDolu") : m.oturan ? t("onl.han.masaYerVar") : t("onl.han.masaBos");
  const alt = [applyParams(t("onl.han.oturan"), [m.oturan, koltuk]), applyParams(t("onl.han.ayakta"), [m.ayakta]), ...(m.sira ? [applyParams(t("onl.han.sirada"), [m.sira])] : [])].join(" · ");
  return <Animated.View entering={giris(Math.min(sira, 8) * 40)}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${applyParams(t("onl.han.masaNo"), [m.no])}. ${durum}. ${alt}`} accessibilityState={{ disabled: kapali }} disabled={kapali}
      onPress={() => { hap("tap"); onAc(); }} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }], opacity: kapali ? 0.55 : 1 })}>
      <Cerceve aktif={!dolu && m.oturan > 0 && !kapali} ic={{ flexDirection: yon(rtl), alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 12, minHeight: 76 }}>
        <Madalyon icon="flame" size={42} aktif={!dolu && m.oturan > 0 && !kapali} />
        <View style={{ flex: 1, gap: 5, minWidth: 0 }}>
          <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchment }}>{applyParams(t("onl.han.masaNo"), [m.no])}</Text>
            <Rozet metin={durum} renk={kapali ? C.parchmentMuted : dolu ? C.ember : m.oturan ? C.goldBright : C.sage} dolu={dolu && !kapali} />
          </View>
          <View accessible={false} style={{ flexDirection: yon(rtl), gap: 5 }}>
            {Array.from({ length: koltuk }, (_, i) => <View key={i} style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: C.gold, backgroundColor: i < m.oturan ? C.goldBright : "transparent" }} />)}
          </View>
          <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>{alt}</Text>
        </View>
        <SatirOku rtl={rtl} />
      </Cerceve>
    </Pressable>
  </Animated.View>;
}

function HanEkran() {
  const router = useRouter();
  const { t, rtl, lang } = useI18n();
  const dar = useWindowDimensions().width < 360;
  const o = useOnline();
  const istemci = useHanIstemci();
  const [han, setHan] = useState<HanOzeti | null>(null);
  const [hata, setHata] = useState<EkHata | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    const s = await istemci.han(lang as Dil);
    setYukleniyor(false);
    if (s.ok) { setHan(s.deger); setHata(null); } else setHata(s.hata);
  }, [istemci, lang]);
  useEffect(() => { if (o.profil) void yukle(); }, [o.profil?.hesapId, yukle]); // eslint-disable-line react-hooks/exhaustive-deps

  const atmosfer = han ? t("onl.han.atmosfer." + han.han.tur) : t("onl.han.atmosfer.han");
  return <HanSayfa>
    <View style={{ flexDirection: yon(rtl), alignItems: "center" }}>
      <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/yasam")} />
    </View>
    <View style={{ marginTop: 8 }}>
      <SayfaBasi ust={han?.yerlesim.ad ?? o.yerlesim?.yerlesim.ad ?? t("onl.han.ust")} baslik={han ? han.han.ad : t("onl.han.baslik")} alt={atmosfer} rtl={rtl} />
    </View>

    {!o.profil && o.hazir ? <View style={{ marginTop: 16 }}><Bant tur="bilgi" metin={t("onl.v.profilYok")} rtl={rtl} eylem={t("onl.p.giriseDon")} onEylem={() => router.replace("/online")} /></View> : null}

    <Baslik2 metin={t("onl.han.masalar")} rtl={rtl} sag={han ? <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>{han.masalar.length}</Text> : undefined} />
    {hata && !han ? <Bant metin={t(ekHataAnahtari(hata))} rtl={rtl} eylem={t("onl.yenidenDene")} onEylem={() => { void yukle(); }} />
      : !han ? <Yukleniyor metin={t("onl.han.yukleniyor")} />
      : <View style={{ gap: 10 }}>
        {han.masalar.map((m, i) => <MasaKarti key={m.no} m={m} koltuk={han.koltuk} rtl={rtl} t={t} sira={i} onAc={() => router.push(`/online/han/${m.no}`)} />)}
      </View>}
    {han ? <View style={{ marginTop: 10 }}><CizgiDugme etiket={t("onl.han.yenile")} icon="hourglass" rtl={rtl} kucuk kapali={yukleniyor} onPress={() => { void yukle(); }} /></View> : null}

    <Baslik2 metin={t("onl.han.menu")} rtl={rtl} />
    <Cerceve ic={{ padding: 12, gap: 10 }}>
      <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 8 }}>
        {IKRAMLAR.map((id) => {
          const fiyat = han?.menu?.find((x) => x.id === id)?.fiyat;
          return <View key={id} accessible accessibilityLabel={`${t("onl.han.ikram." + id)}${fiyat !== undefined ? ", " + applyParams(t("onl.han.akce"), [fiyat]) : ""}`}
            style={{ flexDirection: yon(rtl), alignItems: "center", gap: 6, paddingHorizontal: 10, minHeight: 36, borderRadius: 18, borderWidth: 1, borderColor: "rgba(201,162,78,0.55)", backgroundColor: "rgba(14,10,6,0.6)", flexBasis: dar ? "100%" : "47%", flexGrow: 1 }}>
            <GameIcon name={IKRAM_IKON[id]} size={15} color={C.goldBright} />
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.han.ikram." + id)}</Text>
            {fiyat !== undefined ? <Text style={{ fontFamily: F.display, fontSize: 12.5, color: C.goldBright }}>{applyParams(t("onl.han.akce"), [fiyat])}</Text> : null}
          </View>;
        })}
      </View>
      <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.han.menuNot")}</Text>
    </Cerceve>

    <View style={{ marginTop: 16, gap: 8 }}>
      <Not metin={t("onl.han.notSohbet")} rtl={rtl} icon="speaker" />
      <Not metin={t("onl.han.notKayit")} rtl={rtl} icon="scroll-open" />
    </View>
  </HanSayfa>;
}

export default function OnlineHan() {
  return onlineEkranAcik() ? <OnlineKapisi><HanEkran /></OnlineKapisi> : <OnlineYakinda />;
}
