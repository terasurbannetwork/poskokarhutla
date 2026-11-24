# Menutup celah ambang Indonesia (ISPU, BMKG cuaca ekstrem, tsunami InaTEWS, P.32/2016, pengganti P.9/2018, puso Kementan)

Catatan peneliti, 19 Nov 2026. Lanjutan `indonesia_aturan.md`; yang sudah terverifikasi di sana tidak diulang. Tanda: **[V]** = dibaca sendiri dari naskah asli (PDF Berita Negara atau PDF resmi instansi; halaman lampiran berupa gambar dirender ke PNG lalu dibaca visual); **[V-gov]** = dibaca dari dokumen resmi instansi pemerintah, tetapi bukan instansi pemilik aturan; **[S]** = sekunder (berita, ringkasan pencarian). Jenis ukuran: **BAHAYA** (intensitas fenomena/paparan), **DAMPAK**, **STATUS**.

Catatan teknis akses: berbeda dari sesi sebelumnya, `curl` biasa (tanpa melonggarkan TLS) berhasil mengunduh PDF dari peraturan.go.id. jdih.bmkg.go.id, rtsp.bmkg.go.id (lewat curl), dan cdn.bmkg.go.id mengembalikan JSON penolakan; repository.pertanian.go.id gagal DNS; jdih.pertanian.go.id mengembalikan halaman HTML, bukan PDF.

---

## 1. ISPU: Lampiran I dan II Permen LHK P.14/MENLHK/SETJEN/KUM.1/7/2020

### Takeaway
Celah tertutup. Lampiran I dan II di Berita Negara 2020 No. 774 (hal. 10-16, berupa gambar) terbaca. Rentang resmi: Baik 1-50, Sedang 51-100, Tidak Sehat 101-200, **Sangat Tidak Sehat 201-300**, **Berbahaya ≥301**. Titik patah PM2.5 (24 jam) 15,5 / 55,4 / 150,4 / 250,4 / 500 µg/m³ dan PM10 (24 jam) 50 / 150 / 350 / 420 / 500 µg/m³. Angka BMKG yang dicatat sebagai [S] di catatan sebelumnya ternyata cocok dengan lampiran resmi ini.

### Cited Findings
- **[V] Identitas dan tanggal:** ditetapkan 13 Juli 2020, diundangkan 15 Juli 2020; naskah pasal berakhir hal. 9; Lampiran I hal. 10-13, Lampiran II hal. 14-16 (16 halaman total). — [peraturan.go.id/files/bn774-2020.pdf](https://peraturan.go.id/files/bn774-2020.pdf)
- **[V] Lampiran II huruf A "Kategori Angka Rentang ISPU" (hal. 14), tabel Kategori / Status Warna / Angka Rentang:** Baik, Hijau, 1-50; Sedang, Biru, 51-100; Tidak Sehat, Kuning, 101-200; **Sangat Tidak Sehat, Merah, 201-300**; **Berbahaya, Hitam, ≥ 301**. Jenis: BAHAYA (paparan). — PDF yang sama, hal. 14.
- **[V] Lampiran I huruf A "Tabel Konversi Nilai Konsentrasi Parameter ISPU" (hal. 10):** baris ISPU (0-50 / 51-100 / 101-200 / 201-300 / >300) dengan konsentrasi batas:
  - PM10, 24 jam (µg/m³): 50 / 150 / 350 / **420** / **500**
  - PM2.5, 24 jam (µg/m³): 15,5 / 55,4 / 150,4 / **250,4** / **500**
  - SO2 24 jam: 52 / 180 / 400 / 800 / 1200; CO 24 jam: 4000 / 8000 / 15000 / 30000 / 45000; O3 24 jam: 120 / 235 / 400 / 800 / 1000; NO2 24 jam: 80 / 200 / 1130 / 2260 / 3000; HC 24 jam: 45 / 100 / 215 / 432 / 648 (semua µg/m³).
  - Artinya, "Sangat Tidak Sehat" untuk PM2.5 = konsentrasi di atas 150,4 sampai 250,4 µg/m³; "Berbahaya" = di atas 250,4 µg/m³ (batas tabel 500). Untuk PM10: Sangat Tidak Sehat >350 sampai 420; Berbahaya >420 (batas tabel 500). (Tabel memuat batas atas tiap rentang; batas bawah disimpulkan dari baris sebelumnya.)
- **[V] Keterangan tabel (hal. 10):** "Data pengukuran selama 24 jam secara terus-menerus." "Hasil perhitungan ISPU parameter partikulat (PM2.5) disampaikan tiap jam selama 24 jam." Parameter lain diambil nilai ISPU tertinggi dan "paling sedikit disampaikan setiap jam 09.00 dan jam 15.00."
- **[V] Rumus (Lampiran I huruf B, hal. 10):** I = ((Ia − Ib)/(Xa − Xb))·(Xx − Xb) + Ib, dengan Ia/Ib = ISPU batas atas/bawah, Xa/Xb = konsentrasi ambien batas atas/bawah, Xx = konsentrasi nyata. Contoh hal. 11: PM2.5 rata-rata 31,4 µg/m³ → ISPU 69,92.
- **[V] Lampiran II huruf B, penjelasan (hal. 15-16):** Sangat Tidak Sehat = "Tingkat kualitas udara yang dapat meningkatkan resiko kesehatan pada sejumlah segmen populasi yang terpapar." Berbahaya = "Tingkat kualitas udara yang dapat merugikan kesehatan serius pada populasi dan perlu penanganan cepat." Anjuran Berbahaya untuk setiap orang: "Hindari semua aktivitas di luar".

### Inferences
- Ambang "Berbahaya" ISPU ≥301 setara PM2.5 24 jam >250,4 µg/m³ atau PM10 24 jam >420 µg/m³. Ini kandidat paling kuat untuk indikator asap "intensif" yang bersandar pada peraturan nasional, dengan catatan tetap ukuran BAHAYA/paparan, bukan dampak.
- Ketidakkonsistenan kecil dalam naskah: Lampiran I menulis rentang ISPU "0 - 50", Lampiran II menulis "1 – 50". Tidak berpengaruh pada ambang atas.
- Ambang Pergub Kalteng 24/2017 (ISPU ≥200 dua hari untuk tanggap darurat, lihat catatan sebelumnya) berada tepat di batas atas "Tidak Sehat", bukan di dalam "Sangat Tidak Sehat" (201-300).
- Tabel konversi memakai rerata 24 jam; data per jam PM2.5 dari stasiun (ISPU "real time") tidak sama dengan ISPU harian resmi.

### Gaps
- Tidak ada.

---

## 2. Peraturan BMKG Nomor 9 Tahun 2022 (pengganti Perka 9/2010)

### Takeaway
Celah tertutup dengan jawaban negatif: **Perban BMKG 9/2022 tidak memuat satu ambang angka pun**, termasuk di lampirannya. Lampiran I hanya format teks peringatan nowcasting; Lampiran II hanya format laporan respons cepat, analisis lengkap, dan narasi peringatan 1-2 hari. Dengan dicabutnya Perka 9/2010, ambang hujan lebat 50 mm/24 jam, angin >25 knot, gelombang ≥2 m, suhu +3°C, jarak pandang <1000 m **tidak lagi punya pijakan peraturan yang berlaku**. Yang tersisa hanya pernyataan resmi BMKG di siaran pers, mis. hujan >150 mm/hari "ekstrem".

### Cited Findings
- **[V] Identitas:** Berita Negara 2022 No. 891, 18 halaman; ditetapkan 3 Agustus 2022 (Dwikorita Karnawati). — [peraturan.go.id/files/bn891-2022.pdf](https://peraturan.go.id/files/bn891-2022.pdf)
- **[V] Definisi tanpa angka (Pasal 1 angka 1, hal. 2):** Cuaca Ekstrem adalah "kejadian fenomena alam yang ditandai oleh kondisi curah hujan, arah dan kecepatan angin, suhu udara, kelembapan udara, dan jarak pandang yang dapat mengakibatkan kerugian terutama keselamatan jiwa dan harta."
- **[V] Jenis peringatan umum (Pasal 4 ayat (1), hal. 2-3):** hujan lebat; hujan disertai angin kencang, kilat, dan/atau petir; angin kencang; puting beliung; hujan es; "jarak pandang mendatar ekstrem"; "suhu udara ekstrem"; kebakaran hutan dan lahan; siklon tropis. Tidak ada angka.
- **[V] Tingkatan (Pasal 7 ayat (2)-(3), hal. 3):** "tidak ada peringatan; waspada; siaga; dan awas", warna hijau/kuning/oranye/merah; Pasal 8-11 hanya memberi kode RGB (hijau 102,255,51; kuning 255,255,0; oranye 255,192,0; merah 255,0,0). Jenis: STATUS, tanpa ambang.
- **[V] Durasi (Pasal 16-20, hal. 5-6):** nowcasting 1-3 jam; 1-2 hari; 1 minggu; karhutla 1 minggu untuk Indonesia dan ASEAN; berbasis risiko 1-2 hari.
- **[V] Mekanisme diserahkan ke SOP (Pasal 22, hal. 6):** "Mekanisme penerbitan informasi Peringatan Dini Cuaca Ekstrem diatur dalam standar operasional prosedur."
- **[V] Lampiran I (hal. 13-14, gambar):** "FORMAT PRODUK BARU NOWCASTING (PERINGATAN DINI CUACA EKSTREM 1 SAMPAI DENGAN 6 JAM KE DEPAN)" dan format UPDATE; isian berupa nama wilayah, jam, jenis cuaca. Tanpa angka ambang. (Catatan: lampiran menulis 1-6 jam, pasal 17 menulis 1-3 jam.)
- **[V] Lampiran II (hal. 15-18, gambar):** format laporan respons cepat (bagian Dampak: "genangan/banjir, tanah longsor, kerusakan bangunan, pohon tumbang, gangguan transportasi, korban jiwa/luka/hilang"), format analisis lengkap, dan format narasi peringatan 1-2 hari ("potensi hujan intensitas sedang-lebat ...", isian status "Waspada/Siaga/Awas"). Tanpa angka ambang.
- **[V] Pencabutan (Pasal 55, hal. 11-12):** Perka BMKG "Nomor KEP.009 Tahun 2010 tentang Prosedur Standar Operasional Pelaksanaan Peringatan Dini, Pelaporan, dan Diseminasi Informasi Cuaca Ekstrem (Berita Negara Republik Indonesia Tahun 2010 Nomor 497), dicabut dan dinyatakan tidak berlaku."
- **[V-BMKG web] Hujan ekstrem:** siaran pers BMKG 12 Sept 2025: "Padahal, secara klimatologis, hujan di atas 150 mm/hari sudah dikategorikan ekstrem." — [bmkg.go.id](https://www.bmkg.go.id/siaran-pers/cuaca-ekstrem-masih-mengintai-bmkg-ingatkan-kesiapsiagaan-nasional)
- **[S] Tabel kategori hujan harian yang dipakai BMKG:** ringan 0,1(0,5)-20; sedang 20-50; lebat 50-100; sangat lebat 100-150; ekstrem >150 mm/hari (jurnal Widya Climago BMKG 2021; peta harian Stasiun GAW Bariri). Bukan peraturan. — [ejournal-pusdiklat.bmkg.go.id](https://ejournal-pusdiklat.bmkg.go.id/index.php/climago/en/article/download/35/30); [gaw-bariri.bmkg.go.id](https://gaw-bariri.bmkg.go.id/monitoring-hujan-harian/)

### Inferences
- Untuk dokumen kajian: ambang cuaca ekstrem harus ditulis sebagai "praktik operasional BMKG" (hujan >150 mm/hari ekstrem; 50-100 lebat; 100-150 sangat lebat), bukan "menurut Peraturan BMKG". Angka Perka 9/2010 boleh disebut sebagai rujukan historis yang sudah dicabut (8 Sept 2022).
- Ambang angin, gelombang, suhu, dan jarak pandang yang berlaku kini ada di SOP internal BMKG (Pasal 22), yang tidak terbit di Berita Negara.

### Gaps
- SOP internal BMKG yang dirujuk Pasal 22 tidak ditemukan publik.
- Ambang angin kencang, gelombang, suhu ekstrem, dan jarak pandang versi pasca-2022 tidak ditemukan dalam dokumen resmi.

---

## 3. Tsunami InaTEWS: Waspada/Siaga/Awas

### Takeaway
Tiga tingkat dengan angka <0,5 m / 0,5-3 m / >3 m terverifikasi dari dokumen pemerintah (Kemenkes) yang menyalin skema InaTEWS, dan batas 0,5 m terverifikasi dari dokumen BMKG sendiri (Ina-RTSP User Guide v3) serta siaran pers BMKG. **Dokumen BMKG yang memuat angka 3 m untuk Awas tidak ditemukan**; Buku Saku Gempabumi dan Tsunami BMKG mendefinisikan ketiga status tanpa angka.

### Cited Findings
- **[V-gov] Tiga tingkat dengan angka:** "AWAS Diperkirakan tinggi tsunami yang akan tiba melebihi 3m. ... SIAGA Diperkirakan tinggi tsunami yang akan tiba antara 0.5 – 3m." "WASPADA Diperkirakan tinggi tsunami yang akan tiba kurang dari 0.5m." Tindakan: Awas "evakuasi secara menyeluruh"; Siaga "evakuasi"; Waspada "menjauhi pantai dan tepian sungai". Hal. 2 dari 4; dokumen panduan evakuasi tsunami yang menyebut peringatan "disebarluaskan oleh InaTEWS (BMKG)". Jenis: BAHAYA (prakiraan tinggi) dipakai sebagai STATUS. — [infeksiemerging.kemkes.go.id/document/download/jNl](https://infeksiemerging.kemkes.go.id/document/download/jNl)
- **[V] Ambang 0,5 m di dokumen BMKG:** Ina-RTSP User Guide versi 3 (BMKG, September 2014, layanan regional Samudra Hindia), hal. 29: daftar zona memuat gelombang pertama "estimated to exceed 0.5m amplitude at the beach"; "Zones where the estimated wave amplitudes are less than 0.5m at the beach are not shown." dan ancaman berakhir "two hours after the forecast time for last exceedance of the 0.5m threat threshold". Ini ambang ancaman regional (RTSP), bukan skema nasional Waspada/Siaga/Awas. — [rtsp.bmkg.go.id/manual/Ina-RTSP_UserGuide_version-3.pdf](https://rtsp.bmkg.go.id/manual/Ina-RTSP_UserGuide_version-3.pdf)
- **[V] Waspada <0,5 m, siaran pers BMKG 30 Juli 2025:** "Artinya, daerah-daerah tersebut berpotensi terdampak gelombang tsunami setinggi di bawah 0,5 meter." — [bmkg.go.id](https://www.bmkg.go.id/siaran-pers/kenaikan-muka-air-laut-terpantau-di-sejumlah-wilayah-indonesia-pasca-gempabumi-m87-rusia)
- **[V] Buku Saku Gempabumi dan Tsunami (BMKG), hal. 45 "Tanggap Peringatan":** "Peringatan BMKG memberikan STATUS ANCAMAN tsunami untuk setiap daerah": Awas = "Status ancaman tertinggi. Warga harus evakuasi!"; Siaga = "Status ancaman sedang, namun masih berbahaya. Warga harus evakuasi!"; Waspada = "Status ancaman rendah. Warga harus menjauhi pantai dan tepi sungai!" Tanpa angka tinggi. — [content.bmkg.go.id/.../BMKG_Buku-Saku-Gempabumi-dan-Tsunami.pdf](https://content.bmkg.go.id/wp-content/uploads/BMKG_Buku-Saku-Gempabumi-dan-Tsunami.pdf)
- **[V] Buku BMKG "Sistem Peringatan Dini Tsunami di Indonesia" (InaTEWS: Tantangan dan Inovasi, 152 hal.):** tidak memuat definisi angka tingkat ancaman; hanya menyebut Palu 2018 "BMKG mengeluarkan peringatan dini dengan status siaga" (hal. 100). — [content.bmkg.go.id](https://content.bmkg.go.id/wp-content/uploads/Sistem-Peringatan-Dini-Tsunami-InaTEWS-Tantangan-dan-Inovasi.pdf)
- **[S] Awas >3 m dalam pemberitaan:** "Status Awas jika ketinggian gelombang tsunami lebih dari 3 meter" (Suara Surabaya, mengutip BMKG); Siaga 0,5-3 m untuk NTT/NTB/Sulsel (Antara). — [suarasurabaya.net](https://www.suarasurabaya.net/?p=61980); [megapolitan.antaranews.com](https://megapolitan.antaranews.com/berita/545123/bmkg-sebut-ancaman-tsunami-berstatus-siaga-05-3-meter-di-ntt-ntb-sulsel)

### Inferences
- Skema <0,5 / 0,5-3 / >3 m konsisten di dokumen Kemenkes, pemberitaan, dan praktik BMKG, jadi layak dipakai, tetapi rujukan formalnya sebaiknya ditulis "skema InaTEWS BMKG (dikutip dari Kemenkes)" sampai pedoman BMKG ditemukan.
- Ambang 3 m sama dengan batas KRB tsunami tinggi Permen ESDM 15/2011 (landaan >3 m), meski yang satu prakiraan tinggi di pantai dan yang lain tinggi landaan.

### Gaps
- Dokumen BMKG resmi (pedoman/Perka InaTEWS) yang memuat angka Awas >3 m dan Siaga 0,5-3 m tidak ditemukan. Poster resmi "Posters-for-DRR.zip" (content.bmkg.go.id) tidak dibuka; TSUNAMI-READY-1.pdf di cdn.bmkg.go.id menolak unduhan.

---

## 4. Permen LHK P.32/MENLHK/SETJEN/KUM.1/3/2016 (Pengendalian Karhutla)

### Takeaway
Celah tertutup: P.32/2016 **tidak memuat ambang status atau kelas kebakaran berangka**. Status kesiagaan empat tingkat tanpa angka; kriteria teknis didelegasikan (Pasal 85) ke peraturan menteri (yang kemudian menjadi P.9/2018, juga tanpa angka). Satu-satunya angka berbasis luas adalah jumlah regu pemadam per luas konsesi.

### Cited Findings
- **[V] Identitas:** Berita Negara 2016 No. 583, 69 hal.; mencabut Permenhut P.12/Menhut-II/2009 (Pasal 110, hal. 67). — [peraturan.go.id/files/bn583-2016.pdf](https://peraturan.go.id/files/bn583-2016.pdf)
- **[V] Status kesiagaan (Pasal 82, hal. 54):** "a. Siaga 3 atau normal; b. Siaga 2; c. Siaga 1; dan d. Tanggap Darurat Kabupaten/Kota, Provinsi, atau Nasional." Jenis: STATUS.
- **[V] Delegasi (Pasal 85, hal. 55):** "Ketentuan lebih lanjut mengenai kriteria teknis status kesiagaan dan darurat sebagaimana dimaksud dalam Pasal 82, diatur dengan Peraturan Menteri."
- **[V] Naik ke tanggap darurat tanpa angka (Pasal 86 ayat (1), hal. 55):** "Dalam hal kondisi karhutla semakin mempunyai dampak yang luas pada bidang sosial, budaya, ekonomi, status kesiagaan dapat berubah menjadi tanggap darurat."
- **[V] Krisis karhutla (Pasal 79 ayat (4), hal. 53):** "Penetapan kondisi krisis karhutla pada level kabupaten, provinsi atau nasional, ditetapkan oleh Menteri." Tanpa kriteria angka.
- **[V] Definisi (Pasal 1 angka 50-51, hal. 11-12):** PBK = "peringkat yang digunakan untuk mengetahui tingkat resiko terjadinya bahaya kebakaran hutan dan lahan"; hotspot = "pixel yang memiliki nilai temperatur di atas ambang batas (threshold) tertentu" (ambang tidak disebut).
- **[V] Angka berbasis luas, bukan keparahan (Pasal 37-38, hal. 30-31):** regu inti per unit manajemen, mis. hutan alam ≤50.000 ha minimal 1 regu (implisit Pasal 36), >50.000-100.000 ha "paling sedikit 2 (dua) regu", >100.000 ha "paling sedikit 3 (tiga) regu"; HTI per 20.000 ha bertambah 1 regu sampai 6 regu untuk >100.000 ha. Jenis: kapasitas, bukan ambang bencana.

### Inferences
- Rantai P.32/2016 → P.9/2018 → peraturan daerah menegaskan bahwa ambang angka karhutla hanya ada di tingkat daerah (contoh Pergub Kalteng 24/2017).

### Gaps
- Tidak ada.

---

## 5. Apakah P.9/2018 (dan P.32/2016) sudah diganti sesudah pemisahan KLHK 2024?

### Takeaway
Tidak ditemukan pengganti. Pencarian ke peraturan Kementerian Kehutanan 2025 hanya menemukan aturan kelembagaan (Permenhut 8/2025 tentang UPT Gakkum, termasuk Balai pengendalian kebakaran) dan Permenhut 18/2025 yang tidak terlihat mencabut P.32/2016; pasal.id dan BPK masih menandai P.32/2016 berlaku. Bukti ini negatif (tidak menemukan), bukan konfirmasi positif.

### Cited Findings
- **[S] P.32/2016 masih tercatat berlaku** di basis data dan dirujuk dokumen BPK Riau 2025. — [pasal.id](https://pasal.id/peraturan/permen/permenlh-no-p-32-menlhk-setjen-kum-1-3-2016-tahun-2016); [peraturan.bpk.go.id/Details/298069](https://peraturan.bpk.go.id/Details/298069); [riau.bpk.go.id](https://riau.bpk.go.id/wp-content/uploads/2025/03/RL.2.3.-Karhutla-Melanda-7-Daerah-di-Riau_Oke.pdf)
- **[S] Permenhut 8/2025** mengatur organisasi UPT Ditjen Gakkum Kehutanan termasuk balai pengendalian kebakaran; bukan kriteria status. — [peraturan.go.id/files/permenhut-no-8-tahun-2025.pdf](https://peraturan.go.id/files/permenhut-no-8-tahun-2025.pdf); [jdih.kehutanan.go.id naskah urgensi](https://jdih.kehutanan.go.id/new2/uploads/files/monografi/Lampiran_PERMEN-8-BALAI%20GAKKUMHUT%20+%20BALAI%20PKH_naskah%20urgensi.pdf)
- **[S] Permenhut 18/2025** (22 Sept 2025) menyebut capaian pengendalian kebakaran; ringkasan pencarian tidak menunjukkan klausul pencabutan P.32/2016 atau P.9/2018. — [pasal.id](https://pasal.id/peraturan/permen/permenhut-no-18-tahun-2025)
- Status P.9/2018 "Berlaku" di JDIH Kemenko Infra dan BPK sudah dicatat di `indonesia_aturan.md` §1.

### Inferences
- Dengan pemisahan kementerian, kewenangan pengendalian karhutla di kawasan hutan kini di Kementerian Kehutanan, tetapi peraturan teknis lama (P.32/2016, P.9/2018) tetap berlaku sampai dicabut.

### Gaps
- jdih.kehutanan.go.id dan jdih.kemenlh.go.id tidak ditelusuri per halaman; isi Permenhut 18/2025 tidak dibaca utuh. Perlu cek klausul "mencabut" di Permenhut/Permen LH 2025-2026 bila ada.

---

## 6. Kementan: kelas kerusakan ringan/sedang/berat/puso untuk banjir dan kekeringan

### Takeaway
Tidak ada temuan baru dari naskah resmi. Buku Pedoman SiPERDITAN (Pusdatin Kementan 2024-an dan edisi 2026) tidak memuat puso atau persen kerusakan. Juknis Pengamatan dan Pelaporan OPT dan DPI (Kepdirjen TP No. 36/HK.310/C/3/2018), dokumen yang paling mungkin memuat skala R/S/B/P, tidak bisa diunduh (repository.pertanian.go.id gagal DNS). Angka resmi yang terverifikasi tetap hanya 75% AUTP (sudah dicatat).

### Cited Findings
- **[V] SiPERDITAN 2026 (Pusdatin, Setjen Kementan), glosarium hal. 5-6:** banjir dan kekeringan didefinisikan tanpa angka; "Prediksi Banjir" memakai kriteria "aman, menengah, non banjir, rendah dan tinggi"; prediksi kekeringan memakai SPI. Kata "puso" tidak muncul. — [siperditan.pertanian.go.id/sup/2026_Buku_Pedoman_SiPERDITAN.pdf](https://siperditan.pertanian.go.id/sup/2026_Buku_Pedoman_SiPERDITAN.pdf)
- **[V] SiPERDITAN edisi sebelumnya, hal. 8:** "Kekeringan (El-Nino): kondisi tidak terpenuhinya kebutuhan air tanaman pada fase tertentu yang mengakibatkan pertumbuhan tanaman tidak optimal"; banjir = tergenangnya areal "dengan kedalaman dan jangka waktu tertentu". Tanpa angka. — [siperditan.pertanian.go.id/pdf/Buku_Pedoman_SiPERDITAN.pdf](https://siperditan.pertanian.go.id/pdf/Buku_Pedoman_SiPERDITAN.pdf)
- **[S] Juknis OPT dan DPI 2018** (Kepdirjen TP No. 36/HK.310/C/3/2018, Direktorat Perlindungan Tanaman Pangan) memuat bab "kerusakan tanaman akibat DPI" dan pelaporan, menurut ringkasan pencarian; isi tidak terbaca. — [repository.pertanian.go.id](https://repository.pertanian.go.id/bitstreams/ba9476f0-9170-4c12-903d-de5cc2f493d0/download)
- **[S] Kategori pelaporan kekeringan R (ringan), S (sedang), B (berat), P (puso), Pulih** dipakai di metadata variabel BPS menurut ringkasan pencarian; halaman yang dicek (sirusa variabel 157242) mengembalikan 404, variabel 92821 ternyata variabel lain. Tidak terverifikasi.

### Inferences
- Skala R/S/B/P dengan persen (1-25/25-50/50-75/≥75%) tetap berstatus sekunder; untuk kajian, yang bisa dipegang dari naskah resmi hanya "≥75% intensitas dan luas kerusakan per petak" (AUTP).

### Gaps
- Juknis OPT-DPI 2018 dan Lampiran Permentan 36/2011 (Pedoman Bantuan Penanggulangan Padi Puso; jdih.pertanian.go.id mengembalikan HTML) belum terbaca. Perlu diunduh manual oleh pemilik dari jaringan yang bisa menjangkau repository.pertanian.go.id.

---

## Ringkasan status celah
| Celah | Status | Angka kunci |
|---|---|---|
| ISPU P.14/2020 Lampiran I-II | **Tertutup [V]** | Sangat Tidak Sehat 201-300; Berbahaya ≥301; PM2.5 24 jam 150,4/250,4/500; PM10 350/420/500 µg/m³ |
| Perban BMKG 9/2022 | **Tertutup, tanpa angka [V]** | lampiran hanya format; ambang ke SOP (Pasal 22); hujan >150 mm/hari "ekstrem" hanya di siaran pers |
| Tsunami InaTEWS | Sebagian | <0,5 / 0,5-3 / >3 m [V-gov Kemenkes]; 0,5 m [V BMKG RTSP + siaran pers]; 3 m di dokumen BMKG belum ditemukan |
| P.32/2016 | **Tertutup, tanpa angka [V]** | status Siaga 3/2/1/Tanggap Darurat; delegasi Pasal 85 |
| Pengganti P.9/2018 pasca-2024 | Tidak ditemukan [S] | — |
| Puso Kementan | Tetap terbuka | hanya AUTP ≥75% yang [V] |
