// Geç oyun denetimi (çığır Sütun 5: asabiye ve veraset):
//  1) 50+ yaşı yaşayan her hayatta SON_YAS destesinden en az bir soru gelir; asabiye hayatlar arasında en az 3 farklı banda yayılır.
//  2) Vasiyet kartı veraset kararını gerçekten yazar (ilk/gözde/eşit); asabiye vârise yarı yarıya söner.
//  3) Parite: heirPreview'un gösterdiği itibar = continueAsHeir'in verdiği itibar (asabiye dahil), uç asabiye değerlerinde.
// Kullanım: node scripts/_smoke/gec-check.cjs → "GEÇ OYUN: TEMİZ" ya da ihlal listesi (exit 1)
const ESBUILD = require("./esbuild-yolu.cjs");
const { execSync } = require("child_process"); const os = require("os"); const fs = require("fs"); const path = require("path");
const mobile = path.join(__dirname, "..", ".."); const giris = path.join(mobile, `_gec_giris_${process.pid}.ts`); const paket = path.join(os.tmpdir(), `kr-gec-${process.pid}.cjs`);
fs.writeFileSync(giris, `export * from "./lib/game";\nexport { ayinSahnesi, SON_YAS } from "./lib/events";\n`);
try { execSync(`${ESBUILD} ${giris} --bundle --platform=node --format=cjs --outfile=${paket} --log-level=error`, { cwd: mobile, stdio: "inherit" }); } finally { fs.unlinkSync(giris); }
const g = require(paket); fs.unlinkSync(paket); const hata = [];
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const asil = Math.random; const SON = new Set(g.SON_YAS.map((d) => d.id));
const N = parseInt(process.env.GEC_N || "10", 10); const bant = {}; let yasli = 0, sonGoren = 0, sonKart = 0; const kartSay = {};
for (let i = 0; i < N; i++) {
  Math.random = mulberry(9000 + i * 7919);
  try {
    let s = g.newGame("Gec", "Deneme", i % 2 ? "kadın" : "erkek"); let guard = 0; let gordu = 0;
    while (!s.player.dead && guard++ < 900) {
      if (s.player.hunger < 35) s = g.eat(s);
      if (s.player.age >= 13 && s.player.profession !== "işsiz" && s.player.hunger >= 30) s = g.work(s);
      const ab = s.hseq || 0; s = g.advance(s, 1); const r = g.ayinSahnesi(s, ab); s = r.s;
      if (r.dilemma) { const d = r.dilemma; const k = Math.floor(Math.random() * d.choices.length); if (SON.has(d.id)) { gordu++; sonKart++; kartSay[d.id] = (kartSay[d.id] || 0) + 1; } s = g.applyDilemma(s, d.choices[k].gercek || d.choices[k].delta, d.choices[k].result, d.id + ":" + k, r.tur === "senlik"); }
      else if (r.opp) s = g.resolveOpportunity(s, r.opp, Math.random() < 0.5);
      if (s.npcTeklif && s.npcTeklif.turn === s.turn) s = g.npcTeklifYanit(s, Math.random() < 0.5, 0);
      if (s.hesap) s = g.hesapKarari(s, false); if (s.micro) s = g.resolveMicro(s, 0);
    }
    if (s.player.age >= 56) { yasli++; if (gordu) sonGoren++; }
    const b = g.asabiyeBandi(s); bant[b] = (bant[b] || 0) + 1;
    if (!s.player.dead) { s = JSON.parse(JSON.stringify(s)); s.player.dead = true; }
    if (s.player.children.length) for (const v of [5, 95]) {
      const t = JSON.parse(JSON.stringify(s)); t.asabiye = v; const heir = t.player.children[0];
      const pv = g.heirPreview(t, heir, "esit"); const h = g.continueAsHeir(t, "esit", heir);
      if (pv.rep !== h.player.reputation) hata.push(`parite: asabiye ${v} → önizleme ${pv.rep}, vâris ${h.player.reputation}`);
      if (h.asabiye !== Math.round(50 + (v - 50) / 2)) hata.push(`asabiye vârise ${h.asabiye} geçti (beklenen ${Math.round(50 + (v - 50) / 2)})`);
    }
  } finally { Math.random = asil; }
}
// Vasiyet kartı
{ const s = g.newGame("Vas", "Deneme", "erkek"); s.player.age = 60; s.player.children = ["A", "B", "C"]; s.player.child_bond = { A: 40, B: 90, C: 50 };
  const ilk = g.applyDilemma(s, { veraset: "ilk" }, "", "son_vasiyet:0"); const goz = g.applyDilemma(s, { veraset: "gozde" }, "", "son_vasiyet:1"); const esit = g.applyDilemma(s, { veraset: "esit" }, "", "son_vasiyet:2");
  if (ilk.succession?.favored !== "A") hata.push("vasiyet: ilk doğan yazılmadı"); if (goz.succession?.favored !== "B") hata.push("vasiyet: emek veren (bağı en güçlü) yazılmadı"); if (esit.succession?.favored) hata.push("vasiyet: eşit paylar gözdeyi silmedi"); }
console.log(`Geç oyun: ${N} hayat · 56+ yaşayan ${yasli}, SON_YAS sorusu gören ${sonGoren} · toplam ${sonKart} geç soru (${Object.keys(kartSay).length}/${g.SON_YAS.length} kart) · ölümde asabiye bantları ${JSON.stringify(bant)}`);
if (yasli && sonGoren < yasli) hata.push(`${yasli - sonGoren} yaşlı hayat geç soru görmedi`);
if (Object.keys(bant).length < 3) hata.push("asabiye bantları yayılmıyor");
if (hata.length) { console.log("GEÇ OYUN: " + hata.length + " ihlal\n  " + [...new Set(hata)].join("\n  ")); process.exit(1); }
console.log("GEÇ OYUN: TEMİZ");
