// Künye (oyuncu numarası, arama, oyuncu sayfası): GET /v1/numara, GET /v1/oyuncu-ara?no= | ?ad=&imlec=, GET /v1/kunye/:numara?dil=.
// Biçimler online-server/src/kunye/{hesap,gorunum}.ts ile birebir (brief: docs/superpowers/specs/2026-11-17-oyuncu-no-istemci-brief.md).
// Sunucu numarayı sayı olarak döndürür; istemci 8 haneli metne çevirir. Arama ve sayfa sunucuda sınırlanır; istemci yalnız
// gereksiz isteği önler (3 harften önce ad, 8 haneden önce numara araması yok) ve hız sınırında kendiliğinden yeniden denemez.
import { useMemo } from "react";
import { useOnline } from "./durum";
import { ekBasarili, ekCagir, metinMi, nesneMi, sayiMi, type EkSonuc } from "./ek-istemci";
import { hataAnahtari } from "./hata";
import { NAMLAR, type Dil, type OnlineHata } from "./protokol";

export type CevrimiciDurum = "simdi" | "bugun" | "uzak";
export const UNVANLAR = ["cirak", "kalfa", "usta", "pir"] as const;
export type Unvan = (typeof UNVANLAR)[number];

/** Arama sonucu kartı (SONUC_ALANLARI). */
export interface KunyeKarti {
  numara: string;
  ad: string;
  yerlesim: { id: string; ad: string };
  beylik: { id: string; ad: string };
}
export interface AramaYaniti { sonuclar: KunyeKarti[]; imlec: string | null }

/** Oyuncu sayfası (SAYFA_ALANLARI): yalnız herkese açık alanlar. */
export interface Kunye {
  numara: string;
  ad: string;
  ben: boolean;
  ayniYerlesim: boolean;
  yerlesim: { id: string; ad: string };
  beylik: { id: string; ad: string };
  meslek: { ana: string | null; anaUnvan: Unvan | null; yan: string | null; yanUnvan: Unvan | null };
  hanedan: { soyad: string; nesil: number };
  nam: Record<(typeof NAMLAR)[number], number>;
  /** Teveccüh kademesi (0..5). */
  teveccuh: number;
  isletmeler: { tur: string; no: number; ad: string }[];
  durum: CevrimiciDurum;
  olu: boolean;
  /** Sosyal eylemler için yerel kimlik (`/v1/oyuncu/:id`). */
  kisi: { yerlesim: string; id: string };
}

// ---- Numara biçimi ----

/** Sunucunun 8 haneli, 0 ile başlamayan numarası. */
export const numaraGecerliMi = (s: string) => /^[1-9][0-9]{7}$/.test(s);
/** Kullanıcı girdisinden rakamlar (boşluk ve tire atılır); başka karakter varsa null. */
export function numaraTemizle(ham: string): string | null {
  const s = ham.replace(/[\s-]/g, "");
  return /^[0-9]+$/.test(s) ? s : null;
}
/** Okunaklı yazım: 1234 5678 (yarım girdide de gruplar). */
export const numaraBicim = (s: string) => (s.length > 4 ? `${s.slice(0, 4)} ${s.slice(4)}` : s);
/** Ekran okuyucu için rakam rakam: "1 2 3 4, 5 6 7 8". */
export const numaraSesli = (s: string) => `${s.slice(0, 4).split("").join(" ")}, ${s.slice(4).split("").join(" ")}`;

const numaraOku = (v: unknown): string | null => {
  const s = sayiMi(v) ? String(Math.trunc(v)) : metinMi(v) ? v : null;
  return s && numaraGecerliMi(s) ? s : null;
};

export const kunyeYolu = (numara: string) => `/online/kunye/${numara}`;

/** Ad önekinde sayılan harfler (sunucu: boşluk ve kesme sayılmaz). */
export const AD_EN_AZ = 3;
export const adHarfSayisi = (s: string) => s.replace(/[\s'’`]/g, "").length;

/** Arama kutusundaki metnin niyeti: boş, numara (eksik/geçersiz/tam), kısa ad, ad. */
export type AramaNiyeti =
  | { tur: "bos" }
  | { tur: "numaraEksik"; rakam: number }
  | { tur: "numaraGecersiz" }
  | { tur: "numara"; no: string }
  | { tur: "adKisa"; harf: number }
  | { tur: "ad"; ad: string };

export function aramaNiyeti(ham: string): AramaNiyeti {
  const metin = ham.trim();
  if (!metin) return { tur: "bos" };
  const no = numaraTemizle(metin);
  if (no !== null) {
    if (no.startsWith("0") || no.length > 8) return { tur: "numaraGecersiz" };
    return no.length < 8 ? { tur: "numaraEksik", rakam: no.length } : { tur: "numara", no };
  }
  const harf = adHarfSayisi(metin);
  return harf < AD_EN_AZ ? { tur: "adKisa", harf } : { tur: "ad", ad: metin.replace(/\s+/g, " ").slice(0, 40) };
}

// ---- Biçim denetimi ----

const kimlikAdMi = (v: unknown): v is { id: string; ad: string } => nesneMi(v) && metinMi(v.id) && metinMi(v.ad);
const unvanOku = (v: unknown): Unvan | null => ((UNVANLAR as readonly unknown[]).includes(v) ? (v as Unvan) : null);
const metinYaDaNull = (v: unknown) => (metinMi(v) && v ? v : null);

function kartOku(v: unknown): KunyeKarti | null {
  if (!nesneMi(v)) return null;
  const numara = numaraOku(v.numara);
  if (!numara || !metinMi(v.ad) || !kimlikAdMi(v.yerlesim) || !kimlikAdMi(v.beylik)) return null;
  return { numara, ad: v.ad, yerlesim: { id: v.yerlesim.id, ad: v.yerlesim.ad }, beylik: { id: v.beylik.id, ad: v.beylik.ad } };
}

function aramaOku(v: unknown): AramaYaniti | null {
  if (!nesneMi(v) || !Array.isArray(v.sonuclar) || !(v.imlec === null || metinMi(v.imlec))) return null;
  const sonuclar = v.sonuclar.map(kartOku).filter((k): k is KunyeKarti => !!k);
  return { sonuclar, imlec: v.imlec || null };
}

function kunyeOku(v: unknown): Kunye | null {
  if (!nesneMi(v)) return null;
  const numara = numaraOku(v.numara);
  const m = v.meslek, h = v.hanedan, nm = v.nam, ks = v.kisi;
  if (!numara || !metinMi(v.ad) || typeof v.ben !== "boolean" || typeof v.ayniYerlesim !== "boolean" || !kimlikAdMi(v.yerlesim) || !kimlikAdMi(v.beylik)) return null;
  if (!nesneMi(m) || !nesneMi(h) || !metinMi(h.soyad) || !sayiMi(h.nesil) || !nesneMi(nm) || !nesneMi(ks) || !metinMi(ks.yerlesim) || !metinMi(ks.id)) return null;
  if (!sayiMi(v.teveccuh) || !Array.isArray(v.isletmeler) || !(v.durum === "simdi" || v.durum === "bugun" || v.durum === "uzak") || typeof v.olu !== "boolean") return null;
  const ana = metinYaDaNull(m.ana), yan = metinYaDaNull(m.yan);
  return {
    numara, ad: v.ad, ben: v.ben, ayniYerlesim: v.ayniYerlesim,
    yerlesim: { id: v.yerlesim.id, ad: v.yerlesim.ad }, beylik: { id: v.beylik.id, ad: v.beylik.ad },
    meslek: { ana, anaUnvan: ana ? unvanOku(m.anaUnvan) : null, yan, yanUnvan: yan ? unvanOku(m.yanUnvan) : null },
    hanedan: { soyad: h.soyad, nesil: Math.max(1, Math.trunc(h.nesil)) },
    nam: Object.fromEntries(NAMLAR.map((n) => [n, sayiMi(nm[n]) ? nm[n] : 0])) as Kunye["nam"],
    teveccuh: Math.max(0, Math.min(5, Math.trunc(v.teveccuh))),
    isletmeler: v.isletmeler.filter((x): x is { tur: string; no: number; ad: unknown } => nesneMi(x) && metinMi(x.tur) && sayiMi(x.no))
      .map((x) => ({ tur: x.tur, no: x.no, ad: metinMi(x.ad) ? x.ad : "" })),
    durum: v.durum, olu: v.olu, kisi: { yerlesim: ks.yerlesim, id: ks.id },
  };
}

/** Biçim denetimi + dönüştürme: ekCagir'in tip koruyucusuyla çalışması için ara kutu. */
type Kutu<T> = { __kutu: T };
const kutula = <T,>(oku: (v: unknown) => T | null) => {
  let son: T | null = null;
  const bicim = (v: unknown): v is Kutu<T> => (son = oku(v)) !== null;
  return { bicim, al: () => son as T };
};
async function cagir<T>(yol: string, oku: (v: unknown) => T | null): Promise<EkSonuc<T>> {
  const k = kutula(oku);
  const r = await ekCagir({ yontem: "GET", yol, tekrar: true }, k.bicim);
  return r.ok ? ekBasarili(k.al()) : r;
}

// ---- Hata metinleri ----

/** Künyenin kendi kodları (ortak listede yok; ekCagir bunları `ham` ile taşır). */
export type KunyeHata = OnlineHata | "arama_kisa" | "arama_siniri" | "numara_gecersiz";
const KUNYE_KODLARI = ["arama_kisa", "arama_siniri", "numara_gecersiz"] as const;
const kunyeHatasi = <T,>(r: EkSonuc<T>): KunyeSonuc<T> => {
  if (r.ok) return r;
  const ham = (r as { ham?: string }).ham;
  if (ham && (KUNYE_KODLARI as readonly string[]).includes(ham)) return { ok: false, hata: ham as KunyeHata };
  return { ok: false, hata: r.hata as KunyeHata };
};
export type KunyeSonuc<T> = { ok: true; deger: T } | { ok: false; hata: KunyeHata };

/** Sıcak, suçlamayan metin anahtarları (onl.kn.h.*); ortak kodlar hata.ts'ten. */
export function kunyeHataAnahtari(h: KunyeHata): string {
  switch (h) {
    case "arama_kisa": return "onl.kn.h.kisa";
    case "arama_siniri": return "onl.kn.h.gunluk";
    case "numara_gecersiz": return "onl.kn.h.numara";
    case "kisi_yok": case "bulunamadi": return "onl.kn.h.kisiYok";
    case "hiz_siniri": return "onl.kn.h.hiz";
    case "profil_yok": return "onl.kn.h.profilYok";
    default: return hataAnahtari(h);
  }
}
/** Bu hatalarda "yeniden dene" sunulmaz: bekleyince ya da yarın açılır. */
export const kunyeBekletir = (h: KunyeHata) => h === "hiz_siniri" || h === "arama_siniri";

// ---- İstemci ----

export interface KunyeIstemci {
  numaram(): Promise<KunyeSonuc<string>>;
  numaraAra(no: string): Promise<KunyeSonuc<AramaYaniti>>;
  adAra(ad: string, imlec: string | null): Promise<KunyeSonuc<AramaYaniti>>;
  sayfa(numara: string, dil: Dil): Promise<KunyeSonuc<Kunye>>;
  sahte?: boolean;
}

const httpKunye: KunyeIstemci = {
  numaram: async () => kunyeHatasi(await cagir("/v1/numara", (v) => (nesneMi(v) ? numaraOku(v.numara) : null))),
  numaraAra: async (no) => kunyeHatasi(await cagir(`/v1/oyuncu-ara?no=${encodeURIComponent(no)}`, aramaOku)),
  adAra: async (ad, imlec) => kunyeHatasi(await cagir(`/v1/oyuncu-ara?ad=${encodeURIComponent(ad)}${imlec ? `&imlec=${encodeURIComponent(imlec)}` : ""}`, aramaOku)),
  sayfa: async (numara, dil) => kunyeHatasi(await cagir(`/v1/kunye/${encodeURIComponent(numara)}?dil=${dil}`, kunyeOku)),
};

// ---- Önizleme (geliştirici) ----

const SAHTE_BEN = "27481935";
const SAHTE: Kunye[] = [
  { numara: "51830264", ad: "Ayşe", ben: false, ayniYerlesim: true, yerlesim: { id: "kayalar", ad: "Kayalar" }, beylik: { id: "karasi", ad: "Karesi" },
    meslek: { ana: "dokumaci", anaUnvan: "kalfa", yan: "asci", yanUnvan: "cirak" }, hanedan: { soyad: "Akyol", nesil: 2 },
    nam: { comertlik: 9, dindarlik: 3, mertlik: 6, caliskanlik: 14 }, teveccuh: 3, isletmeler: [{ tur: "dukkan", no: 1, ad: "Ayşe'nin Tezgâhı" }],
    durum: "simdi", olu: false, kisi: { yerlesim: "kayalar", id: "o1" } },
  { numara: "63019487", ad: "Kerem", ben: false, ayniYerlesim: true, yerlesim: { id: "kayalar", ad: "Kayalar" }, beylik: { id: "karasi", ad: "Karesi" },
    meslek: { ana: "marangoz", anaUnvan: "cirak", yan: null, yanUnvan: null }, hanedan: { soyad: "Demirtaş", nesil: 1 },
    nam: { comertlik: 2, dindarlik: 1, mertlik: 3, caliskanlik: 7 }, teveccuh: 1, isletmeler: [], durum: "bugun", olu: false, kisi: { yerlesim: "kayalar", id: "o2" } },
  { numara: "70562318", ad: "Kerime", ben: false, ayniYerlesim: false, yerlesim: { id: "bursa", ad: "Bursa" }, beylik: { id: "osmanli", ad: "Osmanoğulları" },
    meslek: { ana: "demirci", anaUnvan: "usta", yan: null, yanUnvan: null }, hanedan: { soyad: "Ulubey", nesil: 3 },
    nam: { comertlik: 4, dindarlik: 11, mertlik: 18, caliskanlik: 21 }, teveccuh: 4,
    isletmeler: [{ tur: "atolye", no: 1, ad: "" }, { tur: "han", no: 2, ad: "Kerime Hanı" }], durum: "uzak", olu: false, kisi: { yerlesim: "bursa", id: "o7" } },
  { numara: "84215906", ad: "Kerim", ben: false, ayniYerlesim: false, yerlesim: { id: "sogut", ad: "Söğüt" }, beylik: { id: "osmanli", ad: "Osmanoğulları" },
    meslek: { ana: null, anaUnvan: null, yan: null, yanUnvan: null }, hanedan: { soyad: "Kaya", nesil: 1 },
    nam: { comertlik: 0, dindarlik: 0, mertlik: 1, caliskanlik: 0 }, teveccuh: 0, isletmeler: [], durum: "uzak", olu: true, kisi: { yerlesim: "sogut", id: "o3" } },
];
const harfKucuk = (s: string) => s.toLocaleLowerCase("tr");
const kartYap = (k: Kunye): KunyeKarti => ({ numara: k.numara, ad: k.ad, yerlesim: k.yerlesim, beylik: k.beylik });

function sahteKunye(benAd: string): KunyeIstemci {
  const ben: Kunye = { ...SAHTE[0]!, numara: SAHTE_BEN, ad: benAd || "?", ben: true, durum: "simdi", kisi: { yerlesim: "kayalar", id: "o3" }, isletmeler: [] };
  const hepsi = [ben, ...SAHTE];
  return {
    sahte: true,
    numaram: async () => ({ ok: true, deger: SAHTE_BEN }),
    numaraAra: async (no) => ({ ok: true, deger: { sonuclar: hepsi.filter((k) => k.numara === no).map(kartYap), imlec: null } }),
    adAra: async (ad, imlec) => {
      if (adHarfSayisi(ad) < AD_EN_AZ) return { ok: false, hata: "arama_kisa" };
      const bulunan = hepsi.filter((k) => harfKucuk(k.ad).startsWith(harfKucuk(ad.trim()))).map(kartYap);
      const bas = imlec ? Number(imlec) : 0;
      const sayfa = bulunan.slice(bas, bas + 2); // önizlemede "daha fazla"yı görmek için küçük sayfa
      return { ok: true, deger: { sonuclar: sayfa, imlec: bas + 2 < bulunan.length ? String(bas + 2) : null } };
    },
    sayfa: async (numara) => {
      const k = hepsi.find((x) => x.numara === numara);
      return k ? { ok: true, deger: k } : numaraGecerliMi(numara) ? { ok: false, hata: "kisi_yok" } : { ok: false, hata: "numara_gecersiz" };
    },
  };
}

export function useKunyeIstemci(): KunyeIstemci {
  const o = useOnline();
  const sahte = o.oturum?.tur === "gelistirici";
  const benAd = o.profil?.ad ?? "";
  return useMemo(() => (sahte ? sahteKunye(benAd) : httpKunye), [sahte, benAd]);
}

