// Çevrimiçi karakter (Faz 2c, §14.1): 6 özellik (dağıtılmamış puanla artırılır), 6 genel beceri, nam, yaş, takat,
// öğrenme döneminin ilerleyişi, 6. günün ilk gerçek kararı (yol seçimi), hane ve usta.
import { useState } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { hap } from "../../lib/haptics";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { AltinDugme, Bant, Cerceve, Check, GLOW, Madalyon, ONL, giris, hiza, yon } from "../../lib/online/ui";
import {
  AltPanel, Baslik2, Hap, KisiYuzu, OnlineSayfa, Rozet, SatirOku, SayfaBasi, TakatGostergesi, YerlesimBekle, gunDurumu, odulYaz, sahneGorseli,
  useYerlesimEkrani, yuzBilgisi,
} from "../../lib/online/yasam-ui";
import { EylemSonucu } from "../../lib/online/eylem-ui";
import { HalKarti } from "../../lib/online/hal-ui";
import type { Lang } from "../../lib/locale-data";
import { BECERI_IKON, KARAR_IKON, NAM_IKON, OZELLIK_IKON, SISTEM_IKON, meslekYaz, ozetYaz } from "../../lib/online/metin";
import { hataAnahtari } from "../../lib/online/hata";
import { ACILIS_GUNU, BECERILER, KARARLAR, NAMLAR, OZELLIK_EN_COK, OZELLIKLER, type EylemYaniti, type Karar, type Ozellik } from "../../lib/online/protokol";

type Secim = { tur: "puan"; ozellik: Ozellik } | { tur: "karar"; secim: Karar };

function KarakterEkran() {
  const router = useRouter();
  const { t, rtl, lang } = useI18n();
  const { width } = useWindowDimensions();
  const o = useYerlesimEkrani();
  const y = o.yerlesim;
  const [secim, setSecim] = useState<Secim | null>(null);
  const [sonuc, setSonuc] = useState<EylemYaniti | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  if (!y) return <YerlesimBekle sekme="karakter" rtl={rtl} t={t} onGiris={() => router.replace("/online")} />;

  const ben = y.ben;
  const og = ben.ogrenme;
  const puanAcik = og.gun >= (ACILIS_GUNU.puan ?? 3);
  const kararAcik = og.gun >= (ACILIS_GUNU.karar ?? 6);
  const dar = width < 360;
  const onayla = async () => {
    if (!secim) return;
    setHata(null);
    const s = await o.eylemYap(secim.tur === "puan" ? { tur: "puan", ozellik: secim.ozellik } : { tur: "karar", secim: secim.secim });
    if (s.ok) { hap("success"); setSecim(null); setSonuc(s.deger); } else { hap("error"); setHata(t(hataAnahtari(s.hata))); }
  };

  return <OnlineSayfa gorsel={sahneGorseli(y.yerlesim.tur, y.saat.mevsim)} oran={0.32} sekme="karakter" rtl={rtl} t={t}
    alt={<>
      <AltPanel acik={!!secim} onKapat={() => { setSecim(null); setHata(null); }} etiket={t("onl.ka.onay")} rtl={rtl} t={t}>
        {secim ? <>
          <View style={{ alignItems: "center", gap: 10, paddingTop: 6 }}>
            <Madalyon icon={secim.tur === "puan" ? OZELLIK_IKON[secim.ozellik] : KARAR_IKON[secim.secim]} size={64} aktif />
            <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 21, color: C.parchment, textAlign: "center" }}>
              {secim.tur === "puan" ? applyParams(t("onl.ka.puanSor"), [t("onl.ozellik." + secim.ozellik)]) : t("onl.karar." + secim.secim)}
            </Text>
            <Text style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 22, color: C.parchmentDim, textAlign: "center" }}>
              {secim.tur === "puan" ? t("onl.ozellik." + secim.ozellik + ".d") : t("onl.karar." + secim.secim + ".d")}
            </Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 20, color: C.emberSoft, textAlign: "center" }}>{t(secim.tur === "puan" ? "onl.ka.puanKalici" : "onl.ka.kararKalici")}</Text>
          </View>
          {hata ? <Bant metin={hata} rtl={rtl} /> : null}
          <AltinDugme etiket={t(secim.tur === "puan" ? "onl.ka.puanVer" : "onl.ka.kararVer")} icon={secim.tur === "puan" ? "star" : "compass"} rtl={rtl} bekliyor={o.islem === "eylem"} onPress={() => { void onayla(); }} />
        </> : null}
      </AltPanel>
      <AltPanel acik={!!sonuc} onKapat={() => setSonuc(null)} etiket={t("onl.ey.sonuc")} rtl={rtl} t={t}>
        {sonuc ? <EylemSonucu y={sonuc} rtl={rtl} t={t} lang={lang} onTamam={() => setSonuc(null)} /> : null}
      </AltPanel>
    </>}>
    <SayfaBasi ust={t("onl.nav.karakter")} baslik={ben.ad} alt={applyParams(t("onl.ka.alt"), [ben.yas, y.yerlesim.ad])} rtl={rtl}
      sol={<KisiYuzu id={ben.id} ad={ben.ad} boyut={64} yas={ben.yas} cinsiyet={ben.cinsiyet} ben />} />
    <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 8, marginTop: 14 }}>
      <Hap icon="coins" metin={String(ben.para)} erisim={applyParams(t("onl.ya.paraErisim"), [ben.para])} />
      {ben.ozellikPuani > 0 ? <Hap icon="star" metin={applyParams(t("onl.ka.puanVar"), [ben.ozellikPuani])} erisim={applyParams(t("onl.ka.puanVar"), [ben.ozellikPuani])} vurgulu /> : null}
      {ben.usta ? <Hap icon="anvil" metin={`${ben.usta.ad} · ${meslekYaz(ben.usta.meslek, lang)}`} erisim={`${t("onl.ka.usta")}: ${ben.usta.ad}`} /> : null}
    </View>

    <Animated.View entering={giris(60)} style={{ marginTop: 14 }}>
      <Cerceve ic={{ padding: 14 }}>
        <TakatGostergesi kalan={ben.takat.kalan} tavan={ben.takat.tavan} aylik={ben.takat.aylik} rtl={rtl} t={t} />
      </Cerceve>
    </Animated.View>

    {/* Hal: can, kondisyon, gönül (sunucu ben.hal; eski sunucuda yok) */}
    {ben.hal ? <>
      <Baslik2 metin={t("onl.hal.baslik")} rtl={rtl} sag={<Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>{applyParams(t("onl.hal.takatAylik"), [ben.takat.aylik])}</Text>} />
      <Animated.View entering={giris(90)}>
        <HalKarti hal={ben.hal} ay={y.saat.oyunAyi} rtl={rtl} t={t} lang={lang as Lang} />
      </Animated.View>
    </> : null}

    {/* Özellikler */}
    <Baslik2 metin={t("onl.ka.ozellikler")} rtl={rtl} />
    {ben.ozellikPuani > 0 && !puanAcik ? <View style={{ marginBottom: 8 }}><Bant tur="bilgi" metin={applyParams(t("onl.ey.engel.ogrenme"), [ACILIS_GUNU.puan])} rtl={rtl} /></View> : null}
    <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", justifyContent: "space-between", rowGap: 8 }}>
      {OZELLIKLER.map((oz) => {
        const v = ben.ozellikler[oz] ?? 0;
        const arttir = ben.ozellikPuani > 0 && puanAcik && v < OZELLIK_EN_COK;
        return <View key={oz} style={{ width: "49%" }}>
          <Cerceve aktif={arttir} ic={{ padding: 10, gap: 8 }}>
            <View accessible accessibilityLabel={`${t("onl.ozellik." + oz)}: ${v}/${OZELLIK_EN_COK}`} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
              <Madalyon icon={OZELLIK_IKON[oz]} size={34} />
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ flex: 1, fontFamily: F.display, fontSize: dar ? 11.5 : 12.5, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.ozellik." + oz)}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 21, color: C.goldBright }}>{v}</Text>
            </View>
            <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 6 }}>
              <View style={{ flex: 1, flexDirection: yon(rtl), gap: 2 }}>
                {Array.from({ length: OZELLIK_EN_COK }, (_, i) => <View key={i} style={{ flex: 1, height: 6, borderRadius: 2, backgroundColor: i < v ? C.gold : "rgba(201,162,78,0.16)" }} />)}
              </View>
              {arttir ? <Pressable accessibilityLabel={applyParams(t("onl.ka.puanSor"), [t("onl.ozellik." + oz)])} onPress={() => { hap("tap"); setHata(null); setSecim({ tur: "puan", ozellik: oz }); }}
                style={{ width: 44, height: 44, margin: -7, alignItems: "center", justifyContent: "center" }}>
                <View style={[{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: C.gold, borderWidth: 1, borderColor: C.goldBright }, GLOW]}>
                  <Text style={{ fontFamily: F.display, fontSize: 18, lineHeight: 20, color: C.inkOnGold }}>+</Text>
                </View>
              </Pressable> : null}
            </View>
          </Cerceve>
        </View>;
      })}
    </View>

    {/* Beceriler */}
    <Baslik2 metin={t("onl.ka.beceriler")} rtl={rtl} />
    <Cerceve ic={{ paddingHorizontal: 12, paddingVertical: 6 }}>
      {BECERILER.map((b, i) => {
        const v = ben.beceriler[b] ?? 0;
        return <View key={b} accessible accessibilityLabel={`${t("onl.beceri." + b)}: ${v}/100`} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderColor: "rgba(201,162,78,0.12)" }}>
          <GameIcon name={BECERI_IKON[b]} size={18} color={C.gold} />
          <View style={{ flex: 1, gap: 5 }}>
            <View style={{ flexDirection: yon(rtl), justifyContent: "space-between" }}>
              <Text style={{ fontFamily: F.display, fontSize: 13.5, color: C.parchment }}>{t("onl.beceri." + b)}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: C.goldBright }}>{v}</Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(201,162,78,0.14)", overflow: "hidden", flexDirection: yon(rtl) }}>
              <View style={{ width: `${Math.max(v, v > 0 ? 2 : 0)}%`, backgroundColor: C.gold, borderRadius: 3 }} />
            </View>
            <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 17, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.beceri." + b + ".d")}</Text>
          </View>
        </View>;
      })}
    </Cerceve>
    <Text style={{ marginTop: 8, fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.ka.beceriNot")}</Text>

    {/* Nam */}
    <Baslik2 metin={t("onl.ka.nam")} rtl={rtl} />
    <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", justifyContent: "space-between", rowGap: 8 }}>
      {NAMLAR.map((n) => {
        const v = ben.nam[n] ?? 0;
        return <View key={n} accessible accessibilityLabel={`${t("onl.nam." + n)}: ${v}/100`} style={{ width: "49%", flexDirection: yon(rtl), alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,162,78,0.25)", backgroundColor: ONL.cam }}>
          <GameIcon name={NAM_IKON[n]} size={17} color={C.gold} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: 12, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.nam." + n)}</Text>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: "rgba(201,162,78,0.14)", overflow: "hidden", flexDirection: yon(rtl) }}>
              <View style={{ width: `${Math.max(v, v > 0 ? 3 : 0)}%`, backgroundColor: C.sage }} />
            </View>
          </View>
          <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchmentDim }}>{v}</Text>
        </View>;
      })}
    </View>

    {/* Yol: ilk gerçek karar (öğrenme döneminin 6. günü) */}
    <Baslik2 metin={t("onl.ka.yol")} rtl={rtl} />
    {ben.karar ? <Cerceve aktif ic={{ flexDirection: yon(rtl), alignItems: "center", gap: 12, padding: 14 }}>
      <Madalyon icon={KARAR_IKON[ben.karar] ?? "compass"} size={50} aktif />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: rtl ? 0 : 1.4, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.ka.secilenYol")}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 18, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.karar." + ben.karar)}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.karar." + ben.karar + ".d")}</Text>
      </View>
    </Cerceve> : <>
      <Text style={{ marginBottom: 10, fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: kararAcik ? C.parchment : C.parchmentDim, textAlign: hiza(rtl) }}>
        {kararAcik ? t("onl.ka.yolSec") : applyParams(t("onl.ka.yolKilit"), [ACILIS_GUNU.karar])}
      </Text>
      <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", justifyContent: "space-between", rowGap: 8 }}>
        {KARARLAR.map((k) => <Pressable key={k} disabled={!kararAcik} accessibilityLabel={`${t("onl.karar." + k)}. ${t("onl.karar." + k + ".d")}`} accessibilityState={{ disabled: !kararAcik }}
          onPress={() => { hap("tap"); setHata(null); setSecim({ tur: "karar", secim: k }); }} style={{ width: "49%" }}>
          <Cerceve ic={{ alignItems: "center", gap: 6, padding: 12, minHeight: 128, opacity: kararAcik ? 1 : 0.55 }}>
            <Madalyon icon={KARAR_IKON[k]} size={40} aktif={kararAcik} />
            <Text style={{ fontFamily: F.display, fontSize: 13.5, color: C.parchment, textAlign: "center" }}>{t("onl.karar." + k)}</Text>
            <Text numberOfLines={3} style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 17, color: C.parchmentMuted, textAlign: "center" }}>{t("onl.karar." + k + ".d")}</Text>
          </Cerceve>
        </Pressable>)}
      </View>
    </>}

    {/* Öğrenme dönemi */}
    <Baslik2 metin={t("onl.ka.ogrenme")} rtl={rtl} sag={<Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>{`${og.gunler.filter((g) => g.tamam).length}/${og.gunler.length}`}</Text>} />
    <Cerceve ic={{ paddingHorizontal: 12, paddingVertical: 4 }}>
      {og.gunler.map((g, i) => {
        const d = gunDurumu(g, og.gun);
        const renk = d === "tamam" ? C.sage : d === "kacti" ? C.ember : d === "bugun" ? C.goldBright : C.parchmentMuted;
        return <View key={g.gun} accessible accessibilityLabel={`${applyParams(t("onl.ya.gunN"), [g.gun])}: ${t("onl.ogrenme.sistem." + g.sistem)}. ${ozetYaz(g.hedef, t, lang)} ${g.ilerleme}/${g.gerekli}. ${t("onl.ya.durum." + d)}`}
          style={{ flexDirection: yon(rtl), alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: "rgba(201,162,78,0.12)", opacity: d === "kapali" ? 0.6 : 1 }}>
          <View style={[{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: renk, backgroundColor: d === "tamam" ? C.gold : "rgba(14,10,6,0.9)" }, d === "bugun" ? GLOW : null]}>
            {d === "tamam" ? <Check size={15} /> : <GameIcon name={SISTEM_IKON[g.sistem] ?? "scroll"} size={16} color={renk} />}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Text style={{ fontFamily: F.display, fontSize: 13.5, color: C.parchment }}>{`${g.gun}. ${t("onl.ogrenme.sistem." + g.sistem)}`}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: rtl ? 0 : 1, color: renk }}>{t("onl.ya.durum." + d)}</Text>
            </View>
            <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>{`${ozetYaz(g.hedef, t, lang)} · ${g.ilerleme}/${g.gerekli}`}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 17, color: d === "tamam" ? C.sage : C.gold, textAlign: hiza(rtl) }}>{applyParams(t(d === "tamam" ? "onl.ya.odulAlindi" : "onl.ya.odul"), [odulYaz(g.odul, t)])}</Text>
          </View>
        </View>;
      })}
    </Cerceve>

    {/* Hane */}
    {ben.hane.length ? <>
      <Baslik2 metin={t("onl.ka.hane")} rtl={rtl} />
      <Cerceve ic={{ paddingVertical: 4 }}>
        {ben.hane.map((h, i) => <Pressable key={h.id} accessibilityLabel={`${t("onl.rol." + h.rol)}: ${h.ad}`} onPress={() => { hap("tap"); router.push(`/online/kisi/${h.id}`); }}
          style={({ pressed }) => ({ flexDirection: yon(rtl), alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderColor: "rgba(201,162,78,0.12)", backgroundColor: pressed ? "rgba(201,162,78,0.08)" : "transparent" })}>
          <KisiYuzu id={h.id} ad={h.ad} boyut={40} {...yuzBilgisi(o.kisiler, h.id)} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 10.5, letterSpacing: rtl ? 0 : 1, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.rol." + h.rol)}</Text>
            <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 15.5, color: C.parchment, textAlign: hiza(rtl) }}>{h.ad}</Text>
          </View>
          <SatirOku rtl={rtl} />
        </Pressable>)}
      </Cerceve>
    </> : null}
    {ben.kulYemini ? <View style={{ marginTop: 12, flexDirection: yon(rtl) }}><Rozet icon="flame" metin={t("onl.ka.kulYemini")} renk={C.emberSoft} /></View> : null}
  </OnlineSayfa>;
}

export default function OnlineKarakter() {
  return onlineEkranAcik() ? <OnlineKapisi><KarakterEkran /></OnlineKapisi> : <OnlineYakinda />;
}
