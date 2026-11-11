// YonetimDO iş kuralları (Workers'tan bağımsız; depo ve dış çağrılar parametre olarak gelir, node --test ile denenir).
// İlkeler (ana tasarım §7.2):
// - Rol istemciden alınmaz; her istekte ortamdaki kurucu listesi + depodaki rollerden çözülür.
// - Her yazan işlem ve rolü olan (ya da rolü alınmış) yöneticinin her başarısız denemesi işlem kaydına eklenir; kayıt
//   girdi başına ayrı anahtardır, yalnız eklenir, silen/düzenleyen yol yoktur. Oyuncu görüntüleme de kayda girer.
//   Rolsüz kişinin /yonetim/giris denemesi kaydı şişirmesin diye kayda yazılmaz: günlük sayaçta tutulur ve dakikalık
//   genel tavanla sınırlanır.
// - Yazan uçlar `istekNo` ile tekrar güvenlidir (anahtar uç + gövde özetini taşır) ve gerekçe ister.
// - Kendine fayda yasağı: yönetici kendi oyuncu hesabından yaptırım kaldıramaz, kendi hakkındaki şikayete karar veremez.
// - Bir DO içinde yalnız depolama beklemeleri arasında başka istek araya girmez; bu yüzden her yazım, dış çağrılardan
//   (DunyaDO/HesapDO) sonra, yalnız depolama okuyup yazan tek bir bölümde yapılır ve orada tekrar denetimi yinelenir.
// - HesapDO'ya itme başarısızsa kayıt yine tutulur, yanıt `hesabaYazildi: false` der; aynı istekNo ile yeniden
//   gönderim ya da aynı hedefte herhangi bir yaptırım işlemi (yaptirim_yok dahil) güncel özeti yeniden iter.

import { b64urlKodla, utf8 } from "../b64.ts";
import type { Depo } from "../depo.ts";
import { yerlesimBul } from "../dunya-veri.ts";
import { istekNoCoz } from "../mantik.ts";
import {
  basarili,
  hata,
  YONETIM_UCLARI,
  type Basarisiz,
  type HataKodu,
  type HesapIleti,
  type HesapYaptirimi,
  type Profil,
  type Sonuc,
  type YoneticiKimligi,
  type YonetimIleti,
  type YonetimUcu,
} from "../tipler.ts";
import {
  caprazDenetle,
  degerDogrula,
  etkinDeger,
  parametreAdiCoz,
  parametreDegistir,
  parametreGeriAl,
  parametreOzeti,
  PARAMETRELER,
  type ParametreAdi,
  type ParametreKaydi,
} from "./parametre.ts";
import {
  ACIK_KUYRUK_EN_COK,
  bildirimBirlestir,
  gunlukSay,
  sikayetGirdisiCoz,
  SIKAYETCI_ACIK_EN_COK,
  SIKAYET_DURUMLARI,
  trGunu,
  type GunlukSayac,
  type Sikayet,
  type SikayetDurumu,
} from "./sikayet.ts";
import {
  etkinOzet,
  gerekceCoz,
  hesapIdCoz,
  metinTemizle,
  turMu,
  yaptirimEtkin,
  yaptirimGirdisiCoz,
  yaptirimSuresiCoz,
  GUN_MS,
  type Kaldirma,
  type Yaptirim,
  type YaptirimTuru,
} from "./yaptirim.ts";
import { debdebeIade, debdebeKayit, debdebeListesi } from "./y3.ts";
import { epostaDuzenle, rolCoz, verilebilirRolMu, yetkiler, yetkiVar, type Rol, type YonetimIslemi } from "./yetki.ts";

/** [PARAMETRE] Sayfa boyları ve duyuru sayısı. */
export const KAYIT_SAYFASI = 50;
export const SIKAYET_SAYFASI = 100;
export const SON_DUYURU = 5;
export const DUYURU_EN_UZUN = 500;

// Depo anahtarları
const SAYAC_KAYIT = "sayac:kayit";
const SAYAC_YAPTIRIM = "sayac:yaptirim";
const SAYAC_SIKAYET = "sayac:sikayet";
const SAYAC_DUYURU = "sayac:duyuru";
const ROLLER = "roller"; // Record<eposta, Rol>
const KAYIT = "kayit:"; // + 12 hane → IslemKaydi (girdi başına bir anahtar; yalnız eklenir)
const ISTEK = "istek:"; // + eposta + "\n" + istekNo → IstekKaydi
const PARAM = "param:"; // + ad → ParametreKaydi
const YAPTIRIM = "yaptirim:"; // + hesap → Yaptirim[]
const SIKAYET = "sikayet:"; // + 12 hane → Sikayet
const SIKAYET_ACIK = "sikayetAcik"; // number[] (eskiden yeniye; hedef başına bir kayıt)
const SIKAYET_HEDEF = "sikayetHedef:"; // + hedef → açık şikayet numarası
const SIKAYETCI_ACIK = "sikayetciAcik:"; // + sikayetci → içinde bulunduğu şikayet numaraları
const SIKAYET_ISTEK = "sikayetIstek:"; // + sikayetci + "\n" + istekNo → {ozet, sonuc}
const SIKAYET_GUN = "sikayetGun:"; // + sikayetci → GunlukSayac
const YETKISIZ_GIRIS = "yetkisizGiris:"; // + TR günü → sayı
const DUYURU = "duyuru:"; // + 12 hane → Duyuru

export const hane = (n: number): string => String(n).padStart(12, "0");

export interface IslemKaydi {
  no: number;
  zaman: number;
  kim: string;
  rol: Rol | null;
  islem: string;
  hedef?: string;
  gerekce?: string;
  sonuc: "tamam" | HataKodu;
  ayrinti?: Record<string, unknown>;
}

interface IstekKaydi {
  uc: string;
  ozet: string;
  sonuc: Sonuc<unknown>;
  /** Yaptırım değiştiyse hedef: tekrar gelen istekte özet HesapDO'ya yeniden itilir. */
  hedef?: string;
}

export interface Duyuru {
  id: number;
  metin: string;
  zaman: number;
  kim: string;
}

export interface YonetimBaglami {
  depo: Depo;
  simdi: number;
  /** Ortamdaki kurucular (YONETICI_EPOSTALAR). */
  kurucular: ReadonlySet<string>;
  oyuncuBul: (sorgu: { ad?: string; hesap?: string }) => Promise<Sonuc<Profil>>;
  /** Y2: yerleşimlerden kimliksiz ekonomi sağlığı özeti. */
  ekonomiOku?: () => Promise<Sonuc<unknown>>;
  /** Hesabın etkin yaptırım özetini HesapDO'ya yazar. */
  hesabaYaz: (hedef: string, durum: HesapYaptirimi) => Promise<Sonuc<unknown>>;
  /** Debdebe iadesi (Y3): hedef HesapDO'ya iç ileti. Yoksa iade yapılamaz. */
  hesabaIlet?: (hedef: string, ileti: HesapIleti) => Promise<Sonuc<unknown>>;
  /** Rolsüz giriş denemeleri için genel (tüm kişiler) dakikalık tavan; false = tavan doldu. Yoksa sınırsız. */
  yetkisizGirisIzni?: () => boolean;
}

export interface Oturum {
  b: YonetimBaglami;
  y: YoneticiKimligi;
  rol: Rol | undefined;
  /** Yazan uçlarda istekNo anahtarına giren uç adı ve gövde özeti. */
  uc: string;
  ozet: string;
}

export type Ek = { hedef?: string; gerekce?: string; ayrinti?: Record<string, unknown> };

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Anahtar sırasından bağımsız JSON. */
function kararliJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(kararliJson).join(",")}]`;
  if (nesneMi(v)) {
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${kararliJson(v[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v) ?? "null";
}

/** Gövdenin SHA-256 özeti (base64url). */
export async function govdeOzeti(govde: unknown): Promise<string> {
  return b64urlKodla(await crypto.subtle.digest("SHA-256", utf8(kararliJson(govde))));
}

// ---------------------------------------------------------------- işlem kaydı

export async function kayitHazirla(o: Oturum, islem: string, sonuc: "tamam" | HataKodu, ek: Ek): Promise<Record<string, unknown>> {
  const no = ((await o.b.depo.al<number>(SAYAC_KAYIT)) ?? 0) + 1;
  const k: IslemKaydi = { no, zaman: o.b.simdi, kim: o.y.eposta, rol: o.rol ?? null, islem, sonuc, ...ek };
  return { [SAYAC_KAYIT]: no, [KAYIT + hane(no)]: k };
}

/** Başarısız denemeyi kaydeder ve hatayı döndürür. */
export async function reddet(o: Oturum, islem: string, kod: HataKodu, ek: Ek = {}): Promise<Basarisiz> {
  await o.b.depo.koy(await kayitHazirla(o, islem, kod, ek));
  return hata(kod);
}

export async function yetkiIste(o: Oturum, islem: YonetimIslemi, ek: Ek = {}): Promise<Basarisiz | undefined> {
  return yetkiVar(o.rol, islem) ? undefined : reddet(o, islem, "yetki_yok", ek);
}

// ---------------------------------------------------------------- ortak

async function rolBul(b: YonetimBaglami, eposta: string): Promise<Rol | undefined> {
  const roller = (await b.depo.al<Record<string, Rol>>(ROLLER)) ?? {};
  return rolCoz(eposta, b.kurucular, Object.hasOwn(roller, eposta) ? roller[eposta] : undefined);
}

async function paramDeger(b: YonetimBaglami, ad: ParametreAdi): Promise<number> {
  return etkinDeger(PARAMETRELER[ad], await b.depo.al<ParametreKaydi>(PARAM + ad));
}

const istekAnahtari = (o: Oturum, no: string): string => `${ISTEK}${o.y.eposta}\n${no}`;

/** Moderatöre başka yöneticilerin e-postası gösterilmez; yerine o anki rolü yazılır. */
function kimGizle<T extends { kim: string; kimRol?: string }>(o: Oturum, k: T): T {
  return o.rol === "kurucu" || k.kim === o.y.eposta ? k : { ...k, kim: k.kimRol ?? "yonetici" };
}

function yaptirimGoster(o: Oturum, y: Yaptirim): Yaptirim {
  const g = kimGizle(o, y);
  return g.kaldirma ? { ...g, kaldirma: kimGizle(o, g.kaldirma) } : g;
}

/** Hedefin güncel etkin özetini HesapDO'ya yazar. */
async function hesabaIt(b: YonetimBaglami, hedef: string): Promise<Sonuc<HesapYaptirimi>> {
  const ozet = etkinOzet((await b.depo.al<Yaptirim[]>(YAPTIRIM + hedef)) ?? [], b.simdi);
  const s = await b.hesabaYaz(hedef, ozet);
  return s.ok ? basarili(ozet) : hata("sunucu_hatasi");
}

/**
 * Yaptırımı değiştiren işlemin yanıtı: özet HesapDO'ya itilir ve yanıt bunun olup olmadığını açıkça söyler.
 * Başarısız itme ayrıca kayda girer; işlem kaydı ve yaptırım YonetimDO'da tutulmuştur.
 */
async function itVeYanitla(o: Oturum, hedef: string, sonuc: Sonuc<unknown>, islem: string): Promise<Sonuc<unknown>> {
  if (!sonuc.ok) return sonuc;
  const it = await hesabaIt(o.b, hedef);
  if (!it.ok) await o.b.depo.koy(await kayitHazirla(o, `${islem}:hesabaYaz`, "sunucu_hatasi", { hedef }));
  const deger = nesneMi(sonuc.deger) ? sonuc.deger : { sonuc: sonuc.deger };
  return basarili({ ...deger, hesabaYazildi: it.ok });
}

/**
 * Önceki aynı istekNo'nun sonucu. Uç ya da gövde farklıysa çakışmadır (`istekno_gecersiz`, kayda girer).
 * Yaptırım değiştirdiyse özet yeniden itilir (yarıda kalan itme tamamlanır).
 */
export async function tekrar(o: Oturum, no: string): Promise<Sonuc<unknown> | undefined> {
  const k = await o.b.depo.al<IstekKaydi>(istekAnahtari(o, no));
  if (!k) return undefined;
  if (k.uc !== o.uc || k.ozet !== o.ozet) {
    return reddet(o, o.uc, "istekno_gecersiz", { ayrinti: { istekNo: no, cakisma: true, oncekiUc: k.uc } });
  }
  return k.hedef ? itVeYanitla(o, k.hedef, k.sonuc, o.uc) : k.sonuc;
}

/** Başarılı yazımı tek seferde kaydeder: değişiklikler + işlem kaydı + istekNo sonucu. */
export async function yaz(
  o: Oturum,
  no: string,
  islem: string,
  ek: Ek,
  degisiklik: Record<string, unknown>,
  sonuc: Sonuc<unknown>,
  hedef?: string,
): Promise<void> {
  const istek: IstekKaydi = { uc: o.uc, ozet: o.ozet, sonuc, ...(hedef ? { hedef } : {}) };
  await o.b.depo.koy({ ...degisiklik, ...(await kayitHazirla(o, islem, "tamam", ek)), [istekAnahtari(o, no)]: istek });
}

async function yaptirimEkleHazirla(
  b: YonetimBaglami,
  hedef: string,
  y: Omit<Yaptirim, "id">,
): Promise<{ degisiklik: Record<string, unknown>; yaptirim: Yaptirim; ozet: HesapYaptirimi }> {
  const id = ((await b.depo.al<number>(SAYAC_YAPTIRIM)) ?? 0) + 1;
  const liste = (await b.depo.al<Yaptirim[]>(YAPTIRIM + hedef)) ?? [];
  const yaptirim: Yaptirim = { id, ...y };
  liste.push(yaptirim);
  return { degisiklik: { [SAYAC_YAPTIRIM]: id, [YAPTIRIM + hedef]: liste }, yaptirim, ozet: etkinOzet(liste, b.simdi) };
}

function bitisHesapla(tur: YaptirimTuru, gun: number | undefined, simdi: number): number | null {
  return tur === "kaliciUzaklastirma" ? null : simdi + (gun ?? 1) * GUN_MS;
}

// ---------------------------------------------------------------- giriş ve ben

async function giris(b: YonetimBaglami, y: YoneticiKimligi): Promise<Sonuc<{ rol: Rol }>> {
  const rol = await rolBul(b, y.eposta);
  if (!rol) {
    // Kalıcı kayda yazılmaz (herkes Google hesabı açabilir); yalnız günlük sayaç ve genel dakikalık tavan.
    if (b.yetkisizGirisIzni && !b.yetkisizGirisIzni()) return hata("hiz_siniri");
    const anahtar = YETKISIZ_GIRIS + trGunu(b.simdi);
    await b.depo.koy({ [anahtar]: ((await b.depo.al<number>(anahtar)) ?? 0) + 1 });
    return hata("yetki_yok");
  }
  const o: Oturum = { b, y, rol, uc: "giris", ozet: "" };
  await b.depo.koy(await kayitHazirla(o, "giris", "tamam", {}));
  return basarili({ rol });
}

async function ben(o: Oturum): Promise<Sonuc<unknown>> {
  const kurucu = o.rol === "kurucu";
  return basarili({
    eposta: o.y.eposta,
    rol: o.rol,
    yetkiler: yetkiler(o.rol),
    kendiHesap: o.y.hesap,
    ortamKurucusu: o.b.kurucular.has(o.y.eposta),
    ...(kurucu ? { yetkisizGirisBugun: (await o.b.depo.al<number>(YETKISIZ_GIRIS + trGunu(o.b.simdi))) ?? 0 } : {}),
  });
}

// ---------------------------------------------------------------- oyuncu

async function oyuncuGor(o: Oturum, sorgu: Record<string, string | null>): Promise<Sonuc<unknown>> {
  const ad = sorgu.ad ?? undefined;
  const hesap = sorgu.hesap ?? undefined;
  const red = await yetkiIste(o, "oyuncuGor", { ayrinti: { ad, hesap } });
  if (red) return red;
  const bulunan = await o.b.oyuncuBul(ad ? { ad } : { hesap: hesap ?? "" });
  if (!bulunan.ok) return reddet(o, "oyuncuGor", bulunan.hata, { ayrinti: { ad, hesap } });
  const profil = bulunan.deger;
  const liste = (await o.b.depo.al<Yaptirim[]>(YAPTIRIM + profil.hesapId)) ?? [];
  const yer = yerlesimBul(profil.yerlesim);
  await o.b.depo.koy(await kayitHazirla(o, "oyuncuGor", "tamam", { hedef: profil.hesapId }));
  return basarili({
    profil,
    yerlesim: yer ? { id: yer.id, ad: yer.ad, tur: yer.tur, beylik: yer.beylik } : null,
    yaptirim: { etkin: etkinOzet(liste, o.b.simdi), liste: [...liste].reverse().map((y) => yaptirimGoster(o, y)) },
    kendi: profil.hesapId === o.y.hesap,
  });
}

// ---------------------------------------------------------------- yaptırım

async function yaptirimUygula(o: Oturum, govde: unknown): Promise<Sonuc<unknown>> {
  const g = yaptirimGirdisiCoz(govde, await paramDeger(o.b, "GECICI_UZAKLASTIRMA_EN_COK_GUN"));
  const hamHedef = nesneMi(govde) && typeof govde.hedef === "string" ? govde.hedef.slice(0, 128) : undefined;
  if (!g.ok) return reddet(o, "yaptirim", g.hata, hamHedef ? { hedef: hamHedef } : {});
  const { hedef, tur, gun, gerekce, istekNo } = g.deger;
  const ek: Ek = { hedef, gerekce, ayrinti: { tur, gun } };
  const red = await yetkiIste(o, tur, ek);
  if (red) return red;
  const onceki = await tekrar(o, istekNo);
  if (onceki) return onceki;
  const bulunan = await o.b.oyuncuBul({ hesap: hedef });
  if (!bulunan.ok) return reddet(o, tur, "hesap_yok", ek);

  // Yalnız depolama: tekrar denetimi + ekleme + kayıt.
  const yarisan = await tekrar(o, istekNo);
  if (yarisan) return yarisan;
  const bitis = bitisHesapla(tur, gun, o.b.simdi);
  const h = await yaptirimEkleHazirla(o.b, hedef, {
    tur, baslangic: o.b.simdi, bitis, kim: o.y.eposta, kimRol: o.rol, gerekce,
  });
  const sonuc = basarili({ yaptirim: h.yaptirim, etkin: h.ozet });
  await yaz(o, istekNo, tur, { ...ek, ayrinti: { tur, gun, id: h.yaptirim.id, bitis } }, h.degisiklik, sonuc, hedef);
  return itVeYanitla(o, hedef, sonuc, tur);
}

async function yaptirimKaldir(o: Oturum, govde: unknown): Promise<Sonuc<unknown>> {
  const hamHedef = nesneMi(govde) ? hesapIdCoz(govde.hedef) : undefined;
  const ek0: Ek = hamHedef ? { hedef: hamHedef } : {};
  if (!nesneMi(govde)) return reddet(o, "yaptirimKaldir", "gecersiz_istek");
  const no = istekNoCoz(govde);
  if (!no.ok) return reddet(o, "yaptirimKaldir", no.hata, ek0);
  if (!hamHedef) return reddet(o, "yaptirimKaldir", "hesap_yok");
  const tur = govde.tur === undefined || govde.tur === null ? undefined : turMu(govde.tur) ? govde.tur : null;
  if (tur === null) return reddet(o, "yaptirimKaldir", "yaptirim_gecersiz", ek0);
  const gerekce = gerekceCoz(govde.gerekce);
  if (!gerekce.ok) return reddet(o, "yaptirimKaldir", gerekce.hata, ek0);
  const ek: Ek = { hedef: hamHedef, gerekce: gerekce.deger, ayrinti: { tur } };
  if (hamHedef === o.y.hesap) return reddet(o, "yaptirimKaldir", "kendi_hedef", ek);
  const onceki = await tekrar(o, no.deger);
  if (onceki) return onceki;

  // Yalnız depolama (yetki reddi de yalnız depolamadır).
  const liste = (await o.b.depo.al<Yaptirim[]>(YAPTIRIM + hamHedef)) ?? [];
  const kalkan = liste.filter((y) => yaptirimEtkin(y, o.b.simdi) && (tur === undefined || y.tur === tur));
  if (kalkan.length === 0) {
    const red = await reddet(o, "yaptirimKaldir", "yaptirim_yok", ek);
    // Onarım: daha önce itilemeyen bir özet varsa HesapDO'yu YonetimDO'daki gerçeğe getirir.
    if (liste.length > 0) await hesabaIt(o.b, hamHedef);
    return red;
  }
  const islem: YonetimIslemi = kalkan.some((y) => y.tur === "kaliciUzaklastirma") ? "kaliciKaldir" : "yaptirimKaldir";
  const red = await yetkiIste(o, islem, ek);
  if (red) return red;
  const kaldirma: Kaldirma = { kim: o.y.eposta, ...(o.rol ? { kimRol: o.rol } : {}), zaman: o.b.simdi, gerekce: gerekce.deger };
  const idler = new Set(kalkan.map((y) => y.id));
  const yeni = liste.map((y) => (idler.has(y.id) ? { ...y, kaldirma } : y));
  const ozet = etkinOzet(yeni, o.b.simdi);
  const sonuc = basarili({ kaldirilan: [...idler], etkin: ozet });
  await yaz(o, no.deger, islem, { ...ek, ayrinti: { tur, idler: [...idler] } }, { [YAPTIRIM + hamHedef]: yeni }, sonuc, hamHedef);
  return itVeYanitla(o, hamHedef, sonuc, islem);
}

// ---------------------------------------------------------------- şikayet

async function sikayetler(o: Oturum, sorgu: Record<string, string | null>): Promise<Sonuc<unknown>> {
  const red = await yetkiIste(o, "sikayetGor");
  if (red) return red;
  const durum = (sorgu.durum ?? "acik") as SikayetDurumu;
  if (!(SIKAYET_DURUMLARI as readonly string[]).includes(durum)) return hata("gecersiz_istek");
  const acik = (await o.b.depo.al<number[]>(SIKAYET_ACIK)) ?? [];
  let idler: number[];
  if (durum === "acik") {
    idler = acik.slice(0, SIKAYET_SAYFASI);
  } else {
    const son = (await o.b.depo.al<number>(SAYAC_SIKAYET)) ?? 0;
    idler = [];
    for (let i = son; i >= 1 && idler.length < 128; i--) idler.push(i);
  }
  const kayitlar = await o.b.depo.alCok<Sikayet>(idler.map((i) => SIKAYET + hane(i)));
  const liste = idler
    .map((i) => kayitlar.get(SIKAYET + hane(i)))
    .filter((s): s is Sikayet => s !== undefined && s.durum === durum)
    .slice(0, SIKAYET_SAYFASI)
    .map((s) => ({ ...s, ...(s.karar ? { karar: kimGizle(o, s.karar) } : {}), kendi: s.hedef === o.y.hesap }));
  return basarili({ durum, sikayetler: liste, toplamAcik: acik.length });
}

async function sikayetKarar(o: Oturum, govde: unknown): Promise<Sonuc<unknown>> {
  if (!nesneMi(govde)) return reddet(o, "sikayetKarar", "gecersiz_istek");
  const no = istekNoCoz(govde);
  if (!no.ok) return reddet(o, "sikayetKarar", no.hata);
  const id = govde.id;
  if (typeof id !== "number" || !Number.isInteger(id) || id < 1) return reddet(o, "sikayetKarar", "sikayet_yok");
  const karar = govde.karar;
  if (karar !== "reddet" && karar !== "yaptirim") return reddet(o, "sikayetKarar", "gecersiz_istek");
  const gerekce = gerekceCoz(govde.gerekce);
  if (!gerekce.ok) return reddet(o, "sikayetKarar", gerekce.hata, { ayrinti: { id } });
  let sure: { tur: YaptirimTuru; gun?: number } | undefined;
  if (karar === "yaptirim") {
    const s = yaptirimSuresiCoz(govde.tur, govde.gun, await paramDeger(o.b, "GECICI_UZAKLASTIRMA_EN_COK_GUN"));
    if (!s.ok) return reddet(o, "sikayetKarar", s.hata, { ayrinti: { id } });
    sure = s.deger;
  }
  const ek: Ek = { gerekce: gerekce.deger, ayrinti: { id, karar, ...sure } };
  const red = (await yetkiIste(o, "sikayetKarar", ek)) ?? (sure ? await yetkiIste(o, sure.tur, ek) : undefined);
  if (red) return red;
  const onceki = await tekrar(o, no.deger);
  if (onceki) return onceki;

  // Yalnız depolama.
  const anahtar = SIKAYET + hane(id);
  const s = await o.b.depo.al<Sikayet>(anahtar);
  if (!s) return reddet(o, "sikayetKarar", "sikayet_yok", ek);
  const ekH: Ek = { ...ek, hedef: s.hedef };
  if (s.hedef === o.y.hesap) return reddet(o, "sikayetKarar", "kendi_hedef", ekH);
  if (s.durum !== "acik") return reddet(o, "sikayetKarar", "karar_verildi", ekH);
  const acik = ((await o.b.depo.al<number[]>(SIKAYET_ACIK)) ?? []).filter((i) => i !== id);
  let degisiklik: Record<string, unknown> = { [SIKAYET_ACIK]: acik };
  let yaptirim: Yaptirim | undefined;
  if (sure) {
    const bitis = bitisHesapla(sure.tur, sure.gun, o.b.simdi);
    const h = await yaptirimEkleHazirla(o.b, s.hedef, {
      tur: sure.tur, baslangic: o.b.simdi, bitis, kim: o.y.eposta, kimRol: o.rol, gerekce: gerekce.deger, sikayet: id,
    });
    degisiklik = { ...degisiklik, ...h.degisiklik };
    yaptirim = h.yaptirim;
  }
  const guncel: Sikayet = {
    ...s,
    durum: sure ? "yaptirim" : "reddedildi",
    karar: {
      kim: o.y.eposta,
      ...(o.rol ? { kimRol: o.rol } : {}),
      zaman: o.b.simdi,
      gerekce: gerekce.deger,
      ...(yaptirim ? { yaptirim: yaptirim.id } : {}),
    },
  };
  degisiklik[anahtar] = guncel;
  const sonuc = basarili({ sikayet: guncel, ...(yaptirim ? { yaptirim } : {}) });
  await yaz(o, no.deger, "sikayetKarar", ekH, degisiklik, sonuc, sure ? s.hedef : undefined);
  // Hedefin açık kaydı kapandı: sonraki şikayet yeni kayıt açar.
  if ((await o.b.depo.al<number>(SIKAYET_HEDEF + s.hedef)) === id) await o.b.depo.sil([SIKAYET_HEDEF + s.hedef]);

  return sure ? itVeYanitla(o, s.hedef, sonuc, "sikayetKarar") : sonuc;
}

/**
 * Oyuncu şikayeti (HesapDO'dan; oturum, uzaklaştırma ve susturma orada denetlenmiştir). Hedef başına tek açık kayıt:
 * farklı şikayetçiler birleşir (sayaç), aynı şikayetçi ikinci kez sayılmaz. Şikayetçi başına açık şikayet sınırı ve
 * günlük sınır vardır; kuyruk doluysa yalnız YENİ hedef reddedilir.
 */
export async function sikayetEkle(b: YonetimBaglami, sikayetci: string, govde: unknown): Promise<Sonuc<unknown>> {
  const g = sikayetGirdisiCoz(govde);
  if (!g.ok) return g;
  const { hedef, neden, aciklama, istekNo } = g.deger;
  if (hedef === sikayetci) return hata("kendini_sikayet");
  const anahtar = `${SIKAYET_ISTEK}${sikayetci}\n${istekNo}`;
  const ozet = await govdeOzeti(govde);
  const oncekiBul = async (): Promise<Sonuc<unknown> | undefined> => {
    const k = await b.depo.al<{ ozet: string; sonuc: Sonuc<unknown> }>(anahtar);
    if (!k) return undefined;
    return k.ozet === ozet ? k.sonuc : hata("istekno_gecersiz");
  };
  const onceki = await oncekiBul();
  if (onceki) return onceki;
  const bulunan = await b.oyuncuBul({ hesap: hedef });
  if (!bulunan.ok) return hata("kisi_yok");
  const sinir = await paramDeger(b, "SIKAYET_GUNLUK");

  // Yalnız depolama.
  const yarisan = await oncekiBul();
  if (yarisan) return yarisan;
  const benimIdler = (await b.depo.al<number[]>(SIKAYETCI_ACIK + sikayetci)) ?? [];
  const benimKayitlar = await b.depo.alCok<Sikayet>(benimIdler.map((i) => SIKAYET + hane(i)));
  const benimAcik = benimIdler.filter((i) => benimKayitlar.get(SIKAYET + hane(i))?.durum === "acik");

  const mevcutId = await b.depo.al<number>(SIKAYET_HEDEF + hedef);
  const mevcutHam = mevcutId === undefined ? undefined : await b.depo.al<Sikayet>(SIKAYET + hane(mevcutId));
  const mevcut = mevcutHam?.durum === "acik" ? mevcutHam : undefined;

  if (mevcut && benimAcik.includes(mevcut.id)) {
    // Aynı şikayetçi aynı hedefi ikinci kez şikayet edemez: tekil, sayılmaz.
    const sonuc = basarili({ id: mevcut.id, durum: "acik" as const, birlesti: true, yeni: false });
    await b.depo.koy({ [anahtar]: { ozet, sonuc } });
    return sonuc;
  }
  const sayac = gunlukSay(await b.depo.al<GunlukSayac>(SIKAYET_GUN + sikayetci), b.simdi, sinir);
  if (!sayac.izin) return hata("sikayet_siniri");
  if (benimAcik.length >= SIKAYETCI_ACIK_EN_COK) return hata("sikayet_siniri");

  const bildirim = { sikayetci, neden, zaman: b.simdi, ...(aciklama ? { aciklama } : {}) };
  let id: number;
  const degisiklik: Record<string, unknown> = {};
  if (mevcut) {
    id = mevcut.id;
    degisiklik[SIKAYET + hane(id)] = bildirimBirlestir(mevcut, bildirim);
  } else {
    const acik = (await b.depo.al<number[]>(SIKAYET_ACIK)) ?? [];
    if (acik.length >= ACIK_KUYRUK_EN_COK) return hata("kuyruk_dolu");
    id = ((await b.depo.al<number>(SAYAC_SIKAYET)) ?? 0) + 1;
    const s: Sikayet = { id, ...bildirim, hedef, durum: "acik", sayi: 1, bildirimler: [bildirim] };
    Object.assign(degisiklik, {
      [SAYAC_SIKAYET]: id,
      [SIKAYET + hane(id)]: s,
      [SIKAYET_ACIK]: [...acik, id],
      [SIKAYET_HEDEF + hedef]: id,
    });
  }
  const sonuc = basarili({ id, durum: "acik" as const, birlesti: mevcut !== undefined, kalan: sinir - sayac.durum.n });
  await b.depo.koy({
    ...degisiklik,
    [SIKAYETCI_ACIK + sikayetci]: [...benimAcik, id],
    [SIKAYET_GUN + sikayetci]: sayac.durum,
    [anahtar]: { ozet, sonuc },
  });
  return sonuc;
}

// ---------------------------------------------------------------- parametre

async function parametreler(o: Oturum): Promise<Sonuc<unknown>> {
  const red = await yetkiIste(o, "parametreGor");
  if (red) return red;
  const adlar = Object.keys(PARAMETRELER) as ParametreAdi[];
  const kayitlar = await o.b.depo.alCok<ParametreKaydi>(adlar.map((a) => PARAM + a));
  return basarili({ parametreler: adlar.map((a) => parametreOzeti(a, kayitlar.get(PARAM + a))) });
}

async function parametreYaz(o: Oturum, govde: unknown, geri: boolean): Promise<Sonuc<unknown>> {
  const islem: YonetimIslemi = geri ? "parametreGeri" : "parametreDegistir";
  const g = nesneMi(govde) ? govde : {};
  const ad = parametreAdiCoz(g.ad);
  const ek0: Ek = ad ? { hedef: ad } : {};
  const red = await yetkiIste(o, islem, ek0);
  if (red) return red;
  const no = istekNoCoz(g);
  if (!no.ok) return reddet(o, islem, no.hata, ek0);
  if (!ad) return reddet(o, islem, "parametre_gecersiz");
  const t = PARAMETRELER[ad];
  let deger = 0;
  if (!geri) {
    const d = degerDogrula(t, g.deger);
    if (!d.ok) return reddet(o, islem, d.hata, { ...ek0, ayrinti: { deger: g.deger } });
    deger = d.deger;
  }
  const gerekce = gerekceCoz(g.gerekce);
  if (!gerekce.ok) return reddet(o, islem, gerekce.hata, ek0);
  const onceki = await tekrar(o, no.deger);
  if (onceki) return onceki;

  const kayit = await o.b.depo.al<ParametreKaydi>(PARAM + ad);
  const iz = { kim: o.y.eposta, zaman: o.b.simdi, gerekce: gerekce.deger };
  let yeni: ParametreKaydi;
  if (geri) {
    const s = parametreGeriAl(t, kayit, iz);
    if (!s.ok) return reddet(o, islem, s.hata, { ...ek0, gerekce: gerekce.deger });
    yeni = s.deger;
  } else {
    yeni = parametreDegistir(t, kayit, deger, iz);
  }
  const son = yeni.gecmis.at(-1);
  const adlar = Object.keys(PARAMETRELER) as ParametreAdi[];
  const kayitlar = await o.b.depo.alCok<ParametreKaydi>(adlar.map((a) => PARAM + a));
  const capraz = caprazDenetle(ad, etkinDeger(t, yeni), (x) => etkinDeger(PARAMETRELER[x], kayitlar.get(PARAM + x)));
  if (capraz) return reddet(o, islem, capraz.hata, { ...ek0, gerekce: gerekce.deger, ayrinti: { deger: etkinDeger(t, yeni), kurallar: capraz.kurallar } });
  const sonuc = basarili(parametreOzeti(ad, yeni));
  const ek: Ek = { hedef: ad, gerekce: gerekce.deger, ayrinti: { onceki: son?.onceki, deger: son?.deger, surum: yeni.surum } };
  await yaz(o, no.deger, islem, ek, { [PARAM + ad]: yeni }, sonuc);
  return sonuc;
}

// ---------------------------------------------------------------- rol, duyuru, kayıt

async function rolYaz(o: Oturum, govde: unknown): Promise<Sonuc<unknown>> {
  const g = nesneMi(govde) ? govde : {};
  const eposta = epostaDuzenle(g.eposta);
  const ek0: Ek = eposta ? { hedef: eposta } : {};
  const red = await yetkiIste(o, "rolVer", ek0);
  if (red) return red;
  const no = istekNoCoz(g);
  if (!no.ok) return reddet(o, "rolVer", no.hata, ek0);
  if (!eposta) return reddet(o, "rolVer", "eposta_gecersiz");
  // Kurucu yalnız ortamdan (YONETICI_EPOSTALAR) gelir; depodan verilebilen tek rol moderatördür.
  if (g.rol !== null && !verilebilirRolMu(g.rol)) return reddet(o, "rolVer", "rol_gecersiz", { ...ek0, ayrinti: { rol: g.rol } });
  const rol = g.rol;
  const gerekce = gerekceCoz(g.gerekce);
  if (!gerekce.ok) return reddet(o, "rolVer", gerekce.hata, ek0);
  const ek: Ek = { hedef: eposta, gerekce: gerekce.deger, ayrinti: { rol } };
  if (o.b.kurucular.has(eposta)) return reddet(o, "rolVer", "kurucu_degismez", ek);
  const onceki = await tekrar(o, no.deger);
  if (onceki) return onceki;

  const roller = (await o.b.depo.al<Record<string, Rol>>(ROLLER)) ?? {};
  const eski = Object.hasOwn(roller, eposta) ? roller[eposta] : undefined;
  if (rol === null) delete roller[eposta];
  else roller[eposta] = rol;
  const sonuc = basarili({ eposta, rol, roller, kurucular: [...o.b.kurucular] });
  await yaz(o, no.deger, "rolVer", { ...ek, ayrinti: { rol, onceki: eski ?? null } }, { [ROLLER]: roller }, sonuc);
  return sonuc;
}

async function duyuruYaz(o: Oturum, govde: unknown): Promise<Sonuc<unknown>> {
  const g = nesneMi(govde) ? govde : {};
  const red = await yetkiIste(o, "duyuru");
  if (red) return red;
  const no = istekNoCoz(g);
  if (!no.ok) return reddet(o, "duyuru", no.hata);
  const metin = typeof g.metin === "string" ? metinTemizle(g.metin) : "";
  if (metin.length === 0 || [...metin].length > DUYURU_EN_UZUN) return reddet(o, "duyuru", "duyuru_gecersiz");
  const gerekce = gerekceCoz(g.gerekce);
  if (!gerekce.ok) return reddet(o, "duyuru", gerekce.hata);
  const onceki = await tekrar(o, no.deger);
  if (onceki) return onceki;

  const id = ((await o.b.depo.al<number>(SAYAC_DUYURU)) ?? 0) + 1;
  const duyuru: Duyuru = { id, metin, zaman: o.b.simdi, kim: o.y.eposta };
  const sonuc = basarili(duyuru);
  await yaz(o, no.deger, "duyuru", { gerekce: gerekce.deger, ayrinti: { id } }, { [SAYAC_DUYURU]: id, [DUYURU + hane(id)]: duyuru }, sonuc);
  return sonuc;
}

/** Oyunculara son duyurular (yazan yöneticinin e-postası verilmez). */
export async function duyurular(b: YonetimBaglami): Promise<Sonuc<unknown>> {
  const son = (await b.depo.al<number>(SAYAC_DUYURU)) ?? 0;
  const idler: number[] = [];
  for (let i = son; i >= 1 && idler.length < SON_DUYURU; i--) idler.push(i);
  const kayitlar = await b.depo.alCok<Duyuru>(idler.map((i) => DUYURU + hane(i)));
  const liste = idler.flatMap((i) => {
    const d = kayitlar.get(DUYURU + hane(i));
    return d ? [{ id: d.id, metin: d.metin, zaman: d.zaman }] : [];
  });
  return basarili({ duyurular: liste });
}

async function kayitOku(o: Oturum, sorgu: Record<string, string | null>): Promise<Sonuc<unknown>> {
  const red = await yetkiIste(o, "kayitGor");
  if (red) return red;
  const son = (await o.b.depo.al<number>(SAYAC_KAYIT)) ?? 0;
  let ust = son;
  if (sorgu.imlec !== undefined && sorgu.imlec !== null && sorgu.imlec !== "") {
    const n = Number(sorgu.imlec);
    if (!Number.isInteger(n) || n < 1) return hata("imlec_gecersiz");
    ust = Math.min(n - 1, son);
  }
  const nolar: number[] = [];
  for (let i = ust; i >= 1 && nolar.length < KAYIT_SAYFASI; i--) nolar.push(i);
  const kayitlar = await o.b.depo.alCok<IslemKaydi>(nolar.map((i) => KAYIT + hane(i)));
  const liste = nolar.flatMap((i) => {
    const k = kayitlar.get(KAYIT + hane(i));
    return k ? [k] : [];
  });
  const en = nolar.at(-1) ?? 1;
  return basarili({ kayitlar: liste, imlec: en, dahaVar: en > 1, toplam: son });
}

// ---------------------------------------------------------------- dağıtıcı

async function yonet(
  b: YonetimBaglami,
  y: YoneticiKimligi,
  uc: YonetimUcu,
  govde: unknown,
  sorgu: Record<string, string | null>,
): Promise<Sonuc<unknown>> {
  const yazan = Object.hasOwn(YONETIM_UCLARI, uc) && YONETIM_UCLARI[uc] === "POST";
  const o: Oturum = { b, y, rol: await rolBul(b, y.eposta), uc: String(uc).slice(0, 32), ozet: yazan ? await govdeOzeti(govde) : "" };
  // Geçerli yönetici belirteci taşıyan rolsüz istek (rolü alınmış kişi) kayda girer; belirteç en çok 12 saat yaşar.
  if (!o.rol) return reddet(o, o.uc, "yetki_yok");
  switch (uc) {
    case "ben":
      return ben(o);
    case "ekonomi":
      return o.b.ekonomiOku ? o.b.ekonomiOku() : hata("gecersiz_istek");
    case "oyuncu":
      return oyuncuGor(o, sorgu);
    case "yaptirim":
      return yaptirimUygula(o, govde);
    case "yaptirim-kaldir":
      return yaptirimKaldir(o, govde);
    case "sikayetler":
      return sikayetler(o, sorgu);
    case "sikayet-karar":
      return sikayetKarar(o, govde);
    case "parametreler":
      return parametreler(o);
    case "parametre":
      return parametreYaz(o, govde, false);
    case "parametre-geri":
      return parametreYaz(o, govde, true);
    case "rol":
      return rolYaz(o, govde);
    case "duyuru":
      return duyuruYaz(o, govde);
    case "kayit":
      return kayitOku(o, sorgu);
    case "debdebe":
      return debdebeListesi(o, sorgu);
    case "debdebe-iade":
      return debdebeIade(o, govde);
    default:
      return reddet(o, o.uc, "bulunamadi");
  }
}

export async function yonetimIsle(b: YonetimBaglami, ileti: YonetimIleti): Promise<Sonuc<unknown>> {
  switch (ileti.islem) {
    case "giris":
      return giris(b, ileti.yonetici);
    case "yonet":
      return yonet(b, ileti.yonetici, ileti.uc, ileti.govde, ileti.sorgu ?? {});
    case "sikayetEkle":
      return sikayetEkle(b, ileti.sikayetci, ileti.govde);
    case "duyurular":
      return duyurular(b);
    case "debdebeKayit":
      return debdebeKayit(b, ileti.kayit);
    default:
      return hata("gecersiz_istek");
  }
}
