import { chromium } from '/Users/alfatehanseptianta/Developer/worth-it/node_modules/playwright/index.mjs';
const b = await chromium.launch({executablePath: '/Users/alfatehanseptianta/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
const pg = await b.newPage({viewport: {width: 1440, height: 900}});
const req = [];
pg.on('response', r => { const u = r.url(); if (/kluster|kompleks|status|titik|api\//.test(u)) req.push(r.status() + ' ' + u); });
await pg.goto('https://centurisk97.id/', {waitUntil: 'networkidle', timeout: 90000});
await pg.waitForTimeout(4000);
const r = await pg.evaluate(() => {
  if (typeof S === "undefined" || !S.kluster) return {err: "no S"};
  const f = S.kluster.features.filter(f => f.properties.prov === '18');
  const lv = {}; f.forEach(x => lv[x.properties.level] = (lv[x.properties.level] || 0) + 1);
  return {n: f.length, lv, awal: !!S.kluster.awal, meta: S.meta && S.meta.dibuat, p3: f.filter(x => x.properties.level === 3).map(x => x.properties)};
});
console.log(JSON.stringify(r).slice(0, 3000));
console.log(req.join('\n'));
await pg.screenshot({path: 'app.png'});
await b.close();
