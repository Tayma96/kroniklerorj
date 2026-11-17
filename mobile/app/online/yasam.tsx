// Çevrimiçi yaşam (ana sayfa, Faz 2c; düzen tek oyunculu ana sayfayla aynı: sahne, kimlik, paneller, defter satırı): Dönüş Kartı (en çok 5, tanıdıklar önce), açık gerilimler, takat, öğrenme
// dönemi şeridi (6 gün; bugünün hedefi ve ödülü, tamam/kaçan günler), "Şimdi" rehberi, gelen kutusu ve yerleşim defteri.
// Mekânlar Sokak, geçim İşim, insanlar Çevrem, karakter Ben sekmesindedir; burada bağlantı ızgarası yoktur.
// Veri sunucudan (GET /v1/yerlesim, /v1/olaylar); tek oyunculu motor ya da kayıt okunmaz.
import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../../lib/i18n";
import type { Lang } from "../../lib/locale-data";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { hap } from "../../lib/haptics";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { Bant, CizgiDugme, Madalyon, ONL, giris, hiza, yon } from "../../lib/online/ui";
import { kisiYolu } from "../../lib/online/toplum-veri";
import { GelenKutusuKarti } from "../../lib/online/toplum-ui";
import {
  AltMenu, AltPanel, GorusOlcegi, KisiYuzu, MENU_YUKSEKLIK, OgrenmeSeridi, Rozet, SatirOku, TakatGostergesi, YerlesimBekle,
  gorusRengi, gunDurumu, ISARET_RENK, odulYaz, sahneGorseli, useYerlesimEkrani, yuzBilgisi,
} from "../../lib/online/yasam-ui";
import { EylemSonucu } from "../../lib/online/eylem-ui";
import { AnaZemin, ZEMIN } from "../../lib/sayfa/ana/zemin";
import { MkBookRow, MkHero, MkIdentity, MkPanel, MkPanelHeader } from "../../lib/sayfa/ana/paneller";
import { MK } from "../../lib/mk-sus";
import { SimdiRehberi } from "../../lib/online/simdi-rehber";
import { isReduceMotion } from "../../lib/perf";
import { BarinmaKarti } from "../../lib/online/barinma-ui";
import { EtkinlikBandi } from "../../lib/online/etkinlik-ui";
import { NabizKarti } from "../../lib/online/ekonomi-ui";
import { SISTEM_IKON, isaretli, olayIkonu, ozetYaz, ruhAnahtari } from "../../lib/online/metin";
import { hataAnahtari, istekTekrarMi } from "../../lib/online/hata";
import type { EylemYaniti, Isaret, Olay, OgrenmeGunu, YerlesimDurumu } from "../../lib/online/protokol";

type Ceviri = (k: string) => string;
const SAAT_MS = 3_600_000;
/** Bir öğrenme günü kaç oyun ayı (sunucu yerlesim/ogrenme.ts GUN_BASINA_AY). */
const GUN_BASINA_AY = 2;
/** Mevsim simgesi: tek oyunculu ana sayfanın sahne başlığıyla aynı. */
const MEVSIM_IKON: Record<string, string> = { kis: "flame", ilkbahar: "leaf", yaz: "sun", sonbahar: "wheat" };
const KART_EN_COK = 5;
const GERILIM_EN_COK = 5;

/** Olayın oyuncuya yakınlığı (sunucu donus.ts ile aynı öncelik): 3 kendisi, 2 dost/düşman, 1 tanıdık, 0 diğer. */
function yakinlik(o: Olay, benId: string, isaret: Map<string, Isaret>): number {
  if (o.hedef === benId) return 3;
  const w = o.kim ? isaret.get(o.kim) : undefined, h = o.hedef ? isaret.get(o.hedef) : undefined;
  if (w === "dost" || w === "dusman" || h === "dost" || h === "dusman") return 2;
  return w || h ? 1 : 0;
}
/** Olayın götüreceği kişi (kendim değilse olayın sahibi, yoksa hedefi). */
function olayKisisi(o: Olay, benId: string): string | null {
  if (o.kim && o.kim !== benId) return o.kim;
  if (o.hedef && o.hedef !== benId) return o.hedef;
  const k = (o.ozet.p.kisi as { id?: unknown } | undefined)?.id;
  return typeof k === "string" && k !== benId ? k : null;
}

interface Gerilim { id: string; ad: string; gorus: number; isaret?: Isaret; oyuncu?: boolean; sebep?: string }
/** Açık gerilimler: bana kırgın ya da düşman işaretli kişiler (en çok 5, en kırgın önce); sebep defterdeki hamleden. */
function gerilimler(y: YerlesimDurumu, defter: Olay[]): Gerilim[] {
  const liste = new Map<string, Gerilim>();
  for (const k of y.ben.tanidiklar) if ((k.gorus ?? 0) < 0 || k.isaret === "dusman") liste.set(k.id, { id: k.id, ad: k.ad, gorus: k.gorus ?? 0, isaret: k.isaret, oyuncu: k.oyuncu });
  for (const k of y.oneriler) if (k.gorus < 0 && !liste.has(k.id)) liste.set(k.id, { id: k.id, ad: k.ad, gorus: k.gorus });
  for (const o of [...y.donusKarti, ...defter]) {
    if (o.ozet.k !== "olay.hamle.laf") continue;
    const id = (o.ozet.p.kisi as { id?: string } | undefined)?.id;
    const g = id ? liste.get(id) : undefined;
    if (g && typeof o.ozet.p.sebep === "string") g.sebep = o.ozet.p.sebep;
  }
  return [...liste.values()].sort((a, b) => a.gorus - b.gorus).slice(0, GERILIM_EN_COK);
}

/** Bugünün (ya da seçilen günün) hedefi: ne yapılacak, ilerleme, ödül, kısayol. */
function GunHedefi({ g, bugun, rtl, t, lang, bekliyor, onGit }: { g: OgrenmeGunu; bugun: number; rtl: boolean; t: Ceviri; lang: Lang; bekliyor: boolean; onGit: () => void }) {
  const d = gunDurumu(g, bugun);
  const oran = g.gerekli > 0 ? Math.min(1, g.ilerleme / g.gerekli) : 0;
  const durumRenk = d === "tamam" ? C.sage : d === "kacti" ? C.ember : d === "bugun" ? C.goldBright : C.parchmentMuted;
  return <View style={{ gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: d === "bugun" ? "rgba(243,210,122,0.55)" : "rgba(201,162,78,0.25)", backgroundColor: "rgba(0,0,0,0.28)" }}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 12 }}>
      <Madalyon icon={SISTEM_IKON[g.sistem] ?? "scroll"} size={44} aktif={d === "bugun"} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text style={{ fontFamily: F.display, fontSize: 15.5, color: C.parchment }}>{t("onl.ogrenme.sistem." + g.sistem)}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 10.5, letterSpacing: rtl ? 0 : 1, color: durumRenk }}>{`${applyParams(t("onl.ya.gunN"), [g.gun])} · ${t("onl.ya.durum." + d)}`}</Text>
        </View>
        <Text style={{ fontFamily: F.serif, fontSize: 15.5, lineHeight: 21, color: C.parchmentDim, textAlign: hiza(rtl) }}>{ozetYaz(g.hedef, t, lang)}</Text>
      </View>
    </View>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
      <View style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: "rgba(201,162,78,0.16)", overflow: "hidden", flexDirection: yon(rtl) }}>
        <View style={{ width: `${Math.max(oran * 100, oran > 0 ? 6 : 0)}%`, backgroundColor: d === "tamam" ? C.sage : C.gold, borderRadius: 4 }} />
      </View>
      <Text style={{ fontFamily: F.display, fontSize: 12.5, color: C.parchment }}>{`${g.ilerleme}/${g.gerekli}`}</Text>
    </View>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <GameIcon name="medal" size={15} color={d === "tamam" ? C.sage : C.gold} />
      <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, color: C.parchmentDim, textAlign: hiza(rtl) }}>
        {applyParams(t(d === "tamam" ? "onl.ya.odulAlindi" : "onl.ya.odul"), [odulYaz(g.odul, t)])}
      </Text>
    </View>
    {d === "bugun" || d === "kacti" ? <CizgiDugme etiket={t("onl.ya.git." + g.sistem)} icon={SISTEM_IKON[g.sistem]} rtl={rtl} kucuk kapali={bekliyor} onPress={onGit} /> : null}
  </View>;
}

function YasamEkran() {
  const router = useRouter();
  const { t, rtl, lang } = useI18n();
  const ins = useSafeAreaInsets();
  const o = useYerlesimEkrani();
  const y = o.yerlesim;
  const [simdi, setSimdi] = useState(() => Date.now());
  const [secGun, setSecGun] = useState<number | null>(null);
  const [sonuc, setSonuc] = useState<EylemYaniti | null>(null);
  const [eylemHata, setEylemHata] = useState<string | null>(null);
  const [tumDefter, setTumDefter] = useState(false);
  const kaydir = useRef<ScrollView | null>(null);
  const barinmaY = useRef(0);

  useEffect(() => { const id = setInterval(() => setSimdi(Date.now()), 30_000); return () => clearInterval(id); }, []);
  useEffect(() => { if (y && !o.defter.length) void o.olaylarYukle(); }, [!!y]); // eslint-disable-line react-hooks/exhaustive-deps
  // "Şimdi" rehberi teslim edilebilir siparişi gösterir (sessiz yükleme; hata ekranı kilitlemez).
  useEffect(() => { if (y && !o.siparisler) void o.siparisleriYukle(true); }, [!!y]); // eslint-disable-line react-hooks/exhaustive-deps

  const isaretler = useMemo(() => new Map((y?.ben.tanidiklar ?? []).map((k) => [k.id, k.isaret] as const)), [y]);
  const kart = useMemo(() => {
    if (!y) return [];
    return y.donusKarti.map((ol, i) => ({ ol, i, r: yakinlik(ol, y.ben.id, isaretler) })).sort((a, b) => b.r - a.r || a.i - b.i).slice(0, KART_EN_COK);
  }, [y, isaretler]);
  const gerilim = useMemo(() => (y ? gerilimler(y, o.defter) : []), [y, o.defter]);

  if (!y) return <YerlesimBekle sekme="yasam" rtl={rtl} t={t} onGiris={() => router.replace("/online")} />;

  const ben = y.ben;
  const og = ben.ogrenme;
  const gun = og.gunler.find((g) => g.gun === (secGun ?? og.gun)) ?? og.gunler[0];
  const kacan = og.gunler.filter((g) => gunDurumu(g, og.gun) === "kacti");
  const saat = y.saat;
  const kalan = Math.max(0, saat.sonrakiDonum - (saat.simdi + (simdi - o.yerlesimAlindi)));
  const yeniler = [...o.defter].reverse();
  const gorunenDefter = tumDefter ? yeniler : yeniler.slice(0, 8);

  const kisiyeGit = (id: string | null) => { if (id) router.push(kisiYolu(id)); };
  const mektep = async () => {
    setEylemHata(null);
    const s = await o.eylemYap({ tur: "mektep" });
    if (s.ok) { hap("success"); setSonuc(s.deger); } else if (!istekTekrarMi(s.hata)) { hap("error"); setEylemHata(t(hataAnahtari(s.hata))); }
  };
  const hedefeGit = (g: OgrenmeGunu) => {
    if (g.sistem === "mektep") return void mektep();
    router.replace(g.sistem === "dostluk" ? "/online/cevrem" : g.sistem === "karar" ? "/online/karakter" : "/online/mahalle");
  };

  const sahne = sahneGorseli(y.yerlesim.tur, saat.mevsim);
  const kalanMetin = applyParams(t("onl.v.kalan"), [Math.floor(kalan / SAAT_MS), Math.floor((kalan % SAAT_MS) / 60_000)]);
  const meslek = o.meslekDurumu?.kayit.a || null;
  const rol = meslek ? t("onl.mes." + meslek) : applyParams(t("onl.ana.sakin"), [y.yerlesim.ad]);
  // Tek oyunculu ana sayfanın kimlik paneli: dört gösterge (akçe, takat, öğrenme günü ya da yaş, yeni aya kalan).
  const gostergeler = [
    { icon: "coins", label: t("onl.ana.akce"), value: String(ben.para) },
    { icon: "flame", label: t("onl.ana.takat"), value: `${ben.takat.kalan}/${ben.takat.tavan}`, tone: ben.takat.kalan > 0 ? undefined : C.ember },
    og.suruyor ? { icon: "graduate-cap", label: t("onl.ana.gun"), value: `${og.gun}/${og.gunler.length}` } : { icon: "hourglass", label: t("onl.ana.yas"), value: String(ben.yas) },
    { icon: "hourglass", label: t("onl.ana.yeniAy"), value: kalanMetin },
  ];
  const panel = { marginHorizontal: 0, marginTop: 14 };

  return <View style={{ flex: 1, backgroundColor: ZEMIN }}>
    <AnaZemin source={sahne} />
    <ScrollView ref={kaydir} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: MENU_YUKSEKLIK + ins.bottom + 28 }}>
      {/* Sahne ve kimlik: tek oyunculu ana sayfayla aynı paneller (lib/sayfa/ana/paneller) */}
      <MkHero source={sahne} topInset={ins.top} seasonIcon={MEVSIM_IKON[saat.mevsim] ?? "sun"} rtl={rtl}
        title={y.yerlesim.ad} sub={`${t("onl.tur." + y.yerlesim.tur)}  •  ${t("onl.mevsim." + saat.mevsim)} ${saat.yil}`}
        onBook={() => router.push("/online/kronik")} bookLabel={t("onl.kr.baslik")} bookIcon="book" />
      <MkIdentity age={ben.yas} gender={ben.cinsiyet} name={ben.ad} role={rol} stats={gostergeler} rtl={rtl}
        portraitLabel={applyParams(t("onl.ya.benErisim"), [ben.ad, ben.yas])} onPortrait={() => router.replace("/online/karakter")} />

      <View style={{ paddingHorizontal: MK.side }}>
        {/* Canlı etkinlikler: yönetici başlatınca belirir, durdurunca kaybolur */}
        <EtkinlikBandi />

        {/* Şimdi: en çok üç öneri, her biri tek düğme (tek oyunculudaki uyarı afişinin yeri) */}
        <SimdiRehberi onBarinma={() => kaydir.current?.scrollTo({ y: Math.max(0, barinmaY.current - 12), animated: !isReduceMotion() })} />

        {/* Öğrenme dönemi: ne olduğu tek cümleyle, altı gün şeridi ve bugünün hedefi */}
        {og.suruyor ? <Animated.View entering={giris(120)}>
          <MkPanel style={panel}>
            <MkPanelHeader title={applyParams(t("onl.ana.donem"), [og.gun, og.gunler.length])} rtl={rtl} />
            <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: MK.muted, textAlign: hiza(rtl) }}>{applyParams(t("onl.v.donemNe"), [og.gunler.length, GUN_BASINA_AY], lang)}</Text>
              <OgrenmeSeridi ogrenme={og} rtl={rtl} t={t} secili={gun.gun} onSec={(g) => setSecGun(g === og.gun ? null : g)} />
              <GunHedefi g={gun} bugun={og.gun} rtl={rtl} t={t} lang={lang} bekliyor={o.islem === "eylem"} onGit={() => hedefeGit(gun)} />
              {eylemHata ? <Bant metin={eylemHata} rtl={rtl} /> : null}
              {secGun === null && kacan.length ? <Pressable accessibilityLabel={applyParams(t("onl.ya.kacan"), [kacan.map((g) => g.gun).join(", ")])} onPress={() => { hap("selection"); setSecGun(kacan[0].gun); }}
                style={{ minHeight: 44, flexDirection: yon(rtl), alignItems: "center", gap: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "rgba(120,52,24,0.35)", borderWidth: 1, borderColor: "rgba(214,120,72,0.55)" }}>
                <GameIcon name="hourglass" size={15} color={C.emberSoft} />
                <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, lineHeight: 19, color: C.parchment, textAlign: hiza(rtl) }}>
                  {applyParams(t("onl.ya.kacan"), [kacan.map((g) => `${g.gun} · ${t("onl.ogrenme.sistem." + g.sistem)}`).join(", ")])}
                </Text>
              </Pressable> : null}
            </View>
          </MkPanel>
        </Animated.View> : null}

        {/* Takat: kimlikteki göstergenin açıklaması (aylık dolum, birikim tavanı) */}
        <MkPanel style={panel}>
          <View style={{ padding: 14 }}>
            <TakatGostergesi kalan={ben.takat.kalan} tavan={ben.takat.tavan} aylik={ben.takat.aylik} rtl={rtl} t={t} />
          </View>
        </MkPanel>

        {/* Barınma (Faz 14); 24 saati aşan yoklukta dönüş ekranını açar. Rehberin "barınma" önerisi buraya kaydırır. */}
        <View onLayout={(e) => { barinmaY.current = e.nativeEvent.layout.y; }}><BarinmaKarti /></View>
        <NabizKarti />

        {/* Gelen kutusu: cevap bekleyen teklif ve dostluk istekleri (Faz 3a) */}
        <GelenKutusuKarti ust={14} />

        {/* Dönüş Kartı (tek oyunculudaki "Son Gelişmeler" paneli) */}
        <MkPanel style={panel}>
          <MkPanelHeader title={t("onl.ya.donusKarti")} rtl={rtl} right={kart.length ? <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>{kart.length}</Text> : undefined} />
          {kart.length ? <View style={{ marginHorizontal: 12, marginBottom: 12, borderRadius: 3, borderWidth: 1, borderColor: "rgba(140,107,55,0.55)", backgroundColor: "rgba(14,10,6,0.5)", overflow: "hidden" }}>
            {kart.map(({ ol, r }, i) => {
              const kisi = olayKisisi(ol, ben.id);
              const isaret = (ol.kim && isaretler.get(ol.kim)) || (ol.hedef && isaretler.get(ol.hedef)) || null;
              const metin = ozetYaz(ol.ozet, t, lang);
              return <Pressable key={ol.sira} disabled={!kisi} accessibilityLabel={metin} accessibilityHint={kisi ? t("onl.ya.kisiyeGit") : undefined} onPress={() => { hap("tap"); kisiyeGit(kisi); }}
                style={({ pressed }) => ({ minHeight: 44, flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderColor: "rgba(140,107,55,0.35)", backgroundColor: pressed ? "rgba(201,162,78,0.08)" : "transparent" })}>
                <View style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: isaret ? ISARET_RENK[isaret] : r === 3 ? C.goldBright : ONL.frame, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(14,10,6,0.7)" }}>
                  <GameIcon name={olayIkonu(ol)} size={18} color={r === 3 ? C.goldBright : MK.gold} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 19, color: MK.ink, textAlign: hiza(rtl) }}>{metin}</Text>
                  {r > 0 ? <Text style={{ fontFamily: F.display, fontSize: 10.5, letterSpacing: rtl ? 0 : 1, color: isaret ? ISARET_RENK[isaret] : C.goldBright, textAlign: hiza(rtl) }}>
                    {r === 3 ? t("onl.ya.seninle") : t("onl.ya.tanidigin." + (isaret ?? "tanidik"))}
                  </Text> : null}
                </View>
                {kisi ? <SatirOku rtl={rtl} /> : null}
              </Pressable>;
            })}
          </View> : <Text style={{ fontFamily: F.serif, fontSize: 14, color: MK.muted, paddingHorizontal: 14, paddingBottom: 14, textAlign: hiza(rtl) }}>{t("onl.ya.kartBos")}</Text>}
        </MkPanel>

        {/* Açık gerilimler */}
        <MkPanel style={panel}>
          <MkPanelHeader title={t("onl.ya.gerilimler")} rtl={rtl} />
          {gerilim.length ? <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
            {gerilim.map((g, i) => <View key={g.id} style={{ gap: 10, paddingTop: i ? 12 : 0, borderTopWidth: i ? 1 : 0, borderColor: "rgba(140,107,55,0.35)" }}>
              <Pressable accessibilityLabel={`${g.ad}: ${t(ruhAnahtari(g.gorus))} ${isaretli(g.gorus)}`} onPress={() => { hap("tap"); kisiyeGit(g.id); }} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 12 }}>
                <KisiYuzu id={g.id} ad={g.ad} boyut={46} isaret={g.isaret} oyuncu={g.oyuncu} {...yuzBilgisi(o.kisiler, g.id)} />
                <View style={{ flex: 1, gap: 5 }}>
                  <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
                    <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 15, color: C.parchment }}>{g.ad}</Text>
                    <Text style={{ fontFamily: F.display, fontSize: 13, color: gorusRengi(g.gorus) }}>{isaretli(g.gorus)}</Text>
                  </View>
                  <GorusOlcegi deger={g.gorus} rtl={rtl} />
                  <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>
                    {g.sebep ? applyParams(t("onl.ya.gerilimSebep"), [t(ruhAnahtari(g.gorus)), t("onl." + g.sebep)]) : t(ruhAnahtari(g.gorus))}
                  </Text>
                </View>
              </Pressable>
              <CizgiDugme etiket={t("onl.ya.gonlunuAl")} icon="family" rtl={rtl} kucuk onPress={() => kisiyeGit(g.id)} />
            </View>)}
          </View> : <Text style={{ fontFamily: F.serif, fontSize: 14, color: MK.muted, paddingHorizontal: 14, paddingBottom: 14, textAlign: hiza(rtl) }}>{t("onl.ya.gerilimBos")}</Text>}
        </MkPanel>

        {/* Seni fark edenler (öneriler) */}
        {y.oneriler.filter((x) => x.gorus > 0).length ? <MkPanel style={panel}>
          <MkPanelHeader title={t("onl.ya.oneriler")} rtl={rtl} />
          <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
            {y.oneriler.filter((x) => x.gorus > 0).map((k, i) => <View key={k.id} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 12, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderColor: "rgba(140,107,55,0.35)" }}>
              <Pressable accessibilityLabel={k.ad} onPress={() => kisiyeGit(k.id)} style={{ flex: 1, flexDirection: yon(rtl), alignItems: "center", gap: 12 }}>
                <KisiYuzu id={k.id} ad={k.ad} boyut={42} {...yuzBilgisi(o.kisiler, k.id)} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 14.5, color: C.parchment, textAlign: hiza(rtl) }}>{k.ad}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 14, color: gorusRengi(k.gorus), textAlign: hiza(rtl) }}>{`${t(ruhAnahtari(k.gorus))} · ${isaretli(k.gorus)}`}</Text>
                </View>
              </Pressable>
              <Pressable accessibilityLabel={applyParams(t("onl.ki.ekleErisim"), [k.ad])} onPress={() => { hap("tap"); void o.tanidikIsaretle(k.id, "tanidik"); }}
                style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: ONL.frameHi, backgroundColor: pressed ? "rgba(201,162,78,0.24)" : "rgba(201,162,78,0.12)", flexDirection: "row", alignItems: "center", gap: 6 })}>
                <Text style={{ fontFamily: F.display, fontSize: 18, lineHeight: 20, color: C.goldBright }}>+</Text>
                <Text style={{ fontFamily: F.display, fontSize: 12, color: C.goldBright }}>{t("onl.ya.ekle")}</Text>
              </Pressable>
            </View>)}
          </View>
        </MkPanel> : null}

        {/* Yerleşim defteri */}
        <MkPanel style={panel}>
          <MkPanelHeader title={t("onl.ya.defter")} rtl={rtl} right={o.defterYeni > 0 ? <Rozet metin={applyParams(t("onl.ya.yeni"), [o.defterYeni])} renk={C.goldBright} dolu /> : undefined} />
          {gorunenDefter.length ? <View style={{ marginHorizontal: 12, marginBottom: 12, borderRadius: 3, borderWidth: 1, borderColor: "rgba(140,107,55,0.55)", backgroundColor: "rgba(14,10,6,0.5)", overflow: "hidden" }}>
            {gorunenDefter.map((ol, i) => {
              const yeni = o.defterOkunan >= 0 && ol.sira > o.defterOkunan;
              const kisi = olayKisisi(ol, ben.id);
              return <Pressable key={ol.sira} disabled={!kisi} accessibilityLabel={ozetYaz(ol.ozet, t, lang)} onPress={() => kisiyeGit(kisi)}
                style={{ minHeight: 42, flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingHorizontal: 10, paddingVertical: 7, borderTopWidth: i ? 1 : 0, borderColor: "rgba(140,107,55,0.35)" }}>
                <View style={{ width: 22, alignItems: "center" }}><GameIcon name={olayIkonu(ol)} size={17} color={yeni ? C.goldBright : MK.gold} /></View>
                <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, lineHeight: 18, color: yeni ? MK.ink : MK.muted, textAlign: hiza(rtl) }}>{ozetYaz(ol.ozet, t, lang)}</Text>
                {yeni ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.goldBright }} /> : null}
              </Pressable>;
            })}
          </View> : <Text style={{ fontFamily: F.serif, fontSize: 14, color: MK.muted, paddingHorizontal: 14, paddingBottom: 14, textAlign: hiza(rtl) }}>{o.islem === "olaylar" ? t("onl.yukleniyor") : t("onl.ya.defterBos")}</Text>}
          {yeniler.length > 8 || o.defterDahaVar ? <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 8 }}>
            {yeniler.length > 8 ? <CizgiDugme etiket={t(tumDefter ? "onl.ya.daha.az" : "onl.ya.daha.cok")} rtl={rtl} kucuk onPress={() => setTumDefter((v) => !v)} /> : null}
            {o.defterDahaVar ? <CizgiDugme etiket={t("onl.ya.devami")} icon="scroll-open" rtl={rtl} kucuk kapali={o.islem === "olaylar"} onPress={() => { void o.olaylarYukle(true); }} /> : null}
          </View> : null}
        </MkPanel>
      </View>

      {/* Tek oyunculudaki Yaşam Defteri satırı: yerleşimin kalıcı kroniği */}
      <View style={{ marginTop: 14 }}>
        <MkBookRow title={t("onl.kr.baslik")} sub={t("onl.ana.kronikAlt")} rtl={rtl} onPress={() => router.push("/online/kronik")} />
      </View>
    </ScrollView>
    <AltPanel acik={!!sonuc} onKapat={() => setSonuc(null)} etiket={t("onl.ey.sonuc")} rtl={rtl} t={t}>
      {sonuc ? <EylemSonucu y={sonuc} rtl={rtl} t={t} lang={lang} onTamam={() => setSonuc(null)} /> : null}
    </AltPanel>
    <AltMenu aktif="yasam" rtl={rtl} t={t} rozet={{ ben: ben.ozellikPuani > 0 }} />
  </View>;
}

export default function OnlineYasam() {
  return onlineEkranAcik() ? <OnlineKapisi><YasamEkran /></OnlineKapisi> : <OnlineYakinda />;
}
