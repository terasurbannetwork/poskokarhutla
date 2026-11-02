// Peta titik panas per provinsi 20 Okt 2026, port dari public/laporan.js kartuPeta() (algoritma label sama).
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { luncur } from '../pw.mjs';
const g = JSON.parse(fs.readFileSync(new URL('../../../../public/geo/provinsi.json', import.meta.url)));
const A = JSON.parse(fs.readFileSync('angka_nasional.json')).prov;
const I = 3, IP = 2;  // 20 Okt, pembanding 19 Okt
const SINGKAT = {11: "Aceh", 12: "Sumut", 13: "Sumbar", 14: "Riau", 15: "Jambi", 16: "Sumsel", 17: "Bengkulu", 18: "Lampung", 19: "Babel", 21: "Kepri",
  31: "Jakarta", 32: "Jabar", 33: "Jateng", 34: "DIY", 35: "Jatim", 36: "Banten", 51: "Bali", 52: "NTB", 53: "NTT", 61: "Kalbar", 62: "Kalteng",
  63: "Kalsel", 64: "Kaltim", 65: "Kaltara", 71: "Sulut", 72: "Sulteng", 73: "Sulsel", 74: "Sultra", 75: "Gorontalo", 76: "Sulbar", 81: "Maluku",
  82: "Malut", 91: "Papua", 92: "Pabar", 93: "Papsel", 94: "Papteng", 95: "Papeg", 96: "PBD"};
const fmt = n => Math.round(n).toLocaleString('id-ID');
const PW = 1000, PH = 400, PS = PW / 46, pj = ([lo, la]) => [(lo - 95) * PS, (6.5 - la) * PS];
const d = {}, c = {};
for (const f of g.features) {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  let s = '', best = 0;
  for (const p of polys) {
    const pts = p[0].map(pj); let a = 0, cx = 0, cy = 0, lx = -9, ly = -9, seg = '';
    pts.forEach(([x, y], i) => { const j = pts[(i + 1) % pts.length], k = x * j[1] - j[0] * y; a += k; cx += (x + j[0]) * k; cy += (y + j[1]) * k;
      if (Math.abs(x - lx) + Math.abs(y - ly) > .8) { seg += (seg ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); lx = x; ly = y; } });
    if (Math.abs(a) > 4) s += seg + 'Z';
    if (Math.abs(a) > best) { best = Math.abs(a); c[f.properties.kode] = [cx / (3 * a), cy / (3 * a)]; }
  }
  d[f.properties.kode] = s;
}
const rows = Object.entries(A).map(([k, o]) => ({k, t: o.hot[I] || 0})).filter(r => r.t > 0).sort((a, b) => b.t - a.t);
const mx = Math.max(1, rows[0]?.t || 0), rad = t => 5 + 33 * Math.sqrt(t / mx), ada = new Set(rows.map(r => r.k));
let s = Object.entries(d).map(([k, p]) => `<path d="${p}" class="${ada.has(k) ? 'pp-on' : 'pp'}"/>`).join('');
const bul = rows.filter(r => c[r.k]).map(r => ({...r, x: c[r.k][0], y: c[r.k][1], ax: c[r.k][0], ay: c[r.k][1], r: rad(r.t)}));
// Lingkaran bertumpuk didorong saling menjauh (Sulsel tertimpa Sultra, angka Gorontalo tertutup Sulteng, 31 Okt 2026): yang kecil bergeser
// lebih jauh, semuanya ditarik pelan ke titik tengah provinsinya; 80 putaran terakhir tanpa tarikan supaya pasti tidak bertumpuk.
for (let it = 0; it < 480; it++) {
  let tumpuk = false;
  for (let i = 0; i < bul.length; i++) for (let j = i + 1; j < bul.length; j++) {
    const a = bul[i], b = bul[j], dx = b.x - a.x, dy = b.y - a.y, dd = Math.hypot(dx, dy) || .01, kurang = a.r + b.r + 2 - dd;
    if (kurang <= 0) continue;
    tumpuk = true;
    const wa = b.r ** 2 / (a.r ** 2 + b.r ** 2), ux = dx / dd, uy = dy / dd;
    a.x -= ux * kurang * wa; a.y -= uy * kurang * wa; b.x += ux * kurang * (1 - wa); b.y += uy * kurang * (1 - wa);
  }
  if (it < 400) for (const r of bul) { r.x += (r.ax - r.x) * .02; r.y += (r.ay - r.y) * .02; }
  else if (!tumpuk) break;
}
s += bul.slice().reverse().map(r => `<circle cx="${r.x.toFixed(1)}" cy="${r.y.toFixed(1)}" r="${r.r.toFixed(1)}" class="pc"/>`).join('');
s += bul.filter(r => r.r >= 22).map(r => `<text x="${r.x.toFixed(1)}" y="${(r.y + 2).toFixed(1)}" class="pa">${fmt(r.t)}</text>`
  + `<text x="${r.x.toFixed(1)}" y="${(r.y + 14).toFixed(1)}" class="pn" style="font-size:${Math.min(9.5, (2 * r.r - 10) / (0.58 * (SINGKAT[r.k] || ' ').length)).toFixed(1)}px">${SINGKAT[r.k] || ''}</text>`).join('');   // nama panjang (Gorontalo) dikecilkan supaya muat di lingkaran
const LH = 17, pil = [], kena = (x, y, w) => x < 2 || x + w > PW - 2 || y < 2 || y + LH > PH - 2
  || pil.some(q => x < q[0] + q[2] + 3 && x + w + 3 > q[0] && y < q[1] + LH + 3 && y + LH + 3 > q[1])
  || bul.some(c => { const nx = Math.max(x, Math.min(c.x, x + w)), ny = Math.max(y, Math.min(c.y, y + LH)); return (nx - c.x) ** 2 + (ny - c.y) ** 2 < (c.r + 2) ** 2; });
let garis = '', label = '', tanpa = [];
for (const r of bul.filter(r => r.r < 22)) {
  const nm = SINGKAT[r.k] || '', n = fmt(r.t), w = nm.length * 5.9 + n.length * 6.6 + 18;
  let pos = null;
  for (const dd of [8, 18, 30, 46, 64]) { for (let a = 0; a < 16 && !pos; a++) { const ang = -Math.PI / 4 - a * Math.PI / 8,
    cx = r.x + Math.cos(ang) * (r.r + dd + w / 2), cy = r.y + Math.sin(ang) * (r.r + dd + LH / 2), x = cx - w / 2, y = cy - LH / 2;
    if (!kena(x, y, w)) pos = [x, y, cx, cy]; } if (pos) break; }
  if (!pos) { tanpa.push(nm); continue; }
  const [x, y, cx, cy] = pos; pil.push([x, y, w]);
  const dd = Math.hypot(cx - r.x, cy - r.y) || 1, ex = r.x + (cx - r.x) * r.r / dd, ey = r.y + (cy - r.y) * r.r / dd;
  const tx = Math.max(x, Math.min(r.x, x + w)), ty = Math.max(y, Math.min(r.y, y + LH));
  if (Math.hypot(tx - ex, ty - ey) > 3) garis += `<line x1="${ex.toFixed(1)}" y1="${ey.toFixed(1)}" x2="${tx.toFixed(1)}" y2="${ty.toFixed(1)}" class="pl"/>`;
  label += `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})"><rect width="${w.toFixed(1)}" height="${LH}" rx="8.5" class="pk"/>`
    + `<text x="8" y="12" class="pt-t"><tspan class="pt-n">${nm}</tspan> <tspan class="pt-v">${n}</tspan></text></g>`;
}
s += garis + label;
// nomor peringkat 1-7 (sama dengan tabel peringkat): lencana kecil di tepi lingkaran, di sisi yang tidak menabrak
// lingkaran lain, pil label, atau lencana lain (dicoba 8 arah)
const lencana = [];
s += bul.slice(0, 7).map((r, n) => {
  const R8 = 8.5, bebas = (x, y) => !bul.some(c => c !== r && Math.hypot(x - c.x, y - c.y) < c.r + R8)
    && !pil.some(q => x + R8 > q[0] && x - R8 < q[0] + q[2] && y + R8 > q[1] && y - R8 < q[1] + LH)
    && !lencana.some(([a, b]) => Math.hypot(x - a, y - b) < 2 * R8) && x > R8 && x < PW - R8 && y > R8 && y < PH - R8;
  let pos = null;
  for (const d of [-135, -45, 135, 45, 180, 0, -90, 90]) { const a = d * Math.PI / 180, x = r.x + Math.cos(a) * r.r, y = r.y + Math.sin(a) * r.r; if (bebas(x, y)) { pos = [x, y]; break; } }
  if (!pos) pos = [r.x + Math.cos(-3 * Math.PI / 4) * r.r, r.y + Math.sin(-3 * Math.PI / 4) * r.r];
  lencana.push(pos);
  return `<g transform="translate(${pos[0].toFixed(1)},${pos[1].toFixed(1)})"><circle r="7.5" class="rk"/><text y="3.4" class="rk-t">${n + 1}</text></g>`; }).join('');
const OR = process.env.BENCANA === 'banjir' ? '#2F6FB5' : '#D9600B';   // lingkaran banjir biru (penanganan_banjir.py), karhutla oranye
// Roboto disematkan sebagai data URL: headless shell tidak selalu melihat font sistem dan jatuh ke serif (pemilik 28 Okt: font wajib Roboto)
// Mesin tanpa Roboto di ~/Library/Fonts memakai salinan repo public/vendor/roboto (Regular + Bold; tebal 600-900 jatuh ke Bold)
const muka = (f, w) => `@font-face{font-family:Roboto;font-weight:${w};src:url(data:font/ttf;base64,${fs.readFileSync(f).toString('base64')})}`;
const FONT = ['Roboto[wdth,wght].ttf', 'Roboto-Regular.ttf'].map(n => os.homedir() + '/Library/Fonts/' + n).find(f => fs.existsSync(f));
const VENDOR = fileURLToPath(new URL('../../../../public/vendor/roboto/', import.meta.url));   // pathname di Windows = /D:/..., salah (30 Okt)
const css = `${FONT ? muka(FONT, '100 900') : muka(VENDOR + 'Roboto-Regular.ttf', '100 500') + muka(VENDOR + 'Roboto-Bold.ttf', '600 900')}.pp{fill:#DCE1E7;stroke:#fff;stroke-width:.6}.pp-on{fill:#051C2C;stroke:#fff;stroke-width:.8}
.pc{fill:${OR};stroke:#fff;stroke-width:1.5;fill-opacity:.95}.pa{font:800 14px Roboto;fill:#fff;text-anchor:middle}
.pn{font:700 9.5px Roboto;fill:#fff;text-anchor:middle;opacity:.95}.pl{stroke:${OR};stroke-width:1.2}
.pk{fill:#fff;stroke:#A9B4C2;stroke-width:.8}.pt-t{font:10px Roboto}.pt-n{font-weight:600;fill:#6B7280}.pt-v{font-weight:800;fill:#1A1A1A}\n.rk{fill:#fff;stroke:${OR};stroke-width:1.8}.rk-t{font:800 9.5px Roboto;fill:#1A1A1A;text-anchor:middle}`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -8 ${PW + 36} ${PH + 16}" width="${PW + 36}" height="${PH + 16}"><style>${css}</style>${s}</svg>`;
fs.writeFileSync('peta-20okt.svg', svg);
const b = await luncur(); const pg = await b.newPage({viewport: {width: PW + 36, height: PH + 16}, deviceScaleFactor: 4});
await pg.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
await pg.evaluate(() => document.fonts.ready);
await (await pg.$('svg')).screenshot({path: 'peta-20okt.png', omitBackground: true});
await b.close();
console.log('provinsi bertitik', rows.length, 'teratas', rows[0], 'label tak muat', tanpa);
