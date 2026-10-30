import { useRef, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { professionById, sinavDurumu, ustalikSinavi, rakipAktif, rakipYarisi, rakipOrtaklikHazir, hasProfAction, canProfAction, meslekYoluKademesi, neslinSaheseri, meslekSaheserleri, saheserYapabilir, cirakAlabilir, cirakDersHazir, CIRAK_BEDEL } from "../../lib/game";
import { SinavKartiModal, SinavKartiVeri } from "../../lib/kart3d";
import { C, F, L } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { hap } from "../../lib/haptics";
import { playTap } from "../../lib/sound";
import { BackLabel, Panel } from "../../lib/ui";
import { MeslekFresk, Madalyon, Giris, Sekmeler, meslekSahnesi, type SekmeId } from "../../lib/sayfa/meslek/ortak";
import { MeslekVitrini, KazancSeridi } from "../../lib/sayfa/meslek/vitrin";
import { KariyerMerdiveni, FirsatKarti, OmurYolu } from "../../lib/sayfa/meslek/kariyer";
import { RakipPaneli, CirakPaneli } from "../../lib/sayfa/meslek/lonca";
import { MeslekListesi } from "../../lib/sayfa/meslek/meslekler";

export default function Meslek() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, apply } = useGame();
  const { t, lang } = useI18n();
  const [sinav, setSinav] = useState<SinavKartiVeri | null>(null); // açılışta dondurulur: sonuç gelince kademe değişse de kart kapanana dek aynı kalır
  const [yaris, setYaris] = useState<SinavKartiVeri | null>(null); // lonca bayrağı yarışı — aynı dondurma kuralı
  const [sekme, setSekme] = useState<SekmeId>("kariyer");
  const scroll = useRef<ScrollView>(null), sekmeY = useRef(0), kaydirY = useRef(0);
  if (!state) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player, rtl = lang === "ar";
  const geri = (
    <Pressable accessibilityRole="button" accessibilityLabel={t("common.back")} hitSlop={6} onPress={() => router.back()}
      style={{ position: "absolute", top: insets.top + 6, left: rtl ? undefined : 10, right: rtl ? 10 : undefined, minHeight: L.touch, justifyContent: "center", paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: C.borderHi + "99", backgroundColor: "rgba(14,10,6,0.62)" }}>
      <BackLabel />
    </Pressable>
  );
  if (p.age < 13) {
    return (
      <MeslekFresk source={meslekSahnesi("")}>
        <View style={{ flex: 1, paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
          <MeslekVitrini ust={insets.top} ozel={{ ad: t("scr.meslek"), alt: "", icon: "anvil", sahne: "" }} />
          <Giris>
            <Panel>
              <View style={{ alignItems: "center", gap: 12, paddingVertical: 8 }}>
                <Madalyon icon="hourglass" size={62} />
                <Text style={{ fontFamily: F.serifItalic, fontSize: 17, lineHeight: 24, color: C.parchmentDim, textAlign: "center" }}>{t("mes.tooYoung")}</Text>
              </View>
            </Panel>
          </Giris>
        </View>
        {geri}
      </MeslekFresk>
    );
  }
  const issiz = p.profession === "işsiz" || !professionById(p.profession);
  const acikSekme: SekmeId = issiz ? "meslekler" : sekme;
  // Bekleyen iş: sekmede köz noktası yanar (sınav, fırsat, şaheser · yarış, ortaklık, ders, çırak adayı).
  const d = issiz ? null : sinavDurumu(state);
  const kariyerIs = !!d?.hazir || (hasProfAction(p) && canProfAction(state))
    || (meslekYoluKademesi(p) >= 3 && !neslinSaheseri(state) && meslekSaheserleri(p.profession).some((x) => saheserYapabilir(state, x.id)));
  const r = rakipAktif(p), cirakVar = !!p.cirak && p.cirak.prof === p.profession;
  const loncaIs = (!!r && r.yaris != null) || rakipOrtaklikHazir(p) || cirakDersHazir(state) || (!cirakVar && cirakAlabilir(p, state.turn) && p.money >= CIRAK_BEDEL);
  const sec = (id: SekmeId) => {
    if (id === sekme) return;
    hap("selection"); playTap(); setSekme(id);
    if (kaydirY.current > sekmeY.current) scroll.current?.scrollTo({ y: Math.max(0, sekmeY.current - 8), animated: false }); // yeni sekme baştan okunur
  };
  return (
    <MeslekFresk source={meslekSahnesi(p.profession)}>
      <ScrollView ref={scroll} onScroll={(e) => { kaydirY.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={64} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <MeslekVitrini ust={insets.top} />
        <Giris><KazancSeridi /></Giris>
        {issiz && <View style={{ height: 14 }} />}
        {!issiz && (
          <View onLayout={(e) => { sekmeY.current = e.nativeEvent.layout.y; }}>
            <Sekmeler secili={acikSekme} rtl={rtl} onSec={sec} sekmeler={[
              { id: "kariyer", ad: t("meslek.tab.kariyer"), icon: "medal", isaret: kariyerIs, isaretAd: t("meslek.bekleyen") },
              { id: "lonca", ad: t("meslek.tab.lonca"), icon: "banner", isaret: loncaIs, isaretAd: t("meslek.bekleyen") },
              { id: "meslekler", ad: t("meslek.tab.meslekler"), icon: "anvil" },
            ]} />
          </View>
        )}
        {acikSekme === "kariyer" && <View key="kariyer">
          <Giris sira={0}><KariyerMerdiveni onSinav={setSinav} /></Giris>
          <Giris sira={1}><FirsatKarti /></Giris>
          <Giris sira={2}><OmurYolu /></Giris>
        </View>}
        {acikSekme === "lonca" && <View key="lonca">
          <Giris sira={0}><RakipPaneli onYaris={setYaris} /></Giris>
          <Giris sira={1}><CirakPaneli /></Giris>
        </View>}
        {acikSekme === "meslekler" && <View key="meslekler">
          <Giris><MeslekListesi onGecti={() => { setSekme("kariyer"); scroll.current?.scrollTo({ y: 0, animated: true }); }} /></Giris>
        </View>}
      </ScrollView>
      {geri}
      <SinavKartiModal v={sinav} onSec={(yol) => { const res = ustalikSinavi(state, yol); if (res.basari != null) apply(() => res.state); return res.basari; }} onKapat={() => setSinav(null)} />
      <SinavKartiModal v={yaris} onSec={(yol) => { const res = rakipYarisi(state, yol); if (res.basari != null) apply(() => res.state); return res.basari; }} onKapat={() => setYaris(null)} />
    </MeslekFresk>
  );
}
