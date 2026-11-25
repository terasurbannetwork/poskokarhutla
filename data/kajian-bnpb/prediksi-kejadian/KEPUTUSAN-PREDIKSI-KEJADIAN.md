# KEPUTUSAN-PREDIKSI-KEJADIAN: prakiraan /prediksi masuk Dalops dan dibandingkan dengan kejadian nyata

Dokumen ini menang atas semua dokumen lain di folder ini. `data/kajian-bnpb/prediksi-besok/KEPUTUSAN-BESOK.md` (isi prakiraan) dan `data/kajian-bnpb/cek-kabar/KEPUTUSAN-CEK-KABAR.md` (kejadian Dalops) tetap berlaku dan tidak dilonggarkan.

## Keputusan pemilik (20 Nov 2026)

| No | Keputusan |
| --- | --- |
| K1 | Prakiraan halaman `/prediksi` dibandingkan dengan laporan kejadian yang sebenarnya, dari Dalops (logbook Pusdalops) dan dari masyarakat (Lapor Bencana). |
| K2 | Prakiraan dimasukkan ke `/bnpb/dalops`, dan perbandingannya tinggal di Dalops ("Gas aja. Gw ikut lu"). |
| K3 | Jendela pencocokan boleh lewat satu hari: kejadian yang mulai sehari sebelum sampai sehari sesudah tanggal prakiraan dihitung cocok. |
| K4 | Prakiraan di Dalops diganti total ke `prediksi.json`; Dalops tidak lagi membaca prakiraan dari `/banjir/data/status.json`. |
| K5 | Laporan warga dan BPBD dari Lapor Bencana tampil sampai titik di peta Dalops (hanya layar staf). |
| K6 | Tombol pindah sisi panel (↔) dihapus dari `/lapor/meja`, dan tidak dipasang di layar dasbor mana pun. |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Prakiraan tetap satu mesin: `scripts/prediksi/**` menulis `prediksi.json` dan `lalu.json`; Dalops hanya membaca. Tidak ada salinan aturan level di Dalops. | K4; dua mesin memberi dua angka untuk kab yang sama. |
| D2 | `/prediksi` tetap ada sebagai layar prakiraan tanpa data laporan. Perbandingan dengan laporan hanya di Dalops. | Laporan warga tidak pernah tampil publik (paket `lapor-ai`). |
| D3 | Pasangan jenis Dalops dan kode prakiraan: banjir = `BNJ`; longsor = `LSR`; cuaca = `CEX`; gelombang = `GEL` dan `ROB`; udara = `ASP`; karhutla = `API`. Gempa, kekeringan, permukiman, gunung api tanpa prakiraan harian (`pra: false` tetap). | Hanya kode yang memang ada di `prediksi.json`. |
| D4 | "Diprakirakan" = level sel >= 2 (Siaga ke atas), memakai aturan level sel `prediksi-besok/ALGORITMA.md`. Level 1 tampil sebagai Waspada tetapi tidak dihitung diprakirakan. | Sama dengan angka pil bencana di `/prediksi`. |
| D5 | "Terjadi" = ada kejadian Dalops jenis itu di kab itu dengan tanggal mulai di dalam jendela K3, ATAU laporan Lapor Bencana jenis itu di kab itu yang tidak berstatus `tidak_valid`, dengan waktu kejadian di jendela yang sama. Kejadian yang mulai sebelum jendela dan masih berlangsung tidak dihitung terjadi (tampil "masih berlangsung"). | Prakiraan menebak kejadian baru, bukan kejadian lama yang belum surut. |
| D6 | Empat kotak per kab per tanggal: Kena (diprakirakan, terjadi), Luput (tidak diprakirakan, terjadi), Belum ada laporan (diprakirakan, belum ada laporan), Tenang (tidak diprakirakan, tidak ada laporan). Tidak ada kotak "salah alarm" di layar Dalops. | Tidak ada laporan belum tentu tidak ada kejadian; cakupan logbook tidak merata. |
| D7 | Laporan warga hanya boleh menjadi bukti terjadi (positif), tidak pernah bukti tidak terjadi. | Aturan `konfirmasi.py` yang sudah ada: warga positif lemah. |
| D8 | Rapor ketepatan resmi tetap dinilai dengan DIBI (`nilai.py`). Logbook Pusdalops menjadi label kedua yang lebih cepat, skornya ditulis terpisah dengan nama labelnya; dua label tidak pernah dirata-rata. | Kejujuran rapor; validasi-model memeriksa. |
| D9 | Prakiraan hari lampau dibaca dari `public/prediksi/data/lalu.json` (prakiraan H+1 yang dibekukan); tanpa arsip baru. | Data sudah ada dan append-only di hulu. |
| D10 | Titik laporan di peta Dalops diambil lewat rute Worker staf baru yang hanya mengembalikan nomor tiket, jenis, tingkat (warga atau BPBD), kab, lat, lon, waktu, status. Tanpa nama, nomor WA, isi percakapan. | KEAMANAN-PRIVASI. |

## Pertanyaan terbuka untuk pemilik (Q), dengan bawaan sementara

| No | Pertanyaan | Bawaan sementara (ditandai) |
| --- | --- | --- |
| Q1 | Laporan warga yang belum diperiksa BPBD ikut dihitung "terjadi", atau hanya yang sudah Valid atau Sebagian benar? | Bawaan: semua kecuali `tidak_valid` dihitung, titiknya diberi tanda "belum diperiksa". |
| Q2 | Berapa hari sesudah tanggal prakiraan kotak "Belum ada laporan" dianggap matang? | Bawaan: 3 hari (logbook biasanya masuk H+1 sampai H+2); sebelum itu tertulis "menunggu laporan". |
| Q3 | Staf yang boleh melihat titik laporan di Dalops: semua sesi staf Dalops, atau hanya yang juga punya hak Meja Laporan? | Bawaan: semua sesi staf yang sudah boleh membuka `/api/dalops/*`. |
| Q4 | Tab Karhutla di Dalops ikut dibandingkan dengan titik panas FIRMS (alat ukur), atau hanya dengan logbook karhutla? | Bawaan: logbook dan laporan saja di Dalops; FIRMS tetap di rapor `/prediksi`. |


## Jawaban pemilik 25 Nov 2026

Pemilik: "gas semua bawaan". Semua pertanyaan terbuka di berkas ini yang punya bawaan sementara kini **diputuskan sesuai bawaannya**, kecuali yang tertulis di bawah. Rekap pertanyaan: `data/kajian-bnpb/PERTANYAAN-TERBUKA.md`.

