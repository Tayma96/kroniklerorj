// Çevrimiçi açılış sinematiği: tek oyunculu "Küllerin Mirası"nın dünya perdesi (herkese aynı) + 12 yaşında
// yerleşime varış. Oynatıcı lib/sinematik/oynatici.tsx'tir (motor ya da kayıt çekmez); burada yalnız çekim verisi.
// Dünya perdesi tek oyunculuyla birebir aynıdır: aynı video, aynı dil başına anlatıcı miksi (girisParca) ve aynı
// zaman çizelgesi (assets/ses/giris/zaman.json). Miks bitince varış çekimleri kendi durağan kareleriyle gelir.
import type { Cekim } from "../sinematik/cekimler";
import { GIRIS_MS, GIRIS_VIDEO, girisCekimleri, girisParca } from "../sinematik/giris";
import { applyParams } from "../i18n";
import type { Lang } from "../locale-data";
import type { Cinsiyet } from "./protokol";

export { GIRIS_VIDEO as VARIS_VIDEO };
export const varisParca = (lang: string) => girisParca(lang);

const G = {
  cocukE: require("../../assets/sinematik/cocukluk_e.jpg"),
  cocukK: require("../../assets/sinematik/cocukluk_k.jpg"),
  sehir: require("../../assets/tasarim/v4/town-yaz.jpg"),
};
const VARIS = { music: "ana_tema", ambiance: "yaz_cayir" } as const;
const DIKEY = 9 / 16;

export function varisCekimleri(cinsiyet: Cinsiyet, yerlesim: string, t: (k: string) => string, lang: Lang): Cekim[] {
  // Tek oyunculu çekimler (başlık kartı hariç); son bölüm miksin kuyruğu bitene dek sürer, varış müziği üstüne binmez.
  const dunya = girisCekimleri(lang, t).filter((c) => !c.baslik);
  let gecen = 0;
  for (const c of dunya.slice(0, -1)) gecen += c.sureMs ?? 0;
  const son = dunya[dunya.length - 1];
  if (son) dunya[dunya.length - 1] = { ...son, sureMs: Math.max(son.sureMs ?? 0, GIRIS_MS - gecen) };
  return [
    ...dunya,
    { id: "varis", gorsel: cinsiyet === "kadın" ? G.cocukK : G.cocukE, oran: DIKEY, odak: 0.5, kamera: { s: [1.14, 1.02], x: [0, 0], y: [10, 0] }, katman: ["toz"], gecis: "kara", ust: yerlesim, metin: applyParams(t("onl.sin.varis"), [yerlesim], lang), ses: VARIS, videoDisi: true },
    { id: "baslik", gorsel: G.sehir, oran: 1.5, odak: 0.5, kamera: { s: [1.14, 1.02], x: [0, 0], y: [0, 0] }, katman: ["koz"], ton: "rgba(6,4,2,0.58)", gecis: "parla", metin: "", ses: VARIS, efekt: "saz_vurgu", efektMs: 200, baslik: true, videoDisi: true },
  ];
}
