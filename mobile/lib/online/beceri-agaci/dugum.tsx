// Beceri ağacı parçaları: ikon çizici, düğüm (öğrenilmiş / seçili / öğreniliyor / kilitli / gizli), seviye rozeti,
// Pir defne çelengi ve kademe bölüm şeridi. Uygulama sağdan sola düzeni elle kurar (I18nManager kullanılmaz).
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, G, Rect, Ellipse, Defs, RadialGradient, Stop, Polygon, Line } from "react-native-svg";
import { DesignPressable as Pressable } from "../../design-pressable";
import { GameIcon } from "../../icons";
import { C, F } from "../../theme";
import { hap } from "../../haptics";
import { BECERI_IKON, type KatmanRengi } from "./ikonlar";
import type { BeceriDugumu } from "./demirci-ornek";
import type { DugumHali } from "./sahte";

/** Ağaç paleti: koyu demir zemin, öğrenilmiş için buz mavisi, seçili için altın. */
export const AG = {
  mavi: "#86C8F0",
  maviKoyu: "#3F7FA8",
  zemin: ["#2A2621", "#16130F"] as [string, string],
  kizil: ["#5E2119", "#2A0E0A"] as [string, string],
  altin: ["#4C3613", "#1E150A"] as [string, string],
  kenar: "rgba(170,160,140,0.45)",
  gumus: "#D6D0C4",
  sonuk: "#6F685E",
  cizgi: "rgba(150,140,120,0.32)",
};
const MAVI_HALE = { shadowColor: AG.mavi, shadowOpacity: 0.85, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } };
const ALTIN_HALE = { shadowColor: C.goldBright, shadowOpacity: 0.9, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } };

export function BeceriIkon({ ad, boyut, renk, vurgu = C.emberSoft }: { ad: string; boyut: number; renk: string; vurgu?: string }) {
  const tanim = BECERI_IKON[ad];
  if (!tanim) return null;
  const boya = (r?: KatmanRengi) => (r === "vurgu" ? vurgu : r === "koyu" ? "rgba(14,10,6,0.75)" : renk);
  return <Svg width={boyut} height={boyut} viewBox="0 0 512 512">
    {tanim.map((k, i) => <G key={i} transform={k.t}>
      {k.d.map((d, j) => <Path key={j} d={d} fill={boya(k.renk)} fillRule={k.tek ? "evenodd" : "nonzero"} />)}
    </G>)}
  </Svg>;
}

/** "1/3" seviye rozeti; düğümün alt kenarına biner. */
export function SeviyeRozeti({ metin, renk, yazi }: { metin: string; renk: string; yazi: string }) {
  return <View style={{ minWidth: 38, height: 19, paddingHorizontal: 7, borderRadius: 7, borderWidth: 1.2, borderColor: renk, backgroundColor: "#15120F", alignItems: "center", justifyContent: "center" }}>
    <Text style={{ fontFamily: F.display, fontSize: 11, lineHeight: 14, color: yazi }}>{metin}</Text>
  </View>;
}

/** Gizli düğümün "?" mührü. */
export function GizliMuhur({ boyut }: { boyut: number }) {
  return <View style={{ width: boyut, height: boyut, borderRadius: boyut / 2, borderWidth: 1.5, borderColor: C.goldDim, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(30,21,10,0.9)" }}>
    <View style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: boyut / 2, borderWidth: 1, borderColor: "rgba(160,122,58,0.45)", borderStyle: "dashed" }} />
    <Text style={{ fontFamily: F.display, fontSize: Math.round(boyut * 0.55), lineHeight: Math.round(boyut * 0.7), color: C.gold }}>?</Text>
  </View>;
}

export interface DugumOzellik {
  n: BeceriDugumu; hali: DugumHali; secili: boolean; seviye: number; oran?: number; kalanMetin?: string;
  w: number; h: number; ad: string; erisim: string; onSec: () => void;
}

export function Dugum({ n, hali, secili, seviye, oran = 0, kalanMetin, w, h, ad, erisim, onSec }: DugumOzellik) {
  const kilitli = hali === "kilitli", gizli = hali === "gizli", tam = hali === "tam", ogren = hali === "ogreniliyor";
  const kenar = secili ? C.goldBright : tam ? AG.mavi : hali === "ogrenildi" ? AG.maviKoyu : ogren ? C.emberSoft : AG.kenar;
  const ikonRenk = kilitli || gizli ? "#8A8276" : tam ? "#EAF5FC" : secili ? "#F1E6CF" : AG.gumus;
  const zemin = n.vurgu === "kizil" ? AG.kizil : n.vurgu === "altin" ? AG.altin : AG.zemin;
  const iconS = Math.round(w * 0.44);
  const fs = w < 82 ? 10.5 : 11.5;
  const r = 10;
  const cevre = 2 * (w + 6 + h + 6) - (8 - 2 * Math.PI) * (r + 3);
  return <Pressable accessibilityLabel={erisim} accessibilityState={{ selected: secili, disabled: false }} onPress={() => { hap("selection"); onSec(); }}
    style={{ width: w, height: h + 10, alignItems: "center" }}>
    <View style={[{ width: w, height: h, borderRadius: r }, secili ? ALTIN_HALE : tam ? MAVI_HALE : null]}>
      <View style={{ flex: 1, borderRadius: r, borderWidth: secili ? 2 : 1.5, borderColor: kenar, overflow: "hidden", opacity: kilitli ? 0.66 : 1 }}>
        <LinearGradient pointerEvents="none" colors={(kilitli || gizli) && !n.vurgu ? ["#1C1916", "#100E0B"] : zemin} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        {tam ? <LinearGradient pointerEvents="none" colors={["rgba(134,200,240,0.22)", "rgba(134,200,240,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: h * 0.6 }} /> : null}
        {secili ? <LinearGradient pointerEvents="none" colors={["rgba(243,210,122,0.24)", "rgba(243,210,122,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: h * 0.6 }} /> : null}
        <View pointerEvents="none" style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: r - 3, borderWidth: 1, borderColor: secili ? "rgba(243,210,122,0.35)" : "rgba(255,255,255,0.06)" }} />
        <View style={{ flex: 1, alignItems: "center", paddingTop: 7, paddingHorizontal: 4, paddingBottom: 11 }}>
          <View style={{ height: iconS, justifyContent: "center" }}>
            {gizli ? <GizliMuhur boyut={iconS} /> : <BeceriIkon ad={n.ikon} boyut={iconS} renk={ikonRenk} vurgu={kilitli ? AG.sonuk : n.vurgu === "kizil" ? C.ember : C.goldBright} />}
          </View>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text numberOfLines={3} style={{ fontFamily: F.serif, fontSize: fs, lineHeight: fs + 2, textAlign: "center", color: kilitli || gizli ? C.parchmentMuted : C.parchment }}>{ad}</Text>
          </View>
        </View>
      </View>
      {ogren ? <Svg pointerEvents="none" width={w + 8} height={h + 8} style={{ position: "absolute", top: -4, left: -4 }}>
        <Rect x={1.5} y={1.5} width={w + 5} height={h + 5} rx={r + 3} fill="none" stroke="rgba(224,146,46,0.25)" strokeWidth={3} />
        <Rect x={1.5} y={1.5} width={w + 5} height={h + 5} rx={r + 3} fill="none" stroke={C.emberSoft} strokeWidth={3} strokeLinecap="round" strokeDasharray={`${cevre} ${cevre}`} strokeDashoffset={cevre * (1 - oran)} />
      </Svg> : null}
      {ogren && kalanMetin ? <View pointerEvents="none" style={{ position: "absolute", top: -11, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, height: 20, borderRadius: 10, backgroundColor: "#2A1A0C", borderWidth: 1, borderColor: C.emberSoft }}>
        <GameIcon name="hourglass" size={11} color={C.emberSoft} />
        <Text style={{ fontFamily: F.display, fontSize: 10.5, color: C.parchment }}>{kalanMetin}</Text>
      </View> : null}
    </View>
    <View pointerEvents="none" style={{ position: "absolute", top: h - 10 }}>
      <SeviyeRozeti metin={gizli ? "?" : `${seviye}/${n.azami}`} renk={kenar} yazi={kilitli || gizli ? C.parchmentMuted : C.parchment} />
    </View>
  </Pressable>;
}

/** Pir düğümünün altın halesi ve defne çelengi (düğümün arkasına çizilir). */
export function Celenk({ boyut }: { boyut: number }) {
  const c = boyut / 2, R = boyut * 0.4;
  const yapraklar: { x: number; y: number; a: number }[] = [];
  for (const yan of [-1, 1]) for (let i = 0; i < 9; i++) {
    const a = (Math.PI / 180) * (115 + i * 15);
    const aci = yan < 0 ? a : Math.PI - a;
    yapraklar.push({ x: c + R * Math.cos(aci), y: c + R * Math.sin(aci) * 0.92 + boyut * 0.04, a: (aci * 180) / Math.PI + 90 + yan * 18 });
  }
  return <Svg pointerEvents="none" width={boyut} height={boyut}>
    <Defs>
      <RadialGradient id="pirHale" cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor={C.goldBright} stopOpacity={0.6} />
        <Stop offset="0.6" stopColor={C.emberSoft} stopOpacity={0.24} />
        <Stop offset="1" stopColor={C.emberSoft} stopOpacity={0} />
      </RadialGradient>
    </Defs>
    <Ellipse cx={c} cy={c} rx={c} ry={c * 0.85} fill="url(#pirHale)" />
    {yapraklar.map((y, i) => <Ellipse key={i} cx={y.x} cy={y.y} rx={boyut * 0.052} ry={boyut * 0.02} fill={i % 2 ? C.gold : C.goldDim} transform={`rotate(${y.a.toFixed(1)} ${y.x.toFixed(1)} ${y.y.toFixed(1)})`} />)}
  </Svg>;
}

/** Kademe bölüm şeridi: iki ucu sivri, altın kenarlı; üst ortada elmas. */
export function KademeSeridi({ en, boy, baslik, alt }: { en: number; boy: number; baslik: string; alt: string }) {
  const u = 16;
  const nokta = `${u},1 ${en - u},1 ${en - 1},${boy / 2} ${en - u},${boy - 1} ${u},${boy - 1} 1,${boy / 2}`;
  const ic = `${u + 3},5 ${en - u - 3},5 ${en - 6},${boy / 2} ${en - u - 3},${boy - 5} ${u + 3},${boy - 5} 6,${boy / 2}`;
  return <View style={{ width: en, height: boy }}>
    <Svg pointerEvents="none" width={en} height={boy + 8} style={{ position: "absolute", top: -4, left: 0 }}>
      <G transform="translate(0 4)">
        <Polygon points={nokta} fill="#18140F" stroke="rgba(201,162,78,0.75)" strokeWidth={1.4} />
        <Polygon points={ic} fill="none" stroke="rgba(201,162,78,0.22)" strokeWidth={1} />
        <Line x1={en * 0.3} y1={boy - 1} x2={en * 0.7} y2={boy - 1} stroke={C.goldBright} strokeWidth={1} strokeOpacity={0.5} />
      </G>
      <Polygon points={`${en / 2},0 ${en / 2 + 7},7 ${en / 2},14 ${en / 2 - 7},7`} fill={C.goldDim} stroke={C.goldBright} strokeWidth={1} />
    </Svg>
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: u + 4, paddingTop: 4 }}>
      <Text accessibilityRole="header" numberOfLines={1} style={{ fontFamily: F.display, fontSize: 18, lineHeight: 23, color: C.parchment }}>{baslik}</Text>
      <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 15, textAlign: "center", color: C.parchmentDim }}>{alt}</Text>
    </View>
  </View>;
}
