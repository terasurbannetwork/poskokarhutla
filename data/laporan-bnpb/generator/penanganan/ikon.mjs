// Ikon garis (gaya Lucide) deck Penanganan yang tidak ada di templat: PNG transparan 256 px, warna sesuai tempatnya.
// pemda = pil PEMILIK armada (navy, sama dengan ikon TNI/Kemenhut/PT Sinarmas templat). ikon/firespot.png disalin dari deck 25 Okt
// (../../satelit-2026-10-25/ikon-firespot.png, dibuat ikon.mjs di sana), tidak dibuat ulang di sini.
// Pakai: PLAYWRIGHT_MJS=<playwright>/index.mjs node ikon.mjs   -> ikon/pemda.png
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { luncur } from '../pw.mjs';
const KE = fileURLToPath(new URL('ikon/', import.meta.url)); fs.mkdirSync(KE, {recursive: true});
const IKON = {
  pemda: ['#051C2C', '<path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M12 2l8 5H4z"/>'],
  // kepala kolom deck banjir (penanganan_banjir.py), putih di atas kotak warna: air, longsor, rob, jiwa terpapar
  'banjir-air': ['#FFFFFF', '<path d="M2 7c.6.5 1.2 1 2.5 1C7 8 7 6 9.5 6c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 13c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 19c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>'],
  'banjir-longsor': ['#FFFFFF', '<path d="M2 20h20"/><path d="M3 20 10 5l4 7"/><path d="M15 14l2 2"/><circle cx="18" cy="11" r="1.5"/><circle cx="20" cy="17" r="1"/>'],
  'banjir-rob': ['#FFFFFF', '<path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M12 13V3"/><path d="m8 7 4-4 4 4"/>'],
  'banjir-jiwa': ['#FFFFFF', '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'],
};
const b = await luncur();
const pg = await b.newPage({viewport: {width: 256, height: 256}});
for (const [n, [c, d]] of Object.entries(IKON)) {
  await pg.setContent(`<html><body style="margin:0;background:transparent"><svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg></body></html>`);
  await (await pg.$('svg')).screenshot({path: KE + n + '.png', omitBackground: true});
}
await b.close(); console.log('ikon', Object.keys(IKON).join(', '));
