// Kronikler Online HTTP istemcisi: JSON, zaman aşımı, Bearer oturumu, sunucu kodlarından türlü hatalar.
// Yeniden deneme yalnız güvenli isteklerde: GET'ler, aynı istekNo ile POST /v1/profil ve /v1/eylem (sunucu aynı
// istekNo'ya aynı sonucu döndürür; yarıda kalan istek iki kez işlenmez) ve işaret koyan /v1/tanidik (aynı işaret
// ikinci kez konunca durum değişmez). Meslek, temel iş, taban alımı, tarif, satış ve sipariş teslimi de istekNo'lu ve
// tekrar güvenlidir (sunucu motor.ts #tekrarGuvenli). Giriş ve davet oluşturma denenmez.
import { DENEME_SAYISI, sunucuAdresi, ZAMAN_ASIMI_MS } from "./ayar";
import {
  basarili, basarisiz, davetBilgisiMi, davetKoduYanitiMi, dunyaMi, eylemYanitiMi, girisYanitiMi, hataKoduMu, kisiYanitiMi,
  loncaYanitiMi, meslekYanitiMi, satYanitiMi, siparislerYanitiMi, siparisTeslimYanitiMi, tarifYanitiMi,
  type SatIstegi, type SatYaniti, type SiparislerYaniti, type SiparisTeslimIstegi, type SiparisTeslimYaniti, type TarifIstegi, type TarifYaniti, olaylarYanitiMi, profilMi, tabanAlYanitiMi, tanidikYanitiMi, temelIsYanitiMi, yerlesimDurumuMi,
  type LoncaYaniti, type MeslekIstegi, type MeslekYaniti, type TabanAlIstegi, type TabanAlYaniti, type TemelIsIstegi, type TemelIsYaniti,
  type DavetBilgisi, type Dil, type DunyaOzeti, type EylemIstegi, type EylemYaniti, type GirisYaniti, type HataKodu, type Kisi,
  type OlaylarYaniti, type Profil, type ProfilIstegi, type Sonuc, type TanidikIstegi, type TanidikYaniti, type YerlesimDurumu,
} from "./protokol";
import { toplumUclari, type ToplumIstemci } from "./toplum-istemci";

/** Sunucu ve sahte (geliştirici) istemcinin ortak yüzü. */
export interface OnlineIstemci {
  giris(idToken: string): Promise<Sonuc<GirisYaniti>>;
  dunya(): Promise<Sonuc<DunyaOzeti>>;
  profil(): Promise<Sonuc<Profil>>;
  profilOlustur(istek: ProfilIstegi): Promise<Sonuc<Profil>>;
  davetOlustur(): Promise<Sonuc<{ kod: string }>>;
  davetCoz(kod: string): Promise<Sonuc<DavetBilgisi>>;
  // Faz 2: yaşayan yerleşim. `dil` yalnız NPC adlarının yazımını seçer.
  yerlesim(dil: Dil): Promise<Sonuc<YerlesimDurumu>>;
  olaylar(imlec: number, dil: Dil): Promise<Sonuc<OlaylarYaniti>>;
  kisi(id: string, dil: Dil): Promise<Sonuc<Kisi>>;
  eylem(istek: EylemIstegi): Promise<Sonuc<EylemYaniti>>;
  tanidik(istek: TanidikIstegi): Promise<Sonuc<TanidikYaniti>>;
  /** Faz 3a oyuncular arası uçlar (toplum-istemci.ts). */
  toplum: ToplumIstemci;
  // Meslek çekirdeği (ana tasarım §5): istekNo'lu yazmalar ve lonca tablosu.
  meslek(istek: MeslekIstegi): Promise<Sonuc<MeslekYaniti>>;
  temelIs(istek: TemelIsIstegi): Promise<Sonuc<TemelIsYaniti>>;
  tabanAl(istek: TabanAlIstegi): Promise<Sonuc<TabanAlYaniti>>;
  lonca(): Promise<Sonuc<LoncaYaniti>>;
  // Dikey dilim: usta iş (tarif), NPC'ye satış, lonca siparişleri.
  tarif(istek: TarifIstegi): Promise<Sonuc<TarifYaniti>>;
  sat(istek: SatIstegi): Promise<Sonuc<SatYaniti>>;
  siparisler(dil: Dil): Promise<Sonuc<SiparislerYaniti>>;
  siparisTeslim(istek: SiparisTeslimIstegi): Promise<Sonuc<SiparisTeslimYaniti>>;
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
    yerlesim: (dil) => cagir({ yontem: "GET", yol: `/v1/yerlesim?dil=${dil}`, yetki: true, tekrar: true }, yerlesimDurumuMi),
    olaylar: (imlec, dil) =>
      cagir({ yontem: "GET", yol: `/v1/olaylar?imlec=${Math.max(0, Math.floor(imlec))}&dil=${dil}`, yetki: true, tekrar: true }, olaylarYanitiMi),
    kisi: (id, dil) => cagir({ yontem: "GET", yol: `/v1/kisi/${encodeURIComponent(id)}?dil=${dil}`, yetki: true, tekrar: true }, kisiYanitiMi),
    // Aynı gövde (aynı istekNo) ile yeniden denenir; sunucu ikinci kez işlemez, ilk yanıtı döndürür.
    eylem: (istek) => cagir({ yontem: "POST", yol: "/v1/eylem", govde: istek, yetki: true, tekrar: true }, eylemYanitiMi),
    tanidik: (istek) => cagir({ yontem: "POST", yol: "/v1/tanidik", govde: istek, yetki: true, tekrar: true }, tanidikYanitiMi),
    toplum: toplumUclari(cagir),
    meslek: (istek) => cagir({ yontem: "POST", yol: "/v1/meslek", govde: istek, yetki: true, tekrar: true }, meslekYanitiMi),
    temelIs: (istek) => cagir({ yontem: "POST", yol: "/v1/temel-is", govde: istek, yetki: true, tekrar: true }, temelIsYanitiMi),
    tabanAl: (istek) => cagir({ yontem: "POST", yol: "/v1/taban-al", govde: istek, yetki: true, tekrar: true }, tabanAlYanitiMi),
    lonca: () => cagir({ yontem: "GET", yol: "/v1/lonca", yetki: true, tekrar: true }, loncaYanitiMi),
    tarif: (istek) => cagir({ yontem: "POST", yol: "/v1/tarif", govde: istek, yetki: true, tekrar: true }, tarifYanitiMi),
    sat: (istek) => cagir({ yontem: "POST", yol: "/v1/sat", govde: istek, yetki: true, tekrar: true }, satYanitiMi),
    siparisler: (dil) => cagir({ yontem: "GET", yol: `/v1/siparisler?dil=${dil}`, yetki: true, tekrar: true }, siparislerYanitiMi),
    siparisTeslim: (istek) => cagir({ yontem: "POST", yol: "/v1/siparis/teslim", govde: istek, yetki: true, tekrar: true }, siparisTeslimYanitiMi),
  };
}
