// Rakip hanedan dengesi: 20 yıllık çoklu tohum, kriz/toparlanma, doğal tavan ve yaşayan taht hesabı.
const assert = require("node:assert/strict"), path = require("node:path"), esbuild = require("esbuild");
const root = path.resolve(__dirname, "../.."), copy = structuredClone;
const rng = (seed) => { let x = seed >>> 0; return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296); };

(async () => {
  const build = await esbuild.build({ stdin: { contents: 'export * as g from "./lib/game"; export * as w from "./lib/world";', resolveDir: root, loader: "ts" }, bundle: true, platform: "node", format: "cjs", write: false });
  const module = { exports: {} }; new Function("module", "exports", "require", build.outputFiles[0].text)(module, module.exports, require); const { g, w } = module.exports;
  let cases = 0, finalPowers = [], crisisKinds = new Set(), saturated = 0, narrow = 0;
  for (let seed = 1; seed <= 24; seed++) {
    const houses = w.generateDynasties(seed), r = rng(seed * 7919);
    for (let month = 0; month < 240; month++) for (const h of houses) {
      const out = g.rivalHouseMonth(h, r(), r(), r()); if (out.started) crisisKinds.add(out.started);
      assert(h.power >= 20 && h.power <= 100, `sınır ${seed}/${month}/${h.id}`);
    }
    const powers = houses.map((h) => h.power); finalPowers.push(...powers); saturated += powers.filter((x) => x >= 95).length;
    if (Math.max(...powers) - Math.min(...powers) < 8) narrow++; cases++;
  }
  const avg = finalPowers.reduce((a, x) => a + x, 0) / finalPowers.length;
  assert(avg >= 48 && avg <= 74, `ortalama güç ${avg}`); assert(saturated / finalPowers.length < 0.12, `tavana yığılma ${saturated}/${finalPowers.length}`); assert(narrow <= 3, `fazla yakın dağılım ${narrow}/24`); assert.equal(crisisKinds.size, 4); cases += 4;

  const high = { ...w.generateDynasties(41, 1)[0], trait: "cömert", power: 100 }, low = { ...w.generateDynasties(42, 1)[0], trait: "ihtiraslı", power: 20 };
  for (let i = 0; i < 12; i++) { g.rivalHouseMonth(high, .5, .9, .5); g.rivalHouseMonth(low, .5, .9, .5); }
  assert(high.power < 80, `yüksek güç bakım ödemeli: ${high.power}`); assert(low.power > 40, `zayıf hane toparlanmalı: ${low.power}`); cases += 2;
  const crisis = { ...w.generateDynasties(43, 1)[0], crisis: { kind: "borc", left: 1 } };
  const end = g.rivalHouseMonth(crisis, .5, .9, .5); assert.equal(end.ended, "borc"); assert.equal(crisis.crisis, undefined); cases += 2;

  const bad = g.newGame("Kayıt", "Ocak", "erkek"); bad.rivals = w.generateDynasties(7, 1); bad.rivals[0].trend = NaN; bad.rivals[0].crisis = { kind: "uydurma", left: -2 };
  g.migrate(bad); assert.equal(bad.rivals[0].trend, undefined); assert.equal(bad.rivals[0].crisis, undefined); cases += 2;

  const throne = g.newGame("Aday", "Ocak", "kadın"); Object.assign(throne.player, { fame: 60, reputation: 50, honor: 50, generation: 3 }); throne.player.skills.combat = 5;
  const weak = copy(throne), strong = copy(throne);
  weak.rivals = w.generateDynasties(9).map((h) => ({ ...h, power: 20 })); strong.rivals = w.generateDynasties(9).map((h) => ({ ...h, power: 100 }));
  assert(g.throneOdds(weak) > g.throneOdds(strong), "taht hesabı yaşayan hane gücünü okumalı"); cases++;
  console.log(`RAKİP HANEDAN: TEMİZ · ${cases} küme · 24 tohum × 20 yıl · ortalama ${avg.toFixed(1)} · tavanda ${saturated}/${finalPowers.length} · yakın ${narrow}/24 · 4 kriz`);
})().catch((e) => { console.error(e.stack); process.exitCode = 1; });
