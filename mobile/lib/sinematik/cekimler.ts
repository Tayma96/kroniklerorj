// Açılış sinematiği "Küllerin Mirası": veri güdümlü çekim listesi (docs/superpowers/specs/2026-10-29-acilis-sinematigi-design.md).
// Üç perde: Dünya (herkese aynı) → Ocak (seçilen ocağa göre) → Tabiat ve kader (seçilen tabiata göre).
import type { ImageSourcePropType } from "react-native";
import type { OrtamPlan } from "../ses-plan";
import type { EfektId } from "../ses-katalog";

export type Katman = "kar" | "koz" | "ates" | "sis" | "toz";
export type Cekim = {
  id: string;
  gorsel: ImageSourcePropType;
  oran: number;   // görselin en/boy oranı
  odak: number;   // 0..1 yatay ilgi noktası; dikey ekranda kadraj buraya ortalanır
  kamera: { s: [number, number]; x: [number, number]; y: [number, number] }; // ölçek ve px kayma: başlangıç → bitiş
  katman?: Katman[];
  ton?: string;   // renk tonu örtüsü (gece, alacakaranlık)
  gecis?: "sol" | "kara" | "parla";
  ust?: string;   // yer · yıl satırı (daktilo)
  metin: string;
  ses: OrtamPlan;
  efekt?: EfektId;
  efektMs?: number;
  baslik?: boolean; // son kart: başlık + Hayata Başla
};

const G = {
  cenaze: require("../../assets/arka/cenaze.jpg"),
  baskin: require("../../assets/arka/mogol_baskin.jpg"),
  yol: require("../../assets/arka/gurbet_yol.jpg"),
  kisKoy: require("../../assets/hero/cocuk_kis.jpg"),
  dogum: require("../../assets/arka/dogum.jpg"),
  divan: require("../../assets/arka/kadi_divan.jpg"),
  tekke: require("../../assets/arka/ahi_tekke.jpg"),
  cocuk: require("../../assets/hero/cocuk_yaz.jpg"),
  nehir: require("../../assets/arka/nehir.jpg"),
  sehir: require("../../assets/tasarim/v4/town-yaz.jpg"),
};
const OCAK: Record<string, { g: ImageSourcePropType; odak: number; ates: boolean }> = {
  koylu: { g: require("../../assets/arka/ev_yoksul.jpg"), odak: 0.45, ates: true },
  esnaf: { g: require("../../assets/arka/atolye_demirci.jpg"), odak: 0.55, ates: true },
  hekim: { g: require("../../assets/arka/medrese.jpg"), odak: 0.3, ates: false },
  sipahi: { g: require("../../assets/arka/ev_varlikli.jpg"), odak: 0.4, ates: true },
};

const PERDE1: OrtamPlan = { music: "gerilim", ambiance: "bozkir" };
const PERDE2: OrtamPlan = { music: "dogum", ambiance: "kis_ruzgar" };
const PERDE3: OrtamPlan = { music: "ana_tema", ambiance: "yaz_cayir" };
const W169 = 16 / 9;

export function cekimListesi(ocak: string, tabiat: string, cinsiyet: string, ad: string, t: (k: string) => string): Cekim[] {
  const o = OCAK[ocak] ?? OCAK.koylu;
  return [
    { id: "kosedag", gorsel: G.cenaze, oran: W169, odak: 0.72, kamera: { s: [1.06, 1.22], x: [0, 0], y: [0, -10] }, katman: ["sis"], ton: "rgba(20,14,10,0.28)", gecis: "kara", ust: t("sin.ust1"), metin: t("sin.1"), ses: PERDE1, efekt: "davul_cenk", efektMs: 500 },
    { id: "yangin", gorsel: G.baskin, oran: W169, odak: 0.42, kamera: { s: [1.32, 1.14], x: [24, -8], y: [36, 10] }, katman: ["ates", "koz"], ton: "rgba(8,6,28,0.42)", metin: t("sin.2"), ses: PERDE1, efekt: "nal", efektMs: 200 },
    { id: "kervan", gorsel: G.yol, oran: W169, odak: 0.52, kamera: { s: [1.14, 1.14], x: [34, -34], y: [0, 0] }, katman: ["toz"], metin: t("sin.3"), ses: PERDE1 },
    { id: "kisgecesi", gorsel: G.kisKoy, oran: 1, odak: 0.5, kamera: { s: [1.28, 1.08], x: [0, 0], y: [-20, 0] }, katman: ["kar"], ton: "rgba(10,18,52,0.5)", gecis: "kara", ust: t("sin.ust4"), metin: t("sin.4"), ses: PERDE2 },
    { id: "ocak", gorsel: o.g, oran: W169, odak: o.odak, kamera: { s: [1.06, 1.22], x: [0, 0], y: [0, 0] }, katman: o.ates ? ["ates"] : undefined, metin: t("sin.ocak." + (OCAK[ocak] ? ocak : "koylu")), ses: PERDE2 },
    { id: "dogum", gorsel: G.dogum, oran: W169, odak: 0.47, kamera: { s: [1.22, 1.08], x: [0, 0], y: [0, 0] }, katman: ["ates"], metin: t(cinsiyet === "kadın" ? "sin.5k" : "sin.5e").replace("%n", ad), ses: PERDE2, efekt: "dogum", efektMs: 400 },
    { id: "yolcu", gorsel: G.divan, oran: W169, odak: 0.46, kamera: { s: [1.08, 1.26], x: [0, 10], y: [0, 0] }, katman: ["kar"], ton: "rgba(6,8,26,0.4)", metin: t("sin.6"), ses: PERDE2, efekt: "kapi", efektMs: 250 },
    { id: "muhur", gorsel: G.tekke, oran: W169, odak: 0.16, kamera: { s: [1.26, 1.1], x: [-10, 0], y: [0, 0] }, katman: ["ates", "koz"], metin: t("sin.7"), ses: PERDE2, efekt: "ney_nefes", efektMs: 700 },
    { id: "cocukluk", gorsel: G.cocuk, oran: 1, odak: 0.5, kamera: { s: [1.1, 1.24], x: [10, -10], y: [0, 0] }, katman: ["toz"], gecis: "kara", metin: t("sin.tab." + tabiat), ses: PERDE3 },
    { id: "safak", gorsel: G.nehir, oran: W169, odak: 0.6, kamera: { s: [1.04, 1.18], x: [0, -18], y: [0, 0] }, metin: t("sin.9"), ses: PERDE3 },
    { id: "baslik", gorsel: G.sehir, oran: 1.5, odak: 0.5, kamera: { s: [1.14, 1.02], x: [0, 0], y: [0, 0] }, katman: ["koz"], ton: "rgba(6,4,2,0.58)", gecis: "parla", metin: "", ses: PERDE3, efekt: "saz_vurgu", efektMs: 200, baslik: true },
  ];
}
