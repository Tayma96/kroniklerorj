// Kurtarılan varlıkların kimlik, kaynak ve mevcut çağrı uyumluluğu.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '../..');

(async () => {
  const result = await esbuild.build({
    entryPoints: [path.join(root, 'lib/npc-portre.ts')], bundle: true,
    format: 'cjs', platform: 'node', write: false,
    plugins: [{ name: 'yerel-gorseller', setup(build) {
      build.onLoad({ filter: /\.(jpg|png)$/ }, args => {
        assert(fs.existsSync(args.path), args.path);
        const bytes = fs.readFileSync(args.path);
        if (args.path.endsWith('.jpg')) assert.equal(bytes.readUInt16BE(0), 0xffd8);
        else assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
        return { contents: `module.exports = ${JSON.stringify(path.basename(args.path))}`, loader: 'js' };
      });
    } }],
  });
  const box = { module: { exports: {} } };
  vm.runInNewContext(result.outputFiles[0].text, box);
  const { npcKimlik, npcEvre, npcPortreImage, npcPortreFrame, NPC_PORTRELER } = box.module.exports;
  assert.equal(Object.keys(NPC_PORTRELER).length, 16);
  // Önceki sürümün kayıtlı kişi → yüz eşlemesi. Yaş eklemek bu kimlikleri kaydıramaz.
  for (const [seed, male, female] of [
    ['kisi_0', 'e07', 'k03'], ['kisi_17', 'e04', 'k07'], ['kisi_1999', 'e08', 'k03'],
    ['anne', 'e06', 'k08'], ['baba', 'e04', 'k02'], [1001, 'e02', 'k08'], ['Türkmen-İlbilge', 'e01', 'k05'],
  ]) {
    assert.equal(npcKimlik(seed, 'erkek'), male);
    assert.equal(npcKimlik(seed, 'kadın'), female);
  }
  const provenance = JSON.parse(fs.readFileSync(path.join(root, 'assets/npc/YAS_KAYNAK.json'), 'utf8'));
  assert.equal(provenance.atlaslar.length, 4);
  const frames = new Map();
  for (const atlas of provenance.atlaslar) {
    const bytes = fs.readFileSync(path.join(root, 'assets/npc', atlas.dosya));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), atlas.sha256);
    assert.equal(bytes.readUInt32BE(16), atlas.genislik);
    assert.equal(bytes.readUInt32BE(20), atlas.yukseklik);
    assert.equal(atlas.genislik / atlas.sutun, atlas.yukseklik / atlas.satir);
    for (let row = 0; row < atlas.satir; row++) for (let column = 0; column < atlas.sutun; column++) {
      const key = atlas.yerlesim[row][column];
      assert(!frames.has(key), `Çiftlenmiş kimlik/yaş: ${key}`);
      frames.set(key, { source: atlas.dosya, columns: atlas.sutun, rows: atlas.satir, column, row });
    }
  }
  assert.equal(frames.size, 32);
  for (const [age, phase] of [[0, 'cocuk'], [12.99, 'cocuk'], [13, 'ergen'], [17.99, 'ergen'], [18, 'genc'], [34.99, 'genc'], [35, 'olgun'], [59.99, 'olgun'], [60, 'yasli'], [100, 'yasli']]) {
    assert.equal(npcEvre(age), phase);
  }
  for (const gender of ['erkek', 'kadın']) {
    const identities = new Set();
    for (let i = 0; i < 2000; i++) {
      const seed = `kisi_${i}`;
      const identity = npcKimlik(seed, gender);
      identities.add(identity);
      assert(identity.startsWith(gender === 'erkek' ? 'e' : 'k'));
      assert.notEqual(identity, 'e05');
      assert.equal(npcKimlik(seed, gender), identity);
      for (const age of [18, 22, 34, 35, 47, 59, 60, 71, 95]) {
        assert.equal(npcPortreImage(age, gender, seed), `${identity}_${npcEvre(age)}.jpg`);
        assert.equal(npcPortreFrame(age, gender, seed).columns, 1);
      }
      for (const age of [0, 7, 12, 13, 16, 17]) {
        const frame = npcPortreFrame(age, gender, seed);
        assert.deepEqual({ ...frame }, frames.get(`${identity}_${npcEvre(age)}`));
        assert.equal(npcPortreImage(age, gender, seed), frame.source);
      }
    }
    assert.equal(identities.size, gender === 'erkek' ? 7 : 8);
    for (const age of [7, 15, 16, 35, 60]) assert.equal(npcPortreImage(age, gender), null);
    for (const age of [-1, NaN, Infinity]) assert.equal(npcPortreFrame(age, gender, 'kisi'), null);
    assert(npcPortreFrame(7, gender, 0));
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
  const catalog = fs.readFileSync(path.join(root, 'lib/ses-katalog.ts'), 'utf8');
  const calls = [...catalog.matchAll(/require\(['"](\.\.\/assets\/ses\/[^'"]+)['"]\)/g)];
  assert.equal(calls.length, 63);
  for (const call of calls) assert(fs.existsSync(path.resolve(root, 'lib', call[1])));
  assert(!sound.includes('assets/sfx/'));
  // Her yaş sınırında doğru cinsiyetin aynı portre serisi seçilir.
  const playerBundle = await esbuild.build({
    entryPoints: [path.join(root, 'lib/assets.ts')], bundle: true,
    format: 'cjs', platform: 'node', write: false,
    plugins: [{ name: 'portre-dosyalari', setup(build) {
      build.onLoad({ filter: /\.(jpg|png)$/ }, args => {
        assert(fs.existsSync(args.path), args.path);
        if (args.path.includes(path.sep + 'portre' + path.sep)) {
          const bytes = fs.readFileSync(args.path);
          assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
          assert.equal(bytes.readUInt32BE(16), 200);
          assert.equal(bytes.readUInt32BE(20), 200);
        }
        return { contents: `module.exports = ${JSON.stringify(path.basename(args.path))}`, loader: 'js' };
      });
    } }],
  });
  const playerBox = { module: { exports: {} } };
  vm.runInNewContext(playerBundle.outputFiles[0].text, playerBox);
  const cases = [[0, 'cocuk'], [12, 'cocuk'], [13, 'ergen'], [17, 'ergen'],
    [18, 'genc'], [24, 'genc'], [25, 'yetiskin'], [32, 'yetiskin'],
    [33, 'olgun'], [45, 'olgun'], [46, 'yasli'], [59, 'yasli'], [60, 'ihtiyar'], [100, 'ihtiyar']];
  for (const [gender, prefix] of [['erkek', 'e'], ['kadın', 'k']]) {
    for (const [age, stage] of cases) {
      assert.equal(playerBox.module.exports.portreImage(age, gender), `${prefix}_${stage}.png`);
    }
  }
  const tags = fs.readFileSync(path.join(root, 'assets/arka/TAGS.txt'), 'utf8').trim().split('\n');
  assert.equal(tags.length, 15);
  for (const line of tags) assert(fs.existsSync(path.join(root, 'assets/arka', line.split(':')[0] + '.jpg')));
  console.log('KURTARMA: TEMİZ — 14 oyuncu, 48 yetişkin NPC + 32 çocuk/ergen karesi, 63 ses, 15 arka plan; kayıtlı yüz kimlikleri aynı.');
})().catch(error => { console.error(error); process.exitCode = 1; });
