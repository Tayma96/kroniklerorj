// Oyuncu pazarı tahtası (Faz 6; GET /v1/pazar, POST /v1/pazar/ilan|islem|geri): açık satış ve alım ilanları, her
// ilanda NPC fiyatıyla görünür karşılaştırma dökümü, mal özeti, kendi ilanlarım (emanet ve geri alma), ilan verme.
// Kurallar (bac, ilan sınırı, süre, armağan tavanı) ekranda açıkça yazılır. Tutar, bac, net ve hediye payını sunucu
// hesaplar; istemci yalnız niyet gönderir.
import { useCallback, useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { hap } from "../../lib/haptics";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi, useOnline } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { AltinDugme, Bant, Cerceve, CizgiDugme, GeriDugme, Madalyon, geriGit, giris, hiza, yon } from "../../lib/online/ui";
import { AltPanel, Baslik2, BosKart, Degisim, Hap, OnlineSayfa, Rozet, SayfaBasi, YerlesimBekle, Yukleniyor, sahneGorseli } from "../../lib/online/yasam-ui";
import { Sayac, Secenekler } from "../../lib/online/toplum-ui";
import { ekHataAnahtari, type EkHata } from "../../lib/online/ek-istemci";
import { istekTekrarMi } from "../../lib/online/hata";
import { istekNoUret } from "../../lib/online/depo";
import { MALLAR, NPC_MALLARI } from "../../lib/online/meslek-veri";
import { KaliteRozeti, KarsilastirmaDokumu, kaliteAdi, malAdi, malIkonu } from "../../lib/online/ekonomi-ui";
import { useEkonomiIstemci, type IlanGorunumu, type IlanTuru, type Kademe4, type PazarIslemYaniti, type PazarYaniti } from "../../lib/online/ekonomi-veri";

type Ceviri = (k: string) => string;
const KALITELER: readonly ("0" | "1" | "2" | "3")[] = ["0", "1", "2", "3"];

function IlanKarti({ x, t, rtl, onIslem, onGeri, bekliyor }: { x: IlanGorunumu; t: Ceviri; rtl: boolean; onIslem?: () => void; onGeri?: () => void; bekliyor?: boolean }) {
  const [dokum, setDokum] = useState(false);
  const acik = x.durum === "acik";
  const satis = x.tur === "sat";
  return <View style={{ opacity: acik ? 1 : 0.6 }}>
    <Cerceve aktif={acik && !x.benim} ic={{ padding: 12, gap: 9 }}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
        <Madalyon icon={malIkonu(x.mal)} size={44} aktif={acik} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: 15.5, lineHeight: 20, color: C.parchment, textAlign: hiza(rtl) }}>
            {applyParams(t(satis ? "onl.pz.satiyor" : "onl.pz.aliyor"), [x.kalan, malAdi(t, x.mal)])}
          </Text>
          <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchmentDim, textAlign: hiza(rtl) }}>{x.benim ? t("onl.pz.senin") : x.sahip.ad}</Text>
        </View>
        <View style={{ alignItems: rtl ? "flex-start" : "flex-end" }}>
          <Text style={{ fontFamily: F.display, fontSize: 17, color: C.goldBright }}>{x.birimFiyat}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 11.5, color: C.parchmentMuted }}>{t("onl.pz.birim")}</Text>
        </View>
      </View>
      <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
        <Rozet icon={satis ? "coins" : "scales"} metin={t(satis ? "onl.pz.tur.sat" : "onl.pz.tur.al")} renk={satis ? C.gold : C.sage} />
        <KaliteRozeti kademe={x.kademe} />
        {acik ? <Rozet icon="hourglass" metin={applyParams(t("onl.pz.kalanAy"), [x.kalanAy])} renk={x.kalanAy <= 1 ? C.ember : C.gold} />
          : <Rozet metin={t("onl.pz.durum." + x.durum)} renk={C.parchmentMuted} />}
        {x.karsilastirma.tabanOrani !== null ? <Rozet metin={applyParams(t("onl.pz.oran"), [x.karsilastirma.tabanOrani])} renk={x.karsilastirma.tabanOrani > 150 ? C.ember : C.parchmentDim} /> : null}
      </View>
      {x.yapanlar.length ? <Text numberOfLines={2} style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.gold, textAlign: hiza(rtl) }}>{applyParams(t("onl.eko.yapan"), [x.yapanlar.join(", ")])}</Text> : null}
      {x.benim && acik ? <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim, textAlign: hiza(rtl) }}>
        {satis ? applyParams(t("onl.pz.emanetMal"), [x.emanet.adet]) : applyParams(t("onl.pz.emanetAkce"), [x.emanet.akce])}
      </Text> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: dokum }} accessibilityLabel={t("onl.pz.dokum")} onPress={() => { hap("selection"); setDokum(!dokum); }}
        style={{ minHeight: 44, flexDirection: yon(rtl), alignItems: "center", gap: 6 }}>
        <GameIcon name="scales" size={14} color={C.gold} />
        <Text style={{ flex: 1, fontFamily: F.display, fontSize: 12.5, color: C.gold, textAlign: hiza(rtl) }}>{t(dokum ? "onl.pz.dokumGizle" : "onl.pz.dokum")}</Text>
      </Pressable>
      {dokum ? <KarsilastirmaDokumu k={x.karsilastirma} /> : null}
      {acik && onIslem ? <AltinDugme etiket={t(satis ? "onl.pz.al" : "onl.pz.sat")} icon={satis ? "coins" : "scales"} rtl={rtl} bekliyor={bekliyor} onPress={onIslem} /> : null}
      {acik && onGeri ? <CizgiDugme etiket={t("onl.pz.geri")} icon="scroll" rtl={rtl} kucuk onPress={onGeri} /> : null}
    </Cerceve>
  </View>;
}

function PazarEkran() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const o = useOnline();
  const ist = useEkonomiIstemci();
  const y = o.yerlesim;
  const sahte = o.oturum?.tur === "gelistirici";
  const [p, setP] = useState<PazarYaniti | null>(null);
  const [yukHata, setYukHata] = useState<EkHata | null>(null);
  const [mal, setMal] = useState<string | null>(null);
  const [secili, setSecili] = useState<IlanGorunumu | null>(null);
  const [adet, setAdet] = useState(1);
  const [sonuc, setSonuc] = useState<PazarIslemYaniti["islem"] | null>(null);
  const [form, setForm] = useState(false);
  const [f, setF] = useState<{ tur: IlanTuru; mal: string | null; kalite: Kademe4; adet: number; fiyat: number; sure: number }>({ tur: "sat", mal: null, kalite: 0, adet: 1, fiyat: 2, sure: 2 });
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);

  const yukle = useCallback(async () => {
    const r = await ist.pazar();
    if (r.ok) { setP(r.deger); setYukHata(null); } else setYukHata(r.hata);
  }, [ist]);
  useEffect(() => { void yukle(); }, [yukle]);
  if (!y) return <YerlesimBekle rtl={rtl} t={t} onGiris={() => router.replace("/online")} />;

  const sonra = async () => { await yukle(); if (!sahte) void o.yerlesimYukle(true); };
  const islem = async () => {
    if (!secili) return;
    setBekliyor(true); setHata(null);
    const r = await ist.islem({ ilan: secili.id, adet, istekNo: istekNoUret() });
    setBekliyor(false);
    if (r.ok) { hap("success"); setSecili(null); setSonuc(r.deger.islem); void sonra(); }
    // istek_tekrar: işlem daha önce yapılmış; hata değil, tahta sunucudan tazelenir.
    else if (istekTekrarMi(r.hata)) { setSecili(null); void sonra(); }
    else { hap("error"); setHata(t(ekHataAnahtari(r.hata))); }
  };
  const ilanVer = async () => {
    if (!f.mal) return;
    setBekliyor(true); setHata(null);
    const r = await ist.ilan({ tur: f.tur, mal: f.mal, adet: f.adet, fiyat: f.fiyat, sure: f.sure, kalite: f.kalite, istekNo: istekNoUret() });
    setBekliyor(false);
    if (r.ok) { hap("success"); setForm(false); void sonra(); }
    else if (istekTekrarMi(r.hata)) { setForm(false); void sonra(); }
    else { hap("error"); setHata(t(ekHataAnahtari(r.hata))); }
  };
  const geri = async (id: string) => {
    setHata(null);
    const r = await ist.geri({ ilan: id, istekNo: istekNoUret() });
    if (r.ok) { hap("success"); void sonra(); }
    else if (istekTekrarMi(r.hata)) void sonra();
    else { hap("error"); setHata(t(ekHataAnahtari(r.hata))); }
  };

  const ev = o.envanter ?? y.ben.envanter ?? {};
  const ilanlar = (p?.ilanlar ?? []).filter((x) => !x.benim && (!mal || x.mal === mal));
  const mallar = [...new Set((p?.ozet ?? []).map((x) => x.mal))];
  const formMallari: string[] = f.tur === "sat" ? Object.keys(ev).filter((m) => (ev[m as keyof typeof ev] ?? 0) > 0 && (MALLAR as Record<string, { taban: number }>)[m]?.taban > 0) : [...NPC_MALLARI];
  const taban = f.mal ? (MALLAR as Record<string, { taban: number }>)[f.mal]?.taban : undefined;
  const k = p?.kurallar;

  const islemPaneli = <AltPanel acik={!!secili || !!sonuc || form} onKapat={() => { setSecili(null); setSonuc(null); setForm(false); setHata(null); }} etiket={t("onl.pz.baslik")} rtl={rtl} t={t}>
    {secili ? <>
      <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 19, color: C.goldBright, textAlign: "center" }}>
        {applyParams(t(secili.tur === "sat" ? "onl.pz.alBaslik" : "onl.pz.satBaslik"), [malAdi(t, secili.mal), secili.sahip.ad])}
      </Text>
      <Sayac etiket={t("onl.pz.adet")} deger={adet} en={1} cok={secili.kalan} onDegis={setAdet} />
      <View style={{ flexDirection: yon(rtl), justifyContent: "space-between" }}>
        <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentDim }}>{applyParams(t("onl.pz.toplamFiyat"), [adet, secili.birimFiyat])}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.goldBright }}>{applyParams(t("onl.is.akce"), [adet * secili.birimFiyat])}</Text>
      </View>
      <KarsilastirmaDokumu k={secili.karsilastirma} />
      <Text style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{applyParams(t("onl.pz.bacNot"), [Math.round((k?.bacOrani ?? 0.05) * 100)])}</Text>
      {hata ? <Bant metin={hata} rtl={rtl} /> : null}
      <AltinDugme etiket={t(secili.tur === "sat" ? "onl.pz.al" : "onl.pz.sat")} icon="coins" rtl={rtl} bekliyor={bekliyor} onPress={() => { void islem(); }} />
    </> : sonuc ? <>
      <View style={{ alignItems: "center", gap: 8 }}>
        <Madalyon icon="scales" size={60} aktif />
        <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={{ fontFamily: F.display, fontSize: 20, color: C.goldBright, textAlign: "center" }}>{t("onl.pz.tamam")}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentDim, textAlign: "center" }}>{`${sonuc.adet} × ${malAdi(t, sonuc.ilan.mal)} · ${kaliteAdi(t, ["sade", "iyi", "ustun", "saheser"].indexOf(sonuc.kalite))}`}</Text>
      </View>
      <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
        <Degisim icon="coins" metin={applyParams(t("onl.pz.s.tutar"), [sonuc.tutar])} olumlu={sonuc.ilan.tur === "al"} />
        <Degisim icon="castle" metin={applyParams(t("onl.pz.s.bac"), [sonuc.bac])} olumlu={false} />
        <Degisim icon="coins" metin={applyParams(t("onl.pz.s.net"), [sonuc.net])} olumlu />
        {sonuc.pompa.hediye > 0 ? <Degisim icon="gems" metin={applyParams(t("onl.pz.s.hediye"), [sonuc.pompa.hediye])} olumlu={false} /> : null}
      </View>
      <AltinDugme etiket={t("onl.is.tamam")} rtl={rtl} onPress={() => setSonuc(null)} />
    </> : form ? <>
      <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 19, color: C.goldBright, textAlign: "center" }}>{t("onl.pz.ilanVer")}</Text>
      <Secenekler secenekler={["sat", "al"] as const} secili={f.tur} onSec={(s) => setF({ ...f, tur: s, mal: null })} etiket={(s) => t("onl.pz.tur." + s)} />
      {formMallari.length ? <Secenekler secenekler={formMallari} secili={f.mal} onSec={(m) => setF({ ...f, mal: m, fiyat: Math.max(1, (MALLAR as Record<string, { taban: number }>)[m]?.taban ?? 1) })} etiket={(m) => malAdi(t, m)} ikon={malIkonu} />
        : <BosKart icon="backpack" metin={t("onl.pz.ambarBos")} rtl={rtl} />}
      <Secenekler secenekler={KALITELER} secili={String(f.kalite) as "0"} onSec={(q) => setF({ ...f, kalite: Number(q) as Kademe4 })} etiket={(q) => kaliteAdi(t, Number(q))} />
      <Sayac etiket={t("onl.pz.adet")} deger={f.adet} en={1} cok={f.tur === "sat" && f.mal ? Math.max(1, Math.min(k?.adetEnCok ?? 50, ev[f.mal as keyof typeof ev] ?? 1)) : k?.adetEnCok ?? 50} onDegis={(n) => setF({ ...f, adet: n })} />
      <Sayac etiket={t("onl.pz.birimFiyat")} deger={f.fiyat} en={1} cok={100_000} onDegis={(n) => setF({ ...f, fiyat: n })} />
      <Sayac etiket={t("onl.pz.sure")} deger={f.sure} en={1} cok={k?.sureEnCok ?? 3} onDegis={(n) => setF({ ...f, sure: n })} birim={t("onl.pz.ay")} />
      {taban !== undefined ? <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.pz.tabanBilgi"), [taban])}</Text> : null}
      <Text style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t(f.tur === "sat" ? "onl.pz.emanetNotSat" : "onl.pz.emanetNotAl")}</Text>
      {hata ? <Bant metin={hata} rtl={rtl} /> : null}
      <AltinDugme etiket={t("onl.pz.ilanAc")} icon="scroll-open" rtl={rtl} kapali={!f.mal} bekliyor={bekliyor} onPress={() => { void ilanVer(); }} />
    </> : null}
  </AltPanel>;

  return <OnlineSayfa gorsel={sahneGorseli(y.yerlesim.tur, y.saat.mevsim)} oran={0.3} rtl={rtl} t={t} alt={islemPaneli}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 6 }}>
      <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/yasam")} />
      <View style={{ flex: 1 }} />
      <Hap icon="coins" metin={String(y.ben.para)} erisim={applyParams(t("onl.ya.paraErisim"), [y.ben.para])} />
    </View>
    <View style={{ marginTop: 8 }}>
      <SayfaBasi ust={y.yerlesim.ad} baslik={t("onl.pz.baslik")} alt={t("onl.pz.alt")} rtl={rtl} />
    </View>

    {k && p ? <View style={{ marginTop: 14, padding: 12, gap: 6, borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,162,78,0.3)", backgroundColor: "rgba(14,10,6,0.82)" }}>
      <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 1.2, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.pz.kurallar")}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>
        {applyParams(t("onl.pz.kuralMetni"), [Math.round(k.bacOrani * 100), k.ilanEnCok, k.sureEnCok, k.adetEnCok])}
      </Text>
      <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>
        {applyParams(t("onl.pz.pompaMetni"), [Math.round(k.adilBant.alt * 100), Math.round(k.adilBant.ust * 100), p.armaganKalan.verme, p.armaganKalan.alma])}
      </Text>
      {p.emanet > 0 ? <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold, textAlign: hiza(rtl) }}>{applyParams(t("onl.pz.emanetToplam"), [p.emanet])}</Text> : null}
    </View> : null}

    <View style={{ marginTop: 12 }}>
      <AltinDugme etiket={t("onl.pz.ilanVer")} icon="scroll-open" rtl={rtl} onPress={() => { setHata(null); setForm(true); }} />
    </View>

    {p?.ozet.length ? <>
      <Baslik2 metin={t("onl.pz.ozet")} rtl={rtl} />
      <Cerceve ic={{ paddingHorizontal: 12, paddingVertical: 4 }}>
        {p.ozet.map((z, i) => <View key={z.mal} accessible style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, minHeight: 44, paddingVertical: 4, borderTopWidth: i ? 1 : 0, borderColor: "rgba(201,162,78,0.12)" }}>
          <GameIcon name={malIkonu(z.mal)} size={16} color={C.gold} />
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, color: C.parchment, textAlign: hiza(rtl) }}>{malAdi(t, z.mal)}</Text>
          <Text numberOfLines={2} style={{ flexShrink: 1, maxWidth: "62%", fontFamily: F.serif, fontSize: 12.5, lineHeight: 16, color: C.parchmentDim, textAlign: rtl ? "left" : "right" }}>
            {applyParams(t("onl.pz.ozetSatir"), [z.npcdenAlis, z.enUcuzSatis ?? "—", z.enYuksekAlim ?? "—"])}
          </Text>
        </View>)}
      </Cerceve>
    </> : null}

    <Baslik2 metin={t("onl.pz.ilanlar")} rtl={rtl} sag={p ? <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>{ilanlar.length}</Text> : undefined} />
    {mallar.length > 1 ? <View style={{ marginBottom: 10 }}>
      <Secenekler secenekler={["*", ...mallar]} secili={mal ?? "*"} onSec={(m) => setMal(m === "*" ? null : m)} etiket={(m) => (m === "*" ? t("onl.pz.hepsi") : malAdi(t, m))} />
    </View> : null}
    {yukHata && !p ? <Bant metin={t(ekHataAnahtari(yukHata))} rtl={rtl} eylem={t("onl.yenidenDene")} onEylem={() => { void yukle(); }} />
      : !p ? <Yukleniyor metin={t("onl.pz.yukleniyor")} />
      : ilanlar.length ? <View style={{ gap: 10 }}>
        {ilanlar.map((x, n) => <Animated.View key={x.id} entering={giris(n * 40)}>
          <IlanKarti x={x} t={t} rtl={rtl} onIslem={() => { setHata(null); setAdet(1); setSecili(x); }} />
        </Animated.View>)}
      </View> : <BosKart icon="scales" metin={t("onl.pz.bos")} rtl={rtl} />}

    {p?.benim.length ? <>
      <Baslik2 metin={t("onl.pz.benim")} rtl={rtl} />
      {hata && !form && !secili ? <Bant metin={hata} rtl={rtl} /> : null}
      <View style={{ gap: 10 }}>
        {p.benim.map((x) => <IlanKarti key={x.id} x={x} t={t} rtl={rtl} onGeri={() => { void geri(x.id); }} />)}
      </View>
    </> : null}

    <View style={{ marginTop: 22, gap: 8 }}>
      <CizgiDugme etiket={t("onl.eko.ismarlama")} icon="scroll" rtl={rtl} kucuk onPress={() => router.push("/online/ismarlama")} />
      <CizgiDugme etiket={t("onl.eko.defter")} icon="book" rtl={rtl} kucuk onPress={() => router.push("/online/defter")} />
    </View>
  </OnlineSayfa>;
}

export default function OnlinePazar() {
  return onlineEkranAcik() ? <OnlineKapisi><PazarEkran /></OnlineKapisi> : <OnlineYakinda />;
}
