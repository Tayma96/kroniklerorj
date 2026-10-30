// Kronikler Online HTTP istemcisi: JSON, zaman aşımı, Bearer oturumu, sunucu kodlarından türlü hatalar.
// Yeniden deneme yalnız güvenli isteklerde: GET'ler ve aynı istekNo ile POST /v1/profil (sunucu aynı
// istekNo'ya aynı sonucu döndürür; yarıda kalan istek iki kez işlenmez). Giriş ve davet oluşturma denenmez.
import { DENEME_SAYISI, sunucuAdresi, ZAMAN_ASIMI_MS } from "./ayar";
import {
  basarili, basarisiz, davetBilgisiMi, davetKoduYanitiMi, dunyaMi, girisYanitiMi, hataKoduMu, profilMi,
  type DavetBilgisi, type DunyaOzeti, type GirisYaniti, type HataKodu, type Profil, type ProfilIstegi, type Sonuc,
} from "./protokol";

/** Sunucu ve sahte (geliştirici) istemcinin ortak yüzü. */
export interface OnlineIstemci {
  giris(idToken: string): Promise<Sonuc<GirisYaniti>>;
  dunya(): Promise<Sonuc<DunyaOzeti>>;
  profil(): Promise<Sonuc<Profil>>;
  profilOlustur(istek: ProfilIstegi): Promise<Sonuc<Profil>>;
  davetOlustur(): Promise<Sonuc<{ kod: string }>>;
  davetCoz(kod: string): Promise<Sonuc<DavetBilgisi>>;
}

export interface HttpAyari {
  /** Worker adresi; boşsa her çağrı "sunucu_yok" döner. */
  adres?: string;
  /** O anki oturum belirteci (yoksa yetkili uçlar sunucudan oturum_yok alır). */
  oturum: () => string | null;
  fetch?: typeof fetch;
  zamanAsimiMs?: number;
  deneme?: number;
  bekle?: (ms: number) => Promise<void>;
}

type Istek = { yontem: "GET" | "POST"; yol: string; govde?: unknown; yetki: boolean; tekrar: boolean };

const uyu = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
/** Geçici sayılan durumlar: ağ, zaman aşımı, sunucu/ağ geçidi hataları. 4xx asla yeniden denenmez. */
const geciciMi = (hata: string, durum: number) =>
  hata === "ag_yok" || hata === "zaman_asimi" || durum === 500 || durum === 502 || durum === 503 || durum === 504;

function durumdanHata(durum: number): HataKodu {
  if (durum === 401) return "oturum_gecersiz";
  if (durum === 404) return "bulunamadi";
  if (durum === 429) return "hiz_siniri";
  if (durum >= 500) return "sunucu_hatasi";
  return "gecersiz_istek";
}

export function httpIstemci(ayar: HttpAyari): OnlineIstemci {
  const adres = sunucuAdresi(ayar.adres ?? "");
  const getir = ayar.fetch ?? ((url: string, init?: RequestInit) => fetch(url, init));
  const zamanAsimi = ayar.zamanAsimiMs ?? ZAMAN_ASIMI_MS;
  const deneme = Math.max(1, ayar.deneme ?? DENEME_SAYISI);
  const bekle = ayar.bekle ?? uyu;

  /** Tek deneme: [sonuç, HTTP durumu (ağ hatasında 0)]. */
  async function birKez(taban: string, istek: Istek): Promise<[Sonuc<unknown>, number]> {
    const basliklar: Record<string, string> = { accept: "application/json" };
    if (istek.govde !== undefined) basliklar["content-type"] = "application/json";
    if (istek.yetki) {
      const belirtec = ayar.oturum();
      if (belirtec) basliklar.authorization = `Bearer ${belirtec}`;
    }
    const iptal = new AbortController();
    const zamanlayici = setTimeout(() => iptal.abort(), zamanAsimi);
    let yanit: Response;
    try {
      yanit = await getir(taban + istek.yol, {
        method: istek.yontem,
        headers: basliklar,
        body: istek.govde === undefined ? undefined : JSON.stringify(istek.govde),
        signal: iptal.signal,
      });
    } catch {
      return [basarisiz(iptal.signal.aborted ? "zaman_asimi" : "ag_yok"), 0];
    } finally {
      clearTimeout(zamanlayici);
    }
    let veri: unknown;
    try {
      veri = await yanit.json();
    } catch {
      veri = undefined;
    }
    if (yanit.ok) return [veri === undefined ? basarisiz("gecersiz_yanit") : basarili(veri), yanit.status];
    const kod = typeof veri === "object" && veri !== null ? (veri as { hata?: unknown }).hata : undefined;
    return [basarisiz(hataKoduMu(kod) ? kod : durumdanHata(yanit.status)), yanit.status];
  }

  async function cagir<T>(istek: Istek, bicim: (v: unknown) => v is T): Promise<Sonuc<T>> {
    if (!adres) return basarisiz("sunucu_yok");
    const sinir = istek.tekrar ? deneme : 1;
    let son: Sonuc<unknown> = basarisiz("ag_yok");
    for (let n = 0; n < sinir; n++) {
      if (n > 0) await bekle(400 * 3 ** (n - 1)); // 400 ms, 1,2 sn
      const [sonuc, durum] = await birKez(adres, istek);
      son = sonuc;
      if (sonuc.ok || !geciciMi(sonuc.hata, durum)) break;
    }
    if (!son.ok) return son;
    return bicim(son.deger) ? basarili(son.deger) : basarisiz("gecersiz_yanit");
  }

  return {
    giris: (idToken) => cagir({ yontem: "POST", yol: "/v1/giris", govde: { idToken }, yetki: false, tekrar: false }, girisYanitiMi),
    dunya: () => cagir({ yontem: "GET", yol: "/v1/dunya", yetki: false, tekrar: true }, dunyaMi),
    profil: () => cagir({ yontem: "GET", yol: "/v1/profil", yetki: true, tekrar: true }, profilMi),
    // Aynı gövde (aynı istekNo) ile yeniden denenir.
    profilOlustur: (istek) => cagir({ yontem: "POST", yol: "/v1/profil", govde: istek, yetki: true, tekrar: true }, profilMi),
    davetOlustur: () => cagir({ yontem: "POST", yol: "/v1/davet", yetki: true, tekrar: false }, davetKoduYanitiMi),
    davetCoz: (kod) => cagir({ yontem: "GET", yol: `/v1/davet/${encodeURIComponent(kod)}`, yetki: true, tekrar: true }, davetBilgisiMi),
  };
}
