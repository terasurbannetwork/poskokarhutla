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
