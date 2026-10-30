// Yerleşim seçimi: 7 beylik (açılır kartlar) → şehir/kasaba/köy, ev kapasitesine göre doluluk. Davet koduyla
// gelen için ayrı yol (davet.tsx). Seçim POST /v1/profil'e aynı istekNo ile gider; ağ kopsa da iki kez işlenmez.
import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { hap } from "../../lib/haptics";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi, useOnline } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { adDogrula } from "../../lib/online/ad";
import { adHatasiMi, hataAnahtari } from "../../lib/online/hata";
import { yerlesimBul, type BeylikOzeti, type OnlineHata, type YerlesimOzeti } from "../../lib/online/protokol";
import { AltinDugme, Bant, Baslik, Cerceve, Doluluk, giris, geriGit, Madalyon, Ok, Sahne, TUR_IKON, UstBar, hiza, yon } from "../../lib/online/ui";

const SAHNE = require("../../assets/arka/gurbet_yol.jpg");
const TURLER = ["sehir", "kasaba", "koy"] as const;
/** Lejant: tür başına ev kapasitesi (sunucu [PARAMETRE]; liste satırları gerçek değeri gösterir). */
const EV = { koy: 25, kasaba: 60, sehir: 150 } as const;

function YerlesimSatiri({ y, secili, rtl, t, onSec }: { y: YerlesimOzeti; secili: boolean; rtl: boolean; t: (k: string) => string; onSec: () => void }) {
  const dolu = y.nufus >= y.evKapasite;
  const tur = t("onl.tur." + y.tur);
  return <Pressable disabled={dolu} onPress={onSec} accessibilityRole="radio" accessibilityState={{ checked: secili, disabled: dolu }}
    accessibilityLabel={applyParams(t("onl.y.satirErisim"), [y.ad, tur, y.nufus, y.evKapasite])}
    style={({ pressed }) => ({ minHeight: 58, borderRadius: 8, borderWidth: secili ? 1.5 : 1, borderColor: secili ? C.goldBright : "rgba(201,162,78,0.22)", backgroundColor: secili ? "rgba(201,162,78,0.16)" : pressed ? "rgba(201,162,78,0.08)" : "rgba(14,10,6,0.55)", flexDirection: yon(rtl), alignItems: "center", gap: 11, paddingHorizontal: 10, paddingVertical: 8, opacity: dolu ? 0.55 : 1 })}>
    <Madalyon icon={TUR_IKON[y.tur]} size={36} aktif={secili} />
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 15, color: secili ? C.goldBright : C.parchment, textAlign: hiza(rtl) }}>{y.ad}</Text>
      <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{tur}</Text>
    </View>
    <View style={{ width: 84, gap: 5 }}>
      {dolu ? (
        <View style={{ alignSelf: rtl ? "flex-start" : "flex-end", paddingHorizontal: 7, paddingVertical: 1, borderRadius: 7, backgroundColor: "rgba(200,64,64,0.25)", borderWidth: 1, borderColor: "rgba(200,64,64,0.6)" }}>
          <Text style={{ fontFamily: F.display, fontSize: 10.5, letterSpacing: rtl ? 0 : 1, color: C.roseDim }}>{t("onl.y.dolu")}</Text>
        </View>
      ) : (
        <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchmentDim, textAlign: rtl ? "left" : "right" }}>{y.nufus}/{y.evKapasite}</Text>
      )}
      <Doluluk nufus={y.nufus} kapasite={y.evKapasite} rtl={rtl} />
    </View>
  </Pressable>;
}

function BeylikKarti({ b, acik, secili, rtl, t, onAc, onSec }: { b: BeylikOzeti; acik: boolean; secili?: string; rtl: boolean; t: (k: string) => string; onAc: () => void; onSec: (id: string) => void }) {
  const say = (tur: string) => b.yerlesimler.filter((y) => y.tur === tur).length;
  const nufus = b.yerlesimler.reduce((a, y) => a + y.nufus, 0);
  const kapasite = b.yerlesimler.reduce((a, y) => a + y.evKapasite, 0);
  const ozet = applyParams(t("onl.y.beylikOzet"), [say("sehir"), say("kasaba"), say("koy")]);
  const icinde = b.yerlesimler.some((y) => y.id === secili);
  return <Cerceve aktif={icinde && !acik} radius={10} style={{ marginBottom: 10 }}>
    <Pressable onPress={() => { hap("tap"); onAc(); }} accessibilityState={{ expanded: acik }} accessibilityLabel={`${b.ad}, ${ozet}`}
      style={{ minHeight: 64, flexDirection: yon(rtl), alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
      <Madalyon icon="banner" size={40} aktif={acik} />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 15.5, color: acik || icinde ? C.goldBright : C.parchment, textAlign: hiza(rtl) }}>{b.ad}</Text>
        <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{ozet}</Text>
        <View style={{ marginTop: 2 }}><Doluluk nufus={nufus} kapasite={kapasite} rtl={rtl} ince /></View>
      </View>
      <View style={{ transform: [{ rotate: acik ? "-90deg" : "90deg" }] }}><Ok ileri rtl={false} size={16} color={C.gold} /></View>
    </Pressable>
    {acik ? (
      <View style={{ paddingHorizontal: 10, paddingBottom: 10, gap: 7 }}>
        {TURLER.flatMap((tur) => b.yerlesimler.filter((y) => y.tur === tur)).map((y) => (
          <YerlesimSatiri key={y.id} y={y} secili={y.id === secili} rtl={rtl} t={t} onSec={() => { hap("selection"); onSec(y.id); }} />
        ))}
      </View>
    ) : null}
  </Cerceve>;
}

function YerlesimEkran() {
  const router = useRouter();
  const { t, rtl, lang } = useI18n();
  const ins = useSafeAreaInsets();
  const o = useOnline();
  const [acik, setAcik] = useState<string | null>(null);
  const [gonderHata, setGonderHata] = useState<OnlineHata | null>(null);
  useEffect(() => { if (!o.dunya && o.oturum) void o.dunyaYukle(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const secili = o.taslak.yerlesim;
  const bulunan = secili ? yerlesimBul(o.dunya, secili) : undefined;
  const acikId = acik ?? bulunan?.beylik.id ?? o.dunya?.beylikler[0]?.id ?? null;
  const taslakTamam = adDogrula(o.taslak.ad).ok && !!o.taslak.cinsiyet;
  const gonderiyor = o.islem === "profil";

  const basla = async () => {
    if (!bulunan) return;
    setGonderHata(null);
    const s = await o.profilOlustur({ yerlesim: bulunan.yerlesim.id });
    if (s.ok) { router.replace("/online/varis?ilk=1"); return; }
    setGonderHata(s.hata);
    if (s.hata === "yerlesim_dolu") void o.dunyaYukle();
  };

  if (!o.oturum || !taslakTamam) {
    return <Sahne gorsel={SAHNE} oran={0.5}>
      <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
        <Bant tur="bilgi" metin={t(o.oturum ? "onl.y.taslakGerek" : "onl.p.girisGerek")} rtl={rtl} eylem={t(o.oturum ? "onl.y.profileDon" : "onl.p.giriseDon")} onEylem={() => router.replace(o.oturum ? "/online/profil" : "/online")} />
      </View>
    </Sahne>;
  }

  const hata = gonderHata ?? (o.islem === null ? o.hata : null);
  return <Sahne gorsel={SAHNE} oran={0.4} koyu={0.3}>
    <ScrollView contentContainerStyle={{ paddingTop: ins.top + 6, paddingHorizontal: 16, paddingBottom: 24 }}>
      <UstBar adim={2} rtl={rtl} t={t} onGeri={() => geriGit(router, "/online/profil")} />
      <Animated.View entering={giris(60)} style={{ marginTop: 26 }}>
        <Baslik ust={t("onl.y.ust")} baslik={t("onl.y.baslik")} alt={t("onl.y.alt")} rtl={rtl} />
      </Animated.View>

      <Animated.View entering={giris(120)} style={{ flexDirection: yon(rtl), gap: 6, marginTop: 6, marginBottom: 14 }}>
        {(["koy", "kasaba", "sehir"] as const).map((tur) => (
          <View key={tur} accessible accessibilityLabel={`${t("onl.tur." + tur)}, ${applyParams(t("onl.y.ev"), [EV[tur]])}`} style={{ flex: 1, alignItems: "center", gap: 2, paddingVertical: 7, paddingHorizontal: 4, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,162,78,0.3)", backgroundColor: "rgba(14,10,6,0.72)" }}>
            <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 5 }}>
              <GameIcon name={TUR_IKON[tur]} size={14} color={C.gold} />
              <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 0.5, color: C.parchment }}>{t("onl.tur." + tur)}</Text>
            </View>
            <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentMuted }}>{applyParams(t("onl.y.ev"), [EV[tur]])}</Text>
          </View>
        ))}
      </Animated.View>

      <Animated.View entering={giris(160)}>
        <Pressable onPress={() => { hap("tap"); router.push("/online/davet"); }} accessibilityLabel={`${t("onl.y.davetVar")}. ${t("onl.y.davetAlt")}`}
          style={({ pressed }) => ({ minHeight: 56, marginBottom: 16, borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,162,78,0.55)", backgroundColor: pressed ? "rgba(201,162,78,0.2)" : "rgba(201,162,78,0.1)", flexDirection: yon(rtl), alignItems: "center", gap: 11, paddingHorizontal: 12, paddingVertical: 8 })}>
          <Madalyon icon="family" size={36} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 14, letterSpacing: rtl ? 0 : 0.6, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.y.davetVar")}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.y.davetAlt")}</Text>
          </View>
          <Ok ileri rtl={rtl} size={16} color={C.gold} />
        </Pressable>
      </Animated.View>

      {!o.dunya ? (
        o.islem === "dunya" || !o.hata ? (
          <Cerceve ic={{ alignItems: "center", padding: 22, gap: 10 }}>
            <ActivityIndicator color={C.goldBright} />
            <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentDim }}>{t("onl.y.yukleniyor")}</Text>
          </Cerceve>
        ) : (
          <Bant metin={t(hataAnahtari(o.hata))} rtl={rtl} eylem={t("onl.yenidenDene")} onEylem={() => { void o.dunyaYukle(); }} />
        )
      ) : (
        <Animated.View entering={giris(200)} accessibilityRole="radiogroup">
          {o.dunya.beylikler.map((b) => (
            <BeylikKarti key={b.id} b={b} acik={b.id === acikId} secili={secili} rtl={rtl} t={t}
              onAc={() => setAcik(b.id === acikId ? "" : b.id)} onSec={(id) => { setGonderHata(null); o.taslakGuncelle({ yerlesim: id }); }} />
          ))}
        </Animated.View>
      )}
    </ScrollView>

    <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: ins.bottom + 14, gap: 10, borderTopWidth: 1, borderTopColor: "rgba(201,162,78,0.25)", backgroundColor: "rgba(14,10,6,0.95)" }}>
      {hata && o.dunya ? (
        <Bant metin={t(hataAnahtari(hata))} rtl={rtl}
          eylem={adHatasiMi(hata) ? t("onl.y.adDegistir") : undefined}
          onEylem={adHatasiMi(hata) ? () => geriGit(router, "/online/profil") : undefined} />
      ) : null}
      {bulunan ? (
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
          <GameIcon name={TUR_IKON[bulunan.yerlesim.tur]} size={15} color={C.gold} />
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, color: C.parchmentDim, textAlign: hiza(rtl) }}>
            {t("onl.tur." + bulunan.yerlesim.tur)} · {bulunan.beylik.ad}
          </Text>
        </View>
      ) : null}
      <AltinDugme
        etiket={bulunan ? applyParams(t("onl.y.basla"), [bulunan.yerlesim.ad], lang) : t("onl.y.sec")}
        icon="walk" rtl={rtl} kapali={!bulunan} bekliyor={gonderiyor} onPress={() => { void basla(); }} />
    </View>
  </Sahne>;
}

export default function OnlineYerlesim() {
  return onlineEkranAcik() ? <OnlineKapisi><YerlesimEkran /></OnlineKapisi> : <OnlineYakinda />;
}
