// Dövüş öncesi yüzleşme (saf): hikâyeli durum + 4 seçenek. Her seçenek stat ve kuşamla hesaplanır,
// sonuç başarı / kısmi / başarısız. Kavga olursa etkisi açılış durumuna işlenir; olmazsa
// game.ts applyYuzlesme kayda geçirir. Klip ve metin anahtarı: yz.<tür>.<seçim>.<sonuç>.
import { GameState, Encounter, YUZLESME_TURU, YuzlesmeTuru, YuzlesmeKapanis, combatPower, armorDefense, weaponClass, hasShield, effStat, yuzlesmeHarac } from "./game";
import type { BattleState } from "./combat";
import { nextRandom } from "./random";

export type YzSecim = "konus" | "saldir" | "gard" | "kac";
export type YzSonuc = "basari" | "kismi" | "basarisiz";
export const YZ_SECIMLER: { id: YzSecim; harf: string; icon: string }[] = [
  { id: "konus", harf: "A", icon: "speaker" },
  { id: "saldir", harf: "B", icon: "crossed-swords" },
  { id: "gard", harf: "C", icon: "shield" },
  { id: "kac", harf: "D", icon: "walk" },
];
export function yzTuru(encId: string): YuzlesmeTuru | null { return YUZLESME_TURU[encId] || null; }

// Kavga olursa açılışa etkisi: rakip canı (azami canın oranı), oyuncu canı, nefes, üstünlük.
export interface YzEtki { dusmanPay?: number; can?: number; nefes?: number; ustunluk?: number; }
export interface YzCozum {
  secim: YzSecim; sonuc: YzSonuc; metin: string; // metin = yz.<tür>.<seçim>.<sonuç>[_yok]
  kavga: boolean; etki?: YzEtki; kapanis?: YuzlesmeKapanis;
}

const sinir = (x: number) => Math.max(0.08, Math.min(0.92, x));
// Başarı ihtimali: konuş = karizma/şöhret/korku (hayvanda zekâ), önce davran = beceri/dayanıklılık/silah,
// gard = zırh/kalkan/dayanıklılık, geri çekil = dayanıklılık/at. Güç farkı ve rakip zorluğu düşürür.
export function yzSans(s: GameState, e: Encounter, secim: YzSecim): number {
  const p = s.player; const tur = yzTuru(e.id) ?? "eskiya";
  const ust = Math.max(-0.2, Math.min(0.2, (combatPower(p) - e.power * 1.6) / 50));
  const zor = Math.max(0, e.power - 6) * 0.015;
  const ch = effStat(p, "charisma"), zk = effStat(p, "intelligence"), dy = effStat(p, "stamina");
  const sk = p.skills?.combat || 0, so = p.skills?.social || 0;
  if (secim === "konus") {
    if (tur === "hayvan") return sinir(0.22 + zk * 0.035 + sk * 0.01 - zor);
    if (tur === "duello") return sinir(0.18 + ch * 0.035 + so * 0.012 + Math.max(0, p.honor) / 300 + p.fame / 400 - zor);
    return sinir(0.2 + ch * 0.03 + so * 0.012 + p.fame / 300 + (p.fear || 0) / 300 - zor);
  }
  if (secim === "saldir") { const wc = weaponClass(p); return sinir(0.32 + sk * 0.012 + dy * 0.015 + (wc === "hizli" || wc === "delici" ? 0.08 : 0) + ust); }
  if (secim === "gard") return sinir(0.34 + armorDefense(p) * 0.01 + (hasShield(p) ? 0.12 : 0) + dy * 0.012 + ust);
  return sinir(0.26 + dy * 0.03 + zk * 0.01 + (p.horse ? 0.22 : 0) - zor - (tur === "hayvan" ? 0.05 : 0));
}
// İhtimalin oyuncuya gösterilen adı (yüzde yerine): iyi / orta / zor / çok zor.
export function yzOran(sans: number): "iyi" | "orta" | "zor" | "cokzor" { return sans >= 0.62 ? "iyi" : sans >= 0.45 ? "orta" : sans >= 0.3 ? "zor" : "cokzor"; }

// Zar dövüşün alt akışından ayrı bir dalla atılır (aynı tohum, farklı tuz) → tekrar denemede sonuç değişmez.
export function yzCoz(s: GameState, e: Encounter, secim: YzSecim, rngState: number): YzCozum {
  const tur = yzTuru(e.id) ?? "eskiya";
  const rng = { rng_state: (rngState ^ 0x5bd1e995) >>> 0 };
  const sans = yzSans(s, e, secim); const r = nextRandom(rng);
  const sonuc: YzSonuc = r < sans ? "basari" : r < sans + (1 - sans) * 0.45 ? "kismi" : "basarisiz";
  const metin = `yz.${tur}.${secim}.${sonuc}`;
  const ilk = Math.round(3 + e.power * 0.5); // rakibin ilk darbesi
  const c = (kavga: boolean, etki?: YzEtki, kapanis?: YuzlesmeKapanis, m = metin): YzCozum => ({ secim, sonuc, metin: m, kavga, etki, kapanis });
  if (secim === "konus") {
    if (sonuc === "basari") return c(false, undefined, "soz");
    if (sonuc === "kismi") {
      if (tur !== "eskiya") return c(true, {});
      return s.player.money >= yuzlesmeHarac(s, e.id) ? c(false, undefined, "harac") : c(true, {}, undefined, metin + "_yok");
    }
    return c(true, { can: -ilk, nefes: -10 });
  }
  if (secim === "saldir") {
    if (sonuc === "basari") return c(true, { dusmanPay: -0.18, ustunluk: 1 });
    if (sonuc === "kismi") return c(true, { dusmanPay: -0.08 });
    return c(true, { can: -ilk, nefes: -15 });
  }
  if (secim === "gard") {
    if (sonuc === "basari") return c(true, { dusmanPay: -0.06, nefes: 20, ustunluk: 1 });
    if (sonuc === "kismi") return c(true, { ustunluk: 1 });
    return c(true, { can: -Math.round(ilk * 0.6), nefes: -10 });
  }
  if (sonuc === "basari") return c(false, undefined, "kac");
  if (sonuc === "kismi") return c(false, undefined, "kac_bedel");
  return c(true, { can: -ilk, nefes: -15 });
}

// Kavgaya dönen yüzleşmenin etkisini açılış durumuna işler; anlatı satırı günlüğün başına eklenir.
export function yzUygula(bs: BattleState, cz: YzCozum): BattleState {
  const n: BattleState = { ...bs, log: [...bs.log, { k: cz.metin }] };
  const k = cz.etki || {};
  if (k.dusmanPay) n.enemyHp = Math.max(1, Math.round(n.enemyHp + n.enemyMax * k.dusmanPay));
  if (k.can) n.playerHp = Math.max(1, n.playerHp + k.can);
  if (k.nefes) { const mx = n.breathMax ?? 100; n.breath = Math.max(0, Math.min(mx, (n.breath ?? mx) + k.nefes)); }
  if (k.ustunluk) n.momentum = Math.min(3, (n.momentum || 0) + k.ustunluk);
  return n;
}
