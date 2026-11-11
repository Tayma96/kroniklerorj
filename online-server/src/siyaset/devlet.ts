// P6: darbe başarısı sonrası bağımsız devletin sınırlı v1 yönetimi.
import type { HataKodu } from "../tipler.ts";
import type { BagimsizDevlet, BolgeDurumu, SiyasiKimlik } from "./tipler.ts";

function beyMi(d: BolgeDurumu, kimlik: SiyasiKimlik): boolean {
  return !!d.devlet && d.devlet.beyKisi === kimlik.kisi && d.devlet.beyHesap === kimlik.hesap;
}

/** Beyin kimlik, vergi, dış ilişki ve tanınma talepleri; kararlar kayıtlı ve açık. */
export function devletYonet(d: BolgeDurumu, kimlik: SiyasiKimlik, govde: Record<string, unknown>): HataKodu | null {
  const s = d.devlet;
  if (!s) return "devlet_yok";
  if (!beyMi(d, kimlik)) return "yetki_yok";

  switch (govde.tur) {
    case "ad": {
      if (typeof govde.ad !== "string") return "deger_sinir_disi";
      const ad = govde.ad.trim().replace(/\s+/g, " ");
      if (ad.length < 3 || ad.length > 32 || !/^[\p{L}\p{N}][\p{L}\p{N} '\u2019-]*[\p{L}\p{N}]$/u.test(ad)) return "deger_sinir_disi";
      s.ad = ad;
      return null;
    }
    case "vergi": {
      if (!Number.isInteger(govde.deger) || (govde.deger as number) < 0 || (govde.deger as number) > 4) return "deger_sinir_disi";
      s.vergiOrani = govde.deger as number;
      return null;
    }
    case "mogol": {
      if (govde.deger !== "harac" && govde.deger !== "diren") return "deger_sinir_disi";
      s.mogol = govde.deger;
      return null;
    }
    case "sultanBaris": {
      if (s.sultan === "sultanligaDondu") return "devlet_kapali";
      if (s.sultan === "barisTalebi") return "devlet_talep_var";
      s.sultan = "barisTalebi";
      return null;
    }
    case "taninma": {
      if (s.taninma === "tanindi") return "devlet_kapali";
      if (s.taninma === "talepEdildi") return "devlet_talep_var";
      s.taninma = "talepEdildi";
      return null;
    }
    default:
      return "deger_sinir_disi";
  }
}

/** Her oyuncu kendi siyasi bağlılığını seçer; seçim yokluğu tarafsızlıktır, zorunlu yemin yoktur. */
export function devletYemin(d: BolgeDurumu, kimlik: SiyasiKimlik, deger: unknown): HataKodu | null {
  const s = d.devlet;
  if (!s) return "devlet_yok";
  if (kimlik.bolge !== d.id) return "yerlesim_gecersiz";
  if (deger !== "bagli" && deger !== "tarafsiz") return "deger_sinir_disi";
  s.yeminler[kimlik.kisi] = deger;
  return null;
}

export function devletGorunumu(s: BagimsizDevlet | undefined) {
  if (!s) return null;
  const yeminler = Object.values(s.yeminler);
  return {
    v: s.v, ad: s.ad, kurulusAy: s.kurulusAy,
    bey: { kisi: s.beyKisi, hesap: s.beyHesap },
    vergiOrani: s.vergiOrani,
    divan: s.divan.map((x) => ({ ad: x.ad, rol: x.rol })),
    mogol: s.mogol, sultan: s.sultan, taninma: s.taninma,
    yemin: { bagli: yeminler.filter((x) => x === "bagli").length, tarafsiz: yeminler.filter((x) => x === "tarafsiz").length },
  };
}
