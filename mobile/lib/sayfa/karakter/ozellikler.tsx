// Özellikler sekmesi: dört nitelik (puan dağıtımı), beceriler, dört sermaye, mevki ve halkın algısı.
import { useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { DesignPressable as Pressable } from "../../design-pressable";
import { useGame } from "../../store";
import { useI18n, yuzdeL } from "../../i18n";
import { hap } from "../../haptics";
import { GameIcon } from "../../icons";
import { sermayeler, SermayeId, allocateStat, Stats, pendingPerkCount, statXpOf, statXpForNext, statTierKey, publicPerception, atHome } from "../../game";
import { C, F } from "../../theme";
import { Pano, Giris, Cubuk, KR, yon } from "./parca";

const NITELIK: { k: keyof Stats; icon: string; ad: string; tone: string }[] = [
  { k: "strength", icon: "guc", ad: "st.strength", tone: C.ember },
  { k: "intelligence", icon: "zeka", ad: "st.intelligence", tone: C.azure },
  { k: "charisma", icon: "karizma", ad: "st.charisma", tone: C.rose },
  { k: "stamina", icon: "dayaniklilik", ad: "st.stamina", tone: C.sage },
];

export function OzelliklerSekmesi() {
  const { state, apply } = useGame();
  const { t, lang } = useI18n();
  const router = useRouter();
  const { rtl, row, ta } = yon(lang);
  const [sermayeAcik, setSermayeAcik] = useState<SermayeId | null>(null);
  const p = state!.player;
  const canAdd = p.stat_points > 0;
  const add = (k: keyof Stats) => { hap("success"); apply((s) => allocateStat(s, k)); };
  const perks = pendingPerkCount(p);

  const sm = sermayeler(state!);
  const zayif = [...sm].sort((a, b) => a.deger - b.deger)[0];
  const RENK: Record<SermayeId, string> = { para: C.gold, cevre: C.sage, bilgi: C.azure, nam: C.ember };
  const IKON: Record<SermayeId, string> = { para: "akce", cevre: "iliskiler", bilgi: "meslek", nam: "crown" };
  const acik = sm.find((x) => x.id === sermayeAcik);
  const pp = publicPerception(state!);

  return <>
    {/* Nitelikler: 2×2 kart; puan varsa her kartta +1 */}
    <Giris i={0}>
      <Pano title={t("char.attrs")} icon="guc" rtl={rtl} right={canAdd ? <View style={{ paddingHorizontal: 9, height: 24, borderRadius: 12, justifyContent: "center", backgroundColor: "rgba(201,162,78,0.2)", borderWidth: 1, borderColor: C.gold }}>
        <Text style={{ fontFamily: F.display, fontSize: 11.5, lineHeight: 15, color: C.goldBright }}>{p.stat_points} {t("char.points")}</Text>
      </View> : undefined}>
        <View style={{ flexDirection: row, flexWrap: "wrap", gap: 8 }}>
          {NITELIK.map((n) => {
            const v = p.stats[n.k]; const ad = t(n.ad); const xpNext = v < 10 ? statXpForNext(v) : 0; const xp = statXpOf(p, n.k);
            return <View key={n.k} accessible={!canAdd} accessibilityLabel={`${ad}: ${v} / 10, ${t(statTierKey(v))}`} style={{ width: "48.6%", flexGrow: 1, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: KR.well, padding: 10, gap: 6 }}>
              <View style={{ flexDirection: row, alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: n.tone, alignItems: "center", justifyContent: "center", backgroundColor: "#120C06" }}>
                  <GameIcon name={n.icon} size={20} color={n.tone} />
                </View>
                <Text style={{ fontFamily: F.display, fontSize: 26, lineHeight: 30, color: C.goldBright }}>{v}<Text style={{ fontSize: 12, color: C.parchmentMuted }}> /10</Text></Text>
              </View>
              <View>
                <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 12.5, lineHeight: 16, color: C.parchmentDim, textAlign: ta }}>{ad}</Text>
                <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 18, color: n.tone, textAlign: ta }}>{t(statTierKey(v))}</Text>
              </View>
              <Cubuk pct={v * 10} tone={n.tone} h={5} rtl={rtl} />
              {xpNext ? <Cubuk pct={(xp / xpNext) * 100} tone={C.goldBright} h={2} rtl={rtl} /> : null}
              {canAdd && v < 10 ? <Pressable accessibilityRole="button" accessibilityLabel={`${ad} +1`} onPress={() => add(n.k)}
                style={({ pressed }) => ({ minHeight: 44, borderRadius: 7, borderWidth: 1, borderBottomWidth: pressed ? 1 : 2.5, borderColor: C.gold, borderBottomColor: "#080503", backgroundColor: pressed ? "rgba(201,162,78,0.1)" : "rgba(201,162,78,0.2)", alignItems: "center", justifyContent: "center", transform: [{ translateY: pressed ? 1.5 : 0 }] })}>
                <Text style={{ fontFamily: F.display, fontSize: 15, color: C.goldBright }}>+1</Text>
              </Pressable> : null}
            </View>;
          })}
        </View>
      </Pano>
    </Giris>

    {/* Beceriler — dokununca beceri ağacı */}
    <Giris i={1}>
      <Pano title={t("char.skills")} icon="medal" rtl={rtl} right={perks > 0 ? <View style={{ paddingHorizontal: 9, height: 24, borderRadius: 12, justifyContent: "center", backgroundColor: KR.alert, borderWidth: 1, borderColor: "#FBE3C4" }}>
        <Text style={{ fontFamily: F.display, fontSize: 11.5, lineHeight: 15, color: "#FFF4E2" }}>{perks}</Text>
      </View> : undefined}>
        <Pressable accessibilityRole="button" accessibilityLabel={perks > 0 ? `${t("char.skills")}: ${perks} ${t("char.perksAvail")}` : t("char.skills")} onPress={() => { hap("tap"); router.push("/oyun/beceriler"); }}
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
          {([["combat", "guc"], ["trade", "akce"], ["crafting", "meslek"], ["social", "karizma"]] as const).map(([sk, ic]) => (
            <View key={sk} style={{ flexDirection: row, alignItems: "center", gap: 9, marginBottom: 8 }}>
              <GameIcon name={ic} size={15} color={C.goldDim} />
              <Text numberOfLines={1} style={{ width: 92, fontFamily: F.display, fontSize: 12, color: C.parchmentDim, textAlign: ta }}>{t("skill." + sk)}</Text>
              <View style={{ flex: 1 }}><Cubuk pct={p.skills[sk] * 10} tone={C.gold} h={5} rtl={rtl} /></View>
              <Text style={{ width: 24, textAlign: "center", fontFamily: F.display, fontSize: 14, color: C.parchment }}>{p.skills[sk]}</Text>
            </View>
          ))}
          <View style={{ flexDirection: row, alignItems: "center", justifyContent: "center", gap: 6, minHeight: 40, borderRadius: 7, borderWidth: 1, borderColor: C.borderHi, backgroundColor: "rgba(42,31,19,0.7)" }}>
            <Text style={{ fontFamily: F.display, fontSize: 12.5, color: C.gold }}>{perks > 0 ? `${perks} ${t("char.perksAvail")}` : t("char.skills")}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 18, lineHeight: 20, color: C.gold }}>{rtl ? "‹" : "›"}</Text>
          </View>
        </Pressable>
      </Pano>
    </Giris>

    {/* Dört sermaye: dokununca katkı dökümü; kapalıyken en zayıfı için yol */}
    <Giris i={2}>
      <Pano title={t("sermaye.baslik")} icon="akce" rtl={rtl}>
        <View style={{ flexDirection: row, gap: 6 }}>
          {sm.map((x) => {
            const on = sermayeAcik === x.id;
            return <Pressable key={x.id} accessibilityRole="button" accessibilityLabel={`${t("sermaye." + x.id)}: ${x.deger}`} accessibilityState={{ expanded: on }} onPress={() => { hap("tap"); setSermayeAcik(on ? null : x.id); }}
              style={({ pressed }) => ({ flex: 1, minWidth: 0, alignItems: "center", paddingVertical: 9, paddingHorizontal: 3, borderRadius: 8, borderWidth: on ? 1.5 : 1, borderColor: on ? RENK[x.id] : C.border, backgroundColor: on ? RENK[x.id] + "1A" : KR.well, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
              <GameIcon name={IKON[x.id]} size={18} color={RENK[x.id]} />
              <Text style={{ fontFamily: F.display, fontSize: 19, lineHeight: 24, color: C.parchment, marginTop: 3 }}>{x.deger}</Text>
              <Text numberOfLines={1} style={{ maxWidth: "100%", fontFamily: F.display, fontSize: 10.5, lineHeight: 13, color: C.parchmentMuted }}>{t("sermaye." + x.id)}</Text>
              <View style={{ alignSelf: "stretch", marginHorizontal: 6, marginTop: 6 }}><Cubuk pct={x.deger} tone={RENK[x.id]} h={3} rtl={rtl} /></View>
            </Pressable>;
          })}
        </View>
        {acik && acik.kalemler.length ? (
          <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border }}>
            {acik.kalemler.map((k, i) => (
              <View key={i} style={{ flexDirection: row, paddingVertical: 2 }}>
                <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchmentDim, textAlign: ta }}>{t(k.k)}</Text>
                <Text style={{ fontFamily: F.display, fontSize: 13, color: k.v > 0 ? C.sage : C.blood }}>{k.v > 0 ? "+" + k.v : k.v}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, lineHeight: 21, marginTop: 10, textAlign: ta }}>{t("sermaye.ipucu." + zayif.id)}</Text>
        )}
      </Pano>
    </Giris>

    {/* Mevki & bağlılık: dört toplumsal değer + bulunduğun yerde halkın algısı */}
    <Giris i={3}>
      <Pano title={t("char.status")} icon="orgutler" rtl={rtl}>
        <View style={{ flexDirection: row, gap: 6 }}>
          {([["karakter", "soc.reputation.l", p.reputation, C.sage], ["zafer", "soc.honor.l", p.honor, C.frost], ["suc", "soc.fear.l", p.fear, C.blood], ["orgutler", "soc.fame.l", p.fame, C.goldSoft]] as const).map(([ic, key, val, tone]) => (
            <View key={key} accessible accessibilityLabel={`${t(key)}: ${Math.round(val)}`} style={{ flex: 1, minWidth: 0, alignItems: "center", paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: KR.well, gap: 3 }}>
              <GameIcon name={ic} size={17} color={tone} />
              <Text style={{ fontFamily: F.display, fontSize: 18, lineHeight: 22, color: tone }}>{Math.round(val)}</Text>
              <Text numberOfLines={1} style={{ maxWidth: "100%", paddingHorizontal: 2, fontFamily: F.display, fontSize: 10.5, lineHeight: 13, color: C.parchmentMuted }}>{t(key)}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: row, alignItems: "center", gap: 10, marginTop: 11, paddingTop: 11, borderTopWidth: 1, borderTopColor: C.border + "AA" }}>
          <GameIcon name={atHome(p) ? "sehir" : "firsatlar"} size={18} color={C.gold} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 20, color: C.parchment, textAlign: ta }}>{t("percept." + pp.key)}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 11.5, lineHeight: 16, color: C.parchmentMuted, marginTop: 2, textAlign: ta }}>
              {(atHome(p) ? t("soc.home") : t("soc.away"))} · {t("soc.recog")}: {yuzdeL(Math.round(pp.recog * 100), lang)}
            </Text>
          </View>
        </View>
      </Pano>
    </Giris>
  </>;
}
