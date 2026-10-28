import { SAHNE_GORSEL, type SahneTema } from "./sahne-tema";

// Her gerçek rota tasarım envanterinde yer alır. Mekanik/MP protokolü burada yoktur.
export type DesignFamily = "life" | "craft" | "people" | "realm" | "journey" | "book" | "system";
export type ScreenDesign = { route: string; titleKey: string; family: DesignFamily; scene: SahneTema; icon: string };
const page = (route: string, titleKey: string, family: DesignFamily, scene: SahneTema, icon: string): ScreenDesign => ({ route, titleKey, family, scene, icon });
export const SCREEN_DESIGNS: readonly ScreenDesign[] = [
  page("/", "menu.title", "life", "gurbet_yol", "book"),
  page("/yeni-oyun", "new.title", "life", "dogum", "leaf"),
  page("/oyun", "flow.anotherMonth", "life", "gurbet_yol", "hourglass"),
  page("/oyun/karakter", "tab.character", "life", "ev_varlikli", "karakter"),
  page("/oyun/sehir", "scr.sehir", "journey", "cami_avlu", "castle"),
  page("/oyun/npc/[id]", "tab.relations", "people", "ev_yoksul", "family"),
  page("/oyun/atolye", "scr.atolye", "craft", "atolye_demirci", "anvil"),
  page("/oyun/pazar", "scr.pazar", "craft", "cami_avlu", "scales"),
  page("/oyun/meslek", "scr.meslek", "craft", "ahi_tekke", "anvil"),
  page("/oyun/emek", "scr.emek", "system", "medrese", "book"),
  page("/oyun/mulkler", "scr.mulkler", "craft", "hasat", "house"),
  page("/oyun/beceriler", "scr.beceriler", "craft", "medrese", "medal"),
  page("/oyun/mektep", "scr.mektep", "craft", "medrese", "mektep"),
  page("/oyun/gorevler", "scr.gorevler", "craft", "ahi_tekke", "scroll-open"),
  page("/oyun/iliskiler", "rel.headTitle", "people", "cami_avlu", "family"),
  page("/oyun/mahalle", "scr.mahalle", "people", "ev_yoksul", "house"),
  page("/oyun/sosyal", "scr.sosyal", "people", "dugun", "family"),
  page("/oyun/copcatan", "cc.title", "people", "dugun", "ring"),
  page("/oyun/ocak", "scr.ocak", "people", "ev_varlikli", "family"),
  page("/oyun/nesil", "scr.nesil", "people", "dogum", "leaf"),
  page("/oyun/hanedan", "scr.hanedan", "realm", "ev_varlikli", "crown"),
  page("/oyun/diplomasi", "dp.title", "realm", "kadi_divan", "scroll-open"),
  page("/oyun/orgutler", "scr.orgutler", "realm", "ahi_tekke", "banner"),
  page("/oyun/savas", "scr.savas", "realm", "mogol_baskin", "crossed-swords"),
  page("/oyun/suc", "scr.suc", "realm", "kadi_divan", "scales"),
  page("/oyun/harita", "scr.harita", "journey", "gurbet_yol", "map"),
  page("/oyun/diyar/[name]", "city.localInfo", "journey", "cami_avlu", "castle"),
  page("/oyun/haberler", "scr.haberler", "book", "cami_avlu", "speaker"),
  page("/oyun/tarih", "scr.tarih", "book", "medrese", "scroll-open"),
  page("/oyun/kronik", "scr.kronik", "book", "medrese", "book"),
  page("/oyun/roman", "rom.eyebrow", "book", "ev_varlikli", "book"),
  page("/oyun/hikayeler", "scr.hikayeler", "book", "gurbet_yol", "book"),
  page("/oyun/divan", "divan.title", "book", "kadi_divan", "scroll-open"),
  page("/oyun/basarimlar", "scr.basarimlar", "book", "medrese", "medal"),
  page("/oyun/menu", "menu.title", "system", "ev_varlikli", "compass"),
  page("/oyun/ayarlar", "settings.title", "system", "medrese", "ayarlar"),
  page("/oyun/sss", "scr.sss", "system", "medrese", "book"),
  page("/cok-oyunculu", "mp.title", "system", "cami_avlu", "family"),
  page("/cok-oyunculu/oyun", "mp.realm", "realm", "ev_varlikli", "banner"),
  page("/cok-oyunculu/harita", "mp.map.title", "journey", "gurbet_yol", "map"),
  page("/cok-oyunculu/diplomasi", "mp.soc.title", "realm", "kadi_divan", "scroll-open"),
  page("/cok-oyunculu/diyar", "mp.realm", "journey", "cami_avlu", "castle"),
];
export function screenDesign(path: string): ScreenDesign {
  const route = path.replace(/\/$/, "") || "/";
  const key = route.startsWith("/oyun/npc/") ? "/oyun/npc/[id]" : route.startsWith("/oyun/diyar/") ? "/oyun/diyar/[name]" : route;
  return SCREEN_DESIGNS.find(d => d.route === key) || SCREEN_DESIGNS[2];
}
export function screenArt(path: string) { return SAHNE_GORSEL[screenDesign(path).scene]; }
