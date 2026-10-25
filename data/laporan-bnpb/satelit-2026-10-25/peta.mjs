// Peta titik panas per provinsi 25 Okt 2026 sementara (cut-off 25 Okt 06.40 WIB), port dari public/laporan.js kartuPeta() (algoritma label sama).
import fs from 'node:fs';
import { chromium } from '/Users/hhizari/.npm/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs';
const REPO = '/Users/hhizari/WebProjects/poskokarhutla';
const g = JSON.parse(fs.readFileSync(REPO + '/public/geo/provinsi.json'));
const A = JSON.parse(fs.readFileSync('angka_nasional.json')).prov;
const I = 3, IP = 2;  // 25 Okt sementara, pembanding 24 Okt
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
const mx = Math.max(1, rows[0].t), rad = t => 5 + 33 * Math.sqrt(t / mx), ada = new Set(rows.map(r => r.k));
let s = Object.entries(d).map(([k, p]) => `<path d="${p}" class="${ada.has(k) ? 'pp-on' : 'pp'}"/>`).join('');
// firespot (env FIRESPOT = keluaran firespot.py): satu titik kuning per titik firespot hari terakhir, di bawah lingkaran hotspot
if (process.env.FIRESPOT) s += JSON.parse(fs.readFileSync(process.env.FIRESPOT)).titik.map(([lon, lat]) => { const [x, y] = pj([lon, lat]);
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.3" class="fsp"/>`; }).join('');
const bul = rows.filter(r => c[r.k]).map(r => ({...r, x: c[r.k][0], y: c[r.k][1], r: rad(r.t)}));
s += bul.slice().reverse().map(r => `<circle cx="${r.x.toFixed(1)}" cy="${r.y.toFixed(1)}" r="${r.r.toFixed(1)}" class="pc"/>`).join('');
s += bul.filter(r => r.r >= 22).map(r => `<text x="${r.x.toFixed(1)}" y="${(r.y + 2).toFixed(1)}" class="pa">${fmt(r.t)}</text>`
  + `<text x="${r.x.toFixed(1)}" y="${(r.y + 14).toFixed(1)}" class="pn">${SINGKAT[r.k] || ''}</text>`).join('');
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
const css = `.pp{fill:#DCE1E7;stroke:#fff;stroke-width:.6}.pp-on{fill:#051C2C;stroke:#fff;stroke-width:.8}
.pc{fill:#D9600B;stroke:#fff;stroke-width:1.5;fill-opacity:.95}.pa{font:800 14px Roboto;fill:#fff;text-anchor:middle}
.pn{font:700 9.5px Roboto;fill:#fff;text-anchor:middle;opacity:.95}.pl{stroke:#D9600B;stroke-width:1.2}
.pk{fill:#fff;stroke:#A9B4C2;stroke-width:.8}.pt-t{font:10px Roboto}.pt-n{font-weight:600;fill:#6B7280}.pt-v{font-weight:800;fill:#1A1A1A}\n.fsp{fill:#FFC857;opacity:.85}.rk{fill:#fff;stroke:#D9600B;stroke-width:1.8}.rk-t{font:800 9.5px Roboto;fill:#1A1A1A;text-anchor:middle}`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -8 ${PW + 36} ${PH + 16}" width="${PW + 36}" height="${PH + 16}"><style>${css}</style>${s}</svg>`;
fs.writeFileSync('peta-25okt.svg', svg);
const b = await chromium.launch({executablePath: '/Users/hhizari/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell'}); const pg = await b.newPage({viewport: {width: PW + 36, height: PH + 16}, deviceScaleFactor: 4});
await pg.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;600;700;800&display=block" rel="stylesheet"></head><body style="margin:0;background:transparent">${svg}</body></html>`, {waitUntil: 'networkidle'});   // Roboto tidak terpasang lokal
await pg.evaluate(async () => { await document.fonts.load('800 14px Roboto'); await document.fonts.load('600 10px Roboto'); await document.fonts.ready; });
await (await pg.$('svg')).screenshot({path: 'peta-25okt.png', omitBackground: true});
await b.close();
console.log('provinsi bertitik', rows.length, 'teratas', rows[0], 'label tak muat', tanpa);
