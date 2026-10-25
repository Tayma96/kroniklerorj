const assert = require("node:assert/strict");

const g = require(process.env.SMOKE_BUNDLE);
const originalRandom = Math.random;
Math.random = () => 0.314159;

function familyState(seed, age, milestone = 4) {
  const s = g.newGame("Deniz", "Yalçın", "kadın");
  s.turn = 11;
  s.seed = seed;
  s.player.base_age = 35;
  s.player.age = 35;
  s.player.money = 1000;
  const id = Object.keys(s.pop.k)[0];
  const child = s.pop.k[id];
  const name = "Aybike";
  child.ad = name;
  child.ol = undefined;
  child.loc = s.player.location_name;
  child.prof = "tüccar";
  child.dy = g.worldYears(s) - age;
  s.player.children = [name];
  s.player.child_ids = { [name]: id };
  s.player.child_meta = [{ n: name, born: s.turn - age * 12, ms: milestone }];
  s.player.child_edu = undefined;
  s.relationships = { ...(s.relationships || {}), [id]: 0 };
  return { s, name, child };
}

function advancePair(state) {
  const control = structuredClone(state);
  control.player.child_edu = undefined;
  return [g.advance(state), g.advance(control)];
}

try {
  let { s, name } = familyState(17, 6);
  assert.equal(g.evlatYasi(s, name), 6);
  assert.equal(g.setChildEducation(s, name, "zanaat").player.child_edu, undefined, "Eğitim okul yaşından önce başlamaz");
  ({ s, name } = familyState(17, 7));
  const started = g.setChildEducation(s, name, "zanaat");
  assert.equal(started.player.child_edu[name].weeks, 0);
  const [trained, control] = advancePair(started);
  assert.equal(trained.player.child_edu[name].weeks, 1, "İlerleme ayda bir artar");
  assert.equal(control.player.child_edu, undefined);
  assert.equal(control.player.money - trained.player.money, 2, "Zanaat eğitimi ayda iki akçe tutar");

  const capped = familyState(19, 12).s;
  const cappedName = capped.player.children[0];
  capped.player.child_edu = { [cappedName]: { track: "zanaat", weeks: 78 } };
  const [maxed, maxControl] = advancePair(capped);
  assert.equal(maxed.player.child_edu[cappedName].weeks, 78, "Üçüncü kademede ilerleme ve ücret durur");
  assert.equal(maxControl.player.money - maxed.player.money, 0);

  const grown = familyState(23, 17).s;
  const grownName = grown.player.children[0];
  grown.player.child_edu = { [grownName]: { track: "ilim", weeks: 26 } };
  const [adult, adultControl] = advancePair(grown);
  assert.equal(adult.player.child_edu[grownName].weeks, 26, "18 yaşında eğitim masrafı durur");
  assert.equal(adultControl.player.money - adult.player.money, 0);
  assert.equal(g.setChildEducation(adult, grownName, "ilim").player.child_edu[grownName].weeks, 26);

  const chanceState = familyState(29, 12).s;
  const chanceName = chanceState.player.children[0];
  chanceState.player.child_edu = { [chanceName]: { track: "zanaat", weeks: 10 } };
  assert(Math.abs(g.childCareerChance(chanceState, chanceName) - 0.3) < 1e-9);
  chanceState.player.child_edu[chanceName].weeks = 52;
  assert(Math.abs(g.childCareerChance(chanceState, chanceName) - 0.5) < 1e-9);
  chanceState.player.child_edu[chanceName].weeks = 78;
  assert(Math.abs(g.childCareerChance(chanceState, chanceName) - 0.7) < 1e-9);

  let careerResult;
  for (let seed = 1; seed <= 40; seed++) {
    const career = familyState(seed, 12, 2);
    career.s.player.child_edu = { [career.name]: { track: "zanaat", weeks: 52 } };
    let next = career.s;
    for (let month = 0; month < 12; month++) next = g.advance(next);
    const person = next.pop.k[career.child.id];
    if (person.prof !== "tüccar") { careerResult = next; break; }
  }
  assert(careerResult, "Eğitim yolu 13 yaşındaki çıraklık mesleğine yön verebilmeli");
  assert(careerResult.history.some((e) => e.k === "evj.kidApprenticeCareer"), "Meslek sonucu kronikte açıklanmalı");

  const market = g.newGame("Deniz", "Yalçın", "erkek");
  const city = market.player.location_name;
  market.player.governorships = [city];
  market.player.govHappy = { [city]: 60 };
  market.player.govTax = { [city]: 5 };
  const low = g.cityGoodDemand(market, city, "un");
  market.player.govTax[city] = 15;
  const middle = g.cityGoodDemand(market, city, "un");
  market.player.govTax[city] = 30;
  const high = g.cityGoodDemand(market, city, "un");
  assert(low > middle && middle > high, "Yüksek vergi yerel pazar talebini düşürmeli");
  market.player.governorships = [];
  const ungoverned = g.cityGoodDemand(market, city, "un");
  assert(Math.abs(ungoverned - high / Math.max(0.91, Math.min(1.06, 1 - (30 - 15) * 0.006))) < 1e-9, "Vergi etkisi yalnız yönettiğin şehirde işler");
  console.log("Aile eğitimi ve vergi-talep bağlantısı: 18 kontrol temiz");
} finally {
  Math.random = originalRandom;
}
