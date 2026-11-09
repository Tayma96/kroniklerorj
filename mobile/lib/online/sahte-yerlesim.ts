// Geliştirici oturumu ve tasarım önizlemesi için sahte yerleşim: online-server/src/yerlesim uçlarının yanıtlarını
// (YerlesimDurumu, OlaylarYaniti, Kisi, EylemYaniti, TanidikYaniti) bellekte, aynı biçimde üretir. Kurallar ve sayılar
// sunucudaki eylem.ts / gorus.ts / ogrenme.ts / cizelge.ts tablolarının sadeleştirilmiş kopyasıdır; sunucu paketi içe
// aktarılmaz. Ad havuzları tek oyunculudaki NAME_POOLS'tur (sunucu icerik/adlar.ts ile aynı dizinler).
import { NAME_POOLS, soyadCinsli } from "../locale-data";
import {
  ACILIS_GUNU, BECERILER, KARARLAR, NAMLAR, NPC_EYLEMLERI, OZELLIK_EN_COK, OZELLIKLER, basarili, basarisiz, kisiKimligiMi,
  type AileUyesi, type Bakis, type Ben, type Cinsiyet, type Dil, type Dokum, type EylemKarti, type EylemTuru, type EylemYaniti,
  type HataKodu, type HaritaMekani, type Isaret, type Kalem, type Kisi, type Odul, type Olay, type OlaylarYaniti, type OgrenmeDurumu,
  type Profil, type SaatOzeti, type Sonuc, type Tanidik, type TanidikYaniti, type VerilenOdul, type YerlesimDurumu, type YerlesimOzeti,
} from "./protokol";

// --- İçerik (sunucu icerik/kisilik.ts kanonik Türkçe değerleri; çeviri istemcide locale-data ile yapılır)
const HUYLAR = ["neşeli", "ciddi", "kibirli", "cömert", "dertli", "yalnız", "kurnaz", "mert", "dindar", "hırslı", "utangaç", "sıcakkanlı", "misafirperver", "unutkan", "sabırlı", "aceleci"];
const TUHAFLIKLAR = [
  "sürekli hava durumundan dert yanar", "eski günleri anlatmayı sever", "herkese lakap takar", "az konuşur çok dinler",
  "yüksek sesle güler", "pazarlığa bayılır", "komşularını çekiştirir", "bir türküyü mırıldanır", "sözüne hep bir atasözü katar",
  "cebinde kuru üzüm taşır, çocuklara dağıtır", "gölgeye bakıp vakti şaşmaz bilir", "selamı herkese adıyla verir",
  "gördüğü her kuşa ekmek ufalar", "eşiğini günde iki kez süpürür",
];
const HAYALLER = [
  "bir dükkân açmanın hayalini kuruyor", "kızını/oğlunu evermek istiyor", "borçlarından kurtulmaya çalışıyor", "hacca gitmeyi diliyor",
  "toprak satın almak için biriktiriyor", "ustabaşı olmak istiyor", "küs olduğu kardeşiyle barışmak istiyor", "bir ev yaptırmanın derdinde",
  "kervan ticaretine atılmak istiyor", "adını duyurmak istiyor", "yıllardır görmediği memleketini görmek istiyor",
  "çırağını kendi dükkânına kavuşturmak istiyor", "babasından kalma bağı yeniden yeşertmek istiyor", "bir yetimi yanına çırak almak istiyor",
];
const MESLEK_AGIRLIK: readonly [string, number][] = [
  ["çiftçi", 30], ["demirci", 7], ["tüccar", 8], ["balıkçı", 4], ["avcı", 4], ["çoban", 9], ["fırıncı", 6], ["müzisyen", 3], ["şifacı", 3], ["asker", 5], ["işsiz", 4],
];
const GUNDEM_ADI = ["", "gecim", "evlilik", "dostluk"];
const ORTAK_MEKANLAR = ["carsi", "cami", "kahvehane", "meydan", "han"];
const TABAN = [36, 17, 13, 29, 6];

// --- Kurallar (sunucu eylem.ts, gorus.ts, ogrenme.ts kopyası)
interface Tanim { takat: number; temel: number; kazanc: number; beceri?: [string, number]; nam?: [string, number]; hedefYas?: number; bedel?: number; ucret?: number; ozellik?: string[]; becerisi?: string }
const EYLEMLER: Record<string, Tanim> = {
  sohbet: { takat: 1, temel: 70, kazanc: 4, beceri: ["soz", 1], hedefYas: 6, ozellik: ["karizma"], becerisi: "soz" },
  yardim: { takat: 1, temel: 65, kazanc: 8, beceri: ["zanaat", 1], nam: ["mertlik", 2], hedefYas: 6, ozellik: ["guc", "dayaniklilik"] },
  hediye: { takat: 1, temel: 85, kazanc: 9, beceri: ["soz", 1], nam: ["comertlik", 2], hedefYas: 6, bedel: 2, ozellik: ["karizma"] },
  ayakIsi: { takat: 1, temel: 70, kazanc: 3, beceri: ["ticaret", 1], nam: ["caliskanlik", 1], hedefYas: 16, ucret: 3, ozellik: ["ceviklik"], becerisi: "ticaret" },
  cirak: { takat: 1, temel: 35, kazanc: 6, beceri: ["zanaat", 2], nam: ["caliskanlik", 1], hedefYas: 20, ozellik: ["zeka"], becerisi: "zanaat" },
  mektep: { takat: 1, temel: 100, kazanc: 0, beceri: ["ilim", 3], nam: ["dindarlik", 1] },
  puan: { takat: 0, temel: 100, kazanc: 0 },
  karar: { takat: 0, temel: 100, kazanc: 0 },
};
const HUY_SANS: Record<string, Record<string, number>> = {
  sohbet: { utangaç: -15, yalnız: -10, ciddi: -5, neşeli: 10, sıcakkanlı: 10, misafirperver: 5 },
  yardim: { kibirli: -10, aceleci: -5, dertli: 10, sabırlı: 5 },
  hediye: { kibirli: -15, cömert: 5, sıcakkanlı: 5 },
  ayakIsi: { kurnaz: -5, hırslı: 10, unutkan: 5 },
  cirak: { sabırlı: 10, ciddi: 5, aceleci: -10, kibirli: -10 },
};
const HUY_NAM: Record<string, number> = { dindar: 1, cömert: 0, misafirperver: 0, sıcakkanlı: 0, mert: 2, hırslı: 3, sabırlı: 3 };
const AKRABA: Record<string, number> = { anne: 20, baba: 20, kardes: 10, buyukEbeveyn: 12, hane: 5 };
const KARAR_BECERI: Record<string, string> = { zanaat: "zanaat", ilim: "ilim", ticaret: "ticaret", yol: "dovus" };
const GUNLER: readonly { gun: number; sistem: string; sayac: string; sayi: number; odul: Odul }[] = [
  { gun: 1, sistem: "mahalle", sayac: "sohbet", sayi: 2, odul: { para: 3 } },
  { gun: 2, sistem: "ciraklik", sayac: "cirak", sayi: 1, odul: { beceri: ["zanaat", 2] } },
  { gun: 3, sistem: "mektep", sayac: "mektep", sayi: 1, odul: { ozellikPuani: 1 } },
  { gun: 4, sistem: "ayakIsi", sayac: "ayakIsi", sayi: 2, odul: { para: 3 } },
  { gun: 5, sistem: "dostluk", sayac: "dostluk", sayi: 1, odul: { beceri: ["soz", 2] } },
  { gun: 6, sistem: "karar", sayac: "karar", sayi: 1, odul: { ozellikPuani: 1 } },
];
const TAKAT_TAVAN = 18;
const TAKAT_AYLIK = 6;

// --- Durum
interface SNpc { i: number; a: number; s: number; k: 0 | 1; yas: number; m: string; h: string; q: string; r: string; e: number; es: number; an: number; ba: number; g: number; mk?: string; b: [number, 1 | 2, number][] }
interface SOyuncu { o: string; ad: string; k: Cinsiyet; yas: number; mk: string | null }
interface SIli { t: number; an: Record<string, number>; az: Record<string, number>; kg: number; dd: number; red: number }
type Ref = { r: string };
interface SOlay { s: number; a: number; t: string; w: string; h: string; ozel: boolean; n: number; ak: string; p: Record<string, string | number | Ref> }

function karistir(metin: string): number {
  let h = 2166136261;
  for (let i = 0; i < metin.length; i++) h = Math.imul(h ^ metin.charCodeAt(i), 16777619) >>> 0;
  return h;
}
function rastgele(tohum: number): () => number {
  let a = tohum >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const sinirla = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
// Sunucu anahtarları ("olay.olum" …) istemcide "onl." önekiyle çevrilir; burada yalnız veri olarak taşınır.
const ozet = (k: string, p: Record<string, unknown> = {}) => ({ k, p });
const kalem = (k: string, d: number): Kalem => ({ k, d });

export interface SahteKasaba {
  durum(dil: Dil): YerlesimDurumu;
  olaylar(imlec: number, dil: Dil): OlaylarYaniti;
  kisi(id: string, dil: Dil): Sonuc<Kisi>;
  eylem(govde: { tur: EylemTuru; hedef?: string; secim?: string; ozellik?: string; istekNo: string; dil?: Dil }): Sonuc<EylemYaniti>;
  tanidik(govde: { hedef: string; isaret: Isaret | null; dil?: Dil }): Sonuc<TanidikYaniti>;
  /** Sahte meslek uçlarının (sahte-meslek.ts) paylaştığı karakter durumu: akçe ve takat aynı nesnededir. */
  ekonomi(): {
    kar: { pa: number; tk: number }; yas: number; ay: number; npcMeslekleri: () => string[];
    /** Dikey dilim: kendi kimliğim, yetişkin NPC'ler (sipariş isteyeni) ve olay defterine yazma. */
    benId: string;
    yetiskinler: (dil: Dil) => { id: string; ad: string; m: string }[];
    olayYaz: (o: { t: string; w: string; h: string; n: number; anahtar: string; p: Record<string, string | number | { r: string }> }, dil: Dil, ayFarki?: number) => Olay;
  };
}

/** Profilin yerleşiminde inandırıcı bir kasaba kurar (tohum: yerleşim kimliği; aynı yerleşim hep aynı nüfus). */
export function sahteKasabaKur(profil: Profil, yerlesim: YerlesimOzeti, beylik: string, saatAl: () => SaatOzeti, benYas = 12): SahteKasaba {
  const R = rastgele(karistir("kasaba:" + yerlesim.id));
  const ri = (n: number) => Math.floor(R() * n);
  const tur = yerlesim.tur;
  const yerler = [...ORTAK_MEKANLAR, tur === "koy" ? "degirmen" : "mektep"];
  const mektepYeri = tur === "koy" ? "cami" : "mektep";
  const meslekSec = () => {
    let x = R() * MESLEK_AGIRLIK.reduce((a, [, w]) => a + w, 0);
    for (const [m, w] of MESLEK_AGIRLIK) if ((x -= w) < 0) return m;
    return "çiftçi";
  };
  const npc: SNpc[] = [];
  const dizin = new Map<number, SNpc>();
  let hane = 0;
  const yeni = (k: 0 | 1, yas: number, e: number, s: number, an = 0, ba = 0): SNpc => {
    const n: SNpc = { i: npc.length + 1, a: ri(18), s, k, yas, m: meslekSec(), h: HUYLAR[ri(HUYLAR.length)], q: TUHAFLIKLAR[ri(TUHAFLIKLAR.length)], r: HAYALLER[ri(HAYALLER.length)], e, es: 0, an, ba, g: 0, b: [] };
    npc.push(n);
    dizin.set(n.i, n);
    return n;
  };
  const evlen = (a: SNpc, b: SNpc) => { a.es = b.i; b.es = a.i; };

  // Oyuncunun ocağı: baba, anne, kardeş ve anneanne (ocak NPC ailesi, §13.11).
  hane++;
  const ocakSoy = ri(14);
  const nine = yeni(1, 63, hane, ri(14));
  const baba = yeni(0, 41, hane, ocakSoy);
  const anne = yeni(1, 36, hane, ocakSoy, nine.i);
  evlen(baba, anne);
  baba.m = "çiftçi";
  const kardes = yeni(profil.cinsiyet === "kadın" ? 0 : 1, 9, hane, ocakSoy, anne.i, baba.i);

  const hedefSayi = Math.min(yerlesim.npc, 220);
  while (npc.length < hedefSayi) {
    hane++;
    const soy = ri(14);
    const b = yeni(0, 26 + ri(32), hane, soy);
    const a = yeni(1, Math.max(19, b.yas - 2 - ri(7)), hane, soy);
    evlen(b, a);
    for (let c = ri(4); c > 0; c--) yeni(ri(2) as 0 | 1, ri(Math.max(1, a.yas - 17)), hane, soy, a.i, b.i);
    if (R() < 0.18) {
      const y = yeni(ri(2) as 0 | 1, 60 + ri(17), hane, soy);
      if (y.k) b.an = y.i; else b.ba = y.i;
    }
  }
  for (const n of npc) {
    if (n.yas < 16) continue;
    const r = R();
    if (r < 0.1) n.g = 1;
    else if (r < 0.14 && !n.es) n.g = 2;
    else if (r < 0.18) n.g = 3;
  }
  const yetiskinler = npc.filter((n) => n.yas >= 18);
  const bagla = (a: SNpc, b: SNpc, tur: 1 | 2, puan: number) => {
    if (a === b || a.b.some((x) => x[0] === b.i)) return;
    a.b.push([b.i, tur, puan]);
    b.b.push([a.i, tur, puan]);
  };
  for (const n of yetiskinler) {
    if (R() < 0.25) bagla(n, yetiskinler[ri(yetiskinler.length)], 1, 30 + ri(40));
    if (R() < 0.1) bagla(n, yetiskinler[ri(yetiskinler.length)], 2, -20 - ri(40));
  }

  // Hikâyenin kişileri: üretilen nüfustan seçilir, rolüne göre biçimlenir.
  const kullanilan = new Set([nine.i, baba.i, anne.i, kardes.i]);
  const sec = (k: 0 | 1, alt: number, ust: number): SNpc => {
    const n = npc.find((x) => !kullanilan.has(x.i) && x.k === k && x.yas >= alt && x.yas <= ust) ?? npc.find((x) => !kullanilan.has(x.i) && x.yas >= 20)!;
    kullanilan.add(n.i);
    return n;
  };
  const dost = Object.assign(sec(0, 36, 54), { m: "demirci", h: "mert", g: 0 });
  const tanis = Object.assign(sec(1, 30, 48), { m: "fırıncı", h: "sıcakkanlı", g: 1 });
  const dusman = Object.assign(sec(0, 26, 44), { m: "tüccar", h: "kurnaz", g: 0 });
  const kibirli = Object.assign(sec(0, 45, 60), { m: "asker", h: "kibirli", g: 0 });
  const sifaci = Object.assign(sec(1, 58, 76), { m: "şifacı", h: "dindar", g: 0 });
  bagla(dost, tanis, 1, 42);
  bagla(dost, dusman, 2, -40);
  bagla(dusman, kibirli, 1, 35);

  // Bu ay kim nerede (sunucu cizelge.ts'in sade kopyası).
  const mekanSec = (n: SNpc): string | undefined => {
    if (n.yas < 6) return undefined;
    const w = TABAN.slice();
    w[5] = tur === "koy" ? 4 : n.yas < 14 ? 30 : 2;
    if (n.yas < 14) { w[2] = 0; w[4] = 0; w[3] *= 2; }
    if (n.k) { w[2] = 0; w[4] *= 0.3; }
    if (n.h === "dindar") w[1] *= 3;
    if (n.m === "tüccar" && n.yas >= 14) { w[0] *= 2.2; w[4] *= 2.5; }
    let x = R() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < w.length; i++) if ((x -= w[i]) < 0) return yerler[i];
    return yerler[0];
  };
  for (const n of npc) n.mk = mekanSec(n);
  dost.mk = "carsi";
  tanis.mk = "carsi";
  dusman.mk = "kahvehane";
  kibirli.mk = "meydan";
  sifaci.mk = "cami";

  // Sakin oyuncular (yerel kimlik "o" + sıra); ben o3'üm.
  const benId = "o3";
  const oyuncular: SOyuncu[] = [
    { o: "o1", ad: "Ayşe", k: "kadın", yas: 14, mk: mektepYeri },
    { o: "o2", ad: "Kerem", k: "erkek", yas: 13, mk: "kahvehane" },
    { o: benId, ad: profil.ad, k: profil.cinsiyet, yas: benYas, mk: "carsi" },
    { o: "o4", ad: "Deniz", k: "erkek", yas: 12, mk: "meydan" },
  ];
  // Öğrenme döneminin 5. günü: 1, 3, 4 tamam; 2 (çıraklık) kaçtı, hâlâ yapılabilir; bugünün hedefi dostluk.
  const kar = {
    oz: [5, 6, 5, 6, 5, 7], op: 1, be: [1, 7, 4, 2, 5, 0], nm: [6, 4, 24, 12], tk: 5, pa: 14, us: 0, mk: "carsi" as string | null, kr: "",
    tn: { ["n" + dost.i]: "tanidik", ["n" + tanis.i]: "tanidik", ["n" + dusman.i]: "dusman", o2: "tanidik", ["n" + nine.i]: "tanidik" } as Record<string, Isaret>,
    sy: { sohbet: 3, mektep: 1, ayakIsi: 2 } as Record<string, number>, og: 0b01101, gun: 5,
  };
  const ili: Record<number, SIli> = {};
  const iliski = (n: SNpc, p: Partial<SIli>) => { ili[n.i] = { t: 0, an: {}, az: {}, kg: 0, dd: 0, red: 0, ...p }; };
  iliski(dost, { t: 10, an: { yardim: 11, sohbet: 7 }, az: { sohbet: 1, yardim: 1 }, dd: 6 });
  iliski(tanis, { t: 4, an: { sohbet: 5 }, az: { sohbet: 1 }, dd: 3 });
  iliski(dusman, { t: -10, an: { laf: -3 }, dd: -9 });
  iliski(kibirli, { t: -8, an: { laf: -4 }, dd: -3 });
  iliski(sifaci, { t: 6, an: { yardim: 9 }, az: { yardim: 1 }, dd: 3 });
  iliski(baba, { t: 6 });
  iliski(anne, { an: { sohbet: 4 }, az: { sohbet: 1 } });
  iliski(kardes, { t: 2 });
  iliski(nine, { t: 8 });
  /** NPC'lerin oyuncu tanıdıklarıma bakışı (yalnız yakın olduğum NPC'nin kartında görünür). */
  const oyuncuBakisi: Record<string, number> = { o2: -12 };

  const saat0 = saatAl();
  const ay = saat0.oyunAyi;
  let sira = 30;
  const olaylar: SOlay[] = [];
  const ref = (id: string): Ref => ({ r: id });
  const nid = (n: SNpc) => "n" + n.i;
  const olayEkle = (o: Omit<SOlay, "s" | "a">, a = ay): SOlay => {
    const x = { ...o, s: ++sira, a: Math.max(0, a) };
    olaylar.push(x);
    return x;
  };
  const yasli = npc.find((n) => n.yas >= 68 && !kullanilan.has(n.i));
  const gelin = npc.find((n) => n.k === 1 && n.yas >= 18 && n.yas <= 24 && !kullanilan.has(n.i));
  const damat = npc.find((n) => n.k === 0 && n.yas >= 20 && n.yas <= 28 && !kullanilan.has(n.i));
  const genc = npc.find((n) => n.yas >= 15 && n.yas <= 18 && !kullanilan.has(n.i));
  const goccu = npc.find((n) => n.yas >= 30 && !kullanilan.has(n.i) && n !== yasli);
  if (yasli) olayEkle({ t: "olum", w: nid(yasli), h: "", ozel: false, n: 3, ak: "olay.olum", p: { kisi: ref(nid(yasli)), yas: yasli.yas } }, ay - 1);
  if (gelin && damat) olayEkle({ t: "evlilik", w: nid(damat), h: nid(gelin), ozel: false, n: 4, ak: "olay.evlilik", p: { a: ref(nid(damat)), b: ref(nid(gelin)) } }, ay - 1);
  const esi = tanis.es ? dizin.get(tanis.es) : undefined;
  if (esi) {
    const bebek = yeni(ri(2) as 0 | 1, 0, tanis.e, tanis.s, tanis.i, esi.i);
    olayEkle({ t: "dogum", w: nid(bebek), h: nid(tanis), ozel: false, n: 3, ak: "olay.dogum", p: { anne: ref(nid(tanis)), baba: ref(nid(esi)), cocuk: ref(nid(bebek)) } }, ay - 1);
  }
  if (genc) olayEkle({ t: "gundem", w: nid(genc), h: "", ozel: false, n: 2, ak: "olay.isBuldu", p: { kisi: ref(nid(genc)), meslek: "çoban" } });
  olayEkle({ t: "eylem", w: "o1", h: nid(dost), ozel: false, n: 2, ak: "olay.eylem.yardim", p: { kisi: ref("o1"), hedef: ref(nid(dost)) } });
  olayEkle({ t: "dostluk", w: nid(dost), h: nid(tanis), ozel: false, n: 1, ak: "olay.dostluk", p: { a: ref(nid(dost)), b: ref(nid(tanis)) } });
  if (goccu) olayEkle({ t: "goc", w: nid(goccu), h: "", ozel: false, n: 3, ak: "olay.goc", p: { kisi: ref(nid(goccu)), sayi: 4 } });
  olayEkle({ t: "yeniSakin", w: "o4", h: "", ozel: false, n: 2, ak: "olay.yeniSakin", p: { kisi: ref("o4") } });
  olayEkle({ t: "ciraklik", w: "o1", h: nid(tanis), ozel: false, n: 5, ak: "olay.ciraklik", p: { kisi: ref("o1"), usta: ref(nid(tanis)), meslek: "fırıncı" } });
  const kart = [
    olayEkle({ t: "gundem", w: nid(tanis), h: "", ozel: false, n: 2, ak: "olay.gundem", p: { kisi: ref(nid(tanis)), gundem: "gecim" } }),
    olayEkle({ t: "eylem", w: "o2", h: nid(dusman), ozel: false, n: 1, ak: "olay.eylem.sohbet", p: { kisi: ref("o2"), hedef: ref(nid(dusman)) } }),
    olayEkle({ t: "hamle", w: nid(sifaci), h: benId, ozel: true, n: 5, ak: "olay.hamle.corba", p: { kisi: ref(nid(sifaci)), sebep: "gorus.ani.yardim" } }),
    olayEkle({ t: "ogrenme", w: "", h: benId, ozel: true, n: 6, ak: "olay.ogrenme.gun", p: { gun: 5 } }),
    olayEkle({ t: "hamle", w: nid(kibirli), h: benId, ozel: true, n: 7, ak: "olay.hamle.laf", p: { kisi: ref(nid(kibirli)), sebep: "gorus.kibir" } }),
  ];
  // Dönüş Kartı sırası (sunucu donus.ts): bana dokunanlar, sonra dost/düşman işaretliler, sonra tanıdıklar; önem.
  const kartSirasi = [kart[4], kart[3], kart[2], kart[1], kart[0]];
  const ist = new Map<string, EylemYaniti>();

  // --- Yardımcılar
  const npcAdi = (n: SNpc, dil: Dil) => {
    const h = NAME_POOLS[dil] ?? NAME_POOLS.tr;
    return `${(n.k ? h.f : h.m)[n.a] ?? "?"} ${soyadCinsli(h.s[n.s] ?? "", dil, n.k ? "kadın" : "erkek")}`;
  };
  const kisiAdi = (id: string, dil: Dil): string | undefined => {
    if (id.startsWith("o")) return oyuncular.find((o) => o.o === id)?.ad;
    const n = dizin.get(Number(id.slice(1)));
    return n ? npcAdi(n, dil) : undefined;
  };
  const meslekGorunumu = (n: SNpc) => (n.yas < 7 ? "çocuk" : n.yas < 14 ? "çırak" : n.m);
  const akrabalik = (n: SNpc): string | undefined => {
    if (n.i === anne.i) return "anne";
    if (n.i === baba.i) return "baba";
    if ((n.an && n.an === anne.i) || (n.ba && n.ba === baba.i)) return "kardes";
    if (n.i === anne.an || n.i === anne.ba || n.i === baba.an || n.i === baba.ba) return "buyukEbeveyn";
    if (n.e === baba.e) return "hane";
    return undefined;
  };
  const gorus = (n: SNpc): Dokum => {
    const kalemler: Kalem[] = [];
    let ham = 0;
    const ekle = (k: string, d: number, p?: Record<string, string | number>) => {
      if (!d) return;
      ham += d;
      kalemler.push(p ? { k, d, p } : { k, d });
    };
    const i = ili[n.i];
    if (i) {
      ekle("gorus.gecmis", i.t);
      for (const [tur, d] of Object.entries(i.an)) ekle(`gorus.ani.${tur}`, d);
    }
    const rol = akrabalik(n);
    if (rol) ekle(`gorus.akraba.${rol}`, AKRABA[rol]);
    if (kar.us) {
      const usta = dizin.get(kar.us);
      if (n.i === kar.us) ekle("gorus.usta", 8);
      else if (usta && n.m === usta.m && n.yas >= 14) ekle("gorus.meslektas", 5);
    }
    const namI = HUY_NAM[n.h];
    if (namI !== undefined) ekle("gorus.huyNam", sinirla(Math.floor(kar.nm[namI] / 10), 0, 10), { huy: n.h, nam: NAMLAR[namI] });
    else if (n.h === "kibirli") ekle("gorus.kibir", -sinirla(Math.floor(kar.nm.reduce((a, b) => a + b, 0) / 40), 0, 10), { huy: n.h });
    if (i?.dd) {
      ham += i.dd;
      kalemler.push(kalem("gorus.dostunDostu", i.dd));
    }
    const toplam = sinirla(ham, -100, 100);
    if (toplam !== ham) kalemler.push(kalem("gorus.sinir", toplam - ham));
    return { toplam, kalemler };
  };
  const tekrar = (n: SNpc | undefined, tur: string) => (n ? ili[n.i]?.az[tur] ?? 0 : ili[0]?.az[tur] ?? 0);
  const getiri = (t: number) => ({ tekrar: t, carpan: Math.round((1 / (1 + t)) * 100) / 100 });
  const kapi = (tur: string, n: SNpc | undefined): HataKodu | undefined => {
    const t = EYLEMLER[tur];
    if ((ACILIS_GUNU[tur] ?? 1) > kar.gun) return "ogrenme_kapali";
    if (n) {
      if (t.hedefYas !== undefined && n.yas < t.hedefYas) return "hedef_uygun_degil";
      if (tur === "ayakIsi" && n.m === "işsiz") return "hedef_uygun_degil";
      if (tur === "cirak") {
        if (kar.us) return "zaten_cirak";
        if (n.m === "işsiz" || n.m === "asker") return "hedef_uygun_degil";
      }
    }
    if (t.bedel && kar.pa < t.bedel) return "para_yok";
    if (tur === "karar" && kar.kr) return "karar_verildi";
    if (tur === "puan" && kar.op <= 0) return "puan_yok";
    if (kar.tk < t.takat) return "takat_yok";
    return undefined;
  };
  const sans = (tur: string, n: SNpc): Dokum => {
    const t = EYLEMLER[tur];
    const kalemler: Kalem[] = [];
    let ham = 0;
    const ekle = (k: string, d: number, p?: Record<string, string | number>) => {
      if (!d) return;
      ham += d;
      kalemler.push(p ? { k, d, p } : { k, d });
    };
    ekle("sans.temel", t.temel);
    const g = gorus(n).toplam;
    ekle("sans.bakis", Math.round(g / 4), { gorus: g });
    ekle("sans.huy", HUY_SANS[tur]?.[n.h] ?? 0, { huy: n.h });
    for (const o of t.ozellik ?? []) ekle("sans.ozellik", Math.round(((kar.oz[OZELLIKLER.indexOf(o as never)] - 5) * 3) / (t.ozellik?.length ?? 1)), { ozellik: o });
    if (t.becerisi) ekle("sans.beceri", Math.floor(kar.be[BECERILER.indexOf(t.becerisi as never)] / 5), { beceri: t.becerisi });
    if (tur === "cirak") ekle("sans.tekrar", -15 * (ili[n.i]?.red ?? 0), { tekrar: ili[n.i]?.red ?? 0 });
    const toplam = sinirla(ham, 5, 95);
    if (toplam !== ham) kalemler.push(kalem("sans.sinir", toplam - ham));
    return { toplam, kalemler };
  };
  const ogrenme = (): OgrenmeDurumu => ({
    gun: kar.gun,
    suruyor: true,
    gunler: GUNLER.map((g) => ({
      gun: g.gun, sistem: g.sistem, acik: g.gun <= kar.gun, hedef: ozet(`ogrenme.hedef.${g.sistem}`, { sayi: g.sayi }),
      ilerleme: Math.min(g.sayi, kar.sy[g.sayac] ?? 0), gerekli: g.sayi, tamam: (kar.og & (1 << (g.gun - 1))) !== 0, odul: g.odul,
    })),
  });
  const ilerle = (): VerilenOdul[] => {
    const verilen: VerilenOdul[] = [];
    for (const g of GUNLER) {
      const bit = 1 << (g.gun - 1);
      if (g.gun > kar.gun || kar.og & bit || (kar.sy[g.sayac] ?? 0) < g.sayi) continue;
      kar.og |= bit;
      if (g.odul.para) kar.pa += g.odul.para;
      if (g.odul.beceri) { const i = BECERILER.indexOf(g.odul.beceri[0] as never); kar.be[i] = Math.min(100, kar.be[i] + g.odul.beceri[1]); }
      if (g.odul.ozellikPuani) kar.op += g.odul.ozellikPuani;
      verilen.push({ gun: g.gun, odul: g.odul });
    }
    return verilen;
  };
  const tanidiklar = (dil: Dil): Tanidik[] => Object.entries(kar.tn)
    .map(([id, isaret]): Tanidik | undefined => {
      if (id.startsWith("o")) { const ad = kisiAdi(id, dil); return ad ? { id, ad, isaret, oyuncu: true } : undefined; }
      const n = dizin.get(Number(id.slice(1)));
      return n ? { id, ad: npcAdi(n, dil), isaret, gorus: gorus(n).toplam } : undefined;
    })
    .filter((x): x is Tanidik => !!x)
    .sort((a, b) => Math.abs(b.gorus ?? 0) - Math.abs(a.gorus ?? 0));
  const olayYaz = (o: SOlay, dil: Dil): Olay => {
    const p: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o.p)) p[k] = typeof v === "object" ? { id: v.r, ad: kisiAdi(v.r, dil) ?? "?" } : v;
    return { sira: o.s, ay: o.a, tur: o.t, kim: o.w || null, hedef: o.h || null, gorunurluk: o.ozel ? "ozel" : "herkes", onem: o.n, ozet: ozet(o.ak, p) };
  };
  const npcBul = (id: unknown) => (typeof id === "string" && /^n[0-9]+$/.test(id) ? dizin.get(Number(id.slice(1))) : undefined);
  const beceriKat = (degisim: EylemYaniti["degisim"], b: string, m: number) => {
    if (m <= 0) return;
    const i = BECERILER.indexOf(b as never);
    kar.be[i] = Math.min(100, kar.be[i] + m);
    degisim.beceri = { ...degisim.beceri, [b]: m };
  };
  const namKat = (degisim: EylemYaniti["degisim"], b: string, m: number) => {
    if (m <= 0) return;
    const i = NAMLAR.indexOf(b as never);
    kar.nm[i] = Math.min(100, kar.nm[i] + m);
    degisim.nam = { ...degisim.nam, [b]: m };
  };

  return {
    ekonomi: () => ({
      kar, yas: benYas, ay: saatAl().oyunAyi, npcMeslekleri: () => npc.filter((n) => n.yas >= 16).map((n) => n.m), benId,
      yetiskinler: (dil: Dil) => npc.filter((n) => n.yas >= 16).map((n) => ({ id: nid(n), ad: npcAdi(n, dil), m: n.m })),
      olayYaz: (o: { t: string; w: string; h: string; n: number; anahtar: string; p: Record<string, string | number | Ref> }, dil: Dil, ayFarki = 0) =>
        olayYaz(olayEkle({ t: o.t, w: o.w, h: o.h, ozel: false, n: o.n, ak: o.anahtar, p: o.p }, saatAl().oyunAyi - ayFarki), dil),
    }),
    durum(dil) {
      const saat = saatAl();
      const harita: HaritaMekani[] = yerler.map((id) => ({ id, kisiler: [] }));
      const yer = new Map(harita.map((m) => [m.id, m]));
      for (const n of npc) if (n.mk) yer.get(n.mk)?.kisiler.push({ id: nid(n), ad: npcAdi(n, dil) });
      for (const o of oyuncular) {
        const mk = o.o === benId ? kar.mk : o.mk;
        if (mk) yer.get(mk)?.kisiler.push({ id: o.o, ad: o.ad, oyuncu: true });
      }
      const usta = kar.us ? dizin.get(kar.us) : undefined;
      const ben: Ben = {
        id: benId, ad: profil.ad, cinsiyet: profil.cinsiyet, yas: benYas, dogumAyi: profil.dogumAyi,
        ozellikler: Object.fromEntries(OZELLIKLER.map((o, i) => [o, kar.oz[i]])), ozellikPuani: kar.op,
        beceriler: Object.fromEntries(BECERILER.map((b, i) => [b, kar.be[i]])),
        nam: Object.fromEntries(NAMLAR.map((b, i) => [b, kar.nm[i]])),
        takat: { kalan: kar.tk, tavan: TAKAT_TAVAN, aylik: TAKAT_AYLIK }, para: kar.pa,
        hane: npc.filter((n) => n.e === baba.e).map((n) => ({ id: nid(n), ad: npcAdi(n, dil), rol: akrabalik(n) ?? "hane" })),
        usta: usta ? { id: nid(usta), ad: npcAdi(usta, dil), meslek: meslekGorunumu(usta) } : null,
        mekan: kar.mk, karar: kar.kr || null, kulYemini: false, tanidiklar: tanidiklar(dil), ogrenme: ogrenme(),
      };
      const oneriler = [sifaci, kibirli]
        .filter((n) => !kar.tn[nid(n)])
        .map((n) => ({ id: nid(n), ad: npcAdi(n, dil), gorus: gorus(n).toplam }))
        .filter((o) => Math.abs(o.gorus) >= 15)
        .sort((a, b) => Math.abs(b.gorus) - Math.abs(a.gorus));
      return {
        saat,
        yerlesim: { id: yerlesim.id, ad: yerlesim.ad, tur, beylik, npc: npc.length, oyuncu: Math.max(oyuncular.length, yerlesim.nufus + 1) },
        ben, harita, donusKarti: kartSirasi.map((o) => olayYaz(o, dil)), oneriler: oneriler.slice(0, 3), imlec: sira,
      };
    },
    olaylar(imlec, dil) {
      const gorunur = olaylar.filter((o) => o.s > imlec && (!o.ozel || o.h === benId || o.w === benId));
      const sayfa = gorunur.slice(0, 50);
      const son = sayfa.length ? sayfa[sayfa.length - 1].s : Math.max(imlec, 0);
      return { olaylar: sayfa.map((o) => olayYaz(o, dil)), imlec: Math.min(Math.max(son, imlec), sira), dahaVar: gorunur.length > 50, eksik: false };
    },
    kisi(id, dil) {
      if (!kisiKimligiMi(id)) return basarisiz("kisi_yok");
      if (id.startsWith("o")) {
        const o = oyuncular.find((x) => x.o === id);
        if (!o) return basarisiz("kisi_yok");
        const mk = o.o === benId ? kar.mk : o.mk;
        return basarili({ id: o.o, ad: o.ad, oyuncu: true, ben: o.o === benId, cinsiyet: o.k, yas: o.yas, mekan: mk, tanidik: kar.tn[o.o] ?? null });
      }
      const n = npcBul(id);
      if (!n) return basarisiz("kisi_yok");
      const aile: AileUyesi[] = [];
      const ekle = (x: SNpc | undefined, rol: string) => { if (x) aile.push({ id: nid(x), ad: npcAdi(x, dil), rol }); };
      if (n.es) ekle(dizin.get(n.es), "es");
      if (n.an) ekle(dizin.get(n.an), "anne");
      if (n.ba) ekle(dizin.get(n.ba), "baba");
      for (const o of npc) {
        if (o.an === n.i || o.ba === n.i) ekle(o, "evlat");
        else if (o !== n && ((o.an && o.an === n.an) || (o.ba && o.ba === n.ba))) ekle(o, "kardes");
      }
      const bakis = gorus(n);
      const yakin = bakis.toplam > 30;
      const liste: Bakis[] = [];
      if (yakin) {
        for (const [i, tur, puan] of n.b) { const o = dizin.get(i); if (o) liste.push({ id: nid(o), ad: npcAdi(o, dil), tur: tur === 1 ? "dost" : "rakip", deger: puan }); }
        for (const o of Object.keys(kar.tn).filter((x) => x.startsWith("o"))) {
          const ad = kisiAdi(o, dil);
          if (ad) liste.push({ id: o, ad, tur: "oyuncu", deger: oyuncuBakisi[o] ?? 0, oyuncu: true });
        }
      }
      const eylemler: EylemKarti[] = NPC_EYLEMLERI.map((tur) => {
        const engel = kapi(tur, n);
        const sansVar = engel === undefined || engel === "takat_yok" || engel === "para_yok" || engel === "ogrenme_kapali";
        return { tur, takat: EYLEMLER[tur].takat, acik: !engel, ...(engel ? { engel } : {}), ...(sansVar ? { sans: sans(tur, n) } : {}), getiri: getiri(tekrar(n, tur)) };
      });
      return basarili({
        id: nid(n), ad: npcAdi(n, dil), cinsiyet: n.k ? "kadın" : "erkek", yas: n.yas, meslek: meslekGorunumu(n), huy: n.h, tuhaflik: n.q, hayal: n.r,
        gundem: GUNDEM_ADI[n.g] || null, mekan: n.mk ?? null, aile, sanaBakis: bakis, bakislari: { gorunur: yakin, liste }, eylemler, tanidik: kar.tn[nid(n)] ?? null,
      });
    },
    eylem(govde) {
      const onceki = ist.get(govde.istekNo);
      if (onceki) return basarili(onceki);
      const dil = govde.dil ?? "tr";
      const tur = govde.tur;
      const t = EYLEMLER[tur];
      if (!t) return basarisiz("eylem_gecersiz");
      const n = tur === "mektep" || tur === "puan" || tur === "karar" ? undefined : npcBul(govde.hedef);
      if (tur !== "mektep" && tur !== "puan" && tur !== "karar" && !n) return basarisiz("kisi_yok");
      if (tur === "karar" && !(KARARLAR as readonly string[]).includes(govde.secim ?? "")) return basarisiz("gecersiz_istek");
      if (tur === "puan" && !(OZELLIKLER as readonly string[]).includes(govde.ozellik ?? "")) return basarisiz("gecersiz_istek");
      const engel = kapi(tur, n);
      if (engel) return basarisiz(engel);
      kar.tk -= t.takat;
      const degisim: EylemYaniti["degisim"] = {};
      let yanit: EylemYaniti;
      const bitir = (ek: Omit<EylemYaniti, "tur" | "degisim" | "takat" | "ogrenme">): EylemYaniti =>
        ({ tur, ...ek, degisim, takat: { kalan: kar.tk, tavan: TAKAT_TAVAN }, ogrenme: ilerle() });
      if (tur === "puan") {
        const i = OZELLIKLER.indexOf(govde.ozellik as never);
        if (kar.oz[i] >= OZELLIK_EN_COK) return basarisiz("gecersiz_istek");
        kar.op--;
        kar.oz[i]++;
        degisim.ozellik = { [OZELLIKLER[i]]: 1 };
        yanit = bitir({ basari: true, sonuc: ozet("sonuc.puan", { ozellik: OZELLIKLER[i] }) });
      } else if (tur === "karar") {
        const secim = govde.secim as string;
        kar.kr = secim;
        beceriKat(degisim, KARAR_BECERI[secim], 3);
        kar.sy.karar = (kar.sy.karar ?? 0) + 1;
        const olay = olayEkle({ t: "eylem", w: benId, h: "", ozel: true, n: 3, ak: "olay.karar", p: { kisi: ref(benId), secim } });
        yanit = { ...bitir({ basari: true, sonuc: ozet("sonuc.karar", { secim }) }), olay: olayYaz(olay, dil) };
      } else if (tur === "mektep") {
        const tk = tekrar(undefined, "mektep");
        const carpan = 1 / (1 + tk);
        ili[0] ??= { t: 0, an: {}, az: {}, kg: 0, dd: 0, red: 0 };
        ili[0].az.mektep = tk + 1;
        kar.mk = mektepYeri;
        beceriKat(degisim, "ilim", Math.round(3 * carpan));
        namKat(degisim, "dindarlik", Math.round(carpan));
        kar.sy.mektep = (kar.sy.mektep ?? 0) + 1;
        const olay = olayEkle({ t: "eylem", w: benId, h: "", ozel: true, n: 1, ak: "olay.eylem.mektep", p: { kisi: ref(benId) } });
        yanit = { ...bitir({ basari: true, getiri: getiri(tk), sonuc: ozet("sonuc.mektep.basari") }), olay: olayYaz(olay, dil) };
      } else {
        const npcH = n as SNpc;
        const s = sans(tur, npcH);
        const zar = 1 + Math.floor(rastgele(karistir(govde.istekNo))() * 100);
        const basari = zar <= s.toplam;
        const i = (ili[npcH.i] ??= { t: 0, an: {}, az: {}, kg: 0, dd: 0, red: 0 });
        const tk = i.az[tur] ?? 0;
        const carpan = 1 / (1 + tk);
        i.az[tur] = tk + 1;
        kar.mk = npcH.mk ?? "meydan";
        const p: Record<string, string | number> = {};
        let k = "";
        let n0 = 1;
        let ozel = false;
        if (basari) {
          const kazanc = Math.min(Math.round(t.kazanc * carpan), Math.max(0, 10 - i.kg));
          if (kazanc > 0) {
            const taban = Math.floor(kazanc / 3);
            i.t += taban;
            if (kazanc - taban > 0) i.an[tur] = (i.an[tur] ?? 0) + kazanc - taban;
            i.kg += kazanc;
            degisim.gorus = kazanc;
            p.gorus = kazanc;
          }
          if (t.beceri) beceriKat(degisim, t.beceri[0], Math.round(t.beceri[1] * carpan));
          if (t.nam) namKat(degisim, t.nam[0], Math.round(t.nam[1] * carpan));
          if (t.bedel) { kar.pa -= t.bedel; degisim.para = -t.bedel; }
          if (t.ucret) { const u = Math.max(1, Math.round(t.ucret * carpan)); kar.pa += u; degisim.para = u; p.para = u; }
          if (tur === "sohbet") kar.sy.sohbet = (kar.sy.sohbet ?? 0) + 1;
          if (tur === "hediye") kar.sy.dostluk = (kar.sy.dostluk ?? 0) + 1;
          if (tur === "ayakIsi") { kar.sy.ayakIsi = (kar.sy.ayakIsi ?? 0) + 1; ozel = true; }
          if (tur === "cirak") { kar.sy.cirak = (kar.sy.cirak ?? 0) + 1; kar.us = npcH.i; p.meslek = npcH.m; }
          k = tur === "cirak" ? "olay.ciraklik" : `olay.eylem.${tur}`;
          n0 = tur === "cirak" ? 5 : tur === "sohbet" ? 1 : 2;
        } else if (tur === "cirak") {
          kar.sy.cirak = (kar.sy.cirak ?? 0) + 1;
          i.red++;
          k = "olay.eylem.cirakRed";
          ozel = true;
        }
        const olay = k
          ? olayEkle({ t: tur === "cirak" && basari ? "ciraklik" : "eylem", w: benId, h: nid(npcH), ozel, n: n0, ak: k,
            p: tur === "cirak" && basari ? { kisi: ref(benId), usta: ref(nid(npcH)), meslek: npcH.m } : { kisi: ref(benId), hedef: ref(nid(npcH)) } })
          : undefined;
        yanit = {
          ...bitir({ hedef: nid(npcH), sans: s, zar, basari, getiri: getiri(tk), sonuc: ozet(`sonuc.${tur}.${basari ? "basari" : "basarisiz"}`, p) }),
          hedefAd: npcAdi(npcH, dil),
          ...(olay ? { olay: olayYaz(olay, dil) } : {}),
        };
      }
      ist.set(govde.istekNo, yanit);
      return basarili(yanit);
    },
    tanidik(govde) {
      const dil = govde.dil ?? "tr";
      const hedef = govde.hedef;
      const var_ = kisiKimligiMi(hedef) && (hedef.startsWith("o") ? oyuncular.some((o) => o.o === hedef) : !!npcBul(hedef));
      if (!var_) return basarisiz("kisi_yok");
      if (hedef === benId) return basarisiz("isaret_gecersiz");
      if (govde.isaret === null) delete kar.tn[hedef];
      else {
        if ((ACILIS_GUNU[govde.isaret] ?? 1) > kar.gun) return basarisiz("ogrenme_kapali");
        if (govde.isaret === "dost" && hedef.startsWith("o")) return basarisiz("isaret_gecersiz");
        const onceki = kar.tn[hedef];
        kar.tn[hedef] = govde.isaret;
        if (govde.isaret === "dost" && onceki !== "dost") kar.sy.dostluk = (kar.sy.dostluk ?? 0) + 1;
      }
      return basarili({ tanidiklar: tanidiklar(dil), ogrenme: ilerle() });
    },
  };
}
