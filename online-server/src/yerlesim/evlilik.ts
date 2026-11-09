// Evlilik ve oyuncu hanesinde doğum (Faz 7, OYNANIS_TASARIMI §3, §8). 16+ yaş, iki taraf da bekâr ve canlı,
// akraba değil, karşı cins. NPC ile evlilik: NPC'nin sana bakışı eşiği geçerse kabul eder (döküm /v1/kisi'de
// görünür), düğün bedeli kasaba hazinesine gider. Oyuncu–oyuncu evliliği Faz 3 görücü teklifiyle kurulur: iki
// tarafın kabulünden sonra evlilikKapisi + evlilikKaydet çağrılır (arayüz hazır, uç Faz 3'te).
// Eş ölünce dul kalınır, yeniden evlenmek serbesttir. Boşanma kapsam dışı (açık karar).

import { MESLEKLER } from "../icerik/kisilik.ts";
import { basarili, hata, type HataKodu, type Sonuc } from "../tipler.ts";
import { akrabalik, gorus } from "./gorus.ts";
import { akrabalar, hanedanKaydi, hanedanKasabasi, hanedanSoyadi, olduMu, oyuncuEsKodu } from "./hanedan.ts";
import { karakterYasi, takatHarca, takatTazele } from "./karakter.ts";
import { kronikEkle } from "./kronik.ts";
import { kisiCoz, npcAdi, npcKimlik, npcRef, oyuncuRef, yas } from "./ortak.ts";
import type { Zar } from "./rastgele.ts";
import type { Dokum, IliskiHaritasi, Karakter, Kasaba, KisiRef, Npc, OlayTaslagi } from "./tipler.ts";
import { kasabadaUret, meslekSec, npcEkle } from "./uret.ts";

/** [PARAMETRE] Evlilik yaşı, NPC eşle en çok yaş farkı, NPC'nin kabul eşiği (görüş), düğün bedeli ve takatı. */
export const EVLILIK_YASI = 16;
export const EVLILIK_YAS_FARKI = 12;
export const EVLILIK_GORUS_ESIGI = 40;
export const DUGUN_BEDELI = 10;
export const EVLILIK_TAKAT = 2;
/** [PARAMETRE] Evli oyuncu hanesinde aylık doğum olasılığı, annenin doğurganlık yaşları, hane başına en çok çocuk. */
export const OYUNCU_DOGUM_ORANI = 0.02;
export const DOGUM_YAS_ALT = 17;
export const DOGUM_YAS_UST = 44;
export const OYUNCU_COCUK_EN_COK = 5;

export type Taraf = { tur: "npc"; n: Npc } | { tur: "oyuncu"; k: Karakter };

export function tarafCoz(kasaba: Kasaba, id: unknown): Taraf | undefined {
  const ki = kisiCoz(id);
  if (ki?.tur === "npc") {
    const n = kasaba.dizin.get(ki.i);
    return n ? { tur: "npc", n } : undefined;
  }
  const k = ki ? kasaba.kar.get(ki.o) : undefined;
  return k && kasaba.sakin.some((s) => s.o === k.o) ? { tur: "oyuncu", k } : undefined;
}

const tarafKimlik = (t: Taraf): string => (t.tur === "npc" ? npcKimlik(t.n.i) : t.k.o);
const tarafRef = (t: Taraf): KisiRef => (t.tur === "npc" ? npcRef(t.n) : oyuncuRef(t.k));

/** NPC oyuncunun yakın akrabası mı (anne, baba, kardeş, büyük ebeveyn, çocuk, yeğen, hanedan akrabası)? */
function akrabaMi(kasaba: Kasaba, kar: Karakter, n: Npc): boolean {
  const rol = akrabalik(kasaba, n, kar);
  if (rol && rol !== "hane") return true;
  if (n.oe?.includes(kar.o)) return true;
  const { cocuklar, kardesler, yegenler } = akrabalar(kasaba, kar);
  return [...cocuklar, ...kardesler, ...yegenler].some((x) => x.i === n.i);
}

export function evlilikKapisi(kasaba: Kasaba, a: Karakter, bId: unknown, ay: number): HataKodu | undefined {
  if (olduMu(a)) return "olu";
  if (karakterYasi(a, ay) < EVLILIK_YASI) return "yas_kapisi";
  if (a.hd?.es) return "evli";
  const b = tarafCoz(kasaba, bId);
  if (!b) return "kisi_yok";
  if (b.tur === "oyuncu") {
    if (b.k.o === a.o) return "hedef_uygun_degil";
    if (olduMu(b.k)) return "olu";
    if (karakterYasi(b.k, ay) < EVLILIK_YASI) return "yas_kapisi";
    if (b.k.hd?.es) return "evli";
    if (b.k.k === a.k) return "hedef_uygun_degil";
    if ((a.an && a.an === b.k.an) || (a.ba && a.ba === b.k.ba) || (a.hd && a.hd.h === b.k.hd?.h)) return "akraba_evlilik";
    return undefined;
  }
  const n = b.n;
  if (yas(n.d, ay) < EVLILIK_YASI) return "yas_kapisi";
  if (n.es !== 0) return "evli";
  if (n.k === a.k || Math.abs(yas(n.d, ay) - karakterYasi(a, ay)) > EVLILIK_YAS_FARKI) return "hedef_uygun_degil";
  if (akrabaMi(kasaba, a, n)) return "akraba_evlilik";
  return undefined;
}

/** Evliliği yazar (kapı önceden geçmiş olmalı). NPC eş oyuncunun hanesine taşınır. Olay ve kronik satırı. */
export function evlilikKaydet(kasaba: Kasaba, a: Karakter, bId: string, ay: number): OlayTaslagi {
  const b = tarafCoz(kasaba, bId)!;
  const hd = hanedanKaydi(kasaba, a);
  hd.es = tarafKimlik(b);
  hd.ea = ay;
  if (b.tur === "npc") {
    b.n.es = oyuncuEsKodu(a.o);
    b.n.e = a.e;
    b.n.g = 0;
  } else {
    const bh = hanedanKaydi(kasaba, b.k);
    bh.es = a.o;
    bh.ea = ay;
  }
  const p = { a: oyuncuRef(a), b: tarafRef(b) };
  kronikEkle(kasaba, { a: ay, t: "evlilik", k: "kronik.evlilik", p });
  return { t: "hanedan", w: a.o, h: hd.es, g: "", n: 8, k: "olay.oyuncuEvlendi", p };
}

/** POST /v1/evlilik {hedef}: NPC'ye evlilik teklifi. Görüş eşiği geçmezse `gorus_yetersiz` (bedel alınmaz). */
export function npcEvlilikTeklifi(
  kasaba: Kasaba,
  kar: Karakter,
  ili: IliskiHaritasi,
  hedef: unknown,
  ay: number,
): Sonuc<{ sonuc: Record<string, unknown>; olay: OlayTaslagi }> {
  const b = tarafCoz(kasaba, hedef);
  if (b?.tur === "oyuncu") return hata("hedef_uygun_degil"); // oyuncu–oyuncu: Faz 3 görücü teklifi
  const engel = evlilikKapisi(kasaba, kar, hedef, ay);
  if (engel) return hata(engel);
  const n = (b as { n: Npc }).n;
  const bakis: Dokum = gorus(kasaba, n, kar, ili, ay);
  if (bakis.toplam < EVLILIK_GORUS_ESIGI) return hata("gorus_yetersiz");
  if (kar.pa < DUGUN_BEDELI) return hata("para_yok");
  takatTazele(kar, ay);
  if (!takatHarca(kar, ay, EVLILIK_TAKAT)) return hata("takat_yok");
  kar.pa -= DUGUN_BEDELI;
  hanedanKasabasi(kasaba).hz += DUGUN_BEDELI;
  const olay = evlilikKaydet(kasaba, kar, npcKimlik(n.i), ay);
  return basarili({
    sonuc: {
      es: { id: npcKimlik(n.i), ad: npcAdi(n, "tr") },
      gorus: bakis,
      esik: EVLILIK_GORUS_ESIGI,
      bedel: DUGUN_BEDELI,
      takat: EVLILIK_TAKAT,
    },
    olay,
  });
}

/**
 * Oyuncu hanesinde doğum: ebeveynlerden biri ya da ikisi oyuncu. Çocuk NPC'dir (babanın soyadı, hanesi;
 * yarı yarıya NPC babanın mesleği); `oe` oyuncu ebeveynleri, oyuncuların `co` listesi çocuğu tutar.
 */
export function oyuncuCocuguDogur(kasaba: Kasaba, anne: Taraf, baba: Taraf, ay: number, r: Zar): Npc {
  const soyad = baba.tur === "npc" ? baba.n.s : hanedanSoyadi(kasaba, baba.k);
  const e = baba.tur === "npc" ? baba.n.e : baba.k.e;
  const c = kasabadaUret(kasaba, ay, (b) => npcEkle(b, r, r() < 0.5 ? 1 : 0, 0, soyad, e));
  c.d = ay;
  c.an = anne.tur === "npc" ? anne.n.i : 0;
  c.ba = baba.tur === "npc" ? baba.n.i : 0;
  c.oe = [anne, baba].filter((t): t is { tur: "oyuncu"; k: Karakter } => t.tur === "oyuncu").map((t) => t.k.o);
  c.m = baba.tur === "npc" && r() < 0.5 ? baba.n.m : meslekSec(kasaba.tur, r);
  for (const t of [anne, baba]) if (t.tur === "oyuncu") (hanedanKaydi(kasaba, t.k).co ??= []).push(c.i);
  return c;
}

/** Ay dönümünde evli oyuncu haneleri (her çift bir kez, kadın taraftan bakılarak). */
export function dogumDonumu(kasaba: Kasaba, ay: number, r: Zar): OlayTaslagi[] {
  const olaylar: OlayTaslagi[] = [];
  for (const s of kasaba.sakin) {
    const kar = kasaba.kar.get(s.o);
    if (!kar?.hd?.es || olduMu(kar)) continue;
    const es = tarafCoz(kasaba, kar.hd.es);
    if (!es) continue;
    let anne: Taraf;
    let baba: Taraf;
    if (kar.k === 1) [anne, baba] = [{ tur: "oyuncu", k: kar }, es];
    else if (es.tur === "npc") [anne, baba] = [es, { tur: "oyuncu", k: kar }];
    else continue; // oyuncu–oyuncu çiftinde kadın taraf işler
    const anneYas = anne.tur === "npc" ? yas(anne.n.d, ay) : karakterYasi(anne.k, ay);
    if (anneYas < DOGUM_YAS_ALT || anneYas > DOGUM_YAS_UST) continue;
    if ((kar.hd.co?.length ?? 0) >= OYUNCU_COCUK_EN_COK) continue;
    if (r() >= OYUNCU_DOGUM_ORANI) continue;
    const c = oyuncuCocuguDogur(kasaba, anne, baba, ay, r);
    const p = { anne: tarafRef(anne), baba: tarafRef(baba), cocuk: npcRef(c), meslek: MESLEKLER[c.m] ?? "" };
    kronikEkle(kasaba, { a: ay, t: "dogum", k: "kronik.dogum", p });
    olaylar.push({ t: "hanedan", w: npcKimlik(c.i), h: kar.o, g: "", n: 8, k: "olay.oyuncuDogum", p });
  }
  return olaylar;
}
