// SVG -> PNG transparan: node render.mjs a.svg a.png [b.svg b.png ...]
// Playwright dari env PLAYWRIGHT_MJS (atau paket 'playwright'), Chromium dari CHROMIUM_SHELL atau cache playwright di home.
import fs from 'node:fs';
import os from 'node:os';
const { chromium } = await import(process.env.PLAYWRIGHT_MJS || 'playwright');
const b = await chromium.launch({executablePath: process.env.CHROMIUM_SHELL || os.homedir() + '/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
const a = process.argv.slice(2);
for (let i = 0; i < a.length; i += 2) {
  const svg = fs.readFileSync(a[i], 'utf8'); const [, w, h] = svg.match(/width="(\d+)" height="(\d+)"/);
  const pg = await b.newPage({viewport: {width: +w, height: +h}});
  await pg.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=block" rel="stylesheet"></head><body style="margin:0;background:transparent">${svg}</body></html>`);
  await pg.evaluate(() => document.fonts.ready);
  await (await pg.$('svg')).screenshot({path: a[i + 1], omitBackground: true}); await pg.close();
}
await b.close();
