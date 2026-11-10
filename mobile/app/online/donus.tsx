// Dönüş ekranı (Faz 14, GDD §18): 24 saati aşan yokluktan dönen oyuncunun ilk ekranı. Yargılamayan başlık, yokluk
// süresi, barınma durumu (zincir ve nasıl toparlanacağı), Hal, yoklukta olanlar ve sunucunun verdiği istekle tek
// dokunuşluk seçenekler. Ekran hiçbir zaman kilitlemez: "Devam et" her durumda açıktır.
import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { hap } from "../../lib/haptics";
import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { istekNoUret } from "../../lib/online/depo";
import { ekHataAnahtari, type EkHata } from "../../lib/online/ek-istemci";
import { ozetYaz } from "../../lib/online/metin";
import { AltinDugme, Bant, Cerceve, Madalyon, giris, hiza, yon } from "../../lib/online/ui";
import { Baslik2, OnlineSayfa, Rozet, Yukleniyor, sahneGorseli, useYerlesimEkrani } from "../../lib/online/yasam-ui";
import { DURUM_RENK, SECENEK_IKON, ZincirGostergesi, konaklamaMetni, sureYaz } from "../../lib/online/barinma-ui";
import { useBarinmaIstemci, useSunucuFarki, yerlesimDonus, type DonusEkrani, type TekDokunus } from "../../lib/online/barinma-veri";

type Ceviri = (k: string) => string;

function Gosterge({ ad, deger, durum, alt, rtl, renk }: { ad: string; deger: number; durum: string; alt: string; rtl: boolean; renk: string }) {
  const y = Math.max(0, Math.min(100, deger));
  return <View accessible accessibilityLabel={`${ad}: ${deger}. ${durum}. ${alt}`} style={{ gap: 5 }}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
      <Text style={{ flex: 1, fontFamily: F.display, fontSize: 13, color: C.parchment, textAlign: hiza(rtl) }}>{ad}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 14, color: renk }}>{durum}</Text>
      <Text style={{ minWidth: 30, fontFamily: F.display, fontSize: 14, color: C.parchment, textAlign: rtl ? "left" : "right" }}>{deger}</Text>
    </View>
    <View style={{ height: 7, borderRadius: 4, overflow: "hidden", flexDirection: yon(rtl), backgroundColor: "rgba(201,162,78,0.15)" }}>
      <View style={{ width: `${y}%`, backgroundColor: renk }} />
    </View>
    <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{alt}</Text>
  </View>;
}

function Secenek({ s, rtl, t, bekliyor, onSec }: { s: TekDokunus; rtl: boolean; t: Ceviri; bekliyor: boolean; onSec: () => void }) {
  const fiyat = s.fiyat > 0 ? applyParams(t("onl.dn.fiyat"), [s.fiyat]) : t("onl.dn.ucretsiz");
  const neden = !s.uygun && s.neden ? t(ekHataAnahtari(s.neden as EkHata)) : null;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${t("onl." + s.anahtar)}. ${s.tur === "otomatik" ? "" : fiyat}${neden ? ". " + neden : ""}`}
    accessibilityState={{ disabled: !s.uygun || bekliyor, busy: bekliyor }} disabled={!s.uygun || bekliyor} onPress={() => { hap("advance"); onSec(); }}
    style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }], opacity: s.uygun ? (bekliyor ? 0.7 : 1) : 0.55 })}>
    <Cerceve aktif={s.uygun && s.tur !== "otomatik"} ic={{ flexDirection: yon(rtl), alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 10, minHeight: 64 }}>
      <Madalyon icon={SECENEK_IKON[s.tur] ?? "house"} size={42} aktif={s.uygun} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: F.display, fontSize: 14.5, color: s.uygun ? C.parchment : C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl." + s.anahtar)}</Text>
        {neden ? <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.emberSoft, textAlign: hiza(rtl) }}>{neden}</Text> : null}
      </View>
      {s.tur !== "otomatik" ? <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 4 }}>
        {s.fiyat > 0 ? <GameIcon name="coins" size={13} color={C.gold} /> : null}
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.goldBright }}>{s.fiyat > 0 ? String(s.fiyat) : t("onl.dn.ucretsiz")}</Text>
      </View> : null}
    </Cerceve>
  </Pressable>;
}

function DonusEkran() {
  const router = useRouter();
  const { t, rtl, lang } = useI18n();
  const o = useYerlesimEkrani();
  const ist = useBarinmaIstemci();
  const fark = useSunucuFarki();
  const [d, setD] = useState<DonusEkrani | null>(() => yerlesimDonus(o.yerlesim));
  const [hata, setHata] = useState<EkHata | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [bekleyen, setBekleyen] = useState<number | null>(null);
  const [not, setNot] = useState<string | null>(null);

  const yukle = async () => {
    setYukleniyor(true); setHata(null);
    const r = await ist.donus(lang);
    setYukleniyor(false);
    if (r.ok) setD(r.deger.donusEkrani); else if (!d) setHata(r.hata);
  };
  useEffect(() => { void yukle(); }, [ist, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const devam = () => router.replace("/online/yasam");
  const sec = async (s: TekDokunus, i: number) => {
    setBekleyen(i); setNot(null); setHata(null);
    const r = await ist.tekDokunus(s, istekNoUret());
    setBekleyen(null);
    if (r.ok) { hap("success"); setNot(t("onl.dn.tamam." + s.tur)); void o.yerlesimYukle(true); void yukle(); }
    else { hap("error"); setHata(r.hata); }
  };
  const simdi = Date.now() + fark;
  const gorsel = sahneGorseli(o.yerlesim?.yerlesim.tur, o.yerlesim?.saat.mevsim);
  const devamDugmesi = <View style={{ marginTop: 18 }}><AltinDugme etiket={t("onl.dn.devam")} icon="walk" rtl={rtl} onPress={devam} /></View>;

  if (!d) {
    return <OnlineSayfa gorsel={gorsel} oran={0.4} rtl={rtl} t={t}>
      <View style={{ minHeight: 160 }} />
      {hata ? <Bant metin={t(ekHataAnahtari(hata))} rtl={rtl} eylem={t("onl.yenidenDene")} onEylem={() => { void yukle(); }} /> : <Yukleniyor metin={t("onl.dn.yukleniyor")} />}
      {devamDugmesi}
    </OnlineSayfa>;
  }

  const b = d.barinma;
  const h = d.hal;
  const zincirde = !!b.zincir;
  const toparlanir = (n: number) => (n > 0 ? applyParams(t("onl.dn.toparlanir"), [n]) : t("onl.dn.toparlanmaBekler"));
  const kalan = b.konaklama?.bitis != null ? b.konaklama.bitis - simdi : null;

  return <OnlineSayfa gorsel={gorsel} oran={0.4} rtl={rtl} t={t}>
    <View style={{ minHeight: 36 }} />
    <Animated.View entering={giris(40)} style={{ alignItems: "center", gap: 8 }}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 7, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: "rgba(201,162,78,0.6)", backgroundColor: "rgba(14,10,6,0.62)" }}>
        <GameIcon name="hourglass" size={13} color={C.goldBright} />
        <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 1.4, color: C.goldBright }}>{applyParams(t("onl.dn.yokluk"), [sureYaz(d.yokluk.ms, t)])}</Text>
      </View>
      <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 27, lineHeight: 34, color: C.parchment, textAlign: "center", textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 10 }}>{t("onl." + d.baslik)}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 22, color: C.parchmentDim, textAlign: "center", textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 6 }}>{t(d.yokluk.uyku ? "onl.dn.altUyku" : "onl.dn.alt")}</Text>
    </Animated.View>

    {/* Barınma */}
    <Baslik2 metin={t("onl.br.baslik")} rtl={rtl} sag={b.unvan ? <Rozet icon="hood" metin={t("onl.br.unvan.evsiz")} renk={C.ember} /> : undefined} />
    <Cerceve aktif={zincirde} ic={{ padding: 14, gap: 12 }}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 12 }}>
        <Madalyon icon="house" size={44} renk={DURUM_RENK[b.durum]} aktif={!zincirde} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 21, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl." + b.anahtar)}</Text>
          {b.konaklama ? <Text style={{ fontFamily: F.serif, fontSize: 14.5, color: C.parchmentDim, textAlign: hiza(rtl) }}>{konaklamaMetni(b.konaklama, kalan, t)}</Text> : null}
        </View>
      </View>
      {b.zincir ? <ZincirGostergesi z={b.zincir} simdi={simdi} rtl={rtl} t={t} toparlanmaNotu={!b.toparlanma} /> : null}
      {b.toparlanma ? <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl." + b.toparlanma)}</Text> : null}
    </Cerceve>

    {/* Tek dokunuş */}
    {d.secenekler.length ? <>
      <Baslik2 metin={t("onl.dn.secenekler")} rtl={rtl} />
      <View style={{ gap: 8 }}>
        {d.secenekler.map((s, i) => <Secenek key={s.anahtar + i} s={s} rtl={rtl} t={t} bekliyor={bekleyen === i} onSec={() => { void sec(s, i); }} />)}
        {d.otomatik.oneri ? <Text style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl." + d.otomatik.oneri)}</Text> : null}
      </View>
    </> : null}
    {not ? <View style={{ marginTop: 10 }}><Bant tur="bilgi" metin={not} rtl={rtl} /></View> : null}
    {hata ? <View style={{ marginTop: 10 }}><Bant metin={t(ekHataAnahtari(hata))} rtl={rtl} /></View> : null}

    {/* Hal */}
    <Baslik2 metin={t("onl.dn.hal")} rtl={rtl} />
    <Cerceve ic={{ padding: 14, gap: 14 }}>
      <Gosterge ad={t("onl.dn.gosterge.can")} deger={h.can.deger} durum={t("onl." + h.can.anahtar)} renk={C.rose} rtl={rtl}
        alt={`${toparlanir(h.can.toparlanmaAylik)} ${applyParams(t("onl.dn.taban"), [h.can.taban])}`} />
      <Gosterge ad={t("onl.dn.gosterge.kondisyon")} deger={h.kondisyon.deger} durum={t("onl." + h.kondisyon.anahtar)} renk={C.sage} rtl={rtl} alt={toparlanir(h.kondisyon.toparlanmaAylik)} />
      <Gosterge ad={t("onl.dn.gosterge.gonul")} deger={h.gonul.deger} durum={t("onl." + h.gonul.anahtar)} renk={C.gold} rtl={rtl} alt={applyParams(t("onl.dn.denge"), [h.gonul.denge])} />
      {h.nedenler.length ? <View style={{ gap: 4, borderTopWidth: 1, borderColor: "rgba(201,162,78,0.15)", paddingTop: 8 }}>
        {h.nedenler.slice(0, 6).map((n, i) => <Text key={i} style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>
          {`${t("onl.dn.gosterge." + n.gosterge)} ${n.fark > 0 ? "+" : "−"}${Math.abs(n.fark)} · ${t("onl." + n.neden)}`}
        </Text>)}
      </View> : null}
    </Cerceve>

    {/* Yoklukta olanlar */}
    <Baslik2 metin={t("onl.dn.olanlar")} rtl={rtl} />
    {d.olanlar.length ? <Cerceve ic={{ paddingVertical: 4 }}>
      {d.olanlar.map((x, i) => <View key={x.k + x.an} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderColor: "rgba(201,162,78,0.12)" }}>
        <GameIcon name="scroll" size={15} color={C.gold} />
        <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: C.parchment, textAlign: hiza(rtl) }}>{ozetYaz({ k: x.k, p: x.p }, t, lang)}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 11, color: C.parchmentMuted }}>{applyParams(t("onl.dn.once"), [sureYaz(simdi - x.an, t)])}</Text>
      </View>)}
    </Cerceve> : <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.dn.olanYok")}</Text>}
    {d.mola && d.mola > simdi ? <Text style={{ marginTop: 10, fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{applyParams(t("onl.br.mola"), [sureYaz(d.mola - simdi, t)])}</Text> : null}
    {yukleniyor ? <Text style={{ marginTop: 8, fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, textAlign: "center" }}>{t("onl.dn.yenileniyor")}</Text> : null}
    {devamDugmesi}
  </OnlineSayfa>;
}

export default function OnlineDonus() {
  return onlineEkranAcik() ? <OnlineKapisi><DonusEkran /></OnlineKapisi> : <OnlineYakinda />;
}
