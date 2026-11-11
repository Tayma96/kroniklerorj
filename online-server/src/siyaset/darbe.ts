// Darbe hazırlığı ve taahhüt eşiği (Ek B §8.2, P5 ilk dilim).
// Gizli hazırlık izleri yalnız plan katılımcılarına görünür; ilan sonrası bölgeye yayınlanır.

import { DARBE } from "./sabitler.ts";
import type { DarbeDestekRolu, BolgeDurumu, SiyasiKimlik } from "./tipler.ts";
import { kumeAnahtarlari, kumeKesisir } from "./makam.ts";
import type { HataKodu } from "../tipler.ts";

const ACIK = ["hazirlik", "ilan", "catışma"];

export function darbeHazirla(d: BolgeDurumu, kimlik: SiyasiKimlik, ay: number): HataKodu | null {
  const eski = d.darbe;
  if (eski && ACIK.includes(eski.durum)) return "darbe_var";
  if (eski && ay < eski.sogumaSonAy) return "darbe_soguma";
  d.darbe = {
    v: 1, id: d.id + ":darbe:" + ay + ":" + d.kn, durum: "hazirlik",
    baslatanKisi: kimlik.kisi, baslatanHesap: kimlik.hesap,
    acilisAy: ay, sogumaSonAy: ay, destekler: [],
    garnizonSadakati: DARBE.garnizonBaslangic, yatirilan: 0,
    izler: [{ ay, tur: "hazirlik", guvenilirlik: 100, gorunurluk: "vali" }],
  };
  return null;
}

export function darbeDestekle(d: BolgeDurumu, kimlik: SiyasiKimlik, koltuk: string, rol: DarbeDestekRolu, ay: number): HataKodu | null {
  const p = d.darbe;
  if (!p || p.durum !== "hazirlik") return "darbe_yok";
  const kume = kumeAnahtarlari(kimlik);
  if (p.destekler.some((x) => x.hesap === kimlik.hesap || kumeKesisir(x.kume, kume))) return "kume_cakisma";
  p.destekler.push({ kisi: kimlik.kisi, hesap: kimlik.hesap, koltuk, rol, kume, ay });
  p.izler.push({ ay, tur: "destek", guvenilirlik: 85, gorunurluk: "ileriGelen" });
  return null;
}

export function darbeSadakatYatir(d: BolgeDurumu, tutar: number, ay: number): HataKodu | null {
  const p = d.darbe;
  if (!p || p.durum !== "hazirlik") return "darbe_yok";
  if (!Number.isInteger(tutar) || tutar < DARBE.yatirimEnAz || tutar > DARBE.yatirimEnCok || tutar % DARBE.yatirimBirim !== 0) return "deger_sinir_disi";
  if (d.kasa - tutar < DARBE.hazineRezerv) return "kasa_yetersiz";
  if (p.garnizonSadakati >= 100) return "sinir_asildi";
  const artis = Math.min(100 - p.garnizonSadakati, (tutar / DARBE.yatirimBirim) * DARBE.sadakatBirim);
  const harcanan = (artis / DARBE.sadakatBirim) * DARBE.yatirimBirim;
  p.garnizonSadakati += artis;
  p.yatirilan += harcanan;
  p.izler.push({ ay, tur: "ikmal", guvenilirlik: 90, gorunurluk: "ileriGelen" });
  return null;
}

export function darbeEsigi(d: BolgeDurumu) {
  const p = d.darbe;
  const sehirler = d.koltuklar.filter((k) => k.tur === "sehirBeyi").length;
  const sehirDestegi = p?.destekler.filter((x) => x.rol === "sehirBeyi").length ?? 0;
  const sehirGerekli = Math.max(1, Math.ceil(sehirler * DARBE.sehirDestekOrani));
  const ahiDestegi = p?.destekler.filter((x) => x.rol === "ahiBasi").length ?? 0;
  const garnizonSadakati = p?.garnizonSadakati ?? 0;
  const hazine = d.kasa;
  const mesruiyet = d.mesruiyet.puan;
  const gerekce = mesruiyet <= DARBE.dusukMesruiyet || ahiDestegi >= DARBE.valiDestekAhiEsik;
  const uygun = !!p && p.durum === "hazirlik" && sehirDestegi >= sehirGerekli &&
    ahiDestegi >= DARBE.ahiDestekMin && garnizonSadakati >= DARBE.garnizonEsik &&
    hazine >= DARBE.hazineRezerv && gerekce;
  return { uygun, dokum: { sehirDestegi, sehirGerekli, ahiDestegi, garnizonSadakati, hazine, mesruiyet, gerekce } };
}

export function darbeIlanEt(d: BolgeDurumu, mod: "acik" | "baskin", ay: number): HataKodu | null {
  const p = d.darbe;
  if (!p || p.durum !== "hazirlik") return "darbe_yok";
  if (!darbeEsigi(d).uygun) return "darbe_esik_eksik";
  p.mod = mod;
  p.ilanAy = ay;
  p.durum = mod === "acik" ? "ilan" : "catışma";
  p.cozumAy = ay + (mod === "acik" ? DARBE.tebligAy : 0);
  p.izler.push({ ay, tur: mod === "acik" ? "ilan" : "baskin", guvenilirlik: 100, gorunurluk: "bolge" });
  return null;
}

export function darbeVazgec(d: BolgeDurumu, kisi: string, ay: number): HataKodu | null {
  const p = d.darbe;
  if (!p || p.durum !== "hazirlik") return "darbe_kapali";
  if (p.baslatanKisi !== kisi) return "taraf_degil";
  p.durum = "iptal";
  p.sogumaSonAy = ay + DARBE.sogumaAy;
  return null;
}

export function darbeAyi(d: BolgeDurumu, ay: number): void {
  const p = d.darbe;
  if (p?.durum === "ilan" && p.cozumAy !== undefined && ay >= p.cozumAy) p.durum = "catışma";
}

export function darbeGorunumu(d: BolgeDurumu, kimlik?: SiyasiKimlik) {
  const p = d.darbe;
  if (!p) return null;
  const katilimci = !!kimlik && (kimlik.kisi === p.baslatanKisi || p.destekler.some((x) => x.hesap === kimlik.hesap));
  const yayin = ["ilan", "catışma", "bastirildi", "pat", "basarili", "mogol"].includes(p.durum);
  if (!katilimci && !yayin) return null;
  const esik = darbeEsigi(d).dokum;
  return {
    id: p.id, durum: p.durum, mod: p.mod ?? null,
    ilanAy: p.ilanAy ?? null, cozumAy: p.cozumAy ?? null,
    ...(katilimci ? { esik, destekler: p.destekler.length, garnizonSadakati: p.garnizonSadakati, yatirilan: p.yatirilan, izler: p.izler } : {}),
  };
}
