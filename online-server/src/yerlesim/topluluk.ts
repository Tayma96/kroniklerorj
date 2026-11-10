// Topluluk ay dönümü ve devir taşıyıcısı (Ek A §3, E6–E7). Sıra sabittir: hami (aşama namı) → ortak dertler (açılış,
// halk katkısı, kapanış) → şenlik (ilan, açılış, kapanış) → zaviye (davet, ahi başı seçimi) → göstergelerin dengeye
// dönüşü. Bütün sakinlerin karakteri yüklü olmalıdır (motor yetiştirmede yükler).

import { kimlikTasiyiciEkle } from "./devir.ts";
import { hamiDonumu } from "./hami.ts";
import { zaviyeDonumu } from "./lonca-grup.ts";
import { ortakDertDonumu } from "./ortak-dert.ts";
import { senlikDonumu } from "./senlik.ts";
import { gostergeDonumu, toplulukAl } from "./topluluk-kayit.ts";
import type { Kasaba, OlayTaslagi } from "./tipler.ts";

export function toplulukDonumu(k: Kasaba, ay: number): OlayTaslagi[] {
  const tl = toplulukAl(k);
  gostergeDonumu(tl);
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
