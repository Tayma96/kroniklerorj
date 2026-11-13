// Darbe sonucu mülk kaybı ve ganimet tavanı (Ek B §8.2 Aşama 3, §11 "kayıp tavanı"; ana belge §10, N-5).
// Saf hesap: girdi oyuncu varlığının anlık görüntüsüdür, çıktı istemciye aynen dönebilen dökümdür.
// Değişmezler: kaybeden başına tavan; barınak ve aile evi asla alınmaz; dağıtılan = kaybedilen
// (yoktan akçe doğmaz, akçe yakılmaz); aynı oyuncu aynı darbede ya da soğuma penceresinde ikinci kez kesilmez.

import { DARBE } from "./sabitler.ts";
import type { DarbePlani } from "./tipler.ts";

/** [PARAMETRE] Kaybeden taraftaki tek oyuncunun likit akçesinden alınabilecek en çok yüzde. */
export const GANIMET_AKCE_YUZDE = 25;
/** [PARAMETRE] Kaybeden taraftaki tek oyuncudan bir darbede alınabilecek en çok mülk. */
export const GANIMET_MULK_EN_COK = 1;
/** [PARAMETRE] Aynı oyuncunun yeniden kesilemeyeceği kayan pencere (ay); mevcut darbe soğumasıyla aynıdır. */
export const GANIMET_PENCERE_AY = DARBE.sogumaAy;

export interface GanimetMulku {
  id: string;
  /** Sıralama için değer (edinim bedeli); en düşük değerli uygun mülk seçilir. */
  deger: number;
  /** Oyuncunun oturduğu ev ya da tek barınağı: asla alınmaz. */
  barinak?: boolean;
  /** Aile evi (ocak): asla alınmaz. */
  aileEvi?: boolean;
}

export interface GanimetKaybeden {
  kisi: string;
  hesap: string;
  /** Likit akçe (karakter parası). */
  akce: number;
  mulkler: GanimetMulku[];
  /** Bu oyuncunun son darbe kaybı izi (yoksa hiç kesilmedi). */
  oncekiKayip?: { darbeId: string; ay: number };
}

export interface GanimetKazanan {
  kisi: string;
  hesap: string;
  /** Alabileceği mülk sayısı (kişi başı mülk sınırından kalan yer). */
  mulkYeri: number;
}

export interface GanimetGirdisi {
  darbeId: string;
  ay: number;
  kaybedenler: GanimetKaybeden[];
  kazananlar: GanimetKazanan[];
}

export type GanimetNedeni = "uygulandi" | "tekrar" | "pencere" | "kazananYok";

export interface GanimetKalemi {
  kisi: string;
  hesap: string;
  /** Yerleşim yazısının tekrar güvenliği anahtarı (darbe + kişi; aynı kalem iki kez işlenmez). */
  istekNo: string;
  neden: GanimetNedeni;
  akceOnce: number;
  akceKaybi: number;
  /** En çok bu kadar kesilebilirdi (tavan dökümü). */
  akceTavani: number;
  /** Alınan mülk ve kime gittiği; yoksa null. */
  mulk: { id: string; alan: string } | null;
  /** Barınak/aile evi olduğu için korunan mülkler. */
  korunan: string[];
}

export interface GanimetPayi {
  kisi: string;
  hesap: string;
  istekNo: string;
  akce: number;
  mulkler: string[];
}

export interface GanimetDokumu {
  darbeId: string;
  ay: number;
  kayip: GanimetKalemi[];
  pay: GanimetPayi[];
  toplamKayip: number;
  toplamPay: number;
  tavan: { akceYuzde: number; mulkEnCok: number; pencereAy: number };
}

export function ganimetIstekNo(darbeId: string, yon: "kayip" | "pay", kisi: string): string {
  return `darbe:${darbeId}:${yon}:${kisi}`;
}

const sirala = <T extends { kisi: string }>(xs: T[]) => [...xs].sort((a, b) => (a.kisi < b.kisi ? -1 : a.kisi > b.kisi ? 1 : 0));

function tekil<T extends { kisi: string }>(xs: T[]): T[] {
  const gorulen = new Set<string>();
  return xs.filter((x) => (gorulen.has(x.kisi) ? false : (gorulen.add(x.kisi), true)));
}

/** Sonuca göre taraflar. Yalnız açıkça taraf tutanlar kaybeder; sessizlik teslimiyet sayılmaz. */
export function darbeTaraflari(p: DarbePlani): { kaybeden: { kisi: string; hesap: string }[]; kazanan: { kisi: string; hesap: string }[] } {
  const saldiranlar = [{ kisi: p.baslatanKisi, hesap: p.baslatanHesap }, ...p.destekler.map((x) => ({ kisi: x.kisi, hesap: x.hesap }))];
  const savunanlar = (p.savunma ?? []).map((x) => ({ kisi: x.kisi, hesap: x.hesap }));
  if (p.durum === "basarili") return { kaybeden: savunanlar, kazanan: saldiranlar };
  if (p.durum === "bastirildi") return { kaybeden: saldiranlar, kazanan: savunanlar };
  return { kaybeden: [], kazanan: [] };
}

export function ganimetHesapla(g: GanimetGirdisi): GanimetDokumu {
  const kazananHesap = new Set(g.kazananlar.map((x) => x.hesap));
  const kazananlar = sirala(tekil(g.kazananlar));
  // Aynı hesap iki tarafta olamaz (kendine ganimet aktarımı yok).
  const kaybedenler = sirala(tekil(g.kaybedenler)).filter((x) => !kazananHesap.has(x.hesap));
  const yer = new Map(kazananlar.map((x) => [x.kisi, Math.max(0, Math.floor(x.mulkYeri))]));
  const alinanMulk = new Map<string, string[]>(kazananlar.map((x) => [x.kisi, []]));

  const kayip: GanimetKalemi[] = kaybedenler.map((k) => {
    const akceOnce = Math.max(0, Math.floor(Number.isFinite(k.akce) ? k.akce : 0));
    const akceTavani = Math.floor((akceOnce * GANIMET_AKCE_YUZDE) / 100);
    const korunan = k.mulkler.filter((m) => m.barinak || m.aileEvi).map((m) => m.id).sort();
    const temel = { kisi: k.kisi, hesap: k.hesap, istekNo: ganimetIstekNo(g.darbeId, "kayip", k.kisi), akceOnce, akceTavani, korunan };
    let neden: GanimetNedeni = "uygulandi";
    if (k.oncekiKayip?.darbeId === g.darbeId) neden = "tekrar";
    else if (k.oncekiKayip && g.ay < k.oncekiKayip.ay + GANIMET_PENCERE_AY) neden = "pencere";
    else if (kazananlar.length === 0) neden = "kazananYok";
    if (neden !== "uygulandi") return { ...temel, neden, akceKaybi: 0, mulk: null };

    let mulk: GanimetKalemi["mulk"] = null;
    if (GANIMET_MULK_EN_COK > 0) {
      const uygun = k.mulkler
        .filter((m) => !m.barinak && !m.aileEvi)
        .sort((a, b) => a.deger - b.deger || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      // En çok yeri olan kazanan alır (eşitlikte sıralı ilk); kimsenin yeri yoksa mülk alınmaz.
      let alan: string | null = null;
      for (const z of kazananlar) if ((yer.get(z.kisi) ?? 0) > 0 && (alan === null || (yer.get(z.kisi) ?? 0) > (yer.get(alan) ?? 0))) alan = z.kisi;
      if (uygun.length > 0 && alan !== null) {
        const secilen = uygun[0]!;
        mulk = { id: secilen.id, alan };
        yer.set(alan, (yer.get(alan) ?? 0) - 1);
        alinanMulk.get(alan)!.push(secilen.id);
      }
    }
    return { ...temel, neden, akceKaybi: akceTavani, mulk };
  });

  const toplamKayip = kayip.reduce((t, x) => t + x.akceKaybi, 0);
  const n = kazananlar.length;
  const pay: GanimetPayi[] = kazananlar.map((z, i) => ({
    kisi: z.kisi,
    hesap: z.hesap,
    istekNo: ganimetIstekNo(g.darbeId, "pay", z.kisi),
    akce: n === 0 ? 0 : Math.floor(toplamKayip / n) + (i < toplamKayip % n ? 1 : 0),
    mulkler: alinanMulk.get(z.kisi) ?? [],
  }));
  const toplamPay = pay.reduce((t, x) => t + x.akce, 0);
  return {
    darbeId: g.darbeId,
    ay: g.ay,
    kayip,
    pay,
    toplamKayip,
    toplamPay,
    tavan: { akceYuzde: GANIMET_AKCE_YUZDE, mulkEnCok: GANIMET_MULK_EN_COK, pencereAy: GANIMET_PENCERE_AY },
  };
}

/** Uygulanan kalemlerden yeni kayıp izi (oyuncu → son darbe kaybı); sonraki hesabın `oncekiKayip` girdisi. */
export function ganimetIzleri(dokum: GanimetDokumu): Record<string, { darbeId: string; ay: number }> {
  const iz: Record<string, { darbeId: string; ay: number }> = {};
  for (const x of dokum.kayip) if (x.neden === "uygulandi") iz[x.kisi] = { darbeId: dokum.darbeId, ay: dokum.ay };
  return iz;
}
