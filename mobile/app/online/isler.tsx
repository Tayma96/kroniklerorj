// Çevrimiçi temel işler ve ambar (ana tasarım §5.4–5.5): iş listesi sunucunun ben.temelIsler önizlemesinden çizilir
// (temel işler ve onarım, yamaklık, usta işleri; her biri 1 takat). Verim ve açıklık sunucudandır; iş yapıldıktan sonra
// sunucunun döndürdüğü çıktı ve fırsat dökümü (bu_is, meslekte) görünür.
// Ambar (envanter) ve NPC'den pahalı, aylık kotalı alım (POST /v1/taban-al); ambardan NPC'ye satış (POST /v1/sat):
// birim fiyat dökümü (taban, kıtlık) ve aylık kota satıştan sonra sunucudan gelir.
import { KaliteIzi } from "../../lib/online/ekonomi-ui";
import { useState } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { hap } from "../../lib/haptics";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { AltinDugme, Bant, Cerceve, CizgiDugme, GeriDugme, Madalyon, ONL, geriGit, giris, hiza, yon } from "../../lib/online/ui";
import { AltPanel, Baslik2, BosKart, Degisim, Hap, OnlineSayfa, Rozet, SayfaBasi, TakatHapi, YerlesimBekle, sahneGorseli, useBirKez, useYerlesimEkrani } from "../../lib/online/yasam-ui";
import { hataAnahtari } from "../../lib/online/hata";
import { isaretli, kalemYaz } from "../../lib/online/metin";
import {
  IS_IKON, ISLER, MALLAR, MAL_IKON, NPC_AYLIK_KOTA, NPC_MALLARI, npcSatisKotasi, TEMEL_ISLER, TEMEL_IS_YASI, TEMEL_TAKAT, kitlikPrimi, npcEtiketFiyati, satilirMi,
} from "../../lib/online/meslek-veri";
import { MAL_IDLERI, temelIsSatiriMi, type Dokum, type IsId, type MalId, type OnlineHata, type SatYaniti, type TabanAlYaniti, type TemelIsSatiri, type TemelIsYaniti } from "../../lib/online/protokol";
import type { Lang } from "../../lib/locale-data";

type Ceviri = (k: string) => string;

/** Sunucu dökümü: kalem kalem akçe, en altta toplam. */
function AkceDokumu({ dokum, baslik, rtl, t, lang }: { dokum: Dokum; baslik: string; rtl: boolean; t: Ceviri; lang: Lang }) {
  return <View style={{ borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,162,78,0.28)", backgroundColor: "rgba(0,0,0,0.25)", paddingHorizontal: 12, paddingVertical: 6 }}>
    {dokum.kalemler.map((k, i) => <View key={k.k + i} accessible accessibilityLabel={`${kalemYaz(k, t, lang)}: ${isaretli(k.d)}`}
      style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderColor: "rgba(201,162,78,0.12)" }}>
      <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{kalemYaz(k, t, lang)}</Text>
      <Text style={{ minWidth: 52, fontFamily: F.display, fontSize: 14, color: k.d > 0 ? C.sage : k.d < 0 ? C.ember : C.parchmentMuted, textAlign: rtl ? "left" : "right" }}>{applyParams(t("onl.is.akce"), [isaretli(k.d)])}</Text>
    </View>)}
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingTop: 9, paddingBottom: 4 }}>
      <Text style={{ flex: 1, fontFamily: F.display, fontSize: 12.5, letterSpacing: rtl ? 0 : 1.2, color: C.goldBright, textAlign: hiza(rtl) }}>{baslik}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 16, color: dokum.toplam >= 0 ? C.goldBright : C.ember }}>{applyParams(t("onl.is.akce"), [isaretli(dokum.toplam)])}</Text>
    </View>
  </View>;
}

/** Liste satırı: sunucu önizlemesi varsa ondan, yoksa (eski sunucu) yerel tablodan. */
type IsSatiri = { is: IsId; meslek: string; mal: MalId | null; usta: boolean; yamak: boolean; acik: boolean; dugum: string | null; seviye: number | null; adet: number | null; sonraki: number | null };
const satirdan = (s: TemelIsSatiri): IsSatiri => ({ is: s.is, meslek: s.meslek, mal: s.mal, usta: s.usta, yamak: s.yamak, acik: s.acik, dugum: s.dugum, seviye: s.seviye, adet: s.adet, sonraki: s.sonraki });
const tablodan = (is: IsId): IsSatiri => {
  const x = TEMEL_ISLER[is];
  return { is, meslek: x.meslek, mal: x.mal, usta: !!x.usta, yamak: !!x.yamak, acik: !x.usta, dugum: null, seviye: null, adet: null, sonraki: null };
};
const GRUPLAR = [["temel", "onl.is.temel"], ["yamak", "onl.is.grupYamak"], ["usta", "onl.is.grupUsta"]] as const;
const grubu = (s: IsSatiri) => (s.usta ? "usta" : s.yamak ? "yamak" : "temel");

/** İş hatası: verim_yok, takat_yok, yas_kapisi anlaşılır cümleyle; gerisi genel hata metniyle. */
function isHatasi(h: OnlineHata, t: Ceviri): string {
  if (h === "verim_yok") return t("onl.is.h.verim");
  if (h === "takat_yok") return t("onl.is.h.takat");
  if (h === "yas_kapisi") return applyParams(t("onl.is.h.yas"), [TEMEL_IS_YASI]);
  if (h === "kota_doldu") return applyParams(t("onl.is.h.kota"), [NPC_AYLIK_KOTA]);
  if (h === "para_yok") return t("onl.is.h.para");
  if (h === "dugum_kapali") return t("onl.is.h.kilitli");
  return t(hataAnahtari(h));
}
/** Satış hatası: kota satış kotasıyla, mal_yok ambarla anlatılır. */
function satHatasi(h: OnlineHata, t: Ceviri, tavan: number): string {
  if (h === "kota_doldu") return applyParams(t("onl.sat.h.kota"), [tavan]);
  if (h === "mal_yok") return t("onl.h.malYok");
  return t(hataAnahtari(h));
}

type Sonuc = { tur: "is"; y: TemelIsYaniti } | { tur: "al"; y: TabanAlYaniti; mal: MalId } | { tur: "sat"; y: SatYaniti } | null;

function IslerEkran() {
  const router = useRouter();
  const { t, rtl, lang } = useI18n();
  const dar = useWindowDimensions().width < 360;
  const o = useYerlesimEkrani();
  const y = o.yerlesim;
  const digerMeslekSayisi = (meslek: string) => Math.max(0, (o.lonca?.find((x) => x.meslek === meslek)?.oyuncu ?? 0) - (y?.ben.meslek?.a === meslek ? 1 : 0));
  const satisTavan = (m: MalId) => npcSatisKotasi(m, digerMeslekSayisi(MALLAR[m].meslek));
  const [sonuc, setSonuc] = useState<Sonuc>(null);
  const [isHata, setIsHata] = useState<{ is: IsId; metin: string } | null>(null);
  const [alim, setAlim] = useState<{ mal: MalId; adet: number } | null>(null);
  const [alimHata, setAlimHata] = useState<string | null>(null);
  const [satim, setSatim] = useState<{ mal: MalId; adet: number } | null>(null);
  const [satimHata, setSatimHata] = useState<string | null>(null);
  // Kıtlık primini göstermek için lonca durumu (boş meslek = prim); fiyatın kendisini satıştan sonra sunucu verir.
  useBirKez(() => { void o.loncaYukle(true); }, !!y);
  if (!y) return <YerlesimBekle rtl={rtl} t={t} onGiris={() => router.replace("/online")} />;

  const ben = y.ben;
  const genc = ben.yas < TEMEL_IS_YASI;
  const ev = o.envanter ?? ben.envanter ?? null;
  const ambar = MAL_IDLERI.filter((m) => (ev?.[m] ?? 0) > 0);
  const anaMeslek = o.meslekDurumu?.kayit.a || "";
  const onizleme = Array.isArray(ben.temelIsler) ? ben.temelIsler.filter(temelIsSatiriMi).map(satirdan) : [];
  const isSatirlari: IsSatiri[] = onizleme.length ? onizleme : ISLER.map(tablodan);

  const isYap = async (is: IsId) => {
    setIsHata(null);
    const s = await o.temelIsYap(is);
    if (s.ok) { hap("success"); setSonuc({ tur: "is", y: s.deger }); } else { hap("error"); setIsHata({ is, metin: isHatasi(s.hata, t) }); }
  };
  const al = async () => {
    if (!alim) return;
    setAlimHata(null);
    const s = await o.tabanAl(alim.mal, alim.adet);
    if (s.ok) { hap("success"); const mal = alim.mal; setAlim(null); setSonuc({ tur: "al", y: s.deger, mal }); } else { hap("error"); setAlimHata(isHatasi(s.hata, t)); }
  };
  const sat = async () => {
    if (!satim) return;
    setSatimHata(null);
    const s = await o.sat(satim.mal, satim.adet);
    if (s.ok) { hap("success"); setSatim(null); setSonuc({ tur: "sat", y: s.deger }); } else { hap("error"); setSatimHata(satHatasi(s.hata, t, satisTavan(satim.mal))); }
  };
  const kitlikVar = (m: MalId) => o.lonca?.find((x) => x.meslek === MALLAR[m].meslek)?.oyuncu === 0;
  const satisKalan = (m: MalId) => o.satisKotasi(m)?.kalan ?? satisTavan(m);
  const satimEnCok = satim ? Math.max(0, Math.min(ev?.[satim.mal] ?? 0, satisKalan(satim.mal))) : 0;

  const paneller = <>
    <AltPanel acik={!!sonuc} onKapat={() => setSonuc(null)} etiket={t("onl.is.sonuc")} rtl={rtl} t={t}>
      {sonuc?.tur === "is" ? <>
        <View style={{ alignItems: "center", gap: 8, paddingTop: 6 }}>
          <Madalyon icon={sonuc.y.mal ? MAL_IKON[sonuc.y.mal] ?? IS_IKON[sonuc.y.is] : IS_IKON[sonuc.y.is] ?? "anvil"} size={64} aktif />
          <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 21, color: C.parchment, textAlign: "center" }}>{t("onl.is." + sonuc.y.is)}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 18, color: C.goldBright, textAlign: "center" }}>
            {sonuc.y.onarim ? applyParams(t("onl.is.onarildi"), [sonuc.y.adet, t("onl.mal." + sonuc.y.onarim.mal)])
              : sonuc.y.mal ? applyParams(t("onl.is.cikti"), [sonuc.y.adet, t("onl.mal." + sonuc.y.mal)]) : t("onl.is.yamakCikti")}
          </Text>
          {sonuc.y.usta ? <Rozet icon="star" metin={t("onl.is.ustaIs")} renk={C.goldBright} dolu /> : null}
        </View>
        <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
          <Degisim icon="flame" metin={applyParams(t("onl.is.takatHarcandi"), [TEMEL_TAKAT])} olumlu={false} />
          {sonuc.y.hizmet > 0 ? <Degisim icon="star" metin={applyParams(t("onl.is.hizmet"), [sonuc.y.hizmet])} olumlu /> : null}
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 1.2, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.is.firsat")}</Text>
        <AkceDokumu dokum={sonuc.y.firsat} baslik={t("onl.is.firsatToplam")} rtl={rtl} t={t} lang={lang as Lang} />
        <Text style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl) }}>
          {t(sonuc.y.firsat.kalemler.some((k) => k.k === "meslekte") ? "onl.is.firsatNot" : sonuc.y.hizmet > 0 ? "onl.is.firsatNotKendi" : "onl.is.firsatNotYok")}
        </Text>
        <AltinDugme etiket={t("onl.is.tamam")} rtl={rtl} onPress={() => setSonuc(null)} />
      </> : sonuc?.tur === "al" ? <>
        <View style={{ alignItems: "center", gap: 8, paddingTop: 6 }}>
          <Madalyon icon={MAL_IKON[sonuc.mal]} size={64} aktif />
          <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 20, color: C.parchment, textAlign: "center" }}>{applyParams(t("onl.is.alindi"), [sonuc.y.adet, t("onl.mal." + sonuc.mal)])}</Text>
        </View>
        <AkceDokumu dokum={sonuc.y.fiyat} baslik={t("onl.is.birimFiyat")} rtl={rtl} t={t} lang={lang as Lang} />
        <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
          <Degisim icon="coins" metin={applyParams(t("onl.is.odendi"), [sonuc.y.fiyat.toplam * sonuc.y.adet])} olumlu={false} />
          <Degisim icon="coins" metin={applyParams(t("onl.is.kalanPara"), [sonuc.y.para])} olumlu />
        </View>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.is.npcNot")}</Text>
        <AltinDugme etiket={t("onl.is.tamam")} rtl={rtl} onPress={() => setSonuc(null)} />
      </> : sonuc?.tur === "sat" ? <>
        <View style={{ alignItems: "center", gap: 8, paddingTop: 6 }}>
          <Madalyon icon={MAL_IKON[sonuc.y.mal]} size={64} aktif />
          <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={{ fontFamily: F.display, fontSize: 20, color: C.parchment, textAlign: "center" }}>{applyParams(t("onl.sat.satildi"), [sonuc.y.adet, t("onl.mal." + sonuc.y.mal)])}</Text>
        </View>
        <AkceDokumu dokum={sonuc.y.birim} baslik={t("onl.is.birimFiyat")} rtl={rtl} t={t} lang={lang as Lang} />
        <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
          <Degisim icon="coins" metin={applyParams(t("onl.sat.kazanc"), [sonuc.y.tutar])} olumlu />
          <Degisim icon="coins" metin={applyParams(t("onl.is.kalanPara"), [sonuc.y.para])} olumlu />
        </View>
        <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: "center" }}>
          {applyParams(t("onl.sat.kotaSonuc"), [sonuc.y.kota.satilan, sonuc.y.kota.tavan, sonuc.y.kota.kalan])}
        </Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.sat.not")}</Text>
        <AltinDugme etiket={t("onl.is.tamam")} rtl={rtl} onPress={() => setSonuc(null)} />
      </> : null}
    </AltPanel>
    <AltPanel acik={!!satim} onKapat={() => { setSatim(null); setSatimHata(null); }} etiket={t("onl.sat.baslik")} rtl={rtl} t={t}>
      {satim ? <>
        <View style={{ alignItems: "center", gap: 8, paddingTop: 6 }}>
          <Madalyon icon={MAL_IKON[satim.mal]} size={60} />
          <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 20, color: C.parchment, textAlign: "center" }}>{t("onl.mal." + satim.mal)}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: C.parchmentDim, textAlign: "center" }}>{applyParams(t("onl.sat.elde"), [ev?.[satim.mal] ?? 0])}</Text>
        </View>
        <View style={{ borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,162,78,0.28)", backgroundColor: "rgba(0,0,0,0.25)", paddingHorizontal: 12, paddingVertical: 8, gap: 6 }}>
          <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.taban")}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 14, color: C.parchment }}>{applyParams(t("onl.is.akce"), [MALLAR[satim.mal].taban])}</Text>
          </View>
          {kitlikVar(satim.mal) ? <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.kitlik")}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 14, color: C.sage }}>{applyParams(t("onl.is.akce"), [isaretli(kitlikPrimi(satim.mal))])}</Text>
          </View> : null}
          <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>
            {kitlikVar(satim.mal) ? applyParams(t("onl.sat.kitlikNot"), [t("onl.mes." + MALLAR[satim.mal].meslek)]) : t("onl.sat.fiyatNot")}
          </Text>
        </View>
        {satimEnCok > 0 ? <View accessibilityLabel={t("onl.is.adet")} style={{ flexDirection: yon(rtl), flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
          {Array.from({ length: satimEnCok }, (_, i) => i + 1).map((n) => {
            const secili = satim.adet === n;
            return <Pressable key={n} accessibilityRole="radio" accessibilityState={{ selected: secili }} accessibilityLabel={applyParams(t("onl.is.adetN"), [n])}
              onPress={() => { hap("tap"); setSatimHata(null); setSatim({ ...satim, adet: n }); }}
              style={{ width: 48, height: 48, borderRadius: 10, borderWidth: 1.5, borderColor: secili ? C.goldBright : ONL.frame, backgroundColor: secili ? "rgba(90,64,24,0.85)" : "rgba(14,10,6,0.7)", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 18, color: secili ? C.goldBright : C.parchment }}>{n}</Text>
            </Pressable>;
          })}
        </View> : null}
        <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: "center" }}>
          {o.satisKotasi(satim.mal) ? applyParams(t("onl.sat.kalan"), [satisKalan(satim.mal), satisTavan(satim.mal)]) : applyParams(t("onl.sat.kotaNot"), [npcSatisKotasi(satim.mal)])}
        </Text>
        {satimHata ? <Bant metin={satimHata} rtl={rtl} /> : satisKalan(satim.mal) <= 0 ? <Bant tur="bilgi" metin={applyParams(t("onl.sat.h.kota"), [npcSatisKotasi(satim.mal)])} rtl={rtl} /> : null}
        <AltinDugme etiket={applyParams(t("onl.sat.dugme"), [Math.min(satim.adet, Math.max(1, satimEnCok))])} icon="coins" rtl={rtl} kapali={satimEnCok <= 0} bekliyor={o.islem === "sat"} onPress={() => { void sat(); }} />
      </> : null}
    </AltPanel>
    <AltPanel acik={!!alim} onKapat={() => { setAlim(null); setAlimHata(null); }} etiket={t("onl.is.npcdenAl")} rtl={rtl} t={t}>
      {alim ? <>
        <View style={{ alignItems: "center", gap: 8, paddingTop: 6 }}>
          <Madalyon icon={MAL_IKON[alim.mal]} size={60} />
          <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 20, color: C.parchment, textAlign: "center" }}>{t("onl.mal." + alim.mal)}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: C.parchmentDim, textAlign: "center" }}>{applyParams(t("onl.is.etiket"), [npcEtiketFiyati(alim.mal)])}</Text>
        </View>
        <View accessibilityLabel={t("onl.is.adet")} style={{ flexDirection: yon(rtl), justifyContent: "center", gap: 10 }}>
          {Array.from({ length: NPC_AYLIK_KOTA }, (_, i) => i + 1).map((n) => {
            const secili = alim.adet === n;
            return <Pressable key={n} accessibilityRole="radio" accessibilityState={{ selected: secili }} accessibilityLabel={applyParams(t("onl.is.adetN"), [n])}
              onPress={() => { hap("tap"); setAlimHata(null); setAlim({ ...alim, adet: n }); }}
              style={{ width: 56, height: 52, borderRadius: 10, borderWidth: 1.5, borderColor: secili ? C.goldBright : ONL.frame, backgroundColor: secili ? "rgba(90,64,24,0.85)" : "rgba(14,10,6,0.7)", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 19, color: secili ? C.goldBright : C.parchment }}>{n}</Text>
            </Pressable>;
          })}
        </View>
        <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: "center" }}>{applyParams(t("onl.is.kotaNot"), [NPC_AYLIK_KOTA])}</Text>
        {alimHata ? <Bant metin={alimHata} rtl={rtl} /> : null}
        <AltinDugme etiket={applyParams(t("onl.is.alDugme"), [alim.adet, npcEtiketFiyati(alim.mal) * alim.adet])} icon="coins" rtl={rtl} bekliyor={o.islem === "tabanAl"} onPress={() => { void al(); }} />
      </> : null}
    </AltPanel>
  </>;

  return <OnlineSayfa gorsel={sahneGorseli(y.yerlesim.tur, y.saat.mevsim)} oran={0.3} rtl={rtl} t={t} alt={paneller}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 6 }}>
      <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/isim")} />
      <View style={{ flex: 1 }} />
      <Hap icon="coins" metin={String(ben.para)} erisim={applyParams(t("onl.ya.paraErisim"), [ben.para])} />
      <TakatHapi kalan={ben.takat.kalan} tavan={ben.takat.tavan} t={t} />
    </View>
    <View style={{ marginTop: 8 }}>
      <SayfaBasi ust={t("onl.is.ust")} baslik={t("onl.is.baslik")} alt={t("onl.is.alt")} rtl={rtl} />
    </View>
    {genc ? <View style={{ marginTop: 12 }}><Bant tur="bilgi" metin={applyParams(t("onl.is.h.yas"), [TEMEL_IS_YASI])} rtl={rtl} /></View> : null}

    {/* Temel işler: temel + onarım, yamaklık, usta işleri (sunucu önizlemesi) */}
    {GRUPLAR.map(([grup, baslik]) => {
      const satirlar = isSatirlari.filter((x) => grubu(x) === grup);
      if (!satirlar.length) return null;
      return <View key={grup}>
        <Baslik2 metin={t(baslik)} rtl={rtl} />
        <View style={{ gap: 10 }}>
          {satirlar.map((x, n) => {
            const kendi = anaMeslek === x.meslek;
            const kapali = genc || !x.acik;
            const hataBu = isHata?.is === x.is ? isHata.metin : null;
            const ikon = IS_IKON[x.is] ?? "anvil";
            const alt = x.mal ? applyParams(t("onl.is.verir"), [t("onl.mal." + x.mal)]) : x.is === "onarim" ? t("onl.is.onarimAlt") : t("onl.is.yamakAlt");
            const verim = x.acik && x.adet !== null && x.mal ? applyParams(t("onl.is.verim"), [x.adet, x.sonraki ?? 0]) : null;
            const kilit = !x.acik && x.dugum ? applyParams(t("onl.is.kilit"), [t("onl.ba." + x.dugum), x.seviye ?? 1]) : !x.acik ? t("onl.is.h.kilitli") : null;
            return <Animated.View key={x.is} entering={giris(n * 40)}>
              <Cerceve ic={{ padding: 12, gap: 10 }}>
                <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
                  <Madalyon icon={ikon} size={44} aktif={x.acik && !genc} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: 15.5, color: x.acik ? C.parchment : C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.is." + x.is)}</Text>
                    <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>{alt}</Text>
                    {verim ? <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{verim}</Text> : null}
                  </View>
                  <View style={{ width: dar ? 84 : 96 }}>
                    <Pressable accessibilityLabel={`${t("onl.is." + x.is)}. ${applyParams(t("onl.is.takatBedel"), [TEMEL_TAKAT])}${kilit ? ". " + kilit : ""}`} accessibilityState={{ disabled: kapali, busy: o.islem === "temelIs" }}
                      disabled={kapali || o.islem === "temelIs"} onPress={() => { hap("tap"); void isYap(x.is); }}
                      style={({ pressed }) => ({ minHeight: 48, borderRadius: 8, borderWidth: 1.5, borderColor: kapali ? "rgba(168,130,63,0.4)" : C.goldBright, backgroundColor: pressed ? "rgba(201,162,78,0.3)" : "rgba(201,162,78,0.14)", alignItems: "center", justifyContent: "center", paddingHorizontal: 6, opacity: kapali ? 0.55 : 1 })}>
                      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: 13.5, color: C.goldBright }}>{t("onl.is.yap")}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <GameIcon name="flame" size={11} color={C.emberSoft} />
                        <Text style={{ fontFamily: F.display, fontSize: 11, color: C.parchmentDim }}>{TEMEL_TAKAT}</Text>
                      </View>
                    </Pressable>
                  </View>
                </View>
                <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
                  <Rozet icon={ikon} metin={applyParams(t("onl.is.kimin"), [t("onl.mes." + x.meslek)])} renk={kendi ? C.sage : C.gold} dolu={kendi} />
                  {x.usta ? <Rozet icon="star" metin={t("onl.is.ustaIs")} renk={C.goldBright} /> : null}
                  {x.yamak ? <Rozet icon="walk" metin={t("onl.is.yamak")} /> : null}
                </View>
                {hataBu ? <Bant metin={hataBu} rtl={rtl} /> : kilit ? <Bant tur="bilgi" metin={kilit} rtl={rtl} /> : null}
              </Cerceve>
            </Animated.View>;
          })}
        </View>
      </View>;
    })}
    <Text style={{ marginTop: 8, fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.is.azalanNot")}</Text>

    {/* Ambar */}
    <Baslik2 metin={t("onl.is.ambar")} rtl={rtl} sag={<Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>{ambar.reduce((a, m) => a + (ev?.[m] ?? 0), 0)}</Text>} />
    {ev === null ? <BosKart icon="backpack" metin={t("onl.is.ambarBilinmiyor")} rtl={rtl} />
      : ambar.length ? <>
        <Text style={{ marginBottom: 10, fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.sat.alt")}</Text>
        <Cerceve ic={{ paddingHorizontal: 12, paddingVertical: 4 }}>
        {ambar.map((m, i) => <View key={m}
          style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, minHeight: 52, paddingVertical: 4, borderTopWidth: i ? 1 : 0, borderColor: "rgba(201,162,78,0.12)" }}>
          <View accessibilityLabel={`${t("onl.mal." + m)}: ${ev?.[m] ?? 0}`} style={{ flex: 1, flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
            <GameIcon name={MAL_IKON[m]} size={18} color={C.gold} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 15.5, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.mal." + m)}</Text>
              {satilirMi(m) && kitlikVar(m) ? <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 12.5, color: C.sage, textAlign: hiza(rtl) }}>{t("onl.kitlik")}</Text> : null}
              <KaliteIzi mal={m} />
            </View>
            <Text style={{ fontFamily: F.display, fontSize: 15, color: C.goldBright }}>{`× ${ev?.[m] ?? 0}`}</Text>
          </View>
          {satilirMi(m) ? <Pressable accessibilityLabel={`${t("onl.sat.sat")}: ${t("onl.mal." + m)}`} onPress={() => { hap("tap"); setSatimHata(null); setSatim({ mal: m, adet: 1 }); }}
            style={({ pressed }) => ({ minWidth: 64, minHeight: 44, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1.5, borderColor: C.gold, backgroundColor: pressed ? "rgba(201,162,78,0.3)" : "rgba(201,162,78,0.12)", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5 })}>
            <GameIcon name="coins" size={13} color={C.goldBright} />
            <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 13, color: C.goldBright }}>{t("onl.sat.sat")}</Text>
          </Pressable> : <View style={{ minWidth: 64, alignItems: "center" }}><Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchmentMuted }}>{t("onl.sat.satilmaz")}</Text></View>}
        </View>)}
        </Cerceve>
      </> : <BosKart icon="backpack" metin={t("onl.is.ambarBos")} rtl={rtl} />}

    {/* NPC'den al */}
    <Baslik2 metin={t("onl.is.npcdenAl")} rtl={rtl} />
    <Text style={{ marginBottom: 10, fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.is.npcAlt"), [NPC_AYLIK_KOTA])}</Text>
    <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", justifyContent: "space-between", rowGap: 8 }}>
      {NPC_MALLARI.map((m) => <Pressable key={m} accessibilityLabel={`${t("onl.mal." + m)}. ${applyParams(t("onl.is.etiket"), [npcEtiketFiyati(m)])}. ${t("onl.mes." + MALLAR[m].meslek)}`}
        onPress={() => { hap("tap"); setAlimHata(null); setAlim({ mal: m, adet: 1 }); }} style={({ pressed }) => ({ width: "49%", transform: [{ scale: pressed ? 0.97 : 1 }] })}>
        <View style={{ minHeight: 56, flexDirection: yon(rtl), alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "rgba(201,162,78,0.35)", backgroundColor: ONL.cam }}>
          <GameIcon name={MAL_IKON[m]} size={18} color={C.gold} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: dar ? 12 : 13, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.mal." + m)}</Text>
            <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.is.akceKisa"), [npcEtiketFiyati(m)])}</Text>
          </View>
        </View>
      </Pressable>)}
    </View>
    <View style={{ marginTop: 22, gap: 8 }}>
      <CizgiDugme etiket={t("onl.sp.baslik")} icon="scroll-open" rtl={rtl} kucuk onPress={() => router.push("/online/siparisler")} />
      <CizgiDugme etiket={t("onl.ms.ust")} icon="anvil" rtl={rtl} kucuk onPress={() => router.push("/online/meslek")} />
    </View>
  </OnlineSayfa>;
}

export default function OnlineIsler() {
  return onlineEkranAcik() ? <OnlineKapisi><IslerEkran /></OnlineKapisi> : <OnlineYakinda />;
}
