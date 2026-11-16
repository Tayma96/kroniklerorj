// İade bekleyen (tezgâh modeli; "kimse kaybetmez"): iflas ve devralmada eski sahibe dönen mal ve akçe, sahibi o an
// yazılamıyorsa (karakter yüklenemedi, öldü ve devri bekliyor) yerleşimin mülk defterinde (`mk.ia`) bekler.
//   1. Sahip yaşıyor ve buradaysa doğrudan envanterine/cüzdanına.
//   2. Ölmüş ve vârisi belliyse (hd.dv) vârisin bekleyenine; devir henüz yapılmadıysa ölünün kimliğiyle bekler ve
//      devir anında kimlik taşıyıcısıyla vârise geçer.
//   3. Sahip yerleşimde yoksa (göçle ayrıldı, kayıt yok): akçe hazineye (bölge vergi kutusu, yakılmaz), mal kasaba
//      stoğuna. Bu yalnız ay dönümünde, bütün sakinler yüklüyken karar verilir.
// Teslim sahibin ilk tezgâh/mülk adımında ve her ay dönümünde; tekrar güvenlidir (teslimde kayıt silinir).

import type { MalId } from "../icerik/mallar.ts";
import { kimlikTasiyiciEkle } from "../yerlesim/devir.ts";
import { olduMu } from "../yerlesim/hanedan.ts";
import { kaliteliEkle, type Envanterli, type KaliteParti } from "../yerlesim/kalite.ts";
import { stogaEkle, type KasabaStogu } from "../yerlesim/npc-taban.ts";
import type { Karakter, Kasaba } from "../yerlesim/tipler.ts";
import { tezgahBosalt } from "./depo.ts";

export type IadeKaydi = Envanterli & { pa?: number };

interface IadeDefteri {
  ia?: Record<string, IadeKaydi>;
  vergiGiden?: { anahtar: string; tutar: number; yerlesim: string }[];
}

function defter(k: Kasaba): IadeDefteri {
  return k.mk as unknown as IadeDefteri;
}

/** Yaşayan, burada olan alıcı ya da bekleme kimliği (ölünün vârisi zinciri, yüklüyse izlenir). */
function hedef(k: Kasaba, o: string): { kar?: Karakter; bekle: string } {
  let id = o;
  for (let i = 0; i < 8; i++) {
    const kar = k.kar.get(id);
    if (!kar) return { bekle: id };
    if (!olduMu(kar) && !kar.gc) return { kar, bekle: id };
    if (olduMu(kar) && kar.hd?.dv && kar.hd.dv !== id) {
      id = kar.hd.dv;
      continue;
    }
    return { bekle: id };
  }
  return { bekle: id };
}

function bekleyen(k: Kasaba, o: string): IadeKaydi {
  const d = defter(k);
  return ((d.ia ??= {})[o] ??= {});
}

/** Akçe iadesi: alıcıya ya da bekleyene. Döner: nereye yazıldı. */
export function akceIade(k: Kasaba, o: string, tutar: number): "cuzdan" | "bekliyor" {
  if (!(tutar > 0)) return "cuzdan";
  const h = hedef(k, o);
  if (h.kar) {
    h.kar.pa += tutar;
    return "cuzdan";
  }
  const b = bekleyen(k, h.bekle);
  b.pa = (b.pa ?? 0) + tutar;
  return "bekliyor";
}

/** Mal iadesi (bir envanter boşaltıcısıyla): alıcıya ya da bekleyene. */
export function malIade(k: Kasaba, o: string, bosalt: (hedef: Envanterli) => void): "envanter" | "bekliyor" {
  const h = hedef(k, o);
  if (h.kar) {
    bosalt(h.kar);
    return "envanter";
  }
  bosalt(bekleyen(k, h.bekle));
  return "bekliyor";
}

/** Bekleyeni alıcıya teslim eder (mal + akçe). */
export function iadeTeslim(k: Kasaba, kar: Karakter): { akce: number; mal: number } {
  const d = defter(k);
  const ia = d.ia?.[kar.o];
  if (!ia) return { akce: 0, mal: 0 };
  const akce = ia.pa ?? 0;
  kar.pa += akce;
  const mal = tezgahBosalt({ r: [], n: 0, kk: 0, ...(ia.ev ? { ev: ia.ev } : {}), ...(ia.kq ? { kq: ia.kq } : {}) }, kar);
  delete d.ia![kar.o];
  if (Object.keys(d.ia!).length === 0) delete d.ia;
  return { akce, mal };
}

/**
 * Ay dönümü (bütün sakinler yüklü): yaşayan sahibe teslim; vârisi belli ölünün bekleyeni vârise; yerleşimde
 * kaydı olmayanın akçesi hazineye (vergi kutusu; yakılmaz), malı kasaba stoğuna. Döner: hazineye giden akçe.
 */
export function iadeCoz(k: Kasaba, ay: number): number {
  const d = defter(k);
  if (!d?.ia) return 0;
  const sakinler = new Set(k.sakin.map((s) => s.o));
  let hazine = 0;
  for (const o of Object.keys(d.ia)) {
    if (!d.ia?.[o]) continue;
    const h = hedef(k, o);
    if (h.bekle !== o) {
      // Ölünün bekleyeni vârisin kimliğine (vâris buradaysa hemen teslim).
      const ia = d.ia![o]!;
      delete d.ia![o];
      birlestir(bekleyen(k, h.bekle), ia);
    }
    if (h.kar) {
      iadeTeslim(k, h.kar);
      continue;
    }
    if (h.bekle !== o) continue;
    if (sakinler.has(o) || k.kar.has(o)) continue;
    const ia = d.ia![o]!;
    delete d.ia![o];
    if (ia.pa && ia.pa > 0) {
      (d.vergiGiden ??= []).push({ anahtar: `y:${k.y}:iade:${o}:${ay}`, tutar: ia.pa, yerlesim: k.y });
      hazine += ia.pa;
    }
    for (const [mal, adet] of Object.entries(ia.ev ?? {})) if (adet > 0) stogaEkle((k.st ??= {}) as KasabaStogu, mal as MalId, adet);
  }
  if (d.ia && Object.keys(d.ia).length === 0) delete d.ia;
  return hazine;
}

function birlestir(hedefK: IadeKaydi, ia: IadeKaydi): void {
  if (ia.pa) hedefK.pa = (hedefK.pa ?? 0) + ia.pa;
  for (const [mal, adet] of Object.entries(ia.ev ?? {})) {
    const izli = ia.kq?.[mal] ?? [];
    const izsiz = adet - izli.reduce((t, p) => t + p[1], 0);
    const partiler: KaliteParti[] = [...izli, ...(izsiz > 0 ? [[0, izsiz] as KaliteParti] : [])];
    kaliteliEkle(hedefK, mal as MalId, partiler);
  }
}

/** Devir (ölüm): ölünün bekleyen iadesi vârisin kimliğine geçer. */
kimlikTasiyiciEkle((k, eski, yeni) => {
  const d = defter(k);
  const ia = d?.ia?.[eski];
  if (!ia || eski === yeni) return;
  delete d.ia![eski];
  birlestir(bekleyen(k, yeni), ia);
});
