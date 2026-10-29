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
  vo?: string;    // Türkçe anlatıcı kaydının anahtarı (lib/sinematik/anlatim.ts)
};

const G = {
  // FLUX.1 schnell ile bu projede üretilen dikey sahneler (assets/sinematik/KAYNAK.md)
  kosedag: require("../../assets/sinematik/kosedag.jpg"),
  yangin: require("../../assets/sinematik/yangin.jpg"),
  yol: require("../../assets/arka/gurbet_yol.jpg"),
  kisKoy: require("../../assets/hero/cocuk_kis.jpg"),
  dogum: require("../../assets/arka/dogum.jpg"),
  yolcu: require("../../assets/sinematik/yolcu.jpg"),
  muhur: require("../../assets/sinematik/muhur.jpg"),
  cocukE: require("../../assets/sinematik/cocukluk_e.jpg"),
  cocukK: require("../../assets/sinematik/cocukluk_k.jpg"),
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
const DIKEY = 9 / 16; // FLUX sahneleri 720×1280

export function cekimListesi(ocak: string, tabiat: string, cinsiyet: string, ad: string, t: (k: string) => string): Cekim[] {
  const o = OCAK[ocak] ?? OCAK.koylu;
  return [
    { id: "kosedag", vo: "sin.1", gorsel: G.kosedag, oran: DIKEY, odak: 0.5, kamera: { s: [1.03, 1.16], x: [0, 0], y: [0, -14] }, katman: ["sis"], ton: "rgba(20,14,10,0.16)", gecis: "kara", ust: t("sin.ust1"), metin: t("sin.1"), ses: PERDE1, efekt: "davul_cenk", efektMs: 500 },
    { id: "yangin", vo: "sin.2", gorsel: G.yangin, oran: DIKEY, odak: 0.5, kamera: { s: [1.18, 1.04], x: [0, 0], y: [-18, 0] }, katman: ["ates", "koz"], metin: t("sin.2"), ses: PERDE1, efekt: "nal", efektMs: 200 },
    { id: "kervan", vo: "sin.3", gorsel: G.yol, oran: W169, odak: 0.52, kamera: { s: [1.14, 1.14], x: [34, -34], y: [0, 0] }, katman: ["toz"], metin: t("sin.3"), ses: PERDE1 },
    { id: "kisgecesi", vo: "sin.4", gorsel: G.kisKoy, oran: 1, odak: 0.5, kamera: { s: [1.28, 1.08], x: [0, 0], y: [-20, 0] }, katman: ["kar"], ton: "rgba(10,18,52,0.5)", gecis: "kara", ust: t("sin.ust4"), metin: t("sin.4"), ses: PERDE2 },
    { id: "ocak", vo: "sin.ocak." + (OCAK[ocak] ? ocak : "koylu"), gorsel: o.g, oran: W169, odak: o.odak, kamera: { s: [1.06, 1.22], x: [0, 0], y: [0, 0] }, katman: o.ates ? ["ates"] : undefined, metin: t("sin.ocak." + (OCAK[ocak] ? ocak : "koylu")), ses: PERDE2 },
    { id: "dogum", vo: cinsiyet === "kadın" ? "sin.5k" : "sin.5e", gorsel: G.dogum, oran: W169, odak: 0.47, kamera: { s: [1.22, 1.08], x: [0, 0], y: [0, 0] }, katman: ["ates"], metin: t(cinsiyet === "kadın" ? "sin.5k" : "sin.5e").replace("%n", ad), ses: PERDE2, efekt: "dogum", efektMs: 400 },
    { id: "yolcu", vo: "sin.6", gorsel: G.yolcu, oran: DIKEY, odak: 0.5, kamera: { s: [1.04, 1.18], x: [0, 6], y: [0, -10] }, katman: ["kar"], ton: "rgba(6,8,26,0.12)", metin: t("sin.6"), ses: PERDE2, efekt: "kapi", efektMs: 250 },
    { id: "muhur", vo: "sin.7", gorsel: G.muhur, oran: DIKEY, odak: 0.5, kamera: { s: [1.04, 1.2], x: [0, 0], y: [0, -34] }, katman: ["ates", "koz"], metin: t("sin.7"), ses: PERDE2, efekt: "ney_nefes", efektMs: 700 },
    { id: "cocukluk", vo: "sin.tab." + tabiat, gorsel: cinsiyet === "kadın" ? G.cocukK : G.cocukE, oran: DIKEY, odak: 0.5, kamera: { s: [1.14, 1.02], x: [0, 0], y: [10, 0] }, katman: ["toz"], gecis: "kara", metin: t("sin.tab." + tabiat), ses: PERDE3 },
    { id: "safak", vo: "sin.9", gorsel: G.nehir, oran: W169, odak: 0.6, kamera: { s: [1.04, 1.18], x: [0, -18], y: [0, 0] }, metin: t("sin.9"), ses: PERDE3 },
    { id: "baslik", gorsel: G.sehir, oran: 1.5, odak: 0.5, kamera: { s: [1.14, 1.02], x: [0, 0], y: [0, 0] }, katman: ["koz"], ton: "rgba(6,4,2,0.58)", gecis: "parla", metin: "", ses: PERDE3, efekt: "saz_vurgu", efektMs: 200, baslik: true },
  ];
}
