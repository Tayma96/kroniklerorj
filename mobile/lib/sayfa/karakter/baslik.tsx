// Karakter başlığı: hanedan arması, portre madalyonu, ad-meslek-künye; hayati göstergeler ve kariyer;
// "Bu Ay" madalyonları (emek, uğraşlar, hekim, hamam). Eylemler eski ekranla aynı motor çağrılarıdır.
import { View, Text, Image, useWindowDimensions } from "react-native";
import { DesignPressable as Pressable } from "../../design-pressable";
import { useGame } from "../../store";
import { useI18n, lakapliAd } from "../../i18n";
import { playWater } from "../../sound";
import { GameIcon } from "../../icons";
import { Portre } from "../../ui";
import { armaImage } from "../../assets";
import { placeName, careerTitleL } from "../../locale-data";
import { canWork, inJail, professionById, kariyerXp, healerCost, visitHealer, hamamCost, visitHamam, playEnergy, PLAY_COST, studyEnergy, STUDY_COST } from "../../game";
import { C, F } from "../../theme";
import { Pano, Madalyon, Rozet, Cubuk, Giris, AltBaslik, KR, yon } from "./parca";

// Kimlik: üstte arma + hanedan ve ayar; altta portre madalyonu ile ad, meslek ve künye rozetleri.
export function KarakterKimlik({ onSettings }: { onSettings: () => void }) {
  const { state } = useGame();
  const { t, lang } = useI18n();
  const { rtl, row, ta } = yon(lang);
  const narrow = useWindowDimensions().width < 360;
  const p = state!.player;
  const hasCareer = p.profession !== "işsiz" && !!professionById(p.profession);
  const ev = (p.surname || p.name);
  const golge = { textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 8, textShadowOffset: { width: 0, height: 1 } };
  const portre = narrow ? 92 : 108;
  return <View style={{ paddingTop: 8 }}>
    <View style={{ flexDirection: row, alignItems: "center", gap: 9, marginBottom: 10 }}>
      <View style={{ width: 34, height: 34, borderRadius: 7, borderWidth: 1.5, borderColor: KR.frameHi, overflow: "hidden", backgroundColor: "#1A1208" }}>
        <Image accessible={false} source={armaImage(ev)} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      </View>
      <Text numberOfLines={1} style={[{ flex: 1, fontFamily: F.display, fontSize: 13, letterSpacing: 1.2, color: "#F1E2C2", textAlign: ta }, golge]}>{t("dyn.houseOf").replace("%s", ev).toUpperCase()}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t("scr.ayarlar")} onPress={onSettings} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(8,5,2,0.45)" }}>
        <GameIcon name="ayarlar" size={21} color={C.goldBright} />
      </Pressable>
    </View>
    <View style={{ flexDirection: row, alignItems: "center", gap: 14, marginBottom: 12 }}>
      <View style={{ width: portre + 8, height: portre + 8, borderRadius: (portre + 8) / 2, padding: 2, borderWidth: 2, borderColor: KR.frameHi, backgroundColor: "#0E0A06", shadowColor: "#000", shadowOpacity: 0.7, shadowRadius: 8, elevation: 8 }}>
        <View style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: portre / 2, borderWidth: 1, borderColor: C.gold + "55" }} />
        <Portre age={p.age} gender={p.gender} size={portre} ring={false} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text accessibilityRole="header" numberOfLines={2} style={[{ fontFamily: F.display, fontSize: narrow ? 20 : 23, lineHeight: narrow ? 25 : 28, color: "#F7EBD2", textAlign: ta }, golge]}>{lakapliAd(p.name, p.lakap, p.gender === "kadın", t)}</Text>
        <View style={{ flexDirection: row, alignItems: "center", gap: 6 }}>
          <GameIcon name="meslek" size={14} color={C.gold} />
          <Text numberOfLines={1} style={[{ flexShrink: 1, fontFamily: F.serifItalic, fontSize: 16, lineHeight: 20, color: C.parchment }, golge]}>{hasCareer ? careerTitleL(p.profession, kariyerXp(p), lang, p.gender === "kadın") : t("misc.jobless")}</Text>
        </View>
        <View style={{ flexDirection: row, flexWrap: "wrap", gap: 5, marginTop: 3 }}>
          <Rozet text={`${p.age} ${t("misc.age")} · ${p.gender === "kadın" ? t("misc.female") : t("misc.male")}`} />
          <Rozet icon="sehir" text={placeName(p.location_name, lang)} />
          <Rozet icon="star" text={`${p.generation}. ${t("misc.generation")}`} />
          {inJail(p) ? <Rozet icon="prisoner" tone={C.blood} text={`${t("jail.title")} · ${p.jail!.left} ${t("char.mo")}`} /> : null}
        </View>
      </View>
    </View>
  </View>;
}

// Künye kartı: hayati göstergeler (sağlık, tokluk, akçe, ün), süreğen hastalık, kariyer deneyimi ve "Bu Ay" madalyonları.
export function KarakterGostergeler({ onEmek, onUgras }: { onEmek: () => void; onUgras: () => void }) {
  const { state } = useGame();
  const { t, lang } = useI18n();
  const { rtl, row, ta } = yon(lang);
  const narrow = useWindowDimensions().width < 360;
  const p = state!.player;
  const hasCareer = p.profession !== "işsiz" && !!professionById(p.profession);
  const careerLevel = Math.floor(p.career_xp / 30) + 1, xpInLevel = p.career_xp % 30;
  const un = Math.floor((p.fame || 0) / 20);
  const para = Math.round(p.money);
  const cells = [
    { icon: "saglik", label: t("char.health"), value: String(Math.round(p.health)), max: 100, tone: C.blood },
    { icon: "tokluk", label: t("char.hunger"), value: String(Math.round(p.hunger)), max: 100, tone: C.sage },
    { icon: "akce", label: t("char.money"), value: para >= 100000 ? new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(para) : String(para), tone: C.gold },
    { icon: "orgutler", label: t("karakter.un"), value: String(un), max: 5, tone: C.goldSoft },
  ];
  return <Giris i={0}>
    <Pano rtl={rtl}>
      <View style={{ flexDirection: row, flexWrap: narrow ? "wrap" : "nowrap", rowGap: 10 }}>
        {cells.map((c, i) => { const sep = narrow ? i % 2 === 1 : i > 0; return (
          <View key={c.icon} accessible accessibilityLabel={`${c.label}: ${c.value}${c.max ? " / " + c.max : ""}`} style={{ flex: narrow ? undefined : 1, width: narrow ? "50%" : undefined, minWidth: 0, paddingHorizontal: 7, gap: 3, borderLeftWidth: !rtl && sep ? 1 : 0, borderRightWidth: rtl && sep ? 1 : 0, borderColor: C.border }}>
            <View style={{ flexDirection: row, alignItems: "center", gap: 5 }}>
              <GameIcon name={c.icon} size={16} color={c.tone} />
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.serif, fontSize: 12.5, lineHeight: 15, color: C.parchmentMuted, textAlign: ta }}>{c.label}</Text>
            </View>
            <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 17, lineHeight: 21, color: C.parchment, textAlign: ta }}>{c.value}{c.max ? <Text style={{ fontSize: 10.5, color: C.parchmentMuted }}> / {c.max}</Text> : null}</Text>
            {c.max ? <Cubuk pct={(Number(c.value) / c.max) * 100} tone={c.tone} h={4} rtl={rtl} /> : <View style={{ height: 4 }} />}
          </View>
        ); })}
      </View>
      {p.chronic ? <View style={{ flexDirection: row, alignItems: "center", gap: 7, marginTop: 10, alignSelf: rtl ? "flex-end" : "flex-start", minHeight: 30, paddingHorizontal: 10, borderRadius: 15, borderWidth: 1, borderColor: "rgba(200,64,64,0.55)", backgroundColor: "rgba(160,48,42,0.14)" }}>
        <GameIcon name="skull" size={13} color={C.blood} />
        <Text style={{ fontFamily: F.display, fontSize: 12, color: "#E8796A" }}>{t("chr." + p.chronic.k)}</Text>
      </View> : null}
      {hasCareer ? <View accessible accessibilityLabel={`${t("char.careerXp")} ${careerLevel}: ${xpInLevel} / 30`} style={{ flexDirection: row, alignItems: "center", gap: 10, marginTop: 11, paddingTop: 11, borderTopWidth: 1, borderTopColor: C.border + "AA" }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: C.gold, backgroundColor: "#2A1808", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: F.display, fontSize: 14, color: C.goldBright }}>{careerLevel}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: row, justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={{ fontFamily: F.display, fontSize: 11.5, letterSpacing: 1, color: C.parchmentMuted }}>{t("char.careerXp")}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>{xpInLevel} / 30</Text>
          </View>
          <Cubuk pct={(xpInLevel / 30) * 100} tone={C.goldBright} h={6} rtl={rtl} />
        </View>
      </View> : null}
      <BuAySirasi onEmek={onEmek} onUgras={onUgras} />
    </Pano>
  </Giris>;
}

// Bu Ay: kendine dönük aylık eylemler madalyon dizisinde. Emek ve uğraş alttan panel açar; hekim ve hamam doğrudan.
function BuAySirasi({ onEmek, onUgras }: { onEmek: () => void; onUgras: () => void }) {
  const { state, apply } = useGame();
  const { t, lang } = useI18n();
  const { rtl, row } = yon(lang);
  const s = state!; const p = s.player;
  if (p.dead) return null;
  const emekVar = p.age >= 13 && p.profession !== "işsiz";
  const ugrasVar = !inJail(p) && p.age >= 7;
  const bakimVar = p.age >= 13;
  if (!emekVar && !ugrasVar && !bakimVar) return null;
  const calisti = emekVar && !canWork(s);
  const ugrasKey = p.age < 13 ? "child.title" : p.age < 18 ? "genc.title" : p.age < 55 ? "adult.title" : "elder.title";
  const ugrasIcon = p.age < 13 ? "party" : p.age < 18 ? "lyre" : p.age < 55 ? "medal" : "prayer-beads";
  const hak = p.age < 18 ? Math.floor(playEnergy(s) / PLAY_COST) : Math.floor(studyEnergy(s) / STUDY_COST);
  const seen = p.healer_turn === s.turn, cost = healerCost(s);
  const hseen = p.hamam_turn === s.turn, hcost = hamamCost(s);
  const items = [
    emekVar && <Madalyon key="emek" icon="calis" label={t("karakter.emek")} a11y={`${t("flow.workTitle")}: ${calisti ? t("act.workedThisTurn") : t("char.workReady")}`} done={calisti} alert={!calisti} onPress={onEmek} />,
    ugrasVar && <Madalyon key="ugras" icon={ugrasIcon} tone={C.emberSoft} label={t("karakter.ugras")} tag={hak > 0 ? `${hak}` : undefined} a11y={`${t(ugrasKey)}: ${t("char.ugrasSub")}`} done={hak <= 0} onPress={onUgras} />,
    bakimVar && <Madalyon key="hekim" icon="healing" tone={C.sage} label={t("karakter.hekim")} tag={`${cost}⚜`} a11y={seen ? t("char.healerDone") : `${t("char.healer")} · ${cost}⚜`} done={seen} disabled={seen || p.money < cost} onPress={() => apply((x) => visitHealer(x))} />,
    bakimVar && <Madalyon key="hamam" icon="bucket" tone={C.frost} label={t("char.hamam")} tag={`${hcost}⚜`} a11y={hseen ? t("char.hamamDone") : `${t("char.hamam")} · ${hcost}⚜`} done={hseen} disabled={hseen || p.money < hcost} onPress={() => { playWater(); apply((x) => visitHamam(x)); }} />,
  ].filter(Boolean);
  return <>
    <AltBaslik icon="ilerle" title={t("karakter.buAy")} rtl={rtl} />
    <View style={{ flexDirection: row, justifyContent: items.length < 4 ? "space-evenly" : "space-between", marginHorizontal: -6, marginTop: -4 }}>{items}</View>
  </>;
}
