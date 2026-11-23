// Cetak infografis.html (A4 tegak, tiap .hal satu halaman) ke PDF dan PNG per halaman.
// node data/kajian-bnpb/penentuan-kejadian/infografis/cetak.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const DI = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(DI, '../../../../..');
const GEN = path.join(REPO, 'data/laporan-bnpb/generator') + '/';
const { luncur } = await import(pathToFileURL(GEN + 'pw.mjs').href);
const HOME = process.env.USERPROFILE.replace(/\\/g, '/');
const SK = HOME + '/.claude/skills/ppt-konsultan/bnpb/assets/';
const uri = (p, t) => `data:${t};base64,` + fs.readFileSync(p).toString('base64');

const ganti = {
  '{BNPB}': uri(SK + 'proyek-bnpb/logo/sumber-bnpb.png', 'image/png'),
  '{KRIS}': uri(GEN + 'sampul/media/kris-logo.png', 'image/png'),
  '{FR}': uri(SK + 'fonts/Roboto-Regular.ttf', 'font/ttf'),
  '{FM}': uri(SK + 'fonts/Roboto-Medium.ttf', 'font/ttf'),
  '{FB}': uri(SK + 'fonts/Roboto-Bold.ttf', 'font/ttf'),
};
let html = fs.readFileSync(path.join(DI, 'infografis.html'), 'utf8');
for (const [k, v] of Object.entries(ganti)) html = html.split(k).join(v);
const KERJA = path.join(DI, '_kerja');
fs.mkdirSync(KERJA, { recursive: true });
fs.writeFileSync(path.join(KERJA, 'siap.html'), html);

const KELUAR = path.resolve(DI, '../../keluaran/01 Kajian Penentuan Kejadian Bencana/Revisi 2');
fs.mkdirSync(KELUAR, { recursive: true });
const nama = 'Infografis Kajian Penentuan Kejadian Bencana ' + process.argv[2];
const b = await luncur();
const p = await b.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2.5 });
await p.goto(pathToFileURL(path.join(KERJA, 'siap.html')).href, { waitUntil: 'load' });
await p.evaluate(() => document.fonts.ready);
const luap = await p.evaluate(() => [...document.querySelectorAll('.hal')].map((h, i) => {
  const r = h.getBoundingClientRect();
  const bawah = Math.max(...[...h.querySelectorAll('*')].map(e => e.getBoundingClientRect().bottom));
  return bawah > r.bottom + 0.5 ? `halaman ${i + 1} meluap ${Math.round(bawah - r.bottom)} px` : null;
}).filter(Boolean));
if (luap.length) console.log('PERINGATAN', luap.join('; '));
await p.pdf({ path: path.join(KELUAR, nama + '.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
const hal = await p.$$('.hal');
for (let i = 0; i < hal.length; i++) await hal[i].screenshot({ path: path.join(KELUAR, `${nama} hal ${String(i + 1).padStart(2, '0')}.png`) });
await b.close();
console.log('ok', hal.length, 'halaman');
