# PRD: Rantai Kejadian, Kalender Kewajiban, Rapor SPM

Versi 1, 10 Nov 2026. Lingkup mengikuti KEPUTUSAN-RANTAI.md. Fitur di luar daftar ini tidak dibuat.

## 1. Masalah

1. Satu kejadian meninggalkan jejak di banyak tempat (Logbook, kaji cepat, logistik, DSP, rehab) yang tidak saling tahu. Pimpinan tidak bisa menjawab "kejadian ini macet di mana".
2. Tenggat hukum BPBD (laporan hibah, setor sisa, peninjauan RPBD, penilaian Destana) ada di peraturan, belum di layar siapa pun. Jam Aturan baru menghitung tenggat per catatan meja, belum per BPBD dari tanggal jangkar.
3. SPM sub-urusan bencana sudah punya Juklak 4 sampai 7 tahun 2026, tetapi tidak ada alat ukur. Rapor Kinerja yang ada tidak mengukur SPM.

## 2. Pengguna

| Peran | Butuh |
| --- | --- |
| Pimpinan BNPB (staf berperan) | Daftar kejadian, tahap macet, corong per tahap, per wilayah |
| Petugas BPBD kabupaten (kode meja) | Tautkan catatan ke KIB; lihat kalender dan rapor SPM kabupatennya sendiri |
| Admin BNPB | Semua wilayah, dummy, tandai tahap tidak berlaku |
| Publik | Tidak ada akses |

## 3. Fitur

### F-RT Rantai Satu Kejadian
- RT-F1. Tautkan catatan meja (kaji cepat, logistik, DSP, rehab) ke KIB kejadian. Satu catatan satu KIB.
- RT-F2. Delapan tahap per KIB: penilaian awal, kaji cepat, SK status, posko, logistik, DSP, Jitupasna, hibah RR. Status tiap tahap: belum mulai, berjalan, selesai, tidak berlaku, macet.
- RT-F3. Daftar kejadian terurut dari yang paling lama macet; corong jumlah kejadian per tahap; filter wilayah, jenis, tahap.
- RT-F4. Detail satu KIB: garis waktu tahap, tanda macet beserta alasan dan pasalnya, tautan ke catatan sumber.
- RT-F5. Tandai tahap "tidak berlaku" dengan alasan (mis. kejadian tanpa DSP).
- RT-F6. Saran penautan: kejadian satu kabupaten dengan tanggal berdekatan; tidak pernah otomatis.

### F-KW Kalender Kewajiban per Daerah
- KW-F1. Satu daftar kewajiban per BPBD: jatuh tempo, sisa hari, status (lewat, dekat, ada waktu, terpenuhi), pasal dan halaman.
- KW-F2. Sumber ganda: turunan dari meja yang sudah ada (DSP, renkon, Destana) dan dari jangkar tanggal yang diinput (SPPH, PHD, akhir pelaksanaan, penetapan RPBD, akhir pelatihan).
- KW-F3. Catat "terpenuhi" dengan tanggal (bukan isi laporan; isi tetap di E-Pelaporan BNPB).
- KW-F4. Rekap staf: BPBD dengan kewajiban lewat tenggat, per kunci kewajiban.
- KW-F5. Label asumsi untuk ambang tanpa pasal, sama seperti Jam Aturan sekarang.

### F-SPM Rapor SPM BPBD
- SPM-F1. Blok `spm` pada Rapor Kinerja per kabupaten, terpisah dari skor komposit.
- SPM-F2. Indikator Juklak 6/2026: waktu respons (25 menit), waktu tempuh (150 menit), laporan akhir (14 hari), dari catatan meja `spm_respons`.
- SPM-F3. Indikator Juklak 7/2026: jumlah sosialisasi tatap muka per tahun dari meja `spm_kie`, dibandingkan target 2x atau 1x bila kelas risiko diketahui.
- SPM-F4. Juklak 4 dan 5 tahun 2026 ditampilkan sebagai "belum ada angka di juklak", bukan skor.
- SPM-F5. Tiap angka menampilkan jumlah kasus (n), bukan hanya persen.

## 4. Larangan

- Tidak membuat dasar hukum di tiap keputusan, Keadaan Tertentu, atau penjaga status peraturan (D5).
- Tidak menerima isi laporan hibah, DSP, atau RPBD; hanya tanggal dan status.
- Tidak mengarang tenggat untuk tahap tanpa pasal.
- Tidak menggabungkan skor SPM ke skor komposit tanpa keputusan pemilik (Q14).
- Tidak menampilkan rantai atau rapor ke publik.
- Tidak menyentuh meja `pengaduan` atau identitas pelapor.
- Tidak membuka akses D1 di luar `src/hak.js`.

## 5. Kriteria berhasil

- Pimpinan memilih satu kejadian dan melihat tahap macet beserta alasan dalam satu layar.
- Setiap angka tenggat di Kalender punya pasal dan halaman yang bisa dibuka, atau label asumsi.
- Setiap persen di Rapor SPM disertai n.
- Gerbang `gerbang-jam-aturan`, `gerbang-d1`, `gerbang-dummy`, dan uji integrasi paket ini hijau.
