# KEPUTUSAN: Kajian Penghitungan dan Klasifikasi Kejadian Bencana

Dokumen ini menang atas dokumen lain di folder `hitung-bencana/`. Hanya pemilik yang boleh mengisi
bagian "Sudah diputuskan". Pertanyaan terbuka tidak dijawab agent dengan karangan. Tiap pertanyaan
punya bawaan sementara bertanda [BAWAAN SEMENTARA] yang dipakai naskah sampai pemilik menjawab.
Kolom "Paradoks" menunjuk tempat pertanyaan itu dibahas di `naskah/lampiran-a-*.md`.

## Sudah diputuskan

Belum ada. Diisi pemilik.

## Catatan kerja

- Kajian dijalankan tiga fase sesuai `PROMPT-KAJIAN.md` bagian 8. Fase 1 (12 Nov 2026) berisi Bab 4,
  katalog 65 paradoks (Lampiran A), peta ketergantungan (Bab 5), dan daftar wawancara (Lampiran E).
  Tanpa DOCX.

## Prioritas: delapan pertanyaan yang paling menentukan Fase 2

Jawaban atas delapan pertanyaan ini menentukan bentuk kerangka L1, L2, dan L3. Sisanya bisa memakai
bawaan sementara tanpa mengubah arah kajian.

| Kode | Pertanyaan | [BAWAAN SEMENTARA] | Paradoks |
| --- | --- | --- | --- |
| Q-08 | Siapa berwenang menyatakan dua laporan adalah satu kejadian? | Pusdatinkom sebagai walidata memutuskan, BPBD mengusulkan; aturan tertulis (mis. gabung kluster karhutla) boleh diterapkan mesin dengan jejak dan dapat dibatalkan (Juklak 7/2023 hlm. 7 Catatan c; Bab 6.2.2 aturan 9) | P-45, P-01, P-05, P-38 |
| Q-03 | Satuan "jumlah kejadian" untuk pimpinan: kejadian nasional (lintas kabupaten dihitung satu) atau kejadian per kabupaten? | Dua angka disajikan dengan nama berbeda; pecahan DIBI tidak dipakai sebagai satuan penyajian | P-05, P-48, P-14 |
| Q-07 | Versi angka mana yang sah? | Ikut Petunjuk Pengisian Juklak 7/2023: meninggal dan kerusakan nominal terakhir; hilang, luka, terdampak, mengungsi nominal terbesar selama masa kejadian; meninggal dan hilang untuk kelas dihitung sebagai nilai terbesar jumlah keduanya per laporan; angka statis dibekukan per rilis dengan nomor versi; menjumlah angka antarhari dilarang | P-27, P-41, P-42, P-46 |
| Q-05 | Kriteria e (permintaan bantuan nasional) dan f (status darurat) menjadi penanda, bukan pemicu? | Ya, diusulkan menjadi penanda; jalur masuk administratif hanya untuk SK tanggap darurat yang menyebut kejadian tertentu | P-15, P-62, P-63 |
| Q-09 | Berapa jeda yang memisahkan kejadian berulang (banjir naik lagi, api menyala lagi, gempa susulan)? | 7 hari tanpa laporan aktif berarti kejadian baru, dengan batas durasi 30 hari per kejadian; gempa memakai 30 hari dengan batas 90 hari (Q-15); kejadian lambat memakai Q-16 (Bab 6.2.2) | P-02, P-04, P-06, P-08 |
| Q-10 | Bagaimana kejadian berantai dan majemuk dicatat? | Satu kejadian induk dengan anak per bahaya; korban dicatat sekali pada bahaya penyebab langsung dan dijumlah sekali di induk | P-07, P-09, P-50 |
| Q-04 | Ambang luas pengganti "1 hektare lahan"? | M5: karhutla 2 ha luas terbakar terverifikasi; sawah atau kebun 10 ha puso, mengikuti ambang menonjol panduan Pusdalops (Bab 6.3) | P-13, P-20, P-60 |
| Q-34 | Pembanding relatif untuk skala keparahan: penduduk, anggaran daerah, atau gabungan? | Kelas absolut dengan penaik relatif: naik satu kelas bila pengungsi dan terdampak mencapai 10 persen penduduk kabupaten, berlantai 100 dan 1.000 orang, paling tinggi Besar; penduduk BPS bila tersedia (Bab 6.4.2) | P-17, P-33 |

## Daftar lengkap pertanyaan terbuka

### Dokumen dan sumber

| Kode | Pertanyaan | [BAWAAN SEMENTARA] | Paradoks |
| --- | --- | --- | --- |
| Q-01 | Kepada siapa kajian disampaikan (baris "Disampaikan kepada" di sampul)? | Ditanyakan lagi sebelum Fase 3; tidak diisi | Sampul |
| Q-02 | Siapa dapat memasok salinan resmi Juklak 7/2023 dari JDIH BNPB? Teks yang dibaca berasal dari PDF UNFPA; halaman 1, 10, 26, 52, 53 berupa gambar | Kutipan dari PDF UNFPA dipakai dengan catatan sumber tidak resmi | Bab 4 |
| Q-11 | Siapa narasumber wawancara (Pusdalops, tiga BPBD, Pusdatinkom), dan apakah pemilik membuka jalurnya? | Daftar pertanyaan siap (Lampiran E); wawancara belum dijadwalkan | Lampiran E |
| Q-12 | Bolehkah naskah untuk pimpinan memakai tarikan DIBI lewat dasbor publik Superset (tidak resmi lewat API) dan menyebut kolom `is_bencana`? | Boleh dengan catatan sumber dan tanggal tarik; angka dikonfirmasi ke Pusdatinkom sebelum Fase 3 | Bab 4.3.5, P-35 |

### Unit kejadian (L1)

| Kode | Pertanyaan | [BAWAAN SEMENTARA] | Paradoks |
| --- | --- | --- | --- |
| Q-03 | Lihat bagian prioritas | | |
| Q-06 | Aturan gabung karhutla (jarak dan jendela waktu) | Aturan sistem kita (`scripts/data/harian.py`: jarak adaptif sampai 1,5 km, selisih waktu 48 jam) sampai Fase 2 memilih | P-01, P-03 |
| Q-08 | Lihat bagian prioritas | | |
| Q-09 | Lihat bagian prioritas | | |
| Q-10 | Lihat bagian prioritas | | |
| Q-13 | Kejadian yang melewati 31 Desember dihitung di tahun mulai atau dibagi menurut tanggal dampak? | Tahun tanggal mulai, dengan penanda lintas tahun | P-11, P-39 |
| Q-14 | Menurut apa tipe utama kejadian majemuk ditentukan (pemicu awal atau dampak terbesar), dan oleh siapa? | Dampak terbesar; diusulkan Pusdalops, diputuskan Pusdatinkom (searah Q-08) | P-07, P-09, P-50 |
| Q-15 | Gempa susulan yang merusak lagi: episode kejadian induk atau kejadian baru? | Episode induk selama 30 hari di zona yang sama (batas 90 hari); kejadian baru bila magnitudonya sama atau lebih besar dari gempa utama dengan dampak terpisah, atau pusatnya di luar zona | P-08 |
| Q-16 | Kapan kekeringan, kabut asap, dan abrasi mulai dan selesai? | Kekeringan: satu kabupaten per periode kemarau zona musim BMKG; kabut asap: anak dari karhutla sumbernya; abrasi: per tahun kalender (Bab 6.2.2) | P-10 |
| Q-17 | Apakah kecelakaan pelayaran dan kapal tenggelam masuk lingkup bencana? | Di luar lingkup sampai dikonfirmasi; kejadian laut dari 13 jenis memakai wilayah terdampak terdekat (Juklak hlm. 7) | P-56 |
| Q-18 | Apakah dampak asap atau abu dari luar negeri di wilayah kita dicatat sebagai kejadian? | Dicatat dengan penanda "sumber luar negeri" dan rujukan nomor eksternal | P-64 |
| Q-19 | Apakah Pusdalops menerbitkan KIB pada laporan pertama dan membawanya pada tiap pengkinian, menggantikan kunci yang disimpulkan dari teks? | Ya, sebagai tujuan: Pusdalops membawa KIB usulan sejak laporan pertama, disahkan Pusdatinkom (searah Q-08 dan Q-40); kunci (jenis, provinsi, kabupaten, tanggal) dengan gabung kabupaten beririsan dipakai sementara | P-38 |
| Q-40 | Siapa menerbitkan nomor induk kejadian (Perban 1/2023 Pasal 8 huruf c angka 3), dan formatnya untuk kejadian lintas kabupaten? | Pusdatinkom menerbitkan nomor induk kejadian nasional (KJN); tiap catatan kabupaten (CK) memakai KIB 16 digit dan membawa nomor induk itu (Bab 6.2.1) | P-45, P-59 |

### Ambang masuk (L2)

| Kode | Pertanyaan | [BAWAAN SEMENTARA] | Paradoks |
| --- | --- | --- | --- |
| Q-04 | Lihat bagian prioritas | | |
| Q-05 | Lihat bagian prioritas | | |
| Q-20 | Apakah ambang orang diberi pendamping relatif terhadap penduduk? | Ambang absolut tetap untuk masuk; angka per 100.000 penduduk disajikan berdampingan, dan persen penduduk dipakai penaik kelas L3 | P-17 |
| Q-21 | Apakah ambang "menonjol" Pusdalops dan ambang masuk Juklak disatukan sebagai dua tingkat resmi? | Disatukan: M1 sampai M6 untuk masuk laporan harian dan DIBI; kelas Sedang ke atas untuk laporan menonjol (Bab 9.4) | P-58 |
| Q-22 | Apakah deteksi satelit yang belum dikonfirmasi BPBD dicatat sebagai daftar resmi terpisah, dan berapa tenggang verifikasinya? | Daftar terpisah, tidak dijumlah dengan kejadian terkonfirmasi, tenggang 3 hari | P-40 |
| Q-23 | Apakah DIBI menambah atribut "pemicu dominan" (alam, manusia sengaja, manusia lalai, teknologi)? | Ya, ditetapkan Pusdatinkom saat verifikasi, tidak mengubah jenis bahaya | P-57 |
| Q-42 | Apakah epidemi dan konflik sosial memakai ambang yang sama dengan bencana alam? | Pintu masuk berupa penetapan otoritas sektor, tanpa ambang K2 | P-47 |

### Dampak dan kerugian (D)

| Kode | Pertanyaan | [BAWAAN SEMENTARA] | Paradoks |
| --- | --- | --- | --- |
| Q-07 | Lihat bagian prioritas | | |
| Q-24 | Kapan orang hilang dinyatakan diduga meninggal, dan siapa menetapkan penutupan pencarian? | Hilang dicatat terpisah, menjadi "diduga meninggal" saat pencarian resmi ditutup; penyajian menampilkan "meninggal" dan "meninggal dan hilang" berdampingan | P-24 |
| Q-25 | Apakah pencatatan baru memakai prinsip satu orang satu kategori? | Ya (urutan meninggal, hilang, luka, mengungsi, terdampak); karena orang unik, ambang M2 menjumlah luka, mengungsi, dan terdampak langsung | P-25 |
| Q-26 | Siapa menyatakan sebuah kematian akibat bahaya atau bukan? | BPBD mengusulkan, Pusdatinkom memutuskan | P-23, P-52 |
| Q-27 | Apakah kriteria rumah memakai bobot tingkat kerusakan? | Ya: rumah setara rusak berat = RB + 0,5 RS + 0,25 RR, ambang 5 (M3); disimulasikan di Bab 7.3.2 | P-26, P-54 |
| Q-28 | Apakah formulir wajib membedakan nilai, nol terkonfirmasi, dan belum didata? | Ya, sesuai rancangan meja `juklak/DATA-DAMPAK.md` | P-49 |
| Q-29 | Sumber luas apa yang boleh memicu K4? | Luas terverifikasi lapangan atau citra beresolusi tinggi; luas dari titik panas hanya indikasi berlabel | P-60 |
| Q-30 | Apakah rupiah dilarang menjadi ambang atau skala keparahan? | Ya, rupiah hanya keterangan dengan rasio terhadap PDRB atau APBD | P-28 |
| Q-31 | Apakah formulir wajib memisahkan kerusakan dan kerugian (Perka BNPB 15/2011)? | Ya, dua kolom terpisah, tidak dijumlah | P-29 |
| Q-32 | Indeks dan tahun dasar untuk rupiah harga konstan? | Tahun harga dicatat pada tiap angka; indeks BPS dipilih pemilik | P-30 |
| Q-33 | Untuk tiap variabel dampak, sumber mana yang utama dan mana pembanding? | DIBI untuk jumlah kejadian dan dampak, sumber lain berdampingan dengan label | P-31 |

### Skala keparahan (L3)

| Kode | Pertanyaan | [BAWAAN SEMENTARA] | Paradoks |
| --- | --- | --- | --- |
| Q-34 | Lihat bagian prioritas | | |
| Q-35 | Bolehkah kita meminta daftar SK status darurat dan dana siap pakai per kejadian untuk menguji kalibrasi ambang dan skala? | Belum diminta; respons hanya penanda | P-65, Bab 4.3.4 |
| Q-36 | Apakah ambang ekstensif dan intensif GAR 2015 (30 meninggal atau 600 rumah hancur) dipakai untuk Indonesia? | Dipakai sebagai label analisis, bukan kelas resmi | P-32 |

### Penyajian dan tata kelola (S dan G)

| Kode | Pertanyaan | [BAWAAN SEMENTARA] | Paradoks |
| --- | --- | --- | --- |
| Q-37 | Apakah DIBI menyimpan kode wilayah saat kejadian dan batas terkini? Siapa memelihara tabel konkordansi pemekaran? | Keduanya disimpan; batas terkini untuk penyajian, batas saat kejadian untuk arsip | P-55 |
| Q-38 | Hari kosong di arsip logbook 2021 sampai 2023: bolong arsip atau tidak ada kejadian? | Diperlakukan sebagai tidak diketahui, bukan nol | P-61 |
| Q-39 | Definisi baku "titik panas" untuk laporan resmi BNPB? | Lokasi unik per hari WIB, dengan nama definisi tertulis di tiap angka | P-43, P-44 |
| Q-41 | Periode rilis data statis dan mekanisme versinya? | Rilis bulanan bernomor versi, dibekukan per triwulan, koreksi sebagai rilis baru dengan tabel angka terbit lawan angka kini | P-46 |
| Q-43 | Bagaimana DIBI mencatat COVID-19 pada 2020 sampai 2023? | Tidak diketahui; tidak dipakai sebagai contoh sampai Pusdatinkom menjawab | P-47 |

## Daftar periksa (belum terverifikasi)

Daftar lengkap semua penanda [BELUM TERVERIFIKASI] di naskah, satu baris naskah per butir, ada di
`riset/DAFTAR-PERIKSA.md` (dibuat ulang dengan `python analisis/daftar_periksa.py`). Butir rinci per kelompok paradoks juga ada di
bagian "Daftar periksa" tiap berkas `naskah/lampiran-a-*.md`. Butir lintas berkas:

1. Teks Juklak 7/2023 dari PDF UNFPA, bukan JDIH BNPB; halaman 1, 10, 26, 52, 53 berupa gambar
   (Q-02). Bunyi enam kriteria (hlm. 7) terbaca utuh.
2. Asal-usul angka 1 orang, 50 orang, 5 unit, 1 hektare tidak ditemukan; ditanyakan ke Pusdatinkom
   (Lampiran E.4 butir 7).
3. Arti resmi kolom DIBI `is_bencana` dan `jumlah_kejadian` pecahan adalah tafsiran dari pola data,
   belum dikonfirmasi Pusdatinkom.
4. Angka logbook harian (meninggal, terdampak, hektare) diurai dari teks bebas dengan pola; hektare
   terbukti terinflasi oleh salah urai dan tidak dipakai untuk menguji K4.
5. Panduan Logbook, Laphar, dan Lapjol Pusdalops adalah draf (Juli 2025); dikutip lewat ringkasan
   `scripts/wa/panduan_resmi.json`.
6. Kriteria EM-DAT, DesInventar, GLIDE, PAGER, GDACS, dan basis data kebakaran dibuka langsung
   (`riset/PUSTAKA.md`); yang tidak bisa dibuka (Australia DRFA, kelas ukuran kebakaran NWCG, IRDR
   2014, NatCat dan Sigma, tahun asal kriteria EM-DAT) ditandai di sana.
7. Selesai (12 Nov 2026): angka "menyala lagi" karhutla 8.933 lawan 6.642 berbeda definisi jeda
   (pasangan deteksi mana pun lawan deteksi terdekat). Naskah memakai 6.642.
8. Selesai (12 Nov 2026): "naik kelas" logbook 124 dari 975 (baru melewati ambang di laporan susulan)
   dan 137 dari 1.317 (kelas terdampak naik pada kejadian multihari) adalah dua ukuran berbeda;
   keduanya sah dan disebut dengan definisinya.
