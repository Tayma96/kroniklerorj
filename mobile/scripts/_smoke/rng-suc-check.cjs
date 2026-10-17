const assert = require("node:assert/strict");
const path = require("node:path");
const esbuild = require("esbuild");
const copy = (x) => structuredClone(x);

(async () => {
  const built = await esbuild.build({
    stdin: { contents: 'export * as g from "./lib/game";', resolveDir: path.resolve(__dirname, "../.."), loader: "ts" },
    bundle: true, platform: "node", format: "cjs", write: false,
  });
  const box = { exports: {} };
  new Function("module", "exports", "require", built.outputFiles[0].text)(box, box.exports, require);
  const { g } = box.exports;
  const original = Math.random;
  let base;
  try {
    Math.random = () => 0.3141592653;
    base = g.newGame("Kayıt", "Zarı", "erkek");
  } finally { Math.random = original; }
  Object.assign(base.player, {
    age: 30, base_age: 30, money: 2000, health: 100, hunger: 80,
    crime_wins: 30, fear: 50, faction: "golge",
    stats: { strength: 5, intelligence: 5, charisma: 5, stamina: 5 },
  });

  const noAmbient = (fn) => {
    const old = Math.random;
    Math.random = () => { throw new Error("Suç akışı ortam Math.random kullandı"); };
    try { return fn(); } finally { Math.random = old; }
  };
  const same = (state, action, label) => {
    const saved = JSON.stringify(state);
    const a = noAmbient(() => action(JSON.parse(saved)));
    const b = noAmbient(() => action(JSON.parse(saved)));
    assert.deepEqual(a, b, label + " aynı kayıtta değişti");
    assert.notEqual(a.rng_state, state.rng_state, label + " kayıtlı zarı ilerletmedi");
    return a;
  };

  const legacy = copy(base); delete legacy.rng_state;
  const migratedA = g.migrate(copy(legacy)), migratedB = g.migrate(copy(legacy));
  assert.equal(migratedA.rng_state, migratedB.rng_state, "Eski kaydın RNG göçü kararlı değil");
  assert.equal(g.migrate(copy(migratedA)).rng_state, migratedA.rng_state, "RNG göçü idempotent değil");

  let wins = 0, interruptions = 0, cases = 0;
  for (const kind of ["yankesicilik", "dukkan_soyma", "soygun", "konak_soygunu"]) {
    for (const seed of [1, 7, 29, 113, 997, 65537]) {
      const s = copy(base); s.rng_state = seed; delete s.player.last_crime_turn;
      const out = same(s, (x) => g.doCrime(x, kind), "Suç/" + kind + "/" + seed);
      if (out.history.some((e) => e.k === "evj.crimeWin")) wins++;
      if (out.pendingScene?.kind === "crime") interruptions++;
      cases++;
    }
  }
  assert(wins > 0 && interruptions > 0, "Başarı ve kesinti yollarının ikisi de kapsanmadı");

  for (const choice of ["saklan", "rusvet", "kac"]) {
    const s = copy(base); s.rng_state = 41; s.pendingScene = { kind: "crime", ctx: { crime: "konak_soygunu" } };
    same(s, (x) => g.resolveCrimeScene(x, choice), "Kaçış/" + choice); cases++;
  }
  for (const guild of [null, "golge"]) {
    const s = copy(base); s.rng_state = 73; s.player.faction = guild; s.player.hotGoods = 120;
    same(s, (x) => g.fenceHotGoods(x), "Kara borsa/" + guild); cases++;
  }

  const witness = Object.keys(base.relationships)[0] || Object.keys(base.pop.k).find((id) => id !== base.player.mother_id && id !== base.player.father_id);
  assert(witness, "Mahkeme tanığı bulunamadı");
  for (const choice of ["savun", "tanik", "boyun"]) {
    const s = copy(base); s.rng_state = 211; s.pendingScene = { kind: "trial", ctx: { crime: "soygun" } }; s.relationships[witness] = 80;
    same(s, (x) => g.resolveTrial(x, choice), "Mahkeme/" + choice); cases++;
  }

  const seqA = copy(base), seqB = JSON.parse(JSON.stringify(base));
  const a = noAmbient(() => [g.gameRandom(seqA), g.gameRandom(seqA), g.gameRandom(seqA)]);
  const b = noAmbient(() => [g.gameRandom(seqB), g.gameRandom(seqB), g.gameRandom(seqB)]);
  assert.deepEqual(a, b, "Kayıtlı RNG dizisi yeniden yüklemede değişti");

  console.log(`KAYITLI SUÇ ZARI: TEMİZ · ${cases} eylem · ${wins} başarı · ${interruptions} kesinti · kaçış/kara borsa/mahkeme · eski kayıt göçü`);
})().catch((e) => { console.error(e.stack); process.exitCode = 1; });
