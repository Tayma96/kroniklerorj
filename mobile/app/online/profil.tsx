// Çevrimiçi kimlik: dünyada tek olan görünen ad (sunucu kurallarıyla canlı denetim) ve cinsiyet.
// Tek oyunculu ad ya da kayıt burada görünmez; taslak lib/online/durum.tsx'te tutulur.
import { useState } from "react";
import { View, Text, TextInput, ScrollView, Image, StyleSheet, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated from "react-native-reanimated";
import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { useI18n } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { hap } from "../../lib/haptics";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi, useOnline } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { adDogrula, adDuzenle, adKurallari, AD_EN_UZUN } from "../../lib/online/ad";
import { adHatasiMi, hataAnahtari } from "../../lib/online/hata";
import type { Cinsiyet } from "../../lib/online/protokol";
import { AltinDugme, Bant, Baslik, Bolum, Carpi, Cerceve, Check, giris, geriGit, GLOW, Sahne, UstBar, hiza, yon } from "../../lib/online/ui";

const SAHNE = require("../../assets/hero/cocuk_yaz.jpg");
const PORTRE: Record<Cinsiyet, number> = { erkek: require("../../assets/portre/e_cocuk.png"), kadın: require("../../assets/portre/k_cocuk.png") };

function Kural({ ok, dokundu, metin, rtl }: { ok: boolean; dokundu: boolean; metin: string; rtl: boolean }) {
  const kotu = dokundu && !ok;
  return <View accessible accessibilityLabel={metin} accessibilityState={{ checked: ok }} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 6, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: ok ? "rgba(74,154,90,0.6)" : kotu ? "rgba(200,64,64,0.6)" : "rgba(201,162,78,0.3)", backgroundColor: "rgba(14,10,6,0.7)" }}>
    <View style={{ width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: ok ? C.sage : kotu ? "rgba(200,64,64,0.25)" : "rgba(201,162,78,0.18)" }}>
      {ok ? <Check size={10} color={C.inkOnGold} /> : kotu ? <Carpi size={9} color={C.blood} /> : <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.parchmentMuted }} />}
    </View>
    <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: ok ? C.parchment : C.parchmentDim }}>{metin}</Text>
  </View>;
}

function CinsiyetKarti({ deger, etiket, aktif, soluk, rtl, onPress }: { deger: Cinsiyet; etiket: string; aktif: boolean; soluk: boolean; rtl: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="radio" accessibilityLabel={etiket} accessibilityState={{ checked: aktif, selected: aktif }} style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
    <Cerceve aktif={aktif} radius={12}>
      <Image accessible={false} source={PORTRE[deger]} resizeMode="cover" style={{ width: "100%", aspectRatio: 0.92 }} />
      {soluk ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,7,4,0.5)" }]} /> : null}
      <LinearGradient pointerEvents="none" colors={["rgba(14,10,6,0)", "rgba(14,10,6,0.78)", "rgba(14,10,6,0.96)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "44%" }} />
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 11, alignItems: "center" }}>
        <Text style={{ fontFamily: F.display, fontSize: 17, letterSpacing: rtl ? 0 : 2, color: aktif ? C.goldBright : C.parchment, textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 6 }}>{etiket}</Text>
        <View style={{ width: aktif ? 46 : 24, height: 1.5, marginTop: 5, backgroundColor: aktif ? C.gold : "rgba(201,162,78,0.45)" }} />
      </View>
      {aktif ? <View pointerEvents="none" style={[{ position: "absolute", top: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: C.gold, borderWidth: 1.5, borderColor: C.goldBright, alignItems: "center", justifyContent: "center" }, rtl ? { left: 8 } : { right: 8 }, GLOW]}><Check size={15} /></View> : null}
    </Cerceve>
  </Pressable>;
}

function ProfilEkran() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const ins = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();
  const o = useOnline();
  const [odak, setOdak] = useState(false);
  const [dokundu, setDokundu] = useState(o.taslak.ad.length > 0);
  const ad = o.taslak.ad;
  const sonuc = adDogrula(ad);
  const kural = adKurallari(ad);
  const uzunluk = [...adDuzenle(ad)].length;
  const sunucuHatasi = adHatasiMi(o.hata) ? o.hata : null;
  const yerelHata = dokundu && !sonuc.ok && sonuc.hata === "ad_yasak" ? "onl.h.adYasak" : null;
  const hataMetni = sunucuHatasi ? t(hataAnahtari(sunucuHatasi)) : yerelHata ? t(yerelHata) : null;
  const hazir = sonuc.ok && !!o.taslak.cinsiyet && !sunucuHatasi;
  const oneri = o.oturum?.adOnerisi && adDogrula(o.oturum.adOnerisi).ok && !ad ? adDuzenle(o.oturum.adOnerisi) : null;
  const yaz = (v: string) => { setDokundu(true); if (sunucuHatasi) o.hataTemizle(); o.taslakGuncelle({ ad: v }); };
  const sec = (c: Cinsiyet) => { hap("selection"); o.taslakGuncelle({ cinsiyet: c }); };
  const ileri = () => { if (sonuc.ok) o.taslakGuncelle({ ad: sonuc.ad }); router.push("/online/yerlesim"); };

  if (!o.oturum) {
    return <Sahne gorsel={SAHNE} oran={0.5}>
      <View style={{ flex: 1, justifyContent: "center", padding: 20, gap: 14 }}>
        <Bant tur="bilgi" metin={t("onl.p.girisGerek")} rtl={rtl} eylem={t("onl.p.giriseDon")} onEylem={() => router.replace("/online")} />
      </View>
    </Sahne>;
  }

  return <Sahne gorsel={SAHNE} oran={0.42} koyu={0.3}>
    <ScrollView contentContainerStyle={{ paddingTop: ins.top + 6, paddingHorizontal: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
      <UstBar adim={1} rtl={rtl} t={t} onGeri={() => geriGit(router, "/online")} />
      <Animated.View entering={giris(60)} style={{ marginTop: W < 360 ? 26 : 40 }}>
        <Baslik ust={t("onl.p.ust")} baslik={t("onl.p.baslik")} alt={t("onl.p.alt")} rtl={rtl} />
      </Animated.View>

      <Animated.View entering={giris(140)}>
        <Bolum metin={t("onl.p.adBolum")} rtl={rtl} ust={16} />
        <Cerceve aktif={odak} ic={{ flexDirection: yon(rtl), alignItems: "center", paddingHorizontal: 14, gap: 10 }}>
          <View style={{ flexShrink: 0 }}><GameIcon name="scroll" size={20} color={odak ? C.goldBright : C.gold} /></View>
          <TextInput
            value={ad}
            onChangeText={yaz}
            onFocus={() => setOdak(true)}
            onBlur={() => { setOdak(false); setDokundu(ad.length > 0); }}
            placeholder={t("onl.p.adYer")}
            placeholderTextColor={C.parchmentMuted}
            maxLength={AD_EN_UZUN + 6}
            autoCapitalize="words"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="done"
            accessibilityLabel={t("onl.p.adBolum")}
            accessibilityHint={t("onl.p.adIpucu")}
            style={{ flex: 1, minWidth: 0, minHeight: 54, paddingVertical: 10, fontFamily: F.serif, fontSize: 20, color: C.parchment, textAlign: hiza(rtl), writingDirection: "ltr" }}
          />
          <Text accessibilityLabel={`${uzunluk}/${AD_EN_UZUN}`} style={{ flexShrink: 0, fontFamily: F.display, fontSize: 12, color: uzunluk > AD_EN_UZUN ? C.blood : C.parchmentMuted }}>{uzunluk}/{AD_EN_UZUN}</Text>
        </Cerceve>
        <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 7, marginTop: 10 }}>
          <Kural ok={kural.uzunluk} dokundu={dokundu} metin={t("onl.p.kuralUzunluk")} rtl={rtl} />
          <Kural ok={kural.harf} dokundu={dokundu} metin={t("onl.p.kuralHarf")} rtl={rtl} />
          <Kural ok={kural.bosluk} dokundu={dokundu} metin={t("onl.p.kuralBosluk")} rtl={rtl} />
        </View>
        {hataMetni ? <View style={{ marginTop: 10 }}><Bant metin={hataMetni} rtl={rtl} /></View> : null}
        {oneri ? (
          <Pressable accessibilityLabel={`${t("onl.p.oneri")}: ${oneri}`} onPress={() => yaz(oneri)} style={{ marginTop: 10, alignSelf: rtl ? "flex-end" : "flex-start", flexDirection: yon(rtl), alignItems: "center", gap: 8, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: "rgba(201,162,78,0.55)", backgroundColor: "rgba(201,162,78,0.12)" }}>
            <GameIcon name="star" size={14} color={C.goldBright} />
            <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchment }}>{t("onl.p.oneri")}: {oneri}</Text>
          </Pressable>
        ) : null}
      </Animated.View>

      <Animated.View entering={giris(220)}>
        <Bolum metin={t("onl.p.cinsiyetBolum")} rtl={rtl} />
        <View accessibilityRole="radiogroup" style={{ flexDirection: yon(rtl), gap: 12 }}>
          {(["erkek", "kadın"] as const).map((c) => (
            <CinsiyetKarti key={c} deger={c} etiket={t(c === "erkek" ? "onl.p.erkek" : "onl.p.kadin")} aktif={o.taslak.cinsiyet === c} soluk={!!o.taslak.cinsiyet && o.taslak.cinsiyet !== c} rtl={rtl} onPress={() => sec(c)} />
          ))}
        </View>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, marginTop: 12 }}>
          <GameIcon name="hourglass" size={14} color={C.parchmentMuted} />
          <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.p.kalici")}</Text>
        </View>
      </Animated.View>
    </ScrollView>
    <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: ins.bottom + 14, borderTopWidth: 1, borderTopColor: "rgba(201,162,78,0.25)", backgroundColor: "rgba(14,10,6,0.94)" }}>
      <AltinDugme etiket={t("onl.p.ileri")} icon="map" rtl={rtl} kapali={!hazir} onPress={ileri} erisim={hazir ? t("onl.p.ileri") : `${t("onl.p.ileri")} — ${t("onl.p.eksik")}`} />
    </View>
  </Sahne>;
}

export default function OnlineProfil() {
  return onlineEkranAcik() ? <OnlineKapisi><ProfilEkran /></OnlineKapisi> : <OnlineYakinda />;
}
