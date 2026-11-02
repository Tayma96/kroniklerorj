// Açılış sinematiği "Küllerin Mirası" — Berkay'ın hikâyesi (docs/ANLATI_GIRIS.md), Kronks anlatıcı, 6 dil.
// Ses: dil başına tek tam miks (anlatı + özgün müzik + efekt), hepsi aynı ortak zaman çizelgesinde (zaman.json).
// Görüntü ve altyazı bu çizelgeye göre akar; görüntü dilden bağımsızdır.
import type { ImageSourcePropType } from "react-native";
import ZAMAN from "../../assets/ses/giris/zaman.json";
import type { Cekim } from "./cekimler";
import type { OrtamPlan } from "../ses-plan";

export const GIRIS_MS: number = ZAMAN.toplamMs;
const DILLER = ["tr", "en", "es", "pt", "ar", "ru"] as const;
// Sinematik kendi müziğini taşır: oyun müziği ve ortamı susar.
const SESSIZ: OrtamPlan = { music: null, ambiance: null };

// Bölüm başına sahne görseli (video gelene dek; sade modda da kullanılır).
const G = {
  kosedag: require("../../assets/sinematik/kosedag.jpg"),
  yangin: require("../../assets/sinematik/yangin.jpg"),
  cile: require("../../assets/hero/cocuk_kis.jpg"),
  kervan: require("../../assets/arka/gurbet_yol.jpg"),
  koz: require("../../assets/sinematik/muhur.jpg"),
  sehir: require("../../assets/tasarim/v4/town-yaz.jpg"),
};
type Sahne = Pick<Cekim, "gorsel" | "oran" | "odak" | "kamera" | "katman" | "ton" | "gecis">;
const DIKEY = 9 / 16, W169 = 16 / 9;
const SAHNE: Sahne[] = [
  { gorsel: G.kosedag, oran: DIKEY, odak: 0.5, kamera: { s: [1.03, 1.18], x: [0, 0], y: [0, -16] }, katman: ["sis"], ton: "rgba(20,14,10,0.16)", gecis: "kara" },
  { gorsel: G.yangin, oran: DIKEY, odak: 0.5, kamera: { s: [1.2, 1.04], x: [0, 0], y: [-18, 0] }, katman: ["ates", "koz"] },
  { gorsel: G.cile, oran: 1, odak: 0.5, kamera: { s: [1.26, 1.08], x: [0, 0], y: [-18, 0] }, katman: ["kar"], ton: "rgba(10,18,52,0.45)" },
  { gorsel: G.kervan, oran: W169, odak: 0.52, kamera: { s: [1.14, 1.14], x: [34, -34], y: [0, 0] }, katman: ["toz"] },
  { gorsel: G.koz, oran: DIKEY, odak: 0.5, kamera: { s: [1.04, 1.22], x: [0, 0], y: [0, -30] }, katman: ["ates", "koz"], ton: "rgba(6,4,2,0.2)" },
];

export const girisParca = (lang: string) => "giris." + ((DILLER as readonly string[]).includes(lang) ? lang : "tr");

// Çekimler: her bölüm bir çekim (ilki girişi, sonuncusu kuyruğa dek), en sonda başlık kartı.
export function girisCekimleri(lang: string, t: (k: string) => string): Cekim[] {
  const dil = (DILLER as readonly string[]).includes(lang) ? lang : "tr";
  const altyazi = (ZAMAN.diller as Record<string, { bolum: number; metin: string }[]>)[dil] ?? ZAMAN.diller.tr;
  const b = ZAMAN.bolumler;
  const cekimler: Cekim[] = b.map((bol, i) => {
    const bas = i === 0 ? 0 : bol.baslangicMs;
    const son = i === b.length - 1 ? bol.bitisMs : b[i + 1].baslangicMs;
    return {
      id: "giris" + (i + 1), ...SAHNE[i], sureMs: son - bas,
      metin: altyazi.find((a) => a.bolum === i + 1)?.metin ?? "",
      gecikmeMs: bol.baslangicMs - bas + 400, // altyazı konuşmayla gelir
      ust: i === 0 ? t("sin.ust1") : undefined,
      ses: SESSIZ,
    };
  });
  cekimler.push({ id: "baslik", gorsel: G.sehir as ImageSourcePropType, oran: 1.5, odak: 0.5, kamera: { s: [1.14, 1.02], x: [0, 0], y: [0, 0] }, katman: ["koz"], ton: "rgba(6,4,2,0.58)", gecis: "parla", metin: "", ses: SESSIZ, baslik: true });
  return cekimler;
}
