const assert = require('node:assert/strict'), path = require('node:path'), esbuild = require('esbuild');
(async () => {
  const root = path.resolve(__dirname, '..');
  const result = await esbuild.build({ stdin: { contents: 'export * as g from "./lib/game"; export * as n from "./lib/nufus";', resolveDir: root, loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false,
    alias: { '@react-native-async-storage/async-storage': path.join(root, 'scripts/_smoke/as-stub.cjs') } });
  const box = { exports: {} }; new Function('module', 'exports', 'require', result.outputFiles[0].text)(box, box.exports, require);
  const { g, n } = box.exports;
  const s = g.newGame('Pazar', 'Kontrol', 'erkek'); s.pop = { v: 1, k: {}, n: 100 }; s.player.properties = []; s.player.location_name = 'Demirhan';
  const people = [];
  for (const [prof, age] of [['çiftçi', 35], ['fırıncı', 30], ['tüccar', 30], ['şifacı', 30], ['asker', 30], ['müzisyen', 30], ['işsiz', 25], ['çiftçi', 6], ['çiftçi', 75]]) {
    const k = n.yeniGelen(s.pop, g.worldYears(s), 'Demirhan', 'erkek', age, () => 0.3); k.prof = prof; people.push(k);
  }
  n.nufusDegisti(s.pop);
  const initial = g.cityEconomy(s, 'Demirhan'); assert.equal(initial.residents, 9); assert(initial.mouths < initial.residents); assert(initial.mouths > initial.productive);
  assert(initial.services.trade > 0 && initial.services.care > 0 && initial.services.security > 0 && initial.services.culture > 0);
  const supply = g.cityGoodSupply(s, 'Demirhan', 'bugday'), demand = g.cityGoodDemand(s, 'Demirhan', 'ekmek');
  people[0].ol = g.worldYears(s); n.nufusDegisti(s.pop);
  assert(g.cityGoodSupply(s, 'Demirhan', 'bugday') < supply); assert(g.cityGoodDemand(s, 'Demirhan', 'ekmek') < demand);
  const bread = g.cityGoodSupply(s, 'Demirhan', 'ekmek'); people[1].loc = 'Akşehir'; n.nufusDegisti(s.pop);
  assert(g.cityGoodSupply(s, 'Demirhan', 'ekmek') < bread); assert(g.cityGoodSupply(s, 'Akşehir', 'ekmek') > 0);
  const grain = g.cityGoodSupply(s, 'Demirhan', 'bugday'); people[2].prof = 'çiftçi'; n.nufusDegisti(s.pop);
  assert(g.cityGoodSupply(s, 'Demirhan', 'bugday') > grain); assert.equal(g.cityEconomy(s, 'Demirhan').services.trade, 0);
  const beforeBirth = g.cityGoodDemand(s, 'Demirhan', 'ekmek'), beforeProd = g.cityEconomy(s, 'Demirhan').productive;
  n.yeniGelen(s.pop, g.worldYears(s), 'Demirhan', 'kadın', 0, () => 0.4); n.nufusDegisti(s.pop);
  assert(g.cityGoodDemand(s, 'Demirhan', 'ekmek') > beforeBirth); assert.equal(g.cityEconomy(s, 'Demirhan').productive, beforeProd);
  const security = g.cityFx(s, 'Demirhan').sec; people[4].prof = 'işsiz'; n.nufusDegisti(s.pop); assert(g.cityFx(s, 'Demirhan').sec < security);
  const other = structuredClone(s); other.pop.k[people[6].id].loc = 'Akşehir'; n.nufusDegisti(other.pop);
  assert.notEqual(g.cityEconomy(other, 'Demirhan').residents, g.cityEconomy(s, 'Demirhan').residents, 'aynı tohum/yılda kayıtlar arası önbellek sızıntısı');
  const mouths = g.cityGoodDemand(s, 'Demirhan', 'ekmek'); people[6].ol = g.worldYears(s); n.nufusDegisti(s.pop);
  assert(g.cityGoodDemand(s, 'Demirhan', 'ekmek') < mouths, 'işsiz kişi tüketici sayılmadı');
  console.log('NPC EKONOMİSİ: doğum/ölüm/göç/meslek, yaşlı/çocuk/işsiz tüketimi, hizmetler ve kayıt önbelleği temiz.');
})().catch(e => { console.error(e); process.exitCode = 1; });
