// Tezgâh modeli Dilim 3 — "Ustalık etkileri" kartı: mesleğin ve ustaların bu işyerine ne kattığı (kanca dökümü).
// Değer, tavan ve katkı verenin adı sunucudan (`TezgahGorunumu.kanca`); istemci hesap yapmaz, yalnız sözle gösterir.
// Kalemler (hangi hüner ne kadar) yalnız sahibe ve katkı verenin kendisine gelir; düğüm adı ve seviye metni beceri
// ağacının mevcut metinleridir (kanca-aynasi.ts). Kanca yoksa yol gösteren boş durum.
import { useState } from "react";
import { View, Text } from "react-native";
import Animated from "react-native-reanimated";
import { useI18n, applyParams, yuzdeL } from "../i18n";
import { C, F } from "../theme";
import { GameIcon } from "../icons";
import { hap } from "../haptics";
import { DesignPressable as Pressable } from "../design-pressable";
import type { Lang } from "../locale-data";
import { Cerceve, Doluluk, Madalyon, belir, giris, hiza, yon } from "./ui";
import { Baslik2, BosKart } from "./yasam-ui";
import { meslekYaz } from "./metin";
import { MESLEK_IKON } from "./meslek-veri";
import { KANCA_DUGUM } from "./kanca-aynasi";
import { Not } from "./tezgah-ui";
import type { KancaDokumu, TezgahGorunumu } from "./tezgah-veri";

type Ceviri = (k: string) => string;

/** Kanalın taban adı ("dukkanH.demirci" → "dukkanH"). */
const kok = (kanal: string) => kanal.split(".")[0] ?? kanal;
const SIRA: Record<string, number> = { rafSatir: 0, rafAdet: 1, dukkanH: 2, atolyeKalite: 3, npcCeza: 4, topluIndirim: 5, depo: 6 };
const IKON: Record<string, string> = { rafSatir: "scales", rafAdet: "backpack", dukkanH: "sun", atolyeKalite: "star", npcCeza: "hood", topluIndirim: "medal", depo: "amphora" };

/** Kanal biriminde değer: "+%15", "+1 satır", "+6 adet", "+8 puan", "−10 puan", "−%10". `isaretsiz`: tavan için. */
export function kancaBirimi(t: Ceviri, kanal: string, n: number, lang: Lang, isaretsiz = false): string {
  const k = kok(kanal);
  const ic = k === "depo" || k === "dukkanH" || k === "topluIndirim" ? yuzdeL(n, lang)
    : applyParams(t(k === "rafSatir" ? "onl.k3.birim.satir" : k === "rafAdet" ? "onl.k3.birim.adet" : "onl.k3.birim.puan"), [n]);
  if (isaretsiz) return ic;
  return (k === "npcCeza" || k === "topluIndirim" ? "−" : "+") + ic;
}

/** Kanal adı (dükkânda H kanalı mesleğe göre). */
function kanalAdi(t: Ceviri, kanal: string, lang: Lang): string {
  const [k, m] = kanal.split(".");
  if (k === "dukkanH" && m) return applyParams(t("onl.k3.kanal.dukkanH"), [meslekYaz(m, lang)]);
  const a = "onl.k3.kanal." + k;
  const v = t(a);
  return v !== a ? v : t("onl.k3.kanal.diger");
}

/** Değerin bu işyerinde neye dönüştüğü (sayılar sunucunun gönderdiği kancalı sınırlar). */
function kanalBagi(t: Ceviri, kanal: string, g: TezgahGorunumu): string {
  const k = kok(kanal);
  if (k === "depo" && g.depoKapasite !== undefined) return applyParams(t("onl.k3.bag.depo"), [g.depoKapasite]);
  if (k === "rafSatir") return applyParams(t("onl.k3.bag.rafSatir"), [g.rafSiniri.satir]);
  if (k === "rafAdet") return applyParams(t("onl.k3.bag.rafAdet"), [g.rafSiniri.adet]);
  const a = "onl.k3.bag." + k;
  const v = t(a);
  return v !== a ? v : "";
}

/** Kalem (tek hüner): beceri ağacındaki düğüm adı ve seviye metni; bilinmeyen kanca sakin genel adla. */
export function kalemMetni(t: Ceviri, kanca: string): { ad: string; seviye: string | null; meslek: string | null } {
  const d = KANCA_DUGUM[kanca];
  if (!d) return { ad: t("onl.k3.kalemBilinmez"), seviye: null, meslek: null };
  const parca = d.split(".");
  const dugum = parca.slice(0, 2).join(".");
  const ad = t("onl.ba." + dugum);
  const sv = t("onl.ba." + d);
  return { ad: ad === "onl.ba." + dugum ? t("onl.k3.kalemBilinmez") : ad, seviye: sv === "onl.ba." + d ? null : sv, meslek: parca[0] ?? null };
}

function KancaSatiri({ kanal, d, g, t, rtl, lang }: { kanal: string; d: KancaDokumu; g: TezgahGorunumu; t: Ceviri; rtl: boolean; lang: Lang }) {
  const [acik, setAcik] = useState(false);
  const k = kok(kanal);
  const ad = kanalAdi(t, kanal, lang);
  const deger = kancaBirimi(t, kanal, d.deger, lang);
  const tavan = kancaBirimi(t, kanal, d.tavan, lang, true);
  const kimden = d.kisiAd ? applyParams(t("onl.k3.kimden"), [d.kisiAd]) : null;
  const bag = kanalBagi(t, kanal, g);
  const kalemler = d.kalemler ?? [];
  const tavanda = d.deger >= d.tavan;
  return <View style={{ gap: 6, paddingTop: 10, borderTopWidth: 1, borderColor: "rgba(201,162,78,0.14)" }}>
    <View accessible accessibilityLabel={[ad, deger, applyParams(t("onl.k3.tavan"), [tavan]), kimden, bag].filter(Boolean).join(". ")} style={{ gap: 6 }}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
        <Madalyon icon={IKON[k] ?? "star"} size={34} aktif />
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: 14, color: C.parchment, textAlign: hiza(rtl) }}>{ad}</Text>
          {kimden ? <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 12.5, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{kimden}</Text> : null}
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.goldBright }}>{deger}</Text>
      </View>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
        <View style={{ flex: 1 }}><Doluluk nufus={d.deger} kapasite={Math.max(1, d.tavan)} rtl={rtl} ince /></View>
        <Text style={{ fontFamily: F.display, fontSize: 11.5, color: tavanda ? C.gold : C.parchmentMuted }}>{applyParams(t(tavanda ? "onl.k3.tavanda" : "onl.k3.tavan"), [tavan])}</Text>
      </View>
      {bag ? <Text style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 17, color: C.parchmentDim, textAlign: hiza(rtl) }}>{bag}</Text> : null}
    </View>
    {kalemler.length ? <Pressable accessibilityRole="button" accessibilityState={{ expanded: acik }}
      accessibilityLabel={applyParams(t(acik ? "onl.k3.kalemGizle" : "onl.k3.kalemGoster"), [kalemler.length])}
      onPress={() => { hap("selection"); setAcik(!acik); }} style={{ minHeight: 44, flexDirection: yon(rtl), alignItems: "center", gap: 6 }}>
      <GameIcon name="scroll" size={13} color={C.gold} />
      <Text style={{ flex: 1, fontFamily: F.display, fontSize: 12, color: C.gold, textAlign: hiza(rtl) }}>{applyParams(t(acik ? "onl.k3.kalemGizle" : "onl.k3.kalemGoster"), [kalemler.length])}</Text>
    </Pressable> : d.kisiAd ? <Text style={{ fontFamily: F.serifItalic, fontSize: 12, lineHeight: 16, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.k3.kalemGizli")}</Text> : null}
    {acik ? <Animated.View entering={belir()} style={{ gap: 6 }}>
      {kalemler.map((x, i) => {
        const m = kalemMetni(t, x.kanca);
        return <View key={x.kanca + i} accessible style={{ flexDirection: yon(rtl), alignItems: "flex-start", gap: 8 }}>
          <GameIcon name={m.meslek ? (MESLEK_IKON as Record<string, string>)[m.meslek] ?? "star" : "star"} size={14} color={C.gold} />
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 12.5, color: C.parchment, textAlign: hiza(rtl) }}>{m.meslek ? `${m.ad} · ${meslekYaz(m.meslek, lang)}` : m.ad}</Text>
            {m.seviye ? <Text style={{ fontFamily: F.serif, fontSize: 12, lineHeight: 16, color: C.parchmentDim, textAlign: hiza(rtl) }}>{m.seviye}</Text> : null}
          </View>
          <Text style={{ fontFamily: F.display, fontSize: 12.5, color: C.sage }}>{kancaBirimi(t, kanal, x.d, lang)}</Text>
        </View>;
      })}
      {tavanda ?<Not metin={applyParams(t("onl.k3.tavanKirpti"), [tavan])} rtl={rtl} /> : null}
    </Animated.View> : null}
  </View>;
}

/**
 * Dükkânım/Atölyem başındaki "Ustalık etkileri" kartı (yalnız yetkiliye; eski sunucuda `kanca` yoksa hiç çizilmez).
 * Dükkânda tüccarın fiyat tablosu (bilgi kancası) da burada "açık" diye anılır; tablo raf çekmecesindedir.
 */
export function UstalikKarti({ g, t, rtl }: { g: TezgahGorunumu; t: Ceviri; rtl: boolean }) {
  const { lang } = useI18n();
  if (!g.kanca) return null;
  const atolye = g.tur === "atolye";
  const satirlar = Object.entries(g.kanca).filter(([, d]) => d && d.deger > 0)
    .sort(([a], [b]) => (SIRA[kok(a)] ?? 9) - (SIRA[kok(b)] ?? 9) || (a < b ? -1 : 1));
  const tablo = !atolye && g.fiyatTablosu !== undefined;
  const zanaatsiz = atolye && g.atolye && !g.atolye.zanaat;
  const bos = !satirlar.length && !tablo;
  return <View>
    <Baslik2 metin={t("onl.k3.baslik")} rtl={rtl} ust={10} />
    <Animated.View entering={giris(20)}>
      {bos ? <View style={{ gap: 8 }}>
        <BosKart icon="star" metin={t(zanaatsiz ? "onl.k3.bos.zanaatsiz" : atolye ? "onl.k3.bos.atolye" : "onl.k3.bos.dukkan")} rtl={rtl} />
        <Not metin={t("onl.k3.isinma")} rtl={rtl} icon="hourglass" />
      </View> : <Cerceve ic={{ padding: 12, gap: 4 }}>
        <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t(atolye ? "onl.k3.giris.atolye" : "onl.k3.giris.dukkan")}</Text>
        {satirlar.map(([kanal, d]) => <KancaSatiri key={kanal} kanal={kanal} d={d} g={g} t={t} rtl={rtl} lang={lang} />)}
        {tablo ? <View accessible style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingTop: 10, borderTopWidth: 1, borderColor: "rgba(201,162,78,0.14)" }}>
          <Madalyon icon="scroll-open" size={34} aktif />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: F.display, fontSize: 14, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.k3.tablo.ad")}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 17, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.k3.tablo.not"), [g.fiyatTablosu?.length ?? 0])}</Text>
          </View>
          <GameIcon name="medal" size={16} color={C.sage} />
        </View> : null}
        <View style={{ gap: 6, paddingTop: 10 }}>
          <Not metin={t("onl.k3.kural")} rtl={rtl} />
          <Not metin={t("onl.k3.isinma")} rtl={rtl} icon="hourglass" />
        </View>
      </Cerceve>}
    </Animated.View>
  </View>;
}

/** Toplu sipariş indiriminin kanca değeri: yalnız siparişin mesleği atölyenin zanaatıysa (sunucu `topluIndirim` filtresi). */
export function topluIndirimKancasi(g: TezgahGorunumu, meslek: string): number {
  if (g.atolye?.zanaat !== meslek) return 0;
  return g.kanca?.topluIndirim?.deger ?? 0;
}
