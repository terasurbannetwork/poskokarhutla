// Ikon garis (gaya Lucide) deck Penanganan yang tidak ada di templat: PNG transparan 256 px, warna sesuai tempatnya.
// pemda = pil PEMILIK armada (navy, sama dengan ikon TNI/Kemenhut/PT Sinarmas templat). ikon/firespot.png disalin dari deck 25 Okt
// (../../satelit-2026-10-25/ikon-firespot.png, dibuat ikon.mjs di sana), tidak dibuat ulang di sini.
// Pakai: PLAYWRIGHT_MJS=<playwright>/index.mjs node ikon.mjs   -> ikon/pemda.png
import fs from 'node:fs';
import os from 'node:os';
const { chromium } = await import(process.env.PLAYWRIGHT_MJS || '/Users/priyankaalfatehan28/Developer/worth-it/node_modules/playwright/index.mjs');
const KE = new URL('ikon/', import.meta.url).pathname; fs.mkdirSync(KE, {recursive: true});
const IKON = {
  pemda: ['#051C2C', '<path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M12 2l8 5H4z"/>'],
};
const b = await chromium.launch({executablePath: process.env.CHROMIUM_SHELL || os.homedir() + '/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
const pg = await b.newPage({viewport: {width: 256, height: 256}});
for (const [n, [c, d]] of Object.entries(IKON)) {
  await pg.setContent(`<html><body style="margin:0;background:transparent"><svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg></body></html>`);
  await (await pg.$('svg')).screenshot({path: KE + n + '.png', omitBackground: true});
}
await b.close(); console.log('ikon', Object.keys(IKON).join(', '));
