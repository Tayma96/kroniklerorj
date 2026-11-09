// Tüccar/kervancı: pazar (tezgâh, pazarlık, toptan), kervan (yük hayvanı, araba, uzak şehir), yol (fiyat haberi, rota).
import { agacKur, arac, aracVerimi, hak, hizmet, is, kalite, omur, sinerji, tarif, tasarruf, verim } from "./tipler.ts";

export default agacKur("tuccar", {
  cirak: [
    { a: "tezgahKurma", i: "tezgah", e: [[hizmet("tezgah")], [kalite("tezgahKotasi", 10)], [hak("komisyon")]] },
    { a: "yukHayvani", i: "deve", e: [[hizmet("kervan")], [kalite("kervan", 10)], [omur("kosum", 1)]] },
    { a: "fiyatHaberi", i: "pusula", e: [[hizmet("fiyatHaberi")], [kalite("fiyatHaberi", 15)], [hak("haberSatisi")]] },
  ],
  kalfa: [
    { a: "pazarlik", i: "terazi", e: [[hak("fiyatTablosu")], [hak("tuccarKotasi")], [kalite("satis", 5)]] },
    { a: "topluYuk", i: "araba", e: [[hizmet("topluYuk")], [hak("navlun")], [sinerji("marangoz", "arabaYapimi", 1, "kervanArabasi")]] },
    { a: "guvenliYol", i: "harita", e: [[hak("rotaSecimi")], [kalite("yolGuvenligi", 20)], [hak("haydutDokumu")]] },
  ],
  kalfa2: [
    { a: "toptanAlim", i: "sandik", e: [[hak("vadeliAlim")], [sinerji("katip", "vasiyetSozlesme", 2, "ticaretSenedi")]] },
    { a: "uzakSehir", i: "kervan", e: [[hizmet("uzakKervan")], [hak("uzakMallar")]] },
    { a: "uzakMalBilgisi", i: "baharat", e: [[hak("uzakMalSiparisi")], [hak("fiyatDongusu")]] },
  ],
  usta: [
    { a: "pazarKethudaligi", i: "carsi", e: [[hak("pazarGunu")], [hak("hileliTarti")]] },
    { a: "kervanSancagi", i: "sancak", e: [[hak("kafile")], [hak("riskPaylasimi")]] },
    { a: "yolBerati", i: "yolTasi", e: [[hak("yolEmini")], [hak("yolAkcesi")]] },
  ],
  pir: { a: "tuccarlarPiri", i: "altin", e: [[hak("loncaBasi"), hak("bezistan")]] },
  gizli: { a: "ipekYolu", i: "ipek", sutun: 1, on: [["uzakSehir", 1]], gorunur: { sayac: ["sat:akce", 1000] }, e: [[hak("ipekYoluSeferi")]] },
});
