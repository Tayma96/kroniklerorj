// Göç (D1, docs/online/ONLINE_DURUM.md §4.5): karakterin yerleşimini kalıcı değiştirmesi. Oyuncu hedefi seçer, sunucunun
// önizlemesini (kapılar, yol bedeli, taşınan/emanete kalan mal, misafirhane hakkı) görür ve iki dokunuşla onaylar.
// Göç sunucuda üç adımda, istekNo ile tekrar güvenli yürür; istemci yalnız niyeti yollar.
import { useEffect, useRef, useState } from "react";
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
import { istekTekrarMi } from "../../lib/online/hata";
import { malAdi } from "../../lib/online/ekonomi-ui";
import { useGocIstemci, type GocOnizleme } from "../../lib/online/goc-veri";
import { AltinDugme, Bant, Cerceve, CizgiDugme, GeriDugme, ONL, geriGit, hiza, yon } from "../../lib/online/ui";
import { Baslik2, OnlineSayfa, Rozet, SayfaBasi, Yukleniyor, YerlesimBekle, sahneGorseli } from "../../lib/online/yasam-ui";

function GocEkran() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const o = useOnline();
  const ist = useGocIstemci();
  const y = o.yerlesim;
  const [hedef, setHedef] = useState<string | null>(null);
  const [onizleme, setOnizleme] = useState<GocOnizleme | null>(null);
  const [hata, setHata] = useState<EkHata | null>(null);
  const [onay, setOnay] = useState(false);
  const [bekliyor, setBekliyor] = useState(false);
  // Aynı göç denemesi yeniden gönderilirse aynı istekNo gider (yanıt kaybında ikinci göç olmaz).
  const istekNo = useRef(istekNoUret());

  useEffect(() => { if (!o.dunya) void o.dunyaYukle(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!hedef) return;
    let iptal = false;
    setOnizleme(null); setHata(null); setOnay(false);
    istekNo.current = istekNoUret();
    void ist.onizle(hedef).then((r) => { if (iptal) return; if (r.ok) setOnizleme(r.deger); else setHata(r.hata); });
    return () => { iptal = true; };
  }, [hedef, ist]);

  if (!y || !o.profil) return <YerlesimBekle rtl={rtl} t={t} onGiris={() => router.replace("/online")} />;
  const kaynak = o.profil.yerlesim;
  const beylikler = o.dunya?.beylikler ?? [];
  const yerAdi = (id: string) => beylikler.flatMap((b) => b.yerlesimler).find((x) => x.id === id)?.ad ?? id;

  const gocEt = async () => {
    if (!hedef) return;
    setBekliyor(true); setHata(null);
    const r = await ist.goc({ hedef, istekNo: istekNo.current });
    setBekliyor(false);
    if (r.ok) {
      hap("success");
      await o.gocTamamlandi(r.deger.profil);
      router.replace("/online/yasam");
    } else if (istekTekrarMi(r.hata)) {
      // Göç daha önce yapılmış: güncel profil sunucudan gelir.
      router.replace("/online");
    } else { hap("error"); setHata(r.hata); setOnay(false); }
  };

  const satir = (icon: string, metin: string, renk: string = C.parchmentDim) => <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
    <GameIcon name={icon} size={14} color={C.gold} />
    <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: renk, textAlign: hiza(rtl) }}>{metin}</Text>
  </View>;
  const mallar = (m: Record<string, number>) => Object.entries(m).map(([k, n]) => `${malAdi(t, k)} ×${n}`).join(", ");

  return <OnlineSayfa gorsel={sahneGorseli(y.yerlesim.tur, y.saat.mevsim)} oran={0.3} rtl={rtl} t={t}>
    <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/karakter")} />
    <SayfaBasi ust={t("onl.goc.ust")} baslik={t("onl.goc.baslik")} alt={applyParams(t("onl.goc.alt"), [yerAdi(kaynak)])} rtl={rtl} />

    <Baslik2 metin={t("onl.goc.hedefSec")} rtl={rtl} />
    {!o.dunya ? <Yukleniyor metin={t("onl.goc.yukleniyor")} /> : <View style={{ gap: 10 }}>
      {beylikler.map((b) => <Cerceve key={b.id} ic={{ padding: 12, gap: 6 }}>
        <Text style={{ fontFamily: F.display, fontSize: 14, color: C.goldBright, textAlign: hiza(rtl) }}>{b.ad}</Text>
        {b.yerlesimler.filter((x) => x.id !== kaynak).map((x) => {
          const secili = hedef === x.id;
          return <Pressable key={x.id} accessibilityRole="radio" accessibilityState={{ selected: secili }} accessibilityLabel={`${x.ad}, ${t("onl.tur." + x.tur)}`}
            onPress={() => { hap("tap"); setHedef(x.id); }}
            style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, minHeight: 44, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: secili ? C.goldBright : ONL.frame }}>
            <GameIcon name={x.tur === "sehir" ? "castle" : x.tur === "kasaba" ? "house" : "wheat"} size={15} color={secili ? C.goldBright : C.gold} />
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, color: C.parchment, textAlign: hiza(rtl) }}>{x.ad}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 11.5, color: C.goldDim }}>{t("onl.tur." + x.tur)} · {applyParams(t("onl.goc.nufus"), [x.nufus, x.evKapasite])}</Text>
          </Pressable>;
        })}
      </Cerceve>)}
    </View>}

    {hedef ? <>
      <Baslik2 metin={applyParams(t("onl.goc.onizlemeBaslik"), [yerAdi(hedef)])} rtl={rtl} />
      {hata ? <Bant metin={t(ekHataAnahtari(hata))} rtl={rtl} /> : null}
      {!onizleme ? (hata ? null : <Yukleniyor metin={t("onl.goc.hesaplaniyor")} />) : <Cerceve aktif={onizleme.uygun} ic={{ padding: 14, gap: 10 }}>
        <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
          {onizleme.kapiSirasi.map((k) => {
            const gecti = onizleme.kapilar[k as keyof GocOnizleme["kapilar"]] !== false;
            return <Rozet key={k} icon={gecti ? "shield" : "hourglass"} metin={t("onl.goc.kapi." + k)} renk={gecti ? C.sage : C.ember} dolu={!gecti} />;
          })}
        </View>
        {onizleme.engel ? <Bant metin={t(ekHataAnahtari(onizleme.engel as EkHata))} rtl={rtl} /> : null}
        {satir("coins", applyParams(t("onl.goc.akce"), [onizleme.akce.yolBedeli, onizleme.akce.tasinan]))}
        {satir("backpack", applyParams(t("onl.goc.envanter"), [onizleme.envanter.tasinanAdet, onizleme.envanter.sinir]))}
        {onizleme.envanter.emanetAdet > 0 ? satir("scroll", applyParams(t("onl.goc.emanet"), [mallar(onizleme.envanter.emanet)]), C.emberSoft) : null}
        {satir("house", onizleme.misafirhane.kullanildi ? t("onl.goc.misafirhaneYok") : applyParams(t("onl.goc.misafirhane"), [onizleme.misafirhane.saat]))}
        {satir("compass", applyParams(t("onl.goc.soguma"), [onizleme.soguma.sure]))}
        <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.goc.tasinanBaslik")}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{onizleme.tasinanlar.map((x) => t("onl.goc.tasinan." + x)).join(" · ")}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.goc.kalanBaslik")}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{onizleme.kalanlar.map((x) => t("onl.goc.kalan." + x)).join(" · ")}</Text>
        {!onay ? <CizgiDugme etiket={t("onl.goc.devam")} icon="camel" rtl={rtl} kapali={!onizleme.uygun || bekliyor} onPress={() => setOnay(true)} /> : <>
          <Bant tur="bilgi" metin={applyParams(t("onl.goc.onaySor"), [yerAdi(hedef)])} rtl={rtl} />
          <AltinDugme etiket={t("onl.goc.onayla")} icon="camel" rtl={rtl} bekliyor={bekliyor} onPress={() => { void gocEt(); }} />
          <CizgiDugme etiket={t("onl.goc.vazgec")} rtl={rtl} kucuk kapali={bekliyor} onPress={() => setOnay(false)} />
        </>}
        {ist.sahte ? <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.goc.sahte")}</Text> : null}
      </Cerceve>}
    </> : null}
  </OnlineSayfa>;
}
export default function OnlineGoc() { return onlineEkranAcik() ? <OnlineKapisi><GocEkran /></OnlineKapisi> : <OnlineYakinda />; }
