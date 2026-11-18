// Kanca partisi 2: oduncunun koru hakkı (`koruDikimi`, `koruBakimi`; MESLEK_AGACLARI `oduncu.orman.3`). Koru dikimi
// kasabadaki herkesin "odun kes" azalan getiri sayacını sıfırlar (kesim herkese yeniden açılır). Kasaba başına altı ayda
// bir; bedeli takat + odun. `koruBakimi` olan dikimci koru payı olarak sert odun alır. Akçe yok. Saf fonksiyon.

import { basarili, hata, type Sonuc } from "../tipler.ts";
import { hakAcik } from "./beceri-etki.ts";
import { olduMu } from "./hanedan.ts";
import { esyaKilidi } from "./kalite.ts";
import { takatHarca } from "./karakter.ts";
import { envanterEkle } from "./npc-taban.ts";
import { toplulukAl } from "./topluluk-kayit.ts";
import type { Karakter, Kasaba } from "./tipler.ts";

/** [PARAMETRE] Kasaba başına dikim aralığı (ay), bedel (takat, odun), sıfırlanan iş, koru payı (sert odun). */
export const KORU_ARALIK_AY = 6;
export const KORU_TAKAT = 2;
export const KORU_ODUN = 2;
export const KORU_IS = "odun";
export const KORU_PAYI = 1;

export const KORU_KURALLARI = { aralikAy: KORU_ARALIK_AY, takat: KORU_TAKAT, odun: KORU_ODUN, is: KORU_IS, pay: { sertOdun: KORU_PAYI } } as const;

/** Son dikim ve bir sonraki açılış ayı (görünüm). */
export function koruGorunumu(k: Pick<Kasaba, "tl">) {
  const son = k.tl?.ko ?? null;
  return { sonDikim: son, sonraki: son === null ? null : son + KORU_ARALIK_AY, kurallar: KORU_KURALLARI };
}

/** POST /v1/koru {istekNo}: koru dikimi. Bütün sakinler yüklü olmalıdır (çağıran yükler). */
export function koruDik(k: Kasaba, kar: Karakter, ay: number): Sonuc<{ yanit: Record<string, unknown>; digerleri: string[] }> {
  if (!hakAcik(kar, "koruDikimi")) return hata("dugum_kapali");
  const tl = toplulukAl(k);
  if (tl.ko !== undefined && ay - tl.ko < KORU_ARALIK_AY) return hata("aralik_dolu");
  if ((kar.ev?.odun ?? 0) < KORU_ODUN) return hata("mal_yok");
  const kilit = esyaKilidi(kar, { odun: KORU_ODUN });
  if (kilit) return hata(kilit);
  if (!takatHarca(kar, ay, KORU_TAKAT)) return hata("takat_yok");
  envanterEkle(kar, "odun", -KORU_ODUN);
  tl.ko = ay;
  const digerleri: string[] = [];
  let yenilenen = 0;
  for (const c of k.kar.values()) {
    if (olduMu(c) || !c.tz?.[KORU_IS]?.length) continue;
    delete c.tz[KORU_IS];
    yenilenen++;
    if (c.o !== kar.o) digerleri.push(c.o);
  }
  const pay = hakAcik(kar, "koruBakimi") ? KORU_PAYI : 0;
  if (pay) envanterEkle(kar, "sertOdun", pay);
  return basarili({
    yanit: { koru: { ...koruGorunumu(k), yenilenen, ...(pay ? { pay: { sertOdun: pay } } : {}) } },
    digerleri,
  });
}
