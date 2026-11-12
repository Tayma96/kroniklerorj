// E4.3 hizmet pazarı: öğrenilmiş hizmeti hazırla, ilan et, satın al veya ilanı geri çek.
import { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, type ReactNode } from "react-native";
import { useRouter } from "expo-router";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { hap } from "../../lib/haptics";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi, useOnline } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { Bant, Cerceve, CizgiDugme, GeriDugme, Madalyon, geriGit, hiza, yon } from "../../lib/online/ui";
import { Baslik2, Rozet, SayfaBasi, Yukleniyor } from "../../lib/online/yasam-ui";
import { ekHataAnahtari } from "../../lib/online/ek-istemci";
import { useHizmetIstemci, type HizmetDurumu, type HizmetIstemci } from "../../lib/online/hizmet-veri";

type Ceviri = (k: string) => string;
const sayi = (v: string, varsayilan: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : varsayilan;
};

function HizmetKarti({ baslik, alt, icon, rtl, children }: { baslik: string; alt: string; icon: string; rtl: boolean; children: ReactNode }) {
  return <Cerceve ic={{ padding: 12, gap: 9 }}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
      <Madalyon icon={icon} size={42} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontFamily: F.display, fontSize: 15.5, color: C.parchment, textAlign: hiza(rtl) }}>{baslik}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>{alt}</Text>
      </View>
    </View>
    {children}
  </Cerceve>;
}

function HizmetEkran() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const online = useOnline();
  const istemci = useHizmetIstemci();
  const [durum, setDurum] = useState<HizmetDurumu | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [adetler, setAdetler] = useState<Record<string, string>>({});
  const [fiyatlar, setFiyatlar] = useState<Record<string, string>>({});
  const [sonuc, setSonuc] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    if (!istemci) return;
    setYukleniyor(true);
    const r = await istemci.yukle();
    setYukleniyor(false);
    if (r.ok) { setDurum(r.deger); setHata(null); }
    else setHata(t(ekHataAnahtari(r.hata)));
  }, [istemci, t]);

  useEffect(() => { void yukle(); }, [yukle]);

  const islem = async (yap: () => ReturnType<HizmetIstemci["hazirla"]>, mesaj: string) => {
    if (!istemci) return;
    setHata(null); setSonuc(null);
    const r = await yap();
    if (r.ok) { hap("success"); setSonuc(mesaj); await yukle(); }
    else { hap("error"); setHata(t(ekHataAnahtari(r.hata))); }
  };

  if (!online.profil) return <View style={{ flex: 1, backgroundColor: C.bg, padding: 18, justifyContent: "center" }}>
    <Bant tur="bilgi" metin={t("onl.v.profilYok")} rtl={rtl} eylem={t("onl.p.giriseDon")} onEylem={() => router.replace("/online")} />
  </View>;

  return <View style={{ flex: 1, backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 12 }}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center" }}>
      <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/yasam")} />
    </View>
    <SayfaBasi ust={online.profil.yerlesim} baslik={t("onl.hizmet.baslik")} alt={t("onl.hizmet.alt")} rtl={rtl} />
    {!istemci ? <Bant tur="bilgi" metin={t("onl.hizmet.onizlemeYok")} rtl={rtl} /> : null}
    {hata ? <Bant metin={hata} rtl={rtl} /> : null}
    {sonuc ? <Bant tur="bilgi" metin={sonuc} rtl={rtl} /> : null}
    {yukleniyor && !durum ? <Yukleniyor metin={t("onl.hizmet.yukleniyor")} /> : null}

    <Baslik2 metin={t("onl.hizmet.katalog")} rtl={rtl} sag={durum ? <Text style={{ fontFamily: F.display, color: C.gold }}>{durum.katalog.length}</Text> : undefined} />
    {durum?.katalog.map((x) => {
      const girdiler = Object.entries(x.girdi).map(([mal, n]) => applyParams(t("onl.hizmet.girdi"), [n, t("onl.mal." + mal)])).join(" · ") || t("onl.hizmet.girdiYok");
      const alt = [t("onl.hizmet.meslek." + x.meslek), t("onl.hizmet.dugum." + x.id), applyParams(t("onl.hizmet.takat"), [x.takat]), girdiler].join(" · ");
      return <HizmetKarti key={x.id} baslik={t("onl.hizmet.ad." + x.id)} alt={alt} icon="hands-helping" rtl={rtl}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
          <Rozet metin={x.acik ? t("onl.hizmet.acik") : t("onl.hizmet.kilitli")} renk={x.acik ? C.sage : C.parchmentMuted} dolu={x.acik} />
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.hizmet.kota"), [x.aylikTavan])}</Text>
        </View>
        {x.acik ? <CizgiDugme etiket={t("onl.hizmet.hazirla")} icon="hammer" rtl={rtl} kucuk kapali={yukleniyor} onPress={() => void islem(() => istemci!.hazirla(x.id, 1), t("onl.hizmet.hazirlandi"))} /> : null}
      </HizmetKarti>;
    })}

    <Baslik2 metin={t("onl.hizmet.stok")} rtl={rtl} />
    {durum?.stok.length ? durum.stok.map((x) => <HizmetKarti key={x.id} baslik={t("onl.hizmet.ad." + x.hizmet)} alt={applyParams(t("onl.hizmet.stokBilgi"), [x.adet, x.kalanAy])} icon="package" rtl={rtl}>
      <View style={{ flexDirection: yon(rtl), gap: 8, alignItems: "center" }}>
        <TextInput accessibilityLabel={t("onl.hizmet.fiyat")} keyboardType="number-pad" value={fiyatlar[x.id] ?? String(x.fiyatTaban ?? 1)} onChangeText={(v) => setFiyatlar((p) => ({ ...p, [x.id]: v }))} style={{ flex: 1, minHeight: 42, borderWidth: 1, borderColor: C.goldDim, borderRadius: 8, color: C.parchment, paddingHorizontal: 10, textAlign: hiza(rtl), fontFamily: F.display }} />
        <CizgiDugme etiket={t("onl.hizmet.ilanVer")} icon="scroll" rtl={rtl} kucuk kapali={yukleniyor} onPress={() => void islem(() => istemci!.ilan(x.id, 1, sayi(fiyatlar[x.id] ?? "", x.fiyatTaban ?? 1)), t("onl.hizmet.ilanAcildi"))} />
      </View>
    </HizmetKarti>) : <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.hizmet.stokBos")}</Text>}

    <Baslik2 metin={t("onl.hizmet.pazar")} rtl={rtl} sag={durum ? <Text style={{ fontFamily: F.display, color: C.gold }}>{durum.ilanlar.length}</Text> : undefined} />
    {durum?.ilanlar.length ? durum.ilanlar.map((x) => <HizmetKarti key={x.id} baslik={t("onl.hizmet.ad." + x.hizmet)} alt={applyParams(t("onl.hizmet.ilanBilgi"), [x.ad, x.adet, x.birimFiyat, x.kalanAy])} icon="store" rtl={rtl}>
      {x.benim
        ? <CizgiDugme etiket={t("onl.hizmet.ilanGeri")} icon="undo" rtl={rtl} kucuk kapali={yukleniyor} onPress={() => void islem(() => istemci!.geri(x.id), t("onl.hizmet.ilanIade"))} />
        : <CizgiDugme etiket={t("onl.hizmet.satinAl")} icon="coins" rtl={rtl} kucuk kapali={yukleniyor} onPress={() => void islem(() => istemci!.satinAl(x.id, 1), t("onl.hizmet.satinAlindi"))} />}
    </HizmetKarti>) : <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.hizmet.pazarBos")}</Text>}
    <CizgiDugme etiket={t("onl.hizmet.yenile")} icon="refresh-cw" rtl={rtl} kucuk kapali={yukleniyor} onPress={() => void yukle()} />
  </View>;
}

export default function OnlineHizmet() {
  return onlineEkranAcik() ? <OnlineKapisi><HizmetEkran /></OnlineKapisi> : <OnlineYakinda />;
}
