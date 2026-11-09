// Yaşlılık ve ölüm (Faz 7, D-02). 60. yaş dönümünde tohumlu, gizli bir ölüm ayı seçilir (61–80, ortalama ~70).
// Ölüm yalnız yaşlılıkla gelir: can tabanı, evsizlik ya da yokluk ölüm getirmez. Ölümden SON_GUNLER_AY ay önce
// "son günler" uyarısı Dönüş Kartı'na düşer (vasiyet ve vâris hatırlatması). 60+ takat ve beden yavaşça düşer.

import { hanedanKaydi, hanedanKasabasi, hanedanKimligi, olduMu, oyuncuEsKodu, DEVIR_SURE_AY, varisAdaylari } from "./hanedan.ts";
import { kronikEkle } from "./kronik.ts";
import { kisiCoz, oyuncuRef, yas } from "./ortak.ts";
import { tohumlu } from "./rastgele.ts";
import type { Karakter, Kasaba, OlayTaslagi } from "./tipler.ts";

/** [PARAMETRE] Yaşlılık başı; ölüm yaşı aralığı (iki zarın ortalaması: ortalama ~70,5, tavan 80). */
export const YASLILIK_YASI = 60;
export const OLUM_YAS_EN_AZ = 61;
export const OLUM_YAS_EN_COK = 80;
/** [PARAMETRE] Son günler uyarısı ölümden kaç ay önce (6 ay = 3 gerçek gün). */
export const SON_GUNLER_AY = 6;
/** [PARAMETRE] Yaşa göre aylık takat tavanı (kondisyon kademesiyle birlikte küçüğü geçerli). */
export const YASLI_TAKAT: readonly { yas: number; takat: number }[] = [
  { yas: 70, takat: 4 },
  { yas: 60, takat: 5 },
];
/** [PARAMETRE] 60'tan sonra her kaç yaşta güç ve dayanıklılık 1 düşer; en düşük değer. */
export const BEDEN_AZALMA_ARALIGI = 3;
export const BEDEN_TABAN = 2;
const BEDEN = [0, 2] as const; // güç, dayanıklılık (OZELLIKLER dizini)

export function yaslilikTakatTavani(y: number): number {
  return YASLI_TAKAT.find((x) => y >= x.yas)?.takat ?? Number.POSITIVE_INFINITY;
}

/** Gizli ölüm ayı: aynı hanedan + karakter her zaman aynı ayı verir; 61–80 yaş arası. */
export function olumAyiBelirle(k: { o: string; d: number }, hanedan: string): number {
  const r = tohumlu("olum", hanedan, k.o);
  const aralik = (OLUM_YAS_EN_COK - OLUM_YAS_EN_AZ) * 12;
  return k.d + OLUM_YAS_EN_AZ * 12 + Math.floor(((r() + r()) / 2) * (aralik + 1));
}

function ozel(o: string, k: string, n: number, p: OlayTaslagi["p"]): OlayTaslagi {
  return { t: "hanedan", w: o, h: o, g: o, n, k, p };
}

/** Bir canlı oyuncunun bu ayki yaşlılık adımı; ölürse tereke açılır, eş dul kalır. Olay taslaklarını döndürür. */
export function yaslilikDonumu(kasaba: Kasaba, kar: Karakter, ay: number): OlayTaslagi[] {
  if (olduMu(kar)) return [];
  const y = yas(kar.d, ay);
  if (y < YASLILIK_YASI) return [];
  const olaylar: OlayTaslagi[] = [];
  const hd = hanedanKaydi(kasaba, kar);
  if (hd.oa === undefined) {
    // Eski/geç kayıtta seçilen ay geçmişte kalmasın: son günler uyarısı her zaman görülür.
    hd.oa = Math.max(olumAyiBelirle(kar, hanedanKimligi(kar)), ay + SON_GUNLER_AY);
    olaylar.push(ozel(kar.o, "olay.yaslilik.basladi", 6, { takat: yaslilikTakatTavani(y) }));
  }
  if ((ay - kar.d) % 12 === 0 && y > YASLILIK_YASI && (y - YASLILIK_YASI) % BEDEN_AZALMA_ARALIGI === 0) {
    const p: Record<string, number> = {};
    for (const i of BEDEN) {
      const once = kar.oz[i] ?? BEDEN_TABAN;
      kar.oz[i] = Math.max(BEDEN_TABAN, once - 1);
      p[i === 0 ? "guc" : "dayaniklilik"] = kar.oz[i]! - once;
    }
    olaylar.push(ozel(kar.o, "olay.yaslilik.beden", 4, p));
  }
  if (ay === hd.oa - SON_GUNLER_AY) {
    olaylar.push(
      ozel(kar.o, "olay.sonGunler", 10, {
        kisi: oyuncuRef(kar),
        ay: SON_GUNLER_AY,
        vasiyet: hd.vs ? 1 : 0,
        aday: varisAdaylari(kasaba, kar, ay).filter((a) => a.uygun).length,
      }),
    );
  }
  if (ay >= hd.oa) olaylar.push(...oyuncuOlumu(kasaba, kar, ay));
  return olaylar;
}

/** Ölüm: `ol` yazılır, tereke emanete alınır (para karakter kaydında kalır), eş dul kalır, kronik satırı. */
export function oyuncuOlumu(kasaba: Kasaba, kar: Karakter, ay: number): OlayTaslagi[] {
  const hd = hanedanKaydi(kasaba, kar);
  hd.ol = ay;
  hanedanKasabasi(kasaba).tr.push({ o: kar.o, h: kar.h, ol: ay, son: ay + DEVIR_SURE_AY });
  const y = yas(kar.d, ay);
  const olaylar: OlayTaslagi[] = [
    { t: "hanedan", w: kar.o, h: kar.o, g: "", n: 9, k: "olay.oyuncuOldu", p: { kisi: oyuncuRef(kar), yas: y } },
  ];
  const es = hd.es ? kisiCoz(hd.es) : undefined;
  if (es?.tur === "npc") {
    const n = kasaba.dizin.get(es.i);
    if (n && n.es === oyuncuEsKodu(kar.o)) n.es = 0;
  } else if (es?.tur === "oyuncu") {
    const ok = kasaba.kar.get(es.o);
    if (ok?.hd?.es === kar.o) {
      delete ok.hd.es;
      olaylar.push({ t: "hanedan", w: kar.o, h: ok.o, g: ok.o, n: 9, k: "olay.esOldu", p: { kisi: oyuncuRef(kar) } });
    }
  }
  kronikEkle(kasaba, { a: ay, t: "olum", k: "kronik.olum", p: { kisi: oyuncuRef(kar), yas: y, nesil: hd.n } });
  return olaylar;
}
