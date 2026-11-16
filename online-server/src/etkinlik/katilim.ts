// Yerleşim tarafı: oyuncunun etkin etkinlikleri görmesi ve bir kez katılması (POST /v1/etkinlik {id, istekNo}).
// Katılım takat ister; ödül nam (aylık tavan içinde), gönül ve varsa 1–2 adet mal. Etkinlik başına karakter başına bir kez
// (iz: kar.ek). Etkinliğin meslek listesindeki ana meslek nam ve gönülü iki katı alır. Akçe verilmez, akçe istenmez.

import { MALLAR } from "../icerik/mallar.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { halDegistir } from "../yerlesim/hal.ts";
import { olduMu } from "../yerlesim/hanedan.ts";
import { namEkle, takatHarca } from "../yerlesim/karakter.ts";
import { envanterEkle } from "../yerlesim/npc-taban.ts";
import type { Karakter, Kasaba } from "../yerlesim/tipler.ts";
import { ETKINLIKLER, KATILIM_IZ_EN_COK, KATILIM_TAKAT, type EtkinlikOzeti } from "./katalog.ts";

export interface EtkinlikGorunumu extends EtkinlikOzeti {
  ikon: string;
  katildin: boolean;
  /** Katılınca alınacak (meslek çarpanı uygulanmış; aylık nam tavanı ayrıca uygulanır). */
  odul: { nam: string; namN: number; gonul: number; mal: { mal: string; adet: number } | null; meslekCarpani: number };
  takat: number;
  /** Etkinliğin öne çıkardığı meslekler ve sistem etkisi (istemci metni bu bayraklardan kurulur). */
  meslek: readonly string[];
  dert: string | null;
}

const meslekCarpani = (kar: Karakter, meslek: readonly string[]): number => (kar.ms?.a && meslek.includes(kar.ms.a) ? 2 : 1);

export function etkinlikGorunumu(k: Kasaba, kar: Karakter): EtkinlikGorunumu[] {
  return (k.pr?.ETKINLIKLER ?? []).map((e) => {
    const t = ETKINLIKLER[e.tur];
    const c = meslekCarpani(kar, t.katilim.meslek);
    const mal = t.katilim.mal;
    return {
      ...e,
      ikon: t.ikon,
      katildin: kar.ek?.includes(e.id) ?? false,
      odul: { nam: t.katilim.nam, namN: t.katilim.namN * c, gonul: t.katilim.gonul * c, mal: mal ? { mal: mal[0], adet: mal[1] } : null, meslekCarpani: c },
      takat: KATILIM_TAKAT,
      meslek: t.katilim.meslek,
      dert: t.dert ?? null,
    };
  });
}

export function etkinlikKatil(k: Kasaba, kar: Karakter, govde: Record<string, unknown>, ay: number): Sonuc<Record<string, unknown>> {
  const e = (k.pr?.ETKINLIKLER ?? []).find((x) => x.id === govde.id);
  if (!e) return hata("etkinlik_yok");
  if (olduMu(kar)) return hata("olu");
  if (kar.ek?.includes(e.id)) return hata("etkinlik_katildin");
  const t = ETKINLIKLER[e.tur];
  if (t.katilim.mal && !MALLAR[t.katilim.mal[0]]) return hata("etkinlik_gecersiz");
  // --- değişiklikler (bütün denetimlerden sonra; takat yetmezse hiçbir şey değişmez) ---
  if (!takatHarca(kar, ay, KATILIM_TAKAT)) return hata("takat_yok");
  const c = meslekCarpani(kar, t.katilim.meslek);
  const gonul = halDegistir(kar, ay, { gonul: t.katilim.gonul * c }, "hal.neden.etkinlik").gonul ?? 0;
  const nam = namEkle(kar, ay, t.katilim.nam, t.katilim.namN * c);
  let mal: { mal: string; adet: number } | null = null;
  if (t.katilim.mal) {
    envanterEkle(kar, t.katilim.mal[0], t.katilim.mal[1]);
    mal = { mal: t.katilim.mal[0], adet: t.katilim.mal[1] };
  }
  kar.ek = [...(kar.ek ?? []), e.id].slice(-KATILIM_IZ_EN_COK);
  return basarili({ etkinlik: e.id, tur: e.tur, odul: { gonul, nam: { [t.katilim.nam]: nam }, mal, meslekCarpani: c }, etkinlikler: etkinlikGorunumu(k, kar) });
}
