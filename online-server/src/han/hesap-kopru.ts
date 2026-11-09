// HesapDO tarafı han işlemleri: han listesi, masa bileti (WebSocket yükseltmesi öncesi), butonlu eylem, ikram,
// yaptırım değişikliğinin masaya bildirilmesi. Profil ve yaptırım HesapDO'dadır; masa durumu MasaDO'dadır.
// HesapDO bunları yalnız çağırır; hız sınırı ve uzaklaştırma engeli HesapDO'da bu çağrılardan önce uygulanır.

import type { Depo } from "../depo.ts";
import { yerlesimBul } from "../dunya-veri.ts";
import { profilGetir } from "../mantik.ts";
import { basarili, hata, type HesapYaptirimi, type Sonuc } from "../tipler.ts";
import { dilCoz } from "../yerlesim/ortak.ts";
import { gunlukSay, type GunlukSayac } from "../yonetim/sikayet.ts";
import { eylemGirdisiCoz } from "./eylem.ts";
import { IKRAM_GUNLUK, IKRAM_MENUSU, ikramGirdisiCoz } from "./ikram.ts";
import { HAN_DUZENI, HAN_EYLEM_GUNLUK, HAN_TURU_ADLARI, KOLTUK_SAYISI, masaAdi, masaNoCoz, masaSayisi } from "./kurallar.ts";
import type { HanOzeti, HanTuru, MasaAnonsu, MasaBileti, MasaIleti, MasaOlayi, MasaOzeti } from "./tipler.ts";
import type { IkramOdeyici } from "./yerlesim-kopru.ts";

// HesapDO depo anahtarları (yalnız "han:" önekli; başka anahtara dokunulmaz)
export const SON_MASA = "han:sonMasa";
export const EYLEM_SAYAC = "han:eylemSayac";
export const IKRAM_SAYAC = "han:ikramSayac";
export const EYLEM_ISTEK = "han:eylem:"; // + istekNo → Sonuc
export const IKRAM_ISTEK = "han:ikram:"; // + istekNo → Sonuc

export type MasaCagir = (ad: string, ileti: MasaIleti) => Promise<Sonuc<unknown>>;

export interface HanHesapBaglami {
  depo: Depo;
  hesapId: string;
  simdi: number;
  yaptirim: HesapYaptirimi | undefined;
  masaCagir: MasaCagir;
  ikramOde: IkramOdeyici;
  /** Yerleşimdeki iki yönlü engel listesi (hesap kimlikleri). Yoksa liste boş sayılır (birim testleri). */
  engelSor?: EngelListeleyici;
}

/** HesapDO → YerlesimDO "engeller" çağrısı. */
export type EngelListeleyici = (yerlesim: string) => Promise<Sonuc<{ engeller: string[] }>>;

interface HanYeri {
  yerlesim: string;
  yerlesimAdi: string;
  tur: HanTuru;
  masa: number;
}

async function hanYeri(depo: Depo): Promise<Sonuc<HanYeri>> {
  const profil = await profilGetir(depo);
  if (!profil.ok) return profil;
  const y = yerlesimBul(profil.deger.yerlesim);
  if (!y) return hata("yerlesim_gecersiz");
  return basarili({ yerlesim: y.id, yerlesimAdi: y.ad, tur: HAN_DUZENI[y.tur].tur, masa: masaSayisi(y.tur) });
}

/** GET /v1/han?dil= : oyuncunun yerleşimindeki han ve masaların doluluğu. */
export async function hanListesi(b: HanHesapBaglami, dil: unknown): Promise<Sonuc<HanOzeti>> {
  const yer = await hanYeri(b.depo);
  if (!yer.ok) return yer;
  const { yerlesim, tur } = yer.deger;
  const nolar = Array.from({ length: yer.deger.masa }, (_, i) => i + 1);
  const ozetler = await Promise.all(nolar.map((no) => b.masaCagir(masaAdi(yerlesim, tur, no), { islem: "ozet", masa: masaAdi(yerlesim, tur, no), no })));
  const masalar: MasaOzeti[] = [];
  for (const o of ozetler) {
    if (!o.ok) return o;
    masalar.push(o.deger as MasaOzeti);
  }
  return basarili({
    yerlesim: { id: yerlesim, ad: yer.deger.yerlesimAdi },
    han: { tur, ad: HAN_TURU_ADLARI[tur][dilCoz(dil)] },
    koltuk: KOLTUK_SAYISI,
    masalar,
  });
}

/**
 * GET /v1/han/masa/:no/baglan öncesi: masa numarası doğrulanır, bilet üretilir (plaka + yaptırım anlık görüntüsü).
 * Oyuncu aynı anda tek masadadır: önceki masa farklıysa oradaki bağlantı kapatılır.
 */
export async function masaBileti(b: HanHesapBaglami, hamNo: unknown): Promise<Sonuc<MasaBileti>> {
  const profil = await profilGetir(b.depo);
  if (!profil.ok) return profil;
  const yer = await hanYeri(b.depo);
  if (!yer.ok) return yer;
  const no = masaNoCoz(hamNo, yer.deger.masa);
  if (no === undefined) return hata("masa_gecersiz");
  const ad = masaAdi(yer.deger.yerlesim, yer.deger.tur, no);
  const onceki = await b.depo.al<string>(SON_MASA);
  if (onceki && onceki !== ad) {
    try {
      await b.masaCagir(onceki, { islem: "cikar", masa: onceki, hesap: b.hesapId });
    } catch {
      // en iyi çaba: önceki masa yanıt vermezse bağlantı kendiliğinden düşer
    }
  }
  let eg: string[] = [];
  if (b.engelSor) {
    const r = await b.engelSor(yer.deger.yerlesim);
    if (!r.ok) return r;
    eg = r.deger.engeller;
  }
  if (onceki !== ad) await b.depo.koy({ [SON_MASA]: ad });
  const yt: HesapYaptirimi = {
    ...(b.yaptirim?.uzaklastirma ? { uzaklastirma: b.yaptirim.uzaklastirma } : {}),
    ...(b.yaptirim?.susturma ? { susturma: b.yaptirim.susturma } : {}),
  };
  return basarili({ masa: ad, no, plaka: { hesap: b.hesapId, ad: profil.deger.ad }, yt, eg });
}

/** POST /v1/han/eylem: istekNo ile tekrar güvenli; günlük tavan yalnız başarılı eylemi sayar. */
export async function hanEylemi(b: HanHesapBaglami, govde: unknown): Promise<Sonuc<{ olay: MasaOlayi }>> {
  const girdi = eylemGirdisiCoz(govde);
  if (!girdi.ok) return girdi;
  const anahtar = EYLEM_ISTEK + girdi.deger.istekNo;
  const kayitli = await b.depo.al<Sonuc<{ olay: MasaOlayi }>>(anahtar);
  if (kayitli) return kayitli;
  const yer = await hanYeri(b.depo);
  if (!yer.ok) return yer;
  if (masaNoCoz(girdi.deger.masa, yer.deger.masa) === undefined) return hata("masa_gecersiz");
  const sayac = gunlukSay(await b.depo.al<GunlukSayac>(EYLEM_SAYAC), b.simdi, HAN_EYLEM_GUNLUK);
  if (!sayac.izin) return hata("eylem_siniri");
  const ad = masaAdi(yer.deger.yerlesim, yer.deger.tur, girdi.deger.masa);
  const sonuc = (await b.masaCagir(ad, { islem: "eylem", masa: ad, hesap: b.hesapId, girdi: girdi.deger })) as Sonuc<{ olay: MasaOlayi }>;
  if (sonuc.ok) await b.depo.koy({ [anahtar]: sonuc, [EYLEM_SAYAC]: sayac.durum });
  return sonuc;
}

export interface IkramSonucu {
  ikram: string;
  fiyat: number;
  /** Verenin ödemeden sonraki parası (YerlesimDO'dan). */
  para: number;
  anons: MasaAnonsu;
}

/**
 * POST /v1/han/ikram: (1) masa kontrolü (veren oturuyor, alan masada, engel yok), (2) ödeme YerlesimDO'da,
 * (3) masaya anons. Fiyat yalnız sunucu menüsünden. istekNo ile tekrar güvenli (ödeme de istekNo'yu taşır).
 */
export async function hanIkrami(b: HanHesapBaglami, govde: unknown): Promise<Sonuc<IkramSonucu>> {
  const girdi = ikramGirdisiCoz(govde);
  if (!girdi.ok) return girdi;
  const { hedef, ikram, istekNo } = girdi.deger;
  const anahtar = IKRAM_ISTEK + istekNo;
  const kayitli = await b.depo.al<Sonuc<IkramSonucu>>(anahtar);
  if (kayitli) return kayitli;
  if (hedef === b.hesapId) return hata("kendi_hedef");
  const yer = await hanYeri(b.depo);
  if (!yer.ok) return yer;
  if (masaNoCoz(girdi.deger.masa, yer.deger.masa) === undefined) return hata("masa_gecersiz");
  const sayac = gunlukSay(await b.depo.al<GunlukSayac>(IKRAM_SAYAC), b.simdi, IKRAM_GUNLUK);
  if (!sayac.izin) return hata("eylem_siniri");
  const ad = masaAdi(yer.deger.yerlesim, yer.deger.tur, girdi.deger.masa);
  const kontrol = await b.masaCagir(ad, { islem: "ikramKontrol", masa: ad, hesap: b.hesapId, hedef });
  if (!kontrol.ok) return kontrol;
  const fiyat = IKRAM_MENUSU[ikram].fiyat;
  const odeme = await b.ikramOde({ islem: "hanIkram", yerlesim: yer.deger.yerlesim, hesapId: b.hesapId, govde: { hedef, ikram, fiyat, istekNo } });
  if (!odeme.ok) return odeme;
  const anons: MasaAnonsu = { tur: "ikram", kim: b.hesapId, hedef, oge: ikram, zaman: b.simdi };
  // Anons en iyi çabadır: ödeme yapıldıktan sonra masa yanıt vermese de sonuç kaydedilir (tekrar ikinci kez ödetmez).
  try {
    await b.masaCagir(ad, { islem: "anons", masa: ad, anons });
  } catch {
    // yut
  }
  const sonuc = basarili({ ikram, fiyat, para: odeme.deger.para, anons });
  await b.depo.koy({ [anahtar]: sonuc, [IKRAM_SAYAC]: sayac.durum });
  return sonuc;
}

/** Y1 yaptırımı değişince: oyuncunun son masasına bildirir (susturma hemen etkili, uzaklaştırma bağlantıyı keser). */
export async function yaptirimiMasayaBildir(b: Pick<HanHesapBaglami, "depo" | "hesapId" | "masaCagir">, durum: HesapYaptirimi): Promise<void> {
  const masa = await b.depo.al<string>(SON_MASA);
  if (!masa) return;
  try {
    await b.masaCagir(masa, { islem: "yaptirim", masa, hesap: b.hesapId, durum });
  } catch {
    // en iyi çaba: bağlantı yeniden kurulurken bilet zaten güncel yaptırımı taşır
  }
}

/** Oyuncu engelleyince/kaldırınca: güncel iki yönlü listeyi son masasına bildirir (en iyi çaba). */
export async function engeliMasayaBildir(b: Pick<HanHesapBaglami, "depo" | "hesapId" | "masaCagir">, liste: string[]): Promise<void> {
  const masa = await b.depo.al<string>(SON_MASA);
  if (!masa) return;
  try {
    await b.masaCagir(masa, { islem: "engel", masa, hesap: b.hesapId, liste });
  } catch {
    // en iyi çaba: bir sonraki bağlanışta bilet güncel listeyi taşır
  }
}
