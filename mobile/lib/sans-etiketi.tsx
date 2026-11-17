// Görünür şans (K1): "Zekâ 7 · güvenli %78" etiketi; dokununca motorun kullandığı kalemler açılır.
// SansDokumu: yüzde puanlı eski şans dökümleri (teklifSansi/helalSansi/diyetSansi) için ortak liste.
import { useState } from "react";
import { View, Text } from "react-native";
import { DesignPressable as Pressable } from "./design-pressable";
import { useI18n, yuzdeL } from "./i18n";
import { GameIcon } from "./icons";
import { C, F, T } from "./theme";
import { yon } from "./sayfa/karakter/parca";
import type { ZarOnizleme } from "./game";
import type { ZarKademe } from "./zar";

const KADEME_RENK: Record<ZarKademe, string> = { guvenli: C.sage, makul: C.gold, riskli: C.ember, umutsuz: C.blood };
const sayi = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const isaretli = (v: number) => (v > 0 ? "+" + sayi(v) : v < 0 ? "−" + sayi(-v) : "0");

export function zarEtiketMetni(z: ZarOnizleme, t: (k: string) => string, lang: Parameters<typeof yuzdeL>[1]): string {
  const yuzde = yuzdeL(Math.round(z.oran * 100), lang);
  const bas = z.stat ? `${t("st." + z.stat)} ${sayi(z.statDeger ?? 0)} · ` : "";
  return `${bas}${t("zar.kademe." + z.kademe)} ${yuzde}`;
}

export function SansEtiketi({ zar, baslik }: { zar: ZarOnizleme; baslik?: string }) {
  const { t, lang } = useI18n();
  const [acik, setAcik] = useState(false);
  const renk = KADEME_RENK[zar.kademe];
  const metin = zarEtiketMetni(zar, t, lang);
  const { row, ta } = yon(lang);
  return (
    <View>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: acik }}
        accessibilityLabel={(baslik ? t(baslik) + ": " : "") + metin} accessibilityHint={t("zar.dokumIpucu")}
        onPress={() => setAcik(!acik)}
        style={{ minHeight: 44, flexDirection: row, alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: renk + "88", backgroundColor: acik ? "rgba(201,168,76,0.12)" : "transparent" }}>
        <GameIcon name="scales" size={16} color={renk} />
        <Text style={{ flex: 1, fontFamily: F.display, fontSize: 13, color: renk, textAlign: ta }}>
          {baslik ? <Text style={{ color: C.parchmentDim }}>{t(baslik)} · </Text> : null}{metin}
        </Text>
      </Pressable>
      {acik ? (
        <View style={{ paddingHorizontal: 6, paddingTop: 6, paddingBottom: 4 }}>
          {zar.kalemler.map((x, i) => (
            <View key={i} style={{ flexDirection: row, paddingVertical: 2 }}>
              <Text style={{ flex: 1, fontFamily: F.serif, fontSize: T.body, color: C.parchmentDim, textAlign: ta }}>{t(x.etiket)}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 13, color: x.deger > 0 ? C.sage : x.deger < 0 ? C.blood : C.parchmentDim }}>{isaretli(x.deger)}</Text>
            </View>
          ))}
          <View style={{ flexDirection: row, paddingTop: 4, marginTop: 3, borderTopWidth: 1, borderTopColor: C.border }}>
            <Text style={{ flex: 1, fontFamily: F.display, fontSize: 13, color: C.parchment, textAlign: ta }}>{t("sans.toplam")}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 13, color: renk }}>{yuzdeL(Math.round(zar.oran * 100), lang)}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// Yüzde puanlı döküm (k: i18n anahtarı, v: yüzde puanı). Motor zarı bu toplamla atar.
export function SansDokumu({ kalemler, yuzde, baslik = "sans.title" }: { kalemler: { k: string; v: number }[]; yuzde: number; baslik?: string }) {
  const { t, lang } = useI18n();
  const { row, ta } = yon(lang);
  return (
    <View style={{ paddingHorizontal: 4, paddingBottom: 10, paddingTop: 2 }}>
      <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.goldDim, marginBottom: 4 }}>{t(baslik)}</Text>
      {kalemler.map((x, i) => (
        <View key={i} style={{ flexDirection: row, paddingVertical: 2 }}>
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: T.body, color: C.parchmentDim, textAlign: ta }}>{t(x.k)}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 13, color: x.v > 0 ? C.sage : C.blood }}>{x.v > 0 ? "+" + x.v : x.v}</Text>
        </View>
      ))}
      <View style={{ flexDirection: row, paddingTop: 4, marginTop: 3, borderTopWidth: 1, borderTopColor: C.border }}>
        <Text style={{ flex: 1, fontFamily: F.display, fontSize: 13, color: C.parchment, textAlign: ta }}>{t("sans.toplam")}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{yuzdeL(yuzde, lang)}</Text>
      </View>
    </View>
  );
}
