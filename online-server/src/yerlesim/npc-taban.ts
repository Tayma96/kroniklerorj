// NPC taban arzı (ana tasarım §5.5, §14.4.3): NPC her zaman satar ama pahalı ve sınırlı. Kıtlık kazanç
// demektir: meslekte oyuncu yoksa o malı satan oyuncu prim alır. NPC'ye ödenen akçe dünyadan çıkar (gider).

import { MALLAR, malBul, type MalId } from "../icerik/mallar.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import type { Dokum, Karakter } from "./tipler.ts";

/** [PARAMETRE] NPC satış çarpanı, oyuncu başına mal başına aylık alım kotası, kıtlık primi oranı. */
export const NPC_CARPAN = 2.5;
export const NPC_AYLIK_KOTA = 3;
export const KITLIK_PRIM = 0.5;

/** Envantere ekler (negatif = çıkarır, sıfırın altına inmez); kalan adedi döndürür. */
export function envanterEkle(k: Karakter, mal: MalId, adet: number): number {
  const ev = (k.ev ??= {});
  const yeni = Math.max(0, (ev[mal] ?? 0) + adet);
  if (yeni === 0) delete ev[mal];
  else ev[mal] = yeni;
  return yeni;
}

/** NPC'den bir birimin fiyatı. */
export function npcFiyat(mal: MalId): Dokum {
  const taban = MALLAR[mal].taban;
  const toplam = Math.ceil(taban * NPC_CARPAN);
  return { toplam, kalemler: [{ k: "taban", d: taban }, { k: "npc_pahali", d: toplam - taban }] };
}

/** Bir birimin satış değeri; o malın mesleğinde oyuncu yoksa kıtlık primi eklenir. */
export function satisDegeri(mal: MalId, oyuncuSayisi: number): Dokum {
  const taban = MALLAR[mal].taban;
  const kalemler = [{ k: "taban", d: taban }];
  if (oyuncuSayisi === 0 && taban > 0) kalemler.push({ k: "kitlik", d: Math.ceil(taban * KITLIK_PRIM) });
  return { toplam: kalemler.reduce((a, x) => a + x.d, 0), kalemler };
}

export function npcdenAl(
  k: Karakter,
  malHam: unknown,
  adetHam: unknown,
  ay: number,
): Sonuc<{ fiyat: Dokum; adet: number; para: number }> {
  const mal = malBul(malHam);
  if (!mal || MALLAR[mal].taban === 0) return hata("mal_gecersiz");
  if (typeof adetHam !== "number" || !Number.isInteger(adetHam) || adetHam < 1) return hata("mal_gecersiz");
  if (!k.tb || k.tb[0] !== ay) k.tb = [ay, {}];
  const alinan = k.tb[1][mal] ?? 0;
  if (alinan + adetHam > NPC_AYLIK_KOTA) return hata("kota_doldu");
  const fiyat = npcFiyat(mal);
  const tutar = fiyat.toplam * adetHam;
  if (k.pa < tutar) return hata("para_yok");
  k.pa -= tutar;
  k.tb[1][mal] = alinan + adetHam;
  envanterEkle(k, mal, adetHam);
  return basarili({ fiyat, adet: adetHam, para: k.pa });
}
