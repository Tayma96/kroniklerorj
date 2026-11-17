// Han masa oyunları: kural modülü sözleşmesi (saf). Her oyun bu arayüzü uygular; çatı (`cati.ts`) sırayı, katılımı,
// kopmayı, tekrar güvenliğini ve görünüm ayrımını yürütür. Modül yalnız kendi durumunu bilir: oyuncular dizinle
// (0..n-1) anılır, hesap kimliği modüle girmez.
//
// Gizli bilgi kuralı: `acik(d)` herkese (oyunculara ve seyircilere) gidecek alanları İZİN LİSTESİYLE kurar; `ozel(d, i)`
// yalnız i. oyuncuya gidecek ek alanları kurar. Hiçbir görünüm durumu olduğu gibi kopyalamaz.

import type { Sonuc } from "../../tipler.ts";
import type { Zar } from "../../yerlesim/rastgele.ts";

export interface OyunSonucu {
  /** Kazanan oyuncu dizinleri (berabere: birden çok ya da boş). */
  kazanan: number[];
  berabere: boolean;
}

export interface OyunModulu<D> {
  /** Oyun kimliği (kayıt tablosundaki anahtar). */
  tur: string;
  enAz: number;
  enCok: number;
  /** Başlangıç durumu. `zar`: sunucu tohumundan türetilmiş, bu adıma özgü üreteç. */
  kur(oyuncuSayisi: number, zar: Zar): D;
  /** Sırası gelen oyuncu dizini; oyun bittiyse null. */
  sira(d: D): number | null;
  /** Hamleyi doğrular ve uygular (ham: istemciden gelen `hamle` alanı; güvenilmez). */
  hamle(d: D, i: number, ham: unknown, zar: Zar): Sonuc<D>;
  /**
   * Yok olan oyuncunun sırasını nazikçe geçer (oyuncu adına en zararsız hamle). Oyun bunu desteklemiyorsa undefined
   * (o zaman masa yalnız dağıtabilir).
   */
  pasGec(d: D, i: number, zar: Zar): D | undefined;
  /** Oyuncu oyundan çekilir. Oyun onsuz sürebiliyorsa yeni durum; süremiyorsa undefined (oyun sonuçsuz dağılır). */
  cekil(d: D, i: number, zar: Zar): D | undefined;
  /** Bittiyse sonuç. */
  sonuc(d: D): OyunSonucu | undefined;
  /** Herkese açık görünüm (izin listesi). */
  acik(d: D): Record<string, unknown>;
  /** Yalnız i. oyuncuya giden gizli ekler (izin listesi; gizli bilgi yoksa boş nesne). */
  ozel(d: D, i: number): Record<string, unknown>;
  /** Depodaki kaydı doğrular (bozuksa undefined: oyun düşer, yarım kilit kalmaz). */
  coz(ham: unknown, oyuncuSayisi: number): D | undefined;
}
