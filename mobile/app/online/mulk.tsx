// Mülklerim ve mülk edinme (Faz 12; GET /v1/mulk, POST /v1/mulk/edin): yerleşimin han, dükkân ve atölye yuvaları
// (boş/sahipli), sahip olduklarım, çalıştıklarım, iş teklifleri, bana yapılan devir teklifleri ve bekleyen transferler.
// Edinim şartı açıkça yazılır: akçe + (nam eşiği ya da lonca kademesi) + yaş; tek hamlede yalnız parayla alınmaz.
import { useCallback, useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { hap } from "../../lib/haptics";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi, useOnline } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { AltinDugme, Bant, Cerceve, CizgiDugme, GeriDugme, Madalyon, geriGit, giris, hiza, yon } from "../../lib/online/ui";
import { Baslik2, BosKart, Hap, OnlineSayfa, Rozet, SayfaBasi, YerlesimBekle, Yukleniyor, sahneGorseli } from "../../lib/online/yasam-ui";
import { ekHataAnahtari, type EkHata } from "../../lib/online/ek-istemci";
import { istekNoUret } from "../../lib/online/depo";
import { MULK_IKON, MULK_TURLERI, isletmeYolu, useMulkIstemci, type EdinimSarti, type MulkListesi, type MulkTuru, type Yuva } from "../../lib/online/mulk-veri";

type Ceviri = (k: string) => string;
const SEVIYE = ["mutevazi", "gelisen", "taninmis", "prestijli", "simge"];

function SartListesi({ s, t, rtl }: { s: EdinimSarti; t: Ceviri; rtl: boolean }) {
  const satir = (tamam: boolean, metin: string) => <View key={metin} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
    <GameIcon name={tamam ? "medal" : "hourglass"} size={14} color={tamam ? C.sage : C.ember} />
    <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: tamam ? C.parchment : C.parchmentDim, textAlign: hiza(rtl) }}>{metin}</Text>
  </View>;
  const namTamam = s.nam >= s.namEsigi || s.loncaKademe >= s.loncaEsigi;
  return <View accessible style={{ gap: 5 }}>
    {satir(!s.eksik.includes("akce"), applyParams(t("onl.mk.s.akce"), [s.fiyat, s.akce]))}
    {satir(namTamam, applyParams(t("onl.mk.s.nam"), [s.nam, s.namEsigi, t("onl.kd." + ["cirak", "kalfa", "usta", "pir"][Math.max(0, Math.min(3, s.loncaEsigi))])]))}
    {satir(!s.eksik.includes("yas"), applyParams(t("onl.mk.s.yas"), [s.yasEsigi, s.yas]))}
  </View>;
}

function YuvaKarti({ x, m, benId, t, rtl, bekliyor, hata, onEdin, onAc }: { x: Yuva; m: MulkListesi; benId: string; t: Ceviri; rtl: boolean; bekliyor: boolean; hata: string | null; onEdin: () => void; onAc: (devir?: boolean, teklif?: boolean) => void }) {
  const benim = x.sahip?.id === benId || m.benim.includes(x.isletme);
  const calisiyor = m.calistigim.includes(x.isletme);
  const teklif = m.teklifler.includes(x.isletme);
  const s = m.edinimSarti[x.tur];
  const sinirDolu = m.sinir.sahip >= m.sinir.enCok;
  return <Cerceve aktif={benim || !!x.devirTeklifi || teklif} ic={{ padding: 12, gap: 9 }}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
      <Madalyon icon={MULK_IKON[x.tur]} size={44} aktif={benim} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: 15, lineHeight: 20, color: C.parchment, textAlign: hiza(rtl) }}>{x.durum === "sahipli" && x.ad ? x.ad : applyParams(t("onl.mk.yuvaAd"), [t("onl.mk.tur." + x.tur), x.no])}</Text>
        <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchmentDim, textAlign: hiza(rtl) }}>
          {x.durum === "bos" ? t("onl.mk.bos") : benim ? t("onl.mk.senin") : applyParams(t("onl.isl.sahibi"), [x.sahip?.ad ?? ""])}
        </Text>
      </View>
    </View>
    <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
      {x.durum === "sahipli" ? <Rozet icon="trophy" metin={t("onl.isl.sv." + (SEVIYE[x.seviye ?? 0] ?? "mutevazi"))} /> : <Rozet icon="coins" metin={applyParams(t("onl.is.akce"), [x.fiyat ?? s.fiyat])} renk={C.goldBright} />}
      {calisiyor ? <Rozet icon="family" metin={t("onl.mk.calisiyorsun")} renk={C.sage} dolu /> : null}
      {teklif ? <Rozet icon="scroll" metin={t("onl.mk.isTeklifi")} renk={C.goldBright} dolu /> : null}
      {x.devirTeklifi ? <Rozet icon="crown" metin={applyParams(t("onl.mk.devirTeklifi"), [x.devirTeklifi.fiyat])} renk={C.goldBright} dolu /> : null}
    </View>
    {x.durum === "bos" ? <>
      <SartListesi s={s} t={t} rtl={rtl} />
      {hata ? <Bant metin={hata} rtl={rtl} /> : null}
      <AltinDugme etiket={applyParams(t("onl.mk.edin"), [s.fiyat])} icon="house" rtl={rtl} kapali={!s.uygun || sinirDolu} bekliyor={bekliyor} onPress={onEdin}
        erisim={`${applyParams(t("onl.mk.edin"), [s.fiyat])}${!s.uygun ? " · " + t("onl.mk.sartEksik") : ""}`} />
      {sinirDolu ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{applyParams(t("onl.mk.sinirDolu"), [m.sinir.enCok])}</Text> : null}
    </> : <View style={{ gap: 8 }}>
      {x.devirTeklifi ? <AltinDugme etiket={t("onl.mk.devirIncele")} icon="crown" rtl={rtl} onPress={() => onAc(true)} /> : null}
      {teklif ? <AltinDugme etiket={t("onl.mk.teklifIncele")} icon="scroll" rtl={rtl} onPress={() => onAc(false, true)} /> : null}
      <CizgiDugme etiket={t(benim || calisiyor ? "onl.mk.panel" : "onl.mk.vitrin")} icon="banner" rtl={rtl} kucuk onPress={() => onAc()} />
    </View>}
  </Cerceve>;
}

function MulkEkran() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const o = useOnline();
  const ist = useMulkIstemci();
  const y = o.yerlesim;
  const sahte = o.oturum?.tur === "gelistirici";
  const [m, setM] = useState<MulkListesi | null>(null);
  const [yukHata, setYukHata] = useState<EkHata | null>(null);
  const [hata, setHata] = useState<{ tur: MulkTuru; metin: string } | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);

  const yukle = useCallback(async () => {
    const r = await ist.liste();
    if (r.ok) { setM(r.deger); setYukHata(null); } else setYukHata(r.hata);
  }, [ist]);
  useEffect(() => { void yukle(); }, [yukle]);
  if (!y) return <YerlesimBekle rtl={rtl} t={t} onGiris={() => router.replace("/online")} />;

  const edin = async (tur: MulkTuru) => {
    setBekliyor(true); setHata(null); setBilgi(null);
    const r = await ist.edin({ tur, istekNo: istekNoUret() });
    setBekliyor(false);
    if (r.ok) {
      hap("success");
      setBilgi(applyParams(t(r.deger.transferDurumu === "bekliyor" ? "onl.mk.edinildiBekliyor" : "onl.mk.edinildi"), [t("onl.mk.tur." + tur), r.deger.edinim.fiyat]));
      await yukle();
      if (!sahte) void o.yerlesimYukle(true);
    } else { hap("error"); setHata({ tur, metin: t(ekHataAnahtari(r.hata)) }); }
  };
  const ac = (id: string, devir?: boolean, teklif?: boolean) => router.push(teklif ? `${isletmeYolu(id)}?teklif=1` : isletmeYolu(id, devir));

  return <OnlineSayfa gorsel={sahneGorseli(y.yerlesim.tur, y.saat.mevsim)} oran={0.3} rtl={rtl} t={t}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 6 }}>
      <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/yasam")} />
      <View style={{ flex: 1 }} />
      <Hap icon="coins" metin={String(y.ben.para)} erisim={applyParams(t("onl.ya.paraErisim"), [y.ben.para])} />
    </View>
    <View style={{ marginTop: 8 }}>
      <SayfaBasi ust={y.yerlesim.ad} baslik={t("onl.mk.baslik")} alt={t("onl.mk.alt")} rtl={rtl} />
    </View>
    {bilgi ? <View style={{ marginTop: 12 }}><Bant metin={bilgi} rtl={rtl} tur="bilgi" /></View> : null}
    {yukHata && !m ? <View style={{ marginTop: 14 }}><Bant metin={t(ekHataAnahtari(yukHata))} rtl={rtl} eylem={t("onl.yenidenDene")} onEylem={() => { void yukle(); }} /></View>
      : !m ? <Yukleniyor metin={t("onl.mk.yukleniyor")} /> : <>
        <View style={{ marginTop: 14, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,162,78,0.3)", backgroundColor: "rgba(14,10,6,0.82)", gap: 4 }}>
          <Text style={{ fontFamily: F.display, fontSize: 13, color: C.goldBright, textAlign: hiza(rtl) }}>{applyParams(t("onl.mk.sinir"), [m.sinir.sahip, m.sinir.enCok])}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.mk.kural")}</Text>
        </View>
        {m.bekleyen.length ? <View style={{ marginTop: 10 }}><Bant metin={applyParams(t("onl.mk.bekleyen"), [m.bekleyen.length])} rtl={rtl} tur="bilgi" /></View> : null}
        {MULK_TURLERI.map((tur) => {
          const liste = m.yuvalar.filter((x) => x.tur === tur);
          if (!liste.length) return null;
          return <View key={tur}>
            <Baslik2 metin={t("onl.mk.grup." + tur)} rtl={rtl} sag={<Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>{liste.length}</Text>} />
            <View style={{ gap: 10 }}>
              {liste.map((x, n) => <Animated.View key={x.isletme} entering={giris(n * 40)}>
                <YuvaKarti x={x} m={m} benId={y.ben.id} t={t} rtl={rtl} bekliyor={bekliyor} hata={hata?.tur === x.tur && x.durum === "bos" ? hata.metin : null}
                  onEdin={() => { void edin(x.tur); }} onAc={(d, tk) => ac(x.isletme, d, tk)} />
              </Animated.View>)}
            </View>
          </View>;
        })}
        {!m.yuvalar.length ? <BosKart icon="house" metin={t("onl.mk.yuvaYok")} rtl={rtl} /> : null}
      </>}
  </OnlineSayfa>;
}

export default function OnlineMulk() {
  return onlineEkranAcik() ? <OnlineKapisi><MulkEkran /></OnlineKapisi> : <OnlineYakinda />;
}
