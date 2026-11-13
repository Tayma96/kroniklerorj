// Oyuncular arası ısmarlama: emanetli sipariş, kabul/ret/geri çekme ve malı kalite iziyle teslim.
import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { hap } from "../../lib/haptics";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi, useOnline } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { Bant, Cerceve, CizgiDugme, GeriDugme, Madalyon, geriGit, hiza, yon } from "../../lib/online/ui";
import { Baslik2, BosKart, Hap, OnlineSayfa, SayfaBasi, Yukleniyor, YerlesimBekle, sahneGorseli } from "../../lib/online/yasam-ui";
import { Secenekler } from "../../lib/online/toplum-ui";
import { istekNoUret } from "../../lib/online/depo";
import { ekHataAnahtari, type EkHata } from "../../lib/online/ek-istemci";
import { NPC_MALLARI } from "../../lib/online/meslek-veri";
import { useEkonomiIstemci, type IsmarlamaGorunumu, type IsmarlamaYaniti, type Kademe4 } from "../../lib/online/ekonomi-veri";
import { malAdi, kaliteAdi } from "../../lib/online/ekonomi-ui";

type Ceviri = (k: string) => string;

function IsmarlamaKarti({ x, t, rtl, bekliyor, onCevap }: {
  x: IsmarlamaGorunumu; t: Ceviri; rtl: boolean; bekliyor: boolean;
  onCevap: (cevap: "kabul" | "ret" | "geri" | "teslim") => void;
}) {
  const gelen = x.rol === "usta";
  const kisi = gelen ? x.musteri.ad : x.usta.ad;
  return <Cerceve aktif={x.durum === "acik" || x.durum === "surer"} ic={{ padding: 12, gap: 8 }}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 9 }}>
      <Madalyon icon="scroll" size={38} aktif={x.durum === "surer"} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: F.display, fontSize: 14.5, color: C.parchment, textAlign: hiza(rtl) }}>{malAdi(t, x.mal)} × {x.adet}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t(gelen ? "onl.im.musteri" : "onl.im.usta"), [kisi])}</Text>
      </View>
      <Text style={{ fontFamily: F.display, color: C.goldBright, fontSize: 13 }}>{applyParams(t("onl.is.akce"), [x.ucret])}</Text>
    </View>
    <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
      <Text style={{ fontFamily: F.serif, color: C.parchmentDim, fontSize: 12.5 }}>{applyParams(t("onl.im.kalite"), [kaliteAdi(t, x.kademe)])}</Text>
      <Text style={{ fontFamily: F.serif, color: C.parchmentDim, fontSize: 12.5 }}>{applyParams(t("onl.im.sonAy"), [x.son])}</Text>
      <Text style={{ fontFamily: F.serif, color: C.parchmentDim, fontSize: 12.5 }}>{t("onl.im.durum." + x.durum)}</Text>
    </View>
    {x.emanet > 0 ? <Text style={{ fontFamily: F.serif, fontSize: 12.5, color: C.gold }}>{applyParams(t("onl.im.emanet"), [x.emanet])}</Text> : null}
    {x.durum === "teslim" && x.teslimKalitesi ? <Text style={{ fontFamily: F.serif, fontSize: 12.5, color: C.sage }}>{applyParams(t("onl.im.teslimKalite"), [kaliteAdi(t, ["sade", "iyi", "ustun", "saheser"].indexOf(x.teslimKalitesi))])}</Text> : null}
    {x.durum === "acik" && gelen ? <View style={{ flexDirection: yon(rtl), gap: 8 }}>
      <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.im.kabul")} icon="check" rtl={rtl} kucuk kapali={bekliyor} onPress={() => onCevap("kabul")} /></View>
      <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.im.ret")} icon="x" rtl={rtl} kucuk kapali={bekliyor} onPress={() => onCevap("ret")} /></View>
    </View> : null}
    {x.durum === "acik" && !gelen ? <CizgiDugme etiket={t("onl.im.geri")} icon="undo" rtl={rtl} kucuk kapali={bekliyor} onPress={() => onCevap("geri")} /> : null}
    {x.durum === "surer" && gelen ? <CizgiDugme etiket={t("onl.im.teslim")} icon="package-check" rtl={rtl} kucuk kapali={bekliyor} onPress={() => onCevap("teslim")} /> : null}
  </Cerceve>;
}

function IsmarlamaEkran() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const o = useOnline();
  const ist = useEkonomiIstemci();
  const y = o.yerlesim;
  const [durum, setDurum] = useState<IsmarlamaYaniti | null>(null);
  const [hedef, setHedef] = useState("");
  const [mal, setMal] = useState<string>(NPC_MALLARI[0] ?? "odun");
  const [adet, setAdet] = useState("1");
  const [kalite, setKalite] = useState("0");
  const [sure, setSure] = useState("3");
  const [ucret, setUcret] = useState("10");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [yukHata, setYukHata] = useState<EkHata | null>(null);

  const oyuncular = useMemo(() => (y?.harita ?? []).flatMap((m) => m.kisiler).filter((k) => k.oyuncu && k.id !== y?.ben.id), [y]);
  const yukle = useCallback(async () => {
    const r = await ist.ismarlamalar();
    if (r.ok) { setDurum(r.deger); setYukHata(null); }
    else setYukHata(r.hata);
  }, [ist]);
  useEffect(() => { void yukle(); }, [yukle]);

  const cevapla = async (id: string, cevap: "kabul" | "ret" | "geri" | "teslim") => {
    setYukleniyor(true); setHata(null); setBilgi(null);
    const r = await ist.cevap({ ismarlama: id, cevap, istekNo: istekNoUret() });
    setYukleniyor(false);
    if (!r.ok) { hap("error"); setHata(t(ekHataAnahtari(r.hata))); return; }
    hap("success"); setBilgi(t("onl.im.islemTamam"));
    await Promise.all([yukle(), o.yerlesimYukle(true)]);
  };
  const gonder = async () => {
    if (!hedef) { setHata(t("onl.im.hedefSec")); return; }
    const n = Number(adet), ay = Number(sure), f = Number(ucret), q = Number(kalite);
    if (![n, ay, f, q].every(Number.isInteger)) { setHata(t("onl.im.formHata")); return; }
    setYukleniyor(true); setHata(null); setBilgi(null);
    const r = await ist.ismarla({ hedef, mal, adet: n, kalite: q as Kademe4, sure: ay, ucret: f, istekNo: istekNoUret() });
    setYukleniyor(false);
    if (!r.ok) { hap("error"); setHata(t(ekHataAnahtari(r.hata))); return; }
    hap("success"); setBilgi(t("onl.im.gonderildi"));
    await Promise.all([yukle(), o.yerlesimYukle(true)]);
  };

  if (!y) return <YerlesimBekle rtl={rtl} t={t} onGiris={() => router.replace("/online")} />;
  return <OnlineSayfa gorsel={sahneGorseli(y.yerlesim.tur, y.saat.mevsim)} oran={0.3} rtl={rtl} t={t}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
      <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/yasam")} />
      <View style={{ flex: 1 }} />
      <Hap icon="coins" metin={String(y.ben.para)} erisim={applyParams(t("onl.ya.paraErisim"), [y.ben.para])} />
    </View>
    <SayfaBasi ust={y.yerlesim.ad} baslik={t("onl.im.baslik")} alt={t("onl.im.alt")} rtl={rtl} />
    {hata ? <Bant metin={hata} rtl={rtl} /> : null}
    {bilgi ? <Bant tur="bilgi" metin={bilgi} rtl={rtl} /> : null}
    <Baslik2 metin={t("onl.im.yeni")} rtl={rtl} />
    <Cerceve ic={{ padding: 12, gap: 9 }}>
      <Text style={{ fontFamily: F.display, color: C.parchment, fontSize: 13 }}>{t("onl.im.ustaSec")}</Text>
      {oyuncular.length ? <Secenekler secenekler={oyuncular.map((x) => x.id)} secili={hedef} onSec={setHedef} etiket={(id) => oyuncular.find((x) => x.id === id)?.ad ?? id} />
        : <Text style={{ fontFamily: F.serif, color: C.parchmentDim }}>{t("onl.im.ustaYok")}</Text>}
      <Text style={{ fontFamily: F.display, color: C.parchment, fontSize: 13 }}>{t("onl.im.malSec")}</Text>
      <Secenekler secenekler={[...NPC_MALLARI]} secili={mal} onSec={setMal} etiket={(id) => malAdi(t, id)} />
      <Text style={{ fontFamily: F.display, color: C.parchment, fontSize: 13 }}>{t("onl.im.adet")}</Text>
      <TextInput value={adet} onChangeText={setAdet} keyboardType="number-pad" maxLength={2} placeholder="1" style={{ color: C.parchment, borderWidth: 1, borderColor: "rgba(201,162,78,0.35)", borderRadius: 8, padding: 10, fontFamily: F.display }} />
      <Text style={{ fontFamily: F.display, color: C.parchment, fontSize: 13 }}>{t("onl.im.kaliteSec")}</Text>
      <Secenekler secenekler={["0", "1", "2", "3"]} secili={kalite} onSec={setKalite} etiket={(v) => kaliteAdi(t, Number(v))} />
      <Text style={{ fontFamily: F.display, color: C.parchment, fontSize: 13 }}>{t("onl.im.sure")}</Text>
      <TextInput value={sure} onChangeText={setSure} keyboardType="number-pad" maxLength={1} style={{ color: C.parchment, borderWidth: 1, borderColor: "rgba(201,162,78,0.35)", borderRadius: 8, padding: 10, fontFamily: F.display }} />
      <Text style={{ fontFamily: F.display, color: C.parchment, fontSize: 13 }}>{t("onl.im.ucret")}</Text>
      <TextInput value={ucret} onChangeText={setUcret} keyboardType="number-pad" maxLength={6} style={{ color: C.parchment, borderWidth: 1, borderColor: "rgba(201,162,78,0.35)", borderRadius: 8, padding: 10, fontFamily: F.display }} />
      <CizgiDugme etiket={t("onl.im.gonder")} icon="send" rtl={rtl} kapali={yukleniyor || oyuncular.length === 0} onPress={() => void gonder()} />
      <Text style={{ fontFamily: F.serif, color: C.parchmentMuted, fontSize: 12.5 }}>{t("onl.im.emanetNot")}</Text>
    </Cerceve>
    <Baslik2 metin={t("onl.im.gelen")} rtl={rtl} sag={<Text style={{ color: C.gold }}>{durum?.gelen.length ?? 0}</Text>} />
    {yukHata && !durum ? <Bant metin={t(ekHataAnahtari(yukHata))} rtl={rtl} eylem={t("onl.yenidenDene")} onEylem={() => void yukle()} />
      : !durum ? <Yukleniyor metin={t("onl.im.yukleniyor")} />
      : durum.gelen.length ? <View style={{ gap: 9 }}>{durum.gelen.map((x) => <IsmarlamaKarti key={x.id} x={x} t={t} rtl={rtl} bekliyor={yukleniyor} onCevap={(c) => void cevapla(x.id, c)} />)}</View>
      : <BosKart icon="scroll" metin={t("onl.im.gelenBos")} rtl={rtl} />}
    <Baslik2 metin={t("onl.im.giden")} rtl={rtl} sag={<Text style={{ color: C.gold }}>{durum?.giden.length ?? 0}</Text>} />
    {durum?.giden.length ? <View style={{ gap: 9 }}>{durum.giden.map((x) => <IsmarlamaKarti key={x.id} x={x} t={t} rtl={rtl} bekliyor={yukleniyor} onCevap={(c) => void cevapla(x.id, c)} />)}</View>
      : <BosKart icon="package" metin={t("onl.im.gidenBos")} rtl={rtl} />}
    {durum ? <Text style={{ fontFamily: F.serif, color: C.parchmentDim, fontSize: 12.5 }}>{applyParams(t("onl.im.sicil"), [durum.sicil.teslim, durum.sicil.gecikme, durum.emanet])}</Text> : null}
    <CizgiDugme etiket={t("onl.eko.defter")} icon="book" rtl={rtl} kucuk onPress={() => router.push("/online/defter")} />
  </OnlineSayfa>;
}

export default function OnlineIsmarlama() {
  return onlineEkranAcik() ? <OnlineKapisi><IsmarlamaEkran /></OnlineKapisi> : <OnlineYakinda />;
}
