// Atölye saf kuralları (tezgâh modeli Dilim 2, tasarım §6): zanaat, genişletme kademesi (kapasite malzemeyle açılır),
// tezgâh sayısı, emek havuzu tavanı, emrin ustası. Sayılar tezgah-kurallar.ts'te [PARAMETRE]; her etki dökümle döner.

import { MALLAR, type MalId } from "../icerik/mallar.ts";
import type { MeslekId } from "../icerik/meslekler.ts";
import type { Tarif } from "../icerik/tarifler.ts";
import { tarifAcik } from "../yerlesim/beceri-etki.ts";
import { envanterEkle } from "../yerlesim/npc-taban.ts";
import type { Karakter } from "../yerlesim/tipler.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import type { Tezgah } from "./depo.ts";
import {
  ATOLYE_KALITE_SEVIYE_PUANI,
  EMEK_HAVUZU_TEZGAH_BASI,
  GENISLETME_MALZEME,
  NPC_EMEK_KALITE_CEZA,
  TEZGAH_SAYISI,
  ZANAAT_DEGISIM_BEDELI,
  ZANAAT_MESLEKLERI,
  ZANAAT_UCRETSIZ_DEGISIM,
} from "./tezgah-kurallar.ts";

function sinirla(tablo: readonly number[], s: number): number {
  return tablo[Math.max(0, Math.min(tablo.length - 1, s))]!;
}

/** Kapasitenin hesaplandığı seviye: seviye ile genişletme kademesinin küçüğü (eski kayıtta kademe = seviye). */
export function etkinSeviye(t: Tezgah, seviye: number): number {
  return Math.max(0, Math.min(seviye, t.gk ?? seviye));
}

export function tezgahSayisi(t: Tezgah, seviye: number): number {
  return sinirla(TEZGAH_SAYISI, etkinSeviye(t, seviye));
}

export function emekTavani(t: Tezgah, seviye: number): number {
  return tezgahSayisi(t, seviye) * EMEK_HAVUZU_TEZGAH_BASI;
}

export function zanaatMi(m: unknown): m is MeslekId {
  return typeof m === "string" && (ZANAAT_MESLEKLERI as readonly string[]).includes(m);
}

/** Kuruluşta önerilen zanaat: sahibin ana, yoksa yan mesleği (tarifi varsa). */
export function zanaatOner(kar: Karakter | undefined): MeslekId | undefined {
  const a = kar?.ms?.a;
  const y = kar?.ms?.y;
  if (zanaatMi(a)) return a;
  if (zanaatMi(y)) return y;
  return undefined;
}

/**
 * Zanaat seçimi/değişimi: seçilmemişse ücretsiz atanır (değişiklik sayılmaz); değişiklikte ilk ZANAAT_UCRETSIZ_DEGISIM
 * ücretsiz, sonrası ZANAAT_DEGISIM_BEDELI (sahibin cüzdanından, beyliğe). Açık üretim emri varken değişmez.
 */
export function zanaatSec(t: Tezgah, meslek: unknown, para: number): Sonuc<{ meslek: MeslekId; bedel: number; degisim: number }> {
  if (!zanaatMi(meslek)) return hata("meslek_gecersiz");
  if (t.za === meslek) return basarili({ meslek, bedel: 0, degisim: t.zs ?? 0 });
  if (!t.za) return basarili({ meslek, bedel: 0, degisim: t.zs ?? 0 });
  if (t.ue?.length) return hata("emir_acik");
  const bedel = (t.zs ?? 0) >= ZANAAT_UCRETSIZ_DEGISIM ? ZANAAT_DEGISIM_BEDELI : 0;
  if (para < bedel) return hata("para_yok");
  return basarili({ meslek, bedel, degisim: (t.zs ?? 0) + 1 });
}

/** Emrin ustası: tarifi yapabilen, tarifin mesleğinde en yüksek kademeli aday (eşitlikte kimlik sırası; deterministik). */
export function ustaSec(adaylar: readonly Karakter[], t: Tarif): Karakter | undefined {
  let enIyi: Karakter | undefined;
  let kd = -1;
  for (const a of [...adaylar].sort((x, y) => (x.o < y.o ? -1 : 1))) {
    if (!tarifAcik(a, t.id)) continue;
    const d = a.ms?.s[t.meslek]?.kd ?? 0;
    if (d > kd) {
      kd = d;
      enIyi = a;
    }
  }
  return enIyi;
}

/** Atölye kalite kalemleri: seviye bonusu ve NPC emeği payı cezası (dökümde görünür). */
export function atolyeKalemleri(seviye: number, npcPay = 0): { k: string; d: number }[] {
  const l = [{ k: "kalite.atolye", d: ATOLYE_KALITE_SEVIYE_PUANI * Math.max(0, seviye) }];
  if (npcPay > 0) l.push({ k: "kalite.npcEmegi", d: -Math.round(NPC_EMEK_KALITE_CEZA * Math.min(1, npcPay)) });
  return l;
}

/** Depodan `n` adet düşer (önce izsiz sade, sonra en düşük kalite). Yetmezse false, hiçbir şey değişmez. */
export function depodanDus(t: Tezgah, mal: MalId, n: number): boolean {
  if ((t.ev?.[mal] ?? 0) < n) return false;
  if (n > 0) envanterEkle(t as unknown as Karakter, mal, -n);
  return true;
}

/** Bir sonraki genişletmenin malzemesi (yoksa null: kapasite seviyeye yetişmiş ya da en üst seviye). */
export function genisletmeMalzemesi(tur: "dukkan" | "atolye", t: Tezgah, seviye: number): { hedef: number; malzeme: Partial<Record<MalId, number>> } | null {
  const gk = t.gk ?? seviye;
  if (gk >= seviye) return null;
  const m = GENISLETME_MALZEME[tur][gk];
  return m ? { hedef: gk + 1, malzeme: { ...m } } : null;
}

/** Genişletme: malzemenin hepsi depoda olmalı; tek seferde düşer, kademe bir artar. */
export function genislet(tur: "dukkan" | "atolye", t: Tezgah, seviye: number): Sonuc<{ hedef: number; malzeme: Partial<Record<MalId, number>> }> {
  const g = genisletmeMalzemesi(tur, t, seviye);
  if (!g) return hata("genisletme_yok");
  const eksik = Object.entries(g.malzeme).some(([m, n]) => (t.ev?.[m] ?? 0) < (n ?? 0));
  if (eksik) return hata("malzeme_yok");
  for (const [m, n] of Object.entries(g.malzeme)) depodanDus(t, m as MalId, n ?? 0);
  t.gk = g.hedef;
  return basarili(g);
}

/** Genişletme görünümü: eksik malzeme dökümüyle. */
export function genisletmeGorunumu(tur: "dukkan" | "atolye", t: Tezgah, seviye: number) {
  const g = genisletmeMalzemesi(tur, t, seviye);
  return {
    kademe: t.gk ?? seviye,
    seviye,
    sonraki: g
      ? { hedef: g.hedef, malzeme: Object.entries(g.malzeme).map(([mal, adet]) => ({ mal, adet, depoda: t.ev?.[mal] ?? 0, taban: MALLAR[mal as MalId].taban })) }
      : null,
  };
}
