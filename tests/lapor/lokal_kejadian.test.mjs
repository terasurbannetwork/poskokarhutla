/* Kejadian yang sama di server lokal (scripts/lapor/lokal.mjs) lewat HTTP sungguhan (K66, D103-D107; TIKET LA-68, LA-69):
   dua laporan sekecamatan, yang kedua menjawab ya, keduanya bernomor KJ sama, meja mengelompokkan, BNPB melepas, BPBD tidak bisa.
   Nomor uji 62812999900xx; data di HOME sementara, tanpa model AI. Jalankan: node --test tests/lapor/lokal_kejadian.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";

const RUMAH = fs.mkdtempSync(path.join(os.tmpdir(), "lapor-kj-uji-"));
process.env.HOME = RUMAH; process.argv.push("--tanpa-ai");
const {tanganiLapor} = await import("../../scripts/lapor/lokal.mjs");
const DIR = path.join(RUMAH, ".lapor-lokal"), BERKAS = path.join(DIR, "data.json");
const srv = http.createServer((q, s) => tanganiLapor(q, s, new URL(q.url, "http://x"))).listen(0);
const DASAR = `http://127.0.0.1:${srv.address().port}`;
test.after(() => { srv.close(); fs.rmSync(RUMAH, {recursive: true, force: true}); });
const api = async (m, j, b, h = {}) => { const r = await fetch(DASAR + j, {method: m, headers: {"content-type": "application/json", ...h}, body: b ? JSON.stringify(b) : undefined});
  const t = await r.text(); let x = null; try { x = JSON.parse(t); } catch {} return {s: r.status, j: x, t}; };
const WA_INDUK = "62812999900001", WA_BARU = "62812999900002", WA_LAIN = "62812999900003";
const kirimPesan = (wa, b) => api("POST", "/api/lapor/pesan", {wa, ...b});

function benih() {
  const kini = Date.now(), lok = {lat: -6.2031, lon: 106.9168, sumber: "cari", wilayah: {kode: "31.75.06.1001", desa: "Jatinegara", kec: "Cakung", kab: "Kota Administrasi Jakarta Timur", prov: "DKI Jakarta", provKode: "31", kabKode: "31.75"}};
  const induk = {id: "i1", wa: WA_INDUK, nomor: "LA-201126-81", token: "a".repeat(32), status: "terkirim", terkirim: kini - 1800e3, foto: [], transkrip: [], versi: [{versi: 1}],
    isian: {jenis: {nilai: "banjir"}, subjenis: {nilai: "Banjir bandang"}, lokasi: {nilai: lok}, waktu: {nilai: "20 November 2026, 10.00 WIB", ms: kini - 3600e3}, meninggal: {nilai: 2}},
    tiket: {status: "baru", riwayat: [{ke: "baru", waktu: kini - 1800e3}]}};
  fs.mkdirSync(DIR, {recursive: true});
  fs.writeFileSync(BERKAS, JSON.stringify({pelapor: {[WA_INDUK]: {nama: "Uji Satu", peran: "warga"}, [WA_BARU]: {nama: "Uji Dua", peran: "warga"}, [WA_LAIN]: {nama: "Uji Tiga", peran: "warga"}},
    sesi: {i1: induk}, aktif: {[WA_INDUK]: "i1"}, urut: {}, kotak: {}}));
}
const HINGGA_TAWARAN = async wa => { await kirimPesan(wa, {teks: "lapor"}); await kirimPesan(wa, {teks: "1"}); await kirimPesan(wa, {lokasi: {kode: "31.75.06.1002"}}); return kirimPesan(wa, {teks: "tidak tahu"}); };

test("kejadian sama di server lokal: tawaran tanpa data orang, ya, nomor KJ untuk kedua laporan, meja mengelompokkan, BNPB melepas, BPBD tidak", async () => {
  benih();
  const t = await HINGGA_TAWARAN(WA_BARU);
  assert.equal(t.s, 200, t.t);
  assert.match(t.j.balasan, /Kejadian yang sama\?/);
  assert.match(t.j.balasan, /Di Kec\. Cakung sudah ada laporan banjir sejak .* dari 1 warga\./);
  assert.doesNotMatch(t.t, /Uji Satu|62812999900001|LA-201126-81/, "tanpa nama, nomor WA, atau nomor tiket laporan lain");
  assert.deepEqual(t.j.pilihan, ["Ya, banjir ini", "Bukan, kejadian lain"]);
  const ya = await kirimPesan(WA_BARU, {teks: "1"});
  assert.match(ya.j.balasan, /Ada detail yang ingin Anda tambahkan\?/);
  assert.equal(ya.j.isian.find(x => x.nama === "jenis").tampil, "Banjir");
  const det = await kirimPesan(WA_BARU, {teks: "meninggal 1 orang, jalan terputus"});
  assert.equal(det.j.status, "foto");
  const ring = await kirimPesan(WA_BARU, {teks: "1"});
  assert.equal(ring.j.status, "ringkasan");
  const kirim = await kirimPesan(WA_BARU, {teks: "kirim"});
  assert.ok(kirim.j.nomor, kirim.t);
  const d = JSON.parse(fs.readFileSync(BERKAS, "utf8")), baru = Object.values(d.sesi).find(s => s.nomor === kirim.j.nomor), induk = d.sesi.i1;
  assert.match(induk.kejadian.kode, /^KJ-\d{6}-01$/, "laporan induk ikut ditandai");
  assert.equal(baru.kejadian.kode, induk.kejadian.kode);
  assert.notEqual(baru.nomor, induk.nomor, "tiket tetap sendiri");
  assert.notEqual(baru.wa, induk.wa, "pelapor tetap sendiri");
  // meja: dua baris sama-sama membawa kejadian dengan jumlah laporan dan warga
  const meja = await api("GET", "/api/lapor/meja");
  const bk = meja.j.baris.filter(b => b.kejadian);
  assert.equal(bk.length, 2);
  assert.deepEqual(bk[0].kejadian, {kode: induk.kejadian.kode, n_laporan: 2, n_pelapor: 2});
  const rinci = await api("GET", `/api/lapor/meja/${baru.nomor}`);
  assert.equal(rinci.j.kejadian.kode, induk.kejadian.kode);
  // BPBD tidak bisa melepas; BNPB bisa dan tercatat di riwayat
  const bpbd = await api("POST", `/api/lapor/meja/${baru.nomor}/lepas`, {}, {cookie: "lapor_sebagai=kab:31.75"});
  assert.equal(bpbd.s, 403);
  assert.equal((await api("POST", `/api/lapor/meja/${baru.nomor}/lepas`, {})).s, 200);
  const sesudah = (await api("GET", "/api/lapor/meja")).j.baris;
  assert.ok(sesudah.every(b => !b.kejadian), "tinggal satu laporan: kejadian bubar");
  const lagi = await api("POST", `/api/lapor/meja/${baru.nomor}/lepas`, {});
  assert.equal(lagi.s, 409);
  const riw = JSON.parse(fs.readFileSync(BERKAS, "utf8")).sesi[baru.id].tiket.riwayat.at(-1);
  assert.match(riw.catatan, /^Dilepas dari kejadian KJ-/);
});

test("kejadian sama di server lokal: Bukan memakai jalur lama dan tidak memberi nomor KJ", async () => {
  benih();
  const t = await HINGGA_TAWARAN(WA_LAIN);
  assert.match(t.j.balasan, /Kejadian yang sama\?/);
  const bukan = await kirimPesan(WA_LAIN, {teks: "2"});
  assert.match(bukan.j.balasan, /Jenis bencana/);
  const d = JSON.parse(fs.readFileSync(BERKAS, "utf8"));
  assert.equal(Object.values(d.sesi).filter(s => s.kejadian).length, 0);
});
