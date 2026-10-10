// Divan Davası denetimi (çığır Sütun 6 — çevrimdışı günlük dava):
//  1) Aynı tarih → aynı numara ve aynı dava (günün her saatinde); her 32 günlük döngüde her dava bir kez.
//  2) Kasaba oyu deterministik; hiçbir yol %90'ı geçmez (oyuncu oyu dahil) — 3000 numara.
//  3) Ödül yalnızca kimlik: divan.ts oyun durumunu içe aktarmaz, ekran durumu değiştiren hiçbir çağrı yapmaz.
//  4) Her numara bir kez hükme bağlanır (çiftlik yok); göç bozuk kaydı onarır; lakap sırası/seri tanımaz.
//  5) 6 dilde her dava: başlık, metin, üç yol dolu ve birbirinden farklı; kadın lakap biçimleri.
// Kullanım: node scripts/_smoke/divan-check.cjs → "DİVAN: TEMİZ" ya da ihlal listesi (exit 1)
const ESBUILD = require("./esbuild-yolu.cjs");
const { execSync } = require("child_process"); const os = require("os"); const fs = require("fs"); const path = require("path");
const mobile = path.join(__dirname, "..", ".."); const giris = path.join(mobile, `_divan_giris_${process.pid}.ts`); const paket = path.join(os.tmpdir(), `kr-divan-${process.pid}.cjs`);
fs.writeFileSync(giris, `export * from "./lib/divan";\nexport { CIGIR } from "./lib/i18n-cigir";\n`);
try { execSync(`${ESBUILD} ${giris} --bundle --platform=node --format=cjs --outfile=${paket} --log-level=error`, { cwd: mobile, stdio: "inherit" }); } finally { fs.unlinkSync(giris); }
const g = require(paket); fs.unlinkSync(paket); const hata = []; const N = g.DIVAN_DAVALAR.length;
if (N < 30) hata.push(`dava sayısı ${N} < 30`);
if (new Set(g.DIVAN_DAVALAR).size !== N) hata.push("yinelenen dava kimliği");
// 1) tarih tohumu
let gun = new Date(2026, 9, 1, 0, 5);
if (g.divanNo(gun) !== 1) hata.push(`1 Ekim 2026 Divan No. 1 değil (${g.divanNo(gun)})`);
for (let i = 0; i < 400; i++) {
  const d = new Date(2026, 9, 1 + i, 0, 1), d2 = new Date(2026, 9, 1 + i, 23, 58);
  const a = g.divanNo(d), b = g.divanNo(d2);
  if (a !== b || g.divanDavasi(a) !== g.divanDavasi(b)) { hata.push(`gün ${i}: aynı tarihte farklı dava`); break; }
  if (a !== i + 1) { hata.push(`gün ${i}: numara ${a} (beklenen ${i + 1})`); break; }
}
for (let c = 0; c < 10; c++) { const s = new Set(); for (let k = 1; k <= N; k++) s.add(g.divanDavasi(c * N + k)); if (s.size !== N) hata.push(`döngü ${c}: ${s.size}/${N} dava`); }
// 2) oy
let enCok = 0; const dag = [0, 0, 0];
for (let no = 1; no <= 3000; no++) {
  const a = g.kasabaOyu(no), b = g.kasabaOyu(no); if (a.join() !== b.join()) { hata.push(`no ${no}: oy deterministik değil`); break; }
  for (const ben of [undefined, 0, 1, 2]) { const y = g.oyYuzde(no, ben); if (y[0] + y[1] + y[2] !== 100) hata.push(`no ${no}: yüzde toplamı ${y}`); const m = Math.max(...y); enCok = Math.max(enCok, m); if (m > 90) { hata.push(`no ${no}: tek yol %${m}`); break; } }
  const y = g.oyYuzde(no); dag[y.indexOf(Math.max(...y))]++;
}
// 3) kimlik dışı ödül yok
const src = fs.readFileSync(path.join(mobile, "lib/divan.ts"), "utf8");
if (/from "\.\/(game|store|events)"/.test(src)) hata.push("divan.ts oyun durumunu içe aktarıyor");
if (/\b(money|fame|power|itibar|para|deposit|properties)\b/.test(src.replace(/\/\/.*$/gm, ""))) hata.push("divan.ts'te para/güç alanı");
const ekran = fs.readFileSync(path.join(mobile, "app/oyun/divan.tsx"), "utf8");
for (const yasak of ["apply(", "doWork", "doEat", "doAdvance", "startGame", "importSave", "varisleDevam", "yeniOcak", "setInterval", "setTimeout"]) if (ekran.includes(yasak)) hata.push(`divan.tsx: ${yasak}`);
// 4) bir kez + göç + seri yok
let d = g.bosDivan(); d = g.hukumVer(d, 5, 0); const d2 = g.hukumVer(d, 5, 2); if (d2 !== d || d.k["5"] !== 0) hata.push("aynı numara ikinci kez hükme bağlandı");
if (g.hukumVer(d, 0, 1) !== d || g.hukumVer(d, 2.5, 1) !== d) hata.push("geçersiz numaraya hüküm yazıldı");
const goc = g.divanGoc({ v: 9, k: { "3": 1, "x": 2, "-4": 0, "7": 5, "8": "1", "9": 2 }, para: 999 });
if (JSON.stringify(goc) !== JSON.stringify({ v: 1, k: { "3": 1, "9": 2 } })) hata.push("göç: " + JSON.stringify(goc));
for (const bozuk of [null, 3, "x", [], { k: null }]) if (JSON.stringify(g.divanGoc(bozuk)) !== JSON.stringify(g.bosDivan())) hata.push("göç bozuk girdi: " + JSON.stringify(bozuk));
let ard = g.bosDivan(), seyrek = g.bosDivan(); for (let i = 0; i < g.DIVAN_LAKAP_ESIK; i++) { ard = g.hukumVer(ard, i + 1, 1); seyrek = g.hukumVer(seyrek, 1 + i * 37, 1); }
if (g.divanLakaplari(ard).join() !== "1" || g.divanLakaplari(seyrek).join() !== "1") hata.push("lakap ardışıklığa bağlı");
if (g.divanLakaplari(g.hukumVer(g.bosDivan(), 1, 0)).length) hata.push("tek hükümle lakap");
// 5) diller
for (const l of ["tr", "en", "es", "pt", "ar", "ru"]) {
  const D = g.CIGIR[l];
  for (const id of g.DIVAN_DAVALAR) {
    const v = ["t", "x", "c0", "c1", "c2"].map((k) => D[`divan.${id}.${k}`]);
    if (v.some((x) => !x || !x.trim())) hata.push(`${l}: ${id} eksik`);
    else if (new Set(v.slice(2)).size !== 3) hata.push(`${l}: ${id} yollar aynı`);
  }
  for (const k of ["divan.paylas", "divan.no", "divan.ayni", "divan.lakap.0", "divan.lakap.1", "divan.lakap.2", "divan.yol.0", "divan.yol.1", "divan.yol.2", "scr.divan"]) if (!D[k]) hata.push(`${l}: ${k} yok`);
  if (l !== "tr" && l !== "en") for (let i = 0; i < 3; i++) if (!D[`divan.lakap.${i}.f`]) hata.push(`${l}: divan.lakap.${i}.f yok`);
}
const ornek = g.divanNo(new Date(2026, 9, 10)); const oy = g.oyYuzde(ornek, 1);
console.log(`dava ${N}, Divan No. ${ornek} = ${g.divanDavasi(ornek)} · oy ${oy.join("/")} · en yüksek tek yol %${enCok} · çoğunluk dağılımı merhamet/adalet/töre ${dag.join("/")}`);
if (hata.length) { console.log("DİVAN: İHLAL\n" + [...new Set(hata)].slice(0, 30).join("\n")); process.exit(1); }
console.log("DİVAN: TEMİZ");
