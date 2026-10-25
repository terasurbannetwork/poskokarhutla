// Ikon putih "firespot" (titik api terkelompok dalam lingkaran bidik) untuk kartu dan kepala kolom slide peta.
import fs from 'node:fs';
import { chromium } from '/Users/hhizari/.npm/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="256" height="256" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"/><circle cx="10" cy="10.5" r="1.6" fill="#fff" stroke="none"/><circle cx="14.2" cy="11" r="1.6" fill="#fff" stroke="none"/><circle cx="11.8" cy="14.4" r="1.6" fill="#fff" stroke="none"/></svg>';
const b = await chromium.launch({executablePath: '/Users/hhizari/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell'}); const pg = await b.newPage({viewport: {width: 256, height: 256}});
await pg.setContent('<html><body style="margin:0;background:transparent">' + svg + '</body></html>');
await (await pg.$('svg')).screenshot({path: 'ikon-firespot.png', omitBackground: true}); await b.close();
