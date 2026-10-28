/* SP-145: A/B dari lapangan, gerbang G0-G5, kartu lulus/belum, minggu ISO, selang pendek lawan panjang, anggaran. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
(0, eval)(readFileSync(new URL("../../public/inti/format.js", import.meta.url), "utf8").replace(/^"use strict";?/, "") + ";globalThis.fmt=fmt;globalThis.esc=esc;globalThis.jamWIB=jamWIB;globalThis.paginasi=()=>'';");
const B = await import("../../public/pipa/bukti.js");
const bersih = t => { assert.doesNotMatch(t, /[—·]/); assert.doesNotMatch(t, /terbukti/i); assert.doesNotMatch(t, /toFixed/); };
const H = 36e5;

const probeSuhu = (petak, sebelum, sesudah, besok) => [["sebelum", sebelum], ["sesudah", sesudah], ["24j", besok]].flatMap(([tahap, v]) => [10, 30].map(k => ({petak_id: petak, tahap, kedalaman_cm: k, suhu_c: v})));

test("abLapangan: lengan dari tabel petak atau huruf awal L dan K; penurunan = sebelum dikurangi besok", () => {
  assert.equal(B.lenganPetak("L1"), "lance"); assert.equal(B.lenganPetak("K-2"), "semprot"); assert.equal(B.lenganPetak("Kanal"), null);
  assert.equal(B.lenganPetak("P9", [{petak_id: "P9", lengan: "lance_surfaktan"}]), "lance"); assert.equal(B.lenganPetak("P9", [{petak_id: "P9", lengan: "konvensional"}]), "semprot");
  const probe = [...probeSuhu("L1", 80, 40, 30), ...probeSuhu("L2", 70, 40, 30), ...probeSuhu("K1", 80, 60, 55), ...probeSuhu("K2", 76, 60, 56)];
  const r = B.abLapangan({probe, log: [{petak_id: "L1"}, {petak_id: "L1", dummy: 1}]});
  assert.deepEqual(r.petak.map(p => [p.petak_id, p.turun]), [["K1", 25], ["K2", 20], ["L1", 50], ["L2", 40]]);
  assert.equal(r.petak.find(p => p.petak_id === "L1").sesi, 1);
  assert.equal(r.lance.n_petak, 2); assert.equal(r.banding.rerata_a, 45); assert.equal(r.banding.rerata_b, 22.5); assert.equal(r.banding.selisih, 22.5);
  assert.equal(r.banding.belum_bisa_diputus, true); assert.equal(r.keyakinan, "hipotesis");
  const h = B.abLapanganHtml(r, 1); assert.match(h, /hipotesis/); assert.match(h, /belum bisa diputus/); bersih(h);
});
test("abLapangan: tanpa pasangan cukup, perbandingan null berkalimat; dummy dan suhu bukan angka diabaikan", () => {
  const r = B.abLapangan({probe: [...probeSuhu("L1", 80, 40, 30), {petak_id: "K1", tahap: "sebelum", suhu_c: "x"}, {...probeSuhu("K9", 1, 1, 1)[0], dummy: 1}]});
  assert.equal(r.banding, null); assert.equal(r.petak.length, 1);
  assert.match(B.abLapanganHtml(r), /belum bisa dihitung/); assert.match(B.abLapanganHtml(B.abLapangan({})), /Belum ada pengukuran/);
});
const sesi = (kelas, tiba_air_jam, i, ekstra = {}) => ({id: `${kelas}${i}`, jenis: "karhutla", kelas_medan: kelas, t_tiba: Date.UTC(2027, 7, 1 + i), t_air_mengalir: Date.UTC(2027, 7, 1 + i) + tiba_air_jam * H, ...ekstra});
const lima = (kelas, jam) => [0, 1, 2, 3, 4].map(i => sesi(kelas, jam, i));
const abG4 = (vonis, ditinjau = false) => ({lengan: [{kunci: "lance", keyakinan: ditinjau ? "ditinjau-evaluator" : "hipotesis", g4: {vonis, alasan: ["biaya terlalu tinggi"], pilot: vonis == null}}]});

test("hitungGerbang: enam gerbang; G0 G1 G2 selalu dinilai manual dan tidak pernah lulus", () => {
  const g = B.hitungGerbang({});
  assert.deepEqual(g.map(x => x.kode), ["G0", "G1", "G2", "G3", "G4", "G5"]);
  assert.deepEqual(g.slice(0, 3).map(x => x.status), ["manual", "manual", "manual"]);
  assert.deepEqual(g.slice(3).map(x => x.status), ["menunggu", "menunggu", "menunggu"]);
});
test("hitungGerbang G3: ambang tepat lulus, di atas ambang gagal, kurang dari 5 ulangan menunggu, dummy dibuang", () => {
  const lulus = B.hitungGerbang({log: [...lima("I", 4), ...lima("II", 8), ...lima("III", 24)]}).find(x => x.kode === "G3");
  assert.equal(lulus.status, "lulus"); assert.deepEqual(lulus.rinci.map(r => r.n), [5, 5, 5]);
  const gagal = B.hitungGerbang({log: [...lima("I", 4.5), ...lima("II", 8)]}).find(x => x.kode === "G3"); assert.equal(gagal.status, "gagal"); assert.match(gagal.ringkas, /Kelas I/);
  const sedikit = B.hitungGerbang({log: [...lima("I", 4).slice(0, 4), ...lima("II", 8), ...lima("III", 24)]}).find(x => x.kode === "G3"); assert.equal(sedikit.status, "menunggu");
  const dum = B.hitungGerbang({log: [...lima("I", 4), ...lima("II", 8), ...lima("III", 24)].map((l, i) => i === 0 ? {...l, dummy: 1} : l)}).find(x => x.kode === "G3"); assert.equal(dum.status, "menunggu");
});
test("hitungGerbang G4 dan G5: vonis G4 dipetakan; G5 butuh G4 lulus, peninjauan evaluator, dan 30 hari api", () => {
  const api = n => Array.from({length: n}, (_, i) => sesi("I", 4, i));
  const s = (ab, log) => Object.fromEntries(B.hitungGerbang({log, ab}).map(x => [x.kode, x.status]));
  assert.equal(s(abG4("LULUS"), api(40)).G4, "lulus"); assert.equal(s(abG4("LULUS"), api(40)).G5, "menunggu");
  assert.equal(s(abG4("LULUS", true), api(29)).G5, "menunggu"); assert.equal(s(abG4("LULUS", true), api(30)).G5, "lulus");
  assert.equal(s(abG4("TIDAK LULUS"), []).G4, "gagal"); assert.equal(s(abG4("TIDAK LULUS"), []).G5, "gagal");
  assert.equal(s(abG4(null), []).G4, "menunggu"); assert.equal(s(abG4("BELUM BISA DIPUTUS"), []).G4, "menunggu");
});
test("kartuGerbangHtml: 'lulus' hanya untuk gerbang berstatus lulus; tanpa data tidak ada yang lulus; tanpa kata terlarang", () => {
  const kosong = B.kartuGerbangHtml(B.hitungGerbang({}), 1); assert.match(kosong, /Belum ada gerbang yang lulus dengan data/); assert.doesNotMatch(kosong, /Lulus dengan data</); bersih(kosong);
  const g = B.hitungGerbang({log: [...lima("I", 4), ...lima("II", 8), ...lima("III", 24)]}), h = B.kartuGerbangHtml(g, 1);
  assert.match(h, /1 dari 6 gerbang lulus dengan data/); assert.match(h, /G3 Waktu gelar/); assert.match(h, /asumsi-kebijakan/); bersih(h);
});
test("rentangMinggu: ISO 8601 Senin sampai Minggu; minggu 53 hanya di tahun yang punya; masukan liar null", () => {
  assert.deepEqual(B.rentangMinggu("2026-W44"), {dari: "2026-10-26", sampai: "2026-11-01"});
  assert.deepEqual(B.rentangMinggu("2026-W01"), {dari: "2025-12-29", sampai: "2026-01-04"});
  assert.deepEqual(B.rentangMinggu("2026-W53"), {dari: "2026-12-28", sampai: "2027-01-03"});
  assert.equal(B.rentangMinggu("2025-W53"), null); assert.equal(B.rentangMinggu("2026-W00"), null); assert.equal(B.rentangMinggu("2026-44"), null); assert.equal(B.rentangMinggu(null), null);
});
test("awalLaporan: tautan Meja Pantau membuka jenis mingguan; tanpa minggu sah null", () => {
  assert.deepEqual(B.awalLaporan("?jenis=mingguan&minggu=2026-W44"), {jenis: "mingguan", dari: "2026-10-26", sampai: "2026-11-01", minggu: "2026-W44"});
  assert.equal(B.awalLaporan("?minggu=2026-W44").jenis, "mingguan"); assert.equal(B.awalLaporan("?jenis=mingguan"), null); assert.equal(B.awalLaporan("?minggu=x"), null); assert.equal(B.awalLaporan(""), null);
});
test("bandingSelang: batas 500 m masuk pendek; selang panjang lebih lama bernilai selisih positif; n kecil belum bisa diputus", () => {
  const log = [[300, 3], [500, 4], [500, 3.5], [1000, 6], [1200, 7], [1500, 6.5]].map(([p, j], i) => sesi("I", j, i, {panjang_m: p}));
  const r = B.bandingSelang([...log, {...sesi("I", 99, 9, {panjang_m: 2000}), dummy: 1}]);
  assert.equal(r.pendek.n, 3); assert.equal(r.panjang.n, 3); assert.ok(r.banding.selisih > 2.9 && r.banding.selisih < 3.2); assert.equal(r.banding.belum_bisa_diputus, true);
  const h = B.selangHtml(r); assert.match(h, /lebih lama/); assert.match(h, /hipotesis/); bersih(h);
  assert.match(B.selangHtml(B.bandingSelang([])), /Belum ada sesi/); assert.match(B.selangHtml(B.bandingSelang(log.slice(0, 2))), /belum bisa dihitung/);
});
const TING = [{tingkat: "T0", nama: "Persiapan", gerbang_pembuka: "G0", pagu_rp: 1000000, status: "terbuka", realisasi_rp: 400000, sisa_rp: 600000}, {tingkat: "T1", nama: "Pilot", gerbang_pembuka: "G2", pagu_rp: null, status: "terkunci", realisasi_rp: 0, sisa_rp: null}, {tingkat: "T2", nama: "Skala", gerbang_pembuka: "G4", pagu_rp: 5000000, status: "terbuka", realisasi_rp: 1000000, sisa_rp: null}];
test("anggaran sisa: sisa server menang; tanpa bidang dihitung pagu dikurangi realisasi; pagu null = belum ditetapkan", () => {
  assert.equal(B.sisaRp(TING[0]), 600000); assert.equal(B.sisaRp(TING[1]), null); assert.equal(B.sisaRp({pagu_rp: 100, realisasi_rp: 30}), 70); assert.equal(B.sisaRp({pagu_rp: null}), null);
  const h = B.anggaranHtml({tingkat: TING, realisasi: [{tanggal: "2026-11-02", tingkat: "T0", prov: "62", uraian: "Beli gasket", rp: 400000, bukti: "SPJ-1"}]}, "M", 1);
  assert.match(h, /Terkunci/); assert.match(h, /Terbuka/); assert.match(h, /belum ditetapkan/); assert.match(h, /sisa nasional tidak terlihat dari wilayah/); assert.match(h, /Rp600\.000/);
  assert.match(h, /data-buka-anggaran="T1"/); assert.match(h, /data-realisasi/); assert.match(h, /Beli gasket/); bersih(h);
  assert.doesNotMatch(B.anggaranHtml({tingkat: TING}, "W", 1), /data-buka-anggaran/); assert.doesNotMatch(B.anggaranHtml({tingkat: TING}, "B", 1), /data-realisasi/);
});
test("cekRealisasi: tingkat terkunci ditolak, melebihi sisa ditolak, rupiah bulat, tanggal sah, provinsi 2 angka", () => {
  const ok = {tingkat: "T0", uraian: "Beli gasket", rp: "100.000", tanggal: "2026-11-02"};
  assert.deepEqual(B.cekRealisasi(ok, TING), []);
  assert.match(B.cekRealisasi({...ok, tingkat: "T1"}, TING)[0].alasan, /terkunci sampai G2/);
  assert.match(B.cekRealisasi({...ok, rp: "600001"}, TING)[0].alasan, /melebihi sisa/); assert.deepEqual(B.cekRealisasi({...ok, rp: "600000"}, TING), []);
  assert.deepEqual(B.cekRealisasi({...ok, tingkat: "T2", rp: "999999999"}, TING), []);   // sisa tidak terlihat dari wilayah: server yang memutuskan
  assert.equal(B.cekRealisasi({...ok, rp: "1,5"}, TING)[0].medan, "rp"); assert.equal(B.cekRealisasi({...ok, rp: "0"}, TING)[0].medan, "rp");
  assert.equal(B.cekRealisasi({...ok, tanggal: "2026-02-30"}, TING)[0].medan, "tanggal"); assert.equal(B.cekRealisasi({...ok, uraian: "ab"}, TING)[0].medan, "uraian");
  assert.equal(B.cekRealisasi({...ok, prov: "6"}, TING)[0].medan, "prov"); assert.equal(B.cekRealisasi({...ok, tingkat: "T9"}, TING)[0].medan, "tingkat");
  assert.deepEqual(B.badanRealisasi({...ok, bukti: " SPJ-1 ", prov: "62"}), {tingkat: "T0", uraian: "Beli gasket", rp: 100000, tanggal: "2026-11-02", bukti: "SPJ-1", prov: "62"});
  assert.deepEqual(B.badanRealisasi(ok), {tingkat: "T0", uraian: "Beli gasket", rp: 100000, tanggal: "2026-11-02"});
});
test("cekBuka dan formRealisasiHtml: bukti gerbang 5 sampai 500 huruf; form hanya menawarkan tingkat terbuka", () => {
  assert.equal(B.cekBuka({tingkat: "T1", gerbang_bukti: "ab"})[0].medan, "gerbang_bukti"); assert.deepEqual(B.cekBuka({tingkat: "T1", gerbang_bukti: "Berita acara G2 nomor 5"}), []); assert.equal(B.cekBuka({gerbang_bukti: "Berita acara"})[0].medan, "tingkat");
  assert.deepEqual(B.badanBuka({tingkat: "T1", gerbang_bukti: " Berita acara G2 "}), {tingkat: "T1", gerbang_bukti: "Berita acara G2"});
  const f = B.formRealisasiHtml(TING, "2026-11-02"); assert.match(f, /value="T0"/); assert.doesNotMatch(f, /value="T1"/); assert.match(f, /2 Nov 2026/);
});
