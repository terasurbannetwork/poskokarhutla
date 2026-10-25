/* Pengurai bahan Pusdalops (public/laporan_urai.js) terhadap bahan ASLI Dit. Koordalops 24 Okt 2026.
   Fixture: rekap WA apa adanya, potongan teks laphar bagian A, dan 3 halaman tabel bagian I sebagai
   koordinat kata (x, y, lebar, teks) -- bentuk yang sama dengan yang diberikan pdf.js di peramban.
   Jalankan: node --test tests/warga/laporan_urai.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR} from "./_bantu.mjs";

const uji = (nama, fn) => test(nama, fn);   // gerbang.test.mjs mencari uji("<nama>")
/* Dijalankan di realm yang sama (bukan node:vm) supaya objek hasil urai punya prototipe yang sama
   dengan objek uji -- deepStrictEqual membandingkan prototipe juga. */
const win = {};
new Function("window", readFileSync(path.join(AKAR, "public/laporan_urai.js"), "utf8"))(win);
const U = win.LaporanUrai;
const PROV = Object.fromEntries(Object.entries(JSON.parse(readFileSync(path.join(AKAR, "public/data/laporan.json"), "utf8")).prov).map(([k, v]) => [k, v.nama]));
const fixture = n => readFileSync(path.join(AKAR, "tests/warga/fixtures", n), "utf8");
const items = () => fixture("laphar-sk-24okt.tsv").trim().split("\n").map(l => {
  const [x, y, w, ...s] = l.split("\t"); return {x: +x, y: +y, w: +w, str: s.join("\t")};
});

uji("rekap WA Koordalops: periode, jumlah, dan tiap kejadian terbaca", () => {
  const h = U.urai(fixture("koordalops-wa-24okt.txt"), PROV);
  assert.equal(h.bentuk, "wa");
  assert.deepEqual([h.mulai, h.sampai, h.jam], ["2026-10-24", "2026-10-25", "07.00"]);
  assert.equal(h.laporan_masuk, 23);
  assert.equal(h.menonjol, 21);
  assert.equal(h.koordinator, "Dian Nur W");
  assert.deepEqual(h.lewat, [], "tidak ada baris yang gagal diurai");
  assert.equal(h.kejadian.length, 5);

  const solok = h.kejadian.find(k => k.lokasi === "Solok");
  assert.equal(solok.prov, "13");
  assert.equal(solok.jenis, "banjir");
  assert.equal(solok.sifat, "Pengkinian Data");
  assert.equal(solok.entry_no, 15);
  assert.match(solok.status_penetapan, /^Transisi Darurat ke Pemulihan TMT 13\/10\/2026/);
  assert.match(solok.dampak, /2 \(dua\) jiwa MD/);

  /* Judul "di Prov. X" = tingkat provinsi: kolom lokasi kosong, bukan diisi nama provinsi */
  const riau = h.kejadian.find(k => k.prov === "14");
  assert.equal(riau.lokasi, "");
  assert.equal(riau.jenis, "karhutla");
  /* sisa > 0 ha di tingkat provinsi = masih berjalan, bukan belum (sisanya tersebar banyak lokasi) */
  assert.equal(riau.status, "berjalan");
  /* "Api sudah padam" = selesai */
  assert.equal(h.kejadian.find(k => k.lokasi === "Wonosobo").status, "selesai");
});

uji("rekap WA: baris penomoran laporan tidak ikut jadi kejadian", () => {
  const h = U.urai(fixture("koordalops-wa-24okt.txt"), PROV);
  assert.ok(!h.kejadian.some(k => /Laporan kejadian bencana|Kejadian menonjol/i.test(k.judul)),
    "baris '1. Laporan kejadian bencana sejumlah ...' bukan kejadian");
});

uji("laphar bagian A: entri, medan, dan status penetapan dari prosa SK", () => {
  const h = U.urai(fixture("laphar-entri-24okt.txt"), PROV);
  assert.equal(h.bentuk, "laphar");
  assert.equal(h.tanggal, "2026-10-24");
  assert.deepEqual([h.mulai, h.sampai, h.jam], ["2026-10-24", "2026-10-25", "07.00"]);
  assert.equal(h.kejadian.length, 3);

  const [satu, dua, tiga] = h.kejadian;
  assert.equal(satu.entry_no, 1);
  assert.equal(satu.prov, "32", "Provinsi diambil dari ekor judul, bukan dari nama kawasan");
  assert.equal(satu.jenis, "karhutla");
  assert.equal(satu.lokasi_rekap, "1 Kecamatan / 1 Desa");
  assert.match(satu.kronologi, /^Pada hari Rabu 21 Oktober 2026/);
  assert.match(satu.status_penetapan, /Siaga Darurat TMT 1 Oktober 2026 s\.d 31 Oktober 2026/);
  assert.equal(dua.prov, "16");
  assert.equal(dua.lokasi, "", "entri tingkat provinsi tanpa kab/kota");
  assert.equal(tiga.lokasi, "Karanganyar");
});

uji("laphar bagian A: butir di dalam entri tidak dibaca sebagai entri baru", () => {
  const h = U.urai(fixture("laphar-entri-24okt.txt"), PROV);
  assert.deepEqual(h.kejadian.map(k => k.entry_no), [1, 2, 3], "nomor entri hanya menaik");
});

uji("tabel SK Darurat: tiap baris logis utuh walau selnya rata tengah tegak", () => {
  const r = U.uraiSkDarurat(items(), PROV);
  assert.equal(r.length, 13);
  assert.ok(r.every(x => x.prov), "tiap baris dapat kode provinsi: " + JSON.stringify(r.filter(x => !x.prov)));

  const aceh = r.filter(x => x.prov === "11");
  assert.deepEqual(aceh.map(x => x.no), [1, 2, 3]);
  assert.equal(aceh[0].kabkota, "Kab. Aceh Utara");
  assert.equal(aceh[0].macam, "transisi");
  /* potongan sel yang dicetak DI ATAS angka nomornya tetap milik baris itu */
  assert.equal(aceh[0].masa, "Perpanjangan TMT 1 Mei 2026 sd 31 Oktober 2026");
  assert.equal(aceh[0].sk_posko, "Nomor: 360/364/2026");
  assert.deepEqual([aceh[0].mulai, aceh[0].sampai], ["2026-05-01", "2026-10-31"]);
  assert.equal(aceh[2].macam, "siaga");
  assert.deepEqual([aceh[2].mulai, aceh[2].sampai], ["2026-09-17", "2026-12-31"]);

  /* baris provinsi tanpa kab/kota (Prov. Riau) tetap terbaca, dengan kolom kab/kota kosong */
  const riau = r.find(x => x.prov === "14");
  assert.equal(riau.kabkota, "");
  assert.equal(riau.jenis, "karhutla");
  assert.equal(riau.macam, "siaga");
});

uji("tabel SK Darurat butuh koordinat: teks tempelan biasa tidak diam-diam kosong", () => {
  const h = U.urai(fixture("laphar-entri-24okt.txt"), PROV);
  assert.deepEqual(h.status_daerah, []);
  assert.ok(h.lewat.some(x => /unggahan PDF/i.test(x)), "alasannya disebut, bukan hilang diam-diam: " + JSON.stringify(h.lewat));
});

uji("tataLetak: kata tidak berdempet dan baris tabel dipisah", () => {
  const teks = U.tataLetak(items());
  assert.ok(teks.includes("Jenis Kejadian") || teks.includes("Jenis  Kejadian"), "kepala tabel utuh");
  assert.ok(!/\bNo\.Jenis\b/.test(teks), "kolom berdempetan tetap dipisah spasi");
});

uji("bentuk teks yang tidak dikenali dilaporkan, bukan dikarang", () => {
  const h = U.urai("Halo, ini pesan biasa tanpa bentuk laporan apa pun.", PROV);
  assert.equal(h.bentuk, "");
  assert.deepEqual(h.kejadian, []);
  assert.ok(h.lewat.length);
});

uji("gabung: baris lama diperbarui, isian petugas tidak ditimpa nilai kosong", () => {
  const lama = [{jenis: "karhutla", prov: "14", lokasi: "", entry_no: 20, dampak: "diketik petugas", kondisi: ""}];
  const baru = [{jenis: "karhutla", prov: "14", lokasi: "", entry_no: 20, dampak: "", kondisi: "dari WA"},
    {jenis: "banjir", prov: "13", lokasi: "Solok", entry_no: 15, dampak: "baru"}];
  const n = U.gabungKejadian(lama, baru);
  assert.deepEqual(n, {tambah: 1, ubah: 1});
  assert.equal(lama.length, 2);
  assert.equal(lama[0].dampak, "diketik petugas", "nilai kosong hasil urai tidak menghapus isian");
  assert.equal(lama[0].kondisi, "dari WA");
});

uji("gabung status daerah: kunci provinsi + kab/kota + jenis", () => {
  const lama = [{prov: "11", kabkota: "Kab. Pidie", jenis_teks: "Bencana Banjir", masa: "lama"}];
  const n = U.gabungStatus(lama, [{prov: "11", kabkota: "Kab. Pidie", jenis_teks: "Bencana Banjir", masa: "baru"},
    {prov: "11", kabkota: "Kab. Aceh Utara", jenis_teks: "Bencana Banjir", masa: "baru"}]);
  assert.deepEqual(n, {tambah: 1, ubah: 1});
  assert.equal(lama[0].masa, "baru");
});
