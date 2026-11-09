// Dokumacı/debbağ: kumaş (bez, giysi, halı), deri (tabak, koşum, astar), çadır (keçe, çadır, sancak).
// Makas ve iğne (alet) dokumayı artırır (§7).
import { agacKur, arac, aracVerimi, hak, hizmet, is, kalite, omur, sinerji, tarif, tasarruf, verim } from "./tipler.ts";

export default agacKur("dokumaci", {
  cirak: [
    { a: "iplikEgirme", i: "kirmen", e: [[tarif("bez")], [arac("bez", "alet", 1)], [kalite("bez", 10)]] },
    { a: "tabaklama", i: "deri", e: [[tarif("tabak")], [kalite("deri", 10)], [hizmet("postTabaklama")]] },
    { a: "keceVurma", i: "kece", e: [[tarif("kece")], [verim("kece", 1)], [kalite("kece", 10)]] },
  ],
  kalfa: [
    { a: "sikDokuma", i: "dokumaTezgahi", e: [[tarif("kumas")], [tarif("giysi")], [kalite("giysi", 20)]] },
    { a: "kosele", i: "kosum", e: [[tarif("kosum")], [tarif("cizme")], [omur("cizme", 2)]] },
    { a: "kislikCadir", i: "cadir", e: [[tarif("cadir")], [omur("cadir", 1)], [hak("kervanKonagiCadiri")]] },
  ],
  kalfa2: [
    { a: "kilimHali", i: "hali", e: [[tarif("hali")], [kalite("hali", 25)]] },
    { a: "zirhAstari", i: "astar", e: [[tarif("astar")], [sinerji("demirci", "zirhUstaligi", 1, "pulZirhAstari")]] },
    { a: "sancakIsleme", i: "sancak", e: [[tarif("sancak")], [kalite("sancak", 25)]] },
  ],
  usta: [
    { a: "tezgahHakki", i: "mekik", e: [[hak("evTezgahlari")], [hak("dulHaneGecimi")]] },
    { a: "debbagAhisi", i: "ahi", e: [[hak("debbaghane")], [hak("tabaklamaIlani")]] },
    { a: "ordugah", i: "ordugah", e: [[hak("ordugahHakki")], [hak("kervanKonaklama")]] },
  ],
  pir: { a: "ahiEvranYolu", i: "kusak", e: [[hak("loncaKethudaligi"), hak("ahiKusagi")]] },
  gizli: { a: "ipekDokuma", i: "ipek", sutun: 0, on: [["kilimHali", 1]], gorunur: { sayac: ["is:tarak", 150] }, e: [[tarif("ipekKumas")]] },
});
