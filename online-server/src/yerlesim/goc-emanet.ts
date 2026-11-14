// Göç emanetini geri alma (D1 eki): göçte taşınamayan mallar eski yerleşimdeki arşiv karakterde (`gc.d = "kapandi"`)
// emanet durur. Oyuncu yeni yerleşimdeyken `POST /v1/goc/emanet` ile en çok GOC_TASIMA_EN_COK adedi küçük bir taşıma
// bedeliyle yeni karakterine çeker. Saf kurallar; HesapDO üç adımı göçteki gibi işlem kimliğiyle yürütür:
//   (1) eski yerleşim `emanetCikis`: arşivlerden mallar düşülür, eski yerleşimin toplum kaydında bekleyen kayıt
//       (`ec[islem]`: hangi arşivden ne alındı + paket) yazılır; aynı işlem aynı paketi döner.
//   (2) yeni yerleşim `emanetGiris`: taşıma bedeli dünyadan çıkar, mallar yeni karaktere eklenir (istek defteriyle bir kez).
//   (3) eski yerleşim `emanetTamam`: bekleyen kayıt silinir. (2) kalıcı reddedilirse `emanetIptal`: mallar arşive geri.
// Mal hiçbir anda iki envanterde değildir: (1)'den sonra yalnız pakette (bekleyen kayıt), (2)'den sonra yeni karakterde.

import { envanterBol, GOC_TASIMA_EN_COK, partiBol } from "./goc.ts";
import type { KaliteParti } from "./kalite.ts";
import type { Karakter } from "./tipler.ts";

/** [PARAMETRE] Emanet taşıma bedeli (akçe; sabit ve küçük, dünyadan çıkar). */
export const EMANET_BEDELI = 2;
/** [PARAMETRE] Bir yerleşimde hesap başına tutulan arşiv karakteri dizini uzunluğu. */
export const EMANET_ARSIV_EN_COK = 5;

/** Taşınan mallar ve izli partileri. */
export interface EmanetPaketi {
  v: 1;
  islem: string;
  hesap: string;
  kaynak: string;
  ev: Record<string, number>;
  kq?: Record<string, KaliteParti[]>;
}
/** Eski yerleşimde bekleyen kayıt: arşiv başına alınanlar (iptalde aynen geri yazılır) ve paket. */
export interface EmanetBekleyen {
  h: string;
  parca: { o: string; ev: Record<string, number>; kq?: Record<string, KaliteParti[]> }[];
  p: EmanetPaketi;
}

export function emanetIslemiMi(v: unknown): v is string {
  return typeof v === "string" && /^emanet:[A-Za-z0-9_-]{8,64}$/.test(v);
}

/** Arşivlerin toplam emaneti (adet). */
export function emanetToplami(arsivler: readonly Karakter[]): Record<string, number> {
  const t: Record<string, number> = {};
  for (const a of arsivler) for (const [m, n] of Object.entries(a.ev ?? {})) if (n > 0) t[m] = (t[m] ?? 0) + n;
  return t;
}

/** Önizleme: bu çekişte taşınacak ve arşivde kalacak (göçle aynı sıra: değerli mal önce). */
export function emanetDokumu(arsivler: readonly Karakter[]) {
  const toplam = emanetToplami(arsivler);
  const { tasinan, emanet } = envanterBol(toplam, GOC_TASIMA_EN_COK);
  const say = (r: Record<string, number>) => Object.values(r).reduce((a, x) => a + x, 0);
  return { emanet: toplam, tasinacak: tasinan, kalacak: emanet, tasinacakAdet: say(tasinan), kalacakAdet: say(emanet), sinir: GOC_TASIMA_EN_COK, bedel: EMANET_BEDELI };
}

function kqEkle(hedef: Karakter | { kq?: Record<string, KaliteParti[]> }, m: string, liste: readonly KaliteParti[]): void {
  if (liste.length === 0) return;
  const kq = (hedef.kq ??= {});
  kq[m] = [...liste, ...(kq[m] ?? [])].sort((a, b) => b[0] - a[0]);
}

/**
 * (1) Mallar arşivlerden düşülür (sırayla, önce ilk arşiv); bekleyen kayıt döner. Toplam düşülen = paket.ev.
 * Arşivde hiç emanet yoksa undefined.
 */
export function emanetCikar(arsivler: readonly Karakter[], hesap: string, kaynak: string, islem: string): EmanetBekleyen | undefined {
  const { tasinan } = envanterBol(emanetToplami(arsivler), GOC_TASIMA_EN_COK);
  if (Object.keys(tasinan).length === 0) return undefined;
  const kalan = { ...tasinan };
  const parca: EmanetBekleyen["parca"] = [];
  const paket: EmanetPaketi = { v: 1, islem, hesap, kaynak, ev: { ...tasinan } };
  for (const a of arsivler) {
    const p: EmanetBekleyen["parca"][number] = { o: a.o, ev: {} };
    for (const m of Object.keys(kalan)) {
      const var_ = a.ev?.[m] ?? 0;
      const al = Math.min(var_, kalan[m]!);
      if (al <= 0) continue;
      p.ev[m] = al;
      kalan[m]! -= al;
      if (kalan[m] === 0) delete kalan[m];
      a.ev![m] = var_ - al;
      if (a.ev![m] === 0) delete a.ev![m];
      const liste = a.kq?.[m];
      if (liste) {
        const [alinan, kalanParti] = partiBol(liste, al);
        if (kalanParti.length) a.kq![m] = kalanParti;
        else delete a.kq![m];
        if (alinan.length) {
          (p.kq ??= {})[m] = alinan;
          kqEkle(paket, m, alinan);
        }
      }
    }
    if (a.ev && Object.keys(a.ev).length === 0) delete a.ev;
    if (a.kq && Object.keys(a.kq).length === 0) delete a.kq;
    if (Object.keys(p.ev).length) parca.push(p);
  }
  return { h: hesap, parca, p: paket };
}

/** İptal: bekleyen kayıttaki parçalar kendi arşivlerine aynen geri yazılır. */
export function emanetGeriYaz(arsivler: ReadonlyMap<string, Karakter>, b: EmanetBekleyen): void {
  for (const p of b.parca) {
    const a = arsivler.get(p.o);
    if (!a) continue;
    const ev = (a.ev ??= {});
    for (const [m, n] of Object.entries(p.ev)) ev[m] = (ev[m] ?? 0) + n;
    for (const [m, liste] of Object.entries(p.kq ?? {})) kqEkle(a, m, liste);
  }
}

/** Paket biçimi (iç ileti; alan alan denetlenir). */
export function emanetPaketiGecerli(p: unknown, hesap: string, islem: string): p is EmanetPaketi {
  if (typeof p !== "object" || p === null) return false;
  const x = p as Partial<EmanetPaketi>;
  if (x.v !== 1 || x.islem !== islem || x.hesap !== hesap || typeof x.kaynak !== "string") return false;
  if (typeof x.ev !== "object" || x.ev === null) return false;
  const adet = Object.values(x.ev);
  return adet.length > 0 && adet.every((n) => Number.isInteger(n) && n > 0) && adet.reduce((a, n) => a + n, 0) <= GOC_TASIMA_EN_COK;
}

/** (2) Yeni karaktere ekler (bedel çağıranda düşülür). */
export function emanetEkle(kar: Karakter, p: EmanetPaketi): void {
  const ev = (kar.ev ??= {});
  for (const [m, n] of Object.entries(p.ev)) ev[m] = (ev[m] ?? 0) + n;
  for (const [m, liste] of Object.entries(p.kq ?? {})) kqEkle(kar, m, liste);
}
