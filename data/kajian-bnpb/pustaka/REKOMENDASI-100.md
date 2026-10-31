# 100 rekomendasi pengembangan sistem dari enam dokumen BNPB

Disusun 31 Okt 2026 dari catatan di folder ini. Kolom **Dasar** menyebut dokumen dan halamannya. Kolom **Kondisi kita** dicek ke repo pada hari yang sama. Bila tertulis "belum dicek rinci", artinya hanya diperiksa lewat pencarian kata kunci.

Singkatan dokumen: RBI (Buku Risiko Bencana Indonesia), BD24 (Buku Data 2024), REN (Renstra 2025-2029), NDP (NDPBA), LAK (LAKIP 2025), PSD (Pedoman Status Darurat 2016).

Prioritas: **P1** kerjakan dulu (murah, dampak langsung ke IKU BNPB atau kejujuran angka), **P2** program berikutnya, **P3** butuh data atau keputusan pemilik.

## A. Status keadaan darurat (10)

| No | Rekomendasi | Dasar | Kondisi kita | P |
|---|---|---|---|---|
| 1 | Tandai SK yang melewati masa pedoman (kab/kota lebih dari 14 hari, provinsi lebih dari 1 bulan, nasional lebih dari 3 bulan) sebagai "perlu SK perpanjangan". | PSD hal. 15 | 232 dari 453 SK kabupaten 2025 di `status_darurat.json` berlaku lebih dari 14 hari, 27 dari 42 SK provinsi lebih dari 1 bulan. Belum ada penanda. | P1 |
| 2 | Hitung tenggat 24 jam: kaji cepat, rakor, lalu SK paling lambat 24 jam setelah rekomendasi. Tampilkan jeda kejadian sampai SK per daerah. | PSD hal. 13-14 | Tanggal SK ada, tanggal kejadian ada di DIBI, tapi jedanya belum dihitung. | P1 |
| 3 | Lengkapi `status_darurat.py` dengan tahun 2026 begitu BNPB mengunggah, dan beri peringatan bila paket tahun berjalan belum ada. | PSD; data.bnpb.go.id | Data hanya tahun 2025. | P1 |
| 4 | Beri saran status otomatis (bukan penetapan): siaga hanya untuk bencana yang bisa dipantau peringatan dini (karhutla, banjir, kekeringan, cuaca, erupsi), tanggap bila kejadian dan gangguan kehidupan sudah ada, transisi bila mereda. | PSD hal. 7-9 | Tiga status sudah dinormalkan. Saran dari data pantauan belum ada. | P2 |
| 5 | Siaga untuk gempa dan tsunami jangan pernah disarankan, karena pedoman menyebut siaga hanya untuk ancaman yang tidak mendadak. | PSD hal. 7 | Perlu gerbang uji supaya aturan ini tidak dilanggar. | P1 |
| 6 | Sediakan generator draf SK Bupati/Walikota dan Gubernur sesuai Lampiran 1 dan 2 (Menimbang, Mengingat, KESATU sampai KEEMPAT, tembusan). | PSD hal. 17-22 | Belum ada. | P2 |
| 7 | Sediakan templat surat pernyataan ketidakmampuan Bupati ke Gubernur dan Gubernur ke Presiden, karena itu syarat naik tingkat. | PSD hal. 11-14 | Belum ada. | P2 |
| 8 | Tunjukkan indikator kapasitas naik tingkat per daerah: personel, logistik, peralatan, pembiayaan, Pos Komando, Pos Lapangan. Isi dari inventaris Ruang Instansi. | PSD hal. 10 | Inventaris dan posko ada di `/instansi`. Belum disusun sebagai cek naik tingkat. | P2 |
| 9 | Kaitkan SK dengan syarat BTT APBD: daerah dengan kejadian besar tanpa SK ditandai "BTT belum bisa dipakai". | PSD hal. 1 (Permendagri 21/2011, SE 360/2903/15) | Belum ada. | P2 |
| 10 | Wajibkan pengumuman berakhirnya status: tampilkan SK yang tanggal akhirnya lewat tanpa pernyataan berakhir atau perpanjangan. | PSD hal. 15 | Belum ada. | P3 |

## B. Indeks Risiko Bencana (IRB) (12)

| No | Rekomendasi | Dasar | Kondisi kita | P |
|---|---|---|---|---|
| 11 | Pisahkan tiga deret IRB di layar dan deck: 144,02 ke 128,52 (metode lama), 171,95 ke 170,17 (KRB 2021), dan baseline baru 147,95. Jangan pernah membandingkan antarderet. | LAK hal. 18-19; REN hal. 53 | Belum ada pemisahan tertulis. Masukkan ke registri angka ppt-konsultan. | P1 |
| 12 | Jadikan target IKU 1.1 (turun 1,2% per tahun dari 147,95) panel pemantau: 2026 sekitar 146,17, 2029 sekitar 140,9. | REN hal. 133; LAK hal. 19 | Belum ada. | P1 |
| 13 | Tulis peringatan di `risiko_hvc.json` bahwa rumus kita `H x V / C` berbasis Perka 2/2012, berbeda dari rumus RBI `(H x V x (1-C))^(1/3)`, jadi angkanya tidak boleh disebut IRB resmi. | RBI hal. 53 | Rumus kita tertulis di berkas, perbedaannya belum. | P1 |
| 14 | Coba rumus RBI sebagai varian kedua dan uji balik keduanya terhadap korban DIBI. Pilih yang lebih jujur, catat di uji. | RBI hal. 53 | Uji peringkat kab sudah ada untuk rumus kita. | P2 |
| 15 | Pakai bobot kerentanan per jenis bahaya dari RBI (banjir 40/25/25/10, gempa 40/30/30, kekeringan 50/40/10, karhutla ekonomi 40 dan lingkungan 60). | RBI hal. 52 | Kita memakai satu V untuk semua bahaya. | P2 |
| 16 | Tampilkan komponen yang paling bisa digerakkan daerah. LAKIP menyebut kenaikan kapasitas satu-satunya tuas yang bisa diukur tahunan. | LAK hal. 18 | Belum ada. | P2 |
| 17 | Hitung simulasi "berapa IRB turun bila IKD kab X naik satu kelas" untuk usulan program. | LAK hal. 18; REN hal. 133 | Belum ada. | P2 |
| 18 | Minta data IRB per provinsi 2025 ke Direktorat terkait. LAKIP tidak memuatnya, padahal dibutuhkan untuk panel daerah. | LAK (tidak ada tabel IRB provinsi) | Kita belum punya. | P3 |
| 19 | Catat bahwa NDPBA memakai skala 0-1 dan peringkat 34 provinsi, sehingga tidak bisa dicampur dengan IRB BNPB. Tampilkan sebagai pembanding terpisah. | NDP hal. 68 | Belum ada. | P2 |
| 20 | Muat peringkat risiko NDPBA per provinsi (Sumut 0,606, Jabar 0,570, NTB 0,556, Papua 0,556, NTT 0,555) sebagai lapisan pembanding di `/bnpb/risiko`. | NDP hal. 68 | Belum ada. | P2 |
| 21 | Tandai kerentanan sumber data lama: banyak indikator NDPBA dan RBI bertahun 2012-2015. Setiap lapisan risiko wajib menulis tahun datanya. | NDP hal. 136-149; RBI | Sebagian lapisan sudah menulis sumber. Belum semua menulis tahun. | P1 |
| 22 | Siapkan jalur impor proyeksi kerentanan SEB Kemendagri-Bappenas 2025-2045 begitu berkasnya didapat, karena itulah V baseline baru. | LAK hal. 18 | Belum ada. | P3 |

## C. Kapasitas daerah dan IKD (10)

| No | Rekomendasi | Dasar | Kondisi kita | P |
|---|---|---|---|---|
| 23 | Buat panel IKU 1.2: persen daerah berkapasitas minimal sedang. Capaian 2025 50% dari target 67%. Target 2026 73%. | LAK hal. 20; REN hal. 133 | `ikd.json` ada (raster InaRISK, median per kab). Panel IKU belum ada. | P1 |
| 24 | Tampilkan daftar 19 provinsi yang turun ke kelas Rendah pada 2025 (dari 14 pada 2024) dan 225 kab/kota kelas Rendah. Ini target kerja langsung. | LAK hal. 20, 22 | Belum ada. | P1 |
| 25 | Cocokkan `ikd.json` (raster) dengan tabel IKD resmi LAKIP Lampiran 2. Bila berbeda, angka resmi menang dan selisihnya dicatat. | LAK hal. 112-113 | Belum dicocokkan. | P1 |
| 26 | Tampilkan 45 kab/kota yang belum menilai IKD (469 dari 514 yang menilai). Daerah tanpa nilai tidak boleh dianggap kapasitas nol. | LAK hal. 22 | Perlu dicek perlakuan nilai kosong di `ikd.json`. | P1 |
| 27 | Pecah IKD ke 71 indikator bila datanya bisa diperoleh, supaya rekomendasi per daerah menyebut indikator mana yang lemah. | LAK hal. 18 | Kita hanya punya satu angka per kab. | P3 |
| 28 | Hubungkan kapasitas dengan program Kemitraan Kampus: daerah IKD rendah jadi prioritas pencocokan pakar. | LAK hal. 20; KEPUTUSAN-KAMPUS | Profil daerah kampus sudah memuat IKD. Urutan prioritas belum memakainya. | P2 |
| 29 | Tampilkan Indeks Kemampuan PB NDPBA (Banten 0,361, Jabar 0,380, DKI 0,405 terendah). Ini menunjukkan provinsi kaya bisa berkapasitas rendah. | NDP hal. 54 | Belum ada. | P2 |
| 30 | Ukur kesiapsiagaan rumah tangga. NDPBA menyebut kurang dari 25% rumah tangga siap. Tambahkan pertanyaan di `/pendataan`. | NDP hal. 86, 194 | Belum ada. | P2 |
| 31 | Tampilkan Destana per kab dan target Renstra (10 desa pada 2025 menjadi 170 desa pada 2029). Capaian 2025 hanya 4 desa karena efisiensi. | REN hal. 136; LAK hal. 38 | Data Destana ada sebagian di wilayah dan risiko kecamatan banjir. Panel target belum ada. | P2 |
| 32 | Jangan pakai skor kapasitas RBI (Kerangka Hyogo, 2015) sebagai angka kini. Beri label "kerangka lama" bila ditampilkan. | RBI hal. 125 | Kita belum menampilkannya. Aturan ini mencegah salah pakai. | P1 |

## D. Data kejadian dan kejujuran angka (12)

| No | Rekomendasi | Dasar | Kondisi kita | P |
|---|---|---|---|---|
| 33 | Masukkan angka resmi 2023, 2024, 2025 ke registri angka: kejadian 5.400, 3.472, 4.727, meninggal 540 (2024) dan 1.666 (2025). | BD24 hal. 3; LAK hal. ii | Perlu dicek registri ppt-konsultan. | P1 |
| 34 | Catat selisih internal Buku Data 2024 (3.472 vs 3.475, longsor 201 vs 207, kekeringan 89 vs 54) supaya kita tidak mengutip angka yang kontradiktif. | BD24 | Belum tercatat. | P1 |
| 35 | Selalu kutip "meninggal dan hilang" terpisah dari "meninggal". Kenaikan 95,78% di BD24 adalah gabungan keduanya. | BD24 hal. 6 | Perlu gerbang di generator laporan. | P1 |
| 36 | Uji balik model kita terhadap 454 kab/kota yang mengalami bencana 2024, bukan hanya kab dengan korban. | BD24 | Uji balik ada per modul. Cakupan ini belum dicek rinci. | P2 |
| 37 | Gunakan rasio kerugian ekonomi terhadap PDB (0,217% pada 2025, target 0,1370% pada 2025 dan 0,1350% pada 2029) sebagai indikator utama panel Presiden. | LAK hal. 18; REN hal. 85 | Panel Presiden belum menampilkannya. | P1 |
| 38 | Tulis bahwa angka 2025 belum memuat dampak Siklon Senyar. Setiap angka kerugian 2025 wajib disertai catatan ini sampai BNPB memperbarui. | LAK hal. 18 | Belum ada. | P1 |
| 39 | Bandingkan angka kejadian kita (pantauan satelit dan DIBI) dengan BD24 per provinsi. Selisih besar ditampilkan, bukan disembunyikan. | BD24 hal. 7-10 | Validasi logbook karhutla, banjir, longsor ada. Pembanding BD24 belum. | P2 |
| 40 | Tampilkan puncak bulanan kejadian (Agustus, Maret, Januari) sebagai pola musim di `/prediksi`, dipisah per jenis. | BD24 hal. 7 | Pola musim karhutla ada. Lintas jenis belum dicek rinci. | P2 |
| 41 | Rapikan definisi "terdampak dan mengungsi" yang digabung di BD24 (8.136.271). Di layar kita, jangan menjumlahkan keduanya bila sumber memisahkan. | BD24 hal. vi | Perlu dicek generator laporan. | P2 |
| 42 | Simpan kejadian korban terbesar 2024 (Bone Bolango, Tanah Datar, Pesisir Selatan, Agam) sebagai kasus uji balik model longsor dan banjir lahar. | BD24 hal. 5 | Belum dicek apakah masuk set uji. | P2 |
| 43 | Banjir lahar dingin belum punya modul. Tanah Datar 32 meninggal dan 10 hilang, Agam 24. Tambahkan lapisan gabungan gunungapi dan hujan. | BD24 hal. 5 | Gunungapi dan hujan ada terpisah. | P2 |
| 44 | Longsor tambang (Bone Bolango) perlu lapisan izin tambang di atas lereng. `tambang.json` sudah ada, tinggal digabung ke model longsor. | BD24 hal. 5 | Data tambang ada. Belum masuk longsor. | P2 |

## E. Karhutla (12)

| No | Rekomendasi | Dasar | Kondisi kita | P |
|---|---|---|---|---|
| 45 | Tulis di metode bahwa bahaya karhutla InaRISK (`inarisk.json`) statis: lahan 30%, hujan tahunan 30%, gambut 10%. Bukan bahaya harian. Jangan dibandingkan dengan FWI. | RBI hal. 44 | Sumber tertulis. Sifat statisnya belum dijelaskan di layar. | P1 |
| 46 | Pakai kerentanan karhutla versi RBI (ekonomi dan lingkungan saja) saat menghitung risiko karhutla kab, bukan kerentanan sosial. | RBI hal. 52, 97 | Belum dicek rinci. | P2 |
| 47 | Laporkan luas terbakar dengan sumber tegas. BD24 hanya punya luas per provinsi (jumlah sekitar 9.819 ha), tidak sama dengan KLHK/SiPongi. Jangan pernah mengutip angka BD24 sebagai luas nasional. | BD24 Tabel L14 | Aturan "karhutla hanya dari sistem kita" sudah ada. Tambahkan larangan ini. | P1 |
| 48 | Renstra tidak punya target karhutla. Tawarkan indikator karhutla yang bisa diukur sistem kita (titik panas berkeyakinan tinggi, luas dNBR, jam deteksi sampai padam) sebagai usulan IKU unit. | REN (tidak ada) | Semua datanya ada di sistem kita. | P2 |
| 49 | Tampilkan jam terbang dan biaya operasi udara karhutla (12 heli patroli, 18 water bombing, 2.021 dan 2.354 jam) terhadap luas yang tercegah. | LAK hal. 50-51 | `operasi.json` ada. Rasio efektivitasnya belum. | P2 |
| 50 | Ukur efektivitas OMC karhutla: 165.612 kg bahan semai dan 175 sorti dibandingkan hujan dan titik panas sebelum dan sesudah. | LAK hal. 51 | Modul OMC ada di `/udara`. Perlu dicek apakah sudah memuat angka 2025. | P2 |
| 51 | Fokuskan panel kesiapan pada 6 provinsi prioritas LAKIP (Riau, Jambi, Sumsel, Kalbar, Kalteng, Kalsel) dan tambahkan Papua Selatan serta Kaltim. RBI mencatat lingkungan terpapar terbesar Papua 9,76 juta ha dan Kaltim 4,0 juta ha. | LAK hal. 50; RBI hal. 97 | Daftar prioritas kita perlu dicocokkan. | P1 |
| 52 | Petakan jarak titik panas ke pos damkar dan sumber air. NDPBA menyebut api Riau menyebar di area minim damkar dan air. | NDP hal. 207 | `bnpb/kebakaran` ada. Jarak per titik belum dicek. | P2 |
| 53 | Tampilkan pola bakar petani sekitar Mei di Riau sebagai peringatan musim awal, bukan hanya puncak Agustus-September. | NDP hal. 207 | `musim_awal.json` ada. Perlu dicek apakah Mei terlihat. | P2 |
| 54 | Ukur 99% sebab manusia (RBI) lewat lapisan konsesi, HGU, dan transisi lahan. Laporkan persentase titik panas di konsesi per minggu. | RBI hal. 96 | Konsesi dan HGU ada. Ringkasan mingguan perlu dicek. | P2 |
| 55 | Hubungkan saran status siaga darurat karhutla dengan syarat OMC, karena BD24 mencatat OMC dibiayai DSP bila ada status siaga. | BD24 (OMC 16 kali) | Belum ada. | P1 |
| 56 | Catat 1.627.194 jiwa terdampak karhutla lima tahun (Renstra) dan 21,6 juta penduduk terpapar (NDPBA) sebagai angka pengantar, dengan tahun dan sumber jelas. | REN hal. 23; NDP hal. 41 | Belum di registri. | P3 |

## F. Banjir, longsor, cuaca, kekeringan, gempa, gunungapi (12)

| No | Rekomendasi | Dasar | Kondisi kita | P |
|---|---|---|---|---|
| 57 | Uji ambang kekeringan kita terhadap ambang RBI: SPI-3 kurang dari -0,999 dan minimal 5 kejadian. Ambang kita gagal uji balik (FAR 97%). | RBI; memori `kekeringan-hipotesis` | Ambang masih berlabel hipotesis. | P1 |
| 58 | Pakai ambang hujan lebat BMKG (50 mm per 24 jam, 20 mm per jam) sebagai garis tetap di grafik hujan semua modul. | RBI | Perlu dicek konsistensinya lintas modul. | P2 |
| 59 | Pakai kriteria lokasi banjir RBI (lereng kurang dari 15%, jarak sungai kurang dari 300 m) sebagai lapisan pembanding model banjir kecamatan. | RBI hal. 81 | Model banjir kecamatan belum dijalankan pada label asli. | P2 |
| 60 | Pakai bobot longsor RBI (lereng 0,3, hujan 0,2, batuan 0,2, tanah 0,1) sebagai baseline pembanding model longsor gaya LHASA. | RBI hal. 86-87 | Model longsor ada. Pembanding baseline perlu dicek. | P2 |
| 61 | Banjir menyumbang 77,44% penduduk terdampak 2024 (6,3 juta). Jadikan banjir modul pertama yang mendapat fitur status darurat otomatis. | BD24 hal. vi | Modul banjir ada dan aktif. | P1 |
| 62 | Kekeringan menyumbang 18,19% terdampak (1,48 juta). Tampilkan layanan air bersih dan droping air per kab di `/kekeringan`. | BD24 hal. vi | Perlu dicek. | P2 |
| 63 | Cuaca ekstrem memapar 94% penduduk menurut NDPBA dan 244 juta jiwa menurut RBI. Panel cuaca perlu ringkasan dampak per kab, bukan hanya peringatan. | NDP hal. 41; RBI | `/cuaca` ada. Ringkasan dampak perlu dicek. | P2 |
| 64 | Gempa: pakai 8 kelas guncangan RBI (0,25-0,55 g) sebagai pembanding kelas MMI model kita. | RBI | Model GMPE dan MMI ada. | P3 |
| 65 | Tsunami: tampilkan ambang genangan 3 m sebagai kelas tinggi di lapisan pesisir. | RBI | Lapisan tsunami belum dicek. | P3 |
| 66 | Gunungapi: tampilkan 127 gunungapi aktif dan status 4 tingkat, kaitkan dengan status Semeru Level IV November 2025 sebagai kasus uji. | RBI; LAK | Modul gunungapi ada. | P3 |
| 67 | Jadikan banjir Jabodetabek Maret 2025 (72.050 rumah terendam), banjir Bali September 2025 (18 meninggal), dan Nagekeo sebagai kasus uji balik resmi. | LAK | Replay Maret 2025 sudah ada. Bali dan Nagekeo belum dicek. | P2 |
| 68 | Tampilkan 131 Wilayah Sungai sebagai unit agregasi banjir selain kab/kota. | RBI | Belum ada. | P3 |

## G. Peringatan dini dan aksi dini (10)

| No | Rekomendasi | Dasar | Kondisi kita | P |
|---|---|---|---|---|
| 69 | Ukur cakupan peringatan dini dengan definisi Renstra (6,10% pada 2025 sampai 6,32% pada 2029) supaya sistem kita bisa melaporkan kontribusinya ke IKU. | REN hal. 133-134 | Belum ada. | P1 |
| 70 | Siapkan sistem kita sebagai calon modul "Ekosistem Aksi Dini" Pusdatin (Rp1,2375 T per tahun, 17 lokasi). Tulis dokumen kesesuaian. | REN hal. 161 | `ews_tindakan.js` dan `/peringatan` ada. Dokumen kesesuaian belum. | P1 |
| 71 | Daftarkan umpan CAP kita ke BMKG, BNPB, dan agregator (Google Public Alerts, WMO Alert Hub), dan pastikan semua jenis bahaya masuk umpan, karena Perpres dan Perban MHEWS 2027 hampir pasti mensyaratkan standar baku. | REN hal. 107, 116, 162 | CAP 1.2 sudah keluar dari `src/peringatan.js`. Pendaftaran dan cakupan semua bahaya perlu dicek. | P2 |
| 72 | Petakan 23 sirene terpasang dan rencana 170 paket sampai 2029. Hitung penduduk dalam jangkauan bunyi. | REN hal. 163; LAK | Kata sirene ada di peringatan. Peta sirene perlu dicek. | P2 |
| 73 | Ukur cakupan pemantauan per penduduk. NDPBA menyebut cakupan baru 25-75% dan target minimal 75%. | NDP hal. 108 | Belum ada. | P2 |
| 74 | Uji peringatan secara rutin dan catat hasilnya. NDPBA menyebut pengujian belum rutin, dengan pelajaran Sulteng 2018. | NDP hal. 108-110 | `/uji-pilot` ada. Jadwal uji rutin belum. | P2 |
| 75 | Kaitkan peringatan dengan tindakan siaga di pedoman (kaji cepat, aktivasi komando, evakuasi, kelompok rentan). Setiap peringatan menampilkan daftar tindakan ini. | PSD hal. 8 | `ews_tindakan.js` ada. Perlu dicek kesesuaian isinya. | P2 |
| 76 | Tulis lead time setiap peringatan (jam sebelum kejadian) di arsip dan nilai prospektifnya, seperti `/prediksi`. | REN; NDP | Arsip prospektif ada untuk prediksi dan sebaran. | P2 |
| 77 | Tampilkan kelompok rentan (lansia, balita, disabilitas) per kab dalam jangkauan peringatan. | PSD hal. 8; NDP | Kata kelompok rentan ada di 11 berkas. Peta per kab perlu dicek. | P2 |
| 78 | Kirim peringatan ke kanal yang sudah dipakai warga (WA, SMS sel) dan catat yang terkirim, bukan hanya di web. | NDP | Bot WA ada untuk laporan. Siaran peringatan perlu dicek. | P3 |

## H. Logistik, peralatan, anggaran (10)

| No | Rekomendasi | Dasar | Kondisi kita | P |
|---|---|---|---|---|
| 79 | Tampilkan serapan logistik. Pengadaan logistik PB 2025 hanya Rp1,008 M dari pagu Rp76,4 M, dan Deputi Logistik 38,48%. | LAK hal. 99-101 | `logistik.json` ada. Serapan belum. | P2 |
| 80 | Buat estimasi kebutuhan logistik per musim dan per kab dari prakiraan kita, supaya pengadaan tidak macet di akhir tahun. | LAK | Perkiraan kebutuhan musim ada di Ruang BNPB. Perlu dicek kaitannya ke pagu. | P2 |
| 81 | Tampilkan DSP per kejadian (Sumbar Rp3,2 M, NTB Rp2,3 M, Lewotobi Rp1 M ditambah logistik Rp16,4 M) dan per jiwa terdampak. | BD24 | Belum ada. | P2 |
| 82 | Catat bahwa DSP 83,5% dari realisasi BNPB 2025 (Rp3,732 T). Panel anggaran harus memisahkan DSP dari anggaran rutin. | LAK hal. 99 | Belum ada. | P2 |
| 83 | Sebarkan inventaris peralatan BNPB (3.889 unit bantuan 2025) ke peta per kab dan kaitkan dengan risiko. | LAK | Inventaris ada di Ruang Instansi. Bantuan BNPB per kab perlu dicek. | P2 |
| 84 | Tunjukkan dampak efisiensi anggaran ke output (Destana 10 menjadi 4, alat peringatan dini 23 menjadi 9) sebagai bahan argumen anggaran. | LAK hal. 38, 59-71 | Belum ada. | P2 |
| 85 | Siapkan rantai pasok gudang ke kab untuk UPT Balai Besar Logistik Padang yang diusulkan Renstra. | REN hal. 119-121 | Belum ada. | P3 |
| 86 | Hitung anggaran BPBD per penduduk dari APBD DJPK. NDPBA menyebut alokasi APBD untuk BPBD hanya 0,38% dan realisasi 0,1%. | NDP hal. 175 | Data APBD DJPK ada di direktori. Rasio per penduduk perlu dicek. | P2 |
| 87 | Tampilkan rencana pinjaman dan hibah (Bank Dunia IDRIP USD160 juta, Spanyol USD45 juta) dan kab sasarannya sebagai peluang data. | REN hal. 142 | Belum ada. | P3 |
| 88 | Tampilkan kebutuhan anggaran Renstra per tahun (Rp1,46 T pada 2025, sekitar Rp2,6 T pada 2026-2028) dibanding pagu yang terealisasi. | REN hal. 144; LAK | Belum ada. | P3 |

## I. Kelembagaan, BPBD, damkar, masyarakat (6)

| No | Rekomendasi | Dasar | Kondisi kita | P |
|---|---|---|---|---|
| 89 | Hitung pos damkar per 100.000 penduduk dan petugas per 5.000 penduduk per kab. NDPBA menyebut keduanya di bawah standar, terutama di pedesaan. | NDP hal. 94-95, 206 | Data damkar ada di `/bnpb/kebakaran`. Rasio per penduduk perlu dicek. | P1 |
| 90 | Tampilkan kesiapan sistem komando per BPBD (ICS atau SKPDB). NDPBA menyebut ICS tidak merata. | NDP hal. 72-92 | Belum ada. | P2 |
| 91 | Rapikan jumlah BPBD. NDPBA menulis 511, 512, dan 518. Ambil angka resmi BNPB terbaru dan tulis tanggalnya. | NDP | `bpbd.json` ada. Perlu dicek jumlah dan tanggalnya. | P1 |
| 92 | Masukkan 30 rekomendasi NDPBA ke papan pantau dengan status (belum, berjalan, selesai) dan bukti. | NDP hal. 115-129 | Belum ada. | P2 |
| 93 | Dukung usulan Deputi Non Alam dan Sosial (Renstra) dengan modul bencana non-alam dan sosial dari data kita. | REN hal. 119 | Data non-alam dan sosial ada di riset. Modul layar belum. | P3 |
| 94 | Sambungkan rekor simulasi serentak (1.428.294 peserta) ke `/pendataan` supaya peserta simulasi tercatat per desa. | LAK | Belum ada. | P3 |

## J. Kritik terhadap sistem kita (6)

| No | Rekomendasi | Dasar | Kondisi kita | P |
|---|---|---|---|---|
| 95 | Sistem kita kuat di pantauan bahaya, lemah di kapasitas dan tata kelola. Dua IKU BNPB yang gagal (IRB dan kapasitas daerah) hampir tidak tampil di layar utama. Geser fokus ke kedua IKU itu. | LAK hal. 18-22 | Layar utama berpusat pada titik panas dan peringatan. | P1 |
| 96 | Terlalu banyak halaman dan modul untuk pengguna BPBD. NDPBA dan LAKIP menunjukkan kapasitas daerah rendah. Buat satu halaman "Hari ini untuk kab saya" yang memuat status, peringatan, kapasitas, dan tindakan. | NDP; LAK | Puluhan halaman di `public/`. Halaman per kab ringkas perlu dicek (`peta_kab.js` ada). | P1 |
| 97 | Banyak angka risiko kita dibangun dari InaRISK tanpa lisensi tertulis. Minta izin tertulis atau tandai jelas di setiap ekspor. | `ikd.json` catatan lisensi | Sudah ditandai "bukan klaim data terbuka". Perlu izin. | P2 |
| 98 | Belum ada satu tempat yang menyatakan sistem kita menyumbang ke IKU mana. Buat halaman "Kontribusi ke Renstra" yang memetakan setiap modul ke indikator Renstra. | REN hal. 133 | Belum ada. | P1 |
| 99 | Beberapa salinan berkas nyasar (`laporan_contoh 2.js`, `laporan_konpers 2.js`, `laporan_matador 2.js`, `data/medsos_tiktok 2.json`) ada di `public/`, ditambah `data/kajian-bnpb/tema 2.json`. Hapus supaya tidak ikut tayang. | AGENTS.md §9 | Ada di repo. | P1 |
| 100 | Dokumen resmi sendiri tidak konsisten (BD24, LAKIP, RBI). Jadikan pemeriksa konsistensi angka resmi sebagai fitur: setiap angka di registri dicek silang antardokumen dan selisihnya ditampilkan. | catatan 0-lintas-dokumen | Registri angka ada. Pemeriksa silang belum. | P2 |

## Urutan kerja yang disarankan

Kerjakan dulu sepuluh rekomendasi P1 yang paling murah, karena datanya sudah ada di repo: 1, 2, 3, 5, 11, 13, 23, 25, 47, dan 99.
