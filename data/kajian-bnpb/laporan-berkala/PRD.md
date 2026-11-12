# PRD: Laporan Berkala BNPB (harian, mingguan, bulanan, tahunan)

## Tujuan

Untuk tiap periode (hari, minggu, bulan, tahun), staf BNPB bisa menyusun Laporan Bencana periode sebelumnya dalam satu sesi kerja: angka sudah terisi dari sistem, staf hanya menulis bagian kebijakan dan memilih foto, lalu membekukan dan mencetak PDF A4. Angka yang terkirim bisa dilacak kembali ke versi beku dan tanggal tarik sumbernya.

## Pengguna

| Peran | Kerja |
| --- | --- |
| Penyusun (staf ahli, Pusdatinkom) | memilih bulan, memeriksa angka, mengisi kolom staf, memilih foto dan kegiatan, membekukan, mencetak |
| Pembaca (semua pengguna yang masuk situs, K4) | membuka draf, versi beku, dan PDF |
| Presiden | menerima PDF di luar sistem; tidak membuka situs |

Hak per peran: KEPUTUSAN K4, Q22, dan `KEAMANAN-PRIVASI.md`.

## Empat periode (K7, D11)

| | Harian | Mingguan | Bulanan | Tahunan |
| --- | --- | --- | --- | --- |
| Kode | `2026-11-11` | `2026-W46` | `2026-10` | `2026` |
| Kepada (Q23) | Kepala BNPB | Kepala BNPB | Presiden | Presiden |
| Panjang | 2 sampai 4 halaman | 6 sampai 10 halaman | sekitar 25 halaman | sekitar 40 halaman |
| Dirakit | tiap pagi untuk kemarin | Senin sampai Rabu untuk minggu lalu | tanggal 1 sampai 20 untuk bulan lalu | 1 sampai 31 Januari untuk tahun lalu |
| Pembanding | kemarin dan rerata 7 hari | minggu lalu | bulan lalu dan bulan sama tahun lalu | tahun lalu dan rerata 10 tahun |
| Riwayat di grafik | 14 hari | 8 minggu | 11 bulan | 12 bulan dan 10 tahun |
| Sampul dan daftar isi | sampul ringkas tanpa foto, tanpa daftar isi | sampul ringkas, daftar isi | lengkap | lengkap |
| Ringkasan | 4 kartu angka, kejadian menonjol | 4 kartu angka, 4 temuan | seperti contoh | seperti contoh, ditambah tren 10 tahun |
| Bab bencana (karhutla, banjir dan longsor, cuaca dan kekeringan, geologi) | satu halaman gabungan: tabel kejadian hari itu per kab dengan dampak, hotspot hari itu dan belum padam, status surut, perubahan level gunung api | satu bagian per kelompok: tabel, peta ringkas, riwayat 8 minggu | seperti contoh | seperti contoh, ditambah musim (puncak karhutla dan puncak banjir tahun itu), karhutla tahunan: hotspot, luas perkiraan, luas resmi dan luas satelit berdampingan |
| Non-alam dan sosial (K5) | baris dalam tabel kejadian | satu tabel | Bab 1.4 | satu bab |
| Action plan | singkat, satu kotak | per kelompok | per bab | per bab, ditambah rencana tahun depan (kolom staf) |
| Program kerja dan kegiatan | tidak ada | daftar kegiatan minggu itu | Bab 6 | rekap 12 bulan dari versi beku bulanan, dipilih staf |
| Prakiraan ke depan | besok, dari `/prediksi` (+1 hari) dan peringatan BMKG yang sudah ada | sepekan, dari Tangga Peringatan `/prediksi` bila sudah terbit (ALGORITMA 12) | Bab 7.1 (D8) | musim depan, dari `iklim_outlook.json` dan riwayat kejadian per bulan |
| Dukungan dan arahan yang dimohon (Q27) | tidak ada | tidak ada | Bab 7.2 | ada |
| Dokumentasi foto | tidak ada | pilihan, paling banyak 4 | per bab | per bab, paling banyak 12 |
| Lampiran | tidak ada | tabel per provinsi dan jenis | seperti contoh | per provinsi x jenis x bulan, selisih tahunan lawan bulanan beku (D13) |

Isi rinci tiap bab di bawah ditulis untuk bulanan; periode lain mengambil bagian yang sama menurut tabel ini.

## Isi laporan bulanan (acuan: contoh Oktober 2026)

| Bagian | Isi | Diisi oleh |
| --- | --- | --- |
| Sampul | judul "Laporan Bencana <Bulan> <Tahun>", penerima, penyusun (Kepala BNPB, gelar dari konstanta, K3), kota dan tanggal, foto sampul | mesin; tanggal dan foto oleh staf |
| Daftar isi dan "Tentang laporan ini" | halaman tiap bab, tanggal tarik tiap sumber, selisih dengan laporan sebelumnya bila ada | mesin |
| Ringkasan Eksekutif | kalimat pembuka (staf), empat kartu angka, paragraf fakta, empat temuan utama (mesin mengusulkan angka, staf memilih dan menyunting kalimat), dukungan yang dimohon (ringkas dari Bab 7.2) | campuran |
| Bab 1 Gambaran umum | 1.1 kejadian per kelompok (kering, basah, geologi) dan per jenis, tabel 10 provinsi teratas; Gambar 1 kejadian per bulan 11 bulan terakhir; 1.2 dampak dan perbandingan dengan bulan yang sama tahun lalu, kartu rumah rusak; Tabel 3 per jenis; 1.3 action plan umum; 1.4 kejadian non-alam dan sosial (kebakaran gedung dan permukiman, konflik sosial, gagal teknologi, kecelakaan industri, epidemi, lainnya): tabel per jenis dengan dampak, 10 kab terbanyak, riwayat, pembanding tahun lalu (K5) | mesin; action plan oleh staf |
| Bab 2 Karhutla | 2.1 hotspot bulanan, pembanding bulan sebelumnya, puncak harian, peta per provinsi, hotspot per bulan sejak Januari; 2.2 luas terbakar dan belum padam per provinsi; 2.3 laporan daerah lawan satelit; 2.4 action plan dan kartu angka operasi; 2.5 dokumentasi | mesin; 2.4 dan 2.5 oleh staf |
| Bab 3 Banjir dan longsor | 3.1 sebaran dan status surut per kab/kota, peta wilayah terbanyak dengan sisipan Indonesia, tabel kab per provinsi; 3.2 riwayat, pembanding bulan sebelumnya, dan dampak; 3.3 action plan; 3.4 dokumentasi | mesin; 3.3 dan 3.4 oleh staf |
| Bab 4 Cuaca ekstrem dan kekeringan | 4.1 sebaran dan peta, tabel kab/kota dampak terbesar, riwayat; 4.2 action plan; 4.3 dokumentasi; 4.4 hujan tiga bulan ke depan | mesin; 4.2 dan 4.3 oleh staf |
| Bab 5 Geologi dan vulkanologi | 5.1 gempa dan erupsi per peristiwa (dengan penjelasan selisih terhadap jumlah laporan kab di Bab 1), peta, riwayat, status gunung api per tanggal 1 bulan berikutnya; 5.2 action plan; 5.3 dokumentasi | mesin; 5.2 dan 5.3 oleh staf |
| Bab 6 Program kerja | Tabel kegiatan menurut jenis dan pelaksana (Kepala BNPB, Pusdatinkom, Satgas operasi), Tabel kegiatan Kepala BNPB (tanggal, kegiatan, lokasi), Tabel kegiatan satgas dan Pusdatinkom per jenis, jumlah laporan situasi harian yang terbit bulan itu, paragraf penutup, dokumentasi | staf memilih dan menggolongkan dari usulan mesin (Q8); jumlah laporan situasi harian diisi staf |
| Bab 7 | 7.1 prediksi dua bulan berikutnya (peluang banjir dan longsor per kab/kota, indeks ENSO, D8); 7.2 dukungan yang dimohon (tabel langkah, rincian, penanggung jawab, waktu); 7.3 temuan utama untuk musim berikutnya (paling banyak 8 kartu berpil kategori); arahan yang dimohon; penutup dan tanda tangan | 7.1 mesin; 7.2, arahan, dan pilihan temuan oleh staf |
| Lampiran | Tabel 10 kejadian per provinsi dan jenis; sumber data; catatan metode; daftar kegiatan dan tautan sumber | mesin dari pilihan staf |

## Fitur

| ID | Fitur | Terima bila |
| --- | --- | --- |
| F-1 | Pilih periode dan kodenya di `/laporan_bnpb` jenis "Laporan Berkala" | periode berjalan tidak bisa dipilih; periode yang sudah beku membuka versi terakhirnya |
| F-2 | Perakit angka bulanan: satu berkas angka per bulan dari sumber yang ada (`DESAIN-TEKNIS.md`) | tiap angka di PDF berasal dari berkas ini; tiap sumber membawa tanggal tarik |
| F-3 | Kolom staf: kalimat pembuka, action plan per bab, kotak catatan per bab (contoh catatan gempa NTT di Bab 5), dukungan yang dimohon, arahan, temuan terpilih, angka operasi bersumber (Q15) | kolom kosong tampil sebagai "belum diisi" di pratinjau dan menahan tombol Bekukan |
| F-4 | Usulan temuan utama dari angka (contoh: provinsi hotspot terbanyak dengan laporan DIBI paling sedikit) | tiap usulan menyebut angka dan sumbernya; staf memilih paling banyak empat |
| F-5 | Kegiatan dan dokumentasi: daftar calon dari siaran pers, unggah foto dengan kredit | baris dan foto hanya masuk bila dipilih staf (Q7, Q8) |
| F-6 | Bekukan: simpan versi `vN` lengkap (angka, isian, tanggal tarik, siapa, kapan) | versi lama tetap bisa dibuka dan dicetak persis sama |
| F-7 | Cetak PDF A4 dari pratinjau | 25 halaman lebih kurang; nomor halaman dan daftar isi cocok; versi dan tanggal tarik tercetak di halaman "Tentang laporan ini"; draf tercetak bertanda air |
| F-8 | Beda versi: bila DIBI berubah sesudah bekukan, layar menunjukkan angka mana yang berubah | daftar selisih per angka, tanpa mengubah versi beku |

## Larangan

- Tidak ada versi publik tanpa masuk situs (Q22).
- Mesin tidak mengarang isi kolom staf (D2), dan tidak menulis "aman".
- Angka karhutla hanya dari sistem (D4); angka antarsumber tidak dijumlah (D5).
- Tidak membuat buku kejadian kedua atau panen DIBI sendiri (D6).
- Tidak menimpa versi beku (D3).
- Tidak memakai foto media tanpa tanda izin dan kredit (Q7).
- Tidak memakai titik tengah sebagai pemisah; angka format Indonesia; tanpa kapital selain singkatan (Q5).

## Di luar cakupan fase 1

PPTX (Q10), kirim otomatis ke penerima, tanda tangan elektronik, nomor surat, laporan bulanan per provinsi, versi bahasa Inggris.
