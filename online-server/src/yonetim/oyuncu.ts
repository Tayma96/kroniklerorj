// Yönetim: oyuncu bulma ve oyuncu ayrıntısı.
// - GET /yonetim/oyuncu-ara?ad=&no=&imlec= : ad başı (Türkçe harf duyarsız, sayfalı; DunyaDO `adAra`) ya da 8 haneli
//   oyuncu numarası (DunyaDO `numaraBul`). Yetki: oyuncuGor. Her arama işlem kaydına girer.
// - GET /yonetim/oyuncu-ayrinti?hesap= : cüzdan, envanter özeti, meslek, yerleşim, son işlemler (istek izleri ve
//   aylık gelir-gider defteri), hesap açılışı, son giriş ve oturum sürümü. Yetki: oyuncuAyrinti; kayda girer.
// Parçalardan biri ulaşılamazsa o bölüm null döner (ayrıntı yine gösterilir).

import { yerlesimBul } from "../dunya-veri.ts";
import { basarili, type Profil, type Sonuc } from "../tipler.ts";
import { kayitHazirla, kimlikOzeti, reddet, yetkiIste, type Oturum } from "./islem.ts";
import { etkinOzet, hesapIdCoz, type Yaptirim } from "./yaptirim.ts";

/** [PARAMETRE] Ad aramasında en az karakter. */
export const YONETIM_ARAMA_EN_AZ = 2;

interface NumaraSonucu {
  hesapId: string;
  numara: number;
  ad: string;
  yerlesim: string;
  beylik: string;
}

const satir = (s: NumaraSonucu) => ({ hesap: s.hesapId, numara: s.numara, ad: s.ad, yerlesim: s.yerlesim, yerlesimAd: yerlesimBul(s.yerlesim)?.ad ?? s.yerlesim, beylik: s.beylik });

export async function oyuncuAra(o: Oturum, sorgu: Record<string, string | null>): Promise<Sonuc<unknown>> {
  const ad = sorgu.ad?.trim() || undefined;
  const no = sorgu.no?.trim() || undefined;
  const ek = { ayrinti: { ad: ad ?? null, no: no ?? null } };
  const red = await yetkiIste(o, "oyuncuGor", ek);
  if (red) return red;
  const dunya = o.b.dunyaCagir;
  if (!dunya) return reddet(o, "oyuncuAra", "yapilandirma_eksik", ek);
  let sonuclar: ReturnType<typeof satir>[] = [];
  let imlec: string | null = null;
  if (no) {
    const r = await dunya<NumaraSonucu>({ islem: "numaraBul", numara: no });
    if (!r.ok && r.hata !== "kisi_yok") return reddet(o, "oyuncuAra", r.hata, ek);
    if (r.ok) sonuclar = [satir(r.deger)];
  } else if (ad) {
    if ([...ad].length < YONETIM_ARAMA_EN_AZ) return reddet(o, "oyuncuAra", "arama_kisa", ek);
    const r = await dunya<{ sonuclar: NumaraSonucu[]; imlec: string | null }>({ islem: "adAra", onek: ad, imlec: sorgu.imlec ?? null });
    if (!r.ok) return reddet(o, "oyuncuAra", r.hata, ek);
    sonuclar = r.deger.sonuclar.map(satir);
    imlec = r.deger.imlec;
  } else {
    return reddet(o, "oyuncuAra", "gecersiz_istek", ek);
  }
  await o.b.depo.koy(await kayitHazirla(o, "oyuncuAra", "tamam", { ayrinti: { ...ek.ayrinti, bulunan: sonuclar.length } }));
  return basarili({ sonuclar, imlec });
}

async function guvenli<T>(is: (() => Promise<Sonuc<T>>) | undefined): Promise<T | null> {
  if (!is) return null;
  try {
    const r = await is();
    return r.ok ? r.deger : null;
  } catch {
    return null;
  }
}

export async function oyuncuAyrinti(o: Oturum, sorgu: Record<string, string | null>): Promise<Sonuc<unknown>> {
  const hesap = hesapIdCoz(sorgu.hesap);
  const red = await yetkiIste(o, "oyuncuAyrinti", hesap ? { hedef: hesap } : {});
  if (red) return red;
  if (!hesap) return reddet(o, "oyuncuAyrinti", "hesap_yok");
  const bulunan = await o.b.oyuncuBul({ hesap });
  if (!bulunan.ok) return reddet(o, "oyuncuAyrinti", bulunan.hata, { hedef: hesap });
  const profil: Profil = bulunan.deger;
  const ayrintiOku = o.b.ayrintiOku;
  const hesabaIlet = o.b.hesabaIlet;
  const [karakter, hesapOzet, kimlik] = await Promise.all([
    guvenli(ayrintiOku ? () => ayrintiOku(profil.yerlesim, hesap) : undefined),
    guvenli(hesabaIlet ? () => hesabaIlet(hesap, { islem: "yonetimOzet", hesapId: hesap }) : undefined),
    kimlikOzeti(o.b, [hesap]),
  ]);
  const liste = (await o.b.depo.al<Yaptirim[]>(`yaptirim:${hesap}`)) ?? [];
  const yer = yerlesimBul(profil.yerlesim);
  await o.b.depo.koy(await kayitHazirla(o, "oyuncuAyrinti", "tamam", { hedef: hesap }));
  return basarili({
    profil,
    numara: kimlik[hesap]?.numara ?? null,
    yerlesim: yer ? { id: yer.id, ad: yer.ad, tur: yer.tur, beylik: yer.beylik } : null,
    karakter,
    hesap: hesapOzet,
    yaptirim: etkinOzet(liste, o.b.simdi),
    kendi: hesap === o.y.hesap,
  });
}
