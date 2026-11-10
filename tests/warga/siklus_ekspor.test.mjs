/* Siklus Bencana F4: ekspor baca rumah rusak dan pemulihan (SK-070, UJ-F4-10). Rekap hanya hitungan per tingkat dan kecamatan, tanpa koordinat, foto, atau nama pelapor;
   kemajuan pemulihan tanpa koordinat, pelaksana, atau sumber dana. D1 Miniflare sungguhan, migrasi apa adanya. Jalankan: node --test tests/warga/siklus_ekspor.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {mulai, id16} from "./_siklus.mjs";
import {rekapTingkat} from "../../src/rumah_rusak.js";
import {kemajuanPemulihan, RUTE_PEMULIHAN} from "../../src/pemulihan.js";
import {RUTE_RUMAH_RUSAK, TINGKAT} from "../../src/rumah_rusak.js";

const U = await mulai("uji-sk-ekspor", {r2: false});
const env = {DB: U.DB};
const rr = (tingkat, {kab = "Bogor", kec = "Cibinong", tgl = "2026-03-03", status = "sah", bencana = "banjir", prov = "32"} = {}) =>
  U.DB.prepare("INSERT INTO rumah_rusak (id, bencana, tanggal, lat, lon, prov, kab, kec, tingkat, foto, pelapor, waktu, status, catatan) VALUES (?, ?, ?, -6.51234, 106.81234, ?, ?, ?, ?, 1, 'akun:pelapor123', 1, ?, 'milik Pak Rahasia 0812')").bind(id16(), bencana, tgl, prov, kab, kec, tingkat, status).run();
for (const [t, o] of [["berat", {}], ["berat", {kec: "Citeureup"}], ["sedang", {}], ["ringan", {}], ["ringan", {}], ["berat", {kab: "Garut"}], ["berat", {status: "ditolak"}], ["berat", {tgl: "2025-12-31"}], ["sedang", {bencana: "longsor"}]]) await rr(t, o);
const f = {prov: "32", kab: "Bogor", dari: "2026-03-01", sampai: "2026-03-31"};

uji("UJ-F4-10: rekapTingkat menghitung per tingkat per kecamatan hanya laporan sah, kabupaten dan jendela tanggal itu", async () => {
  const r = await rekapTingkat(env, f);
  assert.deepEqual(r.map(x => [x.kec, x.berat, x.sedang, x.ringan, x.total]), [["Cibinong", 1, 2, 2, 5], ["Citeureup", 1, 0, 0, 1]], "ditolak, kabupaten lain, tanggal di luar jendela tidak ikut");
  assert.deepEqual((await rekapTingkat(env, {...f, bencana: "banjir"})).map(x => x.total), [4, 1]); assert.deepEqual((await rekapTingkat(env, {...f, kab: "Tidak Ada"})), []);
});
uji("UJ-F4-10: rekap tanpa koordinat, foto, catatan, pelapor, atau waktu; kunci keluaran dikunci", async () => {
  const r = await rekapTingkat(env, f);
  for (const x of r) assert.deepEqual(Object.keys(x).sort(), ["berat", "kec", "ringan", "sedang", "total"]);
  assert.doesNotMatch(JSON.stringify(r), /lat|lon|foto|pelapor|catatan|Rahasia|0812|106\.8|-6\.5/);
});
uji("ekspor hanya menambah: rute rumah rusak dan pemulihan yang ada tetap sama, TINGKAT tidak berubah", () => {
  assert.deepEqual(TINGKAT, ["berat", "sedang", "ringan"]);
  assert.deepEqual(Object.keys(RUTE_RUMAH_RUSAK).sort(), ["GET /api/rumah-rusak", "GET /api/rumah-rusak/rekap", "GET /rumah-rusak", "POST /api/rumah-rusak", "POST /api/rumah-rusak/:id", "POST /api/rumah-rusak/foto/:id", "GET /api/rumah-rusak/foto/:id"].sort());
  assert.equal(Object.keys(RUTE_PEMULIHAN).length, 6);
});
uji("kemajuanPemulihan membaca target, realisasi, status per id tanpa koordinat, pelaksana, sumber dana; id kosong atau asing tidak menulis dan tidak galat", async () => {
  const a = id16(), b = id16();
  for (const [id, real] of [[a, 40], [b, 10]]) await U.DB.prepare("INSERT INTO pemulihan (id, jenis, prov, kab, desa, lat, lon, target, realisasi, satuan, pelaksana, sumber_dana, status, dibuat, diubah) VALUES (?, 'huntara', '32', 'Bogor', 'Desa Rahasia', -6.5, 106.8, 100, ?, 'unit', 'PT Rahasia', 'APBN rahasia', 'berjalan', 1, 2)").bind(id, real).run();
  const r = await kemajuanPemulihan(env, [a, "ffffffffffffffff"]);
  assert.equal(r.length, 1); assert.deepEqual(Object.keys(r[0]).sort(), ["diubah", "id", "jenis", "mulai", "realisasi", "satuan", "selesai", "status", "target"]); assert.equal(r[0].realisasi, 40);
  assert.doesNotMatch(JSON.stringify(r), /Rahasia|lat|lon|pelaksana|sumber_dana|desa/);
  assert.deepEqual(await kemajuanPemulihan(env, []), []); assert.equal((await kemajuanPemulihan(env, [a, b])).length, 2);
  assert.equal((await U.DB.prepare("SELECT count(*) n FROM pemulihan").first()).n, 2, "tidak menulis");
});
