# Glosarium

| Istilah | Arti |
| --- | --- |
| InaRISK | Indonesia Risk Management, platform informasi risiko bencana BNPB (`inarisk.bnpb.go.id`) |
| IRBI | Indeks Risiko Bencana Indonesia; jumlah skor risiko per jenis bahaya di satu kab/kota |
| H | bahaya (hazard): kemungkinan kejadian bahaya, kelas 1-3 dikali bobot jenis bahaya |
| V | kerentanan (vulnerability): jiwa terpapar, kerugian rupiah, kerusakan lingkungan |
| C | kapasitas (capacity): kelas dari IKD |
| IKD | Indeks Ketahanan Daerah; 71 indikator dalam 7 prioritas, nilai 0-1 |
| P1-P7 | tujuh prioritas IKD, dari kebijakan dan kelembagaan sampai pemulihan |
| HV 2015, HV 2021 | dasar kajian bahaya dan kerentanan; 2015 (9 bahaya) untuk 2015-2024, 2021 (11 bahaya) untuk 2025 |
| `fix_values` | skor total IRBI yang dipakai InaRISK; bila kosong dipakai `total` |
| `pembanding` / SEB_60 | skor pembanding 2025 yang disebut "skor sebelumnya" di tabel InaRISK |
| pcode | kode wilayah Kemendagri; 2 digit provinsi, 4 digit kab/kota |
| Jiwa terpapar | penduduk di wilayah kelas bahaya tertentu |
| KRB | Kawasan Rawan Bencana |
| ACEBS | titik lokasi yang dinilai kerentanannya (inarisk2), dicermin di fase 2 |
| SPAB | Satuan Pendidikan Aman Bencana |
| Posgagah | sumber titik Lapor Kegiatan dan Sosialisasi di Web GIS InaRISK |
| Cermin | salinan data InaRISK yang ditarik pipeline ke `public/data/inarisk/` |
| Proksi | rute Worker `/api/inarisk/*` yang meneruskan permintaan terbatas ke InaRISK |
