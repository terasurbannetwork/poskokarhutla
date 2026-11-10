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
- T7. Meja `dampak` (Data kejadian dan dampak, Juklak 7/2023 Lampiran I, migrasi 0119). Kolom dikelompokkan `bagian`; aturan kelengkapan satu fungsi murni `public/inti/kelengkapan.js` (dipakai peramban dan Worker). Angka 0 terjawab, kosong belum didata; bagian kebutuhan, sosial ekonomi, prasarana, pelayanan dasar, dan aset punya pilihan `nihil_<bagian>` yang menjawab semua butirnya dan menolak isian angka di bagian itu. `rapor:false` dan `publik:false` (tidak masuk rapor BPBD maupun ringkas publik).
- T8. Butir inti = seluruh bagian 1 kecuali dokumentasi, sebaran, dan tanggal ditutup; lima total korban; empat angka rumah; tiap bagian lain minimal satu butir atau nihil. Rincian umur dan jenis kelamin (berlaku bila totalnya lebih dari 0) serta taksiran kerugian per butir (berlaku bila butir induknya lebih dari 0) adalah butir rinci: tampil sebagai kekurangan dan mengurangi persen, tidak menahan verifikasi. Persen = butir terjawab dibagi butir yang berlaku.
- T9. `kecamatan` dan `desa` tetap kolom wilayah catatan (bukan `data`); spek memuatnya sebagai kolom bertipe `wilayah` supaya ikut dihitung inti. Kolom `tgl_tuntas` (tanggal kejadian ditutup) ditambahkan agar tanda `belum_dimutakhirkan` bisa memenuhi syarat "kejadian belum ditutup"; tidak ada di daftar Lampiran I.
- T10. Alur: `dilaporkan` ke `diverifikasi` (petugas; ditolak 400 menyebut semua butir inti yang kurang) ke `masuk_logbook` (moderator atau staf `pusdalops`/`koordalops`). Mengubah isi sesudah diverifikasi atau diterima mengembalikan status ke `dilaporkan` di catatan yang sama (satu kejadian per kabupaten: indeks unik jenis, tanggal, nama). Pasangan `masuk_logbook` ke `diverifikasi` hanya dipakai sistem untuk membatalkan klaim bila tulis Logbook gagal.
- T11. Terima ke Logbook: klaim status dulu (atomik), lalu tulis lewat `buatKejadian`/`lanjutEntri` (validasi Logbook yang sama; `yakin: true` untuk angka di atas batas wajar). Pasangan: jenis, provinsi, kabupaten, dan tanggal mulai (WIB) sama; satu cocok tambah entri, tidak ada buat, lebih dari satu 409 dengan `kandidat` dan boleh kirim `logbook_id`. `logbook_id` dan `logbook_kib` disimpan di data catatan sehingga penerimaan berikutnya jadi pengkinian. Kode BPS kabupaten untuk KIB dicari dari `public/data/bnpb/wilayah.json` (cocok pada nama); bila tak ketemu kejadian tetap diterima tanpa KIB dan jawaban memuat `peringatan`. Kejadian lebih dari 400 hari lalu tidak dibuat di Logbook (422, catatan tetap diverifikasi). Catatan contoh (dummy) tidak pernah diterima.
- T12. Pemetaan ke Logbook: kebutuhan masuk `catatan` entri (teks, maksimal 1000 huruf), bukan `kebutuhan_rinci`; status darurat dan nomor SK tidak dipindahkan (Logbook meminta nomor SK, yang tidak ada di formulir ini). Hanya butir prasarana bernilai lebih dari 0 dikirim (batas 40 butir Logbook; bila semua 43 butir rusak sekaligus, terima ditolak oleh validasi Logbook).
- T13. Staf Pusdalops/Koordalops di meja ini terbatas: baca daftar dampak (disaring ke provinsi wilayahnya), dan hanya pindah ke `masuk_logbook`. Tidak mengisi, tidak mengubah isi, tidak mengimpor. Kelengkapan per kabupaten (`GET /api/meja/kelengkapan`) dibaca admin dan staf itu, disimpan di tabel `meja_kelengkapan` yang dibangun ulang bersama `meja_ringkas` dari baris yang sama (tanpa pemindaian tambahan di cron).
- T14. Impor: `POST /api/meja/impor`, paling banyak 50 baris, 256 KB, dan 8 kabupaten per permintaan, 5 kirim per jam per pelaku (batas CPU dan permintaan ke D1 Free). Terima ke Logbook dibatasi 60 per jam per pelaku. Tautan Logbook tersimpan dipakai hanya bila jenis, kabupaten, dan tanggal mulai masih cocok. Staf Pusdalops di luar wilayahnya mendapat 404. `oleh` dan jejak mentah hanya untuk admin penuh; peran lain melihat label Admin/Petugas. Teks bebas disaring (`teksBersih`: HP, NIK, surel, atas nama, almarhum, RT/RW) termasuk `catatan` transisi, tiap baris lewat `validasi` yang sama, jawaban per baris (`masuk`, `ganda`, `galat`). Baris ganda ditangkap indeks unik (`INSERT OR IGNORE`), bukan dibaca dulu.
- T15. Tanda `belum_dimutakhirkan`: status darurat siaga, tanggap, atau transisi, `tgl_tuntas` kosong, dan `diubah` lebih dari `data_dinamis_darurat` (Jam Aturan, 1 hari, Juklak 7/2023 BAB II huruf A, hal. 3). Dokumen kita menyebut "atau sesuai kesepakatan pos komando"; kesepakatan itu tidak tersimpan di sistem, jadi tanda memakai 1 hari.

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
