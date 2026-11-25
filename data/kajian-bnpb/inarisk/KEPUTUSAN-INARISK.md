# Keputusan: Cermin InaRISK di `/bnpb/inarisk`

Dokumen ini menang atas semua dokumen lain di folder ini. Pertanyaan yang belum dijawab pemilik
ditulis dengan bawaan sementara bertanda **[bawaan]**, tidak dikarang.

## Keputusan pemilik

- **K1 (23 Nov 2026):** "Gw mau lu recreate INARISK", lalu "Lu tiru semuanya". Halaman yang ditunjuk:
  IRBI, IKD, Metodologi, Tentang, Disclaimer, Web GIS (dashboard Jakarta), Unduhan, Tautan.
- **K2 (23 Nov 2026):** "Lu ambil data yang relevan" dari InaRISK v4, inarisk2 (ACEBS, SPAB, STEP-A),
  pencegahan, portal, dan `gis.bnpb.go.id/server/rest/services`.
- **K3 (aturan tetap pemilik, 11 Nov 2026):** tidak ada data dummy di proyek mana pun.

- **K4 (23 Nov 2026):** "Gas" untuk tiga pengembangan: simulasi naik IKD, dampak radius di Dalops, IRBI dikali prakiraan besok.
- **K5 (23 Nov 2026):** dua lanjutan: tarikan mingguan otomatis dengan pemberitahuan bila angka berubah (IR-09), dan dampak radius
  untuk semua kejadian yang punya titik: rincian laporan `/lapor/meja` dan kejadian Buku Besar `/siklus`.
- **K6 (24 Nov 2026):** "gas lanjut semua yang tadi berhenti", jawaban atas daftar pengembangan 23 Nov butir 3 sampai 7:
  (3) prioritas IKD terlemah jadi bahan belanja masalah `/kemitraan`; (4) ACEBS dan SPAB dicermin (menjawab Q3 untuk dua
  sumber itu; DAS pencegahan dan 8 dashboard lain tetap menunggu); (5) uji IRBI lawan kejadian DIBI per kab, dipisah per dasar
  HV 2015 dan HV 2021; (6) lapisan bahaya InaRISK dipakai modul Misi Udara dan Siklus lewat tiket modulnya; (7) IRBI lawan
  dana DSP dan PFB tetap tertahan Q1 Pembiayaan Risiko (saldo hanya dari pemberi data resmi). Q6 dijawab: kejadian logbook
  diberi titik dari nama desa.

- **K7 (24 Nov 2026):** jawaban pemilik atas lima tindak lanjut K6, berurutan "Sebagai catatan", "Gas bagus", "Gausah", "Gas",
  "Gausah dulu": (1) raster InaRISK di Misi Udara dipakai sebagai catatan perhatian saja, tidak pernah larangan atau pembelok rute
  (Q18 paket `misi-udara/`, tiket MU-15); (2) lapisan InaRISK tampil di Peta Paparan `/siklus` (U22, tiket SK-114); (3) pencocokan
  pakar ulang `cocok_pakar --r2` untuk butir IKD tidak dijalankan sekarang; (4) titik pusat desa Dalops diunggah ke R2
  (`dalops_banjir --unggah`); (5) IRBI lawan dana DSP dan PFB tetap tertahan.

## Temuan yang mengubah arti "tiru semuanya"

Pembongkaran kode InaRISK (`IrbiPage-*.js`, 23 Nov 2026) menunjukkan tiga angka di layar IRBI
**bukan data**, melainkan rumus pengisi di kode klien:

| Angka di InaRISK | Asal sebenarnya | Kita |
| --- | --- | --- |
| Total populasi per kab (Langkat 1.807.250) | `75000 + 3 digit akhir pcode x 8450` | penduduk dari API `data-jiwa-terpapar` (Langkat 1.057.605) |
| Laki-laki 51,8%, perempuan 48,2% | konstanta, sama untuk 514 kab | tidak ditampilkan sampai ada sumber resmi (Q1) |
| Komponen nasional V dan C (258,92 dan 166,65) | V = skor H, C = skor + 18,7, tren C tetap 2,87 | kartu komponen tidak dibuat; diganti sebaran skor per jenis bahaya |
| "Terakhir diperbarui 24 Mei 2026" | teks bawaan bila API kosong | tanggal tarik pipeline kita |

Karena K3, angka pengisi itu **tidak ditiru**. Semua bentuk layar lain ditiru.

## Rancangan

- **D1:** satu halaman `/bnpb/inarisk` bertab: IRBI, IKD, Web GIS, Unduhan, Tautan, Metodologi,
  Tentang, Disclaimer. Tab lewat hash (`#ikd`), tanpa muat ulang.
- **D2:** data berat dan jarang berubah (IRBI 2015-2025, jiwa terpapar, IKD dan rekomendasi) dicermin
  pipeline `scripts/bnpb/inarisk.py` ke `public/data/inarisk/*.json`. Layar tidak memanggil InaRISK
  untuk tab IRBI dan IKD.
- **D3:** data hidup (daftar 18.853 berkas unduhan, hitung dampak radius dan poligon, titik Lapor
  Kegiatan) lewat proksi Worker `/api/inarisk/*` dengan daftar jalur yang diizinkan dan cache 1 jam.
- **D4:** kelas risiko memakai ambang yang sama dengan InaRISK (fungsi `Ie` di kode mereka):
  total 2025 Rendah < 14,67, Sedang <= 176, Tinggi > 176; total 2015-2024 Rendah < 13, Tinggi > 144;
  per bahaya Rendah < 5,33 (longsor 6,67, gunung api 4), Tinggi > 12 (longsor 15, gunung api 9).
- **D5:** grafik tren dipisah dua dasar: HV 2015 (9 bahaya, 2015-2024) dan HV 2021 (11 bahaya, 2025).
  Selisih antar dasar tidak dihitung sebagai naik atau turun.
- **D6:** Metodologi ditulis ulang dengan rumus dari Buku IRBI 2024 (R = H x V / C per bahaya, lalu
  dijumlah, hlm. 16-29). Rumus pangkat sepertiga di halaman InaRISK disebut sebagai rumus yang
  tertulis di situs itu, dengan catatan bedanya.
- **D7:** tampilan memakai kepala situs dan token Centurisk97 (`public/inti/tema.css`), bukan logo
  InaRISK. Tiap bagian menyebut "Sumber: InaRISK BNPB".
- **D8:** peta dasar Web GIS memakai OpenFreeMap dan citra Esri yang sudah dipakai situs, bukan ubin
  Google (syarat pakai Google tidak mengizinkan). Lapisan bahaya, kerentanan, risiko, dan kapasitas
  diambil dari ArcGIS `gis.bnpb.go.id` sebagai raster `exportImage` lewat proksi ubin bercache
  (server ArcGIS lambat dan sering 503; tiga layanan berkunci token dilewati).
- **D9:** titik Lapor Kegiatan dibuang nama petugasnya (`User Pemantau`) di proksi sebelum sampai ke
  peramban. Foto tetap tautan ke server BNPB.
- **D10:** "Unduh Ringkasan PDF" memakai cetak peramban (`window.print`) dengan gaya cetak dialog
  detail, tanpa pustaka PDF.

- **D11 (K4):** rumus IKD dari prioritas ditemukan dengan regresi atas 532 analisa (galat terbesar 0,0003, bobot berjumlah 1):
  IKD = 0,06 P1 + 0,06 P2 + 0,075 P3 + 0,105 P4 + 0,21 P5 + 0,35 P6 + 0,14 P7. Buku IRBI 2024 tidak menuliskannya; dipakai
  sebagai rumus terukur, bukan resmi, dan diuji ulang tiap tarik (`--cek`).
- **D12 (K4):** simulasi kapasitas: skor tiap bahaya dibagi kelas C (buku hlm. 28-29). Data 2025 menunjukkannya (banjir kelas 1
  terbanyak 26, kelas 2 terbanyak 13), tapi tidak persis untuk semua kab, jadi IRBI simulasi = IRBI x C lama / C baru berlabel
  "perkiraan". Rencana termurah = naikkan prioritas berbobot terbesar yang masih punya ruang, sampai melewati ambang.
- **D13 (K4):** IRBI x besok memakai `waspada` tenggang 1 dari `/prediksi/data/prediksi.json` (prakiraan kita, bukan BMKG).
  Padanan aturan ke kolom IRBI: banjir ke banjir, longsor ke longsor, karhutla dan asap ke karhutla, melaut ke abrasi,
  angin ke cuaca ekstrem. Urutan: kelas IRBI total Tinggi dulu, lalu skor bahaya padanannya. Tidak pernah menulis "aman".
- **D14 (K4):** kejadian logbook Dalops tidak berkoordinat (hanya nama desa), jadi dampak radius dipasang dulu di kartu gunung
  api Siaga dan Awas (berkoordinat puncak): radius 1, 5, 10 km dan radius larangan PVMBG. Hasil dampak dicache Worker 1 hari.
- **D15 (K5):** dampak radius 1, 5, 10 km dipasang di rincian laporan `/lapor/meja` (titik laporan) dan kejadian Buku Besar
  (`pusat_lat`, `pusat_lon`); tanpa titik, kartunya tidak tampil, tidak pernah nol. Kartu standar: tanpa kaki Sumber, sumber
  di `title` tabel. Kejadian logbook tanpa titik tetap menunggu Q6.
- **D16 (K5):** tarikan mingguan `inarisk.yml` (Selasa 04.45 UTC). `bangun` membandingkan dengan cermin lama dan menulis hanya
  bila berubah, ditambah `perubahan.json` (kalimat perubahan). Perubahan tampil di ringkasan run, anotasi peringatan, dan kaki
  tab IRBI. Angka yang dipatok ke layar InaRISK 23 Nov 2026 hanya diuji untuk tarikan tanggal itu; self-check data penuh menjaga
  bentuk (514 kab, semua tahun, rumus IKD), bukan nilai. Tahun IRBI dibaca dari data, jadi tahun baru ikut tanpa ubah kode.

- **D17 (K6):** SPAB dicermin per kab dari `inarisk2.../spab/api/get-data/{prov}` (kode kab Kemendagri, dicek lewat jumlah
  kecamatan Aceh 1101 = 18). Kab tanpa sekolah melapor tampil "belum ada data", tidak pernah 0. ACEBS tidak dicermin dulu:
  kode desa hanya 85,6% jatuh di poligon kab yang sama, di bawah ambang 95%; alamat dan titik per lokasi tidak pernah ke `public/`.
- **D18 (K6):** uji IRBI lawan DIBI: korelasi peringkat Spearman antar kab, IRBI tahun Y lawan DIBI tahun Y+1 (HV 2015) atau tahun
  sama (HV 2021, karena 2026 belum setahun), dibandingkan dengan persistensi (peringkat DIBI tahun Y). Hasil 24 Nov 2026: IRBI
  kalah dari persistensi di 10 dari 10 tahun HV 2015 untuk jumlah kejadian (rerata korelasi 0,10) dan korban (0,03); HV 2021
  korelasi kejadian -0,30. Jadi IRBI tidak dipakai sebagai alat prioritas kejadian tahun depan; tampil sebagai indeks InaRISK
  apa adanya, dengan uji ini di Metodologi berlabel "uji kami".
- **D19 (K6, Q6):** titik kejadian logbook dari nama desa hanya bila tepat satu desa dan satu kab dan nama cocok di kab itu
  (kecamatan bila ada); titik = pusat poligon desa, `dasar: "pusat_desa"`, berlabel perkiraan di layar; koordinat nyata tidak
  ditimpa. Cakupan logbook 2011-2026: 34,0% kejadian; Dalops 24 Nov 2026: 6 dari 187 (kebanyakan banyak desa).

## Pertanyaan terbuka

- **Q1:** sumber resmi penduduk per jenis kelamin per kab? **[bawaan]** tidak ditampilkan.
- **Q2:** halaman terbuka tanpa login atau khusus staf? **[bawaan]** terbuka tanpa login, `noindex`,
  tidak masuk menu utama (sama dengan `/bnpb/data-bencana`).
- **Q3:** ACEBS (8.755 titik), SPAB (19.144 sekolah), DAS pencegahan, dan 8 dashboard Web GIS lain
  ikut fase berikut? **[bawaan]** ACEBS dan SPAB jadi lapisan Web GIS di fase 2; DAS dan dashboard lain
  menunggu jawaban.
- **Q4:** STEP-A dan portal tidak dicermin: STEP-A tipis (banyak responden 0), portal butuh token.
  **[bawaan]** dilewati.

- **Q5:** teks bebas petugas di titik Lapor Kegiatan (Deskripsi, Lokasi) bisa memuat nama orang; nomor HP, email, dan NIK
  disamarkan mesin, nama tidak bisa. **[bawaan]** tetap ditampilkan, karena sudah publik di InaRISK.
- **Q6:** dampak radius untuk kejadian logbook butuh pencari koordinat dari nama desa. **[terjawab K6]** dibuat; titik desa
  berlabel perkiraan (pusat desa, bukan titik kejadian).


## Jawaban pemilik 25 Nov 2026

Pemilik: "gas semua bawaan". Semua pertanyaan terbuka di berkas ini yang punya bawaan sementara kini **diputuskan sesuai bawaannya**, kecuali yang tertulis di bawah. Rekap pertanyaan: `data/kajian-bnpb/PERTANYAAN-TERBUKA.md`.

