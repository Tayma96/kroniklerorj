// Geliştirici oturumu ve tasarım önizlemesi için sahte istemci: sunucuya hiç bağlanmaz, bellekte çalışır.
// Yalnız ONLINE_GELISTIRME açıkken (ya da önizlemede) kullanılır. Dünya verisi online-server/src/dunya-veri.ts'in
// kopyasıdır (sunucu paketi içe aktarılmaz); doluluk sayıları uydurmadır.
import type { OnlineIstemci } from "./istemci";
import { adDogrula } from "./ad";
import {
  basarili, basarisiz, BASLANGIC_YASI, davetKoduGecerli, davetKoduTemizle, yerlesimBul,
  type BeylikOzeti, type DavetBilgisi, type DunyaOzeti, type Mevsim, type Profil, type YerlesimTuru,
} from "./protokol";

const AY_MS = 12 * 60 * 60 * 1000;
const DUNYA_BASLANGICI_MS = Date.UTC(2026, 9, 31, 21, 0, 0);
const KAPASITE: Record<YerlesimTuru, { evKapasite: number; npc: number }> = {
  koy: { evKapasite: 25, npc: 80 },
  kasaba: { evKapasite: 60, npc: 200 },
  sehir: { evKapasite: 150, npc: 400 },
};

type Ad = readonly [string, string];
const VERI: readonly [string, string, Ad, Ad[], Ad[]][] = [
  ["demirhan", "Demirhan Beyliği", ["demirhan", "Demirhan"], [["develi", "Develi"], ["karapinar", "Karapınar"]],
    [["yassioren", "Yassıören"], ["kizilca", "Kızılca"], ["camlibel", "Çamlıbel"], ["ortakoy", "Ortaköy"], ["sariyurt", "Sarıyurt"]]],
  ["yenisehir", "Yenişehir Sancağı", ["yenisehir", "Yenişehir"], [["konuralp", "Konuralp"], ["akyazi", "Akyazı"], ["tarakli", "Taraklı"]],
    [["sogutlu", "Söğütlü"], ["kavakli", "Kavaklı"], ["yenice", "Yenice"], ["derekoy", "Dereköy"], ["kirazli", "Kirazlı"], ["elmalik", "Elmalık"]]],
  ["gumushisar", "Gümüşhisar Beyliği", ["gumushisar", "Gümüşhisar"], [["alasehir", "Alaşehir"], ["esme", "Eşme"]],
    [["bagarasi", "Bağarası"], ["caltili", "Çaltılı"], ["sazkoy", "Sazköy"], ["taslik", "Taşlık"]]],
  ["aksehir", "Akşehir Sancağı", ["aksehir", "Akşehir"], [["ilgin", "Ilgın"], ["beysehir", "Beyşehir"], ["egirdir", "Eğirdir"]],
    [["doganhisar", "Doğanhisar"], ["golyaka", "Gölyaka"], ["ciftlik", "Çiftlik"], ["karaagac", "Karaağaç"], ["sultandere", "Sultandere"]]],
  ["karahisar", "Karahisar Beyliği", ["karahisar", "Karahisar"], [["honaz", "Honaz"], ["sandikli", "Sandıklı"]],
    [["kayadibi", "Kayadibi"], ["isikli", "Işıklı"], ["pinarbasi", "Pınarbaşı"], ["akoren", "Akören"]]],
  ["taseli", "Taşeli Beyliği", ["taskale", "Taşkale"], [["gulnar", "Gülnar"], ["sariveliler", "Sarıveliler"]],
    [["bucakkisla", "Bucakkışla"], ["yellibel", "Yellibel"], ["gokceseki", "Gökçeseki"], ["cukurbag", "Çukurbağ"], ["kozagac", "Kozağaç"]]],
  ["cukurova", "Çukurova Sancağı", ["misis", "Misis"], [["kozan", "Kozan"], ["ceyhan", "Ceyhan"], ["yumurtalik", "Yumurtalık"]],
    [["saricam", "Sarıçam"], ["incirlik", "İncirlik"], ["karatas", "Karataş"], ["tuzla", "Tuzla"], ["akdam", "Akdam"]]],
];

/** Kimlikten kararlı sahte doluluk (0..1); birkaç köy bilerek dolu. */
function sahteOran(id: string): number {
  if (id === "yassioren" || id === "kirazli") return 1;
  let h = 7;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return ((h % 1000) / 1000) * 0.92;
}

function beylikler(): BeylikOzeti[] {
  return VERI.map(([id, ad, sehir, kasabalar, koyler]) => ({
    id,
    ad,
    yerlesimler: [
      ...[sehir].map((y) => [y, "sehir"] as const),
      ...kasabalar.map((y) => [y, "kasaba"] as const),
      ...koyler.map((y) => [y, "koy"] as const),
    ].map(([[yid, yad], tur]) => {
      const k = KAPASITE[tur];
      return { id: yid, ad: yad, tur, ...k, nufus: Math.round(k.evKapasite * sahteOran(yid)) };
    }),
  }));
}

function mevsim(ay: number): Mevsim {
  if (ay === 12 || ay <= 2) return "kis";
  if (ay <= 5) return "ilkbahar";
  if (ay <= 8) return "yaz";
  return "sonbahar";
}

/** Sunucu saatinin aynısı; dünya henüz başlamadıysa 1250 Ocak'ta durur. */
export function sahteDunya(simdi = Date.now()): DunyaOzeti {
  const oyunAyi = Math.max(0, Math.floor((simdi - DUNYA_BASLANGICI_MS) / AY_MS));
  const ay = (oyunAyi % 12) + 1;
  // Dünya başlamadan önce sahte bir dönüm (5 sa 12 dk sonra) gösterilir.
  const sonrakiDonum = simdi >= DUNYA_BASLANGICI_MS ? DUNYA_BASLANGICI_MS + (oyunAyi + 1) * AY_MS : simdi + 312 * 60_000;
  return {
    saat: { simdi, oyunAyi, yil: 1250 + Math.floor(oyunAyi / 12), ay, mevsim: mevsim(ay), sonrakiDonum },
    beylikler: beylikler(),
  };
}

/** Örnek davet kodu (önizleme ve geliştirici denemesi): Develi'den Ayşe çağırır. */
export const SAHTE_DAVET_KODU = "K7M2QX";
const SAHTE_DAVET: DavetBilgisi = { kod: SAHTE_DAVET_KODU, yerlesim: "develi", beylik: "demirhan", davetEden: "Ayşe" };
/** Önizlemede alınmış gösterilen adlar. */
const ALINMIS = new Set(["ayşe", "kerem"]);

export function sahteProfil(ad: string, cinsiyet: Profil["cinsiyet"], yerlesim: string, beylik: string, davetEden?: string): Profil {
  const d = sahteDunya();
  return {
    hesapId: "gelistirici", ad, cinsiyet, beylik, yerlesim,
    dogumAyi: d.saat.oyunAyi - BASLANGIC_YASI * 12, olusturma: Date.now(),
    ...(davetEden ? { davetEden } : {}),
  };
}

export function sahteIstemci(gecikmeMs = 450): OnlineIstemci {
  const dunya = sahteDunya();
  let profil: Profil | null = null;
  const bekle = () => new Promise<void>((r) => setTimeout(r, gecikmeMs));
  return {
    async giris() { await bekle(); return basarili({ oturum: "gelistirici", profilVar: profil !== null }); },
    async dunya() { await bekle(); return basarili(sahteDunya()); },
    async profil() { await bekle(); return profil ? basarili(profil) : basarisiz("profil_yok"); },
    async profilOlustur(istek) {
      await bekle();
      if (profil) return basarili(profil);
      const ad = adDogrula(istek.ad);
      if (!ad.ok) return basarisiz(ad.hata);
      if (ALINMIS.has(ad.ad.toLocaleLowerCase("tr"))) return basarisiz("ad_alinmis");
      let yerlesimId = istek.yerlesim;
      let davetEden: string | undefined;
      if (istek.davet) {
        if (davetKoduTemizle(istek.davet) !== SAHTE_DAVET_KODU) return basarisiz("davet_yok");
        yerlesimId = SAHTE_DAVET.yerlesim;
        davetEden = SAHTE_DAVET.davetEden;
      }
      const bulunan = yerlesimId ? yerlesimBul(dunya, yerlesimId) : undefined;
      if (!bulunan) return basarisiz("yerlesim_gecersiz");
      if (!davetEden && bulunan.yerlesim.nufus >= bulunan.yerlesim.evKapasite) return basarisiz("yerlesim_dolu");
      bulunan.yerlesim.nufus += 1;
      profil = sahteProfil(ad.ad, istek.cinsiyet, bulunan.yerlesim.id, bulunan.beylik.id, davetEden);
      return basarili(profil);
    },
    async davetOlustur() { await bekle(); return profil ? basarili({ kod: "GELST2" }) : basarisiz("profil_yok"); },
    async davetCoz(kod) {
      await bekle();
      const temiz = davetKoduTemizle(kod);
      if (!davetKoduGecerli(temiz)) return basarisiz("davet_gecersiz");
      return temiz === SAHTE_DAVET_KODU ? basarili(SAHTE_DAVET) : basarisiz("davet_yok");
    },
  };
}
