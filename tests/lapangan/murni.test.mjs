import test from "node:test";
import assert from "node:assert/strict";
import {bacaKode, statusWajah, labelJenis, pesanGalat, cekCsv, tautanLapangan, MAKS_CSV, potong, pesanGps, jarakM, teksJarak, tautanAman, teksAlasan, hasilAbsen, keMs, barisRiwayat, pilihTugas, langkahAbsen} from "../../public/petugas/murni.js";

const K = "0123456789abcdef0123456789";

test("bacaKode: hanya #k= + 26 heks, huruf besar dikecilkan", () => {
  assert.equal(bacaKode("#k=" + K), K);
  assert.equal(bacaKode("#k=" + K.toUpperCase()), K);
  for (const salah of ["", null, undefined, "#k=", "#k=abc", "#k=" + K + "0", "#k=" + K.slice(1), "#k=" + "z".repeat(26), "k=" + K, "#x=" + K, "#k=" + K + "&a=1", " #k=" + K])
    assert.equal(bacaKode(salah), null, String(salah));
});

test("statusWajah: peta label dan warna; status asing tidak dianggap terdaftar", () => {
  assert.deepEqual(statusWajah("terdaftar"), {label: "Terdaftar", kelas: "hijau", daftar: true});
  assert.equal(statusWajah("belum").kelas, "kuning");
  assert.equal(statusWajah("dihapus").daftar, false);
  for (const x of [undefined, null, "", "aneh", "__proto__", "constructor"]) assert.equal(statusWajah(x).daftar, false, String(x));
});

test("labelJenis memakai istilah glosarium", () => {
  assert.equal(labelJenis("relawan"), "Relawan BNPB");
  assert.equal(labelJenis("pegawai"), "Pegawai");
  assert.equal(labelJenis("x"), "");
});

test("pesanGalat: kalimat manusiawi per status, tanpa titik tengah atau em dash", () => {
  for (const s of [0, 401, 403, 429, 500, 503]) assert.ok(pesanGalat(s).length > 20 && !/[·—]/.test(pesanGalat(s)));
  assert.notEqual(pesanGalat(401), pesanGalat(500));
});

test("cekCsv: terima yang sah, tolak kosong, tanpa kolom nama, kolom asing, terlalu besar", () => {
  assert.deepEqual(cekCsv("nama,nip,unit\nAni,1,A\nBudi,2,B\n"), {jumlah: 2, galat: null});
  assert.deepEqual(cekCsv("﻿nama;wa\r\nAni;0812"), {jumlah: 1, galat: null});
  assert.ok(cekCsv("").galat); assert.ok(cekCsv(null).galat); assert.ok(cekCsv("  \n ").galat);
  assert.match(cekCsv("nip,unit\n1,A").galat, /kolom nama/);
  assert.match(cekCsv("nama,gaji\nAni,1").galat, /gaji/);
  assert.ok(cekCsv("nama\n" + "a".repeat(MAKS_CSV)).galat);
});

test("tautanLapangan: kode di fragmen, bukan di query", () => {
  const t = tautanLapangan("https://centurisk97.id", K);
  assert.equal(t, `https://centurisk97.id/petugas#k=${K}`);
  assert.ok(!t.includes("?"));
});

test("potong: 100 pertama + sisa", () => {
  const a = Array.from({length: 250}, (_, i) => i);
  assert.deepEqual([potong(a).tampil.length, potong(a).sisa], [100, 150]);
  assert.deepEqual(potong([1, 2]), {tampil: [1, 2], sisa: 0});
});

test("pesanGps, jarakM, teksJarak", () => {
  assert.notEqual(pesanGps(1), pesanGps(3));
  assert.ok(Math.abs(jarakM(0, 0, 0, 1) - 111195) < 100);
  assert.equal(jarakM(5, 5, 5, 5), 0);
  assert.equal(teksJarak(420.4), "420 m"); assert.equal(teksJarak(2350), "2,4 km"); assert.equal(teksJarak(NaN), "");
});

test("tautanAman: https atau jalur sendiri; skema berbahaya dan //host ditolak", () => {
  assert.equal(tautanAman("https://renlap.example/a?b=1"), "https://renlap.example/a?b=1");
  assert.equal(tautanAman("/renlap/abc"), "/renlap/abc");
  for (const u of ["javascript:alert(1)", "data:text/html,x", "http://x.id", "//evil.example", "https://a b", 'https://x"y', null, undefined, 5, ""]) assert.equal(tautanAman(u), null, String(u));
});

test("teksAlasan dan hasilAbsen: teks baku, jarak di luar radius, tanpa titik tengah", () => {
  assert.equal(teksAlasan("wajah_rendah"), "wajah kurang jelas"); assert.equal(teksAlasan("gps_curiga"), "lokasi perlu dicek"); assert.equal(teksAlasan("jam_hp"), "jam HP berbeda dari jam server");
  assert.equal(teksAlasan("luar_radius", 2350), "di luar radius tugas (2,4 km)"); assert.equal(teksAlasan("luar_radius"), "di luar radius tugas");
  assert.equal(teksAlasan("__proto__"), "perlu diperiksa");
  assert.deepEqual(hasilAbsen({status: "lolos", alasan: []}, "masuk", "07.42 WIB"), {kelas: "hijau", judul: "Absen masuk tercatat 07.42 WIB", alasan: []});
  assert.equal(hasilAbsen({status: "sah"}, "pulang", "16.05 WIB").judul, "Absen pulang tercatat 16.05 WIB");
  const t = hasilAbsen({status: "tinjau", alasan: ["wajah_rendah", "luar_radius"], jarak_m: 500}, "masuk", "");
  assert.equal(t.kelas, "kuning"); assert.equal(t.judul, "Menunggu tinjauan: wajah kurang jelas, di luar radius tugas (500 m)");
  assert.equal(hasilAbsen({status: "tolak", alasan: ["foto_ganda"]}, "masuk", "").kelas, "merah");
  assert.equal(hasilAbsen({status: "aneh"}, "masuk", "").kelas, "kuning");
  for (const x of [t.judul, hasilAbsen({status: "tolak", alasan: ["gps_ditolak"]}, "masuk", "").judul]) assert.ok(!/[·—]/.test(x));
});

test("keMs: angka atau ISO, selain itu NaN", () => {
  assert.equal(keMs(5), 5); assert.equal(keMs("2026-11-02T00:00:00Z"), Date.UTC(2026, 10, 2)); assert.ok(Number.isNaN(keMs("x"))); assert.ok(Number.isNaN(keMs(undefined)));
});

test("barisRiwayat: gabung absen dan logbook, terbaru dulu, label status, status asing tanpa label", () => {
  const b = barisRiwayat({absen: [{id: "a1", jenis: "masuk", status: "lolos", waktu: 1000}, {id: "a2", jenis: "pulang", status: "tinjau", waktu: 3000, alasan: ["jam_hp"], tugas: "T1"}, {id: "a3", status: "__proto__", waktu: 500}, {id: "a4", status: "lolos", waktu: "bukan waktu"}], logbook: [{id: "l1", waktu: 2000, terkunci: true}, {id: "l2", tanggal: "2026-11-02", terkunci: false}]});
  assert.deepEqual(b.map(x => x.id), ["l2", "a2", "l1", "a1", "a3"], "terbaru dulu");
  const a2 = b.find(x => x.id === "a2"); assert.equal(a2.label, "Menunggu tinjauan"); assert.equal(a2.kelas, "kuning"); assert.equal(a2.judul, "Absen pulang");
  assert.equal(b.find(x => x.id === "l1").label, "Terkunci"); assert.equal(b.find(x => x.id === "l2").label, "Bisa disunting");
  assert.equal(b.find(x => x.id === "a3").label, ""); assert.equal(b.some(x => x.id === "a4"), false);
  assert.deepEqual(barisRiwayat(null), []);
  assert.equal(barisRiwayat({baris: [{tipe: "logbook", id: "z", waktu: 9, status: "tolak"}]})[0].judul, "Logbook");
});

test("pilihTugas dan langkahAbsen", () => {
  const t = [{id: "a"}, {id: "b"}];
  assert.equal(pilihTugas(t, "b").id, "b"); assert.equal(pilihTugas(t, "zzz").id, "a"); assert.equal(pilihTugas([], "a"), null); assert.equal(pilihTugas(undefined, "a"), null);
  assert.equal(langkahAbsen({}), "masuk"); assert.equal(langkahAbsen(undefined), "masuk");
  assert.equal(langkahAbsen({absen_masuk: {waktu: 1}}), "pulang");
  assert.equal(langkahAbsen({absen_masuk: {waktu: 1}, absen_pulang: {waktu: 2}}), null);
});

test("teksAlasan: alasan status absen baru dari server berteks manusiawi", () => {
  assert.equal(teksAlasan("sampel_acak"), "dipilih acak untuk dicek peninjau");
  for (const k of ["luring_lama", "jaringan_beda", "wajah_baru"]) assert.notEqual(teksAlasan(k), "perlu diperiksa", k);
});
