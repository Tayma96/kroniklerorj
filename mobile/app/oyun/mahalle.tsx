import { DesignPressable as Pressable } from "../../lib/design-pressable";
// Mahalle ve gün (NUFUS.md Aşama 5): bu ay kim hangi mekânda — gerçek kişilerden. Ayda bir mekâna uğranır,
// ocağındakilerle ayda bir akşam sofrası kurulur. Kilitler motorda (mahalle_turn / sofra_turn); burada yalnız gösterim.
// Görünüm: mevsimin kasaba resmi harita olur; beş mekân madalyonla iğnelenir, seçilenin ayrıntısı altta açılır.
import { useMemo, useState } from "react";
import { View, Text, ScrollView, useWindowDimensions } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { mahalle, mekanaGit, MEKANLAR, MEKAN_YAS, Mekan, sofraKatilimcilari, aksamSofrasi, kisiProfil, kasabaGozu, inJail } from "../../lib/game";
import { useI18n, renderEvt, applyParams } from "../../lib/i18n";
import { placeName } from "../../lib/locale-data";
import { ITEMS } from "../../lib/world";
import { currentCalendar } from "../../lib/calendar";
import { townSeasonImage } from "../../lib/assets";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { hap } from "../../lib/haptics";
import { playTap, playEffect } from "../../lib/sound";
import type { EfektId } from "../../lib/ses-katalog";
import { useSadeMod } from "../../lib/use-sade-mod";
import { BackLabel, ScreenFresk } from "../../lib/ui";
import { Ornament } from "../../lib/home-mockup-ui";
import { MahalleHaritasi, MEKAN_ICON, igneX, type HaritaIgnesi } from "../../lib/sayfa/mahalle/harita";
import { MekanKarti, SonucKarti, SofraPaneli, GozPaneli, type Kisi } from "../../lib/sayfa/mahalle/kartlar";

// Uğrağın sesi mekânın kendisi: çarşıda kese, camide ney, kahvede su, meydanda saz, handa nal.
const MEKAN_SES: Record<Mekan, EfektId> = { carsi: "akce_kese", cami: "ney_nefes", kahve: "su", meydan: "saz_vurgu", han: "nal" };

type Sonuc = { src: "mekan"; m: Mekan; text: string } | { src: "sofra"; text: string };

export default function Mahalle() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const reduced = useSadeMod();
  const { state, apply } = useGame();
  const { lang, t, tg } = useI18n();
  const rtl = lang === "ar";
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);
  const [sec, setSec] = useState<Mekan | null>(null);
  const yerler = useMemo(() => (state ? mahalle(state, lang) : null), [state?.pop, state?.turn, state?.player.location_name, lang]);
  const goz = useMemo(() => (state ? kasabaGozu(state) : null), [state]); // kasabanın gözünde: huy gruplarına göre bakış ve sebep
  if (!state || !yerler) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const p = state.player;
  const gidildi = p.mahalle_turn === state.turn;
  const sofraKurulu = p.sofra_turn === state.turn;
  const zindan = inJail(p);
  const sofra = sofraKatilimcilari(state);
  const female = p.gender === "kadın";
  const season = currentCalendar(state.turn).season;
  // Varsayılan seçim: yaşın yettiği en kalabalık mekân.
  const secili: Mekan = sec ?? MEKANLAR.reduce<Mekan>((best, m) => (p.age >= MEKAN_YAS[m] && (p.age < MEKAN_YAS[best] || yerler[m].length > yerler[best].length) ? m : best), "carsi");
  const kisiMetni = (n: number) => applyParams(t("mahalle.kisi"), [n], lang);
  const npcAc = (id: string) => { hap("tap"); playTap(); router.push(`/oyun/npc/${id}`); };
  // Eylemden sonra motorun yazdığı son olayı aynı dilde göster (gösterilen = olan).
  const git = (m: Mekan) => {
    hap("success");
    const r = mekanaGit(state, m); if (r === state) return; // saf motor: sonuç burada okunur, durum tek seferde uygulanır
    const e = r.history[r.history.length - 1];
    playEffect(MEKAN_SES[m]);
    apply(() => r); setSonuc(e ? { src: "mekan", m, text: renderEvt(e.k, e.text, e.p, lang, t, female) } : null);
  };
  const sofraKur = () => {
    hap("success");
    const r = aksamSofrasi(state); if (r === state) return;
    const e = r.history[r.history.length - 1];
    playEffect("kapi");
    apply(() => r); setSonuc(e ? { src: "sofra", text: renderEvt(e.k, e.text, e.p, lang, t, female) } : null);
  };

  const pins: HaritaIgnesi[] = MEKANLAR.map((m) => {
    const ad = t("mh." + m + ".n"), sayi = yerler[m].length, kilitli = p.age < MEKAN_YAS[m];
    return { m, ad, sayi, kilitli, etiket: `${ad}, ${kisiMetni(sayi)}${kilitli ? ". " + t("mh.yas") : ""}` };
  });
  const kisiler: Kisi[] = yerler[secili].map((n) => ({ id: n.id, ad: n.name.split(" ")[0], tamAd: n.name, age: n.age, gender: n.gender, tanidik: state.relationships[n.id] !== undefined }));
  const tanidik = kisiler.filter((k) => k.tanidik).length;
  const kucuk = p.age < MEKAN_YAS[secili];
  const mekanKapali = kucuk ? { icon: "hourglass", text: t("mh.yas") } : zindan ? { icon: "prisoner", text: t("mahalle.zindan") } : gidildi ? { icon: "walk", text: t("mh.gidildi") } : null;
  const secAd = t("mh." + secili + ".n");

  const sofraKisi: Kisi[] = sofra.flatMap((k) => { const pr = kisiProfil(state, k.id, lang); return pr ? [{ id: k.id, ad: pr.npc.name.split(" ")[0], tamAd: pr.npc.name, age: pr.npc.age, gender: pr.npc.gender, tanidik: true }] : []; });
  const yiyecekVar = Object.keys(p.inventory).some((id) => p.inventory[id] > 0 && ITEMS[id]?.feed);
  const bedelYetmez = !yiyecekVar && p.money < 3;
  const sofraKapali = sofraKurulu ? { icon: "bread", text: t("sofra.done") } : zindan ? { icon: "prisoner", text: t("mahalle.zindan") } : null;
  const sonucKarti = (icon: string, baslik: string, metin: string) => <SonucKarti icon={icon} baslik={baslik} metin={metin} rtl={rtl} reduced={reduced} />;

  return (
    <ScreenFresk style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>
        {/* Başlık: dönüş, "kim nerede", mahalle ve yerleşim adı */}
        <View style={{ paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12 }}>
          <View style={{ flexDirection: rtl ? "row-reverse" : "row" }}>
            <Pressable onPress={() => router.back()} style={({ pressed }) => ({ paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: "rgba(221,180,90,0.38)", backgroundColor: pressed ? "rgba(42,31,19,0.85)" : "rgba(14,10,6,0.6)" })}><BackLabel /></Pressable>
          </View>
          <Animated.View entering={reduced ? undefined : FadeInDown.duration(320)} style={{ marginTop: 12 }}>
            <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 7 }}>
              <Ornament size={14} color={C.gold} />
              <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1.6, color: C.goldSoft, textShadowColor: "#000", textShadowRadius: 6 }}>{t("mh.kicker")}</Text>
            </View>
            <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", flexWrap: "wrap", columnGap: 10, rowGap: 4, marginTop: 4 }}>
              <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 30, lineHeight: 38, color: "#F7EBD2", textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 10, textShadowOffset: { width: 0, height: 2 } }}>{t("scr.mahalle")}</Text>
              <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: "rgba(221,180,90,0.55)", backgroundColor: "rgba(14,10,6,0.62)" }}>
                <GameIcon name="house" size={13} color={C.gold} />
                <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchment }}>{placeName(p.location_name, lang)}</Text>
              </View>
            </View>
            <Text style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 22, color: "#EBDDBF", marginTop: 3, textAlign: rtl ? "right" : "left", textShadowColor: "#000", textShadowRadius: 6 }}>{t("mh.sub")}</Text>
          </Animated.View>
        </View>

        <MahalleHaritasi source={townSeasonImage(season)} pins={pins} secili={secili} reduced={reduced} label={t("mahalle.harita")} hint={t("mahalle.ipucu")}
          onSec={(m) => { if (m !== secili) { hap("selection"); playTap(); } setSec(m); }} />

        <View style={{ paddingHorizontal: 14, paddingTop: 6 }}>
          {/* Seçili mekân: kimler orada, ne getirir, bu ay uğranabilir mi */}
          <MekanKarti anahtar={secili} okX={Math.max(18, Math.min(width - 46, igneX(secili, width) - 14))} icon={MEKAN_ICON[secili]} ad={secAd} aciklama={kucuk ? t("mh.yas") : t("mh." + secili + ".d")}
            sayiMetni={kisiMetni(kisiler.length)} tanidikMetni={tanidik ? applyParams(t("mahalle.tanidik"), [tanidik], lang) : null} yasSiniri={kucuk ? MEKAN_YAS[secili] : null}
            kisiler={kisiler} bosMetni={t("mh.bos")} kapali={mekanKapali} dugme={p.dead ? null : { label: t("mh.git"), a11y: `${t("mh.git")}: ${secAd}` }}
            onKisi={npcAc} onGit={() => git(secili)} rtl={rtl} reduced={reduced} />

          {sonuc?.src === "mekan" ? sonucKarti(MEKAN_ICON[sonuc.m], `${t("mahalle.sonuc")} · ${t("mh." + sonuc.m + ".n")}`, sonuc.text) : null}

          {/* Akşam sofrası — ocağındaki gerçek aile aynı yerdeyse */}
          <SofraPaneli title={t("sofra.title")} sub={sofra.length ? t("sofra.sub") : t("sofra.yok")} kisiler={sofraKisi} bedel={t("mahalle.sofraBedel")} bedelYetmez={bedelYetmez && !sofraKurulu}
            kapali={sofraKapali} dugme={p.dead ? null : t("sofra.btn")} onKisi={npcAc} onKur={sofraKur} rtl={rtl}
            sonuc={sonuc?.src === "sofra" ? sonucKarti("bread", t("sofra.title"), sonuc.text) : null} />

          {/* Kasabanın gözünde — aynı nâm her huyda aynı yankıyı bulmaz; grup grup ortalama bakış ve en ağır sebep */}
          {goz && goz.toplam > 0 ? <GozPaneli title={t("mh.goz.title")} rtl={rtl} sebepEtiketi={t("mh.goz.sebep")}
            ozet={renderEvt("mh.goz.dost", "", [goz.dost, goz.hasim], lang, t, female)}
            soylenti={goz.soylenti ? renderEvt("mh.goz.soylenti", "", [goz.soylenti], lang, t, female) : null}
            satirlar={goz.gruplar.map((g) => ({ key: g.grup, ad: t("huy.grup." + g.grup), n: g.n, ort: g.ort, sebep: g.sebep ? (g.sebep === "gorus.ani" && g.sebepTur ? "«" + tg("mem.remember." + g.sebepTur, female) + "»" : t(g.sebep)) : null }))} /> : null}
        </View>
      </ScrollView>
    </ScreenFresk>
  );
}
