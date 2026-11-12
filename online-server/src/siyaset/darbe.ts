// Darbe hazırlığı ve taahhüt eşiği (Ek B §8.2, P5 ilk dilim).
// Gizli hazırlık izleri yalnız plan katılımcılarına görünür; ilan sonrası bölgeye yayınlanır.

import { DARBE } from "./sabitler.ts";
import type { DarbeDestekRolu, BolgeDurumu, SiyasiKimlik, DarbeTarafi } from "./tipler.ts";
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
    acilisAy: ay, sogumaSonAy: ay, destekler: [], savunma: [], baslatanKume: kumeAnahtarlari(kimlik),
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
  p.destekler.push({ kisi: kimlik.kisi, hesap: kimlik.hesap, ad: kimlik.ad, koltuk, rol, kume, ay });
  p.izler.push({ ay, tur: "destek", guvenilirlik: 85, gorunurluk: "ileriGelen" });
  return null;
}

/** İlan sonrası açık savunma emri: yalnız makam sahibi, çatışma çözülmeden önce bir kez yazabilir. */
export function darbeSavunmaYaz(
  d: BolgeDurumu,
  kimlik: SiyasiKimlik,
  koltuk: string,
  rol: DarbeDestekRolu,
  ay: number,
): HataKodu | null {
  const p = d.darbe;
  if (!p || (p.durum !== "ilan" && p.durum !== "catışma")) return "darbe_kapali";
  if (p.cozumAy === undefined || ay >= p.cozumAy) return "darbe_kapali";
  const kume = kumeAnahtarlari(kimlik);
  if (p.baslatanHesap === kimlik.hesap || kumeKesisir(p.baslatanKume ?? [], kume)) return "kume_cakisma";
  const savunma = (p.savunma ??= []);
  const onceki = [...p.destekler, ...savunma];
  if (onceki.some((x) => x.hesap === kimlik.hesap || kumeKesisir(x.kume, kume))) return "kume_cakisma";
  savunma.push({ kisi: kimlik.kisi, hesap: kimlik.hesap, ad: kimlik.ad, koltuk, rol, kume, ay });
  p.izler.push({ ay, tur: "savunma", guvenilirlik: 100, gorunurluk: "bolge" });
  return null;
}

/**
 * Çatışma çözülmeden önce yalnız gerçek saldıran lideri veya savunma emri vermiş makam sahibi
 * statüko ateşkesi önerebilir. Teklif ganimet/mülk devri içermez.
 */
export function darbeBarisTeklifEt(d: BolgeDurumu, kimlik: SiyasiKimlik, istekId: unknown, ay: number): HataKodu | null {
  const p = d.darbe;
  if (!p || (p.durum !== "ilan" && p.durum !== "catışma") || p.cozumAy === undefined || ay >= p.cozumAy)
    return "darbe_kapali";
  if (typeof istekId !== "string" || istekId.length < 8 || istekId.length > 128) return "deger_sinir_disi";

  let taraf: DarbeTarafi;
  if (p.baslatanKisi === kimlik.kisi && p.baslatanHesap === kimlik.hesap) taraf = "saldiran";
  else if ((p.savunma ?? []).some((x) => x.kisi === kimlik.kisi && x.hesap === kimlik.hesap)) taraf = "savunan";
  else return "taraf_degil";

  if (p.barisTeklifi?.durum === "bekliyor") return "devlet_talep_var";
  if (p.barisTeklifi?.istekId === istekId) return "devlet_talep_var";
  p.barisTeklifi = { taraf, kisi: kimlik.kisi, hesap: kimlik.hesap, istekId, ay, durum: "bekliyor" };
  return null;
}

/** Ateşkes ancak karşı tarafın aynı teklif kimliğine açık kabulüyle yürürlüğe girer. */
export function darbeBarisYanit(
  d: BolgeDurumu, kimlik: SiyasiKimlik, istekId: unknown, karar: unknown, ay: number,
): HataKodu | null {
  const p = d.darbe;
  const teklif = p?.barisTeklifi;
  if (!p || (p.durum !== "ilan" && p.durum !== "catışma") || p.cozumAy === undefined || ay >= p.cozumAy)
    return "darbe_kapali";
  if (!teklif || teklif.durum !== "bekliyor" || teklif.istekId !== istekId) return "hedef_uygun_degil";
  if (karar !== "kabul" && karar !== "ret") return "deger_sinir_disi";

  const karsiTaraf: DarbeTarafi = teklif.taraf === "saldiran" ? "savunan" : "saldiran";
  const yetkili = karsiTaraf === "saldiran"
    ? p.baslatanKisi === kimlik.kisi && p.baslatanHesap === kimlik.hesap
    : (p.savunma ?? []).some((x) => x.kisi === kimlik.kisi && x.hesap === kimlik.hesap);
  if (!yetkili) return "taraf_degil";

  teklif.durum = karar;
  teklif.yanitlayan = kimlik.kisi;
  teklif.yanitAy = ay;
  if (karar === "kabul") {
    p.durum = "ateskes";
    p.sogumaSonAy = ay + DARBE.sogumaAy;
  }
  return null;
}

export function darbeSadakatYatir(d: BolgeDurumu, tutar: number, ay: number): HataKodu | number {
  const p = d.darbe;
  if (!p || p.durum !== "hazirlik") return "darbe_yok";
  if (!Number.isInteger(tutar) || tutar < DARBE.yatirimEnAz || tutar > DARBE.yatirimEnCok || tutar % DARBE.yatirimBirim !== 0) return "deger_sinir_disi";
  if (p.garnizonSadakati >= 100) return "sinir_asildi";
  const artis = Math.min(100 - p.garnizonSadakati, (tutar / DARBE.yatirimBirim) * DARBE.sadakatBirim);
  const harcanan = Math.min(tutar, Math.ceil(artis / DARBE.sadakatBirim) * DARBE.yatirimBirim);
  if (d.kasa - harcanan < DARBE.hazineRezerv) return "kasa_yetersiz";
  p.garnizonSadakati += artis;
  p.yatirilan += harcanan;
  p.izler.push({ ay, tur: "ikmal", guvenilirlik: 90, gorunurluk: "ileriGelen" });
  return harcanan;
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
  if (!p) return;
  if (p.durum === "ilan" && p.cozumAy !== undefined && ay >= p.cozumAy) {
    p.durum = "catışma";
    p.cozumAy = ay + DARBE.catışmaAy;
    p.izler.push({ ay, tur: "ilan", guvenilirlik: 100, gorunurluk: "bolge" });
    return;
  }
  if (p.durum !== "catışma" || p.cozumAy === undefined || ay < p.cozumAy) return;

  const sehirToplam = d.koltuklar.filter((k) => k.tur === "sehirBeyi").length;
  const ahiToplam = d.koltuklar.filter((k) => k.tur === "ahiBasi").length;
  const sehirDestegi = p.destekler.filter((x) => x.rol === "sehirBeyi").length;
  const ahiDestegi = p.destekler.filter((x) => x.rol === "ahiBasi").length;
  const sultanMesruiyeti = d.sultanlik?.mesruiyet.puan ?? 50;
  const mogolKademe = d.sultanlik?.mogol.kademe ?? 0;

  // Sabit ve denetlenebilir çözüm: çevrimdışı oyuncuların yerine otomatik güç hesabı işler.
  // İlan öncesi makam taahhütleri korunur; sessizlik teslimiyet sayılmaz.
  const saldiran = Math.round(
    sehirDestegi * 24 + ahiDestegi * 12 + p.garnizonSadakati * 0.45 +
    Math.max(0, 50 - d.mesruiyet.puan) * 0.25 + d.g.moral * 0.1
  );
  const savunmaEmirleri = p.savunma ?? [];
  const savunmaPuani = Math.min(DARBE.savunmaPuanTavan, savunmaEmirleri.reduce((toplam, x) => toplam + (x.rol === "sehirBeyi" ? DARBE.savunmaSehirBeyiPuan : DARBE.savunmaAhiPuan), 0));
  const savunan = Math.round(
    Math.max(0, sehirToplam - sehirDestegi) * 18 +
    Math.max(0, ahiToplam - ahiDestegi) * 9 +
    (100 - p.garnizonSadakati) * 0.45 + d.g.guvenlik * 0.25 +
    sultanMesruiyeti * 0.2 + savunmaPuani
  );

  let tur: "bastirildi" | "pat" | "basarili" | "mogol";
  if (mogolKademe >= 3) tur = "mogol";
  else if (saldiran - savunan >= DARBE.sonucFarki) tur = "basarili";
  else if (savunan - saldiran >= DARBE.sonucFarki) tur = "bastirildi";
  else tur = "pat";

  p.sonuc = { tur, saldiran, savunan, ay };
  p.durum = tur;
  p.sogumaSonAy = ay + DARBE.sogumaAy;
  p.izler.push({ ay, tur: tur === "mogol" ? "baskin" : "ilan", guvenilirlik: 100, gorunurluk: "bolge" });

  if (tur === "basarili" && !d.devlet) {
    const vali = d.koltuklar.find((k) => k.id === `vali:${d.id}`);
    d.devlet = {
      v: 1,
      ad: `${vali?.s.ad ?? d.id} Beyliği`,
      kurulusAy: ay,
      beyKisi: p.baslatanKisi,
      beyHesap: p.baslatanHesap,
      beyAd: vali?.s.ad ?? d.id,
      vergiOrani: vali?.ayar.vergiOrani ?? 2,
      divan: p.destekler.slice(0, 5).map((x) => ({ kisi: x.kisi, hesap: x.hesap, ad: x.ad, rol: "divan" as const })),
      mogol: "harac",
      sultan: "bagimsiz",
      taninma: "taninmadi",
      yeminler: {},
    };
  }
}

export function darbeGorunumu(d: BolgeDurumu, kimlik?: SiyasiKimlik) {
  const p = d.darbe;
  if (!p) return null;
  const katilimci = !!kimlik && (kimlik.kisi === p.baslatanKisi || p.destekler.some((x) => x.hesap === kimlik.hesap) || (p.savunma ?? []).some((x) => x.hesap === kimlik.hesap));
  const yayin = ["ilan", "catışma", "ateskes", "bastirildi", "pat", "basarili", "mogol"].includes(p.durum);
  if (!katilimci && !yayin) return null;
  const esik = darbeEsigi(d).dokum;
  return {
    id: p.id, durum: p.durum, mod: p.mod ?? null,
    ilanAy: p.ilanAy ?? null, cozumAy: p.cozumAy ?? null, sonuc: p.sonuc ?? null,
    barisTeklifi: p.barisTeklifi ?? null,
    ...(kimlik ? {
      benimTaraf: p.baslatanKisi === kimlik.kisi ? "saldiran" : (p.savunma ?? []).some((x) => x.hesap === kimlik.hesap) ? "savunan" : null,
      benimDestek: p.destekler.some((x) => x.hesap === kimlik.hesap || kumeKesisir(x.kume, kumeAnahtarlari(kimlik))),
    } : {}),
    ...(katilimci ? { esik, destekler: p.destekler.length, savunma: (p.savunma ?? []).length, garnizonSadakati: p.garnizonSadakati, yatirilan: p.yatirilan, izler: p.izler } : {}),
  };
}
