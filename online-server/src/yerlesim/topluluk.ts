// Topluluk ay dönümü ve devir taşıyıcısı (Ek A §3, E6–E7). Sıra sabittir: hami (aşama namı) → ortak dertler (açılış,
// halk katkısı, kapanış) → şenlik (ilan, açılış, kapanış) → zaviye (davet, ahi başı seçimi) → göstergelerin dengeye
// dönüşü. Bütün sakinlerin karakteri yüklü olmalıdır (motor yetiştirmede yükler).

import { hakAcik } from "./beceri-etki.ts";
import { kimlikTasiyiciEkle } from "./devir.ts";
import { hanedanKasabasi, olduMu } from "./hanedan.ts";
import { hamiDonumu } from "./hami.ts";
import { zaviyeDonumu } from "./lonca-grup.ts";
import { ortakDertDonumu } from "./ortak-dert.ts";
import { senlikDonumu } from "./senlik.ts";
import { gostergeDonumu, toplulukAl } from "./topluluk-kayit.ts";
import type { Kasaba, OlayTaslagi } from "./tipler.ts";

/** [PARAMETRE] Hazine defterinde tutulan ay sayısı. */
export const HAZINE_DEFTERI_AY = 12;

/**
 * Kanca partisi 2 `hazineDefteri` (kâtip "hazine defterini tutma", divan "hazine defteri"): kasabada yaşayan bir defter
 * tutucu varken her ay başı hazinenin bakiyesi deftere yazılır; defter herkese görünür (GET /v1/topluluk). Tutucu
 * yokken yazılmaz (eski satırlar kalır). Akçeye dokunmaz.
 */
export function hazineDefteriDonumu(k: Kasaba, ay: number): void {
  const tutan = [...k.kar.values()].filter((c) => !olduMu(c) && hakAcik(c, "hazineDefteri")).sort((a, b) => (a.o < b.o ? -1 : a.o > b.o ? 1 : 0))[0];
  if (!tutan) return;
  const l = (toplulukAl(k).hk ??= []);
  if (l.at(-1)?.[0] === ay) return;
  l.push([ay, hanedanKasabasi(k).hz, tutan.ad]);
  if (l.length > HAZINE_DEFTERI_AY) l.splice(0, l.length - HAZINE_DEFTERI_AY);
}

/** Hazine defteri görünümü (yoksa null): ay, bakiye, önceki satıra göre fark, tutanın adı. */
export function hazineDefteriGorunumu(k: Pick<Kasaba, "tl">) {
  const l = k.tl?.hk;
  if (!l?.length) return null;
  return { satirlar: l.map(([ay, bakiye, ad], i) => ({ ay, bakiye, fark: i > 0 ? bakiye - l[i - 1]![1] : null, tutanAd: ad })) };
}

export function toplulukDonumu(k: Kasaba, ay: number): OlayTaslagi[] {
  const tl = toplulukAl(k);
  gostergeDonumu(tl, ay);
  hazineDefteriDonumu(k, ay);
  return [...hamiDonumu(k, ay), ...ortakDertDonumu(k, ay), ...senlikDonumu(k, ay), ...zaviyeDonumu(k, ay)];
}

/** Devir: zaviye üyeliği (kıdem korunur, ahi başılığı düşer) ve defter adları vârise geçer; hami bağları kapanır. */
export function toplulukKimligiTasi(k: Kasaba, eski: string, yeni: string): void {
  const tl = k.tl;
  if (!tl || eski === yeni) return;
  const ad = k.sakin.find((s) => s.o === yeni)?.ad;
  for (const b of tl.hb) {
    if ((b.h === eski || b.c === eski) && (b.d === "acik" || b.d === "surer")) {
      b.d = b.d === "acik" ? "dustu" : "bitti";
      b.sn = "oldu";
    }
  }
  for (const z of tl.zv) {
    for (const u of z.u) if (u.o === eski) u.o = yeni;
    // B10: yerel kimlikli aylık sayaçlar (yatırma, kasadan alma) vârise geçer: ölüp dirilerek tavan tazelenmez.
    if (z.ya?.[eski]) {
      const [a, t] = z.ya[eski]!;
      const v = z.ya[yeni];
      z.ya[yeni] = v && v[0] === a ? [a, v[1] + t] : [a, t];
      delete z.ya[eski];
    }
    if (z.vs?.[1][eski] !== undefined) {
      z.vs[1][yeni] = (z.vs[1][yeni] ?? 0) + z.vs[1][eski]!;
      delete z.vs[1][eski];
    }
    if (z.ab === eski) delete z.ab;
    if (z.ku === eski) z.ku = yeni;
    delete z.oy[eski];
    for (const [o, a] of Object.entries(z.oy)) if (a === eski) delete z.oy[o];
    z.dv = z.dv.filter(([o]) => o !== eski);
  }
  for (const d of tl.od) {
    if (d.d !== "acik") continue;
    for (const x of d.k) {
      if (x.o !== eski) continue;
      x.o = yeni;
      if (ad) x.ad = ad;
    }
  }
}

kimlikTasiyiciEkle(toplulukKimligiTasi);
