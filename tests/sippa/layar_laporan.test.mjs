/* SP-037: logika murni layar Laporan /pipa/laporan (DS §4.12): validasi isian, CSV probe, bahan pilot dari jawaban API, tabel arsip, badan arsip. DOM tidak disentuh. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const muat = (p, ekspor) => (0, eval)(readFileSync(new URL(`../../public/inti/${p}`, import.meta.url), "utf8").replace(/^"use strict";?/, "") + `;${ekspor}`);
muat("format.js", "globalThis.fmt=fmt;globalThis.esc=esc;globalThis.jamWIB=jamWIB;");
muat("tabel.js", "globalThis.paginasi=paginasi;");

const M = await import("../../public/pipa/layar_laporan.js");
const {isiLaporan} = await import("../../public/pipa/laporan_isi.js");

test("cekFormLaporan: isian pilot normal lolos", () => {
  assert.deepEqual(M.cekFormLaporan({jenis: "pilot", ...M.RENTANG_PILOT}), []);
});

test("cekFormLaporan: jenis yang templatnya belum ada ditolak dengan nama jenisnya, jenis liar ditolak", () => {
  const g = M.cekFormLaporan({jenis: "mingguan", dari: "2026-10-26", sampai: "2026-11-01"});
  assert.equal(g.length, 1); assert.equal(g[0].medan, "jenis"); assert.match(g[0].alasan, /Mingguan belum tersedia/);
  assert.match(M.cekFormLaporan({jenis: "x", dari: "2026-10-26", sampai: "2026-11-01"})[0].alasan, /Pilih jenis/);
});

test("cekFormLaporan: tanggal kosong, terbalik, dan lebih dari 366 hari ditolak per medan; 366 hari tepat boleh", () => {
  assert.deepEqual(M.cekFormLaporan({jenis: "pilot", dari: "", sampai: ""}).map(x => x.medan), ["dari", "sampai"]);
  const terbalik = M.cekFormLaporan({jenis: "pilot", dari: "2026-11-02", sampai: "2026-11-01"});
  assert.equal(terbalik[0].medan, "sampai"); assert.match(terbalik[0].alasan, /sama dengan atau sesudah/);
  assert.match(M.cekFormLaporan({jenis: "pilot", dari: "2025-01-01", sampai: "2026-10-26"})[0].alasan, /paling lama 366 hari/);
  assert.deepEqual(M.cekFormLaporan({jenis: "pilot", dari: "2026-01-01", sampai: "2026-12-31"}), [], "365 hari + 1 hari akhir = di bawah batas");
  assert.deepEqual(M.cekFormLaporan({jenis: "pilot", dari: "2026-01-01", sampai: "2027-01-01"}), [], "366 hari tepat");
  assert.equal(M.cekFormLaporan({jenis: "pilot", dari: "2026-01-01", sampai: "2027-01-03"}).length, 1, "368 hari ditolak");
});

test("rentangMs: awal hari dan akhir hari WIB, bukan UTC", () => {
  const r = M.rentangMs({dari: "2026-10-26", sampai: "2026-10-26"});
  assert.equal(r.sejak, Date.parse("2026-10-25T17:00:00Z")); assert.equal(r.sampai, Date.parse("2026-10-26T16:59:59.999Z"));
});

test("bersihKendala: baris kosong dibuang, dipotong 300 huruf, paling banyak sepuluh", () => {
  assert.deepEqual(M.bersihKendala("  a  \n\n b\n"), ["a", "b"]);
  assert.equal(M.bersihKendala("x".repeat(500))[0].length, 300);
  assert.equal(M.bersihKendala(Array.from({length: 25}, (_, i) => "k" + i).join("\n")).length, 10);
  assert.deepEqual(M.bersihKendala(null), []);
});

test("bacaCsv: sel berkutip, koma dan baris baru dalam kutip, kutip ganda, awalan ' dari CSV aman dilepas", () => {
  const r = M.bacaCsv('a,b,c\r\n1,"x, y",\'-5\n"q ""z""","l1\nl2",=\n');
  assert.equal(r.length, 2);
  assert.deepEqual(r[0], {a: "1", b: "x, y", c: "-5"});
  assert.deepEqual(r[1], {a: 'q "z"', b: "l1\nl2", c: "="}, "sel '= hanya dilepas bila ada awalan ' di server; = polos tetap = ");
  assert.deepEqual(M.bacaCsv(""), []);
});

test("barisProbe: angka jadi angka, sel kosong jadi null (bukan nol), suhu negatif lewat awalan ' pulih", () => {
  const csv = "id,log_id,tugas_id,petak_id,titik,tahap,kedalaman_cm,suhu_c,waktu,oleh\nabc,,,P1,2,sebelum,30,61.5,1000,staf:x\nabd,,,P1,2,24j,100,,1001,staf:x\nabe,,,P2,1,sesudah,10,'-3,1002,staf:x\n";
  const p = M.barisProbe(csv);
  assert.deepEqual(p[0], {petak_id: "P1", titik: 2, tahap: "sebelum", kedalaman_cm: 30, suhu_c: 61.5, waktu: 1000});
  assert.equal(p[1].suhu_c, null); assert.equal(p[2].suhu_c, -3);
});

const T0 = Date.parse("2026-10-27T01:00:00+07:00"), J = 3600e3;
const log = (id, extra = {}) => ({id, jenis: "karhutla", prov: "62", kit_id: "a".repeat(16), t_tiba: T0, t_mulai_gelar: T0 + J, t_air_mengalir: T0 + 3 * J, ...extra});

test("bahanPilot: banjir, dummy, log berpenerus koreksi, provinsi lain, dan di luar rentang tidak ikut; latihan ikut", () => {
  const b = M.bahanPilot({log: [log("a"), log("b", {jenis: "banjir"}), log("c", {dummy: 1}), log("d", {koreksi_dari: "a"}), log("e", {prov: "61"}), log("f", {t_tiba: T0 + 30 * 24 * J}), log("g", {jenis: "latihan"})],
    probe: [], kit: [], kendala: "", prov: "62", rentang: M.RENTANG_PILOT});
  assert.deepEqual(b.log.map(l => l.id).sort(), ["d", "g"], "a dikoreksi oleh d");
});

test("bahanPilot: komponen kit gabungan, kendala dibersihkan, foto kosong, rentang dalam ms", () => {
  const b = M.bahanPilot({log: [log("a")], probe: [{petak_id: "P1"}], kit: [{komponen: [{kode_bom: "K1", kondisi: "baik", nama: "x"}]}, {komponen: [{kode_bom: "K2", kondisi: "hilang"}]}], kendala: " satu \n\n dua", prov: "62", rentang: M.RENTANG_PILOT});
  assert.deepEqual(b.komponen_kembali, [{kode_bom: "K1", kondisi: "baik"}, {kode_bom: "K2", kondisi: "hilang"}]);
  assert.deepEqual(b.kendala, ["satu", "dua"]); assert.deepEqual(b.foto, []); assert.equal(b.probe.length, 1);
  assert.equal(typeof b.rentang.dari, "number");
});

test("bahanPilot lalu isiLaporan: jalur lengkap dari jawaban API menghasilkan laporan tanpa galat", () => {
  const b = M.bahanPilot({log: [log("a")], probe: [], kit: [], kendala: "", prov: "62", rentang: M.RENTANG_PILOT});
  const lap = isiLaporan("pilot", b, {per: Date.parse("2026-10-28T10:00:00+07:00"), prov: "62"});
  assert.match(lap.nama_berkas, /^sippa-pilot-62-\d{8}\.pdf$/);
});

test("bolehArsip: moderator, super, atau tulis boleh; hanya baca dan tanpa dataset tidak", () => {
  assert.equal(M.bolehArsip({mod: "1"}), true); assert.equal(M.bolehArsip({super: "1"}), true); assert.equal(M.bolehArsip({tulis: "1"}), true);
  assert.equal(M.bolehArsip({}), false); assert.equal(M.bolehArsip(undefined), false); assert.equal(M.bolehArsip({tulis: "0"}), false);
});

test("metaArsip: JSON jenis, prov, parameter; meta lebih dari 8.192 byte ditolak", () => {
  const lap = {nama_berkas: "sippa-pilot-62-20261028.pdf"};
  const m = JSON.parse(M.metaArsip(lap, {jenis: "pilot", prov: "62", rentang: M.RENTANG_PILOT, per: 5, halaman: 3}));
  assert.equal(m.jenis, "pilot"); assert.equal(m.prov, "62"); assert.equal(m.parameter.halaman, 3);
  assert.throws(() => M.metaArsip({nama_berkas: "x".repeat(9000)}, {jenis: "pilot", rentang: M.RENTANG_PILOT, per: 5, halaman: 1}), /8\.192 byte/);
});

const arsip = (i, extra = {}) => ({id: i.toString(16).padStart(16, "0"), jenis: "pilot", prov: "62", parameter: JSON.stringify({dari: T0, sampai: T0 + 6 * 24 * J}), ada_berkas: 1, ukuran: 1258291, oleh: "staf:pak-budi", waktu: T0, ...extra});

test("tabelArsipHtml: kolom, data-label tiap sel, ukuran 1,2 MB, tautan unduh ke rute berkas", () => {
  const h = M.tabelArsipHtml([arsip(1)]);
  for (const k of ["Waktu", "Jenis", "Provinsi", "Rentang", "Ukuran", "Dibuat oleh"]) assert.match(h, new RegExp(`data-label="${k}"`));
  assert.match(h, /1,2 MB/); assert.match(h, /href="\/api\/sippa\/laporan-berkas\/0{15}1"/); assert.match(h, /<caption class="sr">Arsip laporan/);
  assert.match(h, /Pilot/);
});

test("tabelArsipHtml: teks dari data di-escape, id bukan 16 heks tidak jadi tautan, tanpa berkas diberi pil", () => {
  const h = M.tabelArsipHtml([arsip(2, {oleh: "<img src=x onerror=alert(1)>", id: "../../x"}), arsip(3, {ada_berkas: 0, ukuran: null})]);
  assert.doesNotMatch(h, /<img/); assert.match(h, /&lt;img/);
  assert.doesNotMatch(h, /\.\.\/\.\.\/x/); assert.match(h, /tanpa berkas/);
});

test("tabelArsipHtml: kosong berkalimat petunjuk, baris dummy tidak tampil, paginasi muncul hanya di atas 50", () => {
  assert.match(M.tabelArsipHtml([]), /Belum ada laporan diarsipkan/);
  assert.match(M.tabelArsipHtml([arsip(4, {dummy: 1})]), /Belum ada laporan diarsipkan/);
  assert.doesNotMatch(M.tabelArsipHtml(Array.from({length: 50}, (_, i) => arsip(i + 1))), /pgn/);
  const banyak = M.tabelArsipHtml(Array.from({length: 51}, (_, i) => arsip(i + 1)));
  assert.match(banyak, /pgn/); assert.equal((banyak.match(/data-label="Waktu"/g) || []).length, 50);
});

test("rentang arsip dengan parameter rusak: strip, bukan galat", () => {
  assert.match(M.tabelArsipHtml([arsip(5, {parameter: "{rusak"})]), /data-label="Rentang">–</);
});
