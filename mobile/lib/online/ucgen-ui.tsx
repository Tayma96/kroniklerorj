// Üçgen (Faz 4) arayüzü: NPC kişi sayfasına eklenen bölüm. İlişki eksenleri (güven, yakınlık, saygı …), kışkırtma,
// casus, arabulucu isteme/olma, ittifak sözleri ve barışlar. Her eylemde sunucunun şans dökümü ve gerekçesi gösterilir;
// §13.9 gereği görünmeyen bilgi (NPC'nin hedefe bakışı, toplam şans) "bilinmiyor" diye yazılır, kaba izlenim eklenir.
import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text } from "react-native";
import { useI18n, applyParams } from "../i18n";
import type { Lang } from "../locale-data";
import { C, F } from "../theme";
import { GameIcon } from "../icons";
import { hap } from "../haptics";
import { DesignPressable as Pressable } from "../design-pressable";
import { useOnline } from "./durum";
import { istekNoUret } from "./depo";
import { ekHataAnahtari, type EkHata } from "./ek-istemci";
import { AltinDugme, Bant, Cerceve, CizgiDugme, Madalyon, ONL, hiza, yon } from "./ui";
import { AltPanel, Baslik2, BosKart, Degisim, Rozet, SansHalkasi, gorusRengi, sansRengi } from "./yasam-ui";
import { ZarSeridi } from "./eylem-ui";
import { BECERI_IKON, NAM_IKON, isaretli, kalemYaz } from "./metin";
import type { Kalem, KisiNpc } from "./protokol";
import {
  ARACI_BEDELLERI, CASUS_AYLIK_BEDEL, CASUS_SURE_EN_COK, EKSENLER, KISKIRT_TEKLIFLERI, TAZMINAT_TAVANI,
  bilinenMi, kisiEksenleri, ucgenOyunculari, useUcgenIstemci,
  type AraciBedeli, type Eksenler, type Hamle, type KiskirtTeklifi, type UcgenGorunumu, type UcgenGovdesi, type UcgenYaniti,
} from "./ucgen-veri";

type Ceviri = (k: string) => string;
type Panel = "kiskirt" | "casus" | "araci";
const hataYaz = (h: string, t: Ceviri) => t(ekHataAnahtari(h as EkHata));
const kalanAy = (bitis: number, ay: number) => Math.max(0, bitis - ay);

function Not({ metin, rtl, renk = C.parchmentMuted }: { metin: string; rtl: boolean; renk?: string }) {
  return <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 18, color: renk, textAlign: hiza(rtl) }}>{metin}</Text>;
}

/** Döküm listesi: kalemler, gizli kalem ("bilinmiyor") ve toplam (bilinmiyorsa yazılmaz). */
export function DokumListesi({ kalemler, toplam, toplamEtiket, gizli, rtl, t, lang }: { kalemler: Kalem[]; toplam: number | null; toplamEtiket: string; gizli?: string; rtl: boolean; t: Ceviri; lang: Lang }) {
  const satir = (sol: string, sag: string, renk: string, key: string) => <View key={key} accessible accessibilityLabel={`${sol}: ${sag}`}
    style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderColor: "rgba(201,162,78,0.12)" }}>
    <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{sol}</Text>
    <Text style={{ minWidth: 44, fontFamily: F.display, fontSize: 13.5, color: renk, textAlign: rtl ? "left" : "right" }}>{sag}</Text>
  </View>;
  return <View style={{ borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,162,78,0.28)", backgroundColor: "rgba(0,0,0,0.25)", paddingHorizontal: 12, paddingVertical: 4 }}>
    {kalemler.map((k, i) => satir(kalemYaz(k, t, lang), isaretli(k.d), k.d > 0 ? C.sage : k.d < 0 ? C.ember : C.parchmentMuted, k.k + i))}
    {gizli ? satir(gizli, t("onl.ug.bilinmiyor"), C.parchmentMuted, "gizli") : null}
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingTop: 9, paddingBottom: 5 }}>
      <Text style={{ flex: 1, fontFamily: F.display, fontSize: 12.5, letterSpacing: rtl ? 0 : 1.2, color: C.goldBright, textAlign: hiza(rtl) }}>{toplamEtiket}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 16, color: toplam === null ? C.parchmentMuted : sansRengi(toplam) }}>{toplam === null ? t("onl.ug.bilinmiyor") : `${toplam}%`}</Text>
    </View>
  </View>;
}

/** İlişki eksenleri: görüş kalemlerinin eksenlere dağılımı (toplamları görüşe eşittir). Sıfır eksenler tek satırda. */
export function EksenGostergesi({ e, rtl, t }: { e: Eksenler; rtl: boolean; t: Ceviri }) {
  const dolu = EKSENLER.filter((x) => e[x]);
  const bos = EKSENLER.filter((x) => !e[x]);
  const enBuyuk = Math.max(10, ...dolu.map((x) => Math.abs(e[x] ?? 0)));
  return <View style={{ gap: 9 }}>
    {dolu.map((x) => {
      const v = e[x] ?? 0;
      return <View key={x} accessible accessibilityLabel={`${t("onl.ug.eksen." + x)}: ${isaretli(v)}`} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
        <Text numberOfLines={1} style={{ width: 78, fontFamily: F.display, fontSize: 12, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.ug.eksen." + x)}</Text>
        <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: "rgba(201,162,78,0.12)", flexDirection: yon(rtl) }}>
          <View style={{ flex: 1, alignItems: rtl ? "flex-start" : "flex-end" }}>{v < 0 ? <View style={{ width: `${(Math.abs(v) / enBuyuk) * 100}%`, height: 8, borderRadius: 4, backgroundColor: C.ember }} /> : null}</View>
          <View style={{ width: 2, height: 8, backgroundColor: "rgba(201,162,78,0.5)" }} />
          <View style={{ flex: 1, alignItems: rtl ? "flex-end" : "flex-start" }}>{v > 0 ? <View style={{ width: `${(v / enBuyuk) * 100}%`, height: 8, borderRadius: 4, backgroundColor: C.sage }} /> : null}</View>
        </View>
        <Text style={{ minWidth: 34, fontFamily: F.display, fontSize: 13, color: gorusRengi(v), textAlign: rtl ? "left" : "right" }}>{isaretli(v)}</Text>
      </View>;
    })}
    {!dolu.length ? <Not metin={t("onl.ug.eksenBos")} rtl={rtl} /> : null}
    {dolu.length && bos.length ? <Not metin={applyParams(t("onl.ug.eksenSifir"), [bos.map((x) => t("onl.ug.eksen." + x)).join(", ")])} rtl={rtl} /> : null}
  </View>;
}

function Secim<T extends string | number>({ secenekler, secili, etiket, onSec, rtl }: { secenekler: readonly T[]; secili: T; etiket: (v: T) => string; onSec: (v: T) => void; rtl: boolean }) {
  return <View accessibilityRole="radiogroup" style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
    {secenekler.map((v) => {
      const s = v === secili;
      return <Pressable key={String(v)} accessibilityRole="radio" accessibilityState={{ selected: s }} accessibilityLabel={etiket(v)} onPress={() => { hap("selection"); onSec(v); }}
        style={({ pressed }) => ({ flexGrow: 1, flexBasis: 120, minHeight: 44, paddingHorizontal: 10, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: s ? 2 : 1, borderColor: s ? C.goldBright : "rgba(201,162,78,0.4)", backgroundColor: s ? "rgba(201,162,78,0.18)" : pressed ? "rgba(201,162,78,0.1)" : "rgba(14,10,6,0.7)" })}>
        <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: 12.5, color: s ? C.parchment : C.parchmentDim, textAlign: "center" }}>{etiket(v)}</Text>
      </Pressable>;
    })}
  </View>;
}

function Sayac({ deger, alt, ust, onDegis, etiket, rtl, t }: { deger: number; alt: number; ust: number; onDegis: (n: number) => void; etiket: string; rtl: boolean; t: Ceviri }) {
  const dugme = (fark: number, simge: string, erisim: string) => <Pressable accessibilityRole="button" accessibilityLabel={erisim} disabled={deger + fark < alt || deger + fark > ust}
    onPress={() => { hap("selection"); onDegis(deger + fark); }}
    style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: ONL.frame, alignItems: "center", justifyContent: "center", opacity: deger + fark < alt || deger + fark > ust ? 0.4 : 1 }}>
    <Text style={{ fontFamily: F.display, fontSize: 18, color: C.goldBright }}>{simge}</Text>
  </Pressable>;
  return <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
    <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchmentDim, textAlign: hiza(rtl) }}>{etiket}</Text>
    {dugme(-1, "−", t("onl.ug.azalt"))}
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 4, minWidth: 44, justifyContent: "center" }}>
      <GameIcon name="coins" size={13} color={C.gold} />
      <Text style={{ fontFamily: F.display, fontSize: 16, color: C.parchment }}>{deger}</Text>
    </View>
    {dugme(1, "+", t("onl.ug.artir"))}
  </View>;
}

function EylemSatiri({ icon, baslik, alt, sans, kapali, rtl, onPress }: { icon: string; baslik: string; alt: string; sans: number | null | undefined; kapali: boolean; rtl: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${baslik}. ${alt}`} onPress={() => { hap("tap"); onPress(); }} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>
    <Cerceve ic={{ flexDirection: yon(rtl), alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
      <Madalyon icon={icon} size={44} aktif={!kapali} renk={kapali ? C.parchmentMuted : undefined} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontFamily: F.display, fontSize: 15, color: kapali ? C.parchmentDim : C.parchment, textAlign: hiza(rtl) }}>{baslik}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 18, color: kapali ? C.emberSoft : C.parchmentMuted, textAlign: hiza(rtl) }}>{alt}</Text>
      </View>
      {typeof sans === "number" ? <SansHalkasi yuzde={sans} boyut={48} kilitli={kapali} />
        : <View style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: ONL.frame, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(14,10,6,0.7)" }}>
          <Text style={{ fontFamily: F.display, fontSize: 18, color: C.parchmentMuted }}>?</Text>
        </View>}
    </Cerceve>
  </Pressable>;
}

/** Eylemin sonucu: zar, döküm, gerekçe, değişimler (hepsi sunucunun yanıtı). */
function UcgenSonucu({ y, ay, rtl, t, lang, onTamam }: { y: UcgenYaniti; ay: number; rtl: boolean; t: Ceviri; lang: Lang; onTamam: () => void }) {
  const durum = y.tur === "katil" ? (y.katildi ? "evet" : "hayir") : y.sonuc;
  const anahtar = `onl.ug.sonuc.${y.tur}${durum ? "." + durum : ""}`;
  const olumlu = y.sonuc === "basari" || y.sonuc === "baris" || y.sonuc === "sartli" || y.katildi === true || ["araciIste", "sartOde", "casus"].includes(y.tur);
  const d = y.degisim ?? {};
  const parca: { icon: string; metin: string; olumlu: boolean }[] = [];
  if (d.para) parca.push({ icon: "coins", metin: applyParams(t("onl.ug.dg.para"), [isaretli(d.para)]), olumlu: d.para > 0 });
  for (const [k, v] of Object.entries(d.nam ?? {})) parca.push({ icon: NAM_IKON[k] ?? "star", metin: `${t("onl.nam." + k)} ${isaretli(v)}`, olumlu: v > 0 });
  for (const [k, v] of Object.entries(d.beceri ?? {})) parca.push({ icon: BECERI_IKON[k] ?? "star", metin: `${t("onl.beceri." + k)} ${isaretli(v)}`, olumlu: v > 0 });
  const gerekceKalemi = typeof y.gerekce === "string" ? y.sans?.kalemler.find((k) => k.k === y.gerekce) ?? { k: y.gerekce, d: 0 } : null;
  const gerekceler = Array.isArray(y.gerekce) ? y.gerekce : [];
  return <>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 12, paddingTop: 6 }}>
      <Madalyon icon={olumlu ? "star" : "hourglass"} size={52} aktif={olumlu} />
      <Text accessibilityRole="header" style={{ flex: 1, fontFamily: F.display, fontSize: 18, lineHeight: 24, color: C.parchment, textAlign: hiza(rtl) }}>{t(anahtar)}</Text>
    </View>
    {y.zar !== undefined && y.sans ? <ZarSeridi zar={y.zar} sans={y.sans.toplam} rtl={rtl} t={t} /> : null}
    {y.sans ? <DokumListesi kalemler={y.sans.kalemler} toplam={y.sans.toplam} toplamEtiket={t("onl.ey.toplamSans")} rtl={rtl} t={t} lang={lang} /> : null}
    {gerekceKalemi ? <Not metin={applyParams(t("onl.ug.belirleyen"), [kalemYaz(gerekceKalemi, t, lang)])} rtl={rtl} renk={C.parchmentDim} /> : null}
    {gerekceler.length ? <View style={{ gap: 4 }}>
      <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 1.2, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.ug.gerekce")}</Text>
      {gerekceler.map((k, i) => <Text key={k.k + i} style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{`· ${kalemYaz(k, t, lang)}`}</Text>)}
    </View> : null}
    {y.yakalandi ? <Bant metin={t("onl.ug.sonuc.yakalandi")} rtl={rtl} /> : null}
    {y.etki?.duyan !== undefined ? <Not metin={applyParams(t("onl.ug.etki.laf"), [y.etki.duyan, y.etki.guven ?? 0])} rtl={rtl} renk={C.parchmentDim} /> : null}
    {y.etki?.boykotBitis !== undefined ? <Not metin={applyParams(t("onl.ug.etki.boykot"), [kalanAy(y.etki.boykotBitis, ay)])} rtl={rtl} renk={C.parchmentDim} /> : null}
    {y.sart ? <Not metin={applyParams(t("onl.ug.sart"), [y.sart.tutar, y.sart.deger, kalanAy(y.sart.sonAy, ay)])} rtl={rtl} renk={C.parchmentDim} /> : null}
    {y.deger ? <Not metin={applyParams(t("onl.ug.barisDeger"), [isaretli(y.deger)])} rtl={rtl} renk={C.sage} /> : null}
    {y.ateskesBitis !== undefined ? <Not metin={applyParams(t("onl.ug.ateskes"), [kalanAy(y.ateskesBitis, ay)])} rtl={rtl} renk={C.parchmentDim} /> : null}
    {y.casus ? <Not metin={applyParams(t("onl.ug.casusSure"), [kalanAy(y.casus.bitis, ay)])} rtl={rtl} renk={C.parchmentDim} /> : null}
    {y.guven ? <DokumListesi kalemler={y.guven.kalemler} toplam={y.guven.toplam} toplamEtiket={t("onl.ug.guvenToplam")} rtl={rtl} t={t} lang={lang} /> : null}
    {y.carpikOran !== undefined ? <Not metin={t("onl.ug.carpikNot")} rtl={rtl} /> : null}
    {y.getiri && y.getiri.tekrar > 0 ? <Rozet icon="hourglass" metin={applyParams(t("onl.ey.getiri"), [y.getiri.carpan])} renk={C.ember} /> : null}
    {parca.length ? <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>{parca.map((p, i) => <Degisim key={i} {...p} />)}</View> : null}
    <AltinDugme etiket={t("onl.ug.tamam")} rtl={rtl} onPress={onTamam} />
  </>;
}

/** NPC kişi sayfasına eklenen üçgen bölümü. */
export function UcgenBolumu({ kisi }: { kisi: KisiNpc }) {
  const { t, rtl, lang } = useI18n();
  const o = useOnline();
  const ist = useUcgenIstemci();
  const oyuncular = useMemo(() => ucgenOyunculari(o.yerlesim), [o.yerlesim]);
  const [hedef, setHedef] = useState<string | null>(null);
  const [g, setG] = useState<UcgenGorunumu | null>(null);
  const [okumaHata, setOkumaHata] = useState<EkHata | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [sonuc, setSonuc] = useState<UcgenYaniti | null>(null);
  const [hata, setHata] = useState<EkHata | null>(null);
  const [bekleyen, setBekleyen] = useState<string | null>(null);
  const [teklif, setTeklif] = useState<KiskirtTeklifi>("ortaklik");
  const [miktar, setMiktar] = useState(5);
  const [sure, setSure] = useState(1);
  const [bedel, setBedel] = useState<AraciBedeli>("ozur");
  const [tazminat, setTazminat] = useState(5);
  const [arabulucu, setArabulucu] = useState<string | null>(null);
  const [bozOnay, setBozOnay] = useState<string | null>(null);
  const h = hedef ?? oyuncular[0]?.id ?? null;
  const hedefAd = oyuncular.find((x) => x.id === h)?.ad ?? "—";
  const dostlar = oyuncular.filter((x) => x.dost);
  const ar = arabulucu ?? dostlar[0]?.id ?? null;

  const oku = useCallback(async () => {
    const r = await ist.oku({ npc: kisi.id, ...(h ? { hedef: h } : {}), dil: lang });
    if (r.ok) { setG(r.deger); setOkumaHata(null); } else setOkumaHata(r.hata);
  }, [ist, kisi.id, h, lang]);
  useEffect(() => { void oku(); }, [oku]);

  const yap = async (govde: UcgenGovdesi, iz: string) => {
    setHata(null); setBekleyen(iz);
    const r = await ist.eylem({ ...govde, istekNo: istekNoUret() });
    setBekleyen(null);
    if (!r.ok) { hap("error"); setHata(r.hata); return; }
    hap(r.deger.sonuc === "ret" || r.deger.sonuc === "retHaber" || r.deger.katildi === false ? "warning" : "success");
    setPanel(null); setBozOnay(null); setSonuc(r.deger);
    void oku(); void o.yerlesimYukle(true); void o.kisiYukle(kisi.id);
  };

  const p = g?.parametreler;
  const on = g?.onizleme;
  const ay = g?.ay ?? o.yerlesim?.saat.oyunAyi ?? 0;
  const eksen = on?.eksenler ?? kisiEksenleri(kisi);
  const ks = on?.kiskirt;
  const teklifOn = ks?.teklifler[teklif];
  const ortaklikOn = ks?.teklifler.ortaklik;
  const kaba = ks?.kaba ? t("onl.ug.kaba." + ks.kaba) : null;
  const kirgin = kisi.sanaBakis.toplam < 0;
  const sozler = (g?.sozler ?? []).filter((s) => s.npc.id === kisi.id);
  const gelen = (g?.talepler.gelen ?? []).filter((x) => x.npc.id === kisi.id);
  const giden = (g?.talepler.giden ?? []).filter((x) => x.npc.id === kisi.id);
  const kapanan = (g?.talepler.kapanan ?? []).filter((x) => x.npc.id === kisi.id).slice(0, 3);
  const baris = (g?.barislar ?? []).find((x) => x.npc.id === kisi.id);
  const casusBurada = g?.casus && g.casus.npc.id === kisi.id ? g.casus : null;
  const takat = (tur: keyof NonNullable<typeof p>["takat"]) => applyParams(t("onl.ey.bedel"), [p?.takat[tur] ?? 1], lang);
  const panelHata = hata ? <Bant metin={hataYaz(hata, t)} rtl={rtl} /> : null;
  const bedelEtiketi = (b: AraciBedeli) => t("onl.ug.bedel." + b);
  const satir = (metin: string) => <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: C.parchment, textAlign: hiza(rtl) }}>{metin}</Text>;

  return <>
    {/* İlişki eksenleri */}
    {eksen ? <>
      <Baslik2 metin={t("onl.ug.eksenler")} rtl={rtl} />
      <Cerceve ic={{ padding: 14, gap: 8 }}>
        <EksenGostergesi e={eksen} rtl={rtl} t={t} />
        <Not metin={t("onl.ug.eksenNot")} rtl={rtl} />
      </Cerceve>
    </> : null}

    {/* Üçlü ilişkiler */}
    <Baslik2 metin={t("onl.ug.baslik")} rtl={rtl} />
    <View style={{ gap: 8 }}>
      {okumaHata && !g ? <Bant metin={hataYaz(okumaHata, t)} rtl={rtl} eylem={t("onl.yenidenDene")} onEylem={() => { void oku(); }} /> : null}
      {oyuncular.length ? <Cerceve ic={{ padding: 12, gap: 8 }}>
        <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 1.2, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.ug.hedefSec")}</Text>
        <Secim secenekler={oyuncular.map((x) => x.id)} secili={h ?? ""} etiket={(id) => oyuncular.find((x) => x.id === id)?.ad ?? id} onSec={(id) => setHedef(id)} rtl={rtl} />
        {h ? <Not rtl={rtl} renk={C.parchmentDim} metin={on?.gorunur ? applyParams(t("onl.ug.bakisGorunur"), [kisi.ad, hedefAd], lang)
          : applyParams(t("onl.ug.bakisBilinmiyor"), [kisi.ad, hedefAd], lang) + (kaba ? " " + kaba : "")} /> : null}
      </Cerceve> : <BosKart icon="family" metin={t("onl.ug.oyuncuYok")} rtl={rtl} />}

      {h ? <EylemSatiri icon="speaker" baslik={t("onl.ug.kiskirt")} rtl={rtl} kapali={!!ks?.engel}
        alt={ks?.engel ? hataYaz(ks.engel, t) : applyParams(t("onl.ug.kiskirtAlt"), [hedefAd], lang) + " · " + takat("kiskirt")}
        sans={ortaklikOn && !bilinenMi(ortaklikOn) ? ortaklikOn.toplam : null} onPress={() => { setHata(null); setPanel("kiskirt"); }} /> : null}
      {h ? <EylemSatiri icon="hood" baslik={t("onl.ug.casus")} rtl={rtl} kapali={!!on?.casus?.engel}
        alt={on?.casus?.engel ? hataYaz(on.casus.engel, t) : applyParams(t("onl.ug.casusAlt"), [hedefAd, CASUS_AYLIK_BEDEL], lang)}
        sans={on?.casus?.guven.toplam} onPress={() => { setHata(null); setPanel("casus"); }} /> : null}
      <EylemSatiri icon="scales" baslik={t("onl.ug.araciIste")} rtl={rtl} kapali={!kirgin || !dostlar.length} sans={null}
        alt={!kirgin ? hataYaz("kirgin_degil", t) : !dostlar.length ? hataYaz("dost_degil", t) : t("onl.ug.araciAlt")}
        onPress={() => { setHata(null); setPanel("araci"); }} />
      {casusBurada ? <Bant tur="bilgi" rtl={rtl} metin={applyParams(t("onl.ug.casusAktif"), [kisi.ad, casusBurada.izlenen.ad, kalanAy(casusBurada.bitis, ay)], lang)} /> : null}
    </View>

    {/* Sözler, talepler, barış */}
    {sozler.length || gelen.length || giden.length || baris || kapanan.length ? <>
      <Baslik2 metin={t("onl.ug.defter")} rtl={rtl} />
      <View style={{ gap: 8 }}>
        {sozler.map((s) => <Cerceve key={s.id} ic={{ padding: 12, gap: 8 }}>
          <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
            <GameIcon name="scroll" size={16} color={C.goldBright} />
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: C.parchment, textAlign: hiza(rtl) }}>{applyParams(t("onl.ug.soz"), [s.hedef.ad, kalanAy(s.bitis, ay)], lang)}</Text>
          </View>
          {p ? <Not rtl={rtl} metin={applyParams(t("onl.ug.katilNot"), [Math.round(p.katil.yakalanma.laf * 100), Math.round(p.katil.yakalanma.boykot * 100), p.katil.lafAlici, p.katil.boykotSure], lang)} /> : null}
          <View style={{ flexDirection: yon(rtl), gap: 8 }}>
            {(["laf", "boykot"] as Hamle[]).map((hm) => <View key={hm} style={{ flex: 1 }}>
              <CizgiDugme kucuk icon={hm === "laf" ? "speaker" : "crossed-swords"} etiket={t("onl.ug.hamle." + hm)} rtl={rtl} kapali={!s.katilabilir || !!bekleyen}
                onPress={() => { void yap({ tur: "katil", soz: s.id, hamle: hm }, s.id + hm); }} />
            </View>)}
          </View>
          {!s.katilabilir ? <Not rtl={rtl} metin={t("onl.ug.buAyKatildi")} /> : null}
          {bozOnay === s.id ? <Bant tur="bilgi" rtl={rtl} metin={t("onl.ug.bozUyari")} eylem={t("onl.ug.boz")} onEylem={() => { void yap({ tur: "sozBoz", soz: s.id }, s.id + "boz"); }} />
            : <Pressable accessibilityRole="button" accessibilityLabel={t("onl.ug.boz")} onPress={() => { hap("tap"); setBozOnay(s.id); }} style={{ minHeight: 44, justifyContent: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 12, color: C.goldDim, textDecorationLine: "underline", textAlign: hiza(rtl) }}>{t("onl.ug.boz")}</Text>
            </Pressable>}
        </Cerceve>)}
        {gelen.map((x) => <Cerceve key={x.id} aktif ic={{ padding: 12, gap: 8 }}>
          {satir(applyParams(t("onl.ug.gelen"), [x.taraf.ad, kisi.ad, bedelEtiketi(x.bedel)], lang))}
          {x.onizleme.sans ? <DokumListesi kalemler={x.onizleme.sans.kalemler} toplam={x.onizleme.sans.toplam} toplamEtiket={t("onl.ey.toplamSans")} rtl={rtl} t={t} lang={lang} /> : null}
          {x.onizleme.bantlar ? <Not rtl={rtl} renk={C.parchmentDim} metin={applyParams(t("onl.ug.bantlar"), [x.onizleme.bantlar.baris, x.onizleme.bantlar.sartli, x.onizleme.bantlar.ateskes], lang)} /> : null}
          {x.onizleme.engel ? <Bant tur="bilgi" rtl={rtl} metin={hataYaz(x.onizleme.engel, t)} /> : null}
          <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 8 }}>
            <View style={{ flexGrow: 2, flexBasis: 170 }}><AltinDugme etiket={`${t("onl.ug.arabuluculukYap")} · ${takat("arabulucu")}`} icon="scales" rtl={rtl}
              kapali={!!x.onizleme.engel && x.onizleme.engel !== "takat_yok"} bekliyor={bekleyen === x.id} onPress={() => { void yap({ tur: "arabulucu", talep: x.id }, x.id); }} /></View>
            <View style={{ flexGrow: 1, flexBasis: 110 }}><CizgiDugme kucuk etiket={t("onl.ug.reddet")} rtl={rtl} kapali={!!bekleyen} onPress={() => { void yap({ tur: "araciKapat", talep: x.id }, x.id + "k"); }} /></View>
          </View>
        </Cerceve>)}
        {giden.map((x) => <Cerceve key={x.id} ic={{ padding: 12, gap: 8 }}>
          {satir(applyParams(t("onl.ug.giden"), [x.arabulucu.ad, bedelEtiketi(x.bedel), kalanAy(x.sonAy, ay)], lang))}
          {x.emanet ? <Not rtl={rtl} metin={applyParams(t("onl.ug.emanet"), [x.emanet], lang)} /> : null}
          <CizgiDugme kucuk etiket={t("onl.ug.geriCek")} rtl={rtl} kapali={!!bekleyen} onPress={() => { void yap({ tur: "araciKapat", talep: x.id }, x.id); }} />
        </Cerceve>)}
        {baris ? <Cerceve ic={{ padding: 12, gap: 8 }}>
          {baris.deger ? satir(applyParams(t("onl.ug.baris"), [isaretli(baris.deger), baris.arabulucu.ad], lang)) : null}
          {baris.sartli ? <>
            {satir(applyParams(t("onl.ug.sartli"), [baris.sartli.tutar, isaretli(baris.sartli.deger), kalanAy(baris.sartli.sonAy, ay)], lang))}
            <AltinDugme etiket={applyParams(t("onl.ug.sartOde"), [baris.sartli.tutar], lang)} icon="coins" rtl={rtl} bekliyor={bekleyen === "sart"} onPress={() => { void yap({ tur: "sartOde", npc: kisi.id }, "sart"); }} />
          </> : null}
          {baris.ateskesBitis !== undefined ? <Not rtl={rtl} renk={C.parchmentDim} metin={applyParams(t("onl.ug.ateskes"), [kalanAy(baris.ateskesBitis, ay)], lang)} /> : null}
        </Cerceve> : null}
        {kapanan.map((x) => <Not key={x.id} rtl={rtl} metin={applyParams(t("onl.ug.kapandi"), [x.taraf.ad, x.arabulucu.ad, t("onl.ug.talepSonuc." + (x.sonuc ?? x.durum))], lang)} />)}
        {hata && !panel ? <Bant metin={hataYaz(hata, t)} rtl={rtl} /> : null}
      </View>
    </> : null}

    {/* Paneller */}
    <AltPanel acik={panel === "kiskirt"} onKapat={() => setPanel(null)} etiket={t("onl.ug.kiskirt")} rtl={rtl} t={t}>
      {panel === "kiskirt" && h ? <>
        <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 19, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.ug.kiskirt")}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.ug.kiskirtAc"), [kisi.ad, hedefAd], lang)}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 1.2, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.ug.teklifSec")}</Text>
        <Secim secenekler={KISKIRT_TEKLIFLERI} secili={teklif} etiket={(v) => t("onl.ug.teklif." + v)} onSec={setTeklif} rtl={rtl} />
        {teklif === "para" ? <Sayac deger={miktar} alt={1} ust={p?.kiskirt.teklif.paraTavani ?? 15} onDegis={setMiktar} etiket={t("onl.ug.miktar")} rtl={rtl} t={t} /> : null}
        <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 1.2, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.ey.neden")}</Text>
        {teklifOn ? (bilinenMi(teklifOn)
          ? <DokumListesi kalemler={teklifOn.bilinen} toplam={null} gizli={applyParams(t("onl.ug.gizliKalem"), [hedefAd], lang)} toplamEtiket={t("onl.ey.toplamSans")} rtl={rtl} t={t} lang={lang} />
          : <DokumListesi kalemler={teklifOn.kalemler} toplam={teklifOn.toplam} toplamEtiket={t("onl.ey.toplamSans")} rtl={rtl} t={t} lang={lang} />)
          : <Not rtl={rtl} metin={t("onl.ug.onizlemeYok")} />}
        {teklifOn && bilinenMi(teklifOn) ? <Not rtl={rtl} renk={C.parchmentDim} metin={t("onl.ug.gizliNot") + (kaba ? " " + kaba : "")} /> : null}
        {teklif === "para" ? <Not rtl={rtl} metin={applyParams(t("onl.ug.paraNot"), [p?.kiskirt.teklif.paraTavani ?? 15], lang)} /> : null}
        <Not rtl={rtl} metin={applyParams(t("onl.ug.riskNot"), [Math.round((p?.kiskirt.farkOrani ?? 0.6) * 100), p?.kiskirt.sozSure ?? 6], lang)} />
        {ks?.engel ? <Bant tur="bilgi" rtl={rtl} metin={hataYaz(ks.engel, t)} /> : null}
        {panelHata}
        <AltinDugme etiket={`${t("onl.ug.kiskirtDene")} · ${takat("kiskirt")}`} icon="speaker" rtl={rtl} kapali={!!ks?.engel} bekliyor={bekleyen === "kiskirt"}
          onPress={() => { void yap({ tur: "kiskirt", npc: kisi.id, hedef: h, teklif: teklif === "para" ? { t: "para", miktar } : { t: teklif } }, "kiskirt"); }} />
      </> : null}
    </AltPanel>

    <AltPanel acik={panel === "casus"} onKapat={() => setPanel(null)} etiket={t("onl.ug.casus")} rtl={rtl} t={t}>
      {panel === "casus" && h ? <>
        <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 19, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.ug.casus")}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.ug.casusAc"), [kisi.ad, hedefAd], lang)}</Text>
        <Secim secenekler={Array.from({ length: CASUS_SURE_EN_COK }, (_, i) => i + 1)} secili={sure} onSec={setSure} rtl={rtl}
          etiket={(v) => applyParams(t("onl.ug.casusSureSec"), [v, v * CASUS_AYLIK_BEDEL], lang)} />
        {on?.casus ? <DokumListesi kalemler={on.casus.guven.kalemler} toplam={on.casus.guven.toplam} toplamEtiket={t("onl.ug.guvenToplam")} rtl={rtl} t={t} lang={lang} /> : <Not rtl={rtl} metin={t("onl.ug.onizlemeYok")} />}
        <Not rtl={rtl} metin={t("onl.ug.casusNot")} />
        {on?.casus?.engel ? <Bant tur="bilgi" rtl={rtl} metin={hataYaz(on.casus.engel, t)} /> : null}
        {panelHata}
        <AltinDugme etiket={`${applyParams(t("onl.ug.casusTut"), [sure * CASUS_AYLIK_BEDEL], lang)} · ${takat("casus")}`} icon="hood" rtl={rtl} kapali={!!on?.casus?.engel} bekliyor={bekleyen === "casus"}
          onPress={() => { void yap({ tur: "casus", npc: kisi.id, izlenen: h, ay: sure }, "casus"); }} />
      </> : null}
    </AltPanel>

    <AltPanel acik={panel === "araci"} onKapat={() => setPanel(null)} etiket={t("onl.ug.araciIste")} rtl={rtl} t={t}>
      {panel === "araci" ? <>
        <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 19, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.ug.araciIste")}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.ug.araciAc"), [kisi.ad], lang)}</Text>
        {!kirgin ? <Bant tur="bilgi" rtl={rtl} metin={hataYaz("kirgin_degil", t)} /> : null}
        {dostlar.length ? <>
          <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 1.2, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.ug.arabulucuSec")}</Text>
          <Secim secenekler={dostlar.map((x) => x.id)} secili={ar ?? ""} etiket={(id) => dostlar.find((x) => x.id === id)?.ad ?? id} onSec={setArabulucu} rtl={rtl} />
        </> : <Bant tur="bilgi" rtl={rtl} metin={hataYaz("dost_degil", t)} />}
        <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 1.2, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.ug.bedelSec")}</Text>
        <Secim secenekler={ARACI_BEDELLERI} secili={bedel} etiket={bedelEtiketi} onSec={setBedel} rtl={rtl} />
        {bedel === "tazminat" ? <Sayac deger={tazminat} alt={1} ust={TAZMINAT_TAVANI} onDegis={setTazminat} etiket={t("onl.ug.miktar")} rtl={rtl} t={t} /> : null}
        <Not rtl={rtl} metin={t("onl.ug.araciNot")} />
        {panelHata}
        <AltinDugme etiket={t("onl.ug.araciGonder")} icon="scales" rtl={rtl} kapali={!kirgin || !ar} bekliyor={bekleyen === "araci"}
          onPress={() => { if (ar) void yap({ tur: "araciIste", arabulucu: ar, npc: kisi.id, bedel: bedel === "tazminat" ? { t: "tazminat", miktar: tazminat } : { t: bedel } }, "araci"); }} />
      </> : null}
    </AltPanel>

    <AltPanel acik={!!sonuc} onKapat={() => setSonuc(null)} etiket={t("onl.ey.sonuc")} rtl={rtl} t={t}>
      {sonuc ? <UcgenSonucu y={sonuc} ay={ay} rtl={rtl} t={t} lang={lang} onTamam={() => setSonuc(null)} /> : null}
    </AltPanel>
  </>;
}

