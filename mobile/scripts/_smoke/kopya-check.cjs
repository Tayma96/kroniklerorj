// Kopya bekçisi: clone() kronik olaylarını yeni duruma PAYLAŞARAK taşır (dizi kopyalanır, olay nesneleri ortak — sıcak yol).
// Bu yalnız "bir olay yazıldıktan sonra yerinde değiştirilmez" kuralı tuttukça güvenlidir. Burada gerçek hayatlar oynatılır;
// her eylemden önce eski durumun kroniği ve oyuncusu mühürlenir, eylemden sonra eski durum birebir aynı kalmalıdır.
// Kullanım: node scripts/_smoke/kopya-check.cjs [hayat=4]
const ESBUILD = require("./esbuild-yolu.cjs");
const path = require("path"); const fs = require("fs"); const os = require("os"); const { execSync } = require("child_process");
const kok = path.join(__dirname, "..", ".."); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kopya-"));
execSync(`${ESBUILD} lib/game.ts --bundle --format=cjs --platform=node --outfile="${tmp}/g.cjs" --log-level=error`, { cwd: kok, stdio: "inherit" });
const g = require(`${tmp}/g.cjs`);
const R = (a) => a[Math.floor(Math.random() * a.length)];
const HAYAT = +(process.argv[2] || 4); let hata = 0, sinanan = 0;
const muhur = (s) => JSON.stringify([s.history, s.player]);
for (let h = 0; h < HAYAT; h++) {
  let s = g.newGame("K", "B", h % 2 ? "kadın" : "erkek"); let gd = 0;
  while (!s.player.dead && gd++ < 900) {
    const eylemler = [(x) => g.advance(x), (x) => g.eat(x), (x) => g.work(x)];
    if (s.player.age >= 13 && s.player.profession === "işsiz") eylemler.push((x) => g.changeProfession(x, R(["çiftçi", "çoban", "balıkçı"])));
    const sd = g.sinavDurumu(s); if (sd && sd.hazir) eylemler.push((x) => g.ustalikSinavi(x, R([0, 1, 2])).state);
    const ns = s.player.age >= 13 ? g.npcsOf(s) : []; if (ns.length) eylemler.push((x) => g.talkWith(x, R(ns), R(["hosbes", "dert", "is"])).state);
    for (const f of eylemler) {
      const once = gd % 15 === 0 ? muhur(s) : null; const yeni = f(s);
      if (once != null) { sinanan++; if (muhur(s) !== once) { hata++; if (hata <= 5) console.log("  HATA: eylem eski durumun kroniğini/oyuncusunu değiştirdi (yaş " + s.player.age + ")"); } }
      s = yeni;
    }
  }
}
console.log(hata ? `KOPYA: ${hata} hata` : `KOPYA: TEMİZ (${HAYAT} hayat, ${sinanan} mühürlü eylem — eski durum dokunulmadı)`);
process.exit(hata ? 1 : 0);
