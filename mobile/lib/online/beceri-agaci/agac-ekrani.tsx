// Beceri ağacı v2 ekranı — 14 meslek (tasarım §2, §3, §5, §9). `/online/beceri-agaci?meslek=ciftci`; meslek
// verilmezse Demircilik açılır. Veri GET /v1/beceri (durum.ts useBeceri); oturum yoksa sahte istemci (önizleme).
// Düzen: üstte geri, meslek arması, kademe ve beceri puanı; sekmeler (Aktif Mesleğim · Mesleki Geçmişim · Tüm
// Beceriler); kademe şeritleri, üç sütun düğüm ve ön koşul çizgileri; altta seçili düğüm paneli. Zemin ve vurgu rengi
// mesleğin temasından (tema.ts). Sistemi henüz bağlı olmayan etkiler "Yakında" rozetiyle. Yakınlaştırma: iki parmak ya da +/-.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { View, Text, ScrollView, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { MESLEK_IDLERI, type MeslekId, type OnlineHata } from "../protokol";
import { hataAnahtari } from "../hata";
import { Carpi, Check, GeriDugme, ONL, Ornament, Sahne, geriGit, hiza, yon } from "../ui";
import { MESLEK_ARMA, PUAN_TAVANI_VARSAYILAN, agacToplam, aynaDugum, kademeAdOf, meslekMi, varsayilanSecim, type KademeAd } from "./agaclar";
import { AGAC_TEMA, type AgacTema } from "./tema";
import { ilkDugum, ilkSekme, onizlemeMeslegi, useBeceri, type Bildirim, type Sekme } from "./durum";
import type { BeceriAgaci, DugumGorunumu, KilitKodu, MeslekiGecmis } from "./beceri-veri";
import { AG, BeceriIkon, Celenk, Dugum, GizliMuhur, KademeSeridi, type DugumHali } from "./dugum";

type Ceviri = (k: string) => string;

const OLCEKLER = [0.85, 1, 1.2, 1.4];
const dugumAdi = (t: Ceviri, id: string) => t("onl.ba." + id);
const kademeAdi = (t: Ceviri, k: KademeAd | number) => t("onl.kd." + (typeof k === "number" ? kademeAdOf(k) : k));
const meslekAdi = (t: Ceviri, m: MeslekId) => t("onl.ba.m." + m);
const kancaVar = (n: DugumGorunumu, seviye: number) => !!n.seviyeler?.[seviye - 1]?.etkiler.some((e) => e.kanca);

export function sureYaz(t: Ceviri, dk: number): string {
  if (dk < 60) return applyParams(t("onl.ba.dk"), [dk]);
  const sa = Math.floor(dk / 60), kalan = dk % 60;
  return kalan ? applyParams(t("onl.ba.saDk"), [sa, kalan]) : applyParams(t("onl.ba.sa"), [sa]);
}

/** Sunucu durumu → çizim hâli. "Açık": ön koşul ve kademe tamam (puan ve süren öğrenme ayrıca söylenir). */
function haliOf(n: DugumGorunumu): DugumHali {
  if (n.durum === "gizli" || !n.gorunur) return "gizli";
  if (n.durum === "ogreniliyor") return "ogreniliyor";
  if (n.durum === "ogrenildi" || n.seviye >= n.azami) return "tam";
  if (n.seviye > 0) return "ogrenildi";
  return n.kilit.every((k) => k === "puan" || k === "ogrenme_suruyor") ? "acik" : "kilitli";
}
const SIRALI_KILIT: KilitKodu[] = ["gizli", "seviye_tavan", "ogrenme_suruyor", "on_kosul", "kademe", "puan"];
function engelMetni(t: Ceviri, n: DugumGorunumu): string | null {
  const k = SIRALI_KILIT.find((x) => n.kilit.includes(x));
  switch (k) {
    case "gizli": return t("onl.ba.neden.gizli");
    case "seviye_tavan": return t("onl.ba.neden.tam");
    case "ogrenme_suruyor": return t("onl.ba.neden.suren");
    case "on_kosul": return t("onl.ba.neden.onKosul");
    case "kademe": return applyParams(t("onl.ba.neden.kademe"), [kademeAdi(t, n.kademeSarti ?? n.kademe)]);
    case "puan": return applyParams(t("onl.ba.neden.puan"), [n.sonraki?.bedel ?? 0]);
    default: return null;
  }
}
const BECERI_HATA: Partial<Record<OnlineHata, string>> = {
  ogrenme_suruyor: "onl.ba.neden.suren", on_kosul_eksik: "onl.ba.neden.onKosul", seviye_tavan: "onl.ba.neden.tam", dugum_gizli: "onl.ba.neden.gizli",
  hizlandirma_yok: "onl.ba.h.hizlandirmaYok", hizlandirma_kapali: "onl.ba.kisaltDebdebe", ogrenme_yok: "onl.ba.h.ogrenmeYok",
  yeniden_bos: "onl.ba.h.yenidenBos", puan_yok: "onl.h.puanYok", kademe_kapali: "onl.h.kademeKapali", para_yok: "onl.ba.h.paraYok",
};
const hataMetni = (t: Ceviri, kod: OnlineHata) => t(BECERI_HATA[kod] ?? hataAnahtari(kod));

// ---------------------------------------------------------------- yerleşim (mutlak konumlar)

interface Yerlesim {
  W: number; colW: number; w: number; h: number; H: number;
  satirY: Record<number, number>;
  seritler: { kademe: string; alt: string; y: number }[];
  bolumler: { y: number; boy: number }[];
  x: (sutun: number) => number;
}

/** Kademe bölümleri; alt yazı mesleğe özgüdür (onl.ba.k.<meslek>.<kademe>), gizli bölüm ortaktır. */
const BOLUMLER: { baslik: string; alt: KademeAd | "gizli"; siralar: number[] }[] = [
  { baslik: "onl.kd.cirak", alt: "cirak", siralar: [0] },
  { baslik: "onl.kd.kalfa", alt: "kalfa", siralar: [1, 2] },
  { baslik: "onl.kd.usta", alt: "usta", siralar: [3] },
  { baslik: "onl.kd.pir", alt: "pir", siralar: [4] },
  { baslik: "onl.ba.gizliBaslik", alt: "gizli", siralar: [5] },
];
const SERIT_BOY = 60;

function yerlesimKur(W: number, olcek: number, rtl: boolean, m: MeslekId): Yerlesim {
  const colW = W / 3;
  const w = Math.round(Math.min(colW * 0.8, 106 * olcek));
  const fs = w < 82 ? 10.5 : 11.5;
  const h = Math.round(7 + w * 0.44 + 4 + (fs + 2) * 3 + 11);
  const satirY: Record<number, number> = {};
  const seritler: Yerlesim["seritler"] = [], bolumler: Yerlesim["bolumler"] = [];
  let y = 6;
  for (const b of BOLUMLER) {
    const bas = y;
    seritler.push({ kademe: b.baslik, alt: b.alt === "gizli" ? "onl.ba.gizliAlt" : `onl.ba.k.${m}.${b.alt}`, y });
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

function Cizgiler({ L, liste }: { L: Yerlesim; liste: readonly DugumGorunumu[] }) {
  const acik: string[] = [], sonuk: string[] = [];
  const bul = (id: string) => liste.find((x) => x.id === id);
  for (const n of liste) for (const o of n.onKosul ?? []) {
    const s = bul(o.dugum);
    if (!s) continue;
    const sx = L.x(s.sutun), sy = L.satirY[s.sira] + L.h + 10, tx = L.x(n.sutun), ty = L.satirY[n.sira] - (n.sira === 4 ? 24 : 4);
    if (ty <= sy) continue;
    const ym = ty - (n.sira === 4 ? 6 : 14);
    const yolu = sx === tx ? `M${sx} ${sy} V${ty}` : `M${sx} ${sy} V${ym} H${tx} V${ty}`;
    (o.tamam ? acik : sonuk).push(yolu);
  }
  return <Svg pointerEvents="none" width={L.W} height={L.H} style={{ position: "absolute", top: 0, left: 0 }}>
    {sonuk.map((p, i) => <Path key={"s" + i} d={p} stroke={AG.cizgi} strokeWidth={2} fill="none" />)}
    {acik.map((p, i) => <Path key={"a" + i} d={p} stroke={AG.mavi} strokeOpacity={0.28} strokeWidth={6} fill="none" strokeLinejoin="round" />)}
    {acik.map((p, i) => <Path key={"b" + i} d={p} stroke="#BFE3F7" strokeWidth={2} fill="none" strokeLinejoin="round" />)}
  </Svg>;
}

const vurguOf = (n: DugumGorunumu) => (n.bolum === "pir" ? "altin" as const : n.bolum === "usta" && n.sutun === 1 ? "meslek" as const : undefined);

function Agac({ L, liste, tema, secili, onSec, kalan, t }: { L: Yerlesim; liste: readonly DugumGorunumu[]; tema: AgacTema; secili: string; onSec: (id: string) => void; kalan: { oran: number; dk: number } | null; t: Ceviri }) {
  const seritEn = Math.round(L.colW * 2 - 12);
  return <View style={{ width: L.W, height: L.H }}>
    {L.bolumler.map((b, i) => <View key={i} pointerEvents="none" style={{ position: "absolute", top: b.y, left: 0, width: L.W, height: b.boy, borderRadius: 14, borderWidth: 1, borderColor: tema.bolumKenar, backgroundColor: tema.bolum }} />)}
    <Cizgiler L={L} liste={liste} />
    {L.seritler.map((s) => <View key={s.kademe} style={{ position: "absolute", top: s.y, left: (L.W - seritEn) / 2 }}>
      <KademeSeridi en={seritEn} boy={SERIT_BOY} baslik={t(s.kademe)} alt={t(s.alt)} dolgu={tema.serit} />
    </View>)}
    {liste.map((n) => {
      const hali = haliOf(n);
      const cx = L.x(n.sutun), y = L.satirY[n.sira];
      if (y === undefined) return null;
      const ad = hali === "gizli" ? t("onl.ba.gizli") : dugumAdi(t, n.id);
      const kalanMetin = hali === "ogreniliyor" && kalan ? sureYaz(t, kalan.dk) : undefined;
      const durum = t("onl.ba.durum." + hali);
      const erisim = `${ad}. ${applyParams(t("onl.ba.seviyeN"), [n.seviye, n.azami])}. ${durum}${kalanMetin ? ". " + applyParams(t("onl.ba.kalan"), [kalanMetin]) : ""}`;
      const celenk = Math.round(L.w * 1.9);
      return <View key={n.id} style={{ position: "absolute", top: y, left: cx - L.w / 2, width: L.w }}>
        {n.sira === 4 ? <View pointerEvents="none" style={{ position: "absolute", top: (L.h - celenk) / 2 + 4, left: (L.w - celenk) / 2 }}><Celenk boyut={celenk} /></View> : null}
        <Dugum n={{ ikon: n.ikon, azami: n.azami, vurgu: vurguOf(n) }} hali={hali} secili={secili === n.id} seviye={n.seviye} oran={kalan?.oran} kalanMetin={kalanMetin} w={L.w} h={L.h} ad={ad} erisim={erisim} onSec={() => onSec(n.id)} tema={tema} />
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

function YakindaRozeti({ t }: { t: Ceviri }) {
  return <View style={{ paddingHorizontal: 6, height: 18, borderRadius: 9, borderWidth: 1, borderColor: "rgba(224,146,46,0.6)", backgroundColor: "rgba(224,146,46,0.12)", justifyContent: "center" }}>
    <Text style={{ fontFamily: F.display, fontSize: 10, lineHeight: 13, color: C.emberSoft }}>{t("onl.ba.yakinda")}</Text>
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

function KucukDugme({ etiket, icon, onPress, rtl, kapali }: { etiket: string; icon: string; onPress: () => void; rtl: boolean; kapali?: boolean }) {
  return <Pressable accessibilityLabel={etiket} accessibilityState={{ disabled: !!kapali }} disabled={kapali} onPress={() => { hap("tap"); onPress(); }}
    style={({ pressed }) => ({ flex: 1, minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: ONL.frameHi, opacity: kapali ? 0.5 : 1, backgroundColor: pressed ? "rgba(201,162,78,0.24)" : "rgba(201,162,78,0.1)", flexDirection: yon(rtl), alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 8 })}>
    <GameIcon name={icon} size={15} color={C.goldBright} />
    <Text numberOfLines={2} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 13, color: C.goldBright, textAlign: "center" }}>{etiket}</Text>
  </Pressable>;
}

function Panel({ n, agac, liste, tema, kalan, mesgul, ogren, iptal, kisalt, rtl, t, genis, bildirim }: {
  n: DugumGorunumu; agac: BeceriAgaci; liste: readonly DugumGorunumu[]; tema: AgacTema; kalan: { oran: number; dk: number } | null; mesgul: boolean;
  ogren: () => void; iptal: () => void; kisalt: () => void; rtl: boolean; t: Ceviri; genis: boolean; bildirim: string | null;
}) {
  const hali = haliOf(n), gizli = hali === "gizli";
  const s = n.seviye;
  const sonraki = n.sonraki ?? null;
  const e = engelMetni(t, n);
  const sure = sonraki ? sureYaz(t, Math.round(sonraki.sureMs / 60_000) || n.seviyeler?.[sonraki.seviye - 1]?.sureDk || 0) : "";
  const sureDk = sonraki ? n.seviyeler?.[sonraki.seviye - 1]?.sureDk ?? 0 : 0;
  const ad = gizli ? t("onl.ba.gizliYetenek") : dugumAdi(t, n.id);
  const ogr = agac.ogrenme && agac.ogrenme.dugum === n.id ? agac.ogrenme : null;

  const gereksinim: { tamam: boolean; metin: string }[] = [];
  if (!gizli) {
    const ok = n.onKosul ?? [];
    if (n.onKosulBiri && ok.length) {
      const o = ok[0];
      gereksinim.push({ tamam: ok.some((k) => k.tamam), metin: applyParams(t("onl.ba.herhangi"), [o.seviye, o.seviye]) });
    } else for (const o of ok) {
      const k = liste.find((x) => x.id === o.dugum);
      const sv = k?.seviye ?? 0;
      gereksinim.push({ tamam: o.tamam, metin: `${kademeAdi(t, k?.kademe ?? 0)}: ${dugumAdi(t, o.dugum)} (${Math.min(sv, o.seviye)}/${o.seviye})` });
    }
    gereksinim.push({ tamam: !n.kilit.includes("kademe"), metin: applyParams(t("onl.ba.kademeSarti"), [kademeAdi(t, n.kademeSarti ?? n.kademe)]) });
    if (sonraki && hali !== "ogreniliyor") gereksinim.push({ tamam: !n.kilit.includes("puan"), metin: applyParams(t("onl.ba.puanSarti"), [sonraki.bedel]) });
  }

  const bas = <View style={{ flexDirection: yon(rtl), gap: 12, alignItems: "flex-start" }}>
    <View style={{ width: 66, height: 66, borderRadius: 10, borderWidth: 1.5, borderColor: C.goldDim, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
      <LinearGradient pointerEvents="none" colors={gizli ? ["#1A1714", "#0E0C0A"] : tema.renkli} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <View>{gizli ? <GizliMuhur boyut={44} /> : <BeceriIkon ad={n.ikon} boyut={46} renk={C.goldBright} vurgu={tema.vurguKoyu} />}</View>
    </View>
    <View style={{ flex: 1, gap: 3 }}>
      <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 17, lineHeight: 22, color: C.parchment, textAlign: hiza(rtl) }}>{ad}</Text>
      {!gizli ? <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 0.6, color: C.goldBright, textAlign: hiza(rtl) }}>{`${kademeAdi(t, n.kademe)} · ${applyParams(t("onl.ba.seviyeN"), [s, n.azami])}`}</Text> : null}
      <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{gizli ? t("onl.ba.gizliAciklama") : t("onl.ba." + n.id + ".a")}</Text>
    </View>
  </View>;
  const sol = !gizli ? <View style={{ flex: genis ? 1.15 : undefined, gap: 6 }}>
    {Array.from({ length: n.azami }, (_, i) => {
      const lv = i + 1, alindi = lv <= s, siradaki = lv === s + 1;
      return <View key={lv} style={{ flexDirection: yon(rtl), alignItems: "flex-start", gap: 8 }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: alindi ? AG.mavi : siradaki ? C.goldBright : "rgba(168,148,110,0.4)", alignItems: "center", justifyContent: "center", backgroundColor: alindi ? "rgba(134,200,240,0.14)" : "transparent" }}>
          {alindi ? <Check size={12} color={AG.mavi} /> : <Text style={{ fontFamily: F.display, fontSize: 10.5, color: siradaki ? C.goldBright : C.parchmentMuted }}>{lv}</Text>}
        </View>
        <BeceriIkon ad={n.ikon} boyut={14} renk={siradaki ? C.goldBright : alindi ? AG.mavi : C.parchmentMuted} vurgu={siradaki ? tema.vurgu : alindi ? AG.mavi : C.parchmentMuted} />
        <View style={{ flex: 1, gap: 3, alignItems: rtl ? "flex-end" : "flex-start" }}>
          <Text style={{ alignSelf: "stretch", fontFamily: F.serif, fontSize: 14, lineHeight: 18, color: siradaki ? C.parchment : alindi ? C.parchmentDim : C.parchmentMuted, textAlign: hiza(rtl) }}>{t(n.seviyeler?.[i]?.metin ?? `onl.ba.${n.id}.s${lv}`)}</Text>
          {kancaVar(n, lv) ? <YakindaRozeti t={t} /> : null}
        </View>
      </View>;
    })}
  </View> : null;

  let eylem: ReactNode;
  const altta = !!ogr && !!kalan;
  if (ogr && kalan) {
    eylem = <View style={{ gap: 8 }}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.emberSoft }}>{`${t("onl.ba.ogreniliyor")} · ${applyParams(t("onl.ba.seviyeN"), [ogr.seviye ?? s + 1, n.azami])}`}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{applyParams(t("onl.ba.kalan"), [sureYaz(t, kalan.dk)])}</Text>
      </View>
      <View accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(kalan.oran * 100) }} style={{ height: 8, borderRadius: 4, backgroundColor: "rgba(224,146,46,0.18)", overflow: "hidden", flexDirection: yon(rtl) }}>
        <View style={{ width: `${Math.round(kalan.oran * 100)}%`, backgroundColor: C.emberSoft }} />
      </View>
      <View style={{ flexDirection: yon(rtl), gap: 8 }}>
        <KucukDugme etiket={t(ogr.egitimleKisaldi ? "onl.ba.kisaldi" : "onl.ba.kisaltEgitim")} icon="hourglass" rtl={rtl} kapali={mesgul || ogr.egitimleKisaldi} onPress={kisalt} />
        <KucukDugme etiket={t("onl.ba.vazgec")} icon="scroll" rtl={rtl} kapali={mesgul} onPress={iptal} />
      </View>
      <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{`${t("onl.ba.kisaltDebdebe")} · ${t("onl.ba.vazgecNot")}`}</Text>
    </View>;
  } else if (hali === "tam") {
    eylem = <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, minHeight: 44 }}>
      <Check size={18} color={AG.mavi} />
      <Text style={{ flexShrink: 1, fontFamily: F.display, fontSize: 14, color: AG.mavi, textAlign: hiza(rtl) }}>{t("onl.ba.neden.tam")}</Text>
    </View>;
  } else {
    eylem = <View style={{ gap: 6 }}>
      {!gizli && sonraki ? <OgrenDugmesi bedel={sonraki.bedel} sure={sure} kapali={mesgul || n.kilit.length > 0} rtl={rtl} t={t} onPress={ogren} /> : null}
      {!gizli && sonraki ? <Text style={{ fontFamily: F.serif, fontSize: 13, textAlign: "center", color: C.parchmentMuted }}>{applyParams(t("onl.ba.sure"), [sureYaz(t, sureDk)])}</Text> : null}
      {e ? <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, textAlign: "center", color: n.kilit.includes("ogrenme_suruyor") ? C.emberSoft : C.parchmentDim }}>{e}</Text> : null}
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
    {bildirim ? <View accessibilityLiveRegion="polite" style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "rgba(63,127,168,0.22)", borderBottomWidth: 1, borderColor: "rgba(134,200,240,0.35)" }}>
      <Check size={14} color={AG.mavi} />
      <Text style={{ flexShrink: 1, fontFamily: F.display, fontSize: 13, color: C.parchment, textAlign: hiza(rtl) }}>{bildirim}</Text>
    </View> : null}
    <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>{bas}</View>
    <View style={{ flexDirection: genis ? yon(rtl) : "column", gap: genis ? 16 : 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 }}>
      {sol}
      {sol ? genis ? <View style={{ width: 1, backgroundColor: "rgba(201,162,78,0.25)" }} /> : <View style={{ height: 1, backgroundColor: "rgba(201,162,78,0.2)" }} /> : null}
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

function Arma({ m, boyut, aktif }: { m: MeslekId; boyut: number; aktif?: boolean }) {
  return <View style={{ width: boyut, height: boyut, borderRadius: boyut / 2, borderWidth: 1.5, borderColor: aktif ? C.goldBright : ONL.frame, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
    <LinearGradient pointerEvents="none" colors={AGAC_TEMA[m].zemin} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
    <BeceriIkon ad={MESLEK_ARMA[m]} boyut={Math.round(boyut * 0.62)} renk={aktif ? C.goldBright : C.gold} vurgu={AGAC_TEMA[m].vurgu} />
  </View>;
}

function Gecmis({ g, aktif, acik, onAc, rtl, t }: { g: MeslekiGecmis | null; aktif: MeslekId; acik: MeslekId; onAc: (m: MeslekId) => void; rtl: boolean; t: Ceviri }) {
  const { width } = useWindowDimensions();
  const satirlar = g?.meslekler ?? [];
  const kalan = MESLEK_IDLERI.filter((m) => !satirlar.some((x) => x.meslek === m));
  const sutun = width - 32 >= 340 ? 3 : 2;
  const cipEn = Math.floor((width - 32 - 8 * (sutun - 1)) / sutun);
  const baslik = (k: string) => <Text accessibilityRole="header" style={{ marginTop: 6, fontFamily: F.display, fontSize: 15, color: C.parchment, textAlign: hiza(rtl) }}>{t(k)}</Text>;
  return <View style={{ gap: 12 }}>
    <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.ba.gecmisAlt")}</Text>
    {satirlar.map((x) => {
      const ad = meslekAdi(t, x.meslek), kd = kademeAdi(t, x.kademe);
      return <Pressable key={x.meslek} accessibilityRole="button" accessibilityLabel={`${ad} — ${kd}. ${applyParams(t("onl.ba.agaciAc"), [ad])}`} onPress={() => { hap("selection"); onAc(x.meslek); }}
        style={({ pressed }) => ({ borderRadius: 12, borderWidth: 1, borderColor: x.meslek === acik ? C.goldBright : "rgba(168,130,63,0.55)", backgroundColor: pressed ? "rgba(36,27,16,0.95)" : "rgba(20,15,10,0.88)", padding: 14, gap: 8 })}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
          <Arma m={x.meslek} boyut={46} aktif={x.meslek === aktif} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment, textAlign: hiza(rtl) }}>{`${ad} — ${kd}`}</Text>
            {x.meslek === aktif ? <Text style={{ fontFamily: F.display, fontSize: 11, color: C.sage, textAlign: hiza(rtl) }}>{t("onl.ba.aktifRozet")}</Text> : null}
          </View>
          <GameIcon name="scroll-open" size={18} color={C.gold} />
        </View>
        <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{x.ogrenilen.length ? x.ogrenilen.map((o) => dugumAdi(t, o.dugum)).join(" · ") : t("onl.ba.bosMeslek")}</Text>
      </Pressable>;
    })}
    <Text style={{ fontFamily: F.display, fontSize: 13.5, color: C.goldBright, textAlign: hiza(rtl) }}>{applyParams(t("onl.ba.toplam"), [g?.toplamBeceri ?? 0])}</Text>
    {baslik("onl.ba.unvanlar")}
    {g?.unvanlar.length ? g.unvanlar.map((u) => <Kart key={u.id}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
        <GameIcon name="medal" size={24} color={C.goldBright} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.unvan." + u.id)}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchmentDim, textAlign: hiza(rtl) }}>{`${u.meslek ? meslekAdi(t, u.meslek) + " · " : ""}${t("onl.ba.unvanKazanildi")}`}</Text>
        </View>
      </View>
    </Kart>) : <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.ba.unvanYok")}</Text>}
    {kalan.length ? <>
      {baslik("onl.ba.digerMeslek")}
      <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.ba.digerAlt")}</Text>
      <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 8 }}>
        {kalan.map((m) => <Pressable key={m} accessibilityRole="button" accessibilityLabel={applyParams(t("onl.ba.agaciAc"), [meslekAdi(t, m)])} onPress={() => { hap("selection"); onAc(m); }}
          style={({ pressed }) => ({ width: cipEn, minHeight: 84, borderRadius: 10, borderWidth: 1, borderColor: m === acik ? C.goldBright : "rgba(168,130,63,0.45)", backgroundColor: pressed ? "rgba(36,27,16,0.95)" : "rgba(20,15,10,0.8)", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 6, paddingVertical: 8 })}>
          <Arma m={m} boyut={40} />
          <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: 11.5, lineHeight: 14, textAlign: "center", color: C.parchmentDim }}>{meslekAdi(t, m)}</Text>
        </Pressable>)}
      </View>
    </> : null}
  </View>;
}

function TumBeceriler({ g, rtl, t }: { g: MeslekiGecmis | null; rtl: boolean; t: Ceviri }) {
  const liste = (g?.meslekler ?? []).filter((x) => x.ogrenilen.length > 0);
  return <View style={{ gap: 10 }}>
    <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.ba.tumAlt")}</Text>
    {liste.map((x) => {
      const tema = AGAC_TEMA[x.meslek];
      return <View key={x.meslek} style={{ gap: 8 }}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, marginTop: 6 }}>
          <Arma m={x.meslek} boyut={32} />
          <Text accessibilityRole="header" style={{ flex: 1, fontFamily: F.display, fontSize: 15, color: C.parchment, textAlign: hiza(rtl) }}>{meslekAdi(t, x.meslek)}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>{applyParams(t("onl.ba.beceriN"), [x.ogrenilen.length])}</Text>
        </View>
        {x.ogrenilen.map((o) => {
          const a = aynaDugum(o.dugum);
          const azami = a?.azami ?? o.seviye;
          return <Kart key={o.dugum}>
            <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 9, borderWidth: 1.5, borderColor: o.seviye >= azami ? AG.mavi : AG.maviKoyu, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <LinearGradient pointerEvents="none" colors={tema.zemin} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
                {a ? <BeceriIkon ad={a.ikon} boyut={30} renk={AG.gumus} vurgu={tema.vurgu} /> : null}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchment, textAlign: hiza(rtl) }}>{dugumAdi(t, o.dugum)}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 11.5, color: C.goldBright, textAlign: hiza(rtl) }}>{`${a ? t("onl.ba.bolum." + a.bolum) : ""} · ${o.seviye}/${azami}`}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t(`onl.ba.${o.dugum}.s${o.seviye}`)}</Text>
              </View>
            </View>
          </Kart>;
        })}
      </View>;
    })}
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

function bildirimMetni(t: Ceviri, b: Bildirim | null): string | null {
  if (!b) return null;
  switch (b.tur) {
    case "bitti": return applyParams(t("onl.ba.bitti"), [dugumAdi(t, b.id), b.seviye]);
    case "kisaldi": return t("onl.ba.kisaldiNot");
    case "yeniden": return applyParams(t("onl.ba.yenidenBitti"), [b.iade, b.bedel]);
    case "hata": return hataMetni(t, b.kod);
  }
}

export function BeceriAgaciEkrani() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const ins = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const prm0 = useLocalSearchParams<{ meslek?: string }>();
  const prm = { meslek: prm0.meslek ?? onizlemeMeslegi() ?? undefined };
  const [aktif] = useState<MeslekId>(() => (meslekMi(prm.meslek) ? prm.meslek : "demirci"));
  const [m, setM] = useState<MeslekId>(aktif);
  const b = useBeceri(aktif, m);
  const [sekme, setSekme] = useState<Sekme>(ilkSekme);
  const [secili, setSecili] = useState<string>(() => ilkDugum(aktif) ?? varsayilanSecim(aktif));
  const [onay, setOnay] = useState(false);
  const [oi, setOi] = useState(1);
  const avail = width - 32;
  const L = useMemo(() => yerlesimKur(Math.round(avail * OLCEKLER[oi]), OLCEKLER[oi], rtl, m), [avail, oi, rtl, m]);
  const tema = AGAC_TEMA[m];
  const agac = b.agac?.meslek === m ? b.agac : null;
  const liste = agac?.dugumler ?? [];
  const n = liste.find((x) => x.id === secili) ?? liste.find((x) => x.id === varsayilanSecim(m)) ?? liste[0];
  const dar = width < 360;
  const genis = width >= 380;

  // Dışarıdan başka meslek istenirse (meslek ekranından yeniden gelince) o ağaca geç.
  useEffect(() => { if (meslekMi(prm.meslek) && prm.meslek !== m) ac(prm.meslek, false); }, [prm.meslek]); // eslint-disable-line react-hooks/exhaustive-deps
  function ac(yeni: MeslekId, yaz = true) {
    setM(yeni);
    setSecili(varsayilanSecim(yeni));
    setSekme("aktif");
    setOnay(false);
    if (yaz) router.setParams?.({ meslek: yeni });
  }

  const yakinlas = (y: number) => setOi((i) => Math.max(0, Math.min(OLCEKLER.length - 1, i + y)));
  const tutam = Gesture.Pinch().runOnJS(true).onEnd((e: { scale: number }) => { if (e.scale > 1.12) yakinlas(1); else if (e.scale < 0.9) yakinlas(-1); });
  const puan = agac?.puan;

  const puanKutusu = <View accessible accessibilityLabel={`${t("onl.ba.puan")}: ${puan?.kalan ?? "—"}`} style={{ minWidth: dar ? 128 : 92, maxWidth: dar ? 180 : 118, borderRadius: 10, borderWidth: 1.2, borderColor: ONL.frame, backgroundColor: "rgba(14,10,6,0.85)", paddingHorizontal: 8, paddingVertical: 6, flexDirection: yon(rtl), alignItems: "center", gap: 6 }}>
    <Ornament size={dar ? 18 : 22} color={C.goldBright} />
    <View style={{ alignItems: "center", flexShrink: 1 }}>
      <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 12, lineHeight: 14, textAlign: "center", color: C.parchmentDim }}>{t("onl.ba.puan")}</Text>
      <Text style={{ fontFamily: F.display, fontSize: dar ? 19 : 22, lineHeight: dar ? 23 : 27, color: C.parchment }}>{puan?.kalan ?? "—"}</Text>
    </View>
  </View>;

  const arma = <View style={{ flex: dar ? undefined : 1, flexDirection: yon(rtl), alignItems: "center", justifyContent: "center", gap: 8, marginTop: dar ? 4 : 0 }}>
    <BeceriIkon ad={MESLEK_ARMA[m]} boyut={dar ? 40 : 46} renk={C.gold} vurgu={tema.vurgu} />
    <View style={{ flexShrink: 1 }}>
      <Text accessibilityRole="header" numberOfLines={2} style={{ fontFamily: F.display, fontSize: dar ? 21 : 22, lineHeight: dar ? 26 : 27, color: C.parchment, textAlign: hiza(rtl) }}>{meslekAdi(t, m)}</Text>
      <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>{`${t("onl.ba.ust")} · ${kademeAdi(t, agac?.kademe ?? 0)}`}</Text>
    </View>
  </View>;
  const geri = <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/meslek")} />;
  const ust = dar ? <View>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", justifyContent: "space-between" }}>{geri}{puanKutusu}</View>
    {arma}
  </View> : <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>{geri}{arma}{puanKutusu}</View>;

  const kontrol = <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 4, marginTop: 8 }}>
    <View style={{ flex: 1 }}>
      {b.dakikaMs < 60_000 ? <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.ba.ornek")}</Text> : null}
      <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{applyParams(t("onl.ba.tavan"), [puan?.tavan ?? PUAN_TAVANI_VARSAYILAN, agacToplam(m)])}</Text>
    </View>
    <YakinDugme etiket={t("onl.ba.uzaklas")} isaret="-" kapali={oi === 0} onPress={() => yakinlas(-1)} />
    <YakinDugme etiket={t("onl.ba.yakinlas")} isaret="+" kapali={oi === OLCEKLER.length - 1} onPress={() => yakinlas(1)} />
  </View>;

  const yenidenOgr = b.agac?.ogrenme?.tur === "yeniden" ? b.agac.ogrenme : null;
  const yeniden = agac ? <View style={{ marginTop: 14, gap: 8 }}>
    <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{yenidenOgr && b.kalan ? applyParams(t("onl.ba.yenidenSuruyor"), [sureYaz(t, b.kalan.dk)]) : t(onay ? "onl.ba.yenidenOnayAlt" : "onl.ba.yenidenAlt")}</Text>
    {yenidenOgr ? null : <View style={{ flexDirection: yon(rtl), gap: 8 }}>
      <KucukDugme etiket={t(onay ? "onl.ba.yenidenOnay" : "onl.ba.yeniden")} icon="scroll-open" rtl={rtl} kapali={b.mesgul || !!b.agac?.ogrenme} onPress={() => { if (onay) { setOnay(false); void b.yeniden(); } else setOnay(true); }} />
      {onay ? <KucukDugme etiket={t("onl.ba.vazgec")} icon="scroll" rtl={rtl} onPress={() => setOnay(false)} /> : null}
    </View>}
  </View> : null;

  const govde = !agac ? <View style={{ marginTop: 24, alignItems: "center", gap: 10 }}>
    <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 21, textAlign: "center", color: C.parchmentDim }}>{b.hata ? hataMetni(t, b.hata) : t("onl.ba.yukleniyor")}</Text>
    {b.hata ? <View style={{ flexDirection: "row" }}><KucukDugme etiket={t("onl.ba.yenile")} icon="hourglass" rtl={rtl} onPress={() => void b.yenile()} /></View> : null}
  </View> : <>
    {kontrol}
    <GestureDetector gesture={tutam}>
      <View style={{ marginTop: 12, marginHorizontal: -16 }}>
        <ScrollView horizontal scrollEnabled={L.W > avail} showsHorizontalScrollIndicator={L.W > avail} contentContainerStyle={{ paddingHorizontal: 16, minWidth: width }}>
          <Agac L={L} liste={liste} tema={tema} secili={n?.id ?? ""} onSec={setSecili} kalan={b.agac?.ogrenme?.meslek === m ? b.kalan : null} t={t} />
        </ScrollView>
      </View>
    </GestureDetector>
    {yeniden}
  </>;

  return <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
    <Sahne gorsel={SAHNE_GORSEL[tema.sahne]} oran={0.55} koyu={0.62}>
      <LinearGradient pointerEvents="none" colors={[tema.isik, "rgba(0,0,0,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: Math.round(height * 0.7) }} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: ins.top + 8, paddingHorizontal: 16, paddingBottom: 20 }}>
        {ust}
        <View style={{ marginTop: 12 }}><Sekmeler aktif={sekme} onSec={setSekme} rtl={rtl} t={t} /></View>
        {sekme === "aktif" ? govde : <View style={{ marginTop: 16 }}>{sekme === "gecmis" ? <Gecmis g={b.gecmis} aktif={aktif} acik={m} onAc={ac} rtl={rtl} t={t} /> : <TumBeceriler g={b.gecmis} rtl={rtl} t={t} />}</View>}
      </ScrollView>
      {sekme === "aktif" && agac && n ? <View style={{ maxHeight: Math.round(height * 0.5) + ins.bottom, paddingBottom: ins.bottom, backgroundColor: "rgba(16,12,9,0.97)" }}>
        <ScrollView bounces={false} contentContainerStyle={{ flexGrow: 0 }}>
          <Panel key={n.id} n={n} agac={agac} liste={liste} tema={tema} kalan={b.agac?.ogrenme?.dugum === n.id ? b.kalan : null} mesgul={b.mesgul}
            ogren={() => void b.ogren(n.id)} iptal={() => void b.iptal()} kisalt={() => void b.kisalt()} rtl={rtl} t={t} genis={genis} bildirim={bildirimMetni(t, b.bildirim)} />
        </ScrollView>
      </View> : null}
    </Sahne>
  </GestureHandlerRootView>;
}
