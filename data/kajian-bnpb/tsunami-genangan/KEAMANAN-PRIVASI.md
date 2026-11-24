# KEAMANAN-PRIVASI: Simulasi tsunami dengan genangan darat

## 1. Data

Semua masukan dan keluaran modul ini adalah data publik atau turunannya: katalog gempa, DEM, batimetri, run-up historis, hasil simulasi. Tidak ada data orang, tidak ada nomor telepon, tidak ada koordinat pembaca. Tidak ada tabel D1 dan tidak ada rute Worker baru di fase 1.

## 2. Ancaman dan penangkal

| Ancaman | Penangkal |
| --- | --- |
| Simulasi dibaca sebagai peringatan atau prakiraan resmi, menimbulkan panik atau rasa tenang palsu | label "simulasi, bukan peringatan" di tiap tampilan; status resmi BMKG dan PTWC di atas dan tidak diubah; label hipotesis sampai uji balik lulus; tanpa kata "aman"; tanpa notifikasi (D16) |
| Wilayah yang tampil kering dibaca "aman" | kalimat tetap "tidak tergenang pada simulasi ini" dan kalimat batas wajib di samping legenda (DEM permukaan, tanpa pasang surut, tanpa dispersi, tanpa longsor, bukan jaminan); uji memeriksa kalimat itu ada; gerbang melarang kata aman di keluaran dan layar |
| Pantai yang tidak dihitung dibaca 0 | "belum dihitung" (D12); uji memeriksa tidak ada nilai 0 untuk pantai di luar indeks |
| Skenario terdekat dibaca sebagai hitungan gempa itu | label tingkat, jarak, dan selisih M wajib tampil |
| Angka run-up historis dimuat tanpa atribusi atau tanpa kesetaraan makna | atribusi NCEI tercatat di berkas dan layar; tinggi air dan run-up tidak dicampur (ALGORITMA 7) |
| Pelanggaran lisensi data (FABDEM non-komersial) | FABDEM hanya untuk uji lokal, tidak masuk keluaran layar publik; gerbang memeriksa `dem` di indeks terhadap daftar izin: DEMNAS (atas izin pemilik, K4), GLO-30; FABDEM ditolak |
| Pelanggaran syarat penggunaan layanan data NOAA (beban permintaan) | data ditarik sekali, disimpan di repo; tidak ada panggilan dari peramban pembaca |
| Rantai pasok mesin hitung (kode atau paket yang dipasang di CI) | versi dikunci, sumber dicatat, tanpa kunci rahasia di langkah hitung, tidak dijalankan dengan hak menulis selain `public/gempa/data/` |
| Keluaran palsu atau rusak di repo | uji bentuk indeks dan checksum masukan; keluaran hanya ditulis skrip repo, bukan diunggah manual |
| Beban peramban dan perangkat murah | muat malas, ukuran berkas dibatasi anggaran (TS-12), animasi tidak membekukan layar |
| Pemantauan lokasi pembaca | tidak ada pengiriman koordinat; pemilih pantai dan pemilih skenario di peramban |
| Dipakai pihak lain sebagai dasar tata ruang atau asuransi | bab Metode menyatakan tujuan dan batas; tidak ada tombol unduh peta genangan di fase 1 |

## 3. Batas klaim

Hasil genangan tampil sebagai hipotesis sampai uji balik lulus, lalu sebagai model teruji pada n kejadian dengan galat tertulis. Tidak pernah "prakiraan genangan" tanpa kualifikasi, tidak pernah "akurat", dan tidak pernah "aman". Status tsunami resmi tetap hanya dari BMKG dan PTWC dan tidak dipengaruhi hitungan kita.

## 4. Penyimpanan

Berkas keluaran dan run-up historis disimpan di repo tanpa jadwal hapus (bukan data pribadi). Arsip prospektif append-only. Berkas keluaran lama yang terganti versi model dipertahankan di bawah versi sebelumnya sampai pemilik memutuskan membersihkan.
