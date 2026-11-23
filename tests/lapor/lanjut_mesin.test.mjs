/* LJ-05: mesin WA tahap 2 murni (src/lapor_lanjut_mesin.js), tanpa D1 dan tanpa model. Jalan: node --test tests/lapor/lanjut_mesin.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {putaranData, fotoMasuk, perintahData, samarPribadi} from "../../src/lapor_lanjut_mesin.js";
import {validasi} from "../../src/lapor_lanjut_spek.js";

const T0 = 1_760_000_000_000;
const ketik = (k, teks, extra = {}) => putaranData({keadaan: k, pesan: {teks, ...extra}, kini: T0});
const alur = (k, ...teks) => teks.reduce((r, t) => ketik(r.keadaan, t), {keadaan: k});
const RUMAH = ["Budi Santoso", "Paledang", "Bogor Tengah", "RT 01 RW 02", "1", "2", "2", "4"];   // kk, desa, kec, alamat, tingkat rb, terendam tidak, huni mengungsi, jiwa

test("perintah pembuka dikenali; teks lain tidak", () => {
  for (const t of ["data rumah", "Data  Prasarana", "jembatan rusak", "JALAN RUSAK!", "data"]) assert.ok(perintahData(t), t);
  for (const t of ["lapor", "halo", "data rumah saya"]) assert.ok(!perintahData(t), t);
});

test("rumah: pertanyaan wajib satu per satu menurut urutan spek, lalu opsional, foto, ringkasan, simpan", () => {
  let r = ketik(null, "data rumah"); assert.match(r.balasan, /Nama kepala keluarga/); assert.equal(r.keadaan.butir, "kk");
  r = alur(r.keadaan, ...RUMAH.slice(0, 4)); assert.match(r.balasan, /Tingkat kerusakan\*\n1\. rusak berat\n2\. rusak sedang\n3\. rusak ringan\n4\. tidak rusak/);
  r = alur(r.keadaan, ...RUMAH.slice(4)); assert.match(r.balasan, /Nama pemilik rumah/); assert.match(r.balasan, /lewati/); assert.equal(r.keadaan.opsi, true);
  assert.equal(r.keadaan.isian.tingkat, "rb"); assert.equal(r.keadaan.isian.terendam, false); assert.equal(r.keadaan.isian.jiwa, 4);
  r = ketik(r.keadaan, "lewati semua"); assert.equal(r.keadaan.tahap, "foto"); assert.match(r.balasan, /kurang 2/);
  r = ketik(r.keadaan, "lewati"); assert.equal(r.keadaan.tahap, "ringkas"); assert.match(r.balasan, /Ringkasan rumah/); assert.match(r.balasan, /Budi Santoso/);
  assert.match(r.balasan, /Tingkat kerusakan: rusak berat/); assert.match(r.balasan, /Foto: 0, kurang 2/);
  const s = ketik(r.keadaan, "simpan");
  assert.equal(s.simpan.jenis, "rumah"); assert.equal(s.simpan.isian.kk, "Budi Santoso"); assert.equal(s.simpan.isian.huni, "mengungsi"); assert.match(s.simpan.klien, /^wa-\d+$/);
  assert.equal(validasi("rumah", s.simpan.isian).galat.length, 0, "hasil mesin lolos validasi spek yang sama dengan web");
  assert.deepEqual(s.keadaan.isian, {}, "keadaan sesudah simpan tanpa isian"); assert.equal(s.keadaan.tahap, "sesudah"); assert.deepEqual(s.keadaan.bawaan, {desa: "Paledang", kec: "Bogor Tengah"});
  assert.ok(!JSON.stringify(s.keadaan).includes("Budi"));
});

test("jawaban tidak sah ditolak dengan pertanyaan yang sama; kosong tidak jadi nol; belum tahu hanya bila pilihan memilikinya", () => {
  let r = alur(null, "data rumah", "Budi", "Paledang", "Bogor Tengah", "RT 1", "9"); assert.match(r.balasan, /belum sesuai/); assert.equal(r.keadaan.butir, "tingkat");
  r = ketik(r.keadaan, "rusak sedang"); assert.equal(r.keadaan.isian.tingkat, "rs", "nama pilihan juga diterima");
  r = alur(r.keadaan, "ya", "belum tahu"); assert.equal(r.keadaan.isian.huni, "tidak_tahu");
  r = ketik(r.keadaan, "banyak"); assert.match(r.balasan, /belum sesuai/); assert.equal(r.keadaan.isian.jiwa, undefined, "bukan angka tetap kosong");
  r = ketik(r.keadaan, "2 atau 3"); assert.equal(r.keadaan.isian.jiwa, undefined, "dua angka = ambigu");
  r = ketik(r.keadaan, "0"); assert.equal(r.keadaan.isian.jiwa, 0, "0 yang diketik memang nol");
  assert.equal(r.keadaan.butir, "pemilik"); r = ketik(r.keadaan, "lewati"); assert.equal(r.keadaan.butir, "nik_kk", "lewati hanya untuk opsional");
  let w = alur(null, "data rumah"); assert.match(ketik(w.keadaan, "lewati").balasan, /wajib/);
});

test("isian pribadi: HP dan NIK lewat validasi spek dan tersamar di ringkasan; nama utuh tapi tidak pernah NIK atau HP utuh", () => {
  let r = alur(null, "data rumah", ...RUMAH); assert.equal(r.keadaan.butir, "pemilik");
  r = alur(r.keadaan, "Siti Aminah", "3171010101010001");
  assert.equal(r.keadaan.isian.nik_kk, "3171010101010001");
  r = ketik(r.keadaan, "lewati semua"); r = ketik(r.keadaan, "lewati");
  assert.match(r.balasan, /\*{12}0001/); assert.ok(!r.balasan.includes("3171010101010001"));
  let n = alur(null, "data rumah", "Budi", "P", "K", "A", "1", "1", "1", "1", "lewati"); n = ketik(n.keadaan, "12345"); assert.match(n.balasan, /belum sesuai/); assert.equal(n.keadaan.isian.nik_kk, undefined);
  assert.equal(samarPribadi({hp: "6281234567890", nik: "3171010101010001"}).hp, "*********7890");
});

test("ubah kembali ke butir, lalu langsung ke ringkasan tanpa mengulang opsional dan foto", () => {
  let r = alur(null, "data rumah", ...RUMAH, "lewati semua", "lewati"); assert.equal(r.keadaan.tahap, "ringkas");
  r = ketik(r.keadaan, "ubah alamat"); assert.equal(r.keadaan.butir, "alamat"); assert.match(r.balasan, /Alamat atau patokan/);
  r = ketik(r.keadaan, "Jl. Baru 5"); assert.equal(r.keadaan.tahap, "ringkas"); assert.equal(r.keadaan.isian.alamat, "Jl. Baru 5"); assert.match(r.balasan, /Jl\. Baru 5/);
  r = ketik(r.keadaan, "ubah tingkat"); r = ketik(r.keadaan, "3"); assert.equal(r.keadaan.isian.tingkat, "rr");
  r = ketik(r.keadaan, "ubah warna"); assert.match(r.balasan, /tidak dikenal/); assert.equal(r.keadaan.tahap, "ringkas");
  r = ketik(r.keadaan, "ubah keterangan"); assert.equal(r.keadaan.butir, "ket"); assert.equal(r.keadaan.opsi, true, "opsional boleh diubah");
});

test("prasarana: jembatan rusak mengisi jenis dan mewajibkan panjang dan kendaraan (wajib bersyarat); listrik tidak", () => {
  let r = ketik(null, "jembatan rusak"); assert.equal(r.keadaan.jenis, "prasarana"); assert.equal(r.keadaan.isian.jenis, "jembatan"); assert.equal(r.keadaan.butir, "nama");
  r = alur(r.keadaan, "Jembatan Cisadane", "Paledang", "1", "1"); assert.equal(r.keadaan.butir, "panjang_m");
  r = ketik(r.keadaan, "40,5"); assert.equal(r.keadaan.isian.panjang_m, 40.5); assert.equal(r.keadaan.butir, "kendaraan");
  r = ketik(r.keadaan, "tidak ada"); assert.equal(r.keadaan.isian.kendaraan, "tidak_ada");
  assert.equal(r.keadaan.butir, "alternatif");
  let p = alur(null, "data prasarana"); assert.match(p.balasan, /Jenis prasarana/); p = alur(p.keadaan, "listrik", "Gardu A", "Paledang", "rusak sedang", "terbatas");
  assert.equal(p.keadaan.isian.jenis, "listrik"); assert.equal(p.keadaan.isian.fungsi, "terbatas"); assert.equal(p.keadaan.butir, "panjang_m"); assert.equal(p.keadaan.opsi, true, "untuk listrik panjang dan kendaraan hanya opsional"); p = ketik(p.keadaan, "lewati semua"); assert.equal(p.keadaan.tahap, "foto");
});

test("foto: diterima di tahap foto, menghitung kurang, otomatis ke ringkasan; ditolak di tahap isi, sesudah, dan lewat 10", () => {
  const isi = alur(null, "data rumah", ...RUMAH, "lewati semua").keadaan; assert.equal(isi.tahap, "foto");
  const a = fotoMasuk(isi, {i: "f1", w: T0, lat: -6.6, lon: 106.8}); assert.match(a.balasan, /Kurang 1 lagi/); assert.equal(a.keadaan.lat, -6.6, "lokasi yang dibagikan jadi titik objek");
  const b = fotoMasuk(a.keadaan, {i: "f2"}); assert.equal(b.keadaan.tahap, "ringkas"); assert.match(b.balasan, /Foto: 2\n/); assert.match(b.balasan, /Ringkasan rumah/);
  assert.deepEqual(b.keadaan.foto.map(f => f.i), ["f1", "f2"]); assert.equal(b.keadaan.foto[0].la, -6.6); assert.equal(b.keadaan.foto[1].la, undefined);
  assert.ok(fotoMasuk(alur(null, "data rumah").keadaan, {i: "x"}).ditolak);
  assert.ok(fotoMasuk(null, {i: "x"}).ditolak);
  assert.ok(fotoMasuk({...b.keadaan, foto: Array.from({length: 10}, (_, i) => ({i: "a" + i}))}, {i: "z"}).ditolak);
  assert.ok(fotoMasuk({tahap: "sesudah", foto: []}, {i: "x"}).ditolak);
});

test("lokasi dibagikan: tersimpan sebagai titik, titik di luar Indonesia diabaikan", () => {
  let r = ketik(null, "data rumah"); r = ketik(r.keadaan, "", {lokasi: {lat: -6.6, lon: 106.8}}); assert.equal(r.keadaan.lat, -6.6); assert.match(r.balasan, /Titik lokasi diterima/); assert.equal(r.keadaan.butir, "kk");
  r = ketik(r.keadaan, "", {lokasi: {lat: 50, lon: 10}}); assert.equal(r.keadaan.lat, -6.6);
});

test("sesudah simpan: lagi memakai desa dan kecamatan terakhir sebagai bawaan; selesai dan batal keluar; data lain tanpa menu", () => {
  const s = ketik(alur(null, "data rumah", ...RUMAH, "lewati semua", "lewati").keadaan, "simpan").keadaan;
  let r = ketik(s, "lagi"); assert.equal(r.keadaan.isian.desa, "Paledang"); assert.equal(r.keadaan.butir, "kk"); assert.equal(r.keadaan.isian.kk, undefined);
  r = ketik(r.keadaan, "Rina"); assert.equal(r.keadaan.butir, "alamat", "desa dan kecamatan tidak ditanya lagi");
  assert.equal(ketik(s, "selesai").keadaan, null); assert.equal(ketik(s, "selesai").selesai, true);
  assert.match(ketik(s, "halo").balasan, /lagi/);
  assert.equal(ketik(alur(null, "data rumah").keadaan, "batal").keadaan, null);
  assert.equal(ketik(alur(null, "data rumah").keadaan, "selesai").keadaan.tahap, "isi", "selesai di tengah isian tidak membuang draf");
  assert.equal(ketik(s, "jalan rusak").keadaan.isian.jenis, "jalan");
});

test("keadaan tidak melewati batas 5500 karakter: isian terlalu panjang ditolak, keadaan lama utuh", () => {
  let r = alur(null, "data rumah", "Budi", "Paledang", "Bogor Tengah"); const lama = r.keadaan;
  const besar = {...lama, isian: {...lama.isian, ket: "x".repeat(5600)}};
  const t = putaranData({keadaan: besar, pesan: {teks: "RT 1"}, kini: T0}); assert.match(t.balasan, /terlalu panjang/); assert.equal(t.keadaan, besar);
});
