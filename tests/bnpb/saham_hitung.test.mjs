/* Uji fungsi murni /bnpb/saham: format angka Indonesia, pemetaan galat, pengurai deret/tabel/info. node --test tests/bnpb/saham_hitung.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import * as H from "../../public/bnpb/saham_hitung.js";
import {CONTOH} from "../../public/bnpb/saham_contoh.js";

test("angka format Indonesia", () => {
  assert.equal(H.angka(1234567.891), "1.234.567,89");
  assert.equal(H.angka(6475, 0), "6.475");
  assert.equal(H.angka(-12.5), "-12,50");
  assert.equal(H.angka(-0.001, 2), "0,00");
  assert.equal(H.angka(null), "–"); assert.equal(H.angka("abc"), "–");
  assert.equal(H.persen(4.32), "4,32%"); assert.equal(H.persen(undefined), "–");
});
test("petaGalat", () => {
  assert.equal(H.petaGalat({ok: false, kode: "akses_belum_dibuka"}, 403).jenis, "belum");
  assert.match(H.petaGalat({kode: "akses_belum_dibuka"}, 403).pesan, /belum dibuka penyedia \(Stellar Data\)/);
  assert.equal(H.petaGalat({kode: "masukan_salah", pesan: "q kosong"}, 400).pesan, "q kosong");
  assert.equal(H.petaGalat({kode: "penyedia_galat"}, 502).jenis, "salah");
  assert.equal(H.petaGalat({}, 0).jenis, "jaringan");
  assert.equal(H.petaGalat({}, 401).jenis, "salah");
});
test("uraiDeret: tiga bentuk, bersarang, tak dikenal", () => {
  assert.equal(H.uraiDeret([1, 2, 3]).length, 3);
  assert.deepEqual(H.uraiDeret({a: {b: [[1700000000, 5], [1700000100, 6]]}}).map(x => x.v), [5, 6]);
  assert.equal(H.uraiDeret(CONTOH.grafik).length, 30);
  assert.equal(H.uraiDeret({x: "abc", y: [{a: 1}, {a: 2}]}), null);
  assert.equal(H.uraiDeret(null), null);
});
test("titikGaris: dalam kotak, null bila kurang dari 2 titik, datar tidak NaN", () => {
  const p = H.titikGaris(H.uraiDeret(CONTOH.grafik)).split(" ").map(s => s.split(",").map(Number));
  assert.ok(p.every(([x, y]) => x >= 0 && x <= 640 && y >= 0 && y <= 200));
  assert.equal(H.titikGaris([{t: 1, v: 1}]), null);
  assert.ok(!H.titikGaris([{t: 1, v: 5}, {t: 2, v: 5}]).includes("NaN"));
});
test("ringkasInfo dan uraiTabel", () => {
  const r = H.ringkasInfo(CONTOH.info);
  assert.deepEqual(r.sorot.map(s => s.nama), ["Harga terakhir", "Perubahan", "Perubahan (%)", "Volume"]);
  assert.equal(r.sorot[0].nilai, "Rp 6.475"); assert.equal(r.sorot[1].nilai, "+Rp 75,00"); assert.equal(r.sorot[2].nilai, "+1,17%"); assert.equal(r.sorot[3].nilai, "48.210.500 lembar");
  assert.ok(!r.lain.some(x => /change/.test(x.nama)));
  assert.ok(r.lain.some(x => x.nama === "sektor" && x.nilai === "Keuangan"));
  assert.deepEqual(H.ringkasInfo("x"), {sorot: [], lain: []});
  const t = H.uraiTabel({data: CONTOH.transaksi}); assert.equal(t.baris.length, 50); assert.equal(t.kolom.length, 4); assert.ok(t.kolom.includes("harga (Rp)"));
  assert.equal(H.uraiTabel({a: 1}), null);
  assert.equal(H.uraiTabel(Array.from({length: 80}, (_, i) => ({a: i}))).baris.length, 50);
});
test("tglId, labelSkala, rupiah", () => {
  assert.equal(H.tglId("2026-11-19"), "19 Nov 2026"); assert.equal(H.tglId("abc"), "abc"); assert.equal(H.tglId(null), "–");
  assert.equal(H.rupiah(6475), "Rp 6.475"); assert.equal(H.rupiah(null), "–");
  const l = H.labelSkala(H.uraiDeret(CONTOH.grafik)); assert.equal(l.length, 2); assert.match(l[1], /Nov 2026/);
  assert.equal(H.labelSkala([{t: 0, v: 1}, {t: 1, v: 2}]), null);
});
