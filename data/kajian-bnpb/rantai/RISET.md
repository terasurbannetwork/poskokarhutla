# RISET: dasar hukum dan kode yang dipakai ulang

Semua angka di bawah dibaca langsung dari `data/hukum/teks/<slug>.txt.gz` pada 10 Nov 2026. "hal." mengikuti penanda "=== hal N" di teks. Semua dokumen berstatus BERLAKU di `public/data/bnpb/hukum/katalog.json` dan tidak ada di daftar konflik.

## 1. Rantai Satu Kejadian

| Tahap | Dasar | Isi yang dipakai |
| --- | --- | --- |
| Penilaian awal | Juklak 4/2023 hal. 1, 4 | Informasi awal dari masyarakat, relawan, petugas lokal disampaikan segera ke BPBD kab/kota; Pusdalops melakukan pengecekan segera; hasilnya masukan kaji cepat TRC PB. Tidak ada angka tenggat. |
| Kaji cepat | Juklak 3/2022 | Teks TIDAK ada di korpus (`sumber_teks: tidak ada`). Angka 24 jam (mulai, bergerak, kaji awal) dan 72 jam (lanjutan) dikutip dari `jam_aturan.json` (hal. 7, 8, 16), tidak dibaca ulang. |
| SK status darurat | Perban 4/2024 Pasal 9 ayat 2 (hal. 6) | Dokumen kejadian bencana untuk usulan hibah terdiri atas keputusan penetapan status keadaan darurat dan laporan kejadian bencana yang ditandatangani Kepala BPBD. |
| Dana Siap Pakai | Perban 4/2020 Pasal 4 (hal. 6) | Laporan kejadian dari BPBD ke BNPB paling lambat 3 hari sejak kejadian, atau segera setelah kondisi memungkinkan. |
| Dana Siap Pakai | Perban 4/2020 Pasal 19 ayat 2 (hal. 15), Pasal 21 (hal. 16) | Bukti pengembalian sisa dana tanggal 5 bulan berikutnya; laporan perkembangan tanggal 5 tiap bulan berikutnya; pertanggungjawaban paling lambat 3 bulan setelah status darurat berakhir. |
| Jitupasna | Perban 5/2017 Pasal 9 ayat 5 (hal. 9) | Hasil Jitupasna adalah masukan utama penyusunan Rencana Rehabilitasi dan Rekonstruksi. |
| R3P | Perban 5/2017 Pasal 2 ayat 2-3 (hal. 4) | Penyusunan paling lama 90 hari, dimulai saat tanggap darurat. |
| Hibah RR | Perban 4/2024 Pasal 7 (hal. 5) | Sembilan tahap: pengusulan, penilaian, usulan rincian alokasi, penetapan alokasi, penyaluran, penganggaran, pelaksanaan, pelaporan, penyetoran sisa dana. |
| Hibah RR | Perban 4/2024 Pasal 9 dan 11 (hal. 6) | Usulan wajib melampirkan dokumen kejadian (SK status dan laporan kejadian), dan dokumen Rencana RR. Usulan kabupaten/kota wajib berrekomendasi gubernur. |

Kosong yang jujur: tidak ada pasal yang mengikat "posko" atau "logistik" ke tenggat angka dalam dokumen yang dibaca. Yang ada hanya ambang internal `logistik_setuju_jam` (24 jam) dan `rehab_macet_hari` (60 hari), keduanya `asumsi: true` di Jam Aturan.

## 2. Kalender Kewajiban

| Kewajiban | Dasar | Angka |
| --- | --- | --- |
| Laporan berkala hibah RR | Perban 4/2024 Pasal 28 ayat 2 (hal. 11); Juklak 9/2024 hal. 9 | Tiap 3 bulan sejak SPPH diterbitkan, paling lama 15 hari kalender setelah berakhirnya setiap tahapan. Tahap I memuat bulan ke-1 sampai ke-3, dan seterusnya sampai Tahap VIII (bulan ke-22 sampai ke-24) (Juklak 9/2024 hal. 9-10). |
| Laporan akhir hibah RR | Perban 4/2024 Pasal 28 ayat 3 (hal. 11); Juklak 9/2024 hal. 11 | Paling lama 60 hari kalender sejak berakhirnya masa pelaksanaan; disertai hasil reviu APIP daerah (ayat 4). |
| Setor sisa dana hibah RR | Perban 4/2024 Pasal 29 ayat 2 (hal. 12); Juklak 9/2024 hal. 12 | Paling lama 120 hari kalender sejak berakhirnya batas waktu pelaksanaan. Bukti setor yang belum bisa dilampirkan pada laporan akhir disampaikan terpisah paling lambat 3 hari kalender setelah batas setor (Juklak 9/2024 hal. 12). Bila lewat, BNPB tidak memprioritaskan usulan rincian alokasi tahun berikutnya (Pasal 29 ayat 5). |
| Ubah RKA hibah | Perban 4/2024 Pasal 26 ayat 3 (hal. 11) | Paling lama 6 bulan sejak PHD ditetapkan. |
| Teguran laporan terlambat | Perban 4/2024 Pasal 28 ayat 5-6 (hal. 11-12) | BNPB memberi teguran tertulis; bila tetap tidak melapor, BNPB dapat berkoordinasi dengan lembaga pengawasan untuk audit. |
| Peninjauan RPBD | Perban 3/2026 Pasal 44 ayat 1 (hal. 17) | Berkala setiap 2 tahun, atau sewaktu-waktu bila terjadi bencana. |
| Pemantauan-evaluasi RPBD | Perban 3/2026 Pasal 47 ayat 2, 4, 5 (hal. 18) | Paling sedikit 1 kali setahun, dikoordinasikan Kepala BPBD; laporan ke Kepala Daerah dan Kepala BNPB, kabupaten/kota melalui Gubernur. |
| Perubahan RPBD | Perban 3/2026 Pasal 45 ayat 2 (hal. 17) | Hanya bila sisa masa berlaku RPBD paling sedikit 3 tahun. Masa berlaku RPBD (berapa tahun) tidak ditemukan sebagai angka; Pasal 49 hanya menyatakan RPBD lama berlaku sampai berakhir. |
| Penilaian Destana | Perban 7/2025 Pasal 14 ayat 1, 4, 5 (hal. 7) | "Dapat dilakukan", mandiri oleh desa/kelurahan, paling sedikit setiap 3 tahun. |
| Evaluasi Destana | Perban 7/2025 Pasal 19 ayat 2, 4 (hal. 8) | Minimal 1 kali setahun; laporan disampaikan pejabat pimpinan tinggi madya bidang pencegahan kepada Kepala BNPB (bukan BPBD). |
| Laporan pelatihan | Perban 2/2025 Pasal 14 ayat 3-4 (hal. 6), Pasal 17 ayat 1 (hal. 7) | Paling lambat 7 hari kerja setelah pelatihan berakhir, oleh penyelenggara kepada Kepala Pusdiklat PB. |

Sudah ada di Jam Aturan (tidak ditambah): `hibah_rr_lapor` (3 bulan, belum memuat angka 15), `rpbd_monev`, `destana_penilaian`, `destana_evaluasi`, `laporan_pelatihan`, `dsp_*`, `renkon_*`. Belum ada, perlu kunci baru: batas 15 hari tiap tahap, laporan akhir 60 hari, setor sisa 120 hari, bukti setor 3 hari, ubah RKA 6 bulan, peninjauan RPBD 2 tahun.

Aplikasi resmi sudah ada: pelaporan hibah RR lewat aplikasi E-Pelaporan BNPB (Juklak 9/2024 hal. 9-11). Kalender di sini tidak menggantikannya.

## 3. Rapor SPM

Rujukan umum keempat Juklak: Permendagri 59/2021 tentang penerapan SPM (Juklak 5/2026 hal. 1).

| Juklak | Yang terukur | Letak |
| --- | --- | --- |
| 6/2026 Pencarian, Pertolongan, Evakuasi | Waktu respons paling lama 25 menit sejak informasi/laporan diterima sampai unit siap diberangkatkan; waktu tempuh paling lama 150 menit sejak unit dikerahkan sampai tiba; waktu tempuh ditetapkan tanpa memperhitungkan hambatan cuaca, jalan, keamanan | hal. 8 butir 3b-3c |
| 6/2026 | Operasi dihentikan bila seluruh korban beres, atau 7 hari tanpa tanda korban, atau dinilai tidak efektif; laporan akhir paling lama 14 hari setelah operasi dihentikan, sistematika 11 bagian | hal. 13 |
| 7/2026 Komunikasi, Informasi, Edukasi | Sosialisasi tatap muka setidaknya dua kali setahun di kab/kota risiko tinggi, sekali setahun di risiko sedang | hal. 7 |
| 4/2026 Gladi | Prosedur gladi ruang dan gladi lapang, laporan pelaksanaan. Tidak ada angka frekuensi atau tenggat yang ditemukan (dicari: kali, tahun, paling lama, laporan) | hal. 4-28 |
| 5/2026 Peralatan perlindungan dan kesiapsiagaan | Prosedur pendataan dan penghitungan; kebutuhan mengikuti juklak standar minimal logistik dan peralatan. Tidak ada angka | hal. 4-8 |

Temuan: dari empat Juklak hanya dua indikator berangka yang tegas (25/150 menit dan 2x/1x setahun) ditambah dua tenggat (7 dan 14 hari). Kelas risiko "tinggi/sedang" dan ambang persentase kepatuhan tidak ditetapkan; keduanya menjadi Q9 dan Q11.

## 4. Kode yang dipakai ulang

- `src/logbook.js`: KIB 16 digit (`kibAwal`, `kibBerikut`), `logbook_sk`, `logbook_entri_juklak.posko`, `cariInduk` (pola jawaban sama untuk "tidak ada" dan "di luar wilayah").
- `src/meja.js` dan `src/meja_spek.js`: 11 meja, status bertahap, `bahaya` per baris, `meja_ringkas`, `hitungRapor`, dummy. Relasi yang sudah ada: hanya `rehab.kaji_id` ke `kaji_cepat`; tidak ada kolom kejadian atau KIB di `meja_catatan` (migrasi 0026). Kolom bebas `kejadian` (dsp, kaji_cepat) dan `kejadian_ref` (rehab) berupa teks.
- `public/inti/jam_aturan.js` dan `.json`: 53 kunci; `tenggat(kunci, mulai)`, `hariKerja`, `nilai`. Gerbang `tests/agen/gerbang-jam-aturan.test.mjs` mewajibkan acuan BERLAKU dengan kutipan yang benar-benar ada di pasalnya, atau `asumsi: true` berisi catatan.
- `src/hak.js`: satu-satunya pintu D1 baru.
- `src/logpal.js`: tidak disentuh paket ini.
- Rapor yang ada: `RAPOR` (bobot 35/25/40 sementara, respons terbaik 15 menit terburuk 120 menit) mengukur panggilan Posko perusahaan karhutla (`panggilan.dipanggil_pada` ke `direspons_pada`), BUKAN waktu respons Juklak 6. Keduanya tidak boleh dicampur.

## 5. Tidak ditemukan

Tidak ada tenggat angka untuk: posko, SK status (terbit berapa jam setelah kaji cepat), logistik. Frekuensi gladi (Juklak 4/2026). Kelas risiko kab/kota untuk sosialisasi. Masa berlaku RPBD. Teks Juklak 3/2022 (kaji cepat).
