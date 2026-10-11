// Dost Haneler paneli (Kronik ekranı): kendi hane kodun + paylaş, arkadaşın kodunu ekle, dost haneler listesi. Yalnız bu cihaz.
import { useEffect, useState } from "react";
import { View, Text, Pressable, Share, TextInput } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Defter } from "./defter";
import { DOST_KEY, DostKayit, bosDost, dostCikar, dostEkle, dostGoc, haneKodu, koduCoz } from "./dost";
import { useI18n, applyParams } from "./i18n";
import { C, F } from "./theme";
import { Panel } from "./ui";

export function DostHaneler({ defter }: { defter: Defter }) {
  const { t } = useI18n();
  const [kayit, setKayit] = useState<DostKayit>(bosDost());
  const [giris, setGiris] = useState(""); const [hata, setHata] = useState("");
  useEffect(() => { AsyncStorage.getItem(DOST_KEY).then((raw) => { if (raw) { try { setKayit(dostGoc(JSON.parse(raw))); } catch {} } }).catch(() => {}); }, []);
  const yaz = (k: DostKayit) => { setKayit(k); AsyncStorage.setItem(DOST_KEY, JSON.stringify(k)).catch(() => {}); };
  const kodum = haneKodu(defter);
  const ekle = () => {
    const h = koduCoz(giris); if (!h) { setHata(t("dost.hata")); return; }
    if (kodum && giris.trim() === kodum) { setHata(t("dost.kendi")); return; }
    setHata(""); setGiris(""); yaz(dostEkle(kayit, h));
  };
  return (
    <Panel title={t("dost.baslik")} icon="sosyal">
      <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted }}>{t("dost.alt")}</Text>
      {kodum ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
          <Text selectable style={{ flex: 1, fontFamily: F.serif, fontSize: 11, color: C.parchment }}>{t("dost.kodum")}: {kodum}</Text>
          <Pressable onPress={() => Share.share({ message: applyParams(t("dost.mesaj"), [kodum]) }).catch(() => {})} style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 7, borderWidth: 1, borderColor: "rgba(201,168,76,0.5)" }}>
            <Text style={{ fontFamily: F.display, fontSize: 10, color: C.gold }}>{t("dost.paylas")}</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        <TextInput value={giris} onChangeText={setGiris} placeholder={t("dost.yer")} placeholderTextColor={C.parchmentMuted} autoCapitalize="none" autoCorrect={false} maxLength={160}
          style={{ flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 7, color: C.parchment, fontFamily: F.serif, fontSize: 12, paddingHorizontal: 9, paddingVertical: 6 }} />
        <Pressable onPress={ekle} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 7, backgroundColor: "rgba(201,168,76,0.12)", borderWidth: 1, borderColor: "rgba(201,168,76,0.5)", justifyContent: "center" }}>
          <Text style={{ fontFamily: F.display, fontSize: 10, color: C.gold }}>{t("dost.ekle")}</Text>
        </Pressable>
      </View>
      {hata ? <Text style={{ fontFamily: F.serif, fontSize: 11, color: "#ff9b8a", marginTop: 4 }}>{hata}</Text> : null}
      {kayit.h.length === 0 ? <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, marginTop: 8 }}>{t("dost.bos")}</Text> : (
        [...kayit.h].reverse().map((h, ri) => {
          const i = kayit.h.length - 1 - ri;
          return (
            <View key={h.s + h.a + h.n} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchment }}>{applyParams(t("dost.hane"), [h.s])}</Text>
                <Text style={{ fontFamily: F.serif, fontSize: 10.5, color: C.parchmentMuted }}>{applyParams(t("dost.satir"), [h.n, h.a, h.y])}{h.e ? " · " + t("yanki.et." + h.e) : ""}</Text>
              </View>
              <Pressable onPress={() => yaz(dostCikar(kayit, i))} hitSlop={8}><Text style={{ color: C.goldDim, fontSize: 14 }}>×</Text></Pressable>
            </View>
          );
        })
      )}
    </Panel>
  );
}
