// Peta peringatan dini BMKG untuk slide Prediksi Bencana laporan harian (pemilik 10 Nov 2026). Proyeksi dan ukuran sama dengan harian_peta.mjs.
// Masukan <folder>/prediksi.json = {kode provinsi: 'awas'|'siaga'|'sedang'}; keluaran <folder>/peta_prediksi.png.
import fs from 'node:fs';
import { luncur } from './pw.mjs';
const g = JSON.parse(fs.readFileSync(new URL('../../../public/geo/provinsi.json', import.meta.url)));
const KE = process.argv[2] || '.';
const L = JSON.parse(fs.readFileSync(KE + '/prediksi.json'));
const WARNA = {awas: '#C8102E', siaga: '#D9600B', sedang: '#DCE7F5'};
const B = [95.0, -11.0, 140.9, 6.2], PW = 1848, PH = 693, sx = PW / (B[2] - B[0]), sy = PH / (B[3] - B[1]);
const pj = ([x, y]) => [(x - B[0]) * sx, (B[3] - y) * sy];
let s = '';
for (const f of g.features) {
  const k = String(f.properties.kode || f.properties.id), polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates; let d = '';
  for (const p of polys) d += 'M' + p[0].map(pj).map(([x, y]) => x.toFixed(1) + ' ' + y.toFixed(1)).join('L') + 'Z';
  s += `<path d="${d}" fill="${WARNA[L[k]] || '#F1F2F4'}" stroke="#fff" stroke-width="1"/>`;
}
const b = await luncur();
const pg = await b.newPage({viewport: {width: PW, height: PH}, deviceScaleFactor: 1.5});
await pg.setContent(`<html><body style="margin:0;background:transparent"><svg xmlns="http://www.w3.org/2000/svg" width="${PW}" height="${PH}" viewBox="0 0 ${PW} ${PH}">${s}</svg></body></html>`);
await (await pg.$('svg')).screenshot({path: KE + '/peta_prediksi.png', omitBackground: true}); await b.close();
console.log('peta prediksi', Object.keys(L).length, 'provinsi');
