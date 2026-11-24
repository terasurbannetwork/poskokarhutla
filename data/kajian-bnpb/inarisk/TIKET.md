# Tiket

Dikerjakan urut. Tiap tiket layar ditinjau pemilik di `http://localhost:8800/bnpb/inarisk`.

| Tiket | Cakupan | Bukti selesai |
| --- | --- | --- |
| IR-01 | `scripts/bnpb/inarisk.py`: tarik + bangun + `--cek`; keluaran `public/data/inarisk/` | `--cek` hijau, berkas nyata ditulis |
| IR-02 | `public/bnpb/inarisk_hitung.js` + uji | `node --test tests/bnpb/inarisk_hitung.test.mjs` |
| IR-03 | `src/inarisk.js` proksi + rute halaman + opsi CSP `gis` | `tests/warga/inarisk_proksi.test.mjs`, `npm run uji:warga` |
| IR-04 | kerangka halaman + tab IRBI (filter, kartu, peta, peringkat) | layar 1440/390 |
| IR-05 | dialog detail IRBI + ringkasan PDF cetak | Langkat 231,47, peringkat 39, dulu 160 |
| IR-06 | tab IKD + dialog analisa | tabel 2025, analisa Langkat 0,30 Rendah |
| IR-07 | tab Web GIS: peta dasar, lapisan ArcGIS, gambar + dampak, Lapor Kegiatan | radius 1 km Yogyakarta membalas angka |
| IR-08 | tab Unduhan, Tautan, Metodologi, Tentang, Disclaimer | filter kategori dan halaman jalan |
| IR-09 | jadwal mingguan di workflow (`mekanik-mesin`), `bangun` hanya menulis bila berubah + `perubahan.json` (D16) | `inarisk.py --cek` (uji `beda`), workflow jalan sekali |
| IR-14 | dampak radius di `/lapor/meja` dan kejadian `/siklus` (F-15, D15) | kartu tampil untuk laporan berkoordinat, angka terisi di tinjau lokal |
| IR-11 | simulasi kapasitas (F-12) + rumus IKD di `inarisk_hitung.js` dan `--cek` | uji rumus IKD Langkat 0,30; rencana menutup selisih |
| IR-12 | risiko besok (F-13) | daftar dari prediksi.json, Tinggi di atas |
| IR-13 | dampak radius di kartu gunung api Dalops (F-14) + cache dampak di Worker | uji cache proksi; kartu Siaga menampilkan angka |
| IR-10 | fase 2 (menunggu Q3): lapisan ACEBS dan SPAB | - |
