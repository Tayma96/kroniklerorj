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

// Sinematik video (dil bağımsız, sessiz); ses dil başına ayrı parçadan çalar. Görüntü: assets/sinematik/KAYNAK.md.
export const GIRIS_VIDEO: number = require("../../assets/sinematik/giris.mp4");
// Bölüm başına durağan kare: sade modda ve video açılamazsa (videodaki çekimlerle aynı dünya).
const G = {
  b1: require("../../assets/sinematik/giris_sahneler/bolum1.jpg"),
  b2: require("../../assets/sinematik/giris_sahneler/bolum2.jpg"),
  b3: require("../../assets/sinematik/giris_sahneler/bolum3.jpg"),
  b4: require("../../assets/sinematik/giris_sahneler/bolum4.jpg"),
  b5: require("../../assets/sinematik/giris_sahneler/bolum5.jpg"),
  sehir: require("../../assets/tasarim/v4/town-yaz.jpg"),
};
type Sahne = Pick<Cekim, "gorsel" | "oran" | "odak" | "kamera" | "katman" | "ton" | "gecis" | "altyaziUst">;
const DIKEY = 9 / 16;
const SAHNE: Sahne[] = [
  { gorsel: G.b1, oran: DIKEY, odak: 0.5, kamera: { s: [1.03, 1.16], x: [0, 0], y: [0, -14] }, katman: ["sis"], ton: "rgba(20,14,10,0.16)", gecis: "kara" },
  { gorsel: G.b2, oran: DIKEY, odak: 0.5, kamera: { s: [1.18, 1.04], x: [0, 0], y: [-18, 0] }, katman: ["ates", "koz"] },
  { gorsel: G.b3, oran: DIKEY, odak: 0.5, kamera: { s: [1.04, 1.16], x: [0, 0], y: [0, -12] }, katman: ["kar"], ton: "rgba(6,8,26,0.12)" },
  { gorsel: G.b4, oran: DIKEY, odak: 0.5, kamera: { s: [1.12, 1.02], x: [0, 0], y: [10, 0] }, katman: ["toz"] },
  // Son bölümde mühürlü el ekranın altında: altyazı üste (başlık da orta-üstte belirir).
  { gorsel: G.b5, oran: DIKEY, odak: 0.5, kamera: { s: [1.04, 1.2], x: [0, 0], y: [0, -30] }, katman: ["ates", "koz"], ton: "rgba(6,4,2,0.2)", altyaziUst: true },
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
