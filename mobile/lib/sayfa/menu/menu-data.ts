// Menü merkezi: her hedefin grubu, sahnesi, ikonu, açılma kapısı ve bekleyen-iş rozeti.
// Kademeli açılım (TASARIM_PUSULASI ilke 7): ekran oyuncunun hayatına değince menüye girer — çocuk menüsü sade kalır.
import type { ImageSourcePropType } from "react-native";
import { pendingPerkCount, playerWar, sinavDurumu, MULK_YAS, varisAdaylari, nemesisEncounter, type GameState } from "../../game";
import { venueImage, mulkImage, subjImage, armaImage, MAP_HERO } from "../../assets";
import { SAHNE_GORSEL } from "../../sahne-tema";

export type MenuGroupId = "sehir" | "guc" | "aile" | "defter";
export type MenuDest = {
  to: string;
  key: string;            // "scr.<key>" başlığı, "menu.alt.<key>" alt yazısı
  icon: string;
  group: MenuGroupId;
  scene?: (s: GameState | null) => ImageSourcePropType; // Defter madalyonlarında sahne yok
  emblem?: boolean;       // sahne yerine madalyon (arma)
  acik?: (s: GameState) => boolean;
};

const RESIT = (s: GameState) => s.player.age >= 13 || s.player.dead;
const sabit = (src: ImageSourcePropType) => () => src;

export const MENU_GROUPS: { id: MenuGroupId; title: string; icon: string }[] = [
  { id: "sehir", title: "menu.grp.sehir", icon: "castle" },
  { id: "guc", title: "menu.grp.guc", icon: "crown" },
  { id: "aile", title: "menu.grp.aile", icon: "family" },
  { id: "defter", title: "menu.grp.defter", icon: "book" },
];

// Şehir / Diyar ve Ayarlar sahne başlığındadır (büyük düğme + dişli); burada sayfa gövdesindeki yerler.
export const MENU_DESTS: MenuDest[] = [
  // Şehir — çarşı, tezgâh, mahalle: kendi sahnesiyle mekân kartları
  { to: "/oyun/pazar", key: "pazar", icon: "pazar", group: "sehir", scene: sabit(venueImage("pazar")) },
  { to: "/oyun/atolye", key: "atolye", icon: "anvil", group: "sehir", scene: sabit(venueImage("atolye")), acik: RESIT },
  { to: "/oyun/meslek", key: "meslek", icon: "meslek", group: "sehir", scene: sabit(mulkImage("dukkan")), acik: RESIT },
  { to: "/oyun/mulkler", key: "mulkler", icon: "mulkler", group: "sehir", scene: sabit(venueImage("mulkler")), acik: (s) => s.player.age >= MULK_YAS || s.player.properties.length > 0 || s.player.dead },
  { to: "/oyun/mahalle", key: "mahalle", icon: "house", group: "sehir", scene: sabit(venueImage("mahalle")) },
  { to: "/oyun/mektep", key: "mektep", icon: "mektep", group: "sehir", scene: sabit(venueImage("mektep")) },
  { to: "/oyun/haberler", key: "haberler", icon: "haberler", group: "sehir", scene: sabit(venueImage("haberler")) },
  { to: "/oyun/gorevler", key: "gorevler", icon: "scroll-open", group: "sehir", scene: sabit(SAHNE_GORSEL.hasat) },
  { to: "/oyun/harita", key: "harita", icon: "map", group: "sehir", scene: sabit(MAP_HERO) },
  // Güç & Mevki
  { to: "/oyun/orgutler", key: "orgutler", icon: "orgutler", group: "guc", scene: sabit(venueImage("orgutler")), acik: RESIT },
  { to: "/oyun/sosyal", key: "sosyal", icon: "sosyal", group: "guc", scene: sabit(venueImage("iliskiler")), acik: RESIT },
  { to: "/oyun/beceriler", key: "beceriler", icon: "medal", group: "guc", scene: sabit(subjImage("beden")) },
  { to: "/oyun/savas", key: "savas", icon: "savas", group: "guc", scene: sabit(SAHNE_GORSEL.mogol_baskin), acik: (s) => RESIT(s) || !!s.story?.nemesis },
  { to: "/oyun/suc", key: "suc", icon: "suc", group: "guc", scene: sabit(SAHNE_GORSEL.kadi_divan), acik: RESIT },
  // Aile & Soy
  { to: "/oyun/hanedan", key: "hanedan", icon: "hanedan", group: "aile", scene: sabit(venueImage("hanedan")) },
  { to: "/oyun/nesil", key: "nesil", icon: "dogum", group: "aile", scene: sabit(SAHNE_GORSEL.dogum), acik: (s) => s.player.dead || s.player.married || s.player.children.length > 0 || s.player.age >= 16 },
  { to: "/oyun/kronik", key: "kronik", icon: "hanedan", group: "aile", scene: (s) => armaImage(s ? s.player.surname || s.player.name : "x"), emblem: true }, // hanedanın kendi arması
  // Defter — okunacak kayıtlar: madalyon rafı
  { to: "/oyun/hikayeler", key: "hikayeler", icon: "scroll-open", group: "defter" },
  { to: "/oyun/tarih", key: "tarih", icon: "hourglass", group: "defter" },
  { to: "/oyun/roman", key: "roman", icon: "book", group: "defter" },
  { to: "/oyun/basarimlar", key: "basarimlar", icon: "zafer", group: "defter" },
  { to: "/oyun/divan", key: "divan", icon: "scales", group: "defter" },
];

export function acikMi(d: MenuDest, s: GameState | null): boolean { return !s || !d.acik || d.acik(s); }

export type Rozet = { n: number; urgent: boolean };
const BOS: Rozet = { n: 0, urgent: false };
// Ekran başına eylem bekleyen durum rozeti: {n: sayı, urgent: kırmızı mı}.
export function rozet(key: string, state: GameState | null): Rozet {
  if (!state) return BOS;
  const p = state.player;
  switch (key) {
    case "beceriler": return { n: pendingPerkCount(p), urgent: false };
    case "meslek": { // Ahilik: peştamal sınavı hazır, rakip yarışı ya da ihmal edilen çırak
      const ry = p.rakip; const yaris = !!ry && !ry.bitti && ry.prof === p.profession && ry.yaris != null;
      const ck = p.cirak; const ihmal = !!ck && ck.prof === p.profession && ck.ihmal >= 2;
      return { n: sinavDurumu(state)?.hazir || yaris || ihmal ? 1 : 0, urgent: yaris || ihmal };
    }
    case "hikayeler": return { n: state.story?.active ? 1 : 0, urgent: false };
    case "orgutler": return { n: playerWar(state) ? 1 : 0, urgent: true };
    case "pazar": return { n: state.caravan ? 1 : 0, urgent: false };
    case "haberler": return { n: Math.min(9, Math.max(0, state.turn - (state.newsSeenTurn ?? state.turn))), urgent: false }; // son ziyaretten beri geçen aylar (ilk açılışa dek sessiz)
    case "nesil": return { n: p.dead && varisAdaylari(state).length > 0 ? 1 : 0, urgent: true };
    case "savas": return { n: !p.dead && nemesisEncounter(state) ? 1 : 0, urgent: true }; // son hesaplaşma bekliyor
    case "suc": return { n: !p.dead && state.pendingScene?.kind === "trial" ? 1 : 0, urgent: true }; // mahkeme sahnesi
    case "hanedan": return { n: !p.dead && state.crownCampaign ? 1 : 0, urgent: false }; // taht seferi sürüyor
    default: return BOS;
  }
}
