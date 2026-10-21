# Ringkasan Eksekutif: Audit Metode Pantau Bencana untuk Paparan Presiden

Tanggal audit: 21 Oktober 2026. Pembaca: pemilik platform, yang harus memutuskan apa yang boleh tampil di depan Presiden dan apa yang diperbaiki lebih dulu.

Bahan: `docs/audit-metode/2026-10-21/mentah/` (berkas `telaah-*`, `tantang-*`, `alternatif-*`, dan `verif-*` dari 10 pemeriksa, lengkap 10 dari 10 modul), `mentah/kritik-ringkasan.json` (pemeriksaan draf ringkasan ini), dan `docs/audit-metode/2026-10-21/status-tautan.tsv`.

Kode status verifikasi:
- **[T]** terverifikasi.
- **[S]** sebagian: inti usulan benar, tetapi ada rujukan atau angka yang harus dikoreksi.

Penunjuk: `keputusan[n]` adalah posisi di `tantang-<modul>.json`; `#n` adalah posisi usulan di `alternatif-<modul>.json`. Upaya (S/M/L) diambil apa adanya dari berkas alternatif.

---

## 1. Kesimpulan

**Sebaran vonis.** Penelaah kedua (tahap tantang) memutuskan ulang 281 metode, lalu menambah 48 metode yang terlewat. Totalnya 329 entri penilaian di 10 modul:

| Vonis akhir | Jumlah | Porsi |
|---|---|---|
| Layak | 14 | 4,3% |
| Layak dengan catatan | 150 | 45,6% |
| Tidak layak | 165 | 50,2% |

**Siapa yang lolos.** Sembilan dari 14 vonis layak adalah produk resmi yang diteruskan apa adanya: status PVMBG (dua entri), arah kolom abu teramati dari laporan PVMBG, nowcast dan peringatan gelombang BMKG, IRBI BNPB, status ENSO/IOD, kategori ISPU, dan factsheet letusan NCEI/GVP. Lima sisanya pengolahan platform yang transparan: penyaring titik palsu, aturan cut-off laporan, tabel tiga sumber luas, kurva musim harian, dan laju Poisson gempa M6+ (layak di modul lintas, layak dengan catatan di modul gempa). Tidak ada model prediktif karhutla, banjir, kekeringan, cuaca, udara, atau abu yang lolos tanpa catatan.

**Pola masalah 1: keluaran model memakai kosakata dan kop lembaga resmi.** Label seperti Waspada/Siaga/Awas, "InaTEWS", "Fire spot", "padam", "terdampak", dan logo BNPB ditempel pada keluaran model. Padahal uji balik repo sendiri mencatat FAR (porsi alarm palsu) yang sangat tinggi:
- Siaga banjir: 0,939
- Siaga longsor: 0,954
- Status kekeringan Waspada ke atas: 0,953–0,988

**Pola masalah 2: konversi satuan tanpa kalibrasi lapangan.** Angka yang dihasilkan menjadi beberapa kali sampai ribuan kali angka lapangan:
- Deck BNPB 21 Okt: luas terbakar 18–30 kali angka BNPB, belum padam 21–25 kali.
- Laporan Harian: Kalteng 12 Okt 20.085 ha, padahal BNPB 64,8 ha (sekitar 310 kali).
- Kebutuhan personel skenario tengah 212.339, sekitar 3 kali personel darat resmi terbaru 71.878. Skenario optimis (65.520) justru dekat angka resmi.
- Kebutuhan air 2,23 miliar L/hari, dibanding 428.200 L total distribusi yang tercatat di laporan BNPB 19 Okt (8 kabupaten). Satuannya pun beda: per hari lawan total.

**Pola masalah 3: label waktu dan kesegaran salah.**
- Nowcast yang sudah kedaluwarsa 6 hari ditulis "aktif".
- SPI bulan Agustus disajikan sebagai "hari ini".
- `/api/status` melaporkan data berumur 6 hari sebagai segar.

**Pola masalah 4: produk resmi dan rujukan internasional yang tersedia belum menjadi lapis utama.** Contohnya PDKM BMKG, peringatan rob BMKG, VA SIGMET, ShakeMap BMKG serta ShakeMap/PAGER USGS, TCWC Jakarta, prakiraan pelabuhan BMKG Maritim, dan IRBI. Umpan zona InaTEWS (`last30tsunamievent.xml`) tersedia tetapi tidak terdokumentasi, sehingga perlu izin BMKG.

**Hasil verifikasi usulan dan klaim.** Pemeriksa memverifikasi 272 usulan perbaikan (166 P1, 105 P2, 1 P3): 158 terverifikasi dan 114 sebagian. Rinciannya P1 100/66, P2 58/47, dan satu P3 sebagian. Tidak ada usulan yang gugur seluruhnya, tetapi banyak rujukannya harus diganti. Dari 60 klaim utama auditor, 49 benar, 10 sebagian benar, dan 1 salah.

**Paling mendesak lintas modul: S-NPP berhenti 1 Nov 2026.** Menurut pengumuman NASA Earthdata, pengiriman produk Suomi NPP (termasuk VIIRS) berhenti 1 Nov 2026 pukul 13.00 UTC (20.00 WIB), 11 hari dari sekarang; tanggal ini dapat berubah. Verifikator titik-luas mencatat halaman FIRMS menyebut 2 Nov, sedangkan pemeriksa ringkasan tidak menemukan banner itu di halaman muka FIRMS pada 21 Okt. Yang bertumpu pada S-NPP antara lain:
- faktor luas 4,3 ha per titik;
- garis dasar "normal" titik panas;
- kurva kumulatif;
- definisi awal musim;
- model sebaran.

| Modul | Entri | Layak | Layak catatan | Tidak layak | Usulan P1 (T/S) |
|---|---|---|---|---|---|
| karhutla-titik-luas-status | 35 | 3 | 15 | 17 | 15 (9/6) |
| karhutla-risiko-cuaca | 24 | 1 | 17 | 6 | 9 (6/3) |
| karhutla-model-sebaran | 24 | 0 | 11 | 13 | 13 (6/7) |
| banjir-rob-longsor | 36 | 0 | 17 | 19 | 19 (15/4) |
| gempa-tsunami | 28 | 0 | 13 | 15 | 15 (3/12) |
| gunungapi | 36 | 3 | 21 | 12 | 19 (17/2) |
| kekeringan | 35 | 2 | 9 | 24 | 16 (11/5) |
| cuaca-ekstrem | 34 | 2 | 9 | 23 | 26 (21/5) |
| udara-asap | 34 | 1 | 13 | 20 | 17 (9/8) |
| lintas-bnpb-sosial | 43 | 2 | 25 | 16 | 17 (3/14) |
| **Total** | **329** | **14** | **150** | **165** | **166 (100/66)** |

---

## 2. Jangan dibawa ke depan Presiden (sebelum diperbaiki)

Semua butir di bawah buktinya sudah dicek ulang di tahap tantang atau verifikasi (termasuk `vonis_dicek`). Vonis akhir disebut per butir. Butir berlabel layak dengan catatan masuk ke sini karena penyajiannya sekarang belum memenuhi catatannya.

### 2.1 Deck BNPB 21 Okt versi "data satelit"

Modul: karhutla-titik-luas-status dan lintas-bnpb-sosial. Vonis: tidak layak (metode terlewat di kedua modul).

**Yang tampil**
- Slide 1–2 memuat kolom "LUAS TERBAKAR*", "BELUM PADAM*", dan "Fire spot".
- Subjudulnya: "±7.646 ha (33 persen) dari ±23.382 ha api 18 Okt telah padam pada 20 Okt".
- Hotspot 20 Okt diberi panah: Kalteng 2.363 ▼44%, Kalbar 211 ▼68%.
- Semua itu berada di bawah "Badan Nasional Penanggulangan Bencana | Copyright 2026", dengan catatan kaki "*Data berdasarkan GIS".

**Lokasi.** `data/laporan-bnpb/satelit-2026-10-21/` (alur `hitung3.py` → `angka.json` → `ganti.py`, lalu PPTX final). Folder ini belum di-commit (status git `??`).

**Mengapa salah.** Angka lapangan BNPB diganti angka platform tanpa kata "perkiraan":
- luas = titik NOAA-20/21 n/h × 0,534 × 4,3 ha;
- "padam" = 48 jam tanpa titik;
- FS = kluster sel satelit.

Ada tiga masalah turunan:
- Tidak terdeteksi tidak sama dengan padam. Platform sendiri menulis "tidak teramati tidak sama dengan padam" (`index.html:5308`) dan memakai aturan aktif 72/168 jam (`harian.py:30`).
- "Fire Spot" BNPB adalah besaran lain. Di `bnpb.json` 12 Okt, Kalteng FS 49 sedangkan hotspot 3.908.
- Pada 20 Okt lintasan siang S-NPP hilang, sehingga hotspot kurang 36–62% (`putaran-2.json`).

**Bukti**

| Besaran | Deck satelit | Angka BNPB | Rasio |
|---|---|---|---|
| Luas Kalteng, 18 Okt | 14.695 ha | 497,09 ha | 29,6× |
| Luas 5 provinsi, 18 Okt | 23.382 ha | 993,74 ha | 23,5× |
| Belum padam 5 provinsi, 18 Okt | 12.082 ha | 568,3 ha | 21,3× |
| Luas 8 provinsi, tiga kolom slide 2 (s.d. 20 Okt) | 29.955 / 20.433 / 21.795 ha | 1.104,21 / 1.118,80 / 1.083,92 ha | 27,1× / 18,3× / 20,1× |
| Belum padam 8 provinsi, tiga kolom slide 2 | 15.045 / 13.044 / 11.680 ha | 597,80 / 572,08 / 554,76 ha | 25,2× / 22,8× / 21,1× |
| FS 8 provinsi, tiga kolom slide 2 | 702 / 747 / 712 | 272 / 269 / 279 | besaran berbeda |

Selain itu, `ganti.py:100,105,107` mengganti judul kolom "LUAS TERBAKAR / TARGET" dan membuang "NA: belum ada data laporan lapangan".

**Perbaikan**
- Kembalikan slide 1–2 ke angka lapangan BNPB/Satgas, atau ke neraca Posko dengan jumlah regu pelapor dicantumkan.
- Pindahkan data satelit ke slide terpisah berjudul "Indikator satelit platform (bukan data BNPB)". Isinya piksel per sensor, FRP, dan persen persistensi. Hari yang lintasannya bercelah tidak diberi panah.
- Gerbang: slide 1–2 tidak boleh memuat satuan "ha" yang bukan dari lapangan.

### 2.2 Hektare harian per provinsi dan kabupaten di Laporan Harian dan Paparan

Modul: karhutla-titik-luas-status. Vonis: tidak layak (`keputusan[4]`).

**Yang tampil**
- Kalimat kepala Laporan Harian Karhutla "Perkiraan luas terbakar X ha pada …", serta kolom "Perkiraan luas" dan "Kumulatif" per provinsi dan kabupaten (`public/laporan.js:302-307, :317-322, :345-352`).
- Kolom "Luas (ha)" 7 hari per kabupaten di Paparan Presiden (`public/paparan_slide.js:310, 321-322`).
- Sumbernya `scripts/data/laporan.py:91-104`: faktor 4,3 ha dikalikan titik S-NPP tiap hari dan tiap wilayah.

**Mengapa salah**
- Faktor 4,3 dikalibrasi tahunan dan nasional. Docstring repo sendiri menyebut angka harian dan provinsi "indikatif" (`laporan.py:20-21`).
- Rasio perkiraan/SiPongi antarprovinsi berkisar 0,32 (Kalsel) sampai 2,24 (Jambi 2019); median antarprovinsi 1,5–2,8 kali, P90 6,9–22,8 kali (`luas_banding.prov`).

**Bukti** (pembanding: kolom "Lahan Terbakar Harian" BNPB di `bnpb.json`, 12 Okt)

| Provinsi | Platform | BNPB | Rasio |
|---|---|---|---|
| Kalteng | 20.085 ha | 64,8 ha | ±310× |
| Kalsel | 2.928 ha | 46,34 ha | ±63× |
| Kalbar | 1.883 ha | 35,14 ha | ±54× |
| Sumsel | 3.595 ha | 278,75 ha | ±13× |

Risiko di depan Presiden: Presiden membaca 20 ribu ha terbakar dalam sehari di Kalteng, sementara BNPB 65 ha. Angka yang tersebar ke daerah langsung dibantah gubernur atau BPBD.

**Perbaikan**
- Hapus luas harian dan luas per wilayah dari Laporan dan Paparan. Per hari cukup titik panas, piksel api aktif, dan FRP.
- Luas per provinsi hanya bulanan dari peta bekas terbakar, atau dari kalibrasi per provinsi yang galat uji baliknya ikut tampil. Usulan titik-luas #4 [S] (lihat 4.2).

### 2.3 "±2,2 juta ha terbakar 2026 — Tertinggi ke-2 sejak 2015"

Modul: lintas-bnpb-sosial dan karhutla-titik-luas-status. Vonis: perkiraan nasional layak dengan catatan (lintas `keputusan[0]`, titik-luas `keputusan[3]`); penyajian di Paparan 20 Okt dan klaim peringkat tidak layak (titik-luas `keputusan[9]`; `vonis_dicek` lintas). Di tahap tantang, vonis lintas turun dari tidak layak ke layak dengan catatan dengan bukti belum terverifikasi; buktinya dikukuhkan di tahap verifikasi.

**Yang tampil**
- Kesimpulan "Tren" di `data/laporan-bnpb/presiden-2026-10-20.json`, tanpa kata perkiraan dan tanpa rentang.
- Grafik Paparan menggambar 2015 = 3,49 juta ha (811.961 titik × 4,3), padahal angka resmi 2015 adalah 2,61 juta ha (`paparan_slide.js`, `riwayat_nasional.js`).

**Mengapa salah**
- Angka ini perkiraan titik S-NPP × 4,3 ha: `laporan.json` 2.151.640 ha, rentang di repo 1.611.228–2.296.751. Layar web sudah menulis rentangnya (`laporan.js:302-304`), kesimpulan deck tidak.
- Peringkatnya membandingkan titik tengah perkiraan dengan angka resmi tahun lain, jadi sumbernya campur (`riwayat_nasional.js:30-32`).
- Peringkat tidak bisa ditentukan. Rentang P10–P90 galat LOO adalah 1,55–2,72 juta ha (dihitung penelaah; verifikator hanya mencocokkan aritmetikanya). Pada batas bawah, angka 2026 di bawah 2019 resmi (1,65 juta); pada batas atas, di atas 2015 resmi (2,61 juta).
- Pembanding resmi pun beda definisi:
  - BNPB 129.899 ha hampir sama dengan luas dipadamkan (129.956 ha);
  - SiPongi 202.011 ha baru sampai Juli.
- Uji luar-contoh Jan–Jul hanya mencakup sekitar 9% total tahunan. Jul–Sep, sekitar 70% total, belum punya pembanding resmi. Kedekatan dengan SiPongi juga bukan validasi independen, karena faktor 4,3 dikalibrasi ke SiPongi.
- Dua produk citra independen berbeda sekitar 3×: Nusantara Atlas (Sentinel-2) 1.916.588 ha Jan–Sep dan MapBiomas Fire 637.011 ha Jan–Agu. Periodenya beda dan sensor MapBiomas belum dicek, jadi rasio itu hanya indikatif.

**Perbaikan**
- Tampilkan tiga lapis angka: resmi, perkiraan dengan selang, dan citra independen.
- Klaim yang kokoh hanya: "jumlah titik panas S-NPP 2026 tertinggi ke-2 sejak 2015". Dasarnya 477.066 titik s.d. 12 Okt, lebih banyak dari 2019 (394.642) dan lebih sedikit dari 2015 (811.961). Klaim ini hanya berlaku sampai S-NPP berhenti.
- Gerbang: frasa "tertinggi ke-" hanya boleh keluar bila batas bawah 2026 di atas angka tahun pembanding.

### 2.4 Luas terbakar konsesi dan bendera negara/grup usaha

Modul: lintas-bnpb-sosial. Vonis: tidak layak (`keputusan[1]`, `keputusan[34]`).

**Yang tampil**
- 884.733 ha di 930 konsesi pada 6 provinsi; Kalbar 421.331 ha.
- Bendera negara dan nama grup di `/laporan-konsesi`.

**Mengapa salah**
- Luas dihitung dari sel 375 m × 14,06 ha (`konsesi_laporan.py:278`). `laporan.py:22` sendiri menyebut cara ini "membesar-besarkan 3-4x".
- Luas di dalam konsesi Kalbar lebih besar dari perkiraan untuk seluruh Kalbar (326.361 ha).
- Peta sawitnya data 2012 (diperbarui 2014), HPH 2014.
- Bendera:
  - Aturan "Berhad" = Malaysia (`konsesi_laporan.py:250`).
  - Tabel tangan tanpa sumber per baris (`laporan_konsesi.js:43-62`).
  - Ini bertentangan dengan keputusan pemilik 14 Okt 2026 (`grup_perusahaan.py:1-3`).

**Perbaikan**
- Hapus hektare dan bendera dari slide. Tampilkan hanya jumlah konsesi bertitik dan jumlah titik.
- Luas yang sah diukur dengan dNBR Sentinel-2 per konsesi.
- Lapis izin: `PBPH_AR_50K`.

### 2.5 "Kalsel dan Kalbar efektif / Sisa api turun 83%" dan "Hujan setelah OMC di 4 provinsi"

Modul: lintas-bnpb-sosial. Vonis: slide efektivitas tidak layak (`keputusan[5]`, naik dari layak dengan catatan di tahap tantang). Atribusi OMC layak dengan catatan (metode terlewat): boleh sebagai fakta operasional, bukan atribusi.

**Mengapa salah: efektivitas.** Aturannya ambang turun ≥50% (`laporan_bnpb_slide.js:336-337`), dan data di deck yang sama membantahnya:

| Provinsi | Belum padam | Hotspot diketik | Keterangan |
|---|---|---|---|
| Kalbar | 5,39 → 0,89 ha (−83%) | 21 → 340 → 836 | hotspot platform 3 hari 3.530 lawan 2.411 (+46%); kolom kendala sendiri menulis "hotspot satelit naik 46%" |
| Kalsel | 17,7 → 3,0 ha | 54 → 455 → 711 | – |

**Mengapa salah: OMC.** Keterangan bawaan templat adalah "hujan setelah OMC" (`laporan_bnpb.js`). Ini atribusi post hoc tanpa pembanding.

**Perbaikan**
- Ganti judul slide menjadi "Perubahan sisa api (ha, dilaporkan)". Angka absolut, tanpa label Efektif/Lambat.
- OMC ditulis sebagai fakta operasional: "N sorti penyemaian; hujan tercatat di wilayah sasaran pada X dari Y hari".

### 2.6 Rekomendasi dan status otomatis di Ringkasan, serta kebutuhan operasi

Modul: karhutla-risiko-cuaca, karhutla-model-sebaran, dan karhutla-titik-luas-status. Vonis: tidak layak (tingkat dan kartu keputusan, risiko `keputusan[7]`; kebutuhan operasi, titik-luas `keputusan[15]`; hari layak OMC, titik-luas `keputusan[16]` dan metode terlewat risiko-cuaca).

**Yang tampil**
- Kartu rekomendasi:
  - "Pimpin rapat terbatas" untuk Presiden (`ringkasan.js:184-185`);
  - "Tetapkan atau perpanjang status tanggap darurat" untuk Gubernur (`:195`);
  - kartu OMC dari `dc_maks` dengan teks "> 350 = gambut bisa membara" (`:221-226`).
- Tingkat Normal/Waspada/Siaga/Darurat (`:16`), dan kalimat "N provinsi berstatus darurat" (`:321`).
- Kebutuhan operasi skenario tengah 212.339 personel (`operasi.json`; optimis 65.520, pesimis 896.827). Angka ini sekitar 3 kali personel darat resmi terbaru 71.878 (slide 3 deck 21 Okt; pembanding di repo masih 60.177). Skenario optimis justru dekat angka resmi.
- "Hari layak OMC".

**Mengapa salah**
- pE ≥ 0,3 sendirian sudah menaikkan provinsi ke Waspada (`ringkasan.js:114`; tingkat ditetapkan di `:116`).
- Empat nama tingkat itu sama dengan Permen LHK P.9/2018 Pasal 5, padahal Pasal 9 menyerahkan penetapan status ke Bupati, Gubernur, atau Menteri.
- Ini juga bertentangan dengan prinsip yang ditulis repo sendiri di `harian.py:33-34`.
- Rekonsiliasi repo sendiri memberi 0,06 ha per piksel (1.185 ha / 20.779 px24), jauh dari asumsi model (1–4 ha).
- Jendela OMC 15–60% hanya bersumber artikel berita (`operasi.py:102-104`).

**Perbaikan**
- Tingkat dihitung hanya dari besaran teramati dan SK resmi.
- Tidak ada kalimat yang dimulai dengan "Presiden …".
- Kebutuhan operasi dikeluarkan dari Paparan.
- Tampilkan OMC resmi (`bnpb.json`: OMC unit, sortie, bahan semai) dan personel resmi terbaru: 71.878 personel darat (slide 3 deck 21 Okt).

### 2.7 Kartu "Fire Weather Index masih sangat tinggi di N provinsi" dan kolom "Kejadian" di Paparan

Modul: karhutla-risiko-cuaca dan karhutla-titik-luas-status. Vonis: kartu FWI tidak layak (risiko `keputusan[2]`). Kolom Kejadian berasal dari metode layak dengan catatan (kompleks ST-DBSCAN, titik-luas `keputusan[11]`; umur kompleks gambut 168 jam, metode terlewat risiko-cuaca), tetapi catatannya belum dipenuhi di Paparan. Klaim utama keduanya berstatus "benar" di tahap verifikasi.

**Yang tampil**
- Kartu Insight beranda dan halaman Laporan: "Fire Weather Index masih sangat tinggi di N provinsi" (`public/index.html:3546-3567`; `public/laporan.js:622-637`).
- Kolom "Kejadian" di Paparan Presiden (`scripts/data/laporan.py:264-275`; `paparan_slide.js:321`).

**Mengapa salah: kartu FWI**
- Kartu mengambil maksimum satu sel per provinsi pada kolom terakhir, yaitu prakiraan deterministik hari ini +3 hari, bukan hari ini.
- Data 15 Okt: 8 dari 9 provinsi bila maksimum, hanya 3 bila median (Sumsel, Kalsel, NTT). Jambi, Kalbar, dan Kaltim ikut terhitung walau sel ≥ 14 hanya 7%, 4%, dan 2%.
- Hujan di kartu yang sama dirata-rata, jadi dua agregasinya tidak konsisten. Prakiraan 3 hari ini belum pernah diverifikasi.

**Mengapa salah: kolom Kejadian**
- `laporan.py:264-275` menghitung semua kompleks di `kluster.json` tanpa saringan teramati.
- 7.987 dari 12.683 kompleks (63%) tidak teramati 24 jam. Sebanyak 3.590 (28%) hanya bertahan karena aturan gambut 168 jam (DC model > 350; `harian.py:26-28, :403`).

**Perbaikan**
- Kartu FWI memakai porsi luas sel di atas ambang, misalnya "Sangat tinggi di 34% wilayah Sumsel (model, data <tanggal>)", dengan frasa "menurut prakiraan model". Agregat DC hanya dari sel gambut. Usulan risiko #2 [T].
- Kolom Kejadian untuk Presiden hanya kompleks teramati 24 jam; "diduga membara" dipisah. Usulan risiko #19 [T].

### 2.8 Lapisan "Peluang api besok ±X%" dan "Bahaya api gambut" (PFVI)

Modul: karhutla-risiko-cuaca dan karhutla-model-sebaran. Vonis: tidak layak di risiko-cuaca (`keputusan[8]`), layak dengan catatan di model-sebaran (`keputusan[19]`); lihat 5.4.

**Yang tampil.** Lapisan peta "Bahaya api gambut (FWI + PFVI)" dan hover "Peluang api besok ±X%" (`public/index.html:1482, 1868-1879, 1911-1916`), dari medan `pfvi`/`pg` di `fwi.json` (`scripts/data/harian.py:267-274, :540`). Lapisan ini sedang tayang: `fwi.json` produksi 21 Okt memuat pfvi/pg di 534 sel-hari, ambang 0,6344. Checkout lokal belum memuatnya, sehingga tahap tantang menyangka lapisan ini tersembunyi.

**Mengapa salah**
- Tambahannya terhadap FWI saja kecil: AUC 0,801 lawan 0,783, ΔAUC +0,018 (selang +0,013 s.d. +0,023; `RISET-PFVI.md:12`).
- Muka air diganti proxy ember: 1 mm hujan menaikkan muka air sekitar 2 cm (`pfvi.py:84-99`). Sy menyentuh batas bawah 0,05, padahal literatur 0,1–0,3. AUC luar-blok terhadap data Zenodo 0,575.
- Regresi dilatih 2015/2018 dan diuji 2019/2023, semuanya tahun El Niño/IOD+, dengan laju dasar 48% sel-hari berapi. Peluangnya akan terlalu tinggi di tahun basah. Komentar `pfvi.py:174` salah menyebut regresinya "hasil uji balik 2019+2023".
- Sasarannya ≥ 1 titik per sel 0,5°, jadi "peluang api besok" bukan peluang di lokasi tertentu.

**Perbaikan**
- Cabut persen "Peluang api besok". Bila dipertahankan, tampil sebagai kelas berlabel "indeks eksperimental" di samping kelas FWI/DC BMKG.
- Untuk briefing: DC di sel gambut dengan kelas BMKG, HTH BMKG, dan TMAT SiPALAGA/SiMATAG terhadap baku 0,4 m (PP 57/2016) bila datanya didapat.
- Persen baru boleh tampil setelah lolos uji di tahun La Niña/netral (2016–2017, 2020–2022): AUC ≥ 0,75 dan kemiringan keandalan 0,8–1,2. Usulan risiko P2 #8 [S], sebaran P2 #19 [S].

### 2.9 Angka dampak karhutla di tab Dampak: emisi, kerugian, ISPA, dan paparan radius

Modul: karhutla-titik-luas-status. Vonis: keempatnya tidak layak (`keputusan[19]`–`[21]`, `[23]`). Usulannya berprioritas P2, jadi tidak masuk Bagian 4.

| Yang tampil | Lokasi | Mengapa salah | Bukti |
|---|---|---|---|
| "± 706 juta ton CO₂e, setara 143 hari emisi seluruh Indonesia" | `scripts/data/dampak.py:44-53, 437-443`; `public/dampak.js:367, 372` | Luas heuristik × porsi gambut × konsumsi bahan bakar, sehingga ketidakpastiannya berlipat. Pembanding 1.800 Mt/tahun sudah memuat emisi gambut, jadi "setara N hari" berputar pada dirinya. | `dampak.json`: 124,2 / 706,1 / 2.678,2 Mt (21×) |
| Kerugian ekonomi "Rp 204 triliun" | `dampak.py:21-40, 102-110, 445-465` | Nilai Bank Dunia per ha × luas musim yang tidak terkalibrasi (masukan 1,65 juta ha) | Rp 47,3 / 203,7 / 442,4 T (9×) |
| "Asap diperkirakan menambah X kunjungan ISPA per hari" | `dampak.py:54-66, 112-116`; `dampak.js:155, 278` | ΔPM = PM2,5 − 15 µg/m³, sehingga semua polusi latar kota dihitung sebagai asap, padahal RR yang dipakai berlaku untuk kenaikan PM khusus asap | 13–16 Okt: 56.978 / 122.263 / 197.123 kunjungan |
| Penduduk, sekolah, faskes, dan desa dalam 1/5/10 km | `dampak.py:329-401` | Penduduk WorldPop diagregasi ke 0,25° lalu disebar rata; kompleks tak teramati ikut; kompleks digambar sebagai lingkaran | Sumsel 4.656.380 jiwa dalam 10 km (52% penduduk provinsi); Kalteng 1.881.413 (sekitar dua pertiga) |

Risiko di depan Presiden: "setara 143 hari emisi nasional" dan "Rp 204 triliun" mudah dikutip media dan dibantah KLHK, CAMS, atau Dinkes.

**Perbaikan**
- Keluarkan keempat angka dari layar pimpinan dan Paparan.
- Emisi: GFED5NRT per provinsi dan/atau CAMS GFAS sebagai rentang antarproduk; hapus "setara N hari" (titik-luas P2 #15 [S]).
- Kerugian: rujuk kajian kerusakan dan kerugian resmi; bila diminta, cukup orde besaran dengan luas dari citra (#16 [T]).
- ISPA: surveilans SKDR Kemenkes/Dinkes sebagai angka utama; HIA hanya untuk atribusi dengan baseline kontrafaktual (#17 [T]).
- Paparan: WorldPop 100 m atau penduduk desa BPS, hanya kompleks teramati 24 jam, buffer dari poligon kompleks (#18 [S]).

### 2.10 "Peluang masa puncak (pola El Niño)" dan "Karhutla diperkirakan ekstrem Agustus sampai Oktober 2027"

Modul: lintas-bnpb-sosial dan karhutla-risiko-cuaca. Vonis: peluang masa puncak layak dengan catatan (lintas `keputusan[3]`, risiko `keputusan[11]`, titik-luas `keputusan[27]`), dengan perbaikan wajib sebelum dipakai lagi. Outlook 2027 tidak layak (risiko `keputusan[14]`, lintas `keputusan[11]`).

**Yang tampil**
- `presiden-2026-10-20.json`: Kalteng 86/57/29/14/0, Papua Selatan 86/100/71/57/57, dan kalimat "Papua Selatan berpeluang tetap dalam masa puncak hingga akhir November".
- Judul outlook 12 bulan (`outlook12.json`; `analisis.js:54-61`).

**Mengapa salah: peluang El Niño**
- Dasarnya 7 tahun yang ditulis tangan (`musim.py:32`), termasuk 2019. Padahal 2019 tidak memenuhi definisi episode El Niño pada musim kebakaran JAS/ASO (ONI ASO 0,31; RONI −0,01). Daftar tahunnya pun berbeda antarskrip: `musim.py` 7 tahun, episode RONI 6 tahun, `musim_awal.py` 9 tahun.
- Semua nilai kelipatan 1/7: ini frekuensi dari sampel kecil yang diberi nama peluang.

**Mengapa salah: outlook 2027**
- E untuk Agu–Okt 2027 = 3,98/5,55/5,98. Tetapi klimatologi bulan itu sendiri (E_semua 2,75/3,40/2,35) sudah tergolong "ekstrem".
- Horizonnya 10–12 bulan, dengan penanda ekstrapolasi = true.
- Uji baliknya memakai RONI/DMI serentak, bukan yang tersedia saat prakiraan dibuat (`outlook12.py:180-203`).
- IRI (19 Okt 2026) menilai fase netral paling mungkin pada JJA 2027 (51%).

**Perbaikan**
- Tulis "x dari 6 tahun El Niño", dengan selang.
- Kutip prakiraan musim BMKG per ZOM.
- Potong horizon ke lead yang skill-nya teruji.

### 2.11 Alarm "Awas · InaTEWS", status tsunami, dan tsunami hitungan sendiri di laci

Modul: gempa-tsunami. Vonis: tidak layak (pengurai `keputusan[1]`, tsunami di laci `keputusan[12]`; alarm dan email EWS, metode terlewat).

**Yang tampil**
- Pop-up alarm di semua halaman: `alarm.js` dimuat di `index.html:6419`, `gempa/index.html:167`, dan `semua/index.html:59`.
- Pil "Tsunami Waspada (BMKG)".
- Email EWS.
- Laci setiap gempa nyata M ≥ 6,5, kedalaman < 50 km, dan dekat laut: "Perkiraan gelombang di pantai terdekat" dengan waktu tiba dan tinggi (`public/gempa/laci.js:55-58`; `tsunami.js:93-102`).

**Mengapa salah: pengurai dan alarm**
- `uraiPotensi` (`src/gempa.js:26-31`) memberi kode 1 untuk teks negatif: "Tidak ada potensi tsunami", "Peringatan dini tsunami telah berakhir/diakhiri", dan "Tidak menimbulkan tsunami".
- `src/peringatan.js:43-45` lalu menulis "Awas", bersumber "InaTEWS", untuk setiap kode 1–3. Kode ini berjalan lewat `periksaPeringatan()`, yang dipanggil handler cron tiap menit (`src/worker.js:694` di HEAD).

**Mengapa salah: email**
- Sebaliknya, teks peringatan BMKG yang nyata, "Potensi TSUNAMI untuk diteruskan pada masyarakat", ditolak oleh `berpotensiTsunami` (`ews.js`). Akibatnya email tsunami bisa tidak pernah terkirim.
- Enam peringatan BMKG terakhir (Jul 2025–Agu 2026) hanya bertingkat SIAGA/WASPADA, tidak pernah AWAS.
- Radius email hanya ditentukan magnitudo (M4 50 km … M7 500 km), tanpa kedalaman.
- Email menambahkan perintah "Segera menjauhi pantai" (`ews_email.js:88, :97`) untuk setiap teks berpotensi tsunami dalam 500 km, tanpa memeriksa apakah kalimat itu ada di buletin BMKG dan apakah pelanggan berada di pesisir atau zona yang diperingatkan.
- Email hanya terkirim bila `EMAIL_API_KEY` dan domain pengirim aktif (`src/ews.js:5-6`); status produksinya perlu dicek.

**Mengapa salah: tsunami di laci**
- Jenis sumber tidak diketahui, sehingga dianggap subduksi (Kj = 1; `tsunami.js:17-23`). Ambang M6,5 di bawah ambang M7 InaTEWS. Untuk M6,5–6,9 BMKG lazimnya menyatakan "tidak berpotensi", sementara laci tetap menampilkan gelombang 0,1–0,9 m. Contoh M6,9 di kedalaman 25 km di Banda: 0,2–0,9 m, tiba 2,8 menit.
- Judulnya "Perkiraan gelombang", kakinya "Simulasi, bukan prakiraan" (`laci.js:57-58`). Tab Simulasi memakai templat "geser" untuk gempa yang sama, sehingga tinggi di dua layar bisa berbeda sampai 5 kali.
- BMKG adalah otoritas tunggal peringatan tsunami (UU 31/2009, Perpres 93/2019).

**Perbaikan**
- Alarm hanya berbunyi bila BMKG menerbitkan peringatan.
- Tingkat diambil dari `<wzarea>` di `last30tsunamievent.xml`, dengan izin BMKG. Status berakhir diambil dari subject "PD-4".
- Teks BMKG ditampilkan apa adanya.
- Laci tidak menghitung tsunami sendiri. Tampilkan wilayah, tingkat, dan ETA InaTEWS apa adanya, ditambah buletin PTWC berlabel "bukan peringatan untuk Indonesia". Gerbang: jumlah pemanggilan `Tsunami.gelombang` dari laci = 0 (usulan gempa #8 [S]).
- Uji: minimal 30 teks nyata dan 10 teks negatif, harus 100% benar.

### 2.12 Guncangan, "jiwa terguncang MMI VI+", dan korban untuk gempa nyata

Modul: gempa-tsunami. Vonis: tidak layak (model guncangan `keputusan[4]`, kerusakan dan korban `keputusan[6]`; paparan bangunan per MMI, metode terlewat).

**Yang tampil**
- `dampak.js:41` dan isoseismal.
- Mesin kerusakan dan korban di Simulasi untuk gempa nyata terkuat 7 hari terakhir (`sim.js:478`).
- Paparan bangunan per MMI.

**Mengapa salah: model guncangan.** `tebakJenis` memperlakukan gempa M<7 di kedalaman 15–50 km sebagai gempa kerak:

| Kasus | MMI pusat dari model | Bila dihitung sebagai gempa antarmuka (Zhao 2006) |
|---|---|---|
| M5,5, kedalaman 30 km | 8,22 | 4,79 |
| M6,5, kedalaman 45 km (sama dengan 10 km) | 8,40 | 6,01 |
| M7,9 | 7,89 di 49 km, lalu 9,27 di 50 km | – |

Kolom kanan adalah pembanding, bukan nilai yang benar. Nilai acuan sebenarnya dari ShakeMap BMKG/USGS.

- Pita kedalaman ini mencakup 36,7% gempa M5–6,9 sejak 2010 (1.253 dari 3.410).
- Contoh Garut M5,2, kedalaman 30 km: sekitar 1,1 juta jiwa "MMI VI+" (1.113.872), padahal bila dihitung sebagai gempa antarmuka 0. Jenis sumber gempa Garut ini pun belum tentu antarmuka.

**Mengapa salah: korban**
- Pengali kalibrasi 3,0586 dari hanya 8 gempa, dengan galat tinggal-satu-keluar (LOO) sekitar 5,3×.
- Yogyakarta: model 555 jiwa lawan 5.700. Padang: model 3.063 lawan 1.115.
- Berkas kalibrasi mencatat sendiri bahwa angkanya "ditulis dari ingatan".

**Perbaikan**
- Pakai `grid.xml` ShakeMap USGS, PAGER (`exposures.json` dan `losses.json`), dan ShakeMap BMKG.
- Angka korban hanya dari BNPB/DIBI.

### 2.13 Indeks risiko riwayat gempa 0–100 di laci setiap gempa

Modul: gempa-tsunami. Vonis: tidak layak (`keputusan[9]`).

**Yang tampil.** "Indeks risiko riwayat provinsi" di laci setiap gempa (`public/gempa/laci.js:59-62`), juga kalimat "punya indeks risiko gempa tertinggi" (`tren.js:38-45`). Isinya (`public/gempa/data/risiko.json`): Gorontalo 73 "Sangat tinggi", Bengkulu 69, Jawa Barat 44, DIY 38 "Sedang", Jawa Timur 28 "Rendah", Jawa Tengah 22 "Rendah".

**Mengapa salah**
- Rumusnya buatan sendiri: 50 × kekerapan + 30 × besaran + 20 × tren. Kedalaman diabaikan (radius 100 km dari pusat, `riwayat.py:159`), begitu pula atenuasi, paparan, dan kerentanan. Ini bukan "risiko" menurut Perka BNPB 2/2012 dan bukan bahaya probabilistik.
- Kelas ditetapkan menurut peringkat (`riwayat.py:183`), jadi 40% wilayah selalu "Rendah" berapa pun bahayanya.
- Hasilnya bertentangan dengan InaRISK, peta PuSGeN 2017/SNI 1726:2019, dan sejarah korban: Yogyakarta 2006 (5.749 meninggal) ada di provinsi berlabel "Sedang".

Risiko di depan Presiden: Presiden membaca Jawa Tengah dan Jawa Timur "risiko rendah" gempa, bertolak belakang dengan BNPB dan PuSGeN. Ini merusak kredibilitas seluruh platform.

**Perbaikan**
- Buang indeks ini.
- "Risiko" dari IRBI BNPB kolom gempabumi/tsunami (InaRISK `apiv4/data-irbi-full`; pengurainya sudah ada di `scripts/cuaca/risiko_bnpb.py`). "Bahaya" dari indeks bahaya InaRISK atau PGA SNI 1726:2019/PuSGeN. Usulan gempa #11 [S].

### 2.14 Kekeringan: "80 kabupaten Awas, 166 Siaga", "Penduduk terdampak 147,9 juta", dan posko air

Modul: kekeringan. Vonis: tidak layak (status `keputusan[1]`, paparan `[2]`, HTH `[4]`, Laporan Harian `[5]`, posko `[21]`, kejadian D `[23]`; kartu OG dan label waktu, metode terlewat).

**Yang tampil**
- Sorot di `kekeringan_laporan.json`.
- Kartu OG (`scripts/og/buat.py:135-145`): "80 kabupaten/kota berstatus awas kekeringan, 18,9 juta jiwa".
- Pop-up "Situasi kekeringan hari ini" (`sapa.js:28`), padahal datanya SPI Agustus.
- `dampak.js:10` berjudul "Penduduk terdampak".
- `posko_kekeringan.json`, dan 246 laporan `kejadian/kekeringan-*.json`.

**Mengapa salah: bertentangan dengan PDKM BMKG Dasarian II Okt 2026.** Total BMKG: 193 Awas, 35 Siaga, 29 Waspada.

| Wilayah | BMKG (PDKM) | Platform |
|---|---|---|
| NTT | 22 Awas | 4 Awas |
| DIY | 5 Awas | 0 Awas |
| Jateng | 7 Awas | 0 Awas |
| Jatim | 36 Awas | 0 Awas (35 kabupaten hanya Waspada) |
| Aceh | tidak tercantum | 16 Awas (3.705.023 jiwa) |

**Mengapa salah: hari tanpa hujan (HTH).**
- Platform: Bali maksimum 1 hari, NTT median 2 hari, dan sorot "HTH terpanjang 62 hari di Indramayu".
- BMKG: Bantul 141 hari per 20 Sep.
- Jendela `hth.py` paling panjang hanya 93 hari.

**Mengapa salah: skill dan label**
- CSI aturan A-1,0 pada periode uji 0,038, hanya tipis di atas tebakan acak 0,012 (selang 0,013–0,053). Itu pun diukur sebagai diagnosis bulan yang sama, sedangkan status yang tayang memakai SPI bulan sebelumnya.
- Labelnya "gabungan SPI-3 dan kelembapan tanah", padahal data tanah hanya ada di 12 dari 611 sel. Sebanyak 79 dari 81 sel Awas "dikonfirmasi" oleh SPI-6 dari seri data yang sama.

**Mengapa salah: angka dampak**
- 147.857.658 jiwa "terdampak", padahal laporan BNPB 19 Okt mencatat sekitar 45.852 KK di 8 kabupaten.
- Posko: 2.225.529.870 L/hari dan 445.244 rit truk. Distribusi air yang tercatat di laporan BNPB 19 Okt 428.200 L (total 8 baris, bukan per hari).

**Perbaikan**
- PDKM BMKG menjadi satu-satunya status.
- Istilah "terdampak" hanya untuk angka BPBD/BNPB.
- Kartu OG diambil dari PDKM.
- Setiap angka membawa periode datanya.

### 2.15 Udara: "89,5 juta jiwa menghirup udara tidak sehat", status "siaga", asap lintas batas, dan sumber asap

Modul: udara-asap. Vonis: tidak layak (status `keputusan[1]`, jiwa terpapar `[6]`, lintas batas `[12]`, atribusi `[13]`, asal asap `[14]`, penautan konsesi `[15]`; pop-up harian, metode terlewat).

**Yang tampil**
- Laporan, pop-up, dan kartu: deret 7 hari [154,5; 135,3; 132,5; 122,1; 80,1; 93,3; 89,5 juta].
- `index-udara.json`: 25 laporan, semuanya "siaga", termasuk Pulang Pisau 895 µg/m³.
- Sorot asap ke Malaysia (32 jam) dan Brunei (55 jam) dari kompleks K0043 Katingan.
- Kab. Kapuas disebut sumber asapnya "Kompleks api Probolinggo".
- Nama perusahaan di kartu Sumber asap.

**Mengapa salah: jiwa terpapar**
- Seluruh penduduk kabupaten mengikuti satu titik CAMS 0,4° tanpa koreksi stasiun (n_stasiun 0).
- 79,66 juta jiwa (89%) berasal dari Jawa.
- Ada artefak batas sel di Jakarta: 121 berbanding 50 µg/m³ dalam satu metropolitan.
- CAMS meluputkan 56% hari berasap (POD 0,44, bias 0,52, n = 837).

**Mengapa salah: lintas batas.** `lintas_batas` memuat 12 peringatan ke Malaysia dan 4 ke Brunei. Jalur pemicunya: Malaysia 16 (12 dari 850 hPa, 4 dari 925 hPa), Brunei 4 (850 hPa), nol dari lapis 10 m. Wilayah negara hanya berupa kotak kasar.

**Mengapa salah: atribusi sumber**
- Emisi gambut di pipeline 0,368 kg/MJ, sedangkan Kaiser 2012 memberi kelas PEAT 5,87 kg/MJ.
- Akibatnya Pulang Pisau tercatat PM 719 µg/m³ sementara model hanya menghasilkan 9.
- Penautan ke konsesi memakai kotak batas +0,02°.

**Perbaikan**
- Pisahkan angka terukur (27 stasiun PM2,5 BMKG, AQMS KLH) dari angka model per provinsi yang diberi label.
- Lintas batas: kutip ASMC (Alert Level 3 untuk ASEAN selatan sudah dikeluarkan; tanggalnya lihat 5.2).
- Atribusi cukup kualitatif.
- Tanpa nama badan usaha.

### 2.16 Bandara: jarak pandang, jalur abu, dan guncangan

Modul: udara-asap, gunungapi, dan gempa-tsunami. Vonis: tidak layak (Koschmieder, udara `keputusan[9]`; bandara di jalur abu, gunungapi `keputusan[12]`; bandara MMI VI+, metode terlewat gempa).

**Yang tampil**
- Prakiraan jarak pandang Koschmieder [10, 10, 10] km di ke-14 bandara (`rentan.json`).
- Laporan gunung api: metrik "Bandara di jalur abu 72 jam" = 1, dan sorot "Skenario: abu G. Semeru bisa tiba di MLG ... sekitar 2 jam lagi" (`laporan_gunungapi.json`).
- Daftar bandara MMI VI+ di laci gempa.

**Mengapa salah: jarak pandang**
- Rumusnya selalu memberi 10 km untuk PM ≤ 63 µg/m³.
- TAF AWC terbitan 211100Z: WIPP 2500 m FU (TEMPO 0800), WIOO dan WIBB 3000 m FU.
- METAR WIPP 1,6 km FU dibuang dari tabel Laporan, karena tabelnya hanya mengambil 10 baris pertama (`laporan_udara.py:143`).
- Deck 20 Okt mencatat bandara Ketapang dan Singkawang tutup dengan jarak pandang sekitar 100 m. Ketapang (WIOK) tidak ada di umpan (`metar.py:3`); Singkawang belum dicek.

**Mengapa salah: jalur abu.** Bandara WARA berjarak 30,2 km pada arah 311,3° dari Semeru, sedangkan awan bergerak ke 259°. Bandara ini masuk daftar hanya karena penyangga 25 km.

**Mengapa salah: guncangan.** Daftar bandara MMI VI+ dihitung dengan model guncangan yang cacat kedalaman (lihat 2.12).

**Perbaikan**
- Jarak pandang dari TAF dan METAR, ditambah NOTAM bila endpoint-nya sudah terverifikasi.
- Bandara terdampak abu = bandara di dalam poligon VA SIGMET/VAA.
- MMI bandara dari ShakeMap.

### 2.17 Gunung api: "27 kejadian aktif", jejak abu 293/284 km, dan peluang abu ke Jakarta

Modul: gunungapi. Vonis: tidak layak (kejadian V `keputusan[4]` dan agregasi /semua, metode terlewat; model abu `keputusan[10]`–`[11]`; peluang abu `keputusan[13]`, buktinya belum terverifikasi di tahap tantang lalu dikukuhkan di tahap verifikasi).

**Yang tampil: kejadian**
- `kejadian_gunungapi_awal.json` berisi 27 entri, semuanya aktif, semuanya bertanggal mulai 2026-10-19.
- Ke-27 entri itu ikut dijumlahkan ke judul "X kejadian aktif" di `public/semua/kejadian.js`.

**Yang tampil: abu**
- Jejak abu Merapi 292,7 km dan Semeru 284,1 km.
- Peluang abu pada hari ke-2, pada ambang 0,2 mg/m³ dan bersyarat atas skenario erupsi: Merapi ke Jakarta Pusat 0,551, ke Soekarno-Hatta 0,594, ke Bandar Lampung 0,493.
- Teks "> 99%" muncul untuk 11 pasangan.

**Mengapa salah: kejadian**
- BNPB mencatat hanya 8 kejadian erupsi pada 2024 (2023: 4).
- Merapi sudah berstatus Siaga sejak 2020, tetapi tertulis mulai 19 Okt 2026.

**Mengapa salah: model abu**
- Uji balik berambang: n = 4, hanya 25% benar (p = 0,684), lawan klimatologi 75%.
- Mengganti seed 1–6 saja menggeser jangkauan Semeru antara 121 dan 292 km.
- Asumsi tinggi kolom per level terbalik dari pengamatan VONA: median VONA 700 m, dan 26 dari 29 kejadian di bawah 2 km.
- Nilai 0,652 (= 45/69) adalah artefak cara ansambel disusun, bukan peluang.

**Perbaikan**
- Status PVMBG tetap tampil, tetapi tidak dihitung sebagai "kejadian".
- Abu diambil dari VA SIGMET BMKG dan VAA VAAC Darwin.
- Angka peluang abu dicabut.

### 2.18 Banjir dan rob: laporan basi, rob bertentangan dengan BMKG, dan email warga

Modul: banjir-rob-longsor. Vonis: tidak layak (Laporan Harian `keputusan[14]`, rob `keputusan[9]`; penjaga kesegaran `/api/status` dan email warga, metode terlewat). Status Siaga banjir sendiri layak dengan catatan (`keputusan[0]`), hanya untuk lampiran teknis (lihat Bagian 3).

**Yang tampil**
- Laporan Harian Banjir 19 Okt menulis "3 peringatan dini cuaca BMKG aktif".
- Rob Siaga 0.
- "Terpapar banjir" 9.823 jiwa, dari data 13 Okt.
- `/api/status` menyatakan data "segar".
- Email warga "Siaga banjir di kecamatan Anda" per kecamatan (`src/ews.js:193-197`; rob `:209-213`). Tingkat Waspada ikut bila pelanggan memilihnya (`:268`).

**Mengapa salah: laporan dan rob**
- Ketiga nowcast itu berakhir 13 Okt pukul 03.00 WIB. Tanda "aktif" dihitung saat unduh, bukan saat dibaca (`peringatan.py:91`).
- Di `rob.json`, 0 dari 44 titik berambang mencapai p95 (selisih terdekat 0,12 m). Berkas yang sama memuat 19–20 baris peringatan rob BMKG aktif per hari pada 12–15 Okt (10 pada 10 Okt). Jakarta Utara dan Bekasi aktif 12–18 Okt, Belawan s.d. 15 Okt.
- Penjaga kesegaran `/api/status` (`dibuatAset()` dan `umurSumber()`, `src/worker.js:443-457` di HEAD) membaca kunci "dibuat" di `meta.json`, yaitu jam `status.py` dijalankan, bukan `hari_wib`. Meta dibuat 19 Okt untuk data 13 Okt.
- Siaga banjir: POD 0,132, FAR 0,939.

**Mengapa salah: email warga**
- Pemicunya status model per kecamatan, padahal skill hanya terukur per kabupaten-hari: Siaga banjir FAR 0,939, longsor 0,954. Untuk longsor Bali-NT tidak ada satu pun yang kena dari 75; untuk banjir di Kalimantan dan Bali-NT skill-nya tidak terbukti (CI PSS memuat 0).
- Email rob berasal dari model yang bertentangan dengan peringatan rob BMKG di atas.
- Email hanya memuat "Prakiraan, bukan kepastian. Ikuti arahan BPBD/BMKG", tanpa angka skill (`src/ews_email.js:72`). Peringatan dini cuaca adalah kewenangan BMKG (UU 31/2009).

**Perbaikan**
- Status aktif dihitung dari `expires`/`valid_until` saat dibaca.
- Status rob diambil dari baris peringatan BMKG yang aktif.
- `/api/status` membandingkan tanggal data dengan hari ini.
- Email warga dipicu produk resmi (nowcast dan peringatan berbasis dampak BMKG, rob BMKG, PVMBG). Status platform cukup menjadi ringkasan "indikasi" terpisah, per kabupaten, di pulau berskill. Uji integrasi handler: nowcast aktif menghasilkan 1 email, kedaluwarsa 0 (usulan banjir #21 [T]).

### 2.19 Cuaca ekstrem: laporan basi, siklon, dan status kecamatan Waspada/Siaga/Awas

Modul: cuaca-ekstrem. Vonis: tidak layak (metrik arsip CAP `keputusan[2]`, status kecamatan `[3]`, siklon `[9]`, penduduk terpapar `[12]`, Laporan Harian `[19]`).

**Yang tampil**
- "Penduduk terpapar" 21.307 → 1.698.278 → 136.617 → 902.303 jiwa (16–19 Okt).
- Angka 46.642 jiwa tampil sebagai "Hari ini" pada 21 Okt, padahal dari run 18 Okt.
- Siklon Champi disebut "siklon tropis super", 241 km/jam (sumber JTWC), dengan sorot tingkat "siaga".
- Metrik utama Laporan Cuaca bernilai null selama 30 hari.
- 10 dari 13 kode kabupaten di laporan cuaca tidak cocok dengan nama Kemendagri.
- Status kecamatan 72 jam Normal/Waspada/Siaga/Awas: pop-up kecamatan (`public/cuaca/status.js:119-124`), "X kecamatan diprakirakan Waspada atau lebih" (`insight.js:59-68`), Siaga/Awas besok di pop-up (`sapa.js:21-22`), dan metrik utama Laporan "Kecamatan Siaga dan Awas" (`laporan_cuaca.py:16`).

**Mengapa salah: siklon.** TCWC BMKG sendiri mencatat CHAMPI 115 kt, Kategori 5, dan mendaftar wilayah RI terdampak. Jadi siklon ini relevan; yang salah adalah sumber dan labelnya.

**Mengapa salah: status kecamatan**
- Kosakatanya bertabrakan dengan produk BMKG yang sudah berjalan. Stasiun Klimatologi BMKG menerbitkan "Peringatan Dini Potensi Curah Hujan Tinggi" berstatus Waspada/Siaga/Awas per kecamatan, berbasis prakiraan probabilistik, dan mengirimnya ke bupati/BPBD (contoh surat Staklim Sumsel 17 Okt 2025).
- Produk ini tidak pernah diuji balik. `cuaca_kec.json` (18 Okt): 120 kecamatan dan 181 kecamatan-hari, semuanya tingkat 1. Pemicunya 121 embusan saja, 60 hujan saja, 0 gelombang, 0 ansambel.
- Ambang 54 km/jam diterapkan pada embusan maksimum model (`dasar.py:12`), yang ditulis sendiri sebagai "hipotesis awal" (`:14`). Tinggi gelombang diberikan ke kecamatan pedalaman dalam 50 km (`prakiraan_kec.py:62-63`).
- `cuaca_kec.json` tidak cocok dengan kode di commit yang sama (84926dd7), jadi tidak bisa direproduksi.

**Perbaikan**
- Siklon dari TCWC Jakarta.
- Cabut Waspada/Siaga/Awas dari keluaran model; ganti "indikasi model: rendah/sedang/tinggi". Untuk Presiden pakai peringatan BMKG (Staklim per kecamatan, CAP, prakiraan desa adm4). Usulan cuaca #3 [S].
- Angka jiwa hanya dari run hari yang sama; metrik utama Laporan bersumber BMKG/BNPB.

### 2.20 Model sebaran: WASPADA di Simulasi, "Awas" dari simulasi, desa "terkena", visual 3D, dan klaim di tentang.html

Modul: karhutla-model-sebaran. Vonis: tidak layak (penerapan model di Simulasi dan pemetaan ke Siaga/Awas EWS, metode terlewat; jejak api `keputusan[10]`; dampak terkena `[7]`; visual forensik/3D `[14]`; tentang.html `[16]`). Kalimat "68 hari" berasal dari awal musim yang layak dengan catatan (`keputusan[1]`), dengan catatan wajib ditulis sebagai batas.

**Yang tampil**
- Lencana WASPADA dan angka peluang di tab Simulasi.
- Email dan pil EWS Siaga (p ≥ 0,20) dan Awas (p ≥ 0,50) (`src/ews.js:38`).
- Kartu Simulasi "Terkena (harapan 72 jam): gambut … ha, kawasan lindung … ha, desa: …" (`public/sim_data.js:59`; hitungan `sebaran_model.js:287-302`).
- Mode forensik Simulasi: drone dan armada SIMULASI, garis depan, medan 3D (`sim_3d.js`, `sim_armada.js`, `sim_panel.js`, `sim_adegan.js`, `sim_topo.js`).
- `tentang.html`: "mengalahkan model Kanada, AS, Australia", "Diuji jujur pada data 2024–2026 yang tidak dipakai melatih", AUC 0,70.
- Kalimat "Papua Selatan 68 hari lebih awal".

**Mengapa salah: Simulasi**
- Masukan di layar berbeda dari data latih: `Date.now()` sebagai waktu, n0 dari api24 tiga satelit, frp dikali 3.
- Reproduksi pada 51 titik: fitur malam saja menaikkan peluang ×4,36; gabungan ×10–12,7; jumlah WASPADA naik dari 0 menjadi 15–17.

**Mengapa salah: EWS**
- `jejak_api.json` produksi (18 Okt): 28 dari 251 kompleks punya p ≥ 0,50.
- Padahal bin keandalan tertinggi pada uji hanya 0,4465 (n = 3), dan Monte Carlo hanya 20 putaran.

**Mengapa salah: desa "terkena"**
- Desa dianggap terkena bila ada sel p ≥ 0,1 dalam radius 2 sel; luas = Σ p × 14,06 ha. Konversi itu 3–4× terlalu besar, dan peta peluangnya tanpa keahlian arah. Peluang hari ke-3 tidak pernah diuji keandalannya.
- Risiko di depan Presiden: nama desa "yang akan terkena" disebut di depan Presiden atau media, lalu memicu kepanikan atau evakuasi salah sasaran.

**Mengapa salah: visual forensik/3D**
- Label "SIMULASI" dan "insiden buatan" memang ada (`sim_armada.js:385, 452`; `sim_3d.js:5-6`), tetapi konstanta telemetrinya karangan dan luasnya berasal dari mesin fisika yang bias.
- Tangkapan layar 3D dengan drone dan garis depan bisa dikira pemantauan nyata.

**Mengapa salah: tentang.html**
- Klaim "tidak dipakai melatih" salah karena model sel dan model lolos sama-sama dilatih ulang 2015–2026 (catatan `model_sebaran.json`; `lolos.py:427-429`).
- AUC 0,70 yang dikutip milik model lama (recall 21%).
- "Mengalahkan model Kanada, AS, Australia" memakai pembanding port buatan sendiri, padahal persistensi unggul di IoU dan galat luas.
- Set uji didominasi 2026: 97% api besar uji berasal dari 2026.

**Mengapa salah: "68 hari".** Tanggal itu tersensor kiri: 9 Juni adalah hari pertama yang diizinkan pencarian (MULAI_UTAMA = 159).

**Perbaikan**
- Layar hanya membaca hasil jalur CI.
- EWS memakai peringatan kedekatan teramati.
- Hapus daftar desa dan jiwa dari keluaran model. Ganti dengan paparan teramati dalam radius 2/5 km dari titik aktif 24 jam (sebaran P2 #14 [T]).
- Watermark permanen "SIMULASI LATIHAN, BUKAN PENGAMATAN" di kanvas dan setiap ekspor gambar; untuk paparan pakai citra nyata (sebaran P2 #16 [S]).
- Kalimat kinerja dibaca dari JSON, dengan frasa "diuji terutama pada musim 2026".
- Tulis "≤ 9 Jun".

### 2.21 Sikap judul terhadap Presiden, emosi berita, media sosial, dan "bencana berantai"

Modul: lintas-bnpb-sosial. Vonis: tidak layak (sikap judul, metode terlewat; emosi `keputusan[27]`; media sosial `keputusan[30]`; bencana berantai `keputusan[14]`).

**Yang tampil**
- Layar ruang krisis: sikap7 terhadap "Presiden & pemerintah pusat" = 78 negatif, 239 netral, 17 positif.
- Emosi berita (marah, cemas, sedih, harapan) di layar (`index.html:3966, 4002`).
- Analisis media sosial dari post kurasi admin (tab sosmed).
- Kartu "bencana berantai" di outlook 12 bulan (`public/semua/analisis.js` kartuBerantai).

**Mengapa salah: sikap judul** (`berita.json` validasi.lembaga, n = 113)
- Akurasi pengklasifikasi 0,858, hampir sama dengan menebak kelas terbanyak (0,85).
- F1 makro 0,662.
- Recall negatif 0,429, dengan CI [0; 0,833].

**Mengapa salah: emosi.** Emosi dicocokkan dari kata pemicu di judul (`scripts/berita/karhutla.py:279-297`). "Cemas" mencakup "siaga|waspada|darurat|bahaya|meluas", "marah" mencakup "tuntut|desak|lamban". Itu istilah status dan bahasa berita biasa, bukan emosi publik, dan tidak ada validasi sama sekali. Risikonya kalimat "kecemasan publik naik X%" masuk briefing.

**Mengapa salah: media sosial.** Sampelnya post pilihan admin, jadi bias seleksi. Saat ini `sosmed.json` n 0 dan sentimen_teruji false. Risikonya "warganet marah" dari belasan post pilihan admin.

**Mengapa salah: bencana berantai.** Lift A→B diuji dengan 20 permutasi (p terkecil 0,048) tanpa koreksi uji berganda, dengan data DIBI 3 tahun. Saat ini 0 pasangan lolos (terkuat lift 1,3, p 0,095), jadi kartu belum tampil. Ada bug nama medan: kartu membaca `peluang_acak`, JSON menulis `peluang_acak_bulan_sama`, sehingga garis pembanding akan NaN begitu ada pasangan lolos.

**Perbaikan**
- Sikap judul: sembunyikan rasio dan grafiknya. Ganti dengan daftar judul yang memuat kritik eksplisit, ditautkan ke artikelnya.
- Emosi: hapus dari layar dan bahan pimpinan (lintas P2 #25 [T]).
- Media sosial: galeri anekdot bertautan saja, tanpa persen, peringkat, dan nada (lintas P3 #33, belum diverifikasi).
- Bencana berantai: ganti dengan matriks interaksi bahaya yang sudah terbit, atau ≥ 999 permutasi dengan FDR Benjamini-Hochberg dan DIBI 2008–kini (lintas P3 #38, belum diverifikasi).

---

## 3. Aman dibawa (dengan label)

| Yang boleh dibawa | Sumber di repo | Label wajib (kata persis) | Syarat |
|---|---|---|---|
| Status gunung api level I–IV, radius, dan butir rekomendasi PVMBG utuh | `gunungapi_status.json`, `/api/gunungapi/terbaru` | "Status PVMBG (MAGMA Indonesia), per pukul HH.MM WIB" | Jam data wajib tampil, karena layar membaca berkas pukul 09.10 WIB. Kutip butir sektor apa adanya (Semeru: Besuk Kobokan 13 km, ditambah sempadan sampai 17 km), sebab peta hanya menggambar lingkaran. Jangan disebut "kejadian". |
| Arah kolom abu teramati | tabel "Erupsi 24 jam terakhir" (`laporan.py:69-71`) | "Arah abu teramati menurut laporan erupsi PVMBG pukul HH.MM; 'tidak teramati' bila kolom tidak terlihat" | Sandingkan dengan VONA atau VA SIGMET bila ada. |
| Letusan besar historis (14 peristiwa) | `factsheet` gunung api | "Sumber: NCEI/GVP; dapat berbeda dari angka BNPB" | – |
| Nowcast cuaca BMKG (CAP) | D1 `cuaca_nowcast` | "Peringatan dini cuaca BMKG, berlaku hingga HH.MM WIB" | Status aktif dihitung dari `expires` saat dibaca, bukan dari `peringatan.json` harian. Jiwa dihitung dari kecamatan yang disebut di `<description>`. |
| Peringatan gelombang BMKG Maritim | `warnings.json` | "Peringatan gelombang BMKG Maritim: N perairan kategori Tinggi (2,5–4 m) ke atas, berlaku <valid_from>–<valid_until> <zona waktu>" | Hitung per perairan dengan kelas tertinggi. Kelas Ekstrem = 6,0–9,0 m. |
| Peringatan rob BMKG | `rob.json` bagian bmkg (terbitan 1 Okt 2026) | "Peringatan dini banjir pesisir (rob) BMKG, terbitan <tanggal>, berlaku <rentang>" | Hanya baris yang aktif pada tanggal itu; baris 2–4 Okt tidak dihitung. |
| Jumlah titik panas harian | `laporan.json` (M + N + N20, semua tingkat keyakinan) | "Jumlah titik panas satelit (MODIS, VIIRS S-NPP, NOAA-20; semua tingkat keyakinan), bukan jumlah kebakaran" | Hari yang lintasannya bercelah diberi tanda "data satelit belum lengkap" dan tidak diberi panah. 20 Okt termasuk hari bercelah. |
| Titik panas tahun berjalan dibanding tahun lalu | `sejarah.json`, `kumulatif.json` | "Titik panas VIIRS S-NPP 2026 s.d. 12 Okt: 477.066, di atas total 2019 (394.642) dan di bawah 2015 (811.961). Jumlah titik, bukan luas." | Pakai median sebagai pembanding, bukan rerata (angka 425% dari rerata berlebihan). Berlaku sampai S-NPP berhenti. |
| Rekonsiliasi luas tiga sumber | `laporan.py:283-344` (`luas_banding`: perkiraan, GWIS MCD64A1, SiPongi). Nusantara Atlas dan MapBiomas perlu ditambahkan ke `luas_banding` (usulan titik-luas #13). | "SiPongi Kemenhut (resmi): 202.011 ha s.d. Juli 2026 · BNPB 129.899 ha s.d. 15 Okt (hampir sama dengan luas dipadamkan 129.956 ha; bukan luas terbakar) · Citra independen: Nusantara Atlas (Sentinel-2) 1.916.588 ha Jan–Sep; MapBiomas Fire 637.011 ha Jan–Agu (sensor dan metode belum dicek; periode berbeda, jadi rasio ±3× hanya indikatif) · Perkiraan satelit platform sekitar 2,2 juta ha (rentang repo 1,61–2,30 juta; selang galat uji balik 1,55–2,72 juta), dikalibrasi ke SiPongi, belum diverifikasi; SiPongi belum merilis Agu–Okt" | Tanpa peringkat. Tiap kolom mencantumkan tanggal "s.d.". |
| Kurva musim titik panas harian | `musim_harian.py` | "Titik panas harian dibanding median 2019–2025" | Perbarui teks `laporan.js:411-412` yang masih menyebut "sumber statis tidak disaring". |
| IRBI BNPB (kekeringan, banjir, gempa) | InaRISK `apiv4/data-irbi-full` | "Indeks Risiko Bencana Indonesia (BNPB/InaRISK), edisi 2025" | Skala 2025 tidak sebanding dengan 2015–2024. `status_irbi_total_2025` adalah kelas total semua bahaya, bukan kelas per bahaya. Jangan dipakai sebagai peringkat, karena banyak kabupaten bernilai sama. |
| ENSO dan IOD | `iklim.json` | "El Niño kuat: RONI JAS 2026 1,69 (NOAA CPC). Peluang El Niño 100% hingga MAM 2027 dan 60% pada MJJ 2027 (IRI, 19 Okt 2026). IOD menguat menuju positif." | Jangan tulis "IOD positif" (baru 4 minggu di atas +0,4). Sandingkan dengan analisis dinamika atmosfer BMKG dasarian I Okt 2026 (Niño3.4 +3,33; IOD +0,703). |
| Kategori PM2,5 | `alat.py`, `murni.js` (titik potong P.14/2020) | "Kategori PM2,5 (titik potong ISPU), perkiraan model CAMS, bukan ISPU terukur" | Hanya per provinsi. Tanpa kata Waspada/Siaga/Awas. |
| Keterbatasan model asap | `prakiraan.json` galat.metar | "Uji model CAMS terhadap pengamatan asap di 27 bandara (19 Sep–19 Okt 2026, 837 hari-bandara): menangkap 44% hari berasap; 16% tandanya keliru" | Disajikan sebagai batasan, bukan klaim akurasi. |
| Jarak pandang bandara teramati | METAR | "Pengamatan METAR pukul HH.MM UTC; FU = asap, HZ = kabut kering; bandara yang tidak ada di umpan tidak tercakup" | Urutkan dari jarak pandang terendah (WIPP 1,6 km FU harus muncul). Sebut bahwa Ketapang (WIOK) tidak ada di umpan; Singkawang belum dicek. Deck 20 Okt mencatat keduanya tutup. |
| Laju gempa jangka panjang | `laju.json` | "Rata-rata sekitar 13 gempa utama M6+ per tahun (setelah declustering Gardner-Knopoff, semua kedalaman, katalog USGS 1990–2025; uji 2016–2025: 119 teramati, selang 115–153). Gempa tidak dapat diprakirakan." | Sajikan laju bersama selangnya. Kedua kelas teramati di bawah harapan, tanda ketidakstasioneran. Jangan pakai label "dangkal". |
| Gempa susulan | `model_susulan.json` | "Dari 177 gempa M6,0–6,4 dalam data latih, sekitar 27% diikuti susulan M≥5 dalam 7 hari (laju historis, nilai dihaluskan)" | Sajikan sebagai tabel laju, bukan model. |
| Seri tahunan BNPB | `kejadian.json` (cuaca); `dampak_gunungapi.json` | "Sumber: data.bnpb.go.id (kompilasi BNPB 2010–2024); seri cuaca ekstrem cocok dengan Buku Data Bencana Indonesia 2024" | Cuaca ekstrem 2024 = 733 adalah angka final (total 3.472). Seri gunung api belum dicocokkan dengan Buku Data, dan pencilan 2018 (58 kejadian) belum dijelaskan. Nilai 0 yang sebenarnya tidak tercatat (gunung api 2010, 2017, 2021) ditulis "tidak tercatat". |
| Status banjir model (hanya lampiran teknis) | `status.json`, `validasi.json` | "Indikasi model Pantau Bencana, bukan peringatan resmi. Pada uji 2022–2025 dengan hujan reanalisis (batas atas), sekitar 6 dari 100 status Siaga diikuti kejadian tercatat." | Hanya hari ke-0, per kabupaten, di Jawa, Sumatra, dan Sulawesi. Data harus dari hari yang sama. |
| Outlook hujan musiman | `iklim_outlook.json` | "Hubungan statistik hujan dengan ENSO/IOD, bukan prakiraan resmi; prakiraan resmi: BMKG" | Hanya horizon ≤ 2 bulan yang lolos uji fit. |
| Kalender pasang astronomis | `pasang_astro.json` | "Indeks gaya pasang astronomis (0-1), BUKAN tinggi muka air dan BUKAN prakiraan rob" | – |
| SK status keadaan darurat | `kekeringan_resmi.json` | "Data SK di data.bnpb.go.id hanya sampai 2025: 11 SK khusus kekeringan dan 68 SK hidrometeorologi multi-bahaya" | Ganti pil "Tidak ada SK berlaku sekarang". |
| Neraca Posko | `/api/neraca` | "Laporan lapangan dari N dari M regu terdaftar, per pukul HH.MM" | Cakupan regu wajib tampil. |

---

## 4. Perbaikan P1

**Cakupan.** Semua 166 usulan P1 sudah diverifikasi: 100 terverifikasi, 66 sebagian. Nomor #n menunjuk posisi di `alternatif-<modul>.json` usulan[].

### 4.0 Urutan kerja lintas modul (sebelum paparan berikutnya)

1. **Tarik dan perbaiki deck BNPB 21 Okt.**
   - Usulan: lintas #0, #1; titik-luas #0, #1, #2, #4.
   - Gerbang: tidak ada hektare satelit di slide berlogo BNPB, dan tidak ada hektare harian per wilayah di Laporan dan Paparan.
2. **Perbaiki pengurai dan alarm tsunami.**
   - Usulan: gempa #0, #1, #2, #8.
   - Ini kesalahan yang paling berisiko memicu kepanikan publik atas nama BMKG.
3. **Pasang gerbang kosakata lintas modul.**
   - Usulan: risiko #7; sebaran #0, #2; kekeringan #0; cuaca #3; udara #1; banjir #4, #21.
   - Kata Waspada/Siaga/Awas, "Fire spot", "padam", dan "terdampak" hanya boleh muncul bila sumbernya BMKG, BNPB/BPBD, atau SK.
4. **Hitung kesegaran dan status aktif dari waktu data.**
   - Usulan: banjir #11, #22; cuaca #2; gunung api #0, #28, #29; kekeringan #7.
5. **Pindahkan sensor dasar dari S-NPP ke NOAA-20/21 sebelum 1 Nov 2026.**
   - Usulan: titik-luas P2 #23, yang dinaikkan verifikator ke P1; ditambah titik-luas #3, #5, #6.
   - Faktor antarsensor diturunkan dari hari tumpang-tindih. Uji: CV bulanan rasio N20/S-NPP pada 2023–2026 ≤ 15%; bila lebih, faktor dibuat per musim atau per provinsi.
   - Ikut terdampak: `musim_awal`, kumulatif, garis dasar "normal", dan model sebaran.
6. **Pasang lapis resmi.**
   - PDKM BMKG (kekeringan #0)
   - Rob BMKG (banjir #8, #12)
   - VA SIGMET (gunung api #11, #13)
   - ShakeMap BMKG serta ShakeMap/PAGER USGS (gempa #3, #6)
   - Zona dan ETA InaTEWS dari `last30tsunamievent.xml`, dengan izin BMKG (gempa #0, #8)
   - TCWC Jakarta (cuaca #10)
   - Prakiraan pelabuhan dan perairan BMKG Maritim (cuaca #8, #9)
   - IRBI (gempa #11; banjir #16; kekeringan #11)
7. **Keluarkan alat biaya dan perlakuan dari layar pimpinan.**
   - Usulan: sebaran #5; kekeringan #15; udara #25; gunung api #21; cuaca #30; banjir #18.
8. **Keluarkan angka turunan yang belum teruji dari layar pimpinan** (usulan P2, tetapi tampil sekarang; lihat 2.8, 2.9, 2.20, 2.21).
   - Emisi, kerugian, ISPA, dan paparan radius: titik-luas P2 #15–#18.
   - Lapisan "Peluang api besok ±X%": risiko P2 #8; sebaran P2 #19.
   - Desa "terkena" dan visual 3D: sebaran P2 #14, #16.
   - Emosi berita: lintas P2 #25.

### 4.1 lintas-bnpb-sosial

- **#0 [S] Deck BNPB 21 Okt versi satelit (M).**
  - *Metode:* Kolom LUAS TERBAKAR, BELUM PADAM, dan FIRE SPOT kembali ke angka lapangan BNPB/Satgas atau `/api/neraca` (dengan jumlah regu pelapor). Satelit pindah ke slide "Indikasi satelit (bukan angka lapangan)" dengan satu definisi titik dan jendela 07.00–07.00 WIB.
  - *Selaras dengan:* SKPDB Perka BNPB 3/2016 (Pasal 9); Permen LHK P.8/2018.
  - *Uji lulus:*
    - generator menolak mengisi tiga kolom itu bila tag sumbernya bukan "lapangan";
    - frasa "kemungkinan padam" hanya bila presisi ≥ 0,8 pada ≥ 100 kompleks;
    - luas dNBR per provinsi-bulan vs Nusantara Atlas: rasio 0,7–1,4 di ≥ 80% provinsi-bulan.
  - *Koreksi:* Parameter 1,5 km/72/168 jam adalah parameter repo (`harian.py:27-30`), bukan parameter FEDS (FEDS memakai 5 hari). Peta resmi KLHK 2019 berbasis Landsat 8.
- **#1 [S] Hotspot harian dan panah naik/turun (S).**
  - *Metode:* Pemeriksa kelengkapan lintasan per sensor per provinsi dari kolom `satellite`/`acq_time`/`daynight` FIRMS. Hari yang tidak lengkap diberi label "data satelit belum lengkap", tanpa panah. Unduh ulang 24–48 jam kemudian.
  - *Selaras dengan:* rekap hotspot GIS BNPB dan SiPongi dengan potongan waktu tetap.
  - *Uji lulus:* fixture tanpa satu lintasan siang harus menghilangkan panah; selama 30 hari |selisih| dengan GIS BNPB ≤ 10% di ≥ 90% provinsi-hari.
  - *Koreksi:* Data Standard Processing baru tersedia 2–3 bulan kemudian (FAQ FIRMS). Unduh ulang 48 jam hanya menangkap granul NRT yang terlambat.
- **#2 [T] Hotspot 7 hari dan peringkat provinsi di Paparan (S).**
  - *Metode:* Satu deret hotspot per deck, jendela 07.00–07.00 WIB. Peringkat dari kompleks aktif atau FRP VIIRS yang sudah dimasker; FRP CAMS GFAS v1.4.2 sebagai pembanding.
  - *Selaras dengan:* GIS BNPB; prioritas operasi ditetapkan Satgas.
  - *Uji lulus:* Spearman peringkat vs luas bekas bakar (2019, 2023, 2026); pakai indikator dengan ρ tertinggi dan ≥ 0,8. Deck tidak boleh memuat dua nilai hotspot untuk provinsi dan tanggal yang sama tanpa label sumber.
- **#3 [S] "±2,2 juta ha, tertinggi ke-2" (S).**
  - *Metode:* Tiga lapis: angka resmi bertanggal "s.d."; perkiraan berupa rentang 1,55–2,72 juta ha (P10–P90 galat LOO; rentang di repo kini 1,61–2,30 juta); pembanding citra independen.
  - *Uji lulus:* LOO provinsi-tahun 2015–2025 MAPE ≤ 30% dan galat tahun berat ≤ 25%. Untuk 2026 vs Nusantara Atlas: bila rasio di luar 0,5–2, tidak ada peringkat. Frasa "tertinggi ke-" hanya bila batas bawah 2026 di atas tahun pembanding.
  - *Koreksi:* Metode SiPongi "titik panas + verifikasi" tidak terkonfirmasi. URL catalog-beta mati; ganti dengan doi 10.5067/VIIRS/VNP64A1.002 (pembanding kasar saja).
- **#4 [S] Luas terbakar konsesi (M).**
  - *Metode:* Hapus hektare dari slide Presiden. Bila perlu, titik S-NPP n/h × 4,3 ha (rentang 3,2–4,6). Luas sah dari dNBR Sentinel-2 per konsesi (`sawit_s2.py`, `citra.py`).
  - *Uji lulus:* konsesi yang terbakar 2019 vs peta Gaveau: rasio median 0,7–1,4 dan korelasi log ≥ 0,7. Jumlah luas konsesi per provinsi ≤ luas provinsi dari metode yang sama. Konstanta 14,06 dilarang di jalur teks "ha terbakar".
  - *Koreksi:* Lapis izin yang benar `PBPH_AR_50K` (sudah ditarik `konsesi.py:37`), bukan `PL_AR_250K` (penutupan lahan). Klaim praktik Gakkum belum bersumber.
- **#5 [S] Grup usaha dan bendera negara (M).**
  - *Metode:* Keluarkan bendera dan nama grup dari bahan Presiden dan situs publik. Hapus aturan "Berhad". Buat satu berkas bersumber per baris (AHU, laporan tahunan emiten, dan sejenisnya).
  - *Selaras dengan:* data pemilik manfaat AHU (Perpres 13/2018). AHU kini berada di Kementerian Hukum.
  - *Uji lulus:* setiap grup atau negara punya sumber dan tanggal; sampel 20 baris harus 20/20 cocok, bila tidak semua bendera disembunyikan.
- **#6 [S] Peluang masa puncak El Niño (M).**
  - *Metode:* Tahap 1: frekuensi "x dari n tahun El Niño" dengan selang Wilson; tahun ENSO otomatis dari CPC; 2019 ditandai atau dikeluarkan. Tahap 2: regresi logistik dengan prediktor dari prakiraan (CEMS fire seasonal).
  - *Selaras dengan:* prakiraan musim BMKG per ZOM; SPARTAN.
  - *Uji lulus:* LOO 2002–2025: BSS > 0 dengan batas bawah CI > 0, dan kemiringan keandalan 0,8–1,2. Kata "peluang" dilarang bila sumbernya `musim.py`.
  - *Koreksi:* "61% ZOM" yang benar adalah 529 ZOM = 61,08% luas wilayah. Reforecast CEMS hanya 25 anggota (51 anggota baru sejak 2017).
- **#7 [T] Outlook 12 bulan karhutla (M).**
  - *Metode:* Potong horizon ke lead yang skill-nya teruji; bulan 2027 ditulis "belum dapat diprakirakan". Bobot tahun analog = peluang ENSO resmi.
  - *Uji lulus:* hindcast 2002–2025 dengan pendorong yang tersedia saat terbit; bulan tampil hanya bila ROCSS > 0 dengan CI > 0. `judulBahaya` menolak bulan berpenanda ekstrapolasi.
- **#8 [S] Slide efektivitas penanganan (S).**
  - *Metode:* Judul "Perubahan sisa api (ha, dilaporkan)", angka absolut, tanpa persen pada basis di bawah ~50 ha, tanpa label Efektif/Lambat. Konteks: perubahan titik panas 3 hari dan hari hujan GSMaP.
  - *Selaras dengan:* P.32/2016 dan SKPDB.
  - *Uji lulus:* tidak ada kata "efektif"/"lambat" bila indikator proses kosong. Setelah ≥ 50 kompleks punya data operasi, efek hanya ditampilkan bila CI 95% tidak memuat 0.
  - *Koreksi:* Rujukan Plucinski yang benar adalah bagian 2, doi 10.1007/s40725-019-00085-4.
- **#9 [S] Tabel situasi dan judul "% padam" (S).**
  - *Metode:* Isi otomatis dari neraca Posko dengan tag sumber per sel. Validasi "belum ≤ luas" di klien dan server, memakai ulang cek di `src/posko.js:193`. Ganti "telah berhasil dipadamkan" menjadi "dilaporkan padam".
  - *Uji lulus:* uji integrasi handler `src/laporan_bnpb.js`: isian dengan belum > luas ditolak 4xx; isian yang ditarik sama persis dengan `/api/neraca`.
  - *Koreksi:* Perka BNPB 10/2008 sudah dicabut Perka 3/2016; rujuk `peraturan.go.id/files/bn1777-2016.pdf`.
- **#10 [S] Neraca Posko sebagai sumber angka lapangan (S).**
  - *Metode:* Tampilkan cakupan (regu pelapor dibanding regu terdaftar) dan jam laporan terakhir, tag sumber per angka, dan pengelompokan ≤ 500 m. Laporan yang bertentangan ditandai, bukan dipilih diam-diam.
  - *Uji lulus:* uji integrasi D1 dengan rollback: cakupan 2/3; rakor menimpa dengan tag "rakor"; dua laporan berbeda dalam ≤ 500 m ditandai.
  - *Koreksi:* "Rakor = forum penetapan angka" adalah perilaku repo, bukan isi Perka 3/2016.
- **#11 [T] Sikap judul terhadap lembaga (S).**
  - *Metode:* Sembunyikan rasio sikap; tampilkan daftar judul kritik bertaut. Metode baru: deteksi sikap per sasaran, dua anotator, ≥ 150 contoh negatif per lembaga, kappa ≥ 0,6.
  - *Uji lulus:* set uji n ≥ 200 per lembaga; batas bawah CI F1 makro di atas baseline mayoritas; recall negatif ≥ 0,7 dengan batas bawah CI ≥ 0,5.
- **#12 [S] Laporan kejadian banjir dan longsor (M).**
  - *Metode:* Judul "Laporan Status Prakiraan (model)". Judul "Laporan Kejadian" hanya dengan konfirmasi DIBI/BPBD atau ≥ 2 media. Buang kolom konsesi. Lapis utama: CAP/IBF BMKG, GloFAS v4 dengan ambang resmi CEMS, dan GFM.
  - *Uji lulus:* kabupaten-hari 2019–2025 vs DIBI: PSS CI95 > 0 per pulau dan ΔETS > 0; longsor ROC AUC ≥ 0,70.
  - *Koreksi:* Dataset GES DISC LHASA adalah arsip 2015–2021; data NRT ada di maps.nccs.nasa.gov. Ambang ILEWS tidak bersumber. Artikel IBF Expose 2026 tidak menyebut banjir/longsor.
- **#13 [S] Kejadian kekeringan (M).**
  - *Metode:* Hapus "Siaga/Awas" dan "Laporan Kejadian" dari keluaran model. Lapis utama PDKM BMKG; kejadian hanya dari SK dan DIBI; riwayat HTH dari CHIRPS harian.
  - *Uji lulus:* ulangi protokol RISET-AMBANG tanpa melonggarkan kriteria: POD ≥ 0,5, FAR ≤ 0,8, batas bawah CI CSI di atas CSI acak.
  - *Koreksi:* Ambang per tingkat ada di Setkab 2019, bukan di siaran pers BMKG 2021.
- **#14 [S] Kejadian cuaca ekstrem (S).**
  - *Metode:* Pisahkan lapis resmi (CAP aktif dari `expires`, prakiraan desa adm4, IBF) dari tingkat model. Tingkat model hanya internal, dengan kalimat "menangkap sekitar 7 dari 100 kejadian hujan ≥ 50 mm".
  - *Uji lulus:* model tampil sejajar BMKG hanya bila CSI-nya melampaui BMKG dengan batas bawah CI selisih > 0. `laporan_kejadian` tidak dipicu model.
  - *Koreksi:* Prakiraan adm4 pada 21 Okt hanya sekitar 48 jam (3 tanggal). Rujukan CAWCR pindah ke jwgfvr.github.io.
- **#15 [S] Agregasi teks bebas angkaTeks (S).**
  - *Metode:* Kolom terstruktur: nilai, satuan, jenis, tanggal "s.d.", sumber (mengikuti kamus DIBI). Total hanya untuk satuan dan jenis yang sama, dengan keterangan "n dari m baris belum ada angka".
  - *Uji lulus:* fixture Jatim menghasilkan "total ± 77,37 ha (2 dari 4 baris belum ada angka)"; penjumlahan kumulatif dengan kejadian ditolak.
- **#16 [S] "Hujan setelah OMC" (S).**
  - *Metode:* Fakta operasional "N sorti; hujan tercatat X dari Y hari". Evaluasi sasaran-kontrol dengan rasio ganda.
  - *Uji lulus:* setelah ≥ 30 hari semai, klaim hanya bila CI tidak memuat 1. Templat bebas kata "hasil OMC"/"berkat OMC".
  - *Koreksi:* Previous Runs API tidak menyimpan anggota ansambel; pakai Ensemble API.

### 4.2 karhutla-titik-luas-status

- **#0 [T] Hektare harian di deck berlogo BNPB (S).**
  - *Metode:* Cabut. Slide "Indikator satelit platform (bukan data BNPB)" berisi piksel per sensor, FRP, persen persistensi, dan tanda kelengkapan. Luas hanya bulanan dari citra.
  - *Selaras dengan:* kolom BNPB "Lahan Terbakar Harian" dan "luas ditangani darat/udara".
  - *Uji lulus:* 0 satuan "ha" di slide 1–2. Spearman FRP vs Lahan Terbakar Harian (8 provinsi, 15–21 Okt) dilaporkan apa adanya.
  - *Catatan:* Rincian per sensor mulai November hanya NOAA-20/21.
- **#1 [S] "Telah padam" 48 jam (M).**
  - *Metode:* Label "tidak terdeteksi lagi ≥ N jam pada lintasan lengkap (bukan status padam)". N dipilih lewat analisis survival arsip SP.
  - *Uji lulus:* ambang dari 2019 diuji pada 2023, dan sebaliknya; laju padam palsu ≤ 10% di gambut dan mineral.
  - *Koreksi:* Global Fire Atlas hanya preseden ambang persistensi. README yang benar `README_Himawari_L2WLF.txt`. Kalimat soal Manggala Agni tidak bersumber. Pakai NOAA-20 (arsip SP sejak 2018).
- **#2 [S] Label "Fire spot" (S).**
  - *Metode:* Nama "kluster api satelit yang bertahan ≥1 hari (NOAA-20/21)". Istilah "Fire Spot" hanya untuk angka BNPB.
  - *Uji lulus:* kepekaan jarak 2/4/8 sel; tampil hanya bila rasio maks/min ≤ 2.
  - *Koreksi:* Definisi resmi FS BNPB tidak ditemukan. Rujuk `gis.bnpb.go.id/server/rest/services`.
- **#3 [S] Luas tahun berjalan nasional (M).**
  - *Metode:* Angka berdampingan: SiPongi, citra independen (Nusantara Atlas Sentinel-2 dan MapBiomas Fire, sebagai rentang antarproduk), dan perkiraan dengan selang LOO.
  - *Uji lulus:* LOO 2019–2024 vs Zenodo: |median| ≤ 15% dan P90 ≤ 35%. Uji bulanan Agu–Okt: galat median ≤ 25%.
  - *Koreksi:* Tabel GFED5NRT tidak ada di GitHub; GFED5NRT memakai 16 kelas lahan. Liputan 19 Okt yang terkonfirmasi hanya AFP. Klaim "bias tetap per provinsi" salah. Sensor dasar harus pindah ke NOAA-20/21.
- **#4 [S] Hektare harian per provinsi dan kabupaten (M).**
  - *Metode:* Hapus. Ganti luas bulanan per provinsi dari citra (Nusantara Atlas, atau dNBR swakelola dengan syarat titik FIRMS ≤ 100 m dan buang petak < 6,25 ha). Sementara itu pakai GFED5NRT.
  - *Selaras dengan:* Kemenhut memakai interpretasi visual Landsat-8/9 dan Sentinel-2.
  - *Uji lulus:* 50 kompleks acak (2019 dan 2023): galat luas median ≤ 20% dan IoU median ≥ 0,6.
  - *Koreksi:* CSV GFED bersatuan ton C, dengan 34 provinsi lama.
- **#5 [S] Grafik tahunan dan klaim peringkat (S).**
  - *Metode:* 2015–2025 selalu angka resmi (2015 = 2,61 juta ha). 2026 dua batang. Klaim diganti dengan klaim titik S-NPP.
  - *Uji lulus:* batang tahun lalu = `luas_resmi.json`; teks peringkat hanya bila P10 > angka resmi pembanding (uji ini harus gagal pada data sekarang).
  - *Koreksi:* Jangan menulis MapBiomas berbasis "Landsat" sebelum ATBD-nya dicek. Peringkat akhir tahun harus memakai seri NOAA-20 yang dikalibrasi silang.
- **#6 [S] Hitungan titik panas harian (S).**
  - *Metode:* Definisi dipertahankan (setara SiPongi). Tambah pemeriksa kelengkapan lintasan dan kolom FRP.
  - *Uji lulus:* detektor menandai ≥ 95% hari bercelah (11 Mar–2 Jun dan 20 Okt 2026) dengan alarm palsu ≤ 5%. Rekonsiliasi 30 hari dengan GIS BNPB: rasio median 0,9–1,1.
  - *Koreksi:* Klaim "BRIN membuang tambang" salah. Tambahkan NOAA-21 sekarang.
- **#7 [T] Perubahan harian dan warna (S).**
  - *Metode:* Pembanding 7 hari bergulir atau 3 hari lawan 3 hari, hanya dari hari yang lintasannya lengkap. Warna hanya bila melampaui derau, dengan ≥ 50 titik di kedua jendela.
  - *Uji lulus:* laju pembalikan warna < 20% dan lebih rendah dari metrik lama; 20 Okt 2026 tanpa warna.
  - *Koreksi rumus:* 2·√φ·√(1/a+1/b).
- **#8 [T] Kebutuhan operasi (M).**
  - *Metode:* Keluarkan dari Paparan. Indikator relatif: piksel dan FRP per 100 personel resmi. Kalibrasi dari kolom `bnpb.json`, yang diarsipkan per tanggal.
  - *Uji lulus:* MAPE "luas ditangani" ≤ 40% dan mengalahkan persistensi.
  - *Catatan:* Pembanding resmi terbaru 71.878 personel darat.
- **#9 [T] Hari layak OMC (S).**
  - *Metode:* Tampilkan OMC resmi (BMKG; kolom BNPB OMC unit, sortie, bahan semai). Indikator sendiri hanya berlabel "indikasi potensi awan".
  - *Uji lulus:* Agu–Okt 2026 vs hari OMC terlaksana; bila CSI < 0,3, hapus.
  - *Selaras dengan:* siaran pers BMKG Kalbar 5 Sep 2026.
- **#10 [T] Luas musim di tab Dampak dan `keputusan.py` (S).**
  - *Metode:* Satu angka luas untuk seluruh situs. `kalibrasi()` membuang tahun parsial; `hari_bln` memakai `calendar.monthrange`.
  - *Uji lulus:* kemiringan dengan dan tanpa 2026 berselisih ≤ 0,02 (sekarang 0,872 lawan 0,597). Proyeksi dari posisi 17 Okt untuk 2015/2019/2023 galatnya ≤ 30%.
- **#11 [T] "Luas terdampak" dan "luas kejadian api" (S).**
  - *Metode:* Tanpa satuan ha. Kalimat utama "jumlah piksel api aktif 24 jam"; lampiran "jejak deteksi satelit 7 hari (km², bukan luas terbakar)".
  - *Uji lulus:* field `dampak` dan `luas_kompleks` tidak dirender dengan "ha".
- **#12 [T] Atribusi asap ke kota dan negara tetangga (M).**
  - *Metode:* Lintas batas: kutip ASMC dan "Citra Sebaran Asap" BMKG. Kota: atribusi tiga syarat (kabut terlihat di citra; lintasan balik melewati kompleks aktif; PM2,5 di atas baseline kontrafaktual).
  - *Uji lulus:* Sep 2019 dan Okt 2026: POD ≥ 0,8, FAR ≤ 0,3. Tidak ada klaim negara tetangga di luar laporan ASMC.
- **#13 [T] Tabel rekonsiliasi luas (S).**
  - *Metode:* Tambah Sentinel-2, GFED5/5NRT, MapBiomas, dan baris BNPB "luas dipadamkan".
  - *Uji lulus:* aturan None ≠ 0; Sentinel-2 ≥ MCD64A1 di ≥ 4 dari 6 tahun.
- **#14 [T] Penyisipan data resmi (S).**
  - *Metode:* Definisi per angka resmi ("Lahan Terbakar Indikatif" berbeda arti antarprovinsi). Arsip `bnpb.json` harian. SiPongi otomatis dengan tanggal "per".
  - *Uji lulus:* setiap angka resmi punya `definisi` dan `per` ≤ 3 hari; jumlah provinsi = total ±0,5%.
- **P2 #23 [T], dinaikkan ke P1 oleh verifikator: Pengisian celah S-NPP (S).**
  - *Metode:* Sensor dasar NOAA-20 + NOAA-21; faktor antarsensor dari hari tumpang-tindih, dengan skrip yang di-commit.
  - *Uji lulus:* CV bulanan rasio N20/S-NPP ≤ 15%.

### 4.3 karhutla-risiko-cuaca

- **#2 [T] Agregasi provinsi pakai porsi luas, bukan maksimum sel (S).**
  - *Metode:* Persen sel dengan kelas ≥ ambang pada hari ini. Contoh: "Sangat tinggi di 34% wilayah Sumsel (model, data <tanggal>)".
  - *Selaras dengan:* InaRISK (luas per kelas).
  - *Uji lulus:* Spearman porsi ≥ Spearman maks di ≥ 7 dari 9 provinsi. Kartu tidak membaca `fwi_maks` maupun kolom prakiraan terakhir.
- **#3 [T] Kolom FWI per kabupaten di Paparan (S).**
  - *Metode:* Kata kelas BMKG di lokasi kompleks terbesar, dengan sumber "dihitung Pantau Bencana dari cuaca model; bukan SPARTAN BMKG".
  - *Uji lulus:* kolom hanya berisi empat kata kelas. Setelah feed SPARTAN ada, kesepakatan ≥ 70% selama 30 hari.
- **#7 [S] Tingkat provinsi dan kartu keputusan Ringkasan (M).**
  - *Metode:* Tingkat hanya dari besaran teramati dan SK pemda; tidak ada rekomendasi status hukum atau "Presiden …".
  - *Selaras dengan:* UU 24/2007 (`peraturan.bpk.go.id/Details/39901`).
  - *Uji lulus:* replay musim; tingkat ≥ 2 muncul dalam ±7 hari dari SK pada ≥ 80% kasus.
  - *Koreksi:* Dataset SK di CKAN hanya berisi 2025, jadi replay 2023/2026 butuh sumber lain. DC 1.276 milik Jatim; NTT 1.043, Papua Selatan 962.
- **#19 [T] Kompleks gambut dipertahankan 168 jam (S).**
  - *Metode:* Pisahkan "aktif teramati 24 jam" dari "diduga membara". Kolom Kejadian untuk Presiden hanya yang teramati. Perpanjangan hanya bila piksel tertutup awan.
  - *Uji lulus:* dari kompleks yang dipertahankan aturan DC > 350, yang terdeteksi ulang pada hari ke-4 s.d. 7 harus ≥ 50%; bila tidak, perpanjangan dihapus.
  - *Catatan:* 63% kompleks tidak teramati; 28% bertahan hanya karena aturan 168 jam. Pisahkan juga kelompok 24–72 jam.
- **#10 [S] ENSO dan IOD (S).**
  - *Metode:* RONI di semua layar. "IOD positif" hanya bila DMI mingguan ≥ +0,4 selama ≥ 8 minggu berturut-turut.
  - *Selaras dengan:* analisis Dinamika Atmosfer BMKG per dasarian.
  - *Uji lulus:* label 2019/2023 jatuh ≤ 2 minggu dari deklarasi BoM/BMKG; satu field ENSO untuk semua layar.
  - *Koreksi:* Angka 100/92/60% adalah IRI. Aturan 8 minggu hanya dari sumber sekunder. PDF BMKG Feb 2024 mati; ganti dengan analisis dasarian I Okt 2026.
- **#11 [T] Kalender musim (S).**
  - *Metode:* Tahun El Niño dari episode RONI: 2002, 2004, 2006, 2009, 2015, 2023 (n = 6). Ditulis "x dari 6 tahun", dengan beta-binomial.
  - *Uji lulus:* LOYO 2002–2025: BSS > 0 dengan selang > 0 di ≥ 5 dari 9 provinsi.
  - *Selaras dengan:* awal musim hujan BMKG per ZOM (doi 10.31172/jmg.v13i1.113).
- **#14 [T] Bahaya 12 bulan (M).**
  - *Metode:* Horizon ≤ 3 bulan; tiga kategori anomali; analog ditimbang peluang ENSO resmi.
  - *Uji lulus:* RPSS > 0 per lead (selang > 0); judul tanpa bulan ekstrapolasi.
  - *Selaras dengan:* Prediksi Hujan Bulanan Probabilistik dan Prakiraan Musim Kemarau BMKG.
- **#21 [T] Jendela hari layak OMC (S).**
  - *Metode:* Hapus. Tampilkan OMC resmi dan prediksi potensi awan BMKG.
  - *Uji lulus:* bila ph dipertahankan, BSS > 0 terhadap GSMaP.
  - *Catatan:* `ringkasan.js:228` memakai 0,1–0,6, berbeda dari `operasi.py` 0,15–0,60.
- **#0 [S] FWI Kanada (M).**
  - *Metode:* SPARTAN BMKG sebagai angka resmi (grid diminta lewat BNPB). Hujan masa lalu diganti hujan satelit (GSMaP/IMERG).
  - *Uji lulus:* `pfvi_balik.py` diperluas ke 611 sel, Jul–Okt 2015–2025: selang ΔAUC varian GSMaP tidak seluruhnya negatif, dan AUC ≥ 0,70 per kelompok lahan.
  - *Koreksi:* "ISI > 6" tidak ada di Haze Portal; rujuk de Groot 2007. GFWED dievaluasi utama dengan MERRA-2. GSMaP_Gauge_NRT juga berlatensi 4 jam, dengan koreksi CPC 30 hari.

### 4.4 karhutla-model-sebaran

- **#1 [T] Penerapan model di layar Simulasi (S).**
  - *Metode:* Layar hanya membaca hasil jalur CI (`prospektif.py`); t0 = waktu lintasan pertama.
  - *Uji lulus:* pada ≥ 100 titik, |p_layar − p_CI| ≤ 0,005; menggeser jam ±12 jam tidak mengubah p.
- **#2 [S] Peluang simulasi dipetakan ke Siaga/Awas EWS (S).**
  - *Metode:* Jalur simulasi tidak memakai TINGKAT bersama; kalimatnya "perkiraan model eksperimental: sekitar 1 dari 5".
  - *Uji lulus* (`tests/warga/ews.test.mjs`): simulasi tidak pernah memberi tingkat ≥ 1; email untuk p 0,20–0,49 tidak memuat "Kemungkinan besar", "Siaga", atau "Awas".
  - *Koreksi:* Jalur pengamatan juga memakai Awas ≤ 5 km dan Siaga ≤ 15 km (`ews.js:34`), jadi kosakatanya ikut diganti. Kriteria "Awas > 60 hari" BMKG tidak ada di siaran pers yang dirujuk.
- **#3 [S] Jejak api 72 jam (M).**
  - *Metode:* Peringatan kedekatan teramati setara FIRMS Fire Alerts (VIIRS/Himawari dalam 2/5/10 km, 24 jam terakhir), ditambah kelas FWI/ISI.
  - *Uji lulus:* 2019–2025, model tampil hanya bila CSI-nya melampaui aturan teramati dengan selang selisih > 0.
  - *Koreksi:* Peringatan kedekatan 5/15 km sudah ada, jadi intinya mencabut jalur simulasi. Angka 51,33% adalah algoritma LAPAN pada Himawari-8 (2019), bukan produk WLF.
- **#6 [T] Peluang membesar cara lama dan AUC 0,70 (S).**
  - *Metode:* Hapus fallback.
  - *Uji lulus:* grep `kal_lepas`/`lepas_auc` tidak ditemukan di `public/*.js` dan `tentang.html`.
- **#7 [T] Klaim kinerja di tentang.html (S).**
  - *Metode:* Kalimat dibaca dari JSON, ditambah kartu model.
  - *Uji lulus:* tidak ada literal angka kinerja; tidak ada kata "mengalahkan"; AUC yang dikutip sama dengan `lolos.kinerja.uji.auc`.
  - *Koreksi:* Tulis "diuji terutama pada musim 2026", dan sebut bahwa angka uji milik model 2015–2023.
- **#0 [S] Garis dasar "normal" dan status Siaga (M).**
  - *Metode:* Persentil terhadap klimatologi S-NPP 2012–2025 (jendela ±7 hari). Ganti keempat nama tingkat P.9/2018.
  - *Uji lulus:* 2015–2025 vs periode Siaga Darurat resmi: POD ≥ 0,8, median bendera tidak lebih lambat dari SK. Teks tahun dasar sama dengan `musim_awal.json`.
  - *Koreksi:* "Setara SiPongi" hanya komentar repo. Siaga juga dipicu ≥ 3 kompleks prioritas atau ≥ 1 juta jiwa.
- **#12 [T] Awal musim yang tersensor (S).**
  - *Metode:* Tulis "≤ 9 Jun" dan "≥ 68 hari"; tampilkan rentang sensitivitas; Kaplan–Meier atau persentil kumulatif.
  - *Uji lulus:* rentang ≤ 14 hari di ≥ 80% provinsi-tahun.
  - *Catatan:* Pencarian sejak 1 Jan sudah ada (Papua Selatan jatuh di 18 Jan), jadi itu saja tidak cukup.
- **#10 [T] Uji prospektif (S).**
  - *Metode:* Ledger append-only di git atau R2. Kriteria go/no-go dipra-registrasi: ≥ 200 dinilai, ≥ 20 lolos, batas bawah CI AUC ≥ 0,80, BSS > 0.
  - *Uji lulus:* n_dinilai > 0 dalam 7 hari musim aktif.
  - *Catatan:* Gerbang ini GAGAL sekarang. Produksi: 903 + 343 dicatat, 0 dinilai.
- **#9 [S] Model "akan membesar" (M).**
  - *Metode:* Uji balik semu dengan Previous Runs API; disajikan sebagai daftar prioritas pantau.
  - *Uji lulus:* AUC ≥ 0,85, BSS ≥ 0,15, recall ≥ 0,6, penurunan AUC terhadap versi ERA5 ≤ 0,03; lalu uji prospektif.
  - *Koreksi:* Model terpasang dilatih ulang 2015–2026. Angka yang pantas dikutip untuk api yang belum lolos 14 jam: AUC 0,930, recall 63,5%, presisi 24,1%. Historical Forecast API bukan arsip prakiraan berjangka.
- **#8 [S] Luas kejadian dari sel × 14,06 ha (M).**
  - *Metode:* Satu definisi kejadian (`harian.py`); luas agregat dari titik × 4,30 ha (3,22–4,59); luas per kejadian dari Sentinel-2.
  - *Uji lulus:* MAPE provinsi-tahun ≤ 30% terhadap SiPongi; 2019: rasio median 0,7–1,4 dan korelasi log ≥ 0,7.
  - *Koreksi:* Nama produknya VNP64A1 V002. Field `dampak` di `laporan.py` ikut diubah.
- **#5 [S] Simulasi perlakuan dan biaya (S).**
  - *Metode:* Waktu tempuh sumber terdekat dan matriks keputusan kualitatif; hapus ha, Rp, dan tombol di `ringkasan.js:279`.
  - *Selaras dengan:* P.32/2016.
  - *Koreksi:* Rujukan Plucinski bagian 2 (doi …00085-4); jangan menyebut pencocokan propensitas sebagai "pendekatan Plucinski".
- **#11 [S] Mesin fisika Simulasi (M).**
  - *Metode:* ETA dalam kelas < 24 / 24–48 / 48–72 jam; buang "pita ±20%" dan kata "terkalibrasi". Model per strata (Cheney 1998 untuk sabana).
  - *Uji lulus:* |log luas 72 jam| ≤ 0,65 (persistensi) dan |bias| ≤ 0,3; kelas ETA benar ≥ 60%.
  - *Koreksi:* Pakai doi 10.1071/WF9980001 dan 10.1071/WF15103. Varian hibrida pun masih 1,30, lebih buruk dari persistensi.
- **#4 [T] Model sel GBDT (L).**
  - *Metode:* Tampilan bawaan = peta teramati; model sel tidak tercentang dan berlabel "eksperimental".
  - *Uji lulus* (2024–2026, cuaca Previous Runs day1):
    - FSS(5 km) 24 jam melampaui persistensi dan buffer dengan selisih ≥ 0,05;
    - galat arah median < 60°;
    - bin p ≥ 0,3 berisi ≥ 200 sel dengan selisih ≤ 0,1.

### 4.5 gempa-tsunami

- **#0 [S] Pengurai status tsunami (S).**
  - *Metode:* Daftar-putih frasa ditambah teks asli BMKG.
  - *Koreksi penting:* Peringatan nyata berbunyi "Potensi TSUNAMI untuk diteruskan pada masyarakat", tanpa kata tingkat, dan pesan PD-4 "berakhir" membawa teks yang sama. Jadi tingkat harus diambil dari `<wzarea>` di `last30tsunamievent.xml`, dan status berakhir dari subject "PD-4".
  - *Uji lulus:* ≥ 30 teks nyata + ≥ 10 negatif, 100% benar; cek harian otomatis.
  - *Selaras dengan:* UU 31/2009, Perpres 93/2019. Minta izin BMKG untuk bucket.
- **#1 [S] Alarm platform (S).**
  - *Metode:* Alarm tsunami hanya bila BMKG terbit, tidak pernah "Awas" kecuali kata itu ada di teks BMKG. Gempa: deskriptor faktual.
  - *Uji lulus:* uji balik 2008–2025 POD ≥ 0,9 untuk kejadian merusak, dengan FAR lebih rendah dari aturan lama.
  - *Koreksi:* ShakeMap Atlas hanya sampai 2020 (2021 ke atas dari ComCat). `DIBI_JENIS` belum memuat "Gempabumi", jadi uji ini belum bisa jalan. Status kedaruratan BNPB adalah siaga/tanggap/transisi darurat, bukan Waspada/Siaga/Awas.
- **#2 [S] Email EWS (S).**
  - *Metode:* Teks buletin apa adanya; kirim hanya ke kabupaten pesisir yang disebut buletin. Gempa: radius dari IPE berbasis jarak hiposentral.
  - *Uji lulus:* terhadap Dirasakan BMKG, POD ≥ 0,8 dan FAR ≤ 0,3 pada ≥ 100 pasangan; frasa "Segera menjauhi pantai" hanya bila ada di teks sumber.
  - *Koreksi:* IPE Allen dkk. 2012 untuk kerak aktif; gempa intraslab butuh IPE subduksi.
- **#8 [S] Tsunami untuk gempa nyata di laci (S).**
  - *Metode:* Hapus hitungan sendiri; tampilkan daftar wilayah, tingkat, dan ETA InaTEWS verbatim.
  - *Uji lulus:* jumlah pemanggilan `Tsunami.gelombang` dari laci = 0.
  - *Koreksi:* Zona dan jam tiba resmi tersedia (contoh 15 Agu 2026: 8 segmen SIAGA, 14 WASPADA).
- **#3 [S] Model guncangan (M).**
  - *Metode:* `grid.xml` ShakeMap, PAGER `exposures.json`, dan gambar ShakeMap BMKG.
  - *Uji lulus:* ≥ 100 pasangan dari ≥ 30 gempa: |bias| ≤ 0,5 MMI, RMSE ≤ 1,0, ≥ 70% tepat ±1 kelas. Kasus wajib: M5,2 kedalaman 30 km dan M6,5 kedalaman 45 km harus memberi MMI pusat < VII.
  - *Koreksi:* URL `tg_select` harus memakai `/docs2020/`. DOI Vs30 rilis 2026 adalah 10.5066/P1NV6UNM. STREC sudah diarsipkan.
- **#6 [S] Kerusakan dan korban (M).**
  - *Metode:* Kelas dan `losses.json` PAGER, lalu BNPB/DIBI begitu tersedia; skenario dengan Jaiswal & Wald 2010.
  - *Uji lulus:*
    - kelas korban tepat ≥ 50%;
    - tepat ±1 kelas ≥ 85%;
    - tidak ada kejadian ≥ 1.000 jiwa yang meleset ≥ 2 kelas;
    - median |log10| < 0,73.
  - *Koreksi:* Pakai github.com/inasafe/inasafe (inasafe.org tidak terjangkau). Model ITB adalah karya Sengara dkk.
- **#5 [T] Bandara di zona MMI VI+ (S).**
  - *Metode:* MMI bandara diambil dari grid ShakeMap; sebelum terbit tulis "menunggu ShakeMap".
  - *Uji lulus:* selisih < 0,1 pada 5 gempa historis.
- **#7 [T] Pengelompokan gempa utama dan susulan (S).**
  - *Metode:* Anggota yang lebih besar menjadi gempa utama, lalu jendela dihitung ulang.
  - *Uji lulus:* identitas gempa utama sama pada ≥ 95% rangkaian dengan Mu ≥ 6, dan 100% pada kasus wajib (Palu 2018 harus Mu 7,5; Lombok 2018; Cianjur).
- **#13 [S] Laporan Harian Gempa (S).**
  - *Metode:* Katalog BMKG; ambang dari Mc arsip BMKG; tanpa panah atau persen harian.
  - *Uji lulus:* jendela "di atas kisaran" sekitar 5% (3–8%); cacah M ≥ 5 berselisih 0 dengan BMKG.
  - *Koreksi:* `live30event.xml` memakai solusi revisi (contoh M5,1 lawan 4,9). Tetapkan satu versi (Info Gempa) dan cocokkan lewat waktu dan jarak.
- **#14 [T] Label "Gempa M6+ dangkal" di outlook (S).**
  - *Metode:* Label "semua kedalaman", atau saring ≤ 70 km lalu uji.
  - *Uji lulus:* teramati berada di dalam selang 90% (latih 1990–2015, uji 2016–2025).
- **#11 [S] Indeks risiko riwayat gempa (S).**
  - *Metode:* Buang; ganti IRBI kolom gempabumi/tsunami.
  - *Uji lulus:* 100% sama dengan NDJSON InaRISK; ≥ 80% kabupaten dengan gempa mematikan berada di kelas sedang/tinggi.
  - *Koreksi:* Klaim "IRBI indikator RPJMN" tidak terdukung.
- **#12 [S] Fasilitas rawan (S).**
  - *Metode:* InaRISK `get-infra-risk` (cacah fasilitas per kelas).
  - *Uji lulus:* 514 kabupaten terpanen; rasio sekolah InaRISK/Data Referensi 0,8–1,2 di ≥ 90% kabupaten.
  - *Koreksi:* Kolom penduduk dan bangunan InaRISK tidak sebanding dengan BPS.
- **#4 [S] Paparan bangunan per MMI (M).**
  - *Metode:* Masukan dari grid ShakeMap.
  - *Koreksi:* Kolom "bangunan" di `get-infra-risk` bukan stok bangunan (Kota Bandung 18.031; Kota Yogyakarta 0), jadi uji rasio 0,7–1,3 tidak berdasar. Cari sumber stok bangunan lain.
- **#9 [S] Tinggi tsunami indikatif (L).**
  - *Metode:* Kelas ancaman InaTEWS (< 0,5 / 0,5–3 / > 3 m) dan `layer_bahaya_tsunami` InaRISK.
  - *Uji lulus:* hindcast run-up dengan ukuran Aida K dan κ.
  - *Koreksi:* Raster `Inun_*` hanya mencakup Kota Ambon. Ambang JSCE harus dikutip dari dokumen aslinya.
- **#10 [S] Evakuasi jalan kaki (L).**
  - *Metode:* Untuk Presiden, buang kartu ini; rujuk rencana kontinjensi BPBD dan Tsunami Ready.
  - *Uji lulus:* kesesuaian zona aman ≥ 80%; selisih waktu tempuh ≤ 20%.
  - *Koreksi:* Rujukan IOC sealevel tidak relevan; pakai Wood & Schmidtlein 2012.

### 4.6 kekeringan

- **#0 [T] Status Waspada/Siaga/Awas diganti PDKM BMKG (S).**
  - *Metode:* `pdkm.py` mengurai tabel HTML BMKG (html.parser, UA peramban); model turun menjadi "anomali hujan" dengan kategori McKee.
  - *Uji lulus:* parser offline dengan 0 nama tak tercocok; laporan menolak W/S/A yang sumbernya bukan BMKG/SK; POD/FAR/CSI PDKM vs DIBI dipakai sebagai patokan.
  - *Catatan:* Waspada > 21 hari dan Siaga > 31 hari terkonfirmasi (Setkab 2019). Awas ditulis "> 61 hari".
- **#2 [T] Laporan Harian Kekeringan (M).**
  - *Metode:* Sorotan hanya dari sumber resmi bertanggal.
  - *Uji lulus:* setiap sorot punya sumber (BMKG/BNPB/BPBD/NOAA) dan periode; jumlah Awas sama dengan `kekeringan_pdkm.json`.
- **#4 [T] Kartu OG (S).**
  - *Metode:* Isi dari PDKM bersumber BMKG; bila gagal, kalimat netral tanpa angka.
  - *Uji lulus:* judul tanpa kata awas/siaga/waspada kecuali bersumber BMKG dengan dasarian.
  - *Catatan:* `public/kekeringan/bagikan.js:15-23` ikut gerbang.
- **#7 [T] Label waktu (S).**
  - *Metode:* Periode data di judul; "hari ini" hanya untuk produk harian.
  - *Uji lulus:* kartu berbasis SPI memuat nama bulan data.
- **#5 [S] Kejadian D (S).**
  - *Metode:* Matikan `adaptor_kekeringan`.
  - *Uji lulus:* jumlah entitas D = jumlah kabupaten berkejadian di laporan harian.
  - *Catatan:* 246 berkas `kejadian/kekeringan-*.json` ikut dimatikan atau dijudul ulang.
- **#3 [S] Paparan penduduk dengan aturan 30% (S).**
  - *Metode:* Tiga besaran terpisah: "terdampak" (BPBD/BNPB), "penduduk di wilayah peringatan BMKG", dan "perkiraan rentan air bersih" (BPS).
  - *Uji lulus:* kata "terdampak" hanya untuk sumber BNPB/BPBD; angka rentan dalam 0,1–10 kali jiwa yang dilaporkan.
  - *Koreksi:* Rekor terdampak adalah 2018 (7.798.763), jadi 147,9 juta setara sekitar 19 kali rekor.
- **#6 [T] Posko air bersih (S).**
  - *Metode:* Sembunyikan rutenya; hitung dari jiwa/KK yang dilaporkan × 15 L.
  - *Uji lulus:* rasio kebutuhan/distribusi median 0,3–3 selama ≥ 4 pekan.
  - *Catatan:* 15 L adalah indikator Sphere Standard 2.1. Perka BNPB 7/2008 belum diverifikasi.
- **#8 [T] SK status darurat (S).**
  - *Metode:* Pisahkan 11 SK khusus dari 68 SK multi-bahaya; tulis cakupan data.
  - *Uji lulus:* kalimat "tidak ada SK berlaku" hanya bila tahun data ≥ tahun berjalan; khusus + multi = total.
- **#1 [S] Hari tanpa hujan (M).**
  - *Metode:* HTH resmi BMKG (lewat PDKM dan peta HTH). Grid internal dari GSMaP_Gauge_NRT dengan jendela ≥ 180 hari.
  - *Uji lulus:* kelas ≥ 61 hari pada grid vs Awas PDKM: POD ≥ 0,8 dan FAR ≤ 0,3 selama ≥ 6 dasarian.
  - *Koreksi:* dataonline BMKG hanya menyediakan data bulanan; data harian lewat PTSP. Koreksi gauge GSMaP memakai parameter CPC 30 hari terakhir.
- **#10 [T] Peluang HTH 90 hari (S).**
  - *Metode:* Hapus; ganti peluang < 20 mm/dasarian dari BMKG.
  - *Uji lulus:* p31/p61 tidak ada lagi di keluaran.
- **#9 [S] Prakiraan SEAS5 1–3 bulan (L).**
  - *Metode:* Kutip Prediksi Hujan Dasarian dan Bulanan BMKG; versi internal berupa tersil bawah yang dikalibrasi dengan hindcast.
  - *Uji lulus:* ROC ≥ 0,6 dan BSS > 0 dengan batas bawah bootstrap > 0.
  - *Koreksi:* Endpoint `data.nc` IRI DL bisa diambil tanpa login; periode hindcast NMME berbeda per model.
- **#11 [S] Indeks risiko riwayat kekeringan (M).**
  - *Metode:* Tampilkan kelas IRBI; nanti ukuran absolut dari CHIRPS.
  - *Uji lulus:* Spearman ≥ 0,3 (p < 0,01) terhadap DIBI dan InaRISK.
  - *Koreksi:* Ambang bulan kering Oldeman < 100 mm, bukan < 60 mm. Indeks lama vs IRBI: ρ −0,178.
- **#12 [T] Konsesi gambut (S).**
  - *Metode:* Sembunyikan; nanti pakai TMAT SiPALAGA (ambang −0,4 m, PP 57/2016) dan SiMATAG KLHK.
  - *Uji lulus:* DC vs TMAT r ≤ −0,5 sebelum DC dipakai sebagai proksi.
- **#13 [T] Cekaman air padi (M).**
  - *Metode:* Keluarkan tabel; pakai puso Kementan, BPS KSA, dan ATi BMKG.
  - *Uji lulus:* ρ ≥ 0,4 pada 2015/2019/2023 dan POD ≥ 0,6 untuk kabupaten dengan puso ≥ 100 ha.
- **#14 [T] Dampak simulasi (S).**
  - *Metode:* Hapus "jiwa tanpa air bersih"; luas sawah dari Lahan Baku Sawah ATR/BPN (7.463.948 ha).
  - *Uji lulus:* total ±1% dari angka resmi.
- **#15 [T] Peringkat perlakuan dan biaya (S).**
  - *Metode:* Sembunyikan dari pimpinan.
  - *Uji lulus:* tidak dirender di mode publik/pimpinan.
  - *Catatan:* Path yang benar `public/kekeringan/sim_tanggap.js`.

### 4.7 udara-asap

- **#1 [S] Status W/S/A untuk udara (S).**
  - *Metode:* Nama kategori ISPU ditambah pil "perkiraan model"; status resmi dari SK pemda/BNPB dan Alert Level ASMC.
  - *Uji lulus:* 0 pelanggaran; `rata24` pada jam 0 memakai 24 nilai.
  - *Koreksi:* Tidak ada daftar status darurat tunggal dari BNPB; kumpulkan dari SK daerah.
- **#32 [T] Pop-up harian udara (S).**
  - *Metode:* Buang angka jiwa dan kartu lintas batas.
  - *Uji lulus:* kedua sisi perbandingan memakai jenis data yang sama.
- **#12 [T] Asap lintas batas (S).**
  - *Metode:* Hapus dari publik; rujuk ASMC.
  - *Uji lulus:* nama negara tetangga tidak muncul di keluaran publik.
  - *Selaras dengan:* UU 26/2014 (`peraturan.bpk.go.id/Details/38689`).
- **#9 [T] Jarak pandang Koschmieder (S).**
  - *Metode:* Hapus; tampilkan TAF dan METAR.
  - *Uji lulus:* parser TAF menangani BECMG/TEMPO/PROB30 dengan benar.
  - *Selaras dengan:* Peraturan BMKG 6/2024.
- **#10 [T] METAR terkini (S).**
  - *Metode:* Perluas cakupan ICAO WA**/WI** dan SYNOP; pisahkan FU, HZ, dan BR/FG.
  - *Uji lulus:* ≥ 90% bandara berjadwal di 10 provinsi rawan punya laporan < 12 jam; WIPP muncul di tabel.
  - *Rujukan:* web-aviation.bmkg.go.id.
- **#27 [T] Jalur lama `udara_kualitas.json` (S).**
  - *Metode:* Hapus jalur lama; adapter menolak data basi.
  - *Uji lulus:* berkas tanpa tanggal hari ini menghasilkan null dan label basi.
- **#18 [T] Kejadian udara U (S).**
  - *Metode:* Hanya dengan konfirmasi pengamatan.
  - *Uji lulus:* FAR < 0,3 pada musim 2023; setiap entri punya field `konfirmasi`.
- **#25 [T] Peringkat perlakuan berbiaya rupiah (S).**
  - *Metode:* Keluarkan; tampilkan pedoman resmi.
  - *Uji lulus:* tidak ada angka rupiah di keluaran publik.
- **#15 [S] Penautan kompleks api ke konsesi (S).**
  - *Metode:* Tanpa nama badan usaha di modul udara.
  - *Uji lulus:* audit 50 tautan; string "PT " tidak muncul di `public/udara/data`.
  - *Koreksi:* `konsesi2026` bukan HGU ATR/BPN; peta sawit data 2012/2014.
- **#19 [S] Laporan Harian Udara (M).**
  - *Metode:* Versi briefing berisi METAR/TAF, ISPU terukur, titik panas, dan kategori per provinsi.
  - *Uji lulus:* setiap angka bersumber dari daftar putih dengan `jalan_id` yang sama; `jalan.py` keluar ≠ 0 bila ada langkah gagal.
  - *Koreksi:* Endpoint SiPongi di `luas_satelit.py:29` berdomain .my.id; konfirmasi ke Kemenhut dulu.
- **#2 [S] Prakiraan PM2,5 CAMS (M).**
  - *Metode:* Data ukur lebih dulu (AQMS KLH, 27 stasiun BMKG, OpenAQ), lalu koreksi MOS.
  - *Uji lulus:* kriteria Emery 2017 (NMB ±30%, NME < 50%, r > 0,40), dan HSS untuk ≥ 55,5 melampaui CAMS mentah.
  - *Koreksi:* GEOS-CF v1 sudah berhenti; pakai v2 (`aqc_tavg_1hr_glo_L1440x721_slv`, variabel `pm25_rh35`).
- **#6 [S] Jiwa terpapar (M).**
  - *Metode:* Dua angka: terukur, dan model asap di sel asli × WorldPop.
  - *Uji lulus:* NMB ±30% di kota berstasiun; selisih antar-kabupaten tetangga < 1,5 kali.
  - *Koreksi:* Klaim "83–89% non-karhutla" terlalu kuat.
- **#7 [T] Balita, lansia, dan sekolah (M).**
  - *Metode:* Keluarkan dari briefing; struktur umur WorldPop/BPS; sekolah per titik Dapodik.
  - *Uji lulus:* ±5% terhadap BPS; angka sekolah ≠ batas MAKS_SEKOLAH (300).
- **#8 [S] Tambahan kasus ISPA (M).**
  - *Metode:* Angka SKDR Kemenkes; estimasi AirQ+.
  - *Uji lulus:* ρ ≥ 0,5 terhadap SKDR dan rasio total dalam faktor 2.
  - *Koreksi:* Pakai HRAPIE-2 (2025). Fungsi Koplitz 2016 hanya untuk kematian dewasa. "ISPA" di SKDR perlu dicek.
- **#13 [T] Atribusi sumber PM2,5 (M).**
  - *Metode:* Status kualitatif "terpengaruh asap karhutla: ya/mungkin/tidak".
  - *Uji lulus:* vs SYNOP ww 04 di ≥ 30 stasiun: HSS ≥ 0,4, bias 0,8–1,25.
- **#14 [S] Asal asap per kota (M).**
  - *Metode:* Angin analisis lampau dan ansambel ≥ 27 jalur.
  - *Uji lulus:* ≥ 80% cocok dengan HYSPLIT.
  - *Koreksi:* Praktik HYSPLIT di BMKG/ASMC hanya terkonfirmasi sebagian.
- **#16 [S] "Peluang" dari 729 varian (M).**
  - *Metode:* Ganti nama menjadi "sensitivitas asumsi asap" atau hapus; kalibrasi dengan EMOS atau logistik.
  - *Uji lulus:* BSS > 0,1 dan kemiringan reliabilitas 0,8–1,2.
  - *Koreksi:* `scripts/umum/latih/` dan `kalibrasi.py` belum ada, jadi upayanya lebih dari M.

### 4.8 gunungapi

- **#0 [T] Level PVMBG dari D1 (M).**
  - *Metode:* `/api/gunungapi/terbaru` menjadi satu-satunya sumber, dengan "per pukul HH:MM WIB, sumber PVMBG".
  - *Uji lulus:* 95% pembacaan berumur < 45 menit selama 14 hari; jumlah per level tidak pernah beda dari MAGMA.
  - *Catatan:* ICAO menambah kode "UNASSIGNED". Tanggal VONA wajib tampil.
- **#5 [T] Agregasi /semua (S).**
  - *Metode:* Gunung api keluar dari hitungan kejadian aktif; tampil sebagai baris "N gunung berstatus Siaga/Awas (PVMBG, per pukul X)".
- **#4 [T] Kejadian V (M).**
  - *Metode:* Kejadian hanya bila ada SK darurat erupsi, erupsi berdampak, atau Level IV.
  - *Uji lulus:* uji mundur 2018–2024: selisih ≤ 1 kejadian atau ≤ 20% per tahun.
  - *Koreksi:* Dataset SK hanya 2025. Tahun 2018 (58 kejadian) pencilan yang harus dijelaskan dulu.
- **#27 [T] Laporan Harian Gunung Api (M).**
  - *Metode:* "Data resmi PVMBG/BMKG" saja.
  - *Uji lulus:* setiap metrik bersumber PVMBG/BMKG/VAAC; tidak ada kata "Skenario".
- **#28 [T] Pop-up `sapa.js` (S).**
  - *Metode:* Jendela 24 jam dari waktu data; kartu "VA SIGMET/VAA berlaku: N".
  - *Uji lulus:* uji jam tiruan (pukul 21.00 dengan data 09.10).
- **#29 [T] Kartu `adapter.js` (S).**
  - *Metode:* Label "per pukul HH:MM WIB".
  - *Uji lulus:* berkas berumur 20 jam menghasilkan label jam, bukan "hari ini".
- **#11 [T] Model abu (M).**
  - *Metode:* VA SIGMET BMKG (`/api/data/sigmet?hazard=va`; `isigmet` sudah deprecated) dan VAA VAAC Darwin.
  - *Uji lulus:* ≥ 90% VONA Orange/Red punya SIGMET dalam 1 jam selama 30 hari.
- **#13 [T] Bandara di jalur abu (M).**
  - *Metode:* Uji titik-dalam-poligon SIGMET/VAA.
  - *Uji lulus:* episode Lewotobi Nov 2024: recall ≥ 80% terhadap advisory BMKG.
- **#14 [T] Peluang abu (M).**
  - *Metode:* Cabut dari publik.
  - *Uji lulus:* peluang arah: BSS > 0 (selang > 0) pada n ≥ 50.
  - *Koreksi:* Skema ICAO QVA memakai 0,2/2/5/10 mg/m³, jadi ambang 4 perlu ditinjau.
- **#1 [T] Sektor bahaya (M).**
  - *Metode:* Regex "sejauh( maksimal)?" ditambah pola per nama sungai; poligon sektor dari garis sungai OSM.
  - *Uji lulus:* Merapi 7 km, Semeru 17 km; ujung sektor ±0,5 km dari jarak tertulis.
- **#2 [S] Erupsi tercatat (S).**
  - *Metode:* "Jumlah gunung yang erupsi" per hari WIB.
  - *Uji lulus:* riwayat sama dengan laporan (sekarang 18 lawan 13).
  - *Koreksi:* Target kecocokan ≥ 90% dengan GVP Weekly tidak realistis.
- **#3 [T] Perubahan level (S).**
  - *Metode:* Tulis "terdeteksi pukul X WIB".
  - *Uji lulus:* median selisih dengan jam penetapan ≤ 60 menit, dan tidak ada yang > 6 jam.
- **#23 [T] Indeks risiko letusan (M).**
  - *Metode:* Hapus baris indeks; pakai tipe A/B/C Badan Geologi dan IRBI.
  - *Uji lulus:* AUC ≥ 0,75.
  - *Koreksi:* Laporan Aspinall dkk. 2011 bukan VHI Auker 2015.
- **#25 [T] Seri tahunan BNPB (S).**
  - *Metode:* Tanpa persen antartahun; 0 yang sebenarnya tidak tercatat ditulis "tidak tercatat".
  - *Uji lulus:* total 2024 sama dengan Buku Data Bencana 2024.
- **#21 [T] Evakuasi dan Pareto (S).**
  - *Metode:* Hanya tabletop bertanda air "latihan".
  - *Uji lulus:* hindcast Lewotobi galat ≤ 30%.
- **#22 [T] Pita ketidakpastian (S).**
  - *Metode:* Teks "kepekaan terhadap satu asumsi, bukan selang keyakinan".
  - *Uji lulus:* pita mencakup sebaran hasil 10 seed.
- **#18 [T] Lahar LAHARZ (L).**
  - *Metode:* Briefing memakai KRB, sektor, dan peringatan lahar resmi; model memakai Laharz_py dengan koefisien lokal.
  - *Uji lulus:* Jaccard ≥ 0,5 dan galat runout ≤ 20% (ambang usulan).
- **#19 [S] Awan panas (L).**
  - *Metode:* KRB III dan sektor; ECMapProb yang dikalibrasi.
  - *Uji lulus:* galat runout ≤ 15% dan Jaccard ≥ 0,4.
  - *Koreksi:* H/L Merapi 0,16–0,17 tidak bersumber. Rujukan pengganti: doi 10.1007/s00445-024-01768-y.
- **#20 [T] Hujan abu (L).**
  - *Metode:* Hapus kelas tebal/sedang/tipis; pakai Tephra2.
  - *Uji lulus:* hindcast Kelud 2014: ≥ 70% titik dalam faktor 2.
  - *Koreksi:* Rujuk Maeno dkk. lewat doi 10.1016/j.jvolgeores.2017.03.002.

### 4.9 banjir-rob-longsor

- **#11 [T] Status aktif nowcast (S).**
  - *Metode:* Dihitung saat dibaca dari `expires`/`valid_until`.
  - *Uji lulus:* tiga nowcast 13 Okt menghasilkan 0 aktif saat dirender 19 Okt.
- **#22 [T] Penjaga kesegaran `/api/status` (S).**
  - *Metode:* Bandingkan `hari_wib` dengan hari ini; `status.py` keluar non-nol bila data basi.
  - *Uji lulus:* meta dibuat 19 Okt dengan `hari_wib` 13 Okt dinyatakan basi.
- **#8 [T] Status rob (S).**
  - *Metode:* Ambil dari baris peringatan rob BMKG yang aktif; model SMOC turun menjadi info pendukung.
  - *Uji lulus:* pada 13 Okt, Jakarta Utara, Bekasi, dan Karawang aktif; baris 2–4 Okt tidak dihitung.
  - *Koreksi:* Siaga 1 = 254 cm (6 Des 2022) dari artikel Medcom lain. "Siaga II 201–250 cm" tidak bersumber.
- **#12 [T] Parser PDF rob (S).**
  - *Metode:* Baris aktif per tanggal, tautan PDF asli, dan gerbang jumlah baris per provinsi.
  - *Uji lulus:* dua PDF terbitan berbeda; uji batas rentang tanggal.
- **#10 [T] Laporan Harian (M).**
  - *Metode:* Lapis resmi lebih dulu, baru indikasi platform.
  - *Uji lulus (fixture):* data basi ditolak; nowcast kedaluwarsa tidak dihitung aktif; rob Jakarta Utara muncul; laporan memuat penafian dan POD/FAR.
- **#0 [S] Penyajian status banjir (S).**
  - *Metode:* CAP, IBF, dan prakiraan desa BMKG di atas; status platform hari ke-0 per kabupaten di pulau yang berskill.
  - *Uji lulus:* fixture basi ditolak; hitungan per kabupaten.
  - *Koreksi:* Maluku-Papua juga punya CI > 0, tetapi sampelnya tanpa Papua. Status darurat ditetapkan kepala daerah atau Presiden sesuai skala. Ganti artikel IBF Expose dengan artikel 23 Jun 2026.
- **#4 [S] Status Waspada (S).**
  - *Metode:* Keluarkan dari laporan, paparan, posko, dan email; ganti kategori hujan BMKG.
  - *Uji lulus:* laju alarm ≤ 5% dengan lift ≥ 3.
  - *Koreksi:* 61,08% adalah porsi luas wilayah, bukan porsi ZOM.
- **#2 [T] Penyajian longsor (S).**
  - *Metode:* Peta prakiraan gerakan tanah PVMBG bulanan per kecamatan; status harian hanya di Jawa.
  - *Uji lulus:* ≥ 90% kecamatan Siaga berada di zona menengah-tinggi PVMBG.
- **#5 [T] Kalimat vonis peluang nasional (S).**
  - *Metode:* Peluang wilayah dihitung per anggota ansambel.
  - *Uji lulus:* P(wilayah) ≥ maks P(titik); diagram keandalan setelah 90 hari.
- **#6 [T] Kelas sungai GloFAS (S).**
  - *Metode:* Tulis "sinyal sungai model belum tersedia"; tambah lapis terukur SIHKA.
  - *Uji lulus:* 20 pos dicocokkan dengan BBWS.
  - *Catatan:* SIHKA ditarik dari sihka.dev-tunnels.id, bukan domain pemerintah.
- **#14 [T] Dampak keterpaparan (S).**
  - *Metode:* InaRISK `get-infra-risk`, kelas sedang + tinggi.
  - *Uji lulus:* selisih 0 dengan portal untuk 20 kabupaten.
- **#13 [T] Kejadian banjir aktif (M).**
  - *Metode:* Gugus status diganti nama "wilayah prioritas pantau (prakiraan)"; kejadian hanya yang terkonfirmasi.
  - *Uji lulus:* presisi ≥ 90% pada 100 entri; recall ≥ 60% dalam ≤ 2 hari.
- **#20 [T] Laporan Kejadian per kabupaten (S).**
  - *Metode:* Judul "Laporan Status Prakiraan"; buang kolom "Konsesi (ha)".
  - *Uji lulus:* judul "Kejadian" hanya dengan konfirmasi bersumber.
- **#21 [T] Email warga (M).**
  - *Metode:* Pemicu dari produk resmi.
  - *Uji lulus:* uji integrasi handler: nowcast aktif → 1 email, kedaluwarsa → 0; ≤ 3 email per pelanggan per minggu.
- **#15 [T] Uji balik (M).**
  - *Metode:* Sampel 514 kabupaten atau acak berstrata; manifest sha256.
  - *Uji lulus:* dua kali jalan menghasilkan hash identik.
  - *Catatan:* Reproduksi memberi 44 kabupaten, bukan 42.
- **#16 [T] Skor risiko riwayat (S).**
  - *Metode:* IRBI banjir/longsor; tren hanya 2015–2024.
  - *Uji lulus:* 10 kabupaten sama dengan buku IRBI 2024.
  - *Catatan:* Nilai 191 kabupaten konstan; jangan sajikan sebagai tren bahaya.
- **#17 [S] Sarana dan DSP (S).**
  - *Metode:* Daftar kebutuhan tanpa rupiah; harga dari SBM, e-Katalog, atau SSH (P10–P90).
  - *Uji lulus:* rupiah hanya bila 0 item berstatus estimasi.
  - *Koreksi:* Perka 10/2008 dicabut; rujuk Perka 17/2009. Lampiran PMK 54/2026 menurut CNBC tanpa nominal. Sekarang 30 dari 51 harga masih estimasi.
- **#18 [T] CBA/SMAA (S).**
  - *Metode:* Analisis break-even dan diagram tornado.
  - *Uji lulus:* rekomendasi hanya bila terpilih di ≥ 80% kombinasi parameter berbukti.
- **#19 [S] Korelasi hutan hilang dan banjir (S).**
  - *Metode:* Hapus.
  - *Uji lulus (bila dipertahankan):* FDR ≤ 10% setelah detrending.
  - *Koreksi:* Ganti rujukan Zenodo 15366671 dengan Benjamini-Hochberg 1995.

### 4.10 cuaca-ekstrem

- **#3 [S] Kosakata status kecamatan (S).**
  - *Metode:* Cabut W/S/A dari keluaran model; ganti "indikasi model: rendah/sedang/tinggi".
  - *Uji lulus:* grep keluaran model; fixture basi ditolak.
  - *Koreksi:* Tabrakan kosakata yang nyata adalah dengan "Peringatan Dini Potensi Curah Hujan Tinggi" Stasiun Klimatologi BMKG per kecamatan, bukan dengan IBF. Batas laju API BMKG tertulis: 60 permintaan/menit/IP.
- **#34 [T] Gambar dan teks Bagikan (S).**
  - *Metode:* Hanya KPI resmi, masing-masing bersumber.
  - *Uji lulus:* setiap KPI punya field sumber; teks yang memuat angka model memuat kata "model".
- **#31 [T] Kartu provinsi "bersinyal" (S).**
  - *Metode:* Judul "N provinsi dengan peringatan BMKG aktif"; indikasi model di baris terpisah.
  - *Uji lulus:* fixture tanpa CAP dan gelombang menghasilkan "0 provinsi".
- **#10 [T] Siklon (M).**
  - *Metode:* TCWC Jakarta BMKG sebagai sumber utama.
  - *Uji lulus:* fixture 21 Okt menghasilkan CHAMPI 115 kt, Kategori 5; kata "super" tidak muncul.
- **#20 [T] Laporan Harian Cuaca (M).**
  - *Metode:* Tiga lapis.
  - *Uji lulus:* semua kode kabupaten ada di `kota.json` dengan nama yang sama (sekarang 10 dari 13 salah); metrik utama bersumber BMKG/BNPB.
- **#13 [T] Penduduk terpapar hujan ≥ 50 mm (M).**
  - *Metode:* Berbobot peluang ansambel, berupa rentang.
  - *Uji lulus:* median |ln(E_t/E_t−1)| < ln 3 selama 60 hari; run 18 Okt tidak tampil sebagai "Hari ini" pada 21 Okt.
- **#0 [S] Nowcast CAP (S).**
  - *Metode:* Jiwa dari kecamatan yang disebut.
  - *Uji lulus:* CAP Jambi menghasilkan prov ['15'].
  - *Koreksi:* areaDesc hanya berisi nama provinsi; kecamatan ada di `<description>`; tidak ada elemen onset. Kepmendagri sudah diubah 300.2.2-2430/2025.
- **#1 [T] Gelombang (S).**
  - *Metode:* Tarik tiap 1–3 jam; tampilkan `valid_from`/`valid_until`.
  - *Uji lulus:* hitungan sama dengan entri unik; status basi bila tarikan terakhir > 4 jam.
  - *Koreksi:* Ekstrem = 6–9 m. Data dikunci per wilayah; waktu lokal disertai `time_zone`.
- **#2 [S] Arsip CAP (M).**
  - *Metode:* Dua deret dari arsip lengkap; hari di luar arsip = null.
  - *Uji lulus:* 100% id CAP RSS ada di arsip selama 14 hari.
  - *Koreksi:* Arsip D1 baru ada sejak 19 Okt (commit 6b63672f).
- **#12 [T] "Ketepatan peringatan BMKG" (S).**
  - *Metode:* Keluarkan dari publik.
  - *Uji lulus (bila internal):* hanya setelah a + c ≥ 30 kejadian dari arsip lengkap.
- **#11 [T] Uji balik hujan (M).**
  - *Metode:* Pisahkan uji meteorologis dan uji dampak.
  - *Uji lulus:* FSS ≥ 0,5 + f0/2 selama 90 hari; batas bawah PSS > 0; kata "Tepat" tidak dipakai untuk POD.
- **#32 [T] Tabel peluang per provinsi (S).**
  - *Metode:* Dibangun dari `cuaca_peluang.json` pada run yang sama.
  - *Uji lulus:* 0 beda.
- **#33 [T] Deret kejadian DIBI harian (S).**
  - *Metode:* Ukur jeda pelaporan (L90).
  - *Uji lulus:* tanggal dalam jeda bernilai null; `verifikasi.py` membaca L90, bukan konstanta 14.
- **#16 [S] Kejadian tahunan BNPB (S).**
  - *Metode:* Persen hanya untuk tahun final.
  - *Uji lulus:* ±2% terhadap Buku Data.
  - *Koreksi:* 2024 sudah final (733 kejadian; total 3.472). Seri ini dari CKAN, bukan DIBI.
- **#22 [S] IRBI dan "Porsi tinggi" (S).**
  - *Metode:* Kelas IRBI 2025; buang "Porsi tinggi".
  - *Uji lulus:* 20/20 kabupaten cocok dengan portal.
  - *Koreksi:* `status_irbi_total_2025` adalah kelas total semua bahaya; tulis "kelas IRBI total (semua bahaya)".
- **#6 [T] Hujan deterministik (M).**
  - *Metode:* Judul dari prakiraan desa BMKG; satu model yang disebut namanya.
  - *Uji lulus:* FSS ≥ 0,5 + f0/2.
- **#5 [T] Embusan angin (M).**
  - *Metode:* Cabut kelas; label "embusan maksimum model (bukan pengukuran)".
  - *Uji lulus:* ≥ 90 hari terhadap METAR gust: bias frekuensi 0,7–1,5, batas bawah PSS > 0, galat median < 15%.
- **#8 [T] Gelombang model (M).**
  - *Metode:* BMKG Maritim untuk 658 pelabuhan dan wilayah perairan.
  - *Uji lulus:* bias dan korelasi selama 60 hari; kolokasi dengan altimetri CMEMS.
- **#9 [T] Status pelabuhan dan bandara (M).**
  - *Metode:* Daftar pelabuhan BMKG Maritim; kriteria BMKG dikutip harfiah dengan logika "DAN".
  - *Uji lulus:* tidak ada dua sarana sejenis dalam < 5 km (Makassar = 1 lokasi); tidak ada W/S/A.
- **#21 [T] Kejadian C#### (S).**
  - *Metode:* Kode hanya untuk peristiwa yang tercatat.
  - *Uji lulus:* tidak ada entri bersumber "model".
- **#25 [T] Simulasi medan dan siklon (S).**
  - *Metode:* Tanda air "SKENARIO FIKTIF - BUKAN PRAKIRAAN"; lintasan TCWC tanpa digeser.
- **#26 [T] Kerapuhan angin (L).**
  - *Metode:* Hapus angka rumah rusak dan pohon tumbang.
  - *Uji lulus (model empiris kelak):* LOYO lebih baik dari model nol, dan cakupan interval 80% di 70–90%.
- **#27 [T] Limpasan SCS-CN (S).**
  - *Metode:* Hapus; rujuk modul banjir.
  - *Uji lulus:* teks Asumsi sama dengan PARAM di kode.
- **#28 [T] Gelombang badai (S).**
  - *Metode:* Hapus "air naik X m"; pakai rob BMKG dan pasut BIG (butuh izin BIG).
- **#29 [T] Batas operasi kapal (S).**
  - *Metode:* Hapus status Buka/Terganggu/Tutup.
- **#30 [T] Peringkat tindakan (S).**
  - *Metode:* Hapus. Uji di `sim_dampak.js:200` dihapus bersama fiturnya, bukan dilonggarkan.

---

## 5. Yang tidak terverifikasi

Butir di bawah jangan dieksekusi begitu saja: ada yang terbukti salah, ada yang belum terkonfirmasi, dan ada yang rujukannya salah sasaran.

### 5.1 Klaim auditor yang terbukti salah atau usang

**karhutla-titik-luas-status**
- "Bias tetap per provinsi": salah. Kalsel 0,32–7,63, Kalbar 0,97–5,46.
- Perbandingan "16,6 kali BNPB" tidak sah, karena 129.899 ha hampir sama dengan luas dipadamkan.
- "BRIN membuang tambang": salah.
- "Reuters 19 Okt": tidak terkonfirmasi; yang ada hanya AFP.
- GFED5NRT "5 kelas, tabel di GitHub": yang benar 16 kelas, dan tabelnya tidak publik.

**karhutla-risiko-cuaca**
- "DC 1.000–1.276 di NTT/Papua Selatan": NTT 1.043, Papua Selatan 962; 1.276 milik Jatim.
- "Status taktis sudah diverifikasi prospektif": salah, tercatat 0/0.
- "Median FWI 23–31 sepanjang kemarau": hanya benar untuk satu hari.
- Angka 100/92/60%: milik IRI, bukan CPC.

**karhutla-model-sebaran**
- Klaim tantang "model terpasang hanya dilatih 2015–2023": SALAH. Model dilatih ulang 2015–2026 (`lolos.py:427-429`).
- "Prospektif 0 dicatat" dan "jejak_api 2.259 aktif, 0 diramal": usang. Produksi: 903 + 343 dicatat (0 dinilai); 1.516 aktif, 251 diramal.
- "ONI beku": salah untuk ONI (2,16 adalah nilai terbaru). DMI basi karena sumber PSL berhenti Mei 2026.
- "PFVI belum di situs": usang (534 sel-hari tayang; lihat 2.8).

**gunungapi**
- "paparan.py tidak dijadwalkan": salah. Sudah ada di `statis.yml:85-90` sejak commit 07825ee7, jadi usulan #7 sudah terpenuhi.
- Median kolom VONA 700 m dan 26 dari 29 di bawah 2 km, bukan 600 m dan 25 dari 29.
- "Peluang abu hari ke-2/3 = 0": salah. Ada 589 dari 735 pasangan dengan peluang di atas 0.
- Ambang 0,2/2/4 bukan "pilihan sendiri", melainkan batas UK CAA.

**gempa-tsunami**
- "Tingkat per zona dan ETA belum ada umpan publik": salah. Tersedia di `last30tsunamievent.xml`, walau bucket-nya tidak terdokumentasi dan pemakaiannya perlu izin BMKG.
- Kronologi `laporan.json` keliru. Filter dikomit di f0a91d8a pada 19 Okt 04.22 WIB, dan commit itu bukan leluhur b21ef646.

**banjir-rob-longsor**
- "Status banjir hanya di pulau dengan CI95 PSS > 0": sebagian. Maluku-Papua juga punya CI [0,034; 0,21].
- Sampel 44 kabupaten, bukan 42.
- "FAR nasional sekitar 0,97" adalah ekstrapolasi, bukan hasil uji.
- "Awal musim hujan mundur di 61% ZOM" (juga dikutip di lintas-bnpb-sosial): yang benar 61,08% luas wilayah, atau sekitar 76% ZOM.

**kekeringan**
- "34 kali terdampak tertinggi 2023": rekor terdampak adalah 2018, jadi sekitar 19 kali.
- Oldeman memakai bulan kering < 100 mm, bukan < 60 mm.
- 89 kabupaten ≤ −10, bukan 90.
- Kalimat repo "Hanya 2015 menonjol" salah karena pembandingnya keliru: POWER menangkap 1994, 1997, 2015, dan 2019.
- "dataonline menyediakan data pos harian": salah, hanya bulanan.

**cuaca-ekstrem**
- "733 kejadian 2024 adalah artefak": SALAH. Angka itu final BNPB.
- "148 dari 550 nilai peluang beda": usang. Dibangun ulang 0 beda dari 4.104 nilai.
- Kelas Ekstrem "> 6 m": yang benar 6–9 m.
- "CHIRPS jeda sekitar 2 hari": produk final berjeda sekitar 3 minggu (`SUMBER-DATA.md:106` ikut keliru).
- "Batas laju API BMKG tidak tertulis": salah, 60 permintaan/menit/IP.
- "Arsip CAP ditulis 6 jam setelah kedaluwarsa": salah, ditulis saat CAP pertama terlihat.

**udara-asap**
- "74,5 juta (83%) di kabupaten berporsi api < 50%": melingkar, jangan dipakai.
- "`kalibrasi.py` sudah ada": tidak ada.
- Koplitz 2016 tidak menjalankan skenario dengan dan tanpa api; metodenya adjoint × GFAS.

**lintas-bnpb-sosial**
- "SP menggantikan NRT dalam 48 jam": salah, SP berjeda 2–3 bulan.
- Parameter 1,5 km/72/168 jam bukan parameter FEDS.

### 5.2 Praktik resmi atau klaim yang belum terkonfirmasi (cek dulu sebelum dikutip)

**Definisi dan aturan resmi**
- Definisi resmi "Fire Spot" BNPB.
- Pernyataan bahwa Manggala Agni menyatakan padam setelah pendinginan dan pengecekan.
- Metode SiPongi "titik panas + verifikasi".
- Arti hukum Waspada/Siaga/Awas dalam status kedaruratan BNPB (dinilai tidak tepat).
- IRBI sebagai indikator RPJMN.
- Pusdalops memantau media lalu memverifikasi ke BPBD.
- "Rakor sebagai forum penetapan angka".
- Praktik Gakkum menghitung luas di konsesi.
- Pelaksana OMC (BMKG bersama BNPB/TNI).

**Produk BMKG**
- Kelas FWI "BMKG" (< 2 / < 7 / < 14 / ≥ 14) dan batas DC 140/260.
- Prakiraan FDRS 7 hari BMKG.
- Kriteria awal kemarau "diikuti dua dasarian".
- Pemetaan "Awas > 60 hari" di siaran pers BMKG 2021.
- IBF BMKG untuk banjir dan longsor.
- Praktik HYSPLIT di BMKG/ASMC.
- Bahwa KSOP/syahbandar memakai prakiraan BMKG Maritim.

**Produk lembaga lain dan internasional**
- Latensi Himawari sekitar 1 jam (hanya dari docstring).
- "Penduduk terpapar per kelas bahaya karhutla" di InaRISK, dan nama layer karhutla InaRISK.
- "ISPA" dalam daftar SKDR.
- Endpoint NOTAM yang bisa dipanen mesin.
- InaSAFE memakai model PAGER.
- Ambang JSCE 2002.
- Sitasi BC Hydro.
- Ambang ILEWS.
- "VAA paling lama tiap 6 jam".

**Regulasi**
- Perka BNPB 7/2008.
- Status berlaku Perka BNPB 15/2011.
- Nominal di lampiran PMK 54/2026.

**Lisensi**
- data.bnpb: dataset kompilasi 2024 berlisensi ODbL (license_id odc-odbl); lisensi dataset lain belum dicek.
- InaRISK, Nusantara Atlas, GEM Coal Plant Tracker, WorldPop IDN.
- Domain SiPongi `.my.id`.

**Angka dan tanggal**
- Tanggal Alert Level 3 ASMC berbeda antarverifikasi: 27 Agu (The Star, diaktifkan ASEAN Secretariat) lawan 16 Okt (verifikasi udara). Kutip halaman ASMC langsung.
- Status produksi `keputusan.py`, apakah kemiringannya sudah 0,60. Ini tidak bisa dicek dari repo.

### 5.3 Rujukan yang salah sasaran atau rusak (ganti sebelum dikutip)

**Pindah alamat**
- CAWCR (301) → `jwgfvr.github.io/forecastverification`. Dipakai di banyak modul.
- GEOS-CF v1 (sudah berhenti) → v2.
- `dapo.kemdikbud.go.id` → `dapo.kemendikdasmen.go.id`.
- NSIDC SPL4SMGP v7 (dipensiunkan) → v8.
- `isigmet` (deprecated) → `/api/data/sigmet`.

**Sudah dicabut atau salah versi**
- Perka BNPB 10/2008 (dicabut) → Perka 3/2016.
- Plucinski 2019 bagian 1 → bagian 2.
- README Himawari-8 → `README_Himawari_L2WLF.txt`.
- DOI Vs30 rilis 2020 → rilis 2026.

**URL mati (404)**
- `catalog-beta.data.gov`, CSIRO WF9980001/WF15103, `tg_select` tanpa `/docs2020/`, `gpm.nasa.gov/landslides/data.html`, `ecmwf.int/node/29629`, Met Office "acct.", PDF BMKG Feb 2024, theghub (tephra2 dan 4389), pracetak Mastin di mtu.edu, WOVO aviation colour codes, SIRUSA 82491, satudata Sulteng, `pytmd.readthedocs.io/…/predict.html`.
- `inasafe.org` tidak terjangkau.
- Dua URL tercatat 404 karena terpotong di tanda kurung, bukan karena mati: panduan hotspot BRIN dan Hamed & Rao.

**Isinya tidak mendukung klaim yang dirujuk**
- Zenodo 15366671 (banjir #19).
- Artikel IBF Expose 2026 (soal banjir/longsor).
- Medcom 2023 (soal Siaga II/Siaga 1).
- metrotvnews (516 ZOM) → idxchannel.
- Aspinall GFDRR (bukan VHI Auker).
- CIFOR WP-26 (FREL-2016 justru mengecualikan api gambut).
- IOC sealevel monitoring (untuk evakuasi).
- Alfieri 2014 (bukan kriteria 30%/RP5).
- `bn1777-2016` dikutip sebagai Perka 10/2008.
- SIHKA dari domain `dev-tunnels.id`.

### 5.4 Konflik antarmodul yang harus diputuskan pemilik

- **Kejadian gunung api.** Modul lintas-bnpb-sosial memberi vonis layak (status diteruskan apa adanya). Modul gunungapi memberi tidak layak (27 "kejadian aktif" semuanya bertanggal mulai 19 Okt, dijumlahkan ke /semua). Usulan gunung api #4 dan #5 terverifikasi. Pakai status, jangan dihitung sebagai kejadian.
- **ENSO/IOD.** Modul kekeringan memberi layak; modul karhutla-risiko-cuaca memberi layak dengan catatan, karena label "IOD positif" berasal dari rata-rata 8 minggu. Ikuti yang lebih ketat.
- **Outlook gempa.** Modul lintas memberi layak karena layar membuang kata "dangkal". Modul gempa memberi layak dengan catatan dan mencatat label JSON-nya salah. Perbaiki di `outlook12.py`.
- **"±2,2 juta ha".** Di modul lintas, tahap tantang menurunkan vonis dari tidak layak ke layak dengan catatan dengan bukti belum terverifikasi; `vonis_dicek` mengukuhkan layak dengan catatan untuk metodenya sebagai perkiraan berlabel, tetapi menyatakan penyajian di Paparan 20 Okt tetap tidak layak. Modul titik-luas memberi layak dengan catatan untuk perkiraan nasional (`keputusan[3]`) dan tidak layak untuk grafik serta klaim peringkat (`keputusan[9]`). Usul keputusan: angkanya boleh sebagai perkiraan berlabel dengan rentang; peringkat luas tidak boleh.
- **PFVI "Peluang api besok ±X%".** Modul risiko-cuaca memberi tidak layak (tambahan AUC +0,018, belum dikalibrasi, latih dan uji di tahun kering). Modul model-sebaran memberi layak dengan catatan (angka AUC 0,783/0,767/0,801 benar; tampil sebagai kelas). Keduanya sepakat persen tidak boleh tampil sebelum diuji di tahun basah. Ikuti yang lebih ketat untuk layar pimpinan.

---

## 6. Catatan metode audit

**Tahap 1: telaah.** Penelaah menginventaris 281 metode di 10 modul. Setiap metode diberi vonis, alasan, risiko di depan Presiden, dan perbaikan.

**Tahap 2: tantang.** Penelaah kedua yang sengaja adversarial dan hanya membaca (read-only) membuka bukti, menghitung ulang angka, dan menjalankan ulang fungsi (node, `python3 -I`).
- Hasilnya: 20 vonis diubah, dan 48 metode yang terlewat ditambahkan (28 di antaranya tidak layak).
- Ada 6 keputusan berlabel bukti_terverifikasi = false. Semuanya dicek ulang di tahap verifikasi.

**Tahap 3: alternatif.** Penelaah meriset 322 usulan metode yang lebih tepat (166 P1, 105 P2, 51 P3). Setiap usulan memuat praktik resmi Indonesia, data yang dibutuhkan, upaya, cara uji, dan rujukan.

**Tahap 4: verifikasi.** Sepuluh pemeriksa, satu per modul; kesepuluh berkas `verif-*.json` tersimpan di `mentah/`:
- memeriksa 272 usulan (semua P1 dan P2, ditambah 1 P3): 158 terverifikasi, 114 sebagian;
- memeriksa 60 klaim utama: 49 benar, 10 sebagian, 1 salah;
- membuka rujukan lewat web;
- mengecek angka produksi di pantau.terasurban.com untuk beberapa berkas.

**Tahap 5: pemeriksaan ringkasan.** Pemeriksa adversarial membaca draf ringkasan ini terhadap berkas mentah (`mentah/kritik-ringkasan.json`) dan menemukan 25 koreksi serta 12 butir berisiko tinggi yang terlewat. Semuanya sudah dimasukkan ke versi ini, kecuali yang dicatat di Catatan penyuntingan.

Cek tautan otomatis (`status-tautan.tsv`) mencakup 370 URL:

| Status HTTP | Jumlah |
|---|---|
| 200 | 329 |
| 404 | 17 |
| 403 | 15 |
| URLError | 3 |
| 401 | 2 |
| 307, 422, 500, 503 | masing-masing 1 |

Status 403 sering berarti situs memblokir bot, bukan tautan mati.

**Batasan**

1. *Sifat audit.* Audit hanya membaca dan memakai snapshot lokal. Beberapa berkas di git lebih tua dari produksi, karena `titik.yml` mendeploy tanpa commit (contoh `prospektif.json`, `jejak_api.json`, `fwi.json`). Status produksi `keputusan.py` tidak bisa dicek.
2. *Akses situs resmi.* Banyak situs .go.id memblokir bot (403, Sucuri 307, Incapsula), sehingga sebagian praktik resmi hanya terkonfirmasi lewat sumber sekunder atau hasil pencarian.
3. *Ambang lulus.* Banyak ambang lulus di Bagian 4 adalah usulan auditor, bukan standar lembaga. Ambang itu perlu disepakati dengan BMKG atau BNPB sebelum dipakai sebagai gerbang.
4. *Rekap di HASIL.md.* `docs/audit-metode/2026-10-21/HASIL.md` menulis 17 layak, 147 layak dengan catatan, dan 165 tidak layak. Bedanya karena `susun.py` memakai vonis telaah bila nama metode berbeda antartahap. Ada 75 nama yang tidak cocok di 7 modul. Angka di ringkasan ini dihitung langsung dari vonis_akhir tantang ditambah metode_terlewat.
5. *Penilaian ganda.* Beberapa metode dinilai di dua modul, misalnya deck BNPB 21 Okt, kejadian gunung api, dan outlook 12 bulan. Jadi 329 adalah jumlah entri penilaian, bukan jumlah metode unik.
6. *P3 dan independensi.* Usulan P3 hampir tidak diverifikasi (1 dari 51). Semua penelaah dan pemeriksa adalah agen AI. "Terverifikasi" berarti dicek ulang ke berkas atau sumber oleh agen lain, bukan disahkan oleh lembaga.
7. *Folder yang belum di-commit.* `data/laporan-bnpb/satelit-2026-10-21/` dan `docs/audit-metode/` belum masuk git.
8. *Nomor baris.* Nomor baris mengikuti snapshot audit. Beberapa berkas layar sedang berubah di working tree, jadi nomornya bisa bergeser beberapa baris (contoh kalimat "tidak teramati tidak sama dengan padam": `index.html:5308` di snapshot, :5309 di HEAD, :5310 di working tree). Nomor di `src/worker.js` dan `public/ringkasan.js` sudah dicocokkan ke HEAD.

---

## Catatan penyuntingan

Penerapan `kritik-ringkasan.json`: 21 koreksi diterapkan penuh, 3 diterapkan sebagian, 1 tidak berlaku lagi; 12 butir terlewat dimasukkan. Yang menyimpang dari teks kritik:

1. **Koreksi S-NPP (2 Nov).** Kritik menulis "halaman FIRMS menyebut 2 Nov" tidak ada di berkas audit mana pun. Kalimat itu ada di `verif-karhutla-titik-luas-status.json` (usulan indeks 0, koreksi). Jadi keduanya disimpan: tanggal dan jam dari pengumuman Earthdata (sumbernya hanya pemeriksa ringkasan), dan catatan 2 Nov dari verifikator titik-luas.
2. **Koreksi TAF (TEMPO 0800).** Kritik menulis "TEMPO 0800" tidak ada di berkas audit. Teks itu ada di `verif-udara-asap.json` (rujukan_bermasalah, TAF terbitan 211100Z: "WIPP 2500 FU (TEMPO 0800)"). Dipertahankan. Bagian Singkawang dan NOTAM dari koreksi yang sama diterapkan.
3. **Koreksi nomor baris.** Ambang pE ≥ 0,3 ada di `public/ringkasan.js:114` di HEAD (diperiksa dengan `git grep`), bukan :113 seperti tulisan kritik; tingkatnya ditetapkan di :116. `periksaPeringatan()` di `src/worker.js:694` sesuai kritik. Untuk `/api/status`, rentang dipersempit ke fungsi yang membaca "dibuat": `dibuatAset()` dan `umurSumber()` di :443-457.
4. **Koreksi berkas verifikasi hilang.** Tidak berlaku lagi: kesepuluh `verif-*.json` kini ada di `mentah/`. Hitungan T/S udara-asap (9/8) dan lintas-bnpb-sosial (3/14) serta klaim utamanya dicocokkan ulang dari berkas, dan hasilnya sama dengan draf.
5. **Koreksi 2019 bukan El Niño.** Teks perbaikan kritik dipakai karena didukung `verif-karhutla-risiko-cuaca.json`. Kalimat di bagian "masalah" kritik bahwa ONI mencatat El Niño lemah di awal 2019 tidak ditemukan di berkas mentah, jadi tidak dipakai.
6. **Koreksi rob.** `verif-banjir-rob-longsor.json` sendiri tidak seragam: usulan indeks 8 menulis "10–20 per hari pada 10–18 Okt", sedangkan klaim_utama memberi rincian per tanggal. Yang dipakai rincian klaim_utama, sesuai kritik.
7. **Butir terlewat hektare harian.** Kritik menulis "Kalteng 12 Okt 20.085 ha dari 8.022 titik". Angka 8.022 adalah jumlah titik semua sensor hari itu (HASIL.md), sedangkan 20.085 ha berasal dari titik S-NPP × 4,3. Frasa "dari 8.022 titik" tidak dipakai.
8. **Hitungan ulang** (skrip `python3 -I` baca-saja atas `mentah/`): vonis 14 / 150 / 165 dari 329 entri (281 keputusan + 48 metode terlewat, 28 di antaranya tidak layak; 20 vonis berubah; 6 bukti belum terverifikasi); usulan 322 (166 / 105 / 51); verifikasi 272 usulan, 158 terverifikasi dan 114 sebagian (P1 100/66, P2 58/47, P3 0/1); klaim utama 49 / 10 / 1; tautan 370 URL dengan 17 berstatus 404. Semua angka di draf cocok; yang berubah hanya cara menulis rincian P1+P2.
