# KEPUTUSAN-JUKLAK: lima juklak BNPB di Meja Kerja

Dokumen ini menang atas dokumen lain di folder ini. Hanya pemilik yang boleh mengubah bagian "Sudah diputuskan". Pertanyaan terbuka tidak dijawab agent dengan karangan.

## Sudah diputuskan (pemilik, 10 Nov 2026, "Ya, bangun")

- J1. Juklak 9/2023, 3/2022, 5/2025, 16/2025, 17/2025 masuk Meja Kerja lewat satu mesin (`src/meja.js`, spek deklaratif `src/meja_spek.js`). Tidak ada mesin baru.
- J2. `pengungsi`: satu catatan per tempat per hari, agregat, tanpa nama atau NIK.
- J3. `kaji_cepat`: kolom baru opsional, catatan lama tetap sah.
- J4. `pengaduan`: identitas pelapor terpisah dari `data`, tidak ikut rekap, ekspor, atau balasan daftar; akses hanya peran Irtama dan ULP; tidak tampil di layar publik.
- J5. `klaster`: dokumen klaster saja. Stok tetap di LogPal; `KEPUTUSAN-LOGPAL.md` D2, D3, D4 berlaku, Q2 tidak dijawab di sini.
- J6. `risiko`: register per unit dengan ekspor CSV berformat Lampiran I.

## Keputusan teknis agent (boleh diubah pemilik)

- T1. Meja `pengaduan` dan `risiko` milik pusat: wilayah tetap prov `00`, kab `BNPB Pusat`, tidak bisa dipegang petugas berkode (trigger `meja_petugas_sah`).
- T2. `klaster` nasional diisi admin dengan prov `00`, kab `Nasional`. Provinsi dan kab/kota lewat petugas atau admin.
- T3. Meja baru tidak masuk rapor BPBD (bobot rapor belum diuji; tanpa perubahan skor). `pengaduan`, `klaster`, `risiko` keluar dari `/api/meja/ringkas` publik.
- T4. Rekap `pengungsi` memakai catatan terbaru per tempat yang masih berjalan, supaya jumlah tidak berlipat per hari.
- T5. Tenggat pengaduan membaca Jam Aturan yang sudah ada (`pengaduan_berkadar` 20 hari kerja, `pengaduan_tak_berkadar` 15 hari kerja). Sebelum ditelaah dipakai tenggat terpanjang, supaya tanda tidak palsu.
- T6. Isi tanda pengungsi: sektor kebutuhan yang belum tersedia. Tanda "belum diperbarui" butuh pembanding antarcatatan, dicatat di `TIKET.md`.

## Pertanyaan terbuka untuk pemilik

- Q1. Peran `irtama` dan `ulp` belum ada di daftar peran staf. Sampai didaftarkan (`src/staf.js` PERAN, trigger `staf_larik_sah` dan `staf_larik_ubah`, `SEMUA_PERAN` di `src/admin_halaman.js`, `public/admin/pantau.js`, plus cara staf membuka `/admin/meja`), identitas pelapor tidak bisa dicatat atau dibuka siapa pun. Staf mana yang memegang peran ini?
- Q2. Juklak 17/2025 Tabel 3.2 (kriteria kemungkinan) dan Tabel 3.4 (matriks analisis) berupa gambar, tidak terbaca. Skala probabilitas 1 sampai 5 adalah asumsi; level risiko diisi manual, tidak dihitung. Tabel mana yang resmi?
- Q3. Juklak 17/2025 Format 1, 5, 7, 11, 12 dan Lampiran II (daftar kode risiko) tidak punya teks kolom yang terbaca. Kode risiko diisi manual; format lain belum dibangun. Siapa memasok berkas aslinya?
- Q4. Juklak 9/2023 Format 2 merinci sekitar 40 butir kebutuhan per sektor. Meja ini menyimpan Ada/Tidak per enam sektor (sesuai tabel Format 1). Perlu butir rincinya?
- Q5. Status `ditolak` tidak disebut Juklak 5/2025; juklak hanya mengenal diteruskan dan tindak lanjut. Status ini ikut perintah penugasan. Dipertahankan, atau diganti "tidak ditindaklanjuti"?
- Q6. Juklak 5/2025 BAB III huruf B angka 1 huruf c mencatat identitas Terlapor (nama, NIP/NRP, jabatan). Belum dibangun karena Terlapor juga dilindungi (huruf D); `data` hanya memuat unit kerja. Disimpan di tabel terpisah seperti pelapor?
- Q7. Format nomor register tidak ditentukan juklak. Saat ini teks bebas dengan keunikan dijaga D1.
- Q8. Masa simpan identitas pelapor tidak disebut juklak maupun di sini. Berapa lama, dan siapa memusnahkan?
- Q9. Juklak 9/2023 Format 4 menulis "menikah di usia dini (> 19 tahun)" sedangkan Format 2 "kurang dari 19 tahun"; petunjuk Format 2 "anak-anak (5-12 bulan)" sedangkan formulirnya "5-12 Tahun". Meja memakai "di bawah 19 tahun" dan "5-12 tahun". Benar?
