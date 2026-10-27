# Pengungkapan lab_genangan_radar (28 Okt 2026)

Run pertama `lab_genangan_radar.py jalan` (28 Okt 2026) membaca `petabencana_laporan.json` mentah, termasuk laporan di
jendela kejadian UJI J3 (`PRAREG-J3.md`: 2024-08, 2025-04), tanpa lewat penjaga `muatLabel`. Run itu menghitung skor
radar (CSI, AUC) dan jumlah kecamatan berlaporan untuk lintasan 2024-08-08, 2024-08-20, dan 2025-04-17.

- Yang terbaca hanya hitungan per kecamatan untuk menilai radar; tidak ada daftar kecamatan yang dilihat manusia,
  dan tidak ada angka yang dipakai menyetel apa pun di M1, J3, atau lab ini.
- Keluaran run itu dihapus sebelum di-commit; sha-nya tidak tercatat (skrip belum memanggil `catat_jalan`).
- Lintasan 2024-08-20 dihapus dari cache `data/raw/banjir/lab_radar/`.
- Sesudahnya skrip diberi penjaga `jendela_j3()` / `tanpa_j3()` / `kena_j3()` yang membaca jendela dari `KEJADIAN_J3`
  di `genangan/mesin.mjs` dan membuang laporan di jendela itu sebelum dihitung; mode `uji` mengujinya.
- Berkas kriteria `lab_genangan_radar.json` disunting sesudah run pertama, hanya kunci `catatan_pra_registrasi_j3`
  (ambang dan metode tidak berubah), sehingga `kriteria_sha` berubah.
- Vonis lab (GAGAL) sama sebelum dan sesudah perbaikan.

Catatan ini sengaja TIDAK ditulis ke `PRAREG-J3.md`, karena berkas itu masuk sidik `kunci_j3.py`; menyuntingnya
mengubah sidik jangkar. Pemilik yang memutuskan apakah pengungkapan ini perlu masuk ke sana.
