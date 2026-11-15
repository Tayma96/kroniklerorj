// H8 ozan sahnesi ve ozan atışması (saf kurallar). MasaDO durumu depoda tek anahtarda (`etkinlik`) tutar; bir masada
// aynı anda ya sahne ya atışma olur. Kıta metni sohbet gibidir: hiçbir duruma ya da depoya yazılmaz, yalnız sayısı.
//
// Sahne: oturan biri açar, anlatıcı olur; sahne açıkken yalnız anlatıcı ve onun (ya da masa başının) söz verdiği
// oturanlar yazar. Anlatıcı kalkar/çıkarsa (ya da yeniden oturursa) sahne biter.
// Atışma: rızalı teklifin (eylem "atisma") kabulüyle başlar. Sırayla a, b, a, b… her biri ATISMA_KITA kıta; sonra
// oylama: o anda oturan, taraf olmayan herkesin bir oyu vardır (değiştirilemez). Zamanlayıcı yoktur. Ödül yalnız
// anılmadır (tanıklık + söylenti); akçe, nam, XP, teveccüh yok. Taraflardan biri kalkarsa atışma iptal olur.

import { basarili, hata, type Sonuc } from "../tipler.ts";
import { CERCEVE_EN_BUYUK, tekSatir } from "./kurallar.ts";
import { sohbetMaskele } from "./filtre.ts";
import type { AtismaGorunumu, AtismaSonucu, MasaAyari, SahneGorunumu } from "./tipler.ts";

/** [PARAMETRE] Atışmada her tarafın kıta sayısı (sabit; toplam 2 katı). */
export const ATISMA_KITA = 3;
/** [PARAMETRE] Bir kıtanın en çok satırı ve en çok harfi (temizlikten sonra, satır sonları hariç). */
export const KITA_SATIR_EN_COK = 4;
export const KITA_EN_UZUN = 400;

export interface SahneDurumu {
  tur: "sahne";
  /** Anlatıcı ve oturuş anı (yeniden oturursa sahne düşer). */
  an: string;
  ao: number | null;
  soz: string[];
  istek: string[];
  z: number;
}

export interface AtismaDurumu {
  tur: "atisma";
  olay: number;
  a: string;
  b: string;
  oa: number | null;
  ob: number | null;
  /** Yazılmış kıta sayısı. */
  kita: number;
  /** Oylama açıldıysa: oy hakkı olanlar (açılış anında oturan, taraf olmayanlar) ve verilen oylar (oy veren → taraf). */
  oylama?: { hak: string[]; oy: Record<string, string> };
}

export type Etkinlik = SahneDurumu | AtismaDurumu;

/** Oturan (hesap + oturuş anı). */
export interface Oturan {
  hesap: string;
  o: number | null;
}

const KIMLIK = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 64;
const ANLIK = (v: unknown): v is number | null => v === null || (typeof v === "number" && Number.isFinite(v));
const LISTE = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 64 && v.every(KIMLIK);

/** Depodaki kaydı doğrular (bozuk/eski kayıt → yok sayılır: yarım kilit kalmaz). */
export function etkinlikCoz(ham: unknown): Etkinlik | undefined {
  if (typeof ham !== "object" || ham === null) return undefined;
  const e = ham as Record<string, unknown>;
  if (e.tur === "sahne") {
    if (!KIMLIK(e.an) || !ANLIK(e.ao) || !LISTE(e.soz) || !LISTE(e.istek) || typeof e.z !== "number") return undefined;
    return { tur: "sahne", an: e.an, ao: e.ao, soz: [...e.soz], istek: [...e.istek], z: e.z };
  }
  if (e.tur === "atisma") {
    if (typeof e.olay !== "number" || !KIMLIK(e.a) || !KIMLIK(e.b) || !ANLIK(e.oa) || !ANLIK(e.ob)) return undefined;
    if (typeof e.kita !== "number" || !Number.isInteger(e.kita) || e.kita < 0 || e.kita > 2 * ATISMA_KITA) return undefined;
    const d: AtismaDurumu = { tur: "atisma", olay: e.olay, a: e.a, b: e.b, oa: e.oa, ob: e.ob, kita: e.kita };
    if (e.oylama !== undefined) {
      const o = e.oylama as Record<string, unknown> | null;
      if (!o || !LISTE(o.hak) || typeof o.oy !== "object" || o.oy === null) return undefined;
      const oy: Record<string, string> = {};
      for (const [k, v] of Object.entries(o.oy as Record<string, unknown>)) if (KIMLIK(k) && (v === e.a || v === e.b)) oy[k] = v;
      d.oylama = { hak: [...o.hak], oy };
    }
    return d;
  }
  return undefined;
}

const oturusu = (oturanlar: readonly Oturan[], h: string): number | null | undefined => oturanlar.find((x) => x.hesap === h)?.o;

// ---------------------------------------------------------------- sahne

export function sahneAc(e: Etkinlik | undefined, kim: string, oturanlar: readonly Oturan[], ayar: MasaAyari, simdi: number): Sonuc<SahneDurumu> {
  const o = oturusu(oturanlar, kim);
  if (o === undefined) return hata("oturmuyor");
  if (ayar.sahneYasak) return hata("sahne_yasak");
  if (e?.tur === "sahne") return hata("sahne_acik");
  if (e) return hata("masa_mesgul");
  return basarili({ tur: "sahne", an: kim, ao: o, soz: [], istek: [], z: simdi });
}

/** Sahneyi anlatıcı ya da masa başı kapatır. */
export function sahneKapatabilir(e: Etkinlik | undefined, kim: string, masaBasi: string | null): Sonuc<SahneDurumu> {
  if (e?.tur !== "sahne") return hata("sahne_yok");
  if (kim !== e.an && kim !== masaBasi) return hata("yetki_yok");
  return basarili(e);
}

/** Sahnede oturan biri söz ister (ya da isteğini/sözünü geri bırakır). Anlatıcı istemez. Tekrar istek etkisizdir. */
export function sahneSozIste(s: SahneDurumu, kim: string, iste: boolean): Sonuc<{ durum: SahneDurumu; degisti: boolean }> {
  if (kim === s.an) return hata("kendi_hedef");
  if (iste) {
    if (s.soz.includes(kim) || s.istek.includes(kim)) return basarili({ durum: s, degisti: false });
    return basarili({ durum: { ...s, istek: [...s.istek, kim] }, degisti: true });
  }
  if (!s.soz.includes(kim) && !s.istek.includes(kim)) return hata("soz_istegi_yok");
  return basarili({ durum: { ...s, soz: s.soz.filter((h) => h !== kim), istek: s.istek.filter((h) => h !== kim) }, degisti: true });
}

/** Anlatıcı ya da masa başı oturan birine söz verir (`kabul`) ya da isteği reddeder/sözü geri alır. */
export function sahneSozVer(
  s: SahneDurumu,
  kim: string,
  masaBasi: string | null,
  hedef: string,
  kabul: boolean,
  oturanlar: readonly Oturan[],
): Sonuc<SahneDurumu> {
  if (kim !== s.an && kim !== masaBasi) return hata("yetki_yok");
  if (hedef === s.an) return hata("kendi_hedef");
  if (oturusu(oturanlar, hedef) === undefined) return hata("hedef_masada_degil");
  const istek = s.istek.filter((h) => h !== hedef);
  const soz = s.soz.filter((h) => h !== hedef);
  if (kabul) soz.push(hedef);
  else if (istek.length === s.istek.length && soz.length === s.soz.length) return hata("soz_istegi_yok");
  return basarili({ ...s, soz, istek });
}

export function sahneYazabilir(s: SahneDurumu, kim: string): boolean {
  return kim === s.an || s.soz.includes(kim);
}

export function sahneGorunumu(s: SahneDurumu): SahneGorunumu {
  return { anlatici: s.an, soz: [...s.soz], istek: [...s.istek], acilis: s.z };
}

// ---------------------------------------------------------------- atışma

export function atismaBaslat(olay: number, a: string, b: string, oturanlar: readonly Oturan[]): AtismaDurumu {
  return { tur: "atisma", olay, a, b, oa: oturusu(oturanlar, a) ?? null, ob: oturusu(oturanlar, b) ?? null, kita: 0 };
}

/** Kıta sırası: çift sayıda kıtadan sonra a, tekte b; oylamada kimse. */
export function atismaSirasi(d: AtismaDurumu): string | null {
  if (d.oylama || d.kita >= 2 * ATISMA_KITA) return null;
  return d.kita % 2 === 0 ? d.a : d.b;
}

/** Kıta metni: en çok KITA_SATIR_EN_COK satır, her satır tek satır gibi temizlenir; küfür maskelenir (H3). */
export function kitaMetniCoz(ham: unknown, enCok = KITA_EN_UZUN): Sonuc<string> {
  if (typeof ham !== "string" || ham.length > CERCEVE_EN_BUYUK) return hata("metin_gecersiz");
  const satirlar = ham
    .split(/\r?\n|\r/)
    .map((x) => tekSatir(x).trim())
    .filter((x) => x.length > 0);
  if (satirlar.length === 0 || satirlar.length > KITA_SATIR_EN_COK) return hata("metin_gecersiz");
  const uzunluk = satirlar.reduce((t, x) => t + [...x].length, 0);
  if (uzunluk > enCok) return hata("metin_gecersiz");
  return basarili(satirlar.map((x) => sohbetMaskele(x)).join("\n"));
}

/**
 * Sırası gelen taraf kıta yazar. Son kıtadan sonra oylama açılır: oy hakkı o anda oturan, taraf olmayanlardır.
 * `sira`: yazılan kıtanın sırası (1..2×ATISMA_KITA).
 */
export function kitaKaydet(d: AtismaDurumu, kim: string, oturanlar: readonly Oturan[]): Sonuc<{ durum: AtismaDurumu; sira: number }> {
  if (kim !== d.a && kim !== d.b) return hata("taraf_degil");
  if (d.oylama) return hata("oylama_kapali");
  if (atismaSirasi(d) !== kim) return hata("sira_degil");
  const kita = d.kita + 1;
  const yeni: AtismaDurumu = { ...d, kita };
  if (kita >= 2 * ATISMA_KITA) {
    yeni.oylama = { hak: oturanlar.map((x) => x.hesap).filter((h) => h !== d.a && h !== d.b), oy: {} };
  }
  return basarili({ durum: yeni, sira: kita });
}

/** Oy: yalnız oy hakkı olan, bir kez, taraflardan birine. */
export function oyVer(d: AtismaDurumu, kim: string, hedef: unknown): Sonuc<AtismaDurumu> {
  if (!d.oylama) return hata("oylama_kapali");
  if (kim === d.a || kim === d.b || !d.oylama.hak.includes(kim)) return hata("oy_hakki_yok");
  if (d.oylama.oy[kim] !== undefined) return hata("oy_verildi");
  if (hedef !== d.a && hedef !== d.b) return hata("gecersiz_istek");
  return basarili({ ...d, oylama: { hak: d.oylama.hak, oy: { ...d.oylama.oy, [kim]: hedef } } });
}

/** Oy hakkı olan herkes oy verdi mi (hak boşsa da tamamdır). */
export function oylamaTamam(d: AtismaDurumu): boolean {
  return d.oylama !== undefined && d.oylama.hak.every((h) => d.oylama!.oy[h] !== undefined);
}

/** Sonuç: geçerli oy yoksa hükümsüz; eşitlikte berabere (ikisi de anılır). `iptal` yalnız kıta aşamasında kapatma. */
export function atismaSonucu(d: AtismaDurumu, iptal = false): AtismaSonucu {
  const oylar = Object.values(d.oylama?.oy ?? {});
  const oy: [number, number] = [oylar.filter((x) => x === d.a).length, oylar.filter((x) => x === d.b).length];
  const taban = { olay: d.olay, a: d.a, b: d.b, oy };
  if (iptal || !d.oylama) return { ...taban, sonuc: "iptal", kazanan: [] };
  if (oy[0] + oy[1] === 0) return { ...taban, sonuc: "hukumsuz", kazanan: [] };
  if (oy[0] === oy[1]) return { ...taban, sonuc: "berabere", kazanan: [d.a, d.b] };
  return { ...taban, sonuc: "kazandi", kazanan: [oy[0] > oy[1] ? d.a : d.b] };
}

/** Taraf ya da masa başı kapatır: kıta aşamasında iptal, oylamada o anki oylarla sonuçlanır. */
export function atismaKapat(e: Etkinlik | undefined, kim: string, masaBasi: string | null): Sonuc<AtismaSonucu> {
  if (e?.tur !== "atisma") return hata("atisma_yok");
  if (kim !== e.a && kim !== e.b && kim !== masaBasi) return hata("yetki_yok");
  return basarili(atismaSonucu(e, !e.oylama));
}

export function atismaGorunumu(d: AtismaDurumu): AtismaGorunumu {
  return {
    olay: d.olay,
    a: d.a,
    b: d.b,
    kita: d.kita,
    toplam: 2 * ATISMA_KITA,
    sira: atismaSirasi(d),
    asama: d.oylama ? "oylama" : "kita",
    hak: [...(d.oylama?.hak ?? [])],
    oyVeren: Object.keys(d.oylama?.oy ?? {}),
  };
}

// ---------------------------------------------------------------- denetim

/**
 * Oturma düzeni değişince (kalkma, çıkma, çıkarılma, DO uyanışı): anlatıcı ya da taraf aynı oturuşta oturmuyorsa
 * etkinlik düşer (atışma iptal olur); sahnede kalkanların söz/isteği silinir; oylamada kalkan oy hakkını (oy
 * vermediyse) yitirir ve kalan herkes oy verdiyse oylama sonuçlanır.
 */
export function etkinlikDenetle(
  e: Etkinlik | undefined,
  oturanlar: readonly Oturan[],
): { durum: Etkinlik | undefined; degisti: boolean; sonuc?: AtismaSonucu } {
  if (!e) return { durum: undefined, degisti: false };
  const oturan = new Set(oturanlar.map((x) => x.hesap));
  if (e.tur === "sahne") {
    if (oturusu(oturanlar, e.an) !== e.ao || !oturan.has(e.an)) return { durum: undefined, degisti: true };
    const soz = e.soz.filter((h) => oturan.has(h));
    const istek = e.istek.filter((h) => oturan.has(h));
    if (soz.length === e.soz.length && istek.length === e.istek.length) return { durum: e, degisti: false };
    return { durum: { ...e, soz, istek }, degisti: true };
  }
  if (!oturan.has(e.a) || !oturan.has(e.b) || oturusu(oturanlar, e.a) !== e.oa || oturusu(oturanlar, e.b) !== e.ob) {
    return { durum: undefined, degisti: true, sonuc: atismaSonucu(e, true) };
  }
  if (!e.oylama) return { durum: e, degisti: false };
  const hak = e.oylama.hak.filter((h) => oturan.has(h) || e.oylama!.oy[h] !== undefined);
  const d: AtismaDurumu = hak.length === e.oylama.hak.length ? e : { ...e, oylama: { hak, oy: e.oylama.oy } };
  if (oylamaTamam(d)) return { durum: undefined, degisti: true, sonuc: atismaSonucu(d) };
  return { durum: d, degisti: d !== e };
}
