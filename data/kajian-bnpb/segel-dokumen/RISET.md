# RISET: Segel dokumen dan verifikasi

## 1. Yang sudah ada di repo

| Titik beku | Tempat | Sidik | Ralat |
| --- | --- | --- | --- |
| Laporan harian karhutla | `lk_snapshot` (migrasi 0032), ditulis `src/laporan_karhutla.js` fungsi `kunci` dan ralat | `hash` = sha256 `isi` (JSON angka slide, lampiran, teks WA) | baris baru per ralat, trigger menolak ubah dan hapus |
| Laporan harian bencana lain | `lkb_snapshot` (migrasi 0048), `src/laporan_bencana.js` | `hash` = sha256 `isi` | sama |
| Sitrep, renops, laporan KIB | R2 `dokumen/<jenis>/<bencana>/<periode>/<wilayah>/v<n>.json`, baris `pb_dokumen` (migrasi 0131), `src/pb_dokumen.js` rute bekukan | `pb_dokumen.sha` = sha256 JSON beku | versi baru lewat rakit ulang |
| Data lanjutan BPBD | `lj_beku` (migrasi 0161) | `sidik` 64 heks | versi per berkas |
| Laporan warga Lapor Bencana | PDF A4 lewat Playwright, QR ke `/lapor/l/<nomor>` (KEPUTUSAN-LAPOR-AI D21) | tidak ada | versi perkembangan = PDF baru |

Pustaka QR sudah tersedia di peramban: `public/vendor/qrcode/qrcode.min.js`, dipakai `public/logpal/logpal.js` dan `public/pipa/layar_kit.js`. Pola kode acak yang hanya disimpan sidiknya ada di `src/token.js`; segel berbeda karena kodenya memang untuk dibaca publik, jadi kode disimpan apa adanya.

Lembar cetak yang sudah punya `@page` A4 dan akan memuat blok QR: `public/bnpb/dokumen.css` (dokumen PB), cetak laporan harian di `public/laporan_karhutla_slide.js` dan `public/laporan_bahaya_slide.js`.

## 2. Praktik di luar

- **Tanda tangan elektronik tersertifikasi** (BSrE BSSN, UU ITE dan PP 71/2019): mengikat identitas penanda tangan. Butuh sertifikat per pejabat; di luar paket ini (D10).
- **QR verifikasi dokumen pemerintah** (contoh umum: dokumen kependudukan dan sertifikat elektronik): QR membuka halaman resmi yang menampilkan data sampul dan status, bukan isi lengkap. Pola ini yang ditiru.
- **Sidik isi kanonik lawan sidik berkas**: PDF yang dirender ulang hampir tidak pernah sama byte-nya, jadi sidik utama diambil dari isi JSON beku. Sidik berkas PDF hanya dicatat bila PDF-nya memang disimpan sekali dan tidak dirender ulang.
- **Pencabutan**: daftar cabut terpisah (seperti CRL pada sertifikat) lebih jujur daripada menghapus baris; riwayat tetap utuh.

## 3. Kesimpulan untuk rancangan

1. Tidak perlu pembeku baru; empat titik beku sudah menghitung sha256.
2. Yang hilang adalah register publik yang menautkan kode cetak ke sidik dan status.
3. Pemeriksaan ulang saat dibaca murah karena isi beku ada di D1 atau R2.
