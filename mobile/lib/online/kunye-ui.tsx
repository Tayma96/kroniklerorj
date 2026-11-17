// Künye parçaları: kendi numaran (kopyala/paylaş), oyuncu araması (numara ya da ad; gecikmeli istek, eski yanıtı atan sıra
// sayacı, imleçle "daha fazla"), kaba çevrimiçi durum noktası ve yerel profilden künyeye geçiş. Metinler onl.kn.* (online20.ts).
import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Share, Platform, Clipboard, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../i18n";
import { C, F } from "../theme";
import { GameIcon } from "../icons";
import { DesignPressable as Pressable } from "../design-pressable";
import { hap } from "../haptics";
import { BASMA_OLCEK, Bant, Cerceve, CizgiDugme, Madalyon, ONL, belir, hiza, yon } from "./ui";
import { KisiYuzu, SatirOku } from "./yasam-ui";
import { useOnline } from "./durum";
import {
  aramaNiyeti, kunyeBekletir, kunyeHataAnahtari, kunyeYolu, numaraBicim, numaraSesli, numaraTemizle, useKunyeIstemci,
  type CevrimiciDurum, type KunyeHata, type KunyeKarti,
} from "./kunye-veri";

type Ceviri = (k: string) => string;

/** Panoya yazar: web'de navigator.clipboard, yerelde çekirdek pano; olmazsa false. */
async function panoyaYaz(metin: string): Promise<boolean> {
  try {
    const nav = (globalThis as { navigator?: { clipboard?: { writeText?: (s: string) => Promise<void> } } }).navigator;
    if (Platform.OS === "web") {
      if (nav?.clipboard?.writeText) { await nav.clipboard.writeText(metin); return true; }
      return false;
    }
    Clipboard.setString(metin);
    return true;
  } catch {
    return false;
  }
}

/** Numarayı kopyala; pano yoksa sistem paylaşım sayfasına düşer (orada da "kopyala" vardır). */
export async function numaraKopyala(numara: string): Promise<boolean> {
  if (await panoyaYaz(numara)) return true;
  try { await Share.share({ message: numara }); } catch { /* vazgeçildi */ }
  return false;
}

export const DURUM_RENK: Record<CevrimiciDurum, string> = { simdi: C.sage, bugun: C.gold, uzak: C.parchmentMuted };

export function DurumNoktasi({ durum, t, rtl }: { durum: CevrimiciDurum; t: Ceviri; rtl: boolean }) {
  const renk = DURUM_RENK[durum];
  return <View accessible accessibilityLabel={t("onl.kn.d." + durum)} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 7 }}>
    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: durum === "uzak" ? "transparent" : renk, borderWidth: 1.5, borderColor: renk }} />
    <Text style={{ flexShrink: 1, fontFamily: F.serifItalic, fontSize: 14, color: durum === "uzak" ? C.parchmentMuted : C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.kn.d." + durum)}</Text>
  </View>;
}

/** Kendi numaran uygulama açıkken hesap başına bir kez çekilir (bellek önbelleği; numara hesaba bağlıdır, değişmez). */
const numaramOnbellek = new Map<string, string>();

/** Kendi oyuncu numaran: 1234 5678, kopyala, paylaş; isteğe bağlı künyene bağlantı. `numara` verilirse istek atılmaz. */
export function NumaraKarti({ kunyeLink = false, numara: verilen }: { kunyeLink?: boolean; numara?: string }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const istemci = useKunyeIstemci();
  const o = useOnline();
  const anahtar = `${o.oturum?.tur ?? ""}:${o.profil?.hesapId ?? ""}`;
  const onbellek = {
    al: () => (o.profil?.hesapId ? numaramOnbellek.get(anahtar) : undefined),
    koy: (n: string) => { if (o.profil?.hesapId) numaramOnbellek.set(anahtar, n); },
  };
  const [cekilen, setNumara] = useState<string | null>(() => onbellek.al() ?? null);
  const numara = verilen ?? cekilen;
  const [hata, setHata] = useState<KunyeHata | null>(null);
  const [kopyalandi, setKopyalandi] = useState(false);
  const canli = useRef(true);
  useEffect(() => () => { canli.current = false; }, []);
  const yukle = async () => {
    setHata(null);
    const r = await istemci.numaram();
    if (!canli.current) return;
    if (r.ok) { onbellek.koy(r.deger); setNumara(r.deger); } else setHata(r.hata);
  };
  useEffect(() => {
    if (verilen) { onbellek.koy(verilen); return; }
    const b = onbellek.al();
    if (b) { setNumara(b); return; }
    void yukle();
  }, [istemci, verilen, anahtar]); // eslint-disable-line react-hooks/exhaustive-deps

  if (hata) return <Bant metin={t(kunyeHataAnahtari(hata))} rtl={rtl} eylem={kunyeBekletir(hata) ? undefined : t("onl.yenidenDene")} onEylem={() => { void yukle(); }} />;
  const bicimli = numara ? numaraBicim(numara) : "";
  return <Cerceve ic={{ padding: 14, gap: 12 }}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 12 }}>
      <Madalyon icon="scroll-open" size={44} aktif />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 1.4, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.kn.numaran")}</Text>
        {numara ? <Animated.View entering={belir()}>
          <Text selectable accessibilityLabel={applyParams(t("onl.kn.numaranErisim"), [numaraSesli(numara)])}
            style={{ fontFamily: F.display, fontSize: 24, lineHeight: 30, letterSpacing: rtl ? 0 : 2, color: C.parchment, textAlign: hiza(rtl) }}>{bicimli}</Text>
        </Animated.View> : <View accessibilityRole="progressbar" accessibilityLabel={t("onl.kn.numaraYukleniyor")} style={{ height: 30, justifyContent: "center", alignItems: rtl ? "flex-end" : "flex-start" }}>
          <ActivityIndicator color={C.goldBright} />
        </View>}
      </View>
    </View>
    <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.kn.numaranAlt")}</Text>
    <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 8 }}>
      <View style={{ flexGrow: 1, flexBasis: 120 }}>
        <CizgiDugme kucuk icon="scroll" rtl={rtl} kapali={!numara} etiket={t(kopyalandi ? "onl.kn.kopyalandi" : "onl.kn.kopyala")}
          onPress={() => { if (!numara) return; void numaraKopyala(numara).then((ok) => { if (ok) { hap("success"); setKopyalandi(true); } }); }} />
      </View>
      <View style={{ flexGrow: 1, flexBasis: 120 }}>
        <CizgiDugme kucuk icon="banner" rtl={rtl} kapali={!numara} etiket={t("onl.kn.paylas")}
          onPress={() => { if (!numara) return; setKopyalandi(false); Share.share({ message: applyParams(t("onl.kn.paylasMetin"), [bicimli]) }).catch(() => {}); }} />
      </View>
    </View>
    {kopyalandi ? <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.serifItalic, fontSize: 13.5, color: C.sage, textAlign: hiza(rtl) }}>{t("onl.kn.kopyalandiAlt")}</Text> : null}
    {kunyeLink && numara ? <Pressable accessibilityRole="link" accessibilityLabel={t("onl.kn.kunyemeBak")} onPress={() => { hap("tap"); router.push(kunyeYolu(numara)); }}
      style={({ pressed }) => ({ minHeight: 44, flexDirection: yon(rtl), alignItems: "center", gap: 8, transform: [{ scale: pressed ? BASMA_OLCEK : 1 }] })}>
      <Text style={{ flex: 1, fontFamily: F.display, fontSize: 13, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.kn.kunyemeBak")}</Text>
      <SatirOku rtl={rtl} />
    </Pressable> : null}
  </Cerceve>;
}

function SonucSatiri({ k, i, rtl, t, onPress }: { k: KunyeKarti; i: number; rtl: boolean; t: Ceviri; onPress: () => void }) {
  const yer = `${k.yerlesim.ad} · ${k.beylik.ad}`;
  return <Pressable accessibilityRole="link" accessibilityLabel={applyParams(t("onl.kn.sonucErisim"), [k.ad, yer, numaraSesli(k.numara)])} onPress={() => { hap("tap"); onPress(); }}
    style={({ pressed }) => ({ minHeight: 56, flexDirection: yon(rtl), alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderColor: "rgba(201,162,78,0.14)", backgroundColor: pressed ? "rgba(201,162,78,0.08)" : "transparent" })}>
    <KisiYuzu id={"n" + k.numara} ad={k.ad} boyut={40} oyuncu />
    <View style={{ flex: 1, gap: 2 }}>
      <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 15, color: C.parchment, textAlign: hiza(rtl) }}>{k.ad}</Text>
      <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>{yer}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 1, color: C.gold, textAlign: hiza(rtl) }}>{numaraBicim(k.numara)}</Text>
    </View>
    <SatirOku rtl={rtl} />
  </Pressable>;
}

type AramaDurumu =
  | { tur: "bekle" }
  | { tur: "yukleniyor" }
  | { tur: "sonuc"; liste: KunyeKarti[]; imlec: string | null; numaraIle: boolean; ad: string }
  | { tur: "hata"; kod: KunyeHata };

/** Ad aramasında yazarken bekleme süresi; numara 8 haneye ulaşınca hemen sorulur. */
const AD_GECIKME_MS = 400;
const NUMARA_GECIKME_MS = 120;

/** Oyuncu araması: yalnız rakamsa numara (8 hane), harfse ad öneki (3 harf). Sunucu sınırlıdır; otomatik yeniden deneme yok. */
export function OyuncuArama() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const istemci = useKunyeIstemci();
  const [metin, setMetin] = useState("");
  const [durum, setDurum] = useState<AramaDurumu>({ tur: "bekle" });
  const [daha, setDaha] = useState<{ yukleniyor: boolean; hata: KunyeHata | null }>({ yukleniyor: false, hata: null });
  const [tekrar, setTekrar] = useState(0);
  const sira = useRef(0);
  const niyet = aramaNiyeti(metin);

  useEffect(() => {
    const benim = ++sira.current;
    setDaha({ yukleniyor: false, hata: null });
    if (niyet.tur !== "numara" && niyet.tur !== "ad") { setDurum({ tur: "bekle" }); return; }
    setDurum({ tur: "yukleniyor" });
    const zaman = setTimeout(async () => {
      const r = niyet.tur === "numara" ? await istemci.numaraAra(niyet.no) : await istemci.adAra(niyet.ad, null);
      if (benim !== sira.current) return; // eski yanıt: kullanıcı yazmaya devam etti
      if (r.ok) setDurum({ tur: "sonuc", liste: r.deger.sonuclar, imlec: r.deger.imlec, numaraIle: niyet.tur === "numara", ad: niyet.tur === "ad" ? niyet.ad : "" });
      else { hap("error"); setDurum({ tur: "hata", kod: r.hata }); }
    }, niyet.tur === "numara" ? NUMARA_GECIKME_MS : AD_GECIKME_MS);
    return () => clearTimeout(zaman);
  }, [niyet.tur === "numara" ? "n:" + niyet.no : niyet.tur === "ad" ? "a:" + niyet.ad.toLocaleLowerCase("tr") : niyet.tur, istemci, tekrar]); // eslint-disable-line react-hooks/exhaustive-deps

  const dahaGetir = async () => {
    if (durum.tur !== "sonuc" || !durum.imlec || daha.yukleniyor) return;
    const benim = sira.current;
    setDaha({ yukleniyor: true, hata: null });
    const r = await istemci.adAra(durum.ad, durum.imlec);
    if (benim !== sira.current) return;
    if (r.ok) {
      setDurum((d) => (d.tur === "sonuc" ? { ...d, liste: [...d.liste, ...r.deger.sonuclar.filter((x) => !d.liste.some((y) => y.numara === x.numara))], imlec: r.deger.imlec } : d));
      setDaha({ yukleniyor: false, hata: null });
    } else { hap("error"); setDaha({ yukleniyor: false, hata: r.hata }); }
  };

  const ipucu = niyet.tur === "bos" ? t("onl.kn.ara.ipucu")
    : niyet.tur === "numaraEksik" ? applyParams(t("onl.kn.ara.eksik"), [niyet.rakam])
    : niyet.tur === "numaraGecersiz" ? t("onl.kn.h.numara")
    : niyet.tur === "adKisa" ? applyParams(t("onl.kn.ara.kisa"), [3 - niyet.harf])
    : null;

  return <View style={{ gap: 10 }}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, minHeight: 50, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: metin ? C.goldBright : ONL.frame, backgroundColor: "rgba(14,10,6,0.78)" }}>
      <GameIcon name="compass" size={18} color={metin ? C.goldBright : C.gold} />
      <TextInput value={metin} onChangeText={(s) => setMetin(s.slice(0, 40))} placeholder={t("onl.kn.ara.yer")} placeholderTextColor={C.parchmentMuted}
        accessibilityLabel={t("onl.kn.ara.etiket")} accessibilityHint={t("onl.kn.ara.ipucu")} autoCorrect={false} autoCapitalize="words" returnKeyType="search" maxLength={40}
        style={{ flex: 1, minHeight: 48, fontFamily: F.serif, fontSize: 16.5, color: C.parchment, textAlign: hiza(rtl) }} />
      {metin ? <Pressable accessibilityRole="button" accessibilityLabel={t("onl.kn.ara.temizle")} onPress={() => { hap("tap"); setMetin(""); }}
        style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: F.display, fontSize: 20, lineHeight: 22, color: C.parchmentMuted }}>×</Text>
      </Pressable> : null}
    </View>

    {ipucu ? <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: niyet.tur === "numaraGecersiz" ? C.emberSoft : C.parchmentMuted, textAlign: hiza(rtl), paddingHorizontal: 4 }}>{ipucu}</Text> : null}

    {durum.tur === "yukleniyor" ? <View accessibilityRole="progressbar" accessibilityLabel={t("onl.kn.ara.yukleniyor")} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingHorizontal: 4, minHeight: 44 }}>
      <ActivityIndicator color={C.goldBright} />
      <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, color: C.parchmentDim }}>{t("onl.kn.ara.yukleniyor")}</Text>
    </View> : null}

    {durum.tur === "hata" ? <Bant tur={kunyeBekletir(durum.kod) ? "bilgi" : "hata"} metin={t(kunyeHataAnahtari(durum.kod))} rtl={rtl}
      eylem={kunyeBekletir(durum.kod) ? undefined : t("onl.yenidenDene")} onEylem={() => setTekrar((n) => n + 1)} /> : null}

    {durum.tur === "sonuc" ? <Animated.View entering={belir()} style={{ gap: 8 }}>
      {durum.liste.length ? <Cerceve ic={{ paddingVertical: 2 }}>
        {durum.liste.map((k, i) => <SonucSatiri key={k.numara} k={k} i={i} rtl={rtl} t={t} onPress={() => router.push(kunyeYolu(k.numara))} />)}
      </Cerceve> : <View accessibilityLiveRegion="polite" style={{ flexDirection: yon(rtl), alignItems: "center", gap: 12, padding: 14, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(201,162,78,0.35)", backgroundColor: "rgba(14,10,6,0.55)" }}>
        <GameIcon name="compass" size={20} color={C.parchmentMuted} />
        <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 15, lineHeight: 21, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t(durum.numaraIle ? "onl.kn.ara.bosNumara" : "onl.kn.ara.bosAd")}</Text>
      </View>}
      {daha.hata ? <Bant tur={kunyeBekletir(daha.hata) ? "bilgi" : "hata"} metin={t(kunyeHataAnahtari(daha.hata))} rtl={rtl}
        eylem={kunyeBekletir(daha.hata) ? undefined : t("onl.yenidenDene")} onEylem={() => { void dahaGetir(); }} /> : null}
      {durum.imlec && !daha.hata ? <CizgiDugme kucuk rtl={rtl} kapali={daha.yukleniyor} etiket={t(daha.yukleniyor ? "onl.kn.ara.dahaYukleniyor" : "onl.kn.ara.daha")} onPress={() => { void dahaGetir(); }} /> : null}
    </Animated.View> : null}
  </View>;
}

/**
 * Yerel profilden künyeye: sunucu `numara` verdiyse doğrudan gider; yoksa aynı yerleşimde aynı adı taşıyan tek kişiyi ad
 * aramasıyla bulur (oyuncu dokununca, bir kez). Ad aramanın alt sınırına (3 harf) yetmiyorsa bağlantı gizlenir.
 */
export function KunyeyeGecis({ ad, yerlesim, numara }: { ad: string; yerlesim: string; numara?: string }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const istemci = useKunyeIstemci();
  const [bekliyor, setBekliyor] = useState(false);
  const [not, setNot] = useState<string | null>(null);
  const canli = useRef(true);
  useEffect(() => () => { canli.current = false; }, []);
  const dogrudan = numara ? numaraTemizle(numara) : null;
  if (!dogrudan && [...ad.trim()].filter((c) => /\p{L}/u.test(c)).length < 3) return null;
  const bul = async () => {
    if (dogrudan) { hap("tap"); router.push(kunyeYolu(dogrudan)); return; }
    if (bekliyor) return;
    setBekliyor(true);
    setNot(null);
    const anahtar = ad.trim().toLocaleLowerCase("tr");
    const r = await istemci.adAra(ad.trim(), null);
    if (!canli.current) return;
    setBekliyor(false);
    if (!r.ok) { setNot(t(kunyeHataAnahtari(r.hata))); return; }
    const eslesen = r.deger.sonuclar.filter((k) => k.yerlesim.id === yerlesim && k.ad.trim().toLocaleLowerCase("tr") === anahtar);
    if (eslesen.length === 1) { hap("tap"); router.push(kunyeYolu(eslesen[0]!.numara)); }
    else setNot(t("onl.kn.gecisYok"));
  };
  return <View style={{ gap: 6 }}>
    <Pressable accessibilityRole="link" accessibilityLabel={t("onl.kn.kunyesi")} accessibilityState={{ busy: bekliyor }} onPress={() => { void bul(); }}
      style={({ pressed }) => ({ minHeight: 44, flexDirection: yon(rtl), alignItems: "center", gap: 8, transform: [{ scale: pressed ? BASMA_OLCEK : 1 }] })}>
      {bekliyor ? <ActivityIndicator color={C.goldBright} /> : <GameIcon name="scroll-open" size={15} color={C.goldBright} />}
      <Text style={{ flex: 1, fontFamily: F.display, fontSize: 13, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.kn.kunyesi")}</Text>
      <SatirOku rtl={rtl} />
    </Pressable>
    {not ? <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{not}</Text> : null}
  </View>;
}
