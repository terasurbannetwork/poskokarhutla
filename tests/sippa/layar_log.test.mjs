/* SP-010: logika murni layar Log (rekap p50/p90 per kelas, pil n kecil, jam meleset, koreksi). DOM tidak disentuh. */
import test from "node:test";
import assert from "node:assert/strict";
import {rekapKelas, barisAktif, perData, AMBANG_G3} from "../../public/pipa/layar_log.js";

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

test("barisAktif: baris dummy tidak pernah masuk rekap nyata", () => {
  assert.deepEqual(barisAktif([baris("a", "I", 3), baris("d", "I", 3, {dummy: 1})]).map(x => x.id), ["a"]);
});

test("AMBANG_G3: tiga kelas, p50 dan p90 naik menurut kelas (PRD G3)", () => {
  assert.deepEqual(AMBANG_G3.I, {p50: 4, p90: 6}); assert.deepEqual(AMBANG_G3.II, {p50: 8, p90: 12}); assert.deepEqual(AMBANG_G3.III, {p50: 24, p90: 36});
});
