/* Uji lapis tanggap dan waktu tempuh simulasi gunung api (public/gunungapi/sim_tanggap.js, sim_lahar.js). node --test tests/gunungapi/*.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const muat = f => { const m = {exports: {}}; new Function("module", readFileSync(new URL("../../public/gunungapi/" + f, import.meta.url), "utf8"))(m); return m.exports; };
const T = muat("sim_tanggap.js"), L = muat("sim_lahar.js");
const status = JSON.parse(readFileSync(new URL("../../public/banjir/data/gunungapi_status.json", import.meta.url), "utf8"));

test("gunung bawaan = level tertinggi hari ini, bukan nama tetap", () => {
  const g = T.gunungBawaan(status), maks = Math.max(...status.gunung.map(x => x.level));
  assert.equal(g.level, maks, `bawaan ${g.nama} level ${g.level}, padahal level tertinggi ${maks}`);
  const st = {gunung: [{nama: "A", level: 3}, {nama: "B", level: 3}, {nama: "C", level: 2}], letusan: [{gunung: "A", waktu: "2026-10-01T00:00:00Z"}, {gunung: "B", waktu: "2026-10-02T00:00:00Z"}]};
  assert.equal(T.gunungBawaan(st).nama, "B", "seri level harus dimenangkan erupsi terbaru");
});

const desa = (jiwa, menit, bahaya, km = 3, titik = "t") => ({jiwa, tempuh_menit: menit, bahaya_jam: bahaya, km, titik});
test("evakuasi: mulai lebih awal menyelamatkan lebih banyak; kapasitas jalan membatasi; armada menambah; tak melebihi yang terpapar", () => {
  const D = [desa(4000, 20, 1.5), desa(3000, 30, 2.5), desa(5000, 15, null)], dalam = new Set([0, 1, 2]);
  const jalan = (ubah = {}) => T.evakuasi({desa: D, dalam, mulai_jam: 0, armada: {n: 0}, ...ubah});
  const telat = jalan(), awal = jalan({mulai_jam: -6}), sempit = jalan({mulai_jam: -1, param: {kap_jalan: 30}}), lega = jalan({mulai_jam: -1}), armada = jalan({mulai_jam: -1, param: {kap_jalan: 30, mandiri: 0.2}, armada: {n: 80}}), tanpa = jalan({mulai_jam: -1, param: {kap_jalan: 30, mandiri: 0.2}});
  assert.equal(telat.terpapar0, 7000, "yang terpapar = jiwa di desa yang dilanda (desa ketiga tak pernah kena)");
  assert.ok(telat.terselamatkan < awal.terselamatkan, `mulai telat ${telat.terselamatkan} harus < mulai 6 jam sebelum ${awal.terselamatkan}`);
  assert.ok(sempit.terselamatkan < lega.terselamatkan, `jalan sempit ${sempit.terselamatkan} harus < jalan lega ${lega.terselamatkan}`);
  assert.ok(armada.terselamatkan > tanpa.terselamatkan, `armada ${armada.terselamatkan} harus > tanpa armada ${tanpa.terselamatkan}`);
  for (const r of [telat, awal, sempit, lega, armada]) assert.ok(r.terselamatkan <= r.terpapar0 + 1e-6 && r.terselamatkan >= 0, "terselamatkan di luar [0, terpapar]");
  assert.ok(awal.biaya > telat.biaya, "mulai sebelum erupsi menambah hari mengungsi, biaya harus naik");
});

test("peringkat perlakuan: paket radius x mulai x armada, pareto menurut biaya, tak ada paket pareto yang dikalahkan", () => {
  const D = [desa(4000, 20, 0.3, 2), desa(3000, 30, 0.6, 6), desa(2000, 25, 1, 9)];
  const r = T.peringkat({radius_km: 3, mulai_jam: 0, armada: {n: 0}}, D, {radius: [3, 5, 8, 10], mulai: [-6, 0, 2], armada: [0, 20]});
  assert.ok(r.semua >= 12, `hanya ${r.semua} paket`);
  const par = r.pareto; assert.ok(par.length >= 1, "harus ada paket pareto");
  for (let i = 1; i < par.length; i++) { assert.ok(par[i - 1].biaya <= par[i].biaya, "pareto tak urut biaya"); assert.ok(par[i].selamat > par[i - 1].selamat - 1e-9, "pareto: biaya naik harus menambah jiwa terselamatkan"); }
  assert.ok(par.some(b => b.nama.includes(",")), "harus ada paket gabungan (radius + mulai/armada)");
  assert.ok(par.every(b => typeof b.peka === "boolean"), "tiap paket pareto diberi label peka asumsi");
});

test("antrean titik kumpul berbasis waktu: selesai = max(tiba, titik kosong) + kendaraan / kapasitas; desa jauh tak menunggu antrean kosong", () => {
  const D = [desa(3500 / 0.6, 6, null, 1, "t"), desa(3500 / 0.6, 300, null, 5, "t")], P = {mandiri: 0.6, orang_per_kend: 3.5, kap_jalan: 100, siaga_jam: 0};
  const r = T.evakuasi({desa: D, dalam: [0, 1], mulai_jam: 0, armada: {n: 0}, param: P});
  /* 1000 kendaraan per desa, 100 per jam = 10 jam. Desa 0: tiba 0,1 jam, selesai 10,1. Desa 1: tiba 5 jam, titik baru kosong di 10,1: selesai 20,1 */
  assert.ok(Math.abs(r.per[0].tiba_jam - 10.1) < 1e-6 && Math.abs(r.per[1].tiba_jam - 20.1) < 1e-6, `tiba ${r.per[0].tiba_jam}, ${r.per[1].tiba_jam}`);
  const lega = T.evakuasi({desa: [D[1]], dalam: [0], mulai_jam: 0, armada: {n: 0}, param: P});
  assert.ok(Math.abs(lega.per[0].tiba_jam - 15) < 1e-6, `desa sendirian: tiba 5 + 10 jam antre = 15, dapat ${lega.per[0].tiba_jam}`);
});

test("truk tak diberangkatkan bila tak sempat tiba di desa sebelum bahaya; ruas jalan terpotong lahar membuat unit tak selamat; titik kumpul kena membatasi", () => {
  const dasar = {mulai_jam: 0, dalam: [0], param: {mandiri: 0, siaga_jam: 0}}, unit = (x = {}) => ({jiwa: 400, tempuh_menit: 60, bahaya_jam: 0.5, titik: "t", ...x});
  const telat = T.evakuasi({...dasar, desa: [unit()], armada: {n: 50}});
  assert.equal(telat.terselamatkan, 0, "truk butuh 1 jam ke desa, bahaya 0,5 jam: tak ada yang terselamatkan");
  const sempat = T.evakuasi({...dasar, desa: [unit({bahaya_jam: 1.5})], armada: {n: 50}});
  assert.equal(sempat.terselamatkan, 400, "truk tiba 1 jam < 1,5 jam: semua terangkut");
  const putus = T.evakuasi({...dasar, desa: [unit({bahaya_jam: 5, ruas: [[10, 0.1]]})], armada: {n: 50}});
  assert.equal(putus.terselamatkan, 0, "ruas dilalui menit ke-10 padahal lahar tiba di ruas jam 0,1 (menit ke-6): tidak lolos");
  const titik = T.evakuasi({...dasar, mulai_jam: -3, desa: [unit({bahaya_jam: 10, titik_bahaya_jam: -2.9, tempuh_menit: 10})], armada: {n: 0}, param: {mandiri: 1, siaga_jam: 0}});
  assert.ok(titik.terselamatkan < 400, `titik kumpul kena di jam -2,9, unit tiba -2,83: tak boleh selamat penuh (${titik.terselamatkan})`);
});

test("paparan per piksel dibobot luas: frak = luas sel kena / luas piksel, dan terpapar bukan biner titik", () => {
  const sx = 1 / 120, piksel = [[0, 100, 1000], [0, 100 + sx, 500]], luasPix = sx * 111.32 * sx * 110.57;
  const sel = Array.from({length: 40}, (_, i) => [0.0005 * (i % 4) - 0.00075, 100 + 0.0005 * (i >> 2) - 0.00225, 2]), luasSel = luasPix / 100;
  const r = T.paparPiksel(piksel, sx, sel, luasSel);
  assert.ok(Math.abs(r[0].frak - 0.4) < 1e-6, `40 sel x 1/100 piksel = 0,4, dapat ${r[0].frak}`); assert.equal(r[1].frak, 0); assert.equal(r[0].t, 2); assert.equal(r[1].t, null);
});

/* invarian: grid piksel WorldPop yang diekspor (scripts/gunungapi/pop_grid.py) cocok dengan cincin penduduk paparan.json untuk SETIAP gunung; bila tidak, paparan model tak sebanding dengan angka resmi layar */
test("grid penduduk per gunung konsisten dengan cincin WorldPop paparan.json (+-10% atau 100 jiwa)", () => {
  const pap = JSON.parse(readFileSync(new URL("../../public/gunungapi/data/paparan.json", import.meta.url), "utf8")), st = Object.fromEntries(status.gunung.map(g => [T.slug(g.nama), g]));
  for (const g of pap.gunung) { const f = JSON.parse(readFileSync(new URL(`../../public/gunungapi/data/pop/${g.id}.json`, import.meta.url), "utf8")), gn = st[g.id] || g;
    const lat = gn.lat ?? g.lat, lon = gn.lon ?? g.lon;
    for (const c of g.cincin) { const grid = T.jiwaDalamRadius(f.piksel, lat, lon, c.km), tol = Math.max(100, 0.1 * c.penduduk);
      assert.ok(Math.abs(grid - c.penduduk) <= tol, `${g.id} radius ${c.km} km: grid ${grid} jiwa vs cincin ${c.penduduk} (toleransi ${Math.round(tol)})`); } }
});

test("graf jalan berbobot menit: ruas lambat lebih mahal, ruas ditutup memutus", () => {
  const rute = [[[0, 0], [0.01, 0]], [[0.01, 0], [0.02, 0]]], G = T.bangunGraf(rute, [60, 15], [[0.02, 0]], [[0, 0]]);
  const d = T.dijkstra(G, new Set()), a = d[G.dn[0][0]], km = T.jarakKm(0, 0, 0.01, 0);
  assert.ok(Math.abs(a - (km / 60 + km / 15) * 60) < 0.01, `menit ${a} != hitungan tangan ${(km / 60 + km / 15) * 60}`);
  assert.equal(T.dijkstra(G, new Set([1]))[G.dn[0][0]], Infinity, "menutup ruas satu-satunya harus memutus desa");
});

test("masker dan bandara", () => {
  const m = T.masker([{jiwa: 1000, abu: 0.6}, {jiwa: 500, abu: 0.05}], {durasi_jam: 6});
  assert.equal(m.baris.length, 1); assert.equal(m.total, 1000 * 2 * 3, "1000 jiwa x 2 masker x 3 hari");
  const kotak = [[0, 0], [2, 0], [2, 2], [0, 2]], b = T.bandaraTutup([{lon: 1, lat: 1, nama: "dalam"}, {lon: 5, lat: 5, nama: "luar"}], [[3, kotak], [9, kotak]]);
  assert.deepEqual(b.map(x => [x.nama, x.jam]), [["dalam", 3]], "hanya bandara di dalam poligon, jam pertama");
});

/* kerucut curam dengan lembah: awan panas dan lahar punya waktu tiba yang masuk akal secara fisik */
const N = 401, C = 200, jml = (f) => { const d = new Float32Array(N * N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) d[y * N + x] = f(x, y); return d; };
const dem = jml((x, y) => { const r = Math.hypot(x - C, y - C); let z = Math.max(100, 2000 - 12 * r); if (x > C) z -= 40 * Math.exp(-(((y - C) / 5) ** 2)) * Math.min(1, (x - C) / 3); return z; });
test("waktu tiba awan panas (garis energi) dan lahar (Manning): terurut, kecepatan dalam batas fisik", () => {
  const r = L.simulasi({dem, n: N, m: N, z: 12, lat: 0, pusat: [C, C], V: 1e5, hl: 0.3, maxJalur: 1, proksimal: 0.5, ambangHulu: 0});
  for (const k of ["lahar", "pdc"]) assert.ok(r[k].idx.length > 50 && r[k].t.every((v, i, t) => !i || t[i - 1] <= v), `${k}: sel harus ada dan terurut menurut waktu tiba`);
  const i = r.info[0], vP = i.pdc_km * 1000 / (i.pdc_menit * 60), vL = (i.lahar_km - i.awal_km) * 1000 / Math.max(1, (i.lahar_menit * 60));
  assert.ok(vP >= 3 && vP <= 100, `kecepatan rata-rata awan panas ${vP.toFixed(1)} m/dtk di luar 3-100`);
  assert.ok(i.lahar_v_maks <= 25 && i.lahar_v_maks > 0.5, `kecepatan lahar maks ${i.lahar_v_maks} di luar 0,5-25 m/dtk`);
  assert.ok(vL > 0.4 && vL <= 25, `kecepatan rata-rata lahar ${vL.toFixed(1)} m/dtk di luar batas`);
  const curam = L.simulasi({dem, n: N, m: N, z: 12, lat: 0, pusat: [C, C], V: 1e5, hl: 0.3, maxJalur: 1, proksimal: 0.5, ambangHulu: 0}).info[0];
  assert.equal(curam.pdc_menit, i.pdc_menit, "hasil harus deterministik");
});
