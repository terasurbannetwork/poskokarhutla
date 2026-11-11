# KEPUTUSAN-DASHBOARD: Sistem Desain Dashboard Centurisk97

Keputusan pemilik yang lahir selama perombakan `/operasi` (Operasi Udara), 9 sampai 11 Nov 2026. Dokumen ini menang atas
semua dokumen lain di folder ini. Tiap layar dashboard di repo yang dibangun atau dirombak mulai 11 Nov 2026 mengikuti
keputusan ini. Pertanyaan yang belum dijawab pemilik ada di bagian Q, dengan bawaan sementara yang ditandai.

## D. Keputusan pemilik

| No | Keputusan | Kutipan / asal |
| -- | --------- | -------------- |
| D1 | Tata letak model A: panel seksi kiri, satu tampilan per seksi, kepala halaman gelap, isi di kanan | "Oke jiuka sudah gas ya. Redesign" |
| D2 | Tanpa ruang kosong: kolom berdampingan berakhir sama tinggi, tidak ada blok kosong di bawah kolom pendek | "gw ga pernah mau yang kaya gini ya. Ada white space banyak" |
| D3 | Grid simetris: paling banyak 5 sebaris; 6 = 3x2, 8 = 4x2, 9 = 3x3 | "Agar dia pasti selalu simetris lah 3 3 atau 2 2" |
| D4 | Hanya kepala halaman (L1) yang gelap. Kepala bagian, kartu, pop-up isi, tooltip: terang | "highlight belakangnya gelap tuh cuma untuk yang atas" |
| D5 | Pengecualian D4: kepala tabel navy tua bertulisan putih | "PAKAI FORMAT TABEL BIASA ... warnanya tua dengan tulisan putih" |
| D6 | Kepala bagian (L2) biru sangat muda (biru 5%) dengan garis navy 4 px di kiri | "Coba buat jauh lebih muda lagi" setelah memilih biru muda + aksen |
| D7 | Latar isi wadah hampir putih (biru/merah 2%), tetap beda dari latar halaman putih | "Buat 2 kali lebih muda. Hampir menuju putih" |
| D8 | Tanpa sorot abu-abu dan tanpa abu tua di latar mana pun | "jangan abu ya", "Jangan belakangnya abu tua banget" |
| D9 | Hover dan tooltip tidak pernah gelap | "Gw ga pernah suka hover gelap gini" |
| D10 | Label = pil berikon. Keterangan di bawah nama dijadikan pil sebaris | "Buat dalam label dan buat sebaris untuk keterangan" |
| D11 | Label sejenis lurus ke bawah dalam kolom tetap (kategori sama di posisi sama) | "label sesuai kategorinya lurus ke bawah seragam" |
| D12 | Angka dan satuan lurus: angka rata kanan dalam lebar tetap, satuan sejajar | "Agar kg nya lurus ke bawah" |
| D13 | Spasi baris rapat | "Line spacing kurangin", "kegedean" berulang |
| D14 | Kepala kartu = nama seksi berikon, tanpa kalimat kesimpulan | AGENTS §3.5 pembaruan 11 Nov |
| D15 | Status berwarna berbeda per tingkat: Aman hijau, Patroli biru, Siaga kuning, Prioritas merah | "Patroli sama aman warnanya nyaru" |
| D16 | Legenda selalu di bawah grafik | "Lagenda ini selalu dibuat di bawah figure atau chart" |
| D17 | Pemilih periode: versi 3 baris lama, ikut tergulir (tidak beku), tinggi tetap antar-mode | beberapa koreksi 11 Nov |
| D18 | Tabel bisa diurutkan; tabel panjang dikelompokkan dan bisa dilipat; ada saringan | "Ini agar bisa sort", "collapsible per bandara", "Agar ada filternya" |
| D19 | Pemilih yang berkaitan diletakkan berdekatan | "Agar saling deket dong" |
| D20 | Lambang provinsi hanya di kartu kontrak, tidak di pil label | "berlebihan kalo di label gini kasih logo" |
| D21 | Tanpa data dummy dan tanpa tombol uji | standar global pemilik 11 Nov |
| D22 | Tiap perubahan layar ditinjau di `http://localhost:8800/<jalur>` | AGENTS §3.8 |
| D23 | Pustaka grafik boleh dipasang bila lisensi bebas: uPlot (MIT). ApexCharts tidak | "Yang lain gas" atas rekomendasi riset 11 Nov |
| D24 | Palet ramah buta warna (Okabe-Ito) tidak dipakai; palet status D15 tetap | "ini gausah" |
| D25 | Sistem ini diterapkan ke 12 layar, urut: Dalops, Admin, Operasi Darat + operasi lapangan, kinerja/sitrep/siaga/logbook, rapor-sumber + silang, Ruang Unit, LogPal, Siklus, petugas pimpinan, Kemitraan, Prediksi, SIPPA | daftar pemilik 11 Nov 2026 |
| D26 | Layar yang sama fungsinya boleh diintegrasikan supaya tautan tidak banyak; usulan integrasi ditulis dulu (INTEGRASI.md) lalu dikerjakan | "jika lu rasa ada yang sama ... silakan integrasikan" |

## Q. Pertanyaan terbuka (bawaan sementara, belum dijawab pemilik)

| No | Pertanyaan | Bawaan sementara |
| -- | ---------- | ---------------- |
| Q1 | Target angka untuk bullet graph Efektivitas (ketepatan, kepatuhan renlap, utilisasi, respons) | tanpa garis target; bilah biasa |
| Q3 | SIPPA ikut (D25), tetapi KEPUTUSAN-SIPPA menang atas modulnya. Bila bertentangan dengan sistem ini, yang mana menang? | KEPUTUSAN-SIPPA menang; hanya token warna, kepala, pil, tabel yang diseragamkan |
| Q4 | Mode TV `?tv=1` di semua dashboard atau hanya `/operasi` | hanya `/operasi` |
