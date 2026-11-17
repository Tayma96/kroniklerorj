// Han masa oyunları ekranı: masa ekranındaki oyun paneli (açma, bekleme odası, Çanak Zarı, Dokuz Taş, bitiş, seyirci)
// ve han ekranındaki "Canlı masalar" vitrini. Sunucu yetkilidir: sıra, el sonucu, kazanan ve hamle geçerliliği sunucudan
// gelir; burada yalnız niyet gönderilir. Dokuz Taş vurguları görüntü ipucudur. Zamanlayıcı ve geri sayım yoktur: kopan
// oyuncu için sabır dolunca nazik seçenekler belirir, süre gösterilmez. Hareket yalnız ui.tsx `belir`/`HAREKET`.
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import Animated from "react-native-reanimated";
import Svg, { Line } from "react-native-svg";
import { applyParams } from "../i18n";
import { C, F } from "../theme";
import { GameIcon } from "../icons";
import { hap } from "../haptics";
import { DesignPressable as Pressable } from "../design-pressable";
import { AltinDugme, BASMA_OLCEK, Bant, Cerceve, CizgiDugme, ONL, belir, giris, hiza, yon } from "./ui";
import { AltPanel, Baslik2, BosKart, Rozet, Yukleniyor } from "./yasam-ui";
import { Not } from "./han-ui";
import type { useMasa } from "./han-soket";
import { hanKartAdi } from "./han-secici";
import type { HanKarti } from "./han-veri";
import {
  EL_TURLERI, KOMSU, NOKTA, OYUN_TURLERI, UCLEMELER, alinabilirIpucu, canakBen, canakDurumu, dokuzAsamasi, dokuzDurumu, muhurDogru, noktaYeri,
  uclemede, useVitrin, type CanakBen, type CanakDurumu, type DokuzDurumu, type OyunGorunumu, type OyunTuru, type VitrinSatiri,
} from "./masa-oyun-veri";

type Ceviri = (k: string) => string;
type Masa = ReturnType<typeof useMasa>;
export const OYUN_IKON: Record<OyunTuru, string> = { canak: "amphora", dokuztas: "gems" };
/** [PARAMETRE] Kopan oyuncu varken "sabır doldu mu" yeniden bakma aralığı (gösterilmez; geri sayım değildir). */
const SABIR_BAK_MS = 15_000;

const notStil = (rtl: boolean) => ({ fontFamily: F.serif, fontSize: 13.5, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) });

// ---------------------------------------------------------------- zar ve çanak

const BENEK: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
/** Zar yüzü: parşömen taş üzerine mürekkep benekler (emoji değil). */
export function Zar({ deger, boyut = 52, secili = false, soluk = false }: { deger: number; boyut?: number; secili?: boolean; soluk?: boolean }) {
  const b = Math.max(5, Math.round(boyut * 0.15));
  return <View style={{ width: boyut, height: boyut, borderRadius: boyut * 0.18, padding: boyut * 0.14, borderWidth: secili ? 2 : 1, borderColor: secili ? C.goldBright : "rgba(80,58,30,0.9)", backgroundColor: soluk ? "rgba(214,196,160,0.55)" : "#E8D9B5", flexDirection: "row", flexWrap: "wrap", opacity: secili ? 0.72 : 1 }}>
    {Array.from({ length: 9 }, (_, i) => <View key={i} style={{ width: "33.33%", height: "33.33%", alignItems: "center", justifyContent: "center" }}>
      {BENEK[deger]?.includes(i) ? <View style={{ width: b, height: b, borderRadius: b / 2, backgroundColor: deger === 1 ? C.blood : "#2A1E10" }} /> : null}
    </View>)}
  </View>;
}

/** Kapalı çanak: rakibin zarları görünmez; yalnız kaç zar yenilediği. */
function KapaliCanak({ ad, durum, sirada, cekildi, yok, rtl }: { ad: string; durum: string; sirada: boolean; cekildi: boolean; yok: boolean; rtl: boolean }) {
  return <View accessible accessibilityLabel={`${ad}: ${durum}`} style={{ width: "48%", flexGrow: 1, alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 10, borderWidth: sirada ? 1.5 : 1, borderColor: sirada ? C.goldBright : "rgba(168,130,63,0.4)", backgroundColor: "rgba(14,10,6,0.6)", opacity: cekildi ? 0.5 : 1 }}>
    <View style={{ width: 62, height: 30, borderTopLeftRadius: 31, borderTopRightRadius: 31, borderWidth: 1, borderColor: ONL.frameHi, backgroundColor: sirada ? "rgba(201,162,78,0.42)" : "rgba(120,88,44,0.5)" }} />
    <View style={{ width: 74, height: 4, borderRadius: 2, backgroundColor: ONL.frame }} />
    <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 13.5, color: sirada ? C.goldBright : C.parchment, textAlign: "center" }}>{ad}</Text>
    <Text numberOfLines={2} style={{ fontFamily: F.serifItalic, fontSize: 12.5, lineHeight: 16, color: yok ? C.ember : C.parchmentDim, textAlign: "center" }}>{durum}</Text>
  </View>;
}

function ElSirasi({ rtl, t }: { rtl: boolean; t: Ceviri }) {
  const [acik, setAcik] = useState(false);
  return <View style={{ gap: 8 }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: acik }} accessibilityLabel={t("onl.mo.canak.elSirasi")} onPress={() => { hap("selection"); setAcik((x) => !x); }}
      style={({ pressed }) => ({ minHeight: 44, flexDirection: yon(rtl), alignItems: "center", gap: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(168,130,63,0.4)", backgroundColor: pressed ? "rgba(201,162,78,0.18)" : "rgba(14,10,6,0.5)", transform: [{ scale: pressed ? BASMA_OLCEK : 1 }] })}>
      <GameIcon name="scroll" size={15} color={C.gold} />
      <Text style={{ flex: 1, fontFamily: F.display, fontSize: 13, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.mo.canak.elSirasi")}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 15, color: C.gold }}>{acik ? "−" : "+"}</Text>
    </Pressable>
    {acik ? <Animated.View entering={belir()} style={{ gap: 6, paddingHorizontal: 4 }}>
      {EL_TURLERI.map((e, i) => <View key={e} style={{ flexDirection: yon(rtl), gap: 8, alignItems: "flex-start" }}>
        <Text style={{ width: 18, fontFamily: F.display, fontSize: 13, color: C.gold, textAlign: "center" }}>{i + 1}</Text>
        <Text style={[notStil(rtl), { flex: 1 }]}><Text style={{ fontFamily: F.display, color: C.parchment }}>{t("onl.mo.el." + e)}</Text>{" — " + t("onl.mo.el." + e + ".acik")}</Text>
      </View>)}
      <Text style={notStil(rtl)}>{t("onl.mo.canak.ayniTur")}</Text>
    </Animated.View> : null}
  </View>;
}

function ElSonucu({ o, c, el, rtl, t }: { o: OyunGorunumu; c: CanakDurumu; el: CanakDurumu["gecmis"][number]; rtl: boolean; t: Ceviri }) {
  const alanAd = el.alan !== null ? o.oyuncular[el.alan]?.ad ?? "" : null;
  return <Animated.View entering={belir()} accessibilityLiveRegion="polite" style={{ gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,162,78,0.45)", backgroundColor: "rgba(40,28,14,0.7)" }}>
    <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: rtl ? 0 : 1, color: C.gold, textAlign: hiza(rtl) }}>{applyParams(t("onl.mo.canak.elAcildi"), [el.el])}</Text>
    {el.zarlar.map((z, i) => {
      const p = o.oyuncular[i];
      if (!p) return null;
      const alan = el.alan === i;
      return <View key={p.hesap} accessible accessibilityLabel={`${p.ad}: ${z ? z.join(", ") + ", " + t("onl.mo.el." + (el.turler[i] ?? "tek")) : t("onl.mo.cekildi")}${alan ? ", " + t("onl.mo.canak.eliAldi") : ""}`}
        style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, minHeight: 34 }}>
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: alan ? F.display : F.serif, fontSize: 14, color: alan ? C.goldBright : C.parchment, textAlign: hiza(rtl) }}>{p.ad}</Text>
        {z ? <View style={{ flexDirection: yon(rtl), gap: 4 }}>{z.map((v, k) => <Zar key={k} deger={v} boyut={26} />)}</View> : null}
        <Text numberOfLines={1} style={{ width: 62, fontFamily: F.serifItalic, fontSize: 12.5, color: alan ? C.goldBright : C.parchmentDim, textAlign: rtl ? "left" : "right" }}>{z ? t("onl.mo.el." + (el.turler[i] ?? "tek")) : t("onl.mo.cekildi")}</Text>
      </View>;
    })}
    <Text style={[notStil(rtl), { color: alanAd ? C.goldBright : C.parchmentDim }]}>{alanAd ? applyParams(t("onl.mo.canak.eliAlan"), [alanAd]) : t("onl.mo.canak.eliKimse")}</Text>
    {o.asama === "oyun" ? <Text style={notStil(rtl)}>{t("onl.mo.canak.ilkEl")}</Text> : null}
  </Animated.View>;
}

const CanakGorunumu = memo(function CanakGorunumu({ o, c, ben, benHesap, siraBende, bekle, onHamle, rtl, t }: { o: OyunGorunumu; c: CanakDurumu; ben: CanakBen | null; benHesap: string | null; siraBende: boolean; bekle: boolean; onHamle: (h: Record<string, unknown>) => void; rtl: boolean; t: Ceviri }) {
  const [secim, setSecim] = useState<number[]>([]);
  useEffect(() => setSecim([]), [o.n, c.el]);
  const benI = o.oyuncular.findIndex((p) => p.hesap === benHesap);
  const son = c.gecmis[c.gecmis.length - 1];
  const kapali = !siraBende || bekle || o.asama !== "oyun";
  return <View style={{ gap: 12 }}>
    {/* el sayacı ve skor */}
    <View style={{ flexDirection: yon(rtl), alignItems: "center", flexWrap: "wrap", gap: 8 }}>
      <Rozet icon="hourglass" metin={applyParams(t("onl.mo.canak.el"), [c.el, c.elEnCok])} />
      <Text style={[notStil(rtl), { flex: 1, minWidth: 140 }]}>{applyParams(t("onl.mo.canak.hedef"), [c.hedef])}</Text>
    </View>
    <View style={{ gap: 6 }}>
      {o.oyuncular.map((p, i) => <View key={p.hesap} accessible accessibilityLabel={applyParams(t("onl.mo.canak.skorErisim"), [p.ad, c.kazanc[i] ?? 0, c.hedef])} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, minHeight: 28 }}>
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: p.hesap === benHesap ? F.display : F.serif, fontSize: 14, color: p.hesap === benHesap ? C.goldBright : C.parchment, textAlign: hiza(rtl), opacity: c.cikti[i] ? 0.5 : 1 }}>{p.hesap === benHesap ? `${p.ad} · ${t("onl.han.sen")}` : p.ad}</Text>
        <View style={{ flexDirection: yon(rtl), gap: 5 }}>
          {Array.from({ length: c.hedef }, (_, k) => <View key={k} style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: C.gold, backgroundColor: k < (c.kazanc[i] ?? 0) ? C.goldBright : "transparent" }} />)}
        </View>
      </View>)}
    </View>

    {son ? <ElSonucu key={son.el} o={o} c={c} el={son} rtl={rtl} t={t} /> : null}

    {/* rakiplerin kapalı çanakları */}
    {o.asama === "oyun" ? <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 8 }}>
      {o.oyuncular.map((p, i) => {
        if (i === benI && ben) return null;
        const y = c.yeniledi[i];
        const sirada = o.sira === p.hesap;
        const durum = c.cikti[i] || p.cekildi ? t("onl.mo.cekildi") : p.yok !== undefined ? t("onl.mo.ayrildi")
          : y === null || y === undefined ? t(sirada ? "onl.mo.canak.dusunuyor" : "onl.mo.canak.bekliyor") : y === 0 ? t("onl.mo.canak.tuttu") : applyParams(t("onl.mo.canak.yeniledi"), [y]);
        return <KapaliCanak key={p.hesap} ad={p.ad} durum={durum} sirada={sirada} cekildi={!!c.cikti[i]} yok={p.yok !== undefined} rtl={rtl} />;
      })}
    </View> : null}

    {/* kendi çanağın */}
    {ben && o.asama === "oyun" ? <View style={{ gap: 10, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: siraBende ? C.goldBright : ONL.frame, backgroundColor: "rgba(40,28,14,0.78)" }}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
        <Text style={{ flex: 1, fontFamily: F.display, fontSize: 14, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.mo.canak.canagin")}</Text>
        <Rozet metin={applyParams(t("onl.mo.canak.elinde"), [t("onl.mo.el." + ben.elim)])} renk={C.goldBright} />
      </View>
      <View style={{ flexDirection: yon(rtl), justifyContent: "center", gap: 14 }}>
        {ben.zarlarim.map((v, k) => {
          const s = secim.includes(k);
          return <Pressable key={k} accessibilityRole="checkbox" accessibilityState={{ checked: s, disabled: kapali }} disabled={kapali}
            accessibilityLabel={applyParams(t(s ? "onl.mo.canak.zarSecili" : "onl.mo.canak.zarErisim"), [k + 1, v])}
            onPress={() => { hap("selection"); setSecim((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k])); }}
            style={({ pressed }) => ({ minWidth: 60, minHeight: 74, alignItems: "center", gap: 4, transform: [{ scale: pressed ? BASMA_OLCEK : 1 }] })}>
            <Zar deger={v} boyut={56} secili={s} />
            <Text style={{ fontFamily: F.serifItalic, fontSize: 11.5, color: s ? C.goldBright : "transparent" }}>{t("onl.mo.canak.yenilenecek")}</Text>
          </Pressable>;
        })}
      </View>
      {siraBende ? <>
        <Text style={notStil(rtl)}>{t("onl.mo.canak.secNot")}</Text>
        <View style={{ flexDirection: yon(rtl), gap: 8 }}>
          <View style={{ flex: 1 }}><AltinDugme etiket={t("onl.mo.canak.tut")} icon="amphora" rtl={rtl} bekliyor={bekle} kapali={kapali} onPress={() => onHamle({ tut: true })} /></View>
          <View style={{ flex: 1 }}><CizgiDugme etiket={applyParams(t("onl.mo.canak.yenile"), [secim.length])} icon="hourglass" rtl={rtl} kapali={kapali || !secim.length}
            onPress={() => onHamle({ yenile: [...secim].sort((a, b) => a - b) })} /></View>
        </View>
      </> : <Text style={notStil(rtl)}>{c.yeniledi[benI] !== null && c.yeniledi[benI] !== undefined ? t("onl.mo.canak.kararVerdin") : t("onl.mo.canak.siraniBekle")}</Text>}
    </View> : o.asama === "oyun" && benI < 0 ? <Not metin={t("onl.mo.canak.seyirci")} rtl={rtl} icon="hood" /> : null}

    <ElSirasi rtl={rtl} t={t} />
  </View>;
});

// ---------------------------------------------------------------- Dokuz Taş

const KARE_ADI = ["dis", "orta", "ic"] as const;
const YER_ADI = ["solUst", "ustOrta", "sagUst", "sagOrta", "sagAlt", "altOrta", "solAlt", "solOrta"] as const;
const noktaAdi = (p: number, t: Ceviri) => `${t("onl.mo.dokuz.kare." + KARE_ADI[Math.floor(p / 8)])}, ${t("onl.mo.dokuz.yer." + YER_ADI[p % 8])}`;
/** Çizgiler: üç kare ve kenar ortalarını bağlayan dört çizgi. */
const CIZGILER: [number, number][] = [...UCLEMELER.filter((u) => Math.floor(u[0] / 8) === Math.floor(u[2] / 8)).flatMap((u) => [[u[0], u[1]], [u[1], u[2]]] as [number, number][]), ...[1, 3, 5, 7].flatMap((k) => [[k, 8 + k], [8 + k, 16 + k]] as [number, number][])];

function Tas({ renk, boyut, vurgu }: { renk: 0 | 1; boyut: number; vurgu?: boolean }) {
  return <View style={{ width: boyut, height: boyut, borderRadius: boyut / 2, borderWidth: vurgu ? 2.5 : 1.5, borderColor: vurgu ? C.goldBright : renk === 0 ? "#6B5530" : C.gold, backgroundColor: renk === 0 ? "#EADBB8" : "#1C140C", alignItems: "center", justifyContent: "center" }}>
    <View style={{ width: boyut * 0.46, height: boyut * 0.46, borderRadius: boyut * 0.23, borderWidth: 1, borderColor: renk === 0 ? "rgba(107,85,48,0.5)" : "rgba(226,182,90,0.45)" }} />
  </View>;
}

type Bekleyen = { koy: number } | { kaynak: number; hedef: number };

const DokuzGorunumu = memo(function DokuzGorunumu({ o, d, benHesap, siraBende, bekle, onHamle, rtl, t }: { o: OyunGorunumu; d: DokuzDurumu; benHesap: string | null; siraBende: boolean; bekle: boolean; onHamle: (h: Record<string, unknown>) => void; rtl: boolean; t: Ceviri }) {
  const { width } = useWindowDimensions();
  const B = Math.min(width, 392);
  const adim = B / 7;
  const benI = o.oyuncular.findIndex((p) => p.hesap === benHesap) as -1 | 0 | 1;
  const siraI = o.oyuncular.findIndex((p) => p.hesap === o.sira);
  const [secili, setSecili] = useState<number | null>(null);
  const [bekleyen, setBekleyen] = useState<Bekleyen | null>(null);
  useEffect(() => { setSecili(null); setBekleyen(null); }, [o.n]);
  const oynar = siraBende && benI >= 0 && !bekle && o.asama === "oyun";
  const asama = dokuzAsamasi(d, benI >= 0 ? benI : Math.max(0, siraI));
  // Görüntü ipuçları (doğrulama sunucuda).
  const ipucu = useMemo(() => {
    const bos = new Set<number>();
    const alin = new Set<number>();
    const kaynak = new Set<number>();
    if (!oynar || benI < 0) return { bos, alin, kaynak };
    if (bekleyen) {
      const t2 = [...d.tahta];
      if ("koy" in bekleyen) t2[bekleyen.koy] = benI; else { t2[bekleyen.kaynak] = -1; t2[bekleyen.hedef] = benI; }
      alinabilirIpucu(t2, benI).forEach((p) => alin.add(p));
      return { bos, alin, kaynak };
    }
    if (asama === "koyma") d.tahta.forEach((x, p) => { if (x === -1) bos.add(p); });
    else if (secili !== null) d.tahta.forEach((x, p) => { if (x === -1 && (asama === "ucma" || KOMSU[secili]!.includes(p))) bos.add(p); });
    else d.tahta.forEach((x, p) => { if (x === benI && (asama === "ucma" ? d.tahta.includes(-1) : KOMSU[p]!.some((q) => d.tahta[q] === -1))) kaynak.add(p); });
    return { bos, alin, kaynak };
  }, [oynar, benI, bekleyen, d.tahta, asama, secili]);

  const gonderVeyaAl = (h: Bekleyen) => {
    const t2 = [...d.tahta];
    let hedef: number;
    if ("koy" in h) { t2[h.koy] = benI; hedef = h.koy; } else { t2[h.kaynak] = -1; t2[h.hedef] = benI; hedef = h.hedef; }
    if (uclemede(t2, hedef) && alinabilirIpucu(t2, benI).length) { hap("success"); setBekleyen(h); return; }
    onHamle(h as Record<string, unknown>);
  };
  const dokun = (p: number) => {
    if (!oynar) return;
    hap("tap");
    if (bekleyen) { if (ipucu.alin.has(p)) onHamle({ ...bekleyen, al: p }); return; }
    if (asama === "koyma") { if (d.tahta[p] === -1) gonderVeyaAl({ koy: p }); return; }
    if (d.tahta[p] === benI) { setSecili(secili === p ? null : p); return; }
    if (secili !== null && ipucu.bos.has(p)) gonderVeyaAl({ kaynak: secili, hedef: p });
  };
  const sahip = (i: number) => o.oyuncular[i]?.ad ?? "";
  const yer = (p: number) => { const [x, y] = noktaYeri(p); return { x: (x + 0.5) * adim, y: (y + 0.5) * adim }; };

  return <View style={{ gap: 12 }}>
    {/* aşama göstergesi */}
    <View accessible accessibilityLabel={applyParams(t("onl.mo.dokuz.asamaErisim"), [t("onl.mo.dokuz.asama." + asama)])} style={{ flexDirection: yon(rtl), gap: 6 }}>
      {(["koyma", "surme", "ucma"] as const).map((a) => <View key={a} style={{ flex: 1, minHeight: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, borderWidth: 1, borderColor: a === asama ? C.goldBright : "rgba(168,130,63,0.35)", backgroundColor: a === asama ? "rgba(201,162,78,0.28)" : "rgba(14,10,6,0.5)" }}>
        <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 12.5, color: a === asama ? C.goldBright : C.parchmentMuted }}>{t("onl.mo.dokuz.asama." + a)}</Text>
      </View>)}
    </View>
    <Text style={notStil(rtl)}>{t("onl.mo.dokuz.asamaNot." + asama)}</Text>

    {/* taş sayıları */}
    <View style={{ flexDirection: yon(rtl), gap: 8 }}>
      {[0, 1].map((i) => <View key={i} accessible accessibilityLabel={applyParams(t("onl.mo.dokuz.taslarErisim"), [t(i === 0 ? "onl.mo.dokuz.ak" : "onl.mo.dokuz.kara"), sahip(i), d.el[i] ?? 0, d.taslar[i] ?? 0])}
        style={{ flex: 1, flexDirection: yon(rtl), alignItems: "center", gap: 8, padding: 8, borderRadius: 10, borderWidth: 1, borderColor: siraI === i ? C.goldBright : "rgba(168,130,63,0.35)", backgroundColor: "rgba(14,10,6,0.6)" }}>
        <Tas renk={i as 0 | 1} boyut={22} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 13, color: siraI === i ? C.goldBright : C.parchment, textAlign: hiza(rtl) }}>{sahip(i)}</Text>
          <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 12, lineHeight: 16, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.mo.dokuz.taslar"), [d.el[i] ?? 0, d.taslar[i] ?? 0])}</Text>
        </View>
      </View>)}
    </View>

    {/* tahta: kare, tam genişlik (320 px'te nokta dokunma alanı ≈ 46 px) */}
    <View style={{ width: B, height: B, alignSelf: "center", marginHorizontal: -16, borderRadius: 6, backgroundColor: "rgba(52,36,18,0.92)", borderWidth: 1, borderColor: ONL.frame }}>
      <Svg width={B} height={B} style={{ position: "absolute" }} pointerEvents="none">
        {CIZGILER.map(([a, b], k) => { const p = yer(a), q = yer(b); return <Line key={k} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={C.goldDim} strokeWidth={2} />; })}
      </Svg>
      {Array.from({ length: NOKTA }, (_, p) => {
        const { x, y } = yer(p);
        const v = d.tahta[p]!;
        const hedef = ipucu.bos.has(p);
        const alinir = ipucu.alin.has(p);
        const kaynak = ipucu.kaynak.has(p) || secili === p;
        const sonHedef = d.son?.hedef === p;
        const sonKaynak = d.son?.kaynak === p || d.son?.al === p;
        const durum = v === -1 ? t("onl.mo.dokuz.bos") : applyParams(t("onl.mo.dokuz.tasi"), [t(v === 0 ? "onl.mo.dokuz.ak" : "onl.mo.dokuz.kara"), sahip(v)]);
        const ek = alinir ? t("onl.mo.dokuz.ipucu.alinir") : hedef ? t("onl.mo.dokuz.ipucu.hedef") : secili === p ? t("onl.mo.dokuz.ipucu.secili") : kaynak ? t("onl.mo.dokuz.ipucu.oynar") : sonHedef ? t("onl.mo.dokuz.ipucu.son") : "";
        const etkin = oynar && (hedef || alinir || kaynak || (asama !== "koyma" && v === benI));
        return <Pressable key={p} accessibilityRole="button" accessibilityLabel={`${noktaAdi(p, t)}: ${durum}${ek ? ", " + ek : ""}`} accessibilityState={{ disabled: !etkin, selected: secili === p }}
          disabled={!etkin} onPress={() => dokun(p)}
          style={({ pressed }) => ({ position: "absolute", left: x - adim / 2, top: y - adim / 2, width: adim, height: adim, alignItems: "center", justifyContent: "center", transform: [{ scale: pressed ? BASMA_OLCEK : 1 }] })}>
          {v === -1
            ? <View style={{ width: hedef ? adim * 0.42 : 10, height: hedef ? adim * 0.42 : 10, borderRadius: adim, borderWidth: hedef ? 2 : 0, borderColor: C.goldBright, backgroundColor: hedef ? "rgba(226,182,90,0.22)" : sonKaynak ? C.parchmentMuted : C.gold }} />
            : <View style={{ alignItems: "center", justifyContent: "center" }}>
              <Tas renk={v as 0 | 1} boyut={adim * 0.7} vurgu={kaynak || sonHedef} />
              {alinir ? <View pointerEvents="none" style={{ position: "absolute", width: adim * 0.86, height: adim * 0.86, borderRadius: adim, borderWidth: 2.5, borderColor: C.blood }} /> : null}
            </View>}
        </Pressable>;
      })}
    </View>

    {bekleyen ? <Animated.View entering={belir()} style={{ gap: 8 }}>
      <Bant tur="bilgi" metin={t("onl.mo.dokuz.ucleme")} rtl={rtl} />
      <CizgiDugme etiket={t("onl.mo.dokuz.vazgec")} rtl={rtl} kucuk onPress={() => { setBekleyen(null); setSecili(null); }} />
    </Animated.View> : oynar ? <Text style={notStil(rtl)}>{t(asama === "koyma" ? "onl.mo.dokuz.yardim.koy" : secili === null ? "onl.mo.dokuz.yardim.sec" : "onl.mo.dokuz.yardim.hedef")}</Text> : null}
    {d.el[0] === 0 && d.el[1] === 0 && d.sessiz > 0 ? <Text style={notStil(rtl)}>{applyParams(t("onl.mo.dokuz.sessiz"), [d.sessiz, d.sessizEnCok])}</Text> : null}
    {benI < 0 && o.asama === "oyun" ? <Not metin={t("onl.mo.dokuz.seyirci")} rtl={rtl} icon="hood" /> : null}
  </View>;
});
const HAMLE_YOK = () => undefined;

// ---------------------------------------------------------------- oyun seçimi

function OyunSecici({ acik, onKapat, onSec, bekle, hata, rtl, t }: { acik: boolean; onKapat: () => void; onSec: (o: OyunTuru) => void; bekle: boolean; /** Açma hatası modalın içinde de görünür. */ hata?: ReactNode; rtl: boolean; t: Ceviri }) {
  return <AltPanel acik={acik} onKapat={onKapat} etiket={t("onl.mo.sec.baslik")} rtl={rtl} t={t}>
    <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 18, color: C.goldBright, textAlign: hiza(rtl), paddingEnd: 36 }}>{t("onl.mo.sec.baslik")}</Text>
    {hata ?? null}
    <Text style={notStil(rtl)}>{t("onl.mo.sec.alt")}</Text>
    {OYUN_TURLERI.map((o, i) => <Animated.View key={o} entering={giris(i * 60)}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${t("onl.mo.oyun." + o)}. ${t("onl.mo.kisi." + o)}. ${t("onl.mo.kural." + o)}`} accessibilityState={{ disabled: bekle }} disabled={bekle}
        onPress={() => { hap("advance"); onSec(o); }} style={({ pressed }) => ({ transform: [{ scale: pressed ? BASMA_OLCEK : 1 }] })}>
        <Cerceve ic={{ padding: 14, gap: 8 }}>
          <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
            <GameIcon name={OYUN_IKON[o]} size={20} color={C.goldBright} />
            <Text style={{ flex: 1, fontFamily: F.display, fontSize: 16, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.mo.oyun." + o)}</Text>
            <Rozet metin={t("onl.mo.kisi." + o)} />
          </View>
          <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.mo.kural." + o)}</Text>
        </Cerceve>
      </Pressable>
    </Animated.View>)}
    <Text style={notStil(rtl)}>{t("onl.mo.sec.eglence")}</Text>
  </AltPanel>;
}

// ---------------------------------------------------------------- bitiş

function Bitis({ o, ben, rtl, t }: { o: OyunGorunumu; ben: string | null; rtl: boolean; t: Ceviri }) {
  const [dogrula, setDogrula] = useState<boolean | null | undefined>(undefined);
  const s = o.sonuc;
  const adlar = (s?.kazanan ?? []).map((h) => o.oyuncular.find((p) => p.hesap === h)?.ad ?? "");
  const metin = !s || s.tur === "dagildi" ? t("onl.mo.son.dagildi")
    : s.tur === "berabere" ? (adlar.length ? applyParams(t("onl.mo.son.berabereAd"), [adlar.join(", ")]) : t("onl.mo.son.berabere"))
    : ben && s.kazanan.includes(ben) ? t("onl.mo.son.sen") : applyParams(t("onl.mo.son.aldi"), [adlar.join(", ")]);
  return <Animated.View entering={belir()} style={{ gap: 10 }}>
    <View accessibilityLiveRegion="polite" style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: C.goldBright, backgroundColor: "rgba(60,42,18,0.85)" }}>
      <GameIcon name={s?.tur === "kazandi" ? "trophy" : "scroll"} size={20} color={C.goldBright} />
      <Text style={{ flex: 1, fontFamily: F.display, fontSize: 15, lineHeight: 21, color: C.parchment, textAlign: hiza(rtl) }}>{metin}</Text>
    </View>
    <Text style={notStil(rtl)}>{t("onl.mo.son.dostca")}</Text>
    {o.tohum ? <View style={{ gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,162,78,0.35)", backgroundColor: "rgba(14,10,6,0.7)" }}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
        <GameIcon name="shield" size={15} color={C.gold} />
        <Text style={{ flex: 1, fontFamily: F.display, fontSize: 13, color: C.goldBright, textAlign: hiza(rtl) }}>{t(o.tur === "canak" ? "onl.mo.muhur.baslikZar" : "onl.mo.muhur.baslik")}</Text>
      </View>
      <Text style={notStil(rtl)}>{t(o.tur === "canak" ? "onl.mo.muhur.notZar" : "onl.mo.muhur.not")}</Text>
      {o.kesik ? <Text style={notStil(rtl)}>{t("onl.mo.muhur.kesik")}</Text> : null}
      {dogrula === undefined ? <CizgiDugme etiket={t("onl.mo.muhur.dogrula")} icon="scales" rtl={rtl} kucuk onPress={() => setDogrula(muhurDogru(o))} />
        : <Text accessibilityLiveRegion="polite" style={[notStil(rtl), { color: dogrula ? C.sage : dogrula === false ? C.ember : C.parchmentDim }]}>{t(dogrula ? "onl.mo.muhur.dogru" : dogrula === false ? "onl.mo.muhur.yanlis" : "onl.mo.muhur.yok")}</Text>}
    </View> : null}
  </Animated.View>;
}

// ---------------------------------------------------------------- masa paneli

/**
 * Masa ekranındaki oyun paneli. `oturuyor`/`acik`/`mesgul` masa ekranından gelir. Vitrinden "katıl" ile gelinmişse
 * (`?oyun=katil`) masaya oturulur ve bekleyen oyuna katılınır (bir kez).
 */
export function MasaOyunPaneli({ m, ben, oturuyor, acik, mesgul, rtl, t }: { m: Masa; ben: string | null; oturuyor: boolean; acik: boolean; mesgul: boolean; rtl: boolean; t: Ceviri }) {
  const o = m.durum.oyun;
  const bekle = m.durum.oyunBekle;
  const { oyun: niyet } = useLocalSearchParams<{ oyun?: string }>();
  const [secici, setSecici] = useState(false);
  const [, setTik] = useState(0);
  const niyetBitti = useRef(niyet !== "katil");
  const oturDenendi = useRef(false);
  const oturMasa = useRef(m.durum.masa);
  const benOyuncu = !!o && !!ben && o.oyuncular.some((p) => p.hesap === ben && !p.cekildi);
  const kopanVar = !!o && o.asama === "oyun" && o.oyuncular.some((p) => p.yok !== undefined);
  const bosYerVar = !!o && o.oyuncular.length < o.enCok;
  // Vitrin niyeti tek seferliktir: oturma isteğinden sonra masa güncellenip (ya da hata gelip) oturulmadıysa düşer.
  const masaD = m.durum.masa;
  const masaHata = m.durum.hata;

  // Vitrinden katılma niyeti: önce otur, sonra yalnız bekleme + boş yer varken katıl.
  useEffect(() => {
    if (niyetBitti.current || !acik) return;
    if (!oturuyor) {
      if (!oturDenendi.current) { oturDenendi.current = true; oturMasa.current = masaD; m.otur(); return; }
      if (masaD !== oturMasa.current || masaHata) niyetBitti.current = true;
      return;
    }
    niyetBitti.current = true;
    if (o?.asama === "bekleme" && bosYerVar && !benOyuncu) m.oyunKatil();
  }, [acik, oturuyor, o?.asama, benOyuncu, bosYerVar, masaD, masaHata]); // eslint-disable-line react-hooks/exhaustive-deps
  // Kopan oyuncu varken sabrın dolduğunu fark etmek için ara ara yeniden çizilir (ekranda süre yoktur).
  useEffect(() => {
    if (!kopanVar) return;
    const z = setInterval(() => setTik((x) => x + 1), SABIR_BAK_MS);
    return () => clearInterval(z);
  }, [kopanVar]);
  useEffect(() => { if (o) setSecici(false); }, [o?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Hamle geri çağrısı sabit kalır (memo'lu tahtalar her karede yeniden çizilmesin); güncel masa ref'ten okunur.
  const mRef = useRef(m);
  mRef.current = m;
  const onHamle = useCallback((h: Record<string, unknown>) => { mRef.current.hamle(h); }, []);
  const canak = useMemo(() => (o ? canakDurumu(o) : null), [o]);
  const dokuz = useMemo(() => (o ? dokuzDurumu(o) : null), [o]);
  // "Dağıt" ipucu için kopan oyuncunun ilk görüldüğü yerel an (cihaz saati sunucu zamanıyla karşılaştırılmaz).
  const yokIlk = useRef(new Map<string, number>());
  if (o) {
    const simdi = Date.now();
    for (const p of o.oyuncular) {
      if (p.yok === undefined) yokIlk.current.delete(p.hesap);
      else if (!yokIlk.current.has(p.hesap)) yokIlk.current.set(p.hesap, simdi);
    }
  }

  const hataMetni = m.durum.oyunHata ? t("onl.mo.hata." + m.durum.oyunHata.kod) : null;
  const hataBandi = hataMetni ? <Bant metin={hataMetni} rtl={rtl} eylem={m.durum.oyunHata?.kod === "hamle_no" ? t("onl.han.yenidenBaglan") : t("onl.kapat")}
    onEylem={() => { if (m.durum.oyunHata?.kod === "hamle_no") m.yenidenBaglan(); m.oyunHataTemizle(); }} /> : null;
  const seciciEl = <OyunSecici acik={secici} onKapat={() => setSecici(false)} bekle={bekle} hata={hataBandi} rtl={rtl} t={t} onSec={(tur) => { m.oyunAc(tur); }} />;

  if (!o) {
    if (!oturuyor) return hataBandi;
    return <View style={{ marginTop: 12, gap: 8 }}>
      {hataBandi}
      <CizgiDugme etiket={t("onl.mo.ac")} icon="amphora" rtl={rtl} kapali={!acik || mesgul || bekle} onPress={() => setSecici(true)} />
      <Text style={notStil(rtl)}>{t(mesgul ? "onl.mo.mesgul" : "onl.mo.acNot")}</Text>
      {seciciEl}
    </View>;
  }

  const ad = (h: string) => o.oyuncular.find((p) => p.hesap === h)?.ad ?? t("onl.han.birMisafir");
  const siraBende = !!ben && o.sira === ben;
  const siradaki = o.oyuncular.find((p) => p.hesap === o.sira);
  const yokUzun = (p: { hesap: string; yok?: number } | undefined) => p?.yok !== undefined && Date.now() - (yokIlk.current.get(p.hesap) ?? Date.now()) >= o.sabir;
  const dagitVerdim = !!ben && o.dagit.includes(ben);
  const etkinSayi = o.oyuncular.filter((p) => !p.cekildi).length;

  return <Animated.View entering={belir()} style={{ marginTop: 12, gap: 10 }}>
    <Baslik2 metin={t("onl.mo.oyun." + o.tur)} rtl={rtl} ust={4} sag={<Rozet icon={OYUN_IKON[o.tur]} metin={t("onl.mo.asama." + o.asama)} renk={o.asama === "oyun" ? C.goldBright : C.gold} />} />
    {hataBandi}

    {o.asama === "bekleme" ? <Cerceve ic={{ padding: 12, gap: 10 }}>
      <Text style={notStil(rtl)}>{t("onl.mo.kural." + o.tur)}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold, textAlign: hiza(rtl) }}>{applyParams(t("onl.mo.bekleme.sayi"), [o.oyuncular.length, o.enCok, o.enAz])}</Text>
      <View style={{ gap: 6 }}>
        {o.oyuncular.map((p) => <View key={p.hesap} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, minHeight: 32 }}>
          <GameIcon name={p.hesap === o.kurucu ? "crown" : "hood"} size={14} color={p.hesap === o.kurucu ? C.goldBright : C.gold} />
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, color: p.hesap === ben ? C.goldBright : C.parchment, textAlign: hiza(rtl) }}>{p.hesap === ben ? `${p.ad} · ${t("onl.han.sen")}` : p.ad}</Text>
          {p.hesap === o.kurucu ? <Rozet metin={t("onl.mo.bekleme.kurucu")} renk={C.goldBright} /> : null}
        </View>)}
        {Array.from({ length: Math.max(0, o.enCok - o.oyuncular.length) }, (_, i) => <View key={"b" + i} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, minHeight: 28 }}>
          <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderStyle: "dashed", borderColor: C.goldDim }} />
          <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, color: C.parchmentMuted }}>{t("onl.mo.bekleme.bosYer")}</Text>
        </View>)}
      </View>
      {benOyuncu ? <>
        {o.kurucu === ben ? <>
          <AltinDugme etiket={t("onl.mo.bekleme.baslat")} icon="star" rtl={rtl} bekliyor={bekle} kapali={!acik || o.oyuncular.length < o.enAz} onPress={() => m.oyunBaslat()} />
          <Text style={notStil(rtl)}>{o.oyuncular.length < o.enAz ? applyParams(t("onl.mo.bekleme.azNot"), [o.enAz]) : t("onl.mo.bekleme.baslatNot")}</Text>
          <View style={{ flexDirection: yon(rtl), gap: 8 }}>
            <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.mo.bekleme.ayril")} icon="walk" rtl={rtl} kucuk kapali={!acik || bekle} onPress={() => m.oyunAyril()} /></View>
            <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.mo.bekleme.kaldir")} rtl={rtl} kucuk kapali={!acik || bekle} onPress={() => m.oyunDagit()} /></View>
          </View>
        </> : o.devralAcik ? <>
          <Text style={notStil(rtl)}>{applyParams(t("onl.mo.bekleme.devralNot"), [ad(o.kurucu)])}</Text>
          <AltinDugme etiket={t("onl.mo.bekleme.devralBaslat")} icon="star" rtl={rtl} bekliyor={bekle} kapali={!acik || o.oyuncular.length < o.enAz} onPress={() => m.oyunBaslat()} />
          {o.oyuncular.length < o.enAz ? <Text style={notStil(rtl)}>{applyParams(t("onl.mo.bekleme.azNot"), [o.enAz])}</Text> : null}
          <View style={{ flexDirection: yon(rtl), gap: 8 }}>
            <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.mo.bekleme.ayril")} icon="walk" rtl={rtl} kucuk kapali={!acik || bekle} onPress={() => m.oyunAyril()} /></View>
            <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.mo.bekleme.devralDagit")} rtl={rtl} kucuk kapali={!acik || bekle} onPress={() => m.oyunDagit()} /></View>
          </View>
        </> : <>
          <Text style={notStil(rtl)}>{applyParams(t("onl.mo.bekleme.kurucuBekle"), [ad(o.kurucu)])}</Text>
          <CizgiDugme etiket={t("onl.mo.bekleme.ayril")} icon="walk" rtl={rtl} kucuk kapali={!acik || bekle} onPress={() => m.oyunAyril()} />
        </>}
      </> : oturuyor ? <>
        <AltinDugme etiket={t("onl.mo.bekleme.katil")} icon="hood" rtl={rtl} bekliyor={bekle} kapali={!acik || o.oyuncular.length >= o.enCok} onPress={() => m.oyunKatil()} />
        {o.oyuncular.length >= o.enCok ? <Text style={notStil(rtl)}>{t("onl.mo.bekleme.dolu")}</Text> : null}
      </> : <Text style={notStil(rtl)}>{t("onl.mo.bekleme.oturNot")}</Text>}
    </Cerceve> : null}

    {o.asama === "oyun" ? <>
      {/* sıra göstergesi: süre sayacı yok */}
      <View accessibilityLiveRegion="polite" style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: siraBende ? 1.5 : 1, borderColor: siraBende ? C.goldBright : "rgba(168,130,63,0.4)", backgroundColor: siraBende ? "rgba(90,64,24,0.7)" : "rgba(14,10,6,0.7)" }}>
        <GameIcon name={siraBende ? "star" : "hourglass"} size={17} color={siraBende ? C.goldBright : C.gold} />
        <Text style={{ flex: 1, fontFamily: F.display, fontSize: 14.5, lineHeight: 20, color: siraBende ? C.goldBright : C.parchment, textAlign: hiza(rtl) }}>
          {siraBende ? t("onl.mo.sira.sende") : siradaki ? applyParams(t(siradaki.yok !== undefined ? "onl.mo.sira.yok" : "onl.mo.sira.onda"), [siradaki.ad]) : t("onl.mo.sira.aciliyor")}
        </Text>
      </View>
      {siraBende ? <Text style={notStil(rtl)}>{t("onl.mo.sira.acele")}</Text> : null}

      {/* kopan oyuncu: sabır dolunca nazik seçenekler */}
      {siradaki && siradaki.yok !== undefined && !siraBende ? (yokUzun(siradaki) || o.pasAcik) && benOyuncu ? <View style={{ gap: 8 }}>
        <Not metin={applyParams(t(o.tur === "canak" ? "onl.mo.kopma.uzunCanak" : "onl.mo.kopma.uzunDokuz"), [siradaki.ad])} rtl={rtl} icon="walk" />
        <View style={{ flexDirection: yon(rtl), gap: 8 }}>
          {o.tur === "canak" && o.pasAcik ? <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.mo.kopma.pas")} icon="hourglass" rtl={rtl} kucuk kapali={!acik || bekle} onPress={() => m.oyunPas()} /></View> : null}
          <View style={{ flex: 1 }}><CizgiDugme etiket={t(dagitVerdim ? "onl.mo.kopma.dagitVerdin" : "onl.mo.kopma.dagit")} rtl={rtl} kucuk kapali={!acik || bekle || dagitVerdim} onPress={() => m.oyunDagit()} /></View>
        </View>
      </View> : <Not metin={applyParams(t("onl.mo.kopma.bekle"), [siradaki.ad])} rtl={rtl} icon="walk" /> : null}
      {o.dagit.length && !(siradaki && yokUzun(siradaki)) ? <Text style={notStil(rtl)}>{applyParams(t(dagitVerdim ? "onl.mo.dagit.verdin" : "onl.mo.dagit.oneri"), [o.dagit.length, etkinSayi])}</Text> : null}
      {o.dagit.length && !dagitVerdim && benOyuncu && !(siradaki && yokUzun(siradaki)) ? <CizgiDugme etiket={t("onl.mo.kopma.dagit")} rtl={rtl} kucuk kapali={!acik || bekle} onPress={() => m.oyunDagit()} /> : null}

      {canak ? <CanakGorunumu o={o} c={canak} ben={canakBen(o)} benHesap={ben} siraBende={siraBende} bekle={bekle} onHamle={onHamle} rtl={rtl} t={t} />
        : dokuz ? <DokuzGorunumu o={o} d={dokuz} benHesap={ben} siraBende={siraBende} bekle={bekle} onHamle={onHamle} rtl={rtl} t={t} />
        : <Yukleniyor metin={t("onl.mo.yukleniyor")} />}

      {benOyuncu ? <View style={{ gap: 6, marginTop: 4 }}>
        <View style={{ flexDirection: yon(rtl), gap: 8 }}>
          <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.mo.cekil")} icon="walk" rtl={rtl} kucuk kapali={!acik || bekle} onPress={() => m.oyunAyril()} /></View>
          {!o.dagit.length ? <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.mo.dagitOner")} rtl={rtl} kucuk kapali={!acik || bekle} onPress={() => m.oyunDagit()} /></View> : null}
        </View>
        <Text style={notStil(rtl)}>{t(o.tur === "canak" && etkinSayi > 2 ? "onl.mo.cekilNotCanak" : "onl.mo.cekilNot")}</Text>
      </View> : null}
    </> : null}

    {o.asama === "bitti" ? <>
      {canak && canak.gecmis.length ? <ElSonucu key={canak.gecmis[canak.gecmis.length - 1]!.el} o={o} c={canak} el={canak.gecmis[canak.gecmis.length - 1]!} rtl={rtl} t={t} /> : null}
      {dokuz ? <DokuzGorunumu o={o} d={dokuz} benHesap={ben} siraBende={false} bekle rtl={rtl} t={t} onHamle={HAMLE_YOK} /> : null}
      <Bitis o={o} ben={ben} rtl={rtl} t={t} />
      {oturuyor ? <View style={{ flexDirection: yon(rtl), gap: 8 }}>
        <View style={{ flex: 1 }}><AltinDugme etiket={t("onl.mo.son.yeni")} icon="amphora" rtl={rtl} kapali={!acik || bekle || mesgul} onPress={() => setSecici(true)} /></View>
        <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.mo.son.kaldir")} rtl={rtl} kapali={!acik || bekle} onPress={() => m.oyunKapat()} /></View>
      </View> : null}
      {seciciEl}
    </> : null}
  </Animated.View>;
}

// ---------------------------------------------------------------- canlı masalar vitrini

function VitrinSatirKarti({ s, hanAdi, sira, rtl, t, onAc }: { s: VitrinSatiri; hanAdi: string; sira: number; rtl: boolean; t: Ceviri; onAc: (katil: boolean) => void }) {
  const bilgi = [applyParams(t("onl.mo.vitrin.oyuncu"), [s.oyuncu, s.enCok]), ...(s.bos ? [applyParams(t("onl.mo.vitrin.bos"), [s.bos])] : []), ...(s.seyirci ? [applyParams(t("onl.mo.vitrin.seyirci"), [s.seyirci])] : [])].join(" · ");
  const yerAdi = `${hanAdi}, ${applyParams(t("onl.mo.vitrin.masa"), [s.masa])}`;
  return <Animated.View entering={giris(Math.min(sira, 6) * 40)}>
    <Cerceve aktif={s.katilabilir} ic={{ padding: 12, gap: 10 }}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
        <GameIcon name={OYUN_IKON[s.oyun]} size={20} color={s.katilabilir ? C.goldBright : C.gold} />
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchment }}>{t("onl.mo.oyun." + s.oyun)}</Text>
            <Rozet metin={t(s.asama === "bekleme" ? "onl.mo.vitrin.bekliyor" : "onl.mo.vitrin.suruyor")} renk={s.katilabilir ? C.sage : C.gold} />
          </View>
          <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>{yerAdi}</Text>
          <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 17, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{bilgi}</Text>
        </View>
      </View>
      <View style={{ flexDirection: yon(rtl), gap: 8 }}>
        {s.katilabilir ? <View style={{ flex: 1 }}><AltinDugme etiket={t("onl.mo.vitrin.katil")} icon="hood" rtl={rtl} erisim={`${t("onl.mo.vitrin.katil")}: ${t("onl.mo.oyun." + s.oyun)}, ${yerAdi}`} onPress={() => onAc(true)} /></View> : null}
        <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.mo.vitrin.izle")} icon="walk" rtl={rtl} onPress={() => onAc(false)} /></View>
      </View>
    </Cerceve>
  </Animated.View>;
}

/** Han ekranı "Canlı masalar": yerleşimdeki hanlarda bekleyen ve süren masa oyunları. */
export function CanliMasalar({ hanlar, turAdi, etkin, rtl, t, onAc }: { hanlar: HanKarti[]; turAdi: string | null; etkin: boolean; rtl: boolean; t: Ceviri; onAc: (han: number, masa: number, katil: boolean) => void }) {
  const v = useVitrin(etkin);
  const hanAdi = (no: number) => { const k = hanlar.find((x) => x.no === no); return k && turAdi ? hanKartAdi(k, turAdi, t) : applyParams(t("onl.mo.vitrin.hanNo"), [no]); };
  return <View>
    <Baslik2 metin={t("onl.mo.vitrin.baslik")} rtl={rtl} sag={v.liste?.length ? <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>{v.liste.length}</Text> : undefined} />
    {v.hata && !v.liste ? <Bant metin={t("onl.mo.vitrin.hata")} rtl={rtl} eylem={t("onl.yenidenDene")} onEylem={() => { void v.yukle(); }} />
      : !v.liste ? <Yukleniyor metin={t("onl.mo.vitrin.yukleniyor")} />
      : !v.liste.length ? <BosKart icon="amphora" metin={t("onl.mo.vitrin.bosDurum")} rtl={rtl} />
      : <View style={{ gap: 10 }}>{v.liste.map((s, i) => <VitrinSatirKarti key={`${s.han}:${s.masa}`} s={s} hanAdi={hanAdi(s.han)} sira={i} rtl={rtl} t={t} onAc={(k) => onAc(s.han, s.masa, k)} />)}</View>}
    {v.liste && v.hata ? <View style={{ marginTop: 10 }}><Bant metin={t("onl.mo.vitrin.hata")} rtl={rtl} /></View> : null}
    {v.liste ? <View style={{ marginTop: 10 }}><CizgiDugme etiket={t("onl.mo.vitrin.yenile")} icon="hourglass" rtl={rtl} kucuk kapali={v.yukleniyor} onPress={() => { void v.yukle(); }} /></View> : null}
  </View>;
}
