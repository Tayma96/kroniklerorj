// E4.3-C: kasaba hazinesinden ulufesi ayrılan, aylık koltuklu hizmet görevleri.
import { hizmetAcik } from "./beceri-etki.ts";
import { hanedanKasabasi } from "./hanedan.ts";
import { hizmetEkle } from "./meslek.ts";
import { ekonomiAl, type HizmetGorevTuru, type HizmetKasabaGorevi } from "./pazar-tahta.ts";
import { aracAsindir } from "./tarif.ts";
import { gostergeDegistir, toplulukAl, type Gosterge } from "./topluluk-kayit.ts";
import { takatHarca } from "./karakter.ts";
import type { Karakter, Kasaba, OlayTaslagi } from "./tipler.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";

/** [PARAMETRE] Görev başına ulufe; görev açılırken kasaba hazinesinden rezerve edilir. */
export const KASABA_GOREV_ULUFESI = 4;
/** [PARAMETRE] Aylık koltuk sayıları; toplam sekiz görev. */
export const KASABA_GOREV_KOLTUKLARI: Readonly<Record<HizmetGorevTuru, number>> = {
  nobet: 4,
  vergiSayimi: 1,
  meclisKaydi: 1,
  talim: 2,
};

interface GorevKurali {
  hizmet: string;
  meslek: "asker" | "divan";
  takat: number;
  gosterge: Gosterge;
  arac?: "mizrak";
}

const KURALLAR: Record<HizmetGorevTuru, GorevKurali> = {
  nobet: { hizmet: "nobet", meslek: "asker", takat: 2, gosterge: "asayis", arac: "mizrak" },
  vergiSayimi: { hizmet: "vergiSayimi", meslek: "divan", takat: 2, gosterge: "asayis" },
  meclisKaydi: { hizmet: "meclisKaydi", meslek: "divan", takat: 1, gosterge: "moral" },
  talim: { hizmet: "talim", meslek: "asker", takat: 2, gosterge: "asayis" },
};

const GOREV_ADLARI: readonly HizmetGorevTuru[] = ["nobet", "vergiSayimi", "meclisKaydi", "talim"];

/** Ay dönümünde eski açık görevlerin ayrılmış ulufesini iade eder ve yeni ayın koltuklarını açar. */
export function hizmetGorevDonumu(kasaba: Kasaba, ay: number): void {
  const ek = ekonomiAl(kasaba);
  const hazine = hanedanKasabasi(kasaba);
  for (const gorev of ek.hg ?? []) {
    if (gorev.d !== "acik" || gorev.sa >= ay) continue;
    gorev.d = "dustu";
    hazine.hz += gorev.odul;
  }
  if (ek.hga === ay) return;
  ek.hga = ay;
  for (const tur of GOREV_ADLARI) {
    for (let sira = 0; sira < KASABA_GOREV_KOLTUKLARI[tur]; sira++) {
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
    }));
}

/** Bir koltuğu tek kez doldurur; beceri, takat, araç, hesap/hane tekilliği ve hazine rezervi sunucuda doğrulanır. */
export function hizmetGorevTeslim(
  kasaba: Kasaba,
  kar: Karakter,
  id: unknown,
  ay: number,
): Sonuc<{ gorev: HizmetKasabaGorevi; odul: number; hizmetPuani: number; arac?: ReturnType<typeof aracAsindir>; olay: OlayTaslagi }> {
  if (typeof id !== "string") return hata("hedef_uygun_degil");
  const eslesme = /^kg([1-9][0-9]{0,8})$/.exec(id);
  if (!eslesme) return hata("hedef_uygun_degil");
  const ek = ekonomiAl(kasaba);
  const gorev = ek.hg?.find((x) => x.i === Number(eslesme[1]));
  if (!gorev || gorev.d !== "acik" || gorev.sa < ay) return hata("siparis_kapandi");
  const kural = KURALLAR[gorev.tur];
  if (!hizmetAcik(kar, kural.hizmet)) return hata("dugum_kapali");

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
  gostergeDegistir(topluluk, kural.gosterge, 1);
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
    p: { gorev: gorev.tur, oyuncu: kar.ad, odul: gorev.odul, hizmetPuani, takat: kural.takat },
  };
  return basarili({ gorev, odul: gorev.odul, hizmetPuani, ...(arac ? { arac } : {}), olay });
}
