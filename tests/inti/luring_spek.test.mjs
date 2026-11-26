/* LR-02: spek Lapor tanpa sinyal (data/kajian-bnpb/lapor-luring RENCANA-UJI bagian 1, butir spek).
   Jalankan: node --test tests/inti/luring_spek.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import {JENIS as JENIS_MESIN} from "../../src/lapor_spek.js";
import * as S from "../../public/inti/luring_spek.js";
import * as Peramban from "../../public/inti/luring_spek.js?peramban";   // instansi modul lain, seperti <script type="module">

const KINI = Date.parse("2026-11-25T07:32:00Z");
const sah = () => ({jenis: "banjir", waktu: "sedang_berlangsung", korban: "belum_tahu", lokasi: {lat: -6.2, lon: 106.8, akurasi: 12.4, waktu: KINI, sumber: "gps"}});

test("jenis sama dengan pilihan Lapor darurat di mesin (src/lapor_spek.js tanpa lainnya)", () => {
  assert.deepEqual(S.JENIS, JENIS_MESIN.filter(j => j.id !== "lainnya").map(j => [j.id, j.label]));
});

test("empat isian wajib: yang kosong ditolak dan disebut di kurang; isi sah lolos", () => {
  const r = S.periksa(sah());
  assert.equal(r.ok, true, JSON.stringify(r.galat));
  assert.deepEqual(r.data, {jenis: "banjir", waktu: "sedang_berlangsung", korban: "belum_tahu", lokasi: {lat: -6.2, lon: 106.8, akurasi: 12, waktu: KINI, sumber: "gps"}});
  for (const n of ["jenis", "waktu", "korban", "lokasi"]) for (const kosong of [undefined, null, ""]) {
    const isi = {...sah(), [n]: kosong}; if (kosong === undefined) delete isi[n];
    const h = S.periksa(isi);
    assert.equal(h.ok, false, `${n}=${kosong}`);
    assert.deepEqual(h.kurang, [n], `${n}=${kosong}`);
    assert.ok(!(n in h.data), `${n} kosong tidak boleh muncul di data`);
  }
  assert.deepEqual(S.periksa({}).kurang, ["jenis", "waktu", "korban", "lokasi"]);
  assert.equal(S.periksa(null).ok, false);
  assert.equal(S.periksa([]).ok, false);
});

test("kosong tidak jadi nol dan tidak jadi 'tidak': korban kosong tidak diganti, ringkasan tidak menghasilkan angka", () => {
  const {korban, ...tanpa} = sah();
  const r = S.periksa({...tanpa, ringkasan: "3 rumah hanyut, 2 orang hilang"});
  assert.equal(r.data.korban, undefined);
  assert.equal(r.data.ringkasan, "3 rumah hanyut, 2 orang hilang");
  assert.deepEqual(Object.keys(r.data).sort(), ["jenis", "lokasi", "ringkasan", "waktu"]);
  assert.ok(Object.values(r.data).every(v => typeof v !== "number"), "tidak ada isian angka dari teks bebas");
  assert.equal("ringkasan" in S.periksa({...sah(), ringkasan: "   "}).data, false, "ringkasan spasi saja = tidak diisi");
  assert.equal(S.periksa({...sah(), ringkasan: "   "}).ok, true);
});

test("nilai di luar daftar, ringkasan 501 huruf, dan koordinat di luar Indonesia ditolak", () => {
  for (const [n, v] of [["jenis", "lainnya"], ["jenis", "Banjir"], ["waktu", "minggu_lalu"], ["korban", "0"], ["korban", 0]]) assert.equal(S.periksa({...sah(), [n]: v}).ok, false, `${n}=${v}`);
  assert.equal(S.periksa({...sah(), ringkasan: "x".repeat(500)}).ok, true);
  assert.equal(S.periksa({...sah(), ringkasan: "x".repeat(501)}).ok, false);
  const lok = o => S.periksa({...sah(), lokasi: {...sah().lokasi, ...o}});
  for (const o of [{lat: 51.5, lon: -0.1}, {lat: -6.2, lon: 150}, {lat: "x"}, {akurasi: -1}, {akurasi: undefined}, {sumber: "tebak"}, {waktu: "kemarin"}]) assert.equal(lok(o).ok, false, JSON.stringify(o));
  assert.equal(S.periksa({...sah(), lokasi: "Jakarta"}).ok, false);
});

test("lokasi dipilih sendiri (Q7): kode kab/kota baku saja", () => {
  assert.deepEqual(S.periksa({...sah(), lokasi: {kab: "31.75", sumber: "pilih"}}).data.lokasi, {kab: "31.75", sumber: "pilih"});
  for (const kab of ["3175", "31.7", "Jakarta", 3175]) assert.equal(S.periksa({...sah(), lokasi: {kab, sumber: "pilih"}}).ok, false, String(kab));
  assert.equal(S.periksa({...sah(), lokasi: {kab: "31.75", sumber: "gps"}}).ok, false, "gps tanpa titik");
});

test("waktu_klien: lebih dari 5 menit di depan atau lebih tua dari 14 hari ditolak", () => {
  const M = 6e4, H = 864e5;
  assert.equal(S.waktuKlienSah(KINI, KINI), true);
  assert.equal(S.waktuKlienSah(KINI + 5 * M, KINI), true);
  assert.equal(S.waktuKlienSah(KINI + 5 * M + 1, KINI), false);
  assert.equal(S.waktuKlienSah(KINI - 14 * H, KINI), true);
  assert.equal(S.waktuKlienSah(KINI - 14 * H - 1, KINI), false);
  assert.equal(S.waktuKlienSah("1764055920000", KINI), false);
  assert.equal(S.waktuKlienSah(null, KINI), false);
});

test("label pita: jenis dan jam WIB saja, tanpa lokasi atau nomor", () => {
  assert.equal(S.label("banjir", KINI), "Banjir, 14.32");
  assert.equal(S.label("tak_dikenal", KINI), "Laporan, 14.32");
  assert.doesNotMatch(S.label("gempa", KINI), /-?\d+\.\d{3,}|08\d{6,}/);
});

test("batas antrean Q9: 5 butir, 3 foto, 20 MB, kuota HP; tidak ada simpan sebagian", () => {
  const MB = 1024 * 1024;
  assert.equal(S.bolehSimpan({}).ok, true);
  assert.equal(S.bolehSimpan({butirMenunggu: 4}).ok, true);
  assert.equal(S.bolehSimpan({butirMenunggu: 5}).ok, false);
  assert.equal(S.bolehSimpan({foto: 3}).ok, true);
  assert.equal(S.bolehSimpan({foto: 4}).ok, false);
  assert.equal(S.bolehSimpan({byteTersimpan: 18 * MB, byteBaru: 2 * MB}).ok, true);
  assert.equal(S.bolehSimpan({byteTersimpan: 18 * MB, byteBaru: 2 * MB + 1}).ok, false);
  assert.equal(S.bolehSimpan({byteBaru: 3 * MB, sisaKuota: 2 * MB}).ok, false);
  assert.match(S.bolehSimpan({butirMenunggu: 5}).pesan, /Kirim yang menunggu dulu/);
});

test("batas tetap: angka sesuai KEPUTUSAN dan beku", () => {
  const MENIT = 6e4;
  assert.equal(S.VERSI_SPEK, 1);
  assert.equal(Object.isFrozen(S.BATAS), true);
  assert.deepEqual({r: S.BATAS.ringkasan, f: S.BATAS.fotoPerButir, b: S.BATAS.butir, u: S.BATAS.umurMs / 864e5, s: S.BATAS.fotoSegarMs / MENIT, p: S.BATAS.pitaDaruratMs / 36e5},
    {r: 500, f: 3, b: 5, u: 14, s: 5, p: 2});
});

test("klien dan Worker memakai satu definisi: dua instansi modul memberi hasil sama", () => {
  const contoh = [sah(), {}, {...sah(), jenis: "x"}, {...sah(), lokasi: {kab: "31.75", sumber: "pilih"}}, {...sah(), ringkasan: "x".repeat(501)}];
  for (const c of contoh) assert.deepEqual(Peramban.periksa(c), S.periksa(c));
  assert.deepEqual(Peramban.BATAS, S.BATAS);
});
