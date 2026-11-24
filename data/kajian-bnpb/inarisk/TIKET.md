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
| IR-10 | SPAB per kab (`spab.json`, 474 kab bersekolah melapor) + kartu "Sekolah aman di daerah risiko tinggi" di tab IRBI (D17); ACEBS DITAHAN: kode desa cocok poligon kab hanya 85,6% (< 95%) | `inarisk.py --cek`, `tests/bnpb/inarisk_spab.test.mjs` |
| IR-15 | uji IRBI lawan kejadian DIBI per kab (`uji_dibi.json`, tab Metodologi), dipisah HV 2015 dan HV 2021, lawan pembanding persistensi (D18) | `inarisk.py --cek` (Spearman fixture) |
| IR-16 | titik perkiraan pusat desa untuk kejadian logbook dan Dalops (Q6, D19): `scripts/siklus/titik_desa.py`, `bersih_logbook.py`, `dalops_banjir.beri_pusat`, tabel dampak di Histori Dalops dan kartu /siklus | `titik_desa.py uji`, `dalops_banjir.py --uji`, `tests/bnpb/dalops*` |
| IR-17 | ACEBS: cari tahu sebab 14,4% kode desa tak cocok (kode BPS lawan Kemendagri, pemekaran) sebelum dicermin | - |
