# Pertanyaan pemilik yang terbuka

Halaman ini mendaftar pertanyaan pemilik yang belum dijawab beserta bawaan sementaranya.

## Tangga

Sumber: `KEPUTUSAN-TANGGA.md`.

- Q1 sumber pemetaan ZOM ke kabupaten: belum diputuskan (bawaan sementara: musim tampil tingkat nasional tanpa tingkat).
- Q2 pemetaan peringkat 0 sampai 3 untuk pernyataan yang bukan Waspada, Siaga, atau Awas: belum diputuskan (bawaan sementara: dipakai hanya untuk sinyal).
- Q4 sinyal gabungan BMKG dan prediksi kita: belum diputuskan (bawaan sementara: tidak ada, sampai ada uji balik).
- Q5 SPI diberi peringkat untuk sinyal: belum diputuskan (bawaan sementara: tampil tanpa peringkat).
- Q6 tabel kecamatan ke kabupaten untuk nowcast: belum diputuskan (bawaan sementara: tingkat provinsi, nama kecamatan di teks).
- Q7 jadwal tiap 3 jam untuk `tangga.py`: belum diputuskan (bawaan sementara: dirantai harian di `jalan.py giliran`).
- Q8 sumber anak tangga jam untuk ancaman kering: belum diputuskan (bawaan sementara: kosong, "belum ada data").
- Q9 ringkasan peringatan kekeringan per kecamatan ke tingkat tertinggi per kab: belum diputuskan (bawaan sementara: dipakai).
- Q11 penarikan sumber jam dari situs live di workflow: belum diputuskan (bawaan sementara: gagal-lunak, basi dilewati).
- Q3 (anak tangga sepekan) dan Q10 (Hujan Lebat dipetakan ke peringkat) sudah dijawab dan dijalankan.

## Prakiraan lawan Kejadian

Sumber: `KEPUTUSAN-PREDIKSI-KEJADIAN.md`.

- Q1 laporan warga yang belum diperiksa BPBD ikut dihitung "terjadi": belum diputuskan (bawaan sementara: semua kecuali `tidak_valid` dihitung, titiknya bertanda "belum diperiksa").
- Q2 kematangan kotak "Belum ada laporan": belum diputuskan (bawaan sementara: 3 hari; sebelumnya "menunggu laporan").
- Q3 staf yang boleh melihat titik laporan di Dalops: belum diputuskan (bawaan sementara: semua sesi staf yang sudah boleh membuka `/api/dalops/*`).
- Q4 tab Karhutla di Dalops dibandingkan dengan FIRMS atau hanya logbook: belum diputuskan (bawaan sementara: logbook dan laporan saja; FIRMS tetap di rapor `/prediksi`).

## Tab Besok

Sumber: `KEPUTUSAN-BESOK.md`. tidak ada pertanyaan terbuka baru; Q1 sampai Q5 sudah dijawab pada 19 November 2026 (K12 sampai K16). Hal yang tetap belum dikerjakan: formulir Konfirmasi belum menerima gelombang dan angin (K15), siklon BMKG belum masuk "Perlu tindakan" (K16), abrasi tidak diprediksi harian (K9).
