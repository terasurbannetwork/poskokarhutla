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
