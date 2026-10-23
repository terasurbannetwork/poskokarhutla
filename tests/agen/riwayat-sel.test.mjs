// Tren lokasi & prakiraan di laci cluster (public/riwayat_sel.js): kunci ubin harus sama dengan scripts/data/riwayat_sel.py,
// prakiraan sisa hari memakai episode yang sudah bertahan selama umur api, dan saran hanya muncul bila datanya mendukung.
import {test} from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync, existsSync} from "node:fs";

const ctx = vm.createContext({window: {}});
vm.runInContext(readFileSync(new URL("../../public/riwayat_sel.js", import.meta.url), "utf8"), ctx);
const R0 = ctx.window.RiwayatSel;   // objek dari realm vm lain: disalin supaya deepEqual membandingkan isi, bukan prototipe
const R = {kunci: (...x) => structuredClone(R0.kunci(...x)), analisa: (...x) => structuredClone(R0.analisa(...x)), html: R0.html, faktor: (...x) => structuredClone(R0.faktor(...x))};
const meta = {th0: 2012, sd: "2026-10-12"};
// 2012..2026: El Niño 2015/2019/2023 besar; 2026 s.d. 12 Okt sudah 800
const rec = {y: [1, 1, 4, 1272, 0, 0, 1, 300, 0, 0, 0, 200, 0, 1, 800], yd: [1, 1, 1, 718, 0, 0, 0, 250, 0, 0, 0, 150, 0, 1, 800],
  m: [0, 0, 0, 1, 0, 1, 0, 10, 291, 1772, 3, 1], r: [2, 3, 5, 10, 12, 20, 50], k: 2, x: [6, 9], v: [314, 0.5, 1.8, 49], s: [244, 305], nm: 52, f: 3.4};

test("kunci ubin dan sel sama dengan pipeline (K0001 Seruyan)", () => {
  assert.deepEqual(R.kunci(-3.1201, 112.12), {ubin: "17_9", sel: "352_192"});
});

test("ubin hasil pipeline memuat sel pusat cluster contoh", { skip: !existsSync("public/data/riwayat_sel/17_9.json") }, () => {
  const d = JSON.parse(readFileSync("public/data/riwayat_sel/17_9.json", "utf8"));
  assert.ok(d.c["353_192"], "rekaman sel 353_192 hilang dari ubin 17_9");
  assert.equal(d.c["353_192"].y.length, new Date(d.sd).getUTCFullYear() - d.th0 + 1, "panjang seri tahunan tidak cocok th0..sd");
});

test("fakta: kekerapan, tahun ini vs rata-rata, El Niño", () => {
  const a = R.analisa(rec, meta, {hari: 7, wd: 135, ws: 20, gambut: true, dc: 700, teramati: true}, "El Niño");
  assert.match(a.fakta[0], /Terbakar 3 dari 14 tahun/);
  assert.equal(a.tahunIni.peringkat, 1, "800 titik s.d. 12 Okt lebih tinggi dari semua tahun lalu");
  assert.ok(a.fakta.some(f => /tahun El Niño .*2026 juga tahun El Niño/.test(f)));
});

test("prakiraan: sisa hari dari episode yang sudah bertahan >= umur api", () => {
  const a = R.analisa(rec, meta, {hari: 10, wd: 135, ws: 20}, null);
  // episode >= 10 hari: 10, 12, 20, 50 -> median 16 -> sisa 6
  assert.equal(a.lama.sisa, 6);
  assert.deepEqual(a.prakira.find(x => x[0] === "Arah jalar hari ini").slice(0, 2), ["Arah jalar hari ini", "ke barat laut"]);
  assert.equal(a.sisaMusim, 305 - 285);
});

test("saran DITOLAK bila data tidak mendukung", () => {
  const sepi = {y: Array(15).fill(0), yd: Array(15).fill(0), m: Array(12).fill(0), r: [], nm: 0, f: 0};
  sepi.y[3] = 25; sepi.m[8] = 25;
  const a = R.analisa(sepi, meta, {hari: 1, ws: 2, wd: 90}, null);
  assert.ok(!a.saran.some(s => /operasi panjang|sekat bakar|kambuh|langganan/.test(s)), `saran tanpa dasar: ${a.saran.join(" | ")}`);
  assert.ok(!a.prakira.some(x => x[0] === "Arah jalar hari ini"), "angin 2 km/jam tidak boleh dipakai sebagai arah jalar");
  assert.ok(R.html(a).includes("Titik per tahun"));
});

test("analog El Niño hanya dipakai saat tahun berjalan El Niño dan episode El Niño >= 3", () => {
  const en = {r: [20, 25, 30], s: [200, 330]};
  const elNino = R.analisa({...rec, en}, meta, {hari: 3}, "El Niño");
  assert.equal(elNino.analog, true);
  assert.equal(elNino.lama.median, 25, "lama harus dari episode musim El Niño");
  const biasa = R.analisa({...rec, en}, meta, {hari: 3}, "Netral");
  assert.equal(biasa.analog, false);
  assert.equal(biasa.lama.median, 10, "tahun netral memakai semua episode");
  const tipis = R.analisa({...rec, en: {r: [20, 25]}}, meta, {hari: 3}, "El Niño");
  assert.equal(tipis.analog, false, "2 episode El Niño terlalu sedikit untuk analog");
  // gerbang uji balik: analog yang kalah di uji balik tidak boleh dipakai walau tahun El Niño, dan alasannya ditulis
  const ditolak = R.analisa({...rec, en}, meta, {hari: 3}, "El Niño", {analog: false});
  assert.equal(ditolak.analog, false);
  assert.equal(ditolak.lama.median, 10);
  assert.ok(ditolak.fakta.some(f => /memakai semua tahun: memakai musim El Niño saja tidak terbukti lebih tepat/.test(f)), ditolak.fakta.join(" | "));
});

test("faktor pendorong: kelas dicocokkan ke tabel, variabel tanpa data DITOLAK", () => {
  const pd = {kelas: {fwi: {nama: "FWI", tabel: [{kelas: "rendah", rasio: 1}, {kelas: "sedang", rasio: 1.2}, {kelas: "tinggi", rasio: 1.5}, {kelas: "sangat tinggi", rasio: 1.7}]},
    gambut: {nama: "di gambut", tabel: [{kelas: "mineral", rasio: 1}, {kelas: "gambut", rasio: 3.6}]},
    dc: {nama: "DC", tabel: [{kelas: "< 100", rasio: 1}, {kelas: "100-200", rasio: 2.5}, {kelas: "200-300", rasio: 2.7}]}}};
  // audit validasi-model: DC 712 di luar rentang latih (kelas teratas 200-300) DITOLAK; FWI berbalik arah sesudah dikoreksi (OR 0,65) DITOLAK
  pd.logistik = {fitur: [{fitur: "gambut", or_per_sd: 1.445, ci: [1.327, 1.572]}, {fitur: "fwi", or_per_sd: 0.654, ci: [0.569, 0.751]}, {fitur: "dc", or_per_sd: 1.117, ci: [1.01, 1.37]}]};
  const f = R.faktor(pd, {fwi: 28, gambut: true, dc: 712, rh: null}, {sen: "VIIRS"}, null);
  assert.deepEqual(f.map(x => [x.nama, x.kelas, x.rasio]), [["di gambut", "gambut", 3.6]]);
  assert.deepEqual(R.faktor(pd, {dc: 250}, {}, null).map(x => x.kelas), ["200-300"], "DC di dalam rentang latih dan arahnya tetap: boleh");
  // angka tampil gambut = rasio terkoreksi per kelas biner (1,445^(1/0,5) = 2,1), bukan rasio mentah 3,6; di luar 9 provinsi latih DITOLAK
  pd.logistik.fitur[0].sd = 0.5;
  const g = R.faktor(pd, {gambut: true, prov: "62"}, {}, null)[0];
  assert.deepEqual([g.rasio, g.mentah, g.terkoreksi], [2.1, 3.6, true]);
  assert.deepEqual(R.faktor(pd, {gambut: true, prov: "35"}, {}, null), [], "Jawa Timur di luar provinsi latih tabel");
  assert.deepEqual(R.faktor(null, {fwi: 28}, {}, null), []);
  assert.deepEqual(R.faktor(pd, {fwi: NaN, gambut: null}, {sen: "VIIRS"}, null), [], "angka rusak atau kosong tidak boleh jadi faktor");
});

test("seri panjang MODIS dipakai untuk kekerapan dan El Niño, VIIRS tetap untuk minggu ini", () => {
  const m = {...meta, thm0: 2003, aktif_modis: 3};
  // MODIS 2003..2026: terbakar (>= 3) hanya di tahun El Niño 2004/2006/2009/2015/2019/2023
  const ym = Array.from({length: 24}, (_, i) => [2004, 2006, 2009, 2015, 2019, 2023].includes(2003 + i) ? 30 : 1);
  const a = R.analisa({...rec, ym}, m, {hari: 3, n: 1300, wt: {n7: 500}}, null);
  assert.match(a.fakta[0], /Terbakar 6 dari 23 tahun \(2003–2025, MODIS\)/);
  assert.equal(a.sen, "MODIS");
  assert.equal(a.th[0], 2003);
  assert.ok(a.fakta.some(f => /El Niño \(2004, 2006, 2009, 2015, 2019, 2023\).*30 kali tahun biasa/.test(f)), a.fakta.join(" | "));
  assert.ok(a.fakta.some(f => /Seminggu ini 500 titik S-NPP.*2012–2025/.test(f)), "rasio minggu ini harus dari titik S-NPP jendela yang sama (n7), bukan p.n 4 sensor");
  const tanpaN7 = R.analisa({...rec, ym}, m, {hari: 3, n: 1300}, null);
  assert.equal(tanpaN7.rs, null, "tanpa n7 S-NPP, rasio DITOLAK (p.n 4 sensor tidak sebanding dengan rata-rata S-NPP)");
});

test("pola wilayah: tiap tingkat memakai datanya sendiri; unit tanpa data DILEWATI, tahun ini kecil DITOLAK", () => {
  const ctx2 = vm.createContext({window: {}}); vm.runInContext(readFileSync(new URL("../../public/riwayat_sel.js", import.meta.url), "utf8"), ctx2);
  const W = (...x) => structuredClone(ctx2.window.RiwayatSel.wilayahBaris(...x));
  const kec = {nama: "Seruyan Hilir", a: 23, el: 10.7, tr: "turun", rt: 0.32, rk: [1, 10], yd: [9070, 1257.8]};
  const kab = {nama: "Seruyan", a: 23, el: 7.8, tr: "datar", rt: 1.1, rk: [4, 14], yd: [10, 2]};
  const b = W(kec, kab, null);
  assert.deepEqual(b.map(x => x.tingkat), ["Kecamatan", "Kabupaten"]);
  assert.deepEqual([b[0].el, b[0].tr, Math.round(b[0].ini * 10) / 10], [10.7, "turun 0,3×", 7.2]);
  assert.equal(b[1].ini, null, "10 titik tahun ini terlalu sedikit untuk rasio");
  assert.equal(b[1].tr, "relatif sama", "datar tidak diberi angka rasio");
  assert.deepEqual(W(null, null, null), []);
});

test("model bertingkat: unit terdalam dipakai, jendela disusut dengan rumus pipeline, tanpa data = induk", () => {
  const ctx3 = vm.createContext({window: {}}); vm.runInContext(readFileSync(new URL("../../public/riwayat_sel.js", import.meta.url), "utf8"), ctx3);
  const B = (...x) => structuredClone(ctx3.window.RiwayatSel.bertingkat(...x));
  const d14 = v => Array(14).fill(v);
  const H = {nasional: {d: d14(6), s: 305}, prov: {"62": {d: d14(8), s: 300}}, kab: {"62|Seruyan": {d: d14(10), s: 298}},
    kec: {"62|Seruyan|Seruyan Hilir": {d: d14(12), s: 296}}, k: {"3": {w: 4}, musim: {w: 4}}};
  const p = {prov: "62", kab: "Seruyan", kec: "Seruyan Hilir"};
  // jendela tanpa episode >= 3 hari: ikut kecamatan persis
  const a = B(H, {r: [1, 2], y: [0, 0]}, p, 3);
  assert.equal(a.tingkat, "Kec. Seruyan Hilir");
  assert.equal(Math.round(a.total * 10) / 10, 12);
  assert.equal(a.sisa, 9);
  assert.equal(a.akhir, 296, "jendela tanpa tahun aktif: akhir musim = kecamatan");
  // 4 episode jendela median 20 hari, k 4: exp((4 ln 20 + 4 ln 12)/8) = sqrt(240) = 15,5
  const b = B(H, {r: [18, 19, 21, 22], y: [0, 0]}, p, 3);
  assert.equal(Math.round(b.total * 10) / 10, 15.5);
  // kecamatan tidak dikenal: turun ke kabupaten, bukan rata-rata nasional
  assert.equal(B(H, {r: []}, {...p, kec: "Lain"}, 3).tingkat, "Kab. Seruyan");
  assert.equal(B(null, {r: []}, p, 3), null, "tanpa berkas bertingkat DITOLAK, bukan dikarang");
  assert.equal(B(H, {r: []}, p, 20).sisa, undefined, "umur > 14 hari di luar tabel: tidak meramal sisa");
});
