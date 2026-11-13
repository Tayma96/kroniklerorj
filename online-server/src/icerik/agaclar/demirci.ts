// Demircilik ağacı: spec 2026-11-09 §8 aynen. Aletçilik nal/alet tariflerini açar ve alet ömrünü uzatır; Tarım
// Aletleri Ustalığı aletle hasadı artırır (bilgi kullananındır: Tam Özgürlük, bkz. beceri.ts).
// Faz 6: Metal İşleme 1 çivi tarifini de açar (doğrama, araba, koşum girdisi).
import { agacKur, arac, aracVerimi, hak, hizmet, is, kalite, omur, sinerji, tarif, tasarruf, verim } from "./tipler.ts";

export default agacKur("demirci", {
  cirak: [
    { a: "aletcilik", i: "cekic", e: [[tarif("nal")], [tarif("alet")], [omur("alet", 1)]] },
    { a: "temelDovme", i: "ors", e: [[tarif("bicak")], [tasarruf("dovme", "komur", 25)], [verim("onarim", 1), hizmet("onarimHizmeti")]] },
    { a: "metalIsleme", i: "kulce", e: [[tarif("kulce"), tarif("civi")], [verim("kulce", 1)], [tarif("tunc")]] },
  ],
  kalfa: [
    { a: "tarimAletleri", i: "orak", e: [[tarif("saban")], [tarif("orak")], [aracVerimi("hasat", 20)]] },
    { a: "silahDovme", i: "kilic", on: [["temelDovme", 1], ["aletcilik", 3]], e: [[tarif("mizrak")], [tarif("kilic")], [kalite("silah", 20)]] },
    { a: "zirhYapimi", i: "kalkan", e: [[hizmet("yelekOnarimi")], [tarif("zincir")], [tarif("kalkan")]] },
  ],
  kalfa2: [
    { a: "gelismisAletler", i: "disli", e: [[hak("topluAletSiparisi")], [sinerji("marangoz", "koprucu", 1, "degirmenKopruDemiri")]] },
    { a: "silahUstaligi", i: "suVerme", e: [[tarif("suVerilmisKilic")], [hak("silahSiparisOnceligi")]] },
    { a: "zirhUstaligi", i: "zirh", e: [[tarif("pulZirh")], [kalite("zirhDayanikliligi", 25)]] },
  ],
  usta: [
    { a: "mekanizmaUstaligi", i: "kilit", e: [[tarif("kilitMentese")], [tarif("degirmenMekanizmasi"), tarif("arbalet"), sinerji("marangoz", "arabaYapimi", 1, "arbalet")]] },
    { a: "efsaneviSilahlar", i: "kilicTac", e: [[hak("saheserKilicSiparisi")], [hak("orduSiparisi")]] },
    { a: "ozelZirhlar", i: "migfer", e: [[hizmet("ismarlamaZirh")], [tarif("komutanZirhi")]] },
  ],
  pir: { a: "saheserUstaligi", i: "damga", e: [[hak("ustaDamgasi"), hak("ustalarLevhasi"), hak("kethudaAdayligi")]] },
  gizli: {
    a: "efsaneviCelik", i: "yildizCelik", sutun: 1, on: [["efsaneviSilahlar", 1]],
    gorunur: { sayac: ["tarif:saheserKilic", 10], kitap: "celikRisalesi" }, e: [[kalite("silah", 50)]],
  },
});
