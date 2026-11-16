// Masa doluluk kaydı (4.9 çoklu han, alt istek bütçesi): han listesi kartlarındaki masa özeti her masaya canlı
// sorulmaz; MasaDO oturan sayısı ya da açık/kapalı durumu değişince yerleşime MUTLAK değeri bildirir
// ({han, masa, oturan, acik, z}). Tekrar ve sıra bozulması zararsızdır: kayıttakinden eski `z` yok sayılır. Seçili hanın
// canlı okuması da kayda yazılır (bildirim kaybolduysa düzelir). Boş ve açık masa kaydı silinir: ölü kayıt birikmez.
// Saf fonksiyonlar; YerlesimDO depo anahtarı DOLULUK.

/** YerlesimDO depo anahtarı. */
export const DOLULUK = "hd";
/** [PARAMETRE] Kayıttaki en çok masa (9 han × 8 masa; aşarsa en eski düşer). */
export const DOLULUK_EN_COK = 72;

/** Bildirim: mutlak değer ve anı (ms). */
export interface DolulukBildirimi {
  han: number;
  masa: number;
  oturan: number;
  acik: boolean;
  z: number;
}

/** Kayıt: "han:masa" → [oturan, açık (1/0), z]. */
export type DolulukKaydi = Record<string, [oturan: number, acik: 0 | 1, z: number]>;

/** "masa:<y>:<tür><han?>:<no>" → yerleşim, han (son ek yoksa 1), masa no. */
export function masaAdiCoz(ad: string): { yerlesim: string; han: number; no: number } | undefined {
  const m = /^masa:([a-z0-9-]{1,40}):([a-zA-Z]+)([2-9]?):([1-9][0-9]?)$/.exec(ad);
  if (!m) return undefined;
  return { yerlesim: m[1]!, han: m[3] ? Number(m[3]) : 1, no: Number(m[4]) };
}

function bildirimCoz(ham: unknown): DolulukBildirimi | undefined {
  if (typeof ham !== "object" || ham === null) return undefined;
  const { han, masa, oturan, acik, z } = ham as Record<string, unknown>;
  const tam = (v: unknown, a: number, b: number) => Number.isInteger(v) && (v as number) >= a && (v as number) <= b;
  if (!tam(han, 1, 9) || !tam(masa, 1, 99) || !tam(oturan, 0, 99) || typeof acik !== "boolean" || typeof z !== "number" || !Number.isFinite(z)) return undefined;
  return { han: han as number, masa: masa as number, oturan: oturan as number, acik, z };
}

/** Bildirimleri uygular (yerinde). Değişti mi döner. Bozuk öğe yok sayılır. */
export function dolulukUygula(kayit: DolulukKaydi, hamlar: unknown): boolean {
  let degisti = false;
  for (const ham of Array.isArray(hamlar) ? hamlar.slice(0, DOLULUK_EN_COK) : []) {
    const b = bildirimCoz(ham);
    if (!b) continue;
    const a = `${b.han}:${b.masa}`;
    const eski = kayit[a];
    if (eski && eski[2] > b.z) continue;
    if (b.oturan === 0 && b.acik) {
      if (eski) {
        delete kayit[a];
        degisti = true;
      }
      continue;
    }
    if (!eski || eski[0] !== b.oturan || eski[1] !== (b.acik ? 1 : 0) || eski[2] !== b.z) {
      kayit[a] = [b.oturan, b.acik ? 1 : 0, b.z];
      degisti = true;
    }
  }
  const anahtarlar = Object.keys(kayit);
  if (anahtarlar.length > DOLULUK_EN_COK) {
    anahtarlar.sort((x, y) => kayit[x]![2] - kayit[y]![2]).slice(0, anahtarlar.length - DOLULUK_EN_COK).forEach((x) => delete kayit[x]);
    degisti = true;
  }
  return degisti;
}

/** Hanın masa özeti: masa sayısı, açık masa (kayıtta kapalı görünmeyen) ve oturan toplamı. */
export function hanMasaOzeti(kayit: DolulukKaydi | undefined, han: number, sayi: number): { sayi: number; acik: number; oturan: number } {
  let kapali = 0;
  let oturan = 0;
  for (let no = 1; no <= sayi; no++) {
    const x = kayit?.[`${han}:${no}`];
    if (!x) continue;
    oturan += x[0];
    if (x[1] === 0) kapali++;
  }
  return { sayi, acik: sayi - kapali, oturan };
}
