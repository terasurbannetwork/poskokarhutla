/* Fungsi murni modul Lapangan (src/lapangan_konst.js, ALGORITMA §2-§5): kosinus, haversine, lompatan mustahil, sudut, putusStatus.
   Tiap alasan tinjau/tolak punya kasus yang DITOLAK/ditinjau, berpasangan dengan kembar yang lolos. */
import {test} from "node:test";
import assert from "node:assert/strict";
import * as K from "../../src/lapangan_konst.js";

const b64 = f => Buffer.from(new Float32Array(f).buffer).toString("base64");
const BAIK = {fotoSudahDipakai: false, nonceSah: true, gpsDitolak: false, wajahTerdaftar: true, skorWajah: 0.8, tantanganLolos: true, skorHidup: 0.9, gpsCuriga: false, dalamRadius: true, jamHp: false, luring: false};
const putus = (u = {}) => K.putusStatus({...BAIK, ...u});

test("konstanta sesuai ALGORITMA", () => {
  assert.deepEqual([K.AMBANG_LOLOS, K.AMBANG_TINJAU, K.AMBANG_HIDUP, K.AMBANG_DAFTAR], [0.60, 0.45, 0.50, 0.45]);
  assert.deepEqual(K.GPS, {sampel: 3, jedaMs: 1000});
  assert.deepEqual(K.RADIUS_BAWAAN_M, {lapangan: 2000, posko: 300});
  assert.equal(K.BATAS_JAM_HP_DETIK, 300);
  assert.deepEqual(K.LURING, {mundurMs: 86400e3, majuMs: 300e3});
  assert.equal(K.KECEPATAN_MUSTAHIL_KMJ, 900);
  assert.deepEqual(K.NONCE, {umurMs: 300e3, luringJumlah: 6, luringUmurMs: 36 * 3600e3});
  assert.deepEqual([K.TANDA_YAW, K.TANDA_PITCH], [1, 1]);
  assert.equal(K.VERSI_SETUJU, "2026-11-01");
  assert.deepEqual(K.ARAH, ["depan", "kiri", "kanan", "atas", "bawah"]);
  assert.ok(!/[·]/.test(K.TEKS_SETUJU) && /kamu/.test(K.TEKS_SETUJU) && /2 tahun/.test(K.TEKS_SETUJU), "teks persetujuan: sapaan kamu, masa simpan, tanpa titik tengah");
  assert.ok(!JSON.stringify(K.KONST_PUBLIK).match(/secret|token|salt/i), "konstanta publik tanpa rahasia");
});

test("kosinus: sama = 1, tegak lurus = 0, berlawanan = -1; panjang beda ditolak", () => {
  assert.ok(Math.abs(K.kosinus(b64([1, 2, 3]), b64([1, 2, 3])) - 1) < 1e-6);
  assert.ok(Math.abs(K.kosinus(b64([1, 0]), b64([0, 1]))) < 1e-9);
  assert.ok(Math.abs(K.kosinus(b64([1, 2]), b64([-1, -2])) + 1) < 1e-6);
  assert.equal(K.kosinus(b64([0, 0]), b64([1, 1])), 0);
  assert.equal(K.kosinus(new Float32Array([2, 0]), new Float32Array([5, 0])), 1);
  assert.throws(() => K.kosinus(b64([1, 2]), b64([1, 2, 3])), /panjang/);
  assert.throws(() => K.vektorDari(Buffer.from([1, 2, 3]).toString("base64")), /kelipatan 4/);
});

test("haversine: nol, satu derajat lintang, dan antarkota", () => {
  assert.equal(K.haversineM(-0.05, 116.4, -0.05, 116.4), 0);
  assert.ok(Math.abs(K.haversineM(0, 100, 1, 100) - 111195) < 100);
  const jktSby = K.haversineM(-6.2, 106.8, -7.25, 112.75);
  assert.ok(jktSby > 650e3 && jktSby < 680e3, String(jktSby));
});

test("dalamRadius: tambah akurasi paling banyak 200 m", () => {
  assert.equal(K.dalamRadius(2100, 2000, 100), true);
  assert.equal(K.dalamRadius(2201, 2000, 5000), false, "akurasi 5 km hanya menambah 200 m");
  assert.equal(K.dalamRadius(2200, 2000, 5000), true);
  assert.equal(K.dalamRadius(2001, 2000, 0), false);
});

test("lompatanMustahil: pesawat lolos, teleportasi ditolak, derau GPS diabaikan", () => {
  const a = {lat: -6.2, lon: 106.8, waktu: 0};
  assert.equal(K.lompatanMustahil(a, {lat: -7.25, lon: 112.75, waktu: 3600e3}), false, "Jakarta-Surabaya 1 jam = 670 km/jam, masih mungkin");
  assert.equal(K.lompatanMustahil(a, {lat: -7.25, lon: 112.75, waktu: 1800e3}), true, "670 km dalam 30 menit = 1340 km/jam");
  assert.equal(K.lompatanMustahil(a, {lat: -6.2, lon: 106.805, waktu: 1000}), false, "500 m dalam 1 detik: derau, bukan lompatan");
  assert.equal(K.lompatanMustahil(a, {lat: -7.25, lon: 112.75, waktu: 0}), true, "waktu sama, jarak jauh");
});

test("sudutCocok: tiap arah menerima sudutnya dan menolak tetangganya", () => {
  const ok = {depan: [0, 0], kiri: [-30, 0], kanan: [30, 5], atas: [0, -20], bawah: [5, 20]};
  for (const [arah, [y, p]] of Object.entries(ok)) {
    assert.equal(K.sudutCocok(arah, y, p), true, arah);
    for (const lain of K.ARAH.filter(x => x !== arah)) assert.equal(K.sudutCocok(lain, y, p), false, `${arah} tidak boleh cocok sebagai ${lain}`);
  }
  assert.equal(K.sudutCocok("kiri", -20, 0), false, "kurang dari 22 derajat");
  assert.equal(K.sudutCocok("kiri", -30, 13), false, "pitch di luar 12");
  assert.equal(K.sudutCocok("serong", 0, 0), false);
});

test("putusStatus: semua syarat terpenuhi = lolos tanpa alasan", () => {
  assert.deepEqual(putus(), {status: "lolos", alasan: []});
  assert.deepEqual(putus({skorWajah: K.AMBANG_LOLOS, skorHidup: K.AMBANG_HIDUP}), {status: "lolos", alasan: []}, "tepat di ambang = lolos");
  assert.deepEqual(putus({luring: true}), {status: "lolos", alasan: []}, "luring sendiri tidak memaksa tinjau (nonce sah)");
});

test("putusStatus: pelanggaran keras = tolak, skor rendah tidak pernah menolak", () => {
  assert.deepEqual(putus({fotoSudahDipakai: true}), {status: "tolak", alasan: ["foto_ganda"]});
  assert.deepEqual(putus({nonceSah: false}), {status: "tolak", alasan: ["nonce_tidak_sah"]});
  assert.deepEqual(putus({gpsDitolak: true}), {status: "tolak", alasan: ["gps_ditolak"]});
  assert.deepEqual(putus({nonceSah: false, fotoSudahDipakai: true, gpsDitolak: true}).alasan, ["foto_ganda", "nonce_tidak_sah", "gps_ditolak"]);
  assert.equal(putus({skorWajah: 0, skorHidup: 0, tantanganLolos: false, gpsCuriga: true, dalamRadius: false, jamHp: true}).status, "tinjau", "skor nol pun hanya tinjau");
});

test("putusStatus: tiap alasan tinjau berdiri sendiri", () => {
  const kasus = [
    [{wajahTerdaftar: false, skorWajah: null}, ["wajah_belum_daftar"]],
    [{skorWajah: 0.59}, ["wajah_rendah"]],
    [{skorWajah: 0.45}, ["wajah_rendah"]],
    [{skorWajah: 0.44}, ["wajah_berbeda"]],
    [{skorWajah: NaN}, ["wajah_berbeda"]],
    [{tantanganLolos: false}, ["tantangan_gagal"]],
    [{skorHidup: 0.49}, ["hidup_rendah"]],
    [{skorHidup: null}, ["hidup_rendah"]],
    [{gpsCuriga: true}, ["gps_curiga"]],
    [{dalamRadius: false}, ["luar_radius"]],
    [{jamHp: true}, ["jam_hp"]],
  ];
  for (const [u, alasan] of kasus) assert.deepEqual(putus(u), {status: "tinjau", alasan}, JSON.stringify(u));
});

test("putusStatus: gabungan alasan, luring ikut tercatat, tanpa wajah melewati skor/tantangan", () => {
  assert.deepEqual(putus({dalamRadius: false, gpsCuriga: true, luring: true}), {status: "tinjau", alasan: ["gps_curiga", "luar_radius", "luring"]});
  assert.deepEqual(putus({wajahTerdaftar: false, skorWajah: null, tantanganLolos: false, skorHidup: 0}), {status: "tinjau", alasan: ["wajah_belum_daftar"]});
  assert.deepEqual(putus({skorWajah: 0.3, tantanganLolos: false, skorHidup: 0.1}).alasan, ["wajah_berbeda", "tantangan_gagal", "hidup_rendah"]);
  for (const a of putus({skorWajah: 0.3, gpsCuriga: true, dalamRadius: false, jamHp: true, luring: true, tantanganLolos: false, skorHidup: 0}).alasan) assert.ok(K.ALASAN_TINJAU.includes(a), a);
});
