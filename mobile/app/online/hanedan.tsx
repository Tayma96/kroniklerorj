// Hanedan (Faz 7, GET /v1/hanedan): soy ağacı (atalar, sen ve eşin, çocuklar, kardeş ve yeğenler), vâris adayları,
// vasiyet (vâris ve yüzde paylar), son günler uyarısı, devir önizlemesi ve devir (önizlenen planın karmasıyla), NPC ile
// evlilik ve yerleşim kroniğine geçiş. Pay, vergi, nam ve kronik satırı sunucunun planıdır; istemci yalnız gösterir.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { hap } from "../../lib/haptics";
import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { istekNoUret } from "../../lib/online/depo";
import { AltinDugme, Bant, Cerceve, CizgiDugme, GeriDugme, ONL, geriGit, hiza, yon } from "../../lib/online/ui";
import { AltPanel, Baslik2, BosKart, GorusOlcegi, KisiYuzu, OnlineSayfa, Rozet, SayfaBasi, YerlesimBekle, Yukleniyor, useYerlesimEkrani } from "../../lib/online/yasam-ui";
import { ayTakvimi, ekHataAnahtari, type EkHata } from "../../lib/online/ek-istemci";
import { meslekYaz, ozetYaz } from "../../lib/online/metin";
import {
  UZAK, VAKIF, VASIYET_PAY_EN_COK, useHanedanIstemci,
  type DevirKalemi, type DevirOnizleme, type HanedanGorunumu, type HanedanKisi, type VasiyetPayi,
} from "../../lib/online/hanedan-veri";
import type { Dil } from "../../lib/online/protokol";
import type { Lang } from "../../lib/locale-data";

const EV_GORSEL = require("../../assets/arka/ev_varlikli.jpg");
type Ceviri = (k: string) => string;
const NAM_SIRASI = ["comertlik", "dindarlik", "mertlik", "caliskanlik"] as const;

function KisiKutusu({ k, rol, vurgu, rtl, genislik }: { k: { id: string; ad: string; yas?: number; cinsiyet?: "erkek" | "kadın" }; rol: string; vurgu?: boolean; rtl: boolean; genislik: number }) {
  return <View accessible accessibilityLabel={`${rol}: ${k.ad}${k.yas !== undefined ? ", " + k.yas : ""}`}
    style={{ width: genislik, alignItems: "center", gap: 4, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 10, borderWidth: 1, borderColor: vurgu ? C.goldBright : "rgba(168,130,63,0.45)", backgroundColor: vurgu ? "rgba(70,50,22,0.85)" : "rgba(14,10,6,0.72)" }}>
    <KisiYuzu id={k.id} ad={k.ad} boyut={40} yas={k.yas} cinsiyet={k.cinsiyet} ben={vurgu} />
    <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: 11.5, lineHeight: 14, color: C.parchment, textAlign: "center" }}>{k.ad}</Text>
    <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentDim, textAlign: hiza(rtl) }}>{k.yas !== undefined ? `${rol} · ${k.yas}` : rol}</Text>
  </View>;
}

const Cizgi = () => <View accessible={false} style={{ alignSelf: "center", width: 2, height: 16, backgroundColor: "rgba(201,162,78,0.55)" }} />;

function HanedanEkran() {
  const router = useRouter();
  const { t, rtl, lang } = useI18n();
  const { width } = useWindowDimensions();
  const dar = width < 360;
  const o = useYerlesimEkrani();
  const y = o.yerlesim;
  const istemci = useHanedanIstemci();
  const dil = lang as Dil;
  const [h, setH] = useState<HanedanGorunumu | null>(null);
  const [hata, setHata] = useState<EkHata | null>(null);
  const [islemHata, setIslemHata] = useState<EkHata | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const [panel, setPanel] = useState<null | "vasiyet" | "devir" | "evlilik">(null);
  const [onizleme, setOnizleme] = useState<DevirOnizleme | null>(null);
  const [onizHata, setOnizHata] = useState<EkHata | null>(null);
  const [secilenVaris, setSecilenVaris] = useState<string | null>(null);
  const [vVaris, setVVaris] = useState<string | null>(null);
  const [vPaylar, setVPaylar] = useState<VasiyetPayi[]>([]);
  const [esAdayi, setEsAdayi] = useState<string | null>(null);
  const istekNo = useRef(istekNoUret());

  const yukle = useCallback(async () => {
    const s = await istemci.hanedan(dil);
    if (s.ok) { setH(s.deger); setHata(null); } else setHata(s.hata);
  }, [istemci, dil]);
  useEffect(() => { if (y) void yukle(); }, [!!y, yukle]); // eslint-disable-line react-hooks/exhaustive-deps

  const adlar = useMemo(() => {
    const m = new Map<string, string>();
    if (!h) return m;
    for (const k of [...h.cocuklar, ...h.kardesler, ...h.yegenler]) m.set(k.id, k.ad);
    if (h.es) m.set(h.es.id, h.es.ad ?? t("onl.hd.es"));
    m.set(VAKIF, t("onl.hd.vakif"));
    m.set(UZAK, t("onl.hd.uzakAkraba"));
    return m;
  }, [h, t]);
  const ad = (id: string) => adlar.get(id) ?? (onizleme && onizleme.plan.varis.id === id ? onizleme.plan.varis.ad : t("onl.hd.biri"));

  if (!y) return <YerlesimBekle rtl={rtl} t={t} onGiris={() => router.replace("/online")} />;
  const saat = y.saat;
  const yilYaz = (a: number) => String(ayTakvimi(a, saat).yil);

  const onizle = async (varis: string | null) => {
    setSecilenVaris(varis);
    setOnizleme(null);
    setOnizHata(null);
    setPanel("devir");
    istekNo.current = istekNoUret();
    const s = await istemci.devirOnizle(varis, dil);
    if (s.ok) setOnizleme(s.deger); else setOnizHata(s.hata);
  };
  const devret = async () => {
    if (!onizleme) return;
    setBekliyor(true);
    const s = await istemci.devir({ ...(secilenVaris ? { varis: secilenVaris } : {}), pk: onizleme.pk, istekNo: istekNo.current, dil });
    setBekliyor(false);
    if (s.ok) {
      setPanel(null);
      setBilgi(applyParams(t("onl.hd.devirTamam"), [s.deger.plan.varis.ad, s.deger.hanedan.nesil]));
      void o.yerlesimYukle();
      void yukle();
    } else if (s.hata === "devir_degisti") {
      setOnizHata(s.hata);
      void onizle(secilenVaris);
    } else setOnizHata(s.hata);
  };
  const vasiyetAc = () => {
    if (!h) return;
    istekNo.current = istekNoUret();
    setVVaris(h.vasiyet?.varis ?? null);
    setVPaylar(h.vasiyet?.paylar ? h.vasiyet.paylar.map((p) => ({ ...p })) : []);
    setIslemHata(null);
    setPanel("vasiyet");
  };
  const toplam = vPaylar.reduce((s, p) => s + p.oran, 0);
  const payDegis = (kime: string, fark: number) => {
    setVPaylar((x) => {
      const var_ = x.find((p) => p.kime === kime);
      if (!var_) return fark > 0 && x.length < VASIYET_PAY_EN_COK ? [...x, { kime, oran: Math.min(100, fark) }] : x;
      const yeni = Math.max(0, Math.min(100, var_.oran + fark));
      return yeni === 0 ? x.filter((p) => p.kime !== kime) : x.map((p) => (p.kime === kime ? { ...p, oran: yeni } : p));
    });
  };
  const vasiyetKaydet = async (sil = false) => {
    setBekliyor(true);
    const vasiyet = sil ? null : { ...(vVaris ? { varis: vVaris } : {}), ...(vPaylar.length ? { paylar: vPaylar } : {}) };
    const s = await istemci.vasiyet({ vasiyet, istekNo: istekNo.current, dil });
    setBekliyor(false);
    if (s.ok) { setPanel(null); setBilgi(t(sil ? "onl.hd.vasiyetSilindi" : "onl.hd.vasiyetYazildi")); void yukle(); }
    else setIslemHata(s.hata);
  };
  const evlen = async () => {
    if (!esAdayi) return;
    setBekliyor(true);
    const s = await istemci.evlilik({ hedef: esAdayi, istekNo: istekNo.current, dil });
    setBekliyor(false);
    if (s.ok) { setPanel(null); setBilgi(applyParams(t("onl.hd.evlendin"), [s.deger.es.ad, s.deger.bedel])); void o.yerlesimYukle(true); void yukle(); }
    else setIslemHata(s.hata);
  };

  const kalemYaz = (k: DevirKalemi): { icon: string; metin: string } | null => {
    switch (k.tur) {
      case "pay": return { icon: "coins", metin: applyParams(t("onl.hd.k.pay"), [ad(k.kime), k.oran, k.akce]) };
      case "vergi": return { icon: "scales", metin: applyParams(t("onl.hd.k.vergi"), [k.akce]) };
      case "emanet": return { icon: "coins", metin: applyParams(t("onl.hd.k.emanet"), [k.akce]) };
      case "envanter": return { icon: "backpack", metin: applyParams(t("onl.hd.k.envanter"), [Object.values(k.mallar).reduce((s, n) => s + n, 0)]) };
      case "nam": return { icon: "medal", metin: applyParams(t("onl.hd.k.nam"), [NAM_SIRASI.map((n, i) => `${t("onl.nam." + n)} ${k.nam[i] ?? 0}`).join(", ")]) };
      case "aileMeslegi": return { icon: "anvil", metin: applyParams(t("onl.hd.k.aileMeslegi"), [meslekYaz(k.meslek, lang as Lang), k.carpan]) };
      default: return null;
    }
  };
  const ozetKalemler = (p: DevirOnizleme) => {
    const ata = p.plan.kalemler.filter((k) => k.tur === "ata") as Extract<DevirKalemi, { tur: "ata" }>[];
    const kusme = p.plan.kalemler.filter((k) => k.tur === "kusme");
    const husumet = p.plan.kalemler.filter((k) => k.tur === "husumet");
    const sil = p.plan.kalemler.filter((k) => k.tur === "isaretSil");
    const ek: { icon: string; metin: string }[] = [];
    if (ata.length) ek.push({ icon: "family", metin: applyParams(t("onl.hd.k.ata"), [ata.length]) });
    if (kusme.length) ek.push({ icon: "tombstone", metin: applyParams(t("onl.hd.k.kusme"), [kusme.length]) });
    if (husumet.length) ek.push({ icon: "crossed-swords", metin: applyParams(t("onl.hd.k.husumet"), [husumet.length]) });
    if (sil.length) ek.push({ icon: "scroll", metin: applyParams(t("onl.hd.k.isaretSil"), [sil.length]) });
    return [...p.plan.kalemler.map(kalemYaz).filter((x): x is { icon: string; metin: string } => !!x), ...ek];
  };

  const kutuW = dar ? 86 : 100;
  const esler = y.ben.tanidiklar.filter((x) => !x.oyuncu && x.id.startsWith("n")).sort((a, b) => (b.gorus ?? 0) - (a.gorus ?? 0));
  const benKisi: HanedanKisi = { id: y.ben.id, ad: y.ben.ad, yas: y.ben.yas, cinsiyet: y.ben.cinsiyet };

  return <OnlineSayfa gorsel={EV_GORSEL} oran={0.34} rtl={rtl} t={t}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center" }}>
      <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/yasam")} />
    </View>
    <View style={{ marginTop: 8 }}>
      <SayfaBasi ust={y.yerlesim.ad} baslik={t("onl.hd.baslik")} alt={h ? applyParams(t("onl.hd.nesil"), [h.nesil]) : undefined} rtl={rtl} />
    </View>

    <View style={{ marginTop: 12, gap: 8 }}>
      {bilgi ? <Bant tur="bilgi" metin={bilgi} rtl={rtl} eylem={t("onl.kapat")} onEylem={() => setBilgi(null)} /> : null}
      {h?.olu ? <Bant metin={h.tereke ? applyParams(t("onl.hd.oluBant"), [h.tereke.kalanAy]) : t("onl.hd.oluBantKisa")} rtl={rtl} eylem={t("onl.hd.devriOnizle")} onEylem={() => { void onizle(null); }} />
        : h?.sonGunler ? <Bant metin={applyParams(t(h.vasiyet ? "onl.hd.sonGunlerVasiyetli" : "onl.hd.sonGunler"), [h.kurallar.sonGunlerAy])} rtl={rtl} eylem={t(h.vasiyet ? "onl.hd.devriOnizle" : "onl.hd.vasiyetYaz")} onEylem={() => (h.vasiyet ? void onizle(null) : vasiyetAc())} /> : null}
      {h?.yaslilik.basladi && !h.olu ? <Bant tur="bilgi" metin={h.yaslilik.takatTavani !== null ? applyParams(t("onl.hd.yaslilik"), [h.yaslilik.takatTavani]) : t("onl.hd.yaslilikKisa")} rtl={rtl} /> : null}
    </View>

    {hata && !h ? <View style={{ marginTop: 16 }}><Bant metin={t(ekHataAnahtari(hata))} rtl={rtl} eylem={t("onl.yenidenDene")} onEylem={() => { void yukle(); }} /></View>
      : !h ? <Yukleniyor metin={t("onl.hd.yukleniyor")} />
      : <>
        {/* soy ağacı */}
        <Baslik2 metin={t("onl.hd.soyAgaci")} rtl={rtl} />
        <Cerceve ic={{ padding: 12, gap: 0 }}>
          {h.atalar.length ? <>
            <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
              {h.atalar.map((a) => <View key={a.id} accessible accessibilityLabel={applyParams(t("onl.hd.ataErisim"), [a.ad, yilYaz(a.olumAyi), a.yas])}
                style={{ alignItems: "center", gap: 2, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "rgba(168,130,63,0.35)", backgroundColor: "rgba(14,10,6,0.55)" }}>
                <GameIcon name="tombstone" size={14} color={C.parchmentMuted} />
                <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchmentDim }}>{a.ad}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentMuted }}>{`† ${yilYaz(a.olumAyi)} · ${a.yas}`}</Text>
              </View>)}
            </View>
            <Cizgi />
          </> : null}
          <View style={{ flexDirection: yon(rtl), justifyContent: "center", alignItems: "center", gap: 8 }}>
            <KisiKutusu k={benKisi} rol={applyParams(t("onl.hd.sen"), [h.nesil])} vurgu rtl={rtl} genislik={kutuW} />
            {h.es ? <>
              <GameIcon name="ring" size={18} color={C.goldBright} />
              <KisiKutusu k={{ id: h.es.id, ad: h.es.ad ?? t("onl.hd.es") }} rol={t("onl.hd.es")} rtl={rtl} genislik={kutuW} />
            </> : <View style={{ width: kutuW, minHeight: 92, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(201,162,78,0.4)", alignItems: "center", justifyContent: "center", padding: 6 }}>
              <GameIcon name="ring" size={16} color={C.goldDim} />
              <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchmentMuted, textAlign: "center" }}>{t("onl.hd.esYok")}</Text>
            </View>}
          </View>
          {h.cocuklar.length ? <>
            <Cizgi />
            <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
              {h.cocuklar.map((c) => <KisiKutusu key={c.id} k={c} rol={t(c.cinsiyet === "kadın" ? "onl.hd.kiz" : "onl.hd.ogul")} rtl={rtl} genislik={kutuW} />)}
            </View>
          </> : <Text style={{ marginTop: 10, fontFamily: F.serifItalic, fontSize: 13.5, color: C.parchmentMuted, textAlign: "center" }}>{t("onl.hd.cocukYok")}</Text>}
          {h.kardesler.length || h.yegenler.length ? <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderColor: "rgba(201,162,78,0.2)", gap: 6 }}>
            <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 1, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.hd.akrabalar")}</Text>
            <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
              {h.kardesler.map((k) => <Rozet key={k.id} icon="family" metin={`${k.ad} · ${t("onl.hd.kardes")} · ${k.yas}`} />)}
              {h.yegenler.map((k) => <Rozet key={k.id} icon="leaf" metin={`${k.ad} · ${t("onl.hd.yegen")} · ${k.yas}`} />)}
            </View>
          </View> : null}
          {h.aileMeslegi ? <Text style={{ marginTop: 10, fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.hd.aileMeslegi"), [meslekYaz(h.aileMeslegi, lang as Lang)])}</Text> : null}
        </Cerceve>

        {/* vâris adayları */}
        <Baslik2 metin={t("onl.hd.adaylar")} rtl={rtl} />
        {h.adaylar.length ? <View style={{ gap: 6 }}>
          {h.adaylar.map((a) => {
            const vasiyetli = h.vasiyet?.varis === a.id;
            const varsayilan = h.varsayilanVaris === a.id;
            return <Pressable key={a.id} accessibilityRole="button" accessibilityState={{ disabled: !a.uygun }} disabled={!a.uygun}
              accessibilityLabel={`${a.ad}, ${t("onl.hd.yakinlik." + a.yakinlik)}, ${a.yas}. ${a.uygun ? t("onl.hd.onizleErisim") : t("onl.hd.kucuk")}`}
              onPress={() => { hap("tap"); void onizle(a.id); }}
              style={({ pressed }) => ({ flexDirection: yon(rtl), alignItems: "center", gap: 10, minHeight: 58, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: varsayilan ? C.goldBright : "rgba(168,130,63,0.45)", backgroundColor: pressed ? "rgba(90,64,24,0.6)" : "rgba(14,10,6,0.78)", opacity: a.uygun ? 1 : 0.6 })}>
              <KisiYuzu id={a.id} ad={a.ad} boyut={38} yas={a.yas} cinsiyet={a.cinsiyet} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 13.5, color: C.parchment, textAlign: hiza(rtl) }}>{a.ad}</Text>
                <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 5 }}>
                  <Rozet metin={`${t("onl.hd.yakinlik." + a.yakinlik)} · ${a.yas}`} />
                  {!a.uygun ? <Rozet metin={t("onl.hd.kucuk")} renk={C.ember} /> : null}
                  {vasiyetli ? <Rozet icon="scroll" metin={t("onl.hd.vasiyetteki")} renk={C.goldBright} /> : varsayilan ? <Rozet icon="crown" metin={t("onl.hd.varsayilan")} renk={C.goldBright} /> : null}
                </View>
              </View>
              {a.uygun ? <GameIcon name="scroll-open" size={16} color={C.goldDim} /> : null}
            </Pressable>;
          })}
          <Text style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{applyParams(t("onl.hd.adayNot"), [h.kurallar.devirSureAy])}</Text>
        </View> : <BosKart icon="leaf" metin={t("onl.hd.adayYok")} rtl={rtl} />}

        {/* vasiyet */}
        <Baslik2 metin={t("onl.hd.vasiyet")} rtl={rtl} />
        <Cerceve ic={{ padding: 12, gap: 8 }}>
          {h.vasiyet ? <>
            {h.vasiyet.varis ? <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchment, textAlign: hiza(rtl) }}>{applyParams(t("onl.hd.vasiyetVaris"), [ad(h.vasiyet.varis)])}</Text> : null}
            {h.vasiyet.paylar?.map((p) => <View key={p.kime} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
              <GameIcon name={p.kime === VAKIF ? "prayer-beads" : "coins"} size={14} color={C.gold} />
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, color: C.parchmentDim, textAlign: hiza(rtl) }}>{ad(p.kime)}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.goldBright }}>{`%${p.oran}`}</Text>
            </View>)}
          </> : <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.hd.vasiyetYok")}</Text>}
          <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{applyParams(t("onl.hd.vasiyetNot"), [h.kurallar.vergiOrani])}</Text>
          {!h.olu ? <CizgiDugme etiket={t(h.vasiyet ? "onl.hd.vasiyetDuzenle" : "onl.hd.vasiyetYaz")} icon="scroll" rtl={rtl} kucuk onPress={vasiyetAc} /> : null}
        </Cerceve>

        {/* devir */}
        <Baslik2 metin={t("onl.hd.devir")} rtl={rtl} />
        <Cerceve ic={{ padding: 12, gap: 8 }}>
          <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t(h.olu ? "onl.hd.devirOlu" : "onl.hd.devirCanli"), [Math.round(h.kurallar.namDevirOrani * 100), h.kurallar.vergiOrani])}</Text>
          {h.adaylar.some((a) => a.uygun) || h.olu ? <AltinDugme etiket={t("onl.hd.devriOnizle")} icon="banner" rtl={rtl} onPress={() => { void onizle(null); }} /> : null}
        </Cerceve>

        {/* evlilik */}
        {!h.es && !h.olu ? <>
          <Baslik2 metin={t("onl.hd.evlilik")} rtl={rtl} />
          <Cerceve ic={{ padding: 12, gap: 8 }}>
            <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.hd.evlilikNot"), [h.kurallar.evlilikYasi, h.kurallar.evlilikGorusEsigi, h.kurallar.dugunBedeli])}</Text>
            {y.ben.yas < h.kurallar.evlilikYasi ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, color: C.ember, textAlign: hiza(rtl) }}>{applyParams(t("onl.hd.evlilikYas"), [h.kurallar.evlilikYasi])}</Text>
              : <CizgiDugme etiket={t("onl.hd.gorucu")} icon="ring" rtl={rtl} kucuk onPress={() => { istekNo.current = istekNoUret(); setEsAdayi(null); setIslemHata(null); setPanel("evlilik"); }} />}
          </Cerceve>
        </> : null}

        {/* kronik ve kasaba */}
        <Baslik2 metin={t("onl.kr.baslik")} rtl={rtl} />
        <Pressable accessibilityRole="button" accessibilityLabel={t("onl.kr.ac")} onPress={() => { hap("tap"); router.push("/online/kronik"); }} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>
          <Cerceve ic={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, padding: 12, minHeight: 64 }}>
            <GameIcon name="book" size={22} color={C.goldBright} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13.5, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.kr.ac")}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.hd.kasaba"), [h.kasaba.hazine, h.kasaba.vakif])}</Text>
            </View>
          </Cerceve>
        </Pressable>
      </>}

    {/* vasiyet paneli */}
    <AltPanel acik={panel === "vasiyet"} onKapat={() => setPanel(null)} etiket={t("onl.hd.vasiyet")} rtl={rtl} t={t}>
      <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 17, color: C.parchment, textAlign: hiza(rtl), paddingEnd: 36 }}>{t("onl.hd.vasiyet")}</Text>
      {h ? <>
        <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 1, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.hd.varisSec")}</Text>
        <View style={{ gap: 6 }}>
          <Secim metin={t("onl.hd.varisKural")} secili={vVaris === null} rtl={rtl} onPress={() => setVVaris(null)} />
          {h.adaylar.filter((a) => h.vasiyetAlicilari.includes(a.id)).map((a) => <Secim key={a.id} metin={`${a.ad} · ${t("onl.hd.yakinlik." + a.yakinlik)} · ${a.yas}`} secili={vVaris === a.id} rtl={rtl} onPress={() => setVVaris(a.id)} />)}
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 1, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.hd.paylar")}</Text>
        <View style={{ gap: 6 }}>
          {h.vasiyetAlicilari.map((id) => {
            const oran = vPaylar.find((p) => p.kime === id)?.oran ?? 0;
            return <View key={id} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 6, minHeight: 48, paddingHorizontal: 8, borderRadius: 8, backgroundColor: "rgba(14,10,6,0.6)", borderWidth: 1, borderColor: oran ? ONL.frameHi : "rgba(168,130,63,0.3)" }}>
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, color: C.parchment, textAlign: hiza(rtl) }}>{ad(id)}</Text>
              <Adim etiket={`${ad(id)} −5`} metin="−" onPress={() => payDegis(id, -5)} kapali={!oran} />
              <Text style={{ width: 44, fontFamily: F.display, fontSize: 14, color: oran ? C.goldBright : C.parchmentMuted, textAlign: "center" }}>{`%${oran}`}</Text>
              <Adim etiket={`${ad(id)} +5`} metin="+" onPress={() => payDegis(id, 5)} kapali={toplam >= 100} />
            </View>;
          })}
        </View>
        <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.display, fontSize: 13, color: toplam === 100 || !vPaylar.length ? C.sage : C.ember, textAlign: hiza(rtl) }}>{applyParams(t("onl.hd.toplam"), [toplam])}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.hd.payNot")}</Text>
        {islemHata ? <Bant metin={t(ekHataAnahtari(islemHata))} rtl={rtl} /> : null}
        <AltinDugme etiket={t("onl.hd.vasiyetKaydet")} icon="scroll" rtl={rtl} bekliyor={bekliyor} kapali={(!vVaris && !vPaylar.length) || (vPaylar.length > 0 && toplam !== 100)} onPress={() => { void vasiyetKaydet(); }} />
        {h.vasiyet ? <CizgiDugme etiket={t("onl.hd.vasiyetSil")} icon="tombstone" rtl={rtl} kucuk kapali={bekliyor} onPress={() => { void vasiyetKaydet(true); }} /> : null}
      </> : null}
    </AltPanel>

    {/* devir önizleme paneli */}
    <AltPanel acik={panel === "devir"} onKapat={() => setPanel(null)} etiket={t("onl.hd.devir")} rtl={rtl} t={t}>
      <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 17, color: C.parchment, textAlign: hiza(rtl), paddingEnd: 36 }}>{t("onl.hd.devirPlani")}</Text>
      {onizHata ? <Bant metin={t(ekHataAnahtari(onizHata))} rtl={rtl} eylem={t("onl.yenidenDene")} onEylem={() => { void onizle(secilenVaris); }} /> : null}
      {!onizleme && !onizHata ? <Yukleniyor metin={t("onl.hd.planHazirlaniyor")} /> : null}
      {onizleme ? <>
        {onizleme.varsayim ? <Bant tur="bilgi" metin={t("onl.hd.varsayim")} rtl={rtl} /> : null}
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 12 }}>
          <KisiYuzu id={onizleme.plan.varis.id} ad={onizleme.plan.varis.ad} boyut={52} yas={Math.max(0, Math.floor((onizleme.plan.ol - onizleme.plan.varis.d) / 12))} cinsiyet={onizleme.plan.varis.k ? "kadın" : "erkek"} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchment, textAlign: hiza(rtl) }}>{onizleme.plan.varis.ad}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.hd.varisSatir"), [onizleme.plan.nesil, Math.max(0, Math.floor((onizleme.plan.ol - onizleme.plan.varis.d) / 12))])}</Text>
            {onizleme.plan.varis.id === UZAK ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.ember, textAlign: hiza(rtl) }}>{t("onl.hd.uzakNot")}</Text> : null}
          </View>
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 12.5, color: C.gold, textAlign: hiza(rtl) }}>{applyParams(t("onl.hd.tereke"), [onizleme.plan.tereke])}</Text>
        <View style={{ gap: 6 }}>
          {ozetKalemler(onizleme).map((k, i) => <View key={i} style={{ flexDirection: yon(rtl), gap: 8, alignItems: "flex-start" }}>
            <GameIcon name={k.icon} size={14} color={C.gold} />
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchment, textAlign: hiza(rtl) }}>{k.metin}</Text>
          </View>)}
        </View>
        <View style={{ padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,162,78,0.35)", backgroundColor: "rgba(14,10,6,0.6)", gap: 4 }}>
          <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: rtl ? 0 : 1, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.hd.kronikSatiri")}</Text>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{ozetYaz(onizleme.kronik.ozet, t, lang as Lang)}</Text>
        </View>
        {h?.olu ? <AltinDugme etiket={applyParams(t("onl.hd.devret"), [onizleme.plan.varis.ad])} icon="banner" rtl={rtl} bekliyor={bekliyor} onPress={() => { void devret(); }} />
          : <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.hd.devirSonra")}</Text>}
      </> : null}
    </AltPanel>

    {/* evlilik paneli */}
    <AltPanel acik={panel === "evlilik"} onKapat={() => setPanel(null)} etiket={t("onl.hd.evlilik")} rtl={rtl} t={t}>
      <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 17, color: C.parchment, textAlign: hiza(rtl), paddingEnd: 36 }}>{t("onl.hd.gorucu")}</Text>
      {h ? <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.hd.evlilikNot"), [h.kurallar.evlilikYasi, h.kurallar.evlilikGorusEsigi, h.kurallar.dugunBedeli])}</Text> : null}
      {esler.length ? <View style={{ gap: 6 }}>
        {esler.map((k) => {
          const yetmez = k.gorus !== undefined && h !== null && k.gorus < h.kurallar.evlilikGorusEsigi;
          return <Pressable key={k.id} accessibilityRole="radio" accessibilityState={{ selected: esAdayi === k.id, disabled: yetmez }} disabled={yetmez}
            accessibilityLabel={`${k.ad}${k.gorus !== undefined ? ", " + applyParams(t("onl.hd.gorus"), [k.gorus]) : ""}${yetmez ? ". " + t("onl.hh.gorus_yetersiz") : ""}`}
            onPress={() => { hap("tap"); setEsAdayi(k.id); }}
            style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, minHeight: 54, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1.5, borderColor: esAdayi === k.id ? C.goldBright : "rgba(168,130,63,0.4)", backgroundColor: esAdayi === k.id ? "rgba(90,64,24,0.55)" : "rgba(14,10,6,0.6)", opacity: yetmez ? 0.5 : 1 }}>
            <KisiYuzu id={k.id} ad={k.ad} boyut={34} {...(o.kisiler[k.id] ? { yas: o.kisiler[k.id]!.yas, cinsiyet: o.kisiler[k.id]!.cinsiyet } : {})} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 13, color: C.parchment, textAlign: hiza(rtl) }}>{k.ad}</Text>
              {k.gorus !== undefined ? <GorusOlcegi deger={k.gorus} rtl={rtl} /> : null}
            </View>
            {k.gorus !== undefined ? <Text style={{ fontFamily: F.display, fontSize: 12.5, color: yetmez ? C.ember : C.sage }}>{k.gorus}</Text> : null}
          </Pressable>;
        })}
      </View> : <BosKart icon="family" metin={t("onl.hd.esAdayiYok")} rtl={rtl} />}
      <Text style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.hd.evlilikKarar")}</Text>
      {islemHata ? <Bant metin={t(ekHataAnahtari(islemHata))} rtl={rtl} /> : null}
      <AltinDugme etiket={esAdayi ? applyParams(t("onl.hd.teklifEt"), [esler.find((k) => k.id === esAdayi)?.ad ?? ""]) : t("onl.hd.esSec")} icon="ring" rtl={rtl} bekliyor={bekliyor} kapali={!esAdayi} onPress={() => { void evlen(); }} />
    </AltPanel>
  </OnlineSayfa>;
}

function Secim({ metin, secili, rtl, onPress }: { metin: string; secili: boolean; rtl: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected: secili }} accessibilityLabel={metin} onPress={() => { hap("tap"); onPress(); }}
    style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, minHeight: 44, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: secili ? C.goldBright : "rgba(168,130,63,0.4)", backgroundColor: secili ? "rgba(90,64,24,0.5)" : "rgba(14,10,6,0.55)" }}>
    <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: secili ? C.goldBright : C.goldDim, alignItems: "center", justifyContent: "center" }}>
      {secili ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.goldBright }} /> : null}
    </View>
    <Text numberOfLines={2} style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, color: C.parchment, textAlign: hiza(rtl) }}>{metin}</Text>
  </Pressable>;
}

function Adim({ metin, etiket, onPress, kapali }: { metin: string; etiket: string; onPress: () => void; kapali: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={etiket} accessibilityState={{ disabled: kapali }} disabled={kapali} onPress={() => { hap("tap"); onPress(); }}
    style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: ONL.frameHi, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? "rgba(201,162,78,0.3)" : "rgba(201,162,78,0.1)", opacity: kapali ? 0.4 : 1 })}>
    <Text style={{ fontFamily: F.display, fontSize: 18, lineHeight: 22, color: C.goldBright }}>{metin}</Text>
  </Pressable>;
}

export default function OnlineHanedan() {
  return onlineEkranAcik() ? <OnlineKapisi><HanedanEkran /></OnlineKapisi> : <OnlineYakinda />;
}
