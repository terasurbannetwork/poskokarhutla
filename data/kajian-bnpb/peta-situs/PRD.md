# PRD: Peta Situs dan Satu Alur Navigasi

## Masalah

Per 25 Nov 2026 situs memiliki sekitar 150 halaman. Ada 24 halaman yang tidak ditautkan dari halaman mana pun. Pintu staf `/bnpb` sendiri yatim, padahal sembilan halaman hanya bisa dibuka dari sana. Halaman publik tidak menautkan ke `/lapor`. Ada delapan sumber menu yang ditulis tangan dan isinya tumpang tindih:

- `public/inti/kepala.js`
- `public/bnpb/pintu.js`
- `public/bnpb/menu_pusdalops.js`
- di `src/admin_halaman.js`: `GRUP_ADMIN`, `SUB`, `GRUP_STAF`, `RUANG_LAPORAN`

Sumber kedelapan adalah kartu di `public/inti/dasbor_admin.js`.

## Tujuan

1. Tiap halaman punya satu tempat: satu pintu, satu grup (K1, D1).
2. Siapa pun bisa sampai ke halaman yang boleh ia buka hanya dengan mengklik, mulai dari beranda pintunya (K1).
3. Satu halaman masuk, `/masuk`, untuk semua peran (K4).
4. Halaman baru tidak bisa lahir yatim, karena dijaga gerbang (D8).

## Bukan tujuan

- Mengganti tampilan halaman satu per satu.
- Mengubah alamat halaman (D9).
- Membuka halaman staf untuk publik.

## Peta pintu dan grup

### Pintu Publik (beranda `/`)

| Grup | Halaman |
| --- | --- |
| Bencana (menu kepala) | Semua bencana `/semua`; Karhutla `/` (+ Desa Waspada `/desa-waspada`, Laporan konsesi `/laporan-konsesi`); Banjir `/banjir` (+ Replay `/banjir/replay`); Cuaca `/cuaca` (+ Simulasi); Pesisir `/pesisir`; Gempa `/gempa` (Simulasi adalah tab, bukan halaman); Gunung api `/gunungapi` (+ Simulasi `/gunungapi/simulasi.html`); Kekeringan `/kekeringan` (+ Simulasi); Udara `/udara`; Laporan per bencana `*/laporan.html` dari tab tiap bencana |
| Prediksi (tombol kepala) | `/prediksi`, Ringkas `/prediksi/ringkas` |
| Peringatan | `/peringatan`, Monitor `/monitor` |
| Lapor (tombol kepala) | `/lapor`, Lacak laporan `/lapor/lacak`, Kejadian hari ini `/lapor/hari-ini`, Kabar selamat `/kabar`, Alun-alun `/alun-alun`, Poster desa `/lapor/poster.html` |
| Masuk (tombol kepala) | `/masuk` |
| Kaki situs | Tentang `/tentang`, Privasi `/privasi`, Syarat `/syarat`, Statistik `/statistik`, API `/api`, Verifikasi dokumen `/verifikasi`, Daftar kontak darurat `/daftar-kontak`, Laporan `/laporan`, Paparan `/paparan` |

### Pintu Staf BNPB (beranda `/bnpb`)

| Grup | Halaman |
| --- | --- |
| Pantau | Pantau kejadian `/bnpb/dalops`, Meja Pantau `/admin/pantau`, Laporan warga `/lapor/meja`, Command Center `/command-center`, Logbook `/bnpb/logbook` |
| Kejadian | Siklus `/siklus` (Kaji cepat dan Buku Besar adalah tab di dalamnya), Buku Besar publik `/siklus/kejadian`, Siklus publik `/siklus/publik`, Rumah rusak `/rumah-rusak`, Laporan kejadian `/kejadian.html` |
| Operasi | Operasi `/bnpb/operasi`, Operasi lapangan `/bnpb/operasi-lapangan` dan `/?operasi`, Sortie OMC `/admin/omc`, Renlap cetak `/renlap-cetak`, Renlap OMC `/renlap-omc`, SIPPA `/pipa`, Ruang Posko `/admin/posko`, Drone `/admin/drone` |
| Laporan | Bahan laporan `/bnpb/bahan`, Laporan karhutla `/admin/laporan-karhutla`, Laporan Koordalops `/laporan-bnpb`, Sitrep `/sitrep`, Dokumen `/bnpb/dokumen`, Generator dokumen `/dokumen`, Katalog dokumen `/bnpb/katalog-dokumen`, Ruang Laporan `/admin/laporan`, Laporan dan arsip `/pelaporan`, Segel dokumen `/admin/segel` |
| Risiko dan perencanaan | Perencanaan `/bnpb/perencanaan`, Siaga `/bnpb/siaga`, Risiko `/risiko`, Risiko kebakaran `/risiko-kebakaran`, Kebutuhan `/kebutuhan`, InaRISK `/bnpb/inarisk`, Data bencana `/bnpb/data-bencana`, Rapor sumber `/bnpb/rapor-sumber`, Silang sumber `/bnpb/silang` |
| Pimpinan | Layar pimpinan `/admin/pimpinan` dan `/bnpb/pimpinan`, Kinerja BNPB `/kinerja-bnpb`, Kinerja pemantauan `/admin/kinerja`, Panel presiden `/presiden` |
| Jejaring | Relawan `/relawan`, Alun-alun staf `/admin/alun`, Direktori `/direktori`, Riset `/riset` dan `/riset/mitra`, Meja kerja `/meja` dan `/admin/meja`, Hukum `/bnpb/hukum`, Saham `/bnpb/saham`, Akademisi `/akademisi`, Asisten AI `/ai`, Instansi `/admin/instansi`, Aktivasi `/admin/aktivasi` |
| Pengaturan (admin) | Akun, Kunci API, Biaya bot, Kontak, Statistik admin, Kotak pesan, Foto, Label foto, Media sosial, Pengingat, Berkas Gakkum, Inventaris, Korban, Pendataan admin, Design system `/design-system/**` |

Ruang Unit `/bnpb/unit` masuk grup Jejaring saat halamannya dibangun (paket `kedeputian`); sekarang belum ada. Rute alias di `HTML_RUTE` (`src/worker.js:724`, misalnya `/risiko` yang menyajikan `public/bnpb/risiko.html`) dicatat dengan rute alias, bukan nama berkasnya. Daftar lengkap dibentuk di PS-01 dari `HTML_RUTE`, `tabelRute()`, dan berkas `public/**/*.html`; tabel di atas adalah tempatnya, bukan daftar akhir.

Sisa halaman `/admin/*` mengikuti `HAL` di `src/admin_halaman.js` dan masuk grup yang sesuai kodenya di `DESAIN-TEKNIS.md`.

### Pintu BPBD dan instansi (beranda `/instansi`)

Data bencana `/instansi/data-bencana`, LogPal `/instansi/logpal`, Pendataan `/pendataan`, Meja Lapor BPBD `/lapor/meja`, dan subhalaman `/instansi` yang sudah ada.

### Pintu Petugas lapangan (beranda `/petugas`)

Absen dan logbook `/petugas`, Panel petugas `/petugas/panel` (pimpinan), Lapangan `/lapangan`, Uji lapangan `/uji-lapangan`, Form lapangan SIPPA `/pipa/lapangan` (disajikan Worker, bertoken `#k=`).

### Pintu Kampus dan mitra (beranda `/kemitraan`)

Kemitraan `/kemitraan`, Masuk mitra `/kemitraan/masuk` (dialihkan ke `/masuk`), Saya `/kemitraan/saya`, Buku `/kemitraan/buku`, Panduan `/kemitraan/panduan`, Daftar `/kemitraan/daftar`, Sertifikat `/kemitraan/sertifikat/:id` (dari halaman Saya).

## Fitur

| Kode | Fitur |
| --- | --- |
| F-1 | Registri `public/inti/peta_situs.json` (D1). |
| F-2 | Kepala publik: menu bencana + Prediksi + Lapor + Masuk; kaki publik lengkap (D5). |
| F-3 | Menu staf dari registri, delapan grup, disaring peran (D6). |
| F-4 | Nav admin Worker dari registri (D3). |
| F-5 | Menu pintu BPBD, Petugas, Kampus dari registri (D3). |
| F-6 | `/masuk` satu pintu: kode dan sandi, arahkan ke beranda pintu (D4, D10). |
| F-7 | Gerbang tanpa yatim (D8). |
| F-8 | Pensiun dan alih halaman lama sesuai jawaban Q1–Q5. |
