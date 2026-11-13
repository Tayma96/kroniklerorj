// Oyuncular arası ay dönümü (Faz 3a). Sıra sabittir: teklif süreleri ve süren anlaşmalar (varsayılanlar, çıraklık,
// ortaklık, borç tahsilatı) → dostluk isteklerinin düşmesi → söylenti yayılımı → yeni NPC teklifleri.
// Bütün sakinlerin karakteri yüklü olmalıdır (motor yetiştirmede yükler).

import { iliskiDonumu } from "./iliski.ts";
import { npcTeklifUret } from "./npc-teklif.ts";
import { soylentiYay } from "./soylenti.ts";
import { teklifDonumu } from "./teklif.ts";
import { oyuncuArabuluculukDonumu } from "./arabuluculuk-oyuncu.ts";
import type { Kasaba, OlayTaslagi } from "./tipler.ts";

export function toplumDonumu(k: Kasaba, ay: number): OlayTaslagi[] {
  const olaylar = teklifDonumu(k, ay);
  // Oyuncu arabuluculuğunda cevapsız kalan davetler sessizce ve cezasız kapanır.
  oyuncuArabuluculukDonumu(k, ay);
  iliskiDonumu(k, ay);
  soylentiYay(k, ay);
  olaylar.push(...npcTeklifUret(k, ay));
  return olaylar;
}
