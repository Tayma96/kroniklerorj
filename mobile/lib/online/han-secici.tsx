// 4.9 Çoklu han seçici: yerleşimdeki hanların kartları (sahip, seviye, fiyat düzeyi, oda doluluğu, canlılık, müdavim
// rozetim, kapı durumu). Tek han varsa (köy, eski sunucu) hiç çizilmez. Bütün sayılar GET /v1/han `hanlar`dan gelir;
// istemci yalnız sıralar ve sözle anlatır. Seçim değişince ekran o hana bağlı yeni istemci alır (han-veri.ts).
import { useEffect, useRef } from "react";
import { View, Text, ScrollView, useWindowDimensions } from "react-native";
import Animated from "react-native-reanimated";
import { applyParams, useI18n, yuzdeL } from "../i18n";
import { C, F } from "../theme";
import { GameIcon } from "../icons";
import { hap } from "../haptics";
import { DesignPressable as Pressable } from "../design-pressable";
import { isReduceMotion } from "../perf";
import { BASMA_OLCEK, Cerceve, Madalyon, ONL, belir, hiza, yon } from "./ui";
import { Rozet } from "./yasam-ui";
import type { HanKarti } from "./han-veri";
import { YolcuPayiDokumu, yolcuPayiMetni } from "./tezgah-ui";

type Ceviri = (k: string) => string;
const SEVIYE = ["mutevazi", "gelisen", "taninmis", "prestijli", "simge"];

/** Kartın görünen adı: işletme adı; yoksa NPC hanında tür adı, oyuncu hanında "tür adı, N. yuva". */
export function hanKartAdi(k: HanKarti, turAdi: string, t: Ceviri): string {
  if (k.ad.trim()) return k.ad.trim();
  return k.sahip === "npc" ? turAdi : applyParams(t("onl.hs.adsiz"), [turAdi, k.no]);
}

/** Fiyat düzeyi sözle (fc %): 90 altı ucuz, 110 üstü pahalı, arası olağan. */
export function fiyatSozu(fc: number, t: Ceviri): string {
  const duzey = fc < 90 ? "ucuz" : fc > 110 ? "pahali" : "olagan";
  return applyParams(t("onl.hs.fiyat." + duzey), [fc]);
}

/** Sıralama: müdavimi olduğum → en çok oturan → numara. */
export function hanSirala(l: HanKarti[]): HanKarti[] {
  return [...l].sort((a, b) => Number(!!b.mudavim) - Number(!!a.mudavim) || (b.masa?.oturan ?? 0) - (a.masa?.oturan ?? 0) || a.no - b.no);
}

/** "Şu an kalabalık" işareti: en çok oturanı olan tek han (berabere ya da boşsa yok). */
export function kalabalikHan(l: HanKarti[]): number | null {
  const s = [...l].sort((a, b) => (b.masa?.oturan ?? 0) - (a.masa?.oturan ?? 0));
  const bir = s[0]?.masa?.oturan ?? 0;
  const iki = s[1]?.masa?.oturan ?? 0;
  return bir > 0 && bir > iki ? s[0]!.no : null;
}

const SEVIYE_ADI = (k: HanKarti, t: Ceviri) => t("onl.isl.sv." + (SEVIYE[k.seviye] ?? "mutevazi"));

/** Ekran okuyucu için kartın tam özeti. */
export function hanKartErisim(k: HanKarti, turAdi: string, t: Ceviri, kalabalik: boolean, lang: Parameters<typeof yuzdeL>[1]): string {
  return [
    hanKartAdi(k, turAdi, t),
    k.sahip === "npc" ? t("onl.hs.npc") : applyParams(t("onl.isl.sahibi"), [k.sahipKisi?.ad || t("onl.hs.sahipBilinmez")]),
    k.sahip === "oyuncu" ? SEVIYE_ADI(k, t) : null,
    fiyatSozu(k.fc, t),
    k.oda ? applyParams(t("onl.hs.oda"), [k.oda.dolu, k.oda.kapasite]) : null,
    k.masa ? applyParams(t("onl.hs.canli"), [k.masa.oturan, k.masa.acik]) : null,
    kalabalik ? t("onl.hs.kalabalik") : null,
    k.mudavim ? applyParams(t("onl.hs.mudavimin"), [t("onl.topluluk.rozet." + k.mudavim)]) : null,
    !k.acik ? t("onl.hs.kapali") : null,
    k.yolcu ? yolcuPayiMetni(t, k.yolcu, lang) : null,
  ].filter(Boolean).join(". ");
}

function HanKartiGorunumu({ k, turAdi, secili, kalabalik, genislik, rtl, t, onSec, onSahip, onYerles }: {
  k: HanKarti; turAdi: string; secili: boolean; kalabalik: boolean; genislik: number; rtl: boolean; t: Ceviri;
  onSec: () => void; onSahip?: (id: string) => void; onYerles?: (x: number) => void;
}) {
  const { lang } = useI18n();
  const sahipId = k.sahip === "oyuncu" ? k.sahipKisi?.id : undefined;
  const sahipAd = k.sahipKisi?.ad || t("onl.hs.sahipBilinmez");
  const dolu = !!k.oda && k.oda.kapasite > 0 && k.oda.dolu >= k.oda.kapasite;
  const baglanti = !!(sahipId && onSahip);
  return <View style={{ width: genislik }} onLayout={(e) => onYerles?.(e.nativeEvent.layout.x)}>
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: secili }} accessibilityLabel={hanKartErisim(k, turAdi, t, kalabalik, lang)}
    accessibilityHint={secili ? undefined : t("onl.hs.secIpucu")}
    onPress={() => { if (secili) return; hap("selection"); onSec(); }}
    style={({ pressed }) => ({ width: "100%", transform: [{ scale: pressed && !secili ? BASMA_OLCEK : 1 }] })}>
    <Cerceve aktif={secili} ic={{ padding: 12, gap: 8, minHeight: 168, opacity: k.acik ? 1 : 0.78 }}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
        <Madalyon icon={k.sahip === "npc" ? "banner" : "beer"} size={36} aktif={secili} />
        <Text numberOfLines={2} style={{ flex: 1, fontFamily: F.display, fontSize: 15, lineHeight: 19, color: secili ? C.parchment : C.parchmentDim, textAlign: hiza(rtl) }}>{hanKartAdi(k, turAdi, t)}</Text>
        {secili ? <GameIcon name="medal" size={16} color={C.goldBright} /> : null}
      </View>
      {!baglanti ? <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 6, minHeight: 44 }}>
        <GameIcon name={k.sahip === "npc" ? "banner" : "crown"} size={13} color={C.gold} />
        <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.serif, fontSize: 14, color: C.parchmentDim, textAlign: hiza(rtl) }}>{k.sahip === "npc" ? t("onl.hs.npc") : applyParams(t("onl.isl.sahibi"), [sahipAd])}</Text>
      </View> : null}
      <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
        {k.sahip === "oyuncu" ? <Rozet icon="trophy" metin={SEVIYE_ADI(k, t)} /> : null}
        <Rozet icon="coins" metin={fiyatSozu(k.fc, t)} renk={k.fc < 90 ? C.sage : k.fc > 110 ? C.ember : C.gold} />
        {k.oda ? <Rozet icon="camel" metin={applyParams(t(dolu ? "onl.hs.odaDolu" : "onl.hs.oda"), [k.oda.dolu, k.oda.kapasite])} renk={dolu ? C.ember : C.gold} /> : null}
        {k.mudavim ? <Rozet icon="medal" metin={t("onl.topluluk.rozet." + k.mudavim)} renk={C.sage} dolu /> : null}
        {kalabalik ? <Rozet icon="flame" metin={t("onl.hs.kalabalik")} renk={C.goldBright} dolu /> : null}
        {!k.acik ? <Rozet icon="shield" metin={t("onl.hs.kapali")} renk={C.parchmentMuted} /> : null}
      </View>
      {k.masa ? <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 6 }}>
        <GameIcon name="family" size={13} color={k.masa.oturan ? C.goldBright : C.parchmentMuted} />
        <Text numberOfLines={2} style={{ flex: 1, fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>
          {k.masa.oturan ? applyParams(t("onl.hs.canli"), [k.masa.oturan, k.masa.acik]) : applyParams(t("onl.hs.sakin"), [k.masa.acik])}
        </Text>
      </View> : null}
      {k.yolcu ? <YolcuPayiDokumu y={k.yolcu} t={t} rtl={rtl} kisa /> : null}
    </Cerceve>
    </Pressable>
    {baglanti ? <Pressable accessibilityRole="link" accessibilityLabel={applyParams(t("onl.hs.sahipGit"), [sahipAd])}
      onPress={() => { hap("tap"); onSahip!(sahipId!); }}
      style={({ pressed }) => ({ flexDirection: yon(rtl), alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderTopWidth: 0, borderColor: secili ? ONL.frameHi : ONL.frame, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: "rgba(14,10,6,0.6)", opacity: pressed ? 0.7 : 1 })}>
      <GameIcon name="crown" size={13} color={C.gold} />
      <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.serif, fontSize: 14, color: C.goldBright, textDecorationLine: "underline", textAlign: hiza(rtl) }}>{applyParams(t("onl.isl.sahibi"), [sahipAd])}</Text>
    </Pressable> : null}
  </View>;
}

/** Yatay kaydırılan han kartları. Tek han varsa null (ekran bugünkü gibi). */
export function HanSecici({ hanlar, sira, secili, turAdi, rtl, t, onSec, onSahip }: {
  hanlar: HanKarti[]; /** Kart sırası (han numaraları); verilirse yeniden sıralanmaz, listede olmayanlar sona eklenir. */ sira?: number[]; secili: number; turAdi: string; rtl: boolean; t: Ceviri; onSec: (no: number) => void; onSahip?: (id: string) => void;
}) {
  const w = useWindowDimensions().width;
  const kaydir = useRef<ScrollView>(null);
  const kartX = useRef(new Map<number, number>());
  const kaydirilan = useRef<number | null>(null);
  const ilkOlcum = useRef(true);
  // Seçili kartı görünür alana getirir (ekranın ortasına); animasyon hareket azaltılınca kapalı.
  const goster = (no: number, genislik: number, animasyon: boolean) => {
    const x = kartX.current.get(no);
    if (x === undefined || kaydirilan.current === no) return;
    kaydirilan.current = no;
    kaydir.current?.scrollTo({ x: Math.max(0, x - (w - genislik) / 2), animated: animasyon && !isReduceMotion() });
  };
  const genislik = Math.round(Math.min(280, Math.max(208, (w - 32) * 0.8)));
  useEffect(() => { goster(secili, genislik, true); }, [secili]); // eslint-disable-line react-hooks/exhaustive-deps
  if (hanlar.length < 2) return null;
  const sirali = sira ? [...hanlar].sort((x, y) => { const i = sira.indexOf(x.no), j = sira.indexOf(y.no); return (i < 0 ? 1e9 : i) - (j < 0 ? 1e9 : j) || x.no - y.no; }) : hanSirala(hanlar);
  const kalabalik = kalabalikHan(hanlar);
  // Bir sonraki kart kenardan görünür (kaydırılabildiği anlaşılır); 320 px'te ~228, geniş ekranda en çok 280.
  return <Animated.View entering={belir()} style={{ marginTop: 14, gap: 8 }}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
      <GameIcon name="beer" size={14} color={C.gold} />
      <Text accessibilityRole="header" style={{ flex: 1, fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 1.4, color: C.gold, textAlign: hiza(rtl) }}>{applyParams(t("onl.hs.secBaslik"), [hanlar.length])}</Text>
    </View>
    <ScrollView ref={kaydir} horizontal showsHorizontalScrollIndicator={false} accessibilityRole="radiogroup"
      style={{ marginHorizontal: -16 }} contentContainerStyle={{ flexDirection: yon(rtl), gap: 10, paddingHorizontal: 16, paddingVertical: 2 }}
      onContentSizeChange={() => {
        // RTL başlangıç konumu yalnız ilk ölçümde; sonra seçili kart görünür alana getirilir.
        if (!ilkOlcum.current) return;
        ilkOlcum.current = false;
        if (rtl) kaydir.current?.scrollToEnd({ animated: false });
        kaydirilan.current = null;
        goster(secili, genislik, false);
      }}>
      {sirali.map((k) => <HanKartiGorunumu key={k.no} k={k} turAdi={turAdi} secili={k.no === secili} kalabalik={kalabalik === k.no}
        genislik={genislik} rtl={rtl} t={t} onSec={() => onSec(k.no)} onSahip={onSahip}
        onYerles={(x) => { kartX.current.set(k.no, x); if (k.no === secili) goster(k.no, genislik, ilkOlcum.current ? false : true); }} />)}
    </ScrollView>
  </Animated.View>;
}

/** Han değişirken masaların yerine iskelet (eski hanın masaları yanlış başlıkla görünmez). */
export function MasaIskeleti({ rtl, etiket }: { rtl: boolean; etiket: string }) {
  return <View accessibilityRole="progressbar" accessibilityLabel={etiket} style={{ gap: 10 }}>
    {[0, 1, 2].map((i) => <Animated.View key={i} entering={belir()}>
      <Cerceve ic={{ flexDirection: yon(rtl), alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 12, minHeight: 76 }}>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(201,162,78,0.14)" }} />
        <View style={{ flex: 1, gap: 8, alignItems: rtl ? "flex-end" : "flex-start" }}>
          <View style={{ width: "42%", height: 12, borderRadius: 6, backgroundColor: "rgba(201,162,78,0.18)" }} />
          <View style={{ width: "70%", height: 10, borderRadius: 5, backgroundColor: "rgba(201,162,78,0.1)" }} />
        </View>
      </Cerceve>
    </Animated.View>)}
  </View>;
}
