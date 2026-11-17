// Yönetici rolleri ve kişisel yetkiler (ana tasarım §7.1; Berkay kuralı 17 Kasım). Rol istemciden asla alınmaz:
// kurucular `YONETICI_EPOSTALAR` ortam değişkeninden (ya da kurucu anahtarıyla açılan oturumdan), moderatörler
// YonetimDO deposundan her istekte yeniden çözülür.
//
// KURAL: Kurucu hiçbir şeyle sınırlanmaz: bütün işlemler açıktır; telafi tavanı, günlük tavan, kendine-fayda yasağı
// ve etkinlik süre sınırı kurucuya uygulanmaz (işlemleri yine kayda girer). Moderatörün yetkilerini kurucu panelden
// kişi başı tek tek açıp kapatır; moderatöre kendine-fayda yasağı ve telafi tavanı uygulanır. Listede olmayan işlem
// reddedilir.

export const ROLLER = ["kurucu", "moderator"] as const;
export type Rol = (typeof ROLLER)[number];

/** Bütün yönetim işlemleri ve paneldeki Türkçe adları (moderatör yetki kutucukları bu adlarla görünür). */
export const ISLEM_ADLARI = {
  giris: "Giriş",
  ben: "Kendi bilgisi",
  oturumKapat: "Bütün oturumlarını kapatma",
  ekonomi: "Ekonomi sağlığını görme",
  telafiler: "Telafi geçmişini görme",
  telafi: "Telafi (akçe/mal verme ve alma)",
  telafiGeri: "Telafiyi geri alma",
  oyuncuGor: "Oyuncu arama",
  oyuncuAyrinti: "Oyuncu ayrıntısı (cüzdan, envanter, son işlemler)",
  sikayetGor: "Şikayetleri görme",
  sikayetKarar: "Şikayete karar verme",
  susturma: "Susturma",
  uzaklastirma: "Geçici uzaklaştırma",
  yaptirimKaldir: "Susturma ve geçici uzaklaştırmayı kaldırma",
  kaliciUzaklastirma: "Kalıcı uzaklaştırma",
  kaliciKaldir: "Kalıcı uzaklaştırmayı kaldırma",
  parametreGor: "Parametreleri görme",
  parametreDegistir: "Parametre değiştirme",
  parametreGeri: "Parametre geri alma",
  rolVer: "Moderatör ekleme, kaldırma ve yetkilendirme",
  duyuru: "Duyuru",
  kayitGor: "İşlem kaydını görme",
  debdebeGor: "Debdebe defterini görme",
  debdebeIade: "Debdebe iadesi",
  etkinlikGor: "Etkinlikleri görme",
  etkinlikYonet: "Etkinlik başlatma ve durdurma",
} as const;
export type YonetimIslemi = keyof typeof ISLEM_ADLARI;

/** Her yöneticiye açık işlemler (oturumun kendisi). */
export const HERKESE_ACIK: readonly YonetimIslemi[] = ["giris", "ben", "oturumKapat"];
/** Yalnız kurucu; moderatöre verilemez. */
export const KURUCUYA_OZEL: readonly YonetimIslemi[] = ["rolVer"];
/** Moderatöre verilebilen yetkiler (panel kutucukları). */
export const MOD_YETKILERI: readonly YonetimIslemi[] = (Object.keys(ISLEM_ADLARI) as YonetimIslemi[])
  .filter((i) => !HERKESE_ACIK.includes(i) && !KURUCUYA_OZEL.includes(i));
/** Kişisel yetki kaydı olmayan moderatörün yetkileri (eski moderatörler bu haklarla sürer). */
export const MOD_VARSAYILAN: readonly YonetimIslemi[] = [
  "oyuncuGor", "sikayetGor", "sikayetKarar", "susturma", "uzaklastirma", "yaptirimKaldir", "etkinlikGor",
];

/** [PARAMETRE] Moderatörün TR günü başına telafi tavanı (akçe; verme + alma mutlak toplamı) varsayılanı ve üst sınırı. */
export const MOD_TELAFI_VARSAYILAN = 5_000;
export const MOD_TELAFI_TAVAN_EN_COK = 50_000;

/** Moderatörün kişisel yetki kaydı (YonetimDO `modYetki` haritasında). */
export interface ModYetkisi {
  /** Açık yetkiler. */
  y: YonetimIslemi[];
  /** Günlük telafi tavanı (akçe). */
  t: number;
}

export function islemMi(v: unknown): v is YonetimIslemi {
  return typeof v === "string" && Object.hasOwn(ISLEM_ADLARI, v);
}

export function rolMu(v: unknown): v is Rol {
  return v === "kurucu" || v === "moderator";
}

/** Saf: ham yetki listesini doğrular (yalnız moderatöre verilebilenler, tekrarsız, sıralı); geçersiz öğe varsa undefined. */
export function modYetkiListesiCoz(ham: unknown): YonetimIslemi[] | undefined {
  if (!Array.isArray(ham) || ham.length > MOD_YETKILERI.length) return undefined;
  const kume = new Set<YonetimIslemi>();
  for (const x of ham) {
    if (!islemMi(x) || !MOD_YETKILERI.includes(x)) return undefined;
    kume.add(x);
  }
  return MOD_YETKILERI.filter((i) => kume.has(i));
}

/** Saf: moderatörün telafi tavanı (0–MOD_TELAFI_TAVAN_EN_COK tam sayı); geçersizse undefined. */
export function modTelafiTavaniCoz(ham: unknown): number | undefined {
  return typeof ham === "number" && Number.isInteger(ham) && ham >= 0 && ham <= MOD_TELAFI_TAVAN_EN_COK ? ham : undefined;
}

/** Moderatörün etkin yetkileri: kayıt yoksa varsayılan; kayıttaki tanınmayan ad atılır. */
export function modYetkileri(kayit: ModYetkisi | undefined): readonly YonetimIslemi[] {
  if (!kayit) return MOD_VARSAYILAN;
  return MOD_YETKILERI.filter((i) => kayit.y.includes(i));
}

/** Bilinmeyen işlem ya da rolsüz kişi için false. Kurucu her işleme; moderatör yalnız kişisel yetkilerine. */
export function yetkiVar(rol: Rol | undefined, islem: string, modYetki: readonly YonetimIslemi[] = MOD_VARSAYILAN): boolean {
  if (!rol || !islemMi(islem)) return false;
  if (rol === "kurucu" || HERKESE_ACIK.includes(islem)) return true;
  return !KURUCUYA_OZEL.includes(islem) && modYetki.includes(islem);
}

export function yetkiler(rol: Rol | undefined, modYetki: readonly YonetimIslemi[] = MOD_VARSAYILAN): YonetimIslemi[] {
  return (Object.keys(ISLEM_ADLARI) as YonetimIslemi[]).filter((i) => yetkiVar(rol, i, modYetki));
}

const EPOSTA = /^[^\s@,]{1,64}@[^\s@,]{1,253}$/;

/** Kırpılmış, küçük harf e-posta; biçim tutmazsa undefined. */
export function epostaDuzenle(ham: unknown): string | undefined {
  if (typeof ham !== "string") return undefined;
  const e = ham.trim().toLowerCase();
  return e.length <= 254 && EPOSTA.test(e) ? e : undefined;
}

/** `YONETICI_EPOSTALAR` (virgülle ayrılmış) → küme. Boş ya da tanımsızsa boş küme: kimse kurucu değildir. */
export function kurucuListesi(deger: string | undefined): Set<string> {
  const kume = new Set<string>();
  for (const parca of (deger ?? "").split(",")) {
    const e = epostaDuzenle(parca);
    if (e) kume.add(e);
  }
  return kume;
}

/** Depoda verilebilen roller: kurucu yalnız ortamdan (YONETICI_EPOSTALAR) gelir, /yonetim/rol ile verilemez. */
export const VERILEBILIR_ROLLER = ["moderator"] as const;

export function verilebilirRolMu(v: unknown): v is (typeof VERILEBILIR_ROLLER)[number] {
  return v === "moderator";
}

/** Ortamdaki kurucu her zaman kurucudur; değilse depodaki rol (yalnız moderatör; depodaki "kurucu" yok sayılır). */
export function rolCoz(eposta: string, kurucular: ReadonlySet<string>, kayitli: unknown): Rol | undefined {
  if (kurucular.has(eposta)) return "kurucu";
  return verilebilirRolMu(kayitli) ? kayitli : undefined;
}
