// Yerleşim tohumundan deterministik nüfus: haneler ve aileler (eş, çocuk, yaşlı), yerleşim türüne göre meslek
// dağılımı, huy/tuhaflık/hayal (tek oyunculudaki listeler) ve NPC'ler arası dostluk/rekabet bağları.
// Aynı (yerleşim, ay) her zaman aynı nüfusu verir. Sayı hedefi dunya-veri.ts'den (köy ~80, kasaba ~200, şehir ~400).

import { AD_HAVUZLARI } from "../icerik/adlar.ts";
import { HAYALLER, HUYLAR, MESLEKLER, TUHAFLIKLAR } from "../icerik/kisilik.ts";
import type { Yerlesim, YerlesimTuru } from "../dunya-veri.ts";
import { yas } from "./ortak.ts";
import { agirlikliSec, aralik, dizinSec, tohumlu, type Zar } from "./rastgele.ts";
import type { Bag, Kasaba, Npc } from "./tipler.ts";

/**
 * [PARAMETRE] Yerleşim türüne göre meslek ağırlıkları, MESLEKLER sırasıyla:
 * çiftçi, demirci, tüccar, balıkçı, avcı, çoban, fırıncı, müzisyen, şifacı, asker, işsiz.
 */
export const MESLEK_AGIRLIGI: Readonly<Record<YerlesimTuru, readonly number[]>> = {
  koy: [40, 4, 2, 5, 8, 18, 3, 2, 2, 2, 6],
  kasaba: [20, 8, 14, 4, 4, 6, 7, 4, 4, 7, 8],
  sehir: [8, 10, 22, 4, 2, 2, 9, 6, 6, 14, 9],
};
export const ISSIZ = MESLEKLER.indexOf("işsiz");
const SINSI_HUYLAR = new Set(["kibirli", "hırslı", "kurnaz"].map((h) => HUYLAR.indexOf(h)));
/** Dostunun dostu kalemi için en az 4 mevsimlik (12 ay) bağ; üretilen bağlar bundan eskidir. */
const BAG_YAS_EN_AZ = 12;
const BAG_YAS_EN_COK = 120;
const BAG_SINIRI = 4;

export interface UretimBaglami {
  tur: YerlesimTuru;
  ay: number;
  npc: Npc[];
  ni: number;
  ne: number;
}

export function meslekSec(tur: YerlesimTuru, r: Zar): number {
  const i = agirlikliSec(MESLEK_AGIRLIGI[tur], r);
  return i < 0 ? ISSIZ : i;
}

export function npcEkle(b: UretimBaglami, r: Zar, k: 0 | 1, yasYil: number, s: number, e: number): Npc {
  const havuz = AD_HAVUZLARI.tr;
  const n: Npc = {
    i: b.ni++,
    a: dizinSec((k ? havuz.f : havuz.m).length, r),
    s,
    k,
    d: b.ay - yasYil * 12 - dizinSec(12, r),
    m: meslekSec(b.tur, r),
    h: dizinSec(HUYLAR.length, r),
    q: dizinSec(TUHAFLIKLAR.length, r),
    r: dizinSec(HAYALLER.length, r),
    e,
    es: 0,
    an: 0,
    ba: 0,
    b: [],
    g: 0,
  };
  b.npc.push(n);
  return n;
}

/** Bir hane üretir (çift + çocuklar, kimi zaman dul baş ya da yanlarında yaşlı ebeveyn). Üyeleri döndürür. */
export function haneUret(b: UretimBaglami, r: Zar): Npc[] {
  const e = b.ne++;
  const s = dizinSec(AD_HAVUZLARI.tr.s.length, r);
  const uyeler: Npc[] = [];
  let anne: Npc | undefined;
  let baba: Npc | undefined;
  if (r() < 0.1) {
    // Dul hane başı.
    const bas = npcEkle(b, r, r() < 0.5 ? 1 : 0, aralik(r, 30, 70), s, e);
    uyeler.push(bas);
    if (bas.k) anne = bas;
    else baba = bas;
  } else {
    const kocaYas = aralik(r, 20, 60);
    baba = npcEkle(b, r, 0, kocaYas, s, e);
    anne = npcEkle(b, r, 1, Math.max(17, kocaYas - aralik(r, 0, 8)), s, e);
    baba.es = anne.i;
    anne.es = baba.i;
    uyeler.push(baba, anne);
    if (kocaYas <= 50 && r() < 0.25) {
      const yasli = npcEkle(b, r, r() < 0.5 ? 1 : 0, Math.min(88, kocaYas + aralik(r, 20, 32)), s, e);
      if (yasli.k) baba.an = yasli.i;
      else baba.ba = yasli.i;
      uyeler.push(yasli);
    }
  }
  // Çocuklar: en büyüğü annenin (ya da dul başın) 17 yaşından sonra doğar; 25'i geçen evden ayrılmıştır.
  const ebeveyn = anne ?? baba;
  if (ebeveyn) {
    const ebeveynYas = yas(ebeveyn.d, b.ay);
    const enCok = Math.max(0, Math.min(6, Math.floor((ebeveynYas - 17) / 2.5)));
    const sayi = Math.min(enCok, aralik(r, 0, 4) + (r() < 0.3 ? 2 : 0));
    let cocukYas = aralik(r, 0, Math.max(0, Math.min(ebeveynYas - 17, 25)));
    for (let c = 0; c < sayi && cocukYas >= 0; c++) {
      const cocuk = npcEkle(b, r, r() < 0.5 ? 1 : 0, cocukYas, s, e);
      // Doğum ayı ebeveynden en az 17 yıl sonra olsun (aynı yılın ay kayması dahil).
      if (cocuk.d < ebeveyn.d + 17 * 12) cocuk.d = ebeveyn.d + 17 * 12;
      if (cocuk.d > b.ay) cocuk.d = b.ay;
      if (baba && r() < 0.5) cocuk.m = baba.m;
      cocuk.an = anne?.i ?? 0;
      cocuk.ba = baba?.i ?? 0;
      uyeler.push(cocuk);
      cocukYas -= aralik(r, 1, 4);
    }
  }
  return uyeler;
}

function bagVar(a: Npc, b: Npc): boolean {
  return a.b.some((x) => x[0] === b.i);
}

export function bagKur(a: Npc, b: Npc, tur: 1 | 2, puan: number, kurulus: number): void {
  const ab: Bag = [b.i, tur, puan, kurulus];
  const ba: Bag = [a.i, tur, puan, kurulus];
  a.b.push(ab);
  b.b.push(ba);
}

/** Dostluk ve rekabet bağları (iki yönlü). Rekabet çoğunlukla aynı meslekte, sinsi huylularda sıktır. */
function baglariKur(b: UretimBaglami, r: Zar): void {
  const yetiskin = b.npc.filter((n) => yas(n.d, b.ay) >= 16);
  if (yetiskin.length < 2) return;
  for (const a of yetiskin) {
    const hedefDost = aralik(r, 0, 2);
    for (let deneme = 0; deneme < 6 && a.b.filter((x) => x[1] === 1).length < hedefDost; deneme++) {
      const o = yetiskin[dizinSec(yetiskin.length, r)];
      if (!o || o === a || o.e === a.e || bagVar(a, o) || o.b.length >= BAG_SINIRI) continue;
      if (Math.abs(yas(o.d, b.ay) - yas(a.d, b.ay)) > 12) continue;
      bagKur(a, o, 1, aralik(r, 30, 80), b.ay - aralik(r, BAG_YAS_EN_AZ, BAG_YAS_EN_COK));
    }
    if (r() < (SINSI_HUYLAR.has(a.h) ? 0.35 : 0.08)) {
      for (let deneme = 0; deneme < 6; deneme++) {
        const o = yetiskin[dizinSec(yetiskin.length, r)];
        if (!o || o === a || o.e === a.e || bagVar(a, o) || o.b.length >= BAG_SINIRI) continue;
        if (o.m !== a.m && deneme < 4) continue;
        bagKur(a, o, 2, -aralik(r, 30, 70), b.ay - aralik(r, BAG_YAS_EN_AZ, BAG_YAS_EN_COK));
        break;
      }
    }
  }
}

/** Yerleşimin ilk nüfusu. Deterministik: tohum yalnız yerleşim kimliği ve ay. */
export function nufusUret(yerlesim: Yerlesim, ay: number): { npc: Npc[]; ni: number; ne: number } {
  const r = tohumlu("uret", yerlesim.id, ay);
  const b: UretimBaglami = { tur: yerlesim.tur, ay, npc: [], ni: 1, ne: 1 };
  while (b.npc.length < yerlesim.npc) haneUret(b, r);
  baglariKur(b, r);
  return { npc: b.npc, ni: b.ni, ne: b.ne };
}

export function kasabaKur(yerlesim: Yerlesim, ay: number): Kasaba {
  const { npc, ni, ne } = nufusUret(yerlesim, ay);
  return {
    y: yerlesim.id,
    tur: yerlesim.tur,
    hedef: yerlesim.npc,
    ay,
    npc,
    dizin: new Map(npc.map((n) => [n.i, n])),
    ni,
    ne,
    sakin: [],
    kar: new Map(),
    ili: new Map(),
  };
}

/** Kasabaya üretim bağlamı açar; iş bitince sayaçları geri yazar. */
export function kasabadaUret<T>(kasaba: Kasaba, ay: number, is: (b: UretimBaglami) => T): T {
  const b: UretimBaglami = { tur: kasaba.tur, ay, npc: kasaba.npc, ni: kasaba.ni, ne: kasaba.ne };
  const once = kasaba.npc.length;
  const sonuc = is(b);
  for (let i = once; i < kasaba.npc.length; i++) {
    const n = kasaba.npc[i];
    if (n) kasaba.dizin.set(n.i, n);
  }
  kasaba.ni = b.ni;
  kasaba.ne = b.ne;
  return sonuc;
}

/** Yeni doğan: babanın soyadı ve hanesi, yarı yarıya babanın mesleği. */
export function cocukDogur(kasaba: Kasaba, anne: Npc, baba: Npc, ay: number, r: Zar): Npc {
  return kasabadaUret(kasaba, ay, (b) => {
    const c = npcEkle(b, r, r() < 0.5 ? 1 : 0, 0, baba.s, anne.e);
    c.d = ay;
    c.an = anne.i;
    c.ba = baba.i;
    if (r() < 0.5) c.m = baba.m;
    return c;
  });
}
