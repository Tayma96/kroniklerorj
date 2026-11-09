// Söylenti (temel, Faz 3a): eylemi tanıklar görür; haber ay dönümünde NPC dostluk ağı üzerinden yayılır, her
// sekmede ve her ay güveni söner, eşiğin altına inen unutur. Olay başına bilen sayısı ve aylık yayılım sınırlıdır.
// Bilen NPC'nin konu oyuncuya bakışına "gorus.soylenti" kalemi olarak (güvenle orantılı, tavanlı) yansır; eylemin
// muhatabı NPC olayı zaten bildiğinden söylenti onu etkilemez. Oyuncu kendisi hakkındaki söylentiyi bir kez
// yalanlayabilir (bütün bilenlerde güven yarıya iner). Kışkırtma ve casusluk Faz 4'tedir.

import { basarili, hata, type Sonuc } from "../tipler.ts";
import { npcMekani } from "./cizelge.ts";
import { npcKimlik, npcAdi, kisiAdi, yas } from "./ortak.ts";
import { karma, tohumlu } from "./rastgele.ts";
import { toplumAl, type Soylenti, type SoylentiTuru } from "./toplum.ts";
import type { Karakter, Kasaba } from "./tipler.ts";
import type { Dil } from "../icerik/adlar.ts";

/** [PARAMETRE] Söylentinin bilen NPC'nin konu oyuncuya bakışına tam güvendeki etkisi. */
export const SOYLENTI_YUK: Readonly<Record<SoylentiTuru, number>> = {
  hediye: 4,
  yardim: 3,
  hediyeOyuncu: 2,
  husumet: -3,
  borcOdenmedi: -6,
  kalfaYetistirdi: 5,
};
/** [PARAMETRE] Tanık modeli ve yayılım. */
export const TANIK_EN_COK = 3;
export const ILK_GUVEN = 80;
export const YAYILMA_ORANI = 0.5;
/** Her sekmede güven bu oranla çarpılır; her ay bütün bilenlerde ayrıca söner. */
export const SEKME_SONMESI = 0.6;
export const AYLIK_SONME = 0.85;
/** Bu güvenin altında söylenti unutulur (ve yaymaz). */
export const GUVEN_ESIGI = 10;
export const YAYILIM_AYLIK = 8;
export const BILEN_EN_COK = 30;
/** Söylenti bu kadar ay yayılır; iki katı dolunca defterden düşer. */
export const SOYLENTI_OMUR = 6;
export const SOYLENTI_EN_COK = 60;
/** Bir NPC'nin bir oyuncuya bakışına bütün söylentilerin toplam etkisi en çok ± bu kadar. */
export const SOYLENTI_GORUS_TAVANI = 8;
export const YALANLAMA_ORANI = 0.5;
export const TANIK_YASI = 14;

/** Bu ay `mekan`da bulunan NPC'lerden en çok TANIK_EN_COK tanık (deterministik sıra; `haric` dışarıda). */
export function mekanTaniklari(k: Kasaba, mekan: string, haric: readonly number[], ay: number, tohum: string): number[] {
  const aday: number[] = [];
  for (const n of k.npc) {
    if (haric.includes(n.i) || yas(n.d, ay) < TANIK_YASI) continue;
    if (npcMekani(k, n, ay) === mekan) aday.push(n.i);
  }
  return aday.sort((x, y) => karma(tohum, x) - karma(tohum, y)).slice(0, TANIK_EN_COK);
}

/** Hanelerin yetişkin üyelerinden tanıklar (oyuncular arası eylemler evde konuşulur). */
export function haneTaniklari(k: Kasaba, haneler: readonly number[], ay: number, tohum: string): number[] {
  const aday = k.npc.filter((n) => n.e !== 0 && haneler.includes(n.e) && yas(n.d, ay) >= TANIK_YASI).map((n) => n.i);
  return aday.sort((x, y) => karma(tohum, x) - karma(tohum, y)).slice(0, TANIK_EN_COK);
}

/**
 * Söylenti ekler. Aynı konu, tür ve hedef için yayılan bir söylenti varsa yenisi açılmaz, tanıklar ona eklenir
 * (olay başına sınır; tekrar azalan getiriyle aynı haber olur). Tanık yoksa söylenti doğmaz.
 */
export function soylentiEkle(k: Kasaba, t: SoylentiTuru, konu: string, hedef: string, taniklar: readonly number[], ay: number): Soylenti | undefined {
  const hedefNpc = hedef.startsWith("n") ? hedef.slice(1) : "";
  const tanik = taniklar.map(String).filter((x) => x !== hedefNpc && k.dizin.has(Number(x)));
  if (tanik.length === 0) return undefined;
  const tp = toplumAl(k);
  const var_ = tp.sy.find((s) => s.t === t && s.k === konu && s.h === hedef && !s.y && ay - s.a < SOYLENTI_OMUR);
  if (var_) {
    for (const x of tanik) {
      if (Object.keys(var_.b).length >= BILEN_EN_COK && !(x in var_.b)) break;
      var_.b[x] = Math.max(var_.b[x] ?? 0, ILK_GUVEN);
    }
    return var_;
  }
  const s: Soylenti = { i: tp.sn++, t, k: konu, h: hedef, a: ay, b: Object.fromEntries(tanik.map((x) => [x, ILK_GUVEN])) };
  tp.sy.push(s);
  if (tp.sy.length > SOYLENTI_EN_COK) tp.sy.splice(0, tp.sy.length - SOYLENTI_EN_COK);
  return s;
}

/** Ay dönümü: önce eski bilenlerde aylık sönme, sonra dostluk bağlarıyla yayılım; ölü NPC ve eski söylenti düşer. */
export function soylentiYay(k: Kasaba, ay: number): void {
  const tp = k.tp;
  if (!tp || tp.sy.length === 0) return;
  tp.sy = tp.sy.filter((s) => ay - s.a < SOYLENTI_OMUR * 2);
  for (const s of tp.sy) {
    for (const [x, g] of Object.entries(s.b)) {
      const yeni = Math.floor(g * AYLIK_SONME);
      if (!k.dizin.has(Number(x)) || yeni < GUVEN_ESIGI) delete s.b[x];
      else s.b[x] = yeni;
    }
    if (ay - s.a >= SOYLENTI_OMUR || s.y) continue;
    const r = tohumlu("soylenti", k.y, ay, s.i);
    const hedefNpc = s.h.startsWith("n") ? Number(s.h.slice(1)) : 0;
    let eklenen = 0;
    const bilenler = Object.entries(s.b).sort((p, q) => q[1] - p[1] || Number(p[0]) - Number(q[0]));
    for (const [x, g] of bilenler) {
      const n = k.dizin.get(Number(x));
      if (!n) continue;
      const aktarilan = Math.floor(g * SEKME_SONMESI);
      if (aktarilan < GUVEN_ESIGI) continue;
      for (const bag of n.b) {
        if (eklenen >= YAYILIM_AYLIK || Object.keys(s.b).length >= BILEN_EN_COK) break;
        if (bag[1] !== 1 || bag[0] === hedefNpc || String(bag[0]) in s.b || !k.dizin.has(bag[0])) continue;
        if (r() < YAYILMA_ORANI) {
          s.b[String(bag[0])] = aktarilan;
          eklenen++;
        }
      }
    }
  }
  tp.sy = tp.sy.filter((s) => Object.keys(s.b).length > 0);
}

/** NPC'nin konu oyuncu hakkında bildiği söylentilerin bakışa etkisi (tavanlı). */
export function soylentiEtkisi(k: Kasaba, npcI: number, konu: string): number {
  const sy = k.tp?.sy;
  if (!sy || sy.length === 0) return 0;
  const x = String(npcI);
  let toplam = 0;
  for (const s of sy) {
    if (s.k !== konu) continue;
    const g = s.b[x];
    if (g) toplam += (SOYLENTI_YUK[s.t] * g) / 100;
  }
  const d = Math.round(toplam);
  return d > SOYLENTI_GORUS_TAVANI ? SOYLENTI_GORUS_TAVANI : d < -SOYLENTI_GORUS_TAVANI ? -SOYLENTI_GORUS_TAVANI : d;
}

/** Oyuncu kendisi hakkındaki söylentiyi yalanlar (tek sefer): güven yarıya iner, yayılım durur. */
export function yalanla(k: Kasaba, kar: Karakter, idHam: unknown): Sonuc<Soylenti> {
  const id = typeof idHam === "string" && /^s[1-9][0-9]{0,8}$/.test(idHam) ? Number(idHam.slice(1)) : undefined;
  const s = id === undefined ? undefined : k.tp?.sy.find((x) => x.i === id);
  if (!s || s.k !== kar.o) return hata("soylenti_yok");
  if (s.y) return hata("soylenti_yok");
  s.y = 1;
  for (const [x, g] of Object.entries(s.b)) {
    const yeni = Math.floor(g * YALANLAMA_ORANI);
    if (yeni < GUVEN_ESIGI) delete s.b[x];
    else s.b[x] = yeni;
  }
  return basarili(s);
}

/** Oyuncunun kendisi hakkındaki söylentiler: kaç NPC biliyor ve ortalama güven (kimin bildiği gizlidir, §13.9). */
export function soylentiGorunumu(k: Kasaba, kar: Karakter, dil: Dil) {
  const sonuc = [];
  for (const s of k.tp?.sy ?? []) {
    if (s.k !== kar.o) continue;
    const g = Object.values(s.b);
    const hn = s.h.startsWith("n") ? k.dizin.get(Number(s.h.slice(1))) : undefined;
    sonuc.push({
      id: `s${s.i}`,
      tur: s.t,
      hedef: s.h ? { id: s.h, ad: hn ? npcAdi(hn, dil) : (kisiAdi(k, s.h, dil) ?? null) } : null,
      ay: s.a,
      bilen: g.length,
      guven: g.length ? Math.round(g.reduce((a, b) => a + b, 0) / g.length) : 0,
      etki: SOYLENTI_YUK[s.t],
      yalanlandi: s.y === 1,
      yayiliyor: !s.y && k.ay - s.a < SOYLENTI_OMUR,
    });
  }
  return sonuc.sort((a, b) => b.ay - a.ay);
}

export { npcKimlik };
