# RISET: Simulasi tsunami dengan genangan darat

Bagian 1 sampai 3 diperiksa di repo ini pada 23 Nov 2026. Bagian 4 sampai 6 adalah pengetahuan umum yang belum diperiksa ke sumbernya di sesi ini; tiap butir bertanda **[periksa]** wajib dikonfirmasi ke dokumentasi atau halaman resmi oleh tiket yang memakainya sebelum menjadi dasar keputusan. Tidak ada angka kinerja (waktu hitung, jumlah inti, ukuran berkas) yang ditulis di sini: semuanya diukur di tiket.

## 1. Yang sudah ada di repo

| No | Temuan | Berkas | Dipakai oleh |
| --- | --- | --- | --- |
| B1 | Model tsunami peramban: `Tsunami.layak(e)` (M >= 6,5, faktor kedalaman > 0, jejak bidang patahan <= 20 km dari sel laut), `rupture(e)` (panjang, lebar, slip seragam, angkatan awal), `waktuTiba` (Dijkstra, 16 tetangga), `tinggi` (Abe 1995, rentang 0,5 sampai 2 Hr), `swe` (stepper air dangkal linear grid Arakawa C, pantai = dinding, penyerap di tepi kotak). | `public/gempa/tsunami.js` | D1, D5, D9 |
| B2 | Batas model yang sudah tertulis: linear, tanpa pecah gelombang, tanpa genangan, tanpa Okada, tanpa gesekan, tanpa dispersi, resolusi sekitar 5,5 km, longsor dan gempa tsunami lambat tidak dimodelkan; Pangandaran 2006 meleset (model 0,3 sampai 1,1 m, pengamatan 5 sampai 8 m). | `public/gempa/metode.js` fungsi `tsunami()` | D7, D8 |
| B3 | Batimetri ETOPO 2022 (NOAA NCEI) 3 menit busur dalam `batimetri.bin` dan `batimetri.json`, dibuat oleh `scripts/gempa/batimetri.py`. | `public/gempa/data/batimetri.*`, `scripts/gempa/batimetri.py` | D3 |
| B4 | Uji invarian fisik stepper dijalankan lewat node. | `scripts/gempa/uji_js_tsunami.py` | D15 |
| B5 | Tab Simulasi dan tombol "Simulasikan" per gempa di laci rincian (tautan `/gempa/sim?lat=&lon=&m=&dalam=`). | `public/gempa/sim.js`, `public/gempa/laci.js` baris 37 | F1 sampai F7 |
| B6 | Katalog tsunami BMKG: 195 baris lampiran dan 173 baris wilayah, per kejadian, tanpa koordinat run-up per lokasi. Arsip InaTEWS per buletin termasuk tinggi muka air terukur (maksimum 0,94 m pada kejadian 15 Agu 2026) di teks `judul`. | `public/gempa/data/katalog_tsunami.json`, `inatews_tsunami.json` | D10 |
| B7 | Zona peringatan BMKG dipetakan ke kabupaten/kota (60 zona unik). | `scripts/gempa/tsunami_zona.py`, `public/gempa/tsunami_zona.js`, `zona_tsunami_kamus.json` | F3, TS-13 |
| B8 | Pembacaan DART realtime dan deteksi. | `scripts/gempa/dart.py`, `public/gempa/data/dart.json` | D10 |
| B9 | Medan untuk genangan sudah dipakai modul banjir: DEMNAS 8 m (diunduh manual pemilik, hanya Jakarta, `scripts/banjir/genangan/medan.py`), Copernicus GLO-30 (AWS terbuka, cadangan di `medan.py`), FABDEM 1 detik busur (`scripts/banjir/fabdem.mjs`; lisensi CC BY-NC-SA 4.0, "hanya untuk uji dan kajian non-komersial, tidak disajikan di layar publik"). | berkas yang disebut | D3, Q2 |
| B10 | Paparan bangunan memakai grid Google Open Buildings 0,01 derajat (sekitar 1,1 km), dikunci, dan dicatat kasar sekitar 0,8 km. Terlalu kasar untuk genangan; Overture bangunan tercatat di registri sumber. | `scripts/umum/paparan_bangunan.py`, `scripts/siklus/sumber.json` (id `overture-buildings`) | Q13 |
| B11 | Contoh pola paket yang sama: modul Silang Sumber memuat tsunami per zona (F2) dan menyatakan "peta waktu tiba tetap gambar BMKG"; paket ini tidak menggantikan itu. | `data/kajian-bnpb/silang-sumber/PRD.md` | batas lingkup |

## 2. Yang belum ada di repo

| No | Kekurangan | Ditangani |
| --- | --- | --- |
| C1 | DEM darat rapat di pesisir selain Jakarta. | TS-06 |
| C2 | Batimetri dekat pantai di bawah 3 menit busur. | TS-06 |
| C3 | Mesin hitung nonlinear basah-kering; tidak ada di peramban dan tidak ada di Python stdlib. | TS-10, TS-11 |
| C4 | Sumber Okada (dislokasi permukaan patahan berhingga). | TS-04 |
| C5 | Data run-up historis per lokasi. | TS-03 |
| C6 | Kekasaran dasar daratan (penggunaan lahan, bangunan) untuk koefisien gesekan. | TS-07 |
| C7 | Uji balik apa pun terhadap kejadian tsunami nyata. | TS-14 sampai TS-16 |
| C8 | Bentuk keluaran per pantai dan pembaca di peramban. | TS-12, TS-17 |

## 3. Rujukan tampilan (K1)

Dari video rujukan, hal yang dilihat dan dipetakan ke fitur: label waktu "T + N menit" (F1), zoom ke satu pantai (F2), peta genangan berwarna menurut kedalaman dengan legenda meter 0 sampai 8 (F3), angka "sekitar 1% semenanjung tergenang" (F4), titik run-up (F5), batang run-up historis per lokasi dengan tahun dan tinggi (F6). Isi video tidak disalin; dokumen ini tidak memuat tangkapan atau kutipan dari akun itu.

## 4. Mesin hitung terbuka: bahan perbandingan

Semua kolom lisensi dan keterbatasan bertanda **[periksa]** sampai TS-02 selesai. Tidak ada klaim kecepatan.

| Mesin | Yang dikenal | Yang harus diperiksa untuk repo ini |
| --- | --- | --- |
| GeoClaw (proyek Clawpack) | Persamaan air dangkal nonlinear, penyempurnaan grid adaptif (AMR) otomatis, basah-kering, gesekan Manning, sumber awal Okada lewat perkakas dtopo, antarmuka Python, Fortran. **Lisensi BSD 3-klausul, terkonfirmasi (TS-02, lihat 4.1).** Dokumentasi GeoClaw memuat penyelesai Boussinesq dua dimensi (SGN, Madsen-Sorensen) sebagai opsi dispersi. Uji tolok ukur NTHMP tersedia sebagai repo terbuka (4.1). | Cara memasang di runner CI (belum), versi yang dikunci (5.14.0 saat ini), kebutuhan memori untuk kotak pantai (diukur di TS-11), format DEM masukan. **Pemasangan di Mac pemilik terhalang: gfortran belum ada (4.1).** |
| COMCOT | Grid bersarang, linear dan nonlinear, Fortran. | Syarat lisensi dan distribusi, status pemeliharaan, kebutuhan Fortran. |
| JAGURS | Grid bersarang, paralel MPI, dispersi, Fortran. | Lisensi dan cara memperoleh kode, kebutuhan MPI, ketersediaan mesin. |
| Tsunami-HySEA | Dijalankan di GPU, grid bersarang, dipakai pada tolok ukur NTHMP **[periksa]**. | Syarat lisensi; ketersediaan GPU (runner standar GitHub tidak punya GPU **[periksa]**). |
| Celeris | Boussinesq berbasis GPU, bisa waktu nyata untuk skala lokal. | Lisensi; kecocokan untuk skala pantai kota dan skenario tsunami jauh. |
| Mesin NOAA (MOST/ComMIT) | Dipakai operasional NOAA. | Ketersediaan kode ke publik **[periksa]**; mungkin tidak terbuka. |

Kriteria pemilihan mesin (D4): lisensi yang mengizinkan dipakai dan dijalankan ulang oleh pihak lain; dapat dijalankan tanpa GPU dulu; keluaran kedalaman maksimum dan waktu tiba bisa dibaca dengan stdlib atau paket kecil; ada kasus uji tolok ukur yang bisa dijalankan ulang di repo.

### 4.1 Hasil TS-02 (24 Nov 2026): GeoClaw

Diperiksa langsung ke sumber hari ini; butir yang tidak bisa dicapai ditandai.

| Butir | Temuan | Sumber |
| --- | --- | --- |
| Lisensi | BSD 3-Clause, "Copyright (c) 1994-2018, Clawpack Developers". Sama untuk repo `clawpack/clawpack` dan `clawpack/geoclaw`. Metadata PyPI: `BSD-3-Clause`. Mengizinkan dipakai, dijalankan ulang, dan didistribusikan ulang dengan atribusi. Syarat atribusi masuk bab Metode. | https://raw.githubusercontent.com/clawpack/geoclaw/master/LICENSE ; https://pypi.org/pypi/clawpack/json |
| Versi terkini | clawpack 5.14.0 (PyPI). Kunci versi saat TS-10. | https://pypi.org/project/clawpack/ |
| Prasyarat | Untuk GeoClaw (Fortran): gfortran atau kompilator F90 lain, Xcode developer tools di Mac (untuk `make`), Python 3, NumPy, pip, git. PyClaw saja tidak butuh Fortran, tetapi GeoClaw butuh. | https://www.clawpack.org/prereqs.html |
| Cara pasang yang dianjurkan | `pip install --src=$HOME/clawpack_src --user --no-build-isolation -e git+https://github.com/clawpack/clawpack.git@v5.14.0#egg=clawpack`, lalu variabel lingkungan `CLAW` menunjuk ke `clawpack-v5.14.0`; kasus dijalankan dengan `make` di folder contoh. | https://www.clawpack.org/installing_pip.html |
| Mac pemilik | `gcc`, `clang` ada, `gfortran` TIDAK ada; Homebrew ada (`brew info gcc` = 16.2.0, paket gcc membawa gfortran). Python sistem 3.9, python3.11 ada di `~/.local/bin`. | diperiksa lokal |
| Percobaan pasang | Dicoba di venv `data/raw/tsunami/venv` (gitignored, Python 3.11): `pip install clawpack` GAGAL pada tahap metadata, galat meson `Unknown compiler(s): gfortran, flang, ifort, ...` (gfortran tidak ditemukan). Pemasangan TIDAK ringan di mesin ini: butuh `brew install gcc` (paket global, belum dilakukan, butuh izin pemilik) atau conda. Tidak ada paket global yang dipasang. | percobaan 24 Nov 2026 |
| Tolok ukur | Repo terbuka `rjleveque/nthmp-benchmark-problems` memuat BP01 sampai BP11 dari lokakarya NTHMP, antara lain BP01/BP04 gelombang tunggal di pantai sederhana, BP02 gelombang soliter pantai komposit (analitik), BP05 komposit (laboratorium), BP06 pulau kerucut (Conical Island), BP07 lembah Monai, BP09 Pulau Okushiri, BP10 longsor PNG. Repo `clawpack/geoclaw` memuat contoh `examples/tsunami` (chile2010, bowl-radial, dtopo, dan lain-lain) yang dipakai untuk memeriksa pemasangan. Rencana TS-10: jalankan BP01 (analitik) dan BP06 (Conical Island) serta Monai bila waktunya cukup, dan catat hasil jujur, bukan klaim lulus. | https://github.com/rjleveque/nthmp-benchmark-problems ; https://github.com/clawpack/geoclaw/tree/master/examples/tsunami |
| Standar evaluasi | Kriteria tolok ukur model tsunami NOAA (Synolakis dkk. 2007, NOAA Technical Memorandum OAR PMEL-135) dan keluaran lokakarya NTHMP 2011 menjadi acuan butir "uji tolok ukur lereng dan gelombang soliter" di TS-10. **[periksa]**: dokumen itu belum dibuka di sesi ini; rujukan ditulis dari ingatan literatur dan wajib dicek sebelum dikutip di bab Metode. | belum diverifikasi |
| Sumber Okada | Perkakas `dtopotools.py` GeoClaw berisi implementasi Okada 1985 (vertikal), BSD, yang rumusnya dipakai sebagai pemeriksa silang padanan Python di `scripts/gempa/tsunami_sumber.py` (TS-04; dip-slip cocok dengan integrasi sumber titik 0,5 persen). Suku strike-slip I4 versi sumber titik GeoClaw tidak cocok dengan versi hingga; dicatat di kasus ilmu. | https://github.com/clawpack/geoclaw/blob/master/src/python/geoclaw/dtopotools.py |

Putusan sementara TS-02: lisensi GeoClaw memenuhi D4; kriteria "tanpa GPU" terpenuhi; kriteria "bisa dijalankan ulang di repo" terpenuhi lewat tolok ukur NTHMP; syarat "dapat dipasang di mesin pemilik" BELUM terpenuhi sampai gfortran tersedia. Pertanyaan ke pemilik (Q18, baru): izinkan `brew install gcc` (atau conda) di Mac untuk melanjutkan TS-10? Mesin lain (COMCOT, JAGURS, Tsunami-HySEA, Celeris, MOST) tidak diperiksa lebih lanjut karena K3 memilih GeoClaw; kolom **[periksa]** di atas untuk mesin itu tetap berlaku bila K3 dibatalkan.

## 5. Sumber data: bahan dan syarat

| Data | Sumber | Syarat atau catatan |
| --- | --- | --- |
| Run-up historis | NOAA NCEI/WDS Global Historical Tsunami Database: layanan data kejadian dan run-up (layanan REST di domain `ngdc.noaa.gov`, jalur `hazard-service/api/v1/tsunamis/runups`) **[periksa alamat dan nama kolom saat TS-03]**. | Data pemerintah AS; atribusi wajib dituliskan. Disaring ke Indonesia dan ke kode validitas kejadian pasti **[periksa makna kode]**. Tidak ditarik tiap muat halaman; ditarik sekali per tiket dan disimpan di repo. |
| DEM darat | DEMNAS (BIG), Copernicus GLO-30 (terbuka lewat AWS), FABDEM | Pemilik mengizinkan DEMNAS di layar publik dan menyediakan lembar pesisir (K4); atribusi BIG dicatat. DEMNAS berupa DSM-hidro tahun tertentu (lihat `medan.py`), jadi tinggi tanah bisa berbeda dari tahun kejadian. GLO-30 hanya cadangan: model permukaan, pohon dan bangunan ikut tinggi, sehingga genangan di bawah kanopi cenderung diremehkan. FABDEM berlisensi non-komersial, tidak untuk layar publik. |
| Batimetri | ETOPO 2022 (sudah ada), GEBCO, BATNAS BIG | GEBCO terbuka dengan atribusi **[periksa]**; BATNAS **[periksa lisensi dan format]**. |
| Kekasaran | WorldCover (ESA, terbuka) dan jejak bangunan Overture | Dipakai menurunkan koefisien Manning per kelas lahan; tabel Manning yang dipakai diberi sumber di ALGORITMA. |
| Geometri subduksi | Slab2 (USGS) | Bila dipakai (Q11). Data USGS umumnya domain publik **[periksa]**. |
| Sumber inversi | USGS finite-fault, SRCMOD | Hanya untuk uji sensitivitas (Q10); lisensi **[periksa]**. |

## 6. Kejadian uji balik: apa yang diketahui dan apa yang belum

Kelas ditentukan dari sifat sumber dan ketersediaan data, tidak dari hasil hitungan (ALGORITMA 8.1; K6). Kolom kelas di bawah adalah DUGAAN AWAL dari pengetahuan umum **[periksa literatur]**; tiap kelas dikunci di TS-14 setelah ketersediaan titik di NCEI dicek di TS-03. Kejadian yang titiknya kurang dikeluarkan dari kedua kelas dengan alasan tertulis. Dugaan ini mengubah catatan awal sebelumnya: Mentawai 2010 dan Banyuwangi 1994 dikenal sebagai gempa tsunami dengan rupture lambat, jadi masuk kelas B menurut aturan sifat sumber (sebelumnya Mentawai ditulis kelas A bersyarat dengan alasan yang bergantung hasil uji awal, dan itu dihapus karena bocor).

| Kejadian | Sumber | Catatan awal | Kelas |
| --- | --- | --- | --- |
| Aceh dan Samudra Hindia 26 Des 2004, M 9,1 | subduksi, patahan sangat panjang | run-up dan genangan terdokumentasi luas; panjang rupture jauh melebihi satu bidang seragam, jadi bagi menjadi beberapa segmen (TS-04). Kandidat kejadian pengembangan (disetel, tidak ikut vonis). | A (dugaan), pengembangan |
| Mentawai 25 Okt 2010, M 7,8 | subduksi dangkal, dikenal sebagai gempa tsunami (rupture lambat) | tsunami lebih besar dari yang ditunjukkan magnitudonya; sumber seragam diperkirakan meleset seperti Pangandaran. | B (dugaan) |
| Banyuwangi 3 Jun 1994, M 7,8 | subduksi selatan Jawa Timur, dikenal sebagai gempa tsunami (rupture lambat) | K1 menyebut Rajegwesi 13,9 m (NCEI), tetap tampil sebagai batang run-up historis. Nilai diverifikasi di TS-03. | B (dugaan) |
| Flores 12 Des 1992, M 7,8 | kerak naik, tsunami lokal tinggi | usulan tambahan; ketersediaan titik dicek di TS-03. | A (dugaan, bila data cukup) |
| Pangandaran 17 Jul 2006, M 7,7 | tsunami gempa (rupture lambat) | tab Metode sudah mencatat model meleset (0,3 sampai 1,1 m lawan 5 sampai 8 m). | B |
| Palu 28 Sep 2018, M 7,5 | sesar geser, tsunami terutama dari longsor bawah laut dan efek teluk | Okada seragam akan meremehkan; tab Metode menulis longsor tidak dimodelkan. | B |
| Selat Sunda 22 Des 2018 | runtuhnya sisi Anak Krakatau, bukan gempa | butuh sumber longsor; K1 memakainya sebagai contoh tampilan. | B |

## 7. Metode lazim untuk membandingkan model dan pengamatan

| Metode | Dipakai untuk | Catatan |
| --- | --- | --- |
| Ukuran Aida K dan kappa | membandingkan tinggi hitung dan tinggi amatan di banyak titik | K = exp(rata-rata ln(Ri)), dengan Ri = amatan/hitung; kappa = exp(simpangan baku ln(Ri)). Batas JSCE **[periksa]**. |
| Selisih log rata-rata dan akar kuadrat galat log | pembanding model lawan model | dipakai untuk mengalahkan pembanding Abe. |
| Selang kepercayaan bootstrap | menyatakan ketidakpastian dari n titik kecil | titik dalam satu kejadian tidak bebas; resampel per kejadian, bukan per titik. |
| Uji balik temporal | mencegah model ditala pada kejadian uji | PELATIHAN-MODEL: uji dibuka sekali. |

## 8. Yang tidak diriset di sini

Peringatan dini dan keputusan evakuasi (milik BMKG); waktu berjalan dan titik evakuasi (sudah di tab Evakuasi, `public/gempa`); model kerugian ekonomi; sumber tsunami dari gunung api. Semuanya di luar lingkup (PRD).
