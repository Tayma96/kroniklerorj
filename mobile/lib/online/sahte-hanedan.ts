// Geliştirici oturumu ve tasarım önizlemesi için sahte hanedan: bellekte eş, çocuklar, akrabalar, vasiyet, devir planı
// ve sayfalı yerleşim kroniği. Sayılar sunucu kurallarının kaba kopyasıdır (yalnız görünüm denemesi için).
// Önizleme parametresi ohd: "songun" (son günler), "olu" (devir bekliyor), "bekar" (eşsiz).
import { ekBasarili, ekBasarisiz, type EkSonuc } from "./ek-istemci";
import { VAKIF, type DevirOnizleme, type DevirPlani, type HanedanGorunumu, type HanedanIstemci, type HanedanKisi, type KronikSatiri, type Vasiyet } from "./hanedan-veri";
import type { Cinsiyet } from "./protokol";

/** Sunucu kronik anahtarlarının öneki; metinler "onl." önekiyle çevrilir (burada yalnız veri). */
const KR = "kronik.";
const AY = 300; // sahte "şimdiki" oyun ayı
const KURALLAR = { vergiOrani: 10, namDevirOrani: 0.25, devirSureAy: 4, evlilikYasi: 16, evlilikGorusEsigi: 40, dugunBedeli: 10, sonGunlerAy: 6 };
const gecikme = <T,>(v: T, ms = 240) => new Promise<T>((r) => setTimeout(() => r(v), ms));
const kisi = (id: string, ad: string, yas: number, cinsiyet: Cinsiyet): HanedanKisi => ({ id, ad, yas, cinsiyet });

function parametre(ad: string): string | null {
  const arama = (globalThis as { location?: { search?: string } }).location?.search ?? "";
  try { return new URLSearchParams(arama).get(ad); } catch { return null; }
}

interface Durum { olu: boolean; sonGunler: boolean; nesil: number; ad: string; es: HanedanGorunumu["es"]; vasiyet: Vasiyet | null; kronik: KronikSatiri[]; istek: Map<string, unknown> }
let durum: Durum | null = null;

function durumAl(ad: string): Durum {
  if (durum) return durum;
  const ohd = parametre("ohd");
  const ref = (id: string, a: string) => ({ id, ad: a });
  const kronik: KronikSatiri[] = [
    { sira: 1, ay: 12, tur: "olum", ozet: { k: KR + "olum", p: { kisi: ref("o1", "Yahya Bey"), yas: 71, nesil: 1 } } },
    { sira: 2, ay: 13, tur: "devir", ozet: { k: KR + "devir", p: { olu: ref("o1", "Yahya Bey"), nesil: 2, varis: ref("o4", ad) } } },
    { sira: 3, ay: 96, tur: "evlilik", ozet: { k: KR + "evlilik", p: { a: ref("o4", ad), b: ref("n41", "Hasan") } } },
    { sira: 4, ay: 120, tur: "dogum", ozet: { k: KR + "dogum", p: { anne: ref("o4", ad), baba: ref("n41", "Hasan"), cocuk: ref("n77", "Mehmed"), meslek: "demirci" } } },
    { sira: 5, ay: 150, tur: "evlilik", ozet: { k: KR + "evlilik", p: { a: ref("o2", "Selim Ağa"), b: ref("n12", "Rabia") } } },
    { sira: 6, ay: 170, tur: "dogum", ozet: { k: KR + "dogum", p: { anne: ref("o4", ad), baba: ref("n41", "Hasan"), cocuk: ref("n78", "Fatma"), meslek: "" } } },
    { sira: 7, ay: 260, tur: "olum", ozet: { k: KR + "olum", p: { kisi: ref("o3", "Kerim Usta"), yas: 64, nesil: 1 } } },
    { sira: 8, ay: 288, tur: "dogum", ozet: { k: KR + "dogum", p: { anne: ref("o4", ad), baba: ref("n41", "Hasan"), cocuk: ref("n79", "Ali"), meslek: "dokumaci" } } },
  ];
  for (let i = 0; i < 60; i++) kronik.unshift({ sira: 0, ay: 1 + (i % 11), tur: "dogum", ozet: { k: KR + "dogum", p: { anne: ref("n" + (200 + i), "Emine"), baba: ref("o9", "Davud"), cocuk: ref("n" + (300 + i), "Yusuf"), meslek: "" } } });
  kronik.forEach((k, i) => { k.sira = i + 1; });
  durum = {
    olu: ohd === "olu", sonGunler: ohd === "songun", nesil: 2, ad,
    es: ohd === "bekar" ? null : { id: "n41", ad: "Hasan", oyuncu: false, evlilikAyi: 96 },
    vasiyet: { varis: "n77", paylar: [{ kime: "n77", oran: 60 }, { kime: "n78", oran: 25 }, { kime: VAKIF, oran: 15 }] },
    kronik, istek: new Map(),
  };
  return durum;
}

function gorunum(d: Durum): HanedanGorunumu {
  const cocuklar = [kisi("n77", "Mehmed", 15, "erkek"), kisi("n78", "Fatma", 11, "kadın"), kisi("n79", "Ali", 1, "erkek")];
  const kardesler = [kisi("n52", "Halil", 38, "erkek")];
  const yegenler = [kisi("n90", "Safiye", 17, "kadın")];
  const adaylar = [
    ...cocuklar.map((c) => ({ ...c, yakinlik: "cocuk" as const, uygun: c.yas >= 12, ...(c.yas < 12 ? { neden: "kucuk" as const } : {}) })),
    ...kardesler.map((c) => ({ ...c, yakinlik: "kardes" as const, uygun: true })),
    ...yegenler.map((c) => ({ ...c, yakinlik: "yegen" as const, uygun: true })),
  ];
  return {
    id: "o4", nesil: d.nesil, olu: d.olu, sonGunler: d.sonGunler && !d.olu,
    es: d.es, cocuklar, kardesler, yegenler, adaylar,
    varsayilanVaris: d.vasiyet?.varis ?? "n77", vasiyet: d.vasiyet,
    vasiyetAlicilari: d.olu ? [] : [VAKIF, ...cocuklar.map((c) => c.id), ...kardesler.map((c) => c.id), ...yegenler.map((c) => c.id), ...(d.es ? [d.es.id] : [])],
    aileMeslegi: "demirci",
    atalar: [{ id: "o1", ad: "Yahya Bey", dogumAyi: -840, olumAyi: 12, yas: 71 }],
    yaslilik: { basladi: d.sonGunler || d.olu, takatTavani: d.sonGunler || d.olu ? 12 : null },
    tereke: d.olu ? { olumAyi: AY - 1, son: AY + 3, kalanAy: 4 } : null,
    kasaba: { hazine: 412, vakif: 96 },
    kurallar: KURALLAR,
  };
}

function plan(d: Durum, varisHam: string | null): DevirPlani | null {
  const g = gorunum(d);
  const id = varisHam ?? g.varsayilanVaris;
  const a = g.adaylar.find((x) => x.id === id && x.uygun);
  if (!a) return null;
  const tereke = 180;
  const vergi = Math.floor((tereke * KURALLAR.vergiOrani) / 100);
  const kalan = tereke - vergi;
  const paylar = d.vasiyet?.paylar ?? [{ kime: a.id, oran: 100 }];
  return {
    olu: "o4", hesap: "sahte", hanedan: "o4", nesil: d.nesil + 1, ol: AY - 1,
    varis: { id: a.id, ad: a.ad, k: a.cinsiyet === "kadın" ? 1 : 0, d: AY - a.yas * 12, e: 3, an: 0, ba: 0 },
    tereke,
    kalemler: [
      ...paylar.map((p) => ({ tur: "pay" as const, kime: p.kime, oran: p.oran, akce: Math.floor((kalan * p.oran) / 100) })),
      { tur: "vergi", akce: vergi },
      { tur: "emanet", akce: 6 },
      { tur: "envanter", mallar: { demir: 4, odun: 7 } },
      { tur: "nam", nam: [3, 1, 4, 2] },
      { tur: "aileMeslegi", meslek: "demirci", carpan: 1.25 },
      ...[12, 15, 19, 23].map((n, i) => ({ tur: "ata" as const, npc: n, yuk: 6 - i })),
      ...(paylar.some((p) => p.kime === "n78") ? [] : [{ tur: "kusme" as const, npc: 78, yuk: -15 }]),
      { tur: "husumet", kim: "o9" },
    ],
    kronik: { t: "devir", k: KR + "devir", p: { olu: { id: "o4", ad: d.ad }, nesil: d.nesil + 1 } },
  };
}

export function sahteHanedanIstemci(ad: string, cinsiyet: Cinsiyet, tanidik?: (id: string) => { ad: string; gorus?: number } | undefined): HanedanIstemci {
  void cinsiyet;
  return {
    hanedan: () => gecikme(ekBasarili(gorunum(durumAl(ad)))),
    vasiyet: ({ vasiyet, istekNo }) => {
      const d = durumAl(ad);
      if (d.olu) return gecikme(ekBasarisiz("olu"));
      const p = vasiyet?.paylar;
      if (vasiyet && (!vasiyet.varis && !p)) return gecikme(ekBasarisiz("vasiyet_gecersiz"));
      if (p && (p.reduce((s, x) => s + x.oran, 0) !== 100 || p.some((x) => !Number.isInteger(x.oran) || x.oran < 1))) return gecikme(ekBasarisiz("vasiyet_gecersiz"));
      d.vasiyet = vasiyet;
      d.istek.set(istekNo, true);
      return gecikme(ekBasarili({ vasiyet: d.vasiyet }));
    },
    devirOnizle: (varis): Promise<EkSonuc<DevirOnizleme>> => {
      const d = durumAl(ad);
      const p = plan(d, varis);
      if (!p) return gecikme(ekBasarisiz("varis_gecersiz"));
      const pk = `pk${p.varis.id}${p.kalemler.length}${d.nesil}`;
      return gecikme(ekBasarili({ plan: p, pk, varsayim: !d.olu, kronik: { sira: 0, ay: AY, tur: "devir", ozet: { k: p.kronik.k, p: { ...p.kronik.p, varis: { id: p.varis.id, ad: p.varis.ad } } } } }));
    },
    devir: ({ varis, pk, istekNo }) => {
      const d = durumAl(ad);
      const onceki = d.istek.get(istekNo);
      if (onceki) return gecikme(ekBasarili(onceki as never));
      if (!d.olu) return gecikme(ekBasarisiz("devir_yok"));
      const p = plan(d, varis ?? null);
      if (!p) return gecikme(ekBasarisiz("varis_gecersiz"));
      if (pk !== `pk${p.varis.id}${p.kalemler.length}${d.nesil}`) return gecikme(ekBasarisiz("devir_degisti"));
      d.kronik.push({ sira: d.kronik.length + 1, ay: AY, tur: "devir", ozet: { k: KR + "devir", p: { olu: { id: "o4", ad: d.ad }, nesil: p.nesil, varis: { id: "o4", ad: p.varis.ad } } } });
      d.olu = false;
      d.sonGunler = false;
      d.nesil = p.nesil;
      d.ad = p.varis.ad;
      d.vasiyet = null;
      d.es = null;
      const yanit = { id: "o4", pk, plan: p, para: 140, hanedan: { id: "o4", nesil: p.nesil, olu: false, sonGunler: false } };
      d.istek.set(istekNo, yanit);
      return gecikme(ekBasarili(yanit));
    },
    evlilik: ({ hedef, istekNo }) => {
      const d = durumAl(ad);
      if (d.olu) return gecikme(ekBasarisiz("olu"));
      if (d.es) return gecikme(ekBasarisiz("evli"));
      const k = tanidik?.(hedef);
      if (!k) return gecikme(ekBasarisiz("kisi_yok"));
      if ((k.gorus ?? 0) < KURALLAR.evlilikGorusEsigi) return gecikme(ekBasarisiz("gorus_yetersiz"));
      d.es = { id: hedef, ad: k.ad, oyuncu: false, evlilikAyi: AY };
      d.kronik.push({ sira: d.kronik.length + 1, ay: AY, tur: "evlilik", ozet: { k: KR + "evlilik", p: { a: { id: "o4", ad: d.ad }, b: { id: hedef, ad: k.ad } } } });
      d.istek.set(istekNo, true);
      return gecikme(ekBasarili({ es: { id: hedef, ad: k.ad }, esik: KURALLAR.evlilikGorusEsigi, bedel: KURALLAR.dugunBedeli, takat: 2, para: 30 }));
    },
    kronik: (imlec) => {
      const d = durumAl(ad);
      const satirlar = d.kronik.filter((x) => x.sira > imlec).slice(0, 20);
      const son = satirlar.at(-1)?.sira ?? imlec;
      return gecikme(ekBasarili({ kronik: satirlar, imlec: son, dahaVar: son < d.kronik.length }));
    },
  };
}
