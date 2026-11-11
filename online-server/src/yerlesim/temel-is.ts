// Temel iş / usta iş (ana tasarım §5.4, denge denetimi 9 Kasım): temel iş herkese açıktır (demirci odun kesebilir)
// ve tecrübeyi işin mesleğine yazar (beceri ağacı v2: faaliyetle tecrübe). Usta iş temel çıktının YERİNE geçmez,
// ayrı bir iştir ve meslek düğümü ister (sert odun seç, cevher ayıkla, ince yün ayıkla, şifalı ot seç).
// "Basit onarım" herkese açıktır ve demircinin işidir: aşınmış aracın kullanım sayacını düşürür.
// Beceri ağacı v2: her meslekte tecrübe veren en az bir iş vardır; malı olmayan meslekte "yamaklık" (mal çıkmaz,
// akçe doğmaz, yalnız tecrübe; azalan getiri aynı). Usta işini düğüm seviyesi açar (`IS_KILIDI`); verim ve araç
// (alet: balta/kazma) etkileri çıktıyı artırır, araç aşınır.
// Aynı işte azalan getiri vardır (ana mesleğin kendi işinde pencere kısa); sıfır verimli iş takat harcatmaz.
// Fırsat maliyeti ve sonraki verim döküm olarak görünür: "bu takatle mesleğinde ne kazanırdın".

import { MALLAR, type MalId } from "../icerik/mallar.ts";
import type { MeslekId } from "../icerik/meslekler.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { IS_KONDISYON, halDegistir, halGorunumu, type HalGorunumu } from "./hal.ts";
import { karakterYasi, takatHarca, takatTazele } from "./karakter.ts";
import { IS_KILIDI } from "../icerik/agaclar/index.ts";
import { aracArtisi, basariSay, isAcik, verimArtisi } from "./beceri-etki.ts";
import { hizmetEkle, meslekKaydi } from "./meslek.ts";
import { envanterEkle, saticiDegeri } from "./npc-taban.ts";
import { ALET_KALITE_VERIM, enIyiKalite } from "./kalite.ts";
import { ALET_OMRU, aletOmru, aracAsindir } from "./tarif.ts";
import type { CalismaParametreleri, Dokum, Karakter } from "./tipler.ts";

interface TemelIs {
  /** Çıktı malı; onarımda ve yamaklıkta yok. */
  mal?: MalId;
  /** Bu işi kendi işi sayan meslek (tecrübe buna yazılır). */
  meslek: MeslekId;
  /** Usta iş (kilidi `IS_KILIDI`'nde). */
  usta?: true;
  /** Yamaklık: mal çıkmaz, yalnız tecrübe. */
  yamak?: true;
  /** Azalan getiriden önceki çıktı (yamaklıkta emek birimi). */
  cikti: number;
}

/** [PARAMETRE] Temel işin çıktı adedi (azalan getiriden önce), usta işinki, onarımın en çok düşürdüğü kullanım. */
export const TEMEL_CIKTI = 3;
export const USTA_IS_CIKTI = 2;
export const ONARIM_CIKTI = 2;

export const TEMEL_ISLER = {
  odun: { mal: "odun", meslek: "oduncu", cikti: TEMEL_CIKTI },
  tas: { mal: "tas", meslek: "oduncu", cikti: TEMEL_CIKTI },
  ot: { mal: "ot", meslek: "sifaci", cikti: TEMEL_CIKTI },
  yun: { mal: "yun", meslek: "ciftci", cikti: TEMEL_CIKTI },
  su: { mal: "su", meslek: "hanci", cikti: TEMEL_CIKTI },
  onarim: { meslek: "demirci", cikti: ONARIM_CIKTI },
  // Yamaklık: malı olmayan mesleklerin tecrübe işi (usta yanında ayak işi); demircide körük çekmek (onarım
  // aşınmış alet ister, ilk tecrübe aletsiz de kazanılabilsin)
  koruk: { meslek: "demirci", yamak: true, cikti: TEMEL_CIKTI },
  tezgah: { meslek: "marangoz", yamak: true, cikti: TEMEL_CIKTI },
  tarak: { meslek: "dokumaci", yamak: true, cikti: TEMEL_CIKTI },
  mutfak: { meslek: "asci", yamak: true, cikti: TEMEL_CIKTI },
  ezber: { meslek: "ozan", yamak: true, cikti: TEMEL_CIKTI },
  kalem: { meslek: "katip", yamak: true, cikti: TEMEL_CIKTI },
  hamal: { meslek: "tuccar", yamak: true, cikti: TEMEL_CIKTI },
  sahitlik: { meslek: "arabulucu", yamak: true, cikti: TEMEL_CIKTI },
  karakol: { meslek: "asker", yamak: true, cikti: TEMEL_CIKTI },
  evrak: { meslek: "divan", yamak: true, cikti: TEMEL_CIKTI },
  // Usta işleri (ayrı iş, ayrı azalan getiri)
  sertOdun: { mal: "sertOdun", meslek: "oduncu", usta: true, cikti: USTA_IS_CIKTI },
  cevher: { mal: "cevher", meslek: "oduncu", usta: true, cikti: USTA_IS_CIKTI },
  inceYun: { mal: "inceYun", meslek: "ciftci", usta: true, cikti: USTA_IS_CIKTI },
  sifaliOt: { mal: "sifaliOt", meslek: "sifaci", usta: true, cikti: USTA_IS_CIKTI },
} as const satisfies Record<string, TemelIs>;
export type IsId = keyof typeof TEMEL_ISLER;

/** [PARAMETRE] Takat bedeli, azalan getiri penceresi (ay; ana mesleğin kendi işinde kısa), iş yaşı. */
export const TEMEL_TAKAT = 1;
export const AZALAN_PENCERE_IS = 6;
export const AZALAN_PENCERE_KENDI = 2;
export const TEMEL_IS_YASI = 13;
/** [PARAMETRE] Mesleğinde takat başına tahmini akçe, kademeye göre (çırak, kalfa, usta, pir). */
export const MESLEK_TAKAT_DEGERI: readonly number[] = [2, 3, 5, 8];

function isBul(id: unknown): IsId | undefined {
  return typeof id === "string" && Object.hasOwn(TEMEL_ISLER, id) ? (id as IsId) : undefined;
}

/** Bu işin azalan getiri penceresi: ana mesleğin kendi işinde kısa. */
export function pencere(k: Karakter, id: IsId, p?: CalismaParametreleri): number {
  return k.ms?.a === TEMEL_ISLER[id].meslek ? AZALAN_PENCERE_KENDI : (p?.AZALAN_PENCERE_IS ?? AZALAN_PENCERE_IS);
}

/** Onarılacak araç: kullanım sayacı en yüksek olan (eşitlikte ada göre). */
function onarilacak(k: Karakter): { mal: MalId; kullanim: number } | undefined {
  const liste = (Object.entries(k.as ?? {}) as [MalId, number][]).filter(([mal, n]) => n > 0 && (k.ev?.[mal] ?? 0) > 0);
  liste.sort(([a, x], [b, y]) => y - x || (a < b ? -1 : 1));
  const ilk = liste[0];
  return ilk ? { mal: ilk[0], kullanim: ilk[1] } : undefined;
}

export interface Verim {
  /** Çıktı malı (onarımda onarılan araç; yamaklıkta ve yoksa null). */
  mal: MalId | null;
  adet: number;
  /** Bu işi bir kez daha yaparsan sonraki adet (önizleme). */
  sonraki: number;
  usta: boolean;
  yamak: boolean;
  acik: boolean;
  /** Araç etkisi (öğrenilmiş): araç malı, artış (aracı yapanın kalitesi dahil), envanterde var mı, kalitesi. */
  arac: { mal: string; arti: number; var: boolean; kalite: number } | null;
  /** Pencere içindeki tekrar ve pencere (ay). */
  tekrar: number;
  pencere: number;
}

function verim(k: Karakter, id: IsId, ay: number, p?: CalismaParametreleri): Verim {
  const is: TemelIs = TEMEL_ISLER[id];
  const acik = isAcik(k, id);
  const pencereAy = pencere(k, id, p);
  const n = (k.tz?.[id] ?? []).filter((x) => ay - x < pencereAy).length;
  const ae = aracArtisi(k, id);
  const kq = ae ? enIyiKalite(k, ae.mal) : 0;
  const arac = ae ? { mal: ae.mal, arti: ae.arti + (ALET_KALITE_VERIM[kq] ?? 0), var: (k.ev?.[ae.mal] ?? 0) > 0, kalite: kq } : null;
  const cikti = !is.usta && id !== "onarim" ? (p?.TEMEL_CIKTI ?? is.cikti) : is.cikti;
  const taban = cikti + verimArtisi(k, id).arti + (arac?.var ? arac.arti : 0);
  const ham = Math.floor(taban / (1 + n));
  const hamSonraki = Math.floor(taban / (2 + n));
  const ortak = { usta: is.usta === true, yamak: is.yamak === true, acik, arac, tekrar: n, pencere: pencereAy };
  if (id === "onarim") {
    const a = onarilacak(k);
    const adet = a ? Math.min(ham, a.kullanim) : 0;
    const sonraki = a ? Math.min(hamSonraki, a.kullanim - adet) : 0;
    return { mal: a?.mal ?? null, adet, sonraki: Math.max(0, sonraki), ...ortak };
  }
  return { mal: is.mal ?? null, adet: acik ? ham : 0, sonraki: acik ? hamSonraki : 0, ...ortak };
}

/** Bir birim çıktının değeri (onarımda bir kullanımın payı: taban ÷ ömür, yukarı). */
function birimDeger(k: Karakter, id: IsId, mal: MalId, oyuncuSayisi: (m: MeslekId) => number): number {
  if (id === "onarim") return Math.ceil(MALLAR[mal].taban / ALET_OMRU);
  return saticiDegeri(k, mal, oyuncuSayisi).toplam;
}

/** Bu işin değeri ile aynı takatin mesleğindeki tahmini değeri (ana meslek bu iş değilse). */
export function firsatMaliyeti(k: Karakter, id: IsId, oyuncuSayisi: (m: MeslekId) => number, ay: number, p?: CalismaParametreleri): Dokum {
  const v = verim(k, id, ay, p);
  const kalemler = [{ k: "bu_is", d: v.mal ? v.adet * birimDeger(k, id, v.mal, oyuncuSayisi) : 0 }];
  const kayit = meslekKaydi(k);
  if (kayit.a && kayit.a !== TEMEL_ISLER[id].meslek) {
    const kd = kayit.s[kayit.a]?.kd ?? 0;
    kalemler.push({ k: "meslekte", d: -MESLEK_TAKAT_DEGERI[kd]! * TEMEL_TAKAT });
  }
  return { toplam: kalemler.reduce((a, x) => a + x.d, 0), kalemler };
}

/** GET önizlemesi: her iş için şimdiki ve sonraki verim, açık mı, fırsat dökümü. */
export function temelIsOnizleme(k: Karakter, oyuncuSayisi: (m: MeslekId) => number, ay: number, p?: CalismaParametreleri) {
  return (Object.keys(TEMEL_ISLER) as IsId[]).map((id) => ({
    is: id,
    meslek: TEMEL_ISLER[id].meslek,
    dugum: IS_KILIDI[id]?.dugum ?? null,
    seviye: IS_KILIDI[id]?.seviye ?? null,
    ...verim(k, id, ay, p),
    takat: TEMEL_TAKAT,
    firsat: firsatMaliyeti(k, id, oyuncuSayisi, ay, p),
  }));
}

export type TemelIsSonucu = {
  is: IsId;
  mal: MalId | null;
  adet: number;
  /** Aynı işin sonraki verimi (önizleme). */
  sonraki: number;
  usta: boolean;
  yamak: boolean;
  /** Onarımda: aracın kalan kullanım sayacı ve etkin ömrü. */
  onarim?: { mal: MalId; kullanim: number; omur: number };
  /** Araçla yapıldıysa aşınma. */
  arac?: { mal: MalId; kullanim: number; omur: number; asindi: boolean; kalite: number };
  hizmet: number;
  firsat: Dokum;
  takat: number;
  hal: HalGorunumu;
};

export function temelIsYap(k: Karakter, idHam: unknown, oyuncuSayisi: (m: MeslekId) => number, ay: number, p?: CalismaParametreleri): Sonuc<TemelIsSonucu> {
  const id = isBul(idHam);
  if (!id) return hata("eylem_gecersiz");
  if (karakterYasi(k, ay) < TEMEL_IS_YASI) return hata("yas_kapisi");
  const v = verim(k, id, ay, p);
  if (!v.acik) return hata("dugum_kapali");
  if (id === "onarim" && !v.mal) return hata("arac_yok");
  if (v.adet <= 0 || (!v.mal && !v.yamak)) return hata("verim_yok");
  takatTazele(k, ay);
  const firsat = firsatMaliyeti(k, id, oyuncuSayisi, ay, p);
  if (!takatHarca(k, ay, TEMEL_TAKAT)) return hata("takat_yok");
  const tz = (k.tz ??= {});
  tz[id] = [...(tz[id] ?? []).filter((x) => ay - x < (p?.AZALAN_PENCERE_IS ?? AZALAN_PENCERE_IS)), ay];
  let onarim: TemelIsSonucu["onarim"];
  if (id === "onarim") {
    const as = (k.as ??= {});
    const kalan = (as[v.mal!] ?? 0) - v.adet;
    if (kalan > 0) as[v.mal!] = kalan;
    else delete as[v.mal!];
    onarim = { mal: v.mal!, kullanim: Math.max(0, kalan), omur: aletOmru(k, v.mal!) };
  } else if (v.mal) envanterEkle(k, v.mal, v.adet);
  const arac = v.arac?.var && id !== "onarim" ? aracAsindir(k, v.arac.mal as MalId) : undefined;
  basariSay(k, `is:${id}`, v.adet);
  const hizmet = hizmetEkle(k, TEMEL_ISLER[id].meslek, 1);
  halDegistir(k, ay, { kondisyon: -IS_KONDISYON * TEMEL_TAKAT }, "hal.neden.temelIs");
  const sonra = verim(k, id, ay, p);
  return basarili({
    is: id,
    mal: v.mal,
    adet: v.adet,
    sonraki: sonra.adet,
    usta: v.usta,
    yamak: v.yamak,
    ...(onarim ? { onarim } : {}),
    ...(arac ? { arac } : {}),
    hizmet,
    firsat,
    takat: k.tk,
    hal: halGorunumu(k, ay),
  });
}
