// Çiftçilik: ekin (hasat), sürü (kırkım, ince yün), ambar (zahire, kıtlık). Hasat sabanla/orakla (alet) artar.
import { agacKur, arac, aracVerimi, hak, hizmet, is, kalite, omur, sinerji, tarif, tasarruf, verim } from "./tipler.ts";

export default agacKur("ciftci", {
  cirak: [
    { a: "ekinBilgisi", i: "basak", e: [[tarif("hasat")], [verim("hasat", 1)], [tarif("secmeBugday")]] },
    { a: "hayvancilik", i: "koyun", e: [[tarif("kirkim")], [is("inceYun")], [verim("kirkim", 1)]] },
    { a: "ambarcilik", i: "cuval", e: [[tarif("zahire")], [hak("tahilSaklama")], [verim("yun", 1)]] },
  ],
  kalfa: [
    { a: "sabanSurumu", i: "saban", e: [[tarif("sabanSurumu")], [aracVerimi("hasat", 20)], [verim("hasat", 1)]] },
    { a: "kesimVePost", i: "post", e: [[tarif("kesim")], [verim("inceYun", 1)], [tarif("peynir")]] },
    { a: "topluHarman", i: "harman", e: [[hak("topluHasat")], [hak("garnizonZahiresi")], [sinerji("marangoz", "tekerlek", 1, "kagniHarmani")]] },
  ],
  kalfa2: [
    { a: "nadas", i: "nadas", e: [[tarif("baklagil")], [hak("kuraklikDirenci")]] },
    { a: "yaylaGocu", i: "yayla", e: [[tarif("yaylaGocu")], [sinerji("dokumaci", "kislikCadir", 1, "yaylaCadiri")]] },
    { a: "kitlikAmbari", i: "ambar", e: [[hak("kitlikAmbari")], [hak("kitlikSatisi")]] },
  ],
  usta: [
    { a: "imece", i: "imece", e: [[hak("imeceCagrisi")], [hak("imeceKatkisi")]] },
    { a: "meraHakki", i: "mera", e: [[hak("meraHakki")], [hak("meraKarari")]] },
    { a: "ambarEmini", i: "kile", e: [[hak("erzakDefteri")], [hak("dagitimSirasi")]] },
  ],
  pir: { a: "bereketPiri", i: "bereket", e: [[hak("bereketPiri"), hak("kitlikOnderligi")]] },
  gizli: { a: "kadimTohum", i: "tohum", sutun: 0, on: [["sabanSurumu", 3]], gorunur: { sayac: ["tarif:hasat", 300] }, e: [[verim("hasat", 2)]] },
});
