// Ayın hesabı: biten ayda kese, sağlık, şöhret, itibar ve niteliklerin ne kadar değiştiği; yanında
// yeni gelişme sayısı (nedenleri Son Gelişmeler'de işaretli) ve sıradaki ayın notu (ayNotu). Yalnız arayüz.
import { useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import { GameIcon } from "../../icons";
import { effStat, type GameState } from "../../game";
import { MK, MkPanel } from "../../home-mockup-ui";
import { applyParams } from "../../i18n";
import { F } from "../../theme";

export type AyKalem = "money" | "health" | "fame" | "rep" | "str" | "int";
export type AyFarki = Partial<Record<AyKalem, number>>;

const SIRA: AyKalem[] = ["money", "health", "fame", "rep", "str", "int"];
const ICON: Record<AyKalem, string> = { money: "akce", health: "saglik", fame: "crown", rep: "karakter", str: "fist", int: "graduate-cap" };
const LABEL: Record<AyKalem, string> = { money: "char.money", health: "char.health", fame: "soc.fame.l", rep: "soc.reputation.l", str: "st.strength", int: "st.intelligence" };
const ARTI = "#8FD07A", EKSI = "#E8796A";

function olc(s: GameState): Record<AyKalem, number> {
  const p = s.player;
  return { money: Math.round(p.money), health: Math.round(p.health), fame: Math.round(p.fame || 0), rep: Math.round(p.reputation || 0), str: Math.round(effStat(p, "strength")), int: Math.round(effStat(p, "intelligence")) };
}

// Ayın başındaki değerleri tutar; ay ilerleyince farkı verir. Yeni nesil ya da geri sarılan kayıt sıfırlar.
export function useAyFarki(state: GameState | null): AyFarki {
  const ref = useRef<{ turn: number; gen: number; v: Record<AyKalem, number> } | null>(null);
  const [fark, setFark] = useState<AyFarki>({});
  useEffect(() => {
    if (!state) return;
    const v = olc(state), gen = state.player.generation, cur = ref.current;
    if (!cur || cur.gen !== gen || state.turn < cur.turn) { ref.current = { turn: state.turn, gen, v }; setFark({}); return; }
    if (state.turn > cur.turn) {
      const d: AyFarki = {};
      for (const k of SIRA) { const x = v[k] - cur.v[k]; if (x) d[k] = x; }
      setFark(d); ref.current = { turn: state.turn, gen, v };
    }
  }, [state?.turn, state?.player.generation]);
  return fark;
}

export function sayi(n: number, lang: string) {
  return new Intl.NumberFormat(lang, { notation: Math.abs(n) >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n).replace(/[\s ]/g, "");
}

export function AyOzeti({ fark, not, yeni, rtl, lang, t }: { fark: AyFarki; not?: string; yeni: number; rtl: boolean; lang: string; t: (k: string) => string }) {
  const kalem = SIRA.filter((k) => fark[k]);
  if (!kalem.length && !not) return null;
  const row = rtl ? "row-reverse" as const : "row" as const;
  return <MkPanel style={{ marginBottom: 10 }}>
    {kalem.length > 0 && <View style={{ paddingHorizontal: 12, paddingTop: 9, gap: 7 }}>
      <View style={{ flexDirection: row, alignItems: "center", gap: 8 }}>
        <GameIcon name="hourglass" size={16} color={MK.gold} />
        <Text accessibilityRole="header" style={{ flex: 1, fontFamily: F.serif, fontSize: 15, lineHeight: 19, color: MK.gold, textAlign: rtl ? "right" : "left" }}>{t("ana.ay.baslik")}</Text>
        {yeni > 1 && <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.serifItalic, fontSize: 13, lineHeight: 17, color: MK.muted }}>{applyParams(t("ana.ay.yeni"), [sayi(yeni, lang)])}</Text>}
      </View>
      <View style={{ flexDirection: row, flexWrap: "wrap", gap: 6 }}>
        {kalem.map((k) => {
          const v = fark[k]!, up = v > 0, label = t(LABEL[k]), val = (up ? "+" : "−") + sayi(Math.abs(v), lang);
          return <View key={k} accessible accessibilityLabel={`${label} ${up ? "+" : "-"}${Math.abs(v)}`} style={{ flexDirection: row, alignItems: "center", gap: 5, minHeight: 30, paddingHorizontal: 8, borderRadius: 4, borderWidth: 1, borderColor: up ? "rgba(143,208,122,0.35)" : "rgba(232,121,106,0.38)", backgroundColor: up ? "rgba(70,110,52,0.20)" : "rgba(120,40,30,0.24)" }}>
            <GameIcon name={ICON[k]} size={14} color={MK.gold} />
            <Text style={{ fontFamily: F.display, fontSize: 13, lineHeight: 17, color: up ? ARTI : EKSI }}>{val}</Text>
            <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: MK.muted }}>{label}</Text>
          </View>;
        })}
      </View>
    </View>}
    {!!not && <View style={{ flexDirection: row, alignItems: "center", gap: 8, paddingHorizontal: 12, paddingTop: kalem.length ? 7 : 10, paddingBottom: 10 }}>
      <GameIcon name={kalem.length ? "scroll" : "hourglass"} size={15} color={MK.gold} />
      <Text numberOfLines={2} style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: MK.ink, textAlign: rtl ? "right" : "left" }}>{not}</Text>
    </View>}
    {!not && <View style={{ height: 10 }} />}
  </MkPanel>;
}
