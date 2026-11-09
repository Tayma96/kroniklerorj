// Masa bağlantı yöneticisi: tek WebSocket, kendiliğinden yeniden bağlanma (artan bekleme, sınırlı deneme), kapanış
// kodlarının oyuncu metni, sohbet akışı (yalnız bellekte; ekrandan çıkınca kaybolur, hiçbir yere yazılmaz).
// Sunucu ne derse o: koltuk, sıra ve masa başı yalnız "hosgeldin"/"durum" çerçevesinden okunur.
import { useCallback, useEffect, useReducer, useRef } from "react";
import { istekNoUret } from "./depo";
import { ekHataMi, type EkHata } from "./ek-istemci";
import { hataKoduMu } from "./protokol";
import {
  KAPANIS, useHanIstemci, type HamSoket, type IstemciIletisi, type MasaAnonsu, type MasaGorunumu, type MasaOlayi, type Plaka,
  type SikayetNedeni, type SunucuIletisi,
} from "./han-veri";

/** [PARAMETRE] Akışta bellekte tutulan en çok satır. */
const AKIS_EN_COK = 120;
/** [PARAMETRE] Yeniden bağlanma beklemeleri (ms); bitince oyuncunun dokunması beklenir. */
const BEKLEMELER = [1000, 2000, 4000, 8000, 15000, 30000];
/** Bu kapanışlarda kendiliğinden yeniden bağlanılmaz (başka cihaz, uzaklaştırma, masadan atılma, başka masa). */
const SON_KODLAR: ReadonlySet<number> = new Set(Object.values(KAPANIS));

export type BagDurumu = "baglaniyor" | "acik" | "yeniden" | "kapandi";
export type AkisOgesi =
  | { tur: "ileti"; id: string; hesap: string; ad: string; koltuk: number; metin: string; zaman: number }
  | { tur: "olay"; id: string; olay: MasaOlayi }
  | { tur: "anons"; id: string; anons: MasaAnonsu };

export interface MasaDurumu {
  bag: BagDurumu;
  /** Sıradaki yeniden bağlanma denemesi (0 = ilk bağlantı). */
  deneme: number;
  /** Son kapanış kodu (yeniden bağlanılmayanlar için metin seçer). */
  kapanis: number | null;
  ben: Plaka | null;
  masa: MasaGorunumu | null;
  susturma: { bitis: number | null } | null;
  akis: AkisOgesi[];
  /** Sözleşme/ittifak teklifi → kabul olayı numarası (kabul çerçevesinden türetilir). */
  kabuller: Record<number, number>;
  /** Kişisel sessize alınanlar (sunucunun bu bağlantı için tuttuğu liste). */
  sessiz: string[];
  /** Son anons (masada kısa süre süslü şerit). */
  sonAnons: (MasaAnonsu & { id: string }) | null;
  hata: { kod: EkHata; bitis?: number | null } | null;
  /** Son şikâyet sunucuya ulaştı mı. */
  raporlandi: number;
}

const BASLANGIC: MasaDurumu = { bag: "baglaniyor", deneme: 0, kapanis: null, ben: null, masa: null, susturma: null, akis: [], kabuller: {}, sessiz: [], sonAnons: null, hata: null, raporlandi: 0 };

type Eylem =
  | { t: "bag"; bag: BagDurumu; deneme?: number; kapanis?: number | null }
  | { t: "sunucu"; v: SunucuIletisi; id: string }
  | { t: "hata"; kod: EkHata | null; bitis?: number | null }
  | { t: "sifirla" };

const ekle = (akis: AkisOgesi[], o: AkisOgesi) => (akis.length >= AKIS_EN_COK ? [...akis.slice(akis.length - AKIS_EN_COK + 1), o] : [...akis, o]);
const hataCoz = (h: string): EkHata => (hataKoduMu(h) || ekHataMi(h) ? h : "gecersiz_istek");

function indirge(d: MasaDurumu, e: Eylem): MasaDurumu {
  switch (e.t) {
    case "sifirla": return BASLANGIC;
    case "bag": return { ...d, bag: e.bag, deneme: e.deneme ?? d.deneme, kapanis: e.kapanis === undefined ? d.kapanis : e.kapanis };
    case "hata": return { ...d, hata: e.kod ? { kod: e.kod, ...(e.bitis !== undefined ? { bitis: e.bitis } : {}) } : null };
    case "sunucu": {
      const v = e.v;
      switch (v.t) {
        case "hosgeldin": return { ...d, bag: "acik", deneme: 0, kapanis: null, ben: v.ben, masa: v.masa, susturma: v.susturma, hata: null };
        case "durum": return { ...d, masa: v.masa };
        case "ileti":
          if (d.sessiz.includes(v.hesap)) return d;
          return { ...d, akis: ekle(d.akis, { tur: "ileti", id: e.id, hesap: v.hesap, ad: v.ad, koltuk: v.koltuk, metin: v.metin, zaman: v.zaman }) };
        case "olay": {
          const kabuller = v.olay.tur === "kabul" && v.olay.olay !== undefined ? { ...d.kabuller, [v.olay.olay]: v.olay.no } : d.kabuller;
          return { ...d, kabuller, akis: ekle(d.akis, { tur: "olay", id: e.id, olay: v.olay }) };
        }
        case "anons": return { ...d, sonAnons: { ...v.anons, id: e.id }, akis: ekle(d.akis, { tur: "anons", id: e.id, anons: v.anons }) };
        case "sessiz": return { ...d, sessiz: v.liste };
        case "rapor": return { ...d, raporlandi: d.raporlandi + 1 };
        case "hata": {
          const kod = hataCoz(v.hata);
          return { ...d, hata: { kod, ...(v.bitis !== undefined ? { bitis: v.bitis } : {}) }, ...(kod === "susturuldu" ? { susturma: { bitis: v.bitis ?? null } } : {}) };
        }
      }
    }
  }
  return d;
}

/** Kapanış kodunun i18n anahtarı (yeniden bağlanılmayan kodlar); diğerleri genel kopma metni. */
export function kapanisAnahtari(kod: number | null): string {
  switch (kod) {
    case KAPANIS.baskaBaglanti: return "onl.han.kapanis.baskaBaglanti";
    case KAPANIS.uzaklastirildi: return "onl.han.kapanis.uzaklastirildi";
    case KAPANIS.atildi: return "onl.han.kapanis.atildi";
    case KAPANIS.baskaMasa: return "onl.han.kapanis.baskaMasa";
    default: return "onl.han.kapanis.koptu";
  }
}

let sayac = 0;
const yeniId = () => `a${Date.now().toString(36)}${(sayac++).toString(36)}`;

/** Bir masaya bağlanır; ekrandan çıkınca bağlantıyı kapatır. `no` yoksa bağlanmaz. */
export function useMasa(no: number | undefined) {
  const istemci = useHanIstemci();
  const [d, gonderD] = useReducer(indirge, BASLANGIC);
  const soket = useRef<HamSoket | null>(null);
  const bekleme = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deneme = useRef(0);
  const canli = useRef(true);

  const temizle = () => {
    if (bekleme.current) clearTimeout(bekleme.current);
    bekleme.current = null;
    const s = soket.current;
    soket.current = null;
    s?.kapat();
  };

  const baglan = useCallback(() => {
    if (no === undefined) return;
    temizle();
    const s = istemci.soket(no);
    if (!s) {
      gonderD({ t: "bag", bag: "kapandi", kapanis: null });
      gonderD({ t: "hata", kod: "sunucu_yok" });
      return;
    }
    soket.current = s;
    gonderD({ t: "bag", bag: deneme.current ? "yeniden" : "baglaniyor", deneme: deneme.current });
    s.dinle({
      acildi: () => { /* hosgeldin gelince "acik" olur */ },
      ileti: (v) => {
        if (soket.current !== s) return;
        if (v.t === "hosgeldin") deneme.current = 0;
        gonderD({ t: "sunucu", v, id: yeniId() });
      },
      kapandi: (kod) => {
        if (soket.current !== s || !canli.current) return;
        soket.current = null;
        if (SON_KODLAR.has(kod) || deneme.current >= BEKLEMELER.length) {
          gonderD({ t: "bag", bag: "kapandi", kapanis: kod });
          return;
        }
        const ms = BEKLEMELER[deneme.current]!;
        deneme.current += 1;
        gonderD({ t: "bag", bag: "yeniden", deneme: deneme.current, kapanis: kod });
        bekleme.current = setTimeout(baglan, ms);
      },
    });
  }, [istemci, no]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    canli.current = true;
    deneme.current = 0;
    gonderD({ t: "sifirla" });
    baglan();
    return () => { canli.current = false; temizle(); };
  }, [baglan]); // eslint-disable-line react-hooks/exhaustive-deps

  const gonder = useCallback((ileti: IstemciIletisi) => {
    const s = soket.current;
    if (!s || d.bag !== "acik") { gonderD({ t: "hata", kod: "ag_yok" }); return false; }
    s.gonder(ileti);
    return true;
  }, [d.bag]);

  return {
    durum: d,
    otur: (koltuk?: number) => gonder(koltuk === undefined ? { t: "otur" } : { t: "otur", koltuk }),
    kalk: () => gonder({ t: "kalk" }),
    yaz: (metin: string) => gonder({ t: "yaz", metin }),
    sustur: (hedef: string) => gonder({ t: "sustur", hedef }),
    susturKaldir: (hedef: string) => gonder({ t: "susturKaldir", hedef }),
    at: (hedef: string) => gonder({ t: "at", hedef }),
    oneAl: (hedef: string) => gonder({ t: "oneAl", hedef }),
    rapor: (hedef: string, neden: SikayetNedeni, aciklama?: string) =>
      gonder({ t: "rapor", hedef, neden, ...(aciklama?.trim() ? { aciklama: aciklama.trim() } : {}), istekNo: istekNoUret() }),
    yenidenBaglan: () => { deneme.current = 0; gonderD({ t: "hata", kod: null }); baglan(); },
    hataTemizle: () => gonderD({ t: "hata", kod: null }),
    /** HTTP eylem/ikram yanıtındaki hatayı masadaki banda yazar. */
    hataGoster: (kod: EkHata, bitis?: number | null) => gonderD({ t: "hata", kod, bitis }),
  };
}
