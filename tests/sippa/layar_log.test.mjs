/* SP-010: logika murni layar Log (rekap p50/p90 per kelas, pil n kecil, jam meleset, koreksi). DOM tidak disentuh. */
import test from "node:test";
import assert from "node:assert/strict";
import {rekapKelas, barisAktif, barisKoreksi, pilihBaris, perData, AMBANG_G3} from "../../public/pipa/layar_log.js";

test("perData: waktu data = t_tiba terbaru, null bila log kosong atau tanpa waktu", () => {
  assert.equal(perData([{t_tiba: 5}, {t_tiba: 9}, {t_tiba: null}, {t_tiba: 7}]), 9);
  assert.equal(perData([]), null); assert.equal(perData([{t_tiba: null}]), null);
});

const J = 3600e3, T0 = 1e12;
const baris = (id, kelas, jamTibaAir, extra = {}) => ({id, jenis: "karhutla", kelas_medan: kelas, t_tiba: T0, t_mulai_gelar: T0 + 0.5 * J, t_air_mengalir: T0 + jamTibaAir * J, panjang_m: 1000, n_orang: 6, jam_klien_meleset: 0, ...extra});

test("rekapKelas: p50 dan p90 per kelas dihitung dari tiba sampai air mengalir (jam), kuantil tipe 7", () => {
  const xs = [2.1, 3.4, 2.8, 4.0, 3.1, 5.2, 2.6];
  const r = rekapKelas(xs.map((x, i) => baris("a" + i, "I", x)));
  assert.equal(r.I.n, 7); assert.ok(Math.abs(r.I.p50 - 3.1) < 1e-9); assert.ok(Math.abs(r.I.p90 - 4.48) < 1e-9);
  assert.equal(r.I.kecil, false);
});

test("rekapKelas: n di bawah 5 = kecil, kelas kosong n 0 dengan p50 null (bukan 0)", () => {
  const r = rekapKelas([baris("a", "II", 7), baris("b", "II", 8)]);
  assert.equal(r.II.n, 2); assert.equal(r.II.kecil, true);
  assert.equal(r.III.n, 0); assert.equal(r.III.p50, null); assert.equal(r.III.kecil, true);
});

test("rekapKelas: baris tanpa waktu air mengalir tidak dihitung ulangan; jam meleset dihitung terpisah dan tetap ikut", () => {
  const r = rekapKelas([baris("a", "I", 3), baris("b", "I", 4, {jam_klien_meleset: 1}), baris("c", "I", 9, {t_air_mengalir: null})]);
  assert.equal(r.I.n, 2); assert.equal(r.I.meleset, 1);
});

test("rekapKelas: baris tanpa kelas medan tidak masuk kelas mana pun", () => {
  const r = rekapKelas([baris("a", null, 3), baris("b", "IV", 3)]);
  assert.deepEqual([r.I.n, r.II.n, r.III.n], [0, 0, 0]);
});

test("barisAktif: log yang punya penerus koreksi dikeluarkan, penerusnya tetap", () => {
  const a = baris("lama", "I", 3), b = baris("baru", "I", 4, {koreksi_dari: "lama"});
  assert.deepEqual(barisAktif([a, b]).map(x => x.id), ["baru"]);
});

test("barisAktif: baris dummy tetap tampil; server menyaring dummy per peran (lihatDummy, tests/warga/sippa.test.mjs)", () => {
  assert.deepEqual(barisAktif([baris("a", "I", 3), baris("d", "I", 3, {dummy: 1})]).map(x => x.id), ["a", "d"]);
});

test("AMBANG_G3: tiga kelas, p50 dan p90 naik menurut kelas (PRD G3)", () => {
  assert.deepEqual(AMBANG_G3.I, {p50: 4, p90: 6}); assert.deepEqual(AMBANG_G3.II, {p50: 8, p90: 12}); assert.deepEqual(AMBANG_G3.III, {p50: 24, p90: 36});
});

test("barisKoreksi: koreksi dibuang, dummy tetap (server yang menyaring dummy per peran)", () => {
  const a = baris("lama", "I", 3), b = baris("baru", "I", 4, {koreksi_dari: "lama"}), d = baris("d", "II", 5, {dummy: 1});
  assert.deepEqual(barisKoreksi([a, b, d]).map(x => x.id), ["baru", "d"]);
});

test("pilihBaris: baris dummy yang dikirim server ikut tampil di layar (bukan 'belum ada ulangan')", () => {
  const log = [baris("d1", "I", 3, {dummy: 1, prov: "62"}), baris("d2", "II", 9, {dummy: 1, prov: "62"})];
  const st = {jenis: new Set(["karhutla", "banjir", "latihan"]), meleset: false};
  const rows = pilihBaris(log, st, "62");
  assert.deepEqual(rows.map(x => x.id), ["d1", "d2"]);
  assert.equal(rekapKelas(rows).I.n, 1, "ulangan dummy dihitung di rekap");
});

test("pilihBaris: jenis, provinsi (baris tanpa prov lolos), dan hanya-meleset menyaring", () => {
  const log = [baris("a", "I", 3, {prov: "62"}), baris("b", "I", 3, {prov: "64"}), baris("c", "I", 3, {prov: null}), baris("d", "I", 3, {jenis: "banjir", prov: "62"}), baris("e", "I", 3, {prov: "62", jam_klien_meleset: 1})];
  const st = {jenis: new Set(["karhutla"]), meleset: false};
  assert.deepEqual(pilihBaris(log, st, "62").map(x => x.id), ["a", "c", "e"]);
  assert.deepEqual(pilihBaris(log, st, "").map(x => x.id), ["a", "b", "c", "e"], "tanpa provinsi terpilih: semua provinsi");
  assert.deepEqual(pilihBaris(log, {...st, meleset: true}, "62").map(x => x.id), ["e"]);
});
