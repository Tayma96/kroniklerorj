// P5 siyaset paneli: bölge durumu, makamlar, kayıtlar ve iki taraflı ateşkes.
import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { applyParams, useI18n } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { hap } from "../../lib/haptics";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi, useOnline } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { Bant, Cerceve, CizgiDugme, GeriDugme, Madalyon, geriGit, hiza, yon } from "../../lib/online/ui";
import { Secenekler } from "../../lib/online/toplum-ui";
import { Baslik2, Rozet, SayfaBasi, Yukleniyor } from "../../lib/online/yasam-ui";
import { ekHataAnahtari } from "../../lib/online/ek-istemci";
import { istekNoUret } from "../../lib/online/depo";
import { useSiyasetIstemci, type SiyasetDurumu, type SiyasetIstemci } from "../../lib/online/siyaset-veri";

function SiyasetEkran() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const online = useOnline();
  const istemci = useSiyasetIstemci();
  const [durum, setDurum] = useState<SiyasetDurumu | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [ittifakHedef, setIttifakHedef] = useState("");

  const yukle = useCallback(async () => {
    if (!istemci || !online.profil) return;
    setYukleniyor(true);
    const r = await istemci.yukle();
    setYukleniyor(false);
    if (r.ok) { setDurum(r.deger); setHata(null); }
    else setHata(t(ekHataAnahtari(r.hata)));
  }, [istemci, online.profil?.hesapId, t]);

  useEffect(() => { void yukle(); }, [yukle]);
  useEffect(() => { if (!online.dunya) void online.dunyaYukle(); }, [online.dunya, online.dunyaYukle]);

  const islem = async (govde: Record<string, unknown>, mesaj: string) => {
    if (!istemci || !online.profil) return;
    setHata(null); setSonuc(null); setYukleniyor(true);
    const r = await istemci.yaz(govde);
    setYukleniyor(false);
    if (!r.ok) { hap("error"); setHata(t(ekHataAnahtari(r.hata))); return; }
    hap("success");
    setSonuc(mesaj);
    if (r.deger.gorunum) setDurum(r.deger.gorunum);
    await online.yerlesimYukle(true);
    await yukle();
  };

  if (!online.profil) return <View style={{ flex: 1, backgroundColor: C.bg, padding: 18, justifyContent: "center" }}>
    <Bant tur="bilgi" metin={t("onl.v.profilYok")} rtl={rtl} eylem={t("onl.p.giriseDon")} onEylem={() => router.replace("/online")} />
  </View>;

  const bolge = durum?.bolge;
  const darbe = bolge?.darbe as Record<string, any> | null | undefined;
  const baris = darbe?.barisTeklifi as Record<string, any> | null | undefined;
  const taraf = darbe?.benimTaraf as "saldiran" | "savunan" | null | undefined;
  const pencereAcik = !!darbe && (darbe.durum === "ilan" || darbe.durum === "catışma")
    && typeof darbe.cozumAy === "number" && !!durum && durum.ay < darbe.cozumAy;
  const teklifVerebilir = pencereAcik && !!taraf && (!baris || baris.durum === "ret");
  const yanitlayabilir = pencereAcik && baris?.durum === "bekliyor" && !!taraf && taraf !== baris.taraf;
  const savunmaMakam = durum?.makamlar.find((m) => (m.tur === "sehirBeyi" || m.tur === "ahiBasi") && durum.benim?.makamlar.includes(m.id));
  const savunmaVerebilir = pencereAcik && !!savunmaMakam && !taraf && !darbe?.benimDestek;
  const gosterge = bolge?.gostergeler ?? {};
  const devlet = bolge?.devlet as Record<string, any> | null | undefined;
  const devletBeyi = !!devlet && devlet.bey?.kisi === durum?.benim?.kisi;
  const beylikler = online.dunya?.beylikler ?? [];
  const ittifakSecenekleri = beylikler.filter((x) => x.id !== bolge?.id).map((x) => x.id);
  const beylikAdi = (id: string) => beylikler.find((x) => x.id === id)?.ad ?? id;

  return <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 26, gap: 12 }}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center" }}>
      <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/yasam")} />
    </View>
    <SayfaBasi ust={online.yerlesim?.yerlesim.ad ?? online.profil.yerlesim} baslik={t("onl.siyaset.baslik")} alt={t("onl.siyaset.alt")} rtl={rtl} />
    {!istemci ? <Bant tur="bilgi" metin={t("onl.siyaset.onizlemeYok")} rtl={rtl} /> : null}
    {hata ? <Bant metin={hata} rtl={rtl} /> : null}
    {sonuc ? <Bant tur="bilgi" metin={sonuc} rtl={rtl} /> : null}
    {yukleniyor && !durum ? <Yukleniyor metin={t("onl.siyaset.yukleniyor")} /> : null}

    {bolge ? <>
      <Cerceve ic={{ padding: 13, gap: 10 }}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
          <Madalyon icon="castle" size={42} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ fontFamily: F.display, fontSize: 18, color: C.parchment, textAlign: hiza(rtl) }}>{bolge.ad}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.siyaset.ay"), [durum?.ay ?? 0])}</Text>
          </View>
          <Rozet metin={t("onl.siyaset.mesruiyet." + (bolge.mesruiyet?.kademe ?? "dengeli"))} renk={C.goldBright} />
        </View>
        <View style={{ flexDirection: yon(rtl), gap: 8 }}>
          {(["arz", "moral", "guvenlik"] as const).map((ad) => {
            const g = gosterge[ad];
            return <View key={ad} style={{ flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 8, gap: 3 }}>
              <Text style={{ fontFamily: F.display, fontSize: 11, color: C.parchmentDim, textAlign: "center" }}>{t("onl.siyaset.gosterge." + ad)}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 20, color: C.goldBright, textAlign: "center" }}>{g?.deger ?? "—"}</Text>
            </View>;
          })}
        </View>
        <View style={{ flexDirection: yon(rtl), justifyContent: "space-between" }}>
          <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim }}>{t("onl.siyaset.kasa")}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 14, color: C.parchment }}>{bolge.kasa} {t("onl.siyaset.akce")}</Text>
        </View>
        <View style={{ flexDirection: yon(rtl), justifyContent: "space-between" }}>
          <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim }}>{t("onl.siyaset.vergi")}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 14, color: C.parchment }}>{bolge.vergi?.oran ?? "—"}/4</Text>
        </View>
        <View style={{ flexDirection: yon(rtl), justifyContent: "space-between" }}>
          <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim }}>{t("onl.siyaset.alarm")}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 14, color: C.parchment }}>{t("onl.siyaset.alarm." + (bolge.alarm ?? "olagan"))}</Text>
        </View>
      </Cerceve>

      <Baslik2 metin={t("onl.siyaset.makamlar")} rtl={rtl} sag={<Text style={{ fontFamily: F.display, color: C.gold }}>{durum?.makamlar.length ?? 0}</Text>} />
      {durum?.makamlar.map((m, i) => <Cerceve key={m.id ?? i} ic={{ padding: 11, gap: 4 }}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
          <Madalyon icon="crown" size={34} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: F.display, fontSize: 14, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.siyaset.makam." + m.tur)}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim, textAlign: hiza(rtl) }}>{m.etkin?.ad ?? m.sahip?.ad ?? t("onl.siyaset.bosMakam")}</Text>
          </View>
          {m.etkin?.npc ? <Rozet metin={t("onl.siyaset.npc")} /> : null}
        </View>
      </Cerceve>)}

      <Baslik2 metin={t("onl.siyaset.darbe")} rtl={rtl} />
      {darbe ? <Cerceve ic={{ padding: 12, gap: 9 }}>
        <View style={{ flexDirection: yon(rtl), justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchment }}>{t("onl.siyaset.darbeDurum." + darbe.durum)}</Text>
          {taraf ? <Rozet metin={t("onl.siyaset.taraf." + taraf)} renk={C.goldBright} /> : null}
        </View>
        {baris ? <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>
          {applyParams(t("onl.siyaset.barisDurum"), [t("onl.siyaset.taraf." + baris.taraf), t("onl.siyaset.baris." + baris.durum)])}
        </Text> : null}
        {savunmaVerebilir ? <>
          <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.siyaset.savunmaAlt"), [t("onl.siyaset.makam." + savunmaMakam.tur)])}</Text>
          <CizgiDugme etiket={t("onl.siyaset.savunmaEmri")} icon="shield-check" rtl={rtl} kapali={yukleniyor}
            onPress={() => void islem({ islem: "darbeSavunma", makam: savunmaMakam.id }, t("onl.siyaset.savunmaVerildi"))} />
        </> : null}
        {darbe?.benimDestek ? <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.siyaset.savunmaDestekCakisma")}</Text> : null}
        {taraf === "savunan" ? <Rozet metin={t("onl.siyaset.savunmaKayitli")} renk={C.sage} /> : null}
        {teklifVerebilir ? <CizgiDugme etiket={t("onl.siyaset.barisTeklif")} icon="handshake" rtl={rtl} kapali={yukleniyor}
          onPress={() => void islem({ islem: "darbeBarisTeklif", istekId: istekNoUret() }, t("onl.siyaset.barisTeklifEdildi"))} /> : null}
        {yanitlayabilir ? <>
          <CizgiDugme etiket={t("onl.siyaset.barisKabul")} icon="check" rtl={rtl} kapali={yukleniyor}
            onPress={() => void islem({ islem: "darbeBarisYanit", istekId: baris.istekId, karar: "kabul" }, t("onl.siyaset.barisKabulEdildi"))} />
          <CizgiDugme etiket={t("onl.siyaset.barisRet")} icon="x" rtl={rtl} kucuk kapali={yukleniyor}
            onPress={() => void islem({ islem: "darbeBarisYanit", istekId: baris.istekId, karar: "ret" }, t("onl.siyaset.barisReddedildi"))} />
        </> : null}
        {!teklifVerebilir && !yanitlayabilir && baris?.durum !== "bekliyor" ? <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.siyaset.barisYok")}</Text> : null}
      </Cerceve> : <Cerceve ic={{ padding: 12, gap: 4 }}>
        <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.siyaset.darbeYok")}</Text>
      </Cerceve>}
    </> : null}

    {devlet ? <>
      <Baslik2 metin={t("onl.siyaset.ittifakBaslik")} rtl={rtl} />
      <Cerceve ic={{ padding: 12, gap: 9 }}>
        <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.siyaset.ittifakNotu")}</Text>
        {devlet.ittifakTalep ? <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.goldBright, textAlign: hiza(rtl) }}>
          {applyParams(t("onl.siyaset.ittifakTalepBekliyor"), [beylikAdi(devlet.ittifakTalep.hedef)])}
        </Text> : null}
        {(devlet.ittifaklar ?? []).length ? (devlet.ittifaklar as Record<string, any>[]).map((x) => <View key={x.bolge} style={{ flexDirection: yon(rtl), justifyContent: "space-between", alignItems: "center", gap: 8, paddingVertical: 5, borderBottomWidth: 1, borderColor: C.border }}>
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13, color: C.parchment, textAlign: hiza(rtl) }}>{x.ad ?? beylikAdi(x.bolge)}</Text>
          <Rozet metin={t("onl.siyaset.ittifakDurum." + x.durum)} renk={x.durum === "aktif" ? C.sage : C.goldBright} />
        </View>) : null}
        {(devlet.ittifaklar ?? []).length === 0 ? <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.siyaset.ittifakYok")}</Text> : null}
        {(devlet.ittifakGelen ?? []).filter((x: Record<string, any>) => !x.yanitlandi).map((x: Record<string, any>) => <View key={x.bolge + ":" + x.istekId} style={{ gap: 7, paddingVertical: 8, borderTopWidth: 1, borderColor: C.border }}>
          <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchment, textAlign: hiza(rtl) }}>{applyParams(t("onl.siyaset.ittifakGelen"), [x.ad ?? beylikAdi(x.bolge)])}</Text>
          {devletBeyi ? <View style={{ flexDirection: yon(rtl), gap: 7 }}>
            <View style={{ flex: 1 }}>
              <CizgiDugme etiket={t("onl.siyaset.ittifakKabul")} icon="check" rtl={rtl} kapali={yukleniyor}
                onPress={() => void islem({ islem: "devletYonet", tur: "ittifakYanit", kaynakBolge: x.bolge, istekId: x.istekId, karar: "kabul" }, t("onl.siyaset.ittifakKabulEdildi"))} />
            </View>
            <View style={{ flex: 1 }}>
              <CizgiDugme etiket={t("onl.siyaset.ittifakRet")} icon="x" rtl={rtl} kucuk kapali={yukleniyor}
                onPress={() => void islem({ islem: "devletYonet", tur: "ittifakYanit", kaynakBolge: x.bolge, istekId: x.istekId, karar: "ret" }, t("onl.siyaset.ittifakReddedildi"))} />
            </View>
          </View> : null}
        </View>)}
        {devletBeyi && !devlet.ittifakTalep ? <>
          <Text style={{ fontFamily: F.display, fontSize: 11.5, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.siyaset.ittifakHedef")}</Text>
          <Secenekler secenekler={ittifakSecenekleri} secili={ittifakHedef || null} onSec={setIttifakHedef} etiket={beylikAdi} />
          <CizgiDugme etiket={t("onl.siyaset.ittifakGonder")} icon="handshake" rtl={rtl} kapali={yukleniyor || !ittifakHedef}
            onPress={() => void islem({ islem: "devletYonet", tur: "ittifak", hedefBolge: ittifakHedef }, t("onl.siyaset.ittifakGonderildi"))} />
        </> : null}
      </Cerceve>
    </> : null}

    <Baslik2 metin={t("onl.siyaset.kayitlar")} rtl={rtl} />
    {durum?.kayit.slice(-8).reverse().map((x, i) => {
      const k = typeof x.m?.k === "string" ? "onl." + x.m.k : "";
      const metin = k ? t(k) : "";
      return <View key={x.n ?? i} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, paddingVertical: 7, borderBottomWidth: 1, borderColor: C.border }}>
        <Text style={{ fontFamily: F.display, fontSize: 11, color: C.goldDim }}>{x.ay ?? ""}</Text>
        <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13, color: C.parchmentDim, textAlign: hiza(rtl) }}>{metin && metin !== k ? metin : (x.kim ?? x.tur ?? "")}</Text>
      </View>;
    })}
    <CizgiDugme etiket={t("onl.siyaset.yenile")} icon="refresh-cw" rtl={rtl} kucuk kapali={yukleniyor} onPress={() => void yukle()} />
  </ScrollView>;
}

export default function OnlineSiyaset() {
  return onlineEkranAcik() ? <OnlineKapisi><SiyasetEkran /></OnlineKapisi> : <OnlineYakinda />;
}
