// Çevrimiçi görünen ad: 2-24 karakter; Türkçe ve Latin harfler, harf grupları arasında tek boşluk ya da kesme.
// Benzersizlik anahtarı Türkçe kurallarla küçük harftir (İ→i, I→ı), boşluklar tekleştirilir.

export const AD_EN_KISA = 2;
export const AD_EN_UZUN = 24;

const HARF = "A-Za-zÇĞİÖŞÜÂÎÛçğıöşüâîû";
const AD_DESENI = new RegExp(`^[${HARF}]+(?:[ '][${HARF}]+)*$`, "u");

export type AdHatasi = "ad_uzunluk" | "ad_karakter" | "ad_yasak";
export type AdSonucu = { ok: true; ad: string; anahtar: string } | { ok: false; hata: AdHatasi };

/** NFC, kesme işareti birliği, boşlukları tekleştirme ve kırpma. */
export function adDuzenle(ham: string): string {
  return ham
    .normalize("NFC")
    .replace(/[’‘ʼ`´]/g, "'")
    .replace(/\s+/gu, " ")
    .trim();
}

/** Türkçe kurallarla küçük harf (yerel ayardan bağımsız). */
export function trKucuk(metin: string): string {
  return metin.replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase();
}

export function adAnahtari(ad: string): string {
  return trKucuk(adDuzenle(ad));
}

/** Görünüşte karışan harfler (17 Kasım denetimi S12): ı, i ve l (büyük I ile küçük l çoğu yazıda aynıdır). */
export const KARISAN_HARFLER: readonly string[] = ["ı", "i", "l"];

/** Benzerlik anahtarı: benzersizlik anahtarında karışan harfler tek simgeye katlanır ("Ilker" ≈ "llker" ≈ "ılker"). */
export function adBenzerlikAnahtari(ad: string): string {
  return adAnahtari(ad).replace(/[ıil]/g, "i");
}

/** [PARAMETRE] Eski adlarla çakışma denetiminde açılacak en çok karışan harf konumu (3^n anahtar). */
export const BENZER_KONUM_EN_COK = 6;

/**
 * Benzersizlik anahtarının, karışan harfleri farklı yazılmış bütün biçimleri (eski kayıtlarla çakışma denetimi).
 * Karışan harf konumu BENZER_KONUM_EN_COK'tan fazlaysa yalnız anahtarın kendisi döner.
 */
export function benzerAnahtarlar(anahtar: string): string[] {
  const harfler = [...anahtar];
  const konumlar = harfler.flatMap((h, i) => (KARISAN_HARFLER.includes(h) ? [i] : []));
  if (konumlar.length === 0 || konumlar.length > BENZER_KONUM_EN_COK) return [anahtar];
  let sonuc = [harfler];
  for (const i of konumlar) sonuc = sonuc.flatMap((h) => KARISAN_HARFLER.map((x) => h.map((y, j) => (j === i ? x : y))));
  return sonuc.map((h) => h.join(""));
}

// Kısa ve genel tutulur; yalnız açık küfür ve resmî görünen adlar.
const YASAK_SOZCUK = new Set(["amk", "aq", "sik", "sikik", "got", "pic", "ibne", "gm", "sistem", "kronikler"]);
const YASAK_PARCA = ["orospu", "yarrak", "pezevenk", "kahpe", "admin", "moderator", "yonetici"];
const KATLAMA: Readonly<Record<string, string>> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };

function katla(metin: string): string {
  return trKucuk(metin).replace(/[çğıöşüâîû]/g, (h) => KATLAMA[h] ?? h);
}

function yasakMi(ad: string): boolean {
  const k = katla(ad);
  if (k.split(/[ ']/).some((s) => YASAK_SOZCUK.has(s))) return true;
  const bitisik = k.replace(/[ ']/g, "");
  return YASAK_PARCA.some((p) => bitisik.includes(p));
}

export function adDogrula(ham: unknown): AdSonucu {
  if (typeof ham !== "string") return { ok: false, hata: "ad_karakter" };
  const ad = adDuzenle(ham);
  const uzunluk = [...ad].length;
  if (uzunluk < AD_EN_KISA || uzunluk > AD_EN_UZUN) return { ok: false, hata: "ad_uzunluk" };
  if (!AD_DESENI.test(ad)) return { ok: false, hata: "ad_karakter" };
  if (yasakMi(ad)) return { ok: false, hata: "ad_yasak" };
  return { ok: true, ad, anahtar: trKucuk(ad) };
}
