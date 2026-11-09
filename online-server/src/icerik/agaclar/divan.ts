// Divan görevlisi: hazine (vergi, bütçe, kıtlık yardımı), nizam (çarşı, ölçü, asayiş), meclis (kâtiplik, dilekçe, kürsü).
import { agacKur, arac, aracVerimi, hak, hizmet, is, kalite, omur, sinerji, tarif, tasarruf, verim } from "./tipler.ts";

export default agacKur("divan", {
  cirak: [
    { a: "vergiSayimi", i: "akce", e: [[hizmet("vergiSayimi")], [kalite("vergiSayimi", 15)], [hak("kayitDisiKalem")]] },
    { a: "carsiDenetimi", i: "olcek", e: [[hizmet("denetim")], [kalite("denetim", 15)], [hak("lekeliSatici")]] },
    { a: "meclisKatipligi", i: "divit", e: [[hizmet("meclisKaydi")], [kalite("meclisKaydi", 15)], [hak("kararDefteri")]] },
  ],
  kalfa: [
    { a: "butceDefteri", i: "defter", e: [[hak("butceOnerisi")], [kalite("butce", 20)], [hak("ulufePayi")]] },
    { a: "olcuTarti", i: "terazi", e: [[hizmet("ayarDamgasi")], [hak("guvenilirTezgah")], [kalite("ayar", 20)]] },
    { a: "dilekceKabulu", i: "dilekce", e: [[hak("dilekceGundemi")], [kalite("dilekce", 20)], [hak("meclisSirasi")]] },
  ],
  kalfa2: [
    { a: "kitlikYardimi", i: "ambar", e: [[hak("zahireAlimi")], [hak("dagitimKarari")]] },
    { a: "asayisBuyrugu", i: "buyruk", e: [[hak("kapiKapama")], [hak("karantina")]] },
    { a: "meclisKursusu", i: "kursu", e: [[hak("kararOnerisi")], [hak("oylama")]] },
  ],
  usta: [
    { a: "hazineEmini", i: "hazine", e: [[hak("hazineEminligi")], [hak("hazineDefteri")]] },
    { a: "subasilik", i: "topuz", e: [[hak("subasiAdayligi")], [hak("asayisAmirligi")]] },
    { a: "makamAdayligi", i: "kavuk", e: [[hak("kasabaMakami")], [hak("bolgeMakami")]] },
  ],
  pir: { a: "vezirYolu", i: "muhur", e: [[hak("divanBaskanligi"), hak("beylikMeclisi")]] },
  gizli: {
    a: "siyasetname", i: "risale", sutun: 2, on: [["meclisKursusu", 1]],
    gorunur: { sayac: ["is:evrak", 150], kitap: "siyasetname" }, e: [[hak("hikmetliKarar")]],
  },
});
