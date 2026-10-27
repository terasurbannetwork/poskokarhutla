# RANCANGAN: Neraca Air Pulau Jawa per Kabupaten/Kota

Versi 0.1, 26 Oktober 2026. Status: rancangan untuk diputuskan pemilik, belum ada kode.
Keputusan pemilik yang sudah dikunci: unit = semua kab/kota Jawa (6 provinsi, 119 unit, kode Kemendagri seperti paket
`air-jawa`); lingkup = pasokan lawan kebutuhan; hasil = surplus/defisit per kab per bulan, plus tahunan dan musim kemarau;
keluaran = lapisan peta+tabel di repo ini, buku kajian BNPB, dan deck.

Label keyakinan memakai skema paket `air-jawa` (`resmi`, `terverifikasi`, `estimasi-model`, `asumsi-kebijakan`,
`sekunder`, `olah(x)`). Semua angka neraca hasil pipeline ini berlabel `estimasi-model` sampai lolos validasi §3.4.
Tanda **[BELUM DICEK]** = belum dibuka dari sumber primer.

## 1. Metode

### 1.1 Persamaan per kab per bulan

    P - ETa - Qout + Qin - U = dS

- P hujan wilayah kab (mm x luas = juta m3); ETa evapotranspirasi aktual; Qin aliran sungai masuk dari kab hulu;
  Qout aliran keluar ke kab hilir atau laut; U pemakaian manusia (domestik, irigasi, industri, ternak); dS perubahan
  simpanan (lengas tanah + air tanah dangkal). Waduk besar tidak dimodelkan di v1 (lihat §1.4).
- Langkah waktu bulanan. Bak lengas tanah Thornthwaite-Mather bulanan, metode yang disebut SNI 19-6728.1-2002
  bagian 5 (hujan dan suhu bulanan, penggunaan lahan, jenis tanah -> runoff dan detensi bulanan). ET0 diambil langsung
  (Penman-Monteith FAO-56 dari ERA5-Land), sejalan dengan `scripts/kekeringan/fao.py`. ETa = ET0 x Kc x Ks, Ks dari bak (FAO-56 pers. 84, pakai ulang `langkah` di
  `scripts/kekeringan/neraca.py`). TAW per kab dari peta tanah yang sudah dipakai `tanah.py`/`fao.py`; v1 boleh satu TAW
  per kelas tanah (ponytail: TAW seragam per kelas, rinci per piksel bila validasi menuntut).
- Limpasan lokal R = surplus bak (P - ETa - pengisian bak). Dipecah menjadi aliran langsung dan aliran dasar dengan
  tampungan linear satu reservoir (k bulanan, dikalibrasi ke GloFAS, §3.4) supaya debit kemarau tidak nol.
- Ketersediaan bulanan kab: A = R_lokal + Qin. Neraca: N = A - U (positif surplus, negatif defisit).
  Ketersediaan andalan A80 = persentil eksedansi 80% per bulan atas 35 tahun (praktik debit andalan PUPR untuk irigasi;
  90% untuk air baku) **[BELUM DICEK: pasal/pedoman PUPR yang menetapkan Q80/Q90]**.
- Indikator per kab: N rerata dan N80 (juta m3) per bulan; tahunan; kemarau (Jun-Sep, empat bulan, sama dengan
  kartu kemarau Kajian Air); rasio U/A (gaya indeks pemakaian air, `ws.csv` kolom `ipa_persen`); status DDL air
  Permen LH 17/2009 (Sa/Da) sebagai pembanding resmi.

### 1.2 Penelusuran aliran antar-kab

Pakai HydroBASINS v1c (HydroSHEDS, Lehner & Grill 2013) yang sudah dipakai `scripts/banjir/bukti_das.py` (zip
`hybas_as_lev09/12_v1c` di `data/raw/banjir/das/`, rantai `NEXT_DOWN`).

1. Langkah sekali (lokal, tidak di CI): potong sub-DAS level 12 (rerata ~100-200 km2 **[BELUM DICEK luas rerata Jawa]**)
   dengan poligon `public/geo/kabupaten/3[1-6].json`. Simpan tabel topologi kecil yang di-commit:
   `scripts/air/neraca/topologi.json` = per sub-DAS: id, next_down, luas, pecahan luas per kode kab.
2. Tiap bulan: R_lokal sub-DAS dihitung dari sel iklim; dialirkan kumulatif menurut `NEXT_DOWN` (tanpa jeda waktu;
   waktu tempuh Jawa < 1 bulan). Aliran yang melewati tepi sub-DAS yang berpindah kab dicatat sebagai Qout kab asal dan
   Qin kab tujuan. Sub-DAS yang terbelah dua kab: alirannya dibagi menurut pecahan luas (asumsi, berlabel).
3. Kota kecil (luas < satu sub-DAS, mis. Kota Mojokerto, Kota Magelang) mendapat Qin = aliran sungai yang
   melintasinya menurut pecahan luas. Ini kasar; kartu kota menampilkan catatan.
4. Alternatif WS (Permen PUPR 4/2015 Kriteria dan Penetapan Wilayah Sungai) dipakai hanya untuk agregasi dan
   validasi (`ws_kab.csv` sudah ada), bukan untuk routing: batas WS terlalu kasar untuk aliran antar-kab.

### 1.3 Periode dan skenario

- Klimatologi 1991-2025 (35 tahun; memuat normal WMO 1991-2020; sama dengan `iklim_neraca.json` kekeringan).
- Skenario tahun kering: 2015 (El Nino kuat), 2019 (IOD positif + El Nino lemah), 2023 (El Nino). Opsi 1997 bila
  pemilik mau lantai terburuk (Kajian Air memakai prinsip lantai kejadian terburuk, bab-03).
- Kebutuhan U memakai kondisi 2025 untuk semua skenario (pertanyaan: proyeksi 2030?).

### 1.4 Penyederhanaan v1 yang disengaja

- Waduk (Jatiluhur, Saguling, Cirata, Kedung Ombo, Gajah Mungkur, Karangkates dan lainnya di `bendungan.csv`) tidak
  dioperasikan; defisit kemarau hilir waduk cenderung dibesar-besarkan. Kab hilir waduk diberi bendera.
- Transfer antar-DAS buatan (Saluran Tarum Barat ke Jakarta, dll.) tidak ada di HydroSHEDS. Tabel transfer tulis
  tangan `asumsi-kebijakan` di v2.
- Air tanah dalam tidak dihitung sebagai pasokan (CAT dicatat terpisah, `cat_air_tanah_rusak.csv`).
- U = pengambilan (withdrawal), tanpa aliran balik. Konservatif; aliran balik irigasi jadi pertanyaan pemilik.

### 1.5 Pembanding pendekatan resmi Indonesia

| Pendekatan | Unit, langkah | Inti | Beda dengan rancangan ini |
| --- | --- | --- | --- |
| SNI 19-6728.1-2002 "Penyusunan neraca sumber daya, Bagian 1: Sumber daya air spasial" (BSN), dibuka dari big.go.id | DAS/SWS atau administrasi, tahunan; bulanan untuk bak | Inventaris pasokan dikurangi pemanfaatan; koefisien kebutuhan (§2.5) | Kita bulanan, plus routing antar-kab |
| SNI 6728.1:2015 "Penyusunan neraca spasial sumber daya alam, Bagian 1: Sumber daya air" (BSN) | sama | Pengganti 2002 | **[BELUM DICEK: teks 2015 tidak terbuka gratis]** 26 Okt 2026: tidak ada salinan di BIG/BSN/JDIH yang bisa dibuka; dikutip jurnal (mis. DAS Ciujung 2021) memakai Q80 dan indeks pemakaian air. Pipeline v1 memakai koefisien SNI 19-6728.1-2002; perlu beli/pinjam teks dari BSN (sispk.bsn.go.id) |
| Permen LH 17/2009 Pedoman Penentuan Daya Dukung Lingkungan Hidup dalam Penataan Ruang Wilayah | administrasi, tahunan | SA = 10 x C x R x A (pers. 5; C koefisien limpasan tertimbang Tabel 9, R hujan tahunan mm, A ha, 10 = konversi mm.ha ke m3); DA = N x KHLA (pers. 6), KHLA = 1.600 m3/kapita/tahun (= 2 x 800); SA > DA surplus, SA < DA defisit/terlampaui | Tanpa aliran masuk dari hulu dan tanpa musim. **Dicek 26 Okt 2026** di salinan lampiran hlm 26-30 (berkas BLH Kab. Sukabumi, blhkabsukabumi.wordpress.com/wp-content/uploads/2010/08/permenlhno-17tahun2009.pdf): tidak ada ambang rasio, status hanya perbandingan SA dan DA |
| PUPR: neraca air dalam Pola dan Rencana PSDA WS (Permen PU 22/PRT/M/2009 Pedoman Teknis dan Tata Cara Penyusunan Pola PSDA; Permen PUPR 10/2015) | WS, tengah bulanan, model jaringan (lazim RIBASIM) | Debit andalan vs kebutuhan per node, waduk dioperasikan | Lebih rinci di WS tetapi tidak per kab; status 22/2009 masih berlaku **[BELUM DICEK]**; kaitan resmi ke RIBASIM **[BELUM DICEK]** |
| BPS | nasional/pulau | Ketersediaan air permukaan Jawa 175.558 juta m3/th (Radhika dkk. 2017, dikutip BPS 2020, sudah di `neraca_jawa.csv`) | Publikasi neraca air SEEA-Water BPS tidak ditemukan; Sisnerling memuat lahan, energi, mineral **[BELUM DICEK katalog lengkap]** |

## 2. Sumber data

Semua diakses dengan `urllib` (stdlib) lewat `ambil`/`per_lokasi`/`KuotaHabis` di `scripts/banjir/umum.py`.

| Komponen | Sumber, URL | Resolusi | Lisensi | Akses |
| --- | --- | --- | --- | --- |
| Hujan, ET0, suhu | ERA5-Land via Open-Meteo Archive `https://archive-api.open-meteo.com/v1/archive?models=era5_land&daily=precipitation_sum,et0_fao_evapotranspiration` (pola `scripts/data/tanah.py`) | 0,1 deg, harian, 1950- | CC BY 4.0 (Open-Meteo; Copernicus) | Kisi 0,1 deg darat Jawa (~1.300 sel **[hitung ulang]**), bobot kuota ~180/sel untuk 35 th, 2 var: ~10 hari kuota gratis sekali seumur hidup; hasil bulanan di-cache dan di-commit seperti `iklim_neraca.json` |
| Hujan pembanding | CHIRPS v2.0 bulanan `https://data.chc.ucsb.edu/products/CHIRPS-2.0/` | 0,05 deg | Domain publik | GeoTIFF butuh pustaka; v1 hanya validasi lokal. Jalan stdlib: ClimateSERV API JSON **[BELUM DICEK]** |
| ETa pembanding | MODIS MOD16A2GF (LP DAAC, 500 m, 8-harian, login Earthdata); GLEAM v4 (gleam.eu, 0,1 deg, bulanan, registrasi) | | NASA terbuka; GLEAM lisensi akademik **[BELUM DICEK]** | Validasi lokal sekali, bukan CI |
| Debit sungai | GloFAS v4 via Open-Meteo Flood API `https://flood-api.open-meteo.com/v1/flood` (sudah di `scripts/banjir/sungai.py`) | 0,05 deg, harian, 1984- | CC BY 4.0 | Debit bulanan di titik keluar kab utama untuk kalibrasi k dan validasi |
| DAS, sungai | HydroBASINS v1c lev 12, HydroRIVERS v1.0 `https://www.hydrosheds.org` | ~15 arc-s | lisensi HydroSHEDS (bebas, atribusi) | Zip lokal, keluaran topologi di-commit |
| Batas kab | `public/geo/kabupaten/31..36.json` (BIG Juni 2026, `scripts/geo/batas.py`) | | IGD terbuka UU 4/2011 | sudah di repo |
| Penduduk | WorldPop R2025A per kecamatan `public/data/penduduk.json` (dipakai `air-jawa`); BPS proyeksi 2025 per kab sebagai versi `resmi` (`air-jawa.py tarik`) | kec/kab | CC BY 4.0 / BPS | sudah di repo |
| Kota/desa | BPS persentase penduduk perkotaan per provinsi; kota = 100% perkotaan | prov | BPS | tabel tulis tangan kecil **[sumber tabel BPS dipilih saat tiket NA-03]** |
| Irigasi | Luas DI per kab `irigasi_kab.csv` (OCR Permen PUPR 14/2015 Kriteria dan Penetapan Status Daerah Irigasi); luas baku sawah Kepmen ATR/BPN 686/2019 **[BELUM DICEK nomor]**; BPS luas panen padi per kab | kab | resmi | sudah di repo / tarik sekali |
| Ternak | BPS populasi ternak per kab (sapi, kerbau, kambing, domba, babi, unggas) | kab | BPS | tarik sekali, CSV di-commit |
| Industri | Tidak ada data pengambilan per kab yang terbuka. Opsi: BPS tenaga kerja industri besar-sedang per kab x koefisien, atau persen domestik | kab | | pertanyaan pemilik |

### 2.5 Koefisien kebutuhan (SNI 19-6728.1-2002, dibuka dari PDF BIG)

- Domestik: perkotaan 120 L/kapita/hari, pedesaan 60 L/kapita/hari (bagian 5). Tabel 5 SNI yang sama memuat standar
  sambungan rumah 250 (kota > 1 juta), 150, pedesaan 100 L/jiwa/hari; dipakai sebagai skenario atas.
- Irigasi: 1 L/det/ha (teknis, semi teknis, sederhana), A = L x It x a. v1 menghitung juga kebutuhan bulanan
  (Kc x ET0 + perkolasi + penyiapan lahan - hujan efektif, gaya KP-01 PUPR) supaya ada musim; 1 L/det/ha jadi
  pembanding. Pola tanam bawaan padi-padi-palawija **[asumsi-kebijakan]**.
- Ternak (Tabel 4): sapi/kerbau 40, domba/kambing 5, babi 6, unggas 0,6 L/ekor/hari.
- Tambak: 0,8 / 3,9 / 5,9 L/det/ha (sederhana/semi intensif/intensif); masuk v2 bila ada luas tambak per kab.
- Bila teks SNI 6728.1:2015 berbeda, 2015 menang setelah dibuka.

## 3. Pipeline

### 3.1 Berkas (idiom repo: stdlib, `uji` self-check, kontrak keluaran diperiksa sebelum ditulis)

    scripts/air/neraca/
      topologi.py   sekali, lokal: HydroBASINS x kab -> topologi.json (di-commit)
      iklim.py      ERA5-Land bulanan per sel -> iklim.json (di-commit; lanjut otomatis bila kuota habis)
      kebutuhan.py  U per kab per bulan dari penduduk, irigasi, ternak, industri -> kebutuhan.json
      neraca.py     bak + routing + indikator -> public/data/neraca_air/*.json
      uji (subperintah tiap skrip): kasus angka tangan (bak 3 bulan, rantai 3 sub-DAS 2 kab),
                    konservasi massa: jumlah Qout ke laut + ETa + U + dS = P + Qin luar Jawa (=0) dalam 0,1%

### 3.2 Keluaran `public/data/neraca_air/`

| Berkas | Isi | Ukuran perkiraan |
| --- | --- | --- |
| `kab.json` | 119 kab x 12 bulan x {P, ETa, R, Qin, Qout, U per sektor, N, N80, rasio} x 4 skenario (klimatologi, 2015, 2019, 2023) | ~250 KB (~60 KB gzip) |
| `ringkas.json` | per kab: N tahunan, N kemarau, bulan defisit, status DDL, bendera waduk/kota kecil | ~25 KB |
| `aliran.json` | tepi kab->kab dengan aliran bulanan (untuk panah di peta) | ~40 KB |
| `terkini.json` | bulan terakhir ERA5-Land vs klimatologi (anomali N) | ~15 KB |
| `meta` di tiap berkas | sumber, label, versi, tanggal tarik, sha1 masukan | |

Geometri tidak disalin: layar memakai `public/geo/kabupaten/*.json`.

### 3.3 Jadwal

- Klimatologi dan skenario: dibangun sekali, ulang hanya bila metode berubah (cache di-commit).
- Bulanan: workflow baru `neraca-air.yml`, tanggal 8 tiap bulan (jeda ERA5-Land ~5 hari), hanya menambah bulan
  terakhir ke `terkini.json`. Satu panggilan Open-Meteo per sel x 1 bulan, murah.

### 3.4 Validasi (wajib sebelum label naik)

1. Debit: Qout di muara 10-15 sungai besar (Citarum, Serayu, Bengawan Solo, Brantas, dst.) lawan GloFAS bulanan:
   KGE dan bias volume; target |bias| < 25% tahunan **[ambang usulan]**. Pos duga air BBWS bila datanya didapat.
2. Pulau: total R Jawa lawan 175.558 juta m3/th (BPS 2020, `neraca_jawa.csv`, `estimasi-model`) dan lawan angka
   ketersediaan/kebutuhan Pola PSDA WS yang terbit (Citarum, Bengawan Solo, Brantas) per WS lewat `ws_kab.csv`.
3. ETa: lawan MOD16 dan GLEAM rerata tahunan per kab.
4. Uji negatif (TEST.md): neraca yang tidak konservatif massa, kab tanpa topologi, atau nilai negatif P/U ditolak `uji`.
   Asersi invarian, bukan potret angka.

## 4. Lapisan web

- Tempat: halaman baru `/kekeringan/neraca.html` di modul kekeringan (registry `public/bencana.json` sudah punya
  `kekeringan`), ditautkan dari `/bnpb`. Alternatif: lapisan di peta utama kekeringan. Pertanyaan pemilik.
- Peta kab Jawa: warna divergen N (merah defisit, biru surplus), skala tetap per indikator, kab tanpa data abu-abu.
  Pengalih indikator: N rerata / N80 / rasio U/A / status DDL.
- Penggeser bulan Jan-Des + tombol "Tahunan" dan "Kemarau Jun-Sep". Pengalih skenario: Normal / 2015 / 2019 / 2023.
- Panah aliran antar-kab (tebal ~ Qin), dapat dimatikan.
- Kartu kab: neraca bulanan (batang P-ETa-U, garis N), rincian U per sektor, Qin dari kab mana, label
  `estimasi-model`, bendera waduk/kota kecil, sumber.
- Tabel 119 kab dapat diurut dan diunduh CSV.
- Handler penggeser hanya mengganti warna fill (tanpa rebuild layer), diperiksa `inp-reviewer`; angka diperiksa
  `selera-angka` (format Indonesia, juta m3, tanpa presisi palsu).

## 5. Buku dan deck

Pakai mesin Kajian Air apa adanya: paket data `data/kajian-bnpb/data/neraca-air/` dibangun `bangun/neraca-air.py`
(pola `air-jawa.py`: luring, self-check, label per kolom), naskah `naskah/neraca-air/bab-XX.md` + `bukti/*.angka.json`,
DOCX/PDF lewat `bangun/docx`, deck lewat skill `skill/deck-bnpb` (`deck.json`, gerbang QA 0 GAGAL).

Buku (8 bab + lampiran): 1 Pendahuluan; 2 Tinjauan (SNI, Permen LH 17/2009, Pola PSDA, praktik luar); 3 Metode dan
data; 4 Pasokan: hujan, ET, limpasan, aliran antar-kab; 5 Kebutuhan per sektor; 6 Neraca per kab: bulanan, tahunan,
kemarau; 7 Tahun kering 2015/2019/2023 dan kab rawan defisit; 8 Implikasi penanggulangan bencana kekeringan
(prioritas droping air, embung, renkon). Lampiran: tabel 119 kab, validasi, koefisien, celah data.

Deck (~14 slide): judul; pesan utama; peta neraca tahunan; peta kemarau; 10 kab defisit terdalam; aliran antar-kab
(siapa bergantung pada hulu siapa); kebutuhan per sektor; skenario El Nino; validasi dan batas; pembanding resmi;
rekomendasi (3 slide); lampiran metode.

## 6. Tiket dan pertanyaan

| Tiket | Isi | Urutan | Upaya |
| --- | --- | --- | --- |
| NA-00 | Agen pemilik `neraca-air` di `scripts/agents/roster.json` (AGENTS §1.5), baris peta modul | 1 | 0,5 h |
| NA-01 | Buka SNI 6728.1:2015 dan lampiran Permen LH 17/2009; tutup semua [BELUM DICEK] | 1 | 1 h |
| NA-02 | `topologi.py` + topologi.json + uji konservasi | 2 | 2 h |
| NA-03 | `iklim.py` ERA5-Land 1991-2025, cache bertahap | 2 | 1 h kerja, ~10 hari kuota |
| NA-04 | `kebutuhan.py` (penduduk, irigasi, ternak; industri sesuai keputusan) | 2 | 2 h |
| NA-05 | `neraca.py` bak + routing + indikator + skenario | 3 | 3 h |
| NA-06 | Validasi GloFAS/BPS/WS/ETa, laporan angka | 4 | 2 h |
| NA-07 | Workflow bulanan `neraca-air.yml` (mekanik-mesin) | 5 | 0,5 h |
| NA-08 | Halaman `/kekeringan/neraca.html` + review INP/angka | 5 | 3 h |
| NA-09 | Paket data kajian + naskah 8 bab | 6 | 5 h |
| NA-10 | Deck + gerbang QA | 7 | 2 h |

Pertanyaan untuk pemilik:
1. Musim kemarau Jun-Sep (empat bulan) atau Mei-Okt?
2. Industri: koefisien dari tenaga kerja BPS, persen domestik, atau dikecualikan dengan catatan?
3. Aliran balik irigasi dihitung (pecahan berapa) atau U tetap pengambilan bruto?
4. Waduk dan transfer Tarum Barat masuk v1 (tabel tulis tangan) atau v2?
5. Kebutuhan 2025 saja, atau tambah proyeksi 2030 (selaras Grand Design 2026-2030)?
6. Tahun 1997 ikut sebagai lantai terburuk?
7. Tempat web: halaman di modul kekeringan atau di ruang `/bnpb`?
8. Ada akses data pos duga air BBWS atau neraca Pola PSDA WS digital untuk validasi?

## Keputusan pemilik (26 Okt 2026)

1. Musim kemarau = Juni sampai Oktober (lima bulan).
2. Industri: koefisien dari tenaga kerja industri BPS per kab, label estimasi-model.
3. Aliran balik irigasi dihitung, pecahan 30%.
4. Waduk besar (5-6) dan transfer Tarum Barat masuk v1 sebagai tabel tulis tangan bersumber resmi.
5. Kebutuhan 2025 ditambah proyeksi 2030.
6. Tahun 1997 ikut sebagai skenario terburuk, di samping 2015, 2019, 2023.
7. Tidak ada halaman web untuk saat ini; keluaran = data JSON, buku kajian, dan deck. NA-08 ditunda.
8. Tidak ada akses data pos duga air BBWS atau Pola PSDA digital; validasi memakai GloFAS dan BPS 2020.

## NA-01: hasil buka sumber (26 Okt 2026)

| Butir [BELUM DICEK] | Hasil | Status |
| --- | --- | --- |
| Permen LH 17/2009: 1.600 m3/kapita/tahun dan ambang rasio | Dibuka di salinan lengkap (34 hlm, lampiran hlm 26-30): SA = 10 x C x R x A, DA = N x KHLA, KHLA = 1.600 = 2 x 800 m3/kapita/tahun (800 = domestik + pangan, Tabel 11 total 778,35; faktor 2 = hidup layak); status hanya SA > DA surplus, SA < DA defisit. Tidak ada ambang rasio. Berkas: salinan yang diunggah BLH Kab. Sukabumi (bukan JDIH KLHK; JDIH dan peraturan.go.id tidak memberi PDF) | TUTUP (resmi, salinan) |
| SNI 6728.1:2015 teks dan koefisien | Tidak ada salinan terbuka di BIG, BSN, atau JDIH; BSN menjual SNI. Jurnal pemakai (DAS Ciujung 2021) menyebut metode SNI 2015 memakai Q80 dan indeks pemakaian air. v1 memakai SNI 19-6728.1-2002 (PDF BIG, sudah dibuka) | TETAP [BELUM DICEK]: butuh teks dari BSN |
| Pasal/pedoman PUPR Q80/Q90 | Hanya sekunder: jurnal mengutip "Standar Perencanaan Irigasi KP-01 (2013)" untuk debit andalan 80% irigasi; angka 90% air baku tidak ditemukan di sumber mana pun yang terbuka | TETAP [BELUM DICEK]: teks KP-01 belum dibuka; Q90 air baku jangan dikutip |
| Permen PU 22/PRT/M/2009 masih berlaku; kaitan resmi RIBASIM | Tidak dicari ulang (tidak dipakai di v1; keputusan pemilik 8: tanpa Pola PSDA digital) | TETAP, di luar lingkup v1 |
| Katalog SEEA-Water BPS | Tidak dicari ulang | TETAP |
| Persen perkotaan BPS (tiket NA-03/04) | Dipilih: BPS "Persentase Penduduk Daerah Perkotaan menurut Provinsi, 2010-2035" (tabel statis MTI3NiMx, ditarik 26 Okt 2026 ke `mentah/bps/perkotaan_prov_2015_2035.txt`) dan BPS "Proyeksi Penduduk menurut Provinsi, 2010-2035" (MTI3NCMx, `mentah/bps/proyeksi_prov_2010_2035.txt`) untuk skala 2025/2030. Keduanya proyeksi berbasis SP2010, bukan SUPAS 2025 | TUTUP (resmi) |
| Koefisien industri | 500 L/hari/karyawan "PU 2005", hanya dikutip sekunder (jurnal Geoplanning Undip, doi 10.14710/geoplanning.2.2.124-137) | sekunder; teks PU 2005 belum dibuka |
| Transfer Tarum Barat | 6.200 L/det, Dinas SDA DKI Jakarta 28 Jul 2026 (dsda.jakarta.go.id artikel 181) | TUTUP (resmi) |
| Waduk v1 | 6 baris `scripts/air/neraca/waduk.csv`; hanya Kedung Ombo `resmi` (BBWS Pemali Juana 2021); lima lain `sekunder` dari paket air-jawa | TETAP: butuh angka PJT II, PLN (Saguling, Cirata), BBWS Bengawan Solo, PJT I |
