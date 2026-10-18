// Yeni bir sayfa eklenince tasarım envanterinin geride kalmasını önler.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..'), routes = [];
function collect(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) collect(file);
    else if (item.name.endsWith('.tsx') && item.name !== '_layout.tsx') {
      const route = '/' + path.relative(path.join(root, 'app'), file).replaceAll('\\', '/').replace(/\.tsx$/, '').replace(/\/index$/, '');
      routes.push(route === '/index' ? '/' : route);
    }
  }
}
collect(path.join(root, 'app'));
const source = fs.readFileSync(path.join(root, 'lib/screen-design.ts'), 'utf8');
const designs = [...source.matchAll(/page\("([^"]+)", "([^"]+)", "([^"]+)", "([^"]+)", "([^"]+)"\)/g)];
assert.equal(new Set(designs.map(x => x[1])).size, designs.length, 'Tekrarlı tasarım rotası');
assert.deepEqual(designs.map(x => x[1]).sort(), routes.sort(), 'Tasarımsız sayfa veya artık var olmayan rota');
for (const row of designs) assert(fs.existsSync(path.join(root, 'assets/arka', row[4] + '.jpg')), row[1] + ' sahnesi eksik');
console.log(`SAYFA TASARIMI: ${routes.length}/${routes.length} rota, sahneler ve tekrar denetimi temiz.`);
