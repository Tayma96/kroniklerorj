// Meslek pirinin ömür eseri: 15 meslek × 2 seçim, tek üretim, kayıt göçü ve vârise gerçek soy izi.
const assert = require("node:assert/strict"), path = require("node:path"), esbuild = require("esbuild");
const root = path.resolve(__dirname, "../.."), copy = structuredClone;

(async () => {
  const build = await esbuild.build({ entryPoints: [path.join(root, "lib/game.ts")], bundle: true, platform: "node", format: "cjs", write: false });
  const module = { exports: {} }; new Function("module", "exports", "require", build.outputFiles[0].text)(module, module.exports, require); const g = module.exports;
  let cases = 0;
  assert.equal(g.SAHESERLER.length, g.PROFESSIONS.length * 2); cases++;
  for (const pr of g.PROFESSIONS) {
    const opts = g.meslekSaheserleri(pr.id); assert.equal(opts.length, 2, pr.id); assert.notEqual(opts[0].alan, opts[1].alan, pr.id + " anlamlı tercih"); cases += 2;
  }

  const base = g.newGame("Usta", "Ocak", "kadın"), p = base.player, sec = g.meslekSaheserleri("demirci")[0];
  Object.assign(p, { age: 50, base_age: 50, profession: "demirci", kademe: 3, capstones: ["demirci"], career_xp: 179, money: 2000 });
  assert.equal(g.saheserYapabilir(base, sec.id), false); cases++;
  p.career_xp = 180; p.meslek_pirleri = ["demirci"];
  const cost = g.saheserBedeli(base), made = g.saheserYap(base, sec.id);
  assert.equal(base.saheserler, undefined); assert.equal(made.player.money, p.money - cost); assert.equal(made.saheserler.length, 1); assert.equal(made.saheserler[0].nesil, p.generation); assert(made.history.some((e) => e.k === "se.made")); cases += 5;
  assert.deepEqual(g.saheserYap(made, g.meslekSaheserleri("demirci")[1].id), made); cases++;

  const kirli = copy(made); kirli.saheserler.push({ id: "uydurma", prof: "kral", alan: "savas", yapan: 7, nesil: -2, turn: -1 });
  kirli.saheserler[0].prof = "kral"; kirli.saheserler[0].alan = "bereket";
  const temiz = g.migrate(kirli); assert.equal(temiz.saheserler.length, 1); assert.equal(temiz.saheserler[0].prof, "demirci"); assert.equal(temiz.saheserler[0].alan, sec.alan); cases += 3;

  const plain = g.newGame("Ata", "Ocak", "erkek"); plain.player.dead = true; plain.player.children = ["Vâris"];
  const legacy = copy(plain), alanlar = ["bereket", "zanaat", "ticaret", "savas", "sosyal", "saglik"];
  legacy.saheserler = alanlar.map((alan, i) => { const d = g.SAHESERLER.find((x) => x.alan === alan); return { ...d, yapan: "Ata " + i, nesil: i + 1, turn: i }; });
  const pv0 = g.heirPreview(plain, "Vâris"), pv1 = g.heirPreview(legacy, "Vâris");
  assert.equal(pv1.money, pv0.money + 50); assert.equal(pv1.rep, pv0.rep + 3); assert.equal(pv1.points, pv0.points + 1); cases += 3;
  const h0 = g.continueAsHeir(plain, "esit", "Vâris"), h1 = g.continueAsHeir(legacy, "esit", "Vâris");
  assert.equal(h1.player.skills.crafting, h0.player.skills.crafting + 1); assert.equal(h1.player.skills.trade, h0.player.skills.trade + 1); assert.equal(h1.player.skills.combat, h0.player.skills.combat + 1); assert.equal(h1.saheserler.length, alanlar.length); cases += 4;
  console.log(`ŞAHESER: TEMİZ · ${cases} denetim · 30 eser · tek ömür seçimi · göç · altı soy izi · vâris aktarımı`);
})().catch((e) => { console.error(e); process.exitCode = 1; });
