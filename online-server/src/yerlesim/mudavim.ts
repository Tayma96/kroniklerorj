// Müdavim (Ek A §3.6, E7): oyuncu yerleşiminin hanının düzenli ziyaretçisi olur; hancı onu tanır, rozet kazanır.
// Rozet GÜN SERİSİYLE DEĞİL, son aylar içindeki ZİYARET GÜNÜ SAYISIYLA kazanılır: ara vermek hiçbir şeyi sıfırlamaz,
// kazanılan en yüksek rozet kalıcıdır (girişe zorlamaz, katılmamak ceza değil). Ziyaret, han masasına oturma biletinin
// sunucuda kesilmesidir (HesapDO → YerlesimDO; istemci bildirimi kabul edilmez); aynı gerçek gün bir kez sayılır.
// Teveccüh (§6.2): ozan meslekli oyuncunun eşikleri teveccüh "sahne" etkisi kadar düşer (müdavim hızı; tavanlı,
// görünümde yazılı). Saf fonksiyonlar.

import { teveccuhEtkisi, teveccuhKademesi } from "./teveccuh.ts";
import type { Karakter, OlayTaslagi } from "./tipler.ts";

export const GUN_MS = 24 * 60 * 60 * 1000;
/** [PARAMETRE] Sayım penceresi (gerçek gün) ve rozet eşikleri (penceredeki ziyaret günü). */
export const MUDAVIM_PENCERE_GUN = 90;
export const MUDAVIM_ESIKLERI: readonly number[] = [6, 15, 30];
export const MUDAVIM_ROZETLERI = ["tanidik", "mudavim", "demirbas"] as const;
/** [PARAMETRE] Ozan + teveccüh: eşik indirimi tavanı; eşik en az 1. */
export const MUDAVIM_OZAN_INDIRIM_TAVAN = 3;
/** [PARAMETRE] H4: han plakasında müdavim rozeti için en az rozet kademesi (2 = "mudavim"). */
export const MUDAVIM_PLAKA_KADEME = 2;

/** Karakterdeki müdavim kaydı: ziyaret günleri (gün numarası, artan) ve kazanılmış en yüksek rozet (0 = yok). */
export interface MudavimKaydi {
  g: number[];
  r: number;
}

export function mudavimIndirimi(k: Karakter, ay: number): number {
  if (k.ms?.a !== "ozan") return 0;
  return Math.min(MUDAVIM_OZAN_INDIRIM_TAVAN, teveccuhEtkisi(teveccuhKademesi(k, ay), "sahne"));
}

export function mudavimEsikleri(k: Karakter, ay: number): number[] {
  const ind = mudavimIndirimi(k, ay);
  return MUDAVIM_ESIKLERI.map((e) => Math.max(1, e - ind));
}

function pencereSayisi(md: MudavimKaydi | undefined, gun: number): number {
  return md ? md.g.filter((g) => gun - g < MUDAVIM_PENCERE_GUN).length : 0;
}

/** Han ziyareti (bilet kesildi). Aynı gün ikinci kez sayılmaz. Yeni rozet kazanıldıysa hancının tanıma olayı döner. */
export function mudavimZiyaret(k: Karakter, simdi: number, ay: number): { sayildi: boolean; sayi: number; rozet: number; olay?: OlayTaslagi } {
  const gun = Math.floor(simdi / GUN_MS);
  const md = (k.md ??= { g: [], r: 0 });
  let sayildi = false;
  if (md.g.at(-1) !== gun && !md.g.includes(gun)) {
    md.g.push(gun);
    md.g.sort((a, b) => a - b);
    sayildi = true;
  }
  md.g = md.g.filter((g) => gun - g < MUDAVIM_PENCERE_GUN);
  const sayi = md.g.length;
  const esik = mudavimEsikleri(k, ay);
  let kd = 0;
  esik.forEach((e, i) => {
    if (sayi >= e) kd = i + 1;
  });
  if (kd > md.r) {
    md.r = kd;
    return {
      sayildi,
      sayi,
      rozet: kd,
      olay: { t: "mudavim", w: k.o, h: k.o, g: k.o, n: 4, k: "olay.mudavim.rozet", p: { rozet: MUDAVIM_ROZETLERI[kd - 1]!, ziyaret: sayi } },
    };
  }
  return { sayildi, sayi, rozet: md.r };
}

export function mudavimGorunumu(k: Karakter, simdi: number, ay: number) {
  const gun = Math.floor(simdi / GUN_MS);
  const sayi = pencereSayisi(k.md, gun);
  const r = k.md?.r ?? 0;
  const esik = mudavimEsikleri(k, ay);
  return {
    rozet: r ? MUDAVIM_ROZETLERI[r - 1] : null,
    ziyaret: sayi,
    pencereGun: MUDAVIM_PENCERE_GUN,
    esikler: MUDAVIM_ROZETLERI.map((ad, i) => ({ rozet: ad, ziyaret: esik[i]!, taban: MUDAVIM_ESIKLERI[i]! })),
    sonraki: r < esik.length ? { rozet: MUDAVIM_ROZETLERI[r], gereken: esik[r]! } : null,
    indirim: { k: "mudavim.indirim.ozanTeveccuh", deger: mudavimIndirimi(k, ay), tavan: MUDAVIM_OZAN_INDIRIM_TAVAN },
    seri: false,
    kalici: true,
  };
}
