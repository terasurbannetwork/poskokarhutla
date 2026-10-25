// HTML lokal -> PDF A4 lewat Chromium headless (pola data/laporan-bnpb/harian-2026-10-23/peta.mjs).
// Pakai: node pdf.mjs masuk.html [keluar.pdf]. Margin dari @page di HTML (tema.json).
import path from 'node:path';
import { chromium } from '/Users/alfatehanseptianta/Developer/worth-it/node_modules/playwright/index.mjs';
const masuk = path.resolve(process.argv[2]), keluar = path.resolve(process.argv[3] || masuk.replace(/\.html$/, '.pdf'));
const b = await chromium.launch({executablePath: '/Users/alfatehanseptianta/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
const pg = await b.newPage();
await pg.goto('file://' + masuk, {waitUntil: 'load'});
await pg.evaluate(() => document.fonts.ready);
const roboto = await pg.evaluate(() => [...document.fonts].filter(f => f.family.replace(/"/g, '') === 'Roboto' && f.status === 'loaded').length);
if (roboto < 2) { console.error('Roboto tidak termuat:', roboto); process.exit(1); }
await pg.pdf({path: keluar, format: 'A4', preferCSSPageSize: true, printBackground: true});
await b.close();
console.log(keluar);
