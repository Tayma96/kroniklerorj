// Faz 6 ekonomi ve Faz 5 kasaba nabzı ortak parçaları: kalite rozeti, ambar kalite izi ("Yapan: Usta X"), NPC fiyatıyla
// karşılaştırma dökümü, yaşam ekranının kasaba nabzı kartı (ekonomi geçişleri İşim/Sokak sekmelerinde). Sayılar sunucudan; burada yalnız gösterim.
import { View, Text } from "react-native";
import { useI18n, applyParams } from "../i18n";
import { C, F } from "../theme";
import { GameIcon } from "../icons";
import { useOnline } from "./durum";
import { Cerceve, hiza, yon } from "./ui";
import { Baslik2, Rozet } from "./yasam-ui";
import { MAL_IKON } from "./meslek-veri";
import { benKalite, yerlesimNabzi, type Karsilastirma, type KaliteParti } from "./ekonomi-veri";
import { sahteKalite, sahteNabiz } from "./sahte-ekonomi";
import { KADEME_RENK, KademeRozeti, KademeliRozet, kademeAdi } from "./kademe-ui";

type Ceviri = (k: string) => string;

/** Mal adı: istemcinin tanımadığı (yeni tarif) mal kimliği adıyla gösterilir. */
export function malAdi(t: Ceviri, m: string): string {
  const k = "onl.mal." + m;
  const v = t(k);
  return v === k ? m : v;
}
export const malIkonu = (m: string) => (MAL_IKON as Record<string, string>)[m] ?? "amphora";
/** Kademe dili tek kaynaktan (kademe-ui.tsx KADEME): 7 kademe, ad + işaret + renk. Eski adlar korunur. */
export const KALITE_RENK = KADEME_RENK;
export const kaliteAdi = kademeAdi;
export function KaliteRozeti({ kademe, kucuk }: { kademe: number; kucuk?: boolean }) {
  return <KademeRozeti kademe={kademe} kucuk={kucuk} />;
}

function useSahte(): boolean {
  return useOnline().oturum?.tur === "gelistirici";
}

/** Ambar satırının altındaki kalite partileri ve yapan izi (yalnız izli partisi olan mallar). */
export function KaliteIzi({ mal }: { mal: string }) {
  const { t, rtl } = useI18n();
  const o = useOnline();
  const sahte = useSahte();
  const kq = benKalite(o.yerlesim?.ben) ?? (sahte ? sahteKalite() : null);
  const liste: KaliteParti[] = kq?.[mal] ?? [];
  if (!liste.length) return null;
  return <View style={{ gap: 3, marginTop: 2 }}>
    {liste.map((p, i) => <View key={i} style={{ flexDirection: yon(rtl), flexWrap: "wrap", alignItems: "center", gap: 6 }}>
      <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchment }}>{`${p.adet} ×`}</Text>
      <KademeliRozet parti={{ mal, kademe: p.kademe, adet: p.adet, yapan: p.yapan, huner: p.huner, esya: p.esya }} kucuk />
      {p.yapan && !p.esya ? <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.serif, fontSize: 12.5, color: C.parchmentDim, textAlign: hiza(rtl) }}>{applyParams(t("onl.eko.yapan"), [p.yapan])}</Text> : null}
    </View>)}
  </View>;
}

/** NPC fiyatıyla karşılaştırma dökümü (birim fiyat, NPC tabanı, NPC'den alış, adil bant, oran). */
export function KarsilastirmaDokumu({ k }: { k: Karsilastirma }) {
  const { t, rtl } = useI18n();
  const bantDisi = k.birimFiyat < k.bant.alt || k.birimFiyat > k.bant.ust;
  const satir = (etiket: string, deger: string, renk: string = C.parchment) => <View key={etiket} style={{ flexDirection: yon(rtl), justifyContent: "space-between", gap: 8 }}>
    <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>{etiket}</Text>
    <Text style={{ fontFamily: F.display, fontSize: 13, color: renk }}>{deger}</Text>
  </View>;
  return <View accessible style={{ gap: 4, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,162,78,0.28)", backgroundColor: "rgba(14,10,6,0.6)" }}>
    {satir(t("onl.eko.k.birim"), applyParams(t("onl.is.akce"), [k.birimFiyat]), C.goldBright)}
    {satir(t("onl.eko.k.taban"), applyParams(t("onl.is.akce"), [k.npcTaban]))}
    {satir(t("onl.eko.k.npcden"), applyParams(t("onl.is.akce"), [k.npcdenAlis]))}
    {satir(t("onl.eko.k.bant"), `${k.bant.alt}–${k.bant.ust}`, bantDisi ? C.ember : C.sage)}
    {k.tabanOrani !== null ? satir(t("onl.eko.k.oran"), `%${k.tabanOrani}`) : null}
    {bantDisi ? <Text style={{ fontFamily: F.serifItalic, fontSize: 12.5, lineHeight: 17, color: C.emberSoft, textAlign: hiza(rtl) }}>{t("onl.eko.k.bantDisi")}</Text> : null}
  </View>;
}

/** Yaşam ekranı: kasaba nabzı (nüfus, NPC gündemi, kıtlık/haydut). Eski sunucu göndermezse görünmez. */
export function NabizKarti() {
  const { t, rtl } = useI18n();
  const o = useOnline();
  const sahte = useSahte();
  const n = yerlesimNabzi(o.yerlesim) ?? (sahte ? sahteNabiz() : null);
  if (!n) return null;
  const gundem = Object.entries(n.gundem).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const enCok = Math.max(1, ...gundem.map(([, s]) => s));
  return <View>
    <Baslik2 metin={t("onl.nb.baslik")} rtl={rtl} />
    <Cerceve aktif={n.tetikler.length > 0} ic={{ padding: 12, gap: 10 }}>
      {n.tetikler.map((tt) => <View key={tt} accessibilityRole="alert" style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: "rgba(214,120,72,0.6)", backgroundColor: "rgba(120,52,24,0.35)" }}>
        <GameIcon name={tt === "kitlik" ? "wheat" : "crossed-swords"} size={16} color={C.emberSoft} />
        <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.nb.t." + tt)}</Text>
      </View>)}
      <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
        <Rozet icon="family" metin={applyParams(t("onl.nb.nufus"), [n.nufus])} />
        <Rozet icon="house" metin={applyParams(t("onl.nb.hane"), [n.hane])} />
        <Rozet icon="saw" metin={applyParams(t("onl.nb.issiz"), [n.issiz])} renk={n.issiz / Math.max(1, n.yetiskin) >= 0.25 ? C.ember : C.gold} />
        {n.gocNiyeti > 0 ? <Rozet icon="walk" metin={applyParams(t("onl.nb.goc"), [n.gocNiyeti])} renk={C.emberSoft} /> : null}
      </View>
      {gundem.length ? <View style={{ gap: 5 }}>
        <Text style={{ fontFamily: F.display, fontSize: 11, letterSpacing: rtl ? 0 : 1.2, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.nb.gundem")}</Text>
        {gundem.map(([g, s]) => <View key={g} accessible accessibilityLabel={`${t("onl.nb.g." + g)}: ${s}`} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8 }}>
          <Text numberOfLines={1} style={{ width: 96, fontFamily: F.serif, fontSize: 13.5, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.nb.g." + g)}</Text>
          <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: "rgba(201,162,78,0.15)", overflow: "hidden", flexDirection: yon(rtl) }}>
            <View style={{ width: `${(s / enCok) * 100}%`, backgroundColor: C.gold, borderRadius: 3 }} />
          </View>
          <Text style={{ minWidth: 24, fontFamily: F.display, fontSize: 12.5, color: C.parchment, textAlign: "center" }}>{s}</Text>
        </View>)}
      </View> : null}
    </Cerceve>
  </View>;
}
