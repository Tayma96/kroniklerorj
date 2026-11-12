// Debdebe mağazası ve ücretsiz Dene sahneleri. Gerçek satın alma, mağaza makbuz doğrulaması bağlanana kadar kapalıdır.
import { useCallback, useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi, useOnline } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { Bant, Cerceve, CizgiDugme, GeriDugme, Madalyon, geriGit, hiza, yon } from "../../lib/online/ui";
import { Baslik2, BosKart, Hap, OnlineSayfa, SayfaBasi, Yukleniyor, YerlesimBekle, sahneGorseli } from "../../lib/online/yasam-ui";
import { useDebdebeIstemci, type DebdebeGorunumu, type DenePaketi, type DebdebeUrun } from "../../lib/online/debdebe-veri";
import { ekHataAnahtari } from "../../lib/online/ek-istemci";
import { hap } from "../../lib/haptics";
import { istekNoUret } from "../../lib/online/depo";

const SAHNELER = ["hanMasasi", "sehirKapisi", "profilKarti"] as const;
function urunAdi(t: (k: string) => string, id: string) {
  const k = "onl.db.urun." + id;
  const v = t(k);
  return v === k ? id.replaceAll("_", " ") : v;
}
function sahneAdi(t: (k: string) => string, id: string) {
  return t("onl.db.sahne." + id);
}
function DebdebeEkran() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const o = useOnline();
  const y = o.yerlesim;
  const ist = useDebdebeIstemci();
  const [veri, setVeri] = useState<DebdebeGorunumu | null>(null);
  const [secili, setSecili] = useState("");
  const [dene, setDene] = useState<DenePaketi | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [sahne, setSahne] = useState<(typeof SAHNELER)[number]>("hanMasasi");
  const yukle = useCallback(async () => {
    const r = await ist.oku();
    if (!r.ok) { setHata(t(ekHataAnahtari(r.hata))); return; }
    setVeri(r.deger); setHata(null);
    setSecili((onceki) => onceki && r.deger.katalog.some((x) => x.id === onceki) ? onceki : r.deger.katalog[0]?.id ?? "");
  }, [ist, t]);
  useEffect(() => { void yukle(); }, [yukle]);
  const deneAc = async (id: string) => {
    setSecili(id); setDene(null); setHata(null); setYukleniyor(true);
    const r = await ist.dene(id);
    setYukleniyor(false);
    if (!r.ok) { setHata(t(ekHataAnahtari(r.hata))); hap("error"); return; }
    setDene(r.deger); setSahne(r.deger.sahneler[0]?.sahne ?? "hanMasasi"); hap("success");
  };
  const kusan = async (hedefUrun: DebdebeUrun) => {
    if (!hedefUrun.yuva) return;
    setYukleniyor(true); setHata(null); setBilgi(null);
    const r = await ist.kusan({ yuva: hedefUrun.yuva, urun: hedefUrun.id, sira: 0, istekNo: istekNoUret() });
    setYukleniyor(false);
    if (!r.ok) { setHata(t(ekHataAnahtari(r.hata))); hap("error"); return; }
    setBilgi(t("onl.db.kusandi")); await yukle(); hap("success");
  };
  const levha = async () => {
    if (!veri) return;
    setYukleniyor(true); setHata(null);
    const r = await ist.levhaGorunur(!veri.ben.levhaGorunur);
    setYukleniyor(false);
    if (!r.ok) { setHata(t(ekHataAnahtari(r.hata))); return; }
    setVeri({ ...veri, ben: { ...veri.ben, levhaGorunur: r.deger.levhaGorunur } });
    setBilgi(t("onl.db.levhaKaydedildi"));
  };
  if (!y) return <YerlesimBekle rtl={rtl} t={t} onGiris={() => router.replace("/online")} />;
  return <OnlineSayfa gorsel={sahneGorseli(y.yerlesim.tur, y.saat.mevsim)} oran={0.3} rtl={rtl} t={t}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
      <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/yasam")} />
      <View style={{ flex: 1 }} />
      <Hap icon="coins" metin={String(y.ben.para)} erisim={applyParams(t("onl.ya.paraErisim"), [y.ben.para])} />
    </View>
    <SayfaBasi ust={t("onl.db.ust")} baslik={t("onl.db.baslik")} alt={t("onl.db.alt")} rtl={rtl} />
    {hata ? <Bant metin={hata} rtl={rtl} eylem={t("onl.yenidenDene")} onEylem={() => void yukle()} /> : null}
    {bilgi ? <Bant tur="bilgi" metin={bilgi} rtl={rtl} /> : null}
    {!veri ? <Yukleniyor metin={t("onl.db.yukleniyor")} /> : <>
      <Cerceve ic={{ padding: 12, gap: 8 }}>
        <View style={{ flexDirection: yon(rtl), justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontFamily: F.display, color: C.goldBright }}>{veri.ben.seviye ? t("onl.db.seviye." + veri.ben.seviye) : t("onl.db.seviye.yok")}</Text>
          <Text style={{ fontFamily: F.serif, color: C.parchmentDim }}>{applyParams(t("onl.db.sahip"), [veri.ben.sahip.length])}</Text>
        </View>
        <Text style={{ fontFamily: F.serif, color: C.parchmentDim, fontSize: 12.5 }}>{veri.ben.ayan.etkin ? t("onl.db.ayanEtkin") : t("onl.db.ayanYok")}</Text>
        <Text style={{ fontFamily: F.serif, color: C.parchmentDim, fontSize: 12.5 }}>{applyParams(t("onl.db.sezonOzet"), [veri.sezon.seviye, veri.sezon.enYuksek, veri.sezon.puan])}</Text>
        <Text style={{ fontFamily: F.serif, color: C.parchmentDim, fontSize: 12.5 }}>{applyParams(t("onl.db.gunluk"), [veri.sezon.bugun.kazanilan, veri.sezon.bugun.tavan])}</Text>
        <CizgiDugme etiket={veri.ben.levhaGorunur ? t("onl.db.levhaKapat") : t("onl.db.levhaAc")} icon="award" rtl={rtl} kucuk kapali={yukleniyor} onPress={() => void levha()} />
      </Cerceve>
      <Baslik2 metin={t("onl.db.katalog")} rtl={rtl} sag={<Text style={{ color: C.gold }}>{veri.katalog.length}</Text>} />
      <View style={{ gap: 8 }}>
        {veri.katalog.map((x) => {
          const seciliMi = x.id === secili;
          const sahipMi = veri.ben.sahip.includes(x.id);
          const stok = veri.ben.stok[x.id] ?? 0;
          return <Cerceve key={x.id} aktif={seciliMi} ic={{ padding: 11, gap: 7 }}>
            <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
              <Madalyon icon={x.tur === "ayan" ? "crown" : x.tur === "sezon" ? "book-open" : x.tur === "armagan" ? "gift" : "sparkles"} size={36} aktif={sahipMi} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: F.display, color: C.parchment, fontSize: 14, textAlign: hiza(rtl) }}>{urunAdi(t, x.id)}</Text>
                <Text style={{ fontFamily: F.serif, color: C.parchmentDim, fontSize: 12 }}>{t("onl.db.tur." + x.tur)}{x.yuva ? " · " + t("onl.db.yuva." + x.yuva) : ""}</Text>
              </View>
              {sahipMi ? <Text style={{ fontFamily: F.display, color: C.sage, fontSize: 11 }}>{t("onl.db.sahipOl")}</Text> : stok > 0 ? <Text style={{ fontFamily: F.display, color: C.gold }}>{applyParams(t("onl.db.stok"), [stok])}</Text> : null}
            </View>
            {x.fiyat ? <Text style={{ fontFamily: F.serif, color: C.gold, fontSize: 12 }}>{applyParams(t("onl.db.fiyatReferans"), [x.fiyat.usd.toFixed(2), x.fiyat.tl.toFixed(2)])}</Text> : null}
            {x.teveccuh ? <Text style={{ fontFamily: F.serif, color: C.parchmentDim, fontSize: 12 }}>{applyParams(t("onl.db.teveccuh"), [x.teveccuh])}</Text> : null}
            <View style={{ flexDirection: yon(rtl), gap: 7 }}>
              <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.db.dene")} icon="eye" rtl={rtl} kucuk kapali={yukleniyor} onPress={() => void deneAc(x.id)} /></View>
              {sahipMi && x.yuva ? <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.db.kusan")} icon="shirt" rtl={rtl} kucuk kapali={yukleniyor} onPress={() => { setSecili(x.id); void kusan(x); }} /></View> : null}
            </View>
            {x.satilik ? <Text style={{ fontFamily: F.serif, color: C.parchmentMuted, fontSize: 11.5 }}>{t("onl.db.satinAlKapali")}</Text> : null}
          </Cerceve>;
        })}
      </View>
      <Baslik2 metin={t("onl.db.deneBaslik")} rtl={rtl} />
      {!dene ? <BosKart icon="eye" metin={t("onl.db.deneBos")} rtl={rtl} /> : <>
        <Text style={{ fontFamily: F.serif, color: C.parchmentDim, fontSize: 12.5 }}>{t("onl.db.deneGuvenlik")}</Text>
        <View style={{ flexDirection: yon(rtl), gap: 6 }}>
          {dene.sahneler.map((x) => <View key={x.sahne} style={{ flex: 1 }}><CizgiDugme etiket={sahneAdi(t, x.sahne)} icon="eye" rtl={rtl} kucuk onPress={() => setSahne(x.sahne)} /></View>)}
        </View>
        {dene.sahneler.filter(x => x.sahne === sahne).map(x => <Cerceve key={x.sahne} ic={{ padding: 13, gap: 8 }}>
          <Text style={{ fontFamily: F.display, color: C.goldBright, fontSize: 13 }}>{sahneAdi(t, x.sahne)}</Text>
          <Text style={{ fontFamily: F.display, color: C.parchment, fontSize: 15 }}>{x.ben.ad}</Text>
          {Object.entries(x.ben.kusanilan).map(([yuva, id]) => <View key={yuva} style={{ flexDirection: yon(rtl), justifyContent: "space-between" }}>
            <Text style={{ fontFamily: F.serif, color: C.parchmentDim }}>{t("onl.db.yuva." + yuva)}</Text>
            <Text style={{ fontFamily: F.display, color: C.parchment }}>{urunAdi(t, id)}</Text>
          </View>)}
          {x.armagan ? <Bant metin={t("onl.db.armaganGoster")} rtl={rtl} /> : null}
          <Text style={{ fontFamily: F.serif, color: C.parchmentDim, fontSize: 12 }}>{t("onl.db.figuranlar")}: {x.figuranlar.map(f => f.ad).join(" · ")}</Text>
        </Cerceve>)}
      </>}
      <CizgiDugme etiket={t("onl.db.levha")} icon="trophy" rtl={rtl} kucuk onPress={() => router.push("/online/levha")} />
      <Text style={{ fontFamily: F.serif, color: C.parchmentMuted, fontSize: 11.5 }}>{t("onl.db.kutuYok")}</Text>
    </>}
  </OnlineSayfa>;
}
export default function OnlineDebdebe() { return onlineEkranAcik() ? <OnlineKapisi><DebdebeEkran /></OnlineKapisi> : <OnlineYakinda />; }
