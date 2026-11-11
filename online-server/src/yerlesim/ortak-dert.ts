// Ortak dertler (Ek A §3.4, E6): kıtlık, haydut tehdidi, salgın, hasat gibi bölge olaylarında farklı meslekler farklı
// katkı verir. Kıtlık ve haydut Faz 5 kasaba tetiklerinden (arka-plan.ts) açılır; hasat her yıl Eylül'de, salgın
// düşük olasılıkla (tohumlu). Katkı EŞZAMANLI ÇEVRİMİÇİ GEREKTİRMEZ: derdin açık penceresi boyunca (en az birkaç gerçek
// gün) istenen an yapılır. Katkılar "Ortak Dert Defteri"nde isimle anılır (statik liste). NPC halkı her ay taban katkı
// verir: hiçbir dert tek oyuncunun çevrimiçi olmasına bağlı değildir.
// - Eşik karşılanırsa dert başarılır: kasaba tetiği hemen söner (etki hafifler), ilgili gösterge biraz artar.
// - Karşılanmazsa yalnız bölge göstergesi (arz ya da moral) düşer; tabanlı (D-35). Oyuncu karakteri ceza görmez.
// - Kişi başı katkı sayısı tavanlı; nam ve gönül ödülü dert başına tek sefer (izi defterde). Akçe verilmez.
// Saf fonksiyonlar.

import { MALLAR, malBul, type MalId } from "../icerik/mallar.ts";
import type { MeslekId } from "../icerik/meslekler.ts";
import { takvim } from "../saat.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { arkaPlanAl, tetikSurer, type KasabaTetigi } from "./arka-plan.ts";
import { etkinMi } from "./gundem.ts";
import { halDegistir } from "./hal.ts";
import { olduMu } from "./hanedan.ts";
import { namEkle, takatHarca, type Nam } from "./karakter.ts";
import { mesrepEtkisi } from "./mesrep.ts";
import { hizmetAcik } from "./beceri-etki.ts";
import { envanterEkle } from "./npc-taban.ts";
import { oyuncuRef } from "./ortak.ts";
import { tohumlu } from "./rastgele.ts";
import { gostergeDegistir, toplulukAl, type Gosterge, type ToplulukKaydi } from "./topluluk-kayit.ts";
import type { Karakter, Kasaba, OlayTaslagi } from "./tipler.ts";

export const DERT_TURLERI = ["kitlik", "haydut", "salgin", "hasat"] as const;
export type DertTuru = (typeof DERT_TURLERI)[number];
export const KATKI_TURLERI = ["erzak", "malzeme", "alet", "bakim", "nobet", "kayit", "tedarik", "moral", "elEmegi"] as const;
export type KatkiTuru = (typeof KATKI_TURLERI)[number];

/** [PARAMETRE] Mal katkıları ve kabul edilen mallar (puan = mal taban değeri × adet). */
export const KATKI_MALLARI: Readonly<Partial<Record<KatkiTuru, readonly MalId[]>>> = {
  erzak: ["tahil", "bugday", "bakla", "et", "ekmek", "un", "corba", "kuruEt", "peksimet", "pastirma", "zahire", "erzakSandigi"],
  malzeme: ["odun", "sertOdun", "kereste", "tas", "kiris", "kesmeTas", "bez", "kece", "deri", "cadir"],
  alet: ["alet", "nal", "civi", "bicak", "mizrak", "kalkan", "kilic"],
};
/** [PARAMETRE] Emek katkıları: hangi meslek verir ("elEmegi" herkese açık; "nobet" gözü pek meşrepte de açık). */
export const MESLEK_KATKI: Readonly<Record<MeslekId, KatkiTuru>> = {
  ciftci: "erzak",
  asci: "erzak",
  hanci: "erzak",
  oduncu: "malzeme",
  marangoz: "malzeme",
  dokumaci: "malzeme",
  demirci: "alet",
  sifaci: "bakim",
  asker: "nobet",
  katip: "kayit",
  divan: "kayit",
  tuccar: "tedarik",
  ozan: "moral",
  arabulucu: "moral",
};
/** [PARAMETRE] Derde göre katkı çarpanı (listede olmayan katkı ORTAK_DERT_DIGER_CARPANI ile sayılır). */
export const DERT_CARPAN: Readonly<Record<DertTuru, Readonly<Partial<Record<KatkiTuru, number>>>>> = {
  kitlik: { erzak: 1.5, tedarik: 1.5, bakim: 1, kayit: 1, moral: 1 },
  haydut: { nobet: 1.5, alet: 1.5, kayit: 1, tedarik: 1 },
  salgin: { bakim: 1.5, erzak: 1, kayit: 1, moral: 1 },
  hasat: { elEmegi: 1.5, alet: 1, tedarik: 1, erzak: 1 },
};
export const ORTAK_DERT_DIGER_CARPANI = 0.5;
/** [PARAMETRE] Emek puanı: taban + meslek kademesi × artış; el emeği sabit. */
export const EMEK_PUAN_TABAN = 6;
export const EMEK_PUAN_KADEME = 2;
export const EL_EMEGI_PUAN = 4;
/** [PARAMETRE] Katkı bedeli (takat), kişi başı dert başına katkı tavanı, katkı başına mal adedi tavanı. */
export const ORTAK_DERT_TAKAT = 1;
export const ORTAK_DERT_KISI_EN_COK = 3;
export const ORTAK_DERT_ADET_EN_COK = 10;
/** [PARAMETRE] Eşik = taban + etkin oyuncu başı (açılışta sabitlenir), tavanlı; NPC halkının aylık taban katkısı. */
export const ORTAK_DERT_ESIK_TABAN = 40;
export const ORTAK_DERT_ESIK_KISI = 15;
export const ORTAK_DERT_ESIK_TAVAN = 200;
export const ORTAK_DERT_NPC_AYLIK = 8;
/** [PARAMETRE] Açık pencere en az (ay; 12 gerçek saat = 1 ay); hasat ayı ve süresi; salgın olasılığı ve aralığı. */
export const ORTAK_DERT_PENCERE_EN_AZ = 4;
export const HASAT_AYI = 9;
export const HASAT_SURESI = 4;
export const SALGIN_ORANI = 0.03;
export const SALGIN_SURESI = 4;
export const SALGIN_ARALIK = 12;
/** [PARAMETRE] Sonuç: hangi gösterge, başarıda artış, başarısızlıkta düşüş (tabanlı, D-35). */
export const DERT_GOSTERGE: Readonly<Record<DertTuru, Gosterge>> = { kitlik: "arz", hasat: "arz", haydut: "moral", salgin: "moral" };
export const DERT_BASARI_ARTIS = 5;
export const DERT_BASARISIZ_DUSUS = 10;
/** [PARAMETRE] İlk katkının tek seferlik ödülü: gönül ve nam (aylık nam tavanı da uygulanır). */
export const ORTAK_DERT_GONUL = 3;
export const ORTAK_DERT_NAM = 1;
export const DERT_NAM: Readonly<Record<DertTuru, Nam>> = { kitlik: "comertlik", hasat: "caliskanlik", haydut: "mertlik", salgin: "dindarlik" };
/** [PARAMETRE] Tutulan kapanmış dert ve defter satırı sayısı. */
export const ORTAK_DERT_TUTULAN = 6;
export const DEFTER_EN_COK = 60;

/** Defter satırı: oyuncu, ad, verdiği katkı türleri, katkı sayısı, puan. */
export interface DertKatkisi {
  o: string;
  ad: string;
  t: KatkiTuru[];
  n: number;
  p: number;
}

export interface OrtakDert {
  i: number;
  t: DertTuru;
  /** Açılış ve son açık ay (dahil). */
  ac: number;
  bt: number;
  /** Eşik ve toplanan puan (oyuncu + NPC halkı). */
  es: number;
  pu: number;
  /** NPC halkının katkısı (puan). */
  np: number;
  d: "acik" | "basardi" | "basarisiz";
  ka?: number;
  k: DertKatkisi[];
}

const derttenTetik = (t: DertTuru): KasabaTetigi | undefined => (t === "kitlik" || t === "haydut" ? t : undefined);

function etkinSayisi(k: Kasaba, ay: number): number {
  let n = 0;
  for (const s of k.sakin) {
    const c = k.kar.get(s.o);
    if (c && !olduMu(c) && etkinMi(c, ay)) n++;
  }
  return n;
}

function dertAc(k: Kasaba, tl: ToplulukKaydi, t: DertTuru, ay: number, sure: number): OlayTaslagi {
  const es = Math.min(ORTAK_DERT_ESIK_TAVAN, ORTAK_DERT_ESIK_TABAN + ORTAK_DERT_ESIK_KISI * etkinSayisi(k, ay));
  const d: OrtakDert = { i: tl.on++, t, ac: ay, bt: ay + Math.max(sure, ORTAK_DERT_PENCERE_EN_AZ) - 1, es, pu: 0, np: 0, d: "acik", k: [] };
  tl.od.push(d);
  return { t: "ortakDert", w: "", h: "", g: "", n: 6, k: "olay.ortakDert.acildi", p: { dert: t, esik: es, bitis: d.bt } };
}

function kapat(k: Kasaba, tl: ToplulukKaydi, d: OrtakDert, ay: number, basardi: boolean): OlayTaslagi {
  d.d = basardi ? "basardi" : "basarisiz";
  d.ka = ay;
  const g = DERT_GOSTERGE[d.t];
  const fark = gostergeDegistir(tl, g, basardi ? DERT_BASARI_ARTIS : -DERT_BASARISIZ_DUSUS);
  const tetik = derttenTetik(d.t);
  if (basardi && tetik) {
    const ap = arkaPlanAl(k);
    if (tetikSurer(ap, tetik, ay)) ap.tt[tetik] = ay;
  }
  return {
    t: "ortakDert",
    w: "",
    h: "",
    g: "",
    n: 6,
    k: basardi ? "olay.ortakDert.basardi" : "olay.ortakDert.basarisiz",
    p: { dert: d.t, puan: d.pu, esik: d.es, katilan: d.k.length, gosterge: g, fark },
  };
}

/** Ay dönümü: yeni dertler, NPC halkının katkısı, süresi dolanların kapanışı. */
export function ortakDertDonumu(k: Kasaba, ay: number): OlayTaslagi[] {
  const tl = toplulukAl(k);
  const olaylar: OlayTaslagi[] = [];
  const acikTur = (t: DertTuru) => tl.od.some((d) => d.d === "acik" && d.t === t);
  const ap = arkaPlanAl(k);
  for (const t of ["kitlik", "haydut"] as const) {
    if (tetikSurer(ap, t, ay) && !acikTur(t)) olaylar.push(dertAc(k, tl, t, ay, (ap.tt[t] ?? ay) - ay + 1));
  }
  if (takvim(ay).ay === HASAT_AYI && !acikTur("hasat")) olaylar.push(dertAc(k, tl, "hasat", ay, HASAT_SURESI));
  if (!acikTur("salgin") && ay - (tl.ss ?? -1e9) >= SALGIN_ARALIK && tohumlu("salgin", k.y, ay)() < SALGIN_ORANI) {
    tl.ss = ay;
    olaylar.push(dertAc(k, tl, "salgin", ay, SALGIN_SURESI));
  }
  for (const d of tl.od) {
    if (d.d !== "acik") continue;
    if (d.ac < ay) {
      d.np += ORTAK_DERT_NPC_AYLIK;
      d.pu += ORTAK_DERT_NPC_AYLIK;
    }
    if (d.pu >= d.es) olaylar.push(kapat(k, tl, d, ay, true));
    else if (ay > d.bt) olaylar.push(kapat(k, tl, d, ay, false));
  }
  const kapali = tl.od.filter((d) => d.d !== "acik");
  if (kapali.length > ORTAK_DERT_TUTULAN) {
    const sil = new Set(kapali.slice(0, kapali.length - ORTAK_DERT_TUTULAN));
    tl.od = tl.od.filter((d) => !sil.has(d));
  }
  return olaylar;
}

/** Oyuncunun ana mesleği ve o meslekteki kademesi. */
function anaMeslek(kar: Karakter): { m: MeslekId | undefined; kd: number } {
  const m = kar.ms?.a || undefined;
  return { m, kd: m ? (kar.ms?.s[m]?.kd ?? 0) : 0 };
}

/** Oyuncunun bu derde verebileceği katkılar (görünüm): mal katkıları herkese açık, emek mesleğe bağlı. */
export function uygunKatkilar(kar: Karakter): KatkiTuru[] {
  const { m } = anaMeslek(kar);
  const liste = new Set<KatkiTuru>(["erzak", "malzeme", "alet", "elEmegi"]);
  if (m && m !== "asker") liste.add(MESLEK_KATKI[m]);
  // Asker nöbeti, mesleği ne olursa olsun ilgili beceri hizmetini öğrenenlere açılır.
  if (hizmetAcik(kar, "nobet") || mesrepEtkisi(kar, "nobet") > 0) liste.add("nobet");
  return KATKI_TURLERI.filter((t) => liste.has(t));
}

export const carpanBul = (d: DertTuru, t: KatkiTuru): number => DERT_CARPAN[d][t] ?? ORTAK_DERT_DIGER_CARPANI;

/** POST /v1/ortak-dert {dert, katki, mal?, adet?}: katkı (istekNo kabukta). Ödül tek sefer; akçe yok. */
export function ortakDertKatki(k: Kasaba, kar: Karakter, govde: Record<string, unknown>, ay: number): Sonuc<{ yanit: Record<string, unknown>; olaylar: OlayTaslagi[] }> {
  const tl = toplulukAl(k);
  const id = typeof govde.dert === "number" ? govde.dert : typeof govde.dert === "string" ? Number(govde.dert.replace(/^d/, "")) : NaN;
  const d = tl.od.find((x) => x.i === id);
  if (!d) return hata("dert_yok");
  if (d.d !== "acik") return hata("dert_kapandi");
  const tur = govde.katki;
  if (typeof tur !== "string" || !(KATKI_TURLERI as readonly string[]).includes(tur)) return hata("katki_gecersiz");
  const katki = tur as KatkiTuru;
  if (!uygunKatkilar(kar).includes(katki)) return hata("katki_gecersiz");
  const satir = d.k.find((x) => x.o === kar.o);
  if ((satir?.n ?? 0) >= ORTAK_DERT_KISI_EN_COK) return hata("katki_siniri");
  const mallar = KATKI_MALLARI[katki];
  const kalemler: { k: string; d: number; p?: Record<string, string | number> }[] = [];
  let ham: number;
  let mal: MalId | undefined;
  let adet = 0;
  if (mallar) {
    mal = malBul(govde.mal);
    adet = typeof govde.adet === "number" && Number.isInteger(govde.adet) ? govde.adet : 0;
    if (!mal || !mallar.includes(mal) || adet < 1 || adet > ORTAK_DERT_ADET_EN_COK) return hata("katki_gecersiz");
    if ((kar.ev?.[mal] ?? 0) < adet) return hata("mal_yok");
    ham = MALLAR[mal].taban * adet;
    kalemler.push({ k: "ortakDert.puan.mal", d: ham, p: { mal, adet, taban: MALLAR[mal].taban } });
  } else if (katki === "elEmegi") {
    ham = EL_EMEGI_PUAN;
    kalemler.push({ k: "ortakDert.puan.elEmegi", d: ham });
  } else {
    const kd = anaMeslek(kar).kd;
    ham = EMEK_PUAN_TABAN + EMEK_PUAN_KADEME * kd;
    kalemler.push({ k: "ortakDert.puan.emek", d: EMEK_PUAN_TABAN }, ...(kd ? [{ k: "ortakDert.puan.kademe", d: EMEK_PUAN_KADEME * kd, p: { kademe: kd } }] : []));
  }
  const carpan = carpanBul(d.t, katki);
  const puan = Math.max(1, Math.round(ham * carpan));
  if (puan !== ham) kalemler.push({ k: "ortakDert.puan.carpan", d: puan - ham, p: { carpan, dert: d.t } });
  if (!takatHarca(kar, ay, ORTAK_DERT_TAKAT)) return hata("takat_yok");
  if (mal) envanterEkle(kar, mal, -adet);
  const olaylar: OlayTaslagi[] = [];
  const odul: { gonul?: number; nam?: Partial<Record<Nam, number>> } = {};
  if (!satir) {
    const g = halDegistir(kar, ay, { gonul: ORTAK_DERT_GONUL }, "hal.neden.ortakDert").gonul;
    if (g) odul.gonul = g;
    const n = namEkle(kar, ay, DERT_NAM[d.t], ORTAK_DERT_NAM);
    if (n) odul.nam = { [DERT_NAM[d.t]]: n };
    if (d.k.length < DEFTER_EN_COK) d.k.push({ o: kar.o, ad: kar.ad, t: [katki], n: 1, p: puan });
  } else {
    satir.n++;
    satir.p += puan;
    if (!satir.t.includes(katki)) satir.t.push(katki);
  }
  d.pu += puan;
  let basardi = false;
  if (d.pu >= d.es) {
    olaylar.push(kapat(k, tl, d, ay, true));
    basardi = true;
  } else {
    olaylar.push({ t: "ortakDert", w: kar.o, h: "", g: kar.o, n: 3, k: "olay.ortakDert.katki", p: { kisi: oyuncuRef(kar), dert: d.t, katki, puan } });
  }
  return basarili({
    yanit: {
      dert: dertGorunumu(d, kar),
      katki: { tur: katki, puan, dokum: { toplam: puan, kalemler } },
      odul,
      basardi,
    },
    olaylar,
  });
}

/** Tek dert görünümü: eşik, puan, pencere, katkı çarpanları, defter (isim + katkı türleri), benim satırım. */
export function dertGorunumu(d: OrtakDert, kar?: Karakter) {
  const ben = kar ? d.k.find((x) => x.o === kar.o) : undefined;
  return {
    id: `d${d.i}`,
    tur: d.t,
    durum: d.d,
    acilis: d.ac,
    bitis: d.bt,
    esik: d.es,
    puan: d.pu,
    halk: d.np,
    carpanlar: Object.fromEntries(KATKI_TURLERI.map((t) => [t, carpanBul(d.t, t)])),
    defter: d.k.map((x) => ({ id: x.o, ad: x.ad, katkilar: x.t })),
    ...(kar ? { benim: { sayi: ben?.n ?? 0, kalan: ORTAK_DERT_KISI_EN_COK - (ben?.n ?? 0), puan: ben?.p ?? 0 } } : {}),
    ...(d.ka !== undefined ? { kapanis: d.ka } : {}),
  };
}

export const ORTAK_DERT_KURALLARI = {
  takat: ORTAK_DERT_TAKAT,
  kisiEnCok: ORTAK_DERT_KISI_EN_COK,
  adetEnCok: ORTAK_DERT_ADET_EN_COK,
  esik: { taban: ORTAK_DERT_ESIK_TABAN, kisi: ORTAK_DERT_ESIK_KISI, tavan: ORTAK_DERT_ESIK_TAVAN },
  halkAylik: ORTAK_DERT_NPC_AYLIK,
  pencereEnAz: ORTAK_DERT_PENCERE_EN_AZ,
  emek: { taban: EMEK_PUAN_TABAN, kademe: EMEK_PUAN_KADEME, elEmegi: EL_EMEGI_PUAN },
  digerCarpani: ORTAK_DERT_DIGER_CARPANI,
  mallar: KATKI_MALLARI,
  meslekKatki: MESLEK_KATKI,
  sonuc: { gosterge: DERT_GOSTERGE, basari: DERT_BASARI_ARTIS, basarisiz: -DERT_BASARISIZ_DUSUS, karakterCezasi: 0 },
  odul: { gonul: ORTAK_DERT_GONUL, nam: ORTAK_DERT_NAM, namTuru: DERT_NAM, akce: 0 },
} as const;
