# Modifikasi cuaca dan evaluasi sortie

Halaman ini menjelaskan penarikan jadwal operasi resmi BMKG dan evaluasi sortie modifikasi cuaca.

## M12. Modifikasi cuaca: jadwal resmi BMKG dan evaluasi sortie

- **Jadwal resmi BMKG** (`scripts/omc/bmkg_omc.py`): halaman `bmkg.go.id/cuaca/modifikasi-cuaca` dibaca dari blok `__NUXT_DATA__`, baris disimpan apa adanya ditambah kode BPS provinsi di `public/udara/data/omc_bmkg.json`. Sumber tidak memuat sortie, kilogram, atau hasil hujan, dan itu tidak dikarang dari sumber lain. Gagal-ambil berarti berkas lama dibiarkan (gagal-lunak). Dijalankan di rantai `arsip-bmkg.yml` (tiap 3 jam).
- **Arsip evaluasi** (`scripts/omc/panen.py`): PM2,5 stasiun BMKG, METAR IEM, dan ringkasan titik panas per jam UTC di `omc_arsip.json`, disimpan 180 hari, isi mundur 30 hari. Sumber gagal sendiri-sendiri tidak menghapus yang lain; format berubah berarti sumber itu gagal keras; stasiun kurang dari 10 dianggap format berubah.
- **Evaluasi sortie** (`scripts/omc/nilai.py`): selisih-dalam-selisih (DiD) antara stasiun sasaran dan kontrol, dibandingkan pita variasi harian (basis 30 hari, minimal 10), lalu dikalibrasi uji plasebo.
  - Kontrol: stasiun 50 sampai 400 km dari sasaran dengan korelasi 72 jam sebelumnya minimal 0,5 (minimal 24 pasangan).
  - Jendela efek (HIPOTESIS kerja): dry ice sensitivitas 1, 3, 6 jam (utama 3); NaCl 3, 6, 12 jam (utama 6). Metrik: dry ice PM2,5 dan jarak pandang, NaCl frekuensi jam hujan. Radius sasaran: dry ice 40 km, NaCl 100 km (cadangan 75 dan 150 km).
  - Kategori hasil: sejalan, tak terbedakan, berlawanan, data kurang. "Sejalan" butuh arah sesuai dugaan pada 2 dari 3 jendela, DiD melewati ambang, nilai di luar pita variasi harian pada hari tanpa OMC, tanpa bendera pengganggu (sensor mati, sensor jenuh, hujan di sasaran, hujan alami di kontrol, titik panas berubah, radius diperluas), episode final, dan ambang lolos uji plasebo.
  - **Plasebo** meniru prosedur penuh pada tanggal semu tanpa OMC (1 sampai 40 hari ke belakang). Lolos bila minimal 30 tanggal unik DAN batas atas Clopper-Pearson satu sisi 95% dari laju "sejalan" palsu paling tinggi 10% (`nilai.py:45-46`).
  - **Status saat ini**: berkas `omc_hasil.json` mencatat 97 sortie, tetapi plasebo belum terkalibrasi (n = 0), sehingga tidak ada episode berstatus sejalan. Kalimat baku di keluaran: "Hasil ini menilai apakah perubahan sejalan dengan dugaan efek. Kesesuaian lokasi atau waktu dengan sasaran belum membuktikan sebab-akibat."
- **Analisis efek hujan** (`scripts/omc/efek.py`, lokal, butuh numpy, bukan pipeline): regresi efek tetap, permutasi, plasebo, daya minimum terdeteksi (MDE) dengan aturan pra-registrasi di `data/laporan-bnpb/omc/riset/PRAREG-EFEK-OMC.md`; hasil sementara MDE sekitar 106%, artinya desain tidak informatif. `verifikasi.py` membandingkan klaim hujan dalam rekap dengan CHIRPS prelim dan METAR (cocok bila rata-rata kabupaten 1 mm atau lebih atau METAR mencatat hujan; lemah 0,1 sampai 1 mm).
- **Pembanding laporan internal** (`banding_dalops.py`): menyandingkan laporan PDF harian dengan jadwal BMKG per tanggal dan provinsi (cocok, hanya_dalops, hanya_bmkg). Karena repo publik, keluaran ke dalam repo ditolak.
