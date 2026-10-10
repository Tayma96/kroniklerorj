// Tekil/çoğul bekçisi: süre gösteren metinler sayı 1 olunca "1 months" / "en 1 meses" / "daqui a 1 meses" diye görünmemeli.
// en/es/pt sözlüğünde "%N + süre sözcüğü" geçen her metin bütün parametreler 1 iken çözülür; düz çoğul kalırsa hata.
// Ayrıca birim örnekleri: 1 ↔ 11/21, "(s)" kalıbı, "more", ondalık ve Türkçe metne dokunulmaması.
// Kullanım: node scripts/_smoke/cogul-check.cjs
const ESBUILD = require("./esbuild-yolu.cjs");
const path = require("path"); const fs = require("fs"); const os = require("os"); const { execSync } = require("child_process");
const kok = path.join(__dirname, "..", ".."); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cogul-"));
const kopya = path.join(kok, "lib", "_cogul_kopya.tsx");
fs.writeFileSync(kopya, fs.readFileSync(path.join(kok, "lib", "i18n.tsx"), "utf8").replace("function dictFor(lang: Lang): Dict {", "export function dictFor(lang: Lang): Dict {"));
const giris = path.join(kok, "_cogul_giris.ts"); fs.writeFileSync(giris, 'export { dictFor, applyParams } from "./lib/_cogul_kopya";\n');
try { execSync(`${ESBUILD} "${giris}" --bundle --format=cjs --platform=node --outfile="${tmp}/c.cjs" --log-level=error`, { cwd: kok, stdio: "inherit" }); }
finally { fs.unlinkSync(kopya); fs.unlinkSync(giris); }
const { dictFor, applyParams } = require(`${tmp}/c.cjs`);
let hata = 0; const H = (m) => { hata++; if (hata <= 12) console.log("  HATA: " + m); };
const SURE = /%\d+\s+(?:more\s+)?(months|years|days|weeks|meses|años|anos|días|dias|semanas)\b/;
const KALAN = /(^|[^\d.,])1\s+(?:more\s+)?(months|years|days|weeks|meses|años|anos|días|dias|semanas)(?![A-Za-zÀ-ÿ(])/;
let taranan = 0;
for (const L of ["en", "es", "pt"]) for (const [k, v] of Object.entries(dictFor(L))) {
  if (typeof v !== "string" || !SURE.test(v)) continue; taranan++;
  const out = applyParams(v, Array(9).fill(1), L); if (KALAN.test(out)) H(`${L} ${k}: ${out.slice(0, 70)}`);
}
const ornek = [
  ["en", "in %1 months", [1], "in 1 month"], ["en", "in %1 months", [11], "in 11 months"], ["en", "%1 more months of service", [1], "1 more month of service"],
  ["en", "%1 month(s) left", [1], "1 month left"], ["en", "%1 month(s) left", [3], "3 months left"], ["en", "lasts %1 years", [21], "lasts 21 years"],
  ["es", "en %1 meses", [1], "en 1 mes"], ["es", "hace %1 años", [1], "hace 1 año"], ["pt", "daqui a %1 meses", [1], "daqui a 1 mês"], ["pt", "%1 anos", [2], "2 anos"],
  ["tr", "%1 ay sonra", [1], "1 ay sonra"], ["en", "%1.5 years", [1], "1.5 years"],
];
for (const [L, tpl, p, bek] of ornek) { const o = applyParams(tpl, p, L); if (o !== bek) H(`örnek ${L} "${tpl}" ${p} → "${o}" (beklenen "${bek}")`); }
console.log(hata ? `ÇOĞUL: ${hata} hata` : `ÇOĞUL: TEMİZ (${taranan} süreli metin + ${ornek.length} örnek)`);
process.exit(hata ? 1 : 0);
