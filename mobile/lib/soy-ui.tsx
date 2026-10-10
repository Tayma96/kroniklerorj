// Hanedan Defteri arayüz parçaları: soy yeteneği seçici (vâris ekranı ve "Küllerden yeni ocak" ortak kullanır).
import { View, Text, Pressable } from "react-native";
import { GameIcon } from "./icons";
import { C, F } from "./theme";
import { useI18n } from "./i18n";
import { hap } from "./haptics";

export function YetenekSecici({ adaylar, secili, onSec }: { adaylar: string[]; secili: string | null; onSec: (id: string | null) => void }) {
  const { t } = useI18n();
  const kart = (id: string | null) => {
    const on = secili === id;
    return (
      <Pressable key={id || "yok"} onPress={() => { hap("tap"); onSec(id); }} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 9, borderWidth: 1, marginBottom: 7, borderColor: on ? "rgba(201,168,76,0.6)" : C.border, backgroundColor: on ? "rgba(201,168,76,0.12)" : C.card }}>
        <GameIcon name={id ? "hanedan" : "leaf"} size={16} color={on ? C.gold : C.parchmentDim} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 12, color: on ? C.gold : C.parchment }}>{id ? t("soy." + id + ".ad") : t("soy.yok")}</Text>
          {id ? (
            <Text style={{ fontFamily: F.serif, fontSize: 10.5, color: C.parchmentMuted, marginTop: 2 }}>
              <Text style={{ color: C.sage }}>{t("soy." + id + ".arti")}</Text>{" · "}<Text style={{ color: C.rose }}>{t("soy." + id + ".bedel")}</Text>
            </Text>
          ) : null}
        </View>
        {on && <Text style={{ color: C.gold }}>✓</Text>}
      </Pressable>
    );
  };
  return (
    <View>
      <Text style={{ fontFamily: F.display, fontSize: 10, letterSpacing: 2, color: C.goldDim, marginTop: 12, marginBottom: 4 }}>{t("soy.sec.baslik")}</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 10.5, color: C.parchmentMuted, marginBottom: 8 }}>{t("soy.sec.alt")}</Text>
      {adaylar.map((id) => kart(id))}
      {kart(null)}
    </View>
  );
}
