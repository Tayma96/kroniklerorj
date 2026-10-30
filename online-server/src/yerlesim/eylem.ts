// Oyuncu–NPC eylemleri (§13.8: anında çözülür). Her eylem şans dökümü, zar, sonuç, olay ve takat döndürür.
// Farm yok: aynı (oyuncu, NPC, eylem türü) için azalan getiri (6 ay penceresi, çarpan 1/(1+n)) ve NPC başına
// aylık görüş kazancı tavanı. Yaş kapısı (§3: bu eylemler 12+) ve öğrenme dönemi kapıları burada denetlenir.

import { HUYLAR, MESLEKLER } from "../icerik/kisilik.ts";
import { hata, basarili, type HataKodu, type Sonuc } from "../tipler.ts";
import { mektepMekani, npcMekani } from "./cizelge.ts";
import { gorusDegeri } from "./gorus.ts";
import {
  BECERILER,
  OZELLIKLER,
  OZELLIK_EN_COK,
  TAKAT_TAVAN,
  beceriEkle,
  beceriVer,
  karakterYasi,
  namEkle,
  takatHarca,
  takatTazele,
  type Beceri,
  type Nam,
  type Ozellik,
} from "./karakter.ts";
import { acikMi, ogrenmeIlerle, sayacArtir, type VerilenOdul } from "./ogrenme.ts";
import { kisiCoz, npcKimlik, npcRef, oyuncuRef, sinirla, yas } from "./ortak.ts";
import type { Zar } from "./rastgele.ts";
import type { Dokum, Iliski, IliskiHaritasi, Kalem, Karakter, Kasaba, Npc, OlayTaslagi } from "./tipler.ts";

export const EYLEM_TURLERI = ["sohbet", "yardim", "hediye", "ayakIsi", "cirak", "mektep", "puan", "karar"] as const;
export type EylemTuru = (typeof EYLEM_TURLERI)[number];
export const NPC_EYLEMLERI = ["sohbet", "yardim", "hediye", "ayakIsi", "cirak"] as const satisfies readonly EylemTuru[];
export const KARARLAR = { zanaat: "zanaat", ilim: "ilim", ticaret: "ticaret", yol: "dovus" } as const satisfies Record<
  string,
  Beceri
>;

/** [PARAMETRE] Azalan getiri penceresi (ay) ve NPC başına aylık görüş kazancı tavanı. */
export const AZALAN_PENCERE = 6;
export const AYLIK_GORUS_TAVANI = 10;
export const SANS_ALT = 5;
export const SANS_UST = 95;
/** Mektep ve hedefsiz eylemlerin azalan getirisi bu anahtarda tutulur (NPC kimliği 0 yoktur). */
const OKUL = "0";

interface Tanim {
  takat: number;
  yas: number;
  npc: boolean;
  temel: number;
  /** Başarıda NPC'nin görüşüne katılacak taban kazanç (azalan getiriyle çarpılır, aylık tavanlı). */
  kazanc: number;
  beceri?: [Beceri, number];
  nam?: [Nam, number];
  /** Hedef NPC'nin en küçük yaşı. */
  hedefYas?: number;
  /** Ödenecek bedel (hediye) ya da kazanılacak ücret (ayak işi). */
  bedel?: number;
  ucret?: number;
  ozellik?: Ozellik[];
  becerisi?: Beceri;
}

export const EYLEMLER: Readonly<Record<EylemTuru, Tanim>> = {
  sohbet: { takat: 1, yas: 12, npc: true, temel: 70, kazanc: 4, beceri: ["soz", 1], hedefYas: 6, ozellik: ["karizma"], becerisi: "soz" },
  yardim: {
    takat: 1, yas: 12, npc: true, temel: 65, kazanc: 8, beceri: ["zanaat", 1], nam: ["mertlik", 2], hedefYas: 6,
    ozellik: ["guc", "dayaniklilik"],
  },
  hediye: {
    takat: 1, yas: 12, npc: true, temel: 85, kazanc: 9, beceri: ["soz", 1], nam: ["comertlik", 2], hedefYas: 6, bedel: 2,
    ozellik: ["karizma"],
  },
  ayakIsi: {
    takat: 1, yas: 12, npc: true, temel: 70, kazanc: 3, beceri: ["ticaret", 1], nam: ["caliskanlik", 1], hedefYas: 16,
    ucret: 3, ozellik: ["ceviklik"], becerisi: "ticaret",
  },
  cirak: {
    takat: 1, yas: 12, npc: true, temel: 35, kazanc: 6, beceri: ["zanaat", 2], nam: ["caliskanlik", 1], hedefYas: 20,
    ozellik: ["zeka"], becerisi: "zanaat",
  },
  mektep: { takat: 1, yas: 12, npc: false, temel: 100, kazanc: 0, beceri: ["ilim", 3], nam: ["dindarlik", 1] },
  puan: { takat: 0, yas: 12, npc: false, temel: 100, kazanc: 0 },
  karar: { takat: 0, yas: 12, npc: false, temel: 100, kazanc: 0 },
};

/** Huyun eyleme göre şans etkisi (yüzde puanı). */
const HUY_SANS: Readonly<Partial<Record<EylemTuru, Readonly<Record<string, number>>>>> = {
  sohbet: { utangaç: -15, yalnız: -10, ciddi: -5, neşeli: 10, sıcakkanlı: 10, misafirperver: 5 },
  yardim: { kibirli: -10, aceleci: -5, dertli: 10, sabırlı: 5 },
  hediye: { kibirli: -15, cömert: 5, sıcakkanlı: 5 },
  ayakIsi: { kurnaz: -5, hırslı: 10, unutkan: 5 },
  cirak: { sabırlı: 10, ciddi: 5, aceleci: -10, kibirli: -10 },
};
const USTA_OLAMAZ = new Set([MESLEKLER.indexOf("işsiz"), MESLEKLER.indexOf("asker")]);

export function eylemTuruMu(v: unknown): v is EylemTuru {
  return typeof v === "string" && (EYLEM_TURLERI as readonly string[]).includes(v);
}

function yeniIliski(): Iliski {
  return { t: 0, an: [], az: {}, ka: 0, kg: 0 };
}

export function iliskiAl(ili: IliskiHaritasi, anahtar: string | number): Iliski {
  let i = ili[anahtar];
  if (!i) {
    i = yeniIliski();
    ili[anahtar] = i;
  }
  return i;
}

/** Bu eylem türü bu NPC'ye pencere içinde kaç kez yapıldı. */
export function tekrarSayisi(i: Iliski | undefined, tur: string, ay: number): number {
  const aylar = i?.az[tur];
  if (!aylar) return 0;
  let n = 0;
  for (const a of aylar) if (ay - a < AZALAN_PENCERE) n++;
  return n;
}

export function getiriCarpani(tekrar: number): number {
  return 1 / (1 + tekrar);
}

/** Hedef uygun mu? Uygun değilse hata kodu. */
function hedefKapisi(tur: EylemTuru, npc: Npc, kar: Karakter, ay: number): HataKodu | undefined {
  const t = EYLEMLER[tur];
  const y = yas(npc.d, ay);
  if (t.hedefYas !== undefined && y < t.hedefYas) return "hedef_uygun_degil";
  if (tur === "ayakIsi" && npc.m === MESLEKLER.indexOf("işsiz")) return "hedef_uygun_degil";
  if (tur === "cirak") {
    if (kar.us) return "zaten_cirak";
    if (USTA_OLAMAZ.has(npc.m)) return "hedef_uygun_degil";
  }
  return undefined;
}

/** Eylemin şu an yapılıp yapılamayacağı (yaş, öğrenme günü, hedef, para, takat). */
export function eylemKapisi(kasaba: Kasaba, tur: EylemTuru, kar: Karakter, npc: Npc | undefined, ay: number): HataKodu | undefined {
  const t = EYLEMLER[tur];
  if (karakterYasi(kar, ay) < t.yas) return "yas_kapisi";
  if (!acikMi(kar, ay, tur)) return "ogrenme_kapali";
  if (t.npc) {
    if (!npc || !kasaba.dizin.has(npc.i)) return "kisi_yok";
    const h = hedefKapisi(tur, npc, kar, ay);
    if (h) return h;
  }
  if (t.bedel && kar.pa < t.bedel) return "para_yok";
  if (tur === "karar" && kar.kr) return "karar_verildi";
  if (tur === "puan" && kar.op <= 0) return "puan_yok";
  takatTazele(kar, ay);
  if (kar.tk < t.takat) return "takat_yok";
  return undefined;
}

/** Kabul şansı (yüzde) = kalemlerin toplamı; 5..95'e kırpılırsa fark "sans.sinir" kalemiyle görünür. */
export function eylemSansi(
  kasaba: Kasaba,
  tur: EylemTuru,
  npc: Npc,
  kar: Karakter,
  ili: IliskiHaritasi | undefined,
  ay: number,
): Dokum {
  const t = EYLEMLER[tur];
  const kalemler: Kalem[] = [];
  let ham = 0;
  const ekle = (k: string, d: number, p?: Record<string, string | number>) => {
    if (d === 0) return;
    ham += d;
    kalemler.push(p ? { k, d, p } : { k, d });
  };
  ekle("sans.temel", t.temel);
  const g = gorusDegeri(kasaba, npc, kar, ili, ay);
  ekle("sans.bakis", Math.round(g / 4), { gorus: g });
  const huy = HUYLAR[npc.h] ?? "";
  ekle("sans.huy", HUY_SANS[tur]?.[huy] ?? 0, { huy });
  for (const o of t.ozellik ?? []) {
    const deger = kar.oz[OZELLIKLER.indexOf(o)] ?? 5;
    ekle("sans.ozellik", Math.round(((deger - 5) * 3) / (t.ozellik?.length ?? 1)), { ozellik: o });
  }
  if (t.becerisi) ekle("sans.beceri", Math.floor((kar.be[BECERILER.indexOf(t.becerisi)] ?? 0) / 5), { beceri: t.becerisi });
  if (tur === "cirak") {
    const red = tekrarSayisi(ili?.[npc.i], "cirakRed", ay);
    ekle("sans.tekrar", -15 * red, { tekrar: red });
  }
  const toplam = sinirla(ham, SANS_ALT, SANS_UST);
  if (toplam !== ham) kalemler.push({ k: "sans.sinir", d: toplam - ham });
  return { toplam, kalemler };
}

export interface EylemGirdisi {
  tur: EylemTuru;
  hedef?: string;
  secim?: string;
  ozellik?: string;
}

/** POST /v1/eylem gövdesi (istekNo ayrıca denetlenir). */
export function eylemGirdisiCoz(govde: unknown): Sonuc<EylemGirdisi> {
  if (typeof govde !== "object" || govde === null || Array.isArray(govde)) return hata("gecersiz_istek");
  const g = govde as Record<string, unknown>;
  if (!eylemTuruMu(g.tur)) return hata("eylem_gecersiz");
  const girdi: EylemGirdisi = { tur: g.tur };
  if (EYLEMLER[g.tur].npc) {
    const k = kisiCoz(g.hedef);
    if (!k) return hata("kisi_yok");
    if (k.tur !== "npc") return hata("hedef_uygun_degil");
    girdi.hedef = g.hedef as string;
  }
  if (g.tur === "karar") {
    if (typeof g.secim !== "string" || !Object.hasOwn(KARARLAR, g.secim)) return hata("gecersiz_istek");
    girdi.secim = g.secim;
  }
  if (g.tur === "puan") {
    if (typeof g.ozellik !== "string" || !(OZELLIKLER as readonly string[]).includes(g.ozellik)) return hata("gecersiz_istek");
    girdi.ozellik = g.ozellik;
  }
  return basarili(girdi);
}

export interface EylemSonucu {
  tur: EylemTuru;
  hedef?: string;
  sans?: Dokum;
  zar?: number;
  basari: boolean;
  /** Azalan getiri: bu eylemin bu kişiye pencere içindeki tekrarı ve çarpanı. */
  getiri?: { tekrar: number; carpan: number };
  sonuc: { k: string; p: Record<string, string | number> };
  degisim: {
    gorus?: number;
    para?: number;
    beceri?: Partial<Record<Beceri, number>>;
    nam?: Partial<Record<Nam, number>>;
    ozellik?: Partial<Record<Ozellik, number>>;
  };
  takat: { kalan: number; tavan: number };
  ogrenme: VerilenOdul[];
}

/**
 * Eylemi uygular (karakteri ve ilişki haritasını yerinde değiştirir). Olay taslağı varsa döner; sıra numarasını
 * olay defteri verir. `zar` tohumludur (yerleşim + ay + oyuncu + eylem sayacı).
 */
export function eylemYap(
  kasaba: Kasaba,
  kar: Karakter,
  ili: IliskiHaritasi,
  girdi: EylemGirdisi,
  ay: number,
  zar: Zar,
): Sonuc<{ sonuc: EylemSonucu; olay?: OlayTaslagi }> {
  const t = EYLEMLER[girdi.tur];
  const ki = girdi.hedef ? kisiCoz(girdi.hedef) : undefined;
  const npc = ki?.tur === "npc" ? kasaba.dizin.get(ki.i) : undefined;
  const engel = eylemKapisi(kasaba, girdi.tur, kar, npc, ay);
  if (engel) return hata(engel);
  if (!takatHarca(kar, ay, t.takat)) return hata("takat_yok");
  kar.en++;

  const degisim: EylemSonucu["degisim"] = {};
  const beceriKat = (b: Beceri, m: number) => {
    const e = beceriEkle(kar, ay, b, m);
    if (e) degisim.beceri = { ...degisim.beceri, [b]: e };
  };
  const namKat = (n: Nam, m: number) => {
    const e = namEkle(kar, ay, n, m);
    if (e) degisim.nam = { ...degisim.nam, [n]: e };
  };
  const sonucYap = (ek: Omit<EylemSonucu, "tur" | "degisim" | "takat" | "ogrenme">, olay?: OlayTaslagi) => {
    const ogrenme = ogrenmeIlerle(kar, ay);
    const sonuc: EylemSonucu = {
      tur: girdi.tur,
      ...ek,
      degisim,
      takat: { kalan: kar.tk, tavan: TAKAT_TAVAN },
      ogrenme,
    };
    return basarili(olay ? { sonuc, olay } : { sonuc });
  };
  const ozel = (k: string, n: number, p: OlayTaslagi["p"] = {}): OlayTaslagi => ({
    t: "eylem", w: kar.o, h: "", g: kar.o, n, k, p,
  });

  if (girdi.tur === "puan") {
    const o = girdi.ozellik as Ozellik;
    const i = OZELLIKLER.indexOf(o);
    if ((kar.oz[i] ?? 0) >= OZELLIK_EN_COK) return hata("gecersiz_istek");
    kar.op--;
    kar.oz[i] = (kar.oz[i] ?? 0) + 1;
    degisim.ozellik = { [o]: 1 };
    return sonucYap({ basari: true, sonuc: { k: "sonuc.puan", p: { ozellik: o } } });
  }
  if (girdi.tur === "karar") {
    const secim = girdi.secim as keyof typeof KARARLAR;
    kar.kr = secim;
    const e = beceriVer(kar, KARARLAR[secim], 3);
    if (e) degisim.beceri = { [KARARLAR[secim]]: e };
    sayacArtir(kar, "karar");
    return sonucYap(
      { basari: true, sonuc: { k: "sonuc.karar", p: { secim } } },
      ozel("olay.karar", 3, { kisi: oyuncuRef(kar), secim }),
    );
  }

  const anahtar = npc ? String(npc.i) : OKUL;
  const iliski = iliskiAl(ili, anahtar);
  const tekrar = tekrarSayisi(iliski, girdi.tur, ay);
  const carpan = getiriCarpani(tekrar);
  (iliski.az[girdi.tur] ??= []).push(ay);
  const getiri = { tekrar, carpan: Math.round(carpan * 100) / 100 };

  if (girdi.tur === "mektep") {
    kar.mk = mektepMekani(kasaba.tur);
    kar.ma = ay;
    const [b, m] = t.beceri ?? ["ilim", 0];
    beceriKat(b, Math.round(m * carpan));
    if (t.nam) namKat(t.nam[0], Math.round(t.nam[1] * carpan));
    sayacArtir(kar, "mektep");
    return sonucYap(
      { basari: true, getiri, sonuc: { k: "sonuc.mektep.basari", p: {} } },
      ozel("olay.eylem.mektep", 1, { kisi: oyuncuRef(kar) }),
    );
  }

  if (!npc) return hata("kisi_yok");
  const sans = eylemSansi(kasaba, girdi.tur, npc, kar, ili, ay);
  const atilan = 1 + Math.floor(zar() * 100);
  const basari = atilan <= sans.toplam;
  kar.mk = npcMekani(kasaba, npc, ay) ?? "meydan";
  kar.ma = ay;
  const hedef = npcKimlik(npc.i);
  const p: Record<string, string | number> = {};
  let olay: OlayTaslagi | undefined;
  const herkese = (k: string, n: number): OlayTaslagi => ({
    t: "eylem", w: kar.o, h: hedef, g: "", n, k, p: { kisi: oyuncuRef(kar), hedef: npcRef(npc) },
  });

  if (basari) {
    if (iliski.ka !== ay) {
      iliski.ka = ay;
      iliski.kg = 0;
    }
    const kazanc = Math.min(Math.round(t.kazanc * carpan), Math.max(0, AYLIK_GORUS_TAVANI - iliski.kg));
    if (kazanc > 0) {
      const taban = Math.floor(kazanc / 3);
      iliski.t += taban;
      if (kazanc - taban > 0) iliski.an.push([girdi.tur, kazanc - taban, ay]);
      iliski.kg += kazanc;
      degisim.gorus = kazanc;
      p.gorus = kazanc;
    }
    if (t.beceri) beceriKat(t.beceri[0], Math.round(t.beceri[1] * carpan));
    if (t.nam) namKat(t.nam[0], Math.round(t.nam[1] * carpan));
    if (t.bedel) {
      kar.pa -= t.bedel;
      degisim.para = -t.bedel;
    }
    if (t.ucret) {
      const ucret = Math.round(t.ucret * carpan);
      kar.pa += ucret;
      degisim.para = ucret;
      p.para = ucret;
    }
    switch (girdi.tur) {
      case "sohbet":
        sayacArtir(kar, "sohbet");
        olay = herkese("olay.eylem.sohbet", 1);
        break;
      case "yardim":
        olay = herkese("olay.eylem.yardim", 2);
        break;
      case "hediye":
        sayacArtir(kar, "dostluk");
        olay = herkese("olay.eylem.hediye", 2);
        break;
      case "ayakIsi":
        sayacArtir(kar, "ayakIsi");
        olay = { ...herkese("olay.eylem.ayakIsi", 1), g: kar.o };
        break;
      case "cirak":
        sayacArtir(kar, "cirak");
        kar.us = npc.i;
        p.meslek = MESLEKLER[npc.m] ?? "";
        olay = { ...herkese("olay.ciraklik", 5), t: "ciraklik", p: { kisi: oyuncuRef(kar), usta: npcRef(npc), meslek: p.meslek } };
        break;
    }
  } else if (girdi.tur === "cirak") {
    sayacArtir(kar, "cirak");
    (iliski.az.cirakRed ??= []).push(ay);
    olay = { ...herkese("olay.eylem.cirakRed", 1), g: kar.o };
  }
  return sonucYap(
    { hedef, sans, zar: atilan, basari, getiri, sonuc: { k: `sonuc.${girdi.tur}.${basari ? "basari" : "basarisiz"}`, p } },
    olay,
  );
}
