// F6a danışan sesler: ay kararı kartında yakın çevreden en çok iki kişinin tek satırlık tavsiyesi.
// Bilgi aşamalı: yalnız isim, rol ve bir cümle; hangi seçeneği önerdiği cümlenin içinde. Etkisi seçimde (danisanEtkisi).
import { View, Text } from "react-native";
import { useGame } from "./store";
import { useI18n, applyParams } from "./i18n";
import { nufusOf } from "./game";
import { kisiIlkAd } from "./nufus";
import { GameIcon } from "./icons";
import { yon } from "./sayfa/karakter/parca";
import type { MonthScene } from "./month-scene-state";
import type { Lang } from "./locale-data";
import { C, F } from "./theme";

export function DanisanSesler({ m, secenekAdi }: { m: MonthScene; secenekAdi: (i: number) => string }) {
  const { state } = useGame(), { t, lang } = useI18n();
  if (!state || !m.danis?.length || !m.dilemma) return null;
  const { row, ta } = yon(lang); const pop = nufusOf(state);
  const satirlar = m.danis.flatMap((d) => {
    const k = pop.k[d.id]; if (!k || k.ol != null || d.i >= m.dilemma!.choices.length) return [];
    const kim = `${kisiIlkAd(k, lang as Lang)} · ${t(d.r)}`;
    return [{ id: d.id, kim, soz: applyParams(t(`f6.danis.${d.g}.${d.y}`), [secenekAdi(d.i)]) }];
  });
  if (!satirlar.length) return null;
  return <View style={{ gap: 4, paddingHorizontal: 14, paddingTop: 6 }}>
    {satirlar.map((x) => <View key={x.id} accessible accessibilityLabel={`${x.kim}: ${x.soz}`} style={{ flexDirection: row, alignItems: "flex-start", gap: 6 }}>
      <View style={{ paddingTop: 3 }}><GameIcon name="iliskiler" size={13} color={C.goldDim} /></View>
      <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentDim, textAlign: ta }}>
        <Text style={{ fontFamily: F.serif, color: C.goldBright }}>{x.kim}: </Text>{x.soz}
      </Text>
    </View>)}
  </View>;
}
