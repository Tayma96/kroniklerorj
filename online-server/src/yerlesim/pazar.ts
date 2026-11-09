// NPC'ye satış (dikey dilim E2): oyuncu ürettiğini kasabaya (NPC alıcılara) satar. Akçe NPC'den gelir — tanımlı
// kaynaktır ve oyuncu başına mal başına aylık kotayla sınırlıdır (farm yok). Birim fiyat `satisDegeri`dir
// (taban + kıtlık primi), döküm olarak döner. Su satılmaz. Hata olursa hiçbir şey değişmez.

import { MALLAR, malBul, type MalId } from "../icerik/mallar.ts";
import type { MeslekId } from "../icerik/meslekler.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { envanterEkle, satisDegeri } from "./npc-taban.ts";
import type { Dokum, Karakter } from "./tipler.ts";

/** [PARAMETRE] Oyuncu başına mal başına aylık NPC alım kotası. */
export const NPC_SATIS_KOTASI = 6;

export type SatisSonucu = {
  mal: MalId;
  adet: number;
  birim: Dokum;
  tutar: number;
  kota: { satilan: number; tavan: number; kalan: number };
};

/** Bu ay bu maldan satılan adet. */
export function satilan(k: Karakter, mal: MalId, ay: number): number {
  return k.ns && k.ns[0] === ay ? (k.ns[1][mal] ?? 0) : 0;
}

export function npcyeSat(
  k: Karakter,
  malHam: unknown,
  adetHam: unknown,
  oyuncuSayisi: (m: MeslekId) => number,
  ay: number,
): Sonuc<SatisSonucu> {
  const mal = malBul(malHam);
  if (!mal || MALLAR[mal].taban === 0) return hata("mal_gecersiz");
  if (typeof adetHam !== "number" || !Number.isInteger(adetHam) || adetHam < 1) return hata("mal_gecersiz");
  if ((k.ev?.[mal] ?? 0) < adetHam) return hata("mal_yok");
  const once = satilan(k, mal, ay);
  if (once + adetHam > NPC_SATIS_KOTASI) return hata("kota_doldu");
  const birim = satisDegeri(mal, oyuncuSayisi(MALLAR[mal].meslek));
  const tutar = birim.toplam * adetHam;
  if (!k.ns || k.ns[0] !== ay) k.ns = [ay, {}];
  k.ns[1][mal] = once + adetHam;
  envanterEkle(k, mal, -adetHam);
  k.pa += tutar;
  const s = once + adetHam;
  return basarili({ mal, adet: adetHam, birim, tutar, kota: { satilan: s, tavan: NPC_SATIS_KOTASI, kalan: NPC_SATIS_KOTASI - s } });
}
