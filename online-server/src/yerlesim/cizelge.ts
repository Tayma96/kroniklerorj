// Bu ay kim nerede. Her NPC ay boyunca tek bir mekândadır: yaş, meslek, huy, cinsiyet, mevsim ve gündem
// ağırlığı belirler, tohumlu rastgelelik (yerleşim + ay + kişi) seçer. Oyuncu eylemle gittiği mekânda görünür.
// Saklanmaz: her istekte yeniden hesaplanır (400 NPC için birkaç yüz mikro saniye).

import type { YerlesimTuru } from "../dunya-veri.ts";
import { HUYLAR, MESLEKLER } from "../icerik/kisilik.ts";
import { takvim } from "../saat.ts";
import { npcAdi, npcKimlik, yas } from "./ortak.ts";
import type { Dil } from "../icerik/adlar.ts";
import { agirlikliSec, tohumlu } from "./rastgele.ts";
import { GUNDEM, type Kasaba, type Npc } from "./tipler.ts";

/** Ortak mekânlar; köyde değirmen, kasaba ve şehirde mektep eklenir. Taban dağılım tek oyunculudakiyle aynı. */
export const ORTAK_MEKANLAR = ["carsi", "cami", "kahvehane", "meydan", "han"] as const;
const TABAN = [36, 17, 13, 29, 6];

export function mekanlar(tur: YerlesimTuru): string[] {
  return [...ORTAK_MEKANLAR, tur === "koy" ? "degirmen" : "mektep"];
}

/** Mektep dersi nerede: kasaba/şehirde mektepte, köyde camide (imamdan). */
export function mektepMekani(tur: YerlesimTuru): string {
  return tur === "koy" ? "cami" : "mektep";
}

const M = (ad: string) => MESLEKLER.indexOf(ad);
const H = (ad: string) => HUYLAR.indexOf(ad);
const MESLEK_CARPANI: ReadonlyMap<number, readonly number[]> = new Map([
  // carsi, cami, kahvehane, meydan, han, (degirmen|mektep)
  [M("tüccar"), [2.2, 1, 1, 0.8, 2.5, 0]],
  [M("fırıncı"), [2, 1, 0.8, 0.8, 0.5, 0]],
  [M("demirci"), [1.8, 1, 1, 0.8, 0.6, 0]],
  [M("çiftçi"), [0.8, 1, 1, 1.4, 0.3, 1]],
  [M("çoban"), [0.5, 1, 1, 1.6, 0.3, 0.5]],
  [M("müzisyen"), [0.8, 0.6, 3, 1.2, 1.2, 0]],
  [M("asker"), [0.8, 1, 1.2, 2, 1.5, 0]],
  [M("şifacı"), [1.4, 1.5, 0.6, 1, 0.6, 0]],
]);

/** NPC'nin bu ayki mekânı; 6 yaşından küçükler evdedir (undefined). */
export function npcMekani(kasaba: Kasaba, npc: Npc, ay: number, agirlik: number[] = []): string | undefined {
  const y = yas(npc.d, ay);
  if (y < 6) return undefined;
  const yerler = mekanlar(kasaba.tur);
  const mevsim = takvim(ay).mevsim;
  for (let i = 0; i < 5; i++) agirlik[i] = TABAN[i] ?? 0;
  const koy = kasaba.tur === "koy";
  // Değirmen köyde çiftçinin, mektep kasabada çocuğun yeridir.
  agirlik[5] = koy ? 4 : y < 14 ? 30 : 2;
  if (y < 14) {
    agirlik[2] = 0;
    agirlik[4] = 0;
    agirlik[3] = (agirlik[3] ?? 0) * 2;
  } else {
    const c = MESLEK_CARPANI.get(npc.m);
    if (c) for (let i = 0; i < 6; i++) agirlik[i] = (agirlik[i] ?? 0) * (c[i] ?? 1);
    if (!koy) agirlik[5] = (agirlik[5] ?? 0) * (npc.m === M("çiftçi") ? 0.2 : 1);
  }
  if (npc.k) {
    agirlik[2] = 0;
    agirlik[4] = (agirlik[4] ?? 0) * 0.3;
  }
  if (npc.h === H("dindar")) agirlik[1] = (agirlik[1] ?? 0) * 3;
  if (npc.h === H("neşeli")) agirlik[2] = (agirlik[2] ?? 0) * 1.5;
  if (npc.h === H("yalnız") || npc.h === H("utangaç")) agirlik[2] = (agirlik[2] ?? 0) * 0.4;
  if (mevsim === "kis") {
    agirlik[2] = (agirlik[2] ?? 0) * 1.5;
    agirlik[3] = (agirlik[3] ?? 0) * 0.6;
  } else if (mevsim === "yaz") agirlik[3] = (agirlik[3] ?? 0) * 1.3;
  if (npc.g === GUNDEM.gecim) agirlik[0] = (agirlik[0] ?? 0) * 1.5;
  else if (npc.g === GUNDEM.evlilik) agirlik[3] = (agirlik[3] ?? 0) * 1.3;
  else if (npc.g === GUNDEM.dostluk) agirlik[2] = (agirlik[2] ?? 0) * 1.5;
  const i = agirlikliSec(agirlik, tohumlu("mekan", kasaba.y, ay, npc.i));
  return yerler[i < 0 ? 0 : i];
}

export interface HaritaKisisi {
  id: string;
  ad: string;
  oyuncu?: true;
}
export interface HaritaMekani {
  id: string;
  kisiler: HaritaKisisi[];
}

/** Mahalle haritası: her mekânda bu ay kim var (NPC'ler ve bu ay eylemle oraya gitmiş oyuncular). */
export function harita(kasaba: Kasaba, ay: number, dil: Dil): HaritaMekani[] {
  const yerler = mekanlar(kasaba.tur).map((id) => ({ id, kisiler: [] as HaritaKisisi[] }));
  const dizin = new Map(yerler.map((y) => [y.id, y]));
  const agirlik: number[] = [];
  for (const n of kasaba.npc) {
    const m = npcMekani(kasaba, n, ay, agirlik);
    if (m) dizin.get(m)?.kisiler.push({ id: npcKimlik(n.i), ad: npcAdi(n, dil) });
  }
  for (const s of kasaba.sakin) {
    if (s.ma === ay && s.mk) dizin.get(s.mk)?.kisiler.push({ id: s.o, ad: s.ad, oyuncu: true });
  }
  return yerler;
}
