// Faz 6 ekonomi ve Faz 5 kasaba nabzı ortak parçaları: kalite rozeti, ambar kalite izi ("Yapan: Usta X"), NPC fiyatıyla
// karşılaştırma dökümü, yaşam ekranının kasaba nabzı kartı ve ekonomi geçişleri. Sayılar sunucudan; burada yalnız gösterim.
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useI18n, applyParams } from "../i18n";
import { C, F } from "../theme";
import { GameIcon } from "../icons";
import { DesignPressable as Pressable } from "../design-pressable";
import { hap } from "../haptics";
import { useOnline } from "./durum";
import { Cerceve, Madalyon, hiza, yon } from "./ui";
import { Baslik2, Rozet } from "./yasam-ui";
import { MAL_IKON } from "./meslek-veri";
import { benKalite, yerlesimNabzi, type Karsilastirma, type KaliteParti } from "./ekonomi-veri";
import { sahteKalite, sahteNabiz } from "./sahte-ekonomi";

type Ceviri = (k: string) => string;

/** Mal adı: istemcinin tanımadığı (yeni tarif) mal kimliği adıyla gösterilir. */
export function malAdi(t: Ceviri, m: string): string {
  const k = "onl.mal." + m;
  const v = t(k);
  return v === k ? m : v;
}
export const malIkonu = (m: string) => (MAL_IKON as Record<string, string>)[m] ?? "amphora";
export const KALITE_RENK = [C.parchmentMuted, C.sage, C.gold, C.goldBright] as const;
export const kaliteAdi = (t: Ceviri, kademe: number) => t("onl.eko.q." + Math.max(0, Math.min(3, kademe)));

export function KaliteRozeti({ kademe }: { kademe: number }) {
  const { t } = useI18n();
  const q = Math.max(0, Math.min(3, kademe));
  return <Rozet icon={q >= 3 ? "gems" : q === 2 ? "star" : undefined} metin={kaliteAdi(t, q)} renk={KALITE_RENK[q]} dolu={q >= 2} />;
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
    {liste.map((p, i) => <Text key={i} numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 17, color: KALITE_RENK[p.kademe] ?? C.parchmentDim, textAlign: hiza(rtl) }}>
      {`${p.adet} × ${kaliteAdi(t, p.kademe)}${p.yapan ? " · " + applyParams(t("onl.eko.yapan"), [p.yapan]) : ""}`}
    </Text>)}
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

/** Yaşam ekranı: pazar, ısmarlama, mülk, levha ve defter geçişleri. */
export function EkonomiGirisi() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const ogeler = [
    { id: "pazar", icon: "scales", yol: "/online/pazar" },
    { id: "ismarlama", icon: "scroll", yol: "/online/ismarlama" },
    { id: "mulk", icon: "house", yol: "/online/mulk" },
    { id: "levha", icon: "trophy", yol: "/online/levha" },
    { id: "defter", icon: "book", yol: "/online/defter" },
  ];
  return <View>
    <Baslik2 metin={t("onl.eko.baslik")} rtl={rtl} />
    <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 8 }}>
      {ogeler.map((g) => <Pressable key={g.id} accessibilityLabel={`${t("onl.eko." + g.id)}: ${t("onl.eko." + g.id + ".alt")}`} onPress={() => { hap("tap"); router.push(g.yol); }}
        style={({ pressed }) => ({ flexBasis: "47%", flexGrow: 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
        <Cerceve ic={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, padding: 10, minHeight: 64 }}>
          <Madalyon icon={g.icon} size={34} />
          <View style={{ flex: 1, gap: 1 }}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: 13, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.eko." + g.id)}</Text>
            <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 16, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.eko." + g.id + ".alt")}</Text>
          </View>
        </Cerceve>
      </Pressable>)}
    </View>
  </View>;
}
