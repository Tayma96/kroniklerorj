// Mesleklerin tahttan bağımsız uzun ömür yolu: 15/15 tanım, eşikler, ücret ve imza etkileri.
const assert = require("node:assert/strict"), path = require("node:path"), esbuild = require("esbuild");
const root = path.resolve(__dirname, "../..");
const copy = (x) => JSON.parse(JSON.stringify(x));

(async () => {
  const build = await esbuild.build({ entryPoints: [path.join(root, "lib/game.ts")], bundle: true, platform: "node", format: "cjs", write: false });
  const module = { exports: {} }; new Function("module", "exports", "require", build.outputFiles[0].text)(module, module.exports, require); const g = module.exports;
  assert.equal(Object.keys(g.MESLEK_YOLLARI).length, g.PROFESSIONS.length);
  const base = g.newGame("Usta", "Ocak", "kadın"); let cases = 0;
  for (const pr of g.PROFESSIONS) {
    const s = copy(base), p = s.player;
    p.age = p.base_age = 35; p.profession = pr.id; p.kademe = 3; p.capstones = [pr.id]; p.career_xp = 90; p.money = 1000; p.hunger = 60;
    assert.equal(g.meslekYoluKademesi(p), 1, pr.id + " usta");
    const baseMult = g.workForecast(s).mult;
    p.career_xp = 126; assert.equal(g.meslekYoluKademesi(p), 2, pr.id + " ocak"); assert(g.workForecast(s).mult > baseMult, pr.id + " kök ücreti");
    p.career_xp = 179; p.work_turn = undefined; p.tezgah_turn = s.turn;
    const oldRandom = Math.random; Math.random = () => .99;
    let pir;
    try { pir = g.work(s); } finally { Math.random = oldRandom; }
    assert.equal(pir.player.career_xp, 180); assert(pir.player.meslek_pirleri.includes(pr.id), pr.id + " pir kaydı"); assert.equal(g.meslekYoluKademesi(pir.player), 3);
    assert(pir.history.some((e) => e.k === "my.pir"), pr.id + " pir dönüm noktası");

    const imza = copy(pir); imza.player.prof_action_turn = undefined; imza.player.hunger = 60; imza.player.health = 50;
    if (pr.id === "marangoz") imza.player.properties = [{ type: "ev", loc: imza.player.location_name, cond: 40 }];
    const before = JSON.stringify({ money: imza.player.money, hunger: imza.player.hunger, health: imza.player.health, honor: imza.player.honor, fame: imza.player.fame, reputation: imza.player.reputation, inventory: imza.player.inventory, skill_xp: imza.player.skill_xp, properties: imza.player.properties });
    Math.random = () => 0;
    let after;
    try { after = g.professionAction(imza); } finally { Math.random = oldRandom; }
    assert(after.history.some((e) => e.k === "my.effect"), pr.id + " özgün ustalık etkisi");
    const now = JSON.stringify({ money: after.player.money, hunger: after.player.hunger, health: after.player.health, honor: after.player.honor, fame: after.player.fame, reputation: after.player.reputation, inventory: after.player.inventory, skill_xp: after.player.skill_xp, properties: after.player.properties });
    assert.notEqual(now, before, pr.id + " imza karşılığı"); cases += 5;
  }
  const eski = copy(base); eski.player.age = eski.player.base_age = 50; eski.player.profession = "demirci"; eski.player.kademe = 3; eski.player.career_xp = 240; eski.player.capstones = ["demirci"];
  const goc = g.migrate(eski); assert(goc.player.meslek_pirleri.includes("demirci"), "eski ustanın pirliği korunur"); cases++;
  console.log(`MESLEK YOLU: TEMİZ · ${cases} denetim · ${g.PROFESSIONS.length} meslek · usta/ocak/pir · özgün imza karşılıkları`);
})().catch((e) => { console.error(e); process.exitCode = 1; });
