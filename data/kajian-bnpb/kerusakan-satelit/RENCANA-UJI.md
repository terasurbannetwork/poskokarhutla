# RENCANA-UJI: Perkiraan kerusakan satelit

| No | Uji | Perintah bukti | Kriteria terima |
| --- | --- | --- | --- |
| T1 | Kriteria terkunci: sidik berkas kriteria tertulis di vonis; berubah berarti vonis tidak sah. | `python3 scripts/siklus/kerusakan_uji.py uji` | hijau |
| T2 | Uji balik banjir: satuan (kabupaten, kejadian), n uji, kejadian terkunci sebelum citra, pemisahan kalibrasi dan uji, plasebo, naif terkuat (termasuk luas kab dan kedalaman hujan). | `python3 scripts/siklus/kerusakan_uji.py banjir` | vonis tertulis; gagal pun dilaporkan apa adanya |
| T3 | Karhutla: vonis tetap menunggu uji selama Q9 terbuka; tidak ada angka. | `node --test tests/siklus/kerusakan_vonis.test.mjs` | hijau |
| T4 | Vonis gagal atau menunggu: API tidak mengembalikan angka (bukan 0). | `node --test tests/siklus/kerusakan_vonis.test.mjs` | hijau |
| T5 | Gempa selalu gagal sampai berkas kriteria baru dikunci. | uji yang sama | hijau |
| T6 | Rute: auth lebih dulu, hak per peran, terima menolak bila vonis bukan lulus, menolak tingkat tanpa isian staf. | `npm run uji:warga` | hijau |
| T7 | Migrasi CHECK: tabel dibangun ulang tanpa kehilangan baris, indeks ada, tiga pemicu pembeku `sk_jpb_beku_*` ada dan menolak ubah pada Jitupasna final, aman dijalankan dua kali. | `npm run uji:warga` (uji migrasi) | hijau |
| T8 | Rekap resmi `rekapTingkat` tidak berubah oleh baris terima; baris `satelit_diterima` tidak pernah dijumlah dengan `rekap_rumah_rusak` (total terpisah, selisih tertulis). | `npm run uji:warga` | hijau |
| T9 | Tidak ada berkas tingkat bangunan di `public/`. | `grep -rl bangunan_ public/ ; npm run uji:siklus` | tidak ada |
| T10 | Layar: kartu tanpa sel angka saat bukan lulus; label dan tanggal citra tampil saat lulus; klik tidak membekukan. | `npm run uji:siklus`, `tinjau lokal` | hijau; tinjau di `http://localhost:8800/siklus` |
| T11 | Gerbang paket, peta data, kartu standar. | `npm run uji:agen` | hijau |

Pemeriksa: validasi-model (T1 sampai T5), guard-api dan security-reviewer (T6), migrasi-idempoten (T7), selera-angka dan inp-reviewer (T10).
