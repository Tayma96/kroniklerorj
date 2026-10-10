// Gerçek takvim ritmi denetimi (adım 4 — yumuşak ritim, FOMO yok):
//  1) 2026–2031 her günü bir satır anahtarı alır ve anahtar 6 dilde var; özel gün pencereleri kısa (yılda ≤ 30 gün).
//  2) Hiçbir ödül zamana kilitli değil: ritim.ts yalnızca anahtar döndürür, oyun modülü içe aktarmaz; oyun mantığı
//     (game/events/arcs/npc-mind/nufus/world/defter/roman/dialogue/divan) saat okumaz (Date.now / new Date yok).
//  3) Ana ekranda satır yalnızca t() ile yazılır; apply/eylem çağrısına girmez.
// Kullanım: node scripts/_smoke/ritim-check.cjs → "RİTİM: TEMİZ" ya da ihlal listesi (exit 1)
const ESBUILD = require("./esbuild-yolu.cjs");
const { execSync } = require("child_process"); const os = require("os"); const fs = require("fs"); const path = require("path");
const mobile = path.join(__dirname, "..", ".."); const giris = path.join(mobile, `_ritim_giris_${process.pid}.ts`); const paket = path.join(os.tmpdir(), `kr-ritim-${process.pid}.cjs`);
fs.writeFileSync(giris, `export * from "./lib/ritim";\nexport { CIGIR } from "./lib/i18n-cigir";\n`);
try { execSync(`${ESBUILD} ${giris} --bundle --platform=node --format=cjs --outfile=${paket} --log-level=error`, { cwd: mobile, stdio: "inherit" }); } finally { fs.unlinkSync(giris); }
const g = require(paket); fs.unlinkSync(paket); const hata = []; const say = {};
for (let y = 2026; y <= 2031; y++) {
  let ozel = 0;
  for (let d = new Date(y, 0, 1, 12); d.getFullYear() === y; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12)) {
    const k = g.gercekRitim(d); say[k] = (say[k] || 0) + 1;
    if (typeof k !== "string" || !k.startsWith("ritim.")) { hata.push(`${d.toDateString()}: anahtar ${k}`); continue; }
    if (!/\.\d$/.test(k)) ozel++;
    for (const l of ["tr", "en", "es", "pt", "ar", "ru"]) if (!g.CIGIR[l][k]) hata.push(`${l}: ${k} yok`);
  }
  if (ozel > 30) hata.push(`${y}: özel gün ${ozel} (> 30)`);
}
const tumAnahtar = Object.keys(g.CIGIR.tr).filter((k) => k.startsWith("ritim."));
for (const k of tumAnahtar) if (!say[k]) hata.push(`hiç görülmeyen satır ${k}`);
const src = fs.readFileSync(path.join(mobile, "lib/ritim.ts"), "utf8");
if (/^import /m.test(src)) hata.push("ritim.ts içe aktarma yapıyor");
if (/new Date\(\)|Date\.now/.test(src)) hata.push("ritim.ts kendi saatini okuyor");
for (const f of ["game", "events", "arcs", "npc-mind", "nufus", "world", "defter", "roman", "dialogue", "divan", "calendar"]) {
  const p = path.join(mobile, "lib", f + ".ts"); if (!fs.existsSync(p)) continue;
  const s = fs.readFileSync(p, "utf8").replace(/\/\/.*$/gm, "");
  if (/Date\.now\(|new Date\(|getHours\(|getDay\(/.test(s)) hata.push(`lib/${f}.ts saat okuyor (zamana kilitli mantık riski)`);
}
const ekran = fs.readFileSync(path.join(mobile, "app/oyun/index.tsx"), "utf8");
const satir = ekran.split("\n").filter((l) => l.includes("gercekRitim"));
if (!satir.length) hata.push("ana ekran ritim satırını göstermiyor");
for (const l of satir) if (/apply\(|setState|AsyncStorage/.test(l)) hata.push("ritim satırı bir eyleme bağlı: " + l.trim().slice(0, 80));
console.log(`ritim: ${Object.keys(say).length} farklı satır · özel günler: ${Object.entries(say).filter(([k]) => !/\.\d$/.test(k)).map(([k, v]) => k.slice(6) + " " + v).join(", ")}`);
if (hata.length) { console.log("RİTİM: İHLAL\n" + [...new Set(hata)].slice(0, 30).join("\n")); process.exit(1); }
console.log("RİTİM: TEMİZ");
