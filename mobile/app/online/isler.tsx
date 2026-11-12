// Çevrimiçi temel işler ve ambar (ana tasarım §5.4–5.5): beş temel iş herkese açıktır (1 takat). İstemci önceden
// tahmin göstermez; iş yapıldıktan sonra sunucunun döndürdüğü çıktı ve fırsat dökümü (bu_is, meslekte) görünür.
// Ambar (envanter) ve NPC'den pahalı, aylık kotalı alım (POST /v1/taban-al); ambardan NPC'ye satış (POST /v1/sat):
// birim fiyat dökümü (taban, kıtlık) ve aylık kota satıştan sonra sunucudan gelir.
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
  IS_IKON, ISLER, MALLAR, MAL_IKON, NPC_AYLIK_KOTA, NPC_MALLARI, NPC_SATIS_KOTASI, npcSatisKotasi, TEMEL_ISLER, TEMEL_IS_YASI, TEMEL_TAKAT, kitlikPrimi, npcEtiketFiyati, satilirMi,
} from "../../lib/online/meslek-veri";
import { MAL_IDLERI, type Dokum, type IsId, type MalId, type OnlineHata, type SatYaniti, type TabanAlYaniti, type TemelIsYaniti } from "../../lib/online/protokol";
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

/** İş hatası: verim_yok, takat_yok, yas_kapisi anlaşılır cümleyle; gerisi genel hata metniyle. */
function isHatasi(h: OnlineHata, t: Ceviri): string {
  if (h === "verim_yok") return t("onl.is.h.verim");
  if (h === "takat_yok") return t("onl.is.h.takat");
  if (h === "yas_kapisi") return applyParams(t("onl.is.h.yas"), [TEMEL_IS_YASI]);
  if (h === "kota_doldu") return applyParams(t("onl.is.h.kota"), [NPC_AYLIK_KOTA]);
  if (h === "para_yok") return t("onl.is.h.para");
  return t(hataAnahtari(h));
}
/** Satış hatası: kota satış kotasıyla, mal_yok ambarla anlatılır. */
function satHatasi(h: OnlineHata, t: Ceviri, mal: MalId): string {
  if (h === "kota_doldu") return applyParams(t("onl.sat.h.kota"), [npcSatisKotasi(mal)]);
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
    if (s.ok) { hap("success"); setSatim(null); setSonuc({ tur: "sat", y: s.deger }); } else { hap("error"); setSatimHata(satHatasi(s.hata, t, satim.mal)); }
  };
  const kitlikVar = (m: MalId) => o.lonca?.find((x) => x.meslek === MALLAR[m].meslek)?.oyuncu === 0;
  const satisKalan = (m: MalId) => o.satisKotasi(m)?.kalan ?? npcSatisKotasi(m);
  const satimEnCok = satim ? Math.max(0, Math.min(ev?.[satim.mal] ?? 0, satisKalan(satim.mal))) : 0;

  const paneller = <>
    <AltPanel acik={!!sonuc} onKapat={() => setSonuc(null)} etiket={t("onl.is.sonuc")} rtl={rtl} t={t}>
      {sonuc?.tur === "is" ? <>
        <View style={{ alignItems: "center", gap: 8, paddingTop: 6 }}>
          <Madalyon icon={MAL_IKON[sonuc.y.mal]} size={64} aktif />
          <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 21, color: C.parchment, textAlign: "center" }}>{t("onl.is." + sonuc.y.is)}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 18, color: C.goldBright, textAlign: "center" }}>{applyParams(t("onl.is.cikti"), [sonuc.y.adet, t("onl.mal." + sonuc.y.mal)])}</Text>
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
          {o.satisKotasi(satim.mal) ? applyParams(t("onl.sat.kalan"), [satisKalan(satim.mal), npcSatisKotasi(satim.mal)]) : applyParams(t("onl.sat.kotaNot"), [npcSatisKotasi(satim.mal)])}
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
      <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/yasam")} />
      <View style={{ flex: 1 }} />
      <Hap icon="coins" metin={String(ben.para)} erisim={applyParams(t("onl.ya.paraErisim"), [ben.para])} />
      <TakatHapi kalan={ben.takat.kalan} tavan={ben.takat.tavan} t={t} />
    </View>
    <View style={{ marginTop: 8 }}>
      <SayfaBasi ust={t("onl.is.ust")} baslik={t("onl.is.baslik")} alt={t("onl.is.alt")} rtl={rtl} />
    </View>
    {genc ? <View style={{ marginTop: 12 }}><Bant tur="bilgi" metin={applyParams(t("onl.is.h.yas"), [TEMEL_IS_YASI])} rtl={rtl} /></View> : null}

    {/* Temel işler */}
    <Baslik2 metin={t("onl.is.temel")} rtl={rtl} />
    <View style={{ gap: 10 }}>
      {ISLER.map((is, n) => {
        const tanim = TEMEL_ISLER[is];
        const kendi = anaMeslek === tanim.meslek;
        const hataBu = isHata?.is === is ? isHata.metin : null;
        return <Animated.View key={is} entering={giris(n * 40)}>
          <Cerceve ic={{ padding: 12, gap: 10 }}>
            <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
              <Madalyon icon={IS_IKON[is]} size={44} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: 15.5, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.is." + is)}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.is.verir"), [t("onl.mal." + tanim.mal)])}</Text>
              </View>
              <View style={{ width: dar ? 84 : 96 }}>
                <Pressable accessibilityLabel={`${t("onl.is." + is)}. ${applyParams(t("onl.is.takatBedel"), [TEMEL_TAKAT])}`} accessibilityState={{ disabled: genc, busy: o.islem === "temelIs" }}
                  disabled={genc || o.islem === "temelIs"} onPress={() => { hap("tap"); void isYap(is); }}
                  style={({ pressed }) => ({ minHeight: 48, borderRadius: 8, borderWidth: 1.5, borderColor: genc ? "rgba(168,130,63,0.4)" : C.goldBright, backgroundColor: pressed ? "rgba(201,162,78,0.3)" : "rgba(201,162,78,0.14)", alignItems: "center", justifyContent: "center", paddingHorizontal: 6, opacity: genc ? 0.55 : 1 })}>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: 13.5, color: C.goldBright }}>{t("onl.is.yap")}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                    <GameIcon name="flame" size={11} color={C.emberSoft} />
                    <Text style={{ fontFamily: F.display, fontSize: 11, color: C.parchmentDim }}>{TEMEL_TAKAT}</Text>
                  </View>
                </Pressable>
              </View>
            </View>
            <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
              <Rozet icon={IS_IKON[is]} metin={applyParams(t("onl.is.kimin"), [t("onl.mes." + tanim.meslek)])} renk={kendi ? C.sage : C.gold} dolu={kendi} />
              {tanim.usta ? <Rozet icon="star" metin={applyParams(t("onl.is.ustaVerir"), [t("onl.mes." + tanim.usta.dugum), t("onl.mal." + tanim.usta.mal)])} renk={C.goldBright} /> : null}
            </View>
            {hataBu ? <Bant metin={hataBu} rtl={rtl} /> : null}
          </Cerceve>
        </Animated.View>;
      })}
    </View>
    <Text style={{ marginTop: 8, fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.is.azalanNot")}</Text>

    {/* Ambar */}
    <Baslik2 metin={t("onl.is.ambar")} rtl={rtl} sag={<Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>{ambar.reduce((a, m) => a + (ev?.[m] ?? 0), 0)}</Text>} />
    {ev === null ? <BosKart icon="backpack" metin={t("onl.is.ambarBilinmiyor")} rtl={rtl} />
      : ambar.length ? <>
        <Text style={{ marginBottom: 10, fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.sat.alt")}</Text>
        <Cerceve ic={{ paddingHorizontal: 12, paddingVertical: 4 }}>
        {ambar.map((m, i) => <View key={m}
          style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, minHeight: 52, paddingVertical: 4, borderTopWidth: i ? 1 : 0, borderColor: "rgba(201,162,78,0.12)" }}>
          <View accessible accessibilityLabel={`${t("onl.mal." + m)}: ${ev?.[m] ?? 0}`} style={{ flex: 1, flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
            <GameIcon name={MAL_IKON[m]} size={18} color={C.gold} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 15.5, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.mal." + m)}</Text>
              {satilirMi(m) && kitlikVar(m) ? <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 12.5, color: C.sage, textAlign: hiza(rtl) }}>{t("onl.kitlik")}</Text> : null}
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
