/* Gerbang klasifikasi tingkat penerima proyek pendanaan (pusat, daerah, nonpem, belum). */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const akar = {}; new Function("window", readFileSync(new URL("../../public/fungsi_direktori.js", import.meta.url), "utf8"))(akar);
const t = akar.tingkatPenerima;

test("kementerian dan badan nasional = pusat", () => {
  for (const n of ["Ministry of Finance", "Kementerian PUPR", "BNPB", "BMKG", "Bappenas", "PT PLN Persero (PLN)", "Coordinating Ministry of Economic Affairs", "Indonesia Environment Fund"]) assert.equal(t(n), "pusat", n);
});
test("pemda, BPBD, dinas = daerah, walau nama memuat kementerian", () => {
  for (const n of ["BPBD Provinsi Aceh", "Pemerintah Provinsi Jawa Barat", "Dinas PU Kabupaten Garut", "Kota Yogyakarta", "Pemkab Gayo Lues"]) assert.equal(t(n), "daerah", n);
});
test("LSM, kampus, PBB, swasta = nonpem", () => {
  for (const n of ["Universitas Gadjah Mada", "Yayasan Mercy Corps", "UNICEF", "Palang Merah Indonesia", "World Vision"]) assert.equal(t(n), "nonpem", n);
});
test("kosong atau tak dikenal = belum", () => {
  assert.equal(t(""), "belum"); assert.equal(t(null), "belum"); assert.equal(t("Zxqv"), "belum");
});
test("kategori lembaga graf menang atas nama", () => {
  assert.equal(t("X", {kategori: "lsm"}), "nonpem");
  assert.equal(t("Y", {kategori: "pemerintah", sub: "bpbd"}), "daerah");
  assert.equal(t("Z", {kategori: "pemerintah", skala: "nasional"}), "pusat");
});
