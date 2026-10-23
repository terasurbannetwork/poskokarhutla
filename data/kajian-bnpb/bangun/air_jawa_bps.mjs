// Tarik tabel BPS (situs Next.js, dirender di peramban) untuk paket `air-jawa`. Dipanggil oleh `air-jawa.py tarik`.
// node data/kajian-bnpb/bangun/air_jawa_bps.mjs <keluaran_dir> <nama>=<url> ...
// Playwright diimpor dari path absolut (tidak ada di package.json repo ini), pola sama dengan data/laporan-bnpb/*/peta.mjs.
import { chromium } from '/Users/alfatehanseptianta/Developer/worth-it/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
const [out, ...pasangan] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/Users/alfatehanseptianta/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell' });
const p = await b.newPage({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' });
for (const s of pasangan) {
  const i = s.indexOf('=');
  const [nama, url] = [s.slice(0, i), s.slice(i + 1)];
  await p.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  await p.waitForTimeout(4000);
  const teks = await p.evaluate(() => document.body.innerText);
  if (!/Keterangan Data|Sumber/.test(teks)) throw new Error(`${nama}: tabel tidak termuat`);
  fs.writeFileSync(path.join(out, `${nama}.txt`), `#url ${url}\n#ditarik ${new Date().toISOString()}\n` + teks);
  console.log(nama, teks.length);
}
await b.close();
