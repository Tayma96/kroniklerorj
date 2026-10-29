// Ocak sekmesi: ana-baba ve eş (portre madalyonları), evlatlar ve torunlar, kardeşler,
// yoldaşlar (usta, çocukluk yoldaşı, at, kedi, köpek) ve hanedan bağlantısı. Aylık bakım eylemleri burada.
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { DesignPressable as Pressable } from "../../design-pressable";
import { useGame } from "../../store";
import { useI18n, applyParams } from "../../i18n";
import { hap } from "../../haptics";
import { playPurr, playBark } from "../../sound";
import { GameIcon } from "../../icons";
import { Portre } from "../../ui";
import { Torunlar } from "../../torun-ui";
import { localFirstName } from "../../world";
import { aileUyesi, kisiProfil, yoldasAdi, yoldasDurumu, ustamKim, spouseMizac, spendWithSpouse, tendChild, visitParents, tendPet, tendDog, cocuklaVakitSec, yasayanEvlatAdlari } from "../../game";
import { C, F } from "../../theme";
import { Pano, Giris, Dugme, AltBaslik, Cubuk, KR, yon } from "./parca";

// Aile madalyonu: portre + rol + ad + yaş; gerçek kişiyse dokununca profili; rahmetliyse soluk.
function AkrabaMadalyon({ role, name, age, gender, seed, has, olu, late, onPress }: { role: string; name: string; age: number; gender: "erkek" | "kadın"; seed: string | number; has: boolean; olu?: boolean; late: string; onPress?: () => void }) {
  return <Pressable disabled={!onPress} accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={`${role}: ${name}${has ? ", " + (olu ? late : String(age)) : ""}`} onPress={() => { hap("tap"); onPress?.(); }}
    style={({ pressed }) => ({ flex: 1, minWidth: 0, alignItems: "center", gap: 4, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 8, borderWidth: 1, borderColor: has ? KR.frame + "99" : C.border, backgroundColor: KR.well, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
    {has ? (
      <View style={{ width: 62, height: 62, borderRadius: 31, padding: 2, borderWidth: 1.5, borderColor: olu ? C.border : KR.frameHi, backgroundColor: "#0E0A06", opacity: olu ? 0.5 : 1 }}>
        <Portre age={age} gender={gender} size={55} ring={false} seed={seed} />
      </View>
    ) : (
      <View style={{ width: 62, height: 62, borderRadius: 31, borderWidth: 1, borderStyle: "dashed", borderColor: C.border, alignItems: "center", justifyContent: "center" }}>
        <GameIcon name="iliskiler" size={24} color={C.parchmentMuted} />
      </View>
    )}
    <Text numberOfLines={1} style={{ marginTop: 2, fontFamily: F.display, fontSize: 10.5, letterSpacing: 0.6, color: C.goldDim }}>{role}</Text>
    <Text numberOfLines={1} style={{ maxWidth: "100%", fontFamily: F.serif, fontSize: 15, lineHeight: 18, color: has && !olu ? C.parchment : C.parchmentMuted, textAlign: "center" }}>{name}</Text>
    {has ? <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 16, color: C.parchmentMuted }}>{olu ? late : String(age)}</Text> : null}
  </Pressable>;
}

// Yoldaş satırı: ikon madalyonu, ad ve durum; sağda isteğe bağlı eylem ya da profil oku.
function YoldasSatiri({ icon, tone = C.gold, title, sub, onOpen, action, rtl, first }: { icon: string; tone?: string; title: string; sub?: string; onOpen?: () => void; action?: React.ReactNode; rtl: boolean; first?: boolean }) {
  const body = <>
    <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#120C06", borderWidth: 1.5, borderColor: tone }}>
      <GameIcon name={icon} size={20} color={tone} />
    </View>
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 20, color: C.parchment, textAlign: rtl ? "right" : "left" }}>{title}</Text>
      {sub ? <Text numberOfLines={2} style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 18, color: C.parchmentMuted, textAlign: rtl ? "right" : "left" }}>{sub}</Text> : null}
    </View>
    {action ?? (onOpen ? <Text style={{ fontFamily: F.display, fontSize: 20, color: C.gold }}>{rtl ? "‹" : "›"}</Text> : null)}
  </>;
  const style = { flexDirection: (rtl ? "row-reverse" : "row") as "row" | "row-reverse", alignItems: "center" as const, gap: 10, minHeight: 56, paddingVertical: 7, borderTopWidth: first ? 0 : 1, borderTopColor: C.border + "AA" };
  return onOpen ? <Pressable accessibilityRole="button" accessibilityLabel={sub ? `${title}, ${sub}` : title} onPress={() => { hap("tap"); onOpen(); }} style={({ pressed }) => [style, { opacity: pressed ? 0.75 : 1 }]}>{body}</Pressable> : <View style={style}>{body}</View>;
}

export function OcakSekmesi() {
  const { state, apply } = useGame();
  const { t, lang } = useI18n();
  const router = useRouter();
  const { rtl, row, ta } = yon(lang);
  const s = state!; const p = s.player;
  const ac = (id: string) => () => router.push(`/oyun/npc/${id}`);
  const spouseGender: "erkek" | "kadın" = p.gender === "erkek" ? "kadın" : "erkek";
  const an = aileUyesi(s, "anne", lang), ba = aileUyesi(s, "baba", lang), es = aileUyesi(s, "es", lang);
  const livingChildren = yasayanEvlatAdlari(s);
  const kardesler = (p.sibling_ids || []).map((id) => kisiProfil(s, id, lang)).filter((x): x is NonNullable<typeof x> => !!x);

  // Eş satırı: mizaç, bağ ve "vakit geçir" (ayda bir).
  const esSatiri = p.married && p.spouse_seed != null ? (() => {
    const nm = es?.ilkAd ?? localFirstName(p.spouse_seed!, spouseGender, lang);
    const bond = p.spouse_bond ?? 40;
    const spent = p.spouse_time_turn === s.turn;
    const mk = "mizac." + (p.spouse_mizac || spouseMizac(p.spouse_seed!)); const kv = t(mk + ".k");
    const mizac = spouseGender === "kadın" && kv !== mk + ".k" ? kv : t(mk);
    return <View style={{ marginTop: 10, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: KR.well, gap: 8 }}>
      <View style={{ flexDirection: row, alignItems: "center", gap: 8 }}>
        <GameIcon name="ring" size={16} color={C.gold} />
        <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: C.parchmentDim, textAlign: ta }}>{t("misc.spouse")}: <Text style={{ color: C.parchment }}>{nm}</Text> · <Text style={{ fontFamily: F.serifItalic }}>{mizac}</Text></Text>
        <Text style={{ fontFamily: F.display, fontSize: 12.5, color: bond >= 60 ? C.sage : bond >= 30 ? C.parchment : C.ember }}>{t("char.bond")} {bond}</Text>
      </View>
      <Cubuk pct={bond} tone={bond >= 60 ? C.sage : bond >= 30 ? C.gold : C.ember} h={4} rtl={rtl} />
      <Dugme full icon="ring" label={t("char.spendTime")} disabled={spent} rtl={rtl} onPress={() => apply((x) => spendWithSpouse(x))} />
    </View>;
  })() : null;

  // Yoldaşlar
  const usta = (() => { const u = ustamKim(s); if (!u) return null; const pr = kisiProfil(s, u.id, lang); return pr ? { id: u.id, ad: pr.npc.name.split(" ")[0] } : null; })();
  const dost = p.child_friend ? (() => {
    const cf = p.child_friend!; const d = yoldasDurumu(p);
    const status = d === "cocuk" ? t("child.friend.label") : d === "omurluk" ? t("child.friend.lifelong") : d === "rakip" ? t("child.friend.rivalStatus") : t("child.friend.parted");
    return { id: cf.id, ad: yoldasAdi(s, lang) || "", status, kayitli: !!kisiProfil(s, cf.id, lang) };
  })() : null;
  const kedi = !p.dead && p.pet ? p.pet : null;
  const kopek = !p.dead && p.dog ? p.dog : null;
  const at = p.horse && p.horse_name ? p.horse_name : null;
  const yoldasVar = !!(usta || dost || kedi || kopek || at);
  let ilk = true; const first = () => { const f = ilk; ilk = false; return f; };

  return <>
    <Giris i={0}>
      <Pano title={t("char.family")} icon="iliskiler" rtl={rtl}>
        <View style={{ flexDirection: row, gap: 7 }}>
          <AkrabaMadalyon role={t("char.mother")} has olu={an ? an.olu : !!p.mother_dead} late={t("npc.late")} onPress={an ? ac(an.id) : undefined}
            name={an ? an.ilkAd : p.mother_seed != null ? localFirstName(p.mother_seed, "kadın", lang) : (p.mother || t("char.none"))}
            age={an ? an.yas : p.age + 26} gender="kadın" seed={an ? an.id : p.mother_seed ?? `${p.name}-m`} />
          <AkrabaMadalyon role={t("char.father")} has olu={ba ? ba.olu : !!p.father_dead} late={t("npc.late")} onPress={ba ? ac(ba.id) : undefined}
            name={ba ? ba.ilkAd : p.father_seed != null ? localFirstName(p.father_seed, "erkek", lang) : (p.father || t("char.none"))}
            age={ba ? ba.yas : p.age + 28} gender="erkek" seed={ba ? ba.id : p.father_seed ?? `${p.name}-f`} />
          <AkrabaMadalyon role={t("char.spouse")} has={!!es || p.spouse_seed != null || !!p.spouse_name} olu={es ? es.olu : !!p.widowed} late={t("npc.late")} onPress={es ? ac(es.id) : undefined}
            name={es ? es.ilkAd : p.spouse_seed != null ? localFirstName(p.spouse_seed, spouseGender, lang) : (p.spouse_name || t("char.none"))}
            age={es ? es.yas : Math.max(16, p.age - 1)} gender={spouseGender} seed={es ? es.id : p.spouse_seed ?? `${p.name}-s`} />
        </View>
        {esSatiri}
        {/* Ana-baba ziyareti: en az biri hayattaysa, ayda bir */}
        {!(p.mother_dead && p.father_dead) ? <View style={{ marginTop: 10 }}>
          <Dugme full icon="sehir" rtl={rtl} disabled={p.parent_visit_turn === s.turn} onPress={() => apply((x) => visitParents(x))}
            label={`${t("char.visitParents")}${p.parent_bond != null ? ` · ${t("char.bond")} ${p.parent_bond}` : ""}`} />
        </View> : null}
      </Pano>
    </Giris>

    <Giris i={1}>
      <Pano title={t("char.children")} icon="dogum" rtl={rtl} right={<Text style={{ fontFamily: F.display, fontSize: 14, color: C.gold }}>{livingChildren.length}</Text>}>
        {p.children.length === 0 ? (
          <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: C.parchmentMuted, textAlign: ta }}>{t("char.none")}</Text>
        ) : (
          <View style={{ flexDirection: row, flexWrap: "wrap", gap: 6 }}>
            {p.children.map((c, i) => { const cid = p.child_ids?.[c], late = !!cid && !!kisiProfil(s, cid, lang)?.olu; return ( // gerçek kişiyse profil; rahmetli hatıra olarak kalır
              <Pressable key={i} testID={cid ? "family-child-" + cid : undefined} accessibilityRole={cid ? "button" : undefined} accessibilityLabel={late ? `${c}, ${t("npc.late")}` : c} disabled={!cid} onPress={() => { if (cid) { hap("tap"); router.push(`/oyun/npc/${cid}`); } }}
                style={{ flexDirection: row, alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 11, borderRadius: 22, borderWidth: 1, borderColor: cid ? KR.frame + "99" : C.border, backgroundColor: KR.well, opacity: late ? 0.58 : 1 }}>
                <GameIcon name="dogum" size={13} color={C.goldDim} />
                <Text style={{ fontFamily: F.serif, fontSize: 15, color: late ? C.parchmentMuted : C.parchment }}>{c}{late ? ` · ${t("npc.late")}` : ""}</Text>
              </Pressable>
            ); })}
          </View>
        )}
        {livingChildren.length > 0 ? (() => {
          const local = cocuklaVakitSec(s), tended = p.child_time_turn === s.turn || !local;
          return <View style={{ marginTop: 10 }}><Dugme full icon="baby" rtl={rtl} disabled={tended} label={t(local ? "char.tendChildren" : "evlat.noneLocal")} onPress={() => apply((x) => tendChild(x))} /></View>;
        })() : null}
        <Torunlar state={s} onOpen={(id) => { hap("tap"); router.push(`/oyun/npc/${id}`); }} />
        {/* Kardeşler — aynı ocakta büyüyen gerçek kişiler */}
        {kardesler.length ? <>
          <AltBaslik icon="iliskiler" title={t("char.siblings")} count={kardesler.filter((k) => !k.olu).length} rtl={rtl} />
          <View style={{ flexDirection: row, flexWrap: "wrap", gap: 6 }}>
            {kardesler.map((k) => (
              <Pressable key={k.npc.id} accessibilityRole="button" accessibilityLabel={`${k.npc.name.split(" ")[0]}, ${k.olu ? t("npc.late") : k.npc.age}`} onPress={() => { hap("tap"); router.push(`/oyun/npc/${k.npc.id}`); }}
                style={{ flexDirection: row, alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 11, borderRadius: 22, borderWidth: 1, borderColor: KR.frame + "99", backgroundColor: KR.well, opacity: k.olu ? 0.55 : 1 }}>
                <Portre age={k.npc.age} gender={k.npc.gender} seed={k.npc.id} size={26} ring={false} />
                <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.parchment }}>{k.npc.name.split(" ")[0]}</Text>
                <Text style={{ fontFamily: F.serifItalic, fontSize: 14, color: C.parchmentMuted }}>{k.olu ? t("npc.late") : String(k.npc.age)}</Text>
              </Pressable>
            ))}
          </View>
        </> : null}
      </Pano>
    </Giris>

    {yoldasVar ? <Giris i={2}>
      <Pano title={t("karakter.yoldaslar")} icon="compass" rtl={rtl}>
        {usta ? <YoldasSatiri first={first()} rtl={rtl} icon="anvil" title={usta.ad} sub={t("char.usta")} onOpen={ac(usta.id)} /> : null}
        {dost ? <YoldasSatiri first={first()} rtl={rtl} icon="iliskiler" tone={C.roseDim} title={dost.ad} sub={`${t("child.friend.of")} · ${dost.status}`} onOpen={dost.kayitli ? ac(dost.id) : undefined} /> : null}
        {at ? <YoldasSatiri first={first()} rtl={rtl} icon="compass" tone={C.sage} title={at} sub={t("misc.horse")} /> : null}
        {kedi ? (() => {
          const away = kedi.away_until !== undefined, done = p.pet_turn === s.turn || away;
          const yil = Math.floor(Math.max(0, s.turn - kedi.born) / 12);
          return <YoldasSatiri first={first()} rtl={rtl} icon="wool" title={`${kedi.n} · ${t("char.pet")}`}
            sub={`${t("char.huy." + (kedi.huy || "tembel"))} · ${away ? t("char.petAway") : `${yil < 1 ? t("char.petNew") : applyParams(t("char.petYears"), [yil])} · ${t("char.petBond")} ${kedi.bond}`}`}
            action={<Dugme label={done ? t("char.petDone") : t("char.petTend")} disabled={done} rtl={rtl} onPress={() => { playPurr(); apply((x) => tendPet(x)); }} />} />;
        })() : null}
        {kopek ? (() => {
          const done = p.dog_turn === s.turn;
          const yil = Math.floor(Math.max(0, s.turn - kopek.born) / 12);
          return <YoldasSatiri first={first()} rtl={rtl} icon="sheep" tone={C.sage} title={`${kopek.n} · ${t("char.dog")}`}
            sub={`${yil < 1 ? t("char.petNew") : applyParams(t("char.petYears"), [yil])} · ${t("char.petBond")} ${kopek.bond}`}
            action={<Dugme label={done ? t("char.petDone") : t("char.petTend")} disabled={done} tone={C.sage} rtl={rtl} onPress={() => { playBark(); apply((x) => tendDog(x)); }} />} />;
        })() : null}
      </Pano>
    </Giris> : null}

    <Giris i={3}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("scr.hanedan")} onPress={() => { hap("tap"); router.push("/oyun/hanedan"); }}
        style={({ pressed }) => ({ flexDirection: row, alignItems: "center", gap: 12, minHeight: 60, paddingHorizontal: 12, marginBottom: 12, borderRadius: 8, borderWidth: 1, borderColor: KR.frame, backgroundColor: pressed ? "rgba(42,31,19,0.95)" : "rgba(24,18,11,0.92)" })}>
        <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#120C06", borderWidth: 1.5, borderColor: C.gold }}><GameIcon name="hanedan" size={20} color={C.gold} /></View>
        <Text style={{ flex: 1, fontFamily: F.display, fontSize: 15, color: C.gold, textAlign: ta }}>{t("scr.hanedan")}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 22, color: C.gold }}>{rtl ? "‹" : "›"}</Text>
      </Pressable>
    </Giris>
  </>;
}
