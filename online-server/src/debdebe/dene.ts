// "Dene" önizlemesi (GDD §19 sunum kuralları): satın almadan önce ürün üç bağlamda simüle edilir — han masası
// (plaka, giyim, balon, masa süsü), şehir kapısı (giriş anonsu, binek, sancak) ve profil kartı. Canlı masada yapılmaz;
// gerçek oyuncu göstermez: kalabalık etkisi için deterministik NPC figüranlar konur. Ücretsiz ve sınırsızdır.
// Yalnız veri döner (sahne düzenini istemci çizer). Saf fonksiyon.

import { AD_HAVUZLARI, type Dil } from "../icerik/adlar.ts";
import { dizinSec, tohumlu } from "../yerlesim/rastgele.ts";
import { urun, type UrunId, type Yuva } from "./katalog.ts";

export const DENE_SAHNELERI = ["hanMasasi", "sehirKapisi", "profilKarti"] as const;
export type DeneSahnesi = (typeof DENE_SAHNELERI)[number];

/** Hangi yuva hangi sahnede görünür. */
export const SAHNE_YUVALARI: Readonly<Record<DeneSahnesi, readonly Yuva[]>> = {
  hanMasasi: ["cerceve", "balon", "masaSusu", "kaftan", "baslik", "nisan", "afis", "hanSusu"],
  sehirKapisi: ["anons", "binek", "sancak", "kaftan", "baslik", "arma"],
  profilKarti: ["cerceve", "kaftan", "baslik", "nisan", "muhur", "arma"],
};
/** [PARAMETRE] Sahne başına figüran sayısı. */
export const FIGURAN_SAYISI = 5;

function figuranlar(sahne: DeneSahnesi, id: string, dil: Dil) {
  const r = tohumlu("dene", sahne, id);
  const h = AD_HAVUZLARI[dil];
  return Array.from({ length: FIGURAN_SAYISI }, (_, i) => {
    const kadin = r() < 0.5;
    const adlar = kadin ? h.f : h.m;
    return { id: `f${i + 1}`, figuran: true, ad: adlar[dizinSec(adlar.length, r)]!, kadin };
  });
}

/**
 * Önizleme paketi: oyuncunun şu anki kuşanılmışlarının üstüne denenen ürün konur. Armağan önizlemesinde alan bir
 * figürandır; kısaltma, Ayan ve sezon izi için sahne yerine kısa açıklama anahtarı döner.
 */
export function denePaketi(id: UrunId, ad: string, kusanilan: Partial<Record<Yuva, UrunId[]>>, dil: Dil) {
  const u = urun(id);
  const sahneler = DENE_SAHNELERI.flatMap((sahne) => {
    const goster = u.yuva ? SAHNE_YUVALARI[sahne].includes(u.yuva) : u.tur === "armagan" && sahne === "hanMasasi";
    if (!goster) return [];
    const ust: Partial<Record<Yuva, UrunId>> = {};
    for (const y of SAHNE_YUVALARI[sahne]) {
      const k = kusanilan[y]?.[0];
      if (k) ust[y] = k;
    }
    if (u.yuva) ust[u.yuva] = id;
    const f = figuranlar(sahne, id, dil);
    return [
      {
        sahne,
        ben: { ad, kusanilan: ust },
        figuranlar: f,
        ...(u.tur === "armagan" ? { armagan: { urun: id, alan: f[0]!.id, anons: { k: "debdebe.anons.armagan", p: { urun: id } } } } : {}),
        ...(u.yuva === "anons" ? { anons: { k: `debdebe.anons.${id}`, p: { ad } } } : {}),
      },
    ];
  });
  return {
    urun: id,
    tur: u.tur,
    gercekOyuncuYok: true,
    sahneler,
    ...(sahneler.length === 0 ? { aciklama: { k: `debdebe.aciklama.${u.tur}`, p: { urun: id } } } : {}),
  };
}
