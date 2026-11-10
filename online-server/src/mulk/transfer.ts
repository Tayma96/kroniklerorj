// DO'lar arası para ve kayıt aktarımı (GDD §13 "Finansal bütünlük"): işlem kimliği + emanet + çıkış kutusu +
// uzlaştırma. Saf veri yapıları; iki taraf da (YerlesimDO cüzdanı, IsletmeDO kasası) aynı sözleşmeyi kullanır.
//
//   1. Kaynak, kendi tek yazımında tutarı bakiyeden düşer (bloke = emanet) ve çıkış kutusuna `bekliyor` yazar.
//   2. Hedef, işlem kimliğini giriş defterinde arar: yoksa uygular ve sonucu (kabul/red) yazar; varsa aynı sonucu
//      döner. Tekrarlanan teslim ikinci kez para üretmez.
//   3. Kaynak, cevaba göre kaydı kapatır: kabul → kesin; red → telafi (tutar kaynağa iade). Cevap gelmezse (ağ,
//      zaman aşımı) kayıt `bekliyor` kalır ve uzlaştırma döngüsü (istek sonrası + DO alarmı) yeniden dener.
//
// Zaman aşımı hiçbir zaman telafi doğurmaz: telafi yalnız hedefin kalıcı "red" cevabıyla olur (hedef reddi de
// defterine yazar; sonraki teslim de red alır). Böylece "hedef uyguladı ama cevap kayboldu" durumunda çift para
// oluşmaz. Toplam akçe değişmezi: Σ bakiye + Σ bekleyen çıkış tutarı sabittir (kaynak/batak kalemleri hariç).

/** [PARAMETRE] Bekleyen çıkış kaydı sınırı (dolarsa yeni transfer `transfer_bekliyor` döner). */
export const CIKIS_EN_COK = 32;
/** [PARAMETRE] Kapanmış transfer özetinden tutulan (yanıt tazeleme ve denetim için). */
export const KAPANAN_EN_COK = 40;
/** [PARAMETRE] Giriş defterinde işlem kimliğinin saklanma süresi (ms): bekleyen bir kaynağın en geç yeniden deneyeceği
 * süreden çok uzun. Budama yalnız bu süreden eski kayıtları siler. */
export const GIRIS_SAKLAMA_MS = 120 * 24 * 60 * 60 * 1000;
/** [PARAMETRE] Yeniden deneme beklemesi: 2^deneme × taban, tavanlı (ms). */
export const DENEME_TABAN_MS = 30 * 1000;
export const DENEME_TAVAN_MS = 60 * 60 * 1000;
/** [PARAMETRE] Bir uzlaştırma turunda teslim edilen en çok kayıt. */
export const UZLASTIRMA_TUR_EN_COK = 8;

export type CevapDurumu = "kabul" | "red";
export type KapanisDurumu = "kesin" | "iade";

export interface CikisKaydi {
  /** İşlem kimliği (küresel eşsiz: kaynak + işlem + istekNo). */
  i: string;
  /** Tür (taraflara özgü: "kur", "kasaya", "sahip", "cuzdana", "ayar", "iflas"). */
  t: string;
  /** Hedef (işletme kimliği ya da yerleşim). */
  h: string;
  /** Bloke edilen tutar (akçe; para taşımayan kayıtlarda 0). */
  a: number;
  /** Türün yükü (hedef uygular). */
  y: Record<string, unknown>;
  /** Açılış anı, deneme sayısı, sonraki deneme anı. */
  b: number;
  d: number;
  s: number;
}

export interface CikisKutusu {
  k: CikisKaydi[];
  /** Kapananlar: [işlem, durum, an, tutar] (en yeni sonda). */
  z: [i: string, durum: KapanisDurumu, an: number, a: number][];
}

export interface GirisDefteri {
  /** işlem → [sonuç, an, red nedeni]. */
  g: Record<string, [CevapDurumu, number, string?]>;
}

export function bosKutu(): CikisKutusu {
  return { k: [], z: [] };
}

export function bosDefter(): GirisDefteri {
  return { g: {} };
}

/** Çıkış kaydı açar (bakiyeden düşmek çağıranın aynı yazımdaki işidir). Kutu doluysa false. */
export function cikisAc(kutu: CikisKutusu, kayit: Omit<CikisKaydi, "b" | "d" | "s">, an: number): boolean {
  if (kutu.k.some((x) => x.i === kayit.i)) return true;
  if (kutu.k.length >= CIKIS_EN_COK) return false;
  kutu.k.push({ ...kayit, b: an, d: 0, s: an });
  return true;
}

/** Bekleyen kaydı bulur. */
export function bekleyen(kutu: CikisKutusu, i: string): CikisKaydi | undefined {
  return kutu.k.find((x) => x.i === i);
}

/** Bekleyen toplam (uçuştaki akçe; değişmez denetiminde sayılır). */
export function bekleyenToplam(kutu: CikisKutusu): number {
  return kutu.k.reduce((t, x) => t + x.a, 0);
}

/**
 * Hedefin cevabıyla kaydı kapatır. Kayıt zaten kapanmışsa (eşzamanlı ikinci teslim) undefined döner: çağıran telafi
 * yapmaz. Red → `iade` (çağıran tutarı kaynağa geri yazar).
 */
export function cikisKapat(kutu: CikisKutusu, i: string, cevap: CevapDurumu, an: number): { kayit: CikisKaydi; durum: KapanisDurumu } | undefined {
  const n = kutu.k.findIndex((x) => x.i === i);
  if (n < 0) return undefined;
  const kayit = kutu.k[n]!;
  kutu.k.splice(n, 1);
  const durum: KapanisDurumu = cevap === "kabul" ? "kesin" : "iade";
  kutu.z.push([i, durum, an, kayit.a]);
  if (kutu.z.length > KAPANAN_EN_COK) kutu.z.splice(0, kutu.z.length - KAPANAN_EN_COK);
  return { kayit, durum };
}

/** Teslim edilemeyen kaydın sonraki denemesini erteler (üstel bekleme). */
export function denemeErtele(kutu: CikisKutusu, i: string, an: number): void {
  const k = bekleyen(kutu, i);
  if (!k) return;
  k.d++;
  k.s = an + Math.min(DENEME_TAVAN_MS, DENEME_TABAN_MS * 2 ** Math.min(k.d, 20));
}

/** Zamanı gelen kayıtlar (en eski önce), tur sınırıyla. `hepsi`: bekleme süresine bakmadan (istek sonrası ilk deneme). */
export function denenecekler(kutu: CikisKutusu, an: number, hepsi = false): CikisKaydi[] {
  return kutu.k.filter((x) => hepsi || x.s <= an).slice(0, UZLASTIRMA_TUR_EN_COK);
}

/** En yakın yeniden deneme anı (yoksa null): DO alarmı buna göre kurulur. */
export function sonrakiDeneme(kutu: CikisKutusu): number | null {
  if (kutu.k.length === 0) return null;
  return Math.min(...kutu.k.map((x) => x.s));
}

/** İşlemin bilinen durumu: bekliyor / kesin / iade / bilinmiyor. */
export function transferDurumu(kutu: CikisKutusu, i: string): "bekliyor" | KapanisDurumu | "bilinmiyor" {
  if (bekleyen(kutu, i)) return "bekliyor";
  for (let n = kutu.z.length - 1; n >= 0; n--) if (kutu.z[n]![0] === i) return kutu.z[n]![1];
  return "bilinmiyor";
}

/**
 * Hedef tarafı: işlem kimliği defterde varsa kayıtlı sonucu döner (`yeni: false`, hiçbir şey uygulanmaz); yoksa
 * `uygula` çalışır ve sonucu yazılır. `uygula` red dönerse yan etki üretmemiş olmalıdır.
 */
export function girisUygula(
  defter: GirisDefteri,
  i: string,
  an: number,
  uygula: () => { durum: CevapDurumu; neden?: string },
): { durum: CevapDurumu; neden?: string; yeni: boolean } {
  const onceki = defter.g[i];
  if (onceki) return { durum: onceki[0], ...(onceki[2] ? { neden: onceki[2] } : {}), yeni: false };
  const r = uygula();
  defter.g[i] = r.neden ? [r.durum, an, r.neden] : [r.durum, an];
  return { ...r, yeni: true };
}

/** Saklama süresini aşan giriş kayıtlarını siler. */
export function defterBuda(defter: GirisDefteri, an: number): void {
  for (const [i, [, t]] of Object.entries(defter.g)) if (an - t > GIRIS_SAKLAMA_MS) delete defter.g[i];
}
