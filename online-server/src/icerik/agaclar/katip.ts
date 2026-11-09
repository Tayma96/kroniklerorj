// Kâtip/ulak: belge (mürekkep, senet, hat, vasiyet), ulak (mektup, hızlı ulak, menzil), defter (hesap, tercüme, tahrir).
// Tüccarlıkla sinerji: ticaret sözleşmesi ve senet (§6).
import { agacKur, arac, aracVerimi, hak, hizmet, is, kalite, omur, sinerji, tarif, tasarruf, verim } from "./tipler.ts";

export default agacKur("katip", {
  cirak: [
    { a: "dilekceSenet", i: "murekkep", e: [[tarif("murekkep")], [tarif("senet")], [kalite("senet", 15)]] },
    { a: "koyMektubu", i: "zarf", e: [[hizmet("mektup")], [kalite("mektup", 15)], [hak("ulakSiparisi")]] },
    { a: "hesapDefteri", i: "defter", e: [[hizmet("defter")], [kalite("defter", 15)], [hak("ortaklikDefteri")]] },
  ],
  kalfa: [
    { a: "guzelYazi", i: "hat", e: [[tarif("hatliBelge")], [kalite("hatliBelge", 20)], [hak("kitabeYazisi")]] },
    { a: "hizliUlak", i: "at", e: [[hizmet("hizliUlak")], [sinerji("dokumaci", "kosele", 2, "ulakCizmesi")], [kalite("ulak", 20)]] },
    { a: "tercume", i: "dil", e: [[hizmet("tercume")], [kalite("tercume", 20)], [sinerji("tuccar", "uzakSehir", 1, "uzakAnlasma")]] },
  ],
  kalfa2: [
    { a: "vasiyetSozlesme", i: "vasiyet", e: [[tarif("vasiyet")], [tarif("sozlesme"), sinerji("tuccar", "toptanAlim", 1, "ticaretSozlesmesi")]] },
    { a: "muhurluMektup", i: "muhur", e: [[hizmet("muhurluMektup")], [hak("kurumYazismasi")]] },
    { a: "tahrirDefteri", i: "sayim", e: [[hak("tahrir")], [hak("kayitDisiSifir")]] },
  ],
  usta: [
    { a: "sicilHakki", i: "tasdik", e: [[hak("kasabaSicili")], [hak("sahteBelge")]] },
    { a: "menzilhane", i: "menzil", e: [[hak("menzilhane")], [hak("resmiYazisma")]] },
    { a: "defterdarlik", i: "kese", e: [[hak("hazineDefteri")], [hak("defterdarAdayligi")]] },
  ],
  pir: { a: "nisanci", i: "tugra", e: [[hak("tugraCekme"), hak("divanKalemi")]] },
  gizli: { a: "sifreYazi", i: "sifre", sutun: 1, on: [["muhurluMektup", 1]], gorunur: { sayac: ["is:kalem", 150] }, e: [[hizmet("sifreliMektup")]] },
});
