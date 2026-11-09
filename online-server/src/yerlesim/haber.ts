// Haber, fark ve tanıklık (Faz 4 §4.2). Bilgi yalnız temasla yayılır: haber oyuncuya kaynaklı (kaynak + güven)
// özel olay olarak, NPC'ye ise konu oyuncu hakkında bir duyum olarak ulaşır. Fark: aynı mekândaki hedef dostları
// görüşmeyi görebilir. Tanık ağırlığı: NPC'nin dostlarının taraf hakkındaki bakışı (Faz 6 kadısı da kullanır).

import { npcNpcBakisi, gorusDegeri } from "./gorus.ts";
import { npcMekani } from "./cizelge.ts";
import { duyumEkle } from "./bilgi.ts";
import { DOST_ESIGI, HASIM_ESIGI } from "./donum.ts";
import { iliskiAl } from "./eylem.ts";
import { olduMu } from "./hanedan.ts";
import { dostMu } from "./iliski.ts";
import { npcRef, oyuncuRef, sinirla, yas } from "./ortak.ts";
import { karma } from "./rastgele.ts";
import type { Dokum, Kalem, Kasaba, KisiRef, Npc, OlayParam, OlayTaslagi } from "./tipler.ts";

/** [PARAMETRE] Kaynak güveni (0-100): taban, aile, dost bağı (puan/2), rakip, leke. */
export const KAYNAK_GUVENI = { taban: 40, aile: 30, rakip: -25, leke: -30 } as const;
/** [PARAMETRE] Fark: görüşmeyi gören dostun bilgi güveni (oyuncu / NPC) ve mekân başına taranan NPC. */
export const FARK_GUVEN = { oyuncu: 80, npc: 60 } as const;
export const FARK_TARAMA = 40;
export const TANIK_YASI = 14;
/** [PARAMETRE] Tanık ağırlığı: kişi başına ve her yönde tavan. */
export const TANIK_DEGERI = 3;
export const TANIK_TAVANI = 9;

/** Alıcı NPC'nin kaynak NPC'ye güveni, gerekçe kalemleriyle (toplam 0..100'e kırpılır). */
export function kaynakGuveni(k: Kasaba, alici: Npc, kaynak: Npc, ay: number): Dokum {
  const kalemler: Kalem[] = [{ k: "guven.taban", d: KAYNAK_GUVENI.taban }];
  const b = npcNpcBakisi(alici, kaynak);
  if (b && b.tur !== "dost" && b.tur !== "rakip") kalemler.push({ k: "guven.aile", d: KAYNAK_GUVENI.aile, p: { tur: b.tur } });
  else if (b?.tur === "dost") kalemler.push({ k: "guven.dost", d: Math.round(b.deger / 2) });
  else if (b?.tur === "rakip") kalemler.push({ k: "guven.rakip", d: KAYNAK_GUVENI.rakip });
  const leke = k.ug?.lk[kaynak.i];
  if (leke !== undefined && leke > ay) kalemler.push({ k: "guven.leke", d: KAYNAK_GUVENI.leke });
  const ham = kalemler.reduce((a, x) => a + x.d, 0);
  const toplam = sinirla(ham, 0, 100);
  if (toplam !== ham) kalemler.push({ k: "guven.sinir", d: toplam - ham });
  return { toplam, kalemler };
}

export interface Haber {
  /** Kaynak: "n12", "o3" ya da "gozlem". */
  kaynak: string;
  kaynakRef?: KisiRef;
  /** Alıcı: oyuncu (özel olay) ya da NPC ("n12": konu oyuncu hakkında duyum). */
  alici: string;
  /** Konu oyuncu (yerel kimlik). */
  konu: string;
  /** Olay/duyum türü (i18n: olay.ucgen.<tur>). */
  tur: string;
  guven: number;
  ay: number;
  /** NPC alıcıda duyum yükü (konuya bakışa tam güvende etkisi). */
  yuk?: number;
  p?: Record<string, OlayParam>;
  onem?: number;
}

/**
 * Haber verir. Oyuncu alıcıya kaynaklı özel olay yazar; NPC alıcıya konu oyuncunun ilişki haritasında duyum
 * ekler (konu oyuncunun haritası yüklü olmalıdır, değilse haber yerine ulaşmaz).
 */
export function haberVer(k: Kasaba, h: Haber): OlayTaslagi[] {
  if (h.alici.startsWith("n")) {
    const ili = k.ili.get(h.konu);
    const n = Number(h.alici.slice(1));
    if (ili && k.dizin.has(n) && h.yuk) duyumEkle(iliskiAl(ili, n), h.kaynak, h.tur, h.yuk, h.guven, h.ay);
    return [];
  }
  const p: Record<string, OlayParam> = { ...h.p, guven: h.guven, kaynak: h.kaynakRef ?? h.kaynak };
  return [{ t: "ucgen", w: h.kaynak.startsWith("n") || h.kaynak.startsWith("o") ? h.kaynak : "", h: h.alici, g: h.alici, n: h.onem ?? 6, k: `olay.ucgen.${h.tur}`, p }];
}

export interface Farkeden {
  kim: string;
  ref: KisiRef;
  guven: number;
}

/**
 * `mekan`da bu ay bulunan hedef dostları: dost baktığı NPC'ler (görüş ≥ DOST_ESIGI; hedefin haritası yüklü olmalı)
 * ve Faz 3 dostu oyuncular. `haric` dışarıda kalır. Sıra deterministiktir.
 */
export function fark(k: Kasaba, mekan: string, ay: number, hedef: string, haric: readonly string[] = []): Farkeden[] {
  const sonuc: Farkeden[] = [];
  const hk = k.kar.get(hedef);
  const hi = k.ili.get(hedef);
  for (const s of k.sakin) {
    if (s.o === hedef || haric.includes(s.o) || s.ma !== ay || s.mk !== mekan || !dostMu(k.tp, s.o, hedef)) continue;
    const kar = k.kar.get(s.o);
    if (kar && olduMu(kar)) continue;
    sonuc.push({ kim: s.o, ref: oyuncuRef(s), guven: FARK_GUVEN.oyuncu });
  }
  if (hk) {
    const aday = k.npc.filter((n) => !haric.includes(`n${n.i}`) && yas(n.d, ay) >= TANIK_YASI && npcMekani(k, n, ay) === mekan);
    aday.sort((x, y) => karma("fark", mekan, ay, x.i) - karma("fark", mekan, ay, y.i));
    for (const n of aday.slice(0, FARK_TARAMA)) {
      if (gorusDegeri(k, n, hk, hi, ay) >= DOST_ESIGI) sonuc.push({ kim: `n${n.i}`, ref: npcRef(n), guven: FARK_GUVEN.npc });
    }
  }
  return sonuc;
}

/**
 * Tanık ağırlığı: NPC'nin dostu olan NPC'lerden taraf lehine (görüş ≥ DOST_ESIGI) ve aleyhine (≤ HASIM_ESIGI)
 * bakanlar, artı NPC'nin dost baktığı (anlık görüntü) ve tarafla dost oyuncular lehtedir. Her yön ±TANIK_TAVANI.
 */
export function tanikAgirligi(k: Kasaba, npc: Npc, taraf: string, ay: number): Kalem[] {
  const kar = k.kar.get(taraf);
  const ili = k.ili.get(taraf);
  if (!kar) return [];
  let lehte = 0;
  let aleyhte = 0;
  for (const b of npc.b) {
    if (b[1] !== 1) continue;
    const d = k.dizin.get(b[0]);
    if (!d || yas(d.d, ay) < TANIK_YASI) continue;
    const g = gorusDegeri(k, d, kar, ili, ay);
    if (g >= DOST_ESIGI) lehte++;
    else if (g <= HASIM_ESIGI) aleyhte++;
  }
  for (const [o] of k.ug?.yk[npc.i] ?? []) if (o !== taraf && dostMu(k.tp, o, taraf)) lehte++;
  const kalemler: Kalem[] = [];
  if (lehte) kalemler.push({ k: "sans.tanikLehte", d: Math.min(TANIK_TAVANI, lehte * TANIK_DEGERI), p: { adet: lehte } });
  if (aleyhte) kalemler.push({ k: "sans.tanikAleyhte", d: -Math.min(TANIK_TAVANI, aleyhte * TANIK_DEGERI), p: { adet: aleyhte } });
  return kalemler;
}
