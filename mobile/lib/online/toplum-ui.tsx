// Faz 3a ortak parçalar: teklif kartı (şartlar, emanet, son ay, "cevapsız kalırsa"), teklif formu (tür, şartlar,
// ön izleme), olağan düzen kartı, gelen kutusu kısayolu, sayaç ve seçim çipleri. Metinler i18n-sayfa/online-toplum.ts.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { View, Text, TextInput, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useI18n, applyParams } from "../i18n";
import { C, F } from "../theme";
import { GameIcon } from "../icons";
import { DesignPressable as Pressable } from "../design-pressable";
import { hap } from "../haptics";
import { AltinDugme, Bant, Cerceve, CizgiDugme, Madalyon, ONL, hiza, yon } from "./ui";
import { BosKart, Rozet } from "./yasam-ui";
import { useOnline } from "./durum";
import { hataAnahtari } from "./hata";
import { MALLAR, MAL_IKON } from "./meslek-veri";
import { KADEMELER, MAL_IDLERI, type MalId, type MeslekId, type OnlineHata } from "./protokol";
import { useToplum, type Toplum } from "./toplum-durum";
import {
  OYUNCU_TEKLIF_TURLERI, TEKLIF_TURLERI, TOPLUM_SINIR,
  type GelenCevap, type OyuncuProfili, type OyuncuTeklifTuru, type TeklifCevabi, type TeklifGorunumu, type TeklifSartGirdisi, type TeklifTuru,
} from "./toplum-veri";

type Ceviri = (k: string) => string;

export const TUR_IKONU: Record<TeklifTuru, string> = {
  cirak: "graduate-cap", ortak: "scales", borc: "coins", hediye: "gems", gorucu: "ring", is: "scroll", npcIs: "saw", npcBorc: "coins", npcDunur: "ring",
};
export const kademeAdi = (t: Ceviri, kd: number | null | undefined) => t("onl.kd." + KADEMELER[Math.max(0, Math.min(3, kd ?? 0))]);
export const malAdi = (t: Ceviri, m: string) => t("onl.mal." + m);
/** Ay farkını yazar: bu ay · gelecek ay · %1 ay sonra · %1 ay önce. */
export function ayFarki(t: Ceviri, hedef: number, simdi: number): string {
  const f = hedef - simdi;
  if (f === 0) return t("onl.tp.ay.bu");
  if (f === 1) return t("onl.tp.ay.gelecek");
  return f > 0 ? applyParams(t("onl.tp.ay.sonra"), [f]) : applyParams(t("onl.tp.ay.once"), [-f]);
}
/** Armağanın içeriği: "12 akçe" · "2 × Nal" · "Ayşe yapımı". */
export function armaganYaz(t: Ceviri, a: { akce?: number; tutar?: number; mal?: string; adet?: number; yapan?: { ad: string } | null }): string {
  const parca: string[] = [];
  const akce = a.akce ?? a.tutar;
  if (akce) parca.push(applyParams(t("onl.tp.akce"), [akce]));
  if (a.mal) parca.push(applyParams(t("onl.tp.malAdet"), [a.adet ?? 1, malAdi(t, a.mal)]));
  const ic = parca.join(" + ");
  return a.yapan?.ad && a.mal ? `${ic} · ${applyParams(t("onl.tp.yapan"), [a.yapan.ad])}` : ic;
}

/** Teklif şartları, oyuncuya yazılı (sunucunun gönderdiği alanlardan; hesap yok). */
export function sartYaz(t: Ceviri, x: TeklifGorunumu, ay: number): string[] {
  const s = x.sartlar;
  const ad = (id?: string) => (id === x.gonderen.id ? x.gonderen.ad : id === x.alici.id ? x.alici.ad : "?");
  const satir: string[] = [];
  switch (x.tur) {
    case "cirak": {
      const usta = s.usta ?? x.gonderen.id;
      const cirak = usta === x.gonderen.id ? x.alici.id : x.gonderen.id;
      satir.push(applyParams(t("onl.tp.s.cirak"), [s.meslek ? t("onl.mes." + s.meslek) : "?", ad(usta), ad(cirak)]));
      break;
    }
    case "ortak": satir.push(applyParams(t("onl.tp.s.ortak"), [s.pay ?? 0, s.sure ?? 0])); break;
    case "borc": satir.push(applyParams(t("onl.tp.s.borc"), [s.tutar ?? 0, s.faiz ?? 0, s.vade ?? 0, ad(x.borclu)])); break;
    case "hediye": satir.push(applyParams(t("onl.tp.s.hediye"), [armaganYaz(t, s)])); break;
    case "gorucu": satir.push(t("onl.tp.s.gorucu")); break;
    case "is":
      satir.push(applyParams(t("onl.tp.s.is"), [t("onl.tp.is." + (s.is ?? "mektup")), s.tutar ?? 0, s.is === "mektup" ? 1 : 2]));
      if (s.is === "mektup" && s.hedef) satir.push(applyParams(t("onl.tp.s.mektupHedef"), [s.hedef.ad]), s.mesaj ?? "");
      break;
    case "npcIs": satir.push(applyParams(t("onl.tp.s.npcIs"), [s.tutar ?? 0, TOPLUM_SINIR.npcIsTakat])); break;
    case "npcBorc": satir.push(applyParams(t("onl.tp.s.npcBorc"), [s.tutar ?? 0, s.vade ?? 0])); break;
    case "npcDunur": satir.push(applyParams(t("onl.tp.s.npcDunur"), [s.aday?.ad ?? "?"])); break;
  }
  if (x.durum === "surer") {
    if (x.tur === "is") satir.push(applyParams(t("onl.tp.s.isSon"), [ayFarki(t, x.sonAy, ay)]));
    if (x.kalan != null) satir.push(applyParams(t("onl.tp.s.kalan"), [x.kalan, x.vadeAyi != null ? ayFarki(t, x.vadeAyi, ay) : "?"]));
    if (x.bitisAyi !== undefined) satir.push(applyParams(t("onl.tp.s.bitis"), [ayFarki(t, x.bitisAyi, ay)]));
  }
  return satir;
}

/** "Cevapsız kalırsa ne olur" (alıcının olağan düzeninden, teklif açılırken yazılmış). */
export const varsayilanYaz = (t: Ceviri, x: TeklifGorunumu) => t(`onl.tp.vs.${x.yon}.${x.varsayilan}`);

/** Teklif kartı: başlık, karşı taraf, şartlar, emanet, son ay, varsayılan sonuç ve cevap düğmeleri. */
export function TeklifKarti({ x, ay, benId, toplum, onKisi }: { x: TeklifGorunumu; ay: number; benId: string; toplum: Toplum; onKisi?: (id: string) => void }) {
  const { t, rtl } = useI18n();
  const [tutar, setTutar] = useState(Math.max(1, x.kalan ?? 1));
  const [hata, setHata] = useState<OnlineHata | null>(null);
  const [tamam, setTamam] = useState<string | null>(null);
  const karsi = x.yon === "gelen" ? x.gonderen : x.alici;
  const acik = x.durum === "acik";
  const cevaplar: TeklifCevabi[] = [];
  if (acik && x.yon === "gelen") cevaplar.push("kabul", "ret");
  if (acik && x.yon === "giden") cevaplar.push("geri");
  if (x.durum === "surer" && (x.tur === "ortak" || x.tur === "cirak" || x.tur === "is")) cevaplar.push("bitir");
  if (x.durum === "surer" && x.tur === "is" && x.yon === "gelen") cevaplar.push("teslim");
  const odeyebilir = x.durum === "surer" && x.tur === "borc" && x.borclu === benId && (x.kalan ?? 0) > 0;
  const cevapla = async (c: TeklifCevabi) => {
    setHata(null);
    setTamam(null);
    const s = await toplum.teklifCevap(x, c, c === "ode" ? tutar : undefined);
    if (s.ok) { hap("success"); setTamam(t("onl.tp.cevap.tamam." + c)); } else { hap("error"); setHata(s.hata); }
  };
  const bekliyor = (c: TeklifCevabi) => toplum.bekliyor(`cevap:${x.id}:${c}:${c === "ode" ? tutar : ""}`);
  const baslik = applyParams(t(`onl.tp.baslik.${x.yon}`), [t("onl.tp.tur." + x.tur)]);
  const kapali = !acik && x.durum !== "surer";
  return <Cerceve aktif={acik && x.yon === "gelen"} ic={{ padding: 12, gap: 8 }}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
      <Madalyon icon={TUR_IKONU[x.tur] ?? "scroll"} size={40} aktif={acik} renk={kapali ? C.parchmentMuted : undefined} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: F.display, fontSize: 14, color: kapali ? C.parchmentDim : C.parchment, textAlign: hiza(rtl) }}>{baslik}</Text>
        <Pressable disabled={!onKisi} accessibilityRole="link" accessibilityLabel={karsi.ad} onPress={() => onKisi?.(karsi.id)} style={{ minHeight: 24, justifyContent: "center" }}>
          <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 15, color: C.goldBright, textAlign: hiza(rtl), textDecorationLine: onKisi ? "underline" : "none" }}>{karsi.ad}</Text>
        </Pressable>
      </View>
      <Rozet metin={t("onl.tp.d." + x.durum)} renk={acik ? C.goldBright : x.durum === "surer" ? C.sage : C.parchmentMuted} dolu={acik && x.yon === "gelen"} />
    </View>
    {sartYaz(t, x, ay).map((s, i) => <View key={i} style={{ flexDirection: yon(rtl), gap: 8 }}>
      <View style={{ width: 5, height: 5, marginTop: 8, borderRadius: 3, backgroundColor: C.gold }} />
      <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{s}</Text>
    </View>)}
    {x.emanet > 0 && (acik || x.durum === "surer") ? <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{applyParams(t("onl.tp.emanet"), [x.emanet])}</Text> : null}
    {acik ? <View style={{ gap: 4, paddingTop: 2, borderTopWidth: 1, borderColor: "rgba(201,162,78,0.15)" }}>
      <Text style={{ fontFamily: F.display, fontSize: 11.5, color: C.gold, textAlign: hiza(rtl) }}>{applyParams(t("onl.tp.sonCevap"), [ayFarki(t, x.sonAy, ay)])}</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{varsayilanYaz(t, x)}</Text>
    </View> : null}
    {kapali ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, color: C.parchmentMuted, textAlign: hiza(rtl) }}>
      {[x.neden ? t("onl.tp.n." + x.neden) : null, x.kapanisAyi !== undefined ? ayFarki(t, x.kapanisAyi, ay) : null].filter(Boolean).join(" · ")}
    </Text> : null}
    {odeyebilir ? <View style={{ gap: 8 }}>
      <Sayac etiket={t("onl.tp.odeTutar")} deger={tutar} en={1} cok={x.kalan ?? 1} onDegis={setTutar} birim={t("onl.tp.akceBirim")} />
      <CizgiDugme etiket={applyParams(t("onl.tp.ode"), [tutar])} icon="coins" rtl={rtl} kucuk kapali={bekliyor("ode")} onPress={() => { void cevapla("ode"); }} />
    </View> : null}
    {cevaplar.length ? <View style={{ flexDirection: yon(rtl), gap: 8 }}>
      {cevaplar.map((c) => <View key={c} style={{ flex: 1 }}>
        {c === "kabul" || c === "teslim" ? <AltinDugme etiket={t("onl.tp.c." + c)} icon={c === "kabul" ? "star" : "check-circle"} rtl={rtl} bekliyor={bekliyor(c)} onPress={() => { void cevapla(c); }} />
          : <CizgiDugme etiket={t("onl.tp.c." + c)} rtl={rtl} kucuk kapali={bekliyor(c)} onPress={() => { void cevapla(c); }} />}
      </View>)}
    </View> : null}
    {hata ? <Bant metin={t(hataAnahtari(hata))} rtl={rtl} /> : null}
    {tamam ? <Bant tur="bilgi" metin={tamam} rtl={rtl} /> : null}
  </Cerceve>;
}

// ---------------------------------------------------------------- küçük denetimler

/** Sayaç: − değer + (44 px dokunma alanı). */
export function Sayac({ etiket, deger, en, cok, onDegis, birim, adim = 1 }: { etiket: string; deger: number; en: number; cok: number; onDegis: (n: number) => void; birim?: string; adim?: number }) {
  const { t, rtl } = useI18n();
  const dugme = (fark: number, isaret: string) => {
    const yeni = Math.max(en, Math.min(cok, deger + fark));
    const kapali = yeni === deger;
    return <Pressable accessibilityLabel={`${etiket} ${isaret === "+" ? t("onl.tp.artir") : t("onl.tp.azalt")}`} accessibilityState={{ disabled: kapali }} disabled={kapali}
      onPress={() => { hap("selection"); onDegis(yeni); }}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: kapali ? "rgba(168,130,63,0.35)" : ONL.frameHi, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? "rgba(201,162,78,0.22)" : "rgba(14,10,6,0.7)", opacity: kapali ? 0.5 : 1 })}>
      <Text style={{ fontFamily: F.display, fontSize: 20, lineHeight: 24, color: C.goldBright }}>{isaret === "+" ? "+" : "−"}</Text>
    </Pressable>;
  };
  return <View accessible={false} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
    <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{etiket}</Text>
    {dugme(-adim, "-")}
    <Text accessibilityLiveRegion="polite" style={{ minWidth: 54, fontFamily: F.display, fontSize: 16, color: C.parchment, textAlign: "center" }}>{birim ? `${deger} ${birim}` : String(deger)}</Text>
    {dugme(adim, "+")}
  </View>;
}

/** Seçim çipleri (radyo grubu); kilitli seçenek nedeniyle gösterilir. */
export function Secenekler<T extends string>({ secenekler, secili, onSec, etiket, kilit, ikon }: { secenekler: readonly T[]; secili: T | null; onSec: (s: T) => void; etiket: (s: T) => string; kilit?: (s: T) => string | null | undefined; ikon?: (s: T) => string }) {
  const { rtl } = useI18n();
  return <View accessibilityRole="radiogroup" style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
    {secenekler.map((s) => {
      const sec = s === secili;
      const k = kilit?.(s);
      return <Pressable key={s} accessibilityRole="radio" accessibilityLabel={etiket(s)} accessibilityState={{ selected: sec, disabled: !!k }} accessibilityHint={k ?? undefined}
        onPress={() => { if (k) { hap("warning"); return; } hap("selection"); onSec(s); }}
        style={({ pressed }) => ({ minHeight: 44, flexDirection: yon(rtl), alignItems: "center", gap: 6, paddingHorizontal: 12, borderRadius: 22, borderWidth: sec ? 2 : 1, borderColor: sec ? C.goldBright : "rgba(201,162,78,0.4)", backgroundColor: sec ? "rgba(201,162,78,0.2)" : pressed ? "rgba(201,162,78,0.1)" : "rgba(14,10,6,0.7)", opacity: k ? 0.5 : 1 })}>
        {ikon ? <GameIcon name={k ? "hourglass" : ikon(s)} size={14} color={sec ? C.goldBright : C.parchmentMuted} /> : null}
        <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 12.5, color: sec ? C.parchment : C.parchmentDim }}>{etiket(s)}</Text>
      </Pressable>;
    })}
  </View>;
}

function Alan({ baslik, children }: { baslik: string; children: ReactNode }) {
  const { rtl } = useI18n();
  return <View style={{ gap: 8 }}>
    <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 1.2, color: C.goldBright, textAlign: hiza(rtl) }}>{baslik}</Text>
    {children}
  </View>;
}

// ---------------------------------------------------------------- teklif formu

/** Eylem kapısı metni (yaş/engel) — profil eylemlerinden. */
export function kapiMetni(t: Ceviri, tur: string, engel: string | undefined): string | null {
  if (!engel) return null;
  if (engel === "yas_kapisi") return applyParams(t("onl.tp.yasKapisi"), [tur === "teklif.gorucu" ? TOPLUM_SINIR.gorucuYasi : TOPLUM_SINIR.teklifYasi]);
  return t(hataAnahtari(engel as OnlineHata));
}

/** Teklif oluştur: tür, şartlar formu ve gönderince ne olacağının ön izlemesi. Sonuç sunucudan gelir. */
export function TeklifFormu({ p, baslangic, onBitti }: { p: OyuncuProfili; baslangic?: OyuncuTeklifTuru; onBitti: () => void }) {
  const { t, rtl } = useI18n();
  const o = useOnline();
  const toplum = useToplum();
  const ben = o.yerlesim?.ben;
  const para = ben?.para ?? 0;
  const kapi = (tur: OyuncuTeklifTuru) => kapiMetni(t, `teklif.${tur}`, p.eylemler.find((e) => e.tur === `teklif.${tur}`)?.engel);
  const ilkAcik = OYUNCU_TEKLIF_TURLERI.find((x) => !kapi(x)) ?? "hediye";
  const [tur, setTur] = useState<OyuncuTeklifTuru>(baslangic && !kapi(baslangic) ? baslangic : ilkAcik);
  // Çıraklık: usta olacak tarafın en az kalfa olduğu meslekler.
  const [ustaBen, setUstaBen] = useState(true);
  const benimMeslekler = useMemo(() => Object.entries(o.meslekDurumu?.kayit.s ?? {}).filter(([, i]) => (i?.kd ?? 0) >= 1).map(([m]) => m as MeslekId), [o.meslekDurumu]);
  const onunMeslekleri = p.meslekler.filter((m) => m.kademe >= 1).map((m) => m.meslek);
  const cirakAday = ustaBen ? benimMeslekler : onunMeslekleri;
  const [meslek, setMeslek] = useState<MeslekId | null>(null);
  const [pay, setPay] = useState(10);
  const [sure, setSure] = useState(6);
  const [borcYon, setBorcYon] = useState<"ver" | "iste">("ver");
  const [tutar, setTutar] = useState(10);
  const [vade, setVade] = useState(6);
  const [faiz, setFaiz] = useState(0);
  const [akce, setAkce] = useState(0);
  const malVar = MAL_IDLERI.filter((m) => (o.envanter?.[m] ?? 0) > 0);
  const [mal, setMal] = useState<MalId | null>(null);
  const [adet, setAdet] = useState(1);
  const [isTuru, setIsTuru] = useState<"arabuluculuk" | "muhafiz" | "mektup">("mektup");
  const [isUcret, setIsUcret] = useState(() => Math.max(1, Math.min(8, para)));
  const [mektupHedef, setMektupHedef] = useState("");
  const [mektupMetni, setMektupMetni] = useState("");
  const [hata, setHata] = useState<OnlineHata | null>(null);
  const [bitti, setBitti] = useState(false);
  useEffect(() => { setMeslek(cirakAday[0] ?? null); }, [ustaBen]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!o.meslekDurumu && !o.yerlesim) void o.yerlesimYukle(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const malDeger = mal ? Math.max(1, MALLAR[mal]?.taban ?? 1) * adet : 0;
  const hediyeDeger = akce + malDeger;
  const sart: TeklifSartGirdisi =
    tur === "cirak" ? { ...(meslek ? { meslek } : {}), ustaBen }
    : tur === "ortak" ? { pay, sure }
    : tur === "borc" ? { yon: borcYon, tutar, vade, faiz }
    : tur === "hediye" ? { ...(akce ? { tutar: akce } : {}), ...(mal ? { mal, adet } : {}) }
    : tur === "is" ? { is: isTuru, tutar: isUcret, ...(isTuru === "mektup" ? { mektupHedef, mektupMetni } : {}) }
    : {};
  const gecerli = !kapi(tur) && (tur !== "cirak" || !!meslek) && (tur !== "hediye" || (hediyeDeger >= 1 && hediyeDeger <= TOPLUM_SINIR.hediyeEnCok)) && (tur !== "is" || (isUcret >= 1 && isUcret <= Math.min(TOPLUM_SINIR.isEnCok, para) && (isTuru !== "mektup" || (new RegExp("^o[1-9][0-9]{0,8}$").test(mektupHedef.trim()) && mektupMetni.trim().length >= 1 && mektupMetni.trim().length <= 240))));
  const anahtar = `teklif:${p.id}:${tur}:${JSON.stringify(sart)}`;
  const gonder = async () => {
    setHata(null);
    const s = await toplum.teklifVer(tur, p.id, sart);
    if (s.ok) { hap("success"); setBitti(true); } else { hap("error"); setHata(s.hata); }
  };
  if (bitti) return <View style={{ gap: 14, alignItems: "center", paddingVertical: 8 }}>
    <Madalyon icon={TUR_IKONU[tur]} size={60} aktif />
    <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 19, color: C.parchment, textAlign: "center" }}>{t("onl.tp.f.gitti")}</Text>
    <Text style={{ fontFamily: F.serif, fontSize: 15.5, lineHeight: 21, color: C.parchmentDim, textAlign: "center" }}>{applyParams(t("onl.tp.f.gittiAlt"), [p.ad])}</Text>
    <View style={{ alignSelf: "stretch" }}><CizgiDugme etiket={t("onl.tp.tamam")} rtl={rtl} onPress={onBitti} /></View>
  </View>;

  // Ön izleme: gönderince ne kilitlenir, ne kadar süre beklenir, cevapsız kalırsa ne olur.
  const onizleme: string[] = [];
  if (tur === "borc" && borcYon === "ver") onizleme.push(applyParams(t("onl.tp.f.emanetBorc"), [tutar]));
  if (tur === "borc") onizleme.push(applyParams(t("onl.tp.f.geriOdeme"), [Math.round((tutar * (100 + faiz)) / 100), vade]));
  if (tur === "hediye") onizleme.push(applyParams(t("onl.tp.f.emanetHediye"), [armaganYaz(t, { akce, ...(mal ? { mal, adet } : {}) }) || "—", TOPLUM_SINIR.hediyeTakat]));
  if (tur === "ortak") onizleme.push(t("onl.tp.f.ortakNot"));
  if (tur === "cirak") onizleme.push(t("onl.tp.f.cirakNot"));
  if (tur === "gorucu") onizleme.push(t("onl.tp.s.gorucu"));
  if (tur === "is") onizleme.push(applyParams(t("onl.tp.f.isEmanet"), [isUcret]), applyParams(t("onl.tp.f.isSure"), [isTuru === "mektup" ? 1 : 2]));
  onizleme.push(t("onl.tp.f.sure"), t("onl.tp.f.cevapsiz"));

  return <View style={{ gap: 14 }}>
    <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 19, color: C.parchment, textAlign: hiza(rtl) }}>{applyParams(t("onl.tp.f.baslik"), [p.ad])}</Text>
    <Alan baslik={t("onl.tp.f.tur")}>
      <Secenekler secenekler={OYUNCU_TEKLIF_TURLERI} secili={tur} onSec={(x) => { setTur(x); setHata(null); }} etiket={(x) => t("onl.tp.tur." + x)} ikon={(x) => TUR_IKONU[x]} kilit={kapi} />
      {kapi(tur) ? <Bant tur="bilgi" metin={kapi(tur)!} rtl={rtl} /> : <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.tp.f.d." + tur)}</Text>}
    </Alan>

    {tur === "cirak" ? <Alan baslik={t("onl.tp.f.sartlar")}>
      <Secenekler secenekler={["ben", "o"] as const} secili={ustaBen ? "ben" : "o"} onSec={(x) => setUstaBen(x === "ben")} etiket={(x) => (x === "ben" ? t("onl.tp.f.ustaBen") : applyParams(t("onl.tp.f.ustaO"), [p.ad]))} />
      {cirakAday.length ? <Secenekler secenekler={cirakAday} secili={meslek} onSec={setMeslek} etiket={(m) => t("onl.mes." + m)} />
        : <BosKart icon="anvil" metin={t("onl.tp.f.cirakYok")} rtl={rtl} />}
    </Alan> : null}
    {tur === "ortak" ? <Alan baslik={t("onl.tp.f.sartlar")}>
      <Sayac etiket={t("onl.tp.f.pay")} deger={pay} en={1} cok={TOPLUM_SINIR.ortakPay} onDegis={setPay} birim="%" />
      <Sayac etiket={t("onl.tp.f.sureAy")} deger={sure} en={1} cok={TOPLUM_SINIR.ortakSure} onDegis={setSure} birim={t("onl.tp.ayBirim")} />
    </Alan> : null}
    {tur === "borc" ? <Alan baslik={t("onl.tp.f.sartlar")}>
      <Secenekler secenekler={["ver", "iste"] as const} secili={borcYon} onSec={setBorcYon} etiket={(x) => t("onl.tp.f.borc." + x)} />
      <Sayac etiket={t("onl.tp.f.tutar")} deger={tutar} en={1} cok={TOPLUM_SINIR.borcEnCok} onDegis={setTutar} birim={t("onl.tp.akceBirim")} />
      <Sayac etiket={t("onl.tp.f.faiz")} deger={faiz} en={0} cok={TOPLUM_SINIR.borcFaiz} onDegis={setFaiz} birim="%" />
      <Sayac etiket={t("onl.tp.f.vade")} deger={vade} en={1} cok={TOPLUM_SINIR.borcVade} onDegis={setVade} birim={t("onl.tp.ayBirim")} />
      {borcYon === "ver" && tutar > para ? <Bant tur="bilgi" metin={applyParams(t("onl.tp.f.paraAz"), [para])} rtl={rtl} /> : null}
    </Alan> : null}
    {tur === "is" ? <Alan baslik={t("onl.tp.f.sartlar")}>
      <Secenekler secenekler={["arabuluculuk", "muhafiz", "mektup"] as const} secili={isTuru} onSec={setIsTuru} etiket={(x) => t("onl.tp.is." + x)} ikon={(x) => x === "muhafiz" ? "shield" : x === "arabuluculuk" ? "scale" : "mail"} />
      <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.tp.is.d." + isTuru)}</Text>
      <Sayac etiket={t("onl.tp.f.isUcret")} deger={isUcret} en={1} cok={Math.max(1, Math.min(TOPLUM_SINIR.isEnCok, para))} onDegis={setIsUcret} birim={t("onl.tp.akceBirim")} />
      {isUcret > para ? <Bant tur="bilgi" metin={applyParams(t("onl.tp.f.paraAz"), [para])} rtl={rtl} /> : null}
      {isTuru === "mektup" ? <>
        <Text style={{ fontFamily: F.display, fontSize: 11.5, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.tp.f.mektupHedef")}</Text>
        <TextInput value={mektupHedef} onChangeText={setMektupHedef} placeholder={t("onl.tp.f.mektupHedefOrnek")} placeholderTextColor={C.parchmentMuted}
          autoCapitalize="none" autoCorrect={false} maxLength={10} style={{ minHeight: 44, borderWidth: 1, borderColor: ONL.frameHi, borderRadius: 8, paddingHorizontal: 11, color: C.parchment, backgroundColor: "rgba(14,10,6,0.7)", fontFamily: F.serif, textAlign: hiza(rtl) }} />
        <Text style={{ fontFamily: F.display, fontSize: 11.5, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.tp.f.mektupMetni")}</Text>
        <TextInput value={mektupMetni} onChangeText={setMektupMetni} placeholder={t("onl.tp.f.mektupMetniOrnek")} placeholderTextColor={C.parchmentMuted}
          multiline maxLength={240} textAlignVertical="top" style={{ minHeight: 92, borderWidth: 1, borderColor: ONL.frameHi, borderRadius: 8, padding: 11, color: C.parchment, backgroundColor: "rgba(14,10,6,0.7)", fontFamily: F.serif, textAlign: hiza(rtl) }} />
        <Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{applyParams(t("onl.tp.f.mektupSayac"), [mektupMetni.trim().length])}</Text>
      </> : null}
    </Alan> : null}
    {tur === "hediye" ? <Alan baslik={t("onl.tp.f.sartlar")}>
      <Sayac etiket={t("onl.tp.f.akce")} deger={akce} en={0} cok={Math.min(TOPLUM_SINIR.hediyeEnCok, para)} onDegis={setAkce} birim={t("onl.tp.akceBirim")} />
      {malVar.length ? <>
        <Secenekler secenekler={["yok", ...malVar] as const} secili={mal ?? "yok"} onSec={(m) => { setMal(m === "yok" ? null : m as MalId); setAdet(1); }}
          etiket={(m) => (m === "yok" ? t("onl.tp.f.malYok") : `${malAdi(t, m)} · ${o.envanter?.[m] ?? 0}`)} ikon={(m) => (m === "yok" ? "coins" : MAL_IKON[m as MalId] ?? "amphora")} />
        {mal ? <Sayac etiket={t("onl.tp.f.adet")} deger={adet} en={1} cok={Math.max(1, Math.min(o.envanter?.[mal] ?? 1, TOPLUM_SINIR.hediyeEnCok))} onDegis={setAdet} /> : null}
      </> : <Text style={{ fontFamily: F.serifItalic, fontSize: 14, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.tp.f.ambarBos")}</Text>}
      <Text style={{ fontFamily: F.display, fontSize: 12.5, color: hediyeDeger > TOPLUM_SINIR.hediyeEnCok ? C.ember : C.gold, textAlign: hiza(rtl) }}>{applyParams(t("onl.tp.f.deger"), [hediyeDeger, TOPLUM_SINIR.hediyeEnCok])}</Text>
    </Alan> : null}

    <View style={{ gap: 6, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,162,78,0.3)", backgroundColor: "rgba(14,10,6,0.6)" }}>
      <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 1.2, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.tp.f.onizleme")}</Text>
      {onizleme.map((s, i) => <Text key={i} style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{s}</Text>)}
    </View>
    {hata ? <Bant metin={t(hataAnahtari(hata))} rtl={rtl} /> : null}
    <AltinDugme etiket={t("onl.tp.f.gonder")} icon={TUR_IKONU[tur]} rtl={rtl} kapali={!gecerli} bekliyor={toplum.bekliyor(anahtar)} onPress={() => { void gonder(); }} />
  </View>;
}

// ---------------------------------------------------------------- olağan düzen

/** Gelen teklif türleri (borç isteme ayrı satırdır: npcBorc ve oyuncunun "borç iste" teklifi borç cevabını izler). */
const DUZEN_TURLERI = TEKLIF_TURLERI.filter((x) => x !== "npcBorc");

/** Olağan düzen: yokken gelen teklife verilecek cevap, borç isteyene cevap ve en çok tutar. Kaydedince sunucuya gider. */
export function OlaganDuzenKarti() {
  const { t, rtl } = useI18n();
  const toplum = useToplum();
  const [acik, setAcik] = useState(false);
  const [taslak, setTaslak] = useState<{ gelen: Partial<Record<TeklifTuru, GelenCevap>>; borcCevap: GelenCevap; borcEnCok: number } | null>(null);
  const [kayit, setKayit] = useState(false);
  const d = toplum.duzen;
  useEffect(() => { if (acik && !d) void toplum.duzenYukle(); }, [acik]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (d) setTaslak({ gelen: { ...d.gelen }, borcCevap: d.borcCevap, borcEnCok: d.borcEnCok }); }, [d]);
  const ozet = d ? applyParams(t("onl.tp.dz.ozet"), [DUZEN_TURLERI.filter((x) => d.gelen[x] === "kabul").length, DUZEN_TURLERI.filter((x) => d.gelen[x] === "ret").length]) : t("onl.tp.dz.alt");
  const degisti = !!(d && taslak) && (taslak.borcCevap !== d.borcCevap || taslak.borcEnCok !== d.borcEnCok || DUZEN_TURLERI.some((x) => (taslak.gelen[x] ?? "bekle") !== d.gelen[x]));
  const kaydet = async () => {
    if (!taslak || !d) return;
    setKayit(false);
    const gelen = Object.fromEntries(DUZEN_TURLERI.filter((x) => (taslak.gelen[x] ?? "bekle") !== d.gelen[x]).map((x) => [x, taslak.gelen[x] ?? "bekle"]));
    const s = await toplum.duzenKaydet({ gelen, borcCevap: taslak.borcCevap, borcEnCok: taslak.borcEnCok });
    if (s.ok) { hap("success"); setKayit(true); } else hap("error");
  };
  const kendiliginden = d?.sinir.kendiligindenKabulYok ?? ["gorucu", "npcDunur", "is"];
  const hata = toplum.hataOf("duzenOku");
  const kayitHata = toplum.hata?.islem.startsWith("duzen:") ? toplum.hata.kod : null;
  return <Cerceve ic={{ padding: 12, gap: 10 }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: acik }} accessibilityLabel={`${t("onl.tp.dz.baslik")}. ${ozet}`} onPress={() => { hap("tap"); setAcik((a) => !a); }}
      style={{ minHeight: 44, flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
      <Madalyon icon="cog" size={38} aktif={acik} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: F.display, fontSize: 14, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.tp.dz.baslik")}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{ozet}</Text>
      </View>
      <GameIcon name={acik ? "scroll-open" : "scroll"} size={18} color={C.goldDim} />
    </Pressable>
    {acik ? (taslak ? <View style={{ gap: 12 }}>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.tp.dz.not")}</Text>
      {DUZEN_TURLERI.map((x) => <View key={x} style={{ gap: 6 }}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 6 }}>
          <GameIcon name={TUR_IKONU[x]} size={14} color={C.gold} />
          <Text style={{ flex: 1, fontFamily: F.display, fontSize: 12.5, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.tp.dz.tur." + x)}</Text>
        </View>
        <Secenekler secenekler={["bekle", "kabul", "ret"] as const} secili={taslak.gelen[x] ?? "bekle"} etiket={(c) => t("onl.tp.dz.c." + c)}
          kilit={(c) => (c === "kabul" && kendiliginden.includes(x) ? t("onl.tp.dz.yuzYuze") : null)}
          onSec={(c) => setTaslak({ ...taslak, gelen: { ...taslak.gelen, [x]: c } })} />
      </View>)}
      <View style={{ gap: 6, paddingTop: 6, borderTopWidth: 1, borderColor: "rgba(201,162,78,0.15)" }}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 6 }}>
          <GameIcon name="coins" size={14} color={C.gold} />
          <Text style={{ flex: 1, fontFamily: F.display, fontSize: 12.5, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.tp.dz.borc")}</Text>
        </View>
        <Secenekler secenekler={["bekle", "kabul", "ret"] as const} secili={taslak.borcCevap} etiket={(c) => t("onl.tp.dz.c." + c)} onSec={(c) => setTaslak({ ...taslak, borcCevap: c })} />
        {taslak.borcCevap === "kabul" ? <Sayac etiket={t("onl.tp.dz.borcEnCok")} deger={taslak.borcEnCok} en={0} cok={d?.sinir.borcEnCok ?? TOPLUM_SINIR.duzenBorcEnCok} onDegis={(n) => setTaslak({ ...taslak, borcEnCok: n })} birim={t("onl.tp.akceBirim")} /> : null}
        <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.tp.dz.borcNot")}</Text>
      </View>
      {kayitHata ? <Bant metin={t(hataAnahtari(kayitHata))} rtl={rtl} /> : null}
      {kayit && !degisti ? <Bant tur="bilgi" metin={t("onl.tp.dz.kaydedildi")} rtl={rtl} /> : null}
      <AltinDugme etiket={t("onl.tp.dz.kaydet")} icon="cog" rtl={rtl} kapali={!degisti} bekliyor={!!toplum.islem?.startsWith("duzen:")} onPress={() => { void kaydet(); }} />
    </View> : hata ? <Bant metin={t(hataAnahtari(hata))} rtl={rtl} eylem={t("onl.yenidenDene")} onEylem={() => { void toplum.duzenYukle(); }} />
      : <Text style={{ fontFamily: F.serifItalic, fontSize: 14, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.yukleniyor")}</Text>) : null}
  </Cerceve>;
}

// ---------------------------------------------------------------- gelen kutusu kısayolu

/** Yaşam ve karakter ekranlarında gelen kutusu: cevap bekleyen sayısı rozetle (sessiz yükleme; kilitlemez). */
export function GelenKutusuKarti({ ust = 8 }: { ust?: number }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const toplum = useToplum();
  const dar = useWindowDimensions().width < 360;
  useEffect(() => { if (!toplum.gelen) void toplum.gelenYukle(); }, [toplum.hesap]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = toplum.bekleyen;
  const g = toplum.gelen;
  const alt = !g ? t("onl.tp.gk.alt") : n ? applyParams(t("onl.tp.gk.bekleyen"), [n]) : g.suren.length ? applyParams(t("onl.tp.gk.suren"), [g.suren.length]) : t("onl.tp.gk.bos");
  return <Pressable accessibilityRole="button" accessibilityLabel={`${t("onl.tp.gk.baslik")}: ${alt}`} onPress={() => { hap("tap"); router.push("/online/gelen"); }}
    style={({ pressed }) => ({ marginTop: ust, transform: [{ scale: pressed ? 0.985 : 1 }] })}>
    <Cerceve aktif={n > 0} ic={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12, minHeight: 64 }}>
      <Madalyon icon="scroll" size={38} aktif={n > 0} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: dar ? 12.5 : 13.5, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.tp.gk.baslik")}</Text>
        <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: n ? C.goldBright : C.parchmentDim, textAlign: hiza(rtl) }}>{alt}</Text>
      </View>
      {n ? <Rozet metin={String(n)} renk={C.goldBright} dolu /> : null}
    </Cerceve>
  </Pressable>;
}

/** Karakter ekranındaki Faz 3a bölümü: profil sayfam, gelen kutusu ve olağan düzen. */
export function KarakterToplumBolumu({ benId }: { benId: string }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
  return <View style={{ marginTop: 12, gap: 8 }}>
    <CizgiDugme etiket={t("onl.tp.profilim")} icon="hood" rtl={rtl} kucuk onPress={() => router.push(`/online/oyuncu/${benId}`)} />
    <GelenKutusuKarti ust={0} />
    <OlaganDuzenKarti />
  </View>;
}
