// Arabulucu: uzlaştırma (ara bulma, barış sofrası, kan davası), elçilik (komşu, hediyeli, beylik), hüküm (şahit, hakem, töre).
import { agacKur, arac, aracVerimi, hak, hizmet, is, kalite, omur, sinerji, tarif, tasarruf, verim } from "./tipler.ts";

export default agacKur("arabulucu", {
  cirak: [
    { a: "araBulma", i: "elSikisma", e: [[hizmet("araBul")], [kalite("araBul", 10)], [hak("tanikSozu")]] },
    { a: "komsuElcilik", i: "zeytinDali", e: [[hizmet("komsuElcilik")], [kalite("elcilik", 10)], [hak("kervanYolu")]] },
    { a: "sahitDinleme", i: "kulak", e: [[hizmet("sahitDinle")], [kalite("sahitDinle", 15)], [hak("bilinenGercek")]] },
  ],
  kalfa: [
    { a: "barisSofrasi", i: "sofra", e: [[hizmet("barisSofrasi")], [kalite("barisSofrasi", 20)], [sinerji("asci", "corbaci", 1, "barisCorbasi")]] },
    { a: "hediyeliElcilik", i: "hediye", e: [[hizmet("hediyeliElcilik")], [hak("yolAkcesiMuafiyeti")], [kalite("elcilik", 20)]] },
    { a: "hakemKarari", i: "terazi", e: [[hizmet("hakemlik")], [kalite("hakemlik", 20)], [hak("senetliIhtilaf")]] },
  ],
  kalfa2: [
    { a: "kanDavasi", i: "yemin", e: [[hizmet("diyetPazarligi")], [hak("barisYemini")]] },
    { a: "beylikElciligi", i: "ferman", e: [[hizmet("beylikElciligi")], [hak("haracSecenegi")]] },
    { a: "toreBilgisi", i: "kitap", e: [[hak("toreOnerisi")], [hak("diyetToresi")]] },
  ],
  usta: [
    { a: "ihtiyarHeyeti", i: "heyet", e: [[hak("husumetListesi")], [hak("heyetUzlasmasi")]] },
    { a: "elciBerati", i: "bayrak", e: [[hak("elcilikAdayligi")], [hak("resmiElcilik")]] },
    { a: "kadilikYolu", i: "kavuk", e: [[hak("naiplik")], [hak("kadilikAdayligi")]] },
  ],
  pir: { a: "adaletPiri", i: "adalet", e: [[hak("bolgeHakemi"), hak("barisKitabesi")]] },
  gizli: { a: "gonulKoprusu", i: "kalp", sutun: 0, on: [["kanDavasi", 1]], gorunur: { sayac: ["is:sahitlik", 150] }, e: [[kalite("uzlasma", 30)]] },
});
