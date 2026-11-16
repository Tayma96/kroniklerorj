// Sokak sekmesi: yerleşimin mekânları büyük, görselli karolar olarak (Han/Hanlar, Pazar, Çarşı, Lonca, Divan, Kervansaray,
// Zaviye, Hizmet Pazarı, Mahalle). Canlı durum satırı yalnız eldeki yerleşim verisinden (harita, meslek); yeni çağrı yok.
import { View, type ImageSourcePropType } from "react-native";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../../lib/i18n";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { giris } from "../../lib/online/ui";
import { Hap, OnlineSayfa, SayfaBasi, YerlesimBekle, sahneGorseli, useYerlesimEkrani } from "../../lib/online/yasam-ui";
import { MekanKarosu } from "../../lib/online/gezinti-ui";
import { MESLEK_YASI } from "../../lib/online/meslek-veri";
import { hatirlananDukkanlar } from "../../lib/online/tezgah-veri";

type MekanId = "han" | "pazar" | "carsi" | "lonca" | "divan" | "kervansaray" | "zaviye" | "hizmet" | "mahalle";
interface Mekan { id: MekanId; icon: string; yol: string; gorsel?: ImageSourcePropType }

/** Mekân sırası: en çok uğranan önce. Hizmet Pazarı için uygun görsel yok (degrade + madalyon). */
const MEKANLAR: readonly Mekan[] = [
  { id: "han", icon: "beer", yol: "/online/han", gorsel: require("../../assets/mulk/han.jpg") },
  { id: "pazar", icon: "scales", yol: "/online/pazar", gorsel: require("../../assets/tasarim/v4/venue-pazar.jpg") },
  { id: "carsi", icon: "coins", yol: "/online/carsi", gorsel: require("../../assets/mulk/dukkan.jpg") },
  { id: "lonca", icon: "banner", yol: "/online/lonca", gorsel: require("../../assets/arka/ahi_tekke.jpg") },
  { id: "divan", icon: "castle", yol: "/online/siyaset", gorsel: require("../../assets/arka/kadi_divan.jpg") },
  { id: "kervansaray", icon: "camel", yol: "/online/kervan", gorsel: require("../../assets/arka/gurbet_yol.jpg") },
  { id: "zaviye", icon: "prayer-beads", yol: "/online/topluluk", gorsel: require("../../assets/arka/cami_avlu.jpg") },
  { id: "hizmet", icon: "backpack", yol: "/online/hizmet" },
  { id: "mahalle", icon: "walk", yol: "/online/mahalle", gorsel: require("../../assets/tasarim/v4/venue-mahalle.jpg") },
];

function SokakEkran() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const o = useYerlesimEkrani();
  const y = o.yerlesim;
  if (!y) return <YerlesimBekle sekme="sokak" rtl={rtl} t={t} onGiris={() => router.replace("/online")} />;

  const ben = y.ben;
  const coklu = y.yerlesim.tur !== "koy";
  const kisiSay = (mekan: string) => y.harita.find((m) => m.id === mekan)?.kisiler.filter((k) => k.id !== ben.id).length ?? 0;
  const benYer = y.harita.find((m) => m.kisiler.some((k) => k.id === ben.id));
  const meslek = o.meslekDurumu?.kayit.a || null;

  const durum = (id: MekanId): string | null => {
    switch (id) {
      case "han": { const n = kisiSay("han"); return n ? applyParams(t("onl.sk.d.hanKisi"), [n]) : t("onl.sk.d.hanSessiz"); }
      case "pazar": { const n = kisiSay("carsi"); return n ? applyParams(t("onl.sk.d.carsiKisi"), [n]) : null; }
      case "carsi": {
        const l = hatirlananDukkanlar(o.profil?.hesapId ?? "");
        if (!l) return null;
        const acik = l.dukkanlar.filter((d) => !d.kepenk).length;
        return l.dukkanlar.length ? applyParams(t("onl.sk.d.carsi"), [l.dukkanlar.length, acik]) : t("onl.sk.d.carsiBos");
      }
      case "lonca": return meslek ? applyParams(t("onl.sk.d.lonca"), [t("onl.mes." + meslek)]) : t("onl.sk.d.loncaYok");
      case "mahalle": return benYer ? applyParams(t("onl.sk.d.mahalle"), [t("onl.mekan." + benYer.id)]) : null;
      default: return null;
    }
  };
  const kilit = (id: MekanId): string | null => (id === "lonca" && ben.yas < MESLEK_YASI ? applyParams(t("onl.sk.k.yas"), [MESLEK_YASI]) : null);
  const ad = (id: MekanId) => t(id === "han" && coklu ? "onl.sk.m.hanlar" : "onl.sk.m." + id);
  const ne = (id: MekanId) => t(id === "han" && coklu ? "onl.sk.n.hanlar" : "onl.sk.n." + id);

  return <OnlineSayfa gorsel={sahneGorseli(y.yerlesim.tur, y.saat.mevsim)} oran={0.34} sekme="sokak" rtl={rtl} t={t} rozet={{ ben: ben.ozellikPuani > 0 }}>
    <SayfaBasi ust={y.yerlesim.ad} baslik={t("onl.sk.baslik")} alt={t("onl.sk.alt")} rtl={rtl}
      sag={<Hap icon="coins" metin={String(ben.para)} erisim={applyParams(t("onl.ya.paraErisim"), [ben.para])} />} />
    <View style={{ minHeight: 64 }} />
    <View style={{ gap: 10 }}>
      {MEKANLAR.map((m, i) => <Animated.View key={m.id} entering={giris(40 + i * 30)}>
        <MekanKarosu ad={ad(m.id)} ne={ne(m.id)} durum={durum(m.id)} kilit={kilit(m.id)} icon={m.icon} gorsel={m.gorsel} rtl={rtl}
          kilitEtiket={t("onl.sk.kilitli")} onPress={() => router.push(m.yol)} />
      </Animated.View>)}
    </View>
  </OnlineSayfa>;
}

export default function OnlineSokak() {
  return onlineEkranAcik() ? <OnlineKapisi><SokakEkran /></OnlineKapisi> : <OnlineYakinda />;
}
