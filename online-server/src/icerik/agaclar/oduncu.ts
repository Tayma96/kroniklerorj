// Oduncu/madenci: orman (kereste, sert odun), maden (kömür, cevher; kazmayla/aletle artar), taş. Ağır meslek.
import { agacKur, arac, aracVerimi, hak, hizmet, is, kalite, omur, sinerji, tarif, tasarruf, verim } from "./tipler.ts";

export default agacKur("oduncu", {
  cirak: [
    { a: "baltacilik", i: "balta", e: [[tarif("kereste")], [is("sertOdun")], [verim("odun", 1)]] },
    { a: "madencilik", i: "kazma", e: [[tarif("komur")], [is("cevher")], [arac("cevher", "alet", 1)]] },
    { a: "tasOcagi", i: "tas", e: [[tarif("kesmeTas")], [verim("tas", 1)], [tarif("molozDuvar")]] },
  ],
  kalfa: [
    { a: "topluKesim", i: "testere", e: [[arac("sertOdun", "alet", 1)], [verim("kereste", 1)], [hak("projeKerestesi")]] },
    { a: "kazmaliOcak", i: "ocak", e: [[tarif("bakirOcagi")], [verim("cevher", 1)], [verim("komur", 1)]] },
    { a: "kesmeBlok", i: "blok", e: [[tarif("blok")], [kalite("blok", 20)], [hak("temelTasi")]] },
  ],
  kalfa2: [
    { a: "kirisDirek", i: "kiris", e: [[tarif("kiris")], [sinerji("marangoz", "hanInsasi", 1, "hanKirisi")]] },
    { a: "nadirDamar", i: "gumus", e: [[tarif("damarAra")], [kalite("damarAra", 20)]] },
    { a: "degirmenTasi", i: "degirmen", e: [[tarif("degirmenTasi")], [sinerji("asci", "degirmenUnu", 1, "kasabaDegirmeni")]] },
  ],
  usta: [
    { a: "koruHakki", i: "fidan", e: [[hak("koruDikimi")], [hak("koruBakimi")]] },
    { a: "ocakBerati", i: "fener", e: [[hak("npcMadenci")], [hak("ocakGuvenligi")]] },
    { a: "surTasi", i: "sur", e: [[hak("surOnarimi")], [hak("surKitabesi")]] },
  ],
  pir: { a: "dagPiri", i: "dag", e: [[hak("kasabaOcagi"), hak("ormanNizami")]] },
  gizli: { a: "damarOkuma", i: "damar", sutun: 1, on: [["kazmaliOcak", 3]], gorunur: { sayac: ["is:cevher", 100] }, e: [[verim("cevher", 1)]] },
});
