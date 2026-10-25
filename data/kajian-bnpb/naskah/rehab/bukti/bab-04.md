# Berkas bukti Bab 4: BEBAN REHABILITASI DAN REKONSTRUKSI 2015–2025

Kajian: Grand Design Rehabilitasi dan Rekonstruksi Air dan Akses Pascabencana 2026–2030 (pembaca Kepala BNPB).
Disusun 25 Oktober 2026 oleh peneliti berkas bukti (subagent), dari `rehab/KERANGKA.md` Bab 4, riset `rehab/riset/B`, `D`, `E`, `F`, paket `data/dibi`, `data/skenario-hidromet`, `data/program-terbukti`, korpus `data/raw/hukum/teks`, dan empat halaman resmi yang dibuka ulang sesi ini.

Konvensi. Path relatif ke `data/kajian-bnpb/` kecuali disebut lain. Label keyakinan: resmi, terverifikasi, estimasi-model, asumsi-kebijakan. Angka media ditandai **sekunder** dan hanya boleh masuk lampiran rekonsiliasi (KEPUTUSAN-AWAL R3), tidak masuk badan teks. Semua hitungan DIBI di berkas ini dijalankan ulang sesi ini dengan Python stdlib atas CSV paket (filter: `klasifikasi = alam`, `cakupan = bencana`, jumlah semua kategori DIBI). Kunci `rehab.*` baru tercatat di `bab-04.angka.json`; kunci yang sudah ada di `data/angka.json` disebut dengan namanya.

## Pegangan bab (dari KERANGKA §4 Bab 4)

- **Judul:** BAB 4 BEBAN REHABILITASI DAN REKONSTRUKSI 2015–2025 (perkiraan 10 hlm).
- **Subbab:** 4.1 Rumah Rusak per Jenis dan Tahun; 4.2 Jembatan dan Fasilitas Umum Rusak; 4.3 Sebaran per Provinsi dan Daftar Perhatian; 4.4 Kejadian Besar sebagai Preseden; 4.5 Kecepatan Pemulihan: Lapis Sementara Cepat, Lapis Permanen Tertinggal.
- **Tujuan bab:** menunjukkan besar dan sebaran beban RR, dan di mana pemulihan biasanya tertahan.
- **Pertanyaan kunci:** (1) Berapa rumah, jembatan, dan fasilitas umum rusak per tahun dan per jenis bencana? (2) Provinsi dan kab/kota mana yang berulang menanggung beban? (3) Kejadian mana menjadi preseden, dan seberapa cepat tiap lapis pulih?
- **Temuan kunci yang diharapkan (KERANGKA):** rumah RB 2015–2025 301.311 (RS 256.321; RR 743.198), gempa 182.522 dan banjir 105.016 RB; jembatan rusak 2018–2025 banjir 3.490 dari 3.833, Aceh 633, Sumatera Barat 521, Sulawesi Selatan 280; preseden Padang 2009, Lombok 2018, Sulteng 2018, Cianjur 2022, Sumatra 2025, Aceh 2004; kecepatan Sumatra (sekunder) dan huntap Sulteng tersisa 382 dari 5.598 (resmi).
- **Komponen (KERANGKA):** Gambar 4.1 (G9), Gambar 4.2 (G8), Gambar 4.3 (G20), Tabel 4.1 (L55), Gambar 4.4 (G22), Tabel 4.2 daftar perhatian ringkas.
- **Status data (KERANGKA):** ada (nasional, provinsi); sebagian (kab/kota).

**Koreksi atas kerangka yang wajib dibawa penulis.** Pemeriksaan ulang sesi ini membantah lima angka per jenis di KERANGKA §4 Bab 4 dan tabel kartu Bab 8 (berasal dari riset F §2). Total nasional cocok; rincian per jenis tidak. Rincian F menjumlah lebih besar dari totalnya sendiri (rumah RB per jenis 330.235 lawan total 301.311; jembatan per jenis 3.947 lawan total 3.833), jadi rincian F yang salah, bukan totalnya. Angka yang benar dari `dibi/rekap_nasional_tahunan.csv`:

| Besaran | KERANGKA / riset F | Hitungan ulang sesi ini | Status |
|---|---|---|---|
| Jembatan rusak banjir 2018–2025 | 3.490 (sekitar 91%) | 3.419 (89,2%) | dibantah |
| Jembatan rusak longsor / gempa / erupsi 2018–2025 | 250 / 90 / 52 | 246 / 52 / 51 | dibantah |
| Jembatan rusak cuaca ekstrem / gelombang 2018–2025 | 37 / 28 | 37 / 28 | cocok |
| Rumah RB gempa 2015–2025 | 182.522 | 152.659 | dibantah |
| Rumah RB banjir / cuaca ekstrem / longsor 2015–2025 | 105.016 / 25.469 / 13.580 | 104.296 / 24.876 / 12.865 | dibantah |
| Rumah RB erupsi 2015–2025 | 3.648 | 3.648 | cocok |
| Rumah RB 2015–2025; RS; RR | 301.311; 256.321; 743.198 | 301.311; 256.321; 743.198 | cocok |
| Jembatan rusak 2018–2025; 2025 | 3.833; 1.088 | 3.833; 1.088 | cocok |

Akibatnya kalimat tesis KERANGKA §3 ("sekitar 91% karena banjir") harus menjadi "sekitar 89%", dan kartu Bab 8 (gempa 90, longsor 250, erupsi 52 jembatan; longsor 13.580, cuaca ekstrem 25.469 RB) diganti angka kolom ketiga. Versi semua laporan memberi banjir 3.455 jembatan (89,5% dari 3.887); tidak dipakai sebagai angka utama karena README DIBI menetapkan cakupan `bencana`.

---

## Pertanyaan kunci 1. Berapa rumah, jembatan, dan fasilitas umum rusak per tahun dan per jenis bencana?

### Inti

DIBI mencatat 301.311 rumah rusak berat akibat bencana alam pada 2015–2025 (dari 1.300.830 rumah rusak semua kelas) dan 3.833 jembatan rusak pada 2018–2025, satu-satunya periode yang kolom jembatannya terisi. Beban rumah berat datang dari dua jenis yang berbeda sifat (gempa 152.659, banjir 104.296), sedangkan beban jembatan hampir seluruhnya banjir (3.419, 89%). Lebih dari 62% rumah rusak berat sebelas tahun itu jatuh pada dua tahun saja, 2018 dan 2025.

### Temuan bersumber

1. Rumah rusak akibat bencana alam 2015–2025: RB 301.311; RS 256.321; RR 743.198; total 1.300.830. Sumber: `dibi/rekap_nasional_tahunan.csv`, jumlah baris `klasifikasi=alam, cakupan=bencana`, tahun 2015–2025, kolom `rumah_rusak_berat`, `rumah_rusak_sedang`, `rumah_rusak_ringan`, `rumah_rusak`; kunci `rehab.dibi.rumah_rb.2015_2025`, `rehab.dibi.rumah_rs.2015_2025`, `rehab.dibi.rumah_rr.2015_2025`, `rehab.dibi.rumah_rusak.2015_2025`. Label: resmi (DIBI, primer; olahan penjumlahan).
2. Rumah RB per tahun 2015–2025: 5.217; 9.029; 10.452; 117.655; 15.813; 13.240; 21.335; 20.205; 4.870; 13.104; 70.391. Sumber: berkas dan filter sama, per tahun. Label: resmi. Kunci untuk dua puncak: `rehab.dibi.rumah_rb.2018`, `rehab.dibi.rumah_rb.2025`.
3. 2018 dan 2025 menyumbang 188.046 dari 301.311 RB (62,4%). Pada 2018 gempa menyumbang 111.214 dari 117.655 RB tahun itu (Lombok dan Sulawesi Tengah); pada 2025 banjir menyumbang 65.648 dari 70.391. Sumber: sama, per tahun × `kategori_dibi`. Label: resmi (olahan); kunci `rehab.dibi.rumah_rb.porsi_2018_2025_persen`.
4. Rumah RB 2015–2025 per jenis: gempa 152.659; banjir 104.296; cuaca ekstrem 24.876; longsor 12.865; erupsi 3.648; tsunami 1.583; gelombang pasang/abrasi 1.355; karhutla 29. Kelompok geologi (gempa, tsunami, erupsi) 157.890 (52,4%); hidrometeorologi 143.421 (47,6%). Sumber: sama, per `kategori_dibi`; kunci `rehab.dibi.rumah_rb.<jenis>.2015_2025`. Label: resmi. **Dibantah oleh / membantah:** KERANGKA dan riset F §2 menulis gempa 182.522, banjir 105.016, cuaca ekstrem 25.469, longsor 13.580 (lihat tabel koreksi).
5. Tsunami Sulawesi Tengah 2018 sebagian besar tercatat di DIBI sebagai gempa, bukan tsunami: kejadian besar `sulteng2018` memakai kategori "Gempabumi, Tsunami", sedangkan baris nasional `Tsunami` 2018 hanya 1.583 RB. Sumber: `dibi/kejadian_besar.csv` kolom `cakupan_atau_jendela` baris `sulteng2018`; `dibi/rekap_nasional_tahunan.csv` [tahun=2018, kategori_dibi=Tsunami]. Label: resmi (penempatan kategori adalah fakta data; bahwa 1.583 terutama Selat Sunda Desember 2018 belum diperiksa per kab).
6. Jembatan rusak 2018–2025 per tahun: 275; 433; 487; 505; 342; 258; 445; 1.088; total 3.833. Kolom `jembatan_rusak` bernilai 0 di semua tahun 2008–2017. 2026 sampai tanggal tarik 23 Oktober 2026: 114 (sementara). Sumber: `dibi/rekap_nasional_tahunan.csv`, kolom `jembatan_rusak`; kunci `rehab.dibi.jembatan_rusak.2018_2025`, `rehab.dibi.jembatan_rusak.2025`. Label: resmi.
7. Jembatan rusak 2025 (1.088) sekitar 2,8 kali rerata 2018–2024 (392 per tahun) dan 28,4% dari total delapan tahun. Sumber: hitungan dari butir 6; kunci `rehab.dibi.jembatan_rusak.rerata_2018_2024`. Label: resmi (olahan).
8. Jembatan rusak 2018–2025 per jenis: banjir 3.419 (89,2%); longsor 246; gempa 52; erupsi 51; cuaca ekstrem 37; gelombang pasang/abrasi 28; tsunami 0. Banjir 2025 saja: 1.021 dari 1.088. Sumber: sama, per `kategori_dibi`; kunci `rehab.dibi.jembatan_rusak.<jenis>.2018_2025`, `rehab.dibi.jembatan_rusak.porsi_banjir_persen`. Label: resmi. **Dibantah oleh / membantah:** KERANGKA dan riset F menulis banjir 3.490 (sekitar 91%), longsor 250, gempa 90, erupsi 52.
9. Gempa merusak 111.214 RB pada 2018 tetapi hanya 8 jembatan tahun itu; kolom jembatan dan rumah tidak bergerak bersama menurut jenis. Sumber: `dibi/rekap_nasional_tahunan.csv` [tahun=2018, kategori_dibi=Gempabumi]. Label: resmi.
10. Fasilitas rusak akibat bencana alam 2015–2025: fasilitas umum 21.703; pendidikan 11.617; rumah ibadat 8.372; kantor 2.042; fasilitas kesehatan 1.714. Semua kolom fasilitas bernilai 0 untuk 2017 dan 2008–2009, padahal rumah rusak tercatat; ini celah pencatatan, bukan tahun tanpa kerusakan. Sumber: `dibi/rekap_nasional_tahunan.csv`, kolom `fasum_rusak`, `pendidikan_rusak`, `rumah_ibadat_rusak`, `kantor_rusak`, `fasyankes_rusak`; kunci `rehab.dibi.fasum_rusak.2015_2025` dan seterusnya. Label: resmi.
11. Kategori `fasum_rusak` DIBI tidak memisah SPAM, pipa, atau sumur; DIBI tidak punya kolom kerusakan sistem air minum maupun waktu pulih layanan. Sumber: daftar kolom `dibi/rekap_nasional_tahunan.csv`; `dibi/README.md` bagian Berkas; riset F §4 butir 1. Label: resmi (ketiadaan kolom).
12. Seri DIBI patah di 2024: `is_bencana = false` baru dipakai sejak data 2024, sehingga angka `cakupan = bencana` sebelum 2024 tidak tersaring ambang Juklak BNPB 7/2023. Untuk jumlah kumulatif patahan ini kecil pada klasifikasi alam (rumah RB 2015–2025 versi semua laporan 301.826 lawan 301.311), tetapi tetap disebut. Sumber: `dibi/README.md` "Patahan seri 2024"; Juklak BNPB 7/2023 hlm. 7 butir 3 (pustaka `bnpb-2023-juklak7`). Label: resmi.

### Inferensi (analisis tim, bukan fakta bersumber)

- Beban rumah RR Indonesia bersifat "jarang tetapi raksasa": sembilan dari sebelas tahun berada di kisaran 4.870–21.335 RB, lalu satu gempa atau satu rangkaian banjir melipatgandakan beban 5–10 kali. Perencanaan kapasitas RR yang memakai rerata tahunan akan selalu kekurangan pada tahun yang paling menentukan; kapasitas perlu dihitung dari kejadian puncak (ini menjadi dasar lantai skenario Bab 8).
- Dua sektor kajian ini punya profil beban yang berlawanan. Rumah dan prasarana yang runtuh karena guncangan didorong gempa; jembatan didorong banjir. Paket lapis darurat akses (bailey, rangka baja) karena itu harus disiagakan menurut kalender musim hujan, bukan menurut peta sesar.
- Lonjakan 2025 tidak dapat dibaca sebagai tren naik dari tujuh titik data; ia satu rangkaian kejadian (Sumatra November 2025). Yang aman ditulis: satu musim banjir besar dapat menghasilkan kerusakan jembatan setara hampir tiga tahun rata-rata.
- Nol jembatan dan nol fasilitas di tahun-tahun tertentu adalah kekosongan isian. Grafik tidak boleh menggambar 2008–2017 sebagai nol untuk jembatan; sumbu dimulai 2018.

### Celah

- Kerusakan sistem air minum (SPAM, transmisi, sumur) tidak ada di DIBI untuk tahun mana pun. Disajikan dari dokumen per kejadian di Bab 6 dan sebagai permintaan kolom (R-RR-01), bukan diperkirakan dari `fasum_rusak`.
- Jembatan sebelum 2018 tidak tercatat; jembatan tidak dibedakan menurut status jalan (nasional, provinsi, kab/kota, desa) dan jenis (kendaraan, gantung). Disajikan sebagai keterbatasan di catatan Gambar 4.2.
- Kerugian rupiah tidak diterbitkan paket DIBI (kolom `estimasi_kerugian_rumah` satuannya tidak didokumentasikan). Bab ini tidak menulis total rupiah beban RR; biaya satuan ada di Bab 6-7 sebagai pembanding (prinsip 8).
- Rumah rusak sedang 0 pada 2008–2009 dan Padang 2009: tidak dibetulkan, ditulis apa adanya.

---

## Pertanyaan kunci 2. Provinsi dan kab/kota mana yang berulang menanggung beban?

### Inti

Kerusakan jembatan menyebar luas tetapi bertumpuk: 37 dari 38 provinsi mencatat jembatan rusak pada 2018–2025, 17 provinsi mencatatnya setiap tahun tanpa jeda, dan enam provinsi (Aceh, Sumatera Barat, Sulawesi Selatan, Jawa Barat, Jawa Tengah, Jawa Timur) menanggung 54,5% dari total. Beban rumah rusak berat jauh lebih terpusat pada tempat kejadian besar (NTB, Aceh, Sulawesi Tengah). Di tingkat kab/kota, 94 kab/kota mencatat rumah rusak akibat bencana hidrometeorologi pada setiap tahun 2015–2025; daftar perhatian RR penuh belum dapat dihitung karena jembatan per kab tidak ada di paket.

### Temuan bersumber

1. Jembatan rusak 2018–2025 per provinsi teratas: Aceh 633 (16,5%); Sumatera Barat 521 (13,6%); Sulawesi Selatan 280; Jawa Barat 236; Jawa Tengah 215; Jawa Timur 204; Sumatera Utara 194; Kalimantan Barat 192; NTT 136; Sumatera Selatan 123; NTB 122; Sulawesi Tengah 116. Sumber: `dibi/rekap_provinsi_tahunan.csv`, jumlah `jembatan_rusak` baris `klasifikasi=alam, cakupan=bencana`, 2018–2025; kunci `rehab.dibi.jembatan_rusak.prov.<provinsi>.2018_2025`. Label: resmi. Angka delapan provinsi pertama cocok dengan riset F §2.
2. Lima provinsi teratas menanggung 49,2% dan enam provinsi 54,5% jembatan rusak 2018–2025. Sumber: hitungan dari butir 1; kunci `rehab.dibi.jembatan_rusak.porsi_6prov_persen`. Label: resmi (olahan). Catatan untuk judul deck A3 ("{a} provinsi menanggung separuh"): nilai {a} = 6.
3. 37 dari 38 provinsi mencatat ≥ 1 jembatan rusak pada 2018–2025; 17 provinsi mencatat jembatan rusak di kedelapan tahun: Aceh, Sumatera Utara, Sumatera Barat, Sumatera Selatan, Bengkulu, Lampung, Jawa Barat, Jawa Tengah, Jawa Timur, Banten, NTB, Kalimantan Barat, Sulawesi Tengah, Sulawesi Selatan, Sulawesi Tenggara, Maluku, Maluku Utara. Sumber: `dibi/rekap_provinsi_tahunan.csv`, hitungan tahun dengan `jembatan_rusak > 0`; kunci `rehab.dibi.jembatan_rusak.prov_berulang_8_tahun`. Label: resmi (olahan).
4. Jembatan rusak 2025 per provinsi: Aceh 480; Sumatera Barat 182; Sumatera Utara 82; Jawa Tengah 54; Jawa Timur 39; Jawa Barat 33; Papua Pegunungan 27; Sulawesi Tengah 25. Tiga provinsi Sumatra: 744 dari 1.088 (68%). Sumber: `dibi/rekap_provinsi_tahunan.csv`, 2025; kunci `rehab.dibi.jembatan_rusak.prov.aceh.2025`, `rehab.dibi.jembatan_rusak.sumatra3prov.2025`. Label: resmi. Angka 744 mencakup semua kejadian alam 2025 di tiga provinsi, bukan hanya rangkaian November.
5. Rumah RB 2015–2025 per provinsi teratas: NTB 78.167; Aceh 58.932; Sulawesi Tengah 35.921; Jawa Barat 29.384; Jawa Timur 12.673; NTT 12.118; Sumatera Utara 10.556; Sumatera Barat 7.773; Maluku 6.893; Jawa Tengah 6.695. Tiga provinsi pertama 172.020 (57,1%). Sumber: `dibi/rekap_provinsi_tahunan.csv`, kolom `rumah_rusak_berat`, 2015–2025; kunci `rehab.dibi.rumah_rb.prov.<provinsi>.2015_2025`. Label: resmi. Versi 2018–2025 (NTB 77.311; Aceh 55.522; Sulawesi Tengah 35.570) cocok dengan riset F §2.
6. Beban rumah provinsi teratas adalah beban satu tahun: NTB 75.162 RB pada 2018 (96% dari 2015–2025), Sulawesi Tengah 34.172 pada 2018, Aceh 53.905 pada 2025. Sumber: `dibi/rekap_provinsi_tahunan.csv` per tahun. Label: resmi.
7. Kab/kota dengan rumah rusak (RB+RS+RR) akibat bencana hidrometeorologi (tanpa kekeringan dan karhutla) pada 2015–2025: 509 kab/kota mencatat ≥ 1; 94 mencatatnya di setiap tahun dari sebelas tahun; 191 di ≥ 9 tahun. Terbesar: Aceh Utara 92.450; Aceh Tamiang 40.941; Aceh Timur 23.707; Banjar (Kalsel) 21.050; Bogor 18.622; Sukabumi 13.863; Kota Kupang 13.787; Rokan Hulu 12.767; Kupang 12.381; Pacitan 11.621. Sumber: `skenario-hidromet/dibi_kab_tahun.csv`, kolom `rumah_rusak`, jenis selain `kekeringan` dan `karhutla`; kunci `rehab.dibi.kab.berulang_hidromet_11_tahun`, `rehab.dibi.kab.acehutara.rumah_rusak_hidromet.2015_2025`. Label: resmi (olahan). Batas: README `skenario-hidromet` menyatakan DIBI 2024 tidak lengkap untuk lima jenis; berkas ini memuat rumah rusak total, bukan RB.
8. Aturan daftar perhatian RR (KERANGKA Bab 3.6) mensyaratkan ≥ 2 dari empat syarat; syarat (b) jembatan rusak per kab pada ≥ 2 tahun tidak dapat dihitung karena paket tidak memuat jembatan per kab (`riset/mentah/dibi_baris.json` tanpa kolom jembatan). Sumber: riset F §4 butir 3; KERANGKA §10 celah 2. Label: resmi (ketiadaan data).

### Inferensi (analisis tim, bukan fakta bersumber)

- Ada dua peta beban yang berbeda dan Grand Design perlu keduanya. Peta jembatan adalah peta "beban kronis": 17 provinsi kehilangan jembatan setiap tahun, sehingga kesiapan akses darurat di provinsi itu adalah kebutuhan rutin, bukan kontinjensi. Peta rumah RB adalah peta "beban puncak" yang ditentukan oleh lokasi kejadian besar berikutnya, sehingga lebih tepat dibaca dari skenario (Bab 8) daripada dari sejarah provinsi.
- Aceh muncul di kedua peta (jembatan terbanyak dan rumah RB kedua) dan di daftar kab hidromet teratas (Aceh Utara, Aceh Tamiang, Aceh Timur). Ini menjadikan Aceh calon paling kuat untuk uji coba paket air dan akses (R-RR-14, Q20), dengan catatan bahwa angka 2025 mendominasi.
- Sulawesi Selatan dan Kalimantan Barat masuk delapan besar jembatan rusak tanpa kejadian besar yang dikenal; beban mereka kumulatif dari banjir kecil berulang. Provinsi seperti ini mudah luput bila prioritas hanya disusun dari daftar kejadian besar.
- Daftar 94 kab/kota "tiap tahun" bukan daftar perhatian RR; ia penanda frekuensi untuk syarat (c) dan pembanding saat turunan jembatan per kab tersedia.

### Celah

- Jembatan rusak per kab/kota 2018–2025: dicari di paket `dibi`, `skenario-hidromet`, `riset/mentah`; tidak ada. Permintaan data: tarik ulang DIBI per kab dengan kolom `jembatan_rusak` (Pusdatinkom BNPB). Tabel 4.2 disajikan sebagai daftar provinsi berulang ditambah 94 kab penanda frekuensi, dengan catatan "daftar perhatian RR lengkap di Lampiran A setelah turunan jembatan per kab".
- Rumah RB per kab untuk bencana geologi 2015–2025 tidak tersedia sebagai seri tahunan di paket (yang ada: `dibi_kab.csv` hidromet 2008–2026 tanpa pecahan tahun untuk RB). Kuartil atas RB per kab (syarat c) belum dihitung; tidak diganti perkiraan.
- Syarat (d) CAT kritis dan penurunan muka tanah per kab: poligon zona konservasi tidak terunduh (KERANGKA §10 celah 8).

---

## Pertanyaan kunci 3. Kejadian mana menjadi preseden, dan seberapa cepat tiap lapis pulih?

### Inti

Lima kejadian sejak 2009 masing-masing merusak lebih dari 50.000 rumah dan menjadi preseden beban RR: Padang 2009 (271.540 rumah rusak), Sumatra 2025 (228.006), Lombok 2018 (217.855), Sulawesi Tengah 2018 (110.214), dan Cianjur 2022 (57.337 versi DIBI; 114.315 versi R3P), ditambah Aceh 2004 sebagai preseden tsunami dengan 140.304 rumah dibangun BRR. Dari data resmi yang dapat dibuka, polanya konsisten: layanan sementara dan aset nasional pulih dalam hitungan minggu sampai bulan (Sumatra: jalan dan jembatan nasional 100%, SPAM sekitar 95,5% per 7 Mei 2026), sedangkan aset daerah dan hunian tetap tertinggal (jembatan daerah sekitar 67% dari 1.181 pada tanggal yang sama; huntap Sulawesi Tengah masih tersisa 382 dari 5.598 hampir enam tahun setelah bencana), melampaui masa R3P tiga tahun.

### Temuan bersumber

**A. Preseden beban (Tabel 4.1)**

1. Padang 2009 (gempa): 119.005 RB; 271.540 rumah rusak; 6.554 mengungsi. Sumber: `dibi/kejadian_besar.csv` [kode=padang2009, versi=DIBI], jendela 30 Sep–31 Okt 2009; kunci ada `dibi.padang2009.rumah_rb`, baru `rehab.lantai.gempa.padang2009.rumah_rusak`. Label: resmi (jendela pilihan penyusun, `turunan_penyusun = ya`).
2. Lombok 2018 (gempa): 75.160 RB; 217.855 rumah rusak; 406.202 mengungsi. Sumber: sama [kode=lombok2018], jendela 29 Jul–30 Sep 2018; kunci ada `dibi.lombok2018.rumah_rusak`, baru `rehab.lantai.gempa.lombok2018.rumah_rb`. Label: resmi. **Dibantah oleh / versi lain:** mengungsi 396.032 (BNPB via IGPA UGM, sekunder) di baris `pustaka` berkas yang sama; sasaran rumah Kemenko PMK 226.204 (lihat butir 12).
3. Sulawesi Tengah 2018 (gempa, tsunami, likuefaksi): 34.166 RB; 110.214 rumah rusak; 212.719 mengungsi. Sumber: sama [kode=sulteng2018], jendela 28 Sep–31 Okt 2018; kunci ada `dibi.sulteng2018.rumah_rusak`, baru `rehab.lantai.likuefaksi.sulteng2018.rumah_rb`. Label: resmi. Porsi likuefaksi tidak terpisah di DIBI.
4. Cianjur 2022 (gempa): DIBI 13.730 RB; 57.337 rumah rusak; 115.382 mengungsi. **Dibantah oleh:** R3P Cianjur 114.315 rumah rusak (20.969 RB, 24.584 RS, 68.762 RR), hlm. PDF 55 (kunci ada `r3p.cianjur2022.rumah_rusak`, pustaka `cianjur-2022-r3p`, resmi, dokumen berstatus contoh tanpa nomor penetapan); Renstra BNPB 2025–2029 hlm. 11: 56.548 (baris `pustaka` `kejadian_besar.csv`, resmi primer). Sumber DIBI: `dibi/kejadian_besar.csv` [kode=cianjur2022]; kunci ada `dibi.cianjur2022.rumah_rusak`, `dibi.cianjur2022.rumah_rusak_berat`. Ketiganya ditulis berdampingan.
5. Sumatra November 2025 (banjir dan longsor, Aceh, Sumut, Sumbar): 62.956 RB; 228.006 rumah rusak; 970.876 mengungsi. Sumber: `dibi/kejadian_besar.csv` [kode=sumatra2025], jendela 15 Nov–31 Des 2025; kunci ada `dibi.sumatra2025.rumah_rusak_berat`, baru `rehab.lantai.banjir.sumatra2025.rumah_rusak`. Label: resmi. **Dibantah oleh / versi lain:** BNPB sekitar 147.000 rumah rusak per 17 Desember 2025 dan Kementerian PKP sekitar 189.308 rumah terdampak per 9 Januari 2026, keduanya dikutip Info Singkat Pusat Analisis Keparlemenan DPR RI Vol. XVIII No. 2, Januari 2026 (https://berkas.dpr.go.id/pusaka/files/info_singkat/Info%20Singkat-XVIII-2-II-P3DI-Januari-2026-230.pdf, diakses 25 Okt 2026; resmi, dokumen DPR primer, angka BNPB dan PKP di dalamnya kutipan). Info Singkat menyebut perbedaan itu mencerminkan pemutakhiran yang "belum sepenuhnya sinkron" dan memakai istilah berbeda (rusak lawan terdampak). Versi 48.786 RB sementara (Republika 6 Jan 2026, riset E [26]) sekunder, lampiran saja.
6. Merapi 2010 (erupsi): 2.465 RB; 2.919 rumah rusak; 447.982 mengungsi. Seroja 2021 (banjir, longsor, cuaca ekstrem NTT): 5.882 RB; 54.268 rumah rusak; 58.192 mengungsi. Semeru 2021: 942 RB; 10.565 mengungsi. Sumber: `dibi/kejadian_besar.csv` [kode=merapi2010 / seroja2021 / semeru2021, versi=DIBI]. Label: resmi. Kunci baru `rehab.lantai.erupsi.merapi2010.rumah_rb`, `rehab.lantai.banjir.seroja2021.rumah_rusak`.
7. Aceh 2004 (tsunami): BRR melaporkan 140.304 rumah permanen dibangun terhadap 139.195 rumah hancur atau rusak berat dalam masa kerja empat tahun. Sumber: BRR Book Series, *The Scattered Beads* (2009), hlm. x dan xiii (PDF 12, 15), https://aset-sejarah.dibi.bnpb.go.id/media/assets/arsip/6748628c6962c.pdf, dibuka 23–24 Okt 2026 (pustaka `brr-2009-scattered-beads`; `program-terbukti/bukti_dampak.csv` B048); kunci ada `brr.aceh2004.rumah_rusak`, baru `rehab.lantai.tsunami.aceh2004.rumah_brr`. Label: resmi, laporan keluaran pelaksana sendiri. Rencana Induk berlaku empat tahun (Perpres 30/2005; riset E [3], resmi).
8. Aceh 2004 tidak ada di DIBI dasbor publik 1 (kejadian pra-2008 tidak tersedia); angkanya hanya dari BRR. Sumber: `dibi/README.md` "Keterbatasan dan celah". Label: resmi.

**B. Kecepatan pemulihan per lapis**

9. Jangka waktu yang diatur: R3P disusun paling lama 90 hari dan dimulai saat tanggap darurat (Perban BNPB 5/2017 Pasal 2 ayat (2)–(3), hlm. 4); R3P berlaku untuk jangka waktu paling lama 3 tahun (Pasal 10, hlm. 9–10). Sumber: korpus `data/raw/hukum/teks/perban-nomor-5-tahun-2017.json`, dicek ke teks sesi ini; kunci ada `perban2017_5.r3p_hari_maks`, `perban2017_5.r3p_masa_tahun`. Label: resmi.
10. Sumatra 2025, data per 7 Mei 2026 (sekitar lima setengah bulan setelah kejadian): jalan dan jembatan nasional 100% kembali fungsional; jembatan daerah sekitar 67% dari 1.181 unit terdampak; ruas jalan daerah sekitar 94% dari 2.421 ruas terdampak; SPAM sekitar 95,5% dari 178 terdampak; rumah hunian selesai untuk 1.547 KK. Sumber: Kementerian PU (ePPID), "Kementerian PU Percepat Penanganan Infrastruktur Terdampak Bencana di Sumatera", terbit 11 Mei 2026, https://sahabat.pu.go.id/eppid/berita/detail/kementerian-pu-percepat-penanganan-infrastruktur-terdampak-bencana-di-sumatera-mayoritas-infrastrukt, diakses 25 Okt 2026; kunci `rehab.pulih.sumatra2025.jembatan_daerah_terdampak`, `rehab.pulih.sumatra2025.jembatan_daerah_fungsi_persen_2026_05`, `rehab.pulih.sumatra2025.jalan_daerah_ruas_terdampak`, `rehab.pulih.sumatra2025.jalan_daerah_fungsi_persen_2026_05`, `rehab.pipa.sumatra2025.spam_terdampak`, `rehab.pipa.sumatra2025.persen_fungsi_mei2026`, `rehab.pulih.sumatra2025.hunian_kk_selesai_2026_05`. Label: resmi (primer). Halaman tidak menyebut jumlah unit jembatan nasional; nilai 791 jembatan daerah fungsional adalah hitungan penyusun (67% × 1.181), bukan angka PU.
11. Sumatra 2025, SPAM per 2 Februari 2026: 143 dari 176 berfungsi; 537 unit sarana darurat; perbaikan permanen ditargetkan Agustus 2028. Sumber: Kementerian PU (ePPID) 5 Feb 2026 (riset D [21], resmi; judul menulis 142, isi 143) dan riset D [21] untuk target 2028 (tidak dibuka ulang sesi ini). **Dibantah oleh / versi lain:** 153 dari 176 (Investortrust 11 Feb 2026, riset E [28], sekunder); 176 lawan 178 SPAM terdampak antara dua rilis PU (rekonsiliasi Bab 3).
12. Lombok 2018: per Maret 2020 (sekitar 19 bulan), 170.559 dari 226.204 rumah sasaran selesai (75,40%); per 11 September 2023, realisasi kebutuhan R3P Rp11,44 triliun mencapai 94,73%. Sumber: Kemenko PMK 13 Mar 2020, https://www.kemenkopmk.go.id/pemerintah-upayakan-percepatan-penanganan-pascabencana-gempa-bumi-ntb (`program-terbukti/bukti_dampak.csv` B057–B058, dibuka 23 Okt 2026); Kemenko PMK 20 Mei 2024, https://kemenkopmk.go.id/node/4970 (pustaka `kemenkopmk-2024-rehabrekon-lombok`; kunci ada `kemenkopmk.lombok2018.kebutuhan_r3p`, `kemenkopmk.lombok2018.realisasi_persen`). Label: resmi. Kekuatan bukti program rumah Lombok di `program-terbukti/kompendium_program.csv` (P09): **lemah**, laporan sendiri, dua versi angka dalam satu rilis Agustus 2020.
13. Sulawesi Tengah 2018: per 14–15 Juni 2024, 5.598 huntap ditetapkan dan 382 belum selesai; Menko PMK menyatakan "Ini sudah tertunda cukup lama 6 tahun" dan tidak ada penambahan waktu lagi. Sumber: Kemenko PMK, "Menko PMK Serahkan Kunci Huntap Warga Terdampak Bencana Gempa dan Likuefaksi Sulawesi Tengah", 15 Jun 2024, https://kemenkopmk.go.id/node/5032, diakses 25 Okt 2026; kunci `rehab.pelajaran.sulteng.huntap_ditetapkan`, `rehab.pelajaran.sulteng.huntap_sisa_jun2024`. Label: resmi. Hitungan penyusun: 5.216 unit (93%) selesai, sekitar 5 tahun 8 bulan setelah 28 September 2018.
14. Sulawesi Tengah 2018: Inpres 10/2018 dan Keppres 28/2018 dinyatakan berakhir per Februari 2021, sementara validasi data penerima dan revisi R3P masih terbuka. Sumber: Kemenko PMK 27 Feb 2021, https://kemenkopmk.go.id/node/1332 (riset E [13], resmi; tidak dibuka ulang sesi ini).
15. Jembatan Palu IV (runtuh 28 September 2018) dibangun ulang 250 m dengan jalan pesisir sekitar 5 km yang juga berfungsi tanggul, dibuka 13 Februari 2026, sekitar tujuh tahun empat bulan setelah runtuh. Sumber: Oriental Consultants Global, 19 Feb 2026, https://ocglobal.jp/news/260218-indonesia-en/ (riset E [18]; terverifikasi, konsultan pengawas proyek; tidak dibuka ulang sesi ini). Kekuatan bukti di riset E kompendium: lemah.
16. Sumatra 2025, akses nasional pada lapis darurat: 14 jembatan nasional putus atau terputus di Aceh per 1 Desember 2025, ditangani 310 personel di tiga provinsi. Sumber: Ditjen Bina Marga BPJN Aceh, 3 Des 2025, https://binamarga.pu.go.id/balai-aceh/berita/dampak-bencana-banjir-dan-longsor-sumatera-kementerian-pu-percepat-penanganan-14-jembatan-rusak-di-aceh (riset B [29], resmi; tidak dibuka ulang sesi ini).
17. Pembanding internasional lapis sementara air: pasokan air Kobe 1995 pulih 90% dalam 38 hari dan 100% dalam 81 hari; Tohoku 2011 90% dalam 36 hari. Sumber: JSCE, Prof. Nojima, *Lifeline Restoration Overview*, 13 Jun 2011, https://www.jsce.or.jp/kokusai/what's_new/2011/Prof.Nojima_lifeline-overview_110613.pdf (riset D [36]; terverifikasi; tidak dibuka ulang sesi ini).
18. Kekuatan bukti program RR yang menjadi preseden menurut `program-terbukti/kompendium_program.csv`: Rekompak (P07) lemah, BRR Aceh-Nias (P08) lemah, rumah Lombok 2018 (P09) lemah; semuanya laporan sendiri. Riset E menilai CSRRP huntap Sulteng "sedang (bersyarat)" karena indikator dan survei kepuasan dijalankan proyek sendiri (Sitaba PU, riset E [15]). Label: resmi (penilaian rubrik repo). Tidak satu pun boleh ditulis "terbukti".

**C. Angka sekunder (hanya lampiran rekonsiliasi, tidak masuk badan teks)**

19. Per 5 Oktober 2026 (juru bicara Satgas PRR): jalan dan jembatan nasional pulih 100%; jembatan daerah Aceh 58,93%, Sumut 93,98%, Sumbar 59,50%; huntara 20.770 dari 20.803; huntap 2.085 dari 57.027. Sumber: CNN Indonesia, 5 Okt 2026 (riset E [31]); **sekunder**. Pencarian sesi ini (25 Okt 2026) tidak menemukan rilis kemendagri.go.id atau Satgas PRR yang memuat angka yang sama; laporan media lain menyebut 827 dari 1.184 jembatan daerah terdampak (tanggal artikel tidak konsisten) dan huntap 2.103 selesai, juga sekunder.
20. Jembatan rusak Sumatra 2025 dalam empat versi yang tidak boleh dipilih satu: DIBI 744 (tiga provinsi, semua kejadian alam 2025; resmi); Kementerian PU 1.181 jembatan daerah terdampak per 7 Mei 2026 (resmi, butir 10); BNPB 498 jembatan rusak per 10 Desember 2025 (Kontan, riset B [36], **sekunder**); Bina Marga 14 jembatan nasional putus di Aceh per 1 Desember 2025 (resmi, butir 16). Sumber: berkas dan URL di butir rujukan. Definisi berbeda (rusak, terdampak, putus; daerah lawan nasional) dan tanggal berbeda.

### Inferensi (analisis tim, bukan fakta bersumber)

- Pola "lapis sementara cepat, lapis permanen tertinggal" kini berdiri di atas sumber resmi, bukan hanya media: pada tanggal data yang sama (7 Mei 2026) Kementerian PU melaporkan aset nasional 100% dan SPAM 95,5%, tetapi jembatan daerah sekitar 67%. Selisih sepertiga jembatan daerah setelah lima setengah bulan adalah ukuran paling tajam dari kesenjangan pemilik aset yang dibahas di Bab 9.
- Huntap Sulawesi Tengah (sekitar 5 tahun 8 bulan, belum tuntas) dan Palu IV (sekitar 7 tahun) melampaui masa R3P paling lama 3 tahun (Perban 5/2017 Pasal 10) hampir dua kali lipat. Bagi Kepala BNPB ini berarti horizon R3P tidak mencerminkan horizon aset permanen yang paling sulit (lahan, relokasi, pinjaman luar negeri); target RR perlu dipisah per lapis, sesuai prinsip 3 KERANGKA.
- DIBI mencatat lebih banyak rumah rusak Sumatra (228.006) daripada BNPB sendiri pada Desember 2025 (sekitar 147.000) dan Kementerian PKP (sekitar 189.308). Arah selisihnya tidak dapat dijelaskan dari sumber yang ada (jendela DIBI mencakup semua laporan 15 Nov–31 Des, termasuk RR; versi lain kemungkinan memakai definisi penerima). Selisih ini memperkuat kebutuhan satu basis data penerima berversi (pelajaran lintas kasus riset E butir 1).
- Untuk Bab 8 (lantai skenario): angka jembatan tercatat terbesar untuk banjir di wilayah Sumatra adalah 1.181 jembatan daerah terdampak (PU, resmi), lebih besar dari DIBI 744 untuk tiga provinsi yang sama. Karena skenario tidak boleh lebih ringan dari angka tercatat untuk wilayah yang sama, kartu 8.5 sebaiknya menulis 744 (DIBI) dan 1.181 (PU) berdampingan dan memakai yang lebih berat sebagai lantai akses, dengan catatan definisi "terdampak" lebih luas dari "rusak".
- Padang 2009, bukan Lombok 2018 atau Sumatra 2025, adalah lantai rumah RB untuk gempa (119.005); Sumatra 2025 adalah lantai banjir (62.956 RB, 228.006 rumah rusak). Cianjur menunjukkan versi R3P bisa dua kali DIBI; lantai yang dipakai di skenario gempa perlu menyebut kedua versi.
- Kecepatan pemulihan air di Sumatra (sekitar 95,5% unit SPAM dalam sekitar lima setengah bulan) tidak sebanding langsung dengan Kobe dan Tohoku (persen layanan dalam hari): satuannya unit sistem, bukan sambungan atau jiwa. Penulis tidak boleh menyandingkannya sebagai "lebih lambat" atau "lebih cepat" tanpa catatan satuan (prinsip 4).

### Celah

- Rencana induk RR Sumatra 2026–2028, R3P Aceh, Sumut, Sumbar, dan rilis resmi progres setelah Mei 2026 (jembatan daerah dalam unit, huntap) tidak dibuka; angka Oktober 2026 hanya ada di media. Gambar 4.4 memakai titik resmi 2 Februari 2026 dan 7 Mei 2026; titik Oktober 2026 berpil "sekunder" di lampiran saja, atau tidak digambar. Permintaan data ke Kementerian PU dan Satgas PRR (Kemendagri).
- R3P Lombok dan Sulawesi Tengah tidak ditemukan (riset E, E5); waktu pulih per lapis untuk kedua kejadian hanya dari rilis Kemenko PMK.
- Jumlah jembatan rusak per kejadian besar tidak ada di `kejadian_besar.csv` (kolom metrik tanpa jembatan). Tabel 4.1 mengisi kolom jembatan hanya untuk Sumatra 2025 (versi PU, DIBI provinsi) dan Sulteng (Palu IV, kualitatif); sel lain "tidak tercatat".
- Hari sampai akses darurat terbuka per kejadian tidak ditemukan untuk satu kejadian pun di sumber resmi; tidak diperkirakan. Diarahkan ke Bab 5 Gambar 5.3 bila data terkumpul dan ke R-RR-02 (baseline waktu pulih).
- Status akhir rumah Cianjur dan relokasi tiga desa setelah Januari 2024 tidak ditemukan dari sumber resmi.
- Tidak ada evaluasi independen kecepatan atau mutu pemulihan untuk kejadian Indonesia mana pun (kekuatan bukti tertinggi "sedang bersyarat", CSRRP).

---

## Komponen

| Kode | Komponen | Isi | Sumber data | Kode G / B5 | Catatan penulis |
|---|---|---|---|---|---|
| Gambar 4.1 | Rumah RB per tahun bertumpuk kelompok bahaya 2015–2025 | Batang per tahun, tumpukan geologi (gempa, tsunami, erupsi) dan hidromet (banjir, longsor, cuaca ekstrem, gelombang, karhutla); penanda patahan seri 2024; anotasi 2018 dan 2025 | `dibi/rekap_nasional_tahunan.csv` (alam, bencana) | G9 | Angka per jenis memakai hitungan ulang, bukan KERANGKA |
| Gambar 4.2 | Jembatan rusak per jenis 2018–2025 | Batang bertumpuk per tahun atau batang mendatar per jenis; sumbu mulai 2018; catatan "kolom kosong sebelum 2018, tanpa status jalan" | sama | G8 | Banjir 3.419 (89,2%) |
| Gambar 4.3 | Peta jembatan rusak per provinsi 2018–2025 | Bulatan sebanding di centroid provinsi; panel kecil 2025 | `dibi/rekap_provinsi_tahunan.csv` | G20 (L34) | Label Aceh, Sumbar; penanda 17 provinsi berulang 8 tahun |
| Tabel 4.1 | Preseden kejadian besar × besaran RR | Kolom: kejadian, jenis, RB, rumah rusak, mengungsi, jembatan (bila ada), air (rujuk Bab 6), waktu pulih lapis permanen, versi lain | `dibi/kejadian_besar.csv`; R3P Cianjur; BRR; Kemenko PMK; PU 11 Mei 2026 | L55, B5.7 | Versi berbeda berdampingan, bukan dipilih |
| Gambar 4.4 | Capaian pemulihan per lapis Sumatra 2025 | Batang persen fungsional per kelas aset pada 7 Mei 2026: jalan dan jembatan nasional 100, SPAM 95,5, jalan daerah 94, jembatan daerah 67; titik SPAM 2 Feb 2026 (143/176) | PU ePPID 5 Feb dan 11 Mei 2026 | G22 | Titik Oktober 2026 (sekunder) tidak di badan teks; bila ditampilkan di lampiran, berpil sekunder |
| Tabel 4.2 | Daftar perhatian RR ringkas | Sementara: 17 provinsi jembatan rusak 8/8 tahun, enam provinsi 54,5%, 94 kab hidromet berulang 11/11 tahun sebagai penanda; daftar penuh di Lampiran A setelah turunan jembatan per kab | `dibi/rekap_provinsi_tahunan.csv`; `skenario-hidromet/dibi_kab_tahun.csv` | B5.7 | Label asumsi-kebijakan untuk aturan; tidak disebut "daftar perhatian" sebelum syarat (b) terhitung |
| Kotak 4.1 (usulan) | Perbandingan dengan sumber lain | Rumah Sumatra (DIBI 228.006; BNPB sekitar 147.000; PKP sekitar 189.308) dan jembatan Sumatra (744; 1.181; 14 nasional; 498 sekunder) | pertanyaan kunci 3 butir 5 dan 20 | L22 | Kotak rekonsiliasi; angka sekunder berpenanda |

## Angka untuk registri

Ditulis juga sebagai JSON di `naskah/rehab/bukti/bab-04.angka.json` (tidak menyunting `data/angka.json`). Kunci yang sudah ada dan dipakai ulang: `dibi.padang2009.rumah_rb`, `dibi.lombok2018.rumah_rusak`, `dibi.sulteng2018.rumah_rusak`, `dibi.cianjur2022.rumah_rusak`, `dibi.cianjur2022.rumah_rusak_berat`, `dibi.sumatra2025.rumah_rusak_berat`, `dibi.sumatra2025.mengungsi`, `r3p.cianjur2022.rumah_rusak`, `brr.aceh2004.rumah_rusak`, `perban2017_5.r3p_hari_maks`, `perban2017_5.r3p_masa_tahun`, `kemenkopmk.lombok2018.kebutuhan_r3p`, `kemenkopmk.lombok2018.realisasi_persen`.

| Kunci | Nilai | Berkas + jalur / pustaka | Label | Sumber |
|---|---|---|---|---|
| rehab.dibi.rumah_rb.2015_2025 | 301.311 | `dibi/rekap_nasional_tahunan.csv` olah Σ alam bencana 2015–2025 / `bnpb-dibi` | resmi | DIBI |
| rehab.dibi.rumah_rs.2015_2025 | 256.321 | sama | resmi | DIBI |
| rehab.dibi.rumah_rr.2015_2025 | 743.198 | sama | resmi | DIBI |
| rehab.dibi.rumah_rusak.2015_2025 | 1.300.830 | sama | resmi | DIBI |
| rehab.dibi.rumah_rb.2018 | 117.655 | sama, tahun 2018 | resmi | DIBI |
| rehab.dibi.rumah_rb.2025 | 70.391 | sama, tahun 2025 | resmi | DIBI |
| rehab.dibi.rumah_rb.porsi_2018_2025_persen | 62,4 | olahan | resmi (olahan) | DIBI |
| rehab.dibi.rumah_rb.gempa.2015_2025 | 152.659 | sama, kategori Gempabumi | resmi | DIBI |
| rehab.dibi.rumah_rb.banjir.2015_2025 | 104.296 | kategori Banjir | resmi | DIBI |
| rehab.dibi.rumah_rb.cuaca_ekstrem.2015_2025 | 24.876 | kategori Cuaca ekstrem | resmi | DIBI |
| rehab.dibi.rumah_rb.longsor.2015_2025 | 12.865 | kategori Longsor | resmi | DIBI |
| rehab.dibi.rumah_rb.erupsi.2015_2025 | 3.648 | kategori Erupsi gunung api | resmi | DIBI |
| rehab.dibi.rumah_rb.tsunami.2015_2025 | 1.583 | kategori Tsunami | resmi | DIBI |
| rehab.dibi.rumah_rb.geologi_persen.2015_2025 | 52,4 | olahan | resmi (olahan) | DIBI |
| rehab.dibi.jembatan_rusak.2018_2025 | 3.833 | Σ 2018–2025 | resmi | DIBI |
| rehab.dibi.jembatan_rusak.2025 | 1.088 | 2025 | resmi | DIBI |
| rehab.dibi.jembatan_rusak.rerata_2018_2024 | 392 | olahan | resmi (olahan) | DIBI |
| rehab.dibi.jembatan_rusak.banjir.2018_2025 | 3.419 | kategori Banjir | resmi | DIBI |
| rehab.dibi.jembatan_rusak.porsi_banjir_persen | 89,2 | olahan | resmi (olahan) | DIBI |
| rehab.dibi.jembatan_rusak.longsor.2018_2025 | 246 | kategori Longsor | resmi | DIBI |
| rehab.dibi.jembatan_rusak.gempa.2018_2025 | 52 | kategori Gempabumi | resmi | DIBI |
| rehab.dibi.jembatan_rusak.erupsi.2018_2025 | 51 | kategori Erupsi | resmi | DIBI |
| rehab.dibi.jembatan_rusak.cuaca_ekstrem.2018_2025 | 37 | kategori Cuaca ekstrem | resmi | DIBI |
| rehab.dibi.jembatan_rusak.gelombang.2018_2025 | 28 | kategori Gelombang pasang / Abrasi | resmi | DIBI |
| rehab.dibi.fasum_rusak.2015_2025 | 21.703 | kolom `fasum_rusak` | resmi | DIBI |
| rehab.dibi.pendidikan_rusak.2015_2025 | 11.617 | kolom `pendidikan_rusak` | resmi | DIBI |
| rehab.dibi.fasyankes_rusak.2015_2025 | 1.714 | kolom `fasyankes_rusak` | resmi | DIBI |
| rehab.dibi.rumah_ibadat_rusak.2015_2025 | 8.372 | kolom `rumah_ibadat_rusak` | resmi | DIBI |
| rehab.dibi.jembatan_rusak.prov.aceh.2018_2025 | 633 | `dibi/rekap_provinsi_tahunan.csv` olah | resmi | DIBI |
| rehab.dibi.jembatan_rusak.prov.sumbar.2018_2025 | 521 | sama | resmi | DIBI |
| rehab.dibi.jembatan_rusak.prov.sulsel.2018_2025 | 280 | sama | resmi | DIBI |
| rehab.dibi.jembatan_rusak.prov.aceh.2025 | 480 | sama, 2025 | resmi | DIBI |
| rehab.dibi.jembatan_rusak.prov.sumbar.2025 | 182 | sama, 2025 | resmi | DIBI |
| rehab.dibi.jembatan_rusak.sumatra3prov.2025 | 744 | sama, Aceh+Sumut+Sumbar 2025 | resmi | DIBI |
| rehab.dibi.jembatan_rusak.porsi_6prov_persen | 54,5 | olahan | resmi (olahan) | DIBI |
| rehab.dibi.jembatan_rusak.prov_berulang_8_tahun | 17 | olahan | resmi (olahan) | DIBI |
| rehab.dibi.jembatan_rusak.prov_tercatat | 37 | olahan | resmi (olahan) | DIBI |
| rehab.dibi.rumah_rb.prov.ntb.2015_2025 | 78.167 | `dibi/rekap_provinsi_tahunan.csv` olah | resmi | DIBI |
| rehab.dibi.rumah_rb.prov.aceh.2015_2025 | 58.932 | sama | resmi | DIBI |
| rehab.dibi.rumah_rb.prov.sulteng.2015_2025 | 35.921 | sama | resmi | DIBI |
| rehab.dibi.rumah_rb.prov.aceh.2025 | 53.905 | sama, 2025 | resmi | DIBI |
| rehab.dibi.kab.berulang_hidromet_11_tahun | 94 | `skenario-hidromet/dibi_kab_tahun.csv` olah | resmi (olahan) | DIBI |
| rehab.dibi.kab.acehutara.rumah_rusak_hidromet.2015_2025 | 92.450 | sama | resmi (olahan) | DIBI |
| rehab.lantai.gempa.padang2009.rumah_rusak | 271.540 | `dibi/kejadian_besar.csv` [kode=padang2009,metrik=rumah_rusak,versi=DIBI].nilai | resmi | DIBI |
| rehab.lantai.gempa.lombok2018.rumah_rb | 75.160 | [kode=lombok2018,metrik=rumah_rusak_berat,versi=DIBI].nilai | resmi | DIBI |
| rehab.lantai.likuefaksi.sulteng2018.rumah_rb | 34.166 | [kode=sulteng2018,metrik=rumah_rusak_berat,versi=DIBI].nilai | resmi | DIBI |
| rehab.lantai.banjir.sumatra2025.rumah_rusak | 228.006 | [kode=sumatra2025,metrik=rumah_rusak,versi=DIBI].nilai | resmi | DIBI |
| rehab.lantai.erupsi.merapi2010.rumah_rb | 2.465 | [kode=merapi2010,metrik=rumah_rusak_berat,versi=DIBI].nilai | resmi | DIBI |
| rehab.lantai.banjir.seroja2021.rumah_rusak | 54.268 | [kode=seroja2021,metrik=rumah_rusak,versi=DIBI].nilai | resmi | DIBI |
| rehab.lantai.tsunami.aceh2004.rumah_brr | 140.304 | pustaka `brr-2009-scattered-beads` hlm. xiii | resmi | BRR |
| rehab.pulih.sumatra2025.jembatan_daerah_terdampak | 1.181 | pustaka `pu-2026-pemulihan-sumatera-mei` | resmi | Kementerian PU |
| rehab.pulih.sumatra2025.jembatan_daerah_fungsi_persen_2026_05 | 67 | sama | resmi | Kementerian PU |
| rehab.pulih.sumatra2025.jalan_daerah_ruas_terdampak | 2.421 | sama | resmi | Kementerian PU |
| rehab.pulih.sumatra2025.jalan_daerah_fungsi_persen_2026_05 | 94 | sama | resmi | Kementerian PU |
| rehab.pulih.sumatra2025.jalan_jembatan_nasional_fungsi_persen_2026_05 | 100 | sama | resmi | Kementerian PU |
| rehab.pulih.sumatra2025.hunian_kk_selesai_2026_05 | 1.547 | sama | resmi | Kementerian PU |
| rehab.pipa.sumatra2025.spam_terdampak | 178 | sama | resmi | Kementerian PU |
| rehab.pipa.sumatra2025.persen_fungsi_mei2026 | 95,5 | sama | resmi | Kementerian PU |
| rehab.pipa.sumatra2025.spam_fungsi_feb2026 | 143 | pustaka `pu-2026-spam-februari` | resmi | Kementerian PU |
| rehab.pulih.sumatra2025.rumah_rusak_bnpb_2025_12 | 147.000 | pustaka `dpr-2026-info-singkat-sumatra` | resmi | BNPB via DPR |
| rehab.pulih.sumatra2025.rumah_terdampak_pkp_2026_01 | 189.308 | sama | resmi | Kementerian PKP via DPR |
| rehab.pelajaran.sulteng.huntap_ditetapkan | 5.598 | pustaka `kemenkopmk-2024-huntap-sulteng` | resmi | Kemenko PMK |
| rehab.pelajaran.sulteng.huntap_sisa_jun2024 | 382 | sama | resmi | Kemenko PMK |
| rehab.pulih.lombok2018.rumah_selesai_2020_03 | 170.559 | pustaka `kemenkopmk-2020-lombok-percepatan` | resmi | Kemenko PMK |
| rehab.pulih.lombok2018.rumah_sasaran | 226.204 | sama | resmi | Kemenko PMK |
| rehab.pulih.lombok2018.persen_selesai_2020_03 | 75,40 | sama | resmi | Kemenko PMK |
| rehab.pulih.sumatra2025.jembatan_nasional_putus_aceh_2025_12 | 14 | pustaka `binamarga-2025-jembatan-aceh` | resmi | Bina Marga |
| rehab.pipa.pulih.kobe_90 | 38 | pustaka `jsce-2011-nojima` | terverifikasi | JSCE |
| rehab.pipa.pulih.tohoku_90 | 36 | sama | terverifikasi | JSCE |

## Pustaka

CSL-JSON di `naskah/rehab/bukti/bab-04.pustaka.json`, 15 entri: `bnpb-dibi`, `bnpb-2023-juklak7`, `bnpb-2017-r3p`, `cianjur-2022-r3p`, `brr-2009-scattered-beads`, `kemenkopmk-2020-lombok-percepatan`, `kemenkopmk-2024-rehabrekon-lombok`, `kemenkopmk-2021-sulteng`, `kemenkopmk-2024-huntap-sulteng`, `pu-2026-spam-februari`, `pu-2026-pemulihan-sumatera-mei`, `dpr-2026-info-singkat-sumatra`, `binamarga-2025-jembatan-aceh`, `ocg-2026-palu4`, `jsce-2011-nojima`; ditambah dua entri berpenanda sekunder untuk lampiran rekonsiliasi saja: `kontan-2025-jembatan-sumatra`, `cnn-2026-satgas-prr`. Id yang sama dengan `pustaka.json` utama disalin apa adanya agar penggabungan idempoten.
