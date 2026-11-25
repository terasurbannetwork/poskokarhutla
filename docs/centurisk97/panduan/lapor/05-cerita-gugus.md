# Cerita pelapor dan kelompok laporan

Halaman ini menjelaskan cara sistem memahami cerita pelapor dan cara beberapa laporan serupa dikelompokkan.

## Cara sistem memahami cerita pelapor

Data yang dipakai: pesan, lokasi, dan foto dari pelapor sendiri. Tidak ada data dari luar.

1. Perintah sederhana (batal, ulang, kirim, belum tahu, tidak ada, pilihan menu, lokasi, foto) langsung diproses tanpa bantuan model komputer.
2. Pesan lain lebih dulu disamarkan: alamat surel, nomor HP, dan nomor induk kependudukan diganti tanda kurung siku sebelum dikirim ke model komputer.
3. Model komputer diminta memilah isi pesan menjadi daftar isian (misalnya jumlah rumah, jumlah korban), dan tiap isian harus disertai kutipan persis dari ucapan pelapor.
4. Sistem memeriksa keluaran itu. Isian dibuang bila namanya tidak dikenal, kutipannya tidak ada di pesan, atau, untuk angka, angkanya tidak muncul di kutipan (angka tertulis seperti "dua belas" dikenali) atau nilainya di luar batas wajar. Batas wajar ditetapkan tim BNPB; misalnya "3.000 rumah" untuk satu dusun akan dibuang. Angka 0 hanya diterima bila ada kata seperti "tidak ada" atau "belum ada", karena pelapor menyatakan keadaan yang ia lihat. "Belum tahu" tidak pernah dihitung 0.
5. Sistem sendiri, bukan model, memilih pertanyaan berikutnya dengan urutan tetap: jenis, subjenis, waktu, lokasi, cerita; lalu korban, warga terdampak, pengungsian, kerusakan rumah, kelompok rentan, fasilitas dan jalan, layanan dasar, keterangan khusus, dan kebutuhan. Isian yang sudah ditanyakan dua kali tanpa jawaban ditulis "belum didata".
6. Model tidak menulis kalimat balasan. Ia hanya memilih satu dari beberapa tanggapan tetap (misalnya simpati atau terima kasih), dan kalimatnya sudah ditulis manusia.

Contoh: pelapor menulis "air masuk rumah, 12 rumah kena, belum ada yang meninggal." Isian rumah terdampak bernilai 12 karena angka 12 ada di kutipan. Isian korban meninggal bernilai 0 karena ada kata "belum ada". Isian jumlah mengungsi tidak diisi karena tidak disebut, dan akan ditanyakan.

Pesan yang bukan tentang kejadian bencana, atau yang meminta data atau menyuruh tugas umum, ditolak dengan kalimat tetap. Setelah 3 pesan di luar topik, sesi berjalan dengan pertanyaan templat saja. Tanpa model komputer pun layanan tetap jalan memakai pertanyaan templat.

Seberapa bisa dipercaya: aturan pemeriksaan ini sudah diuji tanpa jaringan. Ketepatan model dalam mengurai cerita pelapor terhadap contoh nyata belum diukur. Target "selesai dalam 5 menit dengan paling banyak 8 balasan" adalah sasaran rancangan, bukan hasil ukur.

## Kelompok laporan serupa (gugus)

Tujuannya: beberapa laporan untuk kejadian yang sama ditampilkan sebagai satu kelompok, bukan dijumlahkan.

Data: laporan terkirim yang tidak dinyatakan tidak valid, dengan jenis, titik, dan waktu kejadiannya.

1. Dua laporan berjenis sama disambung bila selisih waktu kejadiannya tidak lebih dari jendela waktu dan jaraknya tidak lebih dari radius menurut jenis (tabel di bawah). Untuk gempa, erupsi, dan tsunami, cukup berada di kabupaten/kota yang sama. Laporan tanpa titik tetap cocok bila desanya sama.
2. Penyambungan berlanjut berantai: bila A cocok dengan B dan B dengan C, ketiganya satu kelompok.
3. Satu kelompok hanya terbentuk bila berisi paling sedikit dua pelapor berbeda. Satu orang yang melapor berulang tidak membentuk kelompok.
4. Pusat kelompok adalah titik tengah lokasi anggotanya (nilai tengah, bukan rata-rata), dan radiusnya jarak anggota terjauh, paling kecil 300 meter.
5. Label: gugus bila 2 pelapor atau lebih, gugus kuat bila 3 pelapor atau lebih atau dua pelapor berbeda sama-sama punya foto dengan lencana lokasi. Petugas memakai label ini untuk menentukan laporan mana yang diperiksa lebih dulu; label tidak menyatakan laporan itu benar.

| Jenis | Cara menyambung | Radius | Selisih waktu paling lama |
| --- | --- | --- | --- |
| banjir, longsor, kebakaran gedung | berdasarkan jarak | 3 km | 6 jam |
| cuaca ekstrem | berdasarkan jarak | 5 km | 6 jam |
| kebakaran hutan dan lahan | berdasarkan jarak | 5 km | 12 jam |
| gempa, erupsi, tsunami | berada di kabupaten/kota yang sama | tidak berlaku | 12 jam |
| kekeringan, gelombang pasang dan abrasi | tidak dikelompokkan | | |

Contoh berantai: laporan A dekat B, B dekat C, tetapi A jauh dari C. Ketiganya tetap satu kelompok karena tersambung lewat B.

Contoh: dua warga dari nomor berbeda melaporkan banjir, berjarak 2 km dan berselisih 4 jam. Keduanya satu kelompok berlabel gugus. Bila salah satu melaporkan 10 rumah terendam dan yang lain 8, angkanya tidak ditambah menjadi 18. Keduanya ditampilkan terpisah atau sebagai rentang 8 sampai 10.

Seberapa bisa dipercaya: seluruh radius dan selisih waktu ini adalah hipotesis, yaitu perkiraan awal yang belum diuji dengan kejadian nyata. Uji balik berarti mencocokkan aturan dengan kejadian masa lalu yang jawabannya sudah diketahui. Uji itu belum dilakukan untuk kelompok laporan, jadi pakai sebagai bahan pertimbangan, bukan kepastian.
