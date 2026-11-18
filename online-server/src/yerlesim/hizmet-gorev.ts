// E4.3-C: kasaba hazinesinden ulufesi ayrılan, aylık koltuklu hizmet görevleri.
import { acikEtkiler, aracArtisi, hakAcik, hizmetAcik } from "./beceri-etki.ts";
import { tohumlu } from "./rastgele.ts";
import { hanedanKasabasi, olduMu } from "./hanedan.ts";
import { hizmetEkle } from "./meslek.ts";
import { ekonomiAl, type HizmetGorevTuru, type HizmetKasabaGorevi } from "./pazar-tahta.ts";
import { aracAsindir } from "./tarif.ts";
import { gostergeDegistir, toplulukAl, type Gosterge } from "./topluluk-kayit.ts";
import { takatHarca } from "./karakter.ts";
import type { Karakter, Kasaba, OlayTaslagi } from "./tipler.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";

/** [PARAMETRE] Görev başına ulufe; görev açılırken kasaba hazinesinden rezerve edilir. */
export const KASABA_GOREV_ULUFESI = 4;
/**
 * [PARAMETRE] Aylık koltuk sayıları: dört temel görevde sekiz koltuk her ay açılır; kanca partisi 2 hizmet görevleri
 * (KOSULLU_GOREVLER) birer koltukla yalnız yerleşimde o hizmeti bilen yaşayan biri varken açılır. Kişi geliri artmaz:
 * aynı hesap ya da hane ayda yalnız BİR kamu görevinden ulufe alır (hizmetGorevTeslim); yeni görevler seçenek ekler.
 */
export const KASABA_GOREV_KOLTUKLARI: Readonly<Record<HizmetGorevTuru, number>> = {
  nobet: 4,
  vergiSayimi: 1,
  meclisKaydi: 1,
  talim: 2,
  denetim: 1,
  defter: 1,
  tercume: 1,
  hizliUlak: 1,
  muhurluMektup: 1,
  sifreliMektup: 1,
  izSur: 1,
  sahitDinle: 1,
  hakemlik: 1,
  // Kanca partisi 2: gece devriyesi koltuğu yalnız yerleşimde `hak:devriye` sahibi yaşarken açılır (KOLTUK_HAKLARI).
  devriye: 0,
};

interface GorevKurali {
  hizmet: string;
  meslek: "asker" | "divan" | "katip" | "arabulucu";
  takat: number;
  gosterge: Gosterge;
  arac?: "mizrak";
  /**
   * Kanca partisi 2: `kalite` etkisi hedefleri (görevin göstergeye katkısını şansla bir artırır; toplanır, tavanlı).
   * Nöbet: asayiş + gözcülük. Talim: talim + saf düzeninin savunması. Gece devriyesi: hırsızlık tespiti.
   */
  kalite: readonly string[];
  /**
   * Kanca partisi 2: isteğe bağlı ikinci araç (zorunlu değil): `arac` etkisinin hedefi ve malı. Açık ve envanterde
   * varsa göstergeye `arti` ekler ve bir kullanım aşınır. Gece devriyesinde kılıç, talimde saf düzeninin kalkanı.
   */
  ekArac?: { hedef: string; mal: "kilic" | "kalkan" };
  /** Kanca partisi 2: görev hizmet yerine bu hakla açılır (devriye). */
  hak?: string;
}

// Gece devriyesi düğümünün üç kancası (hak:devriye, kalite:hirsizlikTespiti, arac:devriye:kilic) yalnız devriye
// görevinde etki verir; nöbete sayılmaz (tek tüketici, çift sayım yok).
const KURALLAR: Record<HizmetGorevTuru, GorevKurali> = {
  nobet: { hizmet: "nobet", meslek: "asker", takat: 2, gosterge: "asayis", arac: "mizrak", kalite: ["asayis", "gozculuk"] },
  vergiSayimi: { hizmet: "vergiSayimi", meslek: "divan", takat: 2, gosterge: "asayis", kalite: ["vergiSayimi"] },
  meclisKaydi: { hizmet: "meclisKaydi", meslek: "divan", takat: 1, gosterge: "moral", kalite: ["meclisKaydi"] },
  talim: { hizmet: "talim", meslek: "asker", takat: 2, gosterge: "asayis", kalite: ["talim", "savunma"], ekArac: { hedef: "saf", mal: "kalkan" } },
  devriye: { hizmet: "devriye", hak: "devriye", meslek: "asker", takat: 2, gosterge: "asayis", kalite: ["hirsizlikTespiti"], ekArac: { hedef: "devriye", mal: "kilic" } },
  // Kanca partisi 2 (hizmet kancaları): kasabanın kendi işi, ulufe hazineden. [PARAMETRE] takat ve gösterge.
  // Mektup/ulak görevlerinde kalite yok: `kalite:mektup`/`kalite:ulak` yalnız mektup işinde (teklif.ts) okunur.
  denetim: { hizmet: "denetim", meslek: "divan", takat: 2, gosterge: "asayis", kalite: ["denetim"] }, // çarşı ölçek/tartı denetimi
  defter: { hizmet: "defter", meslek: "katip", takat: 1, gosterge: "arz", kalite: ["defter"] }, // ambar ve zahire hesap defteri
  tercume: { hizmet: "tercume", meslek: "katip", takat: 1, gosterge: "arz", kalite: ["tercume"] }, // yabancı tüccara tercüman
  hizliUlak: { hizmet: "hizliUlak", meslek: "katip", takat: 2, gosterge: "asayis", kalite: [] }, // kasabanın acil haberi
  muhurluMektup: { hizmet: "muhurluMektup", meslek: "katip", takat: 1, gosterge: "moral", kalite: [] }, // kasaba adına resmî yazışma
  sifreliMektup: { hizmet: "sifreliMektup", meslek: "katip", takat: 1, gosterge: "asayis", kalite: [] }, // garnizonun gizli yazışması
  izSur: { hizmet: "izSur", meslek: "asker", takat: 2, gosterge: "asayis", kalite: ["izSur"] }, // hırsız/haydut izi sürme
  sahitDinle: { hizmet: "sahitDinle", meslek: "arabulucu", takat: 1, gosterge: "asayis", kalite: ["sahitDinle"] }, // kadı davasında şahit
  hakemlik: { hizmet: "hakemlik", meslek: "arabulucu", takat: 1, gosterge: "moral", kalite: ["hakemlik"] }, // çarşı anlaşmazlığında hakem
};

/** [PARAMETRE] Kanca partisi 2: tek teslimin göstergeye en çok katkısı (taban 1 + araçlar + kalite; tek yığılma). */
export const GOREV_GOSTERGE_TAVAN = 3;

/** Kanca partisi 2: koltuğu yalnız yerleşimde o hizmeti bilen yaşayan biri varken açılan görevler (boş rezerv yok). */
export const KOSULLU_GOREVLER: ReadonlySet<HizmetGorevTuru> = new Set<HizmetGorevTuru>([
  "denetim", "defter", "tercume", "hizliUlak", "muhurluMektup", "sifreliMektup", "izSur", "sahitDinle", "hakemlik",
]);

/** Görevin hizmet kancası (beceri ağacı `hizmet` etkisi; kayıt kanca-kayit.ts). */
export const gorevHizmeti = (tur: HizmetGorevTuru): string => KURALLAR[tur].hizmet;

/**
 * [PARAMETRE] Kanca partisi 2: koltuk ekleyen haklar (yerleşimde yaşayan bir sahibi varsa o türe +1 koltuk; ulufe
 * hazineden, yoksa açılmaz). `nobetKoltuklari` garnizon ağasının nöbet dağıtımı, `garnizonTalimi` garnizon talimi;
 * `ulufePayi` (hak s–z partisi) bütçe defterinde ulufe payı ayıran divan: bir vergi sayımı koltuğu daha.
 */
export const KOLTUK_HAKLARI: Readonly<Partial<Record<HizmetGorevTuru, string>>> = { nobet: "nobetKoltuklari", talim: "garnizonTalimi", devriye: "devriye", vergiSayimi: "ulufePayi" };
/** [PARAMETRE] Hakla açılan koltuk sayısı (görev türüne göre; yoksa 1). Devriye: gece devriyesi iki koltuk. */
export const KOLTUK_HAK_SAYISI: Readonly<Partial<Record<HizmetGorevTuru, number>>> = { devriye: 2 };
/** [PARAMETRE] Görev kalitesi (yüzde, kalite etkileri toplamı) üst sınırı: göstergeye +1 ek katkı şansı. */
export const GOREV_KALITE_TAVAN = 60;

/** Görevin kalite yüzdesi (hedefi görev kalite kimliği olan kalite etkileri, tavanlı). */
export function gorevKalitesi(kar: Karakter, tur: HizmetGorevTuru): number {
  const hedef = KURALLAR[tur].kalite;
  if (hedef.length === 0) return 0;
  let t = 0;
  for (const e of acikEtkiler(kar)) if (e.tur === "kalite" && hedef.includes(e.hedef)) t += e.yuzde;
  return Math.min(GOREV_KALITE_TAVAN, t);
}

const GOREV_ADLARI = Object.keys(KURALLAR) as readonly HizmetGorevTuru[];

/** Ay dönümünde eski açık görevlerin ayrılmış ulufesini iade eder ve yeni ayın koltuklarını açar. */
export function hizmetGorevDonumu(kasaba: Kasaba, ay: number): void {
  const ek = ekonomiAl(kasaba);
  const hazine = hanedanKasabasi(kasaba);
  for (const gorev of ek.hg ?? []) {
    if (gorev.d !== "acik" || gorev.sa >= ay) continue;
    gorev.d = "dustu";
    hazine.hz += gorev.odul;
  }
  ek.hg = (ek.hg ?? []).filter((x) => x.d === "acik" || x.ac >= ay - 12);
  if (ek.hga === ay) return;
  ek.hga = ay;
  const sakinler = [...kasaba.kar.values()].filter((c) => !olduMu(c));
  for (const tur of GOREV_ADLARI) {
    if (KOSULLU_GOREVLER.has(tur) && !sakinler.some((c) => hizmetAcik(c, KURALLAR[tur].hizmet))) continue;
    const hak = KOLTUK_HAKLARI[tur];
    const ek1 = hak && sakinler.some((c) => hakAcik(c, hak)) ? (KOLTUK_HAK_SAYISI[tur] ?? 1) : 0;
    for (let sira = 0; sira < KASABA_GOREV_KOLTUKLARI[tur] + ek1; sira++) {
      if (hazine.hz < KASABA_GOREV_ULUFESI) continue;
      hazine.hz -= KASABA_GOREV_ULUFESI;
      ek.hg!.push({
        i: ek.n++,
        tur,
        ac: ay,
        sa: ay,
        odul: KASABA_GOREV_ULUFESI,
        d: "acik",
      });
    }
  }
}

/** Oyuncunun görebildiği açık görevler; kapanmış görevler tekrar teklif edilmez. */
export function hizmetGorevleri(ek: ReturnType<typeof ekonomiAl> | undefined, ay: number) {
  return (ek?.hg ?? [])
    .filter((x) => x.d === "acik" && x.sa >= ay)
    .map((x) => ({
      id: `kg${x.i}`,
      tur: x.tur,
      acilisAy: x.ac,
      sonAy: x.sa,
      odul: x.odul,
      takat: KURALLAR[x.tur].takat,
      arac: KURALLAR[x.tur].arac ?? null,
      // Kanca partisi 2 (eklemeli): görevi yapabilen meslek ve katkının gittiği gösterge.
      meslek: KURALLAR[x.tur].meslek,
      gosterge: KURALLAR[x.tur].gosterge,
    }));
}

/** Bir koltuğu tek kez doldurur; beceri, takat, araç, hesap/hane tekilliği ve hazine rezervi sunucuda doğrulanır. */
export function hizmetGorevTeslim(
  kasaba: Kasaba,
  kar: Karakter,
  id: unknown,
  ay: number,
): Sonuc<{ gorev: HizmetKasabaGorevi; odul: number; hizmetPuani: number; arac?: ReturnType<typeof aracAsindir>; ekArac?: ReturnType<typeof aracAsindir>; olay: OlayTaslagi; katki: { gosterge: number; aracEk: number; ekAracEk: number; kalite: number; kaliteEk: number; tavan: number; gencTalimi?: boolean } }> {
  if (typeof id !== "string") return hata("hedef_uygun_degil");
  const eslesme = /^kg([1-9][0-9]{0,8})$/.exec(id);
  if (!eslesme) return hata("hedef_uygun_degil");
  const ek = ekonomiAl(kasaba);
  const gorev = ek.hg?.find((x) => x.i === Number(eslesme[1]));
  if (!gorev || gorev.d !== "acik" || gorev.sa < ay) return hata("siparis_kapandi");
  const kural = KURALLAR[gorev.tur];
  if (kural.hak ? !hakAcik(kar, kural.hak) : !hizmetAcik(kar, kural.hizmet)) return hata("dugum_kapali");

  // Aynı hesap veya aynı hane aynı ayda yalnız bir kamu görevinden ulufe alabilir.
  const onceki = (ek.hg ?? []).find((x) =>
    x.d === "tamam" && x.ac === ay && x.teslim &&
    (x.teslim.hesap === kar.h || (kar.e !== 0 && x.teslim.hane === kar.e)),
  );
  if (onceki) return hata("ayni_kume");
  if (kural.arac && (kar.ev?.[kural.arac] ?? 0) < 1) return hata("arac_yok");
  if (!takatHarca(kar, ay, kural.takat)) return hata("takat_yok");

  const arac = kural.arac ? aracAsindir(kar, kural.arac) : undefined;
  const topluluk = toplulukAl(kasaba);
  // Kanca partisi 2: araç etkisi (mızrakla nöbet +1) ve görev kalitesi (yüzde şansla +1; tohum görev + kişi, tekrar
  // güvenli: koltuk bir kez dolar). Akçe ve hizmet puanı değişmez; yalnız göstergeye katkı.
  const aracEk = kural.arac ? (aracArtisi(kar, gorev.tur)?.mal === kural.arac ? aracArtisi(kar, gorev.tur)!.arti : 0) : 0;
  const kalite = gorevKalitesi(kar, gorev.tur);
  const kaliteEk = kalite > 0 && tohumlu("gorevKalite", gorev.i, kar.o)() * 100 < kalite ? 1 : 0;
  // İkinci araç (kılıçla devriye, kalkanla saf): etkisi açık ve elde varsa +arti, bir kullanım aşınır.
  const ea = kural.ekArac ? aracArtisi(kar, kural.ekArac.hedef) : undefined;
  const ekAracEk = ea && ea.mal === kural.ekArac!.mal && (kar.ev?.[ea.mal] ?? 0) >= 1 ? ea.arti : 0;
  const ekArac = ekAracEk > 0 ? aracAsindir(kar, kural.ekArac!.mal) : undefined;
  const gosterge = Math.min(GOREV_GOSTERGE_TAVAN, 1 + aracEk + ekAracEk + kaliteEk);
  gostergeDegistir(topluluk, kural.gosterge, gosterge);
  // Kanca partisi 2 `gencTalimi`: gençler talim edilince bu ayın dönümünde asayiş yarı aşınır (topluluk-kayit.ts).
  const gencTalimi = gorev.tur === "talim" && hakAcik(kar, "gencTalimi");
  if (gencTalimi) topluluk.gt = ay;
  kar.pa += gorev.odul;
  const hizmetPuani = hizmetEkle(kar, kural.meslek, kural.takat * 2);
  gorev.d = "tamam";
  gorev.teslim = { o: kar.o, ad: kar.ad, hesap: kar.h, hane: kar.e, ay };
  const olay: OlayTaslagi = {
    t: "hizmetGorev",
    w: kar.o,
    h: kar.o,
    g: kar.o,
    n: 3,
    k: "olay.hizmetGorevTamam",
    p: { oyuncu: kar.ad, odul: gorev.odul, hizmetPuani, takat: kural.takat },
  };
  return basarili({ gorev, odul: gorev.odul, hizmetPuani, ...(arac ? { arac } : {}), ...(ekArac ? { ekArac } : {}), olay, katki: { gosterge, aracEk, ekAracEk, kalite, kaliteEk, tavan: GOREV_GOSTERGE_TAVAN, ...(gencTalimi ? { gencTalimi: true } : {}) } });
}
