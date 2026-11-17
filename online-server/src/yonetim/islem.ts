// YonetimDO iş kuralları (Workers'tan bağımsız; depo ve dış çağrılar parametre olarak gelir, node --test ile denenir).
// İlkeler (ana tasarım §7.2):
// - Rol istemciden alınmaz; her istekte ortamdaki kurucu listesi + depodaki rollerden çözülür.
// - Her yazan işlem ve rolü olan (ya da rolü alınmış) yöneticinin her başarısız denemesi işlem kaydına eklenir; kayıt
//   girdi başına ayrı anahtardır, yalnız eklenir, silen/düzenleyen yol yoktur. Oyuncu görüntüleme de kayda girer.
//   Rolsüz kişinin /yonetim/giris denemesi kaydı şişirmesin diye kayda yazılmaz: günlük sayaçta tutulur ve dakikalık
//   genel tavanla sınırlanır.
// - Yazan uçlar `istekNo` ile tekrar güvenlidir (anahtar uç + gövde özetini taşır) ve gerekçe ister.
// - Kurucu hiçbir şeyle sınırlanmaz (Berkay kuralı): kendine-fayda yasağı, telafi tavanları ve etkinlik süre sınırı
//   kurucuya uygulanmaz; işlemleri yine kayda girer. Moderatörün yetkileri kişi başıdır (yetki.ts, `modYetki`).
// - Kendine fayda yasağı (moderatör): kendi oyuncu hesabından yaptırım kaldıramaz, kendi hakkındaki şikayete karar
//   veremez, kendi hesap/hane kümesine telafi yapamaz.
// - Bir DO içinde yalnız depolama beklemeleri arasında başka istek araya girmez; bu yüzden her yazım, dış çağrılardan
//   (DunyaDO/HesapDO) sonra, yalnız depolama okuyup yazan tek bir bölümde yapılır ve orada tekrar denetimi yinelenir.
// - HesapDO'ya itme başarısızsa kayıt yine tutulur, yanıt `hesabaYazildi: false` der; aynı istekNo ile yeniden
//   gönderim ya da aynı hedefte herhangi bir yaptırım işlemi (yaptirim_yok dahil) güncel özeti yeniden iter.

import { b64urlKodla, utf8 } from "../b64.ts";
import type { Depo } from "../depo.ts";
import type { SiyasiKimlik } from "../siyaset/tipler.ts";
import { yerlesimBul } from "../dunya-veri.ts";
import { istekNoCoz } from "../mantik.ts";
import {
  basarili,
  hata,
  YONETIM_UCLARI,
  type DunyaIleti,
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
  masaKimligiCoz,
  ilanKimligiCoz,
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
import { etkinlikBaslat, etkinlikDurdur, etkinlikListesi } from "../etkinlik/yonetim.ts";
import { telafiGeri, telafiListesi, telafiUygula } from "./y2.ts";
import { anahtarGiris, oturumlariKapat, oturumSurumuOku } from "./oturum-yonetim.ts";
import { oyuncuAra, oyuncuAyrinti } from "./oyuncu.ts";
import { KURUCU_ANAHTAR_KIMLIGI } from "./kimlik.ts";
import {
  epostaDuzenle,
  ISLEM_ADLARI,
  MOD_TELAFI_VARSAYILAN,
  MOD_VARSAYILAN,
  MOD_YETKILERI,
  modTelafiTavaniCoz,
  modYetkileri,
  modYetkiListesiCoz,
  rolCoz,
  verilebilirRolMu,
  yetkiler,
  yetkiVar,
  type ModYetkisi,
  type Rol,
  type YonetimIslemi,
} from "./yetki.ts";
import { dunyaSurumu } from "../dunya-surumu.ts";

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
const MOD_YETKI = "modYetki"; // Record<eposta, ModYetkisi> (yalnız moderatörler; kayıt yoksa MOD_VARSAYILAN)
const KAYIT = "kayit:"; // + 12 hane → IslemKaydi (girdi başına bir anahtar; yalnız eklenir)
const ISTEK = "istek:"; // + eposta + "\n" + istekNo → IstekKaydi
const PARAM = "param:"; // + ad → ParametreKaydi
const YAPTIRIM = "yaptirim:"; // + hesap → Yaptirim[]
const YONETICI_HESAP = "yoneticiHesap:"; // + oyuncu hesabı → yöneticinin e-postası (girişte yazılır)
/** [PARAMETRE] Hedef başına tutulan yaptırım kaydı (etkin olanlar hiç atılmaz; tam geçmiş işlem kaydında). */
export const YAPTIRIM_LISTE_EN_COK = 50;
const SIKAYET = "sikayet:"; // + 12 hane → Sikayet
const SIKAYET_ACIK = "sikayetAcik"; // number[] (eskiden yeniye; hedef başına bir kayıt)
const SIKAYET_HEDEF = "sikayetHedef:"; // + hedef → açık şikayet numarası
const SIKAYETCI_ACIK = "sikayetciAcik:"; // + sikayetci → içinde bulunduğu şikayet numaraları
const SIKAYET_ISTEK = "sikayetIstek:"; // + sikayetci + "\n" + istekNo → {ozet, sonuc}
const SIKAYET_GUN = "sikayetGun:"; // + sikayetci → GunlukSayac
export const YETKISIZ_GIRIS = "yetkisizGiris:"; // + TR günü → sayı
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
  /** Y3: hedef ve yönetici hesabının aynı hesap/hane kümesinde olmadığını doğrulamak için siyasi kimlik. */
  siyasiKimlikOku?: (hesapId: string, yerlesim: string) => Promise<Sonuc<SiyasiKimlik>>;
  /** Y3: akçe/eşya telafisini hedef yerleşimde tekrar güvenli uygular. */
  telafiYaz?: (yerlesim: string, hedef: string, govde: unknown) => Promise<Sonuc<unknown>>;
  /** Hesabın etkin yaptırım özetini HesapDO'ya yazar. */
  hesabaYaz: (hedef: string, durum: HesapYaptirimi) => Promise<Sonuc<unknown>>;
  /** Debdebe iadesi (Y3): hedef HesapDO'ya iç ileti. Yoksa iade yapılamaz. */
  hesabaIlet?: (hedef: string, ileti: HesapIleti) => Promise<Sonuc<unknown>>;
  /** Rolsüz giriş denemeleri için genel (tüm kişiler) dakikalık tavan; false = tavan doldu. Yoksa sınırsız. */
  yetkisizGirisIzni?: () => boolean;
  /** Dünya sürümü (panelde salt bilgi; Debdebe defterinde eski dünyanın makbuzunu yeni hesaba bağlamak için). */
  dunyaSurumu?: string;
  /** Kurucu anahtarı (YONETIM_KURUCU_ANAHTARI; ≥32 karakter değilse anahtarla giriş kapalı). */
  kurucuAnahtari?: string;
  /** Kurucu anahtarı denemeleri: IP başına ve genel başarısız deneme sınırı (yonetim-do.ts). */
  anahtarSiniri?: { izin: (ip: string) => boolean; hata: (ip: string) => void };
  /** DunyaDO iç çağrısı (oyuncu araması, kimlik özeti). */
  dunyaCagir?: <T>(ileti: DunyaIleti) => Promise<Sonuc<T>>;
  /** YerlesimDO: oyuncu ayrıntısı (salt okuma). */
  ayrintiOku?: (yerlesim: string, hesap: string) => Promise<Sonuc<unknown>>;
}

export interface Oturum {
  b: YonetimBaglami;
  y: YoneticiKimligi;
  rol: Rol | undefined;
  /** Moderatörün kişisel yetkileri ve günlük telafi tavanı (kurucuda kullanılmaz). */
  modYetki?: readonly YonetimIslemi[];
  modTavan?: number;
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
  return yetkiVar(o.rol, islem, o.modYetki ?? MOD_VARSAYILAN) ? undefined : reddet(o, islem, "yetki_yok", ek);
}

/** Kurucu mu (kurucu hiçbir sınıra takılmaz). */
export const kurucuMu = (o: Oturum): boolean => o.rol === "kurucu";

// ---------------------------------------------------------------- ortak

async function rolBul(b: YonetimBaglami, eposta: string): Promise<Rol | undefined> {
  const roller = (await b.depo.al<Record<string, Rol>>(ROLLER)) ?? {};
  return rolCoz(eposta, b.kurucular, Object.hasOwn(roller, eposta) ? roller[eposta] : undefined);
}

/** Kurucu anahtarı oturumu: sabit kimlik ve anahtar hâlâ tanımlıysa kurucudur (anahtar kaldırılınca hemen düşer). */
function anahtarKimligiMi(b: YonetimBaglami, y: { sub: string; eposta: string }): boolean {
  return y.sub === KURUCU_ANAHTAR_KIMLIGI.sub && y.eposta === KURUCU_ANAHTAR_KIMLIGI.eposta;
}

export function anahtarAcik(b: YonetimBaglami): boolean {
  return typeof b.kurucuAnahtari === "string" && b.kurucuAnahtari.length >= 32;
}

/** Kimliğin rolü ve (moderatörse) kişisel yetkileri. */
export async function yoneticiCoz(b: YonetimBaglami, y: { sub: string; eposta: string }): Promise<{ rol: Rol | undefined; modYetki: readonly YonetimIslemi[]; modTavan: number }> {
  if (anahtarKimligiMi(b, y)) return { rol: anahtarAcik(b) ? "kurucu" : undefined, modYetki: [], modTavan: 0 };
  const rol = await rolBul(b, y.eposta);
  if (rol !== "moderator") return { rol, modYetki: [], modTavan: 0 };
  const mod = (await b.depo.al<Record<string, ModYetkisi>>(MOD_YETKI)) ?? {};
  const k = Object.hasOwn(mod, y.eposta) ? mod[y.eposta] : undefined;
  return { rol, modYetki: modYetkileri(k), modTavan: k?.t ?? MOD_TELAFI_VARSAYILAN };
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

/**
 * Yönetici koruması (17 Kasım denetimi S9): kendi oyuncu hesabına yaptırım yok; başka bir yöneticinin hesabına
 * yalnız kurucu yaptırım verebilir. Hata kodu ya da undefined.
 */
async function yaptirimHedefDenetle(o: Oturum, hedef: string): Promise<"kendi_hedef" | "yetki_yok" | undefined> {
  if (kurucuMu(o)) return undefined;
  if (hedef === o.y.hesap) return "kendi_hedef";
  const eposta = await o.b.depo.al<string>(YONETICI_HESAP + hedef);
  if (eposta === o.y.eposta) return "kendi_hedef";
  if (eposta && (await rolBul(o.b, eposta))) return "yetki_yok";
  return undefined;
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
  // Son YAPTIRIM_LISTE_EN_COK; önce en eski etkin olmayanlar atılır (etkin yaptırım düşmez).
  while (liste.length > YAPTIRIM_LISTE_EN_COK) {
    const i = liste.findIndex((x) => !yaptirimEtkin(x, b.simdi));
    if (i < 0) break;
    liste.splice(i, 1);
  }
  return { degisiklik: { [SAYAC_YAPTIRIM]: id, [YAPTIRIM + hedef]: liste }, yaptirim, ozet: etkinOzet(liste, b.simdi) };
}

function bitisHesapla(tur: YaptirimTuru, gun: number | undefined, simdi: number): number | null {
  return tur === "kaliciUzaklastirma" ? null : simdi + (gun ?? 1) * GUN_MS;
}

// ---------------------------------------------------------------- giriş ve ben

async function giris(b: YonetimBaglami, y: YoneticiKimligi): Promise<Sonuc<{ rol: Rol; oturumSurumu: number }>> {
  // Google girişi kurucu anahtarı kimliğine bürünemez.
  if (anahtarKimligiMi(b, y)) return hata("yetki_yok");
  const rol = await rolBul(b, y.eposta);
  if (!rol) {
    // Kalıcı kayda yazılmaz (herkes Google hesabı açabilir); yalnız günlük sayaç ve genel dakikalık tavan.
    if (b.yetkisizGirisIzni && !b.yetkisizGirisIzni()) return hata("hiz_siniri");
    const anahtar = YETKISIZ_GIRIS + trGunu(b.simdi);
    await b.depo.koy({ [anahtar]: ((await b.depo.al<number>(anahtar)) ?? 0) + 1 });
    return hata("yetki_yok");
  }
  const o: Oturum = { b, y, rol, uc: "giris", ozet: "" };
  await b.depo.koy({ ...(await kayitHazirla(o, "giris", "tamam", {})), ...(y.hesap ? { [YONETICI_HESAP + y.hesap]: y.eposta } : {}) });
  return basarili({ rol, oturumSurumu: await oturumSurumuOku(b, y.eposta) });
}

async function ben(o: Oturum): Promise<Sonuc<unknown>> {
  const kurucu = o.rol === "kurucu";
  return basarili({
    eposta: o.y.eposta,
    rol: o.rol,
    yetkiler: yetkiler(o.rol, o.modYetki ?? MOD_VARSAYILAN),
    kendiHesap: o.y.hesap,
    ortamKurucusu: o.b.kurucular.has(o.y.eposta),
    anahtarOturumu: anahtarKimligiMi(o.b, o.y),
    dunyaSurumu: o.b.dunyaSurumu ?? dunyaSurumu({}),
    ...(kurucu ? { yetkisizGirisBugun: (await o.b.depo.al<number>(YETKISIZ_GIRIS + trGunu(o.b.simdi))) ?? 0 } : { telafiTavan: o.modTavan ?? 0 }),
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
  const koruma = await yaptirimHedefDenetle(o, hedef);
  if (koruma) return reddet(o, tur, koruma, ek);

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
  if (!kurucuMu(o) && hamHedef === o.y.hesap) return reddet(o, "yaptirimKaldir", "kendi_hedef", ek);
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

/** Hesap kimliklerinin ad + numarası (DunyaDO). Ulaşılamazsa boş sözlük (liste yine döner). */
export async function kimlikOzeti(b: YonetimBaglami, hesaplar: string[]): Promise<Record<string, { ad: string; numara: number | null; yerlesim?: string | null }>> {
  const tekil = [...new Set(hesaplar)].slice(0, 200);
  if (!b.dunyaCagir || tekil.length === 0) return {};
  try {
    const r = await b.dunyaCagir<Record<string, { ad: string; numara: number | null; yerlesim: string | null }>>({ islem: "kimlikOzet", hesaplar: tekil });
    return r.ok ? r.deger : {};
  } catch {
    return {};
  }
}

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
  const secilen = idler
    .map((i) => kayitlar.get(SIKAYET + hane(i)))
    .filter((s): s is Sikayet => s !== undefined && s.durum === durum)
    .slice(0, SIKAYET_SAYFASI);
  // Ham kimlik yerine ad + oyuncu numarası (DunyaDO; ulaşılamazsa kimlikler yine durur, ad boş kalır).
  const kimlikler = await kimlikOzeti(o.b, secilen.flatMap((s) => [s.hedef, s.sikayetci, ...s.bildirimler.map((x) => x.sikayetci)]));
  const kisi = (h: string) => kimlikler[h] ?? { ad: "", numara: null };
  const liste = secilen.map((s) => ({
    ...s,
    ...(s.karar ? { karar: kimGizle(o, s.karar) } : {}),
    kendi: s.hedef === o.y.hesap,
    hedefKisi: kisi(s.hedef),
    sikayetciKisi: kisi(s.sikayetci),
    bildirimler: s.bildirimler.map((b) => ({ ...b, sikayetciKisi: kisi(b.sikayetci) })),
  }));
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
  if (!kurucuMu(o) && s.hedef === o.y.hesap) return reddet(o, "sikayetKarar", "kendi_hedef", ekH);
  if (sure) {
    const koruma = await yaptirimHedefDenetle(o, s.hedef);
    if (koruma) return reddet(o, "sikayetKarar", koruma, ekH);
  }
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
export async function sikayetEkle(b: YonetimBaglami, sikayetci: string, govde: unknown, masaHam?: unknown, ilanHam?: unknown): Promise<Sonuc<unknown>> {
  const masa = masaKimligiCoz(masaHam);
  const ilan = ilanKimligiCoz(ilanHam);
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

  const bildirim = { sikayetci, neden, zaman: b.simdi, ...(aciklama ? { aciklama } : {}), ...(masa ? { masa } : {}), ...(ilan ? { ilan } : {}) };
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

/**
 * POST /yonetim/rol {eposta, rol: "moderator" | null, yetkiler?, telafiTavan?, gerekce, istekNo}: moderatör ekler,
 * kaldırır ya da kişisel yetkilerini (kutucuklar) ve günlük telafi tavanını değiştirir. Yalnız kurucu (rolVer).
 * `yetkiler` verilmezse mevcut kayıt korunur (yeni moderatörde varsayılan yetkiler).
 */
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
  const yetkiListesi = g.yetkiler === undefined ? undefined : modYetkiListesiCoz(g.yetkiler);
  if (g.yetkiler !== undefined && !yetkiListesi) return reddet(o, "rolVer", "yetki_gecersiz", { ...ek0, ayrinti: { yetkiler: g.yetkiler } });
  const tavan = g.telafiTavan === undefined ? undefined : modTelafiTavaniCoz(g.telafiTavan);
  if (g.telafiTavan !== undefined && tavan === undefined) return reddet(o, "rolVer", "deger_sinir_disi", { ...ek0, ayrinti: { telafiTavan: g.telafiTavan } });
  const gerekce = gerekceCoz(g.gerekce);
  if (!gerekce.ok) return reddet(o, "rolVer", gerekce.hata, ek0);
  const ek: Ek = { hedef: eposta, gerekce: gerekce.deger, ayrinti: { rol } };
  if (o.b.kurucular.has(eposta) || eposta === KURUCU_ANAHTAR_KIMLIGI.eposta) return reddet(o, "rolVer", "kurucu_degismez", ek);
  const onceki = await tekrar(o, no.deger);
  if (onceki) return onceki;

  const roller = (await o.b.depo.al<Record<string, Rol>>(ROLLER)) ?? {};
  const modlar = (await o.b.depo.al<Record<string, ModYetkisi>>(MOD_YETKI)) ?? {};
  const eski = Object.hasOwn(roller, eposta) ? roller[eposta] : undefined;
  const eskiYetki = Object.hasOwn(modlar, eposta) ? modlar[eposta] : undefined;
  if (rol === null) {
    delete roller[eposta];
    delete modlar[eposta];
  } else {
    roller[eposta] = rol;
    modlar[eposta] = {
      y: yetkiListesi ?? (eskiYetki ? [...modYetkileri(eskiYetki)] : [...MOD_VARSAYILAN]),
      t: tavan ?? eskiYetki?.t ?? MOD_TELAFI_VARSAYILAN,
    };
  }
  const yeniYetki = rol === null ? null : modlar[eposta]!;
  const sonuc = basarili({ eposta, rol, roller, moderator: yeniYetki ? { yetkiler: yeniYetki.y, telafiTavan: yeniYetki.t } : null, kurucular: [...o.b.kurucular] });
  await yaz(
    o, no.deger, "rolVer",
    { ...ek, ayrinti: { rol, onceki: eski ?? null, yetkiler: yeniYetki?.y ?? null, oncekiYetkiler: eskiYetki ? modYetkileri(eskiYetki) : null, telafiTavan: yeniYetki?.t ?? null } },
    { [ROLLER]: roller, [MOD_YETKI]: modlar },
    sonuc,
  );
  return sonuc;
}

/** GET /yonetim/moderatorler: moderatörler, kişisel yetkileri ve verilebilecek yetkilerin listesi (yalnız kurucu). */
async function moderatorler(o: Oturum): Promise<Sonuc<unknown>> {
  const red = await yetkiIste(o, "rolVer");
  if (red) return red;
  const roller = (await o.b.depo.al<Record<string, Rol>>(ROLLER)) ?? {};
  const modlar = (await o.b.depo.al<Record<string, ModYetkisi>>(MOD_YETKI)) ?? {};
  const liste = Object.keys(roller).filter((e) => roller[e] === "moderator" && !o.b.kurucular.has(e)).sort().map((eposta) => {
    const k = Object.hasOwn(modlar, eposta) ? modlar[eposta] : undefined;
    return { eposta, yetkiler: modYetkileri(k), telafiTavan: k?.t ?? MOD_TELAFI_VARSAYILAN, kisisel: k !== undefined };
  });
  return basarili({
    moderatorler: liste,
    secenekler: MOD_YETKILERI.map((islem) => ({ islem, ad: ISLEM_ADLARI[islem] })),
    varsayilan: MOD_VARSAYILAN,
    telafiTavan: { varsayilan: MOD_TELAFI_VARSAYILAN, enCok: 50_000 },
  });
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
  const kim = await yoneticiCoz(b, y);
  const o: Oturum = { b, y, rol: kim.rol, modYetki: kim.modYetki, modTavan: kim.modTavan, uc: String(uc).slice(0, 32), ozet: yazan ? await govdeOzeti(govde) : "" };
  // Geçerli yönetici belirteci taşıyan rolsüz istek (rolü alınmış kişi) kayda girer; belirteç en çok 12 saat yaşar.
  if (!o.rol) return reddet(o, o.uc, "yetki_yok");
  // "Her yerden çık": belirteçteki oturum sürümü güncel değilse oturum düşer.
  if ((y.surum ?? 0) !== (await oturumSurumuOku(b, y.eposta))) return hata("oturum_gecersiz");
  switch (uc) {
    case "ben":
      return ben(o);
    case "ekonomi": {
      const red = await yetkiIste(o, "ekonomi");
      if (red) return red;
      return o.b.ekonomiOku ? o.b.ekonomiOku() : hata("gecersiz_istek");
    }
    case "telafi-geri":
      return telafiGeri(o, govde);
    case "oyuncu-ara":
      return oyuncuAra(o, sorgu);
    case "oyuncu-ayrinti":
      return oyuncuAyrinti(o, sorgu);
    case "moderatorler":
      return moderatorler(o);
    case "oturumlari-kapat":
      return oturumlariKapat(o, govde);
    case "telafiler":
      return telafiListesi(o, sorgu);
    case "telafi":
      return telafiUygula(o, govde);
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
    case "etkinlikler":
      return etkinlikListesi(o);
    case "etkinlik-baslat":
      return etkinlikBaslat(o, govde);
    case "etkinlik-durdur":
      return etkinlikDurdur(o, govde);
    default:
      return reddet(o, o.uc, "bulunamadi");
  }
}

export async function yonetimIsle(b: YonetimBaglami, ileti: YonetimIleti): Promise<Sonuc<unknown>> {
  switch (ileti.islem) {
    case "giris":
      return giris(b, ileti.yonetici);
    case "anahtarGiris":
      return anahtarGiris(b, ileti.ip, ileti.anahtar);
    case "yonet":
      return yonet(b, ileti.yonetici, ileti.uc, ileti.govde, ileti.sorgu ?? {});
    case "sikayetEkle":
      return sikayetEkle(b, ileti.sikayetci, ileti.govde, ileti.masa, ileti.ilan);
    case "duyurular":
      return duyurular(b);
    case "debdebeKayit":
      return debdebeKayit(b, ileti.kayit);
    default:
      return hata("gecersiz_istek");
  }
}
