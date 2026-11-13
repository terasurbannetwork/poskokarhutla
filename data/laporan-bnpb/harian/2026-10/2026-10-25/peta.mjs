// Peta Indonesia gaya 221026: provinsi berkejadian jingga muda, provinsi perlu perhatian bergaris merah, sisanya abu. Ekuirektangular,
// 1848x693 px = 95,0-140,9 BT x 6,2 LU-11,0 LS (rasio sama dengan peta deck 221026). Keluaran peta.png + titik.json (pusat poligon terbesar, px).
import fs from 'node:fs';
import os from 'node:os';
const { chromium } = await import(process.env.PLAYWRIGHT_MJS || 'playwright');
const g = JSON.parse(fs.readFileSync('../../../public/geo/provinsi.json'));
const D = JSON.parse(fs.readFileSync('data.json')), ada = new Set(D.kejadian.map(x => x.prov)), awas = new Set(D.kejadian.filter(x => x.perhatian).map(x => x.prov));
const B = [95.0, -11.0, 140.9, 6.2], PW = 1848, PH = 693, sx = PW / (B[2] - B[0]), sy = PH / (B[3] - B[1]);
const pj = ([x, y]) => [(x - B[0]) * sx, (B[3] - y) * sy];
let s = '', s2 = ''; const pusat = {};
for (const f of g.features) {
  const k = String(f.properties.kode || f.properties.id), polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates; let d = '', best = 0;
  for (const p of polys) { const pts = p[0].map(pj); let a = 0, cx = 0, cy = 0;
    pts.forEach(([x, y], i) => { const [u, v] = pts[(i + 1) % pts.length], q = x * v - u * y; a += q; cx += (x + u) * q; cy += (y + v) * q; });
    d += 'M' + pts.map(([x, y]) => x.toFixed(1) + ' ' + y.toFixed(1)).join('L') + 'Z';
    if (Math.abs(a) > best) { best = Math.abs(a); pusat[k] = [cx / (3 * a), cy / (3 * a)]; } }
  s += `<path d="${d}" fill="${ada.has(k) ? '#F8D5B8' : '#E8ECF1'}" stroke="#fff" stroke-width="1"/>`;
  if (awas.has(k)) s2 += `<path d="${d}" fill="none" stroke="#C8102E" stroke-width="2.4" stroke-linejoin="round"/>`;
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PW}" height="${PH}" viewBox="0 0 ${PW} ${PH}">${s}${s2}</svg>`;
const b = await chromium.launch({executablePath: process.env.CHROMIUM_SHELL || os.homedir() + '/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
const pg = await b.newPage({viewport: {width: PW, height: PH}, deviceScaleFactor: 1.5});
await pg.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
await (await pg.$('svg')).screenshot({path: 'peta.png', omitBackground: true}); await b.close();
fs.writeFileSync('titik.json', JSON.stringify({PW, PH, pusat}));
console.log('peta', PW, PH, 'berkejadian', [...ada].join(','), 'perlu perhatian', [...awas].join(','));
