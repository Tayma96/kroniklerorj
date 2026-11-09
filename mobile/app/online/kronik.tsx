// Yerleşim kroniği (Faz 7, GET /v1/kronik?imlec=): ölüm, devir, oyuncu evliliği ve oyuncu hanesindeki doğum kalıcı
// satırlardır; sayfa sayfa (imleçle) okunur, budanmaz. Satır metni sunucunun {k, p} özetinden çevrilir.
import { useCallback, useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { Bant, Cerceve, CizgiDugme, GeriDugme, geriGit, giris, hiza, yon } from "../../lib/online/ui";
import { BosKart, OnlineSayfa, SayfaBasi, YerlesimBekle, Yukleniyor, useYerlesimEkrani } from "../../lib/online/yasam-ui";
import { ayTakvimi, ekHataAnahtari, type EkHata } from "../../lib/online/ek-istemci";
import { ozetYaz } from "../../lib/online/metin";
import { useHanedanIstemci, type KronikSatiri } from "../../lib/online/hanedan-veri";
import type { Dil } from "../../lib/online/protokol";
import type { Lang } from "../../lib/locale-data";

const GORSEL = require("../../assets/arka/medrese.jpg");
const TUR_IKON: Record<string, string> = { olum: "tombstone", devir: "banner", evlilik: "ring", dogum: "baby" };

function KronikEkran() {
  const router = useRouter();
  const { t, rtl, lang } = useI18n();
  const o = useYerlesimEkrani();
  const y = o.yerlesim;
  const istemci = useHanedanIstemci();
  const [satirlar, setSatirlar] = useState<KronikSatiri[] | null>(null);
  const [imlec, setImlec] = useState(0);
  const [dahaVar, setDahaVar] = useState(false);
  const [hata, setHata] = useState<EkHata | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const yukle = useCallback(async (devam: boolean) => {
    setYukleniyor(true);
    const s = await istemci.kronik(devam ? imlec : 0, lang as Dil);
    setYukleniyor(false);
    if (!s.ok) { setHata(s.hata); return; }
    setHata(null);
    setSatirlar((x) => (devam && x ? [...x, ...s.deger.kronik.filter((r) => !x.some((q) => q.sira === r.sira))] : s.deger.kronik));
    setImlec(s.deger.imlec);
    setDahaVar(s.deger.dahaVar);
  }, [istemci, imlec, lang]);
  useEffect(() => { if (y) void yukle(false); }, [!!y, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!y) return <YerlesimBekle rtl={rtl} t={t} onGiris={() => router.replace("/online")} />;
  return <OnlineSayfa gorsel={GORSEL} oran={0.3} rtl={rtl} t={t}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center" }}>
      <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/hanedan")} />
    </View>
    <View style={{ marginTop: 8 }}>
      <SayfaBasi ust={y.yerlesim.ad} baslik={t("onl.kr.baslik")} alt={t("onl.kr.alt")} rtl={rtl} />
    </View>
    <View style={{ marginTop: 14 }}>
      {hata && !satirlar ? <Bant metin={t(ekHataAnahtari(hata))} rtl={rtl} eylem={t("onl.yenidenDene")} onEylem={() => { void yukle(false); }} />
        : !satirlar ? <Yukleniyor metin={t("onl.kr.yukleniyor")} />
        : !satirlar.length ? <BosKart icon="book" metin={t("onl.kr.bos")} rtl={rtl} />
        : <Cerceve ic={{ paddingVertical: 4 }}>
          {satirlar.map((s, i) => {
            const tk = ayTakvimi(s.ay, y.saat);
            const metin = ozetYaz(s.ozet, t, lang as Lang);
            return <Animated.View key={s.sira} entering={giris(Math.min(i, 10) * 25)} accessible accessibilityLabel={`${applyParams(t("onl.kr.tarih"), [tk.yil, tk.ay])}. ${metin}`}
              style={{ flexDirection: yon(rtl), gap: 10, alignItems: "flex-start", paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: "rgba(201,162,78,0.14)" }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: "rgba(201,162,78,0.5)", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)" }}>
                <GameIcon name={TUR_IKON[s.tur] ?? "scroll"} size={15} color={s.tur === "olum" ? C.parchmentMuted : C.goldBright} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 1, color: C.gold, textAlign: hiza(rtl) }}>{applyParams(t("onl.kr.tarih"), [tk.yil, tk.ay])}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: C.parchment, textAlign: hiza(rtl) }}>{metin}</Text>
              </View>
            </Animated.View>;
          })}
        </Cerceve>}
      {hata && satirlar ? <View style={{ marginTop: 10 }}><Bant metin={t(ekHataAnahtari(hata))} rtl={rtl} /></View> : null}
      {dahaVar ? <View style={{ marginTop: 12 }}><CizgiDugme etiket={t("onl.kr.devami")} icon="scroll-open" rtl={rtl} kucuk kapali={yukleniyor} onPress={() => { void yukle(true); }} /></View> : null}
      {satirlar?.length ? <Text style={{ marginTop: 10, fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.kr.not")}</Text> : null}
    </View>
  </OnlineSayfa>;
}

export default function OnlineKronik() {
  return onlineEkranAcik() ? <OnlineKapisi><KronikEkran /></OnlineKapisi> : <OnlineYakinda />;
}
