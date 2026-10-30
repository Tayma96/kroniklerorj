// Çevrimiçi giriş: sahne, vaat, Google düğmesi (Faz 1d'de bağlanır; şimdilik kapalı) ve yalnız geliştirici
// kapısı açıkken görünen, sahte veriyle ilerleyen geliştirici oturumu.
import { View, Text, ScrollView, ActivityIndicator, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { useI18n } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { hap } from "../../lib/haptics";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi, useOnline } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { genelHataMi, hataAnahtari } from "../../lib/online/hata";
import { AltinDugme, Bant, Cerceve, CizgiDugme, GeriDugme, giris, geriGit, Madalyon, Ornament, ONL, Sahne, hiza, yon } from "../../lib/online/ui";

const SAHNE = require("../../assets/tasarim/v4/town-yaz.jpg");
const VAATLER = [
  { icon: "castle", key: "onl.g.vaat1" },
  { icon: "hourglass", key: "onl.g.vaat2" },
  { icon: "family", key: "onl.g.vaat3" },
] as const;

function GirisEkran() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const ins = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const o = useOnline();
  const dar = W < 360;
  const devam = () => router.push(o.profil ? "/online/varis" : "/online/profil");
  const gelistirici = () => { o.gelistiriciGiris(); router.push("/online/profil"); };

  return <Sahne gorsel={SAHNE} oran={0.56} koyu={0.12}>
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: ins.top + 6, paddingBottom: ins.bottom + 20, paddingHorizontal: 16 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: yon(rtl), alignItems: "center", justifyContent: "space-between" }}>
        <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/")} />
        <View accessible accessibilityLabel={t(o.sunucuVar ? "onl.g.sunucuAcik" : "onl.g.sunucuHazirlaniyor")} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 7, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: "rgba(201,162,78,0.45)", backgroundColor: "rgba(14,10,6,0.72)" }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: o.sunucuVar ? C.sage : C.emberSoft }} />
          <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: rtl ? 0 : 1, color: C.parchmentDim }}>{t(o.sunucuVar ? "onl.g.sunucuAcik" : "onl.g.sunucuHazirlaniyor")}</Text>
        </View>
      </View>

      <View style={{ flexGrow: 1, minHeight: Math.max(dar ? 110 : 150, H * 0.24) }} />

      <Animated.View entering={giris(80)} style={{ alignItems: "center", marginBottom: 10 }}>
        <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: ONL.gold, backgroundColor: "rgba(201,162,78,0.16)" }}>
          <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 2, color: C.goldBright }}>{t("onl.g.ust")}</Text>
        </View>
      </Animated.View>
      <Animated.Text entering={giris(160)} accessibilityRole="header" style={{ fontFamily: F.display, fontSize: dar ? 24 : 27, lineHeight: dar ? 31 : 35, color: C.parchment, textAlign: "center", textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 8 }}>{t("onl.g.baslik")}</Animated.Text>
      <Animated.View entering={giris(220)} style={{ alignItems: "center", marginVertical: 9 }}><Ornament size={16} /></Animated.View>
      <Animated.Text entering={giris(280)} style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 23, color: C.parchmentDim, textAlign: "center", marginBottom: 16 }}>{t("onl.g.metin")}</Animated.Text>

      <Animated.View entering={giris(360)} style={{ flexDirection: yon(rtl), gap: 8, marginBottom: 16 }}>
        {VAATLER.map((v) => (
          <Cerceve key={v.key} radius={9} style={{ flex: 1 }} ic={{ alignItems: "center", paddingVertical: 11, paddingHorizontal: 6, gap: 7 }}>
            <Madalyon icon={v.icon} size={dar ? 32 : 36} />
            <Text style={{ fontFamily: F.serif, fontSize: dar ? 13 : 14, lineHeight: dar ? 17 : 18, color: C.parchment, textAlign: "center" }}>{t(v.key)}</Text>
          </Cerceve>
        ))}
      </Animated.View>

      <Animated.View entering={giris(440)} style={{ gap: 10 }}>
        {!o.hazir ? (
          <View style={{ minHeight: 54, alignItems: "center", justifyContent: "center" }} accessibilityLabel={t("onl.yukleniyor")}>
            <ActivityIndicator color={C.goldBright} />
          </View>
        ) : o.oturum ? (
          <Cerceve ic={{ padding: 14, gap: 12 }}>
            <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 12 }}>
              <Madalyon icon={o.profil ? "house" : "karakter"} size={40} aktif />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 15, color: C.goldBright, textAlign: hiza(rtl) }}>{o.profil ? o.profil.ad : t("onl.g.oturumVar")}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t(o.profil ? "onl.g.devamProfil" : "onl.g.devamYeni")}</Text>
              </View>
            </View>
            <AltinDugme etiket={t("onl.g.devam")} icon="walk" rtl={rtl} onPress={devam} />
            <CizgiDugme etiket={t("onl.g.cikis")} rtl={rtl} kucuk onPress={() => { void o.cikis(); }} />
          </Cerceve>
        ) : (
          <>
            <Pressable disabled accessibilityLabel={`${t("onl.g.google")} — ${t("onl.g.googleYakinda")}`} accessibilityState={{ disabled: true }}
              style={{ minHeight: 54, borderRadius: 8, borderWidth: 1.5, borderColor: "rgba(201,162,78,0.45)", backgroundColor: "rgba(238,223,194,0.1)", flexDirection: yon(rtl), alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 14 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(238,223,194,0.22)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchmentDim }}>G</Text>
              </View>
              <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.display, fontSize: dar ? 13 : 14.5, letterSpacing: rtl || dar ? 0 : 1, color: C.parchmentDim }}>{t("onl.g.google")}</Text>
              <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: "rgba(201,162,78,0.22)" }}>
                <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: rtl ? 0 : 1, color: C.goldBright }}>{t("gir.yakinda")}</Text>
              </View>
            </Pressable>
            <View style={{ flexDirection: yon(rtl), alignItems: "center", justifyContent: "center", gap: 7 }}>
              <GameIcon name="hourglass" size={14} color={C.parchmentMuted} />
              <Text style={{ flexShrink: 1, fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: "center" }}>{t("onl.g.googleYakinda")}</Text>
            </View>
          </>
        )}
        {genelHataMi(o.hata) ? <Bant metin={t(hataAnahtari(o.hata))} rtl={rtl} eylem={t("onl.yenidenDene")} onEylem={() => { void o.geriYukle(); }} /> : null}
      </Animated.View>

      {o.gelistiriciAcik && !o.oturum ? (
        <Animated.View entering={giris(520)} style={{ marginTop: 22, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(111,160,192,0.6)", backgroundColor: "rgba(10,16,22,0.78)", padding: 13, gap: 10 }}>
          <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
            <GameIcon name="cog" size={16} color={C.frost} />
            <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 1.5, color: C.frost }}>{t("onl.g.gelistirici")}</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: "rgba(111,160,192,0.35)" }} />
          </View>
          <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.g.gelistiriciMetin")}</Text>
          <Pressable accessibilityLabel={t("onl.g.gelistiriciDugme")} onPress={() => { hap("tap"); gelistirici(); }}
            style={({ pressed }) => ({ minHeight: 48, borderRadius: 8, borderWidth: 1, borderColor: C.frost, backgroundColor: pressed ? "rgba(111,160,192,0.28)" : "rgba(111,160,192,0.14)", flexDirection: yon(rtl), alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 12 })}>
            <GameIcon name="compass" size={17} color={C.frost} />
            <Text style={{ flexShrink: 1, fontFamily: F.display, fontSize: 13.5, letterSpacing: rtl ? 0 : 1, color: C.parchment, textAlign: "center" }}>{t("onl.g.gelistiriciDugme")}</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </ScrollView>
  </Sahne>;
}

export default function OnlineGiris() {
  return onlineEkranAcik() ? <OnlineKapisi><GirisEkran /></OnlineKapisi> : <OnlineYakinda />;
}
