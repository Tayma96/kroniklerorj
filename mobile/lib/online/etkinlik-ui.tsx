// Canlı etkinlik bandı (Yaşam ekranı, "Şimdi" rehberinin üstünde). Yönetici bir etkinlik başlatınca bir sonraki yerleşim
// yanıtında belirir, durdurunca kaybolur. Her etkinlik kendi simgesi, adı, ne değiştirdiği, kalan süresi ve bir kez
// katılım düğmesiyle gelir. Katılmak isteğe bağlıdır: kaçıran bir şey kaybetmez (metin bunu söyler).
import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../i18n";
import { C, F } from "../theme";
import { GameIcon } from "../icons";
import { hap } from "../haptics";
import { useOnline } from "./durum";
import { istekNoUret } from "./depo";
import { ekHataAnahtari, type EkHata } from "./ek-istemci";
import { istekTekrarMi } from "./hata";
import { malAdi } from "./ekonomi-ui";
import { useSunucuFarki } from "./barinma-veri";
import { useEtkinlikIstemci, yerlesimEtkinlikleri, type EtkinlikGorunumu } from "./etkinlik-veri";
import { Bant, Cerceve, CizgiDugme, giris, hiza, yon } from "./ui";
import { Baslik2, Rozet } from "./yasam-ui";

const DK = 60_000;
const SA = 60 * DK;

function kalanMetni(t: (k: string) => string, e: EtkinlikGorunumu, simdi: number): string {
  if (e.bit === null) return t("onl.etk.suresiz");
  const kalan = Math.max(0, e.bit - simdi);
  const gun = Math.floor(kalan / (24 * SA));
  if (gun >= 1) return applyParams(t("onl.etk.kalanGun"), [gun, Math.floor((kalan % (24 * SA)) / SA)]);
  return applyParams(t("onl.etk.kalan"), [Math.floor(kalan / SA), Math.max(1, Math.ceil((kalan % SA) / DK))]);
}

function EtkinlikSatiri({ e, simdi, bekliyor, onKatil }: { e: EtkinlikGorunumu; simdi: number; bekliyor: boolean; onKatil: () => void }) {
  const { t, rtl } = useI18n();
  const o = e.odul;
  const odul = [
    applyParams(t("onl.etk.odulNam"), [o.namN, t("onl.nam." + o.nam)]),
    applyParams(t("onl.etk.odulGonul"), [o.gonul]),
    ...(o.mal ? [`${o.mal.adet} × ${malAdi(t, o.mal.mal)}`] : []),
  ].join(" · ");
  return <View style={{ gap: 6 }}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.gold, backgroundColor: "rgba(14,10,6,0.55)" }}>
        <GameIcon name={e.ikon} size={18} color={C.goldBright} />
      </View>
      <View style={{ flex: 1 }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 15, color: C.parchment, textAlign: hiza(rtl) }}>{t(`onl.etk.${e.tur}.ad`)}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 12.5, color: C.gold, textAlign: hiza(rtl) }}>{kalanMetni(t, e, simdi)}</Text>
      </View>
      {e.katildin ? <Rozet icon="medal" metin={t("onl.etk.katildin")} renk={C.sage} /> : null}
    </View>
    <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t(`onl.etk.${e.tur}.ozet`)}</Text>
    {!e.katildin ? <>
      <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>
        {applyParams(t("onl.etk.odul"), [odul, e.takat])}
      </Text>
      {o.meslekCarpani > 1 ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.etk.meslek")}</Text> : null}
      {e.dert ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.etk.dert")}</Text> : null}
      <CizgiDugme etiket={t("onl.etk.katil")} icon={e.ikon} rtl={rtl} kucuk kapali={bekliyor} onPress={onKatil} />
    </> : null}
  </View>;
}

export function EtkinlikBandi() {
  const { t, rtl } = useI18n();
  const o = useOnline();
  const ist = useEtkinlikIstemci();
  const fark = useSunucuFarki();
  const [simdi, setSimdi] = useState(() => Date.now());
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<EkHata | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const liste = yerlesimEtkinlikleri(o.yerlesim);
  const var_ = liste.length > 0;
  useEffect(() => {
    if (!var_) return;
    const id = setInterval(() => setSimdi(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [var_]);
  if (!var_) return null;

  const katil = async (e: EtkinlikGorunumu) => {
    setBekliyor(true); setHata(null); setBilgi(null);
    const r = await ist.katil({ id: e.id, istekNo: istekNoUret() });
    setBekliyor(false);
    if (r.ok || istekTekrarMi(r.hata)) {
      hap("success");
      setBilgi(applyParams(t("onl.etk.katildinBilgi"), [t(`onl.etk.${e.tur}.ad`)]));
    } else {
      hap("error");
      setHata(r.hata);
    }
    void o.yerlesimYukle(true);
  };

  return <Animated.View entering={giris(100)}>
    <Baslik2 metin={t("onl.etk.baslik")} rtl={rtl} sag={<Rozet icon="star" metin={String(liste.length)} renk={C.goldBright} />} />
    <Cerceve aktif ic={{ padding: 14, gap: 14 }}>
      {liste.map((e, i) => <View key={e.id} style={i > 0 ? { borderTopWidth: 1, borderTopColor: "rgba(201,162,92,0.25)", paddingTop: 12 } : undefined}>
        <EtkinlikSatiri e={e} simdi={simdi + fark} bekliyor={bekliyor} onKatil={() => { void katil(e); }} />
      </View>)}
      <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.etk.kaybetmez")}</Text>
      {bilgi ? <Bant tur="bilgi" metin={bilgi} rtl={rtl} /> : null}
      {hata ? <Bant metin={t(ekHataAnahtari(hata))} rtl={rtl} /> : null}
    </Cerceve>
  </Animated.View>;
}
