// İşletme paneli (Faz 12–13; GET /v1/isletme/:id, GET .../devir, POST .../{yatir|cek|emanet|ad|tezyin|fiyat|kapi|personel|devir}).
// Konuma ve yetkiye göre: kasa (yatır/çek, emanet, muhasebe), ayarlar (ad, tezyin, fiyat çarpanı, kapı), personel
// (sözleşme, yetki, maaş, işe alım, çıkarma, istifa) ve devir (önizleme, teklif, kabul). Dışarıdan bakan yalnız vitrini
// görür. Kasa, gelir dökümü, kalite ve devir sürümü sunucudan gelir; her yazmadan sonra panel yeniden okunur.
import { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useI18n, applyParams } from "../../../lib/i18n";
import { C, F } from "../../../lib/theme";
import { GameIcon } from "../../../lib/icons";
import { DesignPressable as Pressable } from "../../../lib/design-pressable";
import { hap } from "../../../lib/haptics";
import { OnlineYakinda } from "../../../lib/online-yakinda";
import { OnlineKapisi, useOnline } from "../../../lib/online/durum";
import { onlineEkranAcik } from "../../../lib/online/kapi";
import { AltinDugme, Bant, Cerceve, CizgiDugme, GeriDugme, Madalyon, ONL, geriGit, hiza, yon } from "../../../lib/online/ui";
import { Baslik2, BosKart, Hap, OnlineSayfa, Rozet, SayfaBasi, YerlesimBekle, Yukleniyor, sahneGorseli } from "../../../lib/online/yasam-ui";
import { Sayac, Secenekler } from "../../../lib/online/toplum-ui";
import { ekHataAnahtari, type EkHata } from "../../../lib/online/ek-istemci";
import { istekNoUret } from "../../../lib/online/depo";
import {
  MULK_IKON, ROLLER, SINIR, TEZYIN, TEZYIN_GRUPLARI, YETKILER, useMulkIstemci,
  type DevirOnizleme, type IsletmeKomutu, type PanelYaniti, type Rol, type SozlesmeGorunumu, type TezyinGrubu, type Yetki,
} from "../../../lib/online/mulk-veri";

type Ceviri = (k: string) => string;
type Bolum = "kasa" | "ayar" | "personel" | "devir";

function Satir({ etiket, deger, renk = C.parchment, rtl }: { etiket: string; deger: string; renk?: string; rtl: boolean }) {
  return <View style={{ flexDirection: yon(rtl), justifyContent: "space-between", alignItems: "center", gap: 8, minHeight: 26 }}>
    <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{etiket}</Text>
    <Text style={{ fontFamily: F.display, fontSize: 14, color: renk }}>{deger}</Text>
  </View>;
}

function Not({ metin, rtl }: { metin: string; rtl: boolean }) {
  return <Text style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{metin}</Text>;
}

function DevirKarti({ d, t, rtl }: { d: DevirOnizleme; t: Ceviri; rtl: boolean }) {
  const ak = (n: number) => applyParams(t("onl.is.akce"), [n]);
  return <Cerceve ic={{ padding: 12, gap: 4 }}>
    <Satir etiket={t("onl.isl.kasa")} deger={ak(d.kasa)} rtl={rtl} />
    <Satir etiket={t("onl.isl.emanet")} deger={ak(d.emanet)} rtl={rtl} />
    <Satir etiket={t("onl.isl.borc")} deger={d.borc ? `${ak(d.borc)} · ${applyParams(t("onl.isl.borcAy"), [d.borcAy, d.iflasEsigi])}` : "—"} renk={d.borc ? C.ember : C.parchment} rtl={rtl} />
    <Satir etiket={t("onl.isl.maasYuku")} deger={ak(d.maasYuku)} rtl={rtl} />
    <Satir etiket={t("onl.isl.sozlesmeler")} deger={String(d.sozlesmeler.length)} rtl={rtl} />
    <Satir etiket={t("onl.isl.sicil")} deger={String(d.sicil)} renk={d.sicil ? C.ember : C.sage} rtl={rtl} />
    <Satir etiket={t("onl.isl.seviye")} deger={`${t("onl.isl.sv." + d.seviye)} · ${applyParams(t("onl.isl.itibarN"), [d.itibar])}`} rtl={rtl} />
    <Not metin={t("onl.isl.devirNot")} rtl={rtl} />
  </Cerceve>;
}

function SozlesmeKarti({ s, t, rtl, sahip, yonetici, bekliyor, onKomut }: { s: SozlesmeGorunumu; t: Ceviri; rtl: boolean; sahip: boolean; yonetici: boolean; bekliyor: boolean; onKomut: (g: Record<string, unknown>) => void }) {
  const [maas, setMaas] = useState(s.maas);
  return <Cerceve ic={{ padding: 12, gap: 8 }}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
      <Madalyon icon={s.calisan.tur === "npc" ? "hood" : "family"} size={38} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 14.5, color: C.parchment, textAlign: hiza(rtl) }}>{s.calisan.ad}</Text>
        <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim, textAlign: hiza(rtl) }}>
          {`${t("onl.isl.rol." + s.rol)} · ${t("onl.kd." + ["cirak", "kalfa", "usta", "pir"][Math.max(0, Math.min(3, s.kademe))])} · ${applyParams(t("onl.isl.maasAy"), [s.maas])}`}
        </Text>
      </View>
    </View>
    <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
      {YETKILER.filter((y) => sahip || s.yetkiler.includes(y)).map((y) => {
        const var_ = s.yetkiler.includes(y);
        const yasak = y === "vekalet" && s.calisan.tur === "npc";
        return <Pressable key={y} disabled={!sahip || yasak} accessibilityRole="switch" accessibilityState={{ checked: var_, disabled: !sahip || yasak }} accessibilityLabel={t("onl.isl.y." + y)}
          onPress={() => { hap("selection"); onKomut({ islem: "yetki", sozlesme: s.no, yetki: y, ver: !var_, ...(y === "vekalet" && !var_ ? { sure: 3 } : {}) }); }}
          style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 10, borderRadius: 22, borderWidth: var_ ? 1.5 : 1, borderColor: var_ ? C.sage : "rgba(201,162,78,0.35)", backgroundColor: var_ ? "rgba(52,72,38,0.45)" : "rgba(14,10,6,0.6)", opacity: yasak ? 0.4 : 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 12, color: var_ ? C.parchment : C.parchmentMuted }}>{t("onl.isl.y." + y)}</Text>
        </Pressable>;
      })}
    </View>
    {s.vekaletBitis !== null ? <Not metin={applyParams(t("onl.isl.vekaletBitis"), [s.vekaletBitis])} rtl={rtl} /> : null}
    {yonetici ? <>
      <Sayac etiket={t("onl.isl.maas")} deger={maas} en={s.calisan.tur === "oyuncu" ? s.maas : SINIR.maasEnAz} cok={SINIR.maasEnCok} onDegis={setMaas} />
      <View style={{ flexDirection: yon(rtl), gap: 8 }}>
        <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.isl.maasKaydet")} icon="coins" rtl={rtl} kucuk kapali={maas === s.maas || bekliyor} onPress={() => onKomut({ islem: "maas", sozlesme: s.no, maas })} /></View>
        <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.isl.cikar")} icon="walk" rtl={rtl} kucuk kapali={bekliyor} onPress={() => onKomut({ islem: "cikar", sozlesme: s.no })} /></View>
      </View>
      <Not metin={applyParams(t("onl.isl.tazminatNot"), [s.maas])} rtl={rtl} />
    </> : null}
  </Cerceve>;
}

function IsletmeEkran() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const o = useOnline();
  const ist = useMulkIstemci();
  const y = o.yerlesim;
  const sahte = o.oturum?.tur === "gelistirici";
  const prm = useLocalSearchParams<{ id?: string; devir?: string; teklif?: string }>();
  const id = typeof prm.id === "string" && prm.id ? decodeURIComponent(prm.id) : sahte && y ? `${y.yerlesim.id}.han.1` : "";
  const [p, setP] = useState<PanelYaniti | null>(null);
  const [dv, setDv] = useState<DevirOnizleme | null>(null);
  const [yukHata, setYukHata] = useState<EkHata | null>(null);
  const [bolum, setBolum] = useState<Bolum>("kasa");
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const [tutar, setTutar] = useState(10);
  const [ad, setAd] = useState("");
  const [carpan, setCarpan] = useState<number | null>(null);
  const [isAl, setIsAl] = useState<{ hedef: string | null; rol: Rol; maas: number }>({ hedef: null, rol: "garson", maas: 5 });
  const [devirF, setDevirF] = useState<{ alici: string | null; fiyat: number }>({ alici: null, fiyat: 100 });

  const yukle = useCallback(async () => {
    if (!id) { setYukHata("isletme_yok"); return; }
    const [a, b] = await Promise.all([ist.panel(id), ist.devir(id)]);
    if (a.ok) { setP(a.deger); setYukHata(null); setCarpan(a.deger.isletme.fiyatCarpani); } else setYukHata(a.hata);
    setDv(b.ok ? b.deger : null);
  }, [ist, id]);
  useEffect(() => { void yukle(); }, [yukle]);
  if (!y) return <YerlesimBekle rtl={rtl} t={t} onGiris={() => router.replace("/online")} />;

  const komut = async (k: IsletmeKomutu, govde: Record<string, unknown>, basari?: string) => {
    setBekliyor(true); setHata(null); setBilgi(null);
    const r = await ist.komut(id, k, { ...govde, istekNo: istekNoUret() });
    setBekliyor(false);
    if (r.ok) {
      hap("success");
      setBilgi(r.deger.transferDurumu === "bekliyor" ? t("onl.isl.transferBekliyor") : basari ?? t("onl.isl.kaydedildi"));
      await yukle();
      if (!sahte) void o.yerlesimYukle(true);
    } else { hap("error"); setHata(t(ekHataAnahtari(r.hata))); }
  };

  const ak = (n: number) => applyParams(t("onl.is.akce"), [n]);
  const is = p?.isletme;
  const konum = p?.konum ?? null;
  const sahip = konum === "sahip";
  const yonetici = sahip || konum === "vekil";
  const yetki = (x: Yetki) => !!p?.yetkiler.includes(x);
  const adaylar = y.ben.tanidiklar.slice(0, 10);
  const oyuncuAdaylar = adaylar.filter((x) => x.oyuncu);
  const bolumler: Bolum[] = konum ? ["kasa", "ayar", "personel", ...(sahip ? ["devir" as const] : [])] : [];

  const ust = is ? <Cerceve aktif={is.durum === "acik" && is.kapi} ic={{ padding: 12, gap: 10 }}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
      <Madalyon icon={MULK_IKON[is.tur]} size={50} aktif={is.durum === "acik"} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: 17, lineHeight: 22, color: C.parchment, textAlign: hiza(rtl) }}>{is.ad || t("onl.mk.tur." + is.tur)}</Text>
        <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 13.5, color: C.parchmentDim, textAlign: hiza(rtl) }}>{`${t("onl.mk.tur." + is.tur)} · ${applyParams(t("onl.isl.sahibi"), [is.sahip.ad])}`}</Text>
      </View>
    </View>
    <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
      <Rozet icon="trophy" metin={t("onl.isl.sv." + is.seviye.ad)} renk={C.goldBright} dolu={is.seviye.sira >= 2} />
      <Rozet icon="star" metin={applyParams(t("onl.isl.itibarN"), [is.itibar])} />
      <Rozet icon="house" metin={applyParams(t("onl.isl.kapasiteN"), [is.kapasite])} />
      <Rozet icon={is.kapi ? "flame" : "shield"} metin={t(is.durum === "iflas" ? "onl.isl.iflas" : is.kapi ? "onl.isl.kapiAcik" : "onl.isl.kapiKapali")} renk={is.durum === "iflas" ? C.blood : is.kapi ? C.sage : C.ember} />
      {konum ? <Rozet icon="crown" metin={t("onl.isl.konum." + konum)} renk={C.gold} /> : null}
    </View>
    <Not metin={applyParams(t("onl.isl.seviyeDokum"), [is.seviye.puan, is.seviye.dokum.itibar, is.seviye.dokum.faaliyet, is.seviye.dokum.gelir, is.seviye.sonrakiEsik ?? "—"])} rtl={rtl} />
  </Cerceve> : null;

  const kasa = is && konum ? <View style={{ gap: 10 }}>
    {is.kasa !== undefined ? <Cerceve ic={{ padding: 12, gap: 4 }}>
      <Satir etiket={t("onl.isl.kasa")} deger={ak(is.kasa)} renk={C.goldBright} rtl={rtl} />
      <Satir etiket={t("onl.isl.emanet")} deger={ak(is.emanet ?? 0)} rtl={rtl} />
      <Satir etiket={t("onl.isl.borc")} deger={is.borc ? `${ak(is.borc)} · ${applyParams(t("onl.isl.borcAy"), [is.borcAy ?? 0, 3])}` : "—"} renk={is.borc ? C.ember : C.parchment} rtl={rtl} />
      <Satir etiket={t("onl.isl.maasYuku")} deger={ak(is.maasYuku ?? 0)} rtl={rtl} />
      <Satir etiket={t("onl.isl.bakim")} deger={ak(is.bakim ?? 0)} rtl={rtl} />
    </Cerceve> : <BosKart icon="coins" metin={t("onl.isl.kasaGizli")} rtl={rtl} />}
    {is.npcGeliri ? <Cerceve ic={{ padding: 12, gap: 4 }}>
      <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 1.2, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.isl.npcGeliri")}</Text>
      <Satir etiket={t("onl.isl.g.taban")} deger={ak(is.npcGeliri.taban)} rtl={rtl} />
      <Satir etiket={t("onl.isl.g.itibar")} deger={`+%${is.npcGeliri.itibarYuzde}`} rtl={rtl} />
      <Satir etiket={t("onl.isl.g.kalite")} deger={`+%${is.npcGeliri.kaliteYuzde}`} rtl={rtl} />
      <Satir etiket={t("onl.isl.g.teveccuh")} deger={`${is.npcGeliri.teveccuhYuzde >= 0 ? "+" : ""}%${is.npcGeliri.teveccuhYuzde}`} rtl={rtl} />
      <Satir etiket={t("onl.isl.g.tavan")} deger={ak(is.npcGeliri.tavan)} rtl={rtl} />
      <Satir etiket={t("onl.isl.g.aylik")} deger={ak(is.npcGeliri.tutar)} renk={C.sage} rtl={rtl} />
    </Cerceve> : null}
    {sahip || yetki("kasa") || yonetici ? <Cerceve ic={{ padding: 12, gap: 10 }}>
      <Sayac etiket={t("onl.isl.tutar")} deger={tutar} en={1} cok={SINIR.transferEnCok} adim={5} onDegis={setTutar} />
      <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 8 }}>
        {sahip ? <View style={{ flexBasis: "47%", flexGrow: 1 }}><CizgiDugme etiket={t("onl.isl.yatir")} icon="coins" rtl={rtl} kucuk kapali={bekliyor} onPress={() => { void komut("yatir", { tutar }); }} /></View> : null}
        {yetki("kasa") ? <View style={{ flexBasis: "47%", flexGrow: 1 }}><CizgiDugme etiket={t("onl.isl.cek")} icon="backpack" rtl={rtl} kucuk kapali={bekliyor} onPress={() => { void komut("cek", { tutar }); }} /></View> : null}
        {yonetici ? <View style={{ flexBasis: "47%", flexGrow: 1 }}><CizgiDugme etiket={t("onl.isl.emanetKoy")} icon="shield" rtl={rtl} kucuk kapali={bekliyor} onPress={() => { void komut("emanet", { yon: "koy", tutar }); }} /></View> : null}
        {yonetici ? <View style={{ flexBasis: "47%", flexGrow: 1 }}><CizgiDugme etiket={t("onl.isl.emanetAl")} icon="shield" rtl={rtl} kucuk kapali={bekliyor} onPress={() => { void komut("emanet", { yon: "al", tutar }); }} /></View> : null}
      </View>
      {is.cekim ? <Not metin={applyParams(t("onl.isl.cekimNot"), [is.cekim.bugun, is.cekim.tavan])} rtl={rtl} /> : null}
      <Not metin={t("onl.isl.emanetNot")} rtl={rtl} />
    </Cerceve> : null}
    {is.defter?.length ? <>
      <Baslik2 metin={t("onl.isl.muhasebe")} rtl={rtl} ust={8} />
      <Cerceve ic={{ paddingHorizontal: 12, paddingVertical: 4 }}>
        {[...is.defter].reverse().slice(0, 14).map(([a, kalem, tt], i) => <View key={i} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, minHeight: 36, borderTopWidth: i ? 1 : 0, borderColor: "rgba(201,162,78,0.12)" }}>
          <Text style={{ width: 44, fontFamily: F.display, fontSize: 11.5, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{applyParams(t("onl.isl.ayN"), [a])}</Text>
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.serif, fontSize: 14, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.isl.df." + kalem)}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 13.5, color: tt > 0 ? C.sage : tt < 0 ? C.ember : C.parchmentMuted }}>{tt > 0 ? `+${tt}` : tt < 0 ? `−${-tt}` : "·"}</Text>
        </View>)}
      </Cerceve>
    </> : null}
  </View> : null;

  const ayar = is && konum ? <View style={{ gap: 10 }}>
    {sahip ? <Cerceve ic={{ padding: 12, gap: 8 }}>
      <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 1.2, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.isl.ad")}</Text>
      <TextInput value={ad} onChangeText={setAd} maxLength={SINIR.adEnUzun} placeholder={is.ad || t("onl.isl.adYer")} placeholderTextColor={C.parchmentMuted} accessibilityLabel={t("onl.isl.ad")}
        style={{ minHeight: 48, borderRadius: 8, borderWidth: 1, borderColor: ONL.frame, paddingHorizontal: 12, fontFamily: F.serif, fontSize: 16, color: C.parchment, backgroundColor: "rgba(14,10,6,0.7)", textAlign: hiza(rtl) }} />
      <Not metin={applyParams(t("onl.isl.adNot"), [SINIR.adEnKisa, SINIR.adEnUzun, is.adUcretsizKalan ?? 0])} rtl={rtl} />
      <CizgiDugme etiket={t("onl.isl.adKaydet")} icon="scroll" rtl={rtl} kucuk kapali={bekliyor || [...ad.trim()].length < SINIR.adEnKisa} onPress={() => { void komut("ad", { ad: ad.trim() }); }} />
    </Cerceve> : null}
    {yonetici ? <Cerceve ic={{ padding: 12, gap: 10 }}>
      <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 1.2, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.isl.tezyin")}</Text>
      {TEZYIN_GRUPLARI.map((g: TezyinGrubu) => {
        const katalog = TEZYIN[g] as Record<string, { fiyat: number; itibar: number }>;
        return <View key={g} style={{ gap: 6 }}>
          <Text style={{ fontFamily: F.serif, fontSize: 14, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.isl.tz." + g)}</Text>
          <Secenekler secenekler={Object.keys(katalog)} secili={is.tezyin[g] ?? null} onSec={(sc) => { void komut("tezyin", { grup: g, secim: sc }); }}
            etiket={(sc) => `${t("onl.isl.tz." + sc)} · ${katalog[sc].fiyat}`} kilit={() => (bekliyor ? t("onl.isl.bekle") : null)} />
        </View>;
      })}
      <Not metin={applyParams(t("onl.isl.tezyinNot"), [is.tezyinKalan ?? 0])} rtl={rtl} />
    </Cerceve> : null}
    {yetki("fiyat") ? <Cerceve ic={{ padding: 12, gap: 8 }}>
      <Sayac etiket={t("onl.isl.fiyatCarpani")} deger={carpan ?? is.fiyatCarpani} en={SINIR.fiyatEnAz} cok={SINIR.fiyatEnCok} adim={5} birim="%" onDegis={setCarpan} />
      <CizgiDugme etiket={t("onl.isl.fiyatKaydet")} icon="scales" rtl={rtl} kucuk kapali={bekliyor || carpan === is.fiyatCarpani} onPress={() => { void komut("fiyat", { carpan }); }} />
    </Cerceve> : null}
    {yetki("musteri") ? <Cerceve ic={{ padding: 12, gap: 8 }}>
      <Not metin={t(is.kapi ? "onl.isl.kapiAcikNot" : "onl.isl.kapiKapaliNot")} rtl={rtl} />
      <CizgiDugme etiket={t(is.kapi ? "onl.isl.kapiKapat" : "onl.isl.kapiAc")} icon={is.kapi ? "shield" : "flame"} rtl={rtl} kucuk kapali={bekliyor} onPress={() => { void komut("kapi", { acik: !is.kapi }); }} />
    </Cerceve> : null}
    {!yonetici && !yetki("fiyat") && !yetki("musteri") ? <BosKart icon="shield" metin={t("onl.isl.yetkiYok")} rtl={rtl} /> : null}
  </View> : null;

  const personel = is && konum ? <View style={{ gap: 10 }}>
    {is.kalite ? <Cerceve ic={{ padding: 12, gap: 4 }}>
      <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 1.2, color: C.goldBright, textAlign: hiza(rtl) }}>{applyParams(t("onl.isl.kalite"), [is.kalite.toplam])}</Text>
      {is.kalite.dokum.map((d) => <Satir key={d.rol} etiket={`${t("onl.isl.rol." + d.rol)} · ${t("onl.isl.kaynak." + d.kaynak)}`} deger={t("onl.kd." + ["cirak", "kalfa", "usta", "pir"][Math.max(0, Math.min(3, d.kademe))])} rtl={rtl} />)}
    </Cerceve> : null}
    {(is.personel ?? []).length ? (is.personel ?? []).map((s) => <SozlesmeKarti key={s.no} s={s} t={t} rtl={rtl} sahip={sahip} yonetici={yonetici} bekliyor={bekliyor} onKomut={(g) => { void komut("personel", g); }} />)
      : <BosKart icon="family" metin={t("onl.isl.personelYok")} rtl={rtl} />}
    {is.teklifler?.length ? <Cerceve ic={{ padding: 12, gap: 4 }}>
      <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 1.2, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.isl.bekleyenTeklif")}</Text>
      {is.teklifler.map((x) => <Satir key={x.n} etiket={`${x.hedef.ad} · ${t("onl.isl.rol." + x.r)}`} deger={applyParams(t("onl.isl.maasAy"), [x.m])} rtl={rtl} />)}
    </Cerceve> : null}
    {yonetici ? <Cerceve ic={{ padding: 12, gap: 10 }}>
      <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 1.2, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.isl.iseAl")}</Text>
      {adaylar.length ? <Secenekler secenekler={adaylar.map((a) => a.id)} secili={isAl.hedef} onSec={(h) => setIsAl({ ...isAl, hedef: h })} etiket={(h) => adaylar.find((a) => a.id === h)?.ad ?? h} ikon={(h) => (adaylar.find((a) => a.id === h)?.oyuncu ? "family" : "hood")} />
        : <BosKart icon="family" metin={t("onl.isl.adayYok")} rtl={rtl} />}
      <Secenekler secenekler={ROLLER} secili={isAl.rol} onSec={(r) => setIsAl({ ...isAl, rol: r })} etiket={(r) => t("onl.isl.rol." + r)} />
      <Sayac etiket={t("onl.isl.maas")} deger={isAl.maas} en={SINIR.maasEnAz} cok={SINIR.maasEnCok} onDegis={(m) => setIsAl({ ...isAl, maas: m })} />
      <Not metin={t("onl.isl.iseAlNot")} rtl={rtl} />
      <AltinDugme etiket={t(isAl.hedef && adaylar.find((a) => a.id === isAl.hedef)?.oyuncu ? "onl.isl.teklifGonder" : "onl.isl.npcAl")} icon="medal" rtl={rtl} kapali={!isAl.hedef} bekliyor={bekliyor}
        onPress={() => { const oy = !!adaylar.find((a) => a.id === isAl.hedef)?.oyuncu; void komut("personel", { islem: oy ? "teklif" : "npc", hedef: isAl.hedef, rol: isAl.rol, maas: isAl.maas }); }} />
    </Cerceve> : null}
    {konum !== "sahip" ? <CizgiDugme etiket={t("onl.isl.istifa")} icon="walk" rtl={rtl} kucuk kapali={bekliyor} onPress={() => { void komut("personel", { islem: "istifa" }); }} /> : null}
  </View> : null;

  const devir = sahip ? <View style={{ gap: 10 }}>
    {dv ? <DevirKarti d={dv} t={t} rtl={rtl} /> : <Yukleniyor metin={t("onl.isl.yukleniyor")} />}
    <Cerceve ic={{ padding: 12, gap: 10 }}>
      <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 1.2, color: C.goldBright, textAlign: hiza(rtl) }}>{t("onl.isl.devirTeklif")}</Text>
      {oyuncuAdaylar.length ? <Secenekler secenekler={oyuncuAdaylar.map((a) => a.id)} secili={devirF.alici} onSec={(h) => setDevirF({ ...devirF, alici: h })} etiket={(h) => oyuncuAdaylar.find((a) => a.id === h)?.ad ?? h} ikon={() => "family"} />
        : <BosKart icon="family" metin={t("onl.isl.aliciYok")} rtl={rtl} />}
      <Sayac etiket={t("onl.isl.devirFiyat")} deger={devirF.fiyat} en={0} cok={SINIR.transferEnCok} adim={10} onDegis={(n) => setDevirF({ ...devirF, fiyat: n })} />
      <AltinDugme etiket={t("onl.isl.devirGonder")} icon="scroll-open" rtl={rtl} kapali={!devirF.alici} bekliyor={bekliyor} onPress={() => { void komut("devir", { islem: "teklif", alici: devirF.alici, fiyat: devirF.fiyat }); }} />
      <CizgiDugme etiket={t("onl.isl.devirGeri")} icon="scroll" rtl={rtl} kucuk kapali={bekliyor} onPress={() => { void komut("devir", { islem: "geri" }); }} />
    </Cerceve>
  </View> : null;

  return <OnlineSayfa gorsel={sahneGorseli(y.yerlesim.tur, y.saat.mevsim)} oran={0.3} rtl={rtl} t={t}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 6 }}>
      <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/mulk")} />
      <View style={{ flex: 1 }} />
      <Hap icon="coins" metin={String(y.ben.para)} erisim={applyParams(t("onl.ya.paraErisim"), [y.ben.para])} />
    </View>
    <View style={{ marginTop: 8, marginBottom: 12 }}>
      <SayfaBasi ust={y.yerlesim.ad} baslik={t("onl.isl.baslik")} alt={t(konum ? "onl.isl.alt" : "onl.isl.altVitrin")} rtl={rtl} />
    </View>
    {yukHata && !p ? <Bant metin={t(ekHataAnahtari(yukHata))} rtl={rtl} eylem={t("onl.yenidenDene")} onEylem={() => { void yukle(); }} />
      : !p ? <Yukleniyor metin={t("onl.isl.yukleniyor")} /> : <>
        {ust}
        {bilgi ? <View style={{ marginTop: 10 }}><Bant metin={bilgi} rtl={rtl} tur="bilgi" /></View> : null}
        {hata ? <View style={{ marginTop: 10 }}><Bant metin={hata} rtl={rtl} /></View> : null}
        {!konum ? <View style={{ marginTop: 12, gap: 10 }}>
          {prm.teklif ? <Cerceve aktif ic={{ padding: 12, gap: 8 }}>
            <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.isl.isTeklifi")}</Text>
            <View style={{ flexDirection: yon(rtl), gap: 8 }}>
              <View style={{ flex: 1 }}><AltinDugme etiket={t("onl.isl.kabul")} icon="medal" rtl={rtl} bekliyor={bekliyor} onPress={() => { void komut("personel", { islem: "kabul" }); }} /></View>
              <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.isl.red")} rtl={rtl} kapali={bekliyor} onPress={() => { void komut("personel", { islem: "red" }); }} /></View>
            </View>
          </Cerceve> : null}
          {prm.devir && dv ? <>
            <Baslik2 metin={t("onl.isl.devirOnizleme")} rtl={rtl} ust={4} />
            <DevirKarti d={dv} t={t} rtl={rtl} />
            <AltinDugme etiket={t("onl.isl.devirKabul")} icon="crown" rtl={rtl} bekliyor={bekliyor} onPress={() => { void komut("devir", { islem: "kabul", surum: dv.surum }, t("onl.isl.devirAlindi")); }} />
          </> : null}
          {!prm.teklif && !prm.devir ? <BosKart icon="house" metin={t("onl.isl.vitrinNot")} rtl={rtl} /> : null}
        </View> : <>
          <View accessibilityRole="tablist" style={{ flexDirection: yon(rtl), gap: 6, marginTop: 14, marginBottom: 12 }}>
            {bolumler.map((b) => <Pressable key={b} accessibilityRole="tab" accessibilityState={{ selected: bolum === b }} accessibilityLabel={t("onl.isl.b." + b)} onPress={() => { hap("selection"); setBolum(b); setHata(null); setBilgi(null); }}
              style={{ flex: 1, minHeight: 44, borderRadius: 8, borderWidth: bolum === b ? 1.5 : 1, borderColor: bolum === b ? C.goldBright : "rgba(201,162,78,0.35)", backgroundColor: bolum === b ? "rgba(201,162,78,0.2)" : "rgba(14,10,6,0.7)", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontFamily: F.display, fontSize: 12.5, color: bolum === b ? C.parchment : C.parchmentDim }}>{t("onl.isl.b." + b)}</Text>
            </Pressable>)}
          </View>
          {bolum === "kasa" ? kasa : bolum === "ayar" ? ayar : bolum === "personel" ? personel : devir}
        </>}
        <View style={{ marginTop: 18, flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
          <GameIcon name="scroll" size={14} color={C.parchmentMuted} />
          <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.isl.kural")}</Text>
        </View>
      </>}
  </OnlineSayfa>;
}

export default function OnlineIsletme() {
  return onlineEkranAcik() ? <OnlineKapisi><IsletmeEkran /></OnlineKapisi> : <OnlineYakinda />;
}
