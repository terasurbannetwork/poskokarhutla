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
- **Q6:** dampak radius untuk kejadian logbook butuh pencari koordinat dari nama desa. **[bawaan]** belum dibuat.
