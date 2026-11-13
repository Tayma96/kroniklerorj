// Ekonomi ay dönümü (Faz 6): süresi dolan pazar ilanları ve ısmarlamalar kapanır, emanet iade edilir (defter
// kalemleri "pazarIade", "ismarlamaIade"). Motor `yetistir` içinde her ay bir kez çağırır.

import { ismarlamaDonumu } from "./ismarlama.ts";
import { ekonomiAl, ilanDonumu } from "./pazar-tahta.ts";
import { hizmetStokDonumu } from "./hizmet-pazari.ts";
import { hizmetGorevDonumu } from "./hizmet-gorev.ts";
import type { Kasaba, OlayTaslagi } from "./tipler.ts";

export function ekonomiDonumu(k: Kasaba, ay: number): OlayTaslagi[] {
  ekonomiAl(k);
  hizmetStokDonumu(k, ay);
  hizmetGorevDonumu(k, ay);
  return [...ilanDonumu(k, ay), ...ismarlamaDonumu(k, ay)];
}
