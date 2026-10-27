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

test("dasharray bergeser dan fase denyut dalam 0..1, jeda sekitar 5,5 fps", () => {
  assert.notDeepEqual(plain(P.dash(0)), plain(P.dash(P.JEDA))); assert.deepEqual(plain(P.dash(0)), plain(P.dash(P.JEDA * 14)));
  for (const t of [0, 500, 1799, 99999]) { const x = P.fase(t); assert.ok(x >= 0 && x < 1); }
  assert.equal(P.JEDA, 180, "separuh kecepatan: dua kali jeda lama (90)");
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
  assert.match(h, /data-l="pos" checked/); for (const k of ["sungai", "rob", "kejadian"]) assert.match(h, new RegExp(`data-l="${k}" checked`), `${k} menyala bawaan`); assert.match(h, /<script src="pos_air\.js">/);
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
  assert.deepEqual(g[0], ["Cirarab", ["1", "2"]]); assert.ok(g.some(([k]) => k === "Bogor")); assert.ok(g.some(([k]) => k === "Tanpa nama sungai"));
  assert.equal(P.arah(1.5, "cm"), "naik 1,5 cm"); assert.equal(P.arah(-2, "cm"), "turun 2 cm"); assert.equal(P.arah(null, "cm"), ""); assert.equal(P.arah(0, "cm"), "");
  assert.equal(P.subjudul(kumpul[0]), "Cirarab, Tangerang"); assert.equal(P.subjudul({}), "SIHKA"); assert.equal(P.subjudul({kota: "Kota Administrasi Jakarta Timur", pengelola: "Dinas Sumber Daya Air DKI Jakarta (DSDA)"}), "Jakarta Timur, DSDA DKI");
  assert.equal(P.subjudul({sumber: "SIHKA"}, "Kota Bogor"), "Bogor, SIHKA"); assert.equal(P.namaPendek("Kabupaten Bogor"), "Bogor"); assert.equal(P.namaPendek("Kab. Maybrat"), "Maybrat");
});

test("skala tegak: pita dan garis air", () => {
  assert.equal(P.skalaGeom(kumpul[2]), null);
  const g = plain(P.skalaGeom(kumpul[1]));
  assert.deepEqual(g.pita.map(t => t.nama), ["Normal", "Siaga 3", "Siaga 2", "Siaga 1"]);
  assert.ok(g.yAir < g.pita[1].y1 && g.yAir > g.pita[1].y0, "120 cm berada di pita Siaga 3");
  assert.ok(g.pita[0].y1 === g.H && g.pita[3].y0 === 0, "pita menutup seluruh tinggi");
});

test("ruas sungai berlapis: tanpa nama tiga cincin 1,5/1/0,5 km; bernama tiga cincin 4,5/3/1,5 km; Normal dan macet tidak diwarnai", () => {
  const tanpa = plain(P.ruasLapis(kumpul));
  assert.deepEqual([...new Set(tanpa.map(x => x.kelas))].sort(), ["Siaga 1", "Siaga 3", "naik"]); assert.ok(tanpa.every(x => x.nama === null)); assert.deepEqual([...new Set(tanpa.map(x => x.lapis))].sort(), [0, 1, 2, 3]);   /* pemilik 27 Okt: gradasi kuning ke merah juga di sungai tanpa nama */
  const ring = tanpa.find(x => x.kelas === "Siaga 1" && x.lapis === 3).g.coordinates[0][0]; assert.equal(ring.length, 17); assert.deepEqual(ring[0], ring[16]); assert.ok(Math.abs(ring[0][0] - .5 / 111.32) < .001, "cincin dalam 0,5 km di khatulistiwa"); assert.ok(Math.abs(tanpa.find(x => x.kelas === "Siaga 1" && x.lapis === 0).g.coordinates[0][0][0][0] - 2 / 111.32) < .001, "cincin terluar 2 km (6/3)");
  const bernama = plain(P.ruasLapis(kumpul, p => "Ciliwung")).filter(x => x.kelas === "Siaga 1");
  assert.deepEqual(bernama.map(x => x.lapis).sort(), [0, 1, 2, 3]); assert.ok(bernama.every(x => x.nama === "Ciliwung"));
  const r = l => Math.abs(bernama.find(x => x.lapis === l).g.coordinates[0][0][0][0]) * 111.32; assert.ok(Math.abs(r(0) - 6) < .1 && Math.abs(r(1) - 4.5) < .1 && Math.abs(r(2) - 3) < .1 && Math.abs(r(3) - 1.5) < .1);
  assert.deepEqual(plain(P.ruasLapis([kumpul[3], kumpul[4]])), []);
});

test("terdekatNama: pilih garis bernama terdekat dari pin, abaikan tanpa nama", () => {
  const f = (name, c) => ({properties: name ? {name} : {}, geometry: {type: "LineString", coordinates: c}});
  assert.equal(P.terdekatNama([f("Jauh", [[1, 1], [1, 2]]), f("Dekat", [[0.001, 0], [0.002, 1]]), f(null, [[0, 0]])], 0, 0), "Dekat");
  assert.equal(P.terdekatNama([], 0, 0), null);
});

test("kartu pos: Title Case tampilan, waktu baca ringkas, angka cm satu desimal", () => {
  assert.equal(P.judulPos("CIPINANG HILIR"), "Cipinang Hilir"); assert.equal(P.judulPos("BTB PDAM BUARAN"), "BTB Pdam Buaran"); assert.equal(P.judulPos("Katulampa"), "Katulampa"); assert.equal(P.judulPos(null), "");
  assert.equal(P.waktuBacaRingkas(Date.UTC(2026, 9, 27, 11, 0) / 1000), "Sel, 27 Okt 18.00 WIB"); assert.equal(P.waktuBacaRingkas(null), "–");
  assert.equal(P.cmTeks({v: 198.6, satuan: "cm"}), "198,6 cm"); assert.equal(P.cmTeks({v: 0.52, satuan: "m"}), "52 cm");
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
  assert.match(src, /id: "alir-garis", type: "line"[^]*?"line-color": gl \? "#6fb2ea" : "#4f95d6"/, "garis tengah biru tanpa dash, tebal sejak zoom jauh");
  assert.ok(!/id: "alir-garis"[^]*?line-dasharray[^]*?id: "alir-gerak"/.test(src), "garis tengah tidak berdash");
  assert.match(src, /id: "alir-gerak"[^]*?"line-width": lebar\(/, "kilau aliran selebar badan air (pemilik 27 Okt, seperti Oyenza)");
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
  assert.match(src, /id: "pos-pilih", type: "symbol"[\s\S]*?"icon-size"[\s\S]*?1\.25/);
  assert.match(src, /id: "pos-pilih-angka"[\s\S]*?"text-allow-overlap": true/);
  assert.ok(src.indexOf('id: "pos-pilih"') > src.indexOf('id: "pos-angka"'), "pos-pilih di atas pin dan angka");
  assert.match(src, /strokeStyle = "#000"; g\.lineWidth = 2\.5/);
});

test("angka cm: zoom 11 ke atas semua tampil tanpa tabrakan; pasut berlabel prediksi sekarang", () => {
  assert.match(src, /\["pos-angka-semua", 11, 24, true\]/); assert.match(src, /"text-allow-overlap": true, "text-ignore-placement": true/);
  assert.match(src, /\["pos-angka", 8\.5, 11, false\]/); assert.match(src, /"symbol-sort-key": \["get", "u"\]/);
  assert.match(src, /\["pasut-angka-semua", 11, 24, true\]/);
  const st = {deret: {t0: "2026-10-27 00:00", langkah_menit: 60, cm: [10, -21, 35]}};
  assert.equal(P.pasutTeks(st, P.wibDetik("2026-10-27 01:00")), "\u221221 cm"); assert.equal(P.pasutTeks(st, P.wibDetik("2026-10-27 00:00")), "10 cm");
  assert.equal(P.pasutTeks({}, 0), "");
});

test("kelompok: tanpa sungai dan kab jatuh ke kabupaten terdekat dari pusat kecamatan, jauh dari semuanya tetap Tanpa nama sungai", () => {
  const pusat = {"31|Kota Jakarta Utara|Tanjung Priok": [-6.12, 106.88], "32|Bogor|Cibinong": [-6.48, 106.85]};
  const mk = (id, lat, lon, ex = {}) => ({id, nama: id, lat, lon, status: "biasa", ...ex});
  assert.equal(P.kabTerdekat(mk("a", -6.13, 106.9), pusat), "31|Kota Jakarta Utara");
  assert.equal(P.kabTerdekat(mk("b", -6.5, 106.8), pusat), "32|Bogor");
  assert.equal(P.kabTerdekat(mk("c", 0, 120), pusat), null); assert.equal(P.kabTerdekat(mk("d", 0, 0), null), null);
  assert.equal(P.labelKab("Bogor"), "Bogor"); assert.equal(P.labelKab("Kota Administrasi Jakarta Timur"), "Jakarta Timur");
  const g = plain(P.kelompok([mk("a", -6.13, 106.9), mk("b", -6.5, 106.8), mk("c", 0, 120), mk("e", -6.5, 106.8, {sungai: "Ciliwung"}), mk("f", 0, 0, {kab: "X"})], p => P.kabTerdekat(p, pusat))).map(([k, l]) => [k, l.length]);
  assert.deepEqual(Object.fromEntries(g), {"Jakarta Utara": 1, "Bogor": 1, "Tanpa nama sungai": 1, "Ciliwung": 1, "X": 1});
  assert.equal(plain(P.kelompok([mk("a", 0, 0)])).at(0)[0], "Tanpa nama sungai", "tanpa cari: perilaku lama");
});

test("pasut: deret satu datum dengan puncak (MSL); berkas lama berdatum HAT ditolak; data nyata pasut.json tidak pernah salah jauh", () => {
  const st = {puncak: [{t: "2026-10-27T10:00+07:00", cm: 53, jenis: "tinggi"}], deret: {t0: "2026-10-27T00:00+07:00", langkah_menit: 60, cm: [-26, -24, -20, -15, -8, 2, 13, 27, 41, 51, 53, 49]}};
  assert.ok(P.deretSelaras(st)); assert.equal(P.pasutSekarang(st, P.wibDetik("2026-10-27 10:00")).cm, 53);
  const hat = {...st, deret: {...st.deret, cm: st.deret.cm.map(c => c - 73)}};
  assert.ok(!P.deretSelaras(hat)); assert.equal(P.pasutSekarang(hat, P.wibDetik("2026-10-27 10:00")), null); assert.equal(P.pasutTeks(hat, P.wibDetik("2026-10-27 10:00")), "");
  const j = JSON.parse(fs.readFileSync("public/banjir/data/pasut.json", "utf8"));
  for (const s of j.stasiun) { const now = P.wibDetik(s.deret?.t0 || "2026-10-27T00:00+07:00") + 3600 * 5.5, k = P.pasutSekarang(s, now); if (!k) continue;
    const pk = (s.puncak || []).map(x => x.cm); assert.ok(k.cm >= Math.min(...pk) - 25 && k.cm <= Math.max(...pk) + 25, `${s.nama} ${k.cm} di luar puncak ${Math.min(...pk)}..${Math.max(...pk)}`); }
});

test("panel pos: pil, tooltip ambang, batang tiga tik, urutan grup (fixture berambang)", () => {
  const amb = {siaga3: 190, siaga2: 270, siaga1: 310};
  const x = {id: "1", nama: "Katulampa", v: 239.5, satuan: "cm", status: "naik_di_atas_biasa", status_resmi: "Siaga 3", ambang: amb, sungai: "Ciliwung"};
  assert.equal(P.pilLabel(x), "Siaga 3"); assert.equal(P.pilLabel({status: "biasa"}), "Tanpa batas"); assert.equal(P.pilLabel({status: "lama"}), "Data lama"); assert.equal(P.pilLabel({status: "macet"}), "Macet");
  assert.equal(P.tipAmbang(x), "Siaga 3 190 cm, Siaga 2 270 cm, Siaga 1 310 cm, sekarang 239,5 cm (30,5 cm di bawah batas Siaga 2)");
  assert.match(P.tipAmbang({...x, v: 330}), /20 cm di atas batas Siaga 1/); assert.equal(P.tipAmbang({status: "biasa"}), null);
  assert.match(P.tipAmbang({...x, v: null}), /^Siaga 3 190 cm, Siaga 2 270 cm, Siaga 1 310 cm$/);
  assert.match(P.tipAmbang({...x, v: 2.395, satuan: "m"}), /sekarang 239,5 cm/, "satuan m dinormalkan");
  const b = plain(P.batangAmbang(x)); assert.equal(b.tik.length, 3); assert.deepEqual(b.tik.map(t => t.nama), ["Siaga 3", "Siaga 2", "Siaga 1"]);
  assert.ok(b.tik[0].pos < b.tik[1].pos && b.tik[1].pos < b.tik[2].pos && b.isi > 0 && b.isi < 100); assert.equal(P.batangAmbang({status: "biasa"}), null);
  const mk = (id, ex) => ({id, nama: id, x: 0, y: 0, status: "biasa", ...ex});
  const g = plain(P.kelompok([mk("a", {sungai: "Besar"}), mk("b", {sungai: "Besar"}), mk("c", {sungai: "Besar"}), mk("d", {sungai: "Kecil", status: "naik_di_atas_biasa"}), mk("e", {sungai: "Kecil2", status_resmi: "Siaga 2", ambang: amb})])).map(([k]) => k);
  assert.deepEqual(g, ["Kecil", "Kecil2", "Besar"], "grup berpos Siaga atau naik dulu");
});

test("arah aliran: sorot dash maju searah titik garis (hulu ke hilir) tiap langkah; panah rantai zoom 12 ke atas", () => {
  /* awal dash dalam pola 7 piksel: [0,g,DS,..] mulai di g; pola terbungkus [a,T-DS,DS-a] mulai di a+T-DS */
  const awal = p => p.length === 4 ? p[1] : p[0] + p[1], T = 7, N = 14, tiap = T / N;
  for (let k = 0; k < N; k++) { const a = awal(plain(P.dash(k * P.JEDA))), b = awal(plain(P.dash((k + 1) * P.JEDA))), d = (((b - a) % T) + T) % T;
    assert.ok(Math.abs(d - tiap) < .05, `langkah ${k}: maju ${d}, bukan ${tiap} (terbalik bila mendekati ${T - tiap})`); }
  assert.ok(!/addLayer\(\{id: "alir-panah"/.test(src) && !/Panah = arah aliran/.test(src));   /* panah dicabut pemilik 27 Okt */
});

test("kartu pasut: kurva 24 jam satu datum, minus sejati, tabel tiga kolom rata kanan, pil berikon", () => {
  const st = {puncak: [{t: "2026-10-27T10:00+07:00", cm: 53, jenis: "tinggi"}, {t: "2026-10-27T16:00+07:00", cm: -37, jenis: "rendah"}], deret: {t0: "2026-10-27T00:00+07:00", langkah_menit: 60, cm: [-26, -24, -20, -15, -8, 2, 13, 27, 41, 51, 53, 49, 42, 32, 20, 7, -7, -19, -30, -36, -37, -34, -33, -35, -30, -20, -10, 5, 20, 30, 40, 45, 50]}};
  const now = P.wibDetik("2026-10-27 06:00"), kv = plain(P.pasutKurva(st, now));
  assert.equal(kv.pts.length, 25); assert.equal(kv.pts[0].cm, 13); assert.deepEqual(kv.puncak.map(x => x.cm), [53, -37]);
  assert.equal(P.pasutKurva({...st, deret: {...st.deret, cm: st.deret.cm.map(c => c - 73)}}, now), null, "datum HAT ditolak"); assert.equal(P.pasutKurva({}, now), null);
  assert.equal(P.cmMinus(-24), "−24"); assert.equal(P.cmMinus(11), "11"); assert.equal(P.cmMinus(null), "–");
  assert.match(src, /class="pa-v">\$\{PosAir\.cmMinus\(x\.cm\)\}<\/span><span class="pa-u">cm/); assert.match(src, /Pasang: "M3 17l6-6/); assert.match(src, /Surut: "M3 7l6 6/);
  assert.match(fs.readFileSync("public/banjir/pos_air.css", "utf8"), /\.pa-pk \.n\{[^}]*tabular-nums/);
  assert.ok(!/\$\{x\.jenis\}, \$\{x\.hari\}/.test(src), "tanpa koma penghubung label dan hari");
});

test("sorotan pos terpilih: halo, cincin putih, cincin luar, denyut sekali, label berlatar putih tebal", () => {
  for (const id of ["pos-pilih-halo", "pos-pilih-cincin", "pos-pilih-luar"]) assert.match(src, new RegExp(`id: "${id}", type: "circle"`));
  assert.match(src, /"text-halo-width": 4\.5/); assert.match(src, /PosUkur\._denyut = null/); assert.match(src, /"pos-pilih-halo", "pos-pilih-cincin", "pos-pilih-luar"/);
});

test("pil berikon garis, bukan titik bullet: tiap label punya ikon; pil pos dan pasut memakai pa-pil", () => {
  for (const l of ["Normal", "Siaga 3", "Siaga 2", "Siaga 1", "Data lama", "Macet", "Tanpa batas", "Tanpa batas resmi", "Naik di atas biasa"]) assert.match(P.ikonPil(l), /<svg[^>]*><path d="M/, l);
  assert.match(P.ikonPil("tak dikenal"), /M5 12h14/, "cadangan garis datar");
  assert.match(src, /class="pill pa-pil"/); assert.ok(!/<span class="pill" style=/.test(src.slice(src.indexOf("/* ---------- bagian peta"))), "tak ada pil titik di bagian peta");
  assert.match(fs.readFileSync("public/banjir/pos_air.css", "utf8"), /\.pill\.pa-pil::before\{display:none\}/);
});

test("ikon pil pasut dibungkus <path>, bukan data path telanjang", () => { assert.match(src, /aria-hidden="true"><path d="\$\{IK\[n\]\}"\/><\/svg>/); });

test("batang ambang hanya untuk pos berambang dan berangka; kapsul besar sesuai rasio; baris sebaris", () => {
  const amb = {siaga3: 190, siaga2: 270, siaga1: 310};
  assert.equal(P.batangAmbang({status: "biasa", v: 5, satuan: "cm"}), null, "tanpa ambang: tanpa batang"); assert.equal(P.batangAmbang({ambang: amb, v: null, satuan: "cm"}), null, "tanpa angka: tanpa batang");
  const b = plain(P.batangAmbang({ambang: amb, v: 155, satuan: "cm"})); assert.ok(b.isi > 30 && b.isi < 60 && b.tik.length === 3);
  assert.match(src, /class="pa-kp"/); assert.match(src, /<span class="pa-ang"/); assert.ok(src.indexOf("${this.pilPos(x)}<span class=\"pa-ang\"") > 0, "pil di kiri angka");
  const css = fs.readFileSync("public/banjir/pos_air.css", "utf8"); assert.match(css, /\.pa-kp\{[^}]*width:14px;height:26px/); assert.match(css, /\.pa-baris\{[^}]*grid-template-columns:auto minmax\(0,1fr\) auto 78px/);
});

test("kelompok wilayah: nama pendek, bentrok Kota dan Kabupaten memakai nama lengkap; pos_sungai.json dimuat malas; judul grup 14px tanpa kotak", () => {
  const mk = (id, kab, ex = {}) => ({id, nama: id, x: 0, y: 0, status: "biasa", kab, ...ex});
  const g = plain(P.kelompok([mk("a", "Kota Administrasi Jakarta Timur"), mk("b", "Kota Depok"), mk("c", "Kota Bogor"), mk("d", "Kabupaten Bogor")])).map(([k]) => k).sort();
  assert.deepEqual(g, ["Depok", "Jakarta Timur", "Kabupaten Bogor", "Kota Bogor"]);
  assert.match(src, /muatSungai\(\) \{ return this\._sg \|\|= fetch\("data\/pos_sungai\.json"/); assert.match(src, /nanti\(\(\) => this\.muatSungai\(\)\)/);
  assert.match(src, /i < 4 \|\| l\.some\(PAN\)/, "4 grup teratas dan grup berpos Siaga/naik terbuka");
  assert.match(src, /PosAir\.pengelolaSingkat\(l\[0\]\)/);
  assert.match(fs.readFileSync("public/banjir/pos_air.css", "utf8"), /\.pa-grup>summary b\{font-size:14px\}/);
  assert.ok(!/Sumber: \$\{D\.sumber/.test(fs.readFileSync("public/banjir/wilayah.js", "utf8")), "nama berkas internal tidak tampil");
});

test("badan air: jenis, luas kira-kira, pos terdekat; lapisan air-poligon dan sorot; klik dipasang di peta.js", () => {
  assert.equal(P.jenisAir("lake", "Situ Gintung"), "Situ"); assert.equal(P.jenisAir("lake", "Waduk Jatiluhur"), "Waduk"); assert.equal(P.jenisAir("reservoir", null), "Waduk"); assert.equal(P.jenisAir("lake", null), "Danau"); assert.equal(P.jenisAir("pond", "X"), "Kolam"); assert.equal(P.jenisAir("aneh"), "Badan air");
  const kotak = (lo, la, d) => ({type: "Polygon", coordinates: [[[lo, la], [lo + d, la], [lo + d, la + d], [lo, la + d], [lo, la]]]});
  const ha = P.luasHa(kotak(106, -6, .01)); assert.ok(ha > 120 && ha < 130, `1,1 km x 1,1 km sekitar 122 ha: ${ha}`);
  assert.ok(P.luasHa({type: "Polygon", coordinates: [kotak(106, -6, .02).coordinates[0], kotak(106.005, -5.995, .01).coordinates[0]]}) < P.luasHa(kotak(106, -6, .02)), "lubang dikurangi"); assert.equal(P.luasHa(null), 0);
  const d = plain(P.posTerdekat([{id: "a", x: 0, y: 0, lon: 106.8, lat: -6.2}, {id: "b", lon: 107.5, lat: -6.2}], 106.81, -6.2)); assert.equal(d.pos.id, "a"); assert.ok(d.km > .9 && d.km < 1.3); assert.equal(P.posTerdekat([], 0, 0), null);
  assert.match(src, /id: "air-poligon", type: "fill", source: sumber, "source-layer": "water"/); assert.match(src, /id: "air-sorot"/); assert.match(src, /klikAir\(e\) \{/);
  assert.match(fs.readFileSync("public/banjir/peta.js", "utf8"), /PosUkur\.klikAir\(e\)\) return/);
});

test("batch tampilan: prakiraan 4 hari sebaris, tabel prakiraan pil+persen sebaris dan kepala putih tengah, pita BMKG di bawah Overlay, tabel bahaya berikon", () => {
  const css = fs.readFileSync("public/banjir/pos_air.css", "utf8"), pk = fs.readFileSync("public/banjir/peta.js", "utf8");
  assert.match(css, /\.grid\.g4\.pa-4\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/); assert.match(pk, /class="grid g4 pa-4"/);
  assert.match(css, /\.laci table\.tb3 td small\{display:inline/); assert.match(css, /table\.tb3 thead th\{[^}]*color:#fff;text-align:center/);
  assert.match(css, /\.tools \.db-bmkg\{order:99;width:100%/);
  assert.match(pk, /function tabelBahaya\(bh\)/); assert.match(pk, /<th>Bahaya<\/th><th>Indeks<\/th><th>Kelas<\/th>/); assert.match(pk, /title="Sampel raster InaRISK BNPB di titik tengah kecamatan\."/);
  assert.ok(!/<p class="fnd">Sampel raster InaRISK/.test(pk), "kalimat sampel pindah ke tooltip");
});

test("kartu hover pos dan pasut: nama, sub, badan angka+pil, tanpa label generik di kepala; tabel puncak empat kolom berkepala gelap", () => {
  const css = fs.readFileSync("public/banjir/pos_air.css", "utf8");
  const i = src.indexOf("  kartuHover(x) {"), j = src.indexOf("kartuHoverPasut(s) {"), h = src.slice(i, j);
  assert.match(h, /class="pa-hv-n"/); assert.match(h, /class="pa-hv-s"/); assert.match(h, /class="pa-hv-b"/); assert.ok(!/Pos tinggi air/.test(h), "tanpa label Pos tinggi air di kartu hover"); assert.ok(!/PI\.kartuTip/.test(h));
  assert.match(src, /peta\.on\("mousemove", "pasut"/); assert.match(css, /\.pa-hv\{width:260px/);
  assert.match(src, /<th>Jenis<\/th><th>Hari<\/th><th>Jam<\/th><th>Tinggi<\/th>/);
});

test("laju naik cm/jam: dari d3 per 3 jam, satuan dinormalkan, pos mati tanpa laju", () => {
  const p = (d3, ex = {}) => ({id: "a", x: 0, y: 0, v: 100, satuan: "cm", status: "biasa", d3, ...ex});
  assert.equal(P.lajuD3(p(72)), 24); assert.equal(P.lajuD3(p(.6, {satuan: "m"})), 20); assert.equal(P.lajuD3(p(null)), null);
  assert.equal(P.lajuD3(p(30, {status: "lama"})), null); assert.equal(P.lajuD3(p(30, {satuan: "m3/s"})), null);
  assert.equal(P.lajuTeks(24), "+24 cm/jam"); assert.equal(P.lajuTeks(-5), "−5 cm/jam"); assert.equal(P.lajuTeks(.2), "tetap"); assert.equal(P.lajuTeks(null), "–");
  assert.equal(P.lajuTeks(7.4), "+7 cm/jam", "bulat, tanpa presisi palsu"); assert.equal(P.lajuTeks(.4), "tetap");
});

test("tingkat cincin laju: 0 di bawah 3, 1 sampai 10, 2 sampai 20, 3 di atas 20; turun dan null tanpa cincin", () => {
  const t = P.lajuTingkat;
  assert.deepEqual([null, undefined, -30, 0, 2.9].map(t), [0, 0, 0, 0, 0]);
  assert.deepEqual([3, 10, 10.1, 20, 20.1, 80].map(t), [1, 1, 2, 2, 3, 3]);
  const g = (d3, ex) => P.geojson([{id: "a", nama: "A", x: 0, y: 0, v: 50, satuan: "cm", status: "biasa", status_resmi: "Normal", d3, ...ex}]).features[0].properties;
  assert.equal(g(75).l, 3); assert.equal(g(75).u, 0, "naik cepat menang tabrakan label");
  assert.equal(g(0).l, 0); assert.equal(g(-30).l, 0); assert.equal(g(75, {status: "macet"}).l, 0);
  /* Normal naik cepat harus lebih tebal daripada Siaga 3 yang diam: Siaga 3 diam hanya cincin denyut 2 px, tingkat 2 ke atas 4,5 px */
  assert.equal(g(0, {status_resmi: "Siaga 3"}).l, 0); assert.equal(g(0, {status_resmi: "Siaga 3"}).p, 1);
  assert.match(src, /"circle-stroke-width": \["match", \["get", "l"\], 3, 7, 2, 4\.5, 2\.5\]/);
  assert.match(src, /id: "pos-laju", type: "circle", source: "pos"/, "lapisan circle berbasis properti, bukan DOM per pin");
  assert.ok(P.WARNA_LAJU[3] === "#c9503a" && P.WARNA_LAJU[1] !== P.WARNA_LAJU[3]);
});

test("laju dari riwayat jam-an: bacaan paling awal dalam 3 jam, minimal selisih 1 jam", () => {
  const H = 3600, t0 = 1e9;
  assert.deepEqual(plain(P.lajuRiwayat([t0, t0 + H, t0 + 2 * H, t0 + 3 * H], [100, 120, 150, 190])), {laju: 30, jam: 3});
  assert.deepEqual(plain(P.lajuRiwayat([t0, t0 + 5 * H, t0 + 6 * H], [10, 40, 52])), {laju: 12, jam: 1}, "bacaan lebih tua dari 3 jam diabaikan");
  assert.equal(P.lajuRiwayat([t0, t0 + 600], [1, 5]), null, "kurang dari 1 jam");
  assert.equal(P.lajuRiwayat([t0], [1]), null); assert.equal(P.lajuRiwayat([t0, t0 + H], [1]), null);
  assert.equal(P.lajuRiwayat([t0, t0 + H, t0 + 2 * H], [90, 60, 30]).laju, -30);
});

const HH = JSON.parse(fs.readFileSync("public/banjir/data/hulu_hilir.json", "utf8"));
const wib = s => Date.parse(s + ":00+07:00") / 1000;
const posC = (id, ex) => ({id, nama: id, x: 0, y: 0, v: 50, satuan: "cm", status: "biasa", status_resmi: "Normal", d3: 0, t: wib("2026-10-28T17:00"), ...ex});

test("waktu tiba hilir = waktu baca hulu + jeda tengah, dibulatkan jam; label tanpa presisi palsu", () => {
  const now = wib("2026-10-28T17:30"), pos = [posC("d:116", {status_resmi: "Siaga 2", status: "naik_di_atas_biasa"}), posC("d:118"), posC("d:122")];
  const E = P.hituHuluHilir(HH, pos, now), dep = E.pos.get("d:118"), mgr = E.pos.get("d:122");
  assert.equal(dep.tiba, wib("2026-10-28T19:00")); assert.equal(mgr.tiba, wib("2026-10-29T02:00"), "Katulampa 17.00 + 9 jam");
  assert.equal(P.labelTiba(mgr), "± 9 jam tiba di Manggarai (hipotesis)"); assert.match(P.labelTiba(dep), /^± 2 jam tiba di Depok \(hipotesis\)$/);
  assert.equal(P.kalimatTiba(mgr, now), "Air dari hulu tiba sekitar pukul 02.00 WIB besok"); assert.equal(P.tibaTeks(dep.tiba, now), "pukul 19.00 WIB");
  assert.equal(mgr.dari, "d:116"); assert.equal(mgr.dariNama, "Katulampa"); assert.deepEqual(plain(mgr.jam), {min: 6, tengah: 9, maks: 12});
  assert.deepEqual(plain(mgr.segmen), ["d:118", "d:122"]); assert.ok(mgr.hipotesis);
  assert.ok(!/[·—]/.test(P.labelTiba(mgr)));
});

test("hitung mundur: hulu tenang tanpa perkiraan; Depok Siaga memajukan Manggarai; kiriman lama dibuang; hulu mati diabaikan", () => {
  const now = wib("2026-10-28T17:30");
  assert.equal(P.hituHuluHilir(HH, [posC("d:116"), posC("d:118"), posC("d:122")], now).ruas.length, 0);
  const dep = P.hituHuluHilir(HH, [posC("d:116", {status_resmi: "Siaga 3", status: "biasa", t: wib("2026-10-28T17:00")}), posC("d:118", {status_resmi: "Siaga 3", t: wib("2026-10-28T17:00")}), posC("d:122")], now);
  assert.equal(dep.pos.get("d:122").dari, "d:118", "pos hulu terdekat yang aktif dipakai"); assert.equal(dep.pos.get("d:122").tiba, wib("2026-10-29T00:00"));
  assert.equal(P.hituHuluHilir(HH, [posC("d:116", {status_resmi: "Siaga 1", t: wib("2026-10-27T00:00")}), posC("d:118"), posC("d:122")], now).ruas.length, 0, "tiba lebih dari 6 jam lalu");
  assert.equal(P.hituHuluHilir(HH, [posC("d:116", {status_resmi: "Siaga 1", status: "macet"}), posC("d:118")], now).ruas.length, 0);
  const cepat = P.hituHuluHilir(HH, [posC("d:116", {d3: 90}), posC("d:118")], now);   /* Normal tetapi 30 cm/jam */
  assert.ok(cepat.pos.has("d:118"), "naik cepat memicu walau Normal");
  const lewat = P.hituHuluHilir(HH, [posC("d:116", {status_resmi: "Siaga 2", t: wib("2026-10-28T10:00")}), posC("d:118")], now);
  assert.equal(P.labelTiba(lewat.pos.get("d:118")), "Air dari hulu semestinya sudah tiba di Depok (hipotesis)");
  assert.equal(P.tibaTeks(wib("2026-10-30T02:00"), now), "pukul 02.00 WIB, Jumat");
  const k = P.kotakRuas([106.83, -6.63], [106.84, -6.4]); assert.deepEqual(plain(k[0]), plain(k.at(-1))); assert.equal(k.length, 5);
});

test("hulu_hilir.json: tiap jeda punya sumber tertulis, jeda terurut, rantai nyambung, hipotesis menyala bila belum teruji", () => {
  assert.equal(HH.hipotesis, true);
  for (const sg of HH.sungai) {
    assert.ok(sg.nama && sg.nama_peta.length && sg.rantai.length >= 2);
    assert.equal(sg.ruas.length, sg.rantai.length - 1);
    sg.ruas.forEach((r, i) => { assert.equal(r.dari, sg.rantai[i].pos); assert.equal(r.ke, sg.rantai[i + 1].pos);
      assert.ok(r.sumber.length >= 1 && r.sumber.every(x => x.length > 20), `sumber ${r.dari}`); assert.ok(r.jam.min <= r.jam.tengah && r.jam.tengah <= r.jam.maks);
      assert.equal(typeof r.teruji, "boolean"); if (!r.teruji) assert.equal(HH.hipotesis, true); });
    assert.ok(sg.total.sumber.length >= 1);
    const jml = sg.ruas.reduce((a, r) => a + r.jam.tengah, 0); assert.ok(jml >= sg.total.jam.min && jml <= sg.total.jam.maks, "jumlah ruas jatuh dalam rentang literatur");
    assert.ok(sg.uji_replay.pengamatan.length >= 1 && sg.uji_replay.kesimpulan);
  }
  assert.ok(!/[·—]/.test(JSON.stringify(HH)));
  assert.match(src, /alir-hulu"[^}]*"line-dasharray"/, "ruas hulu memakai pola dash yang sama"); assert.match(src, /pa-panah/);
  assert.match(fs.readFileSync("public/banjir/pos_air.css", "utf8"), /\.pill\.pa-hip\{/);
});
