// Künye (oyuncu sayfası, GET /v1/kunye/:numara): sunucunun döndürdüğü herkese açık alanların hepsi — ad, hanedan ve nesil,
// numara, yerleşim · beylik, meslek ve unvan, nam, teveccüh kademesi, işletmeler, kaba çevrimiçi durum; ölüyse sade yas çerçevesi.
// Aynı yerleşimdeyse sosyal eylemler mevcut oyuncu profilinde (/online/oyuncu/:id; durumları GET /v1/oyuncu/:id'den);
// başka yerleşimdeyse yalnız bilgi. Kendi künyende numaran kopyalanır ve paylaşılır. İstemci hiçbir şey hesaplamaz.
import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../../../lib/i18n";
import { C, F } from "../../../lib/theme";
import { GameIcon } from "../../../lib/icons";
import { DesignPressable as Pressable } from "../../../lib/design-pressable";
import { hap } from "../../../lib/haptics";
import { OnlineYakinda } from "../../../lib/online-yakinda";
import { OnlineKapisi } from "../../../lib/online/durum";
import { onlineEkranAcik } from "../../../lib/online/kapi";
import { AltinDugme, BASMA_OLCEK, Bant, Cerceve, CizgiDugme, GeriDugme, Madalyon, ONL, geriGit, giris, hiza, yon } from "../../../lib/online/ui";
import { Baslik2, BosKart, KisiYuzu, OnlineSayfa, Rozet, SatirOku, Yukleniyor, sahneGorseli, useYerlesimEkrani } from "../../../lib/online/yasam-ui";
import { NAMLAR } from "../../../lib/online/protokol";
import { useToplum } from "../../../lib/online/toplum-durum";
import { kisiYolu, oyuncuKimligiMi } from "../../../lib/online/toplum-veri";
import { isletmeYolu, MULK_IKON } from "../../../lib/online/mulk-veri";
import { kunyeBekletir, kunyeHataAnahtari, numaraBicim, numaraSesli, numaraTemizle, useKunyeIstemci, type Kunye, type KunyeHata } from "../../../lib/online/kunye-veri";
import { DurumNoktasi, NumaraKarti, numaraKopyala } from "../../../lib/online/kunye-ui";

type Ceviri = (k: string) => string;

function NamCubugu({ ad, deger, tavan, rtl, olu }: { ad: string; deger: number; tavan: number; rtl: boolean; olu: boolean }) {
  const oran = tavan > 0 ? Math.min(1, Math.max(0, deger) / tavan) : 0;
  return <View accessible accessibilityLabel={`${ad}: ${deger}`} style={{ gap: 5, minHeight: 44, justifyContent: "center" }}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
      <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchmentDim, textAlign: hiza(rtl) }}>{ad}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 14.5, color: deger > 0 && !olu ? C.goldBright : C.parchmentMuted }}>{deger}</Text>
    </View>
    <View style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(201,162,78,0.16)", overflow: "hidden", flexDirection: yon(rtl) }}>
      <View style={{ width: `${Math.max(oran * 100, oran > 0 ? 3 : 0)}%`, backgroundColor: olu ? C.parchmentMuted : C.goldBright, borderRadius: 3 }} />
    </View>
  </View>;
}

function MeslekSatiri({ meslek, unvan, rol, rtl, t }: { meslek: string; unvan: string | null; rol: string; rtl: boolean; t: Ceviri }) {
  const metin = unvan ? `${t("onl.mes." + meslek)} — ${t("onl.kd." + unvan)}` : t("onl.mes." + meslek);
  return <View accessible accessibilityLabel={`${rol}: ${metin}`} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, minHeight: 44 }}>
    <Madalyon icon="anvil" size={34} aktif={unvan === "usta" || unvan === "pir"} />
    <View style={{ flex: 1, gap: 1 }}>
      <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 1, color: C.gold, textAlign: hiza(rtl) }}>{rol}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 15.5, lineHeight: 20, color: C.parchment, textAlign: hiza(rtl) }}>{metin}</Text>
    </View>
  </View>;
}

/** Aynı yerleşimde başkası: ilişki durumu ve açık eylem sayısı yerel profilden; eylemlerin kendisi oyuncu sayfasında. */
function YakinEylemler({ k }: { k: Kunye }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const o = useYerlesimEkrani();
  const toplum = useToplum();
  const id = oyuncuKimligiMi(k.kisi.id) ? k.kisi.id : null;
  const p = id ? toplum.profil(id) : undefined;
  const yukHata = id ? toplum.hataOf("oyuncu:" + id) : null;
  useEffect(() => { if (id && o.yerlesim) void toplum.oyuncuYukle(id); }, [id, !!o.yerlesim]); // eslint-disable-line react-hooks/exhaustive-deps

  const rozetler: { metin: string; renk: string; icon: string }[] = [];
  if (p) {
    if (p.bag === "dost") rozetler.push({ metin: t("onl.tp.bag.dost"), renk: C.sage, icon: "family" });
    if (p.bag === "istekGeldi") rozetler.push({ metin: t("onl.tp.bag.istekGeldi"), renk: C.goldBright, icon: "family" });
    if (p.bag === "istekGonderildi") rozetler.push({ metin: t("onl.tp.bag.istekGonderildi"), renk: C.gold, icon: "hourglass" });
    if (p.husumet.oIlanEtti) rozetler.push({ metin: t("onl.tp.hu.oIlan"), renk: C.blood, icon: "crossed-swords" });
    if (p.husumet.benIlanEttim) rozetler.push({ metin: t("onl.tp.hu.benIlan"), renk: C.ember, icon: "crossed-swords" });
    if (p.engelledim) rozetler.push({ metin: t("onl.tp.engelledin"), renk: C.parchmentMuted, icon: "shield" });
  }
  const acik = p ? p.eylemler.filter((e) => !e.engel).length : null;
  const alt = !id ? t("onl.kn.ey.yok") : p ? (acik ? applyParams(t("onl.kn.ey.acik"), [acik]) : t("onl.kn.ey.kapali")) : yukHata ? t("onl.kn.ey.durumYok") : t("onl.kn.ey.yukleniyor");
  return <Cerceve ic={{ padding: 14, gap: 12 }}>
    <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.kn.ey.ayni"), [k.ad])}</Text>
    {rozetler.length ? <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>{rozetler.map((r) => <Rozet key={r.metin} icon={r.icon} metin={r.metin} renk={r.renk} />)}</View> : null}
    <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{alt}</Text>
    {id ? <AltinDugme icon="house" rtl={rtl} etiket={t("onl.kn.ey.git")} erisim={applyParams(t("onl.kn.ey.gitErisim"), [k.ad])} onPress={() => router.push(kisiYolu(id))} /> : null}
  </Cerceve>;
}

function KunyeEkran() {
  const router = useRouter();
  const { t, rtl, lang } = useI18n();
  const { no: param } = useLocalSearchParams<{ no?: string }>();
  const o = useYerlesimEkrani();
  const istemci = useKunyeIstemci();
  const numara = typeof param === "string" ? numaraTemizle(param) : null;
  const [k, setK] = useState<Kunye | null>(null);
  const [hata, setHata] = useState<KunyeHata | null>(null);
  const [kopyalandi, setKopyalandi] = useState(false);
  const yukle = async () => {
    if (!numara) { setHata("numara_gecersiz"); return; }
    setHata(null);
    const r = await istemci.sayfa(numara, lang);
    if (r.ok) setK(r.deger); else setHata(r.hata);
  };
  useEffect(() => { setK(null); setKopyalandi(false); void yukle(); }, [numara, lang, istemci]); // eslint-disable-line react-hooks/exhaustive-deps

  const geri = () => geriGit(router, "/online/cevrem");
  const gorsel = sahneGorseli(o.yerlesim?.yerlesim.tur, o.yerlesim?.saat.mevsim);
  const ust = <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
    <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={geri} />
    <Text style={{ flex: 1, fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 2, color: C.goldBright, textAlign: hiza(rtl), textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 6 }}>{t(k?.ben ? "onl.kn.ustBen" : "onl.kn.ust")}</Text>
  </View>;

  if (!k) return <OnlineSayfa gorsel={gorsel} oran={0.34} rtl={rtl} t={t}>
    {ust}
    <View style={{ minHeight: 140 }} />
    {hata ? <View style={{ gap: 10 }}>
      <Bant tur={kunyeBekletir(hata) ? "bilgi" : "hata"} metin={t(kunyeHataAnahtari(hata))} rtl={rtl}
        eylem={kunyeBekletir(hata) || hata === "kisi_yok" || hata === "numara_gecersiz" ? undefined : t("onl.yenidenDene")} onEylem={() => { void yukle(); }} />
      <CizgiDugme rtl={rtl} etiket={t("onl.kn.aramayaDon")} onPress={geri} />
    </View> : <Yukleniyor metin={t("onl.kn.yukleniyor")} />}
  </OnlineSayfa>;

  const olu = k.olu;
  const namTavan = Math.max(20, ...NAMLAR.map((n) => k.nam[n] ?? 0));
  const yer = `${k.yerlesim.ad} · ${k.beylik.ad}`;
  const isletmeAcik = k.ben || k.ayniYerlesim;

  return <OnlineSayfa gorsel={gorsel} oran={0.34} rtl={rtl} t={t}>
    {ust}

    {/* Kimlik kartı */}
    <Animated.View entering={giris(60)} style={{ marginTop: 14 }}>
      <Cerceve aktif={!olu && k.teveccuh >= 3} ic={{ padding: 14, gap: 12, ...(olu ? { backgroundColor: "rgba(20,18,16,0.82)" } : null) }}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 14 }}>
          <View style={{ opacity: olu ? 0.55 : 1 }}><KisiYuzu id={k.kisi.id} ad={k.ad} boyut={76} oyuncu ben={k.ben} /></View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 21, lineHeight: 27, color: olu ? C.parchmentDim : C.parchment, textAlign: hiza(rtl) }}>{k.ad}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: olu ? C.parchmentMuted : "#F0D490", textAlign: hiza(rtl) }}>
              {k.hanedan.soyad ? applyParams(t("onl.kn.hanedan"), [k.hanedan.soyad, k.hanedan.nesil]) : applyParams(t("onl.kn.nesil"), [k.hanedan.nesil])}
            </Text>
            {olu ? <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 7 }}>
              <GameIcon name="tombstone" size={14} color={C.parchmentMuted} />
              <Text style={{ flexShrink: 1, fontFamily: F.serifItalic, fontSize: 14, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.kn.olu")}</Text>
            </View> : <DurumNoktasi durum={k.durum} t={t} rtl={rtl} />}
          </View>
        </View>
        <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", alignItems: "center", gap: 6 }}>
          <View accessible accessibilityLabel={`${t("onl.kn.yerlesim")}: ${yer}`} style={{ minHeight: 44, justifyContent: "center", flexShrink: 1 }}><Rozet icon="castle" metin={yer} /></View>
          <Pressable accessibilityRole="button" accessibilityLabel={applyParams(t("onl.kn.numaraKopyalaErisim"), [numaraSesli(k.numara)])}
            onPress={() => { void numaraKopyala(k.numara).then((ok) => { if (ok) { hap("success"); setKopyalandi(true); } }); }}
            style={({ pressed }) => ({ minHeight: 44, justifyContent: "center", transform: [{ scale: pressed ? BASMA_OLCEK : 1 }] })}>
            <Rozet icon="scroll" metin={kopyalandi ? t("onl.kn.kopyalandi") : `№ ${numaraBicim(k.numara)}`} renk={kopyalandi ? C.sage : C.gold} />
          </Pressable>
        </View>
        {olu ? <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 20, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{applyParams(t("onl.kn.oluAlt"), [k.ad])}</Text> : null}
      </Cerceve>
    </Animated.View>

    {/* Kendi numaran ya da eylemler */}
    {k.ben ? <Animated.View entering={giris(100)} style={{ marginTop: 14, gap: 10 }}>
      <NumaraKarti />
      <Text style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl), paddingHorizontal: 4 }}>{t("onl.kn.benNot")}</Text>
    </Animated.View> : !olu ? <>
      <Baslik2 metin={t("onl.kn.ey.baslik")} rtl={rtl} />
      {k.ayniYerlesim ? <YakinEylemler k={k} /> : <BosKart icon="compass" rtl={rtl} metin={applyParams(t("onl.kn.ey.uzak"), [k.ad, k.yerlesim.ad])} />}
    </> : null}

    {/* Meslek */}
    <Baslik2 metin={t("onl.kn.meslek")} rtl={rtl} />
    {k.meslek.ana || k.meslek.yan ? <Cerceve ic={{ paddingHorizontal: 12, paddingVertical: 6, gap: 4 }}>
      {k.meslek.ana ? <MeslekSatiri meslek={k.meslek.ana} unvan={k.meslek.anaUnvan} rol={t("onl.kn.ana")} rtl={rtl} t={t} /> : null}
      {k.meslek.yan ? <MeslekSatiri meslek={k.meslek.yan} unvan={k.meslek.yanUnvan} rol={t("onl.kn.yan")} rtl={rtl} t={t} /> : null}
    </Cerceve> : <BosKart icon="anvil" rtl={rtl} metin={t(k.ben ? "onl.kn.meslekYokBen" : "onl.kn.meslekYok")} />}

    {/* Nam ve teveccüh */}
    <Baslik2 metin={t("onl.ka.nam")} rtl={rtl} />
    <Cerceve ic={{ paddingHorizontal: 12, paddingVertical: 8, gap: 2 }}>
      {NAMLAR.map((n) => <NamCubugu key={n} ad={t("onl.nam." + n)} deger={k.nam[n] ?? 0} tavan={namTavan} rtl={rtl} olu={olu} />)}
    </Cerceve>
    <Baslik2 metin={t("onl.tp.tv.baslik")} rtl={rtl} />
    <Cerceve aktif={!olu && k.teveccuh >= 3} ic={{ padding: 14, flexDirection: yon(rtl), alignItems: "center", gap: 12 }}>
      <View accessible accessibilityLabel={`${t("onl.tp.tv.baslik")}: ${t("onl.tp.tv.k" + k.teveccuh)}`} style={{ flex: 1, gap: 8 }}>
        <Text style={{ fontFamily: F.display, fontSize: 15, color: k.teveccuh ? C.parchment : C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.tp.tv.k" + k.teveccuh)}</Text>
        <View style={{ flexDirection: yon(rtl), gap: 6 }}>
          {[1, 2, 3, 4, 5].map((i) => <View key={i} style={{ width: 22, height: 6, borderRadius: 3, backgroundColor: i <= k.teveccuh ? (olu ? C.parchmentMuted : C.goldBright) : "rgba(201,162,78,0.18)" }} />)}
        </View>
      </View>
      <GameIcon name="star" size={20} color={k.teveccuh && !olu ? C.goldBright : C.parchmentMuted} />
    </Cerceve>

    {/* İşletmeler */}
    <Baslik2 metin={applyParams(t("onl.kn.isletmeler"), [k.isletmeler.length])} rtl={rtl} />
    {k.isletmeler.length ? <Cerceve ic={{ paddingVertical: 2 }}>
      {k.isletmeler.map((x, i) => {
        const turAdi = t("onl.mk.tur." + x.tur);
        const ad = x.ad.trim() || applyParams(t("onl.mk.yuvaAd"), [turAdi, x.no]);
        const icon = MULK_IKON[x.tur as keyof typeof MULK_IKON] ?? "house";
        const govde = <>
          <Madalyon icon={icon} size={36} aktif={!olu} />
          <View style={{ flex: 1, gap: 1 }}>
            <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: 14.5, lineHeight: 19, color: C.parchment, textAlign: hiza(rtl) }}>{ad}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{`${turAdi} · ${k.yerlesim.ad}`}</Text>
          </View>
        </>;
        const stil = { minHeight: 52, flexDirection: yon(rtl), alignItems: "center" as const, gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderColor: "rgba(201,162,78,0.12)" };
        if (!isletmeAcik) return <View key={x.tur + x.no} accessible accessibilityLabel={`${ad}, ${turAdi}`} style={stil}>{govde}</View>;
        return <Pressable key={x.tur + x.no} accessibilityRole="link" accessibilityLabel={`${ad}, ${turAdi}`} accessibilityHint={t("onl.kn.isletmeGit")}
          onPress={() => { hap("tap"); router.push(isletmeYolu(`${k.kisi.yerlesim}.${x.tur}.${x.no}`)); }}
          style={({ pressed }) => ({ ...stil, backgroundColor: pressed ? "rgba(201,162,78,0.08)" : "transparent" })}>
          {govde}
          <SatirOku rtl={rtl} />
        </Pressable>;
      })}
    </Cerceve> : <BosKart icon="scales" rtl={rtl} metin={t(k.ben ? "onl.kn.isletmeYokBen" : "onl.kn.isletmeYok")} />}
    {k.isletmeler.length && !isletmeAcik ? <Text style={{ marginTop: 8, fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl), paddingHorizontal: 4 }}>{applyParams(t("onl.kn.isletmeUzak"), [k.yerlesim.ad])}</Text> : null}

    <View style={{ marginTop: 16, flexDirection: yon(rtl), gap: 10, paddingHorizontal: 4 }}>
      <GameIcon name="scroll-open" size={15} color={ONL.gold} />
      <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.kn.not")}</Text>
    </View>
  </OnlineSayfa>;
}

export default function OnlineKunye() {
  return onlineEkranAcik() ? <OnlineKapisi><KunyeEkran /></OnlineKapisi> : <OnlineYakinda />;
}
