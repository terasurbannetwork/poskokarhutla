/* Uji lapis tanggap dan peringkat perlakuan (public/banjir/sim_tanggap.js). Kisi kecil buatan; invarian (waktu tempuh = jarak / laju,
   jalan tergenang tertutup, kapasitas tak melebihi sasaran, urutan peringkat), bukan potret angka. */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(new URL("../../public/banjir/sim_tanggap.js", import.meta.url), "utf8"), ctx);
const ST = ctx.SimTanggap;
const nx = 30, ny = 30, N = nx * ny, dx = 100, J = 6;
/* koordinat dunia = sel itu sendiri (lon = i, lat = -j) supaya hitungan bisa dicek tangan */
const keSel = (lo, la) => [lo, -la], dariSel = (i, j) => [i, -j];
const jalanDatar = (j0 = 15) => { const g = [{p: [[0, -j0], [nx - 1, -j0]], k: "tertiary"}]; return ST.rasterJalan(g, keSel, nx, ny); };

test("jalan: laju kelas jalan masuk ke sel yang dilalui; waktu tempuh = jarak / laju", () => {
  const laju = jalanDatar(); assert.equal(laju[15 * nx + 7], 30); assert.equal(laju[14 * nx + 7], 0);
  const {v, air} = ST.kecepatan(laju, new Float32Array(N), new Uint8Array(N), "darat"), T = ST.waktuTempuh(nx, ny, dx, v, air, [{k: 15 * nx, t: 0}]);
  assert.ok(Math.abs(T[15 * nx + 10] - 10 * dx / 1000 / 30) < 1e-9, `10 sel x 100 m pada 30 km/jam = 2 menit, dapat ${T[15 * nx + 10] * 60} menit`);
  assert.equal(T[14 * nx + 10], Infinity, "di luar jalan, mode darat tidak bisa dilewati");
  const t0 = ST.waktuTempuh(nx, ny, dx, v, air, [{k: 15 * nx, t: 1.5}]); assert.ok(Math.abs(t0[15 * nx + 10] - T[15 * nx + 10] - 1.5) < 1e-9, "waktu awal pangkalan luar kotak ikut terhitung");
});

test("jalan tergenang >= 30 cm tertutup untuk kendaraan; mode terpadu tetap lewat tapi lebih lambat (arung/perahu)", () => {
  const laju = jalanDatar(), d = new Float32Array(N); for (let j = 0; j < ny; j++) for (let i = 10; i <= 14; i++) d[j * nx + i] = .8; /* sabuk banjir selebar kisi: tak ada jalan memutar */
  const dar = ST.kecepatan(laju, d, new Uint8Array(N), "darat"), Td = ST.waktuTempuh(nx, ny, dx, dar.v, dar.air, [{k: 15 * nx, t: 0}]);
  assert.equal(Td[15 * nx + 20], Infinity, "jalan satu-satunya terendam 80 cm: kendaraan terhenti");
  const tp = ST.kecepatan(laju, d, new Uint8Array(N), "terpadu"), Tt = ST.waktuTempuh(nx, ny, dx, tp.v, tp.air, [{k: 15 * nx, t: 0}]), kering = ST.kecepatan(laju, new Float32Array(N), new Uint8Array(N), "terpadu");
  const Tk = ST.waktuTempuh(nx, ny, dx, kering.v, kering.air, [{k: 15 * nx, t: 0}]);
  assert.ok(Number.isFinite(Tt[15 * nx + 20]) && Tt[15 * nx + 20] > Tk[15 * nx + 20], "perahu melewati banjir tapi lebih lambat dari jalan kering");
  assert.ok(Tt[15 * nx + 20] - Tk[15 * nx + 20] >= ST.ASUMSI.PASANG_PERAHU - 1e-9, "memasang perahu memakan waktu tetap");
});

function dunia(adaGenangan = true) {
  const laju = jalanDatar(), laut = new Uint8Array(N), z = new Float64Array(N), hmaks = new Float32Array(N), kedalaman = new Float32Array(N * (J + 1)), lo = new Float64Array(N), hi = new Float64Array(N);
  for (let k = 0; k < N; k++) { z[k] = 10 - (k % nx) * .2; } /* tanah naik ke barat */
  if (adaGenangan) for (let j = 8; j < 22; j++) for (let i = 16; i < 26; i++) { const k = j * nx + i; hmaks[k] = 1.2; lo[k] = 5; hi[k] = 15; for (let t = 2; t <= J; t++) kedalaman[t * N + k] = Math.min(1.2, .4 * (t - 1)); }
  return {nx, ny, dx, laut, laju, kedalaman, hmaks, z, J, pop: {lo, hi}, keSel, dariSel, poi: [{nama: "SDN 1", jenis: "school", lat: -15, lon: 3}], unit: [{nama: "Basarnas Dekat", jenis: "basarnas", lat: -15, lon: 1}, {nama: "BPBD Jauh", jenis: "bpbd", lat: -15, lon: -60}]};
}

test("analisisTanggap: unit dekat tiba lebih awal dari yang jauh; kapasitas tak melebihi sasaran; titik aman tidak pernah tergenang", () => {
  const c = dunia(), r = ST.analisisTanggap(c); assert.ok(r.ada && r.snapshot.length >= 1);
  for (const s of r.snapshot) {
    const dekat = s.unit.find(u => u.nama === "Basarnas Dekat"), jauh = s.unit.find(u => u.nama === "BPBD Jauh");
    assert.ok(Number.isFinite(dekat.tiba) && dekat.tiba >= 0, `unit dalam kotak harus tiba: ${dekat.tiba}`);
    assert.ok(jauh.luarKm > 50 && jauh.tiba > dekat.tiba, `unit luar kotak (${jauh.luarKm.toFixed(0)} km) harus tiba lebih lambat: ${jauh.tiba} vs ${dekat.tiba}`);
    assert.ok(s.aman && s.aman.nama === "SDN 1" && c.hmaks[s.aman.k] < .05, "titik aman = sekolah yang tak pernah tergenang");
    assert.ok(s.bagian >= 0 && s.bagian <= 1 && s.angkut >= 0, "bagian terangkut harus 0..1"); assert.ok(s.jiwa[0] <= s.jiwa[1] && s.jiwa[0] > 0);
    assert.ok(Number.isFinite(s.evak) && s.evak > 0, `waktu ke titik aman harus terbatas: ${s.evak}`);
  }
});

test("analisisTanggap: tanpa titik aman OSM jatuh ke tanah tinggi DEM; tanpa genangan berpenduduk = ada false", () => {
  const c = dunia(); c.poi = []; const r = ST.analisisTanggap(c); assert.equal(r.snapshot[0].aman.jenis, "dem", "tanah tinggi dipakai bila tak ada poi");
  const kosong = ST.analisisTanggap(dunia(false)); assert.equal(kosong.ada, false); assert.match(kosong.alasan, /tergenang/);
});

test("kandidatPerlakuan: busur tanggul di sisi tanah tinggi, pompa di sel basah berpenduduk, biaya rentang naik dengan tinggi; tanpa sasaran = kosong", () => {
  const c = dunia(), k = ST.kandidatPerlakuan({nx, ny, dx, hmaks: c.hmaks, pop: c.pop, laut: c.laut, z: c.z, sungaiK: -1, adaLaut: false});
  const ids = k.kandidat.map(x => x.id); assert.equal(ids.join(), "tanggul1,tanggul2,pompa05,pompa15,paket", "tanpa laut tidak ada kandidat pintu air");
  const t1 = k.kandidat[0], t2 = k.kandidat[1]; assert.ok(t2.biaya[0] > t1.biaya[0] * 3.9 && t2.biaya[1] > t2.biaya[0], "biaya tanggul naik dengan kuadrat tinggi dan berupa rentang");
  const barat = t1.tanggul[0].garis.reduce((s, p) => s + p[0], 0) / t1.tanggul[0].garis.length; assert.ok(barat < k.pusat[0], "tanah naik ke barat: tanggul di sisi barat pusat");
  const p = k.kandidat[2].pompa[0]; assert.ok(c.hmaks[p.k] > 0 && c.pop.hi[p.k] > 0, "pompa harus di sel yang basah dan berpenduduk");
  assert.ok(ST.kandidatPerlakuan({nx, ny, dx, hmaks: c.hmaks, pop: c.pop, laut: c.laut, z: c.z, sungaiK: -1, adaLaut: true}).kandidat.some(x => x.id === "pintu"));
  const none = ST.kandidatPerlakuan({nx, ny, dx, hmaks: dunia(false).hmaks, pop: dunia(false).pop, laut: c.laut, z: c.z, sungaiK: -1}); assert.equal(none.kandidat.length, 0); assert.ok(none.alasan);
});

test("evakuasiDini dan peringkat: warga lolos hanya bila tiba - mobilisasi >= perjalanan; urutan menurut jiwa terselamatkan; biaya per jiwa null bila tanpa manfaat", () => {
  const hm = Float32Array.from([1, 1, 0, 1]), pop = {lo: Float64Array.from([10, 10, 10, 10]), hi: Float64Array.from([20, 20, 20, 20])};
  const e = ST.evakuasiDini(hm, pop, [10, 3, 99, Infinity], [3, 3, 3, 3], 2, [.5, .5]);
  assert.deepEqual(Array.from(e.jiwa), [30, 60], "tiga sel >= 50 cm"); assert.equal(e.sel, 2, "sel 0 (tiba jam 10) dan sel 3 (air tak pernah 30 cm) lolos; sel 1 (3 - 2 < 3 jam jalan) tidak");
  assert.deepEqual(Array.from(e.diungsikan), [10, 20]);
  const r = ST.peringkat([100, 200], [{id: "a", nama: "A", biaya: [1e6, 3e6], berat: [90, 190]}, {id: "b", nama: "B", biaya: [1e7, 2e7], berat: [10, 20]}, {id: "c", nama: "C", biaya: [1e6, 1e6], berat: [100, 200]}]);
  assert.deepEqual(r.map(x => x.id), ["b", "a", "c"], "yang menyelamatkan paling banyak di atas"); assert.equal(r[2].rpPerJiwa, null, "tanpa manfaat tidak diberi biaya per jiwa");
  assert.ok(Math.abs(r[0].rpPerJiwa - 1.5e7 / 135) < 1e-6 && Math.abs(r[0].rumah[0] - 90 / ST.ASUMSI.JIWA_RUMAH) < 1e-9);
  assert.deepEqual(Array.from(ST.jiwaTerpapar(hm, pop, .5)), [30, 60]);
});

test("pilihAwal: kejadian aktif skor tertinggi dulu, kecamatan terparah di dalamnya; tanpa kejadian = status tertinggi; kosong = null", () => {
  const st = {"11|A|X": {b: [1, 1, 0, 0], h3: 50}, "11|A|Y": {b: [2, 3, 1, 0], h3: 90}, "12|B|Z": {b: [3, 3, 3, 3], h3: 200}, "13|C|W": {b: [3, 2, 0, 0], h3: 220}};
  const kej = [{kode: "B1", skor: 40, kec: ["11|A|X"], sejak: "2026-10-18"}, {kode: "B2", skor: 70, kec: ["11|A|X", "11|A|Y"], sejak: "2026-10-19", level_tertinggi: 3}];
  const a = ST.pilihAwal(kej, st); assert.equal(a.kode, "B2"); assert.equal(a.k, "11|A|Y", "dalam kejadian: level lalu hujan tertinggi"); assert.equal(a.sumber, "kejadian");
  const b = ST.pilihAwal([], st); assert.equal(b.sumber, "status"); assert.equal(b.k, "13|C|W", "level maks 3 sama di Z dan W: hujan 3 hari 220 mm mengalahkan 200 mm");
  assert.equal(ST.pilihAwal([], {}), null); assert.equal(ST.pilihAwal(null, null), null);
});
