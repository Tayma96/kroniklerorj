// Çevrimiçi mahalle (Faz 2c): tek oyunculudaki harita bileşeni (MahalleHaritasi) mevsimin kasaba resminde ortak beş
// mekânı iğneler; altıncı mekân (köyde değirmen, kasaba/şehirde mektep) aynı biçimde üstüne çizilir. Bu ay kim nerede
// (NPC'ler ve eylemle oraya gitmiş oyuncular) sunucunun haritasından gelir; oyuncular mühürle ayrılır.
import { useMemo, useState } from "react";
import { View, Text, ScrollView, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { hap } from "../../lib/haptics";
import { useSadeMod } from "../../lib/use-sade-mod";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { MahalleHaritasi, PIN_YERI, type HaritaIgnesi } from "../../lib/sayfa/mahalle/harita";
import { OnlineKapisi } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { Bant, Cerceve, CizgiDugme, GLOW, Madalyon, hiza, yon } from "../../lib/online/ui";
import { kisiYolu } from "../../lib/online/toplum-veri";
import {
  AltPanel, BosKart, KisiYuzu, Muhur, OnlineSayfa, Rozet, SayfaBasi, TakatHapi, YerlesimBekle, haritaGorseli, sahneGorseli, useYerlesimEkrani, yuzBilgisi,
} from "../../lib/online/yasam-ui";
import { EylemSonucu } from "../../lib/online/eylem-ui";
import { MEKAN_IKON } from "../../lib/online/metin";
import { hataAnahtari } from "../../lib/online/hata";
import type { EylemYaniti, HaritaKisisi, HaritaMekani } from "../../lib/online/protokol";

type Ignelik = HaritaIgnesi["m"];
/** Sunucu mekânı → harita bileşeninin iğne adı (ortak beş mekân). */
const IGNE: Record<string, Ignelik> = { carsi: "carsi", cami: "cami", kahvehane: "kahve" as Ignelik, meydan: "meydan", han: "han" };
const ILK_GOSTER = 12;
// Harita bileşeninin ölçüleri (lib/sayfa/mahalle/harita.tsx ile aynı): 3:2 resim, 5:4 kadraj, en çok 560 pt.
const ART = 1.5, FRAME = 1.25, MAX_W = 560, MED = 46, PIN_W = 84;
/** Altıncı mekânın yeri: resmin sol üstü (ortak iğnelerden en az 70 pt uzak, 320 pt'de de). */
const ALTINCI = { x: 0.1, y: 0.17 };

function haritaOlcusu(ekran: number) {
  const W = Math.min(ekran, MAX_W), H = Math.round(W / FRAME), imgW = H * ART, off = (W - imgW) / 2;
  const merkez = (x: number, y: number) => ({ x: Math.max(PIN_W / 2, Math.min(W - PIN_W / 2, off + x * imgW)), y: y * H });
  return { W, H, merkez };
}

function MahalleEkran() {
  const router = useRouter();
  const { t, rtl, lang } = useI18n();
  const { width } = useWindowDimensions();
  const reduced = useSadeMod();
  const o = useYerlesimEkrani();
  const y = o.yerlesim;
  const [secili, setSecili] = useState<string | null>(null);
  const [hepsi, setHepsi] = useState(false);
  const [sonuc, setSonuc] = useState<EylemYaniti | null>(null);
  const [eylemHata, setEylemHata] = useState<string | null>(null);

  const benId = y?.ben.id ?? "";
  const isaretler = useMemo(() => new Map((y?.ben.tanidiklar ?? []).map((k) => [k.id, k.isaret] as const)), [y]);
  const benYer = y?.harita.find((m) => m.kisiler.some((k) => k.id === benId))?.id ?? null;
  const sec = secili ?? benYer ?? y?.harita[0]?.id ?? "carsi";
  const mekan: HaritaMekani | undefined = y?.harita.find((m) => m.id === sec);
  const kisiler = useMemo(() => {
    const sira = (k: HaritaKisisi) => (k.id === benId ? 0 : k.oyuncu ? 1 : isaretler.has(k.id) ? 2 : 3);
    return [...(mekan?.kisiler ?? [])].sort((a, b) => sira(a) - sira(b));
  }, [mekan, isaretler, benId]);

  if (!y) return <YerlesimBekle sekme="mahalle" rtl={rtl} t={t} onGiris={() => router.replace("/online")} />;

  const { W, H, merkez } = haritaOlcusu(width);
  const sol = (width - W) / 2;
  const oyuncuSayisi = (m: HaritaMekani) => m.kisiler.filter((k) => k.oyuncu).length;
  const etiket = (m: HaritaMekani) => applyParams(t("onl.mh.mekanErisim"), [t("onl.mekan." + m.id), m.kisiler.length, oyuncuSayisi(m)]);
  const ortak = y.harita.filter((m) => IGNE[m.id]);
  const altinci = y.harita.find((m) => !IGNE[m.id]);
  const pins: HaritaIgnesi[] = ortak.map((m) => ({ m: IGNE[m.id], ad: t("onl.mekan." + m.id), sayi: m.kisiler.length, kilitli: false, etiket: etiket(m) }));
  const igneMerkezi = (id: string) => (IGNE[id] ? merkez(PIN_YERI[IGNE[id]].x, PIN_YERI[IGNE[id]].y) : merkez(ALTINCI.x, ALTINCI.y));
  const mektepYeri = y.yerlesim.tur === "koy" ? "cami" : "mektep";
  const sutun = width < 360 ? 3 : 4;
  const gorunen = hepsi ? kisiler : kisiler.slice(0, ILK_GOSTER);
  const ben = y.ben;

  const mekanSec = (id: string) => { hap("selection"); setSecili(id); setHepsi(false); };
  const derseOtur = async () => {
    setEylemHata(null);
    const s = await o.eylemYap({ tur: "mektep" });
    if (s.ok) { hap("success"); setSonuc(s.deger); } else { hap("error"); setEylemHata(t(hataAnahtari(s.hata))); }
  };

  return <OnlineSayfa gorsel={sahneGorseli(y.yerlesim.tur, y.saat.mevsim)} oran={0.3} sekme="mahalle" rtl={rtl} t={t} rozet={{ karakter: ben.ozellikPuani > 0 }}
    alt={<AltPanel acik={!!sonuc} onKapat={() => setSonuc(null)} etiket={t("onl.ey.sonuc")} rtl={rtl} t={t}>
      {sonuc ? <EylemSonucu y={sonuc} rtl={rtl} t={t} lang={lang} onTamam={() => setSonuc(null)} /> : null}
    </AltPanel>}>
    <SayfaBasi ust={t("onl.nav.mahalle")} baslik={y.yerlesim.ad} alt={applyParams(t("onl.mh.alt"), [t("onl.mevsim." + y.saat.mevsim), y.saat.yil])} rtl={rtl}
      sag={<TakatHapi kalan={ben.takat.kalan} tavan={ben.takat.tavan} t={t} />} />

    {/* Harita: ortak beş mekân bileşenden, altıncı mekân, oyuncu mühürleri ve "sen buradasın" üst katmanda */}
    <View style={{ marginHorizontal: -16, marginTop: 14 }}>
      <MahalleHaritasi source={haritaGorseli(y.saat.mevsim)} pins={pins} secili={(IGNE[sec] ?? ("" as Ignelik))} onSec={(m) => mekanSec(ortak.find((x) => IGNE[x.id] === m)?.id ?? "carsi")}
        label={t("onl.mh.harita")} hint={t("onl.mh.ipucu")} reduced={reduced} />
      <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: sol, width: W, height: H }}>
        {altinci ? (() => {
          const c = igneMerkezi(altinci.id), aktif = sec === altinci.id;
          return <Pressable accessibilityLabel={etiket(altinci)} accessibilityHint={t("onl.mh.ipucu")} accessibilityState={{ selected: aktif }} onPress={() => mekanSec(altinci.id)}
            style={({ pressed }) => ({ position: "absolute", left: c.x - PIN_W / 2, top: c.y - MED / 2, width: PIN_W, alignItems: "center", transform: [{ scale: pressed ? 0.93 : aktif ? 1.04 : 1 }] })}>
            <View style={[{ width: MED, height: MED, borderRadius: MED / 2, alignItems: "center", justifyContent: "center", backgroundColor: aktif ? "#2C1F0F" : "rgba(18,12,6,0.92)", borderWidth: 2, borderColor: aktif ? C.goldBright : C.gold }, aktif ? GLOW : null]}>
              <GameIcon name={MEKAN_IKON[altinci.id] ?? "house"} size={22} color={aktif ? C.goldBright : C.gold} />
              <View pointerEvents="none" style={{ position: "absolute", top: -5, right: -9, minWidth: 21, height: 19, paddingHorizontal: 5, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: altinci.kisiler.length ? C.gold : "#2A1F13", borderWidth: 1, borderColor: altinci.kisiler.length ? C.goldBright : C.borderHi }}>
                <Text style={{ fontFamily: F.display, fontSize: 11, lineHeight: 14, color: altinci.kisiler.length ? C.inkOnGold : C.parchmentMuted }}>{altinci.kisiler.length}</Text>
              </View>
            </View>
            <View pointerEvents="none" style={{ marginTop: 4, maxWidth: PIN_W, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: aktif ? C.gold : "rgba(16,11,6,0.88)", borderWidth: 1, borderColor: aktif ? C.goldBright : "rgba(221,180,90,0.5)" }}>
              <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: 10.5, lineHeight: 13, textAlign: "center", color: aktif ? C.inkOnGold : C.parchment }}>{t("onl.mekan." + altinci.id)}</Text>
            </View>
          </Pressable>;
        })() : null}
        {y.harita.map((m) => {
          const c = igneMerkezi(m.id);
          const oyuncu = oyuncuSayisi(m) - (m.id === benYer ? 1 : 0);
          return <View key={m.id} pointerEvents="none">
            {oyuncu > 0 ? <View style={{ position: "absolute", left: c.x - MED / 2 - 9, top: c.y + MED / 2 - 15 }}><Muhur boyut={19} /></View> : null}
            {m.id === benYer ? <View style={{ position: "absolute", left: c.x - MED / 2 - 10, top: c.y - MED / 2 - 8 }}>
              <KisiYuzu id={ben.id} ad={ben.ad} boyut={24} yas={ben.yas} cinsiyet={ben.cinsiyet} ben />
            </View> : null}
          </View>;
        })}
      </View>
    </View>

    {/* Mekân seçici: altı mekân, sayılarıyla (harita okunmadan da gezilebilir) */}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, flexDirection: yon(rtl) }}>
      {y.harita.map((m) => {
        const aktif = m.id === sec;
        return <Pressable key={m.id} accessibilityRole="tab" accessibilityLabel={etiket(m)} accessibilityState={{ selected: aktif }} onPress={() => mekanSec(m.id)}
          style={{ flexDirection: yon(rtl), alignItems: "center", gap: 7, paddingHorizontal: 12, borderRadius: 22, borderWidth: 1, borderColor: aktif ? C.goldBright : "rgba(201,162,78,0.45)", backgroundColor: aktif ? "rgba(201,162,78,0.22)" : "rgba(14,10,6,0.78)" }}>
          <GameIcon name={MEKAN_IKON[m.id] ?? "house"} size={15} color={aktif ? C.goldBright : C.gold} />
          <Text style={{ fontFamily: F.display, fontSize: 12.5, color: aktif ? C.goldBright : C.parchment }}>{t("onl.mekan." + m.id)}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 11.5, color: C.parchmentMuted }}>{m.kisiler.length}</Text>
          {oyuncuSayisi(m) ? <Muhur boyut={14} /> : null}
        </Pressable>;
      })}
    </ScrollView>

    {/* Mekân kartı */}
    {mekan ? <Cerceve ic={{ padding: 14, gap: 12 }} style={{ marginTop: 12 }}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 12 }}>
        <Madalyon icon={MEKAN_IKON[mekan.id] ?? "house"} size={50} aktif />
        <View style={{ flex: 1, gap: 2 }}>
          <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 20, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.mekan." + mekan.id)}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.mh.sayim"), [mekan.kisiler.length, oyuncuSayisi(mekan)])}</Text>
        </View>
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 21, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.mh.d." + mekan.id)}</Text>
      {mekan.id === benYer ? <View style={{ flexDirection: yon(rtl) }}><Rozet icon="walk" metin={t("onl.mh.buradasin")} renk={C.goldBright} /></View> : null}
      {mekan.id === mektepYeri ? <CizgiDugme etiket={applyParams(t("onl.mh.derseOtur"), [1])} icon="graduate-cap" rtl={rtl} kucuk kapali={o.islem === "eylem" || ben.takat.kalan < 1} onPress={() => { void derseOtur(); }} /> : null}
      {eylemHata ? <Bant metin={eylemHata} rtl={rtl} /> : null}

      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 14, paddingTop: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: C.gold, backgroundColor: "#3A2716" }} />
          <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchmentMuted }}>{t("onl.mh.npc")}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Muhur boyut={14} />
          <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchmentMuted }}>{t("onl.mh.oyuncu")}</Text>
        </View>
      </View>

      {kisiler.length ? <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", rowGap: 12 }}>
        {gorunen.map((k) => {
          const isaret = isaretler.get(k.id) ?? null;
          const benMi = k.id === ben.id;
          const bilgi = benMi ? { yas: ben.yas, cinsiyet: ben.cinsiyet } : yuzBilgisi(o.kisiler, k.id);
          return <Pressable key={k.id} accessibilityLabel={`${benMi ? t("onl.mh.sen") : k.ad}${k.oyuncu && !benMi ? " · " + t("onl.mh.oyuncu") : ""}${isaret ? " · " + t("onl.isaret." + isaret) : ""}`}
            onPress={() => { hap("tap"); router.push(benMi ? "/online/karakter" : kisiYolu(k.id)); }}
            style={({ pressed }) => ({ width: `${100 / sutun}%`, alignItems: "center", gap: 5, paddingHorizontal: 3, opacity: pressed ? 0.75 : 1 })}>
            <KisiYuzu id={k.id} ad={k.ad} boyut={52} oyuncu={!!k.oyuncu && !benMi} ben={benMi} isaret={isaret} {...bilgi} />
            <Text numberOfLines={2} style={{ fontFamily: benMi ? F.display : F.serif, fontSize: benMi ? 12 : 13.5, lineHeight: 16, color: benMi ? C.goldBright : k.oyuncu ? "#F0D490" : C.parchment, textAlign: "center" }}>{benMi ? t("onl.mh.sen") : k.ad}</Text>
          </Pressable>;
        })}
      </View> : <BosKart icon="hourglass" metin={t("onl.mh.bos")} rtl={rtl} />}
      {kisiler.length > ILK_GOSTER ? <CizgiDugme etiket={hepsi ? t("onl.ya.daha.az") : applyParams(t("onl.mh.hepsi"), [kisiler.length])} rtl={rtl} kucuk onPress={() => setHepsi((v) => !v)} /> : null}
    </Cerceve> : null}
    <Text style={{ marginTop: 12, fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: "center" }}>{t("onl.mh.not")}</Text>
  </OnlineSayfa>;
}

export default function OnlineMahalle() {
  return onlineEkranAcik() ? <OnlineKapisi><MahalleEkran /></OnlineKapisi> : <OnlineYakinda />;
}
