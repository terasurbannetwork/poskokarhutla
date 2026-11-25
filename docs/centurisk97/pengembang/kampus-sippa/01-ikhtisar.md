# Ikhtisar kampus, SIPPA, neraca air

Dokumen ini menjelaskan lima bagian Centurisk97 yang berdekatan secara tema (riset, data wilayah, dan peralatan lapangan) tetapi berdiri sendiri secara teknis.

| Bagian | Jalur | Masalah yang dijawab | Pengguna |
| --- | --- | --- | --- |
| Kemitraan Kampus | `/kemitraan` | BNPB dan BPBD butuh riset dan tenaga kampus, tetapi tidak punya daftar masalah daerah yang tersusun, profil daerah yang seragam, dan cara mencocokkan masalah dengan pakar. | Staf BNPB, pimpinan, koordinator kampus, BPBD, tim pendataan |
| Pemetaan relawan | belum punya layar | Peta paparan per bangunan hanya sebaik data bangunannya, dan belum ada ukuran kelengkapan bangunan OpenStreetMap (OSM) per kabupaten/kota. | Staf BNPB, kampus mitra (rencana) |
| Direktori akademisi | `/direktori` (alamat lama `/akademisi`) | Staf perlu mencari pakar, lembaga, inovasi, sistem data, dan pendanaan kebencanaan di satu tempat. | Staf BNPB dan admin |
| SIPPA | `/pipa` | Kit pipa portabel untuk pemadaman karhutla (gambut) dan banjir: di mana kit layak dipakai, apakah rancangan hidrauliknya lolos, kapan kit dipra-posisikan, dan apakah hasil uji lapangan membuktikan manfaatnya. | Staf Pusdalops, Koordalops, pimpinan, regu lapangan |
| Neraca air Jawa | tanpa halaman web | Selisih pasokan dan kebutuhan air per kabupaten/kota di Pulau Jawa per bulan, termasuk skenario kemarau ekstrem. | Penyusun kajian dan deck, modul lain yang membaca berkasnya |

Prinsip yang sama berlaku di semua bagian. Angka selalu membawa sumber dan tanggal. Model atau skor yang belum lulus uji balik ditampilkan sebagai hipotesis dengan pil "Belum diuji". Data yang hilang ditampilkan sebagai kosong atau tanda hubung, tidak pernah sebagai nol. Data pribadi akademisi tidak pernah masuk repositori publik.

Status per 24 November 2026, ringkas:

- Kemitraan Kampus: pipeline data, profil 514 kabupaten/kota, buku cetak, panduan wawancara, akun kampus, dan bank masalah di Worker sudah berjalan. Layar Daerah dan Data lapor sudah terisi. Layar Masalah, Riset, Dana, Satgas, Talenta, Kampus, dan Dasbor masih kerangka kosong ("Tampilan ini belum diisi").
- Pemetaan relawan: pipeline kelengkapan, pembanding, dan pembuat paket proyek sudah ada, begitu juga migrasi `0149`. Belum ada rute Worker, layar, dan berkas keluaran kelengkapan di repositori.
- Direktori akademisi: berjalan, hanya untuk staf.
- SIPPA: layar, Worker, dan pipeline berjalan. Uji lapangan (pilot) dipindah ke Kalimantan Timur (keputusan pemilik 62).
- Neraca air: versi 1 selesai dan berlabel estimasi-model. Sebagian validasi kemarau ekstrem belum lolos (lihat bagian Metode).

## Kemitraan Kampus: halaman utama `/kemitraan`

Jalur: `/kemitraan`. Halamannya sendiri selalu terbuka (tamu melihat layar masuk), tetapi semua data lewat API yang memeriksa hak (`src/kemitraan.js:21`).

Siapa yang boleh memakai, menurut peran yang dikenali sistem:

| Kode | Siapa | Cara masuk |
| --- | --- | --- |
| SA | Super Admin | sesi admin |
| ST | Staf BNPB (moderator ke atas, atau staf berperan `kemitraan`) | sesi admin atau sesi staf |
| PM | Pimpinan (staf berperan `pimpinan`) | sesi staf |
| KK | Koordinator kampus | `/kemitraan/masuk` dengan sandi, sesi 12 jam |
| AG | Anggota kampus (relawan yang tercatat di `km_anggota`) | kode pribadi |
| BP | BPBD atau tim pendataan | kode per kabupaten/kota yang diterbitkan staf |
| PL | Pakar lepas (kode pakar) | kode pribadi |

Tampilan yang tersedia per peran (`public/kemitraan/inti.js:131`): SA, ST, dan PM melihat semua tampilan; KK melihat semua kecuali Dasbor; BP hanya Daerah dan Masalah; AG dan PL tidak punya tampilan di halaman utama.

Langkah pakai:

1. Buka `/kemitraan`. Staf BNPB masuk lewat `/admin/masuk`. Koordinator kampus masuk lewat `/kemitraan/masuk`. BPBD dan anggota membuka tautan yang memuat kodenya di fragmen alamat (`#k=`), sehingga kode tidak masuk log server.
2. Pilih tampilan dari deretan segmen (Daerah, Masalah, Riset, Dana, Satgas, Talenta, Kampus, Dasbor, Data lapor). Panel dimuat sekali dan malas.
3. Di bagian atas ada pita empat angka. Nilai yang belum ada tampil sebagai tanda hubung, bukan nol.

### Tampilan Daerah

Isinya daftar kartu 514 kabupaten/kota dengan saringan provinsi dan bahaya, dan paginasi 24 kartu per halaman (`public/kemitraan/daerah.js`).

1. Saring menurut provinsi dan jenis bahaya, atau cari nama.
2. Tekan kartu untuk membuka lembar profil. Lembar memiliki sembilan bab: Wilayah, Risiko, Bahaya, Riwayat, Paparan, Kapasitas, Masalah, Panduan, dan Kalender (`daerah.js:246`).
3. Bab Masalah memuat masalah otomatis beserta bukti angkanya. Bab Panduan memuat pertanyaan pendataan yang terisi angka profil. Bab Kalender memuat kalender ancaman daerah dari berkas `/data/kalender_ancaman/<kab>.json`.
4. Tombol buku membuka `/kemitraan/buku` (cetak A4). Tombol panduan membuka `/kemitraan/panduan`.

Arti penanda di lembar:

- Pil keyakinan pada sebuah blok: `resmi`, `terverifikasi`, `estimasi-model`, atau `asumsi-kebijakan`. Hanya baris yang berstatus estimasi atau asumsi yang diberi pil sendiri.
- "Tidak ada data untuk wilayah ini": sumber tidak punya data untuk daerah itu. Ini bukan nol.
- "Uji balik nasional: gagal" atau "Belum diuji": vonis model platform untuk bahaya itu. Vonis berlaku untuk seluruh negeri, bukan hasil uji per kabupaten.
- Skor dua desimal. Skor yang jatuh dalam 0,005 dari ambang kelas atau ambang pembuatan masalah tampil tiga desimal supaya "0,50" tidak tampak lolos ambang 0,5.

Hal yang sering disalahpahami:

- Kejadian tahun 2024 per jenis dari DIBI tidak dihitung dalam tren dan total, karena berkas 2024 tidak lengkap dan berisi nol buatan. Total semua jenis dari CKAN memuat 2024 secara lengkap.
- Label tren "jarang" berarti tahun berkejadian kurang dari tiga. Label "datar" pada deret yang hampir nol tidak dipakai.
- Persentase sekolah dan fasilitas kesehatan hanya mencakup 9 provinsi. Di luar itu tertulis kosong, bukan nol.

### Tampilan Data lapor

Tampilan ini mengunduh agregat laporan warga dari Lapor Bencana untuk peneliti dan kampus mitra. Isinya jumlah laporan per kabupaten/kota, jenis bencana, dan minggu ISO (WIB). Tanpa nomor tiket, desa, koordinat, teks, foto, atau identitas pelapor. Sel dengan pelapor berbeda di bawah batas ditulis "<batas" dan rinciannya dikosongkan. Tombol "Unduh CSV" dan unduhan JSON memakai `/api/lapor/agregat` (modul Lapor Bencana, di luar dokumen ini). Kolom selisih dengan data resmi belum tersedia sampai laporan ditempel ke Buku Besar Kejadian.

### Tampilan yang masih kerangka

Masalah, Riset, Dana, Satgas, Talenta, Kampus, dan Dasbor hanya mendaftar diri dan menampilkan "Tampilan ini belum diisi" (`public/kemitraan/masalah.js`, `riset.js`, `dana.js`, `satgas.js`, `talenta.js`, `kampus.js`, `dasbor.js`). Rute Worker untuk masalah, kunjungan, jawaban, koreksi, kampus, anggota, dan perjanjian sudah ada (lihat Referensi teknis), sedangkan rute riset, dana, satgas, dan talenta belum dipasang meski skema D1-nya sudah ada.
