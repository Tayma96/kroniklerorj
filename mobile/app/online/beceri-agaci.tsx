// Beceri ağacı v2 (14 meslek): /online/beceri-agaci?meslek=<id>. Veri GET /v1/beceri; oturum yoksa sahte istemci.
import { OnlineYakinda } from "../../lib/online-yakinda";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { OnlineKapisi } from "../../lib/online/durum";
import { BeceriAgaciEkrani } from "../../lib/online/beceri-agaci/agac-ekrani";

export default function OnlineBeceriAgaci() {
  return onlineEkranAcik() ? <OnlineKapisi><BeceriAgaciEkrani /></OnlineKapisi> : <OnlineYakinda />;
}
