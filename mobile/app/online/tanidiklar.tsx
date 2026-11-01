// Çevrimiçi tanıdıklar (Faz 2c, §6.0): oyuncunun seçtiği kişiler ve işaretleri (tanıdık · dost · düşman), süzgeçler,
// NPC'nin sana bakışı (işaretten ayrı) ve "listene ekle?" önerileri. Sıra sunucudan: bakışın büyüklüğüne göre.
import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
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
import { Cerceve, ONL, giris, hiza, yon } from "../../lib/online/ui";
import {
  Baslik2, BosKart, GorusOlcegi, IsaretRozeti, KisiYuzu, Muhur, OnlineSayfa, SatirOku, SayfaBasi, TakatHapi, YerlesimBekle, gorusRengi, sahneGorseli,
  useYerlesimEkrani, yuzBilgisi,
} from "../../lib/online/yasam-ui";
import { ISARET_IKON, isaretli, ruhAnahtari } from "../../lib/online/metin";
import type { Tanidik } from "../../lib/online/protokol";

type Suzgec = "hepsi" | "dost" | "dusman" | "tanidik" | "oyuncu";
const SUZGECLER: readonly Suzgec[] = ["hepsi", "dost", "dusman", "tanidik", "oyuncu"];
const uyar = (k: Tanidik, s: Suzgec) => (s === "hepsi" ? true : s === "oyuncu" ? !!k.oyuncu : k.isaret === s);
/** Ekranda öne çıkan en yakın kişi sayısı (§6.0); kalanlar "hepsini göster" ile açılır. */
const ONE_CIKAN = 15;

function TanidiklarEkran() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const o = useYerlesimEkrani();
  const y = o.yerlesim;
  const [suzgec, setSuzgec] = useState<Suzgec>("hepsi");
  const [hepsi, setHepsi] = useState(false);
  if (!y) return <YerlesimBekle sekme="tanidiklar" rtl={rtl} t={t} onGiris={() => router.replace("/online")} />;

  const ben = y.ben;
  const liste = ben.tanidiklar.filter((k) => uyar(k, suzgec));
  const gorunen = hepsi ? liste : liste.slice(0, ONE_CIKAN);
  const git = (id: string) => { hap("tap"); router.push(`/online/kisi/${id}`); };

  return <OnlineSayfa gorsel={sahneGorseli(y.yerlesim.tur, y.saat.mevsim)} oran={0.3} sekme="tanidiklar" rtl={rtl} t={t} rozet={{ karakter: ben.ozellikPuani > 0 }}>
    <SayfaBasi ust={y.yerlesim.ad} baslik={t("onl.ta.baslik")} alt={applyParams(t("onl.ta.alt"), [ben.tanidiklar.length])} rtl={rtl}
      sag={<TakatHapi kalan={ben.takat.kalan} tavan={ben.takat.tavan} t={t} />} />

    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginTop: 16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, flexDirection: yon(rtl) }}>
      {SUZGECLER.map((s) => {
        const aktif = s === suzgec;
        const sayi = ben.tanidiklar.filter((k) => uyar(k, s)).length;
        return <Pressable key={s} accessibilityRole="tab" accessibilityLabel={`${t("onl.ta.s." + s)}: ${sayi}`} accessibilityState={{ selected: aktif }} onPress={() => { hap("selection"); setSuzgec(s); setHepsi(false); }}
          style={{ flexDirection: yon(rtl), alignItems: "center", gap: 7, paddingHorizontal: 13, borderRadius: 22, borderWidth: 1, borderColor: aktif ? C.goldBright : "rgba(201,162,78,0.45)", backgroundColor: aktif ? "rgba(201,162,78,0.22)" : "rgba(14,10,6,0.78)" }}>
          {s === "oyuncu" ? <Muhur boyut={14} /> : s !== "hepsi" ? <GameIcon name={ISARET_IKON[s]} size={14} color={aktif ? C.goldBright : C.gold} /> : null}
          <Text style={{ fontFamily: F.display, fontSize: 12.5, color: aktif ? C.goldBright : C.parchment }}>{t("onl.ta.s." + s)}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 11.5, color: C.parchmentMuted }}>{sayi}</Text>
        </Pressable>;
      })}
    </ScrollView>

    <Animated.View entering={giris(80)} style={{ marginTop: 14 }}>
      {gorunen.length ? <Cerceve ic={{ paddingVertical: 4 }}>
        {gorunen.map((k, i) => <Pressable key={k.id} accessibilityLabel={`${k.ad} · ${t("onl.isaret." + k.isaret)}${k.oyuncu ? " · " + t("onl.mh.oyuncu") : ""}${k.gorus !== undefined ? ` · ${t(ruhAnahtari(k.gorus))} ${isaretli(k.gorus)}` : ""}`}
          onPress={() => git(k.id)} style={({ pressed }) => ({ flexDirection: yon(rtl), alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: "rgba(201,162,78,0.14)", backgroundColor: pressed ? "rgba(201,162,78,0.08)" : "transparent" })}>
          <KisiYuzu id={k.id} ad={k.ad} boyut={48} oyuncu={!!k.oyuncu} isaret={k.isaret} {...yuzBilgisi(o.kisiler, k.id)} />
          <View style={{ flex: 1, gap: 5 }}>
            <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
              <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 15, color: C.parchment }}>{k.ad}</Text>
              <IsaretRozeti isaret={k.isaret} t={t} />
            </View>
            {k.gorus !== undefined ? <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
              <View style={{ flex: 1 }}><GorusOlcegi deger={k.gorus} rtl={rtl} /></View>
              <Text style={{ minWidth: 34, fontFamily: F.display, fontSize: 12.5, color: gorusRengi(k.gorus), textAlign: rtl ? "left" : "right" }}>{isaretli(k.gorus)}</Text>
            </View> : <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, color: "#F0D490", textAlign: hiza(rtl) }}>{t("onl.ta.oyuncu")}</Text>}
          </View>
          <SatirOku rtl={rtl} />
        </Pressable>)}
      </Cerceve> : <BosKart icon="family" metin={t(suzgec === "hepsi" ? "onl.ta.bos" : "onl.ta.bosSuzgec")} rtl={rtl} />}
      {liste.length > ONE_CIKAN ? <Pressable accessibilityLabel={hepsi ? t("onl.ya.daha.az") : applyParams(t("onl.mh.hepsi"), [liste.length])} onPress={() => setHepsi((v) => !v)} style={{ marginTop: 8, alignItems: "center" }}>
        <Text style={{ fontFamily: F.display, fontSize: 12.5, color: C.goldBright }}>{hepsi ? t("onl.ya.daha.az") : applyParams(t("onl.mh.hepsi"), [liste.length])}</Text>
      </Pressable> : null}
    </Animated.View>

    {y.oneriler.length ? <>
      <Baslik2 metin={t("onl.ta.oneri")} rtl={rtl} />
      <View style={{ gap: 8 }}>
        {y.oneriler.map((k) => <Cerceve key={k.id} ic={{ flexDirection: yon(rtl), alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Pressable accessibilityLabel={k.ad} onPress={() => git(k.id)} style={{ flex: 1, flexDirection: yon(rtl), alignItems: "center", gap: 12 }}>
            <KisiYuzu id={k.id} ad={k.ad} boyut={42} {...yuzBilgisi(o.kisiler, k.id)} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 14.5, color: C.parchment, textAlign: hiza(rtl) }}>{k.ad}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: 14, color: gorusRengi(k.gorus), textAlign: hiza(rtl) }}>{`${t(ruhAnahtari(k.gorus))} · ${isaretli(k.gorus)}`}</Text>
            </View>
          </Pressable>
          <Pressable accessibilityLabel={applyParams(t("onl.ki.ekleErisim"), [k.ad])} disabled={o.islem === "tanidik"} onPress={() => { hap("tap"); void o.tanidikIsaretle(k.id, "tanidik"); }}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: ONL.frameHi, backgroundColor: pressed ? "rgba(201,162,78,0.24)" : "rgba(201,162,78,0.12)" })}>
            <Text style={{ fontFamily: F.display, fontSize: 18, lineHeight: 20, color: C.goldBright }}>+</Text>
            <Text style={{ fontFamily: F.display, fontSize: 12, color: C.goldBright }}>{t("onl.ya.ekle")}</Text>
          </Pressable>
        </Cerceve>)}
      </View>
    </> : null}

    <View style={{ marginTop: 16, flexDirection: yon(rtl), gap: 10, paddingHorizontal: 4 }}>
      <GameIcon name="scroll-open" size={15} color={C.goldDim} />
      <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.ta.not")}</Text>
    </View>
  </OnlineSayfa>;
}

export default function OnlineTanidiklar() {
  return onlineEkranAcik() ? <OnlineKapisi><TanidiklarEkran /></OnlineKapisi> : <OnlineYakinda />;
}
