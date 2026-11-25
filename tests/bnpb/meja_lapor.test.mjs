import test from "node:test";
import assert from "node:assert/strict";
import {bedaLapor, dariDaftar, rekapBaru, dataUbah} from "../../public/bnpb/meja_lapor.js";

const kolom = [{nama: "meninggal", label: "Meninggal", tipe: "angka"}, {nama: "luka", label: "Luka", tipe: "angka"}, {nama: "kec", label: "Kecamatan", tipe: "wilayah"}, {nama: "nama_kejadian", label: "Nama", tipe: "teks"}];
const d = {lapor_berkas: "b1", meninggal: 3, nama_kejadian: "banjir", lapor_daftar: {meninggal: 5, luka: 2}, lapor_sumber: {luka: "daftar"}, lapor_beda: ["meninggal", "luka"], lapor_rekap_baru: {nilai: {meninggal: 6}, nihil: ["luka"], waktu: 1}};

test("beda sumber: dua angka, kosong tetap null bukan 0", () => {
  assert.deepEqual(bedaLapor(d, kolom), [{nama: "meninggal", label: "Meninggal", ketik: 3, daftar: 5}, {nama: "luka", label: "Luka", ketik: null, daftar: 2}]);
  assert.deepEqual(bedaLapor({meninggal: 1, lapor_beda: ["meninggal"], lapor_daftar: {meninggal: 2}}, kolom), [], "tanpa lapor_berkas bukan catatan berkas");
});
test("sumber daftar dan rekap baru", () => {
  assert.equal(dariDaftar(d, "luka"), true); assert.equal(dariDaftar(d, "meninggal"), false);
  assert.deepEqual(rekapBaru(d, kolom).butir, [{nama: "meninggal", label: "Meninggal", nilai: 6}, {nama: "luka", label: "Luka", nilai: null}]);
  assert.equal(rekapBaru({...d, lapor_rekap_baru: undefined}, kolom), null);
});
test("data ubah tanpa kunci sistem dan wilayah", () => assert.deepEqual(dataUbah(d, kolom), {meninggal: 3, nama_kejadian: "banjir"}));
