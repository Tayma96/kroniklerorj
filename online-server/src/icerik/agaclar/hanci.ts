// Hancı: konaklama (yatak, oda, kervan), etkinlik (şerbet, saz gecesi, düğün), haber (kulak, defter, söylenti).
import { agacKur, arac, aracVerimi, hak, hizmet, is, kalite, omur, sinerji, tarif, tasarruf, verim } from "./tipler.ts";

export default agacKur("hanci", {
  cirak: [
    { a: "yatakAhir", i: "yatak", e: [[hizmet("yatak")], [verim("su", 1)], [kalite("yatak", 10)]] },
    { a: "serbetOcagi", i: "serbet", e: [[tarif("serbet")], [verim("serbet", 1)], [hizmet("ikram")]] },
    { a: "kulakMisafiri", i: "kulak", e: [[hizmet("kulak")], [hizmet("fiyatHaberi")], [kalite("kulak", 20)]] },
  ],
  kalfa: [
    { a: "temizOda", i: "oda", e: [[hizmet("oda")], [kalite("oda", 15)], [sinerji("marangoz", "kundekari", 1, "seckinOda")]] },
    { a: "sazGecesi", i: "saz", e: [[hizmet("sazGecesi")], [kalite("sazGecesi", 20)], [sinerji("ozan", "sazUstaligi", 1, "ortakSahne")]] },
    { a: "haberDefteri", i: "defter", e: [[hak("haberDefteri")], [hak("haberSatisi")], [kalite("haber", 20)]] },
  ],
  kalfa2: [
    { a: "kervanAgirlama", i: "kervan", e: [[hizmet("kervanKonagi")], [hak("kervanKonaklamaSiparisi")]] },
    { a: "dugunYemegi", i: "dugun", e: [[hizmet("dugunEvSahipligi")], [kalite("dugun", 20)]] },
    { a: "soylentiAgi", i: "ag", e: [[hak("soylentiTasima")], [hak("soylentiDurdurma")]] },
  ],
  usta: [
    { a: "hanBerati", i: "anahtar", e: [[hak("hanBerati")], [hak("mudavimRozeti")]] },
    { a: "senlikHakki", i: "kandil", e: [[hak("yerelSenlik")], [hak("katkiDefteri")]] },
    { a: "hanMeclisi", i: "masa", e: [[hak("ortakDertCagrisi")], [hak("dilekce")]] },
  ],
  pir: { a: "kervansarayPiri", i: "kervansaray", e: [[hak("kervansaray"), hak("yolcuHimayesi")]] },
  gizli: { a: "misafirperverlik", i: "kapi", sutun: 0, on: [["temizOda", 3]], gorunur: { sayac: ["is:su", 200] }, e: [[kalite("oda", 30)]] },
});
