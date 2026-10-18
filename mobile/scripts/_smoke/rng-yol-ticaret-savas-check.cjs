const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");
const copy = structuredClone;
const root = path.resolve(__dirname, "../..");

(async () => {
  const built = await esbuild.build({
    stdin: { contents: 'export * as g from "./lib/game"; export * as cb from "./lib/combat";', resolveDir: root, loader: "ts" },
    bundle: true, platform: "node", format: "cjs", write: false,
    alias: { "@react-native-async-storage/async-storage": path.join(__dirname, "as-stub.cjs") },
    // Yalnız test paketinde aylık alt sistemleri aç; üretim arayüzünü genişletme.
    plugins: [{ name: "tick-test-exports", setup(build) {
      build.onLoad({ filter: /[/\\]lib[/\\]game\.ts$/ }, async ({ path: file }) => ({
        contents: fs.readFileSync(file, "utf8") + "\nexport {tickCaravan, tickEconomy, tickWars};", loader: "ts",
      }));
    } }],
  });
  const box = { exports: {} };
  new Function("module", "exports", "require", built.outputFiles[0].text)(box, box.exports, require);
  const { g, cb } = box.exports;
  const original = Math.random;
  let base;
  try { Math.random = () => 0.2718281828; base = g.newGame("Yol", "Zarı", "erkek"); }
  finally { Math.random = original; }
  Object.assign(base.player, {
    age: 30, base_age: 30, money: 4000, health: 85, hunger: 90,
    stats: { strength: 3, intelligence: 3, charisma: 3, stamina: 3 },
  });
  const dest = g.LOCATIONS.find((x) => x !== base.player.location_name);
  let checks = 0;
  const noAmbient = (fn) => {
    Math.random = () => { throw new Error("Kayıtlı karar ortam Math.random kullandı"); };
    try { return fn(); } finally { Math.random = original; }
  };
  const same = (state, action, label) => {
    const before = JSON.stringify(state);
    const a = noAmbient(() => action(state));
    assert.equal(JSON.stringify(state), before, label + ": giriş kaydı değişti");
    const b = noAmbient(() => action(JSON.parse(before)));
    assert.deepEqual(a, b, label + ": yeniden açılan kaydın sonucu değişti");
    checks++;
    return a;
  };
  const seeded = (i) => { const s = copy(base); s.rng_state = Math.imul(i, 0x9e3779b1) >>> 0 || 1; return s; };
  const roadKeys = new Set(), warKeys = new Set(), caravanKeys = new Set(), injuryKeys = new Set();
  let bargainsWon = 0, bargainsLost = 0, bluffDifference = 0;
  for (let i = 1; i <= 256; i++) {
    for (const route of ["anayol", "patika", "kervan", "at"]) {
      const s = seeded(i);
      s.player.horse = true; s.player.horse_name = "Doru";
      if (i % 2) s.player.dog = { n: "Karabaş", bond: 50 };
      if (i % 3 === 0) s.player.health = 1;
      if (i % 4 === 0) s.player.properties.push({ type: "ev", loc: dest });
      const out = same(s, (x) => g.travelBy(x, dest, route), "Yol/" + route);
      assert.equal(out.player.location_name, dest);
      assert.notEqual(out.rng_state, s.rng_state);
      for (const e of out.history.slice(s.history.length)) roadKeys.add(e.k);
    }
    const s = seeded(i);
    if (i % 2 === 0) s.player.perks.push("yilmaz");
    const bargain = same(s, (x) => g.rollBargain(x), "Pazarlık");
    const bluff = same(s, (x) => g.rollBargain(x, true), "Blöf");
    assert.equal(bargain.state.rng_state, bluff.state.rng_state, "Her karar tek zar harcamalı");
    assert.notEqual(bargain.state.rng_state, s.rng_state);
    if (bargain.success) bargainsWon++; else bargainsLost++;
    if (bargain.success !== bluff.success) bluffDifference++;
    assert(!bluff.success || bargain.success, "Blöf pazarlıktan daha kolay olamaz");

    const war = seeded(i); war.player.faction = "ahi";
    war.wars = [{ a: "ahi", b: "golge", turnsLeft: 2, aScore: 0, bScore: 0 }];
    const fought = same(war, g.supportWar, "Cephe");
    for (const e of fought.history.slice(war.history.length)) warKeys.add(e.k);
    const repeated = g.supportWar(fought);
    assert.equal(repeated.player.money, fought.player.money);
    assert.equal(repeated.rng_state, fought.rng_state, "Aylık cephe kilidi zar harcamamalı");

    for (const won of [true, false]) {
      const out = same(s, (x) => g.applyBattleOutcome(x, "haydut", won, 35), "Savaş sonucu");
      for (const e of out.history.slice(s.history.length)) injuryKeys.add(e.k);
      assert.deepEqual(g.applyBattleOutcome(out, "haydut", won, 35), out, "Savaş ödülü iki kez verildi");
    }
  }
  for (const key of ["evj.pathAmbush", "evj.dogSave", "horse.lost", "evj.rideAmbush", "evj.diePath", "evj.trMerchWin", "evj.trMerchLose", "evj.home4"])
    assert(roadKeys.has(key), "Yol dalı kapsanmadı: " + key);
  assert(roadKeys.size >= 40, "Yol olay havuzu yeterince sınanmadı");
  assert(warKeys.has("evj.frontWin") && warKeys.has("evj.frontLose"));
  assert(injuryKeys.has("evj.injure") && injuryKeys.has("evj.injurePerm") && injuryKeys.has("evj.nemTaunt"));
  assert(bargainsWon && bargainsLost && bluffDifference);

  for (let i = 1; i <= 64; i++) {
    const s = seeded(i);
    const out = same(s, (x) => g.launchCaravan(x, 600, i % 2 === 0), "Kervan çıkışı");
    assert(out.caravan && out.caravan.route.length >= 3 && out.caravan.route.length <= 4);
    assert.equal(new Set(out.caravan.route).size, out.caravan.route.length, "Rota aynı konağı tekrar etti");
    assert.equal(out.player.money, s.player.money - 600 - (out.caravan.insured ? g.caravanPremium(600) : 0));
    same(out, (x) => {
      const next = copy(x);
      while (next.caravan) { next.turn++; g.tickCaravan(next); }
      return next;
    }, "Kervan yol/yağma/kâr").history.forEach((e) => caravanKeys.add(e.k));
    const market = seeded(i); market.turn = 12;
    const economy = same(market, (x) => { const n = copy(x); g.tickEconomy(n, true); return n; }, "Piyasa");
    assert(economy.econ >= 0.7 && economy.econ <= 1.5);
    same(market, (x) => { const n = copy(x); g.tickWars(n, true); return n; }, "Ocak savaşları");
  }
  assert(caravanKeys.has("evj.carArrive2") && caravanKeys.has("evj.carInsPay"));
  assert(caravanKeys.has("evj.carRaid") || caravanKeys.has("evj.carRaid2"));

  for (const blocked of ["dead", "jail", "child"]) {
    const s = seeded(7);
    if (blocked === "dead") s.player.dead = true;
    if (blocked === "jail") s.player.jail = { left: 3, kind: "soygun" };
    if (blocked === "child") s.player.age = 10;
    const out = g.rollBargain(s);
    assert.equal(out.state, s, "Kapalı pazarlık zar harcamamalı: " + blocked);
  }
  const locked = g.startBattleAttempt(base);
  assert.notEqual(locked.rng_state, base.rng_state);
  assert.deepEqual(g.startBattleAttempt(locked), locked, "Dövüşe tekrar giriş zarı değiştirdi");
  const empty = copy(base); empty.player.money = 0;
  assert.equal(g.travelBy(empty, dest, "kervan").rng_state, empty.rng_state);
  assert.equal(g.launchCaravan(empty, 600).rng_state, empty.rng_state);
  assert.equal(g.travelBy(base, base.player.location_name, "anayol").rng_state, base.rng_state);

  // Her arketip ve duruş: dövüş ortasında JSON'a yaz/oku, aynı sonraki hamle aynı sonucu vermeli.
  let battles = 0, rounds = 0;
  const combatKeys = new Set();
  for (const enc of g.ENCOUNTERS) for (const stance of ["dengeli", "saldirgan", "savunmaci"]) for (const seed of [1, 71, 123456789]) {
    const player = copy(base.player);
    if (seed === 71) player.equipped.kalkan = "kalkan";
    if (seed === 123456789) { player.equipped.silah = "yay"; player.perks.push("kalkanli"); }
    let bs = noAmbient(() => cb.startBattle(player, enc, seed));
    assert.deepEqual(bs, noAmbient(() => cb.startBattle(player, enc, seed)));
    while (!bs.over && bs.round < 100) {
      const move = ["hamle", "savustur", "ozel"][bs.round % 3];
      bs = same(bs, (x) => cb.stepBattle(x, player, move, stance), "Taktik savaş"); rounds++;
      bs.log.forEach((e) => {
        combatKeys.add(e.k);
        if (e.p?.some((p) => p?.lk === "cb.log.tieBlock")) combatKeys.add("cb.log.tieBlock");
      });
    }
    assert(bs.over, "Dövüş sonuçlanmadı");
    assert.equal(cb.stepBattle(bs, base.player, "hamle"), bs, "Biten dövüş tekrar zar attı");
    battles++;
  }
  for (const key of ["cb.log.tie", "cb.log.win", "cb.log.loseOpen", "cb.log.loseBlock", "cb.log.tieBlock", "cb.log.volley", "cb.log.desperate", "cb.log.victory", "cb.log.defeat"])
    assert(combatKeys.has(key), "Savaş dalı kapsanmadı: " + key);
  const migrated = g.migrate(copy(locked));
  assert.equal(migrated.rng_state, locked.rng_state);
  assert.deepEqual(g.migrate(copy(migrated)), migrated);
  console.log(`KAYITLI YOL/TİCARET/SAVAŞ: TEMİZ · ${checks} tekrar · ${roadKeys.size} yol sonucu · ${battles} dövüş/${rounds} hamle · kervan/sigorta · pazarlık/blöf · aylık kilit · göç`);
})().catch((e) => { console.error(e.stack); process.exitCode = 1; });
