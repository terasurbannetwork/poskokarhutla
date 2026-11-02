import test from "node:test";
import assert from "node:assert/strict";
import {kotakPotong, keTensorBgr, softmax, skorAsli, rataHidup, MODEL_ANTISPOOF, SISI_ANTISPOOF} from "../../public/petugas/antispoof_murni.js";

test("kotakPotong: wajah di tengah diperbesar sesuai skala, inklusif, bulat (sama dengan _get_new_box resmi)", () => {
  // 640 x 480, wajah 100 x 120 di (270, 180): skala 2,7 -> 270 x 324 berpusat (320, 240)
  assert.deepEqual(kotakPotong(640, 480, [270, 180, 100, 120], 2.7), {x0: 185, y0: 78, x1: 455, y1: 402});
});

test("kotakPotong: skala dibatasi ukuran gambar, kotak digeser masuk bukan dipotong", () => {
  // tinggi sumber 480: skala maksimum (479/200) = 2,395 < 4
  const b = kotakPotong(640, 480, [10, 140, 200, 200], 4);
  assert.ok(b.x0 === 0 && b.y0 >= 0 && b.x1 <= 639 && b.y1 <= 479);
  assert.equal(b.y1 - b.y0, 479);   // tinggi sumber penuh: 200 * 2,395 = 479
});

test("kotakPotong: kotak tak sah atau gambar kosong = null", () => {
  assert.equal(kotakPotong(640, 480, [0, 0, 0, 10], 2.7), null);
  assert.equal(kotakPotong(1, 480, [0, 0, 10, 10], 2.7), null);
  assert.equal(kotakPotong(640, 480, [0, 0, NaN, 10], 2.7), null);
});

test("keTensorBgr: CHW urutan B,G,R dari RGBA, nilai 0..255 tanpa normalisasi", () => {
  const rgba = new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 255, 100, 110, 120, 255]);
  assert.deepEqual(Array.from(keTensorBgr(rgba, 2)), [30, 60, 90, 120, 20, 50, 80, 110, 10, 40, 70, 100]);
  assert.equal(keTensorBgr(new Uint8ClampedArray(SISI_ANTISPOOF ** 2 * 4)).length, 3 * 80 * 80);
});

test("softmax: jumlah 1, stabil untuk logit besar; titik uji dari ekspor ONNX (selisih < 1e-6 terhadap torch)", () => {
  assert.ok(Math.abs(softmax([1000, 1001, 999]).reduce((a, b) => a + b) - 1) < 1e-12);
  const p = softmax([-2.55251407623291, 4.036770343780518, -1.486941933631897]);
  assert.ok(Math.abs(p[1] - 0.99466) < 1e-4, String(p[1]));
});

test("skorAsli: rata-rata softmax kelas asli (indeks 1) kedua model, bukan rata-rata logit", () => {
  const a = [-2.55251407623291, 4.036770343780518, -1.486941933631897], b = [-0.9034289717674255, 3.023043632507324, -2.1210408210754395];
  assert.ok(Math.abs(skorAsli([a, b]) - (softmax(a)[1] + softmax(b)[1]) / 2) < 1e-12);
  assert.ok(skorAsli([[5, -5, 0], [5, -5, 0]]) < 0.001, "kelas palsu menang = skor rendah");
  assert.ok(Number.isNaN(skorAsli([])));
  assert.equal(MODEL_ANTISPOOF.length, 2);
});

test("rataHidup: rata-rata frame terbaca; tak ada = 0", () => {
  assert.equal(rataHidup([0.9, 0.7, NaN]), 0.8);
  assert.equal(rataHidup([]), 0); assert.equal(rataHidup([NaN]), 0);
});
