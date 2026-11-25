# KEPUTUSAN: Peta Situs dan Satu Alur Navigasi

Berkas ini menang atas semua dokumen lain di folder `peta-situs`.

## Keputusan pemilik

| Kode | Keputusan | Kutipan dan tanggal |
| --- | --- | --- |
| K1 | Semua halaman dikelompokkan ke tempatnya masing-masing sehingga situs punya satu alur. Tidak ada halaman yang hanya bisa dibuka dengan mengetik alamatnya sendiri. | "lu coba kategoriin semuanya ke tempat masing-masing biar si website kita ini sistematis ... Jadinya satu alur semua. Dan ga ada yang gw harus ketik linknya sendiri" (25 Nov 2026) |
| K2 | Pengelompokan per pintu yang diusulkan disetujui. | "Boleh gw sepakat" (25 Nov 2026) |
| K3 | Pintu Publik dan pintu Warga melapor digabung jadi satu pintu Publik. | "Publik dan warga melapor samain aja digabung" (25 Nov 2026) |
| K4 | BNPB, BPBD, petugas lapangan, kampus, dan mitra masuk lewat satu halaman `centurisk97.id/masuk`. | "loginnya mereka sama aja via centurisk97.id/masuk" (25 Nov 2026). Dicatat juga sebagai K21 di `data/kajian-bnpb/pintu-masuk/KEPUTUSAN-MASUK.md` (bagian Jawaban pemilik 25 Nov 2026). |
| K5 | Pekerjaan diurutkan menurut prioritas; paket ini P0. | "kerjakan semua berdasarkan prioritas" (25 Nov 2026) |

## Keputusan rancangan

Diperbaiki 25 Nov 2026 sesudah pemeriksaan bersih (temuan registri publik, penyaring peran, `?ke=`, dan rute).

| Kode | Rancangan |
| --- | --- |
| D1 | Satu sumber registri di Worker: `src/peta_situs.js`. Tiap halaman tercatat tepat satu kali dengan `rute`, `nama`, `ikon`, `pintu`, `grup`, `akses` (`tamu`, `sesi`, `token`, `kode`), dan `hak` (kunci `HALAMAN_STAF` bila ada). |
| D2 | Lima pintu: **Publik** (termasuk Lapor), **Staf BNPB**, **BPBD dan instansi**, **Petugas lapangan**, **Kampus dan mitra**. Pengaturan admin adalah grup di dalam pintu Staf. |
| D3 | Bagian registri yang aman untuk publik (pintu Publik dan Kampus) dihasilkan generator ke `public/inti/peta_situs_publik.json`, mengikuti pola `bencana.generated.js`. Bagian staf, instansi, petugas, dan admin tidak pernah jadi berkas statis. Worker menyajikannya lewat `GET /api/peta-situs` hanya untuk sesi yang sah, sudah disaring. |
| D4 | Delapan sumber menu tulisan tangan diganti: kepala publik membaca `peta_situs_publik.json`; nav admin Worker (`GRUP_ADMIN`, `GRUP_STAF`, `SUB`, `RUANG_LAPORAN`, kartu `dasbor_admin.js`) dihitung langsung dari `src/peta_situs.js`; menu staf di halaman statis (`menu_pusdalops.js`, `pintu.js`) dan menu instansi, petugas, kampus membaca `/api/peta-situs`. Sesudah menu baru terpasang, daftar lama dihapus. |
| D5 | Beranda pintu: Publik `/`, Staf `/bnpb`, BPBD `/instansi`, Petugas `/petugas`, Kampus `/kemitraan`. Sesudah masuk lewat `/masuk`, orang diarahkan ke beranda pintunya, kecuali ada `?ke=` yang lolos `tujuan()` (`src/statistik.js`). Pemeriksa jalur yang sudah ada itu tetap satu-satunya; registri tidak menambah syarat baru pada `?ke=`, karena halaman tujuan tetap dijaga Worker. |
| D6 | Kepala publik memuat tombol **Lapor** dan **Masuk**. Kaki publik memuat halaman sekunder publik (Tentang, Privasi, Syarat, Statistik, API, Verifikasi dokumen, Alun-alun, Kabar selamat, Daftar kontak darurat). |
| D7 | Menu staf tetap di `menu_pusdalops.js`: panel kiri di layar lebar (model A, pemilik 11 dan 20 Nov 2026) dan menu atas dengan deretan subhalaman di layar sempit. Grupnya delapan, menggantikan enam grup keputusan 11 Nov 2026, karena pemilik menyetujui pengelompokan baru (K2). Tanpa tombol pindah sisi (pemilik 20 Nov 2026); panel tetap bisa ditarik. |
| D8 | Penyaring menu: butir dengan `hak` tampil bila `bolehStaf(hak, peran)`; butir tanpa `hak` tampil untuk semua staf. Menu hanya alat tunjuk; hak akses tetap di Worker dan modul. Penyaringan dikerjakan di Worker (`/api/peta-situs` dan nav admin), jadi `bolehStaf` tidak pernah disalin ke peramban. Tiap butir juga harus lolos `bolehHalaman(rute, sesi, terkunci)`, fungsi murni di `src/worker.js` yang dipakai gerbang Worker sendiri; menu tidak pernah menunjukkan tautan yang akan ditolak (temuan guard-api 25 Nov 2026: di host terkunci gerbang menyeluruh hanya meloloskan admin, `operator_cc`, peran Dalops ke menu Pusdalops, dan akademisi ke Direktori). |
| D9 | Tautan bertoken (`/bantu`, `/lacak/:t`, `/lapor/s/:t`, `/lapor/data?t=`, `/renlap#t=`, `/uji-pilot#t=`, `/kampus#k=`, `/kemitraan/saya#k=`, `/pipa/lapangan#k=`) dicatat dengan `akses: "token"` dan tidak tampil di menu. |
| D10 | Gerbang `tests/agen/gerbang-peta-situs.test.mjs`: halaman nyata dibentuk dari `HTML_RUTE` dan `PUBLIK_TANPA_SESI` yang diekspor `src/worker.js`, kunci `tabelRute()` yang menyajikan HTML, dan `public/**/*.html` yang bukan sasaran alias. Syarat lulus: tiap halaman nyata tercatat, tiap entri menunjuk halaman nyata, tiap entri non-token tampil di menu pintunya, `akses: "tamu"` sama persis dengan `PUBLIK_TANPA_SESI`, dan `peta_situs_publik.json` segar. |
| D11 | Rute lama tidak dipindah alamatnya, sehingga tautan luar (WA, QR, deck) tidak patah. `/admin/masuk` (GET dan POST) dan semua pengalihan 303 ke `/admin/masuk?ke=` di Worker dialihkan ke `/masuk` (K4, K21 paket `pintu-masuk`). |

## Pertanyaan terbuka

Bawaan sementara dipakai sampai pemilik menjawab.

| Kode | Pertanyaan | Bawaan sementara |
| --- | --- | --- |
| Q1 | `/warga` (form Lapor Warga lama) dipensiunkan dan dialihkan ke `/lapor`? | Dialihkan 301 ke `/lapor`; berkas lama disimpan sampai pemilik menyetujui hapus. |
| Q2 | `/kejadian.html` (Laporan Kejadian) dan `/semua` (Semua bencana) dipakai? | Keduanya tetap; `/semua` muncul sebagai butir "Semua bencana" di menu bencana, `/kejadian.html` di grup Kejadian pintu Staf. |
| Q3 | `/laporan-konsesi` (Laporan Konsesi Terbakar 2026) publik atau staf? | Publik, ditautkan dari tab Laporan karhutla. |
| Q4 | Tiga halaman design system (`/design-system/**`) ditampilkan? | Pintu Staf, grup Pengaturan, hanya admin. |
| Q5 | `/presiden` (panel presiden yang disematkan dari luar) ikut menu? | Pintu Staf, grup Pimpinan; tetap bisa disematkan. |
| Q7 | Di `centurisk97.id` hanya admin, `operator_cc`, peran Dalops (ke menu Pusdalops), dan akademisi (ke Direktori) yang bisa membuka halaman staf terkunci. Staf peran lain (tmc, verifikator, analis_konsesi, udara, unit, irtama) melihat menu sempit. Perlu dibuka lebih luas? | Gerbang tetap seperti sekarang; menu mengikuti gerbang. Membuka akses adalah keputusan pemilik per peran. |
| Q8 | Di `centurisk97.id`, `/ai` (Asisten AI) dan `/lapor/meja` (meja Lapor BPBD) hanya terbuka untuk admin dan `operator_cc`. Menu lama menautkan `/ai` ke tujuh peran staf, dan `/lapor/meja` dimaksudkan untuk BPBD. Akibatnya, tautan itu mati untuk mereka. Dibuka untuk peran itu? | Gerbang tetap; menu menyembunyikan keduanya untuk peran yang ditolak. Bila dibuka, ubah `perananGerbang` di `src/worker.js` lewat tiket terpisah. |
| Q9 | Sebelum 25 Nov 2026 kaki situs tidak pernah tampil di `centurisk97.id`. Supaya Kemitraan dan halaman sekunder tetap bisa diklik (K1), kaki kini tampil di sana tanpa kolom merek Teras Urban. Disetujui? | Kaki tampil di `centurisk97.id`. Bila tidak, Kemitraan dan halaman sekunder pindah ke menu Masuk atau kepala. |
| Q6 | `/admin/meja` tercatat boleh dibuka peran `irtama` di `HALAMAN_STAF`, tetapi halamannya (`src/meja.js`, `halamanBnpb("meja")`) hanya membuka admin. Mana yang benar? | Ikut Worker: admin saja, tidak tampil di menu irtama. Bila irtama memang perlu, gerbang `src/meja.js` dibuka di tiket terpisah. |
