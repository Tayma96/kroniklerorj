// Künye (HesapDO tarafı): kendi numaran, oyuncu araması (tam numara ya da ad öneki) ve oyuncu sayfası.
// Kötüye kullanım koruması: aramaya özel dakikalık kova (HesapDO belleğinde), günlük toplam sorgu tavanı ve
// numara taramasına karşı günlük ıska tavanı (depoda, gün değişince sıfırlanır), adda en az karakter.
// Engel (src/yerlesim/engel.ts, iki yönlü): engellediğin ya da seni engelleyen oyuncu aramada çıkmaz, sayfası
// "kisi_yok" döner (engelin varlığı sızmaz). Engel yerleşim içidir; yalnız aynı yerleşimdeki sonuçlar için sorulur.
// Hesap kimliği istemciye hiçbir yanıtta dönmez.

import { adDuzenle } from "../ad.ts";
import type { Depo } from "../depo.ts";
import { PROFIL_ANAHTARI } from "../mantik.ts";
import { basarili, hata, type DunyaIleti, type Profil, type Sonuc, type YerlesimIleti } from "../tipler.ts";
import { KUNYE_ALANLARI, type KunyeGorunumu } from "./gorunum.ts";
import { beylikAdi, numaraCoz, type NumaraSonucu } from "./numara.ts";
import { yerlesimBul } from "../dunya-veri.ts";

/** [PARAMETRE] Arama ve sayfa uçlarının hesap başına dakikalık kovası (genel hız sınırından ayrı, daha dar). */
export const ARAMA_DAKIKA_SINIRI = 10;
/** [PARAMETRE] Hesap başına günlük arama + sayfa sorgusu tavanı. */
export const ARAMA_GUNLUK_SINIRI = 200;
/** [PARAMETRE] Numara taramasına karşı: hesap başına günde en çok bu kadar boşa düşen (bulunmayan) numara sorgusu. */
export const NUMARA_ISKA_GUNLUK = 20;
/** [PARAMETRE] Ad aramasında önekin en az karakter sayısı. */
export const AD_ARAMA_EN_AZ = 3;

const GUN_MS = 24 * 60 * 60_000;
/** HesapDO depo anahtarları. */
export const NUMARA_ANAHTARI = "numara";
const ARAMA_IZ = "aramaIz";

/** Arama sonucu kartında dönen alanlar (izin listesi). */
export const SONUC_ALANLARI = ["ad", "beylik", "numara", "yerlesim"] as const;
/** Oyuncu sayfasında dönen alanlar (izin listesi): yerleşimin künyesi + numara, ben, ayniYerlesim. */
export const SAYFA_ALANLARI = [...KUNYE_ALANLARI, "ayniYerlesim", "ben", "numara"].sort();

export interface KunyeBaglami {
  depo: Depo;
  hesapId: string;
  simdi: number;
  dunya: (i: DunyaIleti) => Promise<Sonuc<unknown>>;
  yerlesim: (i: YerlesimIleti) => Promise<Sonuc<unknown>>;
}

export interface AramaIzi {
  /** UTC gün sayacı, sorgu sayısı, ıska (bulunmayan numara) sayısı. */
  g: number;
  s: number;
  i: number;
}

export interface AramaSonucu {
  numara: number;
  ad: string;
  yerlesim: { id: string; ad: string };
  beylik: { id: string; ad: string };
}

/** Bugünün izi (gün değiştiyse sıfır). Saf. */
export function aramaIzi(iz: AramaIzi | undefined, simdi: number): AramaIzi {
  const g = Math.floor(simdi / GUN_MS);
  return iz && iz.g === g ? { ...iz } : { g, s: 0, i: 0 };
}

/** Sorgu izni: günlük tavan; numara sorgusunda ayrıca ıska tavanı. Saf. */
export function aramaIzni(iz: AramaIzi, numara: boolean): boolean {
  if (iz.s >= ARAMA_GUNLUK_SINIRI) return false;
  return !numara || iz.i < NUMARA_ISKA_GUNLUK;
}

/** Kendi numaran (tembel: yoksa dünyadan alınır ve hesapta önbelleklenir). Tekrar güvenli. */
export async function benimNumaram(b: Pick<KunyeBaglami, "depo" | "hesapId" | "dunya">): Promise<Sonuc<{ numara: number }>> {
  const onbellek = await b.depo.al<number>(NUMARA_ANAHTARI);
  if (typeof onbellek === "number") return basarili({ numara: onbellek });
  const r = await b.dunya({ islem: "numaraAl", hesapId: b.hesapId });
  if (!r.ok) return r;
  const numara = (r.deger as { numara: number }).numara;
  await b.depo.koy({ [NUMARA_ANAHTARI]: numara });
  return basarili({ numara });
}

function kart(s: NumaraSonucu): AramaSonucu {
  return { numara: s.numara, ad: s.ad, yerlesim: { id: s.yerlesim, ad: yerlesimBul(s.yerlesim)?.ad ?? s.yerlesim }, beylik: { id: s.beylik, ad: beylikAdi(s.beylik) } };
}

/** Oyuncunun yerleşimindeki iki yönlü engel listesi (hesap kimlikleri). Erişilemezse boş. */
async function engelliler(b: KunyeBaglami, profil: Profil): Promise<Set<string>> {
  const r = await b.yerlesim({ islem: "engeller", yerlesim: profil.yerlesim, hesapId: b.hesapId });
  return new Set(r.ok ? ((r.deger as { engeller?: string[] }).engeller ?? []) : []);
}

async function hazirlik(b: KunyeBaglami, numara: boolean): Promise<Sonuc<{ profil: Profil; iz: AramaIzi }>> {
  const profil = await b.depo.al<Profil>(PROFIL_ANAHTARI);
  if (!profil) return hata("profil_yok");
  const iz = aramaIzi(await b.depo.al<AramaIzi>(ARAMA_IZ), b.simdi);
  if (!aramaIzni(iz, numara)) return hata("arama_siniri");
  return basarili({ profil, iz });
}

/**
 * GET /v1/oyuncu-ara?no= | ?ad=&imlec=: tam numarayla tek sonuç, adla önek araması (sayfalı). Bulunmayan numara
 * boş liste döner ve ıska sayılır. Engelli oyuncular süzülür.
 */
export async function oyuncuAra(b: KunyeBaglami, sorgu: { no?: string | null; ad?: string | null; imlec?: string | null }): Promise<Sonuc<{ sonuclar: AramaSonucu[]; imlec: string | null }>> {
  const numaraIle = sorgu.no !== undefined && sorgu.no !== null && sorgu.no !== "";
  if (!numaraIle) {
    if (typeof sorgu.ad !== "string") return hata("gecersiz_istek");
    if ([...adDuzenle(sorgu.ad)].length < AD_ARAMA_EN_AZ) return hata("arama_kisa");
  } else if (numaraCoz(sorgu.no) === undefined) return hata("numara_gecersiz");
  const h = await hazirlik(b, numaraIle);
  if (!h.ok) return h;
  const { profil, iz } = h.deger;
  iz.s++;
  let bulunan: NumaraSonucu[];
  let imlec: string | null = null;
  if (numaraIle) {
    const r = await b.dunya({ islem: "numaraBul", numara: String(sorgu.no) });
    if (!r.ok && r.hata !== "kisi_yok") return r;
    if (!r.ok) iz.i++;
    bulunan = r.ok ? [r.deger as NumaraSonucu] : [];
  } else {
    const r = await b.dunya({ islem: "adAra", onek: sorgu.ad!, imlec: sorgu.imlec ?? null });
    if (!r.ok) return r;
    const d = r.deger as { sonuclar: NumaraSonucu[]; imlec: string | null };
    bulunan = d.sonuclar;
    imlec = d.imlec;
  }
  await b.depo.koy({ [ARAMA_IZ]: iz });
  const engel = bulunan.some((x) => x.yerlesim === profil.yerlesim && x.hesapId !== b.hesapId) ? await engelliler(b, profil) : new Set<string>();
  return basarili({ sonuclar: bulunan.filter((x) => !engel.has(x.hesapId)).map(kart), imlec });
}

/**
 * GET /v1/kunye/:numara?dil=: oyuncu sayfası. Yalnız herkese açık alanlar (SAYFA_ALANLARI ile birebir). Görünen ad
 * dünya dizininden eskiyse (vâris) dizin tazelenir.
 */
export async function oyuncuSayfasi(b: KunyeBaglami, numaraHam: unknown, dil: string | null | undefined): Promise<Sonuc<Record<string, unknown>>> {
  const numara = numaraCoz(numaraHam);
  if (numara === undefined) return hata("numara_gecersiz");
  const h = await hazirlik(b, true);
  if (!h.ok) return h;
  const { profil, iz } = h.deger;
  iz.s++;
  const r = await b.dunya({ islem: "numaraBul", numara: String(numara) });
  if (!r.ok) {
    if (r.hata === "kisi_yok") iz.i++;
    await b.depo.koy({ [ARAMA_IZ]: iz });
    return r;
  }
  await b.depo.koy({ [ARAMA_IZ]: iz });
  const hedef = r.deger as NumaraSonucu;
  const ben = hedef.hesapId === b.hesapId;
  const ayniYerlesim = hedef.yerlesim === profil.yerlesim;
  if (!ben && ayniYerlesim && (await engelliler(b, profil)).has(hedef.hesapId)) return hata("kisi_yok");
  const g = await b.yerlesim({ islem: "kunye", yerlesim: hedef.yerlesim, hesapId: hedef.hesapId, dil: dil ?? null });
  if (!g.ok) return g.hata === "sakin_yok" ? hata("kisi_yok") : g;
  const gorunum = g.deger as KunyeGorunumu;
  if (gorunum.ad !== hedef.ad) {
    try {
      await b.dunya({ islem: "numaraAdTazele", hesapId: hedef.hesapId, ad: gorunum.ad });
    } catch {
      // en iyi çaba: dizin bir sonraki görüntülemede tazelenir
    }
  }
  const sayfa: Record<string, unknown> = { numara, ben, ayniYerlesim };
  for (const a of KUNYE_ALANLARI) sayfa[a] = gorunum[a];
  return basarili(sayfa);
}

/** Kendi görünen adını dünya dizininde tazeler (vâris sonrası; en iyi çaba). */
export async function adiTazele(b: KunyeBaglami): Promise<void> {
  const profil = await b.depo.al<Profil>(PROFIL_ANAHTARI);
  if (!profil) return;
  const g = await b.yerlesim({ islem: "kunye", yerlesim: profil.yerlesim, hesapId: b.hesapId, dil: null });
  if (g.ok) await b.dunya({ islem: "numaraAdTazele", hesapId: b.hesapId, ad: (g.deger as KunyeGorunumu).ad });
}
