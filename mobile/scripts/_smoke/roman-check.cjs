// Hayat Romanı denetimi: paylaşım metni gerçek seçim kaydından (Yankı hafızası) kurulur ve 6 dilde temiz basılır.
//  1) Tohumlu hayatlar (ilk/son seçen ikizler): her roman ≥3 satır, dönüm satırları hafızadaki gerçek izlere dayanır.
//  2) 6 dil × kadın/erkek: ham anahtar, artakalan yer tutucu, undefined/NaN, boş satır yok; paylaşım metni ≤ 900 karakter.
//  3) İkiz ayrışması: aynı tohumdan iki hayatın TR romanı farklı olmalı (≥%80 çift). Spoiler: sonuç metni (".r<i>") sızmaz.
// Kullanım: node scripts/_smoke/roman-check.cjs [ROM_N=10] → "ROMAN: TEMİZ" ya da ihlal listesi (exit 1)
const ESBUILD = require("./esbuild-yolu.cjs");
const { execSync } = require("child_process");
const os = require("os"); const fs = require("fs"); const path = require("path");
const mobile = path.join(__dirname, "..", "..");
const giris = path.join(mobile, `_roman_giris_${process.pid}.ts`);
const paket = path.join(os.tmpdir(), `kronikler-rom-${process.pid}.cjs`);
fs.writeFileSync(giris, `export * from "./lib/game";\nexport { ayinSahnesi } from "./lib/events";\nexport { availableArcs, arcById } from "./lib/arcs";\nexport { hayatRomani } from "./lib/roman";\nexport { renderEvt, tFor } from "./lib/i18n";\n`);
try { execSync(`${ESBUILD} ${giris} --bundle --platform=node --format=cjs --outfile=${paket} --log-level=error`, { cwd: mobile, stdio: "inherit" }); } finally { fs.unlinkSync(giris); }
const g = require(paket); fs.unlinkSync(paket);
const hata = []; const LANGS = ["tr", "en", "es", "pt", "ar", "ru"];
const HAM = /\b(roman|yanki|dil|arc|ep|soy|lakap)\.[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*/;
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const asil = Math.random;
function hayat(tohum, pol, cins) {
  Math.random = mulberry(tohum); const sec = (n) => (pol === "ilk" ? 0 : n - 1);
  let s = g.newGame("Roman", "Deneme", cins); let guard = 0, ayBasi = 0;
  try {
    while (!s.player.dead && guard++ < 900) {
      if (s.player.hunger < 35) s = g.eat(s);
      if (s.player.age >= 13 && s.player.profession !== "işsiz" && s.player.hunger >= 30) s = g.work(s);
      if (s.player.age >= 16 && !s.story.active && guard % 40 === 0) { const av = g.availableArcs(s.player, s.story.completed, s.story.tension, null); if (av.length) s = g.beginArc(s, av[0].id); }
      else if (s.story.active) { const a = g.arcById(s.story.active.id); const st = a && a.stages[s.story.active.stage]; s = g.advanceArc(s, st ? sec(st.choices.length) : 0); }
      ayBasi = s.hseq || 0; s = g.advance(s, 1);
      const r = g.ayinSahnesi(s, ayBasi); s = r.s;
      if (r.dilemma) { const d = r.dilemma; const i = sec(d.choices.length); s = g.applyDilemma(s, d.choices[i].gercek || d.choices[i].delta, d.choices[i].result, d.id + ":" + i, r.tur === "senlik"); }
      else if (r.opp) s = g.resolveOpportunity(s, r.opp, pol === "ilk");
      if (s.npcTeklif && s.npcTeklif.turn === s.turn) s = g.npcTeklifYanit(s, pol === "ilk", 0);
      if (s.hesap) s = g.hesapKarari(s, false);
      if (s.micro) s = g.resolveMicro(s, sec(2));
    }
  } finally { Math.random = asil; }
  return s;
}
const bas = (s, L) => { const kadin = s.player.gender === "kadın"; const t = (k) => g.tFor(L, k); return g.hayatRomani(s).satirlar.map((x) => g.renderEvt(x.k, "", x.p, L, t, kadin)); };
const N = parseInt(process.env.ROM_N || "10", 10);
let ayrisan = 0, satirTop = 0, donumTop = 0, roman = 0; const ornek = [];
for (let i = 0; i < N; i++) {
  const tohum = 31337 + i * 7907; const cins = i % 2 ? "kadın" : "erkek";
  const A = hayat(tohum, "ilk", cins), B = hayat(tohum, "son", cins);
  // canlı hâl de denensin: B'nin 30 yaş kopyası yerine A'nın canlı bir kopyası
  const canli = JSON.parse(JSON.stringify(A)); canli.player.dead = false;
  for (const s of [A, B, canli]) {
    roman++; const r = g.hayatRomani(s); satirTop += r.satirlar.length; donumTop += r.donumSayisi;
    if (r.satirlar.length < 3) hata.push(`tohum ${tohum}: roman ${r.satirlar.length} satır`);
    if ((s.hafiza || []).filter((x) => !x.ata && !x.k.startsWith("kapi:")).length >= 3 && r.donumSayisi === 0) hata.push(`tohum ${tohum}: hafıza dolu ama dönüm satırı yok`);
    for (const x of r.satirlar) if (x.k === "roman.donum") { const b = x.p[1]; if (!b || !b.sfx || !(s.hafiza || []).some((iz) => b.sfx.split(".")[1] === iz.k.split(":")[1])) hata.push(`tohum ${tohum}: dönüm satırı hafızada olmayan bir seçime dayanıyor`); }
    for (const L of LANGS) {
      const satir = bas(s, L); const metin = satir.join("\n");
      for (const t of satir) { if (!t || !t.trim()) hata.push(`${L}: boş satır`); else if (/%\d|%[a-z]\b|undefined|NaN|\[object/.test(t) || HAM.test(t)) hata.push(`${L}: kirli satır «${t}»`); }
      if (metin.length > 900) hata.push(`${L}: paylaşım metni ${metin.length} > 900`);
      if (/\.r\d/.test(JSON.stringify(g.hayatRomani(s).satirlar))) hata.push("sonuç metni (spoiler) romana sızdı");
    }
  }
  const tA = bas(A, "tr").join("\n"), tB = bas(B, "tr").join("\n");
  if (tA !== tB) ayrisan++;
  if (ornek.length < 1) ornek.push({ A: tA, B: tB, Aen: bas(A, "en").join("\n") });
}
const yuzde = Math.round((ayrisan / N) * 1000) / 10;
console.log(`Roman: ${roman} roman · ortalama ${(satirTop / roman).toFixed(1)} satır · ${(donumTop / roman).toFixed(1)} dönüm · 6 dil × kadın/erkek temiz basım`);
console.log(`İkiz romanlar (aynı tohum, ilk/son seçen): %${yuzde} farklı`);
console.log("  — ilk-seçen —\n    " + ornek[0].A.split("\n").join("\n    "));
console.log("  — son-seçen —\n    " + ornek[0].B.split("\n").join("\n    "));
console.log("  — ilk-seçen (en) —\n    " + ornek[0].Aen.split("\n").join("\n    "));
if (yuzde < 80) hata.push(`ikiz roman ayrışması %${yuzde} < 80`);
const tekil = [...new Set(hata)];
if (tekil.length) { console.log("ROMAN: " + tekil.length + " ihlal\n  " + tekil.slice(0, 20).join("\n  ")); process.exit(1); }
console.log("ROMAN: TEMİZ");
