// Tezgâh modeli Dilim 2 ekran parçaları (atölye): zanaat, tezgâhlar ve üretim emirleri, atölyede üretim, mesai ve emek
// havuzu (NPC emeği ve maaşsız NPC dökümü), depo, ay sonu üretim dökümü (kalite kalemleriyle), toplu siparişler ve teslim,
// genişletme (dükkânda da). Bütün sayılar sunucudan; istemci niyet gönderir (istekNo, çift dokunuş tek istek). Çekmece
// kapanıp yeniden açılınca eski isteğin sonucu yeni çekmeceye yazılmaz (`oturum`). İflas eden atölyede yazma kapalı.
import { useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../i18n";
import { C, F } from "../theme";
import { GameIcon } from "../icons";
import { hap } from "../haptics";
import { DesignPressable as Pressable } from "../design-pressable";
import type { Lang } from "../locale-data";
import { useOnline } from "./durum";
import { AltinDugme, BASMA_OLCEK, Cerceve, CizgiDugme, Doluluk, Madalyon, ONL, belir, giris, hiza, yon } from "./ui";
import { AltPanel, Baslik2, BosKart, Rozet } from "./yasam-ui";
import { KaliteRozeti, kaliteAdi, malAdi, malIkonu } from "./ekonomi-ui";
import { MESLEK_IKON, TARIF_IKON } from "./meslek-veri";
import { meslekYaz } from "./metin";
import { istekTekrarMi } from "./hata";
import { AdetSecici, AltBaslik, DepoOzeti, Not, Satir, Sonuc, useTekIstek } from "./tezgah-ui";
import type { EkSonuc } from "./ek-istemci";
import type { EmirDokumu, GenisletmeGorunumu, GunSonu, TezgahGorunumu, TopluSiparis, UretimEmri } from "./tezgah-veri";
import { MESAI_TEK_EN_COK, atolyeHataMetni, depodaToplam, zanaatTarifleri, type AtolyeIstemci } from "./atolye-veri";

type Ceviri = (k: string) => string;
type Tarif = ReturnType<typeof zanaatTarifleri>[number];
const ak = (t: Ceviri, n: number) => applyParams(t("onl.is.akce"), [n]);
/** Tarif adı: istemcide adı yazılmış tarif, yoksa çıktısının adı. */
function tarifAdi(t: Ceviri, id: string, mal?: string): string {
  const k = "onl.tarif." + id;
  const v = t(k);
  return v !== k ? v : mal ? malAdi(t, mal) : id;
}
const tarifIkonu = (id: string, mal?: string) => TARIF_IKON[id] ?? (mal ? malIkonu(mal) : "scroll-open");
const zanaatAdi = (m: string, lang: Lang) => meslekYaz(m, lang);
const zanaatIkonu = (m: string) => (MESLEK_IKON as Record<string, string>)[m] ?? "anvil";
/** Kalite kademelerine göre adet: "3 sade · 1 iyi" (yalnız sıfır olmayanlar). */
const kaliteAdetMetni = (t: Ceviri, k: readonly number[]) => k.map((n, i) => (n > 0 ? `${n} ${kaliteAdi(t, i)}` : null)).filter(Boolean).join(" · ");
/** Kalite kalemi adı ("kalite.atolye" → onl.atl.kk.atolye); bilinmeyen kalem sakin genel adla. */
function kalemAdi(t: Ceviri, k: string): string {
  const a = "onl.atl.kk." + k.replace(/^kalite\./, "");
  const v = t(a);
  return v !== a ? v : t("onl.atl.kk.diger");
}
const isaretli = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");
const aralik = (a: number, b: number) => (a === b ? isaretli(a) : `${isaretli(a)} … ${isaretli(b)}`);

// ---------------------------------------------------------------- küçük parçalar

/** Girdi çipi: mal, gereken ve depodaki adet (yetmiyorsa közle). */
function GirdiCipi({ mal, gereken, depoda, t }: { mal: string; gereken: number; depoda: number; t: Ceviri }) {
  const yeter = depoda >= gereken;
  return <View accessible accessibilityLabel={applyParams(t("onl.atl.girdiErisim"), [malAdi(t, mal), gereken, depoda])}
    style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1,
      borderColor: yeter ? "rgba(122,154,92,0.6)" : "rgba(200,90,64,0.6)", backgroundColor: "rgba(14,10,6,0.6)" }}>
    <GameIcon name={malIkonu(mal)} size={13} color={yeter ? C.sage : C.ember} />
    <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 11.5, color: C.parchment }}>{`${malAdi(t, mal)} ${depoda}/${gereken}`}</Text>
  </View>;
}

/** İki adımlı onay: önce düğme, sonra uyarı + "Onayla" / "Vazgeç". */
function OnayliDugme({ etiket, onayMetni, icon, rtl, t, kapali, bekliyor, onOnay }: {
  etiket: string; onayMetni: string; icon: string; rtl: boolean; t: Ceviri; kapali?: boolean; bekliyor: boolean; onOnay: () => void;
}) {
  const [soru, setSoru] = useState(false);
  useEffect(() => { if (kapali) setSoru(false); }, [kapali]);
  if (!soru) return <CizgiDugme etiket={etiket} icon={icon} rtl={rtl} kucuk kapali={kapali || bekliyor} onPress={() => { hap("tap"); setSoru(true); }} />;
  return <Animated.View entering={belir()} style={{ gap: 8 }}>
    <Not metin={onayMetni} rtl={rtl} icon="compass" renk={C.gold} />
    <View style={{ flexDirection: yon(rtl), gap: 8 }}>
      <View style={{ flex: 1 }}><AltinDugme etiket={t("onl.atl.onayla")} icon={icon} rtl={rtl} bekliyor={bekliyor} kapali={kapali} onPress={() => { setSoru(false); onOnay(); }} /></View>
      <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.atl.vazgec")} rtl={rtl} kapali={bekliyor} onPress={() => setSoru(false)} /></View>
    </View>
  </Animated.View>;
}

/** Yazma sonucu: başarı ya da kesin hata (geçici hata aynı istekNo ile yeniden denenir). */
function useYazma(oturum: number) {
  const yaz = useTekIstek();
  const { t } = useI18n();
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const oturumRef = useRef(oturum);
  oturumRef.current = oturum;
  useEffect(() => { setHata(null); setBilgi(null); }, [oturum]);
  const gonder = async <T,>(imza: string, f: (istekNo: string) => Promise<EkSonuc<T>>, onYenile: () => Promise<void> | void, basari: (v: T | null) => string): Promise<T | null> => {
    const bas = oturumRef.current;
    const r = await yaz.calistir(imza, async (istekNo) => {
      const s = await f(istekNo);
      if (s.ok || istekTekrarMi(s.hata)) await onYenile();
      return s;
    });
    if (!r || bas !== oturumRef.current) return null;
    if (r.ok || istekTekrarMi(r.hata)) {
      if (r.ok) hap("success");
      setHata(null);
      setBilgi(r.ok ? basari(r.deger) : t("onl.h.istekTekrar"));
      return r.ok ? r.deger : null;
    }
    hap("error"); setBilgi(null); setHata(atolyeHataMetni(t, r));
    return null;
  };
  const temizle = () => { setHata(null); setBilgi(null); };
  return { bekliyor: yaz.bekliyor, hata, bilgi, gonder, temizle };
}

// ---------------------------------------------------------------- genişletme (dükkân ve atölye)

export function GenisletmeKarti({ g, gn, ist, iflas, rtl, t, onYenile }: {
  g: TezgahGorunumu; gn: GenisletmeGorunumu; ist: AtolyeIstemci; iflas: boolean; rtl: boolean; t: Ceviri; onYenile: () => Promise<void> | void;
}) {
  const y = useYazma(0);
  const izin = !!g.izin.genislet;
  const s = gn.sonraki;
  const eksik = s ? s.malzeme.filter((m) => m.depoda < m.adet) : [];
  const neden = iflas ? t("onl.atl.h.isletme_kapali") : !izin ? t("onl.atl.genislet.yetkiYok") : eksik.length ? t("onl.atl.genislet.eksik") : null;
  return <Cerceve ic={{ padding: 12, gap: 8 }}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
      <Madalyon icon="house" size={38} aktif={!!s && !eksik.length} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: F.display, fontSize: 14.5, color: C.parchment, textAlign: hiza(rtl) }}>{applyParams(t("onl.atl.genislet.kademe"), [gn.kademe, gn.seviye])}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>
          {s ? applyParams(t(g.tur === "atolye" ? "onl.atl.genislet.hedefAtolye" : "onl.atl.genislet.hedefDukkan"), [s.hedef]) : t("onl.atl.genislet.yetisti")}
        </Text>
      </View>
    </View>
    {s ? <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
      {s.malzeme.map((m) => <GirdiCipi key={m.mal} mal={m.mal} gereken={m.adet} depoda={m.depoda} t={t} />)}
    </View> : null}
    {s && eksik.length ? <Not metin={applyParams(t("onl.atl.genislet.eksikListe"), [eksik.map((m) => `${m.adet - m.depoda} ${malAdi(t, m.mal)}`).join(", ")])} rtl={rtl} /> : null}
    <Sonuc hata={y.hata} bilgi={y.bilgi} rtl={rtl} />
    {s ? (neden ? <Not metin={neden} rtl={rtl} /> : <OnayliDugme etiket={t("onl.atl.genislet.dugme")} icon="house" rtl={rtl} t={t} bekliyor={y.bekliyor}
      onayMetni={applyParams(t("onl.atl.genislet.onay"), [s.malzeme.map((m) => `${m.adet} ${malAdi(t, m.mal)}`).join(", ")])}
      onOnay={() => { void y.gonder(`genislet|${gn.kademe}`, (istekNo) => ist.genislet(g.isletme, { istekNo }), onYenile,
        (v) => (v ? applyParams(t("onl.atl.genislet.tamam"), [v.genisletme.kademe, v.genisletme.depoKapasite]) : t("onl.atl.genislet.tamamKisa"))); }} />) : null}
  </Cerceve>;
}

// ---------------------------------------------------------------- ay sonu üretim dökümü

function KaliteDokumu({ d, t, rtl }: { d: NonNullable<EmirDokumu["kaliteDokum"]>; t: Ceviri; rtl: boolean }) {
  return <View accessible style={{ gap: 2, paddingTop: 4 }}>
    {d.kalemler.map((x) => <Satir key={x.k} etiket={kalemAdi(t, x.k)} deger={aralik(x.enAz, x.enCok)} renk={x.enCok < 0 ? C.ember : x.enAz > 0 ? C.sage : C.parchmentDim} rtl={rtl} />)}
    <Satir etiket={t("onl.atl.gs.kaliteToplam")} deger={d.toplam.enAz === d.toplam.enCok ? String(d.toplam.enAz) : `${d.toplam.enAz} … ${d.toplam.enCok}`} renk={C.goldBright} rtl={rtl} />
  </View>;
}

function EmirDokumSatiri({ x, t, rtl }: { x: EmirDokumu; t: Ceviri; rtl: boolean }) {
  const [acik, setAcik] = useState(false);
  const neden = x.neden ? (() => { const k = "onl.atl.neden." + x.neden; const v = t(k); return v === k ? t("onl.atl.neden.diger") : v; })() : null;
  const kalite = kaliteAdetMetni(t, x.kalite);
  return <View style={{ gap: 3, paddingTop: 8, borderTopWidth: 1, borderColor: "rgba(201,162,78,0.14)" }}>
    <View accessible style={{ gap: 3 }}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
        <GameIcon name={tarifIkonu(x.tarif, x.cikti.mal)} size={15} color={C.goldBright} />
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.display, fontSize: 13.5, color: C.parchment, textAlign: hiza(rtl) }}>{tarifAdi(t, x.tarif, x.cikti.mal)}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 13.5, color: x.cikti.adet ? C.sage : C.parchmentMuted }}>{x.cikti.adet ? `+${x.cikti.adet}` : "·"}</Text>
      </View>
      <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>
        {applyParams(t("onl.atl.gs.emirSatir"), [x.buAy, x.yapilan, x.kez, x.cikti.adet, malAdi(t, x.cikti.mal)])}
      </Text>
      {kalite ? <Text style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 17, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.atl.gs.kalite"), [kalite])}</Text> : null}
      {x.usta || x.emek.oyuncu || x.emek.npc ? <Text style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 17, color: C.parchmentMuted, textAlign: hiza(rtl) }}>
        {applyParams(t(x.usta ? "onl.atl.gs.ustaEmek" : "onl.atl.gs.emek"), [x.usta?.ad ?? "", x.emek.oyuncu, x.emek.npc])}
      </Text> : null}
      {neden ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.gold, textAlign: hiza(rtl) }}>{neden}</Text> : null}
    </View>
    {x.kaliteDokum ? <Pressable accessibilityRole="button" accessibilityState={{ expanded: acik }} accessibilityLabel={t(acik ? "onl.atl.gs.kaliteGizle" : "onl.atl.gs.kaliteGoster")}
      onPress={() => { hap("selection"); setAcik(!acik); }} style={{ minHeight: 44, flexDirection: yon(rtl), alignItems: "center", gap: 6 }}>
      <GameIcon name="star" size={13} color={C.gold} />
      <Text style={{ flex: 1, fontFamily: F.display, fontSize: 12, color: C.gold, textAlign: hiza(rtl) }}>{t(acik ? "onl.atl.gs.kaliteGizle" : "onl.atl.gs.kaliteGoster")}</Text>
    </Pressable> : null}
    {acik && x.kaliteDokum ? <Animated.View entering={belir()}><KaliteDokumu d={x.kaliteDokum} t={t} rtl={rtl} /></Animated.View> : null}
  </View>;
}

export function AtolyeGunSonuKarti({ gs, t, rtl }: { gs: GunSonu | null | undefined; t: Ceviri; rtl: boolean }) {
  const [acik, setAcik] = useState(false);
  if (!gs) return <BosKart icon="hourglass" metin={t("onl.atl.gs.yok")} rtl={rtl} />;
  if (gs.ertelendi) return <BosKart icon="hourglass" metin={t("onl.tz.gs.ertelendi")} rtl={rtl} />;
  const emirler = gs.emirler ?? [];
  const npc = gs.npc;
  return <Cerceve ic={{ padding: 12, gap: 8 }}>
    <AltBaslik metin={applyParams(t("onl.atl.gs.baslik"), [gs.ay])} rtl={rtl} />
    {gs.kepenk ? <Not metin={t("onl.atl.gs.kepenk")} rtl={rtl} icon="leaf" renk={C.parchmentDim} />
      : <Satir etiket={t("onl.atl.gs.yapim")} deger={String(gs.yapim ?? 0)} renk={C.goldBright} rtl={rtl} />}
    {gs.anlik ? <Not metin={t("onl.atl.gs.anlik")} rtl={rtl} icon="anvil" renk={C.sage} /> : null}
    {gs.emek ? <>
      <Satir etiket={t("onl.atl.gs.havuz")} deger={`${gs.emek.oyuncuOnce} → ${gs.emek.oyuncuSonra}`} rtl={rtl} />
      {gs.emek.npcVerilen > 0 ? <Satir etiket={t("onl.atl.gs.npcEmek")} deger={`${gs.emek.npcKullanilan}/${gs.emek.npcVerilen}`} rtl={rtl} /> : null}
    </> : null}
    {npc && npc.maassiz > 0 ? <Not metin={applyParams(t("onl.atl.npc.maassizGecen"), [npc.maassiz])} rtl={rtl} icon="coins" renk={C.emberSoft} /> : null}
    {emirler.length ? <Pressable accessibilityRole="button" accessibilityState={{ expanded: acik }} accessibilityLabel={t(acik ? "onl.tz.gs.gizle" : "onl.tz.gs.dokum")}
      onPress={() => { hap("selection"); setAcik(!acik); }} style={{ minHeight: 44, flexDirection: yon(rtl), alignItems: "center", gap: 6 }}>
      <GameIcon name="scroll" size={14} color={C.gold} />
      <Text style={{ flex: 1, fontFamily: F.display, fontSize: 12.5, color: C.gold, textAlign: hiza(rtl) }}>{t(acik ? "onl.tz.gs.gizle" : "onl.tz.gs.dokum")}</Text>
    </Pressable> : !gs.kepenk ? null : <Not metin={t("onl.atl.gs.emirYok")} rtl={rtl} />}
    {acik ? emirler.map((x) => <Animated.View key={x.emir} entering={belir()}><EmirDokumSatiri x={x} t={t} rtl={rtl} /></Animated.View>) : null}
  </Cerceve>;
}

// ---------------------------------------------------------------- tezgâhlar ve emirler

function EmirKarti({ e, tf, izin, iflas, bekliyor, rtl, t, onIptal }: {
  e: UretimEmri; tf: Tarif | undefined; izin: boolean; iflas: boolean; bekliyor: boolean; rtl: boolean; t: Ceviri; onIptal: () => void;
}) {
  const ad = tarifAdi(t, e.tarif, tf?.cikti.mal);
  return <Cerceve aktif ic={{ padding: 12, gap: 8 }}>
    <View accessible accessibilityLabel={`${ad}. ${applyParams(t("onl.atl.emir.ilerleme"), [e.yapilan, e.kez])}. ${applyParams(t("onl.atl.emir.acan"), [e.acan.ad, e.acilis])}`}
      style={{ gap: 6 }}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
        <Madalyon icon={tarifIkonu(e.tarif, tf?.cikti.mal)} size={38} aktif />
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: 14.5, color: C.parchment, textAlign: hiza(rtl) }}>{ad}</Text>
          <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 12.5, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{applyParams(t("onl.atl.emir.acan"), [e.acan.ad, e.acilis])}</Text>
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 15, color: C.goldBright }}>{`${e.yapilan}/${e.kez}`}</Text>
      </View>
      <Doluluk nufus={e.yapilan} kapasite={Math.max(1, e.kez)} rtl={rtl} ince />
      <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.atl.emir.kalan"), [e.kalan])}</Text>
    </View>
    {izin ? <OnayliDugme etiket={t("onl.atl.emir.iptal")} onayMetni={t("onl.atl.emir.iptalOnay")} icon="scroll" rtl={rtl} t={t} kapali={iflas} bekliyor={bekliyor} onOnay={onIptal} /> : null}
  </Cerceve>;
}

function BosTezgah({ t, rtl, kapali, neden, onPress }: { t: Ceviri; rtl: boolean; kapali: boolean; neden: string | null; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={t("onl.atl.emir.ac")} accessibilityHint={neden ?? t("onl.atl.emir.acIpucu")} accessibilityState={{ disabled: kapali }} disabled={kapali}
    onPress={() => { hap("tap"); onPress(); }}
    style={({ pressed }) => ({ minHeight: 64, flexDirection: yon(rtl), alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1.5, borderStyle: "dashed",
      borderColor: "rgba(201,162,78,0.45)", backgroundColor: pressed ? "rgba(201,162,78,0.14)" : "rgba(14,10,6,0.5)", opacity: kapali ? 0.55 : 1, transform: [{ scale: pressed ? BASMA_OLCEK : 1 }] })}>
    <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: ONL.frame, alignItems: "center", justifyContent: "center" }}>
      <GameIcon name="anvil" size={16} color={C.goldBright} />
    </View>
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ fontFamily: F.display, fontSize: 13.5, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.atl.emir.bosTezgah")}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 17, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{neden ?? t("onl.atl.emir.acIpucu")}</Text>
    </View>
  </Pressable>;
}

// ---------------------------------------------------------------- tarif seçimi (üretim ve emir çekmecesi)

function TarifSecimi({ tarifler, g, secili, onSec, rtl, t }: { tarifler: Tarif[]; g: TezgahGorunumu; secili: string | null; onSec: (id: string) => void; rtl: boolean; t: Ceviri }) {
  if (!tarifler.length) return <BosKart icon="scroll-open" metin={t("onl.atl.tarifYok")} rtl={rtl} />;
  return <View style={{ gap: 8 }}>
    {tarifler.map((tf) => {
      const s = secili === tf.id;
      const ad = tarifAdi(t, tf.id, tf.cikti.mal);
      const girdi = Object.entries(tf.girdi).filter(([, n]) => n > 0);
      return <Pressable key={tf.id} accessibilityRole="radio" accessibilityState={{ selected: s }}
        accessibilityLabel={[ad, applyParams(t("onl.atl.tarifCikti"), [tf.cikti.adet, malAdi(t, tf.cikti.mal)]), tf.acik === false ? t("onl.atl.tarifKapali") : null].filter(Boolean).join(". ")}
        onPress={() => { if (!s) { hap("selection"); onSec(tf.id); } }}
        style={({ pressed }) => ({ gap: 6, padding: 10, borderRadius: 10, borderWidth: s ? 1.5 : 1, borderColor: s ? C.goldBright : "rgba(168,130,63,0.45)",
          backgroundColor: s ? "rgba(90,64,24,0.55)" : pressed ? "rgba(201,162,78,0.12)" : "rgba(14,10,6,0.58)", opacity: tf.acik === false ? 0.6 : 1, minHeight: 44 })}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
          <GameIcon name={tarifIkonu(tf.id, tf.cikti.mal)} size={17} color={s ? C.goldBright : C.gold} />
          <Text numberOfLines={2} style={{ flex: 1, fontFamily: F.display, fontSize: 13.5, color: C.parchment, textAlign: hiza(rtl) }}>{ad}</Text>
          <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 12.5, color: C.parchmentDim }}>{applyParams(t("onl.atl.tarifCikti"), [tf.cikti.adet, malAdi(t, tf.cikti.mal)])}</Text>
        </View>
        {girdi.length ? <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
          {girdi.map(([m, n]) => <GirdiCipi key={m} mal={m} gereken={n} depoda={depodaToplam(g, m)} t={t} />)}
        </View> : <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.atl.girdisiz")}</Text>}
        <Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentMuted, textAlign: hiza(rtl) }}>
          {[applyParams(t("onl.atl.tarifTakat"), [tf.takat]), tf.arac ? applyParams(t("onl.atl.tarifArac"), [malAdi(t, tf.arac.mal), depodaToplam(g, tf.arac.mal)]) : null, tf.acik === false ? t("onl.atl.tarifKapali") : null].filter(Boolean).join(" · ")}
        </Text>
      </Pressable>;
    })}
  </View>;
}

// ---------------------------------------------------------------- atölye bölümü

type Cekmece = "zanaat" | "uret" | "emir" | "mesai";

export function AtolyeBolumu({ g, ist, iflas, yonetici, rtl, t, onYenile, onDepo, onPersonel }: {
  g: TezgahGorunumu; ist: AtolyeIstemci; iflas: boolean; yonetici: boolean; rtl: boolean; t: Ceviri;
  onYenile: () => Promise<void> | void; onDepo: () => void; onPersonel?: () => void;
}) {
  const { lang } = useI18n();
  const o = useOnline();
  const a = g.atolye;
  const acilis = useRef(0);
  const [cek, setCek] = useState<{ tur: Cekmece; oturum: number } | null>(null);
  const ac = (tur: Cekmece) => setCek({ tur, oturum: ++acilis.current });
  const kapat = () => setCek(null);
  const emirY = useYazma(0);
  const topluY = useYazma(0);
  const [topluNo, setTopluNo] = useState<string | null>(null);
  if (!a) return <View style={{ gap: 10 }}>
    <Baslik2 metin={t("onl.tz.depo")} rtl={rtl} ust={10} />
    <DepoOzeti g={g} t={t} rtl={rtl} onAc={onDepo} />
    <Not metin={t("onl.atl.eskiSunucu")} rtl={rtl} />
  </View>;
  const tarifler = zanaatTarifleri(o.tarifler, a.zanaat);
  const tfBul = (id: string) => tarifler.find((x) => x.id === id);
  const iz = g.izin;
  const bosTezgah = Math.max(0, a.tezgah.sayi - a.emirler.length);
  const emirNeden = iflas ? t("onl.atl.h.isletme_kapali") : !iz.emir ? t("onl.atl.emir.yetkiYok") : !a.zanaat ? t("onl.atl.zanaatOnce") : null;
  const npc = a.emek.npc;

  return <View style={{ gap: 10 }}>
    {iflas ? <Cerceve ic={{ padding: 12, gap: 6 }}>
      <Not metin={t("onl.atl.iflas")} rtl={rtl} icon="leaf" renk={C.parchment} />
      <Not metin={t("onl.atl.iflasNot")} rtl={rtl} />
    </Cerceve> : null}

    {/* zanaat */}
    <Baslik2 metin={t("onl.atl.zanaat")} rtl={rtl} ust={10} />
    <Animated.View entering={giris(30)}>
      <Cerceve ic={{ padding: 12, gap: 8 }}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
          <Madalyon icon={a.zanaat ? zanaatIkonu(a.zanaat) : "anvil"} size={42} aktif={!!a.zanaat} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchment, textAlign: hiza(rtl) }}>{a.zanaat ? zanaatAdi(a.zanaat, lang) : t("onl.atl.zanaatSecilmedi")}</Text>
            <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>
              {a.zanaat ? applyParams(t("onl.atl.zanaatNot"), [a.kaliteBonus]) : a.zanaatOneri ? applyParams(t("onl.atl.zanaatOneri"), [zanaatAdi(a.zanaatOneri, lang)]) : t("onl.atl.zanaatAciklama")}
            </Text>
          </View>
        </View>
        {iz.zanaat ? <CizgiDugme etiket={t(a.zanaat ? "onl.atl.zanaatDegistir" : "onl.atl.zanaatSec")} icon="anvil" rtl={rtl} kucuk kapali={iflas} onPress={() => ac("zanaat")} />
          : !a.zanaat ? <Not metin={t("onl.atl.zanaatSahibe")} rtl={rtl} /> : null}
      </Cerceve>
    </Animated.View>

    {/* tezgâhlar ve emirler */}
    <Baslik2 metin={t("onl.atl.tezgahlar")} rtl={rtl} ust={10}
      sag={<Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchmentDim }}>{applyParams(t("onl.atl.tezgahSayi"), [a.tezgah.acikEmir, a.tezgah.sayi])}</Text>} />
    <Not metin={t("onl.atl.emirAciklama")} rtl={rtl} />
    {a.emirler.map((e) => <Animated.View key={e.no} entering={belir()}>
      <EmirKarti e={e} tf={tfBul(e.tarif)} izin={!!iz.emir} iflas={iflas} bekliyor={emirY.bekliyor} rtl={rtl} t={t}
        onIptal={() => { void emirY.gonder(`iptal|${e.no}`, (istekNo) => ist.emir(g.isletme, { islem: "iptal", emir: e.no, istekNo }), onYenile,
          () => applyParams(t("onl.atl.emir.iptalTamam"), [tarifAdi(t, e.tarif, tfBul(e.tarif)?.cikti.mal)])); }} />
    </Animated.View>)}
    {Array.from({ length: bosTezgah }, (_, i) => <BosTezgah key={"b" + i} t={t} rtl={rtl} kapali={!!emirNeden} neden={emirNeden} onPress={() => ac("emir")} />)}
    {!a.emirler.length && !bosTezgah ? <BosKart icon="anvil" metin={t("onl.atl.tezgahYok")} rtl={rtl} /> : null}
    <Sonuc hata={emirY.hata} bilgi={emirY.bilgi} rtl={rtl} />
    {iz.uret ? <CizgiDugme etiket={t("onl.atl.uret.ac")} icon="anvil" rtl={rtl} kucuk kapali={iflas || !a.zanaat} onPress={() => ac("uret")} /> : null}
    {iz.uret && !a.zanaat ? <Not metin={t("onl.atl.zanaatOnce")} rtl={rtl} /> : null}

    {/* emek havuzu */}
    <Baslik2 metin={t("onl.atl.emek")} rtl={rtl} ust={10} />
    <Cerceve ic={{ padding: 12, gap: 8 }}>
      <Satir etiket={t("onl.atl.havuz")} deger={`${a.emek.havuz}/${a.emek.tavan}`} renk={a.emek.havuz >= a.emek.tavan ? C.gold : C.parchment} rtl={rtl} />
      <Doluluk nufus={a.emek.havuz} kapasite={Math.max(1, a.emek.tavan)} rtl={rtl} />
      <Satir etiket={t("onl.atl.benimTakat")} deger={String(a.benimTakat)} rtl={rtl} />
      <Satir etiket={t("onl.atl.npcEmek")} deger={applyParams(t("onl.atl.npcEmekDeger"), [a.emek.npcCalisan, a.emek.npcAylik])} rtl={rtl} />
      {npc && npc.maassiz > 0 ? <Not metin={applyParams(t(npc.neden === "emanet_maas_yetmez" ? "onl.atl.npc.maassizEmanet" : "onl.atl.npc.maassiz"), [npc.maassiz, npc.sozlesme])} rtl={rtl} icon="coins" renk={C.emberSoft} /> : null}
      <Not metin={applyParams(t("onl.atl.emekSira"), [a.emek.npcKaliteCeza])} rtl={rtl} />
      {iz.mesai ? <CizgiDugme etiket={t("onl.atl.mesai.ac")} icon="flame" rtl={rtl} kucuk kapali={iflas} onPress={() => ac("mesai")} /> : null}
      {yonetici && onPersonel ? <>
        <Not metin={applyParams(t("onl.atl.npc.iseAlNot"), [a.emek.npcMaasEnAz])} rtl={rtl} />
        <CizgiDugme etiket={t("onl.atl.npc.iseAl")} icon="hood" rtl={rtl} kucuk kapali={iflas} onPress={onPersonel} />
      </> : null}
    </Cerceve>

    {/* depo */}
    <Baslik2 metin={t("onl.tz.depo")} rtl={rtl} ust={10} />
    <DepoOzeti g={g} t={t} rtl={rtl} onAc={onDepo} />

    {/* ay sonu dökümü */}
    <Baslik2 metin={t("onl.atl.gs.bolum")} rtl={rtl} ust={10} />
    <AtolyeGunSonuKarti gs={g.gunSonu} t={t} rtl={rtl} />

    {/* toplu siparişler */}
    <Baslik2 metin={t("onl.atl.toplu.baslik")} rtl={rtl} ust={10} />
    <Not metin={t("onl.atl.toplu.aciklama")} rtl={rtl} />
    {a.topluSiparis.length ? a.topluSiparis.map((s) => <TopluKarti key={s.id} s={s} lang={lang} rtl={rtl} t={t} izin={!!iz.toplu} iflas={iflas}
      bekliyor={topluY.bekliyor && topluNo === s.id}
      onTeslim={() => { setTopluNo(s.id); void topluY.gonder(`toplu|${s.id}`, (istekNo) => ist.toplu(g.isletme, { siparis: s.id, istekNo }), onYenile,
        (v) => (v ? applyParams(t("onl.atl.toplu.tamam"), [v.toplu.adet, malAdi(t, v.toplu.mal), v.toplu.kasaya]) : t("onl.atl.toplu.tamamKisa"))); }} />)
      : <BosKart icon="scroll" metin={t("onl.atl.toplu.yok")} rtl={rtl} />}
    <Sonuc hata={topluY.hata} bilgi={topluY.bilgi} rtl={rtl} />

    {/* genişletme */}
    {g.genisletme ? <>
      <Baslik2 metin={t("onl.atl.genislet.baslik")} rtl={rtl} ust={10} />
      <GenisletmeKarti g={g} gn={g.genisletme} ist={ist} iflas={iflas} rtl={rtl} t={t} onYenile={onYenile} />
    </> : null}

    {/* çekmeceler */}
    <ZanaatCekmecesi acik={cek?.tur === "zanaat"} oturum={cek?.oturum ?? 0} g={g} ist={ist} onKapat={kapat} onYenile={onYenile} rtl={rtl} t={t} />
    <UretCekmecesi acik={cek?.tur === "uret"} oturum={cek?.oturum ?? 0} g={g} tarifler={tarifler} ist={ist} iflas={iflas} onKapat={kapat} onYenile={onYenile} rtl={rtl} t={t} />
    <EmirCekmecesi acik={cek?.tur === "emir"} oturum={cek?.oturum ?? 0} g={g} tarifler={tarifler} ist={ist} iflas={iflas} onKapat={kapat} onYenile={onYenile} rtl={rtl} t={t} />
    <MesaiCekmecesi acik={cek?.tur === "mesai"} oturum={cek?.oturum ?? 0} g={g} ist={ist} iflas={iflas} onKapat={kapat} onYenile={onYenile} rtl={rtl} t={t} />
  </View>;
}

/** Toplu sipariş kartı; `salt` (çarşı listesi) yalnız gösterir, teslim atölye ekranındadır. */
export function TopluKarti({ s, lang, rtl, t, izin, iflas, bekliyor, onTeslim, salt = false }: {
  s: TopluSiparis; lang: Lang; rtl: boolean; t: Ceviri; izin: boolean; iflas: boolean; bekliyor: boolean; onTeslim: () => void; salt?: boolean;
}) {
  const acik = s.durum === "acik" && s.kalanAy > 0;
  const carpan = s.odulDokum.kalemler.find((x) => x.k === "toplu_carpani")?.d ?? 0;
  const neden = !acik ? null : iflas ? t("onl.atl.h.isletme_kapali") : !izin ? t("onl.atl.toplu.yetkiYok") : s.ustUste ? t("onl.atl.h.ust_uste")
    : s.depoda !== undefined && s.depoda < s.adet ? applyParams(t("onl.atl.toplu.eksik"), [s.adet - s.depoda, malAdi(t, s.mal)])
    : s.teslimEdebilir === false ? applyParams(t("onl.atl.toplu.zanaatDisi"), [zanaatAdi(s.meslek, lang)]) : null;
  return <Animated.View entering={belir()}>
    <Cerceve aktif={acik && !!s.teslimEdebilir} ic={{ padding: 12, gap: 8 }}>
      <View accessible style={{ gap: 6 }}>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10 }}>
          <Madalyon icon={malIkonu(s.mal)} size={38} aktif={acik} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: 14.5, color: C.parchment, textAlign: hiza(rtl) }}>{applyParams(t("onl.atl.toplu.istek"), [s.adet, malAdi(t, s.mal)])}</Text>
            <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 12.5, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{zanaatAdi(s.meslek, lang)}</Text>
          </View>
          <Text style={{ fontFamily: F.display, fontSize: 15, color: C.goldBright }}>{ak(t, s.odul)}</Text>
        </View>
        <Text style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 17, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.atl.toplu.odulDokum"), [s.deger, carpan])}</Text>
        <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
          <Rozet icon={acik ? "hourglass" : "shield"} metin={acik ? applyParams(t("onl.atl.toplu.kalanAy"), [s.kalanAy]) : t(s.alan ? "onl.atl.toplu.teslimEdildi" : "onl.atl.toplu.kapandi")} renk={acik ? C.gold : C.parchmentMuted} />
          {s.depoda !== undefined && acik ? <Rozet icon="backpack" metin={applyParams(t("onl.atl.toplu.depoda"), [s.depoda, s.adet])} renk={s.depoda >= s.adet ? C.sage : C.parchmentMuted} /> : null}
        </View>
        {s.alan ? <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, color: C.gold, textAlign: hiza(rtl) }}>{applyParams(t("onl.atl.toplu.alan"), [s.alan.ad || t("onl.mk.tur.atolye")])}</Text> : null}
      </View>
      {acik && salt && s.teslimEdebilir ? <Not metin={t("onl.atl.toplu.atolyendenTeslim")} rtl={rtl} icon="anvil" renk={C.sage} /> : null}
      {acik && !salt ? (neden ? <Not metin={neden} rtl={rtl} /> : <AltinDugme etiket={t("onl.atl.toplu.teslim")} icon="medal" rtl={rtl} bekliyor={bekliyor} onPress={onTeslim}
        erisim={applyParams(t("onl.atl.toplu.teslimErisim"), [s.adet, malAdi(t, s.mal), s.odul])} />) : null}
    </Cerceve>
  </Animated.View>;
}

// ---------------------------------------------------------------- çekmeceler

function ZanaatCekmecesi({ acik, oturum, g, ist, onKapat, onYenile, rtl, t }: {
  acik: boolean; oturum: number; g: TezgahGorunumu; ist: AtolyeIstemci; onKapat: () => void; onYenile: () => Promise<void> | void; rtl: boolean; t: Ceviri;
}) {
  const { lang } = useI18n();
  const a = g.atolye!;
  const y = useYazma(oturum);
  const [sec, setSec] = useState<string | null>(null);
  useEffect(() => { if (acik) setSec(a.zanaat ?? a.zanaatOneri ?? null); }, [acik, oturum]); // eslint-disable-line react-hooks/exhaustive-deps
  const degisim = !!a.zanaat && !!sec && sec !== a.zanaat;
  const neden = !sec ? t("onl.atl.zanaatSecIpucu") : sec === a.zanaat ? t("onl.atl.zanaatAyni") : degisim && a.emirler.length ? t("onl.atl.h.emir_acik") : null;
  const bedelNot = !a.zanaat ? t("onl.atl.zanaatIlk") : a.zanaatDegisim.ucretsizKalan > 0 ? applyParams(t("onl.atl.zanaatUcretsiz"), [a.zanaatDegisim.ucretsizKalan])
    : applyParams(t("onl.atl.zanaatBedel"), [a.zanaatDegisim.bedel]);
  return <AltPanel acik={acik} onKapat={onKapat} etiket={t("onl.atl.zanaat")} rtl={rtl} t={t}>
    <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 17, color: C.parchment, textAlign: hiza(rtl), paddingEnd: 36 }}>{t("onl.atl.zanaat")}</Text>
    <Not metin={t("onl.atl.zanaatAciklama")} rtl={rtl} />
    <View accessibilityRole="radiogroup" style={{ gap: 6 }}>
      {a.zanaatlar.map((m) => {
        const s = sec === m;
        return <Pressable key={m} accessibilityRole="radio" accessibilityState={{ selected: s }} accessibilityLabel={zanaatAdi(m, lang) + (m === a.zanaat ? `. ${t("onl.atl.zanaatSimdiki")}` : "")}
          onPress={() => { if (!s) { hap("selection"); setSec(m); y.temizle(); } }}
          style={({ pressed }) => ({ minHeight: 48, flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: s ? 1.5 : 1,
            borderColor: s ? C.goldBright : "rgba(168,130,63,0.45)", backgroundColor: s ? "rgba(90,64,24,0.55)" : pressed ? "rgba(201,162,78,0.12)" : "rgba(14,10,6,0.58)" })}>
          <GameIcon name={zanaatIkonu(m)} size={17} color={s ? C.goldBright : C.gold} />
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.display, fontSize: 14, color: C.parchment, textAlign: hiza(rtl) }}>{zanaatAdi(m, lang)}</Text>
          {m === a.zanaat ? <Rozet metin={t("onl.atl.zanaatSimdiki")} renk={C.sage} /> : m === a.zanaatOneri ? <Rozet metin={t("onl.atl.zanaatOnerilen")} /> : null}
        </Pressable>;
      })}
    </View>
    <Not metin={bedelNot} rtl={rtl} icon="coins" renk={a.zanaatDegisim.ucretsizKalan > 0 || !a.zanaat ? C.parchmentMuted : C.gold} />
    <Sonuc hata={y.hata} bilgi={y.bilgi} rtl={rtl} />
    {neden && sec ? <Not metin={neden} rtl={rtl} /> : null}
    <AltinDugme etiket={t(a.zanaat ? "onl.atl.zanaatDegistir" : "onl.atl.zanaatSec")} icon="anvil" rtl={rtl} kapali={!!neden} bekliyor={y.bekliyor}
      erisim={[t(a.zanaat ? "onl.atl.zanaatDegistir" : "onl.atl.zanaatSec"), neden].filter(Boolean).join(". ")}
      onPress={() => { const m = sec; if (!m || neden) return; void y.gonder(`zanaat|${m}`, (istekNo) => ist.zanaat(g.isletme, { meslek: m, istekNo }), onYenile,
        (v) => (v && v.zanaat.bedel > 0 ? applyParams(t("onl.atl.zanaatTamamBedel"), [zanaatAdi(v.zanaat.meslek, lang), v.zanaat.bedel]) : applyParams(t("onl.atl.zanaatTamam"), [zanaatAdi(v?.zanaat.meslek ?? m, lang)]))); }} />
  </AltPanel>;
}

function UretCekmecesi({ acik, oturum, g, tarifler, ist, iflas, onKapat, onYenile, rtl, t }: {
  acik: boolean; oturum: number; g: TezgahGorunumu; tarifler: Tarif[]; ist: AtolyeIstemci; iflas: boolean; onKapat: () => void; onYenile: () => Promise<void> | void; rtl: boolean; t: Ceviri;
}) {
  const a = g.atolye!;
  const y = useYazma(oturum);
  const [sec, setSec] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<{ mal: string; adet: number; kademe: number | null; levha: boolean } | null>(null);
  useEffect(() => { if (acik) { setSec(null); setSonuc(null); } }, [acik, oturum]);
  const tf = tarifler.find((x) => x.id === sec);
  const eksik = tf ? Object.entries(tf.girdi).filter(([m, n]) => depodaToplam(g, m) < n) : [];
  const neden = iflas ? t("onl.atl.h.isletme_kapali") : !g.izin.uret ? t("onl.atl.uret.yetkiYok") : !tf ? t("onl.atl.uret.sec")
    : tf.acik === false ? t("onl.atl.tarifKapaliUzun") : eksik.length ? applyParams(t("onl.atl.uret.eksik"), [eksik.map(([m, n]) => `${n - depodaToplam(g, m)} ${malAdi(t, m)}`).join(", ")])
    : a.benimTakat < tf.takat ? applyParams(t("onl.atl.uret.takat"), [tf.takat, a.benimTakat]) : null;
  return <AltPanel acik={acik} onKapat={onKapat} etiket={t("onl.atl.uret.baslik")} rtl={rtl} t={t}>
    <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 17, color: C.parchment, textAlign: hiza(rtl), paddingEnd: 36 }}>{t("onl.atl.uret.baslik")}</Text>
    <Not metin={applyParams(t("onl.atl.uret.aciklama"), [a.kaliteBonus])} rtl={rtl} />
    <Satir etiket={t("onl.atl.benimTakat")} deger={String(a.benimTakat)} rtl={rtl} />
    <TarifSecimi tarifler={tarifler} g={g} secili={sec} onSec={(id) => { setSec(id); y.temizle(); setSonuc(null); }} rtl={rtl} t={t} />
    {sonuc ? <Animated.View entering={belir()} accessibilityLiveRegion="polite" style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: ONL.frameHi, backgroundColor: "rgba(30,44,22,0.6)" }}>
      <Madalyon icon={malIkonu(sonuc.mal)} size={40} aktif />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontFamily: F.display, fontSize: 15, color: C.goldBright, textAlign: hiza(rtl) }}>{applyParams(t("onl.is.cikti"), [sonuc.adet, malAdi(t, sonuc.mal)])}</Text>
        {sonuc.kademe !== null ? <View style={{ flexDirection: yon(rtl) }}><KaliteRozeti kademe={sonuc.kademe} /></View> : null}
        {sonuc.levha ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.atl.uret.levha")}</Text> : null}
      </View>
    </Animated.View> : <Sonuc hata={y.hata} bilgi={y.bilgi} rtl={rtl} />}
    {sonuc && y.hata ? <Sonuc hata={y.hata} bilgi={null} rtl={rtl} /> : null}
    {neden && sec ? <Not metin={neden} rtl={rtl} /> : null}
    <AltinDugme etiket={t("onl.atl.uret.dugme")} icon="anvil" rtl={rtl} kapali={!!neden} bekliyor={y.bekliyor}
      erisim={[t("onl.atl.uret.dugme"), neden].filter(Boolean).join(". ")}
      onPress={() => { if (!tf || neden) return; const id = tf.id; void y.gonder(`uret|${id}`, (istekNo) => ist.uret(g.isletme, { tarif: id, istekNo }), onYenile, (v) => {
        if (v) setSonuc({ mal: v.uretim.cikti.mal, adet: v.uretim.cikti.adet, kademe: typeof v.uretim.kalite?.kademe === "number" ? v.uretim.kalite.kademe : null, levha: v.uretim.levha });
        return v ? applyParams(t("onl.atl.uret.tamam"), [v.uretim.cikti.adet, malAdi(t, v.uretim.cikti.mal)]) : t("onl.atl.uret.tamamKisa");
      }); }} />
  </AltPanel>;
}

function EmirCekmecesi({ acik, oturum, g, tarifler, ist, iflas, onKapat, onYenile, rtl, t }: {
  acik: boolean; oturum: number; g: TezgahGorunumu; tarifler: Tarif[]; ist: AtolyeIstemci; iflas: boolean; onKapat: () => void; onYenile: () => Promise<void> | void; rtl: boolean; t: Ceviri;
}) {
  const a = g.atolye!;
  const y = useYazma(oturum);
  const [sec, setSec] = useState<string | null>(null);
  const [kez, setKez] = useState(1);
  const [bitti, setBitti] = useState(false);
  useEffect(() => { if (acik) { setSec(null); setKez(1); setBitti(false); } }, [acik, oturum]);
  const tf = tarifler.find((x) => x.id === sec);
  const dolu = a.emirler.length >= a.tezgah.sayi;
  const neden = iflas ? t("onl.atl.h.isletme_kapali") : !g.izin.emir ? t("onl.atl.emir.yetkiYok") : !a.zanaat ? t("onl.atl.zanaatOnce")
    : dolu && !bitti ? t("onl.atl.h.tezgah_dolu") : !tf ? t("onl.atl.emir.sec") : null;
  return <AltPanel acik={acik} onKapat={onKapat} etiket={t("onl.atl.emir.baslik")} rtl={rtl} t={t}>
    <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 17, color: C.parchment, textAlign: hiza(rtl), paddingEnd: 36 }}>{t("onl.atl.emir.baslik")}</Text>
    <Not metin={t("onl.atl.emir.cekmeceNot")} rtl={rtl} />
    <TarifSecimi tarifler={tarifler} g={g} secili={sec} onSec={(id) => { setSec(id); y.temizle(); setBitti(false); }} rtl={rtl} t={t} />
    {tf ? <>
      <AdetSecici etiket={t("onl.atl.emir.kez")} deger={kez} cok={Math.max(1, a.emirKezEnCok)} onDegis={setKez} rtl={rtl} t={t} />
      <Not metin={applyParams(t("onl.atl.emir.yapimNot"), [tf.takat])} rtl={rtl} icon="flame" renk={C.parchmentDim} />
    </> : null}
    <Sonuc hata={y.hata} bilgi={y.bilgi} rtl={rtl} />
    {neden && (sec || dolu) ? <Not metin={neden} rtl={rtl} /> : null}
    <AltinDugme etiket={t("onl.atl.emir.acDugme")} icon="scroll-open" rtl={rtl} kapali={!!neden || bitti} bekliyor={y.bekliyor}
      erisim={[t("onl.atl.emir.acDugme"), neden].filter(Boolean).join(". ")}
      onPress={() => { if (!tf || neden) return; const id = tf.id; const k = kez; void y.gonder(`ac|${id}|${k}`, (istekNo) => ist.emir(g.isletme, { islem: "ac", tarif: id, kez: k, istekNo }), onYenile, (v) => {
        setBitti(true);
        return applyParams(t("onl.atl.emir.acildi"), [tarifAdi(t, id, tf.cikti.mal), v?.emir.kez ?? k]);
      }); }} />
  </AltPanel>;
}

function MesaiCekmecesi({ acik, oturum, g, ist, iflas, onKapat, onYenile, rtl, t }: {
  acik: boolean; oturum: number; g: TezgahGorunumu; ist: AtolyeIstemci; iflas: boolean; onKapat: () => void; onYenile: () => Promise<void> | void; rtl: boolean; t: Ceviri;
}) {
  const a = g.atolye!;
  const y = useYazma(oturum);
  const [emek, setEmek] = useState(1);
  useEffect(() => { if (acik) setEmek(1); }, [acik, oturum]);
  const bos = Math.max(0, a.emek.tavan - a.emek.havuz);
  const enCok = Math.max(0, Math.min(MESAI_TEK_EN_COK, bos, a.benimTakat));
  useEffect(() => { setEmek((e) => Math.max(1, Math.min(e, Math.max(1, enCok)))); }, [enCok]);
  const neden = iflas ? t("onl.atl.h.isletme_kapali") : !g.izin.mesai ? t("onl.atl.mesai.yetkiYok") : bos <= 0 ? t("onl.atl.h.havuz_dolu") : a.benimTakat <= 0 ? t("onl.atl.mesai.takatYok") : null;
  return <AltPanel acik={acik} onKapat={onKapat} etiket={t("onl.atl.mesai.baslik")} rtl={rtl} t={t}>
    <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 17, color: C.parchment, textAlign: hiza(rtl), paddingEnd: 36 }}>{t("onl.atl.mesai.baslik")}</Text>
    <Not metin={t("onl.atl.mesai.aciklama")} rtl={rtl} />
    <View style={{ gap: 6 }}>
      <Satir etiket={t("onl.atl.havuz")} deger={`${a.emek.havuz}/${a.emek.tavan}`} rtl={rtl} />
      <Doluluk nufus={a.emek.havuz} kapasite={Math.max(1, a.emek.tavan)} rtl={rtl} />
      <Satir etiket={t("onl.atl.benimTakat")} deger={String(a.benimTakat)} rtl={rtl} />
    </View>
    {enCok > 0 && !neden ? <AdetSecici etiket={t("onl.atl.mesai.emek")} deger={Math.min(emek, enCok)} cok={enCok} onDegis={setEmek} rtl={rtl} t={t} /> : null}
    <Not metin={t("onl.atl.mesai.geriAlinmaz")} rtl={rtl} icon="compass" renk={C.gold} />
    <Sonuc hata={y.hata} bilgi={y.bilgi} rtl={rtl} />
    {neden ? <Not metin={neden} rtl={rtl} /> : null}
    <AltinDugme etiket={applyParams(t("onl.atl.mesai.dugme"), [Math.min(emek, Math.max(1, enCok))])} icon="flame" rtl={rtl} kapali={!!neden} bekliyor={y.bekliyor}
      erisim={[applyParams(t("onl.atl.mesai.dugme"), [Math.min(emek, Math.max(1, enCok))]), neden].filter(Boolean).join(". ")}
      onPress={() => { if (neden) return; const n = Math.min(emek, enCok); void y.gonder(`mesai|${n}`, (istekNo) => ist.mesai(g.isletme, { emek: n, istekNo }), onYenile,
        (v) => (v ? applyParams(t("onl.atl.mesai.tamam"), [v.mesai.emek, v.mesai.havuz, v.mesai.tavan]) : t("onl.atl.mesai.tamamKisa"))); }} />
  </AltPanel>;
}

