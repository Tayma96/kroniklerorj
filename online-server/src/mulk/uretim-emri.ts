// Üretim emri (tezgâh modeli Dilim 2, §6): tarif + kaç kez. Ay dönümünde havuzdaki emek ve depodaki girdi/alet
// yettiği kadar işlenir; yetmeyen kısım bekler, hiçbir şey yanmaz. Emirle üretim yalnız mal üretir: kimseye meslek
// XP'si, hizmet puanı ya da nam vermez; beceri verimi uygulanmaz (çıktı tarifin taban adedi, araçla aracın adedi).
// Emek: önce oyuncu havuzu (takat → emek 1:1), sonra o ayın NPC emeği (biriktirilmez). Kalite: emrin ustası
// (kalite.ts urunKalitesi) + atölye seviye bonusu − NPC emeği payı cezası; zar tohumlu (deterministik). Saf.

import { MALLAR, type MalId } from "../icerik/mallar.ts";
import { tarifBul, type Tarif } from "../icerik/tarifler.ts";
import { kaliteBecerisi, ALET_OMRU } from "../yerlesim/tarif.ts";
import { ALET_KALITE_OMUR, enIyiKalite, kaliteliCikar, kaliteliEkle, urunKalitesi, type Kalite } from "../yerlesim/kalite.ts";
import { tohumlu } from "../yerlesim/rastgele.ts";
import type { Karakter } from "../yerlesim/tipler.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { depoAdedi, type Tezgah, type UretimEmri } from "./depo.ts";
import { atolyeKalemleri, depodanDus, tezgahSayisi, ustaSec } from "./atolye.ts";
import { EMIR_KEZ_EN_COK } from "./tezgah-kurallar.ts";

/** Emir açar: tarif atölyenin zanaatından; sahip ya da bir oyuncu çalışan tarifi yapabilmeli; tezgâh sınırı. */
export function emirAc(t: Tezgah, seviye: number, tarifHam: unknown, kezHam: unknown, adaylar: readonly Karakter[], o: string, ay: number): Sonuc<{ emir: UretimEmri }> {
  if (!t.za) return hata("zanaat_yok");
  const tr = tarifBul(tarifHam);
  if (!tr) return hata("tarif_gecersiz");
  if (tr.meslek !== t.za) return hata("zanaat_disi");
  if (!Number.isInteger(kezHam) || (kezHam as number) < 1 || (kezHam as number) > EMIR_KEZ_EN_COK) return hata("kez_gecersiz");
  if ((t.ue?.length ?? 0) >= tezgahSayisi(t, seviye)) return hata("tezgah_dolu");
  if (!ustaSec(adaylar, tr)) return hata("usta_yok");
  const emir: UretimEmri = { n: (t.en = (t.en ?? 0) + 1), tr: tr.id, k: kezHam as number, y: 0, a: ay, o };
  (t.ue ??= []).push(emir);
  return basarili({ emir });
}

export function emirIptal(t: Tezgah, n: unknown): Sonuc<{ emir: UretimEmri }> {
  const i = (t.ue ?? []).findIndex((e) => e.n === n);
  if (i < 0) return hata("emir_yok");
  const [emir] = t.ue!.splice(i, 1);
  if (!t.ue!.length) delete t.ue;
  return basarili({ emir: emir! });
}

export type BeklemeNedeni = "emek_yok" | "girdi_yok" | "arac_yok" | "depo_dolu" | "usta_yok" | "tarif_yok";

export interface EmirDokumu {
  emir: number;
  tarif: string;
  kez: number;
  yapilan: number;
  buAy: number;
  cikti: { mal: MalId; adet: number };
  /** Bu ay çıkan adet kalite kademesine göre [sade, iyi, üstün, şaheser]. */
  kalite: [number, number, number, number];
  usta: { id: string; ad: string } | null;
  emek: { oyuncu: number; npc: number };
  neden: BeklemeNedeni | null;
}

export interface UretimSonucu {
  yapim: number;
  emirler: EmirDokumu[];
  emek: { oyuncuOnce: number; oyuncuSonra: number; npcVerilen: number; npcKullanilan: number };
  /** Levhaya aday: üstün ve üstü çıkan (usta, tarif, mal, kalite). */
  levha: { usta: Karakter; tarif: string; mal: MalId; q: Kalite }[];
}

/** Depodaki aletin etkin ömrü (temel ömür + aletin kalitesi; atölyede kişisel beceri ömrü yok). */
function depoAletOmru(t: Tezgah, mal: MalId): number {
  return (MALLAR[mal].omur ?? ALET_OMRU) + (ALET_KALITE_OMUR[enIyiKalite(t as unknown as Karakter, mal)] ?? 0);
}

/** Depodaki aleti bir kullanım aşındırır; ömür dolunca en iyi kalitedeki bir alet tükenir. */
export function depoAletAsindir(t: Tezgah, mal: MalId): void {
  const q = enIyiKalite(t as unknown as Karakter, mal);
  const omur = depoAletOmru(t, mal);
  const as = (t.as ??= {});
  const n = (as[mal] ?? 0) + 1;
  if (n >= omur) {
    if (!kaliteliCikar(t, mal, 1, q)) depodanDus(t, mal, 1);
    delete as[mal];
  } else as[mal] = n;
  if (!Object.keys(as).length) delete t.as;
}

/** Tek yapımın engeli (yoksa null): emek, girdi, araç, depo kapasitesi. */
function engel(t: Tezgah, tr: Tarif, emek: number, kapasite: number): BeklemeNedeni | null {
  if (emek < tr.takat) return "emek_yok";
  for (const [m, n] of Object.entries(tr.girdi)) if ((t.ev?.[m] ?? 0) < (n ?? 0)) return "girdi_yok";
  const aracVar = !!tr.arac && (t.ev?.[tr.arac.mal] ?? 0) > 0;
  if (tr.arac?.zorunlu && !aracVar) return "arac_yok";
  const giren = Object.values(tr.girdi).reduce((a, n) => a + (n ?? 0), 0);
  const cikan = (aracVar ? tr.arac!.adet : tr.cikti[1]) + Object.values(tr.yan ?? {}).reduce((a, n) => a + (n ?? 0), 0);
  if (depoAdedi(t) - giren + cikan > kapasite) return "depo_dolu";
  return null;
}

export interface UretimGirdisi {
  t: Tezgah;
  isletme: string;
  /** Gerçek seviye (kalite bonusu) ve depo kapasitesi (genişletilmiş seviyeden). */
  seviye: number;
  kapasite: number;
  /** Bu ayın NPC emeği (NPC_EMEK_AY × NPC çalışan); biriktirilmez. */
  npcEmek: number;
  /** Sahip ve oyuncu çalışanlar (yerleşimde, yaşayan). */
  adaylar: readonly Karakter[];
  ay: number;
}

/** Ay dönümünde emirleri sırayla işler (en eski önce). Tamamlanan emir listeden çıkar. */
export function emirleriIsle(g: UretimGirdisi): UretimSonucu {
  const { t, ay } = g;
  const oyuncuOnce = t.eh ?? 0;
  let eo = oyuncuOnce;
  let en = Math.max(0, g.npcEmek);
  const sonuc: UretimSonucu = { yapim: 0, emirler: [], emek: { oyuncuOnce, oyuncuSonra: 0, npcVerilen: en, npcKullanilan: 0 }, levha: [] };
  let emekBitti = false;
  for (const e of [...(t.ue ?? [])].sort((a, b) => a.n - b.n)) {
    const tr = tarifBul(e.tr);
    const d: EmirDokumu = { emir: e.n, tarif: e.tr, kez: e.k, yapilan: e.y, buAy: 0, cikti: { mal: (tr?.cikti[0] ?? "odun") as MalId, adet: 0 }, kalite: [0, 0, 0, 0], usta: null, emek: { oyuncu: 0, npc: 0 }, neden: null };
    sonuc.emirler.push(d);
    if (!tr || tr.meslek !== t.za) {
      d.neden = "tarif_yok";
      continue;
    }
    const usta = ustaSec(g.adaylar, tr);
    if (!usta) {
      d.neden = "usta_yok";
      continue;
    }
    d.usta = { id: usta.o, ad: usta.ad };
    if (emekBitti) {
      d.neden = "emek_yok";
      continue;
    }
    while (e.y < e.k) {
      const neden = engel(t, tr, eo + en, g.kapasite);
      if (neden) {
        d.neden = neden;
        if (neden === "emek_yok") emekBitti = true;
        break;
      }
      const o = Math.min(eo, tr.takat);
      const n = tr.takat - o;
      eo -= o;
      en -= n;
      d.emek.oyuncu += o;
      d.emek.npc += n;
      for (const [m, adet] of Object.entries(tr.girdi)) depodanDus(t, m as MalId, adet ?? 0);
      const aracVar = !!tr.arac && (t.ev?.[tr.arac.mal] ?? 0) > 0;
      const aracKalite = aracVar ? enIyiKalite(t as unknown as Karakter, tr.arac!.mal) : null;
      const adet = aracVar ? tr.arac!.adet : tr.cikti[1];
      const zar = tohumlu("atolye", g.isletme, tr.id, ay, e.n, e.y);
      const q = urunKalitesi(usta, tr, kaliteBecerisi(usta, tr), aracKalite, zar, atolyeKalemleri(g.seviye, n / tr.takat)).kademe;
      if (aracVar) depoAletAsindir(t, tr.arac!.mal);
      kaliteliEkle(t, tr.cikti[0], [[q, adet, usta.o, g.isletme]]);
      for (const [m, y] of Object.entries(tr.yan ?? {})) if ((y ?? 0) > 0) kaliteliEkle(t, m as MalId, [[0, y!, usta.o, g.isletme]]);
      e.y++;
      d.buAy++;
      d.yapilan = e.y;
      d.cikti.adet += adet;
      d.kalite[q] += adet;
      sonuc.yapim++;
      if (q >= 2) sonuc.levha.push({ usta, tarif: tr.id, mal: tr.cikti[0], q });
    }
  }
  t.eh = eo;
  if (!t.eh) delete t.eh;
  if (t.ue) {
    t.ue = t.ue.filter((e) => e.y < e.k);
    if (!t.ue.length) delete t.ue;
  }
  sonuc.emek.oyuncuSonra = eo;
  sonuc.emek.npcKullanilan = g.npcEmek - en;
  return sonuc;
}
