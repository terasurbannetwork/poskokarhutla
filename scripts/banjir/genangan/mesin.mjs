/* J2 mesin genangan Jakarta, headless di Node (RANCANGAN-GENANGAN-JAKARTA.md §5.1): memuat public/banjir/sim_genangan.js lewat vm
   (pola tests/banjir/sim_genangan.test.mjs), menjalankan SATU kejadian di DEM DEMNAS yang diturunkan ke ~30 m.
   Pakai:  node scripts/banjir/genangan/mesin.mjs [--kejadian 2020-01] [--mulai 2019-12-30] [--jam 96] [--faktor 4]
           [--hujan ecmwf_ifs|era5_land] [--cn 80] [--kd 10] [--muka 0.6] [--rentang 1] [--skala-subsiden 1] [--tanpa-hulu]
           [--kotak lon0,lat0,lon1,lat1] [--keluar berkas.json]       node ... uji   (swa-uji helper)
   Masukan : DEM data/raw/banjir/genangan/medan/demnas_kotak.f32.gz (+json); hujan jam hujan_jam/<kejadian>.json (kisi 0,1 derajat,
             tiap sel DEM memakai sel hujan terdekat, SCS-CN harian limpasanHarian); Kd per kecamatan (seragam dulu); debit hulu GloFAS
             (public/.../hulu.json) disuntik di sel akumulasi aliran D8 terbesar (alur utama) dalam 2,5 km dari titik snap; laut = sel <= 0 m tersambung ke tepi pada DEM 2011,
             muka laut tetap skenario (--muka maks harian, --rentang tunggang); subsidensi DEM 2011 -> tahun kejadian.
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
  console.log("ok");
}

/* ---------- jalan ---------- */
function argumen() {
  const a = {kejadian: "2020-01", mulai: "2019-12-30", jam: 96, faktor: 4, hujan: "ecmwf_ifs", cn: 80, kd: 10, muka: .6, rentang: 1, skalaSubsiden: 1, hulu: true, kotak: null, keluar: null};
  const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) { const k = v[i];
    if (k === "--tanpa-hulu") a.hulu = false;
    else if (k === "--siap") a.siap = true;
    else if (k === "--kotak") a.kotak = v[++i].split(",").map(Number);
    else if (k === "--skala-subsiden") a.skalaSubsiden = +v[++i];
    else if (k === "--keluar") a.keluar = v[++i];
    else if (["--kejadian", "--mulai", "--hujan"].includes(k)) a[k.slice(2)] = v[++i];
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
  const benih = SG.benihTepi(nx, ny, laut), z = SG.siapkanDEM(z0, nx, ny, benih);
  let nLaut = 0, isi = 0; for (let k = 0; k < N; k++) { if (laut[k]) nLaut++; if (z[k] > z0[k] + 1e-9) isi++; }
  log(`subsidensi ${turun.toFixed(3)} m (2011 -> ${tahun}); sel laut ${nLaut}, sel cekungan diangkat ${isi}`);

  /* kecamatan */
  const {kec, nama} = rasterKec(JSON.parse(fs.readFileSync(P("public/geo/kecamatan/31.json"), "utf8")), nx, ny, lonSel, latSel);
  if (a.siap) { const c = {}; for (let k = 0; k < N; k++) if (laut[k]) { const n = kec[k] < 0 ? "(luar DKI)" : nama[kec[k]]; c[n] = (c[n] || 0) + 1; }
    console.log(JSON.stringify({nLaut, per_kec: c, rata_z_sel_darat_dki: null}, null, 1)); return; }
  const kdKec = nama.map(() => a.kd), kd = new Float64Array(N); for (let k = 0; k < N; k++) kd[k] = laut[k] ? 0 : (kec[k] >= 0 ? kdKec[kec[k]] : a.kd);

  /* hujan: sel hujan terdekat per sel DEM -> kelas; SCS-CN harian */
  const hj = JSON.parse(fs.readFileSync(P("data/raw/banjir/genangan/hujan_jam", a.kejadian + ".json"), "utf8")), sh = hj[a.hujan];
  if (!sh) throw new Error(`model hujan ${a.hujan} tidak ada`);
  const lats = [...new Set(sh.map(s => s.lat))].sort((p, q) => p - q), lons = [...new Set(sh.map(s => s.lon))].sort((p, q) => p - q);
  const idx = sh.map(s => lats.indexOf(s.lat) * lons.length + lons.indexOf(s.lon)), serieKisi = []; idx.forEach((q, i) => serieKisi[q] = sh[i]);
  const o = serieKisi[0].waktu.indexOf(a.mulai + "T00:00"); if (o < 0) throw new Error("mulai di luar jendela hujan");
  const J = a.jam, ant = serieKisi.map(s => s.mm.slice(Math.max(0, o - 168), o).reduce((x, y) => x + (y || 0), 0));
  const seri = serieKisi.map((s, c) => SG.limpasanHarian(Float64Array.from(s.mm.slice(o, o + J), x => x || 0), a.cn, ant[c]).efektif);
  const lain = serieKisi.map(s => s.mm.slice(o, o + J).reduce((x, y) => x + (y || 0), 0));
  if (seri.some(s => s.length < J)) throw new Error("hujan kurang dari jam simulasi");
  const kelas = new Uint8Array(N), near = (v, arr) => { let b = 0; for (let i = 1; i < arr.length; i++) if (Math.abs(arr[i] - v) < Math.abs(arr[b] - v)) b = i; return b; };
  for (let j = 0; j < ny; j++) { const lj = near(latSel(j), lats); for (let i = 0; i < nx; i++) kelas[j * nx + i] = lj * lons.length + near(lonSel(i), lons); }

  /* hulu: dedup per sel GloFAS (Krukut=Pesanggrahan, Bekasi=Sunter berbagi sel), hanya yang di dalam kotak; sel akumulasi D8 terbesar dalam 2,5 km */
  let acc = null; const masuk = [], hulu = JSON.parse(fs.readFileSync(P("public/banjir/data/genangan/hulu.json"), "utf8")), dipakai = new Set(), catatHulu = [];
  const tglQ = new Date(a.mulai + "T00:00:00+07:00").getTime();
  if (a.hulu) for (const [n, t] of Object.entries(hulu.titik)) {
    const ev = t.kejadian[a.kejadian], kunci = t.snap.join(","); if (!ev) { catatHulu.push({nama: n, dilewati: "tanpa seri kejadian"}); continue; }
    if (dipakai.has(kunci)) { catatHulu.push({nama: n, dilewati: "sel GloFAS sama dengan titik lain"}); continue; } dipakai.add(kunci);
    const ci = Math.round((t.snap[1] - lonSel(0)) / (a.faktor * meta.dx)), cj = Math.round((latSel(0) - t.snap[0]) / (a.faktor * meta.dy));
    if (ci < 0 || cj < 0 || ci >= nx || cj >= ny) { catatHulu.push({nama: n, dilewati: "di luar kotak DEM", snap: t.snap}); continue; }
    if (!acc) { const f = SG.isiCekungan(z, nx, ny, benih); acc = SG.akumulasi(f, SG.arahD8(f, nx, ny, benih)); }
    const R = Math.round(2500 / dx); let b = -1;
    for (let j = Math.max(0, cj - R); j <= Math.min(ny - 1, cj + R); j++) for (let i = Math.max(0, ci - R); i <= Math.min(nx - 1, ci + R); i++) { const k = j * nx + i; if (!laut[k] && (b < 0 || acc[k] > acc[b])) b = k; }
    const off = Math.round((new Date(ev.mulai + "T00:00:00+07:00").getTime() - tglQ) / 3.6e6), q = debitJam(ev.q, -off, J);
    masuk.push({k: b, q}); catatHulu.push({nama: n, sel: [b % nx, (b / nx) | 0], z_m: +z0[b].toFixed(2), akumulasi_sel: acc[b], q_rata: +(q.reduce((x, y) => x + y, 0) / q.length).toFixed(1), q_maks: +Math.max(...q).toFixed(1)});
  }

  const pasang = SG.pasang(Array(Math.ceil(J / 24) + 1).fill(a.muka), a.rentang);
  log(`jalankan: ${J} jam, ${masuk.length} masukan hulu, hujan ${a.hujan} (jumlah ${Math.min(...lain).toFixed(0)}..${Math.max(...lain).toFixed(0)} mm), kd ${a.kd} mm/jam`);
  const hasil = SG.jalankan({nx, ny, dx, z, laut, muka: pasang, jam: J, hujanKelas: seri, kelas, masuk, kd},
    p => { if (Math.round(p * J) % 12 === 0) log(`  ${(p * 100).toFixed(0)}%`); });
  const waktuJalan = (Date.now() - t0) / 1000; log(`selesai: ${hasil.langkah} langkah`);

  /* ---------- keluaran per kecamatan ---------- */
  const A = dx * dx, nK = nama.length, hm = hasil.hmaks, jamGe = new Uint8Array(N), TG = SG.ASUMSI.TERGENANG;
  for (let t = 1; t <= J; t++) { const off = t * N; for (let k = 0; k < N; k++) if (hasil.kedalaman[off + k] >= TG) jamGe[k]++; }
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
    parameter: {...a, dx_m: +dx.toFixed(2), nx, ny, tahun_dem: TAHUN_DEM, subsidensi_m: +turun.toFixed(3), kalibrasi: "TIDAK. Semua angka placeholder (J2).",
      catatan: ["Hujan ECMWF IFS 0,1 derajat, belum dikoreksi bias; ERA5-Land kosong di arsip lokal (semua None).", "CN seragam, belum dari tutupan lahan.",
        "Kd seragam per kecamatan; sungai tanpa alur (DEM 33 m, luapan v2).", "Subsidensi seragam, jangkar literatur (lihat jangkarSubsiden)."]},
    waktu_jalan_dtk: +waktuJalan.toFixed(1), langkah: hasil.langkah,
    neraca_global_m3: {masuk: Math.round(n.masuk), keluar: Math.round(n.keluar), sisa: Math.round(n.simpan), hujan: Math.round(n.hujan), sungai: Math.round(n.sungai),
      drainase: Math.round(n.drain), tepi: Math.round(n.tepi), laut_masuk: Math.round(n.lautMasuk), laut_keluar: Math.round(n.lautKeluar), koreksi_negatif: Math.round(n.koreksi), galat_persen: +(n.galat * 100).toFixed(4)},
    sebaran_kedalaman_puncak_m: sebaran, hulu: catatHulu, kecamatan};
  const jalur = a.keluar || P("data/raw/banjir/genangan/mesin", `${a.kejadian}.json`); fs.mkdirSync(path.dirname(jalur), {recursive: true});
  fs.writeFileSync(jalur, JSON.stringify(keluar)); log("ditulis " + path.relative(AKAR, jalur));
  console.log(JSON.stringify({waktu_jalan_dtk: keluar.waktu_jalan_dtk, langkah: keluar.langkah, neraca_global_m3: keluar.neraca_global_m3, sebaran: sebaran, hulu: catatHulu}, null, 1));
}

if (process.argv[2] === "uji") uji(); else await jalan();
