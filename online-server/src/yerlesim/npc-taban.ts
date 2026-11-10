// NPC taban arzı (ana tasarım §5.5, §14.4.3): NPC her zaman satar ama pahalı ve sınırlı. Kıtlık kazanç
// demektir: satıcı dışında o meslekte oyuncu yoksa malı satan oyuncu prim alır. NPC'ye ödenen akçe dünyadan çıkar.
// Kasaba stok kanalı (denge denetimi 9 Kasım, geçici köprü): oyuncunun NPC'ye sattığı mal kasaba stoğuna girer;
// başka meslekten alıcı önce stoktan `taban × STOK_CARPAN` ile, kalanı NPC'den `taban × NPC_CARPAN` ile alır.
// Stok fiyatı kıtlıklı satış değerinden düşük olamaz (STOK_CARPAN ≥ 1 + KITLIK_PRIM): al-sat takatsiz kâr vermez.
// Malın kendi mesleğindeki (ana/yan) oyuncu stoktan alamaz: stoktan alıp siparişe teslim etmek kapalıdır.

import { MALLAR, malBul, type MalId } from "../icerik/mallar.ts";
import type { MeslekId } from "../icerik/meslekler.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { kaliteKirp } from "./kalite.ts";
import type { Dokum, Karakter } from "./tipler.ts";

/** [PARAMETRE] NPC satış çarpanı, oyuncu başına mal başına aylık alım kotası, kıtlık primi oranı. */
export const NPC_CARPAN = 2.5;
export const NPC_AYLIK_KOTA = 3;
export const KITLIK_PRIM = 0.5;
/** [PARAMETRE] Kasaba stoğundan satış çarpanı ve mal başına stok tavanı. */
export const STOK_CARPAN = 1.5;
export const STOK_EN_COK = 12;

/** Kasaba stoğu: mal → adet (yerleşim kaydında). */
export type KasabaStogu = Partial<Record<MalId, number>>;

/** Envantere ekler (negatif = çıkarır, sıfırın altına inmez); kalan adedi döndürür. Eklenen izsiz (sade) sayılır;
 * çıkarmada önce izsiz sade, sonra en düşük kaliteli parti düşer (kalite.ts). */
export function envanterEkle(k: Karakter, mal: MalId, adet: number): number {
  const ev = (k.ev ??= {});
  const yeni = Math.max(0, (ev[mal] ?? 0) + adet);
  if (yeni === 0) delete ev[mal];
  else ev[mal] = yeni;
  if (adet < 0) kaliteKirp(k, mal);
  return yeni;
}

/** NPC'den bir birimin fiyatı. */
export function npcFiyat(mal: MalId): Dokum {
  const taban = MALLAR[mal].taban;
  const toplam = Math.ceil(taban * NPC_CARPAN);
  return { toplam, kalemler: [{ k: "taban", d: taban }, { k: "npc_pahali", d: toplam - taban }] };
}

/** Kasaba stoğundan bir birimin fiyatı. */
export function stokFiyat(mal: MalId): Dokum {
  const taban = MALLAR[mal].taban;
  const toplam = Math.ceil(taban * STOK_CARPAN);
  return { toplam, kalemler: [{ k: "taban", d: taban }, { k: "stok", d: toplam - taban }] };
}

/** Bir birimin satış değeri; o malın mesleğinde (satıcı hariç) oyuncu yoksa kıtlık primi eklenir. */
export function satisDegeri(mal: MalId, oyuncuSayisi: number): Dokum {
  const taban = MALLAR[mal].taban;
  const kalemler = [{ k: "taban", d: taban }];
  if (oyuncuSayisi <= 0 && taban > 0) kalemler.push({ k: "kitlik", d: Math.ceil(taban * KITLIK_PRIM) });
  return { toplam: kalemler.reduce((a, x) => a + x.d, 0), kalemler };
}

/** Kıtlık sayımı: malın mesleğindeki oyuncu sayısı, satıcının kendisi hariç (lonca ana mesleği sayar). */
export function saticiHaricSayi(satici: Karakter, mal: MalId, oyuncuSayisi: (m: MeslekId) => number): number {
  const m = MALLAR[mal].meslek;
  return Math.max(0, oyuncuSayisi(m) - (satici.ms?.a === m ? 1 : 0));
}

/** Satıcıya göre birim satış değeri (kıtlıkta satıcı sayılmaz). */
export function saticiDegeri(satici: Karakter, mal: MalId, oyuncuSayisi: (m: MeslekId) => number): Dokum {
  return satisDegeri(mal, saticiHaricSayi(satici, mal, oyuncuSayisi));
}

/** Malın mesleği karakterin ana ya da yan mesleği mi (sipariş teslimi ve stok kapısı). */
export function malMeslegindeMi(k: Karakter, mal: MalId): boolean {
  const m = MALLAR[mal].meslek;
  return k.ms?.a === m || k.ms?.y === m;
}

/** Bu ay NPC'den alınan adet. */
export function npcdenAlinan(k: Karakter, mal: MalId, ay: number): number {
  return k.tb && k.tb[0] === ay ? (k.tb[1][mal] ?? 0) : 0;
}

export type AlimSonucu = {
  /** NPC birim fiyatı (geriye uyum) ve stok birim fiyatı. */
  fiyat: Dokum;
  stokFiyat: Dokum;
  adet: number;
  /** Stoktan ve NPC'den alınan adet; toplam tutar. */
  stoktan: number;
  npcden: number;
  tutar: number;
  para: number;
  /** NPC aylık kotası (yalnız NPC'den alınan sayılır). */
  kota: { alinan: number; tavan: number; kalan: number };
};

export function npcdenAl(k: Karakter, malHam: unknown, adetHam: unknown, ay: number, stok?: KasabaStogu): Sonuc<AlimSonucu> {
  const mal = malBul(malHam);
  if (!mal || MALLAR[mal].taban === 0) return hata("mal_gecersiz");
  if (typeof adetHam !== "number" || !Number.isInteger(adetHam) || adetHam < 1) return hata("mal_gecersiz");
  const stokVar = stok && !malMeslegindeMi(k, mal) ? (stok[mal] ?? 0) : 0;
  const stoktan = Math.min(stokVar, adetHam);
  const npcden = adetHam - stoktan;
  const alinan = npcdenAlinan(k, mal, ay);
  if (alinan + npcden > NPC_AYLIK_KOTA) return hata("kota_doldu");
  const fiyat = npcFiyat(mal);
  const sf = stokFiyat(mal);
  const tutar = sf.toplam * stoktan + fiyat.toplam * npcden;
  if (k.pa < tutar) return hata("para_yok");
  k.pa -= tutar;
  if (npcden > 0) {
    if (!k.tb || k.tb[0] !== ay) k.tb = [ay, {}];
    k.tb[1][mal] = alinan + npcden;
  }
  if (stoktan > 0 && stok) {
    const kalan = (stok[mal] ?? 0) - stoktan;
    if (kalan > 0) stok[mal] = kalan;
    else delete stok[mal];
  }
  envanterEkle(k, mal, adetHam);
  const a = alinan + npcden;
  return basarili({
    fiyat,
    stokFiyat: sf,
    adet: adetHam,
    stoktan,
    npcden,
    tutar,
    para: k.pa,
    kota: { alinan: a, tavan: NPC_AYLIK_KOTA, kalan: NPC_AYLIK_KOTA - a },
  });
}

/** NPC'ye satılan mal kasaba stoğuna girer (tavana kadar). */
export function stogaEkle(stok: KasabaStogu, mal: MalId, adet: number): void {
  const yeni = Math.min(STOK_EN_COK, (stok[mal] ?? 0) + adet);
  if (yeni > 0) stok[mal] = yeni;
}

/** Stok görünümü: adet ve birim fiyat dökümü; alıcı için açık mı (kendi mesleğinin malı stoktan alınmaz). */
export function stokGorunumu(stok: KasabaStogu | undefined, k: Karakter) {
  return (Object.entries(stok ?? {}) as [MalId, number][])
    .filter(([, n]) => n > 0)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([mal, adet]) => ({ mal, adet, fiyat: stokFiyat(mal), acik: !malMeslegindeMi(k, mal) }));
}
