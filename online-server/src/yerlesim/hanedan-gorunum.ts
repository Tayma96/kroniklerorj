// Hanedan uç yanıtları (GET /v1/hanedan, durumdaki özet). Sayılar kurallarla aynı fonksiyonlardan gelir;
// kullanılan parametreler de yanıtta döner (gizli sayı yok; yalnız ölüm ayı tasarım gereği gizlidir, son 6 ayı
// "sonGunler" olarak görünür).

import type { Dil } from "../icerik/adlar.ts";
import { DEVIR_SURE_AY, akrabalar, hanedanKimligi, nesil, olduMu, varisAdaylari, varsayilanVaris } from "./hanedan.ts";
import { NAM_DEVIR_ORANI, VERGI_ORANI } from "./devir.ts";
import { DUGUN_BEDELI, EVLILIK_GORUS_ESIGI, EVLILIK_YASI } from "./evlilik.ts";
import { kisiAdi, npcAdi, npcKimlik, yas } from "./ortak.ts";
import type { Karakter, Kasaba, Npc } from "./tipler.ts";
import { vasiyetAlicilari } from "./vasiyet.ts";
import { SON_GUNLER_AY, YASLILIK_YASI, yaslilikTakatTavani } from "./yaslilik.ts";

export function hanedanOzeti(kar: Karakter, ay: number) {
  const oa = kar.hd?.oa;
  return {
    id: hanedanKimligi(kar),
    nesil: nesil(kar),
    olu: olduMu(kar),
    sonGunler: !olduMu(kar) && oa !== undefined && ay >= oa - SON_GUNLER_AY,
  };
}

export function hanedanGorunumu(kasaba: Kasaba, kar: Karakter, ay: number, dil: Dil) {
  const hd = kar.hd;
  const kisi = (n: Npc) => ({ id: npcKimlik(n.i), ad: npcAdi(n, dil), yas: yas(n.d, ay), cinsiyet: n.k ? "kadın" : "erkek" });
  const { cocuklar, kardesler, yegenler } = akrabalar(kasaba, kar);
  const y = yas(kar.d, ay);
  const tavan = yaslilikTakatTavani(y);
  const tereke = kasaba.hd?.tr.find((t) => t.o === kar.o);
  return {
    ...hanedanOzeti(kar, ay),
    es: hd?.es ? { id: hd.es, ad: kisiAdi(kasaba, hd.es, dil) ?? null, oyuncu: hd.es.startsWith("o"), evlilikAyi: hd.ea ?? null } : null,
    cocuklar: cocuklar.map(kisi),
    kardesler: kardesler.map(kisi),
    yegenler: yegenler.map(kisi),
    adaylar: varisAdaylari(kasaba, kar, ay).map((a) => {
      const n = kasaba.dizin.get(a.i)!;
      return { ...kisi(n), yakinlik: a.yakinlik, uygun: a.uygun, ...(a.neden ? { neden: a.neden } : {}) };
    }),
    varsayilanVaris: varsayilanVaris(kasaba, kar, ay),
    vasiyet: hd?.vs ?? null,
    vasiyetAlicilari: olduMu(kar) ? [] : [...vasiyetAlicilari(kasaba, kar)],
    aileMeslegi: hd?.am ?? null,
    atalar: (hd?.at ?? []).map(([o, ad, d, ol]) => ({ id: o, ad, dogumAyi: d, olumAyi: ol, yas: yas(d, ol) })),
    yaslilik: { basladi: y >= YASLILIK_YASI, takatTavani: Number.isFinite(tavan) ? tavan : null },
    tereke: tereke ? { olumAyi: tereke.ol, son: tereke.son, kalanAy: Math.max(0, tereke.son - ay) } : null,
    kasaba: { hazine: kasaba.hd?.hz ?? 0, vakif: kasaba.hd?.vk ?? 0 },
    kurallar: {
      vergiOrani: VERGI_ORANI,
      namDevirOrani: NAM_DEVIR_ORANI,
      devirSureAy: DEVIR_SURE_AY,
      evlilikYasi: EVLILIK_YASI,
      evlilikGorusEsigi: EVLILIK_GORUS_ESIGI,
      dugunBedeli: DUGUN_BEDELI,
      sonGunlerAy: SON_GUNLER_AY,
    },
  };
}
