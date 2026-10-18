// Uji setara Python <-> JS: masukan sintetis sama, bandingkan jejak, posisi, endapan, dan RNG.
// Jalankan: node scripts/gunungapi/uji_setara.mjs
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const akar = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
await import(pathToFileURL(path.join(akar, 'public/gunungapi/abu_model.js')).href);  // ESM: mendaftar globalThis.AbuModel
const A = globalThis.AbuModel;
const py = JSON.parse(execFileSync('python3', [path.join(akar, 'scripts/gunungapi/abu.py'), 'setara'], { maxBuffer: 1 << 26 }).toString());

// toleransi: Python memakai double, JS menyimpan cuplikan Float32 (~1 m pada 112 BT), jadi 1e-4 derajat (~11 m)
const TOL_DEG = 1e-4, TOL_ARAH = 0.05, TOL_KM = 0.05, TOL_LUAS = 0.01, TOL_Z = 1;
const gagal = [];
const cek = (ok, pesan) => { if (!ok) gagal.push(pesan); };
let maks = { deg: 0, z: 0, arah: 0, km: 0, luas: 0, endapan: 0 };

const r = A.mulberry32(1);
py.mulberry_seed1.forEach((v, i) => cek(r() === v, `mulberry32 seed 1 ke-${i}: JS beda dari Python (${v})`));

const m = py.masukan;
const h = A.jalankan(m);
const luas = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; s += x1 * y2 - x2 * y1; } return Math.abs(s) / 2; };

const bandingJejak = (nama, JS, fnJS) => {
  for (const [jam, a] of Object.entries(JS)) {
    const b = fnJS(h, Number(jam));
    cek((b.sel_n ?? 0) === (a.sel_n ?? 0), `${nama} jam ${jam}: sel_n JS ${b.sel_n} vs Py ${a.sel_n}`);
    if (a.arah_deg === null || b.arah_deg === null) { cek(a.arah_deg === b.arah_deg, `${nama} jam ${jam}: kosong di satu sisi saja`); continue; }
    const dArah = Math.abs(((b.arah_deg - a.arah_deg + 540) % 360) - 180), dKm = Math.abs(b.jangkau_km - a.jangkau_km);
    const dLuas = Math.abs(luas(b.poligon) - luas(a.poligon)) / Math.max(luas(a.poligon), 1e-12);
    maks.arah = Math.max(maks.arah, dArah); maks.km = Math.max(maks.km, dKm); maks.luas = Math.max(maks.luas, dLuas); n++;
    cek(dArah < TOL_ARAH, `${nama} jam ${jam}: arah JS ${b.arah_deg} vs Py ${a.arah_deg}`);
    cek(dKm < TOL_KM, `${nama} jam ${jam}: jangkau JS ${b.jangkau_km} vs Py ${a.jangkau_km} km`);
    cek(dLuas < TOL_LUAS, `${nama} jam ${jam}: luas poligon beda ${(dLuas * 100).toFixed(3)}%`);
  }
};
let n = 0;
cek(Math.abs(h.massa_kg - py.massa_kg) / py.massa_kg < 1e-12, `massa_kg JS ${h.massa_kg} vs Py ${py.massa_kg}`);
bandingJejak('jejak', py.jejak, A.jejak);
bandingJejak('jejak_tipis', py.jejak_tipis, A.jejakTipis);
cek(Object.values(py.jejak).some((j) => j.sel_n > 0), 'uji tak bermakna: tak ada sel berambang pada masukan uji');

const s = h.snap[24];
for (let i = 0; i < py.pos24.lon.length; i++) {
  const d = Math.max(Math.abs(s.lon[i] - py.pos24.lon[i]), Math.abs(s.lat[i] - py.pos24.lat[i])), dz = Math.abs(s.z[i] - py.pos24.z[i]);
  maks.deg = Math.max(maks.deg, d); maks.z = Math.max(maks.z, dz);
  cek(d < TOL_DEG, `partikel ${i} jam 24: selisih ${d} derajat`);
  cek(dz < TOL_Z, `partikel ${i} jam 24: selisih z ${dz} m`);
}

const e = A.endapan(h, { titik: py.titik, radius_km: 10 });
e.forEach((v, i) => { maks.endapan = Math.max(maks.endapan, Math.abs(v - py.endapan[i])); cek(Math.abs(v - py.endapan[i]) < 0.02, `endapan titik ${i}: JS ${v} vs Py ${py.endapan[i]}`); });

if (gagal.length) { console.error('GAGAL:\n' + gagal.join('\n')); process.exit(1); }
console.log(`ok (${n} jejak dibandingkan). selisih maks: posisi ${maks.deg.toExponential(2)} derajat (toleransi ${TOL_DEG}), z ${maks.z.toFixed(3)} m (${TOL_Z}), arah ${maks.arah.toExponential(2)} derajat (${TOL_ARAH}), jangkau ${maks.km.toExponential(2)} km (${TOL_KM}), luas ${(maks.luas * 100).toExponential(2)}% (${TOL_LUAS * 100}%), endapan ${maks.endapan.toExponential(2)} (0,02)`);
