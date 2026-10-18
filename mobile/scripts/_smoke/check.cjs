// Günlük kısa kontrol; geniş tarama yalnız açık komutla. Yalnız başarılı sonuç önbelleğe alınır.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../..");
const mode = process.argv[2] || "quick";
const force = process.argv.includes("--force");
if (!["quick", "rng", "full", "rng-full"].includes(mode)) {
  console.error("Kullanım: check.cjs quick|rng|full|rng-full [--force]"); process.exit(1);
}
const wide = mode === "full" || mode === "rng-full";
const cache = path.join(root, "node_modules/.cache/kronikler-check");
fs.mkdirSync(cache, { recursive: true });
// Uygulama, motor, test, fikstür, derleyici ayarı ve bağımlılık kilidi değişirse geçersizleşir.
const hash = crypto.createHash("sha256").update(process.version);
function add(relative) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) return;
  if (fs.statSync(file).isDirectory()) {
    for (const name of fs.readdirSync(file).sort()) add(path.join(relative, name));
  } else {
    hash.update(relative).update("\0").update(fs.readFileSync(file)).update("\0");
  }
}
for (const file of ["app", "lib", "scripts/_smoke", "package.json", "package-lock.json", "tsconfig.json", "babel.config.js", "metro.config.js"]) add(file);
const digest = hash.digest("hex");
const recordFile = path.join(cache, "passed.json");
let record;
try { record = JSON.parse(fs.readFileSync(recordFile, "utf8")); } catch {}
if (record?.digest !== digest) record = { digest, steps: [] };
const started = Date.now();
let reused = 0;
function step(id, command, args, env = {}) {
  if (!force && !wide && record.steps.includes(id)) {
    reused++; console.log(`${id}: aynı kaynak daha önce geçti`); return;
  }
  // Zorunlu tekrar başarısız olursa önceki başarı sonraki çağrıyı gizlemesin.
  record.steps = record.steps.filter((passed) => passed !== id);
  fs.writeFileSync(recordFile, JSON.stringify(record));
  const start = Date.now();
  const result = spawnSync(command, args, {
    cwd: root, env: { ...process.env, ...env }, encoding: "utf8",
    timeout: wide ? 30 * 60_000 : 60_000, maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    console.error(`${id}: BAŞARISIZ (${((Date.now() - start) / 1000).toFixed(1)} sn)`);
    if (result.error) console.error(result.error.message);
    console.error(((result.stdout || "") + (result.stderr || "")).trim().split("\n").slice(-18).join("\n"));
    process.exit(1); // Hata/süre aşımı başarı sayılmaz; otomatik geniş tarama yok.
  }
  if (!record.steps.includes(id)) record.steps.push(id);
  fs.writeFileSync(recordFile, JSON.stringify(record));
  console.log(`${id}: TEMİZ (${((Date.now() - start) / 1000).toFixed(1)} sn)`);
  const summary = (result.stdout || "").trim().split("\n").filter(Boolean).at(-1);
  if (summary) console.log(summary.slice(0, 500));
}

step("tsc", process.execPath, [path.join(root, "node_modules/typescript/bin/tsc"), "--noEmit"]);
const bundle = path.join(cache, `game-${digest.slice(0, 16)}.cjs`);
if (!fs.existsSync(bundle)) {
  require("esbuild").buildSync({ entryPoints: [path.join(root, "lib/game.ts")], bundle: true,
    platform: "node", format: "cjs", outfile: bundle, logLevel: "error",
    alias: { "@react-native-async-storage/async-storage": path.join(__dirname, "as-stub.cjs") } });
  // Eski paketler birikmesin; aynı anda çalışan başka kontrolün paketini korumak için yalnız 1 günden eskileri sil.
  for (const name of fs.readdirSync(cache)) {
    const old = path.join(cache, name);
    if (name.startsWith("game-") && old !== bundle && Date.now() - fs.statSync(old).mtimeMs > 86400_000) fs.unlinkSync(old);
  }
}
if (mode === "rng" || mode === "rng-full") {
  step(`rng-${wide ? "full" : "quick"}`, process.execPath,
    [path.join(__dirname, "rng-yol-ticaret-savas-check.cjs")], { SMOKE_PROFILE: wide ? "full" : "quick" });
} else {
  step(wide ? "300-hayat" : "3-kısa-senaryo", process.execPath,
    [path.join(__dirname, wide ? "run-parallel.cjs" : "run.cjs")],
    { SMOKE_BUNDLE: bundle, SMOKE_LIVES: wide ? "300" : "3", SMOKE_TURNS: wide ? "1100" : "120", SMOKE_JSON: "" });
  step("eski-kayıt", process.execPath, [path.join(__dirname, "migrate-check.cjs")], { SMOKE_BUNDLE: bundle });
}
console.log(`${wide ? "GENİŞ" : "KISA"} KONTROL · ${((Date.now() - started) / 1000).toFixed(1)} sn · ${reused} önceki başarılı adım kullanıldı`);
