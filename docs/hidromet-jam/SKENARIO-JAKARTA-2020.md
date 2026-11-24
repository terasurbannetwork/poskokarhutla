# SKENARIO-JAKARTA-2020: cek sejarah genangan Jakarta (H33, A11)

Status 24 Nov 2026: **TIDAK DIJALANKAN**. Arsip resmi RW/kelurahan tergenang untuk 1 Jan 2020 tidak ada di repo, jadi
tidak ada pembanding resmi untuk dihitung (hit rate, false alarm ratio, CSI per RW). Sesuai TIKET H33, hasilnya adalah
alasan tertulis ini. Tidak ada angka skor yang dikarang.

## 1. Mesin yang bisa jalan tanpa menyentuh berkas beku

- Beku sidik J4 sampai Apr 2027: `public/banjir/sim_genangan.js`, `scripts/banjir/genangan/umum.py`
  (PETA-JALAN-MODEL-BANJIR §2 butir 4). Hanya boleh diimpor atau dijalankan apa adanya.
- Mesin headless: `scripts/banjir/genangan/mesin.mjs` (memuat `sim_genangan.js` lewat `vm`; DEM DEMNAS ~30 m; hujan jam
  `data/raw/banjir/genangan/hujan_jam/<kejadian>.json`; opsi `--hujan gsmap_dis`). Tanpa mengubah berkas beku, ia bisa
  dijalankan untuk `--kejadian 2020-01`. Tidak dijalankan di sini karena pembandingnya tidak ada.
- Masukan hujan: `hujan_jam/` hanya punya 2017-01, 2018-01, 2020-01, 2021-02, 2024-08, 2025-03, 2025-04.
  **2007 dan 2015 tidak punya masukan hujan di repo** (GSMaP harian mulai 2017-01-01; ERA5 cache mulai Des 2015), jadi dua
  skenario itu tidak bisa dijalankan.
- Lima pos BMKG (Halim 377, TMII 335, Kembangan 265, Pulo Gadung 260, Tomang 226 mm/hari) hanya tercatat sebagai angka di
  `docs/hidromet-jam/RISET.md`. Koordinat dan data per jam pos tidak ada di repo (DIAGNOSIS-J3 mengakui: stasiun titik
  tidak tersedia). Bila kelak dijalankan, interpolasi yang masuk akal: IDW (pangkat 2) dari lima pos ke kisi 0,1 derajat,
  bentuk jam dari IMERG 30 menit. Itu usulan metode, belum dikerjakan.

## 2. Pembanding resmi: tidak ada

| Sumber | Di repo? | Catatan |
| --- | --- | --- |
| Genangan RT/RW BPBD DKI (Pusdalops) 1-2 Jan 2020 | Tidak | Hanya lewat permohonan data resmi (`SUMBER-LABEL-J4.md`: bpbd.jakarta.go.id/permohonan-data), belum ada surat/jawaban. Tidak di-scrape. |
| Open data BPBD (gis-bpbd) | Tidak | Hanya agregat tahunan per kelurahan, dasbor tanpa unduhan. |
| data.jakarta.go.id / Satu Data Jakarta | Tidak | Belum terperiksa dari mesin ini (koneksi reset, catatan SUMBER-LABEL-J4); tidak jelas ada dataset RW 2020, jadi tidak diambil. |
| PetaBencana.id (`data/raw/banjir/genangan/petabencana_laporan.json`) | Ya, 249 laporan 1-2 Jan 2020 | **Bukan arsip resmi**: laporan warga/media (grasp 201, detik 48), bias pelapor, nol bukti kering. Kolom `rw` adalah `local_area_id` PetaBencana, bukan nomor RW, dan kosong pada 74 dari 249 laporan; tidak ada nama kelurahan. Tidak bisa diubah jadi daftar RW resmi, jadi tidak dipakai sebagai pembanding "resmi". |

## 3. Peringatan bila nanti dijalankan

- 2020-01 adalah salah satu empat kejadian KALIBRASI J3 (DIAGNOSIS-J3, `j3_vonis.json`: kalibrasi 2020-01 sudah dilakukan pada
  label PetaBencana). Skor 1 Jan 2020 pada mesin yang sudah disetel di kejadian itu bukan uji independen; angkanya
  optimistis. Skor di sana: AUC titik laporan 0,53-0,64 (lemah), POD sel jenuh tak informatif.
- Hasil cek sejarah ini tidak boleh dipakai menyetel apa pun yang beku; vonis J4 hanya dari uji prospektif.
- Unit RW: DEM 30-100 m dan tanpa poligon RW di repo; pemetaan sel ke RW butuh batas RW (BPS/Jakarta Satu) yang juga
  belum ada.

## 4. Yang dibutuhkan untuk membuka H33

1. Daftar RW/kelurahan tergenang 1-2 Jan 2020 dari BPBD DKI (permohonan resmi oleh pemilik) atau dataset publik yang
   terverifikasi di data.jakarta.go.id.
2. Poligon RW/kelurahan DKI.
3. Koordinat dan curah per jam lima pos BMKG (untuk interpolasi IDW), atau pakai IMERG/GSMaP yang sudah ada dan nyatakan
   bedanya.
4. Untuk 2007 dan 2015: hujan (ERA5 2007 tidak ada di cache; 2015 hanya Des) dan arsip RW yang sama.
Setelah itu tulis kriteria (tabel kontingensi per RW, ambang 10 cm = definisi TERGENANG mesin) SEBELUM data pembanding dibuka.
