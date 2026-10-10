// Hanedan Defteri denetimi: ölümden sağ çıkan defter kimlik taşır, güç taşımaz; ata kararları torunlarda yankılanır.
//  1) Soy yetenekleri: her birinin en az bir artısı ve bir bedeli var (baskın seçenek yok); 6 dilde ad/artı/bedel.
//  2) Defter göçü: bozuk girdi fuzz'ı atmaz, göç idempotent, JSON gidiş-dönüş kayıpsız; defterIsle aynı ölümü iki kez yazmaz.
//  3) resetGame defter anahtarına dokunmaz (statik).
//  4) Beş nesil "küllerden yeni ocak" zinciri (tohumlu): başlangıç parası/özellik toplamı birikmez; ilk 20 yılın medyan
//     para kayması ≤ %10; ata izi torunun hafızasında ve en az bir "yanki.ata.*" satırı torunun hayatında.
// Kullanım: node scripts/_smoke/defter-check.cjs → "DEFTER: TEMİZ" ya da ihlal listesi (exit 1)
const ESBUILD = require("./esbuild-yolu.cjs");
const { execSync } = require("child_process");
const os = require("os"); const fs = require("fs"); const path = require("path");
const mobile = path.join(__dirname, "..", "..");
const giris = path.join(os.tmpdir(), `kronikler-dft-giris-${process.pid}.ts`);
const paket = path.join(os.tmpdir(), `kronikler-dft-${process.pid}.cjs`);
fs.writeFileSync(giris, `export * from ${JSON.stringify(path.join(mobile, "lib/game"))};\nexport * from ${JSON.stringify(path.join(mobile, "lib/defter"))};\nexport { ayinSahnesi } from ${JSON.stringify(path.join(mobile, "lib/events"))};\nexport { CIGIR } from ${JSON.stringify(path.join(mobile, "lib/i18n-cigir"))};\n`);
execSync(`${ESBUILD} ${giris} --bundle --platform=node --format=cjs --outfile=${paket} --log-level=error`, { cwd: mobile, stdio: "inherit" });
const g = require(paket); fs.unlinkSync(giris); fs.unlinkSync(paket);
const hata = [];

// 1) Yetenekler
for (const y of g.SOY_YETENEKLERI) {
  const b = Object.values(y.beceri || {}), st = Object.values(y.stat || {});
  const arti = b.some((v) => v > 1) || st.some((v) => v > 0) || (y.rep || 0) > 0 || (y.honor || 0) > 0;
  const bedel = b.some((v) => v < 1) || st.some((v) => v < 0) || (y.rep || 0) < 0 || (y.honor || 0) < 0;
  if (!arti || !bedel) hata.push(`yetenek ${y.id}: artı=${arti} bedel=${bedel} (her yeteneğin ikisi de olmalı)`);
  if (!g.IZ_ETLERI.includes(y.et)) hata.push(`yetenek ${y.id}: geçersiz eğilim ${y.et}`);
  for (const l of ["tr", "en", "es", "pt", "ar", "ru"]) for (const k of ["ad", "arti", "bedel"]) if (!g.CIGIR[l][`soy.${y.id}.${k}`]) hata.push(`${l}: soy.${y.id}.${k} eksik`);
}
for (const l of ["tr", "en", "es", "pt", "ar", "ru"]) for (const k of ["soy.miras", "soy.kul", "soy.yok", ...g.IZ_ETLERI.map((e) => "yanki.et." + e)]) if (!g.CIGIR[l][k]) hata.push(`${l}: ${k} eksik`);
console.log(`Yetenekler: ${g.SOY_YETENEKLERI.length} yetenek, her biri artı + bedel`);

// 2) Göç fuzz + idempotentlik
const cop = [null, 1, "x", [], {}, { soylar: 5 }, { soylar: [null, 3, { ad: 1 }, { ad: "A", anahtar: "k", nesil: "x", izler: [null, { k: 1 }, { k: "dil:a:0", et: "yok" }, { k: "dil:a:0", et: "cesur", ref: NaN }], yetenek: "uydurma", secilen: "ocak_eli", egilim: "z" }], yaylar: [1, "a", "a"], ikilemler: "x" }];
function rastgele(d) { const r = Math.random(); if (d > 3 || r < 0.2) return [null, 0, -1, NaN, "", "kadın", "cesur", "ocak_eli", true][Math.floor(Math.random() * 9)]; if (r < 0.5) return Array.from({ length: Math.floor(Math.random() * 4) }, () => rastgele(d + 1)); const o = {}; for (const k of ["v", "soylar", "yaylar", "ikilemler", "ad", "anahtar", "soyad", "cins", "nesil", "olumYasi", "meslek", "sifat", "lakaplar", "egilim", "izler", "k", "et", "ref", "yetenek", "secilen"]) if (Math.random() < 0.4) o[k] = rastgele(d + 1); return o; }
for (let i = 0; i < 400; i++) cop.push(rastgele(0));
let gocHata = 0;
for (const x of cop) {
  try { const a = g.defterGoc(x); const b = g.defterGoc(JSON.parse(JSON.stringify(a))); if (JSON.stringify(a) !== JSON.stringify(b)) gocHata++; if (!Array.isArray(a.soylar) || !Array.isArray(a.yaylar) || !Array.isArray(a.ikilemler)) gocHata++; }
  catch (e) { gocHata++; if (gocHata < 3) console.log("  göç hatası:", e.message); }
}
if (gocHata) hata.push(`defter göçü: ${gocHata} bozuk girdi atıldı/idempotent değil`);
console.log(`Göç: ${cop.length} bozuk/rastgele defter onarıldı, idempotent`);

// 3) resetGame defteri silmez
{ const src = fs.readFileSync(path.join(mobile, "lib/store.tsx"), "utf8"); const m = src.match(/const resetGame = useCallback\([\s\S]*?\}, \[/); if (!m) hata.push("resetGame bulunamadı"); else if (/DEFTER_KEY|setDefter|defterYaz/.test(m[0])) hata.push("resetGame deftere dokunuyor"); }

// 4) Nesil zinciri (tohumlu)
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const asil = Math.random;
function yasat(s, yasSon) {
  let guard = 0, ayBasi = s.hseq || 0, para20 = null, ata = null;
  while (!s.player.dead && s.player.age < yasSon && guard++ < 900) {
    if (s.player.hunger < 35) s = g.eat(s);
    if (s.player.age >= 13 && s.player.profession !== "işsiz" && s.player.hunger >= 30) s = g.work(s);
    ayBasi = s.hseq || 0; s = g.advance(s, 1);
    if (!ata) { const e = s.history.slice(-6).find((x) => /^yanki\.ata\./.test(x.k || "")); if (e) ata = { k: e.k, p: e.p, yas: s.player.age }; }
    const r = g.ayinSahnesi(s, ayBasi); s = r.s;
    if (r.dilemma) { const d = r.dilemma; s = g.applyDilemma(s, d.choices[0].gercek || d.choices[0].delta, d.choices[0].result, d.id + ":0", r.tur === "senlik"); }
    else if (r.opp) s = g.resolveOpportunity(s, r.opp, true);
    if (s.npcTeklif && s.npcTeklif.turn === s.turn) s = g.npcTeklifYanit(s, true, 0);
    if (s.hesap) s = g.hesapKarari(s, false);
    if (s.micro) s = g.resolveMicro(s, 0);
    if (para20 == null && s.player.age >= 20) para20 = s.player.money;
  }
  return { s, ata, para20: para20 == null ? s.player.money : para20 };
}
const med = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };
const statTop = (s) => Object.values(s.player.stats).reduce((a, b) => a + b, 0);
const N = parseInt(process.env.DFT_N || "10", 10);
const para1 = [], paraN = []; let ataSatir = 0, ataHafiza = 0, birikim = 0, isleHata = 0; const izOrnek = [];
for (let i = 0; i < N; i++) {
  const tohum = 7000 + i * 104729;
  let defter = g.bosDefter();
  Math.random = mulberry(tohum);
  let s = g.newGame("Ata", "Defter", i % 2 ? "erkek" : "kadın");
  try {
    for (let n = 1; n <= 5; n++) {
      Math.random = mulberry(tohum + n);
      const r = yasat(s, 45); s = r.s;
      if (n === 1) para1.push(r.para20); if (n === 5) paraN.push(r.para20);
      if (n > 1 && r.ata) { ataSatir++; if (izOrnek.length < 6) izOrnek.push(`[${n}. nesil, ${r.ata.yas} yaş] ${r.ata.k} ${JSON.stringify(r.ata.p)}`); }
      if (!s.player.dead) { s = JSON.parse(JSON.stringify(s)); s.player.dead = true; }
      const d1 = g.defterIsle(defter, s); const d2 = g.defterIsle(d1, s); if (JSON.stringify(d1) !== JSON.stringify(d2) || d1.soylar.length !== defter.soylar.length + 1) isleHata++;
      const aday = g.yetenekAdaylari(s); if (aday.length !== 3 || JSON.stringify(aday) !== JSON.stringify(g.yetenekAdaylari(s))) hata.push("yetenekAdaylari 3 deterministik aday vermiyor");
      defter = g.defterSecim(d1, g.hayatAnahtari(s), aday[0]);
      const son = g.sonSoy(defter); if (i === 0 && n === 1) izOrnek.push(...son.izler.map((z) => z.k + "/" + z.et));
      const cins = n % 2 ? "kadın" : "erkek"; Math.random = mulberry(tohum * 3 + n); const yalin = g.newGame("Torun" + n, son.soyad, cins);
      Math.random = mulberry(tohum * 3 + n);
      s = g.kulDenYeniOcak("Torun" + n, son.soyad, cins, { name: son.ad, izler: son.izler, nesil: son.nesil }, son.secilen);
      const yt = g.SOY_YETENEKLERI.find((y) => y.id === son.secilen); const statArti = Object.values((yt && yt.stat) || {}).reduce((a, v) => a + Math.max(0, v), 0);
      if (son.izler.length && !(s.hafiza || []).some((x) => x.ata === son.ad)) ataHafiza++;
      if (s.player.generation !== n + 1) hata.push(`nesil sayacı ${s.player.generation} ≠ ${n + 1}`);
      if (s.player.money > yalin.player.money || statTop(s) > statTop(yalin) + statArti || s.player.reputation > yalin.player.reputation + 8) birikim++;
    }
  } finally { Math.random = asil; }
}
const m1 = med(para1), mN = med(paraN); const kayma = m1 ? Math.round((Math.abs(mN - m1) / Math.abs(m1)) * 1000) / 10 : 0;
console.log(`Nesil zinciri: ${N} soy × 5 nesil · ilk 20 yıl medyan para 1. nesil ${m1}, 5. nesil ${mN} (kayma %${kayma}) · ata yankısı görülen nesil ${ataSatir}/${N * 4}`);
console.log(`  örnek ata izleri: ${izOrnek.join(", ") || "-"}`);
if (isleHata) hata.push(`defterIsle ${isleHata} kez idempotent değil`);
if (ataHafiza) hata.push(`${ataHafiza} yeni ocakta ata izi hafızaya geçmedi`);
if (birikim) hata.push(`${birikim} yeni ocakta başlangıç gücü birikti (para/özellik)`);
if (kayma > 10) hata.push(`medyan para kayması %${kayma} > 10`);
if (ataSatir === 0) hata.push("hiçbir torunda ata yankısı (yanki.ata.*) yok");
if (hata.length) { console.log("DEFTER: " + hata.length + " ihlal\n  " + hata.join("\n  ")); process.exit(1); }
console.log("DEFTER: TEMİZ");
