// P6: darbe başarısı sonrası bağımsız devletin sınırlı v1 yönetimi.
import type { HataKodu } from "../tipler.ts";
import { BEYLIKLER } from "../dunya-veri.ts";
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
    case "ittifak": {
      if (s.ittifakTalep) return "devlet_talep_var";
      const hedef = typeof govde.hedefBolge === "string" ? BEYLIKLER.find((x) => x.id === govde.hedefBolge) : undefined;
      const kaynakAd = BEYLIKLER.find((x) => x.id === d.id)?.ad;
      if (!hedef || hedef.id === d.id || !kaynakAd) return "deger_sinir_disi";
      const mevcut = s.ittifaklar?.[hedef.id]?.durum;\n      if (mevcut === "aktif" || mevcut === "kabulBekliyor") return "devlet_talep_var";
      const istekId = `${d.id}:${d.kn + 1}:${d.ay}:ittifak`;
      s.ittifakTalep = { hedef: hedef.id, istekId, ay: d.ay };
      (d.diplomasiGiden ??= []).push({ tur: "ittifakIstek", hedef: hedef.id, istekId, ay: d.ay, ad: kaynakAd });
      return null;
    }
    case "ittifakYanit": {
      const kaynak = govde.kaynakBolge;
      const beylik = typeof kaynak === "string" ? BEYLIKLER.find((x) => x.id === kaynak) : undefined;
      const karar = govde.karar;
      if (!beylik || beylik.id === d.id || (karar !== "kabul" && karar !== "ret")) return "deger_sinir_disi";
      const gelen = s.ittifakGelen?.[beylik.id];
      if (!gelen || gelen.yanitlandi || gelen.istekId !== govde.istekId) return "hedef_uygun_degil";
      const hedefAd = BEYLIKLER.find((x) => x.id === d.id)?.ad;
      if (!hedefAd) return "deger_sinir_disi";
      (s.ittifakYanits ??= {})[beylik.id] = { karar, ay: d.ay, ad: beylik.ad, istekId: gelen.istekId };
      (s.ittifaklar ??= {})[beylik.id] = {
        durum: karar === "kabul" ? "kabulBekliyor" : "ret",
        baslangicAy: d.ay, sonAy: d.ay + 12, ad: beylik.ad, istekId: gelen.istekId,
      };
      gelen.yanitlandi = true;
      (d.diplomasiGiden ??= []).push({
        tur: "ittifakYanit", hedef: beylik.id, istekId: gelen.istekId, karar, ay: d.ay, ad: hedefAd,
      });
      return null;
    }
    case "taninmaYanit": {
      const kaynak = govde.kaynakBolge;
      const beylik = typeof kaynak === "string" ? BEYLIKLER.find((x) => x.id === kaynak) : undefined;
      const karar = govde.karar;
      if (!beylik || beylik.id === d.id) return "deger_sinir_disi";
      if (karar !== "kabul" && karar !== "ret") return "deger_sinir_disi";
      const gelen = s.taninmaGelen?.[beylik.id];
      if (!gelen || gelen.yanitlandi || gelen.istekId !== govde.istekId) return "hedef_uygun_degil";
      const hedefAd = BEYLIKLER.find((x) => x.id === d.id)?.ad;
      if (!hedefAd) return "deger_sinir_disi";
      const yanitlar = (s.taninmaYanits ??= {});
      yanitlar[beylik.id] = { karar, ay: d.ay, ad: beylik.ad, istekId: gelen.istekId };
      gelen.yanitlandi = true;
      (d.diplomasiGiden ??= []).push({
        tur: "taninmaYanit", hedef: beylik.id, istekId: gelen.istekId, karar, ay: d.ay, ad: hedefAd,
      });
      return null;
    }
    case "taninma": {
      if (s.taninma === "tanindi") return "devlet_kapali";
      if (s.taninma === "talepEdildi") return "devlet_talep_var";
      const hedef = typeof govde.hedefBolge === "string" ? BEYLIKLER.find((x) => x.id === govde.hedefBolge) : undefined;
      const kaynakAd = BEYLIKLER.find((x) => x.id === d.id)?.ad;
      if (!hedef || hedef.id === d.id || !kaynakAd) return "deger_sinir_disi";
      const istekId = `${d.id}:${d.kn + 1}:${d.ay}`;
      s.taninma = "talepEdildi";
      s.taninmaTalepAy = d.ay;
      s.taninmaHedef = hedef.id;
      s.taninmaIstekId = istekId;
      delete s.taninmaSonuc;
      delete s.taninmaCevap;
      (d.diplomasiGiden ??= []).push({ tur: "taninmaIstek", hedef: hedef.id, istekId, ay: d.ay, ad: kaynakAd });
      return null;
    }
    default:
      return "deger_sinir_disi";
  }
}

/** Sultan barış talebi iki ay sonra meşruiyet koşuluyla sonuçlanır; tanınma talebi başka devlet yanıtı gelene kadar bekler. */
export function devletAyi(d: BolgeDurumu, ay: number): "barisKabul" | "barisRet" | null {
  const s = d.devlet;
  if (s) {
    for (const x of Object.values(s.ittifaklar ?? {})) {
      if ((x.durum === "aktif" || x.durum === "kabulBekliyor") && ay > x.sonAy) x.durum = "suresiDoldu";
    }
    const talep = s.ittifakTalep;
    if (talep && ay > talep.ay + 2) {
      const hedefAd = BEYLIKLER.find((x) => x.id === talep.hedef)?.ad ?? talep.hedef;
      (s.ittifakYanits ??= {})[talep.hedef] = { karar: "ret", ay, ad: hedefAd, istekId: talep.istekId };
      (s.ittifaklar ??= {})[talep.hedef] = { durum: "suresiDoldu", baslangicAy: talep.ay, sonAy: ay, ad: hedefAd, istekId: talep.istekId };
      delete s.ittifakTalep;
      d.diplomasiGiden = (d.diplomasiGiden ?? []).filter((x) => !(x.tur === "ittifakIstek" && x.istekId === talep.istekId));
    }
    for (const [bolge, gelen] of Object.entries(s.ittifakGelen ?? {})) {
      if (gelen.yanitlandi || ay <= gelen.ay + 2) continue;
      gelen.yanitlandi = true;
      (s.ittifakYanits ??= {})[bolge] = { karar: "ret", ay, ad: gelen.ad, istekId: gelen.istekId };
      (s.ittifaklar ??= {})[bolge] = { durum: "suresiDoldu", baslangicAy: gelen.ay, sonAy: ay, ad: gelen.ad, istekId: gelen.istekId };
      const kendiAd = BEYLIKLER.find((x) => x.id === d.id)?.ad;
      if (kendiAd) (d.diplomasiGiden ??= []).push({ tur: "ittifakYanit", hedef: bolge, istekId: gelen.istekId, karar: "ret", ay, ad: kendiAd });
    }
  }
  if (!s || s.sultan !== "barisTalebi" || s.sultanTalepAy === undefined || ay < s.sultanTalepAy + 2) return null;
  const kabul = d.mesruiyet.puan >= 55 && (d.sultanlik?.mesruiyet.puan ?? 0) >= 55;
  s.sultan = kabul ? "sultanligaDondu" : "bagimsiz";
  s.sultanSonuc = kabul ? "kabul" : "ret";
  delete s.sultanTalepAy;
  return kabul ? "barisKabul" : "barisRet";
}

/** Bölge DO'sundan gelen doğrulanmış tanınma isteği: aynı kimlik tekrarında aynı kabul yanıtı verilir. */
export function taninmaIstekAl(
  d: BolgeDurumu, kaynak: unknown, istekId: unknown, ay: unknown, ad: unknown,
): HataKodu | null {
  if (!d.devlet) return "devlet_yok";
  const b = typeof kaynak === "string" ? BEYLIKLER.find((x) => x.id === kaynak) : undefined;
  if (!b || b.id === d.id || typeof istekId !== "string" || istekId.length < 3 || istekId.length > 128
    || !Number.isInteger(ay) || (ay as number) < 0 || ad !== b.ad) return "deger_sinir_disi";
  const gelen = (d.devlet.taninmaGelen ??= {});
  const onceki = gelen[b.id];
  if (onceki?.istekId === istekId) return null;
  if (onceki && !onceki.yanitlandi) return "devlet_talep_var";
  gelen[b.id] = { istekId, ay: ay as number, ad: b.ad, yanitlandi: false };
  return null;
}

/** Kaynak bölgeye ulaşan karar; yalnız bekleyen aynı hedef/istek kimliği kabul edilir. */
export function taninmaYanitAl(
  d: BolgeDurumu, kaynak: unknown, istekId: unknown, karar: unknown, ay: unknown, ad: unknown,
): HataKodu | null {
  const s = d.devlet;
  if (!s) return "devlet_yok";
  const b = typeof kaynak === "string" ? BEYLIKLER.find((x) => x.id === kaynak) : undefined;
  if (!b || b.id === d.id || typeof istekId !== "string" || !Number.isInteger(ay) || (ay as number) < 0
    || ad !== b.ad || (karar !== "kabul" && karar !== "ret")) return "deger_sinir_disi";
  if (s.taninmaCevap?.istekId === istekId) return s.taninmaCevap.kaynak === b.id && s.taninmaCevap.karar === karar ? null : "hedef_uygun_degil";
  if (s.taninma !== "talepEdildi" || s.taninmaIstekId !== istekId || s.taninmaHedef !== b.id) return "hedef_uygun_degil";
  s.taninmaSonuc = karar;
  s.taninmaCevap = { kaynak: b.id, karar, ay: ay as number, ad: b.ad, istekId };
  s.taninma = karar === "kabul" ? "tanindi" : "taninmadi";
  delete s.taninmaTalepAy;
  return null;
}

/** Gelen ittifak isteği: bağımsız olmayan bölge otomatik ret verir, outbox kaynakta takılı kalmaz. */
export function ittifakIstekAl(
  d: BolgeDurumu, kaynak: unknown, istekId: unknown, ay: unknown, ad: unknown,
): HataKodu | null {
  const b = typeof kaynak === "string" ? BEYLIKLER.find((x) => x.id === kaynak) : undefined;
  const kendiAd = BEYLIKLER.find((x) => x.id === d.id)?.ad;
  if (!b || b.id === d.id || typeof istekId !== "string" || istekId.length < 3 || istekId.length > 128
    || !Number.isInteger(ay) || (ay as number) < 0 || ad !== b.ad || !kendiAd) return "deger_sinir_disi";
  const gelen = d.devlet?.ittifakGelen ?? {};
  const onceki = gelen[b.id];
  if (onceki?.istekId === istekId) return null;
  if (!d.devlet || d.devlet.ittifaklar?.[b.id]?.durum === "aktif" || (onceki && !onceki.yanitlandi)) {
    (d.diplomasiGiden ??= []).push({ tur: "ittifakYanit", hedef: b.id, istekId, karar: "ret", ay: d.ay, ad: kendiAd });
    return null;
  }
  (d.devlet.ittifakGelen ??= {})[b.id] = { istekId, ay: ay as number, ad: b.ad, yanitlandi: false };
  return null;
}

/** Kaynağın kabul/ret kararı; kabulde hedefe son teyit outbox'ı gönderilir. */
export function ittifakYanitAl(
  d: BolgeDurumu, kaynak: unknown, istekId: unknown, karar: unknown, ay: unknown, ad: unknown,
): HataKodu | null {
  const s = d.devlet;
  if (!s) return "devlet_yok";
  const b = typeof kaynak === "string" ? BEYLIKLER.find((x) => x.id === kaynak) : undefined;
  if (!b || b.id === d.id || typeof istekId !== "string" || !Number.isInteger(ay) || (ay as number) < 0
    || ad !== b.ad || (karar !== "kabul" && karar !== "ret")) return "deger_sinir_disi";
  const onceki = s.ittifakYanits?.[b.id];\n  if (onceki?.istekId === istekId) return onceki.karar === karar ? null : "hedef_uygun_degil";
  if (s.ittifakTalep?.hedef !== b.id || s.ittifakTalep.istekId !== istekId) return "hedef_uygun_degil";
  (s.ittifakYanits ??= {})[b.id] = { karar, ay: ay as number, ad: b.ad, istekId };
  (s.ittifaklar ??= {})[b.id] = {
    durum: karar === "kabul" ? "aktif" : "ret",
    baslangicAy: ay as number, sonAy: (ay as number) + 12, ad: b.ad, istekId,
  };
  delete s.ittifakTalep;
  if (karar === "kabul") {
    const kendiAd = BEYLIKLER.find((x) => x.id === d.id)?.ad;
    if (!kendiAd) return "deger_sinir_disi";
    (d.diplomasiGiden ??= []).push({ tur: "ittifakOnay", hedef: b.id, istekId, ay: ay as number, ad: kendiAd });
  }
  return null;
}

/** Kaynağın son teyidi; hedefteki bekleyen ittifak ancak bu mesajla etkinleşir. */
export function ittifakOnayAl(
  d: BolgeDurumu, kaynak: unknown, istekId: unknown, ay: unknown, ad: unknown,
): HataKodu | null {
  const s = d.devlet;
  if (!s) return "devlet_yok";
  const b = typeof kaynak === "string" ? BEYLIKLER.find((x) => x.id === kaynak) : undefined;
  if (!b || b.id === d.id || typeof istekId !== "string" || !Number.isInteger(ay) || (ay as number) < 0 || ad !== b.ad) return "deger_sinir_disi";
  const kayit = s.ittifaklar?.[b.id];
  if ((kayit?.durum === "aktif" || kayit?.durum === "suresiDoldu") && kayit.istekId === istekId) return null;
  if (!kayit || kayit.durum !== "kabulBekliyor" || kayit.istekId !== istekId || kayit.baslangicAy !== ay || s.ittifakYanits?.[b.id]?.karar !== "kabul") return "hedef_uygun_degil";
  kayit.durum = "aktif";
  return null;
}

/** Her oyuncu kendi siyasi bağlılığını seçer; seçim yokluğu tarafsızlıktır, zorunlu yemin yoktur. */
export function devletYemin(d: BolgeDurumu, kimlik: SiyasiKimlik, deger: unknown): HataKodu | null {
  const s = d.devlet;
  if (!s) return "devlet_yok";
  if (kimlik.bolge !== d.id) return "yerlesim_gecersiz";
  if (deger !== "bagli" && deger !== "tarafsiz") return "deger_sinir_disi";
  s.yeminler[kimlik.hesap] = deger;
  return null;
}

export function devletGorunumu(s: BagimsizDevlet | undefined) {
  if (!s) return null;
  const yeminler = Object.values(s.yeminler);
  return {
    v: s.v, ad: s.ad, kurulusAy: s.kurulusAy,
    bey: { kisi: s.beyKisi, ad: s.beyAd },
    vergiOrani: s.vergiOrani,
    divan: s.divan.map((x) => ({ ad: x.ad, rol: x.rol })),
    mogol: s.mogol, sultan: s.sultan, sultanSonuc: s.sultanSonuc ?? null, taninma: s.taninma,
    taninmaTalep: s.taninmaHedef ? { hedef: s.taninmaHedef, istekId: s.taninmaIstekId ?? null, sonuc: s.taninmaSonuc ?? null, cevap: s.taninmaCevap ?? null } : null,
    taninmaGelen: Object.entries(s.taninmaGelen ?? {}).map(([bolge, x]) => ({ bolge, ...x })),
    taninmaYanits: Object.entries(s.taninmaYanits ?? {}).map(([bolge, x]) => ({ bolge, ...x })),
    ittifakTalep: s.ittifakTalep ?? null,
    ittifakGelen: Object.entries(s.ittifakGelen ?? {}).map(([bolge, x]) => ({ bolge, ...x })),
    ittifakYanits: Object.entries(s.ittifakYanits ?? {}).map(([bolge, x]) => ({ bolge, ...x })),
    ittifaklar: Object.entries(s.ittifaklar ?? {}).map(([bolge, x]) => ({ bolge, ...x })),
    yemin: { bagli: yeminler.filter((x) => x === "bagli").length, tarafsiz: yeminler.filter((x) => x === "tarafsiz").length },
  };
}
