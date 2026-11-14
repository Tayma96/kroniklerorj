// Ölümde mülk devri (GDD §18 "Sandık", OYNANIS_TASARIMI §8 "mal vârise geçer"): ölünün tapuları bölünmeden vârise
// geçer. Devir kimlik taşıyıcısıdır (yerlesim/devir.ts): planın "mulk" kalemindeki her işletmenin tapusu yeni kimliğe
// yazılır, tapu sürümü artar ve IsletmeDO'ya sahip değişimi çıkış kutusundan gider (işlem kimliği deterministik;
// tekrar uygulanırsa ikinci kayıt açılmaz). İşletme borcu, personeli ve sözleşmeleri işletmeyle birlikte kalır.
// Akçe hareketi yoktur; veraset vergisi yalnız terekedeki akçeden alınır.

import { kimlikTasiyiciEkle, type DevirPlani } from "../yerlesim/devir.ts";
import type { Kasaba } from "../yerlesim/tipler.ts";
import { cikisAc } from "./transfer.ts";

export function mirasMulkTasi(k: Kasaba, eski: string, yeni: string, plan: DevirPlani): void {
  const md = k.mk;
  const kalem = plan.kalemler.find((x) => x.tur === "mulk");
  const varis = k.kar.get(yeni);
  if (!md || !kalem || kalem.tur !== "mulk" || !varis || eski === yeni) return;
  for (const isletme of kalem.isletmeler) {
    const tapu = md.t[isletme];
    if (!tapu || tapu.s !== eski) continue;
    const ts = ++md.ts;
    // Kutu kapasitesi devirHesapla'da denetlendi; tapu yine de yeni kimliğe yazılır (kayıt kaybolmaz).
    cikisAc(md.cik, { i: `y:${k.y}:${yeni}:miras:${isletme}`, t: "sahip", h: isletme, a: 0, y: { isletme, ts, sahip: { h: varis.h, o: yeni, ad: varis.ad } } }, 0);
    md.t[isletme] = { s: yeni, h: varis.h, ts, a: tapu.a, f: tapu.f, ...(tapu.y ? { y: { ...tapu.y, ts } } : {}) };
  }
}

kimlikTasiyiciEkle(mirasMulkTasi);
