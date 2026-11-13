// Foto tiap grafik/peta (.gbr tanpa tabel) di laporan.html untuk versi Word: gbr/gbr-NN.png (NN = urutan .gbr).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const DI = path.dirname(fileURLToPath(import.meta.url));
const { luncur } = await import(pathToFileURL(path.resolve(DI, '../generator/pw.mjs')).href);
const keluar = path.join(DI, 'gbr');
fs.mkdirSync(keluar, { recursive: true });
const b = await luncur();
const p = await b.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 3 });
await p.goto(pathToFileURL(path.join(DI, 'laporan.html')).href, { waitUntil: 'load' });
await p.emulateMedia({ media: 'print' });
const el = await p.$$('.gbr');
let n = 0;
for (let i = 0; i < el.length; i++) {
  if (await el[i].$('table')) continue;
  await el[i].screenshot({ path: path.join(keluar, `gbr-${String(i).padStart(2, '0')}.png`) });
  n++;
}
await b.close();
console.log('gambar', n, 'dari', el.length);
