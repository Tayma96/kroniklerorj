// Çevrimiçi açılış sinematiği: tek oyunculu "Küllerin Mirası"nın dünya perdesi (herkese aynı) + 12 yaşında
// yerleşime varış. Oynatıcı lib/sinematik/oynatici.tsx'tir (motor ya da kayıt çekmez); burada yalnız çekim verisi.
import type { Cekim } from "../sinematik/cekimler";
import { applyParams } from "../i18n";
import type { Lang } from "../locale-data";
import type { Cinsiyet } from "./protokol";

const G = {
  kosedag: require("../../assets/sinematik/kosedag.jpg"),
  yangin: require("../../assets/sinematik/yangin.jpg"),
  yol: require("../../assets/arka/gurbet_yol.jpg"),
  cocukE: require("../../assets/sinematik/cocukluk_e.jpg"),
  cocukK: require("../../assets/sinematik/cocukluk_k.jpg"),
  nehir: require("../../assets/arka/nehir.jpg"),
  sehir: require("../../assets/tasarim/v4/town-yaz.jpg"),
};
const DUNYA = { music: "gerilim", ambiance: "bozkir" } as const;
const VARIS = { music: "ana_tema", ambiance: "yaz_cayir" } as const;
const W169 = 16 / 9;
const DIKEY = 9 / 16;

export function varisCekimleri(cinsiyet: Cinsiyet, yerlesim: string, t: (k: string) => string, lang: Lang): Cekim[] {
  return [
    { id: "kosedag", vo: "sin.1", gorsel: G.kosedag, oran: DIKEY, odak: 0.5, kamera: { s: [1.03, 1.16], x: [0, 0], y: [0, -14] }, katman: ["sis"], ton: "rgba(20,14,10,0.16)", gecis: "kara", ust: t("sin.ust1"), metin: t("sin.1"), ses: DUNYA, efekt: "davul_cenk", efektMs: 500 },
    { id: "yangin", vo: "sin.2", gorsel: G.yangin, oran: DIKEY, odak: 0.5, kamera: { s: [1.18, 1.04], x: [0, 0], y: [-18, 0] }, katman: ["ates", "koz"], metin: t("sin.2"), ses: DUNYA, efekt: "nal", efektMs: 200 },
    { id: "kervan", vo: "sin.3", gorsel: G.yol, oran: W169, odak: 0.52, kamera: { s: [1.14, 1.14], x: [34, -34], y: [0, 0] }, katman: ["toz"], metin: t("sin.3"), ses: DUNYA },
    { id: "varis", gorsel: cinsiyet === "kadın" ? G.cocukK : G.cocukE, oran: DIKEY, odak: 0.5, kamera: { s: [1.14, 1.02], x: [0, 0], y: [10, 0] }, katman: ["toz"], gecis: "kara", ust: yerlesim, metin: applyParams(t("onl.sin.varis"), [yerlesim], lang), ses: VARIS },
    { id: "safak", vo: "sin.9", gorsel: G.nehir, oran: W169, odak: 0.6, kamera: { s: [1.04, 1.18], x: [0, -18], y: [0, 0] }, metin: t("sin.9"), ses: VARIS },
    { id: "baslik", gorsel: G.sehir, oran: 1.5, odak: 0.5, kamera: { s: [1.14, 1.02], x: [0, 0], y: [0, 0] }, katman: ["koz"], ton: "rgba(6,4,2,0.58)", gecis: "parla", metin: "", ses: VARIS, efekt: "saz_vurgu", efektMs: 200, baslik: true },
  ];
}
