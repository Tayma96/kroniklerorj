// Eşya kademeleri (tezgâh Dilim 4) için tek görsel dil: yedi kademenin adı, rengi ve işareti tek tabloda (KADEME); malın
// göründüğü her yerde (ambar, depo, raf, pazar, ısmarlama, atölye sonucu, ay sonu dökümü) aynı rozet. Renk tek başına
// anlam taşımaz: ad ve işaret (nokta, yıldız, elmas, taç, mühür) hep birlikte. Nadide ve üstü dokununca eşya kartı açılır
// (hüner, usta, atölye, yadigâr geçmişi). Atölyede pirin efsanevi denemesi ve sonuç anı da burada. Sayı ve şans sunucudan;
// istemci olasılık hesaplamaz, yalnız sunucunun verdiği kaba bandı sözle söyler.
import { useState, type ReactNode } from "react";
import { View, Text } from "react-native";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../i18n";
import { C, F } from "../theme";
import { GameIcon } from "../icons";
import { hap } from "../haptics";
import { DesignPressable as Pressable } from "../design-pressable";
import { useOnline } from "./durum";
import { ayTakvimi } from "./ek-istemci";
import { BASMA_OLCEK, CizgiDugme, GLOW, Madalyon, ONL, belir, giris, hiza, yon } from "./ui";
import { AltPanel } from "./yasam-ui";
import {
  KADEME_ADLARI, KADEME_NADIDE, KADEME_TILSIMLI, kademeKirp, kartliMi, yadigarSatirlari,
  type AtolyeEfsanevi, type EfsaneviSonucu, type EsyaGorunumu, type KademeliParti, type KaliteKisiti, type OzellikEtkisi, type SansDokumu, type UstaNadide,
} from "./esya-veri";

type Ceviri = (k: string) => string;

type Isaret = { tur: "yok" } | { tur: "nokta"; n: 1 | 2 } | { tur: "ikon"; ad: string };
interface KademeStili {
  /** Kenar ve işaret rengi. */ renk: string;
  /** Rozet zemini. */ zemin: string;
  /** Rozet yazısı. */ yazi: string;
  isaret: Isaret;
  /** Efsanevi ve tılsımlı: durağan ışıltı (döngü yok). */ isik: boolean;
}
/**
 * Tek sabit tablosu (brief §1): sade gri, iyi yeşil, üstün mavi, şaheser mor, nadide amber, efsanevi altın, tılsımlı
 * koyu lacivert zemin + altın kenar. Hepsi tema jetonlarından türer; zeminler yalnız jetonun saydam tonudur.
 */
export const KADEME: readonly KademeStili[] = [
  { renk: C.parchmentMuted, zemin: "rgba(14,10,6,0.6)", yazi: C.parchmentDim, isaret: { tur: "yok" }, isik: false },
  { renk: C.sage, zemin: "rgba(74,154,90,0.14)", yazi: C.parchment, isaret: { tur: "nokta", n: 1 }, isik: false },
  { renk: C.azure, zemin: "rgba(94,134,168,0.18)", yazi: C.parchment, isaret: { tur: "nokta", n: 2 }, isik: false },
  { renk: C.ink, zemin: "rgba(123,79,175,0.22)", yazi: C.parchment, isaret: { tur: "ikon", ad: "star" }, isik: false },
  { renk: C.emberSoft, zemin: "rgba(224,146,46,0.18)", yazi: C.parchment, isaret: { tur: "ikon", ad: "gems" }, isik: false },
  { renk: C.goldBright, zemin: C.goldBright, yazi: C.inkOnGold, isaret: { tur: "ikon", ad: "crown" }, isik: true },
  { renk: C.goldBright, zemin: "rgba(94,134,168,0.32)", yazi: C.goldBright, isaret: { tur: "ikon", ad: "sun" }, isik: true },
];
/** Liste metinlerinde kademe rengi (eski KALITE_RENK yerine; 7 eleman). Efsanevide altın, sadede soluk. */
export const KADEME_RENK: readonly string[] = KADEME.map((s, i) => (i === 5 ? C.goldBright : s.renk));
export const kademeStili = (q: number) => KADEME[kademeKirp(q)]!;

/** Kademe adı: 0–3 eski çevrili anahtarlar, 4–6 yeni. */
export const kademeAdi = (t: Ceviri, q: number) => {
  const k = kademeKirp(q);
  return t(k <= 3 ? "onl.eko.q." + k : "onl.es.q." + k);
};
const malAd = (t: Ceviri, m: string) => { const k = "onl.mal." + m; const v = t(k); return v === k ? m : v; };
/** Adlı eşyanın adı: «Lakap» Mal. */
export const esyaAdi = (t: Ceviri, e: Pick<EsyaGorunumu, "lakap">, mal: string) => applyParams(t("onl.es.adli"), [lakapAdi(t, e.lakap), malAd(t, mal)]);
export const lakapAdi = (t: Ceviri, n: number) => { const k = "onl.es.lakap." + n; const v = t(k); return v === k ? t("onl.es.lakap.0") : v; };
const sozluk = (t: Ceviri, k: string, yedek: string) => { const v = t(k); return v === k ? yedek : v; };
const hunerAdi = (t: Ceviri, id: string) => sozluk(t, "onl.es.huner." + id, id);
const hunerAciklama = (t: Ceviri, id: string) => sozluk(t, "onl.es.huner." + id + ".d", t("onl.es.hunerGenel"));

/** Kademenin işareti: nokta(lar) ya da ikon; sade işaretsiz. */
export function KademeIsareti({ kademe, size = 12, renk }: { kademe: number; size?: number; renk?: string }) {
  const s = kademeStili(kademe);
  const r = renk ?? (s.zemin === s.renk ? C.inkOnGold : s.renk);
  if (s.isaret.tur === "yok") return null;
  if (s.isaret.tur === "nokta") {
    const d = Math.max(4, Math.round(size * 0.45));
    return <View style={{ flexDirection: "row", gap: 2, alignItems: "center" }}>
      {Array.from({ length: s.isaret.n }, (_, i) => <View key={i} style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: r }} />)}
    </View>;
  }
  return <GameIcon name={s.isaret.ad} size={size} color={r} />;
}

/** Ortak kademe rozeti: ad + işaret + renk. `soluk` merdivende seçili olmayan kademe. */
export function KademeRozeti({ kademe, kucuk = false, soluk = false }: { kademe: number; kucuk?: boolean; soluk?: boolean }) {
  const { t } = useI18n();
  const q = kademeKirp(kademe);
  const s = KADEME[q]!;
  const ad = kademeAdi(t, q);
  return <View accessible accessibilityLabel={applyParams(t("onl.es.rozetErisim"), [ad])}
    style={[{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: kucuk ? 7 : 9, paddingVertical: kucuk ? 2 : 4, borderRadius: 12,
      borderWidth: q === KADEME_TILSIMLI ? 1.5 : 1, borderColor: s.renk, backgroundColor: s.zemin, opacity: soluk ? 0.5 : 1 }, s.isik && !soluk ? GLOW : null]}>
    <KademeIsareti kademe={q} size={kucuk ? 10 : 12} />
    <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.display, fontSize: kucuk ? 10 : 11, letterSpacing: 0.4, color: s.yazi }}>{ad}</Text>
  </View>;
}

/**
 * Malın kademe rozeti; nadide ve üstündeyse dokunulur ve eşya kartını açar. Adlı eşyada lakap, el değiştirmişse
 * "yadigâr" etiketi de görünür. Dokunma alanı en az 44.
 */
export function KademeliRozet({ parti, kucuk = false, sahibi = true }: { parti: KademeliParti; kucuk?: boolean; sahibi?: boolean }) {
  const { t, rtl } = useI18n();
  const [acik, setAcik] = useState(false);
  const q = kademeKirp(parti.kademe);
  if (!kartliMi({ kademe: q })) return <KademeRozeti kademe={q} kucuk={kucuk} />;
  const e = parti.esya;
  const yadigar = !!e && e.gecmis.some((g) => g.tur !== "yapim");
  const ad = e ? esyaAdi(t, e, parti.mal) : malAd(t, parti.mal);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={applyParams(t("onl.es.kartAcErisim"), [ad, kademeAdi(t, q)])} accessibilityHint={t("onl.es.kartAcIpucu")}
      onPress={() => { hap("tap"); setAcik(true); }} hitSlop={4}
      style={({ pressed }) => ({ minHeight: 44, flexDirection: yon(rtl), flexWrap: "wrap", alignItems: "center", gap: 6, transform: [{ scale: pressed ? BASMA_OLCEK : 1 }] })}>
      <KademeRozeti kademe={q} kucuk={kucuk} />
      {e ? <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.serifItalic, fontSize: 13, color: C.goldBright }}>{`«${lakapAdi(t, e.lakap)}»`}</Text> : null}
      {yadigar ? <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, borderWidth: 1, borderColor: ONL.frame }}>
        <Text style={{ fontFamily: F.display, fontSize: 9.5, letterSpacing: 0.6, color: C.gold }}>{t("onl.es.yadigarEtiket")}</Text>
      </View> : null}
      <GameIcon name="scroll-open" size={12} color={C.gold} />
    </Pressable>
    <EsyaKarti parti={parti} acik={acik} onKapat={() => setAcik(false)} sahibi={sahibi} />
  </>;
}

function Kutu({ baslik, children, rtl, vurgu = false }: { baslik: string; children: ReactNode; rtl: boolean; vurgu?: boolean }) {
  return <View style={{ gap: 6, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: vurgu ? ONL.frameHi : "rgba(201,162,78,0.28)", backgroundColor: vurgu ? "rgba(201,162,78,0.08)" : "rgba(14,10,6,0.55)" }}>
    <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 1.2, color: C.goldBright, textAlign: hiza(rtl) }}>{baslik}</Text>
    {children}
  </View>;
}
function Yakinda({ t }: { t: Ceviri }) {
  return <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, borderWidth: 1, borderColor: C.parchmentMuted }}>
    <Text style={{ fontFamily: F.display, fontSize: 9.5, letterSpacing: 0.5, color: C.parchmentMuted }}>{t("onl.es.yakinda")}</Text>
  </View>;
}

/** Bağlı etkinin gerçek değeri: "+1 çıktı", "+12 kullanım", "Yıpranmaz"; bilinmeyen birimde boş. */
function etkiDegeri(t: Ceviri, x: OzellikEtkisi): string {
  if (x.yipranmaz) return t("onl.es.deger.yipranmaz");
  if (typeof x.deger !== "number") return "";
  return applyParams(t(x.birim === "kullanim" ? "onl.es.deger.kullanim" : "onl.es.deger.adet"), [x.deger]);
}

/** Yadigâr geçmişi: elden ele, en çok 8 satır; ilk satır hep yapım. Zaman çizgisi gibi. */
export function YadigarCizgisi({ e, mal, sahibi = true }: { e: EsyaGorunumu; mal: string; sahibi?: boolean }) {
  const { t, rtl } = useI18n();
  const saat = useOnline().yerlesim?.saat;
  const satirlar = yadigarSatirlari(e.gecmis.length ? e.gecmis : [{ ay: e.yapim, tur: "yapim", kim: e.usta }]);
  const tarih = (ay: number) => (saat ? applyParams(t("onl.kr.tarih"), [ayTakvimi(ay, saat).yil, ayTakvimi(ay, saat).ay]) : applyParams(t("onl.es.ayN"), [ay]));
  return <View style={{ gap: 0 }}>
    {satirlar.map((g, i) => {
      const son = i === satirlar.length - 1;
      const tur = ["yapim", "satis", "ismarlama", "miras", "devir"].includes(g.tur) ? g.tur : "el";
      const metin = applyParams(t("onl.es.gecmis." + tur), [g.kim, malAd(t, mal), e.atolye]);
      return <Animated.View key={i} entering={giris(Math.min(i, 8) * 60)} accessible accessibilityLabel={`${tarih(g.ay)}. ${metin}`}
        style={{ flexDirection: yon(rtl), gap: 10, alignItems: "stretch" }}>
        <View style={{ width: 14, alignItems: "center" }}>
          <View style={{ marginTop: 5, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: C.goldBright, backgroundColor: i === 0 ? C.goldBright : "transparent" }} />
          {!son || sahibi ? <View style={{ flex: 1, width: 1, backgroundColor: "rgba(201,162,78,0.4)", marginTop: 2 }} /> : null}
        </View>
        <View style={{ flex: 1, paddingBottom: 12, gap: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 10.5, letterSpacing: rtl ? 0 : 0.8, color: C.gold, textAlign: hiza(rtl) }}>{tarih(g.ay)}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchment, textAlign: hiza(rtl) }}>{metin}</Text>
        </View>
      </Animated.View>;
    })}
    {sahibi ? <Animated.View entering={giris(Math.min(satirlar.length, 8) * 60)} style={{ flexDirection: yon(rtl), gap: 10 }}>
      <View style={{ width: 14, alignItems: "center" }}><View style={{ marginTop: 5, width: 9, height: 9, borderRadius: 5, backgroundColor: C.parchmentMuted }} /></View>
      <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 14, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.es.gecmis.simdi")}</Text>
    </Animated.View> : null}
  </View>;
}

/** Eşya kartı (alt sayfa): başlık, kademe, usta ve atölye, etkiler, sadede kusur, hünerler, yadigâr, süzgeç notu. */
export function EsyaKarti({ parti, acik, onKapat, sahibi = true }: { parti: KademeliParti; acik: boolean; onKapat: () => void; sahibi?: boolean }) {
  const { t, rtl } = useI18n();
  const q = kademeKirp(parti.kademe);
  const e = parti.esya;
  const oz = e?.ozellik;
  const baslik = e ? esyaAdi(t, e, parti.mal) : malAd(t, parti.mal);
  const hunerler = e?.hunerler.length ? e.hunerler : oz?.hunerler.length ? oz.hunerler : parti.huner ? [parti.huner] : [];
  const usta = e?.usta ?? parti.yapan ?? null;
  return <AltPanel acik={acik} onKapat={onKapat} etiket={baslik} rtl={rtl} t={t}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 12, paddingEnd: 36 }}>
      <Madalyon icon={q >= 5 ? (q === KADEME_TILSIMLI ? "sun" : "crown") : "gems"} size={46} aktif renk={kademeStili(q).renk} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 18, lineHeight: 24, color: q >= 5 ? C.goldBright : C.parchment, textAlign: hiza(rtl) }}>{baslik}</Text>
        <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <KademeRozeti kademe={q} />
          {e ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.gold }}>{malAd(t, parti.mal)}</Text> : null}
        </View>
      </View>
    </View>
    {usta ? <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 21, color: C.parchmentDim, textAlign: hiza(rtl) }}>
      {e?.atolye ? applyParams(t("onl.es.elinden"), [usta, e.atolye]) : applyParams(t("onl.es.elindenAtolyesiz"), [usta])}
    </Text> : null}
    <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 21, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.es.kademeAnlam." + q)}</Text>

    {oz ? <Kutu baslik={applyParams(t("onl.es.etkiler"), [sozluk(t, "onl.es.aile." + oz.aile, oz.aile)])} rtl={rtl}>
      {oz.etkiler.map((x) => <View key={x.id} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, minHeight: 24 }}>
        <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, color: C.parchment, textAlign: hiza(rtl) }}>{sozluk(t, "onl.es.etki." + x.id, x.id)}</Text>
        {x.bagli ? <Text style={{ flexShrink: 1, fontFamily: F.display, fontSize: 13.5, color: C.goldBright, textAlign: rtl ? "left" : "right" }}>{etkiDegeri(t, x)}</Text> : <Yakinda t={t} />}
      </View>)}
      {oz.eksik.map((x) => <View key={x.id} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, minHeight: 24, opacity: 0.55 }}>
        <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, color: C.parchmentDim, textAlign: hiza(rtl) }}>{sozluk(t, "onl.es.etki." + x.id, x.id)}</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchmentMuted }}>{applyParams(t("onl.es.eksikAcilir"), [kademeAdi(t, x.kademe)])}</Text>
      </View>)}
      {oz.kusur ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl) }}>
        {applyParams(t("onl.es.kusur"), [sozluk(t, "onl.es.kusur." + oz.kusur, oz.kusur)])}
      </Text> : null}
      {!oz.bagli ? <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, lineHeight: 17, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.es.yakindaNot")}</Text> : null}
    </Kutu> : null}

    {hunerler.length ? <Kutu baslik={t(hunerler.length > 1 ? "onl.es.hunerler" : "onl.es.huner")} rtl={rtl} vurgu>
      {hunerler.map((h) => <View key={h} style={{ flexDirection: yon(rtl), gap: 10, alignItems: "flex-start" }}>
        <View style={{ marginTop: 2 }}><KademeIsareti kademe={Math.max(q, KADEME_NADIDE)} size={14} renk={C.goldBright} /></View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", alignItems: "center", gap: 6 }}>
            <Text style={{ flexShrink: 1, fontFamily: F.display, fontSize: 14, color: C.goldBright, textAlign: hiza(rtl) }}>{hunerAdi(t, h)}</Text>
            {oz?.hunerDokumu?.find((d) => d.id === h)?.bagli === false ? <Yakinda t={t} /> : null}
          </View>
          <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 20, color: C.parchment, textAlign: hiza(rtl) }}>{hunerAciklama(t, h)}</Text>
        </View>
      </View>)}
      <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, lineHeight: 17, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.es.hunerNot")}</Text>
    </Kutu> : null}

    {e ? <Kutu baslik={t("onl.es.elden")} rtl={rtl}>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl), marginBottom: 6 }}>{t("onl.es.eldenAlt")}</Text>
      <YadigarCizgisi e={e} mal={parti.mal} sahibi={sahibi} />
    </Kutu> : null}

    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: rtl ? 0 : 1.2, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.es.merdiven")}</Text>
      <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 5 }}>
        {KADEME_ADLARI.map((_, i) => <KademeRozeti key={i} kademe={i} kucuk soluk={i !== q} />)}
      </View>
    </View>
    <Text style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t(q >= 5 ? "onl.es.suzgecAdli" : "onl.es.suzgec")}</Text>
  </AltPanel>;
}

/** Kalite dökümünde tavan nedeni (tek satır). */
export function KaliteKisitiNotu({ kisit }: { kisit: KaliteKisiti | string | null | undefined }) {
  const { t, rtl } = useI18n();
  if (!kisit) return null;
  const ad = kisit.replace("kalite.tavan.", "");
  const v = t("onl.es.kisit." + ad);
  if (v === "onl.es.kisit." + ad) return null;
  return <View style={{ flexDirection: yon(rtl), alignItems: "flex-start", gap: 7 }}>
    <View style={{ marginTop: 2 }}><GameIcon name="hourglass" size={13} color={C.parchmentMuted} /></View>
    <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{v}</Text>
  </View>;
}

/**
 * Atölye üretiminde efsanevi denemesi: pire anahtar ("bu ay N hak"), pir olmayana ufuk gösteren kilitli satır. Kural
 * açık dille: yalnız nadide çıkan işte denenir, nadide çıkmazsa hak harcanmaz; ayda sınırlı, parayla alınmaz.
 */
export function EfsaneviDeneme({ e, secili, onDegis, kapali = false }: { e: AtolyeEfsanevi | null | undefined; secili: boolean; onDegis: (v: boolean) => void; kapali?: boolean }) {
  const { t, rtl } = useI18n();
  if (!e) return null;
  if (!e.pir) return <View accessible accessibilityLabel={`${t("onl.es.ef.kilitBaslik")}. ${t("onl.es.ef.kilitAlt")}`}
    style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, minHeight: 44, padding: 10, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(201,162,78,0.35)", opacity: 0.85 }}>
    <GameIcon name="crown" size={18} color={C.parchmentMuted} />
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.es.ef.kilitBaslik")}</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.es.ef.kilitAlt")}</Text>
    </View>
  </View>;
  const hakYok = e.hak <= 0;
  const acikMi = secili && !hakYok;
  const etiket = applyParams(t("onl.es.ef.anahtar"), [e.hak, e.ayda]);
  return <View style={{ gap: 6 }}>
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: acikMi, disabled: hakYok || kapali }} accessibilityLabel={etiket}
      accessibilityHint={hakYok ? t("onl.es.ef.hakYok") : t("onl.es.ef.kural")} disabled={hakYok || kapali}
      onPress={() => { hap("selection"); onDegis(!secili); }}
      style={({ pressed }) => ({ minHeight: 48, flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5,
        borderColor: acikMi ? C.goldBright : ONL.frame, backgroundColor: acikMi ? "rgba(243,210,122,0.14)" : "rgba(14,10,6,0.55)", opacity: hakYok ? 0.6 : 1, transform: [{ scale: pressed ? BASMA_OLCEK : 1 }] })}>
      <GameIcon name="crown" size={18} color={acikMi ? C.goldBright : C.gold} />
      <Text style={{ flex: 1, fontFamily: F.display, fontSize: 13.5, color: acikMi ? C.goldBright : C.parchment, textAlign: hiza(rtl) }}>{etiket}</Text>
      <View style={{ width: 40, height: 24, borderRadius: 12, borderWidth: 1, borderColor: acikMi ? C.goldBright : C.parchmentMuted, backgroundColor: acikMi ? "rgba(243,210,122,0.35)" : "transparent", padding: 2, alignItems: acikMi !== rtl ? "flex-end" : "flex-start" }}>
        <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: acikMi ? C.goldBright : C.parchmentMuted }} />
      </View>
    </Pressable>
    <Text style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{hakYok ? t("onl.es.ef.hakYok") : t("onl.es.ef.kural")}</Text>
  </View>;
}

/**
 * Efsanevi denemesinin sonucu. Başarı: tam ekran olmayan tören kartı (lakap, hüner, kroniğe yazıldı). Nasip olmadı:
 * teselli, ürün nadide kaldı, ceza yok. Denenmedi (nadide çıkmadı): hak duruyor. Şans yalnız bantla söylenir.
 */
export function EfsaneviSonucKarti({ s, mal, esya }: { s: EfsaneviSonucu; mal: string; esya: EsyaGorunumu | null }) {
  const { t, rtl } = useI18n();
  const [acik, setAcik] = useState(false);
  const bant = s.sansDokumu ? null : s.sans !== "yok" ? applyParams(t("onl.es.ef.bant"), [t("onl.es.ef.sans." + s.sans)]) : null;
  const dokum = s.sansDokumu && s.sansDokumu.kalemler.length ? <SansDokumuKutusu d={s.sansDokumu} /> : null;
  if (!s.denendi) return <Animated.View entering={belir()} accessibilityLiveRegion="polite" style={{ flexDirection: yon(rtl), gap: 10, alignItems: "flex-start", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,162,78,0.35)", backgroundColor: "rgba(14,10,6,0.6)" }}>
    <GameIcon name="hourglass" size={16} color={C.gold} />
    <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchment, textAlign: hiza(rtl) }}>{applyParams(t("onl.es.ef.denenmedi"), [s.kalanHak])}</Text>
  </Animated.View>;
  if (!s.kademe || !esya) return <Animated.View entering={belir()} accessibilityLiveRegion="polite" style={{ gap: 6, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(201,162,78,0.4)", backgroundColor: "rgba(14,10,6,0.65)" }}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
      <GameIcon name="flame" size={16} color={C.gold} />
      <Text style={{ flex: 1, fontFamily: F.display, fontSize: 15, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.es.ef.nasipBaslik")}</Text>
    </View>
    <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 21, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.es.ef.nasipMetin"), [malAd(t, mal)])}</Text>
    {bant ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{bant}</Text> : null}
    {dokum}
  </Animated.View>;
  const tilsim = s.kademe === KADEME_TILSIMLI;
  const ad = esyaAdi(t, esya, mal);
  return <Animated.View entering={belir()} accessibilityLiveRegion="assertive"
    style={[{ gap: 10, padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: C.goldBright, backgroundColor: tilsim ? "rgba(94,134,168,0.22)" : "rgba(243,210,122,0.1)", alignItems: "center" }, GLOW]}>
    <Madalyon icon={tilsim ? "sun" : "crown"} size={56} aktif />
    <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 2, color: C.gold, textAlign: "center" }}>{t(tilsim ? "onl.es.ef.tilsimUst" : "onl.es.ef.basariUst")}</Text>
    <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 20, lineHeight: 26, color: C.goldBright, textAlign: "center" }}>{ad}</Text>
    <KademeRozeti kademe={s.kademe} />
    <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 22, color: C.parchment, textAlign: "center" }}>{applyParams(t(tilsim ? "onl.es.ef.tilsimMetin" : "onl.es.ef.basariMetin"), [esya.usta, esya.atolye])}</Text>
    {esya.hunerler.length ? <Text style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 20, color: C.gold, textAlign: "center" }}>
      {applyParams(t("onl.es.ef.hunerSatiri"), [esya.hunerler.map((h) => hunerAdi(t, h)).join(" · ")])}
    </Text> : null}
    {dokum ? <View style={{ alignSelf: "stretch" }}>{dokum}</View> : null}
    <View style={{ alignSelf: "stretch" }}>
      <CizgiDugme etiket={t("onl.es.kartiAc")} icon="scroll-open" rtl={rtl} onPress={() => { hap("tap"); setAcik(true); }} />
    </View>
    <EsyaKarti parti={{ mal, kademe: s.kademe, esya }} acik={acik} onKapat={() => setAcik(false)} />
  </Animated.View>;
}

/**
 * Efsanevi şansının açık dökümü (gizli sayı yok): "Şans %14 · makul" ve kalemler (taban, puan fazlası, tavan kesintisi);
 * başarıda ayrıca tılsımlı olma payı (binde). Sayılar sunucudan; istemci yalnız yazar.
 */
export function SansDokumuKutusu({ d }: { d: SansDokumu }) {
  const { t, rtl } = useI18n();
  const bant = d.bant !== "yok" ? t("onl.es.ef.sans." + d.bant) : null;
  const baslik = applyParams(t("onl.es.sd.baslik"), [d.yuzde]);
  const kalem = (k: string) => { const a = "onl.es.sd." + k.replace(/^efsanevi\./, ""); const v = t(a); return v === a ? k : v; };
  return <View accessible accessibilityLabel={[baslik, bant, ...d.kalemler.map((x) => `${kalem(x.k)} ${applyParams(t("onl.es.sd.deger"), [x.d > 0 ? "+" : x.d < 0 ? "−" : "", Math.abs(x.d)])}`)].filter(Boolean).join(". ")}
    style={{ gap: 4, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,162,78,0.28)", backgroundColor: "rgba(14,10,6,0.55)" }}>
    <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", alignItems: "center", gap: 8 }}>
      <Text style={{ flexShrink: 1, fontFamily: F.display, fontSize: 13.5, color: C.goldBright, textAlign: hiza(rtl) }}>{baslik}</Text>
      {bant ? <View style={{ paddingHorizontal: 7, paddingVertical: 1, borderRadius: 8, borderWidth: 1, borderColor: ONL.frame }}>
        <Text style={{ fontFamily: F.display, fontSize: 10.5, letterSpacing: 0.5, color: C.gold }}>{bant}</Text>
      </View> : null}
    </View>
    {d.kalemler.map((x) => <View key={x.k} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
      <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>{kalem(x.k)}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 13, color: x.d < 0 ? C.ember : C.sage }}>{applyParams(t("onl.es.sd.deger"), [x.d > 0 ? "+" : x.d < 0 ? "−" : "", Math.abs(x.d)])}</Text>
    </View>)}
    <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, lineHeight: 17, color: C.parchmentMuted, textAlign: hiza(rtl) }}>
      {applyParams(t("onl.es.sd.not"), [d.puanBasina * 10, d.tavan, d.tilsimBinde])}
    </Text>
  </View>;
}

/** Ustanın nadide zarı (pir olmayan, puanı nadideye yetti): yüzde ve sonucu açıkça; tutmadıysa ceza yok. */
export function UstaNadideNotu({ u }: { u: UstaNadide | null | undefined }) {
  const { t, rtl } = useI18n();
  if (!u) return null;
  return <View style={{ flexDirection: yon(rtl), alignItems: "flex-start", gap: 7 }}>
    <View style={{ marginTop: 2 }}><GameIcon name={u.tuttu ? "gems" : "hourglass"} size={13} color={u.tuttu ? C.emberSoft : C.parchmentMuted} /></View>
    <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: u.tuttu ? C.gold : C.parchmentMuted, textAlign: hiza(rtl) }}>
      {applyParams(t(u.tuttu ? "onl.es.un.tuttu" : "onl.es.un.tutmadi"), [u.yuzde])}
    </Text>
  </View>;
}

/** Ay sonu / sonuç dökümünde kademe adetleri: "3 × [İyi] · 1 × [Üstün]" rozetle. */
export function KademeAdetleri({ adetler }: { adetler: readonly number[] }) {
  const { rtl } = useI18n();
  const l = adetler.map((n, q) => [n, q] as const).filter(([n]) => n > 0);
  if (!l.length) return null;
  return <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6, alignItems: "center" }}>
    {l.map(([n, q]) => <View key={q} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 4 }}>
      <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchment }}>{`${n} ×`}</Text>
      <KademeRozeti kademe={q} kucuk />
    </View>)}
  </View>;
}


/** Ambardaki adlı eşyalar (efsanevi/tılsımlı partiler): mal ve isteğe bağlı kademe süzgeciyle. */
export function adliEsyalar(partiler: readonly { kademe: number; esya?: EsyaGorunumu }[] | null | undefined, kademe?: number): EsyaGorunumu[] {
  return (partiler ?? []).filter((p) => !!p.esya && (kademe === undefined || p.kademe === kademe)).map((p) => p.esya!);
}

/**
 * Adlı eşya seçici: sunucu adlı eşyayı kendiliğinden hiçbir işe karıştırmaz, yalnız kimliğiyle verilir. Elde birden çok
 * adlı eşya varsa oyuncu hangisini satacağını/koyacağını burada seçer; "adsız" seçeneği eskisi gibi kimliksiz gönderir.
 * Seçilince adet 1 ve kalite eşyanınki olur (çağıran ayarlar). Liste boşsa hiçbir şey çizilmez.
 */
export function AdliEsyaSecici({ mal, esyalar, secili, onSec, adsizVar = true, sahibi = true }: {
  mal: string; esyalar: readonly EsyaGorunumu[]; secili: string | null; onSec: (e: EsyaGorunumu | null) => void; adsizVar?: boolean; sahibi?: boolean;
}) {
  const { t, rtl } = useI18n();
  const [kart, setKart] = useState<EsyaGorunumu | null>(null);
  if (!esyalar.length) return null;
  const secenek = (e: EsyaGorunumu | null) => {
    const acik = (e?.id ?? null) === secili;
    const ad = e ? esyaAdi(t, e, mal) : t("onl.es.sec.adsiz");
    return <Pressable key={e?.id ?? "adsiz"} accessibilityRole="radio" accessibilityState={{ checked: acik }} accessibilityLabel={e ? applyParams(t("onl.es.kartAcErisim"), [ad, kademeAdi(t, e.kademe)]) : ad}
      onPress={() => { hap("selection"); onSec(e); }}
      style={({ pressed }) => ({ minHeight: 44, flexDirection: yon(rtl), alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: acik ? 1.5 : 1,
        borderColor: acik ? C.goldBright : ONL.frame, backgroundColor: acik ? "rgba(243,210,122,0.12)" : "rgba(14,10,6,0.55)", transform: [{ scale: pressed ? BASMA_OLCEK : 1 }] })}>
      <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: acik ? C.goldBright : C.parchmentMuted, alignItems: "center", justifyContent: "center" }}>
        {acik ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.goldBright }} /> : null}
      </View>
      {e ? <KademeRozeti kademe={e.kademe} kucuk /> : null}
      <Text numberOfLines={2} style={{ flex: 1, fontFamily: e ? F.serifItalic : F.serif, fontSize: 14, lineHeight: 19, color: e ? C.goldBright : C.parchmentDim, textAlign: hiza(rtl) }}>{ad}</Text>
      {e ? <Pressable accessibilityRole="button" accessibilityLabel={t("onl.es.kartiAc")} hitSlop={6} onPress={() => { hap("tap"); setKart(e); }}
        style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
        <GameIcon name="scroll-open" size={15} color={C.gold} />
      </Pressable> : null}
    </Pressable>;
  };
  return <View accessibilityRole="radiogroup" accessibilityLabel={t("onl.es.sec.baslik")} style={{ gap: 6 }}>
    <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 1.1, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.es.sec.baslik")}</Text>
    {adsizVar ? secenek(null) : null}
    {esyalar.map((e) => secenek(e))}
    <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, lineHeight: 17, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t(secili ? "onl.es.sec.notSecili" : "onl.es.sec.not")}</Text>
    {kart ? <EsyaKarti parti={{ mal, kademe: kart.kademe, esya: kart }} acik onKapat={() => setKart(null)} sahibi={sahibi} /> : null}
  </View>;
}

/** İlan/raf satırındaki adlı eşyalar (herkese açık): lakap ve kademe; dokununca kart satın almadan açılır. */
export function SatirEsyalari({ mal, esyalar }: { mal: string; esyalar: readonly EsyaGorunumu[] }) {
  const { rtl } = useI18n();
  if (!esyalar.length) return null;
  return <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
    {esyalar.map((e) => <KademeliRozet key={e.id} parti={{ mal, kademe: e.kademe, esya: e }} kucuk sahibi={false} />)}
  </View>;
}
