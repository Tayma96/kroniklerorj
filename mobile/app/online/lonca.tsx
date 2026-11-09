// Çevrimiçi lonca tablosu (ana tasarım §5.5, GET /v1/lonca): yerleşimde 14 mesleğin oyuncu ve yetişkin NPC sayısı,
// durum rozeti (boş, az, dolu). Boş meslek kıtlık fırsatıdır: o malı satan oyuncu prim alır.
import { View, Text, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { Bant, Cerceve, CizgiDugme, GeriDugme, geriGit, giris, hiza, yon } from "../../lib/online/ui";
import { Baslik2, OnlineSayfa, Rozet, SayfaBasi, YerlesimBekle, Yukleniyor, sahneGorseli, useBirKez, useYerlesimEkrani } from "../../lib/online/yasam-ui";
import { hataAnahtari } from "../../lib/online/hata";
import { AILE_IKON, MESLEKLER, MESLEK_IKON } from "../../lib/online/meslek-veri";
import type { LoncaDurumu } from "../../lib/online/protokol";

const DURUM_RENK: Record<LoncaDurumu, string> = { bos: C.ember, az: C.gold, dolu: C.sage };

function LoncaEkran() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const dar = useWindowDimensions().width < 360;
  const o = useYerlesimEkrani();
  const y = o.yerlesim;
  useBirKez(() => { void o.loncaYukle(); }, !!y);
  if (!y) return <YerlesimBekle rtl={rtl} t={t} onGiris={() => router.replace("/online")} />;

  const satirlar = o.lonca;
  const bos = satirlar?.filter((s) => s.durum === "bos").length ?? 0;
  const benim = o.meslekDurumu?.kayit.a || "";
  const hata = o.hataIslem === "lonca" ? o.hata : null;

  return <OnlineSayfa gorsel={sahneGorseli(y.yerlesim.tur, y.saat.mevsim)} oran={0.3} rtl={rtl} t={t}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center" }}>
      <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/yasam")} />
    </View>
    <View style={{ marginTop: 8 }}>
      <SayfaBasi ust={y.yerlesim.ad} baslik={t("onl.lo.baslik")} alt={satirlar ? applyParams(t(bos ? "onl.lo.ozet" : "onl.lo.ozetDolu"), [bos]) : undefined} rtl={rtl} />
    </View>
    <View style={{ marginTop: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,162,78,0.3)", backgroundColor: "rgba(14,10,6,0.82)" }}>
      <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.lo.not")}</Text>
    </View>

    <Baslik2 metin={t("onl.lo.tablo")} rtl={rtl} />
    {hata && !satirlar ? <Bant metin={t(hataAnahtari(hata))} rtl={rtl} eylem={t("onl.yenidenDene")} onEylem={() => { void o.loncaYukle(); }} />
      : !satirlar ? <Yukleniyor metin={t("onl.lo.yukleniyor")} />
      : <Cerceve ic={{ paddingVertical: 2 }}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderColor: "rgba(201,162,78,0.2)" }}>
          <Text style={{ flex: 1, fontFamily: F.display, fontSize: 10.5, letterSpacing: rtl ? 0 : 1, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.lo.meslek")}</Text>
          <Text style={{ width: dar ? 46 : 54, fontFamily: F.display, fontSize: 10.5, color: C.gold, textAlign: "center" }}>{t("onl.lo.oyuncu")}</Text>
          <Text style={{ width: dar ? 38 : 46, fontFamily: F.display, fontSize: 10.5, color: C.gold, textAlign: "center" }}>{t("onl.lo.npc")}</Text>
        </View>
        {satirlar.map((s, i) => {
          const m = MESLEKLER[s.meslek];
          const ben = benim === s.meslek;
          return <Animated.View key={s.meslek} entering={giris(Math.min(i, 8) * 30)}
            accessible accessibilityLabel={`${t("onl.mes." + s.meslek)}: ${applyParams(t("onl.lo.erisim"), [s.oyuncu, s.npc])}. ${t("onl.lo.durum." + s.durum)}`}
            style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, minHeight: 58, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderColor: "rgba(201,162,78,0.12)", backgroundColor: ben ? "rgba(90,64,24,0.45)" : "transparent" }}>
            <GameIcon name={MESLEK_IKON[s.meslek]} size={20} color={DURUM_RENK[s.durum]} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: 14, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.mes." + s.meslek)}</Text>
              <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 5 }}>
                <Rozet metin={t("onl.lo.durum." + s.durum)} renk={DURUM_RENK[s.durum]} dolu={s.durum === "bos"} />
                {!dar ? <Rozet icon={AILE_IKON[m.aile]} metin={t("onl.aile." + m.aile)} /> : null}
                {ben ? <Rozet icon="star" metin={t("onl.lo.sen")} renk={C.goldBright} /> : null}
              </View>
            </View>
            <Text style={{ width: dar ? 46 : 54, fontFamily: F.display, fontSize: 17, color: s.oyuncu ? C.parchment : C.ember, textAlign: "center" }}>{s.oyuncu}</Text>
            <Text style={{ width: dar ? 38 : 46, fontFamily: F.display, fontSize: 15, color: C.parchmentDim, textAlign: "center" }}>{s.npc}</Text>
          </Animated.View>;
        })}
      </Cerceve>}
    <Text style={{ marginTop: 8, fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.lo.npcNot")}</Text>
    <View style={{ marginTop: 22 }}>
      <CizgiDugme etiket={t("onl.ms.ust")} icon="anvil" rtl={rtl} kucuk onPress={() => router.push("/online/meslek")} />
    </View>
  </OnlineSayfa>;
}

export default function OnlineLonca() {
  return onlineEkranAcik() ? <OnlineKapisi><LoncaEkran /></OnlineKapisi> : <OnlineYakinda />;
}
