# PRD: Direktori Lembaga Mitra dan Analisa Kemitraan (/akademisi)

Disusun 30 Okt 2026. Status: rencana, belum dibangun. Urutan kerja ada di `TIKET.md` di folder yang sama.

## 1. Latar

/akademisi sudah menjawab "siapa pakarnya". Saat bencana terjadi, BNPB juga butuh menjawab:

- siapa yang bisa digerakkan,
- siapa yang bisa mendanai,
- siapa yang sudah bekerja di wilayah itu,
- nomor siapa yang harus ditelepon.

Hari ini jawabannya tersebar di grup WA, ingatan staf, dan berkas Excel lama. Direktori ini mengumpulkan lembaga mitra dari sumber publik ke satu tempat, lengkap dengan kontak bersumber, lalu menganalisanya terhadap risiko dan kejadian.

## 2. Pengguna

| Pengguna | Kebutuhan |
| --- | --- |
| Pusdalops dan Deputi Penanganan Darurat | lembaga terdekat yang bisa digerakkan dan nomor kontaknya, saat kejadian |
| Deputi Pencegahan, Direktorat Kemitraan | peta mitra, kesenjangan wilayah, bahan MoU |
| Deputi Rehab-Rekon | donor dan lembaga yang mendanai pemulihan |
| Pimpinan dan staf ahli | ringkasan riset dan kemitraan per bencana per daerah untuk keputusan |

Akses hanya untuk staf BNPB dan admin, memakai gerbang yang sama dengan /akademisi (`stafOK`).

## 3. Lingkup

### 3.1 Kategori lembaga

Kategori 1 sampai 6 diminta pemilik. Kategori 7 sampai 12 adalah usulan tambahan.

| No | Kategori | Contoh | Skala |
| --- | --- | --- | --- |
| 1 | Kerelawanan | PMI (pusat, provinsi, kab/kota), Tagana, MDMC, LPBI NU, Wahana Visi, YEU, Tzu Chi, SAR MTA, MER-C, BSMI, relawan terdaftar BNPB | nasional dan daerah |
| 2 | Donasi dan filantropi | BAZNAS dan LAZ berizin, Dompet Dhuafa, Rumah Zakat, Filantropi Indonesia, platform donasi (Kitabisa, BenihBaik), pemegang izin PUB Kemensos | nasional dan daerah |
| 3 | Pemerintah penanggulangan bencana | BPBD provinsi dan kab/kota, kantor SAR Basarnas, UPT BMKG, pos pengamatan PVMBG, Daops Manggala Agni, Tagana dinsos | daerah |
| 4 | Jejaring dan forum PRB | Planas PRB, Forum PRB provinsi dan kab/kota, MPBI, HFI, IABI, Konsorsium Pendidikan Bencana, FPT PRB | nasional dan daerah |
| 5 | Internasional di Indonesia | UN OCHA, UNDP, UNICEF, WFP, IOM, WHO, UNFPA, FAO, UNDRR, IFRC, ICRC, INGO (Save the Children, Plan, Oxfam, Mercy Corps, CARE, Islamic Relief, CRS, Habitat, HI, MSF) | internasional |
| 6 | Mitra internasional (donor dan kerja sama) | AHA Centre, sekretariat ASEAN, JICA, KOICA, DFAT, GIZ, KfW, Bank Dunia, ADB, AIIB, IsDB, kedutaan yang punya program kebencanaan | internasional |
| 7 | Keagamaan | badan bencana NU, Muhammadiyah, KWI (Caritas), PGI, Walubi, PHDI, Matakin, MUI | nasional dan daerah |
| 8 | Dunia usaha | Kadin, APINDO, forum CSR, BUMN logistik dan transportasi (Bulog, Pelni, ASDP, Pos Indonesia, InJourney), operator seluler | nasional |
| 9 | Komunikasi darurat dan media | ORARI, RAPI, RRI, JRKI (radio komunitas), TVRI | nasional dan daerah |
| 10 | Asosiasi profesi | IAGI, HAGI, IABI, HATHI, PII, IAI, IDI, IAKMI, HIMPSI, IAP, PERSAGI | nasional |
| 11 | Kesehatan darurat | Kemenkes PKK (Pusat Krisis Kesehatan), regional PKK, EMT terdaftar, PERSI | nasional dan regional |
| 12 | Lembaga riset non-kampus | pusat riset kebencanaan BRIN, BIG, LAPAN-BRIN, BMKG litbang | nasional |

| 13 | Pemilik sensor dan inovasi (permintaan pemilik 30 Okt) | BRIN (eks LAPAN: stasiun bumi satelit, radar; buoy tsunami), BMKG (InaTEWS, AWS, radar cuaca), BIG (InaCORS, stasiun pasut), PVMBG (seismometer gunung api), BBWS/Ditjen SDA (telemetri hujan dan muka air), Pushidrosal, kampus pembuat EWS (contohnya EWS longsor UGM), perusahaan drone dan IoT, startup kebencanaan (PetaBencana.id dan sejenisnya) | nasional dan daerah |

Kategori 8 (dunia usaha) diperluas ke **swasta yang berpotensi membantu** (permintaan pemilik 30 Okt). Sub-kategorinya:

- logistik dan kurir;
- alat berat;
- penerbangan perintis dan helikopter;
- pelayaran;
- ritel;
- telekomunikasi;
- transportasi daring dan dompet digital;
- e-commerce;
- air minum dan makanan;
- farmasi;
- konstruksi;
- tambang dengan tim tanggap darurat;
- perkebunan dan kehutanan dengan regu pemadam (relevan karhutla);
- perbankan dan asuransi;
- energi.

Field `potensi_bantuan`: larik `{teks, kejadian, tahun, sumber_url}`, berisi rekam jejak bantuan yang pernah diberikan ("menyalurkan alat berat untuk longsor X 2024") atau kapasitas yang tertulis resmi (armada, gudang, regu). Tanpa sumber, butir itu tidak ditulis. Penilaian baik atau buruk tidak dibuat. Untuk perusahaan perkebunan dan kehutanan, tampil apa adanya dari sumber.

Kategori 13 bernama `inovasi` untuk startup dan pembuat produk. Lembaga pemerintah atau riset yang memiliki sensor tetap memakai kategorinya sendiri, ditambah field `sensor`.

Rumah sakit, sekolah, dan desa tangguh (Destana) TIDAK masuk. Jumlahnya puluhan ribu, dan sudah ada sistem induknya sendiri.

### 3.2 Fitur

| Kode | Fitur | Asal permintaan |
| --- | --- | --- |
| F1 | Tab **Lembaga**: daftar, cari, saring kategori, provinsi, skala, dan bidang kegiatan | 1, 2, 3, 7 |
| F2 | Kartu lembaga dengan kontak bersumber: telepon, WA, email, situs, alamat, medsos, pimpinan publik | 8 |
| F3 | Panen data publik selengkap mungkin, tiap butir membawa tautan sumber dan tanggal periksa | 9 |
| F4 | **Analisa kemitraan**: sebaran lembaga per provinsi di atas indeks risiko, kesenjangan wilayah, bidang yang kosong | "tambah analisa" |
| F5 | **Lembaga terdekat** di pop-up kejadian, berdampingan dengan pakar terdekat yang sudah ada | 1, usulan |
| F6 | **Siapa mendanai apa di mana** (3W): proyek donor dan INGO per provinsi dari IATI dan HDX | 7, usulan |
| F7 | **Ringkasan kebijakan per bencana per daerah** dari riset di tab Riset daerah | no 4 sebelumnya |
| F8 | **Inventaris aset riset**: laboratorium dan alat BRIN (ELSA) dan kampus, ditambah isian mandiri | no 5 sebelumnya |
| F9 | Daftar pendek dan unduh lembaga, memakai daftar pendek yang sudah ada | usulan |
| F10 | Hak koreksi, tombol dummy, dan pemutakhiran bulanan | standar pemilik |

### 3.3 Di luar lingkup

- Penilaian kinerja atau peringkat lembaga. Direktori menampilkan fakta bersumber, bukan nilai.
- Kontak pribadi yang tidak tercantum di laman resmi lembaga atau profil profesional pemiliknya.
- Integrasi kirim pesan (WA blast, email massal) dari layar ini.
- Penghimpunan donasi. Layar ini hanya menunjuk lembaga dan status izinnya.

## 4. Model data

Satu berkas R2 `akademisi/lembaga.json` berisi larik objek. Data ini TIDAK masuk repo maupun `public/`, karena repo publik.

```json
{
  "id": "pmi-prov-riau",
  "nama": "Palang Merah Indonesia Provinsi Riau",
  "singkatan": "PMI Riau",
  "kategori": "kerelawanan",
  "sub": "palang merah",
  "skala": "provinsi",
  "induk": "pmi-pusat",
  "prov": "14",
  "kab": "Kota Pekanbaru",
  "alamat": "Jl. ...",
  "lat": 0.51, "lon": 101.44, "lokasi_sumber": "alamat|kota|provinsi",
  "web": "https://...",
  "email": ["..."],
  "telepon": ["+62761..."],
  "wa": ["+628..."],
  "medsos": {"instagram": "...", "x": "...", "facebook": "...", "youtube": "..."},
  "pimpinan": {"nama": "...", "jabatan": "Ketua", "sumber_url": "https://..."},
  "bidang": ["tanggap darurat", "kesehatan", "logistik"],
  "rumpun": ["banjir", "karhutla"],
  "izin": {"jenis": "LAZ|PUB|ormas|yayasan", "nomor": "...", "berlaku_sampai": "2027-...", "sumber_url": "https://..."},
  "mitra_bnpb": {"bukti": "MoU ...", "tahun": 2024, "sumber_url": "https://..."},
  "sumber": [{"butir": "telepon", "url": "https://...", "diperiksa": "2026-10-30"}],
  "diperiksa": "2026-10-30"
}
```

Aturan isi:

- `kategori` diambil dari 12 nilai tetap pada §3.1, ditulis huruf kecil dengan tanda hubung: `kerelawanan`, `donasi`, `pemerintah`, `jejaring`, `internasional`, `mitra-internasional`, `keagamaan`, `dunia-usaha`, `komunikasi`, `profesi`, `kesehatan`, `riset`. Ditambah `penerbit` (penerbit jurnal swasta), yang hanya muncul sebagai rumah jurnal dan tidak tampil sebagai chip.
- `prov` adalah kode BPS dua angka, sama dengan peta `PROV` di `public/akademisi.js`. Lembaga nasional dan internasional ditulis `null`.
- `bidang` diambil dari daftar tetap: tanggap darurat, SAR, logistik, kesehatan, psikososial, air dan sanitasi, hunian, pangan, pendidikan, perlindungan, rehab-rekon, PRB dan kesiapsiagaan, pendanaan, komunikasi, data dan pemetaan, riset.
- `bidang` dan `rumpun` hanya diisi bila laman lembaganya menyebutnya. Tidak boleh ditebak dari nama.
- **Tiap kontak wajib punya entri di `sumber`.** Kontak tanpa sumber dibuang saat validasi. Nomor yang tidak tertera di laman tidak boleh dikarang.
- Telepon dinormalkan ke format E.164 (`+62...`). Tampilan di layar memakai format Indonesia.
- Lembaga yang izinnya dicabut tetap disimpan dengan `izin.status = "dicabut"` dan pil merah di layar, supaya staf tidak tertipu. Contohnya ACT, yang izin PUB-nya dicabut Kemensos pada 2022.

Field tambahan untuk kategori 13:

- `sensor`: larik `{jenis, jumlah, cakupan, data_terbuka: bool, portal_url, sumber_url}`. Contohnya seismometer, akselerograf, AWS, ARR, AWLR, radar cuaca, buoy, pasut, GNSS/CORS, stasiun bumi satelit, kamera CCTV gunung api, dan sensor kualitas udara.
- `inovasi_produk`: larik `{nama, uraian, rumpun, tahun, sumber_url}`.

Berkas pendamping, juga di R2:

| Kunci | Isi | Fitur |
| --- | --- | --- |
| `akademisi/lembaga.json` | daftar induk lembaga | F1, F2, F5, F9 |
| `akademisi/lembaga_3w.json` | proyek per donor/pelaksana per provinsi: judul, sektor, nilai, tahun, sumber IATI/HDX | F6 |
| `akademisi/sensor.json` | titik stasiun sensor `{id, nama, jenis, pemilik (id lembaga), jaringan, lat, lon, status, sumber_url}`, hanya dari sumber terbuka (IOC Sea Level Monitoring, FDSN station service seperti GEOFON dan IRIS, daftar stasiun resmi yang terbuka) | lapisan peta "Jaringan sensor" |
| `akademisi/aset_riset.json` | lab dan alat: nama, pemilik, jenis, lokasi, layanan, kontak layanan, sumber | F8 |
| `akademisi/ringkasan/<rumpun>-<prov>.json` | cache ringkasan kebijakan yang sudah dibuat | F7 |

## 5. Sumber dan cara panen

Prinsip panen sama dengan /akademisi (keputusan 28 Okt):

- pelan dan sopan, dengan jeda antar permintaan;
- User-Agent jujur;
- tanpa menembus CAPTCHA atau anti-bot. Diblokir berarti berhenti dan lapor.

Hasil mentah disimpan di luar repo.

| Kategori | Sumber utama | Catatan |
| --- | --- | --- |
| BPBD | laman BNPB (daftar BPBD), laman resmi pemda dan BPBD, Satu Data | 38 provinsi dan sekitar 500 kab/kota. Kontak pusdalops 24 jam diprioritaskan. |
| Basarnas | basarnas.go.id, daftar kantor SAR | sekitar 44 kantor |
| BMKG, PVMBG | laman UPT BMKG, MAGMA (pos pengamatan) | |
| Manggala Agni | laman KLHK dan sipongi | Daops per provinsi rawan karhutla |
| PMI | pmi.or.id dan laman PMI provinsi | |
| BAZNAS dan LAZ | daftar LAZ berizin di baznas.go.id (SK dan masa berlaku) | sumber status izin |
| Izin PUB | laman resmi Kemensos | bila tidak ada daftar terbuka, cukup ditandai "belum diperiksa" |
| Jejaring dan forum | Planas PRB, HFI, MPBI, IABI, FPT PRB, laman forum PRB daerah | |
| UN dan INGO | ReliefWeb API (organisasi yang melapor tentang Indonesia), HDX 3W Indonesia, laman kantor negara | ReliefWeb dan HDX punya API terbuka |
| Donor dan proyek (3W) | IATI Datastore (proyek aktif `recipient_country=ID`), HDX | sumber F6 |
| AHA Centre, ASEAN | ahacentre.org, asean.org | |
| Keagamaan, profesi, dunia usaha, komunikasi | laman resmi tiap lembaga | daftar awalnya disusun tangan, sekitar 60 lembaga nasional, lalu ditambah cabang daerah yang tercantum |
| Wikidata | kueri SPARQL organisasi kemanusiaan dan LSM di Indonesia | untuk menambal situs dan koordinat, bukan sumber kontak |
| Aset riset | ELSA BRIN (katalog layanan lab publik), laman lab kampus dari data pusat studi | |
| Pimpinan | laman "tentang kami" atau "struktur" lembaga | hanya nama dan jabatan, dengan tanggal periksa |

Perkiraan hasil: 1.500 sampai 3.000 lembaga, setelah cabang daerah PMI, BPBD, Basarnas, BMKG, dan Baznas dihitung. Angka pastinya baru diketahui setelah panen.

## 6. Layar

Tab baru **Lembaga** di pengalih tampilan /akademisi, ditaruh setelah Pakar. Tab Pengadaan kajian disembunyikan sejak 30 Okt.

### 6.1 Daftar (F1, F2)

- Saringan, mengikuti komponen yang sudah ada (`htmlPilih`, `pasangPilih`, chip rumpun):
  - cari nama, singkatan, atau kota;
  - provinsi;
  - kategori, sebagai chip berangka seperti rumpun di tab Pakar;
  - skala (nasional, provinsi, kab/kota, internasional);
  - bidang.
- Judul hasil: "**1.234** lembaga ..." dengan angka di depan.
- Kartu lembaga:
  - logo bila ada, nama, singkatan, pil kategori, dan kota;
  - pil bidang;
  - baris kontak (telepon, WA, email, situs) dengan ikon, masing-masing berlabel dan bisa diklik `tel:`/`mailto:`/`https://wa.me/`;
  - tautan "Sumber" per butir;
  - tanggal periksa;
  - pil izin (berlaku, habis, dicabut) dan pil "Mitra BNPB" bila ada bukti.
- Klik kartu membuka dialog profil: semua kontak dan sumbernya, pimpinan, cabang di bawah induk, proyek 3W, jurnal kebencanaan terbitannya, dan kejadian yang pernah ditangani (bila ada bukti).
- Jurnal tidak lagi punya tab sendiri (keputusan 30 Okt). Jurnal tampil di profil kampus atau lembaga penerbitnya. 58 dari 77 jurnal sudah tampil di profil kampus. 19 sisanya ikut masuk profil lembaga begitu direktori ini ada: IAGI, HAGI, AHA Centre, Ditjen SDA PU, BSI KLHK, dan penerbit swasta di kategori baru `penerbit`.
- Teks dibuat rata kiri-kanan (justified), tanpa tanda titik tengah.

### 6.1a Peta berlogo (F11, permintaan pemilik 30 Okt, rujukan 1001startup.id/map)

Peta adalah tampilan pertama tab Lembaga. Daftar tetap ada sebagai sub-tampilan kedua. Isinya meniru bagian yang relevan dari rujukan, dengan sistem desain Centurisk97 (kepala navy, token warna situs, Inter, pil). Bukan gaya monospace hitam-putih rujukan.

1. **Pin berlogo.** Tiap lembaga, kampus, dan pusat studi tampil sebagai lingkaran putih berisi logonya dengan label nama di sampingnya.
   - Bila berdesakan, yang terbesar (cabang terbanyak, kontak terlengkap, skala nasional) tampil berlogo. Sisanya menjadi titik kecil yang membuka logonya saat diperbesar (decluttering per zoom).
   - Lembaga tanpa logo memakai lingkaran inisial berwarna kategori.
   - Lapisan bisa dinyalakan atau dimatikan: Lembaga mitra (per kategori), Kampus (logo SINTA yang sudah ada), Pusat studi.
2. **Pita wilayah di atas peta**: "Indonesia 1.234", lalu provinsi dengan lembaga terbanyak (misalnya "DKI Jakarta 210", "Jawa Timur 95"), masing-masing dengan angkanya. Klik pita akan terbang ke wilayah itu. Pita terakhir adalah tombol "Terbanyak per kab/kota" yang membuka mode choropleth.
3. **Mode choropleth "Lembaga di tiap kab/kota".** Panel kiri berisi:
   - judul dan kalimat penjelas;
   - pilihan pulau (Sumatera, Jawa-Bali, Kalimantan, Sulawesi, Nusa Tenggara, Maluku-Papua);
   - pilihan tingkat (provinsi atau kab/kota);
   - pilihan ukuran (jumlah lembaga, lembaga berkontak, mitra per juta penduduk, kesenjangan terhadap indeks risiko);
   - legenda bertingkat;
   - kalimat cakupan, misalnya "**134** dari 514 kab/kota punya minimal satu lembaga mitra";
   - daftar peringkat wilayah dengan logo lembaga terbesarnya.

   Peta mewarnai wilayah menurut ukuran dan memasang logo lembaga terbesar di tiap wilayah. Hover memunculkan tooltip.
4. **Panel profil di kanan saat pin diklik.** Isinya:
   - tombol Tutup, logo besar, dan nama;
   - pil kategori, provinsi, dan "#n dari N" (peringkat kelengkapan);
   - deskripsi otomatis bersumber ("Menurut laman resmi yang diperiksa 30 Okt 2026, ...");
   - tombol "Kunjungi situs" dan "Tambah ke daftar pendek";
   - bagian berlabel: PIMPINAN, KONTAK (telepon, WA, email, tiap butir dengan tautan sumbernya), IZIN, BIDANG, CABANG, PROYEK MITRA (3W), JURNAL, LOKASI (kab/kota), KANTOR (alamat lengkap dan tautan peta), DIPERIKSA.

   Untuk kampus, panel memakai `profilKampus` yang sudah ada.
5. Kendali zoom, tombol lokasi, dan atribusi "© OpenStreetMap, batas wilayah BIG".

Logo lembaga: field `logo` adalah URL ikon resmi dari situs lembaga itu sendiri (apple-touch-icon, ikon `<link rel=icon>` terbesar, atau og:image persegi), diambil saat penggabungan (tiket L23). Logo tidak diunggah ulang. Tampilnya memakai `referrerpolicy="no-referrer"` seperti logo kampus.

### 6.2 Analisa (F4)

Sub-tampilan "Analisa" di tab Lembaga:

1. **Peta sebaran**: peta provinsi berwarna menurut indeks risiko (`scripts/bnpb/risiko.py`, keluaran `risiko_kecamatan` dirata-ratakan per provinsi), dengan titik lembaga. Tooltip saat hover wajib ada.
2. **Kesenjangan wilayah**: tabel provinsi berisiko tinggi yang lembaganya sedikit per juta penduduk. Diberi pil "rawan, mitra sedikit" bila di bawah ambang. Ambangnya ditulis di layar.
3. **Kesenjangan bidang**: matriks provinsi x bidang yang menunjukkan bidang kosong. Contohnya provinsi tanpa satu pun lembaga psikososial.
4. **Komposisi**: jumlah per kategori dan per skala, dengan grafik batang interaktif.
5. Semua angka analisa menyebut sumber dan tanggal data.

### 6.3 Lembaga terdekat di pop-up kejadian (F5)

Di pop-up situasi yang sekarang menampilkan pakar terdekat, ditambah blok "Lembaga terdekat". Isinya 6 lembaga diurutkan menurut jarak, dengan pilihan kategori (BPBD, SAR, PMI, kerelawanan, donasi). Rutenya `GET /api/akademisi/lembaga/terdekat?lat&lon&kategori&n`, dengan pola dan batas yang sama seperti `/api/akademisi/terdekat`.

### 6.4 3W, siapa mendanai apa di mana (F6)

Sub-tampilan "Proyek mitra" berisi tabel proyek aktif per provinsi: donor, pelaksana, sektor, nilai (USD dan Rp dengan kurs tertulis), dan tahun. Datanya bisa disaring provinsi, donor, dan sektor. Label "data dilaporkan donor ke IATI, bisa tidak lengkap" wajib tampil.

### 6.5 Ringkasan kebijakan (F7)

Di tab Riset daerah ditambah tombol "Ringkas temuan" setelah memilih rumpun dan provinsi.

- Worker mengambil 30 riset teratas (sitasi dan kebaruan) beserta abstraknya, lalu memanggil Workers AI dengan pola `riset()` yang sudah ada.
- Keluarannya 5 sampai 7 temuan kunci, tiap temuan bertaut ke karyanya, ditambah 3 implikasi untuk penanggulangan bencana.
- Hasil di-cache di R2 per rumpun dan provinsi selama 30 hari.
- Label "ringkasan otomatis dari abstrak, periksa karya aslinya" wajib tampil.
- Larangan: angka atau tempat yang tidak tertulis di abstrak.

### 6.6 Aset riset (F8)

Sub-tampilan "Aset riset" di tab Pusat studi berisi daftar lab dan alat yang bisa dipakai saat darurat: drone, radar, seismograf, lab tanah, lab air, superkomputer, dan wahana.

- Saringan: jenis, provinsi, dan pemilik.
- Sumber publik: ELSA BRIN dan laman lab kampus.
- Kekurangannya ditutup dengan formulir isian mandiri di /pendataan, satu target unit baru "Aset riset kampus". Isian mandiri ditandai "dilaporkan sendiri".

### 6.7 Direktori riset dan inovasi kebencanaan (F12, permintaan pemilik 30 Okt)

Tab baru **Inovasi**, berisi teknologi dan inovasi kebencanaan yang sudah ada di Indonesia, baik buatan dalam negeri maupun luar negeri yang sudah diterapkan di Indonesia.

- **Ringkasan di atas**: jumlah inovasi per rumpun, per jenis teknologi, dan per tingkat kesiapan; grafik interaktif dengan tooltip; peta lokasi uji dan penerapan.
- **Kartu inovasi**: nama, ringkasan 2 sampai 3 kalimat, jenis teknologi, rumpun, pembuat (bertaut ke profil lembaga atau kampus), tahun, status (purwarupa, uji lapangan, terpasang, dikomersialkan, berhenti), lokasi uji atau penerapan (bisa diklik ke peta), mitra pendana, paten, dan sumber per butir.
- **Saringan**: rumpun, jenis teknologi, status, provinsi penerapan, dan pembuat (kampus, BRIN, pemerintah, swasta, startup).
- **Peta**: titik lokasi penerapan berwarna per status. Klik membuka kartu inovasinya.

Data di R2 `akademisi/inovasi.json`:

```json
{"id": "...", "nama": "...", "ringkasan": "...", "jenis": "sensor|EWS|aplikasi|model/AI|drone|satelit|material|alat|sistem informasi|lainnya",
 "rumpun": ["longsor"], "pembuat": [{"nama": "...", "lembaga_id": "...|null", "jenis": "kampus|BRIN|pemerintah|swasta|startup|internasional"}],
 "tahun": 2019, "status": "purwarupa|uji lapangan|terpasang|dikomersialkan|berhenti", "trl": null,
 "penerapan": [{"lokasi": "Kab. Banjarnegara", "prov": "33", "lat": -7.4, "lon": 109.7, "tahun": 2020, "keterangan": "...", "sumber_url": "..."}],
 "mitra": ["..."], "paten": [{"nomor": "...", "sumber_url": "..."}], "web": "...", "sumber": [{"butir": "...", "url": "..."}], "diperiksa": "2026-10-30"}
```

Lokasi penerapan hanya diisi bila tertulis di sumber. Klaim kinerja ("akurasi 95%") hanya dikutip bila sumbernya menyebut, dan ditandai "klaim pembuat".

### 6.8 Direktori sistem dan sumber data kebencanaan (F13, permintaan pemilik 30 Okt)

Tab baru **Sistem data** menjawab "data dan sensor apa saja yang dimiliki lembaga lain, dan mana yang bisa kita ambil". Contohnya SIPALAGA BRGM (tinggi muka air gambut), SiPongi, MAGMA, Data Online BMKG, InaTEWS, SIH3 dan telemetri BBWS, Ina-Geoportal BIG, InaCORS, DIBI, InaRISK, Satu Data, portal satelit BRIN, PetaBencana, serta data global yang menjangkau Indonesia (FIRMS, GDACS, Copernicus).

- **Kartu sistem**:
  - nama, pemilik (bertaut ke profil lembaga);
  - jenis data, sensor di baliknya, cakupan wilayah, rentang waktu, frekuensi pembaruan;
  - **akses** (terbuka tanpa login, API terbuka, API berkunci gratis, login, permohonan resmi/surat, tertutup), format, lisensi;
  - URL portal, URL API atau unduhan bila ada, dan cara meminta data;
  - status hidup (dicek HTTP pada tanggal periksa);
  - pil **"Sudah dipakai Pantau Bencana"** bila domainnya muncul di pipeline repo.
- **Ringkasan di atas**: jumlah sistem per akses, per rumpun, dan per pemilik, serta daftar "bisa langsung diambil, belum kita pakai" sebagai bahan kerja data berikutnya.
- **Saringan**: rumpun, akses, pemilik, jenis data, sudah/belum dipakai.

Data di R2 `akademisi/sistem_data.json`:

```json
{"id": "sipalaga-brgm", "nama": "SIPALAGA", "kepanjangan": "...", "pemilik": "BRGM", "lembaga_id": "...|null", "uraian": "...",
 "jenis_data": ["tinggi muka air gambut"], "sensor": ["TMAT logger"], "rumpun": ["karhutla"], "cakupan": "...", "rentang": "2017-sekarang",
 "frekuensi": "per jam", "akses": "terbuka|api-terbuka|api-kunci|login|permohonan|tertutup", "format": ["JSON", "CSV"], "lisensi": "...",
 "portal_url": "...", "api_url": "...", "cara_minta": "...", "status": "hidup|mati|tak terjangkau", "dipakai_pantau": true,
 "sumber": [{"butir": "...", "url": "..."}], "diperiksa": "2026-10-30"}
```

Akses diuji hanya dengan membuka halaman atau endpoint publik. Tidak ada login, kunci, atau CAPTCHA yang ditembus.

### 6.9 Profil wilayah (F14, pilihan pemilik 30 Okt)

Tab **Wilayah**: ketik kab/kota atau provinsi, lalu satu halaman memuat:

- ringkasan risiko dan kejadian;
- BPBD dan nomornya, ditaruh paling atas;
- lembaga di wilayah itu dan yang terdekat;
- pakar dan tokoh;
- sensor yang terpasang (titik di dalam poligon kab);
- inovasi yang pernah diterapkan;
- proyek donor;
- sistem data yang mencakupnya;
- anggaran (`akademisi/wilayah_anggaran.json`, dari DJPK, pemda, dan BNPB);
- dokumen.

Tiap bagian menyebut sumbernya, dan bagian yang kosong bilang terus terang. Alamatnya bisa dibagikan: `/direktori?tampil=wilayah&wilayah=<kode>`.

### 6.10 Pustaka dokumen (F15, pilihan pemilik 30 Okt)

Tab **Pustaka** menampilkan `akademisi/dokumen.json`: regulasi (dari katalog JDIH repo), KRB, RPB, renkon, R3P, Jitupasna, laporan kejadian, kajian, SOP, dan rencana aksi. Tiap dokumen bertaut ke wilayah dan lembaga penerbitnya. Saringan: jenis, wilayah, tahun, rumpun, dan cari judul.

### 6.11 Pilih bencana (F16, permintaan pemilik 30 Okt)

Bilah chip bencana berlaku di semua tab. Untuk lembaga dipakai rumpun turunan beralasan (field rumpun, jenis sensor, peta tetap sub-lembaga, inovasi, sistem data). Hasilnya dua kelompok: "Khusus <bencana>" dengan pil alasan, lalu "Lintas bencana".

### 6.12 Tokoh publik dan kontak lengkap (F17, permintaan pemilik 30 Okt)

Tab Pakar dibagi dua: **Akademisi** dan **Tokoh publik** (`akademisi/tokoh.json`), mencakup pejabat dan mantan pejabat, praktisi, aktivis, relawan, tokoh agama dan adat, jurnalis, serta komunikator.

**Kontak semua lembaga dan orang**: situs, email, telepon, WA, LinkedIn, Instagram, TikTok, X, Facebook, dan YouTube.

- Aturannya sama dengan keputusan 28 Okt: hanya yang tercantum publik di laman resmi lembaga, profil profesional pemiliknya (ORCID, SINTA, laman kampus), atau akun resmi terverifikasi. Tiap butir membawa sumbernya.
- Alamat rumah, keluarga, dan data sensitif tidak pernah diambil.
- LinkedIn hanya disimpan sebagai URL profil yang tertaut dari sumber resmi atau hasil pencarian. Isinya tidak dipanen.

### 6.13 Berita (F18, permintaan pemilik 30 Okt)

Tab **Berita** berisi berita tentang lembaga, orang, dan inovasi di direktori, bukan berita kejadian bencananya. Berita juga tampil di profil masing-masing.

Data di R2 `akademisi/berita.json`:

```json
{"id": "...", "judul": "...", "tanggal": "2026-10-12", "media": "Kompas", "url": "...", "ringkas": "1 kalimat tulisan sendiri",
 "kategori": "kerja sama|bantuan dan respons|peluncuran inovasi|uji dan penerapan|pendanaan dan hibah|penghargaan|penunjukan jabatan|kebijakan|riset dan publikasi|hukum dan izin|lainnya",
 "entitas": [{"jenis": "lembaga|pakar|tokoh|inovasi", "id": "..."}], "rumpun": ["..."], "sumber": "Google News RSS|GDELT|laman lembaga", "diperiksa": "2026-10-30"}
```

- Saringan: kategori, jenis entitas, rumpun, rentang tanggal, dan media.
- Tampilan meniru halaman berita 1001startup.id: kartu tanggal, kategori, dan judul, dengan ringkas dan logo entitas di sampingnya.
- Judul dan URL milik media. Ringkas satu kalimat ditulis sendiri, tidak menyalin isi berita.

### 6.14 Pendanaan: pinjaman, hibah G2G, dan dana riset (F19, permintaan pemilik 30 Okt)

Tab **Pendanaan** menjawab dua pertanyaan: dana apa yang bisa dicari, dan dana apa yang sudah mengalir ke kebencanaan Indonesia.

1. **Skema** (`jenis_entri: "skema"`): program pendanaan yang bisa dilamar atau dirundingkan.
   - Pinjaman multilateral dan bilateral: Bank Dunia (IPF, DPO dengan Cat-DDO), ADB, AIIB, IsDB, JICA ODA loan, KfW.
   - Hibah antarpemerintah (G2G): GIZ/BMZ, DFAT, KOICA, MFAT, FCDO, SDC, USAID (status), Uni Eropa, Jepang Grant Aid.
   - Dana global: GCF, GEF, Adaptation Fund, CREWS, GFDRR.
   - Instrumen domestik: Pooling Fund Bencana, Dana Siap Pakai, hibah rehab-rekon, DAK, asuransi BMN.
   - Dana riset: LPDP RISPRO, BRIN RIIM dan Rumah Program, hibah Kemendiktisaintek, Kedaireka, Newton Fund, JSPS dan JST SATREPS, ACIAR, NERC/UKRI, Belmont Forum, IDRC.

   Isinya: pemberi, jenis, sasaran (pemerintah, pemda, kampus, LSM, swasta), besaran tipikal, siklus atau tenggat, syarat utama, cara mengajukan, kontak, URL resmi, dan contoh penerima di Indonesia.
2. **Proyek** (`jenis_entri: "proyek"`): pinjaman dan hibah kebencanaan yang sudah ditandatangani untuk Indonesia.
   - Sumbernya API proyek Bank Dunia, daftar proyek ADB, AIIB, dan JICA, ditambah tautan ke proyek 3W (IATI).
   - Isinya: nama, pemberi, peminjam atau penerima, pelaksana (BNPB, PUPR, BMKG, pemda), nilai dan mata uang, tahun tanda tangan dan penutupan, status, lokasi (provinsi), rumpun, dan dokumen.

Skema di R2 `akademisi/pendanaan.json`:

```json
{"id": "...", "jenis_entri": "skema|proyek", "nama": "...", "pemberi": "...", "lembaga_id": "...|null", "jenis": "pinjaman|hibah G2G|hibah multilateral|dana iklim|dana riset|instrumen domestik|asuransi risiko",
 "sasaran": ["pemerintah pusat"], "nilai": 0, "mata_uang": "USD", "nilai_usd": 0, "tahun": 2024, "selesai": 2029, "status": "...",
 "penerima": "...", "pelaksana": ["..."], "prov": ["..."], "rumpun": ["..."], "syarat": "...", "cara": "...", "tenggat": "...",
 "kontak": {"email": [], "telepon": []}, "url": "...", "sumber": [{"butir": "...", "url": "..."}], "diperiksa": "2026-10-30"}
```

Layar:

- ringkasan nilai per pemberi dan per jenis (grafik bertooltip);
- saringan jenis, pemberi, sasaran, status, rumpun, dan provinsi;
- kartu skema dengan tombol "Cara mengajukan";
- tabel proyek;
- tautan ke profil lembaga pemberi;
- bagian "Pendanaan" di profil wilayah.

### 6.15 Profil lengkap orang dan lembaga (F20, permintaan pemilik 30 Okt, rujukan profil 1001startup.id)

Panel profil kanan meniru susunan profil 1001startup.id: kepala, ringkasan bersumber, baris berlabel (label di kiri, nilai, cip domain sumber, dan catatan di kanan), bagian bergaris judul, keyakinan, sumber, dan pembanding. Sistem desainnya Centurisk97. Hanya bagian yang relevan untuk kebencanaan yang dipakai.

**Lembaga**, berurutan:

1. **Kepala**: logo, nama, nama badan hukum (PT, Yayasan, Perkumpulan, atau instansi), dan pil kategori, sub, dan provinsi.
   - Ada pil "#n dari N" (peringkat kelengkapan di kategorinya).
   - Ringkasan otomatis: "Menurut Direktori Kebencanaan (diperbarui 30 Okt 2026), X didirikan pada ..., dipimpin ..., berkantor di ..., bergerak di ...". Hanya dari field bersumber.
   - Tombol: Kunjungi situs, Daftar pendek, dan Laporkan koreksi.
2. **Baris berlabel**: PIMPINAN, DIDIRIKAN, BADAN HUKUM DAN IZIN, SDM (jumlah pegawai atau relawan bila tertulis, dengan tanggal baca), KAPASITAS (armada, gudang, regu, sensor), WILAYAH KERJA, dan KONTAK (telepon, WA, email, situs, LinkedIn, medsos). Tiap baris punya cip domain sumber.
3. **JARINGAN** (padanan "supply chain"): dimiliki atau induk (dan cabang), anggota dari (forum/jejaring), MITRA, PENDANA (siapa mendanai lembaga ini, dari 3W dan pendanaan), dan PENERIMA (siapa yang didanai atau dibantu). Tiap tautan punya pil jenis bukti (RESMI, IATI, BERITA, PIHAK KETIGA), domain, dan tanggal.
4. **REKAM JEJAK BENCANA**: `potensi_bantuan` dan kejadian yang ditangani. Butir yang dicocokkan otomatis dari judul berita diberi label begitu.
5. Bagian khusus bila ada: SENSOR, INOVASI, SISTEM DATA, PROYEK, PENDANAAN, dan JURNAL.
6. **KANTOR PUSAT**: alamat lengkap dan tautan peta.
7. **BERITA TERKAIT**.
8. **SEBERAPA YAKIN KITA**: skor 0 sampai 1 dengan bilah dan label tinggi, sedang, atau rendah, dihitung di penggabung (field `yakin` `{skor, label, alasan[]}`). Komponennya:
   - porsi butir bersumber laman resmi (dibanding pihak ketiga atau pengetahuan model);
   - kelengkapan (kontak, pimpinan, alamat, lokasi);
   - kesegaran tanggal periksa;
   - status situs ("situs menolak pemeriksa, bukan bukti tutup").

   Alasannya ditulis dalam kalimat.
9. **SUMBER**: semua URL unik, berupa domain tebal dan URL utuh.
10. **SEBANDING**: lembaga sekategori dan seprovinsi, diurutkan menurut kelengkapan.

**Orang** (akademisi dan tokoh), berurutan:

1. **Kepala**: foto, nama bergelar, peran kini, dan pil jenis, rumpun, dan provinsi, ditambah ringkasan bersumber.
2. **Baris**: PERAN KINI, LEMBAGA (tautan ke profil), KEAHLIAN DAN RUMPUN, PENDIDIKAN, RIWAYAT JABATAN, METRIK (h-index, sitasi, SINTA, khusus akademisi), dan KONTAK (email, telepon kantor, LinkedIn, medsos).
3. **KIPRAH KEBENCANAAN**: tim kajian, respons, dan penghargaan, bersumber.
4. Karya teratas (akademisi), berita terkait, seberapa yakin, sumber, dan pakar/tokoh sebanding.

Field tambahan lembaga: `badan_hukum`, `didirikan`, `sdm` `{jumlah, jenis, tanggal, sumber_url}`, `kapasitas` `[{teks, sumber_url}]`, `jaringan` `[{relasi: induk|cabang|anggota|mitra|pendana|penerima, ke_id|ke_nama, bukti: resmi|iati|berita|pihak-ketiga, sumber_url, tanggal}]`, dan `yakin`.

### 6.16 Paket pilihan pemilik 30 Okt (rekomendasi 8, 9, 12, 14, 15, 16, 17, 19)

| Fitur | Tempat di layar | Berkas R2 | Isi pokok |
| --- | --- | --- | --- |
| Penyedia barang darurat | Tab Lembaga, kategori baru `penyedia` | `akademisi/penyedia.json` | Vendor tenda, perahu karet, genset, logistik, dan alat. Sumbernya katalog elektronik dan pemenang tender LPSE BNPB/BPBD yang terbuka. Isinya nama, NPWP tidak disimpan, produk, nilai kontrak, instansi pembeli, tahun, kontak, dan sumber. |
| Kalender | Tab baru **Kalender** | `akademisi/kalender.json` | Tenggat hibah dan pinjaman (dari pendanaan), pelatihan Pusdiklat, simulasi dan HKB 26 April, rakornas, dan konferensi (AMCDRR, Global Platform, PIT IABI). Format `{id, judul, jenis, mulai, selesai, tempat, penyelenggara, url, sumber}`, ditampilkan sebagai kalender bulanan dan daftar dengan saringan. |
| Graf hubungan | Tab baru **Jaringan** | `akademisi/graf.json` (dibangun penggabung) | Simpul orang, lembaga, inovasi, dana, buku, dan wilayah. Sisinya: bekerja di, anggota, induk, mendanai, membuat, diterapkan di, menulis, dan muncul bersama di berita (dengan bobot). Isinya graf gaya, simpul kunci (derajat dan keterantaraan), cari simpul, saring jenis sisi, dan klik yang membuka profil. |
| Paten dan TRL | Tab Inovasi | field `paten`, `trl`, `trl_dasar` di `inovasi.json` | Paten dari PDKI bila bisa dibuka tanpa login. TRL hanya dikutip bila sumber menyebutnya. Bila tidak, ditampilkan "perkiraan TRL" dari status (purwarupa 4 sampai 6, uji lapangan 6 sampai 7, terpasang 8 sampai 9) dengan label perkiraan. Ada saringan "Siap dipasang" (TRL 7 ke atas). |
| Pelatih dan asesor | Tab Pakar, segmen ketiga **Pelatih** | `akademisi/pelatih.json` | Asesor kompetensi PB (BNSP dan LSP PB), pelatih Pusdiklat PB, SKKNI PB yang berlaku, dan LSP serta TUK PB, berikut skema sertifikasi, wilayah, dan kontak resmi. |
| Tim respons internasional | Tab Pendanaan, sub **Respons internasional**, atau tab Lembaga kategori internasional | `akademisi/respons_internasional.json` | Tim USAR INSARAG terklasifikasi (negara, tingkat, kontak resmi), mekanisme AADMER, AHA Centre, ERAT, dan SASOP, perjanjian bilateral kebencanaan Indonesia (dari basis data perjanjian Kemlu), serta prosedur permintaan bantuan internasional (Perka/Peraturan BNPB). |
| Media dan kanal komunikasi risiko | Tab Lembaga kategori `komunikasi` diperluas, ditambah tokoh jenis jurnalis | `akademisi/media.json` | Media nasional dan daerah (desk bencana), stasiun RRI dan TVRI, radio komunitas (JRKI), akun resmi BPBD dan BMKG, serta wartawan desk bencana (nama, media, profil publik profesional, dan contoh liputan bersumber). |
| Pemutakhiran bulanan | Admin, plus pil "diperbarui" di kartu | `akademisi/pemutakhiran/<yyyy-mm>.json` | Workflow bulanan: cek situs hidup, rayap ulang kontak, berita baru, dan lembaga baru. Laporan perubahan memuat berapa kontak berubah dan situs yang mati. Skrip ada di `scripts/akademisi/` tanpa data, dan hasilnya langsung ke R2. |

Aset dan infrastruktur (gudang, alat berat, RS rujukan, bandara, pelabuhan, helipad) masuk **peta utama**, bukan Direktori (keputusan menunggu konfirmasi pemilik 30 Okt). Direktori hanya menautkan profil lembaga ke asetnya.

## 7. API

Semua rute hanya untuk staf (`stafOK`) dan tidak membaca D1, untuk menjaga kuota baca D1 Free yang pernah menjatuhkan situs pada 28 Okt.

| Rute | Isi |
| --- | --- |
| `GET /api/akademisi/data/lembaga` | tambah `lembaga`, `lembaga_3w`, `aset_riset` ke `DATA_AKADEMISI` |
| `GET /api/akademisi/lembaga/terdekat` | F5, dengan validasi `lat`, `lon`, `kategori`, dan `n` seperti `terdekat` |
| `POST /api/akademisi/ringkasan` | F7, body `{rumpun, prov}`, dengan batas laju per sesi dan cache R2 |

## 8. Keamanan dan privasi

- Data lembaga hanya ada di R2 dan dibaca lewat sesi staf. Tidak ada di repo, `public/`, atau log prompt.
- Kontak lembaga (nomor kantor, email resmi) bukan data pribadi. Nomor HP perorangan hanya diambil bila tertera sebagai kontak resmi lembaga di laman lembaga itu sendiri, dan tetap disertai sumber.
- Nama pimpinan disimpan bersama jabatan dan tanggal periksa, tanpa data pribadi lain.
- Hak koreksi: tombol "Laporkan data salah" di kartu, memakai jalur hak koreksi /akademisi.
- Semua teks dari luar di-escape (`esc`), dan URL disaring `urlOk` sebelum masuk `href`.

## 9. Standar pemilik yang wajib

- Tombol isi data dummy (DUMMY.md): dua ikon, Super Admin saja, isinya mengikuti tab yang sedang dibuka (Lembaga, Analisa, Proyek mitra, Aset riset).
- Klik tidak membekukan layar (INP.md): chrome kontrol urgent, daftar dan peta deferred lewat `nanti()`.
- Uji integrasi yang benar-benar menjalankan rute (TEST.md): 401 tanpa sesi, 400 untuk input salah, data valid untuk staf.
- Kepala situs navy bersama dan token Centurisk97.
- Angka format Indonesia, angka kunci di depan, tanpa tanda titik tengah, dan grafik interaktif dengan tooltip.

## 10. Ukuran keberhasilan

- Ada minimal 1 lembaga pemerintah penanggulangan bencana (BPBD) dengan telepon bersumber di tiap 38 provinsi.
- Minimal 80% lembaga punya minimal satu kontak bersumber.
- Lembaga terdekat muncul di pop-up kejadian dalam kurang dari 1 detik.
- Pemeriksaan acak 30 kontak: nol nomor tanpa sumber, dan minimal 90% sesuai laman sumbernya pada hari periksa.

## 11. Risiko

| Risiko | Mitigasi |
| --- | --- |
| Kontak cepat basi | `diperiksa` per butir, pemutakhiran bulanan, dan pil "diperiksa > 6 bulan lalu" |
| Situs pemda lambat, mati, atau berbeda bentuk | panen dicicil, dan cakupan per provinsi ditampilkan jujur |
| Agen panen mengarang nomor | validator menolak kontak tanpa sumber, ditambah cek acak yang membuka ulang laman sumber |
| Lembaga bermasalah (izin dicabut) tampil sebagai mitra | sumber status izin (BAZNAS, Kemensos) ditampilkan, pil merah "izin dicabut" |
| Data 3W IATI tidak lengkap | label keterbatasan wajib, tidak dipakai untuk menilai lembaga |
| Ringkasan AI mengarang | hanya dari abstrak, tiap temuan bertaut karya, label "ringkasan otomatis" |

## 12. Keputusan terbuka untuk pemilik

1. Nomor HP pengurus yang tertulis di laman resmi lembaga ikut ditampilkan? Usulan: ya, berlabel "kontak tercantum", sama seperti keputusan 28 Okt untuk pakar.
2. Kategori 7 sampai 12 (usulan) ikut semua di gelombang pertama? Usulan: ya. Panennya murah karena daftar nasionalnya pendek.
3. Ambang "rawan, mitra sedikit" di analisa? Usulan: kuartil bawah lembaga per juta penduduk di antara provinsi berisiko tinggi, ditulis di layar.
4. Aset riset lewat isian mandiri di /pendataan perlu Fase 2 /pendataan (Turnstile)? Usulan: pakai jalur Fase 1 dulu.
