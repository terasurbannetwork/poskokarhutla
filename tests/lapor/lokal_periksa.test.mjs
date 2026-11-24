/* Pengecekan lapangan dan jenis tindakan di server lokal (scripts/lapor/lokal.mjs) lewat HTTP sungguhan (K69-K70, D108-D113; TIKET LA-71, LA-72):
   BPBD wilayahnya mengecek (Sebagian benar + revisi = versi baru berasal petugas, angka asli tetap di versi lama), Ditindaklanjuti wajib tindakan
   dari katalog jenisnya, tindakan bisa ditambah, Tidak valid lewat pengecekan dari Ditindaklanjuti, BPBD lain tidak bisa.
   Nomor uji 62812999900xx; data di HOME sementara. Jalankan: node --test tests/lapor/lokal_periksa.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";

const RUMAH = fs.mkdtempSync(path.join(os.tmpdir(), "lapor-periksa-uji-"));
process.env.HOME = RUMAH; process.argv.push("--tanpa-ai");
const {tanganiLapor} = await import("../../scripts/lapor/lokal.mjs");
const DIR = path.join(RUMAH, ".lapor-lokal"), BERKAS = path.join(DIR, "data.json");
const srv = http.createServer((q, s) => tanganiLapor(q, s, new URL(q.url, "http://x"))).listen(0);
const DASAR = `http://127.0.0.1:${srv.address().port}`;
test.after(() => { srv.close(); fs.rmSync(RUMAH, {recursive: true, force: true}); });
const JAKTIM = {cookie: "lapor_sebagai=kab:31.75"}, BOGOR = {cookie: "lapor_sebagai=kab:32.01"};
const api = async (m, j, b, h = {}) => { const r = await fetch(DASAR + j, {method: m, headers: {"content-type": "application/json", "x-pb": "1", ...h}, body: b ? JSON.stringify(b) : undefined});
  const t = await r.text(); let x = null; try { x = JSON.parse(t); } catch {} return {s: r.status, j: x, t}; };
const WA = "62812999900011", N = "LA-201126-91";

function benih(status = "ditelaah") {
  const kini = Date.now(), lok = {lat: -6.2019, lon: 106.8623, sumber: "cari", wilayah: {kode: "31.75.01.1003", desa: "Kayu Manis", kec: "Matraman", kab: "Kota Administrasi Jakarta Timur", prov: "DKI Jakarta", provKode: "31", kabKode: "31.75"}};
  const s = {id: "p1", wa: WA, nomor: N, token: "b".repeat(32), status: "terkirim", terkirim: kini - 3600e3, foto: [], transkrip: [], versi: [{versi: 1}],
    isian: {jenis: {nilai: "banjir"}, subjenis: {nilai: "Banjir luapan sungai"}, lokasi: {nilai: lok}, waktu: {nilai: "20 November 2026, 08.00 WIB", ms: kini - 7200e3},
      meninggal: {nilai: 3, asal: {sumber: "pesan", kutipan: "meninggal 3"}}, rumah_berat: {nilai: 5, asal: {sumber: "pesan", kutipan: "rusak berat 5"}}},
    tiket: {status, riwayat: [{ke: "baru", waktu: kini - 3600e3}]}};
  fs.mkdirSync(DIR, {recursive: true});
  fs.writeFileSync(BERKAS, JSON.stringify({pelapor: {[WA]: {nama: "Uji Periksa", peran: "warga"}}, sesi: {p1: s}, aktif: {}, urut: {}, kotak: {}}));
}
const baca = () => JSON.parse(fs.readFileSync(BERKAS, "utf8"));

test("pengecekan: Sebagian benar merevisi jadi versi baru berasal petugas, angka asli tetap di versi lama; BPBD lain 404", async () => {
  benih();
  const r0 = await api("GET", `/api/lapor/meja/${N}`, null, JAKTIM);
  assert.equal(r0.s, 200, r0.t);
  assert.ok(r0.j.tindakanPilihan.some(t => t.kode === "evakuasi"), "katalog tindakan banjir dari bencana.json");
  assert.ok(r0.j.revisi.some(r => r.nama === "meninggal" && r.nilai === 3));
  assert.equal((await api("POST", `/api/lapor/meja/${N}/periksa`, {hasil: "sebagian", catatan: "dicek", ubah: {meninggal: 2}}, BOGOR)).s, 404, "di luar wilayah = tidak ada");
  assert.equal((await api("POST", `/api/lapor/meja/${N}/periksa`, {hasil: "sebagian", catatan: "x"}, JAKTIM)).s, 400, "catatan wajib");
  assert.equal((await api("POST", `/api/lapor/meja/${N}/periksa`, {hasil: "valid", catatan: "dicek ke RT 05", ubah: {meninggal: 2}}, JAKTIM)).s, 400, "valid tanpa revisi");
  assert.equal((await api("POST", `/api/lapor/meja/${N}/periksa`, {hasil: "sebagian", catatan: "dicek ke RT 05", ubah: {kronologi: 1}}, JAKTIM)).s, 400, "isian di luar daftar revisi");
  const r = await api("POST", `/api/lapor/meja/${N}/periksa`, {hasil: "sebagian", catatan: "Dicek ke RT 05, korban meninggal 2", ubah: {meninggal: 2, rumah_berat: 5}}, JAKTIM);
  assert.equal(r.s, 200, r.t);
  assert.equal(r.j.status, "ditelaah", "Sebagian benar tidak mengubah status");
  assert.equal(r.j.periksa.at(-1).hasil, "sebagian");
  assert.deepEqual(r.j.periksa.at(-1).perubahan, [{nama: "meninggal", dari: 3, ke: 2}], "angka yang sama tidak dihitung perubahan");
  const s = baca().sesi.p1;
  assert.equal(s.isian.meninggal.nilai, 2);
  assert.equal(s.isian.meninggal.asal.sumber, "petugas");
  assert.match(s.isian.meninggal.asal.kutipan, /^Koreksi lapangan BPBD .*Dicek ke RT 05/);
  assert.equal(s.versi.length, 2, "versi baru");
  assert.equal(s.isian.rumah_berat.asal.sumber, "pesan", "isian yang tidak berubah tetap milik pelapor");
  assert.match(s.tiket.riwayat.at(-1).catatan, /Pengecekan lapangan: Sebagian benar/);
});

test("Ditindaklanjuti wajib tindakan dari katalog; tindakan bisa ditambah; pelapor dikabari", async () => {
  benih();
  assert.equal((await api("POST", `/api/lapor/meja/${N}/status`, {ke: "ditindaklanjuti"}, JAKTIM)).j.perluTindakan, true);
  assert.equal((await api("POST", `/api/lapor/meja/${N}/status`, {ke: "ditindaklanjuti", tindakan: ["pohon_tumbang"]}, JAKTIM)).s, 400, "tindakan di luar katalog banjir");
  const r = await api("POST", `/api/lapor/meja/${N}/status`, {ke: "ditindaklanjuti", tindakan: ["evakuasi", "logistik"]}, JAKTIM);
  assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j.tindakan.map(t => t.label), ["Evakuasi warga", "Distribusi logistik"]);
  const t2 = await api("POST", `/api/lapor/meja/${N}/tindakan`, {tindakanLain: "Sedot sumur warga"}, JAKTIM);
  assert.equal(t2.s, 200, t2.t);
  assert.equal(t2.j.tindakan.at(-1).kode, "lain");
  const kotak = baca().kotak[WA].map(k => k.teks).join("\n");
  assert.match(kotak, /Tindakan: Evakuasi warga, Distribusi logistik/);
  assert.match(kotak, /Sedot sumur warga/);
});

test("Tidak valid lewat pengecekan dari Ditindaklanjuti; tiket tertutup menolak pengecekan; tidak valid tanpa alasan ditolak", async () => {
  benih("ditindaklanjuti");
  assert.equal((await api("POST", `/api/lapor/meja/${N}/status`, {ke: "tidak_valid"}, JAKTIM)).s, 400, "tombol status Tidak valid wajib alasan");
  assert.equal((await api("POST", `/api/lapor/meja/${N}/periksa`, {hasil: "tidak_valid", catatan: "Tidak ada genangan", ubah: {meninggal: 0}}, JAKTIM)).s, 400, "tidak valid tidak direvisi");
  const r = await api("POST", `/api/lapor/meja/${N}/periksa`, {hasil: "tidak_valid", catatan: "Tidak ada genangan di lokasi, dicek bersama lurah"}, JAKTIM);
  assert.equal(r.s, 200, r.t);
  assert.equal(r.j.status, "tidak_valid");
  assert.equal(baca().sesi.p1.isian.meninggal.nilai, 3, "isian tidak berubah");
  assert.equal((await api("POST", `/api/lapor/meja/${N}/periksa`, {hasil: "valid", catatan: "cek ulang lagi"}, JAKTIM)).s, 409);
});
