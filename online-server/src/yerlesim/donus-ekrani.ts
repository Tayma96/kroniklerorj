// Dönüş ekranı (GDD §18 "Dönüş ekranı ve güvenli toparlanma", §12; Faz 14). Uzun yokluktan dönen oyuncunun ilk
// ekranı: durum açık ve yargılamadan gösterilir. Dil "ceza" değil "durum"dur: anahtarlar `donus.*` (istemci 6 dilde
// çevirir), sayılar ve süreler dürüsttür, her etkinin nasıl toparlanacağı yazılır. Tek dokunuşla barınma: seçenekler
// istemcinin aynen gönderebileceği istek gövdesini taşır (istekNo istemcide eklenir). Saf fonksiyonlar.

import { AY_MS } from "../saat.ts";
import {
  DONUS_EKRANI_ESIGI_MS,
  DONUS_MOLASI_MS,
  UYKU_ESIGI_MS,
  barinmaGorunumu,
  barinmaKaydi,
  ocakVar,
  sonGorulme,
  type BarinmaGorunumu,
} from "./barinma.ts";
import {
  CAN_AYLIK_TOPARLAMA,
  CAN_YARALI_ESIGI,
  KONDISYON_AYLIK_TOPARLAMA,
  KONDISYON_YARALI_TOPARLAMA,
  HAL_TABAN_CAN,
  halGorunumu,
} from "./hal.ts";
import { ODALAR } from "./oda.ts";
import type { Karakter, Kasaba } from "./tipler.ts";

export interface TekDokunus {
  tur: "oda" | "tesis" | "uzat" | "otomatik";
  anahtar: string;
  fiyat: number;
  uygun: boolean;
  neden?: string;
  istek: { yontem: "POST"; yol: string; govde: Record<string, string | number> };
}

/** Tek dokunuş seçenekleri: önce yapılabilir olanlar, sonra ucuz olan; otomatik talimat önerisi sonda. Konaklaması güvende olana yalnız uzatma. */
export function tekDokunusSecenekleri(g: BarinmaGorunumu): TekDokunus[] {
  const liste: TekDokunus[] = [];
  if (!g.acik) return liste;
  const k = g.konaklama;
  const guvende = k && (k.tur === "ocak" || k.tur === "oda");
  if (guvende) {
    if (k.tur === "oda" && k.yakindaBiter && k.oda) {
      const fiyat = g.odalar.find((o) => o.oda === k.oda)?.fiyatlar[1] ?? 0;
      liste.push({
        tur: "uzat",
        anahtar: "donus.secenek.uzat",
        fiyat,
        uygun: g.para >= fiyat,
        ...(g.para >= fiyat ? {} : { neden: "para_yok" }),
        istek: { yontem: "POST", yol: "/v1/barinma/kira", govde: { oda: k.oda, sure: 1 } },
      });
    }
    return liste;
  }
  if (g.tesis.acik && k?.tur !== "tesis") {
    liste.push({
      tur: "tesis",
      anahtar: `donus.secenek.${g.tesis.tur}`,
      fiyat: 0,
      uygun: g.tesis.uygun,
      ...("neden" in g.tesis ? { neden: g.tesis.neden } : {}),
      istek: { yontem: "POST", yol: "/v1/barinma/tesis", govde: {} },
    });
  }
  for (const o of g.odalar) {
    liste.push({
      tur: "oda",
      anahtar: `donus.secenek.oda.${o.oda}`,
      fiyat: o.fiyatlar[1],
      uygun: o.yeterli,
      ...(o.yeterli ? {} : { neden: "para_yok" }),
      istek: { yontem: "POST", yol: "/v1/barinma/kira", govde: { oda: o.oda, sure: 1 } },
    });
  }
  liste.sort((a, b) => Number(b.uygun) - Number(a.uygun) || a.fiyat - b.fiyat);
  // Talimat önerisi barınmanın yerine geçmez: her zaman sonda.
  if (g.otomatik.mod === "kapali") {
    liste.push({
      tur: "otomatik",
      anahtar: "donus.secenek.otomatik",
      fiyat: 0,
      uygun: true,
      istek: { yontem: "POST", yol: "/v1/barinma/otomatik", govde: { mod: "oda" } },
    });
  }
  return liste;
}

/** Dönüş ekranı verisi, `once` (yokluğun başladığı an) referansıyla. */
export function donusEkrani(kasaba: Kasaba, kar: Karakter, simdi: number, once: number) {
  const g = barinmaGorunumu(kasaba, kar, simdi);
  const h = halGorunumu(kar, kasaba.ay);
  const odaBonusu = g.konaklama?.oda ? ODALAR[g.konaklama.oda].kondisyon : 0;
  const kondisyonHizi = (h.can.deger < CAN_YARALI_ESIGI ? KONDISYON_YARALI_TOPARLAMA : KONDISYON_AYLIK_TOPARLAMA) + odaBonusu;
  const zincirde = g.zincir !== null;
  const yokluk = Math.max(0, simdi - once);
  return {
    yokluk: { baslangic: once, ms: yokluk, ay: Math.floor(yokluk / AY_MS), uyku: yokluk >= UYKU_ESIGI_MS },
    baslik: zincirde ? "donus.baslik.toparlan" : "donus.baslik.hosgeldin",
    barinma: {
      durum: g.durum,
      anahtar: `donus.barinma.${g.durum}`,
      unvan: g.unvan,
      konaklama: g.konaklama,
      zincir: g.zincir,
      ...(zincirde ? { toparlanma: "donus.toparlanma.konaklama" } : {}),
    },
    hal: {
      can: {
        deger: h.can.deger,
        anahtar: `donus.hal.can.${h.can.durum}`,
        taban: HAL_TABAN_CAN,
        toparlanmaAylik: zincirde ? 0 : CAN_AYLIK_TOPARLAMA,
      },
      kondisyon: { deger: h.kondisyon.deger, anahtar: `donus.hal.kondisyon.${h.kondisyon.kademe}`, toparlanmaAylik: zincirde ? 0 : kondisyonHizi },
      gonul: { deger: h.gonul.deger, anahtar: `donus.hal.gonul.${h.gonul.durum}`, denge: h.gonul.etki.p.denge },
      nedenler: h.nedenler,
    },
    olanlar: g.gunluk.filter((x) => x.an >= once).map((x) => ({ an: x.an, k: x.k.replace(/^barinma\./, "donus.olan."), p: x.p })),
    secenekler: tekDokunusSecenekleri(g),
    otomatik: { mod: g.otomatik.mod, oneri: g.otomatik.mod === "kapali" ? "donus.otomatik.oneri" : null },
    mola: g.mola,
  };
}
export type DonusEkrani = ReturnType<typeof donusEkrani>;

/**
 * GET /v1/yerlesim içinde, son görülme (`kar.kz`) güncellenmeden önce çağrılır: barınmayı şimdiye getirir; yokluk
 * eşiği aştıysa dönüş ekranını üretir ve yokluğun başını saklar (GET /v1/donus yeniden gösterebilsin); uyku
 * kademesinden dönüşte mola başlatır.
 */
export function donusHazirla(kasaba: Kasaba, kar: Karakter, simdi: number): { barinma: BarinmaGorunumu; donusEkrani: DonusEkrani | null } {
  const br = barinmaKaydi(kar, kasaba.y, simdi, ocakVar(kasaba, kar));
  const once = sonGorulme(kar, br);
  const yokluk = simdi - once;
  if (yokluk < DONUS_EKRANI_ESIGI_MS) return { barinma: barinmaGorunumu(kasaba, kar, simdi), donusEkrani: null };
  br.og = once;
  if (yokluk >= UYKU_ESIGI_MS) br.dm = simdi + DONUS_MOLASI_MS;
  const ekran = donusEkrani(kasaba, kar, simdi, once);
  return { barinma: barinmaGorunumu(kasaba, kar, simdi), donusEkrani: ekran };
}

/** GET /v1/donus: son dönüş ekranını (yokluk başı saklıysa) ya da son görülmeden bu yanayı yeniden üretir. */
export function donusOku(kasaba: Kasaba, kar: Karakter, simdi: number): DonusEkrani {
  const br = barinmaKaydi(kar, kasaba.y, simdi, ocakVar(kasaba, kar));
  return donusEkrani(kasaba, kar, simdi, br.og > 0 ? br.og : sonGorulme(kar, br));
}
