// Ozan/derviş: sahne (türkü, saz; saz aracı ister), gönül (teselli, dertleşme, barış), destan (türkü yakma, kronik).
import { agacKur, arac, aracVerimi, hak, hizmet, is, kalite, omur, sinerji, tarif, tasarruf, verim } from "./tipler.ts";

export default agacKur("ozan", {
  cirak: [
    { a: "turkuMani", i: "tezene", e: [[hizmet("turku")], [kalite("turku", 15)], [hak("sahneSirasi")]] },
    { a: "teselli", i: "gul", e: [[hizmet("teselli")], [kalite("teselli", 20)], [hak("yasliHane")]] },
    { a: "kahramanlikTurkusu", i: "davul", e: [[hizmet("turkuYak")], [kalite("turkuYak", 15)], [hak("namYayma")]] },
  ],
  kalfa: [
    { a: "sazUstaligi", i: "baglama", e: [[arac("sazliSahne", "saz", 3)], [kalite("sahne", 20)], [sinerji("hanci", "sazGecesi", 1, "sazGecesi")]] },
    { a: "dertlesme", i: "fincan", e: [[hizmet("dertlesme")], [kalite("dertlesme", 20)], [hak("kirginTaban")]] },
    { a: "ezberDestan", i: "kitap", e: [[hak("komsuSohret")], [kalite("destan", 20)], [hak("ilkGorus")]] },
  ],
  kalfa2: [
    { a: "atisma", i: "meydan", e: [[hizmet("atisma")], [kalite("atisma", 20)]] },
    { a: "barisIlahisi", i: "guvercin", e: [[hizmet("barisIlahisi")], [sinerji("arabulucu", "araBulma", 1, "barisSansi")]] },
    { a: "namYayanDestan", i: "parsomen", e: [[hak("hanedanDestani")], [hak("ustalarLevhasi")]] },
  ],
  usta: [
    { a: "ozanPostu", i: "post", e: [[hak("ozanbasi")], [hak("ovguTaslama")]] },
    { a: "tekkePostu", i: "tekke", e: [[hak("zaviye")], [hak("seyhAdayligi")]] },
    { a: "kronikKalemi", i: "kalem", e: [[hak("kasabaKronigi")], [hak("kronikNami")]] },
  ],
  pir: { a: "asiklarPiri", i: "lale", e: [[hak("asiklarMeclisi"), hak("ozanIcazeti")]] },
  gizli: { a: "dedeKorkut", i: "kopuz", sutun: 2, on: [["ezberDestan", 3]], gorunur: { sayac: ["is:ezber", 150] }, e: [[kalite("destan", 40)]] },
});
