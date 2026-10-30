// Çevrimiçi görünen ad denetimi: online-server/src/ad.ts kurallarının istemci aynası (canlı geri bildirim için).
// Son söz sunucunundur (ör. ad_alinmis yalnız sunucuda anlaşılır).

export const AD_EN_KISA = 2;
export const AD_EN_UZUN = 24;

const HARF = "A-Za-zÇĞİÖŞÜÂÎÛçğıöşüâîû";
const AD_DESENI = new RegExp(`^[${HARF}]+(?:[ '][${HARF}]+)*$`, "u");
const HARF_DISI = new RegExp(`[^${HARF} ']`, "u");

export type AdHatasi = "ad_uzunluk" | "ad_karakter" | "ad_yasak";
export type AdSonucu = { ok: true; ad: string } | { ok: false; hata: AdHatasi };

/** NFC, kesme işareti birliği, boşlukları tekleştirme ve kırpma (sunucuyla aynı). */
export function adDuzenle(ham: string): string {
  return ham.normalize("NFC").replace(/[’‘ʼ`´]/g, "'").replace(/\s+/gu, " ").trim();
}

function trKucuk(metin: string): string {
  return metin.replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase();
}

const YASAK_SOZCUK = new Set(["amk", "aq", "sik", "sikik", "got", "pic", "ibne", "gm", "sistem", "kronikler"]);
const YASAK_PARCA = ["orospu", "yarrak", "pezevenk", "kahpe", "admin", "moderator", "yonetici"];
const KATLAMA: Readonly<Record<string, string>> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };

function yasakMi(ad: string): boolean {
  const k = trKucuk(ad).replace(/[çğıöşüâîû]/g, (h) => KATLAMA[h] ?? h);
  if (k.split(/[ ']/).some((s) => YASAK_SOZCUK.has(s))) return true;
  const bitisik = k.replace(/[ ']/g, "");
  return YASAK_PARCA.some((p) => bitisik.includes(p));
}

export function adDogrula(ham: string): AdSonucu {
  const ad = adDuzenle(ham);
  const uzunluk = [...ad].length;
  if (uzunluk < AD_EN_KISA || uzunluk > AD_EN_UZUN) return { ok: false, hata: "ad_uzunluk" };
  if (!AD_DESENI.test(ad)) return { ok: false, hata: "ad_karakter" };
  if (yasakMi(ad)) return { ok: false, hata: "ad_yasak" };
  return { ok: true, ad };
}

/** Yazarken hangi kuralın tuttuğunu gösterir (kural listesi için). */
export function adKurallari(ham: string): { uzunluk: boolean; harf: boolean; bosluk: boolean } {
  const ad = adDuzenle(ham);
  const n = [...ad].length;
  return {
    uzunluk: n >= AD_EN_KISA && n <= AD_EN_UZUN,
    harf: n > 0 && !HARF_DISI.test(ad),
    // Boşluk ve kesme yalnız harf grupları arasında, tek tek.
    bosluk: n > 0 && !/^[ ']|[ ']$|[ ']{2}/.test(ad),
  };
}
