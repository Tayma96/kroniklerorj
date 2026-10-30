// Dünya saati: 12 gerçek saat = 1 oyun ayı. Ay dönümleri Türkiye saatiyle 00:00 ve 12:00'dir
// (UTC 21:00 ve 09:00; Türkiye 2016'dan beri yaz saati uygulamaz, sürekli UTC+3). Saf fonksiyonlar.

export const AY_MS = 12 * 60 * 60 * 1000;

/**
 * [PARAMETRE] Dünyanın başladığı an = 1250 Ocak'ın başı.
 * TR 1 Kasım 2026 00:00 = UTC 31 Ekim 2026 21:00. Bir TR gece yarısı olmalıdır ki dönümler 00:00/12:00'ye düşsün.
 */
export const DUNYA_BASLANGICI_MS = Date.UTC(2026, 9, 31, 21, 0, 0);

/** [PARAMETRE] Başlangıç takvim yılı (ay sayacı 0 = bu yılın Ocak'ı). */
export const BASLANGIC_YILI = 1250;

export type Mevsim = "kis" | "ilkbahar" | "yaz" | "sonbahar";

export interface Takvim {
  yil: number;
  /** 1 = Ocak … 12 = Aralık */
  ay: number;
  mevsim: Mevsim;
}

/** Başlangıçtan bu yana geçen tam 12 saatlik dilim sayısı (başlangıçtan önce negatiftir). */
export function oyunAyi(simdi: number): number {
  return Math.floor((simdi - DUNYA_BASLANGICI_MS) / AY_MS);
}

/** Ay sayacını takvime çevirir: 0 → 1250 Ocak, 12 → 1251 Ocak, -1 → 1249 Aralık. */
export function takvim(ayIndex: number): Takvim {
  const ayKalan = ((ayIndex % 12) + 12) % 12;
  const ay = ayKalan + 1;
  return { yil: BASLANGIC_YILI + Math.floor(ayIndex / 12), ay, mevsim: mevsimBul(ay) };
}

/** Bir sonraki ay dönümünün anı (ms). Tam dönüm anında bir sonrakini verir. */
export function sonrakiDonum(simdi: number): number {
  return DUNYA_BASLANGICI_MS + (oyunAyi(simdi) + 1) * AY_MS;
}

function mevsimBul(ay: number): Mevsim {
  if (ay === 12 || ay <= 2) return "kis";
  if (ay <= 5) return "ilkbahar";
  if (ay <= 8) return "yaz";
  return "sonbahar";
}
