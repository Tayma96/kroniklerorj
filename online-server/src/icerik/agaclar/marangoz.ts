// Marangoz/yapı ustası: yapı (doğrama, ev, han), araç (kağnı, araba, köprü), tezyin (oyma, saz, kündekâri).
// Keser ve testere (alet) işini hızlandırır (§7).
import { agacKur, arac, aracVerimi, hak, hizmet, is, kalite, omur, sinerji, tarif, tasarruf, verim } from "./tipler.ts";

export default agacKur("marangoz", {
  cirak: [
    { a: "dogramacilik", i: "rende", e: [[tarif("dograma")], [arac("dograma", "alet", 1)], [hizmet("yapiOnarimi")]] },
    { a: "tekerlek", i: "tekerlek", e: [[tarif("kagni")], [kalite("kagni", 15)], [omur("kagni", 2)]] },
    { a: "oymacilik", i: "keski", e: [[tarif("oyma")], [tarif("saz")], [kalite("oyma", 20)]] },
  ],
  kalfa: [
    { a: "evYapimi", i: "ev", e: [[hak("evProjesi")], [kalite("ev", 15)], [hak("projeKatkisi")]] },
    { a: "arabaYapimi", i: "araba", e: [[tarif("araba")], [kalite("araba", 15)], [omur("araba", 2)]] },
    { a: "kundekari", i: "kapi", e: [[tarif("kundekari")], [kalite("kundekari", 20)], [sinerji("hanci", "temizOda", 1, "seckinOda")]] },
  ],
  kalfa2: [
    { a: "hanInsasi", i: "han", e: [[hak("hanProjesi")], [hak("hamamProjesi")]] },
    { a: "koprucu", i: "kopru", e: [[hak("ahsapKopru")], [sinerji("demirci", "gelismisAletler", 2, "kopruDemiri")]] },
    { a: "minberOymasi", i: "minber", e: [[hak("vakifSiparisi")], [hak("ustalarLevhasi")]] },
  ],
  usta: [
    { a: "yapiEmini", i: "gonye", e: [[hak("projeSirasi")], [hak("bakimDefteri")]] },
    { a: "koprubasi", i: "gecit", e: [[hak("gecisAkcesi")], [hak("kopruBakimi")]] },
    { a: "nakkasBasi", i: "firca", e: [[hak("armaCizme")], [hak("senlikSuslemesi")]] },
  ],
  pir: { a: "mimarBasi", i: "pergel", e: [[hak("kitabeImzasi"), hak("kasabaPlani")]] },
  gizli: { a: "civisizGecme", i: "gecme", sutun: 2, on: [["kundekari", 3]], gorunur: { sayac: ["is:tezgah", 150] }, e: [[kalite("kundekari", 40)]] },
});
