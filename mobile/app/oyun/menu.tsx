// Menü: oyunun kapısı. Mockup ekran 3 dilinde — mevsimin kasabası başlıkta, dört grup:
// Şehir (mekân kartları) · Güç & Mevki · Aile & Soy (sahneli kartlar) · Defter (madalyon rafı).
import { View, Text, Alert, ScrollView, useWindowDimensions } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGame } from "../../lib/store";
import { useI18n } from "../../lib/i18n";
import { ScreenFresk } from "../../lib/ui";
import { townSeasonImage } from "../../lib/assets";
import { currentCalendar } from "../../lib/calendar";
import { placeName } from "../../lib/locale-data";
import { useSadeMod } from "../../lib/use-sade-mod";
import { MK } from "../../lib/home-mockup-ui";
import { MENU_GROUPS, MENU_DESTS, acikMi, rozet, type MenuDest } from "../../lib/sayfa/menu/menu-data";
import { MenuHero, GroupHead, VenueTile, DefterShelf, PendingStrip, FooterButton } from "../../lib/sayfa/menu/menu-ui";
import { F } from "../../lib/theme";

const SEASON_KEY: Record<string, string> = { "Kış": "kis", "İlkbahar": "ilkbahar", "Yaz": "yaz", "Sonbahar": "sonbahar" };
const SEASON_ICON: Record<string, string> = { "Kış": "flame", "İlkbahar": "leaf", "Yaz": "sun", "Sonbahar": "wheat" };
const SIDE = 12, GAP = 10;

export default function Menu() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { state, resetGame, mpMode } = useGame();
  const { t, lang, rtl } = useI18n();
  const reduced = useSadeMod();
  const narrow = width < 360;
  const go = (to: string) => router.push(to as any);
  const cal = currentCalendar(state?.turn ?? 0);
  const place = state ? placeName(state.player.location_name, lang) : t("menu.title");
  // Defter'de "tarih" ana sayfadaki Yaşam Defteri'dir; Kronik adı Aile & Soy'daki hanedan defterine kalır.
  const label = (d: MenuDest) => d.key === "tarih" ? t("flow.lifeBook") : t("scr." + d.key);
  const visible = MENU_DESTS.filter((d) => acikMi(d, state));
  const locked = state ? MENU_DESTS.some((d) => !acikMi(d, state)) : false;
  const pending = visible.map((d) => ({ d, r: rozet(d.key, state) })).filter((x) => x.r.n > 0).sort((a, b) => Number(b.r.urgent) - Number(a.r.urgent));

  const tileW = Math.floor((Math.min(width, 640) - SIDE * 2 - GAP) / 2);
  const tileH = Math.round(Math.max(120, Math.min(138, tileW * 0.74))); // dar ekranda iki satırlık ad için pay
  const enter = (i: number) => (reduced ? undefined : FadeInUp.delay(80 + i * 90).duration(420));

  const confirmReset = () => {
    Alert.alert(t("settings.newLife"), t("settings.reset"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("menu.sifirla"), style: "destructive", onPress: async () => { try { await resetGame(); router.replace("/yeni-oyun"); } catch {} } },
    ]);
  };

  return (
    <ScreenFresk>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}>
        <MenuHero source={townSeasonImage(cal.season)} topInset={insets.top} seasonIcon={SEASON_ICON[cal.season] || "sun"} title={place}
          sub={`${cal.year}  •  ${t("cal.season." + (SEASON_KEY[cal.season] || "yaz"))}`} rtl={rtl} narrow={narrow} reduced={reduced}
          cta={t("menu.sehreCik")} ctaHint={t("scr.sehir")} onCta={() => go("/oyun/sehir")}
          mapLabel={t("scr.harita")} onMap={() => go("/oyun/harita")} settingsLabel={t("scr.ayarlar")} onSettings={() => go("/oyun/ayarlar")} />

        <View style={{ paddingHorizontal: SIDE, maxWidth: 640, width: "100%", alignSelf: "center" }}>
          {pending.length > 0 && <Animated.View entering={enter(0)} style={{ marginTop: 12 }}>
            <PendingStrip title={t("menu.bekleyen")} rtl={rtl} reduced={reduced}
              items={pending.map(({ d, r }) => ({ key: d.key, label: label(d), icon: d.icon, r, onPress: () => go(d.to) }))} />
          </Animated.View>}

          {MENU_GROUPS.map((g, gi) => {
            const items = visible.filter((d) => d.group === g.id);
            if (!items.length) return null;
            return <Animated.View key={g.id} entering={enter(gi + 1)} style={{ marginTop: 18 }}>
              <GroupHead title={t(g.title)} rtl={rtl} />
              {g.id === "defter"
                ? <DefterShelf cols={width >= 360 ? Math.min(5, items.length) : 3} rtl={rtl} reduced={reduced}
                    items={items.map((d) => ({ key: d.key, label: label(d), icon: d.icon, r: rozet(d.key, state), onPress: () => go(d.to) }))} />
                : <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", gap: GAP }}>
                    {items.map((d, i) => {
                      const wide = items.length % 2 === 1 && i === items.length - 1; // tek kalan kart tam genişlik
                      return <VenueTile key={d.key} title={label(d)} sub={t("menu.alt." + d.key)} source={d.scene!(state)} r={rozet(d.key, state)}
                        width={wide ? "100%" : tileW} height={wide ? Math.round(tileH * 0.86) : tileH} rtl={rtl} reduced={reduced} emblem={d.emblem} onPress={() => go(d.to)} />;
                    })}
                  </View>}
            </Animated.View>;
          })}

          {locked && <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 20, color: MK.muted, textAlign: "center", marginTop: 16 }}>{t("menu.buyudukce")}</Text>}

          <View style={{ marginTop: 20 }}>
            {/* MP'de "Yeni Hayat" gizli: resetGame no-op ama navigasyon yeni-oyun ekranına düşürüp SP kaydını ezdirebilirdi. */}
            <View style={{ gap: 10 }}>
              <FooterButton icon="ayarlar" label={t("scr.ayarlar")} onPress={() => go("/oyun/ayarlar")} reduced={reduced} rtl={rtl} />
              {!mpMode && <FooterButton icon="leaf" label={t("settings.newLife")} danger onPress={confirmReset} reduced={reduced} rtl={rtl} />}
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenFresk>
  );
}
