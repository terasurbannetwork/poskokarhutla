# Ikhtisar layar Operasi

Halaman ini meringkas layar Operasi: siapa yang boleh membukanya, kerangka layar, pemilih periode, dan ringkasan.

## Ringkasan

Menu Operasi di Centurisk97 (`https://centurisk97.id/operasi`) adalah layar kerja Pusdalops dan pimpinan BNPB untuk mengendalikan operasi lapangan. Ia menjawab pertanyaan harian yang sebelumnya tersebar di grup WhatsApp: armada udara mana yang sudah melapor, base mana yang tidak punya armada siap, cluster api mana yang berada di luar jangkauan armada, ke mana armada diusulkan terbang hari ini (renlap), apa hasil tiap aksi water bombing, dan berapa jam kontrak yang sudah terpakai.

Modul ini terdiri dari lima bagian yang saling terkait.

1. **Operasi Udara karhutla.** Pantauan 55 armada di 9 base (patroli, water bombing, modifikasi cuaca), dibangun dari laporan bot WhatsApp satgas udara. Paket dokumen: `data/kajian-bnpb/operasi-udara/`.
2. **Renlap (rencana lapangan) udara.** Usulan target patroli dan water bombing per base, dibuat mesin `scripts/operasi/renlap.py`, dengan unduhan KML, GPX, dan halaman cetak.
3. **Operasi generik semua bencana (Paritas Bencana).** Seksi "Sarana dan fasilitas": titik sarana, renlap generik, hasil tindakan, kepatuhan, dan tangga tindakan untuk banjir, longsor, pesisir, cuaca, gempa, kualitas udara, gunung api, dan kekeringan. Paket: `data/kajian-bnpb/paritas-bencana/`. Kemampuan dinyalakan per bencana lewat registri `public/bencana.json`.
4. **Tindakan lapangan per bencana.** Katalog 23 tindakan yang dicatat per target renlap, dengan persen kemunculannya di logbook Pusdalops 2011 sampai 2026. Paket: `data/kajian-bnpb/tindakan-operasi/`.
5. **Misi Udara.** Mesin flight plan helikopter untuk semua bencana (dropping, pantau, evakuasi, angkut, pencarian, kunjungan). Per 24 November 2026 baru tahap pertama yang berjalan (perintah baris); pemeriksaan zona terbang, penyimpanan, dan layar belum ada. Paket: `data/kajian-bnpb/misi-udara/`.

Pengguna: staf Pusdalops (pengisi dan pembaca utama), koordalops, pimpinan BNPB (pembaca), satgas udara di base, peran `tmc` (modifikasi cuaca), moderator, dan akun instansi BPBD/pemda (untuk isian sarana dan renlap generik di wilayahnya sendiri). Warga tidak punya akses ke modul ini.

Prinsip yang berlaku di seluruh modul (dari `KEPUTUSAN-UDARA.md`, `KEPUTUSAN-MISI.md`, dan `KEPUTUSAN-PARITAS.md`):

- Renlap dan flight plan adalah usulan untuk dilihat, bukan perintah terbang. Keputusan terbang ada pada pilot (PIC) dan komando. Sistem tidak pernah menulis vonis keselamatan.
- Tidak ada data dummy. Nilai yang belum ada tampil sebagai "–" atau "belum ada data", tidak sebagai 0.
- Nama kru, pilot, dan penumpang tidak pernah disimpan.
- Angka antarsumber (sistem Centurisk97, BMKG, laporan operator) ditampilkan berdampingan dan tidak dijumlahkan.
- Angka titik panas, firespot, luas, dan "belum padam" hanya berasal dari sistem Centurisk97 sendiri.

## Membuka layar dan hak akses

Alamat: `https://centurisk97.id/operasi`. Layar ini diberikan oleh `public/index.html` (satu tag skrip memuat `operasi_laporan.js`, `public/index.html:1766`) dan hanya hidup bila data operasi boleh dibaca oleh sesi yang sedang masuk.

Yang boleh membaca data operasi udara (`/api/operasi/peta`, `/nilai`, `/monitor`, `/jejak`, `/foto/:id`), menurut `src/operasi_udara.js:12`, `src/operasi_udara.js:20`:

- akun gerbang Centurisk97 atau moderator (`adminOK`);
- staf berperan `udara`, `pusdalops`, `koordalops`, `pimpinan`, atau `tmc`;
- pemirsa Pusdalops (pimpinan baca saja, `pemirsaLihat` di `src/staf.js:62`).

Tamu mendapat HTTP 403 dan tab Operasi tidak muncul. Staf nyata tidak melihat baris dummy yang tersisa dari masa uji.

Yang boleh menulis isian manual operasi udara: staf berperan `pusdalops` atau moderator ber-`ADMIN_TOKEN`. Akun gerbang pimpinan tidak boleh menulis (`src/operasi_isian.js:12`).

## Kerangka layar

Layar punya dua bagian di deret atas: **Udara** dan **Darat**. Di sisi kiri ada panel seksi yang lebarnya bisa ditarik (pegangan di tepi panel). Seksi bagian Udara (`public/operasi_laporan.js:58`):

| Kelompok | Seksi |
| --- | --- |
| Hari ini | Ringkasan, Tindak lanjut, Base dan armada, Peta operasi, Peluang semai, Renlap dan sortie |
| Kinerja | Tren 30 hari, Efektivitas, Operator, Dokumentasi foto (termasuk Jejak ADS-B) |
| Kontrak | Kontrak 2026, Modifikasi cuaca (termasuk OMC resmi BMKG aktif) |
| Sarana dan fasilitas | muncul otomatis hanya bila registri menyalakan operasi generik untuk minimal satu bencana selain karhutla (`public/operasi_laporan.js:63`) |

Setiap kartu berkepala nama seksi bernuansa terang dengan pil ikon kategori, bisa dilipat, dan pilihan buka atau tutupnya diingat di peramban (`localStorage`, hanya kenyamanan). Kartu mengikuti standar kartu laporan (`AGENTS.md` 3.5): tanpa kalimat kesimpulan dan tanpa kaki sumber; definisi kolom ada di tooltip kepala tabel.

## Pemilih periode

Cara pakai:

1. Pilih jenis periode di deret atas: **Hari**, **Minggu**, **Bulan**, **Rentang**, atau **12 Bulan** (`public/operasi_laporan.js:267`).
2. Untuk **Hari**: gunakan tombol Kemarin dan Besok, kalender, atau strip Senin sampai Minggu pekan itu. Tanggal sebelum 1 Juli 2026 dan sesudah hari ini dinonaktifkan (`TGL_MIN`, `public/operasi_laporan.js:261`).
3. Untuk **Rentang**: pilih dari atau sampai lewat kalender, atau salah satu pilihan cepat (7, 14, 31 hari terakhir, bulan ini, bulan lalu).
4. Seluruh laporan berganti sesuai periode. Seksi Peluang semai tidak mengikuti pemilih tanggal.

Hal yang sering disalahpahami: kartu yang bersifat keadaan (status armada, kelayakan terbang, renlap) hanya bermakna untuk satu hari. Untuk periode lebih panjang, aturan yang dipakai belum diputuskan pemilik (lihat Q13 di bagian terakhir; bawaan sementara: tampilkan hari terakhir periode). Rencana tindakan hanya dihitung untuk periode **Hari** (`D.pm !== "hari"` mengembalikan kosong, `public/operasi_laporan.js:496` dan `:536`).

## Ringkasan dan "Perlu tindakan"

Seksi Ringkasan menampilkan papan base (satu kartu per base: jumlah armada, yang siap, cuaca terbang, cluster api dalam jangkauan, target renlap yang sudah didatangi), lalu daftar **Perlu tindakan**. Butir Perlu tindakan dihitung langsung dari data layar, tanpa penyimpanan baru (`public/operasi_laporan.js:495`):

1. **Base belum lapor gelar armada.** Muncul pada hari ini bila base punya armada, belum ada satu pun armadanya yang berstatus, dan jam setempat sudah 07.30 atau lebih. Base Banjarmasin (BDJ) memakai jam WITA (selisih +1 jam dari WIB); semua base lain dihitung WIB (`ZONA_BASE`, `public/operasi_laporan.js:445`).
2. **Cluster prioritas di luar jangkauan armada.** Cluster berlevel 3 ke atas yang tidak berada dalam radius jelajah base mana pun yang punya armada siap (atau belum melapor).
3. **Base berapi prioritas dengan cuaca belum layak terbang.**
4. **Armada tidak siap.**
5. **Target renlap belum didatangi**, hanya setelah pukul 12.00 WIB pada hari ini.
6. **Data belum lengkap**: sortie water bombing tanpa laporan hasil, armada tanpa tipe, armada tanpa base, temuan pilot tanpa kabupaten (`public/operasi_laporan.js:523`).

Klik sebuah butir untuk melompat ke base, armada, peta, atau seksi yang relevan. Butir hilang sendiri begitu datanya terisi.

Arti warna: butir bertanda **telat** (merah) berarti tenggatnya sudah lewat; butir lain berwarna oranye.
