// Faz 4 (üçgen) ve Faz 14 (barınma, dönüş ekranı) metin tabloları: sunucu olay/kalem/günlük anahtarlarının parametre
// sırası (metin.ts PARAM'a katılır), anahtara özgü değer çevirileri ve yeni hata kodları (ek-istemci.ts EK_HATALAR'a
// katılır). Metinler i18n-sayfa/online9.ts'te (6 dil). Yaprak dosyadır: hiçbir online modülünü içe aktarmaz.

type Ceviri = (k: string) => string;

/** online-server/src/tipler.ts HATA_DURUMU: Barınma (Faz 14) ve Üçgen (Faz 4) bölümleri. i18n: "onl.hh.<kod>". */
export const UCGEN_BARINMA_HATALARI = [
  "barinma_kapali", "oda_gecersiz", "sure_gecersiz", "oda_var", "kira_siniri", "han_kapali", "konaklama_var",
  "tesis_kapali", "tesis_sart", "tesis_dolu", "mod_gecersiz",
  "ucgen_gecersiz", "soz_yok", "talep_yok", "sart_yok", "dost_degil", "guven_yetersiz", "kirgin_degil", "casus_var", "hedef_siniri",
] as const;

const OLAN = ["misafirhane.basladi", "misafirhane.bitti", "otomatik.akceYok", "otomatik.oda", "otomatik.tesisYok", "otomatik.tesis",
  "otomatik.uyari", "zincir.uyari", "zincir.evsiz", "zincir.canKaybi", "zincir.durdu", "oda.bitti", "oda.kiralandi", "oda.uzatildi",
  "tesis.konakladi", "otomatik.ayar"];
const OLAN_PARAM: Record<string, string[]> = {
  "otomatik.akceYok": ["fiyat", "para"],
  "otomatik.oda": ["oda", "fiyat"],
  "otomatik.tesis": ["tesis"],
  "zincir.durdu": ["konaklama"],
  "oda.bitti": ["oda"],
  "oda.kiralandi": ["oda", "sure", "fiyat"],
  "oda.uzatildi": ["oda", "sure", "fiyat"],
  "tesis.konakladi": ["tesis"],
  "otomatik.ayar": ["mod"],
};

/** Sunucu {k, p} → şablon %1, %2 … sırası (ucgen.ts, arabulucu.ts, casus.ts, haber.ts, barinma.ts, donus-ekrani.ts). */
export const UCGEN_BARINMA_PARAM: Record<string, string[]> = {
  // üçgen olayları (oyuncuya özel)
  "olay.ucgen.ihbar": ["npc", "fail"],
  "olay.ucgen.fark": ["kaynak", "fail", "npc", "mekan"],
  "olay.ucgen.yakalandi": ["npc", "fail", "hamle"],
  "olay.ucgen.ikiliOyun": ["npc", "arabulucu"],
  "olay.ucgen.araciTalebi": ["kisi", "npc", "bedel"],
  "olay.ucgen.araci.geri": ["kisi"],
  "olay.ucgen.araci.ret": ["kisi"],
  "olay.ucgen.araci.dustu": ["arabulucu"],
  "olay.ucgen.arabuluculuk.baris": ["arabulucu", "npc", "deger"],
  "olay.ucgen.arabuluculuk.sartli": ["arabulucu", "npc"],
  "olay.ucgen.arabuluculuk.ateskes": ["arabulucu", "npc"],
  "olay.ucgen.arabuluculuk.ret": ["arabulucu", "npc"],
  "olay.ucgen.barisildi": ["taraf", "npc", "arabulucu"],
  "olay.ucgen.casusRapor": ["casus", "izlenen", "npc", "mekan"],
  "olay.ucgen.casusRapor.dusuk": ["casus", "izlenen", "npc", "mekan"],
  "olay.ucgen.casusBos": ["casus", "izlenen"],
  "olay.ucgen.casusBitti": ["casus", "izlenen", "neden"],
  "olay.ucgen.casusIhbar": ["casus", "sahip"],
  "olay.ucgen.casusFark": ["kaynak", "casus", "mekan"],
  // barınma olayları
  "olay.barinma.otomatik.oda": ["oda", "fiyat"],
  "olay.barinma.otomatik.tesis": ["tesis"],
  // şans, güven ve haber kalemleri
  "sans.teklif": ["teklif"],
  "sans.sadakat": ["gorus"],
  "sans.hamle": ["hamle"],
  "sans.guven": ["gorus"],
  "sans.sebep": ["sebep"],
  "sans.bedel": ["bedel"],
  "guven.huy": ["huy"],
  "guven.sadakat": ["gorus"],
  "haber.huy": ["huy"],
  "haber.kizginlikSinirli": ["gorus"],
  "haber.sadakat": ["gorus"],
  "haber.kizgin": ["gorus"],
  // dönüş ekranı günlüğü
  ...Object.fromEntries(OLAN.map((k) => [`donus.olan.${k}`, OLAN_PARAM[k] ?? []])),
};

/** Bu anahtarlarda kimlik değerleri kendi tablosuyla yazılır (genel "tur"/"mekan" kuralından önce). */
const ONEKLER = ["olay.ucgen.", "olay.barinma.", "donus.", "sans.teklif", "sans.hamle", "sans.bedel"];
const DEGER: Record<string, string> = {
  teklif: "onl.ug.teklif.", bedel: "onl.ug.bedel.", hamle: "onl.ug.hamle.", neden: "onl.ug.casusNeden.", mekan: "onl.mekan.",
  oda: "onl.br.oda.", tesis: "onl.br.tesis.", konaklama: "onl.br.konaklama.", mod: "onl.br.mod.",
};
export function ucgenBarinmaDeger(k: string, ad: string, v: unknown, t: Ceviri): string | undefined {
  if (typeof v !== "string" || !ONEKLER.some((o) => k.startsWith(o))) return undefined;
  const o = DEGER[ad];
  return o ? t(o + v) : undefined;
}

/** Biçim seçimi: güveni düşük casus raporu kendi şablonuyla ("… ama emin değil"). */
export function ucgenBarinmaAnahtar(k: string, p: Record<string, unknown>): string {
  return k === "olay.ucgen.casusRapor" && p.dusuk === 1 ? k + ".dusuk" : k;
}

/** Olay simgesi (GameIcon adı) ya da undefined. */
export function ucgenBarinmaIkon(k: string): string | undefined {
  if (k.startsWith("olay.ucgen.casus")) return "hood";
  if (k.startsWith("olay.ucgen.arabuluculuk") || k.startsWith("olay.ucgen.baris") || k.startsWith("olay.ucgen.araci")) return "scales";
  if (k.startsWith("olay.ucgen.")) return "speaker";
  if (k.startsWith("olay.barinma.")) return "house";
  return undefined;
}
