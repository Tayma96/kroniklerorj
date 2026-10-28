import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { DesignPressable as Pressable } from "./design-pressable";
import { useGame } from "./store";
import { pendingPerkCount, playerWar, sinavDurumu, MULK_YAS, GameState, varisAdaylari } from "./game";
import { useI18n } from "./i18n";
import { GameIcon } from "./icons";
import { OrnatePanel } from "./ornament-ui";
import { C, F } from "./theme";

type Item = { to: string; icon: string; acik?: (s: GameState) => boolean };
// Kademeli açılım (TASARIM_PUSULASI ilke 7): ekran oyuncunun hayatına değince görünür — çocukta sade kalır.
const RESIT = (s: GameState) => s.player.age >= 13 || s.player.dead;
// Eski Menü bölümleri; her yer artık bir sekmenin içinde ızgara olarak gösterilir.
const SECTIONS: { title: string; items: Item[] }[] = [
  { title: "Geçim", items: [
    { to: "/oyun/meslek", acik: RESIT, icon: "meslek" },
    { to: "/oyun/pazar", icon: "pazar" },
    { to: "/oyun/atolye", acik: RESIT, icon: "meslek" },
    { to: "/oyun/mulkler", acik: (s) => s.player.age >= MULK_YAS || s.player.properties.length > 0 || s.player.dead, icon: "mulkler" },
    { to: "/oyun/gorevler", icon: "scroll-open" },
    { to: "/oyun/mektep", icon: "mektep" },
    { to: "/oyun/beceriler", icon: "karakter" },
  ]},
  { title: "Güç & Mevki", items: [
    { to: "/oyun/orgutler", acik: RESIT, icon: "orgutler" },
    { to: "/oyun/sosyal", acik: RESIT, icon: "sosyal" },
    { to: "/oyun/savas", acik: (s) => RESIT(s) || !!s.story?.nemesis, icon: "savas" },
    { to: "/oyun/suc", acik: RESIT, icon: "suc" },
  ]},
  { title: "Diyar & Soy", items: [
    { to: "/oyun/sehir", icon: "sehir" },
    { to: "/oyun/mahalle", icon: "house" },
    { to: "/oyun/harita", icon: "map" },
    { to: "/oyun/haberler", icon: "haberler" },
    { to: "/oyun/hanedan", icon: "hanedan" },
    { to: "/oyun/nesil", acik: (s) => s.player.dead || s.player.married || s.player.children.length > 0 || s.player.age >= 16, icon: "dogum" },
  ]},
  { title: "Kayıt & Anı", items: [
    { to: "/oyun/hikayeler", icon: "roman" },
    { to: "/oyun/basarimlar", icon: "zafer" },
    { to: "/oyun/tarih", icon: "tarih" },
    { to: "/oyun/roman", icon: "roman" },
    { to: "/oyun/kronik", icon: "hanedan" },
    { to: "/oyun/divan", icon: "tarih" },
    { to: "/oyun/ayarlar", icon: "ayarlar" },
  ]},
];

const ALL: Record<string, Item> = Object.fromEntries(SECTIONS.flatMap((s) => s.items).map((m) => [m.to.split("/").pop() || "", m]));
const LABEL: Record<string, string> = { tarih: "flow.lifeBook" }; // "Kronik" adı kronik sayfasıyla çakışmasın
const EXTRA: Record<string, Item> = { sss: { to: "/oyun/sss", icon: "scroll-open" }, kronik: { to: "/oyun/kronik", icon: "hanedan" }, divan: { to: "/oyun/divan", icon: "tarih" } };

// Yer ızgarası: sekmenin altında o sekmeye ait sayfalara giden üçlü kutular; bekleyen iş rozetle görünür.
export function PlaceGrid({ title, icon = "sun", keys }: { title: string; icon?: string; keys: string[] }) {
  const router = useRouter();
  const { state } = useGame();
  const { t } = useI18n();
  const p = state?.player;
  const badgeFor = (key: string): { n: number; urgent: boolean } => {
    if (!state || !p) return { n: 0, urgent: false };
    switch (key) {
      case "beceriler": return { n: pendingPerkCount(p), urgent: false };
      case "meslek": { const ry = state.player.rakip; const yaris = !!ry && !ry.bitti && ry.prof === state.player.profession && ry.yaris != null; const ck = state.player.cirak; const ihmal = !!ck && ck.prof === state.player.profession && ck.ihmal >= 2; return { n: sinavDurumu(state)?.hazir || yaris || ihmal ? 1 : 0, urgent: yaris || ihmal }; } // Ahilik: peştamal sınavı hazır
      case "hikayeler": return { n: state.story?.active ? 1 : 0, urgent: false };
      case "orgutler": return { n: playerWar(state) ? 1 : 0, urgent: true };
      case "pazar": return { n: state.caravan ? 1 : 0, urgent: false };
      case "haberler": return { n: Math.min(9, Math.max(0, state.turn - (state.newsSeenTurn ?? state.turn))), urgent: false }; // son ziyaretten beri geçen aylar (ilk açılışa dek sessiz)
      case "nesil": return { n: p.dead && varisAdaylari(state).length > 0 ? 1 : 0, urgent: true };
      default: return { n: 0, urgent: false };
    }
  };
  const items = keys.map((k) => ALL[k] || EXTRA[k]).filter((m): m is Item => !!m && (!state || !m.acik || m.acik(state)));
  if (!items.length) return null;
  return <OrnatePanel title={title} icon={icon}>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {items.map((m) => {
        const key = m.to.split("/").pop() || "";
        const b = badgeFor(key);
        return <Pressable key={m.to} accessibilityLabel={t(LABEL[key] || "scr." + key)} onPress={() => router.push(m.to as any)} style={({ pressed }) => ({ flexBasis: "30%", flexGrow: 1, minHeight: 78, alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 8, borderWidth: 1, borderColor: pressed ? C.gold : C.borderHi, backgroundColor: pressed ? "rgba(60,44,24,0.9)" : "rgba(36,27,17,0.85)" })}>
          <GameIcon name={m.icon} size={26} color={C.goldBright} />
          <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 17, color: C.parchment, textAlign: "center" }}>{t(LABEL[key] || "scr." + key)}</Text>
          {b.n > 0 && <View style={{ position: "absolute", top: 5, right: 6, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: "center", justifyContent: "center", backgroundColor: b.urgent ? "#B5331F" : C.gold }}>
            <Text style={{ fontFamily: F.display, fontSize: 11, color: b.urgent ? "#FFF4E2" : C.inkOnGold }}>{b.n}</Text>
          </View>}
        </Pressable>;
      })}
    </View>
  </OrnatePanel>;
}
