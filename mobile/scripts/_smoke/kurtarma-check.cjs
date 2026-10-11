// Kurtarılan varlıkların kimlik, kaynak ve mevcut çağrı uyumluluğu.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '../..');

(async () => {
  const result = await esbuild.build({
    entryPoints: [path.join(root, 'lib/npc-portre.ts')], bundle: true,
    format: 'cjs', platform: 'node', write: false,
    plugins: [{ name: 'yerel-gorseller', setup(build) {
      build.onLoad({ filter: /\.jpg$/ }, args => {
        assert(fs.existsSync(args.path), args.path);
        const bytes = fs.readFileSync(args.path);
        assert.equal(bytes.readUInt16BE(0), 0xffd8);
        return { contents: `module.exports = ${JSON.stringify(path.basename(args.path))}`, loader: 'js' };
      });
    } }],
  });
  const box = { module: { exports: {} } };
  vm.runInNewContext(result.outputFiles[0].text, box);
  const { npcKimlik, npcEvre, npcPortreImage, NPC_PORTRELER } = box.module.exports;
  assert.equal(Object.keys(NPC_PORTRELER).length, 16);
  for (const gender of ['erkek', 'kadın']) {
    const identities = new Set();
    for (let i = 0; i < 2000; i++) {
      const seed = `kisi_${i}`;
      const identity = npcKimlik(seed, gender);
      identities.add(identity);
      assert(identity.startsWith(gender === 'erkek' ? 'e' : 'k'));
      assert.notEqual(identity, 'e05');
      assert.equal(npcKimlik(seed, gender), identity);
      for (const age of [16, 22, 34, 35, 47, 59, 60, 71, 95]) {
        assert.equal(npcPortreImage(age, gender, seed), `${identity}_${npcEvre(age)}.jpg`);
      }
    }
    assert.equal(identities.size, gender === 'erkek' ? 7 : 8);
    for (const age of [7, 15, 16, 35, 60]) assert.equal(npcPortreImage(age, gender), null);
    for (const age of [7, 15, NaN, Infinity]) assert.equal(npcPortreImage(age, gender, 'kisi'), null);
  }
  const sources = JSON.parse(fs.readFileSync(path.join(root, 'assets/ses/kaynak.json'), 'utf8'));
  assert.equal(sources.length, 63);
  for (const source of sources) {
    const file = path.resolve(root, source.dosya);
    assert(file.startsWith(path.join(root, 'assets/ses') + path.sep));
    assert.equal(fs.statSync(file).size, source.bayt, source.dosya);
    assert(source.url && source.yazar && source.lisans, source.dosya);
    assert(source.lisans_url || source.lisans === 'Kamu malı (PD)', source.dosya);
  }
  const sound = fs.readFileSync(path.join(root, 'lib/sound.ts'), 'utf8');
  const calls = [...sound.matchAll(/require\("(\.\.\/assets\/ses\/[^\"]+)"\)/g)];
  assert.equal(calls.length, 18);
  for (const call of calls) assert(fs.existsSync(path.resolve(root, 'lib', call[1])));
  assert(!sound.includes('assets/sfx/'));
  const ui = fs.readFileSync(path.join(root, 'lib/ui.tsx'), 'utf8');
  assert(ui.includes('npcImage ?? portreImage(age, gender)'));
  assert(ui.includes('npcImage == null && !breathe'));
  const tags = fs.readFileSync(path.join(root, 'assets/arka/TAGS.txt'), 'utf8').trim().split('\n');
  assert.equal(tags.length, 15);
  for (const line of tags) assert(fs.existsSync(path.join(root, 'assets/arka', line.split(':')[0] + '.jpg')));
  console.log('KURTARMA: TEMİZ — 48 NPC, 63 ses, 15 arka plan; oyuncu portreleri ayrı.');
})().catch(error => { console.error(error); process.exitCode = 1; });
