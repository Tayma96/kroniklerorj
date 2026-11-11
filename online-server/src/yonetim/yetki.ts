// Yönetici rolleri ve yetki matrisi (ana tasarım §7.1). Rol istemciden asla alınmaz: kurucular
// `YONETICI_EPOSTALAR` ortam değişkeninden, diğer roller YonetimDO deposundan her istekte yeniden çözülür.
// Matriste olmayan işlem reddedilir.

export const ROLLER = ["kurucu", "moderator"] as const;
export type Rol = (typeof ROLLER)[number];

const HEPSI = ["kurucu", "moderator"] as const;
const KURUCU = ["kurucu"] as const;

/** İşlem → izinli roller. Yetki matrisi varsayılan olarak kapalıdır. */
export const YETKI = {
  giris: HEPSI,
  ben: HEPSI,
  ekonomi: KURUCU,
  oyuncuGor: HEPSI,
  sikayetGor: HEPSI,
  sikayetKarar: HEPSI,
  susturma: HEPSI,
  /** Geçici uzaklaştırma (≤ GECICI_UZAKLASTIRMA_EN_COK_GUN). */
  uzaklastirma: HEPSI,
  /** Susturma ve geçici uzaklaştırmanın kaldırılması. */
  yaptirimKaldir: HEPSI,
  /** Y2: ad değişikliği zorunluluğu. */
  adDegisikligiZorunlu: HEPSI,
  kaliciUzaklastirma: KURUCU,
  kaliciKaldir: KURUCU,
  parametreGor: KURUCU,
  parametreDegistir: KURUCU,
  parametreGeri: KURUCU,
  rolVer: KURUCU,
  duyuru: KURUCU,
  kayitGor: KURUCU,
  /** Y2: akçe/eşya iadesi (telafi WorldEvent'i). */
  iade: KURUCU,
  /** Y2: işlem geri alma (telafi WorldEvent'i). */
  geriAlma: KURUCU,
  /** Y3: Debdebe satın alma defteri ve iadesi (§7.1: yalnız Kurucu). */
  debdebeGor: KURUCU,
  debdebeIade: KURUCU,
} as const satisfies Record<string, readonly Rol[]>;
export type YonetimIslemi = keyof typeof YETKI;

export function rolMu(v: unknown): v is Rol {
  return v === "kurucu" || v === "moderator";
}

/** Bilinmeyen işlem ya da rolsüz kişi için false. */
export function yetkiVar(rol: Rol | undefined, islem: string): boolean {
  if (!rol || !Object.hasOwn(YETKI, islem)) return false;
  return (YETKI[islem as YonetimIslemi] as readonly Rol[]).includes(rol);
}

export function yetkiler(rol: Rol | undefined): YonetimIslemi[] {
  return (Object.keys(YETKI) as YonetimIslemi[]).filter((i) => yetkiVar(rol, i));
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
