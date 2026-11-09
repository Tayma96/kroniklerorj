// Beceri ağacı v2 örneği (yalnız Demircilik, sahte veri): docs/superpowers/specs/2026-11-09-beceri-agaci-v2-design.md.
import { OnlineYakinda } from "../../lib/online-yakinda";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { BeceriAgaciEkrani } from "../../lib/online/beceri-agaci/agac-ekrani";

export default function OnlineBeceriAgaci() {
  return onlineEkranAcik() ? <BeceriAgaciEkrani /> : <OnlineYakinda />;
}
