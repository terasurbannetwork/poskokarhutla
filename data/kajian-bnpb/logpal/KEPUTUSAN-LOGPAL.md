# KEPUTUSAN-LOGPAL: Inventori LogPal (`/instansi/logpal`)

Dokumen ini menang atas dokumen lain di folder ini. Hanya pemilik yang boleh mengubah bagian "Sudah diputuskan". Pertanyaan terbuka tidak boleh dijawab agent dengan karangan: berhenti dan tanya pemilik.

## Sudah diputuskan (permintaan pemilik, 9 Nov 2026)

- D1. Aplikasi Inventori LogPal dipindah menjadi modul situs ini, dengan akun per BPBD (akun instansi pemprov, pemkab, pemkot yang sudah ada).
- D2. Akun instansi hanya membaca dan mengubah gudang di cakupannya sendiri. Staf BNPB membaca semua, mengelola gudang BNPB, dan memproses tahap permintaan. BPBD hanya mengajukan permintaan dan melihat permintaannya sendiri.
- D3. Perubahan stok karena mutasi dan opname terjadi di server dalam satu transaksi D1 dan ditolak bila stok kurang.
- D4. Data gudang asli tidak boleh masuk repo (repo publik). Impor lewat skrip lokal yang menulis SQL ke luar repo; pemilik menjalankan SQL itu sendiri.
- D5. Dummy mengikuti `~/.claude/DUMMY.md`: dua ikon, Super Admin saja, isinya ditentukan halaman.
- D6. QR barang berisi URL situs dengan hash `#q-<gudang>-<barang>`.
- D7. Halaman LogPal wajib login (keputusan pemilik, 9 Nov 2026). Tidak masuk daftar putih `PUBLIK_TANPA_SESI`. Layar disajikan di `/instansi/logpal` hanya untuk sesi sah (akun instansi aktif jenis pemprov, pemkab, pemkot; staf berperan; admin); tanpa sesi 303 ke `/instansi`. `gudang.csv`, `usulan.csv`, `rute.csv` (memuat titik gudang) dan kolom nama gudang dan jam di `wilayah.csv` bukan aset publik dan tidak di repo.
- D9. Data statis gudang disimpan di D1 (tabel `logpal_statis`), diisi lewat SQL keluaran `scripts/logpal/impor.mjs` dari CSV di luar repo, dan disajikan lewat `GET /api/instansi/logpal/statis?nama=gudang|usulan|rute|jangkauan|teks` dengan sesi sah. JS, CSS, dan HTML halaman hanya untuk sesi sah (`run_worker_first` mencakup `/logpal/*`). Tidak ada nama gudang asli di `public/` dan `src/`; uji memeriksanya.
- D10. Tab "Pengantaran" (rencana kirim per kecamatan) pindah dari halaman uji ke modul ini (permintaan pemilik, 9 Nov 2026), wajib login seperti tab lain. Matriks waktu tempuh, kecamatan, dan terdampak staf memuat koordinat gudang, jadi disimpan di D1 (`logpal_statis_potong`, migrasi 0113) dan dilayani `GET /api/instansi/logpal/statis?nama=matriks|kecamatan|terdampak` dengan sesi sah, tidak pernah aset publik dan tidak di repo. Dimuat sekali saat tab pertama dibuka. Stok rencana diambil dari gudang yang dikembalikan `/api/instansi/logpal/data` untuk akun itu (tidak ada rute baru yang membuka stok di luar hak); halaman menulis bahwa stok dihitung dari gudang yang boleh dilihat akun ini. Daftar kab/kota sudah banjir dari berkas publik `/banjir/data/terdampak.json` dengan ambang 14 hari seperti `TDm.tayang`; jiwa dan kecamatan dari `terdampak` statis bila cocok, selain itu pengguna mengisi sendiri. Pemakaian pangkalan TNI tertulis perlu izin TNI AU.
- D11. Tab "Bantuan" (permintaan pemilik, 9 Nov 2026): bantuan peralatan dan logistik per BPBD per tahun (2025, 2026) untuk tujuh provinsi, tabel `logpal_bantuan` (migrasi 0115). Wajib login seperti tab lain, hanya baca (tidak ada rute tulis), terpisah dari stok gudang: tidak menyentuh `logpal_barang` atau `logpal_mutasi`. Hak baca mengikuti D2: staf semua, akun pemprov provinsinya, akun pemkab/pemkot hanya wilayahnya. Diisi lewat SQL keluaran `scripts/logpal/impor.mjs --bantuan <csv>` (D4: CSV dan SQL tetap di luar repo). Layar menyebutnya "Bantuan peralatan dan logistik", tidak memakai kata terkirim, diterima, atau stok.
- D12. Cuaca bandara dan pelabuhan BMKG dipakai untuk pengantaran bantuan (pemilik, 10 Nov 2026, tiket LG-14). Masuk tab Pengantaran yang sudah ada, tidak membuat tab baru dan tidak menyentuh stok.
- D13. Fitur "LogPal Siap Audit" dibangun (permintaan pemilik, 10 Nov 2026): kartu persediaan, BAST dan SPPB bernomor, laporan pertanggungjawaban baku, jadwal pemeliharaan alat, dan kesenjangan stok terhadap standar. Dasarnya Perka 4/2010, 20/2011, 21/2011, 23/2014, 24/2014, 25/2014, 26/2014, dan 7/2013 (tabel di "Dasar hukum Siap Audit" di bawah). D1 sampai D12 tetap berlaku dan Q2 sampai Q10 tidak dijawab di sini. Tidak termasuk (ditunda pemilik): dasar hukum di tiap keputusan, Keadaan Tertentu, penjaga status peraturan.
- D8. Halaman memakai kepala situs navy bersama dan token Centurisk97.

## Keputusan teknis agent (boleh diubah pemilik)

- T1. Rute dan halaman di bawah `/instansi/logpal` dan `/api/instansi/logpal/*`, bukan `/logpal`, karena cookie `sesi_instansi` hanya dikirim ke Path `/instansi` dan `/api/instansi`.
- T2. Peran staf penyetuju sementara `pusdalops`, `koordalops`, `pimpinan` (belum ada peran logistik).
- T3. Pemprov membaca semua gudang provinsinya tetapi menulis hanya gudang miliknya.
- T4. Teks yang diawali `=`, `+`, `-`, `@`, tab, atau CR ditolak server pada kolom teks barang, mutasi, opname, dan dinetralkan di ekspor CSV.
- T5. Data statis publik tinggal wilayah (tanpa kolom gudang dan jam), provinsi, peta provinsi (`public/data/logpal`). Gudang, usulan, rute, jangkauan, teks, dan kebutuhan ada di D1.
- T7. Tanpa sesi, halaman mengarahkan ke `/instansi` (halaman masuk akun instansi). Staf dan admin yang belum masuk membuka `/admin/masuk` sendiri, lalu `/instansi/logpal`.
- T6. Kode provinsi 93 dan 96 di sumber tertukar; salinan publik dibetulkan mengikuti BPS dan geometri peta.
- T8. Dokumen siap audit adalah turunan dari data yang sudah ada (`logpal_barang`, `logpal_mutasi`, `logpal_opname`, `logpal_permintaan`, `logpal_tahap`). Tabel baru hanya dua: nomor dokumen BAST/SPPB dan interval pemeliharaan per jenis alat.
- T9. Kartu persediaan dihitung dari `logpal_mutasi` menurut tanggal. Selisih antara saldo hasil hitung dan `jumlah` tercatat (akibat Ubah barang, Q6) ditampilkan sebagai "koreksi tanpa jejak", tidak disembunyikan dan tidak dipaksa cocok.
- T10. BAST dan SPPB dicetak, bernomor urut per gudang per tahun, ditandatangani basah. Sistem mencatat nomor, tanggal, dan jabatan penandatangan menurut Perka 25/2014, bukan tanda tangan elektronik.
- T11. Kesenjangan stok = standar minimal (Perka 23/2014 Pasal 11-14) dikurangi stok baik. Selama Q4 dan Q13 belum dijawab, kartu kesenjangan hanya menulis "menunggu rumus resmi" dan tab Standar tetap memakai draf.
- T12. Akses D1 baru hanya di `src/hak.js`. `src/logpal.js` berplafon di `tests/agen/fixtures/d1-sisa.json` dan hanya boleh turun; rute baru ditaruh di berkas baru (`src/logpal_audit.js`) dan memanggil `hak.js`.
- T13. Semua rute baru tetap di bawah `/api/instansi/logpal/*`, wajib sesi sah (D7), dan mengikuti hak D2 dan T3. Dummy dan data asli mengikuti D4 dan D5.

## Dasar hukum Siap Audit (dibaca dari teks penuh, 10 Nov 2026)

| Peraturan | Letak | Isi yang dipakai |
| --- | --- | --- |
| Perka 4/2010 Pedoman Akuntansi Persediaan di Lingkungan BNPB | Bab II A butir 2 (hal. 9); format Buku Persediaan (hal. 10); hal. 16 | Persediaan dicatat dalam Buku Persediaan (kartu) per jenis barang; buku diisi tiap mutasi (pembelian, hibah, penggunaan); inventarisasi tiap akhir tahun; Laporan Persediaan tiap semester berdasarkan opname fisik, memuat jumlah rusak atau usang. Berlaku untuk unit akuntansi BMN BNPB (UAKPB). |
| Perka 20/2011 Monev Manajemen Logistik | Bab II C (hal. 13); Bab III C (hal. 16); pergudangan (hal. 12); hal. 19 | Laporan pertanggungjawaban berformat (formulir 5.4) ke Kepala BNPB melalui Deputi Logistik dan Peralatan "setiap akhir bulan atau selambat-lambatnya setiap 3 (tiga) bulan"; monev per 3 bulan tanpa bencana, pada atau selesai tanggap darurat saat bencana; pergudangan memakai "first-in/expired first-out"; Berita Acara Serah Terima jadi bukti pendistribusian dan pengeluaran. |
| Perka 21/2011 Monev Manajemen Peralatan | hal. 13, 16, 19 | Sama dengan Perka 20/2011 untuk peralatan: laporan akhir bulan atau paling lama 3 bulan; monev per 3 bulan; setelah tanggap darurat paling lambat 3 bulan. |
| Perka 23/2014 Standarisasi Logistik | Pasal 1 angka 15 (hal. 4); Pasal 10-14 (hal. 7-8) | Persediaan minimal = kebutuhan 72 jam pertama. Paket pangan = penduduk x prosentase x hari; paket sandang dan papan = penduduk x prosentase x hari / 4 jiwa. Penduduk = data BPS terakhir. Prosentase 1% (umum, Pasal 12 ayat 2) atau 4% (khusus, Pasal 14 ayat 2-3, mengacu Peta Index Rawan Bencana); keduanya berlabel asumsi korban per tahun. |
| Perka 24/2014 Pedoman Bantuan Logistik (perubahan Perka 4/2009) | Pasal 1 angka 9, 10 (hal. 3); angka 15 (hal. 4) | Definisi standardisasi logistik, persediaan logistik minimal 72 jam, standar persediaan. Pasal 11-14 (hal. 6-7) mengatur permintaan dan pengadaan, BUKAN standar persediaan; `docs/bnpb/PETA-PERATURAN.md` menunjuknya sebagai standar, rumus ada di Perka 23/2014. |
| Perka 25/2014 Pertanggungjawaban Bantuan Logistik | Lampiran Bab IV (hal. 11-12) | Dokumen pertanggungjawaban: tabel perhitungan menurut standar minimal, SPPB, BAST, surat jalan kepala gudang, pernyataan status darurat, laporan kejadian, telaahan. Penandatangan BAST: Sekretaris Utama BNPB dan Kepala Pelaksana BPBD (BNPB ke BPBD); Kepala Pelaksana BPBD dan penerima (dari BPBD); Komandan Posko (dari Posko ke penerima). |
| Perka 26/2014 Pemanfaatan Bantuan Logistik | Bab II B butir 1 (hal. 9-10) | Pangan boleh dimanfaatkan pra bencana bila mendekati kedaluwarsa, 2 bulan sebelumnya; non pangan yang berubah spesifikasi segera dimanfaatkan seizin BNPB; pengajuan disertai data persediaan. Logistik BNPB bersifat stimulan (hal. 6). |
| Perka 7/2013 Penggunaan dan Pemeliharaan Peralatan | hal. 70-74, 89-91 | Interval pemeliharaan berbeda per jenis alat, tidak ada satu angka seragam: tenda dijemur bila 3 bulan tidak dipakai (hal. 89), velbed 2 bulan (hal. 90), generator ganti oli tiap bulan atau 20 jam, filter bahan bakar tiap 6 bulan, filter oli 1000 jam (hal. 91), alat hidrolik dibersihkan tiap minggu (hal. 70-74). |

Tidak ditemukan: angka "Hari" untuk rumus Perka 23/2014 (hanya definisi 72 jam), kriteria daerah "khusus", ketentuan kartu persediaan untuk gudang BPBD (BMD), dan teks Juklak 1/2024 (Q4).

## Pertanyaan terbuka untuk pemilik

- Q2. Peran staf mana yang boleh menyetujui tahap permintaan? Perlu peran baru "logistik"?
- Q4. Rumus standar minimal: versi Juklak BNPB 1/2024 yang ditetapkan belum didapat. Tab Standar masih memakai draf; mana versi resmi yang dipakai dan siapa yang memasoknya?
- Q5. Apakah pemprov boleh menulis gudang milik akun kabupaten di provinsinya?
- Q6. Koreksi stok lewat Ubah barang tidak meninggalkan jejak mutasi. Kunci jumlah di form ubah, atau terima?
- Q7. Nomor migrasi 0112 dan impor data asli dijalankan pemilik di D1 produksi; kapan dan oleh siapa?
- Q8. Data statis nasional (matriks waktu tempuh, kecamatan) dilayani ke semua akun BPBD aktif, termasuk waktu tiba dari gudang di luar hak akun itu (agregat, tanpa nama gudang di tabel tercepat atau peta). Apakah akun BPBD boleh melihat data nasional itu, atau dibatasi ke provinsinya?
- Q9. Status bantuan (rencana atau sudah terkirim) belum dinyatakan pemilik. Layar tidak menyebut terkirim atau diterima. Kolom "Status usulan" memakai flag `belum_usulkan` dari CSV (1 = "Belum mengusulkan", 0 = "Sudah mengusulkan"); apakah 0 memang berarti sudah mengusulkan di e-Prologpal belum dikonfirmasi.
- Q10. Ambang layak berangkat per moda (jarak pandang dan angin untuk pesawat dan helikopter, tinggi gelombang per ukuran kapal): pakai aturan resmi yang mana, atau siapa yang menetapkannya? Sampai dijawab, layar hanya menampilkan status BMKG tanpa vonis (LG-15).
- Q11. Perka 4/2010 berjudul "di Lingkungan BNPB" dan menyebut unit akuntansi BMN (UAKPB). Apakah kartu persediaan dan Laporan Persediaan semester juga dipakai untuk gudang BPBD (barang milik daerah), atau BPBD memakai aturan daerah yang tidak ada di korpus kita? (LG-16, LG-19)
- Q12. Laporan pertanggungjawaban logistik (Perka 20/2011 hal. 13) jatuh "setiap akhir bulan atau selambat-lambatnya setiap 3 (tiga) bulan": bulanan, atau triwulan sebagai batas? (LG-18)
- Q13. Perka 23/2014 tidak menulis angka "hari" untuk rumus buffer stock (hanya definisi 72 jam) dan tidak menetapkan kriteria daerah "khusus" (4%) dibanding "umum" (1%). Pakai hari = 3 dan kriteria apa? Terkait Q4. (LG-21)
- Q14. BAST dan SPPB: penomoran urut per gudang per tahun diterima? Perlu pindaian dokumen bertanda tangan diunggah (penyimpanan R2, kebijakan retensi), atau cukup nomor, tanggal, dan jabatan penandatangan? (LG-17)
- Q15. Perka 20/2011 hal. 12 menyebut "first-in/expired first-out", sedangkan stok sekarang satu tanggal kedaluwarsa per baris barang, bukan per batch. FEFO per batch (LG-10) disetujui dulu, atau kartu persediaan v1 tanpa batch? (LG-16)
- Q16. Interval pemeliharaan Perka 7/2013 berbeda per jenis alat (hal. 70-91). Jenis alat mana yang masuk tahap awal, dan siapa menyalin tabel intervalnya dari lampiran? (LG-20)
- Q17. Kartu persediaan bertumpu pada riwayat mutasi, sedangkan Ubah barang mengubah jumlah tanpa mutasi (Q6). Q6 dijawab sebelum kartu dianggap bukti audit, atau kartu tampil dengan penanda "koreksi tanpa jejak" saja? (LG-16)
