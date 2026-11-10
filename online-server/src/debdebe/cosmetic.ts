// Debdebe sahipliği: HesapDO'da ayrı `cosmetic` alanı (GDD §19 teknik sözleşme). Oyun mantığı bu alanı OKUMAZ:
// oyun hesaplayan modüller (src/yerlesim, src/han, src/icerik) src/debdebe/ içe aktaramaz (test/debdebe.test.ts
// zorlar). Akçe ile gerçek para arasında dönüşüm yoktur; stok devredilmez, satılmaz, akçeye dönmez. Saf fonksiyonlar.

import { basarili, hata, type Sonuc } from "../tipler.ts";
import type { GunlukSayac } from "../yonetim/sikayet.ts";
import {
  AYAN_RAHATLIK,
  AYAN_SURE_GUN,
  KATALOG,
  seviyeAdi,
  urun,
  urunPuani,
  YUVA_ADLARI,
  type UrunId,
  type Yuva,
} from "./katalog.ts";
import type { MakbuzBilgisi } from "./makbuz.ts";
import { sezonKaydi, sezonSeviyesi, yeniOduller, type SezonKaydi } from "./sezon.ts";

/** Depo anahtarı (HesapDO). */
export const COSMETIC = "cosmetic";
/** [PARAMETRE] Tutulan alınan rozet, verilen armağan ve istek izi sayıları. */
export const ROZET_EN_COK = 50;
export const VERILEN_EN_COK = 100;
export const IST_EN_COK = 64;
const GUN_MS = 24 * 60 * 60 * 1000;

export interface SahipKaydi {
  /** Kaynak: satın alma ya da sezon izi. */
  k: "satin" | "sezon";
  /** Mağaza işlem kimliği (ücretli iz ödülünde iz satın alımının kimliği; bedava izde yok). */
  i?: string;
  z: number;
}

export interface MagazaIslemi {
  u: UrunId;
  z: number;
  d: "verildi" | "iade";
  magaza: string;
  /** Ayan: bu işlemin eklediği süre (ms). Sezon: izin sezonu. */
  ek?: number;
  s?: number;
  test?: true;
}

export interface Rozet {
  /** Kimlik: veren hesap + istekNo özeti (tekrar güvenli). */
  id: string;
  u: UrunId;
  /** Verenin görünen adı (o anki). */
  v: string;
  z: number;
}

export interface VerilenArmagan {
  id: string;
  u: UrunId;
  /** Alanın hesabı ve yerleşimi (iadede teveccüh geri alınır, rozet silinir). */
  h: string;
  y: string;
  t: number;
  z: number;
  geri?: true;
}

export interface Cosmetic {
  /** Kalıcı sahiplik. */
  s: Partial<Record<UrunId, SahipKaydi>>;
  /** Kuşanılanlar: yuva → ürünler (mühürde Ayan'la 2 yuva; ötekilerde 1). */
  y: Partial<Record<Yuva, UrunId[]>>;
  /** Tüketilebilir stok (armağan, kısaltma); eksi = iade borcu (sonraki alım önce borcu kapatır). */
  st: Partial<Record<UrunId, number>>;
  /** Debdebe puanı (harcama; seviye etiketi). */
  p: number;
  /** Mağaza işlemleri (işlem kimliği → kayıt). */
  i: Record<string, MagazaIslemi>;
  /** Ayan bitişi (ms). */
  ay?: number;
  /** Cömertler Levhası'nda anılmak (varsayılan kapalı). */
  lv?: boolean;
  sz?: SezonKaydi;
  rz?: Rozet[];
  ar?: VerilenArmagan[];
  /** Günlük Debdebe armağanı sayacı. */
  ag?: GunlukSayac;
  /** istekNo → yanıt (son IST_EN_COK). */
  ist?: [string, unknown][];
}

export function bosCosmetic(): Cosmetic {
  return { s: {}, y: {}, st: {}, p: 0, i: {} };
}

export function ayanEtkin(c: Cosmetic, simdi: number): boolean {
  return (c.ay ?? 0) > simdi;
}

export function sahipMi(c: Cosmetic, id: UrunId, simdi: number): boolean {
  const u = urun(id);
  if (u.ayanOzel) return ayanEtkin(c, simdi);
  return c.s[id] !== undefined;
}

export function yuvaKapasitesi(c: Cosmetic, yuva: Yuva, simdi: number): number {
  return yuva === "muhur" && ayanEtkin(c, simdi) ? AYAN_RAHATLIK.muhurYuvasi : 1;
}

export function istekBul(c: Cosmetic, no: string): unknown {
  return c.ist?.find((x) => x[0] === no)?.[1];
}

export function istekYaz(c: Cosmetic, no: string, yanit: unknown): void {
  const ist = (c.ist ??= []);
  ist.push([no, yanit]);
  if (ist.length > IST_EN_COK) ist.splice(0, ist.length - IST_EN_COK);
}

function kusanilanlariTemizle(c: Cosmetic, id: UrunId): void {
  for (const y of YUVA_ADLARI) {
    const l = c.y[y];
    if (!l) continue;
    const yeni = l.filter((x) => x !== id);
    if (yeni.length) c.y[y] = yeni;
    else delete c.y[y];
  }
}

function sezonOdulleriniVer(c: Cosmetic, oduller: { urun: UrunId; iz: "bedava" | "ucretli" }[], simdi: number, izIslem?: string): UrunId[] {
  const verilen: UrunId[] = [];
  for (const o of oduller) {
    if (c.s[o.urun]) continue;
    c.s[o.urun] = { k: "sezon", z: simdi, ...(o.iz === "ucretli" && izIslem ? { i: izIslem } : {}) };
    verilen.push(o.urun);
  }
  return verilen;
}

/** Sezon puanı ekler (oyun yazması başarılı oldu); kazanılan ödülleri sahipliğe yazar. */
export function sezonPuanla(c: Cosmetic, simdi: number, ilerle: (sz: SezonKaydi) => { eklenen: number; oduller: { urun: UrunId; iz: "bedava" | "ucretli" }[] }) {
  const sz = (c.sz = sezonKaydi(c.sz, simdi));
  const r = ilerle(sz);
  return { eklenen: r.eklenen, verilen: sezonOdulleriniVer(c, r.oduller, simdi, sz.u) };
}

export interface Verilen {
  urun: UrunId;
  tur: string;
  stok?: number;
  ayanBitis?: number;
  sezonOdulleri?: UrunId[];
  puan: number;
}

/** Satın almadan önce: kalıcı ürün zaten sahipliğindeyse (satın alarak) ya da bu sezonun izi alınmışsa. */
export function satinAlinabilir(c: Cosmetic, id: UrunId, simdi: number): Sonuc<true> {
  const u = urun(id);
  if (!u.kademe) return hata("urun_satilmaz");
  if (u.bitis && Date.parse(u.bitis) <= simdi) return hata("urun_satilmaz");
  if (u.tur === "kalici" && c.s[id]?.k === "satin") return hata("zaten_sahip");
  if (u.tur === "sezon" && sezonKaydi(c.sz, simdi).u !== undefined) return hata("zaten_sahip");
  return basarili(true);
}

/**
 * Doğrulanmış makbuzu uygular. Aynı işlem kimliği ikinci kez varlık vermez (önceki sonucu döner).
 * `c` yerinde değişir.
 */
export function satinAlimUygula(c: Cosmetic, id: UrunId, b: MakbuzBilgisi, simdi: number): Sonuc<{ verilen: Verilen; tekrar: boolean }> {
  const onceki = c.i[b.islemKimligi];
  if (onceki) {
    if (onceki.u !== id) return hata("makbuz_gecersiz");
    return basarili({ verilen: { urun: id, tur: urun(id).tur, puan: 0 }, tekrar: true });
  }
  const u = urun(id);
  const puan = urunPuani(id);
  const kayit: MagazaIslemi = { u: id, z: simdi, d: "verildi", magaza: b.magaza, ...(b.test ? { test: true as const } : {}) };
  const verilen: Verilen = { urun: id, tur: u.tur, puan };
  switch (u.tur) {
    case "kalici":
      c.s[id] = { k: "satin", i: b.islemKimligi, z: simdi };
      break;
    case "armagan":
    case "kisaltma":
      c.st[id] = (c.st[id] ?? 0) + 1;
      verilen.stok = c.st[id];
      break;
    case "ayan": {
      const once = Math.max(simdi, c.ay ?? 0);
      const sonra = Math.max(once + AYAN_SURE_GUN * GUN_MS, b.bitis ?? 0);
      c.ay = sonra;
      kayit.ek = sonra - once;
      verilen.ayanBitis = sonra;
      break;
    }
    case "sezon": {
      const sz = (c.sz = sezonKaydi(c.sz, simdi));
      if (sz.u !== undefined) return hata("zaten_sahip");
      sz.u = b.islemKimligi;
      kayit.s = sz.n;
      verilen.sezonOdulleri = sezonOdulleriniVer(c, yeniOduller(0, sezonSeviyesi(sz.p), true).filter((o) => o.iz === "ucretli"), simdi, b.islemKimligi);
      break;
    }
  }
  c.p += puan;
  c.i[b.islemKimligi] = kayit;
  return basarili({ verilen, tekrar: false });
}

export interface IadeSonucu {
  islem: string;
  urun: UrunId;
  geriAlinan: UrunId[];
  stok?: number;
  /** Stok bitmişse ve ürün armağansa: geri alınacak son verilen armağan (teveccüh ve rozet). */
  armagan?: VerilenArmagan;
  ayanBitis?: number;
  tekrar: boolean;
}

/** İade: varlığı geri alır (sahiplik, stok, Ayan süresi, sezon izi ödülleri), puanı düşer. `c` yerinde değişir. */
export function iadeUygula(c: Cosmetic, islem: string, simdi: number, secilen?: string): Sonuc<IadeSonucu> {
  const k = c.i[islem];
  if (!k) return hata("islem_yok");
  if (k.d === "iade") return basarili({ islem, urun: k.u, geriAlinan: [], tekrar: true });
  const u = urun(k.u);
  const sonuc: IadeSonucu = { islem, urun: k.u, geriAlinan: [], tekrar: false };
  switch (u.tur) {
    case "kalici":
      if (c.s[k.u]?.i === islem) {
        delete c.s[k.u];
        kusanilanlariTemizle(c, k.u);
        sonuc.geriAlinan.push(k.u);
      }
      break;
    case "armagan":
    case "kisaltma": {
      const st = c.st[k.u] ?? 0;
      const verilen = u.tur === "armagan" && st <= 0 ? [...(c.ar ?? [])].reverse().find((a) => a.u === k.u && !a.geri && (secilen === undefined || a.id === secilen)) : undefined;
      if (verilen) {
        verilen.geri = true;
        sonuc.armagan = verilen;
      } else {
        c.st[k.u] = st - 1;
        if (c.st[k.u] === 0) delete c.st[k.u];
      }
      sonuc.stok = c.st[k.u] ?? 0;
      break;
    }
    case "ayan":
      c.ay = Math.max(0, (c.ay ?? 0) - (k.ek ?? 0));
      sonuc.ayanBitis = c.ay;
      if (!ayanEtkin(c, simdi)) {
        for (const id of Object.keys(KATALOG) as UrunId[]) if (urun(id).ayanOzel) kusanilanlariTemizle(c, id);
      }
      break;
    case "sezon":
      for (const id of Object.keys(c.s) as UrunId[]) {
        if (c.s[id]?.i === islem) {
          delete c.s[id];
          kusanilanlariTemizle(c, id);
          sonuc.geriAlinan.push(id);
        }
      }
      if (c.sz && c.sz.u === islem) delete c.sz.u;
      break;
  }
  c.p = Math.max(0, c.p - urunPuani(k.u));
  k.d = "iade";
  return basarili(sonuc);
}

/** Kuşan: sahip olunmalı, yuvası tutmalı; `urun` null ise yuva (ya da sıra) boşalır. */
export function kusan(c: Cosmetic, yuvaHam: unknown, urunHam: unknown, siraHam: unknown, simdi: number): Sonuc<Partial<Record<Yuva, UrunId[]>>> {
  if (typeof yuvaHam !== "string" || !(YUVA_ADLARI as string[]).includes(yuvaHam)) return hata("yuva_gecersiz");
  const yuva = yuvaHam as Yuva;
  const sira = siraHam === undefined ? 0 : siraHam;
  if (typeof sira !== "number" || !Number.isInteger(sira) || sira < 0) return hata("yuva_gecersiz");
  if (sira >= yuvaKapasitesi(c, yuva, simdi)) return hata("yuva_kapali");
  const liste = [...(c.y[yuva] ?? [])];
  if (urunHam === null) {
    liste.splice(sira, 1);
  } else {
    if (typeof urunHam !== "string" || !Object.hasOwn(KATALOG, urunHam)) return hata("urun_gecersiz");
    const id = urunHam as UrunId;
    if (urun(id).yuva !== yuva) return hata("yuva_gecersiz");
    if (!sahipMi(c, id, simdi)) return hata("sahip_degil");
    const var_ = liste.indexOf(id);
    if (var_ >= 0) liste.splice(var_, 1);
    liste.splice(Math.min(sira, liste.length), 0, id);
    liste.length = Math.min(liste.length, yuvaKapasitesi(c, yuva, simdi));
  }
  if (liste.length) c.y[yuva] = liste;
  else delete c.y[yuva];
  return basarili(c.y);
}

/** Herkese görünen kuşanılmışlar (Ayan bittiyse Ayan'a özel olanlar ve ek mühür yuvası görünmez). */
export function gorunenler(c: Cosmetic, simdi: number): Partial<Record<Yuva, UrunId[]>> {
  const r: Partial<Record<Yuva, UrunId[]>> = {};
  for (const y of YUVA_ADLARI) {
    const l = (c.y[y] ?? []).filter((id) => sahipMi(c, id, simdi)).slice(0, yuvaKapasitesi(c, y, simdi));
    if (l.length) r[y] = l;
  }
  return r;
}

/** Başkalarının gördüğü Debdebe görünüşü (masa plakası, profil, şehir kapısı): oyun etkisi yoktur. */
export function herkeseGorunum(c: Cosmetic | undefined, simdi: number) {
  if (!c) return { kusanilan: {}, seviye: null, ayan: false, rozetler: [] as { u: UrunId; v: string; z: number }[] };
  return {
    kusanilan: gorunenler(c, simdi),
    seviye: seviyeAdi(c.p),
    ayan: ayanEtkin(c, simdi),
    rozetler: (c.rz ?? []).slice(-12).reverse().map((r) => ({ u: r.u, v: r.v, z: r.z })),
  };
}

/** Masa plakasına iliştirilen süs (MasaDO içeriğe bakmaz, yalnız taşır). */
export function plakaSusu(c: Cosmetic | undefined, simdi: number): Record<string, string> | undefined {
  if (!c) return undefined;
  const g = gorunenler(c, simdi);
  const s: Record<string, string> = {};
  for (const y of ["cerceve", "balon", "masaSusu", "kaftan", "baslik", "nisan", "anons"] as const) {
    const id = g[y]?.[0];
    if (id) s[y] = id;
  }
  const sv = seviyeAdi(c.p);
  if (sv) s.seviye = sv;
  return Object.keys(s).length ? s : undefined;
}

/** Alınan armağan rozeti (tekrar güvenli). */
export function rozetEkle(c: Cosmetic, r: Rozet): boolean {
  const rz = (c.rz ??= []);
  if (rz.some((x) => x.id === r.id)) return false;
  rz.push(r);
  if (rz.length > ROZET_EN_COK) rz.splice(0, rz.length - ROZET_EN_COK);
  return true;
}

export function rozetSil(c: Cosmetic, id: string): boolean {
  const rz = c.rz ?? [];
  const i = rz.findIndex((x) => x.id === id);
  if (i < 0) return false;
  rz.splice(i, 1);
  return true;
}

export function verilenEkle(c: Cosmetic, a: VerilenArmagan): void {
  const ar = (c.ar ??= []);
  ar.push(a);
  if (ar.length > VERILEN_EN_COK) ar.splice(0, ar.length - VERILEN_EN_COK);
}

/** Oyuncunun kendi Debdebe görünümü (seviye yalnız etiket; puan ve "sonraki seviyeye şu kadar" gösterilmez). */
export function benGorunumu(c: Cosmetic, simdi: number) {
  return {
    sahip: (Object.keys(KATALOG) as UrunId[]).filter((id) => sahipMi(c, id, simdi)),
    kusanilan: gorunenler(c, simdi),
    stok: c.st,
    seviye: seviyeAdi(c.p),
    ayan: { etkin: ayanEtkin(c, simdi), bitis: c.ay ?? null, rahatlik: AYAN_RAHATLIK },
    levhaGorunur: c.lv === true,
    rozetler: (c.rz ?? []).slice().reverse().map((r) => ({ u: r.u, v: r.v, z: r.z })),
  };
}
