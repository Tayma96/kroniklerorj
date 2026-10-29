// Serüven sekmesi: köken (çocukluk/gençlik izi), lakap ve savaş sicili, Kül Yemini destanı, lonca, yaralar.
import { View, Text } from "react-native";
import { useGame } from "../../store";
import { useI18n, lakapAdi } from "../../i18n";
import { GameIcon } from "../../icons";
import { C, F } from "../../theme";
import { Pano, Giris, AltBaslik, KR, yon } from "./parca";

export function SeruvenSekmesi() {
  const { state } = useGame();
  const { t, lang } = useI18n();
  const { rtl, row, ta } = yon(lang);
  const s = state!; const p = s.player;
  const kadin = p.gender === "kadın";
  const z = p.zafer || 0, b = p.bozgun || 0;
  const gecmis = (p.lakaplar || []).filter((x) => x !== p.lakap);
  let i = 0;

  const koken = (icon: string, ad: string, aciklama: string, tone: string) => <View style={{ flexDirection: row, gap: 10, marginTop: 8 }}>
    <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "#120C06", borderWidth: 1.5, borderColor: tone }}><GameIcon name={icon} size={19} color={tone} /></View>
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={{ fontFamily: F.display, fontSize: 13.5, lineHeight: 18, color: tone, textAlign: ta }}>{ad}</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 21, color: C.parchmentDim, textAlign: ta }}>{aciklama}</Text>
    </View>
  </View>;

  return <>
    {p.childhood || p.genclik ? <Giris i={i++}>
      <Pano title={t("karakter.koken")} icon="scroll" rtl={rtl}>
        <View style={{ marginTop: -8 }}>
          {p.childhood ? koken("baby", t("childhood." + p.childhood), t("childhood." + p.childhood + ".d"), C.gold) : null}
          {p.genclik ? koken("banner", t("genclik." + p.genclik), t("genclik." + p.genclik + ".d"), C.sage) : null}
        </View>
      </Pano>
    </Giris> : null}

    {/* Lakap & sicil: oynayış tarzının halktaki adı + savaş kaydı */}
    <Giris i={i++}>
      <Pano title={t("kar.lakap")} icon="crown" rtl={rtl}>
        {p.lakap ? (
          <View style={{ flexDirection: row, alignItems: "center", gap: 10 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#120C06", borderWidth: 2, borderColor: C.goldBright }}><GameIcon name="crown" size={22} color={C.goldBright} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: 17, lineHeight: 22, color: C.goldBright, textAlign: ta }}>{lakapAdi(p.lakap, kadin, t)}</Text>
              <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 21, color: C.parchmentDim, marginTop: 2, textAlign: ta }}>{t("lakap." + p.lakap + ".d")}</Text>
            </View>
          </View>
        ) : (
          <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, lineHeight: 21, textAlign: ta }}>{t("kar.lakapYok")}</Text>
        )}
        {z + b > 0 ? <>
          <AltBaslik icon="crossed-swords" title={t("kar.sicil")} rtl={rtl} />
          <View style={{ flexDirection: row, gap: 8 }}>
            <View accessible accessibilityLabel={`${z} ${t("kar.zafer")}`} style={{ flex: 1, flexDirection: row, alignItems: "center", gap: 8, minHeight: 44, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: C.sage + "77", backgroundColor: KR.well }}>
              <GameIcon name="zafer" size={18} color={C.sage} />
              <Text style={{ fontFamily: F.display, fontSize: 17, color: C.sage }}>{z}</Text>
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.serif, fontSize: 14, color: C.parchmentMuted, textAlign: ta }}>{t("kar.zafer")}</Text>
            </View>
            <View accessible accessibilityLabel={`${b} ${t("kar.bozgun")}`} style={{ flex: 1, flexDirection: row, alignItems: "center", gap: 8, minHeight: 44, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: C.blood + "77", backgroundColor: KR.well }}>
              <GameIcon name="skull" size={18} color={C.blood} />
              <Text style={{ fontFamily: F.display, fontSize: 17, color: C.blood }}>{b}</Text>
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.serif, fontSize: 14, color: C.parchmentMuted, textAlign: ta }}>{t("kar.bozgun")}</Text>
            </View>
          </View>
        </> : null}
        {gecmis.length > 0 ? <>
          <AltBaslik icon="crown" title={t("kar.lakaplar")} rtl={rtl} />
          <View style={{ flexDirection: row, flexWrap: "wrap", gap: 6 }}>
            {gecmis.map((id) => (
              <View key={id} style={{ borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingVertical: 3, paddingHorizontal: 10, backgroundColor: KR.well }}>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentDim }}>{lakapAdi(id, kadin, t)}</Text>
              </View>
            ))}
          </View>
        </> : null}
      </Pano>
    </Giris>

    {/* Kül Yemini: perde ve bölüm ilerleyişi */}
    {s.saga ? (() => {
      const sg = s.saga!; const done = sg.act >= 3 && sg.ch >= 5; const ch = Math.min(sg.ch, 5);
      return <Giris i={i++}>
        <Pano title={t("saga.title")} icon="scroll-open" rtl={rtl}>
          {done ? <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 21, color: C.gold, textAlign: ta }}>{t("saga.bandDone")}</Text> : <>
            <Text style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 21, color: C.parchment, textAlign: ta }}>{t("saga.actName" + sg.act)} · {ch}/5</Text>
            <View accessible accessibilityLabel={`${ch}/5`} style={{ flexDirection: row, gap: 6, marginTop: 9 }}>
              {Array.from({ length: 5 }).map((_, k) => <View key={k} style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: k < ch ? C.gold : "rgba(0,0,0,0.45)", borderWidth: 0.5, borderColor: k < ch ? C.goldBright : C.border }} />)}
            </View>
          </>}
        </Pano>
      </Giris>;
    })() : null}

    <Giris i={i++}>
      <Pano title={t("char.guild")} icon="orgutler" rtl={rtl}>
        <Text style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 21, color: p.faction ? C.gold : C.parchmentMuted, textAlign: ta }}>{p.faction ? t("fac." + p.faction + ".n") : t("char.none")}</Text>
      </Pano>
    </Giris>

    {p.injuries && p.injuries.length > 0 ? <Giris i={i++}>
      <Pano title={t("char.injuries")} icon="healing" tone={C.blood} rtl={rtl}>
        {p.injuries.map((inj, k) => (
          <View key={k} style={{ flexDirection: row, justifyContent: "space-between", alignItems: "center", minHeight: 34, borderTopWidth: k ? 1 : 0, borderTopColor: C.border + "88" }}>
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: "#E8796A", textAlign: ta }}>{inj.label}</Text>
            <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted }}>{inj.permanent ? t("char.permanent") : `${inj.weeks_left} ${t("char.mo")}`}</Text>
          </View>
        ))}
      </Pano>
    </Giris> : null}
  </>;
}
