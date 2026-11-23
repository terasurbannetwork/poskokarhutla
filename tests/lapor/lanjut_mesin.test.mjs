/* LJ-05: mesin WA tahap 2 murni (src/lapor_lanjut_mesin.js), tanpa D1 dan tanpa model. Jalan: node --test tests/lapor/lanjut_mesin.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {putaranData, fotoMasuk, perintahData, samarPribadi} from "../../src/lapor_lanjut_mesin.js";
import {validasi} from "../../src/lapor_lanjut_spek.js";
import * as M from "../../src/lapor_lanjut_mesin.js";

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

/* ---------- LJ-06: titik pengungsian dan jiwa (konteks titik dan kk dari berkas) ---------- */
const KONTEKS = {titik: [{id: "TP-AAAAAAAA", nama: "Gedung A"}, {id: "TP-BBBBBBBB", nama: "Masjid B"}], kk: [{id: "k".repeat(16), nama: "Budi", titik: "TP-BBBBBBBB"}, {id: "l".repeat(16), nama: "Ani", titik: "TP-AAAAAAAA"}]};
const ketikK = (k, teks, extra = {}) => putaranData({keadaan: k, pesan: {teks, ...extra}, kini: T0, konteks: KONTEKS});
const alurK = (k, ...teks) => teks.reduce((r, t) => ketikK(r.keadaan, t), {keadaan: k});

test("perintah pengungsian dan pengungsi dikenali", () => {
  for (const t of ["data pengungsian", "Tempat pengungsian", "data pengungsi"]) assert.ok(perintahData(t), t);
  assert.ok(!perintahData("data pengungsi saya"));
});

test("titik: butir dari spek (sektor ada atau tidak, tanggal hari ini), bawaan desa untuk lagi, hasil lolos validasi spek", () => {
  let r = ketik(null, "data pengungsian"); assert.match(r.balasan, /Nama tempat pengungsian/);
  r = alur(r.keadaan, "Posko X", "Paledang", "1", "2"); assert.match(r.balasan, /Tanggal tempat ini dibuka/);
  r = ketik(r.keadaan, "hari ini"); assert.equal(r.keadaan.isian.tgl_buka, new Date(T0 + 7 * 36e5).toISOString().slice(0, 10)); assert.match(r.balasan, /Ada kebutuhan air bersih/); assert.match(r.balasan, /1\. ada\n2\. tidak/);
  r = alur(r.keadaan, "1", "1", "2", "2", "2", "2"); assert.match(r.balasan, /Ada MCK/); r = ketik(r.keadaan, "lewati semua"); assert.equal(r.keadaan.tahap, "foto");
  r = ketik(r.keadaan, "lewati"); assert.match(r.balasan, /Bentuk pengungsian: terkonsentrasi/); assert.match(r.balasan, /Jenis tempat: tanah lapang/);
  const s = ketik(r.keadaan, "simpan"); assert.equal(s.simpan.jenis, "titik"); assert.equal(validasi("titik", s.simpan.isian).galat.length, 0); assert.deepEqual(s.keadaan.bawaan, {desa: "Paledang"});
  assert.equal(ketik(s.keadaan, "lagi").keadaan.butir, "nama");
});

test("jiwa: tanpa titik di berkas diarahkan dulu; satu titik terisi otomatis; beberapa titik dipilih dengan nomor", () => {
  const kosong = putaranData({keadaan: null, pesan: {teks: "data pengungsi"}, kini: T0, konteks: {titik: [], kk: []}}); assert.equal(kosong.keadaan, null); assert.match(kosong.balasan, /data pengungsian/);
  const satu = putaranData({keadaan: null, pesan: {teks: "data pengungsi"}, kini: T0, konteks: {titik: [KONTEKS.titik[0]], kk: []}}); assert.equal(satu.keadaan.isian.titik, "TP-AAAAAAAA"); assert.equal(satu.keadaan.butir, "nama");
  let r = ketikK(null, "data pengungsi"); assert.match(r.balasan, /Tempat pengungsian\*\n1\. Gedung A\n2\. Masjid B\nBalas dengan nomor\./);
  assert.match(ketikK(r.keadaan, "3").balasan, /belum sesuai/); r = ketikK(r.keadaan, "2"); assert.equal(r.keadaan.isian.titik, "TP-BBBBBBBB");
});

test("jiwa: kepala keluarga dari daftar titik itu; rentan boleh banyak; dewasa diminta wajah, anak dan menolak tidak; NIK dan HP tersamar", () => {
  let r = alurK(null, "data pengungsi", "2", "Wati", "25", "2", "Paledang", "2026-11-21");
  assert.match(r.balasan, /1\. Orang ini sendiri kepala keluarga\n2\. keluarga Budi\nBalas/); assert.ok(!/Ani/.test(r.balasan), "hanya KK di titik yang dipilih");
  r = ketikK(r.keadaan, "2"); assert.equal(r.keadaan.isian.kk, "k".repeat(16)); assert.match(r.balasan, /NIK/, "HP hanya untuk kepala keluarga: tidak ditanya");
  r = alurK(r.keadaan, "3171010101010009"); assert.match(r.balasan, /Kelompok rentan\*\n1\. balita[\s\S]*boleh lebih dari satu/);
  r = ketikK(r.keadaan, "6 11"); assert.deepEqual(r.keadaan.isian.rentan, ["lansia", "sakit"]); assert.match(r.balasan, /Kebutuhan khusus/);
  r = ketikK(r.keadaan, "lewati semua"); assert.equal(r.keadaan.tahap, "foto"); assert.match(r.balasan, /Kirim foto wajah/); assert.equal(r.keadaan.isian.menolak_foto, undefined);
  const tolak = ketikK(r.keadaan, "menolak"); assert.equal(tolak.keadaan.isian.menolak_foto, true); assert.equal(tolak.keadaan.tahap, "ringkas"); assert.ok(fotoMasuk(tolak.keadaan, {i: "f"}, KONTEKS).ditolak, "yang menolak tidak difoto");
  const f = fotoMasuk(r.keadaan, {i: "f1", lat: -6.6, lon: 106.8}, KONTEKS); assert.equal(f.keadaan.tahap, "ringkas"); assert.equal(f.keadaan.lat, null, "wajah tidak jadi titik");
  assert.match(f.balasan, /Foto wajah: 1/); assert.match(f.balasan, /Kepala keluarga: keluarga Budi/); assert.match(f.balasan, /\*{12}0009/); assert.ok(!f.balasan.includes("3171010101010009"));
  assert.match(f.balasan, /Kelompok rentan: lansia, sakit/); assert.ok(!/Titik lokasi/.test(f.balasan));
  assert.ok(fotoMasuk({...f.keadaan, foto: [{i: "a"}, {i: "b"}]}, {i: "c"}, KONTEKS).ditolak, "paling banyak 2 wajah");
  const s = ketikK(f.keadaan, "simpan"); assert.equal(validasi("jiwa", s.simpan.isian).galat.length, 0); assert.deepEqual(s.keadaan.bawaan, {titik: "TP-BBBBBBBB", desa_asal: "Paledang", masuk: "2026-11-21"});
  const anak = alurK(null, "data pengungsi", "1", "Anak", "9", "1", "Paledang", "kemarin", "1", "tidak ada", "lewati semua"); assert.equal(anak.keadaan.tahap, "ringkas", "anak: tanpa foto wajah"); assert.ok(fotoMasuk(anak.keadaan, {i: "x"}, KONTEKS).ditolak);
  assert.equal(anak.keadaan.isian.masuk, new Date(T0 + 7 * 36e5 - 864e5).toISOString().slice(0, 10));
});

test("jiwa: lokasi yang dibagikan diabaikan (lokasi orang tidak disimpan); tanpa nama titik ringkasan memakai nama titik", () => {
  let r = alurK(null, "data pengungsi", "1"); r = ketikK(r.keadaan, "", {lokasi: {lat: -6.6, lon: 106.8}}); assert.equal(r.keadaan.lat, null); assert.ok(!/Titik lokasi diterima/.test(r.balasan));
});

/* ---------- LJ-07: korban per orang dan perubahan status pencarian ---------- */
const KORBAN = ["2", "Wati Hilang", "25", "2", "Paledang", "Joko", "081234567000"];   // status hilang, nama, umur, jk p, desa, kontak nama, kontak hp
test("LJ-07 perintah: data korban membuka mode; ubah hilang dikenali, bentuk salah dijawab bantuan, bukan perintah lain null", async () => {
  const {perintahStatus, balasanStatus} = await import("../../src/lapor_lanjut_mesin.js");
  assert.ok(perintahData("data korban")); assert.ok(perintahData("ubah hilang 3 ditemukan hidup"));
  assert.deepEqual(perintahStatus("Ubah hilang 3 ditemukan hidup"), {nomor: 3, pencarian: "ditemukan_hidup"});
  assert.deepEqual(perintahStatus("ubah hilang 12 ditemukan_meninggal"), {nomor: 12, pencarian: "ditemukan_meninggal"});
  assert.deepEqual(perintahStatus("ubah hilang 2 dicari"), {nomor: 2, pencarian: "dicari"});
  for (const t of ["ubah hilang", "ubah hilang 3", "ubah hilang tiga dicari", "ubah hilang 3 selamat"]) assert.match(perintahStatus(t).bantuan, /ubah hilang/, t);
  for (const t of ["ubah alamat", "hilang 3 ditemukan hidup", "data korban saya"]) assert.equal(perintahStatus(t), null, t);
  assert.ok(!perintahData("data korban saya"));
  assert.equal(balasanStatus("ditemukan_hidup"), "ditemukan hidup");
});

test("LJ-07 korban meninggal atau luka: butir dari spek, tanpa foto sama sekali, ringkasan menyamarkan HP dan NIK, hasil lolos validasi spek", () => {
  let r = ketik(null, "data korban"); assert.match(r.balasan, /Keadaan korban\*\n1\. meninggal dunia\n2\. hilang\n3\. luka berat\n4\. luka ringan/); assert.ok(!/[A-Z]{5}|!/.test(r.balasan.replace(/\*[^*]+\*/g, "")), "tanpa tanda seru dan huruf kapital semua");
  r = alur(r.keadaan, "1", "Pak Budi", "61", "1", "Paledang", "Siti", "6281234567000"); assert.match(r.balasan, /Dirawat di mana/, "wajib selesai; opsional ditawarkan");
  assert.equal(r.keadaan.isian.status, "meninggal"); assert.equal(r.keadaan.isian.kontak_hp, "6281234567000");
  r = alur(r.keadaan, "lewati", "lewati", "lewati", "lewati"); assert.match(r.balasan, /NIK/);
  r = ketik(r.keadaan, "3171010101010009"); assert.equal(r.keadaan.tahap, "ringkas", "meninggal: tidak ada tahap foto"); assert.match(r.balasan, /Ringkasan korban/);
  assert.match(r.balasan, /Keadaan korban: meninggal dunia/); assert.match(r.balasan, /\*{12}0009/); assert.match(r.balasan, /\*{8}7000/); assert.ok(!r.balasan.includes("3171010101010009") && !r.balasan.includes("6281234567000"));
  assert.ok(!/Titik lokasi|Foto/.test(r.balasan), "tanpa baris foto atau titik");
  assert.ok(fotoMasuk(r.keadaan, {i: "f"}).ditolak); assert.match(fotoMasuk(r.keadaan, {i: "f"}).balasan, /masih dicari/);
  assert.equal(ketik(r.keadaan, "", {lokasi: {lat: -6.6, lon: 106.8}}).keadaan.lat, null, "lokasi orang tidak disimpan");
  const s = ketik(r.keadaan, "simpan"); assert.equal(s.simpan.jenis, "korban"); assert.equal(validasi("korban", s.simpan.isian).galat.length, 0); assert.deepEqual(s.keadaan.bawaan, {desa: "Paledang"}); assert.deepEqual(s.keadaan.isian, {});
  const luka = alur(null, "data korban", "3", "Bu Rina", "40", "2", "Paledang", "Siti", "tidak ada", "lewati semua"); assert.equal(luka.keadaan.tahap, "ringkas"); assert.ok(fotoMasuk(luka.keadaan, {i: "f"}).ditolak);
});

test("LJ-07 korban hilang: butir bersyarat wajib, foto semasa hidup opsional (lewati boleh, maks 2, tanpa titik), dibuang bila status berubah dari hilang", () => {
  let r = alur(null, "data korban", ...KORBAN); assert.match(r.balasan, /Terakhir terlihat di mana/); assert.equal(r.keadaan.opsi, false, "wajib bersyarat hilang");
  r = ketik(r.keadaan, "lewati"); assert.match(r.balasan, /wajib diisi/);
  r = alur(r.keadaan, "Dekat jembatan", "2026-11-21"); assert.match(r.balasan, /Status pencarian\*\n1\. masih dicari\n2\. ditemukan hidup\n3\. ditemukan meninggal dunia/);
  r = ketik(r.keadaan, "1"); assert.equal(r.keadaan.isian.pencarian, "dicari"); assert.match(r.balasan, /Dirawat/);
  r = ketik(r.keadaan, "lewati semua"); assert.equal(r.keadaan.tahap, "foto"); assert.match(r.balasan, /foto korban semasa hidup/); assert.match(r.balasan, /lewati/);
  const lewat = ketik(r.keadaan, "lewati"); assert.equal(lewat.keadaan.tahap, "ringkas"); assert.match(lewat.balasan, /Foto semasa hidup: 0\n/); assert.ok(!/kurang/.test(lewat.balasan));
  let f = fotoMasuk(r.keadaan, {i: "f1", lat: -6.6, lon: 106.8}); assert.equal(f.keadaan.tahap, "ringkas"); assert.equal(f.keadaan.lat, null, "foto korban tidak mengisi titik"); assert.match(f.balasan, /Foto semasa hidup: 1/);
  f = fotoMasuk(f.keadaan, {i: "f2"}); assert.ok(!f.ditolak); assert.ok(fotoMasuk(f.keadaan, {i: "f3"}).ditolak, "paling banyak 2");
  const s = ketik(f.keadaan, "simpan"); assert.equal(s.simpan.foto.length, 2); assert.equal(validasi("korban", s.simpan.isian).galat.length, 0);
  // status berubah dari hilang sesudah foto: foto draf dibuang, pemanggil menghapusnya dari R2
  let u = ketik(f.keadaan, "ubah status"); u = ketik(u.keadaan, "1"); assert.equal(u.keadaan.foto.length, 0); assert.deepEqual(u.keadaan.buang, ["f1", "f2"]);
  let u2 = ketik(f.keadaan, "ubah pencarian"); u2 = ketik(u2.keadaan, "2"); assert.equal(u2.keadaan.foto.length, 0, "ditemukan hidup: bukan lagi dicari"); assert.ok(fotoMasuk(u2.keadaan, {i: "x"}).ditolak);
});

/* ---------- LJ-08: usaha, kebutuhan, perintah nihil ---------- */
test("LJ-08 perintahNihil: nama persis dan sebutan biasa; cabut; nama salah atau kosong = bantuan; teks lain null; perintahData mengenalnya", () => {
  assert.deepEqual(M.perintahNihil("nihil meninggal"), {metrik: "meninggal", nihil: true});
  assert.deepEqual(M.perintahNihil("  Cabut Nihil Rumah Rusak Berat "), {metrik: "rumah_rb", nihil: false});
  assert.deepEqual(M.perintahNihil("nihil rumah_rb"), {metrik: "rumah_rb", nihil: true});
  assert.deepEqual(M.perintahNihil("nihil jalan km"), {metrik: "jalan_km", nihil: true});
  for (const t of ["nihil", "nihil karangan", "cabut nihil", "nihil __proto__", "nihil constructor", "nihil terdampak"]) assert.ok(M.perintahNihil(t).bantuan, t);
  assert.equal(M.perintahNihil("halo"), null); assert.equal(M.perintahNihil("nihilis"), null);
  assert.ok(M.perintahData("nihil luka") && M.perintahData("data usaha") && M.perintahData("data kebutuhan")); assert.equal(M.namaMetrik("rumah_rb"), "rumah rusak berat");
});
test("LJ-08 data usaha dan data kebutuhan: butir dari spek, tempat pengungsian ditanya sebelum desa, kebutuhan tanpa tahap foto", () => {
  let r = M.putaranData({keadaan: null, pesan: {teks: "data kebutuhan"}, kini: 1e12, konteks: {titik: [{id: "TP-AAAAAAAA", nama: "Gedung A"}], kk: []}}); assert.match(r.balasan, /Untuk tempat pengungsian mana/); assert.match(r.balasan, /1\. Gedung A/);
  r = M.putaranData({keadaan: r.keadaan, pesan: {teks: "1"}, kini: 1e12, konteks: {titik: [{id: "TP-AAAAAAAA", nama: "Gedung A"}], kk: []}}); assert.match(r.balasan, /Jenis kebutuhan/, "dengan tempat dipilih desa tidak wajib");
  r = M.putaranData({keadaan: null, pesan: {teks: "data kebutuhan"}, kini: 1e12, konteks: {titik: [], kk: []}}); assert.match(r.balasan, /Nama desa atau kelurahan yang membutuhkan/, "tanpa titik di berkas: langsung desa");
  r = M.putaranData({keadaan: null, pesan: {teks: "data usaha"}, kini: 1e12}); assert.match(r.balasan, /Jenis usaha atau lahan/);
  const f = M.fotoMasuk({v: 1, jenis: "kebutuhan", isian: {}, lewat: [], foto: [], tahap: "ringkas"}, {i: "a1"}); assert.equal(f.ditolak, true);
});
