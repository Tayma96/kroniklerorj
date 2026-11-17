// Oyuncu numarası (DunyaDO tarafı): hesaba bağlı, kalıcı, 8 haneli, rastgele ve benzersiz. Karakter ölse ya da vâris
// geçse de değişmez (anahtar hesap kimliğidir, karakter değil). İç kimlikten türetilmez: güvenli rastgele baytlardan
// yansız seçilir, çakışmada yeniden denenir. Tembel üretilir (ilk giriş, profil, kendi numaran) ve tekrar güvenlidir.
//
// Ad araması için ayrı bir dizin tutulur: `ara:<ad anahtarı>\0<numara>` → {h, ad}. Ad değişirse (vâris) dizin
// tazelenir (eski anahtar silinir). Yanıtlar HesapDO'ya gider; hesap kimliği istemciye hiçbir zaman dönmez.

import { adAnahtari } from "../ad.ts";
import type { Depo } from "../depo.ts";
import { BEYLIKLER, yerlesimBul } from "../dunya-veri.ts";
import { basarili, hata, type Profil, type Sonuc } from "../tipler.ts";

/** [PARAMETRE] Numara aralığı: başında 0 olmayan 8 hane. */
export const NUMARA_EN_AZ = 10_000_000;
export const NUMARA_EN_COK = 99_999_999;
/** [PARAMETRE] Çakışmada en çok bu kadar yeni numara denenir (90 milyonluk alanda pratikte bir kez yeter). */
export const NUMARA_DENEME = 8;
/** [PARAMETRE] Ad araması sayfa boyu (HesapDO istemciye en çok bu kadar döndürür). */
export const ARAMA_SAYFA = 10;

const NUMARA_DESENI = /^[1-9][0-9]{7}$/;

// Depo anahtarları (DunyaDO)
const NO = "no:"; // + numara → hesapId
const NK = "nk:"; // + hesapId → NumaraKaydi
export const ARA = "ara:"; // + ad anahtarı + "\0" + numara → AramaDegeri
const KAYIT = "kayit:"; // mantik.ts ile aynı: + hesapId → Profil
const AYRAC = "\u0000";

export type Rastgele = (bayt: number) => Uint8Array;
/** Önek altındaki anahtarları sıralı verir (`sonra` hariç başlar). DunyaDO'da DO depolamasının `list`i. */
export type Listeleyici = <T>(onek: string, sinir: number, sonra?: string) => Promise<Map<string, T>>;

interface NumaraKaydi {
  n: number;
  /** Dizindeki ad anahtarı ve görünen ad (profil yoksa ya da henüz dizine girmediyse yok). */
  a?: string;
  ad?: string;
}

interface AramaDegeri {
  h: string;
  ad: string;
}

/** HesapDO'ya dönen iç sonuç (hesap kimliği içerir; istemciye geçmez). */
export interface NumaraSonucu {
  hesapId: string;
  numara: number;
  ad: string;
  yerlesim: string;
  beylik: string;
}

/** Biçim denetimi: 8 hane, başında 0 yok. Boşluk ve tire atılır (paylaşılan numara "1234 5678" yazılabilir). */
export function numaraCoz(ham: unknown): number | undefined {
  if (typeof ham !== "string" && typeof ham !== "number") return undefined;
  const metin = String(ham).replace(/[\s-]/g, "");
  return metin.length === 8 && NUMARA_DESENI.test(metin) ? Number(metin) : undefined;
}

/** Yansız seçim: 4 bayt (uint32), 47 × 90 milyon ve üstü atılır. Tükenirse undefined. */
export function numaraUret(rastgele: Rastgele): number | undefined {
  const alan = NUMARA_EN_COK - NUMARA_EN_AZ + 1;
  const sinir = Math.floor(2 ** 32 / alan) * alan;
  for (let i = 0; i < 16; i++) {
    const b = rastgele(4);
    const u = ((b[0]! << 24) | (b[1]! << 16) | (b[2]! << 8) | b[3]!) >>> 0;
    if (u < sinir) return NUMARA_EN_AZ + (u % alan);
  }
  return undefined;
}

function araAnahtari(anahtar: string, numara: number): string {
  return `${ARA}${anahtar}${AYRAC}${numara}`;
}

/** Kaydı profilin adıyla dizine sokar ya da adı değiştiyse dizini tazeler. Yazılacakları döndürür. */
function dizinYazimi(hesapId: string, kayit: NumaraKaydi, ad: string | undefined): { kayit: NumaraKaydi; koy: Record<string, unknown>; sil: string[] } {
  if (ad === undefined) return { kayit, koy: {}, sil: [] };
  const anahtar = adAnahtari(ad);
  if (!anahtar || (kayit.a === anahtar && kayit.ad === ad)) return { kayit, koy: {}, sil: [] };
  const sil = kayit.a !== undefined && kayit.a !== anahtar ? [araAnahtari(kayit.a, kayit.n)] : [];
  const yeni: NumaraKaydi = { n: kayit.n, a: anahtar, ad };
  const deger: AramaDegeri = { h: hesapId, ad };
  return { kayit: yeni, koy: { [NK + hesapId]: yeni, [araAnahtari(anahtar, kayit.n)]: deger }, sil };
}

/**
 * Hesabın numarası; yoksa üretir. Tekrar güvenli: aynı hesap her zaman aynı numarayı alır. Profil varsa ve dizinde
 * değilse (profil numaradan sonra kurulduysa) ad dizinine de girer.
 */
export async function numaraAl(depo: Depo, hesapId: string, rastgele: Rastgele): Promise<Sonuc<{ numara: number }>> {
  if (typeof hesapId !== "string" || hesapId.length === 0 || hesapId.length > 128) return hata("gecersiz_istek");
  const profil = await depo.al<Profil>(KAYIT + hesapId);
  const mevcut = await depo.al<NumaraKaydi>(NK + hesapId);
  if (mevcut) {
    if (profil && mevcut.a === undefined) {
      const d = dizinYazimi(hesapId, mevcut, profil.ad);
      if (Object.keys(d.koy).length) await depo.koy(d.koy);
    }
    return basarili({ numara: mevcut.n });
  }
  for (let deneme = 0; deneme < NUMARA_DENEME; deneme++) {
    const n = numaraUret(rastgele);
    if (n === undefined) break;
    if ((await depo.al<string>(NO + n)) !== undefined) continue;
    const d = dizinYazimi(hesapId, { n }, profil?.ad);
    await depo.koy({ [NO + n]: hesapId, [NK + hesapId]: d.kayit, ...d.koy });
    return basarili({ numara: n });
  }
  return hata("sunucu_hatasi");
}

/** Görünen adı güncel karakterin adıyla tazeler (vâris geçince). Numara yoksa dokunmaz. */
export async function numaraAdTazele(depo: Depo, hesapId: string, ad: unknown): Promise<Sonuc<{ tazelendi: boolean }>> {
  if (typeof hesapId !== "string" || typeof ad !== "string" || ad.length === 0 || ad.length > 64) return hata("gecersiz_istek");
  const kayit = await depo.al<NumaraKaydi>(NK + hesapId);
  if (!kayit) return basarili({ tazelendi: false });
  const d = dizinYazimi(hesapId, kayit, ad);
  if (!Object.keys(d.koy).length) return basarili({ tazelendi: false });
  if (d.sil.length) await depo.sil(d.sil);
  await depo.koy(d.koy);
  return basarili({ tazelendi: true });
}

function sonucKur(hesapId: string, numara: number, ad: string, profil: Profil | undefined): NumaraSonucu | undefined {
  if (!profil) return undefined;
  const y = yerlesimBul(profil.yerlesim);
  return { hesapId, numara, ad, yerlesim: profil.yerlesim, beylik: y?.beylik ?? profil.beylik };
}

/** Tam numarayla tek kayıt (profili olmayan hesap bulunmaz). */
export async function numaraBul(depo: Depo, ham: unknown): Promise<Sonuc<NumaraSonucu>> {
  const n = numaraCoz(ham);
  if (n === undefined) return hata("numara_gecersiz");
  const hesapId = await depo.al<string>(NO + n);
  if (hesapId === undefined) return hata("kisi_yok");
  const [kayit, profil] = await Promise.all([depo.al<NumaraKaydi>(NK + hesapId), depo.al<Profil>(KAYIT + hesapId)]);
  const s = sonucKur(hesapId, n, kayit?.ad ?? profil?.ad ?? "", profil);
  return s ? basarili(s) : hata("kisi_yok");
}

/** Arama imleci: son anahtarın ad + numara kısmı (iç kimlik içermez), base64url. */
function imlecYaz(anahtar: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(anahtar.slice(ARA.length)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function imlecOku(ham: unknown): string | undefined {
  if (typeof ham !== "string" || ham.length === 0 || ham.length > 200 || !/^[A-Za-z0-9_-]+$/.test(ham)) return undefined;
  try {
    const ikili = atob(ham.replace(/-/g, "+").replace(/_/g, "/"));
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(ikili, (c) => c.charCodeAt(0)));
  } catch {
    return undefined;
  }
}

/**
 * Ad önek araması (Türkçe büyük/küçük harf duyarsız, sıralı, sayfalı). `sinir` kadar sonuç ve devam imleci döner.
 * Önek denetimi (en az karakter) HesapDO'dadır; burada yalnız biçim ve üst sınır.
 */
export async function adAra(
  depo: Depo,
  liste: Listeleyici,
  onekHam: unknown,
  imlecHam: unknown,
  sinirHam: unknown = ARAMA_SAYFA,
): Promise<Sonuc<{ sonuclar: NumaraSonucu[]; imlec: string | null }>> {
  if (typeof onekHam !== "string" || onekHam.length > 64) return hata("gecersiz_istek");
  const onek = adAnahtari(onekHam);
  if (!onek || onek.includes(AYRAC)) return hata("gecersiz_istek");
  const sinir = typeof sinirHam === "number" && Number.isInteger(sinirHam) ? Math.min(Math.max(sinirHam, 1), ARAMA_SAYFA) : ARAMA_SAYFA;
  let sonra: string | undefined;
  if (imlecHam !== undefined && imlecHam !== null && imlecHam !== "") {
    const i = imlecOku(imlecHam);
    if (i === undefined || !i.startsWith(onek)) return hata("gecersiz_istek");
    sonra = ARA + i;
  }
  const bulunan = await liste<AramaDegeri>(ARA + onek, sinir + 1, sonra);
  const anahtarlar = [...bulunan.keys()].sort();
  const sayfa = anahtarlar.slice(0, sinir);
  const profiller = await depo.alCok<Profil>(sayfa.map((a) => KAYIT + bulunan.get(a)!.h));
  const sonuclar: NumaraSonucu[] = [];
  for (const a of sayfa) {
    const d = bulunan.get(a)!;
    const n = Number(a.slice(a.lastIndexOf(AYRAC) + 1));
    const s = sonucKur(d.h, n, d.ad, profiller.get(KAYIT + d.h));
    if (s) sonuclar.push(s);
  }
  const son = sayfa[sayfa.length - 1];
  return basarili({ sonuclar, imlec: anahtarlar.length > sinir && son ? imlecYaz(son) : null });
}

/** Beylik adı (sonuç kartı için). */
export function beylikAdi(id: string): string {
  return BEYLIKLER.find((b) => b.id === id)?.ad ?? id;
}
