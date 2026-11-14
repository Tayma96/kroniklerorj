// Darbe ganimeti kuyruğu: bölgenin kalıcı işini adım adım yürütür (BolgeDO dış çağrıyı yapar, sonucu buraya yazar).
// Değişmez: kesilen toplam = kazananlara ödenen + vali kasasına yazılan (yoktan akçe doğmaz, akçe yakılmaz).
// Her yerleşim çağrısı `istekNo` ile kalıcı tekrar güvenlidir; yanıt kaybolursa aynı adım aynı sonucu alır.

import { akceGir } from "./bolge.ts";
import { ganimetIstekNo, ganimetPaylari } from "./ganimet.ts";
import { kayitEkle } from "./makam.ts";
import type { BolgeDurumu, GanimetHedefi, GanimetIsi } from "./tipler.ts";

export interface GanimetAdimi {
  tur: "kes" | "pay";
  is: GanimetIsi;
  hedef: GanimetHedefi;
  /** `kisi` "yerleşim/karakter" biçimindedir; ilk parça hedef YerlesimDO'dur. */
  yerlesim: string;
  istekNo: string;
}

function adim(tur: "kes" | "pay", is: GanimetIsi, hedef: GanimetHedefi): GanimetAdimi {
  return { tur, is, hedef, yerlesim: hedef.kisi.split("/")[0] ?? "", istekNo: ganimetIstekNo(is.darbeId, tur === "kes" ? "kayip" : "pay", hedef.kisi) };
}

/**
 * Sıradaki dış çağrıyı verir. Çağrı gerektirmeyen ilerlemeyi (pay hesabı, sıfır pay, iş kapanışı) kendisi yapar;
 * `degisti` durumun yazılması gerektiğini söyler.
 */
export function ganimetSiradaki(d: BolgeDurumu): { adim: GanimetAdimi | null; degisti: boolean } {
  let degisti = false;
  for (;;) {
    const is = d.ganimetGiden?.[0];
    if (!is) {
      if (d.ganimetGiden) {
        delete d.ganimetGiden;
        degisti = true;
      }
      return { adim: null, degisti };
    }
    if (is.asama === "kes") {
      const bekleyen = is.kaybedenler.find((x) => !x.bitti);
      if (bekleyen) return { adim: adim("kes", is, bekleyen), degisti };
      const toplam = is.kaybedenler.reduce((t, x) => t + (x.tutar ?? 0), 0);
      const paylar = ganimetPaylari(toplam, is.kazananlar.length);
      is.kazananlar.forEach((z, i) => {
        z.tutar = paylar[i] ?? 0;
        if (z.tutar === 0) z.bitti = true;
      });
      is.asama = "dagit";
      degisti = true;
    }
    const bekleyen = is.kazananlar.find((x) => !x.bitti);
    if (bekleyen) return { adim: adim("pay", is, bekleyen), degisti };
    const toplam = is.kaybedenler.reduce((t, x) => t + (x.tutar ?? 0), 0);
    if (toplam > 0) {
      kayitEkle(d, d.ay, "darbeGanimet", "kurum", {
        k: "kayit.darbeGanimet",
        p: { tutar: toplam, kaybeden: is.kaybedenler.filter((x) => (x.tutar ?? 0) > 0).length, kazanan: is.kazananlar.filter((x) => (x.tutar ?? 0) > 0 && !x.ulasilamadi).length },
      });
    }
    d.ganimetGiden!.shift();
    degisti = true;
  }
}

/** Yerleşim yanıtı: kaybedenden `tutar` kesildi (0 olabilir: pencere, ölü, akçesi yok). */
export function ganimetKesildi(a: GanimetAdimi, tutar: number): void {
  a.hedef.tutar = Math.max(0, Math.floor(Number.isFinite(tutar) ? tutar : 0));
  a.hedef.bitti = true;
}

/** Yerleşim yanıtı: kazananın payı yazıldı. */
export function ganimetOdendi(a: GanimetAdimi): void {
  a.hedef.bitti = true;
}

/**
 * Kalıcı ret (sakin yok, ölü, yerleşim geçersiz): kuyruk takılmaz. Kaybedenden kesilmez; kazananın payı yakılmaz,
 * vali kasasına kayıtla girer.
 */
export function ganimetUlasilamadi(d: BolgeDurumu, a: GanimetAdimi): void {
  if (a.tur === "kes") a.hedef.tutar = 0;
  else akceGir(d, a.hedef.tutar ?? 0, "darbeGanimetKasa", d.ay, a.hedef.kisi);
  a.hedef.bitti = true;
  a.hedef.ulasilamadi = true;
}

/** Denetim: bitmiş işte kesilen = ödenen + kasaya yazılan; süren işte ödenen + bekleyen pay kesileni aşamaz. */
export function ganimetIsiTutarli(is: GanimetIsi): boolean {
  const kesilen = is.kaybedenler.reduce((t, x) => t + (x.tutar ?? 0), 0);
  if (is.asama === "kes") return is.kazananlar.every((x) => x.tutar === undefined && !x.bitti);
  return is.kaybedenler.every((x) => x.bitti) && is.kazananlar.reduce((t, x) => t + (x.tutar ?? 0), 0) === kesilen;
}
