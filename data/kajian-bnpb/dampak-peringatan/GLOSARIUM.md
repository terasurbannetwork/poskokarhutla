# GLOSARIUM: Dampak peringatan dini

| Istilah | Arti di modul ini |
| --- | --- |
| Peringatan aktif | peringatan CAP BMKG yang waktu selesainya belum lewat dan umpannya segar (paling lama 3 jam) |
| Poligon | cincin `[[lon,lat],...]` dalam peringatan CAP |
| Keterpaparan | penduduk atau fasilitas yang berada di dalam poligon; bukan korban, bukan yang pasti kena |
| Kab tersentuh | kab yang batasnya berpotongan dengan poligon peringatan yang bahayanya cocok |
| Tiga sumber jiwa | WorldPop per kecamatan, Dukcapil per desa, GHSL; berdampingan, tidak dijumlah dan tidak dirata-rata |
| Kelas bahaya | rendah, sedang, tinggi dari raster InaRISK dengan batas 0,33 dan 0,66; tak terliput berdiri sendiri |
| P | tingkat prakiraan kita 0 sampai 3, maksimum tiga hari ke depan, dari `prediksi.json` |
| R | tingkat peringatan BMKG aktif di kab itu, 0 sampai 3 dari `severity` |
| E | pemicu, maksimum P dan R |
| K | kelas bahaya kab untuk baris matriks status |
| Status prakiraan Centurisk97 | status empat tingkat per kab per bahaya, terpisah dari BMKG dan dari status darurat kepala daerah |
| Normal | tingkat 0; tidak ada pemicu di atas ambang dalam 3 hari menurut prakiraan kita dan BMKG; bukan jaminan keselamatan |
| Belum terukur | abu; sebagian sumber belum masuk atau basi |
| Sebagian sumber | tanda: tingkat tampil dari sumber yang ada, sumber lain hilang |
| Hipotesis | pil: status belum lolos gerbang uji balik |
| Gerbang | `scripts/umum/gerbang.py`; `boleh_tampil` bila model mengalahkan pembanding dengan selang 95 persen |
| Sidik | pra-registrasi kriteria uji, `scripts/umum/sidik.py`; tidak boleh diubah sesudah uji dibuka |
| Alarm | status paling sedikit Siaga (tingkat 2) untuk uji balik |
| Saklar Alun-alun | pilihan dua arah Kejadian dan Peringatan di peta Alun-alun `/lapor` |
| Lapisan bersama | modul `public/inti/dampak_peringatan.js`, dinyalakan per bencana lewat `kemampuan.layar.status_dampak` |
| Status taktis karhutla | status 4 tingkat per kluster dari `scripts/data/aturan.py`, pemicu karhutla (D26), kode `KHT` di paket ini |
| Penduduk di area peringatan BMKG | angka baru paket ini, terpisah dari `jiwa` kab dan "jiwa terpapar" aturan dampak (D31) |
| Tabel kelas nasional | `public/data/kelas_bahaya_kab.json`, kelas bahaya 514 kab, bulanan (D34) |
| Tanggal sasaran | hari 0 (hari ini) sampai +3; satuan status dan uji balik |
| `tak_dipetakan` | jenis peringatan BMKG yang belum punya bahaya kita |
| Keluaran jam-jaman | `ringkas.json`, `status.json`, `desa/<kab4>.json` di R2 |
| Arsip status | satu baris per kab per hari, append-only, bahan uji prospektif |
