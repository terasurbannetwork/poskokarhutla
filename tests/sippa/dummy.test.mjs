/* SP-053: tombol dummy Super Admin /pipa (DS §3.19, PRD §9.14). Logika murni di dummy.js; rute dummy diuji di tests/warga/sippa.test.mjs. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {bolehDummy, kalimat, jalankan} from "../../public/pipa/dummy.js";

const tanpaDilarang = t => assert.doesNotMatch(t, /[—·]/, `em dash atau titik tengah: ${t}`);
const sumber = f => readFileSync(new URL(`../../public/pipa/${f}`, import.meta.url), "utf8");

test("bolehDummy: hanya data-super=1 (Super Admin); staf, admin biasa, kosong, dan nilai liar ditolak", () => {
  assert.equal(bolehDummy({super: "1"}), true);
  for (const d of [{super: "0"}, {super: ""}, {super: "true"}, {super: "11"}, {}, null, undefined]) assert.equal(bolehDummy(d), false, JSON.stringify(d));
});

test("jalankan isi: POST /api/sippa/dummy/isi dengan layar yang sedang dibuka, bukan pilihan lain", async () => {
  const panggil = [];
  const kirim = async (url, body) => { panggil.push([url, body]); return {ok: true, status: 200, j: {dibuat: {sippa_kit: 7, sippa_komponen: 30}}}; };
  const h = await jalankan("isi", "kit", kirim);
  assert.deepEqual(panggil, [["/api/sippa/dummy/isi", {layar: "kit"}]]);
  assert.equal(h.ok, true); assert.match(h.pesan, /37 baris/); tanpaDilarang(h.pesan);
});

test("jalankan hapus: POST /api/sippa/dummy/hapus tanpa layar (hapus dari layar mana pun), jumlah dari semua tabel", async () => {
  const panggil = [];
  const kirim = async (url, body) => { panggil.push([url, body]); return {ok: true, status: 200, j: {dihapus: {sippa_bbm: 4, sippa_kit: 7, sippa_foto: 0}}}; };
  const h = await jalankan("hapus", "log", kirim);
  assert.deepEqual(panggil, [["/api/sippa/dummy/hapus", {}]]);
  assert.match(h.pesan, /11 baris dummy dihapus/); assert.match(h.pesan, /Data nyata tidak tersentuh/);
});

test("jalankan: layar tanpa pengisi (200 tanpa baris) dijelaskan, bukan 0 baris dilaporkan sukses", async () => {
  const h = await jalankan("isi", "peta", async () => ({ok: true, status: 200, j: {dibuat: {}}}));
  assert.equal(h.ok, true); assert.doesNotMatch(h.pesan, /\b0 baris/); assert.match(h.pesan, /tidak ada baris dummy/i);
});

test("jalankan: yang salah DITOLAK dengan kalimat tetap (409, 429, 401, 403, 503, jaringan, galat server) dan ok=false", async () => {
  const kasus = [[409, /sudah ada untuk periode itu/], [429, /terlalu sering/i], [401, /Super Admin/], [403, /Super Admin/], [503, /migrasi/i], [0, /terhubung/], [500, /Coba lagi/]];
  for (const [status, re] of kasus) {
    const h = await jalankan("isi", "kit", async () => ({ok: false, status, j: {}}));
    assert.equal(h.ok, false, String(status)); assert.match(h.pesan, re, String(status)); tanpaDilarang(h.pesan);
  }
});

test("jalankan: aksi liar dan layar liar tidak pernah sampai ke jaringan", async () => {
  let n = 0; const kirim = async () => { n++; return {ok: true, status: 200, j: {}}; };
  await assert.rejects(() => jalankan("ubah", "kit", kirim), /aksi/);
  await assert.rejects(() => jalankan("isi", "", kirim), /layar/);
  await assert.rejects(() => jalankan("isi", "../x", kirim), /layar/);
  assert.equal(n, 0);
});

test("jalankan: galat dari server dikembalikan sebagai teks, tidak pernah lewat innerHTML", async () => {
  const h = await jalankan("isi", "kit", async () => ({ok: false, status: 400, j: {galat: "<img src=x onerror=1>"}}));
  assert.equal(h.ok, false); assert.equal(typeof h.pesan, "string");
  assert.doesNotMatch(sumber("dummy.js"), /innerHTML\s*=[^;]*pesan/, "pesan tidak boleh lewat innerHTML");
});

test("kalimat: angka lewat id-ID (titik ribuan), tanpa toFixed", () => {
  assert.match(kalimat("isi", {ok: true, status: 200, j: {dibuat: {a: 1200}}}), /1\.200 baris/);
  assert.doesNotMatch(sumber("dummy.js"), /toFixed/);
});

test("app.js memasang tombol dummy hanya lewat bolehDummy dan memuat ulang penuh sesudah isi dan hapus (DUMMY.md syarat 6)", () => {
  const app = sumber("app.js") + sumber("dummy.js");
  assert.match(sumber("app.js"), /from "\.\/dummy\.js"/); assert.match(sumber("app.js"), /bolehDummy\(/);
  assert.match(app, /location\.reload\(\)/);
  assert.match(app, /Isi data dummy untuk layar ini/); assert.match(app, /Hapus seluruh data dummy SIPPA/);
});

test("SP-053: tiap layar di router (termasuk rincian aset) memetakan ke kunci RANTAI_DUMMY yang diterima server; jalur liar = kosong (ditolak sebelum jaringan)", async () => {
  const {LAYAR} = await import("../../public/pipa/app.js"), {layarDummy} = await import("../../public/pipa/dummy.js");
  const src = readFileSync(new URL("../../src/sippa.js", import.meta.url), "utf8");
  const kunci = new Set([...(/export const LAYAR_SIPPA = \[([^\]]*)\]/.exec(src)[1].match(/"([^"]+)"/g) || []).map(s => s.slice(1, -1)), "ringkas", "lapangan"]);
  for (const l of LAYAR) assert.ok(kunci.has(layarDummy(l)), `layar ${l} -> ${layarDummy(l)} tidak ada di RANTAI_DUMMY`);
  assert.equal(layarDummy("aset"), "pelihara"); assert.equal(layarDummy(undefined), ""); assert.equal(layarDummy(null), "");
});
