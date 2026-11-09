// Çevrimiçi yaşam (ana sayfa, Faz 2c): Dönüş Kartı (en çok 5, tanıdıklar önce), açık gerilimler, takat, öğrenme
// dönemi şeridi (6 gün; bugünün hedefi ve ödülü, tamam/kaçan günler), hızlı geçişler ve yerleşim defteri (imleçli).
// Veri sunucudan (GET /v1/yerlesim, /v1/olaylar); tek oyunculu motor ya da kayıt okunmaz.
import { useEffect, useMemo, useState } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
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
import { Bant, Cerceve, CizgiDugme, Madalyon, ONL, TUR_IKON, giris, hiza, yon } from "../../lib/online/ui";
import {
  AltPanel, Baslik2, BosKart, GorusOlcegi, Hap, KisiYuzu, OgrenmeSeridi, OnlineSayfa, Rozet, SatirOku, TakatGostergesi, YerlesimBekle,
  gorusRengi, gunDurumu, ISARET_RENK, odulYaz, sahneGorseli, useYerlesimEkrani, yuzBilgisi,
} from "../../lib/online/yasam-ui";
import { EylemSonucu } from "../../lib/online/eylem-ui";
import { SISTEM_IKON, isaretli, olayIkonu, ozetYaz, ruhAnahtari } from "../../lib/online/metin";
import { hataAnahtari } from "../../lib/online/hata";
import type { EylemYaniti, Isaret, Olay, OgrenmeGunu, YerlesimDurumu } from "../../lib/online/protokol";

type Ceviri = (k: string) => string;
const SAAT_MS = 3_600_000;
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
  const { width: W, height: H } = useWindowDimensions();
  const o = useYerlesimEkrani();
  const y = o.yerlesim;
  const [simdi, setSimdi] = useState(() => Date.now());
  const [secGun, setSecGun] = useState<number | null>(null);
  const [sonuc, setSonuc] = useState<EylemYaniti | null>(null);
  const [eylemHata, setEylemHata] = useState<string | null>(null);
  const [tumDefter, setTumDefter] = useState(false);

  useEffect(() => { const id = setInterval(() => setSimdi(Date.now()), 30_000); return () => clearInterval(id); }, []);
  useEffect(() => { if (y && !o.defter.length) void o.olaylarYukle(); }, [!!y]); // eslint-disable-line react-hooks/exhaustive-deps
  // Lonca siparişleri kısayolu açık ilan sayısını gösterir (sessiz yükleme; hata kısayolu kilitlemez).
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
  const dar = W < 360;
  const yeniler = [...o.defter].reverse();
  const gorunenDefter = tumDefter ? yeniler : yeniler.slice(0, 8);
  const benYer = y.harita.find((m) => m.kisiler.some((k) => k.id === ben.id));

  const kisiyeGit = (id: string | null) => { if (id) router.push(`/online/kisi/${id}`); };
  const mektep = async () => {
    setEylemHata(null);
    const s = await o.eylemYap({ tur: "mektep" });
    if (s.ok) { hap("success"); setSonuc(s.deger); } else { hap("error"); setEylemHata(t(hataAnahtari(s.hata))); }
  };
  const hedefeGit = (g: OgrenmeGunu) => {
    if (g.sistem === "mektep") return void mektep();
    router.replace(g.sistem === "dostluk" ? "/online/tanidiklar" : g.sistem === "karar" ? "/online/karakter" : "/online/mahalle");
  };

  return <OnlineSayfa gorsel={sahneGorseli(y.yerlesim.tur, saat.mevsim)} oran={0.5} sekme="yasam" rtl={rtl} t={t}
    rozet={{ karakter: ben.ozellikPuani > 0 }}
    alt={<AltPanel acik={!!sonuc} onKapat={() => setSonuc(null)} etiket={t("onl.ey.sonuc")} rtl={rtl} t={t}>
      {sonuc ? <EylemSonucu y={sonuc} rtl={rtl} t={t} lang={lang} onTamam={() => setSonuc(null)} /> : null}
    </AltPanel>}>
    {/* Üst şerit: ben, yaş, akçe */}
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
      <Pressable accessibilityLabel={applyParams(t("onl.ya.benErisim"), [ben.ad, ben.yas])} onPress={() => router.replace("/online/karakter")} style={{ borderRadius: 30 }}>
        <KisiYuzu id={ben.id} ad={ben.ad} boyut={54} yas={ben.yas} cinsiyet={ben.cinsiyet} ben />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 17, color: C.goldBright, textAlign: hiza(rtl), textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 6 }}>{ben.ad}</Text>
        <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 15, color: C.parchment, textAlign: hiza(rtl), textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 6 }}>{applyParams(t("onl.ya.yas"), [ben.yas])}</Text>
      </View>
      <Hap icon="coins" metin={String(ben.para)} erisim={applyParams(t("onl.ya.paraErisim"), [ben.para])} />
    </View>

    {/* Yerleşim başlığı ve dönüm sayacı */}
    <View style={{ minHeight: Math.max(dar ? 64 : 92, H * 0.1) }} />
    <Animated.View entering={giris(60)} style={{ alignItems: "center", gap: 6 }}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 7, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: ONL.gold, backgroundColor: "rgba(14,10,6,0.62)" }}>
        <GameIcon name={TUR_IKON[y.yerlesim.tur] ?? "house"} size={13} color={C.goldBright} />
        <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 1.6, color: C.goldBright }}>{`${t("onl.tur." + y.yerlesim.tur)} · ${t("onl.mevsim." + saat.mevsim)} ${saat.yil}`}</Text>
      </View>
      <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: dar ? 30 : 34, lineHeight: dar ? 38 : 42, color: C.parchment, textAlign: "center", textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 10 }}>{y.yerlesim.ad}</Text>
      <View accessible accessibilityLabel={`${t("onl.v.donum")} ${applyParams(t("onl.v.kalan"), [Math.floor(kalan / SAAT_MS), Math.floor((kalan % SAAT_MS) / 60_000)])}`}
        style={{ flexDirection: yon(rtl), alignItems: "center", gap: 7 }}>
        <GameIcon name="hourglass" size={14} color={C.gold} />
        <Text style={{ fontFamily: F.serif, fontSize: 15.5, color: C.parchmentDim, textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 6 }}>
          {`${t("onl.ya.donum")} ${applyParams(t("onl.v.kalan"), [Math.floor(kalan / SAAT_MS), Math.floor((kalan % SAAT_MS) / 60_000)])}`}
        </Text>
      </View>
    </Animated.View>

    {/* Takat */}
    <Animated.View entering={giris(140)} style={{ marginTop: 16 }}>
      <Cerceve ic={{ padding: 14 }}>
        <TakatGostergesi kalan={ben.takat.kalan} tavan={ben.takat.tavan} aylik={ben.takat.aylik} rtl={rtl} t={t} />
      </Cerceve>
    </Animated.View>

    {/* Öğrenme dönemi */}
    {og.suruyor ? <Animated.View entering={giris(200)} style={{ marginTop: 12 }}>
      <Cerceve ic={{ padding: 14, gap: 12 }}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
          <GameIcon name="graduate-cap" size={16} color={C.goldBright} />
          <Text style={{ flex: 1, fontFamily: F.display, fontSize: 12.5, letterSpacing: rtl ? 0 : 1.4, color: C.goldBright, textAlign: hiza(rtl) }}>{applyParams(t("onl.v.donem"), [og.gun, og.gunler.length])}</Text>
        </View>
        <OgrenmeSeridi ogrenme={og} rtl={rtl} t={t} secili={gun.gun} onSec={(g) => setSecGun(g === og.gun ? null : g)} />
        <GunHedefi g={gun} bugun={og.gun} rtl={rtl} t={t} lang={lang} bekliyor={o.islem === "eylem"} onGit={() => hedefeGit(gun)} />
        {eylemHata ? <Bant metin={eylemHata} rtl={rtl} /> : null}
        {secGun === null && kacan.length ? <Pressable accessibilityLabel={applyParams(t("onl.ya.kacan"), [kacan.map((g) => g.gun).join(", ")])} onPress={() => { hap("selection"); setSecGun(kacan[0].gun); }}
          style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "rgba(120,52,24,0.35)", borderWidth: 1, borderColor: "rgba(214,120,72,0.55)" }}>
          <GameIcon name="hourglass" size={15} color={C.emberSoft} />
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, lineHeight: 19, color: C.parchment, textAlign: hiza(rtl) }}>
            {applyParams(t("onl.ya.kacan"), [kacan.map((g) => `${g.gun} · ${t("onl.ogrenme.sistem." + g.sistem)}`).join(", ")])}
          </Text>
        </Pressable> : null}
      </Cerceve>
    </Animated.View> : null}

    {/* Dönüş Kartı */}
    <Baslik2 metin={t("onl.ya.donusKarti")} rtl={rtl} sag={kart.length ? <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>{kart.length}</Text> : undefined} />
    {kart.length ? <Cerceve ic={{ paddingVertical: 4 }}>
      {kart.map(({ ol, r }, i) => {
        const kisi = olayKisisi(ol, ben.id);
        const isaret = (ol.kim && isaretler.get(ol.kim)) || (ol.hedef && isaretler.get(ol.hedef)) || null;
        const metin = ozetYaz(ol.ozet, t, lang);
        return <Pressable key={ol.sira} disabled={!kisi} accessibilityLabel={metin} accessibilityHint={kisi ? t("onl.ya.kisiyeGit") : undefined} onPress={() => { hap("tap"); kisiyeGit(kisi); }}
          style={({ pressed }) => ({ flexDirection: yon(rtl), alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: "rgba(201,162,78,0.14)", backgroundColor: pressed ? "rgba(201,162,78,0.08)" : "transparent" })}>
          <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: isaret ? ISARET_RENK[isaret] : r === 3 ? C.goldBright : ONL.frame, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(14,10,6,0.7)" }}>
            <GameIcon name={olayIkonu(ol)} size={19} color={r === 3 ? C.goldBright : C.gold} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 22, color: C.parchment, textAlign: hiza(rtl) }}>{metin}</Text>
            {r > 0 ? <Text style={{ fontFamily: F.display, fontSize: 10.5, letterSpacing: rtl ? 0 : 1, color: isaret ? ISARET_RENK[isaret] : C.goldBright, textAlign: hiza(rtl) }}>
              {r === 3 ? t("onl.ya.seninle") : t("onl.ya.tanidigin." + (isaret ?? "tanidik"))}
            </Text> : null}
          </View>
          {kisi ? <SatirOku rtl={rtl} /> : null}
        </Pressable>;
      })}
    </Cerceve> : <BosKart icon="scroll" metin={t("onl.ya.kartBos")} rtl={rtl} />}

    {/* Açık gerilimler */}
    <Baslik2 metin={t("onl.ya.gerilimler")} rtl={rtl} />
    {gerilim.length ? <View style={{ gap: 10 }}>
      {gerilim.map((g) => <Cerceve key={g.id} ic={{ padding: 12, gap: 10 }}>
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
      </Cerceve>)}
    </View> : <BosKart icon="shield" metin={t("onl.ya.gerilimBos")} rtl={rtl} />}

    {/* Seni fark edenler (öneriler) */}
    {y.oneriler.filter((x) => x.gorus > 0).length ? <>
      <Baslik2 metin={t("onl.ya.oneriler")} rtl={rtl} />
      <View style={{ gap: 8 }}>
        {y.oneriler.filter((x) => x.gorus > 0).map((k) => <Cerceve key={k.id} ic={{ paddingHorizontal: 12, paddingVertical: 8 }}>
          <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 12 }}>
            <Pressable accessibilityLabel={k.ad} onPress={() => kisiyeGit(k.id)} style={{ flex: 1, flexDirection: yon(rtl), alignItems: "center", gap: 12 }}>
              <KisiYuzu id={k.id} ad={k.ad} boyut={42} {...yuzBilgisi(o.kisiler, k.id)} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 14.5, color: C.parchment, textAlign: hiza(rtl) }}>{k.ad}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 14, color: gorusRengi(k.gorus), textAlign: hiza(rtl) }}>{`${t(ruhAnahtari(k.gorus))} · ${isaretli(k.gorus)}`}</Text>
              </View>
            </Pressable>
            <Pressable accessibilityLabel={applyParams(t("onl.ki.ekleErisim"), [k.ad])} onPress={() => { hap("tap"); void o.tanidikIsaretle(k.id, "tanidik"); }}
              style={({ pressed }) => ({ paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: ONL.frameHi, backgroundColor: pressed ? "rgba(201,162,78,0.24)" : "rgba(201,162,78,0.12)", flexDirection: "row", alignItems: "center", gap: 6 })}>
              <Text style={{ fontFamily: F.display, fontSize: 18, lineHeight: 20, color: C.goldBright }}>+</Text>
              <Text style={{ fontFamily: F.display, fontSize: 12, color: C.goldBright }}>{t("onl.ya.ekle")}</Text>
            </Pressable>
          </View>
        </Cerceve>)}
      </View>
    </> : null}

    {/* Hızlı geçişler */}
    <Baslik2 metin={t("onl.ya.hizli")} rtl={rtl} />
    <View style={{ flexDirection: yon(rtl), gap: 8 }}>
      {[
        { id: "mahalle", icon: "map", baslik: t("onl.nav.mahalle"), alt: benYer ? applyParams(t("onl.ya.hizliMahalle"), [t("onl.mekan." + benYer.id)]) : t("onl.ya.hizliMahalleYok"), yol: "/online/mahalle" },
        { id: "tanidiklar", icon: "family", baslik: t("onl.nav.tanidiklar"), alt: applyParams(t("onl.ya.hizliTanidik"), [ben.tanidiklar.length]), yol: "/online/tanidiklar" },
        { id: "karakter", icon: "hood", baslik: t("onl.nav.karakter"), alt: ben.ozellikPuani > 0 ? applyParams(t("onl.ya.hizliPuan"), [ben.ozellikPuani]) : applyParams(t("onl.ya.yas"), [ben.yas]), yol: "/online/karakter", vurgu: ben.ozellikPuani > 0 },
      ].map((h) => <Pressable key={h.id} accessibilityLabel={`${h.baslik}: ${h.alt}`} onPress={() => { hap("tap"); router.replace(h.yol); }} style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
        <Cerceve aktif={!!h.vurgu} ic={{ alignItems: "center", gap: 6, paddingVertical: 12, paddingHorizontal: 6, minHeight: 104 }}>
          <Madalyon icon={h.icon} size={38} aktif={!!h.vurgu} />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: dar ? 11.5 : 12.5, color: C.parchment, textAlign: "center" }}>{h.baslik}</Text>
          <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: dar ? 12.5 : 13.5, lineHeight: 17, color: h.vurgu ? C.goldBright : C.parchmentDim, textAlign: "center" }}>{h.alt}</Text>
        </Cerceve>
      </Pressable>)}
    </View>

    {/* Geçim: meslek, temel işler, lonca */}
    <View style={{ marginTop: 8, flexDirection: yon(rtl), gap: 8 }}>
      {[
        { id: "meslek", icon: "anvil", baslik: t("onl.ms.ust"), alt: o.meslekDurumu?.kayit.a ? t("onl.mes." + o.meslekDurumu.kayit.a) : ben.yas < 13 ? t("onl.ya.hizliMeslekGenc") : t("onl.ya.hizliMeslekSec"), yol: "/online/meslek", vurgu: !o.meslekDurumu?.kayit.a && ben.yas >= 13 },
        { id: "isler", icon: "saw", baslik: t("onl.is.kisa"), alt: t("onl.ya.hizliIsler"), yol: "/online/isler" },
        { id: "lonca", icon: "banner", baslik: t("onl.lo.kisa"), alt: t("onl.ya.hizliLonca"), yol: "/online/lonca" },
      ].map((h) => <Pressable key={h.id} accessibilityLabel={`${h.baslik}: ${h.alt}`} onPress={() => { hap("tap"); router.push(h.yol); }} style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
        <Cerceve aktif={!!h.vurgu} ic={{ alignItems: "center", gap: 6, paddingVertical: 12, paddingHorizontal: 6, minHeight: 104 }}>
          <Madalyon icon={h.icon} size={38} aktif={!!h.vurgu} />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: dar ? 11.5 : 12.5, color: C.parchment, textAlign: "center" }}>{h.baslik}</Text>
          <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: dar ? 12.5 : 13.5, lineHeight: 17, color: h.vurgu ? C.goldBright : C.parchmentDim, textAlign: "center" }}>{h.alt}</Text>
        </Cerceve>
      </Pressable>)}
    </View>

    {/* Lonca siparişleri */}
    {(() => {
      const acikIlan = o.siparisler?.filter((x) => x.durum === "acik" && x.kalanAy > 0) ?? [];
      const verebilir = acikIlan.some((x) => x.teslimEdebilir);
      const alt = !o.siparisler ? t("onl.sp.yaAlt") : acikIlan.length ? applyParams(t("onl.sp.yaAcik"), [acikIlan.length]) : t("onl.sp.yaYok");
      return <Pressable accessibilityLabel={`${t("onl.sp.baslik")}: ${alt}`} onPress={() => { hap("tap"); router.push("/online/siparisler"); }}
        style={({ pressed }) => ({ marginTop: 8, transform: [{ scale: pressed ? 0.985 : 1 }] })}>
        <Cerceve aktif={verebilir} ic={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12, minHeight: 64 }}>
          <Madalyon icon="scroll-open" size={38} aktif={verebilir} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: 13.5, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.sp.baslik")}</Text>
            <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: verebilir ? C.goldBright : C.parchmentDim, textAlign: hiza(rtl) }}>{verebilir ? t("onl.sp.yaVerebilir") : alt}</Text>
          </View>
          {acikIlan.length ? <Rozet metin={String(acikIlan.length)} renk={C.goldBright} dolu={verebilir} /> : null}
        </Cerceve>
      </Pressable>;
    })()}

    {/* Yerleşim defteri */}
    <Baslik2 metin={t("onl.ya.defter")} rtl={rtl} sag={o.defterYeni > 0 ? <Rozet metin={applyParams(t("onl.ya.yeni"), [o.defterYeni])} renk={C.goldBright} dolu /> : undefined} />
    {gorunenDefter.length ? <Cerceve ic={{ paddingVertical: 4 }}>
      {gorunenDefter.map((ol, i) => {
        const yeni = o.defterOkunan >= 0 && ol.sira > o.defterOkunan;
        const kisi = olayKisisi(ol, ben.id);
        return <Pressable key={ol.sira} disabled={!kisi} accessibilityLabel={ozetYaz(ol.ozet, t, lang)} onPress={() => kisiyeGit(kisi)}
          style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 6, borderTopWidth: i ? 1 : 0, borderColor: "rgba(201,162,78,0.1)" }}>
          <GameIcon name={olayIkonu(ol)} size={16} color={yeni ? C.goldBright : C.goldDim} />
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: yeni ? C.parchment : C.parchmentDim, textAlign: hiza(rtl) }}>{ozetYaz(ol.ozet, t, lang)}</Text>
          {yeni ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.goldBright }} /> : null}
        </Pressable>;
      })}
    </Cerceve> : <BosKart icon="scroll-open" metin={o.islem === "olaylar" ? t("onl.yukleniyor") : t("onl.ya.defterBos")} rtl={rtl} />}
    <View style={{ marginTop: 10, gap: 8 }}>
      {yeniler.length > 8 ? <CizgiDugme etiket={t(tumDefter ? "onl.ya.daha.az" : "onl.ya.daha.cok")} rtl={rtl} kucuk onPress={() => setTumDefter((v) => !v)} /> : null}
      {o.defterDahaVar ? <CizgiDugme etiket={t("onl.ya.devami")} icon="scroll-open" rtl={rtl} kucuk kapali={o.islem === "olaylar"} onPress={() => { void o.olaylarYukle(true); }} /> : null}
    </View>
  </OnlineSayfa>;
}

export default function OnlineYasam() {
  return onlineEkranAcik() ? <OnlineKapisi><YasamEkran /></OnlineKapisi> : <OnlineYakinda />;
}
