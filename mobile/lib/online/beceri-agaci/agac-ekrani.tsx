// Beceri ağacı v2 örnek ekranı — yalnız Demircilik, sahte veriyle (tasarım §2, §3, §8, §9). Berkay onaylayınca
// 14 mesleğe ve sunucuya taşınır; şimdilik sunucuya hiçbir şey gitmez.
// Düzen: üstte geri, meslek arması ve beceri puanı; sekmeler (Aktif Mesleğim · Mesleki Geçmişim · Tüm Beceriler);
// kademe şeritleri, üç sütun düğüm ve ön koşul çizgileri; altta seçili düğüm paneli. Yakınlaştırma: iki parmak ya da +/-.
import { useMemo, useState, type ReactNode } from "react";
import { View, Text, ScrollView, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { useI18n, applyParams } from "../../i18n";
import { C, F } from "../../theme";
import { GameIcon } from "../../icons";
import { SAHNE_GORSEL } from "../../sahne-tema";
import { DesignPressable as Pressable } from "../../design-pressable";
import { hap } from "../../haptics";
import { Carpi, Check, GeriDugme, ONL, Ornament, Sahne, geriGit, hiza, yon } from "../ui";
import { AGAC_TOPLAM, DEMIRCI_AGACI, PUAN_TAVANI, dugumBul, type BeceriDugumu, type KademeAd } from "./demirci-ornek";
import { dugumHali, engel, ilkSecim, ilkSekme, kademeSartiTamam, ogrenilmisler, sev, useSahteAgac, type AgacDurumu, type Engel, type Sekme } from "./sahte";
import { AG, BeceriIkon, Celenk, Dugum, GizliMuhur, KademeSeridi } from "./dugum";

type Ceviri = (k: string) => string;

const OLCEKLER = [0.85, 1, 1.2, 1.4];
const dugumAdi = (t: Ceviri, id: string) => t("onl.ba.d." + id);
const kademeAdi = (t: Ceviri, k: KademeAd) => t("onl.kd." + k);

export function sureYaz(t: Ceviri, dk: number): string {
  if (dk < 60) return applyParams(t("onl.ba.dk"), [dk]);
  const sa = Math.floor(dk / 60), kalan = dk % 60;
  return kalan ? applyParams(t("onl.ba.saDk"), [sa, kalan]) : applyParams(t("onl.ba.sa"), [sa]);
}

function engelMetni(t: Ceviri, e: Engel): string {
  switch (e.tur) {
    case "tam": return t("onl.ba.neden.tam");
    case "gizli": return t("onl.ba.neden.gizli");
    case "suren": return t("onl.ba.neden.suren");
    case "onKosul": return t("onl.ba.neden.onKosul");
    case "kademe": return applyParams(t("onl.ba.neden.kademe"), [kademeAdi(t, e.kademe)]);
    case "puan": return applyParams(t("onl.ba.neden.puan"), [e.gerekli]);
  }
}

// ---------------------------------------------------------------- yerleşim (mutlak konumlar)

interface Yerlesim {
  W: number; colW: number; w: number; h: number; H: number;
  satirY: Record<number, number>;
  seritler: { kademe: string; alt: string; y: number }[];
  bolumler: { y: number; boy: number }[];
  x: (sutun: number) => number;
}

const BOLUMLER: { baslik: string; alt: string; siralar: number[] }[] = [
  { baslik: "onl.kd.cirak", alt: "onl.ba.k.cirak", siralar: [0] },
  { baslik: "onl.kd.kalfa", alt: "onl.ba.k.kalfa", siralar: [1, 2] },
  { baslik: "onl.kd.usta", alt: "onl.ba.k.usta", siralar: [3] },
  { baslik: "onl.kd.pir", alt: "onl.ba.k.pir", siralar: [4] },
  { baslik: "onl.ba.gizliBaslik", alt: "onl.ba.gizliAlt", siralar: [5] },
];
const SERIT_BOY = 60;

function yerlesimKur(W: number, olcek: number, rtl: boolean): Yerlesim {
  const colW = W / 3;
  const w = Math.round(Math.min(colW * 0.8, 106 * olcek));
  const fs = w < 82 ? 10.5 : 11.5;
  const h = Math.round(7 + w * 0.44 + 4 + (fs + 2) * 3 + 11);
  const satirY: Record<number, number> = {};
  const seritler: Yerlesim["seritler"] = [], bolumler: Yerlesim["bolumler"] = [];
  let y = 6;
  for (const b of BOLUMLER) {
    const bas = y;
    seritler.push({ kademe: b.baslik, alt: b.alt, y });
    y += SERIT_BOY + 22;
    b.siralar.forEach((s, i) => {
      if (s === 4) y += 14;
      satirY[s] = y;
      y += h + 12 + (s === 4 ? 16 : 0);
      if (i < b.siralar.length - 1) y += 24;
    });
    y += 16;
    bolumler.push({ y: bas + SERIT_BOY / 2, boy: y - bas - SERIT_BOY / 2 });
    y += 12;
  }
  return { W, colW, w, h, H: y, satirY, seritler, bolumler, x: (s) => colW * (rtl ? 2 - s : s) + colW / 2 };
}

function Cizgiler({ L, d }: { L: Yerlesim; d: AgacDurumu }) {
  const acik: string[] = [], sonuk: string[] = [];
  for (const n of DEMIRCI_AGACI) for (const o of n.onKosul) {
    const s = dugumBul(o.id);
    if (!s) continue;
    const sx = L.x(s.sutun), sy = L.satirY[s.sira] + L.h + 10, tx = L.x(n.sutun), ty = L.satirY[n.sira] - (n.sira === 4 ? 24 : 4);
    const ym = ty - (n.sira === 4 ? 6 : 14);
    const yolu = sx === tx ? `M${sx} ${sy} V${ty}` : `M${sx} ${sy} V${ym} H${tx} V${ty}`;
    (sev(d, o.id) >= o.seviye ? acik : sonuk).push(yolu);
  }
  return <Svg pointerEvents="none" width={L.W} height={L.H} style={{ position: "absolute", top: 0, left: 0 }}>
    {sonuk.map((p, i) => <Path key={"s" + i} d={p} stroke={AG.cizgi} strokeWidth={2} fill="none" />)}
    {acik.map((p, i) => <Path key={"a" + i} d={p} stroke={AG.mavi} strokeOpacity={0.28} strokeWidth={6} fill="none" strokeLinejoin="round" />)}
    {acik.map((p, i) => <Path key={"b" + i} d={p} stroke="#BFE3F7" strokeWidth={2} fill="none" strokeLinejoin="round" />)}
  </Svg>;
}

function Agac({ L, d, secili, onSec, kalan, t }: { L: Yerlesim; d: AgacDurumu; secili: string; onSec: (id: string) => void; kalan: { oran: number; dk: number } | null; t: Ceviri }) {
  const seritEn = Math.round(L.colW * 2 - 12);
  return <View style={{ width: L.W, height: L.H }}>
    {L.bolumler.map((b, i) => <View key={i} pointerEvents="none" style={{ position: "absolute", top: b.y, left: 0, width: L.W, height: b.boy, borderRadius: 14, borderWidth: 1, borderColor: "rgba(201,162,78,0.16)", backgroundColor: "rgba(12,10,8,0.5)" }} />)}
    <Cizgiler L={L} d={d} />
    {L.seritler.map((s) => <View key={s.kademe} style={{ position: "absolute", top: s.y, left: (L.W - seritEn) / 2 }}>
      <KademeSeridi en={seritEn} boy={SERIT_BOY} baslik={t(s.kademe)} alt={t(s.alt)} />
    </View>)}
    {DEMIRCI_AGACI.map((n) => {
      const hali = dugumHali(d, n);
      const cx = L.x(n.sutun), y = L.satirY[n.sira];
      const ad = hali === "gizli" ? t("onl.ba.gizli") : dugumAdi(t, n.id);
      const kalanMetin = hali === "ogreniliyor" && kalan ? sureYaz(t, kalan.dk) : undefined;
      const durum = t("onl.ba.durum." + hali);
      const erisim = `${ad}. ${applyParams(t("onl.ba.seviyeN"), [sev(d, n.id), n.azami])}. ${durum}${kalanMetin ? ". " + applyParams(t("onl.ba.kalan"), [kalanMetin]) : ""}`;
      const celenk = Math.round(L.w * 1.9);
      return <View key={n.id} style={{ position: "absolute", top: y, left: cx - L.w / 2, width: L.w }}>
        {n.sira === 4 ? <View pointerEvents="none" style={{ position: "absolute", top: (L.h - celenk) / 2 + 4, left: (L.w - celenk) / 2 }}><Celenk boyut={celenk} /></View> : null}
        <Dugum n={n} hali={hali} secili={secili === n.id} seviye={sev(d, n.id)} oran={kalan?.oran} kalanMetin={kalanMetin} w={L.w} h={L.h} ad={ad} erisim={erisim} onSec={() => onSec(n.id)} />
      </View>;
    })}
  </View>;
}

// ---------------------------------------------------------------- seçili düğüm paneli

function GereksinimSatiri({ tamam, metin, rtl, t }: { tamam: boolean; metin: string; rtl: boolean; t: Ceviri }) {
  return <View accessible accessibilityLabel={`${metin}: ${tamam ? t("onl.ba.karsilandi") : t("onl.ba.eksik")}`} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 7, minHeight: 22 }}>
    <View style={{ width: 16, alignItems: "center" }}>{tamam ? <Check size={15} color={C.sage} /> : <Carpi size={12} color={C.blood} />}</View>
    <Text style={{ flexShrink: 1, fontFamily: F.serif, fontSize: 14, lineHeight: 18, color: tamam ? C.parchment : C.parchmentMuted, textAlign: hiza(rtl) }}>{metin}</Text>
  </View>;
}

function OgrenDugmesi({ bedel, sure, kapali, rtl, t, onPress }: { bedel: number; sure: string; kapali: boolean; rtl: boolean; t: Ceviri; onPress: () => void }) {
  return <Pressable accessibilityLabel={`${t("onl.ba.ogren")}. ${applyParams(t("onl.ba.puanSarti"), [bedel])}. ${applyParams(t("onl.ba.sure"), [sure])}`} accessibilityState={{ disabled: kapali }} disabled={kapali}
    onPress={() => { hap("advance"); onPress(); }}
    style={({ pressed }) => [{ minHeight: 52, borderRadius: 9, overflow: "hidden", borderWidth: 1.5, borderColor: kapali ? "rgba(168,130,63,0.5)" : C.goldBright, transform: [{ scale: pressed ? 0.98 : 1 }] }, kapali ? null : { shadowColor: C.goldBright, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } }]}>
    <LinearGradient pointerEvents="none" colors={kapali ? ["#3A2D1C", "#241B10"] : ["#8A5A22", "#5C3A14", "#3E270C"]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
    <View pointerEvents="none" style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: 6, borderWidth: 1, borderColor: "rgba(243,210,122,0.35)" }} />
    <View style={{ flex: 1, flexDirection: yon(rtl), alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 14 }}>
      <Text style={{ fontFamily: F.display, fontSize: 17, color: kapali ? C.parchmentMuted : C.parchment }}>{t("onl.ba.ogren")}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Ornament size={16} color={kapali ? C.parchmentMuted : C.goldBright} />
        <Text style={{ fontFamily: F.display, fontSize: 17, color: kapali ? C.parchmentMuted : C.goldBright }}>{bedel}</Text>
      </View>
    </View>
  </Pressable>;
}

function KucukDugme({ etiket, icon, onPress, rtl }: { etiket: string; icon: string; onPress: () => void; rtl: boolean }) {
  return <Pressable accessibilityLabel={etiket} onPress={() => { hap("tap"); onPress(); }}
    style={({ pressed }) => ({ flex: 1, minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: ONL.frameHi, backgroundColor: pressed ? "rgba(201,162,78,0.24)" : "rgba(201,162,78,0.1)", flexDirection: yon(rtl), alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 8 })}>
    <GameIcon name={icon} size={15} color={C.goldBright} />
    <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 13, color: C.goldBright }}>{etiket}</Text>
  </Pressable>;
}

function Panel({ n, d, kalan, ogren, vazgec, rtl, t, genis, bitti }: { n: BeceriDugumu; d: AgacDurumu; kalan: { oran: number; dk: number } | null; ogren: () => void; vazgec: () => void; rtl: boolean; t: Ceviri; genis: boolean; bitti: string | null }) {
  const [kisaltNot, setKisaltNot] = useState(false);
  const hali = dugumHali(d, n), gizli = hali === "gizli";
  const s = sev(d, n.id);
  const sonraki = Math.min(s + 1, n.azami);
  const e = engel(d, n);
  const sure = sureYaz(t, n.sureDk[sonraki - 1] ?? n.sureDk[0]);
  const ad = gizli ? t("onl.ba.gizliYetenek") : dugumAdi(t, n.id);

  const gereksinim: { tamam: boolean; metin: string }[] = [];
  if (!gizli) {
    if (n.herhangi) {
      const o = n.onKosul[0];
      gereksinim.push({ tamam: n.onKosul.some((k) => sev(d, k.id) >= k.seviye), metin: applyParams(t("onl.ba.herhangi"), [o.seviye, o.seviye]) });
    } else for (const o of n.onKosul) {
      const k = dugumBul(o.id)!;
      gereksinim.push({ tamam: sev(d, o.id) >= o.seviye, metin: `${kademeAdi(t, k.kademe)}: ${dugumAdi(t, o.id)} (${Math.min(sev(d, o.id), o.seviye)}/${o.seviye})` });
    }
    gereksinim.push({ tamam: kademeSartiTamam(d, n.kademe), metin: applyParams(t("onl.ba.kademeSarti"), [kademeAdi(t, n.kademe)]) });
    if (hali !== "tam" && hali !== "ogreniliyor") gereksinim.push({ tamam: d.puan >= n.bedel, metin: applyParams(t("onl.ba.puanSarti"), [n.bedel]) });
  }

  const bas = <View style={{ flexDirection: yon(rtl), gap: 12, alignItems: "flex-start" }}>
      <View style={{ width: 66, height: 66, borderRadius: 10, borderWidth: 1.5, borderColor: C.goldDim, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
        <LinearGradient pointerEvents="none" colors={gizli ? ["#1A1714", "#0E0C0A"] : ["#6A2419", "#3A120C"]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        <View>{gizli ? <GizliMuhur boyut={44} /> : <BeceriIkon ad={n.ikon} boyut={46} renk={C.goldBright} vurgu={C.emberSoft} />}</View>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 17, lineHeight: 22, color: C.parchment, textAlign: hiza(rtl) }}>{ad}</Text>
        {!gizli ? <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 0.6, color: C.goldBright, textAlign: hiza(rtl) }}>{`${kademeAdi(t, n.kademe)} · ${applyParams(t("onl.ba.seviyeN"), [s, n.azami])}`}</Text> : null}
        <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{gizli ? t("onl.ba.gizliAciklama") : t("onl.ba.d." + n.id + ".a")}</Text>
      </View>
    </View>;
  const sol = <View style={{ flex: genis ? 1.15 : undefined, gap: 8 }}>
    {!gizli ? <View style={{ gap: 6 }}>
      {Array.from({ length: n.azami }, (_, i) => {
        const lv = i + 1, alindi = lv <= s, siradaki = lv === s + 1;
        return <View key={lv} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: alindi ? AG.mavi : siradaki ? C.goldBright : "rgba(168,148,110,0.4)", alignItems: "center", justifyContent: "center", backgroundColor: alindi ? "rgba(134,200,240,0.14)" : "transparent" }}>
            {alindi ? <Check size={12} color={AG.mavi} /> : <Text style={{ fontFamily: F.display, fontSize: 10.5, color: siradaki ? C.goldBright : C.parchmentMuted }}>{lv}</Text>}
          </View>
          <BeceriIkon ad="cekic" boyut={13} renk={siradaki ? C.goldBright : alindi ? AG.mavi : C.parchmentMuted} />
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, lineHeight: 18, color: siradaki ? C.parchment : alindi ? C.parchmentDim : C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.ba.d." + n.id + "." + lv)}</Text>
        </View>;
      })}
    </View> : null}
  </View>;

  let eylem: ReactNode;
  const altta = hali === "ogreniliyor" && !!kalan;
  if (hali === "ogreniliyor" && kalan) {
    eylem = <View style={{ gap: 8 }}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.emberSoft }}>{`${t("onl.ba.ogreniliyor")} · ${applyParams(t("onl.ba.seviyeN"), [d.ogrenme!.hedef, n.azami])}`}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{applyParams(t("onl.ba.kalan"), [sureYaz(t, kalan.dk)])}</Text>
      </View>
      <View accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(kalan.oran * 100) }} style={{ height: 8, borderRadius: 4, backgroundColor: "rgba(224,146,46,0.18)", overflow: "hidden", flexDirection: yon(rtl) }}>
        <View style={{ width: `${Math.round(kalan.oran * 100)}%`, backgroundColor: C.emberSoft }} />
      </View>
      <View style={{ flexDirection: yon(rtl), gap: 8 }}>
        <KucukDugme etiket={t("onl.ba.kisalt")} icon="hourglass" rtl={rtl} onPress={() => setKisaltNot(true)} />
        <KucukDugme etiket={t("onl.ba.vazgec")} icon="scroll" rtl={rtl} onPress={vazgec} />
      </View>
      <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t(kisaltNot ? "onl.ba.kisaltNot" : "onl.ba.vazgecNot")}</Text>
    </View>;
  } else if (hali === "tam") {
    eylem = <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, minHeight: 44 }}>
      <Check size={18} color={AG.mavi} />
      <Text style={{ flexShrink: 1, fontFamily: F.display, fontSize: 14, color: AG.mavi, textAlign: hiza(rtl) }}>{t("onl.ba.neden.tam")}</Text>
    </View>;
  } else {
    eylem = <View style={{ gap: 6 }}>
      {!gizli ? <OgrenDugmesi bedel={n.bedel} sure={sure} kapali={!!e} rtl={rtl} t={t} onPress={ogren} /> : null}
      {!gizli ? <Text style={{ fontFamily: F.serif, fontSize: 13, textAlign: "center", color: C.parchmentMuted }}>{applyParams(t("onl.ba.sure"), [sure])}</Text> : null}
      {e ? <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, textAlign: "center", color: e.tur === "suren" ? C.emberSoft : C.parchmentDim }}>{engelMetni(t, e)}</Text> : null}
    </View>;
  }

  const sag = <View style={{ flex: genis ? 1 : undefined, gap: 10 }}>
    {gereksinim.length ? <View style={{ gap: 4 }}>
      <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.ba.gereksinim")}</Text>
      {gereksinim.map((g, i) => <GereksinimSatiri key={i} tamam={g.tamam} metin={g.metin} rtl={rtl} t={t} />)}
    </View> : null}
    {altta ? null : eylem}
  </View>;

  return <View style={{ borderTopWidth: 1.5, borderColor: ONL.frame, backgroundColor: "rgba(16,12,9,0.97)" }}>
    {bitti ? <View accessibilityLiveRegion="polite" style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "rgba(63,127,168,0.22)", borderBottomWidth: 1, borderColor: "rgba(134,200,240,0.35)" }}>
      <Check size={14} color={AG.mavi} />
      <Text style={{ flexShrink: 1, fontFamily: F.display, fontSize: 13, color: C.parchment, textAlign: hiza(rtl) }}>{bitti}</Text>
    </View> : null}
    <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>{bas}</View>
    <View style={{ flexDirection: genis ? yon(rtl) : "column", gap: genis ? 16 : 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 }}>
      {sol}
      {genis ? <View style={{ width: 1, backgroundColor: "rgba(201,162,78,0.25)" }} /> : <View style={{ height: 1, backgroundColor: "rgba(201,162,78,0.2)" }} />}
      {sag}
    </View>
    {altta ? <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>{eylem}</View> : null}
  </View>;
}

// ---------------------------------------------------------------- sekmeler ve diğer iki sekme

function Sekmeler({ aktif, onSec, rtl, t }: { aktif: Sekme; onSec: (s: Sekme) => void; rtl: boolean; t: Ceviri }) {
  const liste: Sekme[] = ["aktif", "gecmis", "tum"];
  return <View accessibilityRole="tablist" style={{ flexDirection: yon(rtl), borderRadius: 10, borderWidth: 1, borderColor: "rgba(168,130,63,0.6)", backgroundColor: "rgba(14,10,6,0.75)", padding: 3, gap: 3 }}>
    {liste.map((s) => {
      const sec = s === aktif;
      return <Pressable key={s} accessibilityRole="tab" accessibilityState={{ selected: sec }} accessibilityLabel={t("onl.ba.sekme." + s)} onPress={() => { hap("selection"); onSec(s); }}
        style={{ flex: 1, minHeight: 44, borderRadius: 7, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, backgroundColor: sec ? "rgba(201,162,78,0.22)" : "transparent", borderWidth: sec ? 1 : 0, borderColor: C.goldBright }}>
        <Text numberOfLines={3} style={{ fontFamily: F.display, fontSize: 11.5, lineHeight: 14, letterSpacing: 0, textAlign: "center", color: sec ? C.goldBright : C.parchmentDim }}>{t("onl.ba.sekme." + s)}</Text>
      </Pressable>;
    })}
  </View>;
}

function Kart({ children }: { children: ReactNode }) {
  return <View style={{ borderRadius: 12, borderWidth: 1, borderColor: "rgba(168,130,63,0.55)", backgroundColor: "rgba(20,15,10,0.88)", padding: 14, gap: 8 }}>{children}</View>;
}

const CIFTCI = [{ id: "toprak", sv: 2, az: 3 }, { id: "tohum", sv: 1, az: 3 }];

function Gecmis({ d, rtl, t }: { d: AgacDurumu; rtl: boolean; t: Ceviri }) {
  const ogr = ogrenilmisler(d);
  const toplam = ogr.length + CIFTCI.length;
  const satir = (ikon: string, meslek: string, kademe: string, beceriler: string, aktif: boolean) => <Kart>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: aktif ? C.goldBright : ONL.frame, alignItems: "center", justifyContent: "center", backgroundColor: "#1A140D" }}>
        <BeceriIkon ad={ikon} boyut={26} renk={aktif ? C.goldBright : C.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, textAlign: hiza(rtl) }}>{`${meslek} — ${kademe}`}</Text>
        {aktif ? <Text style={{ fontFamily: F.display, fontSize: 11, color: C.sage, textAlign: hiza(rtl) }}>{t("onl.ba.aktifRozet")}</Text> : null}
      </View>
    </View>
    <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{beceriler}</Text>
  </Kart>;
  const ilerleme = 7, hedef = 20;
  return <View style={{ gap: 12 }}>
    <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.ba.gecmisAlt")}</Text>
    {satir("demircilik", t("onl.ba.meslek"), kademeAdi(t, d.kademe), ogr.map((n) => dugumAdi(t, n.id)).join(" · "), true)}
    {satir("bugday", t("onl.ba.meslekCiftci"), kademeAdi(t, "cirak"), CIFTCI.map((c) => t("onl.ba.c." + c.id)).join(" · "), false)}
    <Text style={{ fontFamily: F.display, fontSize: 13.5, color: C.goldBright, textAlign: hiza(rtl) }}>{applyParams(t("onl.ba.toplam"), [toplam])}</Text>
    <Text accessibilityRole="header" style={{ marginTop: 6, fontFamily: F.display, fontSize: 15, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.ba.unvanlar")}</Text>
    <Kart>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
        <GameIcon name="medal" size={24} color={C.parchmentMuted} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.ba.unvan.silah")}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchmentDim, textAlign: hiza(rtl) }}>{`${t("onl.ba.unvan.silah.k")} · ${ilerleme}/${hedef}`}</Text>
        </View>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(201,162,78,0.18)", overflow: "hidden", flexDirection: yon(rtl) }}>
        <View style={{ width: `${(ilerleme / hedef) * 100}%`, backgroundColor: C.gold }} />
      </View>
    </Kart>
  </View>;
}

function TumBeceriler({ d, rtl, t }: { d: AgacDurumu; rtl: boolean; t: Ceviri }) {
  const satirlar = [
    ...ogrenilmisler(d).map((n) => ({ key: n.id, ikon: n.ikon, ad: dugumAdi(t, n.id), meslek: t("onl.ba.meslek"), sv: sev(d, n.id), az: n.azami, etki: t("onl.ba.d." + n.id + "." + sev(d, n.id)) })),
    ...CIFTCI.map((c) => ({ key: c.id, ikon: "bugday", ad: t("onl.ba.c." + c.id), meslek: t("onl.ba.meslekCiftci"), sv: c.sv, az: c.az, etki: t("onl.ba.c." + c.id + ".e") })),
  ];
  return <View style={{ gap: 10 }}>
    <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.ba.tumAlt")}</Text>
    {satirlar.map((s) => <Kart key={s.key}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 12 }}>
        <View style={{ width: 48, height: 48, borderRadius: 9, borderWidth: 1.5, borderColor: s.sv >= s.az ? AG.mavi : AG.maviKoyu, alignItems: "center", justifyContent: "center", backgroundColor: "#1C1915" }}>
          <BeceriIkon ad={s.ikon} boyut={30} renk={AG.gumus} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchment, textAlign: hiza(rtl) }}>{s.ad}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 11.5, color: C.goldBright, textAlign: hiza(rtl) }}>{`${s.meslek} · ${s.sv}/${s.az}`}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>{s.etki}</Text>
        </View>
      </View>
    </Kart>)}
  </View>;
}

// ---------------------------------------------------------------- ekran

function YakinDugme({ etiket, isaret, kapali, onPress }: { etiket: string; isaret: "+" | "-"; kapali: boolean; onPress: () => void }) {
  return <Pressable accessibilityLabel={etiket} accessibilityState={{ disabled: kapali }} disabled={kapali} onPress={() => { hap("tap"); onPress(); }}
    style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", opacity: kapali ? 0.4 : 1 }}>
    <View style={{ width: 34, height: 34, borderRadius: 8, borderWidth: 1.2, borderColor: ONL.frame, backgroundColor: "rgba(14,10,6,0.8)", alignItems: "center", justifyContent: "center" }}>
      <Svg width={14} height={14} viewBox="0 0 14 14"><Path d={isaret === "+" ? "M2 7 H12 M7 2 V12" : "M2 7 H12"} stroke={C.goldBright} strokeWidth={2.2} strokeLinecap="round" /></Svg>
    </View>
  </Pressable>;
}

export function BeceriAgaciEkrani() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const ins = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { d, ogren, vazgec, kalan, bitti } = useSahteAgac();
  const [sekme, setSekme] = useState<Sekme>(ilkSekme);
  const [secili, setSecili] = useState<string>(ilkSecim);
  const [oi, setOi] = useState(1);
  const avail = width - 32;
  const L = useMemo(() => yerlesimKur(Math.round(avail * OLCEKLER[oi]), OLCEKLER[oi], rtl), [avail, oi, rtl]);
  const n = dugumBul(secili) ?? DEMIRCI_AGACI[4];
  const dar = width < 360;
  const genis = width >= 380;

  const yakinlas = (y: number) => setOi((i) => Math.max(0, Math.min(OLCEKLER.length - 1, i + y)));
  const tutam = Gesture.Pinch().runOnJS(true).onEnd((e: { scale: number }) => { if (e.scale > 1.12) yakinlas(1); else if (e.scale < 0.9) yakinlas(-1); });
  const bittiMetni = bitti ? applyParams(t("onl.ba.bitti"), [dugumAdi(t, bitti.id), bitti.seviye]) : null;

  const puanKutusu = <View accessible accessibilityLabel={`${t("onl.ba.puan")}: ${d.puan}`} style={{ minWidth: dar ? 128 : 92, maxWidth: dar ? 180 : 118, borderRadius: 10, borderWidth: 1.2, borderColor: ONL.frame, backgroundColor: "rgba(14,10,6,0.85)", paddingHorizontal: 8, paddingVertical: 6, flexDirection: yon(rtl), alignItems: "center", gap: 6 }}>
    <Ornament size={dar ? 18 : 22} color={C.goldBright} />
    <View style={{ alignItems: "center", flexShrink: 1 }}>
      <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 12, lineHeight: 14, textAlign: "center", color: C.parchmentDim }}>{t("onl.ba.puan")}</Text>
      <Text style={{ fontFamily: F.display, fontSize: dar ? 19 : 22, lineHeight: dar ? 23 : 27, color: C.parchment }}>{d.puan}</Text>
    </View>
  </View>;

  const arma = <View style={{ flex: dar ? undefined : 1, flexDirection: yon(rtl), alignItems: "center", justifyContent: "center", gap: 8, marginTop: dar ? 4 : 0 }}>
    <BeceriIkon ad="demircilik" boyut={dar ? 40 : 46} renk={C.gold} />
    <View style={{ flexShrink: 1 }}>
      <Text accessibilityRole="header" numberOfLines={2} style={{ fontFamily: F.display, fontSize: dar ? 21 : 22, lineHeight: dar ? 26 : 27, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.ba.meslek")}</Text>
      <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>{`${applyParams(t("onl.ba.sanat"), [t("onl.ba.meslek")])} · ${kademeAdi(t, d.kademe)}`}</Text>
    </View>
  </View>;
  const ust = dar ? <View>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", justifyContent: "space-between" }}>
      <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/meslek")} />
      {puanKutusu}
    </View>
    {arma}
  </View> : <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
    <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/meslek")} />
    {arma}
    {puanKutusu}
  </View>;

  const kontrol = <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 4, marginTop: 8 }}>
    <View style={{ flex: 1 }}>
      <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.ba.ornek")}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{applyParams(t("onl.ba.tavan"), [PUAN_TAVANI, AGAC_TOPLAM])}</Text>
    </View>
    <YakinDugme etiket={t("onl.ba.uzaklas")} isaret="-" kapali={oi === 0} onPress={() => yakinlas(-1)} />
    <YakinDugme etiket={t("onl.ba.yakinlas")} isaret="+" kapali={oi === OLCEKLER.length - 1} onPress={() => yakinlas(1)} />
  </View>;

  const agac = <GestureDetector gesture={tutam}>
    <View style={{ marginTop: 12, marginHorizontal: -16 }}>
      <ScrollView horizontal scrollEnabled={L.W > avail} showsHorizontalScrollIndicator={L.W > avail} contentContainerStyle={{ paddingHorizontal: 16, minWidth: width }}>
        <Agac L={L} d={d} secili={secili} onSec={setSecili} kalan={kalan} t={t} />
      </ScrollView>
    </View>
  </GestureDetector>;

  return <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
    <Sahne gorsel={SAHNE_GORSEL.atolye_demirci} oran={0.55} koyu={0.62}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: ins.top + 8, paddingHorizontal: 16, paddingBottom: 20 }}>
        {ust}
        <View style={{ marginTop: 12 }}><Sekmeler aktif={sekme} onSec={setSekme} rtl={rtl} t={t} /></View>
        {sekme === "aktif" ? <>{kontrol}{agac}</> : <View style={{ marginTop: 16 }}>{sekme === "gecmis" ? <Gecmis d={d} rtl={rtl} t={t} /> : <TumBeceriler d={d} rtl={rtl} t={t} />}</View>}
      </ScrollView>
      {sekme === "aktif" ? <View style={{ maxHeight: Math.round(height * 0.5) + ins.bottom, paddingBottom: ins.bottom, backgroundColor: "rgba(16,12,9,0.97)" }}>
        <ScrollView bounces={false} contentContainerStyle={{ flexGrow: 0 }}>
          <Panel key={n.id} n={n} d={d} kalan={kalan} ogren={() => ogren(n.id)} vazgec={vazgec} rtl={rtl} t={t} genis={genis} bitti={bittiMetni} />
        </ScrollView>
      </View> : null}
    </Sahne>
  </GestureHandlerRootView>;
}

