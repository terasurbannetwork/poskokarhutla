# Permintaan data konkret

Tanggal: 1 November 2026. Tujuan: bahan lapis 1 dan 2 strategi desa langganan (lihat `PETA-KOLABORASI.md`).
Penanda: **[V]** terverifikasi dari sumber yang dikutip, **[T]** belum terverifikasi; nama unit dan format harus dicek lewat telepon sebelum surat dikirim.

## 1. Landasan hukum permintaan

| Dasar | Isi yang dipakai | Status |
| ----- | ---------------- | ------ |
| Perpres 39/2019 Satu Data Indonesia | Data pemerintah harus akurat, mutakhir, terpadu, dapat diakses dan dibagipakaikan antarinstansi pusat dan daerah; data yang disebarluaskan Walidata diakses lewat Portal SDI; instansi mengakses data di portal tanpa biaya dan tanpa MoU atau perjanjian kerja sama. Standar dan kode referensi lintas instansi ditetapkan Pembina Data | [V] https://pasal.id/peraturan/perpres/perpres-no-39-tahun-2019 ; https://setkab.go.id/presiden-jokowi-tandangani-perpres-no-392019-tentang-satu-data-indonesia/ . Belum dicek apakah sudah diubah. Teks resmi: JDIH Setneg |
| UU 24/2007 Penanggulangan Bencana | BNPB sebagai penyelenggara penanggulangan bencana; Pasal 26 hak setiap orang atas perlindungan dan informasi penanggulangan bencana; Pasal 26 dan 27 dijabarkan di Perka BNPB 11/2014 tentang peran serta masyarakat | [V] pasal 26 (https://pasal.id/peraturan/uu/uu-no-24-tahun-2007/pasal-26 ; https://bnpb.go.id/storage/app/media/uploads/24/peraturan-kepala/2014/perka-11-tahun-2014.pdf). Pasal tentang peringatan dini dan tugas BNPB meminta data (Pasal 12, 44-47) [T: cek nomor pasal di teks asli] |
| UU 14/2008 Keterbukaan Informasi Publik | Jalur formal cadangan bila surat dinas tidak dijawab (permohonan ke PPID) | [T] belum dikutip dari sumber di sesi ini |
| Kepmendagri 300.2.2-2138/2025 (kode wilayah) | Kode wilayah baku yang dipakai BMKG dan instansi lain | [V] disebut di data.bmkg.go.id dan repositori turunan; teks resmi belum dibaca |
| UU 27/2022 Pelindungan Data Pribadi | Data korban atau penduduk per individu diminta dalam bentuk agregat saja | [T] |

Strategi bahasa: tulis surat dinas berdasarkan kewenangan BNPB dan Satu Data Indonesia; sebut PKS hanya untuk data terus-menerus (API) atau data yang tidak ada di portal. Perpres 39/2019 membuat PKS tidak wajib untuk data yang sudah tersedia di portal SDI, tetapi tidak semua data di bawah ada di portal, jadi minta data langsung dengan suratnya.

## 2. Tabel permintaan

Kode prioritas: S = Sekarang, M = Musim ini, T = Tahun depan. Komponen: L1/L2/L3/S/P dari spesifikasi (API logbook, layar staf, data, sensor, peta publik).

| # | Dataset | Pemegang (unit) | Format | Frekuensi | Dasar | Untuk apa (komponen) | P |
| - | ------- | ---------------- | ------ | --------- | ----- | -------------------- | - |
| 1 | Prakiraan cuaca per desa (kode adm4), 3 hari, interval 3 jam | BMKG, data.bmkg.go.id | JSON API | 2 kali sehari [V] | Terbuka; wajib cantumkan BMKG [V] | Eskalasi harian di desa langganan (L3, P) | S |
| 2 | Peringatan dini cuaca (nowcast) dengan poligon | BMKG | CAP/XML atau JSON [T] | Waktu nyata | Terbuka atau surat | Pengingat lanjutan dan eskalasi (L1) | S |
| 3 | Curah hujan AWS/ARG historis 10 tahun dan waktu nyata untuk 5 kab pilot Jateng (Banjarnegara, Banyumas, Cilacap, Magelang, Temanggung) | BMKG, Pusat Database / Stasiun Klimatologi Jateng [T] | CSV per stasiun | Sekali (historis) lalu harian atau per jam | UU 24/2007, Perpres 39/2019 | Kalibrasi ambang hujan longsor (S) | S |
| 4 | Data radar cuaca (composite) kawasan Jateng | BMKG | Citra/NetCDF | 10 menit | Surat resmi + PKS | Hujan kecil-lokal yang tak tertangkap stasiun (S) | M |
| 5 | Tinggi muka air telemetri pos duga air dan status siaga | Kementerian PU, BBWS Pemali-Juana, BBWS Serayu-Opak, BBWS Citanduy [T: nama BBWS wilayah cek] | CSV/API; SIH3 | 10 menit sampai 1 jam | PKS lewat koordinator PSIH3 wilayah sungai [V, dokumen TKPSDA]; SE 10/2021 untuk mutu | Sensor sungai dan banjir (S, L3) | S |
| 6 | Daftar pos hidrologi: koordinat, jenis, status rusak atau aktif, ambang siaga 1 sampai 4 | Ditjen SDA / BBWS | CSV | Sekali, pembaruan tahunan | Perpres 39/2019 | Menentukan titik tambahan sensor | S |
| 7 | Daftar alat berat milik PU/BBWS per kabupaten dan kesiapan | BBWS, Balai Peralatan PU [T] | Tabel | Tahunan sebelum musim | Surat resmi | Kontrak siaga alat berat (hambatan 206 entri) | M |
| 8 | Data stasiun SIPALAGA (muka air, kelembapan, curah hujan) | BRGM | API/CSV | 10 menit sampai 1 jam [V] | Surat + PKS | Ambang siaga gambut (S, karhutla) | M |
| 9 | Zona Kerentanan Gerakan Tanah (ZKGT) skala detail dan KRB | PVMBG, Badan Geologi, Portal MBG | Vektor/raster (SHP/GeoTIFF) [V ada di portal] | Sekali, pembaruan saat terbit | Terbuka di portal; surat untuk skala detail | Kluster longsor, daftar desa langganan longsor (L3) | S |
| 10 | Prakiraan potensi gerakan tanah bulanan (nasional) | PVMBG | PDF/SHP [V peta dikirim ke pemda] | Bulanan | Terbuka | Pra-musim (L2) | S |
| 11 | Kejadian gerakan tanah dan rekomendasi PVMBG 2015 sampai sekarang | PVMBG, MAGMA Indonesia | CSV/JSON | Sekali + bulanan | Surat | Pasangan label kejadian untuk uji model longsor | M |
| 12 | Batas desa, jaringan jalan, sungai, DEM (DEMNAS) | BIG | SHP/GeoTIFF | Sekali, pembaruan tahunan | Perpres 39/2019, portal Ina-Geoportal [T] | Menghitung keterisolasian desa (L3) | S |
| 13 | Kode dan data wilayah administrasi terbaru (provinsi sampai desa) | Kemendagri, Ditjen Bina Adwil | CSV | Tahunan (Kepmendagri) | Permendagri/Kepmendagri [V] | Kunci gabung semua data, ganti kunci `prov dan nama` bila perlu | S |
| 14 | Penduduk per desa, Podes: akses jalan, sinyal, listrik, kejadian bencana | BPS | CSV (Podes), tabel | Podes tiap 3 tahun, penduduk tahunan [T] | UU Statistik (cek) + Perpres 39/2019 | Denominator per desa, indikator keterisolasian (L3) | S |
| 15 | Daftar desa belum 4G (blank spot) dengan koordinat, termasuk jadwal pembangunan | Komdigi, BAKTI | CSV/SHP | Triwulan | Perpres 39/2019; angka publik: 2.121 desa [V] | Memilih desa yang butuh radio mesh (L3, S) | S |
| 16 | Peta cakupan seluler per operator 2G/3G/4G (poligon) | Komdigi, operator via ATSI [T] | SHP/GeoJSON | Semester | Surat resmi | Perbandingan dengan "sinyal putus" di logbook (306 entri) | M |
| 17 | Data BTS padam saat bencana (waktu padam, waktu pulih, penyebab) | Komdigi, operator | CSV | Per kejadian besar (contoh: Aceh, Des 2025 [V]) | Surat; MoU BNPB-operator | Tingkat keparahan sinyal putus, prioritas pemulihan | M |
| 18 | Titik api dan luas terbakar resmi tahunan (SiPongi) | KLHK/Kehutanan [T] | CSV | Harian/tahunan | Surat | Daftar desa langganan karhutla, label SIPPA (L3) | M |
| 19 | Peta lahan gambut dan KHG | KLHK / BRGM / BBSDLP [T] | SHP | Sekali | Terbuka di Ina-Geoportal [T] | Zona prioritas pemantauan | M |
| 20 | Pooling Fund Bencana: ketentuan pencairan, kriteria pemicu, rencana PFB tahun depan | Kemenkeu (DJPPR, PARB, BPDLH) | Dokumen | Sekali | PMK 28/2025 [V], Perpres 75/2021 [V] | Merancang pemicu aksi antisipatif | M |
| 21 | Dana Siap Pakai: realisasi per kab per kejadian 2019 sampai 2026 | BNPB, Direktorat Pengelolaan Dukungan (internal) | CSV | Sekali | Internal BNPB | Menghitung untung-rugi aksi dini | S |
| 22 | Data Early Action Protocol banjir (pemicu, desa sasaran, hasil) | PMI, IFRC | PDF, tabel | Setelah tiap aktivasi | MoU tiga pihak | Menyatukan desa langganan dan sasaran EAP | S |
| 23 | Bacaan sensor longsor yang sudah terpasang (hujan, ekstensometer, tiltmeter) di lokasi BNPB-UGM | UGM (Fakultas Teknik, tim GAMA-EWS) / BPBD | CSV/API | Waktu nyata | PKS | Sensor lapis 2 (S) | S |
| 24 | Prakiraan banjir sungai Flood Hub untuk Indonesia | Google | API (jika tersedia) [T] | Harian | Perjanjian data | Cadangan prakiraan banjir (ETS kita 0,006) | M |
| 25 | Peta jaringan jalan nasional/provinsi/kabupaten dan status (rusak, rawan) | PU Bina Marga; BIG | SHP | Tahunan | Perpres 39/2019 | Akses terputus (923 entri) | M |

## 3. Urutan pengiriman

1. Minggu ini (S): baris 1, 3, 5, 6, 9, 12, 13, 14, 15, 21, 22, 23. Surat satu halaman per instansi, dilampiri tabel baris yang relevan.
2. Dua minggu: tindak lanjut telepon ke tiap unit untuk menunjuk narahubung dan format.
3. Setelah itu: PKS (UGM, BMKG, PU, BRGM, operator).

Catatan privasi: kita hanya meminta data agregat per desa. Data individu korban tidak diminta.

## 4. Draf surat (gaya dinas)

```
KOP BADAN NASIONAL PENANGGULANGAN BENCANA

Nomor    : B-____/____/____/____/2026
Sifat    : Penting
Lampiran : 1 (satu) berkas
Hal      : Permintaan Data untuk Aksi Antisipatif Bencana di Desa Langganan

Yth.
____ (jabatan pimpinan unit) 
____ (instansi)
di ____

1. Dalam rangka penyelenggaraan penanggulangan bencana sebagaimana diamanatkan Undang-Undang Nomor 24 Tahun 2007 tentang Penanggulangan Bencana, Badan Nasional Penanggulangan Bencana (BNPB) menyusun aksi antisipatif di desa yang berulang terdampak banjir, longsor, dan kebakaran hutan dan lahan, bersama Badan Penanggulangan Bencana Daerah (BPBD).

2. Berdasarkan catatan kejadian 2011 sampai 2023 sebanyak 37.992 kejadian, sebagian desa terdampak setiap musim yang sama, dan hambatan utama berupa akses terputus, sinyal putus, serta barang tidak ada di tempat. Pemahaman ini membutuhkan data dari instansi Saudara untuk menentukan lokasi, waktu, dan ambang tindakan.

3. Sehubungan dengan hal tersebut, dan dengan merujuk Peraturan Presiden Nomor 39 Tahun 2019 tentang Satu Data Indonesia, kami mohon bantuan Saudara untuk menyampaikan data sebagaimana tercantum pada lampiran surat ini, yaitu:
   a. ____ (nama dataset), format ____, cakupan ____, periode ____;
   b. ____;
   c. ____.

4. Data akan dipakai untuk analisis internal BNPB dan BPBD, ditampilkan hanya dalam bentuk agregat per desa atau kecamatan, mencantumkan sumber instansi Saudara, dan tidak diteruskan kepada pihak lain tanpa persetujuan tertulis. Hasil analisis akan kami bagikan kembali kepada instansi Saudara.

5. Apabila diperlukan, kami siap menyusun perjanjian kerja sama untuk pertukaran data secara berkala. Mohon petunjuk pejabat yang dapat kami hubungi: ____ (nama, jabatan, telepon, surel).

6. Atas perhatian dan kerja sama Saudara, kami ucapkan terima kasih.

                                  ____ (jabatan penandatangan)

                                  ____ (nama)

Tembusan:
1. Kepala BNPB
2. ____
```

Isi kolom ____ dengan data tabel. Penandatangan sesuai kewenangan BNPB (pimpinan unit pengelola data), bukan pemilik pribadi.
