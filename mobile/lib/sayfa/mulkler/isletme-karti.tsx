// F5 işletme paneli (han/dükkân/atölye kartının içinde): fiyat ve kalite seçici, kadro, tahmini aylık net,
// işletme namı çubuğu, müşteri/kapasite durumu, bekleyen mevsim kararı ve son kararın özeti. Vakfet düğmesi ve
// geri alınamaz işlem için onay kutusu her mülkte (vakıf rozeti mülk kartında) kullanılır.
import { useState } from "react";
import { View, Text, Modal } from "react-native";
import { DesignPressable as Pressable } from "../../design-pressable";
import {
  isletmeAyari, isletmeDurumu, isletmeMi, setIsletmeAyar, propAylikTahmin, propWorkerSlots,
  ISL_KARAR_SECIM, ISL_KARAR_IKON, islKararZarSecimi, islKararOnizleme, resolveIsletmeKarari, PROPERTY_TYPES, inflationFactor,
  vakfedilebilir, vakfet, vakifItibarTabani, VAKIF_TABAN_BIRIM, VAKIF_TABAN_TAVAN, type GameState, type Property, type IslKararId,
} from "../../game";
import { placeName } from "../../locale-data";
import { useI18n, applyParams } from "../../i18n";
import { hap } from "../../haptics";
import { playTap } from "../../sound";
import { GameIcon } from "../../icons";
import { SansEtiketi } from "../../sans-etiketi";
import { yon } from "../karakter/parca";
import { C, F, T } from "../../theme";
import { Madalyon, fmt, signed } from "./parca";

type Act = (fn: (s: GameState) => GameState, coin?: boolean) => void;

// Üç seçenekli seçici (radio): her seçeneğin altında o ayarla tahmini aylık net görünür.
function Secici({ baslik, deger, etiketler, ipuclari, tahminler, onSec }: { baslik: string; deger: number; etiketler: string[]; ipuclari: string[]; tahminler: number[]; onSec: (v: number) => void }) {
  const { t, lang } = useI18n(); const { row, ta } = yon(lang);
  return <View style={{ gap: 6 }}>
    <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 13, color: C.goldDim, textAlign: ta }}>{baslik}</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel={baslik} style={{ flexDirection: row, gap: 6 }}>
      {etiketler.map((et, v) => {
        const on = v === deger;
        return <Pressable key={v} accessibilityRole="radio" accessibilityState={{ selected: on, checked: on }}
          accessibilityLabel={applyParams(t("isl.secimEtiket"), [baslik, et, signed(tahminler[v], lang)], lang)} accessibilityHint={ipuclari[v]}
          onPress={() => { if (!on) { hap("selection"); playTap(); onSec(v); } }}
          style={({ pressed }) => ({ flex: 1, minHeight: 52, alignItems: "center", justifyContent: "center", paddingVertical: 6, paddingHorizontal: 4, borderRadius: 7, borderWidth: on ? 1.5 : 1, borderColor: on ? C.gold : pressed ? C.borderHi : C.border, backgroundColor: on ? C.cardHi : C.surface })}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontFamily: F.display, fontSize: 13, color: on ? C.goldBright : C.parchmentDim }}>{et}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontFamily: F.serif, fontSize: 13.5, color: tahminler[v] >= 0 ? C.sage : C.blood }}>{signed(tahminler[v], lang)}</Text>
        </Pressable>;
      })}
    </View>
    <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: ta }}>{ipuclari[deger]}</Text>
  </View>;
}

export function IsletmePaneli({ state, pr, i, act }: { state: GameState; pr: Property; i: number; act: Act }) {
  const { t, lang } = useI18n(); const { row, ta } = yon(lang);
  if (!isletmeMi(pr)) return null;
  const a = isletmeAyari(pr);
  const tahmin = (ek: Partial<typeof a>) => propAylikTahmin(state, { ...pr, isl: { ...a, ...ek } });
  const net = propAylikTahmin(state, pr);
  // Müşteri/kapasite: ay kapanışıyla aynı hesap (tahmin hâli).
  const h = isletmeDurumu(state, pr);
  const dar = h.talep > h.kapasite * 1.05, bos = h.kapasite > h.talep * 1.15;
  const nam = Math.round(a.nam);
  const kadro = pr.workers?.length || 0, slot = propWorkerSlots(pr);
  const id = a.karar as IslKararId | undefined;
  const B = (PROPERTY_TYPES[pr.type]?.income || 0) * inflationFactor(state);

  return <View style={{ gap: 10, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: C.goldDim, backgroundColor: C.card }}>
    <View style={{ flexDirection: row, alignItems: "center", gap: 8 }}>
      <GameIcon name="coins" size={18} color={C.gold} />
      <Text accessibilityRole="header" style={{ flex: 1, fontFamily: F.display, fontSize: 15, color: C.gold, textAlign: ta }}>{t("isl.baslik")}</Text>
      <Text numberOfLines={1} accessibilityLabel={`${t("isl.tahmin")}: ${signed(net, lang)}`} style={{ flexShrink: 0, fontFamily: F.display, fontSize: 15, color: net >= 0 ? C.sage : C.blood }}>{signed(net, lang)}{t("mulkler.ay")}</Text>
    </View>

    {/* İşletme namı: 0–100 çubuk */}
    <View accessible accessibilityRole="progressbar" accessibilityLabel={t("isl.nam")} accessibilityValue={{ min: 0, max: 100, now: nam }} style={{ gap: 4 }}>
      <View style={{ flexDirection: row, justifyContent: "space-between" }}>
        <Text style={{ fontFamily: F.serif, fontSize: T.body, color: C.parchmentDim }}>{t("isl.nam")}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: nam >= 60 ? C.sage : nam < 25 ? C.blood : C.gold }}>{nam}/100</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: C.surface, overflow: "hidden", alignItems: row === "row" ? "flex-start" : "flex-end" }}>
        <View style={{ width: `${Math.min(100, Math.max(0, nam))}%`, height: 6, backgroundColor: nam >= 60 ? C.sage : nam < 25 ? C.blood : C.gold }} />
      </View>
    </View>

    <Secici baslik={t("isl.fiyat")} deger={a.f} etiketler={[t("isl.f0"), t("isl.f1"), t("isl.f2")]} ipuclari={[t("isl.f0.ip"), t("isl.f1.ip"), t("isl.f2.ip")]}
      tahminler={[0, 1, 2].map((f) => tahmin({ f }))} onSec={(f) => act((s) => setIsletmeAyar(s, i, "f", f))} />
    <Secici baslik={t("isl.kalite")} deger={a.q} etiketler={[t("isl.q0"), t("isl.q1"), t("isl.q2")]} ipuclari={[t("isl.q0.ip"), t("isl.q1.ip"), t("isl.q2.ip")]}
      tahminler={[0, 1, 2].map((q) => tahmin({ q }))} onSec={(q) => act((s) => setIsletmeAyar(s, i, "q", q))} />

    <View style={{ gap: 3 }}>
      <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment, textAlign: ta }}>{applyParams(t("isl.kadro"), [kadro, slot], lang)}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: ta }}>{applyParams(t("isl.musteri"), [h.talep.toFixed(1), h.kapasite.toFixed(1)], lang)}</Text>
      {dar || bos ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 18, color: dar ? C.ember : C.parchmentDim, textAlign: ta }}>{t(dar ? "isl.darlik" : "isl.bosta")}</Text> : null}
      <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: ta }}>{applyParams(t("isl.cevre"), [h.trafik.toFixed(2), h.rakip.toFixed(2), h.uyum.toFixed(2)], lang)}</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: ta }}>{t("isl.kadroIp")}</Text>
    </View>

    {id && ISL_KARAR_SECIM[id] ? <KararKarti state={state} pr={pr} i={i} id={id} B={B} act={act} /> : null}
    {!id && a.son ? <View style={{ flexDirection: row, alignItems: "center", gap: 8 }}>
      <GameIcon name={ISL_KARAR_IKON[a.son.id as IslKararId] || "scroll"} size={15} color={C.parchmentDim} />
      <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: ta }}>
        {applyParams(t("isl.sonKarar"), [t("isl.k." + a.son.id + ".t"), t("isl.k." + a.son.id + ".r" + a.son.c + (a.son.ok ? "" : "x")).replace("%1 (%2): ", "")], lang)}
      </Text>
    </View> : null}
  </View>;
}

// Bekleyen mevsim kararı: iki seçenek; zarlı seçenekte görünür şans etiketi (önizleme = motorun sonucu).
function KararKarti({ state, pr, i, id, B, act }: { state: GameState; pr: Property; i: number; id: IslKararId; B: number; act: Act }) {
  const { t, lang } = useI18n(); const { row, ta } = yon(lang);
  const zarC = islKararZarSecimi(id); const onz = zarC >= 0 ? islKararOnizleme(state, pr) : null;
  return <View style={{ gap: 8, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: C.gold, backgroundColor: C.cardHi }}>
    <View style={{ flexDirection: row, alignItems: "center", gap: 8 }}>
      <Madalyon icon={ISL_KARAR_IKON[id]} tone={C.gold} size={34} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1, color: C.goldDim, textAlign: ta }}>{t("isl.kararBaslik")}</Text>
        <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 15, color: C.parchment, textAlign: ta }}>{t("isl.k." + id + ".t")}</Text>
      </View>
    </View>
    <Text style={{ fontFamily: F.serif, fontSize: T.body, lineHeight: 21, color: C.parchmentDim, textAlign: ta }}>{t("isl.k." + id + ".x")}</Text>
    {[0, 1].map((c) => {
      const para = ISL_KARAR_SECIM[id][c as 0 | 1].ok.para; const tutar = para ? Math.round(para * B) : 0;
      return <View key={c} style={{ gap: 6 }}>
        {c === zarC && onz ? <SansEtiketi zar={onz} baslik="isl.zarBaslik" /> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={t("isl.k." + id + ".c" + c) + (tutar ? ", " + applyParams(t(tutar < 0 ? "isl.bedel" : "isl.kazanc"), [fmt(Math.abs(tutar), lang)], lang) : "")}
          onPress={() => act((s) => resolveIsletmeKarari(s, i, c), tutar > 0)}
          style={({ pressed }) => ({ minHeight: 48, flexDirection: row, alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 7, borderWidth: 1, borderColor: pressed ? C.goldBright : C.borderHi, backgroundColor: pressed ? C.surface : C.card })}>
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: T.body, lineHeight: 20, color: C.parchment, textAlign: ta }}>{t("isl.k." + id + ".c" + c)}</Text>
          {tutar ? <Text style={{ fontFamily: F.display, fontSize: 13, color: tutar < 0 ? C.blood : C.sage }}>{signed(tutar, lang)}</Text> : null}
        </Pressable>
      </View>;
    })}
  </View>;
}

// Vakfet: geri alınamaz — onay kutusu ister. Vakfedilmiş mülkte düğme yerine rozet görünür (mülk kartında).
export function VakifDugmesi({ state, pr, i, act }: { state: GameState; pr: Property; i: number; act: Act }) {
  const { t, lang } = useI18n(); const { row, ta } = yon(lang);
  const [acik, setAcik] = useState(false);
  if (pr.vakif || !vakfedilebilir(state, i)) return null;
  const ad = t("pt." + pr.type), yer = placeName(pr.loc, lang);
  const taban = Math.min(VAKIF_TABAN_TAVAN, vakifItibarTabani(state.player) + VAKIF_TABAN_BIRIM);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`${t("isl.vakif")}: ${ad}, ${yer}`} accessibilityHint={t("isl.vakifIp")} onPress={() => { hap("tap"); playTap(); setAcik(true); }}
      style={({ pressed }) => ({ minHeight: 52, flexDirection: row, alignItems: "center", gap: 10, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 7, borderWidth: 1, borderColor: pressed ? C.goldBright : C.borderHi, backgroundColor: pressed ? C.surface : C.card })}>
      <Madalyon icon="scroll-open" tone={C.gold} size={36} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: F.display, fontSize: 14, color: C.parchment, textAlign: ta }}>{t("isl.vakif")}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: ta }}>{t("isl.vakifIp")}</Text>
      </View>
    </Pressable>
    <Modal visible={acik} transparent animationType="fade" onRequestClose={() => setAcik(false)}>
      <View style={{ flex: 1, justifyContent: "center", padding: 16, backgroundColor: C.bg + "CC" }}>
        <View accessibilityViewIsModal style={{ gap: 12, padding: 16, borderRadius: 10, borderWidth: 1, borderColor: C.gold, backgroundColor: C.card }}>
          <View style={{ flexDirection: row, alignItems: "center", gap: 8 }}>
            <GameIcon name="scroll-open" size={20} color={C.gold} />
            <Text accessibilityRole="header" style={{ flex: 1, fontFamily: F.display, fontSize: 16, color: C.gold, textAlign: ta }}>{t("isl.vakifOnayBaslik")}</Text>
          </View>
          <Text style={{ fontFamily: F.serif, fontSize: T.body, lineHeight: 22, color: C.parchmentDim, textAlign: ta }}>{applyParams(t("isl.vakifOnayMetin"), [ad, yer, taban], lang)}</Text>
          <View style={{ flexDirection: row, gap: 8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={t("isl.vakifOnayVazgec")} onPress={() => { hap("tap"); setAcik(false); }}
              style={({ pressed }) => ({ flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 7, borderWidth: 1, borderColor: pressed ? C.goldBright : C.borderHi, backgroundColor: C.surface })}>
              <Text style={{ fontFamily: F.display, fontSize: 14, color: C.parchment }}>{t("isl.vakifOnayVazgec")}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`${t("isl.vakifOnayEvet")}: ${ad}, ${yer}`} onPress={() => { setAcik(false); act((s) => vakfet(s, i), false); }}
              style={({ pressed }) => ({ flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 7, borderWidth: 1, borderColor: C.goldBright, backgroundColor: pressed ? C.goldDim : C.gold })}>
              <Text style={{ fontFamily: F.display, fontSize: 14, color: C.inkOnGold }}>{t("isl.vakifOnayEvet")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </>;
}

// İşletme sınırı göstergesi (mülkler sekmesinin başında): "İşletme 2/3".
export function IsletmeSiniri({ sayi, sinir }: { sayi: number; sinir: number }) {
  const { t, lang } = useI18n(); const { row, ta } = yon(lang);
  const dolu = sayi >= sinir;
  return <View accessible accessibilityLabel={`${applyParams(t("isl.sinir"), [sayi, sinir], lang)}. ${applyParams(t("isl.sinirDolu2"), [sinir], lang)}`}
    style={{ flexDirection: row, alignItems: "center", gap: 8, marginBottom: 10, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: dolu ? C.ember : C.border, backgroundColor: C.surface }}>
    <GameIcon name="coins" size={16} color={dolu ? C.ember : C.gold} />
    <Text style={{ fontFamily: F.display, fontSize: 13, color: dolu ? C.ember : C.gold }}>{applyParams(t("isl.sinir"), [sayi, sinir], lang)}</Text>
    <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: ta }}>{applyParams(t("isl.sinirDolu2"), [sinir], lang)}</Text>
  </View>;
}

