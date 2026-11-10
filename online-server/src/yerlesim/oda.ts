// Kiralık oda (GDD §18 Kira ve Odanın getirdikleri; Faz 14). Bu fazda yalnız NPC hanlar oda verir: fiyat sabittir,
// akçe dünyadan çıkar (batak, toplam akçe değişmezinde "hancı kirası" çıkışı). Oyuncu hanı Faz 12'de aynı sözleşmeyi
// kullanacak: `HanKaynagi` "oyuncu" türüyle gelir, katalog ve fiyat hancının panelinden, ödeme işletme kasasına
// (transfer protokolü) gider. Şimdilik oyuncu hanı `han_kapali` döner. Kira peşin ve dönemliktir (1, 3, 12 ay);
// süre bitince oda boşalır, borç doğmaz. Saf fonksiyonlar.

import { AY_MS } from "../saat.ts";
import { HAN_DUZENI } from "../han/kurallar.ts";
import type { HanTuru } from "../han/tipler.ts";
import type { YerlesimTuru } from "../dunya-veri.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { HAN_ODA_SEVIYESI } from "../mulk/kurallar.ts";

/**
 * [PARAMETRE] Oda kademeleri: aylık kira (akçe) ve odanın getirdikleri. `kondisyon`: konaklanan her ay dönümünde
 * olağan toparlamaya eklenen kondisyon; `sandik`: eşya yeri (adet; sandık işleyişi sonraki fazda); `ozel`: özel
 * görüşme (yalnız davetliler katılım listesine yazılır; han masasıyla bağlanacak); `adres`: mektup/ilan/ikamet adresi.
 * Başlangıç parası 5, çırağın aylık emeği ~12 akçedir: yatak herkesin harcı, has oda bir statü harcamasıdır.
 */
export const ODALAR = {
  yatak: { aylik: 2, kondisyon: 0, sandik: 0, ozel: false, adres: true },
  oda: { aylik: 4, kondisyon: 5, sandik: 10, ozel: true, adres: true },
  hasOda: { aylik: 9, kondisyon: 10, sandik: 30, ozel: true, adres: true },
} as const satisfies Record<string, OdaNiteligi>;
export type OdaId = keyof typeof ODALAR;

export interface OdaNiteligi {
  aylik: number;
  kondisyon: number;
  sandik: number;
  ozel: boolean;
  adres: boolean;
}

/** [PARAMETRE] NPC han türüne göre verilen odalar (menzilde yalnız ortak yatak). */
export const HAN_ODALARI: Readonly<Record<HanTuru, readonly OdaId[]>> = {
  menzil: ["yatak"],
  kucukHan: ["yatak", "oda"],
  han: ["yatak", "oda", "hasOda"],
};

/** [PARAMETRE] Kira dönemleri (ay) ve peşin indirim oranı. */
export const KIRA_SURELERI = { 1: 0, 3: 0.1, 12: 0.2 } as const;
export type KiraSuresi = 1 | 3 | 12;
/** [PARAMETRE] Peşin ödenebilecek en uzun süre: bitiş şimdiden en çok bu kadar ileride olabilir. */
export const KIRA_EN_UZUN_AY = 12;
/** [PARAMETRE] Saklanan son kira sözleşmesi sayısı (dönüş özetindeki "sona eren rezervasyonlar"). */
export const SOZLESME_EN_COK = 4;

/** Odanın sahibi: bu fazda NPC hancı; Faz 12'de oyuncu işletmesi. Kayıtta "npc:<yerleşim>" / "oyuncu:<işletme>". */
export type HanKaynagi = { tur: "npc"; yerlesim: string } | { tur: "oyuncu"; isletme: string };

export function hanKodu(h: HanKaynagi): string {
  return h.tur === "npc" ? `npc:${h.yerlesim}` : `oyuncu:${h.isletme}`;
}

export function npcHani(yerlesim: string): HanKaynagi {
  return { tur: "npc", yerlesim };
}

/** Kira sözleşmesi (karakterde saklanır): han, oda, [başlangıç, bitiş) ms, ödenen akçe, yerleşim. */
export interface KiraSozlesmesi {
  h: string;
  o: OdaId;
  b: number;
  s: number;
  t: number;
  y: string;
}

export interface OdaTeklifi {
  oda: OdaId;
  aylik: number;
  nitelik: OdaNiteligi;
  fiyatlar: Record<`${KiraSuresi}`, number>;
}

export function odaCoz(v: unknown): OdaId | undefined {
  return typeof v === "string" && Object.hasOwn(ODALAR, v) ? (v as OdaId) : undefined;
}

export function sureCoz(v: unknown): KiraSuresi | undefined {
  return v === 1 || v === 3 || v === 12 ? v : undefined;
}

/** Peşin kira tutarı: aylık × ay × (1 − indirim), yukarı yuvarlanır. */
export function kiraFiyati(aylik: number, sure: KiraSuresi): number {
  return Math.ceil(aylik * sure * (1 - KIRA_SURELERI[sure]) - 1e-9);
}

export function kiraSuresiMs(sure: KiraSuresi): number {
  return sure * AY_MS;
}

/** Oyuncu hanının (Faz 12) panelden gelen katalog girdileri: fiyat çarpanı (%) ve seviye (has oda seviyeyle açılır). */
export interface OyuncuHaniKatalogu {
  fc: number;
  seviye: number;
}

function odaTeklifi(oda: OdaId, carpan: number): OdaTeklifi {
  const n = ODALAR[oda];
  const f = (s: KiraSuresi) => Math.max(1, Math.ceil((kiraFiyati(n.aylik, s) * carpan) / 100 - 1e-9));
  return { oda, aylik: n.aylik, nitelik: { ...n }, fiyatlar: { 1: f(1), 3: f(3), 12: f(12) } };
}

/** Hanın oda kataloğu. NPC han: yerleşim türünün hanı ve sabit fiyat. Oyuncu hanı: seviyeye göre odalar, çarpanlı fiyat. */
export function hanOdalari(han: HanKaynagi, tur: YerlesimTuru, oyuncu?: OyuncuHaniKatalogu): Sonuc<OdaTeklifi[]> {
  if (han.tur !== "npc") {
    if (!oyuncu) return hata("han_kapali");
    return basarili((Object.keys(ODALAR) as OdaId[]).filter((o) => HAN_ODA_SEVIYESI[o] <= oyuncu.seviye).map((o) => odaTeklifi(o, oyuncu.fc)));
  }
  return basarili(HAN_ODALARI[HAN_DUZENI[tur].tur].map((oda) => odaTeklifi(oda, 100)));
}

/** En ucuz oda (otomatik konaklama 1. mod ve dönüş ekranı önerisi). */
export function enUcuzOda(tur: YerlesimTuru): OdaId {
  return [...HAN_ODALARI[HAN_DUZENI[tur].tur]].sort((a, b) => ODALAR[a].aylik - ODALAR[b].aylik)[0]!;
}

/**
 * Kira ödemesi: NPC handa tutarın tamamı dünyadan çıkar (`batak`). Oyuncu hanı Faz 12'de `kasaya` (işletme kasası,
 * transfer protokolüyle) gidecek; şimdilik kapalı. Para yetmezse `para_yok`.
 */
export function kiraOdemesi(han: HanKaynagi, para: number, fiyat: number): Sonuc<{ para: number; batak: number; kasaya: number }> {
  if (!Number.isFinite(para) || para < fiyat) return hata("para_yok");
  // Oyuncu hanı (Faz 12): tutar işletme kasasına gider (çıkış kutusu, src/mulk/transfer.ts); dünyadan çıkmaz.
  if (han.tur !== "npc") return basarili({ para: para - fiyat, batak: 0, kasaya: fiyat });
  return basarili({ para: para - fiyat, batak: fiyat, kasaya: 0 });
}
