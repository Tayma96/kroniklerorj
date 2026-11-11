// E4.3-A: öğrenilmiş hizmeti girdiler ve takat karşılığında süreli stoğa hazırlar.
// Bu modül yalnız stok üretimini yönetir; ilan/satın alma bir sonraki dilimde aynı ekonomi emanet defterine bağlanır.
import { hizmetAcik } from "./beceri-etki.ts";
import { envanterEkle } from "./npc-taban.ts";
import { takatHarca } from "./karakter.ts";
import { hizmetTarifiBul, type HizmetTarifi } from "./hizmet-tarif.ts";
import type { EkonomiKaydi, HizmetStogu } from "./pazar-tahta.ts";
import type { Karakter } from "./tipler.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";

/** [PARAMETRE] Tek hazırlamada en çok 5, oyuncu/hizmet başına süresi geçmemiş stokta en çok 20 adet. */
export const HIZMET_HAZIR_ADET_EN_COK = 5;
export const HIZMET_STOK_EN_COK = 20;

export interface HizmetHazirlamaSonucu {
  stok: HizmetStogu;
  harcanan: { girdiler: Partial<Record<string, number>>; takat: number };
}

/** Hazırlanmış hizmet üretir. Bütün kontroller harcamadan önce yapılır. */
export function hizmetHazirla(
  ek: EkonomiKaydi,
  kar: Karakter,
  hizmetHam: unknown,
  adetHam: unknown,
  ay: number,
): Sonuc<HizmetHazirlamaSonucu> {
  const tarif: HizmetTarifi | undefined = hizmetTarifiBul(hizmetHam);
  if (!tarif) return hata("tarif_gecersiz");
  if (!Number.isInteger(adetHam) || (adetHam as number) < 1 || (adetHam as number) > HIZMET_HAZIR_ADET_EN_COK)
    return hata("gecersiz_istek");
  const adet = adetHam as number;
  if (!hizmetAcik(kar, tarif.id)) return hata("dugum_kapali");

  const stoklar = (ek.hs ??= []);
  const eldeki = stoklar
    .filter((x) => x.o === kar.o && x.h === tarif.id && x.sa >= ay)
    .reduce((toplam, x) => toplam + x.n, 0);
  if (eldeki + adet > HIZMET_STOK_EN_COK) return hata("kota_doldu");

  const girdiler: Partial<Record<string, number>> = {};
  for (const [mal, birim] of Object.entries(tarif.girdi)) {
    const gereken = (birim ?? 0) * adet;
    if ((kar.ev?.[mal] ?? 0) < gereken) return hata("girdi_yok");
    if (gereken > 0) girdiler[mal] = gereken;
  }
  const takat = tarif.takat * adet;
  // Takat denetimi girdiler tüketilmeden yapılır; takatHarca başarısızsa mal kaybı olmaz.
  if (!takatHarca(kar, ay, takat)) return hata("takat_yok");
  for (const [mal, miktar] of Object.entries(girdiler)) envanterEkle(kar, mal as keyof typeof kar.ev & string, -miktar);

  const stok: HizmetStogu = {
    i: ek.n++, o: kar.o, oa: kar.ad, h: tarif.id, n: adet, ac: ay, sa: ay + tarif.hazir.gecerlilikAy,
  };
  stoklar.push(stok);
  return basarili({ stok, harcanan: { girdiler, takat } });
}

/** Süresi dolan stok ekranda/işlemde kullanılamaz; eski kayıtlar silinmeden geçmişte kalır. */
export function hizmetStoguGecerli(stok: HizmetStogu, ay: number): boolean {
  return stok.n > 0 && stok.sa >= ay;
}

export function hizmetStoguGorunumu(stok: HizmetStogu, ay: number) {
  const tarif = hizmetTarifiBul(stok.h);
  return {
    id: `h${stok.i}`,
    hizmet: stok.h,
    ad: stok.oa,
    adet: stok.n,
    hazirlandigiAy: stok.ac,
    sonAy: stok.sa,
    kalanAy: Math.max(0, stok.sa - ay),
    fiyatTaban: tarif?.fiyatTaban ?? null,
  };
}
