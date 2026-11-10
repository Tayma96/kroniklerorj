// Barınma (Faz 14) arayüzü: yaşam ekranındaki barınma kartı (durum, kalan süre, zincir aşaması ve sonraki etkisi,
// oda kirası 1/3/12 ay, imaret/zaviye, otomatik konaklama modu) ve dönüş ekranının paylaştığı parçalar. Dil
// yargılamaz: "ceza" değil "durum" anlatılır, her etkinin nasıl kalkacağı yazılır. Bütün değerler sunucudan gelir.
import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../i18n";
import { C, F } from "../theme";
import { GameIcon } from "../icons";
import { hap } from "../haptics";
import { DesignPressable as Pressable } from "../design-pressable";
import { useOnline } from "./durum";
import { isaretli } from "./metin";
import { istekNoUret } from "./depo";
import { ekHataAnahtari, type EkHata } from "./ek-istemci";
import { Bant, Cerceve, CizgiDugme, Madalyon, giris, hiza, yon } from "./ui";
import { AltPanel, Baslik2, Rozet } from "./yasam-ui";
import {
  KIRA_SURELERI, OTOMATIK_MODLAR, useBarinmaIstemci, useSunucuFarki, yerlesimBarinma, yerlesimDonus,
  type BarinmaGorunumu, type Konaklama, type KiraSuresi, type OdaId, type OtomatikMod, type Zincir,
} from "./barinma-veri";

type Ceviri = (k: string) => string;

/** Süre: 1 günden uzunsa "2 g 5 sa", değilse "5 sa 20 dk" (gerçek zaman; sayaç çevrimdışıyken de işler). */
export function sureYaz(ms: number, t: Ceviri): string {
  const m = Math.max(0, Math.round(ms / 60_000));
  const sa = Math.floor(m / 60);
  return sa >= 24 ? applyParams(t("onl.br.sure.gun"), [Math.floor(sa / 24), sa % 24]) : applyParams(t("onl.br.sure.saat"), [sa, m % 60]);
}

export const DURUM_RENK: Record<string, string> = { kapali: C.parchmentMuted, konakli: C.sage, misafir: C.gold, uyari: C.gold, evsiz: C.ember, canKaybi: C.blood };
export const SECENEK_IKON: Record<string, string> = { oda: "camel", tesis: "bread", uzat: "hourglass", otomatik: "compass" };
const KONAK_IKON: Record<string, string> = { oda: "camel", ocak: "house", misafirhane: "house", tesis: "bread" };

/** Konaklama satırı: nerede ve ne kadar kaldı (ocakta süre yok). */
export function konaklamaMetni(k: Konaklama, kalanMs: number | null, t: Ceviri): string {
  const yer = k.tur === "oda" && k.oda ? t("onl.br.oda." + k.oda) : t("onl.br.konaklama." + k.tur);
  return kalanMs === null ? yer : applyParams(t("onl.br.kalanli"), [yer, sureYaz(kalanMs, t)]);
}

/** Zincir: uyarı → evsiz → can kaybı; şu anki aşama, şimdiki etkiler ve bir sonraki aşamanın ne zaman/ne getirdiği. */
export function ZincirGostergesi({ z, simdi, rtl, t, toparlanmaNotu = true }: { z: Zincir; simdi: number; rtl: boolean; t: Ceviri; toparlanmaNotu?: boolean }) {
  const sira = ["uyari", "evsiz", "canKaybi"] as const;
  const i = sira.indexOf(z.asama);
  const e = z.etkiler;
  const simdiki = [
    e.kondisyonAylik ? applyParams(t("onl.br.etki.kondisyon"), [isaretli(e.kondisyonAylik)]) : null,
    e.gonulAylik ? applyParams(t("onl.br.etki.gonul"), [isaretli(e.gonulAylik)]) : null,
    e.canAylik ? applyParams(t("onl.br.etki.can"), [isaretli(e.canAylik)]) : null,
  ].filter(Boolean).join(" · ");
  return <View style={{ gap: 8 }}>
    <View accessible accessibilityLabel={`${t("onl.br.zincir")}: ${t("onl.br.asama." + z.asama)}`} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 4 }}>
      {sira.map((a, j) => <View key={a} style={{ flex: 1, gap: 4 }}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: j < i ? "rgba(214,120,72,0.55)" : j === i ? DURUM_RENK[a] : "rgba(201,162,78,0.18)" }} />
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontFamily: F.display, fontSize: 10.5, color: j === i ? C.parchment : C.parchmentMuted, textAlign: "center" }}>{t("onl.br.asama." + a)}</Text>
      </View>)}
    </View>
    {simdiki ? <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.br.simdiki"), [simdiki])}</Text> : null}
    {z.sonraki ? <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>
      {applyParams(t("onl.br.sonraki." + z.sonraki.asama), [sureYaz(z.sonraki.an - simdi, t), e.canTaban])}
    </Text> : <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.br.taban"), [e.canTaban])}</Text>}
    {toparlanmaNotu ? <Text style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.br.toparlanma")}</Text> : null}
  </View>;
}

/** Yaşam ekranındaki dönüş yönlendirmesi: aynı yokluk için oturumda bir kez. */
const gosterilen = new Set<number>();

/** Kira, tesis ve otomatik mod paneli. */
function BarinmaPaneli({ g, simdi, rtl, t, onYeni }: { g: BarinmaGorunumu; simdi: number; rtl: boolean; t: Ceviri; onYeni: (g: BarinmaGorunumu, not?: string) => void }) {
  const ist = useBarinmaIstemci();
  const [bekleyen, setBekleyen] = useState<string | null>(null);
  const [hata, setHata] = useState<EkHata | null>(null);
  const etkinOda = g.konaklama?.tur === "oda" ? g.konaklama.oda : undefined;
  const kirala = async (oda: OdaId, sure: KiraSuresi) => {
    setHata(null); setBekleyen(`${oda}:${sure}`);
    const r = await ist.kira({ oda, sure, istekNo: istekNoUret() });
    setBekleyen(null);
    if (r.ok) { hap("success"); onYeni(r.deger.barinma, applyParams(t(r.deger.kira.uzatildi ? "onl.br.uzatildi" : "onl.br.kiralandi"), [t("onl.br.oda." + oda), r.deger.kira.fiyat])); }
    else { hap("error"); setHata(r.hata); }
  };
  const mod = async (m: OtomatikMod) => {
    if (m === g.otomatik.mod) return;
    setHata(null); setBekleyen("mod");
    const r = await ist.otomatik({ mod: m, istekNo: istekNoUret() });
    setBekleyen(null);
    if (r.ok) { hap("selection"); onYeni(r.deger.barinma); } else { hap("error"); setHata(r.hata); }
  };
  return <>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
      <Madalyon icon="camel" size={48} aktif />
      <View style={{ flex: 1, gap: 2 }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 19, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.br.kiraBaslik")}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.br.akcen"), [g.para])}</Text>
      </View>
    </View>
    {g.odalar.length === 0 ? <Bant tur="bilgi" metin={t("onl.hh.han_kapali")} rtl={rtl} /> : null}
    {g.odalar.map((o) => {
      const n = o.nitelik;
      const ozellik = [
        n.kondisyon ? applyParams(t("onl.br.nit.kondisyon"), [n.kondisyon]) : null,
        n.sandik ? applyParams(t("onl.br.nit.sandik"), [n.sandik]) : null,
        n.ozel ? t("onl.br.nit.ozel") : null,
        n.adres ? t("onl.br.nit.adres") : null,
      ].filter(Boolean).join(" · ");
      const baska = !!etkinOda && etkinOda !== o.oda;
      return <Cerceve key={o.oda} aktif={etkinOda === o.oda} ic={{ padding: 12, gap: 8 }}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
          <Text style={{ flex: 1, fontFamily: F.display, fontSize: 15, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.br.oda." + o.oda)}</Text>
          {etkinOda === o.oda ? <Rozet icon="house" metin={t("onl.br.burada")} renk={C.sage} /> : null}
        </View>
        {ozellik ? <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{ozellik}</Text> : null}
        <View style={{ flexDirection: yon(rtl), gap: 6 }}>
          {KIRA_SURELERI.map((s) => {
            const f = o.fiyatlar[String(s) as "1" | "3" | "12"];
            const yetmez = g.para < f;
            const k = `${o.oda}:${s}`;
            return <Pressable key={s} disabled={baska || !!bekleyen} accessibilityRole="button"
              accessibilityLabel={applyParams(t("onl.br.kiraErisim"), [t("onl.br.oda." + o.oda), applyParams(t("onl.br.ay"), [s]), f])}
              accessibilityState={{ disabled: baska || !!bekleyen, busy: bekleyen === k }}
              onPress={() => { void kirala(o.oda, s); }}
              style={({ pressed }) => ({ flex: 1, minHeight: 48, borderRadius: 8, borderWidth: 1, borderColor: yetmez ? "rgba(201,162,78,0.25)" : "rgba(201,162,78,0.55)", alignItems: "center", justifyContent: "center", paddingVertical: 4, backgroundColor: pressed ? "rgba(201,162,78,0.22)" : "rgba(14,10,6,0.7)", opacity: baska ? 0.4 : yetmez ? 0.6 : bekleyen === k ? 0.7 : 1 })}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontFamily: F.display, fontSize: 12, color: C.goldBright }}>{applyParams(t("onl.br.ay"), [s])}</Text>
              <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 4 }}>
                <GameIcon name="coins" size={12} color={C.gold} />
                <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{f}</Text>
              </View>
            </Pressable>;
          })}
        </View>
        {baska ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.br.odaVar")}</Text> : null}
      </Cerceve>;
    })}
    <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.br.pesinNot")}</Text>
    <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 1.4, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.br.otomatik")}</Text>
    <View accessibilityRole="radiogroup" style={{ gap: 6 }}>
      {OTOMATIK_MODLAR.filter((m) => g.otomatik.modlar.includes(m)).map((m) => {
        const secili = g.otomatik.mod === m;
        return <Pressable key={m} accessibilityRole="radio" accessibilityState={{ selected: secili, disabled: !!bekleyen }} accessibilityLabel={`${t("onl.br.mod." + m)}. ${t("onl.br.modAc." + m)}`}
          disabled={!!bekleyen} onPress={() => { void mod(m); }}
          style={({ pressed }) => ({ flexDirection: yon(rtl), alignItems: "center", gap: 10, minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: secili ? 2 : 1, borderColor: secili ? C.goldBright : "rgba(201,162,78,0.35)", backgroundColor: secili ? "rgba(201,162,78,0.16)" : pressed ? "rgba(201,162,78,0.1)" : "rgba(14,10,6,0.7)" })}>
          <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: secili ? C.goldBright : C.parchmentMuted, alignItems: "center", justifyContent: "center" }}>
            {secili ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.goldBright }} /> : null}
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 13.5, color: secili ? C.parchment : C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.br.mod." + m)}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.br.modAc." + m)}</Text>
          </View>
        </Pressable>;
      })}
    </View>
    {hata ? <Bant metin={t(ekHataAnahtari(hata))} rtl={rtl} /> : null}
    {g.konaklama?.bitis && g.konaklama.kalanMs !== null ? <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchmentDim, textAlign: hiza(rtl) }}>{konaklamaMetni(g.konaklama, g.konaklama.bitis - simdi, t)}</Text> : null}
  </>;
}

/** Yaşam ekranı barınma kartı. 24 saati aşan yoklukta dönüş ekranını bir kez açar. */
export function BarinmaKarti() {
  const router = useRouter();
  const { t, rtl, lang } = useI18n();
  const o = useOnline();
  const ist = useBarinmaIstemci();
  const fark = useSunucuFarki();
  const [g, setG] = useState<BarinmaGorunumu | null>(() => yerlesimBarinma(o.yerlesim));
  const [alindi, setAlindi] = useState(() => Date.now());
  const [simdiYerel, setSimdiYerel] = useState(() => Date.now());
  const [panel, setPanel] = useState(false);
  const [not, setNot] = useState<string | null>(null);
  const [hata, setHata] = useState<EkHata | null>(null);
  const [bekliyor, setBekliyor] = useState(false);

  useEffect(() => {
    const d = yerlesimDonus(o.yerlesim);
    if (d && !gosterilen.has(d.yokluk.baslangic)) { gosterilen.add(d.yokluk.baslangic); router.push("/online/donus"); }
    const yb = yerlesimBarinma(o.yerlesim);
    if (yb) { setG(yb); setAlindi(Date.now()); }
  }, [o.yerlesim]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let iptal = false;
    void ist.barinma(lang).then((r) => { if (!iptal && r.ok) { setG(r.deger.barinma); setAlindi(Date.now()); } });
    return () => { iptal = true; };
  }, [ist, lang]);
  useEffect(() => { const id = setInterval(() => setSimdiYerel(Date.now()), 30_000); return () => clearInterval(id); }, []);

  if (!g || !g.acik) return null;
  const simdi = simdiYerel + fark;
  const gecen = simdiYerel - alindi;
  const k = g.konaklama;
  const kalan = k?.kalanMs != null ? Math.max(0, k.kalanMs - gecen) : null;
  const guvende = k && (k.tur === "ocak" || k.tur === "oda");
  const tesisGoster = g.tesis.acik && !guvende && k?.tur !== "tesis";
  const yeni = (y: BarinmaGorunumu, n?: string) => { setG(y); setAlindi(Date.now()); if (n) { setNot(n); setPanel(false); } void o.yerlesimYukle(true); };
  const tesis = async () => {
    setHata(null); setNot(null); setBekliyor(true);
    const r = await ist.tesis({ istekNo: istekNoUret() });
    setBekliyor(false);
    if (r.ok) { hap("success"); yeni(r.deger.barinma, applyParams(t("onl.br.tesisOldu"), [t("onl.br.tesis." + r.deger.tesis.tur), sureYaz(r.deger.tesis.bitis - r.deger.tesis.baslangic, t)])); }
    else { hap("error"); setHata(r.hata); }
  };

  return <>
    <Baslik2 metin={t("onl.br.baslik")} rtl={rtl} sag={g.unvan ? <Rozet icon="hood" metin={t("onl.br.unvan.evsiz")} renk={C.ember} /> : undefined} />
    <Animated.View entering={giris(160)}>
      <Cerceve aktif={g.durum === "evsiz" || g.durum === "canKaybi"} ic={{ padding: 14, gap: 12 }}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 12 }}>
          <Madalyon icon={k ? KONAK_IKON[k.tur] ?? "house" : "house"} size={46} aktif={!!guvende} renk={DURUM_RENK[g.durum]} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ fontFamily: F.display, fontSize: 15.5, color: DURUM_RENK[g.durum] ?? C.parchment, textAlign: hiza(rtl) }}>{t("onl.br.durum." + g.durum)}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>
              {k ? konaklamaMetni(k, kalan, t) : t("onl.br.konakYok")}
            </Text>
          </View>
        </View>
        {k?.yakindaBiter ? <Bant tur="bilgi" metin={t("onl.br.yakinda")} rtl={rtl} /> : null}
        {g.zincir ? <ZincirGostergesi z={g.zincir} simdi={simdi} rtl={rtl} t={t} /> : null}
        {g.mola && g.mola > simdi ? <Text style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{applyParams(t("onl.br.mola"), [sureYaz(g.mola - simdi, t)])}</Text> : null}
        <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 8 }}>
          <View style={{ flexGrow: 1, flexBasis: 140 }}><CizgiDugme kucuk icon="camel" etiket={t(k?.tur === "oda" ? "onl.br.uzat" : "onl.br.kirala")} rtl={rtl} onPress={() => { setHata(null); setPanel(true); }} /></View>
          {tesisGoster ? <View style={{ flexGrow: 1, flexBasis: 140 }}>
            <CizgiDugme kucuk icon="bread" etiket={applyParams(t("onl.br.tesisGir"), [t("onl.br.tesis." + g.tesis.tur)])} rtl={rtl} kapali={!g.tesis.uygun || bekliyor} onPress={() => { void tesis(); }} />
          </View> : null}
        </View>
        {tesisGoster && !g.tesis.uygun && g.tesis.neden ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t(ekHataAnahtari(g.tesis.neden as EkHata))}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={`${t("onl.br.otomatik")}: ${t("onl.br.mod." + g.otomatik.mod)}`} onPress={() => { hap("tap"); setPanel(true); }}
          style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, minHeight: 44 }}>
          <GameIcon name="compass" size={15} color={C.gold} />
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.br.otomatikSatir"), [t("onl.br.mod." + g.otomatik.mod)])}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 11.5, color: C.goldDim, textDecorationLine: "underline" }}>{t("onl.br.degistir")}</Text>
        </Pressable>
        {not ? <Bant tur="bilgi" metin={not} rtl={rtl} /> : null}
        {hata ? <Bant metin={t(ekHataAnahtari(hata))} rtl={rtl} /> : null}
      </Cerceve>
    </Animated.View>
    <AltPanel acik={panel} onKapat={() => setPanel(false)} etiket={t("onl.br.kiraBaslik")} rtl={rtl} t={t}>
      {panel ? <BarinmaPaneli g={g} simdi={simdi} rtl={rtl} t={t} onYeni={yeni} /> : null}
    </AltPanel>
  </>;
}

