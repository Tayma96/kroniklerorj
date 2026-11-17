// Ürün kalitesi ve yapan izi (Faz 6, beceri ağacı v2 §7): tarifle üretilen malın kalite kademesi (sade, iyi,
// üstün, şaheser) beceriden çıkar ve malın üstüne yapanın kimliği yazılır ("Usta Ayşe'nin sabanı"). Kalite puanı
// dökümle döner (gizli sayı yok): meslek kademesi + zanaat becerisi + kalite düğümleri + kullanılan aracın kalitesi
// + küçük deterministik zar. Aletin etkisi yalnız kullananın bilgisinden değil, aleti YAPANIN kalitesinden de gelir
// (fazladan çıktı ve ömür).
//
// Saklama (geriye uyumlu): `ev` adetin tek kaynağıdır. `kq` yalnız izli partileri tutar: mal → [kalite, adet,
// yapan?] (kaliteye göre azalan). İzsiz kalan (ev − Σ parti) sade sayılır; eski sayısal envanter böylece olduğu
// gibi geçerlidir. Envanterden düşüş (`envanterEkle` eksi) önce izsiz sadeyi, sonra en düşük kaliteyi tüketir;
// belirli bir kalitenin aktarımı (`kaliteliCikar`/`kaliteliEkle`) partileri yapan iziyle taşır. Saf fonksiyonlar.

import { TARIFLER, type Tarif } from "../icerik/tarifler.ts";
import type { MalId } from "../icerik/mallar.ts";
import type { Zar } from "./rastgele.ts";
import { esyaGorunumu, nadideHuneri } from "./esya.ts";
import type { Dokum, Karakter } from "./tipler.ts";

// Eşya kademeleri (tezgâh tasarımı §9, Dilim 4): yedi kademe. Sade..nadide puanla çıkar (tavan meslek kademesine
// bağlı); efsanevi ve tılsımlı yalnız pirin atölyedeki aylık efsanevi denemesiyle (yerlesim/esya.ts) çıkar ve tek,
// adlı eşyadır (parti beşinci alanı: eşya kaydı). Eski kayıtlardaki 0–3 kademeler olduğu gibi geçerlidir.
export const KALITE_ADLARI = ["sade", "iyi", "ustun", "saheser", "nadide", "efsanevi", "tilsimli"] as const;
export type KaliteAdi = (typeof KALITE_ADLARI)[number];
/** 0 sade, 1 iyi, 2 üstün, 3 şaheser, 4 nadide, 5 efsanevi, 6 tılsımlı. */
export type Kalite = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const KALITE_SAHESER = 3 as const;
export const KALITE_NADIDE = 4 as const;
export const KALITE_EFSANEVI = 5 as const;
export const KALITE_TILSIMLI = 6 as const;
export const KALITE_EN_YUKSEK = 6 as const;
/** Bütün kademeler, düşükten yükseğe. */
export const KALITELER: readonly Kalite[] = [0, 1, 2, 3, 4, 5, 6];

/**
 * Efsanevi ve tılsımlı eşyanın kaydı (§9: adlı, ustasının ve atölyesinin damgasını taşır, el değiştirdikçe geçmişi
 * yazılır, mirasla yadigâr olur). Parti adedi her zaman 1'dir; başka partiyle birleşmez, kopyalanmaz.
 */
export interface EsyaKaydi {
  /** Eşsiz kimlik. */
  i: string;
  /** Lakap dizini (istemci `esya.lakap.<l>` ile adlandırır). */
  l: number;
  /** Ustanın adı ve atölyenin adı (yapıldığı anki). */
  u: string;
  a: string;
  /** Hünerler (efsanevi 1, tılsımlı 2). */
  h: string[];
  /** Yapım ayı. */
  y: number;
  /** Yadigâr geçmişi: [ay, tür, kimin adı] (ilk satır yapım; sınırlı, esya.ts YADIGAR_GECMIS_EN_COK). */
  g: [ay: number, tur: string, kim: string][];
}

/**
 * Parti: [kalite, adet, yapan (yerel oyuncu kimliği; bilinmiyorsa yok), atölye damgası (işletme kimliği; tezgâh
 * Dilim 2: atölyede üretilen mal), eşya kaydı (yalnız efsanevi/tılsımlı; adet 1)]. Damga yapan izinin yanında
 * taşınır; damgasız partiyle birleşmez. Eşyalı parti hiçbir partiyle birleşmez.
 */
export type KaliteParti = [kalite: Kalite, adet: number, yapan?: string, damga?: string, esya?: EsyaKaydi];

/** Partinin `adet` kadarlık kopyası (yapan, damga ve eşya korunur; eşya her zaman yapan ve damgayla yazılır). */
export function partiParca(p: KaliteParti, adet: number): KaliteParti {
  if (p[4]) return [p[0], adet, p[2] ?? "", p[3] ?? "", p[4]];
  return p[3] !== undefined ? [p[0], adet, p[2], p[3]] : p[2] === undefined ? [p[0], adet] : [p[0], adet, p[2]];
}

/** İki parti birleşebilir mi (aynı kalite, yapan, damga; eşyalı hiçbir zaman). */
export function partiEsMi(a: KaliteParti, b: KaliteParti): boolean {
  return !a[4] && !b[4] && a[0] === b[0] && a[2] === b[2] && a[3] === b[3];
}

/** [PARAMETRE] Kalite kademesinin eşikleri (puan; sade, iyi, üstün, şaheser, nadide). Efsanevi/tılsımlı puanla çıkmaz. */
export const KALITE_ESIK: readonly number[] = [0, 30, 55, 85, 125];
/**
 * [PARAMETRE] Meslek kademesine göre puanla çıkabilecek en yüksek kalite (§9): çırak iyi, kalfa üstün, usta nadide
 * (ender: eşik 125), pir nadide; efsanevi yalnız pirin atölye denemesiyle.
 */
export const KALITE_KADEME_TAVANI: readonly Kalite[] = [1, 2, 4, 4];
/** [PARAMETRE] Puanı nadideye yeten ustanın (pir değil) nadide çıkarma şansı (yüzde; değilse şaheser). */
export const KALITE_USTA_NADIDE_YUZDE = 20;
/** [PARAMETRE] Emirle (NPC emeği / toplu) üretimin kalite tavanı: şaheser. */
export const KALITE_EMIR_TAVANI: Kalite = 3;
/** [PARAMETRE] Tarifin mesleğindeki kademeye göre puan (çırak, kalfa, usta, pir). */
export const KALITE_KADEME_PUANI: readonly number[] = [0, 10, 20, 30];
/** [PARAMETRE] Zanaat becerisi (0–100) bu sayıya bölünerek puana eklenir (en çok 20). */
export const KALITE_ZANAAT_BOLEN = 5;
/** [PARAMETRE] Kalite düğümü yüzdelerinin toplam tavanı (birden çok düğüm toplanır). */
export const KALITE_BECERI_TAVAN = 60;
/** [PARAMETRE] Deterministik zar: 0..KALITE_ZAR−1 eklenir (aynı oyuncu, tarif, ay ve sayaçla aynı çıkar). */
export const KALITE_ZAR = 20;
/** [PARAMETRE] Kullanılan aracın kalitesine göre: ürün kalite puanı, fazladan çıktı, fazladan ömür. */
export const ALET_KALITE_PUANI: readonly number[] = [0, 5, 10, 20, 25, 30, 35];
export const ALET_KALITE_VERIM: readonly number[] = [0, 0, 1, 2, 2, 3, 3];
export const ALET_KALITE_OMUR: readonly number[] = [0, 1, 2, 3, 4, 6, 8];
/** [PARAMETRE] Oyuncu pazarında adil değer çarpanı (pompa sınırı ve karşılaştırma dökümü; NPC fiyatı kaliteye bakmaz). */
export const KALITE_DEGER_CARPANI: readonly number[] = [1, 1.25, 1.6, 2.5, 3.5, 5, 7];
/** [PARAMETRE] Mal başına tutulan en çok izli parti (fazlası en düşük kaliteden izsiz sadeye döner). */
export const KALITE_PARTI_EN_COK = 8;

/** Adet ve izli partileri taşıyan her şey (karakter envanteri ya da oda sandığı, H12). */
export type Envanterli = Pick<Karakter, "ev" | "kq">;

export const kaliteMi = (v: unknown): v is Kalite => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= KALITE_EN_YUKSEK;

function partiler(k: Envanterli, mal: string): KaliteParti[] {
  return k.kq?.[mal] ?? [];
}

function yaz(k: Envanterli, mal: string, liste: KaliteParti[]): void {
  const temiz = liste.filter((p) => p[1] > 0 && (p[0] > 0 || p[2] !== undefined || p[3] !== undefined));
  temiz.sort((a, b) => b[0] - a[0] || ((a[2] ?? "") < (b[2] ?? "") ? -1 : (a[2] ?? "") > (b[2] ?? "") ? 1 : (a[3] ?? "") < (b[3] ?? "") ? -1 : (a[3] ?? "") > (b[3] ?? "") ? 1 : (a[4]?.i ?? "") < (b[4]?.i ?? "") ? -1 : 1));
  // Fazla parti en düşük kaliteden izsiz sadeye döner; eşyalı parti (adlı eşya) hiçbir zaman düşmez.
  for (let i = temiz.length - 1; i >= 0 && temiz.length > KALITE_PARTI_EN_COK; i--) if (!temiz[i]![4]) temiz.splice(i, 1);
  if (temiz.length === 0) {
    if (k.kq) delete k.kq[mal];
    if (k.kq && Object.keys(k.kq).length === 0) delete k.kq;
  } else (k.kq ??= {})[mal] = temiz;
}

/** İzli partilerin toplamı envanteri aşarsa (eski yol `envanterEkle` eksiyle düştüyse) en düşük kaliteden kırpar. */
export function kaliteKirp(k: Karakter, mal: string): void {
  const liste = partiler(k, mal);
  if (liste.length === 0) return;
  let fazla = liste.reduce((a, p) => a + p[1], 0) - (k.ev?.[mal] ?? 0);
  if (fazla <= 0) return;
  const kopya = liste.map((p) => [...p] as KaliteParti);
  for (let i = kopya.length - 1; i >= 0 && fazla > 0; i--) {
    const d = Math.min(fazla, kopya[i]![1]);
    kopya[i]![1] -= d;
    fazla -= d;
  }
  yaz(k, mal, kopya);
}

/** Bu kalitede elde kaç adet var (sade: izsiz + izli sade). */
export function kaliteAdedi(k: Envanterli, mal: string, q: Kalite): number {
  const liste = partiler(k, mal);
  const izli = liste.filter((p) => p[0] === q).reduce((a, p) => a + p[1], 0);
  if (q > 0) return izli;
  return (k.ev?.[mal] ?? 0) - liste.filter((p) => p[0] > 0).reduce((a, p) => a + p[1], 0);
}

/** Bu kalite ya da üstünde elde kaç adet var. */
export function enAzKaliteAdedi(k: Karakter, mal: string, q: Kalite): number {
  let n = 0;
  for (let x = q; x <= KALITE_EN_YUKSEK; x++) n += kaliteAdedi(k, mal, x as Kalite);
  return n;
}

/** Eldeki en iyi kalite (yoksa 0). */
export function enIyiKalite(k: Karakter, mal: string): Kalite {
  if ((k.ev?.[mal] ?? 0) <= 0) return 0;
  return (partiler(k, mal)[0]?.[0] ?? 0) as Kalite;
}

/** Belirli kalitede `adet` malı çıkarır (sadede önce izsiz); yetmezse hiçbir şey değişmez, null döner. */
export function kaliteliCikar(k: Envanterli, mal: MalId, adet: number, q: Kalite): KaliteParti[] | null {
  if (!(adet > 0) || kaliteAdedi(k, mal, q) < adet) return null;
  const liste = partiler(k, mal).map((p) => [...p] as KaliteParti);
  const cikan: KaliteParti[] = [];
  let kalan = adet;
  if (q === 0) {
    const izsiz = (k.ev?.[mal] ?? 0) - liste.reduce((a, p) => a + p[1], 0);
    const d = Math.min(kalan, Math.max(0, izsiz));
    if (d > 0) cikan.push([0, d]);
    kalan -= d;
  }
  for (let i = liste.length - 1; i >= 0 && kalan > 0; i--) {
    const p = liste[i]!;
    if (p[0] !== q) continue;
    const d = Math.min(kalan, p[1]);
    p[1] -= d;
    kalan -= d;
    cikan.push(partiParca(p, d));
  }
  const ev = (k.ev ??= {});
  const yeni = (ev[mal] ?? 0) - adet;
  if (yeni > 0) ev[mal] = yeni;
  else delete ev[mal];
  yaz(k, mal, liste);
  return cikan;
}

/** Bu atölye damgasını taşıyan adet (tezgâh Dilim 2–3). Adlı eşya (efsanevi/tılsımlı) toplu teslime sayılmaz. */
export function damgaliAdet(k: Envanterli, mal: string, damga: string): number {
  return partiler(k, mal).filter((p) => p[3] === damga && !p[4]).reduce((a, p) => a + p[1], 0);
}

/** Yalnız `damga` taşıyan partilerden `adet` çıkarır (önce düşük kalite); yetmezse hiçbir şey değişmez, null döner. */
export function damgaliCikar(k: Envanterli, mal: MalId, adet: number, damga: string): KaliteParti[] | null {
  if (!(adet > 0) || damgaliAdet(k, mal, damga) < adet) return null;
  const liste = partiler(k, mal).map((p) => [...p] as KaliteParti);
  const cikan: KaliteParti[] = [];
  let kalan = adet;
  for (let i = liste.length - 1; i >= 0 && kalan > 0; i--) {
    const p = liste[i]!;
    if (p[3] !== damga || p[4]) continue;
    const d = Math.min(kalan, p[1]);
    p[1] -= d;
    kalan -= d;
    cikan.push(partiParca(p, d));
  }
  const ev = (k.ev ??= {});
  const yeni = (ev[mal] ?? 0) - adet;
  if (yeni > 0) ev[mal] = yeni;
  else delete ev[mal];
  yaz(k, mal, liste);
  return cikan;
}

/** Partileri envantere ekler (aynı kalite ve yapan birleşir). */
export function kaliteliEkle(k: Envanterli, mal: MalId, gelen: readonly KaliteParti[]): void {
  const toplam = gelen.reduce((a, p) => a + Math.max(0, p[1]), 0);
  if (toplam <= 0) return;
  const ev = (k.ev ??= {});
  ev[mal] = (ev[mal] ?? 0) + toplam;
  const liste = partiler(k, mal).map((p) => [...p] as KaliteParti);
  for (const g of gelen) {
    const [q, n, yp, dm] = g;
    if (n <= 0 || (q === 0 && yp === undefined && dm === undefined)) continue;
    const ayni = liste.find((p) => partiEsMi(p, g));
    if (ayni) ayni[1] += n;
    else liste.push(partiParca(g, n));
  }
  yaz(k, mal, liste);
}

/** Partilerin ilk (en çok adetli) yapanı (pazar ve levha izi). */
export function baslicaYapan(liste: readonly KaliteParti[]): string | undefined {
  let enIyi: KaliteParti | undefined;
  for (const p of liste) if (p[2] !== undefined && (!enIyi || p[1] > enIyi[1])) enIyi = p;
  return enIyi?.[2];
}

/** `kalite` etkisinin hedefi bir tarifin kimliği ya da grubu mu (bağlı etki; değilse kanca). */
export function kaliteHedefiMi(hedef: string): boolean {
  return Object.values(TARIFLER).some((t) => t.id === hedef || ("grup" in t && (t.grup as readonly string[]).includes(hedef)));
}

export interface KaliteSonucu {
  kademe: Kalite;
  ad: KaliteAdi;
  dokum: Dokum;
  /** Bir üst kademe için gereken puan (tavandaysa null). */
  sonrakiEsik: number | null;
  /** Bu üretimin puanla erişilebilen kalite tavanı; puan tavanı aştıysa nedeni (meslek kademesi ya da emir). */
  tavan: Kalite;
  kisit: "kalite.tavan.meslek" | "kalite.tavan.emir" | "kalite.tavan.ustaNadide" | null;
}

export function kademeBul(puan: number): Kalite {
  let q = 0;
  for (let i = 0; i < KALITE_ESIK.length; i++) if (puan >= KALITE_ESIK[i]!) q = i;
  return q as Kalite;
}

/**
 * Ürün kalitesi: döküm (kademe, zanaat, beceri, araç, zar) → kademe. `beceri`: tarifin kalite düğümü yüzdeleri
 * (tarif.ts `kaliteBecerisi`), `aracKalite`: kullanılan aracın kalitesi (araçsızsa null).
 */
export function urunKalitesi(k: Karakter, t: Tarif, beceri: number, aracKalite: Kalite | null, zar: Zar, ek: readonly { k: string; d: number }[] = [], emir = false): KaliteSonucu {
  const kd = k.ms?.s[t.meslek]?.kd ?? 0;
  const mt = KALITE_KADEME_TAVANI[kd] ?? 1;
  const tavan = (emir ? Math.min(mt, KALITE_EMIR_TAVANI) : mt) as Kalite;
  const kalemler = [
    { k: "kalite.kademe", d: KALITE_KADEME_PUANI[kd] ?? 0 },
    { k: "kalite.zanaat", d: Math.floor(Math.max(0, Math.min(100, k.be[3] ?? 0)) / KALITE_ZANAAT_BOLEN) },
    { k: "kalite.beceri", d: Math.min(KALITE_BECERI_TAVAN, Math.max(0, beceri)) },
  ];
  if (aracKalite !== null) kalemler.push({ k: "kalite.arac", d: ALET_KALITE_PUANI[aracKalite] ?? 0 });
  kalemler.push({ k: "kalite.zar", d: Math.floor(zar() * KALITE_ZAR) });
  // Ek kalemler (tezgâh Dilim 2: atölye seviye bonusu, NPC emeği cezası); toplam 0'ın altına inmez.
  for (const x of ek) kalemler.push({ k: x.k, d: x.d });
  const toplam = Math.max(0, kalemler.reduce((a, x) => a + x.d, 0));
  const ham = kademeBul(toplam);
  let kademe = Math.min(ham, tavan) as Kalite;
  let kisit: KaliteSonucu["kisit"] = ham > tavan ? (emir && tavan < mt ? "kalite.tavan.emir" : "kalite.tavan.meslek") : null;
  // Usta nadideye "ender" ulaşır (§9): puan yetse de aynı zarın ikinci çekilişiyle KALITE_USTA_NADIDE_YUZDE.
  if (kademe === KALITE_NADIDE && kd < 3 && zar() * 100 >= KALITE_USTA_NADIDE_YUZDE) {
    kademe = KALITE_SAHESER;
    kisit = "kalite.tavan.ustaNadide";
  }
  return { kademe, ad: KALITE_ADLARI[kademe], dokum: { toplam, kalemler }, sonrakiEsik: kademe >= tavan ? null : (KALITE_ESIK[kademe + 1] ?? null), tavan, kisit };
}

/** Envanterin kalite görünümü: yalnız izli partisi olan mallar (adet, kalite adı, yapan). */
export function kaliteGorunumu(k: Karakter) {
  return Object.fromEntries(
    Object.entries(k.kq ?? {}).map(([mal, liste]) => [
      mal,
      liste.map(([q, adet, yapan, damga, esya]) => ({ kalite: KALITE_ADLARI[q], kademe: q, adet, yapan: yapan ?? null, ...(damga ? { atolye: damga } : {}), ...(esya ? { esya: esyaGorunumu(mal, q, esya) } : q === KALITE_NADIDE ? { huner: nadideHuneri(mal) } : {}) })),
    ]),
  );
}
