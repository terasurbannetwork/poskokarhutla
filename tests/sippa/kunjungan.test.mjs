/* Keputusan 64: fungsi murni rencana kunjungan. Tanpa DB, tanpa jaringan. */
import test from "node:test";
import assert from "node:assert/strict";
import {kmLurus, perkiraanJalan, bacaKoordinat, pilihKandidat, urlOsrmTable, bacaOsrm, gabungMatriks, bagiTim, urutTermurah, pecahHari, susunRencana, tautanSemua, tautanTim, tautanHari, tautanJalur, kunjunganUntukServer} from "../../public/pipa/kunjungan.js";

const AWAL = [-1.2409, 116.8349];
const kom = (id, lat, lon, ekstra = {}) => ({id, prov: "64", kab: "Kab " + id, lat, lon, ...ekstra});
const aks = (id, ekstra = {}) => ({id, km: {kaki: 1}, menit: {kaki: 30}, rute: [[116, -1], [116.5, -1.1], [116.6, -1.2]], ...ekstra});
const hs = (lat, lon, jam = -3, frp = 20, hitung = 1) => [lat, lon, jam, "V", frp, "n", "x", "t", hitung];
const KOL = ["lat", "lon", "jam", "sensor", "frp", "keyakinan", "wilayah", "tgl_wib", "hitung"];
const titik = baris => ({acuan: "2026-10-30T00:00:00Z", kolom: KOL, baris});
const kl = (lat, lon, wt, hari = 5) => ({features: [{properties: {lat, lon, hari, wt}}]});

test("kmLurus: satu derajat lintang sekitar 111 km, titik sama nol", () => {
  assert.ok(Math.abs(kmLurus([0, 100], [1, 100]) - 111.19) < 0.1);
  assert.equal(kmLurus([-1, 110], [-1, 110]), 0);
});
test("perkiraanJalan: lurus x 1,4 pada 40 km/jam", () => {
  const p = perkiraanJalan(100); assert.equal(p.jalanKm, 140); assert.equal(p.menit, 210); assert.equal(p.sumber, "perkiraan");
});
test("bacaKoordinat: tempelan Google Maps, di luar Indonesia ditolak", () => {
  assert.deepEqual(bacaKoordinat("-1.2409634944330612, 116.83496255725214"), [-1.2409634944330612, 116.83496255725214]);
  assert.equal(bacaKoordinat("51.5, -0.12"), null); assert.equal(bacaKoordinat("abc"), null); assert.equal(bacaKoordinat("1, 2, 3"), null);
});

test("pilihKandidat: urut titik panas 24 jam, saring sisa, radius, akses, provinsi", () => {
  const kompleks = [kom("K1", -1.3, 116.9), kom("K2", -1.4, 116.9), kom("K3", -1.5, 116.9), kom("K4", -1.6, 116.9), kom("K5", -1.7, 116.9), kom("K6", 30, 100), kom("K7", -1.8, 116.9, {prov: "62"})];
  const akses = ["K1", "K2", "K3", "K4", "K6", "K7"].map(i => aks(i));
  akses.push(aks("K5", {tak_terjangkau: true}));
  const t = titik([hs(-1.3, 116.9), hs(-1.3, 116.9), hs(-1.4, 116.9, -30), hs(-1.5, 116.9), hs(-1.5, 116.9), hs(-1.5, 116.9), hs(-1.6, 116.9), hs(-1.7, 116.9), hs(-1.8, 116.9)]);
  const klu = {features: [{properties: {lat: -1.5, lon: 116.9, hari: 4, wt: {sisa: 1}}}, {properties: {lat: -1.3, lon: 116.9, hari: 2, wt: {sisa: 3}}}]};
  const h = pilihKandidat({kompleks, akses, titik: t, kluster: klu, awal: AWAL, prov: "64", radiusKm: 100, jumlah: 6, sertakanTerdekat: false});
  assert.deepEqual(h.map(c => c.id), ["K1", "K4"], "K2 hanya titik 30 jam, K3 sisa 1, K5 tak terjangkau, K6 jauh, K7 provinsi lain");
  assert.equal(h[0].n24, 2); assert.equal(h[0].sisa, 3); assert.equal(h[0].hari, 2);
  assert.equal(h[1].sisaTahu, false, "sisa tak diketahui tetap lolos, ditandai");
  assert.deepEqual(h[0].parkir, [-1.1, 116.5], "parkir = titik sebelum terakhir rute, [lat, lon]");
  assert.equal(h[0].kakiKm, 1);
});
test("pilihKandidat: urutan seri jarak, batas jumlah 10", () => {
  const kompleks = [], akses = [], baris = [];
  for (let i = 0; i < 14; i++) { kompleks.push(kom("K" + i, -1.3 - i * 0.05, 116.9)); akses.push(aks("K" + i)); baris.push(hs(-1.3 - i * 0.05, 116.9)); }
  const h = pilihKandidat({kompleks, akses, titik: titik(baris), awal: AWAL, prov: "64", jumlah: 99, sertakanTerdekat: false});
  assert.equal(h.length, 10); assert.deepEqual(h.map(c => c.id), Array.from({length: 10}, (_, i) => "K" + i));
});
test("pilihKandidat: kompleks terdekat masuk walau di luar radius dan top N, menggantikan yang terakhir", () => {
  const kompleks = [kom("K1", -1.3, 116.9), kom("K2", -1.4, 116.9), kom("K3", -1.5, 116.9)];
  const akses = kompleks.map(k => aks(k.id));
  // K1 terdekat tapi hanya 1 titik; K2, K3 lebih banyak; jumlah 2 -> K3 terakhir diganti K1
  const t = titik([hs(-1.3, 116.9), hs(-1.4, 116.9), hs(-1.4, 116.9), hs(-1.5, 116.9), hs(-1.5, 116.9), hs(-1.5, 116.9)]);
  const h = pilihKandidat({kompleks, akses, titik: t, awal: AWAL, prov: "64", jumlah: 2, radiusKm: 1});
  assert.deepEqual(h.map(c => c.id).sort(), ["K1"], "radius 1 km membuang semua kecuali terdekat");
  assert.ok(h[0].terdekat);
  const h2 = pilihKandidat({kompleks, akses, titik: t, awal: AWAL, prov: "64", jumlah: 2});
  assert.equal(h2.length, 2); assert.ok(h2.some(c => c.id === "K1" && c.terdekat)); assert.equal(h2[0].id, "K3");
});
test("pilihKandidat: dugaan Loa Janan K1561 (api lemah menahun, data 30 Okt) dikeluarkan, masuk dengan alasan bila diminta", () => {
  const kompleks = [kom("K1561", -0.7367, 117.0392)], akses = [aks("K1561")];
  const t = titik([hs(-0.7367, 117.0395, -5, 1.1), hs(-0.7368, 117.0392, -5, 3, 0), hs(-0.7334, 117.0404, -50, 0.8)]);
  const klu = kl(-0.7367, 117.0392, {a: 15, n: 23, k: 4, sisa: 5});
  const luar = pilihKandidat({kompleks, akses, titik: t, kluster: klu, awal: AWAL, prov: "64", sertakanTerdekat: false});
  assert.equal(luar.length, 0);
  const dalam = pilihKandidat({kompleks, akses, titik: t, kluster: klu, awal: AWAL, prov: "64", sertakanTerdekat: false, termasukDugaan: true});
  assert.equal(dalam.length, 1); assert.match(dalam[0].dugaan, /menahun/); assert.equal(dalam[0].n24, 1); assert.equal(dalam[0].n24Semua, 2);
});
test("pilihKandidat: hitung 0 = deteksi ganda, BUKAN tanda industri; sumber panas tetap dari titik_palsu.json (kawah dilewati)", () => {
  const kompleks = [kom("K1", -1.3, 116.9)], akses = [aks("K1")];
  const t = titik([hs(-1.3, 116.9, -5, 20), hs(-1.3, 116.9, -5, 20, 0)]);
  assert.equal(pilihKandidat({kompleks, akses, titik: t, awal: AWAL, prov: "64", sertakanTerdekat: false})[0].dugaan, null);
  const palsu = {sumber_statis: [{lat: -1.305, lon: 116.9, jenis: "sumber panas tetap", nama: "kilang"}, {lat: -1.3, lon: 116.9, jenis: "kawah", nama: "gunung"}]};
  const h = pilihKandidat({kompleks, akses, titik: t, palsu, awal: AWAL, prov: "64", sertakanTerdekat: false, termasukDugaan: true});
  assert.match(h[0].dugaan, /sumber panas tetap terdaftar \(kilang\)/);
  const hanyaKawah = {sumber_statis: [palsu.sumber_statis[1]]};
  assert.equal(pilihKandidat({kompleks, akses, titik: t, palsu: hanyaKawah, awal: AWAL, prov: "64", sertakanTerdekat: false})[0].dugaan, null);
});
test("pilihKandidat: dugaan konsesi lain dan api lemah menahun", () => {
  const kompleks = [kom("K1", -1.3, 116.9), kom("K2", -1.4, 116.9)], akses = kompleks.map(k => aks(k.id));
  const konsesi = {kolom: ["id", "jenis_utama", "jenis"], baris: [["K1", "lain", ["lain"]], ["K2", "hti", ["hti"]]]};
  const t = titik([hs(-1.3, 116.9), hs(-1.4, 116.9, -3, 3), hs(-1.4, 116.9, -50, 4)]);
  const klu = kl(-1.4, 116.9, {a: 8, n: 10, k: 4, sisa: 5});
  const h = pilihKandidat({kompleks, akses, konsesi, titik: t, kluster: klu, awal: AWAL, prov: "64", sertakanTerdekat: false, termasukDugaan: true});
  assert.match(h.find(c => c.id === "K1").dugaan, /konsesi tambang/);
  assert.match(h.find(c => c.id === "K2").dugaan, /api lemah menahun/);
  const kuat = pilihKandidat({kompleks: [kompleks[1]], akses, titik: titik([hs(-1.4, 116.9, -3, 30)]), kluster: klu, awal: AWAL, prov: "64", sertakanTerdekat: false});
  assert.equal(kuat[0].dugaan, null, "frp kuat bukan dugaan");
});

test("urlOsrmTable: lon dulu, titik koma, anotasi", () => {
  assert.equal(urlOsrmTable([[-1.5, 116.8], [-2, 117]]), "https://router.project-osrm.org/table/v1/driving/116.8,-1.5;117,-2?annotations=duration,distance");
});
test("bacaOsrm: detik ke menit, meter ke km, null tetap null, bentuk salah null", () => {
  const j = {code: "Ok", durations: [[0, 600], [null, 0]], distances: [[0, 12000], [null, 0]]};
  assert.deepEqual(bacaOsrm(j, 2), {menit: [[0, 10], [null, 0]], km: [[0, 12], [null, 0]]});
  assert.equal(bacaOsrm({code: "Ok", durations: [[0]], distances: [[0]]}, 2), null); assert.equal(bacaOsrm({code: "NoRoute"}, 2), null); assert.equal(bacaOsrm(null, 2), null);
});
test("gabungMatriks: pasangan tanpa OSRM jatuh ke perkiraan dan berlabel", () => {
  const p = [[-1, 110], [-1, 111], [-1, 112]];
  const m = gabungMatriks(p, {menit: [[0, 5, null], [5, 0, 5], [null, 5, 0]], km: [[0, 4, null], [4, 0, 4], [null, 4, 0]]});
  assert.equal(m.sumber[0][1], "osrm"); assert.equal(m.sumber[0][2], "perkiraan"); assert.equal(m.menit[0][1], 5);
  assert.ok(Math.abs(m.km[0][2] - kmLurus(p[0], p[2]) * 1.4) < 1e-9);
  assert.equal(gabungMatriks(p, null).sumber[1][2], "perkiraan");
});

test("bagiTim: sektor bersambung, seimbang, tak pernah kosong bila lokasi >= tim", () => {
  const lok = [{id: "U1", lat: 0, lon: 111}, {id: "U2", lat: 0.1, lon: 111}, {id: "S1", lat: -2, lon: 111}, {id: "S2", lat: -2.1, lon: 111}, {id: "T1", lat: -1, lon: 113}];
  const awal = [-1, 111];
  const g = bagiTim(lok, awal, 2);
  assert.equal(g.length, 2); assert.deepEqual(g.map(x => x.length).sort(), [2, 3]);
  for (const n of [1, 2, 3, 4, 5]) assert.ok(bagiTim(lok, awal, n).every(x => x.length >= 1), "tim " + n);
  assert.equal(bagiTim(lok, awal, 1)[0].length, 5);
  const tiga = bagiTim(lok, awal, 3).map(x => x.map(l => l.id[0]).sort().join(""));
  assert.ok(tiga.some(s => s.startsWith("UU") || s.includes("UU")) || tiga.some(s => s === "SS"), "yang berdekatan satu tim");
  assert.equal(bagiTim([lok[0]], awal, 1)[0].length, 1);
});

test("urutTermurah: optimum permutasi pada matriks kecil, jalur terbuka", () => {
  // garis: awal0 - A1 - B2 - C3 jaraknya 10 antar-tetangga; urutan terburuk akan lompat
  const M = [[0, 10, 20, 30], [10, 0, 10, 20], [20, 10, 0, 10], [30, 20, 10, 0]];
  const o = urutTermurah([3, 1, 2], M, 0);
  assert.deepEqual(o.urutan, [1, 2, 3]); assert.equal(o.menit, 30); assert.equal(o.menitPulang, 60);
  assert.deepEqual(urutTermurah([], M, 0), {urutan: [], menit: 0, menitPulang: 0});
});
test("urutTermurah: 10 lokasi (2-opt) menemukan urutan garis lurus", () => {
  const n = 11, M = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => Math.abs(i - j) * 7));
  const o = urutTermurah([5, 9, 2, 10, 1, 7, 3, 8, 4, 6], M, 0);
  assert.equal(o.menit, 70); assert.deepEqual(o.urutan, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("pecahHari: batas 10 jam, hari berikut dari lokasi terakhir, menginap kecuali hari terakhir", () => {
  const M = [[0, 60, 120, 180], [60, 0, 60, 120], [120, 60, 0, 60], [180, 120, 60, 0]];
  const u = [1, 2, 3].map(i => ({idx: i, id: "K" + i, kakiMenit: 0}));
  const h = pecahHari(u, M, {batasMenit: 600, diLokasiMenit: 150});
  // hari 1: 60+150 + 60+150 = 420, lokasi ke-3 menambah 210 -> 630 > 600
  assert.equal(h.length, 2); assert.deepEqual(h[0].ids, ["K1", "K2"]); assert.deepEqual(h[1].ids, ["K3"]);
  assert.equal(h[0].menitMobil, 120); assert.equal(h[0].menitLapangan, 300); assert.equal(h[0].menitTotal, 420);
  assert.equal(h[1].menitMobil, 60, "hari 2 mulai dari K2, bukan dari titik awal"); assert.equal(h[1].asalIdx, 2);
  assert.equal(h[0].menginap, true); assert.equal(h[1].menginap, false);
  const satu = pecahHari([{idx: 3, id: "K3", kakiMenit: 400}], M, {batasMenit: 600});
  assert.equal(satu.length, 1, "satu lokasi melebihi batas tetap masuk satu hari");
});

test("tautan Google Maps: koordinat 5 desimal, %7C, tujuan, lebih dari 9 titik antara dipecah berurutan", () => {
  const lok = Array.from({length: 3}, (_, i) => ({id: "K" + i, parkir: [-1.5 - i, 116.123456]}));
  const [u] = tautanTim([-1.2, 116.8], lok);
  assert.equal(u, "https://www.google.com/maps/dir/?api=1&origin=-1.20000,116.80000&destination=-3.50000,116.12346&waypoints=-1.50000,116.12346%7C-2.50000,116.12346&travelmode=driving");
  const semua = tautanSemua([-1.2, 116.8], lok); assert.equal(semua.length, 1); assert.match(semua[0], /destination=-1\.20000,116\.80000/);
  assert.equal(tautanHari([-1, 110], [lok[0]]).length, 1);
  const p = Array.from({length: 25}, (_, i) => [-i * 0.1, 110 + i * 0.1]);
  const t = tautanJalur(p);
  assert.equal(t.length, 3, "25 titik: 11 + 11 + 5 dengan sambungan");
  for (const x of t) assert.ok((x.match(/%7C/g) ?? []).length <= 8, "paling banyak 9 titik antara");
  assert.match(t[1], /origin=-1\.00000,111\.00000/, "tautan kedua berangkat dari tujuan tautan pertama");
});

test("kunjunganUntukServer: bentuk kontrak v1, pembulatan, tiap id sekali", () => {
  const kandidat = [
    {id: "K1", lat: -1.3, lon: 116.9, parkir: [-1.31, 116.91], lurusKm: 10.04, kakiKm: 1.26, kakiMenit: 30},
    {id: "K2", lat: -1.4, lon: 117.2, parkir: [-1.41, 117.21], lurusKm: 40.06, kakiKm: 0, kakiMenit: 0},
    {id: "K3", lat: -1.5, lon: 115.9, parkir: [-1.51, 115.91], lurusKm: 90.5, kakiKm: 2, kakiMenit: 60},
  ];
  const awal = [-1.240963494, 116.834962557];
  const titikM = [awal, ...kandidat.map(c => c.parkir)];
  const matriks = gabungMatriks(titikM, null);
  const r = susunRencana({kandidat, awal, nTim: 2, matriks});
  const s = kunjunganUntukServer(r);
  assert.equal(s.v, 1); assert.deepEqual(s.awal, {lat: -1.24096, lon: 116.83496});
  assert.deepEqual(s.tim.map(t => t.no), [1, 2]);
  const ids = s.tim.flatMap(t => t.hari.flatMap(h => h.ids)).sort();
  assert.deepEqual(ids, ["K1", "K2", "K3"]); assert.deepEqual(Object.keys(s.jarak).sort(), ids);
  for (const t of s.tim) { assert.ok(t.hari.length >= 1 && t.hari.length <= 7); t.hari.forEach((h, i) => assert.equal(h.no, i + 1)); }
  const j = s.jarak.K1;
  assert.equal(j.lurus_km, 10); assert.equal(j.kaki_km, 1.3); assert.equal(j.sumber, "perkiraan");
  assert.ok(Number.isInteger(j.mobil_menit)); assert.equal(Math.round(j.jalan_km * 10), j.jalan_km * 10);
  for (const v of Object.values(s.jarak)) for (const x of [v.lurus_km, v.jalan_km, v.mobil_menit, v.kaki_km]) assert.ok(Number.isFinite(x) && x >= 0 && x <= 5000);
  JSON.stringify(s);
});
test("susunRencana: mobil_menit lokasi = dari perhentian sebelumnya dalam rute tim", () => {
  const awal = [0, 100];
  const kandidat = [{id: "K1", lat: 0, lon: 100.5, parkir: [0, 100.5], lurusKm: 55, kakiKm: 0, kakiMenit: 0}, {id: "K2", lat: 0, lon: 101, parkir: [0, 101], lurusKm: 111, kakiKm: 0, kakiMenit: 0}];
  const matriks = gabungMatriks([awal, ...kandidat.map(c => c.parkir)], null);
  const r = susunRencana({kandidat, awal, nTim: 1, matriks});
  assert.deepEqual(r.tim[0].lokasi.map(c => c.id), ["K1", "K2"]);
  assert.ok(Math.abs(r.baris.K2.mobilMenit - matriks.menit[1][2]) < 1e-9);
  assert.ok(Math.abs(r.baris.K1.mobilMenit - matriks.menit[0][1]) < 1e-9);
});
