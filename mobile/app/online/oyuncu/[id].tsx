// Oyuncu profil sayfası (ana tasarım §6.2, Faz 3a): ad, yaş, meslek ve kademe, hane, nam, teveccüh kademesi ve
// etkileri (yazılı), mesleki geçmiş (beceri ağacı v2 §5), armağan vitrini ("Ayşe yapımı nal"), ortak tanıdıklar,
// dostluk/husumet durumu. Başkasında: dostluk, teklif, armağan, husumet, engel, şikayet. Kendinde: vitrini düzenle.
// Veri GET /v1/oyuncu/:id'den; bütün eylemler istekNo'lu niyettir, sonuç sunucudan gelir.
import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../../../lib/i18n";
import { C, F } from "../../../lib/theme";
import { GameIcon } from "../../../lib/icons";
import { DesignPressable as Pressable } from "../../../lib/design-pressable";
import { hap } from "../../../lib/haptics";
import { OnlineYakinda } from "../../../lib/online-yakinda";
import { OnlineKapisi } from "../../../lib/online/durum";
import { onlineEkranAcik } from "../../../lib/online/kapi";
import { oyuncuSec } from "../../../lib/online/onizleme";
import { AltinDugme, Bant, Cerceve, CizgiDugme, GeriDugme, Madalyon, ONL, geriGit, giris, hiza, yon } from "../../../lib/online/ui";
import { AltPanel, Baslik2, BosKart, KisiYuzu, OnlineSayfa, Rozet, SatirOku, TakatHapi, YerlesimBekle, Yukleniyor, sahneGorseli, useYerlesimEkrani } from "../../../lib/online/yasam-ui";
import { MEKAN_IKON, etkiYaz } from "../../../lib/online/metin";
import { hataAnahtari } from "../../../lib/online/hata";
import { NAMLAR, type OnlineHata } from "../../../lib/online/protokol";
import { useToplum, type Toplum } from "../../../lib/online/toplum-durum";
import { GelenKutusuKarti, Secenekler, TeklifFormu, armaganYaz, ayFarki, kademeAdi, kapiMetni } from "../../../lib/online/toplum-ui";
import { SIKAYET_NEDENLERI, TOPLUM_SINIR, kisiYolu, type OyuncuProfili, type OyuncuTeklifTuru, type SikayetNedeni, type VitrinArmagani } from "../../../lib/online/toplum-veri";

type Ceviri = (k: string) => string;
type Onay = { tur: "husumet" | "engelle" | "dostlukBitir"; islem: string };

/** Teveccüh: kademe adı, sonraki eşiğe ilerleme, veren sayısı ve sıfır olmayan etkiler (sunucunun yazdığı değerler). */
function Teveccuh({ p, rtl, t, lang }: { p: OyuncuProfili; rtl: boolean; t: Ceviri; lang: ReturnType<typeof useI18n>["lang"] }) {
  const tv = p.teveccuh;
  const oran = tv.sonrakiEsik ? Math.min(1, tv.puan / tv.sonrakiEsik) : 1;
  return <Cerceve aktif={tv.kademe >= 3} ic={{ padding: 14, gap: 10 }}>
    <View accessible accessibilityLabel={`${t("onl.tp.tv.baslik")}: ${t("onl.tp.tv.k" + tv.kademe)}`} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 12 }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: tv.kademe ? C.goldBright : ONL.frame, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(14,10,6,0.75)" }}>
        <Text style={{ fontFamily: F.display, fontSize: 22, color: tv.kademe ? C.goldBright : C.parchmentMuted }}>{tv.kademe}</Text>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.tp.tv.k" + tv.kademe)}</Text>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(201,162,78,0.16)", overflow: "hidden", flexDirection: yon(rtl) }}>
          <View style={{ width: `${Math.max(oran * 100, oran > 0 ? 3 : 0)}%`, backgroundColor: C.goldBright, borderRadius: 3 }} />
        </View>
        <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>
          {tv.sonrakiEsik ? applyParams(t("onl.tp.tv.esik"), [tv.puan, tv.sonrakiEsik, tv.verenSayisi]) : applyParams(t("onl.tp.tv.enUst"), [tv.puan, tv.verenSayisi])}
        </Text>
      </View>
    </View>
    {tv.etkiler.length ? <View style={{ gap: 6, borderTopWidth: 1, borderColor: "rgba(201,162,78,0.15)", paddingTop: 8 }}>
      {tv.etkiler.map((e) => <View key={e.k} style={{ flexDirection: yon(rtl), gap: 8 }}>
        <GameIcon name="star" size={13} color={C.gold} />
        <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{etkiYaz(e, t, lang)}</Text>
      </View>)}
    </View> : <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 20, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t(p.ben ? "onl.tp.tv.bosBen" : "onl.tp.tv.bos")}</Text>}
    <Text style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.tp.tv.not")}</Text>
  </Cerceve>;
}

/** Mesleki geçmiş: her meslekte kademe ve öğrenilmiş dallar; toplam beceri; unvanlar (sunucu gönderince). */
function MeslekiGecmis({ p, rtl, t, onMeslek }: { p: OyuncuProfili; rtl: boolean; t: Ceviri; onMeslek: (m: string) => void }) {
  const satirlar = [...p.meslekler].sort((a, b) => b.kademe - a.kademe || b.dallar.length - a.dallar.length);
  const toplam = p.meslekler.reduce((a, m) => a + m.dallar.length, 0);
  return <Cerceve ic={{ paddingVertical: 4 }}>
    {satirlar.length ? satirlar.map((m, i) => {
      const rol = m.meslek === p.meslek.ana ? t("onl.tp.mg.ana") : m.meslek === p.meslek.yan ? t("onl.tp.mg.yan") : null;
      const dallar = m.dallar.map((d) => t(`onl.mes.${m.meslek}.${d}`)).join(" · ");
      return <Pressable key={m.meslek} accessibilityRole="link" accessibilityLabel={`${t("onl.mes." + m.meslek)}, ${kademeAdi(t, m.kademe)}. ${dallar || t("onl.tp.mg.dalYok")}`}
        accessibilityHint={t("onl.tp.mg.agac")} onPress={() => { hap("tap"); onMeslek(m.meslek); }}
        style={({ pressed }) => ({ minHeight: 44, flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderColor: "rgba(201,162,78,0.12)", backgroundColor: pressed ? "rgba(201,162,78,0.08)" : "transparent" })}>
        <Madalyon icon="anvil" size={36} aktif={m.kademe >= 2} />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", alignItems: "center", gap: 6 }}>
            <Text style={{ flexShrink: 1, fontFamily: F.display, fontSize: 14, color: C.parchment, textAlign: hiza(rtl) }}>{`${t("onl.mes." + m.meslek)} — ${kademeAdi(t, m.kademe)}`}</Text>
            {rol ? <Rozet metin={rol} renk={C.gold} /> : null}
          </View>
          <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 19, color: dallar ? C.parchmentDim : C.parchmentMuted, textAlign: hiza(rtl) }}>{dallar || t("onl.tp.mg.dalYok")}</Text>
        </View>
        <SatirOku rtl={rtl} />
      </Pressable>;
    }) : <View style={{ padding: 12 }}><Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t(p.ben ? "onl.tp.mg.bosBen" : "onl.tp.mg.bos")}</Text></View>}
    <View style={{ gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderColor: "rgba(201,162,78,0.18)" }}>
      <Text style={{ fontFamily: F.display, fontSize: 12.5, color: C.goldBright, textAlign: hiza(rtl) }}>{applyParams(t("onl.tp.mg.toplam"), [toplam])}</Text>
      {p.unvanlar?.length ? <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>{p.unvanlar.map((u) => <Rozet key={u} icon="medal" metin={u} renk={C.goldBright} />)}</View>
        : <Text style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.tp.mg.unvanYok")}</Text>}
    </View>
  </Cerceve>;
}

function VitrinSatiri({ a, ay, rtl, t, secim }: { a: VitrinArmagani; ay: number; rtl: boolean; t: Ceviri; secim?: { secili: boolean; onSec: () => void; kilit: boolean } }) {
  const icerik = armaganYaz(t, a);
  const etiket = `${applyParams(t("onl.tp.vt.kimden"), [a.kimden.ad])}: ${icerik}`;
  const govde = <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 9, minHeight: 44 }}>
    <Madalyon icon={a.mal ? "gems" : "coins"} size={36} aktif={!!a.yapan} />
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ fontFamily: F.serif, fontSize: 15.5, lineHeight: 20, color: C.parchment, textAlign: hiza(rtl) }}>{icerik}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{`${applyParams(t("onl.tp.vt.kimden"), [a.kimden.ad])} · ${ayFarki(t, a.ay, ay)}`}</Text>
    </View>
    {secim ? <View style={{ width: 26, height: 26, borderRadius: 6, borderWidth: 1.5, borderColor: secim.secili ? C.goldBright : ONL.frame, alignItems: "center", justifyContent: "center", backgroundColor: secim.secili ? C.goldBright : "transparent", opacity: secim.kilit ? 0.4 : 1 }}>
      {secim.secili ? <GameIcon name="star" size={13} color={C.inkOnGold} /> : null}
    </View> : null}
  </View>;
  if (!secim) return <View accessible accessibilityLabel={etiket}>{govde}</View>;
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={etiket} accessibilityState={{ checked: secim.secili, disabled: secim.kilit }} disabled={secim.kilit} onPress={() => { hap("selection"); secim.onSec(); }}>{govde}</Pressable>;
}

/** Kendi vitrinini düzenle: gösterilen + gelen kutusundaki kabul edilmiş armağanlar; en çok 6 seçilir. */
function VitrinDuzenle({ p, ay, toplum, onBitti }: { p: OyuncuProfili; ay: number; toplum: Toplum; onBitti: () => void }) {
  const { t, rtl } = useI18n();
  useEffect(() => { if (!toplum.gelen) void toplum.gelenYukle(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const adaylar = useMemo(() => {
    const liste: VitrinArmagani[] = [...p.vitrin];
    for (const x of toplum.gelen?.kapanan ?? []) {
      if (x.tur !== "hediye" || x.durum !== "bitti" || x.yon !== "gelen" || liste.some((a) => a.id === x.id)) continue;
      liste.push({ id: x.id, kimden: x.gonderen, ay: x.kapanisAyi ?? x.acilisAyi, ...(x.sartlar.tutar ? { akce: x.sartlar.tutar } : {}), ...(x.sartlar.mal ? { mal: x.sartlar.mal, adet: x.sartlar.adet ?? 1 } : {}), yapan: x.sartlar.yapan ?? null });
    }
    return liste;
  }, [p.vitrin, toplum.gelen]);
  const [secili, setSecili] = useState<string[]>(() => p.vitrin.map((a) => a.id));
  const [hata, setHata] = useState<OnlineHata | null>(null);
  const kaydet = async () => {
    setHata(null);
    const s = await toplum.vitrinKaydet(p.id, secili);
    if (s.ok) { hap("success"); onBitti(); } else { hap("error"); setHata(s.hata); }
  };
  return <View style={{ gap: 12 }}>
    <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 19, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.tp.vt.duzenle")}</Text>
    <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.tp.vt.duzenleAlt"), [TOPLUM_SINIR.vitrinEnCok])}</Text>
    {adaylar.length ? <Cerceve ic={{ paddingVertical: 2 }}>
      {adaylar.map((a, i) => {
        const sec = secili.includes(a.id);
        return <View key={a.id} style={{ borderTopWidth: i ? 1 : 0, borderColor: "rgba(201,162,78,0.12)" }}>
          <VitrinSatiri a={a} ay={ay} rtl={rtl} t={t} secim={{ secili: sec, kilit: !sec && secili.length >= TOPLUM_SINIR.vitrinEnCok, onSec: () => setSecili(sec ? secili.filter((x) => x !== a.id) : [...secili, a.id]) }} />
        </View>;
      })}
    </Cerceve> : <BosKart icon="gems" metin={t("onl.tp.vt.bosBen")} rtl={rtl} />}
    <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.tp.vt.secimYok")}</Text>
    {hata ? <Bant metin={t(hataAnahtari(hata))} rtl={rtl} /> : null}
    <AltinDugme etiket={t("onl.tp.vt.kaydet")} icon="gems" rtl={rtl} bekliyor={toplum.bekliyor(`vitrin:${secili.join(",")}`)} onPress={() => { void kaydet(); }} />
  </View>;
}

/** Şikayet: neden ve isteğe bağlı açıklama (/v1/sikayet; yöneticilere gider). */
function SikayetFormu({ p, toplum, onBitti }: { p: OyuncuProfili; toplum: Toplum; onBitti: () => void }) {
  const { t, rtl } = useI18n();
  const [neden, setNeden] = useState<SikayetNedeni | null>(null);
  const [aciklama, setAciklama] = useState("");
  const [hata, setHata] = useState<OnlineHata | null>(null);
  const [kalan, setKalan] = useState<number | null | undefined>(undefined);
  const gonder = async () => {
    if (!neden) return;
    setHata(null);
    const s = await toplum.sikayet(p.id, neden, aciklama.trim() || undefined);
    if (s.ok) { hap("success"); setKalan(s.deger.kalan ?? null); } else { hap("error"); setHata(s.hata); }
  };
  if (kalan !== undefined) return <View style={{ gap: 12, alignItems: "center" }}>
    <Madalyon icon="scales" size={56} aktif />
    <Text style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 22, color: C.parchment, textAlign: "center" }}>{kalan !== null ? applyParams(t("onl.tp.sk.alindiKalan"), [kalan]) : t("onl.tp.sk.alindi")}</Text>
    <View style={{ alignSelf: "stretch" }}><CizgiDugme etiket={t("onl.tp.tamam")} rtl={rtl} onPress={onBitti} /></View>
  </View>;
  return <View style={{ gap: 12 }}>
    <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 19, color: C.parchment, textAlign: hiza(rtl) }}>{applyParams(t("onl.tp.sk.baslik"), [p.ad])}</Text>
    <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.tp.sk.alt")}</Text>
    <Secenekler secenekler={SIKAYET_NEDENLERI} secili={neden} onSec={setNeden} etiket={(n) => t("onl.tp.sk.n." + n)} />
    <TextInput value={aciklama} onChangeText={setAciklama} maxLength={500} multiline placeholder={t("onl.tp.sk.aciklama")} placeholderTextColor={C.parchmentMuted}
      accessibilityLabel={t("onl.tp.sk.aciklama")}
      style={{ minHeight: 88, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: ONL.frame, backgroundColor: "rgba(14,10,6,0.7)", fontFamily: F.serif, fontSize: 16, color: C.parchment, textAlign: hiza(rtl), textAlignVertical: "top" }} />
    {hata ? <Bant metin={t(hataAnahtari(hata))} rtl={rtl} /> : null}
    <AltinDugme etiket={t("onl.tp.sk.gonder")} icon="scales" rtl={rtl} kapali={!neden} bekliyor={!!toplum.islem?.startsWith(`sikayet:${p.id}:`)} onPress={() => { void gonder(); }} />
  </View>;
}

function EylemDugmesi({ icon, baslik, alt, onPress, kapali, bekliyor, tehlike, rtl }: { icon: string; baslik: string; alt?: string | null; onPress: () => void; kapali?: boolean; bekliyor?: boolean; tehlike?: boolean; rtl: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={alt ? `${baslik}. ${alt}` : baslik} accessibilityState={{ disabled: !!kapali, busy: !!bekliyor }} disabled={kapali || bekliyor}
    onPress={() => { hap("tap"); onPress(); }} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }], opacity: kapali ? 0.6 : 1 })}>
    <Cerceve ic={{ flexDirection: yon(rtl), alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 9, minHeight: 56 }}>
      <Madalyon icon={bekliyor ? "hourglass" : icon} size={38} aktif={!kapali && !tehlike} renk={tehlike ? C.ember : kapali ? C.parchmentMuted : undefined} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: F.display, fontSize: 14, color: tehlike ? C.emberSoft : C.parchment, textAlign: hiza(rtl) }}>{baslik}</Text>
        {alt ? <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{alt}</Text> : null}
      </View>
    </Cerceve>
  </Pressable>;
}

function OyuncuEkran() {
  const router = useRouter();
  const { t, rtl, lang } = useI18n();
  const { id: param } = useLocalSearchParams<{ id?: string }>();
  const o = useYerlesimEkrani();
  const toplum = useToplum();
  const y = o.yerlesim;
  const id = oyuncuSec(typeof param === "string" ? param : undefined, y?.ben.id);
  const p = toplum.profil(id);
  const [form, setForm] = useState<OyuncuTeklifTuru | null>(null);
  const [onay, setOnay] = useState<Onay | null>(null);
  const [sikayet, setSikayet] = useState(false);
  const [vitrin, setVitrin] = useState(false);
  const [arabulucuAcik, setArabulucuAcik] = useState(false);
  const [arabulucuId, setArabulucuId] = useState<string | null>(null);
  const [hata, setHata] = useState<OnlineHata | null>(null);

  useEffect(() => { if (id && y) void toplum.oyuncuYukle(id); }, [id, !!y]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!y) return <YerlesimBekle rtl={rtl} t={t} onGiris={() => router.replace("/online")} />;
  const geri = () => geriGit(router, "/online/mahalle");
  const gorsel = sahneGorseli(y.yerlesim.tur, y.saat.mevsim);
  const ay = toplum.gelen?.ay ?? y.saat.oyunAyi;
  const ust = <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
    <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={geri} />
    <Text style={{ flex: 1, fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 2, color: C.goldBright, textAlign: hiza(rtl), textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 6 }}>{t(p?.ben ? "onl.tp.ustBen" : "onl.tp.ust")}</Text>
    <TakatHapi kalan={y.ben.takat.kalan} tavan={y.ben.takat.tavan} t={t} />
  </View>;

  if (!p) {
    const yukHata = id ? toplum.hataOf("oyuncu:" + id) : "kisi_yok";
    return <OnlineSayfa gorsel={gorsel} oran={0.34} rtl={rtl} t={t}>
      {ust}
      <View style={{ minHeight: 140 }} />
      {yukHata ? <Bant metin={t(hataAnahtari(yukHata))} rtl={rtl} eylem={id ? t("onl.yenidenDene") : t("onl.geri")} onEylem={() => (id ? void toplum.oyuncuYukle(id) : geri())} />
        : <Yukleniyor metin={t("onl.yukleniyor")} />}
    </OnlineSayfa>;
  }

  const eylem = (tur: string) => p.eylemler.find((e) => e.tur === tur);
  const kisiyeGit = (k: string) => { hap("tap"); router.push(kisiYolu(k)); };
  const sonuc = async (s: Promise<{ ok: boolean; hata?: OnlineHata }>) => {
    setHata(null);
    const r = await s;
    if (r.ok) { hap("success"); setOnay(null); } else { hap("error"); setHata(r.hata ?? "sunucu_hatasi"); }
  };
  const dostluk = eylem("dostluk");
  const husumet = eylem("husumet");
  const engel = eylem("engelle");
  const teklifKapali = OYUNCU_TURLERI.every((x) => !!eylem(`teklif.${x}`)?.engel);
  const hediyeKapi = kapiMetni(t, "teklif.hediye", eylem("teklif.hediye")?.engel);
  const teklifKapi = teklifKapali ? kapiMetni(t, "teklif.cirak", eylem("teklif.cirak")?.engel) : null;
  const ana = p.meslek.ana;
  const yan = p.meslek.yan;
  const arabulucuAdaylari = p.ortakTanidiklar.filter((k) => k.id.startsWith("o") && k.id !== y.ben.id && k.id !== p.id);
  const arabuluculukBaslat = async () => {
    if (!arabulucuId) return;
    setHata(null);
    const r = await toplum.arabuluculuk({ islem: "ac", hedef: p.id, arabulucu: arabulucuId });
    if (!r.ok) { hap("error"); setHata(r.hata ?? "sunucu_hatasi"); return; }
    hap("success");
    setArabulucuAcik(false);
    setArabulucuId(null);
    await toplum.gelenYukle();
  };

  // Durum rozetleri: dostluk, husumet, engel.
  const durumlar: { metin: string; renk: string; icon: string }[] = [];
  if (p.bag === "dost") durumlar.push({ metin: t("onl.tp.bag.dost"), renk: C.sage, icon: "family" });
  if (p.bag === "istekGeldi") durumlar.push({ metin: t("onl.tp.bag.istekGeldi"), renk: C.goldBright, icon: "family" });
  if (p.bag === "istekGonderildi") durumlar.push({ metin: t("onl.tp.bag.istekGonderildi"), renk: C.gold, icon: "hourglass" });
  if (p.husumet.oIlanEtti) durumlar.push({ metin: t("onl.tp.hu.oIlan"), renk: C.blood, icon: "crossed-swords" });
  if (p.husumet.benIlanEttim) durumlar.push({ metin: t("onl.tp.hu.benIlan"), renk: C.ember, icon: "crossed-swords" });
  if (p.engelledim) durumlar.push({ metin: t("onl.tp.engelledin"), renk: C.parchmentMuted, icon: "shield" });

  return <OnlineSayfa gorsel={gorsel} oran={0.34} rtl={rtl} t={t}
    alt={<>
      <AltPanel acik={!!form} onKapat={() => setForm(null)} etiket={t("onl.tp.f.panel")} rtl={rtl} t={t}>
        {form ? <TeklifFormu p={p} baslangic={form} onBitti={() => setForm(null)} /> : null}
      </AltPanel>
      <AltPanel acik={arabulucuAcik} onKapat={() => { setArabulucuAcik(false); setArabulucuId(null); setHata(null); }} etiket={t("onl.tp.arb.baslat")} rtl={rtl} t={t}>
        <View style={{ gap: 10 }}>
          <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.tp.arb.arabulucuNot")}</Text>
          {arabulucuAdaylari.length ? arabulucuAdaylari.map((k) => {
            const secili = arabulucuId === k.id;
            return <Pressable key={k.id} accessibilityRole="radio" accessibilityState={{ selected: secili }} accessibilityLabel={k.ad}
              onPress={() => { hap("selection"); setArabulucuId(k.id); }}
              style={({ pressed }) => ({ minHeight: 52, flexDirection: yon(rtl), alignItems: "center", gap: 10, padding: 8, borderRadius: 8, borderWidth: secili ? 2 : 1, borderColor: secili ? C.goldBright : "rgba(201,162,78,0.35)", backgroundColor: pressed || secili ? "rgba(201,162,78,0.12)" : "rgba(14,10,6,0.55)" })}>
              <KisiYuzu id={k.id} ad={k.ad} boyut={36} oyuncu />
              <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchment, textAlign: hiza(rtl) }}>{k.ad}</Text>
              {secili ? <GameIcon name="check-circle" size={18} color={C.goldBright} /> : null}
            </Pressable>;
          }) : <Text style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.tp.arb.arabulucuYok")}</Text>}
          {hata ? <Bant metin={t(hataAnahtari(hata))} rtl={rtl} /> : null}
          <AltinDugme etiket={t("onl.tp.arb.davetGonder")} icon="scales" rtl={rtl} kapali={!arabulucuId || !arabulucuAdaylari.some((k) => k.id === arabulucuId)}
            bekliyor={toplum.bekliyor("arabuluculuk:yeni:ac")} onPress={() => { void arabuluculukBaslat(); }} />
        </View>
      </AltPanel>
      <AltPanel acik={!!onay} onKapat={() => { setOnay(null); setHata(null); }} etiket={onay ? t(`onl.tp.onay.${onay.tur}.${onay.islem}`) : ""} rtl={rtl} t={t}>
        {onay ? <View style={{ gap: 12 }}>
          <Madalyon icon={onay.tur === "engelle" ? "shield" : onay.tur === "husumet" ? "crossed-swords" : "family"} size={56} aktif />
          <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 19, color: C.parchment, textAlign: hiza(rtl) }}>{applyParams(t(`onl.tp.onay.${onay.tur}.${onay.islem}`), [p.ad])}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 15.5, lineHeight: 22, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t(`onl.tp.onay.${onay.tur}.${onay.islem}.d`)}</Text>
          {hata ? <Bant metin={t(hataAnahtari(hata))} rtl={rtl} /> : null}
          <AltinDugme etiket={t("onl.tp.onayla")} rtl={rtl}
            bekliyor={!!toplum.islem && (toplum.islem.startsWith(`husumet:${p.id}`) || toplum.islem.startsWith(`engelle:${p.id}`) || toplum.islem.startsWith(`dostluk:${p.id}`))}
            onPress={() => {
              if (onay.tur === "husumet") void sonuc(toplum.husumet(p.id, onay.islem as "ilan" | "kaldir"));
              else if (onay.tur === "engelle") void sonuc(toplum.engelle(p.id, onay.islem as "engelle" | "kaldir"));
              else void sonuc(toplum.dostluk(p.id, "bitir"));
            }} />
        </View> : null}
      </AltPanel>
      <AltPanel acik={sikayet} onKapat={() => setSikayet(false)} etiket={t("onl.tp.sk.panel")} rtl={rtl} t={t}>
        {sikayet ? <SikayetFormu p={p} toplum={toplum} onBitti={() => setSikayet(false)} /> : null}
      </AltPanel>
      <AltPanel acik={vitrin} onKapat={() => setVitrin(false)} etiket={t("onl.tp.vt.duzenle")} rtl={rtl} t={t}>
        {vitrin ? <VitrinDuzenle p={p} ay={ay} toplum={toplum} onBitti={() => setVitrin(false)} /> : null}
      </AltPanel>
    </>}>
    {ust}

    {/* Kimlik kartı */}
    <Animated.View entering={giris(60)} style={{ marginTop: 14 }}>
      <Cerceve ic={{ padding: 14, gap: 12 }}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 14 }}>
          <KisiYuzu id={p.id} ad={p.ad} boyut={84} yas={p.yas} cinsiyet={p.cinsiyet} oyuncu ben={p.ben} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 21, lineHeight: 27, color: C.parchment, textAlign: hiza(rtl) }}>{p.ad}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 16, color: "#F0D490", textAlign: hiza(rtl) }}>{applyParams(t("onl.ki.oyuncuYas"), [p.yas])}</Text>
            <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6, marginTop: 2 }}>
              {ana ? <Rozet icon="anvil" metin={`${t("onl.mes." + ana)} · ${kademeAdi(t, p.meslek.anaKademe)}`} renk={C.goldBright} /> : <Rozet icon="anvil" metin={t("onl.tp.meslekYok")} renk={C.parchmentMuted} />}
              {yan ? <Rozet metin={`${t("onl.tp.mg.yan")}: ${t("onl.mes." + yan)} · ${kademeAdi(t, p.meslek.yanKademe)}`} /> : null}
            </View>
          </View>
        </View>
        <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
          {p.hane.reis ? <Pressable accessibilityRole="link" accessibilityLabel={applyParams(t("onl.tp.hane"), [p.hane.reis.ad])} onPress={() => kisiyeGit(p.hane.reis!.id)} style={{ minHeight: 44, justifyContent: "center" }}>
            <Rozet icon="house" metin={applyParams(t("onl.tp.hane"), [p.hane.reis.ad])} />
          </Pressable> : <View style={{ minHeight: 44, justifyContent: "center" }}><Rozet icon="house" metin={t("onl.tp.haneYok")} /></View>}
          {p.mekan ? <View style={{ minHeight: 44, justifyContent: "center" }}><Rozet icon={MEKAN_IKON[p.mekan] ?? "house"} metin={applyParams(t("onl.ki.buAy"), [t("onl.mekan." + p.mekan)])} /></View> : null}
          <View style={{ minHeight: 44, justifyContent: "center" }}><Rozet icon="family" metin={applyParams(t("onl.tp.dostSayisi"), [p.dostSayisi])} /></View>
        </View>
        {durumlar.length ? <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
          {durumlar.map((d) => <Rozet key={d.metin} icon={d.icon} metin={d.metin} renk={d.renk} />)}
        </View> : null}
      </Cerceve>
    </Animated.View>

    {/* Eylemler (başkası) */}
    {!p.ben ? <>
      <Baslik2 metin={t("onl.tp.eylemler")} rtl={rtl} />
      {hata && !onay ? <View style={{ marginBottom: 8 }}><Bant metin={t(hataAnahtari(hata))} rtl={rtl} /></View> : null}
      <View style={{ gap: 8 }}>
        {dostluk && !p.engelledim ? (() => {
          const islem = dostluk.islem ?? "iste";
          const kapi = kapiMetni(t, "dostluk", dostluk.engel);
          if (islem === "bitir") return <EylemDugmesi icon="family" baslik={t("onl.tp.dostluk.bitir")} alt={t("onl.tp.dostluk.bitirAlt")} rtl={rtl} onPress={() => setOnay({ tur: "dostlukBitir", islem: "bitir" })} />;
          if (islem === "kabul") return <View style={{ flexDirection: yon(rtl), gap: 8 }}>
            <View style={{ flex: 1.4 }}><AltinDugme etiket={t("onl.tp.dostluk.kabul")} icon="family" rtl={rtl} bekliyor={toplum.bekliyor(`dostluk:${p.id}:kabul`)} onPress={() => { void sonuc(toplum.dostluk(p.id, "kabul")); }} /></View>
            <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.tp.dostluk.ret")} rtl={rtl} kapali={toplum.bekliyor(`dostluk:${p.id}:ret`)} onPress={() => { void sonuc(toplum.dostluk(p.id, "ret")); }} /></View>
          </View>;
          if (islem === "bekliyor") return <EylemDugmesi icon="hourglass" baslik={t("onl.tp.dostluk.bekliyor")} alt={t("onl.tp.dostluk.geriCek")} rtl={rtl} bekliyor={toplum.bekliyor(`dostluk:${p.id}:ret`)} onPress={() => { void sonuc(toplum.dostluk(p.id, "ret")); }} />;
          return <EylemDugmesi icon="family" baslik={t("onl.tp.dostluk.iste")} alt={kapi ?? t("onl.tp.dostluk.isteAlt")} kapali={!!kapi} rtl={rtl} bekliyor={toplum.bekliyor(`dostluk:${p.id}:iste`)} onPress={() => { void sonuc(toplum.dostluk(p.id, "iste")); }} />;
        })() : null}
        {!p.engelledim ? <>
          <EylemDugmesi icon="scroll-open" baslik={t("onl.tp.teklifVer")} alt={teklifKapi ?? t("onl.tp.teklifVerAlt")} kapali={teklifKapali} rtl={rtl} onPress={() => setForm(OYUNCU_TURLERI.find((x) => !eylem(`teklif.${x}`)?.engel && x !== "hediye") ?? "hediye")} />
          <EylemDugmesi icon="gems" baslik={t("onl.tp.armaganVer")} alt={hediyeKapi ?? applyParams(t("onl.tp.armaganVerAlt"), [TOPLUM_SINIR.hediyeEnCok])} kapali={!!hediyeKapi} rtl={rtl} onPress={() => setForm("hediye")} />
        </> : null}
        {husumet && !p.engelledim ? <EylemDugmesi icon="crossed-swords" tehlike={husumet.islem !== "kaldir"} baslik={t(husumet.islem === "kaldir" ? "onl.tp.husumet.kaldir" : "onl.tp.husumet.ilan")} alt={t(husumet.islem === "kaldir" ? "onl.tp.husumet.kaldirAlt" : "onl.tp.husumet.ilanAlt")} rtl={rtl} onPress={() => setOnay({ tur: "husumet", islem: husumet.islem ?? "ilan" })} /> : null}
        {(p.husumet.benIlanEttim || p.husumet.oIlanEtti) && !p.engelledim ? <EylemDugmesi icon="scales" baslik={t("onl.tp.arb.baslat")} alt={t("onl.tp.arb.baslatAlt")} rtl={rtl} onPress={() => { setHata(null); setArabulucuAcik(true); }} /> : null}
        {engel ? <EylemDugmesi icon="shield" tehlike={engel.islem !== "kaldir"} baslik={t(engel.islem === "kaldir" ? "onl.tp.engel.kaldir" : "onl.tp.engel.engelle")} alt={t(engel.islem === "kaldir" ? "onl.tp.engel.kaldirAlt" : "onl.tp.engel.engelleAlt")} rtl={rtl} onPress={() => setOnay({ tur: "engelle", islem: engel.islem ?? "engelle" })} /> : null}
        {eylem("sikayet") ? <EylemDugmesi icon="scales" tehlike baslik={t("onl.tp.sk.panel")} alt={t("onl.tp.sk.kisa")} rtl={rtl} onPress={() => setSikayet(true)} /> : null}
      </View>
    </> : <>
      <GelenKutusuKarti ust={14} />
    </>}

    {/* Teveccüh */}
    <Baslik2 metin={t("onl.tp.tv.baslik")} rtl={rtl} />
    <Teveccuh p={p} rtl={rtl} t={t} lang={lang} />

    {/* Armağan vitrini */}
    <Baslik2 metin={t("onl.tp.vt.baslik")} rtl={rtl} sag={p.ben ? <Pressable accessibilityRole="button" accessibilityLabel={t("onl.tp.vt.duzenle")} onPress={() => { hap("tap"); setVitrin(true); }} style={{ minHeight: 44, minWidth: 44, justifyContent: "center", paddingHorizontal: 4 }}>
      <Text style={{ fontFamily: F.display, fontSize: 11.5, color: C.goldBright, textDecorationLine: "underline" }}>{t("onl.tp.vt.duzenleKisa")}</Text>
    </Pressable> : undefined} />
    {p.vitrin.length ? <Cerceve ic={{ paddingVertical: 2 }}>
      {p.vitrin.map((a, i) => <View key={a.id} style={{ borderTopWidth: i ? 1 : 0, borderColor: "rgba(201,162,78,0.12)" }}><VitrinSatiri a={a} ay={ay} rtl={rtl} t={t} /></View>)}
    </Cerceve> : <BosKart icon="gems" metin={t(p.ben ? "onl.tp.vt.bosBen" : "onl.tp.vt.bos")} rtl={rtl} />}

    {/* Mesleki geçmiş */}
    <Baslik2 metin={t(p.ben ? "onl.tp.mg.baslikBen" : "onl.tp.mg.baslik")} rtl={rtl} />
    <MeslekiGecmis p={p} rtl={rtl} t={t} onMeslek={(m) => router.push(`/online/beceri-agaci?meslek=${m}`)} />

    {/* Nam */}
    <Baslik2 metin={t("onl.ka.nam")} rtl={rtl} />
    <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 8 }}>
      {NAMLAR.map((n) => <View key={n} accessible accessibilityLabel={`${t("onl.nam." + n)}: ${p.nam[n] ?? 0}`}
        style={{ flexGrow: 1, flexBasis: "45%", flexDirection: yon(rtl), alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 44, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,162,78,0.3)", backgroundColor: "rgba(14,10,6,0.7)" }}>
        <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.serif, fontSize: 15, color: C.parchmentDim }}>{t("onl.nam." + n)}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 15, color: (p.nam[n] ?? 0) > 0 ? C.goldBright : C.parchmentMuted }}>{p.nam[n] ?? 0}</Text>
      </View>)}
    </View>

    {/* Ortak tanıdıklar */}
    {!p.ben ? <>
      <Baslik2 metin={applyParams(t("onl.tp.ortak"), [p.ortakTanidiklar.length])} rtl={rtl} />
      {p.ortakTanidiklar.length ? <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 8 }}>
        {p.ortakTanidiklar.map((k) => <Pressable key={k.id} accessibilityRole="link" accessibilityLabel={k.ad} onPress={() => kisiyeGit(k.id)}
          style={({ pressed }) => ({ minHeight: 44, flexDirection: yon(rtl), alignItems: "center", gap: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 24, borderWidth: 1, borderColor: "rgba(201,162,78,0.45)", backgroundColor: pressed ? "rgba(201,162,78,0.18)" : "rgba(14,10,6,0.72)" })}>
          <KisiYuzu id={k.id} ad={k.ad} boyut={32} oyuncu={k.id.startsWith("o")} />
          <Text numberOfLines={1} style={{ maxWidth: 150, fontFamily: F.serif, fontSize: 14.5, color: C.parchment }}>{k.ad}</Text>
        </Pressable>)}
      </View> : <BosKart icon="family" metin={t("onl.tp.ortakYok")} rtl={rtl} />}
    </> : null}

    {/* Açık husumetler (meydanda ilan edilir) */}
    {p.husumetler.length ? <>
      <Baslik2 metin={t("onl.tp.hu.baslik")} rtl={rtl} />
      <Cerceve ic={{ paddingVertical: 2 }}>
        {p.husumetler.map((h, i) => <Pressable key={h.id + h.yon} accessibilityRole="link" accessibilityLabel={applyParams(t("onl.tp.hu." + h.yon), [h.ad])} onPress={() => kisiyeGit(h.id)}
          style={{ minHeight: 44, flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderColor: "rgba(201,162,78,0.12)" }}>
          <GameIcon name="crossed-swords" size={15} color={C.ember} />
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.tp.hu." + h.yon), [h.ad])}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentMuted }}>{ayFarki(t, h.ay, ay)}</Text>
        </Pressable>)}
      </Cerceve>
    </> : null}
  </OnlineSayfa>;
}

const OYUNCU_TURLERI: readonly OyuncuTeklifTuru[] = ["cirak", "ortak", "borc", "hediye", "gorucu"];

export default function OnlineOyuncu() {
  return onlineEkranAcik() ? <OnlineKapisi><OyuncuEkran /></OnlineKapisi> : <OnlineYakinda />;
}
