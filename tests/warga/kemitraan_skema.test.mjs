/* Skema Kemitraan Kampus (migrations/0079..0083, DESAIN-TEKNIS §3, RENCANA-UJI §3): tiap CHECK, trigger, indeks unik bersyarat, FK, dan kolom dummy
   dibuktikan dengan sisipan yang WAJIB GAGAL, berpasangan dengan kembar yang WAJIB LOLOS (CHECK yang terlalu ketat juga ketahuan).
   Skema = migrasi() apa adanya di node:sqlite memori, foreign_keys ON; tiap uji dibungkus BEGIN ... ROLLBACK oleh runner, tiap percobaan SAVEPOINT.
   Gerbang bawaan: kolom km_* yang belum punya uji tolak, trigger km_* yang belum dipicu, atau CHECK tabel yang belum ada pasangannya membuat uji merah.
   Jalankan: node --test tests/warga/kemitraan_skema.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";

const BERKAS = ["0080_km_dasar.sql", "0081_km_masalah.sql", "0082_km_riset.sql", "0083_km_satgas.sql", "0084_km_talenta.sql"];
const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON;");
db.exec(migrasi());

/* berhenti di galat pertama: sesudah satu uji gagal, sisanya gagal tanpa dijalankan */
let rusak = null;
const uji = (nama, fn) => test(nama, () => {
  if (rusak) throw new Error(`tidak dijalankan: "${rusak}" gagal lebih dulu`);
  db.exec("BEGIN");
  try { fn(); } catch (e) { rusak = nama; throw e; } finally { db.exec("ROLLBACK"); }
});
const sp = fn => { db.exec("SAVEPOINT coba"); try { return fn(); } finally { db.exec("ROLLBACK TO coba"); db.exec("RELEASE coba"); } };

let n = 0;
const id16 = () => (++n).toString(16).padStart(16, "0");
const sha = () => (++n).toString(16).padStart(64, "0");
const T0 = 1_790_000_000_000;
const a = k => "a".repeat(k);
const arr = k => JSON.stringify(Array(k).fill("x"));
const BOGUS = "ffffffffffffffff";
const RUBRIK100 = '[{"kriteria":"Kebaruan","bobot":40},{"kriteria":"Dampak","bobot":60}]';
const NILAI_OK = '{"b1":1,"b2":2,"b3":3,"b4":4,"b5":5,"b6":3}';
const AK = id => `A${5000000 + id}`;

function masuk(tabel, baris) {
  const k = Object.keys(baris);
  db.prepare(`INSERT INTO ${tabel} (${k.join(",")}) VALUES (${k.map(() => "?").join(",")})`).run(...k.map(x => baris[x]));
  return baris;
}
const ada = (u, k, f) => (k in u ? u[k] : f());
const sah = (tabel, u = {}) => masuk(tabel, {...DASAR[tabel](u), ...u});
const ubah = (tabel, set, where, ...p) => db.prepare(`UPDATE ${tabel} SET ${set} WHERE ${where}`).run(...p);
const hapus = (tabel, where, ...p) => db.prepare(`DELETE FROM ${tabel} WHERE ${where}`).run(...p);
const rep = v => JSON.stringify(v)?.slice(0, 50);
const dipicu = new Set();
const tolakSql = (tabel, f, pola, pesan) => sp(() => assert.throws(f, pola, pesan));
const lolosSql = (f, pesan) => sp(() => assert.doesNotThrow(f, pesan));
const tolak = (tabel, u, pola = /CHECK constraint failed/) => sp(() => assert.throws(() => sah(tabel, u), pola,
  `${tabel}: ${Object.entries(u).map(([k, v]) => `${k}=${rep(v)}`).join(", ")} DITERIMA padahal harus ditolak oleh ${pola}`));
const lolos = (tabel, u) => sp(() => assert.doesNotThrow(() => sah(tabel, u),
  `${tabel}: ${Object.entries(u).map(([k, v]) => `${k}=${rep(v)}`).join(", ")} DITOLAK padahal sah (CHECK terlalu ketat)`));
const pemicu = (nama, pola, salah, benar) => {   // salah/benar = fungsi sisipan/ubahan
  dipicu.add(nama);
  tolakSql(nama, salah, pola, `${nama}: pelanggaran DITERIMA, pemicu tidak menolak (diharapkan ${pola})`);
  if (benar) lolosSql(benar, `${nama}: kembar sah DITOLAK`);
};

/* ---------- induk yang dirujuk ---------- */
const inst = () => masuk("institusi", {id: id16(), nama: "Universitas Contoh", jenis: "ptn", pic_nama: "Budi", dibuat: T0, diubah: T0}).id;
const rel = (u = {}) => masuk("relawan", {id: id16(), nama: "Rina", prov: "62", kab: "Pulang Pisau", jalur: "umum", hari_per_minggu: 1, maks_hari: 3, luar_provinsi: 0, setuju_pdp: 1, dibuat: T0, diubah: T0, ...u}).id;
const unsurRel = unsur => { const r = rel(); sah("km_anggota", {relawan_id: r, unsur}); return r; };
const meja = () => masuk("meja_petugas", {id: id16(), nama: "Tim Kaji", prov: "62", kab: "Pulang Pisau", meja: '["kaji_cepat"]', kode_sha: sha(), dibuat: T0}).id;
const agenda = () => masuk("riset_agenda", {id: id16(), judul: "Agenda uji riset", latar: "x", bencana: "karhutla", tema: "lainnya", prioritas: 1, luaran: "x", dibuat: T0, diubah: T0}).id;
const permintaan = () => masuk("relawan_permintaan", {id: id16(), judul: "Permintaan uji", bencana: "banjir", prov: "62", kab: "Pulang Pisau", butuh: '["medis"]', mulai: "2026-11-01", selesai: "2026-11-10", dibuat: T0}).id;
const masalah = (u = {}) => sah("km_masalah", u).id;
const aktivasi = () => sah("km_aktivasi").id;
const satgas = () => sah("km_satgas").id;
const hibahPanggilan = () => sah("km_hibah_panggilan").id;
const plKode = () => sah("km_pl_kode").id;
const magang = () => sah("km_magang").id;
const lamar = () => sah("km_magang_lamar").id;

/* baris dasar sah tiap tabel: parameter u dipakai supaya induk tidak dibuat bila sudah diberikan */
const DASAR = {
  km_kampus: u => ({institusi_id: ada(u, "institusi_id", inst), dibuat: T0, diubah: T0}),
  km_akun: u => ({id: id16(), institusi_id: ada(u, "institusi_id", inst), nama: "Siti", email: `k${++n}@kampus.ac.id`, dibuat: T0, diubah: T0}),
  km_sesi: u => ({sha: sha(), akun_id: ada(u, "akun_id", () => sah("km_akun").id), dibuat: T0, sampai: T0 + 1000}),
  km_anggota: u => ({relawan_id: ada(u, "relawan_id", rel), unsur: "mahasiswa", dibuat: T0, diubah: T0}),
  km_perjanjian: u => ({id: id16(), institusi_id: ada(u, "institusi_id", inst), jenis: "mou_kampus", nomor: "MOU-001", pihak: "BNPB dan Universitas Contoh", mulai: "2026-01-01", berakhir: "2027-01-01", dibuat: T0, diubah: T0}),
  km_bpbd_kode: () => ({id: id16(), kode_sha: sha(), kab4: "6211", prov: "62", nama: "Pak Anto", berlaku: T0 + 1e9, dibuat: T0}),
  km_jejak: () => ({tabel: "km_masalah", baris: "x", aksi: "ubah", oleh: "staf:tester", waktu: T0}),
  km_pl_kode: () => ({id: id16(), kode_sha: sha(), jenis: "penelaah", nama: "Dr Ani", berlaku: T0 + 1e9, dibuat: T0}),
  km_pengingat: () => ({id: id16(), jenis: "km_perjanjian", sumber_id: "abc", keadaan: `k${++n}`, tanggal: "2026-10-30", judul: "Perjanjian segera habis", dibuat: T0}),
  km_masalah: () => ({id: id16(), kab4: "6211", prov: "62", bahaya: "banjir", aspek: "A2", sumber: "bpbd", judul: "Banjir tahunan", pengaju: "bpbd:abc", dibuat: T0, diubah: T0}),
  km_masalah_pakar: u => ({id: id16(), masalah_id: ada(u, "masalah_id", masalah), akademisi_id: AK(++n), peringkat: 1, skor: 0.5, pecah: "{}", dihitung: T0, diubah: T0}),
  km_kunjungan: () => ({id: id16(), kab4: "6211", tanggal: "2026-11-02", tim: '["staf:a"]', narasumber: '["bpbd"]', dibuat: T0, diubah: T0, oleh: "staf:tester"}),
  km_jawaban: u => ({id: id16(), kunjungan_id: ada(u, "kunjungan_id", () => sah("km_kunjungan").id), klien_id: `klien-${String(++n).padStart(4, "0")}`, narasumber: "bpbd", templat_id: "T-001", dibuat: T0, oleh: "bpbd:abc"}),
  km_koreksi: () => ({id: id16(), kab4: "6211", jalur: "kapasitas.rpb", baru: "ada", sumber: "BPBD 2026", dibuat: T0, diubah: T0, oleh: "bpbd:abc"}),
  km_donor: () => ({id: id16(), nama: "Donor Contoh", jenis: "nasional", bahaya: '["banjir"]', aspek: '["A1"]', dibuat: T0, diubah: T0}),
  km_panggilan_donor: u => ({id: id16(), donor_id: ada(u, "donor_id", () => sah("km_donor").id), judul: "Panggilan mitigasi", buka: "2026-11-01", tenggat: "2026-12-01", dibuat: T0, diubah: T0}),
  km_proposal: u => ({id: id16(), judul: "Proposal uji alur", ketua_institusi: ada(u, "ketua_institusi", inst), dibuat: T0, diubah: T0}),
  km_konsorsium: u => ({id: id16(), proposal_id: ada(u, "proposal_id", () => sah("km_proposal").id), jenis: "kampus", rujukan: `r-${++n}`, nama: "Kampus A", peran: "anggota", dibuat: T0}),
  km_hibah_panggilan: () => ({id: id16(), tahun: 2026, judul: "Hibah riset bersama", pagu: 1000, kuota_per_kampus: 2, rubrik: RUBRIK100, tenggat: "2026-12-31", dibuat: T0, diubah: T0}),
  km_hibah_proposal: u => ({id: id16(), panggilan_id: ada(u, "panggilan_id", hibahPanggilan), institusi_id: ada(u, "institusi_id", inst), judul: "Usulan hibah uji", ketua: "Dr Ani", dibuat: T0, diubah: T0}),
  km_telaah: u => ({id: id16(), hibah_proposal_id: ada(u, "hibah_proposal_id", () => sah("km_hibah_proposal").id), penelaah_akademisi_id: AK(++n), pl_kode_id: ada(u, "pl_kode_id", plKode), dibuat: T0}),
  km_inovasi: u => ({id: id16(), institusi_id: ada(u, "institusi_id", inst), nama: "Pompa gambut", bahaya: "karhutla", tkt: 5, dibuat: T0, diubah: T0}),
  km_agenda_sumber: u => ({agenda_id: ada(u, "agenda_id", agenda), masalah_id: ada(u, "masalah_id", masalah)}),
  km_satgas: u => ({id: id16(), institusi_id: ada(u, "institusi_id", inst), radius_km: 100, dibuat: T0, diubah: T0}),
  km_satgas_anggota: u => ({satgas_id: ada(u, "satgas_id", satgas), relawan_id: ada(u, "relawan_id", rel)}),
  km_piket: u => ({id: id16(), minggu: "2026-11-02", rumpun: "banjir", akademisi_id: AK(++n), peran: "utama", pl_kode_id: ada(u, "pl_kode_id", plKode), dibuat: T0}),
  km_aktivasi: u => ({id: id16(), judul: "Banjir Kab Contoh", bahaya: "banjir", kab4: "6211", prov: "62", tanggal: "2026-11-05", radius_km: 100, kebutuhan: '[{"keahlian":"medis","jumlah":2}]', sumber: "manual", dibuka: T0, oleh: "staf:tester", permintaan_id: ada(u, "permintaan_id", permintaan)}),
  km_panggilan: u => ({id: id16(), aktivasi_id: ada(u, "aktivasi_id", aktivasi), relawan_id: ada(u, "relawan_id", rel), jenis: "anggota", urutan: 1, dibuat: T0}),
  km_aktivasi_laporan: u => ({id: id16(), aktivasi_id: ada(u, "aktivasi_id", aktivasi), tanggal: "2026-11-06", institusi_id: ada(u, "institusi_id", inst), anggota_hadir: 3, oleh: "staf:tester", dibuat: T0}),
  km_aktivasi_meja: u => ({aktivasi_id: ada(u, "aktivasi_id", aktivasi), meja_petugas_id: ada(u, "meja_petugas_id", meja)}),
  km_sertifikat: u => ({id: id16(), jenis: "satgas", relawan_id: ada(u, "relawan_id", rel), nama_tampil: "Rina S.", peran: "anggota", jam: 12, terbit: "2026-11-10", dibuat: T0}),
  km_pelajaran: u => ({id: id16(), aktivasi_id: ada(u, "aktivasi_id", aktivasi), dibuat: T0, diubah: T0}),
  km_magang: () => ({id: id16(), penyelenggara: "bnpb", unit: "Pusdatinkom", kuota: 5, mulai: "2026-12-01", selesai: "2027-02-01", dibuat: T0, diubah: T0}),
  km_magang_lamar: u => ({id: id16(), magang_id: ada(u, "magang_id", magang), relawan_id: ada(u, "relawan_id", rel), dibuat: T0, diubah: T0}),
  km_mentor: u => ({id: id16(), mentor_relawan_id: ada(u, "mentor_relawan_id", rel), lamar_id: ada(u, "lamar_id", lamar), dibuat: T0, diubah: T0}),
  km_desa: u => ({id: id16(), institusi_id: ada(u, "institusi_id", inst), desa_kode: "62.11.01.2001", kab4: "6211", nama_desa: "Desa Contoh", mulai: "2026-11-01", dibuat: T0, diubah: T0}),
  km_desa_catatan: u => ({id: id16(), desa_id: ada(u, "desa_id", () => sah("km_desa").id), tanggal: "2026-11-05", kegiatan: "Penyuluhan", oleh: "staf:tester", dibuat: T0}),
  km_dampingan: u => ({id: id16(), kab4: "6211", institusi_id: ada(u, "institusi_id", inst), jenis: "KRB", mulai: "2026-11-01", tenggat: "2027-03-01", dana: "hibah", dibuat: T0, diubah: T0}),
  km_bumn: () => ({id: id16(), nama: "PT Contoh", jenis: "bumn", dibuat: T0, diubah: T0}),
  km_modul: () => ({id: id16(), judul: "Modul uji", kategori: "mk", versi: "1.0", berkas_r2: "kemitraan/modul/x.pdf", mime: "application/pdf", ukuran: 1000, terbit: "2026-11-01", dibuat: T0}),
};
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/* ---------- CHECK kolom: [tabel, kolom, nilai SALAH, nilai BENAR atau undefined] ---------- */
const KOL = [
  ["km_kampus", "institusi_id", "ZZ"],
  ["km_kampus", "status", "tutup", "aktif"], ["km_kampus", "peran", "raja", "simpul"], ["km_kampus", "simpul_id", "zz", "abcdef0123456789"],
  ["km_kampus", "kota", "x", "Palangka Raya"], ["km_kampus", "lat", 6.6, 6.5], ["km_kampus", "lon", 94.4, 141.5],
  ["km_kampus", "web", "http://x.id", "https://x.id"], ["km_kampus", "nama_akademisi", a(161), a(160)],
  ["km_kampus", "pusat_studi", "{}", "[]"], ["km_kampus", "fasilitas", '"x"', "[]"], ["km_kampus", "surat_r2", "lain/x.pdf", "kemitraan/surat/x.pdf"],
  ["km_kampus", "mk_dibuka", 2025, 2026], ["km_kampus", "renkon_ada", 2036, 2035], ["km_kampus", "alasan", a(501), a(500)], ["km_kampus", "oleh", a(81), a(80)],
  ["km_akun", "peran", "st", "kk"], ["km_akun", "nama", "a", "ab"], ["km_akun", "jabatan", "a", "Dekan"], ["km_akun", "email", "tanpa-at", "a@b.co"],
  ["km_akun", "wa", "081234567890", "628123456789"], ["km_akun", "garam", "abc", a(32)], ["km_akun", "sandi_sha", "abc", a(64)], ["km_akun", "atur_sha", "abc", "b".repeat(64)],
  ["km_akun", "status", "x", "aktif"], ["km_akun", "gagal", -1, 0], ["km_akun", "institusi_id", BOGUS],
  ["km_sesi", "sha", "abc"], ["km_sesi", "akun_id", BOGUS],
  ["km_anggota", "unsur", "dekan", "dosen"], ["km_anggota", "prodi", "x", "Kehutanan"], ["km_anggota", "angkatan", 1959, 1960], ["km_anggota", "instansi", "x", "BPBD Prov"],
  ["km_anggota", "kab4_kerja", "62a1", "6211"], ["km_anggota", "mentor", 2, 1], ["km_anggota", "akademisi_id", "B123", "A5012345678"], ["km_anggota", "akademisi_id", "A12x", "A1234"],
  ["km_anggota", "latih_kaji_cepat", 2, 1], ["km_anggota", "relawan_id", BOGUS],
  ["km_perjanjian", "jenis", "mou_relawan", "pks_satgas"], ["km_perjanjian", "nomor", "a", "abc"], ["km_perjanjian", "pihak", "ab", "abc"],
  ["km_perjanjian", "mulai", "2026/01/01", "2026-02-01"], ["km_perjanjian", "berakhir", "2027-1-01", "2027-06-01"],
  ["km_perjanjian", "berkas_r2", "kemitraan/perjanjian/x.docx", "kemitraan/perjanjian/x.pdf"], ["km_perjanjian", "catatan", a(501), a(500)], ["km_perjanjian", "oleh", a(81), a(80)],
  ["km_bpbd_kode", "kode_sha", "abc", a(64)], ["km_bpbd_kode", "kab4", "621", "6211"], ["km_bpbd_kode", "prov", "6", "62"], ["km_bpbd_kode", "nama", "a", "ab"],
  ["km_bpbd_kode", "jabatan", "a", "Kepala"], ["km_bpbd_kode", "wa", "6212", "628123456789"], ["km_bpbd_kode", "jenis", "x", "tim_pendataan"], ["km_bpbd_kode", "oleh", a(81), a(80)],
  ["km_jejak", "tabel", "ab", "abc"], ["km_jejak", "baris", "", "x"], ["km_jejak", "dari", a(41), a(40)], ["km_jejak", "ke", a(41), a(40)],
  ["km_jejak", "aksi", "a", "ab"], ["km_jejak", "oleh", "a", "ab"], ["km_jejak", "catatan", a(501), a(500)],
  ["km_pl_kode", "kode_sha", "abc", a(64)], ["km_pl_kode", "jenis", "x", "pakar_piket"], ["km_pl_kode", "akademisi_id", "B1", "A5012345678"],
  ["km_pl_kode", "nama", "a", "ab"], ["km_pl_kode", "wa", "123", "628123456789"], ["km_pl_kode", "oleh", a(81), a(80)],
  ["km_pengingat", "jenis", "mou_relawan", "km_masalah_basi"], ["km_pengingat", "sumber_id", "", a(60)], ["km_pengingat", "sumber_id", a(61)],
  ["km_pengingat", "keadaan", "", "k"], ["km_pengingat", "tanggal", "30-10-2026", "2026-10-31"], ["km_pengingat", "judul", "ab", "abc"],
  ["km_pengingat", "rincian", a(301), a(300)], ["km_pengingat", "muatan", a(601), a(600)], ["km_pengingat", "prov", "6", "62"], ["km_pengingat", "kab", "a", "ab"],
  ["km_pengingat", "status", "x", "dikirim"], ["km_pengingat", "oleh", a(65), a(64)],
  /* 0080 */
  ["km_masalah", "kab4", "621", "6211"], ["km_masalah", "prov", "6", "62"], ["km_masalah", "bahaya", "petir", "multi"], ["km_masalah", "aspek", "A11", "A10"],
  ["km_masalah", "sumber", "x", "lapangan"], ["km_masalah", "auto_id", "", "auto-6211-banjir-A2"], ["km_masalah", "auto_id", a(61)],
  ["km_masalah", "judul", "abcd", "abcde"], ["km_masalah", "uraian", a(49), a(50)], ["km_masalah", "uraian", a(2001)], ["km_masalah", "dampak", a(1001), a(1000)],
  ["km_masalah", "kebutuhan", "{}", '["a"]'], ["km_masalah", "pernah", a(1001), a(1000)], ["km_masalah", "bukti", '"x"', "[]"],
  ["km_masalah", "lampiran", "[1,2,3,4]", "[1,2,3]"], ["km_masalah", "lampiran", "{}"], ["km_masalah", "nilai", "[1]", '{"U":1,"C":1,"R":1,"J":1}'],
  ["km_masalah", "skor", 1.1, 1], ["km_masalah", "skor", -0.1, 0], ["km_masalah", "kelas", "P4", "P3"], ["km_masalah", "status", "x", "tervalidasi"],
  ["km_masalah", "induk_id", "zz", "abcdef0123456789"], ["km_masalah", "pengaju", "a", "ab"], ["km_masalah", "alasan", a(501), a(500)],
  ["km_masalah_pakar", "akademisi_id", "A12x", "A1234"], ["km_masalah_pakar", "peringkat", 11, 10], ["km_masalah_pakar", "peringkat", 0],
  ["km_masalah_pakar", "skor", 2, 0], ["km_masalah_pakar", "pecah", "[]", "{}"], ["km_masalah_pakar", "status", "x", "bersedia"],
  ["km_masalah_pakar", "oleh", a(81), a(80)], ["km_masalah_pakar", "masalah_id", BOGUS],
  ["km_kunjungan", "kab4", "621", "6211"], ["km_kunjungan", "tanggal", "2026/11/02", "2026-11-03"], ["km_kunjungan", "tim", "[]", '["a"]'],
  ["km_kunjungan", "tim", arr(13), arr(12)], ["km_kunjungan", "narasumber", "{}", "[]"], ["km_kunjungan", "status", "x", "selesai"], ["km_kunjungan", "oleh", "a", "ab"],
  ["km_jawaban", "klien_id", "abc1234", "klien-xyz"], ["km_jawaban", "klien_id", a(41), a(40)], ["km_jawaban", "narasumber", "x", "usaha"],
  ["km_jawaban", "templat_id", "a", "ab"], ["km_jawaban", "auto_id", "", "auto-1"], ["km_jawaban", "pilihan", "mungkin", "sebagian"],
  ["km_jawaban", "teks", a(3001), a(3000)], ["km_jawaban", "oleh", "a", "ab"], ["km_jawaban", "kunjungan_id", BOGUS], ["km_jawaban", "masalah_id", BOGUS],
  ["km_koreksi", "kab4", "621", "6211"], ["km_koreksi", "jalur", "ab", "abc"], ["km_koreksi", "lama", a(201), a(200)], ["km_koreksi", "baru", "", "x"],
  ["km_koreksi", "sumber", "ab", "abc"], ["km_koreksi", "status", "x", "ditolak"], ["km_koreksi", "oleh", "a", "ab"], ["km_koreksi", "kunjungan_id", BOGUS],
  /* 0081 */
  ["km_donor", "nama", "a", "ab"], ["km_donor", "jenis", "x", "bumn"], ["km_donor", "bahaya", "[]", '["semua"]'], ["km_donor", "bahaya", "{}"],
  ["km_donor", "aspek", "[]", '["A1","A2"]'], ["km_donor", "aspek", "{}"], ["km_donor", "syarat_mitra", a(501), a(500)], ["km_donor", "status", "x", "siap"],
  ["km_donor", "tautan", "http://x.org", "https://x.org"], ["km_donor", "catatan", a(1001), a(1000)],
  ["km_panggilan_donor", "judul", "abcd", "abcde"], ["km_panggilan_donor", "buka", "x", "2026-11-15"], ["km_panggilan_donor", "tenggat", "x", "2026-12-31"],
  ["km_panggilan_donor", "nilai_maks", -1, 0], ["km_panggilan_donor", "mata_uang", "GBP", "KRW"], ["km_panggilan_donor", "tautan", "ftp://x", "https://x.org"],
  ["km_panggilan_donor", "donor_id", BOGUS],
  ["km_proposal", "judul", "abcd", "abcde"], ["km_proposal", "status", "x", "selesai"], ["km_proposal", "nilai_diminta", -1, 0],
  ["km_proposal", "nilai_disetujui", -1, 0], ["km_proposal", "dana_pendamping", -1, 0], ["km_proposal", "surat_nomor", "SURAT/1", "KM/SD/2026/001"],
  ["km_proposal", "berkas_r2", "lain/p.pdf", "kemitraan/p.pdf"], ["km_proposal", "diajukan_tgl", "x", "2026-11-01"], ["km_proposal", "hasil_tgl", "x", "2026-12-01"],
  ["km_proposal", "pelajaran", a(2001), a(2000)], ["km_proposal", "oleh", a(81), a(80)], ["km_proposal", "ketua_institusi", BOGUS],
  ["km_proposal", "masalah_id", BOGUS], ["km_proposal", "donor_id", BOGUS], ["km_proposal", "panggilan_id", BOGUS],
  ["km_konsorsium", "jenis", "x", "bpbd"], ["km_konsorsium", "rujukan", "", "x"], ["km_konsorsium", "nama", "a", "ab"], ["km_konsorsium", "negara", "id", "ID"],
  ["km_konsorsium", "negara", "JPN"], ["km_konsorsium", "peran", "x", "ketua"], ["km_konsorsium", "proposal_id", BOGUS],
  ["km_hibah_panggilan", "tahun", 2025, 2035], ["km_hibah_panggilan", "judul", "abcd", "abcde"], ["km_hibah_panggilan", "agenda", "{}", '["x"]'],
  ["km_hibah_panggilan", "pagu", -1, 0], ["km_hibah_panggilan", "kuota_per_kampus", 0, 1], ["km_hibah_panggilan", "kuota_per_kampus", 6, 5],
  ["km_hibah_panggilan", "tenggat", "x", "2027-01-31"], ["km_hibah_panggilan", "status", "x", "telaah"], ["km_hibah_panggilan", "oleh", a(81), a(80)],
  ["km_hibah_proposal", "judul", "abcd", "abcde"], ["km_hibah_proposal", "ketua", "a", "ab"], ["km_hibah_proposal", "anggota", "{}", "[]"],
  ["km_hibah_proposal", "metode", a(5001), a(5000)], ["km_hibah_proposal", "anggaran", -1, 0], ["km_hibah_proposal", "berkas_r2", "lain/x", "kemitraan/x.pdf"],
  ["km_hibah_proposal", "nilai", -1, 0], ["km_hibah_proposal", "bendera_selisih", 2, 1], ["km_hibah_proposal", "status", "x", "lolos"],
  ["km_hibah_proposal", "riset_usulan_id", BOGUS], ["km_hibah_proposal", "panggilan_id", BOGUS], ["km_hibah_proposal", "institusi_id", BOGUS], ["km_hibah_proposal", "masalah_id", BOGUS],
  ["km_telaah", "penelaah_akademisi_id", "x1", "A5012345678"], ["km_telaah", "skor", "[]", '{"k1":3}'], ["km_telaah", "catatan", a(3001), a(3000)],
  ["km_telaah", "hibah_proposal_id", BOGUS], ["km_telaah", "pl_kode_id", BOGUS],
  ["km_inovasi", "nama", "ab", "abc"], ["km_inovasi", "bahaya", "x", "udara"], ["km_inovasi", "tkt", 0, 9], ["km_inovasi", "tkt", 10],
  ["km_inovasi", "tkt_bukti", arr(10), arr(9)], ["km_inovasi", "tkt_bukti", "{}"], ["km_inovasi", "tkt_verif", 0, 1], ["km_inovasi", "uji", "x", "lolos"],
  ["km_inovasi", "uji_kab4", "x", "6211"], ["km_inovasi", "uji_tgl", "x", "2026-11-01"], ["km_inovasi", "ekatalog", "x", "tayang"],
  ["km_inovasi", "kontak", a(201), a(200)], ["km_inovasi", "institusi_id", BOGUS], ["km_inovasi", "masalah_id", BOGUS],
  ["km_agenda_sumber", "agenda_id", BOGUS], ["km_agenda_sumber", "masalah_id", BOGUS],
  /* 0082 */
  ["km_satgas", "radius_km", 9, 10], ["km_satgas", "radius_km", 1001, 1000], ["km_satgas", "status", "x", "siap"], ["km_satgas", "institusi_id", BOGUS],
  ["km_perjanjian", "institusi_id", BOGUS], ["km_satgas", "wakil_mahasiswa_id", BOGUS], ["km_satgas", "wakil_alumni_id", BOGUS],
  ["km_satgas", "ketua_relawan_id", BOGUS], ["km_satgas", "wakil_kampus_id", BOGUS],
  ["km_satgas_anggota", "satgas_id", BOGUS], ["km_satgas_anggota", "relawan_id", BOGUS],
  ["km_piket", "minggu", "2026-11-03", "2026-11-09"], ["km_piket", "minggu", "2026/11/02"], ["km_piket", "minggu", "2026-13-45"], ["km_piket", "rumpun", "astronomi", "iklim"],
  ["km_piket", "akademisi_id", "x1", "A5012345678"], ["km_piket", "peran", "x", "cadangan"], ["km_piket", "jawab", "x", "bersedia"], ["km_piket", "pl_kode_id", BOGUS],
  ["km_aktivasi", "judul", "abcd", "abcde"], ["km_aktivasi", "bahaya", "x", "udara"], ["km_aktivasi", "kab4", "621", "6211"], ["km_aktivasi", "prov", "6", "62"],
  ["km_aktivasi", "tanggal", "x", "2026-11-06"], ["km_aktivasi", "lat", 7, 6.5], ["km_aktivasi", "lon", 94, 141.5],
  ["km_aktivasi", "radius_km", 49, 50], ["km_aktivasi", "radius_km", 501, 500], ["km_aktivasi", "kebutuhan", "{}", "[]"], ["km_aktivasi", "sumber", "x", "dibi"],
  ["km_aktivasi", "sumber_id", "", a(60)], ["km_aktivasi", "sumber_id", a(61)], ["km_aktivasi", "status", "x", "tutup"], ["km_aktivasi", "oleh", "a", "ab"], ["km_aktivasi", "permintaan_id", BOGUS],
  ["km_panggilan", "akademisi_id", "x1", "A5012345678"], ["km_panggilan", "jenis", "x", "pakar"], ["km_panggilan", "jawab", "x", "bersedia"],
  ["km_panggilan", "hari_tersedia", 0, 1], ["km_panggilan", "hari_tersedia", 31, 30], ["km_panggilan", "aktivasi_id", BOGUS], ["km_panggilan", "relawan_id", BOGUS], ["km_panggilan", "penugasan_id", BOGUS],
  ["km_aktivasi_laporan", "tanggal", "x", "2026-11-07"], ["km_aktivasi_laporan", "anggota_hadir", -1, 0], ["km_aktivasi_laporan", "ringkas", a(2001), a(2000)],
  ["km_aktivasi_laporan", "angka", "[]", "{}"], ["km_aktivasi_laporan", "oleh", "a", "ab"], ["km_aktivasi_laporan", "aktivasi_id", BOGUS], ["km_aktivasi_laporan", "institusi_id", BOGUS],
  ["km_aktivasi_meja", "aktivasi_id", BOGUS], ["km_aktivasi_meja", "meja_petugas_id", BOGUS],
  ["km_sertifikat", "jenis", "x", "pelatihan"], ["km_sertifikat", "nama_tampil", "a", "ab"], ["km_sertifikat", "institusi_nama", "a", "ab"], ["km_sertifikat", "peran", "a", "ab"],
  ["km_sertifikat", "jam", -1, 0], ["km_sertifikat", "rujukan_id", "", "x"], ["km_sertifikat", "terbit", "x", "2026-11-11"], ["km_sertifikat", "relawan_id", BOGUS],
  ["km_pelajaran", "kerangka", '"x"', "[]"], ["km_pelajaran", "analisis", a(10001), a(10000)], ["km_pelajaran", "penulis_akademisi_id", "x1", "A5012345678"],
  ["km_pelajaran", "status", "x", "terbit"], ["km_pelajaran", "aktivasi_id", BOGUS],
  /* 0083 */
  ["km_magang", "penyelenggara", "x", "bnpb"], ["km_magang", "unit", "a", "ab"], ["km_magang", "kab4", "621", "6211"], ["km_magang", "kuota", 0, 1], ["km_magang", "kuota", 51, 50],
  ["km_magang", "keahlian", "{}", '["gis"]'], ["km_magang", "mulai", "x", "2026-12-15"], ["km_magang", "selesai", "x", "2027-06-01"],
  ["km_magang", "pembimbing_nama", "a", "ab"], ["km_magang", "pembimbing_wa", "081234567890", "628123456789"], ["km_magang", "status", "x", "buka"], ["km_magang", "pl_kode_id", BOGUS],
  ["km_magang_lamar", "motivasi", a(1001), a(1000)], ["km_magang_lamar", "cv_r2", "x", "kemitraan/cv/x.pdf"], ["km_magang_lamar", "status", "x", "mundur"],
  ["km_magang_lamar", "nilai", '{"b1":6,"b2":2,"b3":3,"b4":4,"b5":5,"b6":3}', NILAI_OK], ["km_magang_lamar", "nilai", '{"b1":1,"b2":2,"b3":3,"b4":4,"b5":5}'],
  ["km_magang_lamar", "nilai", '{"b1":"1","b2":2,"b3":3,"b4":4,"b5":5,"b6":3}'], ["km_magang_lamar", "nilai", '{"b1":0,"b2":2,"b3":3,"b4":4,"b5":5,"b6":3}'], ["km_magang_lamar", "nilai", "[1]"],
  ["km_magang_lamar", "catatan_pembimbing", a(2001), a(2000)], ["km_magang_lamar", "magang_id", BOGUS], ["km_magang_lamar", "relawan_id", BOGUS],
  ["km_magang_lamar", "meja_petugas_id", BOGUS], ["km_magang_lamar", "sertifikat_id", BOGUS],
  ["km_mentor", "status", "x", "selesai"], ["km_mentor", "mentor_relawan_id", BOGUS], ["km_mentor", "lamar_id", BOGUS],
  ["km_desa", "desa_kode", "62.11.01.200", "62.11.01.2002"], ["km_desa", "desa_kode", "62-11-01-2001"], ["km_desa", "desa_kode", "ABC"],
  ["km_desa", "kab4", "621", "6211"], ["km_desa", "nama_desa", "a", "ab"], ["km_desa", "tema", "{}", '["x"]'], ["km_desa", "mulai", "x", "2026-11-02"],
  ["km_desa", "status", "x", "pasif"], ["km_desa", "institusi_id", BOGUS],
  ["km_desa_catatan", "tanggal", "x", "2026-11-06"], ["km_desa_catatan", "angkatan", 1959, 1960], ["km_desa_catatan", "kegiatan", "", "x"],
  ["km_desa_catatan", "temuan", a(2001), a(2000)], ["km_desa_catatan", "rencana", a(1001), a(1000)], ["km_desa_catatan", "foto", arr(4), arr(3)],
  ["km_desa_catatan", "oleh", "a", "ab"], ["km_desa_catatan", "desa_id", BOGUS],
  ["km_dampingan", "kab4", "621", "6211"], ["km_dampingan", "jenis", "x", "destana"], ["km_dampingan", "mulai", "x", "2026-12-01"], ["km_dampingan", "tenggat", "x", "2027-06-01"],
  ["km_dampingan", "status", "x", "batal"], ["km_dampingan", "dana", "x", "lainnya"], ["km_dampingan", "bukti_r2", "lain/x", "kemitraan/bukti/x.pdf"], ["km_dampingan", "institusi_id", BOGUS],
  ["km_bumn", "nama", "a", "ab"], ["km_bumn", "jenis", "x", "swasta"], ["km_bumn", "bidang_tjsl", a(301), a(300)], ["km_bumn", "kab4", "{}", '["6211"]'],
  ["km_bumn", "status", "x", "sepakat"], ["km_bumn", "catatan", a(1001), a(1000)],
  ["km_modul", "judul", "ab", "abc"], ["km_modul", "kategori", "x", "lainnya"], ["km_modul", "versi", "", "1"], ["km_modul", "versi", a(21), a(20)],
  ["km_modul", "berkas_r2", "lain/x.pdf", "kemitraan/modul/y.pdf"], ["km_modul", "mime", "application/zip", DOCX],
  ["km_modul", "ukuran", 10485761, 10485760], ["km_modul", "ukuran", 0, 1], ["km_modul", "unduh", -1, 0], ["km_modul", "terbit", "x", "2026-11-02"],
];
/* kolom yang dijaga bukan oleh CHECK-nya sendiri: dicakup uji pemicu/tabel/unik di bawah, atau cap waktu/angka bebas */
const BEBAS = /^(dibuat|diubah|dihitung|dikirim|dijawab|dicabut|berlaku|disetujui|waktu|waktu_klien|dibuka|ditutup|kunci_sampai|atur_sampai|dikirim_pada|sampai|urutan|angka|id|dummy|rubrik|email|kode_sha)$/;
/* CHECK tabel: [tabel, label, baris SALAH, baris BENAR] */
const TABEL = [
  ["km_sesi", "sampai > dibuat", {dibuat: 5, sampai: 5}, {dibuat: 5, sampai: 6}],
  ["km_perjanjian", "berakhir > mulai (sama atau mundur)", [{mulai: "2026-05-01", berakhir: "2026-05-01"}, {mulai: "2026-05-01", berakhir: "2026-04-01"}], {mulai: "2026-05-01", berakhir: "2026-05-02"}],
  ["km_masalah", "digabung wajib induk_id", {status: "digabung"}, {status: "digabung", induk_id: "abcdef0123456789"}],
  ["km_masalah", "otomatis wajib auto_id", {sumber: "otomatis"}, {sumber: "otomatis", auto_id: "auto-6211-banjir-A2"}],
  ["km_panggilan_donor", "tenggat >= buka", {buka: "2026-12-02", tenggat: "2026-12-01"}, {buka: "2026-12-01", tenggat: "2026-12-01"}],
  ["km_panggilan", "relawan atau akademisi terisi", {relawan_id: null, akademisi_id: null}, {relawan_id: null, akademisi_id: "A5012345678"}],
  ["km_magang", "selesai > mulai", {mulai: "2026-12-01", selesai: "2026-12-01"}, {mulai: "2026-12-01", selesai: "2026-12-02"}],
  ["km_magang", "bpbd wajib kab4", {penyelenggara: "bpbd"}, {penyelenggara: "bpbd", kab4: "6211"}],
  ["km_dampingan", "tenggat >= mulai", {mulai: "2026-12-02", tenggat: "2026-12-01"}, {mulai: "2026-12-01", tenggat: "2026-12-01"}],
];

const kolomKm = () => db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'km\\_%' ESCAPE '\\' ORDER BY name").all().map(r => r.name);
const kolomDari = t => db.prepare("SELECT name FROM pragma_table_info(?)").all(t).map(r => r.name);

/* ================================================================ migrasi */
uji("km 0079-0083: dijalankan dua kali lagi tanpa galat, skema sama persis", () => {
  const foto = () => JSON.stringify(db.prepare("SELECT type, name, sql FROM sqlite_master WHERE name LIKE 'km\\_%' ESCAPE '\\' OR name LIKE 'uq\\_km\\_%' ESCAPE '\\' OR name LIKE 'idx\\_km\\_%' ESCAPE '\\' ORDER BY name").all());
  const sebelum = foto();
  assert.ok(JSON.parse(sebelum).length >= 40, `skema km_* hanya ${JSON.parse(sebelum).length} objek, harusnya >= 40 tabel+trigger+indeks`);
  for (let putaran = 1; putaran <= 2; putaran++) for (const f of BERKAS) {
    for (const s of pecah(readFileSync(path.join(AKAR, "migrations", f), "utf8"))) {
      assert.doesNotThrow(() => db.exec(s), `${f} putaran ${putaran} tidak idempoten: ${s.slice(0, 70)}`);
      assert.match(s, /^CREATE (TABLE|INDEX|UNIQUE INDEX|TRIGGER) IF NOT EXISTS /, `${f}: pernyataan selain CREATE ... IF NOT EXISTS: ${s.slice(0, 70)}`);
    }
  }
  assert.equal(foto(), sebelum, "skema berubah sesudah migrasi diulang");
});

uji("km: baris dasar tiap tabel sah (pondasi semua uji tolak)", () => {
  const tabel = kolomKm();
  assert.ok(tabel.length >= 36, `hanya ${tabel.length} tabel km_*, minimal 36`);
  assert.equal(tabel.length, 40, `ada ${tabel.length} tabel km_*, harusnya tepat 40 (0079: 9, 0080: 5, 0081: 9, 0082: 9, 0083: 8; DESAIN-TEKNIS §3)`);
  for (const t of tabel) {
    assert.ok(DASAR[t], `tabel ${t} belum punya baris dasar di DASAR (uji skema wajib mencakup tiap tabel km_*)`);
    lolos(t, {});
  }
  assert.deepEqual(Object.keys(DASAR).filter(t => !tabel.includes(t)), [], "DASAR memuat tabel yang tidak ada di skema");
});

uji("km: tiap kolom km_* punya uji tolak, kembar sah, atau pemicu (tidak ada kolom tanpa penjaga)", () => {
  const dicakup = new Set(KOL.map(([t, k]) => `${t}.${k}`));
  const yatim = [];
  for (const t of kolomKm()) for (const k of kolomDari(t)) if (!dicakup.has(`${t}.${k}`) && !BEBAS.test(k)) yatim.push(`${t}.${k}`);
  assert.deepEqual(yatim, [], `${yatim.length} kolom tanpa uji tolak di KOL: ${yatim.join(", ")}`);
});

uji("km: jumlah CHECK tabel (baris '  CHECK (' di migrasi) sama dengan daftar TABEL yang diuji", () => {
  let tercatat = 0;
  for (const f of BERKAS) tercatat += (readFileSync(path.join(AKAR, "migrations", f), "utf8").match(/^ {2}CHECK \(/gm) || []).length;
  assert.equal(TABEL.length, tercatat, `migrasi punya ${tercatat} CHECK tabel, uji hanya ${TABEL.length}: tiap CHECK tabel wajib punya SQL WAJIB GAGAL`);
});

/* ================================================================ CHECK */
uji("km CHECK kolom: nilai salah DITOLAK, kembar sah LOLOS", () => {
  for (const [t, k, salah, benar] of KOL) {
    tolak(t, {[k]: salah}, salah === BOGUS ? /FOREIGN KEY constraint failed|km_satgas_unsur/ : /CHECK constraint failed/);
    if (benar !== undefined) lolos(t, {[k]: benar});
  }
});

uji("km CHECK tabel: pelanggaran DITOLAK, kembar sah LOLOS", () => {
  for (const [t, label, salah, benar] of TABEL) {
    for (const s of [].concat(salah)) sp(() => assert.throws(() => sah(t, s), /CHECK constraint failed/, `${t} [${label}]: ${rep(s)} DITERIMA padahal melanggar CHECK tabel`));
    if (benar) sp(() => assert.doesNotThrow(() => sah(t, benar), `${t} [${label}]: ${rep(benar)} DITOLAK padahal sah`));
  }
});

uji("km dummy: dummy=2 ditolak, dummy 0 dan 1 lolos di semua tabel km_*", () => {
  for (const t of kolomKm()) {
    assert.ok(kolomDari(t).includes("dummy"), `${t} tidak punya kolom dummy`);
    tolak(t, {dummy: 2}); tolak(t, {dummy: -1});
    lolos(t, {dummy: 0}); lolos(t, {dummy: 1});
  }
});

uji("km id: id bukan 16 hex huruf kecil ditolak di tiap tabel ber-id TEXT", () => {
  for (const t of kolomKm()) {
    const pk = db.prepare("SELECT name, type FROM pragma_table_info(?) WHERE pk = 1").all(t);
    if (pk.length !== 1 || pk[0].name !== "id" || pk[0].type !== "TEXT") continue;
    for (const salah of ["XYZ", "ABCDEF0123456789", "0123456789abcdeg", "0123456789abcde", "0123456789abcdef0"]) tolak(t, {id: salah});
    lolos(t, {id: "0123456789abcdef"});
  }
});

uji("km FK: rujukan ke induk yang tidak ada ditolak (foreign_keys ON)", () => {
  let diperiksa = 0;
  for (const t of kolomKm()) for (const fk of db.prepare("SELECT \"from\" AS k, \"table\" AS induk FROM pragma_foreign_key_list(?)").all(t)) {
    tolak(t, {[fk.k]: BOGUS}, /FOREIGN KEY constraint failed|km_satgas_unsur/); diperiksa++;
  }
  assert.ok(diperiksa >= 50, `hanya ${diperiksa} FK diperiksa, harusnya >= 50`);
});

uji("km FK: km_aktivasi_meja merujuk meja_petugas, km_aktivasi.permintaan_id wajib dan merujuk relawan_permintaan", () => {
  tolak("km_aktivasi_meja", {meja_petugas_id: BOGUS}, /FOREIGN KEY constraint failed/);
  lolos("km_aktivasi_meja", {});
  tolak("km_aktivasi", {permintaan_id: null}, /NOT NULL constraint failed/);
  tolak("km_aktivasi", {permintaan_id: BOGUS}, /FOREIGN KEY constraint failed/);
});

/* ================================================================ unik */
uji("km UNIQUE kolom/tabel: kembar ditolak", () => {
  const dua = (t, kunci, pesan) => {
    sp(() => { const x = sah(t, kunci.pertama?.() ?? {}); assert.throws(() => sah(t, kunci.kedua(x)), /UNIQUE constraint failed/, `${t}: ${pesan} DITERIMA dua kali`); });
  };
  dua("km_akun", {kedua: x => ({email: x.email})}, "email koordinator sama");
  dua("km_bpbd_kode", {kedua: x => ({kode_sha: x.kode_sha})}, "kode_sha BPBD sama");
  dua("km_pl_kode", {kedua: x => ({kode_sha: x.kode_sha})}, "kode_sha penelaah sama");
  dua("km_pengingat", {kedua: x => ({jenis: x.jenis, sumber_id: x.sumber_id, keadaan: x.keadaan})}, "(jenis, sumber_id, keadaan) sama");
  dua("km_masalah_pakar", {kedua: x => ({masalah_id: x.masalah_id, akademisi_id: x.akademisi_id})}, "pakar sama di satu masalah");
  dua("km_jawaban", {kedua: x => ({kunjungan_id: x.kunjungan_id, klien_id: x.klien_id})}, "UNIQUE(kunjungan_id, klien_id): jawaban kembar");
  dua("km_proposal", {pertama: () => ({surat_nomor: "KM/SD/2026/001"}), kedua: () => ({surat_nomor: "KM/SD/2026/001"})}, "surat_nomor sama");
  dua("km_konsorsium", {kedua: x => ({proposal_id: x.proposal_id, jenis: x.jenis, rujukan: x.rujukan})}, "anggota konsorsium sama");
  dua("km_piket", {kedua: x => ({minggu: x.minggu, rumpun: x.rumpun, akademisi_id: x.akademisi_id})}, "piket sama (minggu, rumpun, pakar)");
  dua("km_panggilan", {pertama: () => ({relawan_id: unsurRel("dosen")}), kedua: x => ({aktivasi_id: x.aktivasi_id, relawan_id: x.relawan_id})}, "panggilan ganda ke relawan sama dalam satu aktivasi");
  dua("km_panggilan", {pertama: () => ({relawan_id: null, akademisi_id: "A5012345678"}), kedua: x => ({aktivasi_id: x.aktivasi_id, relawan_id: null, akademisi_id: "A5012345678"})}, "panggilan ganda ke pakar sama dalam satu aktivasi");
  dua("km_aktivasi_laporan", {kedua: x => ({aktivasi_id: x.aktivasi_id, institusi_id: x.institusi_id, tanggal: x.tanggal})}, "laporan harian sama");
  dua("km_aktivasi_meja", {kedua: x => ({aktivasi_id: x.aktivasi_id, meja_petugas_id: x.meja_petugas_id})}, "meja sama di aktivasi");
  dua("km_satgas_anggota", {kedua: x => ({satgas_id: x.satgas_id, relawan_id: x.relawan_id})}, "anggota satgas ganda");
  dua("km_pelajaran", {kedua: x => ({aktivasi_id: x.aktivasi_id})}, "dua catatan pembelajaran untuk satu aktivasi");
  dua("km_magang_lamar", {kedua: x => ({magang_id: x.magang_id, relawan_id: x.relawan_id})}, "lamaran ganda");
  dua("km_desa", {kedua: x => ({institusi_id: x.institusi_id, desa_kode: x.desa_kode})}, "desa binaan sama");
  dua("km_agenda_sumber", {kedua: x => ({agenda_id: x.agenda_id, masalah_id: x.masalah_id})}, "sumber agenda sama");
  dua("km_kampus", {kedua: x => ({institusi_id: x.institusi_id})}, "dua profil kampus untuk satu institusi");
  dua("km_anggota", {kedua: x => ({relawan_id: x.relawan_id})}, "dua profil anggota untuk satu relawan");
  /* kembar yang sah: pakar sama di masalah lain, kolom NULL tidak saling bentrok */
  lolos("km_proposal", {surat_nomor: null}); lolos("km_proposal", {surat_nomor: null});
  const ak = AK(900), m1 = masalah(), m2 = masalah();
  lolos("km_masalah_pakar", {masalah_id: m1, akademisi_id: ak}); lolos("km_masalah_pakar", {masalah_id: m2, akademisi_id: ak});
});

uji("km_masalah auto unik: dua baris auto_id sama dummy=0 ditolak, dummy=1 + dummy=0 lolos", () => {
  const A = "auto-6211-banjir-A2";
  sah("km_masalah", {sumber: "otomatis", auto_id: A});
  tolak("km_masalah", {sumber: "otomatis", auto_id: A}, /UNIQUE constraint failed/);
  lolos("km_masalah", {sumber: "otomatis", auto_id: A, dummy: 1});
  tolak("km_masalah", {sumber: "otomatis", auto_id: A, dummy: 0}, /UNIQUE constraint failed/);
  lolos("km_masalah", {sumber: "bpbd", auto_id: null});
  lolos("km_masalah", {sumber: "bpbd", auto_id: null});
});

uji("km_satgas unik bersyarat: satu satgas dummy=0 per kampus; dummy=1 tidak bentrok", () => {
  const i = inst();
  sah("km_satgas", {institusi_id: i});
  tolak("km_satgas", {institusi_id: i}, /UNIQUE constraint failed/);
  lolos("km_satgas", {institusi_id: i, dummy: 1});
  lolos("km_satgas", {institusi_id: inst()});
});

uji("km_dampingan unik bersyarat: satu dampingan aktif per (kab4, jenis, kampus)", () => {
  const i = inst(), j = inst();
  sah("km_dampingan", {institusi_id: i, status: "berjalan"});
  tolak("km_dampingan", {institusi_id: i, status: "berjalan"}, /UNIQUE constraint failed/);
  tolak("km_dampingan", {institusi_id: i, status: "disusun"}, /UNIQUE constraint failed/);
  lolos("km_dampingan", {institusi_id: i, status: "selesai"});
  lolos("km_dampingan", {institusi_id: i, status: "batal"});
  lolos("km_dampingan", {institusi_id: i, status: "berjalan", dummy: 1});
  lolos("km_dampingan", {institusi_id: i, status: "berjalan", jenis: "RPB"});
  lolos("km_dampingan", {institusi_id: i, status: "berjalan", kab4: "3171"});
  lolos("km_dampingan", {institusi_id: j, status: "berjalan"});
});

/* ================================================================ pemicu */
uji("km_jejak beku: UPDATE apa pun dan DELETE dummy=0 ditolak, DELETE dummy=1 lolos", () => {
  const x = sah("km_jejak"), y = sah("km_jejak", {dummy: 1});
  const idx = db.prepare("SELECT id FROM km_jejak WHERE dummy = 0").get().id, idy = db.prepare("SELECT id FROM km_jejak WHERE dummy = 1").get().id;
  assert.ok(x && y);
  pemicu("km_jejak_beku_u", /km_jejak_beku/, () => ubah("km_jejak", "catatan = 'x'", "id = ?", idx));
  tolakSql("km_jejak_beku_u", () => ubah("km_jejak", "dummy = 1", "id = ?", idx), /km_jejak_beku/, "km_jejak_beku_u: UPDATE dummy menembus pemicu");
  tolakSql("km_jejak_beku_u", () => ubah("km_jejak", "catatan = 'x'", "id = ?", idy), /km_jejak_beku/, "km_jejak_beku_u: UPDATE pada baris dummy=1 menembus pemicu");
  pemicu("km_jejak_beku_d", /km_jejak_beku/, () => hapus("km_jejak", "id = ?", idx), () => hapus("km_jejak", "id = ?", idy));
});

uji("km_masalah alur: transisi tidak sah ditolak, sah lolos (ALUR_MASALAH)", () => {
  const SAH = ["diajukan>ditelaah", "diajukan>tervalidasi", "diajukan>ditolak", "diajukan>digabung", "ditelaah>tervalidasi", "ditelaah>ditolak", "ditelaah>digabung",
    "tervalidasi>dicocokkan", "dicocokkan>diambil", "tervalidasi>diambil", "diambil>berjalan", "berjalan>selesai", "ditolak>ditelaah"];
  const STATUS = ["diajukan", "ditelaah", "tervalidasi", "digabung", "ditolak", "dicocokkan", "diambil", "berjalan", "selesai"];
  const induk = masalah();
  dipicu.add("km_masalah_alur");
  for (const dari of STATUS) for (const ke of STATUS) {
    if (dari === ke) continue;
    const sahnya = SAH.includes(`${dari}>${ke}`);
    sp(() => {
      const id = masalah({status: dari, ...(dari === "digabung" ? {induk_id: induk} : {})});
      const set = ke === "digabung" ? "status = ?, induk_id = ?" : "status = ?", p = ke === "digabung" ? [ke, induk, id] : [ke, id];
      const f = () => db.prepare(`UPDATE km_masalah SET ${set} WHERE id = ?`).run(...p);
      if (sahnya) assert.doesNotThrow(f, `km_masalah_alur: ${dari}>${ke} sah DITOLAK`);
      else assert.throws(f, /km_masalah_alur/, `km_masalah_alur: ${dari}>${ke} tidak sah DITERIMA`);
    });
  }
  const id = masalah();
  assert.throws(() => ubah("km_masalah", "status = 'selesai'", "id = ?", id), /km_masalah_alur: transisi status tidak sah/, "diajukan>selesai harus ditolak dengan pesan km_masalah_alur");
  assert.doesNotThrow(() => ubah("km_masalah", "status = 'ditelaah'", "id = ?", id), "diajukan>ditelaah harus lolos");
  assert.doesNotThrow(() => ubah("km_masalah", "alasan = 'ubah kolom lain', status = 'ditelaah'", "id = ?", id), "status sama + kolom lain harus lolos");
});

uji("km_proposal alur: ide>diajukan ditolak, ide>tim lolos, mundur draf>tim dan tim>ide lolos", () => {
  const SAH = ["ide>tim", "tim>draf", "draf>diajukan", "diajukan>lolos", "diajukan>ditolak", "lolos>berjalan", "berjalan>selesai", "draf>tim", "tim>ide"];
  const STATUS = ["ide", "tim", "draf", "diajukan", "lolos", "ditolak", "berjalan", "selesai"];
  dipicu.add("km_proposal_alur");
  for (const dari of STATUS) for (const ke of STATUS) {
    if (dari === ke) continue;
    const sahnya = SAH.includes(`${dari}>${ke}`);
    sp(() => {
      const id = sah("km_proposal", {status: dari}).id, f = () => ubah("km_proposal", "status = ?", "id = ?", ke, id);
      if (sahnya) assert.doesNotThrow(f, `km_proposal_alur: ${dari}>${ke} sah DITOLAK`);
      else assert.throws(f, /km_proposal_alur/, `km_proposal_alur: ${dari}>${ke} tidak sah DITERIMA`);
    });
  }
});

uji("km_magang_lamar alur: diajukan>selesai ditolak, diajukan>diterima lolos, seluruh matriks", () => {
  const SAH = ["diajukan>diterima", "diajukan>ditolak", "diajukan>cadangan", "cadangan>diterima", "cadangan>ditolak", "diterima>berjalan", "berjalan>dinilai", "dinilai>selesai",
    "diajukan>mundur", "diterima>mundur", "berjalan>mundur"];
  const STATUS = ["diajukan", "diterima", "ditolak", "cadangan", "berjalan", "dinilai", "selesai", "mundur"];
  dipicu.add("km_magang_lamar_alur");
  for (const dari of STATUS) for (const ke of STATUS) {
    if (dari === ke) continue;
    const sahnya = SAH.includes(`${dari}>${ke}`);
    sp(() => {
      const id = sah("km_magang_lamar", {status: dari}).id, f = () => ubah("km_magang_lamar", "status = ?", "id = ?", ke, id);
      if (sahnya) assert.doesNotThrow(f, `km_magang_lamar_alur: ${dari}>${ke} sah DITOLAK`);
      else assert.throws(f, /km_magang_lamar_alur/, `km_magang_lamar_alur: ${dari}>${ke} tidak sah DITERIMA`);
    });
  }
});

uji("km_hibah_panggilan Σbobot rubrik: Σ90, Σ110, rubrik kosong, bobot hilang ditolak; Σ100 lolos (insert dan update)", () => {
  const R = (...b) => JSON.stringify(b.map((x, i) => ({kriteria: `k${i}`, bobot: x})));
  dipicu.add("km_hibah_rubrik_i"); dipicu.add("km_hibah_rubrik_u");
  for (const [rubrik, label] of [[R(50, 40), "Σ90"], [R(60, 50), "Σ110"], ["[]", "kosong"], ['[{"kriteria":"a"}]', "tanpa bobot"], [R(100.5), "Σ100,5"]]) {
    tolak("km_hibah_panggilan", {rubrik}, /km_hibah_rubrik/);
    const id = sah("km_hibah_panggilan").id;
    sp(() => assert.throws(() => ubah("km_hibah_panggilan", "rubrik = ?", "id = ?", rubrik, id), /km_hibah_rubrik/, `UPDATE rubrik ${label} DITERIMA`));
  }
  lolos("km_hibah_panggilan", {rubrik: R(100)}); lolos("km_hibah_panggilan", {rubrik: R(25, 25, 25, 25)});
  const id = sah("km_hibah_panggilan").id;
  assert.doesNotThrow(() => ubah("km_hibah_panggilan", "rubrik = ?", "id = ?", R(30, 70), id), "UPDATE rubrik Σ100 DITOLAK");
  assert.doesNotThrow(() => ubah("km_hibah_panggilan", "status = 'buka'", "id = ?", id), "UPDATE kolom lain pada rubrik Σ100 DITOLAK");
  tolak("km_hibah_panggilan", {rubrik: "bukan json"}, /malformed JSON|CHECK constraint failed/);
});

uji("km_telaah beku: UPDATE sesudah dikirim ditolak, sebelum dikirim lolos", () => {
  const t = sah("km_telaah", {skor: '{"k1":3}'}).id;
  dipicu.add("km_telaah_beku");
  assert.doesNotThrow(() => ubah("km_telaah", "skor = ?", "id = ?", '{"k1":4}', t), "UPDATE skor sebelum dikirim DITOLAK");
  assert.doesNotThrow(() => ubah("km_telaah", "dikirim = ?", "id = ?", T0 + 5, t), "UPDATE dikirim (kirim) DITOLAK");
  for (const set of ["skor = '{\"k1\":1}'", "catatan = 'x'", "dikirim = NULL", "dikirim = 1", "dummy = 1"])
    sp(() => assert.throws(() => ubah("km_telaah", set, "id = ?", t), /km_telaah_beku/, `UPDATE ${set} sesudah dikirim DITERIMA`));
});

uji("km_donor himpunan: bahaya/aspek di luar daftar ditolak (insert dan update), di dalam daftar lolos", () => {
  dipicu.add("km_donor_himpunan_i"); dipicu.add("km_donor_himpunan_u");
  tolak("km_donor", {bahaya: '["petir"]'}, /km_donor_himpunan/);
  tolak("km_donor", {bahaya: '["banjir","petir"]'}, /km_donor_himpunan/);
  tolak("km_donor", {aspek: '["A11"]'}, /km_donor_himpunan/);
  tolak("km_donor", {aspek: '["A1","B2"]'}, /km_donor_himpunan/);
  lolos("km_donor", {bahaya: '["banjir","semua"]', aspek: '["A1","A10"]'});
  const id = sah("km_donor").id;
  for (const set of ["bahaya = '[\"petir\"]'", "aspek = '[\"A11\"]'"])
    sp(() => assert.throws(() => ubah("km_donor", set, "id = ?", id), /km_donor_himpunan/, `UPDATE ${set} DITERIMA`));
  assert.doesNotThrow(() => ubah("km_donor", "bahaya = '[\"longsor\"]', aspek = '[\"A3\"]'", "id = ?", id), "UPDATE ke himpunan sah DITOLAK");
});

uji("km_satgas unsur: wakil_alumni berunsur mahasiswa ditolak, berunsur alumni lolos (insert dan update)", () => {
  const mhs = unsurRel("mahasiswa"), alm = unsurRel("alumni"), dsn = unsurRel("dosen"), polos = rel();
  dipicu.add("km_satgas_unsur_i"); dipicu.add("km_satgas_unsur_u");
  tolak("km_satgas", {wakil_alumni_id: mhs}, /km_satgas_unsur/);
  lolos("km_satgas", {wakil_alumni_id: alm});
  tolak("km_satgas", {wakil_mahasiswa_id: alm}, /km_satgas_unsur/);
  lolos("km_satgas", {wakil_mahasiswa_id: mhs});
  tolak("km_satgas", {wakil_mahasiswa_id: dsn}, /km_satgas_unsur/);
  tolak("km_satgas", {wakil_alumni_id: polos}, /km_satgas_unsur/);
  lolos("km_satgas", {wakil_mahasiswa_id: mhs, wakil_alumni_id: alm, ketua_relawan_id: dsn, wakil_kampus_id: dsn});
  tolak("km_satgas", {wakil_mahasiswa_id: mhs, wakil_alumni_id: mhs}, /km_satgas_unsur/);
  const id = satgas();
  sp(() => assert.throws(() => ubah("km_satgas", "wakil_alumni_id = ?", "id = ?", mhs, id), /km_satgas_unsur/, "UPDATE wakil_alumni=mahasiswa DITERIMA"));
  sp(() => assert.throws(() => ubah("km_satgas", "wakil_mahasiswa_id = ?", "id = ?", alm, id), /km_satgas_unsur/, "UPDATE wakil_mahasiswa=alumni DITERIMA"));
  assert.doesNotThrow(() => ubah("km_satgas", "wakil_alumni_id = ?, wakil_mahasiswa_id = ?", "id = ?", alm, mhs, id), "UPDATE ke unsur sah DITOLAK");
  assert.doesNotThrow(() => ubah("km_satgas", "radius_km = 200", "id = ?", id), "UPDATE kolom lain DITOLAK");
});

/* ================================================================ gerbang pemicu */
uji("km: tiap trigger km_* di skema sudah dipicu uji di atas", () => {
  const ada = db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'km\\_%' ESCAPE '\\' ORDER BY name").all().map(r => r.name);
  const bersyarat = db.prepare("SELECT count(*) n FROM sqlite_master WHERE type='index' AND name LIKE 'uq\\_km\\_%' ESCAPE '\\'").get().n;
  assert.ok(ada.length + bersyarat >= 13, `hanya ${ada.length} trigger + ${bersyarat} indeks unik bersyarat km_*, harusnya >= 13 penjaga`);
  assert.equal(ada.length, 12, `ada ${ada.length} trigger km_*, harusnya tepat 12 (jejak 2, masalah 1, donor 2, proposal 1, rubrik 2, telaah 1, satgas 2, lamar 1)`);
  assert.deepEqual(ada.filter(t => !dipicu.has(t)), [], `trigger km_* tanpa uji WAJIB GAGAL: ${ada.filter(t => !dipicu.has(t)).join(", ")}`);
  assert.deepEqual([...dipicu].filter(t => !ada.includes(t)), [], "uji menyebut trigger yang tidak ada di skema");
});

uji("km: tiap indeks unik bersyarat tercakup (3 indeks WHERE)", () => {
  const u = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'uq\\_km\\_%' ESCAPE '\\' ORDER BY name").all().map(r => r.name);
  assert.deepEqual(u, ["uq_km_dampingan", "uq_km_masalah_auto", "uq_km_satgas"], "indeks unik bersyarat km_* berubah; tambahkan uji WAJIB GAGAL untuk yang baru");
  for (const nama of u) assert.match(db.prepare("SELECT sql FROM sqlite_master WHERE name = ?").get(nama).sql, / WHERE /, `${nama} bukan indeks bersyarat`);
});
