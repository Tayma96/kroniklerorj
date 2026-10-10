// Göç-fuzz bekçisi: 34 yaşına dek oynanmış gerçek bir kayıt alınır; her üst düzey ve oyuncu alanı tek tek SİLİNİR, null yapılır,
// sayı alanları da metne çevrilir (yarım yazım, elle düzenlenmiş yedek, eski sürüm). Her bozuk kayıt migrate()'ten geçip
// 3 ay yaşatılır: çökme ya da sayı-dışı kese olmamalı. (s.player yoksa yükleyici kaydı zaten reddeder — kapsam dışı.)
// Ayrıca: göç iki kez çalışınca aynı sonucu verir (idempotent), yeni oyunun kaydı göçte değişmez.
// Kullanım: node scripts/_smoke/goc-fuzz.cjs
const ESBUILD = require("./esbuild-yolu.cjs");
const path = require("path"); const fs = require("fs"); const os = require("os"); const { execSync } = require("child_process");
const kok = path.join(__dirname, "..", ".."); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gocfuzz-"));
execSync(`${ESBUILD} lib/game.ts --bundle --format=cjs --platform=node --outfile="${tmp}/g.cjs" --log-level=error`, { cwd: kok, stdio: "inherit" });
const g = require(`${tmp}/g.cjs`);
let s = g.newGame("A", "B", "erkek"); let gd = 0;
while (s.player.age < 34 && gd++ < 400) { if (s.player.hunger < 35) s = g.eat(s); if (s.player.age >= 13 && s.player.profession === "işsiz") s = g.changeProfession(s, "çiftçi"); if (s.player.profession !== "işsiz") s = g.work(s); s = g.advance(s); }
const base = JSON.stringify(s);
const hatalar = []; let deneme = 0;
function dene(mut, label) {
  deneme++; const o = JSON.parse(base); mut(o);
  try {
    let m = g.migrate(o);
    for (let i = 0; i < 3; i++) { m = g.eat(m); m = g.work(m); m = g.advance(m); }
    for (const k of ["money", "health", "hunger", "reputation", "career_xp"]) if (!Number.isFinite(m.player[k])) throw new Error(k + " sayı değil: " + m.player[k]);
  } catch (e) { hatalar.push(label + " → " + String(e.message).slice(0, 100)); }
}
for (const k of Object.keys(s)) { if (k === "player") continue; dene((o) => { delete o[k]; }, "sil s." + k); dene((o) => { o[k] = null; }, "null s." + k); if (typeof s[k] === "number") dene((o) => { o[k] = "x"; }, "metin s." + k); }
for (const k of Object.keys(s.player)) { dene((o) => { delete o.player[k]; }, "sil p." + k); dene((o) => { o.player[k] = null; }, "null p." + k); if (typeof s.player[k] === "number") dene((o) => { o.player[k] = "x"; }, "metin p." + k); }
// idempotent: ikinci göç birinciyle aynı
{ const a = g.migrate(JSON.parse(base)); const b = g.migrate(JSON.parse(JSON.stringify(a))); const sade = (x) => JSON.stringify({ ...x, pop: undefined });
  if (sade(a) !== sade(b)) hatalar.push("göç idempotent değil"); }
// yeni oyun: göç kaydı değiştirmez (oyuncu alanları ve kronik)
{ const n = g.newGame("C", "D", "kadın"); const m = g.migrate(JSON.parse(JSON.stringify(n))); // göçün eklediği boş varsayılanlar (ör. governorships: []) sayılmaz
  for (const k of Object.keys(n.player)) if (JSON.stringify(n.player[k]) !== JSON.stringify(m.player[k])) hatalar.push("yeni oyun göçte değişti: p." + k);
  if (JSON.stringify(n.history) !== JSON.stringify(m.history) || m.merdiven !== n.merdiven) hatalar.push("yeni oyun göçte değişti: kronik/merdiven"); }
hatalar.slice(0, 15).forEach((h) => console.log("  " + h));
console.log(hatalar.length ? `GÖÇ-FUZZ: ${hatalar.length} hata (${deneme} bozuk kayıt)` : `GÖÇ-FUZZ: TEMİZ (${deneme} bozuk kayıt, idempotent, yeni oyun dokunulmaz)`);
process.exit(hatalar.length ? 1 : 0);
