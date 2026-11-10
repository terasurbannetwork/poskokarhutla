# GLOSARIUM

| Istilah | Arti di paket ini |
| --- | --- |
| KIB | Kode Identitas Bencana, 16 digit: kode BPS provinsi dan kabupaten, kode bencana DIBI, tanggal mulai WIB, indeks 1-9. Disimpan di `logbook_kib` |
| Rantai | Delapan jalur data satu KIB: awal, kaji, sk, posko, logistik, dsp, jitupasna, hibah |
| Jalur | Satu tahap dalam rantai; berdiri sendiri, tidak berurutan ketat |
| Macet pasal | Jalur melewati tenggat yang berpasal di Jam Aturan |
| Mandek | Jalur melewati ambang internal berlabel asumsi, bukan pasal |
| Tidak berlaku | Jalur ditandai admin tidak relevan untuk kejadian itu, dengan alasan |
| Jangkar | Tanggal masukan (SPPH, PHD, akhir pelaksanaan, penetapan RPBD, akhir pelatihan) yang menjadi titik hitung tenggat Kalender |
| Terpenuhi | Kewajiban dikerjakan di luar sistem; hanya tanggalnya dicatat |
| Periksa | Status setor sisa dana lewat batas tetapi belum dikonfirmasi ada tidaknya sisa dana |
| SPPH | Surat Penetapan Pemberian Hibah (Juklak 9/2024) |
| PHD | Perjanjian Hibah Daerah (Juklak 9/2024) |
| Hibah RR | Hibah Rehabilitasi dan Rekonstruksi pascabencana (Perban 4/2024) |
| RKUN | Rekening Kas Umum Negara, tujuan setor sisa dana hibah |
| RPBD | Rencana Penanggulangan Bencana Daerah (Perban 3/2026) |
| SPM | Standar Pelayanan Minimal sub-urusan bencana kabupaten/kota |
| PPE | Pencarian, pertolongan, dan evakuasi korban bencana (Juklak 6/2026) |
| KIE | Komunikasi, Informasi, dan Edukasi rawan bencana (Juklak 7/2026) |
| Waktu respons | Menit sejak informasi/laporan kedaruratan diterima sampai unit PPE siap diberangkatkan; paling lama 25 |
| Waktu tempuh | Menit sejak unit dikerahkan sampai tiba di lokasi; paling lama 150, ditetapkan tanpa memperhitungkan hambatan |
| Meja | Satu formulir bertahap di Meja Kerja (`src/meja_spek.js`) |
| Jam Aturan | `public/inti/jam_aturan.json`, satu-satunya tempat angka tenggat dan ambang |
| E-Pelaporan | Aplikasi BNPB untuk laporan hibah RR; di luar sistem ini |
| n kecil | Kurang dari 5 kasus; persen tidak ditampilkan |
