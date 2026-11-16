# BAB 9 Formulir Kejadian

Bab ini menetapkan kolom formulir kejadian yang diisi Badan Penanggulangan Bencana Daerah (BPBD), Pusat Pengendalian Operasi (Pusdalops), dan Pusat Data, Informasi, dan Komunikasi Kebencanaan (Pusdatinkom). Pertanyaan yang dijawabnya: kolom apa saja yang harus ada agar semua ketentuan Bab 1 sampai Bab 6 dapat diperiksa. Formulir ini menjadi lampiran pengganti formulir kejadian pada Juklak 7/2023. Tiap tabel memuat nama kolom, isi, jenis isian (angka, pilihan, teks, tanggal), wajib atau tidak, pengisi, dan keterangan otomatis. Kolom "Asal" menunjukkan kolom itu lama, diganti nama, atau baru. Sebelas kolom baru inti ditandai "Baru inti"; kolom baru yang lahir dari ketentuan lain ditandai "Baru lanjutan".

**Ketentuan 9.1.** Setiap kolom angka pada formulir berada dalam satu dari tiga keadaan isian: ada nilai, nihil, atau belum didata (Ketentuan 5.8). Kolom keadaan isian mendampingi setiap kolom angka dan tidak boleh dibiarkan kosong.

**Ketentuan 9.2.** Formulir tidak memuat nama korban, nama kru, atau data pribadi lain. Pelapor dicatat sebagai instansi dan jabatan.

## 9.1 Kolom identitas

Tabel 9.1. Kolom identitas

| Nama kolom | Isi | Jenis isian | Wajib | Pengisi | Otomatis | Asal |
| --- | --- | --- | --- | --- | --- | --- |
| Nomor induk kejadian | `TTTT-JJJ-NNNNNN`, satu per kejadian nasional (Ketentuan 2.4) | teks | wajib setelah disahkan | Pusdatinkom | ya, saat pengesahan | Baru inti (1) |
| Nomor usulan | Nomor yang diberikan pada laporan pertama dan dibawa tiap pengkinian (Ketentuan 2.6) | teks | wajib | BPBD atau Pusdalops | ya, oleh sistem logbook | Baru inti (2) |
| Kode identitas bencana (KIB) | 16 digit Juklak 7/2023, satu per catatan kabupaten, merujuk nomor induk | teks | wajib | BPBD | ya | Lama |
| Tanggal laporan pertama | Tanggal laporan pertama masuk, terpisah dari tanggal mulai (Ketentuan 2.10) | tanggal | wajib | BPBD atau Pusdalops | ya, dari cap waktu | Baru inti (3) |
| Tanggal mulai | Tanggal dampak pertama (Ketentuan 2.10) | tanggal | wajib | BPBD | tidak | Lama (diperjelas) |
| Tanggal selesai | Tanggal kejadian selesai menurut Tabel 2.2 | tanggal | wajib saat selesai | BPBD | usulan mesin | Lama |
| Kejadian induk | Nomor induk kejadian pemicu, bila kejadian ini anak (Ketentuan 2.9) | teks | bila ada | BPBD | tidak | Baru lanjutan |
| Lanjutan dari | Nomor induk kejadian lama bila melewati batas durasi (Ketentuan 2.13) | teks | bila ada | BPBD | usulan mesin | Baru lanjutan |
| Penanda lintas tahun | Tanda kejadian yang melewati pergantian tahun | pilihan (ya, tidak) | wajib | sistem | ya | Baru lanjutan |
| Sumber laporan | Instansi dan jabatan pelapor, tanpa nama orang | pilihan dan teks | wajib | pelapor | tidak | Lama |
| Versi angka | Nomor versi dan tanggal rilis angka (Ketentuan 5.14) | teks | wajib | Pusdatinkom | ya | Baru lanjutan |

Sumber: Ketentuan 2.4 sampai 2.13, 5.14.

## 9.2 Kolom bahaya dan lokasi

Tabel 9.2. Kolom bahaya dan lokasi

| Nama kolom | Isi | Jenis isian | Wajib | Pengisi | Otomatis | Asal |
| --- | --- | --- | --- | --- | --- | --- |
| Jenis bencana | Satu dari 14 jenis DIBI (Ketentuan 2.16) | pilihan | wajib | BPBD | tidak | Lama (`jenis_bencana`) |
| Subjenis | Misalnya banjir bandang, rob, banjir lahar | pilihan | bila ada | BPBD | tidak | Baru lanjutan |
| Provinsi | Provinsi pada batas terkini | pilihan | wajib | BPBD | ya, dari kabupaten | Lama |
| Kabupaten atau kota | Satu catatan kabupaten per kabupaten terdampak | pilihan | wajib | BPBD | tidak | Lama |
| Kode wilayah | Kode wilayah Kementerian Dalam Negeri saat kejadian (Ketentuan 2.14) | teks | wajib | sistem | ya, dari tabel padanan | Lama (`id_kab_bps`, diperjelas) |
| Kecamatan dan desa | Lokasi terdampak | teks | bila ada | BPBD | tidak | Lama |
| Titik perwakilan | Koordinat titik perwakilan kejadian (Ketentuan 2.11) | angka (lintang, bujur) | wajib | BPBD | tidak | Baru lanjutan |
| Daftar kabupaten | Daftar kabupaten bagi kejadian berluas | pilihan ganda | bila berluas | BPBD | usulan mesin | Baru lanjutan |
| Atribut bahaya | Ukuran bahaya menurut Tabel 4.2: magnitudo, tinggi genangan, VEI, dan seterusnya (Ketentuan 4.10) | angka dan pilihan | bila tersedia | BPBD dan sumber teknis | sebagian | Baru inti (4) |
| Pemicu dominan | Alam, manusia sengaja, manusia lalai, atau teknologi | pilihan | wajib untuk karhutla dan kebakaran | BPBD usul, Pusdatinkom tetapkan | tidak | Baru inti (5) |
| Jenis lahan | Gambut atau mineral (Ketentuan 2.16) | pilihan | wajib untuk karhutla | BPBD | tidak | Baru lanjutan |
| Sumber bahaya luar negeri | Penanda bahaya yang berasal dari luar negeri (Ketentuan 2.12) | pilihan | bila ada | BPBD | tidak | Baru lanjutan |

Sumber: Ketentuan 2.11 sampai 2.16, 4.10.

## 9.3 Kolom korban

Tabel 9.3. Kolom korban. Semua kolom angka didampingi kolom keadaan isian (Ketentuan 9.1)

| Nama kolom | Isi | Jenis isian | Wajib | Pengisi | Otomatis | Asal |
| --- | --- | --- | --- | --- | --- | --- |
| Meninggal | Meninggal langsung akibat bahaya, jiwa; nilai terakhir (Ketentuan 5.1) | angka | wajib | BPBD | tidak | Lama |
| Meninggal tidak langsung | Meninggal dalam 30 hari setelah kejadian selesai, dengan keterangan penyebab dari dinas kesehatan (Ketentuan 1.1 sampai 1.5) | angka dan teks | bila ada | BPBD, dinas kesehatan | tidak | Baru inti (6) |
| Hilang | Jiwa; nilai terbesar | angka | wajib | BPBD | tidak | Lama |
| Diduga meninggal | Hilang yang pencariannya resmi ditutup, dengan tanggal penutupan (Ketentuan 1.5) | angka dan tanggal | bila ada | BPBD | tidak | Baru lanjutan |
| Luka atau sakit | Jiwa; nilai terbesar | angka | wajib | BPBD | tidak | Lama (`luka_sakit`) |
| Mengungsi | Jiwa pada puncak, dicatat di kabupaten asal (Ketentuan 4.4) | angka | wajib | BPBD | tidak | Lama |
| Evakuasi preventif | Jiwa yang dipindahkan sebelum dampak; tidak masuk mengungsi | angka | bila ada | BPBD | tidak | Baru inti (7) |
| Terdampak | Terdampak langsung menurut definisi Bab 1; jiwa, nilai terbesar | angka | wajib | BPBD | tidak | Diganti nama (dari `menderita`) |
| Terancam | Orang yang hanya terancam; tidak masuk hitungan | angka | bila ada | BPBD | tidak | Baru lanjutan |
| Kepala keluarga | Jumlah KK bila laporan hanya memuat KK | angka | bila ada | BPBD | tidak | Lama |
| Penanda taksiran dari KK | Tanda bahwa jiwa dihitung dari KK dikali rata-rata anggota rumah tangga (Ketentuan 1.3) | pilihan (ya, tidak) | wajib | sistem | ya | Baru lanjutan |
| Keadaan isian | Ada nilai, nihil, atau belum didata, untuk tiap kolom angka | pilihan | wajib | BPBD | tidak | Baru inti (8) |

Sumber: Ketentuan 1.1 sampai 1.5, 4.4, 5.1, 5.3, 5.8.

## 9.4 Kolom kerusakan dan kerugian

Tabel 9.4. Kolom kerusakan dan kerugian

| Nama kolom | Isi | Jenis isian | Wajib | Pengisi | Otomatis | Asal |
| --- | --- | --- | --- | --- | --- | --- |
| Rumah rusak berat | Unit, nilai terakhir (Ketentuan 5.4) | angka | wajib | BPBD | tidak | Lama (`rumah_rusak_berat`) |
| Rumah rusak sedang | Unit, nilai terakhir | angka | wajib | BPBD | tidak | Lama (`rumah_rusak_sedang`) |
| Rumah rusak ringan | Unit, nilai terakhir | angka | wajib | BPBD | tidak | Lama (`rumah_rusak_ringan`) |
| Rumah rusak belum terpilah | Unit yang tingkat rusaknya belum dipilah, dihitung 0,25 (Ketentuan 5.5) | angka | bila ada | BPBD | tidak | Baru lanjutan |
| Rumah terendam | Unit; dicatat terpisah dari rumah rusak (Ketentuan 5.6) | angka | wajib | BPBD | tidak | Lama (`rumah_terendam`) |
| Rumah setara rusak berat | Rumah rusak berat + 0,5 x rusak sedang + 0,25 x rusak ringan (Ketentuan 5.5) | angka | wajib | sistem | ya | Baru lanjutan |
| Fasilitas penting rusak | Lembaga atau unit menurut daftar tertutup, rusak berat dan sedang, per jenis (Ketentuan 5.7) | angka per jenis | wajib | BPBD | tidak | Lama (`pendidikan_rusak`, `fasyankes_rusak`, `rumah_ibadat_rusak`, `fasum_rusak`; daftar diperluas) |
| Luas terbakar | Hektare, terverifikasi (Ketentuan 5.13) | angka | wajib untuk karhutla | BPBD, Manggala Agni | tidak | Lama (diperjelas) |
| Sumber angka luas | Pengukuran lapangan, citra resolusi 30 meter atau lebih halus, atau indikasi *hotspot* (Ketentuan 5.13) | pilihan | wajib untuk karhutla | BPBD | tidak | Baru inti (9) |
| Puso | Hektare gagal panen menurut dinas pertanian | angka | bila ada | dinas pertanian | tidak | Lama (diperjelas) |
| Kerusakan | Nilai aset fisik yang rusak, rupiah (Ketentuan 5.10) | angka | bila tersedia | BPBD | tidak | Lama |
| Kerugian | Pendapatan dan biaya yang hilang, rupiah; tidak dijumlah dengan kerusakan | angka | bila tersedia | BPBD | tidak | Lama |
| Tahun harga | Tahun harga untuk kerusakan dan kerugian | angka | wajib bila ada rupiah | BPBD | tidak | Baru lanjutan |

Sumber: Ketentuan 5.4 sampai 5.13.

## 9.5 Kolom status dan penanda

Tabel 9.5. Kolom status dan penanda

| Nama kolom | Isi | Jenis isian | Wajib | Pengisi | Otomatis | Asal |
| --- | --- | --- | --- | --- | --- | --- |
| Status kejadian | Bencana, di bawah ambang, terdeteksi belum diverifikasi, atau tidak terverifikasi kedaluwarsa (Ketentuan 3.9, 3.10) | pilihan | wajib | sistem, Pusdatinkom | ya | Diganti nama (dari `is_bencana`) |
| Dasar masuk | Nomor syarat masuk yang terpenuhi, misalnya "2 dan 4" (Ketentuan 3.12) | pilihan ganda | wajib bila status bencana | sistem | ya, dari angka | Baru inti (10) |
| Kelas sementara | Ringan, Sedang, Besar, Katastrofik menurut angka terbaru (Ketentuan 4.8) | pilihan | wajib | sistem | ya | Baru lanjutan |
| Kelas akhir | Kelas yang ditetapkan pada rilis bulanan pertama setelah kejadian selesai (Ketentuan 4.8) | pilihan | wajib saat rilis | Pusdatinkom | ya | Baru lanjutan |
| Indikator penentu kelas | Indikator yang menentukan kelas, misalnya meninggal dan hilang | pilihan | wajib | sistem | ya | Baru lanjutan |
| Penanda status darurat | Siaga darurat, tanggap darurat, status payung, Keadaan Tertentu, dan nomor dokumen (Ketentuan 3.7) | pilihan dan teks | bila ada | BPBD | tidak | Baru inti (11) |
| Penanda bantuan | Permintaan bantuan nasional dan dana siap pakai, dengan nomor dokumen (Ketentuan 3.7) | pilihan dan teks | bila ada | BPBD | tidak | Baru inti (11) |
| Nomor SK tanggap darurat | Nomor dan tanggal SK yang dicocokkan dengan kejadian (Ketentuan 3.15) | teks | bila ada | BPBD | pencocokan oleh Pusdatinkom | Baru lanjutan |
| Penanda risiko menumpuk | Tanda kabupaten yang kejadian di bawah ambangnya menumpuk dalam satu tahun (Ketentuan 3.16) | pilihan | rilis tahunan | sistem | ya | Baru lanjutan |
| Penanda dicocokkan ulang | Tanda data lama yang dicocokkan ulang menurut Ketentuan 2.17 | pilihan | untuk data lama | sistem | ya | Baru lanjutan |
| Keberatan | Keberatan BPBD, tanggal, dan putusan (Ketentuan 7.2) | teks dan tanggal | bila ada | BPBD, Pusdatinkom | tidak | Baru lanjutan |

Sumber: Ketentuan 2.17, 3.7 sampai 3.16, 4.8, 7.2. Penanda status darurat dan penanda bantuan menjadi satu kolom baru inti dalam daftar sebelas kolom.

## 9.6 Kolom yang terisi otomatis

Kolom berikut tidak diisi petugas. Mesin mengisinya dari kolom lain dan meninggalkan jejak (Ketentuan 7.5).

Tabel 9.6. Kolom otomatis dan sumbernya

| Kolom | Diisi dari | Ketentuan |
| --- | --- | --- |
| Nomor usulan | Sistem logbook saat laporan pertama | 2.6 |
| Nomor induk kejadian | Pusdatinkom saat pengesahan, paling lambat 7 hari kerja | 2.5, 7.1 |
| Tanggal laporan pertama | Cap waktu laporan pertama | 2.10 |
| Penanda lintas tahun | Tanggal mulai dan tanggal selesai | 2.10 |
| Provinsi dan kode wilayah | Kabupaten dan tabel padanan kode wilayah | 2.14, 7.4 |
| Jumlah catatan kabupaten | Hitungan catatan per nomor induk | 2.2 |
| Rumah setara rusak berat | Tiga tingkat kerusakan rumah | 5.5 |
| Penanda taksiran dari KK | Laporan yang hanya memuat KK | 1.3 |
| Status kejadian | Syarat masuk dan tenggang verifikasi | 3.9, 3.10 |
| Dasar masuk | Angka yang sah dibandingkan enam syarat | 3.12 |
| Kelas sementara dan indikator penentu | Angka terbaru dibandingkan Tabel 4.1 | 4.2, 4.8 |
| Penanda risiko menumpuk | Akumulasi kejadian di bawah ambang per kabupaten | 3.16 |
| Penanda dicocokkan ulang | Proses pencocokan data lama | 2.17 |
| Versi angka | Rilis bulanan | 5.14 |

Sumber: Ketentuan Bab 1 sampai Bab 7.

## 9.7 Perubahan nama kolom DIBI

**Ketentuan 9.3.** Skema DIBI diubah menurut Tabel 9.7. Kolom lama yang tidak tercantum tetap dipakai dengan arti yang sama.

Tabel 9.7. Perubahan nama kolom DIBI lama ke kolom baru

| Kolom DIBI lama | Kolom baru | Perubahan | Ketentuan |
| --- | --- | --- | --- |
| `menderita` | terdampak | diganti nama, arti disamakan dengan terdampak langsung; kata "menderita" tidak dipakai di laporan | 1.1 |
| `menderita_mengungsi` | tidak ada | dihapus; angka gabungan dihitung dari terdampak dan mengungsi saat dibutuhkan | 1.2 |
| `jumlah_kejadian` (pecahan) | nomor induk kejadian dan jumlah catatan kabupaten | diganti; satu baris satu catatan kabupaten, tanpa pecahan | 2.2, 2.3 |
| `is_bencana` | status kejadian dan dasar masuk | diganti; tiga status ditambah kedaluwarsa, dengan syarat yang terpenuhi | 3.9, 3.12 |
| `hilang` | hilang dan diduga meninggal | dipecah; diduga meninggal disimpan terpisah dengan tanggal penutupan | 1.5 |
| `meninggal` | meninggal dan meninggal tidak langsung | dipecah; kematian tidak langsung di kolom tersendiri | 1.1 |
| `mengungsi` | mengungsi dan evakuasi preventif | dipecah; pindah sebelum dampak tidak lagi tercampur | 1.1 |
| `luka_sakit` | luka atau sakit | nama ditulis dengan kata hubung; arti tetap | 1.1 |
| `rumah_rusak_berat`, `rumah_rusak_sedang`, `rumah_rusak_ringan` | sama, ditambah rumah setara rusak berat | kolom turunan ditambah; rumah belum terpilah dicatat terpisah | 5.4, 5.5 |
| `rumah_terendam` | rumah terendam | tidak berubah; tidak masuk hitungan rumah rusak | 5.6 |
| `pendidikan_rusak`, `fasyankes_rusak`, `rumah_ibadat_rusak`, `fasum_rusak` | fasilitas penting rusak per jenis | disusun ulang menurut daftar tertutup dan satuannya | 5.7 |
| `tgl_kejadian` | tanggal mulai dan tanggal laporan pertama | dipisah; tanggal kejadian adalah tanggal dampak pertama | 2.10 |
| tidak ada | luas terbakar, sumber angka luas, puso | kolom baru untuk karhutla dan pertanian | 5.13 |
| tidak ada | kelas sementara, kelas akhir, indikator penentu | kolom baru | 4.2, 4.8 |
| tidak ada | atribut bahaya, pemicu dominan | kolom baru | 4.10 |

Sumber: skema DIBI hasil tarikan 12 November 2026 dan Ketentuan Bab 1 sampai Bab 5. Nama kolom DIBI yang tidak tercantum di tabel mengikuti skema yang berlaku saat ini.
