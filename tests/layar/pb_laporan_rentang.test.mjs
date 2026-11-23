// PB-83 (F-42): unduh laporan harian untuk rentang tanggal di mesin public/inti/laporan.js.
// Kriteria RENCANA-UJI F-42: rentang tanpa data tidak bisa dipilih; angka periode = gabungan laporan harian menurut agregat metrik
// (jumlah, maks, rerata); tabel per hari satu baris per hari per wilayah; hari berjalan ditandai "Data masih bertambah".
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {fileURLToPath} from "node:url";
import path from "node:path";

const akar = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const baca = p => fs.readFileSync(path.join(akar, p), "utf8");
const SRC = baca("public/inti/data/laporan-contoh.json"), D = JSON.parse(SRC);

const ctx = vm.createContext({document: {addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], documentElement: {dataset: {}}}, URLSearchParams, console});
for (const f of ["format.js", "kartu.js", "laporan.js"]) vm.runInContext(baca("public/inti/" + f), ctx, {filename: f});
ctx.__src = SRC;
const jalan = kode => vm.runInContext(kode, ctx);
const panggil = (fn, qs, dari, sampai) => jalan(`(() => { const D = JSON.parse(__src); const S = Laporan.awal(D, ${JSON.stringify(qs)}); const r = Laporan.${fn}(D, S, ${JSON.stringify(dari)}, ${JSON.stringify(sampai)});
  return JSON.stringify(r, (k, v) => k === "c" ? undefined : v); })()`);
const R = (qs, a, b) => JSON.parse(panggil("rentang", qs, a, b));
const H = (qs, a, b) => JSON.parse(panggil("barisHarian", qs, a, b));
const n = D.hari.length, dari = D.hari[n - 7], sampai = D.hari[n - 1];

test("tanggal di luar laporan atau terbalik = tidak ada rentang (D16)", () => {
  assert.equal(R("", "1999-01-01", sampai), null);
  assert.equal(R("", dari, "2099-01-01"), null);
  assert.equal(R("", sampai, dari), null, "awal sesudah akhir ditolak");
  assert.ok(R("", dari, dari), "satu hari sah");
});

test("angka periode = gabungan laporan harian menurut agregat metrik", () => {
  const r = R("", dari, sampai), i0 = n - 7;
  assert.equal(r.hari.length, 7);
  for (const x of r.ringkas) {
    const a = D.nasional[x.m.k].slice(i0).filter(v => typeof v === "number");
    const harap = !a.length ? null : x.m.agregat === "maks" ? Math.max(...a) : x.m.agregat === "rerata" ? a.reduce((p, q) => p + q, 0) / a.length : a.reduce((p, q) => p + q, 0);
    assert.ok(harap === null ? x.total === null : Math.abs(x.total - harap) < 1e-9, `${x.m.k}: ${x.total} != ${harap}`);
    if (a.length) { assert.equal(x.maks, Math.max(...a)); assert.ok(r.hari.includes(x.hariMaks)); }
  }
  const p = Object.keys(D.prov)[0], m = D.metrik.find(z => z.utama), pr = r.prov.find(z => z.kode === p);
  const aP = D.prov[p][m.k].slice(i0).filter(v => typeof v === "number");
  if (aP.length && (m.agregat || "jumlah") === "jumlah") assert.equal(pr.v[m.k], aP.reduce((s, v) => s + v, 0));
  assert.ok(r.kab.length <= 10);
});

test("?prov= menyaring rentang ke provinsi itu", () => {
  const p = Object.keys(D.prov)[0], r = R("?prov=" + p, dari, sampai);
  assert.deepEqual(r.prov.map(z => z.kode), [p]);
  assert.ok(r.kab.every(k => k.prov === D.prov[p].nama), "kab/kota hanya dari provinsi terpilih");
});

test("tabel per hari: satu baris per hari per wilayah, hari berjalan ditandai", () => {
  const t = H("", dari, sampai), np = Object.keys(D.prov).length, nk = (D.kab || []).length;
  assert.deepEqual(t.kolom.slice(0, 4), ["Tanggal", "Tingkat", "Provinsi", "Wilayah"]);
  assert.equal(t.kolom.length, 4 + D.metrik.length);
  assert.equal(t.baris.length, 7 * (1 + np + nk), "Nasional + provinsi + kab/kota tiap hari");
  assert.ok(t.baris.every(b => b.length === t.kolom.length));
  if (D.hari_lengkap && sampai > D.hari_lengkap) assert.ok(t.baris.some(b => / \(berjalan\)$/.test(b[0])), "hari berjalan bertanda (berjalan)");
  const p = Object.keys(D.prov)[0], tp = H("?prov=" + p, dari, sampai);
  assert.ok(tp.baris.every(b => b[1] === "Kab/kota" ? b[2] === D.prov[p].nama : b[1] === "Provinsi"), "tanpa wilayah lain saat ?prov=");
});

test("tampilan cetak periode memuat ringkasan, tren, dan tanda data berjalan", () => {
  const h = jalan(`(() => { const D = JSON.parse(__src); const S = Laporan.awal(D, ""); return Laporan.htmlRentang(Laporan.rentang(D, S, ${JSON.stringify(dari)}, ${JSON.stringify(sampai)})); })()`);
  for (const t of ["Ringkasan periode", "Tren harian", "Per provinsi", "Kab/kota teratas", "sampai", "7 hari", "lp-bar"]) assert.ok(h.includes(t), `tidak memuat "${t}"`);
  const berjalan = D.hari_lengkap && sampai > D.hari_lengkap;
  assert.ok(h.includes(berjalan ? "Data masih bertambah" : "Data lengkap"));
  assert.doesNotMatch(h, /[ ]·[ ]/, "tanpa titik tengah");
});

test("kepala laporan punya tombol Unduh rentang; dialog memakai kalender inti dan mesin unduh bersama", () => {
  const k = jalan(`(() => { const D = JSON.parse(__src); return Laporan.bagian(D, Laporan.awal(D, ""), "kepala"); })()`);
  assert.ok(k.includes('id="lpRentang"') && k.includes('id="lpCetak"'));
  const js = baca("public/inti/laporan.js");
  assert.match(js, /Kalender\.buka\(/); assert.match(js, /UnduhTabel\.format\.xlsx\(/); assert.match(js, /bisa: t => D\.hari\.includes\(t\)/);
});
