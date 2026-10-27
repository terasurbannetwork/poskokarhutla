/* J2 mesin genangan Jakarta, headless di Node (RANCANGAN-GENANGAN-JAKARTA.md §5.1): memuat public/banjir/sim_genangan.js lewat vm
   (pola tests/banjir/sim_genangan.test.mjs), menjalankan SATU kejadian di DEM DEMNAS yang diturunkan ke ~30 m.
   Pakai:  node scripts/banjir/genangan/mesin.mjs [--kejadian 2020-01] [--mulai 2019-12-30] [--jam 96] [--faktor 4]
           [--hujan ifs|era5|gsmap_dis] [--bentuk ifs|era5] [--cn 80] [--kd 10] [--muka 0.6] [--rentang 1] [--skala-subsiden 1] [--tanpa-hulu]
           [--tanpa-alur] [--tanggul 2.5 | --tanpa-tanggul] [--skala-hulu 1] [--radius-hulu-km 8]
           [--kotak lon0,lat0,lon1,lat1] [--keluar berkas.json]       node ... uji   (swa-uji helper)
   Masukan : DEM data/raw/banjir/genangan/medan/demnas_kotak.f32.gz (+json); hujan jam hujan_jam/<kejadian>.json (kisi 0,1 derajat,
             tiap sel DEM memakai sel hujan terdekat, SCS-CN harian limpasanHarian); Kd per kecamatan (seragam dulu); debit hulu GloFAS
             (public/.../hulu.json) disuntik di sel ALUR bernama sama (OSM) terdekat dari titik snap GloFAS; laut = sel <= 0 m tersambung ke tepi pada DEM 2011,
             muka laut tetap skenario (--muka maks harian, --rentang tunggang); subsidensi DEM 2011 -> tahun kejadian.
   J2.5 : (1) alur OSM river/canal/drain dibakar ke DEM (ALUR: kedalaman, lebar, Manning per kelas), profil dasar dibuat monoton ke hilir
          (Priority-Flood hanya di sel alur); kedalaman keluaran sel alur = tinggi di atas tepi. (2) tanggul laut: sel darat bertetangga laut
          dinaikkan ke TANGGUL_M kecuali sel alur (muara terbuka). (3) --hujan gsmap_dis = total harian GSMaP (bilinear 4 sel) x bentuk jam IFS/ERA5.
   TIDAK dikalibrasi (J3 menunggu persetujuan kriteria §7). Semua parameter di sini placeholder yang tercatat di keluaran. */
import fs from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";
import zlib from "node:zlib";
import path from "node:path";
import {fileURLToPath} from "node:url";

const AKAR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const P = (...a) => path.join(AKAR, ...a);
const MEDAN = P("data/raw/banjir/genangan/medan");
const TAHUN_DEM = 2011; /* DEMNAS TerraSAR-X 2011 (demnas_kotak.json catatan) */
/* Parameter alur OSM (ASUMSI, belum dikalibrasi): kedalaman dasar di bawah tepi (m), lebar (m), Manning n. Rujukan kasar: normalisasi Ciliwung/
   Kanal Banjir Barat lebar 30-60 m dalam 3-5 m; saluran sekunder 5-15 m; drainase tersier 1 m. */
export const ALUR = {river: {dalam: 3, lebar: 30, n: .035}, canal: {dalam: 2.5, lebar: 15, n: .035}, drain: {dalam: 1, lebar: 5, n: .03}};
/* Tanggul pantai: elevasi puncak (m terhadap MSL tahun kejadian). ASUMSI dari tanggul pantai/NCICD Jakarta (puncak rencana tahap A ~ +2,5 sampai +3,5 m MSL
   di literatur NCICD/PTPIN; angka ini BUKAN ukuran lapangan dan tidak diverifikasi di repo). */
export const TANGGUL_M = 2.5;
const NAMA_ALUR = {Ciliwung: /ci\s*liwung/i, Cipinang: /ci\s*pinang/i};

/* ---------- helper murni (diuji di `uji`) ---------- */
/* Laju penurunan tanah (cm/thn) Jakarta, interpolasi linier antar jangkar literatur (subsiden_literatur.json): tiap sumber jadi satu
   jangkar di tahun tengah periodenya, nilai = "tengah_cm_thn" bila ada, kalau tidak "maks_cm_thn". Abidin dkk. 2011 (1982-2010) -> 1996: 15;
   Sidiq dkk. 2021 (2016-2020) -> 2018: 5 (itu MAKSIMUM kota, bukan rata-rata). Di luar jangkar: nilai jangkar terdekat. Seragam di ruang
   (data tidak punya peta laju) => BATAS ATAS di Jakarta Selatan/Timur dan wajar di pesisir utara. Penurunan kumulatif = integral laju. */
export function jangkarSubsiden(sumber) {
  return sumber.map(s => { const [a, b] = s.periode.split("-").map(Number); return [(a + b) / 2, s.tengah_cm_thn ?? s.maks_cm_thn]; })
    .filter(([, v]) => Number.isFinite(v)).sort((x, y) => x[0] - y[0]);
}
export function lajuCm(jangkar, t) {
  if (t <= jangkar[0][0]) return jangkar[0][1];
  for (let i = 1; i < jangkar.length; i++) if (t <= jangkar[i][0]) { const [t0, v0] = jangkar[i - 1], [t1, v1] = jangkar[i]; return v0 + (v1 - v0) * (t - t0) / (t1 - t0); }
  return jangkar[jangkar.length - 1][1];
}
export function turunMeter(jangkar, dari, ke) {
  const n = 1000, h = (ke - dari) / n; let s = 0;
  for (let i = 0; i < n; i++) s += lajuCm(jangkar, dari + (i + .5) * h) * h;
  return s / 100;
}
/* rata-rata blok f x f (kolom/baris sisa dibuang), nodata diabaikan */
export function turunkan(z, kolom, baris, f, nodata) {
  const nx = Math.floor(kolom / f), ny = Math.floor(baris / f), o = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { let s = 0, n = 0;
    for (let b = 0; b < f; b++) for (let a = 0; a < f; a++) { const v = z[(j * f + b) * kolom + i * f + a]; if (v !== nodata) { s += v; n++; } }
    o[j * nx + i] = n ? s / n : 0; }
  return {z: o, nx, ny};
}
/* debit harian (m3/s, hari ke-i mulai 00:00 WIB di `hariAwal`, diwakili pukul 12:00) -> per jam sejak `mulai`, J+1 nilai, interpolasi linier */
export function debitJam(q, jamOffset, J) {
  const o = new Float64Array(J + 1);
  for (let t = 0; t <= J; t++) { const x = (jamOffset + t) / 24 - .5, i = Math.max(0, Math.min(q.length - 1, Math.floor(x))), k = Math.min(q.length - 1, i + 1), f = Math.max(0, Math.min(1, x - i));
    o[t] = q[i] + (q[k] - q[i]) * f; }
  return o;
}
export function persentil(arr, p) { if (!arr.length) return null; const s = Float32Array.from(arr).sort(); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; }
const di = (x, y, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
/* kecamatan per sel: Int16 indeks ke `nama` (-1 di luar DKI). Cincin luar saja (lubang diabaikan, sama dengan wilayah.py). */
export function rasterKec(geo, nx, ny, lonSel, latSel) {
  const o = new Int16Array(nx * ny).fill(-1), nama = [];
  geo.features.forEach((f, idx) => {
    nama.push(`${f.properties.kab}|${f.properties.kec}`);
    const bag = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
    for (const poli of bag) { const r = poli[0]; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const [x, y] of r) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      for (let j = 0; j < ny; j++) { const la = latSel(j); if (la < y0 || la > y1) continue;
        for (let i = 0; i < nx; i++) { const lo = lonSel(i); if (lo >= x0 && lo <= x1 && o[j * nx + i] < 0 && di(lo, la, r)) o[j * nx + i] = idx; } } }
  });
  return {kec: o, nama};
}

/* ---------- J2.5: alur, tanggul, hujan harian ---------- */
/* garis [[i,j] pecahan,...] -> indeks sel 4-tersambung (alur harus 4-tersambung: mesin memindah air lewat 4 sisi). Titik di luar kisi dilewati. */
export function garisAlur4(garis, nx, ny) {
  const o = []; const tanda = (i, j) => { if (i >= 0 && j >= 0 && i < nx && j < ny) o.push(j * nx + i); };
  for (let s = 0; s < garis.length; s++) { if (!s) { tanda(Math.floor(garis[0][0]), Math.floor(garis[0][1])); continue; }
    const x1 = Math.floor(garis[s][0]), y1 = Math.floor(garis[s][1]), x0 = Math.floor(garis[s - 1][0]), y0 = Math.floor(garis[s - 1][1]);
    const ax = Math.abs(x1 - x0), ay = Math.abs(y1 - y0), sx = Math.sign(x1 - x0), sy = Math.sign(y1 - y0); let x = x0, y = y0;
    for (let ix = 0, iy = 0; ix < ax || iy < ay;) { if ((.5 + ix) / ax < (.5 + iy) / ay) { x += sx; ix++; } else { y += sy; iy++; } tanda(x, y); } }
  return o;
}
class Heap { constructor() { this.a = []; }
  push(k, v) { const a = this.a; a.push([v, k]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a, t = a[0], e = a.pop(); if (a.length) { a[0] = e; let i = 0; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return t; }
  get n() { return this.a.length; } }
/* profil dasar alur monoton ke hilir: Priority-Flood (+eps) HANYA di sel alur. Benih = sel alur bertetangga laut atau di tepi kisi; komponen alur tanpa benih
   dibenihi sel terendahnya (ujung buntu). bed diubah di tempat. Mengembalikan {komponenBuntu, naik: jumlah sel dasar yang dinaikkan > 1 m}. */
export function profilMonoton(bed, alur, nx, ny, laut, eps = 1e-5) {
  const N = nx * ny, ada = new Uint8Array(N), H = new Heap(), idx = []; let buntu = 0, naik = 0;
  const nb = k => { const i = k % nx, j = (k / nx) | 0, r = []; if (i > 0) r.push(k - 1); if (i < nx - 1) r.push(k + 1); if (j > 0) r.push(k - nx); if (j < ny - 1) r.push(k + nx); return r; };
  const asli = Float64Array.from(bed);
  const alir = () => { while (H.n) { const [v, c] = H.pop(); for (const n of nb(c)) if (alur[n] && !ada[n]) { ada[n] = 1; if (bed[n] < v + eps) bed[n] = v + eps; H.push(n, bed[n]); } } };
  for (let k = 0; k < N; k++) if (alur[k]) { idx.push(k); const i = k % nx, j = (k / nx) | 0;
    if (!ada[k] && (!i || !j || i === nx - 1 || j === ny - 1 || nb(k).some(n => laut[n]))) { ada[k] = 1; H.push(k, bed[k]); } }
  alir(); idx.sort((a, b) => bed[a] - bed[b]);
  for (const k of idx) if (!ada[k]) { ada[k] = 1; buntu++; H.push(k, bed[k]); alir(); }
  for (const k of idx) if (bed[k] - asli[k] > 1) naik++;
  return {komponenBuntu: buntu, naik};
}
/* sel darat (bukan alur) bertetangga-4 dengan laut */
export function pesisir(laut, alur, nx, ny) {
  const m = new Uint8Array(nx * ny);
  for (let k = 0; k < m.length; k++) { if (laut[k] || alur[k]) continue; const i = k % nx, j = (k / nx) | 0;
    if ((i > 0 && laut[k - 1]) || (i < nx - 1 && laut[k + 1]) || (j > 0 && laut[k - nx]) || (j < ny - 1 && laut[k + nx])) m[k] = 1; }
  return m;
}
/* hujan harian -> per jam: jam model (bentuk) dinormalkan ke total harian. Hari tanpa total tetap hujan model; hari model kering diratakan 24 jam.
   waktu "YYYY-MM-DDTHH:00" WIB; total {tanggal: mm}. Mengembalikan {mm, diganti, tanpaBentuk}. */
export function disagregasi(mm, waktu, total) {
  const o = Array.from(mm, x => x || 0); let diganti = 0, tanpaBentuk = 0;
  for (let a = 0; a + 24 <= o.length; a += 24) { const tgl = waktu[a].slice(0, 10), T = total[tgl]; if (T == null) continue;
    let s = 0; for (let h = 0; h < 24; h++) s += o[a + h];
    if (s > 1e-9) for (let h = 0; h < 24; h++) o[a + h] *= T / s; else { tanpaBentuk++; for (let h = 0; h < 24; h++) o[a + h] = T / 24; }
    diganti++; }
  return {mm: o, diganti, tanpaBentuk};
}
/* medan harian GSMaP (urutan j utara->selatan, i barat->timur, pusat sel) di titik (lat, lon): bilinear; sel hilang (null) diabaikan; luar kisi = jepit */
export function bilinear(f, lons, lats, lon, lat) {
  const nxg = lons.length, nyg = lats.length, fx = Math.min(nxg - 1, Math.max(0, (lon - lons[0]) / (lons[1] - lons[0]))), fy = Math.min(nyg - 1, Math.max(0, (lat - lats[0]) / (lats[1] - lats[0])));
  const i0 = Math.floor(fx), j0 = Math.floor(fy), i1 = Math.min(nxg - 1, i0 + 1), j1 = Math.min(nyg - 1, j0 + 1), u = fx - i0, v = fy - j0; let s = 0, w = 0;
  for (const [i, j, b] of [[i0, j0, (1 - u) * (1 - v)], [i1, j0, u * (1 - v)], [i0, j1, (1 - u) * v], [i1, j1, u * v]]) { const x = f[j * nxg + i]; if (x != null && b > 0) { s += x * b; w += b; } }
  return w ? s / w : null;
}

function uji() {
  const j = jangkarSubsiden([{periode: "1982-2010", tengah_cm_thn: 15, maks_cm_thn: 28}, {periode: "2016-2020", tengah_cm_thn: null, maks_cm_thn: 5}]);
  assert(j[0][0] === 1996 && j[0][1] === 15 && j[1][0] === 2018 && j[1][1] === 5, JSON.stringify(j));
  assert(Math.abs(lajuCm(j, 2007) - 10) < 1e-9 && lajuCm(j, 2025) === 5 && lajuCm(j, 1980) === 15);
  assert(turunMeter(j, 2011, 2011) === 0 && Math.abs(turunMeter(j, 2020, 2025) - .25) < 1e-9 && turunMeter(j, 2011, 2020) > turunMeter(j, 2011, 2015));
  const t = turunkan(Float32Array.from([1, 3, 5, 7, 2, 4, 6, 8, 9]), 3, 3, 2, -9999); assert(t.nx === 1 && t.ny === 1 && t.z[0] === 3.25);
  const t2 = turunkan(Float32Array.from([1, -9999, 3, 5]), 2, 2, 2, -9999); assert(t2.z[0] === 3);
  const q = debitJam([10, 20, 30], 0, 48); assert(q[0] === 10 && Math.abs(q[12] - 10) < 1e-9 && Math.abs(q[24] - 15) < 1e-9 && Math.abs(q[36] - 20) < 1e-9 && q[48] === 25, Array.from(q));
  assert(persentil([5, 1, 3], .5) === 3 && persentil([], .5) === null);
  const g = {features: [{properties: {kab: "A", kec: "x"}, geometry: {type: "Polygon", coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]}}]};
  const r = rasterKec(g, 4, 1, i => i * .7 + .1, () => 1); assert(Array.from(r.kec).join() === "0,0,0,-1", Array.from(r.kec).join());
  /* J2.5 */
  const ga = garisAlur4([[0.2, 0.2], [3.7, 2.1]], 5, 4); for (let q = 1; q < ga.length; q++) assert(Math.abs(ga[q] % 5 - ga[q - 1] % 5) + Math.abs(((ga[q] / 5) | 0) - ((ga[q - 1] / 5) | 0)) <= 1, "4-tersambung " + ga);
  assert(ga[0] === 0 && ga[ga.length - 1] === 2 * 5 + 3, ga.join());
  assert(garisAlur4([[-5, -5], [-4, -4]], 3, 3).length === 0);
  /* alur 1x5, dasar dari kiri 0 -> naik turun; hilir di kanan (tepi): sesudah monoton tak ada dasar di hulu lebih rendah dari hilir */
  { const nx = 5, ny = 1, bed = Float64Array.from([5, 1, 6, 3, 2]), alur = new Uint8Array(5).fill(1), p = profilMonoton(bed, alur, nx, ny, new Uint8Array(5));
    assert(p.komponenBuntu === 0 && bed.join() === "5,1,6,3,2", bed.join()); } /* tepi kiri & kanan jadi benih: tiap sel punya jalur turun ke tepi */
  { const bed = Float64Array.from([3, 2, 4, 1]), alur = new Uint8Array(4).fill(1), laut = Uint8Array.from([0, 0, 0, 0]);
    /* 1x4 di tepi kiri/kanan: benih di kedua ujung (tepi); dasar [3,2,4,1] tidak berubah karena tiap sel punya jalur turun ke tepi */
    profilMonoton(bed, alur, 4, 1, laut); assert(bed.join() === "3,2,4,1", bed.join()); }
  { const nx = 5, ny = 3, alur = new Uint8Array(15), bed = new Float64Array(15).fill(9); for (const k of [6, 7, 8]) { alur[k] = 1; } bed[6] = 2; bed[7] = 0; bed[8] = 3; /* komponen buntu: tak menyentuh tepi */
    const p = profilMonoton(bed, alur, nx, ny, new Uint8Array(15)); assert(p.komponenBuntu === 1 && bed[7] === 0 && bed[6] > 0 && bed[8] > 0, JSON.stringify(p) + [bed[6], bed[7], bed[8]]); }
  { const laut = Uint8Array.from([1, 0, 0, 0, 0, 0]), alur = Uint8Array.from([0, 0, 0, 0, 1, 0]); /* 3x2: laut (0,0); alur (1,1) */
    const m = pesisir(laut, alur, 3, 2); assert(Array.from(m).join() === "0,1,0,1,0,0", Array.from(m).join()); }
  { const w = Array.from({length: 48}, (_, k) => `2020-01-0${1 + (k / 24 | 0)}T${String(k % 24).padStart(2, "0")}:00`), mm = new Array(48).fill(0); mm[3] = 2; mm[5] = 6;
    const r = disagregasi(mm, w, {"2020-01-01": 40}); assert(Math.abs(r.mm.slice(0, 24).reduce((a, b) => a + b) - 40) < 1e-9 && r.mm[5] === 30 && r.mm[3] === 10 && r.diganti === 1);
    const r2 = disagregasi(mm, w, {"2020-01-02": 24}); assert(r2.mm[24] === 1 && r2.tanpaBentuk === 1 && r2.mm[5] === 6); }
  { const f = [0, 10, 20, 30]; /* 2x2, lons 0,1 lats 0,1: f[j*2+i] */
    assert(bilinear(f, [0, 1], [0, 1], .5, .5) === 15 && bilinear(f, [0, 1], [0, 1], 0, 0) === 0 && bilinear([null, 10, 20, 30], [0, 1], [0, 1], .5, .5) === 20); }
  console.log("ok");
}

/* ---------- jalan ---------- */
function argumen() {
  const a = {kejadian: "2020-01", mulai: "2019-12-30", jam: 96, faktor: 4, hujan: "ifs", bentuk: "ifs", cn: 80, kd: 10, muka: .6, rentang: 1, skalaSubsiden: 1, hulu: true, alur: true, tanggul: TANGGUL_M, skalaHulu: 1, radiusHuluKm: 8, kotak: null, keluar: null};
  const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) { const k = v[i];
    if (k === "--tanpa-hulu") a.hulu = false;
    else if (k === "--siap") a.siap = true;
    else if (k === "--tanpa-alur") a.alur = false;
    else if (k === "--tanpa-tanggul") a.tanggul = null;
    else if (k === "--tanggul") a.tanggul = +v[++i];
    else if (k === "--skala-hulu") a.skalaHulu = +v[++i];
    else if (k === "--radius-hulu-km") a.radiusHuluKm = +v[++i];
    else if (k === "--kotak") a.kotak = v[++i].split(",").map(Number);
    else if (k === "--skala-subsiden") a.skalaSubsiden = +v[++i];
    else if (k === "--keluar") a.keluar = v[++i];
    else if (["--kejadian", "--mulai", "--hujan", "--bentuk"].includes(k)) a[k.slice(2)] = v[++i];
    else if (["--jam", "--faktor", "--cn", "--kd", "--muka", "--rentang"].includes(k)) a[k.slice(2)] = +v[++i];
    else throw new Error("argumen tidak dikenal: " + k); }
  return a;
}

function muatMesin() {
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(P("public/banjir/sim_genangan.js"), "utf8"), ctx);
  return ctx.SimGenangan;
}

async function jalan() {
  const a = argumen(), SG = muatMesin(), t0 = Date.now(), log = (...x) => console.error(`[${((Date.now() - t0) / 1000).toFixed(0)} dtk]`, ...x);
  const meta = JSON.parse(fs.readFileSync(path.join(MEDAN, "demnas_kotak.json"), "utf8"));
  const mentah = new Float32Array(zlib.gunzipSync(fs.readFileSync(path.join(MEDAN, "demnas_kotak.f32.gz"))).buffer.slice(0));
  (mentah.length === meta.kolom * meta.baris) || (() => { throw new Error("ukuran DEM tidak cocok dengan json"); })();
  /* potong kotak (opsional) sebelum diturunkan */
  let kol0 = 0, bar0 = 0, kol = meta.kolom, bar = meta.baris, z8 = mentah;
  if (a.kotak) { const [lo0, la0, lo1, la1] = a.kotak;
    kol0 = Math.max(0, Math.floor((lo0 - meta.x0) / meta.dx)); const kol1 = Math.min(meta.kolom, Math.ceil((lo1 - meta.x0) / meta.dx));
    bar0 = Math.max(0, Math.floor((meta.y0 - la1) / meta.dy)); const bar1 = Math.min(meta.baris, Math.ceil((meta.y0 - la0) / meta.dy));
    kol = kol1 - kol0; bar = bar1 - bar0; z8 = new Float32Array(kol * bar);
    for (let j = 0; j < bar; j++) z8.set(mentah.subarray((bar0 + j) * meta.kolom + kol0, (bar0 + j) * meta.kolom + kol0 + kol), j * kol); }
  const d = turunkan(z8, kol, bar, a.faktor, meta.nodata), nx = d.nx, ny = d.ny, N = nx * ny;
  const lonSel = i => meta.x0 + (kol0 + (i + .5) * a.faktor) * meta.dx, latSel = j => meta.y0 - (bar0 + (j + .5) * a.faktor) * meta.dy;
  const lat0 = latSel(ny >> 1), dxm = a.faktor * meta.dx * 111320 * Math.cos(lat0 * Math.PI / 180), dym = a.faktor * meta.dy * 110574;
  if (Math.abs(dxm / dym - 1) > .01) throw new Error(`sel tidak persegi: ${dxm} x ${dym}`);
  const dx = (dxm + dym) / 2;
  log(`DEM ${nx} x ${ny} = ${N} sel, dx ${dx.toFixed(1)} m`);

  /* laut dari DEM 2011 (garis pantai tahun DEM; sel darat yang turun di bawah 0 tetap darat, seperti polder), subsidensi hanya di darat */
  const laut = SG.topengLaut(d.z, nx, ny);
  const lit = JSON.parse(fs.readFileSync(P("public/banjir/data/subsiden_literatur.json"), "utf8")).kota.jakarta.sumber;
  const tahun = +a.kejadian.slice(0, 4), turun = turunMeter(jangkarSubsiden(lit), TAHUN_DEM, tahun) * a.skalaSubsiden;
  const z0 = Float64Array.from(d.z); for (let k = 0; k < N; k++) if (!laut[k]) z0[k] -= turun;
  const info = {};
  /* alur OSM: kelas, nama, sel 4-tersambung */
  const alurKelas = new Uint8Array(N), dalamKelas = new Float64Array(N), nAlur = new Float64Array(N), sungaiSel = []; /* sungaiSel: {nama, kelas, sel[]} */
  if (a.alur) {
    const osm = JSON.parse(fs.readFileSync(P("data/raw/banjir/genangan/saluran_osm.json"), "utf8")), urut = {river: 3, canal: 2, drain: 1}, kelasDari = [null, "drain", "canal", "river"];
    const fi = lon => (lon - lonSel(0)) / (a.faktor * meta.dx), fj = lat => (latSel(0) - lat) / (a.faktor * meta.dy);
    const r = {river: Math.floor((Math.max(1, Math.round(ALUR.river.lebar / dx)) - 1) / 2), canal: Math.floor((Math.max(1, Math.round(ALUR.canal.lebar / dx)) - 1) / 2), drain: Math.floor((Math.max(1, Math.round(ALUR.drain.lebar / dx)) - 1) / 2)};
    for (const e of osm.elements) { const w = e.tags && e.tags.waterway, kl = urut[w]; if (!kl || !e.geometry) continue;
      const sel = garisAlur4(e.geometry.map(p => [fi(p.lon), fj(p.lat)]), nx, ny); if (!sel.length) continue;
      const tebal = r[w], mk = [];
      for (const k of sel) { mk.push(k); if (tebal > 0) { const i0 = k % nx, j0 = (k / nx) | 0;
        for (let dj = -tebal; dj <= tebal; dj++) for (let di2 = -tebal; di2 <= tebal; di2++) { const i = i0 + di2, j = j0 + dj; if (i >= 0 && j >= 0 && i < nx && j < ny && Math.abs(di2) + Math.abs(dj) <= tebal) mk.push(j * nx + i); } } }
      for (const k of mk) { if (laut[k]) continue; if (kl > alurKelas[k]) alurKelas[k] = kl; }
      if (e.tags.name) sungaiSel.push({nama: e.tags.name, kelas: w, sel: sel.filter(k => !laut[k])}); }
    for (let k = 0; k < N; k++) if (alurKelas[k]) { const w = kelasDari[alurKelas[k]]; dalamKelas[k] = ALUR[w].dalam; nAlur[k] = ALUR[w].n; }
    info.sel_alur = {river: 0, canal: 0, drain: 0}; for (let k = 0; k < N; k++) if (alurKelas[k]) info.sel_alur[kelasDari[alurKelas[k]]]++;
  }
  const alur = Uint8Array.from(alurKelas, v => v ? 1 : 0);
  /* tanggul pantai: sel darat bertetangga laut (bukan alur => muara terbuka) naik ke puncak tanggul; sesudah subsidensi (dibangun di elevasi tahun kejadian) */
  let nTanggul = 0;
  if (a.tanggul != null) { const m = pesisir(laut, alur, nx, ny); for (let k = 0; k < N; k++) if (m[k]) { nTanggul++; if (z0[k] < a.tanggul) z0[k] = a.tanggul; } }
  const zTepi = Float64Array.from(z0); /* tinggi tepi sebelum dibakar */
  if (a.alur) { const bed = Float64Array.from(z0); for (let k = 0; k < N; k++) if (alur[k]) bed[k] = z0[k] - dalamKelas[k];
    info.profil = profilMonoton(bed, alur, nx, ny, laut); for (let k = 0; k < N; k++) if (alur[k]) z0[k] = bed[k]; }
  const benih = SG.benihTepi(nx, ny, laut), z = SG.siapkanDEM(z0, nx, ny, benih);
  let nLaut = 0, isi = 0; for (let k = 0; k < N; k++) { if (laut[k]) nLaut++; if (z[k] > z0[k] + 1e-9) isi++; }
  const dalamAlur = new Float64Array(N); /* isi alur di bawah tepi (m): kedalaman keluaran sel alur = muka air di atas tepi */
  for (let k = 0; k < N; k++) if (alur[k]) dalamAlur[k] = Math.max(0, zTepi[k] - z[k]);
  log(`subsidensi ${turun.toFixed(3)} m (2011 -> ${tahun}); sel laut ${nLaut}, sel cekungan diangkat ${isi}; sel alur ${JSON.stringify(info.sel_alur || 0)}, tanggul ${nTanggul} sel (${a.tanggul} m), profil ${JSON.stringify(info.profil || {})}`);

  /* kecamatan */
  const {kec, nama} = rasterKec(JSON.parse(fs.readFileSync(P("public/geo/kecamatan/31.json"), "utf8")), nx, ny, lonSel, latSel);
  if (a.siap) { const c = {}; for (let k = 0; k < N; k++) if (laut[k]) { const n = kec[k] < 0 ? "(luar DKI)" : nama[kec[k]]; c[n] = (c[n] || 0) + 1; }
    console.log(JSON.stringify({nLaut, per_kec: c, rata_z_sel_darat_dki: null}, null, 1)); return; }
  const kdKec = nama.map(() => a.kd), kd = new Float64Array(N); for (let k = 0; k < N; k++) kd[k] = laut[k] || alur[k] ? 0 : (kec[k] >= 0 ? kdKec[kec[k]] : a.kd);

  /* hujan: sel hujan terdekat per sel DEM -> kelas; SCS-CN harian. Sumber: ifs | era5 (jam langsung) | gsmap_dis (total harian GSMaP x bentuk jam model --bentuk) */
  const KUNCI = {ifs: "ecmwf_ifs", ecmwf_ifs: "ecmwf_ifs", era5: "era5"}, hj = JSON.parse(fs.readFileSync(P("data/raw/banjir/genangan/hujan_jam", a.kejadian + ".json"), "utf8"));
  const kunciModel = a.hujan === "gsmap_dis" ? KUNCI[a.bentuk] : KUNCI[a.hujan]; if (!kunciModel) throw new Error(`--hujan ${a.hujan} tidak dikenal (ifs|era5|gsmap_dis)`);
  let sh = hj[kunciModel]; if (!sh) throw new Error(`model hujan ${kunciModel} tidak ada`);
  if (sh.every(s => s.mm.every(x => x == null))) throw new Error(`model hujan ${kunciModel} kosong semua (null)`);
  let infoHujan = {sumber: a.hujan, model: kunciModel};
  if (a.hujan === "gsmap_dis") {
    const gs = JSON.parse(fs.readFileSync(P("data/banjir/genangan/gsmap_harian.json"), "utf8")), gl = gs.meta.grid; let ganti = 0, tanpa = 0;
    sh = sh.map(s => { const total = {}; for (const [tgl, f] of Object.entries(gs.hari)) { const v = bilinear(f, gl.lon, gl.lat, s.lon, s.lat); if (v != null) total[tgl] = v; }
      const r = disagregasi(s.mm, s.waktu, total); ganti = Math.max(ganti, r.diganti); tanpa += r.tanpaBentuk; return {...s, mm: r.mm}; });
    if (!ganti) throw new Error(`GSMaP harian tidak mencakup ${a.kejadian} (hari tersedia ${Object.keys(gs.hari)[0]}..${Object.keys(gs.hari).at(-1)})`);
    infoHujan = {...infoHujan, hari_diganti: ganti, hari_model_kering_diratakan: tanpa, produk: [...new Set(Object.values(gs.produk))]};
  }
  const lats = [...new Set(sh.map(s => s.lat))].sort((p, q) => p - q), lons = [...new Set(sh.map(s => s.lon))].sort((p, q) => p - q);
  const idx = sh.map(s => lats.indexOf(s.lat) * lons.length + lons.indexOf(s.lon)), serieKisi = []; idx.forEach((q, i) => serieKisi[q] = sh[i]);
  const o = serieKisi[0].waktu.indexOf(a.mulai + "T00:00"); if (o < 0) throw new Error("mulai di luar jendela hujan");
  const J = a.jam, ant = serieKisi.map(s => s.mm.slice(Math.max(0, o - 168), o).reduce((x, y) => x + (y || 0), 0));
  const seri = serieKisi.map((s, c) => SG.limpasanHarian(Float64Array.from(s.mm.slice(o, o + J), x => x || 0), a.cn, ant[c]).efektif);
  const lain = serieKisi.map(s => s.mm.slice(o, o + J).reduce((x, y) => x + (y || 0), 0));
  if (seri.some(s => s.length < J)) throw new Error("hujan kurang dari jam simulasi");
  const kelas = new Uint8Array(N), near = (v, arr) => { let b = 0; for (let i = 1; i < arr.length; i++) if (Math.abs(arr[i] - v) < Math.abs(arr[b] - v)) b = i; return b; };
  for (let j = 0; j < ny; j++) { const lj = near(latSel(j), lats); for (let i = 0; i < nx; i++) kelas[j * nx + i] = lj * lons.length + near(lonSel(i), lons); }

  /* hulu: dedup per sel GloFAS (Krukut=Pesanggrahan, Bekasi=Sunter berbagi sel), hanya yang di dalam kotak. Disuntik di sel ALUR bernama sama (OSM) terdekat dari
     titik snap (<= radiusHuluKm). Tanpa alur (--tanpa-alur) atau tanpa alur bernama: dilewati, dicatat. ASUMSI skala: Q GloFAS di titik snap = seluruh debit sungai
     di titik itu (skala 1 x --skala-hulu); fraksi luas DAS di dalam kotak TIDAK dihitung (luas DAS tak ada di repo). Bila titik B terletak di hilir titik A pada alur yang
     sama, B menyuntik max(0, Q_B - sum Q anak) supaya total di B tetap Q_B (tak dihitung ganda). */
  const masuk = [], hulu = JSON.parse(fs.readFileSync(P("public/banjir/data/genangan/hulu.json"), "utf8")), dipakai = new Set(), catatHulu = [], calon = [];
  const tglQ = new Date(a.mulai + "T00:00:00+07:00").getTime();
  if (a.hulu) for (const [n, t] of Object.entries(hulu.titik)) {
    const ev = t.kejadian[a.kejadian], kunci = t.snap.join(","); if (!ev) { catatHulu.push({nama: n, dilewati: "tanpa seri kejadian"}); continue; }
    if (dipakai.has(kunci)) { catatHulu.push({nama: n, dilewati: "sel GloFAS sama dengan titik lain"}); continue; }
    const ci = (t.snap[1] - lonSel(0)) / (a.faktor * meta.dx), cj = (latSel(0) - t.snap[0]) / (a.faktor * meta.dy);
    if (ci < 0 || cj < 0 || ci >= nx || cj >= ny) { catatHulu.push({nama: n, dilewati: "di luar kotak DEM", snap: t.snap}); continue; }
    const nm = NAMA_ALUR[n] || new RegExp(n, "i"); let b = -1, bd = Infinity;
    for (const s of sungaiSel) if (nm.test(s.nama)) for (const k of s.sel) { if (!alur[k]) continue; const dd = Math.hypot(k % nx - ci, ((k / nx) | 0) - cj) * dx; if (dd < bd) { bd = dd; b = k; } }
    if (b < 0 || bd > a.radiusHuluKm * 1000) { catatHulu.push({nama: n, dilewati: b < 0 ? "tidak ada alur OSM bernama sama" : `alur bernama terdekat ${(bd / 1000).toFixed(1)} km > ${a.radiusHuluKm} km`}); continue; }
    dipakai.add(kunci);
    const off = Math.round((new Date(ev.mulai + "T00:00:00+07:00").getTime() - tglQ) / 3.6e6), q = debitJam(ev.q, -off, J).map(v => v * a.skalaHulu);
    calon.push({nama: n, k: b, q, jarak_snap_m: Math.round(bd)});
  }
  /* hilir tiap calon: ikuti dasar menurun lewat sel alur sampai calon lain / laut / tepi */
  const hilir = k0 => { let c = k0, ct = new Set([c]); for (let s = 0; s < N; s++) { const i = c % nx, j = (c / nx) | 0; let nb = -1;
      for (const n of [i > 0 && c - 1, i < nx - 1 && c + 1, j > 0 && c - nx, j < ny - 1 && c + nx]) if (n !== false && alur[n] && !ct.has(n) && z[n] < z[c] - 1e-12 && (nb < 0 || z[n] < z[nb])) nb = n;
      if (nb < 0) return -1; c = nb; ct.add(c); const m = calon.find(x => x.k === c); if (m) return m; } return -1; };
  for (const c of calon) c.induk = hilir(c.k);
  for (const c of calon) { const anak = calon.filter(x => x.induk === c), q = c.q.map((v, t) => Math.max(0, v - anak.reduce((s, x) => s + x.q[t], 0)));
    masuk.push({k: c.k, q}); catatHulu.push({nama: c.nama, sel: [c.k % nx, (c.k / nx) | 0], jarak_snap_m: c.jarak_snap_m, z_dasar_m: +z0[c.k].toFixed(2), q_glofas_rata: +(c.q.reduce((x, y) => x + y, 0) / c.q.length).toFixed(1),
      q_suntik_rata: +(q.reduce((x, y) => x + y, 0) / q.length).toFixed(1), q_suntik_maks: +Math.max(...q).toFixed(1), di_hilir_titik: c.induk ? c.induk.nama : null}); }

  const pasang = SG.pasang(Array(Math.ceil(J / 24) + 1).fill(a.muka), a.rentang);
  log(`jalankan: ${J} jam, ${masuk.length} masukan hulu, hujan ${a.hujan}/${kunciModel} (jumlah ${Math.min(...lain).toFixed(0)}..${Math.max(...lain).toFixed(0)} mm), kd ${a.kd} mm/jam`);
  const manning = new Float64Array(N); for (let k = 0; k < N; k++) manning[k] = nAlur[k] || SG.ASUMSI.MANNING;
  const hasil = SG.jalankan({nx, ny, dx, z, laut, muka: pasang, jam: J, hujanKelas: seri, kelas, masuk, kd, manning},
    p => { if (Math.round(p * J) % 12 === 0) log(`  ${(p * 100).toFixed(0)}%`); });
  const waktuJalan = (Date.now() - t0) / 1000; log(`selesai: ${hasil.langkah} langkah`);

  /* ---------- keluaran per kecamatan ---------- */
  const A = dx * dx, nK = nama.length, hm = Float32Array.from(hasil.hmaks, (v, k) => Math.max(0, v - dalamAlur[k])), jamGe = new Uint8Array(N), TG = SG.ASUMSI.TERGENANG;
  for (let t = 1; t <= J; t++) { const off = t * N; for (let k = 0; k < N; k++) if (hasil.kedalaman[off + k] - dalamAlur[k] >= TG) jamGe[k]++; }
  const volKelas = seri.map(s => s.reduce((x, y) => x + y, 0) / 1000 * A), akhir = J * N;
  const per = nama.map(() => ({nSel: 0, h: [], wet: 0, jamBasah: [], hujan: 0, sungai: 0, drain: 0, sisa: 0}));
  for (let k = 0; k < N; k++) { const c = kec[k]; if (c < 0 || laut[k]) continue; const p = per[c];
    p.nSel++; p.h.push(hm[k]); p.hujan += volKelas[kelas[k]]; p.drain += hasil.drainSel[k]; p.sisa += hasil.kedalaman[akhir + k] * A;
    if (hm[k] >= TG) { p.wet++; p.jamBasah.push(jamGe[k]); } }
  for (const m of masuk) { const c = kec[m.k]; if (c >= 0) per[c].sungai += m.q.reduce((s, v, t) => s + (t < J ? (v + m.q[t + 1]) / 2 * 3600 : 0), 0); }
  const kecamatan = nama.map((n, c) => { const p = per[c], [kab, nm] = n.split("|"), r = x => Math.round(x);
    const keluarNeto = p.hujan + p.sungai - p.drain - p.sisa; /* sisanya = lateral neto ke luar kecamatan (tetangga, tepi kisi, laut) */
    return {kab, kec: nm, sel: p.nSel, luas_km2: +(p.nSel * A / 1e6).toFixed(2),
      kedalaman_puncak_m: {p50: +(persentil(p.h, .5) ?? 0).toFixed(3), p90: +(persentil(p.h, .9) ?? 0).toFixed(3), maks: +(p.h.length ? Math.max(...p.h) : 0).toFixed(2)},
      luas_basah_ge10cm_km2: +(p.wet * A / 1e6).toFixed(2), persen_basah: p.nSel ? +(p.wet / p.nSel * 100).toFixed(1) : 0,
      jam_di_atas_10cm: {p50_sel_basah: persentil(p.jamBasah, .5), p90_sel_basah: persentil(p.jamBasah, .9), maks: p.jamBasah.length ? Math.max(...p.jamBasah) : 0},
      neraca_m3: {hujan: r(p.hujan), sungai: r(p.sungai), drainase: r(p.drain), sisa_genangan: r(p.sisa), lateral_neto_keluar: r(keluarNeto)}}; }).filter(x => x.sel > 0);
  const semua = []; for (let k = 0; k < N; k++) if (!laut[k]) semua.push(hm[k]);
  const sebaran = {sel_darat: semua.length, p50: persentil(semua, .5), p90: persentil(semua, .9), p99: persentil(semua, .99), maks: persentil(semua, 1) ?? 0};
  for (const [n, b] of [["ge10cm", .1], ["ge50cm", .5], ["ge100cm", 1], ["ge200cm", 2]]) sebaran["persen_" + n] = +(semua.filter(v => v >= b).length / semua.length * 100).toFixed(2);
  const n = hasil.neraca;
  const keluar = {
    dibuat: new Date().toISOString(), kejadian: a.kejadian,
    parameter: {...a, dx_m: +dx.toFixed(2), nx, ny, tahun_dem: TAHUN_DEM, subsidensi_m: +turun.toFixed(3), kalibrasi: "TIDAK. Semua angka placeholder (J2.5).",
      alur_param: a.alur ? ALUR : null, sel_alur: info.sel_alur || null, profil_alur: info.profil || null, sel_tanggul: nTanggul, hujan_info: infoHujan,
      catatan: ["Hujan: " + JSON.stringify(infoHujan) + "; belum dikoreksi bias. ERA5-Land kosong untuk Jakarta (precipitation null), dipakai era5 0,25 derajat.", "CN seragam, belum dari tutupan lahan.",
        "Alur OSM river/canal/drain dibakar ke DEM (kedalaman/lebar/n di alur_param, ASUMSI); kedalaman keluaran di sel alur = muka air di atas tepi. Aliran/luapan sungai tetap v1 (alur satu sel).",
        "Hulu GloFAS disuntik di sel alur bernama sama terdekat dari titik snap; skala 1 x skala_hulu (fraksi DAS tak dihitung, luas DAS tak ada di repo); titik di hilir titik lain hanya menyuntik selisihnya.",
        "Tanggul pantai: sel darat bertetangga laut dinaikkan ke " + a.tanggul + " m MSL (ASUMSI NCICD/tanggul pantai), kecuali sel alur (muara terbuka, muka laut batas). Garis pantai dari DEM 2011.",
        "Subsidensi seragam v1: nilai tengah literatur bila ada (Abidin 15 cm/thn), jika tidak maksimum (Sidiq 5 cm/thn = MAKS kota, batas atas); Jakarta Selatan/Timur terlalu rendah."]},
    waktu_jalan_dtk: +waktuJalan.toFixed(1), langkah: hasil.langkah,
    neraca_global_m3: {masuk: Math.round(n.masuk), keluar: Math.round(n.keluar), sisa: Math.round(n.simpan), hujan: Math.round(n.hujan), sungai: Math.round(n.sungai),
      drainase: Math.round(n.drain), tepi: Math.round(n.tepi), laut_masuk: Math.round(n.lautMasuk), laut_keluar: Math.round(n.lautKeluar), koreksi_negatif: Math.round(n.koreksi), galat_persen: +(n.galat * 100).toFixed(4)},
    sebaran_kedalaman_puncak_m: sebaran, hulu: catatHulu, kecamatan};
  const jalur = a.keluar || P("data/raw/banjir/genangan/mesin", `${a.kejadian}.json`); fs.mkdirSync(path.dirname(jalur), {recursive: true});
  fs.writeFileSync(jalur, JSON.stringify(keluar)); log("ditulis " + path.relative(AKAR, jalur));
  const p90 = c => c.kedalaman_puncak_m.p90, mentengs = kecamatan.find(x => x.kec === "Menteng");
  const top5 = [...kecamatan].sort((x, y) => p90(y) - p90(x) || y.luas_basah_ge10cm_km2 - x.luas_basah_ge10cm_km2).slice(0, 5).map(c => ({kab: c.kab, kec: c.kec, p90: p90(c), maks: c.kedalaman_puncak_m.maks, basah_km2: c.luas_basah_ge10cm_km2, persen_basah: c.persen_basah}));
  console.log(JSON.stringify({menteng_p90: mentengs && p90(mentengs), top5_p90: top5, waktu_jalan_dtk: keluar.waktu_jalan_dtk, langkah: keluar.langkah, neraca_global_m3: keluar.neraca_global_m3, sebaran: sebaran, hulu: catatHulu}, null, 1));
}

if (process.argv[2] === "uji") uji(); else await jalan();
