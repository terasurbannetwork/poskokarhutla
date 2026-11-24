// Render setiap .fig[id] di gambar.html menjadi gbr/<id>.png (lebar 1000 px, skala 2,5).
// node data/kajian-bnpb/penentuan-kejadian/gambar/gambar.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const DI = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(DI, '../../../../..');
const GEN = path.join(REPO, 'data/laporan-bnpb/generator') + '/';
const { luncur } = await import(pathToFileURL(GEN + 'pw.mjs').href);
const SK = process.env.USERPROFILE.replace(/\\/g, '/') + '/.claude/skills/ppt-konsultan/bnpb/assets/';
const uri = p => 'data:font/ttf;base64,' + fs.readFileSync(p).toString('base64');
let html = fs.readFileSync(path.join(DI, 'gambar.html'), 'utf8')
  .split('{FR}').join(uri(SK + 'fonts/Roboto-Regular.ttf'))
  .split('{FM}').join(uri(SK + 'fonts/Roboto-Medium.ttf'))
  .split('{FB}').join(uri(SK + 'fonts/Roboto-Bold.ttf'));
const kerja = path.join(DI, '_siap.html');
fs.writeFileSync(kerja, html);
const GBR = path.resolve(DI, '../gbr');
fs.mkdirSync(GBR, { recursive: true });
const b = await luncur();
const p = await b.newPage({ viewport: { width: 1060, height: 1200 }, deviceScaleFactor: 2.5 });
await p.goto(pathToFileURL(kerja).href, { waitUntil: 'load' });
await p.evaluate(() => document.fonts.ready);
const figs = await p.$$('.fig[id]');
for (const f of figs) {
  const id = await f.getAttribute('id');
  await f.screenshot({ path: path.join(GBR, id + '.png') });
}
await b.close();
fs.unlinkSync(kerja);
console.log('gambar', figs.length);
