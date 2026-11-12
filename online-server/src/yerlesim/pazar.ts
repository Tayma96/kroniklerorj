// NPC'ye satış (dikey dilim E2): oyuncu ürettiğini kasabaya (NPC alıcılara) satar. Akçe NPC'den gelir — tanımlı
// kaynaktır ve oyuncu başına mal başına aylık kotayla sınırlıdır (farm yok). Birim fiyat `satisDegeri`dir
// (taban + kıtlık primi; kıtlık sayımında satıcının kendisi sayılmaz), döküm olarak döner. Su satılmaz. Satılan mal
// kasaba stoğuna girer (npc-taban.ts stok kanalı). Hata olursa hiçbir şey değişmez.

import { MALLAR, malBul, type MalId } from "../icerik/mallar.ts";
import type { MeslekId } from "../icerik/meslekler.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { envanterEkle, saticiDegeri, stogaEkle, type KasabaStogu } from "./npc-taban.ts";
import type { CalismaParametreleri, Dokum, Karakter } from "./tipler.ts";

/** [PARAMETRE] Oyuncu başına mal başına aylık NPC alım kotası. */
export const NPC_SATIS_KOTASI = 6;
/** [DENGE] Tek demircinin pahalı alet/nal için NPC'ye sınırsız satış rantı oluşmasın;
 * kasabada ikinci demirci varsa talep genişler. Callback, satıcı dışındaki oyuncuları sayar. */
export function npcSatisKotasi(mal: MalId, digerMeslektas = 0): number {
  return (mal === "alet" || mal === "nal") && digerMeslektas <= 0 ? 2 : NPC_SATIS_KOTASI;
}
/** [PARAMETRE] Kıtlık primi oyuncu başına mal başına ayda yalnız bu kadar birime ödenir (kıt pazar çabuk doyar;
 * tek üreticinin yüksek katma değerli malında primin aylık kazancı sınırlı kalır). */
export const KITLIK_KOTASI = 2;

export type SatisSonucu = {
  mal: MalId;
  adet: number;
  /** İlk birimin fiyat dökümü (kıtlık kotası dolmadıysa primli). */
  birim: Dokum;
  tutar: number;
  /** Bütün satışın dökümü: taban × adet, primli birim sayısı kadar kıtlık. */
  dokum: Dokum;
  /** Bu ay bu malda kalan primli birim. */
  kitlikKalan: number;
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
  stok?: KasabaStogu,
  parametreler?: CalismaParametreleri,
): Sonuc<SatisSonucu> {
  const mal = malBul(malHam);
  if (!mal || MALLAR[mal].taban === 0) return hata("mal_gecersiz");
  if (typeof adetHam !== "number" || !Number.isInteger(adetHam) || adetHam < 1) return hata("mal_gecersiz");
  if ((k.ev?.[mal] ?? 0) < adetHam) return hata("mal_yok");
  const once = satilan(k, mal, ay);
  const meslek = MALLAR[mal].meslek;
  const digerMeslektas = Math.max(0, oyuncuSayisi(meslek) - (k.ms?.a === meslek ? 1 : 0));
  const kotaTavan = npcSatisKotasi(mal, digerMeslektas);
  if (once + adetHam > kotaTavan) return hata("kota_doldu");
  const primli = saticiDegeri(k, mal, oyuncuSayisi, parametreler);
  const prim = primli.kalemler.find((x) => x.k === "kitlik")?.d ?? 0;
  const primAdet = prim > 0 ? Math.min(adetHam, Math.max(0, KITLIK_KOTASI - once)) : 0;
  const taban = MALLAR[mal].taban;
  const birim: Dokum = primAdet > 0 || prim === 0 ? primli : { toplam: taban, kalemler: [{ k: "taban", d: taban }] };
  const kalemler = [{ k: "taban", d: taban * adetHam }];
  if (primAdet > 0) kalemler.push({ k: "kitlik", d: prim * primAdet });
  const tutar = kalemler.reduce((a, x) => a + x.d, 0);
  if (!k.ns || k.ns[0] !== ay) k.ns = [ay, {}];
  k.ns[1][mal] = once + adetHam;
  envanterEkle(k, mal, -adetHam);
  k.pa += tutar;
  if (stok) stogaEkle(stok, mal, adetHam);
  const s = once + adetHam;
  return basarili({
    mal,
    adet: adetHam,
    birim,
    tutar,
    dokum: { toplam: tutar, kalemler },
    kitlikKalan: prim > 0 ? Math.max(0, KITLIK_KOTASI - s) : 0,
    kota: { satilan: s, tavan: kotaTavan, kalan: kotaTavan - s },
  });
}

/** Kalan NPC alım kotası (NPC'nin bu ay oyuncudan daha kaç adet alacağı), ticareti yapılan her mal için. */
export function kalanSatisKotasi(k: Karakter, ay: number, oyuncuSayisi: (m: MeslekId) => number = () => 0): Partial<Record<MalId, number>> {
  const kota: Partial<Record<MalId, number>> = {};
  for (const [mal, m] of Object.entries(MALLAR) as [MalId, (typeof MALLAR)[MalId]][]) if (m.taban > 0) const digerMeslektas = Math.max(0, oyuncuSayisi(m.meslek) - (k.ms?.a === m.meslek ? 1 : 0));
    kota[mal] = npcSatisKotasi(mal, digerMeslektas) - satilan(k, mal, ay);
  return kota;
}
