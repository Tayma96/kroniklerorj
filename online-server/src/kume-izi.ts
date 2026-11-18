// Hesap kümesi izi (ekonomi denetimi B3): girişte görülen IP ve (test girişinde) cihaz kimliği sunucu sırrıyla
// tuzlanmış HMAC özetine çevrilir; ham IP ya da cihaz kimliği hiçbir yerde saklanmaz. HesapDO son KUME_IZ_EN_COK
// özeti tutar ve yerleşimdeki karaktere/sakine yazdırır (`kumeIzi` iletisi); `ayniKume` (teveccuh.ts) ve siyasetin
// `kumeAnahtarlari` (makam.ts) ortak özet taşıyan hesapları aynı küme sayar (alt hesap ayrı ocakta olsa da).

import { basarili, hata, type Sonuc, type YerlesimIleti } from "./tipler.ts";
import type { Depo } from "./depo.ts";
import { PROFIL_ANAHTARI } from "./mantik.ts";
import type { Profil } from "./tipler.ts";

/** [PARAMETRE] Hesap başına tutulan en çok iz özeti (en yenisi sonda). */
export const KUME_IZ_EN_COK = 3;
/** [PARAMETRE] Özet uzunluğu (base64url karakter; 16 ≈ 96 bit). */
export const KUME_IZ_UZUNLUK = 16;
/** HesapDO depo anahtarı: { iz: özetler, y: son yazdırıldığı "yerleşim|özetler" }. */
export const KUME_IZI = "kumeIzi";

export interface KumeIziKaydi {
  iz: string[];
  y?: string;
}

const IZ_DESENI = new RegExp(`^[A-Za-z0-9_-]{${KUME_IZ_UZUNLUK}}$`);

function b64url(b: Uint8Array): string {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Tuzlu özet: HMAC-SHA256(sır, "kume:<tür>:<değer>") ilk KUME_IZ_UZUNLUK base64url karakteri. */
export async function izOzeti(gizli: string, tur: "ip" | "cihaz", deger: string): Promise<string> {
  const k = new TextEncoder();
  const anahtar = await crypto.subtle.importKey("raw", k.encode(gizli), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const imza = new Uint8Array(await crypto.subtle.sign("HMAC", anahtar, k.encode(`kume:${tur}:${deger}`)));
  return b64url(imza).slice(0, KUME_IZ_UZUNLUK);
}

/** Girişin iz özetleri (IP başlığı yoksa ya da cihaz kimliği yoksa o parça atlanır). */
export async function girisIzleri(gizli: string, ip: string | null | undefined, cihaz?: string): Promise<string[]> {
  const l: string[] = [];
  if (cihaz) l.push(await izOzeti(gizli, "cihaz", cihaz));
  if (ip) l.push(await izOzeti(gizli, "ip", ip));
  return l;
}

/** İletiden gelen iz listesini doğrular (yalnız biçimli özetler, en çok KUME_IZ_EN_COK). */
export function kumeIziCoz(ham: unknown): string[] | undefined {
  if (!Array.isArray(ham)) return undefined;
  const l = ham.filter((x): x is string => typeof x === "string" && IZ_DESENI.test(x));
  return l.length === ham.length && l.length <= KUME_IZ_EN_COK ? l : undefined;
}

/** Eski izlerle birleştirir: tekrarsız, en yenisi sonda, en çok KUME_IZ_EN_COK. */
export function izBirlestir(onceki: readonly string[] | undefined, yeni: readonly string[]): string[] {
  const l = (onceki ?? []).filter((x) => !yeni.includes(x));
  for (const x of yeni) if (IZ_DESENI.test(x) && !l.includes(x)) l.push(x);
  return l.slice(-KUME_IZ_EN_COK);
}

/** Girişte gelen izi HesapDO deposuna yazar (değişmediyse yazım yok). */
export async function kumeIziKaydet(depo: Depo, yeni: unknown): Promise<KumeIziKaydi | undefined> {
  const gelen = Array.isArray(yeni) ? yeni.filter((x): x is string => typeof x === "string") : [];
  const k = await depo.al<KumeIziKaydi>(KUME_IZI);
  if (!gelen.length) return k;
  const iz = izBirlestir(k?.iz, gelen);
  if (k && iz.join(",") === k.iz.join(",")) return k;
  const kayit: KumeIziKaydi = { iz, ...(k?.y ? { y: k.y } : {}) };
  await depo.koy({ [KUME_IZI]: kayit });
  return kayit;
}

/**
 * İzi profilin yerleşimindeki karaktere/sakine yazdırır (yalnız iz ya da yerleşim değiştiyse; en iyi çaba: başarısızsa
 * sonraki girişte yeniden denenir).
 */
export async function kumeIziEsitle(depo: Depo, hesapId: string, cagir: (i: YerlesimIleti) => Promise<Sonuc<unknown>>): Promise<Sonuc<unknown>> {
  const k = await depo.al<KumeIziKaydi>(KUME_IZI);
  const profil = await depo.al<Profil>(PROFIL_ANAHTARI);
  if (!k?.iz.length || !profil) return basarili({ esit: false });
  const imza = `${profil.yerlesim}|${k.iz.join(",")}`;
  if (k.y === imza) return basarili({ esit: true });
  try {
    const r = await cagir({ islem: "kumeIzi", yerlesim: profil.yerlesim, hesapId, kk: k.iz });
    if (!r.ok) return r;
  } catch {
    return hata("transfer_bekliyor");
  }
  await depo.koy({ [KUME_IZI]: { iz: k.iz, y: imza } });
  return basarili({ esit: true });
}
