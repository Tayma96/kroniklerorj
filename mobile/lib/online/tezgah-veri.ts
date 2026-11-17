// Tezgâh modeli Dilim 1 istemci biçimleri: online-server/src/mulk/{tezgah-uclar,raf,depo,tezgah-donum}.ts ile birebir.
// Raf, depo, gün sonu, önizleme ve yolcu payı sunucuda hesaplanır; istemci gösterir ve niyeti (istekNo ile) gönderir.
// Fiyat bandı aynası (bantHesapla) yalnız henüz rafta olmayan bir mal için seçenek göstermek içindir
// (tezgah-kurallar.ts RAF_FIYAT_ALT/UST, NPC_TAVAN_CARPANI, kalite.ts KALITE_DEGER_CARPANI [PARAMETRE] kopyası);
// doğrulama sunucudadır (`fiyat_bant_disi`).
import { useMemo } from "react";
import { applyParams } from "../i18n";
import { useOnline } from "./durum";
import { ekCagir, ekHataAnahtari, nesneMi, sayiMi, metinMi, type EkHata, type EkSonuc } from "./ek-istemci";
import { MALLAR } from "./meslek-veri";
import { sahteTezgahIstemci } from "./sahte-tezgah";

export type Kademe = 0 | 1 | 2 | 3;
export interface FiyatBandi { alt: number; ust: number }
export interface Carpanlar { F: number; Q: number; R: number; H: number }
export interface RafSatiri {
  satir: number; mal: string; kalite: Kademe; kaliteAdi: string; adet: number; fiyat: number; bant: FiyatBandi;
  npcTavan: number; adil: number; yapan?: string; cekicilik?: Carpanlar & { a: number };
}
export interface DepoSatiri { mal: string; kalite: Kademe; adet: number }
export type SatirNedeni = "butce" | "stok" | "tavan" | "rakip" | "seviyeTavani";
export interface GunSonuSatiri {
  satir: number; mal: string; kalite: Kademe; fiyat: number; satilan: number; kalan: number; hasilat: number; payYuzde: number;
  carpanlar: Carpanlar; cekicilik: number; bMal: number; npcTavan: number; neden: SatirNedeni | string | null;
}
/** Son ay dönümünün dökümü: kepenkli ay `{ay, kepenk:true}`; kayıt bir sonraki tura kaldıysa `ertelendi`. */
export interface GunSonu {
  ay: number; kepenk: boolean; ertelendi?: boolean;
  hasilat?: number; vergi?: { oran: number; tutar: number }; net?: number; tavan?: { seviye: number; kullanilan: number }; satirlar?: GunSonuSatiri[];
  /** Atölye (Dilim 2) ay dönümü dökümü: atolye-veri.ts `AtolyeGunSonu`. Dükkânda yok. */
  anlik?: boolean; yapim?: number; emek?: { oyuncuOnce: number; oyuncuSonra: number; npcVerilen: number; npcKullanilan: number };
  npc?: NpcDokumu; emirler?: EmirDokumu[];
}
/** Atölyenin NPC emek dökümü: sözleşmeli, emek veren (maaşı emanetten karşılanan), maaşsız ve nedeni. */
export interface NpcDokumu { sozlesme: number; emekVeren: number; maassiz: number; neden: "emanet_maas_yetmez" | string | null }
export type EmirNedeni = "emek_yok" | "girdi_yok" | "arac_yok" | "depo_dolu" | "usta_yok" | "tarif_yok";
/** Ay dönümünde bir üretim emrinin dökümü (sunucu uretim-emri.ts EmirDokumu). */
export interface EmirDokumu {
  emir: number; tarif: string; kez: number; yapilan: number; buAy: number; cikti: { mal: string; adet: number };
  /** Bu ay çıkan adet kalite kademesine göre [sade, iyi, üstün, şaheser]. */
  kalite: [number, number, number, number]; usta: { id: string; ad: string } | null; emek: { oyuncu: number; npc: number };
  neden: EmirNedeni | string | null;
  kaliteDokum?: { kalemler: { k: string; enAz: number; enCok: number }[]; toplam: { enAz: number; enCok: number } } | null;
}
export interface TezgahOzeti { ay: number; meslekler?: { meslek: string; neden: "kimseSatmadi" | "satildi" | string; B?: number; harcanan?: number }[] }
export interface TezgahIzni {
  depoKoy: boolean; depoAl: boolean; raf: boolean; fiyat: boolean; satinAl: boolean;
  /** Dilim 2: genişletme (dükkân ve atölye); atölyede üretim, mesai, emir, toplu teslim, zanaat. Eski sunucuda yok. */
  genislet?: boolean; uret?: boolean; mesai?: boolean; emir?: boolean; toplu?: boolean; zanaat?: boolean;
}
/** Genişletme: kademe (açılmış kapasite) ve işletme seviyesi; sonraki adımın malzemesi depoda var/yok dökümüyle. */
export interface GenisletmeGorunumu {
  kademe: number; seviye: number;
  sonraki: { hedef: number; malzeme: { mal: string; adet: number; depoda: number; taban: number }[] } | null;
}
/** GET /v1/isletme/:id/tezgah (depo, gün sonu ve özet yalnız sahip/yetkili çalışana). */
export interface TezgahGorunumu {
  isletme: string; tur: "dukkan" | "atolye"; ad: string; sahip: { id: string; ad: string }; seviye: number; itibar: number;
  kepenk: boolean; kepenkAy: number; raf: RafSatiri[]; rafSiniri: { satir: number; adet: number }; npcTavanSeviye: number;
  devralinabilir: boolean; izin: TezgahIzni;
  /** Son ay dönümü kepenkli geçti mi (o ay hiç satış olmadı; bakım, borç, maaş ve itibar kaybı işlemedi). Eski sunucuda yok. */
  gecenAyKepenk?: boolean;
  depo?: DepoSatiri[]; depoKapasite?: number; depoDolu?: number; gunSonu?: GunSonu | null; ozet?: TezgahOzeti | null;
  /** Çalışanların depodan çekimleri (yalnız sahip/yetkiliye; `kim` karakter kimliği). Eski sunucuda yok. */
  depoDefteri?: DepoDefterSatiri[];
  /** Dilim 2 (yalnız yetkiliye): genişletme ve atölye bölümü (atolye-veri.ts). Eski sunucuda yok. */
  genisletme?: GenisletmeGorunumu;
  atolye?: AtolyeBolumu;
}
export interface DepoDefterSatiri { ay: number; kim: string; kimAd?: string; mal: string; kalite: Kademe; adet: number }
/** Bir açık üretim emri (tezgâhta). */
export interface UretimEmri { no: number; tarif: string; kez: number; yapilan: number; kalan: number; acilis: number; acan: { id: string; ad: string } }
/** Toplu sipariş (kasabanın atölyelere açtığı büyük sipariş); `depoda`/`teslimEdebilir`/`ustUste` yalnız teslim edebilen atölyeye. */
export interface TopluSiparis {
  id: string; meslek: string; mal: string; adet: number; deger: number; odul: number;
  odulDokum: { toplam: number; kalemler: { k: string; d: number }[] };
  acilis: number; son: number; kalanAy: number; durum: "acik" | "teslim" | "kapandi" | string;
  alan: { isletme: string; ad: string; ay: number | null } | null;
  depoda?: number; teslimEdebilir?: boolean; ustUste?: boolean;
}
/** GET .../tezgah `atolye` (yalnız yetkiliye). */
export interface AtolyeBolumu {
  zanaat: string | null; zanaatOneri: string | null; zanaatlar: string[];
  zanaatDegisim: { yapilan: number; ucretsizKalan: number; bedel: number };
  tezgah: { sayi: number; acikEmir: number }; kaliteBonus: number;
  emek: { havuz: number; tavan: number; npcCalisan: number; npcAylik: number; npc?: NpcDokumu; npcKaliteCeza: number; npcMaasEnAz: number; tekEnCok?: number };
  emirler: UretimEmri[]; emirKezEnCok: number; sonUretimAyi: number | null; topluSiparis: TopluSiparis[]; benimTakat: number;
}
export interface DukkanKarti {
  isletme: string; no: number; ad: string; sahip: { id: string; ad: string }; seviye: number; itibar: number; kepenk: boolean;
  satir: number; mallar: string[]; benim: boolean; devralinabilir: boolean;
}
/** GET /v1/dukkanlar */
export interface DukkanListesi {
  dukkanlar: DukkanKarti[]; yuva: { dukkan: { toplam: number; dolu: number }; atolye: { toplam: number; dolu: number } }; devralmaKepenkAy: number;
  /** Dilim 2: edinim bedelleri. Eski sunucuda yok. */
  bedel?: { dukkan: number; atolye: number };
}
/** GET /v1/isletme/:id/onizle */
export interface Onizleme {
  mal: string; kalite: Kademe; fiyat: number; adet: number; bant: FiyatBandi; npcTavan: number;
  butce: { meslek: string; B: number; kitlik: boolean; malSayisi: number; bMal: number };
  payYuzde: number; carpanlar: Carpanlar; cekicilik: number; rakipSatir: number; tahminiAdet: number; tahminiHasilat: number;
  neden: SatirNedeni | string | null; yontem: string;
}
export interface DepoYaniti {
  depo: { yon: "koy" | "al"; mal: string; kalite: Kademe; adet: number; icerik: DepoSatiri[]; dolu: number; kapasite: number };
  envanter?: Record<string, number>; para?: number;
}
export interface RafYaniti { raf?: RafSatiri[]; satir?: RafSatiri; depoDolu?: number }
export interface SatisYaniti {
  satis: { isletme: string; satir: number; mal: string; kalite: Kademe; adet: number; birim: number; tutar: number; vergi: { oran: number; tutar: number }; kasaya: number; yapan: string | null };
  envanter?: Record<string, number>; para?: number;
}
export interface DevralmaYaniti { devralma: { isletme: string; fiyat: number; eskiSahip: string; iade: { bedel: number; mal: number; kasa: string }; ts: number } }
/** Han kartında ve han panelinde (yalnız sahip/çalışan): son ay dönümünün yolcu payı. */
export interface YolcuKarti { ay: number; payYuzde: number; tutar: number; tavan: number; carpan: { F: number; K: number; R: number; H: number } }

export type RafKomutu =
  | { islem: "koy"; mal: string; kalite?: Kademe; adet: number; fiyat?: number }
  | { islem: "al"; satir: number; adet: number }
  | { islem: "fiyat"; satir: number; fiyat: number };

export interface TezgahIstemci {
  dukkanlar(): Promise<EkSonuc<DukkanListesi>>;
  tezgah(id: string): Promise<EkSonuc<TezgahGorunumu>>;
  onizle(id: string, g: { mal: string; kalite: Kademe; fiyat: number; adet?: number }): Promise<EkSonuc<Onizleme>>;
  depo(id: string, g: { yon: "koy" | "al"; mal: string; kalite?: Kademe; adet: number; istekNo: string }): Promise<EkSonuc<DepoYaniti>>;
  raf(id: string, g: RafKomutu & { istekNo: string }): Promise<EkSonuc<RafYaniti>>;
  satinAl(id: string, g: { satir: number; adet: number; fiyat: number; istekNo: string }): Promise<EkSonuc<SatisYaniti>>;
  devral(id: string, g: { istekNo: string }): Promise<EkSonuc<DevralmaYaniti>>;
}

const dizi = Array.isArray;
const dukkanlarMi = (v: unknown): v is DukkanListesi => nesneMi(v) && dizi(v.dukkanlar) && nesneMi(v.yuva) && nesneMi(v.yuva.dukkan);
const tezgahMi = (v: unknown): v is TezgahGorunumu =>
  nesneMi(v) && metinMi(v.isletme) && dizi(v.raf) && nesneMi(v.rafSiniri) && nesneMi(v.izin) && typeof v.kepenk === "boolean" && nesneMi(v.sahip);
const onizlemeMi = (v: unknown): v is { onizleme: Onizleme } => nesneMi(v) && nesneMi(v.onizleme) && sayiMi(v.onizleme.payYuzde) && nesneMi(v.onizleme.carpanlar);

const yol = (id: string) => "/v1/isletme/" + encodeURIComponent(id);
const sorgu = (g: Record<string, string | number | undefined>) =>
  Object.entries(g).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");

const httpTezgah: TezgahIstemci = {
  dukkanlar: () => ekCagir({ yontem: "GET", yol: "/v1/dukkanlar", tekrar: true }, dukkanlarMi),
  tezgah: (id) => ekCagir({ yontem: "GET", yol: yol(id) + "/tezgah", tekrar: true }, tezgahMi),
  onizle: async (id, g) => {
    const r = await ekCagir({ yontem: "GET", yol: `${yol(id)}/onizle?${sorgu(g)}`, tekrar: true }, onizlemeMi);
    return r.ok ? { ok: true, deger: r.deger.onizleme } : r;
  },
  depo: (id, g) => ekCagir({ yontem: "POST", yol: yol(id) + "/depo", govde: g, tekrar: true }, (v): v is DepoYaniti => nesneMi(v) && nesneMi(v.depo) && dizi(v.depo.icerik)),
  raf: (id, g) => ekCagir({ yontem: "POST", yol: yol(id) + "/raf", govde: g, tekrar: true }, (v): v is RafYaniti => nesneMi(v)),
  satinAl: (id, g) => ekCagir({ yontem: "POST", yol: yol(id) + "/satinal", govde: g, tekrar: true }, (v): v is SatisYaniti => nesneMi(v) && nesneMi(v.satis)),
  devral: (id, g) => ekCagir({ yontem: "POST", yol: yol(id) + "/devral", govde: g, tekrar: true }, (v): v is DevralmaYaniti => nesneMi(v) && nesneMi(v.devralma)),
};

// Sahte istemci uygulama boyunca tek: çarşıdan dükkâna geçince raf ve depo aynı kalır.
let sahteTek: { yer: string; ist: TezgahIstemci } | null = null;

/** Geliştirici/önizlemede sahte tezgâh, yoksa sunucu. */
export function useTezgahIstemci(): TezgahIstemci {
  const o = useOnline();
  const sahte = o.oturum?.tur === "gelistirici";
  const para = o.yerlesim?.ben.para ?? 0;
  const yer = o.yerlesim?.yerlesim.id ?? "develi";
  return useMemo(() => {
    if (!sahte) return httpTezgah;
    if (!sahteTek || sahteTek.yer !== yer) sahteTek = { yer, ist: sahteTezgahIstemci(para, yer) };
    return sahteTek.ist;
  }, [sahte, yer]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ---------------------------------------------------------------- fiyat bandı aynası (yalnız gösterim)

const KALITE_DEGER = [1, 1.25, 1.6, 2.5] as const;
const tabanBul = (mal: string) => (MALLAR as Record<string, { taban: number } | undefined>)[mal]?.taban ?? 0;
/** Rafa çıkabilen mal (tabanı 0 olan mal satılmaz). */
export const rafMali = (mal: string) => tabanBul(mal) > 0;
/** Henüz rafta olmayan mal+kalite için bant, adil fiyat ve NPC tavanı (sunucu raf.ts/hane-butcesi.ts aynası). */
export function bantHesapla(mal: string, q: Kademe): { bant: FiyatBandi; adil: number; npcTavan: number } | null {
  const a = tabanBul(mal) * (KALITE_DEGER[q] ?? 1);
  if (a <= 0) return null;
  return { bant: { alt: Math.max(1, Math.floor(a * 0.5)), ust: Math.max(1, Math.ceil(a * 3)) }, adil: a, npcTavan: Math.floor(1.5 * a + 1e-9) };
}
/** Bant içine sıkıştırılmış tam sayı fiyat. */
export const bantIci = (n: number, b: FiyatBandi) => Math.max(b.alt, Math.min(b.ust, Math.round(n)));

/** İşletme seviye sırası → "onl.isl.sv.<ad>" (kurallar.ts SEVIYELER). */
export const SEVIYE_ADLARI = ["mutevazi", "gelisen", "taninmis", "prestijli", "simge"] as const;
export const seviyeAnahtari = (s: number) => "onl.isl.sv." + (SEVIYE_ADLARI[Math.max(0, Math.min(4, s))] ?? "mutevazi");

/** Tezgâh hata kodu → oyuncu metni anahtarı (genel karşılığı başka bağlamda yazılmış kodlar burada tezgâh diliyle). */
export function tezgahHataAnahtari(kod: EkHata): string {
  if (kod === "yetki_yok") return "onl.tz.h.yetkiYok";
  if (kod === "stok_yok") return "onl.tz.h.stokYok";
  if (kod === "mal_yok") return "onl.tz.h.malYok";
  if (kod === "pompa_siniri") return "onl.tz.h.pompa";
  if (kod === "kendine") return "onl.tz.h.kendine";
  return ekHataAnahtari(kod);
}
/**
 * Başarısız sonucun oyuncu metni. İstemcinin henüz tanımadığı kod (`ham`, ör. çalışanın depodan çekiminde günlük tavan)
 * önce "onl.tz.h.<kod>", sonra "onl.hh.<kod>" anahtarından çevrilir; ikisi de yoksa sakin genel metin.
 */
export function tezgahHataMetni(t: (k: string) => string, s: { hata: EkHata; ham?: string }): string {
  if (s.ham) {
    for (const k of ["onl.tz.h." + s.ham, "onl.hh." + s.ham]) { const v = t(k); if (v !== k) return v; }
    return t("onl.tz.h.bilinmeyen");
  }
  return t(tezgahHataAnahtari(s.hata));
}
/** Ağ ya da sunucu kaynaklı geçici hata: aynı istekNo ile yeniden denenebilir. */
export const geciciHataMi = (kod: EkHata) => kod === "ag_yok" || kod === "zaman_asimi" || kod === "sunucu_hatasi" || kod === "sunucu_yok";

// ---------------------------------------------------------------- oturum belleği (Şimdi rehberi, İşim, Sokak)

let dukkanSon: { hesap: string; liste: DukkanListesi } | null = null;
const tezgahSon = new Map<string, { hesap: string; g: TezgahGorunumu }>();
export function dukkanlariHatirla(hesap: string, l: DukkanListesi) { dukkanSon = { hesap, liste: l }; }
export const hatirlananDukkanlar = (hesap: string): DukkanListesi | null => (dukkanSon && dukkanSon.hesap === hesap ? dukkanSon.liste : null);
export function tezgahHatirla(hesap: string, g: TezgahGorunumu) { tezgahSon.set(g.isletme, { hesap, g }); }
export function hatirlananTezgah(hesap: string, isletme: string): TezgahGorunumu | null {
  const x = tezgahSon.get(isletme);
  return x && x.hesap === hesap ? x.g : null;
}

/** Yetkilinin kendi dükkânında rafa konabilecek mal var mı: depoda satılabilir mal ve boş satır ya da dolmamış satır. */
export function rafaKonabilir(g: TezgahGorunumu): boolean {
  if (g.tur !== "dukkan" || !g.izin.raf || !g.depo?.length) return false;
  const satilir = g.depo.filter((x) => x.adet > 0 && rafMali(x.mal));
  if (!satilir.length) return false;
  if (g.raf.length < g.rafSiniri.satir) return true;
  return satilir.some((x) => g.raf.some((r) => r.mal === x.mal && r.kalite === x.kalite && r.adet < g.rafSiniri.adet));
}

/** İşim kartının tek satır canlı özeti (sayılar sunucudan; sözle). */
export function dukkanOzetMetni(t: (k: string) => string, g: TezgahGorunumu): string {
  if (g.tur === "atolye") {
    const a = g.atolye;
    if (!a) return t(g.kepenk ? "onl.atl.oz.kepenk" : "onl.atl.oz.acik");
    if (!a.zanaat) return t("onl.atl.oz.zanaatYok");
    return applyParams(t("onl.atl.oz.emir"), [a.tezgah.acikEmir, a.tezgah.sayi, a.emek.havuz, a.emek.tavan]);
  }
  const adet = g.raf.reduce((n, x) => n + x.adet, 0);
  const raf = adet > 0 ? applyParams(t("onl.tz.oz.raf"), [g.raf.length, adet]) : t("onl.tz.oz.rafBos");
  const gs = g.gunSonu;
  const gecen = !gs ? null : gs.kepenk ? t("onl.tz.oz.gecenKepenk") : gs.hasilat !== undefined ? applyParams(t("onl.tz.oz.hasilat"), [gs.hasilat]) : null;
  return gecen ? `${raf} · ${gecen}` : raf;
}
