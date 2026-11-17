// Adlı eşyanın doğuşu (tezgâh tasarımı §9, Dilim 4): efsanevi ya da tılsımlı çıkınca yerleşim kroniğine kalıcı satır,
// herkese açık olay ve yönetici sayacı. Akçe ya da beceri vermez; yalnız iz ve olaydır (tek sefer: her eşya bir kez
// doğar). Eşyanın şimdiki sahibi yazılmaz (başkasının envanteri gizli); yalnız ustası ve atölyesi.

import type { MalId } from "../icerik/mallar.ts";
import { KALITE_ADLARI, KALITE_TILSIMLI, type EsyaKaydi, type Kalite } from "./kalite.ts";
import { kronikEkle } from "./kronik.ts";
import { oyuncuRef } from "./ortak.ts";
import { ekonomiAl } from "./pazar-tahta.ts";
import type { Karakter, Kasaba, OlayTaslagi } from "./tipler.ts";

/** [PARAMETRE] Olay önemi: efsanevi ve tılsımlı. */
export const EFSANEVI_OLAY_ONEMI = 8;
export const TILSIMLI_OLAY_ONEMI = 10;

export function efsaneviKaydet(k: Kasaba, kar: Karakter, mal: MalId, q: Kalite, esya: EsyaKaydi, atolye: [isletme: string, ad: string]): OlayTaslagi {
  const tilsim = q >= KALITE_TILSIMLI;
  const ek = ekonomiAl(k);
  const s = ek.es ?? [0, 0];
  ek.es = [s[0] + (tilsim ? 0 : 1), s[1] + (tilsim ? 1 : 0)];
  const p = { kim: oyuncuRef(kar), mal, kalite: KALITE_ADLARI[q], lakap: esya.l, atolyeAd: atolye[1] };
  kronikEkle(k, { a: k.ay, t: "esya", k: tilsim ? "kronik.esya.tilsimli" : "kronik.esya.efsanevi", p });
  return { t: "esya", w: kar.o, h: "", g: "", n: tilsim ? TILSIMLI_OLAY_ONEMI : EFSANEVI_OLAY_ONEMI, k: tilsim ? "olay.esya.tilsimli" : "olay.esya.efsanevi", p: { ...p, atolye: atolye[0] } };
}

/** Yönetici görünümü: yerleşimde çıkan efsanevi ve tılsımlı sayısı. */
export function esyaSayaci(k: Kasaba): { efsanevi: number; tilsimli: number } {
  const s = k.ek?.es ?? [0, 0];
  return { efsanevi: s[0], tilsimli: s[1] };
}
