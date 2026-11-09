// Ay dönümünün hanedan adımı (Faz 7): donum.ts'in "oyuncular" adımından sonra, kendi tohumuyla çalışır (Faz 2
// dönümünün zar dizisini bozmaz). Sıra: sahipsiz emanet → dul tespiti ve yaşlılık/ölüm → oyuncu hanesinde doğum
// → süresi dolan terekelerin varsayılan devri.

import { varsayilanDevir } from "./devir.ts";
import { dogumDonumu } from "./evlilik.ts";
import { olduMu } from "./hanedan.ts";
import { kisiCoz } from "./ortak.ts";
import { tohumlu } from "./rastgele.ts";
import type { Kasaba, OlayTaslagi } from "./tipler.ts";
import { yaslilikDonumu } from "./yaslilik.ts";

export function hanedanDonumu(kasaba: Kasaba, ay: number): OlayTaslagi[] {
  const r = tohumlu("hanedan", kasaba.y, ay);
  const olaylar: OlayTaslagi[] = [];
  // Ölen NPC'nin emanetteki payı kaybolmaz: hazineye geçer (akçe korunur).
  const hk = kasaba.hd;
  if (hk) {
    for (const [i, akce] of Object.entries(hk.em)) {
      if (kasaba.dizin.has(Number(i))) continue;
      hk.hz += akce;
      delete hk.em[i];
    }
  }
  for (const s of kasaba.sakin) {
    const kar = kasaba.kar.get(s.o);
    if (!kar || olduMu(kar)) continue;
    const es = kar.hd?.es ? kisiCoz(kar.hd.es) : undefined;
    if (es?.tur === "npc" && !kasaba.dizin.has(es.i)) delete kar.hd!.es; // eş öldü: dul (olay donum'da)
    olaylar.push(...yaslilikDonumu(kasaba, kar, ay));
  }
  olaylar.push(...dogumDonumu(kasaba, ay, r));
  const dolan = (kasaba.hd?.tr ?? []).filter((t) => ay >= t.son).map((t) => t.o);
  for (const o of dolan) olaylar.push(...varsayilanDevir(kasaba, o, ay));
  return olaylar;
}
