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
      s.sultanTalepAy = d.ay;
      delete s.sultanSonuc;
      return null;
    }
    case "divanEkle": {
      const destek = d.darbe?.destekler.find((x) => x.kisi === govde.kisi);
      if (!destek) return "hedef_uygun_degil";
      if (s.divan.some((x) => x.kisi === destek.kisi || x.hesap === destek.hesap)) return "devlet_talep_var";
      if (s.divan.length >= 5) return "sinir_asildi";
      s.divan.push({ kisi: destek.kisi, hesap: destek.hesap, ad: destek.ad, rol: "divan" });
      return null;
    }
    case "divanCikar": {
      if (typeof govde.kisi !== "string") return "deger_sinir_disi";
      const once = s.divan.length;
      s.divan = s.divan.filter((x) => x.kisi !== govde.kisi);
      return s.divan.length === once ? "hedef_uygun_degil" : null;
    }
    case "taninma": {
      if (s.taninma === "tanindi") return "devlet_kapali";
      if (s.taninma === "talepEdildi") return "devlet_talep_var";
      s.taninma = "talepEdildi";
      s.taninmaTalepAy = d.ay;
      return null;
    }
    default:
      return "deger_sinir_disi";
  }
}

/** Sultan barış talebi iki ay sonra meşruiyet koşuluyla sonuçlanır; tanınma talebi başka devlet yanıtı gelene kadar bekler. */
export function devletAyi(d: BolgeDurumu, ay: number): "barisKabul" | "barisRet" | null {
  const s = d.devlet;
  if (!s || s.sultan !== "barisTalebi" || s.sultanTalepAy === undefined || ay < s.sultanTalepAy + 2) return null;
  const kabul = d.mesruiyet.puan >= 55 && (d.sultanlik?.mesruiyet.puan ?? 0) >= 55;
  s.sultan = kabul ? "sultanligaDondu" : "bagimsiz";
  s.sultanSonuc = kabul ? "kabul" : "ret";
  delete s.sultanTalepAy;
  return kabul ? "barisKabul" : "barisRet";
}

/** Her oyuncu kendi siyasi bağlılığını seçer; seçim yokluğu tarafsızlıktır, zorunlu yemin yoktur. */
 seçim yokluğu tarafsızlıktır, zorunlu yemin yoktur. */
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
    mogol: s.mogol, sultan: s.sultan, sultanSonuc: s.sultanSonuc ?? null, taninma: s.taninma,
    yemin: { bagli: yeminler.filter((x) => x === "bagli").length, tarafsiz: yeminler.filter((x) => x === "tarafsiz").length },
  };
}
