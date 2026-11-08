// Temel iş / usta iş (ana tasarım §5.4): temel iş herkese açıktır (demirci odun kesebilir); usta iş meslek
// düğümüne bağlıdır ve sayı değil malın kendisini değiştirir (sert odun, cevher, şifalı ot, ince yün).
// Aynı işte azalan getiri vardır; sıfır verimli iş takat harcatmaz (ölü karar yok).
// Fırsat maliyeti döküm olarak görünür: "bu takatle mesleğinde ne kazanırdın".

import { MALLAR, type MalId } from "../icerik/mallar.ts";
import type { MeslekId } from "../icerik/meslekler.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { karakterYasi, takatHarca, takatTazele } from "./karakter.ts";
import { dugumAcikMi, hizmetEkle, meslekKaydi } from "./meslek.ts";
import { envanterEkle, satisDegeri } from "./npc-taban.ts";
import type { Dokum, Karakter } from "./tipler.ts";

interface TemelIs {
  mal: MalId;
  /** Bu işi kendi işi sayan meslek (hizmet kazanır). */
  meslek: MeslekId;
  usta?: { dugum: string; mal: MalId };
}

export const TEMEL_ISLER = {
  odun: { mal: "odun", meslek: "oduncu", usta: { dugum: "oduncu.orman.0", mal: "sertOdun" } },
  tas: { mal: "tas", meslek: "oduncu", usta: { dugum: "oduncu.maden.0", mal: "cevher" } },
  ot: { mal: "ot", meslek: "sifaci", usta: { dugum: "sifaci.otlar.0", mal: "sifaliOt" } },
  yun: { mal: "yun", meslek: "ciftci", usta: { dugum: "ciftci.suru.0", mal: "inceYun" } },
  su: { mal: "su", meslek: "hanci" },
} as const satisfies Record<string, TemelIs>;
export type IsId = keyof typeof TEMEL_ISLER;

/** [PARAMETRE] Çıktı adedi (usta işte de aynı), takat bedeli, azalan getiri penceresi (ay), iş yaşı. */
export const TEMEL_CIKTI = 3;
export const TEMEL_TAKAT = 1;
export const AZALAN_PENCERE_IS = 6;
export const TEMEL_IS_YASI = 13;
/** [PARAMETRE] Mesleğinde takat başına tahmini akçe, kademeye göre (çırak, kalfa, usta, pir). */
export const MESLEK_TAKAT_DEGERI: readonly number[] = [2, 3, 5, 8];

function isBul(id: unknown): IsId | undefined {
  return typeof id === "string" && Object.hasOwn(TEMEL_ISLER, id) ? (id as IsId) : undefined;
}

function verim(k: Karakter, id: IsId, ay: number): { mal: MalId; adet: number; usta: boolean } {
  const is: TemelIs = TEMEL_ISLER[id];
  const usta = is.usta !== undefined && dugumAcikMi(k, is.usta.dugum);
  const n = (k.tz?.[id] ?? []).filter((x) => ay - x < AZALAN_PENCERE_IS).length;
  return { mal: usta ? is.usta!.mal : is.mal, adet: Math.floor(TEMEL_CIKTI / (1 + n)), usta };
}

/** Bu işin değeri ile aynı takatin mesleğindeki tahmini değeri (ana meslek bu iş değilse). */
export function firsatMaliyeti(k: Karakter, id: IsId, oyuncuSayisi: (m: MeslekId) => number, ay: number): Dokum {
  const v = verim(k, id, ay);
  const kalemler = [{ k: "bu_is", d: v.adet * satisDegeri(v.mal, oyuncuSayisi(MALLAR[v.mal].meslek)).toplam }];
  const kayit = meslekKaydi(k);
  if (kayit.a && kayit.a !== TEMEL_ISLER[id].meslek) {
    const kd = kayit.s[kayit.a]?.kd ?? 0;
    kalemler.push({ k: "meslekte", d: -MESLEK_TAKAT_DEGERI[kd]! * TEMEL_TAKAT });
  }
  return { toplam: kalemler.reduce((a, x) => a + x.d, 0), kalemler };
}

export function temelIsYap(
  k: Karakter,
  idHam: unknown,
  oyuncuSayisi: (m: MeslekId) => number,
  ay: number,
): Sonuc<{ is: IsId; mal: MalId; adet: number; usta: boolean; hizmet: number; firsat: Dokum; takat: number }> {
  const id = isBul(idHam);
  if (!id) return hata("eylem_gecersiz");
  if (karakterYasi(k, ay) < TEMEL_IS_YASI) return hata("yas_kapisi");
  const v = verim(k, id, ay);
  if (v.adet <= 0) return hata("verim_yok");
  takatTazele(k, ay);
  const firsat = firsatMaliyeti(k, id, oyuncuSayisi, ay);
  if (!takatHarca(k, ay, TEMEL_TAKAT)) return hata("takat_yok");
  const tz = (k.tz ??= {});
  tz[id] = [...(tz[id] ?? []).filter((x) => ay - x < AZALAN_PENCERE_IS), ay];
  envanterEkle(k, v.mal, v.adet);
  const hizmet = hizmetEkle(k, TEMEL_ISLER[id].meslek, 1);
  return basarili({ is: id, ...v, hizmet, firsat, takat: k.tk });
}
