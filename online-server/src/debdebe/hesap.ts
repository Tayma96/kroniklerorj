// HesapDO ↔ Debdebe köprüsü: oyuncunun `cosmetic` alanı (sahiplik, kuşanma, stok, Ayan, Sezon Defteri, levha tercihi,
// rozetler) burada okunur ve yazılır. Akış: mağaza ödemesi → makbuz doğrulama (MakbuzDogrulayici) → YonetimDO
// defterinde işlem kimliğinin bütün hesaplarda tek kez sahiplenilmesi → varlık verme. Her yazma istekNo ile tekrar
// güvenlidir; DO dışı çağrılardan sonra kayıt yeniden okunur ve yazım yalnız depolama bekleyen tek bölümde yapılır.
// `DEBDEBE_ACIK` kapalıyken satın alma, Debdebe armağanı ve Debdebe süre kısaltması `debdebe_kapali` döner; katalog,
// Dene, kuşanma ve Sezon Defteri (oynayarak) çalışır.

import { b64urlKodla, utf8 } from "../b64.ts";
import type { Depo } from "../depo.ts";
import { yerlesimBul } from "../dunya-veri.ts";
import { HAN_DUZENI, masaAdi, masaNoCoz, masaSayisi } from "../han/kurallar.ts";
import type { MasaCagir } from "../han/hesap-kopru.ts";
import { istekNoCoz, profilGetir, type YerlesimIstegi } from "../mantik.ts";
import { basarili, hata, type HesapIleti, type Sonuc } from "../tipler.ts";
import { gunlukSay, type GunlukSayac } from "../yonetim/sikayet.ts";
import { dilCoz } from "../yerlesim/ortak.ts";
import {
  benGorunumu,
  bosCosmetic,
  COSMETIC,
  gorunenler,
  herkeseGorunum,
  plakaSusu as kozmetikPlakaSusu,
  iadeUygula,
  istekBul,
  istekYaz,
  kusan,
  rozetEkle,
  rozetSil,
  sahipMi,
  satinAlimUygula,
  satinAlinabilir,
  sezonPuanla,
  verilenEkle,
  type Cosmetic,
  type Rozet,
} from "./cosmetic.ts";
import { denePaketi } from "./dene.ts";
import { DEBDEBE_SEVIYELERI, FIYAT_KADEMELERI, katalogGorunumu, magazaUrunKimligi, seviyeAdi, urun, urunBul, urunPuani } from "./katalog.ts";
import type { LevhaYazimi } from "./levha.ts";
import { AKCE_LEVHA_ORANI } from "./levha.ts";
import { magazaCoz, makbuzDenetle, MAKBUZ_EN_UZUN, type MakbuzDogrulayici } from "./makbuz.ts";
import { sezonGorunumu, sezonIlerle, sezonKaydi } from "./sezon.ts";

/** [PARAMETRE] Oyuncu başına günlük Debdebe armağanı sınırı (TR günü). */
export const ARMAGAN_GUNLUK = 10;

/** HesapDO → YonetimDO: işlem kimliğinin sahiplenilmesi (bütün hesaplarda tek). */
export interface DebdebeDefterIstegi {
  islem: string;
  magaza: string;
  urun: string;
  hesap: string;
  zaman: number;
  test?: boolean;
}

export interface DebdebeBaglami {
  depo: Depo;
  hesapId: string;
  simdi: number;
  /** `DEBDEBE_ACIK === "1"`. */
  acik: boolean;
  /** Mağaza test satın almaları kabul edilsin mi (`DEBDEBE_TEST_MAKBUZ === "1"`; üretimde kapalı). */
  testMakbuz: boolean;
  dogrulayici: MakbuzDogrulayici;
  defter: (k: DebdebeDefterIstegi) => Promise<Sonuc<unknown>>;
  /** Oyuncunun kendi yerleşimine (profil işaretçisiyle). */
  yerlesime: (i: YerlesimIstegi) => Promise<Sonuc<unknown>>;
  /** Belirli bir yerleşime (iade: armağanı alanın yerleşimi). */
  yerlesimeDogrudan: (yerlesim: string, i: YerlesimIstegi) => Promise<Sonuc<unknown>>;
  hesaba: (hedef: string, i: HesapIleti) => Promise<Sonuc<unknown>>;
  levhaya: (y: LevhaYazimi) => Promise<Sonuc<unknown>>;
  levhaGetir: (beylik: string) => Promise<Sonuc<unknown>>;
  masaCagir?: MasaCagir;
}

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

async function oku(depo: Depo): Promise<Cosmetic> {
  return (await depo.al<Cosmetic>(COSMETIC)) ?? bosCosmetic();
}

async function kaydet(depo: Depo, c: Cosmetic): Promise<void> {
  await depo.koy({ [COSMETIC]: c });
}

/** Kısa, istekNo biçimine uyan kimlik (SHA-256, base64url ilk 40). */
export async function kisaKimlik(metin: string): Promise<string> {
  return `k${b64urlKodla(await crypto.subtle.digest("SHA-256", utf8(metin))).slice(0, 40)}`;
}

async function levhayaBildir(b: DebdebeBaglami, c: Cosmetic, puan: number): Promise<void> {
  if (c.lv !== true || puan <= 0) return;
  const p = await profilGetir(b.depo);
  if (!p.ok) return;
  try {
    await b.levhaya({ beylik: p.deger.beylik, hesap: b.hesapId, ad: p.deger.ad, puan, seviye: seviyeAdi(c.p), gorunur: true });
  } catch {
    // en iyi çaba: levha oyun etkisi taşımaz
  }
}

function gunlukKalan(ag: GunlukSayac | undefined, simdi: number): number {
  const s = gunlukSay(ag, simdi, ARMAGAN_GUNLUK);
  return s.izin ? ARMAGAN_GUNLUK - s.durum.n + 1 : 0;
}

// ---------------------------------------------------------------- okuma

export async function debdebeOku(b: DebdebeBaglami): Promise<Sonuc<unknown>> {
  const c = await oku(b.depo);
  const sz = sezonKaydi(c.sz, b.simdi);
  return basarili({
    acik: b.acik,
    katalog: katalogGorunumu(),
    fiyatKademeleri: FIYAT_KADEMELERI,
    seviyeler: DEBDEBE_SEVIYELERI.map((s) => s.ad),
    ben: benGorunumu(c, b.simdi),
    sezon: sezonGorunumu(sz, b.simdi, (u) => sahipMi(c, u, b.simdi)),
    armagan: { gunlukTavan: ARMAGAN_GUNLUK, bugunKalan: gunlukKalan(c.ag, b.simdi) },
    paraliKutu: false,
  });
}

export async function deneOku(b: DebdebeBaglami, urunHam: unknown, dil: unknown): Promise<Sonuc<unknown>> {
  const id = urunBul(urunHam);
  if (!id) return hata("urun_gecersiz");
  const p = await profilGetir(b.depo);
  if (!p.ok) return p;
  const c = await oku(b.depo);
  return basarili(denePaketi(id, p.deger.ad, gorunenler(c, b.simdi), dilCoz(dil)));
}

export async function sezonOku(b: DebdebeBaglami): Promise<Sonuc<unknown>> {
  const c = await oku(b.depo);
  return basarili(sezonGorunumu(sezonKaydi(c.sz, b.simdi), b.simdi, (u) => sahipMi(c, u, b.simdi)));
}

export async function levhaGoster(b: DebdebeBaglami): Promise<Sonuc<unknown>> {
  const p = await profilGetir(b.depo);
  if (!p.ok) return p;
  const r = await b.levhaGetir(p.deger.beylik);
  if (!r.ok) return r;
  const c = await oku(b.depo);
  return basarili({ ...(r.deger as Record<string, unknown>), benGorunur: c.lv === true });
}

/** Başka bir oyuncunun Debdebe görünüşü (yerel kimlikle; yalnız aynı yerleşimin sakini). */
export async function kisiGorunumu(b: DebdebeBaglami, kisi: unknown): Promise<Sonuc<unknown>> {
  if (typeof kisi !== "string" || !/^o[1-9][0-9]{0,8}$/.test(kisi)) return hata("kisi_yok");
  const r = await b.yerlesime({ islem: "sakinHesabi", hesapId: b.hesapId, hedef: kisi });
  if (!r.ok) return r;
  const hesap = (r.deger as { hesap: string }).hesap;
  if (hesap === b.hesapId) return basarili(herkeseGorunum(await oku(b.depo), b.simdi));
  return b.hesaba(hesap, { islem: "debdebeGorunum", hesapId: hesap });
}

// ---------------------------------------------------------------- satın alma

export async function satinAl(b: DebdebeBaglami, govde: unknown): Promise<Sonuc<unknown>> {
  if (!b.acik) return hata("debdebe_kapali");
  const no = istekNoCoz(govde);
  if (!no.ok) return no;
  const g = govde as Record<string, unknown>;
  const id = urunBul(g.urun);
  if (!id) return hata("urun_gecersiz");
  const magaza = magazaCoz(g.magaza);
  if (!magaza) return hata("magaza_gecersiz");
  if (typeof g.makbuz !== "string" || g.makbuz.length === 0 || g.makbuz.length > MAKBUZ_EN_UZUN) return hata("makbuz_gecersiz");
  let c = await oku(b.depo);
  const onceki = istekBul(c, no.deger);
  if (onceki) return basarili(onceki);
  const uygun = satinAlinabilir(c, id, b.simdi);
  if (!uygun.ok) return uygun;
  const profil = await profilGetir(b.depo);
  if (!profil.ok) return profil;
  const beklenen = magazaUrunKimligi(id);
  const v = await b.dogrulayici.dogrula(magaza, g.makbuz, beklenen);
  if (!v.ok) return v;
  const d = makbuzDenetle(v.deger, magaza, beklenen, b.testMakbuz);
  if (!d.ok) return d;
  const islem = `${magaza}:${d.deger.islemKimligi}`;
  const sahip = await b.defter({ islem, magaza, urun: id, hesap: b.hesapId, zaman: b.simdi, ...(d.deger.test ? { test: true } : {}) });
  if (!sahip.ok) return sahip;

  // Yalnız depolama: yeniden oku, uygula, yaz.
  c = await oku(b.depo);
  const yarisan = istekBul(c, no.deger);
  if (yarisan) return basarili(yarisan);
  const r = satinAlimUygula(c, id, { ...d.deger, islemKimligi: islem }, b.simdi);
  if (!r.ok) return r;
  const yanit = { urun: id, islem, verilen: r.deger.verilen, tekrar: r.deger.tekrar, ben: benGorunumu(c, b.simdi) };
  istekYaz(c, no.deger, yanit);
  await kaydet(b.depo, c);
  if (!r.deger.tekrar) {
    await levhayaBildir(b, c, urunPuani(id));
    if (b.dogrulayici.onayla) {
      try {
        await b.dogrulayici.onayla(magaza, g.makbuz, beklenen, urun(id).tur === "armagan" || urun(id).tur === "kisaltma");
      } catch {
        // en iyi çaba: onay bir sonraki doğrulamada yinelenir
      }
    }
  }
  return basarili(yanit);
}

// ---------------------------------------------------------------- kuşanma ve levha tercihi

export async function kusanUc(b: DebdebeBaglami, govde: unknown): Promise<Sonuc<unknown>> {
  const no = istekNoCoz(govde);
  if (!no.ok) return no;
  const g = govde as Record<string, unknown>;
  const c = await oku(b.depo);
  const onceki = istekBul(c, no.deger);
  if (onceki) return basarili(onceki);
  const r = kusan(c, g.yuva, g.urun, g.sira, b.simdi);
  if (!r.ok) return r;
  const yanit = { kusanilan: gorunenler(c, b.simdi) };
  istekYaz(c, no.deger, yanit);
  await kaydet(b.depo, c);
  return basarili(yanit);
}

export async function levhaGorunurUc(b: DebdebeBaglami, govde: unknown): Promise<Sonuc<unknown>> {
  const no = istekNoCoz(govde);
  if (!no.ok) return no;
  const g = govde as Record<string, unknown>;
  if (typeof g.gorunur !== "boolean") return hata("gecersiz_istek");
  const c = await oku(b.depo);
  const onceki = istekBul(c, no.deger);
  if (onceki) return basarili(onceki);
  const profil = await profilGetir(b.depo);
  if (!profil.ok) return profil;
  c.lv = g.gorunur;
  const yanit = { levhaGorunur: c.lv };
  istekYaz(c, no.deger, yanit);
  await kaydet(b.depo, c);
  try {
    await b.levhaya({ beylik: profil.deger.beylik, hesap: b.hesapId, ad: profil.deger.ad, puan: 0, seviye: seviyeAdi(c.p), gorunur: c.lv });
  } catch {
    // en iyi çaba
  }
  return basarili(yanit);
}

// ---------------------------------------------------------------- Debdebe armağanı

export async function armaganVer(b: DebdebeBaglami, govde: unknown): Promise<Sonuc<unknown>> {
  if (!b.acik) return hata("debdebe_kapali");
  const no = istekNoCoz(govde);
  if (!no.ok) return no;
  const g = govde as Record<string, unknown>;
  const id = urunBul(g.urun);
  if (!id || urun(id).tur !== "armagan") return hata("urun_gecersiz");
  if (typeof g.hedef !== "string" || g.hedef.length === 0 || g.hedef.length > 128) return hata("kisi_yok");
  const hedef = g.hedef;
  if (hedef === b.hesapId) return hata("kendi_hedef");
  let c = await oku(b.depo);
  const onceki = istekBul(c, no.deger);
  if (onceki) return basarili(onceki);
  if ((c.st[id] ?? 0) < 1) return hata("stok_yok");
  if (!gunlukSay(c.ag, b.simdi, ARMAGAN_GUNLUK).izin) return hata("armagan_siniri");
  const profil = await profilGetir(b.depo);
  if (!profil.ok) return profil;
  let masa: string | undefined;
  if (g.masa !== undefined) {
    const y = yerlesimBul(profil.deger.yerlesim);
    if (!y) return hata("yerlesim_gecersiz");
    const mn = masaNoCoz(g.masa, masaSayisi(y.tur));
    if (mn === undefined) return hata("masa_gecersiz");
    masa = masaAdi(y.id, HAN_DUZENI[y.tur].tur, mn);
    if (!b.masaCagir) return hata("masa_gecersiz");
    const k = await b.masaCagir(masa, { islem: "ikramKontrol", masa, hesap: b.hesapId, hedef });
    if (!k.ok) return k;
  }
  const tutar = urun(id).teveccuh ?? 0;
  const t = await b.yerlesime({ islem: "armaganTeveccuh", hesapId: b.hesapId, govde: { hedef, tutar, urun: id, istekNo: no.deger } });
  if (!t.ok) return t;
  const { alanHesap, teveccuh } = t.deger as { alanHesap: string; teveccuh: number };
  const rozet: Rozet = { id: `${b.hesapId}:${no.deger}`, u: id, v: profil.deger.ad, z: b.simdi };
  const rz = await b.hesaba(alanHesap, { islem: "debdebeRozet", hesapId: alanHesap, rozet });
  if (!rz.ok) return rz;

  c = await oku(b.depo);
  const yarisan = istekBul(c, no.deger);
  if (yarisan) return basarili(yarisan);
  c.st[id] = (c.st[id] ?? 0) - 1;
  const stok = c.st[id]!;
  if (stok === 0) delete c.st[id];
  c.ag = gunlukSay(c.ag, b.simdi, Number.MAX_SAFE_INTEGER).durum;
  verilenEkle(c, { id: rozet.id, u: id, h: alanHesap, y: profil.deger.yerlesim, t: teveccuh, z: b.simdi });
  const anons = masa ? { tur: "debdebe" as const, kim: b.hesapId, hedef: alanHesap, oge: id, zaman: b.simdi } : undefined;
  const yanit = { urun: id, hedef: alanHesap, teveccuh, stok: Math.max(0, stok), gunluk: { tavan: ARMAGAN_GUNLUK, kalan: gunlukKalan(c.ag, b.simdi) }, ...(anons ? { anons } : {}) };
  istekYaz(c, no.deger, yanit);
  await kaydet(b.depo, c);
  if (masa && anons && b.masaCagir) {
    try {
      await b.masaCagir(masa, { islem: "anons", masa, anons });
    } catch {
      // anons en iyi çabadır
    }
  }
  return basarili(yanit);
}

// ---------------------------------------------------------------- süre kısaltma (beceri v2 §3)

/**
 * POST /v1/beceri/hizlandir {kaynak: "debdebe", urun, istekNo}: stoktan bir kısaltma harcanır; kısaltma miktarı
 * istemciden değil katalogdan gelir. Yalnız öğrenme süresi kısalır; puan ve ön koşul hiçbir yolla atlanmaz.
 */
export async function hizlandir(b: DebdebeBaglami, govde: unknown): Promise<Sonuc<unknown>> {
  if (!b.acik) return hata("debdebe_kapali");
  const no = istekNoCoz(govde);
  if (!no.ok) return no;
  const g = govde as Record<string, unknown>;
  const id = urunBul(g.urun);
  if (!id || urun(id).tur !== "kisaltma") return hata("urun_gecersiz");
  let c = await oku(b.depo);
  const onceki = istekBul(c, no.deger);
  if (onceki) return basarili(onceki);
  if ((c.st[id] ?? 0) < 1) return hata("stok_yok");
  const u = urun(id);
  const kisaltma = { ...(u.kisaltmaDk ? { dk: u.kisaltmaDk } : {}), ...(u.kisaltmaOran ? { oran: u.kisaltmaOran } : {}) };
  const r = await b.yerlesime({ islem: "beceriHizlandir", hesapId: b.hesapId, govde: { kaynak: "debdebe", kisaltma, istekNo: no.deger } });
  if (!r.ok) return r;
  c = await oku(b.depo);
  const yarisan = istekBul(c, no.deger);
  if (yarisan) return basarili(yarisan);
  c.st[id] = (c.st[id] ?? 0) - 1;
  const stok = c.st[id]!;
  if (stok === 0) delete c.st[id];
  const yanit = { ...(r.deger as Record<string, unknown>), urun: id, stok: Math.max(0, stok) };
  istekYaz(c, no.deger, yanit);
  await kaydet(b.depo, c);
  return basarili(yanit);
}

// ---------------------------------------------------------------- iç iletiler

/** Başka bir HesapDO'dan: alınan armağan rozeti (tekrar güvenli). */
export async function rozetAl(depo: Depo, ham: unknown): Promise<Sonuc<unknown>> {
  if (!nesneMi(ham) || typeof ham.id !== "string" || typeof ham.v !== "string" || typeof ham.z !== "number" || !urunBul(ham.u)) return hata("gecersiz_istek");
  const c = await oku(depo);
  const yeni = rozetEkle(c, { id: ham.id.slice(0, 160), u: urunBul(ham.u)!, v: ham.v.slice(0, 64), z: ham.z });
  if (yeni) await kaydet(depo, c);
  return basarili({ yeni });
}

export async function rozetKaldir(depo: Depo, id: unknown): Promise<Sonuc<unknown>> {
  if (typeof id !== "string") return hata("gecersiz_istek");
  const c = await oku(depo);
  const silindi = rozetSil(c, id);
  if (silindi) await kaydet(depo, c);
  return basarili({ silindi });
}

/** Masa isim plakasında kullanılacak kozmetik çerçeve; yalnız sunucunun okuduğu sahiplikten gelir. */
export async function plakaCerçevesi(depo: Depo, simdi: number): Promise<string | undefined> {
  return kozmetikPlakaSusu(await oku(depo), simdi)?.cerceve;
}

export async function gorunumVer(depo: Depo, simdi: number): Promise<Sonuc<unknown>> {
  return basarili(herkeseGorunum(await depo.al<Cosmetic>(COSMETIC), simdi));
}

/**
 * YonetimDO'dan (Y3 Debdebe iadesi ya da mağaza iade bildirimi): varlık geri alınır. Verilmiş armağanın stoğu
 * kalmadıysa son verilen armağanın teveccühü alanın yerleşiminde geri alınır ve rozeti silinir. Dış çağrılar
 * başarılı olmadan kayıt yazılmaz (aynı iade yeniden gönderilince tamamlanır).
 */
export async function iadeIsle(b: DebdebeBaglami, islem: unknown): Promise<Sonuc<unknown>> {
  if (typeof islem !== "string" || islem.length > 200) return hata("gecersiz_istek");
  const deneme = await oku(b.depo);
  const on = iadeUygula(deneme, islem, b.simdi);
  if (!on.ok) return on;
  const a = on.deger.armagan;
  if (a) {
    const geri = await b.yerlesimeDogrudan(a.y, { islem: "armaganGeri", hesapId: a.h, govde: { tutar: a.t, istekNo: await kisaKimlik(`geri:${a.id}`) } });
    if (!geri.ok && geri.hata !== "olu" && geri.hata !== "sakin_yok") return geri;
    const rz = await b.hesaba(a.h, { islem: "debdebeRozetSil", hesapId: a.h, id: a.id });
    if (!rz.ok && rz.hata !== "hesap_yok") return rz;
  }
  const c = await oku(b.depo);
  const r = iadeUygula(c, islem, b.simdi, a?.id);
  if (!r.ok) return r;
  if (!r.deger.tekrar) await kaydet(b.depo, c);
  return basarili({ ...r.deger, ben: benGorunumu(c, b.simdi) });
}

/** Başarılı oyun yazmasından sonra sezon puanı (oynayarak ilerleme). Yalnız kozmetik ödül verir. */
export async function sezonaYaz(depo: Depo, simdi: number, kaynak: string, govde: unknown): Promise<void> {
  const no = istekNoCoz(govde);
  if (!no.ok) return;
  const c = await oku(depo);
  const r = sezonPuanla(c, simdi, (sz) => sezonIlerle(sz, kaynak, `${kaynak}:${no.deger}`, simdi));
  if (r.eklenen > 0 || r.verilen.length > 0) await kaydet(depo, c);
}

/** Akçeyle ikram (oyun içi cömertlik) de levhada anılır. */
export async function ikramLevhaya(b: DebdebeBaglami, akce: number): Promise<void> {
  if (!(akce > 0)) return;
  const c = await oku(b.depo);
  await levhayaBildir(b, c, akce * AKCE_LEVHA_ORANI);
}
