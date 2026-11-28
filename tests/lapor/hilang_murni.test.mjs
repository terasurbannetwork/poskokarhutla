/* Orang hilang publik OH-02: fungsi murni (src/orang_hilang_murni.js), RENCANA-UJI bagian 1. Tanpa D1, tanpa jaringan.
   Jalankan: node --test tests/lapor/hilang_murni.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as M from "../../src/orang_hilang_murni.js";

const JENIS = ["banjir", "gempa", "longsor"], WIB = 7 * 36e5, tgl = s => Date.parse(s + "T00:00:00+07:00");
const SEMUA = {token: "tok0123456789abc", nama: "Budi Santoso", panggilan: "Budi", umur: 23, kelamin: "Laki-laki", tinggi: 168, berat: 60, pakaian: "kaos merah",
  ciri: "luka di dagu", kec: "Cianjur", kab_nama: "Kab. Cianjur", lokasi_terakhir: "Jl. Mawar 5 RT 2", titik: [1, 2], lat: -6.8, lon: 107.1, waktu: tgl("2026-11-20"),
  nomor_pencari: "6281200000001", nomor_dicari: "6281200000002", hubungan: "ibu", status: "menunggu", nama_pelapor: "Siti", foto_tak_terpilih: ["x"],
  kejadian: {jenis: "gempa", kab: "3203", mulai: "2026-11-19", id: "KJ-2026-ABCDEFGH", nama: "rahasia"}};

test("1.1 kelasUmur: batas 18, kosong dan tak sah jadi anak, tidak pernah 0", () => {
  assert.equal(M.kelasUmur(17), "anak"); assert.equal(M.kelasUmur(18), "dewasa"); assert.equal(M.kelasUmur("42"), "dewasa");
  for (const v of [null, undefined, "", "Tidak tahu", 200, -1, 17.5, NaN]) assert.equal(M.kelasUmur(v), "anak", String(v));
  assert.equal(M.kelasUmur(null, "balita, anak, remaja"), "anak");
  assert.equal(M.rentangUmur(null), null); assert.equal(M.rentangUmur(""), null);   // kosong bukan 0
});

test("1.2 profilPublik dewasa: himpunan kunci persis daftar putih walau baris memuat semua kolom", () => {
  const p = M.profilPublik(SEMUA, "dewasa", {foto: ["/f/1", "/f/2", "/f/3", "/f/4"], ciri_ditinjau: true});
  assert.deepEqual(Object.keys(p).sort(), [...M.BIDANG_PUBLIK.dewasa].sort());
  assert.equal(p.id, SEMUA.token); assert.equal(p.nama, "Budi Santoso"); assert.equal(p.foto.length, 3, "foto paling 3");
  assert.deepEqual(p.kejadian, {jenis: "gempa", kab: "3203", mulai: "2026-11-19"}, "kejadian tanpa id dan nama");
  assert.equal(p.waktu, "2026-11-20", "tanggal tanpa jam");
  const s = JSON.stringify(p);
  for (const t of ["6281200000001", "6281200000002", "Jl. Mawar", "ibu", "Siti", "rahasia", "KJ-2026"]) assert.ok(!s.includes(t), `bocor: ${t}`);
  assert.equal(M.profilPublik(SEMUA, "dewasa", {}).ciri, null, "ciri tak ditinjau tidak keluar");
  assert.deepEqual(M.profilPublik(SEMUA, "dewasa", {}).foto, []);
});

test("1.3 profil anak: himpunan kunci persis, nama inisial, tanpa foto, kelamin, tinggi, ciri", () => {
  const p = M.profilPublik({...SEMUA, umur: 7}, "anak", {foto: ["/f/1"], ciri_ditinjau: true});
  assert.deepEqual(Object.keys(p).sort(), ["id", "kejadian", "lokasi", "nama", "panggilan", "pakaian", "umur", "waktu"].sort());
  assert.equal(p.nama, "B. S."); assert.equal(p.umur, "anak");
  assert.equal(M.profilPublik({...SEMUA, umur: 2}, "anak").umur, "balita"); assert.equal(M.profilPublik({...SEMUA, umur: 15}, "anak").umur, "remaja");
  assert.equal(M.profilPublik({...SEMUA, umur: null}, "anak").umur, "belum diketahui");
  assert.equal(M.inisial("Budi"), "B."); assert.equal(M.inisial("  ani   wijaya  kusuma "), "A. W. K.");
  assert.equal(M.profilPublik(SEMUA, "tak dikenal").nama, "B. S.", "kelas tak dikenal diperlakukan anak");
});

test("1.4 rentang umur 5 tahun, tinggi 10 cm, kosong menjadi belum diketahui", () => {
  assert.deepEqual(M.rentangUmur(23), [20, 24]); assert.equal(M.teksRentang(M.rentangUmur(23)), "20 sampai 24");
  assert.deepEqual(M.rentangUmur(0), [0, 4], "0 sungguhan tetap 0");
  assert.deepEqual(M.rentangTinggi(168), [160, 169]); assert.equal(M.teksRentang(M.rentangTinggi(168)), "160 sampai 169");
  assert.equal(M.teksRentang(M.rentangUmur(null)), "belum diketahui"); assert.equal(M.teksRentang(M.rentangTinggi(null)), "belum diketahui");
  const p = M.profilPublik({token: "t", nama: "A Bc"}, "dewasa");
  assert.deepEqual([p.umur, p.tinggi, p.kelamin, p.lokasi, p.waktu, p.kejadian], ["belum diketahui", "belum diketahui", "belum diketahui", "belum diketahui", "belum diketahui", null]);
});

test("1.5 PINDAH: matriks 4 x 4 penuh, hanya pasangan tabel yang lolos, kedaluwarsa boleh kembali", () => {
  const sah = new Set(["draf>menunggu", "menunggu>tayang", "menunggu>draf", "menunggu>turun", "tayang>turun"]);
  for (const a of M.STATUS) for (const b of M.STATUS) {
    assert.equal(M.bolehPindah(a, b), sah.has(`${a}>${b}`), `${a} ke ${b}`);
    for (const al of M.ALASAN_TURUN.filter(x => x !== "kedaluwarsa")) assert.equal(M.bolehPindah(a, b, al), sah.has(`${a}>${b}`), `${a} ke ${b} alasan ${al}`);
  }
  assert.equal(M.bolehPindah("turun", "menunggu", "kedaluwarsa"), true);
  for (const al of [null, "dicabut", "dilaporkan", "ditemukan"]) assert.equal(M.bolehPindah("turun", "menunggu", al), false, `turun karena ${al} tidak bisa kembali`);
  assert.equal(M.bolehPindah("tayang", "menunggu", "kedaluwarsa"), false, "tayang tidak langsung ke menunggu");
  assert.equal(M.bolehPindah("xx", "tayang"), false);
});

test("1.6 layak: kejadian, konfirmasi petugas, catatan wali untuk anak", () => {
  const ok = {kelas: "dewasa", kejadian_id: "KJ-2026-ABCDEFGH", kejadian_oleh: "staf:1"};
  assert.equal(M.layak(ok), true);
  assert.equal(M.layak({...ok, kejadian_id: null}), false, "kejadian kosong");
  assert.equal(M.layak({...ok, kejadian_oleh: null}), false, "belum dikonfirmasi petugas");
  assert.equal(M.layak({...ok, kelas: "anak"}), false, "anak tanpa wali");
  assert.equal(M.layak({...ok, kelas: "anak", setuju_wali: 1, wali_oleh: "staf:1"}), false, "wali tanpa waktu");
  assert.equal(M.layak({...ok, kelas: "anak", setuju_wali: 1, wali_oleh: "staf:1", wali_waktu: 5}), true);
  assert.equal(M.layak(null), false);
});

test("1.7 turunOtomatis hanya ditemukan_selamat, ditemukan_meninggal, tutup", () => {
  for (const s of ["ditemukan_selamat", "ditemukan_meninggal", "tutup"]) assert.equal(M.turunOtomatis(s), true, s);
  for (const s of ["buka", "ke_sar", "", null, undefined]) assert.equal(M.turunOtomatis(s), false, String(s));
});

test("1.7b persetujuan dan kedaluwarsa", () => {
  assert.equal(M.persetujuanSah({setuju_versi: M.SETUJU_VERSI}), true);
  assert.equal(M.persetujuanSah({setuju_versi: M.SETUJU_VERSI, dicabut_waktu: 5}), false);
  assert.equal(M.persetujuanSah({setuju_versi: M.SETUJU_VERSI - 1}), false, "versi lama tidak sah");
  const t = tgl("2026-11-01");
  assert.equal(M.kedaluwarsa({tayang_waktu: t}, t + M.MASA_TAYANG_HARI * 864e5 - 1), false);
  assert.equal(M.kedaluwarsa({tayang_waktu: t}, t + M.MASA_TAYANG_HARI * 864e5), true);
  assert.equal(M.kedaluwarsa({tayang_waktu: null}, t + 9e12), false, "belum tayang tidak kedaluwarsa");
});

test("1.8 kandidatKejadian: kab, jendela, fase, jenis, maksimum 8, aktif dulu", () => {
  const lap = tgl("2026-11-27"), k = (id, o = {}) => ({id, jenis: "banjir", kab4: ["3203"], mulai: "2026-11-25", fase: "tanggap", ...o});
  const ids = (d, kab = "32.03") => M.kandidatKejadian(kab, lap, d, JENIS).map(x => x.id);
  assert.deepEqual(ids([k("A"), k("B", {kab4: ["3204"]})]), ["A"], "kab lain tidak muncul");
  assert.deepEqual(ids([k("A", {kab4: ["3204", "3203"]})]), ["A"], "kejadian banyak kab");
  assert.deepEqual(ids([k("A", {mulai: "2026-09-01", fase: "selesai"})]), [], "di luar jendela dan sudah selesai");
  assert.deepEqual(ids([k("A", {mulai: "2026-09-01", fase: "pemulihan"})]), ["A"], "fase aktif tetap muncul walau lama");
  assert.deepEqual(ids([k("A", {mulai: "2026-11-10", fase: "selesai"})]), ["A"], "selesai dalam jendela muncul");
  for (const fase of ["terdeteksi", "dibatalkan", "digabung"]) assert.deepEqual(ids([k("A", {fase})]), [], fase);
  assert.deepEqual(ids([k("A", {jenis: "kecelakaan"})]), [], "non-bencana");
  const banyak = Array.from({length: 12}, (_, i) => k("K" + String(i).padStart(2, "0"), {mulai: `2026-11-${10 + i}`, fase: i % 2 ? "tanggap" : "selesai"}));
  const h = M.kandidatKejadian("3203", lap, banyak, JENIS);
  assert.equal(h.length, 8); assert.ok(h.slice(0, 6).every(x => x.aktif) && h.slice(0, 6).every((x, i, a) => !i || a[i - 1].mulai >= x.mulai), "aktif dulu, lalu terbaru");
  assert.deepEqual(M.kandidatKejadian("xx", lap, banyak, JENIS), [], "kab tak sah"); assert.deepEqual(M.kandidatKejadian("3203", lap, null, JENIS), []);
  assert.deepEqual(M.kandidatKejadian("3203", lap, [k("A", {mulai: "2026-11-17"}), k("B", {mulai: "2026-10-27", fase: "selesai"}), k("C", {mulai: "2026-10-28", fase: "selesai"})], JENIS, 10).map(x => x.id), ["A"], "jendela diatur");
});

test("1.9 saranCocok: nama dan nomor tidak berpengaruh, pakaian dan tak diketahui tidak menggugurkan, hasil berupa alasan", () => {
  const w = tgl("2026-11-20"), H = {kab: "3203", waktu_terakhir: w, kelamin: "Laki-laki", umur: 23, pakaian: "kaos merah"}, T = (o = {}) => ({id: "t1", kab: "3203", waktu_temu: w + 2 * 864e5, kelamin: "Laki-laki", umur: 25, pakaian: "celana hitam", ...o});
  const a = M.saranCocok({...H, nama: "Budi", nomor: "1"}, [T({nama: "Andi", nomor: "9"})]), b = M.saranCocok({...H, nama: "Zzz", nomor: "5"}, [T({nama: "Qqq", nomor: "7"})]);
  assert.deepEqual(a, b, "nama dan nomor tidak dibaca"); assert.equal(a.length, 1);
  assert.equal(a[0].alasan.pakaian, false, "pakaian beda tidak menggugurkan"); assert.equal(typeof a[0].alasan.kab, "boolean");
  assert.ok(!("skor" in a[0]) && !("nilai" in a[0]), "bukan angka tunggal");
  assert.equal(M.saranCocok(H, [T({pakaian: null})])[0].alasan.pakaian, null, "pakaian hanya bila kedua pihak mengisi");
  assert.equal(M.saranCocok(H, [T({kelamin: null, umur: null})]).length, 1, "tak diketahui tidak menggugurkan");
  assert.equal(M.saranCocok(H, [T({kelamin: "Perempuan"})]).length, 0, "kelamin bertentangan pasti");
  assert.equal(M.saranCocok(H, [T({umur: 40})]).length, 0, "umur jauh"); assert.equal(M.saranCocok(H, [T({umur: 28})]).length, 1, "dalam toleransi 5 tahun");
  assert.equal(M.saranCocok(H, [T({umur: {min: 30, maks: 40}})]).length, 0, "rentang penemu jauh"); assert.equal(M.saranCocok(H, [T({umur: {min: 26, maks: 40}})]).length, 1);
  assert.equal(M.saranCocok(H, [T({kab: "3204"})]).length, 0, "kab jauh");
  assert.equal(M.saranCocok(H, [T({kab: "3204"})], () => ["32.04"]).length, 1, "kab bertetangga");
  assert.equal(M.saranCocok(H, [T({waktu_temu: w - 864e5})]).length, 0, "ditemukan sebelum hilang");
  assert.equal(M.saranCocok(H, [T({waktu_temu: w + 22 * 864e5})]).length, 0, "lewat jendela temu");
  const urut = M.saranCocok(H, [T({id: "x", pakaian: "celana biru"}), T({id: "y", pakaian: "kaos merah"})]);
  assert.deepEqual(urut.map(s => s.id), ["y", "x"], "lebih banyak alasan benar lebih dulu");
});

test("1.10 label dan teks: tanpa 'aman', 'pasti', titik tengah, atau huruf kapital penuh", () => {
  const semua = [...Object.values(M.LABEL.kelas), ...Object.values(M.LABEL.status), ...Object.values(M.LABEL.alasan_turun), M.LABEL.kosong,
    ...Object.values(M.profilPublik(SEMUA, "dewasa", {foto: [], ciri_ditinjau: true})).filter(v => typeof v === "string"), ...Object.values(M.profilPublik({token: "t"}, "anak")).filter(v => typeof v === "string")];
  for (const t of semua) { assert.ok(!/\b(aman|pasti)\b/i.test(t), t); assert.ok(!t.includes("·"), t); assert.ok(!/^[A-Z\s]{4,}$/.test(t), t); }
  for (const s of M.STATUS) assert.ok(M.LABEL.status[s], `label ${s}`); for (const s of M.ALASAN_TURUN) assert.ok(M.LABEL.alasan_turun[s], `label ${s}`);
  const kode = readFileSync(new URL("../../src/orang_hilang_murni.js", import.meta.url), "utf8");
  assert.ok(!/^\s*import\b/m.test(kode), "berkas murni tanpa impor");
});

test("1.11 konstanta HIPOTESIS punya batas: jendela tidak bisa 0 atau lebih dari 365", () => {
  for (const [n, v] of Object.entries({MASA_TAYANG_HARI: M.MASA_TAYANG_HARI, JENDELA_HARI: M.JENDELA_HARI, JENDELA_TEMU_HARI: M.JENDELA_TEMU_HARI})) assert.ok(v >= 1 && v <= 365, n);
  assert.ok(M.KANDIDAT_MAKS >= 1 && M.KANDIDAT_MAKS <= 5 && M.KEJADIAN_MAKS === 8);
  for (const bad of [0, -1, 366, 1.5, NaN, "0", "366", "abc", "", null, undefined]) assert.equal(M.batasi(bad, 30), 30, String(bad));
  assert.equal(M.batasi("45", 30), 45); assert.equal(M.batasi(1, 30), 1); assert.equal(M.batasi(365, 30), 365); assert.equal(M.batasi("365", 30), 365);
});
