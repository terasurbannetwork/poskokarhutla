/* Lapor tanpa sinyal LR-04: putarUlang (public/lapor/luring.js) memutar ulang butir luring ke mesin sungguhan (src/lapor_mesin.js lewat scripts/lapor/lokal.mjs, HTTP).
   Penjaga temuan LR-01: korban "ya" membuka langkah darurat_isi (K98) dan dulu ditolak 409. Sekarang terkirim, terjebak dan medis dijawab "Tidak tahu", bukan "Tidak ada".
   Nomor uji 62812999900xx; data di HOME sementara, tanpa model AI. Jalankan: node --test tests/lapor/luring_putar.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";

const RUMAH = fs.mkdtempSync(path.join(os.tmpdir(), "lapor-lr-uji-"));
process.env.HOME = RUMAH; process.argv.push("--tanpa-ai");
const {tanganiLapor} = await import("../../scripts/lapor/lokal.mjs");
const DIR = path.join(RUMAH, ".lapor-lokal"), BERKAS = path.join(DIR, "data.json");
const srv = http.createServer((q, s) => tanganiLapor(q, s, new URL(q.url, "http://x"))).listen(0);
const DASAR = `http://127.0.0.1:${srv.address().port}`;
test.after(() => { srv.close(); fs.rmSync(RUMAH, {recursive: true, force: true}); });

// peramban tiruan secukupnya untuk memuat luring.js (tanpa DOM sungguhan; formulir tidak diuji di sini)
const simpanan = new Map();
Object.assign(globalThis, {
  localStorage: {getItem: k => simpanan.get(k) ?? null, setItem: (k, v) => simpanan.set(k, String(v)), removeItem: k => simpanan.delete(k)},
  document: {getElementById: () => null, body: {prepend() {}}},
  addEventListener() {}, window: {PbAntre: {saluran: () => ({daftar: async () => []}), dengar() {}}},
});
globalThis.dispatchEvent ??= () => true;
Object.defineProperty(globalThis, "navigator", {value: {onLine: true}, configurable: true});
const fetchAsli = globalThis.fetch;
globalThis.fetch = (u, o) => fetchAsli(new URL(u, DASAR), o);
const {putarUlang} = await import("../../public/lapor/luring.js");

const GPS = {lat: -6.2031, lon: 106.9168, akurasi: 15};   // Cakung, Jakarta Timur (data wilayah di public/)
function benih(wa) {
  fs.mkdirSync(DIR, {recursive: true});
  fs.writeFileSync(BERKAS, JSON.stringify({pelapor: {[wa]: {nama: "Uji Luring", peran: "warga", setuju: Date.now()}}, sesi: {}, aktif: {}, urut: {}, kotak: {}}));
  simpanan.set("lapor-wa", JSON.stringify(wa));
}
const sesiTerkirim = nomor => Object.values(JSON.parse(fs.readFileSync(BERKAS, "utf8")).sesi).find(s => s.nomor === nomor);

for (const [korban, wa] of [["ya", "62812999900041"], ["tidak", "62812999900042"], ["belum_tahu", "62812999900043"]]) {
  test(`putar ulang Lapor darurat luring korban "${korban}" ke mesin sungguhan: terkirim bernomor`, async () => {
    benih(wa);
    const r = await putarUlang({jenis: "Banjir", korban, ...GPS, waktu_simpan: Date.now()});
    assert.equal(r.s, 200, JSON.stringify(r.j));
    assert.ok(r.j.nomor, "nomor laporan ada");
    const s = sesiTerkirim(r.j.nomor);
    assert.equal(s.status, "terkirim");
    assert.equal(s.isian.jenis.nilai, "banjir");
    assert.equal(s.darurat.korban, korban);
    if (korban === "ya") {
      // K98 tidak ditanya luring: tercatat "Tidak tahu", tidak pernah "Tidak ada" (kosong bukan nol)
      assert.equal(s.isian.butuh_penyelamatan?.nilai, "Tidak tahu");
      assert.equal(s.isian.butuh_medis?.nilai, "Tidak tahu");
    } else {
      assert.equal(s.isian.butuh_penyelamatan, undefined);
      assert.equal(s.isian.butuh_medis, undefined);
    }
    const laporan = JSON.parse(simpanan.get(`lapor-cache-${wa}`)).laporan;
    assert.equal(laporan[0].nomor, r.j.nomor, "masuk daftar Laporan di perangkat");
  });
}

test("jenis dan korban luring.js sama dengan spek bersama", async () => {
  const spek = await import("../../public/inti/luring_spek.js");
  const src = fs.readFileSync(new URL("../../public/lapor/luring.js", import.meta.url), "utf8");
  assert.match(src, /from "\.\.\/inti\/luring_spek\.js"/);
  assert.doesNotMatch(src, /const (JENIS|KORBAN) = \[/, "tanpa salinan daftar sendiri");
  assert.equal(spek.KORBAN.length, 3);
});

/* LR-06 dan LR-09: waktu simpan di HP ikut sebagai keterangan, foto luring dinilai terhadap waktu simpan (Q1), pita darurat terlambat (Q3) */
const JPEG = "data:image/jpeg;base64," + Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2000, 7), Buffer.from([0xff, 0xd9])]).toString("base64");
const MENIT = 6e4, JAM = 60 * MENIT;

test("butir luring 3 jam: tercatat dari luring dan terlambat, waktu kejadian tetap jam terima", async () => {
  benih("62812999900044");
  const w = Date.now() - 3 * JAM, r = await putarUlang({jenis: "Banjir", korban: "tidak", ...GPS, waktu_simpan: w, waktu_klien: w});
  assert.equal(r.s, 200, JSON.stringify(r.j));
  const s = sesiTerkirim(r.j.nomor);
  assert.deepEqual(s.darurat.luring, {simpan: w});
  assert.equal(s.darurat.terlambat, true, "lebih dari 2 jam: tanpa pita darurat");
  assert.ok(s.isian.waktu.ms > w + 2 * JAM, "waktu simpan HP tidak pernah jadi waktu kejadian");
});

test("butir luring 30 menit: dari luring, tidak terlambat; jam HP di depan 1 jam dicatat tanpa jam", async () => {
  benih("62812999900045");
  const w = Date.now() - 30 * MENIT;
  let s = sesiTerkirim((await putarUlang({jenis: "Banjir", korban: "tidak", ...GPS, waktu_klien: w})).j.nomor);
  assert.deepEqual(s.darurat.luring, {simpan: w}); assert.equal(s.darurat.terlambat, undefined);
  benih("62812999900046");
  s = sesiTerkirim((await putarUlang({jenis: "Banjir", korban: "tidak", ...GPS, waktu_klien: Date.now() + JAM})).j.nomor);
  assert.deepEqual(s.darurat.luring, {simpan: null}, "waktuKlienSah menolak jam di depan");
  assert.equal(s.darurat.terlambat, undefined, "keterlambatan tidak terbukti: pita tetap");
});

test("foto luring: dinilai terhadap waktu simpan, foto tua dilewati, laporan tetap terkirim", async () => {
  benih("62812999900047");
  const w = Date.now() - 40 * MENIT;
  const sah = {data: JPEG, exif: {kamera: true, waktu: w - MENIT}, gps: {lat: GPS.lat, lon: GPS.lon, akurasi: 12, waktu: w - MENIT}};
  const tua = {data: JPEG, exif: {kamera: true, waktu: w - 20 * MENIT}, gps: null};
  const r = await putarUlang({jenis: "Banjir", korban: "tidak", ...GPS, waktu_klien: w, foto: [sah, tua]});
  assert.equal(r.s, 200, JSON.stringify(r.j));
  const s = sesiTerkirim(r.j.nomor);
  assert.equal(s.foto.length, 1, "foto tua ditolak sendiri");
  assert.equal(s.foto[0].lencana, "gps", "GPS 40 menit lalu sah karena dinilai terhadap waktu simpan");
  assert.match(s.foto[0].lencanaTeks, /dikirim dari luring, jam HP belum diverifikasi/);
});

test("nilaiFotoLuring dan tandaLuring: batas foto Q1 dan pita darurat Q3", async () => {
  const {nilaiFotoLuring, tandaLuring} = await import("../../src/lapor_mesin.js");
  const kini = Date.now();
  assert.equal(nilaiFotoLuring(null, kini), null);
  assert.equal(nilaiFotoLuring(kini + JAM, kini), null, "jam di depan = bukan foto luring");
  assert.ok(nilaiFotoLuring(kini - JAM, kini, kini - JAM - 6 * MENIT).tanda, "6 menit masih dalam 5 + 2 menit");
  assert.ok(nilaiFotoLuring(kini - JAM, kini, kini - JAM - 8 * MENIT).galat);
  assert.equal(tandaLuring({}, kini - 2 * JAM, kini, kini).terlambat, undefined, "tepat 2 jam masih berpita");
  assert.equal(tandaLuring({}, kini - 2 * JAM - 1000, kini, kini).terlambat, true);
  assert.equal(tandaLuring({}, kini - 3 * JAM, kini).terlambat, undefined, "tanpa jam kirim: ragu, pita tetap");
  assert.equal(tandaLuring({}, kini - 3 * JAM, kini, kini + JAM).terlambat, undefined, "jam kirim tidak sah: pita tetap");
  assert.deepEqual(tandaLuring({}, null, kini), {}, "bukan luring: tanpa tanda");
});

test("meja menerima tanda luring lewat ringkasan bersama", async () => {
  const {daruratRingkas} = await import("../../src/lapor_tampil.js");
  assert.deepEqual(daruratRingkas({korban: "ya", luring: {simpan: 5}, terlambat: true}), {korban: "ya", luring: {simpan: 5}, terlambat: true});
  assert.deepEqual(daruratRingkas({korban: "tidak"}), {korban: "tidak"});
  assert.equal(daruratRingkas(null), null);
});
