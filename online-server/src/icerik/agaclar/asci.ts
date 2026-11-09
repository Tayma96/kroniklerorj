// Aşçı/fırıncı: fırın (ekmek, un, fırın), mutfak (çorba, kazan, ziyafet), saklama (kuru et, pastırma, erzak).
// Kazan ve bıçak (alet) mutfağı artırır (§7). Çiftçilikle sinerji: özel yemekler (§6).
import { agacKur, arac, aracVerimi, hak, hizmet, is, kalite, omur, sinerji, tarif, tasarruf, verim } from "./tipler.ts";

export default agacKur("asci", {
  cirak: [
    { a: "ekmekcilik", i: "ekmek", e: [[tarif("ekmek")], [verim("ekmek", 1)], [kalite("sofra", 10)]] },
    { a: "corbaci", i: "kepce", e: [[tarif("corba")], [arac("corba", "alet", 1)], [verim("corba", 1)]] },
    { a: "kurutma", i: "tuz", e: [[tarif("kuruEt")], [tarif("peksimet")], [hak("bozulmaSuresi")]] },
  ],
  kalfa: [
    { a: "degirmenUnu", i: "un", e: [[tarif("un")], [arac("un", "degirmenTasi", 1)], [kalite("un", 15)]] },
    { a: "topluKazan", i: "kazan", e: [[hak("topluCorba")], [arac("corba", "kazan", 2)], [hak("asevi")]] },
    { a: "pastirmaci", i: "pastirma", e: [[tarif("pastirma")], [kalite("pastirma", 20)], [hak("uzakSatis"), sinerji("ciftci", "kesimVePost", 1, "ozelPastirma")]] },
  ],
  kalfa2: [
    { a: "mahalleFirini", i: "firin", e: [[hak("topluEkmek")], [hak("garnizonEkmegi")]] },
    { a: "senlikZiyafeti", i: "sofra", e: [[hizmet("ziyafet")], [kalite("ziyafet", 25), sinerji("ciftci", "nadas", 1, "baklaYemegi")]] },
    { a: "kitlikErzaki", i: "sandik", e: [[tarif("erzakSandigi")], [hak("kitlikBagisi")]] },
  ],
  usta: [
    { a: "firinBerati", i: "kurek", e: [[hak("ekmekNarhi")], [hak("kitlikSiparisi")]] },
    { a: "ashane", i: "tencere", e: [[hak("ashane")], [hak("yoksulCorbasi")]] },
    { a: "kilerEmini", i: "kiler", e: [[hak("kurumKileri")], [hak("bozulmazKiler")]] },
  ],
  pir: { a: "sofraPiri", i: "nimet", e: [[hak("imaretAsi"), hak("loncaSofrasi")]] },
  gizli: { a: "sarayMutfagi", i: "baharat", sutun: 1, on: [["senlikZiyafeti", 1]], gorunur: { sayac: ["is:mutfak", 150] }, e: [[kalite("ziyafet", 40)]] },
});
