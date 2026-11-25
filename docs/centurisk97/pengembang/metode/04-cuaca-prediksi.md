# Metode cuaca, udara, prediksi

Status uji balik tiap metode pada modul ini. Arti status ada di [ringkasan status](/docs/pengembang/metode/ikhtisar).

## 06. Cuaca, kualitas udara, asap, modifikasi cuaca, dan peluang semai awan

| Metode | Status | Catatan |
| --- | --- | --- |
| [M1. Status cuaca 72 jam per kecamatan](/docs/pengembang/cuaca-udara) | Hipotesis | Status cuaca 72 jam; ambang tidak terbukti lebih baik dari kebiasaan kabupaten dan bulan. |
| [M2. Nowcast peringatan dini BMKG (CAP)](/docs/pengembang/cuaca-udara) | Bukan model | Pernyataan resmi BMKG apa adanya. |
| [M3. Prakiraan PM2,5 72 jam per kabupaten/kota](/docs/pengembang/cuaca-udara) | Tidak dinyatakan | CAMS mentah, tanpa koreksi stasiun. |
| [M4. Jiwa terpapar, kelompok rentan, dan ISPA](/docs/pengembang/cuaca-udara) | Tidak dinyatakan |  |
| [M5. Atribusi sumber PM2,5 (api, PLTU, latar)](/docs/pengembang/cuaca-udara) | Hipotesis | Model plume tunak melebihi CAMS di sebagian kota-hari. |
| [M6. Telusur asal asap (lintasan mundur)](/docs/pengembang/cuaca-udara) | Tidak dinyatakan |  |
| [M7. Peluang PM2,5 melewati batas status](/docs/pengembang/cuaca-udara) | Tidak dinyatakan | Sensitivitas asumsi asap, bukan galat CAMS. |
| [M8. Lintasan asap 72 jam dan asap lintas batas](/docs/pengembang/cuaca-udara) | Hipotesis |  |
| [M9. Tutupan asap kabupaten, musim asap, dan hari tinggi](/docs/pengembang/cuaca-udara) | Hipotesis | Belum diuji ke citra satelit. |
| [M10. Pengukuran stasiun dan satelit pembanding](/docs/pengembang/cuaca-udara) | Bukan model | MOS PM2,5 berstatus gagal pada uji saat ini. |
| [M11. Himawari: titik panas, alarm, dan awan](/docs/pengembang/cuaca-udara) | Hipotesis | Belum diuji terhadap kejadian. |
| [M12. Modifikasi cuaca: jadwal resmi BMKG dan evaluasi sortie](/docs/pengembang/cuaca-udara) | Belum diuji | Evaluasi OMC belum terkalibrasi (n plasebo 0). |
| [M13. Peluang semai awan: data masukan](/docs/pengembang/cuaca-udara) | Bukan model |  |
| [M14. Peluang semai awan: turunan, gerbang, faktor, skor](/docs/pengembang/cuaca-udara) | Hipotesis | Bobot dan ambang zona semai berstatus HIPOTESIS. |
| [M15. Prakiraan asap 24 jam dan peringatan lintas batas (mode semai)](/docs/pengembang/cuaca-udara) | Hipotesis | Tingkat beban asap hipotesis. |
| [M16. Satelit hilang, data basi, dan ringkasan teks](/docs/pengembang/cuaca-udara) | Bukan model |  |
| [M17. Uji prospektif peluang semai (terdaftar, belum berjalan)](/docs/pengembang/cuaca-udara) | Belum diuji | Terdaftar, belum berjalan. |

## 07. Prediksi bencana: Tangga, Besok, dan Prakiraan lawan Kejadian

| Metode | Status | Catatan |
| --- | --- | --- |
| [Pembekuan prakiraan (catat.py)](/docs/pengembang/prediksi) | Bukan model | Arsip hanya bertambah. |
| [Penilaian prospektif (nilai.py)](/docs/pengembang/prediksi) | Bukan model | Pada audit 23 November 2026 semua kode berstatus belum teruji. |
| [Kalibrasi peluang (kalibrasi.py)](/docs/pengembang/prediksi) | Tidak dinyatakan | Gagal-tertutup: bila belum lolos uji tahan, angka mentah dipakai. |
| [Koreksi bulanan banjir (koreksi.py)](/docs/pengembang/prediksi) | Tidak dinyatakan | Gagal-tertutup: bila belum lolos uji tahan, angka mentah dipakai. |
| [Penerbitan dan aturan "perlu tindakan" (terbit.py, aturan.json)](/docs/pengembang/prediksi) | Belum diuji | Berpil perkiraan, belum diuji balik. |
| [Level sel tampilan (besok_inti.js)](/docs/pengembang/prediksi) | Bukan model |  |
| [Model bayangan (scripts/prediksi/bayangan/model.py)](/docs/pengembang/prediksi) | Hipotesis | Dinilai dengan label dan aturan yang sama dengan model lama. |
| [Kalender risiko dan bulan rawan](/docs/pengembang/prediksi) | Campuran | Longsor dan kekeringan tidak lulus dan tampil hipotesis. |
| [Metode Tangga (tangga.py)](/docs/pengembang/prediksi) | Belum diuji | Sinyal belum diuji balik. |
| [Metode Prakiraan lawan Kejadian (rancangan, belum dikode)](/docs/pengembang/prediksi) | Rancangan | Belum dikode. |
