/* Uji pos tinggi air /banjir (public/banjir/pos_air.js): fungsi murni + gerbang INP statis animasi. Fixture di sini saja. */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import {spawnSync} from "node:child_process";

const f = "public/banjir/pos_air.js", src = fs.readFileSync(f, "utf8"), ctx = vm.createContext({Intl, Date, Math, Number, Object, isNaN});
vm.runInContext(src.slice(0, src.indexOf("/* ---------- bagian peta")), ctx);
const P = ctx.PosAir, plain = x => JSON.parse(JSON.stringify(x));

test("sintaks sah dan teks tampil tanpa titik tengah atau em dash", () => {
  assert.equal(spawnSync("node", ["--check", f], {encoding: "utf8"}).status, 0);
  assert.ok(!/·|—/.test(src));
});

test("3857 ke lon/lat", () => {
  const [lo, la] = P.lonlat(12467461.3791942, 69792.529017212946);
  assert.ok(Math.abs(lo - 111.99) < .02 && Math.abs(la - 0.627) < .01, `${lo},${la}`);
  assert.deepEqual(plain(P.lonlat(0, 0)), [0, 0]);
});

test("status ke warna, redup, denyut", () => {
  assert.equal(P.warna("biasa"), "#3f7fb8"); assert.equal(P.warna("naik_di_atas_biasa"), "#e58a45"); assert.equal(P.warna("tertinggi"), "#c9503a");
  for (const s of ["lama", "macet", "bukan_tinggi"]) { assert.equal(P.warna(s), "#8d9aa9"); assert.ok(P.redup(s)); }
  assert.notEqual(P.warna("riwayat_kurang"), P.warna("lama")); assert.ok(!P.redup("riwayat_kurang"));
  assert.ok(P.denyut("naik_di_atas_biasa") && P.denyut("tertinggi") && !P.denyut("biasa") && !P.denyut("lama"));
  assert.equal(P.warna("asing"), P.warna("data_bolong"));
});

test("angka format Indonesia, satuan null tanpa konversi", () => {
  assert.equal(P.angka(0.41, "m"), "0,41 m"); assert.equal(P.angka(701.98, "cm"), "702 cm"); assert.equal(P.angka(12.34, "cm"), "12,3 cm");
  assert.equal(P.angka(-0.02, null), "-0,02"); assert.equal(P.angka(5, "centimeter"), "5 cm"); assert.equal(P.angka(null, "m"), "–");
  assert.equal(P.delta(0.01, "m"), "▲ 0,01 m"); assert.equal(P.delta(-1.5, "cm"), "▼ 1,5 cm"); assert.equal(P.delta(0, "cm"), "tetap"); assert.equal(P.delta(null, "m"), "–");
  assert.deepEqual(plain([2, -2, 0, null].map(P.deltaKelas)), ["naik", "turun", "tetap", ""]);
});

test("waktu baca WIB", () => {
  assert.equal(P.waktuBaca(Date.UTC(2026, 9, 27, 9, 0) / 1000), "Dibaca Sel 27 Okt 16.00 WIB");
  assert.equal(P.waktuBaca(Date.UTC(2026, 9, 27, 9, 0)), "Dibaca Sel 27 Okt 16.00 WIB", "milidetik juga diterima");
  const n = 1e6; assert.equal(P.lalu(n - 5 * 3600, n), "5 jam lalu"); assert.equal(P.lalu(n - 3 * 86400, n), "3 hari lalu");
});

test("pos lama dan macet dipilih, terlama mengirim di atas", () => {
  const pos = [{id: "a", status: "macet", t: 30}, {id: "b", status: "lama", t: 20}, {id: "c", status: "biasa", t: 1}, {id: "d", status: "macet", t: 10}, {id: "e", status: "lama", t: 5}];
  const m = plain(P.pilihMacet(pos));
  assert.deepEqual(m.macet.map(p => p.id), ["d", "a"]); assert.deepEqual(m.lama.map(p => p.id), ["e", "b"]);
});

test("geojson: koordinat, label angka, denyut hanya untuk naik dan tertinggi", () => {
  const g = plain(P.geojson([{id: "1", nama: "X", x: 0, y: 0, v: 41.5, satuan: "cm", status: "tertinggi"}, {id: "2", nama: "Y", x: 0, y: 0, v: null, satuan: null, status: "biasa"}]));
  assert.equal(g.features[0].properties.p, 1); assert.equal(g.features[0].properties.a, "41,5 cm"); assert.equal(g.features[1].properties.p, 0); assert.equal(g.features[1].properties.a, "");
  assert.deepEqual(plain(P.geojson(undefined)).features, []);
});

test("dasharray bergeser dan fase denyut dalam 0..1, jeda sekitar 11 fps", () => {
  assert.notDeepEqual(plain(P.dash(0)), plain(P.dash(P.JEDA))); assert.deepEqual(plain(P.dash(0)), plain(P.dash(P.JEDA * 14)));
  for (const t of [0, 500, 1799, 99999]) { const x = P.fase(t); assert.ok(x >= 0 && x < 1); }
  assert.ok(P.JEDA >= 66 && P.JEDA <= 100);
});

test("INP statis: animasi berhenti saat tab tersembunyi, reduced-motion, dan lapisan mati; tanpa elemen Marker", () => {
  assert.match(src, /visibilitychange/); assert.match(src, /document\.hidden \? this\.henti\(\)/);
  assert.match(src, /prefers-reduced-motion: reduce/); assert.match(src, /cancelAnimationFrame/);
  assert.match(src, /boleh\(\)\s*{\s*return !document\.hidden && !this\.kurangGerak\(\) && PosUkur\.menyala\(\)/, "satu penjaga dipakai mulai dan tiap frame");
  assert.match(src, /if \(!Alir\.boleh\(\)\) { Alir\.id = 0; return; }/, "frame berikutnya berhenti sendiri");
  assert.match(src, /tampil\(on\)[^]*on \? Alir\.mulai\(\) : Alir\.henti\(\)/, "sakelar lapisan");
  assert.match(src, /ts - Alir\.terakhir < PosAir\.JEDA\) return/, "paint dibatasi JEDA");
  assert.ok(!/maplibregl\.Marker/.test(src));
  assert.match(src, /nanti\(\(\) => this\.grafik\(x\)\)/, "grafik ditunda satu frame");
});

test("peta.js memasang sakelar, klik pos, dan pemuatan malas", () => {
  const p = fs.readFileSync("public/banjir/peta.js", "utf8"), h = fs.readFileSync("public/banjir/index.html", "utf8");
  assert.match(p, /PosUkur\.hit\(e\.point\)/); assert.match(p, /nanti\(\(\) => PosUkur\.mulai\(\)\)/); assert.match(p, /if \(k === "pos"\) PosUkur\.tampil\(i\.checked\)/);
  assert.match(h, /data-l="pos" checked/); assert.match(h, /<script src="pos_air\.js">/);
});

test("warna pin: status resmi menang atas persentil, data lama tetap abu, tanpa ambang jatuh ke persentil", () => {
  const p = (status, status_resmi, extra = {}) => ({id: "1", x: 0, y: 0, v: 1, status, status_resmi, ...extra});
  assert.equal(P.warnaPos(p("riwayat_kurang", "Siaga 3")), "#e3b94e"); assert.equal(P.warnaPos(p("biasa", "Siaga 2")), "#e58a45");
  assert.equal(P.warnaPos(p("tertinggi", "Normal")), "#3f7fb8", "resmi Normal menang atas tertinggi"); assert.equal(P.warnaPos(p("biasa", "Siaga 1")), "#c9503a");
  assert.equal(P.warnaPos(p("lama", "Siaga 1")), P.warna("lama"), "data lama tidak berwarna siaga");
  assert.equal(P.warnaPos(p("naik_di_atas_biasa", null)), "#e58a45"); assert.equal(P.warnaPos(p("biasa")), "#3f7fb8");
  assert.equal(P.ikonKunci(p("biasa", "Siaga 2")), "r-Siaga2"); assert.equal(P.ikonKunci(p("biasa", null)), "biasa");
  assert.ok(P.denyutPos(p("biasa", "Siaga 1")) && P.denyutPos(p("tertinggi", "Siaga 3")) && !P.denyutPos(p("biasa", "Normal")) && P.denyutPos(p("tertinggi", null)));
});

test("koordinat lon/lat dipakai bila ada, pengelola punya cadangan, skala ambang", () => {
  assert.deepEqual(plain(P.titik({lon: 106.8, lat: -6.2, x: 0, y: 0})), [106.8, -6.2]); assert.deepEqual(plain(P.titik({x: 0, y: 0})), [0, 0]);
  assert.equal(P.pengelola({}), "Kementerian PU, Ditjen SDA (SIHKA)"); assert.equal(P.pengelola({pengelola: "DSDA DKI"}), "DSDA DKI");
  assert.equal(P.skala({}), null); assert.equal(P.skala({ambang: {siaga3: 1, siaga2: null, siaga1: 3}}), null);
  assert.deepEqual(plain(P.skala({ambang: {siaga3: 100, siaga2: 150, siaga1: 200}})).map(t => [t.nama, t.batas, t.warna]), [["Siaga 1", 200, "#c9503a"], ["Siaga 2", 150, "#e58a45"], ["Siaga 3", 100, "#e3b94e"], ["Normal", null, "#3f7fb8"]]);
});

test("daftar macet dikelompokkan per pengelola, kelompok terbanyak dulu", () => {
  const g = plain(P.macetPerPengelola([{id: "a", status: "macet", t: 3, pengelola: "DSDA DKI"}, {id: "b", status: "lama", t: 1}, {id: "c", status: "macet", t: 2}, {id: "d", status: "biasa", t: 0}]));
  assert.deepEqual(g.map(([k, l]) => [k, l.map(p => p.id)]), [["Kementerian PU, Ditjen SDA (SIHKA)", ["b", "c"]], ["DSDA DKI", ["a"]]]);
});

const A = {siaga3: 100, siaga2: 150, siaga1: 200};
const kumpul = [
  {id: "1", nama: "Cirarab - Telesonik", status: "biasa", status_resmi: "Siaga 1", v: 210, satuan: "cm", ambang: A, sungai: "Cirarab", kota: "Tangerang", x: 0, y: 0},
  {id: "2", nama: "B", status: "riwayat_kurang", status_resmi: "Siaga 3", v: 120, satuan: "cm", ambang: A, sungai: "Cirarab", x: 0, y: 0},
  {id: "3", nama: "C", status: "naik_di_atas_biasa", v: 5, satuan: "m", x: 0, y: 0, kab: "Bogor"},
  {id: "4", nama: "D", status: "biasa", status_resmi: "Normal", v: 50, satuan: "cm", ambang: A, x: 0, y: 0},
  {id: "5", nama: "E", status: "macet", status_resmi: "Siaga 1", v: 1, satuan: "cm", x: 0, y: 0}];

test("ringkas: batang bertumpuk, pos naik terpisah, tidak mengirim", () => {
  const R = plain(P.ringkas(kumpul));
  assert.equal(R.total, 5); assert.equal(R.kirim, 4); assert.equal(R["Siaga 1"], 1); assert.equal(R["Siaga 3"], 1); assert.equal(R.mati, 1); assert.equal(R.naik, 1); assert.equal(R["Normal"], 2, "Normal + naik");
  assert.equal(P.kalimat(kumpul), "2 pos di atas batas normal: Cirarab - Telesonik (Siaga 1), B (Siaga 3). 1 pos sedang naik.");
  assert.equal(P.kalimat([kumpul[3]]), "Tidak ada pos di atas batas normal.");
  assert.deepEqual(plain(P.perluPantau(kumpul)).map(p => p.id), ["1", "2", "3"]);
});

test("rasio ambang, kelompok per sungai atau kabupaten, arah, subjudul", () => {
  assert.equal(P.rasio(kumpul[0]), 1); assert.equal(P.rasio(kumpul[3]), .25); assert.equal(P.rasio(kumpul[2]), null);
  const g = plain(P.kelompok(kumpul)).map(([k, l]) => [k, l.map(p => p.id)]);
  assert.deepEqual(g[0], ["Cirarab", ["1", "2"]]); assert.ok(g.some(([k]) => k === "Kab. Bogor")); assert.ok(g.some(([k]) => k === "Tanpa nama sungai"));
  assert.equal(P.arah(1.5, "cm"), "naik 1,5 cm"); assert.equal(P.arah(-2, "cm"), "turun 2 cm"); assert.equal(P.arah(null, "cm"), ""); assert.equal(P.arah(0, "cm"), "");
  assert.equal(P.subjudul(kumpul[0]), "Cirarab, Tangerang"); assert.equal(P.subjudul({}), "Pos tinggi air");
});

test("skala tegak: pita dan garis air", () => {
  assert.equal(P.skalaGeom(kumpul[2]), null);
  const g = plain(P.skalaGeom(kumpul[1]));
  assert.deepEqual(g.pita.map(t => t.nama), ["Normal", "Siaga 3", "Siaga 2", "Siaga 1"]);
  assert.ok(g.yAir < g.pita[1].y1 && g.yAir > g.pita[1].y0, "120 cm berada di pita Siaga 3");
  assert.ok(g.pita[0].y1 === g.H && g.pita[3].y0 === 0, "pita menutup seluruh tinggi");
});

test("ruas sungai: Siaga, atau naik tanpa ambang; radius sekitar 6 km", () => {
  const o = plain(P.ruas(kumpul));
  assert.deepEqual(Object.keys(o).sort(), ["Siaga 1", "Siaga 3", "naik"]);
  const ring = o["Siaga 1"].coordinates[0][0]; assert.equal(ring.length, 17); assert.deepEqual(ring[0], ring[16]);
  assert.ok(Math.abs(ring[0][0] - 6 / 111.32) < .001, "radius 6 km di khatulistiwa");
  assert.deepEqual(plain(P.ruas([kumpul[3], kumpul[4]])), {}, "Normal dan macet tidak diwarnai");
});

test("pasang surut: nilai sekarang, arah, empat puncak berikut (fixture)", () => {
  const st = {id: "9", nama: "Tanjung Priok", deret: {t0: "2026-10-27 00:00", langkah_menit: 60, cm: [10, 0, -21, -30, -10, 20]},
    puncak: [{t: "2026-10-27 01:00", cm: 5, jenis: "tinggi"}, {t: "2026-10-27 10:00", cm: -40, jenis: "rendah"}, {t: "2026-10-27 16:30", cm: 60, jenis: "tinggi"}, {t: "2026-10-27 22:15", cm: -10, jenis: "rendah"}, {t: "2026-10-28 05:00", cm: 70, jenis: "tinggi"}, {t: "2026-10-28 11:00", cm: -35, jenis: "rendah"}]};
  const now = P.wibDetik("2026-10-27 02:00"); assert.deepEqual(plain(P.pasutSekarang(st, now)), {cm: -21, arah: "surut"});
  assert.equal(P.pasutSekarang(st, P.wibDetik("2026-10-27 04:00")).arah, "pasang"); assert.equal(P.pasutSekarang(st, P.wibDetik("2026-10-28 00:00")), null);
  const k = plain(P.pasutKartu(st, now)); assert.equal(k.length, 4); assert.deepEqual(k[0], {jenis: "Surut", hari: "Sel", jam: "10.00", cm: -40}); assert.equal(k[3].hari, "Rab");
});

test("sorot aliran: pola pendek-panjang berjumlah tetap, bergeser, garis tengah utuh dan opasitas turun di zoom tinggi", () => {
  for (let i = 0; i < 14; i++) { const d = plain(P.dash(i * P.JEDA)); assert.ok(Math.abs(d.reduce((a, b) => a + b, 0) - 7) < .05, JSON.stringify(d)); }
  assert.notDeepEqual(plain(P.dash(0)), plain(P.dash(P.JEDA * 5)));
  assert.match(src, /id: "alir-garis", type: "line"[^]*?"line-color": gl \? "#5aa6e8" : "#3f86cf"/, "garis tengah biru tua tanpa dash");
  assert.ok(!/id: "alir-garis"[^]*?line-dasharray[^]*?id: "alir-gerak"/.test(src), "garis tengah tidak berdash");
  assert.match(src, /id: "alir-gerak"[^]*?"line-blur": 1/);
  const pk = fs.readFileSync("public/banjir/peta.js", "utf8");
  assert.match(pk, /"fill-opacity": \["interpolate", \["linear"\], \["zoom"\], 10/); assert.match(pk, /"raster-opacity": \["interpolate", \["linear"\], \["zoom"\], 10, \.75, 13, \.15\]/);
});

test("t null tidak pecah; pantauan terbatas seperti riwayat kurang; jam dan kaki panel", () => {
  assert.equal(P.waktuBaca(null), "–"); assert.equal(P.lalu(null, 1e6), "–");
  assert.equal(P.warna("pantauan_terbatas"), P.warna("riwayat_kurang")); assert.ok(!P.redup("pantauan_terbatas")); assert.equal(P.nama("pantauan_terbatas"), "Pantauan terbatas");
  assert.equal(P.kelas({status: "pantauan_terbatas"}), "Normal"); assert.equal(P.geojson([{id: "1", x: 0, y: 0, v: 1, status: "pantauan_terbatas"}]).features[0].properties.i, "pantauan_terbatas");
  assert.equal(P.jamWib(Date.UTC(2026, 9, 27, 9, 5) / 1000), "16.05");
  assert.equal(P.kakiPanel([{t: Date.UTC(2026, 9, 27, 9, 0) / 1000}, {t: Date.UTC(2026, 9, 27, 8, 0) / 1000, pengelola: "DSDA DKI"}]), "Sumber: Kementerian PU, Ditjen SDA (SIHKA), DSDA DKI, dibaca terbaru 16.00 WIB");
  assert.equal(P.kakiPanel([]), "");
});

test("INP statis: sakelar pos menunda lapisan, animasi lewati saat peta bergerak, grafik tahan balapan, segar ulang lengkap", () => {
  assert.match(src, /tampil\(on\) {[^]*aria-busy[^]*nanti\(\(\) => { this\.lapisan\(on\); this\.daftar\(\)/);
  assert.match(src, /if \(peta\.isMoving\(\)\) return;/); assert.match(src, /if \(this\._g !== x\.id\) return;/); assert.match(src, /this\._g = x\.id;/);
  assert.match(src, /PosUkur\.ruas\(\); PosUkur\.daftar\(\);/);
});

test("pos per provinsi (point in polygon) dan selisih ke batas Siaga berikutnya", () => {
  const kotak = {type: "Polygon", coordinates: [[[100, -1], [102, -1], [102, 1], [100, 1], [100, -1]]]}, mp = {type: "MultiPolygon", coordinates: [kotak.coordinates]};
  const ps = [{id: "a", lon: 101, lat: 0}, {id: "b", lon: 103, lat: 0}, {id: "c", lon: 101.5, lat: .9}];
  assert.deepEqual(plain(P.dalam(ps, kotak)).map(p => p.id), ["a", "c"]); assert.equal(P.dalam(ps, mp).length, 2); assert.deepEqual(P.dalam(ps, null), []);
  const A = {siaga3: 50, siaga2: 100, siaga1: 150};
  assert.deepEqual(plain(P.menujuBatas({v: 33, satuan: "cm", ambang: A})), {nama: "Siaga 3", cm: 17});
  assert.deepEqual(plain(P.menujuBatas({v: .8, satuan: "m", ambang: A})), {nama: "Siaga 2", cm: 20});
  assert.equal(P.menujuBatas({v: 200, satuan: "cm", ambang: A}), null); assert.equal(P.menujuBatas({v: 5, satuan: "cm"}), null);
});

test("normalisasi satuan ke cm: m, mm, centimeter; null, m3/s, mdpl tanpa angka; negatif tetap", () => {
  const t = (v, satuan) => P.teksPos({v, satuan});
  assert.equal(t(2.93, "m"), "293 cm"); assert.equal(t(2930, "mm"), "293 cm"); assert.equal(t(293, "cm"), "293 cm"); assert.equal(t(293, "centimeter"), "293 cm");
  assert.equal(t(-1.11, "m"), "-111 cm"); assert.equal(t(97.01, "m"), "9.701 cm");
  for (const s of [null, "m3/s", "m³/s", "mdpl"]) assert.equal(t(5, s), "–", String(s));
  assert.equal(t(null, "m"), "–");
  assert.equal(P.ketAngka({v: 5, satuan: null}), "Satuan tidak jelas"); assert.equal(P.ketAngka({v: 5, satuan: "mdpl"}), "Bukan tinggi air");
  assert.equal(P.ketAngka({v: 5, satuan: "m"}), ""); assert.equal(P.ketAngka({v: null, satuan: null}), "");
  assert.equal(P.deltaPos({d3: 0.1, satuan: "m"}), "▲ 10 cm"); assert.equal(P.deltaPos({d3: -20, satuan: "mm"}), "▼ 2 cm"); assert.equal(P.deltaPos({d3: 1, satuan: null}), "–");
  assert.equal(P.arah(0.1, "m"), "naik 10 cm"); assert.equal(P.arah(1, "mdpl"), "");
  const g = plain(P.geojson([{id: "1", x: 0, y: 0, v: 1.5, satuan: "m", status: "biasa"}, {id: "2", x: 0, y: 0, v: 9, satuan: null, status: "biasa"}]));
  assert.equal(g.features[0].properties.a, "150 cm"); assert.equal(g.features[1].properties.a, "");
});

test("pin pos tidak tersingkir, pos terpilih tersorot (statis)", () => {
  assert.match(src, /id: "pos", type: "symbol"[^\n]*minzoom: 7[^\n]*"icon-allow-overlap": true, "icon-ignore-placement": true/);
  assert.match(src, /id: "pos-pilih", type: "symbol"[\s\S]*?"icon-size"[\s\S]*?1\.15/);
  assert.match(src, /id: "pos-pilih-angka"[\s\S]*?"text-allow-overlap": true/);
  assert.ok(src.indexOf('id: "pos-pilih"') > src.indexOf('id: "pos-angka"'), "pos-pilih di atas pin dan angka");
  assert.match(src, /strokeStyle = "#000"; g\.lineWidth = 2\.5/);
});
