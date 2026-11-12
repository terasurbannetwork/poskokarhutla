# ALGORITMA: Laporan Berkala

Pembagian tempat hitung (satu tempat per rumus, tidak disalin):

- `scripts/berkala/hitung.py` (Python stdlib, fungsi murni): bagian 1 sampai 9. Semua pembulatan terjadi di sini, sekali, setengah ke atas (`decimal.ROUND_HALF_UP`), lalu disimpan di berkas angka.
- `public/laporan_berkala_hitung.js` (modul ES murni): bagian 10 dan 11, plus format tampilan angka yang sudah dibulatkan. Modul yang sama diimpor `src/laporan_berkala.js` untuk pemeriksaan kelengkapan di server (pola impor `../public/` yang sudah dipakai `src/meja.js`, `src/sippa.js`).

Nilai yang ditandai **[BAWAAN SEMENTARA]** belum diputuskan pemilik; daftarnya di KEPUTUSAN Q18 sampai Q21.

## 1. Jendela bulan

Bulan laporan `B` = tanggal 1 sampai hari terakhir `B`. DIBI hanya punya tanggal kejadian (tanpa jam), jadi pemilihan memakai tanggal saja. Hotspot memakai deret harian `peta_karhutla.json` yang sudah dihitung per hari WIB oleh pipeline karhutla; laporan bulanan tidak menghitung ulang zona waktu. Bulan berjalan ditolak (`rakit.py` keluar dengan galat bila `B` belum selesai).

## 2. Kejadian DIBI

Bentuk masukan: `public/data/dibi_kejadian.json` `kejadian[]`, satu baris per (tanggal, jenis, kab), kolom `kejadian` = banyak kejadian di baris itu, kolom dampak `meninggal, hilang, luka, terdampak, mengungsi, rr_berat, rr_sedang, rr_ringan, terendam, f_pendidikan, f_kantor, jembatan, f_umum` (tidak ada = 0).

1. **Jumlah kejadian = jumlah kolom `kejadian`**, bukan banyak baris.
2. **Peta jenis** (nama mentah DIBI ke jenis laporan). Jenis mentah yang tidak ada di tabel membuat `rakit.py` gagal dengan daftar nama baru, supaya tidak ada yang hilang diam-diam.

| Jenis laporan | Nama mentah DIBI |
| --- | --- |
| Kebakaran hutan dan lahan | Kebakaran Hutan dan Lahan, Kebakaran Lahan, Kebakaran Hutan, Kebakaran Lahan Gambut |
| Banjir | Banjir, Banjir Bandang, Banjir Genangan, Banjir Rob, Banjir Lahar (Lahar), Banjir dan Tanah Longsor (K5; jumlahnya disebut sendiri di Bab 3.2) |
| Tanah longsor | Tanah Longsor, Gerakan Tanah |
| Cuaca ekstrem | Cuaca Ekstrem, Angin Kencang, Angin Topan, Puting Beliung |
| Kekeringan | Kekeringan, Kekeringan Pertanian |
| Gelombang pasang dan abrasi | Gelombang Pasang / Abrasi, Gelombang Pasang, Abrasi Pantai |
| Gempa bumi | Gempabumi, Gempabumi Reruntuhan, Gempa Bumi dan Tsunami |
| Erupsi gunung api | Erupsi Gunung Api |
| Non-alam dan sosial (bagian sendiri, Bab 1.4, K5) | Kebakaran Gedung dan Permukiman, Konflik Sosial, Gagal Teknologi, Kecelakaan Industri, Epidemi dan Wabah Penyakit, Lainnya |

   Angka utama Bab 1.1 sampai 1.3 hanya bencana alam (sebanding dengan contoh Oktober). Kejadian non-alam dan sosial disebut jumlahnya di paragraf 1.1 dan diolah di bagian 2.9.
3. **Kelompok**: kering = karhutla + kekeringan; basah = banjir + longsor + cuaca ekstrem + gelombang pasang; geologi = gempa + erupsi. Jumlah tiga kelompok = jumlah bencana alam (uji H4).
4. **Duplikat antarkab**: catatan metode contoh menulis "baris yang mencatat dampak identik pada tanggal dan jenis yang sama di dua kabupaten dihitung sekali". **[BAWAAN SEMENTARA, Q20]** aturan hanya berlaku untuk baris yang punya paling sedikit satu kolom dampak lebih dari 0 (baris tanpa dampak, misalnya kebanyakan karhutla, tidak pernah dianggap duplikat). Untuk tiap kelompok (tanggal, jenis laporan, seluruh kolom dampak sama) di lebih dari satu kab: dampak dihitung sekali, kejadian tetap dihitung per kab. Banyak baris yang kena aturan ini dicatat (`duplikat_dampak`).
5. **Dampak turunan**: "meninggal dan hilang" = meninggal + hilang; "terdampak dan mengungsi" = terdampak + mengungsi (Tabel 2 dan 3 contoh); "rumah rusak" = rr_berat + rr_sedang + rr_ringan; "fasilitas umum rusak" = f_pendidikan + f_kantor + f_umum; jembatan terpisah; "luka" = luka.
6. **Agregat**: per jenis, per kelompok, per provinsi x kelompok, per provinsi x jenis, per kab x jenis. Jumlah provinsi dan kab = banyak kode berbeda dengan kejadian lebih dari 0.
7. **Riwayat 11 bulan** (Gambar 1, 6, 8, 11): langkah 1 sampai 6 untuk tiap bulan `B-10 .. B`.
8. **Bulan sebelumnya** (`B-1`): angka yang sama untuk kalimat pembanding di bab (contoh: "hampir sama dengan September yang mencatat 470.586 hotspot", "naik dari 28 kejadian pada September").
9. **Non-alam dan sosial (Bab 1.4, K5)**: per jenis: kejadian, provinsi, kab, meninggal dan hilang, luka, terdampak dan mengungsi, rumah rusak, fasilitas rusak; tabel 10 kab terbanyak dengan jenisnya; riwayat 11 bulan per jenis; pembanding tahun lalu (bagian 3). Baris "Lainnya" tampil apa adanya dengan catatan bahwa DIBI tidak merinci jenisnya. Angka ini tidak pernah dijumlahkan ke angka bencana alam.

## 3. Perbandingan tahun lalu

Sumber per KEPUTUSAN Q3. Perubahan = `(kini - lalu) / lalu`, satu desimal, kata "naik" atau "turun". `lalu = 0` dan `kini > 0`: "baru", tanpa persen. Keduanya 0: "tetap 0". Kalimat perbandingan selalu menyebut sumber dan tanggal tarik keduanya.

## 4. Karhutla

Satu sumber: `public/data/peta_karhutla.json` `prov[kode]` dengan deret harian `hot`, `luas`, `belum`, `padam` (indeks hari dari tanggal awal berkas). Supaya pergantian tahun tidak memutus deret (laporan Desember disusun Januari), `rakit.py` menyimpan potongan hari itu ke R2 tiap hari (ALUR 1), dan perhitungan bulan memakai potongan tersimpan.

1. Hotspot bulanan per provinsi = jumlah `hot` harian dalam `B`. Definisi hotspot tetap definisi pipeline (lokasi unik per hari, MODIS dan VIIRS, semua tingkat keyakinan).
2. Puncak = hari dengan jumlah `hot` nasional terbanyak; hari terakhir = nilai tanggal terakhir `B`. Penurunan dari puncak = `(puncak - akhir) / puncak`.
3. Luas terbakar perkiraan per provinsi = jumlah `luas` harian dalam `B`.
4. Belum padam per provinsi = nilai `belum` pada tanggal terakhir `B`.
5. Peta provinsi: kelas hotspot seperti contoh (di bawah 2.000; 2.000 sampai 8.000; 8.000 sampai 20.000; 20.000 sampai 60.000; di atas 60.000) **[BAWAAN SEMENTARA, Q21]**, delapan provinsi teratas diberi label.
6. Laporan daerah lawan satelit (Gambar 4): 8 provinsi hotspot teratas, hotspot dan jumlah kejadian karhutla DIBI berdampingan; tanpa rasio atau skor (KEPUTUSAN D5). Kalimat 2.3 menyebut n provinsi teratas dan persen hotspot nasionalnya, dengan n = **[BAWAAN SEMENTARA, Q21]** 6 (seperti contoh).

## 5. Banjir dan longsor

1. Kab terdampak banjir: semua di peta; tabel diurut per provinsi (provinsi dengan terdampak terbesar dulu), di dalam provinsi diurut terdampak menurun, paling banyak **[BAWAAN SEMENTARA, Q21]** 14 baris seperti contoh.
2. Peta banjir: wilayah peta = kotak batas kab banjir terbanyak dengan sisipan peta Indonesia (contoh Gambar 5: Sumatera bagian utara).
3. Status surut per kab: dari potongan harian dalops banjir yang disimpan `rakit.py` tiap hari (ALUR 1), bukan dari satu tarikan tanggal 1, karena `dalops/banjir.json` hanya menyimpan 30 hari terakhir (`scripts/data/dalops_banjir.py`). Kode kab dinormalkan ke bentuk `PP.KK` DIBI (dua digit provinsi, titik, dua digit kab) sebelum dicocokkan. Status pada hari terakhir `B`: `surut: true` = Sudah surut; laporan terakhir menyebut belum surut atau "berangsur surut" = Belum surut; kab DIBI tanpa satu pun baris dalops di bulan itu = Belum dilaporkan. Tiga angka berjumlah sama dengan kab banjir (uji H8). Sebelum potongan harian berjalan sebulan penuh (bulan pertama), status dari tarikan dalops yang ada dan catatan metode menyebut keterbatasannya.

## 6. Cuaca ekstrem, kekeringan, hujan ke depan

Kab terdampak dari DIBI; tabel dampak terbesar paling banyak **[BAWAAN SEMENTARA, Q21]** 12 baris. Hujan tiga bulan ke depan dari `public/data/iklim_outlook.json` (K6): butir `prakiraan[]` yang `bulan_tengah`-nya bulan sesudah `B` (contoh Oktober: musim Okt sampai Des), nilai `wilayah[w].anom_pct` per wilayah (`aceh_sumut`, `sumatra_tengah_selatan`, `jawa`, `kalbar_kalteng`, `kaltim_kaltara`, `sulawesi`, `bali_nt`, `maluku`, `papua`, `nasional`), hanya wilayah ber-`tampil: true`, dengan rentang `p10` sampai `p90` di `title`. Sumber ditulis "Model statistik GIS BNPB (CHIRPS, NOAA RONI, DMI)" dan tanggal `dibuat` berkas. Bila butir itu bertanda `ekstrapolasi` atau `di_luar_rentang`, catatan metode menyebutnya.

## 7. Geologi

1. Bab 1 dan Lampiran: jumlah kolom `kejadian` DIBI gempa dan erupsi (laporan per kab).
2. Bab 5: per peristiwa. Satu peristiwa = satu kejadian di `public/gempa/data/*` (atau satu erupsi di data gunung api) yang punya paling sedikit satu baris DIBI pada tanggal yang sama atau sehari sesudahnya di provinsi yang sama. Baris DIBI yang tidak cocok dengan data gempa dihitung satu peristiwa per baris. Selisih Bab 1 lawan Bab 5 dijelaskan di catatan metode (contoh: 5 laporan, 4 peristiwa).
3. Status gunung api: hitungan per level dari `public/gunungapi/data/gunung.json` pada potongan tanggal 1 bulan berikutnya, nama gunung Level III dan IV.

## 8. Prediksi dua bulan berikutnya (Bab 7.1)

Dari `public/data/logbook_riwayat.json` (kab x jenis x bulan per tahun, `tahun_penuh`). Untuk bulan `B+1` dan `B+2`, kab berpeluang tinggi untuk jenis j = kab yang tercatat paling sedikit satu kejadian j pada bulan itu di paling sedikit separuh tahun penuh (definisi contoh: "paling sedikit separuh dari sembilan tahun pengamatan"). Jenis: banjir dan longsor. Indeks ENSO (contoh: "indeks Pasifik bernilai 1,97") = `keadaan_sekarang.roni.nilai` di `public/data/iklim_outlook.json` beserta musimnya (K6). Teks wajib: "Angka ini bukan prakiraan resmi BMKG".

## 9. Usulan temuan (F-4)

Mesin mengusulkan; staf memilih paling banyak 4 untuk Ringkasan Eksekutif dan paling banyak 8 untuk Bab 7.3 (contoh memuat 8 kartu berpil kategori: karhutla, data, banjir, iklim, prediksi, vulkanologi). Syarat dan ambang semua **[BAWAAN SEMENTARA, Q18]**:

| Kode | Pil | Syarat | Isi usulan |
| --- | --- | --- | --- |
| T1 | karhutla | hotspot `B` lebih dari 50.000 | jumlah hotspot, persen di n provinsi teratas, penurunan dari puncak |
| T2 | data | ada provinsi hotspot teratas dengan karhutla DIBI 0 | jumlah provinsi dan jumlah laporan DIBI-nya |
| T3 | banjir | ada kab banjir belum surut atau belum dilaporkan | jumlah per status |
| T4 | vulkanologi | rumah rusak akibat gempa lebih dari 0, atau gunung api Level III/IV | rumah rusak, nama gunung |
| T5 | karhutla | belum padam akhir bulan lebih dari 0 | luas belum padam |
| T6 | prediksi | kab berpeluang tinggi banjir atau longsor bulan berikutnya lebih dari 0 | jumlah kab |
| T7 | iklim | indeks ENSO tersedia | nilai dan golongan |

Kalimat usulan berisi fakta berangka saja, tanpa saran dan tanpa kata "aman". Usulan yang dibutuhkan pimpinan tapi tidak dihasilkan aturan (contoh "Tanggul Langkat perlu diperbaiki") ditulis staf sebagai temuan bebas, berpil, dengan angka dan sumber wajib.

## 10. Kelengkapan sebelum Bekukan (modul JS, dipakai layar dan server)

Bekukan ditolak bila: sumber DIBI tidak berstatus ok; kalimat pembuka kosong; action plan kosong di ketiga kolom untuk bab yang punya kejadian di `B`; dukungan yang dimohon kosong; temuan Ringkasan 0; ada foto tanpa kredit; ada foto media tanpa centang izin. Pesan menyebut bagian yang kurang.

## 11. Beda versi (modul JS)

Berkas angka diratakan menjadi pasangan `jalur -> nilai` (contoh `bab1.jenis.banjir.kejadian -> 55`). Beda = jalur dengan nilai berbeda antara angka versi beku dan angka terbaru, diurut menurut besar perubahan relatif. Hanya bilangan dan teks pendek yang dibandingkan.

## 12. Periode lain (D11)

Semua langkah di atas ditulis untuk bulan `B`. Untuk periode lain, `B` diganti rentang periodenya; rumus tidak berubah. Yang berbeda:

| Hal | Harian | Mingguan | Tahunan |
| --- | --- | --- | --- |
| Rentang | satu tanggal | Senin sampai Minggu minggu ISO (Q24) | 1 Januari sampai 31 Desember |
| Riwayat (langkah 2.7) | 14 hari | 8 minggu | 12 bulan, dan 10 tahun dari `dibi_kab_tahun.json` plus tahun berjalan |
| Pembanding (bagian 3) | kemarin, dan rerata 7 hari sebelumnya | minggu sebelumnya | tahun lalu, dan rerata 10 tahun |
| Karhutla (bagian 4) | hotspot hari itu, belum padam akhir hari itu, puncak tidak dihitung | jumlah, puncak harian, belum padam hari Minggu | jumlah, puncak harian, bulan puncak; luas perkiraan berdampingan dengan `public/data/luas_resmi.json` dan `luas_satelit.json` tanpa dijumlah (D5) |
| Status surut (bagian 5.3) | keadaan hari itu | keadaan hari Minggu | jumlah kab banjir per bulan dan kab yang paling sering banjir |
| Geologi (bagian 7) | perubahan level gunung api hari itu | perubahan level selama minggu itu | semua perubahan level setahun dari `riwayat_level.json` |
| Prakiraan (bagian 6, 8) | besok: `public/prediksi/data/prediksi.json` tenggang +1, dibaca apa adanya (pemiliknya `prediksi`, AGENTS.md 2.7: tanpa kata "aman", BMKG dan prediksi kita terpisah) | sepekan: `public/prediksi/data/tangga.json` dari modul Tangga Peringatan (AGENTS.md 2.7) bila sudah terbit; berkas itu belum ada pada 12 Nov 2026, jadi sampai terbit bagian ini tampil "belum tersedia" | musim depan: `iklim_outlook.json` dan riwayat per bulan (bagian 8) |
| Usulan temuan (bagian 9) | tidak ada; kejadian menonjol = 5 kejadian dengan meninggal dan hilang, lalu terdampak, terbesar | aturan T1 sampai T7 dengan ambang dibagi 4 **[BAWAAN SEMENTARA, Q18]** | aturan T1 sampai T7 dengan ambang dikali 12 **[BAWAAN SEMENTARA, Q18]**, ditambah tren 10 tahun naik atau turun |

Tahunan tidak menjumlah versi beku bulanan (D13). Lampirannya memuat, per bulan: kejadian bencana alam di versi beku bulanan terakhir, kejadian di tarikan tahunan, dan selisihnya.
