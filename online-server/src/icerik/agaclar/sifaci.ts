// Şifacı (attar, ebe): hekimlik (merhem, kırık, dikiş; neşter ister), ebelik, otlar (şifalı ot, damıtma, panzehir).
import { agacKur, arac, aracVerimi, hak, hizmet, is, kalite, omur, sinerji, tarif, tasarruf, verim } from "./tipler.ts";

export default agacKur("sifaci", {
  cirak: [
    { a: "sargiMerhem", i: "merhem", e: [[tarif("merhem")], [hizmet("yaraBak")], [kalite("merhem", 15)]] },
    { a: "lohusaBakimi", i: "besik", e: [[hizmet("lohusa")], [kalite("lohusa", 15)], [hak("dogumTalebi")]] },
    { a: "otBilgisi", i: "yaprak", e: [[is("sifaliOt")], [verim("ot", 1)], [tarif("otAyikla")]] },
  ],
  kalfa: [
    { a: "kirikSarma", i: "atel", e: [[hizmet("kirikSar")], [kalite("kirikSar", 20)], [hak("yaraliDurumu")]] },
    { a: "gucDogum", i: "ebe", e: [[hizmet("gucDogum")], [kalite("gucDogum", 20)], [hak("ebeBagi")]] },
    { a: "damitma", i: "imbik", e: [[tarif("boya")], [tarif("sifaSerbeti")], [verim("sifaliOt", 1)]] },
  ],
  kalfa2: [
    { a: "yaraDikisi", i: "nester", e: [[hizmet("yaraDikisi")], [arac("yaraDikisi", "alet", 1)]] },
    { a: "cocukHastaliklari", i: "cocuk", e: [[hak("haneEbeligi")], [kalite("cocukRiski", 20)]] },
    { a: "panzehir", i: "sise", e: [[tarif("panzehir")], [hak("zehirTanima")]] },
  ],
  usta: [
    { a: "darussifa", i: "darussifa", e: [[hak("darussifa")], [hak("salginKatkisi")]] },
    { a: "ebeBasi", i: "el", e: [[hak("ebeIcazeti")], [hak("dogumRiski")]] },
    { a: "attarlik", i: "havan", e: [[hak("attarDukkani")], [hak("baharatSiparisi")]] },
  ],
  pir: { a: "lokmanHekim", i: "lokman", e: [[hak("darussifaBasi"), hak("hekimIcazeti")]] },
  gizli: {
    a: "kadimSifa", i: "risale", sutun: 2, on: [["panzehir", 1]],
    gorunur: { sayac: ["is:sifaliOt", 150], kitap: "lokmanRisalesi" }, e: [[kalite("sifa", 30)]],
  },
});
