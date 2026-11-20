// Peta slide Rincian Lokasi, satu panel per zona (pemilik 20 Nov: "slide 2 tambahin peta ... batas adm kab/kot", "multipanel sesuai zona/areanya,
// liat peta paparan banjir sepekan, tapi sesuaikan labelnya"). Argumen: <berkas spek.json> = {ke, nama, pw, ph, bbox: [lon0, lat0, lon1, lat1], R, lok: [{no, prov, lokasi, jenis}]}.
// Daratan provinsi abu, batas kab/kota semua provinsi yang masuk bingkai, kab/kota berkejadian diwarnai warna jenis.
// Keluaran <ke>/<nama>.png + <nama>.json (titik label nomor px, didorong supaya tidak bertumpuk; asal = pusat kab/kota).
import fs from 'node:fs';
import { luncur } from './pw.mjs';
const SP = JSON.parse(fs.readFileSync(process.argv[2]));
const { ke: KE, nama: NAMA, pw: PW, ph: PH, bbox: b, R, lok: L } = SP;
const GEO = new URL('../../../public/geo/', import.meta.url);
// warna sama dengan JENIS_LAIN yang ditimpa jalan.py 20 Nov (pemilik: banjir, cuaca, gempa "mirip2"); palet tema BNPB
const WARNA = {banjir: ['#2F86D1', '#B9D6F0'], cuaca: ['#3D6B5A', '#BCD5C9'], angin: ['#3D6B5A', '#BCD5C9'], longsor: ['#A07A32', '#E3D3B0'], gempabumi: ['#4B4F58', '#C8CBD1']};
const polys = g => g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
const kotak = g => { let k = [999, 999, -999, -999]; for (const p of polys(g)) for (const [x, y] of p[0]) k = [Math.min(k[0], x), Math.min(k[1], y), Math.max(k[2], x), Math.max(k[3], y)]; return k; };
const kena = k => !(k[2] < b[0] || k[0] > b[2] || k[3] < b[1] || k[1] > b[3]);
const sx = PW / (b[2] - b[0]), sy = PH / (b[3] - b[1]);
const pj = ([x, y]) => [(x - b[0]) * sx, (b[3] - y) * sy];
const jalur = g => polys(g).map(p => 'M' + p[0].map(pj).map(([x, y]) => x.toFixed(1) + ' ' + y.toFixed(1)).join('L') + 'Z').join('');
const pusat = g => { let best = 0, c = null;
  for (const p of polys(g)) { const pts = p[0].map(pj); let a = 0, cx = 0, cy = 0;
    pts.forEach(([x, y], i) => { const [u, v] = pts[(i + 1) % pts.length], q = x * v - u * y; a += q; cx += (x + u) * q; cy += (y + v) * q; });
    if (Math.abs(a) > best) { best = Math.abs(a); c = [cx / (3 * a), cy / (3 * a)]; } }
  return c; };
let s = '', garisProv = '';
const kabGeo = {};
for (const f of JSON.parse(fs.readFileSync(new URL('provinsi.json', GEO))).features) {
  if (!kena(kotak(f.geometry))) continue;
  const k = String(f.properties.kode || f.properties.id);
  s += `<path d="${jalur(f.geometry)}" fill="#E8ECF1"/>`;
  garisProv += `<path d="${jalur(f.geometry)}" fill="none" stroke="#FFFFFF" stroke-width="3.2" stroke-linejoin="round"/>`;
  try { kabGeo[k] = JSON.parse(fs.readFileSync(new URL(`kabupaten/${k}.json`, GEO))).features; } catch { kabGeo[k] = []; }
}
for (const k in kabGeo) for (const f of kabGeo[k]) s += `<path d="${jalur(f.geometry)}" fill="none" stroke="#B4BDC8" stroke-width="1.1" stroke-linejoin="round"/>`;
const cari = x => (kabGeo[x.prov] || []).find(f => f.properties.kab === x.lokasi) || (() => { throw new Error('tidak ada batas kab/kota: ' + x.lokasi); })();
const titik = []; let isi = '';
for (const x of L) {
  const f = cari(x), [garis, warna] = WARNA[x.jenis] || WARNA.gempabumi;
  isi += `<path d="${jalur(f.geometry)}" fill="${warna}" stroke="${garis}" stroke-width="2" stroke-linejoin="round"/>`;
  titik.push({no: x.no, asal: pusat(f.geometry)});
}
s += garisProv + isi;
// label nomor (gaya peta sepekan: label di luar wilayah, bergaris penunjuk): mulai sedikit keluar dari pusat kab/kota, menjauhi pusat
// gugus titik; didorong menjauh dari nomor lain (2R + 4 px) dan dari SEMUA pusat kab/kota (R + JAUH px) supaya tidak menutupi wilayah; tetap di bingkai
const JAUH = R * 0.9;
const gx = titik.reduce((a, t) => a + t.asal[0], 0) / titik.length, gy = titik.reduce((a, t) => a + t.asal[1], 0) / titik.length;
titik.forEach((t, i) => {
  let dx = t.asal[0] - gx, dy = t.asal[1] - gy, d = Math.hypot(dx, dy);
  if (d < 1) { const sudut = i * 2.4; dx = Math.cos(sudut); dy = Math.sin(sudut); d = 1; }
  t.p = [t.asal[0] + dx / d * (R + JAUH + 2), t.asal[1] + dy / d * (R + JAUH + 2)];
});
const jepit = t => { t.p[0] = Math.min(PW - R - 2, Math.max(R + 2, t.p[0])); t.p[1] = Math.min(PH - R - 2, Math.max(R + 2, t.p[1])); };
titik.forEach(jepit);
for (let it = 0; it < 800; it++) {
  let gerak = 0;
  for (let i = 0; i < titik.length; i++) {
    for (let j = i + 1; j < titik.length; j++) {
      const a = titik[i].p, c = titik[j].p; let dx = c[0] - a[0], dy = c[1] - a[1], d = Math.hypot(dx, dy);
      if (d < 2 * R + 4) { if (d < 0.01) { dx = 1; dy = 0.4; d = 1.08; } const m = (2 * R + 4 - d) / 2; a[0] -= dx / d * m; a[1] -= dy / d * m; c[0] += dx / d * m; c[1] += dy / d * m; gerak++; }
    }
    for (const u of titik) {   // pusat kab/kota = titik tetap yang ditolak label
      const a = titik[i].p; let dx = a[0] - u.asal[0], dy = a[1] - u.asal[1], d = Math.hypot(dx, dy);
      if (d < R + JAUH) { if (d < 0.01) { dx = 0.3; dy = -1; d = 1.04; } const m = R + JAUH - d; a[0] += dx / d * m; a[1] += dy / d * m; gerak++; }
    }
  }
  titik.forEach(jepit);
  if (!gerak) break;
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PW}" height="${PH}" viewBox="0 0 ${PW} ${PH}">${s}</svg>`;
const br = await luncur();
const pg = await br.newPage({viewport: {width: PW, height: PH}, deviceScaleFactor: 2});
await pg.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
await (await pg.$('svg')).screenshot({path: `${KE}/${NAMA}.png`, omitBackground: true}); await br.close();
fs.writeFileSync(`${KE}/${NAMA}.json`, JSON.stringify({PW, PH, R, bbox: b, titik}));
console.log('peta', NAMA, L.length, 'lokasi, provinsi dalam bingkai', Object.keys(kabGeo).join(','));
