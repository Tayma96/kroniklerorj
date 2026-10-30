// İş kuralları. Workers çalışma zamanına bağlı değildir: depo ve dış çağrılar parametre olarak gelir,
// böylece `node --test` ile doğrudan denenir. HesapDO ve DunyaDO yalnız bunları depolamaya bağlar.

import { adDogrula } from "./ad.ts";
import type { Depo } from "./depo.ts";
import { BEYLIKLER, yerlesimBul } from "./dunya-veri.ts";
import { oyunAyi, sonrakiDonum, takvim } from "./saat.ts";
import {
  basarili,
  hata,
  type Cinsiyet,
  type DavetBilgisi,
  type DunyaOzeti,
  type KayitIstegi,
  type Profil,
  type Sonuc,
} from "./tipler.ts";

/** Her oyuncu 12 yaşında başlar (yıl). */
export const BASLANGIC_YASI = 12;
/** [PARAMETRE] Hesap başına dakikadaki istek sınırı. */
export const HIZ_SINIRI = 30;
export const HIZ_PENCERESI_MS = 60_000;
/** Karışmayan harfler: 0/O, 1/I/L yok. */
export const DAVET_ALFABESI = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const DAVET_UZUNLUGU = 6;
const DAVET_DESENI = new RegExp(`^[${DAVET_ALFABESI}]{${DAVET_UZUNLUGU}}$`);
const ISTEK_NO_DESENI = /^[A-Za-z0-9_-]{8,64}$/;

// Depo anahtarları
const HESAP = "hesap";
const PROFIL = "profil";
const ISTEK = "istek:"; // + istekNo → Sonuc<Profil>
const KAYIT = "kayit:"; // + hesapId → Profil (dünyadaki asıl kayıt)
const AD = "ad:"; // + ad anahtarı → hesapId
const NUFUS = "nufus:"; // + yerleşim → sayı
const DAVET = "davet:"; // + kod → hesapId
const DAVET_KODU = "davetkodu:"; // + hesapId → kod

export type Rastgele = (bayt: number) => Uint8Array;

// ---------------------------------------------------------------- hız sınırı

export interface HizDurumu {
  pencere: number;
  sayi: number;
}

/** Sabit dakikalık pencere. Saf: yeni durumu döndürür. */
export function hizKontrol(
  durum: HizDurumu | undefined,
  simdi: number,
  sinir: number = HIZ_SINIRI,
): { izin: boolean; durum: HizDurumu } {
  const pencere = Math.floor(simdi / HIZ_PENCERESI_MS);
  const sayi = durum && durum.pencere === pencere ? durum.sayi + 1 : 1;
  return { izin: sayi <= sinir, durum: { pencere, sayi } };
}

// ---------------------------------------------------------------- davet kodu

/** Büyük harfe çevirir, boşluk ve tireyi atar; biçim tutmazsa undefined. */
export function davetKoduDuzenle(ham: unknown): string | undefined {
  if (typeof ham !== "string" || ham.length > 32) return undefined;
  const kod = ham.toUpperCase().replace(/[\s-]/g, "");
  return DAVET_DESENI.test(kod) ? kod : undefined;
}

/** Yansız seçim: 248 (= 31 × 8) ve üstü baytlar atlanır. */
export function davetKoduUret(rastgele: Rastgele): string {
  const n = DAVET_ALFABESI.length;
  const sinir = 256 - (256 % n);
  let kod = "";
  while (kod.length < DAVET_UZUNLUGU) {
    for (const b of rastgele(16)) {
      if (b < sinir) kod += DAVET_ALFABESI[b % n];
      if (kod.length === DAVET_UZUNLUGU) break;
    }
  }
  return kod;
}

// ---------------------------------------------------------------- hesap tarafı (HesapDO)

export interface HesapKaydi {
  hesapId: string;
  sub: string;
  olusturma: number;
  sonGiris: number;
}

export async function girisKaydet(
  depo: Depo,
  hesapId: string,
  sub: string,
  simdi: number,
): Promise<{ profilVar: boolean }> {
  const onceki = await depo.al<HesapKaydi>(HESAP);
  const kayit: HesapKaydi = onceki ? { ...onceki, sonGiris: simdi } : { hesapId, sub, olusturma: simdi, sonGiris: simdi };
  await depo.koy({ [HESAP]: kayit });
  return { profilVar: (await depo.al<Profil>(PROFIL)) !== undefined };
}

export async function profilGetir(depo: Depo): Promise<Sonuc<Profil>> {
  const profil = await depo.al<Profil>(PROFIL);
  return profil ? basarili(profil) : hata("profil_yok");
}

export interface ProfilGirdisi {
  ad: string;
  cinsiyet: Cinsiyet;
  /** Davet yoksa zorunlu; davet varsa yok sayılır (davet edenin yerleşimi geçer). */
  yerlesim?: string;
  davet?: string;
}

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function istekNoCoz(govde: unknown): Sonuc<string> {
  const no = nesneMi(govde) ? govde.istekNo : undefined;
  return typeof no === "string" && ISTEK_NO_DESENI.test(no) ? basarili(no) : hata("istekno_gecersiz");
}

/** POST /v1/profil gövdesini doğrular ve düzenler. */
export function profilGirdisiCoz(govde: unknown): Sonuc<ProfilGirdisi> {
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  const ad = adDogrula(govde.ad);
  if (!ad.ok) return hata(ad.hata);
  const cinsiyet = govde.cinsiyet;
  if (cinsiyet !== "erkek" && cinsiyet !== "kadın") return hata("cinsiyet_gecersiz");
  if (govde.davet !== undefined && govde.davet !== null && govde.davet !== "") {
    const davet = davetKoduDuzenle(govde.davet);
    return davet ? basarili({ ad: ad.ad, cinsiyet, davet }) : hata("davet_gecersiz");
  }
  const yerlesim = govde.yerlesim;
  if (typeof yerlesim !== "string" || !yerlesimBul(yerlesim)) return hata("yerlesim_gecersiz");
  return basarili({ ad: ad.ad, cinsiyet, yerlesim });
}

/**
 * Profil oluşturma (hesap başına bir profil = bir etkin hanedan). Aynı `istekNo` aynı sonucu döndürür;
 * dünya kaydı hesap kimliğine göre tekrar güvenlidir, böylece yarıda kalan bir istek de iki kez sayılmaz.
 */
export async function profilOlustur(
  depo: Depo,
  hesapId: string,
  govde: unknown,
  dunyaKayit: (istek: KayitIstegi) => Promise<Sonuc<Profil>>,
): Promise<Sonuc<Profil>> {
  const istekNo = istekNoCoz(govde);
  if (!istekNo.ok) return istekNo;
  const onceki = await depo.al<Sonuc<Profil>>(ISTEK + istekNo.deger);
  if (onceki) return onceki;
  if (await depo.al<Profil>(PROFIL)) return hata("profil_var");
  const girdi = profilGirdisiCoz(govde);
  if (!girdi.ok) return girdi;
  const sonuc = await dunyaKayit({ hesapId, ...girdi.deger });
  if (sonuc.ok) await depo.koy({ [PROFIL]: sonuc.deger, [ISTEK + istekNo.deger]: sonuc });
  return sonuc;
}

// ---------------------------------------------------------------- dünya tarafı (DunyaDO)

/**
 * Dünyaya kayıt: ad benzersizliği, davet çözümü, kapasite. Hesap zaten kayıtlıysa mevcut kaydı döndürür
 * (tekrar güvenli; nüfus bir kez artar). Davetle gelen davet edenin yerleşimine yerleşir ve ev sınırı
 * onun için esnektir; davetsiz kayıt dolu yerleşime alınmaz.
 */
export async function kayitOl(depo: Depo, istek: KayitIstegi, simdi: number): Promise<Sonuc<Profil>> {
  const mevcut = await depo.al<Profil>(KAYIT + istek.hesapId);
  if (mevcut) return basarili(mevcut);

  const ad = adDogrula(istek.ad);
  if (!ad.ok) return hata(ad.hata);
  if (istek.cinsiyet !== "erkek" && istek.cinsiyet !== "kadın") return hata("cinsiyet_gecersiz");

  let yerlesimId = istek.yerlesim;
  let davetEden: Profil | undefined;
  if (istek.davet !== undefined) {
    const kod = davetKoduDuzenle(istek.davet);
    if (!kod) return hata("davet_gecersiz");
    const sahip = await depo.al<string>(DAVET + kod);
    davetEden = sahip === undefined ? undefined : await depo.al<Profil>(KAYIT + sahip);
    if (!davetEden) return hata("davet_yok");
    yerlesimId = davetEden.yerlesim;
  }
  const yerlesim = yerlesimId === undefined ? undefined : yerlesimBul(yerlesimId);
  if (!yerlesim) return hata("yerlesim_gecersiz");

  const adSahibi = await depo.al<string>(AD + ad.anahtar);
  if (adSahibi !== undefined && adSahibi !== istek.hesapId) return hata("ad_alinmis");

  const nufus = (await depo.al<number>(NUFUS + yerlesim.id)) ?? 0;
  if (!davetEden && nufus >= yerlesim.evKapasite) return hata("yerlesim_dolu");

  const profil: Profil = {
    hesapId: istek.hesapId,
    ad: ad.ad,
    cinsiyet: istek.cinsiyet,
    beylik: yerlesim.beylik,
    yerlesim: yerlesim.id,
    dogumAyi: oyunAyi(simdi) - BASLANGIC_YASI * 12,
    olusturma: simdi,
    ...(davetEden ? { davetEden: davetEden.ad } : {}),
  };
  await depo.koy({
    [KAYIT + istek.hesapId]: profil,
    [AD + ad.anahtar]: istek.hesapId,
    [NUFUS + yerlesim.id]: nufus + 1,
  });
  return basarili(profil);
}

/** Oyuncunun davet kodu; varsa aynısını döndürür. Kod davet edenin (güncel) yerleşimine götürür. */
export async function davetOlustur(depo: Depo, hesapId: string, rastgele: Rastgele): Promise<Sonuc<{ kod: string }>> {
  if (!(await depo.al<Profil>(KAYIT + hesapId))) return hata("profil_yok");
  const mevcut = await depo.al<string>(DAVET_KODU + hesapId);
  if (mevcut) return basarili({ kod: mevcut });
  for (let deneme = 0; deneme < 8; deneme++) {
    const kod = davetKoduUret(rastgele);
    if ((await depo.al<string>(DAVET + kod)) === undefined) {
      await depo.koy({ [DAVET + kod]: hesapId, [DAVET_KODU + hesapId]: kod });
      return basarili({ kod });
    }
  }
  return hata("sunucu_hatasi");
}

export async function davetCoz(depo: Depo, ham: unknown): Promise<Sonuc<DavetBilgisi>> {
  const kod = davetKoduDuzenle(ham);
  if (!kod) return hata("davet_gecersiz");
  const sahip = await depo.al<string>(DAVET + kod);
  const profil = sahip === undefined ? undefined : await depo.al<Profil>(KAYIT + sahip);
  if (!profil) return hata("davet_yok");
  return basarili({ kod, yerlesim: profil.yerlesim, beylik: profil.beylik, davetEden: profil.ad });
}

/** GET /v1/dunya: saat + beylikler ve yerleşimlerin doluluğu. */
export async function dunyaOzeti(depo: Depo, simdi: number): Promise<DunyaOzeti> {
  const anahtarlar = BEYLIKLER.flatMap((b) => b.yerlesimler.map((y) => NUFUS + y.id));
  const nufuslar = await depo.alCok<number>(anahtarlar);
  const ay = oyunAyi(simdi);
  return {
    saat: { simdi, oyunAyi: ay, ...takvim(ay), sonrakiDonum: sonrakiDonum(simdi) },
    beylikler: BEYLIKLER.map((b) => ({
      id: b.id,
      ad: b.ad,
      yerlesimler: b.yerlesimler.map((y) => ({
        id: y.id,
        ad: y.ad,
        tur: y.tur,
        evKapasite: y.evKapasite,
        npc: y.npc,
        nufus: nufuslar.get(NUFUS + y.id) ?? 0,
      })),
    })),
  };
}
