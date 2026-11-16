// Kervan (D2, docs/online/ONLINE_DURUM.md §4.7): tüccar başka yerleşime mal yollar; mal yolda bir oyun ayı gider, varışta
// hedefin fiyatı ve tüccarın varış kotasıyla satılır, satılmayan geri döner. Fiyat haberi komşu çarşıların en pahalı
// mallarını gösterir. Kapılar, bedel ve tahmin sunucuda; istemci seçimi yollar.
import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { hap } from "../../lib/haptics";
import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi, useOnline } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { istekNoUret } from "../../lib/online/depo";
import { ekHataAnahtari, type EkHata } from "../../lib/online/ek-istemci";
import { malAdi } from "../../lib/online/ekonomi-ui";
import { useKervanIstemci, type KervanHaberi, type KervanOnizleme } from "../../lib/online/kervan-veri";
import { AltinDugme, Bant, Cerceve, CizgiDugme, GeriDugme, ONL, geriGit, hiza, yon } from "../../lib/online/ui";
import { Baslik2, BosKart, OnlineSayfa, Rozet, SayfaBasi, YerlesimBekle, sahneGorseli } from "../../lib/online/yasam-ui";

function KervanEkran() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const o = useOnline();
  const ist = useKervanIstemci();
  const y = o.yerlesim;
  const [genel, setGenel] = useState<KervanOnizleme | null>(null);
  const [hedef, setHedef] = useState<string | null>(null);
  const [yuk, setYuk] = useState<Record<string, number>>({});
  const [onizleme, setOnizleme] = useState<KervanOnizleme | null>(null);
  const [haber, setHaber] = useState<KervanHaberi | null>(null);
  const [hata, setHata] = useState<EkHata | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const istekNo = useRef(istekNoUret());

  const genelYukle = useCallback(async () => {
    const r = await ist.onizle();
    if (r.ok) { setGenel(r.deger); if (r.deger.haber) setHaber(r.deger.haber); }
  }, [ist]);
  useEffect(() => { void genelYukle(); if (!o.dunya) void o.dunyaYukle(); }, [genelYukle]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!hedef) return;
    let iptal = false;
    const z = setTimeout(() => { void ist.onizle(hedef, yuk).then((r) => { if (iptal) return; if (r.ok) { setOnizleme(r.deger); setHata(null); } else setHata(r.hata); }); }, 250);
    return () => { iptal = true; clearTimeout(z); };
  }, [hedef, yuk, ist]);

  if (!y || !o.profil) return <YerlesimBekle rtl={rtl} t={t} onGiris={() => router.replace("/online")} />;
  const beylikler = o.dunya?.beylikler ?? [];
  const yerAdi = (id: string) => beylikler.flatMap((b) => b.yerlesimler).find((x) => x.id === id)?.ad ?? id;
  const envanter = Object.entries(o.envanter ?? {}).filter((e): e is [string, number] => (e[1] ?? 0) > 0);
  const adet = Object.values(yuk).reduce((s, n) => s + n, 0);
  const tavan = onizleme?.yuk?.tavan ?? 12;
  const degistir = (mal: string, d: number, eldeki: number) => setYuk((u) => {
    const yeni = Math.max(0, Math.min(eldeki, (u[mal] ?? 0) + d));
    if (d > 0 && adet >= tavan) return u;
    const k = { ...u, [mal]: yeni };
    if (!yeni) delete k[mal];
    return k;
  });

  const yolla = async () => {
    if (!hedef || !adet) return;
    setBekliyor(true); setHata(null); setBilgi(null);
    const r = await ist.yolla({ hedef, mallar: yuk, istekNo: istekNo.current });
    setBekliyor(false);
    if (r.ok) {
      hap("success");
      setBilgi(applyParams(t("onl.kv.yolaCikti"), [yerAdi(r.deger.kervan.hedef), r.deger.kervan.varisAyi]));
      setYuk({}); istekNo.current = istekNoUret();
      void o.yerlesimYukle(true); void genelYukle();
    } else { hap("error"); setHata(r.hata); }
  };
  const haberAl = async () => {
    setBekliyor(true);
    const r = await ist.haber({ istekNo: istekNoUret() });
    setBekliyor(false);
    if (r.ok) { hap("success"); setHaber(r.deger.haber); void o.yerlesimYukle(true); } else setHata(r.hata);
  };
  const satir = (icon: string, metin: string) => <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
    <GameIcon name={icon} size={14} color={C.gold} />
    <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{metin}</Text>
  </View>;
  const mallar = (m: Record<string, number>) => Object.entries(m).map(([k, n]) => `${malAdi(t, k)} ×${n}`).join(", ");

  return <OnlineSayfa gorsel={sahneGorseli(y.yerlesim.tur, y.saat.mevsim)} oran={0.3} rtl={rtl} t={t}>
    <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/sokak")} />
    <SayfaBasi ust={t("onl.goc.ust")} baslik={t("onl.kv.baslik")} alt={t("onl.kv.alt")} rtl={rtl} />

    <Baslik2 metin={t("onl.kv.yolda")} rtl={rtl} />
    {genel?.yolda.length ? <View style={{ gap: 8 }}>{genel.yolda.map((k) => <Cerceve key={k.id} ic={{ padding: 12, gap: 4 }}>
      {satir("camel", applyParams(t("onl.kv.yoldaSatir"), [yerAdi(k.hedef), k.varisAyi]))}
      <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{mallar(k.mallar)}</Text>
    </Cerceve>)}</View> : <BosKart icon="camel" metin={t("onl.kv.yoldaBos")} rtl={rtl} />}

    <Baslik2 metin={t("onl.kv.haberBaslik")} rtl={rtl} />
    <Cerceve ic={{ padding: 12, gap: 8 }}>
      {haber ? haber.yerlesimler.map((f) => <View key={f.yerlesim} style={{ gap: 3 }}>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.goldBright, textAlign: hiza(rtl) }}>{yerAdi(f.yerlesim)}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>
          {f.pahali.map((p) => `${malAdi(t, p.mal)} ${p.alis.toplam}`).join(" · ") || t("onl.kv.haberSakin")}
        </Text>
      </View>) : <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.kv.haberYok")}</Text>}
      {haber ? <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{applyParams(t("onl.kv.haberGecerli"), [haber.gecerli])}</Text> : null}
      <CizgiDugme etiket={t("onl.kv.haberAl")} icon="scroll" rtl={rtl} kucuk kapali={bekliyor} onPress={() => { void haberAl(); }} />
    </Cerceve>

    <Baslik2 metin={t("onl.kv.yeni")} rtl={rtl} />
    <View style={{ gap: 8 }}>
      {beylikler.map((b) => <Cerceve key={b.id} ic={{ padding: 10, gap: 4 }}>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.goldBright, textAlign: hiza(rtl) }}>{b.ad}</Text>
        <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
          {b.yerlesimler.filter((x) => x.id !== o.profil?.yerlesim).map((x) => <Pressable key={x.id} accessibilityRole="radio" accessibilityState={{ selected: hedef === x.id }} accessibilityLabel={x.ad}
            onPress={() => { hap("tap"); setHedef(x.id); }}
            style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 12, borderRadius: 22, borderWidth: 1.5, borderColor: hedef === x.id ? C.goldBright : ONL.frame }}>
            <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{x.ad}</Text>
          </Pressable>)}
        </View>
      </Cerceve>)}
    </View>

    {hedef ? <>
      <Baslik2 metin={applyParams(t("onl.kv.yukBaslik"), [adet, tavan])} rtl={rtl} />
      {envanter.length ? <View style={{ gap: 6 }}>{envanter.map(([mal, eldeki]) => <View key={mal} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, minHeight: 44 }}>
        <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, color: C.parchment, textAlign: hiza(rtl) }}>{malAdi(t, mal)} <Text style={{ color: C.parchmentMuted }}>({eldeki})</Text></Text>
        <CizgiDugme etiket="−" rtl={rtl} kucuk kapali={!yuk[mal]} onPress={() => degistir(mal, -1, eldeki)} />
        <Text style={{ minWidth: 26, textAlign: "center", fontFamily: F.display, fontSize: 14, color: C.goldBright }}>{yuk[mal] ?? 0}</Text>
        <CizgiDugme etiket="+" rtl={rtl} kucuk kapali={(yuk[mal] ?? 0) >= eldeki || adet >= tavan} onPress={() => degistir(mal, 1, eldeki)} />
      </View>)}</View> : <BosKart icon="backpack" metin={t("onl.kv.envanterBos")} rtl={rtl} />}

      {onizleme ? <Cerceve aktif={!!onizleme.uygun} ic={{ padding: 12, gap: 8, marginTop: 8 }}>
        <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
          {Object.entries(onizleme.kapilar ?? {}).filter(([, v]) => v !== null).map(([k, v]) =>
            <Rozet key={k} icon={v ? "shield" : "hourglass"} metin={t("onl.kv.kapi." + k)} renk={v ? C.sage : C.ember} dolu={!v} />)}
        </View>
        {onizleme.engel ? <Bant metin={t(ekHataAnahtari(onizleme.engel as EkHata))} rtl={rtl} /> : null}
        {onizleme.bedel ? satir("anvil", applyParams(t("onl.kv.bedel"), [onizleme.bedel.nal, onizleme.bedel.kosum, onizleme.bedel.takat])) : null}
        {onizleme.varisAyi ? satir("compass", applyParams(t("onl.kv.varis"), [onizleme.hedefAd ?? yerAdi(hedef), onizleme.varisAyi])) : null}
        {onizleme.tahmin && adet ? satir("coins", applyParams(t("onl.kv.tahmin"), [onizleme.tahmin.hasilat, onizleme.tahmin.satilan, onizleme.tahmin.kalan])) : null}
        {onizleme.aylik ? satir("hourglass", applyParams(t("onl.kv.aylik"), [onizleme.aylik.kullanilan, onizleme.aylik.tavan])) : null}
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, lineHeight: 17, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.kv.not")}</Text>
        <AltinDugme etiket={t("onl.kv.yolla")} icon="camel" rtl={rtl} bekliyor={bekliyor} kapali={!onizleme.uygun || !adet} onPress={() => { void yolla(); }} />
      </Cerceve> : null}
    </> : null}
    {bilgi ? <View style={{ marginTop: 8 }}><Bant tur="bilgi" metin={bilgi} rtl={rtl} /></View> : null}
    {hata ? <View style={{ marginTop: 8 }}><Bant metin={t(ekHataAnahtari(hata))} rtl={rtl} /></View> : null}
    {ist.sahte ? <Text style={{ marginTop: 8, fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.goc.sahte")}</Text> : null}
  </OnlineSayfa>;
}
export default function OnlineKervan() { return onlineEkranAcik() ? <OnlineKapisi><KervanEkran /></OnlineKapisi> : <OnlineYakinda />; }
