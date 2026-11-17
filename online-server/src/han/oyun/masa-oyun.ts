// Masa oyunlarının masa çekirdeğine bağlanması: soket komutları, kişiye özel yayın, oturuş değişince denetim.
// Her alıcıya `oyunGorunumu(oyun, alıcı)` ayrı kurulur: gizli bilgi (zar) yalnız sahibinin soketine gider; seyirci ve
// diğer oyuncular yalnız açık görünümü alır.

import { hata, type Basarisiz } from "../../tipler.ts";
import type { Kayit, MasaBaglami, MasaSoketi } from "../masa.ts";
import type { SoketEki } from "../tipler.ts";
import {
  adimZari,
  oyunAc,
  oyunBaslat,
  oyunDagit,
  oyunDenetle,
  oyundanCekil,
  oyunGorunumu,
  oyunHamle,
  oyunKatil,
  oyunPas,
  oyunMesgul,
  oyunSuruyor,
  taahhutHesapla,
  type MasaOyunu,
} from "./cati.ts";

/** Sunucu tohumu: 16 rastgele bayt (onaltılık). DO'da crypto; testte `tohumUret` verilir. */
export function varsayilanTohum(): string {
  return [...crypto.getRandomValues(new Uint8Array(16))].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** Bağlı herkese kendi görünümünü gönderir (oyun yoksa null). */
export function oyunYayinla(b: Pick<MasaBaglami, "oyun" | "simdi">, tum: readonly Kayit[]): void {
  for (const r of tum) r.soket.gonder({ t: "oyun", oyun: b.oyun ? oyunGorunumu(b.oyun, r.ek.h, b.simdi) : null });
}

function yaz(b: MasaBaglami, tum: readonly Kayit[], o: MasaOyunu | undefined): void {
  b.oyun = o;
  b.oyunYaz?.(o);
  oyunYayinla(b, tum);
}

/**
 * Sahne/atışma açılmadan önce: terk edilmiş oyun ya da bayat bekleme masayı kilitlemez, masadan kalkar (kimse bir şey
 * kaybetmez; akçe/ödül yoktur). Masa hâlâ meşgulse true.
 */
export function bayatOyunuKaldir(b: MasaBaglami, tum: readonly Kayit[]): boolean {
  if (!oyunSuruyor(b.oyun)) return false;
  if (oyunMesgul(b.oyun, b.simdi)) return true;
  yaz(b, tum, undefined);
  return false;
}

/** Oturuş/bağlantı değişince: bekleme listesi ve "yok" işaretleri güncellenir. */
export function oyunDenetleYayinla(b: MasaBaglami, tum: readonly Kayit[]): void {
  if (!b.oyun) return;
  const bagli = new Set(tum.map((r) => r.ek.h));
  const oturan = new Set(tum.filter((r) => r.ek.k !== null).map((r) => r.ek.h));
  const r = oyunDenetle(b.oyun, bagli, oturan, b.simdi);
  if (r.degisti) yaz(b, tum, r.oyun);
}

export const OYUN_KOMUTLARI = new Set(["oyunAc", "oyunKatil", "oyunAyril", "oyunBaslat", "hamle", "oyunPas", "oyunDagit", "oyunKapat"]);

/** Masa oyunu komutu. Hata dönerse çekirdek `hata` iletisi gönderir. */
export async function oyunKomutu(
  b: MasaBaglami,
  kaynak: MasaSoketi,
  ek: SoketEki,
  ileti: Record<string, unknown>,
  tum: readonly Kayit[],
): Promise<Basarisiz | undefined> {
  const o = b.oyun;
  switch (ileti.t) {
    case "oyunAc": {
      if (ek.k === null) return hata("oturmuyor");
      if (b.etkinlik) return hata("masa_mesgul");
      const r = oyunAc(o, ileti.oyun, ek.h, ek.a, b.simdi);
      if (!r.ok) return r;
      yaz(b, tum, r.deger);
      return undefined;
    }
    case "oyunKatil": {
      if (ek.k === null) return hata("oturmuyor");
      const r = oyunKatil(o, ek.h, ek.a);
      if (!r.ok) return r;
      if (r.deger.degisti) yaz(b, tum, r.deger.oyun);
      else kaynak.gonder({ t: "oyun", oyun: oyunGorunumu(r.deger.oyun, ek.h, b.simdi) });
      return undefined;
    }
    case "oyunAyril": {
      if (!o?.tohum && o?.asama !== "bekleme") return hata("oyun_yok");
      const r = oyundanCekil(o, ek.h, await adimZari(o.tohum ?? "", o.id, o.n + 1));
      if (!r.ok) return r;
      if (r.deger.degisti) yaz(b, tum, r.deger.oyun);
      return undefined;
    }
    case "oyunBaslat": {
      if (!o || o.asama !== "bekleme") return hata(o && o.asama === "oyun" ? "oyun_basladi" : "oyun_yok");
      // Bayat beklemenin üstüne sahne açılmış olabilir: sahne sürerken oyun başlamaz.
      if (b.etkinlik) return hata("masa_mesgul");
      const tohum = (b.tohumUret ?? varsayilanTohum)();
      // Yetki çatıda: kurucu ya da (bekleme bayatsa) bekleyen herhangi bir oturan.
      const r = oyunBaslat(o, ek.h, tohum, await taahhutHesapla(tohum), await adimZari(tohum, o.id, 0), b.simdi);
      if (!r.ok) return r;
      yaz(b, tum, r.deger);
      return undefined;
    }
    case "hamle":
    case "oyunPas": {
      if (!o || o.asama === "bekleme" || !o.tohum) return hata("oyun_yok");
      const zar = await adimZari(o.tohum, o.id, o.n + 1);
      const r = ileti.t === "hamle" ? oyunHamle(o, ek.h, ileti.n, ileti.hamle, zar) : oyunPas(o, ek.h, ileti.n, b.simdi, zar);
      if (!r.ok) return r;
      // Tekrar: durum değişmez; yalnız isteyene güncel görünüm.
      if (r.deger.tekrar) kaynak.gonder({ t: "oyun", oyun: oyunGorunumu(o, ek.h, b.simdi) });
      else yaz(b, tum, r.deger.oyun);
      return undefined;
    }
    case "oyunDagit": {
      const r = oyunDagit(o, ek.h, b.simdi);
      if (!r.ok) return r;
      if (r.deger.degisti) yaz(b, tum, r.deger.oyun);
      return undefined;
    }
    case "oyunKapat": {
      // Biten oyunun sonucunu masadan kaldırır (oturan herkes). Süren oyun kapatılamaz: dağıtma oyuyla biter.
      if (!o) return undefined;
      if (oyunSuruyor(o)) return hata("oyun_var");
      if (ek.k === null) return hata("oturmuyor");
      yaz(b, tum, undefined);
      return undefined;
    }
    default:
      return hata("gecersiz_istek");
  }
}
