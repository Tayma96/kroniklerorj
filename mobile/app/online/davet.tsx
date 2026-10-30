// Davet kodu: 6 karakter (0/O, 1/I/L yok). Kod davet edenin yerleşimine çözülür; davetle gelene ev sınırı esnektir.
import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, ScrollView, ActivityIndicator, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { hap } from "../../lib/haptics";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi, useOnline } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { adDogrula } from "../../lib/online/ad";
import { adHatasiMi, hataAnahtari } from "../../lib/online/hata";
import { davetKoduGecerli, davetKoduTemizle, DAVET_UZUNLUGU, yerlesimBul, type OnlineHata } from "../../lib/online/protokol";
import { AltinDugme, Bant, Baslik, Cerceve, CizgiDugme, Doluluk, giris, geriGit, GLOW, Madalyon, Sahne, TUR_IKON, UstBar, hiza, yon } from "../../lib/online/ui";

const SAHNE = require("../../assets/arka/cami_avlu.jpg");

function DavetEkran() {
  const router = useRouter();
  const { t, rtl, lang } = useI18n();
  const ins = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();
  const o = useOnline();
  const kutu = useRef<TextInput>(null);
  const [kod, setKod] = useState(() => davetKoduTemizle(o.davetOnKodu ?? o.davet?.kod ?? ""));
  const [odak, setOdak] = useState(false);
  const [yanlisHarf, setYanlisHarf] = useState(false);
  const [gonderHata, setGonderHata] = useState<OnlineHata | null>(null);
  const tam = davetKoduGecerli(kod);

  useEffect(() => { if (!o.dunya && o.oturum) void o.dunyaYukle(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (tam && o.oturum && o.davet?.kod !== kod) void o.davetCoz(kod);
  }, [kod, tam]); // eslint-disable-line react-hooks/exhaustive-deps

  const yaz = (v: string) => {
    const temiz = davetKoduTemizle(v);
    setYanlisHarf(temiz.length < Math.min(DAVET_UZUNLUGU, v.replace(/[\s-]/g, "").length));
    setGonderHata(null);
    if (temiz !== kod) { o.davetBirak(); setKod(temiz); }
  };
  const temizle = () => { setKod(""); setYanlisHarf(false); setGonderHata(null); o.davetBirak(); kutu.current?.focus(); };

  const cozulen = o.davet && o.davet.kod === kod ? o.davet : null;
  const yer = cozulen ? yerlesimBul(o.dunya, cozulen.yerlesim) : undefined;
  const taslakTamam = adDogrula(o.taslak.ad).ok && !!o.taslak.cinsiyet;
  const cozuyor = o.islem === "davet";
  const hata = gonderHata ?? (!cozuyor && tam && !cozulen ? o.hata : null);

  const kabul = async () => {
    if (!cozulen) return;
    const s = await o.profilOlustur({ davet: cozulen.kod });
    if (s.ok) router.replace("/online/varis?ilk=1");
    else setGonderHata(s.hata);
  };

  if (!o.oturum) {
    return <Sahne gorsel={SAHNE} oran={0.5}>
      <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
        <Bant tur="bilgi" metin={t("onl.p.girisGerek")} rtl={rtl} eylem={t("onl.p.giriseDon")} onEylem={() => router.replace("/online")} />
      </View>
    </Sahne>;
  }

  const hucre = Math.min(48, Math.floor((W - 32 - 5 * 8) / 6));
  return <Sahne gorsel={SAHNE} oran={0.42} koyu={0.32}>
    <ScrollView contentContainerStyle={{ paddingTop: ins.top + 6, paddingHorizontal: 16, paddingBottom: ins.bottom + 24 }} keyboardShouldPersistTaps="handled">
      <UstBar adim={2} rtl={rtl} t={t} onGeri={() => geriGit(router, "/online/yerlesim")} />
      <Animated.View entering={giris(60)} style={{ marginTop: 26 }}>
        <Baslik ust={t("onl.d.ust")} baslik={t("onl.d.baslik")} alt={t("onl.d.alt")} rtl={rtl} />
      </Animated.View>

      <Animated.View entering={giris(140)} style={{ marginTop: 10 }}>
        <View style={{ height: hucre * 1.25 + 8, justifyContent: "center" }}>
          {/* Hücreler: tek bir gizli metin kutusu üstte durur, dokununca klavye açılır. Görsel düzen hep soldan sağa. */}
          <View pointerEvents="none" style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
            {Array.from({ length: DAVET_UZUNLUGU }, (_, i) => {
              const h = kod[i] ?? "", simdi = odak && i === Math.min(kod.length, DAVET_UZUNLUGU - 1) && !tam;
              return <View key={i} style={[{ width: hucre, height: hucre * 1.25, borderRadius: 8, borderWidth: simdi ? 2 : 1.5, borderColor: simdi ? C.goldBright : h ? C.gold : "rgba(168,130,63,0.6)", backgroundColor: h ? "rgba(42,31,19,0.95)" : "rgba(14,10,6,0.85)", alignItems: "center", justifyContent: "center" }, simdi ? GLOW : null]}>
                <Text style={{ fontFamily: F.display, fontSize: Math.round(hucre * 0.5), color: cozulen ? C.goldBright : C.parchment }}>{h}</Text>
                {!h ? <View style={{ position: "absolute", bottom: 9, width: hucre * 0.36, height: 1.5, backgroundColor: "rgba(201,162,78,0.45)" }} /> : null}
              </View>;
            })}
          </View>
          <TextInput
            ref={kutu}
            value={kod}
            onChangeText={yaz}
            onFocus={() => setOdak(true)}
            onBlur={() => setOdak(false)}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            maxLength={DAVET_UZUNLUGU + 2}
            caretHidden
            accessibilityLabel={t("onl.d.kutu")}
            accessibilityHint={t("onl.d.ipucu")}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.02, color: "transparent", fontSize: 18 }}
          />
        </View>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", justifyContent: "center", gap: 7, marginTop: 10, minHeight: 22 }}>
          <GameIcon name="scroll" size={14} color={yanlisHarf ? C.emberSoft : C.parchmentMuted} />
          <Text style={{ flexShrink: 1, fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: yanlisHarf ? C.emberSoft : C.parchmentMuted, textAlign: "center" }}>{t("onl.d.ipucu")}</Text>
        </View>
      </Animated.View>

      <View style={{ marginTop: 18, gap: 12 }}>
        {cozuyor ? (
          <Cerceve ic={{ flexDirection: yon(rtl), alignItems: "center", justifyContent: "center", padding: 18, gap: 12 }}>
            <ActivityIndicator color={C.goldBright} />
            <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentDim }}>{t("onl.d.cozuluyor")}</Text>
          </Cerceve>
        ) : null}

        {cozulen ? (
          <Animated.View entering={giris(0)}>
            <Cerceve aktif ic={{ padding: 14, gap: 12 }}>
              <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 12 }}>
                <Madalyon icon="family" size={44} aktif />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 1.5, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.d.davetEden")}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 17, lineHeight: 23, color: C.parchment, textAlign: hiza(rtl) }}>{applyParams(t("onl.d.cagiriyor"), [cozulen.davetEden, yer?.yerlesim.ad ?? cozulen.yerlesim], lang)}</Text>
                </View>
              </View>
              <View style={{ height: 1, backgroundColor: "rgba(201,162,78,0.25)" }} />
              <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 12 }}>
                <Madalyon icon={TUR_IKON[yer?.yerlesim.tur ?? "kasaba"]} size={40} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 19, color: C.goldBright, textAlign: hiza(rtl) }}>{yer?.yerlesim.ad ?? cozulen.yerlesim}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{yer ? `${t("onl.tur." + yer.yerlesim.tur)} · ${yer.beylik.ad}` : cozulen.beylik}</Text>
                  {yer ? <View style={{ marginTop: 4 }}><Doluluk nufus={yer.yerlesim.nufus} kapasite={yer.yerlesim.evKapasite} rtl={rtl} /></View> : null}
                </View>
              </View>
              <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
                <GameIcon name="house" size={14} color={C.sage} />
                <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.d.esnek")}</Text>
              </View>
              {taslakTamam ? (
                <AltinDugme etiket={t("onl.d.kabul")} icon="walk" rtl={rtl} bekliyor={o.islem === "profil"} onPress={() => { void kabul(); }} />
              ) : (
                <Bant tur="bilgi" metin={t("onl.y.taslakGerek")} rtl={rtl} eylem={t("onl.y.profileDon")} onEylem={() => router.push("/online/profil")} />
              )}
            </Cerceve>
          </Animated.View>
        ) : null}

        {hata ? (
          <Bant metin={t(hataAnahtari(hata))} rtl={rtl}
            eylem={adHatasiMi(hata) ? t("onl.y.adDegistir") : undefined}
            onEylem={adHatasiMi(hata) ? () => router.push("/online/profil") : undefined} />
        ) : null}

        {kod.length > 0 ? <CizgiDugme etiket={t("onl.d.baskaKod")} rtl={rtl} kucuk onPress={() => { hap("tap"); temizle(); }} /> : null}
        <CizgiDugme etiket={t("onl.d.davetsiz")} icon="map" rtl={rtl} kucuk onPress={() => geriGit(router, "/online/yerlesim")} />
      </View>
    </ScrollView>
  </Sahne>;
}

export default function OnlineDavet() {
  return onlineEkranAcik() ? <OnlineKapisi><DavetEkran /></OnlineKapisi> : <OnlineYakinda />;
}
