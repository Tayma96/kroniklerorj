// Tezgâh modeli Dilim 1 ekran parçaları: dükkân sahnesi, kepenk satırı, raf ızgarası, fiyat adımlayıcı ve sunucu
// önizlemesi, depo çekmecesi, gün sonu dökümü, raf çekmecesi (sahip/çalışan), satın alma çekmecesi (müşteri), devralma
// çekmecesi, han yolcu payı dökümü. Bütün sayılar sunucudan; istemci niyet gönderir (istekNo ile, çift dokunuş tek istek).
// Çekmece açıkken satır değişirse (satıldı, kaldırıldı, fiyat değişti) düğme kilitlenir ve nedeni yazılır; istek
// sürerken çekmece kapanıp başka satır açılırsa eski sonuç yeni çekmeceye yazılmaz (`oturum`).
import { useEffect, useRef, useState } from "react";
import { View, Text, Image, StyleSheet, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated from "react-native-reanimated";
import { useI18n, applyParams, yuzdeL } from "../i18n";
import { C, F } from "../theme";
import { GameIcon } from "../icons";
import { hap } from "../haptics";
import { DesignPressable as Pressable } from "../design-pressable";
import { useOnline } from "./durum";
import { AltinDugme, BASMA_OLCEK, Cerceve, CizgiDugme, Doluluk, Madalyon, ONL, belir, hiza, yon } from "./ui";
import { AltPanel, BosKart, Hap, Rozet } from "./yasam-ui";
import { Sayac, Secenekler } from "./toplum-ui";
import { SecimOgesi } from "./han-ui";
import { KALITE_RENK, KaliteRozeti, kaliteAdi, malAdi, malIkonu } from "./ekonomi-ui";
import { benKalite } from "./ekonomi-veri";
import { istekNoUret } from "./depo";
import { istekTekrarMi } from "./hata";
import { meslekYaz } from "./metin";
import type { EkSonuc } from "./ek-istemci";
import {
  bantHesapla, bantIci, geciciHataMi, rafMali, seviyeAnahtari, tezgahHataMetni,
  type Carpanlar, type DepoSatiri, type FiyatBandi, type GunSonu, type Kademe, type Onizleme, type RafKomutu, type RafSatiri, type TezgahGorunumu, type TezgahIstemci, type YolcuKarti,
} from "./tezgah-veri";

type Ceviri = (k: string) => string;
export const DUKKAN_GORSEL = require("../../assets/mulk/dukkan.jpg");
const GOLGE = { textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } };

/** Ondalık: Türkçe ve çoğu dilde virgül, İngilizce ve Arapçada nokta; en çok iki hane. */
export function ondalik(n: number, lang: string): string {
  const s = String(Math.round(n * 100) / 100);
  return lang === "en" || lang === "ar" ? s : s.replace(".", ",");
}
const ak = (t: Ceviri, n: number) => applyParams(t("onl.is.akce"), [n]);
/** Satır / önizleme neden kodu → oyuncu cümlesi. */
export const nedenMetni = (t: Ceviri, n: string | null | undefined) => (n ? (() => { const k = "onl.tz.neden." + n; const v = t(k); return v === k ? "" : v; })() : "");
/** Çarpan dökümü: "Fiyat ×1,2 · Kalite ×1 · İtibar ×0,7 · Beceri ×1". */
export const carpanMetni = (t: Ceviri, c: Carpanlar, lang: string) => applyParams(t("onl.tz.carpanlar"), [ondalik(c.F, lang), ondalik(c.Q, lang), ondalik(c.R, lang), ondalik(c.H, lang)]);

// ---------------------------------------------------------------- yazma kilidi

/**
 * Tek istek: senkron kilit (çift dokunuş tek istek), aynı gövde ağ hatasından sonra yeniden denenirse aynı istekNo
 * (sunucu iki kez işlemez); başarı ya da kesin hatadan sonra yeni istekNo.
 */
export function useTekIstek() {
  const kilit = useRef(false);
  const iz = useRef<{ imza: string; no: string } | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const calistir = async <T,>(imza: string, f: (istekNo: string) => Promise<EkSonuc<T>>): Promise<EkSonuc<T> | null> => {
    if (kilit.current) return null;
    kilit.current = true; setBekliyor(true);
    const no = iz.current?.imza === imza ? iz.current.no : istekNoUret();
    iz.current = { imza, no };
    try {
      const r = await f(no);
      if (r.ok || !geciciHataMi(r.hata)) iz.current = null;
      return r;
    } finally { kilit.current = false; setBekliyor(false); }
  };
  return { bekliyor, calistir };
}

/** Fiyat önizlemesi: değişiklik 300 ms durunca istenir; eski yanıt yenisinin üstüne yazılmaz. */
export function useOnizleme(ist: TezgahIstemci, isletme: string, girdi: { mal: string; kalite: Kademe; fiyat: number; adet?: number } | null) {
  const [veri, setVeri] = useState<Onizleme | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const sira = useRef(0);
  const { t } = useI18n();
  const anahtar = girdi ? `${girdi.mal}|${girdi.kalite}|${girdi.fiyat}|${girdi.adet ?? ""}` : "";
  useEffect(() => () => { sira.current++; }, []);
  useEffect(() => {
    const n = ++sira.current;
    if (!girdi) { setVeri(null); setYukleniyor(false); setHata(null); return; }
    setYukleniyor(true);
    const z = setTimeout(() => {
      void ist.onizle(isletme, girdi).then((r) => {
        if (n !== sira.current) return;
        setYukleniyor(false);
        if (r.ok) { setVeri(r.deger); setHata(null); } else { setVeri(null); setHata(tezgahHataMetni(t, r)); }
      });
    }, 300);
    return () => clearTimeout(z);
  }, [anahtar, isletme, ist]); // eslint-disable-line react-hooks/exhaustive-deps
  return { veri, yukleniyor, hata };
}

// ---------------------------------------------------------------- küçük parçalar

export function Not({ metin, rtl, renk = C.parchmentMuted, icon }: { metin: string; rtl: boolean; renk?: string; icon?: string }) {
  return <View style={{ flexDirection: yon(rtl), alignItems: "flex-start", gap: 8 }}>
    {icon ? <View style={{ marginTop: 2 }}><GameIcon name={icon} size={14} color={renk} /></View> : null}
    <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 19, color: renk, textAlign: hiza(rtl) }}>{metin}</Text>
  </View>;
}
export function Satir({ etiket, deger, renk = C.parchment, rtl }: { etiket: string; deger: string; renk?: string; rtl: boolean }) {
  return <View style={{ flexDirection: yon(rtl), justifyContent: "space-between", alignItems: "center", gap: 8, minHeight: 26 }}>
    <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{etiket}</Text>
    <Text style={{ fontFamily: F.display, fontSize: 14, color: renk }}>{deger}</Text>
  </View>;
}
export function AltBaslik({ metin, rtl }: { metin: string; rtl: boolean }) {
  return <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 1.2, color: C.goldBright, textAlign: hiza(rtl) }}>{metin}</Text>;
}
function Sekme({ etiket, icon, secili, rtl, onPress }: { etiket: string; icon: string; secili: boolean; rtl: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: secili }} accessibilityLabel={etiket} onPress={() => { if (!secili) { hap("selection"); onPress(); } }}
    style={{ flex: 1, flexDirection: yon(rtl), alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44, paddingHorizontal: 6, borderRadius: 10, borderWidth: 1.5,
      borderColor: secili ? C.goldBright : ONL.frame, backgroundColor: secili ? "rgba(201,162,78,0.22)" : "rgba(14,10,6,0.6)" }}>
    <GameIcon name={icon} size={15} color={secili ? C.goldBright : C.gold} />
    <Text numberOfLines={2} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 12.5, textAlign: "center", color: secili ? C.parchment : C.parchmentDim }}>{etiket}</Text>
  </Pressable>;
}
export function Sonuc({ hata, bilgi, rtl }: { hata: string | null; bilgi: string | null; rtl: boolean }) {
  if (!hata && !bilgi) return null;
  return <Animated.View entering={belir()} accessibilityRole="alert" accessibilityLiveRegion="polite"
    style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: hata ? "rgba(200,64,64,0.6)" : "rgba(122,154,92,0.6)", backgroundColor: hata ? "rgba(60,16,12,0.7)" : "rgba(30,44,22,0.7)" }}>
    <GameIcon name={hata ? "shield" : "medal"} size={16} color={hata ? C.roseDim : C.sage} />
    <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchment, textAlign: hiza(rtl) }}>{hata ?? bilgi}</Text>
  </Animated.View>;
}

/** Kepenk durumu sözle: neden kapalı, ne yazılmadı, ne yapılırsa açılır (baskısız). */
export function KepenkSatiri({ g, rtl, t, musteri = false, devralmaAy }: { g: TezgahGorunumu; rtl: boolean; t: Ceviri; musteri?: boolean; devralmaAy?: number | null }) {
  const atolye = g.tur === "atolye";
  const metin = atolye ? t(g.kepenk ? (musteri ? "onl.atl.kepenk.kapaliZiyaretci" : "onl.atl.kepenk.kapali") : "onl.atl.kepenk.acik") : musteri ? (g.raf.some((x) => x.adet > 0) ? t("onl.tz.kepenk.musteriAcik") : t("onl.tz.kepenk.musteriBos"))
    : g.kepenk ? t("onl.tz.kepenk.kapaliNot") : t("onl.tz.kepenk.acikNot");
  // Sahibin kendi dükkânında devralma sayacı yarıyı geçtiyse sakin bilgi (korkutmadan).
  const uzun = !musteri && !atolye && !!devralmaAy && g.kepenkAy >= Math.ceil(devralmaAy / 2);
  return <View style={{ gap: 6 }}>
    <Not metin={metin} rtl={rtl} icon={g.kepenk ? "hourglass" : "sun"} renk={g.kepenk ? C.parchmentDim : C.sage} />
    {!musteri && g.kepenk && g.kepenkAy > 1 && !uzun ? <Not metin={applyParams(t("onl.tz.kepenk.ay"), [g.kepenkAy])} rtl={rtl} /> : null}
    {uzun ? <Not metin={applyParams(t("onl.tz.kepenk.uzun"), [g.kepenkAy, devralmaAy ?? 0])} rtl={rtl} icon="leaf" renk={C.gold} /> : null}
    {!musteri && !atolye && g.gecenAyKepenk && g.gunSonu === undefined ? <Not metin={t("onl.tz.kepenk.gecenAy")} rtl={rtl} /> : null}
  </View>;
}

/** Dükkân sahnesi: görsel, ad, sahibi, seviye, itibar, kepenk. */
export function DukkanBasligi({ g, rtl, t, konum }: { g: TezgahGorunumu; rtl: boolean; t: Ceviri; konum?: string | null }) {
  const ad = g.ad || t(g.tur === "atolye" ? "onl.mk.tur.atolye" : "onl.mk.tur.dukkan");
  return <View style={{ borderRadius: 12, overflow: "hidden", borderWidth: 1.5, borderColor: g.kepenk ? ONL.frame : ONL.frameHi, backgroundColor: "#140E08" }}>
    <Image source={DUKKAN_GORSEL} accessible={false} resizeMode="cover" style={[StyleSheet.absoluteFill, { opacity: g.kepenk ? 0.45 : 0.85 }]} />
    <LinearGradient pointerEvents="none" colors={["rgba(10,7,4,0.15)", "rgba(10,7,4,0.7)", "rgba(10,7,4,0.95)"]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
    <View style={{ minHeight: 150, justifyContent: "flex-end", padding: 14, gap: 8 }}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
        <Madalyon icon={g.tur === "atolye" ? "anvil" : "scales"} size={46} aktif={!g.kepenk} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text accessibilityRole="header" numberOfLines={2} style={[{ fontFamily: F.display, fontSize: 19, lineHeight: 24, color: C.parchment, textAlign: hiza(rtl) }, GOLGE]}>{ad}</Text>
          <Text numberOfLines={1} style={[{ fontFamily: F.serif, fontSize: 14, color: C.parchmentDim, textAlign: hiza(rtl) }, GOLGE]}>{applyParams(t("onl.isl.sahibi"), [g.sahip.ad || t("onl.hs.sahipBilinmez")])}</Text>
        </View>
      </View>
      <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
        <Rozet icon="trophy" metin={t(seviyeAnahtari(g.seviye))} renk={C.goldBright} dolu={g.seviye >= 2} />
        <Rozet icon="star" metin={applyParams(t("onl.isl.itibarN"), [g.itibar])} />
        <Rozet icon={g.kepenk ? "shield" : "sun"} metin={t(g.kepenk ? "onl.tz.kepenk.kapali" : "onl.tz.kepenk.acik")} renk={g.kepenk ? C.parchmentMuted : C.sage} dolu={!g.kepenk} />
        {konum ? <Rozet icon="crown" metin={t("onl.isl.konum." + konum)} renk={C.gold} /> : null}
      </View>
    </View>
  </View>;
}

// ---------------------------------------------------------------- raf ızgarası

function RafHucresi({ s, t, rtl, musteri, onPress }: { s: RafSatiri; t: Ceviri; rtl: boolean; musteri: boolean; onPress: () => void }) {
  const yalnizOyuncu = s.fiyat > s.npcTavan;
  const bos = s.adet <= 0;
  const erisim = [
    `${malAdi(t, s.mal)}, ${kaliteAdi(t, s.kalite)}`,
    applyParams(t("onl.tz.adetN"), [s.adet]),
    applyParams(t("onl.tz.birimFiyat"), [s.fiyat]),
    !musteri && yalnizOyuncu ? t("onl.tz.yalnizOyuncu") : null,
    s.yapan ? applyParams(t("onl.eko.yapan"), [s.yapan]) : null,
  ].filter(Boolean).join(". ");
  return <Pressable accessibilityRole="button" accessibilityLabel={erisim} accessibilityHint={t(musteri ? "onl.tz.ipucu.al" : "onl.tz.ipucu.yonet")} onPress={() => { hap("tap"); onPress(); }}
    style={({ pressed }) => ({ width: "100%", transform: [{ scale: pressed ? BASMA_OLCEK : 1 }], opacity: bos ? 0.6 : 1 })}>
    <Cerceve ic={{ padding: 10, gap: 6, minHeight: 132 }}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: KALITE_RENK[s.kalite] ?? ONL.frame, backgroundColor: "rgba(0,0,0,0.35)" }}>
          <GameIcon name={malIkonu(s.mal)} size={19} color={C.goldBright} />
        </View>
        <Text numberOfLines={2} style={{ flex: 1, fontFamily: F.display, fontSize: 13.5, lineHeight: 17, color: C.parchment, textAlign: hiza(rtl) }}>{malAdi(t, s.mal)}</Text>
      </View>
      <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 4 }}><KaliteRozeti kademe={s.kalite} /></View>
      <View style={{ flexDirection: yon(rtl), alignItems: "baseline", justifyContent: "space-between", gap: 4 }}>
        <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim }}>{applyParams(t("onl.tz.adetKisa"), [s.adet])}</Text>
        <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 15, color: C.goldBright }}>{ak(t, s.fiyat)}</Text>
      </View>
      {!musteri && yalnizOyuncu ? <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 5 }}>
        <GameIcon name="family" size={12} color={C.ember} />
        <Text numberOfLines={2} style={{ flex: 1, fontFamily: F.serif, fontSize: 11.5, lineHeight: 14, color: C.emberSoft, textAlign: hiza(rtl) }}>{t("onl.tz.yalnizOyuncu")}</Text>
      </View> : null}
      {s.yapan ? <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: C.gold, textAlign: hiza(rtl) }}>{applyParams(t("onl.eko.yapan"), [s.yapan])}</Text> : null}
    </Cerceve>
  </Pressable>;
}

function BosYuva({ t, rtl, kapali, onPress }: { t: Ceviri; rtl: boolean; kapali: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={t("onl.tz.rafEkle")} accessibilityHint={t("onl.tz.rafEkleIpucu")} accessibilityState={{ disabled: kapali }} disabled={kapali}
    onPress={() => { hap("tap"); onPress(); }}
    style={({ pressed }) => ({ width: "48%", flexGrow: 1, minHeight: 132, borderRadius: 10, borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(201,162,78,0.45)",
      backgroundColor: pressed ? "rgba(201,162,78,0.14)" : "rgba(14,10,6,0.5)", alignItems: "center", justifyContent: "center", gap: 6, padding: 10, opacity: kapali ? 0.5 : 1,
      transform: [{ scale: pressed ? BASMA_OLCEK : 1 }] })}>
    <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: ONL.frame, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontFamily: F.display, fontSize: 20, lineHeight: 24, color: C.goldBright }}>+</Text>
    </View>
    <Text style={{ fontFamily: F.display, fontSize: 12.5, color: C.gold, textAlign: "center" }}>{t("onl.tz.rafEkle")}</Text>
  </Pressable>;
}

/** İki sütun raf: satır kartları; sahip görünümünde boş satır yuvaları "raf ekle". */
export function RafIzgarasi({ g, t, rtl, musteri, onSatir, onBos }: { g: TezgahGorunumu; t: Ceviri; rtl: boolean; musteri: boolean; onSatir: (n: number) => void; onBos?: () => void }) {
  const bosSay = musteri || !g.izin.raf ? 0 : Math.max(0, g.rafSiniri.satir - g.raf.length);
  if (!g.raf.length && !bosSay) return <BosKart icon="scales" metin={t(musteri ? "onl.tz.rafBosMusteri" : "onl.tz.rafBosYetkisiz")} rtl={rtl} />;
  return <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 10 }}>
    {g.raf.map((s) => <Animated.View key={s.satir} entering={belir()} style={{ width: "48%", flexGrow: 1, display: "flex" }}>
      <RafHucresi s={s} t={t} rtl={rtl} musteri={musteri} onPress={() => onSatir(s.satir)} />
    </Animated.View>)}
    {Array.from({ length: bosSay }, (_, i) => <BosYuva key={"b" + i} t={t} rtl={rtl} kapali={!onBos} onPress={() => onBos?.()} />)}
    {/* tek sütun kaldıysa satır dengesi için boş hücre */}
    {(g.raf.length + bosSay) % 2 === 1 ? <View style={{ width: "48%", flexGrow: 1 }} /> : null}
  </View>;
}

/** Yükleniyor iskeleti: sahne + iki sütun raf. */
export function TezgahIskeleti({ etiket, rtl }: { etiket: string; rtl: boolean }) {
  const kutu = (h: number, w: string | number = "100%") => <View style={{ height: h, width: w as number, borderRadius: 10, backgroundColor: "rgba(201,162,78,0.12)" }} />;
  return <View accessibilityRole="progressbar" accessibilityLabel={etiket} style={{ gap: 12 }}>
    <Animated.View entering={belir()}>{kutu(150)}</Animated.View>
    <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 10 }}>
      {[0, 1, 2, 3].map((i) => <Animated.View key={i} entering={belir()} style={{ width: "48%", flexGrow: 1 }}>{kutu(132)}</Animated.View>)}
    </View>
  </View>;
}

/** Adet seçici: −/+ ve hızlı seçimler (+10, Tümü = üst sınır; sınırı çağıran en küçük geçerli değerle verir). */
export function AdetSecici({ etiket, deger, en = 1, cok, onDegis, rtl, t }: { etiket: string; deger: number; en?: number; cok: number; onDegis: (n: number) => void; rtl: boolean; t: Ceviri }) {
  const hizli = (ad: string, gorunen: string, hedef: number) => {
    const y = Math.max(en, Math.min(cok, hedef));
    const kapali = y === deger;
    return <Pressable accessibilityRole="button" accessibilityLabel={`${etiket}: ${ad}`} accessibilityState={{ disabled: kapali }} disabled={kapali}
      onPress={() => { hap("selection"); onDegis(y); }}
      style={({ pressed }) => ({ minHeight: 44, minWidth: 72, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: kapali ? "rgba(168,130,63,0.35)" : ONL.frameHi, alignItems: "center", justifyContent: "center",
        backgroundColor: pressed ? "rgba(201,162,78,0.22)" : "rgba(14,10,6,0.7)", opacity: kapali ? 0.5 : 1 })}>
      <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 13, color: C.goldBright }}>{gorunen}</Text>
    </Pressable>;
  };
  return <View style={{ gap: 6 }}>
    <Sayac etiket={etiket} deger={deger} en={en} cok={cok} onDegis={onDegis} />
    {cok > en ? <View style={{ flexDirection: yon(rtl), justifyContent: "flex-end", gap: 8 }}>
      {hizli(t("onl.tz.hizli.on"), "+10", deger + 10)}
      {hizli(t("onl.tz.hizli.tumu"), t("onl.tz.hizli.tumu"), cok)}
    </View> : null}
  </View>;
}

// ---------------------------------------------------------------- fiyat adımlayıcı ve önizleme

/** Erişilebilir fiyat seçimi: −/+ (1 akçe), hızlı seçimler (adil, NPC tavanı, ±%10), bant çubuğu üstünde adil ve tavan işaretli. */
export function FiyatAdimlayici({ deger, bant, adil, npcTavan, onDegis, rtl, t, kapali = false }: {
  deger: number; bant: FiyatBandi; adil: number; npcTavan: number; onDegis: (n: number) => void; rtl: boolean; t: Ceviri; kapali?: boolean;
}) {
  const adilF = bantIci(adil, bant);
  const tavanF = bantIci(npcTavan, bant);
  const sec = (n: number) => { const y = bantIci(n, bant); if (y !== deger) { hap("selection"); onDegis(y); } };
  const yuzde = (f: number) => (bant.ust > bant.alt ? ((f - bant.alt) / (bant.ust - bant.alt)) * 100 : 0);
  const asagi = Math.max(bant.alt, Math.min(deger - 1, Math.round(deger * 0.9)));
  const yukari = Math.min(bant.ust, Math.max(deger + 1, Math.round(deger * 1.1)));
  const dugme = (isaret: "-" | "+") => {
    const yeni = isaret === "+" ? deger + 1 : deger - 1;
    const pasif = kapali || yeni < bant.alt || yeni > bant.ust;
    return <Pressable accessibilityRole="button" accessibilityLabel={`${t("onl.tz.fiyat")} ${t(isaret === "+" ? "onl.tp.artir" : "onl.tp.azalt")}`} accessibilityState={{ disabled: pasif }} disabled={pasif}
      onPress={() => sec(yeni)}
      style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: pasif ? "rgba(168,130,63,0.35)" : ONL.frameHi, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? "rgba(201,162,78,0.22)" : "rgba(14,10,6,0.7)", opacity: pasif ? 0.45 : 1 })}>
      <Text style={{ fontFamily: F.display, fontSize: 22, lineHeight: 26, color: C.goldBright }}>{isaret === "+" ? "+" : "−"}</Text>
    </Pressable>;
  };
  const cip = (etiket: string, hedef: number, renk: string) => {
    const secili = hedef === deger;
    return <Pressable key={etiket} accessibilityRole="button" accessibilityState={{ selected: secili, disabled: kapali }} disabled={kapali} accessibilityLabel={`${etiket}: ${ak(t, hedef)}`}
      onPress={() => sec(hedef)}
      style={({ pressed }) => ({ minHeight: 44, flexGrow: 1, flexBasis: "45%", justifyContent: "center", alignItems: "center", paddingHorizontal: 8, borderRadius: 22, borderWidth: secili ? 1.5 : 1,
        borderColor: secili ? renk : "rgba(201,162,78,0.35)", backgroundColor: pressed ? "rgba(201,162,78,0.2)" : secili ? "rgba(201,162,78,0.16)" : "rgba(14,10,6,0.6)", opacity: kapali ? 0.5 : 1 })}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: 12, color: secili ? C.parchment : C.parchmentDim }}>{`${etiket} · ${hedef}`}</Text>
    </Pressable>;
  };
  const isaret = (f: number, renk: string) => {
    const k = Math.max(0, Math.min(100, yuzde(f)));
    return <View pointerEvents="none" style={[{ position: "absolute", top: -3, width: 2, height: 12, backgroundColor: renk }, rtl ? { right: `${k}%`, marginRight: -1 } : { left: `${k}%`, marginLeft: -1 }]} />;
  };
  return <View style={{ gap: 10 }}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
      {dugme("-")}
      <View accessible accessibilityRole="adjustable" accessibilityLabel={t("onl.tz.fiyat")} accessibilityValue={{ text: ak(t, deger) }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => { if (kapali) return; sec(e.nativeEvent.actionName === "increment" ? deger + 1 : deger - 1); }}
        style={{ flex: 1, alignItems: "center" }}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontFamily: F.display, fontSize: 24, lineHeight: 30, color: deger > npcTavan ? C.emberSoft : C.goldBright }}>{ak(t, deger)}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentMuted }}>{applyParams(t("onl.tz.bant"), [bant.alt, bant.ust])}</Text>
      </View>
      {dugme("+")}
    </View>
    <View accessible={false} style={{ height: 6, marginHorizontal: 6, borderRadius: 3, backgroundColor: "rgba(201,162,78,0.16)" }}>
      <View style={[{ position: "absolute", top: 0, bottom: 0, width: `${yuzde(deger)}%`, borderRadius: 3, backgroundColor: deger > npcTavan ? C.ember : C.gold }, rtl ? { right: 0 } : { left: 0 }]} />
      {isaret(adilF, C.sage)}
      {isaret(tavanF, C.emberSoft)}
    </View>
    <View style={{ flexDirection: yon(rtl), justifyContent: "space-between", gap: 8, paddingHorizontal: 2 }}>
      <Text style={{ fontFamily: F.serif, fontSize: 12, color: C.sage }}>{applyParams(t("onl.tz.adilIsaret"), [adilF])}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 12, color: C.emberSoft }}>{applyParams(t("onl.tz.tavanIsaret"), [tavanF])}</Text>
    </View>
    <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
      {cip(t("onl.tz.hizli.adil"), adilF, C.sage)}
      {cip(t("onl.tz.hizli.tavan"), tavanF, C.emberSoft)}
      {cip(t("onl.tz.hizli.eksi"), asagi, C.gold)}
      {cip(t("onl.tz.hizli.arti"), yukari, C.gold)}
    </View>
    {deger > npcTavan ? <Not metin={t("onl.tz.tavanUstu")} rtl={rtl} icon="family" renk={C.emberSoft} /> : null}
  </View>;
}

/** Sunucu önizlemesi: "Bu fiyatla NPC payın ~%X, tahmini N adet / H akçe", çarpanlar ve neden. */
export function OnizlemeKarti({ veri, yukleniyor, hata, rtl, t }: { veri: Onizleme | null; yukleniyor: boolean; hata: string | null; rtl: boolean; t: Ceviri }) {
  const { lang } = useI18n();
  return <View accessibilityLiveRegion="polite" style={{ gap: 6, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,162,78,0.3)", backgroundColor: "rgba(14,10,6,0.6)" }}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
      <GameIcon name="compass" size={14} color={C.gold} />
      <Text style={{ flex: 1, fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 1, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.tz.onizleme")}</Text>
      {yukleniyor ? <ActivityIndicator size="small" color={C.gold} accessibilityLabel={t("onl.tz.hesaplaniyor")} /> : null}
    </View>
    {hata && !veri ? <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 19, color: C.ember, textAlign: hiza(rtl) }}>{hata}</Text>
      : !veri ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.tz.hesaplaniyor")}</Text>
      : <View style={{ gap: 4, opacity: yukleniyor ? 0.55 : 1 }}>
        <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: C.parchment, textAlign: hiza(rtl) }}>
          {applyParams(t("onl.tz.onizlemeCumle"), [yuzdeL(veri.payYuzde, lang), veri.tahminiAdet, veri.tahminiHasilat])}
        </Text>
        <Text style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 17, color: C.parchmentDim, textAlign: hiza(rtl) }}>{carpanMetni(t, veri.carpanlar, lang)}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 17, color: C.parchmentDim, textAlign: hiza(rtl) }}>
          {applyParams(t(veri.rakipSatir > 0 ? "onl.tz.butceRakip" : "onl.tz.butceTek"), [veri.butce.bMal, veri.rakipSatir])}
        </Text>
        {nedenMetni(t, veri.neden) ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.gold, textAlign: hiza(rtl) }}>{nedenMetni(t, veri.neden)}</Text> : null}
        {hata ? <Text style={{ fontFamily: F.serif, fontSize: 12.5, color: C.ember, textAlign: hiza(rtl) }}>{hata}</Text> : null}
      </View>}
  </View>;
}

// ---------------------------------------------------------------- depo

/** Paneldeki depo özeti: doluluk ve çekmeceyi açan düğme. */
export function DepoOzeti({ g, t, rtl, onAc }: { g: TezgahGorunumu; t: Ceviri; rtl: boolean; onAc: () => void }) {
  const dolu = g.depoDolu ?? 0, kap = g.depoKapasite ?? 0;
  const cesit = g.depo?.length ?? 0;
  return <Cerceve ic={{ padding: 12, gap: 10 }}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
      <Madalyon icon="backpack" size={38} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: F.display, fontSize: 14.5, color: C.parchment, textAlign: hiza(rtl) }}>{applyParams(t("onl.tz.depoDoluluk"), [dolu, kap])}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim, textAlign: hiza(rtl) }}>{cesit ? applyParams(t("onl.tz.depoCesit"), [cesit]) : t("onl.tz.depoBos")}</Text>
      </View>
    </View>
    <Doluluk nufus={dolu} kapasite={Math.max(1, kap)} rtl={rtl} />
    <CizgiDugme etiket={t("onl.tz.depoAc")} icon="backpack" rtl={rtl} kucuk onPress={onAc} />
  </Cerceve>;
}

/** Envanterdeki bir malın kalite kademelerine göre adedi (izli partiler + izsiz sade). */
function kademeAdetleri(toplam: number, partiler: { kademe: number; adet: number }[] | undefined): number[] {
  const a = [0, 0, 0, 0];
  let izli = 0;
  for (const p of partiler ?? []) { a[Math.max(0, Math.min(3, p.kademe))]! += p.adet; izli += p.adet; }
  a[0]! += Math.max(0, toplam - izli);
  return a;
}

export function DepoCekmecesi({ acik, oturum, g, ist, onKapat, onYenile, rtl, t }: {
  acik: boolean; oturum: number; g: TezgahGorunumu; ist: TezgahIstemci; onKapat: () => void; onYenile: () => Promise<void> | void; rtl: boolean; t: Ceviri;
}) {
  const o = useOnline();
  const yaz = useTekIstek();
  const [sekme, setSekme] = useState<"koy" | "al">("koy");
  const [mal, setMal] = useState<string | null>(null);
  const [q, setQ] = useState<Kademe>(0);
  const [adet, setAdet] = useState(1);
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const oturumRef = useRef(oturum);
  oturumRef.current = oturum;
  useEffect(() => { if (acik) { setHata(null); setBilgi(null); setMal(null); setAdet(1); } }, [acik, oturum]);

  const ev = (o.envanter ?? o.yerlesim?.ben.envanter ?? {}) as Record<string, number | undefined>;
  const kisiAdi = (id: string) => o.yerlesim?.ben.tanidiklar.find((x) => x.id === id)?.ad
    ?? o.yerlesim?.harita.flatMap((m) => m.kisiler).find((x) => x.id === id)?.ad ?? t("onl.tz.dd.calisan");
  const kq = benKalite(o.yerlesim?.ben);
  const dolu = g.depoDolu ?? 0, kap = g.depoKapasite ?? 0;
  const bosYer = Math.max(0, kap - dolu);
  const heybe = Object.keys(ev).filter((m) => (ev[m] ?? 0) > 0 && (g.tur === "atolye" || rafMali(m))).sort();
  const depo: DepoSatiri[] = g.depo ?? [];
  // Seçim: koy → heybedeki mal + kalite; al → depodaki satır.
  const heybeAdet = mal ? kademeAdetleri(ev[mal] ?? 0, kq?.[mal]) : [0, 0, 0, 0];
  const depoSatir = sekme === "al" && mal ? depo.find((x) => x.mal === mal && x.kalite === q) ?? null : null;
  const eldeki = sekme === "koy" ? heybeAdet[q] ?? 0 : depoSatir?.adet ?? 0;
  const enCok = Math.max(0, Math.min(60, eldeki, sekme === "koy" ? bosYer : 60));
  useEffect(() => { setAdet((a) => Math.max(1, Math.min(a, Math.max(1, enCok)))); }, [enCok]);

  const izin = sekme === "koy" ? g.izin.depoKoy : g.izin.depoAl;
  const neden = !izin ? t("onl.tz.h.yetkiYok") : !mal ? t(sekme === "koy" ? "onl.tz.depo.malSec" : "onl.tz.depo.satirSec")
    : eldeki <= 0 ? t(sekme === "koy" ? "onl.tz.depo.heybedeYok" : "onl.tz.depo.depodaYok")
    : sekme === "koy" && bosYer <= 0 ? t("onl.hh.depo_dolu") : null;
  const gonder = async () => {
    if (!mal || neden) return;
    const bas = oturumRef.current;
    const govde = { yon: sekme, mal, kalite: q, adet: Math.min(adet, enCok) };
    const r = await yaz.calistir(JSON.stringify(govde), async (istekNo) => {
      const s = await ist.depo(g.isletme, { ...govde, istekNo });
      if (s.ok || istekTekrarMi(s.hata)) await onYenile();
      return s;
    });
    if (!r) return;
    if (r.ok || istekTekrarMi(r.hata)) {
      if (r.ok) hap("success");
      if (bas !== oturumRef.current) return;
      setHata(null);
      setBilgi(r.ok ? applyParams(t(sekme === "koy" ? "onl.tz.depo.kondu" : "onl.tz.depo.alindi"), [govde.adet, malAdi(t, mal)]) : t("onl.h.istekTekrar"));
      setAdet(1);
    } else if (bas === oturumRef.current) { hap("error"); setBilgi(null); setHata(tezgahHataMetni(t, r)); }
  };

  return <AltPanel acik={acik} onKapat={onKapat} etiket={t("onl.tz.depo")} rtl={rtl} t={t}>
    <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 17, color: C.parchment, textAlign: hiza(rtl), paddingEnd: 36 }}>{t("onl.tz.depo")}</Text>
    <View style={{ gap: 6 }}>
      <Satir etiket={t("onl.tz.doluluk")} deger={`${dolu}/${kap}`} renk={bosYer <= 0 ? C.ember : C.parchment} rtl={rtl} />
      <Doluluk nufus={dolu} kapasite={Math.max(1, kap)} rtl={rtl} />
    </View>
    <View accessibilityRole="tablist" style={{ flexDirection: yon(rtl), gap: 8 }}>
      <Sekme etiket={t("onl.tz.depo.koy")} icon="backpack" secili={sekme === "koy"} rtl={rtl} onPress={() => { setSekme("koy"); setMal(null); setHata(null); setBilgi(null); }} />
      <Sekme etiket={t("onl.tz.depo.al")} icon="amphora" secili={sekme === "al"} rtl={rtl} onPress={() => { setSekme("al"); setMal(null); setHata(null); setBilgi(null); }} />
    </View>
    {sekme === "koy" ? (heybe.length ? <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 8 }}>
      {heybe.map((m) => <SecimOgesi key={m} bicim="hucre" icon={malIkonu(m)} metin={malAdi(t, m)} ek={applyParams(t("onl.tz.adetKisa"), [ev[m] ?? 0])} secili={mal === m} rtl={rtl}
        erisim={`${malAdi(t, m)}, ${applyParams(t("onl.tz.adetN"), [ev[m] ?? 0])}`}
        onPress={() => { setMal(m); const a = kademeAdetleri(ev[m] ?? 0, kq?.[m]); setQ(Math.max(0, a.findIndex((x) => x > 0)) as Kademe); setHata(null); }} />)}
    </View> : <BosKart icon="backpack" metin={t(g.tur === "atolye" ? "onl.tz.depo.heybeBosAtolye" : "onl.tz.depo.heybeBos")} rtl={rtl} />)
      : depo.length ? <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 8 }}>
        {depo.map((x) => <SecimOgesi key={`${x.mal}.${x.kalite}`} bicim="hucre" icon={malIkonu(x.mal)} metin={malAdi(t, x.mal)} fiyat={kaliteAdi(t, x.kalite)}
          ek={applyParams(t("onl.tz.adetKisa"), [x.adet])} secili={mal === x.mal && q === x.kalite} rtl={rtl}
          erisim={`${malAdi(t, x.mal)}, ${kaliteAdi(t, x.kalite)}, ${applyParams(t("onl.tz.adetN"), [x.adet])}`}
          onPress={() => { setMal(x.mal); setQ(x.kalite); setHata(null); }} />)}
      </View> : <BosKart icon="amphora" metin={t("onl.tz.depoBos")} rtl={rtl} />}
    {sekme === "koy" && mal ? <View style={{ gap: 6 }}>
      <AltBaslik metin={t("onl.tz.kalite")} rtl={rtl} />
      <Secenekler secenekler={(["0", "1", "2", "3"] as const).filter((k) => (heybeAdet[Number(k)] ?? 0) > 0)} secili={String(q) as "0" | "1" | "2" | "3"}
        onSec={(k) => setQ(Number(k) as Kademe)} etiket={(k) => `${kaliteAdi(t, Number(k))} · ${heybeAdet[Number(k)]}`} />
    </View> : null}
    {mal && enCok > 0 ? <AdetSecici etiket={t("onl.tz.adet")} deger={Math.min(adet, enCok)} cok={enCok} onDegis={setAdet} rtl={rtl} t={t} /> : null}
    <Sonuc hata={hata} bilgi={bilgi} rtl={rtl} />
    {neden && (mal || !izin) ? <Not metin={neden} rtl={rtl} /> : null}
    {sekme === "al" && g.depoDefteri?.length ? <View style={{ gap: 4 }}>
      <AltBaslik metin={t("onl.tz.dd.baslik")} rtl={rtl} />
      {[...g.depoDefteri].reverse().slice(0, 8).map((x, i) => <Text key={`${x.ay}.${x.kim}.${x.mal}.${i}`} style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>
        {applyParams(t("onl.tz.dd.satir"), [x.ay, x.kimAd || kisiAdi(x.kim), x.adet, malAdi(t, x.mal), kaliteAdi(t, x.kalite)])}
      </Text>)}
    </View> : null}
    <AltinDugme etiket={t(sekme === "koy" ? "onl.tz.depo.koyDugme" : "onl.tz.depo.alDugme")} icon={sekme === "koy" ? "backpack" : "amphora"} rtl={rtl}
      kapali={!!neden} bekliyor={yaz.bekliyor} erisim={[t(sekme === "koy" ? "onl.tz.depo.koyDugme" : "onl.tz.depo.alDugme"), neden].filter(Boolean).join(". ")}
      onPress={() => { void gonder(); }} />
  </AltPanel>;
}

// ---------------------------------------------------------------- gün sonu

export function GunSonuKarti({ gs, ozet, t, rtl }: { gs: GunSonu | null | undefined; ozet?: TezgahGorunumu["ozet"]; t: Ceviri; rtl: boolean }) {
  const { lang } = useI18n();
  const [acik, setAcik] = useState(false);
  if (!gs) return <BosKart icon="hourglass" metin={t("onl.tz.gs.yok")} rtl={rtl} />;
  if (gs.kepenk) return <View accessible style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,162,78,0.3)", backgroundColor: "rgba(14,10,6,0.6)" }}>
    <GameIcon name="leaf" size={18} color={C.parchmentDim} />
    <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.tz.gs.kepenk"), [gs.ay])}</Text>
  </View>;
  if (gs.ertelendi || gs.hasilat === undefined) return <BosKart icon="hourglass" metin={t("onl.tz.gs.ertelendi")} rtl={rtl} />;
  const satirlar = gs.satirlar ?? [];
  const hicYok = !satirlar.some((x) => x.satilan > 0);
  const bosMeslek = (ozet?.meslekler ?? []).filter((m) => m.neden === "kimseSatmadi").map((m) => meslekYaz(m.meslek, lang));
  return <Cerceve ic={{ padding: 12, gap: 8 }}>
    <AltBaslik metin={applyParams(t("onl.tz.gs.baslik"), [gs.ay])} rtl={rtl} />
    <Satir etiket={t("onl.tz.gs.hasilat")} deger={ak(t, gs.hasilat)} renk={C.goldBright} rtl={rtl} />
    {gs.vergi ? <Satir etiket={applyParams(t("onl.tz.gs.vergi"), [yuzdeL(gs.vergi.oran, lang)])} deger={gs.vergi.tutar ? `−${gs.vergi.tutar}` : "—"} renk={gs.vergi.tutar ? C.ember : C.parchmentMuted} rtl={rtl} /> : null}
    <Satir etiket={t("onl.tz.gs.net")} deger={ak(t, gs.net ?? 0)} renk={C.sage} rtl={rtl} />
    {gs.tavan ? <Satir etiket={t("onl.tz.gs.tavan")} deger={`${gs.tavan.kullanilan}/${gs.tavan.seviye}`} rtl={rtl} /> : null}
    {hicYok ? <Not metin={t("onl.tz.gs.satisYok")} rtl={rtl} icon="compass" renk={C.gold} /> : null}
    {bosMeslek.length ? <Not metin={applyParams(t("onl.tz.gs.firsat"), [bosMeslek.join(", ")])} rtl={rtl} icon="star" renk={C.gold} /> : null}
    {satirlar.length ? <Pressable accessibilityRole="button" accessibilityState={{ expanded: acik }} accessibilityLabel={t(acik ? "onl.tz.gs.gizle" : "onl.tz.gs.dokum")}
      onPress={() => { hap("selection"); setAcik(!acik); }} style={{ minHeight: 44, flexDirection: yon(rtl), alignItems: "center", gap: 6 }}>
      <GameIcon name="scroll" size={14} color={C.gold} />
      <Text style={{ flex: 1, fontFamily: F.display, fontSize: 12.5, color: C.gold, textAlign: hiza(rtl) }}>{t(acik ? "onl.tz.gs.gizle" : "onl.tz.gs.dokum")}</Text>
    </Pressable> : null}
    {acik ? satirlar.map((x) => <Animated.View key={x.satir} entering={belir()} accessible
      style={{ gap: 3, paddingTop: 8, borderTopWidth: 1, borderColor: "rgba(201,162,78,0.14)" }}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
        <GameIcon name={malIkonu(x.mal)} size={15} color={C.goldBright} />
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.display, fontSize: 13.5, color: C.parchment, textAlign: hiza(rtl) }}>{`${malAdi(t, x.mal)} · ${kaliteAdi(t, x.kalite)}`}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 13.5, color: x.hasilat ? C.sage : C.parchmentMuted }}>{x.hasilat ? `+${x.hasilat}` : "·"}</Text>
      </View>
      <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>
        {applyParams(t("onl.tz.gs.satir"), [x.satilan, x.kalan, x.fiyat, yuzdeL(x.payYuzde, lang)])}
      </Text>
      <Text style={{ fontFamily: F.serif, fontSize: 12, lineHeight: 16, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{carpanMetni(t, x.carpanlar, lang)}</Text>
      {nedenMetni(t, x.neden) ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: x.neden === "stok" ? C.sage : C.gold, textAlign: hiza(rtl) }}>{nedenMetni(t, x.neden)}</Text> : null}
    </Animated.View>) : null}
  </Cerceve>;
}

// ---------------------------------------------------------------- raf çekmecesi (sahip / yetkili çalışan)

/** `satirNo` null: yeni satır (depodan mal seçilir). */
export function RafCekmecesi({ acik, oturum, g, satirNo, ist, onKapat, onYenile, onSatir, onDepo, rtl, t }: {
  acik: boolean; oturum: number; g: TezgahGorunumu; satirNo: number | null; ist: TezgahIstemci; onKapat: () => void;
  onYenile: () => Promise<void> | void; onSatir: (n: number) => void; onDepo: () => void; rtl: boolean; t: Ceviri;
}) {
  const yaz = useTekIstek();
  const [yeni, setYeni] = useState<{ mal: string; kalite: Kademe } | null>(null);
  const [fiyat, setFiyat] = useState(1);
  const [adet, setAdet] = useState(1);
  const [stokYon, setStokYon] = useState<"ekle" | "al">("ekle");
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const oturumRef = useRef(oturum);
  oturumRef.current = oturum;
  const satir = satirNo !== null ? g.raf.find((x) => x.satir === satirNo) ?? null : null;
  const kayip = satirNo !== null && !satir;
  const hedef = satir ? { mal: satir.mal, kalite: satir.kalite } : yeni;
  const bilgiBant = satir ? { bant: satir.bant, adil: satir.adil, npcTavan: satir.npcTavan } : yeni ? bantHesapla(yeni.mal, yeni.kalite) : null;
  // Açılışta: mevcut satırın fiyatı ya da yeni satırda adil fiyat; satır değişince (başka satır) yeniden kurulur.
  useEffect(() => {
    if (!acik) return;
    setHata(null); setBilgi(null); setAdet(1); setStokYon("ekle");
    if (satirNo === null) setYeni(null);
    if (satir) setFiyat(satir.fiyat);
  }, [acik, oturum, satirNo]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (yeni) { const b = bantHesapla(yeni.mal, yeni.kalite); if (b) setFiyat(bantIci(b.adil, b.bant)); } }, [yeni?.mal, yeni?.kalite]); // eslint-disable-line react-hooks/exhaustive-deps

  const depo = g.depo ?? [];
  const depoAdet = hedef ? depo.find((x) => x.mal === hedef.mal && x.kalite === hedef.kalite)?.adet ?? 0 : 0;
  const bosYer = Math.max(0, (g.depoKapasite ?? 0) - (g.depoDolu ?? 0));
  const rafYer = g.rafSiniri.adet - (satir?.adet ?? 0);
  const enCok = stokYon === "ekle" ? Math.max(0, Math.min(rafYer, depoAdet)) : Math.max(0, Math.min(satir?.adet ?? 0, bosYer));
  useEffect(() => { setAdet((a) => Math.max(1, Math.min(a, Math.max(1, enCok)))); }, [enCok]);

  const onizGirdi = acik && hedef && bilgiBant && g.izin.fiyat && !kayip ? { mal: hedef.mal, kalite: hedef.kalite, fiyat, adet: satir ? undefined : Math.max(1, Math.min(adet, enCok || 1)) } : null;
  const oniz = useOnizleme(ist, g.isletme, onizGirdi);

  const yazRaf = async (govde: RafKomutu, basari: string) => {
    const bas = oturumRef.current;
    const r = await yaz.calistir(JSON.stringify(govde), async (istekNo) => {
      const s = await ist.raf(g.isletme, { ...govde, istekNo });
      if (s.ok || istekTekrarMi(s.hata)) await onYenile();
      return s;
    });
    if (!r) return;
    if (r.ok || istekTekrarMi(r.hata)) {
      if (r.ok) hap("success");
      if (bas !== oturumRef.current) return;
      setHata(null); setBilgi(r.ok ? basari : t("onl.h.istekTekrar")); setAdet(1);
      if (r.ok && r.deger.satir && satirNo === null) onSatir(r.deger.satir.satir);
    } else if (bas === oturumRef.current) { hap("error"); setBilgi(null); setHata(tezgahHataMetni(t, r)); }
  };

  const baslik = hedef ? `${malAdi(t, hedef.mal)} · ${kaliteAdi(t, hedef.kalite)}` : t("onl.tz.yeniSatir");
  const fiyatDegisti = !!satir && fiyat !== satir.fiyat;
  const stokNeden = kayip ? t("onl.tz.satirGitti") : !g.izin.raf ? t("onl.tz.h.yetkiYok")
    : stokYon === "ekle" ? (depoAdet <= 0 ? t("onl.tz.depodaBuYok") : rafYer <= 0 ? t("onl.hh.raf_satir_dolu") : null)
    : (satir?.adet ?? 0) <= 0 ? t("onl.tz.satirBos") : bosYer <= 0 ? t("onl.hh.depo_dolu") : null;

  return <AltPanel acik={acik} onKapat={onKapat} etiket={baslik} rtl={rtl} t={t}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingEnd: 36 }}>
      {hedef ? <Madalyon icon={malIkonu(hedef.mal)} size={40} aktif={!kayip} /> : <Madalyon icon="scales" size={40} />}
      <View style={{ flex: 1, gap: 2 }}>
        <Text accessibilityRole="header" numberOfLines={2} style={{ fontFamily: F.display, fontSize: 17, color: C.parchment, textAlign: hiza(rtl) }}>{baslik}</Text>
        {satir ? <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.tz.raftaN"), [satir.adet, g.rafSiniri.adet])}</Text> : null}
      </View>
    </View>
    {kayip ? <Not metin={t("onl.tz.satirGitti")} rtl={rtl} icon="hourglass" renk={C.ember} /> : null}

    {satirNo === null && !yeni ? <>
      <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.tz.yeniSatirNot")}</Text>
      {depo.length ? <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 8 }}>
        {depo.filter((x) => rafMali(x.mal)).map((x) => {
          const varmi = g.raf.some((r) => r.mal === x.mal && r.kalite === x.kalite);
          return <SecimOgesi key={`${x.mal}.${x.kalite}`} bicim="hucre" icon={malIkonu(x.mal)} metin={malAdi(t, x.mal)} fiyat={kaliteAdi(t, x.kalite)}
            ek={varmi ? t("onl.tz.zatenRafta") : applyParams(t("onl.tz.adetKisa"), [x.adet])} secili={false} rtl={rtl}
            erisim={`${malAdi(t, x.mal)}, ${kaliteAdi(t, x.kalite)}, ${applyParams(t("onl.tz.adetN"), [x.adet])}`}
            onPress={() => { const r = g.raf.find((y) => y.mal === x.mal && y.kalite === x.kalite); if (r) onSatir(r.satir); else setYeni({ mal: x.mal, kalite: x.kalite }); }} />;
        })}
      </View> : <>
        <BosKart icon="backpack" metin={t("onl.tz.depoBosRaf")} rtl={rtl} />
        <CizgiDugme etiket={t("onl.tz.depoAc")} icon="backpack" rtl={rtl} kucuk onPress={onDepo} />
      </>}
    </> : null}

    {hedef && bilgiBant && !kayip ? <>
      {g.izin.fiyat ? <View style={{ gap: 10 }}>
        <AltBaslik metin={t("onl.tz.fiyatBaslik")} rtl={rtl} />
        <FiyatAdimlayici deger={fiyat} bant={bilgiBant.bant} adil={bilgiBant.adil} npcTavan={bilgiBant.npcTavan} onDegis={(n) => { setFiyat(n); setBilgi(null); setHata(null); }} rtl={rtl} t={t} kapali={yaz.bekliyor} />
        <OnizlemeKarti veri={oniz.veri} yukleniyor={oniz.yukleniyor} hata={oniz.hata} rtl={rtl} t={t} />
        {satir ? <AltinDugme etiket={applyParams(t("onl.tz.fiyatKaydet"), [fiyat])} icon="scales" rtl={rtl} kapali={!fiyatDegisti} bekliyor={yaz.bekliyor}
          onPress={() => { void yazRaf({ islem: "fiyat", satir: satir.satir, fiyat }, applyParams(t("onl.tz.fiyatKaydedildi"), [fiyat])); }} /> : null}
      </View> : satir ? <Satir etiket={t("onl.tz.fiyat")} deger={ak(t, satir.fiyat)} renk={C.goldBright} rtl={rtl} /> : <Not metin={t("onl.tz.h.yetkiYok")} rtl={rtl} />}

      <View style={{ gap: 10 }}>
        <AltBaslik metin={t(satir ? "onl.tz.stokBaslik" : "onl.tz.rafaKoyBaslik")} rtl={rtl} />
        {satir ? <View accessibilityRole="tablist" style={{ flexDirection: yon(rtl), gap: 8 }}>
          <Sekme etiket={t("onl.tz.depodanRafa")} icon="backpack" secili={stokYon === "ekle"} rtl={rtl} onPress={() => setStokYon("ekle")} />
          <Sekme etiket={t("onl.tz.raftanDepoya")} icon="amphora" secili={stokYon === "al"} rtl={rtl} onPress={() => setStokYon("al")} />
        </View> : null}
        <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.tz.depodaN"), [depoAdet])}</Text>
        {enCok > 0 ? <AdetSecici etiket={t("onl.tz.adet")} deger={Math.min(adet, enCok)} cok={enCok} onDegis={setAdet} rtl={rtl} t={t} /> : null}
        {stokNeden ? <Not metin={stokNeden} rtl={rtl} /> : null}
        {satir ? <CizgiDugme etiket={t(stokYon === "ekle" ? "onl.tz.rafaEkle" : "onl.tz.raftanAl")} icon={stokYon === "ekle" ? "backpack" : "amphora"} rtl={rtl}
          kapali={!!stokNeden || yaz.bekliyor}
          onPress={() => { const n = Math.min(adet, enCok); void (stokYon === "ekle"
            ? yazRaf({ islem: "koy", mal: satir.mal, kalite: satir.kalite, adet: n }, applyParams(t("onl.tz.rafaEklendi"), [n, malAdi(t, satir.mal)]))
            : yazRaf({ islem: "al", satir: satir.satir, adet: n }, applyParams(t("onl.tz.raftanAlindi"), [n, malAdi(t, satir.mal)]))); }} />
          : <AltinDugme etiket={applyParams(t("onl.tz.rafaKoy"), [Math.min(adet, Math.max(1, enCok)), fiyat])} icon="scales" rtl={rtl}
            kapali={!!stokNeden || !g.izin.fiyat} bekliyor={yaz.bekliyor}
            onPress={() => { const n = Math.min(adet, enCok); void yazRaf({ islem: "koy", mal: hedef.mal, kalite: hedef.kalite, adet: n, fiyat }, applyParams(t("onl.tz.rafaEklendi"), [n, malAdi(t, hedef.mal)])); }} />}
        {!satir ? <CizgiDugme etiket={t("onl.tz.baskaMal")} icon="scroll" rtl={rtl} kucuk kapali={yaz.bekliyor} onPress={() => setYeni(null)} /> : null}
      </View>
    </> : null}
    <Sonuc hata={hata} bilgi={bilgi} rtl={rtl} />
  </AltPanel>;
}

// ---------------------------------------------------------------- satın alma çekmecesi (müşteri)

export function SatinAlCekmecesi({ acik, oturum, g, satirNo, ist, para, onKapat, onYenile, rtl, t }: {
  acik: boolean; oturum: number; g: TezgahGorunumu; satirNo: number | null; ist: TezgahIstemci; para: number;
  onKapat: () => void; onYenile: () => Promise<void> | void; rtl: boolean; t: Ceviri;
}) {
  const { lang } = useI18n();
  const yaz = useTekIstek();
  const [adet, setAdet] = useState(1);
  const [gorulen, setGorulen] = useState<number | null>(null);
  const [sonuc, setSonuc] = useState<{ adet: number; mal: string; tutar: number; vergi: { oran: number; tutar: number } } | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const oturumRef = useRef(oturum);
  oturumRef.current = oturum;
  const satir = satirNo !== null ? g.raf.find((x) => x.satir === satirNo) ?? null : null;
  useEffect(() => { if (acik) { setAdet(1); setHata(null); setSonuc(null); setGorulen(satir?.fiyat ?? null); } }, [acik, oturum]); // eslint-disable-line react-hooks/exhaustive-deps
  // Satır çekmece açıldıktan sonra gelirse, görülen fiyat ilk gelişte kurulur.
  useEffect(() => { if (acik && gorulen === null && satir) setGorulen(satir.fiyat); }, [acik, gorulen, satir?.fiyat]); // eslint-disable-line react-hooks/exhaustive-deps
  // Müşterinin gördüğü fiyat ile güncel raf fiyatı ayrışırsa yeni fiyat gösterilir ve yeniden onay istenir.
  const degisti = !sonuc && gorulen !== null && !!satir && satir.fiyat !== gorulen ? { eski: gorulen } : null;
  const enCok = Math.max(0, Math.min(satir?.adet ?? 0, g.rafSiniri.adet));
  useEffect(() => { setAdet((a) => Math.max(1, Math.min(a, Math.max(1, enCok)))); }, [enCok]);
  const n = Math.min(adet, Math.max(1, enCok));
  const alinir = satir && satir.fiyat > 0 ? Math.max(1, Math.min(enCok, Math.floor(para / satir.fiyat))) : enCok;
  const toplam = satir ? satir.fiyat * n : 0;
  const neden = !satir ? t("onl.tz.malBitti") : !g.izin.satinAl ? t("onl.hh.kendine") : enCok <= 0 ? t("onl.tz.malBitti")
    : para < toplam ? applyParams(t("onl.tz.akceYetmez"), [toplam, para]) : null;
  const al = async (onayFiyat?: number) => {
    if (!satir || neden) return;
    const bas = oturumRef.current;
    const govde = { satir: satir.satir, adet: n, fiyat: onayFiyat ?? gorulen ?? satir.fiyat };
    // Tazeleme istek kilidinin içinde: bitene dek düğme kilitli kalır, heybe/para bayat görünmez.
    const r = await yaz.calistir(JSON.stringify(govde), async (istekNo) => {
      const s = await ist.satinAl(g.isletme, { ...govde, istekNo });
      if (s.ok || istekTekrarMi(s.hata) || s.hata === "fiyat_degisti") await onYenile();
      return s;
    });
    if (!r) return;
    if (r.ok) {
      hap("success");
      if (bas === oturumRef.current) { setHata(null); setSonuc({ adet: r.deger.satis.adet, mal: r.deger.satis.mal, tutar: r.deger.satis.tutar, vergi: r.deger.satis.vergi }); }
    } else if (istekTekrarMi(r.hata)) {
      if (bas === oturumRef.current) setHata(t("onl.h.istekTekrar"));
    } else if (r.hata === "fiyat_degisti") {
      hap("warning");
      if (bas === oturumRef.current) setHata(null);
    } else if (bas === oturumRef.current) { hap("error"); setHata(tezgahHataMetni(t, r)); }
  };
  const onayla = () => { if (!satir) return; const f = satir.fiyat; setGorulen(f); void al(f); };
  const baslik = satir ? `${malAdi(t, satir.mal)} · ${kaliteAdi(t, satir.kalite)}` : t("onl.tz.malBitti");

  return <AltPanel acik={acik} onKapat={onKapat} etiket={baslik} rtl={rtl} t={t}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingEnd: 36 }}>
      <Madalyon icon={satir ? malIkonu(satir.mal) : "scales"} size={42} aktif={!!satir} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text accessibilityRole="header" numberOfLines={2} style={{ fontFamily: F.display, fontSize: 17, color: C.parchment, textAlign: hiza(rtl) }}>{baslik}</Text>
        <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchmentDim, textAlign: hiza(rtl) }}>{g.ad || t("onl.mk.tur.dukkan")}</Text>
      </View>
    </View>
    {sonuc ? <>
      <Sonuc hata={null} bilgi={applyParams(t("onl.tz.alindi"), [sonuc.adet, malAdi(t, sonuc.mal), sonuc.tutar])} rtl={rtl} />
      {sonuc.vergi.tutar > 0 ? <Not metin={applyParams(t("onl.tz.vergiNot"), [yuzdeL(sonuc.vergi.oran, lang), sonuc.vergi.tutar])} rtl={rtl} /> : null}
      <AltinDugme etiket={t("onl.tz.tamam")} icon="medal" rtl={rtl} onPress={onKapat} />
    </> : <>
      {satir ? <>
        <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
          <KaliteRozeti kademe={satir.kalite} />
          <Rozet icon="scales" metin={applyParams(t("onl.tz.raftaKalan"), [satir.adet])} />
        </View>
        {satir.yapan ? <Not metin={applyParams(t("onl.eko.yapan"), [satir.yapan])} rtl={rtl} icon="anvil" renk={C.gold} /> : null}
        <Satir etiket={t("onl.tz.birim")} deger={ak(t, satir.fiyat)} renk={C.goldBright} rtl={rtl} />
        {enCok > 0 ? <AdetSecici etiket={t("onl.tz.adet")} deger={n} cok={alinir} onDegis={(x) => { setAdet(x); setHata(null); }} rtl={rtl} t={t} /> : null}
        <View style={{ flexDirection: yon(rtl), justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentDim }}>{applyParams(t("onl.tz.toplam"), [n, satir.fiyat])}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 17, color: C.goldBright }}>{ak(t, toplam)}</Text>
        </View>
      </> : null}
      {degisti && satir ? <View accessibilityRole="alert" style={{ padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(214,120,72,0.6)", backgroundColor: "rgba(120,52,24,0.3)" }}>
        <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchment, textAlign: hiza(rtl) }}>{applyParams(t("onl.tz.fiyatDegisti"), [degisti.eski, satir.fiyat])}</Text>
      </View> : null}
      <Sonuc hata={hata} bilgi={null} rtl={rtl} />
      {neden ? <Not metin={neden} rtl={rtl} /> : null}
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
        <Hap icon="coins" metin={String(para)} erisim={applyParams(t("onl.ya.paraErisim"), [para])} />
        <View style={{ flex: 1 }}>
          <AltinDugme etiket={degisti && satir ? applyParams(t("onl.tz.yeniFiyatlaAl"), [toplam]) : applyParams(t("onl.tz.satinAl"), [toplam])} icon="coins" rtl={rtl}
            kapali={!!neden} bekliyor={yaz.bekliyor} erisim={[degisti && satir ? applyParams(t("onl.tz.yeniFiyatlaAl"), [toplam]) : applyParams(t("onl.tz.satinAl"), [toplam]), neden].filter(Boolean).join(". ")}
            onPress={() => { if (degisti) onayla(); else void al(); }} />
        </View>
      </View>
      <Not metin={t("onl.tz.hediyeNot")} rtl={rtl} />
    </>}
  </AltPanel>;
}

// ---------------------------------------------------------------- devralma

export function DevralCekmecesi({ acik, oturum, isletme, ad, kepenkAy, devralmaAy, edinimFiyat, ist, onKapat, onBitti, rtl, t }: {
  acik: boolean; oturum: number; isletme: string; ad: string; kepenkAy: number | null; devralmaAy: number | null; edinimFiyat: number | null; ist: TezgahIstemci;
  onKapat: () => void; onBitti: (iadeBedel: number) => Promise<void> | void; rtl: boolean; t: Ceviri;
}) {
  const yaz = useTekIstek();
  const [adim, setAdim] = useState<0 | 1>(0);
  const [hata, setHata] = useState<string | null>(null);
  const oturumRef = useRef(oturum);
  oturumRef.current = oturum;
  useEffect(() => { if (acik) { setAdim(0); setHata(null); } }, [acik, oturum]);
  const devral = async () => {
    const bas = oturumRef.current;
    const r = await yaz.calistir("devral:" + isletme, (istekNo) => ist.devral(isletme, { istekNo }));
    if (!r) return;
    if (r.ok) { hap("success"); await onBitti(r.deger.devralma.iade.bedel); }
    else if (istekTekrarMi(r.hata)) await onBitti(0);
    else if (bas === oturumRef.current) { hap("error"); setHata(tezgahHataMetni(t, r)); setAdim(0); }
  };
  const baslik = applyParams(t("onl.tz.dv.baslik"), [ad || t("onl.mk.tur.dukkan")]);
  return <AltPanel acik={acik} onKapat={onKapat} etiket={baslik} rtl={rtl} t={t}>
    <Text accessibilityRole="header" numberOfLines={2} style={{ fontFamily: F.display, fontSize: 17, color: C.parchment, textAlign: hiza(rtl), paddingEnd: 36 }}>{baslik}</Text>
    <Not metin={devralmaAy ? applyParams(t("onl.tz.dv.kosul"), [devralmaAy]) : t("onl.tz.dv.kosulGenel")} rtl={rtl} icon="hourglass" renk={C.parchmentDim} />
    {kepenkAy !== null ? <Satir etiket={t("onl.tz.dv.sessiz")} deger={applyParams(t("onl.tz.dv.ayN"), [kepenkAy])} rtl={rtl} /> : null}
    <Not metin={t("onl.tz.dv.iade")} rtl={rtl} icon="scales" renk={C.sage} />
    <Satir etiket={t("onl.tz.dv.bedel")} deger={edinimFiyat !== null ? ak(t, edinimFiyat) : t("onl.tz.dv.bedelMulk")} renk={C.goldBright} rtl={rtl} />
    <Not metin={t("onl.tz.dv.sifir")} rtl={rtl} />
    <Sonuc hata={hata} bilgi={null} rtl={rtl} />
    {adim === 0 ? <AltinDugme etiket={t("onl.tz.dv.iste")} icon="crown" rtl={rtl} onPress={() => setAdim(1)} />
      : <Animated.View entering={belir()} style={{ gap: 10 }}>
        <Text accessibilityRole="alert" style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.tz.dv.emin")}</Text>
        <AltinDugme etiket={edinimFiyat !== null ? applyParams(t("onl.tz.dv.onayBedel"), [edinimFiyat]) : t("onl.tz.dv.onay")} icon="crown" rtl={rtl} bekliyor={yaz.bekliyor} onPress={() => { void devral(); }} />
        <CizgiDugme etiket={t("onl.tz.dv.vazgec")} rtl={rtl} kucuk kapali={yaz.bekliyor} onPress={() => setAdim(0)} />
      </Animated.View>}
  </AltPanel>;
}

// ---------------------------------------------------------------- han yolcu payı

/** Yolcu payı kısa satırı; görünen metin ve erişilebilirlik etiketi aynı biçimlendiriciden gelir. */
export const yolcuPayiMetni = (t: Ceviri, y: YolcuKarti, lang: Parameters<typeof yuzdeL>[1]) =>
  `${t("onl.tz.yp.baslik")}: ${applyParams(t("onl.tz.yp.ozet"), [yuzdeL(y.payYuzde, lang), y.tutar])}`;

/** Han sahibine/çalışanına son ayın yolcu payı dökümü. `kisa`: han kartındaki tek satır. */
export function YolcuPayiDokumu({ y, t, rtl, kisa = false }: { y: YolcuKarti; t: Ceviri; rtl: boolean; kisa?: boolean }) {
  const { lang } = useI18n();
  const ozet = applyParams(t("onl.tz.yp.ozet"), [yuzdeL(y.payYuzde, lang), y.tutar]);
  if (kisa) return <View accessible accessibilityLabel={yolcuPayiMetni(t, y, lang)} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 6 }}>
    <GameIcon name="camel" size={13} color={C.sage} />
    <Text numberOfLines={2} style={{ flex: 1, fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: C.sage, textAlign: hiza(rtl) }}>{yolcuPayiMetni(t, y, lang)}</Text>
  </View>;
  const c = y.carpan;
  return <Cerceve ic={{ padding: 12, gap: 6 }}>
    <AltBaslik metin={applyParams(t("onl.tz.yp.baslikAy"), [y.ay])} rtl={rtl} />
    <Satir etiket={t("onl.tz.yp.pay")} deger={yuzdeL(y.payYuzde, lang)} rtl={rtl} />
    <Satir etiket={t("onl.tz.yp.tutar")} deger={ak(t, y.tutar)} renk={C.sage} rtl={rtl} />
    <Satir etiket={t("onl.tz.yp.tavan")} deger={ak(t, y.tavan)} rtl={rtl} />
    <Text style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 17, color: C.parchmentDim, textAlign: hiza(rtl) }}>
      {applyParams(t("onl.tz.yp.carpanlar"), [ondalik(c.F, lang), ondalik(c.K, lang), ondalik(c.R, lang), ondalik(c.H, lang)])}
    </Text>
    <Not metin={y.tutar >= y.tavan ? t("onl.tz.yp.tavanda") : t("onl.tz.yp.not")} rtl={rtl} />
  </Cerceve>;
}

