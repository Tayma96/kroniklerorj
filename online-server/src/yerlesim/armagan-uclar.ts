// Debdebe armağanının oyun tarafı (ana tasarım §6.1–6.2): HesapDO stoktan bir armağan harcayınca alanın teveccühü
// tutarıyla yazılır (`teveccuhEkle(alan, veren, "debdebe", ay, tutar)`; Debdebe armağanı her kaynaktan tam sayılır).
// İadede aynı tutar geri alınır. Akçe hareketi yoktur (alana ya da hancıya para payı yok). Bu modül Debdebe
// (`cosmetic`) verisini okumaz: tutar ve ürün kimliği HesapDO'dan değer olarak gelir. istekNo ile tekrar güvenlidir.

import { basarili, hata, type Sonuc } from "../tipler.ts";
import { engelliMi } from "./engel.ts";
import { olduMu } from "./hanedan.ts";
import type { YerlesimMotoru } from "./motor.ts";
import { teveccuhCikar, teveccuhEkle, teveccuhKademesi } from "./teveccuh.ts";

/** [PARAMETRE] Tek armağanın en çok teveccüh tutarı (HesapDO kataloğunun üstünde güvenlik sınırı). */
export const ARMAGAN_TEVECCUH_EN_COK = 1000;

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function tutarCoz(ham: unknown): number | undefined {
  return typeof ham === "number" && Number.isInteger(ham) && ham > 0 && ham <= ARMAGAN_TEVECCUH_EN_COK ? ham : undefined;
}

/** `hesapId` veren; `govde.hedef` alanın hesap kimliği ya da yerel oyuncu kimliği (aynı yerleşimin sakini). */
export async function armaganTeveccuh(motor: YerlesimMotoru, hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  const tutar = tutarCoz(govde.tutar);
  if (tutar === undefined || typeof govde.urun !== "string") return hata("gecersiz_istek");
  const hs = typeof govde.hedef === "string" ? motor.kasaba.sakin.find((x) => x.h === govde.hedef || x.o === govde.hedef) : undefined;
  if (!hs) return hata("kisi_yok");
  const urun = govde.urun.slice(0, 40);
  return motor.ekonomiYaz(hesapId, govde, "diger", [hs.o], (kar, ay, ek) => {
    const alan = motor.kasaba.kar.get(hs.o);
    if (!alan || olduMu(alan)) return hata("kisi_yok");
    if (alan.o === kar.o) return hata("kendi_hedef");
    if (engelliMi(motor.kasaba.tp, kar.o, alan.o)) return hata("engelli");
    const teveccuh = teveccuhEkle(alan, kar, "debdebe", ay, tutar);
    hs.tv = teveccuhKademesi(alan, ay) || undefined;
    ek.digerleri.push(alan.o);
    ek.olaylar.push({ t: "debdebe", w: kar.o, h: alan.o, g: alan.o, n: 3, k: "olay.debdebe.armagan", p: { urun, kim: kar.o } });
    return basarili({ alanHesap: hs.h, alan: alan.o, teveccuh });
  });
}

/** İade: `hesapId` alan; teveccüh tutarı geri alınır. */
export async function armaganGeri(motor: YerlesimMotoru, hesapId: string, govde: unknown): Promise<Sonuc<unknown>> {
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  const tutar = tutarCoz(govde.tutar);
  if (tutar === undefined) return hata("gecersiz_istek");
  return motor.ekonomiYaz(hesapId, govde, "diger", [], (kar, ay) => {
    const dusulen = teveccuhCikar(kar, ay, tutar);
    const s = motor.kasaba.sakin.find((x) => x.o === kar.o);
    if (s) s.tv = teveccuhKademesi(kar, ay) || undefined;
    return basarili({ dusulen });
  });
}
