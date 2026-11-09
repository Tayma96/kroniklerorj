// Asker: nöbet (sur, devriye, kapı), sefer (talim, saf, muhafızlık), keşif (iz, gözcü, düşman hattı). Ağır meslek.
// Kılıç, mızrak, kalkan ve zırh (demirci) nöbet, kervan koruma ve savunma gücünü artırır (§7).
import { agacKur, arac, aracVerimi, hak, hizmet, is, kalite, omur, sinerji, tarif, tasarruf, verim } from "./tipler.ts";

export default agacKur("asker", {
  cirak: [
    { a: "surNobeti", i: "mizrak", e: [[hizmet("nobet")], [arac("nobet", "mizrak", 1)], [kalite("asayis", 10)]] },
    { a: "mizrakTalimi", i: "talim", e: [[hizmet("talim")], [kalite("talim", 15)], [hak("gencTalimi")]] },
    { a: "izSurme", i: "iz", e: [[hizmet("izSur")], [arac("av", "mizrak", 1)], [kalite("izSur", 15)]] },
  ],
  kalfa: [
    { a: "geceDevriyesi", i: "fener", e: [[hak("devriye")], [kalite("hirsizlikTespiti", 20)], [arac("devriye", "kilic", 1)]] },
    { a: "safDuzeni", i: "kalkan", e: [[hak("safDuzeni")], [arac("saf", "kalkan", 1)], [kalite("savunma", 20)]] },
    { a: "gozculuk", i: "kule", e: [[hak("tehditHaberi")], [kalite("gozculuk", 20)], [hak("hazirlikPenceresi")]] },
  ],
  kalfa2: [
    { a: "kapiMuhafizligi", i: "kapi", e: [[hak("kapiDefteri")], [hak("casusTespiti")]] },
    { a: "kervanMuhafizligi", i: "kilic", e: [[hizmet("muhafizlik")], [arac("muhafizlik", "zincir", 1)]] },
    { a: "dusmanHatti", i: "harita", e: [[hak("dusmanGucu")], [hak("kesifRaporu")]] },
  ],
  usta: [
    { a: "garnizonAgaligi", i: "kale", e: [[hak("nobetKoltuklari")], [hak("garnizonTalimi")]] },
    { a: "sancakHakki", i: "sancak", e: [[hak("haydutOnderligi")], [hak("birlikKomutanligi")]] },
    { a: "onculukHakki", i: "at", e: [[hak("yolDevriyesi")], [hak("akinOnculugu")]] },
  ],
  pir: { a: "alpPiri", i: "yay", e: [[hak("alpYemini"), hak("serdarAdayligi")]] },
  gizli: { a: "gaziYemini", i: "nisan", sutun: 1, on: [["safDuzeni", 3]], gorunur: { sayac: ["is:karakol", 150] }, e: [[kalite("savunma", 40)]] },
});
