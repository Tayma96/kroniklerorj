import { DesignPressable as Pressable } from "../../lib/design-pressable";
// Divan: günün davası (çevrimdışı, tarih tohumlu). Hüküm yalnızca ayrı kayda (kronik_divan) yazılır; oyun durumuna dokunmaz.
// Zamanlayıcı yok, seri yok, kaçan dava yok: geçmiş numaralar arşivde bekler. Ödül yalnızca lakaptır (kimlik).
import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView} from "react-native";
import { kartPaylas, metinPaylas } from "../../lib/kart-paylas";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { useI18n, applyParams, yuzdeL } from "../../lib/i18n";
import { DIVAN_KEY, DIVAN_LAKAP_ESIK, DIVAN_YOLLAR, DivanKayit, DivanYol, arsivNumaralari, bosDivan, divanDavasi, divanGoc, divanNo, hukumVer, oyYuzde, yolSayilari } from "../../lib/divan";
import { C, F } from "../../lib/theme";
import { BackLabel, PageHeader, Panel, ScreenFresk } from "../../lib/ui";

const YOL_RENK = ["#7fae8a", "#c9a84c", "#b07a5a"];

export default function Divan() {
  const insets = useSafeAreaInsets(); const router = useRouter();
  const { state } = useGame();
  const { t, lang } = useI18n();
  const kadin = state?.player.gender === "kadın";
  const bugun = useMemo(() => divanNo(new Date()), []);
  const [no, setNo] = useState(bugun);
  const [kayit, setKayit] = useState<DivanKayit>(bosDivan());
  useEffect(() => { AsyncStorage.getItem(DIVAN_KEY).then((raw) => { if (raw) { try { setKayit(divanGoc(JSON.parse(raw))); } catch {} } }).catch(() => {}); }, []);
  const id = divanDavasi(no);
  const hukum = kayit.k[String(no)] as DivanYol | undefined;
  const yuzde = hukum != null ? oyYuzde(no, hukum) : null;
  const yolAdi = (y: number) => t("divan.yol." + y);
  const lakapAdi = (y: number) => { const k = "divan.lakap." + y; const f = kadin ? t(k + ".f") : k + ".f"; return f !== k + ".f" ? f : t(k); };
  const hukmet = (y: DivanYol) => {
    const n = hukumVer(kayit, no, y); if (n === kayit) return;
    setKayit(n); AsyncStorage.setItem(DIVAN_KEY, JSON.stringify(n)).catch(() => {});
  };
  const kartRef = useRef<View>(null);
  const mesaj = () => hukum == null || !yuzde ? "" : applyParams(t("divan.paylas"), [no, t("divan." + id + ".t"), yuzdeL(yuzde[hukum], lang)]) + "\n\nKronikler: Küllerin Mirası";
  // Görsel kart (dava paneli, Skia ile PNG) — olmazsa metne düşer.
  const paylas = () => { const m = mesaj(); if (m) kartPaylas(kartRef, m, "kronikler-divan-" + no, t("divan.share")); };
  const paylasMetin = () => { const m = mesaj(); if (m) metinPaylas(m); };
  const sayi = yolSayilari(kayit);
  const arsiv = arsivNumaralari(bugun);
  return (
    <ScreenFresk style={{ paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}><BackLabel /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 90 }}>
        <PageHeader kicker={no === bugun ? t("divan.bugun") : t("divan.eyebrow")} title={applyParams(t("divan.no"), [no])} sub={t("divan.alt")} />
        <View ref={kartRef} collapsable={false} style={{ backgroundColor: C.bg }}>
        <Panel title={t("divan." + id + ".t")} icon="tarih">
          <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 22, color: C.parchment }}>{t("divan." + id + ".x")}</Text>
          <View style={{ marginTop: 12, gap: 8 }}>
            {DIVAN_YOLLAR.map((y) => {
              const sec = hukum === y;
              return (
                <Pressable key={y} disabled={hukum != null} onPress={() => hukmet(y)}
                  style={{ borderWidth: 1, borderColor: sec ? YOL_RENK[y] : C.border, borderRadius: 5, padding: 10, backgroundColor: sec ? "rgba(201,168,76,0.10)" : "transparent", opacity: hukum != null && !sec ? 0.75 : 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: YOL_RENK[y] }}>{yolAdi(y).toLocaleUpperCase(lang)}</Text>
                  <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchment, marginTop: 2 }}>{t("divan." + id + ".c" + y)}</Text>
                  {yuzde ? (
                    <View style={{ marginTop: 6, height: 5, borderRadius: 3, backgroundColor: C.border, overflow: "hidden" }}>
                      <View style={{ width: `${yuzde[y]}%`, height: 5, backgroundColor: YOL_RENK[y] }} />
                    </View>
                  ) : null}
                  {yuzde ? <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentMuted, marginTop: 2 }}>{yuzdeL(yuzde[y], lang)}</Text> : null}
                </Pressable>
              );
            })}
          </View>
          {hukum != null && yuzde ? (
            <View style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: C.goldDim }}>{t("divan.oy")}</Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchment, textAlign: "center", marginTop: 4 }}>{applyParams(t("divan.sen"), [yolAdi(hukum)])}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchmentMuted, textAlign: "center", marginTop: 2 }}>{applyParams(t("divan.ayni"), [yuzdeL(yuzde[hukum], lang)])}</Text>
              <Pressable onPress={paylas} style={{ marginTop: 10, paddingVertical: 8, paddingHorizontal: 18, borderRadius: 5, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", backgroundColor: "rgba(201,168,76,0.10)" }}>
                <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1, color: C.gold }}>{t("divan.share")}</Text>
              </Pressable>
              <Pressable onPress={paylasMetin} hitSlop={8} style={{ marginTop: 6 }}>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted }}>{t("paylas.metin")}</Text>
              </Pressable>
            </View>
          ) : null}
        </Panel>
        </View>

        <Panel title={t("divan.lakaplar")} icon="zafer">
          {DIVAN_YOLLAR.map((y) => (
            <Text key={y} style={{ fontFamily: F.serif, fontSize: 15, color: sayi[y] >= DIVAN_LAKAP_ESIK ? C.gold : C.parchmentMuted, marginBottom: 3 }}>
              {sayi[y] >= DIVAN_LAKAP_ESIK ? "⚜ " + applyParams(t("divan.kazanildi"), [lakapAdi(y)]) : lakapAdi(y) + " · " + applyParams(t("divan.ilerleme"), [sayi[y], DIVAN_LAKAP_ESIK])}
            </Text>
          ))}
          <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, marginTop: 4 }}>{t("divan.kimlik")}</Text>
        </Panel>

        {arsiv.length || no !== bugun ? (
          <Panel title={t("divan.arsiv")} icon="scroll-open">
            {[bugun, ...arsiv].map((n) => {
              const h = kayit.k[String(n)];
              return (
                <Pressable key={n} onPress={() => setNo(n)} style={{ flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border, opacity: n === no ? 1 : 0.85 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 13, color: n === no ? C.gold : C.goldDim, width: 52 }}>No. {n}</Text>
                  <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchment }}>{t("divan." + divanDavasi(n) + ".t")}</Text>
                  <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: h != null ? YOL_RENK[h] : C.parchmentMuted }}>{h != null ? yolAdi(h) : t("divan.bekliyor")}</Text>
                </Pressable>
              );
            })}
            <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, marginTop: 6 }}>{t("divan.bekle")}</Text>
          </Panel>
        ) : null}
      </ScrollView>
    </ScreenFresk>
  );
}
