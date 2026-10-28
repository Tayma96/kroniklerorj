import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DesignPressable as Pressable } from "../lib/design-pressable";
import { Deneme3DSahne, type SahneTutamak } from "../lib/deneme-3d-sahne";
import { hap } from "../lib/haptics";
import { applyParams, useI18n } from "../lib/i18n";
import { GameIcon } from "../lib/icons";
import { C, F, L, T } from "../lib/theme";

// 3D deneme (Ayarlar'dan açılır): react-native-filament ile gerçek zamanlı savaşçı ve klip geçişleri.
const KLIPLER = ["bekle", "saldir", "savustur"] as const; // ilki döngüde oynayan bekleme klibi
const DUGMELER = [
  { klip: "bekle", metin: "d3.bekle", icon: "hourglass" },
  { klip: "saldir", metin: "d3.saldir", icon: "crossed-swords" },
  { klip: "savustur", metin: "d3.savustur", icon: "shield" },
] as const;

export default function Deneme3D() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, lang } = useI18n();
  const [tutamak, setTutamak] = useState<SahneTutamak | null>(null);
  const tutamakRef = useRef<SahneTutamak | null>(null);
  const [aktif, setAktif] = useState<string>(KLIPLER[0]);
  const [fps, setFps] = useState({ ciz: 0, js: 0 });
  const onHazir = useCallback((h: SahneTutamak | null) => { tutamakRef.current = h; setTutamak(h); }, []);

  // "Çizim": Filament çizim döngüsünün gerçek kare hızı; "JS": requestAnimationFrame temposu.
  useEffect(() => {
    let id = 0, jsKare = 0, son = performance.now(), sonH: SahneTutamak | null = null, sonCiz = 0;
    const dongu = () => {
      jsKare++;
      const simdi = performance.now(), dt = simdi - son;
      if (dt >= 500) {
        const h = tutamakRef.current, ciz = h ? h.kare() : 0;
        setFps({ ciz: h && h === sonH ? Math.round(((ciz - sonCiz) * 1000) / dt) : 0, js: Math.round((jsKare * 1000) / dt) });
        if (h) setAktif(h.aktif());
        jsKare = 0; son = simdi; sonH = h; sonCiz = ciz;
      }
      id = requestAnimationFrame(dongu);
    };
    id = requestAnimationFrame(dongu);
    return () => cancelAnimationFrame(id);
  }, []);

  const geri = () => { hap("tap"); if (router.canGoBack()) router.back(); else router.replace("/"); };
  const oynat = (klip: string) => { hap("tap"); if (tutamak?.oynat(klip)) setAktif(klip); };

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <Deneme3DSahne klipler={KLIPLER} arkaPlan={C.surface} onHazir={onHazir} />

      <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, paddingTop: insets.top + 8, paddingHorizontal: L.page }}>
        <View pointerEvents="box-none" style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable onPress={geri} accessibilityLabel={t("common.back")} style={{ paddingHorizontal: 8 }}>
            <Text style={{ color: C.gold, fontFamily: F.display, fontSize: T.label }}>{t("common.back")}</Text>
          </Pressable>
          <Text numberOfLines={1} style={{ flex: 1, textAlign: "center", color: C.parchment, fontFamily: F.display, fontSize: T.title }}>{t("d3.title")}</Text>
          <View style={{ width: L.touch }} />
        </View>
        <View style={{ alignSelf: "flex-end", marginTop: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: C.border, backgroundColor: C.card }}>
          <Text style={{ color: C.parchmentDim, fontFamily: F.serif, fontSize: T.caption }}>{applyParams(t("d3.fps"), [fps.ciz, fps.js], lang)}</Text>
        </View>
      </View>

      {tutamak == null ? (
        <View pointerEvents="none" style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: C.parchmentMuted, fontFamily: F.serifItalic, fontSize: T.body }}>{t("d3.loading")}</Text>
        </View>
      ) : null}

      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 8, paddingHorizontal: L.page, paddingTop: 10, paddingBottom: insets.bottom + 12 }}>
        {DUGMELER.map((d) => {
          const mevcut = !!tutamak?.klipler.includes(d.klip), secili = mevcut && aktif === d.klip;
          return (
            <Pressable key={d.klip} disabled={!mevcut} onPress={() => oynat(d.klip)} accessibilityLabel={t(d.metin)} accessibilityState={{ disabled: !mevcut, selected: secili }}
              style={{ flex: 1, minHeight: 56, alignItems: "center", gap: 4, paddingVertical: 8, paddingHorizontal: 4, borderRadius: L.radius, borderWidth: 1, borderColor: secili ? C.gold : C.border, backgroundColor: secili ? C.cardHi : C.card, opacity: mevcut ? 1 : 0.45 }}>
              <GameIcon name={d.icon} size={20} color={secili ? C.goldBright : C.gold} />
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ color: secili ? C.goldBright : C.parchment, fontFamily: F.display, fontSize: T.label }}>{t(d.metin)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
