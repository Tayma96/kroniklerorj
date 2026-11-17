// Adlı eşyanın doğuşu (sunucu esya-kayit.ts): olay `olay.esya.efsanevi|tilsimli` ve kronik `kronik.esya.*`,
// parametreler {kim, mal, kalite, lakap, atolyeAd}. Metinler "onl.es.olay.*" / "onl.es.kronik.*" (online22.ts).
// Eşyanın şimdiki sahibi hiçbir yerde yazılmaz; yalnız ustası ve atölyesi.
type Ceviri = (k: string) => string;

const ANAHTAR: Record<string, string> = {
  "olay.esya.efsanevi": "es.olay.efsanevi", "olay.esya.tilsimli": "es.olay.tilsimli",
  "kronik.esya.efsanevi": "es.kronik.efsanevi", "kronik.esya.tilsimli": "es.kronik.tilsimli",
};
const SIRA = ["kim", "lakap", "mal", "atolyeAd"];
export const ESYA_PARAM: Record<string, string[]> = Object.fromEntries(Object.values(ANAHTAR).map((k) => [k, SIRA]));
/** Sunucu anahtarını eşya metin anahtarına çevirir; başka anahtar olduğu gibi döner. */
export const esyaAnahtar = (k: string) => ANAHTAR[k] ?? k;
export const esyaOlayiMi = (k: string) => k in ANAHTAR;
/** Lakap sayısı adıyla; atölye adı boşsa genel ad. Başka parametreye karışmaz (undefined). */
export function esyaDeger(k: string, ad: string, v: unknown, t: Ceviri): string | undefined {
  if (!k.startsWith("es.")) return undefined;
  if (ad === "lakap") { const a = "onl.es.lakap." + String(v); const s = t(a); return s === a ? t("onl.es.lakap.0") : s; }
  if (ad === "atolyeAd") return typeof v === "string" && v ? v : t("onl.mk.tur.atolye");
  return undefined;
}
export const esyaIkon = (k: string): string | undefined => (!esyaOlayiMi(k) ? undefined : k.endsWith(".tilsimli") ? "sun" : "crown");
