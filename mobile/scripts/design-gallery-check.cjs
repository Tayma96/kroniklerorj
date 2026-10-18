// İsteğe bağlı tarayıcı kontrolü. Gerçek Android/MP/animasyon testi değildir.
const fs = require('fs'), path = require('path'), os = require('os');
const deps = process.env.KRONIKLER_PREVIEW_DEPS || path.join(os.tmpdir(), 'kronikler-webview');
const { chromium } = (() => { try { return require(path.join(deps, 'node_modules/playwright')); } catch { return require('playwright'); } })();
const root = path.resolve(__dirname, '../app'), routes = [];
function collect(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) collect(file);
    else if (file.endsWith('.tsx') && item.name !== '_layout.tsx') {
      let route = '/' + path.relative(root, file).replaceAll('\\', '/').replace(/\.tsx$/, '').replace(/\/index$/, '');
      routes.push(route === '/index' ? '/' : route);
    }
  }
}
collect(root);
const width = Number(process.env.WIDTH || 390), out = process.argv[2] || path.join(deps, 'gallery-' + width);
const filter = process.env.ROUTES?.split(',');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ viewport: { width, height: 844 } }), page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const results = filter && fs.existsSync(path.join(out, 'checks.json')) ? JSON.parse(fs.readFileSync(path.join(out, 'checks.json'), 'utf8')) : [];
    for (const route of routes) {
      if (filter && !filter.includes(route)) continue;
      const errors = [], onError = error => errors.push(error.message);
      page.on('pageerror', onError);
      await page.goto((process.env.KRONIKLER_PREVIEW_URL || 'http://127.0.0.1:8765') + '/?screen=' + encodeURIComponent(route));
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(120);
      const metrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        text: document.body.innerText.slice(0, 130),
        targets: [...document.querySelectorAll('[role=button]')].filter(el => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0 && (r.width < 43 || r.height < 43);
        }).length,
      }));
      const file = (route.replace(/^\//, '').replaceAll('/', '-').replaceAll('[', '').replaceAll(']', '') || 'acilis') + '.png';
      await page.screenshot({ path: path.join(out, file) });
      const result = { route, errors, ...metrics, file }, existing = results.findIndex(x => x.route === route);
      if (existing >= 0) results[existing] = result; else results.push(result);
      console.log(JSON.stringify({ route, errors, overflow: metrics.overflow, smallTargets: metrics.targets }));
      page.off('pageerror', onError);
    }
    fs.writeFileSync(path.join(out, 'checks.json'), JSON.stringify(results, null, 2) + '\n');
    if (results.some(r => r.errors.length || r.overflow || r.targets || !r.text)) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
