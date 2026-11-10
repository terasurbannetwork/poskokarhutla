# DATA-DAMPAK: meja Data Kejadian dan Dampak (Juklak 7/2023)

Permintaan pemilik 10 Nov 2026: BPBD mengisi data bencana secara daring, datanya dipastikan lengkap, dan ada pelatihan pengisian. Dokumen ini rancangan sekaligus kontrak kerja. `KEPUTUSAN-JUKLAK.md` tetap menang.

## Temuan dari data yang ada

| Temuan | Angka | Sumber | Akibat pada rancangan |
| --- | --- | --- | --- |
| Baris tanpa satu pun angka dampak | 36,3% dari 4.404 baris | DIBI 28 Okt 2025 sampai 28 Okt 2026 | Kosong dan nol harus dibedakan: tiap bagian punya pilihan nihil |
| Fasilitas ibadah dan kesehatan | tidak ada kolomnya | DIBI | Masuk butir Pelayanan dasar sesuai Lampiran I |
| Kecamatan terisi | 45,5% dari 13.693 kejadian | Arsip logbook Pusdalops, tiga berkas tahun terakhir | Kecamatan masuk butir inti |
| Status keadaan darurat terisi | 25,7% | Arsip yang sama | Status masuk butir inti, dengan pilihan "Belum ditetapkan" |
| Kejadian yang hanya sekali dilaporkan | 75,9% dari 56.685 kejadian | `data/pusdalops/logbook_kejadian.csv` | Tanda belum dimutakhirkan untuk kejadian darurat |
| Kejadian logbook Dalops yang juga ada di DIBI | 58,9% | `public/data/bnpb/rekonsiliasi_dalops_dibi.json` | Terima ke Logbook harus memasangkan dulu, jangan menggandakan |

Penyebab selisih Dalops dan DIBI masih hipotesis di berkas sumbernya, jadi tidak ditulis sebagai fakta.

## Bentuk meja

Id `dampak`, nama "Data kejadian dan dampak". Satu catatan per kejadian per kabupaten/kota, diperbarui di catatan yang sama. Kolom mengikuti Lampiran I huruf A, dikelompokkan `bagian`:

1. Kejadian: jenis, nama kejadian, tarikh, jam, kecamatan, desa, bujur, lintang (minimal 6 angka di belakang koma, disarankan, tidak ditolak), penyebab, kronologis, deskripsi, sumber, kondisi mutakhir, status darurat, upaya penanganan, dokumentasi (tautan), sebaran dampak (tautan). KIB dihitung server bila kode BPS tersedia.
2. Kebutuhan: dana, SDM, sarana prasarana, logistik, peralatan.
3. Akibat terhadap manusia: total meninggal, hilang, luka/sakit, mengungsi, terdampak; rincian Anak 0-17, Dewasa 18-59, Lansia 60+, L dan P per jenis korban. Jumlah rincian tidak boleh melebihi total.
4. Sosial ekonomi: sawah, lahan, kebun, hutan, kolam (ha); kios/toko, pabrik (RB, RS, RR, Terendam); taksiran kerugian (juta rupiah) per butir.
5. Prasarana vital: air bersih, listrik, telekomunikasi, irigasi, transportasi, SPBU (unit); jalan (km); jembatan (RB, RS, RR); taksiran per butir.
6. Rumah: RB, RS, RR, Terendam, taksiran.
7. Pelayanan dasar: rumah ibadat, faskes, satuan pendidikan, kantor, pasar (RB, RS, RR, Terendam); taksiran per butir.
8. Aset dan layanan: barang yang dipakai untuk penanganan darurat.

## Aturan kelengkapan

Dihitung satu fungsi murni di `public/inti/kelengkapan.js`, dipakai peramban dan Worker.

- Butir terjawab bila terisi, dan **angka 0 dihitung terjawab**. Kosong berarti belum didata.
- Tiap bagian 2, 4, 5, 7, 8 punya pilihan `nihil_<bagian>`. Bila dipilih, semua butir bagian itu terjawab dan isian angka di bagian itu ditolak.
- Keluaran: `{persen, inti_lengkap, kurang_inti: [{nama, label}], kurang_rinci: [...]}`.
- Butir inti: seluruh bagian 1 kecuali dokumentasi dan sebaran, lima total korban, empat angka rumah, dan tiap bagian lain terjawab paling tidak satu butir atau nihil.
- Rincian umur dan taksiran kerugian adalah butir rinci. Tidak menahan verifikasi karena laporan awal jarang memilikinya, tetapi tetap tampil sebagai kekurangan dan mengurangi persen.

## Alur dan status

`dilaporkan` (awal) ke `diverifikasi` (petugas, ditolak bila `inti_lengkap` salah, pesan menyebut butir yang kurang) ke `masuk_logbook` (staf Pusdalops, Koordalops, atau moderator).

Terima ke Logbook adalah keputusan manusia karena angka entri Logbook menimpa angka sebelumnya dan masuk Laporan Harian. Saat diterima: cari kejadian Logbook dengan jenis, prov, kab, dan tanggal mulai sama. Satu cocok: tambah entri. Tidak ada: buat kejadian. Lebih dari satu: tolak 409 dan minta pilih `logbook_id`. Id tersimpan di catatan supaya penerimaan berikutnya menjadi pengkinian. Kejadian di luar jendela Logbook tetap di meja dan pesannya menjelaskan.

Tanda bahaya `belum_dimutakhirkan`: status darurat Siaga atau Tanggap Darurat atau Transisi, kejadian belum ditutup, dan belum diubah lebih dari tenggat `data_dinamis_darurat` di Jam Aturan (Juklak 7/2023 Bab II: data dinamis minimal 1 hari sekali saat keadaan darurat).

## Pengawasan

- `/meja`: pil persen di tiap baris, daftar butir kurang di rincian, meter hidup di formulir.
- `/admin/meja`: tab Kelengkapan per kabupaten/kota: jumlah kejadian, persen rata-rata, butir paling sering kosong, tombol salin teks tagihan.
- Dalops tab Laporan Masuk: bagian Data BPBD berisi catatan `diverifikasi` dan tombol Terima ke Logbook.

## Impor data lama

Templat `public/bnpb/templat/data-dampak.xlsx` satu baris per kejadian. Berkas dibaca di peramban tanpa pustaka baru. `POST /api/meja/impor` paling banyak 200 baris, tiap baris melewati `validasi` yang sama, jawabannya per baris. Baris yang sama tidak masuk dua kali.

## Larangan

Tanpa nama korban, NIK, atau nomor telepon di teks bebas. Rapor BPBD tidak berubah (T3). Data BPBD asli tidak masuk repo.
