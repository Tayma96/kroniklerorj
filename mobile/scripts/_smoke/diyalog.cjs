// Diyalog bekçisi: gerçek hayatlarda NPC'lerle 8 niyetin hepsiyle, 6 dilde ve iki cinsiyetle sohbet edilir.
// Hata sayılanlar: artakalan yer tutucu (%n, %p, %g, %q…), ham anahtar (dlg./f./pp.), "undefined"/"NaN", boş satır;
// bir kişiyle bir ayda sohbetten kazanılan ilişkinin tavanı (12) aşması (farm kapalı kalmalı).
// Ayrıca derinlik katmanlarının (takip / ısrar / oyuncuyu fark etme / kişilik / mevsim / can dostu–hasım bandı)
// her birinin gerçekten devreye girdiği ve kadın oyuncuya .f varyantının seçildiği doğrulanır.
// Kullanım: node scripts/_smoke/diyalog.cjs [hayat sayısı, varsayılan 12]
const ESBUILD = require("./esbuild-yolu.cjs");
const path = require("path"); const fs = require("fs"); const os = require("os"); const { execSync } = require("child_process");
const kok = path.join(__dirname, "..", ".."); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "diyalog-"));
const giris = path.join(kok, "_diyalog_giris.ts");
fs.writeFileSync(giris, 'export * as g from "./lib/game";\nexport * as d from "./lib/dialogue";\nexport { tFor } from "./lib/i18n";\n');
try { execSync(`${ESBUILD} "${giris}" --bundle --format=cjs --platform=node --outfile="${tmp}/d.cjs" --log-level=error`, { cwd: kok, stdio: "inherit" }); }
finally { fs.unlinkSync(giris); }
const { g, d, tFor } = require(`${tmp}/d.cjs`);
const LANGS = ["tr", "en", "es", "pt", "ar", "ru"]; const NIYET = ["hosbes", "iltifat", "dert", "saka", "is", "aile", "dunya", "hedef"];
const R = (a) => a[Math.floor(Math.random() * a.length)];
const KOTU = /%[a-zA-Z0-9]|\bundefined\b|\bNaN\b|\[object|\b(dlg|pp|f)\.[a-z]+\.[A-Za-z0-9_.]+/;
const HAYAT = +(process.argv[2] || 12); let sorun = 0, satir = 0; const ornek = [];
const hata = (m) => { sorun++; if (ornek.length < 12) ornek.push(m); };

// Derinlik metinleri (dile göre) — akışta gerçekten görünüyorlar mı diye sayılır
const DERIN = {}; let derinGorulen = 0;
const DK = ["dlg.takip.dert", "dlg.takip.iltifat", "dlg.takip.saka", "dlg.takip.hedef", "dlg.takip.aile", "dlg.takip.is", "dlg.takip.dunya", "dlg.takip.hosbes", "dlg.takip.kotu", "dlg.takip.kapali",
  "dlg.pa.unlu", "dlg.pa.onurlu", "dlg.pa.mulk", "dlg.pa.korku", "dlg.pa.ayni", "dlg.ks.kibirli", "dlg.ks.comert", "dlg.ks.neseli", "dlg.ks.kurnaz", "dlg.ks.dindar", "dlg.ks.utangac",
  "dlg.mevsim.kis", "dlg.mevsim.ilk", "dlg.mevsim.yaz", "dlg.mevsim.son", "dlg.hosbes.candost", "dlg.hosbes.candost2", "dlg.hosbes.rakip", "dlg.hosbes.rakip2"];
for (const L of LANGS) DERIN[L] = DK.flatMap((k) => [tFor(L, k), tFor(L, k + ".f")]).filter((x) => x && !x.startsWith("dlg."));
// 1) Gerçek oyun: sohbet akışı
for (let h = 0; h < HAYAT; h++) {
  const L = LANGS[h % LANGS.length]; const kadin = h % 2 === 1;
  let s = g.newGame("Sim", "Test", kadin ? "kadın" : "erkek"); let guard = 0;
  while (!s.player.dead && guard++ < 900) {
    if (s.player.hunger < 35) s = g.eat(s);
    if (s.player.age >= 13 && s.player.profession !== "işsiz") s = g.work(s);
    if (s.player.age >= 13) {
      const ns = g.npcsOf(s); const kaz = {};
      for (let k = 0; k < 3 && ns.length; k++) {
        const npc = R(ns);
        for (const niyet of NIYET) {
          if (Math.random() < 0.5) continue;
          const r = g.talkWith(s, npc, niyet, L); s = r.state;
          if (!r.line && r.delta === 0) continue; // bu ay bu kanal kullanılmış
          satir++; if (DERIN[L].some((x) => r.line.includes(x))) derinGorulen++;
          if (!r.line || !r.line.trim() || KOTU.test(r.line)) hata(`[${L}${kadin ? "/k" : ""}] ${niyet}: ${JSON.stringify(r.line)}`);
          if (r.delta > 0) { kaz[npc.id] = (kaz[npc.id] || 0) + r.delta; if (kaz[npc.id] > 12) hata(`aylık sohbet tavanı aşıldı: ${npc.id} +${kaz[npc.id]}`); }
        }
      }
    }
    s = g.advance(s, 1);
  }
}

// 2) Katman kapsamı (doğrudan): her katmanın her dilde ve iki cinsiyette dolu metin verdiği
const npc0 = { id: "x", name: "Ayşe Bal", age: 30, gender: "kadın", profession: "demirci", trait: "kibirli", quirk: "", goal: "" };
const taban = { female: false, playerProf: "asker", fame: 0, honor: 0, fear: 0, season: "Kış", rel: 0, turn: 10, israr: false };
const durum = [
  ["takip", "hosbes", { son: { i: "dert", t: 5, ok: 1 } }],
  ["takip", "dert", { israr: true, son: { i: "dert", t: 5, ok: 2 } }],
  ["takip", "hosbes", { son: { i: "saka", t: 5, ok: 0 } }],
  ["oyuncu", "is", {}],
  ["oyuncu", "is", { playerProf: "demirci" }],
  ["oyuncu", "hosbes", { fear: 80 }],
  ["oyuncu", "hosbes", { fame: 80 }],
  ["oyuncu", "hosbes", { honor: 80 }],
  ["oyuncu", "hosbes", { mulk: 4 }],
  ["kisilik", "dunya", {}],
  ["mevsim", "hosbes", { season: "Yaz" }],
];
const goruldu = new Set();
for (const L of LANGS) for (const female of [false, true]) {
  for (const [katman, niyet, ek] of durum) {
    let tuttu = false;
    for (let i = 0; i < 200 && !tuttu; i++) {
      const o = d.derinlikKatmani(katman === "mevsim" ? { ...npc0, trait: "mert" } : npc0, niyet, { ...taban, female, ...ek }, L);
      if (o.katman === katman) { tuttu = true; goruldu.add(katman); if (!o.on || KOTU.test(o.on)) hata(`[${L}] ${katman}: ${JSON.stringify(o.on)}`); }
    }
    if (!tuttu) hata(`[${L}${female ? "/k" : ""}] ${katman} katmanı ${niyet} için hiç devreye girmedi`);
  }
  for (const rel of [80, -50]) {
    const o = d.derinlikKatmani(npc0, "hosbes", { ...taban, female, rel }, L);
    if (!o.bant || KOTU.test(o.bant)) hata(`[${L}] bant (${rel}) boş/bozuk: ${JSON.stringify(o.bant)}`); else goruldu.add(rel > 0 ? "candost" : "rakip");
  }
}
// Kadın oyuncuya .f gerçekten seçiliyor mu (Arapça can dostu selamı dişil olmalı)
{
  const f = d.derinlikKatmani(npc0, "hosbes", { ...taban, female: true, rel: 80 }, "ar").bant;
  const fk = [tFor("ar", "dlg.hosbes.candost.f"), tFor("ar", "dlg.hosbes.candost2.f")];
  if (!fk.includes(f)) hata(`Arapça kadın oyuncuya .f seçilmedi: ${f}`);
}
// Israr gerçekten kapıyı açar mı: yabancı ve kapalı huylu kişi dert açmaz, ısrarla açar
{
  const npc = { ...npc0, trait: "kibirli" };
  const a = d.converse(npc, 0, 0, 0, "dert", "tr", false), b = d.converse(npc, 0, 0, 0, "dert", "tr", true);
  if (!a.kapali || b.kapali) hata(`ısrar dert kapısını açmadı (önce ${a.kapali}, sonra ${b.kapali})`);
}
fs.rmSync(tmp, { recursive: true, force: true });
if (satir > 500 && derinGorulen === 0) hata("oyun akışında hiç derinlik katmanı görünmedi");
console.log(`DİYALOG · ${HAYAT} hayat · ${satir} satır (derinlik katmanlı ${derinGorulen}) · katmanlar: ${[...goruldu].sort().join(", ")}`);
for (const o of ornek) console.log("  " + o);
console.log(sorun ? `DİYALOG: ${sorun} SORUN` : "DİYALOG: TEMİZ (0 sorun)");
process.exit(sorun ? 1 : 0);
