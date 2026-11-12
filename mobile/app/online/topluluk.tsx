// E5–E7 topluluk yüzeyi: meşrep seçimi, ortak dert katkısı, şenlik, hami/müdavim ve zaviye özeti.
import { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { hap } from "../../lib/haptics";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi, useOnline } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { Bant, Cerceve, CizgiDugme, GeriDugme, Madalyon, geriGit, hiza, yon } from "../../lib/online/ui";
import { Baslik2, SayfaBasi, Yukleniyor } from "../../lib/online/yasam-ui";
import { hataAnahtari } from "../../lib/online/hata";
import { istekNoUret } from "../../lib/online/depo";
import type { ToplulukDurumu, ZaviyeIstegi } from "../../lib/online/toplum-veri";
import { Secenekler } from "../../lib/online/toplum-ui";

type Mesrep = { el: "comert" | "hesapli" | "orta"; cesaret: "temkinli" | "gozupek" | "orta"; gurur: "mutevazi" | "gururlu" | "orta" };
const EKSENLER: { id: keyof Mesrep; secenekler: readonly string[] }[] = [
  { id: "el", secenekler: ["comert", "hesapli", "orta"] },
  { id: "cesaret", secenekler: ["temkinli", "gozupek", "orta"] },
  { id: "gurur", secenekler: ["mutevazi", "gururlu", "orta"] },
];
const MAL_KATKILARI = new Set(["erzak", "malzeme", "alet"]);

function ToplulukEkran() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const online = useOnline();
  const istemci = online.toplumIstemci();
  const [durum, setDurum] = useState<ToplulukDurumu | null>(null);
  const [secim, setSecim] = useState<Mesrep>({ el: "orta", cesaret: "orta", gurur: "orta" });
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [hedefId, setHedefId] = useState("");
  const [zaviyeAd, setZaviyeAd] = useState("");
  const [zaviyeHedef, setZaviyeHedef] = useState("");
  const [zaviyeTutar, setZaviyeTutar] = useState("10");
  const [zaviyeSekil, setZaviyeSekil] = useState("kalkan");
  const [zaviyeRenk, setZaviyeRenk] = useState("al");
  const [zaviyeAday, setZaviyeAday] = useState("");


  const yukle = useCallback(async () => {
    if (!online.profil) return;
    setYukleniyor(true);
    const r = await istemci.toplulukOku();
    setYukleniyor(false);
    if (!r.ok) { setHata(t(hataAnahtari(r.hata))); return; }
    setDurum(r.deger);
    setSecim({
      el: (r.deger.mesrep.eksenler.find((x) => x.eksen === "el")?.secili ?? "orta") as Mesrep["el"],
      cesaret: (r.deger.mesrep.eksenler.find((x) => x.eksen === "cesaret")?.secili ?? "orta") as Mesrep["cesaret"],
      gurur: (r.deger.mesrep.eksenler.find((x) => x.eksen === "gurur")?.secili ?? "orta") as Mesrep["gurur"],
    });
    setHata(null);
  }, [istemci, online.profil?.hesapId, t]);

  useEffect(() => { void yukle(); }, [yukle]);

  const gonder = async (yap: () => Promise<{ ok: boolean; hata?: string }>, mesaj: string) => {
    setHata(null); setBilgi(null); setYukleniyor(true);
    const r = await yap();
    setYukleniyor(false);
    if (!r.ok) { hap("error"); setHata(t(hataAnahtari(r.hata as never))); return; }
    hap("success"); setBilgi(mesaj);
    await online.yerlesimYukle(true);
    await yukle();
  };
  const zaviyeEylem = (islem: ZaviyeIstegi["islem"], ek: Partial<ZaviyeIstegi> = {}, mesaj = "onl.topluluk.zaviye.islemTamam") =>
    void gonder(() => istemci.zaviye({ islem, ...ek, istekNo: istekNoUret() }), t(mesaj));

  if (!online.profil) return <View style={{ flex: 1, backgroundColor: C.bg, padding: 18, justifyContent: "center" }}>
    <Bant tur="bilgi" metin={t("onl.v.profilYok")} rtl={rtl} eylem={t("onl.p.giriseDon")} onEylem={() => router.replace("/online")} />
  </View>;

  const dertKatilari = durum?.ortakDert.uygunKatkilarim.filter((x) => !MAL_KATKILARI.has(x)) ?? [];
  return <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28, gap: 12 }}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center" }}>
      <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/yasam")} />
    </View>
    <SayfaBasi ust={online.yerlesim?.yerlesim.ad ?? online.profil.yerlesim} baslik={t("onl.topluluk.baslik")} alt={t("onl.topluluk.alt")} rtl={rtl} />
    {hata ? <Bant metin={hata} rtl={rtl} /> : null}
    {bilgi ? <Bant tur="bilgi" metin={bilgi} rtl={rtl} /> : null}
    {yukleniyor && !durum ? <Yukleniyor metin={t("onl.topluluk.yukleniyor")} /> : null}

    <Baslik2 metin={t("onl.topluluk.gostergeler")} rtl={rtl} />
    {durum ? <Cerceve ic={{ padding: 12, gap: 12 }}>
      {(["arz", "moral", "asayis"] as const).map((alan) => {
        const deger = durum.gostergeler[alan];
        const oran = Math.max(0, Math.min(100, deger));
        return <View key={alan} style={{ gap: 5 }}>
          <View style={{ flexDirection: yon(rtl), justifyContent: "space-between" }}>
            <Text style={{ fontFamily: F.display, color: C.parchment, fontSize: 13 }}>{t("onl.topluluk.gosterge." + alan)}</Text>
            <Text style={{ fontFamily: F.display, color: C.goldBright, fontSize: 13 }}>{deger}/100</Text>
          </View>
          <View style={{ height: 7, borderRadius: 5, overflow: "hidden", backgroundColor: "rgba(201,162,78,0.16)" }}>
            <View style={{ width: `${oran}%` as `${number}%`, height: 7, backgroundColor: alan === "asayis" ? C.sage : C.gold, borderRadius: 5 }} />
          </View>
        </View>;
      })}
    </Cerceve> : null}

    <Baslik2 metin={t("onl.topluluk.mesrep")} rtl={rtl} />
    {durum ? <Cerceve ic={{ padding: 12, gap: 10 }}>
      <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t(durum.mesrep.secildi ? "onl.topluluk.mesrep.secildi" : "onl.topluluk.mesrep.aciklama")}</Text>
      {EKSENLER.map((e) => <View key={e.id} style={{ gap: 6 }}>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.topluluk.mesrep.eksen." + e.id)}</Text>
        <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
          {e.secenekler.map((v) => {
            const aktif = secim[e.id] === v;
            return <CizgiDugme key={v} etiket={t("onl.topluluk.mesrep.uc." + v)} icon={aktif ? "check-circle" : "circle"} rtl={rtl} kucuk kapali={!durum.mesrep.secimAcik || yukleniyor}
              onPress={() => setSecim((p) => ({ ...p, [e.id]: v }))} />;
          })}
        </View>
      </View>)}
      {durum.mesrep.secimAcik ? <CizgiDugme etiket={t("onl.topluluk.mesrep.kaydet")} icon="check" rtl={rtl} kapali={yukleniyor}
        onPress={() => void gonder(() => istemci.mesrep({ ...secim, istekNo: istekNoUret() }), t("onl.topluluk.mesrep.kaydedildi"))} /> : null}
    </Cerceve> : null}

    <Baslik2 metin={t("onl.topluluk.ortakDert")} rtl={rtl} sag={durum ? <Text style={{ fontFamily: F.display, color: C.gold }}>{durum.ortakDert.acik.length}</Text> : undefined} />
    {durum?.ortakDert.acik.length ? durum.ortakDert.acik.map((d) => <Cerceve key={d.id} ic={{ padding: 12, gap: 9 }}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 9 }}>
        <Madalyon icon="shield-alert" size={38} aktif />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.topluluk.dert." + d.tur)}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.topluluk.dert.ilerleme"), [d.puan, d.esik, d.bitis])}</Text>
        </View>
      </View>
      <View style={{ height: 6, borderRadius: 4, backgroundColor: "rgba(201,162,78,0.16)", overflow: "hidden" }}>
        <View style={{ width: `${Math.min(100, Math.round(d.puan / Math.max(1, d.esik) * 100))}%` as `${number}%`, height: 6, backgroundColor: C.sage }} />
      </View>
      <Text style={{ fontFamily: F.serif, fontSize: 12.5, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{applyParams(t("onl.topluluk.dert.katilim"), [d.benim?.kalan ?? 0])}</Text>
      {d.defter.length ? <Text style={{ fontFamily: F.serif, fontSize: 12.5, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.topluluk.dert.katilanlar"), [d.defter.slice(0, 5).map((x) => x.ad).join(" · ")])}</Text> : null}
      <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
        {dertKatilari.map((katki) => <CizgiDugme key={katki} etiket={t("onl.topluluk.katki." + katki)} icon="hand-heart" rtl={rtl} kucuk kapali={yukleniyor || (d.benim?.kalan ?? 0) <= 0}
          onPress={() => void gonder(() => istemci.ortakDert({ dert: d.id, katki, istekNo: istekNoUret() }), t("onl.topluluk.katkiYapildi"))} />)}
      </View>
    </Cerceve>) : <Text style={{ fontFamily: F.serif, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.topluluk.dert.bos")}</Text>}

    <Baslik2 metin={t("onl.topluluk.senlik")} rtl={rtl} />
    {durum?.senlik.simdiki ? <Cerceve ic={{ padding: 12, gap: 8 }}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
        <Madalyon icon="calendar-heart" size={40} aktif />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.topluluk.senlik." + durum.senlik.simdiki.tur)}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.topluluk.senlik.bilgi"), [durum.senlik.simdiki.bitis])}</Text>
        </View>
      </View>
      <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{applyParams(t("onl.topluluk.senlik.katilim"), [durum.senlik.simdiki.benim.sayi, durum.senlik.simdiki.benim.kalan])}</Text>
      <View style={{ gap: 3 }}>
        <Text style={{ fontFamily: F.display, fontSize: 11, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.topluluk.senlik.levha")}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim, textAlign: hiza(rtl) }}>
          {durum.senlik.simdiki.levha.length ? durum.senlik.simdiki.levha.slice(0, 8).map((x) => x.ad).join(" · ") : t("onl.topluluk.senlik.levhaBos")}
        </Text>
      </View>
      {durum.senlik.simdiki.durum === "acik" ? <CizgiDugme etiket={t("onl.topluluk.senlik.hayir")} icon="coins" rtl={rtl} kucuk kapali={yukleniyor || durum.senlik.simdiki.benim.kalan <= 0}
        onPress={() => void gonder(() => istemci.senlik({ katki: "hayir", tutar: 1, istekNo: istekNoUret() }), t("onl.topluluk.senlik.katildi"))} /> : null}
    </Cerceve> : <Text style={{ fontFamily: F.serif, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.topluluk.senlik.yok")}</Text>}

    <Baslik2 metin={t("onl.topluluk.hami.baslik")} rtl={rtl} />
    {durum?.hami.gelen.map((b) => <Cerceve key={b.gonderen + b.acilis} ic={{ padding: 11, gap: 8 }}>
      <Text style={{ fontFamily: F.serif, color: C.parchment, fontSize: 14, textAlign: hiza(rtl) }}>{b.rolum === "hami" ? applyParams(t("onl.topluluk.hami.istekGeldi"), [b.cirak.ad]) : applyParams(t("onl.topluluk.hami.teklif"), [b.hami.ad, b.cirak.ad])}</Text>
      <View style={{ flexDirection: yon(rtl), gap: 8 }}>
        <CizgiDugme etiket={t("onl.topluluk.hami.kabul")} icon="check" rtl={rtl} kucuk kapali={yukleniyor}
          onPress={() => void gonder(() => istemci.hami({ islem: "kabul", hedef: b.gonderen, istekNo: istekNoUret() }), t("onl.topluluk.hami.kabulEdildi"))} />
        <CizgiDugme etiket={t("onl.topluluk.hami.ret")} icon="x" rtl={rtl} kucuk kapali={yukleniyor}
          onPress={() => void gonder(() => istemci.hami({ islem: "ret", hedef: b.gonderen, istekNo: istekNoUret() }), t("onl.topluluk.hami.reddedildi"))} />
      </View>
    </Cerceve>)}
    {durum?.hami.suren.map((b) => {
      const diger = b.rolum === "hami" ? b.cirak.ad : b.hami.ad;
      const hedef = b.rolum === "hami" ? b.cirak.id : b.hami.id;
      return <Cerceve key={b.hami.id + b.cirak.id} ic={{ padding: 11, gap: 8 }}>
        <Text style={{ fontFamily: F.serif, color: C.parchment, fontSize: 14, textAlign: hiza(rtl) }}>{applyParams(t("onl.topluluk.hami.aktif"), [diger])}</Text>
        <CizgiDugme etiket={t("onl.topluluk.hami.birak")} icon="unlink" rtl={rtl} kucuk kapali={yukleniyor}
          onPress={() => void gonder(() => istemci.hami({ islem: "birak", hedef, istekNo: istekNoUret() }), t("onl.topluluk.hami.birakildi"))} />
      </Cerceve>;
    })}
    {durum?.hami.giden.map((b) => <Text key={b.gonderen + b.acilis} style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{applyParams(t("onl.topluluk.hami.bekliyor"), [b.hami.ad, b.cirak.ad])}</Text>)}
    {durum && (durum.hami.hamiOlabilir || durum.hami.yeniGelen) ? <Cerceve ic={{ padding: 12, gap: 8 }}>
      <Text style={{ fontFamily: F.serif, color: C.parchmentDim, fontSize: 13, textAlign: hiza(rtl) }}>{t(durum.hami.hamiOlabilir ? "onl.topluluk.hami.uygun" : "onl.topluluk.hami.yeniGelen")}</Text>
      <TextInput value={hedefId} onChangeText={setHedefId} autoCapitalize="none" placeholder={t("onl.topluluk.hami.hedef")} placeholderTextColor={C.parchmentMuted}
        style={{ minHeight: 42, borderWidth: 1, borderColor: C.goldDim, borderRadius: 8, color: C.parchment, paddingHorizontal: 10, textAlign: hiza(rtl), fontFamily: F.display }} />
      <CizgiDugme etiket={t(durum.hami.hamiOlabilir ? "onl.topluluk.hami.teklifVer" : "onl.topluluk.hami.iste")} icon="handshake" rtl={rtl} kapali={yukleniyor || !/^o[1-9][0-9]{0,8}$/.test(hedefId.trim())}
        onPress={() => void gonder(() => istemci.hami({ islem: durum.hami.hamiOlabilir ? "teklif" : "iste", hedef: hedefId.trim(), istekNo: istekNoUret() }), t("onl.topluluk.hami.gonderildi"))} />
    </Cerceve> : null}
    <Baslik2 metin={t("onl.topluluk.toplumsal")} rtl={rtl} />
    {durum ? <Cerceve ic={{ padding: 12, gap: 8 }}>
      <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment, textAlign: hiza(rtl) }}>{applyParams(t("onl.topluluk.mudavim"), [durum.mudavim.rozet ? t("onl.topluluk.rozet." + durum.mudavim.rozet) : t("onl.topluluk.rozet.yok"), durum.mudavim.ziyaret])}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment, textAlign: hiza(rtl) }}>{applyParams(t("onl.topluluk.zaviye"), [durum.zaviye.kasabada.length, durum.zaviye.benim ? 1 : 0])}</Text>
    </Cerceve> : null}
    <Baslik2 metin={t("onl.topluluk.zaviye.baslik")} rtl={rtl} />
    {durum ? <>
      {durum.zaviye.davetler.map((d) => <Cerceve key={d.id} ic={{ padding: 11, gap: 8 }}>
        <Text style={{ fontFamily: F.display, color: C.parchment, textAlign: hiza(rtl) }}>{applyParams(t("onl.topluluk.zaviye.davet"), [d.ad, d.uyeSayisi])}</Text>
        <View style={{ flexDirection: yon(rtl), gap: 7 }}>
          <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.topluluk.zaviye.katil")} icon="check" rtl={rtl} kucuk kapali={yukleniyor} onPress={() => zaviyeEylem("katil", { zaviye: d.id })} /></View>
          <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.topluluk.zaviye.reddet")} icon="x" rtl={rtl} kucuk kapali={yukleniyor} onPress={() => zaviyeEylem("reddet", { zaviye: d.id })} /></View>
        </View>
      </Cerceve>)}
      {!durum.zaviye.ben ? <Cerceve ic={{ padding: 12, gap: 8 }}>
        <Text style={{ fontFamily: F.serif, color: C.parchmentDim, fontSize: 13, textAlign: hiza(rtl) }}>{t("onl.topluluk.zaviye.kurAciklama")}</Text>
        <TextInput value={zaviyeAd} onChangeText={setZaviyeAd} maxLength={28} placeholder={t("onl.topluluk.zaviye.ad")} placeholderTextColor={C.parchmentMuted}
          style={{ minHeight: 42, borderWidth: 1, borderColor: C.goldDim, borderRadius: 8, color: C.parchment, paddingHorizontal: 10, textAlign: hiza(rtl), fontFamily: F.display }} />
        <Text style={{ fontFamily: F.display, color: C.goldBright }}>{t("onl.topluluk.zaviye.sekil")}</Text>
        <Secenekler secenekler={["kalkan", "hilal", "yildiz", "lale", "ok", "cark"]} secili={zaviyeSekil} onSec={setZaviyeSekil} etiket={(v) => t("onl.topluluk.zaviye.sekil." + v)} />
        <Text style={{ fontFamily: F.display, color: C.goldBright }}>{t("onl.topluluk.zaviye.renk")}</Text>
        <Secenekler secenekler={["al", "lacivert", "yesil", "altin", "siyah", "beyaz"]} secili={zaviyeRenk} onSec={setZaviyeRenk} etiket={(v) => t("onl.topluluk.zaviye.renk." + v)} />
        <CizgiDugme etiket={t("onl.topluluk.zaviye.kur")} icon="flag" rtl={rtl} kapali={yukleniyor || zaviyeAd.trim().length < 3}
          onPress={() => zaviyeEylem("kur", { ad: zaviyeAd.trim(), sekil: zaviyeSekil, renk: zaviyeRenk })} />
      </Cerceve> : <Cerceve ic={{ padding: 12, gap: 9 }}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 9 }}>
          <Madalyon icon="flag" size={40} aktif />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, color: C.goldBright, fontSize: 15, textAlign: hiza(rtl) }}>{durum.zaviye.ben.ad}</Text>
            <Text style={{ fontFamily: F.serif, color: C.parchmentDim, fontSize: 12.5, textAlign: hiza(rtl) }}>{applyParams(t("onl.topluluk.zaviye.uyeSayisi"), [durum.zaviye.ben.uyeSayisi, durum.zaviye.ben.sinir.enCok])} · {t("onl.topluluk.zaviye.durum." + durum.zaviye.ben.durum)}</Text>
          </View>
        </View>
        <Text style={{ fontFamily: F.serif, color: C.parchmentDim, fontSize: 12.5 }}>{applyParams(t("onl.topluluk.zaviye.kasa"), [durum.zaviye.ben.kasa ?? 0])}</Text>
        <Text style={{ fontFamily: F.serif, color: C.parchmentDim, fontSize: 12.5 }}>{applyParams(t("onl.topluluk.zaviye.ahi"), [durum.zaviye.ben.ahiBasi?.ad ?? t("onl.topluluk.zaviye.bos")])}</Text>
        <Baslik2 metin={t("onl.topluluk.zaviye.uyeler")} rtl={rtl} />
        {durum.zaviye.ben.uyeler.map((u) => <View key={u.id} style={{ flexDirection: yon(rtl), justifyContent: "space-between", gap: 8 }}>
          <Text style={{ flex: 1, fontFamily: F.serif, color: C.parchment, textAlign: hiza(rtl) }}>{u.ad} · {t("onl.topluluk.zaviye.rol." + u.rol)}</Text>
          <Text style={{ fontFamily: F.serif, color: C.parchmentDim }}>{u.meslek ?? "—"}</Text>
        </View>)}
        {durum.zaviye.ben.davetler?.length ? <Text style={{ fontFamily: F.serif, color: C.parchmentDim, fontSize: 12 }}>{applyParams(t("onl.topluluk.zaviye.bekleyenDavet"), [durum.zaviye.ben.davetler.map((x) => x.ad).join(" · ")])}</Text> : null}
        <Text style={{ fontFamily: F.display, color: C.goldBright }}>{t("onl.topluluk.zaviye.kasaIslemleri")}</Text>
        <TextInput value={zaviyeTutar} onChangeText={setZaviyeTutar} keyboardType="number-pad" maxLength={4} placeholder="10" placeholderTextColor={C.parchmentMuted}
          style={{ minHeight: 40, borderWidth: 1, borderColor: C.goldDim, borderRadius: 8, color: C.parchment, paddingHorizontal: 10, textAlign: hiza(rtl), fontFamily: F.display }} />
        <View style={{ flexDirection: yon(rtl), gap: 7 }}>
          <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.topluluk.zaviye.yatir")} icon="arrow-down-to-line" rtl={rtl} kucuk kapali={yukleniyor || !/^\\d+$/.test(zaviyeTutar) || Number(zaviyeTutar) < 1} onPress={() => zaviyeEylem("yatir", { tutar: Number(zaviyeTutar) })} /></View>
          {durum.zaviye.ben.rolum === "yonetici" ? <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.topluluk.zaviye.ver")} icon="hand-coins" rtl={rtl} kucuk kapali={yukleniyor || !zaviyeHedef} onPress={() => zaviyeEylem("ver", { hedef: zaviyeHedef, tutar: Number(zaviyeTutar) })} /></View> : null}
        </View>
        {durum.zaviye.ben.rolum === "yonetici" ? <>
          <Text style={{ fontFamily: F.display, color: C.goldBright }}>{t("onl.topluluk.zaviye.uyeYonetimi")}</Text>
          <TextInput value={zaviyeHedef} onChangeText={setZaviyeHedef} autoCapitalize="none" placeholder={t("onl.topluluk.zaviye.hedefId")} placeholderTextColor={C.parchmentMuted}
            style={{ minHeight: 40, borderWidth: 1, borderColor: C.goldDim, borderRadius: 8, color: C.parchment, paddingHorizontal: 10, textAlign: hiza(rtl), fontFamily: F.display }} />
          <View style={{ flexDirection: yon(rtl), gap: 7 }}>
            <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.topluluk.zaviye.davetEt")} icon="user-plus" rtl={rtl} kucuk kapali={yukleniyor || !/^o[1-9][0-9]{0,8}$/.test(zaviyeHedef.trim())} onPress={() => zaviyeEylem("davet", { hedef: zaviyeHedef.trim() })} /></View>
            <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.topluluk.zaviye.cikar")} icon="user-minus" rtl={rtl} kucuk kapali={yukleniyor || !/^o[1-9][0-9]{0,8}$/.test(zaviyeHedef.trim())} onPress={() => zaviyeEylem("cikar", { hedef: zaviyeHedef.trim() })} /></View>
          </View>
          <Text style={{ fontFamily: F.display, color: C.goldBright }}>{t("onl.topluluk.zaviye.arma")}</Text>
          <Secenekler secenekler={["kalkan", "hilal", "yildiz", "lale", "ok", "cark"]} secili={zaviyeSekil} onSec={setZaviyeSekil} etiket={(v) => t("onl.topluluk.zaviye.sekil." + v)} />
          <Secenekler secenekler={["al", "lacivert", "yesil", "altin", "siyah", "beyaz"]} secili={zaviyeRenk} onSec={setZaviyeRenk} etiket={(v) => t("onl.topluluk.zaviye.renk." + v)} />
          <CizgiDugme etiket={t("onl.topluluk.zaviye.armaKaydet")} icon="shield" rtl={rtl} kucuk kapali={yukleniyor} onPress={() => zaviyeEylem("arma", { sekil: zaviyeSekil, renk: zaviyeRenk })} />
        </> : null}
        <Text style={{ fontFamily: F.display, color: C.goldBright }}>{t("onl.topluluk.zaviye.ahiOyu")}</Text>
        <Secenekler secenekler={durum.zaviye.ben.uyeler.map((u) => u.id)} secili={zaviyeAday} onSec={setZaviyeAday} etiket={(id) => durum.zaviye.ben?.uyeler.find((u) => u.id === id)?.ad ?? id} />
        <CizgiDugme etiket={t("onl.topluluk.zaviye.oyVer")} icon="vote" rtl={rtl} kucuk kapali={yukleniyor || !zaviyeAday} onPress={() => zaviyeEylem("oy", { hedef: zaviyeAday })} />
        <Text style={{ fontFamily: F.serif, color: C.parchmentDim, fontSize: 12 }}>{t(durum.zaviye.ahiSarti.adayim ? "onl.topluluk.zaviye.oyUygun" : "onl.topluluk.zaviye.oyKapali")}</Text>
        <CizgiDugme etiket={t("onl.topluluk.zaviye.ayril")} icon="log-out" rtl={rtl} kucuk kapali={yukleniyor} onPress={() => zaviyeEylem("ayril")} />
        {durum.zaviye.ben.kasaDefteri?.slice(-5).reverse().map((h, i) => <Text key={h.ay + h.kim + i} style={{ fontFamily: F.serif, color: C.parchmentMuted, fontSize: 11.5 }}>{applyParams(t("onl.topluluk.zaviye.defter"), [h.ay, h.kim, h.alan ?? t("onl.topluluk.zaviye.kasa"), h.tutar])}</Text>)}
      </Cerceve>}
      <Baslik2 metin={t("onl.topluluk.zaviye.kasabalar")} rtl={rtl} />
      {durum.zaviye.kasabada.map((z) => <Text key={z.id} style={{ fontFamily: F.serif, color: C.parchmentDim, fontSize: 12.5 }}>{z.ad} · {z.uyeSayisi} · {t("onl.topluluk.zaviye.durum." + z.durum)} · {z.ahiBasi ?? "—"}</Text>)}
    </> : null}
    <CizgiDugme etiket={t("onl.topluluk.yenile")} icon="refresh-cw" rtl={rtl} kucuk kapali={yukleniyor} onPress={() => void yukle()} />
  </ScrollView>;
}

export default function OnlineTopluluk() {
  return onlineEkranAcik() ? <OnlineKapisi><ToplulukEkran /></OnlineKapisi> : <OnlineYakinda />;
}
