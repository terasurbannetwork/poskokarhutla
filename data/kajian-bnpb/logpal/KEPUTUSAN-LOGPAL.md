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
- D8. Halaman memakai kepala situs navy bersama dan token Centurisk97.

## Keputusan teknis agent (boleh diubah pemilik)

- T1. Rute dan halaman di bawah `/instansi/logpal` dan `/api/instansi/logpal/*`, bukan `/logpal`, karena cookie `sesi_instansi` hanya dikirim ke Path `/instansi` dan `/api/instansi`.
- T2. Peran staf penyetuju sementara `pusdalops`, `koordalops`, `pimpinan` (belum ada peran logistik).
- T3. Pemprov membaca semua gudang provinsinya tetapi menulis hanya gudang miliknya.
- T4. Teks yang diawali `=`, `+`, `-`, `@`, tab, atau CR ditolak server pada kolom teks barang, mutasi, opname, dan dinetralkan di ekspor CSV.
- T5. Data statis publik tinggal wilayah (tanpa kolom gudang dan jam), provinsi, peta provinsi (`public/data/logpal`). Gudang, usulan, rute, jangkauan, teks, dan kebutuhan ada di D1.
- T7. Tanpa sesi, halaman mengarahkan ke `/instansi` (halaman masuk akun instansi). Staf dan admin yang belum masuk membuka `/admin/masuk` sendiri, lalu `/instansi/logpal`.
- T6. Kode provinsi 93 dan 96 di sumber tertukar; salinan publik dibetulkan mengikuti BPS dan geometri peta.

## Pertanyaan terbuka untuk pemilik

- Q2. Peran staf mana yang boleh menyetujui tahap permintaan? Perlu peran baru "logistik"?
- Q4. Rumus standar minimal: versi Juklak BNPB 1/2024 yang ditetapkan belum didapat. Tab Standar masih memakai draf; mana versi resmi yang dipakai dan siapa yang memasoknya?
- Q5. Apakah pemprov boleh menulis gudang milik akun kabupaten di provinsinya?
- Q6. Koreksi stok lewat Ubah barang tidak meninggalkan jejak mutasi. Kunci jumlah di form ubah, atau terima?
- Q7. Nomor migrasi 0112 dan impor data asli dijalankan pemilik di D1 produksi; kapan dan oleh siapa?
- Q8. Data statis nasional (matriks waktu tempuh, kecamatan) dilayani ke semua akun BPBD aktif, termasuk waktu tiba dari gudang di luar hak akun itu (agregat, tanpa nama gudang di tabel tercepat atau peta). Apakah akun BPBD boleh melihat data nasional itu, atau dibatasi ke provinsinya?
- Q9. Status bantuan (rencana atau sudah terkirim) belum dinyatakan pemilik. Layar tidak menyebut terkirim atau diterima. Kolom "Status usulan" memakai flag `belum_usulkan` dari CSV (1 = "Belum mengusulkan", 0 = "Sudah mengusulkan"); apakah 0 memang berarti sudah mengusulkan di e-Prologpal belum dikonfirmasi.
- Q10. Ambang layak berangkat per moda (jarak pandang dan angin untuk pesawat dan helikopter, tinggi gelombang per ukuran kapal): pakai aturan resmi yang mana, atau siapa yang menetapkannya? Sampai dijawab, layar hanya menampilkan status BMKG tanpa vonis (LG-15).
