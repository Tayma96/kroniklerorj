// Çevrimiçi kişi profili (Faz 2c): ad, yaş, meslek, huy, tuhaflık, hayal, gündem ve aile; sana bakışın kalem kalem
// dökümü (toplam = kalemlerin toplamı); üçüncü kişilere bakışı yalnız yakınsan (+30 üstü, §13.9); tanıdık işareti
// (tanıdık · dost · düşman); eylem kartları (bedel, şans dökümü, sonuç). Oyuncu profili sade kart ve işaretle gelir.
import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../../../lib/i18n";
import { C, F } from "../../../lib/theme";
import { GameIcon } from "../../../lib/icons";
import { DesignPressable as Pressable } from "../../../lib/design-pressable";
import { hap } from "../../../lib/haptics";
import { OnlineYakinda } from "../../../lib/online-yakinda";
import { OnlineKapisi } from "../../../lib/online/durum";
import { onizlemeMi, onlineEkranAcik } from "../../../lib/online/kapi";
import { kisiSec } from "../../../lib/online/onizleme";
import { AltinDugme, Bant, Cerceve, GeriDugme, Madalyon, ONL, geriGit, giris, hiza, yon } from "../../../lib/online/ui";
import {
  AltPanel, Baslik2, BosKart, GorusOlcegi, ISARET_RENK, KisiYuzu, Muhur, OnlineSayfa, Rozet, SansHalkasi, TakatHapi, YerlesimBekle, Yukleniyor,
  gorusRengi, sahneGorseli, useYerlesimEkrani, yuzBilgisi,
} from "../../../lib/online/yasam-ui";
import { EylemOnizleme, EylemSonucu, engelMetni } from "../../../lib/online/eylem-ui";
import { ISARET_IKON, MEKAN_IKON, eylemIkonu, hayalYaz, huyYaz, isaretli, kalemYaz, meslekYaz, ruhAnahtari, tuhaflikYaz } from "../../../lib/online/metin";
import { hataAnahtari } from "../../../lib/online/hata";
import { kisiYolu, oyuncuKimligiMi } from "../../../lib/online/toplum-veri";
import { ACILIS_GUNU, ISARETLER, type EylemKarti, type EylemYaniti, type Isaret, type Kisi, type KisiNpc, type OnlineHata } from "../../../lib/online/protokol";

type Ceviri = (k: string) => string;

/** Tanıdık işareti: ekle, ya da tanıdık · dost · düşman arasında seç (öğrenme gününe ve oyuncu kuralına göre). */
function IsaretSecici({ kisi, gun, rtl, t, bekliyor, onIsaret }: { kisi: Kisi; gun: number; rtl: boolean; t: Ceviri; bekliyor: boolean; onIsaret: (i: Isaret | null) => void }) {
  const [not, setNot] = useState<string | null>(null);
  if (!kisi.tanidik) {
    return <AltinDugme etiket={t("onl.ki.ekle")} icon="family" rtl={rtl} bekliyor={bekliyor} onPress={() => onIsaret("tanidik")} />;
  }
  return <View style={{ gap: 8 }}>
    <View accessibilityRole="radiogroup" style={{ flexDirection: yon(rtl), gap: 6 }}>
      {ISARETLER.map((i) => {
        const secili = kisi.tanidik === i;
        const kilit = (ACILIS_GUNU[i] ?? 1) > gun ? applyParams(t("onl.ey.engel.ogrenme"), [ACILIS_GUNU[i]]) : i === "dost" && kisi.oyuncu ? t("onl.ki.oyuncuDost") : null;
        const renk = ISARET_RENK[i];
        return <Pressable key={i} accessibilityRole="radio" accessibilityLabel={t("onl.isaret." + i)} accessibilityState={{ selected: secili, disabled: !!kilit }} accessibilityHint={kilit ?? undefined}
          onPress={() => { if (kilit) { hap("warning"); setNot(kilit); return; } if (secili) return; setNot(null); hap("selection"); onIsaret(i); }}
          style={({ pressed }) => ({ flex: 1, flexDirection: yon(rtl), alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 8, borderWidth: secili ? 2 : 1, borderColor: secili ? renk : "rgba(201,162,78,0.4)", backgroundColor: secili ? "rgba(201,162,78,0.18)" : pressed ? "rgba(201,162,78,0.1)" : "rgba(14,10,6,0.7)", opacity: kilit ? 0.55 : 1 })}>
          <GameIcon name={kilit ? "hourglass" : ISARET_IKON[i]} size={14} color={secili ? renk : C.parchmentMuted} />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 12, color: secili ? C.parchment : C.parchmentDim }}>{t("onl.isaret." + i)}</Text>
        </Pressable>;
      })}
    </View>
    {not ? <Bant tur="bilgi" metin={not} rtl={rtl} /> : null}
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
      <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t(kisi.tanidik === "dusman" ? "onl.ki.dusmanNot" : "onl.ki.isaretNot")}</Text>
      <Pressable accessibilityLabel={t("onl.ki.cikar")} onPress={() => { hap("tap"); onIsaret(null); }} style={{ paddingHorizontal: 8 }}>
        <Text style={{ fontFamily: F.display, fontSize: 11.5, color: C.goldDim, textDecorationLine: "underline" }}>{t("onl.ki.cikar")}</Text>
      </Pressable>
    </View>
  </View>;
}

function EylemSatiri({ kart, rtl, t, onPress }: { kart: EylemKarti; rtl: boolean; t: Ceviri; onPress: () => void }) {
  const alt = kart.engel ? engelMetni(kart.tur, kart.engel, t)
    : kart.getiri.tekrar > 0 ? `${applyParams(t("onl.ey.bedel"), [kart.takat])} · ${applyParams(t("onl.ey.getiri"), [kart.getiri.carpan])}`
    : applyParams(t("onl.ey.bedel"), [kart.takat]);
  return <Pressable accessibilityLabel={`${t("onl.ey." + kart.tur)}. ${kart.sans ? applyParams(t("onl.ey.sans"), [kart.sans.toplam]) + ". " : ""}${alt}`} onPress={() => { hap("tap"); onPress(); }}
    style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>
    <Cerceve aktif={kart.acik && (kart.sans?.toplam ?? 0) >= 70} ic={{ flexDirection: yon(rtl), alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
      <Madalyon icon={eylemIkonu(kart.tur)} size={44} aktif={kart.acik} renk={kart.acik ? undefined : C.parchmentMuted} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontFamily: F.display, fontSize: 15, color: kart.acik ? C.parchment : C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.ey." + kart.tur)}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 18, color: kart.engel ? C.emberSoft : C.parchmentMuted, textAlign: hiza(rtl) }}>{alt}</Text>
      </View>
      {kart.sans ? <SansHalkasi yuzde={kart.sans.toplam} boyut={50} kilitli={!kart.acik} />
        : <View style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, borderColor: ONL.frame, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(14,10,6,0.7)" }}><GameIcon name="hourglass" size={18} color={C.parchmentMuted} /></View>}
    </Cerceve>
  </Pressable>;
}

function KisiEkran() {
  const router = useRouter();
  const { t, rtl, lang } = useI18n();
  const { id: param } = useLocalSearchParams<{ id?: string }>();
  const o = useYerlesimEkrani();
  const y = o.yerlesim;
  const id = kisiSec(typeof param === "string" ? param : undefined, y);
  const kisi = id ? o.kisiler[id] : undefined;
  const [panel, setPanel] = useState<EylemKarti | null>(null);
  const [sonuc, setSonuc] = useState<EylemYaniti | null>(null);
  const [hata, setHata] = useState<OnlineHata | null>(null);

  useEffect(() => { if (id && y) void o.kisiYukle(id); }, [id, !!y]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (kisi?.oyuncu && kisi.ben) router.replace("/online/karakter"); }, [kisi]); // eslint-disable-line react-hooks/exhaustive-deps
  // Faz 3a: oyuncular kendi profil sayfasında açılır (dostluk, teklif, armağan, vitrin).
  useEffect(() => { if (oyuncuKimligiMi(id) && !onizlemeMi()) router.replace(kisiYolu(id)); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!y) return <YerlesimBekle rtl={rtl} t={t} onGiris={() => router.replace("/online")} />;
  const geri = () => geriGit(router, "/online/mahalle");
  const ben = y.ben;
  const ust = <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
    <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={geri} />
    <Text style={{ flex: 1, fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 2, color: C.goldBright, textAlign: hiza(rtl), textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 6 }}>{t("onl.ki.ust")}</Text>
    <TakatHapi kalan={ben.takat.kalan} tavan={ben.takat.tavan} t={t} />
  </View>;
  const gorsel = sahneGorseli(y.yerlesim.tur, y.saat.mevsim);

  if (!kisi) {
    const kisiHata = o.hataIslem === "kisi" ? o.hata : !id ? "kisi_yok" : null;
    return <OnlineSayfa gorsel={gorsel} oran={0.34} rtl={rtl} t={t}>
      {ust}
      <View style={{ minHeight: 140 }} />
      {kisiHata ? <Bant metin={t(hataAnahtari(kisiHata))} rtl={rtl} eylem={id ? t("onl.yenidenDene") : t("onl.geri")} onEylem={() => (id ? void o.kisiYukle(id) : geri())} />
        : <Yukleniyor metin={t("onl.yukleniyor")} />}
    </OnlineSayfa>;
  }

  const isaretle = (i: Isaret | null) => { void o.tanidikIsaretle(kisi.id, i); };
  const isaretBekliyor = o.islem === "tanidik";
  const isaretHata = o.hataIslem === "tanidik" ? o.hata : null;
  const mekan = kisi.mekan ? <Rozet icon={MEKAN_IKON[kisi.mekan] ?? "house"} metin={applyParams(t("onl.ki.buAy"), [t("onl.mekan." + kisi.mekan)])} /> : null;

  // Oyuncu profili: Faz 2'de yalnız kimlik, bu ayki yeri ve işaret (dostluk isteği sonraki fazda).
  if (kisi.oyuncu) {
    return <OnlineSayfa gorsel={gorsel} oran={0.34} rtl={rtl} t={t}>
      {ust}
      <Animated.View entering={giris(60)} style={{ marginTop: 18 }}>
        <Cerceve ic={{ padding: 16, gap: 14, alignItems: "center" }}>
          <KisiYuzu id={kisi.id} ad={kisi.ad} boyut={96} yas={kisi.yas} cinsiyet={kisi.cinsiyet} oyuncu isaret={kisi.tanidik} />
          <View style={{ alignItems: "center", gap: 4 }}>
            <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 24, color: C.parchment, textAlign: "center" }}>{kisi.ad}</Text>
            <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 6 }}>
              <Muhur boyut={16} />
              <Text style={{ fontFamily: F.serif, fontSize: 16, color: "#F0D490" }}>{applyParams(t("onl.ki.oyuncuYas"), [kisi.yas])}</Text>
            </View>
          </View>
          {mekan}
          <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 21, color: C.parchmentDim, textAlign: "center" }}>{t("onl.ki.oyuncuNot")}</Text>
          <View style={{ alignSelf: "stretch" }}><IsaretSecici kisi={kisi} gun={ben.ogrenme.gun} rtl={rtl} t={t} bekliyor={isaretBekliyor} onIsaret={isaretle} /></View>
          {isaretHata ? <Bant metin={t(hataAnahtari(isaretHata))} rtl={rtl} /> : null}
        </Cerceve>
      </Animated.View>
    </OnlineSayfa>;
  }

  const n: KisiNpc = kisi;
  const kadin = n.cinsiyet === "kadın";
  const bakis = n.sanaBakis;
  const toplamKalem = bakis.kalemler.reduce((a, k) => a + k.d, 0);
  const dene = async () => {
    if (!panel) return;
    setHata(null);
    const s = await o.eylemYap({ tur: panel.tur, hedef: n.id });
    if (s.ok) { hap(s.deger.basari ? "success" : "warning"); setPanel(null); setSonuc(s.deger); }
    else { hap("error"); setHata(s.hata); }
  };

  return <OnlineSayfa gorsel={gorsel} oran={0.34} rtl={rtl} t={t}
    alt={<>
      <AltPanel acik={!!panel} onKapat={() => { setPanel(null); setHata(null); }} etiket={panel ? t("onl.ey." + panel.tur) : ""} rtl={rtl} t={t}>
        {panel ? <EylemOnizleme kart={n.eylemler.find((e) => e.tur === panel.tur) ?? panel} hedefAd={n.ad} rtl={rtl} t={t} lang={lang} bekliyor={o.islem === "eylem"} hata={hata} onDene={() => { void dene(); }} /> : null}
      </AltPanel>
      <AltPanel acik={!!sonuc} onKapat={() => setSonuc(null)} etiket={t("onl.ey.sonuc")} rtl={rtl} t={t}>
        {sonuc ? <EylemSonucu y={sonuc} rtl={rtl} t={t} lang={lang} onTamam={() => setSonuc(null)} /> : null}
      </AltPanel>
    </>}>
    {ust}

    {/* Kimlik kartı */}
    <Animated.View entering={giris(60)} style={{ marginTop: 14 }}>
      <Cerceve ic={{ padding: 14, gap: 12 }}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 14 }}>
          <KisiYuzu id={n.id} ad={n.ad} boyut={88} yas={n.yas} cinsiyet={n.cinsiyet} isaret={n.tanidik} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 21, lineHeight: 27, color: C.parchment, textAlign: hiza(rtl) }}>{n.ad}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 16, color: C.goldBright, textAlign: hiza(rtl) }}>{applyParams(t("onl.ki.yasMeslek"), [n.yas, meslekYaz(n.meslek, lang, kadin)])}</Text>
            <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6, marginTop: 2 }}>
              {n.huy ? <Rozet icon="hood" metin={huyYaz(n.huy, lang)} /> : null}
              {n.gundem ? <Rozet icon="scroll" metin={t("onl.ki.gundem." + n.gundem)} renk={C.emberSoft} /> : null}
            </View>
          </View>
        </View>
        {mekan ? <View style={{ flexDirection: yon(rtl) }}>{mekan}</View> : null}
        {n.tuhaflik || n.hayal ? <View style={{ gap: 6, paddingTop: 2 }}>
          {n.tuhaflik ? <View style={{ flexDirection: yon(rtl), gap: 8 }}>
            <GameIcon name="scroll-open" size={15} color={C.gold} />
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.ki.tuhaflik"), [tuhaflikYaz(n.tuhaflik, lang)])}</Text>
          </View> : null}
          {n.hayal ? <View style={{ flexDirection: yon(rtl), gap: 8 }}>
            <GameIcon name="star" size={15} color={C.gold} />
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.ki.hayal"), [hayalYaz(n.hayal, lang)])}</Text>
          </View> : null}
        </View> : null}
        <IsaretSecici kisi={n} gun={ben.ogrenme.gun} rtl={rtl} t={t} bekliyor={isaretBekliyor} onIsaret={isaretle} />
        {isaretHata ? <Bant metin={t(hataAnahtari(isaretHata))} rtl={rtl} /> : null}
      </Cerceve>
    </Animated.View>

    {/* Sana bakışı: kalem kalem */}
    <Baslik2 metin={t("onl.ki.sanaBakis")} rtl={rtl} />
    <Cerceve ic={{ padding: 14, gap: 10 }}>
      <View accessible accessibilityLabel={`${t(ruhAnahtari(bakis.toplam))} ${isaretli(bakis.toplam)}`} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 12 }}>
        <Text style={{ fontFamily: F.display, fontSize: 34, color: gorusRengi(bakis.toplam) }}>{isaretli(bakis.toplam)}</Text>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ fontFamily: F.display, fontSize: 14.5, color: C.parchment, textAlign: hiza(rtl) }}>{t(ruhAnahtari(bakis.toplam))}</Text>
          <GorusOlcegi deger={bakis.toplam} rtl={rtl} yukseklik={8} />
        </View>
      </View>
      {bakis.kalemler.length ? <View style={{ borderTopWidth: 1, borderColor: "rgba(201,162,78,0.18)" }}>
        {bakis.kalemler.map((k, i) => <View key={k.k + i} accessible accessibilityLabel={`${kalemYaz(k, t, lang)}: ${isaretli(k.d)}`}
          style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderColor: "rgba(201,162,78,0.1)" }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: k.d > 0 ? C.sage : C.ember }} />
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15.5, lineHeight: 21, color: C.parchmentDim, textAlign: hiza(rtl) }}>{kalemYaz(k, t, lang)}</Text>
          <Text style={{ minWidth: 40, fontFamily: F.display, fontSize: 14, color: k.d > 0 ? C.sage : C.ember, textAlign: rtl ? "left" : "right" }}>{isaretli(k.d)}</Text>
        </View>)}
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingTop: 9 }}>
          <Text style={{ flex: 1, fontFamily: F.display, fontSize: 12.5, letterSpacing: rtl ? 0 : 1.2, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.ki.toplam")}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 16, color: gorusRengi(toplamKalem) }}>{isaretli(toplamKalem)}</Text>
        </View>
      </View> : <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.ki.bakisBos")}</Text>}
    </Cerceve>

    {/* Eylemler */}
    <Baslik2 metin={t("onl.ki.eylemler")} rtl={rtl} />
    <View style={{ gap: 8 }}>
      {n.eylemler.map((e) => <EylemSatiri key={e.tur} kart={e} rtl={rtl} t={t} onPress={() => { setHata(null); setPanel(e); }} />)}
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(201,162,78,0.35)", backgroundColor: "rgba(14,10,6,0.55)" }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: ONL.frame, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchmentMuted }}>13+</Text>
        </View>
        <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.ki.yas13")}</Text>
      </View>
    </View>

    {/* Ailesi */}
    {n.aile.length ? <>
      <Baslik2 metin={t("onl.ki.aile")} rtl={rtl} />
      <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 8 }}>
        {n.aile.map((a) => <Pressable key={a.id} accessibilityLabel={`${t("onl.rol." + a.rol)}: ${a.ad}`} onPress={() => { hap("tap"); router.push(`/online/kisi/${a.id}`); }}
          style={({ pressed }) => ({ flexDirection: yon(rtl), alignItems: "center", gap: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 24, borderWidth: 1, borderColor: "rgba(201,162,78,0.45)", backgroundColor: pressed ? "rgba(201,162,78,0.18)" : "rgba(14,10,6,0.72)" })}>
          <KisiYuzu id={a.id} ad={a.ad} boyut={34} {...yuzBilgisi(o.kisiler, a.id)} />
          <View>
            <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: rtl ? 0 : 1, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.rol." + a.rol)}</Text>
            <Text numberOfLines={1} style={{ maxWidth: 150, fontFamily: F.serif, fontSize: 14.5, color: C.parchment, textAlign: hiza(rtl) }}>{a.ad}</Text>
          </View>
        </Pressable>)}
      </View>
    </> : null}

    {/* Başkalarına bakışı (§13.9) */}
    <Baslik2 metin={t("onl.ki.bakislari")} rtl={rtl} />
    {n.bakislari.gorunur ? (n.bakislari.liste.length ? <Cerceve ic={{ paddingVertical: 4 }}>
      {n.bakislari.liste.map((b, i) => <Pressable key={b.id} accessibilityLabel={`${b.ad} · ${t("onl.rol." + b.tur)} · ${isaretli(b.deger)}`} onPress={() => router.push(kisiYolu(b.id))}
        style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 6, borderTopWidth: i ? 1 : 0, borderColor: "rgba(201,162,78,0.12)" }}>
        <KisiYuzu id={b.id} ad={b.ad} boyut={36} oyuncu={!!b.oyuncu} {...yuzBilgisi(o.kisiler, b.id)} />
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 6 }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.serif, fontSize: 15, color: C.parchment }}>{b.ad}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 10.5, color: C.gold }}>{t("onl.rol." + b.tur)}</Text>
          </View>
          <GorusOlcegi deger={b.deger} rtl={rtl} yukseklik={5} />
        </View>
        <Text style={{ minWidth: 36, fontFamily: F.display, fontSize: 13.5, color: gorusRengi(b.deger), textAlign: rtl ? "left" : "right" }}>{isaretli(b.deger)}</Text>
      </Pressable>)}
    </Cerceve> : <BosKart icon="family" metin={t("onl.ki.bakislariBos")} rtl={rtl} />)
      : <BosKart icon="hood" metin={t("onl.ki.bakisGizli")} rtl={rtl} />}
  </OnlineSayfa>;
}

export default function OnlineKisi() {
  return onlineEkranAcik() ? <OnlineKapisi><KisiEkran /></OnlineKapisi> : <OnlineYakinda />;
}
