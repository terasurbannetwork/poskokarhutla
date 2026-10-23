# A. Desk Research Dokumen Resmi BNPB dan Regulasi Kebencanaan

Bahan untuk *Kajian Mitigasi Bencana di Wilayah Indonesia* (Kepala BNPB, Oktober 2026).
Disusun 23 Oktober 2026. Semua tanggal akses adalah **23 Okt 2026** kecuali disebut lain.

**Kode keandalan**

- **[TERVERIFIKASI]**: dibaca langsung dari sumber primer, yaitu teks peraturan (korpus JDIH BNPB yang terunduh di repo, `data/raw/hukum/teks/*.json`), API resmi BNPB (InaRISK apiv4, DIBI, data.bnpb.go.id), atau halaman pemerintah.
- **[SEKUNDER]**: berasal dari berita, ringkasan pihak ketiga, atau kutipan dokumen yang tidak dibuka sendiri.
- **[TIDAK DITEMUKAN]**: sudah dicari, tetapi sumbernya tidak ketemu.
- **[DIHITUNG]**: diolah sendiri dari data primer. Cara hitungnya ditulis di tempat.

Singkatan sumber primer yang sering dipakai:

- **RENAS 25-29** = Peraturan BNPB No. 1/2025 tentang Rencana Nasional PB 2025–2029, BN 2025 (6), 126 hlm.: https://jdih.bnpb.go.id/storage/file/2025pbbnpb001.pdf
- **RENSTRA 25-29** = Peraturan BNPB No. 5/2025 tentang Renstra BNPB 2025–2029, BN 2025 (768), 202 hlm.: https://jdih.bnpb.go.id/storage/file/2025pbbnpb005.pdf
- **API-IRBI** = https://inarisk.bnpb.go.id/apiv4/data-irbi-full (NDJSON, 5.654 baris, 514 kab/kota × 2015–2025)
- **API-KRB** = https://inarisk.bnpb.go.id/apiv4/kajian-summary/{bahaya}/ALL?level=nasional
- **CKAN-BNPB** = https://data.bnpb.go.id/dataset/data-bencana-indonesia (datastore; metadata diubah 16 Apr 2026)
- **DIBI** = https://dibi.bnpb.go.id (Superset, dasbor publik 1; ditarik lewat `POST /api/v1/chart/data` seperti `scripts/banjir/kejadian.py`)

---

## 1. Indeks Risiko Bencana Indonesia (IRBI) dan Kajian Risiko Bencana (KRB/RBI)

### 1.1 Metodologi

| Butir | Isi | Sumber | Status |
|---|---|---|---|
| Komponen | Indeks dihitung dari **bahaya, kerentanan, dan kapasitas**. Bahaya yang dihitung: gempa bumi, tsunami, letusan gunung api, tanah longsor, banjir, kekeringan, karhutla, cuaca ekstrem, dan abrasi (9 bahaya). | RENSTRA 25-29, hlm. 5 | [TERVERIFIKASI] |
| Kolom data per kab/kota | `banjir, longsor, karlahut, kekeringan, gempabumi, tsunami, gunungapi, abrasi, cuaca_ekstrem, total, status` | API-IRBI | [TERVERIFIKASI] |
| Rumus R = H × V / C | Rumus ini ada di Lampiran Perka BNPB 2/2012. Lampiran itu **tidak** ada di korpus lokal (yang terunduh hanya batang tubuh, 3 halaman). | Perka 2/2012: https://bnpb.go.id/storage/app/media/uploads/24/peraturan-kepala/2012/perka-2-tahun-2012.pdf | [SEKUNDER] untuk rumusnya. Dasar hukum Perka 2/2012 sendiri [TERVERIFIKASI]: Pasal 36 UU 24/2007 jo. Pasal 6 PP 21/2008. |
| Fungsi IRBI | "untuk mengukur capaian penurunan indeks risiko bencana di tingkat kabupaten/kota dan provinsi". Target penurunan 1,2%/tahun "didasarkan pada hasil capaian Indonesia ... pada Kerangka Kerja Sendai". | RENSTRA 25-29, hlm. 85 | [TERVERIFIKASI] |
| Kapasitas: IKD | Indeks Ketahanan Daerah memuat "7 prioritas, 71 indikator, dan 284 pertanyaan". | RENSTRA 25-29, hlm. 85 | [TERVERIFIKASI] |
| Ambang kelas IKD | rendah 0,01–0,39; sedang 0,40–0,79; tinggi 0,80–1,00 | dokumen kinerja BPBD Luwu Timur (e-ppid.luwutimurkab.go.id) | [SEKUNDER] |
| Ambang kelas IRBI (skala 2015–2024) | Tinggi > 144. Ambang ini disimpulkan sendiri: menghitung jumlah kab/kota > 144 dari API-IRBI 2023 menghasilkan **168**, sama persis dengan angka RENAS. | API-IRBI dan RENAS 25-29 | [DIHITUNG] |
| Ambang kelas IRBI 2025 (skala baru) | Di data 2025, nilai Tinggi terendah 176,14 dan Sedang tertinggi 175,68, jadi ambangnya sekitar **176**. Skripsi 2026 yang mengutip BNPB juga menyebut rendah < 14,67, sedang 14,67–176, tinggi > 176. | API-IRBI (kolom `status`); skripsi [SEKUNDER] | [DIHITUNG] / [SEKUNDER] |

**Peringatan metodologis (penting):** skala IRBI 2025 **berbeda** dari 2015–2024. Rata-rata kab/kota naik dari 128,52 (2024) ke 147,95 (2025), dan nilai maksimum naik dari 214,8 ke 278,5 [DIHITUNG dari API-IRBI]. Karena itu angka 2025 **tidak boleh** dibandingkan langsung dengan seri lama. Catatan yang sama ada di `scripts/cuaca/risiko_bnpb.py` baris 13–14.

### 1.2 Skor nasional dan tren

| Tahun | Rata-rata IRB nasional (API-IRBI, rata-rata 514 kab/kota) [DIHITUNG] | Target Renstra 2020–2024 | Capaian resmi (RENSTRA 25-29 Tabel 1.6) [TERVERIFIKASI] | Kab/kota > 144 (Tinggi, skala lama) [DIHITUNG] |
|---|---:|---:|---:|---:|
| 2015 | 155,28 | – | – | 330 |
| 2016 | 149,62 | – | – | 290 |
| 2017 | 147,91 | – | – | 276 |
| 2018 | 145,03 | – | – | 259 |
| 2019 | 143,25 | – | baseline 144,02 | 249 |
| 2020 | 140,96 | 141,14 | 141,65 | 229 |
| 2021 | 138,81 | 138,26 | 138,81 | 221 |
| 2022 | 135,56 | 135,38 | 135,56 | 192 |
| 2023 | 132,25 | 132,50 | 132,25 | 168 |
| 2024 | 128,52 | 129,62 | 128,52 | 151 |
| 2025 (skala baru) | 147,95 | – | – | **169 Tinggi / 345 Sedang** (kolom `status` resmi) |

- RENSTRA 25-29 hlm. 52: IRB 2020–2024 turun **10,76% atau 15,5 poin** dari baseline 2019 sebesar 144,02, sehingga target turun 10% dalam 5 tahun "telah tercapai". [TERVERIFIKASI]
- RENAS 25-29 hlm. 18: IRB rata-rata nasional 2023 = **132,25**. [TERVERIFIKASI]
- **Selisih yang perlu dicatat:** angka 2019–2020 dari API (143,25 dan 140,96) tidak sama dengan baseline dan capaian resmi (144,02 dan 141,65). Untuk 2021–2024 angkanya identik. Kemungkinan data 2019–2020 di API sudah dimutakhirkan belakangan, tetapi ini belum dikonfirmasi.
- Kenaikan rata-rata 2025 ke 147,95 adalah **efek perubahan skala, bukan risiko yang naik** (lihat peringatan di 1.1).

### 1.3 Kelas risiko per provinsi (IRBI)

RENAS 25-29 hlm. 19 [TERVERIFIKASI]:

- **2023: 13 provinsi Tinggi dan 25 Sedang.** Tiga provinsi tertinggi adalah Sulawesi Barat, Maluku, dan Kepulauan Bangka Belitung. Tiga provinsi terendah di kelas Sedang adalah DKI Jakarta, Papua Pegunungan, dan DIY.
- **Kab/kota 2023: 168 Tinggi dan 346 Sedang.** Lima tertinggi: Mandailing Natal, Halmahera Selatan, Nias Utara, Nias, dan Maluku Barat Daya. Lima terendah: Jakarta Selatan, Surakarta, Sigi, Kepulauan Seribu, dan Mamberamo Tengah.
- Catatan [DIHITUNG]: 346 = 333 (72–144) + 13 (≤ 72). Artinya BNPB tidak memakai kelas "Rendah" untuk kab/kota.

Indeks dan kelas per provinsi 2019–2023 (RENSTRA 25-29 Tabel 1.1, sumber aslinya "Buku Indeks Risiko Bencana Indonesia 2019-2023") [TERVERIFIKASI]:

| Provinsi | 2019 | 2023 | Kelas 2023 |
|---|---:|---:|---|
| Sulawesi Barat | 166,49 | 160,08 | Tinggi |
| Maluku | 160,35 | 160,03 | Tinggi |
| Kep. Bangka Belitung | 161,54 | 155,61 | Tinggi |
| Sulawesi Tenggara | 157,72 | 153,08 | Tinggi |
| Bengkulu | 162,00 | 148,75 | Tinggi |
| Maluku Utara | 145,63 | 148,71 | Tinggi |
| Papua Barat Daya | – | 148,44 | Tinggi |
| Kalimantan Utara | 153,62 | 148,16 | Tinggi |
| Aceh | 157,56 | 146,90 | Tinggi |
| Papua Barat | 144,05 | 145,76 | Tinggi |
| Sulawesi Selatan | 159,49 | 144,47 | Tinggi |
| Kalimantan Timur | 154,79 | 144,43 | Tinggi |
| Sumatera Barat | 150,24 | 144,38 | Tinggi |
| Sumatera Utara | 145,18 | 140,65 | Sedang |
| Sulawesi Tengah | 144,96 | 140,56 | Sedang |
| Papua | 122,90 | 138,59 | Sedang |
| Papua Selatan | – | 138,20 | Sedang |
| Riau | 147,27 | 137,75 | Sedang |
| Jambi | 138,64 | 135,69 | Sedang |
| Lampung | 146,78 | 135,66 | Sedang |
| NTT | 140,89 | 132,81 | Sedang |
| Banten | 169,74 | 132,21 | Sedang |
| Sumatera Selatan | 139,62 | 131,34 | Sedang |
| Kalimantan Selatan | 145,37 | 129,44 | Sedang |
| Sulawesi Utara | 139,47 | 128,01 | Sedang |
| Jawa Barat | 150,46 | 123,16 | Sedang |
| Kalimantan Barat | 138,49 | 123,16 | Sedang |
| Kalimantan Tengah | 132,70 | 121,72 | Sedang |
| Bali | 134,98 | 120,10 | Sedang |
| Jawa Timur | 143,07 | 118,61 | Sedang |
| Gorontalo | 126,64 | 116,71 | Sedang |
| Papua Tengah | – | 116,49 | Sedang |
| NTB | 128,05 | 115,37 | Sedang |
| Jawa Tengah | 144,91 | 109,01 | Sedang |
| DIY | 140,92 | 108,15 | Sedang |
| Kepulauan Riau | 116,40 | 107,79 | Sedang |
| Papua Pegunungan | – | 102,05 | Sedang |
| DKI Jakarta | 65,74 | 61,31 | Sedang |

Jumlah kelas Tinggi di tabel 2023 ini 13 provinsi, cocok dengan RENAS. RENSTRA juga menyebut 8 provinsi turun kelas antara 2019 dan 2023 (hlm. 6).

IRBI 2024 per provinsi: buku *IRBI Tahun 2024* (BNPB, Jan 2025, ISSN 2985-6922) disebut dalam hasil pencarian, tetapi PDF-nya tidak dibuka. Contoh angka: Kaltim 136,11 (Sedang) menurut Kontan. → [SEKUNDER]. Tabel provinsi 2024 dari buku itu: [TIDAK DITEMUKAN].

### 1.4 Kajian Risiko Bencana Indonesia 2022–2026 (penerus RBI)

Seluruh angka di bawah dari RENAS 25-29 Tabel 2.1–2.7 (hlm. 20–25), sumber aslinya "Kajian Risiko Bencana Tahun 2022-2026". Angka nasional per bahaya juga cocok dengan API-KRB yang ditarik hari ini. [TERVERIFIKASI]

- Luas bahaya multibahaya **192.473.073 ha**, dengan **125.736.462 ha (65,32%) di kelas tinggi**. Seluruh 34 provinsi lama berkelas bahaya Tinggi.
- Potensi penduduk terpapar multibahaya **271.130.365 jiwa**, termasuk 28.208.985 kelompok umur rentan, 27.413.330 miskin, dan 957.980 penyandang disabilitas.
- Potensi kerugian fisik + ekonomi multibahaya **Rp4.082.564.437 juta (≈ Rp4.083 triliun)**: fisik Rp2.356,6 T dan ekonomi Rp1.725,9 T. Potensi kerusakan lingkungan 51.261.652 ha.
- Kelas risiko multibahaya: **semua provinsi Tinggi kecuali DKI Jakarta (Rendah)**. Kapasitas Jawa Tengah Tinggi. Kapasitas Babel, Kalsel, dan Papua Barat Rendah. Provinsi lainnya Sedang.

Profil per jenis bahaya:

| Bahaya | Luas bahaya total (ha) | Luas kelas tinggi (ha) | Penduduk terpapar (jiwa) | Potensi kerugian fisik+ekonomi (juta Rp) | Kerusakan lingkungan (ha) |
|---|---:|---:|---:|---:|---:|
| Gempa bumi | 192.473.068 | 30.745.445 | 272.405.410 | 1.111.318.267 | – |
| Tsunami | 1.746.893 | 740.906 | 5.341.282 | 42.978.422 | 29.943 |
| Letusan gunung api | 1.577.032 | 189.193 | 5.864.711 | 12.048.691 | 193.541 |
| Banjir | 51.256.529 | 25.846.638 | 113.829.496 | 1.006.919.180 | 4.225.236 |
| Banjir bandang | 5.058.235 | 2.924.409 | 15.391.846 | 147.673.335 | 57.079 |
| Kekeringan | 192.473.075 | 30.002.272 | 272.564.439 | 967.552.017 | 35.020.682 |
| Karhutla | 128.283.490 | 25.457.756 | (tidak disajikan) | 709.049.963 | 6.284.991 |
| Tanah longsor | 83.919.432 | 51.321.334 | 25.252.687 | 696.025.976 | 7.685.637 |
| Likuefaksi | 23.872.906 | 457.325 | 86.689.779 | 351.875.950 | 1.342.986 |
| Cuaca ekstrem | 139.209.905 | 32.502.005 | 255.437.799 | 2.744.332.847 | – |
| Gelombang ekstrem & abrasi | 1.751.913 | 303.252 | 4.129.597 | 21.624.931 | 50.503 |
| COVID-19 | 192.473.073 | 1.181.863 | 272.566.688 | – | – |
| Epidemi & wabah | 192.473.075 | 385.762 | 272.566.688 | – | – |
| Kegagalan teknologi | 186.940 | 3.600 | 713.784 | 584.288 | – |

Catatan:

- API-KRB untuk karhutla (`kebakaran-hutan-dan-lahan`/`karhutla`) membalas nol semua, jadi ringkasannya tidak tersedia lewat API.
- API-KRB juga memuat **kapasitas kabupaten: rendah 315, sedang 190, tinggi 3 (dari 508)**, sama untuk semua bahaya. [TERVERIFIKASI] Angka ini bertentangan dengan baseline Renstra yang menyebut 67% daerah berkapasitas minimal sedang (lihat §7).

Sumber kedua, "Buku Risiko Bencana Indonesia, 2023" (dikutip RENSTRA 25-29 hlm. 8–10) [TERVERIFIKASI kutipannya]:

- Jiwa terpapar multi-ancaman: rendah 8.654.582, sedang 35.897.949, tinggi 213.519.183. Jumlahnya 258.071.714 [DIHITUNG], lebih kecil 13,06 juta dari angka KRB 2022–2026 (271.130.365).
- Potensi kerugian ekonomi multi-ancaman: kelas sedang Rp315,78 T, tinggi Rp1.409,94 T.

### 1.5 Risiko Bencana Indonesia (RBI) 2016

- Buku RBI disusun tim pimpinan Mohd. Robi Amri, kata pengantarnya bertanggal Oktober 2016. → [SEKUNDER] (salinan di ppid.bone.go.id, tidak dibuka penuh)
- 148,4 juta jiwa terpapar bahaya gempa dan 3,8 juta terpapar tsunami (pernyataan BNPB 7 Des 2016). → [SEKUNDER] (suarasurabaya.net; ugm.ac.id)
- Tabel luas terpapar dan kerugian per bahaya RBI 2016 dari dokumen aslinya → [TIDAK DITEMUKAN]. Saran: pakai KRB 2022–2026 (§1.4) sebagai kajian risiko nasional terbaru yang resmi.

### 1.6 Data IRBI di repo ini

| Berkas | Isi / kolom |
|---|---|
| `public/banjir/data/cuaca_risiko_bnpb.json` (dibuat 2026-10-19) | `indeks_cuaca` dan `indeks_gelombang`: kolom `kode, nama, prov, seri_2015_2025` (11 nilai), `status_irbi_total_2025` (`s`/`t`). `sarana_cuaca`: penduduk, sekolah, faskes, bandara, dan pelabuhan per kelas aman/rendah/sedang/tinggi (nasional dan per kab). `skala`: "2015-2024 skala lama, maks 20,4; 2025 skala baru, maks 36". `cakupan`: 514 kab. |
| `scripts/cuaca/risiko_bnpb.py` | penarik `apiv4/data-irbi-full` dan `get-infra-risk/{kab}/{bahaya}`. Self-check: `python3 scripts/cuaca/risiko_bnpb.py uji`. |
| `public/data/kekeringan_bnpb.json`, `scripts/kekeringan/resmi.py`, `bukti.py` | memakai IRBI komponen kekeringan |
| `docs/multi-bencana/SUMBER-BNPB.md` | survei endpoint BNPB (IRBI, infra-risk, kajian-summary, GeoServer, CKAN) |
| Mentah hari ini | `…/scratchpad/dl/irbi.ndjson`: dump lengkap 5.654 baris dengan semua kolom bahaya dan `total`, `status`. Tidak di-commit. |

---

## 2. RIPB 2020–2044, Renas PB, Renstra BNPB, dan RPJMN

### 2.1 RIPB 2020–2044 (Perpres 87/2020)

- Ditandatangani 10 Sep 2020, diundangkan 11 Sep 2020. Jangka 25 tahun dalam 5 tahap lima-tahunan. Isinya visi, misi, tujuan, sasaran, kebijakan dan strategi, serta peta jalan. Pemantauan dilakukan tiap tahun, peninjauan tiap 5 tahun. → [TERVERIFIKASI] (setkab.go.id)
- **Visi:** "Mewujudkan Indonesia Tangguh Bencana untuk Pembangunan Berkelanjutan". → [TERVERIFIKASI] (RENSTRA 25-29 hlm. 80)
- Tujuan dan 5 sasaran RIPB, dikutip RENAS 25-29 hlm. 13 [TERVERIFIKASI]. Tujuannya meningkatkan ketangguhan pemerintah, pemda, dan masyarakat serta mengurangi risiko jangka panjang. Sasarannya:
  1. kerangka regulasi kuat dan kelembagaan adaptif;
  2. investasi kesiapsiagaan sesuai proyeksi risiko;
  3. tata kelola profesional, transparan, akuntabel;
  4. penanganan darurat cepat dan andal;
  5. pemulihan yang lebih baik dan lebih aman.
- Ada 6 kebijakan RIPB (RENAS 25-29 hlm. 13).
- Peta jalan tahap 2025–2029 memuat **12 fokus capaian** (RENAS 25-29 Tabel 1.2, hlm. 14–16), antara lain: regulasi harmonis; kemandirian teknologi dan industri kebencanaan; layanan peringatan dini terpadu multiancaman; investasi PRB memadai; penanganan darurat cepat; tata ruang peka risiko; perlindungan ekosistem pesisir; SDM profesional; pemulihan yang lebih aman; infrastruktur tangguh. [TERVERIFIKASI]
- Teks resmi Perpres: https://jdih.setkab.go.id (tidak dibuka). Rangkuman RIPB ada di https://inarisk.bnpb.go.id/pdf/Rangkuman%20RIPB%202015-2045.pdf (tidak dibuka).

### 2.2 Renas PB 2020–2024 dan 2025–2029

- **Renas PB 2020–2024** = Peraturan BNPB No. 7/2022, BN 2022 (1184), status BERLAKU. → [TERVERIFIKASI] (katalog JDIH)
- **Renas PB 2025–2029** = Peraturan BNPB No. 1/2025, ditetapkan 6 Jan 2025, melaksanakan Pasal 4 ayat (2) Perpres 87/2020. Ditinjau tiap 2 tahun atau sewaktu-waktu bila terjadi bencana. → [TERVERIFIKASI]
- Tujuan: "Meningkatkan Ketangguhan Bangsa dalam Mengelola Risiko Bencana Untuk Mewujudkan Resiliensi Berkelanjutan" (hlm. 32). [TERVERIFIKASI]

Sasaran dan target RENAS 25-29 (Tabel 2.8, hlm. 32–33) [TERVERIFIKASI]:

| Sasaran | Indikator | 2025 | 2029 |
|---|---|---:|---:|
| 1 Kurangi penduduk terdampak | 1.a kematian dan hilang per 100.000 jiwa | 0,22 | Menurun |
| | 1.b terdampak per 100.000 jiwa | 2.643 | Menurun |
| | 1.c penduduk per 100.000 di daerah berisiko yang tercakup peringatan dini | 11.060 | 52.000 |
| 2 Kurangi kerusakan dan kerugian | 2.a kerugian ekonomi langsung relatif thd PDB | 0,137 | 0,135 |
| | 2.b nilai kerusakan infrastruktur relatif thd total belanja APBN | 0,004 | 0,003 |
| 3 Daya lenting | 3.a Indeks Pemulihan Pascabencana | 6,5 | 8 |
| 4 Tata kelola | 4.a implementasi strategi PRB nasional | 87% | 100% |
| | 4.b kenaikan nilai kerja sama internasional PRB | 12% | 15% |
| | 4.c **penurunan nilai IRB (%)** | 1,2% | 1,2% |

### 2.3 Renstra BNPB 2025–2029 (Perban 5/2025) dan RPJMN 2025–2029 (Perpres 12/2025)

Semua dari RENSTRA 25-29 [TERVERIFIKASI kutipannya]:

- RPJMN 2025–2029, Prioritas Nasional ke-8, arah pembangunan "Resiliensi Terhadap Bencana dan Perubahan Iklim". **Indikator Kinerja Strategis RPJMN: penurunan nilai IRB nasional 1,2% setiap tahun** (hlm. 84). Teks Perpres 12/2025 sendiri tidak dibuka; angka ini diambil dari kutipan Renstra.
- Sasaran Strategis BNPB 1 "Resiliensi Terhadap Bencana". IKS: (1) penurunan IRB nasional 1,2%/tahun; (2) **persentase daerah dengan kapasitas PB minimal sedang dari 67% menjadi 90%** (hlm. 84–85). Kemenko PMK menyebut target yang sama: 90% kab/kota di level menengah–tinggi pada 2029. [SEKUNDER]
- Sasaran Strategis 2: nilai Reformasi Birokrasi naik dari 77,18 ke 79.
- Visi BNPB 2025–2029: "Mewujudkan Penyelenggaraan Penanggulangan Bencana yang Kolaboratif untuk Membangun Resiliensi Bangsa Menghadapi Bencana Bersama Indonesia Maju Menuju Indonesia Emas 2045" (hlm. 81).

Tujuh isu kebencanaan RPJMN, dikutip RENSTRA hlm. 69–70:

1. 3 lempeng, 6 zona subduksi, **13 segmen megathrust, 295 segmen sesar aktif**;
2. **53.000 desa** di daerah rawan, dihuni **> 51 juta keluarga**;
3. **75% infrastruktur dasar** di zona rawan;
4. rata-rata **IKD 0,46 (sedang)**;
5. muka laut naik 0,8–1,2 cm/tahun dan **313 kab/kota pesisir rentan**;
6. PB belum terintegrasi penuh dalam perencanaan dan tata ruang;
7. keterpenuhan sistem peringatan dini baru **6%** dari masyarakat terpapar di kawasan berisiko tinggi.

### 2.4 Regulasi perencanaan terbaru (konteks 2026)

- Peraturan BNPB No. 3/2026 tentang Pedoman Penyusunan Rencana PB Daerah (ditetapkan 6 Okt 2026). → [TERVERIFIKASI] (katalog)
- Peraturan BNPB No. 9/2025 tentang Penyusunan dan Uji Coba Rencana Penanggulangan Kedaruratan Bencana Daerah. → [TERVERIFIKASI] (katalog)
- Peraturan BNPB No. 2/2023 tentang Rencana Kontingensi dan No. 2/2024 tentang Sistem Peringatan Dini Bencana. → [TERVERIFIKASI] (katalog)

---

## 3. Dasar hukum

| Regulasi | Pokok | Status (per sumber) | Sumber |
|---|---|---|---|
| UU 24/2007 Penanggulangan Bencana (LN 2007/66, TLN 4723) | induk PB; epidemi dan wabah termasuk bencana nonalam | berlaku; dirujuk Perpres 46/2026 | [TERVERIFIKASI] (konsiderans Perpres 46/2026, Perban 1/2026) |
| PP 21/2008 Penyelenggaraan PB (LN 2008/42) | Pasal 6: perencanaan PB berbasis analisis risiko | Berlaku | [TERVERIFIKASI] (peraturan.bpk.go.id/Details/4833; konsiderans Perpres 46/2026) |
| PP 22/2008 Pendanaan dan Pengelolaan Bantuan Bencana (LN 2008/43) | DSP, dana kontinjensi, hibah | dirujuk Perpres 46/2026, jadi masih berlaku | [TERVERIFIKASI] (konsiderans) |
| PP 23/2008 Peran Serta Lembaga Internasional dan Lembaga Asing Nonpemerintah | bantuan internasional | dirujuk banyak Perka; halaman status BPK tidak ditemukan | [SEKUNDER] |
| Perpres 1/2019 BNPB jo. Perpres 29/2021 (LN 2021/103) | organisasi BNPB | masih dasar hukum Perban 6/2025 (Okt 2025) dan Perban 1/2026 (Mar 2026); pengganti tidak ditemukan | [TERVERIFIKASI] |
| Perban 6/2025 jo. Perban 11/2025 | Organisasi dan Tata Kerja BNPB | Berlaku | [TERVERIFIKASI] (katalog) |
| Perpres 17/2018 jo. **Perpres 46/2026** (16 Jul 2026, LN 2026/83) | PB dalam Keadaan Tertentu. Perubahan 2026 menambah kondisi "pemerintah daerah yang wilayahnya dalam proses rekonsiliasi pascakonflik sosial dan memiliki kapasitas fiskal sangat rendah atau rendah" (Pasal 3 ayat (2) huruf c) | Berlaku | [TERVERIFIKASI] (teks Perpres 46/2026) |
| Perpres 87/2020 RIPB 2020–2044 | lihat §2.1 | Berlaku | [TERVERIFIKASI] |
| Perpres 75/2021 Dana Bersama PB (LN 2021/183) | *pooling fund* dikelola Menkeu (BLU); KMK 407/2021 menugaskan BPDLH; PMK 28/2025 mengatur pengelolaannya. Pelaksanaannya: Perban 1/2026 dan Juklak 2/2026 | Berlaku | [TERVERIFIKASI] (konsiderans Perban 1/2026). Rincian KMK/PMK [SEKUNDER]. **Catatan: ini Perpres, bukan "PP 75/2021".** |
| Perka BNPB 2/2012 Pedoman Umum Pengkajian Risiko Bencana | metodologi KRB | BERLAKU | [TERVERIFIKASI] (katalog) |
| Perka BNPB 3/2012 Panduan Penilaian Kapasitas Daerah | dasar IKD | BERLAKU; teks tidak terekstrak (0 halaman) | [TERVERIFIKASI] status |
| PP 2/2018 SPM; Permendagri 101/2018 Standar Teknis SPM Sub-Urusan Bencana Kab/Kota | layanan dasar: informasi rawan bencana, pencegahan dan kesiapsiagaan, penyelamatan dan evakuasi | 101/2018 masih tercatat Berlaku di BPK. Permendagri 59/2021 mencabut **100/2018** (penerapan SPM), **bukan** 101/2018 | [SEKUNDER] (peraturan.bpk.go.id/Details/245191; spm.bangda.kemendagri.go.id/2021/uploads/PMDN59.pdf) |
| Juklak SPM sub-urusan bencana 2026 (gladi, peralatan, SAR, KIE) | penjabaran SPM | BERLAKU | [TERVERIFIKASI] (katalog no. 1–4) |
| Inpres 3/2020 Penanggulangan Karhutla (28 Feb 2020) | menggantikan Inpres 11/2015; pencegahan, pemadaman, pascakebakaran, penegakan hukum | Berlaku | [SEKUNDER] (setkab.go.id; jdih.kemenkoinfra.go.id) |
| UU 6/2018 Kekarantinaan Kesehatan | dasar hukum KKM, PSBB | Berlaku | teks tidak dibuka → [SEKUNDER] |
| Keppres 7/2020 Gugus Tugas COVID-19 (Kepala BNPB sebagai ketua pelaksana) jo. Keppres 9/2020 | dicabut oleh Perpres 82/2020 (Komite PC-PEN, Satgas) | Tidak berlaku | [SEKUNDER] (peraturan.bpk.go.id/Details/134544) |
| Keppres 11/2020 KKM; Keppres 12/2020 COVID-19 sebagai bencana nasional (13 Apr 2020) | – | **dicabut** oleh Keppres 17/2023 (berlaku 21 Jun 2023) | [SEKUNDER] (peraturan.bpk.go.id/Home/Details/135718; setkab.go.id) |
| UU 7/2012 Penanganan Konflik Sosial; PP 2/2015 | status keadaan konflik ditetapkan bupati/wali kota, gubernur, atau Presiden sesuai skala (Pasal 16, 18, 20); pemulihan pascakonflik oleh pemerintah dan pemda (Pasal 37) | Berlaku | [SEKUNDER] (kajian DPR berkas.dpr.go.id/puspanlakuu/kajian/kajian-public-64.pdf) |
| Strategi Pembiayaan dan Asuransi Risiko Bencana (PARB/DRFI), BKF Kemenkeu, 2018 | rata-rata kerugian ekonomi langsung **Rp22,8 T/tahun (2000–2016)** | dokumen kebijakan | [SEKUNDER] (fiskal.kemenkeu.go.id/strategi-drfi/strategi; halaman kajiannya 404 hari ini) |

---

## 4. Data historis kejadian (DIBI dan data.bnpb.go.id)

### 4.1 Rekap tahunan DIBI 2015–2026 (semua jenis)

Sumber: DIBI Superset (dasbor publik 1), ditarik 23 Okt 2026, `SUM` per `tahun`. [TERVERIFIKASI] (data primer). **Peringatan:** DIBI mencatat per kab/kota, sehingga satu kejadian lintas kabupaten terhitung beberapa kali. Data ini juga data hidup yang terus direvisi (lihat docstring `scripts/banjir/kejadian.py`).

| Tahun | Kejadian | Meninggal | Hilang | Mengungsi | Menderita | Rumah rusak (RB+RS+RR) |
|---|---:|---:|---:|---:|---:|---:|
| 2015 | 1.694 | 219 | 57 | 184.254 | 1.043.675 | 25.532 |
| 2016 | 2.306 | 482 | 96 | 438.925 | 2.723.566 | 47.798 |
| 2017 | 2.866 | 309 | 69 | 324.996 | 3.349.373 | 49.731 |
| 2018 | 3.401 | 5.500 | 764 | 892.453 | 9.524.726 | 370.160 |
| 2019 | 3.829 | 517 | 112 | 443.866 | 5.697.278 | 73.941 |
| 2020 | 4.649 | 376 | 42 | 922.367 | 5.873.967 | 65.744 |
| 2021 | 5.402 | 728 | 87 | 684.160 | 7.575.147 | 158.658 |
| 2022 | 3.544 | 858 | 37 | 595.422 | 5.492.456 | 95.403 |
| 2023 | 5.400 | 275 | 33 | 150.469 | 8.340.819 | 47.214 |
| 2024 | 3.636 | 579 | 65 | 531.638 | 7.611.886 | 82.298 |
| 2025 | 9.305 | 2.037 | 252 | 1.182.569 | 11.909.011 | 293.336 |
| 2026* | 3.021 | 554 | 21 | 253.512 | 5.582.157 | 166.585 |

\* 2026 berjalan, sampai tanggal tarik. DIBI tidak memuat tahun sebelum 2008, jadi tsunami Aceh 2004 dan gempa Yogya 2006 tidak ada di DIBI.

### 4.2 Kejadian per jenis 2015–2024 (seri resmi CKAN-BNPB)

Resource `9b41007e-c998-456b-8cbc-385b17986e46` "Jumlah Kejadian Bencana Menurut Jenis Bencana Tahun 2010-2024". [TERVERIFIKASI]

| Jenis | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Banjir | 525 | 824 | 979 | 871 | 784 | 1.518 | 1.794 | 1.531 | 1.255 | 1.420 |
| Cuaca ekstrem | 571 | 663 | 887 | 1.113 | 1.387 | 1.386 | 1.577 | 1.068 | 1.261 | 733 |
| Erupsi gunung api | 10 | 7 | 6 | 58 | 7 | 7 | 1 | 1 | 4 | 8 |
| Gelombang pasang & abrasi | 7 | 22 | 11 | 53 | 18 | 43 | 91 | 26 | 33 | 27 |
| Gempa bumi | 26 | 13 | 20 | 28 | 30 | 18 | 24 | 28 | 31 | 15 |
| Karhutla | 46 | 178 | 96 | 527 | 746 | 597 | 579 | 252 | 2.051 | 973 |
| Kekeringan | 7 | 0 | 19 | 130 | 123 | 26 | 15 | 4 | 174 | 89 |
| Tanah longsor | 502 | 599 | 848 | 615 | 719 | 1.054 | 1.321 | 634 | 591 | 207 |
| Tsunami | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Jumlah** | 1.694 | 2.306 | 2.866 | 3.397 | 3.814 | 4.649 | 5.402 | 3.544 | 5.400 | 3.472 |

Dataset CKAN yang sama juga memuat seri hilang, mengungsi, rumah rusak, dan terdampak per jenis 2010–2024 (resource `a19366cf…`, `d7b61b56…`, `27bbeb6b…`, `7f9e5218…`). Resource **meninggal** (`b2fa5c46…`) membalas *Not Found* hari ini → [TIDAK DITEMUKAN] di CKAN; dipakai DIBI (§4.1).

DIBI 2015–2025 per jenis memuat jenis nonalam dan sosial [TERVERIFIKASI]:

- **Konflik Sosial**: 2019 = 5 kejadian, 39 meninggal, 7.544 mengungsi. 2025 = 5 kejadian, 8 meninggal, 2.981 mengungsi. 2026 = 8 kejadian, 46 meninggal.
- **Kebakaran Gedung dan Permukiman**: 2025 = 881 kejadian, 149 meninggal.
- **Gagal Teknologi**: 2025 = 4 kejadian, 69 meninggal.
- **Epidemi/Wabah**: 2025 = 7 kejadian, 28 meninggal.

### 4.3 Angka 2024 yang saling bertentangan

| Angka kejadian 2024 | Sumber | Status |
|---|---|---|
| 2.107 (BNPB menyebut penurunan karena "mekanisme pencatatan baru") | konferensi pers BNPB 7 Jan 2025 (investortrust.id; metrotvnews.com) | [SEKUNDER] |
| 3.472 | seri CKAN 2010–2024, dan dikutip buku data bencana OJK 2024 | [TERVERIFIKASI] (CKAN) |
| 3.636 | DIBI hidup (23 Okt 2026) | [TERVERIFIKASI] |
| 5.593 | Antara (antaranews.com/berita/4569674) | [SEKUNDER] |

Angka 2023 juga berbeda: 5.400 (CKAN/DIBI dan BNPB) lawan 4.940 (Kompas TV) dan 4.935 (Medcom). [SEKUNDER] untuk dua yang terakhir.

### 4.4 Kejadian besar

| Kejadian | Angka | Sumber | Status |
|---|---|---|---|
| Tsunami Aceh 2004 | 126.741 tewas + 93.285 hilang (Aceh dan Sumut), lawan ">230.000" (PBB, Jan 2005) | djkn.kemenkeu.go.id; asean.org | [SEKUNDER], dua angka |
| Gempa Yogyakarta 2006 | ±5.700 meninggal (Bappenas dkk.); 5.716 / 5.737 / 5.749 di sumber lain | kutipan jurnal | [SEKUNDER], tidak konsisten |
| Erupsi Merapi 2010 | DIBI: 386 meninggal (Sleman 277, Magelang 56, Klaten 41, dll.), 447.982 mengungsi. Sumber lain: 347 / 354 | DIBI | [TERVERIFIKASI] DIBI; lainnya [SEKUNDER] |
| Tsunami Mentawai 2010 | DIBI: 447 meninggal, 56 hilang | DIBI | [TERVERIFIKASI] |
| Karhutla 2015 | kerugian **≥ US$16,1 miliar (1,9% PDB)**, Bank Dunia; luas **2,61–2,65 juta ha** (KLHK; SiPongi juga dikutip 261.060 ha, beda metode) | Mongabay; The Courier; KLHK via media | [SEKUNDER] |
| Karhutla 2019 | kerugian **US$5,2 miliar (≈ 0,5% PDB)**, Bank Dunia, 8 provinsi Jun–Okt 2019; luas **1.649.258 ha** | Reuters/Al Jazeera; repo `public/data/luas_resmi.json` (SiPongi) | [SEKUNDER] kerugian; luas [TERVERIFIKASI] dari panen SiPongi |
| Luas karhutla 2018–2025 (SiPongi) | 2018: 529.267; 2019: 1.649.258; 2020: 296.942; 2021: 358.867; 2022: 204.894; 2023: 1.161.193; 2024: 376.805; 2025: 359.619 ha | `public/data/luas_resmi.json` (opsroom.sipongidata.my.id), [DIHITUNG] jumlah provinsi | [TERVERIFIKASI] panen |
| Gempa Lombok 2018 | DIBI: 564 meninggal, 406.202 mengungsi, 217.679 rumah rusak. BNPB (via IGPA UGM): 560 meninggal, 396.032 mengungsi | DIBI; igpa.map.ugm.ac.id | [TERVERIFIKASI] / [SEKUNDER] |
| Gempa, tsunami, likuefaksi Sulteng 2018 | DIBI: **4.140 meninggal, 705 hilang**, 212.719 mengungsi, 110.214 rumah rusak. Rekap BNPB 21 Okt 2018: 2.256 meninggal, 1.309 hilang (angka sementara) | DIBI; jpnn | [TERVERIFIKASI] / [SEKUNDER] |
| Tsunami Selat Sunda 22 Des 2018 | 437 meninggal, 16 hilang (DIBI = BNPB 31 Des 2018). Mengungsi: DIBI 42.325, BNPB 33.721 | DIBI; suarasurabaya | [TERVERIFIKASI] |
| Banjir Jabodetabek awal 2020 | RENSTRA: 61 meninggal, 11.569 pengungsi, 3.245 rumah rusak. DIBI (31 Des 2019–8 Jan 2020): 60 meninggal, 2 hilang, 450.717 mengungsi | RENSTRA 25-29 hlm. 11; DIBI | [TERVERIFIKASI], angka pengungsi berbeda jauh |
| Gempa Sulbar 2021 | 96 meninggal (DIBI Mamuju); RENSTRA "> 100" | DIBI; RENSTRA | [TERVERIFIKASI] |
| Siklon Seroja NTT 2021 | 184 meninggal, 47 hilang | RENSTRA hlm. 11 | [TERVERIFIKASI] |
| Erupsi Semeru 4 Des 2021 | DIBI Lumajang: 64 meninggal, 9 hilang, 10.565 mengungsi | DIBI | [TERVERIFIKASI] |
| Gempa Cianjur 21 Nov 2022 | **602 meninggal**, 8 hilang, 114.683 mengungsi, 56.278 rumah rusak (DIBI). RENSTRA: 602 meninggal, 56.548 rumah rusak, 108.720 mengungsi | DIBI; RENSTRA hlm. 11 | [TERVERIFIKASI] |
| Banjir dan longsor Sumatra (Aceh, Sumut, Sumbar), akhir Nov 2025 | DIBI (≥ 15 Nov 2025): **1.202 meninggal, 140 hilang**, 970.876 mengungsi, 228.273 rumah rusak (Aceh 562, Sumut 373, Sumbar 267 meninggal). BNPB 12 Jan 2026: 1.189 meninggal, 141 hilang | DIBI; goodnewsfromindonesia | [TERVERIFIKASI] / [SEKUNDER] |
| COVID-19 | **6.811.945 kasus terkonfirmasi, 161.870 meninggal** (Kemenkes 2024) | RENSTRA 25-29 hlm. 14 | [TERVERIFIKASI] kutipannya |

---

## 5. Bencana nonalam dan sosial

- **COVID-19.**
  - Keppres 7/2020 (13 Mar 2020) membentuk Gugus Tugas yang diketuai Kepala BNPB. Keppres 12/2020 (13 Apr 2020) menetapkan COVID-19 sebagai bencana nasional nonalam. Perpres 82/2020 (20 Jul 2020) mengganti Gugus Tugas dengan Komite PC-PEN dan Satgas. Keppres 17/2023 mencabut status pandemi dan Keppres 12/2020. → [SEKUNDER] (BPK, setkab)
  - Dampak ke anggaran BNPB: pagu 2020 **Rp12,71 T** dan 2021 **Rp7,22 T** "karena terdapat alokasi penanganan Covid-19". → [TERVERIFIKASI] (RENSTRA 25-29 hlm. 55–56)
- **Kebakaran TPA 2023.**
  - Sarimukti (Bandung Barat): mulai 19 Agt 2023, status tanggap darurat kabupaten 21 hari; Kota Bandung "darurat sampah" 28 Agt–24 Sep 2023; BNPB melakukan *water bombing*.
  - Rawa Kucing (Kota Tangerang): mulai 20 Okt 2023, 27 dari 34 ha terbakar, tanggap darurat 20 Okt–2 Nov 2023, 534 personel gabungan termasuk BNPB.
  - Suwung (Denpasar): api sejak 12 Okt 2023, turun ke transisi darurat 8 Nov 2023.
  - Antang (Makassar): [TIDAK DITEMUKAN].
  - Semua di atas [SEKUNDER] (republika, medcom, katadata, antaranews). RENSTRA hlm. 12 juga mencatat El Niño 2023 memicu kebakaran "sejumlah Tempat Pembuangan Akhir (TPA), pelabuhan, dan gunung". [TERVERIFIKASI]
- **Kegagalan teknologi dan industri.**
  - Kilang Balongan 29 Mar 2021: RENSTRA hlm. 14 menyebutnya contoh kegagalan teknologi yang "mengharuskan ratusan penduduk mengungsi". [TERVERIFIKASI] Jumlah pengungsi pastinya [TIDAK DITEMUKAN].
  - Kilang Cilacap: dua kebakaran tangki, 11 Jun dan 13 Nov 2021, tanpa korban jiwa, warga dievakuasi. [SEKUNDER]
  - Depo/Integrated Terminal Plumpang 3 Mar 2023: **17 atau 19 meninggal** (dua sumber berbeda). [SEKUNDER] (katadata, jpnn)
  - KRB 2022–2026 memetakan bahaya kegagalan teknologi seluas 186.940 ha, 713.784 jiwa terpapar. [TERVERIFIKASI]
- **Konflik dan kerusuhan sosial.**
  - Wamena 23 Sep 2019: 33 meninggal (Presiden, 30 Sep 2019), 43 menurut Dewan Adat Papua, sekitar 17.367 warga eksodus. [SEKUNDER] (setkab.go.id; republika)
  - DIBI mencatat "Konflik Sosial" 2019: 39 meninggal, 7.544 mengungsi. [TERVERIFIKASI]
  - Kerusuhan 25–31 Agt 2025: Komnas HAM mula-mula mencatat sekitar 10, lalu merevisinya menjadi **11 meninggal** (Nov 2025). Laporan LNHAM gabungan (20 Apr 2026) menyatakan dugaan pelanggaran HAM oleh aparat. [SEKUNDER] (investortrust; tirto; kpai.go.id)
  - Ambon/Poso 1999–2002 dan Mei 1998: [TIDAK DITEMUKAN] di sumber primer pada penelusuran ini. Belum dicari khusus, jadi jangan dipakai tanpa sumber.
  - **Pengaturannya.** UU 24/2007 memasukkan bencana sosial. UU 7/2012 menempatkan status konflik di tangan kepala daerah atau Presiden. **Perpres 46/2026** kini secara eksplisit memberi Kepala BNPB kewenangan menyelenggarakan PB "dalam keadaan tertentu" untuk potensi bencana akibat faktor "sosial" dan untuk daerah dalam rekonsiliasi pascakonflik berkapasitas fiskal rendah, setelah ada keputusan rapat koordinasi yang dipimpin Menko. [TERVERIFIKASI]

---

## 6. Kajian skenario terburuk

| Kajian | Temuan | Sumber | Status |
|---|---|---|---|
| Peta Sumber dan Bahaya Gempa 2017 (PuSGeN) | 295 sesar aktif; segmen megathrust **13** menurut kutipan RPJMN di Renstra, **16** menurut sumber lain | RENSTRA hlm. 69; tektonesiana/katadata | [TERVERIFIKASI] kutipan 13/295; angka 16 [SEKUNDER] |
| Peta Gempa 2024 (pemutakhiran) | **14 segmen megathrust**, 129 sumber gempa baru; Mmaks Aceh–Andaman 9,2, Jawa 9,1, Mentawai/Enggano 8,9; sesar aktif Jawa naik dari 36 ke 82 segmen, Sumatra dari 56 ke 86 | tektonesiana.org; katadata; CNBC | [SEKUNDER] (dokumen PuSGeN tidak dibuka) |
| Tsunami selatan Jawa (Widiyantoro dkk., 2020, *Sci. Rep.* 10:15274) | skenario terburuk dua segmen pecah bersamaan: tinggi tsunami **~20 m** (Jabar selatan) dan **~12 m** (Jatim selatan), rata-rata maksimum 4,5 m di seluruh pantai selatan Jawa | abstrak via LPPM ITB dan liputan | [SEKUNDER] (abstrak) |
| Supendi dkk., 2022 (*Nat. Hazards*) | hingga **34 m** di pantai barat Sumatra paling selatan dan Ujung Kulon | bora.uib.no | [SEKUNDER] |
| Genangan tsunami skenario InaRISK | layer `raster:Inun_7_8_Mw` … `Inun_9_0_Mw` dan `INA_Megathrust` (15 segmen) di GeoServer BNPB | `docs/multi-bencana/SUMBER-BNPB.md` | [TERVERIFIKASI] keberadaan layer. Cakupannya belum dicek. Catat: GeoServer memuat 15 segmen, berbeda dari 13/14/16 |
| Rencana kontinjensi megathrust | Perban 2/2023 (pedoman renkon) ada; dokumen renkon megathrust nasional tidak ditemukan | katalog JDIH | [TIDAK DITEMUKAN] |

---

## 7. Evaluasi kelemahan

| Butir | Angka | Sumber | Status |
|---|---|---|---|
| Anggaran BNPB 2020–2024 (pagu / realisasi) | 2020: Rp12,71 T / 92,48%; 2021: Rp7,22 T / 98,87%; 2022: Rp5,47 T / 92,25%; 2023: Rp5,48 T / 99,16%; 2024: Rp5,14 T / 95,65% (ada blokir) | RENSTRA Tabel 1.10 | [TERVERIFIKASI] |
| Rasio pagu BNPB 2024 thd belanja APBN 2024 | 5,1396 T / 3.325,12 T = **0,155%** | RENSTRA dan UU 19/2023 (belanja Rp3.325.119.321.897.000) | [DIHITUNG]; angka APBN [SEKUNDER] |
| Kerugian rata-rata vs pembiayaan | kerugian ekonomi langsung Rp22,8 T/tahun (2000–2016, PARB 2018). Dana cadangan "≈ Rp3,1 T/tahun" hanya muncul di kolom opini | Kemenkeu via Kontan; detik | [SEKUNDER]. Angka dana cadangan resmi [TIDAK DITEMUKAN] |
| Rasio anggaran PB thd APBD | – | – | [TIDAK DITEMUKAN] |
| Kapasitas daerah | rata-rata **IKD 0,46**; baseline daerah berkapasitas minimal sedang **67%** dengan target 90% (2029). Sebaliknya API-KRB menunjukkan kapasitas kab **rendah 315 / sedang 190 / tinggi 3 dari 508**, hanya **38%** minimal sedang [DIHITUNG] | RENSTRA hlm. 70 dan 84–85; API-KRB | **Bertentangan.** Kemungkinan beda alat ukur (IKD terbaru vs kapasitas dalam KRB 2022–2026) |
| Kepatuhan daerah | 63 daerah belum tuntas SPM sub-urusan bencana, 87 belum mengaktifkan KRB, 79 belum menyusun IKD 2024 | Kemenko PMK (kemenkopmk.go.id/node/5841) | [SEKUNDER] |
| Peringatan dini | keterpenuhan 6% masyarakat terpapar berisiko tinggi; target Renas: cakupan dari 11.060 ke 52.000 per 100.000 penduduk | RENSTRA hlm. 70; RENAS Tabel 2.8 | [TERVERIFIKASI] |
| Masalah pokok versi Renas | BTT daerah kurang akuntabel; BTT dan DSP belum sinkron; regulasi TRC PB multisektor belum ada; standar logistik daerah tidak relevan; SKPDB lemah; satuan pendidikan aman bencana belum merata; dana desa untuk ketangguhan belum optimal | RENAS hlm. 26–27 | [TERVERIFIKASI] |
| Tren NAR 2023 | jumlah kejadian turun 3 tahun terakhir tetapi korban tewas naik; regulasi dan kewenangan ambigu; daerah berisiko tinggi berkapasitas fiskal rendah; riset terpusat di Jawa dan Sumatra | RENSTRA Tabel 1.4 (sumber: *National Assessment Report 2023*) | [TERVERIFIKASI] kutipan |
| Temuan BPK | IHPS II 2018 (kesiapsiagaan karhutla), IHPS II 2023 (penurunan risiko bencana hidrometeorologi), IHPS II 2024 (penanggulangan bencana, hlm. 176), IHPS II 2025 (PB tahap prabencana, hlm. 92); pemeriksaan kinerja BNPB atas program PRB TA 2016–Smt I 2017. **Isi temuannya belum dibaca** | daftar isi IHPS (jatim.bpk.go.id; foresight.bpk.go.id); ringkasan DPR | [SEKUNDER]; isi temuan [TIDAK DITEMUKAN] |
| WorldRiskReport 2025 | Indonesia **peringkat 3** dari 193 negara (WRI 39,80), di bawah Filipina (46,56) dan India (40,73). Peringkat 2024: kemungkinan ke-2 (ReliefWeb menyebut India dan Indonesia bertukar posisi) | welthungerhilfe.org; reliefweb | [SEKUNDER] |
| Sendai Framework | target IRB 1,2%/tahun dikaitkan dengan capaian Sendai (RENSTRA). Indonesia menjadi ko-fasilitator *Midterm Review* 2023. Laporan nasional MTR Indonesia di PreventionWeb tidak ditemukan; yang ada NAR 2023 dikutip Renstra | RENSTRA; undrr.org | [TERVERIFIKASI] / [TIDAK DITEMUKAN] |

---

## 8. Ringkasan angka yang saling bertentangan

1. **Kejadian 2024:** 2.107 / 3.472 / 3.636 / 5.593 (§4.3). Kejadian 2023: 5.400 / 4.940 / 4.935.
2. **Jiwa terpapar multibahaya:** 271.130.365 (KRB 2022–2026, RENAS) lawan 258.071.714 (Buku RBI 2023, RENSTRA).
3. **IRB 2019–2020:** API 143,25 / 140,96 lawan Renstra 144,02 / 141,65.
4. **IRBI 2025 vs seri lama:** skala berubah, sehingga rata-rata naik ke 147,95 tanpa arti risiko naik.
5. **Kapasitas daerah:** 67% minimal sedang (Renstra) lawan 38% (API-KRB).
6. **Segmen megathrust:** 13 (RPJMN/Renstra), 14 (Peta Gempa 2024), 15 (GeoServer InaRISK), 16 (sebagian sumber untuk 2017).
7. **Korban per kejadian:**
   - Sulteng 2018: 4.140 meninggal + 705 hilang (DIBI) lawan 2.256 + 1.309 (rekap Okt 2018).
   - Merapi 2010: 386 (DIBI) / 347 / 354.
   - Lombok: 564 (DIBI) / 560.
   - Jabodetabek 2020: pengungsi 11.569 (Renstra) lawan 450.717 (DIBI).
   - Plumpang: 17 / 19.
   - Aceh 2004: 126.741 + 93.285 hilang lawan > 230.000.
   - Yogya 2006: 5.700–5.749.
8. **Luas karhutla 2015:** 2,61–2,65 juta ha (KLHK via media) lawan 261.060 ha (kutipan SiPongi).

---

## Daftar Pustaka (APA 7)

Badan Nasional Penanggulangan Bencana. (2012). *Peraturan Kepala BNPB Nomor 2 Tahun 2012 tentang Pedoman Umum Pengkajian Risiko Bencana*. https://bnpb.go.id/storage/app/media/uploads/24/peraturan-kepala/2012/perka-2-tahun-2012.pdf

Badan Nasional Penanggulangan Bencana. (2022). *Peraturan BNPB Nomor 7 Tahun 2022 tentang Rencana Nasional Penanggulangan Bencana Tahun 2020–2024*. https://jdih.bnpb.go.id/storage/file/2022pbbnpb007.pdf

Badan Nasional Penanggulangan Bencana. (2023). *Peraturan BNPB Nomor 2 Tahun 2023 tentang Penyusunan Rencana Kontingensi Bencana*. https://jdih.bnpb.go.id/storage/file/2023pbbnpb002.pdf

Badan Nasional Penanggulangan Bencana. (2025a). *Peraturan BNPB Nomor 1 Tahun 2025 tentang Rencana Nasional Penanggulangan Bencana Tahun 2025–2029*. https://jdih.bnpb.go.id/storage/file/2025pbbnpb001.pdf

Badan Nasional Penanggulangan Bencana. (2025b). *Peraturan BNPB Nomor 5 Tahun 2025 tentang Rencana Strategis BNPB Tahun 2025–2029*. https://jdih.bnpb.go.id/storage/file/2025pbbnpb005.pdf

Badan Nasional Penanggulangan Bencana. (2025c). *Peraturan BNPB Nomor 6 Tahun 2025 tentang Organisasi dan Tata Kerja BNPB*. https://jdih.bnpb.go.id/storage/file/2025pbbnpb006.pdf

Badan Nasional Penanggulangan Bencana. (2026a). *Peraturan BNPB Nomor 1 Tahun 2026 tentang Pelaksanaan Penelaahan, Verifikasi, dan Evaluasi terhadap Penyaluran Dana Bersama Penanggulangan Bencana*. https://jdih.bnpb.go.id/storage/file/2026pbbnpb001.pdf

Badan Nasional Penanggulangan Bencana. (2026b). *Peraturan BNPB Nomor 3 Tahun 2026 tentang Pedoman Penyusunan Rencana Penanggulangan Bencana Daerah*. https://jdih.bnpb.go.id/storage/file/2026pbbnpb003.pdf

Badan Nasional Penanggulangan Bencana. (2026c). *Data IRBI lengkap 2015–2025* [Data set]. InaRISK. Diakses 23 Oktober 2026, dari https://inarisk.bnpb.go.id/apiv4/data-irbi-full

Badan Nasional Penanggulangan Bencana. (2026d). *Ringkasan kajian risiko bencana nasional per bahaya* [Data set]. InaRISK. Diakses 23 Oktober 2026, dari https://inarisk.bnpb.go.id/apiv4/kajian-summary/multi-bahaya/ALL?level=nasional

Badan Nasional Penanggulangan Bencana. (2026e). *Data Informasi Bencana Indonesia (DIBI)* [Basis data]. Diakses 23 Oktober 2026, dari https://dibi.bnpb.go.id

Badan Nasional Penanggulangan Bencana. (2026f). *Data bencana Indonesia: Jumlah kejadian bencana menurut jenis bencana tahun 2010–2024* [Data set]. Diakses 23 Oktober 2026, dari https://data.bnpb.go.id/dataset/data-bencana-indonesia

Bündnis Entwicklung Hilft & IFHV Ruhr-Universität Bochum. (2025). *WorldRiskReport 2025: Focus floods*. https://www.welthungerhilfe.org/news/publications/detail/worldriskreport-2025

Kementerian Keuangan Republik Indonesia, Badan Kebijakan Fiskal. (2018). *Strategi pembiayaan dan asuransi risiko bencana*. https://fiskal.kemenkeu.go.id/strategi-drfi/strategi

Kementerian Sekretariat Negara. (2020, 14 September). *Presiden teken Perpres Rencana Induk Penanggulangan Bencana tahun 2020–2044*. Sekretariat Kabinet RI. https://setkab.go.id/presiden-teken-perpres-rencana-induk-penanggulangan-bencana-tahun-2o2o-2o44/

Investortrust. (2025, November). *Komnas HAM: Korban meninggal kerusuhan akhir Agustus 2025 bertambah jadi 11 orang*. https://investortrust.id/national/84812/komnas-ham-korban-meninggal-kerusuhan-akhir-agustus-2025-bertambah-jadi-11-orang

Mongabay. (2019, Desember). *Indonesia fires cost nation $5 billion this year: World Bank*. https://news.mongabay.com/2019/12/indonesia-fires-cost-nation-5-billion-this-year-world-bank

Peraturan Pemerintah Nomor 21 Tahun 2008 tentang Penyelenggaraan Penanggulangan Bencana. (2008). https://peraturan.bpk.go.id/Details/4833

Peraturan Presiden Nomor 46 Tahun 2026 tentang Perubahan atas Peraturan Presiden Nomor 17 Tahun 2018 tentang Penyelenggaraan Penanggulangan Bencana dalam Keadaan Tertentu. (2026). https://jdih.bnpb.go.id/storage/file/2026perpresri046.pdf

Peraturan Presiden Nomor 75 Tahun 2021 tentang Dana Bersama Penanggulangan Bencana. (2021). https://peraturan.bpk.go.id/Details/175273/perpres-no-75-tahun-2021

Keputusan Presiden Nomor 12 Tahun 2020 tentang Penetapan Bencana Nonalam Penyebaran COVID-19 sebagai Bencana Nasional. (2020). https://peraturan.bpk.go.id/Home/Details/135718

Keputusan Presiden Nomor 7 Tahun 2020 tentang Gugus Tugas Percepatan Penanganan COVID-19. (2020). https://peraturan.bpk.go.id/Details/134544/keppres-no-7-tahun-2020

Peraturan Menteri Dalam Negeri Nomor 101 Tahun 2018 tentang Standar Teknis Pelayanan Dasar pada SPM Sub-Urusan Bencana Daerah Kabupaten/Kota. (2018). https://peraturan.bpk.go.id/Details/245191

Peraturan Menteri Dalam Negeri Nomor 59 Tahun 2021 tentang Penerapan Standar Pelayanan Minimal. (2021). https://spm.bangda.kemendagri.go.id/2021/uploads/PMDN59.pdf

Sekretariat Kabinet RI. (2020). *Presiden teken Inpres Nomor 3 Tahun 2020 tentang Penanggulangan Karhutla*. https://setkab.go.id/presiden-teken-inpres-nomor-3-tahun-2020-tentang-penanggulangan-karhutla/

Sekretariat Kabinet RI. (2019, 30 September). *Sampaikan duka cita kepada korban, Presiden Jokowi: Rusuh Wamena bukan konflik etnis*. https://setkab.go.id/sampaikan-duka-cita-kepada-korban-presiden-jokowi-rusuh-wamena-bukan-konflik-etnis/

Sekretariat Kabinet RI. (2023). *Inilah Keppres penetapan berakhirnya status pandemi COVID-19 di Indonesia*. https://setkab.go.id/inilah-keppres-penetapan-berakhirnya-status-pandemi-covid-19-di-indonesia/

Supendi, P., dkk. (2022). [Judul belum diverifikasi; kajian tsunami lepas pantai Jawa Barat dan Sumatra bagian tenggara]. *Natural Hazards*. https://bora.uib.no/bora-xmlui/handle/11250/3054273

Undang-Undang Nomor 7 Tahun 2012 tentang Penanganan Konflik Sosial. (2012). https://jdih.kemenkeu.go.id/api/download/fulltext/2012/7TAHUN2012UU.pdf

Undang-Undang Nomor 19 Tahun 2023 tentang Anggaran Pendapatan dan Belanja Negara Tahun Anggaran 2024. (2023). https://jdih.kemenkoinfra.go.id/berita/uu-192023-anggaran-pendapatan-dan-belanja-negara-tahun-anggaran-2024

Widiyantoro, S., dkk. (2020). Implications for megathrust earthquakes and tsunamis from seismic gaps south of Java Indonesia. *Scientific Reports, 10*, 15274. Ringkasan: https://lppm.itb.ac.id/en/completely-peel-the-latest-research-publications-in-nature-scientific-report (daftar penulis lengkap dan DOI belum diverifikasi; cek di nature.com sebelum dikutip)

Sumber sekunder pendukung (berita dan ringkasan), diakses 23 Okt 2026:

- antaranews.com/berita/4569674
- investortrust.id/national/52352
- investortrust.id/national/88463
- kontan.co.id (Kemendagri; DRFI)
- katadata.co.id (Plumpang; megathrust 2024)
- tektonesiana.org (Peta Gempa 2024)
- republika.co.id (Rawa Kucing; Wamena)
- medcom.id (Rawa Kucing)
- detik.com (Sarimukti)
- bali.antaranews.com (Suwung)
- igpa.map.ugm.ac.id (Lombok, Palu)
- suarasurabaya.net (Selat Sunda; RBI 2016)
- kemenkopmk.go.id/node/5841 (IKD, SPM)
- jatim.bpk.go.id (IHPS II 2024, 2025)
- reliefweb.int (WRR 2025)
- aljazeera.com (karhutla 2019)
- djkn.kemenkeu.go.id (Aceh 2004)
- tirto.id dan kpai.go.id (LNHAM 2026)
