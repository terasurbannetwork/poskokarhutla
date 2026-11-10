# Keputusan awal: Siklus Bencana (10 November 2026)

Dokumen ini menang atas semua dokumen lain di folder ini. Program ini menyatukan pengurangan risiko, kesiapsiagaan, tanggap darurat, dan pascabencana dalam satu pintu.

Tiap butir bertanda sumbernya. **[Pemilik]** berarti diucapkan pemilik. **[Awal]** berarti bawaan yang dipilih supaya kerja bisa jalan; pemilik boleh membaliknya, dan bila dibalik, butir itu ditulis ulang di sini lalu dokumen di bawahnya diselaraskan. Pertanyaan yang belum dijawab ada di bagian H. Pertanyaan terbuka tidak boleh dijawab dengan karangan.

## A. Lingkup

1. **[Pemilik]** Tujuh fitur, urut sesuai permintaan pemilik 10 November 2026:

| Kode | Fitur | Inti |
| --- | --- | --- |
| F1 | Buku Besar Kejadian | satu ID dan satu halaman tiap kejadian, dari peringatan sampai pulih |
| F2 | Peta Paparan per Bangunan | bangunan, fasilitas vital, dan jiwa di tiap zona bahaya |
| F3 | Kaji Cepat Otomatis | perkiraan dampak dalam hitungan jam sesudah kejadian |
| F4 | Jitupasna ke R3P Digital | dari isian lapangan, hitung kerusakan dan kerugian, draf R3P, sampai pemantauan pelaksanaan |
| F5 | Renkon Hidup dan Gladi | rencana kontinjensi yang diperbarui dari data, dan latihan dari kejadian nyata |
| F6 | Risiko Masa Depan dan Tata Ruang | profil risiko 2030 dan 2050, bangunan yang tumbuh di zona bahaya |
| F7 | Pintu Tunggal | satu pintu per fase dan per peran di atas semua modul yang ada |

2. **[Pemilik]** Tiga usulan yang tidak dipilih pemilik berada DI LUAR program ini: Radar Pemulihan, Kompas Dana dan Bantuan, Aksi Dini Terpicu. Tidak dibuat diam-diam sebagai bagian fitur lain.
3. **[Pemilik]** Semua dokumen disiapkan dari hulu ke hilir sebelum kode, seperti SIPPA.
4. **[Pemilik]** Gelombang: G1 = lapis gudang data + F1 + F2, lalu terus sampai selesai. **[Awal]** G2 = F3, G3 = F4, G4 = F5 + F6 + F7.
5. **[Awal]** Fitur yang tidak tertulis di dokumen folder ini tidak dibangun (aturan berhenti AGENTS.md §2.1).

## B. Identitas teknis

Nilai berikut mengikat semua dokumen, dan tidak boleh diganti di dokumen lain.

| Hal | Nilai |
| --- | --- |
| Nama program | Siklus Bencana |
| Folder dokumen | `data/kajian-bnpb/siklus/` |
| Kode tiket | `SK-NNN` |
| Agent pengerja | `siklus` (layar, pipeline, uji tanpa DB); `warga-api` (Worker, D1) |
| Halaman | `/siklus` (pintu), `/siklus/kejadian`, `/siklus/kejadian/:id`, `/siklus/paparan`, `/siklus/kaji`, `/siklus/kaji/:id`, `/siklus/pulih`, `/siklus/pulih/:id`, `/siklus/renkon`, `/siklus/renkon/:id`, `/siklus/gladi`, `/siklus/masa-depan` |
| Rute API | `/api/siklus/*` |
| Berkas layar | `public/siklus/**` |
| Berkas Worker | `src/siklus*.js` |
| Pipeline | `scripts/siklus/**` |
| Uji | `tests/siklus/**`, skrip `npm run uji:siklus` |
| Tabel D1 | awalan `sk_`, tiap tabel punya kolom `dummy` |
| Migrasi | nomor berikutnya yang kosong saat tiket dikerjakan; idempoten; `ON CONFLICT DO NOTHING`, bukan `INSERT OR IGNORE` |
| R2 | bucket yang ada (`MEDIA`), awalan `siklus/mentah/`, `siklus/bersih/`, `siklus/saji/` |
| Kelas CSS | awalan `.sk-*`; bagian laporan memakai kartu standar `.ex.ex-std` |
| Workflow | satu berkas `siklus.yml`; tidak menambah cron Worker |

## C. Kejujuran angka

6. **[Pemilik, aturan lama]** Titik panas, firespot, luas, belum padam, dan terdampak karhutla hanya dari sistem kita, tidak pernah dari Koordalops.
7. **[Awal]** Angka antar sumber yang berbeda tidak dijumlah atau dirata-rata. DIBI, Logbook Pusdalops, dan sistem kita tampil berdampingan, selisih tertulis sebagai selisih (pola `rekonsiliasi_dalops_dibi.py`).
8. **[Awal]** Tiap angka punya label keyakinan: `resmi`, `terverifikasi`, `estimasi-model`, `asumsi-kebijakan`, `hipotesis`, `menunggu`. Tiap angka punya sumber dan waktu. Tidak ada data = tertulis tidak ada, bukan nol.
9. **[Awal]** Keluaran F3 selalu rentang dan berlabel `estimasi-model` sampai ada uji balik; tidak pernah ditulis sebagai angka resmi BNPB.
10. **[Awal]** F6 adalah sinyal perubahan iklim terhadap dasar, bukan ramalan kejadian. Hasil berlabel `hipotesis` sampai uji historis selesai.
11. **[Pemilik, aturan lama]** Model yang tidak lolos uji tetap boleh tampil dengan pil hipotesis yang jelas.

## D. Data dan privasi

12. **[Pemilik, 19 Okt]** Registri pengungsi per orang dicoret. F3 dan F4 hanya memperkirakan jumlah jiwa.
13. **[Awal]** Tidak ada NIK, KK, atau unggah KTP di mana pun di program ini. Rumah rusak dicatat per rumah memakai pola `src/rumah_rusak.js` (tanpa identitas pemilik di kolom publik).
14. **[Pemilik, aturan lama]** Paparan bangunan rinci adalah data terkunci: di R2, tidak di `public/`, dibaca setelah masuk (pola `src/bangunan.js`).
15. **[Awal]** Data lapangan dan draf dokumen F4 dan F5 hanya untuk staf. Halaman kejadian publik memuat ringkasan yang sudah resmi saja.
16. **[Pemilik]** Data publik boleh diambil sebanyak mungkin. **[Awal]** Syaratnya: lisensi dan atribusi tercatat, jeda sopan, tanpa memecahkan CAPTCHA, dan tiap sumber baru masuk registri sumber dengan pemilik, jadwal, dan pemakai (gerbang `gerbang-peta-data`).

## E. Pakai ulang, jangan menyalin

17. **[Awal]** F1 melanjutkan `scripts/bnpb/kunci_kejadian.py`, `scripts/umum/kejadian.py`, dan `rekonsiliasi_dalops_dibi.py` sebagai alat pemasangan, tetapi punya ID sendiri `KJ-` dan tabel pemetaan (sumber, kode sumber) ke ID itu. Alasan: kode karhutla `K####` diberi ulang tiap hari, sehingga tidak bisa jadi kunci. Kunci wilayah tunggal = kode BPS 4 digit; `PP|nama` dan kode DIBI bertitik diterjemahkan lewat `kab_kunci` dan `hvc_dasar.kab_kode`, tidak ada kunci keempat.
18. **[Awal]** F2 melanjutkan `scripts/umum/bangunan.py`, `scripts/umum/paparan_bangunan.py`, `src/bangunan.js`, `bangunan.yml`, dan `scripts/bnpb/terpapar.py`. Open Buildings sudah ada; yang baru adalah fasilitas vital, tingkat desa, kelas bahaya InaRISK lengkap, dan layar.
19. **[Awal]** F3 gempa memakai `guncangan.py` dan `pager.py` yang sudah ada dan terkalibrasi, dengan galat kalibrasi tertulis. F3 banjir mengikuti ketersediaan: Sentinel-1 per kabupaten belum dipakai layar, jadi tahap pertamanya poligon kejadian aktif dikali paparan. Grid ShakeMap USGS adalah sumber baru, karena yang ada di repo hanya PNG BMKG. `lampu_malam.py` belum layak terbit dan tidak dipakai sampai uji baliknya lolos.
20. **[Awal]** F4 menyambung `rumah_rusak.js`, `pemulihan.js` (pemantauan pelaksanaan), meja rehab-rekon di `src/meja.js`. Tidak membuat tabel rumah rusak kedua. Tabel `meja_*` tidak ditambah karena CHECK-nya tidak bisa diubah dan sesi lain sedang memegangnya; Jitupasna dan R3P memakai `sk_*` dan tertaut lewat ID. Dasar hukum: Perka 15/2011 (Jitupasna), Perban 5/2017 dan 6/2017 (R3P dan rehab-rekon), Perban 4/2024 (hibah RR).
21. **[Awal]** F5 memakai stok LogPal, personel `/petugas`, dan meja renkon yang sudah ada sebagai metadata dokumen. Dasar: Perban 2/2023 (renkon, masa berlaku 3 tahun), Juklak 4/2026 (gladi), Perka 7/2008 (kebutuhan dasar). Gladi tahap pertama memutar ulang data kejadian arsip dari F1, bukan simulasi genangan.
22. **[Awal]** F7 membungkus `/semua`, `src/mcp.js`, `src/ai.js`, tidak menggantinya.

## F. Tampilan dan bahasa

23. **[Pemilik, aturan lama]** Merek Centurisk97, kata "Pantau Bencana" dilarang. BNPB dan BPBD ditulis sebagai kita, bukan mitra strategis.
24. **[Pemilik, aturan lama]** Kepala situs navy bersama, token Centurisk97, tanpa palet lokal. Kartu standar, tanpa kaki sumber. Paragraf rata kanan-kiri, grafik interaktif bertooltip, tabel kepala tengah, deretan pilihan penuh lebar terbagi rata berikon, ikon tanpa garis luar, panel peta bisa ditarik.
25. **[Pemilik, aturan lama]** Tanpa titik tengah dan em dash. Angka lewat format Indonesia.
26. **[Pemilik, aturan global]** Tiap layar punya tombol dummy dua ikon, Super Admin saja; klik tidak membekukan layar; perilaku di luar TypeScript/JS murni punya uji integrasi yang menjalankannya.

## G. Infrastruktur

27b. **[Awal]** Pemilik akun instansi BPBD membaca lewat `src/instansi.js` yang ada, dibatasi wilayahnya. Label `yakin` empat nilai di profil kemitraan dipetakan ke enam label butir 8 (`tinggi` dan `sedang` ke `terverifikasi`, `rendah` ke `estimasi-model`, `tidak` ke `hipotesis`), tidak diubah di sumbernya. Keluaran per kabupaten F6 disimpan per provinsi di R2 demi butir 28.
27c. **[Awal]** D1 hanya memuat kejadian hidup dan yang sedang dipakai. Arsip DIBI dan Logbook (sekitar 113 ribu baris) tinggal di R2 dengan ID `KJ-` deterministik dan dipromosikan ke D1 saat dibutuhkan, karena memuat semuanya butuh sekitar 400 ribu tulis sementara jatah Free 100 ribu per hari. Bila PRD F1-01 berbunyi lain, butir ini menang. Akses akun BPBD memakai jalur `/api/instansi/siklus/*`.
27d. **[Awal]** Semua SQL `sk_*` tinggal di `src/hak.js` karena gerbang D1. Pipeline menulis ke D1 lewat rute Bearer memakai `PIPA_TOKEN` yang sudah ada.
27a. **[Awal]** Halaman staf `/siklus/*` ditambahkan ke `run_worker_first` supaya JS dan CSS-nya tidak terbuka tanpa sesi. Peran memakai yang ada (`pusdalops`, `koordalops` tulis; `pimpinan` baca dan tanda setuju internal R3P; akun BPBD mengisi baris Jitupasna di wilayahnya), tidak menambah peran baru. Riwayat DIBI lengkap dan Logbook yang kotor dibersihkan dulu dan dilaporkan jumlah baris yang dibuang.
27. **[Awal]** Rancangan harus muat di paket Cloudflare Free yang berlaku sekarang: D1 hanya transaksi, agregat dibaca dari R2 atau berkas, awalan `siklus/` paling besar 4 GB, tidak ada cron baru, tidak ada kueri D1 pemindaian di cron (insiden kuota baca 28 Okt).
28. **[Awal]** Berkas turunan besar tidak di-commit. Yang masuk `public/` hanya berkas kecil dan jarang berubah; jumlah berkas baru di `public/` program ini paling banyak 200.
29. **[Awal]** Data raksasa publik (Overture, NEX-GDDP) dibaca di tempat dengan DuckDB pada tahap lab, tidak disalin utuh ke R2.
30. **[Awal]** Hanya `main`, commit berkas spesifik, push lewat `npm run dorong`. Migrasi produksi diterapkan sesuai pola yang sudah berjalan, dan dilaporkan bila butuh pemilik.

## H. Pertanyaan terbuka untuk pemilik

Tidak menghentikan G1. Bawaan sementara tertulis; hasil yang bergantung padanya diberi tanda.

| Kode | Pertanyaan | Bawaan sementara | Berdampak ke |
| --- | --- | --- | --- |
| U1 | Naik paket Cloudflare berbayar? | tetap Free | batas ukuran F2, F6 |
| U2 | `/siklus` masuk menu utama situs sekarang? | belum, tautan tersembunyi seperti `/bnpb` | F7 |
| U3 | Halaman kejadian boleh publik? | ringkasan resmi publik, rincian staf | F1 |
| U4 | Harga satuan kerusakan F4 memakai acuan apa? | HSBGN atau Perka bila ada di pustaka; selain itu `asumsi-kebijakan` | F4 |
| U5 | Daerah percontohan F4 dan F5? | belum ditetapkan, dummy dan satu kejadian arsip | F4, F5 |
| U6 | Boleh mendaftar `appname` ReliefWeb? | sumber ini tidak dipakai | F1 |
| U8 | Tarif stimulan rumah RB/RS/RR memakai yang mana? (50/25/10, 60/30/15, atau usulan 80 juta) | `asumsi-kebijakan` 60/30/15, sumber sekunder, teks Juklak 5/2024 belum ditemukan | F4 |
| U9 | Kebutuhan hunian memakai Perka 7/2008 (3 m2) atau Sphere (3,5 m2)? | Perka 7/2008 | F5 |
| U10 | Taksonomi sektor Jitupasna memakai Perka 15/2011 yang mana bila beda dengan lampiran? | teks Perka 15/2011 | F4 |
| U11 | Ambang keyakinan Open Buildings yang dipakai menghitung bangunan? | 0,70, tertulis di tiap keluaran | F2 |
| U12 | Batas kelas InaRISK: lebih dari 0,66 atau minimal 0,67? (repo tidak seragam) | sedang 0,33 sampai 0,66, tinggi di atas 0,66, sama dengan `terpapar.py` | F2 |
| U13 | Model kematian gempa F3: PAGER global atau ITB Indonesia? | keduanya tampil berdampingan sebagai rentang | F3 |
| U14 | Format nomor induk kejadian menurut Perban 1/2023 Pasal 8? | ID `KJ-` internal, kolom nomor induk resmi kosong sampai ada | F1 |
| U15 | Jendela hari untuk bencana berdurasi panjang, dan tafsir kompleks karhutla? (ALGORITMA UA-1) | 3 hari, karhutla memakai sel 0,02 derajat | F1 |
| U16 | Status kejadian boleh naik ke terverifikasi secara otomatis? (UA-2) | tidak, butuh staf | F1 |
| U17 | Poligon desa nasional memakai sumber apa? (UA-3) | titik pusat desa Dukcapil, keterbatasan tertulis | F2 |
| U18 | Ambang uji balik agar F3 boleh naik dari estimasi-model? (UA-4) | belum ada ambang, tetap estimasi-model | F3 |
| U19 | Pasal masa berlaku renkon: Pasal 21 ayat (1) atau Lampiran 1.8? (UA-5) | Pasal 21 ayat (1), sesuai `jam_aturan.json` | F5 |
| U20 | Dasar iklim F6: delta terhadap historical model atau CHIRPS? (UA-6) | delta historical model, CHIRPS sebagai pembanding bias | F6 |
| U21 | Hubungan dengan Rantai per KIB dan `meja_dampak`? | `sk_kejadian` satu-satunya buku kejadian, keduanya dirujuk baca saja | F1 |
| U7 | Draf R3P perlu pengesahan siapa di sistem? | peran pimpinan sebagai tanda setuju, tidak menggantikan dokumen resmi | F4 |
