# Batasan dan pertanyaan terbuka

Halaman ini mencatat batasan Ruang BNPB dan pertanyaan yang belum diputuskan.

## Batasan dan pertanyaan terbuka

Perbedaan antara dokumen paket dan kode (kode menang):

- Akses InaRISK. `KEPUTUSAN-INARISK.md` Q2 menetapkan bawaan sementara halaman terbuka tanpa login. Di kode `/bnpb/inarisk` tidak ada di `PUBLIK_TANPA_SESI`, sehingga di centurisk97.id halaman ini perlu masuk. Perlu diputuskan pemilik mana yang benar.
- Alun-alun Terpadu. Hanya migrasi 0150 dan gerbang uji yang ada. Tiket AT-03 sampai AT-12 (kabupaten baku, kotak masuk `/instansi`, balasan lembaga, status bantuan, tautan kejadian, rekap, kartu pimpinan) belum dikerjakan. Forum yang berjalan masih memakai kolom kabupaten teks bebas dan label lembaga PM-15 pada semua kiriman pemilik nomor akun; dokumen D7 mengusulkan label hanya untuk balasan lembaga.
- Laporan Berkala. Seluruh tiket LB-00 sampai LB-13 berstatus belum. Tidak ada `scripts/berkala/`, tidak ada tabel `laporan_berkala`, dan `/laporan-bnpb` hanya punya jenis harian dan presiden. Pengerja bayangan dalam dokumen tetap `pipa-data`, `layar-peta`, dan `warga-api`.
- Ruang Unit. Hanya `skor.py` dan `jalan.py` (daftar `LANGKAH` kosong). `KEPUTUSAN-UNIT.md` belum ada, jadi pertanyaan pemilik di `KEPUTUSAN-AWAL.md` bagian 7 belum diputuskan. Tiket RU-014 sampai RU-029 dicatat belum meskipun `skor.py` sudah ada; status di TIKET tertinggal dari kode.
- Silang sumber F5. `ALGORITMA.md` menyebut hitungan 7 hari dari BMKG ditambah USGS tanpa dobel dan koreksi Mc; kode menghitung N dari USGS saja dan memakai baseline historis M 4,5 ke atas tanpa Mc. Cacah BMKG hanya informasi terpisah.
- Silang sumber F6. Dokumen menyebut `kecil` bila total setahun kurang dari 5; kode juga menandai kecil bila sel hanya ada di dua tahun atau kurang atau n kurang dari 3, dan mengosongkan `p`.
- Rapor sumber F1. Dokumen menyebut unit nasional dan provinsi, kabupaten bila a + c sedikitnya 30; kode hanya membuat sel nasional dan provinsi. Hitungan `n_kurang` memakai jumlah hari kalender berkejadian untuk nasional dan a + c untuk provinsi.
- Cek kabar luar. Kode menambah jenis gunung api (berkas `berita_gunungapi.json`, sinyal level PVMBG, batas senyap 30 hari) yang tidak ada di `ALGORITMA.md`; jenis ini tidak punya ambang hari. Rapor ketepatan CK-07 belum ada, jadi akurasi label tidak dapat dinilai.
- Aturan penamaan level. Nama untuk level terendah di `NAMA_LEVEL` (`public/bnpb/dalops_hitung.js:7`) memakai kata yang melanggar aturan pemilik bahwa layar tidak boleh menyatakan suatu wilayah bebas dari bahaya; belum diganti.

Keterbatasan data dan model:

- Logbook Dalops hanya mencakup kejadian yang dicatat piket dan WA Koordalops; hitung ulang kejadian "belum dilaporkan selesai" tidak menjamin kejadian masih berlangsung. Hanya 6 dari 187 kejadian Dalops pada 24 November 2026 yang bisa diberi titik dari nama desa.
- DIBI telat lapor, sehingga b terlalu besar dan c terlalu kecil pada rapor sumber. Arsip rapor dan beda sumber baru berumur 45 hari (BMKG sepekan) dan 10 hari (prospektif), jadi belum ada persen sama sekali.
- Indeks risiko kecamatan, risiko HvC kabupaten, kebutuhan musim, kebakaran permukiman, perencanaan, prioritas, simulasi kapasitas IKD, ambang cek kabar luar, beda sumber, dan gempa beruntun semuanya HIPOTESIS atau belum diuji balik. Uji yang sudah ada gagal untuk risiko HvC dan kebakaran permukiman, dan IRBI kalah dari persistensi.
- Raster kapasitas InaRISK bukan IKD resmi (310 lawan 225 kab rendah). Rumus IKD dari tujuh prioritas adalah hasil regresi, bukan rumus resmi.
- Nilai tarif dan koefisien kebutuhan musim adalah asumsi kerja.
- ACEBS (8.755 titik) tidak dicermin: kode desa hanya 85,6 persen jatuh di poligon kab yang sama, di bawah ambang 95 persen.

Pertanyaan pemilik yang belum diputuskan (bawaan sementara di dalam kurung):

- Cek kabar luar: Q1 ambang hari tanpa bukti (banjir 3, longsor 7, karhutla 3, kekeringan 14), Q2 umpan berita kebakaran permukiman (belum ditambah), Q3 sumber selain berita (hanya berita dan data alam), Q4 teks tombol WA, Q5 pemirsa boleh melihat label (ya), Q6 nasib label bila ketepatan rendah (diputuskan saat rapor CK-07 keluar).
- Log tindak lanjut: Q1 daftar status (belum, proses, selesai), Q2 pimpinan hanya melihat, Q3 nama pengisi tampil, Q4 langkah selesai tidak dibuka lagi otomatis, Q5 hanya banjir, Q6 tanpa bukti foto.
- InaRISK: Q1 penduduk per jenis kelamin (tidak ditampilkan), Q2 akses tanpa login (bawaan terbuka, kode berbeda), Q3 DAS pencegahan dan delapan dashboard lain (menunggu), Q4 STEP-A dan portal (dilewati), Q5 teks bebas Lapor Kegiatan (tetap tampil karena sudah publik di sumber).
- Silang sumber: Q2 sasaran sesar untuk gempa beruntun (gunung api dulu), Q3 ambang beda sumber, Q4 pemetaan DIBI untuk gelombang dan angin, Q5 apakah Tangga Peringatan membaca `beda_sumber.json` (tidak dikerjakan), Q6 sumber penduduk, sekolah, faskes per kabupaten pesisir, Q7 tampil berdampingan tanpa skor gabungan, Q8 tanggal mulai arsip.
- Laporan berkala: Q2 sampai Q27, antara lain Q2 tanggal tarik DIBI (staf memilih tanggal bekukan), Q3 pembanding tahun lalu, Q7 foto media, Q8 panen siaran pers, Q10 versi PPTX (PDF saja), Q11 laporan pertama November 2026, Q12 definisi peluang banjir dan longsor, Q22 apakah "semuanya" termasuk publik tanpa masuk (tidak), Q24 definisi minggu (Senin sampai Minggu), Q25 penggantian laporan yang ada (berdampingan).
- Alun-alun Terpadu: Q1 rekap publik (tidak), Q2 mitra berkunci API (tidak), Q3 pemberitahuan WA keluar (tidak), Q4 batas lama tak terjawab (24 jam), Q10 push dan email ke akun pemda, Q11 pemirsa melihat angka (tidak), Q12 masuk laporan berkala (tidak), Q13 balasan atas nama lembaga (ya lewat kotak masuk `/instansi`).
- Juklak Meja Kerja: Q2 tabel kemungkinan dan matriks Juklak 17/2025 yang berupa gambar, Q3 format dan lampiran tanpa teks terbaca, Q4 butir kebutuhan rinci per sektor, Q5 status `ditolak`, Q6 identitas terlapor, Q7 format nomor register, Q8 masa simpan identitas pelapor, Q9 batas usia di Format 2 dan 4. Q1 sudah dijawab: pemegang identitas pelapor adalah staf Inspektorat Utama (peran `irtama`).
- Ruang Unit: pertanyaan U1 sampai U12 di `KEPUTUSAN-AWAL.md` bagian 7 belum dijawab.

Hal yang sengaja tidak tercakup dalam berkas ini: isi Siklus Bencana dan Buku Besar Kejadian, Misi Udara dan Operasi Udara, modul gempa F2 (tsunami per zona) selain disebut sebagai bagian paket Silang sumber, Lapor Bencana (`/lapor`), Kemitraan Kampus, Pendataan, relawan, riset, dan saham selain ringkasan satu baris, serta deck dan dokumen berformat (ppt-konsultan, surat-bnpb).
